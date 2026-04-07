const partitionInput = document.getElementById('partition');
partitionInput.onchange = function() {
  setPartition(partitionInput.value);
};

const partitionSelect = document.getElementById('partition-select');

const loadPartition = name => {
  const { notes, tempo } = partitions[name];
  partitionInput.value = notes;
  setPartition(notes);
  tempoInput.value = tempo;
  applyTempo();
  if (isStarted()) start();
};

const downloadPartition = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([partitionInput.value], { type: 'text/plain' }));
  a.download = 'partition.txt';
  a.click();
  URL.revokeObjectURL(a.href);
};

const tempoInput = document.getElementById('tempo');
const tempoLabel = document.getElementById('tempo-label');

const applyTempo = () => {
  const bpm = parseInt(tempoInput.value);
  tempoLabel.textContent = `${bpm} BPM`;
  setTempo(bpm);
};

let tempoRestartTimeout = null;
tempoInput.oninput = function() {
  applyTempo();
  if (isStarted()) {
    clearTimeout(tempoRestartTimeout);
    tempoRestartTimeout = setTimeout(() => start(), 500);
  }
};

Object.keys(partitions).forEach(name => {
  const option = document.createElement('option');
  option.value = name;
  option.textContent = name;
  partitionSelect.appendChild(option);
});

partitionSelect.onchange = () => loadPartition(partitionSelect.value);
loadPartition(partitionSelect.value);

const partitionDisplay = document.getElementById('partition-display');
const beatDot = document.getElementById('beat-dot');

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

    const phase = getChordPhase();
    const scale = 1 + 1.2 * Math.pow(1 - phase, 4);
    const opacity = 0.3 + 0.7 * Math.pow(1 - phase, 4);
    beatDot.style.transform = `scale(${scale})`;
    beatDot.style.opacity = opacity;
  } else {
    beatDot.style.transform = 'scale(1)';
    beatDot.style.opacity = 0.3;
  }

  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
