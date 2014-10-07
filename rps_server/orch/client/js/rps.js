var H="http://10.121.245.6:8080"
$.support.cors = true; // very important for IE, else all connections will fail with No Transport
var Registered = false;
var Round = 0;
var Me = null;
var Opponent = null;

$(initiate); // call when document is ready


function initiate() {
	Registered = false;
	console.log("Initiating ... " + H + "\n");
	$(myPick).hide();
	callJson(H, register);
}

function callJson(u, f) {
  $.getJSON(u, function() {console.log("success ", u);})
   .done(f)
   .fail(jsonFailed);
}

function jsonFailed(jqxhr, textStatus, error) {console.log("Failed.. ", jqxhr, textStatus, error);}

function register(data) {
  if (data != null && data.Name != null) {
	  Me = data;
          ContainerURI = Me.HostIP + ":" + Me.HostPort;
	  myName.innerText = data.Name;
	  Registered = true;
	  Round = 0;
	  startLoop();
  } else {
	  myName.innerText = "Couldn't register";
  }
}

var WhatsNext = null;
var ContainerURI = null;
function getWhatsNext() {
  callJson(ContainerURI + "/whatsNext", function(data) {
      if (data != null) {
        WhatsNext = data;
	if (WhatsNext.overallWinner) {
	   myName.innerText = "I'm the champion " + myName.innerText;
	} else {
	   if (Round != WhatsNext.round && WhatsNext.opponent != null) {
              round.innerText = WhatsNext.round;
	      Opponent = WhatsNext.opponent;
	      oName.innerText = Opponent.name;
	      myWinOrLoss.innerText = "";
	      oWinOrLoss.innerText = "";
	      oPick.innerText = "";
	      $(myPick).hide();
	      readyForMyMove();
	   } else {
	      startLoop();
	   }
	}
      } else {
        startLoop();         
      }
  }); 
}

function startLoop() {
  setTimeout(getWhatsNext, 1000); 
}

function readyForMyMove() {
   ReadyForMove = true;
   $(myPick).show();
}

function selected(mv) {
  callJson(ContainerURI + "/myMove?mv=" + mv, function(data) { 
    console.log("sent move\n");
    getOpponentsMove();
  });
}

function getOpponentsMove() {
   callJson(ContainerURI + "/getOpponentsMove", function(data) {
      if (data != null && data.opponentsMove != null && data.opponentsMove != -1) {
         oPick.innerHTML = data.opponentsMove; 
	 didIWin();
      } else {
         setTimeout(getOpponentsMove, 500);
      }
   });
}

function didIWin() {
   callJson(ContainerURI + "/didIWin", function(data) {
      console.log("didIWin", data);
      if (data != null && data.results) {
          if (data.iwon == 1) {
	     Round++;
	     myWinOrLoss.innerText = "Won this round";
	     oWinOrLoss.innerText = "Lost this round";
             startLoop();
	  } else if (data.iwon == -1) {
	     oWinOrLoss.innerText = "Won this round";
	     myWinOrLoss.innerText = "Lost this round";
	  } else {
	     // Drew
	     oWinOrLoss.innerText = "Drew this round";
	     myWinOrLoss.innerText = "Drew this round";
             startLoop();
	  }
      } else {
	     setTimeout(didIWin, 500);
      }
   });
}
