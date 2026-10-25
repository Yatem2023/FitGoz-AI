# Beden & FitGöz AI - Akıllı Beden, Postür ve Kalori Asistanı
### TÜBİTAK 2204-B Yazılım, Yapay Zeka ve Sağlık Teknolojileri Projesi

Bu proje; web veya telefon kamerası üzerinden çalışan, MediaPipe Pose derin öğrenme mimarisi ile donatılmış hibrit bir asistan sistemidir:
1. **👗 Beden & Kıyafet Ölçüm Modu:** Mesafeden bağımsız antropometrik boy kalibrasyonuyla gerçek omuz genişliğini (cm) ölçer ve doğru kıyafet bedenini (S, M, L, XL) belirler.
2. **🔥 Canlı Egzersiz & Otomatik Kalori Modu:** Kamera karşısında yapılan hareketleri (Squat, Jumping Jack) eklem açılarıyla anlık sayar, sesli geri bildirim verir ve yakılan kaloriyi canlı olarak hesaplar.
3. **🥗 Metabolizma Profili (BMR & TDEE):** Kullanıcının boy, kilo, yaş ve cinsiyetine göre günlük bazal ve toplam kalori ihtiyacını, Vücut Kitle İndeksini (VKİ) çıkarır.

---

## 📁 Proje Dosyaları
* **[index.html](file:///C:/Users/USER/.gemini/antigravity/scratch/AkilliBedenAsistani/index.html)**: Beden ölçümü, canlı HUD kalori göstergesi ve metabolizma paneli içeren kullanıcı arayüzü.
* **[style.css](file:///C:/Users/USER/.gemini/antigravity/scratch/AkilliBedenAsistani/style.css)**: Gece modu, alevli kalori rozetleri, mod sekmeleri ve duyarlı (responsive) tasarım.
* **[app.js](file:///C:/Users/USER/.gemini/antigravity/scratch/AkilliBedenAsistani/app.js)**: MediaPipe Pose entegrasyonu, diz açısı trigonometrisi, otomatik tekrar sayacı, Web Audio API sesli geri bildirim ve kalori yakım motoru.
* **[baslat.bat](file:///C:/Users/USER/.gemini/antigravity/scratch/AkilliBedenAsistani/baslat.bat)**: Windows için tek tıkla başlatıcı.
* **[TUBITAK_PROJE_RAPORU.md](file:///C:/Users/USER/.gemini/antigravity/scratch/AkilliBedenAsistani/TUBITAK_PROJE_RAPORU.md)**: TÜBİTAK 2204-B yarışması için hazır proje raporu.

---

## 🚀 Nasıl Çalıştırılır?
1. Klasördeki **[baslat.bat](file:///C:/Users/USER/.gemini/antigravity/scratch/AkilliBedenAsistani/baslat.bat)** dosyasına çift tıklayın (veya `index.html` dosyasını Chrome ile açın).
2. Telefonunuzu kamera olarak bağlamak için telefonunuza ve bilgisayarınıza **Iriun Webcam** uygulamasını kurun.
3. Sayfadaki **"Kamerayı Başlat"** butonuna basarak ister beden ölçümü yapın, ister canlı squat/zıplama yaparak anlık kalori yakımınızı izleyin!
