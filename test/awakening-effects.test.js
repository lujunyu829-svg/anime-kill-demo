import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine.js";
import { cardDefinitions as cards } from "../src/data.js";
const card = (id, uid = id) => ({ ...cards[id], uid });
function create(id, awake = true) {
  const g = new GameEngine({ modeId:"ranked2v2", humanCharacterId:id, fixedAnchorSeat:0, random:()=>.25 }).setup();
  for (const p of g.players.slice(1)) { p.characterId="yuji"; p.hand=[]; p.hp=p.maxHp=4; }
  const p=g.player("p0");p.dreamState.awakened=awake;p.energy=4;p.hand=[];
  return g;
}
test("路飞五档只有觉醒后才提供无限距离和穿甲", () => {
  for (const awake of [false,true]) {
    const g=create("luffy",awake),p=g.player("p0");p.hp=3;
    g.useSignature("p0","p0");
    assert.equal(p.hp,4);assert.equal(p.hand.length,2);
    assert.equal(Boolean(p.rangeInfinite),awake);
    assert.equal(Boolean(p.turnFlags.nextAttackIgnoreArmor),awake);
  }
});
test("觉醒娜美选牌必须异类别，剩余置顶顺序由选择决定", () => {
  const g=create("nami"),p=g.player("p0");
  g.deck=[card("focus","a"),card("attack","b"),card("weapon","c"),card("counter","d")];
  g.useActiveSkill("p0","p0");g.resolveChoice("p0","a");
  assert.ok(!g.pendingChoice.options.some(o=>o.value==="b"));
  g.resolveChoice("p0","c");g.resolveChoice("p0","bottom");g.resolveChoice("p0","top");
  assert.deepEqual(p.hand.map(c=>c.uid),["a","c"]);
  assert.deepEqual(g.deck.map(c=>c.uid),["d","b"]);assert.equal(g.pendingChoice,null);
});
test("觉醒乌索普谎言每轮只回收一次，未触发牌会到期弃置", () => {
  const g=create("usopp"),p=g.player("p0");
  const lie=(uid)=>({uid:"lie-"+uid,kind:"lie",card:card("focus",uid),targetId:"p1",setTurn:g.turnNumber});
  for(const uid of ["first","second"]) {
    p.specialCards.push(lie(uid));
    g.player("p1").hand=[card("weapon","play-"+uid)];
    g.playCard("p1","play-"+uid,"p1",{freeUse:true});
  }
  assert.deepEqual(p.hand.map(c=>c.uid),["first"]);
  assert.ok(g.discard.some(c=>c.uid==="second"));
  p.specialCards.push(lie("expired"));g.turnNumber++;g.completeTurnStart("p0");
  assert.equal(p.specialCards.length,0);assert.ok(g.discard.some(c=>c.uid==="expired"));
});
test("觉醒山治海上餐厅额外给受助者摸一张，未觉醒不额外摸", () => {
  for(const awake of [false,true]) {
    const g=create("sanji",awake),p=g.player("p0");p.human=false;p.hand=[card("weapon")];g.player("p2").hp=3;
    g.useActiveSkill("p0","p2");
    assert.equal(g.player("p2").hp,4);assert.equal(g.player("p2").hand.length,awake?1:0);
  }
});
test("觉醒罗宾展示两张但只封存一张，原持有者回合开始归还", () => {
  const g=create("robin"),p=g.player("p0"),t=g.player("p1");
  p.hand=[card("focus","pay-a"),card("weapon","pay-b")];t.hand=[card("attack","hidden-a"),card("weapon","hidden-b")];
  g.useActiveSkill("p0","p1");
  const shown=g.eventHistory.filter(e=>e.type==="hiddenCardViewed");
  assert.equal(shown.length,2);assert.equal(new Set(shown.map(e=>e.card.uid)).size,2);
  g.resolveChoice("p0","hidden-b:pay-b");
  assert.equal(t.sealedCards.length,1);assert.equal(t.hand.length,1);
  g.completeTurnStart("p1");
  assert.equal(t.sealedCards.length,0);assert.equal(t.hand.filter(c=>c.uid==="hidden-b").length,1);
});
test("觉醒弗兰奇工坊直接装备并把旧装备返手，只派发一次变化", () => {
  const g=create("franky"),p=g.player("p0");p.human=false;p.equipment.weapon=card("weapon","old");
  g.discard=[card("impact_hammer","new")];
  g.useActiveSkill("p0","p0");
  assert.equal(p.equipment.weapon.uid,"new");assert.ok(p.hand.some(c=>c.uid==="old"));
  assert.equal(g.eventHistory.filter(e=>e.type==="equipmentChanged"&&e.ownerId==="p0").length,1);
});
test("觉醒甚平给队友护盾无需弃牌，但无手牌时不能自我护航", () => {
  const g=create("jinbe"),p=g.player("p0");
  assert.ok(!g.getActiveSkillTargets("p0").includes("p0"));
  assert.equal(g.useActiveSkill("p0","p0").ok,false);
  assert.equal(g.useActiveSkill("p0","p2").ok,true);
  assert.equal(g.player("p2").shield,1);assert.equal(p.hand.length,0);
});
