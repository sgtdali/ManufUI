---
updated: 2026-06-15
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

Standart hücreler için zaman dilimleri:
* **Pazartesi–Perşembe (9 satır):** `08:00–09:00`, `09:00–10:00`, `10:00–11:00`, `11:00–12:00`, `12:00–13:00`, `13:00–14:00`, `14:00–15:00`, `15:00–16:00`, `16:00–17:00`
* **Cuma–Cumartesi (8 satır):** `09:00–10:00`, `10:00–11:00`, `11:00–12:00`, `12:00–13:00`, `13:00–14:00`, `14:00–15:00`, `15:00–16:00`, `16:00–17:00`

**ETM Hücresi ve Flowform Hücresi** için uzatılmış zaman dilimleri:
* **Pazartesi–Perşembe (13 satır):** Standart 9 satıra ek olarak `17:00–18:00`, `18:00–19:00`, `19:00–20:00`, `20:00–21:00` dilimleri de gösterilir.
* **Cuma–Cumartesi:** Diğer hücrelerle aynı 8 satır (uzatma yok).
* Sabit: `ETM_FLOWFORM_UZATILMIS_ZAMAN_DILIMLERI` (`src/lib/types.ts`).

**Quench Hücresi** için zaman dilimleri:
* Sadece tek bir satır üretilir ve zaman dilimi label'ı `"Günlük"` olarak ayarlanır.

Hangi setin kullanılacağı `getZamanDilimleriForCellAndDate(bolum, tarih)` yardımcı fonksiyonu ile belirlenir (`src/lib/types.ts`).

**Mevcut kayıt yüklenirken slot merge kuralı:** `applyRecordToForm` (`src/app/page.tsx`) DB'den gelen satırları `zaman_dilimi` label'ına göre eşleştirir. Beklenen slot listesindeki her slot için DB'de karşılık varsa o veri, yoksa boş satır kullanılır. Bu sayede eski kayıtlar (9 slot) yeni slot yapısıyla (13 slot) uyumlu şekilde açılır.

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
| Arıza | `ariza` + `ariza_turu` + `ariza_aciklama` | Dakika + alt tür + açıklama | ETM, Pres, ROB104, ROB108, ROB109 özel |
| Planlı Duruş | `planli_durus` + `planli_durus_turu` + `planli_durus_aciklama` | Dakika + alt tür + açıklama | Tüm (ETM, ROB104, ROB105, Flowform, N602, N603 hücrelerinde ek "Kasa Alma - Bırakma" alt türü vardır) |
| Setup ve Ayar / Hazırlık | `setup_ve_ayar` + `setup_turu` + `setup_aciklama` | Dakika + alt tür + açıklama | Pres ve ETM'de adı **Hazırlık**'tır. **Quench Hücresi**'nde bu sütun gizlenir. |
| Takım Değişimi / Holder - Insert Değişim / Rejim Bekleme | `takim_degisimi` | Dakika, alt tür yok / ETM'de var | **Pres Dışı** (ETM'de Holder-Insert Değişim, Quench'te **Rejim Bekleme** adını alır) |
| Kalıp Demontaj | `kalip_demontaj` + `kalip_demontaj_turu` | Dakika + alt tür | **Sadece Pres** |
| Kalıp Montaj | `kalip_montaj` + `kalip_montaj_turu` | Dakika + alt tür | **Sadece Pres** |
| Çalışan Makine Sayısı | `calisan_makine_sayisi` + `calisan_makine_aciklama` | Çalışan makine sayısı + açıklama | **ETM, ROB104, ROB108, ROB109** |
| Bir Önceki İstasyon Bekleme | `onceki_istasyon_bekleme` | Dakika, alt tür yok | Tüm |
| Müşteri Kaynaklı Duruş | `musteri_kaynakli_durus` + `musteri_durus_turu` + `musteri_durus_aciklama` | Dakika + alt tür + açıklama | Tüm |
| Kalite Kaynaklı Duruş | `kalite_kaynakli_durus` | Dakika, alt tür yok | Tüm |
| Hedef Üretim | `hedef_uretim_adeti` | Sağ sütunda. Pres, ETM, ROB104 ve ROB108 hücrelerinde cuma ve cumartesi günleri hariç varsayılan olarak `20` değerini alır ve salt okunurdur. | Tüm |

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
  - ROB104, ROB108, ROB109 Hücrelerinde sadece teknik arızalar (`Mekanik`, `Elektrik`, `Akışkan`, `Belirsiz`, `Robot`) ise → `ariza_aciklama` zorunlu
  - Diğer hücrelerde → `ariza_aciklama` zorunlu
- `planli_durus_turu` seçilmişse:
  - Sadece **"Planlı Bakım"** ise → `planli_durus_aciklama` zorunlu (Parça Basmama Kararı veya Kasa Alma - Bırakma gerekmez)
- Setup/Hazırlık seçilmişse:
  - Pres ve ETM Hücresi dışında → `setup_aciklama` zorunlu
  - Pres Hücresi'nde **sadece "Kaçak Kontrolü"** ise → `setup_aciklama` zorunlu
  - ETM Hücresi'nde → Açıklama gerekmez
- Çalışan makine sayısı sınırın (ETM: 2, ROB104: 2, ROB108: 6, ROB109: 2) altındaysa → `calisan_makine_aciklama` zorunlu
- `musteri_durus_turu` seçilmişse → `musteri_durus_aciklama` zorunlu

### Hedef/Gerçekleşen Fark Validasyonu & Kademeli Kayıt (Progressive Validation)
`validateTargetDowntime` (`src/lib/productionValidation.ts`):
- Hedef > Gerçekleşen ise eksik adet için duruş girilmeli.
- **Kademeli Doğrulama Kuralları:**
  - Formun gün içinde (örneğin saatlik veri girişleri sırasında) kaydedilebilmesi için validasyon sadece en son doldurulmuş satıra (`lastActiveIndex`) kadar yapılır.
  - Bir satırın aktif (veri girilmiş) sayılması için üretim adetinin doldurulmuş olması (`uretim_adeti !== null`) veya duruş sürelerinden en az birinin girilmiş olması (`enteredDowntime > 0`) gerekir. "Müşteri Var" seçeneği bu aktiflik kontrolünün dışındadır.
  - Son aktif satırdan sonra gelen gelecek saatler doğrulamadan muaf tutulur.
  - Kullanıcı arada bir saati boş geçip altındaki saatleri doldurursa, atlanan satır son aktif satırdan önce kaldığı için validasyon hatası üretilir.
- Gerekli dakika hesabı:
  - Standart hücreler (saatlik): `ceil(eksikAdet × (60 / hedef))`
  - **Quench Hücresi** (günlük): Zaman dilimi `"Günlük"` olduğu için vardiya süresi baz alınır. Hafta içi `540` dakika, Cuma-Cumartesi `480` dakika kullanılarak hesaplama yapılır: `ceil(eksikAdet × (vardiyaSüresi / hedef))`.
- Girilen toplam duruş dakikası bu değerin altındaysa kayıt reddedilir. (Kalıp Demontaj ve Kalıp Montaj dakikaları da toplam girilen duruşa dahildir.)

### Kalan Süre Rozetlerinin Gösterimi (`ProductionTable.tsx`)
- Arayüzdeki "Kalan Süre" rozetleri de kademeli validasyon mantığıyla çalışır:
  - **Doğrulanan Satırlar (Dizini <= `lastActiveIndex` olanlar):** Aralardaki atlanmış boş satırlar da dahil olmak üzere, bu aralıktaki tüm satırlarda kalan duruş süresi hesaplanır ve eksik girildiyse kırmızı renkli `"Kalan X dk"` rozetiyle kullanıcı uyarılır.
  - **Doğrulanmayan Satırlar (Gelecek Saatler):** Son aktif satırdan sonra gelen tüm satırlar için rozet alanı nötr gri renkte ve `-` (tire) simgesiyle gösterilir.

### Duruş Süresi Giriş Sınırları
- Standart saatlik satırlar için her bir duruş alanı maksimum **60 dakika** ile sınırlıdır.
- **Quench Hücresi** günlük satırı için tekil duruş alanları vardiya süresini kapsayacak şekilde maksimum **540 dakika** olarak sınırlandırılmıştır.

---

## Diğer Butonlar

- **Yenile**: Manuel yeniden yükleme
- **Dashboard**: `/dashboard` OEE sayfasına yönlendirme linki (Excel'e Aktar ve Performans Paneli butonları kaldırılmıştır)
- **Öneri Kayıt**: Tıklandığında `OneriKayitDialog` popup penceresini açar. Kullanıcıdan bir hücre seçmesi (formdakinden bağımsız) ve öneri girmesi istenir. Her iki alanın da doldurulması mecburi olup, veriler `saveSuggestion` server action'ı vasıtasıyla `manuf_suggestions` tablosuna kaydedilir.
