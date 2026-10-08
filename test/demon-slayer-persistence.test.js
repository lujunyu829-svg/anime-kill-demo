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
