/**
 * Nova — İhanete Uğrayan 8. Konsey Üyesi (Genç Kadın & Erkek Ana Karakter)
 * Kaynak: docs/hikaye/nova_hikaye_incili.md (Bölüm 2, 3 ve 7)
 *
 * Dönüşüm Kuralı:
 * - Nötr Hal ('neutral'): Küre aktif değilken karakter nötr görünümündedir ve KANATSIZDIR.
 * - Tek Küre Aktif ('single'): O rengin gücü ve geçici kanatları açılır.
 * - İkili Nektar Aktif ('dual'): Karakterin teni, saçı ve kıyafeti yarı yarıya o iki renge bürünür,
 *   sırtında yalnızca küre aktifken duran iki renkli kanatlar belirir ve 21 birleşik yetenekten biri açılır.
 * - Hükümdar Sonu ('sovereign7'): 7 Ana Kürenin tamamı tek başına içildiğinde 7 renkli devasa kanatlar açılır.
 */
export const PROTAGONISTS = [
  {
    id: 'kadin',
    label: '8. Üye — Kadın Ana Karakter',
    shortLabel: 'Kadın',
    age: 23,
    earAnchor: [0.112, 0.754],
    orbAnchor: [-0.56, 0.22, 0.14],
    skinBaseRGB: [0.76, 0.60, 0.50],
    atlasUrl: './public/assets/protagonists/kadin_atlas.webp',
    sheetUrl: './public/assets/protagonists/kadin_sheet.jpg',
    summary: 'Mührü ve kanatları sökülüp denize atılan 8. Konsey Üyesi • İki farklı küre nektarını aynı anda içip birleştirebilen tek beden.'
  },
  {
    id: 'erkek',
    label: '8. Üye — Erkek Ana Karakter',
    shortLabel: 'Erkek',
    age: 23,
    earAnchor: [0.101, 0.706],
    orbAnchor: [-0.52, 0.16, 0.14],
    skinBaseRGB: [0.74, 0.58, 0.48],
    atlasUrl: './public/assets/protagonists/erkek_atlas.webp',
    sheetUrl: './public/assets/protagonists/erkek_sheet.jpg',
    summary: 'Mührü ve kanatları sökülüp denize atılan 8. Konsey Üyesi • İki farklı küre nektarını aynı anda içip birleştirebilen tek beden.'
  }
];

export const FUSION_SHOWCASE_URL = './public/assets/protagonists/fuzyon_showcase.jpg';

export const NECTAR_MODES = [
  { id: 'neutral',    label: 'Nötr Hal (Kanatsız)' },
  { id: 'single',     label: 'Tek Küre Nektarı' },
  { id: 'dual',       label: 'İkili Nektar Füzyonu (21 Yetenek)' },
  { id: 'sovereign7', label: 'Hükümdar Sonu (7 Küre Birden!)' }
];

export const WING_STAGES = [
  { stage: 1, name: 'Küre Kanadı I: Kristal Filizler',     shortName: 'Evrim I • Filiz' },
  { stage: 2, name: 'Küre Kanadı II: Keskin Çift Kanat',    shortName: 'Evrim II • Çift' },
  { stage: 3, name: 'Küre Kanadı III: 4\'lü Asil Kanat',    shortName: 'Evrim III • 4\'lü' },
  { stage: 4, name: 'Küre Kanadı IV: 6\'lı Hükümdar Kanadı', shortName: 'Evrim IV • 6\'lı' }
];
