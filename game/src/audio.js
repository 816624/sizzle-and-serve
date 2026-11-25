// Tiny synthesized sound effects with WebAudio: no audio files, nothing to load.
// The first user gesture unlocks the audio context; until then calls are silent.
const NOTES = {
  pickup: [660, 880],
  chop: [220, 180],
  done: [523, 659, 784],
  coin: [988, 1319],
  serve: [784, 988, 1175],
  bad: [196, 147],
  burn: [330, 262, 196],
  expire: [392, 311],
  over: [523, 392, 330, 262],
};

export function createAudio() {
  let context = null;
  let enabled = true;

  function ensure() {
    if (!context) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function tone(frequency, at, length, type, gain) {
    const ctx = ensure();
    if (!ctx || !enabled) return;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, ctx.currentTime + at);
    envelope.gain.linearRampToValueAtTime(gain, ctx.currentTime + at + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + length);
    oscillator.connect(envelope);
    envelope.connect(ctx.destination);
    oscillator.start(ctx.currentTime + at);
    oscillator.stop(ctx.currentTime + at + length + 0.05);
  }

  return {
    unlock() { ensure(); },
    setEnabled(value) { enabled = value; },
    play(name) {
      const notes = NOTES[name];
      if (!notes) return;
      notes.forEach((frequency, index) => {
        tone(frequency, index * 0.09, 0.16, name === 'bad' || name === 'burn' ? 'sawtooth' : 'sine', 0.12);
      });
    },
  };
}
