import test from "node:test";
import assert from "node:assert/strict";
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

test("弗兰奇对乔巴专项使用二人完整角色状态", () => {
  const row = runMatch({ seed: 819, scenario: "franky-chopper" });
  assert.deepEqual(row.players.map(player => player.characterId).sort(), ["chopper", "franky"]);
  assert.ok(row.completed);
  assert.ok(row.rounds <= 80);
  assert.deepEqual(row.residual, {});
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
