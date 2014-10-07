var express = require('express');
var request=require('request');
var http=require('http');

// Constants
var PORT=8080;
var HOSTS=["10.121.247.138"];
var PORTS=[4342];
var IMAGE="mathewj/explore:unn_hello";

//App
var app = express();
app.get('/', function(req, res) {
  var who = req.param('id', null);
  console.log("Got in: " + who);

  if (!who) {
    // start a container on host X
   var createContainer = {
     method: 'POST',
     uri: "http://" + HOSTS[0] + ":" + PORTS[0] + "/containers/create",
     json: true,
     body: JSON.stringify({
	 'Image': IMAGE,
	 'ExposedPorts': {"8180/tcp": {} }
     })
   };

   console.log(createContainer.uri);
   request(createContainer, function(err, response, body) {
      console.log("Create Container " + response.statusCode + " body " + body);
      if (!err && response.statusCode == 201) {
        var info = body; // used JSON: true in the request, so the response has been parsed as JSON
        var path = "/containers/" + info.Id + "/start";       
//	var body = {"PortBindings":{"8180/tcp": [{"HostPort": "44446"}]} };
	var body = {"PortBindings":{"8180/tcp": [{}]} };

	requestH(HOSTS[0], PORTS[0], path, body, function(err, response, body) {
	console.log("Start container " + response + " : " + err);
//	if (!err && response.statusCode == 204) {
	if (!err) {
	   obj={
	      msg: 'Container created',
	      id: info.Id
	   };
	    respond(res,obj);
 	  }  else {
	     respond(res, {msg: "Error"});
	  }
        });
      } else {
        respond(res, {msg: "Error"});
      }
   }); 
  } else {
    //redirect
   console.log("Redirecting...");
    res.redirect("http://10.121.247.138:44444?cmd=ps");
  }
});
app.listen(PORT);
console.log("Running on http://localhost:" + PORT);


function respond(res, obj) {
  //res.writeHead(200, {'Content-Type': 'application/json'});
  res.json(obj);
}

function requestH(host, port, path, data, cb) {
  var str = JSON.stringify(data);

  var headers = {
     'Content-Type': 'application/json',
     'Content-Length': str.length
  };

  var options = {
    host: host,
    port: port,
    path: path,
    method: 'POST',
    headers: headers
  };

  var req = http.request(options, function(res) {
    res.setEncoding('utf-8');
    var responseString = '';

    res.on('data', function(data) {
      responseString += data;
    });
    res.on('end', function() {
      var resultObject = responseString;
//      var resultObject = JSON.parse(responseString);
      console.log(resultObject);
      cb(false, res, resultObject);
    });
  });   

  req.on('error', function(e) {
    cb(true, e);
  });

  req.write(str);
  req.end();
}
