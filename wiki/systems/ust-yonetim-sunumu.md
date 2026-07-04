---
updated: 2026-07-04
sources: [docs/sunumlar/build/build.js, docs/sunumlar/build/tool/dataService.js, docs/sunumlar/build/tool/server.js, docs/sunumlar/build/tool/public/app.js, docs/sunumlar/build/tool/public/index.html, docs/sunumlar/build/tool/public/style.css, docs/sunumlar/2026-07-ust-yonetim-sunum-plani.md]
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

## Hücre OEE ve Planlı Süre Kural Tablosu (2026-07-04)

Sunum aracındaki `OEE - Planlı Süre` bölümü hücre OEE'sini sunum özelinde hesaplamak için kullanılır. Kullanıcı hücre, başlangıç tarihi ve bitiş tarihi seçer; saatlik kayıtları görür ve her saat için checkbox ile o saatin hesaba dahil olup olmayacağını belirler. Checkbox işaretli ise saat hesaba dahildir; boş ise satır tamamen hesap dışına alınır. Tarih aralığı `tool/data/oee-date-range.json`, saat bazlı hariç tutmalar `tool/data/oee-slot-exclusions.json` dosyasında saklanır.

Üstteki canlı metrik satırı `Availability | Performance | OEE` seçili hücre, tarih aralığı, checkbox seçimleri ve varsa manuel hedef override'larına göre anlık hesaplanır. Aynı kural tablosu hem arayüzdeki canlı metrikte (`tool/public/app.js`) hem de sunuma yazılan OEE/MTBF/MTTR verisinde (`tool/dataService.js`) kullanılır; server bu kuralları `/api/oee-cell-meta` üzerinden arayüze gönderir. Eski `npm run tool` process'i açık kalırsa hot reload olmadığı için yeni kurallar görünmez; araç yeniden başlatılmalıdır.

**Hücre OEE yaklaşımı:** Bu hesap, hücrenin kendi kontrol edebildiği performansı ölçer. Hat/akış OEE'si ayrı bir kavramdır; önceki istasyon kaynaklı beklemeler hat/akış analizinde görünmeye devam edebilir, ancak hücre OEE'sinde hücreyi cezalandırmaz.

### Formüller

- `Availability = Çalışma Süresi / Planlı Süre`
- `Çalışma Süresi = Planlı Süre - Availability kaybı sayılan duruş dakikaları`
- `Performance = Gerçekleşen Üretim / Düzeltilmiş Hedef`
- `Düzeltilmiş Hedef = Ham Hedef * ((60 - hedeften düşülecek dakika) / 60)`
- `OEE = Availability * Performance`

Kalite bileşeni OEE'ye dahil edilmez. Çünkü bu 12 üretim hücresinde satır bazlı kalite/fire verisi tutulmaz; FF Preform ve Final Ölçüm ayrı ölçüm noktalarıdır.

### Genel Kural Tablosu

| Duruş / durum | Availability etkisi | Performance etkisi | Not |
|---|---:|---:|---|
| Checkbox boş | Satır tamamen hesap dışı | Satır tamamen hesap dışı | Ne planlı süreye ne hedefe girer. |
| `mola` | Availability kaybı sayılmaz | Ham hedef düşmez | Mola dönüşümlü organize edilebilirdi varsayımıyla performans sorumluluğu görünür kalır. |
| `onceki_istasyon_bekleme` | Availability kaybı sayılmaz | Hedef süre oranında düşer | Parça yoksa hücre üretim yapamaz; hücre OEE'sinde cezalandırılmaz. |
| `planli_durus_turu = Kasa Alma - Bırakma` | Seçili hücrelerde Availability kaybı sayılmaz | Hedef süre oranında düşer | Doğal üretim akışı işi olarak ele alındı. |
| `takim_degisimi` | Standart süreye kadar Availability kaybı | Standart süreye kadar hedef düşer; standardı aşan kısım Performance kaybı olarak kalır | ROB109: 10 dk, ROB104/ROB108: 15 dk. |
| Pres `setup_ve_ayar` alt türü `IHU Rejim Bekleme` | Availability kaybı sayılmaz | Hedef düşmez; üretim kaybı Performance'a yansır | Rejim bekleme performans düşüklüğü olarak görünür. |
| `ariza`, diğer `setup_ve_ayar`, diğer `planli_durus`, `kalip_montaj`, `kalip_demontaj`, `musteri_kaynakli_durus`, `kalite_kaynakli_durus` | Availability kaybı | Hedef süre oranında düşer | Arıza vb. durumlarda çalışılabilir süre kadar hedef beklenir; aynı kayıp iki kez cezalandırılmaz. |

`Kasa Alma - Bırakma` muafiyeti verilen hücreler: ROB108, ROB104, Flowform, N602, N603. Bu isimler kaynakta Unicode escape ile tutulur; böylece Türkçe karakter encoding riski azaltılırken runtime'da veritabanındaki gerçek değerlerle eşleşir.

### Örnekler

- Pres'te 1 saatin 30 dakikası arıza, hedef 20, gerçekleşen 10 ise Availability %50 olur. Performance hedefi 10'a düşer ve 10/10 = %100 olur. OEE %50 çıkar. Böylece aynı arıza hem Availability hem Performance tarafında iki kez cezalandırılmaz.
- ROB108'de 60 dk `Önceki İstasyon Bekleme` olan `0 / 20` satırı hücre OEE'ye dahil edilirse Availability düşmez, satır hedefi 0'a ölçeklenir. Hücre parça beklediği için cezalandırılmaz.
- Molada hedef düşmez. Hücre parça basabilir durumda olup mola organizasyonu yüzünden hedefi kaçırdıysa bu kayıp Performance tarafında görünür.
- ROB109'da 18 dk takım değişimi varsa 10 dk standart kabul edilir; 10 dk hedef ve Availability tarafında normal takım değişimi olarak ele alınır, kalan 8 dk Performance üzerinde düşük üretim olarak kalır.

### Manuel Saatlik Hedef Override

Sunum aracı Supabase'deki `hedef_uretim_adeti` değerlerini okur, fakat sunum hazırlığı için saat bazında lokal hedef değişikliğine izin verir. `OEE - Planlı Süre` tablosundaki `Üretim / Hedef` hücresinde hedef kısmı düzenlenebilir input'tur. Kullanıcı bir hedef yazarsa bu değer `tool/data/oee-target-overrides.json` dosyasında saklanır ve hem canlı metriklerde hem de PPTX üretimindeki OEE hesabında kullanılır. Supabase verisi değiştirilmez. Input yanındaki `x` ile saat tekrar Supabase hedef değerine döner.

### Detay Dialogları

Canlı metrik satırındaki `Availability` tıklanınca hesap detay dialog'u açılır. Bu dialog planlı süre, çalışma süresi, Availability kaybı sayılan duruşlar, Availability'den hariç tutulan süreler ve saat bazlı kayıp satırlarını gösterir.

Canlı metrik satırındaki `Performance` tıklanınca Performance detay dialog'u açılır. Bu dialog gerçekleşen üretim, ham hedef, hedeften düşülen miktar, düzeltilmiş hedef, hedef kapsama oranı ve saat bazlı hedef detaylarını gösterir.

MTBF/MTTR hesabı OEE'den ayrıdır: `MTBF = (Planlı Süre - Arıza Dakikası) / Arıza Kaydı Sayısı`, `MTTR = Arıza Dakikası / Arıza Kaydı Sayısı`. Sadece `ariza` kolonuna dayanır; mola, setup, takım değişimi, planlı duruş vb. dahil değildir.
## İlgili Sayfalar
- [Duruşlar](duruslar.md) — `ariza_turu` kod tablosu ve tüm duruş kolonlarının kaynağı
- [Aksiyon Takip](aksiyon-takip.md) — `manuf_action_items` tablosunun canlı ManufUI arayüzü (sunumdaki Aksiyon Takibi slaytlarının aynı verisi)
- [Hücreler](../entities/hucreler.md) — 12 hücrenin tanımı, N602/N603'ün neden aynı hat segmenti olduğu
