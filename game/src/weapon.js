// First-person viewmodels: THREE weapons, each a full assembly —
// LONGSHOT AR (rifle), HORNET SMG (short, suppressed, wire stock),
// WREN-9 (pistol, one-handed). Hands have curled fingers that wrap the grip;
// the stock is slim with a visible gap + buffer tube; reload is staged
// (mag out -> mag in -> charging handle). Metal is worn (scratch texture).
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
function wornMetalTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4a4d55'; g.fillRect(0, 0, 256, 256);
  // scratches: light thin lines + edge wear
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(210,210,200,${.12 + Math.random() * .25})`;
    g.lineWidth = .8 + Math.random() * 1.2;
    const x = Math.random() * 256, y = Math.random() * 256, l = 6 + Math.random() * 30, a = Math.random() * Math.PI;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(20,18,16,${.1 + Math.random() * .2})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 8, 2 + Math.random() * 8);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function buildViewmodel(camera) {
  // PBR: MeshPhysicalMaterial — clearcoat sheen on painted metal + polymer so
  // the guns read as metal/wood under the dusk IBL instead of flat black.
  const camo = new THREE.MeshPhysicalMaterial({ map: camoTex(), roughness: .5, metalness: .25, clearcoat: .15, clearcoatRoughness: .6, envMapIntensity: .7 });
  const gunmetal = new THREE.MeshPhysicalMaterial({ map: wornMetalTex(), roughness: .38, metalness: .85, clearcoat: .35, clearcoatRoughness: .35, envMapIntensity: 1.1 });
  const gunDark = new THREE.MeshPhysicalMaterial({ color: 0x2a2e33, roughness: .45, metalness: .7, clearcoat: .2, clearcoatRoughness: .4, envMapIntensity: .9 });
  const polymer = new THREE.MeshPhysicalMaterial({ color: 0x8a6a42, roughness: .55, metalness: .05, clearcoat: .3, clearcoatRoughness: .5, envMapIntensity: .7 });
  // stock wood: darker walnut so the stock reads as a separate part from the
  // tan glove and the camo handguard (they blended at 0x8a6a42).
  const walnut = new THREE.MeshPhysicalMaterial({ color: 0x5e3d22, roughness: .5, metalness: .05, clearcoat: .35, clearcoatRoughness: .45, envMapIntensity: .7 });
  const glove = new THREE.MeshStandardMaterial({ color: 0x7a6a4a, roughness: .95, envMapIntensity: .15 });
  const gloveDark = new THREE.MeshStandardMaterial({ color: 0x4a3e2c, roughness: .95, envMapIntensity: .15 });
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xd8b04a, roughness: .25, metalness: 1, envMapIntensity: 1.2 });

  // v8 (user 00:49 WIB): v7 MASIH terlalu depan — tarik LEBIH jauh lagi:
  // x .40->.42, y -.30->-.34 (lebih banyak senapan jatuh di bawah tepi
  // bawah frame), scale .50->.45. Laras Kilnyard cuma sampai ~setengah
  // frame, tipis, tidak mendominasi. ADS offset dihitung ulang (posisi ADS
  // tetap sama).
  const vm = new THREE.Group();
  vm.position.set(.42, -.34, -.55);
  vm.rotation.y = -.06;
  vm.scale.setScalar(.45);
  camera.add(vm);
  const vmLight = new THREE.PointLight(0xffe0b0, 1.9, 5, 1.6);
  vmLight.position.set(.35, .0, -.4);
  camera.add(vmLight);

  // ---- gloved hands: ROUNDED fingers (cylinder segments + sphere tips),
  // darker tactical glove so the hand reads as a glove, not a cream block.
  // Fingers curl around the grip: joint -curl, finger -0.5 (forward, -z).
  function finger(len1, len2, r, curl) {
    const g = new THREE.Group();
    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .9, len1, 8), glove);
    s1.position.y = -len1 / 2; g.add(s1);
    const j = new THREE.Group(); j.position.y = -len1; j.rotation.x = -curl; g.add(j);
    const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * .9, r * .8, len2, 8), gloveDark);
    s2.position.y = -len2 / 2; j.add(s2);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(r * .8, 8, 6), gloveDark);
    tip.position.y = -len2; j.add(tip);
    return g;
  }
  // tilt = finger base tilt (rad, -x). Wrap hands need fingers near-vertical
  // with a SMALL curl so tips bend OVER the top (big curl bends them down).
  function hand(isRight, curl, len1 = .04, len2 = .03, tilt = -.5) {
    const h = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(.085, .1, .045), glove);
    palm.castShadow = true; h.add(palm);
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(.08, .03, .04), gloveDark);
    knuckle.position.y = -.055; h.add(knuckle);
    for (let i = 0; i < 4; i++) {
      const f = finger(len1, len2, .02, curl);
      f.position.set(-.039 + i * .026, -.07, -.008);
      f.rotation.x = tilt - (i === 1 ? .12 : 0);
      h.add(f);
    }
    const thumb = finger(.035, .03, .02, curl * .8);
    thumb.position.set(isRight ? -.05 : .05, -.02, .015);
    thumb.rotation.z = isRight ? .7 : -.7; thumb.rotation.x = -.3;
    h.add(thumb);
    return h;
  }
  // Support hand = ONE grip shape (palm + thick torus band wrapping the
  // handguard from below, over the top, ending on the far side).
  function wrapHand(isRight) {
    const h = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(.085, .1, .045), glove);
    palm.castShadow = true; h.add(palm);
    const knuckle = new THREE.Mesh(new THREE.BoxGeometry(.08, .03, .04), gloveDark);
    knuckle.position.y = -.055; h.add(knuckle);
    // Grip band: torus arc around the handguard centre (hand-local (0,.06,-.02)).
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(.065, .032, 10, 24, 4.6), gloveDark);
    band.position.set(0, .06, -.02);
    band.rotation.z = -Math.PI / 2;
    h.add(band);
    const thumb = finger(.035, .03, .02, .56);
    thumb.position.set(isRight ? -.05 : .05, -.02, .015);
    thumb.rotation.z = isRight ? .7 : -.7; thumb.rotation.x = -.3;
    h.add(thumb);
    return h;
  }
  // SOCKETS (spec 00:51 WIB): gripPoint (right hand), supportPoint (left
  // hand), muzzlePoint, ejectPoint. Hands sit EXACTLY on the sockets
  // (hand.position.copy(socket.position)) and follow them through
  // recoil/reload/switch (both are children of the gun group).
  function addSockets(gun, pts) {
    const out = {};
    for (const [k, p] of Object.entries(pts)) {
      const o = new THREE.Object3D(); o.position.set(p[0], p[1], p[2]);
      gun.add(o); out[k] = o;
    }
    return out;
  }
  function makeFlash() {
    const m = new THREE.MeshBasicMaterial({ map: flashTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(.22, .22), m);
    f.visible = false; return f;
  }
  function makeFlashLight() {
    const l = new THREE.PointLight(0xffc060, 0, 9, 2); return l;
  }

  // ---- LONGSHOT AR (rifle): slim stock + gap + buffer tube, rail, scope
  function buildAR() {
    const gun = new THREE.Group(); gun.rotation.x = .06;
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(.075, .12, .5), gunmetal);
    receiver.position.set(0, 0, -.1); receiver.castShadow = true; gun.add(receiver);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, .46), gunDark);
    upper.position.set(0, .08, -.1); gun.add(upper);
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
    for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(.005, .03, .05), gunDark);
      vent.position.set(sx * .036, .02, -.36 - i * .06); gun.add(vent);
    }
    const mag = new THREE.Mesh(taperedBox(.055, .04, .04, .028, .22), polymer);
    mag.position.set(0, -.16, -.05); mag.rotation.x = .1; gun.add(mag);
    const magBase = new THREE.Mesh(new THREE.BoxGeometry(.06, .03, .045), gunDark);
    magBase.position.set(0, -.27, -.03); magBase.rotation.x = .1; gun.add(magBase);
    // STOCK — rebuilt as SEPARATE parts, all horizontal along Z (BoxGeometry
    // d = length), so the profile is unambiguous: slim body, slimmer toe,
    // cheek riser on top, butt pad capping the rear. NO taperedBox here.
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .1, 8), gunDark);
    tube.rotation.x = Math.PI / 2; tube.position.set(0, -.01, .19); gun.add(tube);
    const stockBody = new THREE.Mesh(new THREE.BoxGeometry(.05, .075, .22), walnut);
    stockBody.position.set(0, -.01, .36); stockBody.castShadow = true; gun.add(stockBody);
    const stockToe = new THREE.Mesh(new THREE.BoxGeometry(.045, .05, .06), walnut);
    stockToe.position.set(0, -.03, .47); gun.add(stockToe);
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(.045, .03, .16), camo);
    cheek.position.set(0, .045, .36); gun.add(cheek);
    const buttPad = new THREE.Mesh(new THREE.BoxGeometry(.055, .105, .028), gunDark);
    buttPad.position.set(0, -.01, .485); gun.add(buttPad);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(.05, .13, .06), polymer);
    grip.position.set(0, -.13, .14); grip.rotation.x = .35; gun.add(grip);
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(.012, .04, .012), gunDark);
    trigger.position.set(0, -.1, .06); gun.add(trigger);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(.05, .015, .1), gunDark);
    guard.position.set(0, -.13, .05); gun.add(guard);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .05, 6), gunDark);
    post.position.set(0, .14, -.68); gun.add(post);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.03, .006, 6, 14), gunDark);
    ring.position.set(0, .135, -.68); gun.add(ring);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(.05, .04, .03), gunDark);
    rear.position.set(0, .13, .06); gun.add(rear);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(.09, .02, .03), gunDark);
    ch.position.set(0, .07, .1); gun.add(ch);
    const port = new THREE.Mesh(new THREE.BoxGeometry(.005, .04, .12), gunDark);
    port.position.set(.038, .03, -.12); gun.add(port);
    const fgrip = new THREE.Mesh(new THREE.BoxGeometry(.045, .12, .05), polymer);
    fgrip.position.set(0, -.1, -.42); fgrip.rotation.x = .12; gun.add(fgrip);
    const flash = makeFlash(); flash.position.set(0, .02, -.85); gun.add(flash);
    const flashLight = makeFlashLight(); flashLight.position.set(0, .1, -.8); gun.add(flashLight);
    // Sockets (spec 00:51 WIB): hands attach EXACTLY here.
    const socks = addSockets(gun, {
      gripPoint: [0, -.13, .14], supportPoint: [0, -.05, -.46],
      muzzlePoint: [0, .02, -.82], ejectPoint: [.04, .03, -.12],
    });
    const handR = hand(true, 1.2); handR.scale.setScalar(1.6);
    handR.position.copy(socks.gripPoint.position); handR.rotation.set(.35, 0, 0); gun.add(handR);
    // Support hand = ONE grip shape (wrapHand, v8): palm + a thick curved
    // band that wraps the handguard cross-section, band end on the FAR side.
    const handL = wrapHand(false); handL.scale.setScalar(1.35);
    handL.position.copy(socks.supportPoint.position); handL.rotation.set(0, 0, 0); gun.add(handL);
    return { group: gun, flash, flashLight, mag, magHome: mag.position.clone(), ch, chHome: ch.position.clone(), handL, handR, socks, portPos: new THREE.Vector3(.32, -.28, -.6), ads: { x: -.48, y: .23, z: -.12 } };
  }

  // ---- HORNET SMG: short receiver, suppressor, wire stock, long mag, red dot
  function buildSMG() {
    const gun = new THREE.Group(); gun.rotation.x = .05;
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(.07, .11, .3), gunmetal);
    receiver.position.set(0, 0, -.05); receiver.castShadow = true; gun.add(receiver);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.045, .02, .26), gunDark);
    rail.position.set(0, .1, -.05); gun.add(rail);
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .05, 8), gunDark);
    dot.rotation.x = Math.PI / 2; dot.position.set(0, .13, .02); gun.add(dot);
    const dotGlass = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .052, 8), new THREE.MeshBasicMaterial({ color: 0xff2a22 }));
    dotGlass.rotation.x = Math.PI / 2; dotGlass.position.set(0, .13, .02); gun.add(dotGlass);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .16, 8), gunmetal);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, .02, -.28); gun.add(barrel);
    const supp = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .2, 10), gunDark);
    supp.rotation.x = Math.PI / 2; supp.position.set(0, .02, -.44); gun.add(supp);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(.065, .08, .2), camo);
    handguard.position.set(0, .01, -.2); gun.add(handguard);
    const mag = new THREE.Mesh(taperedBox(.05, .035, .035, .025, .3), polymer);
    mag.position.set(0, -.2, -.02); mag.rotation.x = .08; gun.add(mag);
    // wire stock: two thin rods + butt plate
    for (const sx of [-1, 1]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .22, 6), gunDark);
      rod.rotation.x = Math.PI / 2; rod.position.set(sx * .02, -.01, .28); gun.add(rod);
    }
    const butt = new THREE.Mesh(new THREE.BoxGeometry(.06, .09, .025), gunDark);
    butt.position.set(0, -.01, .4); gun.add(butt);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(.05, .12, .055), polymer);
    grip.position.set(0, -.12, .08); grip.rotation.x = .3; gun.add(grip);
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(.012, .035, .012), gunDark);
    trigger.position.set(0, -.09, .02); gun.add(trigger);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(.07, .018, .025), gunDark);
    ch.position.set(0, .06, .06); gun.add(ch);
    const vgrip = new THREE.Mesh(new THREE.BoxGeometry(.04, .11, .045), polymer);
    vgrip.position.set(0, -.09, -.24); vgrip.rotation.x = .1; gun.add(vgrip);
    const flash = makeFlash(); flash.scale.setScalar(.8); flash.position.set(0, .02, -.56); gun.add(flash);
    const flashLight = makeFlashLight(); flashLight.position.set(0, .1, -.5); gun.add(flashLight);
    const socks = addSockets(gun, {
      gripPoint: [0, -.12, .08], supportPoint: [0, -.06, -.24],
      muzzlePoint: [0, .02, -.54], ejectPoint: [.04, 0, -.05],
    });
    const handR = hand(true, .95); handR.scale.setScalar(1.3);
    handR.position.copy(socks.gripPoint.position); handR.rotation.set(.3, 0, 0); gun.add(handR);
    const handL = hand(false, .95); handL.scale.setScalar(1.3);
    handL.position.copy(socks.supportPoint.position); handL.rotation.set(.6, 0, 0); gun.add(handL);
    return { group: gun, flash, flashLight, mag, magHome: mag.position.clone(), ch, chHome: ch.position.clone(), handL, handR, socks, portPos: new THREE.Vector3(.3, -.26, -.4), ads: { x: -.46, y: .22, z: -.1 } };
  }

  // ---- WREN-9 pistol: slide, frame, short barrel, one hand + support hand
  function buildPistol() {
    const gun = new THREE.Group(); gun.rotation.x = .04;
    const slide = new THREE.Mesh(new THREE.BoxGeometry(.05, .055, .24), gunmetal);
    slide.position.set(0, .03, -.12); slide.castShadow = true; gun.add(slide);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(.045, .05, .2), gunDark);
    frame.position.set(0, -.01, -.08); gun.add(frame);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .1, 8), gunmetal);
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, .03, -.26); gun.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(.048, .14, .06), polymer);
    grip.position.set(0, -.1, .06); grip.rotation.x = .28; gun.add(grip);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(.04, .12, .045), gunDark);
    mag.position.set(0, -.16, .07); mag.rotation.x = .28; gun.add(mag);
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(.01, .03, .01), gunDark);
    trigger.position.set(0, -.06, -.02); gun.add(trigger);
    const front = new THREE.Mesh(new THREE.BoxGeometry(.008, .02, .008), gunDark);
    front.position.set(0, .07, -.22); gun.add(front);
    const rear = new THREE.Mesh(new THREE.BoxGeometry(.04, .02, .015), gunDark);
    rear.position.set(0, .07, -.02); gun.add(rear);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(.06, .015, .02), gunDark);
    ch.position.set(0, .05, -.04); gun.add(ch);
    const flash = makeFlash(); flash.scale.setScalar(.7); flash.position.set(0, .03, -.32); gun.add(flash);
    const flashLight = makeFlashLight(); flashLight.position.set(0, .08, -.3); gun.add(flashLight);
    const socks = addSockets(gun, {
      gripPoint: [0, -.1, .06], supportPoint: [0, -.19, .04],
      muzzlePoint: [0, .03, -.31], ejectPoint: [.03, .03, -.12],
    });
    const handR = hand(true, 1.1); handR.scale.setScalar(1.3);
    handR.position.copy(socks.gripPoint.position); handR.rotation.set(.28, 0, 0); gun.add(handR);
    // support hand cupped under the right hand
    const handL = hand(false, 1.1); handL.scale.setScalar(1.25);
    handL.position.copy(socks.supportPoint.position); handL.rotation.set(1.1, 0, 0); gun.add(handL);
    return { group: gun, flash, flashLight, mag, magHome: mag.position.clone(), ch, chHome: ch.position.clone(), handL, handR, socks, portPos: new THREE.Vector3(.28, -.24, -.3), ads: { x: -.43, y: .21, z: -.08 } };
  }

  const guns = { ar: buildAR(), smg: buildSMG(), pistol: buildPistol() };
  for (const [k, g] of Object.entries(guns)) { g.group.visible = k === 'ar'; vm.add(g.group); }
  let cur = guns.ar;

  // ---- shell casings pool (eject right, in camera space)
  const casings = [];
  const caseGeo = new THREE.BoxGeometry(.012, .012, .03);
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Mesh(caseGeo, brass);
    c.visible = false; vm.add(c); casings.push({ m: c, vel: new THREE.Vector3(), life: 0 });
  }

  const state = {
    group: vm, gun: cur.group, flash: cur.flash, flashLight: cur.flashLight,
    socks: cur.socks, handL: cur.handL, handR: cur.handR,
    recoil: 0, swayX: 0, swayY: 0, bobT: 0, ads: 0, reloadT: 0, flashFrames: 0,
    basePos: vm.position.clone(),
    setWeapon(key) {
      if (!guns[key] || guns[key] === cur) return;
      cur.group.visible = false;
      cur = guns[key];
      cur.group.visible = true;
      this.gun = cur.group; this.flash = cur.flash; this.flashLight = cur.flashLight;
      this.socks = cur.socks; this.handL = cur.handL; this.handR = cur.handR;
      this.reloadT = 0;
    },
    fire() {
      this.recoil = 1; this.flashFrames = 1;
      cur.flash.visible = true; cur.flash.rotation.z = Math.random() * Math.PI;
      cur.flash.scale.setScalar(.6 + Math.random() * .3);
      cur.flashLight.intensity = 10;
      const c = casings.find(c => c.life <= 0);
      if (c) {
        c.m.visible = true; c.life = 1.1;
        c.m.position.copy(cur.portPos);
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
      if (this.flashFrames > 0) { this.flashFrames--; if (this.flashFrames <= 0) { cur.flash.visible = false; cur.flashLight.intensity = 0; } }
      if (this.reloadT > 0) {
        this.reloadT -= dt;
        const p = 1 - Math.max(0, this.reloadT) / 1.5; // 0..1
        const dip = Math.sin(p * Math.PI);
        cur.group.rotation.x = .06 + dip * .6; cur.group.position.y = -dip * .14; cur.group.rotation.z = dip * .3;
        // LEFT HAND FOLLOWS THE MAGAZINE during reload (spec 00:51 WIB):
        // grips the dropping mag (p<.35), rides the new mag up (.35-.7),
        // returns to the supportPoint (.7+). k=0 at support, 1 on the mag.
        const k = p < .35 ? p / .35 : p < .7 ? 1 : 1 - (p - .7) / .3;
        cur.handL.position.set(
          cur.socks.supportPoint.position.x * (1 - k) + (cur.mag.position.x) * k,
          cur.socks.supportPoint.position.y * (1 - k) + (cur.mag.position.y - .03) * k,
          cur.socks.supportPoint.position.z * (1 - k) + (cur.mag.position.z) * k);
        // staged: mag drops out (p<.35) -> new mag rises (.35-.7) -> charging handle (.7+)
        if (p < .35) {
          const k = p / .35;
          cur.mag.position.set(cur.magHome.x, cur.magHome.y - k * .24, cur.magHome.z + k * .06);
          cur.mag.rotation.x = .1 + k * .5;
        } else if (p < .7) {
          const k = (p - .35) / .35;
          cur.mag.position.set(cur.magHome.x, cur.magHome.y - .24 + k * .24, cur.magHome.z + .06 - k * .06);
          cur.mag.rotation.x = .6 - k * .5;
        } else {
          cur.mag.position.copy(cur.magHome); cur.mag.rotation.x = .1;
          const k = (p - .7) / .3;
          cur.ch.position.z = cur.chHome.z + Math.sin(k * Math.PI) * .06;
        }
        if (this.reloadT <= 0) {
          cur.group.rotation.set(.06, 0, 0); cur.group.position.y = 0;
          cur.mag.position.copy(cur.magHome); cur.mag.rotation.x = .1;
          cur.ch.position.copy(cur.chHome);
          cur.handL.position.copy(cur.socks.supportPoint.position);
        }
      } else {
        cur.group.rotation.x = .06 + this.recoil * .14;
        cur.group.position.z = this.recoil * .05;
      }
      const a = this.ads, ao = cur.ads;
      vm.position.set(
        this.basePos.x + bobX + this.swayX + a * ao.x,
        this.basePos.y + bobY + this.swayY + a * ao.y,
        this.basePos.z + this.recoil * .03 + a * ao.z);
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
