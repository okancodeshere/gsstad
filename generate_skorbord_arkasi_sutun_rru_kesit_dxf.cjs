/**
 * generate_skorbord_arkasi_sutun_rru_kesit_dxf.cjs
 *
 * PAFTA 11: ALAN 2 (kod alan4) SKORBORD ARKASI ÇAPRAZ SÜTUNLAR VE POL RRU KESİTİ
 *
 * Kullanıcı İsteği:
 * "bana skorboard arkası için kesit lazım. RRU lar ve yeni eklenen direkler olursa yeterli
 *  farklı bir autocad dosyasının içine aktaracagım"
 *
 * İçerik (yalnızca yeni çapraz sütunlar + 14 RRU + onları taşıyan pol / ofset kol / destekler):
 * - KESİT A-A : Yandan kesit (YZ düzlemi), X = -3.00m sol grup (sağ grup simetrik)
 * - GÖRÜNÜŞ B-B: Kedi yolundan bakış / elevasyon (XY düzlemi), sol + sağ grup
 * - PLAN C-C  : RRU montaj kotunda (Y = 1.44m) yatay kesit (XZ düzlemi), sol + sağ grup
 *
 * Koordinatlar model ile birebir: X = skorbord ekseni (X = 0), Y = alt kedi yolu döşemesi (±0.00),
 * Z = skorbord yönü negatif. Görünüş B-B ham model koordinatındadır (başka çizime taşırken
 * referans noktası: X = 0 / Y = 0). Kesit A-A ve Plan C-C yan yana ötelenmiştir (ofsetler aşağıda).
 *
 * Geometri kaynağı (main.js ile aynı sayılar; main.js değişirse burayı da güncelle):
 * - createAlan4Structure() "9.5. SKORBOARD ARKASI ÇAPRAZ KALIN TAŞIYICI SÜTUNLAR" (scoreboardDiagonalColumns)
 * - buildScoreboardStrutPoleRRUBlok(side)
 *
 * Çıktı:
 *   DXF_Ciktilari/Milimetre/11_ALAN_2_SKORBORD_ARKASI_SUTUN_VE_RRU_KESITI_mm.dxf
 *   DXF_Ciktilari/Metre/11_ALAN_2_SKORBORD_ARKASI_SUTUN_VE_RRU_KESITI_m.dxf
 */

const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

const FILE_BASE = '11_ALAN_2_SKORBORD_ARKASI_SUTUN_VE_RRU_KESITI';
const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');
const DIR_M = path.join(__dirname, 'DXF_Ciktilari', 'Metre');

// ---------------------------------------------------------------------------
// MODEL GEOMETRİSİ (metre, alan4 yerel koordinatları)
// ---------------------------------------------------------------------------
const STRUT_R = 0.254;                                  // Ø508 çapraz sütun
const LEAN = Math.tan(8 * Math.PI / 180);               // Sütun düzlemi +Z'ye 8° eğik
const DESIGN_TOP_Y = 12.5;                              // Fotoğraftaki doğrultuların tanım kotu
const CUT_Y = 7.45;                                     // Üst kedi yolu döşemesi altında kesim
const HUB_R = 0.42;                                     // Düğüm göbeği
const ROWS = [
  { name: 'ON SIRA (Silindir 1)', baseZ: -1.42, baseY: -0.14 },
  { name: 'ARKA SIRA (Silindir 2)', baseZ: 0.55, baseY: -0.12 }
];
const zAt = (row, y) => row.baseZ + (y - row.baseY) * LEAN;
const xAtY = (x1, y1, x2, y2, y) => x1 + (x2 - x1) * (y - y1) / (y2 - y1);

// Bir sıra + bir taraf için sütun elemanları (XY izdüşümünde başlangıç / bitiş)
function strutMembers(row, s) {
  const y0 = row.baseY;
  return [
    { name: 'uzun_capraz', x1: s * 5.55, y1: y0, x2: s * xAtY(5.55, y0, 10.80, DESIGN_TOP_Y, CUT_Y), y2: CUT_Y },
    { name: 'dikey_bacak', x1: s * 3.00, y1: y0, x2: s * 3.00, y2: 7.00 },
    { name: 'dis_bacak', x1: s * 5.25, y1: y0, x2: s * 3.00, y2: 7.00 },
    { name: 'ust_kol', x1: s * 3.00, y1: 7.00, x2: s * xAtY(3.00, 7.00, 5.00, DESIGN_TOP_Y, CUT_Y), y2: CUT_Y }
  ];
}

// Pol RRU blokları (buildScoreboardStrutPoleRRUBlok)
const POLE_Y = 1.44;
const RRU_BOT = 1.20, RRU_H = 0.48;
const FRONT = {
  poleZ: -1.21, extend: -1,
  rrus: [
    { label: 'TURKCELL RRU5301', layer: 'EKP_TURKCELL_RRU', x: 2.62, w: 0.400, t: 0.140 },
    { label: 'TURKCELL RRU5502', layer: 'EKP_TURKCELL_RRU', x: 2.42, w: 0.400, t: 0.140 },
    { label: 'TT RRU5527', layer: 'EKP_TURK_TELEKOM_RRU', x: 2.22, w: 0.356, t: 0.140 },
    { label: 'TT RRU5818W', layer: 'EKP_TURK_TELEKOM_RRU', x: 2.02, w: 0.356, t: 0.140 }
  ]
};
const REAR = {
  poleZ: -0.06, extend: 1,
  rrus: [
    { label: 'VODAFONE RRU5526t #1', layer: 'EKP_VODAFONE_RRU', x: 3.22, w: 0.432, t: 0.135 },
    { label: 'VODAFONE RRU5526t #2', layer: 'EKP_VODAFONE_RRU', x: 2.78, w: 0.432, t: 0.135 },
    { label: 'VODAFONE RRU5526t #3', layer: 'EKP_VODAFONE_RRU', x: 2.58, w: 0.432, t: 0.135 }
  ]
};
// RRU gövdesi Z aralığı: kelepçe polden 0.08m sonra başlar, genişlik extend yönünde
const rruZ = (grp, r) => {
  const a = grp.poleZ + grp.extend * 0.08;
  const b = a + grp.extend * r.w;
  return [Math.min(a, b), Math.max(a, b)];
};

// ---------------------------------------------------------------------------
// ÇİZİM YARDIMCILARI
// ---------------------------------------------------------------------------
function generate(units) {
  const k = units === 'mm' ? 1000 : 1;           // metre -> çizim birimi
  const dxf = new DxfBuilder(units);
  dxf.addLayer('SKORBORD_CAPRAZ_SUTUN', 9, 'CONTINUOUS');
  dxf.addLayer('POL_KOL_DESTEK', 2, 'CONTINUOUS');
  dxf.addLayer('REFERANS_KOT', 8, 'DASHED');
  dxf.addLayer('EKSEN', 1, 'DASHED');

  const L = (x1, y1, x2, y2, layer) => dxf.addLine(x1 * k, y1 * k, x2 * k, y2 * k, layer);
  const C = (x, y, r, layer) => dxf.addCircle(x * k, y * k, r * k, layer);
  const R = (x1, y1, x2, y2, layer) => dxf.addRect(Math.min(x1, x2) * k, Math.min(y1, y2) * k, Math.abs(x2 - x1) * k, Math.abs(y2 - y1) * k, layer);
  const T = (x, y, h, text, rot = 0, ha = 'left', va = 'baseline') => dxf.addText(x * k, y * k, h * k, text, 'METIN_BILGI', rot, ha, va);
  const D = (x1, y1, x2, y2, off, label) => dxf.addDimension(x1 * k, y1 * k, x2 * k, y2 * k, off * k, label);
  const mm = (m) => String(Math.round(m * 1000));

  // Boru dış hatları: eksen (x1,y1)-(x2,y2), yarıçap r -> iki paralel çizgi + uç kapakları
  const pipe = (x1, y1, x2, y2, r, layer, caps = true) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * r, ny = dx / len * r;
    L(x1 + nx, y1 + ny, x2 + nx, y2 + ny, layer);
    L(x1 - nx, y1 - ny, x2 - nx, y2 - ny, layer);
    if (caps) {
      L(x1 + nx, y1 + ny, x1 - nx, y1 - ny, layer);
      L(x2 + nx, y2 + ny, x2 - nx, y2 - ny, layer);
    }
    L(x1, y1, x2, y2, 'EKSEN');
  };
  const levelLine = (xa, xb, y, label) => {
    L(xa, y, xb, y, 'REFERANS_KOT');
    T(xb + 0.10, y + 0.03, 0.10, label);
  };

  // =========================================================================
  // GÖRÜNÜŞ B-B (XY, ham model koordinatı) — kedi yolundan skorborda bakış
  // =========================================================================
  T(-11.0, 9.1, 0.25, 'GORUNUS B-B : SKORBORD ARKASI CAPRAZ SUTUNLAR VE POL RRU (KEDI YOLUNDAN BAKIS)');
  T(-11.0, 8.75, 0.13, 'On ve arka sira sutunlar ayni X-Y izdusumune sahiptir (arka sira on siranin 1.97 m arkasinda). Orijin: X=0 skorbord ekseni, Y=0 alt kedi yolu doseme ust kotu.');
  levelLine(-11.0, 11.0, 0, '+-0.00 ALT KEDI YOLU DOSEMESI');
  levelLine(-11.0, 11.0, 1.10, '+1.10 KORKULUK UST KOTU');
  levelLine(-11.0, 11.0, 7.50, '+7.50 UST KEDI YOLU DOSEMESI');
  L(0, -0.6, 0, 8.2, 'EKSEN');
  T(0.08, 8.0, 0.10, 'SKORBORD EKSENI X=0');

  [-1, 1].forEach(s => {
    // Sütunlar (ön sıra izdüşümü; arka sıra çakışık)
    strutMembers(ROWS[0], s).forEach(m => pipe(m.x1, m.y1, m.x2, m.y2, STRUT_R, 'SKORBORD_CAPRAZ_SUTUN'));
    C(s * 3.00, 7.00, HUB_R, 'SKORBORD_CAPRAZ_SUTUN');

    // Ön pol (X = s*2.746 -> s*1.88) ve arka pol (s*2.48 -> s*3.32): kedi yolundan bakışta yatay boru
    pipe(s * 2.746, POLE_Y, s * 1.88, POLE_Y, 0.038, 'POL_KOL_DESTEK');
    pipe(s * 2.48, POLE_Y, s * 3.32, POLE_Y, 0.038, 'POL_KOL_DESTEK');
    // Ön pol çapraz desteği (sütun Y=2.40 -> pol ucu), arka pol desteği X = s*3.00 düzleminde (dikey çizgi)
    L(s * 2.746, 2.40, s * 1.92, POLE_Y, 'POL_KOL_DESTEK');
    L(s * 3.00, POLE_Y, s * 3.00, 2.20, 'POL_KOL_DESTEK');

    // RRU'lar: kedi yolundan ince kenar (kalınlık x yükseklik)
    [...FRONT.rrus, ...REAR.rrus].forEach(r => R(s * r.x - r.t / 2, RRU_BOT, s * r.x + r.t / 2, RRU_BOT + RRU_H, r.layer));
  });

  // Ölçüler (sol taraf)
  D(-5.55, -0.6, -3.00, -0.6, -0.35, mm(2.55));
  D(-3.00, -0.6, 0, -0.6, -0.35, mm(3.00));
  D(-10.6, 0, -10.6, 7.00, -0.4, mm(7.00));
  D(-10.6, 7.00, -10.6, CUT_Y, -0.4, mm(CUT_Y - 7.00));
  D(1.6, 0, 1.6, RRU_BOT, 0.35, mm(RRU_BOT));
  D(1.6, RRU_BOT, 1.6, RRU_BOT + RRU_H, 0.35, mm(RRU_H));
  T(-2.95, 2.0, 0.09, 'ON POL: 2x TURKCELL + 2x TT', 0);
  T(-3.45, 0.85, 0.09, 'ARKA POL: 3x VODAFONE', 0);
  T(-9.8, 5.4, 0.11, 'O508 CAPRAZ SUTUNLAR (2 SIRA)');
  T(-9.8, 5.2, 0.09, 'Ust uclar +7.45 kotunda flansla biter');

  // =========================================================================
  // KESİT A-A (YZ) — sol grup, X = -3.00 düzlemi. Ötelenmiş: yatay = Z + OFF_A_X
  // Yatay eksen model Z (sol = skorbord tarafı), düşey eksen model Y
  // =========================================================================
  const OFF_A_X = 16.0;
  const AZ = (z) => z + OFF_A_X;
  T(AZ(-3.4), 9.1, 0.25, 'KESIT A-A : YANDAN KESIT (X = -3.00 SOL GRUP, SAG GRUP SIMETRIK)');
  T(AZ(-3.4), 8.75, 0.13, `Yatay eksen model Z (ofset +${mm(OFF_A_X)}): Z=0 noktasi bu cizimde X=${mm(OFF_A_X)}. Sol taraf skorbord.`);
  levelLine(AZ(-3.4), AZ(2.6), 0, '+-0.00');
  levelLine(AZ(-3.4), AZ(2.6), 1.10, '+1.10 KORKULUK');
  levelLine(AZ(-3.4), AZ(2.6), 7.50, '+7.50 UST KEDI YOLU');
  T(AZ(-3.2), 3.6, 0.11, '<- SKORBORD');
  T(AZ(1.3), 3.6, 0.11, 'TRIBUN / CATI ->');

  ROWS.forEach(row => {
    // Sıranın tüm elemanları YZ'de aynı eğik banda düşer: Z(y), kalınlık 2R
    const zb = zAt(row, row.baseY), zt = zAt(row, CUT_Y);
    pipe(AZ(zb), row.baseY, AZ(zt), CUT_Y, STRUT_R / Math.cos(Math.atan(LEAN)), 'SKORBORD_CAPRAZ_SUTUN');
    C(AZ(zAt(row, 7.00)), 7.00, HUB_R, 'SKORBORD_CAPRAZ_SUTUN');
    T(AZ(zt) + 0.35, CUT_Y - 0.4, 0.10, row.name);
  });
  // Pol kesitleri (X yönünde yatay boru -> daire)
  C(AZ(FRONT.poleZ), POLE_Y, 0.038, 'POL_KOL_DESTEK');
  C(AZ(REAR.poleZ), POLE_Y, 0.038, 'POL_KOL_DESTEK');
  // Ön pol desteği: sütun (Y=2.40) -> pol ucu
  L(AZ(zAt(ROWS[0], 2.40)), 2.40, AZ(FRONT.poleZ), POLE_Y, 'POL_KOL_DESTEK');
  // Arka pol ofset kolu (Y=1.44) ve çapraz desteği (sütun Y=2.20 -> pol)
  L(AZ(zAt(ROWS[1], POLE_Y) - STRUT_R), POLE_Y, AZ(REAR.poleZ), POLE_Y, 'POL_KOL_DESTEK');
  L(AZ(zAt(ROWS[1], 2.20) - STRUT_R), 2.20, AZ(REAR.poleZ), POLE_Y + 0.04, 'POL_KOL_DESTEK');
  // RRU yan görünüşü (genişlik Z yönünde)
  [FRONT, REAR].forEach(grp => {
    const widest = grp.rrus.reduce((a, r) => (r.w > a.w ? r : a), grp.rrus[0]);
    grp.rrus.forEach(r => {
      const [za, zb] = rruZ(grp, r);
      R(AZ(za), RRU_BOT, AZ(zb), RRU_BOT + RRU_H, r.layer);
    });
    const [za, zb] = rruZ(grp, widest);
    D(AZ(za), RRU_BOT + RRU_H, AZ(zb), RRU_BOT + RRU_H, 0.25, mm(widest.w));
  });
  T(AZ(-1.95), 1.85, 0.08, '4 RRU (yan yana, X yonunde)');
  T(AZ(0.0), 1.85, 0.08, '3 RRU (yan yana)');
  D(AZ(FRONT.poleZ), 0, AZ(REAR.poleZ), 0, -0.35, mm(REAR.poleZ - FRONT.poleZ));
  D(AZ(ROWS[0].baseZ), -0.14, AZ(ROWS[1].baseZ), -0.12, -0.7, mm(ROWS[1].baseZ - ROWS[0].baseZ));
  D(AZ(2.3), 0, AZ(2.3), POLE_Y, 0.3, mm(POLE_Y));
  T(AZ(-3.4), -1.6, 0.09, 'Sutun duzlemi +Z yonune 8 derece egik. Polun kedi yolu tarafindaki RRU kelepcesi polden 80 mm.');

  // =========================================================================
  // PLAN C-C (XZ) — Y = 1.44 RRU montaj kotunda yatay kesit. Ötelenmiş: düşey = -Z + OFF_C_Y
  // Yatay eksen model X, düşey eksen -Z (üst = skorbord tarafı)
  // =========================================================================
  const OFF_C_Y = -6.0;
  const CY = (z) => -z + OFF_C_Y;
  T(-11.0, CY(-3.2), 0.25, 'PLAN C-C : RRU MONTAJ KOTUNDA YATAY KESIT (Y = +1.44)');
  T(-11.0, CY(-3.55) , 0.13, `Dusey eksen model -Z (ofset ${mm(OFF_C_Y)}): Z=0 bu cizimde Y=${mm(OFF_C_Y)}. Ust taraf skorbord.`);
  // Kedi yolu sınırı referansı (Z = -1.30 ... -0.10, X = -3.70 ... 3.70)
  L(-3.70, CY(-1.30), 3.70, CY(-1.30), 'REFERANS_KOT');
  L(-3.70, CY(-0.10), 3.70, CY(-0.10), 'REFERANS_KOT');
  T(3.80, CY(-1.30) - 0.03, 0.09, 'ON KORKULUK Z=-1300');
  T(3.80, CY(-0.10) - 0.03, 0.09, 'ARKA KORKULUK Z=-100');
  L(-3.70, CY(-1.70), 3.70, CY(-1.70), 'REFERANS_KOT');
  T(3.80, CY(-1.70) - 0.03, 0.09, 'SKORBORD ARKA ISKELETI Z=-1700');

  [-1, 1].forEach(s => {
    // Sütunların Y=1.44 düzlemini kestiği noktalar
    ROWS.forEach(row => {
      strutMembers(row, s).filter(m => m.y1 <= POLE_Y && m.y2 >= POLE_Y).forEach(m => {
        C(xAtY(m.x1, m.y1, m.x2, m.y2, POLE_Y), CY(zAt(row, POLE_Y)), STRUT_R, 'SKORBORD_CAPRAZ_SUTUN');
      });
    });
    // Poller
    pipe(s * 2.746, CY(FRONT.poleZ), s * 1.88, CY(FRONT.poleZ), 0.038, 'POL_KOL_DESTEK');
    pipe(s * 2.48, CY(REAR.poleZ), s * 3.32, CY(REAR.poleZ), 0.038, 'POL_KOL_DESTEK');
    // Arka pol ofset kolu (X = s*3.00)
    L(s * 3.00, CY(zAt(ROWS[1], POLE_Y) - STRUT_R), s * 3.00, CY(REAR.poleZ), 'POL_KOL_DESTEK');
    // RRU'lar (kalınlık X, genişlik Z)
    [FRONT, REAR].forEach(grp => grp.rrus.forEach(r => {
      const [za, zb] = rruZ(grp, r);
      R(s * r.x - r.t / 2, CY(za), s * r.x + r.t / 2, CY(zb), r.layer);
    }));
  });
  // RRU adlandırma (sol taraf)
  [FRONT, REAR].forEach(grp => grp.rrus.forEach((r, i) => {
    const [za, zb] = rruZ(grp, r);
    const yTxt = grp === FRONT ? CY(zb) + 0.12 + i * 0.13 : CY(zb) - 0.18 - i * 0.13;
    T(-r.x - 0.05, yTxt, 0.075, r.label, 0, 'right');
  }));
  D(-2.62, CY(-1.75), -2.42, CY(-1.75), 0.3, mm(0.20));
  D(-3.00, CY(1.05), 0, CY(1.05), -0.3, mm(3.00));

  return dxf.toDxfString();
}

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
if (!fs.existsSync(DIR_M)) fs.mkdirSync(DIR_M, { recursive: true });
const outMm = path.join(DIR_MM, `${FILE_BASE}_mm.dxf`);
const outM = path.join(DIR_M, `${FILE_BASE}_m.dxf`);
fs.writeFileSync(outMm, generate('mm'), 'utf8');
fs.writeFileSync(outM, generate('m'), 'utf8');
console.log('Yazıldı:', outMm);
console.log('Yazıldı:', outM);
