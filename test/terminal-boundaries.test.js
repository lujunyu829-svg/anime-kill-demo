import test from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/engine.js";
import { cardDefinitions } from "../src/data.js";
test("终局清除当前卡牌结算，结束后的续接不会重新打开窗口",()=>{
  const g=new GameEngine({modeId:"ranked2v2",humanCharacterId:"nami",fixedAnchorSeat:0,random:()=>.25}).setup();
  g.emitCardDeclared("p0",["p1"],{...cardDefinitions.attack,uid:"last-attack"});
  g.player("p1").alive=g.player("p3").alive=false;g.checkWinner();
  assert.equal(g.activeCardContext,null);
  g.requestChoice("p0",{options:[{value:"yes",label:"不应出现"}]});
  g.requestDiscard("p0",1);
  assert.equal(g.pendingChoice,null);assert.equal(g.pendingDiscard,null);
});
