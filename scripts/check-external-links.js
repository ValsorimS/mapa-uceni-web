#!/usr/bin/env node
"use strict";

const SOURCES = [
  "https://www.edu.cz/rvp-ramcove-vzdelavaci-programy/",
  "https://www.msmt.gov.cz/vzdelavani/zakladni-vzdelavani",
  "https://www.zakonyprolidi.cz/cs/2004-561",
  "https://prijimacky.cermat.cz/",
  "https://www.prihlaskynastredni.cz/",
  "https://www.msmt.gov.cz/vzdelavani/socialni-programy"
];

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "MapaUceniReleaseCheck/1.0" }
    });
    return { url, status: response.status, ok: response.status >= 200 && response.status < 400 };
  } catch (error) {
    return { url, status: "ERR", ok: false, error: error.message };
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  const results = await Promise.all(SOURCES.map(check));
  results.forEach(result => {
    console.log(`${result.ok ? "ok" : "fail"} ${result.status} ${result.url}${result.error ? ` (${result.error})` : ""}`);
  });
  if (results.some(result => !result.ok)) process.exit(1);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
