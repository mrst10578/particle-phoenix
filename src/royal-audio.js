export function createRoyalAudioCue({ enabled = true } = {}) {
  let context = null;

  function ensureContext() {
    if (!enabled) return null;
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      context = new AudioContextClass();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function trigger() {
    const ctx = ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.055, now + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    master.connect(ctx.destination);

    const low = ctx.createOscillator();
    low.type = 'triangle';
    low.frequency.setValueAtTime(78, now);
    low.frequency.exponentialRampToValueAtTime(52, now + 0.36);
    low.connect(master);
    low.start(now);
    low.stop(now + 0.42);

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.016, now + 0.02);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    shimmerGain.connect(master);

    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(510, now);
    shimmer.frequency.exponentialRampToValueAtTime(820, now + 0.18);
    shimmer.connect(shimmerGain);
    shimmer.start(now);
    shimmer.stop(now + 0.25);

    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.22), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const envelope = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.value = 0.72;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.022, now + 0.025);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(now);
    noise.stop(now + 0.22);
  }

  function dispose() {
    if (context) {
      context.close().catch(() => {});
      context = null;
    }
  }

  return { trigger, dispose };
}
