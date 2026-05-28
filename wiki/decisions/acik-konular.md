---
updated: 2026-05-28
sources: [src/lib/types.ts, supabase/migrations/, src/app/schedule/]
---

# Açık Konular ve Bilinen Eksikler

Sistemin yarım kalan kısımları, belirsiz alanlar ve gelecekte ele alınması gereken konular.

## Dokümante Edilmemiş Duruş Kodları

**Öncelik: Yüksek**

Aşağıdaki duruş alt tür kodlarının anlamları kod içinde belirtilmemiş:

| Kod Grubu | Kodlar | Eksik Bilgi |
|-----------|--------|-------------|
| Arıza türü | E, A, M, O | Açılım nedir? (Elektrik? Alet? Mekanik? Organizasyon?) |
| Mola türü | M1, M2 | Hangi mola türleri? |
| Planlı duruş | P1, P2, P3 | Ne anlama geliyor? P3 açıklama gerektirmiyor, neden? |
| Setup türü | SA1, SA2 | Fark nedir? |
| Müşteri duruş | MKB1, MKB2, MKB3 | Açılımları neler? |

**Yapılacak**: Kullanıcıdan bu kodların açılımlarını öğrenip `wiki/systems/duruslar.md`'ye ekle.

## İlk Migration Dosyası Eksik

**Öncelik: Orta**

Repodaki en eski migration `20260413` tarihlidir ve sadece `ALTER TABLE` içerir. `manuf_production_records` ve `manuf_production_rows` tablolarını oluşturan `CREATE TABLE` migration'ı repoda yok.

- Muhtemelen Supabase Studio'da elle oluşturulmuş veya kaybolmuş.
- Şema inference `actions.ts` ve mevcut ALTER migration'larından yapılmıştır.
- **Yapılacak**: Eksik base table migration'larını `supabase db dump` ile oluştur ve repoya ekle.

## Excel Export Endpoint Dokümante Edilmemiş

**Öncelik: Düşük**

`/api/export` endpoint'i ana sayfada "Excel'e Aktar" butonu ile kullanılıyor ancak `src/app/api/export/` dizini incelenmedi. Nasıl çalıştığı, hangi alanları verdiği bilinmiyor.

**Yapılacak**: `src/app/api/export/route.ts` dosyasını oku ve bu sayfaya ekle.

## Arıza Türü Kodlarında Tooltip/Açıklama Yok

**Öncelik: Düşük**

Üretim formunda E/A/M/O kodları dropdown'da gösterilirken kullanıcıya ne anlama geldiği belirtilmiyor. Yalnızca kod görünüyor.

**Yapılacak**: `DURUS_KOLONLARI` içindeki `altTurler` dizisine `label` alanı eklenebilir.

## WIP Stok Hesabı ile Gerçek Üretim Arasındaki Bağlantı Eksik

**Öncelik: Yüksek**

`manuf_wip_stock` tablosu var, simülasyon `sameDayEtmReady` hesaplıyor, ancak:
- ETM ve sonrasındaki hücrelerin günlük üretim verisiyle WIP bağlantısı nasıl kurulacak?
- Her hücrenin üretim formu bağımsız doldurulduğunda WIP akışı nasıl güncellenecek?

**Yapılacak**: Overview sayfasının `actions.ts`'ini oku, WIP hesabının nasıl yapıldığını anla ve `wiki/systems/wip-hesabi.md`'ye ekle.

## Veri Takip Sayfası Dokümante Edilmemiş

**Öncelik: Orta**

`/veri-takip` sayfası `src/app/veri-takip/page.tsx` olarak var ama içeriği incelenmedi.

**Yapılacak**: Sayfayı oku ve `wiki/systems/` altında yeni sayfa oluştur.

## Dashboard Sayfası Dokümante Edilmemiş

**Öncelik: Orta**

`/dashboard` sayfası var ama bu wiki'de ele alınmadı.

**Yapılacak**: Dashboard sayfasını oku, hangi metrikleri gösterdiğini belgele.

## Cuma/Cumartesi Zaman Dilimi Tutarsızlığı

**Öncelik: Düşük**

- Vardiya sonu: Hafta içi 17:15, Cuma/Cumartesi 17:00 (15 dk fark)
- Schedule simülasyonunda Cuma/Cumartesi için ayrı zaman dilimi yoktur; simülasyon tek vardiya kalıbıyla çalışır.
- Üretim formunda Cuma/Cumartesi günleri için `CUMA_CUMARTESI_ZAMAN_DILIMLERI` kullanılır ama saat farklıdır.

**Yapılacak**: Bu tutarsızlığın kasıtlı mı yoksa hata mı olduğunu kullanıcıyla netleştir.
