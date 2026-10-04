===============================================================================
GALATASARAY STADYUMU ALTYAPI VE KEDI YOLU PROJESI - AUTOCAD DXF DOSYALARI
(DETAYLI MEKANIK MODELLER: TEK TEK KUTULAR, TABLALAR, KABIN DETAYLARI VE AYRI KATMANLAR)
===============================================================================

Bu cizimler AutoCAD 2007/2021 (AC1021) standart DXF formatinda; her ekipman 
icin tek tek bagimsiz CAD kutulari, montaj tablalari, kabin kapak/kol/menfez cikintilari, 
rack tasiyici saseleri ve anten konsollariyla, AYRI AYRI KATMANLARDA (LAYERS) uretilmistir.

HER EKIPMAN ICIN TANIMLANAN AYRI KATMANLAR (LAYERS) VE RENKLERI:
----------------------------------------------------------------
1. EKP_TURKCELL_RRU         : Renk 5 (Mavi)    - Turkcell RRU kutulari (Tek tek kutu + kulp + sogutucu + OSNAP)
2. EKP_VODAFONE_RRU         : Renk 1 (Kirmizi) - Vodafone RRU kutulari (Tek tek kutu + kulp + sogutucu + OSNAP)
3. EKP_TURK_TELEKOM_RRU     : Renk 4 (Cyan)    - Turk Telekom RRU kutulari (Tek tek kutu + kulp + sogutucu + OSNAP)
4. EKP_POI_TASIYICI_SASE    : Renk 30 (Turuncu)- Canovate 19" Rack Dikmeleri, Baza Ayaklari, Ust Sapka ve 19" Raylar
5. EKP_POI_MODULLERI        : Renk 40 (Amber)  - Canovate sase icine dizili Prose CB-12-POI-64F-A12 Modulleri (Tek tek)
6. EKP_RECTIFIER_ELTEK_20U  : Renk 3 (Yesil)   - Eltek 20U Dolap (Dis kutu, baza, on kapak cikintisi, kapi kolu, yan klima, sapka)
7. EKP_RECTIFIER_MTS9304A   : Renk 94 (Orman Y)- MTS9304A 12U Dolap (Dis kutu, baza, on kapak, kapi kolu, yan panjur menfezleri)
8. BLOK_OZEL_PLATFORM       : Renk 140 (Celik M)- Yanyana RRU'larin altindaki Tabla-2 ve 140cm Celik Izgara Montaj Tablalari
9. MONTAJ_BORULARI          : Renk 9 (Gri)     - 11-Boru ve 7-Boru montaj polleri (Ø50-Ø76mm), flanslar ve rijitlik borulari
10. EKP_MATSING_ANTEN       : Renk 2 (Sari)    - Matsing 4-Beam Kure Lens Anten Govdesi, omurga sasesi ve boru kelepcesi
11. EKP_PANEL_ANTEN         : Renk 6 (Magenta) - Spot Beam 30/30 Panel Antenler ve tilt aci braketleri
12. EKP_ANTEN_TASIYICI_KOL  : Renk 141 (Acik C)- Anten konsol kollari, cati makasi aski borulari ve silindir baglantilari

YAPI VE MIMARI KATMANLARI:
--------------------------
- ZEMIN_PLATFORM            : Renk 8 (Koyu Gri)- Kedi yolu izgara tabani, beton kaide ve yuruyus yolu
- KORKULUK_KAPI             : Renk 4 (Cyan)    - Guvenlik korkuluklari, 11m/2.5m muhafazalar, kayar kapilar
- CELIK_KIRIS_KOLON         : Renk 9 (Acik Gri)- Ana tasiyici kirisler, kolonlar ve skorbord arkasi celik karkas
- KABLO_TAVALARI            : Renk 6 (Magenta) - 200mm kablo tavalari ve 500x70mm dikey kablo merdivenleri
- YURUYUS_KORIDORU          : Renk 3 (Yesil)   - 800mm net serbest yuruyus guvenlik koridoru (Dashed)
- OLCULER                   : Renk 1 (Kirmizi) - Birebir milimetrik / metrik aks ve yukseklik olculeri
- METIN_BILGI               : Renk 7 (Beyaz)   - Baslik blogu, antet, kuzey oku ve detayli BOM cetveli

YAPILAN DETAYLANDIRMALAR:
-------------------------
1. RRU'lar (Tek Tek Kutu Halinde):
   - Buyuk tek bir blok yerine, her bir RRU bagimsiz olculeriyle tek tek kutu olarak cizilmistir.
   - 2D Plan'da: Govde dikdortgeni, sogutma kanadi/braket cizgisi, merkez OSNAP artisi (+) ve operator etiketi.
   - 3D Model'de: Bagimsiz 3D kati kutu (3DFACE), 12 tel kenar, ust tasima kulpu ve boru montaj kelepcesi.

2. Montaj Tablalari (Yan Yana RRU'larin Alti):
   - Karşılıklı 11-Boru ve Alan 1 7-Boru komplekslerinde yanyana duran pollerin ve RRU'larin altina 
     Tabla-2 ve 140cm Celik Izgara Tablalari (BLOK_OZEL_PLATFORM katmaninda) eklenmistir.
   - 11 adet dikey tasiyici boru ve zemin montaj flanslari da MONTAJ_BORULARI katmaninda yer almaktadir.

3. Rectifier Dolaplari (Dis Kutu ve Tum Cikintilari):
   - Tek bir duz kutu yerine mekanik gerceklige uygun olarak:
     * 100mm alt baza (recessed plinth)
     * Ana govde kabini
     * 25mm one cikintili on kapi paneli
     * Kapi kilit kolu mandali (40x180mm)
     * Yan tarafta 60mm disari tasan klima/havalandirma unitesinin panjur menfez cizgileri
     * 40mm disari tasan ust koruma yagmurluk basligi (Hood cap)
     birebir cizilmistir.

4. POI Tasiyici Sasesi ve Tek Tek POI Modulleri:
   - Canovate 19" Rack Şasesi (4 dikey köşe dikmesi, baza, şapka, iç 19" raylar) EKP_POI_TASIYICI_SASE katmaninda,
   - Şase içerisine kat kat dizilen Prose CB-12-POI modulleri ise tek tek EKP_POI_MODULLERI katmaninda gosterilmistir.

5. Antenler ve Tasiyici Kollari:
   - Matsing kure lens anteni dairesel/prizmatik govde, arka aluminyum omurga ve boru kelepcesiyle modellenmistir.
   - Antenin kedi yoluna veya cati makasina baglandigi tasiyici konsol boru ve kollari EKP_ANTEN_TASIYICI_KOL katmaninda cizilmistir.

6. Alan 1 & 3 Kedi Yolu 14 RRU Montaj ve Gecis Enkesiti (Pafta 09):
   - A-A Tipik Kedi Yolu Enkesiti (1000mm izgara, korkuluklar, O140mm makas dikmesi, 20cm ofset konsolu, 2" boru, kisa kenardan RRU montaji, net min. 850mm serbest yuruyus gecis koridoru).
   - Onden Elevasyon Gorunusu (Sol ve Sag borularda 3 sira halinde 14 RRU: 4 Turkcell + 4 Turk Telekom + 6 Vodafone).
   - Detay A (20cm Ofset Konsol ve Kelepce 1:5), Detay B (RRU Kisa Kenar Kilitleme ve Emniyet Pimi 1:5), Detay C (Topraklama ve Jumper Inisi 1:5).
   - Teknik sartname, guvenlik standartlari ve detayli BOM tablosu.

KLASORLER VE OLCEK:
-------------------
- Milimetre/ klasorundeki dosyalar 1:1 mm olcegindedir (Kedi yolu 30000x2000 mm, RRU 400x140x480 mm).
- Metre/ klasorundeki dosyalar 1:1 metre olcegindedir (Kedi yolu 30x2 m, RRU 0.40x0.14x0.48 m).
