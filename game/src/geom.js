// Geometry helpers — all built from scratch: tapered/chamfered boxes, simple merging,
// AABB collision. No three.js example code.
import * as THREE from '../vendor/three/three.module.min.js';

// Box whose +Y end has (w2,d2) and -Y end has (w1,d1): a tapered prism (stock, mag, torso).
export function taperedBox(w1, d1, w2, d2, h) {
  const hw1 = w1 / 2, hd1 = d1 / 2, hw2 = w2 / 2, hd2 = d2 / 2, hh = h / 2;
  const v = [
    // bottom (-Y)
    -hw1, -hh, -hd1, hw1, -hh, -hd1, hw1, -hh, hd1, -hw1, -hh, hd1,
    // top (+Y)
    -hw2, hh, -hd2, hw2, hh, -hd2, hw2, hh, hd2, -hw2, hh, hd2,
  ];
  const idx = [
    0, 1, 2, 0, 2, 3,       // bottom
    4, 6, 5, 4, 7, 6,       // top
    0, 4, 5, 0, 5, 1,       // back
    3, 2, 6, 3, 6, 7,       // front
    0, 3, 7, 0, 7, 4,       // left
    1, 5, 6, 1, 6, 2,       // right
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx); g.computeVertexNormals();
  // simple planar UVs per face (approx, good enough for camo/metal)
  const uv = [];
  for (let i = 0; i < 8; i++) uv.push((i % 2) * .5, ((i / 2) | 0) % 2 * .5);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// Box with chamfered top edges: core box + slightly smaller top box reads as a bevel.
export function chamferBox(w, h, d, mat, chamfer = 0.03) {
  const grp = new THREE.Group();
  const core = new THREE.Mesh(new THREE.BoxGeometry(w, h - chamfer, d), mat);
  core.position.y = -chamfer / 2; core.castShadow = core.receiveShadow = true;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w - chamfer * 2, chamfer, d - chamfer * 2), mat);
  top.position.y = h / 2 - chamfer / 2; top.castShadow = top.receiveShadow = true;
  grp.add(core, top);
  return grp;
}

// Merge a list of {geometry, matrix} into one BufferGeometry (single material).
// Positions/normals/uvs concatenated; index offset. Non-indexed input is indexed first.
export function mergeGeoms(parts) {
  let vCount = 0, iCount = 0;
  const prepared = parts.map(p => {
    let g = p.geometry.index ? p.geometry : p.geometry.toNonIndexed();
    if (p.matrix) g = g.clone().applyMatrix4(p.matrix);
    vCount += g.attributes.position.count; iCount += g.index.count;
    return g;
  });
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const g of prepared) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += n; io += gi.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// ---- AABB collision: {min:Vector3,max:Vector3} list. Circle (x,z,r) vs boxes, y-range check.
export function collideCircle(boxes, p, r, y0, y1) {
  for (const b of boxes) {
    if (y1 < b.min.y || y0 > b.max.y) continue;
    const cx = Math.max(b.min.x, Math.min(p.x, b.max.x));
    const cz = Math.max(b.min.z, Math.min(p.z, b.max.z));
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2), push = (r - d) / d;
        p.x += dx * push; p.z += dz * push;
      } else {
        // center inside: push out along smallest penetration axis
        const px = Math.min(p.x - b.min.x + r, b.max.x - p.x + r);
        const pz = Math.min(p.z - b.min.z + r, b.max.z - p.z + r);
        if (px < pz) p.x += (p.x < (b.min.x + b.max.x) / 2 ? -px : px);
        else p.z += (p.z < (b.min.z + b.max.z) / 2 ? -pz : pz);
      }
    }
  }
}
export function boxOf(x, y, z, w, h, d) {
  return { min: new THREE.Vector3(x - w / 2, y, z - d / 2), max: new THREE.Vector3(x + w / 2, y + h, z + d / 2) };
}
// Ray vs AABB list (slab test) — returns {t, box, point} or null. Used for bot LOS + bullet hits.
export function rayBoxes(ox, oy, oz, dx, dy, dz, boxes, maxT) {
  let best = null;
  for (const b of boxes) {
    let t0 = 0, t1 = maxT;
    for (const [o, d, mn, mx] of [[ox, dx, b.min.x, b.max.x], [oy, dy, b.min.y, b.max.y], [oz, dz, b.min.z, b.max.z]]) {
      if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) { t0 = -1; break; } }
      else {
        let ta = (mn - o) / d, tb = (mx - o) / d;
        if (ta > tb) { const t = ta; ta = tb; tb = t; }
        if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
        if (t0 > t1) { t0 = -1; break; }
      }
    }
    if (t0 >= 0 && t0 < (best ? best.t : maxT)) best = { t: t0, box: b, point: new THREE.Vector3(ox + dx * t0, oy + dy * t0, oz + dz * t0) };
  }
  return best;
}
// Ray vs sphere (bot hit test): returns t or -1.
export function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  if (tca < 0) return -1;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  const r2 = r * r;
  if (d2 > r2) return -1;
  const thc = Math.sqrt(r2 - d2);
  return tca - thc;
}
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function rand(a, b) { return a + Math.random() * (b - a); }
export function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
