const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use('/', express.static('home'));
app.use('/resources', express.static('resources'));
app.use('/home', express.static('home'));
app.use('/master', express.static('master'));
app.use('/client', express.static('client'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/');
});
app.get('/master', (req, res) => {
	res.sendFile(__dirname + '/master/');
});

const roomKeys = [];

//Map used to keep track of which room each socket belongs to.
const socketRooms = {
	//socketId:roomKey
};

//Map used to keep track of which socketIds are masters of each room.
const masterRoom = {
	//socketId:roomKey
};

io.on('connection', socket => {
	const shortId = socket.id.substr(0, 6);

	console.log(`New client connected: ${shortId}`);

	//Notify the client that it has connected to the server.
	socket.emit('connected');

	socket.on('createNewRoom', () => {
		const key = createUniqueRoomKey(); //New room key
		roomKeys.push(key);
		socketRooms[socket.id] = key;
		masterRoom[socket.id] = key;
		socket.join(key); //Have the master that issued this command join the room.
		socket.emit('newRoomJoined', key);

		console.log(`New room created: ${key}`);
		console.log(`${shortId} joined room ${key} as master`);
	});

	socket.on('joinRoom', key => {
		if (keyExists(key)) {
			socket.join(key);
			socketRooms[socket.id] = key;

			console.log(`${shortId} joined room ${key} as player`);
		} else {
			socket.emit('invalidRoom');
		}
	});

	socket.on('controls', data => {
		io.to(socketRooms[socket.id]).emit('master-controls', data);
	});

	socket.on('createVehicle', data => {
		io.to(socketRooms[socket.id]).emit('master-createVehicle', data);
	});

	socket.on('start game', data => {
		io.to(socketRooms[socket.id]).emit('start game', data);
		console.log(`Game started in room ${socketRooms[socket.id]}`);
	});

	socket.on('send color', data => {
		const player = io.to(data.socketid);
		player.emit('receive color', {imageIndex: data.imageIndex});
	});

	socket.on('disconnect', () => {
		console.log(shortId + ' has disconnected');
		//check if this socketId is a master of any room:
		if (masterRoom.hasOwnProperty(socket.id)) {
			//it does, let's disconnect all clients from that room as well.
			io.to(masterRoom[socket.id]).emit('disconnected');
		}
	});
});

http.listen(PORT, () => {
	console.log('listening on *:' + PORT);
});

const createUniqueRoomKey = () => {
	const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	const length = 6;
	let id;
	do {
		id = '';
		for (let i = 0; i < length; i++) {
			id += characters[Math.floor(Math.random() * characters.length)];
		}
	} while (keyExists(id));
	return id;
};

const keyExists = id => {
	for (const key of roomKeys) {
		if (key === id) return true;
	}
	return false;
};
