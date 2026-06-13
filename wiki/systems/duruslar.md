---
updated: 2026-06-13
sources: [src/lib/types.ts, src/app/page.tsx, src/app/_components/ProductionTable.tsx, src/app/_components/DowntimeExplanationDialog.tsx]
---

# Duruş Kodları ve Alt Türler

Üretim formunda her satırda girilen duruş türleri, alt kategorileri ve validasyon kuralları. Kaynak: `DURUS_KOLONLARI` (`src/lib/types.ts`).

## Duruş Kolonları ve Sütun Yapısı

| Kolon | DB Alanı | Alt Tür Var mı | Açıklama Zorunlu mu | Hücre Ayrımı / Özel Durumlar |
|-------|----------|----------------|---------------------|------------------------------|
| Mola | `mola` | Evet | Hayır | Tüm hücrelerde ortaktır. |
| Arıza | `ariza` | Evet | Kısmen | **Pres Hücresi**, **ETM Hücresi** ve **ROB104, ROB108, ROB109 Hücreleri** için alt türler özeldir. Teknik arızalar açıklama gerektirirken operasyonel arızalar gerektirmez. |
| Planlı Duruş | `planli_durus` | Evet | Kısmen | Tüm hücrelerde ortaktır. Sadece **"Planlı Bakım"** için açıklama zorunludur. |
| Setup ve Ayar / Hazırlık | `setup_ve_ayar` | Evet | Kısmen | **Pres ve ETM Hücresi**'nde kolon adı **Hazırlık**'tır. Pres'te sadece *Kaçak Kontrolü* açıklama gerektirir. ETM'de hiçbir seçenek açıklama gerektirmez. Diğer hücrelerde hep zorunludur. **Quench Hücresi**'nde bu sütun gizlenir. |
| Takım Değişimi / Holder - Insert Değişim / Rejim Bekleme | `takim_degisimi` | Evet (ETM) | Hayır | **Pres Hücresi**'nde gizlenir. **ETM Hücresi**'nde adı **"Holder - Insert Değişim"** (4 alt tür) olur. **Quench Hücresi**'nde adı **"Rejim Bekleme"**'dir (açıklama veya alt tür yok). Diğerlerinde standarttır. |
| Kalıp Demontaj | `kalip_demontaj` | Evet | Hayır | **Yalnızca Pres Hücresi**'nde görünür. |
| Kalıp Montaj | `kalip_montaj` | Evet | Hayır | **Yalnızca Pres Hücresi**'nde görünür. |
| Çalışan Makine Sayısı | `calisan_makine_sayisi` | Hayır | Kısmen | **ETM, ROB104, ROB108, ROB109** hücrelerinde görünür. Makine sayısı varsayılan limitin altına düşerse açıklama zorunludur. |
| Bir Önceki İstasyon Bekleme | `onceki_istasyon_bekleme` | Hayır | Hayır | Tüm hücrelerde ortaktır. |
| Müşteri Kaynaklı Duruş | `musteri_kaynakli_durus` | Evet | Evet | Tüm hücrelerde ortaktır. |
| Kalite Kaynaklı Duruş | `kalite_kaynakli_durus` | Hayır | Hayır | Tüm hücrelerde ortaktır. |

---

## Alt Tür Seçenekleri

### 1. Mola (`mola_turu`)
* `Çay`
* `Yemek`

### 2. Arıza (`ariza_turu`)
* **Standart Hücreler (Pres, ETM, ROB104, ROB108, ROB109 Dışı):**
  * `E` (Elektrik)
  * `A` (Akışkan)
  * `M` (Mekanik)
  * `O` (Ortak)
  * `Kalite`
  * `Belirsiz`
* **Pres Hücresi Özel (Lokasyon Bazlı):**
  * `Pres Öncesi`, `Pres`, `Pres Sonrası`
  * Her lokasyon seçildiğinde açıklama dialog'u açılır ve lokasyona özel alt kategori + detay metin kaydedilir (`[AltKategori] metin` formatında).
  * **"Hidrolik Yağ Sıcaklık Alarmı"** (yalnızca `Pres` lokasyonunda): Detaylı açıklama zorunlu değildir; dialog'da textarea gizlenir, kayıt `[Hidrolik Yağ Sıcaklık Alarmı]` olarak saklanır.
* **ETM Hücresi Özel:**
  * *Teknik (Açıklama Zorunlu):* `Mekanik`, `Elektrik`, `Akışkan`, `Belirsiz`, `SBU Arıza`, `Calor Konveyör Arıza`, `Robot`
  * *Operasyonel (Açıklama Gerekmez):* `SBU Parça Boşaltma`, `SBU Parça Yükleme`, `Kesici Takım Yok`, `Bor Yağı Bitti`
* **ROB104, ROB108, ROB109 Hücreleri Özel:**
  * *Teknik (Açıklama Zorunlu):* `Mekanik`, `Elektrik`, `Akışkan`, `Belirsiz`, `Robot`
  * *Operasyonel (Açıklama Gerekmez):* `Talaş Arabası Dolu`, `Manuel İşlemler`, `Kesici Takım Yok`, `Bor Yağı Bitti`

### 3. Planlı Duruş (`planli_durus_turu`)
* `Planlı Bakım` (Açıklama ZORUNLU)
* `Parça Basmama Kararı` (Tüm hücrelerde açıklama gerekmez)
* `Kasa Alma - Bırakma` (Sadece **ETM, ROB104, ROB105, Flowform, N602, N603 Hücreleri**, açıklama gerekmez)

### 4. Setup ve Ayar / Hazırlık (`setup_turu`)
* **Standart Hücreler (Setup ve Ayar):**
  * `SA1` (Açıklama ZORUNLU), `SA2` (Açıklama ZORUNLU)
* **Pres Hücresi (Hazırlık):**
  * `Kalıp Isıtma`, `Fırın Isıtma Bekleme`, `IHU Rejim Bekleme`, `Kalıp Soğuma Bekleme`, `Offset Alma` (Açıklama gerekmez)
  * `Kaçak Kontrolü` (Açıklama ZORUNLU)
* **ETM Hücresi (Hazırlık):**
  * `Parça Ölçüm`, `Otomatik Mod Hazırlık` (Açıklama gerekmez)

### 5. Takım Değişimi (`takim_degisim_turu`)
* **ETM Hücresi (Holder - Insert Değişim):**
  * `Holder Değişim`, `Holder Ayar`, `Insert Değişim`, `Punta Değişim` (Açıklama gerekmez)

### 6. Kalıp Demontaj & Montaj (`kalip_demontaj_turu` / `kalip_montaj_turu`)
* **Yalnızca Pres Hücresi** için (Açıklama gerekmez):
  * `HFP Erkek BCE`, `HFP Erkek UpS`, `HFP Dişi`, `HIP Ringler`, `HIP Erkek`

### 7. Müşteri Kaynaklı Duruş (`musteri_durus_turu`)
* `Utility Eksiği`, `Consumable Eksiği`, `Operatör Bekleme`

---

## Validasyon ve Kaydetme Kuralları

```
Duruş süresi > 0 veya limit altı makine sayısı girilmişse → İlgili alt tür seçimi ZORUNLU
                                ↓
Arıza seçildiğinde:
  - ETM Hücresi'nde operasyonel arıza ise → Açıklama gerekmez
  - Diğer durumlarda → ariza_aciklama ZORUNLU
Planlı Duruş seçildiğinde:
  - Sadece "Planlı Bakım" ise → planli_durus_aciklama ZORUNLU
  - Diğerlerinde → Açıklama gerekmez
Setup/Hazırlık seçildiğinde:
  - ETM Hücresi'nde → Açıklama gerekmez
  - Pres Hücresi'nde sadece "Kaçak Kontrolü" ise → setup_aciklama ZORUNLU
  - Diğer tüm hücrelerde → setup_aciklama ZORUNLU
Makine Sayısı eksik girildiğinde:
  - Sınırın altına düşüldüyse → calisan_makine_aciklama ZORUNLU
Müşteri duruş türü seçildiyse → musteri_durus_aciklama ZORUNLU
```

---

## İlgili Sayfalar

- [Üretim Formu](uretim-formu.md) — duruş giriş ekranı ve hücreler
- [DB Tabloları](../entities/db-tablolari.md) — `manuf_production_rows` tablosu
