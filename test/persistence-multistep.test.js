import test from "node:test";
import assert from "node:assert/strict";
import { GameSession, restoreSavedMatch, SAVE_KEY } from "../packaging/runtime/persistence.js";

class Storage {
  values = new Map();
  getItem(k) { return this.values.get(k) ?? null; }
  setItem(k, v) { this.values.set(k, v); }
  removeItem(k) { this.values.delete(k); }
}
function create(id, seed = 114) {
  return new GameSession({ config: { modeId: "ranked2v2", humanCharacterId: id, fixedAnchorSeat: 0 }, seed, storage: new Storage() });
}
function snapshot(engine) {
  return JSON.parse(JSON.stringify(engine, (key, value) => {
    if (["logs", "visualEvents", "random"].includes(key) || typeof value === "function") return undefined;
    return value instanceof Set ? [...value] : value;
  }));
}
function checkpoint(session) {
  assert.equal(session.saveNow().ok, true);
  const restored = restoreSavedMatch(session.storage).session;
  assert.deepEqual(snapshot(restored.engine), snapshot(session.engine));
  assert.equal(JSON.parse(session.storage.getItem(SAVE_KEY)).schemaVersion, 2);
  return restored;
}
function finishChoices(session) {
  let steps = 0;
  while (session.engine.pendingChoice || session.engine.pendingDiscard) {
    session = checkpoint(session);
    const g = session.engine;
    if (g.pendingChoice) session.execute("resolveChoice", g.pendingChoice.playerId, g.pendingChoice.options[0].value);
    else {
      const d = g.pendingDiscard;
      session.execute("confirmDiscard", d.playerId, d.allowedUids.slice(0, d.count));
    }
    assert.ok(++steps < 12, "选择必须有确定的终点");
  }
  return { session: checkpoint(session), steps };
}
test("娜美航海术每一步选牌及置顶置底窗口可确定性恢复", () => {
  let s = create("nami");
  assert.equal(s.execute("useActiveSkill", "p0", "p0").pending, true);
  const done = finishChoices(s);
  assert.equal(done.steps, 3); assert.equal(done.session.engine.player("p0").navigationWind, true);
});
test("乌索普暗置谎言选择与后续触发可确定性恢复", () => {
  let s = create("usopp"); s.execute("draw", "p0", 8);
  assert.equal(s.execute("useActiveSkill", "p0", "p1").pending, true);
  s = finishChoices(s).session;
  assert.equal(s.engine.player("p0").specialCards.filter(c => c.kind === "lie").length, 1);
  const usable = s.engine.player("p1").hand.find(c => !c.responseOnly);
  assert.ok(usable);
  const targets = s.engine.getCardTargets("p1", usable);
  s.execute("playCard", "p1", usable.uid, targets[0] || "p1", { freeUse: true });
  s = finishChoices(s).session;
  assert.equal(s.engine.player("p0").specialCards.filter(c => c.kind === "lie").length, 0);
});
test("罗宾查看和同类别封存窗口恢复后不重复摸牌或封存", () => {
  let s = create("robin"); s.execute("draw", "p0", 20);
  assert.equal(s.execute("useActiveSkill", "p0", "p1").pending, true);
  s = checkpoint(s);
  const option = s.engine.pendingChoice.options.find(c => c.value !== "pass");
  assert.ok(option);
  s.execute("resolveChoice", "p0", option.value); s = checkpoint(s);
  assert.equal(s.engine.player("p1").sealedCards.length, 1);
  assert.equal(s.engine.player("p0").dreamState.progress, 1);
  s.execute("completeTurnStart", "p1"); s = checkpoint(s);
  assert.equal(s.engine.player("p1").sealedCards.length, 0);
});
test("罗宾百花缭乱声明后的私有查看在 schema 2 重放后保持同一张牌", () => {
  let s = create("robin");
  s.execute("draw", "p0", 20);
  const strategy = s.engine.player("p0").hand.find(card => card.type === "strategy" && !card.responseOnly && s.engine.getCardTargets("p0", card).includes("p1"));
  assert.ok(strategy);
  assert.ok(s.engine.player("p1").hand.length > 0);
  s.execute("playCard", "p0", strategy.uid, "p1");
  const before = s.engine.getVisibleCardPeeks("p0");
  assert.equal(before.length, 1);
  assert.deepEqual(s.engine.getVisibleCardPeeks("p1"), []);
  const progress = s.engine.player("p0").dreamState.progress;
  s = checkpoint(s);
  assert.deepEqual(s.engine.getVisibleCardPeeks("p0"), before);
  assert.equal(s.engine.player("p0").dreamState.progress, progress);
});
test("鹿丸末位落子在 schema 2 重放及下一轮仍标记同一目标", () => {
  let s = new GameSession({ config: { modeId: "ranked2v2", humanCharacterId: "shikamaru", fixedAnchorSeat: 1 }, seed: 114, storage: new Storage() });
  for (let step = 0; step < 3; step++) s.execute("startNextTurn");
  assert.equal(s.engine.currentPlayerId, "p0");
  assert.deepEqual(s.engine.turnQueue, []);
  assert.equal(s.execute("useActiveSkill", "p0", "p1").ok, true);
  s = checkpoint(s);
  assert.equal(s.engine.player("p0").chessTargetId, "p1");
  s.execute("startRound");
  s = checkpoint(s);
  assert.equal(s.engine.player("p0").chessTargetId, "p1");
});
test("乔巴觉醒医术弃牌后净化窗口恢复只清一层毒", () => {
  let s = create("chopper");
  for (let round = 1; round <= 3; round++) {
    s.execute("loseHp", "p2", 1, null, "skill"); s.execute("resolveHeal", "p0", "p2");
    s.execute("startRound");
  }
  assert.equal(s.engine.player("p0").dreamState.awakened, true);
  s.execute("applyPoison", "p2", 2);
  assert.equal(s.execute("useActiveSkill", "p0", "p2").pending, true);
  s = checkpoint(s);
  const d = s.engine.pendingDiscard;
  s.execute("confirmDiscard", "p0", d.allowedUids.slice(0, d.count));
  s = checkpoint(s);
  assert.ok(s.engine.pendingChoice.options.some(c => c.value === "poison"));
  s.execute("resolveChoice", "p0", "poison"); s = checkpoint(s);
  assert.equal(s.engine.player("p2").poison, 1);
});
test("甚平弃牌护航恢复后只授予一次护盾和航迹", () => {
  let s = create("jinbe"); assert.equal(s.execute("useActiveSkill", "p0", "p2").pending, true);
  s = finishChoices(s).session;
  assert.equal(s.engine.player("p2").shield, 1); assert.equal(s.engine.player("p0").dreamState.progress, 1);
});
test("裂隙收束第40轮及结束回合扣血可确定性恢复", () => {
  let s = create("hinata");
  for (let i = 0; i < 38; i++) s.execute("startRound");
  assert.equal(s.engine.round, 39); assert.equal(s.engine.riftCollapseActive, false);
  s = checkpoint(s); s.execute("startRound");
  assert.equal(s.engine.round, 40); assert.equal(s.engine.riftCollapseActive, true);
  s = checkpoint(s); const hp = s.engine.player("p0").hp;
  s.execute("endTurn", "p0"); s = finishChoices(s).session;
  assert.equal(s.engine.player("p0").hp, hp - 1);
  assert.equal(s.engine.currentPlayerId, "p1");
});
