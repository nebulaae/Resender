"use strict";

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
let current = LEVELS.info;

function setLevel(name) {
  if (LEVELS[name] != null) current = LEVELS[name];
}

function log(level, ...args) {
  if ((LEVELS[level] ?? LEVELS.info) <= current) {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
    console.log(`[${ts}] [${level}]`, ...args);
  }
}

module.exports = { log, setLevel };
