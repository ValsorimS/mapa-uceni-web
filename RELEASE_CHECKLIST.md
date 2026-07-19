# Release checklist

Před nasazením:

- Spustit `npm run check:release`.
- Při změně zdrojových odkazů spustit `npm run check:external`.
- Při vizuálních změnách spustit lokální server `npm run serve` nebo server z kořene publikace a potom `QA_BASE_URL=http://127.0.0.1:8080 npm run check:visual`.
- Ověřit, že RVP validátor hlásí `537 outcomes, 206 mapped skills`.
- Ověřit interní odkazy bez chyb.
- Ověřit, že `manifest.webmanifest` a `sw.js` existují v `docs/` i v kořeni repozitáře.
- Ověřit, že root `index.html` už nepřesměrovává na `docs/`.
- Zkontrolovat `/audit/`: strukturální audit 0 vysokých, 0 středních, 0 nízkých priorit a kvalitativní pokrytí 206/206.
- Zkontrolovat zdrojové bloky na `/rvp/`, `/cermat/`, `/zakony/`, `/situace/`, `/kdyz-dite-nestiha/` a `/o-mape/`.
- Zkontrolovat `/o-mape/`: musí obsahovat aktuální blok `Co je nové`.
- Zkontrolovat `/pruvodce/` a jeden detail průvodce podle rodičovského dotazu.
- Zkontrolovat živé URL po Pages deploymentu:
  - `/`
  - `/pomoc/`
  - `/audit/`
  - `/cermat/5-trida/`
  - `/dovednost/plynule-cteni-s-porozumenim/`
  - `/plan/`
  - `/manifest.webmanifest`
  - `/sw.js`
- Na mobilní šířce zkontrolovat hlavní navigaci, hledání, karty, Cermat dashboard a plán. Screenshoty z automatického průchodu jsou v `.qa/screenshots/`.
- Po deploymentu spustit vizuální QA i proti živým čistým URL: `QA_BASE_URL=https://valsorims.github.io/mapa-uceni-web npm run check:visual`.
- Zkontrolovat GitHub Actions: `Deploy GitHub Pages` musí doběhnout zeleně.

Poznámka: `SITE_URL` lze při buildu přepsat proměnnou prostředí. Výchozí hodnota míří na GitHub Pages.
