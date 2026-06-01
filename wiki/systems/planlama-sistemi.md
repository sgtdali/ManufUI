---
updated: 2026-06-01
sources: [src/app/schedule/page.tsx, src/app/schedule/utils.ts, src/app/schedule/_components/ScheduleTable.tsx, src/app/schedule/_components/MoldChangesSidebar.tsx]
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

## Mevcut Schedule Sayfası (`/schedule`)

Sadece **Pres hücresi** için simülasyon motoru var:

- Günlük hedef vs gerçekleşen karşılaştırması
- Kalıp ömrü ve değişim planlaması (Erkek Kalıp Değişimi, Dişi Kalıp Değişimi, HIP Ring Değişimi olarak 3 ayrı satır halinde Gantt şemasında ve planlama listesinde takip edilir)
- Her kalıp türü için duruşlar ve engelleme/gizleme (disabled segments) kararları bağımsız olarak yönetilebilir (`mold-maintenance-male`, `mold-maintenance-female`, `mold-maintenance-ring`)
- Fazla mesai etkisi hesabı
- WIP → ETM geçişi
- Kurtarma senaryosu: açığı kapatmak için kaç gün fazla mesai gerektiği

Detaylar için bkz. [WIP Hesabı](wip-hesabi.md).

## Eksikler

- Sadece Pres hücresi var, diğer 11 hücre schedule'a dahil değil
- "Bu hafta neden kaybettik" analizi yok
- Arıza verisi ile planlama arasında bağlantı yok
- Veri → karar köprüsü yok: veri toplanıyor ama planlama hâlâ sezgisel

## İstenen

**Haftalık kayıp analizi:** Hücre bazında bu hafta ne kadar kayıp yaşandı, sebebi ne, önümüzdeki hafta için öneri.
Tamamen mevcut Supabase verisiyle yapılabilir.

## Açık Sorular

- Diğer hücreler schedule sayfasına mı eklenmeli, yoksa ayrı sayfa mı olmalı?
- Haftalık analiz otomatik mi tetiklenmeli, yoksa manuel mi?

## İlgili Sayfalar

- [WIP Hesabı](wip-hesabi.md)
- [Arıza Sistemi](ariza-sistemi.md)
- [Hücreler](../entities/hucreler.md)
- [Açık Konular](../decisions/acik-konular.md)
