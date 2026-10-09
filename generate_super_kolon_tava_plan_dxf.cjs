/**
 * generate_super_kolon_tava_plan_dxf.cjs
 *
 * PAFTA 12: ALAN 1-3 (kod alan2) SÜPER KOLON KABLO TAVALARI — PLAN (ÜSTTEN GÖRÜNÜŞ)
 *
 * Kullanıcı İsteği:
 * "bana sadece super kolon üstüne ekledigimiz tavanın kesiti lazım üstten olsa yeterli"
 *
 * İçerik (sol ve sağ süper kolon):
 * - Kolon ön yüzü yatay tavası (2600 mm, kot +3.00 / +3.20, duvara dik montaj: 200 mm yükseklik, 50 mm kalınlık)
 * - Kolon yan yüzü yatay tavası (2682 mm, kot +3.00 / +3.20, aynı montaj)
 * - Yan yüzden köprüye inen düşey tava (kot +0.225 / +3.10, plan izdüşümü 50 x 200 mm)
 * - Köprü betonu üzerindeki tava (200 mm genişlik, kot ±0.00 / +0.05), kafes tavasından düşey inişe
 * - Referans: süper kolon (5.0 x 7.5 m) ve köprü betonu (2.0 m) dış hatları (REFERANS katmanı)
 *
 * Koordinatlar: ALAN 1-3 model koordinatı (alan2Structure orijini; X kedi yolu boyunca, Y kot).
 * Plan çiziminde yatay = model X, düşey = model -Z (üstten bakış). Orijin 0,0 = model X=0, Z=0.
 *
 * Geometri kaynağı: main.js buildSuperColumns() (createSuperColTrays, createBridgeTray) — aynı sayılar.
 *
 * Çıktı:
 *   DXF_Ciktilari/Milimetre/12_ALAN_1_3_SUPER_KOLON_TAVA_PLANI_mm.dxf
 *   DXF_Ciktilari/Metre/12_ALAN_1_3_SUPER_KOLON_TAVA_PLANI_m.dxf
 */

const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

const FILE_BASE = '12_ALAN_1_3_SUPER_KOLON_TAVA_PLANI';
const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');
const DIR_M = path.join(__dirname, 'DXF_Ciktilari', 'Metre');

// ---------------------------------------------------------------------------
// MODEL GEOMETRİSİ (main.js buildSuperColumns ile aynı)
// ---------------------------------------------------------------------------
const COL_W = 5.0, COL_D = 7.5;
const COL_CENTER_Y = 3.5 - 20.0 / 2;                 // -6.5 (kolon yerel Y -> model Y için)
const DIST_X = 64.3 - 39.0, DIST_Z = 2.5 - (-1.0);   // 25.3 x 3.5
const ANGLE = Math.atan2(DIST_Z, DIST_X);
const BRIDGE_LEN = Math.hypot(DIST_X, DIST_Z);

const SIDES = [
  { name: 'SAG', isRight: true, colX: 66.8, colZ: 2.5, rotY: -ANGLE, bridgeX: 39.0 + DIST_X / 2 },
  { name: 'SOL', isRight: false, colX: -42.8, colZ: 2.5, rotY: ANGLE, bridgeX: -15.0 - DIST_X / 2 }
];
const BRIDGE_Z = -1.0 + DIST_Z / 2;

// Three.js Y ekseni etrafında dönüş + öteleme: yerel (x, z) -> model (X, Z)
const tf = (cx, cz, rot) => (x, z) => [cx + x * Math.cos(rot) + z * Math.sin(rot), cz - x * Math.sin(rot) + z * Math.cos(rot)];
// Kutu (yerel merkez, genişlik X, derinlik Z) -> model plan köşeleri
const boxCorners = (T, x, z, w, d) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => T(x + sx * w / 2, z + sz * d / 2));

function trayParts(side) {
  const T = tf(side.colX, side.colZ, side.rotY);
  const dirX = side.isRight ? -1 : 1;
  const B = tf(side.bridgeX, BRIDGE_Z, side.rotY);
  return {
    column: boxCorners(T, 0, 0, COL_W, COL_D),
    bridge: boxCorners(B, 0, 0, BRIDGE_LEN, 2.0),
    trays: [
      { key: 'on', label: 'ON YUZ TAVASI 2600', kot: '+3.00 / +3.20', poly: boxCorners(T, dirX * 1.3, 3.775, 2.6, 0.05), len: 2.6 },
      { key: 'yan', label: 'YAN YUZ TAVASI 2682', kot: '+3.00 / +3.20', poly: boxCorners(T, dirX * 2.525, 2.434, 0.05, 2.682), len: 2.682 },
      { key: 'dusey', label: 'DUSEY INIS TAVASI', kot: '+0.225 / +3.10', poly: boxCorners(T, dirX * 2.525, 1.093, 0.05, 0.2) },
      { key: 'kopru', label: `KOPRU TAVASI 200 x ${Math.round(BRIDGE_LEN * 1000)}`, kot: '+-0.00 / +0.05', poly: boxCorners(B, 0, 0.75, BRIDGE_LEN, 0.2), len: BRIDGE_LEN }
    ]
  };
}

// Sahneden okunan değerlerle doğrulama (main.js değişirse uyarır)
(function selfCheck() {
  const expect = { SAG_on: [63.7106, 5.8583], SAG_kopru: [38.9109, -0.3561], SOL_yan: [-40.1738, 3.2401] };
  const r = trayParts(SIDES[0]), l = trayParts(SIDES[1]);
  const got = { SAG_on: r.trays[0].poly[0], SAG_kopru: r.trays[3].poly[0], SOL_yan: l.trays[1].poly[0] };
  for (const k of Object.keys(expect)) {
    const d = Math.hypot(got[k][0] - expect[k][0], got[k][1] - expect[k][1]);
    if (d > 0.002) throw new Error(`Geometri sahneyle uyuşmuyor: ${k} fark ${d.toFixed(4)} m`);
  }
})();

function generate(units) {
  const k = units === 'mm' ? 1000 : 1;
  const dxf = new DxfBuilder(units);
  dxf.addLayer('SUPER_KOLON_TAVASI', 6, 'CONTINUOUS');
  dxf.addLayer('REFERANS', 8, 'DASHED');

  const P = ([x, z]) => [x * k, -z * k];           // plan: yatay X, düşey -Z
  const poly = (pts, layer) => pts.forEach((p, i) => {
    const a = P(p), b = P(pts[(i + 1) % pts.length]);
    dxf.addLine(a[0], a[1], b[0], b[1], layer);
  });
  const T = (x, z, h, text, rot = 0, ha = 'left') => { const [px, py] = P([x, z]); dxf.addText(px, py, h * k, text, 'METIN_BILGI', rot, ha, 'baseline'); };
  const deg = ANGLE * 180 / Math.PI;

  SIDES.forEach(side => {
    const parts = trayParts(side);
    poly(parts.column, 'REFERANS');
    poly(parts.bridge, 'REFERANS');
    parts.trays.forEach(t => poly(t.poly, 'SUPER_KOLON_TAVASI'));

    // Başlık ve etiketler (kolonun kedi yolu tarafında)
    const cx = side.colX, cz = side.colZ;
    T(cx - 3.2, cz + 5.6, 0.45, `${side.name} SUPER KOLON TAVALARI - PLAN`);
    T(cx - 3.2, cz + 6.3, 0.22, `Kolon ${COL_W} x ${COL_D} m, ${side.isRight ? '-' : '+'}${deg.toFixed(2)} derece donuk (kesik cizgi: referans)`);
    const textRot = side.isRight ? deg : -deg;
    const on = parts.trays[0].poly, yan = parts.trays[1].poly, dus = parts.trays[2].poly;
    const mid = (pts) => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
    const [ox, oz] = mid(on); T(ox, oz + 0.45, 0.16, `ON YUZ TAVASI 200x2600, kot +3.00/+3.20`, textRot, 'center');
    // Yan yüz etiketi kolonun içine (köprü çizgileriyle çakışmasın)
    const [yx, yz] = mid(yan); T(yx + (side.isRight ? 0.45 : -0.45), yz, 0.16, `YAN YUZ TAVASI 200x2682, kot +3.00/+3.20`, textRot + 90, 'center');
    const [dx, dz] = mid(dus); T(dx + (side.isRight ? 0.30 : -0.30), dz - 0.25, 0.14, 'DUSEY INIS +0.225/+3.10', 0, side.isRight ? 'left' : 'right');
    const kp = parts.trays[3];
    const [kx, kz] = mid(kp.poly); T(kx, kz - 0.30, 0.20, `KOPRU TAVASI 200 x ${Math.round(kp.len * 1000)} mm, kot +-0.00/+0.05`, textRot, 'center');
  });

  // Genel not
  T(-15, -9.5, 0.30, 'PAFTA 12 : ALAN 1-3 SUPER KOLON KABLO TAVALARI - PLAN (USTTEN GORUNUS)');
  T(-15, -8.9, 0.18, 'Koordinatlar model ile ayni: yatay = X, dusey = -Z, orijin X=0 / Z=0. Kolon yuzu tavalari duvara dik monte (200 mm yukseklik, plan izdusumu 50 mm).');
  T(-15, -8.5, 0.18, 'Katmanlar: SUPER_KOLON_TAVASI (tava), REFERANS (kolon ve kopru betonu dis hatlari).');

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
