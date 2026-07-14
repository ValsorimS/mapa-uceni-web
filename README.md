# Mapa učení — statický web

Průvodce českým základním vzděláváním pro rodiče (1.–9. ročník ZŠ podle RVP ZV).
Web je plně statický: žádná databáze, žádný server — jen HTML, CSS a trocha JavaScriptu.

## Struktura projektu

```
├── data/            ← VEŠKERÝ OBSAH (upravujte tady)
│   ├── skills.json      103 témata učiva (id, ročník, předmět, texty, tipy)
│   ├── subjects.json    předměty a jejich barvy
│   ├── grades.json      ročníky, věk, úvodní texty
│   ├── laws.json        karty Zákony a pravidla
│   ├── calendar.json    kalendář školního roku
│   ├── glossary.json    slovníček zkratek
│   ├── synonyms.json    synonyma pro vyhledávání
│   └── popular.json     „nejhledanější“ odkazy na úvodu
├── assets/          zdrojové CSS, JS, favicon
├── build.js         generátor stránek
└── docs/            HOTOVÝ WEB (výstup buildu — tuto složku nasazujete)
```

## Jak upravit obsah

1. Upravte příslušný JSON v `data/` (např. přidejte téma do `skills.json` —
   zkopírujte existující záznam a změňte `id`, `r` = ročník, `p` = klíč předmětu).
2. Přegenerujte web:

```bash
node build.js
```

Nebo přes připravený npm skript:

```bash
npm run build
```

Generátor vytvoří ~120 stránek do `docs/`, včetně `sitemap.xml`. Vyžaduje jen
Node.js (bez závislostí, není potřeba `npm install`).

Lokální náhled:

```bash
npm run serve
```

## Adresa webu (důležité před nasazením)

Sitemap a canonical odkazy používají adresu nastavenou v `build.js`
(výchozí zástupná hodnota `https://www.mapa-uceni.cz`). Před ostrým nasazením
ji změňte na svou doménu:

```bash
SITE_URL=https://vase-domena.cz node build.js
```

## Nasazení zdarma

### GitHub Pages
1. Nahrajte projekt do repozitáře na GitHubu.
2. Přiložený GitHub Actions workflow automaticky vygeneruje `docs/` a publikuje web přes Pages.
3. Web poběží na `https://uzivatel.github.io/repozitar/`.
   (Relativní odkazy fungují i v podsložce; pro sitemap nastavte `SITE_URL` na tuto adresu.)

Pokud chcete přesnou canonical adresu pro SEO, nastavte v repozitáři proměnnou
`SITE_URL` v Settings → Secrets and variables → Actions → Variables.

### Netlify
1. Na app.netlify.com přetáhněte složku `docs/` myší — hotovo.
2. Nebo propojte repozitář; přiložený `netlify.toml` nastaví publikaci `docs/`
   a build příkaz automaticky.

### Vlastní doména
U obou služeb lze zdarma připojit vlastní doménu (např. `mapauceni.cz`) —
v nastavení přidáte doménu a u registrátora CNAME/A záznam podle návodu služby.

## Co web umí

- 103 témat s reálnými URL (`/dovednost/vyjmenovana-slova/`), meta popisky
  a canonical pro vyhledávače; sitemap.xml a robots.txt.
- Vyhledávání bez serveru (synonyma: „gympl“, „matika“, „lyžák“…), našeptávač.
- Checklist „zvládnuto“ s ukazatelem pokroku na ročníku — ukládá se
  v prohlížeči návštěvníka (localStorage, s bezpečným fallbackem).
- Funguje i otevřením `docs/index.html` z disku, bez webserveru.

## Údržba obsahu

- Termíny v `calendar.json` a pravidla v `laws.json` ověřujte proti
  cermat.cz, prihlaskynastredni.cz a msmt.gov.cz — mění se.
- Probíhá revize RVP ZV (náběh od září 2025) — texty u dotčených témat
  (druhý cizí jazyk, informatika…) časem aktualizujte.
