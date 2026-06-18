---
updated: 2026-06-18
sources: [src/app/page.tsx, src/app/_components/FFPreformTable.tsx, src/app/_components/FinalOlcumTable.tsx, src/app/actions.ts, src/lib/types.ts]
---

# Ölçüm Sistemleri (Preform & Final)

Saudi Arabistan üretim takip sisteminde OEE tablosundan bağımsız, saatlik dilimler yerine günlük 6 ölçüm satırı barındıran ve dinamik kalite detay girişi sunan iki ölçüm sistemi bulunur:
1. **FF Preform Ölçüm:** "ROB108 Hücresi" ile "Flowform Hücresi" arasında yer alır.
2. **Final Ölçüm:** "ROB110-111 Hücresi" ile "Fosfat Hücresi" arasında yer alır.

## Genel Özellikler

- **Zaman Dilimi Yoktur:** Saatlik takip yerine her gün için 1'den 6'ya kadar numaralandırılmış 6 adet bağımsız ölçüm satırı barındırırlar.
- **Sorumlu:** Her iki bölüm seçildiğinde de sorumlu otomatik olarak **Zeynep Ece Toker** olarak doldurulur.
- **Tarih Seçimi:** Diğer tüm hücreler gibi gün bazlı çalışır ve tarih değiştiğinde veriler otomatik yüklenir.

## Arayüz ve Giriş Alanları

Ölçüm sistemleri arayüzde iki ana tablodan oluşur:

### 1. Ana Ölçüm Tablosu

Bu tabloda 6 satır (Ölçüm No: 1-6) ve şu sütunlar yer alır:
- **Ölçülen Adet:** Sayısal değer girilir.
- **Red Parça Sayısı:** Reddedilen parça miktarı.
- **Rework Parça Sayısı:** Rework işlemine gönderilen parça miktarı.

### 2. Dinamik Red ve Rework Sebepleri Tablosu

Ana tabloda girilen toplam red ve rework sayılarına göre alt kısımda anlık (dinamik) olarak iki detay tablosu belirir:
- **Red Sebepleri Tablosu:** Üst tablodaki red adetlerinin kümülatif toplamı ($N$) kadar satırdan oluşur. Her satırda **Parça No** (Text Input) ve **Red Sebebi** (Text Input) sütunları bulunur.
- **Rework Sebepleri Tablosu:** Üst tablodaki rework adetlerinin kümülatif toplamı ($M$) kadar satırdan oluşur. Her satırda **Parça No** (Text Input) ve **Rework Nedeni** (Text Input) sütunları bulunur.

---

## Veritabanı Yapısı (Supabase)

Veriler standart üretim OEE tablolarından tamamen bağımsız, her bir ölçüm sistemi için 3'er adet olmak üzere toplam 6 adet ayrı tabloda saklanır:

### FF Preform Ölçüm Tabloları
1. **`manuf_ff_preform_measurements`**: Ölçüm adetleri tablosu. Unique constraint: `(tarih, sira_no)`.
2. **`manuf_ff_preform_rejects`**: Red detayları tablosu. Unique constraint: `(tarih, sira_no)`.
3. **`manuf_ff_preform_reworks`**: Rework detayları tablosu. Unique constraint: `(tarih, sira_no)`.

### Final Ölçüm Tabloları
1. **`manuf_final_olcum_measurements`**: Ölçüm adetleri tablosu. Unique constraint: `(tarih, sira_no)`.
2. **`manuf_final_olcum_rejects`**: Red detayları tablosu. Unique constraint: `(tarih, sira_no)`.
3. **`manuf_final_olcum_reworks`**: Rework detayları tablosu. Unique constraint: `(tarih, sira_no)`.

---

## Validasyon ve Kaydetme Kuralları

- **Boş Alan Engeli (Validation):**
  - Eğer üst tabloda **Red Parça Sayısı** toplamı $> 0$ ise, dinamik olarak oluşan Red Sebepleri tablosundaki tüm satırların `Parça No` ve `Red Sebebi` alanlarının doldurulması zorunludur. Boş bırakılırsa kaydetmeye izin verilmez.
  - Eğer üst tabloda **Rework Parça Sayısı** toplamı $> 0$ ise, dinamik olarak oluşan Rework Sebepleri tablosundaki tüm satırların `Parça No` ve `Rework Nedeni` alanlarının doldurulması zorunludur. Boş bırakılırsa kaydetmeye izin verilmez.
- **Ortak Kaydetme Akışı:**
  - Her iki ekranda da tek bir "Kaydet" butonu mevcuttur ve tüm tabloların ortak kaydını tetikler.
  - Kaydetme esnasında ilgili tarihli eski reject ve rework kayıtları veritabanından silinir ve yeni satırlar tek bir veritabanı işlemiyle insert edilir. Bu sayede veri tutarlılığı korunur.

---

## Raporlama ve Dashboard İzolasyonu

Ölçüm sistemleri OEE/WIP takip hücreleri olmadığı için:
- **Detaylı Performans Paneli (`/dashboardy`)**, **Dashboard (`/dashboard`)** ve **Veri Takip (`/veri-takip`)** sayfalarında gösterilmez; OEE hedeflerini ve genel üretim grafiklerini etkilemez. `src/app/dashboard/page.tsx` ve `src/app/veri-takip/page.tsx` dosyalarında filtrelenmişlerdir.
