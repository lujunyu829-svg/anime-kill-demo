import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine.js";
import { cardDefinitions as cards } from "../src/data.js";

const card = (id, uid = id) => ({ ...cards[id], uid });
function create(id) {
  const g = new GameEngine({ modeId: "ranked2v2", humanCharacterId: id, fixedAnchorSeat: 0, random: () => .25 }).setup();
  for (const p of g.players.slice(1)) { p.characterId = "mikasa"; p.hand = []; p.hp = p.maxHp = 8; }
  return g;
}
const events = {
  luffy: [{ type: "afterDamage", origin: "attack", amount: 1 }],
  zoro: [{ type: "afterDamage", origin: "asura", amount: 1 }],
  nami: [{ type: "cardResolved", card: card("focus") }, { type: "cardResolved", card: card("memory_exchange") }],
  usopp: [{ type: "cardsDiscarded", amount: 1 }],
  sanji: [{ type: "afterHeal", amount: 1 }],
  chopper: [{ type: "afterHeal", amount: 1 }],
  robin: [{ type: "hiddenCardViewed", card: card("attack") }],
  franky: [{ type: "equipmentChanged", ownerId: "p0", entered: card("weapon") }],
  brook: [{ type: "drawReduced", amount: 1 }],
  jinbe: [{ type: "shieldGranted", amount: 1 }]
};
for (const [id, inputs] of Object.entries(events)) test(`${id}梦想：同轮限次、三轮觉醒、觉醒后及退场不推进`, () => {
  const g = create(id), p = g.player("p0");
  const emit = () => inputs.forEach(e => g.emitOnePieceEvent({ sourceId: "p0", targetId: "p2", ...e }));
  for (let round = 1; round <= 3; round++) {
    g.round = round; p.roundFlags = {}; p.turnFlags = {};
    emit(); emit();
    assert.equal(p.dreamState.progress, round);
    assert.equal(p.dreamState.awakened, round === 3);
  }
  g.round = 4; p.roundFlags = {}; p.turnFlags = {}; emit();
  assert.equal(p.dreamState.progress, 3);
  p.dreamState = { progress: 0, awakened: false, progressedRound: 0 }; p.alive = false;
  g.round = 5; p.roundFlags = {}; p.turnFlags = {}; emit();
  assert.equal(p.dreamState.progress, 0);
});
test("无实际伤害、回复、弃牌、护盾或新增状态不推进梦想", () => {
  for (const id of ["luffy", "zoro", "usopp", "sanji", "chopper", "brook", "jinbe"]) {
    const g = create(id);
    for (const e of events[id]) g.emitOnePieceEvent({ sourceId: "p0", targetId: "p2", ...e, amount: 0 });
    assert.equal(g.player("p0").dreamState.progress, 0, id);
  }
});
test("娜美被取消的第二类牌不能计为成功组合", () => {
  const g = create("nami");
  g.emitOnePieceEvent({ type: "cardResolved", sourceId: "p0", card: card("focus") });
  g.emitOnePieceEvent({ type: "cardCancelled", sourceId: "p0", card: card("memory_exchange") });
  assert.equal(g.player("p0").dreamState.progress, 0);
});
test("弗兰奇同一装备未发生移动不能推进梦想或获得能量", () => {
  const g = create("franky"), p = g.player("p0"), energy = p.energy;
  g.emitOnePieceEvent({ type: "equipmentChanged", ownerId: "p0", entered: card("weapon"), left: card("weapon") });
  assert.equal(p.dreamState.progress, 0); assert.equal(p.energy, energy);
});
test("没有真实隐藏牌信息不触发历史学者", () => {
  const g = create("robin"), p = g.player("p0"), count = p.hand.length;
  g.emitOnePieceEvent({ type: "hiddenCardViewed", sourceId: "p0", targetId: "p1" });
  assert.equal(p.dreamState.progress, 0); assert.equal(p.hand.length, count);
});
test("无净化变化不推进乔巴梦想", () => {
  const g = create("chopper");
  g.emitOnePieceEvent({ type: "abnormalityCleansed", sourceId: "p0", targetId: "p2", amount: 0 });
  assert.equal(g.player("p0").dreamState.progress, 0);
});
test("山治援护在同轮消费后不能通过第二次治疗再次获得", () => {
  const g = create("sanji"), p = g.player("p0");
  g.player("p2").hp = 6; g.resolveHeal("p0", "p2");
  assert.equal(p.turnFlags.supportCounter, true);
  g.beginAttack({ sourceId: "p0", targetId: "p1", skipIntervene: true });
  assert.equal(p.turnFlags.supportCounter, false);
  g.resolveHeal("p0", "p2");
  assert.equal(p.turnFlags.supportCounter, false);
});
test("战术接力的实际给牌推进山治梦想并获得援护", () => {
  const g = create("sanji"), p = g.player("p0");
  p.hand = [card("focus", "gift")];
  g.resolveTacticalRelay("p0", "p2"); g.resolveChoice("p0", "gift");
  assert.equal(p.dreamState.progress, 1); assert.equal(p.turnFlags.supportCounter, true);
  assert.ok(g.eventHistory.some(e => e.type === "cardTransferred" && e.sourceId === "p0" && e.targetId === "p2" && e.card.uid === "gift"));
});
test("觉醒布鲁克可承受麒麟致命伤害一次，但失去体力不能免死", () => {
  const g = create("brook"), p = g.player("p0"); p.human = false;
  p.hp = 1; p.hand = []; p.dreamState.awakened = true;
  g.dealDamage("p1", "p0", 1, "kirin");
  assert.equal(p.hp, 1); assert.equal(p.alive, true); assert.equal(p.reviveUsed, true);
  const h = create("brook"), q = h.player("p0"); q.human = false;
  q.hp = 1; q.hand = []; q.dreamState.awakened = true;
  h.loseHp("p0", 1, "p1", "attack");
  assert.equal(q.alive, false); assert.equal(q.reviveUsed, false);
});
