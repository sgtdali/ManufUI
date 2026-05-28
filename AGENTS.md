<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# ManufUI Wiki Sistemi

Bu repo Karpathy LLM Wiki pattern'ını kullanır. `wiki/` klasörü LLM tarafından yazılıp güncellenen kalıcı bir bilgi tabanıdır. `raw/` klasörü ham kaynak belgelerdir.

## Dizin Yapısı

```
wiki/
  index.md          ← tüm sayfaların kataloğu (her oturumda ilk okunacak)
  log.md            ← append-only oturum logu
  systems/          ← sayfa mantığı, form davranışları, hesaplama kuralları
  entities/         ← hücreler, DB tabloları, sabitler
  decisions/        ← mimari kararlar ve açık konular
raw/
  chat-exports/     ← kullanıcının buraya yapıştırdığı ham konuşma/not dosyaları
```

## Her Oturum Başında

1. `wiki/index.md` oku — hangi sayfaların var olduğunu öğren.
2. `wiki/log.md` son 5 girişini oku — son ne yapıldığını öğren.
3. Görevle ilgili `wiki/systems/` veya `wiki/entities/` sayfalarını oku.
4. Kod değişikliği yapmadan önce ilgili kaynak dosyaları da oku.

## Sayfa Formatı

Her wiki sayfası şu frontmatter ile başlar:

```
---
updated: YYYY-MM-DD
sources: [kaynak dosya listesi]
---
```

Sayfalar birbirine `[[sayfa-adı]]` değil standart markdown linki `[Sayfa Adı](../kategori/dosya.md)` ile bağlanır.

## Ingest Akışı (Yeni Bilgi Gelince)

`raw/chat-exports/` veya başka bir kaynaktan yeni belge geldiğinde:

1. Belgeyi oku ve kullanıcıyla anahtar çıkarımları tartış.
2. İlgili `wiki/` sayfalarını güncelle (birden fazla sayfa etkilenebilir).
3. Sayfa yoksa oluştur, varsa revize et — çelişkileri not et.
4. `wiki/index.md` güncelle (yeni sayfa eklendiyse).
5. `wiki/log.md` sonuna yeni entry ekle:
   `## [YYYY-MM-DD] ingest | <kaynak adı>`

## Query Akışı (Soru Sorulunca)

1. `wiki/index.md` tara — konuyla ilgili sayfaları bul.
2. İlgili sayfaları oku.
3. Cevabı sentezle, kaynak sayfaları belirt.
4. Cevap tekrar kullanılabilir bir sentezse yeni wiki sayfası olarak kaydet.
5. `wiki/log.md` sonuna ekle:
   `## [YYYY-MM-DD] query | <soru özeti>`

## Lint (Wiki Sağlık Kontrolü)

Periyodik olarak şunları kontrol et:
- Sayfalar arası çelişkiler
- Yeni kaynaklarla geçersiz kalan eski iddialar
- Linksiz (orphan) sayfalar
- Önemli kavramlar için eksik sayfalar
- `wiki/index.md` ile gerçek dosya listesinin uyuşması

## Sayfa Güncelleme Kuralları

- LLM wiki sayfalarını yazar ve günceller; kullanıcı okur.
- Kaynak dosyalar (`raw/`) değiştirilmez, sadece okunur.
- Her güncelleme sonrası frontmatter'daki `updated` tarihini güncelle.
- Silinen veya taşınan sayfaları `wiki/index.md` ve `wiki/log.md`'ye yansıt.
