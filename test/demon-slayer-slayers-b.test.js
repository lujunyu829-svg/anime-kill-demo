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

test("炼狱布置炎柱守护后可承接单目标普通突击，存活后获1能量", () => {
  const game = create("rengoku", "classic8"), rengoku = game.player("p0"), ward = game.player("p1"), attacker = game.player("p2");
  rengoku.energy = 1;
  game.useActiveSkill("p0", "p1");
  assert.equal(ward.flameGuard?.ownerId, "p0");
  attacker.hand = [card("attack", "guardian-attack")];
  game.currentPlayerId = "p2";
  game.playCard("p2", "guardian-attack", "p1");
  assert.equal(game.pendingChoice?.title, "炎柱守护");
  game.resolveChoice("p0", "use");
  assert.equal(ward.hp, ward.maxHp);
  assert.equal(rengoku.hp, rengoku.maxHp - 1);
  assert.equal(rengoku.energy, 2);
  assert.equal(ward.flameGuard, null);
});

test("炼狱在交错座次的2V2中能保护距离2的队友", () => {
  const game = create("rengoku"), rengoku = game.player("p0");
  rengoku.energy = 1;
  assert.deepEqual(game.getActiveSkillTargets("p0"), ["p2"]);
  game.useActiveSkill("p0", "p2");
  assert.equal(game.player("p2").flameGuard?.ownerId, "p0");
});

test("炎柱守护可放弃且不消耗标记，强制介入改目标后原守护不触发", () => {
  const game = create("rengoku", "classic8"), rengoku = game.player("p0"), ward = game.player("p1"), attacker = game.player("p2");
  rengoku.energy = 1;
  game.useActiveSkill("p0", "p1");
  attacker.hand = [card("attack", "first-attack"), card("attack", "second-attack")];
  game.currentPlayerId = "p2";
  game.playCard("p2", "first-attack", "p1");
  game.resolveChoice("p0", "pass");
  assert.ok(ward.flameGuard);
  rengoku.hand = [card("intervene", "intervene-guardian")];
  game.playCard("p2", "second-attack", "p1", { freeUse: true });
  assert.equal(game.pendingResponse?.type, "intervene");
  game.respond(true);
  assert.equal(game.pendingChoice?.title, undefined);
  assert.ok(ward.flameGuard);
});

test("炎之呼吸消耗呼吸态增加普通突击伤害，玖之型结算后失体力", () => {
  const game = create("rengoku"), rengoku = game.player("p0"), enemy = game.player("p1");
  rengoku.breathReady = 1;
  rengoku.roundFlags.breathGained = true;
  rengoku.hand = [card("attack", "flame-attack")];
  game.playCard("p0", "flame-attack", "p1");
  game.resolveChoice("p0", "use");
  assert.equal(enemy.hp, enemy.maxHp - 2);
  assert.equal(rengoku.breathReady, 0);
  rengoku.energy = 4;
  enemy.hand = [card("guard", "flame-guard-1"), card("guard", "flame-guard-2")];
  const hpBefore = rengoku.hp;
  game.useSignature("p0", "p1");
  assert.equal(rengoku.hp, hpBefore - 1);
  assert.equal(enemy.hp, enemy.maxHp - 2);
});

test("蜜璃柔韧连携交基础牌给队友；受赠突击距离+1且成功造成伤害后获呼吸态", () => {
  const game = create("mitsuri"), mitsuri = game.player("p0"), ally = game.player("p2"), enemy = game.player("p1");
  mitsuri.energy = 1;
  mitsuri.hand = [card("attack", "gift-attack")];
  assert.ok(game.getActiveSkillTargets("p0").includes("p2"));
  game.useActiveSkill("p0", "p2");
  game.resolveChoice("p0", "gift-attack");
  assert.equal(ally.hand[0].uid, "gift-attack");
  assert.equal(ally.hand[0]._mitsuriGift?.ownerId, "p0");
  game.currentPlayerId = "p2";
  game.playCard("p2", "gift-attack", "p1");
  assert.equal(enemy.hp, enemy.maxHp - 1);
  assert.equal(mitsuri.breathReady, 1);
});

test("蜜璃受赠防御被打出时给使用者护盾，完全防住时蜜璃获呼吸态", () => {
  const game = create("mitsuri"), mitsuri = game.player("p0"), ally = game.player("p2"), enemy = game.player("p1");
  mitsuri.energy = 1;
  mitsuri.hand = [card("guard", "gift-guard")];
  game.useActiveSkill("p0", "p2");
  game.resolveChoice("p0", "gift-guard");
  enemy.hand = [card("attack", "gift-targeted")];
  game.currentPlayerId = "p1";
  game.playCard("p1", "gift-targeted", "p2");
  assert.equal(ally.hp, ally.maxHp);
  assert.equal(ally.shield, 1);
  assert.equal(mitsuri.breathReady, 1);
});

test("蜜璃赠牌离开受赠者手牌即失效，未使用则在蜜璃下回合开始到期", () => {
  const game = create("mitsuri"), mitsuri = game.player("p0"), ally = game.player("p2");
  mitsuri.energy = 1;
  mitsuri.hand = [card("focus", "gift-unused")];
  game.useActiveSkill("p0", "p2");
  game.resolveChoice("p0", "gift-unused");
  assert.ok(ally.hand[0]._mitsuriGift);
  game.removeCard("p2", "gift-unused");
  assert.equal(game.discard.at(-1)._mitsuriGift, undefined);

  const later = create("mitsuri"), laterMitsuri = later.player("p0"), laterAlly = later.player("p2");
  laterMitsuri.energy = 1;
  laterMitsuri.hand = [card("focus", "gift-expired")];
  later.useActiveSkill("p0", "p2");
  later.resolveChoice("p0", "gift-expired");
  later.turnNumber += 4;
  later.completeTurnStart("p0");
  assert.equal(laterAlly.hand[0]._mitsuriGift, undefined);
});

test("蜜璃可邀请合法协作者攻击共同目标，放弃协同后仍执行自己的攻击", () => {
  const game = create("mitsuri"), mitsuri = game.player("p0"), ally = game.player("p2"), enemy = game.player("p1");
  mitsuri.energy = 3;
  ally.hand = [card("attack", "co-op-attack")];
  game.useSignature("p0", "p1");
  assert.equal(game.pendingChoice?.title, "恋之呼吸·协作者");
  game.resolveChoice("p0", "p2");
  assert.equal(enemy.hp, enemy.maxHp - 2);
  assert.equal(mitsuri.energy, 1);

  const solo = create("mitsuri"), soloMitsuri = solo.player("p0"), soloEnemy = solo.player("p1");
  soloMitsuri.energy = 3;
  solo.player("p2").alive = false;
  solo.useSignature("p0", "p1");
  assert.equal(soloEnemy.hp, soloEnemy.maxHp - 1);
});

test("蜜璃协同的第一段需玩家响应时，第二段在响应结束后才开始且只触发一次", () => {
  const game = create("mitsuri"), mitsuri = game.player("p0"), ally = game.player("p2"), enemy = game.player("p1");
  mitsuri.energy = 3;
  ally.hand = [card("attack", "co-op-pending")];
  enemy.human = true;
  enemy.hand = [card("guard", "co-op-guard")];
  game.useSignature("p0", "p1");
  game.resolveChoice("p0", "p2");
  assert.equal(game.pendingResponse?.type, "guard");
  assert.equal(enemy.hp, enemy.maxHp);
  game.respond(true);
  assert.equal(enemy.hp, enemy.maxHp - 1);
  assert.equal(game.pendingResponse, null);
  assert.equal(game.eventHistory.filter(event => event.type === "damageApplied" && event.sourceId === "p0").length, 1);
});
