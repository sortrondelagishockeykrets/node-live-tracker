var	app = require('express')(),
	http = require('http').Server(app),
	request = require('request'),
	io = require('socket.io')(http),
	crypto = require('crypto');

var uniqueUsers = {};
var secret = process.env.SECRET || 'Dette er havveis hemmelig, men det er ikke så farlig. Er bare så folk ikke kan se ip adressene til de som er på siden.';
var PORT = process.env.PORT || 80;
var HOSTNAME = process.env.HOSTNAME || 'localhost';
var passcode = process.env.passcode || '123456789';

app.get('/stats/info.json', function(req, res){
	var resultJson = {
		"current_timestamp": timestamp(),
		"connected": uniqueUsers
	}
	res.json(resultJson);
});

app.get('*', function(req, res){
	res.status(404);
  res.json({"error": "not found", "status": 404});
});

http.listen(PORT, function(){
	console.log('Started listening on ' + HOSTNAME + ':' + PORT);
});

function get(url) {
	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			return body; // Print the google web page.
		} else {
			return error;
		}
	});
}

function updateOnlineUsers() {
	var count = 0;
	for (property in uniqueUsers) {
	   if(uniqueUsers.hasOwnProperty(property)) {
	      count++;
	   }
	}
	io.sockets.emit('online', count);
}

function timestamp() {
	return Math.floor((+ new Date()) / 1000);
}

function tryBeta(socket) {
	socket.emit('notification', {
		"title": "Ny nettside p&aring; vei!",
		"line1": "Vi jobber med en ny og enklere nettside.",
		"line2": "<a href=\"https://beta.stihk.no/\">I mellomtiden kan n&aring; den krypterte siden her.</a>",
		"onlyhttp": "yes"
	});
}

io.sockets.on('connection', function (socket) {
	var ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
	ip = crypto.createHmac('sha256', secret).update(ip).digest('hex');
	
	//Creates a temperary record of visitors ipaddress
	if(uniqueUsers[ip] == undefined) {
		uniqueUsers[ip] = {"sockets": []};
		tryBeta(socket);
	}
	//Adds the current socket to the visitors record
	uniqueUsers[ip]['sockets'].push(socket.id);
	uniqueUsers[ip]['updated'] = timestamp();
	updateOnlineUsers();

	socket.on('notification', function(data) {
		if(data.passcode == passcode) {
			data.passcode = "*********";
			io.emit('notification', data);
		}
	});
	
	socket.on('sendAll', function(data) {
		if(data.passcode == passcode) {
			var resultJson = {
				"current_timestamp": timestamp(),
				"connected": uniqueUsers
			}
			socket.emit('getAll', resultJson);
		}
	});

	socket.on('update', function(data) {
		if(data.passcode == passcode) {
			data.passcode = "*********";
			request(data.url, function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var newdata = {
			      			func: data.func,
			      			source: body
					};
		    			io.emit('update', newdata);
				 } else {
					io.emit('update', {func: 'error', source: error});
				 }
			});
		}
	});

	socket.on('disconnect', function(data) {
		if(uniqueUsers[ip]['sockets'].length > 1) {
			uniqueUsers[ip]['sockets'].splice(uniqueUsers[ip]['sockets'].indexOf(socket.id), 1);
		} else {
			delete uniqueUsers[ip];
		}
		updateOnlineUsers();
	});
});
