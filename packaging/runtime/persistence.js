import { GameEngine } from "../../src/engine.js";

export const SAVE_KEY = "anime-kill.saved-match.v2";
export const SAVE_SCHEMA_VERSION = 2;
export const APP_VERSION = "0.2.0";

export function createSeededRandom(seed) {
  let value = Number(seed) >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function createRandomSeed() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] || 1;
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1;
}

export function defaultSaveStorage() {
  try { return typeof localStorage === "undefined" ? null : localStorage; }
  catch { return null; }
}

function cloneSerializable(value) {
  const seen = new WeakSet();
  return JSON.parse(JSON.stringify(value, (key, item) => {
    if (typeof item === "function" || key === "random" || key.endsWith("Resolver")) return undefined;
    if (item && typeof item === "object") {
      if (seen.has(item)) return undefined;
      seen.add(item);
    }
    return item;
  }));
}

function pendingKind(engine) {
  if (engine.pendingChoice) return "choice";
  if (engine.pendingDiscard) return "discard";
  if (engine.pendingResponse) return "response";
  return null;
}

export function stateDigest(engine) {
  return {
    round: engine.round,
    turnNumber: engine.turnNumber,
    phase: engine.phase,
    currentPlayerId: engine.currentPlayerId,
    pendingKind: pendingKind(engine),
    winner: engine.winner?.camp || null,
    deckCount: engine.deck.length,
    discardCount: engine.discard.length,
    playerState: engine.players.map(player => ({
      id: player.id,
      alive: player.alive,
      hp: player.hp,
      energy: player.energy,
      handCount: player.hand.length,
      plotCount: player.plots.length
    }))
  };
}

function commandChangedState(method, result) {
  if (result && typeof result === "object" && result.ok === false) return false;
  if (["endTurn", "advancePastEliminatedCurrent", "respond"].includes(method)) return result !== false;
  if (method === "aiStep") return Boolean(result?.acted);
  return true;
}

export class GameSession {
  constructor({ config, seed = createRandomSeed(), storage = defaultSaveStorage(), commands = [], ui = {} } = {}) {
    if (!config?.modeId || !config?.humanCharacterId) throw new Error("缺少对局配置");
    this.config = { modeId: config.modeId, humanCharacterId: config.humanCharacterId, ...(config.fixedAnchorSeat === undefined ? {} : { fixedAnchorSeat: config.fixedAnchorSeat }) };
    this.seed = Number(seed) >>> 0 || 1;
    this.storage = storage;
    this.commands = [];
    this.ui = { identityPredictions: [], ...ui };
    this.engine = new GameEngine({ ...this.config, random: createSeededRandom(this.seed) }).setup();
    this.replaying = false;
    if (commands.length) this.replay(commands);
  }

  execute(method, ...args) {
    if (!this.engine || typeof this.engine[method] !== "function") throw new Error(`未知游戏操作：${method}`);
    const safeArgs = cloneSerializable(args);
    const result = this.engine[method](...args);
    if (commandChangedState(method, result)) {
      this.commands.push({ method, args: safeArgs });
      if (!this.replaying) this.saveNow();
    }
    return result;
  }

  replay(commands) {
    this.replaying = true;
    try {
      for (const command of commands) {
        if (!command || typeof command.method !== "string" || !Array.isArray(command.args)) throw new Error("存档命令格式无效");
        const result = this.execute(command.method, ...command.args);
        if (!commandChangedState(command.method, result)) throw new Error(`无法重放操作：${command.method}`);
      }
    } finally {
      this.replaying = false;
    }
    this.engine.visualEvents = [];
  }

  updateUi(ui) {
    this.ui = { ...this.ui, ...cloneSerializable(ui) };
    return this.saveNow();
  }

  createSave() {
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      savedAt: new Date().toISOString(),
      format: "deterministic-command-journal",
      config: this.config,
      seed: this.seed,
      commands: cloneSerializable(this.commands),
      ui: cloneSerializable(this.ui),
      stateDigest: stateDigest(this.engine),
      engineState: cloneSerializable(this.engine)
    };
  }

  saveNow() {
    if (!this.storage) return { ok: false, reason: "当前环境不支持本地存档" };
    if (this.engine.winner) { this.clear(); return { ok: true, cleared: true }; }
    try {
      const save = this.createSave();
      this.storage.setItem(SAVE_KEY, JSON.stringify(save));
      return { ok: true, save };
    } catch (error) {
      return { ok: false, reason: error?.message || "写入存档失败" };
    }
  }

  clear() {
    try { this.storage?.removeItem(SAVE_KEY); }
    catch { /* 存储不可用时不阻断游戏。 */ }
  }
}

export function inspectSavedMatch(storage = defaultSaveStorage()) {
  if (!storage) return { exists: false, valid: false, reason: "当前环境不支持本地存档" };
  let raw;
  try { raw = storage.getItem(SAVE_KEY); }
  catch (error) { return { exists: false, valid: false, reason: error?.message || "无法读取存档" }; }
  if (!raw) return { exists: false, valid: false };
  try {
    const save = JSON.parse(raw);
    if (save.schemaVersion !== SAVE_SCHEMA_VERSION) throw new Error("存档版本与当前应用不兼容");
    if (!save.config?.modeId || !save.config?.humanCharacterId || !Number.isFinite(save.seed) || !Array.isArray(save.commands)) throw new Error("存档内容不完整");
    return { exists: true, valid: true, save };
  } catch (error) {
    return { exists: true, valid: false, reason: error?.message || "存档已损坏" };
  }
}

export function restoreSavedMatch(storage = defaultSaveStorage()) {
  const inspected = inspectSavedMatch(storage);
  if (!inspected.valid) throw new Error(inspected.reason || "没有可以继续的对局");
  const { save } = inspected;
  const session = new GameSession({ config: save.config, seed: save.seed, storage, commands: save.commands, ui: save.ui });
  if (save.stateDigest && JSON.stringify(save.stateDigest) !== JSON.stringify(stateDigest(session.engine))) throw new Error("存档校验失败，操作记录与状态不一致");
  return { session, save };
}

export function discardSavedMatch(storage = defaultSaveStorage()) {
  try { storage?.removeItem(SAVE_KEY); return true; }
  catch { return false; }
}
