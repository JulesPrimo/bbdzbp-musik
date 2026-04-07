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
    const { chord, index: idx, phase } = getCurrentChordInfo() ?? { chord: null, index: -1, phase: 0 };
    if (idx !== lastChordIndex) {
      lastChordIndex = idx;
      rebuildDisplay(idx);
      const hue = Math.random() * 360;
      const color = `hsl(${hue}, 90%, 70%)`;
      beatDot.style.background = color;
      beatDot.style.boxShadow = `0 0 10px ${color}`;
      beatDot.style.left = `${Math.random() * (window.innerWidth  - 14)}px`;
      beatDot.style.top  = `${Math.random() * (window.innerHeight - 14)}px`;
    }

    const isRest = chord?.name.replace(/[*/].*$/, '') === '-';
    const pulse = isRest ? 0 : Math.pow(1 - phase, 2);
    beatDot.style.transform = `scale(${pulse * 3})`;
    beatDot.style.opacity = pulse;
  } else {
    beatDot.style.transform = 'scale(0)';
    beatDot.style.opacity = 0;
  }

  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
