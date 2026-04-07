document.addEventListener('pointerdown', initAudio, { once: true });

const partitionInput = document.getElementById('partition');

const partitionSelect = document.getElementById('partition-select');

const loadPartition = name => {
  const { notes, tempo } = partitions[name];
  const clean = sanitize(notes);
  partitionInput.value = clean;
  setPartition(clean);
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

const compress = async text => {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = await new Response(stream).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
};

const decompress = async b64 => {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
};

const navigate = async name => {
  if (!partitions[name]) name = Object.keys(partitions)[0];
  partitionSelect.value = name;
  history.replaceState(null, '', `#${name}`);
  loadPartition(name);
};

const navigateCustom = async hash => {
  const [, bpm, b64] = hash.split(':');
  const notes = sanitize(await decompress(b64));
  partitionSelect.value = '';
  partitionInput.value = notes;
  setPartition(notes);
  tempoInput.value = bpm;
  applyTempo();
};

let toastTimeout = null;
const showToast = msg => {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2000);
};

const sharePartition = async () => {
  const current = partitionInput.value;
  const known = Object.entries(partitions).find(([, p]) => p.notes === current);
  const bpm = parseInt(tempoInput.value);
  const hash = known ? known[0] : `z:${bpm}:${await compress(current)}`;
  const url = `${location.href.split('#')[0]}#${hash}`;
  if (url.length > 2000) {
    showToast('partition trop longue');
    return;
  }
  history.replaceState(null, '', `#${hash}`);
  await navigator.clipboard?.writeText(url);
  showToast('copié dans le presse-papier');
};

partitionSelect.onchange = () => navigate(partitionSelect.value);
const sanitize = text => text.trim().replace(/^,+|,+$/g, '');

partitionInput.onchange = function() {
  setPartition(sanitize(partitionInput.value));
};

window.addEventListener('hashchange', () => {
  const hash = location.hash.slice(1);
  hash.startsWith('z:') ? navigateCustom(hash) : navigate(hash);
});

const initialHash = location.hash.slice(1);
initialHash.startsWith('z:')
  ? navigateCustom(initialHash)
  : navigate(initialHash || Object.keys(partitions)[0]);

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
