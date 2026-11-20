import { SPHERE_COLORS, FUSION_PAIRS } from './data/sphereColors.js';
import { CHARACTERS } from './data/characters.js';
import { PROTAGONISTS, WING_STAGES, FUSION_SHOWCASE_URL } from './data/protagonists.js';
import { createProtagonist3DRenderer } from './graphics/ProtagonistRenderer.js';
import { createCharacter3DRenderer } from './graphics/CharacterRenderer.js';
import { exportCharacterMeshToOBJ } from './graphics/CharacterModelBuilder.js';
import { createBioSphereRenderer } from './graphics/BioSphereRenderer.js';

// --- Studio View Tabs ---
const tabProtagonist = document.getElementById('tab-protagonist');
const tabCharacters = document.getElementById('tab-characters');
const tabSpheres = document.getElementById('tab-spheres');
const viewProtagonist = document.getElementById('view-protagonist');
const viewCharacters = document.getElementById('view-characters');
const viewSpheres = document.getElementById('view-spheres');

// ============================================================================
// 0. INITIALIZE 3D PROTAGONIST STUDIO (Female & Male + Fusion + Wing Evolution)
// ============================================================================
const protCanvas = document.getElementById('protagonist-canvas');
const protSheetInspector = document.getElementById('prot-sheet-inspector');
const protSheetImg = document.getElementById('prot-sheet-img');
const protHudTitle = document.getElementById('prot-hud-title');
const protHudSummary = document.getElementById('prot-hud-summary');
const protPolyBadge = document.getElementById('prot-poly-badge');

const protGenderBtns = document.querySelectorAll('.prot-gender-btn');
const btnProtEar = document.getElementById('btn-prot-ear');
const btnPcamFull = document.getElementById('btn-pcam-full');
const btnPcamBust = document.getElementById('btn-pcam-bust');
const btnPcamBack = document.getElementById('btn-pcam-back');
const btnPcamSheet = document.getElementById('btn-pcam-sheet');
const protRenderBtns = document.querySelectorAll('.prot-render-btn');
const btnProtObj = document.getElementById('btn-prot-obj');

const protWingPills = document.getElementById('prot-wing-pills');
const protAnimToggle = document.getElementById('prot-anim-toggle');
const btnProtReset = document.getElementById('btn-prot-reset');
const btnFusionToggle = document.getElementById('btn-fusion-toggle');
const protColorA = document.getElementById('prot-color-a');
const protColorB = document.getElementById('prot-color-b');
const protFusionPresets = document.getElementById('prot-fusion-presets');

let protSheetMode = false;

SPHERE_COLORS.forEach((c, idx) => {
  protColorA.add(new Option(c.name, String(idx)));
  protColorB.add(new Option(c.name, String(idx)));
});
protColorA.value = '0'; // Kırmızı
protColorB.value = '5'; // Mavi

WING_STAGES.forEach((ws) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch-btn prot-wing-btn';
  b.dataset.stage = String(ws.stage);
  b.textContent = ws.shortName;
  protWingPills.appendChild(b);
});

const PRESET_COMBOS = [
  { label: 'Doğal (Pasif)', active: false, a: 0, b: 5 },
  { label: 'Kırmızı + Mavi', active: true, a: 0, b: 5 },
  { label: 'Mor + Sarı', active: true, a: 4, b: 6 },
  { label: 'Yeşil + Pembe', active: true, a: 2, b: 3 },
  { label: 'Turuncu + Mor', active: true, a: 1, b: 4 }
];

PRESET_COMBOS.forEach((pr) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch-btn';
  if (pr.active) {
    const cA = SPHERE_COLORS[pr.a], cB = SPHERE_COLORS[pr.b];
    b.innerHTML = `<span class="swatch-dot" style="background:${cA.hex}"></span><span class="swatch-dot" style="background:${cB.hex}"></span><span>${pr.label}</span>`;
  } else {
    b.textContent = pr.label;
  }
  b.addEventListener('click', () => {
    protSheetMode = false;
    protRenderer.state.fusionActive = pr.active;
    protRenderer.state.colorA = pr.a;
    protRenderer.state.colorB = pr.b;
    protColorA.value = String(pr.a);
    protColorB.value = String(pr.b);
    syncProtagonistUI();
  });
  protFusionPresets.appendChild(b);
});

const protRenderer = createProtagonist3DRenderer(protCanvas, PROTAGONISTS, SPHERE_COLORS, () => syncProtagonistUI());

function syncProtagonistUI() {
  const st = protRenderer.state;
  const cA = SPHERE_COLORS[st.colorA];
  const cB = SPHERE_COLORS[st.colorB];
  const ws = WING_STAGES[st.wingStage];

  protSheetInspector.hidden = !protSheetMode;
  if (protSheetMode) {
    protSheetImg.src = st.genderMode === 'both'
      ? FUSION_SHOWCASE_URL
      : (st.genderMode === 'erkek' ? PROTAGONISTS[1].sheetUrl : PROTAGONISTS[0].sheetUrl);
  }

  protGenderBtns.forEach((b) => b.classList.toggle('active', b.dataset.gender === st.genderMode));
  btnProtEar.classList.toggle('active', st.earType === 'pointed');
  btnProtEar.textContent = st.earType === 'pointed' ? 'Kulak: Sivri Peri' : 'Kulak: İnsan';

  btnPcamFull.classList.toggle('active', !protSheetMode && st.cameraPreset === 'full');
  btnPcamBust.classList.toggle('active', !protSheetMode && st.cameraPreset === 'bust');
  btnPcamBack.classList.toggle('active', !protSheetMode && st.cameraPreset === 'back');
  btnPcamSheet.classList.toggle('active', protSheetMode);

  protRenderBtns.forEach((b) => b.classList.toggle('active', !protSheetMode && b.dataset.prender === st.renderStyle));
  protWingPills.querySelectorAll('.prot-wing-btn').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.stage) === st.wingStage);
  });

  btnFusionToggle.classList.toggle('active', st.fusionActive);
  btnFusionToggle.textContent = st.fusionActive
    ? `Füzyon Aktif: ${cA.name} / ${cB.name}`
    : 'Doğal Görünüm (Küre Pasif)';

  const who = st.genderMode === 'both'
    ? 'Kadın & Erkek Ana Karakterler (Yaş 23)'
    : (st.genderMode === 'erkek' ? PROTAGONISTS[1].label : PROTAGONISTS[0].label);

  protHudTitle.textContent = `${who} — ${ws.name}`;
  protHudSummary.textContent = st.fusionActive
    ? `Sol Yarı: ${cA.name} • Sağ Yarı: ${cB.name} (Ten, saç, kıyafet ve kanatlar aktif küreyle iki yarım küre renginde)`
    : 'Küre pasifken doğal ten ve koyu-nötr gezgin büyücü-savaşçı kıyafeti.';

  const triStats = protRenderer.getTriangleStats();
  protPolyBadge.textContent = protSheetMode
    ? '3-Açılı UE5 / ZBrush Render Kartı'
    : triStats.tris > 0
      ? `${triStats.verts.toLocaleString('tr-TR')} köşe • ${triStats.tris.toLocaleString('tr-TR')} 3D üçgen`
      : '3D Model Yükleniyor...';
}

protGenderBtns.forEach((b) => {
  b.addEventListener('click', () => {
    protRenderer.state.genderMode = b.dataset.gender;
    protRenderer.state.zoomDist = 0;
    syncProtagonistUI();
  });
});

btnProtEar.addEventListener('click', () => {
  protSheetMode = false;
  protRenderer.state.earType = protRenderer.state.earType === 'pointed' ? 'human' : 'pointed';
  syncProtagonistUI();
});

btnPcamFull.addEventListener('click', () => {
  protSheetMode = false;
  protRenderer.state.cameraPreset = 'full';
  protRenderer.resetView();
  syncProtagonistUI();
});

btnPcamBust.addEventListener('click', () => {
  protSheetMode = false;
  protRenderer.state.cameraPreset = 'bust';
  protRenderer.resetView();
  syncProtagonistUI();
});

btnPcamBack.addEventListener('click', () => {
  protSheetMode = false;
  protRenderer.state.cameraPreset = 'back';
  protRenderer.state.rotX = 0.07;
  protRenderer.state.rotY = Math.PI;
  protRenderer.state.zoomDist = 0;
  syncProtagonistUI();
});

btnPcamSheet.addEventListener('click', () => {
  protSheetMode = !protSheetMode;
  syncProtagonistUI();
});

protRenderBtns.forEach((b) => {
  b.addEventListener('click', () => {
    protSheetMode = false;
    protRenderer.state.renderStyle = b.dataset.prender;
    syncProtagonistUI();
  });
});

protWingPills.addEventListener('click', (e) => {
  const b = e.target.closest('.prot-wing-btn');
  if (!b) return;
  protSheetMode = false;
  protRenderer.state.wingStage = Number(b.dataset.stage);
  syncProtagonistUI();
});

btnFusionToggle.addEventListener('click', () => {
  protSheetMode = false;
  protRenderer.state.fusionActive = !protRenderer.state.fusionActive;
  syncProtagonistUI();
});

protColorA.addEventListener('change', () => {
  protSheetMode = false;
  protRenderer.state.fusionActive = true;
  protRenderer.state.colorA = Number(protColorA.value);
  syncProtagonistUI();
});

protColorB.addEventListener('change', () => {
  protSheetMode = false;
  protRenderer.state.fusionActive = true;
  protRenderer.state.colorB = Number(protColorB.value);
  syncProtagonistUI();
});

protAnimToggle.addEventListener('change', () => {
  protRenderer.state.animate = protAnimToggle.checked;
});

btnProtReset.addEventListener('click', () => {
  protSheetMode = false;
  protRenderer.resetView();
  syncProtagonistUI();
});

btnProtObj.addEventListener('click', () => {
  const objText = protRenderer.exportCurrentOBJ();
  if (!objText) return;
  const url = URL.createObjectURL(new Blob([objText], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ana_karakter_${protRenderer.state.genderMode}_stage${protRenderer.state.wingStage}.obj`;
  a.click();
  URL.revokeObjectURL(url);
});

let protPrevX = 0, protPrevY = 0;
protCanvas.addEventListener('pointerdown', (e) => {
  protRenderer.state.isDragging = true;
  protPrevX = e.clientX;
  protPrevY = e.clientY;
  protCanvas.setPointerCapture(e.pointerId);
});
protCanvas.addEventListener('pointermove', (e) => {
  if (!protRenderer.state.isDragging) return;
  const dx = e.clientX - protPrevX, dy = e.clientY - protPrevY;
  protPrevX = e.clientX; protPrevY = e.clientY;
  if (Math.hypot(dx, dy) > 2 && protRenderer.state.cameraPreset === 'back') {
    protRenderer.state.cameraPreset = 'full';
  }
  protRenderer.state.rotY += dx * 0.009;
  protRenderer.state.rotX = Math.max(-1.15, Math.min(1.15, protRenderer.state.rotX + dy * 0.009));
  protRenderer.state.velY = dx * 0.0025;
  protRenderer.state.velX = dy * 0.0025;
});
protCanvas.addEventListener('pointerup', () => {
  protRenderer.state.isDragging = false;
  syncProtagonistUI();
});
protCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  protRenderer.state.zoomDist = Math.max(-1.4, Math.min(2.6, protRenderer.state.zoomDist + e.deltaY * 0.0025));
}, { passive: false });

// ============================================================================
// 1. INITIALIZE 3D COUNCIL CHARACTERS STUDIO (7 High-Detail Volumetric Models)
// ============================================================================
const charCanvas = document.getElementById('character-canvas');
const councilLabels = document.getElementById('council-labels');
const sheetInspector = document.getElementById('sheet-inspector');
const sheetInspectorImg = document.getElementById('sheet-inspector-img');
const charHudTitle = document.getElementById('char-hud-title');
const charHudSummary = document.getElementById('char-hud-summary');
const charPolyBadge = document.getElementById('char-poly-badge');
const charSelectorPills = document.getElementById('char-selector-pills');

const btnCamFull = document.getElementById('btn-cam-full');
const btnCamBust = document.getElementById('btn-cam-bust');
const btnCamBack = document.getElementById('btn-cam-back');
const btnCamCouncil = document.getElementById('btn-cam-council');
const btnCamSheet = document.getElementById('btn-cam-sheet');
const renderModeBtns = document.querySelectorAll('.render-mode-btn');
const btnExportObj = document.getElementById('btn-export-obj');
const charAnimToggle = document.getElementById('char-anim-toggle');
const btnCharReset = document.getElementById('btn-char-reset');
const btnCharSpheres = document.getElementById('btn-char-spheres');

let showSheetMode = false;

const councilTagEls = CHARACTERS.map((ch) => {
  const el = document.createElement('span');
  el.className = 'sphere-tag';
  el.innerHTML = `<span class="swatch-dot" style="background:${ch.hex}"></span><span>${ch.colorName} (${ch.age})</span>`;
  el.style.display = 'none';
  councilLabels.appendChild(el);
  return el;
});

CHARACTERS.forEach((ch, idx) => {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'swatch-btn char-pill';
  pill.dataset.charIdx = String(idx);
  pill.innerHTML = `<span class="swatch-dot" style="background:${ch.hex}"></span><span>${ch.colorName} • ${ch.age}</span>`;
  charSelectorPills.appendChild(pill);
});

const charRenderer = createCharacter3DRenderer(
  charCanvas,
  CHARACTERS,
  (boxes, height) => {
    for (let i = 0; i < councilTagEls.length; i++) {
      const el = councilTagEls[i];
      if (showSheetMode || !boxes.length || !boxes[i]) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = 'inline-flex';
      el.style.left = `${boxes[i].x}px`;
      el.style.top = `${Math.min(height - 26, boxes[i].bottomY - 2)}px`;
    }
  },
  () => syncCharacterUI()
);
charRenderer.state.active = false;

function syncCharacterUI() {
  const { layout, selectedIdx, cameraPreset, renderStyle, rotY } = charRenderer.state;
  const ch = CHARACTERS[selectedIdx];
  const isBack = !showSheetMode && layout === 'single' && Math.abs(Math.abs(rotY) - Math.PI) < 0.65;

  sheetInspector.hidden = !showSheetMode;
  if (showSheetMode) sheetInspectorImg.src = ch.sheetUrl;

  btnCamFull.classList.toggle('active', !showSheetMode && layout === 'single' && cameraPreset === 'full' && !isBack);
  btnCamBust.classList.toggle('active', !showSheetMode && layout === 'single' && cameraPreset === 'bust' && !isBack);
  btnCamBack.classList.toggle('active', isBack);
  btnCamCouncil.classList.toggle('active', !showSheetMode && layout === 'council');
  btnCamSheet.classList.toggle('active', showSheetMode);

  renderModeBtns.forEach((btn) => btn.classList.toggle('active', !showSheetMode && btn.dataset.renderMode === renderStyle));
  charSelectorPills.querySelectorAll('.char-pill').forEach((pill) => {
    pill.classList.toggle('active', (showSheetMode || layout === 'single') && Number(pill.dataset.charIdx) === selectedIdx);
  });

  if (!showSheetMode && layout === 'council') {
    let totalTris = 0, totalVerts = 0;
    for (let i = 0; i < CHARACTERS.length; i++) {
      const st = charRenderer.getStats(i);
      if (st) { totalTris += st.totalTris; totalVerts += st.totalVerts; }
    }
    charHudTitle.textContent = 'Yedi Kanatlı Peri Konseyi — 3D Sahne (Yaş 44–58)';
    charHudSummary.textContent = 'Yakından 360° 3D incelemek için bir karaktere tıklayın.';
    charPolyBadge.textContent = totalTris > 0 ? `${totalVerts.toLocaleString('tr-TR')} köşe • ${totalTris.toLocaleString('tr-TR')} 3D üçgen` : '3D Modeller Yükleniyor...';
  } else {
    const st = charRenderer.getStats(selectedIdx);
    charHudTitle.textContent = `${ch.colorName} — ${ch.title} (Yaş ${ch.age})`;
    charHudSummary.textContent = ch.summary;
    charPolyBadge.textContent = showSheetMode
      ? 'Ön • 3/4 Yakın • Arka 3D Render Kartı'
      : st ? `${st.totalVerts.toLocaleString('tr-TR')} köşe • ${st.totalTris.toLocaleString('tr-TR')} 3D üçgen` : '3D Model Yükleniyor...';
  }
}

btnCamFull.addEventListener('click', () => { showSheetMode = false; charRenderer.state.layout = 'single'; charRenderer.state.cameraPreset = 'full'; charRenderer.resetView(); syncCharacterUI(); });
btnCamBust.addEventListener('click', () => { showSheetMode = false; charRenderer.state.layout = 'single'; charRenderer.state.cameraPreset = 'bust'; charRenderer.resetView(); syncCharacterUI(); });
btnCamBack.addEventListener('click', () => { showSheetMode = false; charRenderer.state.layout = 'single'; charRenderer.state.cameraPreset = 'full'; charRenderer.showBackView(); syncCharacterUI(); });
btnCamCouncil.addEventListener('click', () => { showSheetMode = false; charRenderer.state.layout = 'council'; charRenderer.state.rotX = 0.06; charRenderer.state.rotY = 0; charRenderer.state.zoomDist = 0; syncCharacterUI(); });
btnCamSheet.addEventListener('click', () => { showSheetMode = !showSheetMode; syncCharacterUI(); });

renderModeBtns.forEach((btn) => {
  btn.addEventListener('click', () => { showSheetMode = false; charRenderer.state.renderStyle = btn.dataset.renderMode; syncCharacterUI(); });
});

charSelectorPills.addEventListener('click', (e) => {
  const pill = e.target.closest('.char-pill');
  if (!pill) return;
  charRenderer.state.selectedIdx = Number(pill.dataset.charIdx);
  if (!showSheetMode && charRenderer.state.layout === 'council') {
    charRenderer.state.layout = 'single';
    charRenderer.state.cameraPreset = 'full';
    charRenderer.resetView();
  }
  charRenderer.state.zoomDist = 0;
  syncCharacterUI();
});

charAnimToggle.addEventListener('change', () => { charRenderer.state.animate = charAnimToggle.checked; });
btnCharReset.addEventListener('click', () => {
  showSheetMode = false;
  if (charRenderer.state.layout === 'council') {
    charRenderer.state.rotX = 0.06; charRenderer.state.rotY = 0; charRenderer.state.velX = 0; charRenderer.state.velY = 0; charRenderer.state.zoomDist = 0;
  } else {
    charRenderer.resetView();
  }
  syncCharacterUI();
});

btnExportObj.addEventListener('click', () => {
  const idx = charRenderer.state.selectedIdx, ch = CHARACTERS[idx], rawMesh = charRenderer.getRawMesh(idx);
  if (!rawMesh) return;
  const url = URL.createObjectURL(new Blob([exportCharacterMeshToOBJ(rawMesh, ch)], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${ch.id}_3d_model.obj`; a.click();
  URL.revokeObjectURL(url);
});

let charDragDist = 0, charPrevX = 0, charPrevY = 0;
charCanvas.addEventListener('pointerdown', (e) => {
  charRenderer.state.isDragging = true; charDragDist = 0; charPrevX = e.clientX; charPrevY = e.clientY; charCanvas.setPointerCapture(e.pointerId);
});
charCanvas.addEventListener('pointermove', (e) => {
  if (!charRenderer.state.isDragging) {
    charCanvas.style.cursor = (charRenderer.state.layout === 'council' && charRenderer.hitTestCouncil(e.clientX, e.clientY) >= 0) ? 'pointer' : 'grab';
    return;
  }
  const dx = e.clientX - charPrevX, dy = e.clientY - charPrevY;
  charPrevX = e.clientX; charPrevY = e.clientY; charDragDist += Math.hypot(dx, dy);
  charRenderer.state.rotY += dx * 0.009;
  charRenderer.state.rotX = Math.max(-1.15, Math.min(1.15, charRenderer.state.rotX + dy * 0.009));
  charRenderer.state.velY = dx * 0.0025; charRenderer.state.velX = dy * 0.0025;
});
charCanvas.addEventListener('pointerup', (e) => {
  if (!charRenderer.state.isDragging) return;
  charRenderer.state.isDragging = false;
  if (charDragDist < 6 && charRenderer.state.layout === 'council') {
    const hit = charRenderer.hitTestCouncil(e.clientX, e.clientY);
    if (hit >= 0) {
      charRenderer.state.selectedIdx = hit; charRenderer.state.layout = 'single'; charRenderer.state.cameraPreset = 'full'; charRenderer.resetView(); syncCharacterUI();
    }
  }
});
charCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  charRenderer.state.zoomDist = Math.max(-1.4, Math.min(2.6, charRenderer.state.zoomDist + e.deltaY * 0.0025));
}, { passive: false });

// ============================================================================
// 2. INITIALIZE 3D TWO-COLOR BIO-SPHERES STUDIO (21 Combinations)
// ============================================================================
const sphereCanvas = document.getElementById('sphere-canvas');
const labelsContainer = document.getElementById('sphere-labels');
const swatchesContainer = document.getElementById('color-swatches');
const statusLabel = document.getElementById('active-sphere-status');
const backBtn = document.getElementById('btn-back-gallery');
const resetBtn = document.getElementById('btn-reset-angle');
const hoverTooltip = document.getElementById('hover-tooltip');
const singlePickerRow = document.getElementById('single-picker-row');
const selColorA = document.getElementById('select-color-a');
const selColorB = document.getElementById('select-color-b');
const depthInput = document.getElementById('input-depth');
const depthReadout = document.getElementById('readout-depth');
const freqInput = document.getElementById('input-freq');
const freqReadout = document.getElementById('readout-freq');
const pulseInput = document.getElementById('input-pulse');

const badgeNodes = FUSION_PAIRS.map(() => {
  const el = document.createElement('span');
  el.className = 'sphere-tag';
  labelsContainer.appendChild(el);
  return el;
});

SPHERE_COLORS.forEach((c, idx) => {
  selColorA.add(new Option(c.name, String(idx)));
  selColorB.add(new Option(c.name, String(idx)));
});

const sphereRenderer = createBioSphereRenderer(sphereCanvas, SPHERE_COLORS, FUSION_PAIRS, (boxes, height) => {
  for (let k = 0; k < boxes.length; k++) {
    badgeNodes[k].style.left = `${boxes[k].x}px`;
    badgeNodes[k].style.top = `${Math.min(height - 26, boxes[k].bottomY - 2)}px`;
  }
});
sphereRenderer.state.active = false;

function addFilterPill(filterVal, label, hex) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'swatch-btn';
  btn.dataset.filter = filterVal;
  if (hex) {
    const dot = document.createElement('span');
    dot.className = 'swatch-dot';
    dot.style.background = hex;
    btn.appendChild(dot);
  }
  const span = document.createElement('span');
  span.textContent = label;
  btn.appendChild(span);
  swatchesContainer.appendChild(btn);
}

addFilterPill('all', 'Tümü (21)', null);
SPHERE_COLORS.forEach((s, idx) => addFilterPill(String(idx), `${s.name} (6)`, s.hex));

function syncSphereUI() {
  const { mode, filter, single } = sphereRenderer.state;
  sphereRenderer.state.visiblePairs = filter === 'all'
    ? FUSION_PAIRS.slice()
    : FUSION_PAIRS.filter((p) => p.i === Number(filter) || p.j === Number(filter));

  swatchesContainer.querySelectorAll('.swatch-btn').forEach((btn) => {
    btn.classList.toggle('active', mode === 'gallery' && btn.dataset.filter === filter);
  });

  const vis = sphereRenderer.state.visiblePairs;
  for (let k = 0; k < badgeNodes.length; k++) {
    const el = badgeNodes[k];
    if (mode !== 'gallery' || k >= vis.length) { el.style.display = 'none'; continue; }
    const p = vis[k];
    el.style.display = 'inline-flex';
    el.innerHTML = filter === 'all'
      ? `<span class="swatch-dot" style="background:${p.cA.hex}"></span><span class="swatch-dot" style="background:${p.cB.hex}"></span>`
      : `<span class="swatch-dot" style="background:${p.cA.hex}"></span><span class="swatch-dot" style="background:${p.cB.hex}"></span><span>${p.title}</span>`;
  }

  if (mode === 'gallery') {
    backBtn.hidden = true; singlePickerRow.hidden = true;
    statusLabel.textContent = filter === 'all'
      ? '21 İki Renkli Küre • Bir küreye tıklayarak yakından inceleyin'
      : `${CHARACTERS[Number(filter)].title} — 6 İkili Küre Kombinasyonu`;
  } else {
    backBtn.hidden = false; singlePickerRow.hidden = false; hoverTooltip.hidden = true;
    statusLabel.textContent = `Sol Yarı: ${SPHERE_COLORS[single.colorA].name}  |  Sağ Yarı: ${SPHERE_COLORS[single.colorB].name}`;
    selColorA.value = String(single.colorA); selColorB.value = String(single.colorB);
  }
}

swatchesContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('.swatch-btn');
  if (!btn) return;
  sphereRenderer.state.filter = btn.dataset.filter; sphereRenderer.state.mode = 'gallery'; sphereRenderer.resetAngle(); syncSphereUI();
});
resetBtn.addEventListener('click', () => sphereRenderer.resetAngle());
backBtn.addEventListener('click', () => { sphereRenderer.state.mode = 'gallery'; sphereRenderer.resetAngle(); syncSphereUI(); });

function updateSingleSelection() {
  const a = Number(selColorA.value), b = Number(selColorB.value);
  sphereRenderer.state.single.colorA = a; sphereRenderer.state.single.colorB = b;
  const found = FUSION_PAIRS.find((p) => p.i === Math.min(a, b) && p.j === Math.max(a, b));
  if (found) {
    sphereRenderer.state.single.seed = found.seed;
    sphereRenderer.state.single.morph = found.morph;
    sphereRenderer.state.single.splitTilt = found.splitTilt;
  }
  syncSphereUI();
}
selColorA.addEventListener('change', updateSingleSelection);
selColorB.addEventListener('change', updateSingleSelection);
depthInput.addEventListener('input', () => { sphereRenderer.state.depth = Number(depthInput.value) / 100; depthReadout.textContent = `${depthInput.value}%`; });
freqInput.addEventListener('input', () => { sphereRenderer.state.freq = Number(freqInput.value) / 10; freqReadout.textContent = `${sphereRenderer.state.freq.toFixed(1)}x`; });
pulseInput.addEventListener('change', () => { sphereRenderer.state.animate = pulseInput.checked; });

let sphereDragDistance = 0, spherePrevX = 0, spherePrevY = 0;
sphereCanvas.addEventListener('pointerdown', (e) => {
  sphereRenderer.state.isDragging = true; sphereDragDistance = 0; spherePrevX = e.clientX; spherePrevY = e.clientY; sphereCanvas.setPointerCapture(e.pointerId);
});
sphereCanvas.addEventListener('pointermove', (e) => {
  if (sphereRenderer.state.isDragging) {
    const dx = e.clientX - spherePrevX, dy = e.clientY - spherePrevY;
    spherePrevX = e.clientX; spherePrevY = e.clientY; sphereDragDistance += Math.hypot(dx, dy);
    sphereRenderer.state.rotY += dx * 0.009; sphereRenderer.state.rotX = Math.max(-1.45, Math.min(1.45, sphereRenderer.state.rotX + dy * 0.009));
    sphereRenderer.state.velY = dx * 0.0025; sphereRenderer.state.velX = dy * 0.0025; hoverTooltip.hidden = true;
    return;
  }
  const hit = sphereRenderer.hitTest(e.clientX, e.clientY), pair = sphereRenderer.state.visiblePairs[hit];
  if (hit >= 0 && pair) {
    const hb = sphereRenderer.getHitBox(hit);
    hoverTooltip.textContent = pair.title; hoverTooltip.style.left = `${hb.x}px`; hoverTooltip.style.top = `${hb.y - hb.r * 0.75}px`;
    hoverTooltip.hidden = false; sphereCanvas.style.cursor = 'pointer';
  } else {
    hoverTooltip.hidden = true; sphereCanvas.style.cursor = 'grab';
  }
});
sphereCanvas.addEventListener('pointerleave', () => { hoverTooltip.hidden = true; });
sphereCanvas.addEventListener('pointerup', (e) => {
  if (!sphereRenderer.state.isDragging) return;
  sphereRenderer.state.isDragging = false;
  if (sphereDragDistance < 6 && sphereRenderer.state.mode === 'gallery') {
    const hit = sphereRenderer.hitTest(e.clientX, e.clientY), pair = sphereRenderer.state.visiblePairs[hit];
    if (hit >= 0 && pair) {
      sphereRenderer.state.mode = 'single'; sphereRenderer.resetAngle();
      sphereRenderer.state.single = { colorA: pair.i, colorB: pair.j, seed: pair.seed, morph: pair.morph, splitTilt: pair.splitTilt };
      syncSphereUI();
    }
  }
});
sphereCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  sphereRenderer.state.zoomDist = Math.max(-2.0, Math.min(3.0, sphereRenderer.state.zoomDist + e.deltaY * 0.0028));
}, { passive: false });

// ============================================================================
// 3. STUDIO TAB SWITCHING
// ============================================================================
function activateStudioTab(which) {
  const isP = which === 'protagonist';
  const isC = which === 'characters';
  const isS = which === 'spheres';

  tabProtagonist.classList.toggle('active', isP);
  tabCharacters.classList.toggle('active', isC);
  tabSpheres.classList.toggle('active', isS);

  viewProtagonist.hidden = !isP;
  viewCharacters.hidden = !isC;
  viewSpheres.hidden = !isS;

  protRenderer.state.active = isP;
  charRenderer.state.active = isC;
  sphereRenderer.state.active = isS;
}

tabProtagonist.addEventListener('click', () => activateStudioTab('protagonist'));
tabCharacters.addEventListener('click', () => activateStudioTab('characters'));
tabSpheres.addEventListener('click', () => activateStudioTab('spheres'));

btnCharSpheres.addEventListener('click', () => {
  const ch = CHARACTERS[charRenderer.state.selectedIdx];
  sphereRenderer.state.filter = String(ch.colorIndex);
  sphereRenderer.state.mode = 'gallery';
  sphereRenderer.resetAngle();
  syncSphereUI();
  activateStudioTab('spheres');
});

syncProtagonistUI();
syncCharacterUI();
syncSphereUI();
