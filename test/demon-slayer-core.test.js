import test from "node:test";
import assert from "node:assert/strict";
import { activeSkills, cardDefinitions, characterPacks, characters, deckProfiles } from "../src/data.js";
import { GameEngine } from "../src/engine.js";
import { poolIds } from "../scripts/simulation.mjs";

const demonStats = {
  tanjiro: [4, 4], zenitsu: [3, 4], inosuke: [4, 3], shinobu: [3, 5],
  giyu: [4, 4], rengoku: [4, 4], mitsuri: [4, 5], nezuko: [4, 3],
  akaza: [4, 4], muzan: [4, 5]
};
const slayers = ["tanjiro", "zenitsu", "inosuke", "shinobu", "giyu", "rengoku", "mitsuri"];

function gameFor(id = "tanjiro") {
  const game = new GameEngine({ modeId: "ranked2v2", humanCharacterId: id, fixedAnchorSeat: 0, random: () => 0.42 }).setup();
  for (const player of game.players) {
    player.hand = [];
    player.shield = 0;
    player.equipment = { weapon: null, armor: null, charm: null };
  }
  game.player("p1").characterId = "ichigo";
  return game;
}

test("鬼灭包恰有十个唯一角色，数值正确且不改变牌堆", () => {
  assert.equal(characters.length, 36);
  assert.equal(new Set(characters.map(character => character.id)).size, 36);
  const pack = characterPacks.find(item => item.id === "demon_slayer_sun_moon");
  assert.deepEqual([...pack.characterIds].sort(), Object.keys(demonStats).sort());
  assert.deepEqual([...poolIds(pack.id)].sort(), Object.keys(demonStats).sort());
  for (const [id, [hp, handLimit]] of Object.entries(demonStats)) {
    const character = characters.find(item => item.id === id);
    assert.equal(character.packId, pack.id, id);
    assert.equal(character.hp, hp, id);
    assert.equal(character.handLimit, handLimit, id);
    assert.ok(activeSkills[id], id);
  }
  assert.equal(Object.keys(cardDefinitions).length, 37);
  assert.equal(Object.values(deckProfiles.standard144).reduce((sum, count) => sum + count, 0), 144);
  assert.equal(Object.values(deckProfiles.compact80).reduce((sum, count) => sum + count, 0), 80);
});

test("七名剑士有独立呼吸态，三名鬼使用互不混用的状态", () => {
  for (const id of slayers) {
    const player = gameFor(id).player("p0");
    assert.equal(player.breathReady, 0, id);
    assert.equal(player.bloodFlame, undefined, id);
  }
  const nezuko = gameFor("nezuko").player("p0");
  assert.equal(nezuko.bloodFlame, 0);
  assert.equal(nezuko.breathReady, undefined);
  const akaza = gameFor("akaza").player("p0");
  assert.equal(akaza.compassTargetId, null);
  assert.equal(akaza.compassDefended, false);
  assert.equal(akaza.breathReady, undefined);
  const muzan = gameFor("muzan").player("p0");
  assert.equal(muzan.bloodMarkTargetId, null);
  assert.equal(muzan.breathReady, undefined);
});

test("手牌普通突击实际打掉体力才让攻击者获得呼吸态", () => {
  const game = gameFor();
  const attacker = game.player("p0"), target = game.player("p1");
  target.hp = 3;
  attacker.hand = [{ ...cardDefinitions.attack, uid: "breath-attack" }];
  const result = game.playCard("p0", "breath-attack", "p1");
  assert.equal(result.ok, true);
  assert.equal(target.hp, 2);
  assert.equal(attacker.breathReady, 1);
  assert.equal(attacker.roundFlags.breathGained, true);
});

test("护盾完全吸收普通突击时攻击者不获呼吸态", () => {
  const game = gameFor();
  const attacker = game.player("p0"), target = game.player("p1");
  target.hp = 3;
  target.shield = 1;
  attacker.hand = [{ ...cardDefinitions.attack, uid: "shielded-attack" }];
  assert.equal(game.playCard("p0", "shielded-attack", "p1").ok, true);
  assert.equal(target.hp, 3);
  assert.equal(attacker.breathReady, 0);
});

test("实际支付足额防御牌防住普通突击时防御者获呼吸态", () => {
  const game = gameFor();
  const defender = game.player("p0"), attacker = game.player("p1");
  defender.hand = [{ ...cardDefinitions.guard, uid: "paid-guard" }];
  attacker.hand = [{ ...cardDefinitions.attack, uid: "guarded-attack" }];
  assert.equal(game.playCard("p1", "guarded-attack", "p0", { freeUse: true }).pending, true);
  assert.equal(game.respond(true), true);
  assert.equal(defender.hand.length, 0);
  assert.equal(defender.breathReady, 1);
});

test("防具代替防御、未足额响应与取消的突击不获呼吸态", () => {
  const game = gameFor();
  const defender = game.player("p0"), attacker = game.player("p1");
  defender.equipment.armor = cardDefinitions.adaptive_armor;
  defender.hand = [{ ...cardDefinitions.heal, uid: "armor-substitute" }];
  attacker.hand = [{ ...cardDefinitions.attack, uid: "armor-attack" }];
  assert.equal(game.playCard("p1", "armor-attack", "p0", { freeUse: true }).pending, true);
  game.respond(true);
  assert.equal(defender.breathReady, 0);

  defender.hand = [{ ...cardDefinitions.guard, uid: "insufficient-guard" }];
  game.player("p1").hand = [];
  game.beginAttack({ sourceId: "p1", targetId: "p0", origin: "attack", requiredGuards: 2 });
  assert.equal(defender.breathReady, 0);

  const other = gameFor();
  other.emitOnePieceEvent({ type: "cardCancelled", sourceId: "p0", targetId: "p1", card: { ...cardDefinitions.attack, uid: "cancelled-attack" } });
  assert.equal(other.player("p0").breathReady, 0);
});

test("虚拟攻击与招牌技的伤害不生成呼吸态", () => {
  for (const origin of ["active", "signature"]) {
    const game = gameFor();
    game.player("p1").hp = 3;
    game.beginAttack({ sourceId: "p0", targetId: "p1", origin });
    assert.equal(game.player("p1").hp, 2);
    assert.equal(game.player("p0").breathReady, 0, origin);
  }
});

test("呼吸态每轮最多获得一次且不刷新期限，到下一次本人回合结束清除", () => {
  const game = gameFor();
  game.player("p0").hand = [{ ...cardDefinitions.attack, uid: "first-attack" }, { ...cardDefinitions.attack, uid: "second-attack" }];
  game.player("p1").hp = 4;
  game.playCard("p0", "first-attack", "p1");
  const player = game.player("p0"), acquiredTurn = player.breathSetTurn;
  assert.equal(player.breathReady, 1);
  game.playCard("p0", "second-attack", "p1", { freeUse: true });
  assert.equal(player.breathSetTurn, acquiredTurn);
  game.emitOnePieceEvent({ type: "turnEnd", sourceId: "p0" });
  assert.equal(player.breathReady, 1);
  game.turnNumber += 4;
  game.emitOnePieceEvent({ type: "turnEnd", sourceId: "p0" });
  assert.equal(player.breathReady, 0);
});

test("退场立即清除呼吸态", () => {
  const game = gameFor();
  game.player("p0").hand = [{ ...cardDefinitions.attack, uid: "exit-attack" }];
  game.playCard("p0", "exit-attack", "p1");
  const player = game.player("p0");
  assert.equal(player.breathReady, 1);
  game.eliminate("p0", "p1");
  assert.equal(player.breathReady, 0);
});
