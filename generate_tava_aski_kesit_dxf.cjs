/**
 * generate_tava_aski_kesit_dxf.cjs
 *
 * PAFTA 26: ÇATI MAKASI TAVA ASKISI — DÜZ (enine gergi Ø115) ve ÇAPRAZ (üst zikzak Ø223) askı kesitleri
 *
 * Kullanıcı isteği (2026-11-15): Tava Ofset sayfasındaki (tava_aski_aparati.js) iki askının ölçülü DXF kesiti.
 * Geometri o sayfayla aynı: iki parçalı kelepçe 50x5 + 5 mm keçe, kelepçe altında kaynaklı delikli U parça,
 * M12 dişli tij L=800, 40x40 U profil (açık taraf yana), pul + rondela, en altta çift somun.
 *
 * VARSAYIM (üretici / saha ölçüsü değil): kelepçe bandı 50x5, kulak 30, U parça 45x40, U profil et 3 mm,
 * pul Ø24x2.5, rondela Ø20x3, somun 19x10. tava_aski_aparati.js değişirse bu betik de güncellenmeli.
 *
 * Görünüşler (1 birim = 1 mm), her askı için:
 *   1) Ön görünüş (boru eksenine dik bakış; tij düzlemi)   2) Kesit A-A (boru eksenine dik, tij ekseninden)
 *   3) U profil üst görünüşü (delik düzeni)
 *
 * Çalıştırma: node generate_tava_aski_kesit_dxf.cjs
 * Çıktı:      DXF_Ciktilari/Milimetre/26_TAVA_ASKISI_DUZ_VE_CAPRAZ_KESIT_mm.dxf (+ _onizleme.svg)
 */
const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

// --- Ölçüler (mm) — tava_aski_aparati.js ile aynı formüller ---
const spineR = 1320 / Math.PI / 2;
const legR = 350 / Math.PI / 2;
const chordX = (0.438 * 3080 + 39) / 2 + legR / Math.cos(Math.atan(0.438 / 2)); // üst aşık ekseni (enine)
const MID_NODE = 2860;
const TRAY = { w: 500, h: 200, t: 1.5 };
const ARM_X = TRAY.w / 2 + 40;                 // tij ekseni (tava ekseninden)
const TB = -(3080 - 2300);                     // tava tabanı, boru ekseninden (−780)
const P = {
  felt: 5, bandT: 5, bandW: 50, ear: 30, earGap: 4,
  uW: 45, uD: 40, uT: 5, uHole: 13,
  rodR: 6, rodL: 800, nutW: 19, nutH: 10, pulD: 24, pulH: 2.5, ronD: 20, ronH: 3,
  prof: 40, profT: 3, pitch: 100, m8: 9, tijHole: 14,
};
// Çapraz askı: tijler zikzağın x = ±ARM_X'ten geçtiği noktalarda
const sAt = (xa) => (1 - xa / -chordX) / 2 * MID_NODE;
const FOOT = Math.hypot(2 * ARM_X, sAt(ARM_X) - sAt(-ARM_X));
const HANGERS = [
  { key: 'DUZ', title: 'DUZ ASKI - ENINE GERGIDEN', pipe: 'Enine gergi O115 (36 cm cevre)', R: 360 / Math.PI / 2,
    span: 2 * ARM_X, profLen: 700, trayCut: TRAY.w, trayNote: 'Kablo tavasi 500x200 (kesit)' },
  { key: 'CAPRAZ', title: 'CAPRAZ ASKI - UST ZIKZAKTAN', pipe: 'Ust zikzak O223 (70 cm cevre)', R: 700 / Math.PI / 2,
    span: FOOT, profLen: Math.ceil((FOOT + 100) / P.pitch - 1e-6) * P.pitch, trayCut: TRAY.w * FOOT / (2 * ARM_X),
    trayNote: `Kablo tavasi 500x200 - askiya ${(Math.asin(2 * ARM_X / FOOT) * 180 / Math.PI).toFixed(1)} derece capraz gecer (egik kesit)` },
];

const FILE_BASE = '26_TAVA_ASKISI_DUZ_VE_CAPRAZ_KESIT';
const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');
const LAYERS = { BORU: [9, '#64748b'], KECE: [8, '#a1a1aa'], KELEPCE: [30, '#c2410c'], TIJ: [5, '#1d4ed8'], BAGLANTI: [3, '#15803d'],
  U_PROFIL: [4, '#0e7490'], TAVA: [6, '#a21caf'], TARAMA: [8, '#9ca3af'], GIZLI: [8, '#6b7280'], EKSEN: [1, '#dc2626'], OLCU: [2, '#b45309'], METIN: [7, '#111827'] };

function generate() {
  const dxf = new DxfBuilder('mm');
  const d = dxf.d;
  Object.entries(LAYERS).forEach(([n, [c]]) => dxf.addLayer(n, c, n === 'GIZLI' || n === 'EKSEN' ? 'DASHED' : 'CONTINUOUS'));
  const svg = [];   // önizleme için kayıt
  const L = (x1, y1, x2, y2, layer) => { dxf.setLayer(layer); d.drawLine(x1, y1, x2, y2); svg.push(['l', layer, x1, y1, x2, y2]); };
  const R = (x, y, w, h, layer) => { L(x, y, x + w, y, layer); L(x + w, y, x + w, y + h, layer); L(x + w, y + h, x, y + h, layer); L(x, y + h, x, y, layer); };
  const C = (cx, cy, r, layer) => { dxf.setLayer(layer); d.drawCircle(cx, cy, r); svg.push(['c', layer, cx, cy, r]); };
  const A = (cx, cy, r, a0, a1, layer) => { dxf.setLayer(layer); d.drawArc(cx, cy, r, a0, a1); svg.push(['a', layer, cx, cy, r, a0, a1]); };
  const T = (x, y, h, s, align = 'left', rot = 0, layer = 'METIN') => { dxf.setLayer(layer); d.drawText(x, y, h, rot, s, align, 'baseline'); svg.push(['t', layer, x, y, h, s, align, rot]); };
  const TH = 16, TK = 5;
  const dimH = (x1, x2, yRef, yDim, label) => {
    const sg = yDim > yRef ? 1 : -1;
    L(x1, yRef + sg * 4, x1, yDim + sg * 6, 'OLCU'); L(x2, yRef + sg * 4, x2, yDim + sg * 6, 'OLCU'); L(x1, yDim, x2, yDim, 'OLCU');
    L(x1 - TK, yDim - TK, x1 + TK, yDim + TK, 'OLCU'); L(x2 - TK, yDim - TK, x2 + TK, yDim + TK, 'OLCU');
    T((x1 + x2) / 2, yDim + 5, TH, label, 'center', 0, 'OLCU');
  };
  const dimV = (y1, y2, xRef, xDim, label) => {
    const sg = xDim > xRef ? 1 : -1;
    L(xRef + sg * 4, y1, xDim + sg * 6, y1, 'OLCU'); L(xRef + sg * 4, y2, xDim + sg * 6, y2, 'OLCU'); L(xDim, y1, xDim, y2, 'OLCU');
    L(xDim - TK, y1 - TK, xDim + TK, y1 + TK, 'OLCU'); L(xDim - TK, y2 - TK, xDim + TK, y2 + TK, 'OLCU');
    T(xDim - 5, (y1 + y2) / 2, TH, label, 'center', 90, 'OLCU');
  };
  const hatchRect = (x0, y0, w, h, layer, step = 2.5) => {
    R(x0, y0, w, h, layer);
    for (let k = -h; k < w; k += step) {
      let ax = x0 + k, ay = y0, bx = x0 + k + h, by = y0 + h;
      if (ax < x0) { ay += x0 - ax; ax = x0; }
      if (bx > x0 + w) { by -= bx - (x0 + w); bx = x0 + w; }
      if (bx > ax) L(ax, ay, bx, by, 'TARAMA');
    }
  };
  // Not + gösterge çizgisi
  const note = (px, py, tx, ty, s) => { L(px, py, tx - 6, ty + 6, 'METIN'); T(tx, ty, TH, s); };
  // Bağlantı takımı: yüzeyden dir yönünde pul → (rondela) → n somun. Dönen: uç kotu
  const stack = (cx, yFace, dir, spring, nuts) => {
    let y = yFace;
    const part = (w, h, lines) => {
      const y0 = dir > 0 ? y : y - h;
      R(cx - w / 2, y0, w, h, 'BAGLANTI');
      if (lines) [-1, 1].forEach((s) => L(cx + s * w / 4, y0, cx + s * w / 4, y0 + h, 'BAGLANTI'));
      y += dir * h;
    };
    part(P.pulD, P.pulH);
    if (spring) part(P.ronD, P.ronH);
    for (let i = 0; i < nuts; i++) part(P.nutW, P.nutH, true);
    return y;
  };
  const rod = (cx, ya, yb) => [-1, 1].forEach((s) => L(cx + s * P.rodR, ya, cx + s * P.rodR, yb, 'TIJ'));

  HANGERS.forEach((h, idx) => {
    const ringR = h.R + P.felt + P.bandT;
    const botY = -(ringR + P.uD);                          // U parça alt yüzü
    const rodTop = botY + P.uT + P.pulH + P.nutH + 4;
    const rodBot = rodTop - P.rodL;
    const profBot = TB - P.prof;
    const half = Math.max(h.span / 2 + 220, h.profLen / 2 + 80);
    const ox = idx === 0 ? 0 : 3300;                       // ön görünüş ekseni
    const sx = ox + half + 520;                            // kesit A-A ekseni
    const topY = ringR + 260;

    T(ox - half, topY + 110, 34, `${idx + 1}) ${h.title}`);
    T(ox - half, topY + 60, 20, `${h.pipe}   -   tij araligi ${h.span.toFixed(0)} mm, U profil L = ${h.profLen} mm`);

    // ---------------- ÖN GÖRÜNÜŞ ----------------
    T(ox - half, topY, 22, 'ON GORUNUS (boru eksenine dik bakis)');
    L(ox - half, h.R, ox + half, h.R, 'BORU'); L(ox - half, -h.R, ox + half, -h.R, 'BORU');
    [-1, 1].forEach((s) => { L(ox + s * half, -h.R, ox + s * half, h.R, 'BORU'); });
    L(ox - half - 40, 0, ox + half + 40, 0, 'EKSEN');
    let stackBot = 0;
    [-1, 1].forEach((s) => {
      const x = ox + s * h.span / 2;
      R(x - P.bandW / 2 - 5, -(h.R + P.felt), P.bandW + 10, 2 * (h.R + P.felt), 'KECE');
      R(x - P.bandW / 2, -ringR, P.bandW, 2 * ringR, 'KELEPCE');
      [P.earGap / 2, -P.earGap / 2 - P.bandT].forEach((y) => R(x - P.bandW / 2, y, P.bandW, P.bandT, 'KELEPCE'));   // kulaklar (uçtan)
      R(x - 8.5, P.earGap / 2 + P.bandT, 17, 6.4, 'BAGLANTI'); R(x - 8.5, -P.earGap / 2 - P.bandT - 8, 17, 8, 'BAGLANTI');   // M10 baş / somun
      R(x - 5, -P.earGap / 2 - P.bandT - 12, 10, 4, 'BAGLANTI');
      R(x - P.bandW / 2, botY, P.bandW, P.uD, 'KELEPCE');                           // kaynaklı U parça (bacak yüzü)
      L(x - P.bandW / 2, botY + P.uT, x + P.bandW / 2, botY + P.uT, 'GIZLI');
      const a = stack(x, botY, -1, true, 1);
      const b = stack(x, TB, 1, false, 1);
      stackBot = stack(x, profBot, -1, true, 2);
      rod(x, a, b); rod(x, stackBot, rodBot); L(x - P.rodR, rodBot, x + P.rodR, rodBot, 'TIJ');
      L(x, ringR + 30, x, rodBot - 30, 'EKSEN');
    });
    // U profil (yandan): üst / alt kanat
    R(ox - h.profLen / 2, profBot, h.profLen, P.prof, 'U_PROFIL');
    L(ox - h.profLen / 2, TB - P.profT, ox + h.profLen / 2, TB - P.profT, 'U_PROFIL');
    L(ox - h.profLen / 2, profBot + P.profT, ox + h.profLen / 2, profBot + P.profT, 'U_PROFIL');
    // Tava kesiti
    const tw = h.trayCut / 2, tt = TRAY.t * h.trayCut / TRAY.w;
    [[tw, 0], [tw - tt, TRAY.t]].forEach(([w, o]) => {
      L(ox - w, TB + TRAY.h, ox - w, TB + o, 'TAVA'); L(ox - w, TB + o, ox + w, TB + o, 'TAVA'); L(ox + w, TB + o, ox + w, TB + TRAY.h, 'TAVA');
    });
    [-1, 1].forEach((s) => L(ox + s * tw, TB + TRAY.h, ox + s * (tw - tt), TB + TRAY.h, 'TAVA'));
    T(ox, TB + TRAY.h / 2, TH, h.trayNote, 'center');
    // Ölçüler
    dimH(ox - h.span / 2, ox + h.span / 2, ringR, ringR + 110, `${h.span.toFixed(0)} (tij ekseni)`);
    dimH(ox - tw, ox + tw, TB + TRAY.h, TB + TRAY.h + 50, `${h.trayCut.toFixed(0)}`);
    dimH(ox - h.profLen / 2, ox + h.profLen / 2, rodBot, rodBot - 70, `${h.profLen} (U profil 40x40)`);
    dimV(TB, 0, ox - half, ox - half - 70, `${-TB} (boru ekseni - tava tabani)`);
    dimV(TB, TB + TRAY.h, ox - tw, ox - tw - 50, `${TRAY.h}`);
    dimV(rodBot, rodTop, ox + half, ox + half + 70, `${P.rodL} (M12 tij)`);
    dimV(rodBot, stackBot, ox + h.span / 2 + 14, ox + h.span / 2 + 60, `${(stackBot - rodBot).toFixed(0)}`);
    dimV(-h.R, h.R, ox + half, ox + half + 150, `O${(2 * h.R).toFixed(0)}`);

    // ---------------- KESİT A-A ----------------
    T(sx - 200, topY, 22, 'KESIT A-A (tij ekseninden)');
    C(sx, 0, h.R, 'BORU'); C(sx, 0, h.R + P.felt, 'KECE');
    L(sx - h.R - 60, 0, sx + h.R + 60, 0, 'EKSEN'); L(sx, ringR + 40, sx, rodBot - 30, 'EKSEN');
    const g = Math.asin(P.earGap / 2 / ringR) * 180 / Math.PI;
    A(sx, 0, ringR, g, 180 - g, 'KELEPCE'); A(sx, 0, ringR, 180 + g, 360 - g, 'KELEPCE');
    [-1, 1].forEach((s) => {
      const x0 = s > 0 ? sx + ringR - 1 : sx - ringR - P.ear;
      [P.earGap / 2, -P.earGap / 2 - P.bandT].forEach((y) => R(x0, y, P.ear + 1, P.bandT, 'KELEPCE'));
      const bx = sx + s * (ringR + 14);
      R(bx - 8.5, P.earGap / 2 + P.bandT, 17, 6.4, 'BAGLANTI'); R(bx - 8.5, -P.earGap / 2 - P.bandT - 8, 17, 8, 'BAGLANTI');
      R(bx - 5, -P.earGap / 2 - P.bandT - 12, 10, 4, 'BAGLANTI');
      // U parça bacakları (kesit, taramalı)
      const lx = sx + s * (P.uW - P.uT) / 2 - P.uT / 2;
      const ly = -Math.sqrt(ringR * ringR - ((P.uW - P.uT) / 2) ** 2);
      hatchRect(lx, botY + P.uT, P.uT, ly - (botY + P.uT), 'KELEPCE');
      // delikli alt yüz (delik iki yanında)
      const px = s > 0 ? sx + P.uHole / 2 : sx - P.uW / 2;
      hatchRect(px, botY, P.uW / 2 - P.uHole / 2, P.uT, 'KELEPCE');
    });
    const inTop = stack(sx, botY + P.uT, 1, false, 1);
    const a = stack(sx, botY, -1, true, 1);
    const b = stack(sx, TB, 1, false, 1);
    const sb = stack(sx, profBot, -1, true, 2);
    rod(sx, inTop, rodTop); L(sx - P.rodR, rodTop, sx + P.rodR, rodTop, 'TIJ');
    rod(sx, a, b); rod(sx, TB - P.profT, profBot + P.profT); rod(sx, sb, rodBot); L(sx - P.rodR, rodBot, sx + P.rodR, rodBot, 'TIJ');
    // U profil kesiti: açık taraf yana (+x)
    const q = P.prof / 2, t = P.profT;
    const cs = [[q, TB], [-q, TB], [-q, profBot], [q, profBot], [q, profBot + t], [-q + t, profBot + t], [-q + t, TB - t], [q, TB - t]];
    cs.forEach((p, i) => { const n = cs[(i + 1) % cs.length]; L(sx + p[0], p[1], sx + n[0], n[1], 'U_PROFIL'); });
    [-1, 1].forEach((s) => {   // kanat ve sırt taraması (tij deliği dışında)
      [TB - t, profBot].forEach((y) => hatchRect(s > 0 ? sx + P.tijHole / 2 : sx - q + t, y, q - P.tijHole / 2 - (s > 0 ? 0 : t), t, 'U_PROFIL'));
    });
    hatchRect(sx - q, profBot, t, P.prof, 'U_PROFIL');
    // Tava tabanı / üst kenarı (kesit düzleminde boyuna)
    [0, TRAY.t, TRAY.h].forEach((o) => L(sx - 230, TB + o, sx + 230, TB + o, 'TAVA'));
    // Ölçüler ve notlar
    dimV(botY, -ringR, sx - P.uW / 2, sx - ringR - 90, `${P.uD}`);
    dimH(sx - P.uW / 2, sx + P.uW / 2, botY - 30, botY - 75, `${P.uW}`);
    dimV(profBot, TB, sx - q, sx - q - 60, `${P.prof}`);
    dimH(sx - q, sx + q, sb - 6, sb - 55, `${P.prof}`);
    const nx = sx + ringR + 110;
    note(sx + ringR * 0.7, ringR * 0.7, nx, ringR + 60, 'Iki parcali kelepce 50x5 + 5 mm kece');
    note(sx + ringR + 14, 12, nx, 30, 'Kulak 30 mm, M10 civata + somun (iki yanda)');
    note(sx + P.uW / 2, botY + P.uD / 2, nx, botY + 20, `Kaynakli U parca ${P.uW}x${P.uD}, lama 50x5, O${P.uHole} delik`);
    note(sx + P.pulD / 2, botY - 8, nx, botY - 40, 'Icte pul + somun / altta pul + rondela + somun');
    note(sx + P.rodR, (botY + TB) / 2, nx, (botY + TB) / 2, `M12 disli tij L = ${P.rodL}`);
    note(sx + q, TB - P.prof / 2, nx, TB - 10, `U profil ${P.prof}x${P.prof}x${P.profT}, acik taraf yana`);
    note(sx + P.nutW / 2, sb + 8, nx, profBot - 60, 'Ustte pul + somun / altta pul + rondela + 2 somun');
    note(sx + 200, TB + TRAY.h, nx, TB + TRAY.h + 30, 'Kablo tavasi (tabani U profilin ust kanadinda)');

    // ---------------- U PROFİL ÜST GÖRÜNÜŞ ----------------
    const py = rodBot - 330;
    T(ox - h.profLen / 2, py + 95, 22, `U PROFIL UST GORUNUS - L = ${h.profLen}`);
    R(ox - h.profLen / 2, py, h.profLen, P.prof, 'U_PROFIL');
    L(ox - h.profLen / 2, py + P.profT, ox + h.profLen / 2, py + P.profT, 'GIZLI');
    L(ox - h.profLen / 2 - 30, py + q, ox + h.profLen / 2 + 30, py + q, 'EKSEN');
    const tijX = [-h.span / 2, h.span / 2];
    tijX.forEach((x) => C(ox + x, py + q, P.tijHole / 2, 'TIJ'));
    let m8 = 0; const hx = [];
    for (let i = 0; i < Math.round(h.profLen / P.pitch); i++) {
      const x = -h.profLen / 2 + P.pitch / 2 + i * P.pitch;
      if (tijX.some((tx) => Math.abs(tx - x) < 30)) continue;
      C(ox + x, py + q, P.m8 / 2, 'U_PROFIL'); hx.push(x); m8++;
    }
    dimH(ox - h.profLen / 2, ox + h.profLen / 2, py, py - 95, `${h.profLen}`);
    dimH(ox + tijX[0], ox + tijX[1], py, py - 50, `${h.span.toFixed(0)} (2 x O${P.tijHole} tij deligi)`);
    if (hx.length > 1) dimH(ox + hx[0], ox + hx[1], py + P.prof, py + P.prof + 30, `${(hx[1] - hx[0]).toFixed(0)}`);
    T(ox - h.profLen / 2, py - 140, TH, `${m8} x O${P.m8} (M8) delik, ${P.pitch} mm adim; tij deligine 30 mm'den yakin olan acilmaz.`);
  });

  T(-500, -1620, 26, 'PAFTA 26 : CATI MAKASI TAVA ASKISI - DUZ VE CAPRAZ ASKI KESITLERI  -  1 birim = 1 mm');
  T(-500, -1660, TH, 'Kelepce bandi 50x5, kulak 30, U parca 45x40, U profil et 3 mm, pul/rondela/somun olculeri VARSAYIM (saha fotografi orani). Cati borusunda delme / kaynak yok.');
  T(-500, -1690, TH, `Katmanlar: ${Object.keys(LAYERS).join(', ')}.`);
  return { str: dxf.toDxfString(), svg };
}

function toSvg(items) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const ext = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  items.forEach((it) => { if (it[0] === 'l') { ext(it[2], it[3]); ext(it[4], it[5]); } else if (it[0] === 't') ext(it[2] + (it[6] === 'left' ? it[5].length * it[4] * 0.6 : 0), it[3]); else { ext(it[2] - it[4], it[3] - it[4]); ext(it[2] + it[4], it[3] + it[4]); } });
  x0 -= 60; y0 -= 60; x1 += 60; y1 += 60;
  const col = (l) => LAYERS[l][1];
  const dash = (l) => (l === 'GIZLI' || l === 'EKSEN' ? ' stroke-dasharray="8 5"' : '');
  const body = items.map((it) => {
    const l = it[1];
    if (it[0] === 'l') return `<line x1="${it[2]}" y1="${-it[3]}" x2="${it[4]}" y2="${-it[5]}" stroke="${col(l)}"${dash(l)}/>`;
    if (it[0] === 'c') return `<circle cx="${it[2]}" cy="${-it[3]}" r="${it[4]}" stroke="${col(l)}" fill="none"/>`;
    if (it[0] === 'a') {
      const [cx, cy, r, a0, a1] = it.slice(2); const rad = Math.PI / 180;
      const p0 = [cx + r * Math.cos(a0 * rad), -(cy + r * Math.sin(a0 * rad))], p1 = [cx + r * Math.cos(a1 * rad), -(cy + r * Math.sin(a1 * rad))];
      return `<path d="M${p0[0]} ${p0[1]} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${p1[0]} ${p1[1]}" stroke="${col(l)}" fill="none"/>`;
    }
    const [x, y, hh, s, al, rot] = it.slice(2);
    return `<text x="${x}" y="${-y}" font-size="${hh * 1.25}" fill="${col(l)}" stroke="none" text-anchor="${al === 'center' ? 'middle' : 'start'}"${rot ? ` transform="rotate(${-rot} ${x} ${-y})"` : ''}>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${-y1} ${x1 - x0} ${y1 - y0}" font-family="Arial" stroke-width="1.2" style="background:#fff">\n${body}\n</svg>`;
}

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
const { str, svg } = generate();
if (/NaN/.test(str)) { console.error('HATA: DXF icinde NaN var'); process.exit(1); }
const out = path.join(DIR_MM, `${FILE_BASE}_mm.dxf`);
fs.writeFileSync(out, str, 'utf8');
fs.writeFileSync(path.join(DIR_MM, `${FILE_BASE}_onizleme.svg`), toSvg(svg), 'utf8');
console.log('Yazildi:', out, `(${(str.length / 1024).toFixed(0)} KB)`, '+ onizleme.svg');
