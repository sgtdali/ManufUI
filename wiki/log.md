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

## [2026-06-01] update | Schedule Gantt Detayi

**Yapilanlar:**
- `src/app/schedule/_components/ScheduleTable.tsx` icinde gun satirlari tiklanabilir hale getirildi.
- Tiklanan gunun altinda vardiya saatlerine yayilan Gantt benzeri detay paneli eklendi: firin isitma, kalip isitma, on kontrol, induksiyon baslangic, pres proses, kalip sogutma, temizlik ve varsa ariza/durus bloklari gosteriliyor.
- Detay paneli `DayPlan` verilerinden hesaplaniyor; simulasyon motoru degistirilmedi.

## [2026-06-01] update | Interaktif Schedule Gantt

**Yapilanlar:**
- Gantt detay paneli salt gorsel olmaktan cikarildi; vardiya baslangic/bitis, firin baslangic, fazla mesai, uretim adedi, calisma gunu ve sifirlama kontrolleri panele eklendi.
- Kalip degisimi state'i `ScheduleTable` icine tasindi; panelden erkek/disi kalip degisimi ekleme ve mevcut kaydi silme aksiyonlari Supabase server action'larina baglandi.
- Kayitli veya simulasyon kaynakli kalip degisimleri Gantt uzerinde `Planli Durus / Kalip Degisimi` satirinda blok olarak gosterilecek hale getirildi.

## [2026-06-01] update | Schedule Gantt Surukle Birak

**Yapilanlar:**
- Gantt bloklari 15 dakikalik grid'e oturan surukle-birak davranisi kazandi.
- Vardiya blogu tasinabilir ve kenarlarindan baslangic/bitis saati degistirilebilir hale geldi.
- Firin isitma blogu tasindiginda `furnaceStart`, pres proses blogu tasindiginda firin baslangici uzerinden pres baslangici senaryosu guncelleniyor.
- Pres proses blogunun sag kenari suruklendiginde uretim suresi/adedi `pressed` override'i olarak guncelleniyor.

## [2026-06-01] update | Kalip Degisimi ve Kalip Isitma Kuralı

**Yapilanlar:**
- Schedule Gantt zamanlamasinda kalip degisimi/bakim blogu ile kalip isitma blogunun cakismasi engellendi.
- Kalip degisimi varsa `Kalip Isitma` blogu kalip degisimi bittikten sonra baslayacak sekilde hesaplanir.

## [2026-06-01] update | Gantt Oncul Ardil Baglari

**Yapilanlar:**
- Gantt cubuklarinin iki ucuna baglanti noktasi eklendi.
- Bir cubugun noktasindan diger cubugun noktasina surukleyip birakinca surukleme yonune gore `oncul -> ardil` bagi kuruluyor.
- Kurulan baglar gun detay panelinde listeleniyor, ilgili cubuklar mavi halka ile isaretleniyor ve baglar tek tek silinebiliyor.
- Baglar simdilik yerel senaryo katmaninda tutuluyor; kalici veritabanina yazilmiyor.

## [2026-06-01] update | Gantt Bag Okları

**Yapilanlar:**
- Oncul/ardil baglari Gantt uzerinde mavi kesikli oklarla gosterilecek hale getirildi.
- Oklar oncul blogun bitis ucundan ardil blogun baslangic ucuna ciziliyor.
- SVG ok katmani Gantt bloklarinin uzerinde gorunur, ancak surukleme ve nokta baglama etkilesimlerini engellemez.

## [2026-06-01] fix | Gantt Ok Gorunurlugu

**Yapilanlar:**
- Gantt ok SVG katmani satirlarin ardindan ust overlay olarak render edilecek sekilde tasindi.
- Ok katmaninin olcusu inline `left`, `width` ve `height` ile sabitlendi; z-index yukseltildi.
- Ok rengi ve stroke kalinligi artirilarak baglar daha gorunur hale getirildi.

## [2026-06-01] update | Gantt Satir Siralama

**Yapilanlar:**
- Gantt satir basliklari surukle-birak ile yeniden siralanabilir hale getirildi.
- `Vardiya` satiri sabit birakildi; diger satirlar kendi aralarinda tasinabiliyor.
- Oncul/ardil ok hesaplari yeni satir siralamasini kullanacak sekilde `visibleGanttRows` uzerinden calismaya devam ediyor.

## [2026-06-01] update | Gun Bazli Gantt Maddeleri

**Yapilanlar:**
- `DayOverride` icine `dieCoolingMinutes` ve `customGanttItems` alanlari eklendi.
- Kalip sogutma suresi Gantt detay panelinden gun bazli dakika olarak ayarlanabilir hale getirildi.
- Kalip sogutma blogu vardiya bitisiyle sinirlanmak yerine uretim sonrasi sure kadar Gantt uzerinde gosteriliyor.
- Gantt detay paneline gun bazli ozel madde ekleme/silme formu eklendi; maddeler baslangic saati ve sure ile turkuaz Gantt blogu olarak gosteriliyor.

## [2026-06-01] update | Schedule Overrides Supabase Entegrasyonu

**Yapılanlar:**
- Günlük overrides verilerinin (vardiya, fırın, fazla mesai, pres adeti, kalıp soğutma ve özel maddeler) ve Gantt öncül-ardıl bağlarının veritabanında kalıcı olarak saklanması sağlandı.
- `manuf_schedule_overrides` tablosu için migration SQL dosyası oluşturuldu.
- `src/app/schedule/actions.ts` içerisine `loadScheduleOverrides`, `saveScheduleOverride` ve `deleteScheduleOverride` sunucu fonksiyonları (Server Actions) eklendi.
- Sayfa ve tablo bileşenleri veritabanına bağlanarak tüm interaktif değişiklikler anında Supabase'e kaydedilebilir ve sayfa yüklendiğinde geri yüklenebilir hale getirildi.
- `GanttDependency` tipi `types.ts` dosyasına taşınarak ortak kullanıma sunuldu.

## [2026-06-01] update | Arıza Çakışma Önleme & Gantt Silme İyileştirmeleri

**Yapılanlar:**
- "Arıza/duruş varsa proses yapılamaz" kuralı geri alındı (fiziksel çakışma önleyici kaydırma kaldırıldı).
- **Silme Butonlarının Konumu (İyileştirme):** Çöp kutusu butonları timeline çubuklarının üzerinden kaldırılarak doğrudan sol taraftaki satır başlıklarının (Fırın Isıtma, Ön Kontrol vb. isimlerin) sağ tarafına yerleştirildi. Böylece daha temiz bir şema elde edildi.
- **Standart Maddelerin Silinebilmesi:** Vardiya hariç tüm standart Gantt bloklarının (Fırın Isıtma, Temizlik vb.) satır başlığından silinebilmesi sağlandı. Silinen standart bloklar veritabanına (`disabled_segments`) kaydedilir ve Gantt Detayları altında listelenip tek tıkla geri getirilebilir.
- **Saatlik Gantt Sütun Yapısı:** Gantt tablosundaki her bir sütunun tam 1 saat (60 dakika) olması sağlandı. Bitiş süresi en yakın tam saate yuvarlanarak (örn. 17:15 ise 18:00'e yuvarlanarak) sondaki 15 dakikalık asimetrik sütun problemi çözüldü. Blokların 15 dakikalık grid hassasiyetiyle kaydırılma özelliği korunmuştur.
- **Dinamik Vardiya Kapsama Kuralı:** Vardiya saatlerinin dışında hiçbir çalışma maddesinin kalmaması sağlandı. Özel maddeler veya standart hazırlık/soğutma süreçleri orijinal vardiya sınırlarını aştığında, "Vardiya" (shift) bloğu dinamik olarak bu maddeleri içine alacak şekilde genişletilir.
- **Kalıp Isıtma Ön Koşul Kuralı:** Pres üretiminin başlayabilmesi için kalıp ısıtma işleminin bitmiş olması koşulu eklendi. Pres başlangıç zamanı (`pressStartAbsoluteMinute`) hesaplanırken, fırın ısınması ve kalıp ısıtmasının tamamlanması (`dieHeatEndMinute`) ön koşul olarak eklenerek proses başlangıcı garanti altına alındı. Gantt şemasının çizim aşamasında da (Visual layer) bu kural doğrulanarak "Pres Proses" çubuğunun "Kalıp Isıtma" bitmeden önce görünmesi kesin olarak engellendi ve hazırlık blokları (Ön Kontrol vb.) otomatik kaydırıldı.
- **Kaydet Butonu & Performans İyileştirmesi:** Gantt hareketlerinin veya hücre içi planlama değişikliklerinin Supabase veritabanını anlık yormaması için tüm gerçek zamanlı (real-time) veritabanı kayıt tetikleyicileri kaldırıldı. Değişikliklerin sadece lokal React state'inde tutulması sağlandı. Sağ üst köşeye eklenen interaktif "Değişiklikleri Kaydet (N)" butonu ile toplu kaydetme (batch save) özelliği getirildi. Kaydedilmemiş değişiklik olması durumude hücre değişikliğinde ve sayfa kapanışında uyarı pencereleri eklendi.

## [2026-06-01] update | Pres Proses & Kalıp Isıtma Görsel Sıralama Düzeltmesi

**Yapılanlar:**
- **Silinen Blokların Görsel Gizlenmesi:** Kullanıcı tarafından gizlenen standart hazırlık/üretim bloklarının (Fırın Isıtma, Kalıp Isıtma, Ön Kontrol vb.) silinmesine rağmen Gantt çizim aşamasında (Pass 2) gözükmeye devam etmesi hatası, tüm standart segmentler için `disabledList` kontrolü getirilerek çözüldü. Artık gizlenmiş bloklar Gantt tablosunda kesin olarak render edilmemektedir.
- **Kalıp Değişimi & Isıtma Hizalaması:** Planlı kalıp değişimlerinin (`mold-maintenance`) görsel başlangıç zamanının, erken başlatılan fırın ısıtma gibi durumlar yüzünden vardiya öncesine (`shiftStart`) kayması engellendi. Bu bloğun başlangıcı, fiziksel simülasyon motoruna uygun olarak resmi vardiya başlangıç saati olan `baseShiftStart` değerine sabitlendi. Böylelikle "Planlı Duruş", "Kalıp Isıtma" ve "Pres Proses" blokları simülasyon çıktıları ile birebir görsel uyum içerisine sokularak aralarındaki mantıksal sıralama hatası giderildi.

## [2026-06-01] update | Gün İçi Kalıp Değişimi Görsel Ayrışımı

**Yapılanlar:**
- **Gün İçi & Sabah Kalıp Değişimlerinin Ayrıştırılması:** Günün başlangıcında yapılan kalıp değişimleri (devreden gelen veya manuel eklenenler) ile gün ortasında parça ömrü bittiği için simülasyon tarafından tetiklenen gün içi kalıp değişimleri (`mid-day maintenance`) tamamen ayrıştırıldı.
- **Parametrik İzleme:** `DayPlan` yapısına `startMaintenanceMinutes`, `midMaintenanceMinutes` ve `midMaintenanceStartMinute` alanları eklendi. `buildSchedule` simülasyonu bu değerleri gün bazlı tam zamanlı hesaplayıp dönecek şekilde güncellendi.
- **Görsel Hizalama Hatasının Çözümü:** Gün ortasındaki kalıp değişimi artık Gantt şeması üzerinde günün başlangıcına yığılmak yerine simülasyonun hesapladığı gerçek parça bitiş saatinde (`midMaintenanceStartMinute`) başlayacak şekilde çiziliyor. Fırın saati kaydırıldığında, sabah kalıp değişimi sabit kalırken gün içi kalıp değişimi de üretime paralel olarak dinamik olarak öteleniyor; böylelikle görsel olarak araya başka bir üretim işinin girmesi hatası çözüldü.

## [2026-06-01] update | Kalıp Değişimini Erteleme Overrides

**Yapılanlar:**
- **Erteleme Overrides Entegrasyonu:** Günlük plan detaylarında `DayOverride` modeline `postponeMaleChange` ve `postponeFemaleChange` özellikleri eklendi.
- **Limitlerin Esnetilmesi:** Eğer o gün için erteleme aktif edilmişse, simülasyon motoru (`buildSchedule`) ilgili kalıbın kalan ömrünün sıfırın altına düşmesine (`negative remaining life`) izin verir. Böylece üretim adedi kısıtlanmaz, otomatik kalıp değişimi duruşu (mavi blok) eklenmez ve kalan ömür negatif olarak listelenir (örn. -20 adet).
- **Arayüz Seçenekleri:** Gün detay düzenleme formuna "Erkek Kalıp Değişimini Ertele" ve "Dişi Kalıp Değişimini Ertele" checkbox'ları eklendi. Kullanıcı bu sayede simülasyonun otomatik duruş ekleme davranışını esnetebilir.

## [2026-06-01] update | Kalıp Değişimi Sürükleme ve DB Entegrasyonu

**Yapılanlar:**
- **Derleme Hatalarının Giderilmesi:** `ScheduleTable.tsx` içerisindeki `unwrapTime` fonksiyonuna geçirilen opsiyonel `moldMaintenanceStart` alanının `string | undefined` olması sebebiyle alınan TypeScript derleme hataları, `?? null` varsayılan değeri eklenerek çözüldü. Proje genelinde TS derleme kontrolü sıfır hata ile tamamlandı.
- **Sürükleme ve State Kaydetme Hatasının Giderilmesi:** `page.tsx` içerisindeki `updateOverride` fonksiyonunun, güncellenen değerler arasında `moldMaintenanceStart`, `postponeMaleChange`, `postponeFemaleChange` ve `disabledSegments` alanlarını kontrol etmemesi nedeniyle, bu alanlar değiştirildiğinde gün override kaydını tamamen silmesi (delete next[key]) hatası düzeltildi. Artık sürükleme işlemi akıcı bir şekilde çalışmakta ve veriler state üzerinde kararlı bir şekilde tutulmaktadır.
- **Veritabanı ve Sunucu Entegrasyonu:** Günlük overrides veritabanı şemasında (`manuf_schedule_overrides`) `mold_maintenance_start` kolonu olmadığı için yapılan sürükleme ve zaman ataması verilerinin kaybolması sorunu çözüldü. Bu alanın kalıcı olarak saklanabilmesi için `20260601113000_add_mold_maintenance_start_to_schedule_overrides.sql` migration dosyası oluşturuldu.
- `src/app/schedule/actions.ts` sunucu fonksiyonları (`loadScheduleOverrides` ve `saveScheduleOverride`) güncellenerek bu verinin veri tabanına yazılması ve veri tabanından yüklenmesi sağlandı.
- **Arayüz Kontrolü:** Gün detay panelindeki form alanlarına "Kalıp Değişimi Başlangıç" adıyla saat seçici bir zaman girdisi (`<Input type="time">`) eklendi ve kolon yapısı dinamik olarak `xl:grid-cols-8` olarak genişletildi. Kullanıcılar artık kalıp değişimi başlangıcını hem Gantt şeması üzerinden sürükleyerek hem de form üzerinden tam saat girerek hassas bir şekilde yönetebilmektedir.

## [2026-06-01] update | Gantt Tablosu Sütun Sadeleştirmesi

**Yapılanlar:**
- **Görsel Karmaşanın Azaltılması:** Tablodaki aşırı sütun yoğunluğunu ve yatay kaydırma ihtiyacını azaltmak amacıyla `Süre`, `Kapas.` (Kapasite) ve `Fırın Çıkış` (Fırın Son Çıkış) sütunları ana tablodan kaldırıldı.
- **Veri Koruma & Hizalama:** Kaldırılan sütunlardaki bilgilerin kaybolmaması için:
  - `Süre` (day.availableMinutes) verisi, satıra tıklandığında açılan Gantt detay panelinin sol üstündeki vardiya açıklama metnine ("Vardiya HH:MM - HH:MM (XXX dk kullanılabilir süre)") dahil edildi.
  - `Kapasite` ve `Üretim` bilgileri zaten detay panelinde üst bilgi rozetleri (badges) olarak yer almaktaydı.
  - `Fırın Son Çıkış` (day.lastFurnaceExitTime) bilgisi, detay panelinin sağ üstündeki rozetler arasına dinamik bir rozet olarak yerleştirildi.
- **Kolon Hizalama Düzeltmesi:** Sütunların kaldırılmasıyla birlikte alt detay panelinin `colSpan` değeri olan `visibleColumnCount` değişkeni (`isPress ? 17 : 11` olarak) güncellendi; böylelikle alt panelin tablo sınırlarıyla hizalanması korundu.

## [2026-06-01] fix | Gantt Tablosu Sütun Hizalama Hatası

**Yapılanlar:**
- **Süre Sütunu Kaldırıldı:** `Süre` sütununun `<td>` hücresi de `ScheduleTable.tsx` tablosunun `<tbody>` kısmından tamamen kaldırılarak veri kayması düzeltildi.
- **Başlık - Gövde Eşleşmesi Sağlandı:** `thead` (tablo başlığı) kısmında hâlâ kalan `Süre`, `Kapas.` ve `Fırın Çıkış` sütun başlıkları temizlendi. Böylelikle başlıklar ile gövde satırları kusursuz şekilde hizalanmış oldu.
- **Kod Doğrulaması:** TypeScript derlemesi (`tsc --noEmit`) ile projenin sorunsuz derlendiği doğrulandı.

## [2026-06-01] update | Gantt ve Tablo Vardiya Uyumlaştırması & Otomatik Fazla Mesai

**Yapılanlar:**
- **Dinamik Vardiya Uyumlaştırması:** `buildSchedule` simülasyon motorunda (hazırlık, fırın ısıtma, kalıp değişimi, pres proses, kalıp soğutma ve özel Gantt maddelerinin genişletme mantığı) günün nihai başlangıç ve bitiş saatleri (`actualShiftStart` ve `actualShiftEnd`) hesaplanarak `day.shiftStart` ve `day.shiftEnd` alanlarına aktarıldı. Böylelikle Gantt zaman çizgisi üzerindeki görsel vardiya sınırları ile ana tablodaki saatler tam uyumlu hale getirildi.
- **Otomatik Fazla Mesai (F.Mesai) Hesabı:** Hafta içi standart 570 dk (07:45 - 17:15) ve hafta sonu (Cuma/Cumartesi) standart 480 dk (09:00 - 17:00) vardiya süreleri referans alınarak, bu sınırları aşan süre otomatik olarak hesaplandı ve `F.Mesai` (`overtimeMinutes`) alanına aktarılarak ana tablo satırında otomatik gösterildi.
- **Kod Doğrulaması:** Değişiklik sonrasında `npx tsc --noEmit` ile TypeScript derleme testi başarıyla doğrulandı.

## [2026-06-01] update | Gizlenen Gantt Segmentlerinin Satır Bazında Gizlenmesi

**Yapılanlar:**
- **Satır Gizleme Mantığı:** Standart hazırlık/temizlik segmentleri silinip (`disabledSegments` listesine eklendiğinde) sadece üzerlerindeki barın silinmesi yerine, satır başlığı ve boş çizelge satırının da Gantt tablosundan tamamen kalkması sağlandı. `ROW_LABEL_TO_SEGMENT_ID` eşleştirmesi ile pasifleşen segmentlerin satırları `visibleGanttRows` üzerinden tamamen filtrelenmektedir.
- **Kod Doğrulaması:** `npx tsc --noEmit` ile TypeScript derleme kontrolü başarılı olarak doğrulandı.

## [2026-06-01] fix | Base UI Uncontrolled FieldControl Konsol Hatası

**Yapılanlar:**
- **Uncontrolled-to-Controlled Hatası Giderildi:** Form inputlarının boş state'ten değer almaya geçerken (`undefined` -> `string`) konsolda oluşturduğu Base UI uncontrolled FieldControl uyarısı, `value` değerlerine `?? ""` (boş string fallbacks) eklenerek çözüldü.
- **Dinamik Uncontrolled Varsayılan Değer Güncellemesi:** Yeni madde ekleme formundaki `defaultValue={day.shiftStart}` kullanan uncontrolled input'un, vardiya başlangıcı değiştikçe uyarı vermesini önlemek amacıyla ilgili bileşene `key={day.shiftStart}` prop'u eklendi. Bu sayede React, default değer değiştiğinde ilgili input'u uyarı vermeden temiz bir şekilde yeniden oluşturur.
- **Kod Doğrulaması:** Proje `npx tsc --noEmit` kontrolünden hatasız geçti.

## [2026-06-01] delete | Ön Kontrol ve Temizlik Maddelerinin Kaldırılması

**Yapılanlar:**
- **Kod ve Görünümden Tamamen Temizleme:** `Ön Kontrol` (pre-check) ve `Temizlik` (cleaning) maddeleri, Gantt satır tanımlarından (`GANTT_ROWS`), veri eşleşme listesinden (`ROW_LABEL_TO_SEGMENT_ID`) ve devre dışı bırakılanlar eşleşme listesinden tamamen silindi.
- **Süre ve Hazırlık Ofseti Güncellemesi:** Ön kontrolün (30 dk) kalkmasıyla birlikte, pres prosesi başlamadan önceki hazırlık süresi sadece İndüksiyon Başlangıç (30 dk) olarak güncellendi. `buildSchedule` simülasyonu ve `buildGanttSegments` üzerindeki pres başlangıç ofseti `60` dakikadan `30` dakikaya düşürüldü.
- **Kod Doğrulaması:** Proje `npx tsc --noEmit` kontrolünden hatasız geçti.

## [2026-06-01] fix | Gantt Vardiya Bitişinin Çift Eklenme Hatası

**Yapılanlar:**
- **Mükerrer Süre Eklemesi Kaldırıldı:** `buildSchedule` simülasyon motoru artık dinamik olarak genişletilmiş (overtime dahil) vardiya başlangıç ve bitiş saatlerini döndürdüğü için, `buildGanttSegments` (`ScheduleTable.tsx`) fonksiyonunda `baseShiftEnd` değişkenine `day.overtimeMinutes` süresinin tekrar eklenmesi (çift ekleme/double-addition) engellendi. Bu sayede vardiya çubuğunun son işlemden sonra gereksiz yere akşam saatlerine doğru sarkması/uzaması sorunu çözüldü.
- **Kod Doğrulaması:** Proje `npx tsc --noEmit` kontrolünden hatasız geçti.

## [2026-06-01] update | Gantt Zaman Çizelgesi Sınırının En Az 23:00'e Uzatılması

**Yapılanlar:**
- **Zaman Çizelgesi Genişletme:** Kullanıcıların vardiya çubuğunun bitiş kenarını sürükleyerek vardiya saatlerini serbestçe genişletebilmesi için Gantt çizelgesinin sağ sınır (`endMinute`) değeri en az `23:00` (`1380` dakika) olarak sınırlandırıldı. Böylece çizelge üzerinde her zaman saat `23:00`'e kadar boş sütunlar yer alarak sürükle-bırak için yeterli visual track alanı sağlandı.
- **Kod Doğrulaması:** Proje `npx tsc --noEmit` kontrolünden hatasız geçti.

## [2026-06-01] fix | Gantt Tablosunun Sayfayı Yana Doğru Genişletme Hatası

**Yapılanlar:**
- **Tablo Esneme Sınırlandırması:** Gantt zaman çizelgesi genişledikçe tüm tablonun ve ana sayfa düzeninin yana doğru esnemesini önlemek için detay satırını içeren `<td>` hücresine `max-w-0` CSS sınıfı eklendi. Böylece ana tablo sayfa sınırlarında sabit kalırken, genişleyen Gantt çizelgesi kendi içindeki `overflow-x-auto` container'ı sayesinde sadece kendi alanında yatay scroll (kaydırma çubuğu) ile gezilebilir hale getirildi.
- **Kod Doğrulaması:** Proje `npx tsc --noEmit` kontrolünden hatasız geçti.

## [2026-06-01] fix | Gantt Saat Başlıkları ve Satırlarının Hizalanma Hatası

**Yapılanlar:**
- **Matematiksel Genişlik Hesaplama:** Saatlerin bulunduğu üst header grid'i (minmax 72px) ile altındaki satırların (mutlak konumlandırılmış Gantt barları barındıran relative div'ler) genişliklerinin senkronize kalabilmesi için Gantt iç kapsayıcı div'ine `style={{ width: 160 + (timeSlots.length - 1) * 72 }}` şeklinde dinamik genişlik atandı. Böylelikle başlıklar ile barların birbirini tam takip etmesi ve kaydırma esnasında kopukluk oluşmaması sağlandı.
- **Kod Doğrulaması:** Proje `npx tsc --noEmit` kontrolünden hatasız geçti.

## [2026-06-01] fix | Vardiya Bitiş ve F.Mesai Tutarsızlığı — Tek Kaynak Mimarisi

**Yapılanlar:**
- **Çift Hesap Kaldırıldı:** `buildSchedule` (utils.ts) içindeki `actualShiftStart/End` karmaşık hesabı kaldırıldı. Simülasyon motoru yeniden basit override/varsayılan vardiya saatlerini döndürmeye başladı.
- **Tek Kaynak (Single Source of Truth):** Tablo satırındaki vardiya bitiş saati ve F.Mesai artık `buildSchedule`'dan değil, her günün render sırasında zaten hesaplanan `buildGanttSegments` çıktısındaki `shift` segmentinin (`shiftSegment.start`, `shiftSegment.end`) gerçek değerlerinden okunuyor. Böylelikle Gantt'taki gri vardiya çubuğu ile tablodaki satır değerleri kesinlikle aynı veri kaynağından besleniyor.
- **Vardiya Bitiş Gösterimi:** Tablodaki `Vardiya` kolonunun bitiş kısmı, düzenlenebilir `<Input>` olmaktan çıkarılarak, Gantt shift segmentini doğrudan yansıtan sadece okunur bir `<span>` olarak güncellendi.
- **F.Mesai Gösterimi:** F.Mesai kolonundaki `<Input>` kaldırıldı. Değer artık otomatik hesaplı (Gantt shift süresi − konfigürasyon süresi) olarak gösteriliyor; override ile kilitlenmiş bir değer varsa o öncelik kazanıyor.
- **Kod Doğrulaması:** Proje `npx tsc --noEmit` kontrolünden hatasız geçti.

## [2026-06-01] refactor | Input Paneli Kaldırıldı — Tüm Ayarlar Gantt Üzerinden

**Yapılanlar:**
- **Input Grid Paneli Silindi:** Gantt detay panelindeki tüm override input alanları (Vardiya Başlangıç/Bitiş, Fırın Başlangıç, Kalıp Değişimi Başlangıç, Fazla Mesai, Üretim Adedi, Kalıp Soğutma) tamamen kaldırıldı.
- **Kalıp Soğutma Drag Desteği Eklendi:** `GanttSegment.editable` union tipine `"die-cooling"` eklendi. Kalıp Soğutma barının sağ kenarı sürüklenince `dieCoolingMinutes` override'ı güncelleniyor.
- **Kalan Kontroller:** Sadece Erkek/Dişi Kalıp Değişimini Ertele checkbox'ları ve Çalış/Sıfırla butonları bırakıldı.
- **Kod Doğrulaması:** Proje `npx tsc --noEmit` kontrolünden hatasız geçti.

## [2026-06-01] update | Arayüz Sadeleştirmesi ve Odak Kolonları

**Yapılanlar:**
- **Tablo Sütun Sayısının Azaltılması:** Tablodaki 17/11 kolonluk aşırı kalabalık görünüm, kullanıcının en çok önem verdiği 4 soruya yanıt veren 6-7 kolona düşürüldü.
- **Odak Kolonları:**
  - `Üretim / Hedef` ve `Fark` (Kümülatif/günlük hedefin yakalanıp yakalanmadığını hızlıca gösteren progress-bar'lı hücreler)
  - `F.Mesai` (Fazla mesai yapılması gereken günleri gösteren rozetler)
  - `Kalıp` (Erkek/Dişi kalan ömür durumunu ve kritik seviyeye yaklaşıldığını renklendiren rozetler)
  - `Arıza` (Duruş sürelerini ve detaylarını tooltips ile gösteren rozetler)
- **Hizalama ve Sayfa Yapısı:** Kaldırılan tüm sütunlar (`visibleColumnCount` dahil) ve Gantt detay satırı yeni kolon sayısıyla (7 pres, 6 pres dışı) tam hizalandı.
- **Kod Doğrulaması:** `npm run build` ile TypeScript derlemesi ve statik sayfa oluşturma başarıyla doğrulandı.

## [2026-06-01] update | Schedule Operasyon Öncelikli Yerleşim

**Yapılanlar:**
- **Operasyon Aksiyonları Paneli:** `/schedule` ana akışına otomatik hesaplanan öneri kartları eklendi. Panel; dönem açığı, ilk kritik gün, kalıp riski, arıza/duruş ve fazla mesai ihtiyacını mevcut `DayPlan` verilerinden çıkarır.
- **Sayfa Öncelik Sırası Güncellendi:** Ana içerik sırası operasyon önceliğine göre `Operasyon aksiyonları → Günlük tablo/Gantt → Planlama ve analiz araçları` şeklinde düzenlendi.
- **Analiz Yoğunluğu Azaltıldı:** Metrik kartları, kurtarma senaryosu, kayıp analizi, kampanya optimizasyonu ve bilgi paneli “Planlama ve analiz araçları” adlı katlanır bölümün içine taşındı.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] fix | Ara Kalıp Değişimi ve Pres Proses Çakışması

**Yapılanlar:**
- **Fiziksel Çakışma Giderildi:** Gantt görselinde ara kalıp değişimi (`midMaintenanceMinutes`) pres prosesinin ortasına denk geldiğinde yeşil `Pres Proses` çubuğu artık mavi kalıp değişimi bloğunun üzerinden geçmez. Pres prosesi kalıp değişimi öncesi ve sonrası olarak iki parçaya bölünür.
- **Vardiya Kapsamı Güncellendi:** Dinamik vardiya sınırı ara kalıp değişimi bloğunu da kapsayacak şekilde genişletildi.
- **Satır Gizleme Uyumu:** Bölünmüş pres prosesinde satır silme/gizleme davranışı hâlâ tek `press-process` mantığıyla çalışacak şekilde korundu.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] fix | Tamamlanmayan Kalıp Değişimi Sonrası Presin Başlamaması

**Yapılanlar:**
- **Tamamlanma Bilgisi Eklendi:** `DayPlan` yapısına `midMaintenanceComplete` alanı eklendi. Simülasyon motoru ara erkek kalıp değişiminde gün içinde kullanılan sürenin tam erkek kalıp değişim süresini karşılayıp karşılamadığını artık açıkça döndürür.
- **Gantt Devam Kuralı Sıkılaştırıldı:** Ara kalıp değişimi vardiya içinde tamamlanmıyorsa, `Pres Proses` ikinci parçaya bölünüp kalıp değişimi sonrasına devam etmez. Pres görseli kalıp değişiminin başladığı noktada biter.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] fix | Ara Kalıp Değişiminin Pres Başlangıcını Yanlış Ötelemesi

**Yapılanlar:**
- **Kök Neden:** Gantt hazırlık hesabında `day.maintenanceMinutes` toplamı kullanıldığı için gün ortasındaki ara kalıp değişimi, yanlışlıkla gün başındaki kalıp değişimi gibi kabul ediliyor ve pres/indüksiyon başlangıcını ileri itiyordu.
- **Düzeltme:** Pres öncesi kalıp ısıtma ve başlangıç koruması artık yalnızca `startMaintenanceMinutes` (gün başı bakım) değerini dikkate alır. Ara kalıp değişimi sabah hazırlık akışını bekletmez.
- **Beklenen Akış:** Bu tip günde kalıp ısıtma bittiğinde indüksiyon 30 dk başlar, ardından pres prosesi kalıp ömrü bitene kadar devam eder; ara kalıp değişimi başladığında pres durur.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] fix | Erkek Kalıp Değişimi Carryover Süresi

**Yapılanlar:**
- **Kök Neden:** Dişi kalıp değişimi için gün başı carryover tüketimi vardı; erkek kalıp değişiminde ise önceki günden kalan süre (`maleChangeCarryover`) ertesi gün tüketilmiyor, bunun yerine `maleRemaining <= 0` olduğu için yeni 285 dk erkek kalıp değişimi başlatılıyordu.
- **Düzeltme:** Erkek kalıp değişimi carryover mantığı eklendi. Önceki günden 15 dk kaldıysa ertesi gün sadece 15 dk planlanır; tamamlanınca erkek kalıp ömrü `maleDieInterval` değerine sıfırlanır.
- **Manuel Değişim Uyumu:** Manuel erkek kalıp kaydı girildiğinde bekleyen erkek carryover temizlenir.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] fix | Proses Sonrası Kalıp Değişimi İçin Soğutma Ön Koşulu

**Yapılanlar:**
- **Ortak Soğutma Sabiti:** Kalıp soğutma varsayılanı `DEFAULT_DIE_COOLING_MINUTES = 90` olarak `constants.ts` içine taşındı; simülasyon ve Gantt aynı sabiti kullanır.
- **Male/Female Kuralı:** Proses sonrası yapılacak erkek veya dişi kalıp değişimi, kalıp ömrünün bittiği proses noktasından hemen sonra başlamaz. Başlangıç zamanı artık `kalıp ömrü bitiş zamanı + kalıp soğutma süresi` olarak hesaplanır.
- **Carryover Etkisi:** Soğutma süresi vardiya içinde yer tükettiği için gün içinde yapılabilen kalıp değişimi süresi azalır; kalan süre ertesi güne carryover olarak taşınır.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] fix | Gantt Vardiya Yazısı ve F.Mesai Tek Kaynak

**Yapılanlar:**
- **Vardiya Yazısı Eşitlendi:** Gantt detay başlığındaki `Vardiya ...` metni artık ham `day.shiftStart/day.shiftEnd` yerine Gantt üzerindeki `shift` segmentinden (`displayShiftStart/displayShiftEnd`) okunur.
- **F.Mesai Hesabı Eşitlendi:** F.Mesai rozeti override değerine kilitlenmek yerine Gantt shift barının gerçek süresi ile konfigüre vardiya süresi arasındaki farktan hesaplanır.
- **Sonuç:** Gantt barı 07:45-18:45 ise detay yazısı da 07:45-18:45 ve 660 dk gösterir; Gantt normal vardiya aralığına dönerse F.Mesai otomatik 0 olur.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] fix | Vardiya Sürükleyince Eski F.Mesai Override'ının Kalması

**Yapılanlar:**
- **Kök Neden:** Vardiya barı 17:15'e geri çekildiğinde `shiftEnd` güncelleniyor fakat eski `overtimeMinutes: 90` override'ı veya global fazla mesai etkisi simülasyonda kalabiliyordu.
- **Düzeltme:** Vardiya başlangıç/bitiş sürükleme işlemleri artık o gün için `overtimeMinutes: 0` override'ı da yazar. Böylece manuel vardiya saati seçimi eski/global fazla mesaiyi ezer.
- **Rozet Hesabı:** F.Mesai rozeti artık override değerinden değil, Gantt vardiya barının gerçek süresi ile standart vardiya süresi arasındaki farktan hesaplanır.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] update | Kalıp Değişim Modu

**Yapılanlar:**
- **Mod Alanları:** Günlük schedule override modeline `moldChangeMode`, `manualMoldType` ve `manualMoldChangeAfterPieces` alanları eklendi. Supabase için ilgili migration oluşturuldu.
- **UI Kontrolü:** Gantt detay panelindeki eski erkek/dişi ertele checkbox'ları yerine `Otomatik`, `Ertele / Zorla`, `Elle Planla` mod seçici eklendi. Elle plan modunda kalıp tipi ve kaç parçadan sonra değişim yapılacağı girilebilir.
- **Simülasyon Mantığı:** Elle plan modunda seçilen kalıp için otomatik ömür limiti yerine kullanıcının girdiği parça eşiği kullanılır. Bu eşik kalıp ömrünün altında da üstünde de olabilir.
- **Kalıcı Kayıt:** Ertele ve manuel plan alanları `manuf_schedule_overrides` üzerinden yüklenip kaydedilir.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] fix | Manuel Kalıp Eşiğinde Kapasite ve Üretim Ayrımı

**Yapılanlar:**
- **Kök Neden:** Manuel kalıp değişim eşiği girildiğinde kapasite hesabı senaryo/gerçekleşen üretim adedine kilitleniyordu. Örneğin eşik 100, üretim 85 iken kapasite de 85 görünüyordu.
- **Düzeltme:** `buildSchedule` içinde teorik kalıp limitli kapasite (`capacityPressed`) ile gerçekten üretilecek adet (`productionDemand`) ayrıldı. Kapasite artık kalıp eşiğine göre hesaplanır; kalıp değişimi ise yalnızca üretim bu eşiğe gerçekten ulaşıyorsa başlar.
- **Sonuç:** Elle plan `100`, üretim `85` ise kalıp değişimi o günden kalkar, kapasite 100'e kadar çıkar, kalan kalıp ömrü üretime göre negatif/pozitif güncellenir.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] fix | Gizlenen Kalıp Değişiminin Carryover'a Geri Yansıması

**Yapılanlar:**
- **Kök Neden:** Gantt'ta kalıp değişimi satırı çöp ikonuyla gizlenince görsel blok kalkıyor, fakat simülasyon motoru o gün kalıp değişimi süresi kullanılmış gibi carryover'ı azaltmaya devam ediyordu.
- **Düzeltme:** `disabledSegments` içinde `mold-maintenance` varsa `buildSchedule` bunu “bu gün kalıp değişimi yapılmayacak” kuralı olarak yorumlar. Gün başı carryover tüketimi, otomatik kalıp değişimi ve gün ortası kalıp değişimi bu gün için ertelenir.
- **Sonuç:** Örneğin 30 dk gün sonu kalıp değişimi silinirse, ertesi güne aktarılacak kalan süre o 30 dk düşülmeden yeniden hesaplanır.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.

## [2026-06-01] fix | Schedule Veri/UI Senkron Riskleri

**Yapılanlar:**
- **Görsel ve Operasyon Ayrımı:** `DayOverride` modeline `disabledOperations` eklendi. `disabledSegments` artık görsel satır gizleme, `disabledOperations` ise simülasyonda gerçekten yapılmayacak operasyonları temsil eder. Supabase için migration oluşturuldu.
- **Kalıp Değişimi Silme:** Gantt'ta kalıp değişimi satırı silindiğinde hem görsel satır gizlenir hem `disabledOperations: ["mold-maintenance"]` yazılır. Geri getirildiğinde iki alan da temizlenir.
- **F.Mesai Öneri Senkronu:** `OperationsActionPanel` fazla mesai önerisini artık `day.overtimeMinutes` yerine Gantt `shift` segmentinin gerçek süresinden hesaplar.
- **Manuel Kalıp/Gantt Senkronu:** Manuel kalıp değişim modunda kalıp değişimi bloğu sürüklenirse `manualMoldChangeAfterPieces` de yeni zamana göre güncellenir. Ara kalıp değişimi bloğu da sürüklenebilir hale getirildi.
- **Kod Doğrulaması:** `npx tsc --noEmit` kontrolü hatasız geçti.
