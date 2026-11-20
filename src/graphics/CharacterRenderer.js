/**
 * Nova — Yüksek Detaylı PBR + Hacimsel 3D Karakter Sahne Motoru
 * Ön/Arka 1024x512 mipmap dokulama, piksel-bazlı kabartma (bump normal) parlama,
 * eklemli 3D kanat salınımı, ZBrush Kil Heykel (Sculpt) ve 3D Tel Kafes (Wireframe) modlarını destekler.
 */
import { buildVolumetricCharacterFromAtlas } from './CharacterModelBuilder.js';

const CHAR_VS = `
  precision highp float;
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec2 aUV;
  attribute vec3 aColor;
  attribute vec2 aFlags; // x: 0=FrontTex, 1=BackTex, 2=Pedestal, 3=BioOrb | y: wingFlexWeight

  uniform mat4 uProj;
  uniform mat4 uModelView;
  uniform mat3 uNormalMat;
  uniform float uFlapAngle;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec2 vUV;
  varying vec3 vColor;
  varying vec2 vFlags;

  void main() {
    vec3 pos = aPosition;
    vec3 nor = aNormal;

    // Smooth 3D dorsal wing flexing on crystal wings
    if (aFlags.x < 1.5 && aFlags.y > 0.01) {
      float side = pos.x >= 0.0 ? 1.0 : -1.0;
      vec2 pivot = vec2(side * 0.09, -0.05);
      float ang = side * uFlapAngle * aFlags.y;
      float ca = cos(ang);
      float sa = sin(ang);
      vec2 rel = pos.xz - pivot;
      pos.xz = pivot + vec2(rel.x * ca - rel.y * sa, rel.x * sa + rel.y * ca);
      nor.xz = vec2(nor.x * ca - nor.z * sa, nor.x * sa + nor.z * ca);
    } else if (aFlags.x > 2.5) {
      // Gentle levitation for the 3D bumpy organic sphere
      pos.y += sin(uTime * 2.2) * 0.028;
    }

    vec4 mvPos = uModelView * vec4(pos, 1.0);
    vViewPos = mvPos.xyz;
    vNormal = normalize(uNormalMat * nor);
    vUV = aUV;
    vColor = aColor;
    vFlags = aFlags;

    gl_Position = uProj * mvPos;
  }
`;

const CHAR_FS = `
  precision highp float;

  uniform sampler2D uTex;
  uniform float uRenderMode; // 0: PBR Shaded, 1: ZBrush Clay Sculpt, 2: 3D Wireframe Pass
  uniform vec3 uWireColor;
  uniform vec3 uGlowColor;

  varying vec3 vNormal;
  varying vec3 vViewPos;
  varying vec2 vUV;
  varying vec3 vColor;
  varying vec2 vFlags;

  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
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

    bool isTexChar = vFlags.x < 1.5;
    vec3 texCol = vec3(0.5);
    if (isTexChar) {
      texCol = texture2D(uTex, vUV).rgb;
      // Extract fine high-res PBR relief normal from ornament/armor/vein luminance gradients
      float lC = luma(texCol);
      float lR = luma(texture2D(uTex, vUV + vec2(0.0012, 0.0)).rgb);
      float lD = luma(texture2D(uTex, vUV + vec2(0.0, 0.0018)).rgb);
      float bumpStrength = uRenderMode > 0.5 ? 2.6 : 1.35;
      vec3 bump = vec3((lC - lR) * bumpStrength, (lD - lC) * bumpStrength, 0.0);
      N = normalize(N + bump);
    }

    float ndl1 = max(dot(N, L1), 0.0);
    float ndl2 = max(dot(N, L2), 0.0);
    float ndh  = max(dot(N, H1), 0.0001);
    float fresnel = pow(clamp(1.0 - max(dot(N, V), 0.0), 0.0001, 1.0), 2.8);

    // ZBrush Clay Sculpt mode: matte sculpted stone showing both 3D volume AND fine armor/face carvings
    if (uRenderMode > 0.5) {
      vec3 clayBase = vec3(0.48, 0.50, 0.55);
      float specClay = pow(ndh, 24.0) * 0.24;
      vec3 clay = clayBase * (0.22 + 0.76 * ndl1 + 0.26 * ndl2) + vec3(0.72, 0.76, 0.84) * (specClay + fresnel * 0.22);
      gl_FragColor = vec4(clamp(clay, 0.0, 1.0), 1.0);
      return;
    }

    if (isTexChar) {
      // Preserve rich studio PBR albedo while adding dynamic 3D directional shading, metallic glint & wing rim glow
      float wingFactor = clamp(vFlags.y, 0.0, 1.0);
      float shade = mix(0.76 + 0.34 * ndl1 + 0.12 * ndl2, 0.90 + 0.24 * abs(dot(N, L1)), wingFactor);
      float metallicHint = clamp(luma(texCol) * 1.4, 0.15, 1.0);
      float spec = pow(ndh, 28.0) * 0.22 * metallicHint;
      vec3 rimCol = mix(vec3(0.55, 0.62, 0.75), uGlowColor, 0.45 + 0.55 * wingFactor);
      vec3 finalCol = texCol * shade + mix(texCol, vec3(1.0), 0.6) * spec + rimCol * fresnel * (0.18 + 0.32 * wingFactor);
      gl_FragColor = vec4(clamp(finalCol, 0.0, 1.0), 1.0);
      return;
    }

    // Untextured 3D Turntable Pedestal (vFlags.x == 2) or 3D Bumpy Bio-Sphere (vFlags.x == 3)
    float isOrb = step(2.5, vFlags.x);
    float specObj = pow(ndh, isOrb > 0.5 ? 34.0 : 22.0) * (isOrb > 0.5 ? 0.42 : 0.28);
    vec3 rimObj = mix(vec3(0.5, 0.55, 0.65), uGlowColor, isOrb * 0.8);
    vec3 objCol = vColor * (0.24 + 0.78 * ndl1 + 0.24 * ndl2) + vec3(1.0) * specObj + rimObj * fresnel * (0.20 + 0.25 * isOrb);
    gl_FragColor = vec4(clamp(objCol, 0.0, 1.0), 1.0);
  }
`;

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

export function createCharacter3DRenderer(canvas, characters, onLabelsUpdate, onModelReady) {
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
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, CHAR_VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, CHAR_FS));
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
    uTex: gl.getUniformLocation(prog, 'uTex'),
    uRenderMode: gl.getUniformLocation(prog, 'uRenderMode'),
    uWireColor: gl.getUniformLocation(prog, 'uWireColor'),
    uGlowColor: gl.getUniformLocation(prog, 'uGlowColor')
  };

  const gpuModels = new Array(characters.length).fill(null);

  function uploadCharacterMesh(idx, ch, img) {
    const raw = buildVolumetricCharacterFromAtlas(img, ch, 98, 132);

    const mkBuf = (target, arr) => {
      const b = gl.createBuffer();
      gl.bindBuffer(target, b);
      gl.bufferData(target, arr, gl.STATIC_DRAW);
      return b;
    };

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, raw.texCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gpuModels[idx] = {
      raw,
      tex,
      posB: mkBuf(gl.ARRAY_BUFFER, raw.positions),
      norB: mkBuf(gl.ARRAY_BUFFER, raw.normals),
      uvB: mkBuf(gl.ARRAY_BUFFER, raw.uvs),
      colB: mkBuf(gl.ARRAY_BUFFER, raw.colors),
      flgB: mkBuf(gl.ARRAY_BUFFER, raw.flags),
      idxB: mkBuf(gl.ELEMENT_ARRAY_BUFFER, raw.indices),
      wireB: mkBuf(gl.ELEMENT_ARRAY_BUFFER, raw.wireIndices),
      triIndexCount: raw.indices.length,
      wireIndexCount: raw.wireIndices.length,
      totalVerts: raw.vertCount,
      totalTris: raw.triCount
    };

    if (onModelReady) onModelReady(idx);
  }

  characters.forEach((ch, idx) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => uploadCharacterMesh(idx, ch, img);
    img.src = ch.atlasDataUri || ch.atlasUrl;
  });

  const state = {
    active: true,
    layout: 'single',      // 'single' | 'council'
    selectedIdx: 0,
    cameraPreset: 'full',  // 'full' | 'bust'
    renderStyle: 'shaded', // 'shaded' | 'clay' | 'wireframe'
    rotX: 0.07,
    rotY: -0.24,
    velX: 0,
    velY: 0,
    zoomDist: 0,
    animate: true,
    isDragging: false
  };

  let simTime = 0;
  let lastTs = performance.now();
  let councilBoxes = [];

  function bindModel(m) {
    gl.bindBuffer(gl.ARRAY_BUFFER, m.posB);
    gl.enableVertexAttribArray(loc.aPosition);
    gl.vertexAttribPointer(loc.aPosition, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, m.norB);
    gl.enableVertexAttribArray(loc.aNormal);
    gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, m.uvB);
    gl.enableVertexAttribArray(loc.aUV);
    gl.vertexAttribPointer(loc.aUV, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, m.colB);
    gl.enableVertexAttribArray(loc.aColor);
    gl.vertexAttribPointer(loc.aColor, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, m.flgB);
    gl.enableVertexAttribArray(loc.aFlags);
    gl.vertexAttribPointer(loc.aFlags, 2, gl.FLOAT, false, 0, 0);
  }

  function drawCharacterModel(modelIdx, mv, nm, flapAngle) {
    const m = gpuModels[modelIdx];
    if (!m) return;
    const ch = characters[modelIdx];

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, m.tex);
    gl.uniform1i(loc.uTex, 0);

    gl.uniformMatrix4fv(loc.uModelView, false, mv);
    gl.uniformMatrix3fv(loc.uNormalMat, false, nm);
    gl.uniform1f(loc.uFlapAngle, flapAngle);
    gl.uniform1f(loc.uTime, simTime + modelIdx * 0.9);
    gl.uniform3fv(loc.uGlowColor, ch.glowRGB);
    gl.uniform1f(loc.uRenderMode, state.renderStyle === 'clay' ? 1.0 : 0.0);

    if (state.renderStyle === 'wireframe') {
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(1.0, 1.0);
    }

    gl.disable(gl.BLEND);
    gl.depthMask(true);
    bindModel(m);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idxB);
    gl.drawElements(gl.TRIANGLES, m.triIndexCount, gl.UNSIGNED_SHORT, 0);

    if (state.renderStyle === 'wireframe') {
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.uniform1f(loc.uRenderMode, 2.0);
      gl.uniform3f(loc.uWireColor, 0.72, 0.88, 1.0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.wireB);
      gl.drawElements(gl.LINES, m.wireIndexCount, gl.UNSIGNED_SHORT, 0);
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
      if (!state.isDragging && state.layout === 'single') {
        // Smooth gentle 3D turntable sway (+/- 38 deg) unless user rotated past 65 deg to inspect the back!
        if (Math.abs(state.rotY) < 1.15 && Math.hypot(state.velX, state.velY) < 0.002) {
          state.rotY = Math.sin(simTime * 0.65) * 0.52;
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

    const aspect = w / h;
    const fov = 0.54;
    const tanHalf = Math.tan(fov * 0.5);
    const proj = perspective(fov, aspect, 0.1, 60.0);
    gl.uniformMatrix4fv(loc.uProj, false, proj);

    if (state.layout === 'single') {
      const isBust = state.cameraPreset === 'bust';
      const targetY = isBust ? -0.44 : 0.05;
      const baseDist = isBust ? 1.85 : 3.85;
      const camZ = -(baseDist + state.zoomDist * (isBust ? 0.35 : 0.72));
      const flap = state.animate ? Math.sin(simTime * 1.8) * 0.14 : 0.0;

      const { mv, nm } = buildModelView(0, targetY, camZ, 1.0, state.rotX, state.rotY);
      drawCharacterModel(state.selectedIdx, mv, nm, flap);
      councilBoxes = [];
      if (onLabelsUpdate) onLabelsUpdate([], rect.height);
    } else {
      const spacingX = 1.48;
      const halfWNeeded = 3.0 * spacingX + 1.05;
      const halfHNeeded = 1.48;
      const camZ = Math.max(halfHNeeded / tanHalf, halfWNeeded / (tanHalf * aspect)) + state.zoomDist;

      councilBoxes = new Array(characters.length);
      for (let i = 0; i < characters.length; i++) {
        const gx = (i - 3) * spacingX;
        const gzArc = -Math.abs(i - 3) * 0.26 - camZ;
        const gy = 0.04;
        const flap = state.animate ? Math.sin(simTime * 1.7 + i * 0.85) * 0.14 : 0.0;
        const sway = state.animate && !state.isDragging ? Math.sin(simTime * 0.7 + i * 0.5) * 0.22 : 0.0;
        const { mv, nm } = buildModelView(gx, gy, gzArc, 0.82, state.rotX, state.rotY + (3 - i) * 0.09 + sway);
        drawCharacterModel(i, mv, nm, flap);

        const c2d = projectToScreen(gx, gy + 0.1, gzArc, proj, rect.width, rect.height);
        const b2d = projectToScreen(gx, gy - 0.86, gzArc, proj, rect.width, rect.height);
        councilBoxes[i] = {
          x: c2d.x,
          y: c2d.y,
          bottomY: b2d.y,
          r: Math.max(26, Math.abs(b2d.y - c2d.y) * 0.65)
        };
      }
      if (onLabelsUpdate) onLabelsUpdate(councilBoxes, rect.height);
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return {
    state,
    getStats(idx) {
      return gpuModels[idx];
    },
    getRawMesh(idx) {
      return gpuModels[idx]?.raw || null;
    },
    showBackView() {
      state.rotX = 0.07;
      state.rotY = Math.PI;
      state.velX = 0;
      state.velY = 0;
    },
    resetView() {
      state.rotX = state.cameraPreset === 'bust' ? 0.04 : 0.07;
      state.rotY = -0.24;
      state.velX = 0;
      state.velY = 0;
      state.zoomDist = 0;
    },
    hitTestCouncil(clientX, clientY) {
      if (state.layout !== 'council') return -1;
      const rect = canvas.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      let hit = -1;
      let best = Infinity;
      for (let i = 0; i < councilBoxes.length; i++) {
        const b = councilBoxes[i];
        if (!b) continue;
        const dx = (cx - b.x) * 1.3;
        const dy = (cy - b.y) * 0.7;
        const d = Math.hypot(dx, dy);
        if (d < b.r && d < best) {
          best = d;
          hit = i;
        }
      }
      return hit;
    }
  };
}
