---
updated: 2026-06-02
sources: [src/app/schedule/constants.ts, src/app/schedule/utils.ts, src/app/schedule/types.ts, src/app/schedule/overview/constants.ts, src/app/schedule/overview/actions.ts]
---

# WIP Hesabı ve Üretim Simülasyonu

`/schedule` sayfasının arkasındaki simülasyon motoru. `buildCellChain` üst zinciri topolojik sırayla simüle ederek seçili hücrenin günlük kapasitesini, alet/kalıp ömürlerini ve WIP akışını hesaplar. Tüm 12 hücre desteklenir. Ayrıca Genel Hat Görünümü üzerinden tüm 12 hücre arasındaki WIP (Work-in-Progress) stok geçişleri kronolojik kümülatif üretim farkları üzerinden hesaplanır.

## Simülasyon Mimarisi (`buildCellChain`)

`buildSchedule` tek hücre için simüle eder; `buildCellChain` ise seçili hücrenin tüm upstream zincirini topolojik sırayla (`getUpstreamChain`) simüle edip her hücrenin günlük çıktısını bir sonrakine `upstreamOutput` olarak geçirir.

```
getUpstreamChain("ROB108") → ["Pres Hücresi", "ETM Hücresi"]
buildCellChain:
  simulate(Pres)  → pressOutput[date] = pressed
  simulate(ETM, upstreamOutput=pressOutput)  → etmOutput[date] = pressed
  simulate(ROB108, upstreamOutput=etmOutput) → return DayPlan[]
```

Yeni hücre eklemek için:
1. `CELL_STATE_CONFIG` (`overview/constants.ts`) içine başlangıç field'larını ekle.
2. Gerekirse `buildSchedule` içine yeni hücre bloğu yaz; yoksa generic kapasite mantığı otomatik devreye girer.
3. Başka hiçbir dosyaya dokunmak gerekmez.

## Per-Hücre Başlangıç Durumu (`CELL_STATE_CONFIG`)

`overview/constants.ts`'te tanımlanır. Her hücre için kullanıcının sidebar'dan girebileceği başlangıç sayaçlarını belirtir.

| Hücre | Alanlar |
|-------|---------|
| Pres Hücresi | maleRemaining, femaleRemaining, ringRemaining |
| ETM Hücresi | wip, etm1Cutting, etm2Cutting, etm1Drill, etm2Drill |
| Diğerleri | (henüz tanımlı değil — generic kapasite kullanır) |

`page.tsx`'te `cellInitialState: Record<CellName, Record<string, string>>` state'i bu değerleri tutar. Hücre değiştiğinde WIP, `manuf_wip_stock` tablosundan otomatik yüklenerek `wip` alanına yazılır.

## Varsayılan Parametreler

| Parametre | Sabit | Değer | Açıklama |
|-----------|-------|-------|----------|
| Vardiya başlangıcı | `SHIFT_START` | 07:45 | — |
| Vardiya bitişi | `SHIFT_END` | 17:15 | — |
| Fırın başlangıcı | `FURNACE_START` | 07:00 | Standart Gantt şablonunda fırın ısıtma 07:00-08:00 |
| Toplam vardiya | `SHIFT_MINUTES` | 570 dk | — |
| Fırın ısınma | `NORMALIZATION_WARMUP_MINUTES` | 60 dk | Standart 07:00-08:00 fırın ısıtma bloğu |
| Pres öncesi ısınma | `PRE_PRESS_HEAT_MINUTES` | 30 dk | Parça fırından çıkınca prese hazır olma süresi |
| Pres çevrim | `PRESS_CYCLE_MINUTES` | 3 dk | Bir parça preslemek için geçen süre |
| Normalizasyon işlem | `NORMALIZATION_PROCESS_MINUTES` | 270 dk | Fırında işlem süresi (aynı gün ETM'ye geçiş hesabında kullanılır) |
| Erkek kalıp ömrü | `MALE_DIE_INTERVAL` | 500 adet | — |
| Dişi kalıp ömrü | `FEMALE_DIE_INTERVAL` | 1300 adet | — |
| Erkek kalıp değişim | `MALE_DIE_CHANGE_MINUTES` | ~285 dk (570/2) | — |
| Dişi kalıp değişim | `FEMALE_DIE_CHANGE_MINUTES` | 1140 dk (570×2) | — |

Bu parametreler `manuf_schedule_params` tablosundan yüklenir ve kullanıcı arayüzünden değiştirilebilir. Bkz. [DB Tabloları](../entities/db-tablolari.md).

## Simülasyon Mantığı (`buildSchedule`)

Her gün için sırayla:

1. **İş günü belirlenir**: Pazartesi–Cuma (0–4) veya `forceWorkday` override'ı.
2. **Bakım dakikası hesaplanır**: Dişi kalıp değişimi önceliklidir.
   - `femaleRemaining <= 0` → dişi kalıp değişimi başlar (`femaleDieChangeMinutes` dk)
   - `maleRemaining <= 0` → erkek kalıp değişimi başlar (`maleDieChangeMinutes` dk)
   - Carryover: günde bitirilemeyen bakım bir sonraki güne taşınır.
3. **Pres başlangıcı hesaplanır**:
   ```
   pressStart = max(shiftStart + maintenanceMinutes, furnaceStart + warmup) + prePressHeat
   ```
4. **Kapasite hesaplanır**:
   ```
   pressMinutes = shiftEnd - pressStart
   ```
   Kalıp soğutma (`dieCoolingMinutes`) vardiya içi pres kapasitesinden düşülmez; Pres prosesi vardiya sonuna kadar devam edebilir ve "Kalıp Soğutma" Gantt bloğu vardiya sonrasına sarkabilir.
5. **Pressed değeri seçilir** (öncelik sırası):
   - `override.pressed` → senaryo
   - `actuals[key]` → gerçekleşen (Supabase'den)
   - `capacityPressed` → plan
6. **Kalıp ömürleri güncellenir**: `maleRemaining`, `femaleRemaining` her gün basılan adet kadar azalır.

## ETM Hücresi WIP Kısıt Simülasyonu

ETM hücresinin günlük üretimi, fiziksel yarı mamul (WIP) stoğu ile sınırlıdır. Bu kısıti simüle etmek için:

1. **Giriş Değerleri**:
   - `initialWip` (Başlangıç WIP): Planlanan dönemin başlangıcındaki (ilk günden 1 gün önceki) yarı mamul stok adeti. Arayüzde ETM Hücresi seçildiğinde sol menüden el ile girilebilir, varsayılan olarak `startDate - 1 day` tarihindeki `manuf_wip_stock` tablosundan yüklenir.
   - `upstreamOutput` (Üst Akış Pres Çıkışı): ETM'nin üst akış hücresi olan Pres Hücresi'nin günlük simüle edilen üretim miktarları (`pressed`). Planlama sayfasında ETM Hücresi seçildiğinde, arka planda önce Pres Hücresi simüle edilir ve elde edilen günlük üretim miktarları ETM simülasyonuna aktarılır.
2. **Kümülatif Takip**:
   - Her gün $t$ için kullanılabilir WIP miktarı hesaplanır:
     $$\text{availableWip}_t = \text{cumulativeWip}_{t-1} + \text{upstreamOutput}_t$$
   - ETM'nin o günkü teorik kapasitesi (`capacityProduced`) ve hedeflenen/senaryo üretimi (`inputProduced`), $\text{availableWip}_t$ ile sınırlanır:
     $$\text{produced}_t = \min(\text{inputProduced}_t, \text{availableWip}_t)$$
   - Gün sonundaki kalan WIP miktarı bir sonraki güne aktarılır:
     $$\text{cumulativeWip}_t = \text{availableWip}_t - \text{produced}_t$$
   - Gün başı ve gün sonu WIP stokları returned `DayPlan` objesinde `etmWipStart` ve `etmWipEnd` olarak saklanır ve planlama tablosunda (`WIP (Başla → Bitir)`) sütunu altında gösterilir.

## Genel Hat WIP Stok Hesabı (`calculateAndSaveWip`)

Tüm hat boyunca hücreler arası WIP seviyeleri kronolojik kümülatif üretim farkları üzerinden hesaplanır:

1. **Kümülatif Üretim Sayacı**: Seçili tarih aralığında her gün için tüm hücrelerin kümülatif gerçekleşen üretimleri (`actuals`) güncellenir.
2. **Hücreler Arası Fark**: Hücre $A$ (kaynak) ile Hücre $B$ (hedef) arasındaki WIP stoğu:
   $$\text{WIP}_{A \to B} = \text{Kümülatif Üretim}_A - \text{Kümülatif Üretim}_B$$
3. **Özel Birleşik Hatlar**:
   - **ROB104 → N602 / N603**: ROB104 hücresinden çıkan parçalar N602 ve N603 fırınlarına paralel beslenebildiği için birleşik hesaplanır:
     $$\text{WIP}_{\text{ROB104} \to \text{N602}} = \text{Kümülatif}_{\text{ROB104}} - (\text{Kümülatif}_{\text{N602}} + \text{Kümülatif}_{\text{N603}})$$
   - **N602 / N603 → ROB109**: N602 ve N603 fırınlarından çıkan parçalar ROB109 robot hücresinde birleştiği için:
     $$\text{WIP}_{\text{N602} \to \text{ROB109}} = (\text{Kümülatif}_{\text{N602}} + \text{Kümülatif}_{\text{N603}}) - \text{Kümülatif}_{\text{ROB109}}$$
4. **Manuel Override Koruma**: Kullanıcıların `manuf_wip_stock` tablosunda manuel olarak güncellediği (`override_edildi = true`) değerler otomatik hesaplama sırasında ezilmez.

## Hücre Akış Sırası (CELL_FLOWS)

```
Pres → ETM → ROB108 → Flowform → ROB104 → N602 ─┐
                                              N603 ─┴→ ROB109 → Quench → ROB110-111 → Fosfat → Boya
```

WIP stok takibi `manuf_wip_stock` tablosunda tutulur (kaynak_hucresi → hedef_hucresi arası bekleyen parça).

## DayPlan Tipi

`buildSchedule` her gün için `DayPlan` döndürür:

| Alan | Açıklama |
|------|----------|
| `pressed` | O gün basılan (veya planlanmış) adet |
| `capacityPressed` | Teorik maksimum kapasite |
| `sameDayEtmReady` | Aynı gün ETM'ye geçebilecek adet |
| `maintenanceMinutes` | Kalıp değişimi için harcanan süre |
| `pressStartTime` | Presin fiilen başladığı saat |
| `maleRemainingEnd` | Günün sonunda erkek kalıpta kalan adet |
| `femaleRemainingEnd` | Günün sonunda dişi kalıpta kalan adet |
| `source` | `"plan"` / `"actual"` / `"scenario"` |
| `lastFurnaceExitTime` | Son parçanın fırından çıkış saati |
| `etmWipStart` | Günün başındaki WIP stoğu (ETM hücresi için) |
| `etmWipEnd` | Günün sonundaki WIP stoğu (ETM hücresi için) |

## Override Sistemi

`DayOverride` ile belirli günler geçersiz kılınabilir:
- `pressed`: Gerçekleşen adet (senaryo girişi)
- `overtimeMinutes`: Ekstra mesai süresi
- `forceWorkday`: Tatil gününü iş günü yap
- `shiftStart`, `shiftEnd`, `furnaceStart`: O güne özgü saat

`furnaceStart` gün bazlı bağımsız bir override olarak davranır. `/schedule` Gantt detayında Pres hücresi için doğrudan saat alanından girilebilir veya "Fırın Isıtma" bloğu sürüklenerek ayarlanabilir; bu ayar vardiya başlangıç/bitiş penceresine bağlı değildir. Fırın bloğu vardiyadan önceye taşındığında Gantt zaman alanı sola genişler, fakat "Vardiya" çubuğu gerçek vardiya başlangıç/bitiş saatlerinde sabit kalır.

## İlgili Sayfalar

- [Hücreler](../entities/hucreler.md) — CELL_FLOWS ve akış sırası
- [DB Tabloları](../entities/db-tablolari.md) — `manuf_schedule_params`, `manuf_wip_stock`
