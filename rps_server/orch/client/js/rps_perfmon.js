var H="http://10.121.245.6:8080"
$.support.cors = true; // very important for IE, else all connections will fail with No Transport
var Me = null;
var Opponent = null;

$(getPC); // call when document is ready

function getPC() {
	callJson(H + "/PC", showPC);
}

function cleanUp() {
	callJson(H + "/cleanUp", showPC);
}

function callJson(u, f) {
  $.getJSON(u, function() {console.log("success ", u);})
   .done(f)
   .fail(jsonFailed);
}

function jsonFailed(jqxhr, textStatus, error) {console.log("Failed.. ", jqxhr, textStatus, error);}


var FirstTime = true;

function showPC(data) {
  if (data != null && data.PCTable != null) {
    if (FirstTime) {
      createTable(data.PCTable);
      FirstTime = false;
    }
    for (var i in data.PCTable) {
	  $("#ActiveContainers" + mapToId[i]).text(data.PCTable[i].numActiveContainers);
	  $("#MaxContainers" + mapToId[i]).text(data.PCTable[i].numMaxContainers);
	  $("#MinTime" + mapToId[i]).text(data.PCTable[i].minTimeToStartContainer);
	  $("#MaxTime" + mapToId[i]).text(data.PCTable[i].maxTimeToStartContainer);
    }
    setTimeout(getPC, 500);
  } else {
	  $("#PerfCounters").text("Couldn't connect");
  }
}

var mapToId = {};
var inc = 1;

function createTable(PCTable) {
   
  var r = $("#PerfCounters").append("<div id='divHeader' class='divRow'></div>");
// headers
     r.append("<div class='divCell'>Host Name</div>");
     r.append("<div class='divCell'>ActiveContainers</div>");
     r.append("<div class='divCell'>MaxContainers</div>");
     r.append("<div class='divCell'>MinTime</div>");
     r.append("<div class='divCell'>MaxTime</div>");
   for (var i in PCTable) {
     var id = "id" + inc++;
     mapToId[i] = id;
     var d = $("#PerfCounters").append("<div id='div" + id + "' class='divRow'></div>");
     d.append("<div id='hostName" + id + "' class='divCell'>" + (i == "0" ? "All" : i) + "</div>");
     d.append("<div id='ActiveContainers" + id + "' class='divCell'></div>");
     d.append("<div id='MaxContainers" + id + "' class='divCell'></div>");
     d.append("<div id='MinTime" + id + "' class='divCell'></div>");
     d.append("<div id='MaxTime" + id + "' class='divCell'></div>");
  }
}
