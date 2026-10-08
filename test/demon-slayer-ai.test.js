import test from "node:test";
import assert from "node:assert/strict";
import { activeSkills, cardDefinitions, getCharacter } from "../src/data.js";
import { GameEngine } from "../src/engine.js";
import { initializeDemonSlayerState } from "../src/packs/demon-slayer.js";

const roster = ["tanjiro", "zenitsu", "inosuke", "shinobu", "giyu", "rengoku", "mitsuri", "nezuko", "akaza", "muzan"];
const card = (id, uid) => ({ ...cardDefinitions[id], uid });

function createAI(characterId, modeId = "ranked2v2") {
  const game = new GameEngine({ modeId, humanCharacterId: "luffy", fixedAnchorSeat: 0, random: () => 0.25 }).setup();
  const actor = game.player("p1");
  actor.characterId = characterId;
  initializeDemonSlayerState(actor, getCharacter(characterId));
  actor.energy = 4;
  actor.hand = [card("focus", "ai-basic"), card("attack", "ai-attack")];
  for (const target of game.players.filter(player => player.id !== actor.id)) {
    target.hand = [];
    target.shield = 0;
    target.equipment = { weapon: null, armor: null, charm: null };
  }
  game.currentPlayerId = actor.id;
  game.phase = "play";
  return { game, actor, enemy: game.player("p0"), ally: game.player("p3") };
}

function prepareActive(characterId, state) {
  const { actor, enemy, ally } = state;
  actor.energy = characterId === "muzan" ? 2 : 1;
  if (characterId === "shinobu") enemy.poison = 2;
  if (["giyu", "rengoku", "nezuko"].includes(characterId)) ally.hp = 1;
  if (characterId === "tanjiro") enemy.hand = [card("guard", "private-guard")];
}

for (const characterId of roster) {
  test(`${characterId} AI 在有收益时合法发动主动技`, () => {
    const state = createAI(characterId);
    prepareActive(characterId, state);
    const { game, actor } = state;
    const legal = game.getActiveSkillTargets(actor.id);
    assert.ok(legal.length > 0, `${activeSkills[characterId].name} 应有合法目标`);
    const result = game.aiStep(actor.id);
    assert.equal(result.acted, true);
    assert.ok(game.telemetry.activeSkillUses > 0);
  });

  test(`${characterId} AI 在招牌技可用时合法发动`, () => {
    const { game, actor, enemy, ally } = createAI(characterId);
    actor.turnFlags.activeUsed = true;
    actor.energy = game.signatureCost(actor.id);
    if (characterId === "akaza") actor.compassTargetId = enemy.id;
    if (characterId === "giyu") ally.hp = 1;
    const legal = game.getSignatureTargets(actor.id);
    assert.ok(legal.length > 0);
    const result = game.aiStep(actor.id);
    assert.equal(result.acted, true);
    assert.equal(game.telemetry.signatureUses, 1);
  });
}

test("无收益时不浪费祢豆子援护或义勇静水护形", () => {
  for (const characterId of ["nezuko", "giyu"]) {
    const { game, actor, ally } = createAI(characterId);
    actor.energy = 1;
    actor.hand = [];
    ally.hp = ally.maxHp;
    ally.shield = 3;
    actor.shield = 3;
    game.aiStep(actor.id);
    assert.equal(game.telemetry.activeSkillUses, 0);
  }
});

test("祢豆子在交错座次 2V2 能援护距离2的队友", () => {
  const { game, actor, ally } = createAI("nezuko");
  actor.energy = 1;
  assert.equal(game.distance(actor.id, ally.id), 2);
  assert.ok(game.getActiveSkillTargets(actor.id).includes(ally.id));
});

test("低体力且有毒的队友优先获得蝴蝶忍的藤花净化", () => {
  const { game, actor, enemy, ally } = createAI("shinobu");
  actor.energy = 1;
  enemy.poison = 1;
  ally.poison = 2;
  ally.hp = 1;
  game.aiStep(actor.id);
  assert.equal(ally.poison, 1);
  assert.equal(ally.shield, 1);
  assert.equal(enemy.poison, 1);
});

test("蝴蝶忍在军八只对已公开的友方选择净化", () => {
  const { game, actor } = createAI("shinobu", "classic8");
  actor.energy = 1;
  const target = game.player("p2");
  actor.roleId = "loyal";
  target.roleId = "loyal";
  target.revealed = true;
  target.poison = 1;
  game.useActiveSkill(actor.id, target.id);
  assert.equal(target.poison, 0);
  assert.equal(target.shield, 1);
});

test("经典军八仅改变未知真实身份和等量手牌内容不改变炭治郎追迹目标", () => {
  const targetOf = (roleId, hiddenCardId) => {
    const { game, actor } = createAI("tanjiro", "classic8");
    actor.energy = 1;
    actor.hand = [card("attack", "known-attack")];
    for (const target of [game.player("p2"), game.player("p3")]) {
      target.revealed = false;
      target.hp = 2;
      target.hand = [card(hiddenCardId, `hidden-${target.id}`)];
    }
    game.player("p2").roleId = roleId;
    game.aiStep(actor.id);
    return actor.scentTargetId;
  };
  assert.equal(targetOf("rebel", "attack"), targetOf("loyal", "guard"));
});

test("善逸已有招牌技费用时优先六连，不提前蓄雷结束出牌阶段", () => {
  const { game, actor } = createAI("zenitsu");
  game.aiStep(actor.id);
  assert.equal(game.telemetry.signatureUses, 1);
  assert.equal(game.telemetry.activeSkillUses, 0);
});

test("炼狱一体力时不为普通招牌技自损退场", () => {
  const { game, actor } = createAI("rengoku");
  actor.hp = 1;
  actor.turnFlags.activeUsed = true;
  game.aiStep(actor.id);
  assert.equal(game.telemetry.signatureUses, 0);
  assert.equal(actor.alive, true);
});

test("祢豆子爆血印优先净化己方，不给敌方毒素目标授盾", () => {
  const { game, actor, enemy, ally } = createAI("nezuko");
  actor.energy = 3;
  actor.bloodFlame = 1;
  actor.roundFlags.bloodFlameGained = true;
  ally.poison = 1;
  game.useSignature(actor.id, enemy.id);
  assert.equal(ally.poison, 0);
  assert.equal(ally.shield, 1);
  assert.equal(enemy.shield, 0);
});

test("蜜璃协作者列表不暴露队友是否持有突击", () => {
  const optionsWith = heldCardId => {
    const { game, actor, ally } = createAI("mitsuri");
    ally.hand = [card(heldCardId, `ally-${heldCardId}`)];
    let options = [];
    const original = game.requestChoice.bind(game);
    game.requestChoice = (playerId, config) => {
      if (config.title === "恋之呼吸·协作者") options = config.options.map(option => option.value);
      return original(playerId, config);
    };
    game.useSignature(actor.id, "p0");
    return options;
  };
  assert.deepEqual(optionsWith("attack"), optionsWith("guard"));
});
