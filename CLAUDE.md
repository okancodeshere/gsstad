# GS STAD Catwalk Planner

Galatasaray Stadyumu çatı kedi yolu / skorboard bölgeleri için telekom ekipmanı 3D yerleşim planlayıcısı.
Vanilla JS + Three.js + Vite. Framework yok.

## Önce oku
Projenin mimarisi, alan isim eşleşmeleri ve geçmişte yaşanan hatalar bu dosyada:
@AI_DEVELOPER_GUIDE.md

Değişiklik yapmadan önce bu rehberdeki kurallara uy.

## Ajan devri (ZORUNLU)
Bu projede Claude Code ve Google Antigravity sırayla çalışır; kullanıcı kota bitince ajan değiştirir. Ortak iletişim kanalı:
@AJAN_DEVIR.md

- Oturum başında `AJAN_DEVIR.md`'yi oku, `git status` / `git log` ile son kayıtla karşılaştır. Uyuşmazlık varsa önceki ajanın kotası yarıda bitmiştir; `git diff`'i incele ve "Devralma notu" yaz.
- Çok adımlı bir işe başlamadan önce "Güncel Durum → Yarım kalan iş" alanına planı yaz.
- Her anlamlı değişiklikten hemen sonra günlüğe kayıt ekle (dosya, fonksiyon, ne/neden, build, commit). Oturum sonunu bekleme; kota her an bitebilir.
- Kodu ve `AJAN_DEVIR.md`'yi aynı commit'te topla; commit mesajı `[Claude] ...` ile başlar.

## Ortam
- İşletim sistemi: Windows. Komutlar PowerShell'de çalışır; yol ayırıcı `\`, yollarda boşluk var (`D:\yedek programlar\...`), tırnak kullan.
- Node 24, paket yöneticisi npm.

## Komutlar
- `npm run dev`: Vite geliştirme sunucusu. Arka planda başlat, adresi kullanıcıya bildir.
- `npm run build`: `dist/` klasörüne derler. Her kod değişikliğinden sonra derlemenin hatasız geçtiğini kontrol et.
- `npm run export:dxf`: Tüm DXF çıktılarını üretir (`generate_all_dxfs.cjs`).
- `npm run deploy`: Kullanılmıyor (doğrudan wrangler). Yayın akışı aşağıda.

## Yayın
`git push` → GitHub (`okancodeshere/gsstad`) → Cloudflare GitHub'dan otomatik çekip yayınlar. Yani **push = canlıya çıkış**.

## Çalışma kuralları
- **`main.js` düzenleme:** Dosya çok büyük ve CRLF/LF karışık. `sed` veya çok satırlı regex kullanma. Ya Edit aracıyla küçük, benzersiz parçaları değiştir ya da `fs.readFileSync` + basit `replace()` kullanan bir `.cjs` betiği yaz. Değişiklikten sonra dosya boyutunun beklenmedik şekilde küçülmediğini kontrol et.
- **Yedek:** `main.js`, `index.html` veya `style.css` üzerinde büyük bir değişiklikten önce `_backups/` klasörüne zaman damgalı kopya al.
- **Tek seferlik betikler:** Geçici `.cjs` düzeltme betiklerini proje köküne bırakma; iş bitince sil ya da `scripts/` altına taşı.
- **Asset yolları:** `import.meta.env.BASE_URL + 'dosya.png'` kullan, mutlak `/dosya.png` kullanma. Dış görsellerde `crossOrigin = 'anonymous'`.
- **Git:** `.gitignore` `*.png` ve `*.zip` dosyalarını yok sayar; yeni bir görsel eklendiyse `git add -f` ile ekle.

## Onay gerektiren işlemler
Şunları yapmadan önce kullanıcıya ne yapacağını söyle ve açık onay bekle:
- `git push` (siteyi canlıya alır)
- `npm run deploy`
- `git reset --hard`, `git clean`, dosya silme gibi geri alınamayan işlemler

`git commit` serbesttir, ancak commit mesajını Türkçe ve açıklayıcı yaz, commit öncesi `git status` ile neyin ekleneceğini kontrol et.
