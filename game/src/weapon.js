// First-person viewmodel: multi-part rifle + gloved hands with SEPARATE fingers.
// Every finger is 2 segments with visible gaps; stock is a tapered prism, not a box.
import * as THREE from '../vendor/three/three.module.min.js';
import { taperedBox } from './geom.js';
import { camoTex } from './textures.js';

function flashTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(.35, 'rgba(255,200,80,.9)');
  gr.addColorStop(.7, 'rgba(255,120,30,.35)'); gr.addColorStop(1, 'rgba(255,100,20,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,240,180,.95)';
  for (let i = 0; i < 4; i++) {
    g.save(); g.translate(64, 64); g.rotate(i * Math.PI / 2 + .4);
    g.beginPath(); g.moveTo(0, -6); g.lineTo(58, 0); g.lineTo(0, 6); g.fill(); g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildViewmodel(camera) {
  const camo = new THREE.MeshStandardMaterial({ map: camoTex(), roughness: .55, metalness: .25 });
  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x3d4048, roughness: .42, metalness: .7 });
  const gunDark = new THREE.MeshStandardMaterial({ color: 0x232529, roughness: .5, metalness: .6 });
  // warm mid-brown furniture (was near-black 0x38302a: read as one flat black box in dusk)
  const polymer = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: .7, metalness: .05 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x9c8a62, roughness: .95 });
  const gloveDark = new THREE.MeshStandardMaterial({ color: 0x6e6046, roughness: .95 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc8a03a, roughness: .3, metalness: .9 });

  const vm = new THREE.Group();
  vm.position.set(.25, -.22, -.77);
  vm.rotation.y = -.06;
  vm.scale.setScalar(.68);
  camera.add(vm);
  // warm fill light so the viewmodel reads in dusk (camera-attached, short range)
  const vmLight = new THREE.PointLight(0xffe0b0, 1.9, 5, 1.6);
  vmLight.position.set(.3, .35, -.25);
  camera.add(vmLight);
  // gun tilted slightly: stock rises into frame, muzzle dips a touch
  const gun = new THREE.Group(); gun.rotation.x = .06; vm.add(gun);

  // ---- rifle (built along -Z, barrel forward)
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(.075, .12, .5), gunmetal);
  receiver.position.set(0, 0, -.1); receiver.castShadow = true; gun.add(receiver);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, .46), gunDark);
  upper.position.set(0, .08, -.1); gun.add(upper);
  // rail on top with slots
  const rail = new THREE.Mesh(new THREE.BoxGeometry(.05, .025, .44), gunDark);
  rail.position.set(0, .115, -.12); gun.add(rail);
  for (let i = 0; i < 8; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(.052, .028, .02), polymer);
    slot.position.set(0, .115, -.32 + i * .05); gun.add(slot);
  }
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .42, 10), gunmetal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, .02, -.55); gun.add(barrel);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, .07, 10), gunDark);
  muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, .02, -.78); gun.add(muzzle);
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(.07, .09, .34), camo);
  handguard.position.set(0, .01, -.48); handguard.castShadow = true; gun.add(handguard);
  // handguard vents
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(.005, .03, .05), gunDark);
    vent.position.set(sx * .036, .02, -.36 - i * .06); gun.add(vent);
  }
  const mag = new THREE.Mesh(taperedBox(.055, .04, .04, .028, .22), polymer);
  mag.position.set(0, -.16, -.05); mag.rotation.x = .1; gun.add(mag);
  const magBase = new THREE.Mesh(new THREE.BoxGeometry(.06, .03, .045), gunDark);
  magBase.position.set(0, -.27, -.03); magBase.rotation.x = .1; gun.add(magBase);
  // TAPERED stock: wide butt (.11 tall) -> narrow at receiver, + cheek riser + butt pad
  const stock = new THREE.Mesh(taperedBox(.055, .11, .04, .07, .3), polymer);
  stock.position.set(0, -.01, .3); stock.rotation.x = -.04; gun.add(stock);
  const cheek = new THREE.Mesh(new THREE.BoxGeometry(.05, .04, .16), camo);
  cheek.position.set(0, .055, .3); gun.add(cheek);
  const buttPad = new THREE.Mesh(new THREE.BoxGeometry(.06, .12, .03), gunDark);
  buttPad.position.set(0, -.01, .46); gun.add(buttPad);
  // grip (angled)
  const grip = new THREE.Mesh(new THREE.BoxGeometry(.05, .13, .06), polymer);
  grip.position.set(0, -.13, .14); grip.rotation.x = .35; gun.add(grip);
  // trigger + guard
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(.012, .04, .012), gunDark);
  trigger.position.set(0, -.1, .06); gun.add(trigger);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(.05, .015, .1), gunDark);
  guard.position.set(0, -.13, .05); gun.add(guard);
  // front sight post + ring, rear sight aperture
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .05, 6), gunDark);
  post.position.set(0, .14, -.68); gun.add(post);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.03, .006, 6, 14), gunDark);
  ring.position.set(0, .135, -.68); gun.add(ring);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(.05, .04, .03), gunDark);
  rear.position.set(0, .13, .06); gun.add(rear);
  // charging handle + ejection port
  const ch = new THREE.Mesh(new THREE.BoxGeometry(.09, .02, .03), gunDark);
  ch.position.set(0, .07, .1); gun.add(ch);
  const port = new THREE.Mesh(new THREE.BoxGeometry(.005, .04, .12), gunDark);
  port.position.set(.038, .03, -.12); gun.add(port);
  // foregrip (vertical) under handguard
  const fgrip = new THREE.Mesh(new THREE.BoxGeometry(.045, .12, .05), polymer);
  fgrip.position.set(0, -.1, -.42); fgrip.rotation.x = .12; gun.add(fgrip);

  // ---- muzzle flash (plane + light at barrel tip)
  const flashMat = new THREE.MeshBasicMaterial({ map: flashTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(.34, .34), flashMat);
  flash.position.set(0, .02, -.85); flash.visible = false; gun.add(flash);
  const flashLight = new THREE.PointLight(0xffc060, 0, 9, 2);
  flashLight.position.set(0, .1, -.8); gun.add(flashLight);

  // ---- gloved hands with SEPARATE fingers (each finger 2 segments, gaps visible)
  function finger(len1, len2, w) {
    const g = new THREE.Group();
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(w, len1, w), glove);
    s1.position.y = -len1 / 2; g.add(s1);
    const j = new THREE.Group(); j.position.y = -len1; j.rotation.x = -.5; g.add(j);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(w * .9, len2, w * .9), gloveDark);
    s2.position.y = -len2 / 2; j.add(s2);
    return g;
  }
  function hand(isRight) {
    const h = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(.085, .1, .045), glove);
    palm.castShadow = true; h.add(palm);
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(.08, .03, .04), gloveDark);
    knuckle.position.y = -.055; h.add(knuckle);
    // 4 fingers, spaced with real gaps (width .02, spacing .025 — was .016/.021, unreadable at 720p)
    for (let i = 0; i < 4; i++) {
      const f = finger(.05, .04, .02);
      f.position.set(-.0375 + i * .025, -.07, 0);
      f.rotation.x = -.25 - (i === 1 ? .12 : 0);
      h.add(f);
    }
    const thumb = finger(.04, .035, .02);
    thumb.position.set(isRight ? -.05 : .05, -.02, .015);
    thumb.rotation.z = isRight ? .7 : -.7; thumb.rotation.x = -.3;
    h.add(thumb);
    return h;
  }
  // right hand on pistol grip (fingers curled around grip)
  const handR = hand(true);
  handR.scale.setScalar(1.35);
  handR.position.set(0, -.14, .13); handR.rotation.set(.35, 0, 0);
  gun.add(handR);
  // left hand on foregrip (fingers curled under handguard)
  const handL = hand(false);
  handL.scale.setScalar(1.35);
  handL.position.set(0, -.13, -.42); handL.rotation.set(.75, 0, 0);
  gun.add(handL);
  // (no forearm cuffs — free-floating cuffs read as debris; hands end at the wrist)

  // ---- shell casings pool (eject right)
  const casings = [];
  const caseGeo = new THREE.BoxGeometry(.012, .012, .03);
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Mesh(caseGeo, brass);
    c.visible = false; sceneAdd(vm, c); casings.push({ m: c, vel: new THREE.Vector3(), life: 0 });
  }
  function sceneAdd(parent, child) { parent.add(child); }

  const state = {
    group: vm, gun, flash, flashLight, handL, handR,
    recoil: 0, swayX: 0, swayY: 0, bobT: 0, ads: 0, reloadT: 0, flashFrames: 0,
    basePos: vm.position.clone(),
    fire() {
      this.recoil = 1; this.flashFrames = 2;
      flash.visible = true; flash.rotation.z = Math.random() * Math.PI;
      flash.scale.setScalar(.8 + Math.random() * .5);
      flashLight.intensity = 26;
      const c = casings.find(c => c.life <= 0);
      if (c) {
        c.m.visible = true; c.life = 1.1;
        c.m.position.set(.32, -.28, -.6);
        c.vel.set(1.4 + Math.random(), 1.2 + Math.random() * .8, -.4);
        c.m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      }
    },
    startReload() { if (this.reloadT <= 0) this.reloadT = 1.5; },
    update(dt, moveMag, lookDX, lookDY, adsTarget) {
      this.bobT += dt * (4 + moveMag * 7);
      const bobY = Math.sin(this.bobT * 2) * .006 * (0.4 + moveMag);
      const bobX = Math.cos(this.bobT) * .004 * (0.4 + moveMag);
      this.swayX += ((-lookDX * .0012) - this.swayX) * Math.min(1, dt * 10);
      this.swayY += ((lookDY * .0012) - this.swayY) * Math.min(1, dt * 10);
      this.recoil = Math.max(0, this.recoil - dt * 7);
      this.ads += ((adsTarget ? 1 : 0) - this.ads) * Math.min(1, dt * 9);
      if (this.flashFrames > 0) { this.flashFrames--; if (this.flashFrames <= 0) { flash.visible = false; flashLight.intensity = 0; } }
      if (this.reloadT > 0) {
        this.reloadT -= dt;
        const p = 1 - Math.max(0, this.reloadT) / 1.5; // 0..1
        const dip = Math.sin(p * Math.PI);
        gun.rotation.x = .06 + dip * .9; gun.position.y = -dip * .16; gun.rotation.z = dip * .35;
        mag.visible = p < .35 || p > .7;
        if (this.reloadT <= 0) { gun.rotation.set(.06, 0, 0); gun.position.y = 0; mag.visible = true; }
      } else {
        gun.rotation.x = .06 + this.recoil * .14;
        gun.position.z = this.recoil * .05;
      }
      const a = this.ads;
      vm.position.set(
        this.basePos.x + bobX + this.swayX - a * .3,
        this.basePos.y + bobY + this.swayY + a * .09,
        this.basePos.z + this.recoil * .03 - a * .12);
      vm.rotation.y = -.06 + this.swayX * 2;
      vm.rotation.x = this.swayY * 2;
      // casings physics
      for (const c of casings) {
        if (c.life <= 0) continue;
        c.life -= dt;
        c.vel.y -= 9 * dt;
        c.m.position.addScaledVector(c.vel, dt);
        c.m.rotation.x += dt * 9; c.m.rotation.z += dt * 6;
        if (c.m.position.y < -.42) { c.m.position.y = -.42; c.vel.set(0, 0, 0); c.m.rotation.x = Math.PI / 2; }
        if (c.life <= 0) c.m.visible = false;
      }
    },
  };
  return state;
}
