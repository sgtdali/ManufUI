---
updated: 2026-06-12
sources: [src/app/page.tsx, src/app/actions.ts, src/lib/types.ts, src/lib/productionValidation.ts, src/app/_components/ProductionTable.tsx]
---

# Üretim Formu

Ana sayfa (`/`). Günlük üretim verilerinin saatlik dilimler halinde girildiği form.

## Form Başlığı

| Alan | Tip | Açıklama |
|------|-----|----------|
| Bölüm | Select | 12 hücre arasından seçim. Bkz. [Hücreler](../entities/hucreler.md) |
| Sorumlu | Text | Bölüm seçilince `BOLUM_SORUMLU` haritasından otomatik dolar |
| Tarih | Date | Varsayılan: bugün |

## Zaman Dilimleri

Pazartesi–Perşembe (9 satır):
`08:00–09:00`, `09:00–10:00`, `10:00–11:00`, `11:00–12:00`, `12:00–13:00`, `13:00–14:00`, `14:00–15:00`, `15:00–16:00`, `16:00–17:00`

Cuma–Cumartesi (8 satır):
`09:00–10:00`, `10:00–11:00`, `11:00–12:00`, `12:00–13:00`, `13:00–14:00`, `14:00–15:00`, `15:00–16:00`, `16:00–17:00`

Hangi set kullanılacağı `getZamanDilimleriForDate(tarih)` fonksiyonu ile belirlenir (`src/lib/types.ts`).

## Tablo Kolonları

Görünüm yatay olarak taşarsa sağa/sola kaydırılabilir. **"Zaman Dilimi" kolonu en solda sabit (sticky) kalır.**

Her satırda şu alanlar bulunur (Seçili hücreye göre kolonlar dinamikleşir):

| Kolon | DB Alanı | Açıklama | Hücre Kısıtı |
|-------|----------|----------|--------------|
| Zaman Dilimi | `zaman_dilimi` | Salt okunur, sabit sol sütun | Tüm |
| Gerçekleşen Üretim | `uretim_adeti` | Sayısal giriş | Tüm |
| Kalan Dakika göstergesi | — | Hesaplanan, salt gösterim | Tüm |
| Müşteri Var | `musteri_var` | Checkbox | Tüm |
| Mola | `mola` + `mola_turu` | Dakika + alt tür (Çay/Yemek) | Tüm |
| Arıza | `ariza` + `ariza_turu` + `ariza_aciklama` | Dakika + alt tür + açıklama | ETM ve Pres özel |
| Planlı Duruş | `planli_durus` + `planli_durus_turu` + `planli_durus_aciklama` | Dakika + alt tür + açıklama | Tüm (ETM'de ek alt tür) |
| Setup ve Ayar / Hazırlık | `setup_ve_ayar` + `setup_turu` + `setup_aciklama` | Dakika + alt tür + açıklama | Pres ve ETM'de adı **Hazırlık**'tır. |
| Takım Değişimi / Holder - Insert Değişim | `takim_degisimi` | Dakika, alt tür yok / ETM'de var | **Pres Dışı** (ETM'de adı farklıdır) |
| Kalıp Demontaj | `kalip_demontaj` + `kalip_demontaj_turu` | Dakika + alt tür | **Sadece Pres** |
| Kalıp Montaj | `kalip_montaj` + `kalip_montaj_turu` | Dakika + alt tür | **Sadece Pres** |
| Çalışan Makine Sayısı | `calisan_makine_sayisi` + `calisan_makine_aciklama` | Çalışan makine sayısı + açıklama | **ETM, ROB104, ROB108, ROB109** |
| Bir Önceki İstasyon Bekleme | `onceki_istasyon_bekleme` | Dakika, alt tür yok | Tüm |
| Müşteri Kaynaklı Duruş | `musteri_kaynakli_durus` + `musteri_durus_turu` + `musteri_durus_aciklama` | Dakika + alt tür + açıklama | Tüm |
| Kalite Kaynaklı Duruş | `kalite_kaynakli_durus` | Dakika, alt tür yok | Tüm |
| Hedef Üretim | `hedef_uretim_adeti` | Sağ sütunda | Tüm |

Duruş alt türleri detayları için bkz. [Duruşlar](duruslar.md).

---

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

---

## Validasyon Kuralları

### Alt Tür Zorunluluğu
Duruş süresi > 0 girilmişse ilgili `*_turu` alanı dolu olmalı:
- Mola → `mola_turu`
- Arıza → `ariza_turu`
- Planlı Duruş → `planli_durus_turu`
- Setup ve Ayar / Hazırlık → `setup_turu`
- Takım Değişimi (sadece ETM) → `takim_degisim_turu`
- Kalıp Demontaj → `kalip_demontaj_turu`
- Kalıp Montaj → `kalip_montaj_turu`
- Müşteri Kaynaklı → `musteri_durus_turu`

### Açıklama Zorunluluğu
- `ariza_turu` seçilmişse:
  - ETM Hücresi'nde sadece teknik arızalar ise → `ariza_aciklama` zorunlu
  - Diğer hücrelerde → `ariza_aciklama` zorunlu
- `planli_durus_turu` seçilmişse:
  - Sadece **"Planlı Bakım"** ise → `planli_durus_aciklama` zorunlu (Parça Basmama Kararı veya Kasa Alma - Bırakma gerekmez)
- Setup/Hazırlık seçilmişse:
  - Pres ve ETM Hücresi dışında → `setup_aciklama` zorunlu
  - Pres Hücresi'nde **sadece "Kaçak Kontrolü"** ise → `setup_aciklama` zorunlu
  - ETM Hücresi'nde → Açıklama gerekmez
- Çalışan makine sayısı sınırın (ETM: 2, ROB104: 2, ROB108: 6, ROB109: 2) altındaysa → `calisan_makine_aciklama` zorunlu
- `musteri_durus_turu` seçilmişse → `musteri_durus_aciklama` zorunlu

### Hedef/Gerçekleşen Fark Validasyonu
`validateTargetDowntime` (`src/lib/productionValidation.ts`):
- Hedef > Gerçekleşen ise eksik adet için duruş girilmeli
- Gerekli dakika = `ceil(eksikAdet × (60 / hedef))`
- Girilen toplam duruş dakikası bu değerin altındaysa kayıt reddedilir. (Kalıp Demontaj ve Kalıp Montaj dakikaları da toplam girilen duruşa dahildir.)

---

## Diğer Butonlar

- **Yenile**: Manuel yeniden yükleme
- **Excel'e Aktar**: `/api/export` endpoint'i (download)
- **Dashboard**: `/dashboard` sayfasına link
