# ManufUI Wiki Log

Append-only oturum logu. Her entry `## [YYYY-MM-DD] <tür> | <başlık>` formatındadır.
Grep ile son 5 girişi bul: `grep "^## \[" wiki/log.md | tail -5`

---

## [2026-06-14] update | Hedef Üretim Özelleştirmesi ve Kademeli/İlerici Validasyon Sistemi

**Yapılanlar:**
- **Hedef Üretim Özelleştirmesi:** Pres, ETM, ROB104 ve ROB108 hücreleri için hedef üretim adeti cuma ve cumartesi günleri hariç her saat için varsayılan olarak `20` yapıldı ve bu giriş alanları salt okunur (read-only) yapılarak görsel olarak gri arka plan ve engelli imleç (`bg-zinc-100 cursor-not-allowed`) uygulandı. Hafta sonu (cuma ve cumartesi) ise bu alanlar serbestçe girilip düzenlenebilmektedir.
- **Kademeli Kayıt (Progressive Validation):** Kullanıcıların gün ortasında asenkron saatlik veri kaydedebilmesi için `validateTargetDowntime` fonksiyonu güncellendi. Sistem kullanıcının veri girdiği en son satırı (`lastActiveIndex`) bulur ve sadece gün başlangıcından bu satıra kadar olan satırları doğrular. Son aktif satırdan sonraki gelecek saatler doğrulamadan muaf tutulur.
- **Aktif Satır Kriterleri:** Bir satırın aktif/touched sayılması için `uretim_adeti !== null` olması veya duruş dakikalarının girilmiş olması (`enteredDowntime > 0`) esas alındı. "Müşteri Var" checkbox'ı bu kontrolden hariç tutuldu.
- **Kalan Süre Rozet Davranışı:** Arayüzdeki rozet gösterimi güncellendi. Doğrulanan aralıkta kalan (ve aralardaki atlanmış boş satırlar da dahil olmak üzere) tüm satırlar için hesaplanmış gerekli duruş süreleri (örn. kırmızı `Kalan X dk`) gösterilir. Son aktif satırdan sonraki gelecek saatler ise nötr gri renkte ve `-` simgesiyle gösterilir.
- **Wiki Güncellemesi:** Yapılan tüm form, hedef ve validasyon güncellemeleri `wiki/systems/uretim-formu.md` ve `wiki/log.md` dosyalarına işlendi.

## [2026-06-14] update | Ana Form Ekranından Butonların Kaldırılması, Dashboardy Güncellemeleri ve Öneri Kayıt Sistemi

**Yapılanlar:**
- **Buton Kaldırma:** Ana günlük üretim formu üst bilgi kartından (`FormHeader.tsx`) "Excel'e Aktar" (Export to Excel) ve "Performans Paneli" (/dashboardy) butonları kaldırıldı.
- **Varsayılan Tarih Aralığı ve Arayüz Düzenlemeleri:** Detaylı Performans Paneli (`/dashboardy`) başlangıç ve bitiş tarihleri varsayılan olarak `14.06.2026` ve `09.07.2026` olacak şekilde ayarlandı. Genel toplam durumu kartının başlığı "Genel İlerleme Durumu" olarak güncellendi, absolute değerler (`0 / 22.000`), "Kümülatif İlerleme" yazısı ve en sağdaki `%` metin göstergeleri kaldırılarak sadece yandaki yüzde ile ilerleme çubuğu gösterildi.
- **Planlı Duruş "Kasa Alma - Bırakma" Seçeneği:** ROB104, ROB105, ROB108, Flowform, N602 ve N603 hücreleri için "Kasa Alma - Bırakma" seçeneği planlı duruş alt türlerine eklendi (açıklama zorunluluğu yok).
- **ROB Hücreleri Arıza Kırılımı:** ROB104, ROB108 ve ROB109 hücreleri için `Mekanik`, `Elektrik`, `Akışkan`, `Belirsiz`, `Robot`, `Talaş Arabası Dolu`, `Manuel İşlemler`, `Kesici Takım Yok`, `Bor Yağı Bitti` arıza alt kategorileri oluşturuldu. Operasyonel kategoriler açıklama zorunluluğundan muaf tutuldu.
- **Öneri Kayıt Sistemi:** Ana form ekranına "Öneri Kayıt" butonu eklendi. Butona basılınca bağımsız hücre seçimi ve öneri girişinin yapıldığı `OneriKayitDialog` açılmakta ve veriler Supabase'deki `manuf_suggestions` tablosuna (yeni tablo) kaydedilmektedir.
- **Kaydetme Bugfix'i:** `calisan_makine_sayisi` ve `calisan_makine_aciklama` kolonları upsert edilirken sadece makine sayısı alanı bulunan hücreler için gönderilip diğerlerinde payload'dan çıkartılarak "schema cache" hatalarının önüne geçildi.
- **Wiki Güncellemeleri:** Tüm yapılan geliştirmeler ilgili wiki belgelerine (`uretim-formu.md`, `duruslar.md`, `db-tablolari.md`) işlenerek güncellendi.

## [2026-06-13] update | Pres Arıza "Hidrolik Yağ Sıcaklık Alarmı" Alt Kategorisi

**Yapılanlar:**
- `SUB_CATEGORIES["Pres"]` listesine `"Hidrolik Yağ Sıcaklık Alarmı"` seçeneği eklendi (Kalıp ile Diğer/Belirsiz arasına).
- `NO_DETAIL_REQUIRED` set'i oluşturuldu; bu seçenek seçildiğinde "Detaylı Açıklama" textarea'sı dialog'da gizlenir, kullanıcı direkt Tamam'a basabilir.
- Kayıt `[Hidrolik Yağ Sıcaklık Alarmı]` formatında saklanır — validasyon geçer, trailing space sorunu giderildi.
- Değişiklik yeri: `src/app/_components/DowntimeExplanationDialog.tsx`

---

## [2026-06-13] update | Quench Hücresi Günlük Veri Girişi ve Detaylı Performans Paneli (/dashboardy) Entegrasyonu

**Yapılanlar:**
- **Quench Hücresi Günlük Form Özelleştirmesi:** Saatlik dilimler yerine tek bir `"Günlük"` zaman dilimi satırı getirildi. Sütunlardan "Setup ve Ayar" kaldırıldı, "Takım Değişimi" ise "Rejim Bekleme" olarak adlandırıldı (alt tür ve açıklama zorunluluğu yok).
- **Duruş Validasyon Güncellemesi:** Zaman dilimi `"Günlük"` olan Quench hücresi için minimum girilmesi gereken duruş dakikası hesaplaması, 60 dakika yerine hafta içi 540 dakika, hafta sonu (Cuma/Cumartesi) 480 dakika üzerinden orantılanacak şekilde ölçeklendirildi. Tekil duruş giriş sınırları Quench için 540 dakikaya yükseltildi.
- **Detaylı Performans Paneli (`/dashboardy`):** Tarih aralığı seçici (Date Range Picker), hızlı preset butonları (Son 7 gün, Son 30 gün, Bu ay), kümülatif ilerleme çubuğu ve hücre bazlı gerçekleşen/hedef ilerlemesini gösteren satır tablosu entegre edildi.
- **N602 ve N603 Hücre Birleşimi:** `/dashboardy` sayfasında N602 ve N603 hücreleri birleştirilerek tek satırda "N602-N603 Hücresi" olarak, toplam hedef 2000 adet olacak şekilde gösterildi.
- **Arayüz Temizliği:** Dashboard üzerindeki sorumlu bilgileri, kritik seviye uyarıları, alt başlıklar ve açıklama metinleri kullanıcı geri bildirimlerine göre kaldırıldı.
- **Planlı Duruş "Kasa Alma - Bırakma" Seçeneği:** ROB104, ROB105, Flowform (F420), N602 ve N603 hücrelerinin planlı duruş alt kategorilerine "Kasa Alma - Bırakma" seçeneği eklendi. Bu seçenek seçildiğinde herhangi bir açıklama zorunluluğu bulunmamaktadır.
- **ROB Hücreleri Arıza Alt Kategorileri Özelleştirmesi:** ROB104, ROB108 ve ROB109 hücrelerinin arıza alt kategorileri görseldeki gibi özelleştirildi: `Mekanik`, `Elektrik`, `Akışkan`, `Belirsiz`, `Robot`, `Talaş Arabası Dolu`, `Manuel İşlemler`, `Kesici Takım Yok`, `Bor Yağı Bitti`. Teknik arızalarda açıklama zorunlu tutulurken, operasyonel arızalarda (Talaş Arabası Dolu, Manuel İşlemler, vb.) açıklama dialogu ve zorunluluğu kaldırıldı.

## [2026-06-12] update | ETM Hücresi Sütun Özelleştirmeleri, Açıklama Muafiyetleri ve Zaman Dilimleri Güncellemesi

**Yapılanlar:**
- **Çalışan Makine Sayısı Sütunu:** ETM, ROB104, ROB108 ve ROB109 hücreleri için `calisan_makine_sayisi` sütunu eklendi ve varsayılan limitler (2, 2, 6, 2) tanımlandı. Bu limitlerin altına düşüldüğünde zorunlu `calisan_makine_aciklama` validasyonu kuruldu.
- **ETM Arıza Özelleştirmesi:** ETM için teknik ve operasyonel arıza seçenekleri tek sütunda toplandı. Operasyonel duruşlar için açıklama dialog modalı devre dışı bırakıldı ve açıklama gereksinimi kaldırıldı.
- **ETM "Holder - Insert Değişim" Sütunu:** Takım Değişimi sütunu ETM'de "Holder - Insert Değişim" olarak adlandırıldı; 4 alt tür tanımlandı ve açıklama gereksinimi kaldırıldı. Veritabanına `takim_degisim_turu` sütunu eklenerek Excel export'a bağlandı.
- **Hazırlık (Setup ve Ayar) Sütunu:** ETM Hücresi'nde Setup ve Ayar sütunu **Hazırlık** olarak isimlendirildi. Seçenekler `"Parça Ölçüm"` ve `"Otomatik Mod Hazırlık"` olarak ayarlanıp açıklama dialogu ve zorunluluğu tamamen kaldırıldı.
- **Planlı Duruş "Parça Basmama Kararı" & "Kasa Alma - Bırakma" Muafiyetleri:** Tüm hücreler genelinde "Parça Basmama Kararı" seçeneği; ETM özelinde ise eklenen **"Kasa Alma - Bırakma"** seçeneği açıklama modalından ve zorunluluk kontrolünden muaf tutuldu. Artık sadece "Planlı Bakım" açıklaması zorunludur.
- **Hafta İçi Zaman Dilimleri & Vardiya Saatleri:** Hafta içi zaman dilimleri `08:00 - 17:00` olacak şekilde kaydırıldı, günlük vardiya süresi 540 dakika (9 saat) olarak güncellendi.
- **Excel Aktarım Entegrasyonu:** Tüm yeni eklenen sütunlar (`calisan_makine_sayisi`, `calisan_makine_aciklama`, `takim_degisim_turu`) Excel/API çıktısına dahil edildi.

## [2026-06-12] update | Hücre Sorumluları ve Pres Hücresi Duruş Kategorileri Revizyonu

**Yapılanlar:**
- **Sorumlu İsimleri Güncellendi:** Gökalp Atmaca yerine Yücel Kıroğlu, İbrahim Çetinbak yerine Çağrı Can Çolak, Halil Kesit yerine Ahmet Hakan Akın hücre sorumlusu olarak tanımlandı. `hucreler.md` wiki belgesi güncellendi.
- **Mola & Müşteri Duruş Seçenekleri:** Mola alt türleri `Çay` ve `Yemek` olarak; Müşteri duruş kodları `Utility Eksiği`, `Consumable Eksiği` ve `Operatör Bekleme` olarak güncellendi.
- **Duruş Kolon Dondurma (Sticky Sürgüsü):** Tablo kaydırıldığında Zaman Dilimi sütununun en solda sabit kalması ve arkasından geçen verilerin görünmemesi için CSS/Tailwind güncellemeleri yapıldı.
- **Pres Hücresi Arıza Kırılımı:** Pres Hücresi için arıza türü seçenekleri lokasyon bazlı olarak `Pres Öncesi`, `Pres` ve `Pres Sonrası` şeklinde yapılandırıldı. Açıklama dialog penceresinde bu bölgelere özel teknik alt kategoriler (Robot, Hadde, Akışkan, Kalıp vb.) listelenerek kaydedilen arıza açıklamasına ön ek olarak eklendi. `/ariza` sayfasındaki tür seçimi de bu mantığa adapte edildi.
- **Pres Hücresi Hazırlık (Setup) Kolonu:** Sadece Pres Hücresi için "Setup ve Ayar" sütunu **Hazırlık** olarak adlandırıldı. Altındaki seçenekler Pres-spesifik adımlarla değiştirildi. *Kaçak Kontrolü* dışındaki seçenekler için açıklama dialog penceresi tamamen devre dışı bırakıldı ve açıklama yazma zorunluluğu kaldırıldı.
- **Kalıp Montaj & Demontaj Kolonları:** Pres Hücresi'ndeki tekli "Takım Değişimi" sütunu gizlenerek, yan yana çalışan **Kalıp Demontaj** ve **Kalıp Montaj** sütunları eklendi. Veritabanına bu sütunlar için `kalip_demontaj`, `kalip_demontaj_turu`, `kalip_montaj`, `kalip_montaj_turu` alanları eklendi, yeni SQL migration dosyası oluşturuldu. Excel ve API export fonksiyonları bu yeni sütunları aktaracak şekilde genişletildi.
- İlgili tüm wiki dosyaları (`duruslar.md`, `db-tablolari.md`, `uretim-formu.md`, `index.md`) güncellendi ve `npx tsc --noEmit` ile projenin sorunsuz derlendiği doğrulandı.

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
