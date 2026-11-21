/**
 * Nova — 7 Küre Nektarı Temel Yetenekleri ve 21 İkili Nektar Kombinasyonu
 * Kaynak: docs/hikaye/nova_hikaye_incili.md & docs/hikaye/21_nektar_kombinasyonlari.md
 */
export const SPHERE_COLORS = [
  {
    id: 'red',
    index: 0,
    name: 'Kırmızı',
    hex: '#e11d2e',
    crevice: [0.36, 0.01, 0.04],
    core: [0.91, 0.07, 0.12],
    tip: [1.00, 0.24, 0.26],
    seed: 1.15,
    morph: [1.05, 0.85, 0.35],
    baseSkillName: 'Kızıl Pençe & Can Emme',
    baseSkillDesc: 'Yakın mesafede zırhları kesen kızıl pençeler çıkarır ve vurdukça can yeniler.'
  },
  {
    id: 'orange',
    index: 1,
    name: 'Turuncu',
    hex: '#ff6d00',
    crevice: [0.46, 0.13, 0.00],
    core: [1.00, 0.42, 0.02],
    tip: [1.00, 0.60, 0.12],
    seed: 2.73,
    morph: [0.85, 1.15, 0.45],
    baseSkillName: 'Roket Atılma & Patlama',
    baseSkillDesc: 'İleriye roket gibi hızla atılıp çarptığı yeri patlatarak kırmayı sağlar.'
  },
  {
    id: 'green',
    index: 2,
    name: 'Yeşil',
    hex: '#12b844',
    crevice: [0.01, 0.28, 0.08],
    core: [0.07, 0.76, 0.24],
    tip: [0.26, 0.92, 0.40],
    seed: 4.31,
    morph: [0.75, 0.70, 0.95],
    baseSkillName: 'Dev Sarmaşık & Kök Örme',
    baseSkillDesc: 'Yerden dev sarmaşık/kök çıkarıp düşmanı bağlamayı veya dal örmeyi sağlar.'
  },
  {
    id: 'pink',
    index: 3,
    name: 'Pembe',
    hex: '#ff4da6',
    crevice: [0.46, 0.05, 0.26],
    core: [1.00, 0.30, 0.66],
    tip: [1.00, 0.54, 0.80],
    seed: 6.08,
    morph: [1.15, 0.95, 0.25],
    baseSkillName: 'Ağırlıksız Süzülme & Sahte Kopya',
    baseSkillDesc: 'Havada ağırlıksız gibi yavaşça süzülmeyi ve patlayan sahte kopya bırakmayı sağlar.'
  },
  {
    id: 'purple',
    index: 4,
    name: 'Mor',
    hex: '#7c1fff',
    crevice: [0.19, 0.02, 0.44],
    core: [0.50, 0.11, 0.98],
    tip: [0.68, 0.34, 1.00],
    seed: 7.92,
    morph: [0.90, 1.05, 0.65],
    baseSkillName: 'Yapışkan Çekim Sıvısı',
    baseSkillDesc: 'Uzağa mor yapışkan sıvı atıp kendimizi hızla o noktaya çekmeyi sağlar.'
  },
  {
    id: 'blue',
    index: 5,
    name: 'Mavi',
    hex: '#0d8bf2',
    crevice: [0.01, 0.16, 0.46],
    core: [0.05, 0.54, 0.98],
    tip: [0.28, 0.74, 1.00],
    seed: 9.64,
    morph: [0.80, 0.85, 0.85],
    baseSkillName: 'Buz Basamak & Dondurma',
    baseSkillDesc: 'Suyu veya havayı dondurup buzdan basamak/kaydırak yapmayı ve dondurmayı sağlar.'
  },
  {
    id: 'yellow',
    index: 6,
    name: 'Sarı',
    hex: '#ffd60a',
    crevice: [0.54, 0.36, 0.00],
    core: [1.00, 0.85, 0.03],
    tip: [1.00, 0.94, 0.32],
    seed: 11.47,
    morph: [1.10, 1.00, 0.40],
    baseSkillName: 'Dev Sıçrayış',
    baseSkillDesc: 'Çok yükseğe zıplama sağlar.'
  }
];

/**
 * 21 Resmi İkili Nektar Kombinasyonu Tablosu (docs/hikaye/21_nektar_kombinasyonlari.md)
 * Anahtar formatı: `${minIdx}_${maxIdx}`
 */
const CANON_21_NECTARS = {
  // 1. Sarı Küre Birleşimleri (Zıplama Odaklı — 6 Kombinasyon)
  '4_6': {
    canonNo: 1,
    category: 'Sarı Küre Birleşimleri (Zıplama)',
    skillName: 'Uçan Sapan',
    pairLabel: 'Sarı + Mor',
    desc: 'Çok yükseğe zıplarız ve havadayken uzağa mor yapışkan sıvı atıp kendimizi hızla ileri çekeriz.'
  },
  '5_6': {
    canonNo: 2,
    category: 'Sarı Küre Birleşimleri (Zıplama)',
    skillName: 'Buz Kulesi Sıçrayışı',
    pairLabel: 'Sarı + Mavi',
    desc: 'Zıpladığımız her noktada altımızda bir buz sütunu yükselir; art arda zıplayarak yukarıya buzdan basamaklar dikebiliriz.'
  },
  '1_6': {
    canonNo: 3,
    category: 'Sarı Küre Birleşimleri (Zıplama)',
    skillName: 'Göktaşı Düşüşü',
    pairLabel: 'Sarı + Turuncu',
    desc: 'Çok yükseğe zıplarız ve yere hızla çakılarak düştüğümüz yerde büyük bir patlama yaratırız.'
  },
  '2_6': {
    canonNo: 4,
    category: 'Sarı Küre Birleşimleri (Zıplama)',
    skillName: 'Trambolin Kök',
    pairLabel: 'Sarı + Yeşil',
    desc: 'Yerden esnek bir sarmaşık ağı çıkarırız; üstüne bastığımızda normal zıplamanın iki katı yükseğe fırlatır.'
  },
  '0_6': {
    canonNo: 5,
    category: 'Sarı Küre Birleşimleri (Zıplama)',
    skillName: 'Dönen Pençe Çarkı',
    pairLabel: 'Sarı + Kırmızı',
    desc: 'Yükseğe sıçrayıp havada dönen kızıl pençelerle uçan düşmanları biçeriz ve vurdukça can doldururuz.'
  },
  '3_6': {
    canonNo: 6,
    category: 'Sarı Küre Birleşimleri (Zıplama)',
    skillName: 'Uçurum Süzülüşü',
    pairLabel: 'Sarı + Pembe',
    desc: 'Dev bir sıçrayıştan sonra balon gibi ağırlıksız süzülerek çok uzaklara uçarız; zıpladığımız yerde patlayan bir kopyamız kalır.'
  },

  // 2. Mor Küre Birleşimleri (Yapışkan Sıvı & Çekim Odaklı — 5 Kombinasyon)
  '4_5': {
    canonNo: 7,
    category: 'Mor Küre Birleşimleri (Çekim)',
    skillName: 'Donduran Kanca',
    pairLabel: 'Mor + Mavi',
    desc: 'Yapışkan sıvı değdiği suyu veya düşmanı dondurur; kendimizi o buz noktasına çekebilir ya da donmuş düşmanı savurabiliriz.'
  },
  '1_4': {
    canonNo: 8,
    category: 'Mor Küre Birleşimleri (Çekim)',
    skillName: 'Canlı Torpido',
    pairLabel: 'Mor + Turuncu',
    desc: 'Uzağa yapışkan sıvı atıp kendimizi roket hızıyla oraya çekeriz ve çarptığımız anda hedefi patlatarak kırarız.'
  },
  '2_4': {
    canonNo: 9,
    category: 'Mor Küre Birleşimleri (Çekim)',
    skillName: 'Kement Sarmaşık',
    pairLabel: 'Mor + Yeşil',
    desc: 'Yapışkan sıvı düştüğü yerden sarmaşıklar çıkarır; etraftaki düşmanları birbirine yapıştırıp tek noktaya çeker ve bağlar.'
  },
  '0_4': {
    canonNo: 10,
    category: 'Mor Küre Birleşimleri (Çekim)',
    skillName: 'Avcı Çekişi',
    pairLabel: 'Mor + Kırmızı',
    desc: 'Uzaktaki düşmanı yapışkan sıvıyla hızla kendi önümüze çekeriz ve kızıl pençe darbesiyle canını emerek keseriz.'
  },
  '3_4': {
    canonNo: 11,
    category: 'Mor Küre Birleşimleri (Çekim)',
    skillName: 'Tuzak Çekimi',
    pairLabel: 'Mor + Pembe',
    desc: 'Olduğumuz yerde patlayıcı kopyamızı bırakıp yapışkan sıvıyla kendimizi hızla güvenli bir yere çekeriz.'
  },

  // 3. Mavi Küre Birleşimleri (Buz & Dondurma Odaklı — 4 Kombinasyon)
  '1_5': {
    canonNo: 12,
    category: 'Mavi Küre Birleşimleri (Buz)',
    skillName: 'Buz Roketi',
    pairLabel: 'Mavi + Turuncu',
    desc: 'Önümüzde kaygan bir buz kaydırağı oluşturup üstünde roket hızıyla kayarız; çarptığımız tüm engelleri patlatırız.'
  },
  '2_5': {
    canonNo: 13,
    category: 'Mavi Küre Birleşimleri (Buz)',
    skillName: 'Buzlu Sarmaşık Surları',
    pairLabel: 'Mavi + Yeşil',
    desc: 'Yerden hem üstüne tırmanılabilen hem de dokunan düşmanları donduran dikenli buz sarmaşıkları öreriz.'
  },
  '0_5': {
    canonNo: 14,
    category: 'Mavi Küre Birleşimleri (Buz)',
    skillName: 'Tuzla Buz Pençesi',
    pairLabel: 'Mavi + Kırmızı',
    desc: 'Pençe vuruşlarımız düşmanı dondurur; donmuş hedefe vurduğumuz son darbe onu parçalayıp ekstra can verir.'
  },
  '3_5': {
    canonNo: 15,
    category: 'Mavi Küre Birleşimleri (Buz)',
    skillName: 'Kar Fırtınası Kopyası',
    pairLabel: 'Mavi + Pembe',
    desc: 'Havada süzülürken altımızda buzdan yollar bırakırız; bıraktığımız sahte kopya patladığında çevresindekileri dondurur.'
  },

  // 4. Turuncu Küre Birleşimleri (Roket Atılma & Patlama Odaklı — 3 Kombinasyon)
  '1_2': {
    canonNo: 16,
    category: 'Turuncu Küre Birleşimleri (Patlama)',
    skillName: 'Patlayan Tohumlar',
    pairLabel: 'Turuncu + Yeşil',
    desc: 'İleriye hızla atılırken arkamızda sarmaşık tohumları bırakırız; tohumlar düşmanı bağlayıp birkaç saniye sonra patlar.'
  },
  '0_1': {
    canonNo: 17,
    category: 'Turuncu Küre Birleşimleri (Patlama)',
    skillName: 'Alevli Pençe Yarığı',
    pairLabel: 'Turuncu + Kırmızı',
    desc: 'İleriye roket gibi fırlayıp yolumuzdaki düşmanları kızıl-turuncu pençeyle boydan boya yararız ve can yenileriz.'
  },
  '1_3': {
    canonNo: 18,
    category: 'Turuncu Küre Birleşimleri (Patlama)',
    skillName: 'Güdümlü Kopya',
    pairLabel: 'Turuncu + Pembe',
    desc: 'Kendimiz geriye doğru hafifçe süzülürken ileriye roket hızıyla koşup hedefe çarparak patlayan sahte bir kopyamızı yollarız.'
  },

  // 5. Yeşil ve Kırmızı / Pembe Birleşimleri (Son 3 Kombinasyon)
  '0_2': {
    canonNo: 19,
    category: 'Yeşil & Kırmızı/Pembe Birleşimleri',
    skillName: 'Can Emen Dikenler',
    pairLabel: 'Yeşil + Kırmızı',
    desc: 'Yerden çıkan dev sarmaşıklar düşmanı sıkıca bağlar ve ondan çektiği canı doğrudan bize aktarır.'
  },
  '2_3': {
    canonNo: 20,
    category: 'Yeşil & Kırmızı/Pembe Birleşimleri',
    skillName: 'Uçan Sarmaşık Köprüsü',
    pairLabel: 'Yeşil + Pembe',
    desc: 'Boşlukta havada asılı duran hafif sarmaşık basamakları öreriz; uçurumların üstünden yürüyerek geçmemizi sağlar.'
  },
  '0_3': {
    canonNo: 21,
    category: 'Yeşil & Kırmızı/Pembe Birleşimleri',
    skillName: 'Hayalet Biçici',
    pairLabel: 'Kırmızı + Pembe',
    desc: 'Düşmanın önünde patlayan sahte kopyamızı bırakırken kendimiz ağırlıksızca arkasına süzülüp kızıl pençeyle darbe indiririz.'
  }
};

export const FUSION_PAIRS = (() => {
  const pairs = [];
  let idx = 0;
  for (let i = 0; i < SPHERE_COLORS.length; i++) {
    for (let j = i + 1; j < SPHERE_COLORS.length; j++) {
      const key = `${i}_${j}`;
      const canon = CANON_21_NECTARS[key];
      const seed = 1.4 + idx * 1.57;
      const morph = [
        0.82 + ((idx * 3) % 4) * 0.08,
        0.85 + ((idx * 5 + 1) % 4) * 0.08,
        0.40 + ((idx * 2) % 4) * 0.12
      ];
      const splitTilt = ((idx % 5) - 2) * 0.12;
      pairs.push({
        index: idx,
        canonNo: canon.canonNo,
        id: `${SPHERE_COLORS[i].id}_${SPHERE_COLORS[j].id}`,
        i,
        j,
        cA: SPHERE_COLORS[i],
        cB: SPHERE_COLORS[j],
        title: `${canon.skillName} (${canon.pairLabel})`,
        skillName: canon.skillName,
        pairLabel: canon.pairLabel,
        category: canon.category,
        desc: canon.desc,
        seed,
        morph,
        splitTilt
      });
      idx++;
    }
  }
  // Sort by canon numbering (#1..#21) or keep index accessible; keeping stable order with canonNo metadata
  return pairs;
})();

/**
 * Returns the skill info for any (colorA, colorB) selection:
 * - If colorA === colorB: returns Single Nectar Power
 * - If colorA !== colorB: returns the matching Canon Dual Nectar Combination (#1..#21)
 */
export function getNectarSkillInfo(colorA, colorB) {
  if (colorA === colorB) {
    const c = SPHERE_COLORS[colorA];
    return {
      isSingle: true,
      canonNo: null,
      skillName: c.baseSkillName,
      pairLabel: `Tek Küre: ${c.name}`,
      desc: c.baseSkillDesc
    };
  }
  const lo = Math.min(colorA, colorB);
  const hi = Math.max(colorA, colorB);
  const found = FUSION_PAIRS.find((p) => p.i === lo && p.j === hi);
  return {
    isSingle: false,
    canonNo: found.canonNo,
    skillName: found.skillName,
    pairLabel: `${SPHERE_COLORS[colorA].name} + ${SPHERE_COLORS[colorB].name}`,
    desc: found.desc
  };
}
