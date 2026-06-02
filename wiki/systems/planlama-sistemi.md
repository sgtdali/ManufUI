---
updated: 2026-06-02
sources: [src/app/schedule/page.tsx, src/app/schedule/utils.ts, src/app/schedule/_components/ScheduleTable.tsx, src/app/schedule/_components/SettingsSidebar.tsx, src/app/schedule/overview/constants.ts]
---

# Planlama Sistemi

## Hedef

4 haftada hücre başına **2000 parça**. Şu an bu hedefe ulaşılamıyor.

## Kayıp Sebepleri

| Sebep | Açıklama |
|-------|----------|
| Arıza | Ekipman arızası |
| Eksik malzeme | Tedarik kesintisi |
| Müşteri personeli | Verimsizlik / devamsızlık |
| Diğer | Karışık / sınıflandırılmamış |

## Schedule Sayfası (`/schedule`)

Tek sayfa, üstteki `<select>` ile 12 hücre arasında geçiş yapılır. Seçili hücre değişince o hücrenin tüm upstream zinciri topolojik sırayla simüle edilir ve sonuç aynı `ScheduleTable`/Gantt UI'ı ile gösterilir.

**Desteklenen hücreler:**

| Hücre | Simülasyon tipi | Özel state |
|-------|----------------|------------|
| Pres Hücresi | Pres (kalıp ömrü, fırın, Gantt) | maleRemaining, femaleRemaining, ringRemaining |
| ETM Hücresi | ETM (takım ömrü, WIP kısıt) | wip, etm1/etm2 cutting/drill |
| Diğer 10 hücre | Generic kapasite (vardiya × max kapasite oranı) | — |

**Cascade:** Bir upstream hücrede (örn. Pres) ayar değiştirilip Kaydet yapılırsa, downstream hücreler (ETM, ROB108 …) bir sonraki sayfada güncel upstream verisini görür. Aynı sayfada kalmak ise `upstreamCellData` state'inden anlık güncelleme yapar.

Detaylar için bkz. [WIP Hesabı](wip-hesabi.md).

## Eksikler / Açık Konular

- Yeni hücreler için özel simülasyon mantığı henüz yazılmadı (generic kapasite kullanıyor)
- "Bu hafta neden kaybettik" analizi yok
- Arıza verisi ile planlama arasında bağlantı yok

## İstenen

**Haftalık kayıp analizi:** Hücre bazında bu hafta ne kadar kayıp yaşandı, sebebi ne, önümüzdeki hafta için öneri.
Tamamen mevcut Supabase verisiyle yapılabilir.

## İlgili Sayfalar

- [WIP Hesabı](wip-hesabi.md)
- [Arıza Sistemi](ariza-sistemi.md)
- [Hücreler](../entities/hucreler.md)
- [Açık Konular](../decisions/acik-konular.md)
