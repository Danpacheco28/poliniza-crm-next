import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDatabase, createPipeline, createDeal, moveDeal, setDealStatus, createActivity, completeActivity, pipelineReport, removeStage, reorderStages, transact } from '../src/domain.mjs';

function fixture() {
  const db = emptyDatabase();
  const a = createPipeline(db, 'Comercial');
  const b = createPipeline(db, 'Relacionamento');
  const deal = createDeal(db, { title: 'Demonstração', value: 2500, pipelineId: a.id, stageId: a.stages[0].id }, '2026-11-01T10:00:00.000Z');
  return { db, a, b, deal };
}

test('transfers preserve origin history and separate current stock', () => {
  const { db, a, b, deal } = fixture();
  createActivity(db, { title: 'Retornar', pipelineId: a.id, dealId: deal.id, scheduledAt: '2026-11-05T12:00:00.000Z' });
  moveDeal(db, deal.id, b.id, b.stages[0].id, '2026-11-02T10:00:00.000Z');
  const first = pipelineReport(db, a.id);
  const second = pipelineReport(db, b.id);
  assert.equal(first.openCount, 0);
  assert.equal(second.openCount, 1);
  assert.equal(first.created, 1);
  assert.equal(second.created, 0);
  assert.equal(first.transferredOut, 1);
  assert.equal(second.transferredIn, 1);
  assert.equal(first.activities.created, 1);
  assert.equal(second.activities.created, 0);
});

test('stage from another pipeline is rejected without mutation', () => {
  const { db, a, b, deal } = fixture();
  assert.throws(() => moveDeal(db, deal.id, a.id, b.stages[0].id), /pertencer/);
  assert.equal(deal.stageId, a.stages[0].id);
});

test('stage removal protects existing deals; reorder rejects missing or duplicated stages', () => {
  const { db, a } = fixture();
  assert.throws(() => removeStage(db, a.id, a.stages[0].id), /oportunidades/);
  assert.throws(() => reorderStages(db, a.id, a.stages.map(() => a.stages[0].id)), /uma única vez/);
});

test('activity creation and completion belong to different periods', () => {
  const { db, a, deal } = fixture();
  const activity = createActivity(db, { title: 'Reunião', pipelineId: a.id, dealId: deal.id, scheduledAt: '2026-11-02T12:00:00.000Z' }, '2026-10-31T10:00:00.000Z');
  completeActivity(db, activity.id, '2026-11-02T12:30:00.000Z');
  const report = pipelineReport(db, a.id, { from: '2026-11-01T00:00:00.000Z', to: '2026-11-30T23:59:59.999Z' });
  assert.equal(report.activities.created, 0);
  assert.equal(report.activities.completed, 1);
  assert.equal(report.activities.overdue, 0);
});

test('loss requires reason; closure history survives reopening', () => {
  const { db, a, deal } = fixture();
  assert.throws(() => setDealStatus(db, deal.id, 'lost'), /motivo/);
  setDealStatus(db, deal.id, 'won');
  setDealStatus(db, deal.id, 'open');
  assert.equal(pipelineReport(db, a.id).sales, 2500);
  assert.equal(pipelineReport(db, a.id).openCount, 1);
});

test('failed multi-step transaction leaves original state untouched', () => {
  const { db, a } = fixture();
  assert.throws(() => transact(db, next => {
    createPipeline(next, 'Novo');
    createDeal(next, { title: '', pipelineId: a.id, stageId: a.stages[0].id });
  }));
  assert.equal(db.pipelines.length, 2);
});
