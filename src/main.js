import { SPHERE_COLORS, FUSION_PAIRS, getNectarSkillInfo } from './data/sphereColors.js';
import { CHARACTERS } from './data/characters.js';
import { PROTAGONISTS, WING_STAGES, FUSION_SHOWCASE_URL } from './data/protagonists.js';
import { createOpenWorldGame } from './game/OpenWorldGame.js';
import { createProtagonist3DRenderer } from './graphics/ProtagonistRenderer.js';
import { createCharacter3DRenderer } from './graphics/CharacterRenderer.js';
import { exportCharacterMeshToOBJ } from './graphics/CharacterModelBuilder.js';
import { createBioSphereRenderer } from './graphics/BioSphereRenderer.js';

// --- Studio View Tabs ---
const tabWorld = document.getElementById('tab-world');
const tabProtagonist = document.getElementById('tab-protagonist');
const tabCharacters = document.getElementById('tab-characters');
const tabSpheres = document.getElementById('tab-spheres');

const viewWorld = document.getElementById('view-world');
const viewProtagonist = document.getElementById('view-protagonist');
const viewCharacters = document.getElementById('view-characters');
const viewSpheres = document.getElementById('view-spheres');

// ============================================================================
// 0. PLAYABLE 3D OPEN-WORLD GAME (Prolog Sea -> Shore -> 7 Bosses -> 2 Endings)
// ============================================================================
const worldCanvas = document.getElementById('world-canvas');
const worldRegionSelect = document.getElementById('world-region-select');
const btnWorldProlog = document.getElementById('btn-world-prolog');
const btnWorldEndings = document.getElementById('btn-world-endings');
const worldHudRegion = document.getElementById('world-hud-region');
const worldHudSkill = document.getElementById('world-hud-skill');
const worldHudDesc = document.getElementById('world-hud-desc');
const worldNectarBar = document.getElementById('world-nectar-bar');
const worldHpBadge = document.getElementById('world-hp-badge');
const worldBossBadge = document.getElementById('world-boss-badge');
const worldNectarBtns = document.getElementById('world-nectar-btns');
const btnWorldJump = document.getElementById('btn-world-jump');
const btnWorldCast = document.getElementById('btn-world-cast');
const btnWorldPurge = document.getElementById('btn-world-purge');

const storyModal = document.getElementById('world-story-modal');
const storyModalKicker = document.getElementById('story-modal-kicker');
const storyModalTitle = document.getElementById('story-modal-title');
const storyModalBody = document.getElementById('story-modal-body');
const storyEndingActions = document.getElementById('story-ending-actions');
const btnChooseFreedom = document.getElementById('btn-choose-freedom');
const btnChooseSovereign = document.getElementById('btn-choose-sovereign');
const btnCloseStory = document.getElementById('btn-close-story');

worldRegionSelect.add(new Option('Prolog: Deniz Dibi & Issız Kıyı', 'prolog'));
CHARACTERS.forEach((b, idx) => {
  worldRegionSelect.add(new Option(`${b.regionName} — ${b.bossName} (${b.colorName}, Yaş ${b.age})`, String(idx)));
});

function openStoryModal({ kicker, title, body, showEndings = false }) {
  storyModalKicker.textContent = kicker;
  storyModalTitle.textContent = title;
  storyModalBody.textContent = body;
  storyEndingActions.hidden = !showEndings;
  storyModal.hidden = false;
}

const worldGame = createOpenWorldGame(worldCanvas, SPHERE_COLORS, CHARACTERS, {
  onHudUpdate(hud) {
    worldHudRegion.textContent = hud.region;
    worldHudSkill.textContent = `${hud.modeLabel} — ${hud.skillTitle}`;
    worldHudDesc.textContent = hud.skillDesc;
    worldNectarBar.style.width = `${Math.round(hud.nectarRatio * 100)}%`;
    worldHpBadge.textContent = `Can: ${hud.hp}%`;
    worldBossBadge.textContent = `Anı & Ana Küre: ${hud.defeatedCount} / 7`;

    worldNectarBtns.querySelectorAll('.world-orb-btn').forEach((btn) => {
      const idx = Number(btn.dataset.cidx);
      btn.classList.toggle('active', hud.nectarSlots.includes(idx));
    });
  },
  onBossDefeated(bossInfo, defeatedCount) {
    // Also evolve Protagonist studio wing stage as memories awaken!
    protRenderer.state.wingStage = Math.min(4, 1 + Math.floor(defeatedCount / 2));
    syncProtagonistUI();

    if (defeatedCount >= 7) {
      openStoryModal({
        kicker: `7 / 7 Anı Tamamlandı • ${bossInfo.memoryTitle}`,
        title: `${bossInfo.bossName} Devrildi — Tüm Hafızan Geri Geldi!`,
        body: `${bossInfo.memoryText} Artık 7 Ana Küre de elinde. Eski sözünü tutup Nova'yı halka mı vereceksin, yoksa 7 rengin tamamını tek başına mı içeceksin?`,
        showEndings: true
      });
    } else {
      openStoryModal({
        kicker: `${defeatedCount} / 7 Ana Küre Kazanıldı • ${bossInfo.colorName}`,
        title: `${bossInfo.bossName} Yenildi — ${bossInfo.memoryTitle}`,
        body: bossInfo.memoryText,
        showEndings: false
      });
    }
  }
});

SPHERE_COLORS.forEach((c, idx) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch-btn world-orb-btn';
  b.dataset.cidx = String(idx);
  b.innerHTML = `<span class="swatch-dot" style="background:${c.hex}"></span><span>${idx + 1}:${c.name}</span>`;
  b.addEventListener('click', () => worldGame.drinkNectarColor(idx));
  worldNectarBtns.appendChild(b);
});

worldRegionSelect.addEventListener('change', () => {
  const v = worldRegionSelect.value;
  worldGame.teleportToRegion(v === 'prolog' ? 'prolog' : Number(v));
});
btnWorldProlog.addEventListener('click', () => {
  worldRegionSelect.value = 'prolog';
  worldGame.teleportToRegion('prolog');
});
btnWorldEndings.addEventListener('click', () => {
  openStoryModal({
    kicker: 'Bölüm 7 — İki Farklı Son',
    title: '7 Ana Küre Tamamlandığında Kararın Ne Olacak?',
    body: '1) Özgürlük Sonu: Uğruna ihanete uğradığın sözü tut, 7 Ana Küreyi doğaya ve halka geri ver; Kanatlı-Kanatsız ayrımı bitsin.  2) Hükümdar Sonu: Dünyayı affetme, 7 Ana Kürenin nektarını tek başına iç; 7 renkli devasa kanatlarla tek mutlak hükümdar ol!',
    showEndings: true
  });
});

btnChooseFreedom.addEventListener('click', () => {
  worldGame.chooseEnding('freedom');
  protRenderer.state.nectarMode = 'neutral';
  syncProtagonistUI();
  openStoryModal({
    kicker: 'Özgürlük Sonu Seçildi',
    title: 'Nova Yeniden Doğaya ve Halka Döndü',
    body: 'Eski sözünü tuttun. 7 Ana Kürenin özü gökyüzüne dağıldı, mühürler kırıldı, Kanatlı–Kanatsız zulmü sonsuza dek sona erdi.',
    showEndings: false
  });
});

btnChooseSovereign.addEventListener('click', () => {
  worldGame.chooseEnding('sovereign');
  protRenderer.state.nectarMode = 'sovereign7';
  syncProtagonistUI();
  openStoryModal({
    kicker: 'Hükümdar Sonu Seçildi',
    title: '7 Ana Küreyi Tek Başına İçtin!',
    body: 'Sırtında 7 rengin tamamını taşıyan devasa Hükümdar kanatları açıldı. F tuşuyla Nova Tufanı yaratabilir veya 8. Üye 3D sekmesinde 7 renkli kanatlarını inceleyebilirsin!',
    showEndings: false
  });
});

btnCloseStory.addEventListener('click', () => {
  storyModal.hidden = true;
});

btnWorldJump.addEventListener('click', () => worldGame.handleJump());
btnWorldCast.addEventListener('click', () => worldGame.triggerActiveSkill());
btnWorldPurge.addEventListener('click', () => worldGame.purgeNectar());

// ============================================================================
// 1. 8TH COUNCIL MEMBER — 3D PROTAGONIST & NECTAR TRANSFORMATION STUDIO
// ============================================================================
const protCanvas = document.getElementById('protagonist-canvas');
const protSheetInspector = document.getElementById('prot-sheet-inspector');
const protSheetImg = document.getElementById('prot-sheet-img');
const protHudTitle = document.getElementById('prot-hud-title');
const protHudSkill = document.getElementById('prot-hud-skill');
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

const protNmodeBtns = document.querySelectorAll('.prot-nmode-btn');
const protWingPills = document.getElementById('prot-wing-pills');
const protAnimToggle = document.getElementById('prot-anim-toggle');
const btnProtReset = document.getElementById('btn-prot-reset');
const protColorA = document.getElementById('prot-color-a');
const protColorB = document.getElementById('prot-color-b');
const protColorBWrap = document.getElementById('prot-color-b-wrap');
const btnProtPlayCombo = document.getElementById('btn-prot-play-combo');

let protSheetMode = false;

SPHERE_COLORS.forEach((c, idx) => {
  protColorA.add(new Option(`${c.name} (${c.baseSkillName})`, String(idx)));
  protColorB.add(new Option(`${c.name} (${c.baseSkillName})`, String(idx)));
});
protColorA.value = '6'; // Sarı
protColorB.value = '4'; // Mor -> #1 Uçan Sapan!

WING_STAGES.forEach((ws) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch-btn prot-wing-btn';
  b.dataset.stage = String(ws.stage);
  b.textContent = ws.shortName;
  protWingPills.appendChild(b);
});

const protRenderer = createProtagonist3DRenderer(protCanvas, PROTAGONISTS, SPHERE_COLORS, () => syncProtagonistUI());
protRenderer.state.active = false;

function syncProtagonistUI() {
  const st = protRenderer.state;
  const cA = SPHERE_COLORS[st.colorA];
  const effStage = protRenderer.getEffectiveWingStage();

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
  protNmodeBtns.forEach((b) => b.classList.toggle('active', b.dataset.nmode === st.nectarMode));

  protWingPills.querySelectorAll('.prot-wing-btn').forEach((b) => {
    b.classList.toggle('active', effStage > 0 && Number(b.dataset.stage) === effStage);
  });

  protColorBWrap.hidden = st.nectarMode !== 'dual';

  const who = st.genderMode === 'both'
    ? 'İhanete Uğrayan 8. Üye (Kadın & Erkek)'
    : (st.genderMode === 'erkek' ? PROTAGONISTS[1].label : PROTAGONISTS[0].label);

  protHudTitle.textContent = who;

  if (st.nectarMode === 'neutral') {
    protHudSkill.textContent = 'Nötr Hal — Kanatsız (Küre Etkisi Yok)';
    protHudSummary.textContent = 'Mührü söküldüğü için küre aktif değilken nötr ve kanatsızdır; iki farklı nektarı aynı anda içebilen tek bedendir.';
  } else if (st.nectarMode === 'single') {
    protHudSkill.textContent = `Tek Küre Aktif (${cA.name}) — ${cA.baseSkillName}`;
    protHudSummary.textContent = `${cA.baseSkillDesc} (Sırtta geçici ${cA.name} kanatlar açılır.)`;
  } else if (st.nectarMode === 'sovereign7') {
    protHudSkill.textContent = 'Hükümdar Sonu — 7 Ana Küre Tek Bedende!';
    protHudSummary.textContent = '7 Ana Kürenin bütün nektarı tek başına içildi; sırtta 7 rengin tamamını taşıyan 6\'lı Hükümdar kanatları açıldı!';
  } else {
    const info = getNectarSkillInfo(st.colorA, st.colorB);
    protHudSkill.textContent = info.isSingle
      ? `Tek Renk Seçili (${cA.name}) — ${info.skillName}`
      : `İkili Füzyon #${info.canonNo}: ${info.skillName} (${info.pairLabel})`;
    protHudSummary.textContent = info.desc;
  }

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

btnPcamFull.addEventListener('click', () => { protSheetMode = false; protRenderer.state.cameraPreset = 'full'; protRenderer.resetView(); syncProtagonistUI(); });
btnPcamBust.addEventListener('click', () => { protSheetMode = false; protRenderer.state.cameraPreset = 'bust'; protRenderer.resetView(); syncProtagonistUI(); });
btnPcamBack.addEventListener('click', () => {
  protSheetMode = false;
  protRenderer.state.cameraPreset = 'back';
  protRenderer.state.rotX = 0.07;
  protRenderer.state.rotY = Math.PI;
  protRenderer.state.zoomDist = 0;
  syncProtagonistUI();
});
btnPcamSheet.addEventListener('click', () => { protSheetMode = !protSheetMode; syncProtagonistUI(); });

protRenderBtns.forEach((b) => {
  b.addEventListener('click', () => {
    protSheetMode = false;
    protRenderer.state.renderStyle = b.dataset.prender;
    syncProtagonistUI();
  });
});

protNmodeBtns.forEach((b) => {
  b.addEventListener('click', () => {
    protSheetMode = false;
    protRenderer.state.nectarMode = b.dataset.nmode;
    if (protRenderer.state.nectarMode === 'dual' && protRenderer.state.colorA === protRenderer.state.colorB) {
      protRenderer.state.colorB = (protRenderer.state.colorA + 1) % SPHERE_COLORS.length;
      protColorB.value = String(protRenderer.state.colorB);
    }
    syncProtagonistUI();
  });
});

protWingPills.addEventListener('click', (e) => {
  const b = e.target.closest('.prot-wing-btn');
  if (!b) return;
  protSheetMode = false;
  if (protRenderer.state.nectarMode === 'neutral') protRenderer.state.nectarMode = 'dual';
  protRenderer.state.wingStage = Number(b.dataset.stage);
  syncProtagonistUI();
});

protColorA.addEventListener('change', () => {
  protSheetMode = false;
  protRenderer.state.colorA = Number(protColorA.value);
  if (protRenderer.state.nectarMode === 'neutral' || protRenderer.state.nectarMode === 'sovereign7') {
    protRenderer.state.nectarMode = 'dual';
  }
  syncProtagonistUI();
});

protColorB.addEventListener('change', () => {
  protSheetMode = false;
  protRenderer.state.colorB = Number(protColorB.value);
  protRenderer.state.nectarMode = 'dual';
  syncProtagonistUI();
});

btnProtPlayCombo.addEventListener('click', () => {
  const st = protRenderer.state;
  if (st.nectarMode === 'neutral') {
    worldGame.purgeNectar();
  } else if (st.nectarMode === 'sovereign7') {
    worldGame.chooseEnding('sovereign');
  } else if (st.nectarMode === 'single') {
    worldGame.setDualNectar(st.colorA, st.colorA);
  } else {
    worldGame.setDualNectar(st.colorA, st.colorB);
  }
  activateStudioTab('world');
});

protAnimToggle.addEventListener('change', () => { protRenderer.state.animate = protAnimToggle.checked; });
btnProtReset.addEventListener('click', () => { protSheetMode = false; protRenderer.resetView(); syncProtagonistUI(); });

btnProtObj.addEventListener('click', () => {
  const objText = protRenderer.exportCurrentOBJ();
  if (!objText) return;
  const url = URL.createObjectURL(new Blob([objText], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `nova_8_uye_${protRenderer.state.genderMode}.obj`;
  a.click();
  URL.revokeObjectURL(url);
});

let protPrevX = 0, protPrevY = 0;
protCanvas.addEventListener('pointerdown', (e) => {
  protRenderer.state.isDragging = true; protPrevX = e.clientX; protPrevY = e.clientY; protCanvas.setPointerCapture(e.pointerId);
});
protCanvas.addEventListener('pointermove', (e) => {
  if (!protRenderer.state.isDragging) return;
  const dx = e.clientX - protPrevX, dy = e.clientY - protPrevY;
  protPrevX = e.clientX; protPrevY = e.clientY;
  if (Math.hypot(dx, dy) > 2 && protRenderer.state.cameraPreset === 'back') protRenderer.state.cameraPreset = 'full';
  protRenderer.state.rotY += dx * 0.009;
  protRenderer.state.rotX = Math.max(-1.15, Math.min(1.15, protRenderer.state.rotX + dy * 0.009));
  protRenderer.state.velY = dx * 0.0025; protRenderer.state.velX = dy * 0.0025;
});
protCanvas.addEventListener('pointerup', () => { protRenderer.state.isDragging = false; syncProtagonistUI(); });
protCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  protRenderer.state.zoomDist = Math.max(-1.4, Math.min(2.6, protRenderer.state.zoomDist + e.deltaY * 0.0025));
}, { passive: false });

// ============================================================================
// 2. 7 DARK COUNCIL BOSSES 3D STUDIO (Malakor, Draven, Morvain, Lyra, Noctis, Kaelen, Vaelor)
// ============================================================================
const charCanvas = document.getElementById('character-canvas');
const councilLabels = document.getElementById('council-labels');
const sheetInspector = document.getElementById('sheet-inspector');
const sheetInspectorImg = document.getElementById('sheet-inspector-img');
const charHudTitle = document.getElementById('char-hud-title');
const charHudSummary = document.getElementById('char-hud-summary');
const charHudMemory = document.getElementById('char-hud-memory');
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
const btnCharFight = document.getElementById('btn-char-fight');
const btnCharSpheres = document.getElementById('btn-char-spheres');

let showSheetMode = false;

const councilTagEls = CHARACTERS.map((ch) => {
  const el = document.createElement('span');
  el.className = 'sphere-tag';
  el.innerHTML = `<span class="swatch-dot" style="background:${ch.hex}"></span><span>${ch.bossName} (${ch.age})</span>`;
  el.style.display = 'none';
  councilLabels.appendChild(el);
  return el;
});

CHARACTERS.forEach((ch, idx) => {
  const pill = document.createElement('button');
  pill.type = 'button';
  pill.className = 'swatch-btn char-pill';
  pill.dataset.charIdx = String(idx);
  pill.innerHTML = `<span class="swatch-dot" style="background:${ch.hex}"></span><span>${ch.bossName} • ${ch.colorName} (${ch.age})</span>`;
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
    charHudTitle.textContent = 'Karanlık Konsey — 7 Boss (Yaş 38–70)';
    charHudSummary.textContent = 'Nova\'yı parçalayıp 8. Üye\'ye ihanet eden 7 bölge hükümdarı. Bir Boss\'a tıklayarak anısını ve savaş tarzını inceleyin.';
    charHudMemory.hidden = true;
    charPolyBadge.textContent = totalTris > 0 ? `${totalVerts.toLocaleString('tr-TR')} köşe • ${totalTris.toLocaleString('tr-TR')} 3D üçgen` : '3D Modeller Yükleniyor...';
  } else {
    const st = charRenderer.getStats(selectedIdx);
    charHudTitle.textContent = `${ch.bossName} — ${ch.roleTitle} (${ch.colorName}, Yaş ${ch.age})`;
    charHudSummary.textContent = `${ch.regionName} (${ch.regionSubtitle}) • ${ch.combatStyle}`;
    charHudMemory.hidden = false;
    charHudMemory.textContent = `${ch.memoryTitle}: "${ch.memoryText}"`;
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

btnCharFight.addEventListener('click', () => {
  const idx = charRenderer.state.selectedIdx;
  worldRegionSelect.value = String(idx);
  worldGame.teleportToRegion(idx);
  activateStudioTab('world');
});

btnExportObj.addEventListener('click', () => {
  const idx = charRenderer.state.selectedIdx, ch = CHARACTERS[idx], rawMesh = charRenderer.getRawMesh(idx);
  if (!rawMesh) return;
  const url = URL.createObjectURL(new Blob([exportCharacterMeshToOBJ(rawMesh, ch)], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${ch.bossName.toLowerCase()}_3d_model.obj`; a.click();
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
// 3. 21 DUAL NECTAR SPHERES 3D STUDIO (#1 Uçan Sapan .. #21 Hayalet Biçici)
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
const btnSphereToProt = document.getElementById('btn-sphere-to-prot');
const btnSphereToWorld = document.getElementById('btn-sphere-to-world');
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
  selColorA.add(new Option(`${c.name} (${c.baseSkillName})`, String(idx)));
  selColorB.add(new Option(`${c.name} (${c.baseSkillName})`, String(idx)));
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

addFilterPill('all', 'Tümü (21 Nektar)', null);
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
      ? `<span class="swatch-dot" style="background:${p.cA.hex}"></span><span class="swatch-dot" style="background:${p.cB.hex}"></span><span>#${p.canonNo} ${p.skillName}</span>`
      : `<span class="swatch-dot" style="background:${p.cA.hex}"></span><span class="swatch-dot" style="background:${p.cB.hex}"></span><span>#${p.canonNo} ${p.skillName} (${p.pairLabel})</span>`;
  }

  if (mode === 'gallery') {
    backBtn.hidden = true;
    singlePickerRow.hidden = true;
    if (filter === 'all') {
      statusLabel.textContent = '21 İkili Nektar Kombinasyonu • Bir küreye tıklayarak birleşik yeteneğini ve açıklamasını inceleyin';
    } else {
      const cObj = SPHERE_COLORS[Number(filter)];
      const bossObj = CHARACTERS[Number(filter)];
      statusLabel.textContent = `${cObj.name} Ana Küresi (${bossObj.bossName} — ${cObj.baseSkillName}): ${cObj.baseSkillDesc}`;
    }
  } else {
    backBtn.hidden = false;
    singlePickerRow.hidden = false;
    hoverTooltip.hidden = true;
    const info = getNectarSkillInfo(single.colorA, single.colorB);
    statusLabel.textContent = info.isSingle
      ? `Tek Küre (${SPHERE_COLORS[single.colorA].name}) — ${info.skillName}: ${info.desc}`
      : `#${info.canonNo} ${info.skillName} (${info.pairLabel}): ${info.desc}`;
    selColorA.value = String(single.colorA);
    selColorB.value = String(single.colorB);
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

btnSphereToProt.addEventListener('click', () => {
  const { colorA, colorB } = sphereRenderer.state.single;
  protRenderer.state.nectarMode = colorA === colorB ? 'single' : 'dual';
  protRenderer.state.colorA = colorA;
  protRenderer.state.colorB = colorB;
  protColorA.value = String(colorA);
  protColorB.value = String(colorB);
  syncProtagonistUI();
  activateStudioTab('protagonist');
});

btnSphereToWorld.addEventListener('click', () => {
  const { colorA, colorB } = sphereRenderer.state.single;
  worldGame.setDualNectar(colorA, colorB);
  activateStudioTab('world');
});

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
    hoverTooltip.textContent = `#${pair.canonNo} ${pair.skillName} (${pair.pairLabel})`;
    hoverTooltip.style.left = `${hb.x}px`;
    hoverTooltip.style.top = `${hb.y - hb.r * 0.75}px`;
    hoverTooltip.hidden = false;
    sphereCanvas.style.cursor = 'pointer';
  } else {
    hoverTooltip.hidden = true;
    sphereCanvas.style.cursor = 'grab';
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
// 4. STUDIO TAB SWITCHING
// ============================================================================
function activateStudioTab(which) {
  const isW = which === 'world';
  const isP = which === 'protagonist';
  const isC = which === 'characters';
  const isS = which === 'spheres';

  tabWorld.classList.toggle('active', isW);
  tabProtagonist.classList.toggle('active', isP);
  tabCharacters.classList.toggle('active', isC);
  tabSpheres.classList.toggle('active', isS);

  viewWorld.hidden = !isW;
  viewProtagonist.hidden = !isP;
  viewCharacters.hidden = !isC;
  viewSpheres.hidden = !isS;

  worldGame.state.active = isW;
  protRenderer.state.active = isP;
  charRenderer.state.active = isC;
  sphereRenderer.state.active = isS;
}

tabWorld.addEventListener('click', () => activateStudioTab('world'));
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
