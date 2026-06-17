---
updated: 2026-06-17
sources: [src/app/page.tsx, src/app/_components/FFPreformTable.tsx, src/app/actions.ts, src/lib/types.ts]
---

# FF Preform Ölçüm Sistemi

FF Preform Ölçüm, günlük üretim formunda (`/`) "ROB108 Hücresi" ile "Flowform Hücresi" arasında yer alan bağımsız bir ölçüm giriş ekranıdır. Standart hücrelerin saatlik OEE takip yapısından farklı olarak çalışır.

## Genel Özellikler

1. **Zaman Dilimi Yoktur:** Saatlik satırlar yerine 6 adet bağımsız ölçüm satırı barındırır.
2. **Sorumlu:** Bu bölüm seçildiğinde sorumlu otomatik olarak **Zeynep Ece Toker** olarak doldurulur.
3. **Tarih Seçimi:** Diğer hücreler gibi gün bazlı çalışır. Tarih seçildiğinde veriler asenkron olarak yüklenir.

## Tablo Yapısı ve Giriş Alanları

FF Preform Ölçüm ekranı üç adet tablo barındırır:

### 1. FF Preform Ölçüm Verisi Tablosu

Bu tabloda 6 satır (Ölçüm No: 1-6) ve şu sütunlar yer alır:
- **Ölçülen Adet:** Sayısal değer girilir.
- **Red Parça Sayısı:** Reddedilen parça miktarı.
- **Rework Parça Sayısı:** Rework işlemine gönderilen parça miktarı.

### 2. Dinamik Red ve Rework Sebepleri Tablosu

Üst tabloda girilen toplam red ve rework sayılarına göre alt kısımda anlık (dinamik) olarak iki ayrı detay tablosu belirir:
- **Red Sebepleri Tablosu:** Üst tablodaki red adetlerinin kümülatif toplamı kadar satırdan oluşur. Her satırda **Parça No** (Text Input) ve **Red Sebebi** (Text Input) sütunları bulunur.
- **Rework Sebepleri Tablosu:** Üst tablodaki rework adetlerinin kümülatif toplamı kadar satırdan oluşur. Her satırda **Parça No** (Text Input) ve **Rework Nedeni** (Text Input) sütunları bulunur.

---

## Veritabanı Yapısı (Supabase)

FF Preform Ölçüm verileri standart OEE tablolarından tamamen ayrı 3 adet tabloda depolanır:

### 1. `manuf_ff_preform_measurements`
Ölçüm satırlarının depolandığı tablodur.
* `id` UUID PRIMARY KEY
* `tarih` DATE NOT NULL
* `sorumlu` TEXT
* `sira_no` INTEGER (1-6)
* `olculen_adet` INTEGER
* `red_adet` INTEGER
* `rework_adet` INTEGER
* `CONSTRAINT unique_ff_preform_tarih_sira_no` UNIQUE (`tarih`, `sira_no`)

### 2. `manuf_ff_preform_rejects`
Red detaylarının (parça no ve red sebebi) depolandığı tablodur.
* `id` UUID PRIMARY KEY
* `tarih` DATE NOT NULL
* `sira_no` INTEGER (1'den N'e kadar)
* `parca_no` TEXT NOT NULL
* `red_sebebi` TEXT NOT NULL
* `CONSTRAINT unique_ff_reject_tarih_sira_no` UNIQUE (`tarih`, `sira_no`)

### 3. `manuf_ff_preform_reworks`
Rework detaylarının (parça no ve rework nedeni) depolandığı tablodur.
* `id` UUID PRIMARY KEY
* `tarih` DATE NOT NULL
* `sira_no` INTEGER (1'den M'ye kadar)
* `parca_no` TEXT NOT NULL
* `rework_nedeni` TEXT NOT NULL
* `CONSTRAINT unique_ff_rework_tarih_sira_no` UNIQUE (`tarih`, `sira_no`)

---

## Validasyon ve Kaydetme Kuralları

- **Boş Alan Engeli (Validation):**
  - Eğer üst tabloda **Red Parça Sayısı** toplamı > 0 ise, dinamik olarak oluşan Red Sebepleri tablosundaki tüm satırların `Parça No` ve `Red Sebebi` alanlarının doldurulması zorunludur. Boş bırakılırsa kaydetmeye izin verilmez.
  - Eğer üst tabloda **Rework Parça Sayısı** toplamı > 0 ise, dinamik olarak oluşan Rework Sebepleri tablosundaki tüm satırların `Parça No` ve `Rework Nedeni` alanlarının doldurulması zorunludur. Boş bırakılırsa kaydetmeye izin verilmez.
- **Kaydetme Akışı:**
  - Tek bir "Kaydet" butonu mevcuttur ve tüm tabloların ortak kaydını tetikler.
  - Kaydetme esnasında ilgili tarihli eski reject ve rework kayıtları veritabanından silinir ve yeni satırlar tek bir veritabanı işlemiyle insert edilir. Bu sayede veri tutarlılığı korunur.

---

## Dashboard ve Veri Takip Entegrasyonu

"FF Preform Ölçüm" bir OEE hücresi olmadığı için:
- **Detaylı Performans Paneli (`/dashboardy`)**, **Dashboard (`/dashboard`)** ve **Veri Takip (`/veri-takip`)** sayfalarında gösterilmez; kümülatif hedefleri ve genel üretim grafiklerini etkilemez. `src/app/dashboard/page.tsx` ve `src/app/veri-takip/page.tsx` dosyalarında filtrelenmiştir.
