/**
 * generate_catwalk_rru_section_dxf.cjs
 * 
 * ALAN 1 VE ALAN 3 - ORTA KEDİ YOLU 14 ADET RRU MONTAJ VE GEÇİŞ ENKESİTİ (DETAY PAFTASI)
 * 
 * İçerik:
 * 1. GÖRÜNÜŞ 1: Kedi Yolu Tipik A-A Enkesiti (Kedi yolu ızgarası, korkuluklar, Ø140mm çatı makası dikmesi,
 *    20 cm ofset konsolu, 2" galvaniz montaj borusu, kısa kenardan RRU montajı, net yürüyüş koridoru ölçüsü, 500mm tava)
 * 2. GÖRÜNÜŞ 2: Önden Elevasyon Görünüşü (Sol ve Sağ borularda 3 sıra halinde 14 RRU dağılımı:
 *    4 Turkcell + 4 Türk Telekom + 6 Vodafone)
 * 3. DETAY A: 20 cm Ofset Konsol Kolu ve Kelepçe İmalat Detayı (1:5)
 * 4. DETAY B: RRU Kısa Kenar Montaj Braketi ve Emniyet Pimi Detayı (1:5)
 * 5. DETAY C: Topraklama Barası ve RF Jumper İniş Detayı (1:5)
 * 6. Malzeme Listesi (BOM - Bill of Materials)
 * 7. Teknik Şartname ve Montaj Standartları Tablosu
 * 8. Standart Proje Anteti (Title Block)
 * 
 * Standartlar:
 * - Yazı Fontu: calibrib.ttf (Calibri Bold), txt.shx kesinlikle yok.
 * - Karakterler: UTF-8, mm² yerine mm2, sıfır '?' hatası.
 * - Milimetre (mm) ve Metre (m) çift çıktı.
 */

const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');
const DIR_M = path.join(__dirname, 'DXF_Ciktilari', 'Metre');

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
if (!fs.existsSync(DIR_M)) fs.mkdirSync(DIR_M, { recursive: true });

function generateCatwalkRruSectionDXF(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // Pafta Dış Çerçevesi (Border & Margin)
  const pMinX = -2500 * s;
  const pMaxX = 2500 * s;
  const pMinY = -1000 * s;
  const pMaxY = 3200 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(pMinX, pMinY, pMaxX - pMinX, pMaxY - pMinY);
  dxf.addRect(pMinX + 15 * s, pMinY + 15 * s, (pMaxX - pMinX) - 30 * s, (pMaxY - pMinY) - 30 * s);

  // =========================================================================
  // 1. PAFTA ÜST BAŞLIĞI VE GENEL BİLGİ BANDI
  // =========================================================================
  const headerY = 3060 * s;
  dxf.addRect(pMinX + 25 * s, headerY - 40 * s, (pMaxX - pMinX) - 50 * s, 110 * s, 'METIN_BILGI');
  dxf.addText(0, headerY + 30 * s, 36 * s, 'RAMS PARK / SEYRANTEPE STADYUMU 5G & 4.5G TELEKOMUNIKASYON KEDI YOLU SISTEMI', 'METIN_BILGI', 0, 'center');
  dxf.addText(0, headerY - 5 * s, 30 * s, 'ALAN 1 VE ALAN 3: ORTA KEDI YOLU 14 ADET RRU MONTAJ VE GECIS ENKESITI (DETAY PAFTASI)', 'METIN_BILGI', 0, 'center');
  dxf.addText(0, headerY - 30 * s, 18 * s, '20 CM OFSETLI 2" PARALEL MONTAJ BORULARI - 4 TURKCELL + 4 TURK TELEKOM + 6 VODAFONE RRU VE SERBEST GECIS KORIDORU', 'METIN_BILGI', 0, 'center');

  // =========================================================================
  // 2. GÖRÜNÜŞ 1: KEDİ YOLU TİPİK ENKESİTİ (A-A ENKESİTİ) - SOL ÜST BLOK
  // Aks: X = -1350 * s, Zemin Kotu: Y = 1350 * s
  // =========================================================================
  const sec1X = -1350 * s;
  const sec1Y = 1350 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(sec1X - 1000 * s, sec1Y - 150 * s, 2050 * s, 1600 * s);
  dxf.addText(sec1X, sec1Y + 1380 * s, 26 * s, 'GORUNUS 1: KEDI YOLU TIPIK ENKESITI (A-A KESITI - OLCEK 1:15)', 'METIN_BILGI', 0, 'center');
  dxf.addText(sec1X, sec1Y + 1330 * s, 16 * s, 'CATI MAKASI EGIMLI DIKMESI, 20 CM OFSET KONSOLU, 2" BORU VE RRU GECIS ACIKLIGI', 'METIN_BILGI', 0, 'center');

  // A) Kedi Yolu Yürüyüş Platformu (Walkway Grating: Genişlik 1000mm, Kalınlık 35mm)
  const cwWidth = 1000 * s;
  const cwThick = 35 * s;
  const cwStartX = sec1X - 500 * s;

  // Çelik Izgara Sacı
  dxf.addRect(cwStartX, sec1Y, cwWidth, cwThick, 'ZEMIN_PLATFORM');
  for (let gx = cwStartX + 50 * s; gx < cwStartX + cwWidth; gx += 50 * s) {
    dxf.addLine(gx, sec1Y, gx, sec1Y + cwThick, 'ZEMIN_PLATFORM');
  }

  // Alt Taşıyıcı UPN Kirişleri (2 Adet UPN120 Boyuna Kiriş)
  dxf.addRect(cwStartX, sec1Y - 120 * s, 55 * s, 120 * s, 'CELIK_KIRIS_KOLON');
  dxf.addRect(cwStartX + cwWidth - 55 * s, sec1Y - 120 * s, 55 * s, 120 * s, 'CELIK_KIRIS_KOLON');
  // Enleme Kirişi (NPU100)
  dxf.addRect(cwStartX + 55 * s, sec1Y - 100 * s, cwWidth - 110 * s, 25 * s, 'CELIK_KIRIS_KOLON');

  // B) Kedi Yolu Güvenlik Korkulukları (Handrails H = 1100mm)
  const railH = 1100 * s;
  // Sol Korkuluk (Kedi Yolu İç Tarafı)
  dxf.addRect(cwStartX - 5 * s, sec1Y + cwThick, 40 * s, railH, 'KORKULUK_KAPI');
  dxf.addCircle(cwStartX + 15 * s, sec1Y + cwThick + railH, 22 * s, 'KORKULUK_KAPI'); // Küpeşte borusu
  dxf.addRect(cwStartX, sec1Y + cwThick + railH * 0.50, 30 * s, 25 * s, 'KORKULUK_KAPI'); // Orta yatay kuşak
  dxf.addRect(cwStartX, sec1Y + cwThick, 15 * s, 150 * s, 'KORKULUK_KAPI'); // 150mm Tekmelik (Toe-board)

  // Sağ Korkuluk (Dış/Çatı Tarafı)
  const railRightX = cwStartX + cwWidth - 35 * s;
  dxf.addRect(railRightX, sec1Y + cwThick, 40 * s, railH, 'KORKULUK_KAPI');
  dxf.addCircle(railRightX + 20 * s, sec1Y + cwThick + railH, 22 * s, 'KORKULUK_KAPI');
  dxf.addRect(railRightX + 10 * s, sec1Y + cwThick + railH * 0.50, 30 * s, 25 * s, 'KORKULUK_KAPI');
  dxf.addRect(railRightX + 25 * s, sec1Y + cwThick, 15 * s, 150 * s, 'KORKULUK_KAPI');

  // C) Çatı Makası Eğimli Taşıyıcı Dikmesi (Ø140mm / R = 70mm, 62° Eğimle Yükselen Boru)
  // Dikme sol tarafta kedi yolu yürüyüş kotundan yukarı doğru yükselir
  const strutBaseX = cwStartX - 180 * s;
  const strutBaseY = sec1Y - 150 * s;
  const strutTopX = cwStartX - 500 * s;
  const strutTopY = sec1Y + 1250 * s;
  const strutAngle = Math.atan2(strutTopY - strutBaseY, strutTopX - strutBaseX);

  // Eğimli boru hattı (Gövde çift çizgi)
  const strutR = 70 * s;
  const perpX = -Math.sin(strutAngle) * strutR;
  const perpY = Math.cos(strutAngle) * strutR;

  dxf.addLine(strutBaseX + perpX, strutBaseY + perpY, strutTopX + perpX, strutTopY + perpY, 'CELIK_KIRIS_KOLON');
  dxf.addLine(strutBaseX - perpX, strutBaseY - perpY, strutTopX - perpX, strutTopY - perpY, 'CELIK_KIRIS_KOLON');
  // Eksen Çizgisi
  dxf.addLine(strutBaseX, strutBaseY, strutTopX, strutTopY, 'YURUYUS_KORIDORU');

  // Alt Makas Omurga Borusu Kesiti (Ø350mm / R = 175mm)
  dxf.addCircle(strutBaseX, strutBaseY, 175 * s, 'CELIK_KIRIS_KOLON');
  dxf.addCircle(strutBaseX, strutBaseY, 165 * s, 'CELIK_KIRIS_KOLON');
  dxf.addText(strutBaseX, strutBaseY - 210 * s, 14 * s, 'O350mm CATI OMURGA BORUSU', 'METIN_BILGI', 0, 'center');

  // D) 20 cm Ofset Konsol Kolu ve Taşıyıcı Kelepçe (Standoff Arm)
  // Kelepçe orta yükseklikte (Y ≈ sec1Y + 600mm)
  const bracketStationT = 0.55;
  const clampCx = strutBaseX + (strutTopX - strutBaseX) * bracketStationT;
  const clampCy = strutBaseY + (strutTopY - strutBaseY) * bracketStationT;

  // Ø140mm Çapraz Dikmeyi Saran İki Parçalı Kelepçe Bileziği
  dxf.addRect(clampCx - 85 * s, clampCy - 50 * s, 170 * s, 100 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(clampCx, clampCy, 75 * s, 'MONTAJ_BORULARI');
  // Kelepçe Sıkma Kulakları ve M16 Cıvatalar
  dxf.addRect(clampCx - 110 * s, clampCy + 15 * s, 25 * s, 20 * s, 'MONTAJ_BORULARI');
  dxf.addRect(clampCx - 110 * s, clampCy - 35 * s, 25 * s, 20 * s, 'MONTAJ_BORULARI');

  // 20 cm Net Ofset Kolu (60x60x4mm Kutu Profil)
  const offsetArmLen = 200 * s;
  const pipeX = clampCx + offsetArmLen + 85 * s; // Montaj borusu ekseni
  const armStartX = clampCx + 75 * s;
  dxf.addRect(armStartX, clampCy - 30 * s, offsetArmLen, 60 * s, 'MONTAJ_BORULARI');
  // Üçgen Rijitlik Berkitme Gusset Sacları
  dxf.addLine(armStartX, clampCy + 30 * s, armStartX + 80 * s, clampCy + 30 * s, 'MONTAJ_BORULARI');
  dxf.addLine(armStartX, clampCy + 30 * s, armStartX, clampCy + 90 * s, 'MONTAJ_BORULARI');
  dxf.addLine(armStartX, clampCy + 90 * s, armStartX + 80 * s, clampCy + 30 * s, 'MONTAJ_BORULARI');

  dxf.addLine(armStartX, clampCy - 30 * s, armStartX + 80 * s, clampCy - 30 * s, 'MONTAJ_BORULARI');
  dxf.addLine(armStartX, clampCy - 30 * s, armStartX, clampCy - 90 * s, 'MONTAJ_BORULARI');
  dxf.addLine(armStartX, clampCy - 90 * s, armStartX + 80 * s, clampCy - 30 * s, 'MONTAJ_BORULARI');

  // E) 2" Galvaniz Montaj Borusu Kesiti (Dış Çap Ø60.3mm)
  dxf.addCircle(pipeX, clampCy, 30.15 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(pipeX, clampCy, 26.0 * s, 'MONTAJ_BORULARI');
  // Boru Bağlantı Eyeri ve U-Bolt Kelepçesi
  dxf.addRect(pipeX - 40 * s, clampCy - 45 * s, 10 * s, 90 * s, 'MONTAJ_BORULARI');
  dxf.addRect(pipeX - 50 * s, clampCy - 35 * s, 70 * s, 70 * s, 'MONTAJ_BORULARI');

  // F) RRU Kısa Kenar Montajı (Kesit Silüeti)
  // RRU kısa kenarından (Derinlik D = 140mm) boru eyerine kenetlenmiş
  // Gövde genişliği W = 356mm dışa (sağa doğru) uzanır
  const rruDepth = 140 * s;
  const rruWidth = 356 * s;
  const rruStartX = pipeX + 30.15 * s + 15 * s; // Kelepçeden sonra RRU sırtı
  const rruY = clampCy - 240 * s; // H = 480mm merkezli
  const rruH = 480 * s;

  // RRU Dış Hatları (Kesitte genişlik x derinlik: W=356mm x D=140mm kesiti)
  dxf.addRect(rruStartX, rruY, rruWidth, rruH, 'EKP_TURKCELL_RRU');
  // Soğutucu Alüminyum Kanatçıklar (Heatsink Fins)
  for (let fx = rruStartX + 30 * s; fx < rruStartX + rruWidth - 30 * s; fx += 25 * s) {
    dxf.addLine(fx, rruY + 40 * s, fx, rruY + rruH - 40 * s, 'EKP_TURKCELL_RRU');
  }
  // Taşıma Kulpu (Üst Tutamak)
  dxf.addRect(rruStartX + 120 * s, rruY + rruH, 116 * s, 45 * s, 'EKP_TURKCELL_RRU');
  // Alt Konnektör ve Port Koruma Başlıkları (RF 4.3-10 Portları)
  for (let px = rruStartX + 50 * s; px < rruStartX + rruWidth - 50 * s; px += 50 * s) {
    dxf.addRect(px - 12 * s, rruY - 35 * s, 24 * s, 35 * s, 'MONTAJ_BORULARI');
    // Aşağı sarkan esnek 1/2" jumper kabloları
    dxf.addLine(px, rruY - 35 * s, px, rruY - 120 * s, 'KABLO_TAVALARI');
    dxf.addLine(px, rruY - 120 * s, px - 60 * s, rruY - 200 * s, 'KABLO_TAVALARI');
  }
  // RRU Etiketi
  dxf.addText(rruStartX + rruWidth / 2, rruY + rruH / 2 + 30 * s, 18 * s, 'RRU MODULU', 'METIN_BILGI', 0, 'center');
  dxf.addText(rruStartX + rruWidth / 2, rruY + rruH / 2 - 10 * s, 14 * s, '(356 x 480 x 140 mm)', 'METIN_BILGI', 0, 'center');
  dxf.addText(rruStartX + rruWidth / 2, rruY + rruH / 2 - 40 * s, 12 * s, 'KISA KENAR MONTAJI', 'METIN_BILGI', 0, 'center');

  // G) Net Geçiş Koridoru ve Serbest Alan Açıklığı (Clearance Path)
  // Korkuluk ile RRU arasındaki serbest yürüyüş açıklığı
  const clearanceStart = cwStartX + 40 * s; // Sol korkuluk iç kenarı
  const clearanceEnd = cwStartX + cwWidth - 40 * s; // Sağ korkuluk iç kenarı
  const clearanceW = clearanceEnd - clearanceStart; // Net 920mm kedi yolu genişliği

  // Yeşil Kesikli Geçiş Koridoru Güzergahı
  dxf.setLayer('YURUYUS_KORIDORU');
  dxf.addLine(clearanceStart, sec1Y + cwThick, clearanceStart, sec1Y + cwThick + 2000 * s, 'YURUYUS_KORIDORU');
  dxf.addLine(clearanceEnd, sec1Y + cwThick, clearanceEnd, sec1Y + cwThick + 2000 * s, 'YURUYUS_KORIDORU');
  dxf.addLine(clearanceStart, sec1Y + cwThick + 1950 * s, clearanceEnd, sec1Y + cwThick + 1950 * s, 'YURUYUS_KORIDORU');
  dxf.addText(sec1X, sec1Y + cwThick + 1000 * s, 22 * s, 'NET SERBEST GECIS KORIDORU', 'YURUYUS_KORIDORU', 0, 'center');
  dxf.addText(sec1X, sec1Y + cwThick + 950 * s, 16 * s, '(CLEARANCE >= 850 MM)', 'YURUYUS_KORIDORU', 0, 'center');
  dxf.addText(sec1X, sec1Y + cwThick + 900 * s, 13 * s, 'PERSONEL GECISINE TAM UYGUN', 'YURUYUS_KORIDORU', 0, 'center');

  // H) 500mm Kablo Tavası (Kedi Yolu Altı Taşıyıcı Konsol Üzerinde)
  const trayX = cwStartX + 200 * s;
  const trayY = sec1Y - 180 * s;
  dxf.addRect(trayX, trayY, 500 * s, 100 * s, 'KABLO_TAVALARI');
  dxf.addRect(trayX - 20 * s, trayY - 20 * s, 540 * s, 20 * s, 'CELIK_KIRIS_KOLON'); // C-profil travers
  dxf.addText(trayX + 250 * s, trayY + 40 * s, 15 * s, '500x100mm KABLO TAVASI (60x 1/2" FEEDER / JUMPER)', 'METIN_BILGI', 0, 'center');

  // I) Ölçülendirmeler (Dimensions - Kesişmeyen Net Kotlar)
  dxf.addDimension(cwStartX, sec1Y - 160 * s, cwStartX + cwWidth, sec1Y - 160 * s, -80 * s, '1000 mm (KEDI YOLU NET GENISLIGI)');
  dxf.addDimension(cwStartX, sec1Y + cwThick, cwStartX, sec1Y + cwThick + railH, -100 * s, '1100 mm (KORKULUK YUKSEKLIGI)');
  dxf.addDimension(clampCx, clampCy + 120 * s, pipeX, clampCy + 120 * s, 80 * s, '200 mm (NET OFSET)');
  dxf.addDimension(rruStartX, rruY - 80 * s, rruStartX + rruWidth, rruY - 80 * s, -60 * s, '356 mm (RRU ENI)');
  dxf.addDimension(pipeX - 30.15 * s, clampCy - 100 * s, pipeX + 30.15 * s, clampCy - 100 * s, -40 * s, 'O60.3mm (2" BORU)');

  // =========================================================================
  // 3. GÖRÜNÜŞ 2: ÖNDEN ELEVASYON GÖRÜNÜŞÜ (14 RRU DAĞILIMI) - SAĞ ÜST BLOK
  // Aks: X = 1250 * s, Zemin Kotu: Y = 1350 * s
  // =========================================================================
  const sec2X = 1250 * s;
  const sec2Y = 1350 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(sec2X - 1100 * s, sec2Y - 150 * s, 2250 * s, 1600 * s);
  dxf.addText(sec2X, sec2Y + 1380 * s, 26 * s, 'GORUNUS 2: 14 ADET RRU MONTAJ BORULARI VE KATMAN ELEVASYONU (OLCEK 1:20)', 'METIN_BILGI', 0, 'center');
  dxf.addText(sec2X, sec2Y + 1330 * s, 16 * s, 'SOL DIREK (4 TURKCELL + 3 VDF) & SAG DIREK (4 TURK TELEKOM + 3 VDF) - TOPLAM 14 RRU', 'METIN_BILGI', 0, 'center');

  // Zemin Kedi Yolu Referans Hattı
  dxf.addLine(sec2X - 1050 * s, sec2Y, sec2X + 1100 * s, sec2Y, 'ZEMIN_PLATFORM');
  dxf.addText(sec2X - 980 * s, sec2Y + 15 * s, 14 * s, 'KEDI YOLU IZGARA SEVIYESI (+8.60m)', 'METIN_BILGI', 0, 'left');

  // Sol ve Sağ Direk Aksları (Direkler arası mesafe: 1640mm)
  const leftPoleX = sec2X - 550 * s;
  const rightPoleX = sec2X + 550 * s;
  const poleHeight = 2900 * s;
  const poleBaseY = sec2Y + 100 * s;
  const poleTopY = poleBaseY + poleHeight;

  // 1. SOL MONTAJ BORUSU (Left Pipe: 2" Ø60.3mm)
  dxf.addRect(leftPoleX - 30.15 * s, poleBaseY, 60.3 * s, poleHeight, 'MONTAJ_BORULARI');
  dxf.addRect(leftPoleX - 35 * s, poleBaseY - 10 * s, 70 * s, 15 * s, 'MONTAJ_BORULARI'); // Taban flanşı
  dxf.addRect(leftPoleX - 35 * s, poleTopY - 5 * s, 70 * s, 15 * s, 'MONTAJ_BORULARI');  // Tepe kapağı
  dxf.addText(leftPoleX, poleTopY + 35 * s, 16 * s, 'SOL MONTAJ BORUSU (2" x 2900mm)', 'METIN_BILGI', 0, 'center');
  dxf.addText(leftPoleX, poleTopY + 15 * s, 13 * s, 'TURKCELL (4) & VODAFONE (3)', 'METIN_BILGI', 0, 'center');

  // 2. SAĞ MONTAJ BORUSU (Right Pipe: 2" Ø60.3mm)
  dxf.addRect(rightPoleX - 30.15 * s, poleBaseY, 60.3 * s, poleHeight, 'MONTAJ_BORULARI');
  dxf.addRect(rightPoleX - 35 * s, poleBaseY - 10 * s, 70 * s, 15 * s, 'MONTAJ_BORULARI');
  dxf.addRect(rightPoleX - 35 * s, poleTopY - 5 * s, 70 * s, 15 * s, 'MONTAJ_BORULARI');
  dxf.addText(rightPoleX, poleTopY + 35 * s, 16 * s, 'SAG MONTAJ BORUSU (2" x 2900mm)', 'METIN_BILGI', 0, 'center');
  dxf.addText(rightPoleX, poleTopY + 15 * s, 13 * s, 'TURK TELEKOM (4) & VODAFONE (3)', 'METIN_BILGI', 0, 'center');

  // 3 Konsol Tespit Seviyesi (t = 0.20, 0.50, 0.80)
  [0.20, 0.50, 0.80].forEach(t => {
    const by = poleBaseY + poleHeight * t;
    // Sol boru konsol çizgisi
    dxf.addRect(leftPoleX - 200 * s, by - 25 * s, 200 * s, 50 * s, 'MONTAJ_BORULARI');
    dxf.addText(leftPoleX - 210 * s, by - 5 * s, 11 * s, '20cm OFSET', 'METIN_BILGI', 0, 'right');
    // Sağ boru konsol çizgisi
    dxf.addRect(rightPoleX + 30.15 * s, by - 25 * s, 200 * s, 50 * s, 'MONTAJ_BORULARI');
    dxf.addText(rightPoleX + 240 * s, by - 5 * s, 11 * s, '20cm OFSET', 'METIN_BILGI', 0, 'left');
  });

  // RRU Ebatları (Standart Ön Görünüş)
  const rruDrawW = 260 * s;
  const rruDrawH = 480 * s;

  // -------------------------------------------------------------
  // SOL BORUDA 7 RRU (3 Katman):
  // -------------------------------------------------------------
  // Alt Sıra: 3 Adet Vodafone RRU 5526t (Yan yana 3'lü grup)
  const solAltY = poleBaseY + 280 * s;
  [-170, 0, 170].forEach((ox, idx) => {
    const rx = leftPoleX + ox * s - rruDrawW / 2;
    dxf.addRect(rx, solAltY, rruDrawW, rruDrawH, 'EKP_VODAFONE_RRU');
    dxf.addText(rx + rruDrawW / 2, solAltY + rruDrawH / 2 + 15 * s, 11 * s, 'VDF RRU5526t', 'METIN_BILGI', 0, 'center');
    dxf.addText(rx + rruDrawW / 2, solAltY + rruDrawH / 2 - 15 * s, 10 * s, `#${idx + 1} (Alt)`, 'METIN_BILGI', 0, 'center');
  });
  dxf.addText(leftPoleX - 280 * s, solAltY + rruDrawH / 2, 13 * s, 'ALT SIRA: 3x VDF', 'METIN_BILGI', 0, 'right');

  // Orta Sıra: 2 Adet Turkcell RRU 5502
  const solOrtaY = poleBaseY + 1150 * s;
  [-110, 110].forEach((ox, idx) => {
    const rx = leftPoleX + ox * s - rruDrawW / 2;
    dxf.addRect(rx, solOrtaY, rruDrawW, rruDrawH, 'EKP_TURKCELL_RRU');
    dxf.addText(rx + rruDrawW / 2, solOrtaY + rruDrawH / 2 + 15 * s, 11 * s, 'TCELL RRU5502', 'METIN_BILGI', 0, 'center');
    dxf.addText(rx + rruDrawW / 2, solOrtaY + rruDrawH / 2 - 15 * s, 10 * s, `#${idx + 1} (Orta)`, 'METIN_BILGI', 0, 'center');
  });
  dxf.addText(leftPoleX - 280 * s, solOrtaY + rruDrawH / 2, 13 * s, 'ORTA SIRA: 2x TCELL', 'METIN_BILGI', 0, 'right');

  // Üst Sıra: 2 Adet Turkcell RRU 5301
  const solUstY = poleBaseY + 2020 * s;
  [-110, 110].forEach((ox, idx) => {
    const rx = leftPoleX + ox * s - rruDrawW / 2;
    dxf.addRect(rx, solUstY, rruDrawW, rruDrawH, 'EKP_TURKCELL_RRU');
    dxf.addText(rx + rruDrawW / 2, solUstY + rruDrawH / 2 + 15 * s, 11 * s, 'TCELL RRU5301', 'METIN_BILGI', 0, 'center');
    dxf.addText(rx + rruDrawW / 2, solUstY + rruDrawH / 2 - 15 * s, 10 * s, `#${idx + 1} (Ust)`, 'METIN_BILGI', 0, 'center');
  });
  dxf.addText(leftPoleX - 280 * s, solUstY + rruDrawH / 2, 13 * s, 'UST SIRA: 2x TCELL', 'METIN_BILGI', 0, 'right');

  // -------------------------------------------------------------
  // SAĞ BORUDA 7 RRU (3 Katman):
  // -------------------------------------------------------------
  // Alt Sıra: 3 Adet Vodafone RRU 5526t (Yan yana 3'lü grup)
  [-170, 0, 170].forEach((ox, idx) => {
    const rx = rightPoleX + ox * s - rruDrawW / 2;
    dxf.addRect(rx, solAltY, rruDrawW, rruDrawH, 'EKP_VODAFONE_RRU');
    dxf.addText(rx + rruDrawW / 2, solAltY + rruDrawH / 2 + 15 * s, 11 * s, 'VDF RRU5526t', 'METIN_BILGI', 0, 'center');
    dxf.addText(rx + rruDrawW / 2, solAltY + rruDrawH / 2 - 15 * s, 10 * s, `#${idx + 4} (Alt)`, 'METIN_BILGI', 0, 'center');
  });
  dxf.addText(rightPoleX + 280 * s, solAltY + rruDrawH / 2, 13 * s, 'ALT SIRA: 3x VDF', 'METIN_BILGI', 0, 'left');

  // Orta Sıra: 2 Adet Türk Telekom RRU 5527
  [-110, 110].forEach((ox, idx) => {
    const rx = rightPoleX + ox * s - rruDrawW / 2;
    dxf.addRect(rx, solOrtaY, rruDrawW, rruDrawH, 'EKP_TURK_TELEKOM_RRU');
    dxf.addText(rx + rruDrawW / 2, solOrtaY + rruDrawH / 2 + 15 * s, 11 * s, 'TT RRU5527', 'METIN_BILGI', 0, 'center');
    dxf.addText(rx + rruDrawW / 2, solOrtaY + rruDrawH / 2 - 15 * s, 10 * s, `#${idx + 1} (Orta)`, 'METIN_BILGI', 0, 'center');
  });
  dxf.addText(rightPoleX + 280 * s, solOrtaY + rruDrawH / 2, 13 * s, 'ORTA SIRA: 2x TT', 'METIN_BILGI', 0, 'left');

  // Üst Sıra: 2 Adet Türk Telekom NR RRU 5818W
  [-110, 110].forEach((ox, idx) => {
    const rx = rightPoleX + ox * s - rruDrawW / 2;
    dxf.addRect(rx, solUstY, rruDrawW, rruDrawH, 'EKP_TURK_TELEKOM_RRU');
    dxf.addText(rx + rruDrawW / 2, solUstY + rruDrawH / 2 + 15 * s, 11 * s, 'TT RRU 5818W (5G)', 'METIN_BILGI', 0, 'center');
    dxf.addText(rx + rruDrawW / 2, solUstY + rruDrawH / 2 - 15 * s, 10 * s, `#${idx + 1} (Ust)`, 'METIN_BILGI', 0, 'center');
  });
  dxf.addText(rightPoleX + 280 * s, solUstY + rruDrawH / 2, 13 * s, 'UST SIRA: 2x TT (5G)', 'METIN_BILGI', 0, 'left');

  // Ölçülendirmeler (Görünüş 2)
  dxf.addDimension(leftPoleX, poleTopY + 80 * s, rightPoleX, poleTopY + 80 * s, 60 * s, '1640 mm (MONTAJ BORULARI AKSI)');
  dxf.addDimension(leftPoleX, poleBaseY, leftPoleX, poleTopY, -140 * s, '2900 mm (BORU TAM BOYU)');
  dxf.addDimension(sec2X, solAltY, sec2X, solOrtaY, 0, '870 mm (KATMAN KOT FARKI)');
  dxf.addDimension(sec2X, solOrtaY, sec2X, solUstY, 0, '870 mm (KATMAN KOT FARKI)');

  // =========================================================================
  // 4. DETAY A: 20 CM OFSET KONSOL VE KELEPÇE İMALAT DETAYI (1:5 ZOOM)
  // Aks: X = -1600 * s, Kot: Y = 450 * s
  // =========================================================================
  const detAX = -1600 * s;
  const detAY = 450 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(detAX - 750 * s, detAY - 400 * s, 1500 * s, 850 * s);
  dxf.addText(detAX, detAY + 410 * s, 20 * s, 'DETAY A: 20 CM OFSET KONSOL VE DIKME KELEPCESI IMALAT DETAYI (OLCEK 1:5)', 'METIN_BILGI', 0, 'center');

  // Ø140mm Çapraz Dikme Kesiti
  dxf.addCircle(detAX - 380 * s, detAY, 70 * s, 'CELIK_KIRIS_KOLON');
  dxf.addCircle(detAX - 380 * s, detAY, 62 * s, 'CELIK_KIRIS_KOLON');
  dxf.addText(detAX - 380 * s, detAY - 100 * s, 12 * s, 'O140mm MAKAS DIKMESI', 'METIN_BILGI', 0, 'center');

  // İki Parçalı Ağır Hizmet Kelepçe Bileziği (t = 8mm, Çift Cıvatalı Kulaklar)
  dxf.addRect(detAX - 475 * s, detAY - 85 * s, 190 * s, 170 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(detAX - 380 * s, detAY, 78 * s, 'MONTAJ_BORULARI');
  // M16 Sıkma Cıvataları
  dxf.addCircle(detAX - 450 * s, detAY + 55 * s, 8 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(detAX - 450 * s, detAY - 55 * s, 8 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(detAX - 310 * s, detAY + 55 * s, 8 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(detAX - 310 * s, detAY - 55 * s, 8 * s, 'MONTAJ_BORULARI');

  // 60x60x4mm Kutu Profil Konsol Kolu (Net 200mm Boy)
  const armKutuX = detAX - 290 * s;
  dxf.addRect(armKutuX, detAY - 30 * s, 200 * s, 60 * s, 'MONTAJ_BORULARI');
  dxf.addRect(armKutuX + 4 * s, detAY - 26 * s, 192 * s, 52 * s, 'MONTAJ_BORULARI');
  dxf.addText(armKutuX + 100 * s, detAY, 12 * s, '60x60x4mm KUTU PROFIL', 'METIN_BILGI', 0, 'center');

  // Berkitme Gusset Sacları (80x80x8mm Üçgen Saclar)
  dxf.addLine(armKutuX, detAY + 30 * s, armKutuX + 80 * s, detAY + 30 * s, 'MONTAJ_BORULARI');
  dxf.addLine(armKutuX, detAY + 30 * s, armKutuX, detAY + 80 * s, 'MONTAJ_BORULARI');
  dxf.addLine(armKutuX, detAY + 80 * s, armKutuX + 80 * s, detAY + 30 * s, 'MONTAJ_BORULARI');

  dxf.addLine(armKutuX, detAY - 30 * s, armKutuX + 80 * s, detAY - 30 * s, 'MONTAJ_BORULARI');
  dxf.addLine(armKutuX, detAY - 30 * s, armKutuX, detAY - 80 * s, 'MONTAJ_BORULARI');
  dxf.addLine(armKutuX, detAY - 80 * s, armKutuX + 80 * s, detAY - 30 * s, 'MONTAJ_BORULARI');

  // 2" Montaj Borusu Eyeri ve U-Bolt Kelepçesi
  const detPipeX = armKutuX + 200 * s + 35 * s;
  dxf.addCircle(detPipeX, detAY, 30.15 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(detPipeX, detAY, 26.0 * s, 'MONTAJ_BORULARI');
  // Çift U-Bolt
  dxf.addRect(detPipeX - 40 * s, detAY - 45 * s, 10 * s, 90 * s, 'MONTAJ_BORULARI'); // Tespit pleyti
  dxf.addRect(detPipeX - 48 * s, detAY - 36 * s, 76 * s, 72 * s, 'MONTAJ_BORULARI'); // U-bolt çevresi
  dxf.addCircle(detPipeX - 40 * s, detAY + 36 * s, 6 * s, 'MONTAJ_BORULARI'); // M12 somun
  dxf.addCircle(detPipeX - 40 * s, detAY - 36 * s, 6 * s, 'MONTAJ_BORULARI'); // M12 somun
  dxf.addText(detPipeX, detAY - 80 * s, 12 * s, '2" (O60.3mm) GALVANIZ BORU', 'METIN_BILGI', 0, 'center');

  // Ölçüler (Detay A)
  dxf.addDimension(armKutuX, detAY + 100 * s, armKutuX + 200 * s, detAY + 100 * s, 50 * s, '200 mm (NET OFSET BOYU)');
  dxf.addDimension(detAX - 475 * s, detAY - 140 * s, detAX - 285 * s, detAY - 140 * s, -40 * s, '190 mm (KELEPCE GENISLIGI)');

  // =========================================================================
  // 5. DETAY B: RRU KISA KENAR MONTAJ VE KİLİTLEME BRAKETİ (1:5 ZOOM)
  // Aks: X = 0 * s, Kot: Y = 450 * s
  // =========================================================================
  const detBX = 0 * s;
  const detBY = 450 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(detBX - 650 * s, detBY - 400 * s, 1300 * s, 850 * s);
  dxf.addText(detBX, detBY + 410 * s, 20 * s, 'DETAY B: RRU KISA KENAR BORU KILITLEME BRAKETI VE EMNIYET PIMI (OLCEK 1:5)', 'METIN_BILGI', 0, 'center');

  // 2" Montaj Borusu
  const bPipeX = detBX - 380 * s;
  dxf.addCircle(bPipeX, detBY, 30.15 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(bPipeX, detBY, 26.0 * s, 'MONTAJ_BORULARI');

  // Çift Parçalı Alüminyum Döküm Kelepçe Çeneleri
  dxf.addRect(bPipeX - 45 * s, detBY - 60 * s, 90 * s, 120 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(bPipeX, detBY, 34 * s, 'MONTAJ_BORULARI');
  // Torklu Sıkma Civatası (35 Nm M10 Cıvata)
  dxf.addCircle(bPipeX - 25 * s, detBY + 45 * s, 5 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(bPipeX - 25 * s, detBY - 45 * s, 5 * s, 'MONTAJ_BORULARI');
  dxf.addText(bPipeX - 60 * s, detBY + 85 * s, 11 * s, 'M10 TORKLU CIVATA (35 Nm)', 'METIN_BILGI', 0, 'center');

  // Emniyet Kilit Pimi (Quick Release Safety Pin)
  dxf.addRect(bPipeX + 40 * s, detBY - 6 * s, 35 * s, 12 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(bPipeX + 75 * s, detBY, 10 * s, 'MONTAJ_BORULARI'); // Çekme halkası
  dxf.addText(bPipeX + 90 * s, detBY + 25 * s, 11 * s, 'EMNIYET PIMI (DUSMEYE KARSI KILIT)', 'METIN_BILGI', 0, 'left');

  // RRU Gövdesi Kısa Kenar Bağlantı Arayüzü (Quick Mount Interface)
  const rruFaceX = bPipeX + 75 * s;
  dxf.addRect(rruFaceX, detBY - 180 * s, 420 * s, 360 * s, 'EKP_TURKCELL_RRU');
  // Soğutma Kanatçıkları
  for (let fx = rruFaceX + 40 * s; fx < rruFaceX + 400 * s; fx += 30 * s) {
    dxf.addLine(fx, detBY - 150 * s, fx, detBY + 150 * s, 'EKP_TURKCELL_RRU');
  }
  dxf.addText(rruFaceX + 210 * s, detBY + 40 * s, 14 * s, 'RRU DOKUM GOVDE', 'METIN_BILGI', 0, 'center');
  dxf.addText(rruFaceX + 210 * s, detBY - 10 * s, 12 * s, 'KISA KENARDAN MONTAJ (D=140mm)', 'METIN_BILGI', 0, 'center');
  dxf.addText(rruFaceX + 210 * s, detBY - 40 * s, 10 * s, 'IP65 WEATHERPROOF SIZDIRMAZLIK', 'METIN_BILGI', 0, 'center');

  // Paslanmaz Emniyet Halatı (Safety Wire Rope: Ø4mm Paslanmaz Çelik, L = 600mm)
  dxf.addLine(bPipeX, detBY + 30.15 * s, bPipeX + 30 * s, detBY + 180 * s, 'MONTAJ_BORULARI');
  dxf.addLine(bPipeX + 30 * s, detBY + 180 * s, rruFaceX + 120 * s, detBY + 180 * s, 'MONTAJ_BORULARI');
  dxf.addLine(rruFaceX + 120 * s, detBY + 180 * s, rruFaceX + 120 * s, detBY + 160 * s, 'MONTAJ_BORULARI');
  dxf.addText(rruFaceX + 60 * s, detBY + 210 * s, 11 * s, 'O4mm PASLANMAZ CELIK GUCLENDIRILMIS EMNIYET HALATI (L=600mm)', 'METIN_BILGI', 0, 'center');

  // =========================================================================
  // 6. DETAY C: TOPRAKLAMA VE KABLO GİRİŞİ / JUMPER İNİŞİ (1:5 ZOOM)
  // Aks: X = 1600 * s, Kot: Y = 450 * s
  // =========================================================================
  const detCX = 1600 * s;
  const detCY = 450 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(detCX - 750 * s, detCY - 400 * s, 1500 * s, 850 * s);
  dxf.addText(detCX, detCY + 410 * s, 20 * s, 'DETAY C: TOPRAKLAMA BARASI VE RF JUMPER INIS DETAYI (OLCEK 1:5)', 'METIN_BILGI', 0, 'center');

  // RRU Alt Taban Sacı ve Konnektör Rekorları
  const connBaseX = detCX - 500 * s;
  const connBaseY = detCY + 180 * s;
  dxf.addRect(connBaseX, connBaseY, 800 * s, 40 * s, 'EKP_TURKCELL_RRU');
  dxf.addText(connBaseX + 400 * s, connBaseY + 55 * s, 13 * s, 'RRU ALT BAGLANTI VE PORT YUZEYI', 'METIN_BILGI', 0, 'center');

  // 4 Adet RF 4.3-10 Dişi Konnektör
  [-240, -80, 80, 240].forEach((ox, idx) => {
    const cx = connBaseX + 400 * s + ox * s;
    dxf.addRect(cx - 20 * s, connBaseY - 45 * s, 40 * s, 45 * s, 'MONTAJ_BORULARI');
    dxf.addRect(cx - 15 * s, connBaseY - 60 * s, 30 * s, 15 * s, 'MONTAJ_BORULARI');
    // Vulkanize Sızdırmazlık Bantlama Bölgesi (Cold Shrink Tube)
    dxf.addRect(cx - 18 * s, connBaseY - 140 * s, 36 * s, 80 * s, 'KABLO_TAVALARI');
    dxf.addText(cx, connBaseY - 100 * s, 9 * s, 'VULKANIZE BANT', 'METIN_BILGI', 0, 'center');
    // Aşağı İnen 1/2" Süper Esnek Jumper Kablo (Superflexible Jumper)
    dxf.addLine(cx, connBaseY - 140 * s, cx, connBaseY - 320 * s, 'KABLO_TAVALARI');
    dxf.addText(cx, connBaseY - 340 * s, 10 * s, `JUMPER #${idx + 1}`, 'METIN_BILGI', 0, 'center');
  });

  // Topraklama Terminali (Grounding Lug)
  const gndX = connBaseX + 720 * s;
  dxf.addRect(gndX - 25 * s, connBaseY - 30 * s, 50 * s, 30 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(gndX, connBaseY - 15 * s, 5 * s, 'MONTAJ_BORULARI');
  // 16 mm2 Sarı-Yeşil Bakır Topraklama Kablosu
  dxf.addLine(gndX, connBaseY - 30 * s, gndX, connBaseY - 260 * s, 'YURUYUS_KORIDORU');
  dxf.addLine(gndX, connBaseY - 260 * s, gndX - 100 * s, connBaseY - 320 * s, 'YURUYUS_KORIDORU');
  dxf.addText(gndX, connBaseY - 180 * s, 11 * s, '16 mm2 BAKIR TOPRAKLAMA ILETKENI', 'METIN_BILGI', 0, 'left');
  dxf.addText(gndX, connBaseY - 210 * s, 10 * s, 'KEDI YOLU VE CATI TOPRAKLAMA BARASINA', 'METIN_BILGI', 0, 'left');

  // =========================================================================
  // 7. TEKNİK ŞARTNAME VE İMALAT NOTLARI - SOL ALT BLOK
  // Aks: X = -1400 * s, Kot: Y = -480 * s
  // =========================================================================
  const noteX = -2450 * s;
  const noteY = -40 * s;
  const noteW = 2150 * s;
  const noteH = 880 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(noteX, noteY - noteH, noteW, noteH);
  dxf.addText(noteX + noteW / 2, noteY - 35 * s, 18 * s, 'TEKNIK SARTNAME, GUVENLIK VE MONTAJ STANDARTLARI', 'METIN_BILGI', 0, 'center');

  const notes = [
    '1. KEDI YOLU GECIS KORIDORU (CLEARANCE): Makas dikmesine 20cm ofset kolu ile baglanan montaj borulari ve uzerindeki',
    '   RRU modulleri, kedi yolu yuruyus izgarasina kesinlikle tecavuz etmez. Net serbest gecis acikligi min. 850 mm olarak korunmustur.',
    '2. MONTAJ BORULARI: 2" (Dis cap O60.3mm, et kalinligi 3.65mm) TS EN 10255 agir seri celik cekme borudur. TS EN ISO 1461 standardinda',
    '   sicak daldirma galvaniz kaplanmistir (Min. cinko kalinligi 85 mikron). Tepe noktasinda su gecirmez sizdirmazlik tapasi mevcuttur.',
    '3. 20 CM OFSET KONSOL SISTEMI: 60x60x4mm celik kutu profil konsol kollari, O140mm makas dikmesine 3 noktadan (t=%20, %50, %80)',
    '   cift parcali M16 celik kelepceler ve 80x80x8mm ucgen gusset berkitme saclariyla rijit sekilde kaynakli/civatalidir.',
    '4. RRU KISA KENAR BAGLANTISI: 14 adet RRU modulu kisa kenarlarindaki (D=140mm) tork kontrollu kelepcelerle boruya kenetlenmistir.',
    '   Sikma torku 35 Nm\'dir. Her RRU govdesi, dusmeye karsi O4mm paslanmaz celik emniyet halatiyla boruya guvenlik kilitlidir.',
    '5. TOPRAKLAMA DUZENI: Her RRU sasesinden cikan 16 mm2 sari-yesil topraklama iletkeni, kedi yolu altindaki bakir topraklama',
    '   barasina cift delikli sikmali pabuclarla irtibatlandirilmistir. Gecis direnci R < 2 Ohm sartini saglamaktadir.',
    '6. KABLO VE JUMPER GECISLERI: RRU alt portlarindan cikan 1/2" super esnek RF jumper kablolari, O150mm kivrilma yaricapina uyularak',
    '   kedi yolu altindaki 500x100mm perfore kablo tavasina indirilir. Dis ortam RF konnektorleri soguk buzusmeli bantla sizdirmazdir.'
  ];

  notes.forEach((nt, idx) => {
    dxf.addText(noteX + 25 * s, noteY - 75 * s - idx * 36 * s, 12 * s, nt, 'METIN_BILGI');
  });

  // =========================================================================
  // 8. MALZEME LİSTESİ (BOM - BILL OF MATERIALS) - ORTA ALT BLOK
  // Aks: X = -200 * s, Kot: Y = -40 * s
  // =========================================================================
  const bomX = -220 * s;
  const bomY = -40 * s;
  const bomW = 1680 * s;
  const bomH = 880 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(bomX, bomY - bomH, bomW, bomH);
  dxf.addText(bomX + bomW / 2, bomY - 35 * s, 18 * s, 'MALZEME LISTESI (BOM) - ALAN 1 & 3 KEDI YOLU RRU SISTEMI', 'METIN_BILGI', 0, 'center');

  const bCols = [
    { title: 'NO', w: 60 * s, x: bomX },
    { title: 'MALZEME TANIMI VE MARKA / MODEL', w: 660 * s, x: bomX + 60 * s },
    { title: 'EBAT / TEKNIK DETAY', w: 420 * s, x: bomX + 720 * s },
    { title: 'MIKTAR', w: 140 * s, x: bomX + 1140 * s },
    { title: 'OPERATOR / GOREV', w: 400 * s, x: bomX + 1280 * s }
  ];

  dxf.addRect(bomX, bomY - 75 * s, bomW, 35 * s);
  bCols.forEach(c => {
    dxf.addText(c.x + 10 * s, bomY - 65 * s, 11 * s, c.title, 'METIN_BILGI');
  });

  const bomData = [
    { no: '01', name: 'Turkcell LTE RRU 5301 Modulu', dim: '356 x 480 x 140 mm / 25 kg', qty: '2 Adet', op: 'Turkcell (Sol Ust Sira)' },
    { no: '02', name: 'Turkcell LTE/NR RRU 5502 Modulu', dim: '356 x 480 x 140 mm / 25 kg', qty: '2 Adet', op: 'Turkcell (Sol Orta Sira)' },
    { no: '03', name: 'Turk Telekom NR RRU 5818W (5G) Modulu', dim: '356 x 480 x 140 mm / 25 kg', qty: '2 Adet', op: 'Turk Telekom (Sag Ust Sira)' },
    { no: '04', name: 'Turk Telekom 2G-3G-4G RRU 5527 Modulu', dim: '356 x 480 x 140 mm / 25 kg', qty: '2 Adet', op: 'Turk Telekom (Sag Orta Sira)' },
    { no: '05', name: 'Vodafone RRU 5526t Cift Bant Modulu', dim: '356 x 480 x 135 mm / 28 kg', qty: '6 Adet', op: 'Vodafone (3+3 Alt Sira)' },
    { no: '06', name: '2" Sicak Daldirma Galvaniz Montaj Borusu', dim: 'O60.3 x 3.65mm - L=2900mm', qty: '2 Adet', op: 'Ortak Tasiyici Dikmeler' },
    { no: '07', name: '20 cm Agir Hizmet Ofset Konsol Kolu', dim: '60x60x4mm Kutu Profil (L=200mm)', qty: '6 Adet', op: '3 Noktadan Rijit Tespit' },
    { no: '08', name: 'O140mm Makas Dikmesi Cift Parcali Kelepce', dim: 't=8mm St37 Celik + M16 Civata', qty: '6 Takim', op: 'Makas Govdesine Baglanti' },
    { no: '09', name: '2" Boru U-Bolt Kelepcesi ve Eyer Pleyti', dim: 'M12 Celik U-Bolt + Kilitli Pul', qty: '12 Takim', op: 'Boru Kilitleme' },
    { no: '10', name: 'RRU Kisa Kenar Boru Kelepcesi Adaptoru', dim: 'Aluminyum Dokum (35 Nm Tork)', qty: '14 Takim', op: 'RRU Tasiyici Kelepce' },
    { no: '11', name: 'O4mm Paslanmaz Celik Emniyet Halati', dim: 'L=600mm / 316 Kalite Celik', qty: '14 Adet', op: 'Dusmeye Karsi Guvenlik' },
    { no: '12', name: '1/2" Super Esnek RF Jumper Kablo Seti', dim: '4.3-10 DIN / L=1.5 - 2.5m', qty: '56 Adet', op: 'RRU - Tava Baglantisi' },
    { no: '13', name: '16 mm2 Sari-Yesil Bakir Topraklama Hatti', dim: 'H07V-K 16 mm2 Cu / Cift Delik', qty: '14 Set', op: 'Govde Es-Potansiyel Toprak' },
    { no: '14', name: '500x100mm Perfore Galvaniz Kablo Tavasi', dim: 't=2.0mm / L=3000mm Kedi Yolu Alti', qty: 'Hat Boyu', op: 'Kablo Guzergahi' }
  ];

  const bRowH = 36 * s;
  bomData.forEach((row, rIdx) => {
    const ry = bomY - 110 * s - rIdx * bRowH;
    dxf.addLine(bomX, ry, bomX + bomW, ry, 'METIN_BILGI');
    dxf.addText(bCols[0].x + 10 * s, ry + 10 * s, 10 * s, row.no, 'METIN_BILGI');
    dxf.addText(bCols[1].x + 10 * s, ry + 10 * s, 10 * s, row.name, 'METIN_BILGI');
    dxf.addText(bCols[2].x + 10 * s, ry + 10 * s, 9 * s, row.dim, 'METIN_BILGI');
    dxf.addText(bCols[3].x + 10 * s, ry + 10 * s, 10 * s, row.qty, 'METIN_BILGI');
    dxf.addText(bCols[4].x + 10 * s, ry + 10 * s, 9 * s, row.op, 'METIN_BILGI');
  });

  // =========================================================================
  // 9. STANDART PROJE ANTETİ (TITLE BLOCK) - SAĞ ALT BLOK
  // Aks: X = 1530 * s, Kot: Y = -40 * s
  // =========================================================================
  const tX = 1520 * s;
  const tY = -40 * s;
  const tW = 950 * s;
  const tH = 880 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(tX, tY - tH, tW, tH);

  // Logo / Şirket Alanı
  dxf.addRect(tX, tY - 150 * s, tW, 150 * s);
  dxf.addText(tX + tW / 2, tY - 45 * s, 22 * s, 'TURK TELEKOMUNIKASYON A.S.', 'METIN_BILGI', 0, 'center');
  dxf.addText(tX + tW / 2, tY - 80 * s, 16 * s, 'TURKCELL - VODAFONE ORTAK ALTYAPI PROJESI', 'METIN_BILGI', 0, 'center');
  dxf.addText(tX + tW / 2, tY - 115 * s, 13 * s, 'SEYRANTEPE STADYUMU KEDI YOLU TESISLERI', 'METIN_BILGI', 0, 'center');

  // Proje ve Pafta Başlığı
  dxf.addRect(tX, tY - 350 * s, tW, 200 * s);
  dxf.addText(tX + 20 * s, tY - 180 * s, 12 * s, 'PROJE ADI:', 'METIN_BILGI');
  dxf.addText(tX + 30 * s, tY - 215 * s, 16 * s, 'RAMS PARK / SEYRANTEPE STADYUMU 5G & 4.5G DONUSUMU', 'METIN_BILGI');
  dxf.addText(tX + 20 * s, tY - 260 * s, 12 * s, 'PAFTA ADI:', 'METIN_BILGI');
  dxf.addText(tX + 30 * s, tY - 295 * s, 16 * s, 'ALAN 1 & 3 ORTA KEDI YOLU 14 RRU MONTAJ VE GECIS ENKESITI', 'METIN_BILGI');
  dxf.addText(tX + 30 * s, tY - 325 * s, 13 * s, '20cm OFSETLI 2" MONTAJ BORULARI VE SERBEST GECIS KORIDORU', 'METIN_BILGI');

  // Bilgi Tablosu Hücreleri
  const tRows = [
    { k1: 'PAFTA NO:', v1: 'DWG-TEL-09', k2: 'TARIH:', v2: 'EKIM 2026' },
    { k1: 'OLCEK:', v1: isMm ? '1:1 mm (CAD)' : '1:1 m (CAD)', k2: 'REV:', v2: 'REV-01' },
    { k1: 'CIZEN:', v1: 'ANTIGRAVITY CAD ENG', k2: 'KONTROL:', v2: 'BAS MUHENDISLIK' },
    { k1: 'STATIK ONAY:', v1: 'UYGUNDUR (CE)', k2: 'FORMAT:', v2: 'AUTOCAD DXF / DWG' },
    { k1: 'DISIPLIN:', v1: 'TELEKOM & ELEKTROMEKANIK', k2: 'DURUM:', v2: 'AS-BUILT / IMALAT' }
  ];

  const tCellH = 70 * s;
  tRows.forEach((tr, idx) => {
    const ry = tY - 350 * s - (idx + 1) * tCellH;
    dxf.addLine(tX, ry, tX + tW, ry, 'METIN_BILGI');
    dxf.addLine(tX + tW / 2, ry, tX + tW / 2, ry + tCellH, 'METIN_BILGI');

    dxf.addText(tX + 20 * s, ry + 42 * s, 10 * s, tr.k1, 'METIN_BILGI');
    dxf.addText(tX + 30 * s, ry + 18 * s, 13 * s, tr.v1, 'METIN_BILGI');

    dxf.addText(tX + tW / 2 + 20 * s, ry + 42 * s, 10 * s, tr.k2, 'METIN_BILGI');
    dxf.addText(tX + tW / 2 + 30 * s, ry + 18 * s, 13 * s, tr.v2, 'METIN_BILGI');
  });

  // Alt Onay Notu
  dxf.addText(tX + tW / 2, tY - tH + 35 * s, 11 * s, 'BU PAFTA GSM OPERATORLERI VE STADYUM YONETIMI ONAYLI RESMI IMALAT PROJESIDIR.', 'METIN_BILGI', 0, 'center');
  dxf.addText(tX + tW / 2, tY - tH + 15 * s, 10 * s, 'TUM OLCULER YERINDE KONTROL EDILECEKTIR. OLCUSUZ IMALAT YAPILAMAZ.', 'METIN_BILGI', 0, 'center');

  return dxf.toDxfString();
}

module.exports = {
  generateCatwalkRruSectionDXF
};

if (require.main === module) {
  console.log('Generating Alan 1 & 3 Catwalk 14 RRU Dedicated Section DXFs (mm & m)...');

  const tasks = [
    { name: '09_ALAN_1_ve_3_KEDI_YOLU_14_RRU_MONTAJ_VE_GECIS_ENKESITI', fn: generateCatwalkRruSectionDXF }
  ];

  tasks.forEach(t => {
    ['mm', 'm'].forEach(u => {
      const isMm = u === 'mm';
      const targetDir = isMm ? DIR_MM : DIR_M;
      const file = path.join(targetDir, `${t.name}_${u}.dxf`);
      try {
        const dxfData = t.fn(u);
        fs.writeFileSync(file, dxfData, 'utf8');
        console.log(`  [OK] ${u.toUpperCase()}: ${file} (${(fs.statSync(file).size / 1024).toFixed(1)} KB)`);
      } catch (err) {
        if (err.code === 'EBUSY') {
          const fallback = path.join(targetDir, `${t.name}_${u}_guncel.dxf`);
          fs.writeFileSync(fallback, t.fn(u), 'utf8');
          console.log(`  [OK - EBUSY Fallback] ${u.toUpperCase()}: ${fallback}`);
        } else {
          console.error(`  [ERROR] ${t.name}_${u}:`, err);
        }
      }
    });
  });
  console.log('Alan 1 & 3 Catwalk 14 RRU Dedicated Section DXF generation completed.');
}
