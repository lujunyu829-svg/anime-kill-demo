import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine.js";
import { cardDefinitions as cards } from "../src/data.js";
const card = (id, uid = id) => ({ ...cards[id], uid });
function create(id) {
  const g = new GameEngine({ modeId: "ranked2v2", humanCharacterId: id, fixedAnchorSeat: 0, random: () => .25 }).setup();
  const p = g.player("p0"); p.human = false; p.energy = 4; p.hand = [card("focus"), card("attack"), card("weapon"), card("memory_exchange")];
  for (const t of g.players.slice(1)) { t.characterId = "mikasa"; t.hand = []; t.hp = t.maxHp = 8; t.roundFlags.substitute = true; }
  return g;
}
const active = {
  naruto: { target: "p0", cost: 1, check: g => assert.equal(g.getSpecialCards("p0", "clone").length, 1) },
  gaara: { target: "p1", cost: 0, check: g => assert.equal(g.player("p1").hp, 7) },
  sakura: { target: "p0", cost: 0, check: g => assert.equal(g.getSpecialCards("p0", "byakugo").length, 1) },
  shikamaru: { target: "p1", cost: 0, check: g => assert.ok(["p1", "p2", "p3"].includes(g.player("p0").chessTargetId)) },
  itachi: { target: "p1", cost: 0, check: g => assert.equal(g.player("p0").plots.filter(p => p.isFalse).length, 1) },
  sasuke: { target: "p1", cost: 0, setup: g => { for (const id of ["p1","p3"]) g.player(id).equipment.weapon = card("weapon", id + "-weapon"); }, check: g => assert.equal(g.player("p0").equipment.weapon?.id, "weapon") },
  kakashi: { target: "p0", cost: 1, setup: g => g.discard.push(card("attack", "discard-attack")), check: g => assert.equal(g.player("p0").hand.filter(c => c._copiedBy === "p0").length, 1) },
  hinata: { target: "p1", cost: 0, check: g => assert.ok(["p1","p3"].includes(g.player("p0").scoutedTargetId)) },
  jiraiya: { target: "p1", cost: 2, check: g => assert.ok(["p1","p3"].includes(g.player("p0").toadBindTargetId)) },
  orochimaru: { target: "p1", cost: 0, check: g => assert.equal(g.players.filter(p => p.curseSeal?.sourceId === "p0").length, 1) },
  luffy: { target: "p0", cost: 0, check: g => { assert.equal(g.player("p0").hp, 3); assert.equal(g.player("p0").attackLimit, 2); } },
  zoro: { target: "p0", cost: 0, check: g => assert.equal(g.player("p0").turnFlags.nextAttackBonus, true) },
  nami: { target: "p0", cost: 1, check: g => assert.equal(g.player("p0").navigationWind, true) },
  usopp: { target: "p1", cost: 1, check: g => assert.equal(g.player("p0").specialCards.filter(c => c.kind === "lie").length, 1) },
  sanji: { target: "p2", cost: 0, setup: g => { g.player("p2").hp = 6; }, check: g => assert.equal(g.player("p2").hp, 7) },
  chopper: { target: "p2", cost: 0, setup: g => { g.player("p2").hp = 6; }, check: g => assert.equal(g.player("p2").hp, 7) },
  robin: { target: "p1", cost: -1, setup: g => { for (const id of ["p1","p3"]) g.player(id).hand = [card("attack", id + "-hidden")]; }, check: g => assert.equal(g.players.reduce((n,p) => n + p.sealedCards.length, 0), 1) },
  franky: { target: "p0", cost: 1, setup: g => { g.player("p0").hand = [card("attack")]; g.discard.push(card("weapon", "scrap")); }, check: g => assert.ok(g.player("p0").hand.some(c => c.uid === "scrap")) },
  brook: { target: "p1", cost: 1, check: g => assert.equal(g.player("p0").dreamState.progress, 1) },
  jinbe: { target: "p2", cost: 0, setup: g => { g.player("p2").hp = 2; }, check: g => assert.equal(g.player("p2").shield, 1) }
};
for (const [id, row] of Object.entries(active)) {
  test(id + "主动技：合法目标、实际成本、效果及限次", () => {
    const g = create(id); row.setup?.(g);
    g.player("p0").energy = 2;
    assert.ok(g.getActiveSkillTargets("p0").includes(row.target));
    const before = g.player("p0").energy;
    assert.equal(g.useActiveSkill("p0", row.target).ok, true);
    row.check(g); assert.equal(g.player("p0").energy, before - row.cost);
    assert.equal(g.useActiveSkill("p0", row.target).ok, false);
    assert.equal(g.pendingChoice, null); assert.equal(g.pendingDiscard, null);
  });
  test(id + "AI主动技：可发动并产生合法有效结果", () => {
    const g = create(id); row.setup?.(g); g.player("p0").energy = 2;
    assert.equal(g.aiStep("p0").acted, true); assert.equal(g.telemetry.activeSkillUses, 1);
    row.check(g);
  });
}
const signatures = {
  naruto: { target: "p1", cost: 4, check: g => assert.equal(g.player("p1").hp, 6) },
  gaara: { target: "p1", cost: 4, check: g => { assert.equal(g.player("p1").hp, 7); assert.equal(g.player("p1").frozenDraw, 1); } },
  sakura: { target: "p0", cost: 3, check: g => assert.equal(g.player("p0").byakugoMode, true) },
  shikamaru: { target: "p1", cost: 3, setup: g => { g.player("p0").chessTargetId = "p1"; g.player("p1").hand = [card("focus","a"),card("focus","b")]; }, check: g => assert.equal(g.player("p1").hand.length, 0) },
  itachi: { target: "p1", cost: 4, setup: g => { const p = g.player("p0"); p.plots = [{ uid: "false", card: card("focus"), isFalse: true, ownerId: "p0", targetId: "p1", setTurn: g.turnNumber }]; g.player("p1").hand = [card("attack","sealed")]; }, check: g => { assert.equal(g.player("p1").sealedCards.length, 1); assert.equal(g.player("p1").hp, 7); } },
  sasuke: { target: "p1", cost: 4, setup: g => { g.player("p0").swapMarkedId = "p1"; }, check: g => { assert.equal(g.player("p1").hp, 6); assert.equal(g.player("p0").swapMarkedId, null); } },
  kakashi: { target: "p1", cost: 2, setup: g => { g.player("p0").hand = [{ ...card("attack"), _copiedBy: "p0", _ephemeral: true }]; }, check: g => { assert.equal(g.player("p1").hp, 6); assert.equal(g.player("p0").hand.length, 0); } },
  hinata: { target: "p1", cost: 4, setup: g => { g.player("p0").scoutedTargetId = "p1"; g.player("p1").energy = 4; }, check: g => { assert.equal(g.player("p1").hp, 7); assert.equal(g.player("p1").energy, 0); assert.equal(g.player("p1").energyLocked, true); } },
  jiraiya: { target: "p1", cost: 4, check: g => { assert.equal(g.player("p1").hp, 6); assert.equal(g.player("p3").hp, 7); } },
  orochimaru: { target: "p0", cost: 2, setup: g => { g.player("p0").hp = 2; g.player("p0").hand = [{ ...card("heal"), _curseSpoil: "p0" }]; }, check: g => { assert.equal(g.player("p0").hp, 3); assert.equal(g.player("p0").shield, 1); } },
  luffy: { target: "p0", cost: 4, check: g => { assert.equal(g.player("p0").hand.length, 6); assert.equal(g.player("p0").attackLimit, 2); } },
  zoro: { target: "p1", cost: 4, check: g => assert.equal(g.player("p1").hp, 6) },
  nami: { target: "p1", cost: 4, check: g => assert.equal(g.player("p1").hp, 6) },
  usopp: { target: "p1", cost: 3, check: g => assert.equal(g.player("p1").hp, 6) },
  sanji: { target: "p1", cost: 4, check: g => assert.equal(g.player("p1").hp, 6) },
  chopper: { target: "p0", cost: 4, check: g => { assert.equal(g.player("p0").shield, 2); assert.equal(g.player("p0").hand.length, 5); } },
  robin: { target: "p1", cost: 3, check: g => { assert.equal(g.player("p1").hp, 7); assert.equal(g.player("p3").hp, 7); assert.equal(g.player("p2").hp, 8); } },
  franky: { target: "p0", cost: 4, check: g => { assert.equal(g.player("p0").shield, 1); assert.equal(g.player("p0").hand.length, 6); } },
  brook: { target: "p1", cost: 4, check: g => { assert.equal(g.player("p1").hp, 6); assert.equal(g.player("p1").frozenDraw, 1); } },
  jinbe: { target: "p1", cost: 4, check: g => { assert.equal(g.player("p1").hp, 6); assert.equal(g.player("p0").shield, 1); } }
};
for (const [id, row] of Object.entries(signatures)) test(id + "招牌技：费用门槛、合法目标、AI发动与结算", () => {
  const g = create(id); row.setup?.(g); g.player("p0").turnFlags.activeUsed = true;
  assert.equal(g.signatureCost("p0"), row.cost);
  g.player("p0").energy = row.cost - 1;
  assert.equal(g.useSignature("p0", row.target).ok, false);
  assert.equal(g.telemetry.signatureUses, 0);
  g.player("p0").energy = row.cost;
  assert.ok(g.getSignatureTargets("p0").includes(row.target));
  assert.equal(g.aiStep("p0").acted, true); assert.equal(g.telemetry.signatureUses, 1);
  row.check(g); assert.equal(g.pendingResponse, null); assert.equal(g.pendingChoice, null); assert.equal(g.pendingDiscard, null);
});
test("弗兰奇残局缺少装备时AI仍会使用将军补装", () => {
  const g = create("franky"), p = g.player("p0");
  g.player("p2").alive = g.player("p3").alive = false;
  p.hand = []; p.turnFlags.activeUsed = true; g.discard.push(card("weapon"),card("armor"));
  assert.equal(g.aiStep("p0").acted, true); assert.equal(g.telemetry.signatureUses, 1);
  assert.equal(p.equipment.weapon?.id, "weapon"); assert.equal(p.equipment.armor?.id, "armor");
});
