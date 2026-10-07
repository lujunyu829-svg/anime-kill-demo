import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine.js";
import { cardDefinitions } from "../src/data.js";

const card = (id, uid) => ({ ...cardDefinitions[id], uid });
function duel({ round = 25, survivors = 2, attacker = "hinata", defender = "nami" } = {}) {
  const game = new GameEngine({ modeId: "ranked2v2", humanCharacterId: attacker, fixedAnchorSeat: 0, random: () => .25 }).setup();
  game.round = round;
  game.player("p0").characterId = attacker;
  game.player("p1").characterId = defender;
  game.player("p0").hand = [card("attack", "first-attack"), card("attack", "second-attack")];
  game.player("p0").attackLimit = 2;
  game.player("p0").attacksUsed = 0;
  game.player("p0").turnFlags = { cardsPlayed: 0 };
  game.player("p1").hand = [];
  game.player("p1").hp = 3;
  game.player("p1").shield = 2;
  game.player("p1").human = false;
  game.player("p1").roundFlags = {};
  game.player("p2").alive = false;
  if (survivors === 2) game.player("p3").alive = false;
  game.currentPlayerId = "p0";
  game.phase = "play";
  return game;
}

test("残局下限只在第25轮起恰好双人且首次普通突击时穿过护盾和防具", () => {
  for (const [round, survivors, expectedHp] of [[24, 2, 3], [25, 3, 3], [25, 2, 2]]) {
    const game = duel({ round, survivors }), target = game.player("p1");
    target.equipment.armor = card("armor", `armor-${round}-${survivors}`);
    assert.equal(game.playCard("p0", "first-attack", "p1").ok, true);
    assert.equal(target.hp, expectedHp);
    assert.equal(target.shield, 2);
    assert.equal(target.armorReady, false);
  }
});

test("完整防御耗掉首次机会，第二张突击不穿盾，下一轮首次机会恢复", () => {
  const game = duel(), target = game.player("p1");
  target.human = true;
  target.hand = [card("guard", "first-guard")];
  assert.equal(game.playCard("p0", "first-attack", "p1").ok, true);
  assert.equal(game.pendingResponse?.type, "guard");
  game.respond(true);
  assert.equal(target.hp, 3);
  assert.equal(target.shield, 2);

  assert.equal(game.playCard("p0", "second-attack", "p1").ok, true);
  assert.equal(target.hp, 3);
  assert.equal(target.shield, 1);

  game.startRound();
  game.player("p0").hand = [card("attack", "next-round-attack")];
  target.shield = 2;
  target.human = false;
  assert.equal(game.playCard("p0", "next-round-attack", "p1").ok, true);
  assert.equal(target.hp, 2);
  assert.equal(target.shield, 2);
});

test("首次普通突击在蛤蟆束缚中被取消仍耗机会", () => {
  const game = duel({ defender: "jiraiya" }), target = game.player("p1");
  target.toadBindTargetId = "p0";
  assert.equal(game.playCard("p0", "first-attack", "p1").pending, true);
  game.resolveChoice("p0", "cancel");
  assert.equal(game.player("p0").hand.some(item => item.uid === "first-attack"), false);
  target.hand = [];
  assert.equal(game.playCard("p0", "second-attack", "p1").ok, true);
  assert.equal(target.hp, 3);
  assert.equal(target.shield, 1);
});

test("防御资源不足时首张突击命中仍保留一点伤害", () => {
  const game = duel(), source = game.player("p0"), target = game.player("p1");
  source.turnFlags.nextAttackRequiredGuard = 1;
  target.hand = [card("guard", "only-guard")];
  assert.equal(game.playCard("p0", "first-attack", "p1").ok, true);
  assert.equal(target.hp, 2);
  assert.equal(target.shield, 2);
});

test("免费突击、招牌来源与策略伤害均不享有残局穿盾", () => {
  const free = duel(), freeTarget = free.player("p1");
  assert.equal(free.playCard("p0", "first-attack", "p1", { freeUse: true }).ok, true);
  assert.equal(freeTarget.hp, 3);
  assert.equal(freeTarget.shield, 1);
  freeTarget.shield = 2;
  assert.equal(free.playCard("p0", "second-attack", "p1").ok, true);
  assert.equal(freeTarget.hp, 2);
  assert.equal(freeTarget.shield, 2);

  const signature = duel(), signatureTarget = signature.player("p1");
  signature.beginAttack({ sourceId: "p0", targetId: "p1", damage: 1, requiredGuards: 1, origin: "signature" });
  assert.equal(signatureTarget.hp, 3);
  assert.equal(signatureTarget.shield, 1);

  const strategy = duel(), strategyTarget = strategy.player("p1");
  strategy.dealDamage("p0", "p1", 1, "strategy");
  assert.equal(strategyTarget.hp, 3);
  assert.equal(strategyTarget.shield, 1);

  const adapt = duel(), adaptTarget = adapt.player("p1");
  adapt.player("p0").hand = [card("adapt", "adapted-attack")];
  adapt.playCard("p0", "adapted-attack", "p1");
  adapt.resolveChoice("p0", "attack");
  assert.equal(adaptTarget.hp, 3);
  assert.equal(adaptTarget.shield, 1);
});

test("残局突击高于1点的伤害仍由护盾吸收超出的一点", () => {
  const game = duel(), source = game.player("p0"), target = game.player("p1");
  source.turnFlags.nextAttackBonus = true;
  game.playCard("p0", "first-attack", "p1");
  assert.equal(target.hp, 2);
  assert.equal(target.shield, 1);
});

test("AI防御、见闻色、绝对防御和乌鸦替身取消首次突击时不产生穿盾伤害", () => {
  const aiGuard = duel(), guarded = aiGuard.player("p1");
  guarded.hand = [card("guard", "ai-guard")];
  aiGuard.playCard("p0", "first-attack", "p1");
  assert.equal(guarded.hp, 3);
  assert.equal(guarded.shield, 2);

  const luffy = duel({ defender: "luffy" }), observed = luffy.player("p1");
  luffy.deck.unshift(card("guard", "observation-omen"));
  luffy.playCard("p0", "first-attack", "p1");
  assert.equal(observed.hp, 3);
  assert.equal(observed.shield, 2);

  const gaara = duel({ defender: "gaara" }), protectedTarget = gaara.player("p1");
  protectedTarget.hand = [card("focus", "absolute-payment")];
  gaara.playCard("p0", "first-attack", "p1");
  assert.equal(protectedTarget.hp, 3);
  assert.equal(protectedTarget.shield, 2);
  assert.equal(protectedTarget.roundFlags.sandShield, true);

  const itachi = duel({ defender: "itachi" }), raven = itachi.player("p1");
  raven.human = true;
  raven.plots.push({ uid: "false-plot", ownerId: "p1", targetId: "p0", effect: "false", isFalse: true, card: card("focus", "false-card") });
  itachi.playCard("p0", "first-attack", "p1");
  assert.equal(itachi.pendingChoice?.title, "乌鸦替身");
  itachi.resolveChoice("p1", "cancel");
  assert.equal(raven.hp, 3);
  assert.equal(raven.shield, 2);
});

test("三人时强制介入改目标不会误启用双人残局穿盾", () => {
  const game = duel({ survivors: 3 }), original = game.player("p1"), intervenor = game.player("p3");
  intervenor.characterId = "nami";
  intervenor.hand = [card("intervene", "late-intervention")];
  intervenor.hp = 3;
  intervenor.shield = 2;
  game.playCard("p0", "first-attack", "p1");
  assert.equal(original.hp, 3);
  assert.equal(intervenor.hp, 3);
  assert.equal(intervenor.shield, 1);
});

test("守护誓约、百豪、蛇蜕和钢铁之躯仍能消除残局突击的剩余伤害", () => {
  const oath = duel(), oathTarget = oath.player("p1");
  oath.player("p0").plots.push({ uid: "oath", ownerId: "p0", targetId: "p1", effect: "guardianOath", card: card("guardian_oath", "oath-card") });
  oath.playCard("p0", "first-attack", "p1");
  assert.equal(oathTarget.hp, 3);
  assert.equal(oathTarget.shield, 2);

  const sakura = duel({ defender: "sakura" }), sakuraTarget = sakura.player("p1");
  sakuraTarget.specialCards.push({ uid: "byakugo-seal", kind: "byakugo", card: card("focus", "stored-focus") });
  sakura.playCard("p0", "first-attack", "p1");
  assert.equal(sakuraTarget.hp, 3);
  assert.equal(sakuraTarget.shield, 2);

  const orochimaru = duel({ defender: "orochimaru" }), snake = orochimaru.player("p1");
  snake.hp = 1;
  snake.hand = [{ ...card("focus", "spoil"), _curseSpoil: "p1" }];
  orochimaru.playCard("p0", "first-attack", "p1");
  assert.equal(snake.hp, 1);
  assert.equal(snake.shield, 2);

  const franky = duel({ defender: "franky" }), steel = franky.player("p1");
  franky.playCard("p0", "first-attack", "p1");
  assert.equal(steel.hp, 3);
  assert.equal(steel.shield, 2);
});

test("残局穿盾造成的真实伤害仍经过重伤救援", () => {
  const game = duel(), target = game.player("p1");
  target.hp = 1;
  target.shield = 2;
  target.equipment.charm = card("life_pendant", "rescue-pendant");
  game.playCard("p0", "first-attack", "p1");
  assert.equal(target.hp, 1);
  assert.equal(target.alive, true);
  assert.equal(target.equipment.charm, null);
  assert.equal(game.winner, null);
});
