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
  if (character.id === "inosuke") { player.rageTargetId = null; player.rageSetTurn = 0; }
  if (character.id === "rengoku") player.flameGuard = null;
  if (character.id === "nezuko") {
    player.bloodFlame = 0;
    player.bloodFlameSetTurn = 0;
    player.nezukoRegenPromptTurn = 0;
  }
  if (character.id === "akaza") {
    player.compassTargetId = null;
    player.compassDefended = false;
    player.compassSetTurn = 0;
  }
  if (character.id === "muzan") { player.bloodMarkTargetId = null; player.bloodMarkSetTurn = 0; }
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

export function gainBloodFlame(game, playerId) {
  const player = game.player(playerId);
  if (!player?.alive || player.characterId !== "nezuko" || player.roundFlags.bloodFlameGained) return false;
  player.roundFlags.bloodFlameGained = true;
  if (player.bloodFlame) return false;
  player.bloodFlame = 1;
  player.bloodFlameSetTurn = game.turnNumber;
  return true;
}

function attackTargets(game, playerId, range = 2) {
  return game.players.filter(target => target.alive && target.id !== playerId && (game.mode.id === "classic8" || !game.isAlly(playerId, target.id)) && game.distance(playerId, target.id) <= range).map(target => target.id);
}

export function scoreDemonSlayerActive(game, playerId, targetId, skill) {
  const player = game.player(playerId), target = game.player(targetId);
  if (!player?.alive || !target?.alive || !skill) return -Infinity;
  const ally = game.aiIsAlly(playerId, targetId);
  const danger = (target.maxHp - target.hp) * 18 + (target.hp <= 2 ? 25 : 0) + target.poison * 8 - target.shield * 8;
  const pressure = 65 - target.hp * 7 - target.shield * 6 - target.hand.length * 2;
  if (skill.effect === "chargeThunder") return player.hand.length && !player.breathReady && player.shield < 3 ? 45 : -Infinity;
  if (skill.effect === "stillWaterGuard") return ally && !target.stillWaterGuard && (target.hp < target.maxHp || target.shield < 2) ? 35 + danger : -Infinity;
  if (skill.effect === "flameGuard") return ally && target.id !== playerId && player.hp > 1 && !target.flameGuard && (target.hp < target.maxHp || target.shield < 2) ? 35 + danger : -Infinity;
  if (skill.effect === "protectiveInstinct") return ally && player.hand.some(card => card.type === "basic") && !target.nezukoAid && (target.hp < target.maxHp || target.shield < 2) ? 35 + danger : -Infinity;
  if (skill.effect === "flexibleBond") return ally && player.hand.some(card => card.type === "basic") ? 35 + danger - target.hand.length * 2 : -Infinity;
  if (skill.effect === "wisteriaMix") return target.poison > 0 ? (ally ? 75 + danger : 35 + pressure) : -Infinity;
  if (ally) return -Infinity;
  if (skill.effect === "scentPursuit") return player.scentTargetId === targetId ? -Infinity : 35 + pressure;
  if (skill.effect === "compassNeedle") return player.compassTargetId === targetId ? -Infinity : 35 + pressure;
  if (skill.effect === "bloodBrand") return player.bloodMarkTargetId === targetId ? -Infinity : 35 + pressure + (target.hand.length === 0 ? 20 : 0);
  return 35 + pressure;
}

export function scoreDemonSlayerSignature(game, playerId, targetId) {
  const player = game.player(playerId), target = game.player(targetId);
  if (!player?.alive || !target?.alive) return -Infinity;
  if (player.characterId === "giyu") return game.aiIsAlly(playerId, targetId) && !target.deadCalm && (target.hp < target.maxHp || target.shield < 2) ? 85 + (target.maxHp - target.hp) * 18 - target.shield * 8 : -Infinity;
  if (game.aiIsAlly(playerId, targetId) || (player.characterId === "rengoku" && player.hp <= 1)) return -Infinity;
  return 110 - target.hp * 7 - target.shield * 6 - target.hand.length * 2 + (player.characterId === "akaza" && player.compassDefended ? 15 : 0);
}

export function getDemonSlayerActiveTargets(game, playerId, skill) {
  const player = game.player(playerId);
  if (!player?.alive || player.turnFlags.activeUsed || player.energy < (skill.cost || 0)) return [];
  if (skill.effect === "scentPursuit") return attackTargets(game, playerId);
  if (skill.effect === "stillWaterGuard") return game.players.filter(target => target.alive && (target.id === playerId || (game.distance(playerId, target.id) <= 1 && (game.mode.id === "classic8" || game.isAlly(playerId, target.id))))).map(target => target.id);
  if (skill.effect === "compassNeedle") return attackTargets(game, playerId);
  if (skill.effect === "chargeThunder") return player.hand.length && !player.turnFlags.ordinaryAttackUsed ? [playerId] : [];
  if (skill.effect === "boarRush") return attackTargets(game, playerId, 1);
  if (skill.effect === "wisteriaMix") return game.players.filter(target => target.alive && target.poison > 0 && game.distance(playerId, target.id) <= 2).map(target => target.id);
  if (skill.effect === "flameGuard") return game.players.filter(target => target.alive && target.id !== playerId && game.distance(playerId, target.id) <= 2 && (game.mode.id === "classic8" || game.isAlly(playerId, target.id))).map(target => target.id);
  if (skill.effect === "flexibleBond") return player.hand.some(card => card.type === "basic") ? game.players.filter(target => target.alive && target.id !== playerId && game.distance(playerId, target.id) <= 2 && (game.mode.id === "classic8" || game.isAlly(playerId, target.id))).map(target => target.id) : [];
  if (skill.effect === "protectiveInstinct") return game.players.filter(target => target.alive && target.id !== playerId && game.distance(playerId, target.id) <= 2 && (game.mode.id === "classic8" || game.isAlly(playerId, target.id))).map(target => target.id);
  if (skill.effect === "bloodBrand") return attackTargets(game, playerId);
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
  if (skill.effect === "chargeThunder") return game.requestDiscard(playerId, 1, {
    reason: "蓄雷：请选择1张手牌弃置",
    onComplete: () => {
      gainBreathReady(game, playerId);
      game.gainShield(playerId, 1, playerId);
      game.forceEndPlayPhase(playerId);
    }
  });
  if (skill.effect === "boarRush") return game.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 1, origin: "boarRush" });
  if (skill.effect === "wisteriaMix") return game.requestChoice(playerId, {
    title: "藤花调剂",
    text: "移除目标1层毒，并选择净化或催毒。",
    options: [{ value: "cleanse", label: "净化：获得1护盾" }, { value: "catalyze", label: "催毒：失去1体力" }],
    aiChoice: game.aiIsAlly(playerId, targetId) ? "cleanse" : "catalyze",
    onResolve: choice => {
      if (!target.alive || target.poison <= 0) return;
      target.poison -= 1;
      if (choice === "cleanse") game.gainShield(targetId, 1, playerId);
      else game.loseHp(targetId, 1, playerId, "wisteriaMix");
    }
  });
  if (skill.effect === "flameGuard") {
    target.flameGuard = { ownerId: playerId, setTurn: game.turnNumber };
    return { ok: true };
  }
  if (skill.effect === "flexibleBond") return game.requestChoice(playerId, {
    title: "柔韧连携：选择基础牌",
    options: player.hand.filter(card => card.type === "basic").map(card => ({ value: card.uid, label: `交出【${card.name}】` })),
    aiChoice: player.hand.find(card => card.type === "basic")?.uid,
    onResolve: uid => {
      const index = player.hand.findIndex(card => card.uid === uid && card.type === "basic");
      if (index < 0 || !target.alive) return;
      const [card] = player.hand.splice(index, 1);
      card._mitsuriGift = { ownerId: playerId, recipientId: targetId, setTurn: game.turnNumber };
      target.hand.push(card);
      game.emitOnePieceEvent({ type: "cardTransferred", sourceId: playerId, targetId, card, amount: 1 });
    }
  });
  if (skill.effect === "protectiveInstinct") {
    target.nezukoAid = { ownerId: playerId, setTurn: game.turnNumber };
    return { ok: true };
  }
  if (skill.effect === "bloodBrand") {
    const accept = () => { player.bloodMarkTargetId = targetId; player.bloodMarkSetTurn = game.turnNumber; };
    if (!target.hand.length) { accept(); return { ok: true }; }
    return game.requestChoice(targetId, {
      title: "血液烙印",
      text: "可弃置一张手牌拒绝血印，否则接受。",
      options: [{ value: "accept", label: "接受血印" }, { value: "discard", label: "弃1手牌拒绝" }],
      aiChoice: target.hand.length <= 1 ? "accept" : "discard",
      onResolve: choice => choice === "discard" && target.hand.length
        ? game.requestDiscard(targetId, 1, { reason: "拒绝血印：请选择1张手牌弃置" })
        : accept()
    });
  }
  return { ok: true };
}

export function getDemonSlayerSignatureTargets(game, playerId) {
  const player = game.player(playerId);
  if (!player?.alive) return [];
  if (player.characterId === "tanjiro") return attackTargets(game, playerId);
  if (player.characterId === "giyu") return game.players.filter(target => target.alive && (target.id === playerId || (game.distance(playerId, target.id) <= 1 && (game.mode.id === "classic8" || game.isAlly(playerId, target.id))))).map(target => target.id);
  if (player.characterId === "akaza") return player.compassTargetId && game.player(player.compassTargetId)?.alive ? [player.compassTargetId] : [];
  if (player.characterId === "zenitsu") return attackTargets(game, playerId, 99);
  if (["inosuke", "shinobu"].includes(player.characterId)) return attackTargets(game, playerId);
  if (["rengoku", "mitsuri"].includes(player.characterId)) return attackTargets(game, playerId);
  if (["nezuko", "muzan"].includes(player.characterId)) return attackTargets(game, playerId);
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
  if (player.characterId === "zenitsu") {
    const attack = boost => game.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: boost ? 3 : 2, origin: "thunderSixfold", skipIntervene: boost });
    if (!player.breathReady) return attack(false);
    return game.requestChoice(playerId, {
      title: "霹雳一闪·六连",
      options: [{ value: "use", label: "消耗呼吸态：三防且不可介入" }, { value: "pass", label: "保留呼吸态" }],
      aiChoice: "use",
      onResolve: choice => attack(choice === "use" && consumeBreathReady(game, playerId))
    });
  }
  if (player.characterId === "inosuke") {
    const attack = boost => {
      const second = () => {
        if (player.alive && game.player(targetId)?.alive) game.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: boost ? 2 : 1, origin: "beastRend" });
      };
      return game.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 1, origin: "beastRend", onComplete: second });
    };
    if (!player.breathReady) return attack(false);
    return game.requestChoice(playerId, {
      title: "兽之呼吸·乱裂",
      options: [{ value: "use", label: "消耗呼吸态强化第二段" }, { value: "pass", label: "保留呼吸态" }],
      aiChoice: "use",
      onResolve: choice => attack(choice === "use" && consumeBreathReady(game, playerId))
    });
  }
  if (player.characterId === "shinobu") {
    const attack = boost => game.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 2, origin: boost ? "centipedeDanceBoost" : "centipedeDance", alwaysPoison: true });
    if (!player.breathReady) return attack(false);
    return game.requestChoice(playerId, {
      title: "蜈蚣之舞",
      options: [{ value: "use", label: "消耗呼吸态，施加2层毒" }, { value: "pass", label: "保留呼吸态，施加1层毒" }],
      aiChoice: "use",
      onResolve: choice => attack(choice === "use" && consumeBreathReady(game, playerId))
    });
  }
  if (player.characterId === "rengoku") {
    const attack = boost => game.beginAttack({ sourceId: playerId, targetId, damage: boost ? 3 : 2, requiredGuards: 2, origin: "flamePillar", onComplete: () => { if (player.alive) game.loseHp(playerId, 1, null, "flamePillar"); } });
    if (!player.breathReady) return attack(false);
    return game.requestChoice(playerId, {
      title: "玖之型·炼狱",
      options: [{ value: "use", label: "消耗呼吸态：伤害+1" }, { value: "pass", label: "保留呼吸态" }],
      aiChoice: "use",
      onResolve: choice => attack(choice === "use" && consumeBreathReady(game, playerId))
    });
  }
  if (player.characterId === "mitsuri") {
    const ownAttack = () => {
      const attack = boost => game.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: boost ? 2 : 1, origin: "loveBloom" });
      if (!player.breathReady) return attack(false);
      return game.requestChoice(playerId, {
        title: "恋之呼吸·摇曳花影",
        options: [{ value: "use", label: "消耗呼吸态：额外需要1张防御" }, { value: "pass", label: "保留呼吸态" }],
        aiChoice: "use",
        onResolve: choice => attack(choice === "use" && consumeBreathReady(game, playerId))
      });
    };
    const collaborators = game.players.filter(target => target.alive && target.id !== playerId && target.id !== targetId && (game.mode.id === "classic8" || game.isAlly(playerId, target.id)));
    if (!collaborators.length) return ownAttack();
    return game.requestChoice(playerId, {
      title: "恋之呼吸·协作者",
      options: [{ value: "pass", label: "独自完成攻击" }, ...collaborators.map(target => ({ value: target.id, label: `邀请${game.nameOf(target)}` }))],
      aiChoice: collaborators.find(target => game.aiIsAlly(playerId, target.id) && target.hand.length > 0)?.id || "pass",
      onResolve: collaboratorId => {
        const collaborator = game.player(collaboratorId);
        if (!collaborator?.alive || collaboratorId === "pass") return ownAttack();
        const attacks = collaborator.hand.filter(card => card.id === "attack" && game.getCardTargets(collaboratorId, card).includes(targetId));
        if (!attacks.length) return ownAttack();
        game.requestChoice(collaboratorId, {
          title: "恋之呼吸：协同突击",
          options: [{ value: "pass", label: "放弃协同" }, ...attacks.map(card => ({ value: card.uid, label: `打出【${card.name}】` }))],
          aiChoice: game.aiIsAlly(collaboratorId, playerId) ? attacks[0].uid : "pass",
          onResolve: uid => {
            if (uid === "pass") return ownAttack();
            const result = game.playCard(collaboratorId, uid, targetId, { freeUse: true, onComplete: ownAttack });
            if (result.ok === false) ownAttack();
          }
        });
      }
    });
  }
  if (player.characterId === "nezuko") {
    const support = () => game.requestChoice(playerId, {
      title: "爆血印",
      options: [{ value: "use", label: "消耗爆血印，净化并授予护盾" }, { value: "pass", label: "保留爆血印" }],
      aiChoice: "use",
      onResolve: choice => {
        if (choice !== "use" || !player.bloodFlame) return;
        player.bloodFlame = 0;
        player.bloodFlameSetTurn = 0;
        const options = game.players.filter(target => target.alive && game.distance(playerId, target.id) <= 2).flatMap(target => {
          const statuses = [...(target.poison ? ["poison"] : []), ...(target.energyLocked ? ["energy"] : []), ...(target.signatureLocked ? ["signature"] : [])];
          return (statuses.length ? statuses : ["none"]).map(status => ({ value: `${target.id}:${status}`, label: `${game.nameOf(target)}：${status === "none" ? "获得护盾" : `清除${status}并获得护盾`}` }));
        });
        game.requestChoice(playerId, {
          title: "爆血净化", options,
          aiChoice: [...options].filter(option => game.aiIsAlly(playerId, option.value.split(":")[0])).sort((a, b) => {
            const value = option => game.aiTargetScore(playerId, option.value.split(":")[0], "support") + (option.value.endsWith(":none") ? 0 : 30);
            return value(b) - value(a);
          })[0]?.value || options[0]?.value,
          onResolve: value => {
            const [recipientId, status] = String(value).split(":");
            const recipient = game.player(recipientId);
            if (!recipient?.alive) return;
            if (status === "poison") recipient.poison = Math.max(0, recipient.poison - 1);
            if (status === "energy") recipient.energyLocked = false;
            if (status === "signature") recipient.signatureLocked = 0;
            game.gainShield(recipientId, 1, playerId);
          }
        });
      }
    });
    return game.dealDamage(playerId, targetId, 1, "strategy", () => {
      if (game.player(targetId)?.alive) game.applyPoison(targetId, 1);
      if (player.alive && player.bloodFlame) support();
    }) || { ok: true, pending: Boolean(game.pendingChoice || game.pendingResponse || game.pendingDiscard) };
  }
  if (player.characterId === "muzan") {
    const resolve = secondId => {
      const targets = [targetId, ...(secondId && secondId !== "pass" ? [secondId] : [])].sort((a, b) => game.player(a).seat - game.player(b).seat);
      const step = index => {
        if (game.winner || index >= targets.length) return;
        const victim = game.player(targets[index]);
        if (!victim?.alive) return step(index + 1);
        const required = 1 + (player.bloodMarkTargetId === victim.id ? 1 : 0);
        const complete = () => { if (player.bloodMarkTargetId === victim.id) { player.bloodMarkTargetId = null; player.bloodMarkSetTurn = 0; } step(index + 1); };
        if (game.guardResources(victim.id) >= required) {
          if (victim.human) { game.pendingResponse = { type: "fleshWhipGuard", sourceId: playerId, targetId: victim.id, required, onComplete: complete }; return; }
          game.spendGuards(victim.id, required);
          return complete();
        }
        game.dealDamage(playerId, victim.id, 1, "strategy", complete);
      };
      step(0);
    };
    const second = attackTargets(game, playerId).filter(id => id !== targetId);
    if (!second.length) { resolve("pass"); return { ok: true, pending: Boolean(game.pendingResponse || game.pendingChoice || game.pendingDiscard) }; }
    return game.requestChoice(playerId, {
      title: "肉鞭乱舞：第二目标",
      options: [{ value: "pass", label: "只攻击首个目标" }, ...second.map(id => ({ value: id, label: game.nameOf(id) }))],
      aiChoice: second[0], onResolve: resolve
    });
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
  if (event.type === "cardTransferred" && event.card?._mitsuriGift?.recipientId === event.sourceId) delete event.card._mitsuriGift;
  if (event.type === "cardResolved" && event.card && !event.card.responseOnly) {
    for (const owner of game.players.filter(item => item.alive && item.characterId === "muzan" && item.bloodMarkTargetId === event.sourceId)) {
      owner.bloodMarkTargetId = null;
      owner.bloodMarkSetTurn = 0;
      if (game.player(event.sourceId)?.alive) game.applyPoison(event.sourceId, 1);
    }
  }
  if (event.type === "damageApplied" && event.ordinaryAttack && event.actualHpLoss > 0) gainBreathReady(game, event.sourceId);
  if (event.type === "attackFullyDefended" && event.ordinaryAttack && event.paidGuards >= event.requiredGuards && event.requiredGuards > 0) gainBreathReady(game, event.targetId);
  if (event.type === "attackFullyDefended" && event.ordinaryAttack) {
    const source = game.player(event.sourceId);
    const defender = game.player(event.targetId);
    const aidOwner = defender?.turnFlags.nezukoAidConsumedBy;
    if (aidOwner) { defender.turnFlags.nezukoAidConsumedBy = null; gainBloodFlame(game, aidOwner); }
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
    const source = game.player(event.sourceId);
    if (target?.alive && target.characterId === "nezuko" && event.actualHpLoss > 0) gainBloodFlame(game, target.id);
    if (target?.alive && target.characterId === "muzan" && event.actualHpLoss > 0 && !target.roundFlags.fleshRegen) {
      target.roundFlags.fleshRegen = true;
      game.gainShield(target.id, 1, target.id);
    }
    if (source?.characterId === "shinobu" && event.ordinaryAttack && event.actualHpLoss > 0 && !source.turnFlags.poisonBlade) {
      source.turnFlags.poisonBlade = true;
      game.applyPoison(event.targetId, 1);
    }
    if (event.ordinaryAttack && event.actualHpLoss > 0 && event.cardUid) {
      const gift = game.activeCardContext?.card?.uid === event.cardUid ? game.activeCardContext.card._mitsuriGift : null;
      if (gift?.recipientId === event.sourceId) gainBreathReady(game, gift.ownerId);
    }
    if (target?.characterId === "inosuke" && source?.alive && source.id !== target.id && event.actualHpLoss > 0 && !target.roundFlags.rageMarked) {
      target.roundFlags.rageMarked = true;
      target.rageTargetId = source.id;
      target.rageSetTurn = game.turnNumber;
    }
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
    if (player?.characterId === "inosuke" && player.rageTargetId && player.rageSetTurn < game.turnNumber) { player.rageTargetId = null; player.rageSetTurn = 0; }
    if (player?.characterId === "rengoku") for (const target of game.players) if (target.flameGuard?.ownerId === player.id && target.flameGuard.setTurn < game.turnNumber) target.flameGuard = null;
    if (player?.characterId === "mitsuri") for (const target of game.players) for (const card of target.hand) if (card._mitsuriGift?.ownerId === player.id && card._mitsuriGift.setTurn < game.turnNumber) delete card._mitsuriGift;
    if (player?.characterId === "nezuko") for (const target of game.players) if (target.nezukoAid?.ownerId === player.id && target.nezukoAid.setTurn < game.turnNumber) target.nezukoAid = null;
    if (player?.characterId === "muzan" && player.bloodMarkSetTurn < game.turnNumber) { player.bloodMarkTargetId = null; player.bloodMarkSetTurn = 0; }
  }
  if (event.type === "turnEnd") {
    const player = game.player(event.playerId || event.sourceId);
    if (player?.breathReady && player.breathSetTurn < game.turnNumber) consumeBreathReady(game, player.id);
    if (player?.characterId === "nezuko" && player.bloodFlame && player.bloodFlameSetTurn < game.turnNumber) { player.bloodFlame = 0; player.bloodFlameSetTurn = 0; }
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
    for (const owner of game.players.filter(item => item.characterId === "inosuke" && (item.id === player.id || item.rageTargetId === player.id))) { owner.rageTargetId = null; owner.rageSetTurn = 0; }
    for (const target of game.players) {
      if (target.flameGuard?.ownerId === player.id || target.id === player.id) target.flameGuard = null;
      for (const card of target.hand) if (card._mitsuriGift?.ownerId === player.id || target.id === player.id) delete card._mitsuriGift;
    }
    for (const owner of game.players.filter(item => item.characterId === "akaza" && item.compassTargetId === player.id)) { owner.compassTargetId = null; owner.compassDefended = false; owner.compassSetTurn = 0; }
    for (const target of game.players) {
      if (target.stillWaterGuard?.ownerId === player.id || target.id === player.id) target.stillWaterGuard = null;
      if (target.deadCalm?.ownerId === player.id || target.id === player.id) target.deadCalm = null;
    }
    if (player.characterId === "muzan") player.bloodMarkTargetId = null;
    for (const owner of game.players.filter(item => item.characterId === "muzan" && item.bloodMarkTargetId === player.id)) { owner.bloodMarkTargetId = null; owner.bloodMarkSetTurn = 0; }
    for (const target of game.players) if (target.nezukoAid?.ownerId === player.id || target.id === player.id) target.nezukoAid = null;
  }
}
