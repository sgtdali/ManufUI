# ManufUI Wiki Log

Append-only oturum logu. Her entry `## [YYYY-MM-DD] <tür> | <başlık>` formatındadır.
Grep ile son 5 girişi bul: `grep "^## \[" wiki/log.md | tail -5`

---

## [2026-06-21] update | Aksiyon Takip Düzeni, Sıralama, Sınırsız Alt Madde, Şifre Koruması, ROB109 Hedef ve ROB108 Çalışan Makine/Dinamik Hedef Entegrasyonu

**Kaynak:** Kullanıcı konuşması + `src/app/aksiyon-takip/page.tsx`, `src/app/aksiyon-takip/actions.ts`, `src/app/dashboard/page.tsx`, `src/app/page.tsx`, `src/app/_components/ProductionTable.tsx`, `src/lib/types.ts`, `supabase/migrations/20260621120000_allow_empty_action_priority.sql`

**Yapılanlar:**
- **Aksiyon Takip Arayüzü ve Veri Akışı:**
  - Sol hücre sidebar'ı tüm `BOLUMLER` (ölçüm hücreleri dahil) listesi için aktif edilerek filtrelenebilir hale getirildi.
  - Ayrı bir yeni aksiyon formu ve üst metrik kartları kaldırılarak aksiyon girişleri tablonun en altındaki inline satıra taşındı.
  - Sorumlu otomatik ataması kaldırıldı; sorumlu, termin, öncelik ve durum doğrudan tablo üzerinden inline olarak düzenlenebilir yapıldı.
  - Önceliğin (`priority`) boş başlayabilmesi için nullable yapan migration (`20260621120000_allow_empty_action_priority.sql`) veritabanına uygulandı.
  - CRUD işlemlerinin ardından tüm listenin yeniden çekilmesi yerine doğrudan local state güncellenerek yenilemesiz (optimistic/local update) akış sağlandı.
- **Düzenleme Şifre Koruması:**
  - Değişiklik yapmak için şifreli doğrulama (`"repkonopm"`) eklendi, `localStorage` ile kalıcılık sağlandı. Sayfa kilitliyken düzenleme alanlarına tıklanması durumunda click capture ile şifre modalının açılması ve şifre onaylanınca tıklanan işlemin kaldığı yerden devam etmesi akışı kuruldu. Header'a kilit durumunu gösteren ve manuel kilitleyen butonlar eklendi.
- **Dinamik Sıralama (Ağaç Yapısı):**
  - Sorumlu (A-Z/Z-A), Termin (Eski-Yeni), Öncelik (Yüksek-Düşük) ve Durum (Açık-Tamamlandı) sütunlarına 3 aşamalı tıklanabilir sıralama özelliği eklendi.
  - Sıralamanın parent-child (hiyerarşik) ilişkisini bozmaması için sıralama motoru rekürsif olarak çalışacak şekilde kodlandı.
- **Kompakt Tasarım, Sticky Layout ve Dikey Kaydırma:**
  - Sayfa başlığı (`h1`) fontu `text-2xl`'e düşürüldü, üst boşluklar ve paddingler daraltıldı. Ana sayfa dikey dolguları ve elemanlar arası boşluklar (`py-4 gap-4`) küçültüldü.
  - Sayfa başlığı ve filtreler bölümü dikeyde sabit tutulurken, tablo container'ı kendi içinde dikey scrollable (`overflow-y-auto max-h-[calc(100vh-240px)]`) yapıldı.
  - Tablo başlıkları (`thead`) sticky yapıldı; dikey scroll sırasında başlık alt çizgisinin kaybolmaması için th hücrelerine `inset box-shadow` uygulandı.
  - Sol sidebar sticky pozisyonu `xl:top-4` ve iç kaydırma alanı `max-h-[calc(100vh-140px)]` olarak kompakt tasarıma uyarlandı.
- **Sınırsız Alt Madde (Nested Sub-tasks) Desteği:**
  - Alt maddelerin altına da alt maddeler eklenmesini engelleyen sınırlama kaldırılarak sınırsız derinlikte alt madde desteği getirildi.
  - Alt maddelerin altındaki çocukları açıp kapatabilmek (collapsible) için chevron butonunun her seviyede aktif çalışması sağlandı, girintiler ve çizgiler otomatik hizalandı.
- **Dashboard Buton Entegrasyonu:**
  - `/dashboard` sayfası üst barına "Veri Takip" butonunun yanına, kullanıcıyı doğrudan `/aksiyon-takip` sayfasına yönlendiren tema uyumlu (teal renkli) buton eklendi.
- **ROB109 Hedef Özelleştirmesi:**
  - Günlük üretim giriş formunda (`/`) ROB109 Hücresi için hafta içi günlerde saatlik hedef üretim adetlerinin otomatik `20` olması ve salt okunur (`read-only`) olarak sınırlandırılması sağlandı.
- **ROB108 Çalışan Makine & Dinamik Hedef Sistemi:**
  - ROB108 Hücresi varsayılan aktif makine sayısı 6'dan 5'e düşürüldü.
  - ROB108 için makine sayısı 5'ten farklı (büyük veya küçük) girildiğinde `calisan_makine_aciklama` (açıklama) girilmesi zorunlu kılındı.
  - Çalışan makine sayısına göre o satırdaki hedef üretim adetini otomatik güncelleyen dinamik sistem kuruldu (5 makine -> 20, 4 -> 13, 3 -> 10, 2 -> 6, 1 -> 3, 0 -> 0).
  - DB'den veri yükleme (`applyRecordToForm`), client tarafında veri değişim olayları (`handleOpenCalisanMakineDialog`) ve arayüzdeki doğrulama butonları bu yeni kurallara uyarlandı.
- **Wiki Güncellemesi:** `wiki/systems/aksiyon-takip.md`, `wiki/systems/uretim-formu.md` ve `wiki/log.md` bu oturumdaki geliştirmelerle güncellendi.

---

## [2026-06-20] update | Aksiyon Takip Sayfası Eklendi

**Yapılanlar:**
- **Yeni Sayfa:** `/aksiyon-takip` rotasında hücre bazlı iş/aksiyon maddeleri takip sayfası oluşturuldu.
- **Veritabanı:** `manuf_action_items` tablosu tasarlandı. `parent_id` ile tek seviye alt madde desteği (self-referencing FK, ON DELETE CASCADE). `priority` ve `status` alanlarında CHECK constraint.
- **Arayüz:** Hücre/durum/öncelik filtreleri, metrik kartları (toplam/açık/tamamlandı), collapsible alt maddeler, inline durum değiştirme, gecikmiş termin uyarısı, silme onay dialogu.
- **Inline Termin Düzenleme:** Tablodaki termin sütunu tıklanabilir date input olarak güncellendi; mevcut kayıtlara sonradan termin tarihi girilebilir/değiştirilebilir hale getirildi.
- **RLS Policy:** `manuf_action_items` tablosuna `manuf_public_all` RLS policy eklendi.
- **Toplu Veri Girişi:** Pres Hücresi (34 madde), Flowform Hücresi (21 madde), N602 Hücresi (12 madde) ve N603 Hücresi (8 madde) için aksiyon maddeleri girildi.
- **Server Actions:** `loadActionItems`, `createActionItem`, `updateActionItem`, `deleteActionItem` CRUD operasyonları.
- **Wiki Dokümantasyonu:** `wiki/systems/aksiyon-takip.md` oluşturuldu, `wiki/index.md` güncellendi.

---

## [2026-06-18] update | Pres Kalıp Takibi, Final Ölçüm Entegrasyonu ve Saat Uzatmaları

**Yapılanlar:**
- **Kalıp Takip Sistemi (`/kalip-takip`):**
  - Pres Hücresi için bağımsız kalıp değişimlerini ve kümülatif parça adetlerini takip eden modern asenkron client-side ekran tasarlandı.
  - OEE form geçişleri için `FormHeader.tsx`'e sadece Pres Hücresi seçildiğinde görünen "Kalıp Takip" butonu eklendi.
  - Kalıp değişim hesaplamaları kalıp bazlı izole edilerek (araya giren farklı tip kalıpların sayacı kesmeyeceği şekilde) ve günlük OEE tablosundan (`manuf_production_rows`) dinamik olarak toplanarak kümülatif basım adetleri hesaplandı.
  - "Sökülen/Takılan" alanları yerine tek bir "Değiştirilen Kalıp" dropdown yapısı entegre edildi.
- **Final Ölçüm Entegrasyonu:**
  - Günlük üretim formuna (`/`) saatlik OEE tablosundan bağımsız 6 satırlı "Final Ölçüm Verisi" tablosu (Ölçülen, Red, Rework Adetleri) ve dinamik alt detay tabloları eklenerek sorumlu olarak **Zeynep Ece Toker** atandı.
  - Final ölçüm verileri için Supabase veritabanında 3 yeni tablo (`manuf_final_olcum_measurements`, `manuf_final_olcum_rejects`, `manuf_final_olcum_reworks`) oluşturularak asenkron kayıt yapısı bağlandı. OEE hücresi olmadığı için dashboard raporlamalarından muaf tutuldu.
- **Form Saat Uzatması & Dashboardy Yüzde Gösterimi:**
  - ROB104 ve ROB108 Hücreleri için Pazartesi-Perşembe 17:00-21:00 arası 4 ek slot forma dahil edildi.
  - `/dashboardy` sayfasındaki Genel İlerleme kartına kümülatif hedeflenen yüzde gösterimi `(%[Hedeflenen Yüzde])` parantez içinde eklendi.
- **Dokümantasyon Birleştirmesi:**
  - FF Preform Ölçüm ve Final Ölçüm sistemleri `wiki/systems/olcum-sistemleri.md` altında tek bir belgede birleştirildi. `wiki/systems/kalip-takip.md` ve `wiki/systems/uretim-formu.md` güncellendi.

---

## [2026-06-17] update | FF Preform Ölçüm, Performans Hedefleri, Duruş Pareto Analizi ve Arıza Filtreleme

**Yapılanlar:**
- **FF Preform Ölçüm Bölümü:**
  - Günlük üretim formuna (`/`) ROB108 ile Flowform arasına "FF Preform Ölçüm" seçeneği (Sorumlu: Zeynep Ece Toker) eklendi.
  - Saatlik OEE'den bağımsız 6 satırlı ölçüm tablosu, toplam adete göre dinamik olarak oluşan "Red/Rework Sebepleri" alt detay tabloları ve eksik detay girişi validasyonu kuruldu.
  - Ölçümler için Supabase veritabanında 3 yeni tablo (`manuf_ff_preform_measurements`, `manuf_ff_preform_rejects`, `manuf_ff_preform_reworks`) oluşturuldu.
- **Detaylı Performans Paneli (`/dashboardy`) ve Hedefler:**
  - Hücre bazında kümülatif hedef takibi başlangıç tarihleri özelleştirildi (Pres: 14.06, ROB108/Flowform: 15.06, ROB104/N602-N603: 16.06, ROB109/Quench: 17.06, ROB110-111/Fosfat: 18.06, Boya: 21.06).
  - Suudi Arabistan çalışma günleri baz alınarak (Pazar-Perşembe, Cuma/Cumartesi hariç) * 100 parça hesabı ile dinamik "Hedeflenen Miktar" sütunu eklendi.
- **Duruş Analiz Sayfası (`/durus-analiz`):**
  - Seçili tek bir OEE hücresine (FF Preform Ölçüm hariç) odaklanan dikey Pareto analiz ekranı kodlandı.
  - Başlangıç/bitiş tarihi filtreleme, duruş süre/adet/oran kırılımları, Pareto satırı seçildiğinde detaylı kayıtları listeleyen sağ panel ve veri kalitesi rozetleri geliştirildi. `wiki/systems/durus-analiz.md` belgelendirildi.
- **Arıza Detay Sayfası Filtreleri (`/ariza`):**
  - Tarih bazlı filtreleme (`startDate`, `endDate`) ve varsayılan başlangıç tarihi (`13.06.2026`) parametreleri eklendi, temizleme butonu entegre edildi.

---

## [2026-06-16] update | Dashboardy Hücre Sırası ve Varsayılan Tarih Güncellemesi

**Yapılanlar:**
- **ROB104 Satır Sırası:** `/dashboardy` sayfasındaki `DISPLAY_CELLS` dizisinde ROB104 Hücresi, ETM'nin altından Flowform ile N602-N603 arasına taşındı. Yeni sıra: Pres → ETM → ROB108 → Flowform → ROB104 → N602-N603 → ...
- **Varsayılan Başlangıç Tarihi:** Dashboardy sayfasının varsayılan başlangıç tarihi `2026-06-14`'ten `2026-06-13`'e güncellendi.

---

## [2026-06-15] update | ETM ve Flowform Hücreleri Uzatılmış Saat Dilimleri

**Yapılanlar:**
- **ETM ve Flowform Hücresi Saat Uzatması:** Pazartesi–Perşembe günleri bu iki hücre için `17:00–18:00`, `18:00–19:00`, `19:00–20:00`, `20:00–21:00` saat dilimleri forma eklendi. Cuma ve Cumartesi günleri eski davranış korundu (8 satır). Toplam Pazartesi–Perşembe: 13 satır.
- **`ETM_FLOWFORM_UZATILMIS_ZAMAN_DILIMLERI` sabiti** `src/lib/types.ts`'e eklendi; mevcut `ZAMAN_DILIMLERI` (9 slot) üzerine 4 ek slot spread ile oluşturuldu.
- **`getZamanDilimleriForCellAndDate` güncellendi:** ETM veya Flowform + hafta içi koşulunda uzatılmış listeyi döndürür; diğer hücreler ve Cuma/Cumartesi etkilenmez.
- **Slot merge fix (`applyRecordToForm`):** Eski 9-satırlık kayıtlar yüklenirken beklenen slot listesiyle merge edilir. DB'de olmayan yeni slotlar (17:00–21:00) boş satır olarak eklenir, mevcut veriler korunur. Böylece bugünkü girilmiş veriler kaybolmaz, yeni slotlar da forma dahil olur.

---

## [2026-06-14] update | Form Hedef & İlerici Validasyon, Öneri Kaydı ve Arayüz Sadelestirmeleri

**Yapılanlar:**
- **Kademeli Validasyon & Hedef Özelleştirmesi:**
  - Pres, ETM, ROB104 ve ROB108 hücrelerinde hafta içi hedef üretim adetleri otomatik `20` yapıldı ve read-only kılındı.
  - Gün ortasında kayıt alabilmek için kademeli validasyon (`validateTargetDowntime`) kurularak doğrulama sadece en son doldurulmuş satıra (`lastActiveIndex`) kadar sınırlandırıldı; gelecek saatler doğrulamadan muaf tutulur.
  - "Kalan Süre" rozetleri son aktif satıra kadar kırmızı (`Kalan X dk`) uyarı, gelecek satırlar için nötr gri olarak güncellendi.
- **Öneri Kayıt Sistemi:**
  - Ana forma bağımsız hücre seçimi ve öneri girişinin yapıldığı "Öneri Kayıt" butonu ve dialog modalı eklendi. Veriler Supabase'deki `manuf_suggestions` tablosuna kaydedilir hale getirildi.
- **Arayüz Temizliği ve Kısıtlamalar:**
  - `FormHeader.tsx` üzerindeki Excel'e Aktar ve Performans Paneli butonları kaldırıldı.
  - `/dashboardy` varsayılan aralığı `14.06.2026` - `09.07.2026` yapıldı, Genel İlerleme kartı başlığı ve yüzde çubuğu sadeleştirildi.
- **Hücre Bazlı Alt Türler ve Hata Düzenlemeleri:**
  - ROB104, ROB105, ROB108, Flowform, N602 ve N603 hücreleri planlı duruşlarına "Kasa Alma - Bırakma" (açıklama zorunluluğu yok) seçeneği eklendi.
  - ROB hücreleri arıza türlerine operasyonel alt kategoriler eklenerek açıklama yazma zorunluluklarından muaf tutuldular.
  - `calisan_makine_sayisi` upsert payload bug'ı giderildi.

---

## [2026-06-13] update | Quench Hücresi Günlük Girişi, Dashboardy Paneli ve Pres Arıza Seçeneği

**Yapılanlar:**
- **Quench Hücresi Günlük Form Özelleştirmesi:**
  - Saatlik dilimler yerine tek bir "Günlük" satırı getirildi. Setup kaldırıldı, Takım Değişimi "Rejim Bekleme" yapıldı.
  - Duruş validasyon limiti günlük vardiya bazında (hafta içi 540 dk, hafta sonu 480 dk) orantılanarak tekil giriş sınırı 540 dakikaya yükseltildi.
- **Detaylı Performans Paneli (`/dashboardy`) İlk Sürümü:**
  - Tarih Aralığı seçici, hızlı presetler, kümülatif ilerleme barı ve hücre bazlı hedef/gerçekleşen tablosu entegre edildi.
  - N602 ve N603 hücreleri tek satırda birleştirilerek gösterildi. Sorumlu bilgileri ve kritik uyarılar sadeleştirildi.
- **Pres Arıza Alt Türü:**
  - Pres arızalarına açıklama zorunluluğu olmayan "Hidrolik Yağ Sıcaklık Alarmı" alt kategorisi eklendi.
- **Hücre ve Duruş Kategorileri Özelleştirmesi:**
  - ROB104, ROB105, Flowform, N602 ve N603 planlı duruşlarına "Kasa Alma - Bırakma" muafiyeti getirildi.
  - ROB hücrelerine özel teknik (açıklama zorunlu) ve operasyonel (açıklama muaf) arıza alt kategorileri kuruldu.

---

## [2026-06-12] update | ETM & Pres Özelleştirmeleri, Vardiya Saati Değişimi ve Sorumlu Güncellemeleri

**Yapılanlar:**
- **ETM Hücresi Düzenlemeleri:**
  - Hazırlık ve "Holder - Insert Değişim" (alt türleri ile birlikte) sütun isimleri ve muafiyetleri entegre edildi. Excel/API exportlarına bağlandı.
- **Pres Hücresi Revizyonu:**
  - Duruş türleri lokasyon bazlı (`Pres Öncesi`, `Pres`, `Pres Sonrası`) arıza alt kategorilerine ayrıldı.
  - Setup kolonu **Hazırlık** yapıldı, Kaçak Kontrolü dışındakiler açıklama zorunluluğundan muaf kılındı.
  - Tekli takım değişimi gizlenip yan yana **Kalıp Montaj** ve **Kalıp Demontaj** sütunları (veritabanı alanları ve migration'ı ile birlikte) eklendi.
- **Vardiya ve Zaman Dilimi Güncellemesi:**
  - Hafta içi zaman dilimleri `08:00 - 17:00` olacak şekilde kaydırıldı, günlük vardiya süresi 540 dakikaya (9 saat) çıkarıldı.
- **Çalışan Makine Sayısı Sütunları:**
  - ETM, ROB104, ROB108, ROB109 hücrelerine makine sayısı kontrolü ve limit altı zorunlu açıklama kuralı eklendi.
- **Hücre Sorumluları ve Duruş Kodları:**
  - Sorumlular güncellendi (Yücel Kıroğlu, Çağrı Can Çolak, Ahmet Hakan Akın). Mola (Çay/Yemek) ve Müşteri (Utility/Consumable/Operatör) alt türleri revize edildi. Zaman dilimi kolonu donduruldu (sticky left).

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

---

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

---

## [2026-05-31] refactor | Proje Geneli Refactoring, Simülasyon Geliştirmeleri ve Karar Destek Entegrasyonları

**Yapılanlar:**
- **Atomik Bileşen Ayrıştırması (Refactoring):**
  - Dev boyutlu ana üretim formu (`src/app/page.tsx`) 4 bağımsız alt bileşene ayrıştırıldı: `FormHeader.tsx`, `ProductionTable.tsx`, `DowntimeExplanationDialog.tsx`, `OverwriteConfirmDialog.tsx`.
  - React-Hook-Form ve Select tipleri arasındaki TS uyumsuzlukları giderildi.
- **Planlama & Simülasyon İyileştirmeleri:**
  - Supabase arıza duruşları simülasyona çekilerek kapasite düşüşleri hesaplandı ve günlük tabloya tooltip detayları ile eklendi.
  - OEE kayıplarını analiz eden `LossAnalysisPanel` ve hedef tahminleri yapıp fazla mesai/pazar çalışması öneren `CampaignOptimizer` bileşenleri eklendi.
  - Simülasyon sayfasına 12 hücrenin tamamını planlama yeteneği ve Cuma/Cumartesi vardiya farkı simülasyonu eklendi.
- **Arıza Sistemi Modifikasyonları:**
  - Arıza alt türlerine `Kalite` tipi eklendi, ilgili wiki belgeleri güncellendi.
  - Arıza tablosunda (`/ariza`) statik arıza türleri dinamik `<select>` ile asenkron Supabase güncellemelerine bağlandı.

---

## [2026-05-28] setup | Wiki Sistemi Kurulumu, Arıza ve Planlama Analiz Dokümanları

**Yapılanlar:**
- **Wiki Kurulumu (`wiki/`):**
  - Proje kalıcı bilgi tabanı (`wiki/systems/`, `wiki/entities/`, `wiki/decisions/` ve `wiki/index.md`) oluşturuldu. `AGENTS.md` kuralları güncellendi.
  - Üretim Formu (`uretim-formu.md`), WIP Hesabı (`wip-hesabi.md`), Duruşlar (`duruslar.md`), Hücreler (`hucreler.md`) ve DB Tabloları (`db-tablolari.md`) ilk incelemeler sonrası dokümante edildi.
- **Arıza Sistemi İncelemesi:**
  - `/ariza` sayfasındaki mevcut yapı ve Supabase tabloları analiz edilerek `ariza-sistemi.md` oluşturuldu; reaktif yapıdan proaktif kestirimci yapıya geçiş hedefleri belirlendi.
- **Planlama Sistemi İncelemesi:**
  - `/schedule` sayfası simülasyon mantığı ve Pres kapasite hesapları incelenerek `planlama-sistemi.md` dokümante edildi.
