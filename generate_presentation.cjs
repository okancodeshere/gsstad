const puppeteer = require('puppeteer');
const pptxgen = require('pptxgenjs');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const AREAS = [
    {
        value: 'alan2', // ALAN 1 ve ALAN 3
        title: 'ALAN 1 ve ALAN 3 - Maraton Tribünü ve Kedi Yolu',
        desc: 'Bu alan Maraton tribününde yer almaktadır.\n\nEkipman ve Kablolama Detayları:\n• 7 Borulu Tek Cephe Özel Kompleks üzerinde toplam 13 adet RRU bulunmaktadır.\n• 10 adet POI birimi sisteme entegredir.\n• 3 adet Outdoor Dolap kedi yolu zemininde konumlandırılmıştır.\n• Kablo Yönlendirmesi: Outdoor dolaplardan çıkan güç ve fiber kablolar (3x2.5mm² vs.) POI\'lere iletilir. POI\'den dağılan RF sinyalleri 1/2 inç jumper kablolar aracılığıyla 13 adet RRU\'ya ulaşır. RRU çıkışlarından 7/8 inç ana feeder kablolar ile doğrudan Matsing sektör antenlerine çıkış yapılır.',
        views: [
            { id: 'focus-rectifier', title: 'Rectifier & Güç Kabinleri', view: [-0.65, 2.84, 6.34, -0.65, 1.50, -3.57] },
            { id: 'focus-antenna-poi', title: 'Anten ve POI Sistemleri', view: [3.21, 8.55, 36.19, -5.96, 6.92, 39.81] },
            { id: 'focus-rru', title: 'RRU Saha Blokları', view: [-6.27, 10.39, 31.34, 0.78, 8.42, 24.53] }
        ]
    },
    {
        value: 'alan4', // ALAN 2
        title: 'ALAN 2 - Scoreboard Kesiti',
        desc: 'Skorboard arkası altyapı grubudur.\n\nEkipman ve Kablolama Detayları:\n• Beton zemin flanşlı özel grupta karşılıklı 11 boru üzerinde 21 adet RRU (Turkcell, Vodafone, TT) bulunmaktadır.\n• Skorboard arkası alanda 30U Rack içerisinde 4 adet POI modülü aktiftir.\n• Skorbord kirişine doğrudan monte edilmiş tekli RRU\'lar (LTE 4485, RRU5526t, 5818W vb.) mevcuttur.\n• Kablo Yönlendirmesi: Zemin dolaplarından çıkan kablolar POI Rack\'te toplanır, oradan çıkan 1/2" jumper kabloları beton zemin RRU\'larına geçer. RRU\'lardan çıkan RF kablolar (genellikle 7/8 inç) kiriş boyunca ilerleyerek scoreboard cephesindeki antenlere aktarılmaktadır.',
        views: [
            { id: 'focus-rectifier', title: 'Rectifier & Güç Kabinleri', view: [1.63, 20.94, 53.66, 1.43, 18.90, 63.45] },
            { id: 'focus-antennas', title: '50m Silindir Taşıyıcı & Antenler', view: [-24.14, 18.16, 5.01, -15.72, 17.14, -0.28] },
            { id: 'focus-catwalk', title: 'Kedi Yolu Taşıyıcı Sistemi', view: [2.90, 25.19, 4.65, -0.33, 19.53, -2.93] }
        ]
    },
    {
        value: 'alan3', // ALAN 4
        title: 'ALAN 4 - Çapraz Köşe Tribün',
        desc: 'Çapraz köşelerde konumlanan yoğun kompleks yapıdır.\n\nEkipman ve Kablolama Detayları:\n• Platform üzerinde Çift RRU Kompleksi ve 42U POI (tam donanımlı) rack mevcuttur.\n• Zeminde 4 adet Outdoor Enerji/Transmission dolabı bulunmaktadır.\n• Kablo Yönlendirmesi: Dolaplardan çıkan ana fiber optik ring kabloları 42U kabinetteki POI modüllerine girer. POI çıkışlarından alınan sinyaller 1/2" esnek RF kablolar ile Çift RRU grubuna iletilir. Kedi yolu tablası altından geçen tava aracılığıyla 1-1/4 inç (veya 7/8") kablolar ile 10m ofsetli antenlere taşınır.',
        views: [
            { id: 'focus-rru-poi', title: 'RRU ve POI Yerleşimi', view: [-3.07, 2.70, 4.67, -3.41, 0.34, -5.04] },
            { id: 'focus-antennas', title: 'Antenler ve Çatı Taşıyıcısı', view: [-5.85, 8.33, 33.95, 2.24, 5.87, 28.61] }
        ]
    }
];

async function run() {
    console.log("Sunum oluşturma süreci başlatılıyor...");
    let pres = new pptxgen();
    pres.layout = 'LAYOUT_16x9';

    // Kapak Slaytı
    let coverSlide = pres.addSlide();
    coverSlide.background = { color: "1e293b" };
    coverSlide.addText("Galatasaray Stadyum Altyapı Yerleşimleri", { 
        x: 1, y: 2, w: 8, h: 1.5, 
        fontSize: 36, color: "ffffff", bold: true, align: "center", fontFace: "Arial"
    });
    coverSlide.addText("Detaylı 3D Model Bölge İncelemeleri", { 
        x: 1, y: 3.5, w: 8, h: 1, 
        fontSize: 20, color: "94a3b8", align: "center", fontFace: "Arial"
    });

    console.log("Tarayıcı başlatılıyor...");
    const browser = await puppeteer.launch({ 
        headless: 'new',
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    console.log("Siteye gidiliyor...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 60000 });
    await delay(3000);

    for (let area of AREAS) {
        console.log(`Alan seçiliyor: ${area.title}...`);
        
        // Alanı Seç
        await page.evaluate((val) => {
            let select = document.querySelector('#pres-select-area') || document.querySelector('#select-area');
            if (select) {
                select.value = val;
                select.dispatchEvent(new Event('change'));
            }
        }, area.value);
        
        await delay(3000); // Alanın yüklenmesini bekle
        
        // Her kamera açısı için döngü
        for (let i = 0; i < area.views.length; i++) {
            const cam = area.views[i];
            console.log(`  -> Kamera Ayarlanıyor: ${cam.title}`);
            
            await page.evaluate((btnId) => {
                const btn = document.querySelector('#btn-' + btnId);
                if (btn) btn.click();
            }, cam.id);
            
            await delay(3000); // Kameranın hedefe ulaşmasını bekle
            
            // Ekran görüntüsü almadan hemen önce UI elemanlarını gizle
            await page.evaluate(() => {
                const els = document.querySelectorAll('.hud, .left-sidebar, .right-sidebar, .toolbar, .bottom-info, #navbar, #top-bar, #bottom-bar, #settings-modal, .modal');
                els.forEach(el => {
                    if (el) el.setAttribute('data-hidden-by-script', el.style.display || 'none-prev');
                    if (el) el.style.display = 'none';
                });
            });

            const filename = `shot_${area.value}_${cam.id}.png`;
            
            // Canvas container'ı veya sayfayı çek
            const canvasContainer = await page.$('#canvas-container');
            if(canvasContainer) {
                await canvasContainer.screenshot({ path: filename });
            } else {
                await page.screenshot({ path: filename });
            }
            
            // Ekran görüntüsü sonrası UI elemanlarını geri getir ki diğer butonlara tıklanabilsin
            await page.evaluate(() => {
                const els = document.querySelectorAll('.hud, .left-sidebar, .right-sidebar, .toolbar, .bottom-info, #navbar, #top-bar, #bottom-bar, #settings-modal, .modal');
                els.forEach(el => {
                    if (el && el.hasAttribute('data-hidden-by-script')) {
                        const prev = el.getAttribute('data-hidden-by-script');
                        el.style.display = prev === 'none-prev' ? '' : prev;
                        el.removeAttribute('data-hidden-by-script');
                    }
                });
            });
            
            let slide = pres.addSlide();
            
            // Başlık (Bölge + Kamera Görünümü)
            slide.addText(`${area.title}`, { x: 0.5, y: 0.2, w: 8, h: 0.4, fontSize: 18, bold: true, color: "0f172a" });
            slide.addText(`Detay: ${cam.title}`, { x: 0.5, y: 0.6, w: 8, h: 0.3, fontSize: 14, color: "334155" });
            
            // Ekran Görüntüsü
            slide.addImage({ path: filename, x: 0.3, y: 1.1, w: 5.68, h: 3.2 }); // 16:9 
            
            // Sağ Taraftaki Teknik Bilgi (İlk slayta özel donanım ve kablolama bilgisi)
            // Sadece o bölgenin ilk slaytında uzun açıklamayı göster, diğerlerinde kameraya özel detayı vurgula
            slide.addText("Ekipman ve Kablolama Analizi", { x: 6.2, y: 1.1, w: 3.5, h: 0.4, fontSize: 13, bold: true, color: "1e293b" });
            
            slide.addText(area.desc, { 
                x: 6.2, y: 1.5, w: 3.5, h: 3.5, 
                fontSize: 10, color: "334155", valign: "top", align: "left"
            });
            
            slide.addText("GS Catwalk - Otomatik Rapor Çıktısı", { x: 0.5, y: 5.1, w: 4, h: 0.3, fontSize: 10, color: "94a3b8" });
        }
    }

    console.log("Tarayıcı kapatılıyor...");
    await browser.close();

    console.log("PowerPoint sunumu kaydediliyor...");
    await pres.writeFile({ fileName: "Stadyum_Alan_Yerlesimleri.pptx" });
    console.log("İşlem tamam! Stadyum_Alan_Yerlesimleri.pptx başarıyla güncellendi.");
}

run();
