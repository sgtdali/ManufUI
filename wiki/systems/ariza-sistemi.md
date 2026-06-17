---
updated: 2026-06-17
sources: [src/app/ariza/page.tsx, src/app/ariza/ArizaRecordsTable.tsx]
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

## Mevcut Görünüm ve Filtreler (`/ariza`)

- **Metrik Kartları:** Toplam arıza dakikası, ortalama arıza süresi, en uzun arıza ve son gün arızası gösterilmektedir.
- **Özet Panelleri:** Tür bazlı ve bölüm bazlı kümülatif duruş grafikleri yer alır.
- **Kayıt Listesi ve Filtreleme (`ArizaRecordsTable.tsx`):**
  - **Metin Arama:** Bölüm, sorumlu veya açıklama alanlarında kelime bazlı arama yapılabilir.
  - **Kategori Filtreleri:** Bölüm, arıza türü ve arızanın çözüm durumu ("Giderildi" / "Giderilmedi") seçilebilir.
  - **Tarih Filtreleri:** Başlangıç Tarihi (`startDate`) ve Bitiş Tarihi (`endDate`) girilerek kayıtlar tarih aralığına göre client tarafında reaktif olarak filtrelenebilir. Başlangıç tarihi varsayılan olarak **`13.06.2026`** (`2026-06-13`) değerini alır. "Temizle" butonu tarihleri de bu varsayılan başlangıç durumuna sıfırlar.
  - **Tür Güncelleme:** Tablo üzerinden doğrudan arıza türleri dinamik select kutuları ile güncellenebilir ve Supabase asenkron olarak güncellenir.

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
