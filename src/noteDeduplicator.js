// Takes an array of notes with the following structure:
// [{ note: 'A1', volume: 0.01, ...}, ...]
// And produces a new array of deduplicated notes based on two criteria:
// 1. The note is different:
// { note: 'A1', volume: 0.01, ...}
// { note: 'C1', volume: 0.01, ...}
// 2. The note was in decay and then got higher in volume:
// { note: 'A1', volume: 0.01, ...} -> attack phase
// { note: 'A1', volume: 0.05, ...} -> attack phase
// { note: 'A1', volume: 0.10, ...} -> attack phase
// { note: 'A1', volume: 0.05, ...} -> decay phase
// { note: 'A1', volume: 0.15, ...} -> jump in volume while in decay phase means a new note
const noteDeduplicator = (notes) => {
  let latestNote = null;
  let latestVolume = 0;
  let isDecayPhase = false;
  const offset = 0.005;

  let filteredNotes = [];

  notes.forEach((noteObj) => {
    if (noteObj.note != latestNote) {
      filteredNotes = [...filteredNotes, noteObj];
      isDecayPhase = false;
      latestVolume = 0;
    } else if (noteObj.volume < latestVolume) {
      isDecayPhase = true;
    } else if (noteObj.volume > (latestVolume + offset) && isDecayPhase) {
      filteredNotes = [...filteredNotes, noteObj];
      isDecayPhase = false;
      latestVolume = 0;
    }

    latestNote = noteObj.note;
    latestVolume = noteObj.volume;
  });

  return filteredNotes;
};

export default noteDeduplicator;