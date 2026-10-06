import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine.js";
import { cardDefinitions } from "../src/data.js";

const fixedRandom = () => 0.314159;
const create = (character = "luffy") => new GameEngine({ modeId: "ranked2v2", humanCharacterId: character, random: fixedRandom, fixedAnchorSeat: 0 }).setup();

test("娜美航海术需要1能量并在发动时扣除", () => {
  const game = create("nami"), nami = game.player("p0");
  nami.energy = 0;
  assert.equal(game.getActiveSkillTargets(nami.id).includes(nami.id), false);
  nami.energy = 1;
  assert.equal(game.getActiveSkillTargets(nami.id).includes(nami.id), true);
  assert.equal(game.useActiveSkill(nami.id, nami.id).pending, true);
  assert.equal(nami.energy, 0);
});

test("路飞见闻色展示基础牌时会减少本次防御需求", () => {
  const game = create("luffy");
  const luffy = game.player("p0");
  const attacker = game.player("p1");
  luffy.roundFlags.observation = false;
  game.deck.unshift({ ...cardDefinitions.guard, uid: "luffy-guard-omen" });
  attacker.hand = [{ ...cardDefinitions.attack, uid: "luffy-test-attack" }];
  luffy.hand = [];
  const hp = luffy.hp;
  game.beginAttack({ sourceId: attacker.id, targetId: luffy.id, damage: 1, requiredGuards: 1, origin: "attack", skipIntervene: true });
  assert.equal(luffy.hp, hp);
  assert.equal(luffy.roundFlags.observation, true);
});

test("越战越勇只由其他角色造成的伤害触发", () => {
  const game = create("luffy");
  const luffy = game.player("p0");
  luffy.roundFlags = {};
  game.loseHp(luffy.id, 1, null, "skill");
  assert.equal(luffy.turnFlags.nextAttackBonus, false);
  game.dealDamage("p1", luffy.id, 1, "attack");
  assert.equal(luffy.turnFlags.nextAttackBonus, true);
});

test("乌索普谎言可以拦截装备并在取消时给出诈术收益", () => {
  const game = create("usopp");
  const usopp = game.player("p0");
  const target = game.player("p1");
  target.human = true;
  usopp.energy = 2;
  usopp.specialCards = [{ uid: "lie-equip", kind: "lie", card: { ...cardDefinitions.focus, uid: "lie-source" }, targetId: target.id, setTurn: game.turnNumber }];
  target.hand = [{ ...cardDefinitions.weapon, uid: "target-weapon" }, { ...cardDefinitions.guard, uid: "target-pay" }];
  const result = game.playCard(target.id, "target-weapon", target.id, { freeUse: true });
  assert.equal(result.pending, true);
  game.resolveChoice(target.id, "cancel");
  assert.equal(target.equipment.weapon, null);
  assert.equal(usopp.energy, 3);
  assert.equal(usopp.specialCards.length, 0);
});

test("山治治疗队友后获得援护反击", () => {
  const game = create("sanji");
  const sanji = game.player("p0");
  const ally = game.player("p2");
  ally.hp -= 1;
  sanji.hand = [{ ...cardDefinitions.counter, uid: "sanji-gift" }];
  game.resolveHeal(sanji.id, ally.id);
  assert.equal(sanji.turnFlags.supportCounter, true);
});

test("乔巴觉醒医术只清除一项异常", () => {
  const game = create("chopper");
  const chopper = game.player("p0");
  const ally = game.player("p2");
  chopper.dreamState.awakened = true;
  ally.poison = 2;
  ally.frozenDraw = 1;
  ally.energyLocked = true;
  ally.signatureLocked = 1;
  chopper.hand = [{ ...cardDefinitions.attack, uid: "chopper-medicine" }];
  const result = game.useActiveSkill(chopper.id, ally.id);
  assert.equal(result.pending, true);
  game.confirmDiscard(chopper.id, ["chopper-medicine"]);
  assert.equal(game.pendingChoice?.title, "医术：选择净化项目");
  game.resolveChoice(chopper.id, "poison");
  assert.equal(ally.poison, 1);
  assert.equal(ally.frozenDraw, 1);
  assert.equal(ally.energyLocked, true);
  assert.equal(ally.signatureLocked, 1);
});

test("甚平海流护航可以选择自己，护盾时普通突击忽略防具", () => {
  const game = create("jinbe");
  const jinbe = game.player("p0");
  jinbe.hand = [{ ...cardDefinitions.attack, uid: "jinbe-cost" }];
  assert.ok(game.getActiveSkillTargets(jinbe.id).includes(jinbe.id));
  jinbe.equipment.armor = { ...cardDefinitions.armor, uid: "jinbe-armor" };
  jinbe.shield = 1;
  const target = game.player("p1");
  target.hand = [];
  jinbe.hand.push({ ...cardDefinitions.attack, uid: "jinbe-attack" });
  const hp = target.hp;
  game.playCard(jinbe.id, "jinbe-attack", target.id);
  assert.equal(target.hp, hp - 1);
  assert.equal(jinbe.shield, 0);
});

test("二档在正式数值调整后只摸1张牌", () => {
  const game = create("luffy");
  const luffy = game.player("p0");
  luffy.hand = [];
  game.deck.unshift(...Array.from({ length: 4 }, (_, index) => ({ ...cardDefinitions.focus, uid: `gear-five-${index}` })));
  const result = game.useActiveSkill(luffy.id, luffy.id);
  assert.equal(result.ok, true);
  assert.equal(luffy.hand.length, 1);
});

test("娜美气象棒按每轮首次结算策略牌并在新轮重置", () => {
  const game = create("nami");
  const nami = game.player("p0");
  nami.energy = 0;
  const strategy = { ...cardDefinitions.memory_exchange, uid: "weather-card" };
  game.emitOnePieceEvent({ type: "cardResolved", sourceId: nami.id, targetId: "p1", card: strategy });
  game.emitOnePieceEvent({ type: "cardResolved", sourceId: nami.id, targetId: "p1", card: { ...strategy, uid: "weather-card-2" } });
  assert.equal(nami.energy, 1);
  nami.roundFlags = {};
  game.emitOnePieceEvent({ type: "cardResolved", sourceId: nami.id, targetId: "p1", card: { ...strategy, uid: "weather-card-3" } });
  assert.equal(nami.energy, 2);
});

test("罗宾成功封存后获得1点能量", () => {
  const game = create("robin");
  const robin = game.player("p0");
  const target = game.player("p1");
  const energyBefore = robin.energy;
  robin.hand = [{ ...cardDefinitions.focus, uid: "robin-payment" }];
  target.hand = [{ ...cardDefinitions.attack, uid: "robin-hidden" }];
  const result = game.useActiveSkill(robin.id, target.id);
  assert.equal(result.pending, true);
  game.resolveChoice(robin.id, "robin-hidden:robin-payment");
  assert.equal(robin.energy, energyBefore + 1);
  assert.equal(target.sealedCards.length, 1);
});

test("正式样本越线上限后，觉醒阿修罗只减费用而不再额外摸牌", () => {
  const game = create("zoro"), zoro = game.player("p0"), target = game.player("p1");
  zoro.dreamState.awakened = true; zoro.energy = 3; zoro.hand = [];
  target.characterId = "yuji"; target.hand = []; target.hp = 4;
  assert.equal(game.signatureCost("p0"), 3);
  assert.equal(game.useSignature("p0", "p1").ok, true);
  assert.equal(target.hp, 2); assert.equal(zoro.hand.length, 0);
});

test("鱼人空手道穿甲消耗1护盾，强制介入续接不重复消耗", () => {
  const g = create("jinbe"), p = g.player("p0"), intercept = g.player("p2");
  p.shield = 2;
  g.player("p1").characterId = "yuji"; g.player("p1").hand = [];
  intercept.characterId = "yuji"; intercept.human = true;
  intercept.hand = [{ ...cardDefinitions.intervene, uid: "intercept" }];
  intercept.equipment.armor = { ...cardDefinitions.armor, uid: "target-armor" };
  const hp = intercept.hp;
  g.beginAttack({ sourceId:"p0",targetId:"p1",origin:"attack" });
  assert.equal(g.pendingResponse?.type, "intervene");
  g.respond(true);
  assert.equal(p.shield, 1); assert.equal(intercept.hp, hp - 1);
});
