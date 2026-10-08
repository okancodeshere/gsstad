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

- **Son güncelleyen:** Claude Code, 2026-10-08
- **Son commit:** `[Claude] Skorbord çapraz sütunları üst kedi yolunda kesildi, ön silindire ikinci sıra eklendi`
- **Build durumu:** `npm run build` hatasız.
- **Yarım kalan iş:** Yok. Son üç commit (kafesler, çapraz sütunlar, sütun revizyonu) push edilmedi; kullanıcı onayı bekliyor.
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


### Bağımlılıklar
- `dxf-writer`: ^1.18.4
- `three`: ^0.160.0
- `xlsx`: ^0.18.5
- `pptxgenjs`: ^4.0.1 (dev)
- `puppeteer`: ^25.12.0 (dev)
- `vite`: ^6.0.0 (dev)
- `wrangler`: ^4.120.0 (dev)

