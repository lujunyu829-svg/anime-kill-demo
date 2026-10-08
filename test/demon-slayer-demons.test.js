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

test("祢豆子护人本能需弃基础牌补足一防，完全防住后获得爆血印", () => {
  const game = create("nezuko", "classic8"), nezuko = game.player("p0"), ward = game.player("p1"), attacker = game.player("p2");
  nezuko.energy = 1;
  nezuko.hand = [card("focus", "aid-cost")];
  game.useActiveSkill("p0", "p1");
  attacker.hand = [card("attack", "aid-attack")];
  game.currentPlayerId = "p2";
  game.playCard("p2", "aid-attack", "p1");
  assert.equal(game.pendingChoice?.title, "护人本能");
  game.resolveChoice("p0", "use");
  assert.equal(game.pendingDiscard?.count, 1);
  game.confirmDiscard("p0", ["aid-cost"]);
  assert.equal(ward.hp, ward.maxHp);
  assert.equal(nezuko.bloodFlame, 1);
  assert.equal(ward.nezukoAid, null);
  assert.equal(game.eventHistory.filter(event => event.type === "attackTargeted" && event.targetId === "p1").length, 1);
});

test("祢豆子无需补防时不支付卡牌也不消耗援护，自己受伤每轮至多获一枚爆血印", () => {
  const game = create("nezuko", "classic8"), nezuko = game.player("p0"), ward = game.player("p1");
  nezuko.energy = 1;
  nezuko.hand = [card("focus", "unused-aid")];
  ward.hand = [card("guard", "own-guard")];
  game.useActiveSkill("p0", "p1");
  game.currentPlayerId = "p2";
  game.player("p2").hand = [card("attack", "ward-attack")];
  game.playCard("p2", "ward-attack", "p1");
  assert.equal(nezuko.hand.length, 1);
  assert.ok(ward.nezukoAid);
  game.dealDamage("p2", "p0", 1, "strategy");
  assert.equal(nezuko.bloodFlame, 1);
  game.dealDamage("p2", "p0", 1, "strategy");
  assert.equal(nezuko.bloodFlame, 1);
});

test("祢豆子回合开始可消耗爆血印再生，回复0时不打开窗口", () => {
  const game = create("nezuko"), nezuko = game.player("p0");
  nezuko.hp = 3;
  nezuko.bloodFlame = 1;
  nezuko.bloodFlameSetTurn = game.turnNumber;
  game.turnNumber += 4;
  game.completeTurnStart("p0");
  assert.equal(game.pendingChoice?.title, "再生");
  game.resolveChoice("p0", "use");
  assert.equal(nezuko.hp, 4);
  assert.equal(nezuko.bloodFlame, 0);
  assert.equal(game.telemetry.healing, 1);
});

test("祢豆子爆血造成策略伤害与毒素，消耗爆血印可净化并给护盾", () => {
  const game = create("nezuko"), nezuko = game.player("p0"), enemy = game.player("p1");
  nezuko.energy = 3;
  nezuko.bloodFlame = 1;
  nezuko.roundFlags.bloodFlameGained = true;
  nezuko.poison = 1;
  game.useSignature("p0", "p1");
  assert.equal(enemy.hp, enemy.maxHp - 1);
  assert.equal(enemy.poison, 1);
  assert.equal(game.pendingChoice?.title, "爆血印");
  game.resolveChoice("p0", "use");
  assert.equal(game.pendingChoice?.title, "爆血净化");
  game.resolveChoice("p0", "p0:poison");
  assert.equal(nezuko.poison, 0);
  assert.equal(nezuko.shield, 1);
  assert.equal(nezuko.bloodFlame, 0);
});

test("无惨血印目标可弃手牌拒绝；无手牌则标记，取消牌不触发而完成牌触发", () => {
  const game = create("muzan"), muzan = game.player("p0"), target = game.player("p1");
  muzan.energy = 1;
  target.human = true;
  target.hand = [card("focus", "mark-refuse")];
  game.useActiveSkill("p0", "p1");
  assert.equal(game.pendingChoice?.title, "血液烙印");
  game.resolveChoice("p1", "discard");
  game.confirmDiscard("p1", ["mark-refuse"]);
  assert.equal(muzan.bloodMarkTargetId, null);

  muzan.turnFlags.activeUsed = false;
  muzan.energy = 1;
  game.useActiveSkill("p0", "p1");
  assert.equal(muzan.bloodMarkTargetId, "p1");
  game.notifyCardCancelled("p1", "测试取消", card("focus", "cancelled-marked"), "p1");
  assert.equal(muzan.bloodMarkTargetId, "p1");
  target.hand = [card("focus", "resolved-marked")];
  game.currentPlayerId = "p1";
  game.playCard("p1", "resolved-marked", "p1");
  assert.equal(target.poison, 1);
  assert.equal(muzan.bloodMarkTargetId, null);
});

test("无惨受实际伤害首次获盾；血印目标可跨普通距离攻击且标记到下回合开始结束", () => {
  const game = create("muzan", "classic8"), muzan = game.player("p0"), target = game.player("p2");
  muzan.energy = 1;
  game.useActiveSkill("p0", "p2");
  muzan.hand = [card("attack", "blood-pressure")];
  assert.ok(game.getCardTargets("p0", muzan.hand[0]).includes("p2"));
  game.dealDamage("p1", "p0", 1, "strategy");
  assert.equal(muzan.shield, 1);
  game.turnNumber += 8;
  game.completeTurnStart("p0");
  assert.equal(muzan.bloodMarkTargetId, null);
});

test("无惨肉鞭按座次逐目标响应，血印目标额外需要一防且不可用反制取消", () => {
  const game = create("muzan", "classic8"), muzan = game.player("p0"), first = game.player("p1"), second = game.player("p7");
  muzan.energy = 4;
  muzan.bloodMarkTargetId = "p1";
  first.hand = [card("guard", "first-guard"), card("counter", "first-counter")];
  second.hand = [];
  game.useSignature("p0", "p1");
  assert.equal(game.pendingChoice?.title, "肉鞭乱舞：第二目标");
  game.resolveChoice("p0", "p7");
  assert.equal(first.hp, first.maxHp - 1);
  assert.equal(second.hp, second.maxHp - 1);
  assert.equal(first.hand.some(item => item.id === "counter"), true);
  assert.equal(muzan.bloodMarkTargetId, null);
  assert.equal(game.pendingResponse, null);
  assert.equal(game.eventHistory.filter(event => event.type === "damageApplied" && event.origin === "strategy" && event.sourceId === "p0").length, 2);
});

test("无惨肉鞭第一名玩家响应后才处理第二人，放弃防御只伤该玩家", () => {
  const game = create("muzan", "classic8"), muzan = game.player("p0"), first = game.player("p1"), second = game.player("p2");
  muzan.energy = 4;
  first.human = true;
  first.hand = [card("guard", "whip-guard")];
  game.useSignature("p0", "p1");
  game.resolveChoice("p0", "p2");
  assert.equal(game.pendingResponse?.type, "fleshWhipGuard");
  assert.equal(second.hp, second.maxHp);
  game.respond(true);
  assert.equal(first.hp, first.maxHp);
  assert.equal(second.hp, second.maxHp - 1);
  assert.equal(game.pendingResponse, null);
});

test("爆血印不因失去体力或零伤害获得", () => {
  const game = create("nezuko"), nezuko = game.player("p0");
  game.loseHp("p0", 1, null, "poison");
  assert.equal(nezuko.bloodFlame, 0);
  nezuko.shield = 1;
  game.dealDamage("p1", "p0", 1, "strategy");
  assert.equal(nezuko.bloodFlame, 0);
});

test("护人本能补防仅用于普通突击，不能抵挡肉鞭策略伤害", () => {
  const game = create("nezuko", "classic8"), nezuko = game.player("p0"), ward = game.player("p1"), muzan = game.player("p2");
  nezuko.energy = 1;
  nezuko.hand = [card("focus", "aid-not-strategy")];
  game.useActiveSkill("p0", "p1");
  ward.turnFlags.nezukoAidGuard = 1;
  muzan.characterId = "muzan";
  muzan.energy = 4;
  game.currentPlayerId = "p2";
  game.useSignature("p2", "p1");
  game.resolveChoice("p2", "pass");
  assert.equal(ward.hp, ward.maxHp - 1);
  assert.equal(ward.turnFlags.nezukoAidGuard, 1);
});

test("血印目标退场与祢豆子退场时公开状态清除", () => {
  const game = create("muzan", "classic8"), muzan = game.player("p0"), ward = game.player("p1"), nezuko = game.player("p2");
  muzan.energy = 1;
  game.useActiveSkill("p0", "p1");
  nezuko.characterId = "nezuko";
  ward.nezukoAid = { ownerId: nezuko.id, setTurn: game.turnNumber };
  game.eliminate("p1", "p3");
  assert.equal(muzan.bloodMarkTargetId, null);
  assert.equal(ward.nezukoAid, null);
  game.player("p3").nezukoAid = { ownerId: nezuko.id, setTurn: game.turnNumber };
  game.eliminate("p2", "p3");
  assert.equal(game.player("p3").nezukoAid, null);
});
