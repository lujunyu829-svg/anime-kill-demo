const DEMON_PACK = "demon_slayer_sun_moon";
const SLAYER_IDS = new Set(["tanjiro", "zenitsu", "inosuke", "shinobu", "giyu", "rengoku", "mitsuri"]);
const DEMON_IDS = new Set([...SLAYER_IDS, "nezuko", "akaza", "muzan"]);

export function isDemonSlayerCharacter(value) {
  const id = typeof value === "string" ? value : value?.characterId || value?.id;
  return DEMON_IDS.has(id);
}

export function initializeDemonSlayerState(player, character) {
  if (character?.packId !== DEMON_PACK) return player;
  if (SLAYER_IDS.has(character.id)) {
    player.breathReady = 0;
    player.breathSetTurn = 0;
  }
  if (character.id === "nezuko") {
    player.bloodFlame = 0;
    player.bloodFlameSetTurn = 0;
  }
  if (character.id === "akaza") {
    player.compassTargetId = null;
    player.compassDefended = false;
  }
  if (character.id === "muzan") player.bloodMarkTargetId = null;
  return player;
}

export function gainBreathReady(game, playerId) {
  const player = game.player(playerId);
  if (!player?.alive || !SLAYER_IDS.has(player.characterId) || player.roundFlags.breathGained) return false;
  player.roundFlags.breathGained = true;
  if (player.breathReady) return false;
  player.breathReady = 1;
  player.breathSetTurn = game.turnNumber;
  game.log("event", `${game.nameOf(player)}进入呼吸态`);
  return true;
}

export function consumeBreathReady(game, playerId) {
  const player = game.player(playerId);
  if (!player?.alive || !player.breathReady) return false;
  player.breathReady = 0;
  player.breathSetTurn = 0;
  return true;
}

export function getDemonSlayerActiveTargets() { return []; }
export function useDemonSlayerActive() { return { ok: false, reason: "技能尚未开放" }; }
export function getDemonSlayerSignatureTargets() { return []; }
export function useDemonSlayerSignature() { return { ok: false, reason: "技能尚未开放" }; }

export function handleDemonSlayerEvent(game, event) {
  if (event.type === "damageApplied" && event.ordinaryAttack && event.actualHpLoss > 0) gainBreathReady(game, event.sourceId);
  if (event.type === "attackFullyDefended" && event.ordinaryAttack && event.paidGuards >= event.requiredGuards && event.requiredGuards > 0) gainBreathReady(game, event.targetId);
  if (event.type === "turnEnd") {
    const player = game.player(event.playerId || event.sourceId);
    if (player?.breathReady && player.breathSetTurn < game.turnNumber) consumeBreathReady(game, player.id);
  }
  if (event.type === "playerEliminated") {
    const player = game.player(event.playerId || event.targetId);
    if (!player) return;
    if (SLAYER_IDS.has(player.characterId)) { player.breathReady = 0; player.breathSetTurn = 0; }
    if (player.characterId === "nezuko") { player.bloodFlame = 0; player.bloodFlameSetTurn = 0; }
    if (player.characterId === "akaza") { player.compassTargetId = null; player.compassDefended = false; }
    if (player.characterId === "muzan") player.bloodMarkTargetId = null;
  }
}
