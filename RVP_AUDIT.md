# RVP audit - Mapa uceni

Audit vychazi z aktualniho cistopisu RVP ZV 2023 z edu.gov.cz:

- zdrojova stranka: https://edu.gov.cz/rvp-zv-ramcovy-vzdelavaci-program-pro-zakladni-vzdelavani
- cistopis PDF: https://www.edu.cz/wp-content/uploads/2023/07/RVP_ZV_2023_cista_verze.pdf
- ucinnost aktualni upravy: 1. 9. 2023

## Dulezite omezeni

RVP ZV neurcuje ucivo presne po jednotlivych rocnikach. Pracuje hlavne s ocekavanymi vystupy pro 1. obdobi, 2. obdobi a 2. stupen. Rocnikove zarazeni na webu proto musi zustat oznacene jako orientacni a odvozene z bezne praxe a ze skolnich vzdelavacich programu.

## Soucasne pokryti webu

Web ma 103 temat. Aktualni rozlozeni podle predmetovych klicu:

- Cesky jazyk a literatura (`cj`): 20 temat
- Matematika (`m`): 30 temat
- Anglicky jazyk (`aj`): 3 temata
- Dalsi cizi jazyk (`ncj`): 1 tema
- Prvouka / Clovek a jeho svet (`prv`): 3 temata
- Prirodoveda (`pri`): 2 temata
- Vlastiveda (`vla`): 3 temata
- Informatika (`inf`): 2 temata
- Fyzika (`fy`): 4 temata
- Chemie (`ch`): 2 temata
- Prirodopis (`prir`): 4 temata
- Zemepis (`z`): 4 temata
- Dejepis (`d`): 4 temata
- Vychova k obcanstvi (`ov`): 3 temata
- Vychova ke zdravi (`vz`): 1 tema
- Hudebni vychova (`hv`): 3 temata
- Vytvarna vychova (`vv`): 3 temata
- Telesna vychova (`tv`): 4 temata
- Clovek a svet prace (`csp`): 4 temata
- Milniky a zkousky (`mil`): 3 temata

Rozlozeni podle rocniku:

- 1. rocnik: 11 temat
- 2. rocnik: 8 temat
- 3. rocnik: 9 temat
- 4. rocnik: 11 temat
- 5. rocnik: 12 temat
- 6. rocnik: 15 temat
- 7. rocnik: 13 temat
- 8. rocnik: 11 temat
- 9. rocnik: 13 temat

## Pokryti podle oblasti RVP

- Jazyk a jazykova komunikace: pokryto castecne. Cestina je silna, cizi jazyky jsou zatim jen orientacni.
- Matematika a jeji aplikace: pokryto nejlepe, ale chybi strojove vazby na konkretni vystupy RVP.
- Informatika: pokryto velmi strucne, RVP 2021/2023 ma v informatice vyrazne konkretnejsi obsah.
- Clovek a jeho svet: zaklad existuje, ale chybi systematicke mapovani na tematicke okruhy RVP.
- Clovek a spolecnost: zaklad existuje, ale dejepis a vychova k obcanstvi potrebuji rozpad na vystupy.
- Clovek a priroda: zaklad existuje, fyzika/chemie/prirodopis/zemepis jsou spise prehledove.
- Umeni a kultura: pokryto jen ramcove.
- Clovek a zdravi: vychova ke zdravi je vyrazne podpokryta.
- Clovek a svet prace: existuje zaklad, ale chybi tematicke okruhy a vystupy RVP.
- Doplnujici vzdelavaci obory: zatim nepokryto.
- Prurezova temata: zatim nejsou samostatne modelovana.

## Navrzena struktura dat

Pridany soubor `data/rvp.json` obsahuje:

- metadata zdroje RVP
- obdobi RVP: 1. obdobi, 2. obdobi, 2. stupen
- vzdelavaci oblasti a obory podle RVP
- vazby oboru RVP na soucasne `subjects.json` klice
- prefixy ocekavanych vystupu, napr. `M`, `ČJL`, `CJ`, `I`, `F`
- prurezova temata
- navrh budouciho tvaru konkretniho ocekavaneho vystupu

Tento krok jeste nedoplnuje vsechny konkretni ocekavane vystupy. Je to datova kostra, na kterou je pujde bezpecne doplnovat po oborech.

## Doporuceny dalsi postup

1. Pridat validacni skript, ktery zkontroluje, ze kazde `rvpRefs` v `skills.json` odkazuje na existujici vystup v `rvp.json`.
2. Rozsirit `skills.json` o pole `rvpRefs`, zatim bez zmeny UI.
3. Zacit oborem Matematika a jeji aplikace, protoze ma nejlepsi soucasne pokryti a vazby pujdou rychle overit.
4. Pokracovat Ceskym jazykem a literaturou.
5. Teprve potom doplnovat mene pokryte oblasti: Informatiku, Cizi jazyky, Clovek a zdravi, Clovek a svet prace a prurezova temata.
6. Az bude mapovani stabilni, pridat do webu stranku `Pokryti RVP`, ktera ukaze, co je pokryte, co chybi a ktere tema odpovida kteremu vystupu.

## Prakticky verdikt

Soucasny web je dobry rodicovsky prehled, ale neni jeste RVP katalog. Nejvetsi hodnota dalsi faze bude v tom, ze se z volneho textu `rvp` stane strojove kontrolovatelne mapovani. To umozni doplnovat obsah postupne a pritom mit jasny prehled, jestli se opravdu blizime k uplnemu pokryti RVP.
