const NOTE_TABLE = {
  "C": 261.63, "C#": 277.18, "D": 293.66, "D#": 311.13,
  "E": 329.63, "F": 349.23, "F#": 369.99, "G": 392.00,
  "G#": 415.30, "A": 440.00, "A#": 466.16, "B": 493.88,
  "-": 0,
};

const NOTE_SCALE = ["C", "D", "E", "F", "G", "A", "B"];

const getNote = (note) => {
  note = note.toUpperCase();

  const [noteName, signature] = note.split('');

  if (signature === "B") {
    if (noteName === "C") { return { name: "B", frequency: NOTE_TABLE["B"] / 2 }; }

    note = [NOTE_SCALE[NOTE_SCALE.lastIndexOf(noteName) - 1], noteName === "F" ? "" : "#"].join("");
  }

  if (signature === "#") {
    if (noteName === "B") { return { name: "C", frequency: NOTE_TABLE["C"] * 2 }; }
    if (noteName === "E") { note = "F"; }
  }

  return { name: note, frequency: NOTE_TABLE[note] };
}

let tempo = 120;
const setTempo = bpm => { tempo = bpm; };

const getChordDuration = chord => {
  const seconds = 60 / tempo;
  const { operator, number } = /.+?(?<operator>\/|\*)?(?<number>\d)?$/.exec(chord).groups;

  if (operator === "/") { return seconds / number; }
  if (operator === "*") { return seconds * number; }

  return seconds;
};

const getNoteFrequency = name => {
  const { note, scale } = /(?<note>[A-Za-z](#|b)?|-)?(?<scale>\d*)/.exec(name).groups;

  const exposure = scale === "" ? 0 : parseInt(scale) - 4;

  const { frequency } = getNote(note);

  return frequency * (2 ** exposure);
};

const parsePartition = partition => {
  const chords = partition.replace(/\s/g, "").replace(/,+/g, ',').split(/(?!\(.*),(?![^(]*?\))/g);

  return chords.map(chord => {
    return {
      duration: getChordDuration(chord),
      frequencies: getRampFrequencies(chord),
      name: chord,
    }
  })
}

const getRampFrequencies = chord => {
  const ramp = chord.replace(/(\*|\/)\d*$/g, "").split("->");
  const steps = ramp.map(step => getChordFrequencies(step));

  return steps[0].map((step, i) => [step, ...steps.slice(1).map(step => step[i])]);
}

const getChordFrequencies = chord => chord.replace(/.*\(|\).*/g, "").split(",").map(note => getNoteFrequency(note));

const totalDuration = chords => chords.reduce((acc, chord) => acc + chord.duration, 0);

const play = async partition => {
  const chords = parsePartition(partition);
  const duration = totalDuration(chords);

  const offlineContext = new OfflineAudioContext(1, audioContext.sampleRate * duration, audioContext.sampleRate);

  enqueueChords(chords, offlineContext);

  const renderedBuffer = await offlineContext.startRendering();

  const source = audioContext.createBufferSource();
  source.buffer = renderedBuffer;
  source.loop = true;

  source.connect(audioContext.destination);

  return source;
}

const enqueueChords = (chords, context) => {
  let startTime = 0;

  chords.forEach(({ frequencies, duration })  => {
    const endTime = startTime + duration;

    const gainValue = 1 / frequencies.length;

    frequencies.forEach((frequency) => {
      createOscillatorForFrequency(context, frequency, startTime, endTime, gainValue);
    });

    startTime += duration;
  });
}

const createGainNode = (context, startTime, endTime, gainValue) => {
  const gainNode = context.createGain();

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.005);
  gainNode.gain.linearRampToValueAtTime(0, endTime - 0.005);
  gainNode.connect(context.destination);

  return gainNode;
}

const createOscillatorForFrequency = (context, frequency, startTime, endTime, gainValue) => {
  const oscillator = context.createOscillator();

  oscillator.type = "sine";

  oscillator.frequency.setValueAtTime(frequency[0], startTime);

  const rampTime = (endTime - startTime) / frequency.length;

  for(let i = 1; i < frequency.length; i++) {
    oscillator.frequency.linearRampToValueAtTime(frequency[i], startTime + i * rampTime);
  }

  oscillator.start(startTime);
  oscillator.stop(endTime);
  oscillator.connect(
    createGainNode(context, startTime, endTime, gainValue)
  );

  return oscillator;
}

let partition = "";

const getPartition = () => partition;

const setPartition = newPartition => {
  partition = newPartition;
}

let song = null;
let audioContext = null;
let started = false;
let songStartTime = null;
let currentChords = null;
let currentTotalDuration = 0;

const getCurrentChordInfo = () => {
  if (!started || !audioContext || songStartTime === null || !currentChords) return null;
  const elapsed = (audioContext.currentTime - songStartTime) % currentTotalDuration;
  let t = 0;
  for (let i = 0; i < currentChords.length; i++) {
    const chord = currentChords[i];
    const end = t + chord.duration;
    if (elapsed < end) return { chord, index: i, phase: (elapsed - t) / chord.duration };
    t = end;
  }
  return null;
};

const getCurrentChord = () => getCurrentChordInfo()?.chord ?? null;
const getCurrentChordIndex = () => getCurrentChordInfo()?.index ?? -1;
const getChordPhase = () => getCurrentChordInfo()?.phase ?? 0;

const isStarted = () => started;

const start = async () => {
  audioContext = audioContext || new AudioContext();

  currentChords = parsePartition(getPartition());
  currentTotalDuration = totalDuration(currentChords);

  song = song || await play(getPartition());

  if (!started) {
    audioContext.resume();
    started = true;
    songStartTime = audioContext.currentTime;
    song.start();

    return;
  }

  stop();
  start();
};

const pause = () => audioContext?.suspend();
const resume = () => audioContext?.resume();

const stop = () => {
  if (song === null) { return; }

  started = false;
  song.stop();
  song = null;
};
