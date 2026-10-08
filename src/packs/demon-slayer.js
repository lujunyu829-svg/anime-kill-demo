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
  if (character.id === "tanjiro") {
    player.scentTargetId = null;
    player.scentCardName = null;
    player.scentSetTurn = 0;
  }
  if (character.id === "giyu") player.stillWaterGuard = null;
  if (character.id === "nezuko") {
    player.bloodFlame = 0;
    player.bloodFlameSetTurn = 0;
  }
  if (character.id === "akaza") {
    player.compassTargetId = null;
    player.compassDefended = false;
    player.compassSetTurn = 0;
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

function attackTargets(game, playerId, range = 2) {
  return game.players.filter(target => target.alive && target.id !== playerId && (game.mode.id === "classic8" || !game.isAlly(playerId, target.id)) && game.distance(playerId, target.id) <= range).map(target => target.id);
}

export function getDemonSlayerActiveTargets(game, playerId, skill) {
  const player = game.player(playerId);
  if (!player?.alive || player.turnFlags.activeUsed || player.energy < (skill.cost || 0)) return [];
  if (skill.effect === "scentPursuit") return attackTargets(game, playerId);
  if (skill.effect === "stillWaterGuard") return game.players.filter(target => target.alive && (target.id === playerId || (game.distance(playerId, target.id) <= 1 && (game.mode.id === "classic8" || game.isAlly(playerId, target.id))))).map(target => target.id);
  if (skill.effect === "compassNeedle") return attackTargets(game, playerId);
  return [];
}

export function useDemonSlayerActive(game, playerId, targetId, skill) {
  if (!getDemonSlayerActiveTargets(game, playerId, skill).includes(targetId)) return { ok: false, reason: "消耗不足或目标不合法" };
  const player = game.player(playerId), target = game.player(targetId);
  player.energy -= skill.cost || 0;
  player.turnFlags.activeUsed = true;
  if (skill.effect === "scentPursuit") {
    player.scentTargetId = targetId;
    player.scentSetTurn = game.turnNumber;
    const card = target.hand[Math.floor(game.random() * target.hand.length)];
    player.scentCardName = card?.name || null;
    game.log("event", `${game.nameOf(player)}以嗅觉追迹标记了${game.nameOf(target)}`);
  }
  if (skill.effect === "stillWaterGuard") {
    target.stillWaterGuard = { ownerId: playerId, setTurn: game.turnNumber };
    game.log("event", `${game.nameOf(player)}为${game.nameOf(target)}布置静水护形`);
  }
  if (skill.effect === "compassNeedle") {
    player.compassTargetId = targetId;
    player.compassDefended = false;
    player.compassSetTurn = game.turnNumber;
    game.log("event", `${game.nameOf(player)}以罗针锁定${game.nameOf(target)}`);
  }
  return { ok: true };
}

export function getDemonSlayerSignatureTargets(game, playerId) {
  const player = game.player(playerId);
  if (!player?.alive) return [];
  if (player.characterId === "tanjiro") return attackTargets(game, playerId);
  if (player.characterId === "giyu") return game.players.filter(target => target.alive && (target.id === playerId || (game.distance(playerId, target.id) <= 1 && (game.mode.id === "classic8" || game.isAlly(playerId, target.id))))).map(target => target.id);
  if (player.characterId === "akaza") return player.compassTargetId && game.player(player.compassTargetId)?.alive ? [player.compassTargetId] : [];
  return [];
}

export function useDemonSlayerSignature(game, playerId, targetId) {
  const player = game.player(playerId);
  if (!getDemonSlayerSignatureTargets(game, playerId).includes(targetId)) return { ok: false, reason: "目标不合法" };
  if (player.characterId === "giyu") {
    const place = strategy => {
      game.player(targetId).deadCalm = { ownerId: playerId, setTurn: game.turnNumber, strategy };
      return { ok: true };
    };
    if (!player.breathReady) return place(false);
    return game.requestChoice(playerId, {
      title: "拾壹之型·凪",
      options: [{ value: "use", label: "消耗呼吸态，可取消策略伤害" }, { value: "pass", label: "保留呼吸态" }],
      aiChoice: "use",
      onResolve: choice => place(choice === "use" && consumeBreathReady(game, playerId))
    });
  }
  if (player.characterId === "akaza") {
    const damage = 2 + (player.compassDefended ? 1 : 0);
    return game.beginAttack({ sourceId: playerId, targetId, damage, requiredGuards: 2, origin: "annihilationStyle", onComplete: () => { player.compassTargetId = null; player.compassDefended = false; player.compassSetTurn = 0; } });
  }
  if (player.characterId !== "tanjiro") return { ok: false, reason: "技能尚未开放" };
  const attack = pierce => game.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: pierce ? "hinokamiDancePierce" : "hinokamiDance" });
  if (!player.breathReady) return attack(false);
  return game.requestChoice(playerId, {
    title: "火之神神乐·圆舞",
    text: "可消耗呼吸态令此次强袭忽略防具。",
    options: [{ value: "use", label: "消耗呼吸态，忽略防具" }, { value: "pass", label: "保留呼吸态" }],
    aiChoice: "use",
    onResolve: choice => attack(choice === "use" && consumeBreathReady(game, playerId))
  });
}

export function handleDemonSlayerEvent(game, event) {
  if (event.type === "damageApplied" && event.ordinaryAttack && event.actualHpLoss > 0) gainBreathReady(game, event.sourceId);
  if (event.type === "attackFullyDefended" && event.ordinaryAttack && event.paidGuards >= event.requiredGuards && event.requiredGuards > 0) gainBreathReady(game, event.targetId);
  if (event.type === "attackFullyDefended" && event.ordinaryAttack) {
    const source = game.player(event.sourceId);
    const defender = game.player(event.targetId);
    if (defender?.characterId === "giyu" && !defender.roundFlags.stillHeart && event.paidGuards >= event.requiredGuards && event.requiredGuards > 0) {
      defender.roundFlags.stillHeart = true;
      game.gainEnergy(defender.id, 1);
    }
    if (defender?.characterId === "akaza" && defender.compassTargetId === event.sourceId && event.paidGuards >= event.requiredGuards && event.requiredGuards > 0) defender.compassDefended = true;
    if (source?.alive && source.characterId === "tanjiro" && !source.roundFlags.waterTriggered) {
      source.roundFlags.waterTriggered = true;
      if (source.hand.length && game.discard.some(card => card.uid === event.cardUid)) source.turnFlags.waterRecoveryUid = event.cardUid;
    }
  }
  if (event.type === "attackTargeted" && event.ordinaryAttack) {
    const target = game.player(event.targetId);
    if (target?.deadCalm) { event.cancelledById = target.deadCalm.ownerId; target.deadCalm = null; event.cancelled = true; }
  }
  if (event.type === "beforeDamage") {
    const target = game.player(event.targetId);
    if (event.origin === "attack" && target?.stillWaterGuard) {
      event.amount = Math.max(0, event.amount - 1);
      target.stillWaterGuard = null;
    }
    if (event.origin === "strategy" && target?.deadCalm?.strategy) {
      event.amount = 0;
      target.deadCalm = null;
    }
  }
  if (event.type === "damageApplied") {
    const target = game.player(event.targetId);
    if (target?.alive && target.characterId === "akaza" && target.compassTargetId === event.sourceId && event.actualHpLoss > 0 && !target.roundFlags.demonRegen) {
      target.roundFlags.demonRegen = true;
      game.gainShield(target.id, 1, target.id);
    }
  }
  if (event.type === "turnStart") {
    const player = game.player(event.playerId || event.sourceId);
    if (player?.characterId === "tanjiro" && player.scentTargetId && player.scentSetTurn < game.turnNumber) {
      player.scentTargetId = null;
      player.scentCardName = null;
      player.scentSetTurn = 0;
    }
    if (player?.characterId === "giyu") for (const target of game.players) {
      if (target.stillWaterGuard?.ownerId === player.id && target.stillWaterGuard.setTurn < game.turnNumber) target.stillWaterGuard = null;
      if (target.deadCalm?.ownerId === player.id && target.deadCalm.setTurn < game.turnNumber) target.deadCalm = null;
    }
    if (player?.characterId === "akaza" && player.compassSetTurn < game.turnNumber) {
      player.compassTargetId = null;
      player.compassDefended = false;
      player.compassSetTurn = 0;
    }
  }
  if (event.type === "turnEnd") {
    const player = game.player(event.playerId || event.sourceId);
    if (player?.breathReady && player.breathSetTurn < game.turnNumber) consumeBreathReady(game, player.id);
  }
  if (event.type === "playerEliminated") {
    const player = game.player(event.playerId || event.targetId);
    if (!player) return;
    if (SLAYER_IDS.has(player.characterId)) { player.breathReady = 0; player.breathSetTurn = 0; }
    for (const owner of game.players.filter(item => item.characterId === "tanjiro" && (item.id === player.id || item.scentTargetId === player.id))) {
      owner.scentTargetId = null;
      owner.scentCardName = null;
      owner.scentSetTurn = 0;
    }
    if (player.characterId === "nezuko") { player.bloodFlame = 0; player.bloodFlameSetTurn = 0; }
    if (player.characterId === "akaza") { player.compassTargetId = null; player.compassDefended = false; }
    for (const owner of game.players.filter(item => item.characterId === "akaza" && item.compassTargetId === player.id)) { owner.compassTargetId = null; owner.compassDefended = false; owner.compassSetTurn = 0; }
    for (const target of game.players) {
      if (target.stillWaterGuard?.ownerId === player.id || target.id === player.id) target.stillWaterGuard = null;
      if (target.deadCalm?.ownerId === player.id || target.id === player.id) target.deadCalm = null;
    }
    if (player.characterId === "muzan") player.bloodMarkTargetId = null;
  }
}
