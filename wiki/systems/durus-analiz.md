---
updated: 2026-06-17
sources: [src/app/durus-analiz/page.tsx, src/lib/types.ts]
---

# Duruş Analiz Sayfası

`/durus-analiz` rotası, seçili tek hücre için duruş kayıtlarını operasyonel Pareto mantığıyla inceler. Amaç yönetim özeti veya aksiyon takip ekranı değil; kullanıcının belirli bir hücrede en çok süre kaybettiren duruş nedenlerini hızlıca görmesidir.

## Kapsam

- Aynı anda yalnızca bir hücre analiz edilir.
- Hücre seçicide `FF Preform Ölçüm` yer almaz.
- Tarih filtresi manuel `başlangıç` ve `bitiş` tarihi ile çalışır.
- Veri, `manuf_production_records` ve ilişkili `manuf_production_rows` kayıtlarından okunur.
- Duruş kolonları ve etiketleri `DURUS_KOLONLARI` listesinden türetilir.
- Sayfa salt okunur analiz ekranıdır; kayıt güncelleme veya aksiyon kapatma yapmaz.

## Hesaplama Mantığı

Her üretim satırı için `DURUS_KOLONLARI` içindeki duruş alanları taranır. Dakika değeri `0` üzerindeyse analiz detayına dahil edilir.

Gruplama anahtarı:

```text
duruş tipi + alt tür
```

Alt türü olmayan duruşlarda alt tür değeri `Alt tür yok` olarak gösterilir. Alt tür alanı olan ama seçilmemiş kayıtlar `Alt tür seçilmemiş` altında gruplanır.

## Pareto Tablosu

Pareto tablosu toplam duruş süresine göre azalan sıralanır.

| Alan | Anlamı |
|------|--------|
| Neden | Duruş tipi ve alt tür birleşimi |
| Süre | İlgili nedenin toplam duruş dakikası |
| Adet | İlgili nedenin kaç ayrı satırda kaydedildiği |
| Pay | İlgili nedenin toplam duruş süresi içindeki yüzdesi |
| Pareto | En büyük süre kaybına göre göreli bar uzunluğu |

Kümülatif yüzde hesaplanabilir durumda olsa da kullanıcı arayüzünde gösterilmez.

## Seçili Neden Kayıtları

Pareto satırına tıklandığında sağ panelde o nedene ait ham kayıtlar gösterilir:

- Tarih
- Zaman dilimi
- Duruş süresi
- Açıklama

Açıklaması olmayan kayıtlar `Açıklama eksik` rozetiyle işaretlenir. Bu yalnızca veri kalitesi sinyalidir; kayıt üzerinde zorunluluk veya validasyon uygulamaz.

## Varsayılanlar ve Hata Durumları

- Varsayılan tarih aralığı içinde bulunulan ayın ilk günü ile bugündür.
- Varsayılan hücre, `FF Preform Ölçüm` hariç ilk hücredir.
- Başlangıç tarihi bitiş tarihinden büyükse sorgu çalıştırılmaz ve uyarı gösterilir.
- Seçili hücre/tarih aralığında duruş yoksa boş durum mesajı gösterilir.

## İlgili Sayfalar

- [Duruşlar](duruslar.md) — duruş kolonları, alt türler ve validasyon kuralları
- [DB Tabloları](../entities/db-tablolari.md) — üretim kayıtları ve satır verileri
