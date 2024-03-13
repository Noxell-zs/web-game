import {chords as Chords, MusicRNN, Player} from "@magenta/music";
import {tensorflow} from "@magenta/music/es6/protobuf/proto";
import INote = tensorflow.magenta.NoteSequence.INote;

const STEPS_PER_CHORD = 8;
const STEPS_PER_PROG = 4 * STEPS_PER_CHORD;

// Number of times to repeat chord progression.
const NUM_REPS = 8;

const allChords = ['C','D','E','F','G','A','B','Cm','Dm','Em','Fm','Gm','Am','Bm'] as const;
const allChordsNumber = allChords.length;
const getRandChord = () => allChords[Math.floor(Math.random() * allChordsNumber)];

// Set up Improv RNN model and player.
const model = new MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv');

// Current chords being played.
let currentChords: string[] | undefined;

// Sample over chord progression.
async function playOnce() {
  const chords = currentChords;

  // Prime with root note of the first chord.
  const root = Chords.ChordSymbols.root(chords![0]);
  const seq = {
    quantizationInfo: {stepsPerQuarter: 4},
    notes: [] as INote[],
    totalQuantizedSteps: 1
  };

  const contSeq = await model.continueSequence(
    seq,
    STEPS_PER_PROG + (NUM_REPS-1)*STEPS_PER_PROG - 1,
    0.9,
    chords
  );

  // Add the continuation to the original.
  contSeq.notes?.forEach((note) => {
    note.quantizedStartStep! += 1;
    note.quantizedEndStep! += 1;
    seq.notes.push(note);
  });

  const roots = chords!.map(Chords.ChordSymbols.root);
  for (let i = 0; i < NUM_REPS; i++) {
    for (let j = 0; j < 4; j++) {
      // Add the bass progression.
      seq.notes.push({
        instrument: 1,
        program: 32,
        pitch: 36 + roots[j],
        quantizedStartStep: i*STEPS_PER_PROG + j*STEPS_PER_CHORD,
        quantizedEndStep: i*STEPS_PER_PROG + (j+1)*STEPS_PER_CHORD
      });
    }
  }

  // Set total sequence length.
  seq.totalQuantizedSteps = STEPS_PER_PROG * NUM_REPS;

  return seq;
}

export const initialize = () => model.initialize();
export const generate = () => {
  currentChords = [
    getRandChord(),
    getRandChord(),
    getRandChord(),
    getRandChord(),
  ];

  Player.tone.context.resume();

  return playOnce();
}
