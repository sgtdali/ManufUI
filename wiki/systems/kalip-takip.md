---
updated: 2026-06-18
sources: [src/app/actions.ts, src/app/kalip-takip/page.tsx, supabase/migrations/20260618124000_create_manuf_press_mold_changes.sql]
---

# Kalıp Takip Sistemi

Bu sayfa, Pres Hücresi kalıp değişimlerinin kayıt edilmesi, parça adetlerinin kronolojik hesabı ve o kalıp ile bir sonraki değişime kadar basılan parça adetlerinin takibini sağlayan mantık ve iş akışını belgeler.

## Genel Bakış

Sistem, Pres Hücresinde yapılan kalıp değişimlerini kronolojik bir zaman tünelinde listeler. Her bir kalıp değişim kaydının yanında:
* **Üretim Adeti:** O değişim ile kronolojik olarak bir sonraki değişim arasında (yani o kalıp takılıyken) üretilmiş toplam parça adeti (`uretim_adeti`) gösterilir.

Bu sayede kalıplarla kaç adet parça basıldığı ve kalıp ömürleri doğrudan takip edilebilir.

## Veri Akışı ve Senkronizasyon

Kalıp değişim kayıtları ve üretim sayıları şu şekilde yönetilmektedir:
1. **Manuel Kalıp Değişimi Girişi:**
   - Kalıp değişim kaydı (Değiştirilen Kalıp, Tarih, Saat, Açıklama) **sadece** `/kalip-takip` sayfasındaki "Manuel Değişim Ekle" arayüzü ile kullanıcı tarafından elle girilmektedir. Günlük OEE üretim formlarından otomatik kalıp değişimi kaydı çekilmemektedir.
   - Değiştirilen kalıp alanı, Pres Hücresi formunda yer alan kalıplardan oluşan bir açılır liste (Dropdown) üzerinden seçilmektedir: **"HFP Erkek BCE", "HFP Erkek UpS", "HFP Dişi", "HIP Ringler", "HIP Erkek"**.
2. **Üretim Sayılarının Otomatik Alınması:**
   - Değişimler arasındaki ve sonrasındaki parça basım adetleri ise günlük OEE üretim formlarındaki (`manuf_production_rows`) Pres Hücresi verilerinden (`uretim_adeti`) otomatik olarak alınarak kümülatif olarak toplanır.

## Hesaplama Algoritması

Değişim sonrası parça adetleri asenkron olarak Server Action (`loadPressMoldChanges`) katmanında hesaplanır:
1. `manuf_production_records` ve `manuf_production_rows` tablolarından Pres Hücresine ait tüm geçmiş saatlik üretim kayıtları (`uretim_adeti`) çekilir.
2. Tüm üretim kayıtları kronolojik olarak `(tarih, sira_no)` bazında sıralanarak düz bir diziye (`flatProd`) dönüştürülür.
3. Her bir kalıp değişimi için:
   - Bu değişimden sonra başlayıp, **aynı kalıp tipine ait bir sonraki kalıp değişimi kaydına kadar** olan aralıktaki üretim satırları taranarak kümülatif parça adeti hesaplanır. Farklı bir kalıp değişimi girilmesi bu hesabı kesmez; sadece aynı kalıbın yeni bir değişimi girildiğinde sayaç kilitlenir.

## Veritabanı Tablosu

Kayıtlar `public.manuf_press_mold_changes` tablosunda tutulur:
- `tarih` (DATE) ve `sira_no` (INTEGER) alanları üzerinde UNIQUE constraint tanımlıdır. Dolayısıyla aynı tarih ve zaman diliminde sadece tek bir kalıp değişimi kaydı bulunabilir.

## Arayüz Özellikleri

- **Özet Kartları:** Toplam değişim sayısı, en son takılan kalıp bilgisi ve son kalıpla basılan toplam parça adeti anlık gösterilir.
- **Dinamik Zaman Dilimleri:** Manuel kayıt girişinde seçilen tarihin Saudi Arabistan hafta sonu (Cuma/Cumartesi) olup olmamasına göre formdaki zaman dilimi dropdown'ı otomatik şekillenir.
- **Kayıt Silme:** İstenen kalıp değişim kaydı zaman tüneli tablosundan doğrudan silinebilir.
- **FormHeader Geçiş Butonu:** "Kalıp Takip" butonu ana form ekranında sadece Bölüm seçimi **"Pres Hücresi"** olduğunda görünür olur; diğer bölümler seçildiğinde gizlenir.
