---
updated: 2026-05-28
sources: [src/lib/types.ts, src/app/schedule/overview/constants.ts]
---

# Üretim Hücreleri

12 üretim hücresi, sorumlular ve akış sırası.

## Hücre Listesi ve Sorumlular

| Hücre | Sorumlu |
|-------|---------|
| Pres Hücresi | Musa Akyol |
| ETM Hücresi | İbrahim Çetinbak |
| ROB104 Hücresi | Suat Tunç |
| ROB108 Hücresi | Suat Tunç |
| Flowform Hücresi | Gökalp Atmaca |
| N602 Hücresi | Gökalp Atmaca |
| N603 Hücresi | Gökalp Atmaca |
| ROB109 Hücresi | Mücahit Toptaş |
| Quench Hücresi | Calor |
| ROB110-111 Hücresi | Taner Çelik |
| Fosfat Hücresi | Halil Kesit |
| Boya Hücresi | Halil Kesit |

Sorumlular `BOLUM_SORUMLU` haritasında tanımlıdır (`src/lib/types.ts`). Üretim formu açılırken bölüm seçilince otomatik dolar.

## Akış Sırası (CELL_FLOWS)

```
Pres Hücresi
    ↓
ETM Hücresi
    ↓
ROB108 Hücresi
    ↓
Flowform Hücresi
    ↓
ROB104 Hücresi
    ↓ ↓
N602  N603 Hücresi
    ↓ ↓ (her ikisi de aynı downstream'e gider)
ROB109 Hücresi
    ↓
Quench Hücresi
    ↓
ROB110-111 Hücresi
    ↓
Fosfat Hücresi
    ↓
Boya Hücresi
```

### CELL_FLOWS Tam Tablosu

| Hücre | Upstream | Downstream |
|-------|----------|------------|
| Pres Hücresi | — | ETM Hücresi |
| ETM Hücresi | Pres Hücresi | ROB108 Hücresi |
| ROB108 Hücresi | ETM Hücresi | Flowform Hücresi |
| Flowform Hücresi | ROB108 Hücresi | ROB104 Hücresi |
| ROB104 Hücresi | Flowform Hücresi | N602, N603 |
| N602 Hücresi | ROB104 Hücresi | ROB109 Hücresi |
| N603 Hücresi | ROB104 Hücresi | ROB109 Hücresi |
| ROB109 Hücresi | N602, N603 | Quench Hücresi |
| Quench Hücresi | ROB109 Hücresi | ROB110-111 Hücresi |
| ROB110-111 Hücresi | Quench Hücresi | Fosfat Hücresi |
| Fosfat Hücresi | ROB110-111 Hücresi | Boya Hücresi |
| Boya Hücresi | Fosfat Hücresi | — |

`CELL_FLOWS` sabiti `src/app/schedule/overview/constants.ts` dosyasında tanımlıdır. WIP hesabında hücreler arası bekleyen parça sayısı bu akışa göre `manuf_wip_stock` tablosuna yazılır.

## Özel Notlar

- **N602 ve N603**: Paralel çalışır; her ikisi de ROB104'ten beslenir ve ROB109'a gönderir.
- **Quench**: Sorumlusu "Calor" (dış firma).
- **ROB110-111**: İki robot tek hücre kodu altında yönetilir.

## İlgili Sayfalar

- [WIP Hesabı](../systems/wip-hesabi.md) — hücreler arası akış simülasyonu
- [DB Tabloları](db-tablolari.md) — `manuf_wip_stock` tablosu
- [Üretim Formu](../systems/uretim-formu.md) — bölüm seçimi
