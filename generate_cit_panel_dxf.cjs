/**
 * generate_cit_panel_dxf.cjs
 *
 * PAFTA 16: PANJUR (JALUZİ) LAMELLİ METAL ÇİT PANELİ — ön görünüş, üst görünüş, kesit A-A
 *
 * Kullanıcı isteği: "veriler/cit dizinindeki görsellerden çitin kesitini üst ve karşıdan görünecek
 * şekilde dxf kesitini çıkar. panel yükseklik 180 cm, yatay uzunluk toplam 150 cm"
 *
 * Kullanıcı ölçüleri: panel yüksekliği 1800 mm, toplam yatay uzunluk 1500 mm (kolon dış yüzleri arası).
 * Diğer tüm ölçüler (kolon kesiti, lamel profili/adımı, taban plakası, kapak) fotoğraflardaki oranlardan
 * alınmış VARSAYIMDIR; aşağıdaki P bloğundan değiştirilip betik yeniden çalıştırılabilir:
 *   node generate_cit_panel_dxf.cjs
 *
 * Çıktılar (1 birim = 1 mm, antetsiz):
 *   DXF_Ciktilari/Milimetre/16_CIT_PANJUR_PANEL_K100_EKSEN1500_H1800_mm.dxf        (tek panel: ön, üst, kesit A-A)
 *   DXF_Ciktilari/Milimetre/17_CIT_PANJUR_DIZI_8_VE_2_PANEL_EKSEN1500_H1800_mm.dxf (8 ve 2 panel dizileri: ön + üst)
 *   DXF_Ciktilari/Milimetre/19_CIT_LED_YANLARI_3_PANEL_440_800_440_mm.dxf        (LED 800 iki yanında 3'er panel, ön görünüş)
 */
const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

const P = {
  // KULLANICI
  axis: 1500,         // kolon eksenleri arası (kullanıcı: "direklerin ortadan ortaya ölçüsü 150 cm")
  H: 1800,            // panel yüksekliği (zeminden kolon üstüne, kapak hariç)
  // VARSAYIM — kolon
  post: 100, postT: 2, // 100x100x2 kutu profil (kullanıcı: yan kolon 10 cm)
  cap: 15,            // kolon kapağı yüksekliği (kapak 84x84)
  plate: 180, plateT: 8, boltOff: 65, boltD: 12,   // taban plakası 180x180x8, 4 x M10 dübel (Ø12 delik)
  // VARSAYIM — lamel (yan kesit profili, sac 1.0 mm)
  lamT: 1.0,
  lamLip: 12,         // ön alt dudak (düşey)
  lamRun: 60,         // eğimli kanat yatay izdüşümü
  lamRise: 60,        // eğimli kanat düşey izdüşümü (45°)
  lamRet: 15,         // arka üst dönüş (düşey)
  pitch: 75,          // lamel adımı
  firstY: 50,         // ilk lamelin alt kenarı (zeminden)
  lamFront: 20,       // lamel ön yüzünün kolon ön yüzüne uzaklığı (lamel kolon derinliğinde ortalı)
  lamInsert: 20,      // lamel ucunun kolon içine girişi (kanal)
};
P.net = P.axis - P.post;                               // panel net (kolon iç yüzleri arası) 1400
P.W = P.axis + P.post;                                 // toplam dış uzunluk (1600)
P.lamH = P.lamLip + P.lamRise + P.lamRet;               // 87
P.n = Math.floor((P.H - P.firstY - P.lamH) / P.pitch) + 1;

const FILE_BASE = '16_CIT_PANJUR_PANEL_K100_EKSEN1500_H1800';
const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');

function generate(MODE) {
  const dxf = new DxfBuilder('mm');
  const d = dxf.d;
  dxf.addLayer('KOLON', 30, 'CONTINUOUS');
  dxf.addLayer('LAMEL', 4, 'CONTINUOUS');
  dxf.addLayer('TABAN', 9, 'CONTINUOUS');
  dxf.addLayer('ZEMIN', 8, 'CONTINUOUS');
  dxf.addLayer('DELIK', 3, 'CONTINUOUS');
  dxf.addLayer('GIZLI', 8, 'DASHED');
  dxf.addLayer('EKSEN', 1, 'DASHED');
  dxf.addLayer('TARAMA', 8, 'CONTINUOUS');
  dxf.addLayer('OLCU', 2, 'CONTINUOUS');
  dxf.addLayer('METIN', 7, 'CONTINUOUS');
  if (MODE === 'led') { dxf.addLayer('LED', 4, 'CONTINUOUS'); dxf.addLayer('CIT_LED_ARKASI', 8, 'DASHED'); }

  // LED modu: LED ekranın arkasında kalan çit çizgileri ayrı (kesik) katmana gider
  let hide = null; // { x0, x1, yTop }
  const HID = 'CIT_LED_ARKASI';

  const L = (x1, y1, x2, y2, layer) => {
    if (!hide || layer === 'ZEMIN' || layer === 'OLCU') return dxf.addLine(x1, y1, x2, y2, layer);
    const { x0, x1: xr, yTop } = hide;
    if (y1 === y2 && y1 < yTop) {
      const a = Math.min(x1, x2), b = Math.max(x1, x2);
      const hidLayer = (layer === 'LAMEL' || layer === 'GIZLI') ? null : HID;   // LED önde: lamel görünmez
      const parts = [[a, Math.min(b, x0), layer], [Math.max(a, x0), Math.min(b, xr), hidLayer], [Math.max(a, xr), b, layer]];
      parts.forEach(([p, q, ly]) => { if (ly && q - p > 1e-6) dxf.addLine(p, y1, q, y1, ly); });
      return;
    }
    if (x1 === x2 && x1 > x0 && x1 < xr) {
      const a = Math.min(y1, y2), b = Math.max(y1, y2);
      if (Math.min(b, yTop) - a > 1e-6) dxf.addLine(x1, a, x1, Math.min(b, yTop), HID);
      if (b - Math.max(a, yTop) > 1e-6) dxf.addLine(x1, Math.max(a, yTop), x1, b, layer);
      return;
    }
    dxf.addLine(x1, y1, x2, y2, layer);
  };
  const R = (x, y, w, h, layer) => dxf.addRect(x, y, w, h, layer);
  const C = (x, y, r, layer) => dxf.addCircle(x, y, r, layer);
  const T = (x, y, h, s, align = 'left', rot = 0) => dxf.addText(x, y, h, s, 'METIN', rot, align, 'baseline');
  const PL = (pts, layer, closed = true) => {
    const behind = hide && pts.every(([x, y]) => x > hide.x0 && x < hide.x1 && y < hide.yTop);
    dxf.setLayer(behind ? HID : layer); d.drawPolyline(pts, closed);
  };
  const TH = 18, TK = 6;
  const dimH = (x1, x2, yRef, yDim, label) => {
    dxf.setLayer('OLCU'); const s = yDim > yRef ? 1 : -1;
    d.drawLine(x1, yRef + s * 5, x1, yDim + s * 5); d.drawLine(x2, yRef + s * 5, x2, yDim + s * 5);
    d.drawLine(x1, yDim, x2, yDim);
    d.drawLine(x1 - TK, yDim - TK, x1 + TK, yDim + TK); d.drawLine(x2 - TK, yDim - TK, x2 + TK, yDim + TK);
    d.drawText((x1 + x2) / 2, yDim + 5, TH, 0, label, 'center', 'baseline');
  };
  const dimV = (y1, y2, xRef, xDim, label) => {
    dxf.setLayer('OLCU'); const s = xDim > xRef ? 1 : -1;
    d.drawLine(xRef + s * 5, y1, xDim + s * 5, y1); d.drawLine(xRef + s * 5, y2, xDim + s * 5, y2);
    d.drawLine(xDim, y1, xDim, y2);
    d.drawLine(xDim - TK, y1 - TK, xDim + TK, y1 + TK); d.drawLine(xDim - TK, y2 - TK, xDim + TK, y2 + TK);
    d.drawText(xDim - 5, (y1 + y2) / 2, TH, 90, label, 'center', 'baseline');
  };
  // Sac kalınlıklı kapalı profil (orta çizgi polyline'ı ±t/2 ofset)
  const sheet = (pts, t) => {
    const off = (sgn) => pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const n1 = i > 0 ? norm(a, p) : norm(p, b), n2 = i < pts.length - 1 ? norm(p, b) : norm(a, p);
      let nx = n1[0] + n2[0], ny = n1[1] + n2[1]; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
      const k = (t / 2) / Math.max(0.3, nx * n1[0] + ny * n1[1]);
      return [p[0] + sgn * nx * k, p[1] + sgn * ny * k];
    });
    return [...off(1), ...off(-1).reverse()];
  };
  const norm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [-dy / l, dx / l]; };

  const { W, H, post, postT, cap, plate, plateT, pitch, firstY, lamLip, lamRun, lamRise, lamRet, lamFront, lamInsert, n } = P;
  const lamYs = Array.from({ length: n }, (_, i) => firstY + i * pitch);
  const axis = P.axis;

  // Ön görünüş: k panel yan yana, komşu paneller ortak kolon kullanır. ox,oy = sol kolon dış yüzü / zemin
  const ground = (xa, xb, oy) => {
    L(xa, oy, xb, oy, 'ZEMIN');
    for (let x = xa; x < xb; x += 40) L(x, oy, x - 20, oy - 20, 'ZEMIN');
  };
  // İki kolon iç yüzü (xa, xb) arasındaki lameller, ön görünüş
  const bay = (xa, xb, oy) => {
    lamYs.forEach((y0, i) => {
      const y = oy + y0;
      L(xa, y, xb, y, 'LAMEL');
      L(xa, y + lamLip, xb, y + lamLip, 'LAMEL');
      const yk = y + lamLip + lamRise, top = i < n - 1 ? oy + lamYs[i + 1] : y + P.lamH;
      if (yk < top) L(xa, yk, xb, yk, 'LAMEL');
      if (i === n - 1) L(xa, y + P.lamH, xb, y + P.lamH, 'LAMEL');
      L(xa - lamInsert, y, xa, y, 'GIZLI'); L(xb, y, xb + lamInsert, y, 'GIZLI');
    });
  };
  const frontView = (ox, oy, k, detail, withGround = true) => {
    const Wk = k * axis + post;
    const postXs = Array.from({ length: k + 1 }, (_, i) => ox + i * axis);
    if (withGround) ground(ox - 250, ox + Wk + 250, oy);
    postXs.forEach((px) => {
      const cx = px + post / 2;
      R(cx - plate / 2, oy, plate, plateT, 'TABAN');
      [-1, 1].forEach((s) => L(cx + s * P.boltOff, oy - 10, cx + s * P.boltOff, oy + plateT + 12, 'EKSEN'));
      [-1, 1].forEach((s) => R(cx + s * P.boltOff - 9, oy + plateT, 18, 8, 'TABAN'));
      R(px, oy + plateT, post, H - plateT, 'KOLON');
      PL([[px - 2, oy + H], [px + post + 2, oy + H], [px + post + 2, oy + H + cap * 0.5], [px + post - 10, oy + H + cap], [px + 10, oy + H + cap], [px - 2, oy + H + cap * 0.5]], 'KOLON');
      L(cx, oy - 15, cx, oy + H + cap + 15, 'EKSEN');
    });
    for (let b = 0; b < k; b++) bay(postXs[b] + post, postXs[b + 1], oy);
    for (let b = 0; b < k; b++) dimH(postXs[b] + post / 2, postXs[b + 1] + post / 2, oy, oy - 110, `${axis}`);
    dimH(ox, ox + Wk, oy, oy - 170, `${Wk} (toplam)`);
    dimV(oy, oy + H, ox, ox - 70, `${H}`);
    dimH(ox + post, ox + axis, oy + H + cap, oy + H + cap + 50, `${axis - post} (net)`);
    dimH(ox, ox + post, oy + H + cap, oy + H + cap + 50, `${post}`);
    if (detail) {
      const xs = ox + Wk / 2;
      L(xs, oy - 60, xs, oy - 20, 'EKSEN'); L(xs, oy + H + 40, xs, oy + H + 80, 'EKSEN');
      T(xs + 8, oy - 60, 22, 'A'); T(xs + 8, oy + H + 60, 22, 'A');
      dimV(oy + H, oy + H + cap, ox + Wk, ox + Wk + 60, `${cap}`);
      dimV(oy, oy + firstY, ox + Wk - post, ox + Wk - post - 40, `${firstY}`);
      dimV(oy + lamYs[n - 2], oy + lamYs[n - 1], ox + Wk - post, ox + Wk - post - 40, `${pitch}`);
    }
    return Wk;
  };

  // Üst görünüş: y0 = kolon ön yüzü (ön aşağıda)
  const topView = (ox, y0, k, detail) => {
    const Wk = k * axis + post;
    const postXs = Array.from({ length: k + 1 }, (_, i) => ox + i * axis);
    postXs.forEach((px) => {
      const cx = px + post / 2, cy = y0 + post / 2;
      R(cx - plate / 2, cy - plate / 2, plate, plate, 'TABAN');
      [-1, 1].forEach((sx) => [-1, 1].forEach((sy) => C(cx + sx * P.boltOff, cy + sy * P.boltOff, P.boltD / 2, 'DELIK')));
      R(px - 2, y0 - 2, post + 4, post + 4, 'KOLON');
      R(px + 10, y0 + 10, post - 20, post - 20, 'KOLON');
      R(px + postT, y0 + postT, post - 2 * postT, post - 2 * postT, 'GIZLI');
      L(cx, cy - plate / 2 - 15, cx, cy + plate / 2 + 15, 'EKSEN');
    });
    const yf = y0 + lamFront, yb = y0 + lamFront + lamRun;
    for (let b = 0; b < k; b++) {
      const xa = postXs[b] + post, xb = postXs[b + 1];
      [yf, yb].forEach((yy) => { L(xa, yy, xb, yy, 'LAMEL'); L(xa - lamInsert, yy, xa, yy, 'GIZLI'); L(xb, yy, xb + lamInsert, yy, 'GIZLI'); });
      L(xa - lamInsert, yf, xa - lamInsert, yb, 'GIZLI'); L(xb + lamInsert, yf, xb + lamInsert, yb, 'GIZLI');
    }
    L(ox - 60, y0 + post / 2, ox + Wk + 60, y0 + post / 2, 'EKSEN');
    T(ox + Wk / 2, y0 - 60, 18, 'ON (CADDE / GORUNEN YUZ)', 'center');
    dimH(ox, ox + Wk, y0 + post / 2 + plate / 2, y0 + 190, `${Wk}`);
    if (detail) {
      dimV(y0, y0 + post, ox + Wk, ox + Wk + 120, `${post}`);
      dimV(yf, yb, ox + post, ox + post + 60, `${lamRun}`);
      dimV(y0 + post / 2 - plate / 2, y0 + post / 2 + plate / 2, ox, ox - 130, `${plate}`);
      dimH(ox + post / 2 - P.boltOff, ox + post / 2 + P.boltOff, y0 + post / 2 - plate / 2, y0 - 150, `${2 * P.boltOff}`);
    }
    return Wk;
  };

  if (MODE === 'led') {
    // Kullanıcı çizimi (cm): METAL FENS 440 | LED EKRAN 800 | METAL FENS 440. LED'in arkası çevrilmez;
    // yalnızca iki yandaki 440'lık alanlar panjur çitle kapanır. Kullanıcı: her yana 3 standart panel.
    // 3 panel = 3 x 1500 + 100 = 4600 > 4400: paneller LED kenarına dayanır (arkasına girmez), fazla 200 mm dış uçta taşar.
    const fenceL = 4400, ledW = 8000, ledH = 4500, total = fenceL * 2 + ledW;
    const kSide = 3, Wrun = kSide * axis + post;                  // 4600
    const led0 = fenceL, led1 = fenceL + ledW;
    const xL = led0 - Wrun, xR = led1;                            // sol dizi LED sol kenarında biter, sağ dizi sağ kenarında başlar
    const over = Wrun - fenceL;                                   // dış uçtaki taşma (200)
    ground(xL - 250, xR + Wrun + 250, 0);
    hide = { x0: led0, x1: led1, yTop: ledH };
    frontView(xL, 0, kSide, false, false);
    frontView(xR, 0, kSide, false, false);
    hide = null;
    dxf.addRect(led0, 0, ledW, ledH, 'LED');
    dxf.addRect(led0 + 60, 60, ledW - 120, ledH - 120, 'LED');                 // çerçeve
    for (let y = 60 + 250; y < ledH - 60; y += 250) {                           // modül şeritleri (yazı alanı boş)
      if (y > ledH * 0.75 - 250 && y < ledH * 0.75 + 250) continue;
      dxf.addLine(led0 + 60, y, led1 - 60, y, 'LED');
    }
    dxf.addText((led0 + led1) / 2, ledH * 0.75 + 60, 120, 'LED EKRAN', 'LED', 0, 'center', 'baseline');
    dxf.addText((led0 + led1) / 2, ledH * 0.75 - 120, 50, `${ledW} x ${ledH} (on yuz)`, 'LED', 0, 'center', 'baseline');
    // 440 sınırının dışına taşan kısım
    dimH(xL, 0, H + cap, H + cap + 160, `${over} tasma`);
    dimH(total, xR + Wrun, H + cap, H + cap + 160, `${over} tasma`);
    [0, total].forEach((x) => L(x, -60, x, H + cap + 260, 'EKSEN'));
    // Genel ölçüler
    dimH(0, led0, 0, -320, `${fenceL} METAL FENS`);
    dimH(led0, led1, 0, -320, `${ledW} LED EKRAN`);
    dimH(led1, total, 0, -320, `${fenceL} METAL FENS`);
    dimH(0, total, 0, -440, `${total} (cizimdeki alan)`);
    dimH(xL, xR + Wrun, 0, -560, `${xR + Wrun - xL} (cit dahil toplam)`);
    dimV(0, ledH, led1, led1 + 140, `${ledH}`);
    T(0, ledH + 400, 40, 'PAFTA 19 : LED EKRAN ve PANJUR LAMELLI CIT DIZILIMI - ON GORUNUS  -  1 birim = 1 mm');
    T(0, ledH + 350, 22, `LED arkasi cevrilmez. Iki yanda ${kSide}'er standart panel (eksen ${axis}, kolon ${post}, yukseklik ${H}), toplam ${Wrun}: paneller LED kenarina dayanir, fazla ${over} mm dis uctan 440 sinirinin disina tasar.`);
    T(0, ledH + 310, 22, 'LED ONDE, arkasi cevrilmez. LED olculeri kullanici cizimindeki 800 / 450 cm yazilarindan alindi.');
    return dxf.toDxfString();
  }

  if (MODE === 'dizi') {
    // 8'li dizi üstte, 2'li dizi altta; her biri ön + üst görünüş
    [[8, 0], [2, -4200]].forEach(([k, oy]) => {
      const Wk = frontView(0, oy, k, false);
      topView(0, oy - 700, k, false);
      T(0, oy + H + cap + 140, 40, `${k} PANEL YAN YANA  -  ${k + 1} kolon, toplam ${Wk} mm`);
      T(0, oy + H + cap + 100, 18, `Kolon eksenleri arasi ${axis}, kolon ${post}x${post}, net panel ${axis - post}, yukseklik ${H}. Komsu paneller ortak kolon kullanir.`);
      T(0, oy - 700 + 260, 26, 'UST GORUNUS');
    });
    T(0, -5400, 26, 'PAFTA 17 : PANJUR LAMELLI CIT DIZILERI (8 PANEL ve 2 PANEL)  -  1 birim = 1 mm');
    T(0, -5440, 18, 'Panel detayi ve kesit: Pafta 16. Lamel profili/adimi, kolon et kalinligi, taban plakasi ve kapak FOTOGRAF ORANINDAN VARSAYIMDIR.');
    return dxf.toDxfString();
  }

  // 1) ÖN GÖRÜNÜŞ (tek panel)  2) ÜST GÖRÜNÜŞ
  frontView(0, 0, 1, true);
  T(0, H + cap + 140, 34, '1) ON GORUNUS (KARSIDAN)');
  T(0, H + cap + 100, 18, `${n} adet lamel, adim ${pitch} mm, kolon ${post}x${post}x${postT}, taban plakasi ${plate}x${plate}x${plateT}`);
  topView(0, -700, 1, true);
  T(0, -700 + 260, 34, '2) UST GORUNUS');
  T(0, -700 + 225, 18, `Lameller kolon kanallarina ${lamInsert} mm girer (gizli). Taban plakasi 4 x O${P.boltD} delik, M10 celik dubel.`);

  // =========================================================================
  // 3) KESİT A-A (panel ortası, yandan)   orijin x: kolon ön yüzü = 2000
  // =========================================================================
  {
    const x0 = 2300;
    L(x0 - 250, 0, x0 + post + 250, 0, 'ZEMIN');
    for (let x = x0 - 250; x < x0 + post + 250; x += 40) L(x, 0, x - 20, -20, 'ZEMIN');
    // Arkadaki kolon (görünüş): kenarlar + taban plakası + kapak
    R(x0 + post / 2 - plate / 2, 0, plate, plateT, 'TABAN');
    R(x0, plateT, post, H - plateT, 'GIZLI');
    PL([[x0 - 2, H], [x0 + post + 2, H], [x0 + post + 2, H + cap * 0.5], [x0 + post - 10, H + cap], [x0 + 10, H + cap], [x0 - 2, H + cap * 0.5]], 'KOLON');
    L(x0 + post / 2, -15, x0 + post / 2, H + cap + 15, 'EKSEN');
    // Lamel kesitleri (taramalı sayılmaz: 1 mm sac, dolu çokgen olarak)
    lamYs.forEach((y) => {
      const xf = x0 + lamFront;
      const mid = [[xf, y], [xf, y + lamLip], [xf + lamRun, y + lamLip + lamRise], [xf + lamRun, y + P.lamH]];
      PL(sheet(mid, P.lamT), 'LAMEL');
    });
    // Ölçüler (alt iki lamel üzerinden)
    const y1 = lamYs[0], y2 = lamYs[1], xf = x0 + lamFront;
    dimV(y1, y2, xf, xf - 60, `${pitch}`);
    dimV(y2, y2 + P.lamH, xf + lamRun, xf + lamRun + 120, `${P.lamH}`);
    dimV(y2, y2 + lamLip, xf, xf - 110, `${lamLip}`);
    dimH(xf, xf + lamRun, y1, y1 - 30, `${lamRun}`);
    dimH(x0, xf, H + cap, H + cap + 40, `${lamFront}`);
    dimH(x0, x0 + post, H + cap, H + cap + 80, `${post}`);
    dimV(0, H, x0 + post, x0 + post + 170, `${H}`);
    T(x0 - 250, H + cap + 240, 34, '3) KESIT A-A');
    T(x0 - 250, H + cap + 200, 18, `Lamel: ${P.lamT} mm sac, 45 derece kanat, on dudak ${lamLip}, arka donus ${lamRet}`);
    T(x0 - 250, H + cap + 175, 18, 'Arkadaki kolon kesik cizgi (gorunus).');
  }

  // Genel not
  T(0, -1150, 26, `PAFTA 16 : PANJUR LAMELLI METAL CIT PANELI  -  ${W} x ${H} mm  -  1 birim = 1 mm`);
  T(0, -1190, 18, `Kullanici olculeri: kolon eksenleri arasi ${P.axis}, kolon ${post} (net panel ${P.net}), yukseklik ${H}. Lamel profili/adimi, kolon et kalinligi, taban plakasi ve kapak FOTOGRAF ORANINDAN VARSAYIMDIR.`);
  T(0, -1220, 18, 'Katmanlar: KOLON, LAMEL, TABAN, ZEMIN, DELIK, GIZLI, EKSEN, OLCU, METIN.');

  return dxf.toDxfString();
}

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
for (const [mode, base] of [['tek', FILE_BASE], ['dizi', '17_CIT_PANJUR_DIZI_8_VE_2_PANEL_EKSEN1500_H1800'], ['led', '19_CIT_LED_YANLARI_3_PANEL_440_800_440']]) {
  const out = path.join(DIR_MM, `${base}_mm.dxf`);
  const str = generate(mode);
  if (/NaN/.test(str)) { console.error('HATA: DXF icinde NaN var', mode); process.exit(1); }
  fs.writeFileSync(out, str, 'utf8');
  console.log('Yazildi:', out, `(${(str.length / 1024).toFixed(0)} KB), lamel sayisi ${P.n}`);
}
