/**
 * Nova — Genç Ana Karakter (Kadın & Erkek) ve Kanat Evrimi Tanımları
 * Başlangıçta kanatsızdır; aktif iki renkli füzyon küresine göre teni, saçları, kıyafeti
 * ve bölüm atladıkça gelişen kanatları iki yarım küre halinde (Sol Yarı / Sağ Yarı) renk değiştirir.
 */
export const PROTAGONISTS = [
  {
    id: 'kadin',
    label: 'Kadın Ana Karakter',
    shortLabel: 'Kadın',
    age: 23,
    earAnchor: [0.112, 0.754],
    orbAnchor: [-0.56, 0.22, 0.14],
    skinBaseRGB: [0.76, 0.60, 0.50],
    atlasUrl: './public/assets/protagonists/kadin_atlas.webp',
    sheetUrl: './public/assets/protagonists/kadin_sheet.jpg',
    summary: '23 yaşında genç gezgin büyücü-savaşçı • Çevik koyu-nötr deri/gümüş zırhlı ceket, pantolon, çizme ve küre eldiveni.'
  },
  {
    id: 'erkek',
    label: 'Erkek Ana Karakter',
    shortLabel: 'Erkek',
    age: 23,
    earAnchor: [0.101, 0.706],
    orbAnchor: [-0.52, 0.16, 0.14],
    skinBaseRGB: [0.74, 0.58, 0.48],
    atlasUrl: './public/assets/protagonists/erkek_atlas.webp',
    sheetUrl: './public/assets/protagonists/erkek_sheet.jpg',
    summary: '23 yaşında genç gezgin büyücü-savaşçı • Çevik koyu-nötr deri/gümüş zırhlı ceket, pantolon, çizme ve küre eldiveni.'
  }
];

export const FUSION_SHOWCASE_URL = './public/assets/protagonists/fuzyon_showcase.jpg';

export const WING_STAGES = [
  { stage: 0, name: 'Aşama 0: Kanatsız (Başlangıç)', shortName: '0 • Kanatsız' },
  { stage: 1, name: 'Aşama 1: Kristal Filizler',     shortName: '1 • Filiz' },
  { stage: 2, name: 'Aşama 2: Keskin Çift Kanat',    shortName: '2 • Çift Kanat' },
  { stage: 3, name: 'Aşama 3: 4\'lü Asil Kanat',     shortName: '3 • 4\'lü Kanat' },
  { stage: 4, name: 'Aşama 4: 6\'lı Hükümdar Kanadı', shortName: '4 • 6\'lı Hükümdar' }
];
