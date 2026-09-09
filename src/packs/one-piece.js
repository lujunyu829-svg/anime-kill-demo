const ONE_PIECE_PACK = "one_piece_grand_line";
const ONE_PIECE_IDS = new Set(["luffy", "zoro", "nami", "usopp", "sanji", "chopper", "robin", "franky", "brook", "jinbe"]);

export function isOnePieceCharacter(value) {
  const id = typeof value === "string" ? value : value?.characterId || value?.id;
  return ONE_PIECE_IDS.has(id);
}

export function initializeOnePieceState(player, character) {
  if (!character || character.packId !== ONE_PIECE_PACK) return player;
  player.dreamState = { progress: 0, awakened: false, progressedRound: 0 };
  player.reviveUsed = false;
  player.navigationWind = false;
  return player;
}

function getPlayer(game, id) { return game.player(id); }
function enemies(game, sourceId, range = 2) {
  return game.players.filter(target => target.alive && target.id !== sourceId && (game.mode.id === "classic8" || !game.isAlly(sourceId, target.id)) && game.distance(sourceId, target.id) <= range).map(target => target.id);
}
function nonResponseCards(target) { return target.hand.filter(card => !card.responseOnly); }
function progress(game, targetId, reason) {
  const target = getPlayer(game, targetId), state = target?.dreamState;
  if (!target?.alive || !state || state.awakened || state.progressedRound === game.round) return false;
  state.progressedRound = game.round;
  state.progress += 1;
  game.log("event", game.nameOf(target) + "的梦想航迹推进至" + state.progress + "/3（" + reason + "）");
  if (state.progress >= 3) {
    state.progress = 3;
    state.awakened = true;
    game.log("event", game.nameOf(target) + "实现梦想「" + game.characterOf(target).dream.name + "」，立即觉醒");
  }
  return true;
}
function resetLie(game, owner) {
  for (const lie of [...owner.specialCards].filter(item => item.kind === "lie" && item.setTurn < game.turnNumber)) {
    const index = owner.specialCards.findIndex(item => item.uid === lie.uid);
    if (index >= 0) owner.specialCards.splice(index, 1);
    if (owner.alive) game.discard.push(lie.card);
    game.log("event", game.nameOf(owner) + "未触发的谎言弹到期");
  }
}

export function signatureCost(game, playerId) {
  const current = getPlayer(game, playerId), signature = game.characterOf(current)?.signature;
  if (!signature) return Infinity;
  return current.characterId === "zoro" && current.dreamState?.awakened ? 3 : signature.cost;
}

export function getOnePieceActiveTargets(game, playerId, skill) {
  const current = getPlayer(game, playerId);
  if (!current?.alive || !isOnePieceCharacter(current) || current.turnFlags.activeUsed) return [];
  if (skill.cost && current.energy < skill.cost) return [];
  const enemyIds = enemies(game, playerId);
  switch (skill.effect) {
    case "secondGear": return current.hp > 1 ? [playerId] : [];
    case "threeSwordStyle": return nonResponseCards(current).length ? [playerId] : [];
    case "navigation": return game.deck.length ? [playerId] : [];
    case "lieShot": return current.energy >= 1 && !current.specialCards.some(item => item.kind === "lie") && nonResponseCards(current).length ? enemyIds : [];
    case "allBlueKitchen": return current.hand.some(card => card.type === "strategy" || card.type === "equipment") ? game.players.filter(target => target.alive && target.id !== playerId && target.hp < target.maxHp && (game.mode.id === "classic8" || game.isAlly(playerId, target.id))).map(target => target.id) : [];
    case "medicine": return current.hand.some(card => card.type === "basic") ? game.players.filter(target => target.alive && target.id !== playerId && (game.mode.id === "classic8" || game.isAlly(playerId, target.id)) && (target.hp < target.maxHp || current.dreamState?.awakened && (target.poison || target.frozenDraw || target.energyLocked || target.signatureLocked))).map(target => target.id) : [];
    case "flowerSeizure": return enemyIds;
    case "workshop": return current.energy >= 1 && game.discard.some(card => card.type === "equipment") ? [playerId] : [];
    case "soulConcert": return current.roundFlags.soulConcertUsed ? [] : enemyIds;
    case "oceanGuard": return game.players.filter(target => target.alive && target.id !== playerId).map(target => target.id);
    default: return [];
  }
}

function choose(game, playerId, config) { return game.requestChoice(playerId, config); }

export function useOnePieceActive(game, playerId, targetId, skill) {
  const current = getPlayer(game, playerId);
  if (!current || !getOnePieceActiveTargets(game, playerId, skill).includes(targetId)) return { ok: false, reason: "消耗不足或目标不合法" };
  if (skill.cost) current.energy -= skill.cost;
  current.turnFlags.activeUsed = true;
  game.log("signature", game.nameOf(current) + "发动主动技「" + skill.name + "」");
  switch (skill.effect) {
    case "secondGear":
      game.loseHp(playerId, 1, null, "skill");
      if (current.alive) { game.draw(playerId, 2); current.attackLimit += 1; }
      return { ok: true };
    case "threeSwordStyle": {
      const cards = nonResponseCards(current);
      return choose(game, playerId, {
        title: "三刀流：选择弃牌",
        text: "下一次突击伤害+1且额外需要1张防御；若弃置装备牌则忽略防具。",
        options: cards.map(card => ({ value: card.uid, label: "弃置【" + card.name + "】", description: card.type === "equipment" ? "下一次突击忽略防具" : "下一次突击伤害+1" })),
        aiChoice: cards[0]?.uid,
        onResolve: uid => {
          const chosen = current.hand.find(card => card.uid === uid && !card.responseOnly);
          if (!chosen) return;
          game.removeCard(playerId, uid);
          current.turnFlags.nextAttackBonus = true;
          current.turnFlags.nextAttackRequiredGuard = (current.turnFlags.nextAttackRequiredGuard || 0) + 1;
          if (chosen.type === "equipment") current.turnFlags.nextAttackIgnoreArmor = true;
        }
      });
    }
    case "navigation": {
      const pickCount = current.dreamState?.awakened ? 2 : 1;
      const revealed = game.deck.splice(0, Math.min(current.dreamState?.awakened ? 4 : 3, game.deck.length));
      const picked = [];
      const finish = () => {
        current.hand.push(...picked);
        const rest = revealed.filter(card => !picked.some(item => item.uid === card.uid));
        const tops = [], bottoms = [];
        const placeNext = index => {
          if (index >= rest.length) {
            game.deck.unshift(...tops);
            game.deck.push(...bottoms);
            current.navigationWind = true;
            return;
          }
          const card = rest[index];
          return choose(game, playerId, {
            title: "航海术：安排剩余牌",
            text: "将【" + card.name + "】置于牌堆顶或牌堆底。",
            options: [{ value: "top", label: "置顶" }, { value: "bottom", label: "置底" }],
            aiChoice: index === 0 ? "top" : "bottom",
            onResolve: value => { if (value === "top") tops.push(card); else bottoms.push(card); placeNext(index + 1); }
          });
        };
        placeNext(0);
      };
      const choosePick = index => {
        if (index >= pickCount || picked.length >= revealed.length) return finish();
        const allAvailable = revealed.filter(card => !picked.some(item => item.uid === card.uid));
        const distinct = current.dreamState?.awakened && picked.length ? allAvailable.filter(card => !picked.some(item => item.type === card.type)) : allAvailable;
        const available = distinct.length ? distinct : allAvailable;
        return choose(game, playerId, {
          title: "航海术：选择第" + (index + 1) + "张牌",
          text: "从展示的" + revealed.length + "张牌中获得" + pickCount + "张。",
          options: available.map(card => ({ value: card.uid, label: "获得【" + card.name + "】", description: card.description })),
          aiChoice: available[0]?.uid,
          onResolve: uid => { const card = available.find(item => item.uid === uid); if (card) picked.push(card); choosePick(index + 1); }
        });
      };
      return choosePick(0);
    }
    case "lieShot": {
      const cards = nonResponseCards(current);
      return choose(game, playerId, {
        title: "谎言弹：选择暗置牌",
        text: "将一张牌暗置为谎言，目标为" + game.nameOf(targetId) + "。",
        options: cards.map(card => ({ value: card.uid, label: "暗置【" + card.name + "】" })),
        aiChoice: cards[0]?.uid,
        onResolve: uid => {
          const index = current.hand.findIndex(card => card.uid === uid && !card.responseOnly);
          if (index < 0) return;
          const [card] = current.hand.splice(index, 1);
          current.specialCards.push({ uid: "lie-" + card.uid, kind: "lie", card, targetId, setTurn: game.turnNumber });
          game.log("event", game.nameOf(current) + "向" + game.nameOf(targetId) + "布下未知谎言");
        }
      });
    }
    case "allBlueKitchen":
    case "medicine": {
      const allowed = skill.effect === "medicine" ? current.hand.filter(card => card.type === "basic").map(card => card.uid) : current.hand.filter(card => card.type === "strategy" || card.type === "equipment").map(card => card.uid);
      return game.requestDiscard(playerId, 1, {
        reason: skill.effect === "medicine" ? "医术：请选择1张基础牌弃置" : "海上餐厅：请选择1张策略牌或装备牌弃置",
        allowedUids: allowed,
        shouldLog: false,
        onComplete: () => {
          const target = getPlayer(game, targetId);
          if (!target?.alive) return;
          game.resolveHeal(playerId, targetId);
          if (skill.effect === "allBlueKitchen" && current.dreamState?.awakened) game.draw(targetId, 1);
          if (skill.effect === "medicine" && current.dreamState?.awakened) {
            target.poison = 0; target.frozenDraw = 0; target.energyLocked = false; target.signatureLocked = 0;
          }
        }
      });
    }
    case "flowerSeizure": {
      const target = getPlayer(game, targetId), cards = target.hand.filter(card => !card.responseOnly);
      if (!cards.length) return { ok: true };
      const shown = cards[Math.floor(game.random() * cards.length)];
      game.emitOnePieceEvent?.({ type: "hiddenCardViewed", sourceId: playerId, viewerId: playerId, ownerId: targetId, card: shown });
      const matches = current.hand.filter(card => card.type === shown.type);
      return choose(game, playerId, {
        title: "百花搜查：是否封存",
        text: "你查看到目标的一张隐藏手牌，可弃置同类别牌将其封存。",
        options: [{ value: "pass", label: "不封存" }, ...matches.map(card => ({ value: card.uid, label: "弃置【" + card.name + "】并封存" }))],
        aiChoice: matches[0]?.uid || "pass",
        onResolve: uid => {
          if (uid === "pass") return;
          const paid = current.hand.find(card => card.uid === uid && card.type === shown.type);
          const index = target.hand.findIndex(card => card.uid === shown.uid);
          if (!paid || index < 0) return;
          game.removeCard(playerId, paid.uid);
          const sealed = target.hand.splice(index, 1)[0];
          target.sealedCards.push({ uid: "sealed-" + sealed.uid, card: sealed, sealedBy: playerId, returnAtPlayerId: targetId, setTurn: game.turnNumber });
        }
      });
    }
    case "workshop": {
      const equipments = game.discard.filter(card => card.type === "equipment");
      return choose(game, playerId, { title: "改造工坊：选择装备", options: equipments.map(card => ({ value: card.uid, label: "取得【" + card.name + "】" })), aiChoice: equipments[0]?.uid, onResolve: uid => {
        const index = game.discard.findIndex(card => card.uid === uid && card.type === "equipment");
        if (index < 0) return;
        const card = game.discard.splice(index, 1)[0];
        if (current.dreamState?.awakened) game.equip(playerId, card, { replaceToHand: true }); else current.hand.push(card);
      }});
    }
    case "soulConcert":
      current.roundFlags.soulConcertUsed = true;
      game.draw(playerId, 1); game.draw(targetId, 1);
      return game.requestDiscard(targetId, 1, { reason: "灵魂乐章：请弃置1张手牌", onComplete: () => { progress(game, playerId, "令他人摸后弃牌"); } });
    case "oceanGuard":
      if (targetId !== playerId && current.dreamState?.awakened) {
        game.gainShield(targetId, 1, playerId);
        return { ok: true };
      }
      return game.requestDiscard(playerId, 1, { reason: "海流护航：请选择1张手牌弃置", onComplete: () => { game.gainShield(targetId, 1, playerId); } });
    default: return { ok: false, reason: "未知的伟大航路技能" };
  }
}

export function getOnePieceSignatureTargets(game, playerId, signature) {
  const current = getPlayer(game, playerId);
  if (!current?.alive || !isOnePieceCharacter(current)) return [];
  if (signature.target === "self") return [playerId];
  return enemies(game, playerId, signature.effect === "vagabondDrill" ? 2 : 99);
}

function lieForTarget(current, targetId) { return current.specialCards.find(item => item.kind === "lie" && item.targetId === targetId); }

export function useOnePieceSignature(game, playerId, targetId, signature) {
  const current = getPlayer(game, playerId), target = getPlayer(game, targetId);
  if (!target && signature.target !== "self") return { ok: false, reason: "目标不存在" };
  switch (signature.effect) {
    case "gearFive":
      current.hp = Math.min(current.maxHp, current.hp + 1); game.draw(playerId, 2); current.attackLimit += 1;
      if (current.dreamState?.awakened) { current.rangeInfinite = true; current.turnFlags.nextAttackIgnoreArmor = true; }
      return { ok: true };
    case "asura": {
      const hpBefore = target.hp;
      return game.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "asura", skipIntervene: false, onComplete: () => { if (target.hp < hpBefore && current.dreamState?.awakened) game.draw(playerId, 1); } });
    }
    case "zeus":
      if (target.hand.length >= 2) return game.requestDiscard(targetId, 2, { reason: "雷云宙斯：请选择2张手牌弃置" });
      game.dealDamage(playerId, targetId, 2, "strategy"); return { ok: true };
    case "impactWolf": {
      const lie = lieForTarget(current, targetId);
      if (lie) { current.specialCards = current.specialCards.filter(item => item.uid !== lie.uid); game.discard.push(lie.card); current.turnFlags.nextAttackIgnoreArmor = true; }
      return game.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "impactWolf", skipIntervene: Boolean(lie) });
    }
    case "diableJambe":
      return game.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "diableJambe", skipIntervene: Boolean(current.turnFlags.supportCounter) });
    case "monsterPoint":
      game.gainShield(playerId, 2); game.draw(playerId, 1); current.attackLimit += 1; current.turnFlags.rangeBonus = (current.turnFlags.rangeBonus || 0) + 1; return { ok: true };
    case "giganteFleur": {
      const targets = game.clockwiseTargets(playerId).filter(id => !game.isAlly(playerId, id));
      const step = index => {
        if (index >= targets.length) return;
        const id = targets[index], foe = getPlayer(game, id);
        if (!foe?.alive) return step(index + 1);
        const options = [{ value: "take", label: "承受1点策略伤害" }];
        if (foe.hand.length) options.unshift({ value: "discard", label: "弃置1张手牌" });
        return choose(game, id, { title: "巨大树：响应", text: "弃置1张手牌，否则受到1点策略伤害。", options, aiChoice: foe.hand.length ? "discard" : "take", onResolve: value => { if (value === "discard") game.requestDiscard(id, 1, { reason: "巨大树：请选择1张手牌弃置", onComplete: () => step(index + 1) }); else game.dealDamage(playerId, id, 1, "strategy", () => step(index + 1)); } });
      };
      return step(0) || { ok: true };
    }
    case "frankyGeneral": {
      const slots = ["weapon", "armor"];
      const equipNext = index => {
        if (index >= slots.length) { game.gainShield(playerId, 1); return; }
        const slot = slots[index], cards = game.discard.filter(card => card.type === "equipment" && card.slot === slot);
        if (!cards.length) { game.draw(playerId, 1); return equipNext(index + 1); }
        return choose(game, playerId, { title: "弗兰奇将军：选择装备", options: cards.map(card => ({ value: card.uid, label: "装备【" + card.name + "】" })), aiChoice: cards[0].uid, onResolve: uid => { const pos = game.discard.findIndex(card => card.uid === uid); if (pos >= 0) game.equip(playerId, game.discard.splice(pos, 1)[0]); equipNext(index + 1); } });
      };
      return equipNext(0) || { ok: true };
    }
    case "arrowNotch": {
      const finish = () => { if (target.alive) target.frozenDraw = Math.max(1, target.frozenDraw); };
      return game.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "arrowNotch", onComplete: finish });
    }
    case "vagabondDrill": {
      const hpBefore = target.hp;
      return game.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "vagabondDrill", onComplete: () => { if (target.hp < hpBefore) game.gainShield(playerId, 1); } });
    }
    default: return { ok: false, reason: "未知的伟大航路招牌技" };
  }
}

export function handleOnePieceEvent(game, event) {
  const source = getPlayer(game, event.sourceId), target = getPlayer(game, event.targetId);
  switch (event.type) {
    case "turnStart": if (source) resetLie(game, source); break;
    case "afterDamage":
      if (source?.characterId === "luffy" && event.origin === "attack") progress(game, source.id, "突击命中");
      if (source?.characterId === "zoro" && event.origin === "asura") progress(game, source.id, "阿修罗");
      if (source?.characterId === "usopp" && event.lieTriggered) progress(game, source.id, "谎言弹");
      if (source?.characterId === "brook" && event.origin === "attack" && target) target.frozenDraw = Math.max(1, target.frozenDraw);
      break;
    case "lieTriggered":
      if (source?.characterId === "usopp") progress(game, source.id, "谎言弹");
      break;
    case "afterHpLoss":
      if (source?.characterId === "luffy" && event.origin === "skill") progress(game, source.id, "二档失血");
      break;
    case "beforeDamage":
      if (target?.characterId === "franky" && event.origin === "attack" && !target.equipment.armor && !target.roundFlags.frankySteel) { target.roundFlags.frankySteel = true; event.amount = Math.max(0, event.amount - 1); }
      if (target?.characterId === "brook" && event.origin === "strategy" && !target.roundFlags.soulCold) { target.roundFlags.soulCold = true; event.amount = Math.max(0, event.amount - 1); }
      const protector = game.players.find(player => player.alive && player.characterId === "jinbe" && player.id !== event.targetId && !player.roundFlags.jinbeGuard && player.hand.some(card => card.type === "basic") && game.distance(player.id, event.targetId) <= 1 && (game.mode.id === "classic8" || game.isAlly(player.id, event.targetId)));
      if (protector?.human) event.optionalProtector = protector.id;
      if (protector && !protector.human) {
        const basic = protector.hand.find(card => card.type === "basic");
        game.removeCard(protector.id, basic.uid); protector.roundFlags.jinbeGuard = true; event.amount = Math.max(0, event.amount - 1); progress(game, protector.id, "侠义");
      }
      break;
    case "afterHeal":
      if (source?.characterId === "chopper" && source.id !== target?.id) progress(game, source.id, "医术");
      if (source?.characterId === "sanji" && source.id !== target?.id) progress(game, source.id, "援护");
      break;
    case "equipmentChanged":
      if (source?.characterId === "franky") { if (!source.roundFlags.colaEnergy) { source.roundFlags.colaEnergy = true; game.gainEnergy(source.id, 1); } progress(game, source.id, "装备改造"); }
      break;
    case "hiddenCardViewed": {
      const viewer = getPlayer(game, event.viewerId || event.sourceId);
      if (viewer?.characterId === "robin") { game.draw(viewer.id, 1); progress(game, viewer.id, "历史学者"); }
      break;
    }
    case "shieldGranted":
      if (source?.characterId === "jinbe" && event.targetId !== source.id) progress(game, source.id, "海流护航");
      break;
    case "beforeDying":
      if (target?.characterId === "brook" && target.dreamState?.awakened && !target.reviveUsed && ["damage", "attack", "strategy", "signature", "asura", "arrowNotch", "vagabondDrill", "impactWolf", "diableJambe"].includes(event.origin)) { target.reviveUsed = true; target.hp = 1; target.dying = false; target.hand = []; target.energy = 0; game.log("heal", game.nameOf(target) + "以“灵魂出窍”保留1点体力"); return { rescued: true }; }
      break;
    case "cardResolved":
      if (source?.characterId === "nami" && source.navigationWind && event.card?.type === "strategy" && event.card?.targetMode !== "self" && event.card?.targetMode !== "allOther") source.navigationWind = false;
      if (source?.characterId === "nami" && event.card?.type === "strategy" && !source.roundFlags.weatherEnergy) { source.roundFlags.weatherEnergy = true; game.gainEnergy(source.id, 1); }
      if (source?.characterId === "nami") {
        const categories = source.turnFlags.cardCategories || (source.turnFlags.cardCategories = []);
        if (event.card?.type && !categories.includes(event.card.type)) categories.push(event.card.type);
        if (categories.length >= 2) progress(game, source.id, "航海记录");
      }
      break;
    default: break;
  }
  return event;
}
