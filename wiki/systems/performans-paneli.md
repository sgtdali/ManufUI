---
updated: 2026-06-18
sources: [src/app/dashboardy/page.tsx, src/app/actions.ts]
---

# Performans Paneli

Detaylı performans ve kümülatif hedef izleme paneli (`/dashboardy`). Saudi Arabistan üretim sahasındaki tüm hücrelerin hedeflerini ve gerçekleşen üretim adetlerini takip eder.

## Arayüz ve Özellikler

1. **Tarih Aralığı Seçici:**
   - Kullanıcı başlangıç ve bitiş tarihlerini belirleyerek asenkron olarak o aralıktaki toplam üretim adetlerini çeker.
   - Hızlı seçim şablonları (Son 7 Gün, Son 30 Gün, Bu Ay) bulunur.
   - Sayfa ilk açıldığında varsayılan olarak `13.06.2026` - `09.07.2026` aralığını listeler.

2. **Genel İlerleme Durumu:**
   - Panelde listelenen tüm hücrelerin kümülatif gerçekleşen üretim toplamının toplam kampanya hedefine (Hücre Sayısı × 2000 = 22.000) oranını yüzde olarak gösterir.
   - Bu yüzdenin sağında parantez içerisinde **`(%[Hedeflenen Yüzde])`** yer alır. Bu hedef yüzdesi, o gün itibarıyla hücre bazında hedeflenen kümülatif miktarların toplamının genel hedefe (22.000) oranıdır. (Örn: `%12 (%22)`)

3. **Hücre Bazlı İlerleme Tablosu:**
   - Her hücre için gerçekleşen üretim miktarı, kampanya hedefi (`2000`), o güne kadar hedeflenmiş miktar ve performans yüzdesiyle ilerleme çubuğu gösterilir.
   - N602 ve N603 hücreleri **"N602-N603 Hücresi"** olarak tek satırda birleştirilmiştir (toplam kampanya hedefi 2000'dir).

---

## Hedeflenen Miktar (Targeted Quantity) Hesaplaması

Her hücre için sayfanın açıldığı andaki güncel tarih (today) ile hücreye özel belirlenen başlangıç tarihi arasındaki **hafta içi gün sayısı** (Cuma ve Cumartesi günleri hariç, başlangıç günü ve bugün dahil) hesaplanır. Elde edilen gün sayısı **100** ile çarpılarak hedef miktar sütununa yazılır.

### Hücre Özelinde Başlangıç Tarihleri

| Hücre Adı | Başlangıç Tarihi |
|-----------|------------------|
| Pres Hücresi | 14.06.2026 |
| ROB108 Hücresi | 15.06.2026 |
| Flowform Hücresi | 15.06.2026 |
| ROB104 Hücresi | 16.06.2026 |
| N602-N603 Hücresi | 16.06.2026 |
| ROB109 Hücresi | 17.06.2026 |
| Quench Hücresi | 17.06.2026 |
| ROB110-111 Hücresi | 18.06.2026 |
| Fosfat Hücresi | 18.06.2026 |
| Boya Hücresi | 21.06.2026 |
| Diğer Hücreler (Varsayılan) | 14.06.2026 |
