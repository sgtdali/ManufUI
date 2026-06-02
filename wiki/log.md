# ManufUI Wiki Log

Append-only oturum logu. Her entry `## [YYYY-MM-DD] <tür> | <başlık>` formatındadır.
Grep ile son 5 girişi bul: `grep "^## \[" wiki/log.md | tail -5`

---

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

## [2026-06-01] update | Planlama, Gantt Etkileşimi ve Simülasyon Geliştirmeleri (Özet)

**Yapılanlar:**

Bugün `/schedule` sayfasındaki planlama, Gantt şeması, Supabase entegrasyonu ve simülasyon motoru üzerinde kapsamlı geliştirmeler ve hata düzeltmeleri yapıldı. Çalışmalar 4 ana başlıkta toplanmıştır:

### 1. Gantt Şeması ve Gelişmiş Etkileşimler
- **Gantt Detay Paneli ve Sürükle-Bırak:** Günlük plan satırları tıklanabilir hale getirilerek altlarında vardiya saatlerine yayılan Gantt şeması sunuldu. Vardiya, fırın ısıtma, pres prosesi ve kalıp soğutma segmentlerinin 15 dakikalık grid üzerinde sürüklenerek planlanması sağlandı.
- **Öncül-Ardil Bağları:** Gantt segmentleri arasında sürükle-bırak ile bağımlılıklar tanımlanabilmesi sağlandı. Bu bağımlılıklar Gantt şeması üzerinde dinamik SVG okları ile görselleştirildi.
- **Satır Yeniden Sıralama ve Genişletme:** Vardiya hariç tüm Gantt satırlarının dikeyde sürüklenerek sıralanabilmesi sağlandı. Zaman çizelgesinin sağ sınırı serbest sürükleme için en az 23:00'e uzatıldı ve tablonun dışa taşmasını önlemek amacıyla yatay kaydırma (overflow scroll) eklendi.
- **Segment Silme/Gizleme:** Standart segmentlerin satır başlıklarından silinebilmesi sağlandı. Silinen segmentler hem şemadan hem de satır olarak Gantt tablosundan tamamen gizlenir.

### 2. Simülasyon Mantığı ve Fiziksel Kurallar
- **Kalıp Isıtma Ön Koşulu:** Pres prosesinin başlayabilmesi için kalıp ısıtma işleminin tamamlanmış olması şartı simülasyon motoruna entegre edildi.
- **Gün İçi Kalıp Değişimi Ayrımı:** Sabah vardiya başlangıcındaki kalıp değişimleri ile gün ortasında parça limiti aşımıyla otomatik tetiklenen kalıp değişimleri ayrıştırıldı; gün içi kalıp değişimlerinin pres prosesini bölerek gerçek zamanda çizilmesi sağlandı.
- **Kalıp Değişim Modları (Erteleme ve Manuel Eşik):** Kalıp değişimleri için "Otomatik", "Ertele/Zorla" ve "Elle Planla" modları geliştirildi. Erteleme aktifken kalıp ömrünün negatife düşmesine izin verilerek üretim kısıtlanmadı. Elle planlama modunda ise kullanıcının girdiği parça limitine göre simülasyon yapılması sağlandı.
- **Kalıp Soğutma ve Carryover:** Kalıp değişimi öncesi 90 dakikalık soğutma süresi kuralı eklendi. Erkek kalıp değişimlerinde de carryover (ertesi güne kalan süre) mantığı devreye alınarak simülasyonun gün geçişleri tutarlı hale getirildi.

### 3. Supabase Entegrasyonu ve Performans
- **Kalıcı Kayıt Şeması:** Günlük override verileri, kalıp değişim modları, Gantt bağımlılıkları ve devre dışı bırakılan işlemler için `manuf_schedule_overrides` tablosuna yeni kolonlar eklenerek migration'lar (`20260601...lank`) yazıldı. (Not: migration dosya ismi `20260601113000_add_mold_maintenance_start_to_schedule_overrides.sql` olarak oluşturuldu).
- **Toplu Kaydetme (Batch Save):** Anlık veritabanı kayıt işlemlerinin sistemi yormasını önlemek için değişikliklerin lokal React state'inde biriktirilmesi ve sağ üstteki "Değişiklikleri Kaydet" butonuyla toplu olarak Supabase'e gönderilmesi sağlandı. Sayfadan ayrılırken kaydedilmemiş değişiklik uyarıları eklendi.
- **disabledOperations Ayrımı:** Görsel segment gizleme ile simülasyondaki operasyonların iptalini ayıran `disabledOperations` yapısı kuruldu.

### 4. Arayüz Sadeleştirmesi ve Hata Düzeltmeleri
- **Odaklanmış Tablo Görünümü:** Tablodaki 17/11 kolonluk kalabalık görünüm sadeleştirilerek; Üretim/Hedef, F.Mesai, Kalıp Ömrü ve Arıza durumlarını gösteren 6-7 odak kolona düşürüldü. Kaldırılan detaylar rozetler ve tooltips içerisine taşındı.
- **Operasyon Aksiyonları Paneli:** Sayfanın en üstüne konumlandırılarak kritik günlerin, fazla mesai ihtiyaçlarının ve kalıp risklerinin doğrudan gösterilmesi sağlandı. Eski büyük analiz panelleri katlanabilir bölüm altına alındı.
- **Ön Kontrol ve Temizlik Kaldırılması:** Bu iki adımın süreçten kaldırılmasıyla hazırlık ofset süresi 60 dakikadan 30 dakikaya (sadece indüksiyon başlangıcı) düşürüldü.
- **Tek Kaynak Veri Mimarisi:** Tablodaki Fazla Mesai (F.Mesai) ve vardiya bitiş saatlerinin tutarsızlıkları giderilerek, hesaplamaların doğrudan Gantt üzerindeki `shift` segmentinden tek kaynak olarak beslenmesi sağlandı.
- **Konsol ve React Hataları:** Uncontrolled input uyarısı veren form alanları `?? ""` fallbacks ve dinamik `key` prop'u ile kararlı hale getirildi.

## [2026-06-01] update | Genel Hat WIP Stok Belgelendirmesi

**Yapılanlar:**
- `src/app/schedule/overview/actions.ts` içerisindeki `calculateAndSaveWip` fonksiyonu incelendi.
- 12 hücrenin gerçekleşen üretim verilerine dayanan kronolojik kümülatif üretim farkları üzerinden hesaplanan WIP stok mantığı, birleşik hatlara (ROB104 → N602+N603 ve N602+N603 → ROB109) dair özel kurallar ve manuel override koruması `wiki/systems/wip-hesabi.md` dosyasına belgelendirildi.

## [2026-06-01] update | Cuma/Cumartesi Standart Vardiya Ayarı

**Yapılanlar:**
- `src/app/schedule/utils.ts` içindeki `buildSchedule` simülasyon motorunda Cuma ve Cumartesi günleri için standardı zorlayan vardiya kontrolü güncellendi.
- Günlük override kaydı girilmemişse, Cuma ve Cumartesi günleri standart vardiya saatleri (`shiftStart`/`shiftEnd`) ve fırın başlangıç saati (`furnaceStart`) varsayılan olarak **09:00 - 17:00** olacak şekilde ayarlandı.
- `wiki/decisions/acik-konular.md` içerisindeki tutarsızlık maddesi çözüldü olarak güncellendi.

## [2026-06-01] update | Kalıp Değişimlerinde Gerçekleşen ve Planlanan Durum Kırılımı

**Yapılanlar:**
- `src/app/schedule/_components/MoldChangesSidebar.tsx` bileşeni güncellenerek kalıp değişim listesi iki sekmeli/durumlu (State) hale getirildi:
  - **Gerçekleşen**: Supabase veritabanında kayıtlı olan ve manuel eklenmiş/düzenlenebilir/silinebilir kalıp değişimleri.
  - **Planlanan**: Simülasyon motorunun (`buildSchedule`) gün içi veya otomatik limit hesaplamalarına dayanarak öngördüğü, ilgili günlerin planlanan kalıp değişimleri (salt okunur görünüm).
- Ana sayfa (`src/app/schedule/page.tsx`) üzerinden güncel `schedule` verisi prop olarak `MoldChangesSidebar` bileşenine bağlandı.

## [2026-06-01] update | HIP Presi Ring Değişimi Simülasyonu ve Entegrasyonu

**Yapılanlar:**
- HIP Presi ring değişimleri simülasyon motoruna entegre edildi. Bu kapsamda:
  - Ring değişim periyodu **1300 parça** ve değişim süresi **570 dk (1 tam vardiya günü)** olarak tanımlandı.
  - Simülasyonda ring kalan ömrü (`ringRemaining`) kronolojik olarak takip edilir; limit dolduğunda veya manuel giriş olduğunda gün boyu ring değişimi devreye girerek kapasiteyi 0'a çeker veya gün ortası limit bitiminde süreci bölerek ertesi güne carryover taşır.
- Arayüz güncellemeleri yapıldı:
  - `src/app/schedule/_components/SettingsSidebar.tsx` paneline **HIP Ring kalan adet** başlangıç değeri giriş alanı eklendi.
  - `MoldChangesSidebar.tsx` üzerinde yeni kalıp ekleme formunda ve değişim listelerinde (Gerçekleşen/Planlanan sekmelerinde) **HIP Ring** seçeneği ve durum gösterimleri desteklendi.
  - `src/app/schedule/_components/ScheduleTable.tsx` tablosundaki gün hücrelerine Erkek (E) ve Dişi (D) kalıplarla birlikte **Ring (R) kalan ömrü rozeti** eklendi.
  - Gantt şemasında planlanan veya manuel olarak tetiklenen ring değişimlerinin ayırt edilebilmesi için ilgili Gantt bloklarının rengi **kehribar/turuncu (`bg-amber-500`)** olarak ayarlandı ve etiketleri "HIP Ring değişimi" olarak Gantt şemasına yansıtıldı.
- Veritabanı uyumluluğu için `supabase/migrations/20260601170000_add_ring_to_mold_changes_type.sql` migration dosyası oluşturularak `manuf_mold_changes` tablosundaki `mold_type` alanı check constraint'ine `'ring'` değeri eklendi.

## [2026-06-01] fix | Üretim Olmayan Günlerde Kalıp Soğutma Segmentinin Kaldırılması

**Yapılanlar:**
- `src/app/schedule/_components/ScheduleTable.tsx` içerisindeki Gantt şeması segment oluşturucusu (`buildGanttSegments`) güncellendi.
- Üretim adedi sıfır olan (`day.pressed === 0`) ve pres prosesinin hiç başlamadığı/yürütülmediği günlerde (örneğin tam gün kalıp/ring değişimi yapılan durumlarda), **Kalıp Soğutma** segmentinin (`die-cooling`) çizilmesi engellendi. Kalıp soğutma başlangıç (`coolStart`) ve bitiş (`coolEnd`) zamanları yalnızca o gün gerçekleşen üretim olduğunda hesaplanacak şekilde sınırlandırıldı.

## [2026-06-01] update | Kalıp Değişimlerinin Bağımsız Satırlarda Gösterilmesi ve Engellenmesi

**Yapılanlar:**
- `src/app/schedule/_components/ScheduleTable.tsx` ve `src/app/schedule/utils.ts` dosyaları güncellenerek kalıp değişim duruşlarının tiplerine göre ayrı ayrı engellenebilmesi (disabledOperations) sağlandı.
- Erkek Kalıp (`mold-maintenance-male`), Dişi Kalıp (`mold-maintenance-female`) ve HIP Ring (`mold-maintenance-ring`) değişimleri birbirinden bağımsız ID'lerle yönetilerek, herhangi birinin devre dışı bırakılması durumunda diğer değişimlerin simülasyonu ve Gantt şemasındaki gösterimi kesintiye uğramaz.
- Gantt şemasındaki "Gizlenen Bloklar" listesinde generic "Planlı Duruş / Kalıp Değişimi" ismi yerine, hangi kalıbın devre dışı bırakıldığı net olarak gösterilmektedir.
- `MoldChangesSidebar.tsx` bileşenindeki planlanan kalıp değişim listesine (`plannedChanges` memo) HIP Ring değişimleri de dahil edildi.

## [2026-06-01] fix | Kalıp/Ring Değişimlerinin Paralel Yapılması ve Kalan Ömür Güncelleme Mantığı

**Yapılanlar:**
- `src/app/schedule/utils.ts` içerisindeki sabah vardiyası kalıp/ring değişimi simülasyonu mantığı güncellendi:
  - Erkek ve Dişi kalıp değişimlerinin birbiriyle paralel yapılamayacağı (ardışık olacağı) kuralı korunarak, HIP Ring değişimlerinin Dişi veya Erkek kalıp değişimleriyle **aynı anda (paralel)** yapılabilmesi sağlandı.
  - Ring değişimi artık Dişi veya Erkek kalıp değişimi devam ederken araya sıkışıp ertelenmek yerine aynı gün paralel olarak başlayıp tamamlanabilmektedir.
  - Kalıp değişim süresi shift süresini aşıp ertesi güne sarktığında (carryover), kalan ömür bilgisi değişimin başladığı gün değil, **değişimin tamamen bittiği günün sonunda** ilgili interval değerine sıfırlanacak şekilde ayarlandı. Bu sayede değişim sürerken kalan ömrün erkenden sıfırlanmış görünmesi hatası giderildi.
- `DayPlan` veri tipine sabah vardiyasında harcanan kalıp/ring bazlı süre alanları (`femaleMaintMinutes`, `maleMaintMinutes`, `ringMaintMinutes`) eklendi ve bu süreler `buildSchedule` tarafından beslendi.
- Gantt şemasının morning segment oluşturucusundaki (`buildGanttSegments`) ardışık çizim mantığı paralel çizime uygun hale getirildi; Ring değişimi artık Dişi/Erkek bloğunun sonuna itilmeden doğru zamanda ve paralel (aynı başlangıç saatinde) çizilmektedir. Değişim sürükleme mekanizması bu yapıyla uyumlu çalışacak şekilde güncellendi.

- Kalıp Değişim Modu alanındaki "Elle Planla" (Manual) kısmına **HIP Ring** seçeneği de eklendi; böylece belirli bir parça adet limitinden sonra manuel HIP Ring değişimi tetiklenebilmektedir.
- "Ertele/Zorla" (Postpone) moduna geçildiğinde `postponeRingChange` değeri de otomatik olarak set edilip Ring değişiminin ertelenebilmesi sağlandı.

## [2026-06-01] update | Kalıp ve Ring Değişim Sürelerinin Gantt Üzerinden Sürüklenerek Ayarlanabilmesi

**Yapılanlar:**
- Kullanıcının kalıp/ring değişim sürelerini belirli bir günde standardın dışına (daha uzun veya daha kısa) çıkarabilmesi için **Gantt şeması üzerinden sürükleyerek süre değiştirme (resizing)** desteği eklendi.
- `ScheduleTable.tsx` Gantt segmentlerinde `mold-maintenance-male`, `mold-maintenance-female` ve `mold-maintenance-ring` alanları için sağ kenar sürükleme tutamacı (resize-end handle) aktif edildi.
- Süre değiştirildiğinde, gün bazlı override verisi olarak `femaleChangeMinutes`, `maleChangeMinutes` ve `ringChangeMinutes` alanları kaydedilir.
- `utils.ts` simülasyon motoru, standart süreler yerine bu gün bazlı süre override girdilerini dikkate alacak şekilde güncellendi.
- Veritabanı uyumluluğu için `supabase/migrations/20260601173000_add_mold_change_durations_to_schedule_overrides.sql` migration dosyası oluşturularak `manuf_schedule_overrides` tablosuna `female_change_minutes`, `male_change_minutes` ve `ring_change_minutes` kolonları eklendi. `actions.ts` üzerinde save/load mapping entegrasyonu yapıldı.

## [2026-06-01] fix | Gantt Segment Sürükleme ve Boyutlandırma Düzeltmesi

**Yapılanlar:**
- Gantt şemasındaki sürükleme ve resizing fonksiyonu (`beginSegmentDrag`) güncellendi.
- Sürükleme işlemlerinde track genişliğinin yanlış hesaplanmasına sebep olan `parentElement` referansı yerine, `.closest(".relative.min-h-7")` kullanılarak en dıştaki zaman çizgisi kapsayıcısı (track) doğru şekilde tespit edildi. Bu sayede özellikle sağ kenardan resizing (süre uzatma/kısaltma) yapıldığında oluşan hesaplama hatası giderildi.
- Windows, dokunmatik ekranlar ve bazı trackpad'lerde sürükleme sırasında pointer'ın element dışına çıkmasıyla sürükleme aksiyonunun yarıda kalmasını önlemek amacıyla `setPointerCapture` ve `releasePointerCapture` mekanizmaları entegre edildi. `pointercancel` durumu da temizlik akışına eklendi.
- Sürükleme/Boyutlandırma sırasında React state'i güncellenip segmentin `start` veya `end` süreleri değiştiğinde, DOM düğümünün silinip yeniden üretilmesine ve sürükleme capture durumunun kaybolmasına sebep olan dinamik `key={`${segment.label}-${segment.start}-${segment.end}`}` yapısı, kararlı ve benzersiz `key={segment.id}` değeriyle güncellendi.
- `/schedule/page.tsx` altındaki `updateOverride` fonksiyonunun `hasAnyValue` kontrolüne yeni eklenen süre belirleme (`femaleChangeMinutes`, `maleChangeMinutes`, `ringChangeMinutes`) ve erteleme (`postponeRingChange`) parametreleri dahil edilerek, bu değişikliklerin durum sıfırlamasıyla silinmesi engellendi.
- "Elle Planla" modunda 0 parça üretim limiti belirlendiğinde, kalıp değişimlerinin pres prosesi başladıktan (ve 90 dakikalık kalıp soğutma adımı geçtikten) sonra öğle saatlerinde başlaması yerine, güne doğrudan **sabah vardiya başlangıcında (start-of-day)** başlanabilmesi sağlandı. Bu sayede 0 parça limitiyle kalıp değişimi yapıldığında bloklar güne blokaj olmadan en sol kenardan (sabah saatlerinden) başlayabilmektedir.
- `ScheduleTable.tsx` Gantt sürükleme metodunda, start-of-day ile mid-day segmentlerinin sürükleme davranışları birbirinden ayrıştırıldı: Sabah vardiyası başlangıcındaki kalıp değişimi sürüklendiğinde `moldMaintenanceStart` değeri güncellenirken, gün ortasındaki (mid-day) manuel kalıp değişimi sürüklendiğinde ise sadece `manualMoldChangeAfterPieces` limit değeri güncelleniyor.
- Manuel kalıp değiştirme modunda ("Elle Planla") hem Erkek/Dişi kalıp değişimlerinin hem de HIP Ring değişimlerinin aynı günde eş zamanlı planlanabilmesi sağlandı.
- `types.ts` içerisindeki `manualMoldType` parametresi `"male+ring"` ve `"female+ring"` kombinasyon değerlerini de destekleyecek şekilde genişletildi.
- `utils.ts` simülasyon motorundaki sabah (start-of-day) ve gün ortası (mid-day) planlama kontrolleri bu kombinasyon tiplerini doğru şekilde algılayıp hem kalıp hem ring duruşlarını paralel/ardışık kurallarına uygun olarak simüle edecek şekilde güncellendi.
- `ScheduleTable.tsx` Gantt detay panelindeki kalıp seçici açılır menüsüne (dropdown) **"Erkek + HIP Ring"** ve **"Dişi + HIP Ring"** seçenekleri eklenerek kullanıcının tek seferde her iki değişimi de manuel olarak o güne planlayabilmesi sağlandı.
- `utils.ts` simülasyon motorunda, kalıp değişimi sürerken araya giren hafta sonları (veya çalışılmayan/postpone edilen günler) nedeniyle kalan kalıp değişim sürelerinin (carryover) sıfırlanıp unutulmasına yol açan mantık hatası düzeltildi. Carryover durum güncellemeleri yalnızca aktif iş günlerinde ve kalıp değişimi duruşu gerçekten tetiklendiğinde güncellenecek şekilde sınırlandırıldı.

## [2026-06-02] update | HIP Ring Parametrelerinin Schedule Parametrelerine Eklenmesi

**Yapılanlar:**
- `manuf_schedule_params` tablosuna `ring_interval` (HIP Ring ömrü, 1300 adet) ve `ring_change_minutes` (HIP Ring değişim süresi, 570 dk) parametreleri eklenerek schedule sayfasındaki parametreler bölümünden dinamik olarak yönetilebilir hale getirildi.
- `supabase/migrations/20260602074500_add_ring_params_to_schedule_params.sql` migration dosyası oluşturuldu ve canlı veritabanında çalıştırıldı.
- `wiki/entities/db-tablolari.md` dokümantasyonu güncellendi.

## [2026-06-02] delete | Kurtarma Analizi ve Önerilen Karar Destek Adımları Kaldırıldı

**Yapılanlar:**
- `RecoveryCard` ("Kurtarma Senaryosu Analizi") ve `CampaignOptimizer` ("Önerilen Karar Destek Adımları") bileşenleri ve bu bileşenlerle ilgili tüm mantıksal hesaplama kodları (`recoveryDays`, `neededPerRecoveryDay`, `extraMinutesPerRecoveryDay`, `defaultShift`, `holidayCapacity`, `requiredHolidayDays`) `/schedule` sayfasından tamamen kaldırıldı.
- `src/app/schedule/_components/RecoveryCard.tsx` ve `src/app/schedule/_components/CampaignOptimizer.tsx` bileşen dosyaları projeden silindi.
- `OperationsActionPanel` üzerindeki kurtarma hesaplama bağımlılıkları temizlendi ve "Açığı kapat" kartı kurtarma detayları verilmeden sade bir hedeften sapma uyarısına dönüştürüldü.

## [2026-06-02] update | Arayüz Metinlerinin Temizlenmesi

**Yapılanlar:**
- `/schedule` sayfa başlığında bulunan `"Hücre bazlı dönem planı"` alt başlığı kaldırıldı.
- Pres Hücresi seçildiğinde gösterilen `"Pres başlangıç hazırlığı, normalizasyon fırını, kalıp ömürleri ve fazla mesai etkisini seçili tarih aralığına göre görün."` açıklaması kaldırıldı.
- `SettingsSidebar.tsx` içerisinde bulunan fırın ve normalizasyon sürelerinin detaylarını anlatan mavi renkli bilgilendirme kartı (Card) tamamen temizlendi. Unused `Card` ve `CardContent` importları kaldırıldı.

## [2026-06-02] update | Dinamik Parametre Filtreleme ve Ekle Butonunun Kaldırılması

**Yapılanlar:**
- Sol menüdeki **Parametreler** panelinde, seçilen hücreye göre dinamik parametre gösterimi sağlandı:
  - **Pres Hücresi** seçildiğinde sadece Pres ile ilgili parametreler (ısınma, fırın süreleri, kalıp ömürleri ve süreleri) listelenir.
  - **ETM Hücresi** seçildiğinde ise `etm_` önekiyle başlayan takım ve palet değişim süreleri/ömürleri listelenir.
  - Diğer hücreler seçildiğinde ise *"Seçili hücre için tanımlanmış bir parametre bulunmamaktadır"* uyarısı verilir.
- Parametre ekleme/silme fonksiyonları ve bunlara bağlı olan **"Yeni parametre ekle"** butonu/form alanı `ParamsSidebar.tsx` bileşeninden tamamen kaldırıldı.

## [2026-06-02] delete | Fırın Başlangıç Genel Ayarı Kaldırıldı

**Yapılanlar:**
- Sol menüdeki **Plan Ayarları** (SettingsSidebar) kısmında bulunan genel **"Fırın başlangıç"** saat seçici alanı arayüzden kaldırıldı.
- Günlük bazda (Gantt şeması ve detay panelinden) fırın başlangıç saatleri gün gün ayarlanabildiği için bu genel ayar parametresi gizlendi ve ilgili props/template kodları temizlendi.

## [2026-06-02] merge | ETM Hücresi Modülü /schedule Altına Birleştirildi

**Yapılanlar:**
- ETM Hücresi ayrı rotası (`/schedule/etm`) tamamen silindi.
- `/schedule` sayfasındaki aktif hücre seçici dropdown'ı "ETM Hücresi" durumunu doğrudan destekleyecek şekilde genişletildi.
- "Kalıplar" sekmesi aktif hücre ETM Hücresi olduğunda dinamik olarak "Takımlar (ETM)" başlığını alıyor ve kalıp değişim takvimi yerine `<EtmToolsSidebar />` bileşenini yüklüyor. ETM dışı hücrelerde ise bu sekme tamamen gizleniyor.
- `SettingsSidebar` bileşeni ETM seçildiğinde ETM-1/2 kesici uç ve punta matkabı başlangıç kalan ömür değerlerinin girilmesini destekleyecek şekilde güncellendi.
- Günlük simülasyon tablosu (`ScheduleTable.tsx`) ETM Hücresi seçildiğinde ETM-1/2 kesici uç ve punta matkabı kalan ömürlerini içeren durum rozetlerini gösterecek şekilde uyarlandı.
- Projenin `npm run build` ile başarıyla derlendiği doğrulandı.

## [2026-06-02] fix | ETM Gantt Şeması ve Satır Görünümleri Düzeltildi

**Yapılanlar:**
- `ScheduleTable.tsx` içerisindeki `buildGanttSegments` fonksiyonunun `isPress` parametresi `cellName` parametresiyle değiştirilerek ETM Hücresi için özel Gantt segmentleri ("ETM Proses", "Kesici Uç Değişimi", "Punta Matkabı Değişimi" ve "Palet Değişimi") çizim mantığı eklendi.
- ETM Hücresi seçildiğinde fırın, kalıp ısıtma ve kalıp soğutma gibi pres hücrelerine özel segmentler Gantt şemasından ve satırlarından tamamen temizlendi.
- ETM'ye ait duruş segmentleri (Kesici Uç, Punta Matkabı, Palet) ve proses adımları parça bazında simüle edilerek, her 10 parçada bir 5 dk kesici uç değişimi ve her 20 parçada bir 10 dk palet değişimi olacak şekilde gün içine periyodik/ardışık bloklar halinde dağıtıldı.
- Her duruş segmenti kendi ilişkili satırına (Kesici Uç Değişimi, Palet Değişimi, Punta Matkabı Değişimi) yerleştirilerek görsel olarak anlaşılır bir akış şeması oluşturuldu.
- Gantt tablosundaki sürükle-bırak satır sıralaması (`ganttRowOrder`), aktif hücre değiştikçe `useEffect` hook'u ile dinamik olarak sıfırlanıp ilgili hücrenin satır listesine (ETM Proses, Kesici Uç Değişimi, Punta Matkabı Değişimi, Palet Değişimi, Arıza/Duruş) uyarlanacak şekilde güncellendi.
- `types.ts` ve `utils.ts` dosyaları güncellenerek simülasyon çıktısına bireysel takım (kesici uç, matkap) ve palet değişim süreleri (`etmCuttingStopsMinutes`, `etmDrillStopsMinutes`, `etmPaletStopsMinutes`) eklendi.
- `OperationsActionPanel.tsx` içindeki `buildGanttSegments` çağrısı, değişen imza doğrultusunda `cellName` parametresi geçecek şekilde güncellenerek TypeScript derleme hatası giderildi.

## [2026-06-02] refactor | Öncül/Ardıl Bağlantı Noktaları ve SVG Çizimleri Kaldırıldı

**Yapılanlar:**
- Gantt şemasındaki çubukların baş ve sonlarında yer alan, görsel karmaşaya sebep olan mavi renkli öncül/ardıl bağlantı sürükleme noktaları (dots) `ScheduleTable.tsx` içerisinden tamamen kaldırıldı.
- Segmentleri birbirine bağlayan SVG yön okları, kontrol paneli (Öncül/Ardıl Bağları kartı) ve ilişkili kodlar silindi.
- Bileşen tipleri (`Props`) ve parent bileşenler (`page.tsx`) temizlenerek gereksiz `dependencies` ve `updateDayDependencies` parametreleri kaldırıldı, kod yapısı basitleştirildi.

## [2026-06-02] fix | ETM Punta Matkabı ve Takım Değişimlerinin Makine Bazlı Ayrılması

**Yapılanlar:**
- `ScheduleTable.tsx` içerisindeki ETM Gantt segment üretim döngüsü güncellendi.
- Kesici uç ve punta matkabı değişimlerinin tetiklenmesi için kullanılan statik parça bazlı modülo kontrolleri (`p1 % 300 === 0` vb.) yerine, günün başlangıç kalan ömür değerleri (`etm1CuttingStart`, `etm2CuttingStart`, `etm1DrillStart`, `etm2DrillStart`) referans alınarak parça üretildikçe kalan ömrün eksilmesi ve `0`'a ulaştığında değişimin tetiklenerek ömrün sıfırlanması mantığı kuruldu.
- Bu sayede 300 parçalık punta matkabı ömrü ve 10 parçalık kesici uç değişimleri gün bazında kümülatif kalan ömre bağlı olarak doğru sıralarda ve anlarda Gantt şemasına yansıtıldı.
- **Makine Bazlı Ayrım:** ETM Hücresi seçildiğinde Gantt tablosundaki proses, kesici uç değişimi ve punta matkabı değişimi satırları ETM-1 ve ETM-2 makineleri için iki ayrı satıra bölündü (`ETM-1 Proses`, `ETM-2 Proses`, `ETM-1 Kesici Uç Değişimi`, `ETM-2 Kesici Uç Değişimi`, `ETM-1 Punta Matkabı Değişimi`, `ETM-2 Punta Matkabı Değişimi`). Segment etiketleri ve engelleme/gizleme (disabled segments) eşleşmeleri makine bazında ayrıştırıldı.
- **Satır Mükerrerliği Giderildi:** Her bir parça üretimi için üretilen bireysel segmentlerin etiketleri, Gantt satır listesi hesaplanırken (`customGanttRows`) tekilleştirilerek (`new Set`) aynı satır adının (örneğin `ETM-1 Proses`) tabloda mükerrer olarak (alt alta onlarca kez) açılması engellendi.
- **Generic ETM Proses Satırı Kaldırıldı:** ETM Hücresi dışındaki hücreler için kullanılan genel proses segmenti üretme bloğundan ETM hücresi muaf tutuldu (`!isEtm` koşulu eklendi). Böylece hem ayrıntılı makine bazlı proses segmentlerinin hem de genel `"ETM Proses"` çubuğunun aynı anda çizilerek satır kalabalığı yapması önlendi.
- **Satır Sıralaması Düzenlendi:** Gantt tablosundaki ETM satır sıralaması, kullanıcının talebi doğrultusunda ETM-1 ve ETM-2 grubu olarak dikeyde alt alta sıralandı:
  1. `ETM-1 Proses`
  2. `ETM-1 Kesici Uç Değişimi`
  3. `ETM-1 Punta Matkabı Değişimi`
  4. `ETM-2 Proses`
  5. `ETM-2 Kesici Uç Değişimi`
  6. `ETM-2 Punta Matkabı Değişimi`
  7. `Palet Değişimi`
  8. `Arıza / Duruş`
- **ETM Proses Barları Birleştirildi (Konsolidasyon):** ETM-1 ve ETM-2 proseslerinin 1'er parça şeklinde (3'er dakikalık) bölünmüş şekilde çizilmesi engellendi. Proses barları, bir duruş (takım/punta değişimi, palet değişimi veya arıza) tetiklenene kadar uzatılarak kesintisiz, bloklar halinde çizilecek şekilde güncellendi. Blokların üzerindeki parça adetleri otomatik hesaplanarak "X adet" şeklinde yansıtıldı.
- **Dinamik Parametre Entegrasyonu:** Gantt şeması segment oluşturucusunda (`buildGanttSegments`) duruş sürelerinin (kesici uç değişimi, punta matkabı değişimi, palet değişimi ve hat çevrim süresi) statik (5 dk, 10 dk vb.) olarak el ile yazılmış olması (hardcoded) nedeniyle, parametre menüsündeki değişikliklerin şemaya yansımama ve simülasyon kapasitesi ile Gantt sürelerinin uyuşmama hatası giderildi. `processParams` parametreleri şema oluşturucuya aktarılarak tüm süreler dinamikleştirildi.

## [2026-06-02] update | ETM Hücresi WIP Kısıt Simülasyonu Entegrasyonu

**Yapılanlar:**
- **Simülasyon Kısıt Mantığı:** `buildSchedule` simülasyon motoruna ETM Hücresi'nin fiziksel WIP (yarı mamul) stok limitleri entegre edildi. ETM'nin günlük kapasitesi ve üretimi, `Başlangıç WIP (Pres → ETM) + Pres'in O Günkü Simüle Edilen Üretimi` miktarı ile sınırlandırıldı (capped).
- **Üst Akış (Upstream) Pres Simülasyonu:** ETM Hücresi planlaması seçildiğinde, arka planda önce Pres Hücresi simülasyonu koşturulup günlük planlanan üretim çıkışları (`pressed` adetleri) elde edilir. Bu adetler ETM simülasyonuna günlük girdi (`upstreamOutput`) olarak aktarılır.
- **Başlangıç WIP Yükleme ve Arayüz Girişi:** ETM seçildiğinde sol menüye (Plan Ayarları) **"Başlangıç WIP (Pres → ETM)"** giriş alanı eklendi. Bu değer, planlama dönemi başlangıç tarihindeki gerçek/hesaplanan WIP stok tablosundan (`manuf_wip_stock`) otomatik olarak `startDate - 1 day` üzerinden yüklenir ve kullanıcı tarafından manuel olarak değiştirilebilir.
- **Günlük WIP Durum Gösterimi:** Günlük simülasyon tablosuna (`ScheduleTable`) ETM hücresi aktifken **"WIP (Başla → Bitir)"** sütunu eklenerek, gün başı kullanılabilir WIP ve gün sonu devreden WIP miktarlarının şeffaf bir şekilde izlenmesi sağlandı.
- **Tarih Geçmişi ve Supabase:** Veritabanındaki WIP verilerini önceki günden itibaren çekmek için `loadCellWipStock` sorgu aralığı `startDate - 1` günü kapsayacak şekilde genişletildi.




## [2026-06-02] fix | ETM Manuel Punta Matkabı ve Kesici Uç Değişimlerinin Gantt'ta Gösterilmesi

**Yapılanlar:**
- `ScheduleTable.tsx` içerisindeki `buildGanttSegments` fonksiyonuna `toolChangesForDay: ToolChangeItem[]` parametresi eklendi.
- ETM Hücresi segment üretim bloğunda (`isEtm` koşulu altında), üretim barları başlamadan önce manual takım değişimleri (manuel punta matkabı ve kesici uç) ayrı birer Gantt segmenti olarak çiziliyor. Punta matkabı değişimleri `bg-amber-500` (kehribar), kesici uç değişimleri `bg-orange-400` (turuncu) rengiyle ilgili makine satırlarına (`ETM-1/2 Punta Matkabı Değişimi`, `ETM-1/2 Kesici Uç Değişimi`) yerleştirildi.
- `utils.ts` içerisindeki `buildSchedule` ETM simülasyon bloğu güncellendi: manuel değişimlerin süreleri (`manualCuttingStops`, `manualDrillStops`) mevcut kapasiteden düşülerek (`etmWorkAvailableMinutes`) simülasyon kapasitesi doğru hesaplandı; `actualRes` üzerindeki toplam duruş dakikaları da manuel değişim sürelerini içerecek şekilde güncellendi.
- `Props` tipi ve `ScheduleTable` bileşeni `etmToolChanges?: ToolChangeItem[]` prop'unu kabul eder hale getirildi.
- `OperationsActionPanel` bileşeni de aynı prop'u alıp `buildGanttSegments` çağrısına geçirecek şekilde güncellendi.
- `page.tsx` içerisindeki her iki bileşene `etmToolChanges={etmToolChanges}` prop'u eklendi.
- `npm run build` ile TypeScript derlemesi başarıyla doğrulandı.

## [2026-06-02] fix | Fırın Sola Taşınınca Vardiya Çubuğunun Uzaması Düzeltildi

**Yapılanlar:**
- `/schedule` Gantt çiziminde görünür zaman aralığını genişleten `shiftStart`/`shiftEnd` hesabı ile gerçek **"Vardiya"** segmenti ayrıştırıldı.
- "Fırın Isıtma" bloğu vardiyadan önceye sürüklendiğinde zaman çizelgesi sola genişlemeye devam eder, ancak **"Vardiya"** çubuğu artık fırınla birlikte sola uzamaz; gerçek vardiya başlangıç/bitiş saatlerinde sabit kalır.
- `npm run build` ile doğrulandı.

## [2026-06-02] update | Standart Fırın Isıtma Şablonu 07:00-08:00 Yapıldı

**Yapılanlar:**
- `/schedule` standart şablonundaki `FURNACE_START` sabiti `07:00` olarak güncellendi.
- Gantt'ta override olmayan Pres günlerinde "Fırın Isıtma" bloğu varsayılan olarak **07:00-08:00** aralığında başlar.
- `npm run build` ile doğrulandı.

## [2026-06-02] update | Kalıp Soğutma Vardiya Sonrasına Taşabilir Yapıldı

**Yapılanlar:**
- `buildSchedule` Pres kapasite hesabında kalıp soğutma süresi (`dieCoolingMinutes`) vardiya içi pres süresinden düşülmeyecek şekilde güncellendi.
- Pres prosesi vardiya sonuna kadar devam edebilir; "Kalıp Soğutma" Gantt bloğu üretim bitiminden sonra, gerekirse vardiya saatleri dışında gösterilir.
- `npm run build` ile doğrulandı.

## [2026-06-02] update | Fırın Isınma Süresi 60 Dakikaya Eşitlendi

**Yapılanlar:**
- Standart 07:00-08:00 fırın ısıtma şablonuyla uyum için `NORMALIZATION_WARMUP_MINUTES` varsayılanı 60 dk yapıldı.
- `manuf_schedule_params` içindeki `normalization_warmup_minutes` değerini 60'a güncelleyen migration eklendi.
- Wiki ve bilgi panelindeki 120 dk referansları 60 dk olarak güncellendi.
- `npm run build` ile doğrulandı.

## [2026-06-02] update | Fırın Isıtma Başlangıcı Vardiyadan Bağımsızlaştırıldı

**Yapılanlar:**
- `/schedule` Gantt detayındaki Pres hücresi kontrollerine gün bazlı **"Fırın başlangıç"** saat alanı eklendi.
- "Fırın Isıtma" Gantt bloğunun sürükleme sınırı vardiya başlangıç/bitiş aralığından ayrılarak gün içinde bağımsız ayarlanabilir hale getirildi.
- Pres bloğu hareket ettirilirken hesaplanan fırın başlangıcı da vardiya penceresine değil gün sınırına göre korunacak şekilde sınırlandı.
