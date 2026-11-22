import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDatabase, createPipeline, createDeal} from '../src/domain.mjs';
import {flowSteps, flowIssues, runAutomations} from '../src/automations.mjs';

function fixture(nodes) {
  const db=emptyDatabase(),pipeline=createPipeline(db,'Comercial');
  const deal=createDeal(db,{title:'Negócio de teste',pipelineId:pipeline.id,stageId:pipeline.stages[0].id},'2026-11-20T12:00:00.000Z');
  db.journeys=[{id:'flow',pipelineId:pipeline.id,name:'Teste',trigger:'created',enabled:true,nodes}];
  return {db,deal,event:db.events[0]};
}
test('multiple activities and timer accumulate scheduling offsets in graph order',()=>{
  const {db,event}=fixture([{id:'a',kind:'activity',title:'Contato',type:'Ligação',days:0},{id:'wait',kind:'timer',days:2},{id:'b',kind:'activity',title:'Retorno',type:'Email',days:1}]);
  runAutomations(db,[event]);
  assert.equal(db.activities.length,2);
  assert.equal(db.activities[0].scheduledAt,'2026-11-20T12:00:00.000Z');
  assert.equal(db.activities[1].scheduledAt,'2026-11-23T12:00:00.000Z');
});
test('replayed event does not duplicate activities and stays scoped to event pipeline',()=>{
  const {db,event}=fixture([{id:'a',kind:'activity',title:'Contato',days:0}]);
  db.journeys.push({...db.journeys[0],id:'other',pipelineId:createPipeline(db,'Outro').id});
  runAutomations(db,[event,event]);
  assert.equal(db.activities.length,1);assert.equal(db.automationRuns.length,1);
});
test('unsupported planning block prevents partial execution of an active malformed flow',()=>{
  const {db,event}=fixture([{id:'a',kind:'activity',title:'Contato',days:0},{id:'b',kind:'email',title:'Mensagem'}]);
  assert.ok(flowIssues(db.journeys[0]).length);
  runAutomations(db,[event]);assert.equal(db.activities.length,0);
});
test('legacy single-activity journeys keep their original execution without migration loss',()=>{
  const {db,event}=fixture([]);delete db.journeys[0].nodes;
  Object.assign(db.journeys[0],{title:'Atividade antiga',type:'Reunião',days:1});
  assert.equal(flowSteps(db.journeys[0]).length,1);
  runAutomations(db,[event]);assert.equal(db.activities[0].title,'Atividade antiga');
  assert.equal(db.activities[0].scheduledAt,'2026-11-21T12:00:00.000Z');
});
test('paused and timer-only journeys cannot create tasks',()=>{
  const {db,event}=fixture([{id:'timer',kind:'timer',days:1}]);
  assert.ok(flowIssues(db.journeys[0]).length);runAutomations(db,[event]);assert.equal(db.activities.length,0);
  db.journeys[0].nodes=[{id:'a',kind:'activity',title:'Contato',days:0}];db.journeys[0].enabled=false;
  runAutomations(db,[event]);assert.equal(db.activities.length,0);
});
