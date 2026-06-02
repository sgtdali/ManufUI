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
3. kullanıcı `wiki güncelle` dediğinde o oturum için wikideki ilgili bölümleri güncelle log.md'ye gerekli eklemeleri yap. Kullanıcı belirtmediği sürece ekleme yapma.

## Sayfa Formatı

Her wiki sayfası şu frontmatter ile başlar:

```
---
updated: YYYY-MM-DD
sources: [kaynak dosya listesi]
---
```

Sayfalar birbirine `[[sayfa-adı]]` değil standart markdown linki `[Sayfa Adı](../kategori/dosya.md)` ile bağlanır.



## Sayfa Güncelleme Kuralları

- LLM wiki sayfalarını yazar ve günceller; kullanıcı okur.
- Kaynak dosyalar (`raw/`) değiştirilmez, sadece okunur.
- Her güncelleme sonrası frontmatter'daki `updated` tarihini güncelle.
- Silinen veya taşınan sayfaları `wiki/index.md` ve `wiki/log.md`'ye yansıt.
