// CINDERLINE YARD — rail yard map. Original design: water tower landmark (Site A),
// boxcar row (Site B), mid container stack + gantry crane, three lanes.
// Static geometry is merged per material (few draw calls); collision AABBs exported.
import * as THREE from '../vendor/three/three.module.min.js';
import { brickTex, cobbleMaps, concreteTex, metalTex, woodTex, hazardTex, stencilTex, graffitiTex, ballastTex, skyTex, puddleTex, stainTex } from './textures.js';
import { mergeGeoms, boxOf } from './geom.js';

export const MAP = { w: 64, d: 48 }; // x: -32..32, z: -24..24

export function buildMap(scene) {
  const colliders = [];
  const wallRects = []; // for minimap {x,z,w,d}
  const parts = { brick: [], brickDark: [], concrete: [], metal: [], metalRust: [], metalBlue: [], metalRed: [], wood: [], woodDark: [], steel: [], steelDark: [], ballast: [], hazard: [] };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
  function add(mat, geo, x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
    E.set(rx, ry, rz); Q.setFromEuler(E); P.set(x, y, z); S.set(sx, sy, sz);
    M.compose(P, Q, S);
    parts[mat].push({ geometry: geo, matrix: M.clone() });
  }
  function box(mat, x, y, z, w, h, d, ry = 0) {
    add(mat, new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, ry);
    colliders.push(boxOf(x, y, z, w, h, d));
    wallRects.push({ x, z, w, d });
  }
  function boxNoCol(mat, x, y, z, w, h, d, ry = 0) { add(mat, new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, ry); }
  function cyl(mat, x, y, z, rT, rB, h, seg = 14, ry = 0) {
    add(mat, new THREE.CylinderGeometry(rT, rB, h, seg), x, y + h / 2, z, ry);
  }
  function cylCol(mat, x, y, z, r, h, seg = 14) {
    add(mat, new THREE.CylinderGeometry(r, r, h, seg), x, y + h / 2, z);
    colliders.push(boxOf(x, y, z, r * 2, h, r * 2));
  }

  // ---- materials
  const brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: .92 });
  brick.map.repeat.set(8, 2);
  const brickDark = new THREE.MeshStandardMaterial({ map: brickTex('#6e3a2a'), roughness: .95 });
  const concrete = new THREE.MeshStandardMaterial({ map: concreteTex(), roughness: .95 });
  const concrete2 = new THREE.MeshStandardMaterial({ map: concreteTex('#7a7268'), roughness: .95 });
  const cm = cobbleMaps();
  const cobble = new THREE.MeshStandardMaterial({ map: cm.map, roughnessMap: cm.rough, bumpMap: cm.map, bumpScale: .02, roughness: 1 });
  cm.map.repeat.set(10, 7); cm.rough.repeat.set(10, 7);
  const ballast = new THREE.MeshStandardMaterial({ map: ballastTex(), roughness: 1 });
  ballast.map.repeat.set(12, 8);
  const metalGreen = new THREE.MeshStandardMaterial({ map: metalTex('#4a5d52'), roughness: .6, metalness: .45 });
  const metalRust = new THREE.MeshStandardMaterial({ map: metalTex('#6e4a34'), roughness: .7, metalness: .35 });
  const metalBlue = new THREE.MeshStandardMaterial({ map: metalTex('#3d5266'), roughness: .6, metalness: .45 });
  const metalRed = new THREE.MeshStandardMaterial({ map: metalTex('#7a3530'), roughness: .65, metalness: .3 });
  const wood = new THREE.MeshStandardMaterial({ map: woodTex(), roughness: .85 });
  const woodDark = new THREE.MeshStandardMaterial({ map: woodTex('#6b4e2e'), roughness: .9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a3f44, roughness: .45, metalness: .8 });
  const steelDark = new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: .55, metalness: .7 });
  const hazard = new THREE.MeshStandardMaterial({ map: hazardTex(), roughness: .8 });
  hazard.map.repeat.set(4, 1);

  // ---- ground: ballast rail bed strips + cobble yard
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP.w, MAP.d), cobble);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const bedN = new THREE.Mesh(new THREE.PlaneGeometry(60, 4.4), ballast);
  bedN.rotation.x = -Math.PI / 2; bedN.position.set(0, .01, -6); bedN.receiveShadow = true; scene.add(bedN);
  const bedS = bedN.clone(); bedS.position.z = 6; scene.add(bedS);
  // puddle + oil-stain decals (reflective water, dark stains)
  const puddleMat = new THREE.MeshPhysicalMaterial({ map: puddleTex(), transparent: true, opacity: .65, roughness: .05, metalness: .1, envMapIntensity: 1.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const stainMat = new THREE.MeshStandardMaterial({ map: stainTex(), transparent: true, roughness: .35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const [x, z, s] of [[6, 2, 3.4], [-14, 8, 2.6], [18, -2, 2.8], [-4, -14, 2.2]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s * .8), puddleMat);
    p.rotation.x = -Math.PI / 2; p.rotation.z = Math.random() * 3; p.position.set(x, .02, z); p.receiveShadow = true; scene.add(p);
  }
  for (const [x, z, s] of [[-8, -12, 2.6], [12, 14, 3.2], [0, -2, 2.2], [24, -10, 2.8]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s * .8), stainMat);
    p.rotation.x = -Math.PI / 2; p.rotation.z = Math.random() * 3; p.position.set(x, .025, z); p.receiveShadow = true; scene.add(p);
  }

  // ---- rails (two lines): sleepers + steel rails
  for (const zc of [-6, 6]) {
    for (let x = -29; x <= 29; x += 1.1) add('wood', new THREE.BoxGeometry(.9, .08, 2.6), x, .04, zc);
    for (const off of [-0.75, 0.75]) add('steel', new THREE.BoxGeometry(58, .14, .12), 0, .1, zc + off);
  }

  // ---- perimeter walls (brick, with gate gaps at spawns)
  box('brick', 0, 0, -24, 64, 5.5, 1);
  box('brick', 0, 0, 24, 64, 5.5, 1);
  box('brick', -32, 0, -14, 1, 5.5, 20); box('brick', -32, 0, 14, 1, 5.5, 20);
  box('brick', 32, 0, -14, 1, 5.5, 20); box('brick', 32, 0, 14, 1, 5.5, 20);
  // gate frames (hazard striped lintels over spawn gates)
  boxNoCol('hazard', -32, 4.6, 0, 1.2, .7, 9);
  boxNoCol('hazard', 32, 4.6, 0, 1.2, .7, 9);
  // wall coping + pillars
  for (let x = -28; x <= 28; x += 8) { boxNoCol('concrete', x, 5.5, -24, 1.4, .5, 1.4); boxNoCol('concrete', x, 5.5, 24, 1.4, .5, 1.4); }
  for (let z = -16; z <= 16; z += 8) { boxNoCol('concrete', -32, 5.5, z, 1.4, .5, 1.4); boxNoCol('concrete', 32, 5.5, z, 1.4, .5, 1.4); }

  // ---- WATER TOWER (Site A landmark) at (-22,-14)
  const tx = -22, tz = -14;
  for (const [lx, lz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) {
    add('steel', new THREE.CylinderGeometry(.16, .2, 7.4, 8), tx + lx, 3.7, tz + lz);
    colliders.push(boxOf(tx + lx, 0, tz + lz, .5, 7.4, .5));
  }
  // cross braces
  for (const ry of [0, Math.PI / 2]) add('steel', new THREE.BoxGeometry(4.9, .18, .18), tx, 3.4, tz, ry);
  for (const ry of [0, Math.PI / 2]) add('steel', new THREE.BoxGeometry(4.9, .18, .18), tx, 5.6, tz, ry);
  cyl('metalRed', tx, 7.2, tz, 3.1, 3.3, 4.6, 20); // tank
  colliders.push(boxOf(tx, 7.2, tz, 6.4, 4.6, 6.4));
  add('metalRust', new THREE.CylinderGeometry(.4, 3.2, 1.6, 20), tx, 12.6, tz); // cone roof
  add('steel', new THREE.CylinderGeometry(.5, .5, .9, 10), tx, 13.6, tz); // vent cap
  // ladder up the tower + side pipe
  for (let y = .4; y < 7; y += .55) add('steel', new THREE.BoxGeometry(.7, .07, .07), tx + 3.35, y, tz);
  add('steel', new THREE.BoxGeometry(.07, 7, .07), tx + 3.05, 3.5, tz);
  add('steel', new THREE.BoxGeometry(.07, 7, .07), tx + 3.65, 3.5, tz);
  cyl('steel', tx - 3.4, 0, tz + 1, .22, .22, 11.5, 10); // downpipe
  // blinking beacon on top (emissive, animated in main)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff2a1a, emissiveIntensity: 2 }));
  beacon.position.set(tx, 14.3, tz); scene.add(beacon);

  // ---- BOXCAR ROW (Site B) at (22,12): three boxcars
  function boxcar(x, z, ry, mat) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(11, 3.4, 3), mat);
    body.position.y = 2.1; body.castShadow = body.receiveShadow = true; g.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(11.2, .28, 3.2), steelDark);
    roof.position.y = 3.9; roof.castShadow = true; g.add(roof);
    for (let i = -4; i <= 4; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(.18, 3.2, 3.06), steelDark);
      rib.position.set(i * 1.2, 2.1, 0); g.add(rib);
    }
    // wheels + underframe
    const under = new THREE.Mesh(new THREE.BoxGeometry(10, .5, 2.2), steelDark);
    under.position.y = .55; g.add(under);
    for (const wx of [-3.6, -2.6, 2.6, 3.6]) for (const wz of [-1.05, 1.05]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .18, 12), steel);
      wh.rotation.x = Math.PI / 2; wh.position.set(wx, .5, wz); g.add(wh);
    }
    // door rails + stencil
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6), new THREE.MeshStandardMaterial({ map: stencilTex('CL-7', '#d8cdb4'), transparent: true, roughness: .8 }));
    door.position.set(0, 2.1, 1.56); g.add(door);
    colliders.push(boxOf(x, 0, z, ry === 0 ? 11 : 3, 4, ry === 0 ? 3 : 11));
    wallRects.push({ x, z, w: ry === 0 ? 11 : 3, d: ry === 0 ? 3 : 11 });
    return g;
  }
  boxcar(20, 14, 0, metalGreen);
  boxcar(20, 18.5, 0, metalBlue);
  boxcar(27, 8, Math.PI / 2, metalRust);

  // ---- MID: container stack + gantry crane
  function container(x, z, ry, bucket, y = 0) {
    add(bucket, new THREE.BoxGeometry(6, 2.6, 2.6), x, y + 1.3, z, ry);
    colliders.push(boxOf(x, y, z, ry === 0 ? 6 : 2.6, 2.6, ry === 0 ? 2.6 : 6));
    wallRects.push({ x, z, w: ry === 0 ? 6 : 2.6, d: ry === 0 ? 2.6 : 6 });
  }
  container(-2, 0, 0, 'metalBlue');
  container(-2, 0, 0, 'metalRust', 2.6);
  container(4, -3, Math.PI / 2, 'metal');
  container(-8, 4, 0, 'metalRed');
  // gantry crane legs + beam over mid
  for (const [cx, cz] of [[-6, -8], [6, -8], [-6, 8], [6, 8]]) {
    add('steel', new THREE.BoxGeometry(.7, 9, .7), cx, 4.5, cz);
    colliders.push(boxOf(cx, 0, cz, .9, 9, .9));
  }
  add('steel', new THREE.BoxGeometry(13.5, .8, 1), 0, 9.2, -8);
  add('steel', new THREE.BoxGeometry(13.5, .8, 1), 0, 9.2, 8);
  add('steel', new THREE.BoxGeometry(1, .8, 17), 0, 9.2, 0);
  // crane cabin + hook block hanging
  add('metal', new THREE.BoxGeometry(2.2, 1.8, 2), 3, 9.6, 0);
  add('steel', new THREE.BoxGeometry(.08, 3.4, .08), 3, 7.4, 2.5);
  add('steel', new THREE.BoxGeometry(.7, .9, .7), 3, 5.4, 2.5);
  // hanging hook block collider not needed (above head)

  // ---- interior structures: pump house (A), office (B), mid shed
  box('brickDark', -26, 0, -19, 8, 4.2, 6);           // pump house A
  box('brickDark', 26, 0, 19, 8, 4.2, 6);            // office B
  box('concrete', -10, 0, 10, 7, 3.6, 5);           // mid shed
  box('concrete', 12, 0, -12, 6, 3.2, 4);           // north block
  box('concrete', -14, 0, -2, 5, 3, 4);             // west block
  box('concrete', 14, 0, 2, 5, 3, 4);               // east block

  // ---- cover: crates (chamfered look via two stacked boxes), barrels, sandbags, pallets
  const crateSpots = [
    [-18, -8, 1.4], [-16.5, -6.5, 1], [-24, -6, 1.2], [-20, -18, 1.6], [-12, -16, 1.2],
    [8, -16, 1.4], [10, -14, 1], [16, -6, 1.5], [18, -2, 1], [6, 8, 1.4], [2, 12, 1],
    [-6, 16, 1.5], [-2, 18, 1], [24, 4, 1.4], [12, 18, 1.2], [-28, 8, 1.2], [28, -8, 1.4],
    [-4, -10, 1.2], [0, -4, 1], [-18, 12, 1.3], [16, 14, 1],
  ];
  for (const [x, z, s] of crateSpots) {
    add('wood', new THREE.BoxGeometry(s, s * .92, s), x, s * .46, z, Math.random() * .6);
    add('woodDark', new THREE.BoxGeometry(s * .86, s * .14, s * .86), x, s * .92, z, Math.random() * .6);
    colliders.push(boxOf(x, 0, z, s, s, s));
  }
  // stacked crates (two high) at key cover points — with stencil labels
  for (const [x, z] of [[-16, -9], [9, -15], [4, 10], [-4, 17]]) {
    add('wood', new THREE.BoxGeometry(1.5, 1.4, 1.5), x, .7, z, .3);
    add('woodDark', new THREE.BoxGeometry(1.3, 1.3, 1.3), x, 2.05, z, .9);
    colliders.push(boxOf(x, 0, z, 1.5, 2.7, 1.5));
    const st = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .55),
      new THREE.MeshStandardMaterial({ map: stencilTex('CL-7', '#2c2118'), transparent: true, roughness: .85 }));
    st.position.set(x, .75, z + .78); st.rotation.y = .3; scene.add(st);
  }
  // barrels
  const barrelSpots = [[-25, -10], [-23, -9], [14, -18], [15, -17], [-8, 18], [26, 12], [10, 4], [-28, -12], [6, -8]];
  for (const [x, z] of barrelSpots) {
    const mat = Math.random() < .5 ? 'metalRust' : 'metalBlue';
    cylCol(mat, x, 0, z, .55, 1.5, 12);
    add('steelDark', new THREE.CylinderGeometry(.57, .57, .08, 12), x, 1.5, z);
  }
  // sandbag walls (rows of rounded small boxes)
  function sandbags(x, z, ry, n = 6) {
    for (let i = 0; i < n; i++) {
      const ox = (i - (n - 1) / 2) * .62;
      const px = x + Math.cos(ry) * ox, pz = z - Math.sin(ry) * ox;
      add('concrete', new THREE.BoxGeometry(.6, .32, .4), px, .16 + (i % 2) * .3, pz, ry + (Math.random() - .5) * .15);
    }
    colliders.push(boxOf(x, 0, z, n * .6, .7, .5));
  }
  sandbags(-10, -12, 0); sandbags(10, 12, 0); sandbags(-2, -16, Math.PI / 2, 5); sandbags(2, 16, Math.PI / 2, 5);
  // pallets
  for (const [x, z] of [[-22, 2], [18, -12], [-6, -18], [24, 18]]) {
    add('woodDark', new THREE.BoxGeometry(1.6, .12, 1.2), x, .06, z, Math.random());
    for (let i = 0; i < 3; i++) add('wood', new THREE.BoxGeometry(1.6, .1, .18), x, .18, z - .4 + i * .4, Math.random() * .1);
  }
  // pipes along north + south walls
  for (const zc of [-23.2, 23.2]) {
    add('steel', new THREE.CylinderGeometry(.22, .22, 56, 10), 0, 3.1, zc, 0, 1, 1, 1, 0, Math.PI / 2);
    add('steelDark', new THREE.CylinderGeometry(.14, .14, 56, 8), 0, 2.7, zc, 0, 1, 1, 1, 0, Math.PI / 2);
  }
  // cable reels
  for (const [x, z] of [[-26, 16], [24, -14]]) {
    cyl('woodDark', x, 0, z, 1, 1, .5, 16);
    add('steelDark', new THREE.CylinderGeometry(1.15, 1.15, .12, 16), x, .56, z);
    add('steelDark', new THREE.CylinderGeometry(1.15, 1.15, .12, 16), x, .06, z);
    colliders.push(boxOf(x, 0, z, 2.3, .7, 2.3));
  }
  // stairs to office roof (B) + catwalk planks
  for (let i = 0; i < 7; i++) add('steel', new THREE.BoxGeometry(1.4, .18, .5), 21.5, .3 + i * .55, 15.2 + i * .55);
  add('wood', new THREE.BoxGeometry(4, .14, 1.4), 18, 4.3, 19);

  // ---- merge static parts per material
  const mats = { brick, brickDark, concrete: concrete2, metal: metalGreen, metalRust, metalBlue, metalRed, wood, woodDark, steel, steelDark, ballast, hazard };
  const merged = {};
  for (const [key, list] of Object.entries(parts)) {
    if (!list.length) continue;
    const g = mergeGeoms(list);
    const m = new THREE.Mesh(g, mats[key] || steel);
    m.castShadow = key !== 'ballast'; m.receiveShadow = true;
    scene.add(m); merged[key] = m;
  }
  // separate colored metal meshes (boxcars/containers already as groups; rust/blue/red merged parts are in 'metal' bucket — recolor via vertex? keep green base; add accent meshes)
  // (boxcar/container colors come from their own materials via groups — already added)

  // ---- signs (planes with stencil textures)
  function sign(tex, x, y, z, w, h, ry) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .85 }));
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
  }
  sign(stencilTex('CINDERLINE', '#e8dcc2', '#2c2118', 'RAIL YARD'), -31.4, 3.6, 0, 9, 4.5, Math.PI / 2);
  sign(stencilTex('A', '#ffd23e', null, 'WATER TOWER'), -22, 10.4, -11.2, 5, 2.5, 0);
  sign(stencilTex('B', '#ffd23e', null, 'BOXCAR ROW'), 20, 6.2, 10.6, 5, 2.5, 0);
  sign(stencilTex('SITE A', '#e8dcc2', '#3a2c1c', 'WATER TOWER'), -26, 2.6, -15.9, 4, 2, 0);
  sign(stencilTex('SITE B', '#e8dcc2', '#3a2c1c', 'BOXCAR ROW'), 26, 2.6, 15.9, 4, 2, Math.PI);
  sign(stencilTex('DANGER', '#ff5a3c', '#1c1a18', 'HIGH VOLTAGE'), 12, 2.2, -9.9, 3, 1.5, 0);
  // break up the mid container stack's flat south face (it fills the duel shot's left half)
  sign(stencilTex('CL-7', '#d8cdb4', '#2c2118'), -2, 1.4, 1.34, 4, 2, 0);
  sign(stencilTex('07', '#ffd23e', null), -2, 3.9, 1.34, 2, 1, 0);
  // big site letters painted on ground
  function groundLetter(tex, x, z, s) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .9, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .03, z); scene.add(m);
  }
  groundLetter(stencilTex('A', 'rgba(255,210,62,.85)'), -22, -8, 4);
  groundLetter(stencilTex('B', 'rgba(255,210,62,.85)'), 20, 8, 4);
  // graffiti tags on walls
  sign(graffitiTex('RUST CREW', '#ff5a3c'), -31.4, 2, -10, 4, 2, Math.PI / 2);
  sign(graffitiTex('ASH-9', '#5ac8ff'), 31.4, 2.2, 8, 4, 2, -Math.PI / 2);
  sign(graffitiTex('NO BRAKES', '#ffd23e'), 0, 2.4, -23.4, 5, 2.5, 0);

  // ---- lamps (emissive fixtures + light positions exported)
  const lampPositions = [[-22, -10], [20, 10], [0, 0], [-28, 0], [28, 0], [0, -18], [0, 18]];
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffc860, emissiveIntensity: 2.2 });
  for (const [x, z] of lampPositions) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, 4.6, 8), steelDark);
    post.position.set(x, 2.3, z); post.castShadow = true; scene.add(post);
    const head = new THREE.Mesh(new THREE.BoxGeometry(.7, .22, .4), lampMat);
    head.position.set(x, 4.7, z); scene.add(head);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, 1.1), steelDark);
    arm.position.set(x, 4.6, z + .5); scene.add(arm);
  }

  // ---- floodlight towers (tall, 3-head banks + visible light cones)
  const floodMat = new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffd080, emissiveIntensity: 2.6 });
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: .03, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  for (const [x, z, ry] of [[-28, 18, .5], [28, -18, -2.6]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, 8, 8), steelDark);
    post.position.set(x, 4, z); post.castShadow = true; scene.add(post);
    for (const off of [-.7, 0, .7]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(.6, .25, .35), floodMat);
      head.position.set(x + Math.cos(ry) * off, 8.1, z - Math.sin(ry) * off);
      head.rotation.y = ry; scene.add(head);
    }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.0, 7.6, 16, 1, true), coneMat);
    cone.position.set(x + Math.cos(ry) * 1.2, 4.1, z - Math.sin(ry) * 1.2);
    cone.rotation.z = -.22 * Math.cos(ry); cone.rotation.x = .22 * Math.sin(ry);
    scene.add(cone);
    colliders.push(boxOf(x, 0, z, .4, 8, .4));
  }
  // ---- cables: sagging tubes between lamp poles
  function cable(x1, z1, x2, z2) {
    const a = new THREE.Vector3(x1, 4.5, z1), b = new THREE.Vector3(x2, 4.5, z2);
    const mid = a.clone().lerp(b, .5); mid.y = 3.6;
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .02, 5), steelDark);
    scene.add(m);
  }
  cable(-22, -10, 0, 0); cable(0, 0, 20, 10); cable(-28, 0, 28, 0);
  // ---- distant container stacks OUTSIDE the walls (silhouettes above the wall tops, fogged for depth)
  function distant(x, z, ry, bucket, y = 0) {
    add(bucket, new THREE.BoxGeometry(6, 2.6, 2.6), x, y + 1.3, z, ry);
  }
  for (const [x, b] of [[-20, 'metalRust'], [0, 'metalBlue'], [20, 'metalRed']]) {
    distant(x, -30, 0, b, 0); distant(x, -30, 0, b, 2.6); distant(x, -30, 0, b, 5.2);
  }
  for (const [z, b] of [[-12, 'metalBlue'], [12, 'metalRust']]) {
    distant(38, z, Math.PI / 2, b, 0); distant(38, z, Math.PI / 2, b, 2.6); distant(38, z, Math.PI / 2, b, 5.2);
  }
  // ---- barbed wire coils along the north + south wall tops (helix tubes)
  function barbedWire(z, len) {
    const pts = [];
    const turns = Math.floor(len / .6), n = turns * 6;
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = t * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(-len / 2 + t * len, 5.62 + Math.sin(a) * .16, z + Math.cos(a) * .16));
    }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, .015, 5, false), steelDark);
    scene.add(m);
  }
  barbedWire(-24, 56); barbedWire(24, 56);

  // ---- sky dome + fog handled in main; return data
  return {
    colliders, wallRects, beacon,
    spawns: {
      ember: [[-28, -2], [-28, 0], [-28, 2], [-26, -3], [-26, 3]],
      slate: [[28, -2], [28, 0], [28, 2], [26, -3], [26, 3]],
    },
    sites: { A: { x: -22, z: -11 }, B: { x: 20, z: 11 } },
    waypoints: [
      [-28, 0], [-20, 0], [-12, 0], [-4, 0], [4, 0], [12, 0], [20, 0], [28, 0],
      [-22, -11], [-14, -14], [-6, -18], [6, -18], [14, -14], [22, -11],
      [-22, 12], [-14, 14], [-6, 18], [6, 18], [14, 14], [22, 12],
      [-10, -8], [10, 8], [-18, -6], [18, 6], [0, -10], [0, 10],
    ],
    lamps: lampPositions,
  };
}
