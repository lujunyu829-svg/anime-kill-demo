import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runMatch, summarizeMatches, poolIds } from "../scripts/simulation.mjs";

test("模拟汇总的P99使用轮数而非动作步数", () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ seed: i, rounds: i < 99 ? 8 : 20, steps: 400, winner: "azure", completed: true, residual: {}, players: [] }));
  const report = summarizeMatches(rows);
  assert.equal(report.p99Rounds, 8);
  assert.equal(report.maxRounds, 20);
  assert.equal(report.games, 100);
  assert.equal(report.camps.azure, 100);
});

test("固定种子纯包模拟保留逐局阵容和角色独立指标", () => {
  const options = { seed: 12345, pool: "one_piece_grand_line", characterId: "franky", anchor: 0 };
  const first = runMatch(options), second = runMatch(options);
  assert.deepEqual(first, second);
  assert.ok(first.completed);
  assert.equal(first.players.length, 4);
  assert.ok(first.players.every(player => poolIds("one_piece_grand_line").includes(player.characterId)));
  assert.ok(first.players.every(player => Number.isFinite(player.metrics.activeDeclared)));
  assert.ok(first.players.every(player => typeof player.alive === "boolean"));
  assert.equal(typeof first.riftCollapseActive, "boolean");
  assert.deepEqual(first.residual, {});
});

test("鬼灭纯包固定种子模拟只使用鬼灭角色", () => {
  assert.equal(poolIds("demon-slayer").length, 10);
  assert.equal(poolIds("mixed").length, 36);
  const options = { seed: 3030, pool: "demon_slayer_sun_moon", characterId: "tanjiro", anchor: 0 };
  const first = runMatch(options), second = runMatch(options);
  assert.deepEqual(first, second);
  assert.equal(first.players.length, 4);
  assert.ok(first.players.every(player => poolIds("demon_slayer_sun_moon").includes(player.characterId)));
});

test("鬼灭追迹属于有效主动技，不能因只设置状态而记为零效果", () => {
  const tanjiro = runMatch({ seed: 3030, pool: "demon-slayer", characterId: "tanjiro", anchor: 0 }).players[0];
  assert.ok(tanjiro.metrics.activeDeclared > 0);
  assert.ok(tanjiro.metrics.activeEffective > 0);
});

test("鬼灭报告含四座次等量样本、完整角色池和包代码哈希", () => {
  const dir = mkdtempSync(join(tmpdir(), "anime-kill-demon-report-"));
  try {
    const output = join(dir, "report.json");
    const script = fileURLToPath(new URL("../scripts/balance-simulation.mjs", import.meta.url));
    const result = spawnSync(process.execPath, [script, "--pool=demon-slayer", "--characters=tanjiro", "--games=1", "--seed=3030", `--output=${output}`], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(report.version, "0.3.0");
    assert.equal(report.games, 4);
    assert.equal(report.characterPool.length, 10);
    assert.deepEqual(report.seeds.map(item => item.gamesPerCharacter), [1, 1, 1, 1]);
    assert.deepEqual(report.roles.map(item => item.anchor).sort(), [0, 1, 2, 3]);
    const hash = createHash("sha256");
    for (const source of ["../src/engine.js", "../src/data.js", "../src/packs/one-piece.js", "../src/packs/demon-slayer.js", "../scripts/simulation.mjs"])
      hash.update(readFileSync(new URL(source, import.meta.url)));
    assert.equal(report.sourceHash, hash.digest("hex"));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("弗兰奇对乔巴专项使用二人完整角色状态", () => {
  const row = runMatch({ seed: 819, scenario: "franky-chopper" });
  assert.deepEqual(row.players.map(player => player.characterId).sort(), ["chopper", "franky"]);
  assert.ok(row.completed);
  assert.ok(row.rounds <= 80);
  assert.deepEqual(row.residual, {});
});

test("模拟命令拒绝拼错的专项名称，避免静默运行普通对局", () => {
  const script = fileURLToPath(new URL("../scripts/balance-simulation.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [script, "--scenario=franky_chopper", "--games=1"], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /scenario/);
});

test("招牌技统计记录声明费用，不把命中回能或防御返还扣除", () => {
  for (const id of ["kakashi", "yuji"]) {
    let uses = 0;
    for (let seed = 100; seed < 110; seed++) {
      const row = runMatch({ seed, characterId: id }).players.find(p => p.id === "p0");
      uses += row.metrics.signatureDeclared;
      assert.ok(Object.keys(row.metrics.signatureCosts).every(cost => cost === (id === "kakashi" ? "2" : "3")), id);
    }
    assert.ok(uses > 0, id + "至少实际发动一次");
  }
});

test("露琪亚白霞罚施加禁用出牌状态应计为有效招牌技", () => {
  const match = runMatch({ seed: 20268837, pool: "mixed", characterId: "rukia", anchor: 1 });
  const rukia = match.players.find(player => player.id === "p0");
  assert.ok(rukia.metrics.signatureDeclared >= 1);
  assert.ok(rukia.metrics.signatureEffective >= 1);
});
