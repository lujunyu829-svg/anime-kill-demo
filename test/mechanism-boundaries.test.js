import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine.js";
import { cardDefinitions as cards } from "../src/data.js";
const card = (id, uid = id) => ({ ...cards[id], uid });
const create = id => {
  const game = new GameEngine({ modeId: "ranked2v2", humanCharacterId: id, fixedAnchorSeat: 0, random: () => .25 }).setup();
  for (const p of game.players.slice(1)) { p.characterId = "mikasa"; p.hand = []; p.hp = p.maxHp = 4; }
  return game;
};
test("乔巴对满体力无变化回复不触发诊断", () => {
  const g = create("chopper"), before = g.player("p0").hand.length;
  g.resolveHeal("p0","p2");
  assert.equal(g.player("p0").hand.length,before);
  assert.equal(g.player("p0").dreamState.progress,0);
});
test("三刀流普通突击命中能推进梦想", () => {
  const g = create("zoro"), p = g.player("p0");
  p.hand = [card("attack"),card("focus")]; g.player("p1").roundFlags.substitute = true;
  g.useActiveSkill("p0","p0"); g.resolveChoice("p0","focus");
  g.playCard("p0","attack","p1");
  assert.equal(p.dreamState.progress,1);
});
test("布鲁克黄泉寒气每回合只触发一次且按实际新增状态推进梦想", () => {
  const g = create("brook"), p = g.player("p0");
  g.dealDamage("p0","p1",1,"attack"); g.dealDamage("p0","p3",1,"attack");
  assert.equal(g.player("p1").frozenDraw,1); assert.equal(g.player("p3").frozenDraw,0);
  assert.equal(p.dreamState.progress,1);
});
test("大蛇丸玩家可放弃蛇蜕保留实验牌", () => {
  const g = create("orochimaru"), p = g.player("p0");
  p.hand = [{...card("heal"),_curseSpoil:"p0"}];
  g.dealDamage("p1","p0",1,"strategy");
  assert.equal(g.pendingChoice?.title,"蛇蜕");
  g.resolveChoice("p0","pass");
  assert.equal(p.hp,3); assert.equal(p.hand.length,1); assert.ok(!p.roundFlags.shed);
});
test("大蛇丸AI咒印选择高频基础样本，不浪费唯一攻击", () => {
  const g = create("orochimaru"), p = g.player("p0"); p.human = false;
  p.hand = [card("attack"),card("focus"),card("weapon")];
  g.useActiveSkill("p0","p1");
  assert.equal(g.player("p1").curseSeal.type,"basic");
  assert.ok(p.hand.some(c=>c.id==="attack"));
});
test("鹿丸棋子已经行动时仍获得预读强化，不能移动已行动者", () => {
  const g = create("shikamaru"), p = g.player("p0");
  p.chessTargetId = "p1"; g.turnQueue = ["p2","p3"];
  assert.equal(g.triggerTacticalForesight("p0","p1"),true);
  assert.equal(p.turnFlags.shadowNeckTarget,"p1"); assert.deepEqual(g.turnQueue,["p2","p3"]);
});
test("甚平队友护盾均达到上限时不再浪费弃牌", () => {
  const g=create("jinbe"),p=g.player("p0");p.human=false;p.shield=3;g.player("p2").shield=3;
  p.hand=[card("guard")];p.energy=0;
  g.aiStep("p0"); assert.equal(p.hand.length,1); assert.equal(p.shield,3);
});
test("乔巴和山治AI优先合法有效治疗", () => {
  for(const id of ["chopper","sanji"]) {
    const g=create(id),p=g.player("p0");p.human=false;g.random=()=>.9;g.player("p2").hp=3;
    p.hand=[card(id==="chopper"?"focus":"weapon")];p.energy=0;
    g.aiStep("p0");assert.equal(g.player("p2").hp,4,id);
  }
});
test("取消的牌也有且只有一个声明和取消终态", () => {
  const g=create("orochimaru"),p=g.player("p0");p.curseSeal={sourceId:"p1",type:"basic",setTurn:g.turnNumber};
  p.hand=[card("attack")];g.playCard("p0","attack","p1");
  const life=g.eventHistory.filter(e=>e.card?.uid==="attack"&&["cardDeclared","cardResolved","cardCancelled"].includes(e.type));
  assert.deepEqual(life.map(e=>e.type),["cardDeclared","cardCancelled"]);
});

test("卡牌取消事件保留原使用者并独立记录实际取消者", () => {
  const g = create("nami"); g.player("p1").hand = [card("counter")];
  g.player("p0").hand = [card("energy_collapse")];
  g.playCard("p0", "energy_collapse", "p1");
  const event = g.eventHistory.find(e => e.type === "cardCancelled" && e.card?.uid === "energy_collapse");
  assert.equal(event.sourceId, "p0"); assert.equal(event.cancelledById, "p1");
});
