---
updated: 2026-06-30
sources: [src/app/hat-forecast/page.tsx, src/app/hat-forecast/_actions/actions.ts, src/app/hat-forecast/_lib/constants.ts, src/app/hat-forecast/_components/forecastUtils.ts, src/app/hat-forecast/_components/ForecastClient.tsx, src/app/hat-forecast/_components/CalibrationTable.tsx, src/app/hat-forecast/_components/ProjectionView.tsx, src/app/hat-forecast/_components/InterventionPanel.tsx]
---

# Hat Kapanış Tahmini (`/hat-forecast`)

Pres hücresi belirli bir tarihte (şu an: **9 Temmuz 2026**) üretimi durdurduktan sonra hattaki kalan parçaların downstream hücrelerden ne zaman geçeceğini simüle eden rundown (tüketim) tahmini sayfası.

## Genel Mantık

1. **Aktüel veriler** (13.06.2026 → bugün): `manuf_production_records` + `manuf_production_rows` tablolarından çekilir.
2. **Saatlik ortalama kalibrasyonu**: Kullanıcı saat × hücre bazında hangi slot'ların ortalamaya dahil edileceğini seçer.
3. **WIP başlangıcı**: 13.06'dan bugüne kümülatif üretim farkları üzerinden hesaplanır (aktüellerden).
4. **Projeksiyon**: Bugünden itibaren her gün, her hücre için WIP simülasyonu yapılır. Pres end date'inden sonra Pres üretimi = 0.
5. **Müdahaleler**: Kullanıcı gelecekteki gün × hücre bazında kapasite override girebilir.

## Dosya Yapısı

```
src/app/hat-forecast/
  page.tsx                    # Server component; aktüelleri yükler, START_DATE ve PRES_END_DATE sabitleri burada
  _actions/actions.ts         # "use server" — sadece loadForecastActuals() async fonksiyonu
  _lib/constants.ts           # FORECAST_CELLS, ForecastCell tipi, SlotActual tipi (use server dışı)
  _components/
    forecastUtils.ts          # Saf fonksiyonlar: computeCellAverages, computeCurrentWip, computeProjection, computeFinishDates
    ForecastClient.tsx        # Ana client orchestrator; tüm state burada (selectedSlots, interventions)
    CalibrationTable.tsx      # Saat × hücre grid, collapse'lı günler, checkbox seçimi
    ProjectionView.tsx        # Özet bitiş tarihi kartları + gün × hücre detay tablosu
    InterventionPanel.tsx     # Gelecek gün × hücre müdahale ekleme/kaldırma formu
```

**Önemli:** `_actions/actions.ts` dosyasında `"use server"` direktifi var. Bu dosyadan sadece async fonksiyon export edilebilir. Sabit ve tipler `_lib/constants.ts`'te tutulur.

## Kalibrasyon Tablosu

- **Satır yapısı**: Günler collapse/expand, her gün altında o günün saat dilimleri
- **Sütunlar**: 12 FORECAST_CELLS
- **Her hücre × saat**: Üretim adedi + duruş özeti (arıza, planli_durus, setup, takım değişimi, kalıp, mola, bekleme, müşteri, kalite toplamı dakika olarak)
- **Seçim birimi**: `SlotKey = "${bolum}||${tarih}||${zamanDilimi}"` formatında Set
- **Seçilmeyen slot**: Ortalamaya dahil edilmez; kullanıcı münferit olayları (tek seferlik arıza, bayram vb.) bu şekilde elemiş olur
- **Kısayollar**: Gün bazında "tümünü seç/kaldır", hücre bazında "↑Tüm / ↓Sıfır"
- **Sabit üst satır**: Her hücrenin hesaplanan saatlik ortalaması + günlük tahmini (ort × 9)

## Saatlik Ortalama Hesabı

```
saatlik_ort[hücre] = Σ(seçili slot uretim_adeti) / seçili slot sayısı
```

Quench hücresi "Günlük" tek slot'a sahip olduğundan tek bir satır olarak kalibrasyon tablosunda görünür.

## WIP Başlangıç Hesabı (`computeCurrentWip`)

Aktüel veriler üzerinden kümülatif fark:

| Junction | Formül |
|----------|--------|
| Pres→ETM | cumSum(Pres) − cumSum(ETM) |
| ETM→ROB108 | cumSum(ETM) − cumSum(ROB108) |
| ROB108→Flowform | cumSum(ROB108) − cumSum(Flowform) |
| Flowform→ROB104 | cumSum(Flowform) − cumSum(ROB104) |
| ROB104→N | cumSum(ROB104) − (cumSum(N602) + cumSum(N603)) |
| N→ROB109 | cumSum(N602) + cumSum(N603) − cumSum(ROB109) |
| ROB109→Quench | cumSum(ROB109) − cumSum(Quench) |
| Quench→ROB110 | cumSum(Quench) − cumSum(ROB110-111) |
| ROB110→Fosfat | cumSum(ROB110-111) − cumSum(Fosfat) |
| Fosfat→Boya | cumSum(Fosfat) − cumSum(Boya) |

Negatif çıkan değerler 0'a sabitlenir (`Math.max(0, ...)`).

## Projeksiyon Algoritması (`computeProjection`)

- Çalışma takvimi: Pazar(0)–Perşembe(4) iş günü, Cuma(5)–Cumartesi(6) hafta sonu
- Standart vardiya: **9 saat**
- Her gün sırayla Pres → ETM → ... → Boya işlenir
- Her hücre: `üretim = min(günlük_kapasite, mevcut_wip)`
- `günlük_kapasite`:
  - Müdahale "disabled" → 0
  - Müdahale "extraHours" → `saatlik_ort × (9 + extraHours)` (müdahale varsa hafta sonu da çalışır)
  - Normal iş günü → `saatlik_ort × 9`
  - Hafta sonu (müdahalesiz) → 0
- Pres end date'inden sonra Pres kapasitesi = 0
- N602/N603 paralel: kombine kapasite = n602_ort + n603_ort, WIP birlikte tüketilir, her biri kapasitesiyle orantılı üretir
- Maksimum 120 gün simüle edilir; tüm WIP sıfırlanınca erken durur

## Bitiş Tarihi Hesabı (`computeFinishDates`)

- Pres: `presEndDate` (sabit)
- Diğer hücreler: Projeksiyonda son `üretim > 0` olan gün

## Müdahale Yapısı

```typescript
InterventionMap = Record<tarih, Record<bolum, Intervention>>
Intervention = { disabled?: boolean; extraHours?: number }
```

Müdahale eklenince projeksiyon `useMemo` ile anında yeniden hesaplanır (saf fonksiyon, no side effects).

## İlgili Sayfalar

- [Hücreler](../entities/hucreler.md) — CELL_FLOWS ve akış sırası
- [WIP Hesabı](wip-hesabi.md) — kümülatif WIP mantığı
- [Performans Paneli](performans-paneli.md) — gerçekleşen takip (geçmişe dönük)
