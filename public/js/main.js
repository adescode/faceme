'use strict';

import '../css/main.css';
import '../css/normalize.css';
import './timer.js';

// default declaration
let isChannelReady = false;
let isInitiator = false;
let isStarted = false;
let localStream;
let pc;
let remoteStream;
let turnReady;
let myID;

let socket = io.connect();

let $window = $(window);
let $m = $('#m');
let $loginPage = $('.login.page'); // The login page
let $inputMessage = $('.inputMessage'); // Input message input box
let $usernameInput = $('.usernameInput'); // Input for username
let $currentInput = $usernameInput.focus();
console.log(window);


//iceServers using numb.viagenie.ca for turn server
let pcConfig = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    { urls: 'stun:stun.l.google.com:19305' },
    { urls: 'stun:stun1.l.google.com:19305' },
    { urls: 'stun:stun2.l.google.com:19305' },
    { urls: 'stun:stun3.l.google.com:19305' },
    {
      urls: 'stun:stun4.l.google.com:19305',
      // urls: 'stun:stun.services.mozilla.com',
    },
    {
      urls: 'turn:numb.viagenie.ca',
      credential: 'TkLK99Fe!WLdXnk',
      username: 'adelaja444@gmail.com',
    },
  ],
};
/////////////////////////////////////////////

// Set up audio and video regardless of what devices are present.
let sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
};
/////////////////////////////////////////////

let localVideo = document.querySelector('#localVideo');
let remoteVideo = document.querySelector('#remoteVideo');
let closeButton = document.getElementById('closeButton');
let videoContainer2 = document.getElementById('videoContainer2');
let videoContainer3 = document.getElementById('videoContainer3');
let room = document.getElementById('room');
// let roomInput = room.value;

closeButton.addEventListener('click', (event) => {
  event.preventDefault();
  hangup();
  // window.location.reload();
});

/////////////////////////////////////////////

// Keyboard events

$window.keydown((event) => {
  // Auto-focus the current input when a key is typed
  if (!(event.ctrlKey || event.metaKey || event.altKey)) {
    room.focus();
  }
  // When the client hits ENTER on their keyboard
  if (event.which === 13) {
    if (pc) {
      $('form').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        if ($('#m').val() !== '' && $('#m').val() !== null) {
          socket.emit('chat message', { msg: $('#m').val(), room: room.value });
        }
        $('#m').val('');
        return false;
      });
    } else {
      // alert('closeinput')
      closeRoomInput();
    }
  }
});

$('form').submit(function (e) {
  e.preventDefault(); // prevents page reloading
  if (pc) {
    if ($('#m').val() !== '' && $('#m').val() !== null) {
      socket.emit('chat message', { msg: $('#m').val(), room: room.value });
    }
  }

  $('#m').val('');
  return false;
});

function closeRoomInput() {
  let roomInput = document.getElementById('room').value;
  // If the room is valid
  if (roomInput !== '' && roomInput !== null) {
    startDevices();
    socket.emit('create or join', roomInput);
    console.log('Attempted to create or  join room', roomInput);
    $loginPage.fadeOut();
    // $chatPage.show();
    $loginPage.off('click');
  }
}

function allowDrop(ev) {
  ev.preventDefault();
}

function drag(ev) {
  ev.dataTransfer.setData('text', ev.target.id);
}

function drop(ev) {
  ev.preventDefault();
  var data = ev.dataTransfer.getData('text');
  ev.target.appendChild(document.getElementById(data));
}

videoContainer2.addEventListener('drop', drop);
videoContainer3.addEventListener('drop', drop);
videoContainer2.addEventListener('dragover', allowDrop);
videoContainer3.addEventListener('dragover', allowDrop);
remoteVideo.addEventListener('dragstart', drag);

socket.on('chat message', function (msg) {
  console.log("'chat message', function (msg) ", msg);

  let divObj = document.getElementById('chatMessageList');
  const mssg = msg.id === myID ? `You: ${msg.msg}` : `Friend: ${msg.msg}`;
  $('#messages').append($('<li>').text(mssg));
  divObj.scrollTop = divObj.scrollHeight;
});

socket.on('created', function (room, id) {
  console.log('Created room ' + room + id);
  myID = id;
  isInitiator = true;
});

socket.on('full', function (room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room) {
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function (room, id) {
  console.log('joined: ' + room, id);
  myID = id;
  isChannelReady = true;
});

socket.on('log', function (array) {
  // console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

// This client receives a message
socket.on('message', function (message) {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate,
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////

function startDevices() {
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true,
    })
    .then(gotStream)
    .catch(function (e) {
      alert('getUserMedia() error: ' + e.name);
    });
}

function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  // remoteVideo.srcObject = localStream;
  closeButton.style.display = 'block';
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

var constraints = {
  video: true,
};

console.log(
  'Getting user media wiwth constraints',
  constraints,
  'location.hostname'
);
console.log('Getting location.hostname', location.hostname);

if (location.hostname !== 'localhost') {
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function () {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pcConfig);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  console.log('pcConfig.iceServers');
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          urls: 'turn:' + turnServer.username + '@' + turnServer.turn,
          credential: turnServer.password,
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.srcObject = localStream;
  localVideo.srcObject = remoteStream;
  localVideo.muted = !localVideo.muted;
  $('#messageDiv').css('display', 'flex');
  $('#timer').css('display', 'flex');
  startTimer();
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  closeButton.style.display = 'none';
  window.location.reload();
  if (pc) {
    isStarted = false;
    pc.close();
    pc = null;
  }
}
