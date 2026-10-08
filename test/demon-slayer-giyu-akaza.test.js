import test from "node:test";
import assert from "node:assert/strict";
import { cardDefinitions } from "../src/data.js";
import { GameEngine } from "../src/engine.js";

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

const card = (id, uid) => ({ ...cardDefinitions[id], uid });

test("静水护形可保护自己，完全防御不消耗，下一次未防住的普通突击减伤", () => {
  const game = create("giyu"), giyu = game.player("p0"), enemy = game.player("p1");
  giyu.energy = 1;
  assert.ok(game.getActiveSkillTargets("p0").includes("p0"));
  assert.equal(game.useActiveSkill("p0", "p0").ok, true);
  assert.equal(giyu.stillWaterGuard?.ownerId, "p0");
  giyu.hand = [card("guard", "first-guard")];
  enemy.hand = [card("attack", "first-attack"), card("attack", "second-attack")];
  game.currentPlayerId = "p1";
  game.playCard("p1", "first-attack", "p0");
  game.respond(true);
  assert.ok(giyu.stillWaterGuard);
  game.playCard("p1", "second-attack", "p0", { freeUse: true });
  assert.equal(giyu.hp, giyu.maxHp);
  assert.equal(giyu.stillWaterGuard, null);
});

test("静心仅因足额实牌防住普通突击获1能量，护形在义勇下回合开始失效", () => {
  const game = create("giyu"), giyu = game.player("p0"), enemy = game.player("p1");
  giyu.energy = 1;
  game.useActiveSkill("p0", "p0");
  giyu.energy = 0;
  giyu.hand = [card("guard", "guard-paid")];
  enemy.hand = [card("attack", "attack-paid")];
  game.currentPlayerId = "p1";
  game.playCard("p1", "attack-paid", "p0");
  game.respond(true);
  assert.equal(giyu.energy, 1);
  assert.equal(giyu.roundFlags.stillHeart, true);
  game.turnNumber += 4;
  game.completeTurnStart("p0");
  assert.equal(giyu.stillWaterGuard, null);
});

test("水面斩消耗呼吸态使普通突击距离+1且无视防具", () => {
  const game = create("giyu", "classic8"), giyu = game.player("p0"), target = game.player("p2");
  target.characterId = "ichigo";
  target.equipment.armor = card("armor", "armor-one");
  target.armorReady = true;
  giyu.hand = [card("attack", "water-cut")];
  giyu.breathReady = 1;
  giyu.roundFlags.breathGained = true;
  assert.ok(game.getCardTargets("p0", giyu.hand[0]).includes("p2"));
  game.playCard("p0", "water-cut", "p2");
  assert.equal(game.pendingChoice?.title, "水面斩");
  game.resolveChoice("p0", "use");
  assert.equal(target.hp, target.maxHp - 1);
  assert.equal(giyu.breathReady, 0);
});

test("凪取消目标下一次普通突击；消耗呼吸态后还可免除一次策略伤害", () => {
  const game = create("giyu"), giyu = game.player("p0"), enemy = game.player("p1");
  giyu.energy = 3;
  assert.equal(game.useSignature("p0", "p0").ok, true);
  assert.ok(giyu.deadCalm);
  enemy.hand = [card("attack", "cancelled-attack")];
  game.currentPlayerId = "p1";
  game.playCard("p1", "cancelled-attack", "p0");
  assert.equal(giyu.hp, giyu.maxHp);
  assert.equal(giyu.deadCalm, null);
  assert.ok(game.eventHistory.some(event => event.type === "cardCancelled" && event.card?.uid === "cancelled-attack"));

  game.currentPlayerId = "p0";
  giyu.energy = 3;
  giyu.breathReady = 1;
  giyu.roundFlags.breathGained = true;
  game.useSignature("p0", "p0");
  game.resolveChoice("p0", "use");
  assert.equal(giyu.deadCalm?.strategy, true);
  game.dealDamage("p1", "p0", 1, "strategy");
  assert.equal(giyu.hp, giyu.maxHp);
  assert.equal(giyu.deadCalm, null);
});

test("罗针公开标记可令双方普通突击距离视为1，并在猗窝座下回合开始到期", () => {
  const game = create("akaza", "classic8"), akaza = game.player("p0"), target = game.player("p2");
  target.characterId = "ichigo";
  akaza.energy = 1;
  assert.ok(game.getActiveSkillTargets("p0").includes("p2"));
  assert.equal(game.useActiveSkill("p0", "p2").ok, true);
  assert.equal(akaza.compassTargetId, "p2");
  akaza.hand = [card("attack", "compass-out")];
  target.hand = [card("attack", "compass-back")];
  assert.ok(game.getCardTargets("p0", akaza.hand[0]).includes("p2"));
  assert.ok(game.getCardTargets("p2", target.hand[0]).includes("p0"));
  game.turnNumber += 8;
  game.completeTurnStart("p0");
  assert.equal(akaza.compassTargetId, null);
});

test("斗气感应每回合首次对罗针目标额外需要1防御，受罗针目标伤害后鬼躯再生获盾", () => {
  const game = create("akaza"), akaza = game.player("p0"), target = game.player("p1");
  akaza.energy = 1;
  game.useActiveSkill("p0", "p1");
  akaza.hand = [card("attack", "compass-attack")];
  target.hand = [card("guard", "one-guard")];
  game.playCard("p0", "compass-attack", "p1");
  assert.equal(target.hp, target.maxHp - 1);
  assert.equal(target.hand.length, 1);
  assert.equal(akaza.turnFlags.compassPressureUsed, true);
  game.dealDamage("p1", "p0", 1, "strategy");
  assert.equal(akaza.shield, 1);
  game.dealDamage("p1", "p0", 1, "strategy");
  assert.equal(akaza.shield, 0);
});

test("灭式只对罗针目标发动，交手后完全防御记录使伤害+1，结算后清罗针", () => {
  const game = create("akaza"), akaza = game.player("p0"), enemy = game.player("p1");
  akaza.energy = 1;
  game.useActiveSkill("p0", "p1");
  akaza.hand = [card("guard", "compass-guard")];
  enemy.hand = [card("attack", "compass-incoming")];
  game.currentPlayerId = "p1";
  game.playCard("p1", "compass-incoming", "p0");
  game.respond(true);
  assert.equal(akaza.compassDefended, true);
  game.currentPlayerId = "p0";
  akaza.energy = 4;
  assert.deepEqual(game.getSignatureTargets("p0"), ["p1"]);
  game.useSignature("p0", "p1");
  assert.equal(enemy.hp, enemy.maxHp - 3);
  assert.equal(akaza.compassTargetId, null);
  assert.equal(akaza.compassDefended, false);
});
