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

const CERMAT_BY_SKILL = new Map();
CERMAT.exams.forEach(exam => exam.subjects.forEach(subject => subject.groups.forEach(group => {
  group.skillIds.forEach(skillId => {
    if (!CERMAT_BY_SKILL.has(skillId)) CERMAT_BY_SKILL.set(skillId, []);
    CERMAT_BY_SKILL.get(skillId).push({ exam, subject, group });
  });
})));

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
      ${navLink("cermat/", "cermat", "Cermat")}
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
  return `<a class="card" data-skill-id="${s.id}" href="${R}${skillUrl(s)}">
    <span class="tag" style="background:${su.c}">${su.n}</span>
    <h3>${s.t}</h3>
    <p>${s.co.slice(0, s.co.indexOf(".") + 1)}</p>
    <span class="meta">${s.r}. ročník · ${GRADES[s.r].age}</span>
  </a>`;
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

const DATALIST = `<datalist id="topics">${SKILLS.map(s => `<option value="${esc(s.t)}">`).join("")}</datalist>`;

function rvpOutcomeLink(id, R) {
  const o = RVP_OUT[id];
  if (!o) return `<span class="rvp-ref missing">${esc(id)}</span>`;
  return `<a class="rvp-ref" href="${R}rvp/#${esc(id)}"><b>${esc(id)}</b><span>${esc(o.text)}</span></a>`;
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
  const rvpDetail = refs.length
    ? `<div class="rvp-links">${refs.map(id => rvpOutcomeLink(id, R)).join("")}</div>
       <p class="rvp-note">Mapování je orientační: RVP stanovuje výstupy pro období, konkrétní ročník určuje škola ve svém ŠVP.</p>`
    : esc(s.rvp);
  const cermatDetail = cermatRefs.length
    ? `<div class="cermatbox"><b>Vazba na Cermat:</b>
      <div class="cermat-links">${cermatRefs.map(ref => `<a href="${R}${cermatSubjectUrl(ref.exam, ref.subject)}#${esc(ref.group.id)}"><span>${esc(ref.exam.label)} · ${esc(ref.subject.shortTitle)}</span><b>${esc(ref.group.title)}</b></a>`).join("")}</div>
      <p>Vazba ukazuje, kde se téma typicky vrací v jednotné přijímací zkoušce. Konkrétní zadání se rok od roku mění.</p></div>`
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
        return `<section class="cermat-group" id="${esc(group.id)}">
          <div class="cermat-group-head">
            <span class="tag" style="background:${subjectColor}">${esc(subject.shortTitle)}</span>
            <h2>${esc(group.title)}</h2>
          </div>
          <p>${esc(group.why)}</p>
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
  const mappedSkillIds = new Set(SKILLS.filter(s => (s.rvpRefs || []).length).map(s => s.id));
  const subjectCounts = Object.fromEntries(Object.keys(SUBJ).map(p => [p, SKILLS.filter(s => s.p === p).length]));
  const unmappedBySubject = Object.keys(SUBJ)
    .map(p => ({ key: p, name: SUBJ[p].n, count: SKILLS.filter(s => s.p === p && !(s.rvpRefs || []).length).length }))
    .filter(x => x.count);
  const topicWord = n => n === 1 ? "téma" : (n > 1 && n < 5) ? "témata" : "témat";
  const topicVerb = n => (n > 1 && n < 5) ? "nemají" : "nemá";
  const skillLinks = ids => ids.length
    ? ids.map(id => {
      const s = byId(id);
      return s ? `<a href="${R}${skillUrl(s)}">${esc(s.t)}</a>` : "";
    }).filter(Boolean).join(" · ")
    : '<span class="muted">Zatím bez přiřazeného tématu</span>';
  const fieldStatus = field => {
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
  const body = `
  <div class="crumbs"><a href="${R}">Mapa učení</a> › Pokrytí RVP</div>
  <div class="page-title"><h1>Pokrytí RVP</h1>
  <p class="lead">Strojově kontrolované mapování témat na očekávané výstupy RVP ZV. U importovaných oborů je vidět pokrytí výstupů, navázaná témata i mezery, které ještě čekají na doplnění.</p></div>
  <div class="metrics">
    <div><b>${outcomes.length}</b><span>importovaných výstupů RVP</span></div>
    <div><b>${mappedOutcomes.length}</b><span>výstupů s tématem</span></div>
    <div><b>${mappedSkillIds.size}</b><span>témat s rvpRefs</span></div>
    <div><b>${SKILLS.length - mappedSkillIds.size}</b><span>${topicWord(SKILLS.length - mappedSkillIds.size)} čeká na mapování</span></div>
  </div>
  <div class="infobox"><b>Jak to číst:</b> RVP stanovuje výstupy pro období a stupně, nikoli pevné ročníky. Pokrytí proto ukazuje vazbu témat na RVP výstupy; ročníkové zařazení zůstává orientační.</div>
  <section class="section">
    <div class="sec-head"><h2>Oblasti a obory</h2></div>
    ${RVP.areas.map(area => `<div class="rvp-area">
      <h3>${esc(area.name)}</h3>
      ${area.fields.map(fieldStatus).join("")}
    </div>`).join("")}
  </section>
  <section class="section">
    <div class="sec-head"><h2>Importované výstupy</h2><span class="cnt">Klikněte na čísla u oborů výše pro skok na sekci</span></div>
    ${outcomeSections}
  </section>
  <section class="section">
    <div class="sec-head"><h2>Témata bez mapování</h2></div>
    <div class="cards">${unmappedBySubject.map(s => `<div class="gl"><b>${esc(s.name)}</b><p>${s.count} ${topicWord(s.count)} zatím ${topicVerb(s.count)} strojové RVP vazby.</p></div>`).join("")}</div>
  </section>`;
  write("rvp/index.html", layout({
    path: "rvp/", nav: "rvp",
    title: "Pokrytí RVP ZV | Mapa učení",
    desc: "Přehled pokrytí očekávaných výstupů RVP ZV tématy na Mapě učení.",
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
  const index = SKILLS.map(s => ({
    slug: s.slug, t: s.t, r: s.r, age: GRADES[s.r].age,
    pn: SUBJ[s.p].n, c: SUBJ[s.p].c, id: s.id,
    lead: s.co.slice(0, s.co.indexOf(".") + 1),
    txt: norm(s.t + " " + s.co + " " + s.jak.join(" ") + " " + (s.doma || []).join(" ") + " " + SUBJ[s.p].n)
  }));
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
  <div id="sresults"></div>`;
  const extraScript = `<script src="${R}assets/search-data.js"></script>
<script>
(function(){
  "use strict";
  var norm=function(s){return s.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();};
  var esc=function(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");};
  var q=(new URLSearchParams(location.search).get("q")||"").trim();
  document.getElementById("q").value=q;
  var out=document.getElementById("sresults"),count=document.getElementById("scount"),title=document.getElementById("stitle");
  if(!q){count.textContent="Zadejte, co se vaše dítě právě učí — třeba „zlomky“ nebo „gympl“.";return;}
  title.textContent="Výsledky pro \\u201E"+q+"\\u201C";
  document.title="Hledání: "+q+" | Mapa učení";
  var nq=norm(q),cands=[nq];
  Object.keys(SEARCH.syn).forEach(function(k){if(nq.indexOf(k)>-1)cands.push(norm(SEARCH.syn[k]));});
  var res=SEARCH.items.filter(function(it){return cands.some(function(c){return c&&it.txt.indexOf(c)>-1;});});
  count.textContent=res.length?("Nalezeno "+res.length+" "+(res.length===1?"téma":res.length<5?"témata":"témat")+"."):"";
  if(!res.length){out.innerHTML='<div class="noresults">Nic jsme nenašli. Zkuste jiné slovo (např. „zlomky“, „shoda“, „násobilka“) — nebo projděte ročníky přes <a href="../">přehled</a>.</div>';return;}
  out.innerHTML='<div class="cards">'+res.map(function(s){
    return '<a class="card" data-skill-id="'+s.id+'" href="../dovednost/'+s.slug+'/">'
      +'<span class="tag" style="background:'+s.c+'">'+esc(s.pn)+'</span>'
      +'<h3>'+esc(s.t)+'</h3><p>'+esc(s.lead)+'</p>'
      +'<span class="meta">'+s.r+'. ročník · '+s.age+'</span></a>';
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
const urls = ["", "predmety/", "kalendar/", "zakony/", "rvp/", "slovnicek/", "o-mape/"]
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
