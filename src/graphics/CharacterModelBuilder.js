/**
 * Nova — Yüksek Detaylı 3D Hacimsel Karakter & Kaide & Organik Küre Modelleyici
 * 900x400 PBR + Derinlik Atlasından (Ön Doku + Arka Doku + 3-Kanallı Hacim Haritası)
 * su sızdırmaz (watertight) çift taraflı 3D karakter poligon ağını, 360° taş kaidesini ve
 * yanında süzülen 3D girintili-çıkıntılı organik küresini üretir.
 */

function clamp(x, a, b) {
  return x < a ? a : x > b ? b : x;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const n000 = hash3(ix, iy, iz),         n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz),     n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1),     n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1), n111 = hash3(ix + 1, iy + 1, iz + 1);
  return mix(
    mix(mix(n000, n100, ux), mix(n010, n110, ux), uy),
    mix(mix(n001, n101, ux), mix(n011, n111, ux), uy),
    uz
  ) * 2 - 1;
}

/**
 * Decodes a loaded 900x400 Atlas Image into:
 * 1) A 1024x512 Power-Of-Two <canvas> containing Front [4..508] & Back [516..1020] PBR Albedo for mipmapped WebGL texturing
 * 2) Complete 3D Mesh TypedArrays (positions, normals, uvs, colors, flags, indices, wireIndices)
 */
export function buildVolumetricCharacterFromAtlas(img, ch, gridW = 98, gridH = 132) {
  const tileW = Math.round(img.width / 3);
  const tileH = img.height;

  // 1. Build 1024x512 POT Albedo Texture Canvas (Left half = Front, Right half = Back, padded margins)
  const texCanvas = document.createElement('canvas');
  texCanvas.width = 1024;
  texCanvas.height = 512;
  const tctx = texCanvas.getContext('2d');
  tctx.drawImage(img, 0, 0, tileW, tileH, 4, 4, 504, 504);
  tctx.drawImage(img, tileW, 0, tileW, tileH, 516, 4, 504, 504);

  // 2. Read 3-channel Geometry Tile (R = alpha, G = z_half/0.20, B = z_arch/0.32)
  const geoCanvas = document.createElement('canvas');
  geoCanvas.width = tileW;
  geoCanvas.height = tileH;
  const gctx = geoCanvas.getContext('2d', { willReadFrequently: true });
  gctx.drawImage(img, tileW * 2, 0, tileW, tileH, 0, 0, tileW, tileH);
  const gData = gctx.getImageData(0, 0, tileW, tileH).data;

  function sampleGeo(u, v) {
    const x = clamp(u * (tileW - 1), 0, tileW - 1);
    const y = clamp(v * (tileH - 1), 0, tileH - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, tileW - 1), y1 = Math.min(y0 + 1, tileH - 1);
    const fx = x - x0, fy = y - y0;

    const idx00 = (y0 * tileW + x0) * 4;
    const idx10 = (y0 * tileW + x1) * 4;
    const idx01 = (y1 * tileW + x0) * 4;
    const idx11 = (y1 * tileW + x1) * 4;

    const bilerp = (chOff) => mix(
      mix(gData[idx00 + chOff], gData[idx10 + chOff], fx),
      mix(gData[idx01 + chOff], gData[idx11 + chOff], fx),
      fy
    ) / 255.0;

    return {
      alpha: bilerp(0),
      zHalf: bilerp(1) * 0.205,
      zArch: bilerp(2) * 0.32
    };
  }

  // Sample onto regular (gridH x gridW) grid and apply light 3x3 smoothing on zHalf/zArch
  const rawAlpha = new Float32Array(gridW * gridH);
  const rawZh    = new Float32Array(gridW * gridH);
  const rawZa    = new Float32Array(gridW * gridH);

  for (let r = 0; r < gridH; r++) {
    const v = r / (gridH - 1);
    for (let c = 0; c < gridW; c++) {
      const u = c / (gridW - 1);
      const s = sampleGeo(u, v);
      const k = r * gridW + c;
      rawAlpha[k] = s.alpha;
      rawZh[k] = s.alpha > 0.42 ? s.zHalf : 0.0;
      rawZa[k] = s.zArch;
    }
  }

  const zhSmooth = new Float32Array(gridW * gridH);
  const zaSmooth = new Float32Array(gridW * gridH);
  const activeMask = new Uint8Array(gridW * gridH);

  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const k = r * gridW + c;
      const isFg = rawAlpha[k] > 0.42;
      activeMask[k] = isFg ? 1 : 0;

      let sumZh = 0, sumZa = 0, wSum = 0;
      for (let dr = -1; dr <= 1; dr++) {
        const rr = clamp(r + dr, 0, gridH - 1);
        for (let dc = -1; dc <= 1; dc++) {
          const cc = clamp(c + dc, 0, gridW - 1);
          const wt = (dr === 0 && dc === 0) ? 4 : (dr === 0 || dc === 0) ? 2 : 1;
          const kk = rr * gridW + cc;
          sumZh += rawZh[kk] * wt;
          sumZa += rawZa[kk] * wt;
          wSum += wt;
        }
      }
      // Keep exact 0 half-thickness on exterior silhouette ring so Front & Back shells close 100% watertight!
      zhSmooth[k] = isFg ? (sumZh / wSum) : 0.0;
      zaSmooth[k] = sumZa / wSum;
    }
  }

  const pos = [];
  const nor = [];
  const uv  = [];
  const col = [];
  const flg = []; // [matType, wingFlexWeight] — matType: 0=FrontTex, 1=BackTex, 2=Untextured3DMetal/Stone, 3=Untextured3DGlowOrb
  const idx = [];

  function pushVert(px, py, pz, nx, ny, nz, u, v, cr, cg, cb, matType, wingW) {
    const vi = pos.length / 3;
    pos.push(px, py, pz);
    nor.push(nx, ny, nz);
    uv.push(u, v);
    col.push(cr, cg, cb);
    flg.push(matType, wingW);
    return vi;
  }

  const figH = 1.74;
  const aspect = tileW / tileH;
  const figW = figH * aspect;
  const dxStep = figW / (gridW - 1);
  const dyStep = figH / (gridH - 1);

  // Helper to emit Front (side=0) and Back (side=1) sculpted 3D shells
  for (let side = 0; side < 2; side++) {
    const signZ = side === 0 ? 1.0 : -1.0;
    const vertMap = new Int32Array(gridW * gridH).fill(-1);

    // Determine which vertices participate in at least one foreground triangle
    const needed = new Uint8Array(gridW * gridH);
    for (let r = 0; r < gridH - 1; r++) {
      for (let c = 0; c < gridW - 1; c++) {
        const k00 = r * gridW + c;
        const k10 = k00 + 1;
        const k01 = k00 + gridW;
        const k11 = k01 + 1;
        if (activeMask[k00] + activeMask[k10] + activeMask[k01] + activeMask[k11] >= 1) {
          needed[k00] = 1; needed[k10] = 1; needed[k01] = 1; needed[k11] = 1;
        }
      }
    }

    for (let r = 0; r < gridH; r++) {
      const v = r / (gridH - 1);
      const wy = (0.5 - v) * figH + 0.05;
      for (let c = 0; c < gridW; c++) {
        const k = r * gridW + c;
        if (!needed[k]) continue;
        const u = c / (gridW - 1);
        const wx = (u - 0.5) * figW;
        const zSurf = -zaSmooth[k] + signZ * zhSmooth[k];

        // Finite-difference 3D surface normal
        const cL = Math.max(0, c - 1), cR = Math.min(gridW - 1, c + 1);
        const rU = Math.max(0, r - 1), rD = Math.min(gridH - 1, r + 1);
        const zL = -zaSmooth[r * gridW + cL] + signZ * zhSmooth[r * gridW + cL];
        const zR = -zaSmooth[r * gridW + cR] + signZ * zhSmooth[r * gridW + cR];
        const zU = -zaSmooth[rU * gridW + c] + signZ * zhSmooth[rU * gridW + c];
        const zD = -zaSmooth[rD * gridW + c] + signZ * zhSmooth[rD * gridW + c];

        const dzdx = (zR - zL) / ((cR - cL) * dxStep || dxStep);
        const dzdy = (zU - zD) / ((rD - rU) * dyStep || dyStep);

        let nx = side === 0 ? -dzdx : dzdx;
        let ny = side === 0 ? -dzdy : dzdy;
        let nz = signZ;
        const nl = Math.hypot(nx, ny, nz) || 1.0;
        nx /= nl; ny /= nl; nz /= nl;

        // Map UV into 1024x512 POT canvas ([4..508]/1024 for Front, [516..1020]/1024 for Back)
        const texU = side === 0
          ? (4.0 + u * 504.0) / 1024.0
          : (516.0 + u * 504.0) / 1024.0;
        const texV = (4.0 + v * 504.0) / 512.0;

        // Wing flex weight smoothly proportional to backward arch
        const wingFlex = clamp(zaSmooth[k] / 0.24, 0.0, 1.0);
        vertMap[k] = pushVert(wx, wy, zSurf, nx, ny, nz, texU, texV, 1, 1, 1, side === 0 ? 0.0 : 1.0, wingFlex);
      }
    }

    for (let r = 0; r < gridH - 1; r++) {
      for (let c = 0; c < gridW - 1; c++) {
        const k00 = r * gridW + c;
        const k10 = k00 + 1;
        const k01 = k00 + gridW;
        const k11 = k01 + 1;

        if (activeMask[k00] + activeMask[k10] + activeMask[k01] >= 1) {
          const a = vertMap[k00], b = vertMap[k10], d = vertMap[k01];
          if (a >= 0 && b >= 0 && d >= 0) {
            if (side === 0) idx.push(a, b, d);
            else idx.push(a, d, b);
          }
        }
        if (activeMask[k10] + activeMask[k11] + activeMask[k01] >= 1) {
          const b = vertMap[k10], e = vertMap[k11], d = vertMap[k01];
          if (b >= 0 && e >= 0 && d >= 0) {
            if (side === 0) idx.push(b, e, d);
            else idx.push(b, d, e);
          }
        }
      }
    }
  }

  // 3. True 360° Sculpted Dark-Stone & Engraved Trim Turntable Pedestal
  const pedSegs = 48;
  const darkStone = [0.13, 0.14, 0.18];
  const topStone  = [0.18, 0.20, 0.25];
  const deepBase  = [0.08, 0.09, 0.12];
  const trimCol   = ch.trimRGB || [0.65, 0.52, 0.26];

  const pedRings = [
    { y: -0.815, r: 0.00, col: topStone,  ny: 1.0, nr: 0.0 },
    { y: -0.815, r: 0.43, col: topStone,  ny: 1.0, nr: 0.0 },
    { y: -0.832, r: 0.45, col: trimCol,   ny: 0.45, nr: 0.89 },
    { y: -0.888, r: 0.455, col: darkStone, ny: 0.05, nr: 1.0 },
    { y: -0.912, r: 0.495, col: trimCol,   ny: 0.55, nr: 0.83 },
    { y: -0.968, r: 0.505, col: deepBase,  ny: 0.05, nr: 1.0 }
  ];

  for (let ri = 0; ri < pedRings.length - 1; ri++) {
    const rA = pedRings[ri];
    const rB = pedRings[ri + 1];
    const ringStartA = pos.length / 3;
    for (let s = 0; s <= pedSegs; s++) {
      const th = (s / pedSegs) * Math.PI * 2;
      const sn = Math.sin(th), cs = Math.cos(th);
      const flute = (ri === 3) ? (1.0 + Math.cos(th * 24) * 0.008) : 1.0;
      const nrmA = Math.hypot(sn * rA.nr, rA.ny, cs * rA.nr) || 1;
      pushVert(sn * rA.r * flute, rA.y, cs * rA.r * flute, (sn * rA.nr) / nrmA, rA.ny / nrmA, (cs * rA.nr) / nrmA, 0, 0, rA.col[0], rA.col[1], rA.col[2], 2.0, 0.0);
    }
    const ringStartB = pos.length / 3;
    for (let s = 0; s <= pedSegs; s++) {
      const th = (s / pedSegs) * Math.PI * 2;
      const sn = Math.sin(th), cs = Math.cos(th);
      const flute = (ri === 3) ? (1.0 + Math.cos(th * 24) * 0.008) : 1.0;
      const nrmB = Math.hypot(sn * rB.nr, rB.ny, cs * rB.nr) || 1;
      pushVert(sn * rB.r * flute, rB.y, cs * rB.r * flute, (sn * rB.nr) / nrmB, rB.ny / nrmB, (cs * rB.nr) / nrmB, 0, 0, rB.col[0], rB.col[1], rB.col[2], 2.0, 0.0);
    }
    for (let s = 0; s < pedSegs; s++) {
      const i00 = ringStartA + s, i10 = ringStartA + s + 1;
      const i01 = ringStartB + s, i11 = ringStartB + s + 1;
      idx.push(i00, i10, i11, i00, i11, i01);
    }
  }

  // 4. Floating 360° Bumpy Bacterial/Organic 3D Sphere beside the character!
  const orbRows = 20, orbCols = 26;
  const orbCenter = [0.40, -0.06, 0.22];
  const orbBaseR = 0.088;
  const orbGrid = [];

  for (let r = 0; r <= orbRows; r++) {
    const ph = (r / orbRows) * Math.PI;
    const rowArr = [];
    for (let c = 0; c <= orbCols; c++) {
      const th = (c / orbCols) * Math.PI * 2;
      const dx = Math.sin(ph) * Math.sin(th);
      const dy = -Math.cos(ph);
      const dz = Math.sin(ph) * Math.cos(th);
      const n1 = noise3(dx * 3.4 + ch.colorIndex * 2.3, dy * 3.4, dz * 3.4);
      const n2 = Math.abs(noise3(dx * 6.4, dy * 6.4 + ch.colorIndex, dz * 6.4)) * 2.0 - 0.9;
      const h = clamp(n1 * 0.65 + n2 * 0.35, -1, 1);
      const rad = orbBaseR * (1.0 + 0.30 * h);
      const tCol = clamp(h * 0.5 + 0.5, 0, 1);
      const cR = h < 0 ? mix(ch.darkRGB[0], ch.accentRGB[0], tCol * 2) : mix(ch.accentRGB[0], ch.glowRGB[0], (tCol - 0.5) * 1.6);
      const cG = h < 0 ? mix(ch.darkRGB[1], ch.accentRGB[1], tCol * 2) : mix(ch.accentRGB[1], ch.glowRGB[1], (tCol - 0.5) * 1.6);
      const cB = h < 0 ? mix(ch.darkRGB[2], ch.accentRGB[2], tCol * 2) : mix(ch.accentRGB[2], ch.glowRGB[2], (tCol - 0.5) * 1.6);
      rowArr.push({
        p: [orbCenter[0] + dx * rad, orbCenter[1] + dy * rad, orbCenter[2] + dz * rad],
        c: [cR, cG, cB]
      });
    }
    orbGrid.push(rowArr);
  }

  const orbBaseVi = pos.length / 3;
  for (let r = 0; r <= orbRows; r++) {
    for (let c = 0; c <= orbCols; c++) {
      const cur = orbGrid[r][c];
      const cP = (c - 1 + orbCols) % orbCols;
      const cN = (c + 1) % orbCols;
      const rP = Math.max(0, r - 1), rN = Math.min(orbRows, r + 1);
      const ux = orbGrid[r][cN].p[0] - orbGrid[r][cP].p[0];
      const uy = orbGrid[r][cN].p[1] - orbGrid[r][cP].p[1];
      const uz = orbGrid[r][cN].p[2] - orbGrid[r][cP].p[2];
      const vx = orbGrid[rN][c].p[0] - orbGrid[rP][c].p[0];
      const vy = orbGrid[rN][c].p[1] - orbGrid[rP][c].p[1];
      const vz = orbGrid[rN][c].p[2] - orbGrid[rP][c].p[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      pushVert(cur.p[0], cur.p[1], cur.p[2], nx / nl, ny / nl, nz / nl, 0, 0, cur.c[0], cur.c[1], cur.c[2], 3.0, 2.0);
    }
  }
  const orbStride = orbCols + 1;
  for (let r = 0; r < orbRows; r++) {
    for (let c = 0; c < orbCols; c++) {
      const i00 = orbBaseVi + r * orbStride + c;
      const i10 = i00 + 1;
      const i01 = i00 + orbStride;
      const i11 = i01 + 1;
      idx.push(i00, i10, i11, i00, i11, i01);
    }
  }

  // Deduplicated 3D Wireframe Edge Index Buffer
  const indices = new Uint16Array(idx);
  const edgeSet = new Set();
  const wire = [];
  function pushEdge(a, b) {
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    const key = (lo << 16) | hi;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      wire.push(lo, hi);
    }
  }
  for (let i = 0; i < indices.length; i += 3) {
    pushEdge(indices[i], indices[i + 1]);
    pushEdge(indices[i + 1], indices[i + 2]);
    pushEdge(indices[i + 2], indices[i]);
  }

  return {
    texCanvas,
    positions: new Float32Array(pos),
    normals: new Float32Array(nor),
    uvs: new Float32Array(uv),
    colors: new Float32Array(col),
    flags: new Float32Array(flg),
    indices,
    wireIndices: new Uint16Array(wire),
    vertCount: pos.length / 3,
    triCount: indices.length / 3
  };
}

/**
 * Exports a built 3D volumetric character mesh to standard Wavefront .OBJ format.
 */
export function exportCharacterMeshToOBJ(mesh, ch) {
  if (!mesh) return '';
  const lines = [
    `# Nova 3D Volumetric Character Model: ${ch.title} (Age ${ch.age})`,
    `o ${ch.id}_3D_Model`
  ];
  const { positions, normals, uvs, indices, vertCount } = mesh;
  for (let i = 0; i < vertCount; i++) {
    lines.push(`v ${positions[i * 3].toFixed(5)} ${positions[i * 3 + 1].toFixed(5)} ${positions[i * 3 + 2].toFixed(5)}`);
  }
  for (let i = 0; i < vertCount; i++) {
    lines.push(`vt ${uvs[i * 2].toFixed(5)} ${(1.0 - uvs[i * 2 + 1]).toFixed(5)}`);
  }
  for (let i = 0; i < vertCount; i++) {
    lines.push(`vn ${normals[i * 3].toFixed(4)} ${normals[i * 3 + 1].toFixed(4)} ${normals[i * 3 + 2].toFixed(4)}`);
  }
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] + 1;
    const b = indices[i + 1] + 1;
    const c = indices[i + 2] + 1;
    lines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`);
  }
  return lines.join('\n');
}
