import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine.js";
import { cardDefinitions as cards } from "../src/data.js";
const card = (id, uid = id) => ({ ...cards[id], uid });
function create(id) {
  const g = new GameEngine({ modeId: "ranked2v2", humanCharacterId: id, fixedAnchorSeat: 0, random: () => .25 }).setup();
  for (const p of g.players) { p.human = false; p.hand = []; p.equipment = { weapon: null, armor: null, charm: null }; }
  for (const p of g.players.slice(1)) { p.characterId = "yuji"; p.hp = p.maxHp = 8; }
  return g;
}
test("鸣人分身防御实际消耗并强化下一击，无分身不能免费防御", () => {
  const g = create("naruto"), p = g.player("p0"); p.energy = 0;
  p.specialCards = [{ uid: "clone", kind: "clone", card: card("focus") }];
  assert.equal(g.guardResources("p0"), 1); g.spendGuards("p0", 1);
  assert.equal(g.guardResources("p0"), 0); assert.equal(p.energy, 1);
  assert.equal(p.turnFlags.nextAttackBonus, true);
});
test("小樱基础百豪提供怪力，策略百豪不额外提供伤害", () => {
  for (const type of ["basic", "strategy"]) {
    const g = create("sakura"), p = g.player("p0"); p.poison = 1; p.turnFlags.nextAttackBonus = false;
    p.specialCards = [{ uid: "seal", kind: "byakugo", card: card(type === "basic" ? "focus" : "counter") }];
    assert.equal(g.consumeByakugo("p0", type), true);
    assert.equal(p.turnFlags.nextAttackBonus, type === "basic");
    assert.equal(p.poison, type === "strategy" ? 0 : 1);
  }
});
test("我爱罗绝对防御可放弃且不取消招牌伤害", () => {
  const g = create("gaara"), p = g.player("p0"); p.human = true; p.hand = [card("focus")];
  g.beginAttack({ sourceId: "p1", targetId: "p0", skipIntervene: true });
  assert.ok(g.pendingChoice); g.resolveChoice("p0", "pass");
  assert.ok(!p.roundFlags.absoluteDefense); assert.equal(p.hp, 2);
  g.beginAttack({ sourceId: "p1", targetId: "p0", origin: "signature", damage: 1, skipIntervene: true });
  assert.equal(g.pendingChoice, null); assert.equal(p.hp, 1);
});
test("鹿丸战术预读每轮一次，非棋子攻击不会错误触发", () => {
  const g = create("shikamaru"), p = g.player("p0"); p.chessTargetId = "p1";
  g.afterDefended("p0", "p3", "attack"); assert.ok(!p.turnFlags.shadowNeckTarget);
  g.afterDefended("p1", "p3", "attack"); assert.equal(p.turnFlags.shadowNeckTarget, "p1");
  p.turnFlags.shadowNeckTarget = null; g.afterDefended("p1", "p3", "attack");
  assert.equal(p.turnFlags.shadowNeckTarget, null);
});
test("佐助标记只强化普通突击，普通招牌攻击不消耗追猎", () => {
  const g = create("sasuke"), p = g.player("p0"); p.swapMarkedId = "p1";
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "signature", skipIntervene: true });
  assert.equal(p.swapMarkedId, "p1"); assert.equal(g.player("p1").hp, 7);
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
  assert.equal(p.swapMarkedId, null);
});
test("卡卡西只有拷贝牌触发查克拉回收，且每轮仅一次", () => {
  const g = create("kakashi"), p = g.player("p0"); p.energy = 0; p.roundFlags.damageEnergy = true; p.attackLimit = 3;
  p.hand = [card("attack","real"),{...card("attack","copy1"),_copiedBy:"p0"},{...card("attack","copy2"),_copiedBy:"p0"}];
  g.playCard("p0","real","p1"); assert.equal(p.energy, 0);
  g.playCard("p0","copy1","p1"); assert.equal(p.energy, 1);
  g.playCard("p0","copy2","p1"); assert.equal(p.energy, 1);
});
test("雏田封穴只对锁定目标生效，被反制的策略不封穴", () => {
  const g = create("hinata"), p = g.player("p0"); p.scoutedTargetId = "p1";
  p.hand = [card("energy_collapse","cancelled"),card("energy_collapse","other")];
  g.player("p1").hand = [card("counter")];
  g.playCard("p0","cancelled","p1"); assert.equal(g.player("p1").energyLocked, false);
  g.playCard("p0","other","p3"); assert.equal(g.player("p3").energyLocked, false);
});
test("自来也零伤害不积仙术印，每轮造成与受到伤害各仅一次", () => {
  const g = create("jiraiya"), p = g.player("p0");
  g.dealDamage("p0","p1",0,"strategy"); assert.equal(p.sageMarks, 0);
  g.dealDamage("p0","p1",1,"strategy"); g.dealDamage("p0","p3",1,"strategy"); assert.equal(p.sageMarks, 1);
  g.dealDamage("p1","p0",1,"strategy"); g.dealDamage("p3","p0",1,"strategy");
  assert.equal(p.sageMarks, 2); assert.equal(p.sageResonance, true);
});
test("大蛇丸研究额外能量只来自对应类别的实际用牌", () => {
  const g = create("orochimaru"), p = g.player("p0"); p.energy = 0; p.curseResearchType = "equipment";
  p.hand = [card("weapon"),card("armor"),card("focus")];
  g.playCard("p0","weapon","p0"); assert.equal(p.energy, 1);
  g.playCard("p0","armor","p0"); assert.equal(p.energy, 2);
  p.energy = 0; g.playCard("p0","focus","p0"); assert.equal(p.energy, 1);
});
test("路飞越战越勇不强化招牌攻击，保留到下一次普通突击", () => {
  const g = create("luffy"), p = g.player("p0"); p.turnFlags.nextAttackBonus = true;
  g.beginAttack({ sourceId:"p0",targetId:"p1",origin:"signature",skipIntervene:true });
  assert.equal(g.player("p1").hp, 7); assert.equal(p.turnFlags.nextAttackBonus, true);
  g.beginAttack({ sourceId:"p0",targetId:"p1",origin:"attack",skipIntervene:true });
  assert.equal(g.player("p1").hp, 5); assert.equal(p.turnFlags.nextAttackBonus, false);
});
test("索隆剑士本能只从普通突击被防御获得每轮一次补牌", () => {
  const g=create("zoro"),p=g.player("p0");p.hand=[];
  g.afterDefended("p0","p1","signature");assert.equal(p.hand.length,0);
  g.afterDefended("p0","p1","attack");assert.equal(p.hand.length,1);
  g.afterDefended("p0","p1","attack");assert.equal(p.hand.length,1);
});
test("乔巴毛皮只用非响应基础牌，每轮最多替代一张防御", () => {
  const g=create("chopper"),p=g.player("p0");p.hand=[card("counter")];
  assert.equal(g.guardResources("p0"),0);
  p.hand=[card("focus","a"),card("focus","b")];assert.equal(g.guardResources("p0"),1);
  g.spendGuards("p0",1);assert.equal(p.hand.length,1);assert.equal(g.guardResources("p0"),0);
});
test("弗兰奇钢铁之躯不减少策略伤害，普通突击每轮减伤一次", () => {
  const g=create("franky"),p=g.player("p0");
  g.dealDamage("p1","p0",1,"strategy");assert.equal(p.hp,3);
  g.dealDamage("p1","p0",1,"attack");assert.equal(p.hp,3);
  g.dealDamage("p1","p0",1,"attack");assert.equal(p.hp,2);
});
test("布鲁克灵魂出窍减伤只针对策略且每轮一次", () => {
  const g=create("brook"),p=g.player("p0");
  g.dealDamage("p1","p0",1,"strategy");assert.equal(p.hp,3);
  g.dealDamage("p1","p0",1,"strategy");assert.equal(p.hp,2);
  g.dealDamage("p1","p0",1,"attack");assert.equal(p.hp,1);
});
