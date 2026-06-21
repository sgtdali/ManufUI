---
updated: 2026-06-21
sources: [src/app/aksiyon-takip/page.tsx, src/app/aksiyon-takip/actions.ts, supabase/migrations/20260620120000_create_manuf_action_items.sql, supabase/migrations/20260621120000_allow_empty_action_priority.sql]
---

# Aksiyon Takip Sistemi

`/aksiyon-takip` rotasında çalışan, hücre bazlı iş/aksiyon maddeleri takip sayfası. Ana maddeler ve tek seviye alt maddeler desteklenir.

## Veri Yapısı

Tek tablo: `manuf_action_items`

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | uuid (PK) | Otomatik `gen_random_uuid()` |
| `parent_id` | uuid (FK -> self) | `null` ise ana madde; dolu ise alt madde. `ON DELETE CASCADE` ile ana madde silinince alt maddeler de silinir |
| `cell` | text | Hücre adı (`BOLUMLER` listesinden; ölçüm hücreleri dahil) |
| `title` | text | Aksiyon başlığı / açıklaması |
| `assignee` | text | Sorumlu kişi. Otomatik atanmaz, boş başlayabilir ve tablodan düzenlenebilir |
| `due_date` | date | Termin tarihi (opsiyonel) |
| `priority` | text nullable | `Yüksek` / `Orta` / `Düşük` veya boş. `20260621120000_allow_empty_action_priority.sql` sonrası default yoktur ve `null` kabul edilir |
| `status` | text | `Açık` (varsayılan) / `Devam Ediyor` / `Tamamlandı` |
| `created_at` | timestamptz | Oluşturulma zamanı |
| `updated_at` | timestamptz | Son güncelleme zamanı |

**İndeksler:** `parent_id`, `cell`, `status`

## Arayüz Özellikleri

### Sol Hücre Sidebar
- Sayfanın solunda ClickUp benzeri hücre sidebar'ı bulunur.
- Sidebar `BOLUMLER` listesindeki tüm hücreleri gösterir; `FF Preform Ölçüm` ve `Final Ölçüm` dahil.
- `Tüm hücreler` seçiliyken tüm aksiyonlar listelenir ve tabloda `Hücre` sütunu görünür.
- Belirli bir hücre seçiliyken liste o hücreye filtrelenir ve tabloda `Hücre` sütunu gizlenir.
- Hücre satırlarında, durum/öncelik filtrelerine göre ana madde sayısı gösterilir.

### Filtreler
- **Durum filtresi:** Açık / Devam Ediyor / Tamamlandı
- **Öncelik filtresi:** Yüksek / Orta / Düşük
- **Temizle butonu:** Hücre, durum ve öncelik filtrelerini sıfırlar.

### Tablo Görünümü
Kolonlar: Başlık, Hücre (sadece `Tüm hücreler` görünümünde), Sorumlu, Termin, Öncelik, Durum, Aksiyonlar.

- **Ana maddeler** satır olarak listelenir.
- **Alt maddeler** ana madde genişletildiğinde indentli gösterilir.
- Alt maddesi olan ana maddelerin açma/kapama oku yeşil renkte görünür; alt maddesi olmayanlarda pasif gri kalır.
- **Sorumlu düzenleme:** Inline `<input>` ile doğrudan tablodan düzenlenir; boş bırakılabilir.
- **Termin tarihi düzenleme:** Inline `<input type="date">` ile doğrudan tablodan düzenlenir.
- **Öncelik düzenleme:** Inline `<select>` ile `Yüksek` / `Orta` / `Düşük` seçilir veya boş bırakılır.
- **Durum değiştirme:** Inline `<select>` ile `Açık` / `Devam Ediyor` / `Tamamlandı` seçilir.
- **Gecikmiş termin:** Tarihi geçmiş ve tamamlanmamış maddeler kırmızı kenarlık ve arka plan ile vurgulanır.
- **Tamamlanmış maddeler:** Başlık üstü çizili ve soluk renkte gösterilir.
- **Dinamik Sıralama:** Sorumlu, Termin, Öncelik ve Durum başlıkları tıklanabilir sıralama özelliğine sahiptir:
  - 1. tıklamada Artan (A-Z / Eskiden Yeniye)
  - 2. tıklamada Azalan (Z-A / Yeniden Eskiye)
  - 3. tıklamada Varsayılan (Sıralamasız)
  - Hiyerarşiyi korumak adına sıralama, ana maddeler kendi arasında ve alt maddeler her parent'ın altında kendi arasında olacak şekilde rekürsif çalışır.
  - Hover durumunda `ArrowUpDown` ikonu belirir. Aktif sıralamada `ArrowUp` veya `ArrowDown` yeşil renkte gösterilir.
- **Görsel Stil:** Tablo başlıkları `text-zinc-700 font-semibold` yapılarak belirginleştirilmiştir.

### Dikey Kaydırma ve Sticky Layout
- **Kompakt Düzen:** Sayfa dikey dolgusu `py-4`, grid ve right column boşlukları `gap-4` seviyesine indirilerek başlık yüksekliği azaltılmıştır (`h1` başlığı `text-2xl` ve header dolgusu `pb-3` yapılmıştır).
- **Sol Sidebar Sticky ve Yükseklik:** Sidebar sticky pozisyonu `xl:top-4` ve iç dikey kaydırma limiti `max-h-[calc(100vh-140px)]` olarak daraltılmıştır.
- **Scrollable Tablo Kutusu:** Tablo container'ına `overflow-y-auto max-h-[calc(100vh-240px)]` atanarak dikeyde kendi içinde kaydırılması sağlanmıştır. (Header daraltıldığı için tablo alanı `280px`'ten `240px`'e genişletilmiştir).
- **Sticky Tablo Başlığı (thead):** Tablo başlıkları (`thead`) `sticky top-0 z-10 bg-zinc-50` yapılmıştır, böylece tablo kendi container'ı içinde scroll edildikçe her zaman filtrelerin hemen altında yapışık kalır.
- **Sticky Alt Sınır Çizgisi:** Sınır çizgisinin dikey kaydırma sırasında kaybolmasını önlemek için `border-b-2 border-zinc-300` yerine her bir `th` etiketine `inset box-shadow` (`shadow-[inset_0_-2px_0_0_#d4d4d8]`) uygulanmıştır.

### Yeni Madde Ekleme
- Üstte ayrı bir "Yeni Aksiyon" formu yoktur.
- Sol sidebar'dan bir hücre seçildiğinde tablonun en altında boş ana madde satırı görünür.
- Bu satıra başlık yazılıp `Enter` basıldığında yeni ana madde seçili hücreye kaydedilir.
- Yeni aksiyonda sorumlu boş, termin boş, öncelik boş ve durum `Açık` başlar.
- Kayıt sonrası sayfa/listenin tamamı yeniden yüklenmez; yeni kayıt local state'e eklenir.

### Sınırsız Alt Madde (Nested Sub-tasks)
- Herhangi bir derinlikteki (ana veya alt fark etmeksizin) aksiyon satırındaki `+` butonuna basıldığında, ilgili maddenin hemen altında girintili (indent) boş alt madde satırı açılır.
- Alt madde başlığı yazılıp `Enter` basıldığında parent kaydın `id`'si ile alt madde olarak veritabanına kaydedilir.
- Alt maddelerin altındaki çocukları açıp kapatabilmek (collapsible) için chevron oku her hiyerarşi seviyesinde dinamik olarak çalışır.
- Boş alt madde satırı input dışına çıkıldığında kapanır.
- Kayıt sonrası sayfa/listenin tamamı yeniden yüklenmez; yeni alt kayıt local state'e eklenir.

### Silme ve Local State
- Çöp kutusu butonu ile madde silinir (tarayıcı `confirm` onayı ile).
- Ana madde silindiğinde alt maddeleri veritabanında cascade ile silinir; arayüzde de ilgili dal local state'ten çıkarılır.
- Ekleme, silme, sorumlu/termin/öncelik/durum güncelleme işlemlerinden sonra tüm liste tekrar çekilmez; sadece ilgili local state parçası güncellenir.

## Server Actions

| Fonksiyon | Açıklama |
|-----------|----------|
| `loadActionItems()` | Tüm aksiyonları `created_at DESC` sıralı çeker; ilk sayfa yüklemesinde kullanılır |
| `createActionItem(item)` | Yeni ana/alt madde oluşturur; `priority` boş ise `null` kaydedilir |
| `updateActionItem(id, updates)` | Madde alanlarını günceller, `updated_at` otomatik güncellenir |
| `deleteActionItem(id)` | Madde ve alt maddelerini siler |

## Navigasyon

- Sayfa üst başlığında **Forma dön** butonu ile `/` ana sayfaya dönüş yapılır.
- Üretim Dashboard (`/dashboard`) sayfasının üst menüsünde, "Veri Takip" butonunun hemen sağında yer alan **Aksiyon Takip** butonu ile bu sayfaya geçiş sağlanır.
