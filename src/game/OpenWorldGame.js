/**
 * Nova — 3D Açık Dünya Oynanış & Prolog Sahne Motoru
 * Kaynak: docs/hikaye/nova_hikaye_incili.md & docs/hikaye/21_nektar_kombinasyonlari.md
 *
 * Özellikler:
 * - Prolog: Deniz dibinde uyanış, su altındaki canlı küre nektarlarıyla kıyıya çıkış
 * - Issız Kıyı ve 7 Boss Bölgesi (Donmuş Kuleler, Kül Ocakları, Altın Uçurum, Kızıl Mahkeme,
 *   Uçan Bahçeler [havada asılı ada], Fısıltılı Bataklık, Hiçlik Sarayı)
 * - Nötr & Kanatsız hal, Tek Küre, 21 İkili Yarı-Yarıya Nektar Füzyonu (süreli geçici kanatlar) ve
 *   Hükümdar Sonu (7 renkli devasa kanatlar)
 * - 7 Boss savaşı, 7 İhanet Gecesi Anı Parçası ve 2 Farklı Final Seçimi
 */
import { getNectarSkillInfo } from '../data/sphereColors.js';

const WORLD_VS = `
  precision highp float;
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec3 aColor;

  uniform mat4 uViewProj;
  uniform mat4 uModel;
  uniform mat3 uNormalMat;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vColor;

  void main() {
    vec4 wp = uModel * vec4(aPosition, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(uNormalMat * aNormal);
    vColor = aColor;
    gl_Position = uViewProj * wp;
  }
`;

const WORLD_FS = `
  precision highp float;
  uniform vec3 uCamPos;
  uniform vec3 uFogColor;
  uniform float uAlpha;
  uniform float uUnlit;
  uniform float uSplitMode; // 0: vertex color, 1: half-and-half player/orb (ColorA / ColorB), 2: 7-color Sovereign
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uLocalCenter;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vColor;

  vec3 novaSpectrum(float t) {
    float p = fract(t) * 7.0;
    vec3 c0 = vec3(0.94, 0.08, 0.14);
    vec3 c1 = vec3(1.00, 0.44, 0.02);
    vec3 c2 = vec3(1.00, 0.85, 0.04);
    vec3 c3 = vec3(0.08, 0.78, 0.26);
    vec3 c4 = vec3(0.06, 0.54, 0.98);
    vec3 c5 = vec3(0.52, 0.12, 0.98);
    vec3 c6 = vec3(1.00, 0.30, 0.68);
    if (p < 1.0) return mix(c0, c1, p);
    if (p < 2.0) return mix(c1, c2, p - 1.0);
    if (p < 3.0) return mix(c2, c3, p - 2.0);
    if (p < 4.0) return mix(c3, c4, p - 3.0);
    if (p < 5.0) return mix(c4, c5, p - 4.0);
    if (p < 6.0) return mix(c5, c6, p - 5.0);
    return mix(c6, c0, p - 6.0);
  }

  void main() {
    vec3 N = normalize(vNormal);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(uCamPos - vWorldPos);
    vec3 L = normalize(vec3(0.38, 0.78, 0.48));

    vec3 base = vColor;
    if (uSplitMode > 1.5) {
      vec3 rel = vWorldPos - uLocalCenter;
      base = mix(base * 0.35, novaSpectrum((rel.x + rel.y) * 0.6 - uTime * 0.25), 0.85);
    } else if (uSplitMode > 0.5) {
      // Local X split in player/orb frame (encoded in vColor.b sign or world rel)
      float side = smoothstep(-0.02, 0.02, vColor.b - 0.5);
      float lum = vColor.r;
      base = mix(uColA, uColB, side) * (0.28 + 0.95 * lum);
    }

    vec3 lit = base;
    if (uUnlit < 0.5) {
      float ndl = max(dot(N, L), 0.0);
      float hemi = 0.32 + 0.20 * (N.y * 0.5 + 0.5);
      float fres = pow(clamp(1.0 - max(dot(N, V), 0.0), 0.0001, 1.0), 3.0);
      lit = base * (hemi + 0.72 * ndl) + base * fres * 0.22;
    }

    float dist = length(uCamPos - vWorldPos);
    float fog = clamp((dist - 48.0) / 92.0, 0.0, 0.78);
    lit = mix(lit, uFogColor, fog);

    gl_FragColor = vec4(clamp(lit, 0.0, 1.0), uAlpha);
  }
`;

function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function mix(a, b, t) { return a + (b - a) * t; }

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  return mix(
    mix(hash2(ix, iz), hash2(ix + 1, iz), ux),
    mix(hash2(ix, iz + 1), hash2(ix + 1, iz + 1), ux),
    uz
  ) * 2 - 1;
}

/**
 * Analytical open-world terrain heightfield:
 * - South (z > 32): Deep Sea Trench (y ~ -4.2) where the betrayed 8th Member wakes up!
 * - z ~ 22..32: Issız Kıyı (Forsaken Beach rising out of the sea)
 * - 7 Distinct Region Plateaus/Valleys radiating north/east/west:
 *   - Altın Uçurum [28, -48] rises to a steep +7.5m Sun Mesa
 *   - Hiçlik Sarayı [0, -62] rises to a +4.2m Obsidian Citadel
 */
function sampleTerrainHeight(x, z) {
  // Sea to Shore transition
  const seaFactor = clamp((z - 27.0) / 14.0, 0.0, 1.0);
  const shoreBase = mix(1.15, -4.3, seaFactor * seaFactor * (3 - 2 * seaFactor));

  // Rolling open-world hills
  const hills = vnoise2(x * 0.045, z * 0.045) * 1.45 + vnoise2(x * 0.11, z * 0.11) * 0.42;

  // Steep Betrayal Cliff behind the prologue sea at [-18, 44]
  const dBetrayal = Math.hypot(x + 19, z - 42);
  const betrayalCliff = Math.exp(-(dBetrayal * dBetrayal) / 68.0) * 8.2;

  // Altın Uçurum (Yellow Boss Vaelor) high mesa at [28, -48]
  const dSolar = Math.hypot(x - 28, z + 48);
  const solarMesa = clamp(1.0 - (dSolar - 9.5) / 5.5, 0.0, 1.0) * 6.4;

  // Hiçlik Sarayı (Purple Boss Noctis) throne plateau at [0, -62]
  const dVoid = Math.hypot(x, z + 62);
  const voidPlateau = clamp(1.0 - (dVoid - 11.0) / 6.0, 0.0, 1.0) * 3.2;

  // Fısıltılı Bataklık (Green Boss Morvain) sunken basin at [-46, 18]
  const dSwamp = Math.hypot(x + 46, z - 18);
  const swampDip = -Math.exp(-(dSwamp * dSwamp) / 140.0) * 1.1;

  return shoreBase + hills * (1.0 - seaFactor * 0.65) + betrayalCliff + solarMesa + voidPlateau + swampDip;
}

function sampleTerrainColor(x, y, z) {
  if (y < -0.5) {
    // Deep prologue seabed
    return [0.07, 0.13, 0.20];
  }
  if (y < 0.35 && z > 20) {
    // Issız Kıyı wet dark volcanic sand
    return [0.22, 0.21, 0.24];
  }
  // Blend toward nearest Boss Region's biome tint!
  let r = 0.16, g = 0.19, b = 0.18;
  const biomes = [
    { x: -42, z: -28, c: [0.30, 0.08, 0.11], rad: 26 }, // Kızıl Mahkeme
    { x:  44, z: -22, c: [0.32, 0.15, 0.06], rad: 26 }, // Kül Ocakları
    { x: -46, z:  18, c: [0.08, 0.26, 0.12], rad: 28 }, // Fısıltılı Bataklık
    { x:  46, z:  16, c: [0.26, 0.14, 0.22], rad: 24 }, // Uçan Bahçeler altı
    { x:   0, z: -62, c: [0.16, 0.09, 0.28], rad: 26 }, // Hiçlik Sarayı
    { x: -26, z: -50, c: [0.16, 0.28, 0.38], rad: 26 }, // Donmuş Kuleler
    { x:  28, z: -48, c: [0.36, 0.30, 0.10], rad: 24 }  // Altın Uçurum
  ];
  for (const bm of biomes) {
    const d = Math.hypot(x - bm.x, z - bm.z);
    const w = clamp(1.0 - d / bm.rad, 0.0, 1.0);
    r = mix(r, bm.c[0], w * 0.85);
    g = mix(g, bm.c[1], w * 0.85);
    b = mix(b, bm.c[2], w * 0.85);
  }
  return [r, g, b];
}

class MeshBuild {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.idx = []; }
  v(px, py, pz, nx, ny, nz, cr, cg, cb) {
    const i = this.pos.length / 3;
    this.pos.push(px, py, pz);
    this.nor.push(nx, ny, nz);
    this.col.push(cr, cg, cb);
    return i;
  }
  tri(a, b, c) { this.idx.push(a, b, c); }
  addCylinder(x0, y0, z0, rBot, rTop, h, segs, colBot, colTop, splitCoded = false) {
    const base = this.pos.length / 3;
    for (let ring = 0; ring <= 1; ring++) {
      const y = y0 + ring * h;
      const rad = ring === 0 ? rBot : rTop;
      const c = ring === 0 ? colBot : colTop;
      for (let s = 0; s <= segs; s++) {
        const th = (s / segs) * Math.PI * 2;
        const sn = Math.sin(th), cs = Math.cos(th);
        const px = x0 + sn * rad, pz = z0 + cs * rad;
        if (splitCoded) {
          this.v(px, y, pz, sn, 0.15, cs, c[0], c[1], clamp(0.5 + sn * 0.5, 0, 1));
        } else {
          this.v(px, y, pz, sn, 0.15, cs, c[0], c[1], c[2]);
        }
      }
    }
    const stride = segs + 1;
    for (let s = 0; s < segs; s++) {
      const i00 = base + s, i10 = i00 + 1, i01 = i00 + stride, i11 = i01 + 1;
      this.tri(i00, i10, i11);
      this.tri(i00, i11, i01);
    }
    // Top cap
    const topCenter = this.v(x0, y0 + h, z0, 0, 1, 0, colTop[0], colTop[1], splitCoded ? 0.5 : colTop[2]);
    for (let s = 0; s < segs; s++) {
      this.tri(topCenter, base + stride + s, base + stride + s + 1);
    }
  }
  upload(gl) {
    const mk = (t, d) => { const b = gl.createBuffer(); gl.bindBuffer(t, b); gl.bufferData(t, d, gl.STATIC_DRAW); return b; };
    return {
      posB: mk(gl.ARRAY_BUFFER, new Float32Array(this.pos)),
      norB: mk(gl.ARRAY_BUFFER, new Float32Array(this.nor)),
      colB: mk(gl.ARRAY_BUFFER, new Float32Array(this.col)),
      idxB: mk(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.idx)),
      count: this.idx.length
    };
  }
}

function mat4Identity() {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}

function mat4TRS(tx, ty, tz, ry, sx, sy, sz) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return {
    m: new Float32Array([
      c * sx, 0, -s * sx, 0,
      0, sy, 0, 0,
      s * sz, 0, c * sz, 0,
      tx, ty, tz, 1
    ]),
    n: new Float32Array([c, 0, -s, 0, 1, 0, s, 0, c])
  };
}

function mat4ViewProj(camPos, target, fov, aspect, near, far) {
  let fx = target[0] - camPos[0], fy = target[1] - camPos[1], fz = target[2] - camPos[2];
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl; fy /= fl; fz /= fl;

  // right = normalize(cross(f, [0,1,0]))
  let rx = -fz, ry = 0, rz = fx;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; rz /= rl;

  // up = cross(right, f)
  const ux = ry * fz - rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy - ry * fx;

  const view = [
    rx, ux, -fx, 0,
    ry, uy, -fy, 0,
    rz, uz, -fz, 0,
    -(rx * camPos[0] + ry * camPos[1] + rz * camPos[2]),
    -(ux * camPos[0] + uy * camPos[1] + uz * camPos[2]),
    (fx * camPos[0] + fy * camPos[1] + fz * camPos[2]),
    1
  ];

  const f = 1.0 / Math.tan(fov * 0.5);
  const nf = 1.0 / (near - far);
  const p0 = f / aspect, p5 = f, p10 = (far + near) * nf, p14 = 2 * far * near * nf;

  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    const v0 = view[col * 4], v1 = view[col * 4 + 1], v2 = view[col * 4 + 2], v3 = view[col * 4 + 3];
    out[col * 4]     = p0 * v0;
    out[col * 4 + 1] = p5 * v1;
    out[col * 4 + 2] = p10 * v2 + (col === 3 ? p14 : 0);
    out[col * 4 + 3] = -v2;
  }
  return out;
}

export function createOpenWorldGame(canvas, sphereColors, bosses, callbacks) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
  if (!gl) throw new Error('WebGL desteklenmiyor.');

  const compile = (t, s) => {
    const sh = gl.createShader(t);
    gl.shaderSource(sh, s);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, WORLD_VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, WORLD_FS));
  gl.linkProgram(prog);

  const loc = {
    aPosition: gl.getAttribLocation(prog, 'aPosition'),
    aNormal: gl.getAttribLocation(prog, 'aNormal'),
    aColor: gl.getAttribLocation(prog, 'aColor'),
    uViewProj: gl.getUniformLocation(prog, 'uViewProj'),
    uModel: gl.getUniformLocation(prog, 'uModel'),
    uNormalMat: gl.getUniformLocation(prog, 'uNormalMat'),
    uCamPos: gl.getUniformLocation(prog, 'uCamPos'),
    uFogColor: gl.getUniformLocation(prog, 'uFogColor'),
    uAlpha: gl.getUniformLocation(prog, 'uAlpha'),
    uUnlit: gl.getUniformLocation(prog, 'uUnlit'),
    uSplitMode: gl.getUniformLocation(prog, 'uSplitMode'),
    uColA: gl.getUniformLocation(prog, 'uColA'),
    uColB: gl.getUniformLocation(prog, 'uColB'),
    uLocalCenter: gl.getUniformLocation(prog, 'uLocalCenter'),
    uTime: gl.getUniformLocation(prog, 'uTime')
  };

  // --- 1. Build Seamless 3D Open-World Terrain + 7 Region Landmarks + Floating Sky Islands ---
  const worldBuilder = new MeshBuild();
  const GN = 92;
  const HALF_EXT = 76;
  for (let r = 0; r <= GN; r++) {
    const z = mix(-HALF_EXT, HALF_EXT, r / GN);
    for (let c = 0; c <= GN; c++) {
      const x = mix(-HALF_EXT, HALF_EXT, c / GN);
      const y = sampleTerrainHeight(x, z);
      const eps = 1.2;
      const hx = sampleTerrainHeight(x + eps, z) - sampleTerrainHeight(x - eps, z);
      const hz = sampleTerrainHeight(x, z + eps) - sampleTerrainHeight(x, z - eps);
      let nx = -hx, ny = 2 * eps, nz = -hz;
      const nl = Math.hypot(nx, ny, nz) || 1;
      const col = sampleTerrainColor(x, y, z);
      worldBuilder.v(x, y, z, nx / nl, ny / nl, nz / nl, col[0], col[1], col[2]);
    }
  }
  for (let r = 0; r < GN; r++) {
    for (let c = 0; c < GN; c++) {
      const i00 = r * (GN + 1) + c, i10 = i00 + 1, i01 = i00 + GN + 1, i11 = i01 + 1;
      worldBuilder.tri(i00, i01, i10);
      worldBuilder.tri(i10, i01, i11);
    }
  }

  // Static walkable platforms (Floating Sky-Islands for Uçan Bahçeler + Stepping Stones + Boss Altars!)
  const staticPlatforms = [
    // Stepping sky-islets up to Uçan Bahçeler (Pembe Boss Lyra at [46, 11, 16])
    { x: 26, y: 3.6, z: 22, r: 3.2, h: 1.0, col: [0.36, 0.20, 0.30] },
    { x: 35, y: 6.8, z: 19, r: 3.4, h: 1.1, col: [0.42, 0.22, 0.34] },
    { x: 46, y: 10.2, z: 16, r: 8.5, h: 1.6, col: [0.46, 0.22, 0.36] }
  ];
  for (const sp of staticPlatforms) {
    worldBuilder.addCylinder(sp.x, sp.y - sp.h, sp.z, sp.r * 0.65, sp.r, sp.h, 18, [0.14, 0.12, 0.16], sp.col);
  }

  // Regional Spires & Boss Shrines for all 7 Regions
  bosses.forEach((b) => {
    const bx = b.worldPos[0];
    const bz = b.worldPos[2];
    const by = b.id === 'pembe' ? 10.2 : sampleTerrainHeight(bx, bz);
    b.groundY = by;
    // Altar plinth
    worldBuilder.addCylinder(bx, by - 0.3, bz, 4.8, 4.4, 0.6, 20, b.darkRGB, [0.22, 0.24, 0.28]);
    // 4 Surrounding Regional Monolith Pillars visible from Issız Kıyı horizon!
    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + 0.4;
      const px = bx + Math.cos(ang) * 6.2;
      const pz = bz + Math.sin(ang) * 6.2;
      worldBuilder.addCylinder(px, by - 0.5, pz, 0.65, 0.32, 7.5, 8, b.darkRGB, b.glowRGB);
    }
  });

  const terrainGpu = worldBuilder.upload(gl);

  // Translucent Sea Mesh (z in [22..76], water surface y = -0.35)
  const waterBuilder = new MeshBuild();
  waterBuilder.v(-HALF_EXT, -0.35, 18, 0, 1, 0, 0.04, 0.28, 0.46);
  waterBuilder.v( HALF_EXT, -0.35, 18, 0, 1, 0, 0.04, 0.28, 0.46);
  waterBuilder.v(-HALF_EXT, -0.35, HALF_EXT, 0, 1, 0, 0.02, 0.18, 0.36);
  waterBuilder.v( HALF_EXT, -0.35, HALF_EXT, 0, 1, 0, 0.02, 0.18, 0.36);
  waterBuilder.tri(0, 2, 1);
  waterBuilder.tri(1, 2, 3);
  const waterGpu = waterBuilder.upload(gl);

  // Bumpy 3D Nectar Sphere Mesh (split-coded in B channel so each sphere can be 1-color or 2-color!)
  const orbBuilder = new MeshBuild();
  const OR = 12, OC = 16;
  for (let r = 0; r <= OR; r++) {
    const ph = (r / OR) * Math.PI;
    for (let c = 0; c <= OC; c++) {
      const th = (c / OC) * Math.PI * 2;
      const dx = Math.sin(ph) * Math.sin(th), dy = -Math.cos(ph), dz = Math.sin(ph) * Math.cos(th);
      const bump = 1.0 + 0.26 * Math.sin(dx * 7.0) * Math.cos(dy * 7.0 + dz * 5.0);
      const lum = clamp(0.45 + 0.55 * ((bump - 0.74) / 0.52), 0.25, 1.0);
      orbBuilder.v(dx * bump, dy * bump, dz * bump, dx, dy, dz, lum, lum, clamp(0.5 + dx * 0.5, 0, 1));
    }
  }
  for (let r = 0; r < OR; r++) {
    for (let c = 0; c < OC; c++) {
      const i00 = r * (OC + 1) + c, i10 = i00 + 1, i01 = i00 + OC + 1, i11 = i01 + 1;
      orbBuilder.tri(i00, i10, i11);
      orbBuilder.tri(i00, i11, i01);
    }
  }
  const orbGpu = orbBuilder.upload(gl);

  // Stylized Third-Person 3D Playable Protagonist Avatar (split-coded in B channel for real-time Left/Right Hemisphere transformation!)
  const playerBodyB = new MeshBuild();
  playerBodyB.addCylinder(-0.14, 0.00, 0, 0.10, 0.11, 0.78, 10, [0.35, 0.35, 0.1], [0.55, 0.55, 0.1], true); // Left boot/leg
  playerBodyB.addCylinder( 0.14, 0.00, 0, 0.10, 0.11, 0.78, 10, [0.35, 0.35, 0.9], [0.55, 0.55, 0.9], true); // Right boot/leg
  playerBodyB.addCylinder( 0.00, 0.75, 0, 0.25, 0.29, 0.66, 14, [0.48, 0.48, 0.5], [0.78, 0.78, 0.5], true); // Battle-mage coat
  playerBodyB.addCylinder(-0.34, 0.88, 0, 0.07, 0.09, 0.48, 8,  [0.65, 0.65, 0.0], [0.82, 0.82, 0.0], true); // Left gauntlet arm
  playerBodyB.addCylinder( 0.34, 0.88, 0, 0.07, 0.09, 0.48, 8,  [0.65, 0.65, 1.0], [0.82, 0.82, 1.0], true); // Right gauntlet arm
  playerBodyB.addCylinder( 0.00, 1.44, 0, 0.16, 0.15, 0.30, 12, [0.82, 0.82, 0.5], [0.92, 0.92, 0.5], true); // Head
  const playerBodyGpu = playerBodyB.upload(gl);

  // Player Temporary Active Wings (split-coded: Left wings B=0.0 -> ColorA, Right wings B=1.0 -> ColorB!)
  const wingBuild = new MeshBuild();
  for (const side of [-1, 1]) {
    const bTag = side < 0 ? 0.0 : 1.0;
    for (const [yOff, span, lift] of [[1.32, 1.35, 0.65], [1.14, 0.95, -0.25]]) {
      const i0 = wingBuild.v(side * 0.08, yOff, -0.14, 0, 0, 1, 0.95, 0.95, bTag);
      const i1 = wingBuild.v(side * span, yOff + lift, -0.38, 0, 0, 1, 1.0, 1.0, bTag);
      const i2 = wingBuild.v(side * span * 0.68, yOff + lift - 0.48, -0.30, 0, 0, 1, 0.65, 0.65, bTag);
      wingBuild.tri(i0, i1, i2);
    }
  }
  const playerWingGpu = wingBuild.upload(gl);

  // Reusable Unit Cylinder for Ice Pillars, Vine Trampolines, Bridges, Decoys, Boss Figures & FX Rings
  const unitCylB = new MeshBuild();
  unitCylB.addCylinder(0, 0, 0, 1.0, 1.0, 1.0, 16, [0.7, 0.7, 0.7], [1.0, 1.0, 1.0], false);
  const unitCylGpu = unitCylB.upload(gl);

  // --- 2. Spawn Wild Nectar Spheres (Prolog Underwater Cluster + Open-World Clusters!) ---
  const wildOrbs = [];
  // Prolog underwater spheres right in front of the player at z ~ 34..52 (especially Mavi=5, Mor=4, Sarı=6!)
  const prologSeeds = [
    [0, 49, 5], [-3.2, 46, 4], [3.4, 45, 6], [-2.5, 40, 1], [2.8, 39, 3], [0, 35, 2], [-4.5, 36, 0]
  ];
  for (const [ox, oz, cIdx] of prologSeeds) {
    wildOrbs.push({ x: ox, z: oz, y: Math.max(-3.0, sampleTerrainHeight(ox, oz) + 1.1), colorIdx: cIdx, cooldown: 0 });
  }
  // Scatter 42 more nectar spheres across the 7 regions
  for (let i = 0; i < 42; i++) {
    const ang = i * 2.39996;
    const rad = 12 + (i % 7) * 8.5;
    const ox = Math.cos(ang) * rad;
    const oz = Math.sin(ang) * rad - 10;
    const ty = sampleTerrainHeight(ox, oz);
    wildOrbs.push({ x: ox, z: oz, y: Math.max(-2.6, ty + 1.15), colorIdx: i % 7, cooldown: 0 });
  }

  // Boss Runtime Entities
  const bossEntities = bosses.map((b) => ({
    info: b,
    x: b.worldPos[0],
    y: b.groundY,
    z: b.worldPos[2],
    hp: 100,
    maxHp: 100,
    defeated: false,
    frozenTimer: 0,
    snareTimer: 0,
    atkCooldown: 2.5
  }));

  // Dynamic Spawned World Constructs (Ice Platforms, Vine Trampolines, Vine Bridges, Exploding Pink Decoys, FX Pulses)
  const constructs = []; // { type: 'ice'|'trampoline'|'vine_bridge'|'decoy', x, y, z, r, h, life, maxLife, colorRGB, vx, vz, freezeBlast }
  const fxPulses = [];   // { x, y, z, r, maxR, life, col }
  let tetherBeam = null; // { tx, ty, tz, life, col }

  const state = {
    active: true,
    hp: 100,
    maxHp: 100,
    px: 0,
    py: -2.8,
    pz: 53,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,          // Facing North (toward -Z shore & 7 regions)
    camYaw: 0,
    camPitch: 0.28,
    camDist: 8.8,
    grounded: false,
    nectarSlots: [], // [] = Neutral Wingless | [cA] = Single | [cA, cB] = Dual Half-and-Half!
    nectarTimer: 0,
    nectarMaxTime: 30,
    sovereignEnding: false,
    freedomEnding: false,
    unlockedMasterOrbs: new Set(),
    defeatedCount: 0,
    currentRegion: 'Prolog: Deniz Dibi (Issız Kıyı Önü)',
    meteorPending: false
  };

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (!state.active) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      if (document.activeElement === document.body || document.activeElement === canvas) {
        e.preventDefault();
      }
    }
    keys.add(e.code);
    if (e.code === 'Space') handleJump();
    if (e.code === 'KeyF' || e.code === 'Enter') triggerActiveSkill();
    if (e.code === 'KeyX') purgeNectar();
    if (e.code >= 'Digit1' && e.code <= 'Digit7') {
      drinkNectarColor(Number(e.code.slice(5)) - 1);
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));

  let dragging = false, lastMX = 0, lastMY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastMX = e.clientX;
    lastMY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastMX, dy = e.clientY - lastMY;
    lastMX = e.clientX; lastMY = e.clientY;
    state.camYaw -= dx * 0.007;
    state.camPitch = clamp(state.camPitch + dy * 0.006, 0.05, 1.05);
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.camDist = clamp(state.camDist + e.deltaY * 0.008, 4.5, 18.0);
  }, { passive: false });

  function hasColor(cIdx) {
    return state.sovereignEnding || state.nectarSlots.includes(cIdx);
  }

  function drinkNectarColor(cIdx) {
    state.sovereignEnding = false;
    if (state.nectarSlots.length === 0) {
      state.nectarSlots = [cIdx];
    } else if (state.nectarSlots.length === 1) {
      if (state.nectarSlots[0] !== cIdx) {
        state.nectarSlots = [state.nectarSlots[0], cIdx];
      }
    } else {
      if (!state.nectarSlots.includes(cIdx)) {
        state.nectarSlots = [state.nectarSlots[1], cIdx];
      }
    }
    state.nectarTimer = state.nectarMaxTime;
    fxPulses.push({ x: state.px, y: state.py + 0.8, z: state.pz, r: 0.4, maxR: 2.8, life: 0.45, col: sphereColors[cIdx].core });
    notifyHUD();
  }

  function setDualNectar(cA, cB) {
    state.sovereignEnding = false;
    state.nectarSlots = cA === cB ? [cA] : [cA, cB];
    state.nectarTimer = state.nectarMaxTime;
    notifyHUD();
  }

  function purgeNectar() {
    state.nectarSlots = [];
    state.nectarTimer = 0;
    state.sovereignEnding = false;
    notifyHUD();
  }

  function spawnConstruct(c) {
    if (constructs.length > 28) constructs.shift();
    constructs.push(c);
  }

  function damageNearbyBosses(cx, cy, cz, radius, dmg, opts = {}) {
    let hitCount = 0;
    for (const b of bossEntities) {
      if (b.defeated) continue;
      const d = Math.hypot(b.x - cx, b.y - cy, b.z - cz);
      if (d <= radius) {
        hitCount++;
        const bonus = (b.frozenTimer > 0 && opts.shatterBonus) ? 1.85 : 1.0;
        b.hp = Math.max(0, b.hp - dmg * bonus);
        if (opts.freeze) b.frozenTimer = 4.5;
        if (opts.snare) b.snareTimer = 4.5;
        if (opts.lifesteal) state.hp = Math.min(state.maxHp, state.hp + opts.lifesteal);
        if (b.hp <= 0 && !b.defeated) {
          b.defeated = true;
          state.unlockedMasterOrbs.add(b.info.colorIndex);
          state.defeatedCount++;
          fxPulses.push({ x: b.x, y: b.y + 1.2, z: b.z, r: 0.8, maxR: 8.5, life: 1.0, col: b.info.glowRGB });
          if (callbacks?.onBossDefeated) {
            callbacks.onBossDefeated(b.info, state.defeatedCount);
          }
        }
      }
    }
    return hitCount;
  }

  function handleJump() {
    const hasYellow = hasColor(6);
    const hasBlue   = hasColor(5);
    const hasPink   = hasColor(3);
    const hasOrange = hasColor(1);
    const hasRed    = hasColor(0);

    // Sarı + Mavi (#2 Buz Kulesi Sıçrayışı): mid-air or ground ice pillar spawn under feet!
    if (hasYellow && hasBlue) {
      spawnConstruct({
        type: 'ice', x: state.px, y: state.py - 0.9, z: state.pz,
        r: 1.65, h: 1.1, life: 14, maxLife: 14, colorRGB: [0.32, 0.78, 1.0]
      });
      state.vy = 15.2;
      state.grounded = false;
      fxPulses.push({ x: state.px, y: state.py, z: state.pz, r: 0.5, maxR: 2.6, life: 0.4, col: [0.35, 0.82, 1.0] });
      return;
    }

    // Mavi in water (Prolog!): freeze water under feet into an ice step & jump!
    if (hasBlue && state.py < 0.1 && state.pz > 20) {
      spawnConstruct({
        type: 'ice', x: state.px, y: -0.45, z: state.pz,
        r: 2.2, h: 0.55, life: 18, maxLife: 18, colorRGB: [0.32, 0.78, 1.0]
      });
      state.py = 0.15;
      state.vy = 10.5;
      state.grounded = false;
      return;
    }

    if (!state.grounded && state.py > -0.6) return;

    state.vy = hasYellow ? 17.8 : 9.6;
    state.grounded = false;

    // Sarı + Pembe (#6 Uçurum Süzülüşü): leave exploding pink decoy at launch spot!
    if (hasYellow && hasPink) {
      spawnConstruct({
        type: 'decoy', x: state.px, y: state.py, z: state.pz,
        r: 0.42, h: 1.65, life: 2.2, maxLife: 2.2, colorRGB: [1.0, 0.36, 0.72], vx: 0, vz: 0
      });
    }
    // Sarı + Turuncu (#3 Göktaşı Düşüşü): arm meteor slam on landing!
    if (hasYellow && hasOrange) {
      state.meteorPending = true;
    }
    // Sarı + Kırmızı (#5 Dönen Pençe Çarkı): aerial spinning crimson vortex!
    if (hasYellow && hasRed) {
      fxPulses.push({ x: state.px, y: state.py + 1.0, z: state.pz, r: 0.6, maxR: 5.2, life: 0.55, col: [1.0, 0.16, 0.22] });
      damageNearbyBosses(state.px, state.py + 1.0, state.pz, 6.2, 34, { lifesteal: 18 });
    }
  }

  function triggerActiveSkill() {
    if (state.nectarSlots.length === 0 && !state.sovereignEnding) return;

    const fwdX = -Math.sin(state.yaw);
    const fwdZ = -Math.cos(state.yaw);

    if (state.sovereignEnding) {
      // 7-Color Sovereign Nova Cataclysm!
      fxPulses.push({ x: state.px, y: state.py + 1.0, z: state.pz, r: 1.0, maxR: 16.0, life: 0.85, col: [1.0, 0.85, 0.35] });
      damageNearbyBosses(state.px, state.py, state.pz, 16.0, 65, { freeze: true, snare: true, lifesteal: 35 });
      state.vy = 13.0;
      return;
    }

    const hasRed    = hasColor(0);
    const hasOrange = hasColor(1);
    const hasGreen  = hasColor(2);
    const hasPink   = hasColor(3);
    const hasPurple = hasColor(4);
    const hasBlue   = hasColor(5);
    const hasYellow = hasColor(6);

    // --- MOR (Grapple / Pull) Combinations (#1, #7, #8, #9, #10, #11 or Single Purple) ---
    if (hasPurple) {
      // Find nearest Boss in front within 26m, else grapple to elevated point 16m ahead!
      let targetBoss = null, bestD = 26;
      for (const b of bossEntities) {
        if (b.defeated) continue;
        const d = Math.hypot(b.x - state.px, b.z - state.pz);
        if (d < bestD) { bestD = d; targetBoss = b; }
      }
      const tx = targetBoss ? targetBoss.x : state.px + fwdX * 15.0;
      const tz = targetBoss ? targetBoss.z : state.pz + fwdZ * 15.0;
      const ty = targetBoss ? targetBoss.y + 1.2 : Math.max(sampleTerrainHeight(tx, tz) + 2.2, state.py + 3.0);

      tetherBeam = { tx, ty, tz, life: 0.45, col: [0.68, 0.30, 1.0] };

      if (hasPink) {
        // #11 Tuzak Çekimi: leave exploding decoy behind before grappling away!
        spawnConstruct({ type: 'decoy', x: state.px, y: state.py, z: state.pz, r: 0.42, h: 1.65, life: 2.0, maxLife: 2.0, colorRGB: [1.0, 0.36, 0.72], vx: 0, vz: 0 });
      }
      if (hasRed && targetBoss) {
        // #10 Avcı Çekişi: pull toward enemy & lifesteal claw!
        state.vx = (tx - state.px) * 2.4;
        state.vz = (tz - state.pz) * 2.4;
        state.vy = 6.5;
        damageNearbyBosses(tx, ty, tz, 6.0, 38, { lifesteal: 22 });
        fxPulses.push({ x: tx, y: ty, z: tz, r: 0.5, maxR: 4.5, life: 0.45, col: [1.0, 0.14, 0.22] });
        return;
      }
      if (hasBlue) {
        // #7 Donduran Kanca: freeze water/target at grapple point + spawn ice platform!
        spawnConstruct({ type: 'ice', x: tx, y: ty - 1.2, z: tz, r: 2.4, h: 0.7, life: 16, maxLife: 16, colorRGB: [0.32, 0.78, 1.0] });
        damageNearbyBosses(tx, ty, tz, 6.0, 26, { freeze: true });
      }
      if (hasGreen) {
        // #9 Kement Sarmaşık: snare vines at grapple impact!
        damageNearbyBosses(tx, ty, tz, 7.5, 28, { snare: true });
        fxPulses.push({ x: tx, y: ty, z: tz, r: 0.6, maxR: 5.5, life: 0.55, col: [0.18, 0.92, 0.38] });
      }
      // Pull player rapidly toward (tx, ty, tz)!
      const speedMult = hasOrange ? 3.2 : 2.3; // #8 Canlı Torpido = rocket speed!
      state.vx = (tx - state.px) * speedMult;
      state.vz = (tz - state.pz) * speedMult;
      state.vy = Math.max(7.5, (ty - state.py) * 1.6 + (hasYellow ? 6.0 : 2.5));
      state.grounded = false;
      if (hasOrange) {
        fxPulses.push({ x: tx, y: ty, z: tz, r: 0.8, maxR: 6.5, life: 0.55, col: [1.0, 0.48, 0.08] });
        damageNearbyBosses(tx, ty, tz, 6.5, 44);
      }
      return;
    }

    // --- YEŞİL + SARI (#4 Trambolin Kök) ---
    if (hasGreen && hasYellow) {
      const px = state.px + fwdX * 2.2, pz = state.pz + fwdZ * 2.2;
      spawnConstruct({
        type: 'trampoline', x: px, y: Math.max(-0.3, sampleTerrainHeight(px, pz)), z: pz,
        r: 2.4, h: 0.55, life: 20, maxLife: 20, colorRGB: [0.18, 0.88, 0.34]
      });
      state.vy = 21.5;
      state.grounded = false;
      fxPulses.push({ x: px, y: state.py, z: pz, r: 0.6, maxR: 3.8, life: 0.45, col: [0.45, 0.98, 0.30] });
      return;
    }

    // --- YEŞİL + PEMBE (#20 Uçan Sarmaşık Köprüsü) ---
    if (hasGreen && hasPink) {
      for (let step = 1; step <= 3; step++) {
        spawnConstruct({
          type: 'vine_bridge',
          x: state.px + fwdX * (step * 3.4),
          y: state.py - 0.15 + step * 0.45,
          z: state.pz + fwdZ * (step * 3.4),
          r: 1.75, h: 0.40, life: 22, maxLife: 22, colorRGB: [0.46, 0.82, 0.56]
        });
      }
      return;
    }

    // --- TURUNCU + PEMBE (#18 Güdümlü Kopya) ---
    if (hasOrange && hasPink) {
      spawnConstruct({
        type: 'decoy', x: state.px + fwdX * 1.2, y: state.py, z: state.pz + fwdZ * 1.2,
        r: 0.45, h: 1.65, life: 1.8, maxLife: 1.8, colorRGB: [1.0, 0.45, 0.55],
        vx: fwdX * 18.0, vz: fwdZ * 18.0
      });
      state.vx = -fwdX * 7.5;
      state.vz = -fwdZ * 7.5;
      state.vy = 5.5;
      return;
    }

    // --- TURUNCU Combinations (#12 Buz Roketi, #16 Patlayan Tohumlar, #17 Alevli Pençe Yarığı, #3 Göktaşı, Single Orange) ---
    if (hasOrange) {
      state.vx = fwdX * 22.0;
      state.vz = fwdZ * 22.0;
      state.vy = Math.max(state.vy, 3.2);
      if (hasBlue) {
        // #12 Buz Roketi: lay slick ice slide ahead!
        for (let k = 1; k <= 3; k++) {
          spawnConstruct({
            type: 'ice', x: state.px + fwdX * (k * 3.2), y: Math.max(-0.4, state.py - 0.2), z: state.pz + fwdZ * (k * 3.2),
            r: 1.9, h: 0.45, life: 14, maxLife: 14, colorRGB: [0.32, 0.78, 1.0]
          });
        }
      }
      if (hasGreen) {
        // #16 Patlayan Tohumlar: snare + delayed seed blast!
        spawnConstruct({
          type: 'decoy', x: state.px, y: state.py, z: state.pz,
          r: 0.55, h: 0.75, life: 1.6, maxLife: 1.6, colorRGB: [0.35, 0.88, 0.22], vx: 0, vz: 0
        });
      }
      const heal = hasRed ? 20 : 0; // #17 Alevli Pençe Yarığı
      damageNearbyBosses(state.px + fwdX * 4.0, state.py + 1.0, state.pz + fwdZ * 4.0, 7.0, 42, { lifesteal: heal });
      fxPulses.push({ x: state.px + fwdX * 3.5, y: state.py + 0.9, z: state.pz + fwdZ * 3.5, r: 0.7, maxR: 6.0, life: 0.5, col: [1.0, 0.45, 0.08] });
      return;
    }

    // --- MAVİ Combinations (#13 Buzlu Sarmaşık Surları, #14 Tuzla Buz Pençesi, #15 Kar Fırtınası Kopyası, Single Blue) ---
    if (hasBlue) {
      const ix = state.px + fwdX * 2.8, iz = state.pz + fwdZ * 2.8;
      const wallH = hasGreen ? 2.6 : 0.85; // #13 Buzlu Sarmaşık Surları
      spawnConstruct({
        type: 'ice', x: ix, y: Math.max(-0.45, state.py - 0.15), z: iz,
        r: 2.3, h: wallH, life: 18, maxLife: 18, colorRGB: hasGreen ? [0.22, 0.85, 0.72] : [0.32, 0.78, 1.0]
      });
      if (hasPink) {
        // #15 Kar Fırtınası Kopyası
        spawnConstruct({
          type: 'decoy', x: state.px, y: state.py, z: state.pz,
          r: 0.42, h: 1.65, life: 2.0, maxLife: 2.0, colorRGB: [0.55, 0.75, 1.0], vx: 0, vz: 0, freezeBlast: true
        });
        state.vy = 6.5;
      }
      // #14 Tuzla Buz Pençesi shatter bonus!
      damageNearbyBosses(state.px + fwdX * 2.5, state.py + 1.0, state.pz + fwdZ * 2.5, 6.8, hasRed ? 38 : 22, {
        freeze: true,
        shatterBonus: hasRed,
        lifesteal: hasRed ? 24 : 0
      });
      fxPulses.push({ x: ix, y: state.py + 0.8, z: iz, r: 0.6, maxR: 5.2, life: 0.45, col: [0.32, 0.82, 1.0] });
      return;
    }

    // --- YEŞİL + KIRMIZI (#19 Can Emen Dikenler) or Single Green ---
    if (hasGreen) {
      damageNearbyBosses(state.px + fwdX * 3.0, state.py + 1.0, state.pz + fwdZ * 3.0, 8.0, 34, {
        snare: true,
        lifesteal: hasRed ? 28 : 0
      });
      fxPulses.push({ x: state.px + fwdX * 3.0, y: state.py + 0.5, z: state.pz + fwdZ * 3.0, r: 0.7, maxR: 6.2, life: 0.55, col: [0.18, 0.90, 0.34] });
      return;
    }

    // --- KIRMIZI + PEMBE (#21 Hayalet Biçici) or Single Red / Single Pink ---
    if (hasPink) {
      spawnConstruct({
        type: 'decoy', x: state.px, y: state.py, z: state.pz,
        r: 0.42, h: 1.65, life: 2.0, maxLife: 2.0, colorRGB: [1.0, 0.36, 0.72], vx: 0, vz: 0
      });
      if (hasRed) {
        // #21 Hayalet Biçici: glide swiftly forward-through & slash!
        state.px += fwdX * 5.2;
        state.pz += fwdZ * 5.2;
        damageNearbyBosses(state.px, state.py + 1.0, state.pz, 6.2, 42, { lifesteal: 22 });
        fxPulses.push({ x: state.px, y: state.py + 1.0, z: state.pz, r: 0.6, maxR: 4.8, life: 0.45, col: [1.0, 0.22, 0.52] });
        return;
      }
      state.vy = 6.8;
      return;
    }

    if (hasRed) {
      damageNearbyBosses(state.px + fwdX * 2.4, state.py + 1.0, state.pz + fwdZ * 2.4, 6.0, 36, { lifesteal: 22 });
      fxPulses.push({ x: state.px + fwdX * 2.2, y: state.py + 1.0, z: state.pz + fwdZ * 2.2, r: 0.5, maxR: 4.8, life: 0.4, col: [1.0, 0.14, 0.18] });
      return;
    }

    if (hasYellow) {
      handleJump();
    }
  }

  function notifyHUD() {
    if (!callbacks?.onHudUpdate) return;
    let modeLabel = 'Nötr Hal (Kanatsız)';
    let skillTitle = 'Küre Aktif Değil';
    let skillDesc = 'Denizdeki veya dünyadaki canlı kürelere dokunarak (veya 1–7 tuşlarıyla) nektar iç!';

    if (state.sovereignEnding) {
      modeLabel = 'Hükümdar Sonu (7 Ana Küre Tek Bedende!)';
      skillTitle = 'Nova Mutlak Hükümdarlığı';
      skillDesc = '7 rengin tamamını taşıyan devasa kanatlar açık; F tuşuyla Nova Tufanı yaratırsın.';
    } else if (state.nectarSlots.length === 1) {
      const c = sphereColors[state.nectarSlots[0]];
      modeLabel = `Tek Küre Aktif (${c.name}) • ${Math.ceil(state.nectarTimer)}sn`;
      skillTitle = c.baseSkillName;
      skillDesc = c.baseSkillDesc;
    } else if (state.nectarSlots.length === 2) {
      const info = getNectarSkillInfo(state.nectarSlots[0], state.nectarSlots[1]);
      modeLabel = `İkili Füzyon Aktif (#${info.canonNo}) • ${Math.ceil(state.nectarTimer)}sn`;
      skillTitle = `${info.skillName} (${info.pairLabel})`;
      skillDesc = info.desc;
    }

    callbacks.onHudUpdate({
      hp: Math.round(state.hp),
      region: state.currentRegion,
      modeLabel,
      skillTitle,
      skillDesc,
      nectarSlots: state.nectarSlots.slice(),
      nectarRatio: state.sovereignEnding ? 1 : (state.nectarTimer / state.nectarMaxTime),
      defeatedCount: state.defeatedCount,
      unlockedOrbs: Array.from(state.unlockedMasterOrbs)
    });
  }

  let simTime = 0;
  let hudTick = 0;
  let lastTs = performance.now();

  function updatePhysics(dt) {
    simTime += dt;
    hudTick += dt;

    // Camera keyboard rotation support (Q / E)
    if (keys.has('KeyQ')) state.camYaw += dt * 1.8;
    if (keys.has('KeyE')) state.camYaw -= dt * 1.8;

    // Movement input relative to camera yaw
    let inFwd = 0, inRight = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) inFwd += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) inFwd -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) inRight += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) inRight -= 1;

    if (inFwd !== 0 || inRight !== 0) {
      const len = Math.hypot(inFwd, inRight);
      inFwd /= len; inRight /= len;
      const sY = Math.sin(state.camYaw), cY = Math.cos(state.camYaw);
      const mx = -sY * inFwd + cY * inRight;
      const mz = -cY * inFwd - sY * inRight;
      const moveSpeed = 11.5;
      state.vx = mix(state.vx, mx * moveSpeed, clamp(dt * 9.0, 0, 1));
      state.vz = mix(state.vz, mz * moveSpeed, clamp(dt * 9.0, 0, 1));
      state.yaw = Math.atan2(-mx, -mz);
    } else {
      state.vx *= Math.pow(0.08, dt);
      state.vz *= Math.pow(0.08, dt);
    }

    // Gravity (feather-fall glide when Pembe=3 is active and falling!)
    const inWater = state.py < -0.55 && state.pz > 20;
    const isGliding = hasColor(3) && state.vy < 0 && !inWater;
    const grav = inWater ? 6.5 : (isGliding ? 4.8 : 24.0);
    state.vy -= grav * dt;
    if (inWater && keys.has('Space')) {
      state.vy = 6.2; // swim upward
    }

    state.px = clamp(state.px + state.vx * dt, -HALF_EXT + 3, HALF_EXT - 3);
    state.pz = clamp(state.pz + state.vz * dt, -HALF_EXT + 3, HALF_EXT - 3);
    state.py += state.vy * dt;

    // Support height from terrain + static sky-islands + dynamic Ice/Vine constructs!
    let floorY = sampleTerrainHeight(state.px, state.pz);
    let steppedTrampoline = false;

    for (const sp of staticPlatforms) {
      if (Math.hypot(state.px - sp.x, state.pz - sp.z) <= sp.r && state.py >= sp.y - 1.2) {
        floorY = Math.max(floorY, sp.y);
      }
    }
    for (const c of constructs) {
      if (c.type === 'decoy') continue;
      const topY = c.y + c.h;
      if (Math.hypot(state.px - c.x, state.pz - c.z) <= c.r + 0.35 && state.py >= topY - 1.35) {
        if (topY > floorY) {
          floorY = topY;
          if (c.type === 'trampoline') steppedTrampoline = true;
        }
      }
    }

    if (state.py <= floorY) {
      const impactVy = state.vy;
      state.py = floorY;
      state.vy = 0;
      state.grounded = true;

      if (steppedTrampoline) {
        state.vy = 22.0;
        state.grounded = false;
      } else if (state.meteorPending && impactVy < -8.0) {
        // #3 Göktaşı Düşüşü landing explosion!
        state.meteorPending = false;
        fxPulses.push({ x: state.px, y: state.py + 0.4, z: state.pz, r: 0.8, maxR: 7.5, life: 0.6, col: [1.0, 0.55, 0.08] });
        damageNearbyBosses(state.px, state.py, state.pz, 8.0, 48);
      } else {
        state.meteorPending = false;
      }
    } else {
      state.grounded = false;
    }

    // Active Nectar Timer countdown (returns character to Neutral & Wingless when expired!)
    if (!state.sovereignEnding && state.nectarTimer > 0) {
      state.nectarTimer = Math.max(0, state.nectarTimer - dt);
      if (state.nectarTimer === 0) {
        state.nectarSlots = [];
        notifyHUD();
      }
    }

    // Wild Nectar Spheres pickup & respawn
    for (const o of wildOrbs) {
      if (o.cooldown > 0) {
        o.cooldown = Math.max(0, o.cooldown - dt);
        continue;
      }
      if (Math.hypot(state.px - o.x, (state.py + 0.9) - o.y, state.pz - o.z) < 1.65) {
        o.cooldown = 10.0;
        drinkNectarColor(o.colorIdx);
      }
    }

    // Update Dynamic Constructs (exploding decoys, melting ice, etc.)
    for (let i = constructs.length - 1; i >= 0; i--) {
      const c = constructs[i];
      c.life -= dt;
      if (c.vx || c.vz) {
        c.x += c.vx * dt;
        c.z += c.vz * dt;
        c.y = sampleTerrainHeight(c.x, c.z);
      }
      if (c.life <= 0) {
        if (c.type === 'decoy') {
          fxPulses.push({ x: c.x, y: c.y + 0.8, z: c.z, r: 0.6, maxR: 5.8, life: 0.5, col: c.colorRGB });
          damageNearbyBosses(c.x, c.y, c.z, 6.5, 36, { freeze: Boolean(c.freezeBlast) });
        }
        constructs.splice(i, 1);
      }
    }

    for (let i = fxPulses.length - 1; i >= 0; i--) {
      fxPulses[i].life -= dt;
      fxPulses[i].r = mix(fxPulses[i].maxR, fxPulses[i].r, Math.max(0, fxPulses[i].life * 1.6));
      if (fxPulses[i].life <= 0) fxPulses.splice(i, 1);
    }
    if (tetherBeam) {
      tetherBeam.life -= dt;
      if (tetherBeam.life <= 0) tetherBeam = null;
    }

    // Region Detection & Boss AI
    let regName = state.pz > 32 ? 'Prolog: Deniz Dibi' : (state.pz > 16 ? 'Issız Kıyı (Tam Özgür Başlangıç)' : 'Nova Açık Bozkırı');
    for (const b of bossEntities) {
      const d = Math.hypot(state.px - b.x, state.pz - b.z);
      if (d < 20) {
        regName = `${b.info.regionName} — ${b.info.bossName} (${b.defeated ? 'Yenildi ✓' : `Boss HP: ${Math.ceil(b.hp)}%`})`;
      }
      if (b.defeated) continue;
      if (b.frozenTimer > 0) { b.frozenTimer -= dt; continue; }
      if (b.snareTimer > 0) { b.snareTimer -= dt; }

      if (d < 16 && Math.abs(state.py - b.y) < 5.5) {
        b.atkCooldown -= dt;
        if (b.atkCooldown <= 0) {
          b.atkCooldown = 3.2;
          fxPulses.push({ x: b.x, y: b.y + 0.8, z: b.z, r: 0.8, maxR: 6.5, life: 0.55, col: b.info.glowRGB });
          if (d < 6.8) {
            state.hp = Math.max(15, state.hp - 12);
          }
        }
      }
    }
    state.currentRegion = regName;

    if (hudTick > 0.25) {
      hudTick = 0;
      notifyHUD();
    }
  }

  function bindMesh(m) {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.posB);
    gl.enableVertexAttribArray(loc.aPosition);
    gl.vertexAttribPointer(loc.aPosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, m.norB);
    gl.enableVertexAttribArray(loc.aNormal);
    gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, m.colB);
    gl.enableVertexAttribArray(loc.aColor);
    gl.vertexAttribPointer(loc.aColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idxB);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTs) * 0.001);
    lastTs = now;

    if (!state.active) {
      requestAnimationFrame(frame);
      return;
    }

    updatePhysics(dt);

    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      requestAnimationFrame(frame);
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const fogCol = state.freedomEnding ? [0.16, 0.28, 0.36] : [0.06, 0.08, 0.13];
    gl.useProgram(prog);
    gl.viewport(0, 0, w, h);
    gl.clearColor(fogCol[0], fogCol[1], fogCol[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    const camX = state.px + Math.sin(state.camYaw) * Math.cos(state.camPitch) * state.camDist;
    const camY = Math.max(sampleTerrainHeight(state.px, state.pz) + 0.6, state.py + 1.5 + Math.sin(state.camPitch) * state.camDist);
    const camZ = state.pz + Math.cos(state.camYaw) * Math.cos(state.camPitch) * state.camDist;
    const camPos = [camX, camY, camZ];
    const vp = mat4ViewProj(camPos, [state.px, state.py + 1.15, state.pz], 0.72, w / h, 0.2, 220.0);

    gl.uniformMatrix4fv(loc.uViewProj, false, vp);
    gl.uniform3fv(loc.uCamPos, camPos);
    gl.uniform3fv(loc.uFogColor, fogCol);
    gl.uniform1f(loc.uTime, simTime);

    const idMat = mat4Identity();
    const idNrm = new Float32Array([1,0,0, 0,1,0, 0,0,1]);

    // 1. Draw Seamless 3D Terrain, Sky-Islands & Regional Monoliths
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.uniformMatrix4fv(loc.uModel, false, idMat);
    gl.uniformMatrix3fv(loc.uNormalMat, false, idNrm);
    gl.uniform1f(loc.uAlpha, 1.0);
    gl.uniform1f(loc.uUnlit, 0.0);
    gl.uniform1f(loc.uSplitMode, 0.0);
    bindMesh(terrainGpu);
    gl.drawElements(gl.TRIANGLES, terrainGpu.count, gl.UNSIGNED_SHORT, 0);

    // 2. Draw Wild 3D Bumpy Nectar Spheres
    bindMesh(orbGpu);
    for (const o of wildOrbs) {
      if (o.cooldown > 0) continue;
      const sc = sphereColors[o.colorIdx];
      const bobY = o.y + Math.sin(simTime * 2.4 + o.x) * 0.18;
      const tr = mat4TRS(o.x, bobY, o.z, simTime * 1.1, 0.42, 0.42, 0.42);
      gl.uniformMatrix4fv(loc.uModel, false, tr.m);
      gl.uniformMatrix3fv(loc.uNormalMat, false, tr.n);
      gl.uniform1f(loc.uSplitMode, 1.0);
      gl.uniform3fv(loc.uColA, sc.core);
      gl.uniform3fv(loc.uColB, sc.tip);
      gl.drawElements(gl.TRIANGLES, orbGpu.count, gl.UNSIGNED_SHORT, 0);
    }

    // 3. Draw 7 Regional Bosses (Winged Towering Figures!)
    for (const b of bossEntities) {
      if (b.defeated) continue;
      const bCol = b.frozenTimer > 0 ? [0.45, 0.88, 1.0] : b.info.accentRGB;
      const bTip = b.frozenTimer > 0 ? [0.75, 0.96, 1.0] : b.info.glowRGB;
      const faceYaw = Math.atan2(state.px - b.x, state.pz - b.z);
      const tr = mat4TRS(b.x, b.y, b.z, faceYaw, 1.65, 1.85, 1.65);
      gl.uniformMatrix4fv(loc.uModel, false, tr.m);
      gl.uniformMatrix3fv(loc.uNormalMat, false, tr.n);
      gl.uniform1f(loc.uSplitMode, 1.0);
      gl.uniform3fv(loc.uColA, bCol);
      gl.uniform3fv(loc.uColB, bTip);
      bindMesh(playerBodyGpu);
      gl.drawElements(gl.TRIANGLES, playerBodyGpu.count, gl.UNSIGNED_SHORT, 0);
      bindMesh(playerWingGpu);
      gl.drawElements(gl.TRIANGLES, playerWingGpu.count, gl.UNSIGNED_SHORT, 0);
    }

    // 4. Draw Playable 8th-Member Protagonist (Neutral Wingless OR Single/Dual Split OR 7-Color Sovereign!)
    const pTr = mat4TRS(state.px, state.py, state.pz, state.yaw, 1.0, 1.0, 1.0);
    gl.uniformMatrix4fv(loc.uModel, false, pTr.m);
    gl.uniformMatrix3fv(loc.uNormalMat, false, pTr.n);
    gl.uniform3f(loc.uLocalCenter, state.px, state.py + 1.0, state.pz);

    let pColA = [0.42, 0.46, 0.54], pColB = [0.42, 0.46, 0.54];
    if (state.sovereignEnding) {
      gl.uniform1f(loc.uSplitMode, 2.0);
    } else if (state.nectarSlots.length === 1) {
      pColA = sphereColors[state.nectarSlots[0]].core;
      pColB = pColA;
      gl.uniform1f(loc.uSplitMode, 1.0);
    } else if (state.nectarSlots.length === 2) {
      pColA = sphereColors[state.nectarSlots[0]].core;
      pColB = sphereColors[state.nectarSlots[1]].core;
      gl.uniform1f(loc.uSplitMode, 1.0);
    } else {
      gl.uniform1f(loc.uSplitMode, 1.0);
    }
    gl.uniform3fv(loc.uColA, pColA);
    gl.uniform3fv(loc.uColB, pColB);

    bindMesh(playerBodyGpu);
    gl.drawElements(gl.TRIANGLES, playerBodyGpu.count, gl.UNSIGNED_SHORT, 0);

    // Draw Temporary Active Wings ONLY when Nectar is Active or Sovereign Ending!
    if (state.nectarSlots.length > 0 || state.sovereignEnding) {
      const wingScale = state.sovereignEnding ? 1.55 : (0.75 + Math.min(3, Math.floor(state.defeatedCount / 2)) * 0.22);
      const flapYaw = Math.sin(simTime * 5.0) * 0.16;
      const wTr = mat4TRS(state.px, state.py, state.pz, state.yaw + flapYaw, wingScale, wingScale, wingScale);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(loc.uAlpha, 0.82);
      gl.uniform1f(loc.uUnlit, 1.0);
      gl.uniformMatrix4fv(loc.uModel, false, wTr.m);
      gl.uniformMatrix3fv(loc.uNormalMat, false, wTr.n);
      bindMesh(playerWingGpu);
      gl.drawElements(gl.TRIANGLES, playerWingGpu.count, gl.UNSIGNED_SHORT, 0);
      gl.uniform1f(loc.uUnlit, 0.0);
      gl.uniform1f(loc.uAlpha, 1.0);
      gl.disable(gl.BLEND);
    }

    // 5. Draw Dynamic Constructs (Ice Platforms, Vine Trampolines, Vine Bridges, Exploding Pink Decoys)
    bindMesh(unitCylGpu);
    for (const c of constructs) {
      const tr = mat4TRS(c.x, c.y, c.z, 0, c.r, c.h, c.r);
      gl.uniformMatrix4fv(loc.uModel, false, tr.m);
      gl.uniformMatrix3fv(loc.uNormalMat, false, tr.n);
      gl.uniform1f(loc.uSplitMode, 1.0);
      gl.uniform3fv(loc.uColA, c.colorRGB);
      gl.uniform3fv(loc.uColB, c.colorRGB);
      gl.drawElements(gl.TRIANGLES, unitCylGpu.count, gl.UNSIGNED_SHORT, 0);
    }

    // 6. Translucent Sea Surface + FX Pulses + Grapple Tether
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    gl.uniformMatrix4fv(loc.uModel, false, idMat);
    gl.uniformMatrix3fv(loc.uNormalMat, false, idNrm);
    gl.uniform1f(loc.uSplitMode, 0.0);
    gl.uniform1f(loc.uAlpha, 0.62);
    bindMesh(waterGpu);
    gl.drawElements(gl.TRIANGLES, waterGpu.count, gl.UNSIGNED_SHORT, 0);

    gl.uniform1f(loc.uUnlit, 1.0);
    bindMesh(unitCylGpu);
    for (const fx of fxPulses) {
      const tr = mat4TRS(fx.x, fx.y, fx.z, 0, fx.r, 0.14, fx.r);
      gl.uniformMatrix4fv(loc.uModel, false, tr.m);
      gl.uniform1f(loc.uSplitMode, 1.0);
      gl.uniform3fv(loc.uColA, fx.col);
      gl.uniform3fv(loc.uColB, fx.col);
      gl.uniform1f(loc.uAlpha, clamp(fx.life, 0.0, 0.75));
      gl.drawElements(gl.TRIANGLES, unitCylGpu.count, gl.UNSIGNED_SHORT, 0);
    }

    if (tetherBeam) {
      const mx = (state.px + tetherBeam.tx) * 0.5;
      const my = (state.py + 1.0 + tetherBeam.ty) * 0.5;
      const mz = (state.pz + tetherBeam.tz) * 0.5;
      const yaw = Math.atan2(tetherBeam.tx - state.px, tetherBeam.tz - state.pz);
      const dist = Math.hypot(tetherBeam.tx - state.px, tetherBeam.tz - state.pz);
      const tr = mat4TRS(mx, my, mz, yaw, 0.12, 0.12, dist * 0.5);
      gl.uniformMatrix4fv(loc.uModel, false, tr.m);
      gl.uniform1f(loc.uSplitMode, 1.0);
      gl.uniform3fv(loc.uColA, tetherBeam.col);
      gl.uniform3fv(loc.uColB, tetherBeam.col);
      gl.uniform1f(loc.uAlpha, 0.85);
      gl.drawElements(gl.TRIANGLES, unitCylGpu.count, gl.UNSIGNED_SHORT, 0);
    }

    gl.depthMask(true);
    gl.uniform1f(loc.uUnlit, 0.0);
    gl.uniform1f(loc.uAlpha, 1.0);
    gl.disable(gl.BLEND);

    requestAnimationFrame(frame);
  }

  notifyHUD();
  requestAnimationFrame(frame);

  return {
    state,
    drinkNectarColor,
    setDualNectar,
    purgeNectar,
    triggerActiveSkill,
    handleJump,
    teleportToRegion(bossIdx) {
      if (bossIdx === 'prolog') {
        state.px = 0; state.pz = 53; state.py = -2.8; state.vy = 0; state.yaw = 0; state.camYaw = 0;
        return;
      }
      const b = bossEntities[bossIdx];
      if (!b) return;
      state.px = b.x;
      state.pz = b.z + 9.5;
      state.py = b.info.id === 'pembe' ? 10.6 : sampleTerrainHeight(state.px, state.pz) + 0.5;
      state.vy = 0;
      state.yaw = 0;
      state.camYaw = 0;
      notifyHUD();
    },
    chooseEnding(which) {
      if (which === 'freedom') {
        // 1. Özgürlük Sonu: Eski sözü tutmak — küreleri halka ve doğaya geri vermek
        state.freedomEnding = true;
        state.sovereignEnding = false;
        state.nectarSlots = [];
        state.nectarTimer = 0;
      } else {
        // 2. Hükümdar Sonu: 7 Ana Kürenin tamamını tek başına içmek!
        state.sovereignEnding = true;
        state.freedomEnding = false;
        state.nectarSlots = [0, 1, 2, 3, 4, 5, 6];
      }
      fxPulses.push({ x: state.px, y: state.py + 1.0, z: state.pz, r: 1.0, maxR: 22.0, life: 1.2, col: [1.0, 0.88, 0.42] });
      notifyHUD();
    }
  };
}
