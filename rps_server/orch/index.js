var express = require('express');
var request=require('request');
var connect = require('connect');
var serveStatic = require('serve-static');

// Constants
var ORCHPORT=8080;
var ORCHHOST="http://10.121.245.6";
//var HOSTS=["http://10.121.245.6:4342", "http://10.121.246.222:4342"];
var HOSTS=["http://10.121.245.6:4342", "http://10.121.245.6:4342"];
var IMAGE="mathewj/explore:rps_player";
var REGISTRATION_TIMEOUT=10000;

// Global variables
var Users=[];
var CurrHost=0;
var RegistrationOpen = true;
var ActiveGames = 0;
var ActiveGamers = 0;
var Round = 1;
var ICMap=[];

// Perf counters
var PC = {
  numActiveContainers: 0,
  numMaxContainers: 0,
  minTimeToStartContainer: 0,
  maxTimeToStartContainer: 0 
};


//App


var app = express();

app.use(serveStatic('/src/client'));

//app.get('/client', function(req, res) {
//  res.sendfile(__dirname + '/client/rps_client.html');
//});

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function(req, res) {
  var who = req.param('id', null);
  console.log("Got in: " + who);

  if (!who) {
   if (RegistrationOpen) {
      // start a container on host X - round robin
     var currH = CurrHost;
     CurrHost = ((CurrHost + 1) % HOSTS.length);
     console.log("CurrHosts " + CurrHost);
     var randId = "Id" + Math.random() + "-" + new Date().getTime();
     var retURI = ORCHHOST + ":" + ORCHPORT + "/iAmReady?id="+randId;
     console.log("Container retURI " + retURI + "\n");
     var createContainer = {
       method: 'POST',
       uri: HOSTS[currH] + "/containers/create",
       json: {
	   'Image': IMAGE,
	   'ExposedPorts': {"8180/tcp": {} },
           'Cmd': [ 'node', '/src/index.js', retURI ]
       }
     };

     console.log(createContainer.uri);
     var startTime = new Date().getTime();
     request(createContainer, function(err, response, body) {
	console.log("Create Container body " + body);
	PC.numActiveContainers++;
	PC.numMaxContainers++;
	if (!err && response.statusCode == 201) {
	  var info = body; // used JSON: true in the request, so the response has been parsed as JSON
	  var startContainer = {
	    uri: HOSTS[currH] + "/containers/" + info.Id + "/start",
	    json: {'PortBindings': { "8180/tcp": [ { } ] } }
	  };

	  console.log(startContainer.uri);
	  request.post(startContainer, function(err, response, body) {
	  console.log("Start container " + response.statusCode);
	  if (!err && response.statusCode == 204) {
	     var queryContainer = {
	       uri: HOSTS[currH] + "/containers/" + info.Id + "/json"
	     }
	     request.get(queryContainer, function(err, response, body) {
	       console.log("Query container " + response.statusCode);
	       if (!err && response.statusCode == 200) {
		  obj= JSON.parse(body);
		  obj.HostContainer = HOSTS[currH];
		  obj.HostIP = HOSTS[currH].replace(/\:....$/,'');
		  obj.HostPort = obj.NetworkSettings.Ports['8180/tcp'][0].HostPort
		  Users[info.Id] = obj;
                  ICMap[randId] = {user: obj, resp: res, startTime: startTime};
                  console.log("Logging retURI " + ICMap[randId]);
	       } else {
		  respond(res, {msg: "Error while querying container " + err + ":" + response});
	       }
	     });
	   } else {
	      respond(res, {msg: "Error while starting container " + err + ":" + response});
	   }

	  });
	} else {
	  respond(res, {msg: "Error while creating container"});
	}
     }); 
   } else {
     respond(res, {msg: "Registration is closed"});
   }
  } else {
    //redirect
   var u = Users[who];
   if (u) {
//   console.log("Redirecting... " + u);
//   var uri = u.HostIP + ":" + u.HostPort + "/register?name=" + u.Name + "&id=" + u.Id ;
//   res.redirect(uri);
//   res.redirect("http://10.121.247.138:44444?cmd=ps");
     respond(res, u);
   } else {
        respond(res, {msg: "No such container" + who});
   }
  }
});


app.get('/cleanUp', function(req, res) {
   for (var i in Users) {
     removeUser(i, true); // delete user immediately
   }
   res.json({msg: "All clean"});
   init();
});

app.get('/PC', function(req, res) {
   res.json({PC: PC});
});

function removeUser(i, immediate) {
   var u = Users[i]; 
   var uri = u.HostContainer + "/containers/" + u.Id
	     + "?v=1&force=1"; 
   console.log("Sending request " + uri);
   delete Users[i];
   setTimeout(function() {
      request({method: "DELETE", uri: uri}, function(err, response, body) {
        if (PC.numActiveContainers != 0)
	  PC.numActiveContainers--;
        console.log("Delete User " + err + "response: " + response + "body: " + body);
      }); 
    }, immediate ? 0 : 3000);
}

// self initiated - for now driven by client
app.get('/connectUsers', function(req, res) {
   var uid1 = req.param('id1', null);
   var uid2 = req.param('id2', null);
   if(connectUsers(uid1, uid2)) {
     respond(res, {msg: "Connected Users"});
   } else {
     respond(res, {msg: "Couldn't connect " + uid1 + " " + uid2});
   }
});

function connectUsers(uid1, uid2) {
  if (uid1 && uid2 && Users[uid1] && Users[uid2]) {
    var u1 = Users[uid1];
    var u2 = Users[uid2];
    sendOpponentInfo(u1, u2, true, 1);
    sendOpponentInfo(u2, u1, false, 1);
    return true;
   } else {
    return false;
   }

   function sendOpponentInfo(toU, oppU, visitor, round) {
     var uri = toU.HostIP + ":" + toU.HostPort + "/setOpponent?name="
               + oppU.Name + "&visitor=" + (visitor ? '1' : '0')
               + "&hostIP=" + oppU.HostIP + "&hostPort=" + oppU.HostPort
               + "&round=" + round + "&orchHostIP=" + ORCHHOST 
               + "&orchPort=" + ORCHPORT;
     setOpponents = {
       uri: uri,
     };
     setTimeout(connectPrivate, 1, toU, setOpponents);
     function connectPrivate(u, so) { // this is to avoid the race condition where Opponents are paired before the player container got the startRound message
       if (u.readyToStartRound) {
	 console.log("Sending request " + so.uri);
	 request.get(so, function(err, response, body) {
	   console.log("Set Opponent " + err + "response: " + response + "body: " + body);
           u.readyToStartRound = false; // reset it again so no one sets up another opponent
	 }); 
       } else {
         setTimeout(connectPrivate, 1, u, so);
       }
     }
     
   }
}

// from the containers
app.get('/iAmReady', function(req, resC) {
  var randId = req.param('id', null);
  console.log("Container ready " + randId + ICMap[randId]);
  if (ICMap[randId]) {
    var obj = ICMap[randId].user;
    var res = ICMap[randId].resp;
    var startTime = ICMap[randId].startTime;
    var endTime = new Date().getTime();
    var timeToStart = endTime - startTime;
    if (timeToStart > PC.maxTimeToStartContainer)
       PC.maxTimeToStartContainer = timeToStart;
    if (PC.minTimeToStartContainer == 0 || timeToStart < PC.minTimeToStartContainer)
       PC.minTimeToStartContainer = timeToStart;

    delete ICMap[randId];

    respond(resC, {msg: "Got it"});
    // Now that the container is up, go ahead and register and respond back to the client
    var uri = obj.HostIP + ":" + obj.HostPort + "/register?name=" + obj.Name + "&id=" + obj.Id ;
    console.log(uri);
    request.get({uri: uri}, function(err, response, body) {
      console.log("Register " + err + "response: " + response + "body: " + body);
      respond(res,obj);
    });
  } else {
    respond(resC, {msg: "Got it. But I don't know you"});
    console.log("Error: Got 'I'm ready' for unknown container\n");
  }

});


app.get('/myResult', function(req, res) {
  console.log("Got results - parsing data");
  var id = req.param('id', null);
  var result = req.param('result', null);
  console.log("Got results " + id + " " + result);
  if (Users[id]) {
    ActiveGamers--;
    if (result && result == 1) {
      ActiveGames > 0 ? ActiveGames-- : 0;
      console.log("Id " + id + " won");
    } else {
      removeUser(id, false); // allow for UX to check state before deleting user
      console.log("Id " + id + " lost");
    }
  } else {
    console.log("Didn't get the user " + id);
  }
  if (ActiveGames == 0 && ActiveGamers == 0) {
    Round++;
    console.log("Starting next round " + Round + " in 2 secs");
    setTimeout(startGame, 2000); // Next round; after everyone has cleaned up previous round        
  }
  res.json({});
});



function startRound(u, r) {
   var uri = u.HostIP + ":" + u.HostPort + "/startRound?round=" + r;
   u.readyToStartRound = false;
   ActiveGamers++;
   console.log(uri);
   request.get({uri: uri}, function(err, response, body) {
     u.readyToStartRound = true;
     console.log("StartRound " + err + "response: " + response + "body: " + body);
   });
}

function declareWinner(i) {
   var u = Users[i];
   var uri = u.HostIP + ":" + u.HostPort + "/declaredWinner";
   console.log(uri);
   request.get({uri: uri}, function(err, response, body) {
     console.log("Declared Winner " + err + "response: " + response + "body: " + body);
   });
}

function init() {
  console.log("initializing\n");
  RegistrationOpen = true;
  Users = [];
  CurrHost = 0;
  Round=1;
  ActiveGamers = 0;
  ActiveGames = 0;
  PC = {
    numActiveContainers: 0,
    numMaxContainers: 0,
    minTimeToStartContainer: 0,
    maxTimeToStartContainer: 0 
  };
  setTimeout(startGame, REGISTRATION_TIMEOUT);
}

function startGame() { 
  RegistrationOpen = false;
  // check ICMap -- if not 0, which means Containers have not finished starting up 
  if (ICMap.length != 0) {
     console.log("waiting on some more user containers to startup\n");
     setTimeout(startGame, 100);
  } else {
    console.log("Starting the game " + Round + "\n");
    var p1 = null;
    for (var i in Users) {
      if (p1 == null) {
	p1 = i;
      } else {
	startRound(Users[p1], Round);
	startRound(Users[i], Round);
	connectUsers(p1, i);
	ActiveGames++;
	p1 = null;
      }
    }
    if (ActiveGames == 0 && p1 != null) {
       declareWinner(p1);
    }
  }
}


function respond(res, obj) {
  //res.writeHead(200, {'Content-Type': 'application/json'});
  res.json(obj);
}


app.listen(ORCHPORT);
init();
console.log("Running on http://localhost:" + ORCHPORT);
