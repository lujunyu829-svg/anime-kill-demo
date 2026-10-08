import test from "node:test";
import assert from "node:assert/strict";
import { cardDefinitions } from "../src/data.js";
import { GameEngine } from "../src/engine.js";
import { GameSession, restoreSavedMatch } from "../packaging/runtime/persistence.js";

function create() {
  const game = new GameEngine({ modeId: "ranked2v2", humanCharacterId: "tanjiro", fixedAnchorSeat: 0, random: () => 0.25 }).setup();
  for (const player of game.players) {
    player.hand = [];
    player.shield = 0;
    player.equipment = { weapon: null, armor: null, charm: null };
  }
  game.player("p1").characterId = "ichigo";
  return game;
}

test("嗅觉追迹花1能量、限距离2内敌方，私查只向炭治郎本人可见", () => {
  const game = create(), tanjiro = game.player("p0"), enemy = game.player("p1");
  tanjiro.energy = 1;
  enemy.hand = [{ ...cardDefinitions.guard, uid: "seen-guard" }];
  assert.deepEqual(game.getActiveSkillTargets("p0").sort(), ["p1", "p3"]);
  assert.equal(game.useActiveSkill("p0", "p1").ok, true);
  assert.equal(tanjiro.energy, 0);
  assert.equal(tanjiro.scentTargetId, "p1");
  assert.equal(game.getVisibleDemonSlayerState("p0", "p0").scentCardName, "防御");
  assert.equal(Object.hasOwn(game.getVisibleDemonSlayerState("p1", "p0"), "scentCardName"), false);
  assert.equal(game.getActiveSkillTargets("p0").length, 0);
  assert.ok(game.logs.every(row => !String(row.text || row.message || "").includes("seen-guard")));
});

test("无手牌目标仍可被嗅觉标记，标记到炭治郎下回合开始结束", () => {
  const game = create(), tanjiro = game.player("p0");
  tanjiro.energy = 1;
  assert.equal(game.useActiveSkill("p0", "p1").ok, true);
  assert.equal(tanjiro.scentTargetId, "p1");
  assert.equal(Object.hasOwn(game.getVisibleDemonSlayerState("p0", "p0"), "scentCardName"), false);
  game.turnNumber += 4;
  game.completeTurnStart("p0");
  assert.equal(tanjiro.scentTargetId, null);
});

test("破绽只在普通突击实际进入响应后消费并额外要求1防御", () => {
  const game = create(), tanjiro = game.player("p0"), enemy = game.player("p1");
  tanjiro.energy = 1;
  enemy.hand = [{ ...cardDefinitions.guard, uid: "one-guard" }];
  game.useActiveSkill("p0", "p1");
  game.notifyCardCancelled("p0", "取消", { ...cardDefinitions.attack, uid: "cancelled" }, "p1");
  assert.equal(tanjiro.scentTargetId, "p1");
  tanjiro.hand = [{ ...cardDefinitions.attack, uid: "scent-attack" }];
  enemy.hp = 4;
  game.playCard("p0", "scent-attack", "p1");
  assert.equal(enemy.hp, 3);
  assert.equal(enemy.hand.length, 1);
  assert.equal(tanjiro.scentTargetId, null);
});

test("水之呼吸须另弃1张牌才能回收被完全防住的那张突击", () => {
  const game = create(), tanjiro = game.player("p0"), enemy = game.player("p1");
  tanjiro.hand = [{ ...cardDefinitions.attack, uid: "water-attack" }, { ...cardDefinitions.focus, uid: "water-cost" }];
  enemy.hand = [{ ...cardDefinitions.guard, uid: "water-guard" }];
  assert.equal(game.playCard("p0", "water-attack", "p1").ok, true);
  assert.equal(game.pendingChoice?.title, "水之呼吸");
  game.resolveChoice("p0", "use");
  assert.equal(game.pendingDiscard?.count, 1);
  game.confirmDiscard("p0", ["water-cost"]);
  assert.deepEqual(tanjiro.hand.map(card => card.uid), ["water-attack"]);
  assert.equal(game.discard.some(card => card.uid === "water-attack"), false);
  assert.equal(tanjiro.attacksUsed, 1);
});

test("无其他手牌不能免费发动水之呼吸，旧版摸牌效果退出", () => {
  const game = create(), tanjiro = game.player("p0"), enemy = game.player("p1");
  tanjiro.hand = [{ ...cardDefinitions.attack, uid: "unpaid-attack" }];
  enemy.hand = [{ ...cardDefinitions.guard, uid: "unpaid-guard" }];
  game.playCard("p0", "unpaid-attack", "p1");
  assert.equal(game.pendingChoice, null);
  assert.equal(tanjiro.hand.length, 0);
  assert.equal(game.discard.some(card => card.uid === "unpaid-attack"), true);

  const fresh = create();
  fresh.deck = ["top-1", "top-2", "top-3"].map(uid => ({ ...cardDefinitions.guard, uid }));
  fresh.player("p0").hand = [];
  fresh.completeTurnStart("p0");
  assert.equal(fresh.player("p0").hand.length, 1);
});

test("呼吸衔接在声明普通突击时二选一，实际结算才消耗呼吸态", () => {
  for (const [choice, expectedHp] of [["damage", 2], ["guard", 3]]) {
    const game = create(), tanjiro = game.player("p0"), enemy = game.player("p1");
    tanjiro.breathReady = 1;
    tanjiro.breathSetTurn = game.turnNumber;
    tanjiro.roundFlags.breathGained = true;
    tanjiro.hand = [{ ...cardDefinitions.attack, uid: `breath-${choice}` }];
    enemy.hp = 4;
    if (choice === "guard") enemy.hand = [{ ...cardDefinitions.guard, uid: "guard-one" }];
    assert.equal(game.playCard("p0", `breath-${choice}`, "p1").pending, true);
    assert.ok(game.pendingChoice?.options.some(option => option.value === choice));
    game.resolveChoice("p0", choice);
    assert.equal(enemy.hp, expectedHp, choice);
    assert.equal(tanjiro.breathReady, 0, choice);
  }
});

test("圆舞花4能量、双防且不计普通突击次数，呼吸态可穿甲", () => {
  const game = create(), tanjiro = game.player("p0"), enemy = game.player("p1");
  tanjiro.energy = 4;
  tanjiro.breathReady = 1;
  tanjiro.breathSetTurn = game.turnNumber;
  tanjiro.roundFlags.breathGained = true;
  enemy.hp = 4;
  enemy.equipment.armor = { ...cardDefinitions.armor, uid: "armor-one" };
  enemy.hand = [{ ...cardDefinitions.guard, uid: "one-guard" }];
  assert.equal(game.useSignature("p0", "p1").ok, true);
  assert.equal(game.pendingChoice?.title, "火之神神乐·圆舞");
  game.resolveChoice("p0", "use");
  assert.equal(enemy.hp, 2);
  assert.equal(tanjiro.energy, 1);
  assert.equal(tanjiro.breathReady, 0);
  assert.equal(tanjiro.attacksUsed, 0);
});

test("嗅觉私查在 schema 2 恢复后保持同一张牌且不向对手泄露", () => {
  const values = new Map();
  const storage = { getItem(key) { return values.get(key) ?? null; }, setItem(key, value) { values.set(key, value); }, removeItem(key) { values.delete(key); } };
  const session = new GameSession({ config: { modeId: "ranked2v2", humanCharacterId: "tanjiro", fixedAnchorSeat: 0 }, seed: 114, storage });
  assert.ok(session.engine.player("p1").hand.length > 0);
  assert.equal(session.execute("useActiveSkill", "p0", "p1").ok, true);
  const before = session.engine.getVisibleDemonSlayerState("p0", "p0");
  assert.ok(before.scentCardName);
  assert.equal(session.saveNow().ok, true);
  const restored = restoreSavedMatch(storage).session;
  assert.deepEqual(restored.engine.getVisibleDemonSlayerState("p0", "p0"), before);
  assert.equal(Object.hasOwn(restored.engine.getVisibleDemonSlayerState("p1", "p0"), "scentCardName"), false);
});
