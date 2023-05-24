'use strict';

var os = require('os');
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8080;
const PROD = process.env.NODE_ENV === 'production';
const router = express.Router();

// Routing
router.get('/', function (req, res) {
  console.log('request', req.path);
  // facePeer('/')
  res.sendFile(path.join(__dirname + '/dist/index.html'));
});
router.get('/*', function (req, res) {
  console.log('request', req.path);
  facePeer(req.url);
  res.sendFile(path.join(__dirname + '/dist/index.html'));
});

app.use(express.static(path.join(__dirname, 'dist')));

app.use('/', router);

server.listen(port, () => {
  console.log(`Serverlistening at http://localhost:${port}`);
});

// Routing
// if (PROD) {
app.use('/', express.static(path.join(__dirname, 'dist')));
// }else{
// app.use('/', express.static(path.join(__dirname, 'public')));
// }

io.sockets.on('connection', function (socket) {
  facePeer(io.sockets, socket);
});

function facePeer(ioSockets, socket) {
  // console.log(socket.id, 'connected!');

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function (message) {
    // console.log(message);

    log('Client said: ', message.msg);
    // for a real app, would be room-only (not broadcast)
    ioSockets
      .in(message.room)
      .emit('message', { msg: message.msg, room: message.room, id: message.id });
    // socket.broadcast.emit('message', message);
    // socket.emit('message', message);
  });

  socket.on('chat message', (msg) => {
    ioSockets
      .in(msg.room)
      .emit('chat message', { msg: msg.msg, id: socket.id });
  });

  socket.on('create or join', function (room) {
    console.log(socket.id + ' Received request to create or join room ' + room);

    var clientsInRoom = ioSockets.adapter.rooms[room];
    var numClients = clientsInRoom
      ? Object.keys(clientsInRoom.sockets).length
      : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, socket.id);
    } else if (numClients === 1) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      ioSockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      ioSockets.in(room).emit('ready');
      console.log('numClients', numClients, clientsInRoom.sockets);
    } else {
      // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function () {
    console.log('received bye');
  });
}
