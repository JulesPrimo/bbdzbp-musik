const partitionInput = document.getElementById('partition');
partitionInput.value = getPartition();
partitionInput.onchange = function() {
  setPartition(partitionInput.value);
}

const tempoInput = document.getElementById('tempo');
const tempoLabel = document.getElementById('tempo-label');

const applyTempo = () => {
  const bpm = parseInt(tempoInput.value);
  tempoLabel.textContent = `${bpm} BPM`;
  setTempo(bpm);
};

tempoInput.oninput = function() {
  applyTempo();
  if (isStarted()) start();
};

applyTempo();

const partitionDisplay = document.getElementById('partition-display');

const splitChords = text =>
  text.replace(/\s/g, '').replace(/,+/g, ',').split(/(?!\(.*),(?![^(]*?\))/g);

let lastChordIndex = -1;
let wasPlaying = false;

const rebuildDisplay = activeIndex => {
  const chords = splitChords(partitionInput.value);
  partitionDisplay.innerHTML = chords.map((chord, i) =>
    i === activeIndex ? `<mark>${chord}</mark>` : chord
  ).join(',');
};

const tick = () => {
  const playing = isStarted();

  if (playing !== wasPlaying) {
    partitionInput.style.display = playing ? 'none' : '';
    partitionDisplay.style.display = playing ? 'block' : 'none';
    wasPlaying = playing;
    if (!playing) { lastChordIndex = -1; partitionDisplay.innerHTML = ''; }
  }

  if (playing) {
    const idx = getCurrentChordIndex();
    if (idx !== lastChordIndex) {
      lastChordIndex = idx;
      rebuildDisplay(idx);
    }
  }

  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
