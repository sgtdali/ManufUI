---
updated: 2026-05-28
sources: [src/app/ariza/page.tsx]
---

# Arıza Sistemi

## Mevcut Veri Yapısı

Her arıza kaydında şunlar var:

| Alan | Tip | Açıklama |
|------|-----|----------|
| `bolum` | string | Hücre adı |
| `tarih` | date | Gün |
| `zaman_dilimi` | string | Saat dilimi |
| `ariza` | number | Süre (dakika) |
| `ariza_turu` | string | Arıza türü |
| `ariza_aciklama` | string | Açıklama metni |
| `ariza_giderildi` | boolean | Çözüldü mü? |
| `ariza_giderilme_aciklama` | string | Nasıl çözüldü |

## Mevcut Görünüm (`/ariza`)

- Toplam arıza dakikası
- Ortalama arıza süresi
- Tür bazlı bar chart
- Bölüm bazlı bar chart
- Kayıt listesi

Tamamen statik özet — trend analizi yok.

## Eksik / İstenen Özellikler

- Hücre bazlı haftalık/aylık trend görünümü
- Tekrar eden arıza türlerinin tespiti (pattern analizi)
- "Bu hücre yakında arıza yapabilir" öngörüsü
- Proaktif yedek parça planlaması için veri tabanı

## Asıl Problem

Sistem şu an **reaktif** çalışıyor — arıza olunca koşuluyor. Hedef: geçmiş veriden pattern çıkarıp **proaktif önlem** almak.

## İlgili Sayfalar

- [Hücreler](../entities/hucreler.md)
- [DB Tabloları](../entities/db-tablolari.md)
- [Açık Konular](../decisions/acik-konular.md)
