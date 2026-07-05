---
updated: 2026-07-05
sources: [src/app/personel-takip/page.tsx, src/app/personel-takip/actions.ts, supabase/migrations/20260705105000_create_manuf_personnel.sql, supabase/migrations/20260705110400_seed_manuf_personnel_tracking.sql]
---

# Personel Takip Sistemi

Saha personellerinin konaklama yeri planlama ve takibinin yapıldığı modül (`/personel-takip`). 

## Genel Bakış

Sistem, saha personellerinin konakladıkları yerleri (NCMS Otel veya Dış Otel) ve bu yerlerdeki kalış sürelerini (geliş ve dönüş tarihleri) takip etmek üzere tasarlanmıştır. Kullanıcılara hem liste şeklinde düzenleme imkanı (Tablo Görünümü) hem de Excel formatındaki takvime benzer bir zaman çizelgesi (Takvim Görünümü) sunar.

## Veritabanı Yapısı

Sistem iki adet temel Supabase tablosu üzerine kuruludur:

### 1. `manuf_personnel` (Personel Tanımları)
Sistemde kayıtlı saha personellerinin isimlerini tutan tekil kaynaktır.
- `id` (uuid, primary key): Otomatik üretilen benzersiz kimlik.
- `name` (text, unique): Personelin tam adı (Örn: `TAYFUN VURAL`).
- `created_at` (timestamp): Kayıt oluşturulma zamanı.

### 2. `manuf_personnel_tracking` (Konaklama Kayıtları)
Personellerin konaklama lokasyonlarını ve tarih aralıklarını saklar.
- `id` (uuid, primary key): Benzersiz kayıt kimliği.
- `name` (text, foreign key -> `manuf_personnel.name`): Personel adı.
- `location` (text): Konaklama yeri (`NCMS Otel` veya `Dış Otel`).
- `arrival_date` (date, nullable): Personelin konaklama yerine geliş tarihi.
- `return_date` (date, nullable): Personelin dönüş (ayrılış) tarihi.
- `created_at` (timestamp): Kayıt oluşturulma tarihi.

> [!NOTE]
> Geliş ve dönüş tarihleri boş (`NULL`) bırakılabilir. Herhangi bir varsayılan/uydurma tarih atanmaz.

## Arayüz Özellikleri ve Görünümler

Kullanıcılar sağ üstteki kontrol butonları aracılığıyla iki görünüm arasında geçiş yapabilir. Varsayılan görünüm Tablo'dur.

### 1. Tablo Görünümü
Mevcut kayıtların listelendiği, güncellendiği ve yeni kayıtların eklendiği satır içi (inline) form yapısıdır.
- **İsim Seçimi**: Personel isimleri `manuf_personnel` tablosundan dinamik olarak çekilen bir `<select>` dropdown ile seçilir.
- **Konaklama Seçimi**: Lokasyon alanı dropdown olup `NCMS Otel` ve `Dış Otel` seçeneklerini barındırır.
- **Tarih Alanları**: HTML5 `date` girdisi kullanır.
- **Kolon Sıralama (Sorting)**:
  - *Geliş Tarihi* ve *Dönüş Tarihi* kolon başlıkları tıklanabilir niteliktedir.
  - Tıklama sırasıyla **Artan (Ascending)**, **Azalan (Descending)** ve **Varsayılan (Default)** sıralama arasında geçiş yapar.
  - Tarihi boş (`NULL`) olan kayıtlar, sıralama yönünden bağımsız olarak her zaman listenin en altında gösterilir.
- **Satır İçi Güncelleme**: Tablodaki herhangi bir alan değiştirildiğinde veya tarih girdisinden odak kaybolduğunda (onBlur), asenkron server action'lar tetiklenerek veri arka planda Supabase'e kaydedilir.
- **Yeni Kayıt Ekleme**: Tablonun en altında boş bir ekleme satırı yer alır.

### 2. Takvim Görünümü (Zaman Çizelgesi Matrisi)
Excel planlama dosyalarına benzer şekilde tasarlanmış yatay bir çizelgedir.
- **Aylık Navigasyon**: İleri/Geri butonları ile aylar arasında geçiş yapılır. Temmuz 2026 varsayılan olarak açılır.
- **Dondurulmuş Sütunlar (Sticky Left)**: Personel ismi ve Konaklama yeri sütunları dondurulmuştur; günler sağa doğru kaydırıldığında sol sütunlar sabit kalır.
- **Yatay Gün Sütunları**: Seçilen ayın günleri (`1`den `31`e kadar) kolon başlığı olarak listelenir.
- **Görsel Boyama Kuralları**:
  - Geliş gününde hücrede `"Geliş"` yazar (NCMS: turuncu, Dış Otel: mavi).
  - Dönüş gününde hücrede `"x"` yazar (NCMS: turuncu, Dış Otel: mavi).
  - Aradaki tüm günler konaklama süresini belirtmek amacıyla hafif renk dolgusuyla boyanır.
  - **Null Sınır Boyaması**:
    - Sadece dönüş tarihi varsa, ayın 1'inden dönüş gününe kadar boyanır.
    - Sadece geliş tarihi varsa, geliş gününden ayın sonuna kadar boyanır.

## Sunucu Eylemleri (Server Actions)

`src/app/personel-takip/actions.ts` içerisinde tanımlanmış asenkron Supabase işlemleri:
- `loadAssignees()`: `manuf_personnel` tablosundaki tüm personelleri alfabetik sıralı çeker.
- `loadPersonnelTracking()`: Mevcut takip kayıtlarını çeker.
- `createPersonnelRecord(name, location, arrival_date, return_date)`: Yeni kayıt ekler (Boş tarih dizgileri veritabanına `null` olarak yazılır).
- `updatePersonnelRecord(id, field, value)`: Tek bir alanı günceller.
- `deletePersonnelRecord(id)`: İlgili kaydı siler.
