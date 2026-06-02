---
updated: 2026-06-02
sources: [supabase/migrations/, src/app/actions.ts, src/app/ariza/actions.ts]
---

# Veritabanı Tabloları

Supabase PostgreSQL üzerinde çalışan tablolar. Tüm tablolarda RLS etkindir, şu an `allow_all` (public read/write) politikası uygulanmaktadır.

## manuf_production_records

Ana üretim kaydı (başlık). Bir bölüm + tarih kombinasyonu için tek kayıt.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid | PK, otomatik |
| bolum | text | Hücre adı (12 değerden biri) |
| sorumlu | text | Sorumlu kişi adı |
| tarih | date | Kayıt tarihi |
| updated_at | timestamptz | Son güncelleme |

**Unique constraint**: `(bolum, tarih)` — upsert conflict key olarak kullanılır.

## manuf_production_rows

Saatlik üretim satırları. Her kayıt `record_id` ile `manuf_production_records`'a bağlıdır.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid | PK |
| record_id | uuid | FK → manuf_production_records.id |
| sira_no | integer | Zaman dilimi sırası (1–9) |
| zaman_dilimi | text | Zaman dilimi etiketi |
| uretim_adeti | integer | Gerçekleşen üretim |
| hedef_uretim_adeti | integer | Hedef üretim (+20260416) |
| musteri_var | boolean | Müşteri sahada mı (+20260416) |
| mola | integer | Mola dakikası |
| mola_turu | text | M1/M2 |
| ariza | integer | Arıza dakikası |
| ariza_turu | text | E/A/M/O/Kalite/Belirsiz |
| ariza_aciklama | text | Arıza açıklaması |
| ariza_giderildi | boolean | Arıza giderildi mi (+20260413) |
| ariza_giderilme_aciklama | text | Çözüm açıklaması (+20260413) |
| ariza_giderildi_at | timestamptz | Çözüm zamanı (+20260413) |
| planli_durus | integer | Planlı duruş dakikası |
| planli_durus_turu | text | P1/P2/P3 |
| planli_durus_aciklama | text | — |
| setup_ve_ayar | integer | Setup dakikası |
| setup_turu | text | SA1/SA2 |
| setup_aciklama | text | — |
| takim_degisimi | integer | Takım değişimi dakikası |
| onceki_istasyon_bekleme | integer | Bekleme dakikası |
| musteri_kaynakli_durus | integer | Müşteri kaynaklı duruş dakikası |
| musteri_durus_turu | text | MKB1/MKB2/MKB3 |
| musteri_durus_aciklama | text | (+20260522) |
| kalite_kaynakli_durus | integer | Kalite kaynaklı duruş dakikası |

**Unique constraint**: `(record_id, zaman_dilimi)` — upsert conflict key.

Parantez içindeki tarihler (+YYYYMMDD) o kolonun eklendiği migration'ı gösterir. İlk tablo create migration'ı repoda yok; sadece alter migration'ları mevcut.

## manuf_mold_changes

Pres kalıp değişim tarihleri. Erkek (male) ve dişi (female) kalıplar için.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid | PK |
| tarih | date | Değişim tarihi |
| mold_type | text | `'male'` veya `'female'` |
| description | text | İsteğe bağlı açıklama |
| created_at | timestamptz | — |

**Unique constraint**: `(tarih, mold_type)`.

Schedule simülasyonunda bu tablo `loadMoldChanges()` ile çekilir. Manuel kalıp değişim tarihleri simülasyonun kalıp ömrü hesabını sıfırlar.

## manuf_schedule_params

Simülasyon parametreleri. Kullanıcı arayüzünden değiştirilebilir.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid | PK |
| key | text | UNIQUE, programatik anahtar |
| label | text | UI'da gösterilen etiket |
| value | numeric | Parametre değeri |
| unit | text | Birim (`dk`, `adet`, vs.) |
| is_custom | boolean | Kullanıcı değiştirdi mi |

Varsayılan kayıtlar (seed):

| key | label | value | unit |
|-----|-------|-------|------|
| normalization_warmup_minutes | Fırın ısınma süresi | 60 | dk |
| pre_press_heat_minutes | Pres öncesi parça ısınma | 30 | dk |
| press_cycle_minutes | Pres çevrim süresi | 3 | dk |
| normalization_process_minutes | Normalizasyon işlem süresi | 270 | dk |
| male_die_interval | Erkek kalıp ömrü | 500 | adet |
| female_die_interval | Dişi kalıp ömrü | 1300 | adet |
| male_die_change_minutes | Erkek kalıp değişim süresi | 285 | dk |
| female_die_change_minutes | Dişi kalıp değişim süresi | 1140 | dk |
| ring_interval | HIP Ring ömrü | 1300 | adet |
| ring_change_minutes | HIP Ring değişim süresi | 570 | dk |


## manuf_wip_stock

Hücreler arası WIP (Work In Progress) stok takibi.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid | PK |
| tarih | date | Tarih |
| kaynak_hucresi | text | Gönderen hücre |
| hedef_hucresi | text | Alan hücre |
| hesaplanan_adet | integer | Simülasyondan hesaplanan |
| gercek_adet | integer | Kullanıcı tarafından girilmiş gerçek |
| override_edildi | boolean | Gerçek değer manuel girildi mi |
| notlar | text | — |
| created_at | timestamptz | — |

**Unique constraint**: `(tarih, kaynak_hucresi, hedef_hucresi)`.

## manuf_schedule_overrides

Gantt planlama ve simülasyon ekranındaki günlük elle girilen overrides (vardiya saatleri, fazla mesai, zorunlu çalışma günleri) ve Gantt bağımlılık (oklar) verileri.

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid | PK |
| tarih | date | Tarih |
| bolum | text | Hücre adı |
| pressed | integer | Manuel girilen pres/üretim adeti |
| overtime_minutes | integer | Fazla mesai süresi (dakika) |
| force_workday | boolean | Tatil gününü çalışma günü yap/yapma |
| shift_start | text | Vardiya başlangıç saati (Format: "HH:MM") |
| shift_end | text | Vardiya bitiş saati (Format: "HH:MM") |
| furnace_start | text | Fırın ısıtma başlangıç saati (Format: "HH:MM") |
| die_cooling_minutes | integer | Kalıp soğutma süresi (dakika) |
| custom_gantt_items | jsonb | Gün bazlı eklenen özel Gantt maddeleri listesi |
| dependencies | jsonb | Gün bazlı kurulan Gantt öncül-ardıl bağlantıları |
| created_at | timestamptz | — |
| updated_at | timestamptz | — |

**Unique constraint**: `(tarih, bolum)`.

## İlgili Sayfalar

- [Hücreler](hucreler.md) — hücre listesi ve akışı
- [WIP Hesabı](../systems/wip-hesabi.md) — simülasyon ve parametre kullanımı
- [Duruşlar](../systems/duruslar.md) — duruş kolon kodları

