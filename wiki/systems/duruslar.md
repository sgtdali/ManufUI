---
updated: 2026-05-28
sources: [src/lib/types.ts, src/app/page.tsx]
---

# Duruş Kodları ve Alt Türler

Üretim formunda her satırda girilen duruş türleri ve validasyon kuralları. Kaynak: `DURUS_KOLONLARI` (`src/lib/types.ts`).

## Duruş Kolonları

| Kolon | DB Alanı | Alt Tür Var mı | Açıklama Zorunlu mu |
|-------|----------|----------------|---------------------|
| Mola | `mola` | Evet | Hayır |
| Arıza | `ariza` | Evet | Evet (her türde) |
| Planlı Duruş | `planli_durus` | Evet | Evet (sadece P1, P2) |
| Setup ve Ayar | `setup_ve_ayar` | Evet | Evet (her türde) |
| Takım Değişimi | `takim_degisimi` | Hayır | Hayır |
| Bir Önceki İstasyon Bekleme | `onceki_istasyon_bekleme` | Hayır | Hayır |
| Müşteri Kaynaklı Duruş | `musteri_kaynakli_durus` | Evet | Evet (her türde) |
| Kalite Kaynaklı Duruş | `kalite_kaynakli_durus` | Hayır | Hayır |

## Alt Tür Kodları

### Mola (`mola_turu`)
| Kod | Anlamı |
|-----|--------|
| M1 | — |
| M2 | — |

### Arıza (`ariza_turu`)
| Kod | Anlamı |
|-----|--------|
| E | — |
| A | — |
| M | — |
| O | — |
| Belirsiz | Nedeni bilinmiyor |

> **Not:** E/A/M/O kodlarının tam açılımları dokümante edilmemiştir. Kullanıcıdan teyit alınmalı.

### Planlı Duruş (`planli_durus_turu`)
| Kod | Anlamı | Açıklama Zorunlu |
|-----|--------|------------------|
| P1 | — | Evet |
| P2 | — | Evet |
| P3 | — | Hayır |

### Setup ve Ayar (`setup_turu`)
| Kod | Anlamı |
|-----|--------|
| SA1 | — |
| SA2 | — |

### Müşteri Kaynaklı Duruş (`musteri_durus_turu`)
| Kod | Anlamı |
|-----|--------|
| MKB1 | — |
| MKB2 | — |
| MKB3 | — |

> **Not:** MKB1/2/3 kodlarının tam açılımları dokümante edilmemiştir.

## Validasyon Özeti

```
Duruş süresi > 0 girilmişse → ilgili *_turu alanı seçilmeli
                    ↓
Arıza türü seçildiyse → ariza_aciklama zorunlu
Planlı Duruş P1 veya P2 seçildiyse → planli_durus_aciklama zorunlu
Setup türü seçildiyse → setup_aciklama zorunlu
Müşteri türü seçildiyse → musteri_durus_aciklama zorunlu
```

## Arıza Giderme Akışı

Arıza kaydedildikten sonra `/ariza` sayfasından çözüme kavuşturulabilir:
- `ariza_giderildi: true` olarak işaretlenir
- `ariza_giderilme_aciklama` zorunludur (boş geçilemez)
- `ariza_giderildi_at` timestamp'i kaydedilir
- `markArizaResolved` action'ı: yalnızca `ariza > 0` olan satırları günceller

## İlgili Sayfalar

- [Üretim Formu](uretim-formu.md) — duruşların form içindeki konumu
- [DB Tabloları](../entities/db-tablolari.md) — `manuf_production_rows` kolon detayları
