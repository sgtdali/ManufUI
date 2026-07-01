# Üst Yönetim Sunumu — Sayfa Planı

**Karar tarihi:** 2026-07-01
**Durum:** Sayfa iskeleti onaylandı. Sunum içeriği bu oturumda hazırlanmadı — sadece yapı/kapsam kararı alındı.

## Amaç
Repkon üst yönetimine ManufUI verisine dayalı performans raporu + aksiyon/yatırım talebi sunumu. İki amaç birlikte: (1) 3 aylık performans özeti, (2) somut aksiyon/yatırım/müşteri talebi.

## Kapsam ve Zaman Kurgusu
- **Tüm 12 hücre** dahil (ETM, N602, Flowform, Pres, ROB108, Quench, ROB104, ROB110-111, ROB109, N603, Fosfat, Boya).
- Zaman anlatısı: **Haziran öncesi (Nisan-Mayıs) kısa özet → Haziran-Temmuz'da atılan aksiyonların sonuçları detaylı.** Sunumun ağırlığı haziran sonrası ilerlemede.
- Uzunluk: **kapsamlı, 15+ sayfa.**
- "Öne Çıkan Sorunlar" bölümündeki spesifik vakalar (hangi hücreler, hangi problemler) veri sorgusuyla dinamik belirlenecek — önceden sabitlenmedi.

## Karar Günlüğü

**1. Sunum amacı:** Sadece performans raporu değil, aksiyon talebiyle birleştirildi ("ikisi birden" seçildi). Alternatif: sadece durum raporu — reddedildi, çünkü yatırım/müşteri talebi ihtiyacı var.

**2. Kapsam:** Tüm 12 hücre genel tablo olarak seçildi (belirli hücrelere daraltma alternatifi değerlendirildi, reddedildi — üst yönetim genel resmi görmek istiyor).

**3. Zaman kurgusu:** İlk planda "3 aylık dönem" eşit ağırlıklı düşünüldü, sonra düzeltildi: haziran öncesi kısa, haziran sonrası ağırlıklı. Veri bu kurguyu destekliyor (aşağıya bakınız).

**4. Sayfa yapısı — 3 alternatif değerlendirildi:**
   - A) Kronolojik anlatı (öncesi→sonrası→talep) — tekrarlı olabileceği için elendi.
   - B) **Katmanlı yapı (SEÇİLDİ)** — Genel Bakış → Darboğaz Analizi → Sorunlar → Aksiyon Takibi → Talep. Farklı seviyedeki izleyiciler istedikleri derinlikte takip edebilir; performans ve talep net ayrışıyor.
   - C) Hücre bazlı derinlemesine — 12 hücrede çok uzayacağı ve büyük resmin dağılacağı için elendi.

**5. Major problem vakaları (N603, Riyad HX vb.):** Önceden sabitlenmedi — "Öne Çıkan Sorunlar" bölümü sunum hazırlanırken Supabase'den dinamik çekilecek.

**6. Aksiyon talebi içeriği:** Kesinleşmedi. İki olası eksen belirlendi: yeni yatırım ihtiyacı ve müşteriden talep edilecekler. Kesin madde listesi sunum hazırlığı sırasında netleştirilecek.

**7. Kayıt yeri:** Bu repo, `docs/sunumlar/` altında markdown olarak.

## Veriden Doğrulanan Anlatı Omurgası
ManufUI verisi (manuf_production_records/rows, 2026-04-02 – 2026-07-01) haziran sonrası iyileşmeyi net destekliyor:

- **Önceki istasyon bekleme (upstream darboğaz) süresi düştü:**
  - ETM Hücresi: Nisan 10.260 dk → Haziran 1.688 dk
  - N602 Hücresi: Nisan 2.930 dk → Haziran 1.137 dk
  - ROB108 Hücresi: Nisan 1.645 dk → Haziran 551 dk
- **Üretim adetleri Haziran'da arttı:**
  - ETM: 741 → 1.641
  - Pres: 836 → 1.707
  - ROB108: 789 → 1.370
- **Aksiyon takibi:** Tamamlanan 14 aksiyonun tamamı Haziran-Temmuz'da kapatılmış (Nisan-Mayıs'ta sıfır tamamlanan). 60 madde hâlâ açık.

## Onaylanan Sayfa İskeleti (B — Katmanlı Yapı, ~15-16 sayfa)

### 1. Genel Bakış (2 sayfa)
- Kapak / sunum amacı ve kapsamı
- 12 hücre özet tablosu — Haziran öncesi vs sonrası KPI karşılaştırması (üretim adedi, toplam duruş dakikası)

### 2. Darboğaz & Kök Neden Analizi (3 sayfa)
- ETM/Pres upstream ilişkisi (akış şeması ile)
- "Önceki istasyon bekleme" trendi — Nisan'dan Temmuz'a düşüş grafiği
- Kök neden özeti ve alınan aksiyon

### 3. Öne Çıkan Sorunlar (4-5 sayfa, dinamik)
- Hücre başına 1 sayfa — sorun tanımı, veri kanıtı, durum (çözüldü / devam ediyor / karar bekliyor)
- Hangi hücreler dahil olacağı sunum hazırlığında Supabase sorgusuyla netleşecek

### 4. Aksiyon Takibi (2 sayfa)
- 74 madde genel durum (60 açık / 14 tamamlanmış)
- Haziran-Temmuz'da kapananlar — öne çıkan örnekler

### 5. Talep / Karar (2-3 sayfa)
- Yatırım talepleri (madde listesi TBD)
- Müşteriden talep edilecekler (madde listesi TBD)
- Sonraki adımlar / takvim

## Açık Kalan Kalemler (Sonraki Oturumda)
- "Öne Çıkan Sorunlar" bölümü için hücre/vaka seçimi (Supabase sorgusuyla).
- Talep bölümünün kesin maddeleri (yatırım kalemleri, müşteriden istenecekler).
- Gerçek slayt/sayfa içeriklerinin yazımı — bu doküman sadece yapı kararını kayıt altına alıyor.
