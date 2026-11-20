/**
 * Nova — Prosedürel 3D Bakteri / Organik İki-Taraflı Renk Küre Motoru
 * Kürenin sol ve sağ yarılarını net, canlı iki farklı renkte ve girintili-çıkıntılı 3D yapıda çizer.
 */

const NOISE_GLSL = `
  vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float bioHeight(vec3 dir, float freq, float seed, float time, vec3 morph) {
    vec3 seedOff = vec3(seed * 5.17, seed * 3.83, seed * 7.41);
    vec3 warp = vec3(
      snoise(dir * (freq * 0.62) + seedOff),
      snoise(dir * (freq * 0.62) + seedOff + vec3(19.3, 7.1, 13.7)),
      snoise(dir * (freq * 0.62) + seedOff + vec3(5.9, 29.4, 21.2))
    );
    vec3 p = dir * freq + warp * 0.52 + seedOff;
    vec3 pulse = vec3(time * 0.20, -time * 0.15, time * 0.13);

    float n1 = snoise(p + pulse);
    float lobes = n1 >= 0.0 ? pow(max(n1, 0.0001), 0.72) : -pow(max(-n1, 0.0001), 0.92);

    float n2 = snoise(p * 1.95 - pulse * 1.1 + vec3(11.4, 3.2, 8.7));
    float bumps = smoothstep(0.12, 0.88, abs(n2)) * 2.0 - 0.85;
    float craters = -smoothstep(0.38, 0.90, abs(snoise(p * 1.65 + vec3(23.1, 15.8, 4.3) + pulse * 0.7)));

    float n3 = snoise(p * 1.45 + vec3(41.2, 12.6, 31.9) - pulse * 0.5);
    float folds = (1.0 - abs(n3)) * 2.0 - 1.0;

    float micro = snoise(p * 3.8 + seedOff) * 0.12;

    float combined = (
      lobes * morph.x * 0.52 +
      (bumps * 0.65 + craters * 0.85) * morph.y * 0.48 +
      folds * morph.z * 0.38 +
      micro
    );
    return clamp(combined, -1.05, 1.05);
  }
`;

const VERTEX_SHADER = `
  precision highp float;
  attribute vec3 aPosition;
  uniform mat4 uProj;
  uniform mat4 uModelView;
  uniform mat3 uNormalMat;
  uniform float uDepth;
  uniform float uFreq;
  uniform float uSeed;
  uniform float uTime;
  uniform vec3 uMorph;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vObjDir;
  varying float vHeight;

  ${NOISE_GLSL}

  void main() {
    vec3 dir = normalize(aPosition);
    vec3 up = abs(dir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 t1 = normalize(cross(up, dir));
    vec3 t2 = cross(dir, t1);
    float eps = 0.017;
    vec3 d1 = normalize(dir + eps * t1);
    vec3 d2 = normalize(dir + eps * t2);

    float h0 = bioHeight(dir, uFreq, uSeed, uTime, uMorph);
    float h1 = bioHeight(d1,  uFreq, uSeed, uTime, uMorph);
    float h2 = bioHeight(d2,  uFreq, uSeed, uTime, uMorph);

    vec3 p0 = dir * (1.0 + uDepth * h0);
    vec3 p1 = d1  * (1.0 + uDepth * h1);
    vec3 p2 = d2  * (1.0 + uDepth * h2);

    vec3 localNormal = normalize(cross(p1 - p0, p2 - p0));

    vec4 mvPos = uModelView * vec4(p0, 1.0);
    vViewPos = mvPos.xyz;
    vNormal = normalize(uNormalMat * localNormal);
    vObjDir = dir;
    vHeight = h0;

    gl_Position = uProj * mvPos;
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec3 uCreviceA;
  uniform vec3 uCoreA;
  uniform vec3 uTipA;
  uniform vec3 uCreviceB;
  uniform vec3 uCoreB;
  uniform vec3 uTipB;
  uniform float uSplitTilt;
  uniform float uFreq;
  uniform float uSeed;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec3 vObjDir;
  varying float vHeight;

  ${NOISE_GLSL}

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(-vViewPos);
    vec3 dir = normalize(vObjDir);

    float micro = snoise(dir * (uFreq * 7.0) + vec3(uSeed * 2.7));
    N = normalize(N + vec3(micro * 0.045, micro * 0.038, 0.0));

    vec2 splitAxis = vec2(cos(uSplitTilt), sin(uSplitTilt));
    float sideCoord = dir.x * splitAxis.x + dir.y * splitAxis.y;
    float organicBorder = snoise(dir * 2.4 + vec3(uSeed * 3.1)) * 0.065;
    float f = smoothstep(-0.038, 0.038, sideCoord + organicBorder);

    float hNorm = clamp(vHeight * 0.55 + 0.5, 0.0, 1.0);
    vec3 baseA = hNorm < 0.5
      ? mix(uCreviceA, uCoreA, smoothstep(0.0, 0.5, hNorm))
      : mix(uCoreA,    uTipA,  smoothstep(0.5, 1.0, hNorm) * 0.34);
    vec3 baseB = hNorm < 0.5
      ? mix(uCreviceB, uCoreB, smoothstep(0.0, 0.5, hNorm))
      : mix(uCoreB,    uTipB,  smoothstep(0.5, 1.0, hNorm) * 0.34);

    vec3 baseCol = mix(baseA, baseB, f);
    vec3 tipCol  = mix(uTipA, uTipB, f);

    float seam = 4.0 * f * (1.0 - f);
    float maxMag = max(length(baseA), length(baseB));
    vec3 vividMid = normalize(baseA + baseB + vec3(0.001)) * maxMag;
    baseCol = mix(baseCol, vividMid, seam * 0.65);

    float ao = mix(0.42, 1.06, smoothstep(-0.78, 0.52, vHeight));

    vec3 L1 = normalize(vec3(0.50, 0.65, 0.80));
    vec3 L2 = normalize(vec3(-0.60, -0.35, 0.55));

    float wrap1 = max(0.0, (dot(N, L1) + 0.52) / 1.52);
    float diff2 = max(dot(N, L2), 0.0) * 0.34;

    vec3 H1 = normalize(L1 + V);
    float ndh = max(dot(N, H1), 0.0001);
    float specTight = pow(ndh, 62.0) * 0.38 * smoothstep(-0.2, 0.45, vHeight);
    float fresnel = pow(clamp(1.0 - max(dot(N, V), 0.0), 0.0001, 1.0), 3.1);

    vec3 color = baseCol * (0.30 + 0.72 * wrap1 + diff2) * ao;
    color += mix(tipCol, vec3(1.0), 0.72) * specTight;
    color += tipCol * fresnel * 0.32;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export function createIcosphereMesh(gl, subdivisions) {
  const t = (1 + Math.sqrt(5)) / 2;
  const verts = [
    [-1,  t,  0], [ 1,  t,  0], [-1, -t,  0], [ 1, -t,  0],
    [ 0, -1,  t], [ 0,  1,  t], [ 0, -1, -t], [ 0,  1, -t],
    [ t,  0, -1], [ t,  0,  1], [-t,  0, -1], [-t,  0,  1]
  ].map(v => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  });

  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  const midCache = new Map();
  function midpoint(i1, i2) {
    const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
    if (midCache.has(key)) return midCache.get(key);
    const v1 = verts[i1], v2 = verts[i2];
    const mx = (v1[0] + v2[0]) * 0.5;
    const my = (v1[1] + v2[1]) * 0.5;
    const mz = (v1[2] + v2[2]) * 0.5;
    const l = Math.hypot(mx, my, mz);
    const idx = verts.length;
    verts.push([mx / l, my / l, mz / l]);
    midCache.set(key, idx);
    return idx;
  }

  for (let s = 0; s < subdivisions; s++) {
    const next = [];
    for (let f = 0; f < faces.length; f++) {
      const [a, b, c] = faces[f];
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }

  const positions = new Float32Array(verts.length * 3);
  for (let i = 0; i < verts.length; i++) {
    positions[i * 3] = verts[i][0];
    positions[i * 3 + 1] = verts[i][1];
    positions[i * 3 + 2] = verts[i][2];
  }

  const indices = new Uint16Array(faces.length * 3);
  for (let i = 0; i < faces.length; i++) {
    let [a, b, c] = faces[i];
    const va = verts[a], vb = verts[b], vc = verts[c];
    const abx = vb[0] - va[0], aby = vb[1] - va[1], abz = vb[2] - va[2];
    const acx = vc[0] - va[0], acy = vc[1] - va[1], acz = vc[2] - va[2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    if (nx * va[0] + ny * va[1] + nz * va[2] < 0) {
      const tmp = b; b = c; c = tmp;
    }
    indices[i * 3] = a;
    indices[i * 3 + 1] = b;
    indices[i * 3 + 2] = c;
  }

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return { vbo, ibo, count: indices.length };
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

  const mv = new Float32Array([
    r00 * scale, r10 * scale, r20 * scale, 0,
    r01 * scale, r11 * scale, r21 * scale, 0,
    r02 * scale, r12 * scale, r22 * scale, 0,
    tx, ty, tz, 1
  ]);
  const nm = new Float32Array([
    r00, r10, r20,
    r01, r11, r21,
    r02, r12, r22
  ]);
  return { mv, nm };
}

function projectToScreen(x, y, z, proj, width, height) {
  const w = -z;
  if (w <= 0.01) return { x: -999, y: -999 };
  const ndcX = (proj[0] * x) / w;
  const ndcY = (proj[5] * y) / w;
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (-ndcY * 0.5 + 0.5) * height
  };
}

export function createBioSphereRenderer(canvas, baseColors, fusionPairs, onOverlayUpdate) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL desteklenmiyor.');

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const loc = {
    aPosition: gl.getAttribLocation(prog, 'aPosition'),
    uProj: gl.getUniformLocation(prog, 'uProj'),
    uModelView: gl.getUniformLocation(prog, 'uModelView'),
    uNormalMat: gl.getUniformLocation(prog, 'uNormalMat'),
    uDepth: gl.getUniformLocation(prog, 'uDepth'),
    uFreq: gl.getUniformLocation(prog, 'uFreq'),
    uSeed: gl.getUniformLocation(prog, 'uSeed'),
    uTime: gl.getUniformLocation(prog, 'uTime'),
    uMorph: gl.getUniformLocation(prog, 'uMorph'),
    uCreviceA: gl.getUniformLocation(prog, 'uCreviceA'),
    uCoreA: gl.getUniformLocation(prog, 'uCoreA'),
    uTipA: gl.getUniformLocation(prog, 'uTipA'),
    uCreviceB: gl.getUniformLocation(prog, 'uCreviceB'),
    uCoreB: gl.getUniformLocation(prog, 'uCoreB'),
    uTipB: gl.getUniformLocation(prog, 'uTipB'),
    uSplitTilt: gl.getUniformLocation(prog, 'uSplitTilt')
  };

  const meshGrid21 = createIcosphereMesh(gl, 3);
  const meshGrid6  = createIcosphereMesh(gl, 4);
  const meshSingle = createIcosphereMesh(gl, 5);

  const state = {
    active: true,
    mode: 'gallery',
    filter: 'all',
    visiblePairs: fusionPairs.slice(),
    single: {
      colorA: 0,
      colorB: 4,
      seed: fusionPairs[3].seed,
      morph: fusionPairs[3].morph,
      splitTilt: 0.0
    },
    rotX: 0.08,
    rotY: 0.0,
    velX: 0,
    velY: 0,
    zoomDist: 0,
    depth: 0.31,
    freq: 3.2,
    animate: true,
    isDragging: false
  };

  let simTime = 0;
  let lastTs = performance.now();
  let hitBoxes = [];

  function bindMesh(mesh) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    gl.enableVertexAttribArray(loc.aPosition);
    gl.vertexAttribPointer(loc.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
  }

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  function frame(now) {
    const dt = Math.min(0.05, (now - lastTs) * 0.001);
    lastTs = now;

    if (!state.active) {
      requestAnimationFrame(frame);
      return;
    }

    if (state.animate) {
      simTime += dt;
    }
    if (!state.isDragging) {
      state.rotY += state.velY;
      state.rotX = Math.max(-1.45, Math.min(1.45, state.rotX + state.velX));
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

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = w / h;
    const fov = 0.62;
    const tanHalf = Math.tan(fov * 0.5);
    const proj = perspective(fov, aspect, 0.1, 60.0);

    gl.uniformMatrix4fv(loc.uProj, false, proj);
    gl.uniform1f(loc.uDepth, state.depth);
    gl.uniform1f(loc.uFreq, state.freq);
    gl.uniform1f(loc.uTime, simTime);

    if (state.mode === 'gallery') {
      const isAll21 = state.filter === 'all';
      const mesh = isAll21 ? meshGrid21 : meshGrid6;
      bindMesh(mesh);

      const cols = isAll21 ? 7 : 3;
      const rows = isAll21 ? 3 : 2;
      const spacingX = isAll21 ? 1.54 : 2.35;
      const spacingY = isAll21 ? 1.58 : 2.18;
      const sphereScale = isAll21 ? 0.51 : 0.75;

      const halfWNeeded = ((cols - 1) * 0.5) * spacingX + sphereScale * 1.62;
      const halfHNeeded = ((rows - 1) * 0.5) * spacingY + sphereScale * 1.92;
      const camZ = Math.max(halfHNeeded / tanHalf, halfWNeeded / (tanHalf * aspect)) + state.zoomDist;

      hitBoxes = new Array(state.visiblePairs.length);

      for (let k = 0; k < state.visiblePairs.length; k++) {
        const p = state.visiblePairs[k];
        const col = k % cols;
        const row = Math.floor(k / cols);

        const bob = state.animate ? Math.sin(simTime * 1.5 + p.index * 0.7) * (isAll21 ? 0.032 : 0.048) : 0;
        const swayY = state.animate ? Math.sin(simTime * 1.15 + p.index * 0.65) * 0.26 : 0;
        const swayX = state.animate ? Math.cos(simTime * 0.95 + p.index * 0.55) * 0.16 : 0;

        const gx = (col - (cols - 1) * 0.5) * spacingX;
        const gy = ((rows - 1) * 0.5 - row) * spacingY + (isAll21 ? 0.08 : 0.14) + bob;
        const gz = -camZ;

        const { mv, nm } = buildModelView(
          gx, gy, gz,
          sphereScale,
          state.rotX + swayX,
          state.rotY + swayY
        );

        gl.uniformMatrix4fv(loc.uModelView, false, mv);
        gl.uniformMatrix3fv(loc.uNormalMat, false, nm);
        gl.uniform1f(loc.uSeed, p.seed);
        gl.uniform3fv(loc.uMorph, p.morph);
        gl.uniform3fv(loc.uCreviceA, p.cA.crevice);
        gl.uniform3fv(loc.uCoreA, p.cA.core);
        gl.uniform3fv(loc.uTipA, p.cA.tip);
        gl.uniform3fv(loc.uCreviceB, p.cB.crevice);
        gl.uniform3fv(loc.uCoreB, p.cB.core);
        gl.uniform3fv(loc.uTipB, p.cB.tip);
        gl.uniform1f(loc.uSplitTilt, p.splitTilt);

        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);

        const c2d = projectToScreen(gx, gy, gz, proj, rect.width, rect.height);
        const b2d = projectToScreen(gx, gy - sphereScale * 1.30, gz, proj, rect.width, rect.height);
        hitBoxes[k] = {
          x: c2d.x,
          y: c2d.y,
          bottomY: b2d.y,
          r: Math.max(20, Math.abs(b2d.y - c2d.y))
        };
      }

      if (onOverlayUpdate) {
        onOverlayUpdate(hitBoxes, rect.height);
      }
    } else {
      bindMesh(meshSingle);
      const cA = baseColors[state.single.colorA];
      const cB = baseColors[state.single.colorB];
      const bob = state.animate ? Math.sin(simTime * 1.35) * 0.04 : 0;
      const swayY = state.animate ? Math.sin(simTime * 1.05) * 0.28 : 0;
      const swayX = state.animate ? Math.cos(simTime * 0.85) * 0.16 : 0;
      const camZ = -3.85 - state.zoomDist * 0.7;

      const { mv, nm } = buildModelView(0, bob, camZ, 1.08, state.rotX + swayX, state.rotY + swayY);

      gl.uniformMatrix4fv(loc.uModelView, false, mv);
      gl.uniformMatrix3fv(loc.uNormalMat, false, nm);
      gl.uniform1f(loc.uSeed, state.single.seed);
      gl.uniform3fv(loc.uMorph, state.single.morph);
      gl.uniform3fv(loc.uCreviceA, cA.crevice);
      gl.uniform3fv(loc.uCoreA, cA.core);
      gl.uniform3fv(loc.uTipA, cA.tip);
      gl.uniform3fv(loc.uCreviceB, cB.crevice);
      gl.uniform3fv(loc.uCoreB, cB.core);
      gl.uniform3fv(loc.uTipB, cB.tip);
      gl.uniform1f(loc.uSplitTilt, state.single.splitTilt);

      gl.drawElements(gl.TRIANGLES, meshSingle.count, gl.UNSIGNED_SHORT, 0);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return {
    state,
    resetAngle() {
      state.rotX = 0.08;
      state.rotY = 0.0;
      state.velX = 0;
      state.velY = 0;
      state.zoomDist = 0;
    },
    hitTest(clientX, clientY) {
      if (state.mode !== 'gallery') return -1;
      const rect = canvas.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      let hit = -1;
      let best = Infinity;
      for (let k = 0; k < hitBoxes.length; k++) {
        const hb = hitBoxes[k];
        const d = Math.hypot(cx - hb.x, cy - hb.y);
        if (d < hb.r && d < best) {
          best = d;
          hit = k;
        }
      }
      return hit;
    },
    getHitBox(k) {
      return hitBoxes[k];
    }
  };
}
