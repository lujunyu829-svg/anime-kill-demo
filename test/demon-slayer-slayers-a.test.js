import test from "node:test";
import assert from "node:assert/strict";
import { cardDefinitions } from "../src/data.js";
import { GameEngine } from "../src/engine.js";

const card = (id, uid) => ({ ...cardDefinitions[id], uid });

function create(characterId, modeId = "ranked2v2") {
  const game = new GameEngine({ modeId, humanCharacterId: characterId, fixedAnchorSeat: 0, random: () => 0.25 }).setup();
  for (const player of game.players) {
    player.hand = [];
    player.shield = 0;
    player.equipment = { weapon: null, armor: null, charm: null };
  }
  game.player("p1").characterId = "ichigo";
  game.currentPlayerId = "p0";
  return game;
}

test("善逸蓄雷需弃1牌且未使用普通突击，结算后获呼吸态和护盾并结束出牌", () => {
  const game = create("zenitsu"), zenitsu = game.player("p0");
  assert.deepEqual(game.getActiveSkillTargets("p0"), []);
  zenitsu.hand = [card("focus", "charge-cost")];
  assert.ok(game.getActiveSkillTargets("p0").includes("p0"));
  game.useActiveSkill("p0", "p0");
  assert.equal(game.pendingDiscard?.count, 1);
  game.confirmDiscard("p0", ["charge-cost"]);
  assert.equal(zenitsu.breathReady, 1);
  assert.equal(zenitsu.shield, 1);
  assert.notEqual(game.currentPlayerId, "p0");
});

test("善逸已经实际使用不计次数的手牌突击后也不能蓄雷", () => {
  const game = create("zenitsu"), zenitsu = game.player("p0");
  zenitsu.hand = [card("attack", "free-attack"), card("focus", "remaining-card")];
  game.playCard("p0", "free-attack", "p1", { freeUse: true });
  assert.equal(zenitsu.attacksUsed, 0);
  assert.deepEqual(game.getActiveSkillTargets("p0"), []);
});

test("善逸一之型消耗呼吸态可跨距离普通突击并增加防御需求", () => {
  const game = create("zenitsu", "classic8"), zenitsu = game.player("p0"), target = game.player("p4");
  target.characterId = "ichigo";
  zenitsu.breathReady = 1;
  zenitsu.roundFlags.breathGained = true;
  zenitsu.hand = [card("attack", "thunder-attack")];
  target.hand = [card("guard", "one-guard")];
  assert.ok(game.getCardTargets("p0", zenitsu.hand[0]).includes("p4"));
  game.playCard("p0", "thunder-attack", "p4");
  game.resolveChoice("p0", "use");
  assert.equal(target.hp, target.maxHp - 1);
  assert.equal(target.hand.length, 1);
  assert.equal(zenitsu.breathReady, 0);
});

test("善逸危机听觉在低体力时把非响应手牌实际打作防御，每轮一次", () => {
  const game = create("zenitsu"), zenitsu = game.player("p0"), enemy = game.player("p1");
  zenitsu.hp = 2;
  zenitsu.hand = [card("focus", "hearing-cost")];
  enemy.hand = [card("attack", "hearing-attack")];
  game.currentPlayerId = "p1";
  game.playCard("p1", "hearing-attack", "p0");
  assert.equal(game.pendingResponse?.type, "guard");
  game.respond(true);
  assert.equal(zenitsu.hp, 2);
  assert.equal(zenitsu.hand.length, 0);
  assert.equal(zenitsu.roundFlags.crisisHearing, true);
  assert.equal(zenitsu.breathReady, 1);
});

test("善逸六连可指定任意距离，呼吸态使其需三防且不可强制介入", () => {
  const game = create("zenitsu", "classic8"), zenitsu = game.player("p0"), target = game.player("p4");
  target.characterId = "ichigo";
  zenitsu.energy = 3;
  assert.equal(game.useSignature("p0", "p4").ok, false);
  zenitsu.energy = 4;
  zenitsu.breathReady = 1;
  zenitsu.roundFlags.breathGained = true;
  game.player("p2").hand = [card("intervene", "intervene-one")];
  target.hand = [card("guard", "guard-one"), card("guard", "guard-two")];
  assert.ok(game.getSignatureTargets("p0").includes("p4"));
  game.useSignature("p0", "p4");
  game.resolveChoice("p0", "use");
  assert.equal(game.pendingResponse?.type, undefined);
  assert.equal(target.hp, target.maxHp - 2);
  assert.equal(zenitsu.breathReady, 0);
});

test("伊之助兽之触觉给普通突击距离+1，猪突猛进为不计次数的虚拟攻击", () => {
  const game = create("inosuke", "classic8"), inosuke = game.player("p0"), target = game.player("p2");
  target.characterId = "ichigo";
  inosuke.hand = [card("attack", "boar-card")];
  assert.ok(game.getCardTargets("p0", inosuke.hand[0]).includes("p2"));
  inosuke.energy = 1;
  assert.ok(game.getActiveSkillTargets("p0").includes("p1"));
  game.useActiveSkill("p0", "p1");
  assert.equal(game.player("p1").hp, game.player("p1").maxHp - 1);
  assert.equal(inosuke.attacksUsed, 0);
  assert.equal(inosuke.breathReady, 0);
});

test("伊之助受其他角色实际伤害后标记来源，下一次对其普通突击额外需防御", () => {
  const game = create("inosuke"), inosuke = game.player("p0"), enemy = game.player("p1");
  game.dealDamage("p1", "p0", 1, "strategy");
  assert.equal(inosuke.rageTargetId, "p1");
  inosuke.hand = [card("attack", "rage-attack")];
  enemy.hand = [card("guard", "rage-guard")];
  game.playCard("p0", "rage-attack", "p1");
  assert.equal(enemy.hp, enemy.maxHp - 1);
  assert.equal(enemy.hand.length, 1);
  assert.equal(inosuke.rageTargetId, null);
});

test("伊之助乱裂依次两段，目标首段退场时不发起第二段", () => {
  const game = create("inosuke"), inosuke = game.player("p0"), enemy = game.player("p1");
  inosuke.energy = 4;
  enemy.hp = 1;
  game.useSignature("p0", "p1");
  assert.equal(enemy.alive, false);
  assert.equal(game.eventHistory.filter(event => event.type === "damageApplied" && event.sourceId === "p0" && event.targetId === "p1").length, 1);
});

test("伊之助乱裂两段分别响应，呼吸态只强化第二段的防御需求", () => {
  const game = create("inosuke"), inosuke = game.player("p0"), enemy = game.player("p1");
  inosuke.energy = 4;
  inosuke.breathReady = 1;
  inosuke.roundFlags.breathGained = true;
  enemy.hand = [card("guard", "first-guard")];
  game.useSignature("p0", "p1");
  game.resolveChoice("p0", "use");
  assert.equal(enemy.hp, enemy.maxHp - 1);
  assert.equal(enemy.hand.length, 0);
  assert.equal(inosuke.breathReady, 0);
  assert.equal(game.eventHistory.filter(event => event.type === "attackFullyDefended" && event.origin === "beastRend").length, 1);
});

test("伊之助狂乱反扑不因自身失去体力而标记，且标记在下回合开始到期", () => {
  const game = create("inosuke"), inosuke = game.player("p0");
  game.loseHp("p0", 1, null, "poison");
  assert.equal(inosuke.rageTargetId, null);
  game.dealDamage("p1", "p0", 1, "strategy");
  assert.equal(inosuke.rageTargetId, "p1");
  game.turnNumber += 4;
  game.completeTurnStart("p0");
  assert.equal(inosuke.rageTargetId, null);
});

test("胡蝶忍藤花调剂移除一层毒后由玩家选择净化护盾或催毒失去体力", () => {
  for (const [choice, hpLoss, shield] of [["cleanse", 0, 1], ["catalyze", 1, 0]]) {
    const game = create("shinobu"), shinobu = game.player("p0"), target = game.player("p1");
    shinobu.energy = 1;
    target.poison = 2;
    game.useActiveSkill("p0", "p1");
    assert.equal(game.pendingChoice?.title, "藤花调剂");
    game.resolveChoice("p0", choice);
    assert.equal(target.poison, 1);
    assert.equal(target.hp, target.maxHp - hpLoss);
    assert.equal(target.shield, shield);
    assert.equal(game.eventHistory.filter(event => event.type === "damageApplied" && event.sourceId === "p0").length, 0);
  }
});

test("胡蝶忍毒刃只在每回合首次普通突击实际伤血后施毒", () => {
  const game = create("shinobu"), shinobu = game.player("p0"), target = game.player("p1");
  shinobu.hand = [card("attack", "poison-attack")];
  game.playCard("p0", "poison-attack", "p1");
  assert.equal(target.poison, 1);
  game.dealDamage("p0", "p1", 1, "active");
  assert.equal(target.poison, 1);
  shinobu.turnFlags.poisonBlade = true;
  game.dealDamage("p0", "p1", 1, "attack");
  assert.equal(target.poison, 1);
});

test("胡蝶忍蜈蚣之舞即使完全防御仍施毒，呼吸态可改为两层", () => {
  const game = create("shinobu"), shinobu = game.player("p0"), target = game.player("p1");
  shinobu.energy = 3;
  assert.equal(game.useSignature("p0", "p1").ok, false);
  shinobu.energy = 4;
  shinobu.breathReady = 1;
  shinobu.roundFlags.breathGained = true;
  target.hand = [card("guard", "centipede-one"), card("guard", "centipede-two")];
  game.useSignature("p0", "p1");
  game.resolveChoice("p0", "use");
  assert.equal(target.hp, target.maxHp);
  assert.equal(target.poison, 2);
  assert.equal(shinobu.breathReady, 0);
});
