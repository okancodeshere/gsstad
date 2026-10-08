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
6. Kayıt **istisnasız** şunları içermeli: hangi dosya, hangi fonksiyon/bölüm (`main.js` için fonksiyon adı + yaklaşık satır), ne değişti, neden, build sonucu, commit hash'i.

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
- **Son commit:** _(bu kaydın commit'i, bkz. günlük)_
- **Build durumu:** `npm run build` hatasız.
- **Yarım kalan iş:** Yok.
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
