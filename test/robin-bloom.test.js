import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine.js";
import { cardDefinitions as cards } from "../src/data.js";

const card = (id, uid) => ({ ...cards[id], uid });
function create() {
  const game = new GameEngine({ modeId: "ranked2v2", humanCharacterId: "robin", fixedAnchorSeat: 0, random: () => .25 }).setup();
  game.player("p0").hand = [];
  for (const player of game.players.slice(1)) player.hand = [];
  return game;
}

test("罗宾声明首张单目标策略时实际查看目标一张手牌并联动历史学者", () => {
  const game = create(), robin = game.player("p0"), target = game.player("p1");
  target.hand = [card("attack", "seen-attack"), card("guard", "hidden-guard")];

  game.emitCardDeclared("p0", ["p1"], card("energy_collapse", "first-strategy"));

  const views = game.eventHistory.filter(event => event.type === "hiddenCardViewed" && event.reason === "robinBloom");
  assert.equal(views.length, 1);
  assert.equal(views[0].viewerId, "p0");
  assert.equal(views[0].ownerId, "p1");
  assert.equal(views[0].card.uid, "seen-attack");
  assert.equal(robin.hand.length, 1);
  assert.equal(robin.dreamState.progress, 1);
  assert.equal(robin.roundFlags.historian, true);

  game.emitCardDeclared("p0", ["p1"], card("mind_burn", "second-strategy"));
  assert.equal(game.eventHistory.filter(event => event.type === "hiddenCardViewed" && event.reason === "robinBloom").length, 1);
  assert.equal(robin.hand.length, 1);
  assert.equal(robin.dreamState.progress, 1);
});

test("罗宾没有可查看手牌时不耗每轮机会，响应和非单目标牌不触发", () => {
  const game = create(), robin = game.player("p0");
  game.emitCardDeclared("p0", ["p1"], card("energy_collapse", "empty-target"));
  game.player("p1").hand = [card("focus", "later-card")];
  game.emitCardDeclared("p0", ["p0"], card("delayed_cast", "self-plot"));
  game.emitCardDeclared("p0", ["p1", "p2"], card("dimensional_barrage", "group-strategy"));
  game.emitCardDeclared("p0", ["p1"], card("attack", "normal-attack"));
  game.emitCardDeclared("p0", ["p1"], card("counter", "response-counter"));
  assert.equal(robin.roundFlags.robinBloom, undefined);
  assert.equal(game.eventHistory.filter(event => event.type === "hiddenCardViewed").length, 0);

  game.emitCardDeclared("p0", ["p1"], card("energy_collapse", "later-strategy"));
  assert.equal(game.eventHistory.filter(event => event.type === "hiddenCardViewed" && event.reason === "robinBloom").length, 1);
});

test("两目标策略选择第一人时不触发百花缭乱", () => {
  for (const id of ["equipment_shift", "initiative_swap"]) {
    const game = create(), robin = game.player("p0"), target = game.player("p1");
    robin.hand = [card(id, `robin-${id}`)];
    target.hand = [card("guard", `target-${id}`)];
    target.equipment.weapon = { uid: `weapon-${id}`, id: "weapon", type: "equipment", slot: "weapon" };

    assert.ok(game.getCardTargets("p0", robin.hand[0]).includes("p1"));
    assert.equal(game.playCard("p0", robin.hand[0].uid, "p1").pending, true);
    assert.ok(game.pendingChoice);
    assert.equal(robin.roundFlags.robinBloom, undefined);
    assert.equal(game.eventHistory.filter(event => event.type === "hiddenCardViewed" && event.reason === "robinBloom").length, 0);
    assert.equal(robin.dreamState.progress, 0);
  }
});

test("罗宾声明后的查看不因策略被反制而撤销，只有本人可读取牌名", () => {
  const game = create(), target = game.player("p1");
  target.human = true;
  target.hand = [card("attack", "private-attack"), card("counter", "target-counter")];
  const strategy = card("energy_collapse", "cancelled-strategy");
  game.player("p0").hand = [strategy];
  assert.equal(game.playCard("p0", strategy.uid, "p1").ok, true);
  assert.equal(game.pendingResponse?.type, "counter");
  assert.deepEqual(game.getVisibleCardPeeks("p0"), [{ ownerId: "p1", cardName: "突击", round: game.round }]);
  game.respond(true);

  assert.deepEqual(game.getVisibleCardPeeks("p0"), [{ ownerId: "p1", cardName: "突击", round: game.round }]);
  assert.deepEqual(game.getVisibleCardPeeks("p1"), []);
  assert.ok(!game.logs.some(entry => entry.message.includes("private-attack") || entry.message.includes("【突击】")));
  assert.equal(game.player("p0").dreamState.progress, 1);
  assert.equal(target.hand.some(item => item.uid === "target-counter"), false);
  assert.equal(game.eventHistory.filter(event => event.card?.uid === strategy.uid && ["cardResolved", "cardCancelled"].includes(event.type)).length, 1);
});
