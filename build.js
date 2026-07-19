#!/usr/bin/env node
/* Mapa učení — generátor statického webu.
 * Použití:  node build.js
 * Výstup:   docs/  (připraveno pro GitHub Pages i Netlify)
 * Adresu webu pro sitemap a canonical nastavte níže nebo přes SITE_URL=... node build.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const SITE_URL = (process.env.SITE_URL || "https://www.mapa-uceni.cz").replace(/\/+$/, "");
const OUT = path.join(__dirname, "docs");

/* ---------- data ---------- */
const J = f => JSON.parse(fs.readFileSync(path.join(__dirname, "data", f), "utf8"));
const SKILLS = J("skills.json");
const SUBJ = J("subjects.json");
const GRADES = J("grades.json");
const LAWS = J("laws.json");
const CAL = J("calendar.json");
const GLOSS = J("glossary.json");
const SYN = J("synonyms.json");
const POPULAR = J("popular.json");
const RVP = J("rvp.json");
const CERMAT = J("cermat.json");
const SUPP = J("supplementary.json");
const PPATHS = J("parent_paths.json");
const SITUATIONS = J("situations.json");

/* ---------- pomocné ---------- */
const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const slugify = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const byId = id => SKILLS.find(s => s.id === id);
const RVP_OUT = Object.fromEntries((RVP.outcomes || []).map(o => [o.id, o]));
const RVP_PERIOD = Object.fromEntries((RVP.periods || []).map(p => [p.id, p]));
const RVP_FIELD = {};
RVP.areas.forEach(area => area.fields.forEach(field => {
  RVP_FIELD[field.id] = { ...field, area };
}));

/* unikátní slugy z názvů */
const used = new Set();
SKILLS.forEach(s => {
  let sl = slugify(s.t);
  if (used.has(sl)) sl = sl + "-" + s.r + "-rocnik";
  if (used.has(sl)) sl = s.id;
  used.add(sl);
  s.slug = sl;
});
const skillUrl = s => "dovednost/" + s.slug + "/";
const cermatExamUrl = exam => `cermat/${exam.slug}/`;
const cermatSubjectUrl = (exam, subject) => `${cermatExamUrl(exam)}${subject.id}/`;
const supplementaryUrl = field => `doplnujici-obory/${field.id}/`;
const parentPathUrl = parentPath => `rodicovske-cesty/${parentPath.id}/`;
const situationUrl = situation => `situace/${situation.id}/`;

const CERMAT_BY_SKILL = new Map();
CERMAT.exams.forEach(exam => exam.subjects.forEach(subject => subject.groups.forEach(group => {
  group.skillIds.forEach(skillId => {
    if (!CERMAT_BY_SKILL.has(skillId)) CERMAT_BY_SKILL.set(skillId, []);
    CERMAT_BY_SKILL.get(skillId).push({ exam, subject, group });
  });
})));
const CERMAT_EXAM_BY_GRADE = Object.fromEntries(CERMAT.exams.map(exam => [Number(exam.id), exam]));
const CERMAT_BADGES_BY_SKILL = new Map();
CERMAT_BY_SKILL.forEach((refs, skillId) => {
  const exams = Array.from(new Map(refs.map(ref => [ref.exam.id, ref.exam])).values())
    .sort((a, b) => Number(a.id) - Number(b.id));
  CERMAT_BADGES_BY_SKILL.set(skillId, exams);
});
const SUPP_BY_SKILL = new Map();
SUPP.fields.forEach(field => field.relatedSkillIds.forEach(skillId => {
  if (!SUPP_BY_SKILL.has(skillId)) SUPP_BY_SKILL.set(skillId, []);
  SUPP_BY_SKILL.get(skillId).push(field);
}));

const cut = (s, n = 155) => {
  s = s.replace(/\s+/g, " ").trim();
  return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
};

function write(rel, html) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html, "utf8");
}

/* ---------- layout ---------- */
function layout(o) {
  // o: {path ("" | "rocnik/3/" ...), title, desc, nav, body, extraHead, extraScript}
  const depth = o.path === "" ? 0 : o.path.split("/").filter(Boolean).length;
  const R = "../".repeat(depth); // relativní prefix ke kořeni
  const canonical = SITE_URL + "/" + o.path;
  const navLink = (href, key, label) =>
    `<a href="${R}${href}"${o.nav === key ? ' class="active"' : ""}>${label}</a>`;
  return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<link rel="icon" type="image/svg+xml" href="${R}assets/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@500;600;700;800&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Caveat:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${R}assets/style.css">
${o.extraHead || ""}
</head>
<body>
<header>
  <div class="wrap hbar">
    <a class="logo" href="${R || "./"}" aria-label="Mapa učení — domů">
      <span class="logo-mark" aria-hidden="true"></span>
      <span><b>Mapa učení</b><small>1.–9. ročník ZŠ</small></span>
    </a>
    <nav>
      ${navLink("", "home", "Ročníky")}
      ${navLink("predmety/", "predmety", "Předměty")}
      ${navLink("doplnujici-obory/", "doplnujici", "Doplňující")}
      ${navLink("cermat/", "cermat", "Cermat")}
      ${navLink("milniky/", "milniky", "Milníky")}
      ${navLink("pomoc/", "pomoc", "Pomoc")}
      ${navLink("kalendar/", "kalendar", "Kalendář")}
      ${navLink("zakony/", "zakony", "Zákony a pravidla")}
      ${navLink("rvp/", "rvp", "RVP")}
      ${navLink("slovnicek/", "slovnicek", "Slovníček")}
      ${navLink("o-mape/", "o-mape", "O mapě")}
    </nav>
    <form class="hsearch" action="${R}hledat/" method="get" role="search">
      <input type="search" name="q" placeholder="Hledat učivo…" aria-label="Hledat učivo">
      <button type="submit" aria-label="Hledat">→</button>
    </form>
  </div>
</header>
<main class="wrap">
${o.body}
</main>
<footer>
  <div class="wrap fin">
    <p><b>Ročníky jsou orientační, ne termíny.</b> RVP ZV stanoví očekávané výstupy pro 1. období (1.–3. ročník), 2. období (4.–5. ročník) a pro 2. stupeň — konkrétní rozvržení do ročníků si každá škola určuje ve svém školním vzdělávacím programu (ŠVP). Vaše škola tedy může některá témata probírat dříve či později.</p>
    <p>Mapa učení je nezávislý informační projekt pro rodiče. Není oficiálním zdrojem MŠMT ani náhradou konzultace s učitelem. Právní informace mají orientační povahu; závazné je znění zákona č. 561/2004 Sb. (školský zákon) a prováděcích vyhlášek.</p>
  </div>
</footer>
<script src="${R}assets/app.js" defer></script>
${o.extraScript || ""}
</body>
</html>`;
}

/* ---------- komponenty ---------- */
function skillCard(s, R) {
  const su = SUBJ[s.p];
  const cermatBadges = CERMAT_BADGES_BY_SKILL.get(s.id) || [];
  const cermatLabel = cermatBadges.length > 1
    ? `Cermat ${cermatBadges.map(exam => esc(exam.id)).join("+")}`
    : cermatBadges.map(exam => `Cermat ${esc(exam.id)}`).join("");
  return `<a class="card" data-skill-id="${s.id}" href="${R}${skillUrl(s)}">
    <span class="tag" style="background:${su.c}">${su.n}</span>
    <h3>${s.t}</h3>
    <p>${s.co.slice(0, s.co.indexOf(".") + 1)}</p>
    ${cermatLabel ? `<span class="cermat-badges"><span>${cermatLabel}</span></span>` : ""}
    <span class="meta">${s.r}. ročník · ${GRADES[s.r].age}</span>
  </a>`;
}

function cermatGradePanel(r, R) {
  const exam = CERMAT_EXAM_BY_GRADE[r];
  if (!exam) return "";
  const subjects = exam.subjects.map(subject => {
    const skillCount = new Set(subject.groups.flatMap(group => group.skillIds)).size;
    return `<a href="${R}${cermatSubjectUrl(exam, subject)}">
      <span>${esc(subject.shortTitle)}</span>
      <b>${skillCount} navázaných témat</b>
    </a>`;
  }).join("");
  return `<section class="grade-cermat">
    <div>
      <span class="pill ${r === 5 ? "p1" : "p2"}">Cermat ${esc(exam.label)}</span>
      <h2>Připravujete se na přijímačky?</h2>
      <p>${esc(exam.desc)}</p>
    </div>
    <div class="grade-cermat-links">${subjects}</div>
  </section>`;
}

function cermatDashboardHTML(exam, R, showPrint = true) {
  const subjectCards = exam.subjects.map(subject => {
    const skillIds = Array.from(new Set(subject.groups.flatMap(group => group.skillIds)));
    const groups = subject.groups.map(group => `<a data-dashboard-group
      data-key="${esc(exam.id)}:${esc(subject.id)}:${esc(group.id)}"
      data-skill-ids="${esc(group.skillIds.join(","))}"
      href="${R}${cermatSubjectUrl(exam, subject)}#${esc(group.id)}">
        <span>${esc(group.title)}</span><b data-state-label>Nezařazeno</b>
      </a>`).join("");
    return `<article class="dashboard-subject" data-dashboard-subject data-skill-ids="${esc(skillIds.join(","))}">
      <div class="dashboard-title">
        <span class="tag" style="background:${SUBJ[subject.subjectKey].c}">${esc(subject.shortTitle)}</span>
        <h3>${esc(subject.title)}</h3>
      </div>
      <div class="dashboard-counts">
        <span data-count="done">0 umím</span>
        <span data-count="practice">0 trénuju</span>
        <span data-count="problem">0 problém</span>
      </div>
      <div class="dashboard-progress"><span>Zvládnuto <b>0</b> z ${skillIds.length} témat</span><i><em style="width:0%"></em></i></div>
      <a class="continue" data-continue href="${R}${cermatSubjectUrl(exam, subject)}">Pokračovat v přípravě →</a>
      <div class="dashboard-groups">${groups}</div>
    </article>`;
  }).join("");
  return `<section class="cermat-dashboard" data-cermat-dashboard>
    <div class="sec-head"><h2>Stav přípravy</h2><span class="cnt">Souhrn podle uložených okruhů</span>${showPrint ? '<button class="printbtn" type="button" data-print>Vytisknout plán</button>' : ""}</div>
    <div class="dashboard-subjects">${subjectCards}</div>
  </section>`;
}

function cermatPrintPlanHTML(exam) {
  const phases = [
    {
      title: "1. týden: jisté body",
      desc: "Krátké denní bloky na témata, kde se dají rychle získat body a snížit nervozita.",
      pick: subject => subject.groups.slice(0, 2)
    },
    {
      title: "2. týden: časté pasti",
      desc: "Rozebrat okruhy, kde nejčastěji vznikají opakované chyby nebo ztráta času.",
      pick: subject => subject.groups.slice(2, 4)
    },
    {
      title: "3. týden: celý test na čas",
      desc: "Vyzkoušet test nanečisto a chyby hned roztřídit podle příčiny.",
      pick: subject => subject.groups.slice(0, 1).concat(subject.groups.slice(-1))
    },
    {
      title: "4. týden: doladění problémů",
      desc: "Vrátit se hlavně k okruhům označeným jako Problém nebo Trénuju.",
      pick: subject => subject.groups.slice(1, 3)
    }
  ];
  const rows = phases.map(phase => `<article class="print-week">
    <h3>${esc(phase.title)}</h3>
    <p>${esc(phase.desc)}</p>
    <div class="print-subjects">${exam.subjects.map(subject => `<div>
      <b>${esc(subject.shortTitle)}</b>
      <ul>${phase.pick(subject).map(group => `<li><label><input type="checkbox"> ${esc(group.title)}</label></li>`).join("")}</ul>
    </div>`).join("")}</div>
  </article>`).join("");
  return `<section class="print-plan">
    <div class="sec-head"><h2>Tiskový plán na 4 týdny</h2><span class="cnt">Zaškrtněte po rozboru chyb</span></div>
    <div class="print-weeks">${rows}</div>
  </section>`;
}

function cermatReviewTargets(subject) {
  const math = {
    zadani: ["slovni-logicke", "data-logika", "algebra-rovnice", "jednotky-data"],
    pocitani: ["cisla-operace", "zlomky-desetinna"],
    jednotky: ["jednotky-data", "pomery-procenta", "geometrie-mereni", "geometrie"],
    postup: ["slovni-logicke", "algebra-rovnice", "data-logika"],
    cas: subject.groups.slice(0, 2).map(group => group.id)
  };
  const czech = {
    text: ["cteni-porozumeni"],
    pravopis: ["pravopis", "pravopis-tvaroslovi"],
    mluvnice: ["tvaroslovi-skladba", "pravopis-tvaroslovi", "slovni-zasoba", "slovni-zasoba-vyznam"],
    skladba: ["tvaroslovi-skladba", "skladba"],
    cas: ["cteni-porozumeni", "literatura-sloh"]
  };
  const raw = subject.subjectKey === "m" ? math : czech;
  return Object.fromEntries(Object.entries(raw).map(([cause, ids]) => [
    cause,
    ids.filter(id => subject.groups.some(group => group.id === id))
  ]));
}

function cermatReviewHTML(exam, R) {
  const causeLabels = [
    ["zadani", "Nerozuměl/a zadání"],
    ["pocitani", "Početní chyba"],
    ["jednotky", "Jednotky, graf nebo obrázek"],
    ["postup", "Nevěděl/a, jak začít"],
    ["text", "Odpověď nebyla podle textu"],
    ["pravopis", "Pravopis bez odůvodnění"],
    ["mluvnice", "Slovní druhy, tvary nebo význam"],
    ["skladba", "Věta, souvětí, čárky"],
    ["cas", "Nestihl/a nebo spěchal/a"]
  ];
  const subjectOptions = exam.subjects.map(subject =>
    `<option value="${esc(subject.id)}">${esc(subject.title)}</option>`).join("");
  const causeInputs = causeLabels.map(([id, label]) => {
    const targets = exam.subjects.map(subject => {
      const groups = cermatReviewTargets(subject)[id] || [];
      return groups.map(groupId => `${subject.id}:${groupId}`).join(",");
    }).filter(Boolean).join(",");
    return `<label><input type="checkbox" name="cause" value="${esc(id)}" data-targets="${esc(targets)}"> ${esc(label)}</label>`;
  }).join("");
  const allGroups = exam.subjects.flatMap(subject => subject.groups.map(group =>
    `<a data-review-group="${esc(subject.id)}:${esc(group.id)}" href="${R}${cermatSubjectUrl(exam, subject)}#${esc(group.id)}">${esc(subject.shortTitle)} · ${esc(group.title)}</a>`
  )).join("");
  return `<section class="test-review" data-test-review data-exam-id="${esc(exam.id)}">
    <div class="sec-head"><h2>Rozbor testu nanečisto</h2><span class="cnt">Ukládá se jen v tomto prohlížeči</span></div>
    <form class="review-form">
      <div class="review-grid">
        <label>Datum <input type="date" name="date"></label>
        <label>Předmět <select name="subject">${subjectOptions}</select></label>
        <label>Body <input type="number" name="points" min="0" max="50" step="1" placeholder="0–50"></label>
        <label>Čas <select name="time"><option value="stihl">Stihl/a</option><option value="tesne">Těsně</option><option value="nestihl">Nestihl/a</option></select></label>
      </div>
      <fieldset><legend>Hlavní příčiny chyb</legend><div class="cause-list">${causeInputs}</div></fieldset>
      <label class="review-note">Poznámka <textarea name="note" rows="3" placeholder="Co se opakovalo, co příště zkusit jinak…"></textarea></label>
      <div class="review-actions"><button type="submit">Zapsat rozbor</button><span data-review-feedback></span></div>
    </form>
    <div class="review-recommendations"><b>Doporučené okruhy</b><div data-review-recommendations>${allGroups}</div></div>
    <div class="review-history"><div class="sec-head"><h3>Historie testů</h3><span data-review-trend></span></div><div data-review-history></div></div>
  </section>`;
}

function cermatGroupLinks(subject, groupIds) {
  return groupIds.map(id => subject.groups.find(group => group.id === id)).filter(Boolean);
}

function cermatDiagnostics(subject) {
  const math = [
    {
      title: "Nerozumím zadání",
      symptom: "Dítě umí počítat, ale odpoví na jinou otázku nebo přeskočí podmínku.",
      groupIds: ["slovni-logicke", "data-logika", "jednotky-data", "algebra-rovnice"],
      fix: "Začít podtržením údajů, zakroužkováním otázky a jednou větou říct, co se má zjistit."
    },
    {
      title: "Počítám špatně",
      symptom: "Postup je zhruba správně, body mizí na znaménkách, závorkách, dělení nebo přepisu čísla.",
      groupIds: ["cisla-operace", "zlomky-desetinna"],
      fix: "Trénovat krátké sady na přesnost a po výpočtu povinně udělat odhad, jestli výsledek dává smysl."
    },
    {
      title: "Pletu jednotky a části celku",
      symptom: "Výsledek vyjde číselně, ale v metrech místo centimetrů, v obvodu místo obsahu nebo se špatným základem procent.",
      groupIds: ["jednotky-data", "pomery-procenta", "geometrie-mereni", "geometrie"],
      fix: "Psát jednotky už během výpočtu a před každou úlohou si označit základ, celek nebo měřený útvar."
    },
    {
      title: "Nevím, jak začít delší úlohu",
      symptom: "Dítě dlouho čte, ale nezačne kreslit, zapisovat možnosti ani stavět rovnici.",
      groupIds: ["slovni-logicke", "algebra-rovnice", "data-logika"],
      fix: "Nutit první krok: náčrt, tabulka možností nebo pojmenování neznámé. Výpočet přijde až potom."
    },
    {
      title: "Nestíhám",
      symptom: "Jednotlivé typy úloh zvládá, ale u celého testu zůstávají lehké body na konci.",
      groupIds: subject.groups.slice(0, 2).map(group => group.id),
      fix: "Nejdřív sbírat rychlé jisté body, těžké úlohy označit a vrátit se k nim až ve druhém průchodu."
    }
  ];
  const czech = [
    {
      title: "Odpovídám podle dojmu, ne podle textu",
      symptom: "Odpověď zní rozumně, ale v ukázce pro ni není opora.",
      groupIds: ["cteni-porozumeni"],
      fix: "U každé odpovědi chtít důkaz přímo v textu: větu, slovo nebo část ukázky."
    },
    {
      title: "Neumím odůvodnit pravopis",
      symptom: "Dítě často trefí správnou možnost, ale neumí říct proč, takže pod tlakem chybuje.",
      groupIds: ["pravopis", "pravopis-tvaroslovi"],
      fix: "Trénovat méně slov, ale vždy s pravidlem: druh slova, vzor, podmět, předpona nebo koncovka."
    },
    {
      title: "Pletu slovní druhy a tvary",
      symptom: "Chyba vzniká tím, že dítě nečte slovo v konkrétní větě.",
      groupIds: ["tvaroslovi-skladba", "pravopis-tvaroslovi"],
      fix: "Určovat podle použití ve větě, ne podle izolovaného slova nebo pocitu."
    },
    {
      title: "Ztrácím se ve větě a souvětí",
      symptom: "Problém dělají čárky, vztahy mezi větami, podmět, přísudek nebo vedlejší věty.",
      groupIds: ["tvaroslovi-skladba", "skladba"],
      fix: "Nejdřív najít slovesa a základní skladební dvojice, až potom řešit čárky a typy vět."
    },
    {
      title: "Nestíhám nebo přeskakuju zadání",
      symptom: "Body mizí na přehlédnutém slově, negaci, počtu správných odpovědí nebo rychlém čtení ukázky.",
      groupIds: ["cteni-porozumeni", "literatura-sloh"],
      fix: "Trénovat krátké ukázky s časem a po každé chybě pojmenovat, jestli šlo o pravidlo, čtení nebo spěch."
    }
  ];
  return subject.subjectKey === "m" ? math : czech;
}

function cermatDiagnosticsHTML(subject) {
  const items = cermatDiagnostics(subject);
  return `<section class="section cermat-diagnostics">
    <div class="sec-head"><h2>Kde ztrácím body?</h2><span class="cnt">Diagnostika podle chyby</span></div>
    <div class="diagnostic-grid">${items.map(item => {
      const links = cermatGroupLinks(subject, item.groupIds);
      return `<article class="diagnostic-card">
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.symptom)}</p>
        <div class="diagnostic-links">${links.map(group => `<a href="#${esc(group.id)}">${esc(group.title)}</a>`).join("")}</div>
        <p class="diagnostic-fix">${esc(item.fix)}</p>
      </article>`;
    }).join("")}</div>
  </section>`;
}

function cermatPlanHTML(subject) {
  const mathSteps = [
    ["Jisté body nejdřív", "Zpevnit počítání, základní postupy a typy úloh, kde se dají získat rychlé body bez dlouhého přemýšlení."],
    ["Časté pasti", "Projít úlohy, kde se chybuje kvůli jednotkám, základu procent, obrázku, slovnímu zadání nebo delšímu postupu."],
    ["Celý test na čas", "Teprve potom řešit celé testy. Po každém testu rozdělit chyby podle příčiny a vrátit je do okruhů výše."]
  ];
  const czechSteps = [
    ["Text a pravopis nejdřív", "Získat jistotu v práci s ukázkou a v pravopisných pravidlech, protože dávají hodně bodů a dobře se trénují po malých dávkách."],
    ["Mluvnice v kontextu", "Procvičit slovní druhy, tvary, skladbu a význam slov vždy ve větě nebo textu, ne jako izolované poučky."],
    ["Ukázky a celý test na čas", "Spojit literaturu, sloh a čtení zadání do celého testu. Po testu určit, jestli chyba vznikla pravidlem, čtením nebo spěchem."]
  ];
  const steps = subject.subjectKey === "m" ? mathSteps : czechSteps;
  const groupChunks = [
    subject.groups.slice(0, 2),
    subject.groups.slice(2, 4),
    subject.groups.slice(4)
  ];
  return `<section class="section cermat-plan">
    <div class="sec-head"><h2>Doporučené pořadí přípravy</h2><span class="cnt">Od jistoty k testu nanečisto</span></div>
    <div class="plan-steps">${steps.map((step, i) => `<article class="plan-step">
      <span>${i + 1}</span>
      <h3>${esc(step[0])}</h3>
      <p>${esc(step[1])}</p>
      <div class="plan-links">${groupChunks[i].map(group => `<a href="#${esc(group.id)}">${esc(group.title)}</a>`).join("")}</div>
    </article>`).join("")}</div>
  </section>`;
}

function cermatGroupAdvice(subject, group) {
  const advice = {
    "cisla-operace": {
      mistake: "Správný nápad se rozpadne na drobné početní chybě.",
      recognize: "Výsledky jsou blízko, ale nesedí znaménko, závorka, přepis čísla nebo pořadí kroků.",
      fix: "Dávat krátké sady na přesnost a po každém výpočtu chtít odhad výsledku."
    },
    "zlomky-desetinna": {
      mistake: "Dítě počítá se zlomkem mechanicky a ztratí, čeho je částí.",
      recognize: "Umí upravit čísla, ale v obrázku nebo slovní situaci odpoví k jinému celku.",
      fix: "Nejdřív pojmenovat celek a část, teprve potom převádět nebo počítat."
    },
    "slovni-logicke": {
      mistake: "Úloha se začne počítat dřív, než je jasný plán.",
      recognize: "Dítě několikrát zkouší náhodné výpočty a nedokáže říct, proč zvolilo právě je.",
      fix: "Vyžadovat náčrt, tabulku možností nebo krátký zápis podmínek před výpočtem."
    },
    "geometrie-mereni": {
      mistake: "Záměna obvodu, obsahu, délky a jednotek.",
      recognize: "Výpočet vypadá správně, ale odpověď má špatnou veličinu nebo vychází z nepopsaného obrázku.",
      fix: "Dopsat rozměry přímo do náčrtu a u každého čísla držet jednotku."
    },
    "jednotky-data": {
      mistake: "Údaje z tabulky nebo obrázku se použijí bez sjednocení jednotek.",
      recognize: "Chyba vznikne až po přečtení informací: minuty se míchají s hodinami, cm s m, Kč s počtem kusů.",
      fix: "Před výpočtem přepsat všechny údaje do stejné jednotky a označit, odkud se vzaly."
    },
    "pomery-procenta": {
      mistake: "Procenta se počítají ze špatného základu nebo se obrátí poměr.",
      recognize: "Dítě zná postup, ale neví, co je 100 %, případně prohodí členy poměru.",
      fix: "V každé úloze nejdřív napsat základ, část a jednotku; u poměru hlídat pořadí."
    },
    "algebra-rovnice": {
      mistake: "Text se nepřevede na vztah, jen se zkouší čísla.",
      recognize: "Dítě najde výsledek odhadem, ale neumí ukázat rovnici ani kontrolu podmínek.",
      fix: "Pojmenovat neznámou slovy, zapsat jednu větu jako rovnici a výsledek vrátit do zadání."
    },
    "geometrie": {
      mistake: "Obrázek se čte příliš rychle a přehlédnou se vazby mezi délkami, úhly nebo tělesy.",
      recognize: "Chybí pomocný náčrt, popsané údaje nebo kontrola, jestli jde o obvod, obsah či objem.",
      fix: "Doplnit do obrázku všechna známá čísla a vybrat vzorec až podle otázky."
    },
    "data-logika": {
      mistake: "Možnosti se neprojdou systematicky.",
      recognize: "Dítě drží podmínky v hlavě, vrací se zpět a mění odpověď bez jasného záznamu.",
      fix: "Psát možnosti do tabulky, škrtat nemožné varianty a u dat nejdřív popsat, co graf ukazuje."
    },
    "cteni-porozumeni": {
      mistake: "Odpověď vychází z dojmu, ne z ukázky.",
      recognize: "Dítě umí odpověď obhájit obecně, ale nenajde větu nebo slovo v textu.",
      fix: "Ke každé odpovědi podtrhnout důkaz v textu a znovu přečíst přesné znění otázky."
    },
    "pravopis": {
      mistake: "Pravopis se tipuje podle sluchu.",
      recognize: "Dítě často trefí doplnění, ale neumí říct pravidlo nebo druh slova.",
      fix: "Cvičit po malých dávkách a u každého slova chtít jedno konkrétní odůvodnění."
    },
    "pravopis-tvaroslovi": {
      mistake: "Pravidlo je známé, ale v testové větě se nerozpozná.",
      recognize: "Chyba vzniká u slovních druhů, kategorií nebo koncovek, když je věta delší.",
      fix: "Nejdřív určit roli slova ve větě, potom teprve doplnit pravopis nebo tvar."
    },
    "tvaroslovi-skladba": {
      mistake: "Slovo se určuje izolovaně, ne podle použití ve větě.",
      recognize: "Stejné slovo v jiné větě dítě určí jinak jen náhodou nebo podle koncovky.",
      fix: "Ptát se, co slovo ve větě dělá, a k určení připojit krátké zdůvodnění."
    },
    "skladba": {
      mistake: "Věta se nerozebere od slovesa a základních vztahů.",
      recognize: "Dítě doplňuje čárky nebo větné členy podle pocitu a nevidí řídící výraz.",
      fix: "Nejdřív najít slovesa, podmět a přísudek, potom otázkou určit další vztahy."
    },
    "slovni-zasoba": {
      mistake: "Příbuznost a význam slov se posuzují podle podobného zvuku.",
      recognize: "Dítě vybere slovo, které zní podobně, ale významově do řady nepatří.",
      fix: "Vždy říct význam vlastními slovy a ověřit ho v konkrétní větě."
    },
    "slovni-zasoba-vyznam": {
      mistake: "Význam slova se bere bez kontextu.",
      recognize: "Dítě zná jeden význam, ale v ukázce je použité jinak nebo stylově příznakově.",
      fix: "Číst okolní větu a nahradit slovo vlastním výrazem, který zachová smysl."
    },
    "literatura-sloh": {
      mistake: "Literární pojem se vybírá zpaměti bez opory v ukázce.",
      recognize: "Dítě zná název žánru nebo prostředku, ale neukáže, kde se v textu projevuje.",
      fix: "Každý pojem spojit s konkrétním znakem v ukázce: vypravěč, verš, děj, účel textu."
    }
  };
  return advice[group.id] || {
    mistake: group.watchOut,
    recognize: "Chyba se opakuje u podobných úloh nebo se objeví až při práci na čas.",
    fix: subject.subjectKey === "m"
      ? "Vrátit se k navázaným tématům a po každé chybě zapsat, který krok selhal."
      : "Vrátit se k navázaným tématům a u každé odpovědi vyžadovat oporu v pravidle nebo textu."
  };
}

function rulerHTML(R) {
  let g = "";
  for (let r = 1; r <= 9; r++) {
    g += `<a class="gr" href="${R}rocnik/${r}/" aria-label="${r}. ročník, ${GRADES[r].age}">
      <span class="num">${r}.</span><span class="age">${GRADES[r].age}</span></a>`;
  }
  return `<div class="ruler" role="navigation" aria-label="Ročníky">
    <div class="ruler-top"><div class="seg s1">1. stupeň · 1.–5. ročník</div><div class="seg s2">2. stupeň · 6.–9. ročník</div></div>
    <div class="ruler-grades">${g}</div>
  </div>
  <p class="ruler-note">Věk je orientační — každé dítě má vlastní tempo a školy řadí učivo podle svého ŠVP.</p>`;
}

const DATALIST_OPTIONS = Array.from(new Set([
  ...SKILLS.map(s => s.t),
  ...PPATHS.map(path => path.title),
  ...SITUATIONS.map(situation => situation.title),
  ...CERMAT.exams.flatMap(exam => [
    exam.title,
    ...exam.subjects.map(subject => `${exam.label} ${subject.shortTitle}`)
  ]),
  ...SUPP.fields.map(field => field.title),
  "Když dítě nestíhá",
  "Pomoc pro rodiče",
  "Rodičovské cesty",
  "Přechody a životní situace",
  "Milníky a zkoušky",
  "Zákony a pravidla",
  "RVP",
  "Slovníček"
]));
const DATALIST = `<datalist id="topics">${DATALIST_OPTIONS.map(value => `<option value="${esc(value)}">`).join("")}</datalist>`;

function rvpOutcomeLink(id, R) {
  const o = RVP_OUT[id];
  if (!o) return `<span class="rvp-ref missing">${esc(id)}</span>`;
  return `<a class="rvp-ref" href="${R}rvp/#${esc(id)}"><b>${esc(id)}</b><span>${esc(o.text)}</span></a>`;
}

function words(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function contentAudit(skills) {
  const mappable = skills.filter(s => s.p !== "mil");
  const audit = mappable.map(s => {
    const issues = [];
    const coWords = words(s.co);
    const dalWords = words(s.dal);
    const jak = s.jak || [];
    const doma = s.doma || [];
    if (coWords < 25) issues.push({ weight: 3, label: `Krátké „Co to znamená“ (${coWords} slov)` });
    if (jak.length < 3) issues.push({ weight: 3, label: `Málo bodů v „Jak poznáte“ (${jak.length}/3)` });
    if (doma.length < 2) issues.push({ weight: 2, label: `Málo domácích tipů (${doma.length}/2)` });
    if (dalWords < 8) issues.push({ weight: 2, label: `Krátké „Co přijde dál“ (${dalWords} slov)` });
    if (!s.dalId) issues.push({ weight: 1, label: "Chybí strojová návaznost dalId" });
    if (jak.some(item => words(item) < 5)) issues.push({ weight: 1, label: "Některý bod zvládnutí je příliš stručný" });
    if (doma.some(item => words(item) < 5)) issues.push({ weight: 1, label: "Některý domácí tip je příliš stručný" });
    const score = issues.reduce((sum, issue) => sum + issue.weight, 0);
    const priority = score >= 5 ? "vysoká" : score >= 3 ? "střední" : "nízká";
    return { skill: s, issues, score, priority };
  }).filter(item => item.score >= 2).sort((a, b) => b.score - a.score || a.skill.r - b.skill.r || a.skill.t.localeCompare(b.skill.t, "cs"));
  return {
    total: mappable.length,
    candidates: audit,
    high: audit.filter(item => item.priority === "vysoká").length,
    medium: audit.filter(item => item.priority === "střední").length,
    low: audit.filter(item => item.priority === "nízká").length
  };
}

const CONTENT_AUDIT = contentAudit(SKILLS);

function parentPathQuality(paths) {
  const required = [
    ["typicalMistake", "typická chyba"],
    ["childQuestion", "otázka pro dítě"],
    ["homeActivity", "domácí aktivita"],
    ["teacherSignal", "signál pro učitele"]
  ];
  const findings = paths.map(path => {
    const missing = required.filter(([key]) => !String(path[key] || "").trim()).map(([, label]) => label);
    return { path, missing };
  }).filter(item => item.missing.length);
  return { total: paths.length, findings };
}

const PARENT_PATH_QUALITY = parentPathQuality(PPATHS);

function situationCard(situation, R) {
  return `<a class="card" href="${R}${situationUrl(situation)}">
    <span class="tag" style="background:var(--blue)">Situace</span>
    <h3>${esc(situation.title)}</h3>
    <p>${esc(situation.lead)}</p>
    <span class="meta">${situation.skillIds.length} navázaných témat</span>
  </a>`;
}

function situationGradePanel(grade, R) {
  const items = SITUATIONS.filter(situation => (situation.gradeRefs || []).includes(grade));
  if (!items.length) return "";
  return `<section class="section" style="padding-top:0">
    <div class="sec-head"><h2>Životní situace v tomto období</h2><a class="more" href="${R}situace/">Všechny situace →</a></div>
    <div class="cards">${items.map(situation => situationCard(situation, R)).join("")}</div>
  </section>`;
}

/* ---------- stránky ---------- */
/* Domů */
(function home() {
  const R = "";
  const featured = ["cj3-vyjmenovana", "m2-nasobilka", "m8-mocniny", "cj5-shoda", "m7-zlomky", "mil9-prijimacky"].map(byId);
  const body = `
  <section class="hero">
    <span class="eyebrow">Zdarma · bez účtu · bez reklam</span>
    <h1>České základní vzdělávání, <span class="u">zmapované</span></h1>
    <p class="sub">Vyhledejte cokoli, co se vaše dítě právě učí — co to znamená, jak poznáte, že to zvládá, a co přijde dál. Od prvních písmen po přijímačky.</p>
    <form class="searchbox" action="hledat/" method="get" role="search">
      <input type="search" name="q" list="topics" placeholder="Zkuste: vyjmenovaná slova, zlomky, Pythagorova věta…" aria-label="Hledat učivo">
      <button class="sbtn" type="submit" aria-label="Hledat">→</button>
      ${DATALIST}
    </form>
    <p class="pop">Nejhledanější: ${POPULAR.map(p => `<a href="hledat/?q=${encodeURIComponent(p)}">${p}</a>`).join(" · ")}</p>
    ${rulerHTML(R)}
  </section>
  <section class="section" style="padding-bottom:0">
    <div class="cards">
      <a class="card" href="pomoc/"><span class="tag" style="background:var(--green)">Pomoc</span><h3>Rodičovská pomoc</h3><p>Když dítě nestíhá, rodičovské cesty podle problému a praktické životní situace ve škole.</p></a>
      <a class="card" href="kalendar/"><span class="tag" style="background:var(--blue)">Termíny</span><h3>Kalendář školního roku</h3><p>Přihlášky, zápisy, přijímačky a opravné zkoušky měsíc po měsíci.</p></a>
      <a class="card" href="slovnicek/"><span class="tag" style="background:var(--red)">Zkratky</span><h3>Slovníček pojmů</h3><p>ŠVP, IVP, PPP, DiPSy… co znamenají zkratky ze třídních schůzek.</p></a>
    </div>
  </section>
  <section class="section">
    <div class="sec-head"><h2>Namátkou z mapy</h2><a class="more" href="predmety/">Všechny předměty →</a></div>
    <div class="cards">${featured.map(s => skillCard(s, R)).join("")}</div>
  </section>
  <section class="section">
    <div class="sec-head"><h2>Co říká zákon</h2><a class="more" href="zakony/">Vše o pravidlech →</a></div>
    <div class="infobox"><b>Rychlá orientace:</b> povinná školní docházka trvá 9 let a začíná v 6 letech (školský zákon č. 561/2004 Sb.). Co se učí, rámcově určuje RVP ZV; konkrétní podobu dává každé škole její ŠVP. Přijímačky na střední i víceletá gymnázia zajišťuje jednotná zkouška Cermatu, přihlášky běží elektronicky přes DiPSy.</div>
  </section>`;
  write("index.html", layout({
    path: "", nav: "home",
    title: "Mapa učení — české základní vzdělávání, zmapované",
    desc: "Co se vaše dítě učí v 1.–9. ročníku ZŠ podle RVP: co to znamená, jak poznáte zvládnutí, jak pomoci doma a co přijde dál. Plus zákony, termíny a slovníček.",
    body
  }));
})();

/* Ročníky */
for (let r = 1; r <= 9; r++) {
  const g = GRADES[r];
  const R = "../../";
  const list = SKILLS.filter(s => s.r === r);
  const groups = Object.keys(SUBJ).filter(p => list.some(s => s.p === p));
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › ${r}. ročník</div>
  <div class="page-title">
    <span class="pill ${g.st === 1 ? "p1" : "p2"}">${g.st}. stupeň · obvykle ${g.age}</span>
    <h1>${r}. ročník</h1>
    <p class="lead">${g.intro}</p>
    <div class="progress" data-ids="${list.map(s => s.id).join(",")}"><div class="bar"><i style="width:0%"></i></div><div class="lab">Zvládnuto <b>0</b> z ${list.length} témat — odškrtávejte v detailu tématu.</div></div>
  </div>
  ${cermatGradePanel(r, R)}
  ${situationGradePanel(r, R)}
  ${groups.map(p => {
    const items = list.filter(s => s.p === p);
    return `<div class="subj">
      <div class="subj-head"><span class="swatch" style="background:${SUBJ[p].c}"></span><h2>${SUBJ[p].n}</h2><span class="cnt">${items.length} ${items.length === 1 ? "téma" : items.length < 5 ? "témata" : "témat"}</span></div>
      <div class="cards">${items.map(s => skillCard(s, R)).join("")}</div>
    </div>`;
  }).join("")}
  <div class="pager">
    ${r > 1 ? `<a href="${R}rocnik/${r - 1}/">← ${r - 1}. ročník</a>` : `<a href="${R}">← Přehled</a>`}
    ${r < 9 ? `<a href="${R}rocnik/${r + 1}/">${r + 1}. ročník →</a>` : `<a href="${R}zakony/">Co dál po základce →</a>`}
  </div>`;
  write(`rocnik/${r}/index.html`, layout({
    path: `rocnik/${r}/`, nav: "home",
    title: `${r}. ročník ZŠ — co se učí (${g.age}) | Mapa učení`,
    desc: cut(`${r}. ročník základní školy: ${g.intro}`),
    body
  }));
}

/* Dovednosti */
SKILLS.forEach(s => {
  const R = "../../";
  const su = SUBJ[s.p];
  const prereq = SKILLS.filter(x => x.dalId === s.id);
  const nx = s.dalId ? byId(s.dalId) : null;
  const refs = (s.rvpRefs || []).filter(id => RVP_OUT[id]);
  const cermatRefs = CERMAT_BY_SKILL.get(s.id) || [];
  const supplementaryRefs = SUPP_BY_SKILL.get(s.id) || [];
  const rvpDetail = refs.length
    ? `<div class="rvp-links">${refs.map(id => rvpOutcomeLink(id, R)).join("")}</div>
       <p class="rvp-note">Mapování je orientační: RVP stanovuje výstupy pro období, konkrétní ročník určuje škola ve svém ŠVP.</p>`
    : esc(s.rvp);
  const cermatDetail = cermatRefs.length
    ? `<div class="cermatbox"><b>Vazba na Cermat:</b>
      <div class="cermat-links">${cermatRefs.map(ref => `<a href="${R}${cermatSubjectUrl(ref.exam, ref.subject)}#${esc(ref.group.id)}"><span>${esc(ref.exam.label)} · ${esc(ref.subject.shortTitle)}</span><b>${esc(ref.group.title)}</b></a>`).join("")}</div>
      <p>Vazba ukazuje, kde se téma typicky vrací v jednotné přijímací zkoušce. Konkrétní zadání se rok od roku mění.</p></div>`
    : "";
  const supplementaryDetail = supplementaryRefs.length
    ? `<div class="suppbox"><b>Vazba na doplňující obory:</b>
      <div class="supp-links">${supplementaryRefs.map(field => `<a href="${R}${supplementaryUrl(field)}"><span>${esc(field.shortTitle)}</span><b>${esc(field.title)}</b></a>`).join("")}</div>
      <p>Tyto obory nejsou povinné ve všech školách. Škola je může zařadit do svého ŠVP jako rozšíření běžného učiva.</p></div>`
    : "";
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › <a href="${R}rocnik/${s.r}/">${s.r}. ročník</a> › ${su.n}</div>
  <article class="notebook"><div class="inner">
    <div class="skill-top">
      <span class="tag" style="background:${su.c}">${su.n}</span>
      <span class="pill ${GRADES[s.r].st === 1 ? "p1" : "p2"}" style="margin:0">${s.r}. ročník · obvykle ${GRADES[s.r].age}</span>
      <button class="donebtn" data-skill-id="${s.id}" aria-pressed="false">Označit jako zvládnuté</button>
    </div>
    <h1>${s.t}</h1>
    <p class="blockt">Co to znamená</p>
    <div class="co"><p>${s.co}</p></div>
    <p class="blockt">Jak poznáte, že to zvládá</p>
    <ul class="jak">${s.jak.map(j => `<li>${j}</li>`).join("")}</ul>
    ${s.doma ? `<p class="blockt">Jak pomoci doma</p>
    <ul class="doma">${s.doma.map(j => `<li>${j}</li>`).join("")}</ul>` : ""}
    <p class="blockt">Co přijde dál</p>
    <div class="next">${s.dal}${nx ? ` <a href="${R}${skillUrl(nx)}">${nx.t} →</a>` : ""}</div>
    <div class="rvpbox">${prereq.length ? `<b>Na co navazuje:</b> ${prereq.map(x => `<a href="${R}${skillUrl(x)}">${x.t}</a>`).join(" · ")}<br><br>` : ""}<b>Kde to najdete v RVP:</b> ${rvpDetail}</div>
    ${cermatDetail}
    ${supplementaryDetail}
  </div></article>
  <div class="pager">
    <a href="${R}rocnik/${s.r}/">← Zpět na ${s.r}. ročník</a>
    ${nx ? `<a href="${R}${skillUrl(nx)}">Navazující téma →</a>` : ""}
  </div>`;
  write(skillUrl(s) + "index.html", layout({
    path: skillUrl(s), nav: "home",
    title: `${s.t} — ${s.r}. ročník ZŠ | Mapa učení`,
    desc: cut(s.co),
    body
  }));
});

/* Předměty */
(function predmety() {
  const R = "../";
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Předměty</div>
  <div class="page-title"><h1>Předměty napříč ročníky</h1>
  <p class="lead">Sledujte, jak jedno téma roste rok za rokem — od prvních písmen k větným rozborům, od počítání do dvaceti k soustavám rovnic.</p></div>
  ${Object.keys(SUBJ).map(p => {
    const items = SKILLS.filter(s => s.p === p).sort((a, b) => a.r - b.r);
    if (!items.length) return "";
    return `<div class="subj">
      <div class="subj-head"><span class="swatch" style="background:${SUBJ[p].c}"></span><h2>${SUBJ[p].n}</h2><span class="cnt">${items[0].r}.–${items[items.length - 1].r}. ročník</span></div>
      <div class="cards">${items.map(s => skillCard(s, R)).join("")}</div>
    </div>`;
  }).join("")}
  <div class="infobox"><b>A ještě průřezová témata:</b> RVP ZV vedle předmětů předepisuje šest průřezových témat, která školy vplétají do výuky napříč předměty a ročníky — Osobnostní a sociální výchova, Výchova demokratického občana, Výchova k myšlení v evropských a globálních souvislostech, Multikulturní výchova, Environmentální výchova a Mediální výchova. K tomu existují doplňující vzdělávací obory (dramatická, etická, filmová a taneční výchova), které školy zařazují dobrovolně podle svého ŠVP.</div>`;
  write("predmety/index.html", layout({
    path: "predmety/", nav: "predmety",
    title: "Předměty na základní škole podle RVP ZV | Mapa učení",
    desc: "Všechny předměty 1.–9. ročníku ZŠ podle RVP ZV — od češtiny a matematiky po výchovy a svět práce. Témata seřazená tak, jak na sebe navazují.",
    body
  }));
})();

/* Milníky a zkoušky */
(function milniky() {
  const R = "../";
  const milestones = SKILLS.filter(s => s.p === "mil").sort((a, b) => a.r - b.r || a.t.localeCompare(b.t, "cs"));
  const milestonesByGrade = [5, 9].map(r => {
    const items = milestones.filter(s => s.r === r);
    if (!items.length) return "";
    return `<section class="subj">
      <div class="subj-head"><span class="swatch" style="background:${SUBJ.mil.c}"></span><h2>${r}. ročník</h2><span class="cnt">${items.length} ${items.length === 1 ? "milník" : items.length < 5 ? "milníky" : "milníků"}</span></div>
      <div class="cards">${items.map(s => skillCard(s, R)).join("")}</div>
    </section>`;
  }).join("");
  const related = [
    {
      href: "cermat/",
      tag: "Cermat",
      color: "var(--green)",
      title: "Přijímačková příprava",
      text: "Mapování testových okruhů na matematiku a češtinu pro 5. i 9. třídu."
    },
    {
      href: "kalendar/",
      tag: "Termíny",
      color: "var(--blue)",
      title: "Kalendář školního roku",
      text: "Zápisy, přihlášky, termíny přijímaček a důležité lhůty v čase."
    },
    {
      href: "situace/",
      tag: "Situace",
      color: "var(--blue)",
      title: "Přechody a životní situace",
      text: "Zápis, odklad, změna školy, přechod na druhý stupeň nebo na SŠ."
    },
    {
      href: "zakony/",
      tag: "Pravidla",
      color: "var(--red)",
      title: "Zákony a pravidla",
      text: "Povinná školní docházka, přijímací řízení, zápisy a podpůrná opatření."
    },
    {
      href: "rvp/",
      tag: "RVP",
      color: SUBJ.mil.c,
      title: "Proč nejsou v RVP výstupech",
      text: "Milníky popisují školní události, ne očekávané výsledky učení."
    }
  ].map(item => `<a class="card" href="${R}${item.href}">
    <span class="tag" style="background:${item.color}">${esc(item.tag)}</span>
    <h3>${esc(item.title)}</h3>
    <p>${esc(item.text)}</p>
  </a>`).join("");
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Milníky a zkoušky</div>
  <div class="page-title"><h1>Milníky a zkoušky</h1>
  <p class="lead">Přijímačky, dokončení základního vzdělání a podobné přechody jsou školní události. Nejsou to očekávané výstupy RVP, ale rodič je potřebuje vidět pohromadě.</p></div>
  <div class="infobox"><b>Jak to číst:</b> milník říká, co se ve škole nebo v přijímacím řízení děje a na co navazuje. Samotné dovednosti jsou pořád v běžných předmětech, Cermat část ukazuje přijímačkové okruhy a RVP stránka hlídá mapování výstupů.</div>
  ${milestonesByGrade}
  <section class="section">
    <div class="sec-head"><h2>Související rozcestníky</h2></div>
    <div class="cards">${related}</div>
  </section>`;
  write("milniky/index.html", layout({
    path: "milniky/", nav: "milniky",
    title: "Milníky a zkoušky na základní škole | Mapa učení",
    desc: "Přijímačky na víceletá gymnázia, přijímačky na střední školy a dokončení základního vzdělání jako samostatný rozcestník mimo RVP výstupy.",
    body
  }));
})();

/* Doplňující vzdělávací obory */
(function doplnujiciObory() {
  const R = "../";
  const fieldCard = field => `<a class="card supp-card" href="${R}${supplementaryUrl(field)}">
    <span class="tag" style="background:${field.color}">${esc(field.shortTitle)}</span>
    <h3>${esc(field.title)}</h3>
    <p>${esc(field.lead)}</p>
    <span class="meta">${field.relatedSkillIds.length} navázaných témat</span>
  </a>`;
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Doplňující vzdělávací obory</div>
  <div class="page-title"><h1>Doplňující vzdělávací obory</h1>
  <p class="lead">${esc(SUPP.intro)}</p></div>
  <div class="infobox"><b>Jak to číst:</b> nejde o další povinný seznam předmětů. Doplňující obory ukazují, jak může škola rozšířit výuku a propojit běžná témata s komunikací, etikou, filmem, pohybem nebo tvorbou.</div>
  <div class="cards">${SUPP.fields.map(fieldCard).join("")}</div>`;
  write("doplnujici-obory/index.html", layout({
    path: "doplnujici-obory/", nav: "doplnujici",
    title: "Doplňující vzdělávací obory podle RVP | Mapa učení",
    desc: "Dramatická, etická, filmová/audiovizuální a taneční/pohybová výchova: co znamenají, jak je školy zařazují a s čím souvisejí.",
    body
  }));

  SUPP.fields.forEach(field => {
    const fieldR = "../../";
    const related = field.relatedSkillIds.map(byId).filter(Boolean);
    const subjects = Array.from(new Set(related.map(s => s.p)));
    const body = `
    <div class="crumbs"><a href="${fieldR}">Mapa učení</a> › <a href="${fieldR}doplnujici-obory/">Doplňující obory</a> › ${esc(field.title)}</div>
    <div class="page-title">
      <span class="pill p1">${subjects.map(p => esc(SUBJ[p].n)).join(" · ")}</span>
      <h1>${esc(field.title)}</h1>
      <p class="lead">${esc(field.lead)}</p>
    </div>
    <article class="supp-detail">
      <div class="supp-stages">
        <div><b>1. stupeň</b><p>${esc(field.stage1)}</p></div>
        <div><b>2. stupeň</b><p>${esc(field.stage2)}</p></div>
      </div>
      <div class="supp-columns">
        <section><h2>K čemu je to dobré</h2><ul>${field.benefits.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>
        <section><h2>Jak poznat kvalitní výuku</h2><ul>${field.quality.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>
      </div>
      <div class="infobox"><b>Na co si dát pozor:</b> ${esc(field.watchOut)}</div>
    </article>
    <section class="section">
      <div class="sec-head"><h2>Navázaná běžná témata</h2><span class="cnt">${related.length} témat</span></div>
      <div class="cards">${related.map(s => skillCard(s, fieldR)).join("")}</div>
    </section>`;
    write(`${supplementaryUrl(field)}index.html`, layout({
      path: supplementaryUrl(field), nav: "doplnujici",
      title: `${field.title} | Doplňující obory | Mapa učení`,
      desc: cut(field.lead),
      body
    }));
  });
})();

/* Cermat */
(function cermatPages() {
  const R = "../";
  const cardSubject = (exam, subject, rel) => `<a class="card cermat-card" href="${rel}${cermatSubjectUrl(exam, subject)}">
    <span class="tag" style="background:${SUBJ[subject.subjectKey].c}">${esc(subject.title)}</span>
    <h3>${esc(subject.shortTitle)}</h3>
    <p>${esc(subject.lead)}</p>
    <span class="meta">${esc(subject.duration)} · ${esc(subject.points)} · ${subject.groups.length} okruhů</span>
  </a>`;

  const indexBody = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Cermat</div>
  <div class="page-title"><h1>Cermat a Mapa učení</h1>
  <p class="lead">Přijímačky nejsou samostatný předmět. Tady je vidět, která témata z matematiky a češtiny se v jednotné přijímací zkoušce typicky potkávají a jak je trénovat bez náhodného listování testy.</p></div>
  <div class="infobox"><b>Princip:</b> zadání a klíče patří na oficiální web Cermatu. Mapa učení ukazuje dovednosti za úlohami, typické pasti a odkazy zpět na učivo.</div>
  ${CERMAT.exams.map(exam => `<section class="section">
    <div class="sec-head"><h2>${esc(exam.title)}</h2><a class="more" href="${R}${cermatExamUrl(exam)}">Přehled →</a></div>
    <p class="lead small-lead">${esc(exam.desc)}</p>
    ${cermatDashboardHTML(exam, R, false)}
    <div class="cards">${exam.subjects.map(subject => cardSubject(exam, subject, R)).join("")}</div>
  </section>`).join("")}`;
  write("cermat/index.html", layout({
    path: "cermat/", nav: "cermat",
    title: "Cermat a přijímačky podle témat | Mapa učení",
    desc: "Vazby mezi jednotnou přijímací zkouškou Cermatu a tématy z matematiky a češtiny na Mapě učení.",
    body: indexBody
  }));

  CERMAT.exams.forEach(exam => {
    const examR = "../../";
    const examBody = `
    <div class="crumbs"><a href="${examR}">Mapa učení</a> › <a href="${examR}cermat/">Cermat</a> › ${esc(exam.label)}</div>
    <div class="page-title"><h1>${esc(exam.title)}</h1><p class="lead">${esc(exam.desc)}</p></div>
    ${cermatDashboardHTML(exam, examR)}
    ${cermatReviewHTML(exam, examR)}
    ${cermatPrintPlanHTML(exam)}
    <div class="cards">${exam.subjects.map(subject => cardSubject(exam, subject, examR)).join("")}</div>
    <div class="infobox"><b>Jak používat:</b> nejdřív najděte okruh, kde dítě ztrácí body, pak otevřete navázaná témata. Celý test nanečisto má smysl hlavně tehdy, když po něm následuje rozbor chyb.</div>`;
    write(`${cermatExamUrl(exam)}index.html`, layout({
      path: cermatExamUrl(exam), nav: "cermat",
      title: `${exam.title} podle témat | Mapa učení`,
      desc: cut(exam.desc),
      body: examBody
    }));

    exam.subjects.forEach(subject => {
      const subjectR = "../../../";
      const subjectColor = SUBJ[subject.subjectKey].c;
      const groupCard = group => {
        const linkedSkills = group.skillIds.map(byId).filter(Boolean);
        const advice = cermatGroupAdvice(subject, group);
        return `<section class="cermat-group" id="${esc(group.id)}">
          <div class="cermat-group-head">
            <span class="tag" style="background:${subjectColor}">${esc(subject.shortTitle)}</span>
            <h2>${esc(group.title)}</h2>
          </div>
          <p>${esc(group.why)}</p>
          <div class="cermat-status" data-cermat-key="${esc(exam.id)}:${esc(subject.id)}:${esc(group.id)}" data-skill-ids="${esc(group.skillIds.join(","))}">
            <div class="cermat-skill-progress"><span>Zvládnuto <b>0</b> z ${linkedSkills.length} témat</span><i><em style="width:0%"></em></i></div>
            <div class="cermat-status-buttons" role="group" aria-label="Stav přípravy: ${esc(group.title)}">
              <button type="button" data-state="done">Umím</button>
              <button type="button" data-state="practice">Trénuju</button>
              <button type="button" data-state="problem">Problém</button>
            </div>
          </div>
          <div class="cermat-grid">
            <div>
              <b>Typické úlohy</b>
              <ul>${group.typicalTasks.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
            </div>
            <div>
              <b>Na co si dát pozor</b>
              <p>${esc(group.watchOut)}</p>
            </div>
          </div>
          <div class="cermat-advice">
            <div><b>Typická chyba</b><p>${esc(advice.mistake)}</p></div>
            <div><b>Jak ji poznat</b><p>${esc(advice.recognize)}</p></div>
            <div><b>Jak ji doma opravit</b><p>${esc(advice.fix)}</p></div>
          </div>
          <div class="mini-cards">${linkedSkills.map(s => `<a href="${subjectR}${skillUrl(s)}"><span>${s.r}. ročník</span><b>${esc(s.t)}</b></a>`).join("")}</div>
        </section>`;
      };
      const subjectBody = `
      <div class="crumbs"><a href="${subjectR}">Mapa učení</a> › <a href="${subjectR}cermat/">Cermat</a> › <a href="${subjectR}${cermatExamUrl(exam)}">${esc(exam.label)}</a> › ${esc(subject.title)}</div>
      <div class="page-title cermat-title">
        <span class="pill ${subject.subjectKey === "m" ? "p1" : "p2"}">${esc(subject.duration)} · ${esc(subject.points)}</span>
        <h1>${esc(subject.title)} · Cermat ${esc(exam.label)}</h1>
        <p class="lead">${esc(subject.lead)}</p>
      </div>
      <div class="cermat-actions">
        ${subject.officialLinks.map(link => `<a href="${esc(link.url)}">${esc(link.label)} →</a>`).join("")}
      </div>
      <section class="section cermat-overview">
        <div class="sec-head"><h2>Okruhy v testu</h2><span class="cnt">${subject.groups.length} okruhů · ${new Set(subject.groups.flatMap(g => g.skillIds)).size} navázaných témat</span></div>
        <div class="cermat-toc">${subject.groups.map(group => `<a href="#${esc(group.id)}">${esc(group.title)}</a>`).join("")}</div>
      </section>
      ${cermatDiagnosticsHTML(subject)}
      ${cermatPlanHTML(subject)}
      ${subject.groups.map(groupCard).join("")}
      <section class="section">
        <div class="sec-head"><h2>Jak trénovat</h2></div>
        <div class="practice-list">${subject.training.map(t => `<div>${esc(t)}</div>`).join("")}</div>
      </section>
      <div class="infobox"><b>Právně čistě:</b> konkrétní testy, záznamové archy a klíče jsou na webu Cermatu. Tady mapujeme dovednosti a strategii, ne kopie testových úloh.</div>`;
      write(`${cermatSubjectUrl(exam, subject)}index.html`, layout({
        path: cermatSubjectUrl(exam, subject), nav: "cermat",
        title: `${subject.title} k přijímačkám Cermat · ${exam.label} | Mapa učení`,
        desc: cut(subject.lead),
        body: subjectBody
      }));
    });
  });
})();

/* Pomoc a životní situace */
(function pomocHub() {
  const R = "../";
  const helpChoices = [
    {
      id: "tempo",
      title: "Dítě nestíhá tempo",
      desc: "Práce mu trvá dlouho, nestíhá testy nebo končí úkoly pozdě večer.",
      main: { href: "rodicovske-cesty/nestiha-tempo/", label: "Rodičovská cesta", title: "Dítě nestíhá tempo", text: "Nejdřív zjistit, kde se čas ztrácí: čtení, psaní, počítání nebo rozhodování." },
      skillIds: ["vz8-stres-dusevni-hygiena", "cj2-cteni", "m2-cas-data"],
      teacher: "Když dítě pravidelně nedokončuje práci i při porozumění učivu.",
      advisory: "Poradnu řešte, pokud tempo dlouhodobě zasahuje víc předmětů nebo psychickou pohodu.",
      search: "nestíhá tempo"
    },
    {
      id: "matematika",
      title: "Bojí se matematiky",
      desc: "U matematiky zamrzá, brečí, vzdává se nebo říká, že na ni nemá hlavu.",
      main: { href: "rodicovske-cesty/boji-se-matematiky/", label: "Rodičovská cesta", title: "Dítě se bojí matematiky", text: "Vrátit se k jednomu konkrétnímu kroku, ne přidávat další příklady naslepo." },
      skillIds: ["m2-nasobilka", "m5-zlomky", "m9-rovnice"],
      teacher: "Když dítě zamrzá u testů nebo opakuje stejný typ chyby napříč tématy.",
      advisory: "Poradna dává smysl, když se strach z matematiky mění v dlouhodobou úzkost nebo vyhýbání škole.",
      search: "bojí se matematiky"
    },
    {
      id: "cteni",
      title: "Špatně čte",
      desc: "Čtení bere moc energie, dítě ztrácí smysl textu nebo odmítá číst nahlas.",
      main: { href: "rodicovske-cesty/spatne-cte/", label: "Rodičovská cesta", title: "Dítě špatně čte", text: "Netlačit jen na rychlost. Oddělit techniku čtení od porozumění textu." },
      skillIds: ["cj1-slabiky", "cj2-cteni", "cj5-literatura"],
      teacher: "Když čtení brzdí i zadání v matematice, prvouce nebo testech.",
      advisory: "PPP zvažte, pokud potíže se čtením trvají přes cílený trénink a výrazně zasahují školu.",
      search: "špatně čte"
    },
    {
      id: "zapis",
      title: "Řešíme zápis nebo odklad",
      desc: "Nejste si jistí školní zralostí, zápisem nebo tím, jestli má odklad smysl.",
      main: { href: "situace/zapis-do-1-tridy/", label: "Situace", title: "Zápis do 1. třídy", text: "Podívat se na řeč, samostatnost, pozornost, motoriku a základní představy o množství." },
      skillIds: ["cj1-komunikace", "cj1-psani", "m1-rada"],
      teacher: "Ptejte se školy nebo školky, co přesně dítěti v připravenosti chybí.",
      advisory: "PPP má smysl, pokud se rozhodujete o odkladu nebo jsou potíže výrazné ve více oblastech.",
      search: "zápis odklad"
    },
    {
      id: "druhy-stupen",
      title: "Přecházíme na 2. stupeň",
      desc: "Přibyli učitelé, testy, domácí příprava a dítě se hůř organizuje.",
      main: { href: "situace/prechod-1-2-stupen/", label: "Situace", title: "Přechod z 1. na 2. stupeň", text: "Rozlišit, jestli problém leží v učivu, organizaci, tempu nebo adaptaci." },
      skillIds: ["m5-zlomky", "m6-desetinna", "ov6-clovek-osobnost"],
      teacher: "Požádejte o jednu až dvě priority, které teď rozhodují o tom, jestli se dítě chytí.",
      advisory: "Poradnu řešte, pokud se potíže po adaptačním období nelepší nebo výrazně zasahují psychiku.",
      search: "přechod na druhý stupeň"
    },
    {
      id: "prijimacky",
      title: "Řešíme přijímačky",
      desc: "Dítě se připravuje na osmileté gymnázium nebo střední školu.",
      main: { href: "cermat/", label: "Cermat", title: "Cermat příprava", text: "Nejdřív rozlišit okruhy a typy chyb, potom trénovat testy na čas." },
      skillIds: ["mil5-gympl", "mil9-prijimacky", "cj9-pravopis", "m9-logika-prostor"],
      teacher: "Ptejte se, které typy úloh dítěti berou body a jak je škola doporučuje trénovat.",
      advisory: "Poradna není běžná součást přijímaček, ale dává smysl při výrazných obtížích, úpravách podmínek nebo dlouhodobém stresu.",
      search: "přijímačky cermat"
    },
    {
      id: "nechce-do-skoly",
      title: "Nechce chodit do školy",
      desc: "Objevuje se odpor, strach, bolesti břicha, pláč nebo vyhýbání škole.",
      main: { href: "rodicovske-cesty/nechce-do-skoly/", label: "Rodičovská cesta", title: "Dítě nechce chodit do školy", text: "Neoznačit to rychle za lenost. Zmapovat strach, vztahy, přetížení a konkrétní situace." },
      skillIds: ["vz6-vztahy-komunita", "vz8-stres-dusevni-hygiena", "vz9-bezpeci-prvni-pomoc"],
      teacher: "Mluvte se školou hned, pokud dítě mluví o strachu, izolaci, konfliktu nebo bezpečí.",
      advisory: "PPP, SPC nebo další odbornou pomoc řešte, pokud se vyhýbání škole opakuje nebo se zhoršuje psychický stav.",
      search: "nechce do školy"
    }
  ].map(choice => ({
    ...choice,
    skills: choice.skillIds.map(byId).filter(Boolean).map(s => ({
      title: s.t,
      href: skillUrl(s),
      tag: SUBJ[s.p].n,
      color: SUBJ[s.p].c,
      lead: s.co.slice(0, s.co.indexOf(".") + 1)
    }))
  }));
  const choiceButtons = helpChoices.map(choice => `<button class="choice-btn" type="button" data-choice="${esc(choice.id)}">
    <b>${esc(choice.title)}</b><span>${esc(choice.desc)}</span>
  </button>`).join("");
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Pomoc</div>
  <div class="page-title"><h1>Pomoc pro rodiče</h1>
  <p class="lead">Praktické rozcestníky mimo osnovu: když dítě nestíhá, když se opakuje konkrétní problém nebo když rodina řeší důležitý školní přechod.</p></div>
  <section class="section help-chooser">
    <div class="sec-head"><h2>Co právě řešíte?</h2></div>
    <div class="infobox"><b>Bez ukládání:</b> výběr se nikam neposílá ani neukládá. Jen na této stránce ukáže vhodný další krok.</div>
    <div class="choice-grid">${choiceButtons}</div>
    <div class="chooser-result" id="help-result" hidden></div>
  </section>
  <div class="cards">
    <a class="card" href="${R}kdyz-dite-nestiha/"><span class="tag" style="background:var(--green)">Pomoc</span><h3>Když dítě nestíhá</h3><p>Jak zmapovat problém, zmenšit tlak a domluvit podporu doma, se školou nebo poradnou.</p></a>
    <a class="card" href="${R}rodicovske-cesty/"><span class="tag" style="background:var(--green)">Cesty</span><h3>Rodičovské cesty</h3><p>Rozcestníky podle problému: čtení, učení, matematika, tempo, pravopis nebo odpor ke škole.</p></a>
    <a class="card" href="${R}situace/"><span class="tag" style="background:var(--blue)">Situace</span><h3>Přechody a životní situace</h3><p>Zápis, odklad, změna školy, přechod na druhý stupeň, SŠ a domácí vzdělávání.</p></a>
  </div>
  <section class="section">
    <div class="sec-head"><h2>Nejčastější situace</h2><a class="more" href="${R}situace/">Všechny situace →</a></div>
    <div class="cards">${SITUATIONS.slice(0, 3).map(situation => situationCard(situation, R)).join("")}</div>
  </section>`;
  const extraScript = `<script>
(function(){
  "use strict";
  var choices=${JSON.stringify(helpChoices)};
  var result=document.getElementById("help-result");
  var esc=function(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");};
  var render=function(choice){
    result.hidden=false;
    result.innerHTML='<div class="sec-head"><h2>Doporučený další krok</h2><a class="more" href="../hledat/?q='+encodeURIComponent(choice.search)+'">Hledat podobně →</a></div>'
      +'<div class="cards">'
      +'<a class="card" href="../'+choice.main.href+'"><span class="tag" style="background:var(--green)">'+esc(choice.main.label)+'</span><h3>'+esc(choice.main.title)+'</h3><p>'+esc(choice.main.text)+'</p></a>'
      +choice.skills.map(function(s){return '<a class="card" href="../'+s.href+'"><span class="tag" style="background:'+s.color+'">'+esc(s.tag)+'</span><h3>'+esc(s.title)+'</h3><p>'+esc(s.lead)+'</p></a>';}).join("")
      +'</div>'
      +'<div class="cards chooser-notes"><div class="gl"><b>Kdy mluvit s učitelem</b><p>'+esc(choice.teacher)+'</p></div><div class="gl"><b>Kdy řešit poradnu</b><p>'+esc(choice.advisory)+'</p></div></div>';
    result.scrollIntoView({behavior:"smooth",block:"nearest"});
  };
  document.querySelectorAll(".choice-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      document.querySelectorAll(".choice-btn").forEach(function(other){other.classList.remove("active");});
      btn.classList.add("active");
      var choice=choices.find(function(item){return item.id===btn.getAttribute("data-choice");});
      if(choice)render(choice);
    });
  });
})();
</script>`;
  write("pomoc/index.html", layout({
    path: "pomoc/", nav: "pomoc",
    title: "Pomoc pro rodiče | Mapa učení",
    desc: "Rodičovská pomoc mimo osnovu: dítě nestíhá, rodičovské cesty podle problému a životní situace ve škole.",
    body, extraScript
  }));
})();

(function situace() {
  const R = "../";
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Přechody a životní situace</div>
  <div class="page-title"><h1>Přechody a životní situace</h1>
  <p class="lead">Školní situace, které rodiče řeší napříč ročníky. Nejsou to běžná témata učiva, ale pomáhají rozhodnout, co hlídat, na co se ptát školy a kam dál v mapě.</p></div>
  <div class="cards">${SITUATIONS.map(situation => situationCard(situation, R)).join("")}</div>`;
  write("situace/index.html", layout({
    path: "situace/", nav: "pomoc",
    title: "Přechody a životní situace ve škole | Mapa učení",
    desc: "Zápis do první třídy, odklad, přechod na druhý stupeň, změna školy, přechod na SŠ a domácí vzdělávání.",
    body
  }));

  SITUATIONS.forEach(situation => {
    const pageR = "../../";
    const linkedSkills = situation.skillIds.map(byId).filter(Boolean);
    const relatedPages = (situation.relatedUrls || []).map(item => `<a class="card" href="${pageR}${item.href}">
      <span class="tag" style="background:var(--green)">${esc(item.label)}</span>
      <h3>${esc(item.title)}</h3>
      <p>Navazující rozcestník pro další orientaci.</p>
    </a>`).join("");
    const gradeLinks = (situation.gradeRefs || []).map(r => `<a href="${pageR}rocnik/${r}/">${r}. ročník</a>`).join(" · ");
    const milestones = (situation.milestoneIds || []).map(byId).filter(Boolean);
    const body = `
    <div class="crumbs"><a href="${pageR}">Mapa učení</a> › <a href="${pageR}situace/">Situace</a> › ${esc(situation.title)}</div>
    <div class="page-title"><h1>${esc(situation.title)}</h1>
    <p class="lead">${esc(situation.lead)}</p></div>
    ${gradeLinks || milestones.length ? `<div class="infobox"><b>Kde se to typicky řeší:</b> ${gradeLinks}${gradeLinks && milestones.length ? " · " : ""}${milestones.map(m => `<a href="${pageR}${skillUrl(m)}">${esc(m.t)}</a>`).join(" · ")}</div>` : ""}
    <section class="section">
      <div class="sec-head"><h2>Co je důležité</h2></div>
      <div class="cards">${situation.whatMatters.map(item => `<div class="gl"><p>${esc(item)}</p></div>`).join("")}</div>
    </section>
    <section class="section">
      <div class="sec-head"><h2>Co zkusit doma</h2></div>
      <div class="cards">${situation.homeSteps.map(item => `<div class="gl"><p>${esc(item)}</p></div>`).join("")}</div>
    </section>
    <section class="section">
      <div class="sec-head"><h2>Na co se ptát školy</h2></div>
      <div class="cards">${situation.schoolQuestions.map(item => `<div class="gl"><p>${esc(item)}</p></div>`).join("")}</div>
    </section>
    <div class="infobox"><b>Na co si dát pozor:</b> ${esc(situation.watchOut)}</div>
    <section class="section">
      <div class="sec-head"><h2>Navázaná témata</h2></div>
      <div class="cards">${linkedSkills.map(s => skillCard(s, pageR)).join("")}</div>
    </section>
    ${relatedPages ? `<section class="section">
      <div class="sec-head"><h2>Související rozcestníky</h2></div>
      <div class="cards">${relatedPages}</div>
    </section>` : ""}
    <div class="pager"><a href="${pageR}situace/">← Všechny situace</a><a href="${pageR}pomoc/">Pomoc pro rodiče →</a></div>`;
    write(`${situationUrl(situation)}index.html`, layout({
      path: situationUrl(situation), nav: "pomoc",
      title: `${situation.title} | Mapa učení`,
      desc: cut(situation.lead),
      body
    }));
  });
})();

/* Rodičovské cesty */
(function rodicovskeCesty() {
  const R = "../";
  const pathCard = path => `<a class="card" href="${R}${parentPathUrl(path)}">
    <span class="tag" style="background:var(--green)">Cesta</span>
    <h3>${esc(path.title)}</h3>
    <p>${esc(path.lead)}</p>
    <span class="meta">${path.skillIds.length} navázaných témat</span>
  </a>`;
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Rodičovské cesty</div>
  <div class="page-title"><h1>Rodičovské cesty</h1>
  <p class="lead">Praktické rozcestníky podle problému, ne podle předmětu. Každá cesta ukazuje signály, první domácí kroky, otázku pro dítě, typickou chybu dospělých a témata, která s problémem souvisejí.</p></div>
  <div class="cards">${PPATHS.map(pathCard).join("")}</div>`;
  write("rodicovske-cesty/index.html", layout({
    path: "rodicovske-cesty/", nav: "pomoc",
    title: "Rodičovské cesty podle problému | Mapa učení",
    desc: "Praktické cesty pro rodiče: dítě špatně čte, bojí se matematiky, nestíhá tempo, má potíže s pravopisem nebo nechce do školy.",
    body
  }));

  PPATHS.forEach(path => {
    const pageR = "../../";
    const linkedSkills = path.skillIds.map(byId).filter(Boolean);
    const body = `
    <div class="crumbs"><a href="${pageR}">Mapa učení</a> › <a href="${pageR}rodicovske-cesty/">Rodičovské cesty</a> › ${esc(path.title)}</div>
    <div class="page-title"><h1>${esc(path.title)}</h1>
    <p class="lead">${esc(path.lead)}</p></div>
    <section class="section">
      <div class="sec-head"><h2>Jak to poznat</h2></div>
      <div class="cards">${path.signs.map(sign => `<div class="gl"><p>${esc(sign)}</p></div>`).join("")}</div>
    </section>
    <section class="section">
      <div class="sec-head"><h2>První kroky doma</h2></div>
      <div class="cards">${path.firstSteps.map(step => `<div class="gl"><p>${esc(step)}</p></div>`).join("")}</div>
    </section>
    <section class="section">
      <div class="sec-head"><h2>Kvalitativní vodítka</h2></div>
      <div class="cards">
        <div class="gl"><b>Typická chyba</b><p>${esc(path.typicalMistake)}</p></div>
        <div class="gl"><b>Otázka pro dítě</b><p>${esc(path.childQuestion)}</p></div>
        <div class="gl"><b>Domácí aktivita</b><p>${esc(path.homeActivity)}</p></div>
        <div class="gl"><b>Signál pro učitele</b><p>${esc(path.teacherSignal)}</p></div>
      </div>
    </section>
    <section class="section">
      <div class="sec-head"><h2>Související témata</h2></div>
      <div class="cards">${linkedSkills.map(s => skillCard(s, pageR)).join("")}</div>
    </section>
    <div class="pager"><a href="${pageR}rodicovske-cesty/">← Všechny rodičovské cesty</a><a href="${pageR}kdyz-dite-nestiha/">Když dítě nestíhá →</a></div>`;
    write(`${parentPathUrl(path)}index.html`, layout({
      path: parentPathUrl(path), nav: "pomoc",
      title: `${path.title} | Rodičovské cesty | Mapa učení`,
      desc: cut(path.lead),
      body
    }));
  });
})();

/* Když dítě nestíhá */
(function kdyzDiteNestiha() {
  const R = "../";
  const topicLinks = [
    { label: "Čtení", skill: "cj2-cteni", text: "plynulost, porozumění a únava při čtení" },
    { label: "Psaní", skill: "cj1-psani", text: "úchop, tempo, opis, přepis a bolest ruky" },
    { label: "Pravopis", skill: "cj9-pravopis", text: "opakované chyby, diktáty a přijímačková čeština" },
    { label: "Matematika", skill: "m2-nasobilka", text: "automatizace základů, násobilka a slovní úlohy" },
    { label: "Stres", skill: "vz8-stres-dusevni-hygiena", text: "únava, přetížení, regenerace a tlak na výkon" },
    { label: "Bezpečí a pomoc", skill: "vz9-bezpeci-prvni-pomoc", text: "krizové situace, dospělý, odborná pomoc a první kroky" }
  ];
  const topicCards = topicLinks.map(item => {
    const s = byId(item.skill);
    return `<a class="card" href="${R}${skillUrl(s)}">
      <span class="tag" style="background:${SUBJ[s.p].c}">${esc(item.label)}</span>
      <h3>${esc(s.t)}</h3>
      <p>${esc(item.text)}</p>
    </a>`;
  }).join("");
  const steps = [
    ["Zmapujte problém", "Týden si zapisujte, kde přesně to drhne: čtení, tempo, porozumění zadání, výpočty, pozornost, stres, domácí úkoly nebo vztahy ve třídě."],
    ["Zmenšete úkol", "Místo dlouhého dohánění dejte krátký, jasný blok: 10 minut čtení, 5 příkladů, jeden odstavec, jedno pravidlo. Úspěch musí být dosažitelný."],
    ["Domluvte se se školou", "Učitel vidí dítě ve třídě a může říct, jestli jde o běžný výkyv, díru v konkrétním učivu, tempo třídy nebo signál k dalšímu řešení."],
    ["Když se to opakuje, řešte podporu", "Pokud problém trvá týdny, zhoršuje se nebo zasahuje psychiku dítěte, má smysl mluvit o školním poradenském pracovišti, PPP nebo SPC."]
  ].map((step, i) => `<div class="gl"><b>${i + 1}. ${esc(step[0])}</b><p>${esc(step[1])}</p></div>`).join("");
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Když dítě nestíhá</div>
  <div class="page-title"><h1>Když dítě nestíhá</h1>
  <p class="lead">Praktický postup pro rodiče, když se dítě začne ztrácet v učivu, tempu, domácích úkolech nebo školním tlaku.</p></div>
  <div class="infobox"><b>Nejdřív klid:</b> jedno horší období neznamená selhání dítěte ani školy. Smyslem je zjistit, co přesně se děje, zmenšit tlak a včas zapojit správnou pomoc.</div>
  <section class="section">
    <div class="sec-head"><h2>První postup</h2></div>
    <div class="cards">${steps}</div>
  </section>
  <section class="section">
    <div class="sec-head"><h2>Kdy mluvit s učitelem</h2></div>
    <div class="cards">
      <div class="gl"><b>Opakovaně nerozumí zadání</b><p>Dítě doma neví, co má dělat, nebo úkol splní jinak, než škola čekala.</p></div>
      <div class="gl"><b>Dře základní dovednost</b><p>Čtení, psaní, počítání nebo porozumění textu bere tolik energie, že nezbývá síla na samotné učivo.</p></div>
      <div class="gl"><b>Změnilo se chování</b><p>Objevuje se vyhýbání škole, bolesti břicha, pláč, výbuchy, rezignace nebo dlouhé večerní dohánění.</p></div>
      <div class="gl"><b>Není jasné, co procvičovat</b><p>Učitel může určit konkrétní prioritu: ne „víc se učit“, ale jedno pravidlo, typ úloh nebo dovednost.</p></div>
    </div>
  </section>
  <section class="section">
    <div class="sec-head"><h2>Kdy PPP nebo SPC</h2></div>
    <div class="infobox"><b>Poradna dává smysl, když:</b> potíže trvají delší dobu, nelepší se běžnou podporou, výrazně zasahují čtení, psaní, matematiku, pozornost, komunikaci, psychickou pohodu nebo vztahy ve třídě. Škola i rodič mohou řešit školní poradenské pracoviště, pedagogicko-psychologickou poradnu (PPP) nebo speciálně pedagogické centrum (SPC).</div>
    <div class="cards">
      <div class="gl"><b>PLPP</b><p>Plán pedagogické podpory je první školní úroveň pomoci. Popisuje, co škola zkusí změnit bez nutnosti formální diagnózy.</p></div>
      <div class="gl"><b>IVP</b><p>Individuální vzdělávací plán se používá tam, kde dítě potřebuje upravený postup na základě doporučení poradenského zařízení.</p></div>
      <div class="gl"><b>Podpůrná opatření</b><p>Mohou znamenat úpravu metod, hodnocení, pomůcky, asistenta, organizaci výuky nebo další podporu podle doporučení.</p></div>
    </div>
  </section>
  <section class="section">
    <div class="sec-head"><h2>Podle problému</h2></div>
    <div class="cards">${topicCards}</div>
  </section>
  <section class="section">
    <div class="sec-head"><h2>Rodičovské cesty</h2><a class="more" href="${R}rodicovske-cesty/">Všechny cesty →</a></div>
    <div class="cards">${PPATHS.slice(0, 3).map(path => `<a class="card" href="${R}${parentPathUrl(path)}"><span class="tag" style="background:var(--green)">Cesta</span><h3>${esc(path.title)}</h3><p>${esc(path.lead)}</p></a>`).join("")}</div>
  </section>
  <section class="section">
    <div class="sec-head"><h2>Související stránky</h2></div>
    <div class="cards">
      <a class="card" href="${R}slovnicek/"><span class="tag" style="background:var(--red)">Zkratky</span><h3>Slovníček</h3><p>PPP, SPC, IVP, PLPP, podpůrná opatření a další školní pojmy.</p></a>
      <a class="card" href="${R}situace/"><span class="tag" style="background:var(--blue)">Situace</span><h3>Přechody a životní situace</h3><p>Zápis, odklad, změna školy, domácí vzdělávání a další praktické školní situace.</p></a>
      <a class="card" href="${R}zakony/"><span class="tag" style="background:var(--blue)">Pravidla</span><h3>Zákony a pravidla</h3><p>Povinná školní docházka, podpůrná opatření a práva dítěte ve škole.</p></a>
      <a class="card" href="${R}rvp/"><span class="tag" style="background:var(--green)">RVP</span><h3>Pokrytí RVP</h3><p>Co je očekávaný výstup a proč ročníkové zařazení není pevný termín.</p></a>
    </div>
  </section>`;
  write("kdyz-dite-nestiha/index.html", layout({
    path: "kdyz-dite-nestiha/", nav: "pomoc",
    title: "Když dítě nestíhá školu | Mapa učení",
    desc: "Praktický průvodce pro rodiče: co dělat, když dítě nestíhá učivo, kdy mluvit s učitelem a kdy řešit PPP, SPC, IVP nebo podpůrná opatření.",
    body
  }));
})();

/* Kalendář */
(function kalendar() {
  const R = "../";
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Kalendář školního roku</div>
  <div class="page-title"><h1>Kalendář školního roku</h1>
  <p class="lead">Termíny, které rodiče nejčastěji honí — od přihlášek na talentové obory po opravné zkoušky. Řazeno podle školního roku.</p></div>
  ${CAL.map(c => `<div class="law cal"><span class="mon">${c.m}</span><h3>${c.t}</h3><p>${c.p}</p></div>`).join("")}
  <div class="infobox"><b>Pozor na letopočty:</b> přesná data se rok od roku mírně liší a vyhlašuje je MŠMT a Cermat. Před důležitým krokem si termín ověřte na cermat.cz, prihlaskynastredni.cz, msmt.gov.cz — a hlavně na webu vaší školy.</div>`;
  write("kalendar/index.html", layout({
    path: "kalendar/", nav: "kalendar",
    title: "Kalendář školního roku: přihlášky, zápisy, přijímačky | Mapa učení",
    desc: "Klíčové termíny školního roku pro rodiče: přihlášky na SŠ přes DiPSy do 20. února, zápisy do 1. tříd v dubnu, jednotné přijímačky, opravné zkoušky v srpnu.",
    body
  }));
})();

/* Zákony */
(function zakony() {
  const R = "../";
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Zákony a pravidla</div>
  <div class="page-title"><h1>Zákony a pravidla srozumitelně</h1>
  <p class="lead">Nejdůležitější pravidla českého základního školství pro rodiče — bez paragrafového žargonu, ale s odkazem na paragraf, kdybyste ho potřebovali.</p></div>
  ${LAWS.map(l => `<div class="law"><h3>${l.t}</h3><p>${l.p}</p><span class="ref">${l.ref}</span></div>`).join("")}
  <div class="infobox"><b>Pozor:</b> tato stránka je zjednodušený průvodce, ne právní poradna. Aktuální a závazné znění najdete ve Sbírce zákonů (zakonyprolidi.cz) a na webu MŠMT (msmt.gov.cz); k přijímačkám na prihlaskynastredni.cz.</div>`;
  write("zakony/index.html", layout({
    path: "zakony/", nav: "zakony",
    title: "Školský zákon pro rodiče srozumitelně | Mapa učení",
    desc: "Povinná docházka, zápisy, spádové školy, domácí vzdělávání, podpůrná opatření, víceletá gymnázia a přijímačky — pravidla ZŠ s odkazy na paragrafy.",
    body
  }));
})();

/* Pokrytí RVP */
(function rvpPage() {
  const R = "../";
  const outcomes = RVP.outcomes || [];
  const mappedOutcomes = outcomes.filter(o => (o.skillIds || []).length);
  const rvpMappableSkills = SKILLS.filter(s => s.p !== "mil");
  const outOfRvpSkills = SKILLS.filter(s => s.p === "mil");
  const mappedSkillIds = new Set(rvpMappableSkills.filter(s => (s.rvpRefs || []).length).map(s => s.id));
  const subjectCounts = Object.fromEntries(Object.keys(SUBJ).map(p => [p, SKILLS.filter(s => s.p === p).length]));
  const unmappedBySubject = Object.keys(SUBJ)
    .filter(p => p !== "mil")
    .map(p => ({ key: p, name: SUBJ[p].n, count: SKILLS.filter(s => s.p === p && !(s.rvpRefs || []).length).length }))
    .filter(x => x.count);
  const topicWord = n => n === 1 ? "téma" : (n > 1 && n < 5) ? "témata" : "témat";
  const topicVerb = n => (n > 1 && n < 5) ? "nemají" : "nemá";
  const supplementaryByCode = Object.fromEntries(SUPP.fields.map((field, i) => [`5.10.${i + 1}`, field]));
  const skillLinks = ids => ids.length
    ? ids.map(id => {
      const s = byId(id);
      return s ? `<a href="${R}${skillUrl(s)}">${esc(s.t)}</a>` : "";
    }).filter(Boolean).join(" · ")
    : '<span class="muted">Zatím bez přiřazeného tématu</span>';
  const fieldStatus = field => {
    const supplementaryField = supplementaryByCode[field.code];
    if (supplementaryField) {
      const skills = supplementaryField.relatedSkillIds.length;
      return `<div class="rvp-field">
        <div><b>${esc(field.name)}</b><span>${esc(field.code)} · ${skills} navázaných ${topicWord(skills)}</span></div>
        <a class="status ok" href="${R}${supplementaryUrl(supplementaryField)}">volitelný obor</a>
      </div>`;
    }
    const fieldOut = outcomes.filter(o => o.fieldId === field.id);
    const fieldMapped = fieldOut.filter(o => (o.skillIds || []).length);
    const skills = (field.skillSubjectKeys || []).reduce((n, p) => n + (subjectCounts[p] || 0), 0);
    const state = fieldOut.length
      ? `<a class="status ok" href="#field-${esc(field.id)}">${fieldMapped.length}/${fieldOut.length} výstupů</a>`
      : '<em class="status wait">čeká na import</em>';
    return `<div class="rvp-field">
      <div><b>${esc(field.name)}</b><span>${esc(field.code)} · ${skills} ${topicWord(skills)} na webu</span></div>
      ${state}
    </div>`;
  };
  const outcomeCard = o => {
    const period = RVP_PERIOD[o.periodId];
    return `<div class="outcome ${(o.skillIds || []).length ? "covered" : "gap"}" id="${esc(o.id)}">
        <div class="outcome-code"><b>${esc(o.id)}</b><span>${esc(period ? period.label : o.periodId)} · ${esc(o.topic)}</span></div>
        <p>${esc(o.text)}</p>
        <div class="outcome-skills">${skillLinks(o.skillIds || [])}</div>
      </div>`;
  };
  const outcomeSections = RVP.areas.flatMap(area => area.fields.map(field => ({ area, field })))
    .map(({ field }) => {
      const fieldOut = outcomes.filter(o => o.fieldId === field.id);
      if (!fieldOut.length) return "";
      return `<section class="rvp-outcome-field" id="field-${esc(field.id)}">
        <h3>${esc(field.name)}</h3>
        <div class="outcomes">${fieldOut.map(outcomeCard).join("")}</div>
      </section>`;
    }).join("");
  const supplementaryFields = SUPP.fields.map(field => `<a class="rvp-supp-field" href="${R}${supplementaryUrl(field)}">
    <span class="tag" style="background:${field.color}">${esc(field.shortTitle)}</span>
    <b>${esc(field.title)}</b>
    <p>${esc(field.lead)}</p>
    <em>${field.relatedSkillIds.length} navázaných témat</em>
  </a>`).join("");
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Pokrytí RVP</div>
  <div class="page-title"><h1>Pokrytí RVP</h1>
  <p class="lead">Strojově kontrolované mapování témat na očekávané výstupy RVP ZV. U importovaných oborů je vidět pokrytí výstupů, navázaná témata i mezery, které ještě čekají na doplnění.</p></div>
  <div class="metrics">
    <div><b>${outcomes.length}</b><span>importovaných výstupů RVP</span></div>
    <div><b>${mappedOutcomes.length}</b><span>výstupů s tématem</span></div>
    <div><b>${mappedSkillIds.size}</b><span>témat s rvpRefs</span></div>
    <div><b>${rvpMappableSkills.length - mappedSkillIds.size}</b><span>${topicWord(rvpMappableSkills.length - mappedSkillIds.size)} čeká na mapování</span></div>
  </div>
  <div class="infobox"><b>Jak to číst:</b> RVP stanovuje výstupy pro období a stupně, nikoli pevné ročníky. Pokrytí proto ukazuje vazbu témat na RVP výstupy; ročníkové zařazení zůstává orientační. <a href="${R}milniky/">${outOfRvpSkills.length} milníky a zkoušky</a> vedeme mimo RVP mapování, protože popisují školní události, ne očekávané výstupy.</div>
  <section class="section">
    <div class="sec-head"><h2>Oblasti a obory</h2></div>
    ${RVP.areas.map(area => `<div class="rvp-area">
      <h3>${esc(area.name)}</h3>
      ${area.fields.map(fieldStatus).join("")}
    </div>`).join("")}
  </section>
  <section class="section">
    <div class="sec-head"><h2>Doplňující vzdělávací obory</h2><a class="more" href="${R}doplnujici-obory/">Přehled →</a></div>
    <div class="infobox"><b>Proč jsou zvlášť:</b> RVP je uvádí jako volitelné rozšíření, které škola může zařadit do ŠVP. Proto je nemícháme do povinného počítadla pokrytí očekávaných výstupů, ale ukazujeme je jako samostatnou vrstvu navázanou na běžná témata.</div>
    <div class="rvp-supp-grid">${supplementaryFields}</div>
  </section>
  <section class="section">
    <div class="sec-head"><h2>Importované výstupy</h2><span class="cnt">Klikněte na čísla u oborů výše pro skok na sekci</span></div>
    ${outcomeSections}
  </section>
  <section class="section">
    <div class="sec-head"><h2>Témata bez mapování</h2></div>
    ${unmappedBySubject.length ? `<div class="cards">${unmappedBySubject.map(s => `<div class="gl"><b>${esc(s.name)}</b><p>${s.count} ${topicWord(s.count)} zatím ${topicVerb(s.count)} strojové RVP vazby.</p></div>`).join("")}</div>` : `<div class="noresults">Všechna běžná témata určená k RVP mapování už mají přiřazené RVP vazby.</div>`}
  </section>`;
  write("rvp/index.html", layout({
    path: "rvp/", nav: "rvp",
    title: "Pokrytí RVP ZV | Mapa učení",
    desc: "Přehled pokrytí očekávaných výstupů RVP ZV tématy na Mapě učení.",
    body
  }));
})();

/* Audit obsahu */
(function auditPage() {
  const R = "../";
  const topicWord = n => n === 1 ? "téma" : (n > 1 && n < 5) ? "témata" : "témat";
  const byPriority = priority => CONTENT_AUDIT.candidates.filter(item => item.priority === priority);
  const auditCard = item => {
    const s = item.skill;
    return `<div class="gl">
      <span class="tag" style="background:${SUBJ[s.p].c}">${esc(SUBJ[s.p].n)} · ${s.r}. ročník</span>
      <b><a href="${R}${skillUrl(s)}">${esc(s.t)}</a></b>
      <p>Priorita: ${esc(item.priority)} · skóre ${item.score}</p>
      <ul>${item.issues.map(issue => `<li>${esc(issue.label)}</li>`).join("")}</ul>
    </div>`;
  };
  const section = (title, items) => `<section class="section">
    <div class="sec-head"><h2>${esc(title)}</h2><span class="cnt">${items.length} ${topicWord(items.length)}</span></div>
    ${items.length ? `<div class="cards">${items.map(auditCard).join("")}</div>` : `<div class="noresults">V téhle prioritě teď nic není.</div>`}
  </section>`;
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Audit obsahu</div>
  <div class="page-title"><h1>Audit obsahu</h1>
  <p class="lead">Automatický seznam témat a rodičovských cest, které stojí za ruční doplnění. Audit hlídá krátké texty, domácí tipy, návaznosti a nově i kvalitativní vodítka pro rodiče.</p></div>
  <div class="metrics">
    <div><b>${CONTENT_AUDIT.total}</b><span>běžných témat v auditu</span></div>
    <div><b>${CONTENT_AUDIT.candidates.length}</b><span>kandidátů k doplnění</span></div>
    <div><b>${CONTENT_AUDIT.high}</b><span>vysoká priorita</span></div>
    <div><b>${CONTENT_AUDIT.medium}</b><span>střední priorita</span></div>
    <div><b>${PARENT_PATH_QUALITY.findings.length}</b><span>cest bez kvalitativních vodítek</span></div>
  </div>
  <div class="infobox"><b>Jak to číst:</b> skóre není známka kvality učiva. Je to pracovní filtr, který pomáhá najít témata, kde by rodičům nejvíc pomohlo doplnit konkrétnější texty, domácí otázky nebo další krok.</div>
  ${section("Vysoká priorita", byPriority("vysoká"))}
  ${section("Střední priorita", byPriority("střední"))}
  ${section("Nízká priorita", byPriority("nízká"))}
  <section class="section">
    <div class="sec-head"><h2>Kvalitativní audit rodičovských cest</h2><span class="cnt">${PARENT_PATH_QUALITY.total} cest</span></div>
    ${PARENT_PATH_QUALITY.findings.length ? `<div class="cards">${PARENT_PATH_QUALITY.findings.map(item => `<div class="gl"><b><a href="${R}${parentPathUrl(item.path)}">${esc(item.path.title)}</a></b><p>Chybí: ${item.missing.map(esc).join(", ")}</p></div>`).join("")}</div>` : `<div class="noresults">Všechny rodičovské cesty mají typickou chybu, otázku pro dítě, domácí aktivitu i signál pro učitele.</div>`}
  </section>
  <section class="section">
    <div class="sec-head"><h2>Další postup</h2></div>
    <div class="infobox"><b>Doporučení:</b> strukturální audit je teď čistý. Další zlepšení má smysl dělat obsahově: rozšiřovat rodičovské cesty, doplňovat další životní situace a postupně přidávat kvalitativní vodítka i k běžným tématům.</div>
  </section>`;
  write("audit/index.html", layout({
    path: "audit/", nav: "o-mape",
    title: "Audit obsahu | Mapa učení",
    desc: "Automatický audit slabších témat na Mapě učení: krátké texty, chybějící domácí tipy a návaznosti.",
    body
  }));
})();

/* Slovníček */
(function slovnicek() {
  const R = "../";
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Slovníček</div>
  <div class="page-title"><h1>Slovníček pojmů a zkratek</h1>
  <p class="lead">Zkratky, které padají na třídních schůzkách a v doporučeních z poradny — přeložené do lidštiny.</p></div>
  <div class="cards">${GLOSS.map(g => `<div class="gl"><b>${g.z}</b><p>${g.v}</p></div>`).join("")}</div>`;
  write("slovnicek/index.html", layout({
    path: "slovnicek/", nav: "slovnicek",
    title: "Slovníček školních zkratek: ŠVP, IVP, PPP, DiPSy… | Mapa učení",
    desc: "Co znamenají zkratky ze třídních schůzek a poradenských zpráv: RVP, ŠVP, JPZ, DiPSy, PPP, SPC, IVP, PLPP, asistent pedagoga a další.",
    body
  }));
})();

/* O mapě */
(function omape() {
  const R = "../";
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › O mapě</div>
  <div class="page-title"><h1>O mapě</h1></div>
  <article class="notebook"><div class="inner">
    <p class="blockt">Proč tahle mapa existuje</p>
    <p style="max-width:640px">Rodič se od dítěte dozví, že „berou vzory“, a nemá jak rychle zjistit, co to obnáší, jestli je to v pořádku na daný věk a k čemu to vede. Mapa učení každé téma vysvětluje lidsky: co znamená, jak poznáte zvládnutí, jak pomoci doma a co následuje.</p>
    <p class="blockt">Z čeho vychází</p>
    <p style="max-width:640px">Obsah je postaven na Rámcovém vzdělávacím programu pro základní vzdělávání (RVP ZV), který vydává MŠMT, a na běžné praxi českých škol. Protože si každá škola tvoří vlastní ŠVP, zařazení tématu do ročníku berte jako obvyklé, ne závazné.</p>
    <p class="blockt">Co mapa není</p>
    <p style="max-width:640px">Není to diagnostický nástroj ani měřítko, podle kterého dítě „zaostává“. Věkové údaje jsou typické, ne termíny. Když si nejste jistí, první adresa je vždy třídní učitel — zná vaše dítě, my ne.</p>
    <p class="blockt">Jak hlídáme kvalitu</p>
    <p style="max-width:640px">Součástí webu je i <a href="${R}audit/">audit obsahu</a>, který automaticky hledá témata s krátkým textem, slabší domácí pomocí nebo chybějící návazností. Je to pracovní seznam pro další doplňování, ne hodnocení dítěte ani školy.</p>
  </div></article>`;
  write("o-mape/index.html", layout({
    path: "o-mape/", nav: "o-mape",
    title: "O mapě | Mapa učení",
    desc: "Mapa učení je nezávislý průvodce českým základním vzděláváním pro rodiče. Vychází z RVP ZV a běžné praxe škol.",
    body
  }));
})();

/* Hledat (klientské vyhledávání) */
(function hledat() {
  const R = "../";
  const skillSearchItems = SKILLS.map(s => {
    const isMilestone = s.p === "mil";
    return {
      id: s.id,
      type: isMilestone ? "milnik" : "tema",
      url: skillUrl(s),
      title: s.t,
      tag: isMilestone ? "Milník" : SUBJ[s.p].n,
      color: SUBJ[s.p].c,
      meta: `${s.r}. ročník · ${GRADES[s.r].age}`,
      p: s.p,
      cermat: (CERMAT_BADGES_BY_SKILL.get(s.id) || []).map(exam => exam.id),
      lead: s.co.slice(0, s.co.indexOf(".") + 1),
      txt: norm(s.t + " " + s.co + " " + s.jak.join(" ") + " " + (s.doma || []).join(" ") + " " + s.dal + " " + SUBJ[s.p].n)
    };
  });
  const parentPathSearchItems = PPATHS.map(path => {
    const linked = path.skillIds.map(byId).filter(Boolean).map(s => s.t).join(" ");
    return {
      id: `path-${path.id}`,
      type: "path",
      url: parentPathUrl(path),
      title: path.title,
      tag: "Rodičovská cesta",
      color: "var(--green)",
      meta: `${path.skillIds.length} navázaných témat`,
      p: "",
      cermat: [],
      lead: path.lead,
      txt: norm([path.title, path.lead, ...(path.signs || []), ...(path.firstSteps || []), path.typicalMistake, path.childQuestion, path.homeActivity, path.teacherSignal, linked].join(" "))
    };
  });
  const situationSearchItems = SITUATIONS.map(situation => {
    const linked = situation.skillIds.map(byId).filter(Boolean).map(s => s.t).join(" ");
    return {
      id: `situation-${situation.id}`,
      type: "situace",
      url: situationUrl(situation),
      title: situation.title,
      tag: "Situace",
      color: "var(--blue)",
      meta: `${situation.skillIds.length} navázaných témat`,
      p: "",
      cermat: [],
      lead: situation.lead,
      txt: norm([situation.title, situation.lead, ...(situation.whatMatters || []), ...(situation.homeSteps || []), ...(situation.schoolQuestions || []), situation.watchOut, linked].join(" "))
    };
  });
  const cermatSearchItems = [{
    id: "cermat",
    type: "cermat",
    url: "cermat/",
    title: "Cermat příprava",
    tag: "Cermat",
    color: "var(--green)",
    meta: "5. a 9. třída",
    p: "",
    cermat: ["5", "9"],
    lead: "Přijímačková příprava navázaná na témata matematiky a češtiny.",
    txt: norm("cermat přijímačky přijímací zkoušky testy matematika čeština pátá devátá")
  }]
    .concat(CERMAT.exams.map(exam => ({
      id: `cermat-${exam.id}`,
      type: "cermat",
      url: cermatExamUrl(exam),
      title: exam.title,
      tag: "Cermat",
      color: "var(--green)",
      meta: exam.label,
      p: "",
      cermat: [exam.id],
      lead: exam.desc,
      txt: norm([exam.title, exam.label, exam.desc, ...exam.subjects.map(subject => subject.title + " " + subject.lead)].join(" "))
    })))
    .concat(CERMAT.exams.flatMap(exam => exam.subjects.map(subject => ({
      id: `cermat-${exam.id}-${subject.id}`,
      type: "cermat",
      url: cermatSubjectUrl(exam, subject),
      title: `${exam.label}: ${subject.title}`,
      tag: "Cermat",
      color: "var(--green)",
      meta: `${subject.duration} · ${subject.points}`,
      p: subject.subjectKey,
      cermat: [exam.id],
      lead: subject.lead,
      txt: norm([exam.title, exam.label, subject.title, subject.shortTitle, subject.lead, ...subject.groups.map(group => group.title + " " + group.why + " " + group.watchOut)].join(" "))
    }))));
  const supplementarySearchItems = SUPP.fields.map(field => ({
    id: `supp-${field.id}`,
    type: "supplementary",
    url: supplementaryUrl(field),
    title: field.title,
    tag: "Doplňující obor",
    color: "var(--red)",
    meta: `${field.relatedSkillIds.length} navázaných témat`,
    p: "",
    cermat: [],
    lead: field.lead,
    txt: norm([field.title, field.shortTitle, field.lead, field.stage1, field.stage2, ...(field.benefits || []), ...(field.quality || []), field.watchOut].join(" "))
  }));
  const pageSearchItems = [
    {
      id: "pomoc",
      type: "help",
      url: "pomoc/",
      title: "Pomoc pro rodiče",
      tag: "Pomoc",
      color: "var(--green)",
      meta: "rozcestník",
      lead: "Když dítě nestíhá, rodičovské cesty a praktické školní situace.",
      txt: norm("pomoc pro rodiče dítě nestíhá rodičovské cesty situace odklad zápis poradna škola")
    },
    {
      id: "kdyz-dite-nestiha",
      type: "help",
      url: "kdyz-dite-nestiha/",
      title: "Když dítě nestíhá",
      tag: "Pomoc",
      color: "var(--green)",
      meta: "průvodce",
      lead: "Jak zmapovat problém, zmenšit tlak a domluvit podporu doma, se školou nebo poradnou.",
      txt: norm("když dítě nestíhá škola učitel ppp spc plpp ivp podpůrná opatření stres čtení psaní matematika")
    },
    {
      id: "milniky",
      type: "milnik",
      url: "milniky/",
      title: "Milníky a zkoušky",
      tag: "Milník",
      color: SUBJ.mil.c,
      meta: "rozcestník",
      lead: "Přijímačky, dokončení základního vzdělání a další školní události pohromadě.",
      txt: norm("milníky zkoušky přijímačky gympl střední škola dokončení základního vzdělání")
    },
    {
      id: "rvp",
      type: "rules",
      url: "rvp/",
      title: "RVP",
      tag: "RVP / pravidla",
      color: "var(--green)",
      meta: "pokrytí výstupů",
      lead: "Mapování témat na očekávané výstupy RVP ZV.",
      txt: norm("rvp rámcový vzdělávací program očekávané výstupy školní vzdělávací program švp mapování")
    },
    {
      id: "zakony",
      type: "rules",
      url: "zakony/",
      title: "Zákony a pravidla",
      tag: "RVP / pravidla",
      color: "var(--blue)",
      meta: "orientace",
      lead: "Povinná školní docházka, zápisy, přijímačky, podpůrná opatření a školní pravidla.",
      txt: norm("zákony pravidla školský zákon povinná školní docházka zápis odklad přijímačky podpůrná opatření")
    },
    {
      id: "slovnicek",
      type: "rules",
      url: "slovnicek/",
      title: "Slovníček pojmů a zkratek",
      tag: "RVP / pravidla",
      color: "var(--red)",
      meta: "zkratky",
      lead: "ŠVP, IVP, PPP, DiPSy a další školní zkratky přeložené do lidštiny.",
      txt: norm(["slovníček zkratky pojmy", ...GLOSS.map(g => g.z + " " + g.v)].join(" "))
    }
  ].map(item => ({ ...item, p: "", cermat: [] }));
  const index = skillSearchItems
    .concat(parentPathSearchItems)
    .concat(situationSearchItems)
    .concat(cermatSearchItems)
    .concat(supplementarySearchItems)
    .concat(pageSearchItems);
  const searchData = `window.SEARCH=${JSON.stringify({ items: index, syn: SYN })};`;
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
  fs.writeFileSync(path.join(OUT, "assets", "search-data.js"), searchData, "utf8");

  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Hledání</div>
  <div class="page-title"><h1 id="stitle">Hledání</h1><p class="lead" id="scount"></p></div>
  <form class="searchbox" style="margin:10px 0 26px;max-width:640px" action="./" method="get" role="search">
    <input type="search" name="q" id="q" list="topics" aria-label="Hledat učivo" placeholder="Zkuste: vyjmenovaná slova, zlomky…">
    <button class="sbtn" type="submit" aria-label="Hledat">→</button>
    ${DATALIST}
  </form>
  <div class="search-filters" aria-label="Filtr hledání">
    <a data-filter="all" href="./">Všechno</a>
    <a data-filter="cermat5" href="?cermat=5">Cermat 5</a>
    <a data-filter="cermat9" href="?cermat=9">Cermat 9</a>
    <a data-filter="m" href="?predmet=m">Matematika</a>
    <a data-filter="cj" href="?predmet=cj">Čeština</a>
    <a data-filter="help" href="?typ=help">Pomoc</a>
    <a data-filter="situace" href="?typ=situace">Situace</a>
    <a data-filter="path" href="?typ=path">Rodičovské cesty</a>
    <a data-filter="milnik" href="?typ=milnik">Milníky</a>
    <a data-filter="rules" href="?typ=rules">RVP/pravidla</a>
  </div>
  <div id="sresults"></div>`;
  const extraScript = `<script src="${R}assets/search-data.js"></script>
<script>
(function(){
  "use strict";
  var norm=function(s){return s.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();};
  var esc=function(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");};
  var q=(new URLSearchParams(location.search).get("q")||"").trim();
  var cermat=(new URLSearchParams(location.search).get("cermat")||"").trim();
  var predmet=(new URLSearchParams(location.search).get("predmet")||"").trim();
  var typ=(new URLSearchParams(location.search).get("typ")||"").trim();
  document.getElementById("q").value=q;
  var form=document.querySelector('form[role="search"]');
  if(form&&cermat)form.insertAdjacentHTML("beforeend",'<input type="hidden" name="cermat" value="'+esc(cermat)+'">');
  if(form&&predmet)form.insertAdjacentHTML("beforeend",'<input type="hidden" name="predmet" value="'+esc(predmet)+'">');
  if(form&&typ)form.insertAdjacentHTML("beforeend",'<input type="hidden" name="typ" value="'+esc(typ)+'">');
  var out=document.getElementById("sresults"),count=document.getElementById("scount"),title=document.getElementById("stitle");
  var active=document.querySelector('[data-filter="'+(cermat==="5"?"cermat5":cermat==="9"?"cermat9":predmet||typ||"all")+'"]');
  if(active)active.classList.add("active");
  var params=[];
  if(cermat)params.push("cermat="+encodeURIComponent(cermat));
  if(predmet)params.push("predmet="+encodeURIComponent(predmet));
  if(typ)params.push("typ="+encodeURIComponent(typ));
  if(params.length){
    document.querySelectorAll(".search-filters a").forEach(function(a){
      var href=a.getAttribute("href");
      a.setAttribute("href",href+(href.indexOf("?")>-1?"&":"?")+"q="+encodeURIComponent(q));
    });
  }
  if(!q&&!cermat&&!predmet&&!typ){count.textContent="Zadejte učivo nebo situaci — třeba „zlomky“, „odklad“, „nestíhá“ nebo „gympl“.";return;}
  var typeLabels={help:"Pomoc",situace:"Situace",path:"Rodičovské cesty",milnik:"Milníky",rules:"RVP/pravidla"};
  var label=cermat?("Cermat "+cermat):(predmet==="m"?"Matematika":predmet==="cj"?"Čeština":(typeLabels[typ]||"Výsledky"));
  title.textContent=q?("Výsledky pro \\u201E"+q+"\\u201C"):(label);
  document.title=(q?("Hledání: "+q):label)+" | Mapa učení";
  var nq=norm(q),cands=[nq];
  var tokens=nq.split(/\\s+/).filter(function(t){return t.length>1;});
  Object.keys(SEARCH.syn).forEach(function(k){if(nq.indexOf(k)>-1)cands.push(norm(SEARCH.syn[k]));});
  var res=SEARCH.items.filter(function(it){
    var textOk=!q||cands.some(function(c){return c&&it.txt.indexOf(c)>-1;})||tokens.every(function(t){return it.txt.indexOf(t)>-1;});
    var cermatOk=!cermat||it.cermat.indexOf(cermat)>-1;
    var predmetOk=!predmet||it.p===predmet;
    var typeOk=!typ||it.type===typ;
    return textOk&&cermatOk&&predmetOk&&typeOk;
  }).sort(function(a,b){
    if(!q)return 0;
    var at=norm(a.title),bt=norm(b.title);
    var score=function(it,title){
      var sc=0;
      if(title===nq)sc+=100;
      if(title.indexOf(nq)>-1)sc+=60;
      tokens.forEach(function(t){
        if(title.indexOf(t)>-1)sc+=10;
        if(it.txt.indexOf(t)>-1)sc+=1;
      });
      if(it.type!=="tema")sc+=3;
      return sc;
    };
    return score(b,bt)-score(a,at);
  });
  count.textContent=res.length?("Nalezeno "+res.length+" "+(res.length===1?"výsledek":res.length<5?"výsledky":"výsledků")+"."):"";
  if(!res.length){out.innerHTML='<div class="noresults">Nic jsme nenašli. Zkuste jiné slovo (např. „zlomky“, „shoda“, „násobilka“) — nebo projděte ročníky přes <a href="../">přehled</a>.</div>';return;}
  out.innerHTML='<div class="cards">'+res.map(function(s){
    var badges=s.cermat.length?'<span class="cermat-badges"><span>Cermat '+esc(s.cermat.join("+"))+'</span></span>':"";
    var skillAttr=s.type==="tema"||s.type==="milnik"?' data-skill-id="'+s.id+'"':"";
    return '<a class="card"'+skillAttr+' href="../'+s.url+'">'
      +'<span class="tag" style="background:'+s.color+'">'+esc(s.tag)+'</span>'
      +'<h3>'+esc(s.title)+'</h3><p>'+esc(s.lead)+'</p>'
      +badges
      +'<span class="meta">'+esc(s.meta)+'</span></a>';
  }).join("")+'</div>';
})();
</script>`;
  write("hledat/index.html", layout({
    path: "hledat/", nav: "home",
    title: "Hledání | Mapa učení",
    desc: "Vyhledávání v učivu 1.–9. ročníku základní školy.",
    body, extraScript,
    extraHead: '<meta name="robots" content="noindex">'
  }));
})();

/* 404 */
write("404.html", layout({
  path: "", nav: "home",
  title: "Stránka nenalezena | Mapa učení",
  desc: "Stránka nenalezena.",
  body: `
  <section class="hero">
    <h1>Tady nic není <span class="hand" style="font-size:1.6em">(prázdná stránka sešitu)</span></h1>
    <p class="sub">Stránka neexistuje nebo se přestěhovala. Zkuste hledání, nebo začněte od přehledu ročníků.</p>
    <form class="searchbox" action="hledat/" method="get" role="search">
      <input type="search" name="q" placeholder="Hledat učivo…" aria-label="Hledat učivo">
      <button class="sbtn" type="submit" aria-label="Hledat">→</button>
    </form>
    <p class="pop"><a href="./">← Zpět na úvod</a></p>
  </section>`
}));

/* ---------- assets, sitemap, robots ---------- */
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
["style.css", "app.js", "favicon.svg"].forEach(f =>
  fs.copyFileSync(path.join(__dirname, "assets", f), path.join(OUT, "assets", f)));
fs.writeFileSync(path.join(OUT, ".nojekyll"), "", "utf8");

const cermatUrls = ["cermat/"]
  .concat(CERMAT.exams.map(cermatExamUrl))
  .concat(CERMAT.exams.flatMap(exam => exam.subjects.map(subject => cermatSubjectUrl(exam, subject))));
const supplementaryUrls = ["doplnujici-obory/"].concat(SUPP.fields.map(supplementaryUrl));
const parentPathUrls = ["rodicovske-cesty/"].concat(PPATHS.map(parentPathUrl));
const situationUrls = ["situace/"].concat(SITUATIONS.map(situationUrl));
const urls = ["", "predmety/", "pomoc/", "milniky/", "kdyz-dite-nestiha/", "kalendar/", "zakony/", "rvp/", "slovnicek/", "o-mape/", "audit/"]
  .concat(supplementaryUrls)
  .concat(parentPathUrls)
  .concat(situationUrls)
  .concat(cermatUrls)
  .concat(Array.from({ length: 9 }, (_, i) => `rocnik/${i + 1}/`))
  .concat(SKILLS.map(skillUrl));
fs.writeFileSync(path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${SITE_URL}/${u}</loc></url>`).join("\n") + `\n</urlset>\n`, "utf8");
fs.writeFileSync(path.join(OUT, "robots.txt"),
  `User-agent: *\nAllow: /\nDisallow: /hledat/\nSitemap: ${SITE_URL}/sitemap.xml\n`, "utf8");

console.log(`Hotovo: ${urls.length + 2} stránek → ${OUT}`);
console.log(`Sitemap a canonical používají: ${SITE_URL}  (změňte přes SITE_URL=... node build.js)`);
