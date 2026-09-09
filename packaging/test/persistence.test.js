import test from "node:test";
import assert from "node:assert/strict";
import { GameSession, SAVE_KEY, discardSavedMatch, inspectSavedMatch, restoreSavedMatch, stateDigest } from "../runtime/persistence.js";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test("初始对局可以序列化并确定性恢复", () => {
  const storage = new MemoryStorage();
  const session = new GameSession({ config: { modeId: "ranked2v2", humanCharacterId: "naruto" }, seed: 829, storage });
  assert.equal(session.saveNow().ok, true);
  const restored = restoreSavedMatch(storage).session;
  assert.deepEqual(stateDigest(restored.engine), stateDigest(session.engine));
  assert.deepEqual(restored.engine.players.map(player => player.hand.map(card => card.uid)), session.engine.players.map(player => player.hand.map(card => card.uid)));
});

test("选择窗口通过命令日志恢复其闭包续接逻辑", () => {
  const storage = new MemoryStorage();
  const session = new GameSession({ config: { modeId: "ranked2v2", humanCharacterId: "itachi", fixedAnchorSeat: 0 }, seed: 311, storage });
  const human = session.engine.players.find(player => player.human);
  const target = session.engine.players.find(player => player.alive && player.id !== human.id);
  const started = session.execute("useActiveSkill", human.id, target.id);
  assert.equal(started.pending, true);
  const restored = restoreSavedMatch(storage).session;
  assert.equal(restored.engine.pendingChoice?.title, session.engine.pendingChoice?.title);
  const option = restored.engine.pendingChoice.options[0].value;
  assert.equal(restored.execute("resolveChoice", human.id, option).ok, true);
  const restoredAgain = restoreSavedMatch(storage).session;
  assert.deepEqual(stateDigest(restoredAgain.engine), stateDigest(restored.engine));
});

test("损坏和旧版本存档不会阻止清理", () => {
  const storage = new MemoryStorage();
  storage.setItem(SAVE_KEY, "{broken");
  assert.equal(inspectSavedMatch(storage).valid, false);
  assert.throws(() => restoreSavedMatch(storage));
  assert.equal(discardSavedMatch(storage), true);
  assert.equal(inspectSavedMatch(storage).exists, false);
});
