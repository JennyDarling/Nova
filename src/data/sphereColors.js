/**
 * Nova — 7 Ana Renk ve 21 İki-Taraflı Renk Kombinasyonu
 * Ana Renkler: Kırmızı, Turuncu, Yeşil, Pembe, Mor, Mavi, Sarı
 */
export const SPHERE_COLORS = [
  {
    id: 'red',
    name: 'Kırmızı',
    hex: '#e11d2e',
    crevice: [0.36, 0.01, 0.04],
    core: [0.91, 0.07, 0.12],
    tip: [1.00, 0.24, 0.26],
    seed: 1.15,
    morph: [1.05, 0.85, 0.35]
  },
  {
    id: 'orange',
    name: 'Turuncu',
    hex: '#ff6d00',
    crevice: [0.46, 0.13, 0.00],
    core: [1.00, 0.42, 0.02],
    tip: [1.00, 0.60, 0.12],
    seed: 2.73,
    morph: [0.85, 1.15, 0.45]
  },
  {
    id: 'green',
    name: 'Yeşil',
    hex: '#12b844',
    crevice: [0.01, 0.28, 0.08],
    core: [0.07, 0.76, 0.24],
    tip: [0.26, 0.92, 0.40],
    seed: 4.31,
    morph: [0.75, 0.70, 0.95]
  },
  {
    id: 'pink',
    name: 'Pembe',
    hex: '#ff4da6',
    crevice: [0.46, 0.05, 0.26],
    core: [1.00, 0.30, 0.66],
    tip: [1.00, 0.54, 0.80],
    seed: 6.08,
    morph: [1.15, 0.95, 0.25]
  },
  {
    id: 'purple',
    name: 'Mor',
    hex: '#7c1fff',
    crevice: [0.19, 0.02, 0.44],
    core: [0.50, 0.11, 0.98],
    tip: [0.68, 0.34, 1.00],
    seed: 7.92,
    morph: [0.90, 1.05, 0.65]
  },
  {
    id: 'blue',
    name: 'Mavi',
    hex: '#0d8bf2',
    crevice: [0.01, 0.16, 0.46],
    core: [0.05, 0.54, 0.98],
    tip: [0.28, 0.74, 1.00],
    seed: 9.64,
    morph: [0.80, 0.85, 0.85]
  },
  {
    id: 'yellow',
    name: 'Sarı',
    hex: '#ffd60a',
    crevice: [0.54, 0.36, 0.00],
    core: [1.00, 0.85, 0.03],
    tip: [1.00, 0.94, 0.32],
    seed: 11.47,
    morph: [1.10, 1.00, 0.40]
  }
];

export const FUSION_PAIRS = (() => {
  const pairs = [];
  let idx = 0;
  for (let i = 0; i < SPHERE_COLORS.length; i++) {
    for (let j = i + 1; j < SPHERE_COLORS.length; j++) {
      const seed = 1.4 + idx * 1.57;
      const morph = [
        0.82 + ((idx * 3) % 4) * 0.08,
        0.85 + ((idx * 5 + 1) % 4) * 0.08,
        0.40 + ((idx * 2) % 4) * 0.12
      ];
      const splitTilt = ((idx % 5) - 2) * 0.12;
      pairs.push({
        index: idx,
        id: `${SPHERE_COLORS[i].id}_${SPHERE_COLORS[j].id}`,
        i,
        j,
        cA: SPHERE_COLORS[i],
        cB: SPHERE_COLORS[j],
        title: `${SPHERE_COLORS[i].name} + ${SPHERE_COLORS[j].name}`,
        seed,
        morph,
        splitTilt
      });
      idx++;
    }
  }
  return pairs;
})();
