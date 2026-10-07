import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine.js";
import { cardDefinitions as cards } from "../src/data.js";
const create = id => {
  const game = new GameEngine({ modeId: "ranked2v2", humanCharacterId: id, fixedAnchorSeat: 0, random: () => .314159 }).setup();
  for (const p of game.players.slice(1)) { p.characterId = "mikasa"; p.hp = p.maxHp = 4; p.hand = []; }
  return game;
};
const card = (id, uid = id) => ({ ...cards[id], uid });

test("甚平海流护航不受侠义距离限制，能保护隔座队友", () => {
  const game = create("jinbe"), p = game.player("p0");
  p.hand = [card("guard")];
  assert.equal(game.distance("p0", "p2"), 2);
  assert.ok(game.getActiveSkillTargets("p0").includes("p2"));
  game.useActiveSkill("p0", "p2"); game.confirmDiscard("p0", ["guard"]);
  assert.equal(game.player("p2").shield, 1);
  assert.equal(p.dreamState.progress, 1);
});
test("二档自身失血不推进路飞梦想，实际受到他人伤害才推进", () => {
  const game = create("luffy"), p = game.player("p0");
  game.useActiveSkill("p0", "p0");
  assert.equal(p.dreamState.progress, 0);
  game.dealDamage("p1", "p0", 1, "strategy");
  assert.equal(p.dreamState.progress, 1);
});
test("路飞越战越勇每轮一次，不随回合刷新", () => {
  const game = create("luffy"), p = game.player("p0");
  game.dealDamage("p1", "p0", 1, "strategy");
  p.turnFlags = {};
  game.dealDamage("p1", "p0", 1, "strategy");
  assert.ok(!p.turnFlags.nextAttackBonus);
});
test("零伤害不消耗甚平侠义牌，不推进梦想", () => {
  const game = create("franky"), jinbe = game.player("p1");
  jinbe.characterId = "jinbe"; jinbe.hand = [card("guard")]; jinbe.dreamState = { progress: 0, awakened: false, progressedRound: 0 };
  game.mode = { ...game.mode, id: "classic8" };
  game.dealDamage("p2", "p0", 1, "attack");
  assert.equal(jinbe.hand.length, 1);
  assert.equal(jinbe.dreamState.progress, 0);
});
test("山治援护保留至下一次攻击，不会被本人回合开始清掉", () => {
  const game = create("sanji"), p = game.player("p0"), ally = game.player("p2");
  ally.hp--; game.resolveHeal("p0", "p2");
  game.completeTurnStart("p0");
  assert.equal(p.turnFlags.supportCounter, true);
});
test("觉醒罗宾AI封存选择同类别配对，不拼接不合法选项", () => {
  const game = create("robin"), p = game.player("p0"), enemy = game.player("p1");
  p.human = false; p.dreamState.awakened = true; p.hand = [card("weapon", "pay")];
  enemy.hand = [card("attack", "shown-basic"), card("weapon", "shown-equip")];
  game.useActiveSkill("p0", "p1");
  assert.equal(enemy.sealedCards.length, 1);
  assert.equal(enemy.sealedCards[0].card.uid, "shown-equip");
});
test("佐助AI不把优质自装换给敌人的空槽", () => {
  const game = create("sasuke"), p = game.player("p0"), enemy = game.player("p1");
  p.human = false; p.energy = 1; p.hand = []; p.equipment.weapon = card("impact_hammer");
  enemy.hand = []; enemy.equipment = { weapon: null, armor: null, charm: null };
  game.aiStep("p0");
  assert.equal(p.equipment.weapon.id, "impact_hammer");
});
test("鹿丸仍先选择本轮未行动角色，末位行动时可以向已行动敌人落子", () => {
  const game = create("shikamaru"), shikamaru = game.player("p0");
  game.turnQueue = ["p2", "p3"];
  assert.deepEqual(game.getActiveSkillTargets("p0"), ["p2", "p3"]);
  game.turnQueue = [];
  assert.deepEqual(game.getActiveSkillTargets("p0"), ["p1", "p3"]);
  assert.equal(game.useActiveSkill("p0", "p1").ok, true);
  assert.equal(shikamaru.chessTargetId, "p1");
  assert.deepEqual(game.getActiveSkillTargets("p0"), []);
});
test("鹿丸末位落子跨轮保留，目标下一轮首张突击只受一次影缝", () => {
  const game = create("shikamaru"), target = game.player("p1");
  game.turnQueue = [];
  assert.equal(game.useActiveSkill("p0", "p1").ok, true);
  game.startRound();
  target.hand = [card("attack", "first-marked-attack")];
  game.playCard("p1", "first-marked-attack", "p0", { freeUse: true });
  assert.equal(target.roundFlags.chessPressure, true);
  assert.equal(game.eventHistory.filter(event => event.type === "cardCancelled" && event.card?.uid === "first-marked-attack").length, 1);
  assert.equal(game.player("p0").chessTargetId, "p1");
  target.hand = [card("attack", "second-marked-attack")];
  assert.equal(game.handleChessPressure("p1", target.hand[0], target.hand[0].uid, "p0", { freeUse: true }), null);
});
test("鹿丸AI只向可识别的敌人落子，不为低血量队友施加影缝", () => {
  const game = create("shikamaru"), shikamaru = game.player("p0");
  shikamaru.human = false;
  game.turnQueue = ["p2", "p3"];
  game.player("p2").hp = 1;
  game.player("p3").hp = 4;
  game.aiStep("p0");
  assert.equal(shikamaru.chessTargetId, "p3");
});
test("军八鹿丸AI不能依真实隐藏身份筛选末位落子目标", () => {
  const makeGame = () => {
    const game = new GameEngine({ modeId: "classic8", humanCharacterId: "shikamaru", random: () => .314159 }).setup();
    const shikamaru = game.player("p0");
    shikamaru.human = false;
    shikamaru.energy = 0;
    shikamaru.hand = [];
    game.currentPlayerId = "p0";
    game.turnQueue = [];
    for (const target of game.players.slice(1)) { target.revealed = false; target.hand = []; target.hp = target.maxHp = 4; }
    return game;
  };
  const first = makeGame(), second = makeGame();
  [second.player("p1").roleId, second.player("p2").roleId] = [second.player("p2").roleId, second.player("p1").roleId];
  first.aiStep("p0"); second.aiStep("p0");
  assert.ok(first.player("p0").chessTargetId);
  assert.equal(first.player("p0").chessTargetId, second.player("p0").chessTargetId);
});
test("卡卡西AI预留雷切核心与费用，优先复刻基础牌", () => {
  const game = create("kakashi"), p = game.player("p0");
  p.human = false; p.energy = 3; p.hand = [];
  game.discard = [card("attack", "copy-attack"), card("memory_exchange", "copy-strategy")];
  game.aiStep("p0");
  assert.equal(p.hand.find(c => c._copiedBy === "p0")?.type, "basic");
  assert.equal(p.energy, 2);
  const hp = game.player("p1").hp;
  game.player("p1").hand = []; game.aiStep("p0");
  assert.equal(game.player("p1").hp, hp - 3); // 雷切2点，加拷贝基础牌的下一次攻击强化1点。
});
test("弗兰奇AI工坊不以劣质装备覆盖已装备武器", () => {
  const game = create("franky"), p = game.player("p0");
  p.human = false; p.dreamState.awakened = true; p.energy = 2;
  p.equipment.weapon = card("impact_hammer", "best");
  game.discard = [card("weapon", "weak"), card("armor", "needed")];
  game.useActiveSkill("p0", "p0");
  assert.equal(p.equipment.weapon.uid, "best");
  assert.equal(p.equipment.armor?.uid, "needed");
});
test("大蛇丸AI满状态不消耗纯净化实验牌", () => {
  const game = create("orochimaru"), p = game.player("p0");
  p.human = false; p.energy = 2; p.turnFlags.activeUsed = true;
  p.hand = [{ ...card("counter"), _curseSpoil: "p0" }];
  game.aiStep("p0");
  assert.equal(p.hand.length, 1);
  assert.equal(p.energy, 2);
});
test("大蛇丸AI不为零手牌目标弃牌布置咒印", () => {
  const game = create("orochimaru"), orochimaru = game.player("p0");
  orochimaru.human = false;
  orochimaru.hand = [card("guard", "sample")];
  game.aiStep("p0");
  assert.equal(orochimaru.hand.length, 1);
  assert.equal(game.player("p1").curseSeal, null);
  assert.equal(game.player("p3").curseSeal, null);
});
test("大蛇丸AI在零手牌与有手牌敌人之间选择后者", () => {
  const game = create("orochimaru"), orochimaru = game.player("p0");
  orochimaru.human = false;
  orochimaru.hand = [card("guard", "sample")];
  game.player("p3").hand = [card("attack", "held")];
  game.aiStep("p0");
  assert.equal(game.player("p1").curseSeal, null);
  assert.equal(game.player("p3").curseSeal?.sourceId, "p0");
  assert.equal(orochimaru.hand.length, 0);
});
test("大蛇丸玩家仍能自行向零手牌合法目标布置咒印", () => {
  const game = create("orochimaru"), orochimaru = game.player("p0");
  orochimaru.hand = [card("guard", "human-sample")];
  assert.ok(game.getActiveSkillTargets("p0").includes("p1"));
  assert.equal(game.useActiveSkill("p0", "p1").pending, true);
  game.confirmDiscard("p0", ["human-sample"]);
  assert.equal(game.player("p1").curseSeal?.sourceId, "p0");
});
test("隐藏身份AI目标不因敌方真实身份变化而改变", () => {
  const game = new GameEngine({ modeId: "classic8", humanCharacterId: "sasuke", random: () => .314159 }).setup();
  const actor = game.player("p0"); actor.roleId = "lone";
  const lord = game.players.find(p => p.roleId === "lord" && p.id !== "p0");
  const hidden = game.players.find(p => !p.revealed && p.id !== actor.id);
  const candidates = [lord.id, hidden.id], before = game.getAITargets(actor.id, candidates);
  for (const p of game.players.filter(p => !p.revealed && p.id !== actor.id)) p.roleId = "loyal";
  assert.deepEqual(game.getAITargets(actor.id, candidates), before);
});
test("鼬的乌鸦替身不会读取未公开身份来挑选转移目标", () => {
  const redirected = p2Role => {
    const game = new GameEngine({ modeId: "classic8", humanCharacterId: "itachi", random: () => .314159 }).setup();
    const itachi = game.player("p0"), attacker = game.player("p1"), first = game.player("p2"), second = game.player("p3");
    itachi.human = false; itachi.roleId = "rebel";
    attacker.roleId = "lord"; attacker.rangeInfinite = true;
    first.roleId = p2Role; second.roleId = p2Role === "rebel" ? "loyal" : "rebel";
    first.revealed = second.revealed = false;
    for (const player of game.players.slice(4)) player.alive = false;
    first.hand = []; second.hand = [];
    itachi.plots = [{ uid: "raven-illusion", card: card("focus", "raven-cost"), ownerId: itachi.id, targetId: attacker.id, effect: "falsePlot", isFalse: true, setTurn: game.turnNumber }];
    const hp = [first.hp, second.hp];
    game.beginAttack({ sourceId: attacker.id, targetId: itachi.id, origin: "attack", skipIntervene: true });
    return [hp[0] - first.hp, hp[1] - second.hp];
  };
  assert.deepEqual(redirected("rebel"), redirected("loyal"));
});
test("未知身份的AI反制决策不因真实阵营变化", () => {
  const counterUsed = targetRole => {
    const game = new GameEngine({ modeId: "classic8", humanCharacterId: "naruto", random: () => .314159 }).setup();
    const source = game.player("p0"), target = game.player("p1");
    source.roleId = "rebel"; target.roleId = targetRole; target.revealed = false; target.human = false;
    target.hand = [card("counter", "hidden-counter")];
    game.offerCounter(source.id, target.id, card("energy_collapse", "hidden-strategy"), () => {});
    return target.hand.length;
  };
  assert.equal(counterUsed("rebel"), counterUsed("loyal"));
});
test("群体策略中的AI反制不读取施牌者和响应者的暗身份", () => {
  const counterRemaining = targetRole => {
    const game = new GameEngine({ modeId: "classic8", humanCharacterId: "naruto", random: () => .314159 }).setup();
    const source = game.player("p0"), target = game.player("p1");
    source.roleId = "rebel"; target.roleId = targetRole; target.revealed = false; target.human = false;
    target.characterId = "yuji"; target.hand = [card("counter", "mass-counter")];
    for (const player of game.players.slice(2)) { player.hand = []; player.human = false; }
    game.resolveMassDamageStrategy(source.id, card("dimensional_barrage"), "guard");
    return target.hand.length;
  };
  assert.equal(counterRemaining("rebel"), counterRemaining("loyal"));
});
test("未知身份的AI不会凭真实阵营决定是否强制介入策略", () => {
  const transferredTo = candidateRole => {
    const game = new GameEngine({ modeId: "classic8", humanCharacterId: "naruto", random: () => .314159 }).setup();
    const source = game.player("p0"), target = game.player("p1"), candidate = game.player("p2");
    source.roleId = "lord"; target.roleId = "rebel"; target.revealed = false;
    candidate.roleId = candidateRole; candidate.revealed = false; candidate.human = false;
    candidate.hand = [card("intervene", "hidden-intervene")];
    for (const player of game.players.slice(3)) player.hand = [];
    let selected = null;
    game.offerStrategyIntervention(source.id, target.id, { ...card("energy_collapse"), redirectable: true }, id => { selected = id; });
    return selected;
  };
  assert.equal(transferredTo("rebel"), transferredTo("loyal"));
});
test("未知身份的AI不会凭真实阵营决定是否强制介入突击", () => {
  const absorbedBy = candidateRole => {
    const game = new GameEngine({ modeId: "classic8", humanCharacterId: "naruto", random: () => .314159 }).setup();
    const source = game.player("p0"), target = game.player("p1"), candidate = game.player("p2");
    source.roleId = "lord"; target.roleId = "rebel"; target.revealed = false;
    candidate.roleId = candidateRole; candidate.revealed = false; candidate.human = false;
    candidate.hand = [card("intervene", "hidden-intervene")];
    for (const player of game.players.slice(3)) player.hand = [];
    const hp = [target.hp, candidate.hp];
    game.beginAttack({ sourceId: source.id, targetId: target.id, origin: "attack", skipRaven: true });
    return [hp[0] - target.hp, hp[1] - candidate.hp];
  };
  assert.deepEqual(absorbedBy("rebel"), absorbedBy("loyal"));
});
test("未知身份的AI不凭真实阵营决定是否救援重伤角色", () => {
  const rescue = targetRole => {
    const game = new GameEngine({ modeId: "classic8", humanCharacterId: "naruto", random: () => .314159 }).setup();
    const target = game.player("p1"), rescuer = game.player("p2");
    game.player("p0").roleId = "lord";
    target.roleId = targetRole; target.revealed = false; target.human = false; target.hp = 0; target.dying = true; target.hand = [];
    rescuer.roleId = "rebel"; rescuer.revealed = false; rescuer.human = false; rescuer.hand = [card("heal", "hidden-rescue")];
    game.continueRescue({ targetId: target.id, sourceId: "p0", onComplete: null, order: [rescuer.id, target.id], index: 0 });
    return [target.hp, rescuer.hand.length];
  };
  assert.deepEqual(rescue("rebel"), rescue("loyal"));
});
