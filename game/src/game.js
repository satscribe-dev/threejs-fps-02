// CINDERLINE YARD — game core: rounds, economy, shooting, grenades, particles,
// decals, tracers, staging hooks for the 4 screenshots. All logic written here.
import * as THREE from '../vendor/three/three.module.min.js';
import { buildMap } from './map.js';
import { buildBot } from './character.js';
import { Bot, locName } from './ai.js';
import { buildViewmodel } from './weapon.js';
import { HUD } from './hud.js';
import { createAudio } from './audio.js';
import { collideCircle, rayBoxes, raySphere, clamp, rand, pick } from './geom.js';

const WEAPONS = {
  ar: { name: 'LONGSHOT AR', price: 2700, dmg: 34, head: 100, rpm: 600, mag: 30, reserve: 90, spread: .012, auto: true, key: '1' },
  smg: { name: 'HORNET SMG', price: 1500, dmg: 22, head: 66, rpm: 900, mag: 32, reserve: 96, spread: .02, auto: true, key: '2' },
  pistol: { name: 'WREN-9', price: 700, dmg: 30, head: 90, rpm: 380, mag: 12, reserve: 36, spread: .014, auto: false, key: '3' },
};
const EMBER_NAMES = ['Vex', 'Kite', 'Rook', 'Ashford'];
const SLATE_NAMES = ['Sorrel', 'Marrow', 'Tamsin', 'Brannock', 'Okafor'];

export class Game {
  constructor(renderer, scene, camera, stage) {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    this.stage = stage || '';
    this.audio = createAudio();
    this.map = buildMap(scene);
    this.hud = new HUD(this.map);
    this.vm = buildViewmodel(camera);
    this.clock = new THREE.Clock();
    this.time = 0; this.frames = 0; this.fpsAvg = 0; this.frameMs = 0;
    this.errors = [];
    this.flashOn = false;
    this.state = 'menu'; // menu | buy | live | end | matchEnd
    this.round = 1; this.scoreE = 0; this.scoreS = 0;
    this.roundT = 100; this.buyT = 15;
    this.attackSite = 'A'; this.bombSite = null; this.bombPlanted = false; this.bombT = 0;
    this.bombCarrier = null;
    this.shake = 0;
    this.smokes = [];
    this.tracers = []; this.decals = []; this.dust = [];
    this.keys = {};
    this.sens = 1;
    this.plantBar = null;
    this._initPlayer();
    this._initBots();
    this._initFx();
    this._bindInput();
    this._applyStage();
    window.__game = this;
  }

  _initPlayer() {
    this.player = {
      pos: new THREE.Vector3(-28, 0, 0), yaw: -Math.PI / 2, pitch: 0,
      hp: 100, armour: 0, cash: 800, team: 'ember', alive: true, name: 'You',
      weapons: { pistol: { mag: 12, reserve: 36 } }, cur: 'pistol',
      nades: { frag: 1, smoke: 1, flare: 1 }, kills: 0, assists: 0, deaths: 0, hs: 0, dmg: 0,
      crouch: false, sprint: false, ads: false, stepAcc: 0, seenT: 0,
    };
    this.fireCd = 0; this.reloadT = 0; this.firing = false;
  }
  _initBots() {
    this.bots = [];
    const world = {
      colliders: this.map.colliders, waypoints: this.map.waypoints,
      sites: this.map.sites, bots: this.bots, player: this.player,
      attackSite: this.attackSite, attackTeam: 'ember', bombSite: null,
      events: {
        radio: (n, l) => { this.hud.radioAdd(n, l); },
        audioRadio: () => this.audio.radio(),
        kill: (from, victim, head) => this.onKill(from, victim, head),
        botShoot: (bot, vis) => this.botShoot(bot, vis),
        planted: (b) => this.onPlanted(b),
        defused: (b) => this.onDefused(b),
      },
    };
    this.world = world;
    const mk = (name, team, x, z, yaw) => {
      const b = new Bot({ name, team, x, z, yaw }, world);
      b.pos.set(x, 0, z); b.yaw = yaw;
      sceneAdd(this.scene, b.char.root);
      this.bots.push(b);
      return b;
    };
    // allies EMBER
    this.map.spawns.ember.forEach(([x, z], i) => {
      if (i === 0) return; // slot 0 = player
      mk(EMBER_NAMES[i - 1], 'ember', x, z, -Math.PI / 2);
    });
    // enemies SLATE
    this.map.spawns.slate.forEach(([x, z], i) => mk(SLATE_NAMES[i], 'slate', x, z, Math.PI / 2));
    function sceneAdd(s, o) { s.add(o); }
    // stats for scoreboard
    for (const b of this.bots) { b.kills = 0; b.assists = 0; b.deaths = 0; b.hs = 0; b.dmg = 0; b.cash = 800; b.seenT = 0; }
  }
  _initFx() {
    // tracer pool
    const tMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.02, .02, 1), tMat.clone());
      m.visible = false; this.scene.add(m);
      this.tracers.push({ m, life: 0 });
    }
    // decal pool (dark scorch circles)
    const dc = document.createElement('canvas'); dc.width = dc.height = 64;
    const dg = dc.getContext('2d');
    const gr = dg.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(10,8,6,.9)'); gr.addColorStop(.6, 'rgba(20,16,12,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    dg.fillStyle = gr; dg.fillRect(0, 0, 64, 64);
    const dt = new THREE.CanvasTexture(dc);
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(.22, .22), new THREE.MeshBasicMaterial({ map: dt, transparent: true, depthWrite: false }));
      m.visible = false; this.scene.add(m);
      this.decals.push({ m, life: 0 });
    }
    // dust points pool
    this.dustGeo = new THREE.BufferGeometry();
    this.dustPos = new Float32Array(240 * 3);
    this.dustVel = [];
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPos, 3));
    this.dustMat = new THREE.PointsMaterial({ color: 0xb8a88a, size: .14, transparent: true, opacity: .7, depthWrite: false });
    this.dustPts = new THREE.Points(this.dustGeo, this.dustMat);
    this.dustPts.frustumCulled = false; this.scene.add(this.dustPts);
    this.dustLife = 0;
    // smoke sprite texture
    const sc = document.createElement('canvas'); sc.width = sc.height = 128;
    const sg = sc.getContext('2d');
    const sgr = sg.createRadialGradient(64, 64, 4, 64, 64, 62);
    sgr.addColorStop(0, 'rgba(200,200,205,.85)'); sgr.addColorStop(1, 'rgba(180,180,185,0)');
    sg.fillStyle = sgr; sg.fillRect(0, 0, 128, 128);
    this.smokeTex = new THREE.CanvasTexture(sc);
    // plant progress bar
    const bar = document.createElement('div');
    bar.className = 'plantbar hidden';
    bar.innerHTML = '<div class="pb-label">PLANTING…</div><div class="pb-track"><i></i></div>';
    document.body.appendChild(bar);
    this.plantBar = bar;
  }
  _bindInput() {
    const hud = this.hud;
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyB' && this.state === 'buy') { this.buyOpen = !this.buyOpen; hud.showBuy(this.buyOpen, Math.ceil(this.buyT)); this.audio.click(); }
      if (e.code === 'KeyR') this.startReload();
      if (e.code === 'Tab') { e.preventDefault(); hud.showScore(true, this.scoreRows()); }
      if (e.code === 'Digit1') this.switchWeapon('ar');
      if (e.code === 'Digit2') this.switchWeapon('smg');
      if (e.code === 'Digit3') this.switchWeapon('pistol');
      if (e.code === 'Digit4') this.throwGrenade('smoke');
      if (e.code === 'Digit5') this.throwGrenade('frag');
      if (e.code === 'KeyC') this.player.crouch = !this.player.crouch;
      if (this.buyOpen && ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].includes(e.code)) this.buyItem(e.code.slice(-1));
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; if (e.code === 'Tab') hud.showScore(false); });
    document.addEventListener('mousedown', e => {
      if (this.state !== 'live' || !document.pointerLockElement) return;
      if (e.button === 0) this.firing = true;
      if (e.button === 2) this.player.ads = true;
    });
    document.addEventListener('mouseup', e => {
      if (e.button === 0) this.firing = false;
      if (e.button === 2) this.player.ads = false;
    });
    document.addEventListener('mousemove', e => {
      if (!document.pointerLockElement) return;
      const s = .0021 * this.sens * (this.player.ads ? .55 : 1);
      this.player.yaw -= e.movementX * s;
      this.player.pitch = clamp(this.player.pitch - e.movementY * s, -1.45, 1.45);
      this.lookDX = e.movementX; this.lookDY = e.movementY;
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
    hud.el.menu.querySelector('#startBtn').addEventListener('click', () => {
      this.audio.unlock();
      hud.showMenu(false);
      this.startMatch();
      document.body.requestPointerLock();
    });
    hud.el.menu.querySelector('#sens').addEventListener('input', e => {
      this.sens = +e.target.value;
      hud.el.menu.querySelector('#sensV').textContent = this.sens.toFixed(1);
    });
    hud.el.buy.querySelector('#buyGrid').addEventListener('click', e => {
      const it = e.target.closest('.buy-item');
      if (it) this.buyItem(it.dataset.k);
    });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'live') this.firing = false;
    });
  }
  buyItem(k) {
    const p = this.player;
    const defs = { 1: ['ar', 2700], 2: ['smg', 1500], 3: ['pistol', 700], 4: ['armour', 1000], 5: ['frag', 300], 6: ['smoke', 300] };
    const d = defs[k]; if (!d) return;
    if (p.cash < d[1]) { this.hud.radioAdd('SHOP', 'Not enough cash for ' + d[0]); return; }
    p.cash -= d[1];
    if (d[0] === 'armour') p.armour = 100;
    else if (d[0] === 'frag') p.nades.frag++;
    else if (d[0] === 'smoke') p.nades.smoke++;
    else { p.weapons[d[0]] = { mag: WEAPONS[d[0]].mag, reserve: WEAPONS[d[0]].reserve }; this.switchWeapon(d[0]); }
    this.audio.buy();
    this.refreshHud();
  }
  switchWeapon(key) {
    const p = this.player;
    if (!p.weapons[key] || p.cur === key) return;
    p.cur = key; this.reloadT = 0; this.vm.reloadT = 0;
    this.audio.click(); this.refreshHud();
  }
  startReload() {
    const p = this.player, w = WEAPONS[p.cur], inv = p.weapons[p.cur];
    if (this.reloadT > 0 || inv.mag === w.mag || inv.reserve <= 0) return;
    this.reloadT = 1.5; this.vm.startReload(); this.audio.reload();
  }
  startMatch() {
    this.state = 'buy'; this.buyT = 15; this.buyOpen = false;
    this.hud.banner('ROUND 1 — CINDERLINE YARD', 'EMBER attacks · plant the charge at Site A or B');
    this.hud.showBuy(false);
    this.resetPositions();
    this.planRound();
  }
  planRound() {
    this.attackSite = Math.random() < .5 ? 'A' : 'B';
    const carrier = this.bots.find(b => b.team === 'ember' && b.alive);
    if (carrier) { carrier.hasBomb = true; carrier.state = 'plant'; this.bombCarrier = carrier; }
    for (const b of this.bots) {
      if (b.team === 'ember' && b !== carrier) {
        b.state = 'advance';
        const s = this.map.sites[this.attackSite];
        b.pickRouteTo(s.x + rand(-3, 3), s.z + rand(-3, 3), Math.random() < .3);
        if (Math.random() < .4) b.say('round', { site: 'Site ' + this.attackSite });
      } else if (b.team === 'slate') {
        b.state = 'advance';
        const s = this.map.sites[Math.random() < .5 ? 'A' : 'B'];
        b.pickRouteTo(s.x + rand(-4, 4), s.z + rand(-4, 4), false);
      }
    }
  }
  resetPositions() {
    this.player.pos.set(-28, 0, 0); this.player.yaw = -Math.PI / 2; this.player.pitch = 0;
    this.player.hp = 100; this.player.alive = true;
    this.map.spawns.ember.forEach(([x, z], i) => {
      if (i === 0) return;
      const b = this.bots[i - 1]; if (!b) return;
      b.pos.set(x, 0, z); b.yaw = -Math.PI / 2; b.hp = 100; b.alive = true;
      b.char.root.rotation.set(0, 0, 0); b.char.root.position.y = 0; b.char.tag.visible = true;
      b.plantT = 0; b.defuseT = 0; b.hasBomb = false; b.crouching = false;
    });
    this.map.spawns.slate.forEach(([x, z], i) => {
      const b = this.bots[4 + i]; if (!b) return;
      b.pos.set(x, 0, z); b.yaw = Math.PI / 2; b.hp = 100; b.alive = true;
      b.char.root.rotation.set(0, 0, 0); b.char.root.position.y = 0; b.char.tag.visible = true;
      b.plantT = 0; b.defuseT = 0; b.crouching = false;
    });
    this.bombPlanted = false; this.bombSite = null; this.bombT = 0;
    for (const s of this.smokes) s.group.visible = false;
    this.smokes = [];
  }
  onKill(from, victim, head) {
    const wname = from === this.player ? WEAPONS[this.player.cur].name : 'Longshot AR';
    const fname = from === this.player ? 'You' : from.name;
    this.hud.killfeedAdd(fname, victim.name, wname, head);
    if (from === this.player) { this.player.kills++; if (head) this.player.hs++; this.player.cash += 300; this.audio.hit(); }
    if (from && from !== this.player && from.kills !== undefined) from.kills++;
    victim.deaths++;
    if (victim.hasBomb) {
      victim.hasBomb = false;
      const mate = this.bots.find(b => b.team === 'ember' && b.alive);
      if (mate) { mate.hasBomb = true; mate.state = 'plant'; this.bombCarrier = mate; }
    }
    // assist: last damager credit skipped (simple)
    this.checkRoundEnd();
    this.refreshHud();
  }
  botShoot(bot, vis) {
    // tracer + sound + hit resolution
    const from = new THREE.Vector3(bot.pos.x, 1.42, bot.pos.z);
    const tp = vis.e.pos;
    const to = new THREE.Vector3(tp.x, 1.3, tp.z);
    const dir = to.clone().sub(from).normalize();
    this.spawnTracer(from, to);
    this.audio.enemyShot(Math.hypot(tp.x - this.player.pos.x, tp.z - this.player.pos.z));
    const d = from.distanceTo(to);
    const moving = vis.isPlayer ? (this.keys['KeyW'] || this.keys['KeyA'] || this.keys['KeyS'] || this.keys['KeyD']) : false;
    const hitP = clamp(.55 - d * .008 - (moving ? .15 : 0) - (vis.isPlayer && this.player.crouch ? .05 : 0), .08, .6);
    if (Math.random() < hitP) {
      const head = Math.random() < .18;
      const dmg = Math.round((head ? 100 : 34) * rand(.85, 1.1));
      if (vis.isPlayer) this.damagePlayer(dmg, bot, head);
      else {
        const b = vis.e;
        b.dmg += 0; // dealt tracked on shooter below
        bot.dmg += dmg;
        b.damage(dmg, bot, head);
        if (head) this.audio.headshot();
      }
    } else {
      // near miss dust
      this.spawnDust(to.x + rand(-.5, .5), to.y + rand(-.3, .3), to.z + rand(-.5, .5), 8);
    }
  }
  damagePlayer(dmg, from, head) {
    const p = this.player;
    if (!p.alive || this.state !== 'live') return;
    let rem = dmg;
    if (p.armour > 0) { const absorbed = Math.min(p.armour, Math.round(dmg * .5)); p.armour -= absorbed; rem -= absorbed; }
    p.hp -= rem;
    this.audio.hurt();
    this.shake = Math.min(1, this.shake + .35);
    const ang = Math.atan2(from.pos.x - p.pos.x, from.pos.z - p.pos.z);
    const rel = (ang - (-p.yaw)) * 180 / Math.PI;
    this.hud.damageDir(rel);
    if (p.hp <= 0) {
      p.hp = 0; p.alive = false; p.deaths++;
      this.hud.killfeedAdd(from.name, 'You', 'Longshot AR', head);
      this.hud.banner('YOU ARE DOWN', 'Spectating — round continues');
      this.checkRoundEnd();
    }
    this.refreshHud();
  }
  playerShoot() {
    const p = this.player, w = WEAPONS[p.cur], inv = p.weapons[p.cur];
    if (this.reloadT > 0 || inv.mag <= 0) { if (inv.mag <= 0) this.startReload(); return; }
    inv.mag--;
    this.vm.fire(); this.flashOn = true;
    setTimeout(() => { this.flashOn = false; }, 60);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const spread = (w.spread * (p.ads ? .35 : 1) + (this.moving ? .006 : 0));
    dir.x += rand(-spread, spread); dir.y += rand(-spread, spread); dir.z += rand(-spread, spread);
    dir.normalize();
    const o = this.camera.position.clone();
    // muzzle world pos for tracer origin
    const muzzle = new THREE.Vector3();
    this.vm.flash.getWorldPosition(muzzle);
    // nearest bot sphere hit
    let bestT = 1e9, bestBot = null, bestPart = null;
    for (const b of this.bots) {
      if (!b.alive || b.team === 'ember') continue;
      for (const s of b.char.spheres) {
        const cx = b.pos.x + s.off.x, cy = s.off.y, cz = b.pos.z + s.off.z;
        const t = raySphere(o.x, o.y, o.z, dir.x, dir.y, dir.z, cx, cy, cz, s.r);
        if (t > 0 && t < bestT) { bestT = t; bestBot = b; bestPart = s.part; }
      }
    }
    const wall = rayBoxes(o.x, o.y, o.z, dir.x, dir.y, dir.z, this.map.colliders, 120);
    let end;
    if (bestBot && (!wall || bestT < wall.t)) {
      end = o.clone().addScaledVector(dir, bestT);
      const head = bestPart === 'head';
      const fall = bestT > 25 ? .8 : 1;
      const dmg = Math.round((head ? w.head : w.dmg) * fall * rand(.9, 1.1));
      p.dmg += dmg; bestBot.dmg += 0;
      this.hud.hitmark(head);
      if (head) this.audio.headshot(); else this.audio.hit();
      bestBot.damage(dmg, p, head);
      this.spawnDust(end.x, end.y, end.z, 6);
    } else if (wall) {
      end = wall.point.clone();
      this.spawnDecal(end, dir);
      this.spawnDust(end.x, end.y, end.z, 10);
      this.audio.hit();
    } else {
      end = o.clone().addScaledVector(dir, 60);
    }
    this.spawnTracer(muzzle, end);
    this.audio.shot(0);
    this.shake = Math.min(1, this.shake + .12);
    this.refreshHud();
  }
  spawnTracer(from, to) {
    const t = this.tracers.find(t => t.life <= 0); if (!t) return;
    const len = from.distanceTo(to);
    t.m.visible = true; t.life = 3;
    t.m.position.copy(from).lerp(to, .5);
    t.m.scale.set(1, 1, len);
    t.m.lookAt(to);
  }
  spawnDecal(point, dir) {
    const d = this.decals.find(d => d.life <= 0); if (!d) return;
    d.m.visible = true; d.life = 20;
    d.m.position.copy(point).addScaledVector(dir, -.02);
    d.m.lookAt(point.clone().addScaledVector(dir, -1));
    d.m.rotation.z = Math.random() * 6;
  }
  spawnDust(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const idx = (Math.random() * 240) | 0;
      this.dustPos[idx * 3] = x; this.dustPos[idx * 3 + 1] = y; this.dustPos[idx * 3 + 2] = z;
      this.dustVel[idx] = new THREE.Vector3(rand(-1, 1), rand(.2, 1.4), rand(-1, 1));
    }
    this.dustGeo.attributes.position.needsUpdate = true;
    this.dustLife = 12;
  }
  throwGrenade(kind) {
    const p = this.player;
    if (this.state !== 'live' || !p.alive || p.nades[kind] <= 0) return;
    p.nades[kind]--;
    const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir);
    const g = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshStandardMaterial({ color: kind === 'smoke' ? 0x8a8f94 : 0x3a5a34, roughness: .6 }));
    g.position.copy(this.camera.position).addScaledVector(dir, .4);
    this.scene.add(g);
    const vel = dir.clone().multiplyScalar(11); vel.y += 3.5;
    const fuse = kind === 'smoke' ? 1.4 : 1.1;
    this.grenades = this.grenades || [];
    this.grenades.push({ m: g, vel, t: fuse, kind });
    this.audio.click();
    this.refreshHud();
  }
  updateGrenades(dt) {
    if (!this.grenades) return;
    for (const g of this.grenades) {
      if (g.done) continue;
      g.t -= dt;
      g.vel.y -= 12 * dt;
      g.m.position.addScaledVector(g.vel, dt);
      if (g.m.position.y < .1) { g.m.position.y = .1; g.vel.y *= -.35; g.vel.x *= .7; g.vel.z *= .7; }
      if (g.t <= 0) {
        g.done = true; g.m.visible = false;
        if (g.kind === 'smoke') this.spawnSmoke(g.m.position.clone());
        else this.explode(g.m.position.clone());
      }
    }
    this.grenades = this.grenades.filter(g => !g.done);
  }
  spawnSmoke(pos) {
    const grp = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, opacity: .75, depthWrite: false }));
      s.position.set(rand(-1.6, 1.6), rand(.4, 2.4), rand(-1.6, 1.6));
      s.scale.setScalar(rand(2.5, 4.5));
      grp.add(s);
    }
    grp.position.copy(pos);
    this.scene.add(grp);
    this.smokes.push({ group: grp, pos: pos.clone(), r: 3.2, t: 12 });
    this.audio.shot(8);
  }
  explode(pos) {
    this.spawnDust(pos.x, pos.y, pos.z, 60);
    this.shake = 1;
    this.audio.shot(2);
    const dmgAt = (e) => {
      const d = Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z);
      return d < 7 ? Math.round(90 * (1 - d / 7) + 10) : 0;
    };
    for (const b of this.bots) {
      if (!b.alive) continue;
      const dmg = dmgAt(b);
      if (dmg > 0) b.damage(dmg, this.player, false);
    }
    const pd = Math.hypot(this.player.pos.x - pos.x, this.player.pos.z - pos.z);
    if (pd < 7) this.damagePlayer(Math.round(60 * (1 - pd / 7)), { name: 'Frag', pos }, false);
  }
  onPlanted(bot) {
    this.bombPlanted = true; this.bombSite = this.attackSite; this.bombT = 40;
    this.hud.banner('CHARGE PLANTED — SITE ' + this.attackSite, 'SLATE must defuse · 40 seconds');
    this.hud.radioAdd(bot.name, 'Charge planted at Site ' + this.attackSite);
    this.audio.plant();
    for (const b of this.bots) if (b.team === 'slate' && b.alive) { b.state = 'defuse'; b.pickRouteTo(this.map.sites[this.attackSite].x, this.map.sites[this.attackSite].z, false); }
  }
  onDefused(bot) {
    this.hud.banner('CHARGE DEFUSED', 'SLATE holds the yard');
    this.endRound('slate', 'defuse');
  }
  checkRoundEnd() {
    const eAlive = this.bots.filter(b => b.team === 'ember' && b.alive).length + (this.player.alive ? 1 : 0);
    const sAlive = this.bots.filter(b => b.team === 'slate' && b.alive).length;
    if (this.state !== 'live') return;
    if (sAlive === 0) this.endRound('ember', this.bombPlanted ? 'detonation' : 'elimination');
    else if (eAlive === 0) {
      if (this.bombPlanted) { /* round continues until detonation/defuse */ }
      else this.endRound('slate', 'elimination');
    }
  }
  endRound(winner, how) {
    if (this.state !== 'live') return;
    this.state = 'end';
    if (winner === 'ember') this.scoreE++; else this.scoreS++;
    const winCash = 3250, loseCash = 1900;
    this.player.cash += winner === 'ember' ? winCash : loseCash;
    for (const b of this.bots) b.cash += winner === b.team ? winCash : loseCash;
    const label = winner === 'ember' ? 'EMBER TAKES ROUND ' + this.round : 'SLATE TAKES ROUND ' + this.round;
    this.hud.banner(label, how === 'elimination' ? 'Enemy team eliminated' : how === 'defuse' ? 'Charge defused' : 'Charge detonated');
    if (winner === 'ember') this.audio.win(); else this.audio.lose();
    this.hud.setScore(this.scoreE, this.scoreS);
    this.roundEndT = 4;
    this.refreshHud();
  }
  nextRound() {
    this.round++;
    if (this.scoreE >= 7 || this.scoreS >= 7 || this.round > 12) {
      this.state = 'matchEnd';
      const weWon = this.scoreE > this.scoreS;
      this.hud.showEnd(true, weWon ? 'EMBER WINS THE MATCH' : 'SLATE WINS THE MATCH', `${this.scoreE} — ${this.scoreS} · Cinderline Yard`);
      document.exitPointerLock?.();
      return;
    }
    this.state = 'buy'; this.buyT = 15; this.buyOpen = false;
    this.resetPositions();
    this.planRound();
    this.hud.banner('ROUND ' + this.round + ' — CINDERLINE YARD', 'EMBER attacks · Site ' + this.attackSite + ' is the call');
  }
  scoreRows() {
    const rows = [{
      name: 'You', team: 'ember', k: this.player.kills, a: this.player.assists, d: this.player.deaths,
      hs: this.player.hs, dmg: this.player.dmg, cash: this.player.cash, you: true,
    }];
    for (const b of this.bots) rows.push({ name: b.name, team: b.team, k: b.kills, a: b.assists, d: b.deaths, hs: b.hs, dmg: b.dmg, cash: b.cash });
    rows.sort((a, b) => b.k - a.k || b.dmg - a.dmg);
    return rows;
  }
  refreshHud() {
    const p = this.player, w = WEAPONS[p.cur], inv = p.weapons[p.cur];
    this.hud.setVitals(p.hp, p.armour, p.cash);
    this.hud.setWeapon(w.name, inv.mag, inv.reserve,
      Object.keys(WEAPONS).map(k => ({ name: WEAPONS[k].name.split(' ')[0], cur: k === p.cur, owned: !!p.weapons[k] })).filter(s => s.owned),
      [{ key: 4, name: 'Smoke', n: p.nades.smoke }, { key: 5, name: 'Frag', n: p.nades.frag }]);
    this.hud.setScore(this.scoreE, this.scoreS);
  }
  _applyStage() {
    const s = this.stage;
    if (!s) return;
    // staged states for screenshots — real game state, pre-seeded
    this.scoreE = 3; this.scoreS = 5; this.round = 9;
    this.player.cash = 2350; this.player.armour = 85; this.player.hp = 76;
    this.player.weapons.ar = { mag: 24, reserve: 32 };
    this.player.weapons.smg = { mag: 28, reserve: 64 };
    this.player.cur = 'ar';
    this.state = 'live'; this.roundT = 82;
    this.hud.showMenu(false);
    if (s === 'combat') {
      // A-site hero: player SW of the tower, enemy in front of the tower legs
      this.player.pos.set(-12, 0, -4); this.player.yaw = Math.PI / 4; this.player.pitch = -.01;
      const e = this.bots.find(b => b.team === 'slate');
      e.pos.set(-21, 0, -6); e.yaw = -1.79; e.char.setAim(true);
      const e2 = this.bots.find(b => b.name === 'Marrow');
      e2.pos.set(-24, 0, -16); e2.yaw = -2.36;
      this.demoFire = false;
    } else if (s === 'buy') {
      this.state = 'buy'; this.buyT = 14; this.buyOpen = true;
      this.player.pos.set(-28, 0, 0); this.player.yaw = -Math.PI / 2;
      // allies spread out ahead of the player (not stacked on the camera)
      const spots = [[-24, -3], [-24, 3], [-22, -6], [-22, 5]];
      this.bots.filter(b => b.team === 'ember').forEach((b, i) => {
        const sp = spots[i] || [-24, 0];
        b.pos.set(sp[0], 0, sp[1]); b.yaw = -Math.PI / 2;
      });
      this.hud.showBuy(true, 14);
    } else if (s === 'duel') {
      // face-to-face: player south of enemy, both facing each other
      this.player.pos.set(2, 0, 7); this.player.yaw = 0; this.player.pitch = 0;
      const e = this.bots.find(b => b.team === 'slate');
      e.pos.set(2, 0, 1); e.yaw = Math.PI; e.char.setAim(true);
      this.demoFire = false;
    } else if (s === 'score') {
      this.round = 7; this.scoreE = 4; this.scoreS = 3;
      this.player.kills = 9; this.player.deaths = 4; this.player.hs = 3; this.player.dmg = 1240; this.player.cash = 4100;
      const stats = [[7, 2, 5, 2, 980], [6, 3, 4, 1, 840], [5, 1, 6, 0, 720], [4, 2, 5, 1, 610], [8, 1, 3, 2, 1100], [6, 2, 5, 1, 900], [5, 0, 7, 0, 650], [3, 1, 8, 0, 480], [2, 2, 9, 0, 390]];
      this.bots.forEach((b, i) => { const st = stats[i] || [1, 0, 5, 0, 200]; [b.kills, b.assists, b.deaths, b.hs, b.dmg] = st; b.cash = 2400 + i * 150; });
      this.hud.showScore(true, this.scoreRows());
      this.player.pos.set(-6, 0, -2); this.player.yaw = Math.PI / 2;
    }
    this.refreshHud();
  }
  // Re-seed transient feed lines right before a screenshot (they fade after ~6s).
  reseedFeed() {
    const s = this.stage;
    this.hud.killfeedAdd('Vex', 'Sorrel', 'LONGSHOT AR', false);
    this.hud.killfeedAdd('You', 'Brannock', 'LONGSHOT AR', true);
    this.hud.radioAdd('Vex', s === 'buy' ? 'Buy up, we hit Site A this round' : 'Contact at Water Tower, rotating');
    if (s === 'score') {
      this.hud.showScore(true, this.scoreRows());
      this.hud.banner('ROUND 7 — EMBER WINS', 'Site A cleared · charge detonated');
    }
    if (s === 'buy') this.hud.showBuy(true, Math.max(1, Math.ceil(this.buyT)));
    this.player.weapons.ar.mag = 24;
    this.refreshHud();
  }
  // Aim the player camera at the nearest visible enemy (used by the shoot script).
  aimAtNearest() {
    let best = null, bd = 1e9;
    for (const b of this.bots) {
      if (!b.alive || b.team === 'ember') continue;
      const d = Math.hypot(b.pos.x - this.player.pos.x, b.pos.z - this.player.pos.z);
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) return;
    const dx = best.pos.x - this.player.pos.x, dz = best.pos.z - this.player.pos.z;
    this.player.yaw = Math.atan2(-dx, -dz);
    this.player.pitch = clamp(Math.atan2(1.35 - 1.62, Math.hypot(dx, dz)), -1.45, 1.45);
  }
  update(dt) {
    this.time += dt; this.frames++;
    const p = this.player;
    // timers
    if (this.state === 'buy') {
      this.buyT -= dt;
      if (this.buyOpen) this.hud.showBuy(true, Math.max(0, Math.ceil(this.buyT)));
      if (this.buyT <= 0) {
        this.state = 'live'; this.roundT = 100; this.buyOpen = false;
        this.hud.showBuy(false);
        this.hud.banner('ROUND ' + this.round + ' — GO', 'Plant at Site ' + this.attackSite);
      }
    } else if (this.state === 'live') {
      this.roundT -= dt;
      if (this.bombPlanted) {
        this.bombT -= dt;
        if (Math.floor(this.bombT * 2) !== Math.floor((this.bombT + dt) * 2)) this.audio.beep();
        if (this.bombT <= 0) { this.endRound('ember', 'detonation'); }
      } else if (this.roundT <= 0) this.endRound('slate', 'time');
      if (this.roundT <= 0 && this.state === 'live') this.endRound('slate', 'time');
    } else if (this.state === 'end') {
      this.roundEndT -= dt;
      if (this.roundEndT <= 0) this.nextRound();
    }
    // HUD clock
    const obj = this.bombPlanted ? 'DEFEND THE CHARGE' : (this.state === 'buy' ? 'BUY PHASE' : 'PLANT AT SITE ' + this.attackSite);
    this.hud.setTime(Math.max(0, this.state === 'buy' ? this.buyT : this.roundT), this.round, obj);
    // player movement (only when alive + playing)
    const playing = (this.state === 'live' || this.state === 'buy') && p.alive;
    this.moving = false;
    if (playing) {
      const sp = (this.keys['ShiftLeft'] || this.keys['ShiftRight'] ? 7.2 : 4.6) * (p.crouch ? .55 : 1) * (p.ads ? .6 : 1);
      let fx = 0, fz = 0;
      if (this.keys['KeyW']) fz += 1; if (this.keys['KeyS']) fz -= 1;
      if (this.keys['KeyA']) fx -= 1; if (this.keys['KeyD']) fx += 1;
      if (fx || fz) {
        const len = Math.hypot(fx, fz); fx /= len; fz /= len;
        const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
        const dx = (fx * cos - fz * sin) * sp * dt;
        const dz = (-fx * sin - fz * cos) * sp * dt;
        p.pos.x += dx; p.pos.z += dz;
        collideCircle(this.map.colliders, p.pos, .45, 0, 1.8);
        this.moving = true;
        p.stepAcc += Math.hypot(dx, dz);
        if (p.stepAcc > 2.2) {
          p.stepAcc = 0;
          const onRail = Math.abs(p.pos.z + 6) < 2.4 || Math.abs(p.pos.z - 6) < 2.4;
          this.audio.footstep(onRail ? 'metal' : 'cobble', sp > 6);
        }
      }
    }
    // demo auto-fire for combat screenshot
    if (this.demoFire && this.state === 'live') {
      const e = this.bots.find(b => b.team === 'slate' && b.alive);
      if (e) {
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
        p.yaw = Math.atan2(-dx, -dz);
        p.pitch = clamp(Math.atan2(1.3 - 1.62, Math.hypot(dx, dz)), -1.45, 1.45);
        this.fireCd -= dt;
        if (this.fireCd <= 0) { this.fireCd = .24; this.playerShoot(); }
      }
    }
    // firing
    if (this.firing && this.state === 'live' && p.alive && !this.demoFire) {
      this.fireCd -= dt;
      const w = WEAPONS[p.cur];
      if (this.fireCd <= 0) {
        if (w.auto) { this.playerShoot(); this.fireCd = 60 / w.rpm; }
        else { this.playerShoot(); this.firing = false; this.fireCd = 60 / w.rpm; }
      }
    } else if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const w = WEAPONS[p.cur], inv = p.weapons[p.cur];
        const need = w.mag - inv.mag, take = Math.min(need, inv.reserve);
        inv.mag += take; inv.reserve -= take;
        this.refreshHud();
      }
    }
    // grenades, fx
    this.updateGrenades(dt);
    for (const s of this.smokes) {
      s.t -= dt;
      s.group.children.forEach((sp, i) => { sp.scale.setScalar(sp.scale.x + dt * .3); sp.material.opacity = Math.max(0, .75 * (s.t / 12)); });
      if (s.t <= 0) { s.group.visible = false; }
    }
    this.smokes = this.smokes.filter(s => s.t > 0);
    for (const t of this.tracers) if (t.life > 0) { t.life--; t.m.material.opacity = Math.max(0, t.life / 3) * .9; if (t.life <= 0) t.m.visible = false; }
    for (const d of this.decals) if (d.life > 0) { d.life -= dt; if (d.life <= 0) d.m.visible = false; }
    if (this.dustLife > 0) {
      this.dustLife--;
      for (let i = 0; i < 240; i++) {
        const v = this.dustVel[i]; if (!v) continue;
        this.dustPos[i * 3] += v.x * .05; this.dustPos[i * 3 + 1] += v.y * .05; this.dustPos[i * 3 + 2] += v.z * .05;
        v.y -= .08;
        if (this.dustPos[i * 3 + 1] < .02) { this.dustPos[i * 3 + 1] = -10; }
      }
      this.dustGeo.attributes.position.needsUpdate = true;
      this.dustMat.opacity = Math.max(0, this.dustLife / 12) * .7;
    }
    // bots
    for (const b of this.bots) {
      b.update(dt, this.time);
      if (b.alive && b.target && b.target.isPlayer) this.player.seenT = .1;
    }
    for (const b of this.bots) if (b.seenT > 0) b.seenT -= dt;
    // plant progress bar (carrier channeling)
    const carrier = this.bombCarrier;
    if (carrier && carrier.alive && carrier.plantT > 0 && carrier.plantT < 3 && this.state === 'live') {
      this.plantBar.classList.remove('hidden');
      this.plantBar.querySelector('i').style.width = (carrier.plantT / 3 * 100) + '%';
    } else this.plantBar.classList.add('hidden');
    // camera
    const eye = p.crouch ? 1.15 : 1.62;
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const shX = (Math.random() - .5) * this.shake * .05, shY = (Math.random() - .5) * this.shake * .05;
    this.camera.position.set(p.pos.x, eye, p.pos.z);
    this.camera.rotation.set(p.pitch + shX, p.yaw + shY, 0, 'YXZ');
    const targetFov = p.ads ? 55 : 75;
    if (Math.abs(this.camera.fov - targetFov) > .1) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 10);
      this.camera.updateProjectionMatrix();
    }
    // viewmodel
    this.vm.update(dt, this.moving ? 1 : 0, this.lookDX || 0, this.lookDY || 0, p.ads);
    this.lookDX = 0; this.lookDY = 0;
    // beacon blink
    this.map.beacon.material.emissiveIntensity = (Math.sin(this.time * 4) > 0) ? 2.5 : .2;
    // minimap
    this.hud.drawMinimap(p, this.bots.filter(b => b.team === 'ember'), this.bots.filter(b => b.team === 'slate'), this.bombPlanted ? this.map.sites[this.bombSite] : null, this.bombPlanted);
    // crosshair gap by spread + move
    this.hud.setCrosshairGap(6 + (this.moving ? 6 : 0) + (p.ads ? -3 : 0), p.ads);
    // fps
    const ms = dt * 1000;
    this.frameMs = this.frameMs * .95 + ms * .05;
    this.fpsAvg = this.fpsAvg * .95 + (1 / Math.max(dt, 1e-4)) * .05;
  }
}
