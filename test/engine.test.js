import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { GameEngine } from "../src/engine.js";
import { activeSkills, cardArtPath, cardDefinitions, characterPacks, characters, deckProfiles, portraitPath, tableSeatPosition } from "../src/data.js";
import { initializeOnePieceState, handleOnePieceEvent } from "../src/packs/one-piece.js";

const fixedRandom = () => 0.314159;
const create = (modeId = "ranked2v2", character = "naruto") => new GameEngine({ modeId, humanCharacterId: character, random: fixedRandom, fixedAnchorSeat: modeId === "ranked2v2" ? 0 : null }).setup();

test("两种模式创建正确人数、身份与28名候选角色", () => {
  const classic = create("classic8");
  assert.equal(classic.players.length, 8);
  assert.deepEqual([...classic.players.map(p => p.roleId)].sort(), ["lord", "loyal", "loyal", "lone", "rebel", "rebel", "rebel", "rebel"].sort());
  assert.equal(classic.players.filter(p => p.revealed).length, 1);
  const ranked = create("ranked2v2");
  assert.equal(ranked.players.length, 4);
  assert.deepEqual(ranked.players.map(p => p.roleId), ["azure", "crimson", "azure", "crimson"]);
  assert.ok(ranked.players.every(p => p.revealed));
  assert.equal(characters.length, 28);
  assert.deepEqual(characters.filter(character => character.packId === "naruto_genesis").map(character => character.id).sort(), ["gaara", "hinata", "itachi", "jiraiya", "kakashi", "naruto", "orochimaru", "sakura", "sasuke", "shikamaru"]);
  assert.deepEqual(characterPacks[0].characterIds, ["naruto", "gaara", "sakura", "shikamaru", "itachi", "sasuke", "kakashi", "hinata", "jiraiya", "orochimaru"]);
  assert.deepEqual(characterPacks[1].characterIds, ["luffy", "zoro", "nami", "usopp", "sanji", "chopper", "robin", "franky", "brook", "jinbe"]);
  assert.ok(characters.filter(character => character.packId === "one_piece_grand_line").every(character => character.dream));
});

test("梦想航迹每轮只推进一次并在3点立即觉醒", () => {
  const game = create("ranked2v2", "luffy");
  const luffy = game.player("p0");
  assert.deepEqual(luffy.dreamState, { progress: 0, awakened: false, progressedRound: 0 });
  handleOnePieceEvent(game, { type: "afterDamage", sourceId: luffy.id, targetId: "p1", origin: "attack", amount: 1 });
  handleOnePieceEvent(game, { type: "afterDamage", sourceId: luffy.id, targetId: "p1", origin: "attack", amount: 1 });
  assert.equal(luffy.dreamState.progress, 1);
  luffy.roundFlags = {};
  game.round += 1;
  handleOnePieceEvent(game, { type: "afterDamage", sourceId: luffy.id, targetId: "p1", origin: "attack", amount: 1 });
  luffy.roundFlags = {};
  game.round += 1;
  handleOnePieceEvent(game, { type: "afterDamage", sourceId: luffy.id, targetId: "p1", origin: "attack", amount: 1 });
  assert.equal(luffy.dreamState.progress, 3);
  assert.equal(luffy.dreamState.awakened, true);
});

test("索隆觉醒后招牌技消耗降为3", () => {
  const game = create("ranked2v2", "zoro");
  const zoro = game.player("p0");
  assert.equal(game.signatureCost(zoro.id), 4);
  zoro.dreamState.awakened = true;
  assert.equal(game.signatureCost(zoro.id), 3);
});

test("回合开始摸牌、获得能量并按座次流转", () => {
  const game = create();
  const first = game.player(game.currentPlayerId);
  assert.equal(first.id, "p0");
  assert.equal(first.energy, 1);
  assert.ok(first.hand.length >= 6);
  first.hand = first.hand.slice(0, first.hp);
  game.endTurn(first.id);
  assert.equal(game.currentPlayerId, "p1");
  assert.equal(game.player("p1").energy, 1);
});

test("能量按每轮首次造成与受到伤害获得且不会超过上限", () => {
  const game = create();
  const source = game.player("p0"), target = game.player("p1");
  source.energy = 0;
  target.energy = 0;
  game.dealDamage(source.id, target.id, 1, "test");
  assert.equal(source.energy, 1);
  assert.equal(target.energy, 1);
  game.dealDamage(source.id, target.id, 1, "test");
  assert.equal(source.energy, 1);
  assert.equal(target.energy, 1);

  source.energy = source.maxEnergy;
  source.hand = [{ id: "focus", uid: "energy-cap", name: "蓄能", type: "basic" }];
  assert.equal(game.playCard(source.id, "energy-cap", source.id).ok, true);
  assert.equal(source.energy, source.maxEnergy);
});

test("玩法说明完整写明能量来源、上限与招牌技消耗", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const copy of ["能量初始为0、上限为4", "每轮首次实际造成伤害", "每轮首次实际受到伤害", "多数招牌技消耗4点", "【黑闪】消耗3点"]) {
    assert.match(html, new RegExp(copy));
  }
});

test("角色使用独立手牌上限且记忆晶体额外增加2", () => {
  const game = create();
  const player = game.player("p0");
  player.hp = 2;
  assert.equal(game.handLimit(player.id), 4);
  player.equipment.charm = { ...cardDefinitions.memory_core, uid: "limit-memory" };
  assert.equal(game.handLimit(player.id), 6);
  assert.equal(create("ranked2v2", "gaara").handLimit("p0"), 3);
  assert.equal(create("ranked2v2", "shikamaru").handLimit("p0"), 5);
  const classic = create("classic8");
  const lord = classic.players.find(item => item.roleId === "lord");
  assert.equal(classic.handLimit(lord.id), classic.characterOf(lord).handLimit + 1);
});

test("经典军八的辅助技能目标不会按隐藏真实身份过滤", () => {
  const game = create("classic8", "chopper");
  const chopper = game.player("p0");
  chopper.hand = [{ id: "attack", uid: "medicine-cost", name: "突击", type: "basic" }];
  for (const player of game.players) if (player.id !== chopper.id) player.hp = Math.max(1, player.maxHp - 1);
  assert.deepEqual(game.getActiveSkillTargets(chopper.id).sort(), game.players.filter(player => player.id !== chopper.id).map(player => player.id).sort());
});

test("对战界面包含自己与他人的角色详情、卡牌放大、身份预测和伏笔入口", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /id="playerDetailDialog"/);
  assert.match(html, /id="cardDetailDialog"/);
  assert.match(app, /data-inspect-player/);
  assert.match(app, /self-detail-button/);
  assert.match(app, /data-card-detail/);
  assert.match(app, /cardRuleText/);
  assert.match(app, /data-predict-role/);
  assert.match(app, /data-series/);
  assert.match(html, /id="seriesFilters"/);
  assert.match(css, /\.series-filters/);
  assert.match(app, /artMarkup\(card, "hand-art"/);
  assert.match(app, /artMarkup\(card, "discard-art"/);
  assert.match(app, /cardArtPath\(card\.id\)/);
  assert.match(app, /getVisiblePlots/);
  assert.match(app, /hpPips/);
  assert.match(app, /playDamageEffects/);
  assert.match(css, /\.damage-number/);
  assert.match(css, /\.hp-pips/);
  assert.match(html, /id="choiceDialog"/);
  assert.match(css, /\.self-plots/);
  assert.match(css, /\.battle-card-detail-modal/);
  assert.match(css, /\.card-detail-trigger/);
  assert.match(css, /\.player-detail-modal/);
});

test("普通攻击命中造成1点伤害", () => {
  const game = create(), source = game.player("p0");
  for (const player of game.players) if (player.id !== source.id) player.characterId = "yuji";
  source.hand = [{ id: "attack", uid: "test-attack", name: "突击", type: "basic" }];
  const target = game.player(game.getCardTargets(source.id, source.hand[0])[0]);
  target.hand = [];
  const before = target.hp;
  const result = game.playCard(source.id, "test-attack", target.id);
  assert.equal(result.ok, true);
  assert.equal(target.hp, before - 1);
  assert.equal(source.attacksUsed, 1);
  assert.deepEqual(game.consumeVisualEvents(), [{ type: "damage", playerId: target.id, amount: 1 }]);
  assert.deepEqual(game.consumeVisualEvents(), []);
});

test("人类玩家可在响应窗口用防御抵消攻击", () => {
  const game = create();
  const source = game.player("p1"), target = game.player("p0");
  game.currentPlayerId = source.id;
  game.phase = "play";
  source.hand = [{ id: "attack", uid: "ai-attack", name: "突击", type: "basic" }];
  target.hand = [{ id: "guard", uid: "human-guard", name: "防御", type: "basic" }];
  const before = target.hp;
  game.playCard(source.id, "ai-attack", target.id);
  assert.equal(game.pendingResponse?.type, "guard");
  game.respond(true);
  assert.equal(target.hp, before);
  assert.equal(target.hand.length, 0);
});

test("2V2消灭一方全部成员后正确判胜", () => {
  const game = create();
  game.eliminate("p1", "p0");
  assert.equal(game.winner, null);
  game.eliminate("p3", "p2");
  assert.equal(game.winner?.camp, "azure");
  assert.equal(game.humanWon(), true);
});

test("军八界主阵亡时破界阵营获胜", () => {
  const game = create("classic8");
  const lord = game.players.find(p => p.roleId === "lord");
  const rebel = game.players.find(p => p.roleId === "rebel");
  game.eliminate(lord.id, rebel.id);
  assert.equal(game.winner?.camp, "chaos");
});

test("装备进入固定槽位而非弃牌堆", () => {
  const game = create();
  const player = game.player("p0");
  const weapon = { id: "weapon", uid: "weapon-test", name: "增幅武装", type: "equipment", slot: "weapon" };
  player.hand = [weapon];
  const beforeDiscard = game.discard.length;
  game.playCard(player.id, weapon.uid, player.id);
  assert.equal(player.equipment.weapon?.uid, weapon.uid);
  assert.equal(game.discard.length, beforeDiscard);
});

test("鸣人的影分身进入特殊牌区并可作为防御消耗", () => {
  const game = create("ranked2v2", "naruto");
  const player = game.player("p0");
  player.energy = 1;
  player.hand = [
    { ...cardDefinitions.attack, uid: "clone-card" },
    { ...cardDefinitions.guard, uid: "active-keep" }
  ];
  assert.deepEqual(game.getActiveSkillTargets(player.id), [player.id]);
  const result = game.useActiveSkill(player.id, player.id);
  assert.equal(result.ok, true);
  assert.equal(result.pending, true);
  assert.equal(game.resolveChoice(player.id, "clone-card").ok, true);
  assert.equal(player.specialCards[0].kind, "clone");
  assert.equal(player.specialCards[0].card.id, "attack");
  assert.equal(player.hand.length, 1);
  assert.equal(player.energy, 0);
  player.hand = [];
  assert.equal(game.guardResources(player.id), 1);
  game.spendGuards(player.id, 1);
  assert.equal(player.specialCards.length, 0);
  assert.equal(player.energy, 1);
  assert.deepEqual(game.getActiveSkillTargets(player.id), []);
});

test("火影角色的强化联动会实际改变攻防结算", () => {
  const narutoGame = create("ranked2v2", "naruto");
  const naruto = narutoGame.player("p0"), narutoTarget = narutoGame.player("p1");
  narutoTarget.characterId = "yuji";
  narutoTarget.hand = [];
  naruto.specialCards = [{ uid: "clone-link", kind: "clone", card: { ...cardDefinitions.attack, uid: "clone-source" } }];
  narutoGame.spendGuards(naruto.id, 1);
  const narutoHp = narutoTarget.hp;
  narutoGame.beginAttack({ sourceId: naruto.id, targetId: narutoTarget.id, damage: 1, requiredGuards: 1, origin: "attack", skipIntervene: true });
  assert.equal(narutoTarget.hp, narutoHp - 2);

  const gaaraGame = create("ranked2v2", "gaara");
  const gaara = gaaraGame.player("p0"), sandTarget = gaaraGame.player("p1");
  sandTarget.characterId = "yuji";
  sandTarget.hand = [];
  const sandHp = sandTarget.hp;
  gaaraGame.useActiveSkill(gaara.id, sandTarget.id);
  assert.equal(sandTarget.hp, sandHp - 1);
  assert.equal(sandTarget.sandMarkedBy, gaara.id);
  gaara.hand = [{ ...cardDefinitions.attack, uid: "sand-pursuit" }];
  const pursuitHp = sandTarget.hp;
  gaaraGame.playCard(gaara.id, "sand-pursuit", sandTarget.id);
  assert.equal(sandTarget.hp, pursuitHp - 2);
  assert.equal(sandTarget.sandMarkedBy, null);

  const sakuraGame = create("ranked2v2", "sakura");
  const sakura = sakuraGame.player("p0"), sakuraTarget = sakuraGame.player("p1");
  sakuraTarget.characterId = "yuji";
  sakuraTarget.hand = [];
  sakura.specialCards = [{ uid: "byakugo-link", kind: "byakugo", card: { ...cardDefinitions.attack, uid: "byakugo-source" } }];
  sakuraGame.consumeByakugo(sakura.id, "basic", "测试怪力");
  const sakuraHp = sakuraTarget.hp;
  sakuraGame.beginAttack({ sourceId: sakura.id, targetId: sakuraTarget.id, damage: 1, requiredGuards: 1, origin: "attack", skipIntervene: true });
  assert.equal(sakuraTarget.hp, sakuraHp - 2);
});

test("鹿丸棋子会对目标的首次攻击施加影缝压力", () => {
  const game = create("ranked2v2", "shikamaru");
  const shikamaru = game.player("p0"), target = game.player("p1");
  target.characterId = "yuji";
  target.human = false;
  target.hand = [{ ...cardDefinitions.attack, uid: "chess-attack" }];
  shikamaru.chessTargetId = target.id;
  const result = game.playCard(target.id, "chess-attack", shikamaru.id, { freeUse: true });
  assert.equal(result.ok, true);
  assert.equal(result.cancelled, true);
  assert.equal(shikamaru.chessTargetId, target.id, "影缝触发后棋子仍应保留，供战术预读与将军继续使用");
  assert.equal(target.roundFlags.chessPressure, true);
  assert.equal(shikamaru.roundFlags.foresight, true);
  assert.deepEqual(game.turnQueue.slice(0, 2), ["p2", "p1"]);
  assert.equal(target.hand.some(card => card.uid === "chess-attack"), false);
  shikamaru.hand = [{ ...cardDefinitions.attack, uid: "foresight-counterattack" }];
  const hp = target.hp;
  game.playCard(shikamaru.id, "foresight-counterattack", target.id);
  assert.equal(target.hp, hp - 2);
});

test("我爱罗可以选择是否发动绝对防御", () => {
  const game = create("ranked2v2", "gaara"), gaara = game.player("p0"), attacker = game.player("p1");
  attacker.characterId = "yuji";
  gaara.hand = [{ ...cardDefinitions.focus, uid: "sand-shield-cost" }];
  const hp = gaara.hp;
  const result = game.beginAttack({ sourceId: attacker.id, targetId: gaara.id, damage: 1, requiredGuards: 1, origin: "attack", skipIntervene: true });
  assert.equal(result.pending, true);
  assert.equal(game.pendingChoice.title, "绝对防御");
  game.resolveChoice(gaara.id, "pass");
  assert.equal(gaara.hp, hp - 1);
  assert.ok(gaara.hand.some(card => card.uid === "sand-shield-cost"));
});

test("佐助追猎被防御后摸牌，自来也共鸣强化普通攻击", () => {
  const sasukeGame = create("ranked2v2", "sasuke"), sasuke = sasukeGame.player("p0"), pursuitTarget = sasukeGame.player("p1");
  pursuitTarget.characterId = "yuji";
  sasuke.hand = [];
  pursuitTarget.hand = [{ ...cardDefinitions.guard, uid: "pursuit-guard-a" }, { ...cardDefinitions.guard, uid: "pursuit-guard-b" }];
  sasuke.swapMarkedId = pursuitTarget.id;
  sasukeGame.beginAttack({ sourceId: sasuke.id, targetId: pursuitTarget.id, damage: 1, requiredGuards: 1, origin: "attack", skipIntervene: true });
  assert.equal(sasuke.hand.length, 1);
  assert.equal(sasuke.swapMarkedId, null);

  const jiraiyaGame = create("ranked2v2", "jiraiya"), jiraiya = jiraiyaGame.player("p0"), sageTarget = jiraiyaGame.player("p1");
  sageTarget.characterId = "yuji";
  sageTarget.hand = [];
  sageTarget.equipment.armor = { ...cardDefinitions.armor, uid: "sage-armor" };
  jiraiya.sageMarks = 2;
  jiraiya.sageResonance = true;
  const hp = sageTarget.hp;
  jiraiyaGame.beginAttack({ sourceId: jiraiya.id, targetId: sageTarget.id, damage: 1, requiredGuards: 1, origin: "attack", skipIntervene: true });
  assert.equal(sageTarget.hp, hp - 2);
  assert.equal(jiraiya.sageMarks, 0);
  assert.equal(jiraiya.sageResonance, false);
});

test("百豪策略牌可解除异常，大蛇丸研究类别会补充能量", () => {
  const sakuraGame = create("ranked2v2", "sakura"), sakura = sakuraGame.player("p0");
  sakura.specialCards = [{ uid: "cleanse-seal", kind: "byakugo", card: { ...cardDefinitions.counter, uid: "cleanse-source" } }];
  sakura.poison = 1;
  assert.equal(sakuraGame.consumeByakugo(sakura.id, "strategy", "解除异常"), true);
  assert.equal(sakura.poison, 0);

  const oroGame = create("ranked2v2", "orochimaru"), orochimaru = oroGame.player("p0"), target = oroGame.player("p1");
  orochimaru.hand = [{ ...cardDefinitions.weapon, uid: "research-sample" }];
  oroGame.useActiveSkill(orochimaru.id, target.id);
  oroGame.confirmDiscard(orochimaru.id, ["research-sample"]);
  assert.equal(orochimaru.curseResearchType, "equipment");
  orochimaru.energy = 0;
  orochimaru.hand = [{ ...cardDefinitions.weapon, uid: "research-use" }];
  oroGame.playCard(orochimaru.id, "research-use", orochimaru.id);
  assert.equal(orochimaru.energy, 1);
});

test("玩家回合结束时按独立上限自行选择超额手牌", () => {
  const game = create("ranked2v2", "gaara");
  const player = game.player("p0");
  player.hp = 3;
  player.hand = [
    { id: "attack", uid: "keep-a", name: "突击", type: "basic" },
    { id: "guard", uid: "discard-guard", name: "防御", type: "basic", responseOnly: true },
    { id: "counter", uid: "keep-counter", name: "反制", type: "strategy", responseOnly: true },
    { id: "focus", uid: "discard-focus", name: "蓄能", type: "basic" },
    { id: "heal", uid: "keep-heal", name: "恢复", type: "basic" }
  ];
  const discardBefore = game.discard.length;
  assert.equal(game.endTurn(player.id), true);
  assert.equal(game.currentPlayerId, player.id);
  assert.equal(game.pendingDiscard?.count, 2);
  assert.equal(game.confirmDiscard(player.id, ["discard-guard", "discard-guard"]).ok, false);
  assert.equal(player.hand.length, 5);
  assert.equal(game.confirmDiscard(player.id, ["discard-guard", "discard-focus"]).ok, true);
  assert.deepEqual(player.hand.map(card => card.uid), ["keep-a", "keep-counter", "keep-heal"]);
  assert.equal(game.discard.length, discardBefore + 2);
  assert.equal(game.pendingDiscard, null);
  assert.equal(game.currentPlayerId, "p1");
});

test("节奏断点在第三张牌前让玩家选择代价且可结束回合", () => {
  const game = create("ranked2v2", "naruto");
  const player = game.player("p0");
  player.hp = 5;
  player.hand = [
    { ...cardDefinitions.focus, uid: "third-card" },
    { ...cardDefinitions.guard, uid: "spare-card" }
  ];
  player.turnFlags.cardsPlayed = 2;
  game.player("p1").plots = [{ uid: "plot-rhythm", card: { ...cardDefinitions.rhythm_break, uid: "rhythm-card" }, ownerId: "p1", targetId: player.id, effect: "rhythmBreak", setTurn: 1 }];
  const result = game.playCard(player.id, "third-card", player.id);
  assert.equal(result.pending, true);
  assert.equal(game.pendingChoice?.title, "节奏断点触发");
  assert.equal(game.resolveChoice(player.id, "stop").ok, true);
  assert.notEqual(game.currentPlayerId, player.id);
  assert.ok(player.hand.some(card => card.uid === "third-card"), "被取消的待使用牌仍应留在手中");
});

test("阿尔敏1体力时不能以超大型巨人令自己退场", () => {
  const game = create("ranked2v2", "armin");
  const armin = game.player("p0");
  armin.hp = 1;
  armin.energy = 4;
  assert.deepEqual(game.getSignatureTargets(armin.id), []);
  const result = game.useSignature(armin.id, armin.id);
  assert.equal(result.ok, false);
  assert.equal(armin.alive, true);
  assert.equal(armin.hp, 1);
});

test("当前行动者意外退场后自动推进到下一名角色", () => {
  const game = create("ranked2v2", "armin");
  const current = game.currentPlayerId;
  game.eliminate(current);
  assert.equal(game.winner, null);
  assert.equal(game.advancePastEliminatedCurrent(), true);
  assert.equal(game.currentPlayerId, "p1");
  assert.equal(game.player(game.currentPlayerId).alive, true);
});

test("28名角色均有项目内立绘", () => {
  for (const character of characters) {
    const relative = portraitPath(character.id).replace(/^\.\//, "");
    assert.equal(existsSync(new URL(`../${relative}`, import.meta.url)), true, `${character.name}缺少立绘`);
  }
});

test("忍界初阵的常规技能不再重复主动技名称与职责", () => {
  const expectedDistinctSkills = {
    naruto: "分身掩护",
    gaara: "砂瀑追葬",
    sasuke: "写轮眼追猎",
    kakashi: "查克拉回收",
    hinata: "八卦领域",
    jiraiya: "蛤蟆协攻"
  };
  for (const character of characters.filter(item => item.packId === "naruto_genesis")) {
    assert.ok(character.skills.every(skill => skill.name !== activeSkills[character.id].name), `${character.name}的常规技能不应重复主动技名称`);
    if (expectedDistinctSkills[character.id]) assert.ok(character.skills.some(skill => skill.name === expectedDistinctSkills[character.id]));
  }
});

test("卡牌图鉴覆盖37种牌与144/80双牌堆", () => {
  assert.equal(Object.keys(cardDefinitions).length, 37);
  assert.deepEqual(Object.values(cardDefinitions).reduce((counts, card) => ({ ...counts, [card.type]: (counts[card.type] || 0) + 1 }), {}), { basic: 6, strategy: 19, equipment: 12 });
  const expected = {
    standard144: { total: 144, basic: 76, strategy: 48, equipment: 20 },
    compact80: { total: 80, basic: 42, strategy: 26, equipment: 12 }
  };
  for (const [profile, recipe] of Object.entries(deckProfiles)) {
    const counts = { total: 0, basic: 0, strategy: 0, equipment: 0 };
    for (const [id, amount] of Object.entries(recipe)) {
      assert.ok(cardDefinitions[id], `${profile}包含未知卡牌${id}`);
      counts.total += amount;
      counts[cardDefinitions[id].type] += amount;
    }
    assert.deepEqual(counts, expected[profile]);
  }
  const illustrated = Object.values(cardDefinitions).filter(card => cardArtPath(card.id));
  assert.equal(illustrated.length, 37);
  for (const card of illustrated) {
    const relative = cardArtPath(card.id).replace(/^\.\//, "");
    assert.equal(existsSync(new URL(`../${relative}`, import.meta.url)), true, `${card.name}缺少图鉴插画`);
  }
});

test("19种策略牌包含原创控制体系与5种伤害策略", () => {
  const expected = [
    "counter", "memory_exchange", "equipment_shift", "tactical_relay", "energy_auction", "intervene", "initiative_swap", "limit_contract",
    "causal_mark", "rhythm_break", "guardian_oath", "return_route", "delayed_cast", "echo_script",
    "dimensional_barrage", "rift_invasion", "will_duel", "mind_burn", "energy_collapse"
  ];
  const actual = Object.values(cardDefinitions).filter(card => card.type === "strategy").map(card => card.id).sort();
  assert.deepEqual(actual, expected.sort());
  assert.equal(cardDefinitions.insight, undefined);
  assert.equal(cardDefinitions.disrupt, undefined);
  assert.deepEqual(
    Object.values(cardDefinitions).filter(card => card.strategyKind === "plot").map(card => card.id).sort(),
    ["causal_mark", "rhythm_break", "guardian_oath", "return_route", "delayed_cast", "echo_script"].sort()
  );
  assert.ok(actual.every(id => cardDefinitions[id].fullDescription?.length > 20), "复杂策略牌应提供完整规则文本");
  assert.ok(Object.values(cardDefinitions).every(card => (card.fullDescription || card.description).length > 0));
});

test("次元弹幕按座次结算且每名角色独立响应或反制", () => {
  const game = create("ranked2v2", "naruto");
  const source = game.player("p0"), guarded = game.player("p1"), countered = game.player("p2"), hit = game.player("p3");
  for (const player of game.players) { player.characterId = "yuji"; player.hand = []; }
  source.hand = [{ ...cardDefinitions.dimensional_barrage, uid: "mass-guard" }];
  guarded.hand = [{ ...cardDefinitions.guard, uid: "mass-defense" }];
  countered.hand = [{ ...cardDefinitions.counter, uid: "mass-counter" }];
  countered.hp = 1;
  hit.equipment.armor = { ...cardDefinitions.armor, uid: "strategy-armor" };
  const hp = hit.hp;
  const result = game.playCard(source.id, "mass-guard", source.id);
  assert.equal(result.ok, true);
  assert.equal(guarded.hand.length, 0);
  assert.equal(countered.hand.length, 0);
  assert.equal(countered.hp, 1);
  assert.equal(hit.hp, hp - 1);
  assert.equal(hit.armorReady, true, "策略伤害不应消耗防护装甲");
  assert.equal(game.pendingStrategySequence, null);
});

test("裂隙侵袭只接受突击或应变并会波及队友", () => {
  const game = create("ranked2v2", "naruto");
  const source = game.player("p0"), first = game.player("p1"), ally = game.player("p2"), last = game.player("p3");
  for (const player of game.players) { player.characterId = "yuji"; player.hand = []; }
  source.hand = [{ ...cardDefinitions.rift_invasion, uid: "mass-attack" }];
  first.hand = [{ ...cardDefinitions.attack, uid: "invasion-attack" }];
  ally.hand = [{ ...cardDefinitions.adapt, uid: "invasion-adapt" }];
  const allyHp = ally.hp, lastHp = last.hp;
  game.playCard(source.id, "mass-attack", source.id);
  assert.equal(first.hand.length, 0);
  assert.equal(ally.hand.length, 0);
  assert.equal(ally.hp, allyHp);
  assert.equal(last.hp, lastHp - 1);
});

test("意志对决交替打出响应牌且不消耗突击次数", () => {
  const game = create("ranked2v2", "naruto");
  const source = game.player("p0"), target = game.player("p1");
  for (const player of game.players) player.hand = [];
  source.hand = [{ ...cardDefinitions.will_duel, uid: "duel" }, { ...cardDefinitions.attack, uid: "duel-source-attack" }];
  target.hand = [{ ...cardDefinitions.attack, uid: "duel-target-attack" }];
  const hp = target.hp;
  game.playCard(source.id, "duel", target.id);
  assert.equal(game.pendingChoice?.playerId, source.id);
  game.resolveChoice(source.id, "duel-source-attack");
  assert.equal(target.hp, hp - 1);
  assert.equal(source.attacksUsed, 0);
  assert.equal(game.pendingStrategySequence, null);
});

test("精神灼烧按展示牌类别弃牌造成策略伤害", () => {
  const game = create("ranked2v2", "naruto");
  const source = game.player("p0"), target = game.player("p1");
  for (const player of game.players) player.hand = [];
  source.hand = [{ ...cardDefinitions.mind_burn, uid: "burn" }, { ...cardDefinitions.attack, uid: "burn-cost" }];
  target.hand = [{ ...cardDefinitions.guard, uid: "burn-shown" }];
  const hp = target.hp;
  game.playCard(source.id, "burn", target.id);
  assert.equal(game.pendingChoice?.title, "精神灼烧 · 是否追击");
  game.resolveChoice(source.id, "burn-cost");
  assert.equal(target.hp, hp - 1);
  assert.ok(target.hand.some(card => card.uid === "burn-shown"), "展示牌应保留在目标手中");
});

test("能量崩解在能量不足时造成伤害，足够时可以支付能量", () => {
  const damageGame = create("ranked2v2", "naruto");
  const source = damageGame.player("p0"), target = damageGame.player("p1");
  for (const player of damageGame.players) player.hand = [];
  source.hand = [{ ...cardDefinitions.energy_collapse, uid: "collapse-damage" }];
  target.energy = 1;
  const hp = target.hp;
  damageGame.playCard(source.id, "collapse-damage", target.id);
  assert.equal(target.hp, hp - 1);

  const payGame = create("ranked2v2", "naruto");
  const payer = payGame.player("p1");
  payer.energy = 2;
  payer.hp = 1;
  const payerHp = payer.hp;
  payGame.resolveEnergyCollapse("p0", payer.id);
  assert.equal(payer.energy, 0);
  assert.equal(payer.hp, payerHp);
});

test("伏笔信息按观察者过滤，且同名伏笔不能共存", () => {
  const game = create();
  const owner = game.player("p0");
  owner.plots = [{ uid: "plot-a", card: { ...cardDefinitions.causal_mark, uid: "causal-a" }, ownerId: owner.id, targetId: "p1", effect: "causalMark", setTurn: game.turnNumber, expiresTurn: game.turnNumber + 4 }];
  const ownView = game.getVisiblePlots(owner.id, owner.id)[0];
  const enemyView = game.getVisiblePlots("p1", owner.id)[0];
  assert.equal(ownView.card.name, "因果标记");
  assert.equal(enemyView.hidden, true);
  assert.equal(enemyView.name, "未知伏笔");
  assert.equal("effect" in enemyView, false);
  assert.equal("card" in enemyView, false);
  assert.equal("expiresTurn" in enemyView, false);
  assert.equal("expiresTurn" in ownView, true);

  const same = { ...cardDefinitions.causal_mark, uid: "causal-b" };
  assert.equal(game.beginPlot(owner.id, "p2", same).reason, "已有同名伏笔");
});

test("同一回合可连续布置伏笔，第三张由玩家指定替换", () => {
  const game = create();
  for (const player of game.players) player.hand = [];
  const owner = game.player("p0");
  owner.hand = [
    { ...cardDefinitions.causal_mark, uid: "plot-causal" },
    { ...cardDefinitions.rhythm_break, uid: "plot-rhythm" },
    { ...cardDefinitions.guardian_oath, uid: "plot-guardian" }
  ];
  assert.equal(game.playCard(owner.id, "plot-causal", "p1").ok, true);
  assert.equal(game.playCard(owner.id, "plot-rhythm", "p2").ok, true);
  assert.equal(owner.plots.length, 2);
  const waiting = game.playCard(owner.id, "plot-guardian", owner.id);
  assert.equal(waiting.pending, true);
  assert.equal(game.pendingChoice.title, "伏笔区已满：选择替换");
  assert.deepEqual(game.pendingChoice.options.map(option => option.value), ["plot-plot-causal", "plot-plot-rhythm"]);
  assert.equal(owner.hand.some(card => card.uid === "plot-guardian"), false);
  assert.equal(game.resolveChoice(owner.id, "plot-plot-causal").ok, true);
  assert.equal(owner.plots.length, 2);
  assert.deepEqual(owner.plots.map(plot => plot.effect).sort(), ["guardianOath", "rhythmBreak"]);
  assert.ok(game.discard.some(card => card.uid === "plot-causal"));
});

test("春野樱以不同类别百豪牌减伤并获得联动能量", () => {
  const game = create("ranked2v2", "sakura"), sakura = game.player("p0");
  sakura.hand = [{ ...cardDefinitions.attack, uid: "seal-basic" }, { ...cardDefinitions.counter, uid: "seal-strategy" }];
  assert.equal(game.useActiveSkill(sakura.id, sakura.id).pending, true);
  game.resolveChoice(sakura.id, "store");
  game.resolveChoice(sakura.id, "seal-basic");
  assert.equal(sakura.specialCards.length, 1);
  sakura.turnFlags.activeUsed = false;
  game.useActiveSkill(sakura.id, sakura.id);
  game.resolveChoice(sakura.id, "store");
  game.resolveChoice(sakura.id, "seal-strategy");
  assert.deepEqual(sakura.specialCards.map(item => item.card.type).sort(), ["basic", "strategy"]);
  const hp = sakura.hp;
  sakura.energy = 0;
  game.dealDamage("p1", sakura.id, 1, "test");
  assert.equal(sakura.hp, hp);
  assert.equal(sakura.specialCards.length, 1);
  assert.equal(game.consumeByakugo(sakura.id, "strategy", "测试解除伏笔"), true);
  assert.equal(sakura.energy, 1, "连续解放不同类别应获得能量");
});

test("春野樱可通过主动技选择并解放百豪牌", () => {
  const game = create("ranked2v2", "sakura"), sakura = game.player("p0");
  sakura.hp = 3;
  sakura.specialCards = [{ uid: "manual-basic-seal", kind: "byakugo", card: { ...cardDefinitions.attack, uid: "manual-basic-card" } }];
  const result = game.useActiveSkill(sakura.id, sakura.id);
  assert.equal(result.pending, true);
  assert.equal(game.pendingChoice.title, "百豪印：蓄印或解放");
  game.resolveChoice(sakura.id, "release:manual-basic-seal");
  assert.equal(sakura.hp, 4);
  assert.equal(sakura.specialCards.length, 0);
  assert.equal(sakura.turnFlags.nextAttackBonus, true);
});

test("奈良鹿丸以棋子和伏笔建立将军陷阱", () => {
  const game = create("ranked2v2", "shikamaru"), shikamaru = game.player("p0");
  const markedId = game.turnQueue[0];
  assert.equal(game.useActiveSkill(shikamaru.id, markedId).ok, true);
  assert.equal(shikamaru.chessTargetId, markedId);
  shikamaru.plots.push({ uid: "plot-checkmate", card: { ...cardDefinitions.causal_mark, uid: "checkmate-card" }, ownerId: shikamaru.id, targetId: markedId, effect: "causalMark", setTurn: game.turnNumber });
  shikamaru.energy = 3;
  assert.equal(game.useSignature(shikamaru.id, markedId).ok, true);
  assert.equal(shikamaru.plots[0].effect, "checkmateTrap");
  assert.equal(shikamaru.plots[0].revealed, true);
  const marked = game.player(markedId);
  game.currentPlayerId = markedId;
  game.phase = "play";
  marked.turnFlags = { cardsPlayed: 0 };
  marked.hand = [{ ...cardDefinitions.focus, uid: "checkmate-attempt" }];
  const result = game.playCard(markedId, "checkmate-attempt", markedId);
  assert.equal(result.cancelled, true);
  assert.ok(marked.hand.some(card => card.uid === "checkmate-attempt"), "被将军取消的牌应留在手中");
});

test("宇智波鼬能布置虚假伏笔并以月读封存手牌", () => {
  const game = create("ranked2v2", "itachi"), itachi = game.player("p0"), target = game.player("p1");
  itachi.hand = [{ ...cardDefinitions.attack, uid: "illusion-card" }];
  target.hand = [{ ...cardDefinitions.focus, uid: "moon-target" }];
  assert.equal(game.useActiveSkill(itachi.id, target.id).pending, true);
  game.resolveChoice(itachi.id, "illusion-card");
  assert.equal(itachi.plots[0].isFalse, true);
  const enemyView = game.getVisiblePlots(target.id, itachi.id)[0];
  assert.equal(enemyView.name, "未知伏笔");
  assert.equal("isFalse" in enemyView, false);
  itachi.energy = 4;
  const hp = target.hp;
  const result = game.useSignature(itachi.id, target.id);
  assert.equal(result.pending, true);
  game.resolveChoice(itachi.id, "moon-target");
  assert.equal(itachi.plots.length, 0);
  assert.equal(target.hand.length, 0);
  assert.equal(target.sealedCards[0].card.id, "focus");
  assert.equal(target.hp, hp - 1);
  game.returnSealedCards(target.id);
  assert.equal(target.sealedCards.length, 0);
  assert.equal(target.hand[0].id, "focus");
});

test("鼬的虚假伏笔骗取反制后公开弃置并获得能量", () => {
  const game = create("ranked2v2", "itachi"), itachi = game.player("p0"), target = game.player("p1");
  itachi.energy = 0;
  itachi.hand = [{ ...cardDefinitions.attack, uid: "false-cost" }];
  target.hand = [{ ...cardDefinitions.counter, uid: "counter-false" }];
  game.useActiveSkill(itachi.id, target.id);
  game.resolveChoice(itachi.id, "false-cost");
  assert.equal(itachi.plots.length, 0);
  assert.equal(itachi.energy, 2);
  assert.equal(itachi.turnFlags.nextAttackBonus, true);
  assert.equal(itachi.turnFlags.nextAttackIgnoreArmor, true);
  assert.ok(game.discard.some(card => card.uid === "false-cost" && card.id === "attack"));
});

test("鼬可用任意虚假伏笔发动乌鸦替身", () => {
  const game = create("ranked2v2", "itachi"), itachi = game.player("p0"), attacker = game.player("p1"), redirected = game.player("p2");
  for (const player of game.players) { player.hand = []; player.characterId = player.id === itachi.id ? "itachi" : "yuji"; }
  itachi.plots = [{ uid: "raven-illusion", card: { ...cardDefinitions.focus, uid: "raven-card" }, ownerId: itachi.id, targetId: "p3", effect: "falsePlot", isFalse: true, setTurn: game.turnNumber }];
  const itachiHp = itachi.hp, redirectedHp = redirected.hp;
  const result = game.beginAttack({ sourceId: attacker.id, targetId: itachi.id, damage: 1, requiredGuards: 1, origin: "attack", skipIntervene: true });
  assert.equal(result.pending, true);
  assert.equal(game.pendingChoice.title, "乌鸦替身");
  game.resolveChoice(itachi.id, redirected.id);
  assert.equal(itachi.hp, itachiHp);
  assert.equal(redirected.hp, redirectedHp - 1);
  assert.equal(itachi.plots.length, 0);
  assert.equal(itachi.hand.length, 1);
});

test("佐助以天手力交换装备并建立无视距离与护甲的追猎", () => {
  const game = create("ranked2v2", "sasuke"), sasuke = game.player("p0"), target = game.player("p1");
  for (const player of game.players) player.hand = [];
  target.characterId = "yuji";
  sasuke.energy = 1;
  sasuke.equipment.weapon = { ...cardDefinitions.weapon, uid: "swap-weapon" };
  target.equipment.armor = { ...cardDefinitions.armor, uid: "tracked-armor" };
  assert.equal(game.useActiveSkill(sasuke.id, target.id).pending, true);
  game.resolveChoice(sasuke.id, "weapon");
  assert.equal(sasuke.swapMarkedId, target.id);
  assert.equal(target.equipment.weapon.uid, "swap-weapon");
  sasuke.hand = [{ ...cardDefinitions.attack, uid: "pursuit-attack" }];
  target.hand = [{ ...cardDefinitions.guard, uid: "single-guard" }];
  const hp = target.hp;
  assert.ok(game.getCardTargets(sasuke.id, sasuke.hand[0]).includes(target.id));
  game.playCard(sasuke.id, "pursuit-attack", target.id);
  assert.equal(target.hp, hp - 1);
  assert.equal(target.equipment.armor.uid, "tracked-armor", "追猎应忽略而不是摧毁防护装甲");
  assert.equal(sasuke.swapMarkedId, null);
});

test("卡卡西从弃牌堆生成限时拷贝且拷贝不计出牌数", () => {
  const game = create("ranked2v2", "kakashi"), kakashi = game.player("p0"), target = game.player("p1");
  for (const player of game.players) player.hand = [];
  target.characterId = "yuji";
  kakashi.energy = 1;
  game.discard = [{ ...cardDefinitions.attack, uid: "copied-source" }];
  assert.equal(game.useActiveSkill(kakashi.id, kakashi.id).pending, true);
  game.resolveChoice(kakashi.id, "copied-source");
  const copy = kakashi.hand.find(card => card._copiedBy === kakashi.id);
  assert.ok(copy);
  target.hand = [{ ...cardDefinitions.guard, uid: "copy-guard" }];
  game.playCard(kakashi.id, copy.uid, target.id);
  assert.equal(kakashi.turnFlags.cardsPlayed, 0);
  assert.equal(kakashi.energy, 1, "每轮首次使用拷贝牌应回收1点能量");
  assert.equal(game.discard.filter(card => card.uid === copy.uid).length, 0, "临时拷贝不应污染实体牌堆");
});

test("雏田对白眼目标的攻击无视距离", () => {
  const game = create("classic8", "hinata"), hinata = game.player("p0"), target = game.player("p2");
  game.currentPlayerId = hinata.id;
  game.phase = "play";
  assert.equal(game.distance(hinata.id, target.id), 2);
  hinata.hand = [{ ...cardDefinitions.attack, uid: "byakugan-attack" }];
  assert.equal(game.getCardTargets(hinata.id, hinata.hand[0]).includes(target.id), false);
  game.useActiveSkill(hinata.id, target.id);
  assert.equal(game.getCardTargets(hinata.id, hinata.hand[0]).includes(target.id), true);
});

test("雏田的白眼公开锁定目标情报并以策略封锁能量", () => {
  const game = create("ranked2v2", "hinata"), hinata = game.player("p0"), target = game.player("p1");
  target.plots = [{ uid: "scouted-plot", card: { ...cardDefinitions.causal_mark, uid: "scouted-card" }, ownerId: target.id, targetId: hinata.id, effect: "causalMark", setTurn: game.turnNumber }];
  assert.equal(game.getVisiblePlots(hinata.id, target.id)[0].hidden, true);
  assert.equal(game.useActiveSkill(hinata.id, target.id).ok, true);
  assert.equal(game.getVisiblePlots(hinata.id, target.id)[0].hidden, false);
  hinata.hand = [{ ...cardDefinitions.memory_exchange, uid: "meridian-strategy" }, { ...cardDefinitions.focus, uid: "exchange-cost" }];
  target.hand = [{ ...cardDefinitions.attack, uid: "exchange-target" }];
  game.playCard(hinata.id, "meridian-strategy", target.id);
  assert.equal(target.energyLocked, true);
  game.resolveChoice(hinata.id, "exchange-cost");
  hinata.energy = 4;
  const hp = target.hp;
  game.useSignature(hinata.id, target.id);
  assert.equal(target.hp, hp - 1);
  assert.equal(target.energy, 0);
});

test("自来也以蛤蟆束缚逼牌，并通过攻防积累仙术印", () => {
  const game = create("ranked2v2", "jiraiya"), jiraiya = game.player("p0"), target = game.player("p1");
  jiraiya.energy = 2;
  assert.equal(game.useActiveSkill(jiraiya.id, target.id).ok, true);
  assert.equal(jiraiya.toadBindTargetId, target.id);
  const handBeforeCancel = jiraiya.hand.length;
  target.human = true;
  target.hand = [{ ...cardDefinitions.attack, uid: "toad-attack" }, { ...cardDefinitions.focus, uid: "toad-cost" }];
  const blocked = game.playCard(target.id, "toad-attack", jiraiya.id, { freeUse: true });
  assert.equal(blocked.pending, true);
  assert.equal(game.pendingChoice.title, "蛤蟆口束缚触发");
  game.resolveChoice(target.id, "cancel");
  assert.equal(jiraiya.toadBindTargetId, null);
  assert.equal(jiraiya.hand.length, handBeforeCancel + 1, "束缚取消出牌时蛤蟆协攻应摸1张牌");
  assert.equal(target.hand.some(card => card.uid === "toad-attack"), false);

  game.startRound();
  game.currentPlayerId = jiraiya.id;
  game.phase = "play";
  jiraiya.turnFlags = { cardsPlayed: 0 };
  jiraiya.energy = 2;
  target.human = true;
  target.hand = [{ ...cardDefinitions.attack, uid: "toad-attack-pay" }, { ...cardDefinitions.focus, uid: "toad-cost-pay" }];
  game.useActiveSkill(jiraiya.id, target.id);
  game.playCard(target.id, "toad-attack-pay", jiraiya.id, { freeUse: true });
  game.resolveChoice(target.id, "pay");
  assert.equal(game.pendingDiscard.playerId, target.id);
  game.confirmDiscard(target.id, ["toad-cost-pay"]);
  assert.equal(jiraiya.toadBindTargetId, null);
  assert.ok(jiraiya.energy >= 1, "目标弃牌继续时蛤蟆协攻应至少获得1点能量");
  assert.ok(game.logs.some(item => item.message?.includes("蛤蟆协攻") && item.message?.includes("获得1点能量")));

  jiraiya.sageMarks = 0;
  jiraiya.sageResonance = false;
  jiraiya.sageMarkRoundFlags = { dealt: false, taken: false };
  game.dealDamage(jiraiya.id, target.id, 1, "test");
  game.dealDamage(target.id, jiraiya.id, 1, "test");
  assert.equal(jiraiya.sageMarks, 2);
  assert.equal(jiraiya.sageResonance, true);
  assert.equal(game.attackRange(jiraiya.id), 2);
});

test("自来也的仙法·五右卫门最多连续结算两个目标", () => {
  const game = create("ranked2v2", "jiraiya"), jiraiya = game.player("p0");
  const targets = game.getSignatureTargets(jiraiya.id);
  assert.equal(targets.length, 2);
  for (const id of targets) { game.player(id).hand = []; game.player(id).characterId = "yuji"; game.player(id).equipment.armor = null; }
  jiraiya.energy = 4;
  jiraiya.sageMarks = 2;
  jiraiya.sageResonance = true;
  const firstHp = game.player(targets[0]).hp, secondHp = game.player(targets[1]).hp;
  assert.equal(game.useSignature(jiraiya.id, targets[0]).pending, true);
  assert.equal(game.pendingChoice.title, "仙法·五右卫门：选择第二目标");
  game.resolveChoice(jiraiya.id, targets[1]);
  assert.equal(game.pendingChoice.title, "五右卫门：仙术共鸣");
  game.resolveChoice(jiraiya.id, targets[0]);
  assert.equal(game.player(targets[0]).hp, firstHp - 3);
  assert.equal(game.player(targets[1]).hp, secondHp - 1);
  assert.equal(jiraiya.sageResonance, false);
});

test("大蛇丸用咒印夺取同类牌并将实验装备用于不尸转生", () => {
  const game = create("ranked2v2", "orochimaru"), orochimaru = game.player("p0"), target = game.player("p1");
  orochimaru.hand = [{ ...cardDefinitions.weapon, uid: "curse-sample" }];
  target.hand = [{ ...cardDefinitions.armor, uid: "curse-equipment" }];
  assert.equal(game.useActiveSkill(orochimaru.id, target.id).pending, true);
  game.confirmDiscard(orochimaru.id, ["curse-sample"]);
  assert.equal(target.curseSeal.type, "equipment");
  const result = game.playCard(target.id, "curse-equipment", target.id, { freeUse: true });
  assert.equal(result.cancelled, true);
  assert.ok(orochimaru.hand.some(card => card.uid === "curse-equipment" && card._curseSpoil === orochimaru.id));
  orochimaru.energy = 3;
  assert.equal(game.useSignature(orochimaru.id, orochimaru.id).pending, true);
  game.resolveChoice(orochimaru.id, "curse-equipment");
  assert.equal(orochimaru.equipment.armor?.uid, "curse-equipment");
  assert.equal(orochimaru.shield, 1);
});

test("同一目标上的多个因果标记与守护誓约都会各自触发", () => {
  const game = create();
  for (const player of game.players) { player.human = false; player.hand = []; player.energy = 0; }
  for (const ownerId of ["p2", "p3"]) {
    game.player(ownerId).plots.push({ uid: `causal-${ownerId}`, card: { ...cardDefinitions.causal_mark, uid: `causal-card-${ownerId}` }, ownerId, targetId: "p0", effect: "causalMark", setTurn: game.turnNumber });
  }
  game.dealDamage("p0", "p1", 1, "test");
  for (const ownerId of ["p2", "p3"]) {
    assert.equal(game.player(ownerId).hand.length, 2);
    assert.equal(game.player(ownerId).energy, 1);
    assert.equal(game.player(ownerId).plots.length, 0);
  }

  const hpBefore = game.player("p1").hp;
  for (const ownerId of ["p2", "p3"]) {
    game.player(ownerId).plots.push({ uid: `oath-${ownerId}`, card: { ...cardDefinitions.guardian_oath, uid: `oath-card-${ownerId}` }, ownerId, targetId: "p1", effect: "guardianOath", setTurn: game.turnNumber });
  }
  game.dealDamage("p0", "p1", 2, "test");
  assert.equal(game.player("p1").hp, hpBefore);
  assert.ok(["p2", "p3"].every(ownerId => game.player(ownerId).plots.length === 0));
});

test("时序改写只交换本轮队列而不改变永久座次", () => {
  const game = create();
  for (const player of game.players) { player.human = false; player.hand = []; }
  const originalSeats = game.players.map(player => player.seat);
  game.turnQueue = ["p1", "p2", "p3"];
  game.resolveInitiativeSwapSetup("p0", "p1", cardDefinitions.initiative_swap);
  assert.deepEqual(game.turnQueue, ["p3", "p2", "p1"]);
  assert.deepEqual(game.players.map(player => player.seat), originalSeats);
});

test("装备转移不会再次触发备用电池的入场能量", () => {
  const game = create();
  for (const player of game.players) { player.human = false; player.hand = []; }
  const first = game.player("p1"), second = game.player("p0");
  first.equipment.charm = { ...cardDefinitions.battery, uid: "battery-shift" };
  game.refreshEnergyCap(first);
  first.energy = 5;
  second.energy = 0;
  game.resolveEquipmentShiftSetup("p2", first.id, cardDefinitions.equipment_shift);
  assert.equal(first.equipment.charm, null);
  assert.equal(first.maxEnergy, 4);
  assert.equal(first.energy, 4);
  assert.equal(second.equipment.charm?.id, "battery");
  assert.equal(second.maxEnergy, 5);
  assert.equal(second.energy, 0);
});

test("重伤角色可以用恢复自救，生命吊坠也能自动救援", () => {
  const game = create();
  for (const player of game.players) { player.human = false; player.hand = []; }
  const target = game.player("p1");
  target.hp = 1;
  target.hand = [{ ...cardDefinitions.heal, uid: "rescue-heal" }];
  game.dealDamage("p0", target.id, 1, "test");
  assert.equal(target.alive, true);
  assert.equal(target.hp, 1);
  assert.equal(target.dying, false);

  target.hp = 1;
  target.hand = [];
  target.equipment.charm = { ...cardDefinitions.life_pendant, uid: "rescue-pendant" };
  game.dealDamage("p0", target.id, 1, "test");
  assert.equal(target.alive, true);
  assert.equal(target.hp, 1);
  assert.equal(target.equipment.charm, null);
});

test("四人和八人模式的环形席位映射稳定且覆盖桌面三侧", () => {
  const four = [1, 2, 3].map(seat => tableSeatPosition(4, seat));
  const eight = [1, 2, 3, 4, 5, 6, 7].map(seat => tableSeatPosition(8, seat));
  assert.equal(new Set(four.map(position => `${position.x},${position.y}`)).size, 3);
  assert.equal(new Set(eight.map(position => `${position.x},${position.y}`)).size, 7);
  assert.ok(eight.some(position => position.x < 20));
  assert.ok(eight.some(position => position.x > 80));
  assert.ok(eight.some(position => position.y < 10));
});

function seededRandom(seed = 7) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

for (const modeId of ["ranked2v2", "classic8"]) {
  test(`${modeId} 的AI对局能够自动推进到胜负`, () => {
    const game = new GameEngine({ modeId, humanCharacterId: "tanjiro", random: seededRandom(modeId === "classic8" ? 19 : 11) }).setup();
    for (const player of game.players) player.human = false;
    let steps = 0;
    while (!game.winner && steps < 4000) {
      const result = game.aiStep();
      if (game.pendingResponse) game.respond(true);
      else if (!result.acted) game.endTurn();
      steps += 1;
    }
    assert.ok(game.winner, `对局在${steps}步内应产生胜者`);
    assert.ok(game.round < 80, `对局轮数不应异常：${game.round}`);
  });
}

test("忍界初阵十名角色均可由AI完成2V2对局", () => {
  for (const [index, characterId] of characterPacks[0].characterIds.entries()) {
    const game = new GameEngine({ modeId: "ranked2v2", humanCharacterId: characterId, random: seededRandom(31 + index) }).setup();
    for (const player of game.players) player.human = false;
    let steps = 0;
    while (!game.winner && steps < 4000) {
      const result = game.aiStep();
      if (game.pendingResponse) game.respond(true);
      else if (!result.acted) game.endTurn();
      steps += 1;
    }
    assert.ok(game.winner, `${characterId}参与的AI对局应正常结束`);
    assert.equal(game.pendingChoice, null);
    assert.equal(game.pendingDiscard, null);
    assert.equal(game.pendingResponse, null);
  }
});

test("基础系统：护盾统一封顶为3点", () => {
  const game = create("ranked2v2");
  const player = game.player("p0");
  player.shield = 2;
  assert.equal(game.gainShield(player.id, 5), 1);
  assert.equal(player.shield, 3);
  assert.equal(game.gainShield(player.id, 1), 0);
  assert.equal(player.shield, 3);
});

test("2V2首行动座位由随机源决定且可复现", () => {
  const low = new GameEngine({ modeId: "ranked2v2", humanCharacterId: "naruto", random: () => 0.01 }).setup();
  const high = new GameEngine({ modeId: "ranked2v2", humanCharacterId: "naruto", random: () => 0.99 }).setup();
  const replay = new GameEngine({ modeId: "ranked2v2", humanCharacterId: "naruto", random: () => 0.01 }).setup();
  assert.notEqual(low.anchorSeat, high.anchorSeat);
  assert.equal(low.anchorSeat, replay.anchorSeat);
  assert.ok(low.anchorSeat >= 0 && low.anchorSeat < 4);
});

test("布鲁克未觉醒不能触发黄泉复生，觉醒后仅可触发一次", () => {
  const game = create("ranked2v2", "brook");
  for (const player of game.players) { player.human = false; player.hand = []; player.equipment = { weapon: null, armor: null, charm: null }; }
  const brook = game.player("p0");
  brook.hp = 1;
  game.dealDamage("p1", brook.id, 1, "attack");
  assert.equal(brook.alive, false);
  brook.alive = true; brook.dying = false; brook.hp = 1; brook.reviveUsed = false; brook.dreamState.awakened = true; brook.energy = 2; brook.hand = [{ ...cardDefinitions.attack, uid: "brook-card" }];
  game.dealDamage("p1", brook.id, 1, "attack");
  assert.equal(brook.alive, true);
  assert.equal(brook.hp, 1);
  assert.equal(brook.reviveUsed, true);
});

test("第二轮角色平衡边界：防御、伏笔与觉醒资源受限", () => {
  const gaaraGame = create("ranked2v2", "gaara");
  const gaara = gaaraGame.player("p0"), gaaraAttacker = gaaraGame.player("p1");
  gaara.hand = [{ ...cardDefinitions.focus, uid: "gaara-signature-check" }];
  const gaaraHp = gaara.hp;
  gaaraGame.beginAttack({ sourceId: gaaraAttacker.id, targetId: gaara.id, damage: 1, requiredGuards: 1, origin: "signature", skipIntervene: true });
  assert.equal(gaara.hp, gaaraHp - 1, "绝对防御不应取消招牌技攻击");

  const sakuraGame = create("ranked2v2", "sakura");
  const sakura = sakuraGame.player("p0");
  sakura.hand = [
    { ...cardDefinitions.attack, uid: "sakura-store-a" },
    { ...cardDefinitions.counter, uid: "sakura-store-b" },
    { ...cardDefinitions.weapon, uid: "sakura-store-c" }
  ];
  sakura.energy = 3;
  for (const uid of ["sakura-store-a", "sakura-store-b", "sakura-store-c"]) {
    sakura.turnFlags.activeUsed = false;
    assert.equal(sakuraGame.useActiveSkill(sakura.id, sakura.id).pending, true);
    sakuraGame.resolveChoice(sakura.id, "store");
    sakuraGame.resolveChoice(sakura.id, uid);
  }
  assert.equal(sakura.specialCards.filter(item => item.kind === "byakugo").length, 3, "樱应能储存三张不同类别百豪牌");

  const robinGame = create("ranked2v2", "robin");
  const robin = robinGame.player("p0"), robinTarget = robinGame.player("p1");
  robin.energy = 0;
  robinTarget.hand = [{ ...cardDefinitions.attack, uid: "robin-target-card" }];
  assert.ok(robinGame.getActiveSkillTargets(robin.id).includes(robinTarget.id), "罗宾零能量也应可发动百花搜查");

  const luffyGame = create("ranked2v2", "luffy");
  const luffy = luffyGame.player("p0"), luffyAttacker = luffyGame.player("p1");
  const omen = { ...cardDefinitions.counter, uid: "luffy-omen" };
  luffyGame.deck.unshift(omen);
  luffy.roundFlags.observation = false;
  luffyGame.beginAttack({ sourceId: luffyAttacker.id, targetId: luffy.id, damage: 1, requiredGuards: 0, origin: "attack", skipIntervene: true });
  assert.equal(luffy.hand.some(card => card.uid === omen.uid), false, "见闻色获得的非基础牌不应进入手牌");
  assert.equal(luffyGame.deck.at(-1)?.uid, omen.uid, "见闻色获得的非基础牌应置于牌堆底");

  const brookGame = create("ranked2v2", "brook");
  const brook = brookGame.player("p0"), brookTarget = brookGame.player("p1");
  brook.turnFlags.activeUsed = false;
  assert.ok(brookGame.useActiveSkill(brook.id, brookTarget.id).ok);
  brook.turnFlags.activeUsed = false;
  assert.equal(brookGame.getActiveSkillTargets(brook.id).length, 0, "灵魂乐章每轮只能发动一次");

  const jiraiyaGame = create("ranked2v2", "jiraiya");
  const jiraiya = jiraiyaGame.player("p0"), jiraiyaTarget = jiraiyaGame.player("p1");
  jiraiya.energy = 2;
  assert.equal(jiraiyaGame.useActiveSkill(jiraiya.id, jiraiyaTarget.id).ok, true);
  jiraiya.toadBindTargetId = null;
  jiraiya.turnFlags.activeUsed = false;
  assert.equal(jiraiyaGame.getActiveSkillTargets(jiraiya.id).length, 0, "蛤蟆口束缚每轮只能发动一次");
});

test("卡卡西神威雷切费用为2且拷贝可从全部弃牌中选择", () => {
  const game = create("ranked2v2", "kakashi");
  assert.equal(game.signatureCost("p0"), 2);
  const kakashi = game.player("p0");
  game.discard = Array.from({ length: 10 }, (_, index) => ({ ...cardDefinitions.attack, uid: `old-${index}` }));
  kakashi.hand = [];
  kakashi.turnFlags.activeUsed = false;
  game.useActiveSkill("p0", "p0");
  assert.ok(game.pendingChoice?.options?.length >= 10);
});

test("第二轮数值校准：极端角色回归到可控资源区间", () => {
  const byId = id => characters.find(character => character.id === id);
  assert.equal(byId("gaara").signature.text.includes("受到1点伤害"), true);
  assert.equal(byId("gaara").hp, 3);
  assert.equal(byId("jiraiya").signature.cost, 4);
  assert.equal(activeSkills.jiraiya.cost, 2);
  assert.equal(byId("sakura").handLimit, 5);
  assert.equal(byId("kakashi").handLimit, 5);
  assert.equal(byId("orochimaru").signature.cost, 2);
  assert.equal(byId("orochimaru").hp, 4);
  assert.equal(byId("brook").handLimit, 4);
  assert.equal(activeSkills.brook.cost, 1);
  assert.equal(byId("sakura").signature.cost, 3);
  assert.equal(byId("kakashi").signature.cost, 2);
  assert.equal(byId("usopp").signature.cost, 3);
  assert.equal(byId("robin").signature.cost, 3);
});

test("我爱罗砂缚命中空手牌目标时造成1点伤害", () => {
  const game = create("ranked2v2", "gaara");
  const gaara = game.player("p0");
  const target = game.player("p1");
  gaara.energy = 1;
  target.hand = [];
  const hp = target.hp;
  const result = game.useActiveSkill(gaara.id, target.id);
  assert.equal(result.ok, true);
  assert.equal(target.hp, hp - 1);
  assert.equal(target.sandMarkedBy, gaara.id);
});

test("牌生命周期与装备变更事件带有统一事件字段", () => {
  const game = create("ranked2v2");
  const player = game.player("p0");
  player.hand = [{ ...cardDefinitions.focus, uid: "focus-event" }];
  game.playCard(player.id, "focus-event", player.id);
  const cardEvents = game.eventHistory.filter(event => event.card?.uid === "focus-event").map(event => event.type);
  assert.deepEqual(cardEvents, ["cardDeclared", "cardResolved"]);
  player.hand = [{ ...cardDefinitions.weapon, uid: "weapon-event" }];
  game.playCard(player.id, "weapon-event", player.id);
  const equipmentEvent = game.eventHistory.find(event => event.type === "equipmentChanged" && event.entered?.uid === "weapon-event");
  assert.equal(equipmentEvent.ownerId, player.id);
  assert.equal(equipmentEvent.left, null);
});
