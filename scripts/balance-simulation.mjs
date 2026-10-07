import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { APP_VERSION } from "../packaging/runtime/persistence.js";
import { poolIds, runMatch, summarizeMatches } from "./simulation.mjs";
const option = (key, fallback) => process.argv.find(a => a.startsWith("--" + key + "="))?.slice(key.length + 3) ?? fallback;
const games = Number(option("games", 25)), pool = option("pool", "mixed"), mode = option("mode", "ranked2v2"), scenario = option("scenario", "balance"), seedBase = Number(option("seed", 20260917));
const selected = option("characters", poolIds(pool).join(",")).split(","), matches = [];
if (!Number.isInteger(games) || games < 1) throw new Error("games必须为正整数");
if (!["balance", "pressure", "franky-chopper"].includes(scenario)) throw new Error(`未知scenario：${scenario}`);
if (scenario === "balance") {
  for (const characterId of selected) for (const anchor of [0, 1, 2, 3]) {
    for (let i = 0; i < games; i++) matches.push(runMatch({ seed: seedBase + anchor * 100000 + i * 7919, pool, mode, characterId, anchor }));
    console.error(characterId + " anchor=" + anchor + " 完成 " + games + "局");
  }
} else for (let i = 0; i < games; i++) matches.push(runMatch({ seed: seedBase + i * 7919, pool, mode, anchor: i % 4, scenario }));
const sourceHash = createHash("sha256");
for (const path of ["../src/engine.js", "../src/data.js", "../src/packs/one-piece.js", "./simulation.mjs"]) sourceHash.update(readFileSync(new URL(path, import.meta.url)));
const report = { version: APP_VERSION, sourceHash: sourceHash.digest("hex"), pool, mode, scenario, seedBase, seedStep: 7919, seeds: scenario === "balance" ? [0,1,2,3].map(anchor => ({ anchor, first: seedBase + anchor * 100000, last: seedBase + anchor * 100000 + (games - 1) * 7919, gamesPerCharacter: games })) : { first: seedBase, last: seedBase + (games - 1) * 7919 }, generatedAt: new Date().toISOString(), ...summarizeMatches(matches, scenario === "balance") };
const output = option("output", "");
if (output) {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2));
  if (option("matches", "false") === "true") writeFileSync(output.replace(/\.json$/, "") + ".matches.jsonl", matches.map(m => JSON.stringify(m)).join("\n"));
}
console.log(JSON.stringify({ ...report, roles: undefined }));
console.log("character\tanchor\tgames\twinRate\tawakenRate\tavgAwakenRound\tactiveEffective\tsignatureEffective");
for (const row of report.roles) console.log([row.character, row.anchor, row.games, row.winRate.toFixed(2), row.awakenRate.toFixed(2), row.avgAwakenRound?.toFixed(2) ?? "-", row.metrics.activeEffective, row.metrics.signatureEffective].join("\t"));
if (report.unfinished || Object.keys(report.residual).length || report.over80) process.exitCode = 1;
