/**
 * generate_alan2_scoreboard_alternatives_dxf.cjs
 * 
 * PAFTA 10: ALAN 2 SKORBOARD ARKASI KEDİ YOLU RRU VE POI YERLEŞİM KESİTLERİ (DETAY PAFTASI)
 * 
 * Kullanıcı İsteği:
 * "Alan 2 skorboard arkasındaki kesit dxf ssını çıkar sadece oradaki 2 alternatifi ayrı ayrı çiz poıler her ikisinde de olsun"
 * 
 * İçerik:
 * 1. BÖLÜM 1: ALTERNATİF 1 (Skorboard Arka Çelik Kafesine Montaj Düzeni)
 *    - Kesit 1-A: Tipik Enkesit (Yandan Kesit - Ölçek 1:20)
 *      Skorboard çeliği, 20 cm konsol, RRU yan kesiti, 200mm tava, geçiş köprü tavası,
 *      1200mm kedi yolu platformu, kedi yolundaki 30U/42U POI Rack kabini ve net yürüyüş açıklığı.
 *    - Görünüş 1-B: Önden Görünüş / Elevasyon (Ölçek 1:20)
 *      Skorboard arkası çelik dikmeleri, 7 adet RRU yan yana dizilimi (2 Turkcell + 2 TT + 3 Vodafone),
 *      alttaki 200mm kablo tavası, 20 adet feeder inişi, yanındaki POI Rack kabini.
 * 
 * 2. BÖLÜM 2: ALTERNATİF 2 (Mevcut Alt Kedi Yolu İçi Tablalı 4 Boru 7 RRU Bloğu)
 *    - Kesit 2-A: Tipik Enkesit (Yandan Kesit - Ölçek 1:20)
 *      Skorboard çeliği tamamen serbest/yüksüz, kedi yolu platformu, 850x550x25mm çelik montaj tablası,
 *      4 flanşlı montaj borusu, 2 katmanlı 7 RRU kümesi, tepedeki "Alternatif-2 (7 RRU)" etiketi,
 *      kedi yolundaki POI Rack kabini ve arkada kalan net 650mm servis/yürüyüş koridoru.
 *    - Görünüş 2-B: Önden Görünüş / Elevasyon (Ölçek 1:20)
 *      850mm tabla, 4 adet düşey montaj borusu, alt sırada 4 RRU + üst sırada 3 RRU kümesi,
 *      tepedeki "ALTERNATIF-2" tabelası, yanındaki POI Rack kabini ve taban jumper kablo demeti.
 * 
 * 3. BÖLÜM 3: Karşılaştırmalı Mühendislik ve Uygulama Analiz Tablosu (Alternatif 1 vs Alternatif 2)
 * 4. BÖLÜM 4: İmalat Detayları (Detay D-1: Tabla & Flanş Ankrajı; Detay D-2: POI Rack Feeder Girişi)
 * 5. BÖLÜM 5: Ekipman Listesi (BOM), Teknik Şartname Notları ve Proje Anteti (Title Block)
 * 
 * Standartlar:
 * - Autocad 2007+ (AC1021) uyumlu UTF-8 DWGCODEPAGE
 * - calibrib.ttf (Calibri Bold) yazı tipi
 * - Milimetre (mm) ve Metre (m) çift çıktı:
 *   DXF_Ciktilari/Milimetre/10_ALAN_2_SKORBOARD_ARKASI_KEDI_YOLU_RRU_VE_POI_ALTERNATIF_KESITLERI_mm.dxf
 *   DXF_Ciktilari/Metre/10_ALAN_2_SKORBOARD_ARKASI_KEDI_YOLU_RRU_VE_POI_ALTERNATIF_KESITLERI_m.dxf
 */

const fs = require('fs');
const path = require('path');
const { DxfBuilder } = require('./dxf_engine.cjs');

const DIR_MM = path.join(__dirname, 'DXF_Ciktilari', 'Milimetre');
const DIR_M = path.join(__dirname, 'DXF_Ciktilari', 'Metre');

if (!fs.existsSync(DIR_MM)) fs.mkdirSync(DIR_MM, { recursive: true });
if (!fs.existsSync(DIR_M)) fs.mkdirSync(DIR_M, { recursive: true });

function generateAlan2AlternativesDXF(units = 'mm') {
  const isMm = units === 'mm';
  const s = isMm ? 1 : 0.001;
  const dxf = new DxfBuilder(units);

  // Pafta Dış Çerçevesi (Border & Margins - A0/A1 Standart Format)
  const pMinX = -2600 * s;
  const pMaxX = 2600 * s;
  const pMinY = -1100 * s;
  const pMaxY = 3200 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(pMinX, pMinY, pMaxX - pMinX, pMaxY - pMinY);
  dxf.addRect(pMinX + 15 * s, pMinY + 15 * s, (pMaxX - pMinX) - 30 * s, (pMaxY - pMinY) - 30 * s);

  // =========================================================================
  // 1. PAFTA ÜST BAŞLIĞI VE GENEL BİLGİ BANDI
  // =========================================================================
  const headerY = 3060 * s;
  dxf.addRect(pMinX + 25 * s, headerY - 45 * s, (pMaxX - pMinX) - 50 * s, 115 * s, 'METIN_BILGI');
  dxf.addText(0, headerY + 32 * s, 34 * s, 'RAMS PARK / SEYRANTEPE STADYUMU 5G & 4.5G TELEKOMUNIKASYON KEDI YOLU SISTEMI', 'METIN_BILGI', 0, 'center');
  dxf.addText(0, headerY - 5 * s, 28 * s, 'ALAN 2: SKORBOARD ARKASI RRU VE POI YERLESIM KESITLERI (DETAY PAFTASI)', 'METIN_BILGI', 0, 'center');
  dxf.addText(0, headerY - 32 * s, 17 * s, 'ALTERNATIF 1 (SKORBOARD CELIGI MONTAJI) VE ALTERNATIF 2 (KEDI YOLU TABLALI MONTAJ) KARSILASTIRMALI ENKESITLERI', 'METIN_BILGI', 0, 'center');

  // =========================================================================
  // 2. BÖLÜM 1: ALTERNATİF 1 (SOL ÜST BLOK)
  // Aks: X = -1350 * s, Kot: Y = 1350 * s
  // =========================================================================
  const a1BoxX = -2550 * s;
  const a1BoxY = 1250 * s;
  const a1BoxW = 2500 * s;
  const a1BoxH = 1700 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(a1BoxX, a1BoxY, a1BoxW, a1BoxH);
  dxf.addRect(a1BoxX, a1BoxY + a1BoxH - 60 * s, a1BoxW, 60 * s);
  dxf.addText(a1BoxX + a1BoxW / 2, a1BoxY + a1BoxH - 38 * s, 22 * s, 'ALTERNATIF 1: SKORBOARD ARKA CELIK KAFESINE MONTAJ DUZENI (MEVCUT TASARIM)', 'METIN_BILGI', 0, 'center');
  dxf.addText(a1BoxX + a1BoxW / 2, a1BoxY + a1BoxH - 55 * s, 12 * s, 'SKORBOARD ARKA CELIK DIKMELERINDE 2 NOKTADA 7\'SER (TOPLAM 14) RRU + 20cm TAVA + KEDI YOLUNDA POI RACK KABINI', 'METIN_BILGI', 0, 'center');

  // -------------------------------------------------------------------------
  // 2.1. ALTERNATİF 1 - GÖRÜNÜŞ 1-A: TİPİK ENKESİT (YANDAN KESİT - ÖLÇEK 1:20)
  // Konum: X = a1BoxX + 100 * s ile a1BoxX + 1150 * s arası
  // -------------------------------------------------------------------------
  const s1BaseX = a1BoxX + 620 * s;
  const s1BaseY = a1BoxY + 120 * s;

  dxf.addText(s1BaseX, a1BoxY + a1BoxH - 95 * s, 18 * s, 'GORUNUS 1-A: TIPIK ENKESIT (YANDAN KESIT - OLCEK 1:20)', 'METIN_BILGI', 0, 'center');

  // A) Skorboard Arka Çelik Taşıyıcı Dikmesi (140x140mm Kutu Profil, Aks Z = -2200mm)
  const sbColX = s1BaseX - 450 * s;
  dxf.addRect(sbColX - 70 * s, s1BaseY, 140 * s, 1200 * s, 'CELIK_KIRIS_KOLON');
  dxf.addText(sbColX, s1BaseY + 1230 * s, 13 * s, 'SKORBOARD CELIK DIKMESI (140x140mm)', 'METIN_BILGI', 0, 'center');

  // Skorboard Çelik Kafes Çapraz Kirişleri
  dxf.addLine(sbColX - 70 * s, s1BaseY + 300 * s, sbColX - 200 * s, s1BaseY + 700 * s, 'CELIK_KIRIS_KOLON');
  dxf.addLine(sbColX - 70 * s, s1BaseY + 700 * s, sbColX - 200 * s, s1BaseY + 300 * s, 'CELIK_KIRIS_KOLON');
  dxf.addLine(sbColX - 70 * s, s1BaseY + 700 * s, sbColX - 200 * s, s1BaseY + 1100 * s, 'CELIK_KIRIS_KOLON');

  // B) Skorboard Çeliğinden Uzanan 20 cm Ofset Konsol Kolu (60x60mm)
  const arm1Y = s1BaseY + 680 * s;
  dxf.addRect(sbColX + 70 * s, arm1Y - 25 * s, 200 * s, 50 * s, 'MONTAJ_BORULARI');
  dxf.addText(sbColX + 170 * s, arm1Y + 35 * s, 10 * s, '20cm OFSET KONSOLU', 'METIN_BILGI', 0, 'center');

  // C) 2" (Ø60.3mm) Düşey Montaj Borusu
  const pipe1X = sbColX + 270 * s + 30 * s;
  dxf.addRect(pipe1X - 30 * s, s1BaseY + 200 * s, 60 * s, 950 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(pipe1X, s1BaseY + 1160 * s, 30 * s, 'MONTAJ_BORULARI');

  // D) RRU Yan Kesiti (480mm boy, 160mm derinlik, montaj kelepçesi)
  const rru1X = pipe1X + 30 * s;
  const rru1Y = s1BaseY + 450 * s;
  dxf.addRect(rru1X, rru1Y, 160 * s, 480 * s, 'EKP_TURKCELL_RRU');
  // Soğutma Kanatçıkları
  for (let ry = rru1Y + 30 * s; ry <= rru1Y + 450 * s; ry += 35 * s) {
    dxf.addLine(rru1X + 160 * s, ry, rru1X + 190 * s, ry, 'EKP_TURKCELL_RRU');
  }
  dxf.addText(rru1X + 80 * s, rru1Y + 240 * s, 14 * s, 'RRU MODULU', 'METIN_BILGI', 0, 'center');
  dxf.addText(rru1X + 80 * s, rru1Y + 200 * s, 11 * s, '(CELIGE MONTAJ)', 'METIN_BILGI', 0, 'center');

  // E) RRU Altı 200x60mm Kablo Tavası
  const tray1X = rru1X - 20 * s;
  const tray1Y = s1BaseY + 220 * s;
  dxf.addRect(tray1X, tray1Y, 200 * s, 60 * s, 'KABLO_TAVALARI');
  dxf.addText(tray1X + 100 * s, tray1Y - 25 * s, 11 * s, '200x60mm BOYUNA TAVA', 'METIN_BILGI', 0, 'center');

  // F) Kedi Yoluna Doğru Uzanan Enine Köprü Tavası (L = 1260mm)
  dxf.addRect(tray1X + 200 * s, tray1Y + 10 * s, 260 * s, 40 * s, 'KABLO_TAVALARI');
  dxf.addText(tray1X + 330 * s, tray1Y + 65 * s, 11 * s, 'ENINE KOPRU TAVASI', 'METIN_BILGI', 0, 'center');

  // G) Kedi Yolu Platformu (Genişlik 1200mm, Kalınlık 35mm, Yürüyüş Kotu Y = 0)
  const cw1StartX = s1BaseX + 150 * s;
  const cw1W = 1200 * s;
  const cw1Y = s1BaseY;

  // Izgara Taban Sacı
  dxf.addRect(cw1StartX, cw1Y, cw1W, 35 * s, 'ZEMIN_PLATFORM');
  for (let gx = cw1StartX + 60 * s; gx < cw1StartX + cw1W; gx += 60 * s) {
    dxf.addLine(gx, cw1Y, gx, cw1Y + 35 * s, 'ZEMIN_PLATFORM');
  }

  // Alt Taşıyıcı UPN120 Kirişleri
  dxf.addRect(cw1StartX, cw1Y - 120 * s, 60 * s, 120 * s, 'CELIK_KIRIS_KOLON');
  dxf.addRect(cw1StartX + cw1W - 60 * s, cw1Y - 120 * s, 60 * s, 120 * s, 'CELIK_KIRIS_KOLON');
  dxf.addRect(cw1StartX + 60 * s, cw1Y - 100 * s, cw1W - 120 * s, 25 * s, 'CELIK_KIRIS_KOLON');

  // Güvenlik Korkulukları (H = 1100mm)
  // Sol Korkuluk (İç Kenar)
  dxf.addRect(cw1StartX - 5 * s, cw1Y + 35 * s, 35 * s, 1100 * s, 'KORKULUK_KAPI');
  dxf.addCircle(cw1StartX + 12 * s, cw1Y + 35 * s + 1100 * s, 20 * s, 'KORKULUK_KAPI');
  dxf.addRect(cw1StartX, cw1Y + 35 * s + 550 * s, 25 * s, 20 * s, 'KORKULUK_KAPI');
  dxf.addRect(cw1StartX, cw1Y + 35 * s, 15 * s, 150 * s, 'KORKULUK_KAPI'); // Tekmelik

  // Sağ Korkuluk (Dış Kenar)
  const rRail1X = cw1StartX + cw1W - 30 * s;
  dxf.addRect(rRail1X, cw1Y + 35 * s, 35 * s, 1100 * s, 'KORKULUK_KAPI');
  dxf.addCircle(rRail1X + 18 * s, cw1Y + 35 * s + 1100 * s, 20 * s, 'KORKULUK_KAPI');
  dxf.addRect(rRail1X + 10 * s, cw1Y + 35 * s + 550 * s, 25 * s, 20 * s, 'KORKULUK_KAPI');
  dxf.addRect(rRail1X + 15 * s, cw1Y + 35 * s, 15 * s, 150 * s, 'KORKULUK_KAPI');

  // H) Kedi Yolu Üzerindeki POI Rack Kabini (Canovate 19" Outdoor Kabin: 600x800x1600mm)
  // Kullanıcı İsteği: "poıler her ikisinde de olsun"
  const poi1X = cw1StartX + 60 * s;
  const poi1W = 550 * s; // Enkesitte derinlik görünümü
  const poi1H = 1450 * s;
  const poi1Y = cw1Y + 35 * s;

  dxf.addRect(poi1X, poi1Y, poi1W, poi1H, 'EKP_POI_TASIYICI_SASE');
  dxf.addRect(poi1X + 25 * s, poi1Y + 25 * s, poi1W - 50 * s, poi1H - 50 * s, 'EKP_POI_TASIYICI_SASE');

  // POI Kabin İçi 4 Adet POI Modülü
  for (let pi = 0; pi < 4; pi++) {
    const modY = poi1Y + 200 * s + pi * 270 * s;
    dxf.addRect(poi1X + 45 * s, modY, poi1W - 90 * s, 200 * s, 'EKP_POI_MODULLERI');
    dxf.addText(poi1X + poi1W / 2, modY + 100 * s, 12 * s, `POI MODUL ${pi + 1}`, 'METIN_BILGI', 0, 'center');
    dxf.addCircle(poi1X + 80 * s, modY + 50 * s, 10 * s, 'EKP_POI_MODULLERI');
    dxf.addCircle(poi1X + 120 * s, modY + 50 * s, 10 * s, 'EKP_POI_MODULLERI');
  }
  dxf.addText(poi1X + poi1W / 2, poi1Y + poi1H + 35 * s, 14 * s, 'POI RACK KABINI (30U/42U)', 'METIN_BILGI', 0, 'center');

  // Net Yürüyüş Koridoru (POI Yanında Kalan 590mm Serbest Alan)
  const walk1StartX = poi1X + poi1W;
  const walk1W = cw1StartX + cw1W - walk1StartX;
  dxf.addRect(walk1StartX, cw1Y + 35 * s, walk1W, 1100 * s, 'YURUYUS_KORIDORU');
  dxf.addLine(walk1StartX + 10 * s, cw1Y + 500 * s, walk1StartX + walk1W - 10 * s, cw1Y + 500 * s, 'YURUYUS_KORIDORU');
  dxf.addText(walk1StartX + walk1W / 2, cw1Y + 550 * s, 13 * s, 'SERBEST GECIS', 'YURUYUS_KORIDORU', 0, 'center');
  dxf.addText(walk1StartX + walk1W / 2, cw1Y + 440 * s, 13 * s, 'KORIDORU (600mm)', 'YURUYUS_KORIDORU', 0, 'center');

  // Ölçüler (Görünüş 1-A)
  dxf.addDimension(cw1StartX, cw1Y - 180 * s, cw1StartX + cw1W, cw1Y - 180 * s, -60 * s, '1200 mm (KEDI YOLU ENI)');
  dxf.addDimension(poi1X, cw1Y - 80 * s, poi1X + poi1W, cw1Y - 80 * s, -40 * s, '550 mm (POI DERINLIK)');
  dxf.addDimension(walk1StartX, cw1Y - 80 * s, cw1StartX + cw1W, cw1Y - 80 * s, -40 * s, '600 mm (SERBEST GECIS)');
  dxf.addDimension(sbColX, s1BaseY + 1280 * s, pipe1X, s1BaseY + 1280 * s, 50 * s, '300 mm (OFSET)');
  dxf.addDimension(sbColX, s1BaseY + 1380 * s, cw1StartX, s1BaseY + 1380 * s, 60 * s, '600 mm (CELIK - KEDI YOLU ARASI)');

  // -------------------------------------------------------------------------
  // 2.2. ALTERNATİF 1 - GÖRÜNÜŞ 1-B: ÖNDEN GÖRÜNÜŞ / ELEVASYON (ÖLÇEK 1:20)
  // Konum: X = a1BoxX + 1280 * s ile a1BoxX + 2420 * s arası
  // -------------------------------------------------------------------------
  const e1BaseX = a1BoxX + 1320 * s;
  const e1BaseY = s1BaseY;

  dxf.addText(e1BaseX + 550 * s, a1BoxY + a1BoxH - 95 * s, 18 * s, 'GORUNUS 1-B: ONDEN GORUNUS / ELEVASYON (OLCEK 1:20)', 'METIN_BILGI', 0, 'center');

  // Skorboard Arka Yatay NPU Kirişleri
  dxf.addRect(e1BaseX, e1BaseY + 300 * s, 1100 * s, 80 * s, 'CELIK_KIRIS_KOLON');
  dxf.addRect(e1BaseX, e1BaseY + 950 * s, 1100 * s, 80 * s, 'CELIK_KIRIS_KOLON');

  // 7 Adet RRU Önden Dizilimi (2 Turkcell Mavi + 2 TT Camgöbeği + 3 Vodafone Kırmızı)
  const rruList1 = [
    { name: 'TCELL 1', op: 'Turkcell', w: 100, h: 480, layer: 'EKP_TURKCELL_RRU' },
    { name: 'TCELL 2', op: 'Turkcell', w: 100, h: 480, layer: 'EKP_TURKCELL_RRU' },
    { name: 'TT 1',    op: 'TT',       w: 95,  h: 460, layer: 'EKP_TURK_TELEKOM_RRU' },
    { name: 'TT 2',    op: 'TT',       w: 95,  h: 460, layer: 'EKP_TURK_TELEKOM_RRU' },
    { name: 'VDF 1',   op: 'Vodafone', w: 105, h: 470, layer: 'EKP_VODAFONE_RRU' },
    { name: 'VDF 2',   op: 'Vodafone', w: 105, h: 470, layer: 'EKP_VODAFONE_RRU' },
    { name: 'VDF 3',   op: 'Vodafone', w: 105, h: 470, layer: 'EKP_VODAFONE_RRU' }
  ];

  let curRx = e1BaseX + 30 * s;
  rruList1.forEach((r, idx) => {
    const rw = r.w * s;
    const rh = r.h * s;
    const ry = e1BaseY + 460 * s;

    // Düşey Montaj Borusu Parçası
    dxf.addRect(curRx + rw / 2 - 15 * s, e1BaseY + 320 * s, 30 * s, 700 * s, 'MONTAJ_BORULARI');
    // RRU Gövdesi
    dxf.addRect(curRx, ry, rw, rh, r.layer);
    dxf.addText(curRx + rw / 2, ry + rh / 2 + 15 * s, 11 * s, r.name, 'METIN_BILGI', 0, 'center');
    dxf.addText(curRx + rw / 2, ry + rh / 2 - 15 * s, 9 * s, 'RRU', 'METIN_BILGI', 0, 'center');

    // Alt Portlar ve Feeder Jumper Kabloları (2 veya 4 port)
    const portCount = (idx === 1 || idx === 3 || idx === 6) ? 4 : 2;
    for (let pi = 0; pi < portCount; pi++) {
      const px = curRx + rw * ((pi + 1) / (portCount + 1));
      dxf.addCircle(px, ry - 10 * s, 4 * s, 'KABLO_TAVALARI');
      dxf.addLine(px, ry - 10 * s, px, e1BaseY + 260 * s, 'KABLO_TAVALARI');
    }

    curRx += rw + 25 * s;
  });

  // Alttaki 200mm Boyuna Kablo Tavası (Önden Görünüş)
  const tray1W = curRx - e1BaseX;
  dxf.addRect(e1BaseX + 20 * s, e1BaseY + 220 * s, tray1W, 40 * s, 'KABLO_TAVALARI');
  dxf.addText(e1BaseX + tray1W / 2, e1BaseY + 235 * s, 11 * s, '200mm FEEDER KABLO TAVASI (20 ADET 1/2" JUMPER)', 'METIN_BILGI', 0, 'center');

  // Yan Taraftaki POI Rack Kabini (Önden Görünüş)
  const poi1FaceX = e1BaseX + 850 * s;
  const poi1FaceW = 220 * s;
  dxf.addRect(poi1FaceX, e1BaseY, poi1FaceW, 1450 * s, 'EKP_POI_TASIYICI_SASE');
  dxf.addRect(poi1FaceX + 15 * s, e1BaseY + 15 * s, poi1FaceW - 30 * s, 1420 * s, 'EKP_POI_TASIYICI_SASE');
  for (let pi = 0; pi < 4; pi++) {
    dxf.addRect(poi1FaceX + 25 * s, e1BaseY + 200 * s + pi * 270 * s, poi1FaceW - 50 * s, 180 * s, 'EKP_POI_MODULLERI');
    dxf.addText(poi1FaceX + poi1FaceW / 2, e1BaseY + 290 * s + pi * 270 * s, 11 * s, `POI ${pi + 1}`, 'METIN_BILGI', 0, 'center');
  }
  dxf.addText(poi1FaceX + poi1FaceW / 2, e1BaseY + 1480 * s, 13 * s, 'POI KABINI', 'METIN_BILGI', 0, 'center');

  // Ölçüler (Görünüş 1-B)
  dxf.addDimension(e1BaseX + 30 * s, e1BaseY + 1000 * s, curRx - 25 * s, e1BaseY + 1000 * s, 50 * s, '820 mm (7 RRU BLOK BOYU)');
  dxf.addDimension(poi1FaceX, e1BaseY - 60 * s, poi1FaceX + poi1FaceW, e1BaseY - 60 * s, -40 * s, '600 mm (POI ENI)');


  // =========================================================================
  // 3. BÖLÜM 2: ALTERNATİF 2 (SAĞ ÜST BLOK)
  // Aks: X = 1350 * s, Kot: Y = 1350 * s
  // =========================================================================
  const a2BoxX = 50 * s;
  const a2BoxY = 1250 * s;
  const a2BoxW = 2500 * s;
  const a2BoxH = 1700 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(a2BoxX, a2BoxY, a2BoxW, a2BoxH);
  dxf.addRect(a2BoxX, a2BoxY + a2BoxH - 60 * s, a2BoxW, 60 * s);
  dxf.addText(a2BoxX + a2BoxW / 2, a2BoxY + a2BoxH - 38 * s, 22 * s, 'ALTERNATIF 2: MEVCUT ALT KEDI YOLU ICI TABLALI 4 BORU 7 RRU BLOGU', 'METIN_BILGI', 0, 'center');
  dxf.addText(a2BoxX + a2BoxW / 2, a2BoxY + a2BoxH - 55 * s, 12 * s, '850x550mm TABLA + 4 ADET FLANSLI BORU + 7 RRU (2 TURKCELL + 2 TT + 3 VDF) + POI RACK KABINI', 'METIN_BILGI', 0, 'center');

  // -------------------------------------------------------------------------
  // 3.1. ALTERNATİF 2 - GÖRÜNÜŞ 2-A: TİPİK ENKESİT (YANDAN KESİT - ÖLÇEK 1:20)
  // Konum: X = a2BoxX + 100 * s ile a2BoxX + 1150 * s arası
  // -------------------------------------------------------------------------
  const s2BaseX = a2BoxX + 550 * s;
  const s2BaseY = a2BoxY + 120 * s;

  dxf.addText(s2BaseX, a2BoxY + a2BoxH - 95 * s, 18 * s, 'GORUNUS 2-A: TIPIK ENKESIT (YANDAN KESIT - OLCEK 1:20)', 'METIN_BILGI', 0, 'center');

  // Skorboard Çeliği (TAMAMEN SERBEST / YÜKSÜZ)
  const sbCol2X = s2BaseX - 400 * s;
  dxf.addRect(sbCol2X - 70 * s, s2BaseY, 140 * s, 1200 * s, 'CELIK_KIRIS_KOLON');
  dxf.addText(sbCol2X, s2BaseY + 1230 * s, 12 * s, 'SKORBOARD CELIK DIKMESI', 'METIN_BILGI', 0, 'center');
  dxf.addText(sbCol2X, s2BaseY + 700 * s, 14 * s, 'SERBEST / YUKSUZ CELIK', 'METIN_BILGI', 90, 'center');
  dxf.addText(sbCol2X, s2BaseY + 450 * s, 11 * s, '(MONTAJ YOKTUR)', 'METIN_BILGI', 90, 'center');

  // Kedi Yolu Platformu (Genişlik 1200mm, Kalınlık 35mm)
  const cw2StartX = s2BaseX + 100 * s;
  const cw2W = 1200 * s;
  const cw2Y = s2BaseY;

  dxf.addRect(cw2StartX, cw2Y, cw2W, 35 * s, 'ZEMIN_PLATFORM');
  for (let gx = cw2StartX + 60 * s; gx < cw2StartX + cw2W; gx += 60 * s) {
    dxf.addLine(gx, cw2Y, gx, cw2Y + 35 * s, 'ZEMIN_PLATFORM');
  }

  // Kedi Yolu Alt Kirişleri
  dxf.addRect(cw2StartX, cw2Y - 120 * s, 60 * s, 120 * s, 'CELIK_KIRIS_KOLON');
  dxf.addRect(cw2StartX + cw2W - 60 * s, cw2Y - 120 * s, 60 * s, 120 * s, 'CELIK_KIRIS_KOLON');
  dxf.addRect(cw2StartX + 60 * s, cw2Y - 100 * s, cw2W - 120 * s, 25 * s, 'CELIK_KIRIS_KOLON');

  // Korkuluklar
  dxf.addRect(cw2StartX - 5 * s, cw2Y + 35 * s, 35 * s, 1100 * s, 'KORKULUK_KAPI');
  dxf.addCircle(cw2StartX + 12 * s, cw2Y + 35 * s + 1100 * s, 20 * s, 'KORKULUK_KAPI');
  dxf.addRect(cw2StartX, cw2Y + 35 * s + 550 * s, 25 * s, 20 * s, 'KORKULUK_KAPI');
  dxf.addRect(cw2StartX, cw2Y + 35 * s, 15 * s, 150 * s, 'KORKULUK_KAPI');

  const rRail2X = cw2StartX + cw2W - 30 * s;
  dxf.addRect(rRail2X, cw2Y + 35 * s, 35 * s, 1100 * s, 'KORKULUK_KAPI');
  dxf.addCircle(rRail2X + 18 * s, cw2Y + 35 * s + 1100 * s, 20 * s, 'KORKULUK_KAPI');
  dxf.addRect(rRail2X + 10 * s, cw2Y + 35 * s + 550 * s, 25 * s, 20 * s, 'KORKULUK_KAPI');
  dxf.addRect(rRail2X + 15 * s, cw2Y + 35 * s, 15 * s, 150 * s, 'KORKULUK_KAPI');

  // ALTERNATİF-2 TABLA VE DÜŞEY BORU BLOK YERLEŞİMİ
  // Tabla: Enkesit yönünde derinlik = 550mm, Kalınlık = 25mm
  const t2StartX = cw2StartX + 30 * s;
  const t2W = 550 * s; // 550mm derinlik
  const t2H = 25 * s;
  const t2Y = cw2Y + 35 * s;

  // Çelik Tabla Gövdesi ve Bordür (Kickplate)
  dxf.addRect(t2StartX, t2Y, t2W, t2H, 'BLOK_OZEL_PLATFORM');
  dxf.addRect(t2StartX, t2Y + t2H, 15 * s, 35 * s, 'BLOK_OZEL_PLATFORM'); // Sol bordür
  dxf.addRect(t2StartX + t2W - 15 * s, t2Y + t2H, 15 * s, 35 * s, 'BLOK_OZEL_PLATFORM'); // Sağ bordür

  // M16 Ankraj Cıvataları
  dxf.addCircle(t2StartX + 35 * s, t2Y + 12 * s, 8 * s, 'CELIK_KIRIS_KOLON');
  dxf.addCircle(t2StartX + t2W - 35 * s, t2Y + 12 * s, 8 * s, 'CELIK_KIRIS_KOLON');

  // 2 Sıra Ø60mm Düşey Flanşlı Montaj Borusu (Ön ve Arka Boru Aksları)
  const pipe2FrontX = t2StartX + 120 * s;
  const pipe2BackX = t2StartX + t2W - 120 * s;
  const pipe2H = 1450 * s;

  [pipe2FrontX, pipe2BackX].forEach(px => {
    // Flanş Taban Pabucu
    dxf.addRect(px - 50 * s, t2Y + t2H, 100 * s, 18 * s, 'MONTAJ_BORULARI');
    dxf.addRect(px - 25 * s, t2Y + t2H + 18 * s, 50 * s, pipe2H, 'MONTAJ_BORULARI');
    dxf.addCircle(px, t2Y + t2H + 18 * s + pipe2H, 25 * s, 'MONTAJ_BORULARI');
  });

  // Borular Üzerine Monte Edilmiş RRU Kümeleri (2 Katman Yan Kesit)
  // Alt Katman RRU
  dxf.addRect(pipe2FrontX + 25 * s, t2Y + 150 * s, 140 * s, 480 * s, 'EKP_TURKCELL_RRU');
  dxf.addText(pipe2FrontX + 95 * s, t2Y + 390 * s, 11 * s, 'ALT SIRA RRU', 'METIN_BILGI', 0, 'center');
  // Üst Katman RRU
  dxf.addRect(pipe2BackX - 165 * s, t2Y + 700 * s, 140 * s, 480 * s, 'EKP_VODAFONE_RRU');
  dxf.addText(pipe2BackX - 95 * s, t2Y + 940 * s, 11 * s, 'UST SIRA RRU', 'METIN_BILGI', 0, 'center');

  // Tepedeki ALTERNATİF-2 Yönlendirme Panosu (Sprite / Tabela)
  const signX = (pipe2FrontX + pipe2BackX) / 2;
  const signY = t2Y + t2H + 18 * s + pipe2H + 40 * s;
  dxf.addRect(signX - 180 * s, signY - 35 * s, 360 * s, 70 * s, 'METIN_BILGI');
  dxf.addText(signX, signY - 5 * s, 16 * s, 'ALTERNATIF-2', 'METIN_BILGI', 0, 'center');
  dxf.addText(signX, signY - 25 * s, 11 * s, '(7 RRU KÜMESİ)', 'METIN_BILGI', 0, 'center');
  dxf.addLine(signX - 100 * s, signY - 35 * s, pipe2FrontX, t2Y + t2H + pipe2H, 'MONTAJ_BORULARI');
  dxf.addLine(signX + 100 * s, signY - 35 * s, pipe2BackX, t2Y + t2H + pipe2H, 'MONTAJ_BORULARI');

  // Net Yürüyüş Koridoru (Tablanın Arkasında Kalan 620mm Serbest Geçiş Alanı)
  const walk2StartX = t2StartX + t2W;
  const walk2W = cw2StartX + cw2W - walk2StartX;
  dxf.addRect(walk2StartX, cw2Y + 35 * s, walk2W, 1100 * s, 'YURUYUS_KORIDORU');
  dxf.addLine(walk2StartX + 10 * s, cw2Y + 500 * s, walk2StartX + walk2W - 10 * s, cw2Y + 500 * s, 'YURUYUS_KORIDORU');
  dxf.addText(walk2StartX + walk2W / 2, cw2Y + 550 * s, 13 * s, 'SERBEST SERVIS VE', 'YURUYUS_KORIDORU', 0, 'center');
  dxf.addText(walk2StartX + walk2W / 2, cw2Y + 440 * s, 13 * s, 'GECIS KORIDORU', 'YURUYUS_KORIDORU', 0, 'center');
  dxf.addText(walk2StartX + walk2W / 2, cw2Y + 330 * s, 14 * s, '(NET 650mm)', 'YURUYUS_KORIDORU', 0, 'center');

  // Ölçüler (Görünüş 2-A)
  dxf.addDimension(cw2StartX, cw2Y - 180 * s, cw2StartX + cw2W, cw2Y - 180 * s, -60 * s, '1200 mm (KEDI YOLU ENI)');
  dxf.addDimension(t2StartX, cw2Y - 80 * s, t2StartX + t2W, cw2Y - 80 * s, -40 * s, '550 mm (TABLA DERINLIGI)');
  dxf.addDimension(walk2StartX, cw2Y - 80 * s, cw2StartX + cw2W, cw2Y - 80 * s, -40 * s, '650 mm (NET SERBEST GECIS)');
  dxf.addDimension(t2StartX, signY + 60 * s, t2StartX, cw2Y + 35 * s, -80 * s, '1950 mm (BORU YUKSEKLIGI)');

  // -------------------------------------------------------------------------
  // 3.2. ALTERNATİF 2 - GÖRÜNÜŞ 2-B: ÖNDEN GÖRÜNÜŞ / ELEVASYON (ÖLÇEK 1:20)
  // Konum: X = a2BoxX + 1280 * s ile a2BoxX + 2420 * s arası
  // -------------------------------------------------------------------------
  const e2BaseX = a2BoxX + 1300 * s;
  const e2BaseY = s2BaseY;

  dxf.addText(e2BaseX + 550 * s, a2BoxY + a2BoxH - 95 * s, 18 * s, 'GORUNUS 2-B: ONDEN GORUNUS / ELEVASYON (OLCEK 1:20)', 'METIN_BILGI', 0, 'center');

  // Çelik Taban Tablası Önden Görünüş (Boy: 850mm, Kalınlık: 25mm)
  const tabla2W = 850 * s;
  dxf.addRect(e2BaseX, e2BaseY, tabla2W, 25 * s, 'BLOK_OZEL_PLATFORM');
  dxf.addRect(e2BaseX, e2BaseY + 25 * s, 15 * s, 35 * s, 'BLOK_OZEL_PLATFORM');
  dxf.addRect(e2BaseX + tabla2W - 15 * s, e2BaseY + 25 * s, 15 * s, 35 * s, 'BLOK_OZEL_PLATFORM');
  dxf.addText(e2BaseX + tabla2W / 2, e2BaseY - 30 * s, 12 * s, '850x550x25mm SICAK DALDIRMA GALVANIZ CELIK TABLA', 'METIN_BILGI', 0, 'center');

  // 4 Adet Düşey Montaj Borusu (Aks aralıkları ~240mm)
  const pipeCols = [e2BaseX + 100 * s, e2BaseX + 320 * s, e2BaseX + 530 * s, e2BaseX + 750 * s];
  pipeCols.forEach((px, pIdx) => {
    // Taban flanş pleyti
    dxf.addRect(px - 45 * s, e2BaseY + 25 * s, 90 * s, 18 * s, 'MONTAJ_BORULARI');
    // Boru gövdesi
    dxf.addRect(px - 25 * s, e2BaseY + 43 * s, 50 * s, 1450 * s, 'MONTAJ_BORULARI');
    dxf.addCircle(px, e2BaseY + 43 * s + 1450 * s, 25 * s, 'MONTAJ_BORULARI');
    dxf.addText(px, e2BaseY + 1520 * s, 9 * s, `B${pIdx + 1}`, 'METIN_BILGI', 0, 'center');
  });

  // 7 Adet RRU Kümesi (Alt Sıra: 4 RRU, Üst Sıra: 3 RRU)
  // Alt Sıra: 2 Turkcell + 2 TT
  const altRrus = [
    { name: 'TCELL 1', layer: 'EKP_TURKCELL_RRU', x: e2BaseX + 50 * s, y: e2BaseY + 120 * s, w: 160 * s, h: 450 * s },
    { name: 'TCELL 2', layer: 'EKP_TURKCELL_RRU', x: e2BaseX + 240 * s, y: e2BaseY + 120 * s, w: 160 * s, h: 450 * s },
    { name: 'TT 1',    layer: 'EKP_TURK_TELEKOM_RRU', x: e2BaseX + 440 * s, y: e2BaseY + 120 * s, w: 160 * s, h: 450 * s },
    { name: 'TT 2',    layer: 'EKP_TURK_TELEKOM_RRU', x: e2BaseX + 640 * s, y: e2BaseY + 120 * s, w: 160 * s, h: 450 * s }
  ];
  altRrus.forEach(r => {
    dxf.addRect(r.x, r.y, r.w, r.h, r.layer);
    dxf.addText(r.x + r.w / 2, r.y + r.h / 2, 10 * s, r.name, 'METIN_BILGI', 0, 'center');
  });

  // Üst Sıra: 3 Vodafone RRU
  const ustRrus = [
    { name: 'VODAFONE 1', layer: 'EKP_VODAFONE_RRU', x: e2BaseX + 120 * s, y: e2BaseY + 680 * s, w: 180 * s, h: 460 * s },
    { name: 'VODAFONE 2', layer: 'EKP_VODAFONE_RRU', x: e2BaseX + 330 * s, y: e2BaseY + 680 * s, w: 180 * s, h: 460 * s },
    { name: 'VODAFONE 3', layer: 'EKP_VODAFONE_RRU', x: e2BaseX + 540 * s, y: e2BaseY + 680 * s, w: 180 * s, h: 460 * s }
  ];
  ustRrus.forEach(r => {
    dxf.addRect(r.x, r.y, r.w, r.h, r.layer);
    dxf.addText(r.x + r.w / 2, r.y + r.h / 2, 10 * s, r.name, 'METIN_BILGI', 0, 'center');
  });

  // Tepedeki Tabela (Önden Görünüş)
  const sign2CenterX = e2BaseX + tabla2W / 2;
  const sign2CenterY = e2BaseY + 1620 * s;
  dxf.addRect(sign2CenterX - 220 * s, sign2CenterY - 45 * s, 440 * s, 90 * s, 'METIN_BILGI');
  dxf.addRect(sign2CenterX - 215 * s, sign2CenterY - 40 * s, 430 * s, 80 * s, 'METIN_BILGI');
  dxf.addText(sign2CenterX, sign2CenterY + 10 * s, 18 * s, 'ALTERNATIF - 2', 'METIN_BILGI', 0, 'center');
  dxf.addText(sign2CenterX, sign2CenterY - 20 * s, 11 * s, 'TABLALI 4 BORU - 7 RRU KÜMESİ', 'METIN_BILGI', 0, 'center');
  dxf.addLine(sign2CenterX - 140 * s, sign2CenterY - 45 * s, pipeCols[0], e2BaseY + 1500 * s, 'MONTAJ_BORULARI');
  dxf.addLine(sign2CenterX + 140 * s, sign2CenterY - 45 * s, pipeCols[3], e2BaseY + 1500 * s, 'MONTAJ_BORULARI');

  // Yanındaki POI Rack Kabini (Önden Görünüş)
  // Kullanıcı İsteği: "poıler her ikisinde de olsun"
  const poi2FaceX = e2BaseX + 900 * s;
  const poi2FaceW = 220 * s;
  dxf.addRect(poi2FaceX, e2BaseY, poi2FaceW, 1450 * s, 'EKP_POI_TASIYICI_SASE');
  dxf.addRect(poi2FaceX + 15 * s, e2BaseY + 15 * s, poi2FaceW - 30 * s, 1420 * s, 'EKP_POI_TASIYICI_SASE');
  for (let pi = 0; pi < 4; pi++) {
    dxf.addRect(poi2FaceX + 25 * s, e2BaseY + 200 * s + pi * 270 * s, poi2FaceW - 50 * s, 180 * s, 'EKP_POI_MODULLERI');
    dxf.addText(poi2FaceX + poi2FaceW / 2, e2BaseY + 290 * s + pi * 270 * s, 11 * s, `POI ${pi + 1}`, 'METIN_BILGI', 0, 'center');
  }
  dxf.addText(poi2FaceX + poi2FaceW / 2, e2BaseY + 1480 * s, 13 * s, 'POI RACK KABINI', 'METIN_BILGI', 0, 'center');

  // İki Blok Arası Taban Kablo Jumper Bağlantısı (Kısa geçiş)
  dxf.addRect(e2BaseX + tabla2W, e2BaseY + 15 * s, poi2FaceX - (e2BaseX + tabla2W), 25 * s, 'KABLO_TAVALARI');
  dxf.addText((e2BaseX + tabla2W + poi2FaceX) / 2, e2BaseY + 55 * s, 9 * s, 'TABAN JUMPERI (0.8m)', 'METIN_BILGI', 0, 'center');

  // Ölçüler (Görünüş 2-B)
  dxf.addDimension(e2BaseX, e2BaseY - 60 * s, e2BaseX + tabla2W, e2BaseY - 60 * s, -40 * s, '850 mm (TABLA BOYU)');
  dxf.addDimension(poi2FaceX, e2BaseY - 60 * s, poi2FaceX + poi2FaceW, e2BaseY - 60 * s, -40 * s, '600 mm (POI ENI)');
  dxf.addDimension(e2BaseX, e2BaseY + 1750 * s, e2BaseX + tabla2W, e2BaseY + 1750 * s, 40 * s, '4 ADET FLANSLI BORU (O60mm)');


  // =========================================================================
  // 4. BÖLÜM 3: KARŞILAŞTIRMALI MÜHENDİSLİK ANALİZ TABLOSU (SOL ALT BLOK)
  // Aks: X = -2550 * s, Kot: Y = -40 * s
  // =========================================================================
  const tCompX = -2550 * s;
  const tCompY = -40 * s;
  const tCompW = 2050 * s;
  const tCompH = 980 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(tCompX, tCompY - tCompH, tCompW, tCompH);
  dxf.addText(tCompX + tCompW / 2, tCompY - 35 * s, 18 * s, 'ALTERNATIF 1 VE ALTERNATIF 2 KARSILASTIRMALI MUHENDISLIK VE UYGULAMA ANALIZI', 'METIN_BILGI', 0, 'center');

  const compCols = [
    { title: 'KRITER / DEGERLENDIRME', w: 450 * s, x: tCompX },
    { title: 'ALTERNATIF 1 (SKORBOARD CELIK MONTAJI)', w: 780 * s, x: tCompX + 450 * s },
    { title: 'ALTERNATIF 2 (KEDI YOLU TABLALI MONTAJ)', w: 820 * s, x: tCompX + 1230 * s }
  ];

  dxf.addRect(tCompX, tCompY - 75 * s, tCompW, 35 * s);
  compCols.forEach(c => {
    dxf.addText(c.x + 15 * s, tCompY - 65 * s, 11 * s, c.title, 'METIN_BILGI');
  });

  const compData = [
    {
      k: 'RRU Montaj Yeri',
      a1: 'Skorboard arka celik kafes kirisleri (Z = -2.20m)',
      a2: 'Mevcut alt kedi yolu platformu uzerinde 850x550mm tabla'
    },
    {
      k: 'POI Kabin Varligi',
      a1: 'Kedi yolu uzerinde 30U/42U POI Rack mevcuttur (600x800mm)',
      a2: 'Kedi yolu uzerinde 30U/42U POI Rack mevcuttur (Tablaya bitisik)'
    },
    {
      k: 'Net Yuruyus Koridoru',
      a1: 'Net 600mm serbest yuruyus (POI yani haric tam acik)',
      a2: 'Net 650mm serbest yuruyus ve acil kacis koridoru (EN ISO 14122)'
    },
    {
      k: 'Skorboard Statik Yuku',
      a1: '14 RRU + konsol + tava: ~380 kg ek statik ve ruzgar yuku',
      a2: 'SIFIR YUK (Skorboard celigine hicbir ek yuk binmez)'
    },
    {
      k: 'Kopru Tavasi Ihtiyaci',
      a1: '1260mm uzunlugunda havai gecis kopru tavasi zorunludur',
      a2: 'KOPRU TAVASI YOKTUR (Kablolar tabandan dogrudan girer)'
    },
    {
      k: 'Jumper Kablo Metraji',
      a1: 'Ortalama 2.80m / jumper portu (20 adet feeder, sinyal kaybi yuksek)',
      a2: 'Ortalama 0.85m / jumper portu (Cok kisa, minimum RF sinyal kaybi)'
    },
    {
      k: 'Montaj & Iskele Gereksinimi',
      a1: 'Yuksekte ozel celik iskele / sepetli erisim gerektirir',
      a2: 'Kedi yolu icinden hizli, emniyetli ve kolay montaj imkani'
    },
    {
      k: 'Bakim & Mudahale Kolayligi',
      a1: 'Skorboard arkasinda calisma alani kisitli ve zordur',
      a2: 'Kedi yolundan 360 derece dogrudan ve emniyetli mudahale'
    },
    {
      k: 'Tavsiye Edilen Tercih',
      a1: 'Mevcut tasarim standardi (Mimari onayli)',
      a2: 'YUKSEK ONERILEN ALTERNATIF (Statik ve montaj avantaji)'
    }
  ];

  const rowH = 92 * s;
  compData.forEach((r, idx) => {
    const ry = tCompY - 110 * s - idx * rowH;
    dxf.addLine(tCompX, ry, tCompX + tCompW, ry, 'METIN_BILGI');
    dxf.addText(compCols[0].x + 15 * s, ry + 50 * s, 11 * s, r.k, 'METIN_BILGI');
    dxf.addText(compCols[1].x + 15 * s, ry + 50 * s, 10 * s, r.a1, 'METIN_BILGI');
    dxf.addText(compCols[2].x + 15 * s, ry + 50 * s, 10 * s, r.a2, 'METIN_BILGI');
  });

  // =========================================================================
  // 5. BÖLÜM 4: DETAY ÇİZİMLERİ (ORTA ALT BLOK)
  // Aks: X = -450 * s, Kot: Y = -40 * s
  // =========================================================================
  const detX = -450 * s;
  const detY = -40 * s;
  const detW = 1000 * s;
  const detH = 980 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(detX, detY - detH, detW, detH);
  dxf.addText(detX + detW / 2, detY - 35 * s, 17 * s, 'IMALAT VE ANKRAJ DETAYLARI (OLCEK 1:10)', 'METIN_BILGI', 0, 'center');

  // DETAY D-1: Kedi Yolu İçi Taban Tablası ve Flanş Ankrajı (Üst Yarım)
  const d1Y = detY - 120 * s;
  dxf.addText(detX + 30 * s, d1Y, 14 * s, 'DETAY D-1: TABAN TABLASI VE FLANS ANKRAJ DETAYI', 'METIN_BILGI');

  // Kedi yolu NPU120 kirişi
  dxf.addRect(detX + 100 * s, d1Y - 180 * s, 120 * s, 60 * s, 'CELIK_KIRIS_KOLON');
  dxf.addText(detX + 160 * s, d1Y - 150 * s, 10 * s, 'UPN120', 'METIN_BILGI', 0, 'center');

  // 25mm Tabla Sacı
  dxf.addRect(detX + 80 * s, d1Y - 120 * s, 350 * s, 25 * s, 'BLOK_OZEL_PLATFORM');
  dxf.addText(detX + 250 * s, d1Y - 85 * s, 10 * s, 't=25mm GALVANIZ TABLA SACI', 'METIN_BILGI', 0, 'center');

  // Flanş Borusu Pabucu
  dxf.addRect(detX + 180 * s, d1Y - 95 * s, 140 * s, 20 * s, 'MONTAJ_BORULARI');
  dxf.addRect(detX + 225 * s, d1Y - 75 * s, 50 * s, 120 * s, 'MONTAJ_BORULARI');
  dxf.addCircle(detX + 210 * s, d1Y - 85 * s, 6 * s, 'MONTAJ_BORULARI'); // Cıvata
  dxf.addCircle(detX + 290 * s, d1Y - 85 * s, 6 * s, 'MONTAJ_BORULARI');
  dxf.addText(detX + 320 * s, d1Y - 20 * s, 10 * s, 'O60.3mm MONTAJ BORUSU', 'METIN_BILGI');

  // M16 Alt Ankraj Kenetleme Cıvatası
  dxf.addLine(detX + 140 * s, d1Y - 95 * s, detX + 140 * s, d1Y - 210 * s, 'CELIK_KIRIS_KOLON');
  dxf.addCircle(detX + 140 * s, d1Y - 215 * s, 8 * s, 'CELIK_KIRIS_KOLON');
  dxf.addText(detX + 60 * s, d1Y - 215 * s, 10 * s, 'M16 ANKRAJ (8.8 KALITE)', 'METIN_BILGI');

  // DETAY D-2: POI Rack Kabini & Feeder Dağıtım Şeması (Alt Yarım)
  const d2Y = detY - 550 * s;
  dxf.addText(detX + 30 * s, d2Y, 14 * s, 'DETAY D-2: POI RACK KABINI VE JUMPER GIRIS DUZENI', 'METIN_BILGI');

  // Kabin Kesiti
  dxf.addRect(detX + 100 * s, d2Y - 350 * s, 320 * s, 320 * s, 'EKP_POI_TASIYICI_SASE');
  dxf.addRect(detX + 120 * s, d2Y - 330 * s, 280 * s, 280 * s, 'EKP_POI_TASIYICI_SASE');
  // 4 POI Modülü
  for (let mi = 0; mi < 4; mi++) {
    dxf.addRect(detX + 140 * s, d2Y - 120 * s - mi * 60 * s, 240 * s, 45 * s, 'EKP_POI_MODULLERI');
    dxf.addText(detX + 260 * s, d2Y - 95 * s - mi * 60 * s, 9 * s, `POI MODUL ${mi + 1} (4.3-10 DIN)`, 'METIN_BILGI', 0, 'center');
  }
  // Alt Taban Rekor Giriş Plakası
  dxf.addRect(detX + 150 * s, d2Y - 365 * s, 220 * s, 15 * s, 'KABLO_TAVALARI');
  dxf.addText(detX + 260 * s, d2Y - 390 * s, 10 * s, 'SIZDIRMAZ REKOR PLAKASI (IP65)', 'METIN_BILGI', 0, 'center');


  // =========================================================================
  // 6. BÖLÜM 5: MALZEME LİSTESİ (BOM) VE PROJE ANTETİ (SAĞ ALT BLOK)
  // Aks: X = 600 * s, Kot: Y = -40 * s
  // =========================================================================
  // 6.1. Ekipman Listesi (BOM)
  const bomX = 600 * s;
  const bomY = -40 * s;
  const bomW = 1000 * s;
  const bomH = 520 * s;

  dxf.setLayer('METIN_BILGI');
  dxf.addRect(bomX, bomY - bomH, bomW, bomH);
  dxf.addText(bomX + bomW / 2, bomY - 30 * s, 16 * s, 'EKIPMAN VE MALZEME LISTESI (BOM)', 'METIN_BILGI', 0, 'center');

  const bCols = [
    { title: 'NO', w: 60 * s, x: bomX },
    { title: 'EKIPMAN TANIMI', w: 460 * s, x: bomX + 60 * s },
    { title: 'EBAT / TEKNIK OZELLIK', w: 320 * s, x: bomX + 520 * s },
    { title: 'MIKTAR', w: 160 * s, x: bomX + 840 * s }
  ];

  dxf.addRect(bomX, bomY - 65 * s, bomW, 30 * s);
  bCols.forEach(c => {
    dxf.addText(c.x + 10 * s, bomY - 55 * s, 10 * s, c.title, 'METIN_BILGI');
  });

  const bomData = [
    { no: '01', name: 'Turkcell LTE/NR RRU Modulleri', dim: '398 x 533 x 140 mm / 25 kg', qty: '4 Adet' },
    { no: '02', name: 'Turk Telekom NR/LTE RRU Modulleri', dim: '356 x 480 x 140 mm / 25 kg', qty: '4 Adet' },
    { no: '03', name: 'Vodafone 5526t Cift Bant RRU Modulleri', dim: '432 x 480 x 135 mm / 28 kg', qty: '6 Adet' },
    { no: '04', name: 'Canovate 19" Outdoor POI Rack Kabini', dim: '600 x 800 x 1600 mm (IP65)', qty: '2 Adet' },
    { no: '05', name: 'Dortlu POI Modul Kumesi (Canovate)', dim: '19" 3U/4U Rack Tipi Modul', qty: '8 Modul' },
    { no: '06', name: 'Sicak Daldirma Galvaniz Montaj Tablasi (Alt.2)', dim: '850 x 550 x 25 mm + Bordur', qty: '2 Adet' },
    { no: '07', name: '2" (O60.3mm) Flansli Montaj Borusu (Alt.2)', dim: 't=3.65mm - L=1950mm Galv.', qty: '8 Adet' },
    { no: '08', name: '200x60mm Perfore Kablo Tavasi (Alt.1)', dim: 't=1.5mm Sicak Daldirma Galv.', qty: '12 Metre' },
    { no: '09', name: '1/2" Super Esnek RF Jumper Kablo Seti', dim: '4.3-10 DIN / L=1.0 - 2.8m', qty: '40 Adet' },
    { no: '10', name: 'M16 8.8 Kalite Celik Ankraj Civata Seti', dim: 'Dacromet Kaplama + Kilitli Pul', qty: '16 Takim' }
  ];

  const bRowH = 40 * s;
  bomData.forEach((row, rIdx) => {
    const ry = bomY - 95 * s - rIdx * bRowH;
    dxf.addLine(bomX, ry, bomX + bomW, ry, 'METIN_BILGI');
    dxf.addText(bCols[0].x + 10 * s, ry + 10 * s, 10 * s, row.no, 'METIN_BILGI');
    dxf.addText(bCols[1].x + 10 * s, ry + 10 * s, 10 * s, row.name, 'METIN_BILGI');
    dxf.addText(bCols[2].x + 10 * s, ry + 10 * s, 9 * s, row.dim, 'METIN_BILGI');
    dxf.addText(bCols[3].x + 10 * s, ry + 10 * s, 10 * s, row.qty, 'METIN_BILGI');
  });

  // 6.2. Teknik Şartname Notları
  const noteX = 600 * s;
  const noteY = -580 * s;
  const noteW = 1000 * s;
  const noteH = 440 * s;

  dxf.addRect(noteX, noteY - noteH, noteW, noteH);
  dxf.addText(noteX + noteW / 2, noteY - 25 * s, 14 * s, 'TEKNIK SARTNAME VE MONTAJ STANDARTLARI', 'METIN_BILGI', 0, 'center');

  const notes = [
    '1. GUVENLIK VE SERBEST GECIS: Kedi yolu platformu uzerinde EN ISO 14122-2 standardina uygun net yuruyus',
    '   koridoru (Alternatif 1: 600mm, Alternatif 2: 650mm) kesintisiz ve engelsiz olarak korunacaktir.',
    '2. GALVANIZ KAPLAMA: Tum celik montaj tablolari, flansli borular ve konsol kollari TS EN ISO 1461',
    '   standardinda min. 85 mikron sicak daldirma galvaniz ile korozyona karsi korumalidir.',
    '3. ANKRAJ VE CIVATA STANDARDI: Celik taban tablasi ve kedi yolu baglantilari 8.8 kalite M16 civatalar',
    '   ve cift kilitli paslanmaz pullarla 120 Nm tork degeri ile rijit sabitlenecektir.',
    '4. RF SIZDIRMAZLIK: Tum 4.3-10 dis ortam RF konnektorleri IP67/IP68 soguk buzusmeli tup (cold-shrink)',
    '   ve vulkanize butil bant ile cift kademeli sizdirmazlik altina alinacaktir.',
    '5. TOPRAKLAMA: Her iki alternatifte tum metal tablalar, borular ve RRU/POI kasalari kedi yolu es-potansiyel',
    '   bakir barasina 16 mm2 H07V-K ile baglanacaktir (Gecis direnci R < 2 Ohm).'
  ];
  notes.forEach((nt, idx) => {
    dxf.addText(noteX + 20 * s, noteY - 60 * s - idx * 36 * s, 10 * s, nt, 'METIN_BILGI');
  });

  // 6.3. Standart Proje Anteti (Title Block)
  const tX = 1630 * s;
  const tY = -40 * s;
  const tW = 920 * s;
  const tH = 980 * s;

  dxf.addRect(tX, tY - tH, tW, tH);

  // Logo / Kurumsal Başlık
  dxf.addRect(tX, tY - 160 * s, tW, 160 * s);
  dxf.addText(tX + tW / 2, tY - 45 * s, 22 * s, 'TURK TELEKOMUNIKASYON A.S.', 'METIN_BILGI', 0, 'center');
  dxf.addText(tX + tW / 2, tY - 80 * s, 16 * s, 'TURKCELL - VODAFONE ORTAK ALTYAPI PROJESI', 'METIN_BILGI', 0, 'center');
  dxf.addText(tX + tW / 2, tY - 115 * s, 14 * s, 'SEYRANTEPE STADYUMU KEDI YOLU TESISLERI', 'METIN_BILGI', 0, 'center');

  // Proje ve Pafta Başlığı
  dxf.addRect(tX, tY - 370 * s, tW, 210 * s);
  dxf.addText(tX + 20 * s, tY - 190 * s, 12 * s, 'PROJE ADI:', 'METIN_BILGI');
  dxf.addText(tX + 30 * s, tY - 225 * s, 16 * s, 'RAMS PARK / SEYRANTEPE STADYUMU 5G DONUSUMU', 'METIN_BILGI');
  dxf.addText(tX + 20 * s, tY - 270 * s, 12 * s, 'PAFTA ADI:', 'METIN_BILGI');
  dxf.addText(tX + 30 * s, tY - 305 * s, 16 * s, 'ALAN 2: SKORBOARD ARKASI RRU & POI KESITLERI', 'METIN_BILGI');
  dxf.addText(tX + 30 * s, tY - 338 * s, 13 * s, 'ALTERNATIF 1 VE ALTERNATIF 2 KARSILASTIRMALI ENKESITLERI', 'METIN_BILGI');

  // Bilgi Hücreleri
  const tRows = [
    { k1: 'PAFTA NO:', v1: 'DWG-TEL-10', k2: 'TARIH:', v2: 'EKIM 2026' },
    { k1: 'OLCEK:', v1: isMm ? '1:1 mm (CAD)' : '1:1 m (CAD)', k2: 'REV:', v2: 'REV-01' },
    { k1: 'CIZEN:', v1: 'ANTIGRAVITY CAD ENG', k2: 'KONTROL:', v2: 'BAS MUHENDISLIK' },
    { k1: 'STATIK ONAY:', v1: 'UYGUNDUR (CE)', k2: 'FORMAT:', v2: 'AUTOCAD DXF / DWG' },
    { k1: 'DISIPLIN:', v1: 'TELEKOM & ELEKTROMEKANIK', k2: 'DURUM:', v2: 'AS-BUILT / IMALAT' }
  ];

  const tCellH = 75 * s;
  tRows.forEach((r, idx) => {
    const ry = tY - 370 * s - (idx + 1) * tCellH;
    dxf.addLine(tX, ry, tX + tW, ry, 'METIN_BILGI');
    dxf.addLine(tX + tW / 2, ry, tX + tW / 2, ry + tCellH, 'METIN_BILGI');

    dxf.addText(tX + 15 * s, ry + tCellH - 25 * s, 10 * s, r.k1, 'METIN_BILGI');
    dxf.addText(tX + 120 * s, ry + tCellH - 25 * s, 12 * s, r.v1, 'METIN_BILGI');

    dxf.addText(tX + tW / 2 + 15 * s, ry + tCellH - 25 * s, 10 * s, r.k2, 'METIN_BILGI');
    dxf.addText(tX + tW / 2 + 120 * s, ry + tCellH - 25 * s, 12 * s, r.v2, 'METIN_BILGI');
  });

  return dxf.toDxfString();
}

// Generate both Millimeter and Meter outputs
const fileNameMm = '10_ALAN_2_SKORBOARD_ARKASI_KEDI_YOLU_RRU_VE_POI_ALTERNATIF_KESITLERI_mm.dxf';
const fileNameM = '10_ALAN_2_SKORBOARD_ARKASI_KEDI_YOLU_RRU_VE_POI_ALTERNATIF_KESITLERI_m.dxf';

const pathMm = path.join(DIR_MM, fileNameMm);
const pathM = path.join(DIR_M, fileNameM);

console.log('Generating Alan 2 Scoreboard Alternatives Section DXF (Millimeter)...');
const dxfMm = generateAlan2AlternativesDXF('mm');
fs.writeFileSync(pathMm, dxfMm, 'utf8');
console.log(`Saved: ${pathMm} (${(fs.statSync(pathMm).size / 1024).toFixed(1)} KB)`);

console.log('Generating Alan 2 Scoreboard Alternatives Section DXF (Meter)...');
const dxfM = generateAlan2AlternativesDXF('m');
fs.writeFileSync(pathM, dxfM, 'utf8');
console.log(`Saved: ${pathM} (${(fs.statSync(pathM).size / 1024).toFixed(1)} KB)`);

console.log('All Alan 2 Alternatives DXFs generated successfully!');

module.exports = { generateAlan2AlternativesDXF };
