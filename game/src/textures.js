// Procedural canvas textures for CINDERLINE YARD — all painted in code, no image assets.
// Each maker returns a THREE.CanvasTexture (sRGB, repeat-wrapped) plus a matching bump canvas.
import * as THREE from '../vendor/three/three.module.min.js';

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function speckle(g, w, h, n, cols, a0, a1, s0, s1) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = a0 + Math.random() * (a1 - a0);
    g.fillStyle = cols[(Math.random() * cols.length) | 0];
    const s = s0 + Math.random() * (s1 - s0);
    g.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  g.globalAlpha = 1;
}
function streaks(g, w, h, n, col, a) {
  g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 1 + Math.random() * 2;
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h, l = 20 + Math.random() * 90;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 8, y + l); g.stroke();
  }
  g.globalAlpha = 1;
}
// ---- brick wall: courses, per-brick tint, mortar, grime, edge wear
export function brickTex(base = '#8a4a34', mortar = '#5d4a3e') {
  const [c, g] = cv(512, 512);
  g.fillStyle = mortar; g.fillRect(0, 0, 512, 512);
  const bh = 32, bw = 85;
  for (let y = 0, row = 0; y < 512; y += bh, row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < 512 + bw; x += bw) {
      const v = (Math.random() - .5) * 26;
      g.fillStyle = `rgb(${138 + v | 0},${74 + v * .6 | 0},${52 + v * .5 | 0})`;
      g.fillRect(x + off + 2, y + 2, bw - 4, bh - 4);
      g.fillStyle = 'rgba(255,220,180,.10)';
      g.fillRect(x + off + 2, y + 2, bw - 4, 3);
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.fillRect(x + off + 2, y + bh - 6, bw - 4, 4);
    }
  }
  speckle(g, 512, 512, 2600, ['#2a1a12', '#c98a5e', '#3d2c22'], .04, .16, 1, 4);
  streaks(g, 512, 512, 26, '#241610', .12);
  return tex(c);
}
// ---- cobble ground
export function cobbleTex() {
  const [c, g] = cv(512, 512);
  g.fillStyle = '#38332c'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = (Math.random() - .5) * 30;
    g.fillStyle = `rgb(${118 + v | 0},${110 + v | 0},${94 + v | 0})`;
    const px = x * 64 + 3, py = y * 64 + 3, s = 58;
    g.beginPath(); g.roundRect(px, py, s, s, 9); g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)';
    g.beginPath(); g.roundRect(px + 4, py + 4, s - 8, 10, 5); g.fill();
  }
  speckle(g, 512, 512, 2200, ['#2e2a24', '#8a8074', '#5c564c'], .05, .18, 1, 5);
  streaks(g, 512, 512, 18, '#1e1a16', .14);
  return tex(c);
}
// ---- concrete with cracks + stains
export function concreteTex(base = '#8d877c') {
  const [c, g] = cv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  speckle(g, 512, 512, 5200, ['#6f6a60', '#a39d8f', '#57524a'], .05, .2, 1, 6);
  g.strokeStyle = 'rgba(40,36,30,.55)'; g.lineWidth = 1.4;
  for (let i = 0; i < 7; i++) {
    let x = Math.random() * 512, y = Math.random() * 512;
    g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 9; s++) { x += (Math.random() - .5) * 46; y += Math.random() * 34; g.lineTo(x, y); }
    g.stroke();
  }
  streaks(g, 512, 512, 22, '#3a342c', .10);
  return tex(c);
}
// ---- corrugated metal (boxcar / roof)
export function metalTex(base = '#5a6b63') {
  const [c, g] = cv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 32) {
    const gr = g.createLinearGradient(x, 0, x + 32, 0);
    gr.addColorStop(0, 'rgba(0,0,0,.34)'); gr.addColorStop(.5, 'rgba(255,255,255,.13)'); gr.addColorStop(1, 'rgba(0,0,0,.34)');
    g.fillStyle = gr; g.fillRect(x, 0, 32, 512);
  }
  speckle(g, 512, 512, 1600, ['#7a4a28', '#3d443f', '#8a7a5a'], .06, .22, 1, 6);
  streaks(g, 512, 512, 30, '#2c2118', .16);
  return tex(c);
}
// ---- wood planks
export function woodTex(base = '#8a6a42') {
  const [c, g] = cv(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    const v = (Math.random() - .5) * 24;
    g.fillStyle = `rgb(${138 + v | 0},${106 + v * .7 | 0},${66 + v * .5 | 0})`;
    g.fillRect(0, y + 2, 512, 60);
    g.strokeStyle = 'rgba(40,26,12,.5)'; g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yy = y + 8 + Math.random() * 48;
      g.beginPath(); g.moveTo(0, yy);
      g.bezierCurveTo(170, yy + (Math.random() - .5) * 8, 340, yy + (Math.random() - .5) * 8, 512, yy);
      g.stroke();
    }
    g.fillStyle = 'rgba(30,20,8,.85)'; g.fillRect(0, y, 512, 3);
    g.fillStyle = 'rgba(255,230,180,.12)'; g.fillRect(0, y + 3, 512, 2);
  }
  speckle(g, 512, 512, 900, ['#5e4426', '#a8875a'], .05, .15, 1, 4);
  return tex(c);
}
// ---- hazard stripes (diagonal)
export function hazardTex() {
  const [c, g] = cv(256, 256);
  g.fillStyle = '#d8a419'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#1c1a18';
  for (let i = -4; i < 10; i++) {
    g.beginPath(); g.moveTo(i * 64, 256); g.lineTo(i * 64 + 32, 256); g.lineTo(i * 64 + 32 + 256, 0); g.lineTo(i * 64 + 256, 0); g.fill();
  }
  speckle(g, 256, 256, 500, ['#000', '#7a5c10'], .08, .2, 1, 4);
  return tex(c);
}
// ---- big stencil letter / label on transparent canvas (for signs)
export function stencilTex(text, fg = '#e8dcc2', bg = null, sub = '') {
  const [c, g] = cv(512, 256);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, 512, 256); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  // shrink the headline until the whole word fits the canvas (a clipped sign reads as a bug)
  let fs = 150;
  g.font = `900 ${fs}px Arial, sans-serif`;
  while (fs > 40 && g.measureText(text).width > 470) { fs -= 6; g.font = `900 ${fs}px Arial, sans-serif`; }
  g.fillText(text, 256, sub ? 108 : 128);
  if (sub) {
    let sfs = 44;
    g.font = `700 ${sfs}px Arial, sans-serif`;
    while (sfs > 20 && g.measureText(sub).width > 470) { sfs -= 4; g.font = `700 ${sfs}px Arial, sans-serif`; }
    g.fillText(sub, 256, 208);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// ---- graffiti tag (spray look)
export function graffitiTex(word, col = '#ff5a3c') {
  const [c, g] = cv(512, 256);
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 96;
  g.font = `italic 900 ${fs}px Arial, sans-serif`;
  while (fs > 40 && g.measureText(word).width > 470) { fs -= 6; g.font = `italic 900 ${fs}px Arial, sans-serif`; }
  g.save(); g.translate(256, 128); g.rotate(-0.06); g.fillText(word, 0, 0); g.restore();
  g.globalAlpha = .5;
  for (let i = 0; i < 260; i++) {
    g.fillStyle = col;
    g.fillRect(60 + Math.random() * 392, 60 + Math.random() * 136, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// ---- sky gradient (dusk) as equirect-ish canvas for background sphere
export function skyTex() {
  const [c, g] = cv(1024, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#1d2b4a'); gr.addColorStop(.42, '#7a5a72');
  gr.addColorStop(.62, '#e07840'); gr.addColorStop(.78, '#f2a45c'); gr.addColorStop(1, '#3a2c22');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  // sun glow — drawn 3x (x-1024, x, x+1024) so the texture wraps seamlessly:
  // a glow cut at the canvas edge reads as a hard vertical slab in the sky dome
  for (const gx of [700 - 1024, 700, 700 + 1024]) {
    const sg = g.createRadialGradient(gx, 330, 8, gx, 330, 430);
    sg.addColorStop(0, 'rgba(255,236,190,.95)'); sg.addColorStop(.25, 'rgba(255,190,110,.5)'); sg.addColorStop(1, 'rgba(255,180,90,0)');
    g.fillStyle = sg; g.fillRect(0, 0, 1024, 512);
  }
  // faint stars up top
  g.fillStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 90; i++) g.fillRect(Math.random() * 1024, Math.random() * 150, 1.4, 1.4);
  // distant skyline silhouettes
  g.fillStyle = 'rgba(24,16,20,.85)';
  let x = 0;
  while (x < 1024) { const w = 30 + Math.random() * 70, h = 26 + Math.random() * 60; g.fillRect(x, 330 - h, w, h + 60); x += w + 4; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// ---- weapon camo skin
export function camoTex() {
  const [c, g] = cv(256, 256);
  g.fillStyle = '#4a4640'; g.fillRect(0, 0, 256, 256);
  const cols = ['#6b5a34', '#2e2a24', '#7a6a44', '#3d3a30'];
  for (let i = 0; i < 26; i++) {
    g.fillStyle = cols[i % 4]; g.globalAlpha = .85;
    g.beginPath();
    const x = Math.random() * 256, y = Math.random() * 256, r = 18 + Math.random() * 42;
    g.ellipse(x, y, r, r * (.5 + Math.random() * .7), Math.random() * 3, 0, 7); g.fill();
  }
  g.globalAlpha = 1; speckle(g, 256, 256, 500, ['#111', '#8a7a55'], .08, .2, 1, 3);
  return tex(c);
}
// ---- ground ballast (rail bed gravel)
export function ballastTex() {
  const [c, g] = cv(512, 512);
  g.fillStyle = '#3f3a34'; g.fillRect(0, 0, 512, 512);
  speckle(g, 512, 512, 6000, ['#6e675c', '#2c2824', '#8a8172', '#57503f'], .1, .3, 2, 7);
  return tex(c);
}
export function makeCanvasTexture(draw, w = 256, h = 256) {
  const [c, g] = cv(w, h); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
