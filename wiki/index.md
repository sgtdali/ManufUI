---
updated: 2026-07-02

sources: []
---

# ManufUI Wiki — Index

Saudi Arabistan üretim sahası için OEE/WIP takip sistemi (Next.js + Supabase). Bu index tüm wiki sayfalarının kataloğudur. Her oturum başında buradan başla.

## Systems — Sayfa Mantığı ve İş Akışları

| Sayfa | Özet |
|-------|------|
| [Üretim Formu](systems/uretim-formu.md) | Ana sayfa (`/`): hücre+tarih bazlı saatlik üretim ve duruş girişi, validasyon kuralları, otomatik yükleme/kaydetme akışı |
| [Ölçüm Sistemleri](systems/olcum-sistemleri.md) | Ana sayfa (`/`): FF Preform Ölçüm (ROB108-Flowform) ve Final Ölçüm (ROB110-Fosfat) bağımsız 6 satırlı ölçüm ve dinamik Red/Rework Sebepleri detay girişleri |
| [WIP Hesabı](systems/wip-hesabi.md) | WIP stok hesabı: hücreler arası kümülatif üretim farkları, birleşik hat kuralları |
| [Duruşlar](systems/duruslar.md) | Tüm duruş kolonları, alt tür kodları, validasyon kuralları, `/duruslar` takip sayfası ve Excel dışa aktarım detayları |
| [Duruş Analiz](systems/durus-analiz.md) | `/durus-analiz` sayfası: seçili tek hücre için duruş tipi + alt tür Pareto analizi, süre/adet/pay kırılımı ve kayıt listesi |
| [Arıza Sistemi](systems/ariza-sistemi.md) | `/ariza` sayfası: veri yapısı, mevcut görünüm, eksik trend/öngörü özellikleri, reaktif→proaktif hedef |
| [Performans Paneli](systems/performans-paneli.md) | `/dashboardy` sayfası: Seçilen tarih aralığında hücre bazlı üretim hedeflerinin izlenmesi ve hücre özelinde hedeflenen miktarların hesaplanması |
| [Kalıp Takip](systems/kalip-takip.md) | `/kalip-takip` sayfası: Pres hücresi kalıp değişimlerinin takibi, manual giriş, senkronizasyon ve kümülatif parça adetleri takibi |
| [Aksiyon Takip](systems/aksiyon-takip.md) | `/aksiyon-takip` sayfası (koyu tema): açıklama/yorum, arama, başlangıç tarihi, Excel export, magic-link e-posta girişi + satır bazlı sorumlu yetkisi, admin şifresi, özel Select bileşeni |
| [Global Şifre Koruması](systems/sifre-korumasi.md) | Tüm sitenin genel şifre yetkilendirmesi (`rmk_hf901`), middleware kontrolü, şifresiz salt okunur performans paneli erişimi ve `/aksiyon-takip` istisnası |
| [Otomasyon & Entegrasyon Paneli](systems/teams-entegrasyonu.md) | Günlük e-posta raporu, Teams bildirimleri, cron joblar ve webhook adreslerini yöneten şifre korumalı panel |
| [Hat Kapanış Tahmini](systems/hat-forecast.md) | `/hat-forecast` sayfası: Pres'in 9 Temmuz'da kapanması sonrası hattaki tüm hücrelerin ne zaman biteceğini hesaplayan rundown simülasyonu |
| [Üst Yönetim Sunumu](systems/ust-yonetim-sunumu.md) | `docs/sunumlar/`: ManufUI dışı bağımsız PPTX üretim aracı (pptxgenjs + Supabase) — lokal hücre-seçim UI'ı (port 4590) + `build.js` slayt üretimi, N602-N603 birleştirme mantığı, Duruş Analizi bölümü |

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
- `/` → Günlük üretim formu & [Ölçüm Sistemleri](systems/olcum-sistemleri.md)
- `/login` → Giriş sayfası (Şifre koruması yetkilendirme ekranı)
- `/dashboard` → Dashboard (henüz incelenmedi)
- `/dashboardy` → [Detaylı Performans Paneli](systems/performans-paneli.md) (Şifresiz salt okunur erişim destekler)
- `/durus-analiz` → [Duruş Analiz](systems/durus-analiz.md)
- `/duruslar` → [Duruşlar](systems/duruslar.md) (Duruş Takip ve Analiz & Excel Çıktısı)
- `/kalip-takip` → [Pres Hücresi Kalıp Değişim Takibi](systems/kalip-takip.md)
- `/aksiyon-takip` → [Aksiyon Takip](systems/aksiyon-takip.md)
- `/veri-takip` → Veri takip (henüz incelenmedi)
- `/hat-forecast` → [Hat Kapanış Tahmini](systems/hat-forecast.md)

**Anahtar dosyalar:**
- `src/lib/types.ts` — BOLUMLER, DURUS_KOLONLARI, ZAMAN_DILIMLERI
- `src/app/actions.ts` — Barrel re-export, gerçek mantık `_actions/` altındaki 6 dosyada
- `src/app/_helpers/` — formHelpers.ts (buildEmptyRows, applyRecordToForm), formValidation.ts (validateAltTurSelections, validateAciklamaFields)
- `src/app/_components/` — ProductionTable, FFPreformTable, FinalOlcumTable, RejectReworkTables, productionColumns

## Log

Oturum geçmişi için bkz. [log.md](log.md).
