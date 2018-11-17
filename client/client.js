var __socketDebug__ = true;
var ready = false;
var hasConnected = false;

var socket = io();
var query = getQueryParams(document.location.search);

onResize();

socket.on('connected', function() {
	if (hasConnected) {
		//This probably means that the server restarted, let's just refresh the page.
		location.href =
			window.location.origin + '?error=Server+restarted+unexpectedly';
	}
	hasConnected = true;

	if (__socketDebug__) console.log('SocketId: ' + socket.id);
});
socket.on('disconnected', function() {
	location.href = window.location.origin + '?error=Master+has+abandoned+room';
});

socket.emit('joinRoom', query.room);
socket.on('invalidRoom', function() {
	location.href = window.location.origin + '?error=Invalid+room+key';
});

socket.on('receive color', function(data) {
	imageIndex = data.imageIndex;

	var element = document.getElementById('container');
	element.style = buildCSS(imageIndex);
});

socket.on('start game', function() {
	var audio = new Audio('../resources/sfx/race_countdown.ogg');
	audio.play();
});

function buildCSS(imageIndex) {
	var path = vehiclePath + vehicleImageNames[imageIndex];
	var string = 'background-size:180px;';
	string += 'background-position:50% 70%;';
	string += 'background-repeat:no-repeat;';
	string += 'background-image:url("' + path + '");';

	return string;
}

//TODO REMOVE
// var vehicleImages = [];
// for (var i = 0; i < vehicleImageNames.length; i++) {
// 	var tempImage = new Image();
// 	tempImage.src = vehiclePath + vehicleImageNames[i];
// 	vehicleImages.push(tempImage);
// }

setTimeout(function() {
	socket.emit('createVehicle', {player: socket.id, name: query.name});
	setTimeout(function() {
		ready = true;
	}, 500);
}, 1000);

var joystick = new VirtualJoystick({
	container: document.getElementById('container'),
	mouseSupport: true,
});
joystick.addEventListener('touchStart', function() {
	//console.log('down');
});
joystick.addEventListener('touchEnd', function() {
	//console.log('up');
});

setInterval(function() {
	var x = (-joystick.deltaX() * sensitivity) / -500;
	var y = (joystick.deltaY() * sensitivity) / -500;

	if (ready) {
		socket.emit('controls', {
			player: socket.id,
			name: query.name,
			x: '' + x,
			y: '' + y,
		});
	}
}, 100);

window.addEventListener('resize', onResize);

function onResize() {
	var w = window,
		d = document,
		e = d.documentElement,
		g = d.getElementsByTagName('body')[0],
		screenWidth = w.innerWidth || e.clientWidth || g.clientWidth,
		screenHeight = w.innerHeight || e.clientHeight || g.clientHeight;

	var smallestDimension =
		screenWidth < screenHeight ? screenWidth : screenHeight;
	sensitivity = 500 / smallestDimension;
	//console.log(smallestDimension, sensitivity);
}

function getQueryParams(qs) {
	qs = qs.split('+').join(' ');

	var params = {},
		tokens,
		re = /[?&]?([^=]+)=([^&]*)/g;

	while ((tokens = re.exec(qs))) {
		params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
	}

	return params;
}
