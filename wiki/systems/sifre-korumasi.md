---
updated: 2026-06-23
sources: [src/middleware.ts, src/app/login/page.tsx, src/app/dashboardy/page.tsx]
---

# Global Şifre Koruması

Uygulamanın tamamının yetkisiz erişimlerden korunması amacıyla devreye alınan genel şifreleme ve erişim kontrol mekanizması.

## Sistem Mimarisi

Sistem, Next.js Middleware katmanı üzerinden çerez (cookie) tabanlı yetkilendirme kontrolü yapar.

```mermaid
flowchart TD
    A[İstek Gönderildi] --> B{İstek Türü?}
    B -->|Statik Dosya / API / /login| C[Erişime İzin Ver]
    B -->|Diğer URL'ler| D{password_auth çerezi geçerli mi?}
    D -->|Evet| C
    D -->|Hayır| E{İstenen Sayfa /dashboardy mi?}
    E -->|Evet| F[Salt Okunur Modda Göster]
    E -->|Hayır| G[/login Sayfasına Yönlendir]
```

---

## 1. Giriş Sayfası (`/login`)
* **Tasarım**: Koyu arkaplan ve cam morfolojisi (glassmorphism) stiline uygun modern bir kart tasarımı kullanılmıştır.
* **Giriş Şifresi**: `rmk_hf901`
* **Giriş İşlemi**: Şifre doğru girildiğinde `password_auth=rmk_hf901` çerezi 30 gün geçerli olacak şekilde (`max-age=2592000`) tarayıcıya yazılır ve kullanıcı ana sayfaya yönlendirilir.
* **Performance Panel Butonu**: Giriş butonunun hemen yanında yer alır. Şifre girmeden doğrudan `/dashboardy` sayfasına (salt okunur modda) yönlendirme yapar.

---

## 2. Middleware Kontrolü (`src/middleware.ts`)
* Uygulamanın statik dosyaları (`_next`, resimler, ikonlar), API rotaları ve `/login` sayfası dışındaki tüm istekler yakalanır.
* `password_auth` çerezinin değeri `rmk_hf901` değilse ve istenen sayfa `/dashboardy` değilse, istek otomatik olarak `/login` sayfasına yönlendirilir (`307 Temporary Redirect`).
* Yönlendirme esnasında Supabase oturum çerezlerinin kaybolmaması için gelen response üzerindeki tüm çerezler redirect response'una kopyalanır.

---

## 3. Salt Okunur Performans Paneli (`/dashboardy`)
Şifre girmeden `/dashboardy` sayfasına erişildiğinde sayfa **salt okunur (read-only)** modda çalışır:
* **Çerez Kontrolü**: Sayfa açıldığında istemci tarafında `password_auth` çerezi denetlenir. Eğer çerez yoksa veya hatalıysa `isReadOnly` durumu `true` olur.
* **Gizlenen Alanlar**:
  - Sol üstteki **Form Sayfasına Dön** (`/` yönlendirmesi) butonu ve yanındaki çizgi gizlenir.
  - Sağ üstteki **Standart OEE Dashboard** (`/dashboard` yönlendirmesi) butonu gizlenir.
* **Pasifleştirilen Bağlantılar**:
  - Tablodaki hücre isimlerine tıklanarak açılan form yönlendirme linkleri (`Link href=/?bolum=...`) iptal edilerek sadece düz metin (`span`) olarak render edilir.

---

## İlgili Dosyalar

* [middleware.ts](../../src/middleware.ts) — Rota koruma katmanı
* [login/page.tsx](../../src/app/login/page.tsx) — Giriş ekranı
* [dashboardy/page.tsx](../../src/app/dashboardy/page.tsx) — Performans paneli
