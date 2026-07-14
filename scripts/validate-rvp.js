#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const rvp = readJson("data/rvp.json");
const skills = readJson("data/skills.json");

const errors = [];
const warnings = [];

function addUnique(items, label) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  for (const item of duplicates) errors.push(`Duplicate ${label}: ${item}`);
  return seen;
}

const periods = addUnique((rvp.periods || []).map(p => p.id), "RVP period id");
const fields = [];
for (const area of rvp.areas || []) {
  for (const field of area.fields || []) {
    fields.push(field.id);
    for (const periodId of field.periods || []) {
      if (!periods.has(periodId)) errors.push(`Unknown period "${periodId}" in field ${field.id}`);
    }
  }
}
const fieldIds = addUnique(fields, "RVP field id");
const skillIds = addUnique(skills.map(s => s.id), "skill id");
const outcomes = rvp.outcomes || [];
const outcomeIds = addUnique(outcomes.map(o => o.id), "RVP outcome id");

for (const outcome of outcomes) {
  if (!fieldIds.has(outcome.fieldId)) errors.push(`Outcome ${outcome.id} has unknown fieldId ${outcome.fieldId}`);
  if (!periods.has(outcome.periodId)) errors.push(`Outcome ${outcome.id} has unknown periodId ${outcome.periodId}`);
  for (const skillId of outcome.skillIds || []) {
    if (!skillIds.has(skillId)) errors.push(`Outcome ${outcome.id} references unknown skill ${skillId}`);
  }
}

for (const skill of skills) {
  if (skill.rvpRefs === undefined) continue;
  if (!Array.isArray(skill.rvpRefs)) {
    errors.push(`Skill ${skill.id} has non-array rvpRefs`);
    continue;
  }
  for (const ref of skill.rvpRefs) {
    if (!outcomeIds.has(ref)) errors.push(`Skill ${skill.id} references unknown RVP outcome ${ref}`);
  }
}

const mathSkills = skills.filter(s => s.p === "m");
const mathWithoutRefs = mathSkills.filter(s => !Array.isArray(s.rvpRefs) || s.rvpRefs.length === 0);
for (const skill of mathWithoutRefs) warnings.push(`Math skill ${skill.id} has no rvpRefs`);

if (errors.length) {
  console.error("RVP validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn("RVP validation warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

console.log(`RVP validation ok: ${outcomes.length} outcomes, ${skills.filter(s => s.rvpRefs).length} mapped skills`);
