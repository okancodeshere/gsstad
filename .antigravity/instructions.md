\# Agent Execution Rules \& Project Guardrails



\## 1. Temel Davranış İlkeleri

\- Verilen görevlerin dışına çıkmadan yalnızca talep edilen bileşen üzerinde çalış.

\- Yanıt üretmeden önce aşağıdaki kontrol listesini doğrula.

\- Açıklama veya sohbet metinlerini minimumda tut, doğrudan çözüm odaklı çıktı ver.



\## 2. Kodlama ve Mimari Sınırları

\- Mevcut mimariyi ve dosya hiyerarşisini koru; talep edilmedikçe yeni mimari desen ekleme.

\- Paket/bağımlılık eklemeden önce mevcut bağımlılıkları kullan.

\- Mevcut fonksiyon veya değişken isimlendirmelerini değiştirmeden refactor yap.

\- Kod bloklarını her zaman tam ve çalışır halde ver; "buraya kod gelecek" şeklinde eksik bırakma.



\## 3. Git ve Versiyon Kontrol Protokolü

\- Asla kendiliğinden `git push`, `git push --force` veya uzak sunucuya veri gönderen herhangi bir komut çalıştırma.

\- Push işlemi yalnızca kullanıcı açıkça "pushla", "gönder" veya "git push çalıştır" dediğinde yapılabilir.

\- Değişiklikleri geri alma (revert/reset/undo) istendiğinde kesinlikle `git pull` çalıştırma; yerel değişiklikleri yerel git komutlarıyla (`git checkout`, `git restore` veya `git reset`) yönet.

\- Uzak sunucudan (`origin`, `upstream`) veri çekecek (`pull`, `fetch`, `merge`) herhangi bir işlem öncesinde mutlaka kullanıcıdan açık onay iste.

\- Gerçekleştirmeyi önerdiğin Git komutlarını önce terminal komutu olarak ekrana yazdır, çalıştırmadan önce kullanıcının onayını bekle.



\## 4. Yanıt Şablonu ve Zorunlu Çıktı Formatı

Tüm yanıtları aşağıdaki akışa göre düzenle:

1\. Değişikliğin tek cümlelik özeti.

2\. Güncellenen veya oluşturulan kod/dosya içeriği.

3\. Varsa çalıştırma veya test komutu.



\## 5. Doğrulama ve Güvenlik Kontrol Listesi

Her görev tamamlanmadan önce şu maddeler taranmalıdır:

\- \[ ] Talep edilmeyen hiçbir dosya değiştirilmedi.

\- \[ ] Projeye gereksiz üçüncü taraf kütüphane eklenmedi.

\- \[ ] Kod mevcut stil kılavuzuna ve tip tanımlarına uyuyor.

\- \[ ] Kullanıcıdan açık onay alınmadan hiçbir `git push` veya `git pull` komutu tetiklenmedi.

\- \[ ] `AJAN_DEVIR.md` günlüğüne bu görevin kaydı eklendi ve "Güncel Durum" güncellendi.



\## 6. Ajan Devri (Claude Code ⇄ Antigravity) — ZORUNLU

Bu projede Antigravity ve Claude Code sırayla çalışır; kullanıcı kota bitince ajan değiştirir. İki ajan arasındaki tek iletişim kanalı proje kökündeki `AJAN_DEVIR.md` dosyasıdır.

\- Oturum başında, başka hiçbir şey yapmadan `AJAN_DEVIR.md` dosyasını ve `AI_DEVELOPER_GUIDE.md` dosyasını oku.

\- `git status` ve `git log --oneline -10` ile günlükteki son kaydı karşılaştır. Uyuşmazlık varsa (commit edilmemiş değişiklik vb.) önceki ajanın kotası yarıda bitmiştir: `git diff` ile incele, günlüğe "Devralma notu" yaz, kullanıcıya bildir.

\- Çok adımlı bir işe başlamadan önce "Güncel Durum → Yarım kalan iş" alanına planı yaz.

\- Her anlamlı değişiklikten hemen sonra günlüğe şablona uygun kayıt ekle: dosya, fonksiyon adı + yaklaşık satır, ne değişti, neden, build sonucu, commit hash. Oturum sonunu bekleme.

\- Kodu ve `AJAN_DEVIR.md`'yi aynı commit'e koy; commit mesajı Türkçe ve `[Antigravity] ...` ile başlar.

\- Yayın: `git push` → GitHub → Cloudflare otomatik yayınlar. Push = canlıya çıkış; kullanıcı onayı şart.

