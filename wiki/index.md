---
updated: 2026-06-02
sources: []
---

# ManufUI Wiki — Index

Saudi Arabistan üretim sahası için OEE/WIP takip sistemi (Next.js + Supabase). Bu index tüm wiki sayfalarının kataloğudur. Her oturum başında buradan başla.

## Systems — Sayfa Mantığı ve İş Akışları

| Sayfa | Özet |
|-------|------|
| [Üretim Formu](systems/uretim-formu.md) | Ana sayfa (`/`): hücre+tarih bazlı saatlik üretim ve duruş girişi, validasyon kuralları, otomatik yükleme/kaydetme akışı |
| [WIP Hesabı](systems/wip-hesabi.md) | `/schedule` simülasyon motoru: pres kapasitesi, kalıp ömrü, aynı gün ETM geçişi, buildSchedule parametreleri |
| [Duruşlar](systems/duruslar.md) | Tüm duruş kolonları, alt tür kodları (M1/M2, E/A/M/O, P1-P3, SA1-SA2, MKB1-3), validasyon kuralları |
| [Arıza Sistemi](systems/ariza-sistemi.md) | `/ariza` sayfası: veri yapısı, mevcut görünüm, eksik trend/öngörü özellikleri, reaktif→proaktif hedef |
| [Planlama Sistemi](systems/planlama-sistemi.md) | `/schedule` sayfası: 4 haftada 2000 parça hedefi, kayıp sebepleri, Pres simülasyonu, eksik hücreler ve haftalık analiz isteği |

## Entities — Varlıklar ve Veri Yapıları

| Sayfa | Özet |
|-------|------|
| [Hücreler](entities/hucreler.md) | 12 üretim hücresi, sorumlular, CELL_FLOWS akış sırası (Pres → ... → Boya) |
| [DB Tabloları](entities/db-tablolari.md) | 5 tablo: production_records, production_rows, mold_changes, schedule_params, wip_stock |

## Decisions — Mimari Kararlar ve Açık Konular

| Sayfa | Özet |
|-------|------|
| [Açık Konular](decisions/acik-konular.md) | Dokümante edilmemiş duruş kodları, eksik migration, WIP-üretim bağlantısı, incelenmeyen sayfalar |

## Hızlı Referans

**Sayfalar ve rotaları:**
- `/` → Günlük üretim formu
- `/dashboard` → Dashboard (henüz incelenmedi)
- `/schedule` → Pres simülasyonu ve planlama
- `/schedule/overview` → WIP hücre görünümü
- `/ariza` → Arıza takibi ve giderme
- `/veri-takip` → Veri takip (henüz incelenmedi)

**Anahtar dosyalar:**
- `src/lib/types.ts` — BOLUMLER, DURUS_KOLONLARI, ZAMAN_DILIMLERI
- `src/app/schedule/constants.ts` — simülasyon sabitleri
- `src/app/schedule/utils.ts` — `buildSchedule` (tek hücre) + `buildCellChain` (zincir orchestrator) + `getUpstreamChain`
- `src/app/schedule/overview/constants.ts` — CELL_FLOWS, CELL_STATE_CONFIG (per-hücre başlangıç field config'i)

## Log

Oturum geçmişi için bkz. [log.md](log.md).
