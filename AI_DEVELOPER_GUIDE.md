# GS STAD Catwalk Planner - AI & Developer Guide

Bu belge, projeye sonradan dahil olacak diğer yapay zeka asistanları (Cursor, Copilot, vs.) veya geliştiriciler için **projenin mimarisini, geçmişte çözülen kronik sorunları ve geliştirme kurallarını** içermektedir. Lütfen projede değişiklik yapmadan önce bu belgeyi okuyun.

## 1. Proje Özeti ve Mimari
- **Amaç:** Galatasaray Stadyumu çatı kedi yolu (catwalk) ve skorboard bölgelerine yerleştirilecek telekomünikasyon ekipmanlarının (Anten, RRU, POI, Rectifier, Kafesler) 3 boyutlu konfigüratörü.
- **Teknoloji:** Vanilla JavaScript, Three.js (WebGL), HTML5 Canvas, Vite. (React, Vue vb. bir framework kullanılmamaktadır).
- **Ana Dosyalar:**
  - `main.js`: Projenin kalbi. 3D sahnenin kurulumu, tüm geometrilerin (Alan 2, Alan 3, Alan 4) prosedürel olarak çizilmesi, Raycaster ile tıklama işlemleri, UI etkileşimleri ve JSON tabanlı import/export işlemleri tek bir monolitik yapıda yer alır.
  - `index.html`: Arayüz (UI) elemanlarını barındırır.
  - `style.css`: UI tasarımları.
  - `vite.config.js`: Projeyi paketlemek ve GitHub Pages'e uyumlu hale getirmek için kullanılır.

## 2. Alanlar (Areas) ve Görünürlük Mantığı
Proje 3 ana bölgeden oluşur ancak kod içerisindeki isimlendirmelerle arayüzdeki isimler arasında tarihi sebeplerle şu eşleşmeler vardır:
- `alan2` (Kod) = **ALAN 1 ve ALAN 3 (Maraton Tribünü ve Kedi Yolu)** (Arayüz)
- `alan4` (Kod) = **ALAN 2 (Scoreboard Kesiti + Kediyolu)** (Arayüz)
- `alan3` (Kod) = **ALAN 4 (Çapraz Köşe Tribün)** (Arayüz)

**Kritik Kural:** Alanlar arası geçiş yapıldığında veya `loadProjectFromData()` fonksiyonu tetiklendiğinde (örneğin JSON yüklendiğinde), yalnızca seçili alanın Three.js Group objesi (`alan2Group`, `alan3Group`, `alan4Group`) `visible = true` yapılır, diğerleri `false` yapılır.

## 3. Yapay Zeka (AI) İçin Kritik Uyarılar (Geçmiş Hatalar)

### 3.1. Dosya Düzenleme ve Regex Tehlikesi
`main.js` dosyası oldukça büyük bir dosyadır ve Windows/Linux arası satır sonu karakterleri (`\r\n` vs `\n`) barındırır. 
**DİKKAT AI:** `main.js` üzerinde `sed` veya terminal üzerinden çok satırlı Regex manipülasyonu (replace) **YAPMAYIN**. Geçmişte bu durum dosyanın yarısının silinmesine yol açmıştır. Bunun yerine node tabanlı `.cjs` betikleri oluşturup `fs.readFileSync` ve basit `replace()` metodları kullanarak değişiklik yapın.

### 3.2. GitHub Pages ve Statik Dosya (Asset) Yolları
Site GitHub Pages üzerinde (bir alt dizinde, örn: `/gsstad/`) yayınlanmaktadır.
- Görseller (logo, branda vb.) `public/` klasöründe yer alır.
- JavaScript içerisinden (örn: Three.js Texture Loader) bir görsel çağırırken KESİNLİKLE mutlak yol (`/gorsel.png`) kullanmayın (GitHub Pages'de 404 verir). 
- Bunun yerine Vite'ın sağladığı çevre değişkenini kullanın: `import.meta.env.BASE_URL + 'gorsel.png'`
- WebGL Canvas kısıtlamaları (Tainted Canvas) nedeniyle dışarıdan yüklenen görsellerde mutlaka `img.crossOrigin = 'anonymous';` ayarı yapılmalıdır.

### 3.3. Git Ignore Tuzağı
Projedeki `.gitignore` dosyasında `*.png` ve `*.zip` gibi kurallar bulunmaktadır. Sisteme yeni bir ikon veya arayüz görseli eklendiğinde `git status`'te görünmeyebilir. İhtiyaç halinde `git add -f public/yeni_gorsel.png` ile zorla ekleme yapılmalıdır.

### 3.4. Görsel Çakışmalar (Z-Fighting) ve Simetri
- Saydam/Transparan objeler (örneğin kafes tel örgüleri ve camlar) render edilirken Z-fighting oluşmaması için `depthWrite: false` olarak ayarlanmıştır.
- `alan4` kedi yolunda arkada 6 metrede bir (1.5m'nin tam katları) dikilen devasa beyaz çelik kolonlar vardır. Öndeki cam korkuluk dikmeleri (posts) rastgele küsuratlarla hesaplandığında arkadaki kolonlarla düzensiz bir paralaks/asimetri (Moire) oluşturuyordu. Bu yüzden cam dikmeleri `frontRailingSpans` içinde **tam 1.5 metrelik sabit bir ızgaraya (grid)** oturtulmuş ve `X=0` merkezine hizalanmıştır. Bu kuralı bozmayın.

## 4. UI ve JSON State Yönetimi
- **Kafes (Louver) Menüsü:** Ekranda kafeslere tıklandığında açılan menü (`louverPopup`), varsayılan olarak `display: none` gelmeli ve yalnızca bir kafes objesine tıklandığında görünür olmalıdır.
- **Varsayılan State:** Uygulama ilk açıldığında `PRESET_DRAFTS['taslak-v2']` isimli JSON şablonunu yükler. Eğer varsayılan yerleşimi güncellemek gerekirse, `main.js` içerisindeki bu JSON objesi güncellenmelidir.

---
*Bu doküman, projede görev alacak tüm otonom ajanların projeyi anlaması ve eski hataları tekrarlamaması için Antigravity tarafından oluşturulmuştur.*
