var express = require('express');
var request=require('request');

// Constants
var PORT=8180
var ROCK=0;
var PAPER=1;
var SCISSORS=2;

//Global variables
var Me=null;
var MeId=null;
var Round=0;
var Opponent=null;
var OpponentConnect = null;
var MyMove = -1; // Not a move
var OpponentsMove = -1; // Not a move
var ResultsOut = false;
var IWon = 0;
var OverallWinner = false;
var Orchestrator = null;

// App
var app = express();

app.get('/', function(req, res) {
  res.json({msg: 'Hello world...'}); 
});

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/register', function(req, res) {
  Me = req.param('name', null);
  MeId = req.param('id', null);
  Round = 1;
  if (Me) {
    res.json({msg: "You are registered"});
  } else {
    res.json({msg: 'Missing user'});
  }
});

app.get('/startRound', function(req, res) {
  Round = req.param('round', null);
  MyMove = -1;
  OpponentsMove = -1;
  Opponent = null;
  OpponentConnect = null;

  res.json({msg: 'Ready for round ' + Round});
});

app.get('/whatsNext', function(req, res) {
  res.json({round: Round, overallWinner: OverallWinner, opponent: Opponent});
});

app.get('/getOpponent', function(req, res) {
  res.json(Opponent);
});

app.get('/getOpponentsMove', function(req, res) {
  res.json({opponentsMove: OpponentsMove});
});

app.get('/didIWin', function(req, res) {
   res.json({results: ResultsOut, iwon: IWon});
   if (ResultsOut) {
      if (IWon == 0) {
        MyMove = -1;
        OpponentsMove = -1;
      }
      if (IWon == -1)
         process.exit(0); //I lost
   }
});

app.get('/myMove', function(req, res) {
  MyMove = req.param('mv', ROCK);
  if (!Opponent) {
    res.json({status: 0, msg: "Hold it tiger. We are waiting for an opponent"});
  } else {
    ResultsOut = false;
    IWon = 0;
    if (!Opponent.visitor) {
       checkAndDeclareVictor();
       res.json({status: 1, msg: "Waiting on opponent's move"});
    } else {
       res.json({status: 1, msg: "Waiting on opponent checking"});
    }
  }
});


// called by opponent
app.get('/opponentMove', function(req, res) {
  var oppMove = req.param('move', ROCK);
  OpponentsMove = oppMove;
  if (MyMove != -1) {
    res.json({move: MyMove});

    ResultsOut = true;
    IWon = didIWin(MyMove, oppMove);
    if (IWon == 0) {
      // No results. start again
      // Do the reset of moves after the client check
//      MyMove = -1;
//      OpponentsMove = -1;
      // client will send myMove again and the the opponent will do the same
      
    } else {
      Opponent = null;
      OpponentConnect = null;
      informOrchestrator();
    }
  } else {
    res.json(null);
  }
  
});

// called by the orchestrator
app.get('/declaredWinner', function(req, res) {
  OverallWinner = true;
  res.json({});
});

app.get('/setOpponent', function(req, res) {
  var name = req.param('name', null);
  console.log("Setting opponent " + name);
  if (name) {
    Opponent = {
      name: name,
      visitor: req.param('visitor', '0') == '0' ? false : true
    };
    OpponentConnect = {
      hostIP: req.param('hostIP', ''),
      hostPort: req.param('hostPort', '')
    };
    Orchestrator = {};
    Orchestrator.hostIP = req.param('orchHostIP', null);
    Orchestrator.hostPort = req.param('orchPort', 0);
    MyMove = -1;
    ResultsOut = false;
    IWon = 0;
  }
  res.json({msg: "opponent " + name + " accepted"});
});

function checkAndDeclareVictor() {
   if (OpponentConnect == null) return; // race condition might cause this
     var sendMyMoveAndCheck = {
       method: 'GET',
       uri: OpponentConnect.hostIP + ":" + OpponentConnect.hostPort 
            + "/opponentMove?move=" + MyMove,
       json: true
     }

   console.log(sendMyMoveAndCheck.uri);
   request(sendMyMoveAndCheck, function(err, response, body) {
      console.log("Sent Move" + response + " body " + body);
      if (!err) {
        var obj = body;
        if (obj) {
          ResultsOut = true;
          OpponentsMove = obj.move;
          IWon = didIWin(MyMove, obj.move);
          if (IWon == 0) {
            // No results. start again
            MyMove = -1;
            
          } else {
            Opponent = null;
            OpponentConnect = null;
            informOrchestrator();
          }
        } else {
          console.log("Not yet");
          setTimeout(checkAndDeclareVictor, 300); 
        }
      } else {
        console.log("Not yet");
        setTimeout(checkAndDeclareVictor, 300); 
      }
   });
}

function didIWin(m1, m2) {
  var res = 0; // draw
  if (m1 == m2) return res;

  if (m1 == ROCK) {
     return m2 == PAPER ? -1 : 1;
  } else if (m2 == ROCK) {
     return m1 == PAPER ? 1 : -1;
  } else if (m1 == PAPER) {
     return  -1; // m2 has to be scissors
  } else { 
     return 1; // m1 has to be scissors and m2 paper
  }
}

function informOrchestrator() {
     var myResult = {
       method: 'GET',
       uri: Orchestrator.hostIP + ":" + Orchestrator.hostPort 
            + "/myResult?id=" + MeId + "&result=" + IWon,
       json: true
     }

   console.log(myResult.uri);
   request(myResult, function(err, response, body) {
      console.log("My Result: err: " + err + " response: " + response + " body " + body);
   });
}


app.listen(PORT);
console.log('Running on http://localhost:' + PORT);
// Now inform orchestrator if it was provided as a cmdline parm
console.log("Args " + process.argv[0] + " " + process.argv[1] + " " + process.argv[2]);
var arg = process.argv[2];
if (arg) {
     var iAmReady = {
       method: 'GET',
       uri: arg,
       json: true
     }

   console.log(arg);
   request(iAmReady, function(err, response, body) {
      console.log("I am Ready: err: " + err + " response: " + response + " body " + body);
   });
}

