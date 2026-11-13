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
 * Çıktı: DXF_Ciktilari/Milimetre/16_CIT_PANJUR_PANEL_1500x1800_mm.dxf  (1 birim = 1 mm, antetsiz)
 */
const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

const P = {
  // KULLANICI
  W: 1500,            // toplam yatay uzunluk (kolon dış yüzleri arası)
  H: 1800,            // panel yüksekliği (zeminden kolon üstüne, kapak hariç)
  // VARSAYIM — kolon
  post: 80, postT: 2, // 80x80x2 kutu profil
  cap: 15,            // kolon kapağı yüksekliği (kapak 84x84)
  plate: 160, plateT: 8, boltOff: 55, boltD: 12,   // taban plakası 160x160x8, 4 x M10 dübel (Ø12 delik)
  // VARSAYIM — lamel (yan kesit profili, sac 1.0 mm)
  lamT: 1.0,
  lamLip: 12,         // ön alt dudak (düşey)
  lamRun: 60,         // eğimli kanat yatay izdüşümü
  lamRise: 60,        // eğimli kanat düşey izdüşümü (45°)
  lamRet: 15,         // arka üst dönüş (düşey)
  pitch: 75,          // lamel adımı
  firstY: 50,         // ilk lamelin alt kenarı (zeminden)
  lamFront: 10,       // lamel ön yüzünün kolon ön yüzüne uzaklığı
  lamInsert: 20,      // lamel ucunun kolon içine girişi (kanal)
};
P.lamH = P.lamLip + P.lamRise + P.lamRet;               // 87
P.n = Math.floor((P.H - P.firstY - P.lamH) / P.pitch) + 1;

const FILE_BASE = '16_CIT_PANJUR_PANEL_1500x1800';
const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');

function generate() {
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

  const L = (x1, y1, x2, y2, layer) => dxf.addLine(x1, y1, x2, y2, layer);
  const R = (x, y, w, h, layer) => dxf.addRect(x, y, w, h, layer);
  const C = (x, y, r, layer) => dxf.addCircle(x, y, r, layer);
  const T = (x, y, h, s, align = 'left', rot = 0) => dxf.addText(x, y, h, s, 'METIN', rot, align, 'baseline');
  const PL = (pts, layer, closed = true) => { dxf.setLayer(layer); d.drawPolyline(pts, closed); };
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
  const postXs = [0, W - post];   // kolon sol kenarları

  // =========================================================================
  // 1) ÖN GÖRÜNÜŞ (karşıdan)   orijin: sol kolon dış yüzü, zemin
  // =========================================================================
  {
    L(-250, 0, W + 250, 0, 'ZEMIN');
    for (let x = -250; x < W + 250; x += 40) L(x, 0, x - 20, -20, 'ZEMIN');
    postXs.forEach((px) => {
      const cx = px + post / 2;
      R(cx - plate / 2, 0, plate, plateT, 'TABAN');
      [-1, 1].forEach((s) => L(cx + s * P.boltOff, -10, cx + s * P.boltOff, plateT + 12, 'EKSEN'));
      [-1, 1].forEach((s) => R(cx + s * P.boltOff - 9, plateT, 18, 8, 'TABAN'));        // somun
      R(px, plateT, post, H - plateT, 'KOLON');
      PL([[px - 2, H], [px + post + 2, H], [px + post + 2, H + cap * 0.5], [px + post - 10, H + cap], [px + 10, H + cap], [px - 2, H + cap * 0.5]], 'KOLON');
      L(cx, -15, cx, H + cap + 15, 'EKSEN');
    });
    // Lameller: alt kenar, dudak üstü, kanat-dönüş kırımı (görünen kısım bir sonraki lamelin altına kadar)
    const xa = post, xb = W - post;
    lamYs.forEach((y, i) => {
      L(xa, y, xb, y, 'LAMEL');
      L(xa, y + lamLip, xb, y + lamLip, 'LAMEL');
      const yk = y + lamLip + lamRise;
      const top = i < n - 1 ? lamYs[i + 1] : y + P.lamH;
      if (yk < top) L(xa, yk, xb, yk, 'LAMEL');
      if (i === n - 1) L(xa, y + P.lamH, xb, y + P.lamH, 'LAMEL');
      // kolon içine giren uçlar (gizli)
      L(xa - lamInsert, y, xa, y, 'GIZLI'); L(xb, y, xb + lamInsert, y, 'GIZLI');
    });
    // Kesit hattı A-A
    const xs = W / 2;
    L(xs, -60, xs, -20, 'EKSEN'); L(xs, H + 40, xs, H + 80, 'EKSEN');
    T(xs + 8, -60, 22, 'A'); T(xs + 8, H + 60, 22, 'A');

    dimH(0, W, 0, -110, `${W}`);
    dimH(post, W - post, H + cap, H + cap + 50, `${W - 2 * post} (net)`);
    dimH(0, post, H + cap, H + cap + 50, `${post}`);
    dimV(0, H, 0, -70, `${H}`);
    dimV(H, H + cap, W, W + 60, `${cap}`);
    dimV(0, firstY, W - post, W - post - 40, `${firstY}`);
    dimV(lamYs[n - 2], lamYs[n - 1], W - post, W - post - 40, `${pitch}`);
    T(0, H + cap + 140, 34, '1) ON GORUNUS (KARSIDAN)');
    T(0, H + cap + 100, 18, `${n} adet lamel, adim ${pitch} mm, kolon ${post}x${post}x${postT}, taban plakasi ${plate}x${plate}x${plateT}`);
  }

  // =========================================================================
  // 2) ÜST GÖRÜNÜŞ   orijin x: sol kolon dış yüzü; y: kolon ön yüzü = -500 (ön aşağıda)
  // =========================================================================
  {
    const y0 = -700;   // kolon ön yüzü
    postXs.forEach((px) => {
      const cx = px + post / 2, cy = y0 + post / 2;
      R(cx - plate / 2, cy - plate / 2, plate, plate, 'TABAN');
      [-1, 1].forEach((sx) => [-1, 1].forEach((sy) => C(cx + sx * P.boltOff, cy + sy * P.boltOff, P.boltD / 2, 'DELIK')));
      R(px - 2, y0 - 2, post + 4, post + 4, 'KOLON');             // kapak
      R(px + 10, y0 + 10, post - 20, post - 20, 'KOLON');          // kapak tepe
      R(px + postT, y0 + postT, post - 2 * postT, post - 2 * postT, 'GIZLI');   // kolon iç yüzü
      L(cx, cy - plate / 2 - 15, cx, cy + plate / 2 + 15, 'EKSEN');
      L(cx - plate / 2 - 15, cy, cx + plate / 2 + 15, cy, 'EKSEN');
    });
    // En üst lamel üstten: ön dudak ve arka dönüş çizgileri (kolonlar arası), kolon içindeki uçlar gizli
    const yf = y0 + lamFront, yb = y0 + lamFront + lamRun;
    [yf, yb].forEach((yy) => {
      L(post, yy, W - post, yy, 'LAMEL');
      L(post - lamInsert, yy, post, yy, 'GIZLI'); L(W - post, yy, W - post + lamInsert, yy, 'GIZLI');
    });
    L(post - lamInsert, yf, post - lamInsert, yb, 'GIZLI'); L(W - post + lamInsert, yf, W - post + lamInsert, yb, 'GIZLI');
    L(-60, y0 + post / 2, W + 60, y0 + post / 2, 'EKSEN');
    T(W / 2, y0 - 40, 18, 'ON (CADDE / GORUNEN YUZ)', 'center');

    dimH(0, W, y0 + post / 2 + plate / 2, y0 + 190, `${W}`);
    dimV(y0, y0 + post, W, W + 120, `${post}`);
    dimV(yf, yb, post, post + 60, `${lamRun}`);
    dimV(y0 + post / 2 - plate / 2, y0 + post / 2 + plate / 2, 0, -130, `${plate}`);
    dimH(post / 2 - P.boltOff, post / 2 + P.boltOff, y0 + post / 2 - plate / 2, y0 - 150, `${2 * P.boltOff}`);
    T(0, y0 + 260, 34, '2) UST GORUNUS');
    T(0, y0 + 225, 18, `Lameller kolon kanallarina ${lamInsert} mm girer (gizli). Taban plakasi 4 x O${P.boltD} delik, M10 celik dubel.`);
  }

  // =========================================================================
  // 3) KESİT A-A (panel ortası, yandan)   orijin x: kolon ön yüzü = 2000
  // =========================================================================
  {
    const x0 = 2000;
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
  T(0, -1190, 18, `Kullanici olculeri: toplam uzunluk ${W} (kolon dis yuzleri arasi), yukseklik ${H}. Kolon, lamel profili/adimi, taban plakasi ve kapak olculeri FOTOGRAF ORANINDAN VARSAYIMDIR.`);
  T(0, -1220, 18, 'Katmanlar: KOLON, LAMEL, TABAN, ZEMIN, DELIK, GIZLI, EKSEN, OLCU, METIN.');

  return dxf.toDxfString();
}

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
const out = path.join(DIR_MM, `${FILE_BASE}_mm.dxf`);
const str = generate();
if (/NaN/.test(str)) { console.error('HATA: DXF icinde NaN var'); process.exit(1); }
fs.writeFileSync(out, str, 'utf8');
console.log('Yazildi:', out, `(${(str.length / 1024).toFixed(0)} KB), lamel sayisi ${P.n}`);
