---
updated: 2026-06-20
sources: [src/app/aksiyon-takip/page.tsx, src/app/aksiyon-takip/actions.ts, supabase/migrations/20260620120000_create_manuf_action_items.sql]
---

# Aksiyon Takip Sistemi

`/aksiyon-takip` rotasında çalışan, hücre bazlı iş/aksiyon maddeleri takip sayfası. Ana maddeler ve tek seviye alt maddeler desteklenir.

## Veri Yapısı

Tek tablo: `manuf_action_items`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | uuid (PK) | Otomatik `gen_random_uuid()` |
| `parent_id` | uuid (FK → self) | `null` ise ana madde; dolu ise alt madde. `ON DELETE CASCADE` — ana madde silinince alt maddeler de silinir |
| `cell` | text | Hücre adı (`BOLUMLER` listesinden, ölçüm bölümleri hariç) |
| `title` | text | Aksiyon başlığı / açıklaması |
| `assignee` | text | Sorumlu kişi. Hücre seçilince `BOLUM_SORUMLU`'dan otomatik dolar, düzenlenebilir |
| `due_date` | date | Termin tarihi (opsiyonel) |
| `priority` | text | `Yüksek` / `Orta` (varsayılan) / `Düşük` — CHECK constraint |
| `status` | text | `Açık` (varsayılan) / `Devam Ediyor` / `Tamamlandı` — CHECK constraint |
| `created_at` | timestamptz | Oluşturulma zamanı |
| `updated_at` | timestamptz | Son güncelleme zamanı |

**İndeksler:** `parent_id`, `cell`, `status`

## Arayüz Özellikleri

### Filtreler
- **Hücre filtresi:** OEE hücreleri listesi (FF Preform Ölçüm ve Final Ölçüm hariç)
- **Durum filtresi:** Açık / Devam Ediyor / Tamamlandı
- **Öncelik filtresi:** Yüksek / Orta / Düşük
- **Temizle butonu:** Tüm filtreleri sıfırlar

### Metrik Kartları
- **Toplam:** Tüm ana madde sayısı
- **Açık / Devam Ediyor:** Tamamlanmamış ana madde sayısı
- **Tamamlandı:** Tamamlanmış ana madde sayısı

### Tablo Görünümü
Kolonlar: Başlık, Hücre, Sorumlu, Termin, Öncelik, Durum, Aksiyonlar

- **Ana maddeler** satır olarak listelenir, solda chevron ile açılır/kapanır
- **Alt maddeler** ana madde genişletildiğinde `└` işareti ile indentli gösterilir
- **Durum değiştirme:** Inline `<select>` dropdown ile doğrudan tablodan değiştirilebilir
- **Gecikmiş termin:** Tarihi geçmiş ve tamamlanmamış maddeler kırmızı renk + `!` ile vurgulanır
- **Tamamlanmış maddeler:** Başlık üstü çizili (line-through) ve soluk renkte gösterilir

### Yeni Madde Ekleme
- **Yeni Aksiyon** butonu ile ana madde ekleme formu açılır
- **+** butonu (satır sonu) ile ilgili ana maddenin altına alt madde ekleme formu açılır
- Hücre seçildiğinde sorumlu alanı `BOLUM_SORUMLU` mapping'inden otomatik dolar
- Zorunlu alanlar: Hücre, Başlık, Sorumlu

### Silme
- **Çöp kutusu** butonu ile madde silinir (onay dialogu ile)
- Ana madde silindiğinde alt maddeleri de CASCADE ile silinir

## Server Actions

| Fonksiyon | Açıklama |
|-----------|----------|
| `loadActionItems()` | Tüm aksiyonları `created_at DESC` sıralı çeker |
| `createActionItem(item)` | Yeni ana/alt madde oluşturur |
| `updateActionItem(id, updates)` | Madde alanlarını günceller, `updated_at` otomatik güncellenir |
| `deleteActionItem(id)` | Madde ve alt maddelerini siler |

## Navigasyon

- Sayfa üst başlığında **Forma dön** butonu ile `/` ana sayfaya dönüş
