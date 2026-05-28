---
updated: 2026-05-28
sources: [src/app/page.tsx, src/app/actions.ts, src/lib/types.ts, src/lib/productionValidation.ts]
---

# Üretim Formu

Ana sayfa (`/`). Günlük üretim verilerini saatlik dilimler halinde girildiği form.

## Form Başlığı

| Alan | Tip | Açıklama |
|------|-----|----------|
| Bölüm | Select | 12 hücre arasından seçim. Bkz. [Hücreler](../entities/hucreler.md) |
| Sorumlu | Text | Bölüm seçilince `BOLUM_SORUMLU` haritasından otomatik dolar |
| Tarih | Date | Varsayılan: bugün |

## Zaman Dilimleri

Pazartesi–Perşembe (9 satır):
`07:45–08:45`, `08:45–09:45`, `09:45–10:45`, `10:45–12:00`, `12:00–13:00`, `13:00–14:00`, `14:00–15:00`, `15:00–16:00`, `16:00–17:15`

Cuma–Cumartesi (8 satır):
`09:00–10:00`, `10:00–11:00`, `11:00–12:00`, `12:00–13:00`, `13:00–14:00`, `14:00–15:00`, `15:00–16:00`, `16:00–17:00`

Hangi set kullanılacağı `getZamanDilimleriForDate(tarih)` fonksiyonu ile belirlenir (`src/lib/types.ts`).

## Tablo Kolonları

Her satırda şu alanlar bulunur:

| Kolon | DB Alanı | Açıklama |
|-------|----------|----------|
| Zaman Dilimi | `zaman_dilimi` | Salt okunur etiket |
| Gerçekleşen Üretim | `uretim_adeti` | Sayısal giriş |
| Kalan Dakika göstergesi | — | Hesaplanan, salt gösterim |
| Müşteri Var | `musteri_var` | Checkbox |
| Mola | `mola` + `mola_turu` | Dakika + alt tür (M1/M2) |
| Arıza | `ariza` + `ariza_turu` + `ariza_aciklama` | Dakika + alt tür + açıklama |
| Planlı Duruş | `planli_durus` + `planli_durus_turu` + `planli_durus_aciklama` | Dakika + alt tür + açıklama |
| Setup ve Ayar | `setup_ve_ayar` + `setup_turu` + `setup_aciklama` | Dakika + alt tür + açıklama |
| Takım Değişimi | `takim_degisimi` | Dakika, alt tür yok |
| Bir Önceki İstasyon Bekleme | `onceki_istasyon_bekleme` | Dakika, alt tür yok |
| Müşteri Kaynaklı Duruş | `musteri_kaynakli_durus` + `musteri_durus_turu` + `musteri_durus_aciklama` | Dakika + alt tür + açıklama |
| Kalite Kaynaklı Duruş | `kalite_kaynakli_durus` | Dakika, alt tür yok |
| Hedef Üretim | `hedef_uretim_adeti` | Sağ sütunda |

Duruş alt türleri için bkz. [Duruşlar](duruslar.md).

## Otomatik Yükleme

Bölüm veya tarih değiştiğinde `loadProductionRecord(bolum, tarih)` çağrılır. Kayıt varsa form otomatik dolar, yoksa boş form (sorumlu otomatik doldurulur).

## Kaydetme Akışı

```
onSubmit → validasyon → hasExistingRecord? → onay dialog → doSave
                                 ↓ hayır
                              doSave (direkt)
```

`saveProductionRecord(data)`:
1. `manuf_production_records` tablosuna upsert (conflict: `bolum,tarih`) → `record.id` alınır.
2. `manuf_production_rows` tablosuna upsert (conflict: `record_id,zaman_dilimi`).

## Validasyon Kuralları

### Alt Tür Zorunluluğu
Duruş süresi > 0 girilmişse ilgili `*_turu` alanı dolu olmalı:
- Mola → `mola_turu`
- Arıza → `ariza_turu`
- Planlı Duruş → `planli_durus_turu`
- Setup ve Ayar → `setup_turu`
- Müşteri Kaynaklı → `musteri_durus_turu`

### Açıklama Zorunluluğu
- `ariza_turu` seçilmişse → `ariza_aciklama` zorunlu
- `planli_durus_turu` P1 veya P2 ise → `planli_durus_aciklama` zorunlu (P3 için değil)
- `setup_turu` seçilmişse → `setup_aciklama` zorunlu
- `musteri_durus_turu` seçilmişse → `musteri_durus_aciklama` zorunlu

### Hedef/Gerçekleşen Fark Validasyonu
`validateTargetDowntime` (`src/lib/productionValidation.ts`):
- Hedef > Gerçekleşen ise eksik adet için duruş girilmeli
- Gerekli dakika = `ceil(eksikAdet × (60 / hedef))`
- Girilen toplam duruş dakikası bu değerin altındaysa kayıt reddedilir

## Diğer Butonlar

- **Yenile**: Manuel yeniden yükleme
- **Excel'e Aktar**: `/api/export` endpoint'i (download)
- **Dashboard**: `/dashboard` sayfasına link
