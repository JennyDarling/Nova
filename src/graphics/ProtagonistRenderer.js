/**
 * Nova — Genç Ana Karakter (Kadın & Erkek) 3D Hacimsel Model, Sivri Kulak,
 * 5 Aşamalı Evrimleşen 3D Kanat ve İki Yarım Küre (Sol/Sağ) Renk Füzyon Motoru.
 */

const PROT_VS = `
  precision highp float;
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec2 aUV;
  attribute vec3 aColor;
  attribute vec2 aFlags;
  // aFlags.x: 0=FrontTex, 1=BackTex, 2=Pedestal, 3=BioOrb, 4=SculptedSkinEar, 5=CrystalWing
  // aFlags.y: wingFlexWeight (for wings) or heightSignal (for orb/wing veins)

  uniform mat4 uProj;
  uniform mat4 uModelView;
  uniform mat3 uNormalMat;
  uniform float uFlapAngle;
  uniform float uTime;
  uniform vec3 uOrbCenter;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vModelPos;
  varying vec2 vUV;
  varying vec3 vColor;
  varying vec2 vFlags;
  varying float vOrbLocalX;

  void main() {
    vec3 pos = aPosition;
    vec3 nor = aNormal;
    vOrbLocalX = 0.0;

    if (aFlags.x > 4.5) {
      // Articulated 3D dorsal wing flexing around spine hinge
      float side = pos.x >= 0.0 ? 1.0 : -1.0;
      vec2 pivot = vec2(side * 0.075, -0.09);
      float ang = side * uFlapAngle * clamp(aFlags.y, 0.0, 1.2);
      float ca = cos(ang);
      float sa = sin(ang);
      vec2 rel = pos.xz - pivot;
      pos.xz = pivot + vec2(rel.x * ca - rel.y * sa, rel.x * sa + rel.y * ca);
      nor.xz = vec2(nor.x * ca - nor.z * sa, nor.x * sa + nor.z * ca);
    } else if (aFlags.x > 2.5 && aFlags.x < 3.5) {
      // Floating bumpy 3D Fusion Sphere beside gauntlet
      vOrbLocalX = pos.x - uOrbCenter.x;
      pos.y += sin(uTime * 2.3) * 0.026;
    }

    vModelPos = pos;
    vec4 mvPos = uModelView * vec4(pos, 1.0);
    vViewPos = mvPos.xyz;
    vNormal = normalize(uNormalMat * nor);
    vUV = aUV;
    vColor = aColor;
    vFlags = aFlags;

    gl_Position = uProj * mvPos;
  }
`;

const PROT_FS = `
  precision highp float;

  uniform sampler2D uTex;
  uniform float uRenderMode;   // 0: Shaded PBR, 1: ZBrush Clay, 2: Wireframe
  uniform float uFusionActive; // 0: Neutral Uninfused, 1: Active Nectar (Single or Dual), 2: Sovereign 7-Color Ending
  uniform float uTimeFrag;
  uniform vec3 uColorA;        // Left Hemisphere Core RGB (x < 0)
  uniform vec3 uTipA;          // Left Hemisphere Bright/Glow RGB
  uniform vec3 uCreviceA;      // Left Hemisphere Deep Shadow RGB
  uniform vec3 uColorB;        // Right Hemisphere Core RGB (x > 0)
  uniform vec3 uTipB;          // Right Hemisphere Bright/Glow RGB
  uniform vec3 uCreviceB;      // Right Hemisphere Deep Shadow RGB
  uniform vec3 uWireColor;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vModelPos;
  varying vec2 vUV;
  varying vec3 vColor;
  varying vec2 vFlags;
  varying float vOrbLocalX;

  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  // 7-Color Nova Spectrum for Hükümdar Sonu (Kırmızı -> Turuncu -> Sarı -> Yeşil -> Mavi -> Mor -> Pembe)
  vec3 novaSpectrum(float t) {
    float p = fract(t) * 7.0;
    vec3 c0 = vec3(0.94, 0.08, 0.14); // Kırmızı
    vec3 c1 = vec3(1.00, 0.44, 0.02); // Turuncu
    vec3 c2 = vec3(1.00, 0.85, 0.04); // Sarı
    vec3 c3 = vec3(0.08, 0.78, 0.26); // Yeşil
    vec3 c4 = vec3(0.06, 0.54, 0.98); // Mavi
    vec3 c5 = vec3(0.52, 0.12, 0.98); // Mor
    vec3 c6 = vec3(1.00, 0.30, 0.68); // Pembe
    if (p < 1.0) return mix(c0, c1, p);
    if (p < 2.0) return mix(c1, c2, p - 1.0);
    if (p < 3.0) return mix(c2, c3, p - 2.0);
    if (p < 4.0) return mix(c3, c4, p - 3.0);
    if (p < 5.0) return mix(c4, c5, p - 4.0);
    if (p < 6.0) return mix(c5, c6, p - 5.0);
    return mix(c6, c0, p - 6.0);
  }

  void main() {
    if (uRenderMode > 1.5) {
      gl_FragColor = vec4(uWireColor, 0.48);
      return;
    }

    vec3 N = normalize(vNormal);
    if (!gl_FrontFacing) {
      N = -N;
    }
    vec3 V = normalize(-vViewPos);
    vec3 L1 = normalize(vec3(0.45, 0.62, 0.72));
    vec3 L2 = normalize(vec3(-0.65, 0.28, -0.45));
    vec3 H1 = normalize(L1 + V);

    bool isTexBody = vFlags.x < 1.5;
    vec4 texSample = vec4(0.5, 0.5, 0.5, 0.0);
    if (isTexBody) {
      texSample = texture2D(uTex, vUV);
      float lC = luma(texSample.rgb);
      float lR = luma(texture2D(uTex, vUV + vec2(0.0012, 0.0)).rgb);
      float lD = luma(texture2D(uTex, vUV + vec2(0.0, 0.0018)).rgb);
      float bs = uRenderMode > 0.5 ? 2.6 : 1.35;
      N = normalize(N + vec3((lC - lR) * bs, (lD - lC) * bs, 0.0));
    }

    float ndl1 = max(dot(N, L1), 0.0);
    float ndl2 = max(dot(N, L2), 0.0);
    float ndh  = max(dot(N, H1), 0.0001);
    float fresnel = pow(clamp(1.0 - max(dot(N, V), 0.0), 0.0001, 1.0), 2.8);

    // ZBrush Clay Sculpt mode
    if (uRenderMode > 0.5) {
      vec3 clay = vec3(0.48, 0.50, 0.55) * (0.22 + 0.76 * ndl1 + 0.26 * ndl2) +
                  vec3(0.72, 0.76, 0.84) * (pow(ndh, 24.0) * 0.24 + fresnel * 0.22);
      gl_FragColor = vec4(clamp(clay, 0.0, 1.0), vFlags.x > 4.5 ? 0.88 : 1.0);
      return;
    }

    bool isSov7 = uFusionActive > 1.5;
    float seamWave = sin(vModelPos.y * 14.0 + vModelPos.z * 9.0) * 0.006;
    float sideBlend = smoothstep(-0.014, 0.014, vModelPos.x + seamWave);
    float seamGlowLine = exp(-pow((vModelPos.x + seamWave) / 0.012, 2.0));

    vec3 cCore = mix(uColorA, uColorB, sideBlend);
    vec3 cTip  = mix(uTipA, uTipB, sideBlend);
    vec3 cDark = mix(uCreviceA, uCreviceB, sideBlend);

    if (isSov7) {
      float band = vModelPos.x * 0.55 + vModelPos.y * 0.42 - uTimeFrag * 0.14;
      cCore = novaSpectrum(band);
      cTip  = mix(cCore, vec3(1.0), 0.45);
      cDark = cCore * 0.28;
    }

    // 1. Evolving 3D Crystal Wings (aFlags.x == 5.0)
    if (vFlags.x > 4.5) {
      float veinMask = vColor.r;
      vec3 wingCore = uFusionActive > 0.5 ? cCore : vec3(0.46, 0.56, 0.72);
      vec3 wingTip  = uFusionActive > 0.5 ? cTip  : vec3(0.82, 0.90, 1.00);
      vec3 wingDark = uFusionActive > 0.5 ? cDark : vec3(0.14, 0.18, 0.26);

      vec3 wBase = mix(mix(wingDark, wingCore, 0.65), wingTip, veinMask * 0.88);
      float transLight = 0.60 + 0.40 * abs(dot(N, L1));
      vec3 wFinal = wBase * transLight + wingTip * (fresnel * 0.50 + pow(ndh, 24.0) * 0.32);
      float alpha = clamp(0.38 + veinMask * 0.58 + fresnel * 0.25, 0.32, 0.96);
      gl_FragColor = vec4(clamp(wFinal, 0.0, 1.0), alpha);
      return;
    }

    // 2. Floating Bumpy 3D Bio-Sphere (aFlags.x == 3.0)
    if (vFlags.x > 2.5 && vFlags.x < 3.5) {
      float hVal = vColor.r * 2.0 - 1.0;
      float orbSide = smoothstep(-0.006, 0.006, vOrbLocalX + sin(vModelPos.y * 28.0) * 0.003);
      vec3 oCore = isSov7 ? cCore : (uFusionActive > 0.5 ? mix(uColorA, uColorB, orbSide) : vec3(0.30, 0.35, 0.44));
      vec3 oTip  = isSov7 ? cTip  : (uFusionActive > 0.5 ? mix(uTipA, uTipB, orbSide)     : vec3(0.62, 0.70, 0.84));
      vec3 oDark = isSov7 ? cDark : (uFusionActive > 0.5 ? mix(uCreviceA, uCreviceB, orbSide) : vec3(0.10, 0.12, 0.16));

      vec3 oAlb = hVal < 0.0 ? mix(oDark, oCore, hVal + 1.0) : mix(oCore, oTip, hVal * 0.85);
      float ao = clamp(0.45 + 0.55 * (hVal * 0.5 + 0.5), 0.28, 1.0);
      vec3 oCol = oAlb * (0.24 + 0.82 * ndl1 + 0.24 * ndl2) * ao +
                  vec3(1.0) * pow(ndh, 36.0) * 0.42 * ao +
                  oTip * fresnel * 0.36;
      gl_FragColor = vec4(clamp(oCol, 0.0, 1.0), 1.0);
      return;
    }

    // 3. Sculpted 3D Pointed Fae Ears (aFlags.x == 4.0) or Textured 3D Protagonist Body (aFlags.x == 0 or 1)
    if (isTexBody || (vFlags.x > 3.5 && vFlags.x < 4.5)) {
      vec3 baseRGB = isTexBody ? texSample.rgb : vColor;
      float skinMask = isTexBody ? texSample.a : 1.0;

      if (uFusionActive > 0.5) {
        float lum = luma(baseRGB);
        vec3 clothInfused = mix(cDark * 0.55, cCore * 1.15, clamp(lum * 1.35, 0.0, 1.0));
        clothInfused = mix(clothInfused, cTip, pow(clamp(lum, 0.0, 1.0), 2.4) * 0.58);

        vec3 skinInfused = mix(cDark * 0.75, mix(cCore, cTip, 0.42), clamp(lum * 1.22, 0.0, 1.0));
        skinInfused = mix(baseRGB, skinInfused, 0.82);

        baseRGB = mix(clothInfused, skinInfused, skinMask);
        if (!isSov7) {
          baseRGB += mix(uTipA, uTipB, 0.5) * seamGlowLine * 0.16;
        }
      }

      float shade = 0.76 + 0.34 * ndl1 + 0.12 * ndl2;
      float spec = pow(ndh, 28.0) * 0.22 * clamp(luma(baseRGB) * 1.4, 0.18, 1.0);
      vec3 rimTint = uFusionActive > 0.5 ? cTip : vec3(0.58, 0.66, 0.80);
      vec3 lit = baseRGB * shade + mix(baseRGB, vec3(1.0), 0.6) * spec + rimTint * fresnel * 0.22;
      gl_FragColor = vec4(clamp(lit, 0.0, 1.0), 1.0);
      return;
    }

    // 4. 360° Stone Turntable Pedestal (aFlags.x == 2.0)
    vec3 pedCol = vColor;
    if (uFusionActive > 0.5 && vFlags.y > 0.5) {
      pedCol = mix(pedCol, cCore, 0.55);
    }
    vec3 pLit = pedCol * (0.24 + 0.78 * ndl1 + 0.24 * ndl2) + vec3(1.0) * pow(ndh, 22.0) * 0.26 + vec3(0.5, 0.55, 0.65) * fresnel * 0.18;
    gl_FragColor = vec4(clamp(pLit, 0.0, 1.0), 1.0);
  }
`;

function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function mix(a, b, t) { return a + (b - a) * t; }
function hash3(x, y, z) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  return mix(
    mix(mix(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), ux), mix(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), ux), uy),
    mix(mix(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), ux), mix(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), ux), uy),
    uz
  ) * 2 - 1;
}

class DynMesh {
  constructor() {
    this.pos = []; this.nor = []; this.uv = []; this.col = []; this.flg = []; this.idx = [];
  }
  pushV(px, py, pz, nx, ny, nz, u, v, cr, cg, cb, mt, wf) {
    const i = this.pos.length / 3;
    this.pos.push(px, py, pz);
    this.nor.push(nx, ny, nz);
    this.uv.push(u, v);
    this.col.push(cr, cg, cb);
    this.flg.push(mt, wf);
    return i;
  }
  toBuffers() {
    const indices = new Uint16Array(this.idx);
    const edgeSet = new Set();
    const wire = [];
    const pE = (a, b) => {
      const lo = a < b ? a : b, hi = a < b ? b : a, k = (lo << 16) | hi;
      if (!edgeSet.has(k)) { edgeSet.add(k); wire.push(lo, hi); }
    };
    for (let i = 0; i < indices.length; i += 3) {
      pE(indices[i], indices[i + 1]);
      pE(indices[i + 1], indices[i + 2]);
      pE(indices[i + 2], indices[i]);
    }
    return {
      positions: new Float32Array(this.pos),
      normals: new Float32Array(this.nor),
      uvs: new Float32Array(this.uv),
      colors: new Float32Array(this.col),
      flags: new Float32Array(this.flg),
      indices,
      wireIndices: new Uint16Array(wire),
      vertCount: this.pos.length / 3,
      triCount: indices.length / 3
    };
  }
}

/**
 * Decodes Protagonist 900x420 Atlas into 1024x512 POT Texture (with skinMask in Alpha!) + Watertight 3D Body/Pedestal/Orb Mesh.
 */
function buildProtagonistBaseFromAtlas(img, prot, gridW = 94, gridH = 132) {
  const tileW = Math.round(img.width / 3);
  const tileH = img.height;

  // Read Geo+Skin Tile first so we can embed skinMask into Front Alpha of 1024x512 POT Texture!
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = img.width;
  srcCanvas.height = img.height;
  const sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0);

  const frontImgData = sctx.getImageData(0, 0, tileW, tileH);
  const backImgData  = sctx.getImageData(tileW, 0, tileW, tileH);
  const geoImgData   = sctx.getImageData(tileW * 2, 0, tileW, tileH);
  const fPx = frontImgData.data;
  const bPx = backImgData.data;
  const gPx = geoImgData.data;

  // Put skinMask (geo Blue channel) into Front Alpha channel, and 0 into Back Alpha channel!
  for (let i = 0; i < tileW * tileH; i++) {
    fPx[i * 4 + 3] = gPx[i * 4 + 2];
    bPx[i * 4 + 3] = 0;
  }

  const tmpF = document.createElement('canvas');
  tmpF.width = tileW; tmpF.height = tileH;
  tmpF.getContext('2d').putImageData(frontImgData, 0, 0);

  const tmpB = document.createElement('canvas');
  tmpB.width = tileW; tmpB.height = tileH;
  tmpB.getContext('2d').putImageData(backImgData, 0, 0);

  const texCanvas = document.createElement('canvas');
  texCanvas.width = 1024;
  texCanvas.height = 512;
  const tctx = texCanvas.getContext('2d');
  tctx.clearRect(0, 0, 1024, 512);
  tctx.drawImage(tmpF, 0, 0, tileW, tileH, 4, 4, 504, 504);
  tctx.drawImage(tmpB, 0, 0, tileW, tileH, 516, 4, 504, 504);

  const rawAlpha = new Float32Array(gridW * gridH);
  const rawZh    = new Float32Array(gridW * gridH);

  for (let r = 0; r < gridH; r++) {
    const v = r / (gridH - 1);
    const y = clamp(v * (tileH - 1), 0, tileH - 1);
    const y0 = Math.floor(y), y1 = Math.min(y0 + 1, tileH - 1), fy = y - y0;
    for (let c = 0; c < gridW; c++) {
      const u = c / (gridW - 1);
      const x = clamp(u * (tileW - 1), 0, tileW - 1);
      const x0 = Math.floor(x), x1 = Math.min(x0 + 1, tileW - 1), fx = x - x0;
      const i00 = (y0 * tileW + x0) * 4, i10 = (y0 * tileW + x1) * 4;
      const i01 = (y1 * tileW + x0) * 4, i11 = (y1 * tileW + x1) * 4;
      const smp = (o) => mix(mix(gPx[i00 + o], gPx[i10 + o], fx), mix(gPx[i01 + o], gPx[i11 + o], fx), fy) / 255.0;
      const k = r * gridW + c;
      const al = smp(0);
      rawAlpha[k] = al;
      rawZh[k] = al > 0.42 ? smp(1) * 0.20 : 0.0;
    }
  }

  const zhSmooth = new Float32Array(gridW * gridH);
  const activeMask = new Uint8Array(gridW * gridH);
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const k = r * gridW + c, fg = rawAlpha[k] > 0.42;
      activeMask[k] = fg ? 1 : 0;
      let sZh = 0, wS = 0;
      for (let dr = -1; dr <= 1; dr++) {
        const rr = clamp(r + dr, 0, gridH - 1);
        for (let dc = -1; dc <= 1; dc++) {
          const cc = clamp(c + dc, 0, gridW - 1);
          const wt = (dr === 0 && dc === 0) ? 4 : (dr === 0 || dc === 0) ? 2 : 1;
          sZh += rawZh[rr * gridW + cc] * wt;
          wS += wt;
        }
      }
      zhSmooth[k] = fg ? (sZh / wS) : 0.0;
    }
  }

  const m = new DynMesh();
  const figH = 1.74;
  const figW = figH * (tileW / tileH);
  const dxS = figW / (gridW - 1);
  const dyS = figH / (gridH - 1);

  for (let side = 0; side < 2; side++) {
    const sZ = side === 0 ? 1.0 : -1.0;
    const vMap = new Int32Array(gridW * gridH).fill(-1);
    const needed = new Uint8Array(gridW * gridH);

    for (let r = 0; r < gridH - 1; r++) {
      for (let c = 0; c < gridW - 1; c++) {
        const k00 = r * gridW + c, k10 = k00 + 1, k01 = k00 + gridW, k11 = k01 + 1;
        if (activeMask[k00] + activeMask[k10] + activeMask[k01] + activeMask[k11] >= 1) {
          needed[k00] = 1; needed[k10] = 1; needed[k01] = 1; needed[k11] = 1;
        }
      }
    }

    for (let r = 0; r < gridH; r++) {
      const v = r / (gridH - 1), wy = (0.5 - v) * figH + 0.05;
      for (let c = 0; c < gridW; c++) {
        const k = r * gridW + c;
        if (!needed[k]) continue;
        const u = c / (gridW - 1), wx = (u - 0.5) * figW;
        const zSurf = sZ * zhSmooth[k];
        const cL = Math.max(0, c - 1), cR = Math.min(gridW - 1, c + 1);
        const rU = Math.max(0, r - 1), rD = Math.min(gridH - 1, r + 1);
        const dzdx = sZ * (zhSmooth[r * gridW + cR] - zhSmooth[r * gridW + cL]) / ((cR - cL) * dxS || dxS);
        const dzdy = sZ * (zhSmooth[rU * gridW + c] - zhSmooth[rD * gridW + c]) / ((rD - rU) * dyS || dyS);
        let nx = side === 0 ? -dzdx : dzdx;
        let ny = side === 0 ? -dzdy : dzdy;
        let nz = sZ;
        const nl = Math.hypot(nx, ny, nz) || 1.0;
        const tU = side === 0 ? (4.0 + u * 504.0) / 1024.0 : (516.0 + u * 504.0) / 1024.0;
        const tV = (4.0 + v * 504.0) / 512.0;
        vMap[k] = m.pushV(wx, wy, zSurf, nx / nl, ny / nl, nz / nl, tU, tV, 1, 1, 1, side === 0 ? 0.0 : 1.0, 0.0);
      }
    }

    for (let r = 0; r < gridH - 1; r++) {
      for (let c = 0; c < gridW - 1; c++) {
        const k00 = r * gridW + c, k10 = k00 + 1, k01 = k00 + gridW, k11 = k01 + 1;
        if (activeMask[k00] + activeMask[k10] + activeMask[k01] >= 1) {
          const a = vMap[k00], b = vMap[k10], d = vMap[k01];
          if (side === 0) m.idx.push(a, b, d); else m.idx.push(a, d, b);
        }
        if (activeMask[k10] + activeMask[k11] + activeMask[k01] >= 1) {
          const b = vMap[k10], e = vMap[k11], d = vMap[k01];
          if (side === 0) m.idx.push(b, e, d); else m.idx.push(b, d, e);
        }
      }
    }
  }

  // 360° Stone Turntable Pedestal (trim ring tagged with wf=1.0 so it picks up Left/Right sphere colors!)
  const pedSegs = 46;
  const pRings = [
    { y: -0.815, r: 0.00, col: [0.17, 0.19, 0.24], ny: 1.0, nr: 0.0, trim: 0.0 },
    { y: -0.815, r: 0.42, col: [0.17, 0.19, 0.24], ny: 1.0, nr: 0.0, trim: 0.0 },
    { y: -0.832, r: 0.44, col: [0.52, 0.56, 0.64], ny: 0.45, nr: 0.89, trim: 1.0 },
    { y: -0.888, r: 0.445, col: [0.12, 0.14, 0.18], ny: 0.05, nr: 1.0, trim: 0.0 },
    { y: -0.912, r: 0.485, col: [0.46, 0.50, 0.58], ny: 0.55, nr: 0.83, trim: 1.0 },
    { y: -0.965, r: 0.495, col: [0.08, 0.09, 0.12], ny: 0.05, nr: 1.0, trim: 0.0 }
  ];
  for (let ri = 0; ri < pRings.length - 1; ri++) {
    const rA = pRings[ri], rB = pRings[ri + 1];
    const sA = m.pos.length / 3;
    for (let s = 0; s <= pedSegs; s++) {
      const th = (s / pedSegs) * Math.PI * 2, sn = Math.sin(th), cs = Math.cos(th), fl = ri === 3 ? 1 + Math.cos(th * 24) * 0.008 : 1;
      const nl = Math.hypot(sn * rA.nr, rA.ny, cs * rA.nr) || 1;
      m.pushV(sn * rA.r * fl, rA.y, cs * rA.r * fl, (sn * rA.nr) / nl, rA.ny / nl, (cs * rA.nr) / nl, 0, 0, rA.col[0], rA.col[1], rA.col[2], 2.0, rA.trim);
    }
    const sB = m.pos.length / 3;
    for (let s = 0; s <= pedSegs; s++) {
      const th = (s / pedSegs) * Math.PI * 2, sn = Math.sin(th), cs = Math.cos(th), fl = ri === 3 ? 1 + Math.cos(th * 24) * 0.008 : 1;
      const nl = Math.hypot(sn * rB.nr, rB.ny, cs * rB.nr) || 1;
      m.pushV(sn * rB.r * fl, rB.y, cs * rB.r * fl, (sn * rB.nr) / nl, rB.ny / nl, (cs * rB.nr) / nl, 0, 0, rB.col[0], rB.col[1], rB.col[2], 2.0, rB.trim);
    }
    for (let s = 0; s < pedSegs; s++) m.idx.push(sA + s, sA + s + 1, sB + s + 1, sA + s, sB + s + 1, sB + s);
  }

  // Floating Two-Color Bumpy 3D Sphere beside Left Gauntlet
  const oR = 20, oC = 26, oP = prot.orbAnchor, oGrid = [];
  for (let r = 0; r <= oR; r++) {
    const ph = (r / oR) * Math.PI, row = [];
    for (let c = 0; c <= oC; c++) {
      const th = (c / oC) * Math.PI * 2;
      const dx = Math.sin(ph) * Math.sin(th), dy = -Math.cos(ph), dz = Math.sin(ph) * Math.cos(th);
      const n1 = noise3(dx * 3.4 + 1.7, dy * 3.4, dz * 3.4);
      const n2 = Math.abs(noise3(dx * 6.5, dy * 6.5 + 2.1, dz * 6.5)) * 2.0 - 0.9;
      const h = clamp(n1 * 0.65 + n2 * 0.35, -1, 1);
      const rad = 0.095 * (1.0 + 0.30 * h);
      row.push({ p: [oP[0] + dx * rad, oP[1] + dy * rad, oP[2] + dz * rad], h01: h * 0.5 + 0.5 });
    }
    oGrid.push(row);
  }
  const oVi = m.pos.length / 3;
  for (let r = 0; r <= oR; r++) {
    for (let c = 0; c <= oC; c++) {
      const cur = oGrid[r][c];
      const pL = oGrid[r][(c - 1 + oC) % oC].p, pR = oGrid[r][(c + 1) % oC].p;
      const pU = oGrid[Math.max(0, r - 1)][c].p, pD = oGrid[Math.min(oR, r + 1)][c].p;
      const ux = pR[0] - pL[0], uy = pR[1] - pL[1], uz = pR[2] - pL[2];
      const vx = pD[0] - pU[0], vy = pD[1] - pU[1], vz = pD[2] - pU[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1;
      m.pushV(cur.p[0], cur.p[1], cur.p[2], nx / nl, ny / nl, nz / nl, 0, 0, cur.h01, cur.h01, cur.h01, 3.0, 0.0);
    }
  }
  for (let r = 0; r < oR; r++) {
    for (let c = 0; c < oC; c++) {
      const i00 = oVi + r * (oC + 1) + c, i10 = i00 + 1, i01 = i00 + oC + 1, i11 = i01 + 1;
      m.idx.push(i00, i10, i11, i00, i11, i01);
    }
  }

  return { texCanvas, mesh: m.toBuffers() };
}

/**
 * Sculpts 3D Pointed Fae/Hybrid Ears anchored cleanly onto the head's exact ear position.
 */
function buildPointedEarsMesh(prot) {
  const m = new DynMesh();
  const [earX, earY] = prot.earAnchor;
  const sk = prot.skinBaseRGB;
  const radial = 10;

  for (const side of [-1, 1]) {
    const spine = [
      { p: [side * (earX - 0.008), earY - 0.006, 0.004], rx: 0.014, ry: 0.021, c: sk },
      { p: [side * (earX + 0.026), earY + 0.010, -0.010], rx: 0.011, ry: 0.016, c: sk },
      { p: [side * (earX + 0.062), earY + 0.028, -0.026], rx: 0.006, ry: 0.009, c: sk },
      { p: [side * (earX + 0.094), earY + 0.045, -0.042], rx: 0.0012, ry: 0.0018, c: [sk[0] * 0.92, sk[1] * 0.88, sk[2] * 0.88] }
    ];
    const baseVi = m.pos.length / 3;
    for (let i = 0; i < spine.length; i++) {
      const s = spine[i];
      for (let k = 0; k <= radial; k++) {
        const th = (k / radial) * Math.PI * 2;
        const ny = Math.cos(th), nz = Math.sin(th);
        // Hollow ear concha slightly on front face
        const concha = (nz > 0.2 && i > 0 && i < 3) ? 0.72 : 1.0;
        const py = s.p[1] + ny * s.ry * concha;
        const pz = s.p[2] + nz * s.rx * concha;
        const nl = Math.hypot(side * 0.25, ny, nz) || 1;
        m.pushV(s.p[0], py, pz, (side * 0.25) / nl, ny / nl, nz / nl, 0, 0, s.c[0], s.c[1], s.c[2], 4.0, 0.0);
      }
    }
    const stride = radial + 1;
    for (let i = 0; i < spine.length - 1; i++) {
      for (let k = 0; k < radial; k++) {
        const i00 = baseVi + i * stride + k, i10 = i00 + 1;
        const i01 = i00 + stride, i11 = i01 + 1;
        if (side > 0) m.idx.push(i00, i01, i11, i00, i11, i10);
        else m.idx.push(i00, i11, i01, i00, i10, i11);
      }
    }
  }
  return m.toBuffers();
}

/**
 * Sculpts 4 Distinct Evolving 3D Crystal Wing Stages (Stages 1..4) with double-sided thickness & glowing veins!
 * Stage 1: Fledgling Crystal Buds (small angular prism shards)
 * Stage 2: Twin Swept Scythe-Blades (medium sleek battle wings)
 * Stage 3: 4-Lobed High-Fae Wings (large upper + lower scalloped crystal wings)
 * Stage 4: 6-Lobed Sovereign Seraph Wings (massive 3-pair radiant multi-tiered wings)
 */
function buildWingStageMesh(stage) {
  if (stage <= 0) return null;
  const m = new DynMesh();

  // Define wing lobes per side for each evolution stage
  let lobes = [];
  if (stage === 1) {
    // Stage 1: Compact crystalline shard-sprouts
    lobes = [
      { rootY: 0.44, elev: 0.52, span: 0.36, chord: 0.14, archZ: 0.12, jag: 0.48, curve: 0.10 },
      { rootY: 0.36, elev: -0.25, span: 0.24, chord: 0.10, archZ: 0.09, jag: 0.42, curve: 0.06 }
    ];
  } else if (stage === 2) {
    // Stage 2: Sleek swept-back twin scythe battle-wings
    lobes = [
      { rootY: 0.45, elev: 0.46, span: 0.72, chord: 0.28, archZ: 0.20, jag: 0.30, curve: 0.22 }
    ];
  } else if (stage === 3) {
    // Stage 3: Classic 4-lobed High-Fae majestic crystal wings
    lobes = [
      { rootY: 0.46, elev: 0.56, span: 0.98, chord: 0.36, archZ: 0.25, jag: 0.22, curve: 0.18 },
      { rootY: 0.36, elev: -0.34, span: 0.70, chord: 0.26, archZ: 0.20, jag: 0.20, curve: -0.10 }
    ];
  } else {
    // Stage 4: 6-lobed Sovereign Seraphic crystal wings
    lobes = [
      { rootY: 0.49, elev: 0.68, span: 1.16, chord: 0.38, archZ: 0.28, jag: 0.26, curve: 0.22 },
      { rootY: 0.41, elev: 0.08, span: 0.94, chord: 0.30, archZ: 0.24, jag: 0.22, curve: 0.08 },
      { rootY: 0.33, elev: -0.50, span: 0.76, chord: 0.25, archZ: 0.20, jag: 0.24, curve: -0.14 }
    ];
  }

  const rows = 12, cols = 18;

  for (const side of [-1, 1]) {
    for (let li = 0; li < lobes.length; li++) {
      const lb = lobes[li];
      const root = [side * 0.065, lb.rootY, -0.095];
      const mid  = [
        root[0] + side * lb.span * 0.46 * Math.cos(lb.elev * 0.55),
        root[1] + lb.span * 0.46 * Math.sin(lb.elev) + lb.curve * 0.5,
        root[2] - lb.archZ * 0.48
      ];
      const tip  = [
        root[0] + side * lb.span * Math.cos(lb.elev * 0.42),
        root[1] + lb.span * Math.sin(lb.elev),
        root[2] - lb.archZ
      ];

      // Emit front & back faces of the crystal wing blade so backface culling works cleanly at 360°
      for (const faceSign of [1, -1]) {
        const baseVi = m.pos.length / 3;
        const gridPts = [];
        for (let r = 0; r <= rows; r++) {
          const v = r / rows;
          const rowArr = [];
          for (let c = 0; c <= cols; c++) {
            const u = c / cols;
            const lead = u < 0.48
              ? [mix(root[0], mid[0], u / 0.48), mix(root[1], mid[1], u / 0.48), mix(root[2], mid[2], u / 0.48)]
              : [mix(mid[0], tip[0], (u - 0.48) / 0.52), mix(mid[1], tip[1], (u - 0.48) / 0.52), mix(mid[2], tip[2], (u - 0.48) / 0.52)];

            const scallop = Math.abs(Math.sin(u * Math.PI * (stage === 1 ? 3.0 : 4.5)));
            const env = Math.sin(Math.pow(u, 0.72) * Math.PI);
            const drop = lb.chord * env * (1.0 - scallop * lb.jag * v);
            const thick = 0.012 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * faceSign;
            const billow = -Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.04;

            const px = lead[0] - side * v * drop * 0.16;
            const py = lead[1] - v * drop;
            const pz = lead[2] + billow + thick;

            // Procedural crystal veins + leading bone + rim glow
            const v1 = Math.pow(Math.max(0, 1.0 - Math.abs(Math.sin(u * 17.0 - v * 6.5))), 8.0);
            const v2 = Math.pow(Math.max(0, 1.0 - Math.abs(Math.sin(u * 33.0 + v * 11.0))), 11.0);
            const bone = Math.pow(1.0 - v, 5.0) * 0.95 + Math.pow(v, 6.0) * 0.55;
            const vein = clamp(v1 * 0.85 + v2 * 0.55 + bone, 0.0, 1.0);

            rowArr.push({ p: [px, py, pz], vein, flex: Math.pow(u, 0.85) });
          }
          gridPts.push(rowArr);
        }

        for (let r = 0; r <= rows; r++) {
          for (let c = 0; c <= cols; c++) {
            const cur = gridPts[r][c];
            const pL = gridPts[r][Math.max(0, c - 1)].p, pR = gridPts[r][Math.min(cols, c + 1)].p;
            const pU = gridPts[Math.max(0, r - 1)][c].p, pD = gridPts[Math.min(rows, r + 1)][c].p;
            const ux = pR[0] - pL[0], uy = pR[1] - pL[1], uz = pR[2] - pL[2];
            const vx = pD[0] - pU[0], vy = pD[1] - pU[1], vz = pD[2] - pU[2];
            let nx = (uy * vz - uz * vy) * side * faceSign;
            let ny = (uz * vx - ux * vz) * side * faceSign;
            let nz = (ux * vy - uy * vx) * side * faceSign;
            const nl = Math.hypot(nx, ny, nz) || 1.0;
            m.pushV(cur.p[0], cur.p[1], cur.p[2], nx / nl, ny / nl, nz / nl, 0, 0, cur.vein, cur.vein, cur.vein, 5.0, cur.flex);
          }
        }

        const stride = cols + 1;
        const flip = (side * faceSign) < 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i00 = baseVi + r * stride + c, i10 = i00 + 1;
            const i01 = i00 + stride, i11 = i01 + 1;
            if (!flip) m.idx.push(i00, i10, i11, i00, i11, i01);
            else m.idx.push(i00, i11, i10, i00, i01, i11);
          }
        }
      }
    }
  }

  return m.toBuffers();
}

function perspective(fovRad, aspect, near, far) {
  const f = 1.0 / Math.tan(fovRad * 0.5);
  const nf = 1.0 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2 * far * near) * nf, 0
  ]);
}

function buildModelView(tx, ty, tz, scale, rotX, rotY) {
  const cx = Math.cos(rotX), sx = Math.sin(rotX);
  const cy = Math.cos(rotY), sy = Math.sin(rotY);
  const r00 = cy,       r01 = 0,  r02 = sy;
  const r10 = sx * sy,  r11 = cx, r12 = -sx * cy;
  const r20 = -cx * sy, r21 = sx, r22 = cx * cy;
  return {
    mv: new Float32Array([
      r00 * scale, r10 * scale, r20 * scale, 0,
      r01 * scale, r11 * scale, r21 * scale, 0,
      r02 * scale, r12 * scale, r22 * scale, 0,
      tx, ty, tz, 1
    ]),
    nm: new Float32Array([r00, r10, r20, r01, r11, r21, r02, r12, r22])
  };
}

export function createProtagonist3DRenderer(canvas, protagonists, sphereColors, onReady) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL desteklenmiyor.');

  const compile = (t, s) => {
    const sh = gl.createShader(t);
    gl.shaderSource(sh, s);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, PROT_VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, PROT_FS));
  gl.linkProgram(prog);

  const loc = {
    aPosition: gl.getAttribLocation(prog, 'aPosition'),
    aNormal: gl.getAttribLocation(prog, 'aNormal'),
    aUV: gl.getAttribLocation(prog, 'aUV'),
    aColor: gl.getAttribLocation(prog, 'aColor'),
    aFlags: gl.getAttribLocation(prog, 'aFlags'),
    uProj: gl.getUniformLocation(prog, 'uProj'),
    uModelView: gl.getUniformLocation(prog, 'uModelView'),
    uNormalMat: gl.getUniformLocation(prog, 'uNormalMat'),
    uFlapAngle: gl.getUniformLocation(prog, 'uFlapAngle'),
    uTime: gl.getUniformLocation(prog, 'uTime'),
    uTimeFrag: gl.getUniformLocation(prog, 'uTimeFrag'),
    uOrbCenter: gl.getUniformLocation(prog, 'uOrbCenter'),
    uTex: gl.getUniformLocation(prog, 'uTex'),
    uRenderMode: gl.getUniformLocation(prog, 'uRenderMode'),
    uFusionActive: gl.getUniformLocation(prog, 'uFusionActive'),
    uColorA: gl.getUniformLocation(prog, 'uColorA'),
    uTipA: gl.getUniformLocation(prog, 'uTipA'),
    uCreviceA: gl.getUniformLocation(prog, 'uCreviceA'),
    uColorB: gl.getUniformLocation(prog, 'uColorB'),
    uTipB: gl.getUniformLocation(prog, 'uTipB'),
    uCreviceB: gl.getUniformLocation(prog, 'uCreviceB'),
    uWireColor: gl.getUniformLocation(prog, 'uWireColor')
  };

  function uploadBuffers(raw) {
    if (!raw) return null;
    const mk = (t, d) => { const b = gl.createBuffer(); gl.bindBuffer(t, b); gl.bufferData(t, d, gl.STATIC_DRAW); return b; };
    return {
      raw,
      posB: mk(gl.ARRAY_BUFFER, raw.positions),
      norB: mk(gl.ARRAY_BUFFER, raw.normals),
      uvB: mk(gl.ARRAY_BUFFER, raw.uvs),
      colB: mk(gl.ARRAY_BUFFER, raw.colors),
      flgB: mk(gl.ARRAY_BUFFER, raw.flags),
      idxB: mk(gl.ELEMENT_ARRAY_BUFFER, raw.indices),
      wireB: mk(gl.ELEMENT_ARRAY_BUFFER, raw.wireIndices),
      triLen: raw.indices.length,
      wireLen: raw.wireIndices.length,
      vertCount: raw.vertCount,
      triCount: raw.triCount
    };
  }

  // Prebuild all 4 evolving 3D wing stage meshes once!
  const wingGpuStages = [0, 1, 2, 3, 4].map((st) => uploadBuffers(buildWingStageMesh(st)));
  const protGpu = new Array(protagonists.length).fill(null);

  protagonists.forEach((p, idx) => {
    const earsGpu = uploadBuffers(buildPointedEarsMesh(p));
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const built = buildProtagonistBaseFromAtlas(img, p);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, built.texCanvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      protGpu[idx] = {
        tex,
        body: uploadBuffers(built.mesh),
        ears: earsGpu
      };
      if (onReady) onReady(idx);
    };
    img.src = p.atlasDataUri || p.atlasUrl;
  });

  const state = {
    active: true,
    genderMode: 'kadin',   // 'kadin' | 'erkek' | 'both'
    earType: 'pointed',    // 'human' | 'pointed'
    nectarMode: 'dual',    // 'neutral' (Kanatsız) | 'single' (Tek Küre) | 'dual' (İkili Füzyon) | 'sovereign7' (Hükümdar Sonu)
    wingStage: 2,          // 1..4 when nectar is active
    colorA: 6,             // Default: Sarı (Left Half — Uçan Sapan #1)
    colorB: 4,             // Default: Mor (Right Half — Uçan Sapan #1)
    cameraPreset: 'full',  // 'full' | 'bust' | 'back'
    renderStyle: 'shaded', // 'shaded' | 'clay' | 'wireframe'
    rotX: 0.07,
    rotY: -0.22,
    velX: 0,
    velY: 0,
    zoomDist: 0,
    animate: true,
    isDragging: false
  };

  let simTime = 0;
  let lastTs = performance.now();

  // Canon rule: Wings ONLY appear while a sphere nectar is active! Neutral state is strictly wingless.
  function getEffectiveWingStage() {
    if (state.nectarMode === 'neutral') return 0;
    if (state.nectarMode === 'sovereign7') return 4;
    return clamp(state.wingStage, 1, 4);
  }

  function bindPart(part) {
    const at = (b, l, sz) => { gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, sz, gl.FLOAT, false, 0, 0); };
    at(part.posB, loc.aPosition, 3);
    at(part.norB, loc.aNormal, 3);
    at(part.uvB, loc.aUV, 2);
    at(part.colB, loc.aColor, 3);
    at(part.flgB, loc.aFlags, 2);
  }

  function drawProtagonistInstance(pIdx, mv, nm, flap) {
    const pm = protGpu[pIdx];
    if (!pm) return;
    const prot = protagonists[pIdx];
    const effStage = getEffectiveWingStage();
    const wingPart = wingGpuStages[effStage];

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pm.tex);
    gl.uniform1i(loc.uTex, 0);
    gl.uniformMatrix4fv(loc.uModelView, false, mv);
    gl.uniformMatrix3fv(loc.uNormalMat, false, nm);
    gl.uniform1f(loc.uFlapAngle, flap);
    gl.uniform1f(loc.uTime, simTime + pIdx * 1.1);
    gl.uniform1f(loc.uTimeFrag, simTime);
    gl.uniform3fv(loc.uOrbCenter, prot.orbAnchor);
    gl.uniform1f(loc.uRenderMode, state.renderStyle === 'clay' ? 1.0 : 0.0);

    if (state.renderStyle === 'wireframe') {
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(1.0, 1.0);
    }

    // 1. Opaque Body + Pedestal + Bio-Sphere
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    bindPart(pm.body);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pm.body.idxB);
    gl.drawElements(gl.TRIANGLES, pm.body.triLen, gl.UNSIGNED_SHORT, 0);

    // 2. Optional 3D Pointed Fae Ears
    if (state.earType === 'pointed' && pm.ears) {
      bindPart(pm.ears);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pm.ears.idxB);
      gl.drawElements(gl.TRIANGLES, pm.ears.triLen, gl.UNSIGNED_SHORT, 0);
    }

    // 3. Temporary Active Nectar 3D Crystal Wings (hidden in Neutral state!)
    if (wingPart) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      bindPart(wingPart);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wingPart.idxB);
      gl.drawElements(gl.TRIANGLES, wingPart.triLen, gl.UNSIGNED_SHORT, 0);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    // 4. Optional 3D Wireframe Overlay
    if (state.renderStyle === 'wireframe') {
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.uniform1f(loc.uRenderMode, 2.0);
      gl.uniform3f(loc.uWireColor, 0.75, 0.90, 1.0);

      bindPart(pm.body);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pm.body.wireB);
      gl.drawElements(gl.LINES, pm.body.wireLen, gl.UNSIGNED_SHORT, 0);

      if (state.earType === 'pointed' && pm.ears) {
        bindPart(pm.ears);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, pm.ears.wireB);
        gl.drawElements(gl.LINES, pm.ears.wireLen, gl.UNSIGNED_SHORT, 0);
      }
      if (wingPart) {
        bindPart(wingPart);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wingPart.wireB);
        gl.drawElements(gl.LINES, wingPart.wireLen, gl.UNSIGNED_SHORT, 0);
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTs) * 0.001);
    lastTs = now;

    if (!state.active) {
      requestAnimationFrame(frame);
      return;
    }

    if (state.animate) {
      simTime += dt;
      if (!state.isDragging) {
        if (state.cameraPreset === 'back') {
          state.rotY = Math.PI + Math.sin(simTime * 0.65) * 0.36;
        } else if (Math.abs(state.rotY) < 1.15 && Math.hypot(state.velX, state.velY) < 0.002) {
          state.rotY = Math.sin(simTime * 0.65) * 0.48;
        } else {
          state.rotY += dt * 0.24;
        }
      }
    }
    if (!state.isDragging) {
      state.rotY += state.velY;
      state.rotX = Math.max(-1.15, Math.min(1.15, state.rotX + state.velX));
      state.velX *= 0.90;
      state.velY *= 0.90;
    }

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

    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const cA = sphereColors[state.colorA] || sphereColors[0];
    const cB = state.nectarMode === 'single' ? cA : (sphereColors[state.colorB] || sphereColors[4]);
    const fusionVal = state.nectarMode === 'neutral' ? 0.0 : (state.nectarMode === 'sovereign7' ? 2.0 : 1.0);

    gl.uniform1f(loc.uFusionActive, fusionVal);
    gl.uniform3fv(loc.uColorA, cA.core);
    gl.uniform3fv(loc.uTipA, cA.tip);
    gl.uniform3fv(loc.uCreviceA, cA.crevice);
    gl.uniform3fv(loc.uColorB, cB.core);
    gl.uniform3fv(loc.uTipB, cB.tip);
    gl.uniform3fv(loc.uCreviceB, cB.crevice);

    const aspect = w / h;
    const fov = 0.54;
    const proj = perspective(fov, aspect, 0.1, 60.0);
    gl.uniformMatrix4fv(loc.uProj, false, proj);

    const flap = state.animate ? Math.sin(simTime * 2.0) * 0.16 : 0.0;

    if (state.genderMode === 'both') {
      const dist = Math.max(3.9, 2.55 / (Math.tan(fov * 0.5) * aspect)) + state.zoomDist * 0.72;
      const { mv: mvF, nm: nmF } = buildModelView(-0.78, 0.04, -dist, 0.94, state.rotX, state.rotY + 0.08);
      drawProtagonistInstance(0, mvF, nmF, flap);
      const { mv: mvM, nm: nmM } = buildModelView(0.78, 0.04, -dist, 0.94, state.rotX, state.rotY - 0.08);
      drawProtagonistInstance(1, mvM, nmM, -flap * 0.9);
    } else {
      const pIdx = state.genderMode === 'erkek' ? 1 : 0;
      const isBust = state.cameraPreset === 'bust';
      const ty = isBust ? -0.48 : 0.04;
      const baseDist = isBust ? 1.78 : 3.78;
      const camZ = -(baseDist + state.zoomDist * (isBust ? 0.35 : 0.72));
      const { mv, nm } = buildModelView(0, ty, camZ, 1.0, state.rotX, state.rotY);
      drawProtagonistInstance(pIdx, mv, nm, flap);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return {
    state,
    getEffectiveWingStage,
    getTriangleStats() {
      const indices = state.genderMode === 'both' ? [0, 1] : [state.genderMode === 'erkek' ? 1 : 0];
      const effStage = getEffectiveWingStage();
      let verts = 0, tris = 0;
      for (const idx of indices) {
        const pm = protGpu[idx];
        if (!pm) continue;
        verts += pm.body.vertCount;
        tris += pm.body.triCount;
        if (state.earType === 'pointed' && pm.ears) {
          verts += pm.ears.vertCount;
          tris += pm.ears.triCount;
        }
        const wp = wingGpuStages[effStage];
        if (wp) {
          verts += wp.vertCount;
          tris += wp.triCount;
        }
      }
      return { verts, tris };
    },
    exportCurrentOBJ() {
      const pIdx = state.genderMode === 'erkek' ? 1 : 0;
      const pm = protGpu[pIdx];
      if (!pm) return '';
      const prot = protagonists[pIdx];
      const effStage = getEffectiveWingStage();
      const parts = [['BodyAndOrb', pm.body.raw]];
      if (state.earType === 'pointed' && pm.ears) parts.push(['PointedFaeEars', pm.ears.raw]);
      const wp = wingGpuStages[effStage];
      if (wp) parts.push([`Wings_Stage_${effStage}`, wp.raw]);

      const lines = [`# Nova 3D Protagonist: ${prot.label} (Mode: ${state.nectarMode}, Wing Stage ${effStage}, Ears: ${state.earType})`];
      let vOff = 1;
      for (const [name, raw] of parts) {
        lines.push(`o ${name}`);
        for (let i = 0; i < raw.vertCount; i++) {
          lines.push(`v ${raw.positions[i * 3].toFixed(5)} ${raw.positions[i * 3 + 1].toFixed(5)} ${raw.positions[i * 3 + 2].toFixed(5)}`);
        }
        for (let i = 0; i < raw.indices.length; i += 3) {
          lines.push(`f ${raw.indices[i] + vOff} ${raw.indices[i + 1] + vOff} ${raw.indices[i + 2] + vOff}`);
        }
        vOff += raw.vertCount;
      }
      return lines.join('\n');
    },
    resetView() {
      state.cameraPreset = state.cameraPreset === 'back' ? 'full' : state.cameraPreset;
      state.rotX = state.cameraPreset === 'bust' ? 0.04 : 0.07;
      state.rotY = -0.22;
      state.velX = 0;
      state.velY = 0;
      state.zoomDist = 0;
    }
  };
}
