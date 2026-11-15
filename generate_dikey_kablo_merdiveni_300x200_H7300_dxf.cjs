/**
 * generate_dikey_kablo_merdiveni_300x200_H7300_dxf.cjs
 *
 * PAFTA 24: DİKEY KABLO MERDİVENİ 300 x 200 mm, YÜKSEKLİK: 7300 mm (ARKADAN GÖRÜNÜŞ)
 *
 * Kullanıcı isteği:
 *   "bir de 30cm olanını yapsana"
 *
 * Ölçüler (1 birim = 1 mm):
 *   Yükseklik (H / L) = 7300 mm (730 cm)
 *   Genişlik (W)      = 300 mm (30 cm) dıştan dışa
 *   Derinlik (D)      = 200 mm (20 cm) yanak profil derinliği
 *
 * Görünüşler:
 *   A) DİKEY ARKA GÖRÜNÜŞ (Ana Görünüş - Arkadan Bakış, W=300 mm, H=7300 mm)
 *      - Basamaklar ön planda (arka yüzde), 2'li kablo kelepçe yuvaları açık
 *      - Yan rayların arka flanşları (35 mm) ve iç dönüş emniyet dudakları (10 mm)
 *      - 29 adet C-profil travers basamak (250 mm adım, uçlarda 135 mm simetrik pay)
 *      - Duvar / çelik kolon sabitleme L-konsolları (1.5 m aralıklı)
 *   B) DİKEY YAN GÖRÜNÜŞ (D=200 mm, H=7300 mm)
 *      - Sol taraf: ARKA YÜZ (Kullanıcı bakış yönü / basamakların dizildiği yüz)
 *      - Sağ taraf: ÖN YÜZ (Açık kablo yatağı yüzeyi)
 *   C) ENİNE KESİT A-A / PLAN KESİTİ (300 x 200 mm, Ölçek 1:5)
 *      - C-profil yan raylar (200x35x10x2 mm), 40x30 mm basamak traversi
 *      - Net kablo dolum haznesi (200 x 135 mm), büyük bakış yönü oku
 *   D) BÜYÜTÜLMÜŞ DETAY 1: Basamak & Yan Ray Birleşimi (3:1)
 *   E) BÜYÜTÜLMÜŞ DETAY 2: Yan Ray C-Profil Büküm ve Perfore Detayı (2.5:1)
 *   F) YATAY ARKA GÖRÜNÜŞ (Pafta / Yatay Çizim Yerleşimi için L=7300 x W=300 mm)
 *
 * Çalıştırma: node generate_dikey_kablo_merdiveni_300x200_H7300_dxf.cjs
 * Çıktı:      DXF_Ciktilari/Milimetre/24_DIKEY_KABLO_MERDIVENI_300x200_H7300_ARKA_GORUNUS_mm.dxf
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DxfBuilder } = require('./dxf_engine.cjs');

const P = {
  // Ana ölçüler
  H: 7300,        // Yükseklik (düşey boy)
  W: 300,         // Genişlik (30 cm = 300 mm dıştan dışa)
  D: 200,         // Derinlik (yan yanak derinliği 200 mm)

  // Yan ray (C profil) ölçüleri
  railFlange: 35, // Üst/alt flanş genişliği
  railLip: 10,    // Flanş iç dönüş emniyet dudağı
  t: 2.0,         // Sac kalınlığı (2 mm ağır hizmet tipi)
  
  // Basamak (travers) ölçüleri
  rungH: 30,      // Basamak profili et yüksekliği (düşey)
  rungD: 40,      // Basamak profili derinliği
  rungPitch: 250, // Basamak adımı (dikey kablo merdiveni standardı: 250 mm)
  rungStart: 150, // İlk basamak eksen kotu (alttan)
  
  // Basamak üzerindeki oval perfore yuvaları (W=300 mm için 2 adet simetrik slot)
  rungSlotL: 30,  // Yuva boyu
  rungSlotW: 9,   // Yuva eni
  rungSlotOffsets: [-45, 45], // Basamak merkezinden X mesafeleri (X=105 ve X=195)

  // Yan ray perfore ölçüleri (yan görünüş ve bağlantı)
  sideSlotL: 25,  // Yan oval delik boyu
  sideSlotW: 9,   // Yan oval delik eni
  sideSlotPitch: 100, // Yan delik adımı
  sideSlotRows: [60, 140], // Yan yüzde tabandan (arkadan) delik eksenleri

  // Duvar / Şaft tespit konsolları (L-braket)
  bracketSpacing: 1500, // Tespit konsolu aralığı
  bracketOffsets: [300, 1800, 3300, 4800, 6300, 7200], // Konsol kotları
};

const FILE_BASE = '24_DIKEY_KABLO_MERDIVENI_300x200_H7300_ARKA_GORUNUS';
const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');
const ACCORE = 'C:\\Program Files\\Autodesk\\AutoCAD 2023\\accoreconsole.exe';

function generate() {
  const dxf = new DxfBuilder('mm');
  const d = dxf.d;

  // Katman tanımları
  dxf.addLayer('MERDIVEN_ANA', 7, 'CONTINUOUS');  // Beyaz: Ana dış hatlar, ray gövdesi
  dxf.addLayer('BASAMAK', 4, 'CONTINUOUS');       // Cyan: Traversler / basamaklar
  dxf.addLayer('PERFORE', 3, 'CONTINUOUS');       // Yeşil: Perfore oval delikler
  dxf.addLayer('GIZLI', 8, 'DASHED');             // Koyu Gri: Derinlikteki ön flanşlar ve gizli hatlar
  dxf.addLayer('EKSEN', 1, 'DASHED');             // Kırmızı: Merkez ve simetri eksenleri
  dxf.addLayer('KONSOL', 30, 'CONTINUOUS');       // Turuncu: Duvar / şaft montaj konsolları
  dxf.addLayer('OLCU', 2, 'CONTINUOUS');          // Sarı: Ölçülendirme çizgileri ve metinleri
  dxf.addLayer('METIN', 7, 'CONTINUOUS');         // Beyaz: Açıklamalar, başlıklar, BOM

  // Çizim yardımcı fonksiyonları
  const L = (x1, y1, x2, y2, layer) => dxf.addLine(x1, y1, x2, y2, layer);
  const R = (x, y, w, h, layer) => dxf.addRect(x, y, w, h, layer);
  const C = (x, y, r, layer) => dxf.addCircle(x, y, r, layer);
  const T = (x, y, h, s, align = 'left', rot = 0, layer = 'METIN') => dxf.addText(x, y, h, s, layer, rot, align, 'baseline');
  const PL = (pts, layer) => { dxf.setLayer(layer); d.drawPolyline(pts, true); };

  // Yatay oval slot
  const slotH = (cx, cy, len, w, layer = 'PERFORE') => {
    dxf.setLayer(layer);
    const r = w / 2, a = (len - w) / 2;
    d.drawLine(cx - a, cy - r, cx + a, cy - r);
    d.drawLine(cx - a, cy + r, cx + a, cy + r);
    d.drawArc(cx + a, cy, r, -90, 90);
    d.drawArc(cx - a, cy, r, 90, 270);
  };

  // Düşey oval slot
  const slotV = (cx, cy, len, w, layer = 'PERFORE') => {
    dxf.setLayer(layer);
    const r = w / 2, a = (len - w) / 2;
    d.drawLine(cx - r, cy - a, cx - r, cy + a);
    d.drawLine(cx + r, cy - a, cx + r, cy + a);
    d.drawArc(cx, cy + a, r, 0, 180);
    d.drawArc(cx, cy - a, r, 180, 360);
  };

  // Ölçülendirme yardımcıları
  const dimH = (x1, x2, yRef, yDim, label, textH = 26, tick = 9) => {
    dxf.setLayer('OLCU');
    const sg = yDim >= yRef ? 1 : -1;
    d.drawLine(x1, yRef + sg * 5, x1, yDim + sg * 5);
    d.drawLine(x2, yRef + sg * 5, x2, yDim + sg * 5);
    d.drawLine(x1, yDim, x2, yDim);
    d.drawLine(x1 - tick, yDim - tick, x1 + tick, yDim + tick);
    d.drawLine(x2 - tick, yDim - tick, x2 + tick, yDim + tick);
    d.drawText((x1 + x2) / 2, yDim + (sg > 0 ? 8 : -textH - 8), textH, 0, label, 'center', 'baseline');
  };

  const dimV = (y1, y2, xRef, xDim, label, textH = 26, tick = 9) => {
    dxf.setLayer('OLCU');
    const sg = xDim >= xRef ? 1 : -1;
    d.drawLine(xRef + sg * 5, y1, xDim + sg * 5, y1);
    d.drawLine(xRef + sg * 5, y2, xDim + sg * 5, y2);
    d.drawLine(xDim, y1, xDim, y2);
    d.drawLine(xDim - tick, y1 - tick, xDim + tick, y1 + tick);
    d.drawLine(xDim - tick, y2 - tick, xDim + tick, y2 + tick);
    d.drawText(xDim + (sg > 0 ? 10 : -10), (y1 + y2) / 2, textH, 90, label, 'center', 'baseline');
  };

  // =========================================================================
  // GÖRÜNÜŞ A: DİKEY ARKA GÖRÜNÜŞ (REAR ELEVATION - ANA GÖRÜNÜŞ)
  // X: 0 .. 300 mm, Y: 0 .. 7300 mm
  // =========================================================================
  {
    const ox = 0, oy = 0;
    const { H, W, railFlange, railLip, rungH, rungPitch, rungStart } = P;

    // 1. Yan Taşıyıcı Rayların Arka Flanşları (Kullanıcının baktığı yüzdeki flanşlar)
    R(ox, oy, railFlange, H, 'MERDIVEN_ANA');
    L(ox + railFlange, oy, ox + railFlange, oy + H, 'MERDIVEN_ANA');
    L(ox + railFlange - railLip, oy, ox + railFlange - railLip, oy + H, 'MERDIVEN_ANA');

    R(ox + W - railFlange, oy, railFlange, H, 'MERDIVEN_ANA');
    L(ox + W - railFlange, oy, ox + W - railFlange, oy + H, 'MERDIVEN_ANA');
    L(ox + W - railFlange + railLip, oy, ox + W - railFlange + railLip, oy + H, 'MERDIVEN_ANA');

    // 2. Derinlikteki (Ön Yüzdeki) Flanşların İzdüşümü (GIZLI)
    L(ox + railFlange, oy, ox + railFlange, oy + H, 'GIZLI');
    L(ox + W - railFlange, oy, ox + W - railFlange, oy + H, 'GIZLI');

    // Düşey Simetri Ekseni
    L(ox + W / 2, oy - 120, ox + W / 2, oy + H + 120, 'EKSEN');

    // 3. Basamaklar (Traversler) - Arka yüzde, doğrudan kullanıcının önünde
    const numRungs = Math.floor((H - rungStart) / rungPitch) + 1;
    const rungYs = [];
    for (let i = 0; i < numRungs; i++) {
      const cy = rungStart + i * rungPitch;
      if (cy <= H - 50) rungYs.push(cy);
    }

    rungYs.forEach((cy, idx) => {
      const yBottom = cy - rungH / 2;
      R(ox + railFlange, yBottom, W - 2 * railFlange, rungH, 'BASAMAK');
      L(ox + railFlange, yBottom + 3, ox + W - railFlange, yBottom + 3, 'BASAMAK');
      L(ox + railFlange, yBottom + rungH - 3, ox + W - railFlange, yBottom + rungH - 3, 'BASAMAK');

      R(ox + railFlange - 6, yBottom - 2, 6, rungH + 4, 'MERDIVEN_ANA');
      R(ox + W - railFlange, yBottom - 2, 6, rungH + 4, 'MERDIVEN_ANA');

      // W=300 mm için 2 adet perfore slot
      P.rungSlotOffsets.forEach((dx) => {
        slotH(ox + W / 2 + dx, cy, P.rungSlotL, P.rungSlotW, 'PERFORE');
      });

      if (idx === 0 || idx === Math.floor(rungYs.length / 2) || idx === rungYs.length - 1) {
        L(ox + railFlange - 20, cy, ox + W - railFlange + 20, cy, 'EKSEN');
      }
    });

    // 4. Uç Bağlantı ve Ek Delikleri
    [30, 80].forEach((dy) => {
      C(ox + 18, oy + dy, 5.5, 'PERFORE');
      C(ox + W - 18, oy + dy, 5.5, 'PERFORE');
      C(ox + 18, oy + H - dy, 5.5, 'PERFORE');
      C(ox + W - 18, oy + H - dy, 5.5, 'PERFORE');
    });

    // 5. Duvar / Çelik Kolon Tespit Konsolları
    P.bracketOffsets.forEach((by) => {
      PL([[ox, by - 40], [ox - 50, by - 40], [ox - 50, by + 40], [ox, by + 40]], 'KONSOL');
      slotV(ox - 25, by, 30, 11, 'KONSOL');
      PL([[ox + W, by - 40], [ox + W + 50, by - 40], [ox + W + 50, by + 40], [ox + W, by + 40]], 'KONSOL');
      slotV(ox + W + 25, by, 30, 11, 'KONSOL');
    });

    // Ölçülendirme (Görünüş A)
    dimH(ox, ox + W, oy, oy - 140, `TOPLAM GENISLIK: ${W} mm`, 30, 10);
    dimH(ox + railFlange, ox + W - railFlange, oy, oy - 70, `NET IC: ${W - 2 * railFlange}`, 22, 7);
    dimH(ox, ox + railFlange, oy, oy - 70, `${railFlange}`, 18, 5);
    dimH(ox + W - railFlange, ox + W, oy, oy - 70, `${railFlange}`, 18, 5);

    dimV(oy, oy + H, ox - 50, ox - 260, `TOPLAM YUKSEKLIK: ${H} mm (730 cm)`, 34, 12);
    dimV(oy, oy + rungStart, ox - 50, ox - 160, `${rungStart}`, 20, 6);
    dimV(oy + rungStart, oy + rungStart + rungPitch, ox - 50, ox - 160, `ADIM: ${rungPitch}`, 20, 6);
    dimV(oy + rungStart + rungPitch, oy + rungYs[rungYs.length - 1], ox - 50, ox - 160, `${(rungYs.length - 2)} x ${rungPitch} = ${(rungYs.length - 2) * rungPitch}`, 22, 7);
    dimV(oy + rungYs[rungYs.length - 1], oy + H, ox - 50, ox - 160, `${H - rungYs[rungYs.length - 1]}`, 20, 6);

    // Başlık ve Notlar (Görünüş A)
    T(ox + W / 2, oy + H + 230, 38, 'GORUNUS A: DIKEY ARKA GORUNUS (ANA GORUNUS)', 'center', 0, 'METIN');
    T(ox + W / 2, oy + H + 175, 24, `300 x 200 mm Agir Hizmet Dikey Kablo Merdiveni, H = ${H} mm (${numRungs} Basamak)`, 'center', 0, 'METIN');
    T(ox + W / 2, oy + H + 125, 20, 'BAKIS YONU: ARKADAN (Kablo traversleri ve montaj duzenegi on planda)', 'center', 0, 'METIN');
  }

  // =========================================================================
  // GÖRÜNÜŞ B: DİKEY YAN GÖRÜNÜŞ (SIDE ELEVATION)
  // X: 1100 .. 1300 mm, Y: 0 .. 7300 mm
  // =========================================================================
  {
    const ox = 1100, oy = 0;
    const { H, D, t, rungH, rungD, rungPitch, rungStart } = P;

    R(ox, oy, D, H, 'MERDIVEN_ANA');
    L(ox, oy + t, ox + D, oy + t, 'GIZLI');
    L(ox, oy + H - t, ox + D, oy + H - t, 'GIZLI');

    const numSideSlots = Math.floor((H - 200) / P.sideSlotPitch);
    for (let i = 0; i <= numSideSlots; i++) {
      const sy = 100 + i * P.sideSlotPitch;
      P.sideSlotRows.forEach((dx) => {
        slotV(ox + dx, sy, P.sideSlotL, P.sideSlotW, 'PERFORE');
      });
    }

    const numRungs = Math.floor((H - rungStart) / rungPitch) + 1;
    for (let i = 0; i < numRungs; i++) {
      const cy = rungStart + i * rungPitch;
      if (cy <= H - 50) {
        R(ox, cy - rungH / 2, rungD, rungH, 'BASAMAK');
        L(ox + rungD - 6, cy - rungH / 2, ox + rungD - 6, cy + rungH / 2, 'BASAMAK');
      }
    }

    P.bracketOffsets.forEach((by) => {
      PL([[ox, by - 35], [ox - 70, by - 35], [ox - 70, by + 35], [ox, by + 35]], 'KONSOL');
      L(ox - 70, by - 60, ox - 70, by + 60, 'KONSOL');
      C(ox - 70, by - 45, 5, 'KONSOL');
      C(ox - 70, by + 45, 5, 'KONSOL');
    });

    dimH(ox, ox + D, oy, oy - 140, `DERINLIK: ${D} mm`, 28, 9);
    dimH(ox, ox + rungD, oy, oy - 70, `TRAVERS: ${rungD}`, 18, 5);
    dimH(ox + rungD, ox + D, oy, oy - 70, `KABLO NET: ${D - rungD}`, 18, 5);
    dimV(oy, oy + H, ox + D + 40, ox + D + 180, `YUKSEKLIK: ${H} mm`, 34, 12);

    const arrowY = oy + H / 2;
    L(ox - 240, arrowY, ox - 30, arrowY, 'OLCU');
    PL([[ox - 30, arrowY], [ox - 70, arrowY + 15], [ox - 70, arrowY - 15]], 'OLCU');
    T(ox - 240, arrowY + 25, 24, 'KULLANICI BAKIŞ YÖNÜ', 'left', 0, 'METIN');
    T(ox - 240, arrowY - 35, 20, '(ARKADAN BAKIS)', 'left', 0, 'METIN');

    // Başlık ve Notlar (Görünüş B)
    T(ox + D / 2, oy + H + 230, 38, 'GORUNUS B: DIKEY YAN GORUNUS', 'center', 0, 'METIN');
    T(ox + D / 2, oy + H + 175, 24, `Yan Yanak: 200 mm C-Profil, t = ${t} mm`, 'center', 0, 'METIN');
    T(ox + D / 2, oy + H + 125, 20, 'Sol: ARKA (Traversler)  |  Sag: ON (Kablo Girisi)', 'center', 0, 'METIN');
  }

  // =========================================================================
  // GÖRÜNÜŞ C: ENİNE KESİT A-A / PLAN KESİTİ (ÖLÇEK 1:5)
  // X: 0 .. 300 mm, Y: -1050 .. -850 mm
  // =========================================================================
  {
    const ox = 0, oy = -1050;
    const { W, D, railFlange, railLip, t, rungD } = P;

    PL([
      [ox, oy], [ox + railFlange, oy], [ox + railFlange, oy + railLip],
      [ox + railFlange - t, oy + railLip], [ox + railFlange - t, oy + t],
      [ox + t, oy + t], [ox + t, oy + D - t],
      [ox + railFlange - t, oy + D - t], [ox + railFlange - t, oy + D - railLip],
      [ox + railFlange, oy + D - railLip], [ox + railFlange, oy + D],
      [ox, oy + D]
    ], 'MERDIVEN_ANA');

    PL([
      [ox + W, oy], [ox + W - railFlange, oy], [ox + W - railFlange, oy + railLip],
      [ox + W - railFlange + t, oy + railLip], [ox + W - railFlange + t, oy + t],
      [ox + W - t, oy + t], [ox + W - t, oy + D - t],
      [ox + W - railFlange + t, oy + D - t], [ox + W - railFlange + t, oy + D - railLip],
      [ox + W - railFlange, oy + D - railLip], [ox + W - railFlange, oy + D],
      [ox + W, oy + D]
    ], 'MERDIVEN_ANA');

    PL([
      [ox + railFlange, oy + t], [ox + W - railFlange, oy + t],
      [ox + W - railFlange, oy + rungD], [ox + W - railFlange - t, oy + rungD],
      [ox + W - railFlange - t, oy + t + t], [ox + railFlange + t, oy + t + t],
      [ox + railFlange + t, oy + rungD], [ox + railFlange, oy + rungD]
    ], 'BASAMAK');

    P.rungSlotOffsets.forEach((dx) => {
      slotH(ox + W / 2 + dx, oy + rungD / 2, P.rungSlotL, P.rungSlotW, 'PERFORE');
    });

    L(ox + W / 2, oy - 100, ox + W / 2, oy + D + 100, 'EKSEN');

    R(ox + railFlange + 10, oy + rungD + 10, W - 2 * railFlange - 20, D - rungD - 25, 'GIZLI');
    T(ox + W / 2, oy + rungD + (D - rungD) / 2 - 8, 17, 'NET HAZNE (210 x 135 mm)', 'center', 0, 'METIN');

    dimH(ox, ox + W, oy, oy - 80, `W = ${W} mm`, 26, 8);
    dimH(ox, ox + railFlange, oy + D, oy + D + 50, `${railFlange}`, 18, 5);
    dimH(ox + railFlange, ox + W - railFlange, oy + D, oy + D + 50, `NET IC: ${W - 2 * railFlange}`, 20, 6);
    dimV(oy, oy + D, ox + W + 40, ox + W + 90, `D = ${D} mm`, 26, 8);
    dimV(oy, oy + rungD, ox - 40, ox - 80, `RUNG: ${rungD}`, 18, 5);
    dimV(oy + rungD, oy + D, ox - 40, ox - 80, `KABLO: ${D - rungD}`, 18, 5);

    L(ox + W / 2, oy - 200, ox + W / 2, oy - 30, 'OLCU');
    PL([[ox + W / 2, oy - 30], [ox + W / 2 - 20, oy - 80], [ox + W / 2 + 20, oy - 80]], 'OLCU');
    T(ox + W / 2, oy - 230, 28, 'ARKADAN BAKIS YONU (KULLANICI BAKIŞI)', 'center', 0, 'METIN');

    T(ox + W / 2, oy + D + 120, 24, 'ON YUZ (KABLO GIRIS YONU - ACIK TARAF)', 'center', 0, 'METIN');

    T(ox + W / 2, oy + D + 220, 36, 'GORUNUS C: ENINE KESIT A-A (UST / PLAN GORUNUSU)', 'center', 0, 'METIN');
    T(ox + W / 2, oy + D + 175, 22, `Olcek 1:5 (C-Profil Yan Raylar: 200x35x10x2 mm, Travers: 40x30 mm, Sac: t = ${t} mm)`, 'center', 0, 'METIN');
  }

  // =========================================================================
  // GÖRÜNÜŞ D: BÜYÜTÜLMÜŞ DETAY 1 — BASAMAK / RAY BİRLEŞİMİ (ÖLÇEK 3:1)
  // X: 1600 .. 2400 mm, Y: 5600 .. 6800 mm
  // =========================================================================
  {
    const ox = 1600, oy = 5700;
    const sc = 3.0;

    const rw = P.railFlange * sc;
    const rh = 130 * sc;
    const rH = P.rungH * sc;

    R(ox, oy, rw, rh, 'MERDIVEN_ANA');
    L(ox + rw, oy, ox + rw, oy + rh, 'MERDIVEN_ANA');
    L(ox + rw - P.railLip * sc, oy, ox + rw - P.railLip * sc, oy + rh, 'MERDIVEN_ANA');

    const bY = oy + rh / 2 - rH / 2;
    R(ox + rw, bY, 150 * sc, rH, 'BASAMAK');
    L(ox + rw, bY + 3 * sc, ox + rw + 150 * sc, bY + 3 * sc, 'BASAMAK');
    L(ox + rw, bY + rH - 3 * sc, ox + rw + 150 * sc, bY + rH - 3 * sc, 'BASAMAK');

    R(ox + rw - 4 * sc, bY - 3 * sc, 8 * sc, rH + 6 * sc, 'MERDIVEN_ANA');

    slotH(ox + rw + 35 * sc, bY + rH / 2, P.rungSlotL * sc, P.rungSlotW * sc, 'PERFORE');
    slotH(ox + rw + 105 * sc, bY + rH / 2, P.rungSlotL * sc, P.rungSlotW * sc, 'PERFORE');

    dimH(ox, ox + rw, oy + rh, oy + rh + 40, `${P.railFlange} mm flans`, 22, 6);
    dimH(ox + rw + 35 * sc - (P.rungSlotL * sc) / 2, ox + rw + 35 * sc + (P.rungSlotL * sc) / 2, bY, bY - 40, `${P.rungSlotL}x${P.rungSlotW} slot`, 20, 5);
    dimV(bY, bY + rH, ox + rw + 160 * sc, ox + rw + 200 * sc, `H=${P.rungH}`, 22, 6);

    T(ox, oy + rh + 120, 34, 'DETAY 1: BASAMAK - RAY BAGLANTISI (OLCEK 3:1)', 'left', 0, 'METIN');
    T(ox, oy + rh + 70, 20, 'Gazalti / Lazer kaynakli rijit birlesim veya mekanik kenetleme', 'left', 0, 'METIN');
  }

  // =========================================================================
  // GÖRÜNÜŞ E: BÜYÜTÜLMÜŞ DETAY 2 — C-PROFİL FORMU VE BÜKÜMÜ (ÖLÇEK 2.5:1)
  // X: 1600 .. 2400 mm, Y: 4100 .. 5300 mm
  // =========================================================================
  {
    const ox = 1600, oy = 4200;
    const sc = 2.5;

    const D = P.D * sc;
    const F = P.railFlange * sc;
    const Llip = P.railLip * sc;
    const tt = P.t * sc;

    PL([
      [ox, oy], [ox + F, oy], [ox + F, oy + Llip],
      [ox + F - tt, oy + Llip], [ox + F - tt, oy + tt],
      [ox + tt, oy + tt], [ox + tt, oy + D - tt],
      [ox + F - tt, oy + D - tt], [ox + F - tt, oy + D - Llip],
      [ox + F, oy + D - Llip], [ox + F, oy + D],
      [ox, oy + D]
    ], 'MERDIVEN_ANA');

    slotV(ox + P.sideSlotRows[0] * sc, oy + D / 2, P.sideSlotL * sc, P.sideSlotW * sc, 'PERFORE');
    slotV(ox + P.sideSlotRows[1] * sc, oy + D / 2, P.sideSlotL * sc, P.sideSlotW * sc, 'PERFORE');

    dimV(oy, oy + D, ox - 30, ox - 70, `${P.D} mm Yan Yukseklik`, 26, 8);
    dimH(ox, ox + F, oy + D, oy + D + 40, `${P.railFlange}`, 22, 6);
    dimH(ox + F - Llip, ox + F, oy + D, oy + D + 80, `${P.railLip} dudak`, 20, 5);
    dimV(oy, oy + tt, ox + F + 30, ox + F + 70, `t=${P.t}`, 20, 5);

    T(ox, oy + D + 140, 34, 'DETAY 2: C-PROFIL YAN RAY KESITI (OLCEK 2.5:1)', 'left', 0, 'METIN');
    T(ox, oy + D + 90, 20, `200x35x10x2 mm Rulo Bukum Galvaniz Sac (Daldirma HDG EN ISO 1461)`, 'left', 0, 'METIN');
  }

  // =========================================================================
  // GÖRÜNÜŞ F: YATAY ARKA GÖRÜNÜŞ (PAFTA YATAY YERLEŞİM KOPYASI)
  // X: 0 .. 7300 mm, Y: -2300 .. -1900 mm
  // =========================================================================
  {
    const ox = 0, oy = -2200;
    const { H, W, railFlange, railLip, rungH, rungPitch, rungStart } = P;

    R(ox, oy, H, W, 'MERDIVEN_ANA');
    R(ox, oy, H, railFlange, 'MERDIVEN_ANA');
    R(ox, oy + W - railFlange, H, railFlange, 'MERDIVEN_ANA');
    L(ox, oy + railLip, ox + H, oy + railLip, 'MERDIVEN_ANA');
    L(ox, oy + W - railLip, ox + H, oy + W - railLip, 'MERDIVEN_ANA');

    const numRungs = Math.floor((H - rungStart) / rungPitch) + 1;
    for (let i = 0; i < numRungs; i++) {
      const cx = ox + rungStart + i * rungPitch;
      if (cx <= ox + H - 50) {
        R(cx - rungH / 2, oy + railFlange, rungH, W - 2 * railFlange, 'BASAMAK');
        P.rungSlotOffsets.forEach((dy) => {
          slotV(cx, oy + W / 2 + dy, P.rungSlotL, P.rungSlotW, 'PERFORE');
        });
      }
    }

    dimH(ox, ox + H, oy, oy - 90, `L = ${H} mm (730 cm)`, 32, 10);
    dimV(oy, oy + W, ox - 40, ox - 90, `W = ${W}`, 26, 8);

    T(ox, oy + W + 100, 36, 'GORUNUS F: YATAY SERILMIS ARKA GORUNUS (PAFTA YATAY YERLESIM KOPYASI)', 'left', 0, 'METIN');
    T(ox, oy + W + 50, 22, `Yatay projeksiyon ihtiyaci olan montaj paftalari icin 1:1 kopyadir. Boy = ${H} mm, En = ${W} mm.`, 'left', 0, 'METIN');
  }

  // =========================================================================
  // BAŞLIK BLOKLARI, TEKNİK ÖZELLİKLER VE MALZEME LİSTESİ (BOM)
  // X: 1600 .. 2550 mm, Y: 1000 .. 3600 mm
  // =========================================================================
  {
    const bx = 1600, by = 1000;
    const bw = 950;

    // Pafta Başlığı Çerçevesi
    R(bx, by, bw, 420, 'METIN');
    R(bx + 10, by + 10, bw - 20, 400, 'METIN');
    T(bx + 30, by + 360, 32, 'GALATASARAY STADYUMU KABLO MERDIVENI PROJESI', 'left', 0, 'METIN');
    T(bx + 30, by + 310, 40, 'PAFTA 24: DIKEY KABLO MERDIVENI 300 x 200', 'left', 0, 'METIN');
    T(bx + 30, by + 260, 24, `YUKSEKLIK: 7300 mm (730 cm)  |  GENISLIK: 300 mm  |  DERINLIK: 200 mm`, 'left', 0, 'METIN');
    T(bx + 30, by + 210, 22, 'GORUNUS: ARKADAN BAKIS (REAR VIEW ELEVATION)', 'left', 0, 'METIN');
    T(bx + 30, by + 160, 19, 'OLCEK: 1:1 mm (CAD Model Alani)  |  TARIH: 2026-11-15  |  CIZIM: ANTIGRAVITY', 'left', 0, 'METIN');
    T(bx + 30, by + 110, 17, 'KATMANLAR: MERDIVEN_ANA, BASAMAK, PERFORE, GIZLI, EKSEN, KONSOL, OLCU, METIN', 'left', 0, 'METIN');
    T(bx + 30, by + 60, 17, 'STANDARTLAR: TS EN 61537 / TS EN ISO 1461 / Agir Hizmet Tipi Celik', 'left', 0, 'METIN');

    // Malzeme Listesi (BOM) Tablosu
    const tableY = by + 500;
    const th = 40, cols = [60, 430, 120, 150, 190];
    const headers = ['NO', 'MALZEME TANIMI', 'ADET', 'BOY / OLCU', 'MALZEME / KALINLIK'];
    const rows = [
      ['1', 'Yan Tasiyici C-Profil Ray', '2', '7300 mm', 'Galvaniz Sac t=2.0 mm'],
      ['2', 'Perfore C-Profil Basamak Travers', '29', '230 mm', 'Galvaniz Sac t=2.0 mm'],
      ['3', 'Duvar / Kolon Tespit Konsolu L-Braket', '12', '70x50x4 mm', 'Sicak Daldirma Celik'],
      ['4', 'Uc Ek Plakasi (Joint Splice Plate)', '4', '200x180 mm', 'Galvaniz Celik t=3.0 mm'],
      ['5', 'Baglanti Civatasi ve Somun Takimi', '48', 'M10 x 25 8.8', 'HDG Galvaniz Civata'],
    ];

    T(bx, tableY + rows.length * th + 80, 28, 'MALZEME LISTESI (BILL OF MATERIALS - BOM)', 'left', 0, 'METIN');
    let cx = bx;
    R(bx, tableY + rows.length * th, bw, th, 'METIN');
    headers.forEach((h, i) => {
      T(cx + 10, tableY + rows.length * th + 12, 16, h, 'left', 0, 'METIN');
      cx += cols[i];
      if (i < cols.length - 1) L(cx, tableY, cx, tableY + (rows.length + 1) * th, 'METIN');
    });

    rows.forEach((r, ri) => {
      const ry = tableY + (rows.length - 1 - ri) * th;
      R(bx, ry, bw, th, 'METIN');
      let rx = bx;
      r.forEach((c, ci) => {
        T(rx + 10, ry + 12, 15, c, 'left', 0, 'METIN');
        rx += cols[ci];
      });
    });

    // İmalat ve Montaj Notları
    const noteY = tableY + (rows.length + 1) * th + 120;
    const notes = [
      'IMALAT VE UYGULAMA NOTLARI:',
      '1. Dikey kablo merdiveni, saft ve celik kolon yukselislerinde agir kablo demetlerini (feeder/enerji) tasimak uzere tasarlanmistir.',
      '2. Bakis yonu ARKADAN olarak cizilmistir; kablolar basamaklarin on yuzundeki 200 mm derinlikli hazneye yerlestirilir.',
      '3. Kablolar her basamakta paslanmaz celik / daldirma galvaniz unistrut kelepcelerle perfore slotlara kelepcelenmelidir.',
      '4. Basamak adimi dikey montaj standardi olan 250 mm alinmistir; toplam 29 adet travers basamak mevcuttur.',
      '5. Merdiven yan profilleri 200x35x10x2 mm C-formunda mukavemetli bukulmus sac profildir.',
      '6. Dikey tasima icin her 1.5 metrede bir rijit celik tespit konsolu ile tasiyici betona / celige ankraj yapilacaktir.',
      '7. Tum sac parcalar TS EN ISO 1461 standardina uygun sicak daldirma galvaniz (min. 55 mikron) kaplamalidir.'
    ];

    notes.forEach((nt, ni) => {
      T(bx, noteY + (notes.length - 1 - ni) * 35, ni === 0 ? 21 : 16, nt, 'left', 0, 'METIN');
    });
  }

  return dxf.toDxfString();
}

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
const outDxf = path.join(DIR_MM, `${FILE_BASE}_mm.dxf`);
const str = generate();

if (/NaN/.test(str)) {
  console.error('HATA: DXF icinde NaN tespit edildi!');
  process.exit(1);
}

fs.writeFileSync(outDxf, str, 'utf8');
console.log('DXF basariyla yazildi:', outDxf, `(${(str.length / 1024).toFixed(1)} KB)`);

// AutoCAD accoreconsole ile DWG ve PDF önizleme üretimi
if (fs.existsSync(ACCORE)) {
  const outDwg = path.join(DIR_MM, `${FILE_BASE}_mm.dwg`);
  const outPdf = path.join(DIR_MM, `${FILE_BASE}_onizleme.pdf`);
  const scrPath = path.join(DIR_MM, `${FILE_BASE}_convert.scr`);

  if (fs.existsSync(outDwg)) fs.unlinkSync(outDwg);
  if (fs.existsSync(outPdf)) fs.unlinkSync(outPdf);

  const scrContent = [
    '_.FILEDIA', '0',
    '_.CMDECHO', '0',
    '_.ZOOM', '_E',
    '_.SAVEAS', '2018', `"${outDwg}"`,
    '-PLOT', 'Y', 'Model', 'DWG To PDF.pc3', 'ISO full bleed A0 (841.00 x 1189.00 MM)',
    'M', 'L', 'N', 'E', 'F', 'C', 'Y', 'monochrome.ctb', 'Y', 'A', `"${outPdf}"`, 'N', 'Y',
    '_.QUIT'
  ].join('\r\n') + '\r\n';

  fs.writeFileSync(scrPath, scrContent, 'latin1');

  try {
    console.log('AutoCAD accoreconsole DWG ve PDF olusturuyor...');
    execFileSync(ACCORE, ['/i', outDxf, '/s', scrPath, '/l', 'en-US'], {
      stdio: 'ignore',
      timeout: 30000,
      cwd: DIR_MM
    });
  } catch (err) {
    // accoreconsole exit handling
  }

  if (fs.existsSync(scrPath)) fs.unlinkSync(scrPath);

  if (fs.existsSync(outDwg)) {
    console.log('DWG basariyla olusturuldu:', outDwg);
  }
  if (fs.existsSync(outPdf)) {
    console.log('PDF onizleme basariyla olusturuldu:', outPdf);
  }
}
