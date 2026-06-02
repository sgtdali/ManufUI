# ManufUI Wiki Log

Append-only oturum logu. Her entry `## [YYYY-MM-DD] <tür> | <başlık>` formatındadır.
Grep ile son 5 girişi bul: `grep "^## \[" wiki/log.md | tail -5`

---

## [2026-06-02] summary | Schedule ve ETM planlama guncellemeleri

**Ozet:**
- Multi-cell schedule mimarisi eklendi; upstream zincir simulasyonu, hucre bazli baslangic state yapisi ve sadelesmis SettingsSidebar akisi kuruldu.
- HIP Ring parametreleri schedule parametrelerine eklendi; ring omru/degisim suresi, kalip/ring planlari ve ilgili dokumantasyon guncellendi.
- ETM Hucresi /schedule altina birlestirildi; ETM takim degisimleri, WIP kisiti, upstream Pres ciktisi, ETM-1/ETM-2 bazli Gantt satirlari ve takim/palet durus segmentleri entegre edildi.
- Gantt gorunumu sadelestirildi; oncul/ardil baglanti noktalari ve SVG oklari kaldirildi, ETM ve Pres satir davranislari ayristirildi.
- Planlama arayuzu sadelestirildi; kurtarma analizi ve karar destek kartlari kaldirildi, metinler temizlendi, parametre paneli secili hucreye gore filtrelenir hale getirildi.
- Firin ayarlari guncellendi; genel firin baslangic alani kaldirildi, gun bazli firin baslangici bagimsizlastirildi, standart firin isitma sablonu 07:00-08:00 yapildi ve firin isinma suresi 60 dk olarak esitlendi.
- Kalip sogutma vardiya sonrasina tasabilir hale getirildi; Pres prosesi vardiya sonuna kadar devam edebilir.
- Yapilan degisiklikler ilgili wiki sayfalarina islendi ve onemli adimlar npm run build ile dogrulandi.

## [2026-05-28] setup | Wiki sistemi kuruldu

**Yapılanlar:**
- `AGENTS.md` güncellendi: wiki dizin yapısı, oturum başlangıç protokolü, ingest/query/lint akışları eklendi.
- `wiki/` klasör yapısı oluşturuldu: `systems/`, `entities/`, `decisions/`
- `raw/chat-exports/` dizini oluşturuldu (ham kaynak belgeler için)

**Oluşturulan sayfalar:**
- `wiki/systems/uretim-formu.md` — `src/app/page.tsx`, `actions.ts`, `src/lib/types.ts`, `productionValidation.ts` incelenerek
- `wiki/systems/wip-hesabi.md` — `schedule/constants.ts`, `utils.ts`, `types.ts`, `overview/constants.ts` incelenerek
- `wiki/systems/duruslar.md` — `src/lib/types.ts` ve `src/app/page.tsx` incelenerek
- `wiki/entities/hucreler.md` — `src/lib/types.ts` ve `schedule/overview/constants.ts` incelenerek
- `wiki/entities/db-tablolari.md` — tüm `supabase/migrations/*.sql` dosyaları incelenerek
- `wiki/decisions/acik-konular.md` — inceleme sırasında tespit edilen eksikler
- `wiki/index.md` — tüm sayfaların kataloğu
- `wiki/log.md` — bu dosya

**Kapsam dışı kalan sayfalar (incelenmedi):**
- `/dashboard` sayfası
- `/veri-takip` sayfası
- `/api/export` endpoint'i
- `schedule/overview/` bileşenleri (WIP hesabının tam akışı)

## [2026-05-28] ingest | Arıza sistemi mevcut durum ve istekler

**Kaynak:** Kullanıcı konuşması + `src/app/ariza/page.tsx`

**Yapılanlar:**
- `wiki/systems/ariza-sistemi.md` oluşturuldu: veri yapısı tablosu, mevcut görünüm özeti, eksik özellikler (trend, pattern, öngörü), reaktif→proaktif hedef
- `wiki/index.md` güncellendi: Systems tablosuna Arıza Sistemi satırı eklendi

## [2026-05-28] ingest | Planlama sistemi mevcut durum ve istekler

**Kaynak:** Kullanıcı konuşması + `src/app/schedule/page.tsx`, `utils.ts`

**Yapılanlar:**
- `wiki/systems/planlama-sistemi.md` oluşturuldu: 2000 parça hedefi, kayıp sebepleri tablosu, Pres simülasyonu özeti, eksikler, haftalık analiz isteği, açık sorular
- `wiki/index.md` güncellendi: Systems tablosuna Planlama Sistemi satırı eklendi

## [2026-05-31] update | Planlama ve Simülasyon Sistemi İyileştirmeleri

**Yapılanlar:**
- Arıza verileri Supabase'den çekilerek planlama simülasyonuna entegre edildi. Arıza duruş süreleri günlük teorik kapasiteyi düşürecek şekilde hesaplandı.
- Günlük simülasyon tablosuna arıza sütunu eklenerek, arızalı günlerde duruş süreleri ve tooltip üzerinde arıza detayları gösterildi.
- OEE kayıplarını arıza, kalıp değişimi ve diğer verimsizlikler bazında analiz edip kullanıcılara aksiyon önerileri sunan `LossAnalysisPanel` bileşeni eklendi.
- Planlama sayfasına hücre seçici select kutusu eklenerek, 12 hücrenin tamamının plan simülasyonu yapılabilir hale getirildi. Pres dışı hücreler için kalıp/fırın detayları gizlendi.
- Cuma ve Cumartesi günleri için 15 dakikalık vardiya farkı simülasyon motoruna dahil edildi.

## [2026-05-31] refactor | Proje Geneli Atomik Bileşen Ayrıştırma (Refactoring)

**Yapılanlar:**
- Ana üretim formunun (`src/app/page.tsx`) yaklaşık 700 satırlık devasa yapısı daha temiz kod prensipleri gereği 4 bağımsız alt bileşene bölündü:
  - `src/app/_components/FormHeader.tsx` (Bölüm seçimi, tarih, sorumlu ve Excel/Dashboard butonları)
  - `src/app/_components/ProductionTable.tsx` (Saatlik üretim tablosu ve kalan OEE/downtime süresi hesaplamaları)
  - `src/app/_components/DowntimeExplanationDialog.tsx` (Duruşlar için açıklama dialog modalı)
  - `src/app/_components/OverwriteConfirmDialog.tsx` (Kayıt üzerine yazma onay Alert Dialog'u)
- ETM planlama sayfası (`src/app/schedule/etm/page.tsx`) incelendi, hâlihazırda alt bileşenlere (`EtmMetricCards`, `EtmSettingsSidebar`, `EtmToolsSidebar`, `EtmStockSidebar`, `EtmScheduleTable`) ayrıştırılmış temiz yapısının doğruluğu teyit edildi.
- React-Hook-Form Controller tipleri ve Select tipleri arasındaki TS uyumsuzlukları giderildi.

## [2026-05-31] update | Kampanya Optimizasyon Kartı Entegrasyonu

**Yapılanlar:**
- 2000 parça hedefi (veya dinamik girilen hedef) için kümülatif tamamlama tahmini yapan `CampaignOptimizer` bileşeni eklendi.
- Eksik kapasite durumunda Pazar günleri çalışmayı tetikleme ve günlük fazla mesaiyi artırma gibi önerileri tek tıkla uygulayabilen interaktif karar destek sistemi sağlandı.
- Sidebar ve genel planlayıcı parametrelerindeki değişiklikler anında simülasyona ve tahmine yansıtıldı.

## [2026-05-31] update | Arıza Tiplerine Kalite Eklendi

**Yapılanlar:**
- `src/lib/types.ts` içerisindeki `DURUS_KOLONLARI` altındaki `ariza` kolonunun alt türlerine (`altTurler`) `Kalite` tipi eklendi.
- İlgili wiki dokümanları (`wiki/entities/db-tablolari.md` ve `wiki/systems/duruslar.md`) güncellendi.

## [2026-05-31] update | Arıza Tablosunda Tür Değiştirme Yeteneği

**Yapılanlar:**
- `src/app/ariza/actions.ts` içine `updateArizaType` server action'ı eklendi.
- `src/app/ariza/ArizaRecordsTable.tsx` arayüzündeki statik arıza türü hücresi, kullanıcının doğrudan değiştirebileceği dinamik bir `<select>` kutusuna dönüştürüldü.
- Seçim değişikliği yapıldığında Supabase'e asenkron istek atılarak `manuf_production_rows` tablosundaki `ariza_turu` alanı anında güncelleniyor ve başarılı toast uyarısı veriliyor.

## [2026-06-01] summary | Schedule Gantt ve kalip/ring planlama gelistirmeleri

**Ozet:**
- /schedule sayfasinda Gantt detay paneli, surukle-birak, satir siralama, segment gizleme ve genis zaman cizelgesi davranislari gelistirildi.
- Pres simulasyonuna kalip isitma on kosulu, gun ici kalip degisimi ayrimi, kalip degisim modlari, kalip sogutma ve carryover kurallari eklendi.
- Supabase entegrasyonu genisletildi; gunluk override kayitlari, disabledOperations ayrimi, toplu kaydetme ve sayfadan ayrilirken kaydedilmemis degisiklik uyarisi kuruldu.
- Genel Hat WIP stok hesabi belgelendirildi; hucreler arasi kumulatif uretim farklari, birlesik hat kurallari ve manuel override korumasi wikiye islendi.
- Cuma/Cumartesi standart vardiya ve firin baslangic saatleri duzenlendi.
- Kalip degisimleri gerceklesen/planlanan sekmelerine ayrildi ve schedule verisi MoldChangesSidebar ile baglandi.
- HIP Ring degisimi simulasyona, arayuze, Gantt rozetlerine ve veritabani constraint/migration akisina eklendi.
- Uretim olmayan gunlerde kalip sogutma segmentinin cizilmesi engellendi.
- Kalip ve HIP Ring degisimleri bagimsiz satirlarda gosterilebilir ve ayri ayri devre disi birakilabilir hale getirildi.
- Kalip/Ring degisimlerinin paralel yapilmasi, kalan omur/carryover guncellemeleri, manuel kombinasyonlar ve surelerin Gantt uzerinden resize edilmesi desteklendi.
- Gantt surukleme/boyutlandirma hesaplari, pointer capture ve kararli segment key kullanimi ile duzeltildi.
