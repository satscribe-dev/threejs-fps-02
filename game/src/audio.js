// Synthesized WebAudio: no audio assets. Shot, reload, footsteps (per-surface pitch),
// hit thock, plant beep, round sting, radio blip. Positional-ish via gain by distance.
export function createAudio() {
  let ctx = null, master = null, enabled = false;
  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination);
        enabled = true;
      } catch { enabled = false; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return enabled;
  }
  function noiseBuf(dur) {
    const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function burst(dur, filterFreq, type, gainV, when = 0) {
    if (!ensure()) return;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf(dur);
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainV, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur);
  }
  function tone(freq, dur, type, gainV, slideTo = 0, when = 0) {
    if (!ensure()) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainV, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
  }
  return {
    unlock() { ensure(); },
    shot(dist = 0) {
      const v = Math.max(.08, 1 - dist / 60);
      burst(.12, 2400, 'lowpass', .9 * v);
      burst(.05, 5200, 'highpass', .5 * v);
      tone(150, .09, 'sine', .7 * v, 55);
    },
    enemyShot(dist) { this.shot(Math.max(6, dist)); },
    reload() {
      burst(.05, 3000, 'bandpass', .35, 0);
      tone(900, .04, 'square', .12, 500, .12);
      burst(.05, 2600, 'bandpass', .35, .55);
      tone(700, .05, 'square', .14, 420, .8);
    },
    footstep(surface = 'cobble', run = false) {
      const base = surface === 'metal' ? 1400 : surface === 'wood' ? 900 : 500;
      burst(.07, base + Math.random() * 300, 'lowpass', run ? .22 : .13);
    },
    hit() { tone(1800, .05, 'square', .2, 900); },
    headshot() { tone(2400, .07, 'square', .25, 1100); tone(1800, .05, 'square', .2, 900, .05); },
    hurt() { tone(220, .12, 'sawtooth', .25, 110); },
    plant() { tone(1200, .08, 'sine', .3); tone(1200, .08, 'sine', .3, 0, .18); },
    beep() { tone(1500, .06, 'sine', .25); },
    win() { [523, 659, 784].forEach((f, i) => tone(f, .22, 'triangle', .25, 0, i * .14)); },
    lose() { [392, 330, 262].forEach((f, i) => tone(f, .25, 'triangle', .22, 0, i * .16)); },
    radio() { tone(1050, .04, 'square', .07); tone(1400, .04, 'square', .07, 0, .07); },
    click() { tone(2000, .03, 'square', .12); },
    buy() { tone(880, .06, 'triangle', .2); tone(1320, .08, 'triangle', .2, 0, .07); },
  };
}
