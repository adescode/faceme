let minutesLabel = document.getElementById('minutes');
let secondsLabel = document.getElementById('seconds');

let totalSeconds = 0;

function setTime() {
  ++totalSeconds;
  secondsLabel.innerHTML = pad(totalSeconds % 60);
  minutesLabel.innerHTML = pad(parseInt(totalSeconds / 60));
}

function startTimer() {
  setInterval(setTime, 1000);
}

function pad(val) {
  let valString = val + '';
  if (valString.length < 2) {
    return '0' + valString;
  } else {
    return valString;
  }
}

export default startTimer;

