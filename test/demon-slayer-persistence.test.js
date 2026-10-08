import test from "node:test";
import assert from "node:assert/strict";
import { GameSession, restoreSavedMatch } from "../packaging/runtime/persistence.js";

class Storage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

function create(characterId) {
  return new GameSession({ config: { modeId: "ranked2v2", humanCharacterId: characterId, fixedAnchorSeat: 0 }, seed: 114, storage: new Storage() });
}

function restore(session) {
  assert.equal(session.saveNow().ok, true);
  const copy = restoreSavedMatch(session.storage).session;
  assert.ok(copy);
  assert.equal(copy.engine.pendingChoice?.title, session.engine.pendingChoice?.title);
  return copy;
}

test("祢豆子爆血的净化多步选择恢复后不会重复造成伤害", () => {
  let session = create("nezuko");
  session.execute("dealDamage", "p1", "p0", 1, "strategy");
  session.execute("gainEnergy", "p0", 3);
  const before = session.engine.player("p1").hp;
  session.execute("useSignature", "p0", "p1");
  assert.equal(session.engine.pendingChoice?.title, "爆血印");
  session = restore(session);
  assert.equal(session.engine.player("p1").hp, before - 1);
  session.execute("resolveChoice", "p0", "use");
  assert.equal(session.engine.pendingChoice?.title, "爆血净化");
  session = restore(session);
  session.execute("resolveChoice", "p0", "p0:none");
  assert.equal(session.engine.player("p1").hp, before - 1);
  assert.equal(session.engine.player("p0").shield, 1);
});

test("无惨双目标肉鞭恢复后按同一顺序结算且只扣一次费用", () => {
  let session = create("muzan");
  session.execute("gainEnergy", "p0", 4);
  session.execute("useSignature", "p0", "p1");
  assert.equal(session.engine.pendingChoice?.title, "肉鞭乱舞：第二目标");
  session = restore(session);
  const secondId = session.engine.pendingChoice.options.find(option => option.value !== "pass").value;
  session.execute("resolveChoice", "p0", secondId);
  const settled = {
    energy: session.engine.player("p0").energy,
    hp: session.engine.players.map(player => player.hp),
    signatureUses: session.engine.telemetry.signatureUses
  };
  session = restore(session);
  assert.equal(session.engine.player("p0").energy, settled.energy);
  assert.deepEqual(session.engine.players.map(player => player.hp), settled.hp);
  assert.equal(session.engine.telemetry.signatureUses, settled.signatureUses);
  assert.equal(session.engine.pendingChoice, null);
  assert.equal(session.engine.pendingResponse, null);
});

test("祢豆子援护选择与弃牌窗口分别恢复后只提供一次防御", () => {
  let session = create("nezuko");
  session.execute("gainEnergy", "p0", 1);
  assert.equal(session.execute("useActiveSkill", "p0", "p2").ok, true);
  session.execute("discardRandom", "p2", 4);
  session.execute("draw", "p1", 20);
  const attack = session.engine.player("p1").hand.find(card => card.id === "attack");
  assert.ok(attack);
  session.execute("playCard", "p1", attack.uid, "p2", { freeUse: true });
  assert.equal(session.engine.pendingChoice?.title, "护人本能");
  session = restore(session);
  session.execute("resolveChoice", "p0", "use");
  assert.equal(session.engine.pendingDiscard?.count, 1);
  session = restore(session);
  const cost = session.engine.pendingDiscard.allowedUids.find(uid => session.engine.player("p0").hand.find(card => card.uid === uid)?.type === "basic");
  assert.ok(cost);
  session.execute("confirmDiscard", "p0", [cost]);
  session = restore(session);
  assert.equal(session.engine.player("p2").hp, session.engine.player("p2").maxHp);
  assert.equal(session.engine.player("p0").bloodFlame, 1);
  assert.equal(session.engine.player("p2").nezukoAid, null);
  assert.equal(session.engine.pendingChoice, null);
  assert.equal(session.engine.pendingDiscard, null);
});

test("无惨血液烙印被拒绝时弃牌选择恢复，不重复扣能量或布置血印", () => {
  let session = new GameSession({ config: { modeId: "ranked2v2", humanCharacterId: "tanjiro", fixedAnchorSeat: 0 }, seed: 24, storage: new Storage() });
  assert.equal(session.engine.player("p1").characterId, "muzan");
  session.execute("startNextTurn");
  session.execute("gainEnergy", "p1", 1);
  assert.equal(session.execute("useActiveSkill", "p1", "p0").pending, true);
  assert.equal(session.engine.pendingChoice?.title, "血液烙印");
  session = restore(session);
  const energy = session.engine.player("p1").energy;
  session.execute("resolveChoice", "p0", "discard");
  assert.equal(session.engine.pendingDiscard?.count, 1);
  session = restore(session);
  session.execute("confirmDiscard", "p0", [session.engine.pendingDiscard.allowedUids[0]]);
  session = restore(session);
  assert.equal(session.engine.player("p1").energy, energy);
  assert.equal(session.engine.player("p1").bloodMarkTargetId, null);
  assert.equal(session.engine.pendingChoice, null);
  assert.equal(session.engine.pendingDiscard, null);
});

test("蜜璃协同选择恢复后只对共同目标结算一次", () => {
  let session = create("mitsuri");
  session.execute("gainEnergy", "p0", 3);
  assert.equal(session.execute("useSignature", "p0", "p1").pending, true);
  assert.equal(session.engine.pendingChoice?.title, "恋之呼吸·协作者");
  session = restore(session);
  session.execute("resolveChoice", "p0", "p2");
  const result = {
    hp: session.engine.player("p1").hp,
    energy: session.engine.player("p0").energy,
    signatureUses: session.engine.telemetry.signatureUses
  };
  session = restore(session);
  assert.equal(session.engine.player("p1").hp, result.hp);
  assert.equal(session.engine.player("p0").energy, result.energy);
  assert.equal(session.engine.telemetry.signatureUses, result.signatureUses);
  assert.equal(session.engine.pendingChoice, null);
  assert.equal(session.engine.pendingResponse, null);
});

test("伊之助乱裂两段响应各自恢复，防御和费用不重复结算", () => {
  let session = new GameSession({ config: { modeId: "ranked2v2", humanCharacterId: "tanjiro", fixedAnchorSeat: 0 }, seed: 27, storage: new Storage() });
  assert.equal(session.engine.player("p1").characterId, "inosuke");
  session.execute("draw", "p0", 20);
  assert.ok(session.engine.player("p0").hand.filter(card => card.id === "guard").length >= 2);
  session.execute("startNextTurn");
  session.execute("gainEnergy", "p1", 4);
  assert.equal(session.execute("useSignature", "p1", "p0").pending, true);
  assert.equal(session.engine.pendingResponse?.type, "guard");
  session = restore(session);
  session.execute("respond", true);
  assert.equal(session.engine.pendingResponse?.type, "guard");
  session = restore(session);
  session.execute("respond", true);
  session = restore(session);
  assert.equal(session.engine.player("p0").hp, session.engine.player("p0").maxHp);
  assert.equal(session.engine.player("p1").energy, 0);
  assert.equal(session.engine.telemetry.signatureUses, 1);
  assert.equal(session.engine.pendingResponse, null);
  assert.equal(session.engine.pendingChoice, null);
});
