# AJAN DEVİR DEFTERİ (Claude Code ⇄ Google Antigravity)

Bu projede iki yapay zeka ajanı **sırayla** çalışır: **Claude Code** ve **Google Antigravity (Gemini)**.
Kullanıcı, birinin kotası bitince diğerine geçer. Ajanlar birbiriyle konuşamaz; **tek iletişim kanalı bu dosyadır.**

> Bu dosya, `CLAUDE.md`, `.antigravity/instructions.md`, `AGENTS.md` ve `AI_DEVELOPER_GUIDE.md` tarafından zorunlu okuma olarak işaretlenmiştir.

---

## 0. PROTOKOL (iki ajan için de zorunlu, istisnasız)

### Oturum başında
1. Bu dosyanın **tamamını** oku: önce "1. Güncel Durum", sonra "2. Günlük"teki en son kayıtları.
2. `git status` ve `git log --oneline -10` çalıştır; günlükteki son commit ile gerçek durum uyuşuyor mu kontrol et.
   - Uyuşmuyorsa (commit edilmemiş değişiklik, günlükte olmayan commit): önceki ajanın kotası yarıda bitmiş demektir. `git diff` ile ne yapıldığını incele, günlüğe **"Devralma notu"** olarak yaz, kullanıcıya bildir.
3. "1. Güncel Durum" bölümündeki **Yarım kalan iş** ve **Sıradaki adımlar** varsa, kullanıcı aksini söylemedikçe oradan devam et.

### Çalışırken (kota her an bitebilir!)
4. Çok adımlı bir işe **başlamadan önce** "1. Güncel Durum"daki *Yarım kalan iş* alanına planı kısaca yaz. Kota ortada biterse diğer ajan nerede kaldığını bilsin.
5. Her **anlamlı değişiklikten hemen sonra** (oturum sonunu bekleme) "2. Günlük"e kayıt ekle. Küçük ardışık düzeltmeler aynı kayda eklenebilir.
6. Kayıt **istisnasız** şunları içermeli: hangi dosya, hangi fonksiyon/bölüm (`main.js` için fonksiyon adı + yaklaşık satır), ne değişti, neden, build sonucu, commit bilgisi.
   - Kayıt ve kod aynı commit'e girdiği için hash önceden bilinemez. "Commit" alanına commit mesajının **birebir aynısını** yaz (ör. `[Antigravity] Bağımlılıklar listesi eklendi`). Sonraki ajan `git log --oneline` ile eşleştirir.
   - Önceki ajanın kaydında "commit edilecek" yazıyor ama git'te o mesajla commit yoksa, kota commit'ten önce bitmiş demektir → "Devralma notu" yaz.

### Oturum sonunda / iş bitince
7. "1. Güncel Durum" bölümünü **baştan güncelle** (eski bilgiyi bırakma, üzerine yaz).
8. Kod değişikliğini ve bu dosyayı **aynı commit'e** koy. Commit mesajı Türkçe ve açıklayıcı; mesajın başına ajan etiketi koy: `[Claude] ...` veya `[Antigravity] ...`.

### Kurallar
- Günlük **sadece eklenir** (append-only). Eski kayıtları silme veya değiştirme; yanlışsa yeni kayıtla düzelt.
- En yeni kayıt **en üstte**.
- Tarih formatı: `YYYY-AA-GG SS:DD`.
- Diğer ajanın yaptığı bir şeyi geri alıyorsan veya değiştiriyorsan, kayıtta bunu **açıkça** belirt ("Antigravity'nin 2026-10-08 kaydındaki X değişikliği geri alındı, çünkü ...").
- Kullanıcının verdiği kalıcı kararları (tercihler, "bunu böyle yapma" uyarıları) "3. Kalıcı Kararlar" bölümüne ekle; iki ajan da bunlara uyar.

---

## 1. GÜNCEL DURUM (her oturum sonunda üzerine yazılır)

- **Son güncelleyen:** Claude Code, 2026-10-22
- **Son commit:** `[Claude] ALAN 2 taşıyıcıları: saha çevre ölçülerine göre omurga Ø420, dikme Ø111, çapraz Ø223`
- **Açık sorun (2026-10-22):** Orta ve sol taşıyıcıda kedi yolu rampaları (s ≈ 29.2 ve 42.1) yeni yan çaprazların içinden geçiyor; sağdaki 300 mm alçak tavada sorun yok. Tavanın kedi yollarını nasıl geçtiği kullanıcıya soruldu.
- **Açık konu:** Kedi yolu altı alçak geçişte (tava tabanı Y 0.18) tava, kedi yolu döşemesi ve eyer kirişiyle çakışıyor. Bu çakışma önceden de vardı; sağdaki 250 mm yüksek tavada daha belirgin. Gerçek geçiş şekli kullanıcıya sorulmadı.
- **Çözüldü (2026-10-21 12:30):** s = 17.1 tava rampası / V kolu girişimi. Kedi yolları ve istasyonlar DXF'e taşındı.
- **Build durumu:** `npm run build` hatasız.
- **Yarım kalan iş:** Yok. `918b5ba`'ya kadar push edildi; sonraki commit'ler yerelde, push için kullanıcı onayı bekleniyor.
- **Açık konu (2026-10-21):** Sahadan ölçülen V kol açısı yalnızca ALAN 2 orta taşıyıcıya uygulandı (kullanıcı "sadece bir tane kedi yolunu çiz" dedi). Kullanıcı onaylarsa yan taşıyıcılara, ALAN 1-3 ve ALAN 4 makaslarına da uygulanabilir.
- **Açık konu:** `scoreboardPoiToAntennaFeederSystem_left/right` (sabit kod, `createAlan4Structure` "5. POI ÇIKIŞI İNİŞ MERDİVENİ" ve "6. 14 ADET 1/2" FEEDER") POI rack'lerin eski Z ≈ −0.92 konumuna göre çizili. Rack'ler Z ≈ −0.50'ye taşındı; feeder başlangıçları güncellenmedi. Kullanıcıya soruldu.
- **Sıradaki adımlar (öneri, kullanıcı onayı bekliyor):**
  - Proje kökündeki ~70 adet tek seferlik `.cjs` betiğini `scripts/` altına taşımak / temizlemek (silme için kullanıcı onayı gerekir).
  - Kökteki kopya `.pptx` dosyaları ve 96 MB `stad_full_backup.zip` için kullanıcıya sor.
- **Bilinen sorunlar / dikkat:**
  - `main.js` ~809 KB, CRLF/LF karışık. `sed`/çok satırlı regex YASAK (bkz. `AI_DEVELOPER_GUIDE.md` 3.1).

---

## 2. GÜNLÜK (en yeni en üstte, sadece ekleme)

### Kayıt şablonu
```
### YYYY-AA-GG SS:DD — [Claude | Antigravity] — Kısa başlık
- **Kullanıcı isteği:** ...
- **Değişen dosyalar:**
  - `main.js` → `fonksiyonAdi()` (~satır N): ne değişti
  - `index.html` → `#elemanId`: ne değişti
- **Neden / karar:** ...
- **Doğrulama:** build OK/HATA, tarayıcıda test edildi mi
- **Commit:** `abc1234` (veya "commit edilmedi")
- **Yarım kalan / dikkat:** ...
```

---

### 2026-10-22 10:45 — Claude — ALAN 2 taşıyıcı boru ölçüleri saha çevre ölçülerine göre
- **Kullanıcı isteği:** "çap değil çember ölçüsü vereyim. alt taşıyıcı 132 cm, dikler 35, çaprazlar 70". 10:20 kaydındaki Ø35 / Ø70 mm yorumu yanlıştı; değerler cm cinsinden çevre ölçüsü.
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardRoofTruss60m()`:
    - Omurga: YENİ `spineR = 1.32 / π / 2` ≈ 0.210 (Ø420, eskiden Ø350). Kodda omurga yarıçapı olarak kullanılan sabit 0.175 değerlerinin hepsi `spineR` oldu: aşık kotu, travers ve serbest tava kotu, V taban noktası, kelepçe, ara destek `carrierR`, etiket yüksekliği, alçak geçiş kotu (`spineR + 0.005`).
    - Bilezik `spineR + 0.015`.
    - Dikme `photoVLegR = 0.35 / π / 2` ≈ 0.0557 (Ø111).
    - Örgü çaprazı `webRadius = 0.70 / π / 2` ≈ 0.111 (Ø223). Çapraz ekseni `webOut` kadar dışa kaydırıldı, böylece iç yüzü dikmenin iç yüzüyle aynı doğruda kalıyor ve ölçülen net açıklık çaprazlarda da geçerli oluyor.
    - Üst zikzak Ø70 mm, üst enine gergiler Ø100 mm kaldı (kullanıcı ölçü vermedi).
  - Ara kedi yolu omurga bileziği (`buildScoreboardIntermediateCatwalk`) R 0.19 → 0.225.
  - Matsing montaj fonksiyonunda ALAN 2 `carrierRadius` 0.175 → 0.21.
- **Doğrulama:**
  - `npm run build` hatasız.
  - Tava kotları omurga üstünden aynı kaldı (153 / 114 / 69 cm); mutlak kot 3.5 cm yükseldi.
  - Normal kotta tavanın tüm çubuklara boşluğu: orta 9.7 cm, sol 1.3 cm, sağ 1.2 cm, yani temas yok.
  - Kedi yolu rampalarında çaprazlarla girişim devam ediyor: orta ve sol s ≈ 29.2 ve 42.1; sağda da artık 29.5 ve 41.9.
  - Daraltılan ara destek yok. Görsel kontrol yapıldı.
- **Commit:** `[Claude] ALAN 2 taşıyıcıları: saha çevre ölçülerine göre omurga Ø420, dikme Ø111, çapraz Ø223`
- **Yarım kalan / dikkat:** Yedek: `_backups/main_before_cevre_olculeri_20261022.js`.

### 2026-10-22 10:20 — Claude — Dikme ve çapraz çapları düzeltildi
- **Kullanıcı isteği:** "dik olanın çapı 35 çaprazlar 70 sen yanlış yaptın". 10:00 kaydında "22 katı" yanlış yorumlanmıştı; doğrusu: çaprazlar dikmenin 2 katı çapta.
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardRoofTruss60m()`:
    - `photoVLegR = 0.0175`; `vStrutRadius = photoVLegR`, yani V dikmeleri Ø35 mm (eskiden Ø140).
    - `webRadius = 0.035`: örgü çaprazları Ø70 mm.
  - Ölçülen net açıklık-yükseklik ilişkisi aynı kaldığı için tava ve travers kotları değişmedi. İnce dikme yüzünden aşık ekseni ±0.766'dan ±0.712'ye kaydı.
- **Doğrulama:**
  - `npm run build` hatasız.
  - Sahneden okunan çaplar: dikme Ø35 (20 adet), çapraz ve zikzak Ø70 (57 adet), üst gergiler Ø100.
  - Tava-dikme boşlukları değişmedi: orta 10.5 cm, sol ve sağ 2.0 cm. Daraltılan ara destek yok.
- **Commit:** `[Claude] ALAN 2 taşıyıcıları: dikme Ø35, örgü çaprazları Ø70 (kullanıcı düzeltmesi)`

### 2026-10-22 10:00 — Claude — ALAN 2 taşıyıcıları: gerçek uzay kafes örgüsü
- **Kullanıcı isteği:** Fotoğraf: "taşıyıcının gerçek fotosu bu şekilde, gerçeğine göre çizebilir misin ortadaki dikmelerimizi referans alarak". Ek: "dikeyde çapraz çıkanlar direkler bizim travers koyacağımız dikeylerin tam orta noktasında buluşuyor ve onun 22 katı çapa sahip".
- **Okuma:**
  - DXF'teki gri çubuklardan düzen çıkarıldı. Her V istasyonundan sonra bir ara üst düğüm var; omurga düğümünden ileriye ve bir sonraki omurga düğümünden geriye bu düğüme çapraz iniyor; her üst düğümde enine eleman; üst düzlemde zikzak.
  - Kullanıcı ara düğümün tam orta noktada olduğunu söyledi. DXF'te 0.7–0.9 m sapma vardı; kullanıcının söylediği uygulandı.
  - "22 katı" belirsiz. V kolu çapının yarısı (Ø70) olarak yorumlandı ve kullanıcıya bildirildi.
- **Değişen dosyalar:**
  - `main.js` → `createAlan4Structure()`: YENİ `SB_TRUSS_TOP_MID_NODES`: istasyon orta noktaları; son istasyondan sonra ortalama yarım aks.
  - `main.js` → `buildScoreboardRoofTruss60m()`:
    - Eski istasyonlar arası üst X gergileri kaldırıldı.
    - YENİ "9.2.A. UZAY KAFES ÖRGÜSÜ": iki yanda ileri ve geri örgü çaprazları (Ø70, `webRadius = vStrutRadius / 2`), ara üst düğüm enine gergisi ve aşıklar arası zikzak (Ø70).
    - V kolları ve travers yerinde kaldı.
    - `webSegments` ara destek fonksiyonuna `obstacles` olarak veriliyor.
  - `main.js` → `addTrayIntermediateSupports()`:
    - YENİ `obstacles` seçeneği: bir desteğin 70 cm tablası veya kolları örgü çaprazına değerse o destekte tabla tava + 3 cm'e, kollar tava altına daraltılır.
    - Daraltılan destek sayısı `group.userData.narrowedCount`'ta. Mevcut geometride hiçbiri daraltılmadı.
  - Etiket: gösterge çizgisi üst düğüm gergisine veya zikzak kesişimine denk gelirse etiket 35 cm kaydırılıyor.
- **Doğrulama:**
  - `npm run build` hatasız.
  - Örgü çubukları eksen boyunca örneklenerek tava, destekler, kedi yolları, platformlar ve diğer yapılarla kontrol edildi. Sağ taşıyıcı temiz.
  - Orta ve solda kedi yolu rampaları (s ≈ 29.2 çıkış ve 42.1 iniş) çaprazların içinden geçiyor (bkz. Güncel Durum → Açık sorun).
  - Etiket çizgileri temiz. Görsel kontrol yapıldı.
- **Commit:** `[Claude] ALAN 2 çatı taşıyıcıları: gerçek uzay kafes örgüsü (orta düğüm çaprazları, üst zikzak)`
- **Yarım kalan / dikkat:** Yedek: `_backups/main_before_uzay_kafes_20261022.js`.

### 2026-10-22 09:00 — Claude — ALAN 2 üçgen kiriş iç yüksekliği 300 cm
- **Kullanıcı isteği:** "alan 2'deki tavaların da olduğu üçgen taşıyıcı kirişin toplam iç yüksekliği 300cm olacak şekilde güncelle"
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardRoofTruss60m()` (~satır 7810): `chordHeightH = 0.175 + 3.00 + 0.08 = 3.255` (eskiden 2.73). İç yükseklik, omurga borusu üst yüzünden üst aşık alt yüzüne kadar olan net mesafe olarak yorumlandı.
  - Ölçülen V açısı korunduğu için aşıklar ±0.65'ten ±0.766'ya açıldı (`photoVLegAxisX`). V kolları, üst gergiler ve X gergiler aşıklara bağlı olduğu için kendiliğinden uzadı. Tava etiketleri aşıkla birlikte yükseldi.
  - Tava kotları ve V kolu boşlukları değişmedi.
- **Doğrulama:** `npm run build` hatasız. Sahnede üç taşıyıcının iç yüksekliği 3.000 m ölçüldü. Y > 2.4 bölgesinde (yükselen aşık, kol ve gergiler) diğer sistemlerle çakışma kontrolü yapıldı; çakışma yok.
- **Commit:** `[Claude] ALAN 2 çatı taşıyıcıları: üçgen kiriş iç yüksekliği 300 cm`

### 2026-10-21 13:40 — Claude — Etiketler yukarı alındı, 500 mm tavalar 200 mm yükseklik
- **Kullanıcı isteği:** "biraz yukarı al. diğer sistemlerle kesişmesin ayrıca tava yüksekliklerini 50cm olan için 20cm yükseklik ver."
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardRoofTruss60m()`:
    - `trayH`: 500 mm tavalar (orta ve sol) 0.15 → 0.20; sağdaki 300 mm tava 0.25 kaldı.
    - Etiket kotu `labelY = chordHeightH + 0.08 + 0.25 + 0.405` (≈ 3.47 m). Sprite'ın alt kenarı üst aşık üst yüzünün 25 cm üstünde. Sprite'ın yatay ekseni kamera açısından bağımsız olarak hep yatay kaldığı için, alt kenar hiçbir açıda bu kotun altına inmez.
    - Gösterge çizgisi tava üst kenarından etikete uzuyor.
- **Doğrulama:** `npm run build` hatasız. Etiket ve gösterge çizgisi için çakışma kontrolü yapıldı. Yalnızca eğik çapraz gergilerin eksen hizalı kutularından kaynaklanan yanlış alarmlar çıktı; gerçek mesafeler kontrol edildi, temas yok. İki açıdan görsel kontrol yapıldı. V kolu boşlukları değişmedi (tavada kritik nokta alt kenar).
- **Commit:** `[Claude] ALAN 2: tava etiketleri aşıkların üstüne alındı, 500mm tavalar 200mm kenar yüksekliği`

### 2026-10-21 13:20 — Claude — ALAN 2 çatı taşıyıcıları: tava yükseklik etiketleri
- **Kullanıcı isteği:** "3 kedi yolunda da en yakın taşıyıcıya yakın bir yere havada duran bir label ile tavanın yüksekliğini yaz. Label bakılan açıya göre yön değiştirsin."
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardRoofTruss60m()` YENİ "3.C. TAVA YÜKSEKLİK ETİKETİ":
    - Her taşıyıcıda ilk ara desteğin (makas başına en yakın) 0.95 m üstünde `THREE.Sprite` (her zaman kameraya döner). Adı `scoreboardTrayHeightLabel_SOL/ORTA/SAĞ`.
    - Etiket ile tava üst kenarı arasında ince sarı gösterge çizgisi.
    - Metin canvas'ta: "TAVA YÜKSEKLİĞİ N cm", "<taraf> makas · G×Y tava", "taşıyıcı boru üstü → tava tabanı". Satırlar 590 px'e sığacak şekilde küçültülüyor.
    - Değer `trayBottomYNormal − 0.175` ile koddan hesaplanıyor: SOL 114, ORTA 153, SAĞ 69 cm.
    - `raycast` boş; etiket tıklama seçimine girmez.
  - `addTrayIntermediateSupports()` artık oluşturduğu grubu döndürüyor ve dönen değer kullanılıyor.
- **Doğrulama:** `npm run build` hatasız. İki farklı kamera açısından görüntü alındı; etiketler kameraya dönüyor, metin sığıyor.
- **Commit:** `[Claude] ALAN 2 çatı taşıyıcıları: kameraya dönen tava yükseklik etiketleri`

### 2026-10-21 13:00 — Claude — ALAN 2 sağ taşıyıcı: ölçülen V, traverssiz 300 x 250 tava, 3 ara destek
- **Kullanıcı isteği:** "sağ makası da yap. Onda da tavayı 300mm'ye düşür ve ona uygun yükseklikte travers kullanmadan yap. ara bağlantı 3'er tane olsun tava yüksekliği 25cm olsun"
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardRoofTruss60m()`: `trayMode` artık orta için `'travers68'`, iki yan taşıyıcı için `'traverssiz3'`; `'standart'` mod kalmadı, üç taşıyıcıda da ölçülen V. Sağ taşıyıcıda (X = +18) `trayW = 0.30`, `trayH = 0.25` ("tava yüksekliği 25 cm" kenar yüksekliği olarak yorumlandı). Tava tabanı `photoFreeTrayY` ile Y = 0.862 m (omurga üstünden 0.69 m, V kollarına her iki yanda 2 cm). Feeder demeti dar tavaya sığması için `fStep` ile sıkıştırıldı; 500 mm tavada dizilim aynı.
  - `main.js` → `addTrayIntermediateSupports()`: YENİ `trayW` seçeneği (varsayılan 0.50). Tava çeneleri `trayW/2 + 0.01`'de (eskiden sabit ±0.26). Tabla 70 cm kaldı.
- **Doğrulama:** `npm run build` hatasız. Sağ taşıyıcı: travers 0, ara destek 24, tava-V boşluğu 2.0 cm, aşıklar ±0.65. Orta ve sol taşıyıcılar değişmedi (10.5 / 2.0 cm). Çakışma kontrolünde yalnızca kedi yolu altındaki dip bölümü ile kedi yolu döşemesi ve eyer kirişi çıktı; 250 mm tavada üst kenar Y 0.43, döşeme alt yüzü Y 0.40. Görsel kontrol yapıldı.
- **Commit:** `[Claude] ALAN 2 sağ çatı taşıyıcısı: ölçülen V, traverssiz 300x250 tava, aks arası 3 ara destek`

### 2026-10-21 12:30 — Claude — ALAN 2: V istasyonları ve ara kedi yolları saha DXF'ine göre
- **Kullanıcı isteği:** `veriler/kediyolu.dxf`: yeşil = kedi yolları, mavi = kullanıcının elle boyadığı orta makas V aksları ("diğerleri de aynı seviyede"). Çizim ALAN 2 (skorbord); 3. kedi yolunda V yok, son V biraz gerisinde bitiyor. Önerilen plan onaylandı ("Evet, uygula"); V eğimi için "Düz kalsın".
- **DXF okuması** (birim cm; beton yüzü x = 37099 → s = 60, s = x/100 − 311.0): V omurga düğümleri s = 1.55, 7.25, 12.96, 18.57, 24.31, 29.94, 35.72, 41.50, 47.20, 53.02 (ortalama 5.72 m). Kedi yolları s = 27.11–28.33, 42.81–44.19 ve 57.32–58.69 (3. kedi yolu beton kaide önü; modelde beton platformu var, eklenmedi). Planda V kolları ">" şeklinde makas boyunca 0.6–0.9 m eğik; modelde düz bırakıldı.
- **Değişen dosyalar:**
  - `main.js` → `createAlan4Structure()`: YENİ `SB_TRUSS_V_STATIONS` ve `SB_INTERMEDIATE_CW_S = [27.72, 43.50]` (`buildScoreboardRoofTruss60m` hemen önünde).
  - `buildScoreboardRoofTruss60m()`:
    - `stations = SB_TRUSS_V_STATIONS` (eski 5.70 ızgara, s = 0 / 60 uç istasyonları yok).
    - `isNearDip` ve dip eyerleri kedi yolu dizisinden okunuyor.
    - `traySegments` döngüyle üretiliyor: kedi yolu ±0.80 alçak geçiş; rampa en fazla `rampL`, komşu V'ye 15 cm'den fazla yaklaşmıyor.
    - Ara destekler `[0, ...stations, 60]` açıklıklarında. `noSupportZones`: s < 1.2 (üst kedi yolu kablo sistemi / kule); yan taşıyıcılarda omurgaya asılı Matsing montajları (s 19.35–21.40, 22.35–24.40).
  - Ara kedi yolları `buildScoreboardIntermediateCatwalk(SB_INTERMEDIATE_CW_S[i])`, adlar `scoreboardIntermediateCatwalk1_27_7m` / `scoreboardIntermediateCatwalk2_43_5m`. Eskiden s = 32 / 16'daydılar; "betondan 28 m / 16 m" mesafeleri yanlış uçtan ölçülmüştü.
- **Doğrulama:** `npm run build` hatasız. Her istasyonda tava-V kolu boşluğu: orta 10.5 cm, sol 2.0 cm; sağ −4.1 cm (eski geniş V + eski 0.45 kotu, önceden de vardı). Taşıyıcı yerel ekseninde çakışma: yalnızca tava dip bölümü ile kedi yolu eyer kirişi (önceden de vardı). Ara destek sayısı orta 16, sol 24, sağ 16; orta ve solda kedi yollarına komşu açıklıklarda rampaya düşenler konmadı. Görsel kontrol yapıldı.
- **Commit:** `[Claude] ALAN 2: V istasyonları ve ara kedi yolları saha DXF'ine göre (veriler/kediyolu.dxf)`
- **Yarım kalan / dikkat:** Yedek: `_backups/main_before_dxf_istasyon_kediyolu_20261021.js`. Pafta 08 / DXF üreticileri ve görseller eski konumları gösteriyor. 11:15 kaydındaki "SORUN" bu kayıtla çözüldü.

### 2026-10-21 11:15 — Claude — ALAN 2 sol taşıyıcı: traverssiz, aks arası 3 eşit ara destek, V'den değmeden geçen tava kotu
- **Kullanıcı isteği:** "aynı alanda bir kedi yolunu ise traverssiz sadece aks aralarında 2 değil 3 taşıyıcı koy tam eşit olacak şekilde. Ama tava kotunu V aks noktasında 50cm'lik tavanın geçeceği en alt kota göre yap ama temas etmesin."
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardRoofTruss60m()`: YENİ `trayMode`: `'travers68'` (orta, X = 0), `'traverssiz3'` (sol, X = −18), `'standart'` (sağ, X = +18, değişmedi). Sol taşıyıcıya da sahadan ölçülen V uygulandı (`usePhotoV`). İstasyon traversleri, kaideleri ve çeneleri konmuyor. Tava tabanı `photoFreeTrayY` = 0.175 + (0.50 + 2 × 0.02 − 0.039) / 0.438 ≈ Y 1.319 m (omurga üstünden 1.14 m; V kolları ile her iki yanda 2 cm boşluk).
  - `main.js` → `addTrayIntermediateSupports()` (~satır 1904): YENİ `fractions` seçeneği (varsayılan [1/3, 2/3]). Sol taşıyıcı [1/4, 2/4, 3/4] kullanıyor: 5.70 m açıklıkta 1.425 m eşit aralık, toplam 29 destek (dip / rampa bölgesine düşenler konmadı).
- **Doğrulama:** `npm run build` hatasız. Sahneden okunan değerler: sol taşıyıcıda travers 0, normal kotlu tüm istasyonlarda tava ile V kolu arasındaki boşluk 2.0 cm.
- **SORUN (önceki kayıtta da var, kullanıcıya bildirildi):** s = 17.1 istasyonu, 16 m ara kedi yolu altındaki dipten çıkış rampasının (16.8 → 18.0) üzerine düşüyor. Hem orta hem sol taşıyıcıda tava bu istasyonda V kollarının içinden geçiyor: orta taşıyıcıda −14.6 cm, sol taşıyıcıda −16.7 cm (girişim). 10:30 kaydındaki "yeni çakışma yok" ifadesi yanlıştı, çünkü kontrol taşıyıcının kendi kollarını kapsamıyordu. Çözüm için kullanıcının kararı bekleniyor.
- **Commit:** `[Claude] ALAN 2 sol çatı taşıyıcısı: traverssiz, aks arası 3 eşit ara destek, V'den temassız tava kotu`

### 2026-10-21 10:30 — Claude — ALAN 2 orta taşıyıcı: sahadan ölçülen V kol açısı, 68 cm travers, yükseltilmiş tava
- **Kullanıcı isteği:** Saha fotoğrafındaki ölçüler: V kolları arası net açıklık / alttaki taşıyıcıdan yükseklik (cm): 30/60, 40/82, 50/106, 60/126, 70/152. "500mm tava kullanacağız, tavanın da yükselmesi gerekecek. Traverslerin sağ ve soldan 9'ar cm bağlantı payları var ... neredeyse 70 cm'ye çıkacaklar. Buna göre sadece bir tane kedi yolunu çizer misin."
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardRoofTruss60m()` (~satır 7786-8110), yalnızca `xOffset === 0` (ortadaki `scoreboard60mRoofCarrier`, `usePhotoV`):
    - V kolları ölçüye uyduruldu: net açıklık = 0.438 h + 3.9 cm (h omurga üstünden). Kol alt ucu ±0.09 m, üst aşıklar ±0.65 m (eskiden ±0.14 / ±1.52). Aşık kotu 2.73 m değişmedi.
    - Travers 68 cm (500 tava + 2 × 90 bağlantı payı), kolların 68 cm açıldığı kotta: Y = 1.64 m (omurga üstünden 1.46 m). Uçlarda V kolu kelepçeleri eklendi. Kaide, tava çeneleri ve `trayBottomYNormal` `trayLift` (+1.258 m) kadar yükseldi: tava tabanı Y = 1.71 m.
    - Kedi yolu altı alçak geçiş korunuyor (Y = 0.18). Kot geçiş rampaları 0.60 m yerine 1.20 m (`rampL`): 14.0→15.2, 16.8→18.0, 30.0→31.2, 32.8→34.0.
    - DC kablo kelepçeleri sabit 0.45 yerine `trayBottomYNormal` kullanıyor. Ara destekler (`addTrayIntermediateSupports`) yeni kota kendiliğinden uyuyor: 19 adet, s = 30.4 rampaya düştüğü için 1 eksildi.
  - Yan taşıyıcılar (X = ±18) değişmedi.
- **Neden / karar:** Model V'si (her kol düşeyle ~28°) gerçekte ~12.5°. 68 cm'lik travers eski V'de yaklaşık 0.6 m kotta kalırdı; ölçüye uymak için kollar ve aşıklar daraltıldı.
- **Doğrulama:** `npm run build` hatasız, konsol hatası yok. Sahneden okunan değerler: travers Y = 1.638 (11 istasyon), tava tabanı Y = 1.693–1.708, aşıklar ±0.651. Taşıyıcı yerel ekseninde çakışma kontrolü: yalnızca kedi yolu altı dip bölgesindeki önceden var olan temaslar çıktı. Görsel kontrol yapıldı.
- **Commit:** `[Claude] ALAN 2 orta çatı taşıyıcısı: sahadan ölçülen V kol açısı, 68 cm travers ve yükseltilmiş tava`
- **Yarım kalan / dikkat:** Yedek: `_backups/main_before_foto_v_kol_travers_20261021.js`. s = 0'da tava üst kedi yoluna döşemenin ~1.55 m üstünden giriyor (korkuluğun üstü). Pafta 08 ve görsel 07 eski travers kotunu gösteriyor.

### 2026-10-19 11:45 — Claude — Yazısız görseller + ofsetlerin 4 görünüşlü paftaları
- **Kullanıcı isteği:** "sadece modellediğin ofsetlerin birer görsellerini oluştur tek fotoğrafta anten tava vs görünmeden 4 farklı açıdan anlaşılır şekilde ... Ayrıca öncesinde bu görsellerin de yazıları tamamen kaldırdığın bir versiyon ver."
- **Üretilen dosyalar** (`Gorseller/`, git dışı):
  - Yazısız sürümler (aynı kamera açıları, başlık/etiket/not yok): `01_..._yazisiz.png`, `02_..._yazisiz.png`, `03_..._yazisiz.png`, `04_..._yazisiz.png`.
  - 4 görünüşlü paftalar (2×2; sol üst ön, sağ üst yan, sol alt üst, sağ alt izometrik; yazısız): `05_matsing_ofset_montaji_4_gorunus.png`, `06_gammanu_ofset_montaji_4_gorunus.png`, `07_tava_tasiyici_1_travers_4_gorunus.png`, `08_tava_tasiyici_2_ara_destek_4_gorunus.png`.
- **Yöntem:**
  - Yalnızca ofset donanımı render edildi. Anten montajlarında anten grubu çıkarıldı. Travers paftası: ALAN 1-3 s = 17.1'deki travers profili, 2 kol kelepçesi, kaide ve 2 çene (V-kollar ve bilezik hariç). Ara destek paftası: s = 19.0'daki çember, 2 kol, tabla ve 2 çene.
  - Ön / yan / üst görünüşler ortografik ve aynı ölçekte; izometrik perspektif. Görünüş eksenleri parçanın kendi çerçevesi: tava taşıyıcılarında makas yerel ekseni (X enine, Y yukarı, Z makas boyunca), anten montajlarında dünya ekseni.
  - Yalnızca render sırasında geçici olarak: metaliklik düşürüldü (ortam haritası olmadığı için borular siyah görünüyordu), ek ortam ve yön ışığı eklendi, büyük çaplı kapalı kelepçe/çember silindirleri et kalınlıklı halka olarak çizildi (taşıyıcı boru olmadan dolu disk görünmesin diye). Sahne ve `main.js` değişmedi.
- **Değişen kod:** Yok.
- **Commit:** `[Claude] Devir defteri: yazısız görseller ve 4 görünüşlü ofset paftaları kaydı`

### 2026-10-19 11:00 — Claude — Gammanu görseli farklı açıdan yeniden alındı
- **Kullanıcı isteği:** "bir tek gammanu anlaşılmıyor arkada kalan kediyolu vs yüzünden farklı bir açıdan tekrar al"
- **Değişen dosya:** `Gorseller/02_gammanu_spot_beam_anten_ofset_montaji.png` (git dışı). Görüntüye yalnızca `alan3RoofTrussAndCableTray` ana makas grubu (`children[0]`) ve Anten 1 montajı alındı; `alan3KediYolu1_23m` / `alan3KediYolu2_39m` ve kedi yolu taşıyıcı silindiri çıkarıldı. Kamera antenin önünden, biraz alttan ve sağdan (montaj merkezine göre +4.9, −1.0, −1.7 m); arka plan boş.
- **Değişen kod:** Yok.
- **Commit:** `[Claude] Devir defteri: Gammanu görseli yeniden alındı`

### 2026-10-19 10:30 — Claude — Anten ofsetleri ve tava taşıyıcıları için 4 etiketli 3D görsel
- **Kullanıcı isteği:** "bana antenlere (2 tipe göre) tava taşıyıcıları için gereken 2 tip ofset için birer tane görsel hazırla". Soru üzerine: "2 tane anten tipi için gammanu ve matsing - 2 tane tava desteği için olanlar toplam 4 tane", biçim "3D modelden görüntü".
- **Üretilen dosyalar** (proje kökü `Gorseller/`; `*.png` `.gitignore`'da olduğu için git'e eklenmedi):
  - `01_matsing_anten_ofset_montaji.png`: ALAN 1-3 makası, "Matsing 4-Beam Çatı Taşıyıcısı Asılı Ofset Montajı (Ara Bölge - 1)".
  - `02_gammanu_spot_beam_anten_ofset_montaji.png`: ALAN 4 makası, Spot Beam 30/30 Anten 1 (10 cm ofset kolu + 45° mafsal).
  - `03_tava_tasiyici_1_capraz_dikmeler_arasi_travers.png`: ALAN 1-3 makası s = 17.1 istasyon traversi (tava yarı saydam gösterildi).
  - `04_tava_tasiyici_2_ara_destek_cember_kol_tabla.png`: ALAN 1-3 makası s = 19.0 ara destek (tava yarı saydam).
- **Yöntem:** Uygulamaya dokunmadan tarayıcıda ayrı bir `THREE.WebGLRenderer` ile ilgili gruplar yalıtılarak render alındı. Etiketler 3D noktaların ekran izdüşümüne 2D canvas'ta çizildi ve geçici bir yerel sunucuyla (scratchpad, kapatıldı) PNG olarak kaydedildi. Ölçü ve adetler model kodundan: `buildMatsingTrussMidOffsetAssembly`, makas fonksiyonları, `addTrayIntermediateSupports`.
- **Değişen kod:** Yok (`main.js` değişmedi).
- **Commit:** `[Claude] Devir defteri: anten ofset ve tava taşıyıcı görselleri kaydı`
- **Yarım kalan / dikkat:** Görseller yeniden gerekirse aynı açılar için bu kayda bakın; model geometrisi değişirse görseller güncel olmaz.

### 2026-10-16 13:20 — Claude — Tüm çatı makası tavalarına 5.70 m aks + ara tava destekleri
- **Kullanıcı isteği:** "tüm tavalara uygula" (12:50 kaydındaki 5.70 m aks + ara destek). Soru üzerine kapsam olarak "Tüm alanlardaki çatı tavaları" seçildi.
- **Değişen dosyalar:**
  - `main.js` → YENİ üst düzey yardımcılar (`createAlan2RoofTrussAndCableTray` hemen önünde, ~satır 1862):
    - `TRAY_SUPPORT_AXIS_STEP = 5.70`.
    - `buildTrayStations(endS, step, zones)`: s = 0'dan 5.70 m ızgara. Bir ızgara istasyonu kedi yolu / bağlantı bölgesine (`zones`) düşerse kaldırılır, bölgenin iki kenarına istasyon konur ve ızgara bölge bitişinden yeniden başlar. Hiçbir açıklık 5.70 m'yi geçmez.
    - `addTrayIntermediateSupports(parent, stations, traySegments, opts)`: her açıklığın 1/3 ve 2/3 noktasına çember (taşıyıcı R + 0.02) + 2 dikey kol + 700 mm tabla + tava çeneleri. Tava normal kotta değilse (dip / kot geçişi), tava bitmişse ya da `noSupportZones` içindeyse destek konmaz.
  - `main.js` → ALAN 1-3 `createAlan2RoofTrussAndCableTray()`: `stationSpacing = 2.5` döngüsü → `buildTrayStations(45.0, 5.70, [[27.5, 30.0], [40.0, 42.5]])`. İstasyonlar: 0, 5.7, 11.4, 17.1, 22.8, 27.5, 30.0, 35.7, 40.0, 42.5, 45.0. 30.0 (orta kedi yolu RRU ofset boruları, `stZ_midTruss`) ve tava ucu / iniş tavası / çatı ucu kedi yolu 45° askı kolu bölgesindeki 40.0 / 42.5 korundu. Ara destekler (`alan2RoofTrayIntermediateSupports`, 14 adet): 1.9 … 38.57; `noSupportZones: [[40.0, 42.5]]`.
  - `main.js` → ALAN 4 `createAlan3RoofTrussAndCableTray()`: `zStep = 2.50` döngüsü → `buildTrayStations(45.0, 5.70, [[22.5, 25.0], [37.5, 40.0]])`. İstasyonlar: 0, 5.7, 11.4, 17.1, 22.5, 25.0, 30.7, 36.4, 37.5, 40.0, 45.0. Ara destekler (`alan3RoofTrayIntermediateSupports`, 13 adet; tava 34.8'de bitiyor).
  - `main.js` → ALAN 2 `buildScoreboardRoofTruss60m()`: 12:50'deki yalnızca X = 0 koşulu kaldırıldı. `stations = buildTrayStations(60, 5.70, [])` üç taşıyıcı için. Satır içi destek bloğu ortak `addTrayIntermediateSupports(...)` çağrısıyla değiştirildi (carrierR 0.175; görünüm aynı). Üç taşıyıcıda 20'şer destek.
- **Neden / karar:** Izgarayı s = 0'dan düz 5.70 başlatmak ALAN 1-3'te 30 m RRU istasyonunu yok ediyor ve 28.5'i kedi yolu içine, ALAN 4'te 22.8'i kedi yoluna, ALAN 1-3'te 41.4'ü iniş tavasına düşürüyordu; bu yüzden bölge kuralı eklendi. Kedi yolu iki yanındaki istasyonlar eskiden de vardı.
- **Doğrulama:** `npm run build` hatasız, konsol hatası yok. Tarayıcıda her makasın istasyon ve destek konumları sahneden okundu (yukarıdaki listeler). Çakışma kontrolü: ara desteklerin hiçbiri başka yapı veya ekipmana değmiyor. Yeni istasyonlarda yeni çakışma yok; kalan temaslar (asılı antenler, dip eyerleri, tava ucu oluğu, 42.5 istasyonu-iniş tavası) değişiklikten önce de vardı. ALAN 1-3 görsel kontrol yapıldı.
- **Commit:** `[Claude] Tüm çatı makası tavalarına 5.70 m aks aralığı ve ara tava destekleri`
- **Yarım kalan / dikkat:** Yedek: `_backups/main_before_570_tum_tavalar_20261016_1246.js`. Kablo tavası DXF'i (pafta 08) eski istasyon aralıklarını gösteriyor olabilir; güncellenmedi.

### 2026-10-16 12:50 — Claude — ALAN 2 orta çatı taşıyıcısı: 5.70 m istasyon aralığı + ara tava destekleri
- **Kullanıcı isteği:** (Ekran görüntüsü + sarı çizim) "kedi yolundaki tavanın sabitlendigi aks aralıgı 570cm haliyle tava agırlıktan dolayı egilir bu nedenle ekte sarıyla çizdigim gibi bir destek lazım. Sadece bir alandaki bir kedi yolunun destek aralıklarını 570cm yap ve bu aralıga eşit olacak şekilde 2 tane çizdigim gibi çember 2 tane dikey kol ve bi tane 70 cm yatay tabla at"
- **Tespit:** Ekran görüntüsündeki yapı ALAN 2 (kod alan4) ortadaki 60 m çatı taşıyıcısı (`scoreboard60mRoofCarrier`, X = 0). Mavi 14 DC enerji kablosu yalnızca bu taşıyıcının tavasında var; sarı korkuluklu ara kedi yolu ve kaidedeki kafes de görüntüyle uyumlu.
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardRoofTruss60m(xOffset, trussName)` (~satır 7671-7990):
    - YENİ `stationStep` / `stations`: `xOffset === 0` için 5.70 m, yan taşıyıcılar 3.0 m. İstasyonlar 0, 5.7 … 57.0; 60 m tam bölünmediği için uçta s = 60 ek istasyon.
    - V kolları + omurga bileziği + üst gergi döngüsü, tava travers kaideleri döngüsü ve DC kablo kelepçe döngüsü `for (const zSt of stations)` oldu (eskiden `zSt += 3.0`). X çapraz gergiler bir sonraki istasyona (`zNext`) bağlanıyor.
    - YENİ "3.B. ARA TAVA DESTEKLERİ" (yalnızca X = 0), grup `scoreboardTrussTrayIntermediateSupports`. Her istasyon açıklığının 1/3 ve 2/3 noktasında (5.70 m açıklıkta 1.90 m arayla): omurgayı saran çember (R 0.195, 80 mm), çemberden tablaya iki dikey kol (Ø44, hafif açılı, çizimdeki gibi), tava altında 700 × 30 × 100 mm yatay tabla ve tava kenar tespit çeneleri. Tabla üst yüzü tava tabanında (`traySegments`'ten okunan kot). Kedi yolları altındaki alçak geçiş (dip) bölgesine düşen s = 15.2 ve 32.3 noktalarına destek konmadı; orayı mevcut dip eyerleri taşıyor. Toplam 20 ara destek.
- **Neden / karar:** Kullanıcının tarifindeki "2 tane" her 5.70 m açıklığa eşit aralıkla 2 destek olarak yorumlandı; her destek = 1 çember + 2 kol + 1 tabla (çizimle uyumlu). Sol/sağ çatı taşıyıcıları değişmedi.
- **Doğrulama:** `npm run build` hatasız. Tarayıcıda: orta taşıyıcı bilezikleri 0 … 57, 60; ara destekler 1.9 … 59.0 (20 adet); yan taşıyıcı 21 bilezikle değişmedi. Çakışma kontrolünde yeni V kollar ve ara desteklerde temas yok (yalnızca önceden var olan s = 16/32 dip eyerleri ile s = 0 başlangıç temasları). Görsel kontrol yapıldı.
- **Commit:** `[Claude] ALAN 2 orta çatı taşıyıcısı: 5.70 m istasyon aralığı ve ara tava destekleri`
- **Yarım kalan / dikkat:** Yedek: `_backups/main_before_570_tava_destek_20261016_1239.js`. Pafta 08 (kablo tavası DXF) eski 3 m aralığı gösteriyor olabilir; güncellenmedi.

### 2026-10-09 10:00 — Claude — Pafta 12: ALAN 1-3 süper kolon tava planı (DXF)
- **Kullanıcı isteği:** "bana sadece super kolon üstüne ekledigimiz tavanın kesiti lazım üstten olsa yeterli"
- **Değişen dosyalar:**
  - `generate_super_kolon_tava_plan_dxf.cjs` → YENİ (kök, `generate_*.cjs` istisnası). Çalıştırma: `node generate_super_kolon_tava_plan_dxf.cjs` (`generate_all_dxfs.cjs`'e eklenmedi).
  - `DXF_Ciktilari/Milimetre/12_ALAN_1_3_SUPER_KOLON_TAVA_PLANI_mm.dxf` ve `DXF_Ciktilari/Metre/..._m.dxf` → YENİ.
- **İçerik:** `main.js` `buildSuperColumns()` (~satır 1126) içindeki tavalar, sol ve sağ süper kolon için:
  - `createSuperColTrays`: ön yüz 2600 mm, yan yüz 2682 mm (kot +3.00/+3.20) ve düşey iniş tavası (+0.225/+3.10)
  - `createBridgeTray`: köprü tavası 200 × 25541 mm (±0.00/+0.05)
  - Referans katmanında (kesik çizgi) kolon (5.0 × 7.5 m, ±7.88° dönük) ve köprü betonu dış hatları
  - Katmanlar: `SUPER_KOLON_TAVASI`, `REFERANS`, `METIN_BILGI`. Plan: yatay = model X, düşey = model −Z, orijin model X=0 / Z=0.
- **Neden / karar:** Kolon yüzü tavaları modelde duvara dik (200 mm düşeyde, 50 mm kalınlık); planda 50 mm şerit olarak çizildi, modelde olduğu gibi. Kafes üzerindeki ana tavalar (`createAlan2Structure` Sol/Sağ Kafes Tavası) kapsam dışında bırakıldı.
- **Doğrulama:** Kolon ve köprü koordinatları tarayıcıda sahneden okundu. Betik kendi hesapladığı köşeleri bu değerlerle karşılaştırıyor (`selfCheck`, 2 mm tolerans) ve kontrolü geçti. DXF: 63 varlık, NaN yok. SVG önizlemede iki kolon da kontrol edildi.
- **Commit:** `[Claude] Pafta 12: ALAN 1-3 süper kolon tava planı DXF`
- **Yarım kalan / dikkat:** Yok.

### 2026-10-09 09:30 — Claude — Pafta 11: skorbord arkası çapraz sütun + pol RRU kesiti (DXF)
- **Kullanıcı isteği:** "bana skorboard arkası için kesit lazım. RRU lar ve yeni eklenen direkler olursa yeterli farklı bir autocad dosyasının içine aktaracagım"
- **Değişen dosyalar:**
  - `generate_skorbord_arkasi_sutun_rru_kesit_dxf.cjs` → YENİ (kök; `.gitignore` `!generate_*.cjs` istisnasıyla izleniyor). `dxf_engine.cjs` `DxfBuilder` kullanır. Çalıştırma: `node generate_skorbord_arkasi_sutun_rru_kesit_dxf.cjs` (`generate_all_dxfs.cjs`'e eklenmedi).
  - `DXF_Ciktilari/Milimetre/11_ALAN_2_SKORBORD_ARKASI_SUTUN_VE_RRU_KESITI_mm.dxf` ve `DXF_Ciktilari/Metre/..._m.dxf` → YENİ.
- **İçerik:** Yalnızca `scoreboardDiagonalColumns` sütunları (iki sıra, +7.45'te kesik), 14 RRU, pol / ofset kol / destekler ve kot referans çizgileri.
  - Görünüş B-B (XY): ham model koordinatı, orijin X=0 skorbord ekseni, Y=0 alt kedi yolu döşemesi.
  - Kesit A-A (YZ, X = −3.00 sol grup): yatay = Z + 16000 mm.
  - Plan C-C (XZ, Y = +1.44): düşey = −Z − 6000 mm.
  - Katmanlar: `SKORBORD_CAPRAZ_SUTUN`, `POL_KOL_DESTEK`, `EKP_TURKCELL_RRU`, `EKP_TURK_TELEKOM_RRU`, `EKP_VODAFONE_RRU`, `REFERANS_KOT`, `EKSEN`, `OLCULER`, `METIN_BILGI`.
- **Neden / karar:** Geometri sayıları `main.js` (`createAlan4Structure` 9.5 bölümü ve `buildScoreboardStrutPoleRRUBlok`) ile birebir aynı ve betiğin başında sabit olarak yazılı. `main.js`'te bu geometri değişirse betik de güncellenmeli.
- **Doğrulama:** DXF üretildi (274 varlık, NaN yok). DXF tekrar okunup SVG önizlemeye çevrildi ve tarayıcıda görsel olarak kontrol edildi (önizleme betikleri scratchpad'de; puppeteer bu ortamda tarayıcı başlatamadı).
- **Commit:** `[Claude] Pafta 11: skorbord arkası çapraz sütun ve pol RRU kesiti DXF`
- **Yarım kalan / dikkat:** Yok.

### 2026-10-09 00:10 — Claude — Serbest uçuş: Shift hızlı uçuş takılma hatası
- **Kullanıcı isteği:** "wasd tuşları işe yarıyor ama bazen shift tuşuyla uçuş modu çalışmıyor sayfaya f5 atınca düzeliyor genelde bi yerlere vs tıklayınca ya da alt tab ile başka sekmeye gidip geri gelince tetikleniyor"
- **Kök neden:** `flyKeys.slow` sol Alt / Ctrl keydown ile açılıyor, yalnızca keyup ile kapanıyordu. Alt+Tab'da pencere odağı gittiği için Alt keyup hiç gelmiyor, `slow` açık kalıyordu. `animate()` içinde hız hesabında `slow` (3.5 m/s) `boost`u (30 m/s) eziyor, bu yüzden Shift çalışmıyor gibi görünüyordu. Ek olarak alan seçme menüsü (`#select-area`) değiştikten sonra odak menüde kalınca uçuş tuşları yok sayılıyordu.
- **Değişen dosyalar:**
  - `main.js` → "SERBEST UÇUŞ (FREE FLIGHT) VE WASD GEZİNME SİSTEMİ" (~satır 19420):
    - YENİ `syncFlyModifiers(e)`: `boost = e.shiftKey`, `slow = e.ctrlKey || e.altKey`. Her keydown/keyup'ta (input odaklıyken de) ve kanvas `pointerdown`'unda çağrılıyor; kaçan keyup bir sonraki olayda kendiliğinden düzeliyor.
    - YENİ `resetFlyKeys()`: `window` `blur` ve `document` `visibilitychange` (gizlenince) olaylarında tüm uçuş tuşlarını bırakıyor.
  - `main.js` → `#select-area` change dinleyicisi (~satır 15043) ve sunum modu `presSelectArea` change dinleyicisi (~satır 17268): seçimden sonra `blur()`.
- **Doğrulama:** `npm run build` hatasız. Panel gizli olduğu için tarayıcıda rAF çalışmadı. Bunun yerine `main.js`'teki uçuş tuş kodu aynen çıkarılıp Node'da sahte olaylarla 7 senaryo test edildi (betik scratchpad'de: `test_flykeys.cjs`). Yeni kod 7/7 geçti; eski kod (HEAD) Alt+Tab, kaçan Alt keyup, sekme gizlenmesi ve kanvas tıklaması senaryolarında kaldı, yani hata yeniden üretildi ve düzeldi. Tarayıcıda alan değiştikten sonra odağın BODY'ye döndüğü doğrulandı.
- **Commit:** `[Claude] Serbest uçuş: Alt+Tab sonrası Shift hızlı uçuşun çalışmaması düzeltildi`
- **Yarım kalan / dikkat:** Yok.

### 2026-10-08 23:55 — Claude — taslak-v2: skorbord arkası POI rack konumları
- **Kullanıcı isteği:** "skorboard arkasındaki poı grubunun konumunu fotograflardaki konumlara göre güncelle ve taslak versiyon 2 ye yaz". Kullanıcı, özellikler panelinin iki ekran görüntüsünü gönderdi.
- **Okuma:** Panelde kırmızı etiket panel açıldığı andaki konumu (`obj.position`), giriş kutusu kullanıcının girdiği değeri gösterir. Hedef olarak giriş kutusundaki değerler alındı.
- **Değişen dosyalar:**
  - `main.js` → `PRESET_DRAFTS['taslak-v2']` alan4, iki `4poi-rack-blok` girdisi (~satır 18502, 18528):
    - Sol (#214, rotation.y = 90°): (−3.2475, 20, −0.9200) → (−3.173, 20, −0.511)
    - Sağ (#219, rotation.y = 270°): (3.1500, 20, −0.9024) → (3.150, 20, −0.501)
- **Doğrulama:** `npm run build` hatasız. Tarayıcıda yeni konumlar doğrulandı: sol X −3.52…−2.82, Z −0.82…−0.20; sağ X 2.80…3.50, Z −0.81…−0.19. Pol RRU blokları, sütunlar ve korkuluklarla çakışma yok. Yalnızca eski konuma göre çizilmiş feeder dağıtım kanalı kutularıyla ~1 cm kenar teması var.
- **Commit:** `[Claude] taslak-v2: skorbord arkası POI rack konumları güncellendi`
- **Yarım kalan / dikkat:** Feeder sistemi eski POI konumuna bağlı (bkz. Güncel Durum → Açık konu).

### 2026-10-08 23:45 — Claude — Pol RRU'ları: yatay pol, aynı kotta yan yana paralel (önceki kayıt düzeltildi)
- **Kullanıcı isteği:** "böyle demedim ben maymun muyum en üstteki rruya ulaşayım rrular kısa kenarlarından yan yana takılacak kedi yolunun korkulugunun biraz üstünde olacaklar ve yan yana kısa kenarlarından birbirine paralel duracaklar". 23:30 kaydındaki üst üste (düşey) dizilim YANLIŞ ANLAMAYDI ve geri alındı.
- **Kalıcı karar:** RRU'lar asla üst üste dizilmez; erişilebilir tek kotta, korkuluğun biraz üstünde, yan yana durur (bkz. "3. Kalıcı Kararlar").
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardStrutPoleRRUBlok(side)` (~satır 13096) baştan yazıldı (başlık yorumu dahil). Blok tipi ve preset girdileri aynı.
    - Pol YATAY (X yönünde, korkuluğa paralel), Y = 1.44. Tüm RRU'lar aynı kotta: Y = 1.20–1.68 (korkuluk üst kotu 1.10).
    - RRU'lar kitap gibi yan yana ve paralel: genişlik Z yönünde, kısa kenar kelepçesi pola dönük, adım 0.20 m. Her RRU'da pol üstünde eyer kelepçesi var.
    - Ön pol: Z = −1.21, ön sıra bacağının iç yüzünden (X = s*2.746) s*1.88'e konsol. Bacağa bilezik kelepçeli; sütundan (Y = 2.40) pol ucuna çapraz destek. 4 RRU: X = s*2.62 / 2.42 / 2.22 / 2.02 (Turkcell 5301, Turkcell 5502, TT 5527, TT 5818W). Skorborda uzanır, Z = −1.29…−1.69.
    - Arka pol: Z = −0.06, X = s*2.48…s*3.32. Arka sıra bacağına X = s*3.00'te yatay ofset kol + aynı düşey düzlemde çapraz destek (sütun Y = 2.20). 3 Vodafone: X = s*3.22 (kolun dışı), s*2.78, s*2.58 (kolun içi). Dışa uzanır, Z = 0.02…0.45. Gemici merdiveni iniş açıklığı X = −2.40'tan başlıyor; sol iç uç X = −2.48.
  - Değişiklik `.cjs` betiğiyle (işaretler arası blok değişimi, CRLF korunarak) yapıldı; betik scratchpad'de, projede değil.
- **Doğrulama:** `npm run build` hatasız. Tarayıcıda 14 RRU ölçüldü (hepsi Y = 1.20–1.68). Sütun ekseni mesafesi dahil çakışma kontrolü temiz (yapı + diğer platformlar).
- **Commit:** `[Claude] Pol RRU'ları yatay pola, korkuluğun biraz üstünde yan yana paralel dizildi`
- **Yarım kalan / dikkat:** Feeder güzergahları ve DXF güncellenmedi.

### 2026-10-08 23:30 — Claude — Pol RRU'ları korkuluk üstüne, kısa kenardan kitap dizilimi
- **Kullanıcı isteği:** "kedi yolunun korkuluklarının altında kalma ve rruları kısa kenarlarından pole tuttur. Böylece daha az alan kaplar. Ayrıca kedi yolunda çizimlerimizde olmayan aydınlatma vs cihazlar var o yüzden korkuluk seviyesinin üstünde kal". Soru üzerine "Kitap gibi, kedi yoluna dik" dizilimini seçti.
- **Değişen dosyalar:**
  - `main.js` → `buildScoreboardStrutPoleRRUBlok(side)` (~satır 13096-13230). Blok tipi ve preset girdileri aynı, yalnızca iç yerleşim değişti:
    - RRU'lar alt kedi yolu korkuluğu üst kotunun (Y = 1.10) üstünde: alt kenar Y = 1.20, kat aralığı 0.60 m (`levelY(i)`), hepsi tek sıra üst üste.
    - Kitap dizilimi: RRU genişliği Z yönünde (korkuluğa dik), kısa kenardaki kelepçe pola dönük (`rotation.y = -extendZ * 90°`). Kedi yolu boyunca X kalınlığı ~14 cm.
    - Ön pol: X = s*2.60, Z = −1.21 (ön korkuluk Z = −1.30'un 9 cm içi, korkuluk kotunun üstünde), Y = 1.10–3.55. 4 RRU skorborda doğru uzanıyor (Z = −1.29…−1.69; iskelet −1.70). Sıra: Turkcell 5301, Turkcell 5502, TT 5527, TT 5818W (alttan üste).
    - Arka pol: X = s*2.60, Z = −0.02, Y = 1.10–2.98. 3 Vodafone 5526t dışa uzanıyor (Z = 0.06…0.49).
    - Kollar Y = 1.14 / 2.34 / 3.50 (ön) ve 1.14 / 2.34 / 2.94 (arka), RRU aralıklarında. `buildPole()` imzası değişti: `(poleX, poleZ, strutBaseZ, strutBaseY, poleBotY, poleTopY, armYs, extendZ, rrus, poleLabel)`.
- **Doğrulama:** `npm run build` hatasız. Tarayıcıda 14 RRU'nun konumları ölçüldü (yukarıdaki değerler). Sütun ekseni mesafesi dahil çakışma kontrolü temiz. Sol RRU'lar X ≤ −2.53, gemici merdiveni −2.40'tan başlıyor.
- **Commit:** `[Claude] Sütun pol RRU'ları korkuluk üstüne alındı, kısa kenardan kitap dizilimi`
- **Yarım kalan / dikkat:** Ön poldeki en üst RRU 3.48 m'de; kedi yolundan erişim için merdiven/platform gerekebilir. Feeder güzergahları güncellenmedi.

### 2026-10-08 23:15 — Claude — 7'li RRU grupları kedi yolundan sütunlara ofset kollu pollere taşındı
- **Kullanıcı isteği:** "7 li rru gruplarımız var ancak reelde kediyolunda bu rruları koyacak bir alan bulunmuyor bu nedenle yeni ekledigimiz taşıyıcı sutunlara ofset ile bir montaj polu asacagız rruları ise bu pol üzerine takacagız". Sorular üzerine verdiği kararlar: sağda ve solda kedi yoluna en yakın, daha dik duran sütunların (±3 m dikey bacaklar) hem ön hem arka sırasına yük dağılımı için birer pol; kedi yolundan dışarı çıkmadan erişim; bir pola 4, diğerine 3 RRU.
- **Değişen dosyalar:**
  - `main.js` → YENİ `buildScoreboardStrutPoleRRUBlok(side)` (~satır 13096), blok tipi `alan2-sutun-ofset-pol-7rru`, ad `Sütun Ofset Pol 7 RRU Grubu - Sol/Sağ`. Blok orijini (s*3.00, 20, −0.70), kilitli. İçeriği:
    - Ön pol: X = s*2.15, Z = −1.50. Ön sıra bacağı yanında; ön korkuluk (Z = −1.30) ile skorbord arka iskeleti (Z = −1.70) arasında. 4 RRU: alt kat (Y = 0.70) Turkcell RRU5301 + RRU5502, üst kat (Y = 1.35) TT RRU5527 + RRU5818W, polün iki yanında.
    - Arka pol: X = s*3.00, Z = +0.10. Arka sıra bacağının önünde, arka korkuluğun (Z = −0.10) hemen dışında. 3 Vodafone RRU5526t: alt katta 2, üst katta 1 (kedi yolu merkezine bakan yanda). Sol tarafta gemici merdiveni X = −2.4'te başlıyor, RRU'lar X ≤ −2.49'da kalıyor.
    - Ø76 mm pol (Y = 0.20–1.95), her polde 3 ofset kol (Ø48, Y = 0.30 / 1.03 / 1.80). Kollar Ø508 sütunu saran bilezik kelepçelere bağlı; sütun ekseni `scoreboardDiagonalColumns` ile aynı formül (8° eğim).
    - RRU'lar `buildCustomEquipmentModel()` ile, ince yüzü korkuluğa paralel; kelepçe tarafı pola dönük (dir < 0 ise 180° döndürülür).
  - `main.js` → `deserializeItemToArea()` (~satır 17377): yeni blok tipi eşlemesi (taraf `item.side` ya da isimdeki "Sağ" ile belirlenir).
  - `main.js` → `PRESET_DRAFTS['taslak-v2']` alan4 (~satır 18522, 18549): iki `alan2-alternatif2-rru-blok` girdisi ("Tablalı 4 Boru 7 RRU Bloğu - Sol/Sağ POI Yanı") kaldırıldı, yerine iki `alan2-sutun-ofset-pol-7rru` girdisi eklendi. POI rack'leri kedi yolunda kaldı. `buildAlan2Alternatif2RRUBlok` fonksiyonu duruyor; eski JSON'lar yüklenebilir.
- **Doğrulama:** `npm run build` hatasız. Tarayıcıda iki blok yüklendi, eski bloklar yok. Çakışma kontrolünde (ekipman, korkuluk, gemici merdiveni, POI rack'leri, sütunlar) yalnızca kolların sütun yüzeyine bağlandığı temas noktaları çıktı.
- **Commit:** `[Claude] ALAN 2 7'li RRU grupları kedi yolundan sütunlara ofset kollu pollere taşındı`
- **Yarım kalan / dikkat:** Yedek: `_backups/main_before_sutun_pol_rru_20261008_2241.js`. Feeder kablo güzergahları (`scoreboardFeederCablingSystem`) eski RRU konumlarına göre çizilmiş olabilir; güncellenmedi. DXF çıktıları güncellenmedi.

### 2026-10-08 23:00 — Claude — Skorbord çapraz sütunları: üst kesim + ön silindire ikinci sıra
- **Kullanıcı isteği:** "bu direklerin üst kedi yolunu geçen kısmını sil" ve "skorboard ve kedi yolu 2 tane ana taşıyıcı yatay silindire yerleşmiş ya bu dikey borulardan arkasındaki silindire de koy". Soru üzerine kullanıcı "aynı setin tamamı" seçeneğini seçti.
- **Değişen dosyalar:**
  - `main.js` → `createAlan4Structure()` "9.5. SKORBOARD ARKASI ÇAPRAZ KALIN TAŞIYICI SÜTUNLAR" (~satır 8167-8280), `scoreboardDiagonalColumns`:
    - Set üretimi `buildSbStrutSet(pipeZ, baseZ, baseY, plateDepth, deckSleeve)` fonksiyonuna taşındı. Doğrultular aynı (tasarım üst kotu `sbStrutDesignTopY` = 12.5), tüm borular `sbStrutCutY` = 7.45'te (üst kedi yolu döşemesi Y = 7.50 altı) kesilip flanşla bitiyor. Uzun çapraz bilezikleri alttan 2.70 / 3.25 / 3.80 m mesafede (eskiden oransal).
    - Arka sıra: Silindir 2, `buildSbStrutSet(0.55, 0.55, -0.12, 0.80)`; geometri önceki kayıtla aynı.
    - Ön sıra (YENİ): Silindir 1, `buildSbStrutSet(-1.67, -1.42, -0.14, 0.55, true)`. Taban ekseni Z = −1.42'ye kaydırıldı, çünkü skorbord arka iskeleti Z ≤ −1.70; alt kedi yolu ön kenarı Z = −1.30, aradaki 0.36 m boşluğa Ø508 sığmıyor. Plaka derinliği 0.55 m.
    - Ön sıranın ±3 m dikey bacakları alt kedi yolunun ön kenar kirişi ve korkuluğundan geçiyor; döşeme kotunda geçiş bileziği var (`deckSleeve`). Ön sıranın üst uçları üst kedi yolu döşemesinin hemen altında bitiyor (döşemeyi taşıyormuş gibi).
- **Doğrulama:** `npm run build` hatasız. Tarayıcıda iki sıra ve kesim kontrol edildi. Örnekleme ile çakışma kontrolü yapıldı: yalnızca yukarıdaki bilinçli geçişler var; RRU/POI ekipmanı, gemici merdiveni ve kablo tavası ile çakışma yok.
- **Commit:** `[Claude] Skorbord çapraz sütunları üst kedi yolunda kesildi, ön silindire ikinci sıra eklendi`
- **Yarım kalan / dikkat:** Yedek: `_backups/main_before_sutun_kesim_ikinci_set_20261008_2231.js`. İstenirse alt kedi yolu korkuluğuna sütun hizasında boşluk açılabilir.

### 2026-10-08 22:50 — Claude — ALAN 2 skorbord arkasına çapraz kalın taşıyıcı sütunlar
- **Kullanıcı isteği:** Skorbord arkasından uzaktan çekilmiş fotoğraftaki "önde olan çapraz kalın taşıyıcı sütunların" eklenmesi. Claude fotoğraftaki düzeni anlattı, kullanıcı "kodla" diyerek onayladı.
- **Değişen dosyalar:**
  - `main.js` → `createAlan4Structure()` içinde, `alan4Group.add(scoreboardIntermediateCw2)` satırından hemen sonra YENİ bölüm "9.5. SKORBOARD ARKASI ÇAPRAZ KALIN TAŞIYICI SÜTUNLAR" (~satır 8167). Grup adı `scoreboardDiagonalColumns`. Simetrik (s = ±1):
    - Uzun çapraz: alt uç X = ±5.55, üst uç X = ±10.80 / Y = 12.5, alt bölümde 3 bilezik, üstte flanş.
    - Dallanan düğüm A/B: X = ±3.00, Y = 7.00 (skorbord üst kenarı), Ø0.84 küre göbek. Dikey bacak (X = ±3.00) + dış çapraz bacak (alt X = ±5.25) + dışa eğimli üst kol (üst X = ±5.00, Y = 12.5).
    - Alt uçlar Silindir 2 (Ø1.5 m, Y = −0.95, Z = +0.55) üzerinde kelepçe bandı + taban plakası (Y = −0.12).
    - Boru Ø508 mm, `pipeWhiteMat`; bilezik/flanş `flangeSteelMat`.
    - Düzlem +Z yönüne 8° eğik (`sbStrutLean`): düğüm Z ≈ 1.55; üst kedi yolu (Z ≤ 0.80) ve gemici merdiveni (X = −2.4…−1.1) ile çakışmaz.
- **Neden / karar:** Ölçüler fotoğraftan tahmini (perspektif, ~88 px/m). Üst uçlar Y = 12.5'te flanşla bitiyor; çatı modelde olmadığından bağlandığı eleman yok. Kullanıcı ölçü verirse `sbP()` koordinatları ve `sbStrutR` güncellenebilir.
- **Doğrulama:** `npm run build` hatasız. Tarayıcıda görüldü. Bounding box kontrolüyle kablo tavası, braketler, üst kedi yolu, gemici merdiveni ve 60 m taşıyıcı ile gerçek çakışma yok.
- **Commit:** `[Claude] ALAN 2 skorbord arkasına fotoğraf bazlı çapraz taşıyıcı sütunlar eklendi`
- **Yarım kalan / dikkat:** Yedek: `_backups/main_before_skorbord_capraz_sutun_20261008_2226.js`. DXF çıktıları (`generate_*.cjs`) bu sütunları içermiyor.

### 2026-10-08 22:40 — Claude — ALAN 1-3 kafes özellikleri ALAN 2 ve ALAN 4'e uygulandı
- **Kullanıcı isteği:** "alan 1 3 ... beton üzerindeki kafeslerin özelliklerini diger iki alanda da uygula ama alan-4 de kafes küçük oldugundan reklam brandasını da ona göre hızala logoyu ortala"
- **Değişen dosyalar:**
  - `main.js` → YENİ `addLouverCage(parentGroup, opts)` (~satır 5030): ALAN 1-3'teki `addLouverEnclosure()` (~satır 1355) özelliklerinin parametrik hali. Menfez paneller (ön/arka/yan, üst bant + alt), yan alt cephede ön yarı arkaya kayan kapı (ilgili `alanXSlidingDoors` dizisine eklenir), 1.70 m kaide kirişi, kolon braketleri, kafes boyutunda reklam brandası (logo oranı korunur, genişliğin %80'i / yüksekliğin %60'ı sınırında ortalanır). `backDir` ile ön cephenin +Z ya da -Z'ye bakması desteklenir (ALAN 2'de ön cephe -Z; branda 180° döndürülür).
  - `main.js` → `createAlan3Structure()` (ALAN 4, ~satır 5480-5545): yan ve arka camlar kaldırıldı (direkler kaldı), `addLouverCage(alan3Group, …)` çağrısı eklendi. Yükseklik 4.0 m, branda 2.50 × 4.0 m, yan braket X = 0 sütunundan.
  - `main.js` → `createAlan4Structure()` içindeki `buildSideStationEnclosureWithEquipment()` (ALAN 2, ~satır 8600-8660): yan ve arka camlar kaldırıldı, her iki kafes için `addLouverCage(concreteGroup, …)` çağrısı eklendi. Yükseklik **3.80 m** (kolon başlık kirişi Ø400, merkez baseGroundY + 4.0 m; alt yüzüne kadar). İç kolon ±15, yan kolonlar -21/-9 ve +9/+21.
  - `main.js` → kafes tıklama algılama (~satır 14276): sabit `alan2Structure` yerine aktif alanın strüktürü (`state.currentArea + 'Structure'`).
  - `main.js` → "Kafes Panelleri" popup mantığı (~satır 19360): yeni `forEachCageStructure()`; ön üst / yan-arka üst / alt cephe kapı-menfez / branda düğmeleri üç alanın kafeslerine birlikte uygulanır. Branda düğmesi adı `reklam_brandasi` ile başlayan tüm brandaları bulur.
- **Neden / karar:** ALAN 1-3 kodu (`addLouverEnclosure`) değiştirilmedi; görünümü aynı kaldı. Ön kayar kapı düzenleri her alanda korundu. Kullanıcı yan/arka cam ve ALAN 2 yüksekliği sorularını yanıtlamadı; ALAN 1-3 ile tutarlı olarak camlar menfeze çevrildi, ALAN 2'de kirişe çarpmamak için 3.80 m seçildi.
- **Doğrulama:** `npm run build` hatasız; tarayıcıda üç alan kontrol edildi (ALAN 4 branda ortalı, ALAN 2 branda doğru yönde, yan kapı kayıyor, ALAN 1-3 değişmedi), konsol hatası yok.
- **Commit:** `[Claude] ALAN 1-3 kafes özellikleri ALAN 2 ve ALAN 4'e uygulandı`
- **Yarım kalan / dikkat:** Yedek: `_backups/main_before_kafes_alan3_alan4_20261008_2211.js`. Kafes ayarları menüsü üç alanı birlikte yönetir (alan bazında ayrı durum yok).

### 2026-10-08 18:30 — Claude — Antigravity kaydı denetlendi, commit alanı kuralı netleştirildi
- **Kullanıcı isteği:** "Antigravity ne yaptı?" Devir sisteminin iki yönlü testi.
- **Devralma kontrolü:** Antigravity'nin 18:19 kaydı git ile uyumlu (`184b42b`, tek dosya: `AJAN_DEVIR.md`, +22/-1). Kökte geride bırakılmış betik yok. Kayıt protokole uygun.
- **Değişen dosyalar:**
  - `AJAN_DEVIR.md` → Protokol madde 6'ya commit alanının nasıl doldurulacağı eklendi; Güncel Durum güncellendi.
- **Neden / karar:** Hem Claude'un hem Antigravity'nin kaydında commit alanı belirsiz kalmıştı ("hash için git log", "commit edilecek"). Hash commit'ten önce bilinemez; bunun yerine commit mesajı yazılacak.
- **Doğrulama:** Kod değişmedi, build gerekmez.
- **Commit:** `[Claude] Devir protokolü: commit alanı netleştirildi`
- **Yarım kalan / dikkat:** Yok. Devir sistemi iki yönde de test edildi ve çalışıyor.

### 2026-10-08 18:19 — Antigravity — Bağımlılık listesinin devir defterine eklenmesi
- **Kullanıcı isteği:** package.json'daki bağımlılıkların AJAN_DEVIR.md'ye Kalıcı Kararlar altına eklenmesi.
- **Değişen dosyalar:**
  - `AJAN_DEVIR.md` → Güncel Durum ve Günlük güncellendi, Kalıcı Kararlar altına "Bağımlılıklar" eklendi.
- **Neden / karar:** Kullanıcı talebi.
- **Doğrulama:** Dosya değişikliği node scriptiyle yapıldı.
- **Commit:** (commit edilecek)
- **Yarım kalan / dikkat:** Yok.


### 2026-10-08 — Claude — Ajan devir sistemi kuruldu
- **Kullanıcı isteği:** Claude Code ve Antigravity arasında, birbirlerinin yaptığı değişiklikleri istisnasız aktaran ortak bir rehber alanı oluşturulması.
- **Değişen dosyalar:**
  - `AJAN_DEVIR.md` → YENİ. Bu dosya (protokol + güncel durum + günlük).
  - `CLAUDE.md` → "Ajan devri" bölümü eklendi; yayın akışı netleştirildi (GitHub → Cloudflare), "Açık nokta" bölümü kaldırıldı.
  - `.antigravity/instructions.md` → Sonuna "6. Ajan Devri" bölümü eklendi (mevcut içerik değiştirilmedi).
  - `AGENTS.md` → YENİ. Antigravity ve diğer ajanların otomatik okuduğu kısa yönlendirme dosyası.
  - `AI_DEVELOPER_GUIDE.md` → 3.2'deki "GitHub Pages" bilgisi güncellendi; devir defteri referansı eklendi.
- **Neden / karar:** Kullanıcı yayını şöyle yapıyor: `git push` → GitHub (`okancodeshere/gsstad`) → Cloudflare otomatik çekip yayınlıyor. Yani **`git push` = canlıya çıkış**; kullanıcı onayı olmadan asla yapılmaz. `npm run deploy` (doğrudan wrangler) kullanılmıyor.
- **Doğrulama:** Kod değişmedi; önceki `npm run build` hatasız.
- **Commit:** bu kayıtla birlikte commit edildi (hash için `git log`).
- **Yarım kalan / dikkat:** Yok.

---

## 3. KALICI KARARLAR (kullanıcının kuralları, iki ajan da uyar)

- **Yayın:** GitHub'a push → Cloudflare GitHub'dan otomatik çeker. `git push` canlıya çıkış demektir, açık kullanıcı onayı şart.
- **İki ajanlı çalışma:** Claude Code ve Antigravity sırayla kullanılır; her ajan bu dosyayı okuyup güncellemek zorunda.
- **Alan isimleri:** kod `alan2` = UI ALAN 1 ve 3, kod `alan4` = UI ALAN 2, kod `alan3` = UI ALAN 4.
- **`alan4` cam korkuluk dikmeleri** 1.5 m sabit ızgarada, X=0 merkezli kalır (`frontRailingSpans`).
- **Varsayılan yerleşim:** `main.js` içindeki `PRESET_DRAFTS['taslak-v2']`.
- **Erişilebilirlik:** Kedi yolundaki ekipman (RRU vb.) kedi yolundan elle erişilebilir olmalı. Üst üste yüksek dizilim yapılmaz. RRU'lar korkuluğun biraz üstünde, tek kotta, kısa kenarlarından yan yana ve paralel (kitap gibi) takılır.
- **Kedi yolu korkuluk altı:** Korkuluk seviyesinin altına ekipman konmaz; çizimlerde olmayan aydınlatma vb. cihazlar var.
- **Belirsiz tarifte:** Kullanıcının tarifi birden fazla şekilde okunabiliyorsa önce sor; tahminle büyük yerleşim değişikliği yapma.


### Bağımlılıklar
- `dxf-writer`: ^1.18.4
- `three`: ^0.160.0
- `xlsx`: ^0.18.5
- `pptxgenjs`: ^4.0.1 (dev)
- `puppeteer`: ^25.12.0 (dev)
- `vite`: ^6.0.0 (dev)
- `wrangler`: ^4.120.0 (dev)

