#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DOCS = path.join(ROOT, "docs");

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function walk(dir, test, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, test, out);
    else if (test(full)) out.push(full);
  }
  return out;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function stripScripts(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

function checkLinks(files) {
  const missing = [];
  for (const file of files) {
    const html = stripScripts(read(file));
    const re = /(?:href|src)="([^"]+)"/g;
    let match;
    while ((match = re.exec(html))) {
      let url = match[1];
      if (/^(https?:|mailto:|tel:|data:|#)/.test(url)) continue;
      url = url.split("#")[0].split("?")[0];
      if (!url) continue;
      let target = path.resolve(path.dirname(file), url);
      if (url.endsWith("/")) target = path.join(target, "index.html");
      if (!path.extname(target)) target = path.join(target, "index.html");
      if (!target.startsWith(DOCS) || !fs.existsSync(target)) {
        missing.push(`${path.relative(DOCS, file)} -> ${match[1]}`);
      }
    }
  }
  if (missing.length) fail(`Broken internal links:\n${missing.slice(0, 50).join("\n")}`);
  else console.log(`Internal links ok: ${files.length} HTML files`);
}

function checkA11yAndSeo(files) {
  const findings = [];
  for (const file of files) {
    const html = read(file);
    const rel = path.relative(DOCS, file);
    if (!/<html lang="cs">/.test(html)) findings.push(`${rel}: missing lang=cs`);
    if (!/<meta name="viewport"/.test(html)) findings.push(`${rel}: missing viewport`);
    if (!/<title>[^<]{8,}<\/title>/.test(html)) findings.push(`${rel}: missing title`);
    if (!/<meta name="description" content="[^"]{40,}"/.test(html)) findings.push(`${rel}: weak meta description`);
    if (!/<link rel="canonical" href="https:\/\/[^"]+"/.test(html)) findings.push(`${rel}: missing canonical`);
    if (!/BreadcrumbList/.test(html)) findings.push(`${rel}: missing BreadcrumbList JSON-LD`);
    if (!/<h1[\s>]/.test(html)) findings.push(`${rel}: missing h1`);
    const buttons = html.match(/<button\b[\s\S]*?<\/button>/g) || [];
    buttons.forEach(button => {
      const text = button.replace(/<[^>]+>/g, "").trim();
      if (!/aria-label=/.test(button) && !text) findings.push(`${rel}: button without text/label`);
    });
    const inputs = html.match(/<input\b[^>]*>/g) || [];
    inputs.forEach(input => {
      const hasSignal = /(aria-label|id=|list=|name=|type="hidden"|type="checkbox"|type="radio"|type="submit")/.test(input);
      if (!hasSignal) findings.push(`${rel}: input without label signal`);
    });
  }
  if (findings.length) fail(`Accessibility/SEO findings:\n${findings.slice(0, 80).join("\n")}`);
  else console.log("Accessibility/SEO static checks ok");
}

function checkPwa() {
  const manifestPath = path.join(DOCS, "manifest.webmanifest");
  const swPath = path.join(DOCS, "sw.js");
  const manifest = JSON.parse(read(manifestPath));
  const sw = read(swPath);
  const requiredManifest = ["name", "short_name", "start_url", "scope", "display", "icons"];
  const missing = requiredManifest.filter(key => !manifest[key]);
  if (missing.length) fail(`Manifest missing: ${missing.join(", ")}`);
  if (manifest.start_url !== "./" || manifest.scope !== "./") fail("Manifest must use relative ./ start_url and scope for GitHub Pages.");
  if (!sw.includes("self.registration.scope")) fail("Service worker must use registration scope for project-page deployments.");
  if (!sw.includes("assets/search-data.js")) fail("Service worker core cache should include search data.");
  console.log("PWA checks ok");
}

function checkRootMirror() {
  const critical = ["index.html", "audit/index.html", "pomoc/index.html", "manifest.webmanifest", "sw.js", "assets/app.js"];
  const missing = critical.filter(rel => !fs.existsSync(path.join(ROOT, rel)));
  if (missing.length) fail(`Root mirror missing: ${missing.join(", ")}`);
  const rootIndex = read(path.join(ROOT, "index.html"));
  if (/url=docs\//.test(rootIndex)) fail("Root index still redirects to docs/.");
  console.log("Root mirror checks ok");
}

const files = walk(DOCS, file => file.endsWith(".html"));
checkLinks(files);
checkA11yAndSeo(files);
checkPwa();
checkRootMirror();

if (process.exitCode) process.exit(process.exitCode);
console.log("Release check ok");
