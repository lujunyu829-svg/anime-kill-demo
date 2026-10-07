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
test("鸣人羁绊回响只在持有分身时延长普通突击距离", () => {
  const g = create("naruto"), p = g.player("p0");
  assert.equal(g.attackRange("p0"), 1);
  p.specialCards = [{ uid: "range-clone", kind: "clone", card: card("focus") }];
  assert.equal(g.attackRange("p0"), 99);
  assert.ok(g.getCardTargets("p0", card("attack")).includes("p2"));
  g.spendGuards("p0", 1);
  assert.equal(g.attackRange("p0"), 1);
  assert.ok(!g.getCardTargets("p0", card("attack")).includes("p2"));
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
test("小樱医疗忍术的装备百豪转护盾，错误类别不产生护盾", () => {
  const g = create("sakura"), p = g.player("p0");
  p.human = true;
  p.specialCards = [{ uid: "equipment-seal", kind: "byakugo", card: card("weapon") }];
  assert.equal(g.consumeByakugo("p0", "strategy"), false);
  assert.equal(p.shield, 0);
  assert.equal(g.useActiveSkill("p0", "p0").pending, true);
  g.resolveChoice("p0", "release:equipment-seal");
  assert.equal(p.shield, 2);
});
test("我爱罗绝对防御可放弃且不取消招牌伤害", () => {
  const g = create("gaara"), p = g.player("p0"); p.human = true; p.hand = [card("focus")];
  g.beginAttack({ sourceId: "p1", targetId: "p0", skipIntervene: true });
  assert.ok(g.pendingChoice); g.resolveChoice("p0", "pass");
  assert.ok(!p.roundFlags.absoluteDefense); assert.equal(p.hp, 2);
  g.beginAttack({ sourceId: "p1", targetId: "p0", origin: "signature", damage: 1, skipIntervene: true });
  assert.equal(g.pendingChoice, null); assert.equal(p.hp, 1);
});
test("我爱罗绝对防御实际弃牌取消普通突击，同轮第二次不再触发", () => {
  const g = create("gaara"), p = g.player("p0");
  g.player("p1").characterId = "luffy";
  p.hand = [card("focus", "shield-cost"), card("focus", "second-card")];
  g.beginAttack({ sourceId: "p1", targetId: "p0", origin: "attack", skipIntervene: true });
  assert.equal(p.hp, 3);
  assert.equal(p.hand.length, 1);
  assert.equal(p.roundFlags.sandShield, true);
  g.beginAttack({ sourceId: "p1", targetId: "p0", origin: "attack", skipIntervene: true });
  assert.equal(p.hp, 2);
  assert.equal(p.hand.length, 1);
});
test("我爱罗砂瀑追葬不被招牌攻击误消耗，也不强化未标记者", () => {
  const g = create("gaara"), p = g.player("p0"), other = g.player("p3");
  g.player("p1").sandMarkedBy = "p0";
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "signature", skipIntervene: true });
  assert.equal(g.player("p1").sandMarkedBy, "p0");
  g.beginAttack({ sourceId: "p0", targetId: "p3", origin: "attack", skipIntervene: true });
  assert.equal(other.hp, 7);
  assert.equal(g.player("p1").sandMarkedBy, "p0");
  assert.equal(p.hp, 3);
});
test("鹿丸战术预读每轮一次，非棋子攻击不会错误触发", () => {
  const g = create("shikamaru"), p = g.player("p0"); p.chessTargetId = "p1";
  g.afterDefended("p0", "p3", "attack"); assert.ok(!p.turnFlags.shadowNeckTarget);
  g.afterDefended("p1", "p3", "attack"); assert.equal(p.turnFlags.shadowNeckTarget, "p1");
  p.turnFlags.shadowNeckTarget = null; g.afterDefended("p1", "p3", "attack");
  assert.equal(p.turnFlags.shadowNeckTarget, null);
});
test("鹿丸影缝不取消未被落子的角色实际使用的突击", () => {
  const g = create("shikamaru"), p = g.player("p0"), other = g.player("p3");
  p.chessTargetId = "p1";
  other.hand = [card("attack", "unmarked-attack")];
  const result = g.playCard("p3", "unmarked-attack", "p0", { freeUse: true });
  assert.equal(result.cancelled, undefined);
  assert.equal(p.hp, 2);
  assert.ok(!p.roundFlags.foresight);
});
test("鼬月读前兆只让带有自己虚假伏笔的目标额外需要防御", () => {
  const marked = create("itachi"), target = marked.player("p1");
  target.hand = [card("guard")];
  marked.player("p0").plots = [{ uid: "illusion", card: card("focus"), ownerId: "p0", targetId: "p1", isFalse: true, effect: "falsePlot" }];
  marked.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
  assert.equal(target.hp, 7);
  const plain = create("itachi"), other = plain.player("p1");
  other.hand = [card("guard")];
  plain.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
  assert.equal(other.hp, 8);
});
test("鼬乌鸦替身不响应非普通突击，虚假伏笔仍保留", () => {
  const g = create("itachi"), p = g.player("p0");
  p.plots = [{ uid: "raven", card: card("focus"), ownerId: "p0", targetId: "p3", isFalse: true, effect: "falsePlot" }];
  g.beginAttack({ sourceId: "p1", targetId: "p0", origin: "signature", skipIntervene: true });
  assert.equal(p.hp, 2);
  assert.equal(p.plots.length, 1);
});
test("佐助标记只强化普通突击，普通招牌攻击不消耗追猎", () => {
  const g = create("sasuke"), p = g.player("p0"); p.swapMarkedId = "p1";
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "signature", skipIntervene: true });
  assert.equal(p.swapMarkedId, "p1"); assert.equal(g.player("p1").hp, 7);
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
  assert.equal(p.swapMarkedId, null);
});
test("佐助千鸟贯穿仅在有追猎标记且攻击被完全防御后补牌", () => {
  const g = create("sasuke"), p = g.player("p0"), target = g.player("p1");
  target.hand = [card("guard", "guard-one"), card("guard", "guard-two")];
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
  assert.equal(p.hand.length, 0);
  p.swapMarkedId = "p1";
  target.hand = [card("guard", "guard-three"), card("guard", "guard-four")];
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
  assert.equal(p.hand.length, 1);
});
test("卡卡西只有拷贝牌触发查克拉回收，且每轮仅一次", () => {
  const g = create("kakashi"), p = g.player("p0"); p.energy = 0; p.roundFlags.damageEnergy = true; p.attackLimit = 3;
  p.hand = [card("attack","real"),{...card("attack","copy1"),_copiedBy:"p0"},{...card("attack","copy2"),_copiedBy:"p0"}];
  g.playCard("p0","real","p1"); assert.equal(p.energy, 0);
  g.playCard("p0","copy1","p1"); assert.equal(p.energy, 1);
  g.playCard("p0","copy2","p1"); assert.equal(p.energy, 1);
});
test("卡卡西战术判断由拷贝类别决定，并非普通手牌均能蓄势", () => {
  const g = create("kakashi"), p = g.player("p0");
  g.discard = [card("attack", "discard-basic")];
  g.resolveCopyNinjutsu("p0");
  g.resolveChoice("p0", "discard-basic");
  assert.equal(p.turnFlags.nextAttackBonus, true);
  assert.ok(!p.turnFlags.copyNoIntervene);
  p.turnFlags.nextAttackBonus = false;
  g.discard = [card("energy_collapse", "discard-strategy")];
  g.resolveCopyNinjutsu("p0");
  g.resolveChoice("p0", "discard-strategy");
  assert.ok(!p.turnFlags.nextAttackBonus);
  assert.equal(p.turnFlags.copyNoIntervene, true);
});
test("雏田封穴只对锁定目标生效，被反制的策略不封穴", () => {
  const g = create("hinata"), p = g.player("p0"); p.scoutedTargetId = "p1";
  p.hand = [card("energy_collapse","cancelled"),card("energy_collapse","other")];
  g.player("p1").hand = [card("counter")];
  g.playCard("p0","cancelled","p1"); assert.equal(g.player("p1").energyLocked, false);
  g.playCard("p0","other","p3"); assert.equal(g.player("p3").energyLocked, false);
});
test("雏田八卦领域只让白眼目标无视防护装甲", () => {
  const g = create("hinata"), target = g.player("p1"), other = g.player("p3");
  for (const p of [target, other]) { p.equipment.armor = card("armor", `armor-${p.id}`); p.armorReady = true; }
  g.player("p0").scoutedTargetId = "p1";
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
  g.beginAttack({ sourceId: "p0", targetId: "p3", origin: "attack", skipIntervene: true });
  assert.equal(target.hp, 7);
  assert.equal(other.hp, 8);
});
test("自来也零伤害不积仙术印，每轮造成与受到伤害各仅一次", () => {
  const g = create("jiraiya"), p = g.player("p0");
  g.dealDamage("p0","p1",0,"strategy"); assert.equal(p.sageMarks, 0);
  g.dealDamage("p0","p1",1,"strategy"); g.dealDamage("p0","p3",1,"strategy"); assert.equal(p.sageMarks, 1);
  g.dealDamage("p1","p0",1,"strategy"); g.dealDamage("p3","p0",1,"strategy");
  assert.equal(p.sageMarks, 2); assert.equal(p.sageResonance, true);
});
test("自来也蛤蟆协攻不会由未束缚角色正常出牌触发", () => {
  const g = create("jiraiya"), p = g.player("p0"), other = g.player("p3");
  other.hand = [card("focus", "plain-focus")];
  const before = p.hand.length;
  const result = g.playCard("p3", "plain-focus", "p3", { freeUse: true });
  assert.equal(result.ok, true);
  assert.equal(p.hand.length, before);
  assert.ok(!g.logs.some(item => item.message?.includes("蛤蟆协攻")));
});
test("大蛇丸研究额外能量只来自对应类别的实际用牌", () => {
  const g = create("orochimaru"), p = g.player("p0"); p.energy = 0; p.curseResearchType = "equipment";
  p.hand = [card("weapon"),card("armor"),card("focus")];
  g.playCard("p0","weapon","p0"); assert.equal(p.energy, 1);
  g.playCard("p0","armor","p0"); assert.equal(p.energy, 2);
  p.energy = 0; g.playCard("p0","focus","p0"); assert.equal(p.energy, 1);
});
test("大蛇丸禁术容器不从非研究类别的实际回复牌获得额外能量", () => {
  const g = create("orochimaru"), p = g.player("p0");
  p.curseResearchType = "equipment";
  p.hp = 3; p.energy = 0; p.hand = [card("heal", "wrong-class")];
  assert.equal(g.playCard("p0", "wrong-class", "p0").ok, true);
  assert.equal(p.hp, 4);
  assert.equal(p.energy, 0);
});
test("大蛇丸蛇蜕在实际受伤时消耗实验牌减伤，未受伤不消耗", () => {
  const g = create("orochimaru"), p = g.player("p0");
  p.hp = 2;
  p.hand = [{ ...card("focus", "spoil"), _curseSpoil: "p0" }];
  g.dealDamage("p1", "p0", 0, "strategy");
  assert.equal(p.hand.length, 1);
  g.dealDamage("p1", "p0", 1, "strategy");
  assert.equal(p.hp, 2);
  assert.equal(p.hand.length, 0);
  assert.equal(p.roundFlags.shed, true);
});
test("路飞越战越勇不强化招牌攻击，保留到下一次普通突击", () => {
  const g = create("luffy"), p = g.player("p0"); p.turnFlags.nextAttackBonus = true;
  g.beginAttack({ sourceId:"p0",targetId:"p1",origin:"signature",skipIntervene:true });
  assert.equal(g.player("p1").hp, 7); assert.equal(p.turnFlags.nextAttackBonus, true);
  g.beginAttack({ sourceId:"p0",targetId:"p1",origin:"attack",skipIntervene:true });
  assert.equal(g.player("p1").hp, 5); assert.equal(p.turnFlags.nextAttackBonus, false);
});
test("路飞见闻色非基础牌不抵挡突击且同轮只翻牌一次", () => {
  const g = create("luffy"), p = g.player("p0");
  g.deck.unshift(card("energy_collapse", "omen-strategy"));
  g.beginAttack({ sourceId: "p1", targetId: "p0", origin: "attack", skipIntervene: true });
  assert.equal(p.hp, 3);
  assert.equal(p.roundFlags.observation, true);
  assert.equal(g.deck.at(-1).uid, "omen-strategy");
  g.deck.unshift(card("guard", "second-omen"));
  g.beginAttack({ sourceId: "p1", targetId: "p0", origin: "attack", skipIntervene: true });
  assert.equal(p.hp, 2);
  assert.equal(g.deck[0].uid, "second-omen");
});
test("索隆剑士本能只从普通突击被防御获得每轮一次补牌", () => {
  const g=create("zoro"),p=g.player("p0");p.hand=[];
  g.afterDefended("p0","p1","signature");assert.equal(p.hand.length,0);
  g.afterDefended("p0","p1","attack");assert.equal(p.hand.length,1);
  g.afterDefended("p0","p1","attack");assert.equal(p.hand.length,1);
});
test("索隆剑士本能的武器距离额外加一，未装备时不加", () => {
  const g = create("zoro"), p = g.player("p0");
  assert.equal(g.attackRange("p0"), 1);
  p.equipment.weapon = card("weapon");
  assert.equal(g.attackRange("p0"), 1 + (p.equipment.weapon.rangeBonus || 0) + 1);
});
test("索隆三刀流必须有非响应牌支付，蓄势只作用于下一次突击", () => {
  const g = create("zoro"), p = g.player("p0"), target = g.player("p1");
  p.hand = [card("counter")];
  assert.deepEqual(g.getActiveSkillTargets("p0"), []);
  p.hand = [card("focus", "sword-cost")];
  assert.equal(g.useActiveSkill("p0", "p0").ok, true);
  assert.equal(p.turnFlags.nextAttackBonus, true);
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
  assert.equal(target.hp, 6);
  assert.equal(p.turnFlags.nextAttackBonus, false);
});
test("娜美气象棒不从已反制的策略牌或同轮第二张策略牌回能", () => {
  const g = create("nami"), p = g.player("p0"), target = g.player("p1");
  p.energy = 0;
  p.hand = [card("energy_collapse", "weather-cancel"), card("causal_mark", "weather-live"), card("rhythm_break", "weather-second")];
  target.human = true; target.hand = [card("counter")];
  g.playCard("p0", "weather-cancel", "p1"); g.respond(true);
  assert.equal(p.energy, 0);
  target.hand = [];
  g.playCard("p0", "weather-live", "p1");
  assert.equal(p.energy, 1);
  g.playCard("p0", "weather-second", "p3");
  assert.equal(p.energy, 1);
});
test("娜美顺风航线只让航海术后的单目标策略被反制时回手", () => {
  const g = create("nami"), p = g.player("p0"), target = g.player("p1");
  p.hand = [card("energy_collapse", "wind-strategy")];
  target.human = true; target.hand = [card("counter", "counter-wind")];
  p.navigationWind = true;
  assert.equal(g.playCard("p0", "wind-strategy", "p1").ok, true);
  assert.equal(g.pendingResponse?.type, "counter");
  g.respond(true);
  assert.equal(p.navigationWind, false);
  assert.ok(p.hand.some(item => item.uid === "wind-strategy"));
  p.hand = [card("energy_collapse", "plain-strategy")];
  target.hand = [card("counter", "counter-plain")];
  g.playCard("p0", "plain-strategy", "p1");
  g.respond(true);
  assert.ok(!p.hand.some(item => item.uid === "plain-strategy"));
});
test("乌索普狙击王只让谎言目标越距成为突击合法目标", () => {
  const g = create("usopp"), p = g.player("p0");
  assert.ok(!g.getCardTargets("p0", card("attack")).includes("p2"));
  p.specialCards = [{ uid: "lie-range", kind: "lie", card: card("focus"), targetId: "p2", setTurn: g.turnNumber }];
  assert.ok(g.getCardTargets("p0", card("attack")).includes("p2"));
  p.specialCards = [];
  assert.ok(!g.getCardTargets("p0", card("attack")).includes("p2"));
});
test("乌索普诈术回收在谎言目标弃牌继续时摸牌而非回能", () => {
  const g = create("usopp"), p = g.player("p0"), target = g.player("p1");
  target.characterId = "luffy";
  p.specialCards = [{ uid: "lie-pay", kind: "lie", card: card("focus"), targetId: "p1", setTurn: g.turnNumber }];
  target.human = true; target.hand = [card("weapon", "lie-weapon"), card("focus", "lie-cost")];
  const beforeHand = p.hand.length, beforeEnergy = p.energy;
  g.playCard("p1", "lie-weapon", "p1", { freeUse: true });
  g.resolveChoice("p1", "pay");
  g.confirmDiscard("p1", ["lie-cost"]);
  assert.equal(p.hand.length, beforeHand + 1);
  assert.equal(p.energy, beforeEnergy);
});
test("山治黑足无武器时穿甲，装备武器后不再穿甲", () => {
  for (const armed of [false, true]) {
    const g = create("sanji"), p = g.player("p0"), target = g.player("p1");
    target.equipment.armor = card("armor"); target.armorReady = true;
    if (armed) p.equipment.weapon = card("weapon");
    g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
    assert.equal(target.hp, armed ? 8 : 7);
  }
});
test("山治援护反击需实际援助，下一次突击额外要求防御后消耗", () => {
  const g = create("sanji"), p = g.player("p0"), ally = g.player("p2"), target = g.player("p1");
  g.resolveHeal("p0", "p2");
  assert.ok(!p.turnFlags.supportCounter);
  ally.hp = 7; g.resolveHeal("p0", "p2");
  assert.equal(p.turnFlags.supportCounter, true);
  target.hand = [card("guard")];
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
  assert.equal(target.hp, 7);
  assert.equal(p.turnFlags.supportCounter, false);
});
test("乔巴诊断只在每轮首次实际治疗他人时双方摸牌", () => {
  const g = create("chopper"), p = g.player("p0"), ally = g.player("p2");
  ally.hp = 6;
  g.resolveHeal("p0", "p2");
  assert.equal(p.hand.length, 1);
  assert.equal(ally.hand.length, 1);
  g.resolveHeal("p0", "p2");
  assert.equal(ally.hp, 8);
  assert.equal(p.hand.length, 1);
  assert.equal(ally.hand.length, 1);
  g.resolveHeal("p0", "p0");
  assert.equal(p.hand.length, 1);
});
test("罗宾历史学者只在本轮首次确实查看隐藏牌后摸牌", () => {
  const g = create("robin"), p = g.player("p0"), target = g.player("p1");
  p.human = true;
  p.hand = [card("focus", "seize-payment")];
  target.hand = [card("attack", "hidden-attack")];
  g.useActiveSkill("p0", "p1");
  assert.equal(p.hand.length, 2);
  g.resolveChoice("p0", "pass");
  g.emitOnePieceEvent({ type: "hiddenCardViewed", sourceId: "p0", targetId: "p1", card: card("guard") });
  assert.equal(p.hand.length, 2);
  assert.equal(p.roundFlags.historian, true);
});
test("罗宾百花缭乱当前没有额外合法目标：单目标策略本已全场可选", () => {
  const robin = create("robin"), ordinary = create("luffy");
  for (const g of [robin, ordinary]) {
    g.player("p0").hand = [card("focus", "relay-cost")];
    g.player("p1").hand = [card("attack", "exchange-target")];
    assert.equal(g.distance("p0", "p2"), 2);
  }
  for (const definition of Object.values(cards).filter(item => item.type === "strategy" && item.targetMode === "other")) {
    const instance = { ...definition, uid: `distance-${definition.id}` };
    assert.deepEqual(robin.getCardTargets("p0", instance), ordinary.getCardTargets("p0", instance), definition.id);
  }
});
test("罗宾百花缭乱不能越过记忆交换的有手牌及战术接力的支付条件", () => {
  const g = create("robin"), p = g.player("p0");
  p.hand = [card("memory_exchange", "memory")];
  g.player("p1").hand = [card("attack", "held")];
  assert.deepEqual(g.getCardTargets("p0", p.hand[0]), []);
  p.hand.push(card("focus", "payment"));
  assert.deepEqual(g.getCardTargets("p0", p.hand[0]), ["p1"]);
  p.hand = [card("tactical_relay", "relay")];
  assert.deepEqual(g.getCardTargets("p0", p.hand[0]), []);
});
test("弗兰奇可乐能源只由本轮首次真实装备变更产生", () => {
  const g = create("franky"), p = g.player("p0");
  p.energy = 0;
  g.equip("p0", card("weapon", "cola-weapon"));
  assert.equal(p.energy, 1);
  g.equip("p0", card("armor", "cola-armor"));
  assert.equal(p.energy, 1);
  assert.equal(p.roundFlags.colaEnergy, true);
});
test("布鲁克黄泉寒气不由招牌或非普通突击伤害触发", () => {
  const g = create("brook"), target = g.player("p1");
  g.dealDamage("p0", "p1", 1, "strategy");
  assert.equal(target.frozenDraw, 0);
  g.dealDamage("p0", "p1", 1, "attack");
  assert.equal(target.frozenDraw, 1);
});
test("甚平侠义只在邻近队友实际将受伤时弃基础牌减伤", () => {
  const g = create("jinbe"), p = g.player("p0"), ally = g.player("p2");
  g.player("p1").alive = false;
  p.hand = [card("focus", "protect-cost")];
  assert.equal(g.distance("p0", "p2"), 1);
  g.dealDamage("p3", "p2", 1, "strategy");
  assert.equal(ally.hp, 8);
  assert.equal(p.hand.length, 0);
  assert.equal(p.roundFlags.jinbeGuard, true);
  p.hand = [card("focus", "second-cost")];
  g.dealDamage("p3", "p2", 1, "strategy");
  assert.equal(ally.hp, 7);
  assert.equal(p.hand.length, 1);
});
test("甚平鱼人空手道无护盾时不穿甲也不会凭空扣护盾", () => {
  const g = create("jinbe"), p = g.player("p0"), target = g.player("p1");
  target.equipment.armor = card("armor"); target.armorReady = true;
  p.shield = 0;
  g.beginAttack({ sourceId: "p0", targetId: "p1", origin: "attack", skipIntervene: true });
  assert.equal(target.hp, 8);
  assert.equal(p.shield, 0);
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
