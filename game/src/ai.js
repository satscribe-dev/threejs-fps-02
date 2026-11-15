// Bot AI: waypoint routes, cover + flank, LOS checks, burst fire with reaction time,
// radio callouts, plant/defuse. Simple, deterministic-ish, visible behavior.
import * as THREE from '../vendor/three/three.module.min.js';
import { buildBot } from './character.js';
import { collideCircle, rayBoxes, raySphere, clamp, rand, pick } from './geom.js';

const RADIO = {
  contact: ['Contact at {loc}, rotating', 'Enemy spotted {loc}', 'One at {loc}, engaging', 'Contact {loc} — need backup'],
  rotate: ['Rotating to {site}', 'Flanking through {lane}', 'Pushing {site} now'],
  plant: ['Planting at {site}', 'Bomb down at {site}, hold it'],
  lowhp: ['I\'m hit, falling back', 'Low health, need cover'],
  kill: ['{victim} down', 'Got {victim} at {loc}'],
  round: ['Go go go, executing {site}', 'Hold sites, they\'re coming'],
};
const LOCS = ['Water Tower', 'Boxcar Row', 'Mid Crane', 'Pump House', 'North Rail', 'South Rail', 'Container Stack'];
const LANES = ['North Rail', 'South Rail', 'Mid Crane'];

export function locName(x, z) {
  if (x < -14 && z < -8) return 'Water Tower';
  if (x > 12 && z > 6) return 'Boxcar Row';
  if (Math.abs(x) < 10 && Math.abs(z) < 10) return 'Mid Crane';
  if (x < -14) return 'Pump House';
  if (z < -12) return 'North Rail';
  if (z > 12) return 'South Rail';
  return 'Container Stack';
}

export class Bot {
  constructor(opts, world) {
    this.world = world; // {colliders, waypoints, sites, bots, player, events}
    this.char = buildBot(opts);
    this.name = opts.name; this.team = opts.team;
    this.pos = new THREE.Vector3(opts.x, 0, opts.z);
    this.yaw = opts.yaw ?? 0;
    this.hp = 100; this.alive = true;
    this.speed = 3.4;
    this.route = []; this.routeI = 0;
    this.state = 'advance';
    this.reactT = 0; this.burstN = 0; this.burstT = 0; this.coolT = 0;
    this.target = null; this.holdT = 0; this.plantT = 0; this.defuseT = 0;
    this.hasBomb = false; this.crouching = false;
    this.radioCd = 4 + Math.random() * 4;
    this.char.root.position.copy(this.pos);
    this.char.root.rotation.y = this.yaw;
    this.char.update(0, 0);
  }
  say(kind, extra = {}) {
    const line = pick(RADIO[kind]).replace('{loc}', locName(this.pos.x, this.pos.z))
      .replace('{site}', extra.site || 'Site ' + (Math.random() < .5 ? 'A' : 'B'))
      .replace('{lane}', pick(LANES)).replace('{victim}', extra.victim || 'enemy');
    this.world.events.radio(this.name, line);
    this.world.events.audioRadio();
  }
  setRoute(points) { this.route = points; this.routeI = 0; }
  pickRouteTo(tx, tz, flank) {
    // route via waypoints: nearest node -> a couple of intermediate nodes -> target
    const wps = this.world.waypoints;
    const near = (x, z) => wps.reduce((a, b) => {
      const da = (a[0] - x) ** 2 + (a[1] - z) ** 2, db = (b[0] - x) ** 2 + (b[1] - z) ** 2;
      return da < db ? a : b;
    });
    const start = near(this.pos.x, this.pos.z);
    const end = near(tx, tz);
    const mid = flank ? (tz < 0 ? [6, -18] : [6, 18]) : [0, 0];
    const pts = [[start[0], start[1]]];
    if (Math.abs(mid[0] - start[0]) + Math.abs(mid[1] - start[1]) > 4) pts.push(mid);
    pts.push([end[0], end[1]], [tx, tz]);
    this.setRoute(pts);
  }
  losTo(p) {
    const o = { x: this.pos.x, y: 1.5, z: this.pos.z };
    const dx = p.x - o.x, dy = (p.y ?? 1.3) - o.y, dz = p.z - o.z;
    const len = Math.hypot(dx, dy, dz);
    const hit = rayBoxes(o.x, o.y, o.z, dx / len, dy / len, dz / len, this.world.colliders, len);
    return !hit;
  }
  nearestEnemy() {
    let best = null, bd = 1e9;
    const consider = (e, isPlayer) => {
      if (!e.alive) return;
      const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      if (d < bd && d < 46) { bd = d; best = { e, d, isPlayer }; }
    };
    for (const b of this.world.bots) if (b.team !== this.team) consider(b, false);
    const pl = this.world.player;
    if (pl && pl.team !== this.team) consider(pl, true);
    return best;
  }
  damage(amount, from, isHead) {
    if (!this.alive) return;
    this.hp -= amount;
    this.char.hit();
    if (this.hp <= 0) {
      this.hp = 0; this.alive = false;
      this.char.die();
      this.world.events.kill(from, this, isHead);
    } else if (this.hp < 35 && Math.random() < .5) {
      this.crouching = true; this.char.setCrouch(1);
      this.say('lowhp');
    }
  }
  update(dt, t) {
    if (!this.alive) return;
    this.radioCd -= dt;
    // --- acquire target
    const vis = this.nearestEnemy();
    let engaging = false;
    if (vis && this.losTo({ x: vis.e.pos.x, y: 1.3, z: vis.e.pos.z })) {
      engaging = true;
      this.target = vis;
      // face target
      const want = Math.atan2(-(vis.e.pos.x - this.pos.x), -(vis.e.pos.z - this.pos.z));
      let dy = want - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += clamp(dy, -dt * 6, dt * 6);
      if (this.reactT <= 0 && this.coolT <= 0) { this.reactT = rand(.25, .6); }
      if (this.reactT > 0) {
        this.reactT -= dt;
        if (this.reactT <= 0) { this.burstN = 3 + ((Math.random() * 3) | 0); this.burstT = 0; if (this.radioCd <= 0) { this.say('contact'); this.radioCd = 9 + Math.random() * 6; } }
      } else if (this.burstN > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0) {
          this.burstT = .11; this.burstN--;
          this.world.events.botShoot(this, vis);
          if (this.burstN === 0) this.coolT = rand(.5, 1.1);
        }
      } else if (this.coolT > 0) this.coolT -= dt;
      // hold position while engaging (strafe a bit)
      if (Math.random() < dt * .3) this.holdT = rand(.4, 1);
      if (this.holdT > 0) { this.holdT -= dt; }
      else if (vis.d > 14) this.moveToward(vis.e.pos.x, vis.e.pos.z, dt, .7);
      else if (vis.d < 4) this.moveToward(this.pos.x * 2 - vis.e.pos.x, this.pos.z * 2 - vis.e.pos.z, dt, .5);
    } else {
      this.target = null;
      // --- objective behavior
      if (this.state === 'plant' && this.hasBomb) {
        const s = this.world.sites[this.world.attackSite];
        const d = Math.hypot(s.x - this.pos.x, s.z - this.pos.z);
        if (d < 3.5) {
          this.plantT += dt;
          if (this.plantT > .1 && this.plantT < .15) this.say('plant', { site: 'Site ' + this.world.attackSite });
          if (this.plantT >= 3) {
            this.world.events.planted(this);
            this.state = 'defend'; this.hasBomb = false;
          }
        } else this.moveRoute(dt);
      } else if (this.state === 'defuse') {
        const s = this.world.sites[this.world.bombSite];
        const d = Math.hypot(s.x - this.pos.x, s.z - this.pos.z);
        if (d < 3) {
          this.defuseT += dt;
          if (this.defuseT >= 5) this.world.events.defused(this);
        } else this.moveRoute(dt);
      } else {
        this.moveRoute(dt);
      }
      // re-path if route done
      if (this.routeI >= this.route.length) {
        const s = this.team === this.world.attackTeam ? this.world.sites[this.world.attackSite] : this.world.sites[this.world.defendSite || (Math.random() < .5 ? 'A' : 'B')];
        this.pickRouteTo(s.x + rand(-2, 2), s.z + rand(-2, 2), Math.random() < .3);
      }
    }
    // crouch when holding behind cover and low hp
    this.char.setCrouch(this.crouching ? 1 : 0);
    // apply motion
    this.char.root.position.set(this.pos.x, 0, this.pos.z);
    this.char.root.rotation.y = this.yaw;
    this.char.walkSpeed = this.moving ? 1 : 0;
    this.char.update(dt, t);
  }
  moveToward(tx, tz, dt, mul = 1) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const len = Math.hypot(dx, dz);
    if (len < .2) return;
    const sp = this.speed * mul * (this.crouching ? .5 : 1);
    this.pos.x += (dx / len) * sp * dt;
    this.pos.z += (dz / len) * sp * dt;
    collideCircle(this.world.colliders, this.pos, .45, 0, 1.8);
    this.moving = true;
    const want = Math.atan2(-dx, -dz);
    let dy = want - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += clamp(dy, -dt * 5, dt * 5);
  }
  moveRoute(dt) {
    if (this.routeI >= this.route.length) { this.moving = false; return; }
    const [tx, tz] = this.route[this.routeI];
    const d = Math.hypot(tx - this.pos.x, tz - this.pos.z);
    if (d < 1.2) { this.routeI++; return; }
    this.moveToward(tx, tz, dt, 1);
  }
}
