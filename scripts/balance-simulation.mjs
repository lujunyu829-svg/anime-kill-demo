import { GameEngine } from "../src/engine.js";
import { characterPacks } from "../src/data.js";

const gamesPerSeat = Number(process.argv.find(value => value.startsWith("--games="))?.split("=")[1] || 25);
const maxSteps = 4000;
const characters = [...new Set(characterPacks.flatMap(pack => pack.characterIds))];

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function runCharacter(characterId, anchorSeat) {
  let wins = 0;
  let completed = 0;
  let unfinished = 0;
  let totalSteps = 0;
  for (let index = 0; index < gamesPerSeat; index += 1) {
    const game = new GameEngine({
      modeId: "ranked2v2",
      humanCharacterId: characterId,
      fixedAnchorSeat: anchorSeat,
      random: seededRandom(20260908 + anchorSeat * 100000 + index * 7919)
    }).setup();
    for (const player of game.players) player.human = false;
    const playerCamp = game.roleOf(game.players[0]).camp;
    let steps = 0;
    while (!game.winner && steps < maxSteps) {
      const result = game.aiStep();
      if (game.pendingResponse) game.respond(true);
      else if (!result.acted) game.endTurn();
      steps += 1;
    }
    totalSteps += steps;
    if (!game.winner) {
      unfinished += 1;
      continue;
    }
    completed += 1;
    if (game.winner.camp === playerCamp) wins += 1;
  }
  return { wins, completed, unfinished, rate: completed ? wins / completed * 100 : 0, avgSteps: totalSteps / gamesPerSeat };
}

const rows = [];
for (const characterId of characters) {
  const seats = [0, 1, 2, 3].map(anchorSeat => runCharacter(characterId, anchorSeat));
  const completed = seats.reduce((sum, result) => sum + result.completed, 0);
  const wins = seats.reduce((sum, result) => sum + result.wins, 0);
  rows.push({ characterId, seats, normalizedRate: completed ? wins / completed * 100 : 0 });
}

console.log("character\tseat0\tseat1\tseat2\tseat3\tnormalized\tunfinished");
for (const row of rows) {
  const rates = row.seats.map(result => result.rate.toFixed(1));
  const unfinished = row.seats.reduce((sum, result) => sum + result.unfinished, 0);
  console.log(`${row.characterId}\t${rates.join("\t")}\t${row.normalizedRate.toFixed(1)}\t${unfinished}`);
}
