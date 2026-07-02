---
updated: 2026-07-02
sources: [docs/sunumlar/build/build.js, docs/sunumlar/build/tool/dataService.js, docs/sunumlar/build/tool/server.js, docs/sunumlar/2026-07-ust-yonetim-sunum-plani.md]
---

# Üst Yönetim Sunumu (PPTX Üretim Sistemi)

Repkon üst yönetimine sunulan ManufUI performans raporu — `docs/sunumlar/` altında, Next.js uygulamasından **bağımsız** bir Node.js araç seti ile üretiliyor. Kod ManufUI'nin `src/` ağacının dışında yaşar; kendi `package.json`/`node_modules`'ü var.

## Dizin Yapısı

```
docs/sunumlar/
  2026-07-ust-yonetim-sunum-plani.md   ← sayfa planı / karar günlüğü (elle yazılan tasarım dokümanı)
  Repkon-HF901-Ust-Yonetim-Sunumu-2026-07.pptx   ← üretilen çıktı (build.js her çalıştığında overwrite eder)
  build/
    build.js              ← TÜM slayt tanımları burada — pptxgenjs ile programatik üretim
    package.json
    tool/
      server.js            ← lokal hücre-seçim arayüzü (http://localhost:4590)
      dataService.js        ← Supabase'den ham veri çekme + Genel Bakış tablosu hesaplama mantığı
      env.js
      data/
        overview-data.json  ← dataService çıktısının cache'i
        selection.json       ← kullanıcının aracı kullanarak yaptığı hücre/vaka seçimleri
      public/                ← seçim arayüzünün statik dosyaları (index.html, app.js, style.css)
```

## İki Bağımsız Katman

**1. Lokal seçim aracı (`tool/server.js`, port 4590)** — kullanıcının "Öne Çıkan Sorunlar" gibi dinamik bölümler için hangi hücre/vakaların sunuma gireceğini seçtiği basit bir web arayüzü. `npm run tool` ile başlatılır (`docs/sunumlar/build/` içinden). Seçimler `tool/data/selection.json`'a yazılır. **Bu arayüzde 12 hücre ayrı ayrı listelenir** (N602 ve N603 dahil, birleştirilmeden) — küratörlük esnekliği için kasıtlı bir tasarım kararı.

**2. `build.js`** — asıl PPTX üretim script'i. `node build.js` (yine `build/` içinden) çalıştırılınca `tool/data/selection.json` + Supabase'den taze çekilen veriyi kullanarak tüm slaytları pptxgenjs ile sıfırdan oluşturur ve `../Repkon-HF901-Ust-Yonetim-Sunumu-2026-07.pptx`'i overwrite eder.

**Önemli ayrım:** Genel Bakış tablosundaki (Slayt 3-4) N602/N603 birleştirmesi **sadece build.js'in çıktı aşamasında** olur — `computeMergedCellAverage()` (`dataService.js`) iki hücrenin ham slot verisini gün-birleşimi (union of active days) üzerinden toplayıp tek "N602-N603 Hücresi" satırına indirger. Seçim aracının grid'i bundan etkilenmez, hâlâ 12 hücre gösterir. Bu ikilik bilinçli: küratörlük ayrı hücre bazında yapılabilsin, ama üst yönetime giden final tabloda N602/N603 fiziksel olarak aynı hat segmentini paylaştığı için birleşik görünsün.

## Veri Kaynağı

**Tek gerçek kaynak:** Supabase projesi `jxijtnwwmjjgyovxgnkk` (region eu-west-3), tablo `manuf_production_rows` (+ `manuf_production_records` join, `bolum`/`tarih` üzerinden) ve `manuf_action_items` (aksiyon takibi verisi, 74 madde). Ayrıntılı kolon dökümü için bkz. [Duruşlar](duruslar.md).

`ariza_turu` kod çözümleme tablosu (standart hücreler: `E`=Elektrik, `A`=Akışkan, `M`=Mekanik, `O`=Ortak, `Kalite`, `Belirsiz`; Pres lokasyon bazlı `Pres Öncesi`/`Pres`/`Pres Sonrası`; ETM/ROB104/ROB108/ROB109 tam-kelime taksonomisi) [Duruşlar](duruslar.md)'da belgelenmiştir — build.js'de Pareto/neden analizlerinde bu tabloya göre kod birleştirme yapılıyor.

## build.js Yapısı ve Ortak Yardımcılar

Tüm slaytlar aynı stil sistemini paylaşır (navy/ice renk paleti, Cambria başlık + Calibri gövde fontu):
- `newContentSlide()` — yeni slayt ekler, arka plan rengini ve sayfa numarasını ayarlar
- `addHeader(slide, {icon, eyebrow, title, ...})` / `addFooter(slide, sectionLabel)`
- `badge(slide, {x,y,w,label,type})` — durum rozetleri (done/progress/decision)
- `styledTable(slide, header, rows, opts)` — navy başlık satırı, zebra gövde, hücre bazlı renk/bold override
- `fmtPct(from, to, decimals)` — tüm "Değişim" kolonlarında kullanılan yüzde formatlayıcı
- İkonlar (`icons.tools`, `icons.chartBar`, `icons.warning`, vb.) build.js başında bir kez base64 PNG olarak render edilip anahtar üzerinden tekrar kullanılıyor — yeni slayt eklerken önce mevcut ikon setine bakmak gerekir.
- pptxgenjs grafik API'si: `pres.charts.BAR` (`barDir: "col"|"bar"`, `barGrouping: "stacked"`) ve `pres.charts.DOUGHNUT` (`holeSize`) — build.js'de birden çok slaytta tekrar kullanılan pattern'ler.

## Slayt Envanteri (2026-07-02 itibarıyla, 24 sayfa)

1. Kapak
2. (Genel Bakış — amaç/kapsam)
3-4. **Genel Bakış — 11 Hücre Özet Tablosu** (N602-N603 birleşik satır olarak; Nisan-Mayıs vs Haziran-Temmuz KPI karşılaştırması)
5-7. Darboğaz & Kök Neden Analizi (ETM/Pres upstream ilişkisi, önceki istasyon bekleme trendi, kök neden özeti)
8-14. **Duruş Analizi** (yeni bölüm, bkz. aşağı) — Genel Bakış KPI kartları → Kategori Dağılımı (stacked bar) → Üretime Oranlı Yoğunluk (tablo) → Neden Pareto'su (bar chart) → Hücre Bazlı Baskın Neden (tablo) → Tekrarlayan Somut Sorunlar (tablo) → Kayıt Takip Disiplini (doughnut)
15-19. Öne Çıkan Sorunlar (hücre başına 1 sayfa, seçim aracından gelen dinamik vaka seçimi — N603/Quench/Flowform/Pres vb.)
20-21. Aksiyon Takibi (74 madde durumu, Haziran-Temmuz'da kapananlar)
22-24. Talep / Karar (yatırım + müşteri talepleri, sonraki adımlar)

### Duruş Analizi Bölümü (Slayt 8-14) — Tasarım Notları

Bu bölüm 2026-07-02'de eklendi; önceki halde sunumda sadece istasyon-bekleme trendi ve birkaç spesifik arıza vakası vardı. Yeni sayfalar tamamen `manuf_production_rows`'daki tüm duruş kolonlarından (arıza, planlı duruş, setup, takım/kalıp, önceki istasyon bekleme, mola, müşteri/kalite kaynaklı) canlı Supabase sorgularıyla üretildi — **fabrikasyon veri yok**.

**Kritik tasarım kararı — normalize KPI:** Ham "arıza dakikası/gün" yerine **"arıza dakikası / 100 adet üretim"** kullanıldı (arıza dakikasını `computeOverviewData()`'daki üretim adedine oranlayarak). Bunun nedeni: ham dakikalar doğal olarak üretim hacmiyle birlikte artıyor; oranlanmadan bakınca çoğu hücrenin "kötüleştiği" gibi yanlış bir izlenim oluşuyordu. Normalize edilince hikaye tersine döndü — çoğu hücre aslında **iyileşmiş**; gerçek regresyon sadece **ROB104 (+444%)**, **ROB110-111 (+204%)** ve **Quench** (0 → 86.3, yeni ortaya çıkan sorun) için geçerli.

**Bilinen sınırlama — bu 7 slayt statik/hardcoded:** "Öne Çıkan Sorunlar" slaytları gibi bu 7 sayfa da build.js içine sabit sayı olarak yazıldı, seçim aracına veya `dataService.js`'in canlı hesaplamasına bağlı değil. Supabase verisi değişirse (yeni ay, düzeltme, vb.) bu sayfalar **otomatik güncellenmez** — elle yeniden sorgulanıp build.js'de güncellenmesi gerekir. Sadece Slayt 3-4'teki Genel Bakış tablosu `dataService.js` üzerinden her `node build.js` çalıştırmasında taze veri çeker.

**QA notu:** Bu ortamda pptx skill'inin standart görsel QA araçları (LibreOffice `soffice`, `extract-text` CLI) kurulu değil. İçerik doğrulaması `python-pptx` ile programatik metin/tablo/grafik çıkarımı yapılarak gerçekleştirildi; görsel (ekran görüntüsü tabanlı) QA yapılamadı.

## İlgili Sayfalar
- [Duruşlar](duruslar.md) — `ariza_turu` kod tablosu ve tüm duruş kolonlarının kaynağı
- [Aksiyon Takip](aksiyon-takip.md) — `manuf_action_items` tablosunun canlı ManufUI arayüzü (sunumdaki Aksiyon Takibi slaytlarının aynı verisi)
- [Hücreler](../entities/hucreler.md) — 12 hücrenin tanımı, N602/N603'ün neden aynı hat segmenti olduğu
