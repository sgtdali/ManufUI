---
updated: 2026-06-30
sources: [src/app/aksiyon-takip/page.tsx, src/app/aksiyon-takip/actions.ts, src/app/aksiyon-takip/_components/*, src/app/auth/callback/route.ts, src/middleware.ts, supabase/migrations/20260620120000_create_manuf_action_items.sql, supabase/migrations/20260621120000_allow_empty_action_priority.sql, supabase/migrations/20260628144000_create_manuf_assignees.sql, supabase/migrations/20260628160000_complete_planner_sync.sql, supabase/migrations/20260630120000_add_action_item_description_dates_comments.sql]
---

# Aksiyon Takip Sistemi

`/aksiyon-takip` rotasında çalışan, hücre bazlı iş/aksiyon maddeleri takip sayfası. Sınırsız derinlikte alt madde, açıklama/yorum akışı, e-posta ile sorumlu girişi ve Excel dışa aktarım destekler. Arayüzü Claude (Anthropic) tarzı açık renkli, sade ve premium bir temaya uyarlandırılmıştır.

## Veri Yapısı

İki tablo: `manuf_action_items` ve `manuf_action_item_comments`.

### `manuf_action_items`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | uuid (PK) | Otomatik `gen_random_uuid()` |
| `parent_id` | uuid (FK -> self) | `null` ise ana madde; dolu ise alt madde. `ON DELETE CASCADE` ile ana madde silinince alt maddeler de silinir. Derinlik sınırsızdır (alt maddenin altına alt madde eklenebilir) |
| `cell` | text | Hücre adı (`BOLUMLER` listesinden; ölçüm hücreleri dahil) |
| `title` | text | Aksiyon başlığı |
| `description` | text nullable | Detaylı açıklama (20260630120000 migration ile eklendi). Detay modalından düzenlenir |
| `assignee` | text | Sorumlu kişi adı. Otomatik atanmaz, boş başlayabilir |
| `assignee_email` | text | Sorumlu e-posta adresi. `manuf_assignees` tablosundan otomatik eşleştirilir; sorumlunun kendi maddesini düzenleyebilmesi (magic-link yetkilendirmesi) bu alana göre çalışır |
| `planner_task_id` | text | Microsoft Planner görev ID'si. Power Automate callback ile geri yazılır |
| `start_date` | date nullable | Başlangıç tarihi. **Varsayılan: oluşturma günü** (DB seviyesinde `default current_date`, ayrıca client tarafında da `createActionItem` içinde bugünün tarihi gönderilir). Daha sonra elle değiştirilebilir |
| `due_date` | date nullable | Termin tarihi |
| `priority` | text nullable | `Yüksek` / `Orta` / `Düşük` veya boş |
| `status` | text | `Açık` (varsayılan) / `Devam Ediyor` / `Tamamlandı` |
| `created_at` | timestamptz | Oluşturulma zamanı — detay modalında gösterilir |
| `updated_at` | timestamptz | Son güncelleme zamanı — her `updateActionItem` çağrısı sunucudan güncel değeri döndürür ve hem `items` state'ine hem açık detay modalına yazılır, böylece UI her zaman gerçek zamanı gösterir |

**İndeksler:** `parent_id`, `cell`, `status`

### `manuf_action_item_comments`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | uuid (PK) | |
| `action_item_id` | uuid (FK -> manuf_action_items, ON DELETE CASCADE) | |
| `author` | text | Yorumu yazan kişinin adı (serbest metin; sistemde gerçek kullanıcı girişi/kimlik olmadığı için elle girilir, `localStorage`'da `action_commenter_name` ile hatırlanır) |
| `comment` | text | Yorum metni |
| `created_at` | timestamptz | |

Not: Otomatik alan-bazlı audit/aktivite log'u (kim hangi alanı ne zaman değiştirdi) **yoktur** — sadece manuel yorumlar ve `created_at`/`updated_at` zaman damgaları mevcuttur.

## Yetkilendirme Modeli

Üç katmanlı, sayfaya özel bir yetkilendirme sistemi vardır (sitenin geri kalanındaki tek paylaşılan şifre modelinden farklıdır):

### 1. Site geneli şifre duvarının dışında
`src/middleware.ts`'te `/aksiyon-takip` ve `/auth` yolları, sitenin tamamını koruyan `password_auth` çerez kontrolünden muaf tutulmuştur — bu sayfa şifresiz görüntülenebilir. **Sadece bu sayfa ve `/auth/callback` etkilenir, diğer tüm sayfalar eskisi gibi şifreli kalır.**

### 2. Admin şifresi (`"repkonopm"`)
- Header'daki "Düzenleme Kilitli" butonuna basılınca şifre modalı açılır. Doğru şifre (`"repkonopm"`) ile `isAuthorized` `true` olur ve `localStorage`'da (`action_items_authorized`) kalıcı olur.
- Tam yetki: tüm maddelerde her alanı düzenleme + sorumlu atama + silme + alt madde ekleme.

### 3. Magic-link (e-posta ile sorumlu girişi)
- `AssigneeAuthControl` bileşeni Supabase Auth `signInWithOtp` ile e-posta girişi sağlar (gerçek şifre yok, kullanıcı e-postasına gelen linke tıklayarak giriş yapar).
- Giriş, Supabase oturum çerezinde kalıcıdır — kullanıcı tarayıcıyı kapatıp tekrar açsa bile tekrar giriş yapmasına gerek yoktur (çıkış yapana veya çerezler silinene kadar).
- `src/app/auth/callback/route.ts` Supabase'in OTP code exchange'ini yapıp `/aksiyon-takip`'e geri yönlendirir.
- **Satır bazlı yetki (`canEditItem`):** Giriş yapan kullanıcının e-postası, bir maddenin `assignee_email` alanıyla eşleşiyorsa o madde için `rowEditable = true` olur. Sorumlu sadece **kendi** maddelerinde: başlık, açıklama, durum, öncelik, başlangıç/termin tarihi düzenleyebilir ve yorum ekleyebilir. Sorumlu atama, silme ve alt madde ekleme **admin şifresine** tabidir (sorumluya açılmaz).
- **Otomatik tam yetki (admin e-postaları):** `ADMIN_EMAILS` listesindeki adresler (`tayfun.vural@repkon.com.tr`, `baris.sahinoglu@repkon.com.tr`, `ahmet.akin@repkon.com.tr`) ile magic-link girişi yapıldığında, sanki `"repkonopm"` girilmiş gibi otomatik tam yetki (`isFullyAuthorized`) verilir — şifre girmelerine gerek yoktur. Header'daki kilit butonu bu kullanıcılar için pasif gösterilir (kilitlenemez, sadece çıkış yaparak yetki bırakılabilir).

### E-posta gönderimi (SMTP) durumu
- Magic-link e-postaları Supabase'in **varsayılan (built-in) mailer**'ı ile gönderiliyor — bu test amaçlı bir servistir ve **saatte ~2 e-posta** ile sınırlıdır.
- Office365 SMTP ve Resend denendi: Office365 `SmtpClientAuthenticationDisabled` (kiracı genelinde SMTP AUTH kapalı) nedeniyle 504 Gateway Timeout verdi; Resend ise domain doğrulanmadığı için (yalnızca hesap sahibinin kendi e-postasına gönderim yapabiliyor — `onboarding@resend.dev` sandbox kısıtı) 403 reddetti. Gmail SMTP (App Password ile) çalıştı ama kurumsal alıcılarda spam/junk klasörüne düşüyor (kişisel gmail adresinden "Repkon" adıyla gönderim, phishing paterni gibi algılanıyor).
- **Karar:** Şimdilik varsayılan Supabase mailer ile devam ediliyor. Kalıcı çözüm (Resend + `repkon.com.tr` domain doğrulaması veya Office365 SMTP AUTH açılması) IT/DNS erişimi gerektirdiği için ileriye bırakıldı.
- **Supabase URL Configuration:** Site URL `https://manuf-ui.vercel.app/aksiyon-takip`. Redirect URLs listesinde hem `https://manuf-ui.vercel.app/auth/callback` (production) hem `http://localhost:3000/auth/callback` (yerel geliştirme) kayıtlıdır — ikisi birlikte durabilir, çakışmaz.
- **E-posta şablonları:** "Confirm signup" (ilk giriş) ve "Magic Link" (sonraki girişler) şablonları Repkon markalı Türkçe HTML ile özelleştirilebilir (Dashboard → Authentication → Email Templates). Kod tarafında saklı değildir, sadece Supabase Dashboard ayarıdır.

## Arayüz Özellikleri

### Sol Hücre Sidebar
- `CellSidebar` bileşeni, `BOLUMLER` listesindeki tüm hücreleri (ölçüm hücreleri dahil) gösterir.
- `Tüm hücreler` seçiliyken tüm aksiyonlar listelenir ve tabloda `Hücre` sütunu görünür; belirli bir hücre seçiliyken liste filtrelenir ve `Hücre` sütunu gizlenir.
- Hücre sayaçları **sadece üst seviye (parent_id'siz) maddeleri** sayar — alt maddeler (subtask) dahil değildir. Excel export ise tüm ağacı (üst + alt maddeler) içerir, bu yüzden export'taki toplam satır sayısı sidebar sayacından fazla olabilir (bu normaldir, hata değildir).

### Filtreler
- **Ara:** Başlık ve açıklama metninde serbest arama. Eşleşen bir alt madde varsa, ağaç bütünlüğünü korumak için üst maddesi de otomatik gösterilir (`filterBySearch` ataları dahil eder).
- **Durum filtresi:** Açık / Devam Ediyor / Tamamlandı
- **Öncelik filtresi:** Yüksek / Orta / Düşük
- **Sorumlu filtresi:** Veritabanındaki tüm benzersiz `assignee` değerlerinden oluşan dinamik liste
- **Temizle butonu:** Tüm filtreleri (hücre, durum, öncelik, sorumlu, arama) sıfırlar.
- **Dışa Aktar (Excel) butonu:** O an filtrelenmiş/sıralanmış görünümü (`flattenTree` ile düzleştirilmiş, alt maddeler dahil tüm ağaç) gerçek `.xlsx` dosyası olarak indirir — ExcelJS ile (CSV değil), koyu yeşil başlık satırı + zebra desenli satırlarla, projedeki diğer Excel exportlarıyla (`duruslar`, üretim verileri) aynı görsel standartta.

### Tablo Görünümü
Kolonlar: Başlık, Hücre (sadece `Tüm hücreler` görünümünde), Sorumlu, **Başlangıç**, Termin, Öncelik, Durum, Aksiyonlar (Detay/Yorum, Alt madde ekle, Sil).

- **Ana maddeler** satır olarak listelenir; **alt maddeler** (sınırsız derinlik) genişletildiğinde indentli gösterilir.
- **Sorumlu düzenleme:** `AssigneeAutocomplete` ile `manuf_assignees`'ten otomatik tamamlamalı seçim; admin şifresine tabidir.
- **Başlangıç/Termin tarihi:** Inline `<input type="date">`, satır bazlı yetkiye (`canEditItem`) tabidir.
- **Öncelik/Durum düzenleme:** Artık native `<select>` değil, özel `Select.tsx` bileşeni (bkz. aşağıdaki "Özel Dropdown Bileşeni" bölümü) — koyu temayla tam uyumlu, satır bazlı yetkiye tabidir.
- **Detay/Yorum butonu (`MessageSquare` ikonu):** `ActionDetailModal`'ı açar — açıklama düzenleme, yorum listesi/ekleme, oluşturulma/güncellenme zaman damgaları.
- **Planner Senkron Rozeti, gecikmiş termin vurgusu, tamamlanmış madde stilizasyonu, dinamik sıralama (Sorumlu/Termin/Öncelik/Durum), sticky thead, dikey scrollable tablo container'ı:** önceki davranış korunmuştur (bkz. eski sürüm notları altta).

### Detay Modalı (`ActionDetailModal`)
- Başlık + hücre + oluşturulma/güncellenme zaman damgaları üstte.
- **Açıklama:** Çok satırlı `textarea`, satır bazlı yetkiye tabidir (`onBlur` ile kaydedilir).
- **Yorumlar/Aktivite:** Kronolojik yorum listesi (yazar + zaman + metin) ve yeni yorum ekleme formu (ad + metin). Yorum ekleme herkese açıktır (yetki kontrolüne tabi değildir) — sadece görüntülenen maddeye bağlıdır.
- Yorumlar lazy-load edilir: modal her açıldığında `loadComments(itemId)` çağrılır.

### Yeni Madde Ekleme ve Sıralama
- Tablonun en altındaki inline satırdan ana madde, her satırın `+` butonundan alt madde eklenir (admin şifresine tabidir).
- **Yeni eklenen madde artık listenin EN ALTINA gider** (önceki davranış: en üste gidiyordu). `setItems(prev => [...prev, yeni])` ile sağlanır — `prepend` değil `append`.
- `start_date` belirtilmezse otomatik bugünün tarihi atanır (hem DB default hem client default).

### Özel Dropdown Bileşeni (`Select.tsx`)
- Native `<select>`/`<option>` elemanlarının açılır liste rengi (gri zemin, mavi seçili satır) tarayıcı/OS tarafından çiziliyor ve CSS ile tema renklerine çekilemiyordu.
- Bunun yerine `_components/Select.tsx` adında, `value`/`onChange`/`options` API'sine sahip, tamamen div/button tabanlı özel bir dropdown bileşeni yazıldı (tıklama dışına basınca kapanma, seçili satıda `Check` ikonu, emerald vurgulu seçili stil, koyu temalı scrollbar).
- Şu an kullanıldığı yerler: üstteki Durum/Öncelik/Sorumlu filtreleri (`page.tsx`) ve her satırdaki Öncelik/Durum düzenleme alanları (`ActionRow.tsx`). `triggerClassName` prop'u ile çağıran taraf, native select'teki gibi farklı görsel stiller (renkli badge, sınırlı genişlik vb.) uygulayabilir.

## Claude Tarzı Açık Tema (Claude Theme)

Bu sayfa, kullanıcı talebiyle Claude (Anthropic) tarzı açık renkli, sade ve premium bir tasarıma uyarlandı.

- **Palet:** Sayfa zemin rengi `#F8F8F6` (kırık krem/bej), yan menü (sidebar) ve filtre panelleri `#EFEEEB` (sıcak bej), tablo satırları, modallar, arama girdileri ve açılır pencereler `#FFFFFF` (saf beyaz) olarak tanımlanmıştır. Birincil metinler `#191919` (koyu füme/charcoal) ve ikincil metinler `#6B6964` (gri) tonlarındadır.
- **Yazı Tipi (Font):** **`Anthropic Serif`** (Lora ve Newsreader web fontları Google Fonts üzerinden yüklenerek entegre edilmiştir. Georgia ve Times New Roman sistem fontları fallback olarak tanımlıdır).
- **Yazı Boyutları (+2px Artış):** Sayfanın genel okunabilirliğini artırmak amacıyla tüm metin hiyerarşisi 2 piksel büyütülmüştür:
  - Ana başlıklar: 24px ➔ **26px** (`text-2xl`)
  - Aksiyon başlıkları, arama ve yorum alanları: 14px ➔ **16px** (`text-sm`)
  - Filtre etiketleri, tablo başlıkları, dropdown girdileri, sorumlu ve tarih alanları: 12px ➔ **14px** (`text-xs`)
  - Detay modal başlığı: 16px ➔ **18px** (`text-base`)
  - Zaman damgaları ve küçük meta bilgileri: 9px/10px/11px ➔ **11px/12px/13px**
- **Rozetler ve Durum Renkleri:** Durum butonları (`Açık`, `Devam Ediyor`, `Tamamlandı`) ve öncelik etiketleri açık renk paleti üzerinde net okunabilmeleri için koyu yeşil, koyu mavi, koyu amber tonlarına dönüştürülmüştür.
- **Özel Dropdown Seçim Rengi:** Açılır listelerdeki (`Select.tsx` ve `AssigneeAutocomplete.tsx`) seçili satırın yeşil arka planı ve yeşil yazı rengi, yeni Claude renk paletiyle uyumlu olacak şekilde sıcak toprak/terracotta tonuna (`rgba(217, 119, 83, 0.12)` arka plan ve `#C25E3B` yazı rengi) uyarlandı.
- **Özel scrollbar:** Tablo, sol sidebar, detay modalı ve sorumlu dropdown'ındaki kaydırma çubukları açık renk paletine uyarlandı (D0CFC9 thumb / F8F8F6 track).
- **Kalem İkonu Kaldırıldı:** Metinlere tıklayınca düzenleme modu doğrudan açıldığı için başlıkların yanındaki/altındaki kalem (Pencil) ikonu arayüzü kalabalıktan arındırmak amacıyla kaldırılmıştır.
- **Aşamalı Güncelleme:** `page.tsx` içerisine enjekte edilen CSS `<style>` bloğu üzerinden tüm alt bileşenlerin (Sidebar, ActionRow, vb.) Tailwind renk sınıfları cascading yöntemiyle ezilmiştir; bu sayede alt bileşen kodlarında mantıksal bir kırılma yaratılmadan görsel tema tam uyumlu hale getirilmiştir.

## Server Actions (`actions.ts`)

| Fonksiyon | Açıklama |
|-----------|----------|
| `loadActionItems()` | Tüm aksiyonları `created_at DESC` sıralı çeker |
| `loadAssignees()` | `manuf_assignees` listesini çeker (autocomplete + sorumlu filtresi için) |
| `createActionItem(item)` | Yeni ana/alt madde oluşturur; `start_date` verilmezse bugünün tarihi atanır |
| `updateActionItem(id, updates)` | Madde alanlarını günceller, `updated_at`'i sunucuda set eder ve **güncel satırı `select().single()` ile geri döndürür** (önceden sadece `{success:true}` dönüyordu — bu yüzden UI'daki `updated_at` görüntüsü yenilenmiyordu, düzeltildi) |
| `deleteActionItem(id)` | Madde ve alt maddelerini siler |
| `loadComments(actionItemId)` | Bir maddenin yorumlarını `created_at ASC` sıralı çeker |
| `addComment(actionItemId, author, comment)` | Yeni yorum ekler |

## Navigasyon

- Sayfa üst başlığında **Forma dön** butonu ile `/` ana sayfaya dönüş yapılır.
- Üretim Dashboard (`/dashboard`) sayfasının üst menüsünde **Aksiyon Takip** butonu ile bu sayfaya geçiş sağlanır.
- Header'da ayrıca **Sorumlu Girişi** (magic-link) kontrolü ve admin şifre kilidi butonu yer alır.
