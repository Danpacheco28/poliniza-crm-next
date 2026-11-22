// Independent business rules. This module never connects to an external service.
export const uid = () => globalThis.crypto.randomUUID();
const clone = value => structuredClone(value);
const check = (condition, message) => { if (!condition) throw new Error(message); };
const timestamp = () => new Date().toISOString();

export function emptyDatabase() {
  return {
    version: 1,
    pipelines: [], contacts: [], organizations: [], products: [],
    deals: [], activities: [], events: [], goals: [],
    activityTypes: ['Ligação', 'Email', 'WhatsApp', 'Reunião', 'Proposta'],
  };
}

function getPipeline(db, id) {
  const pipeline = db.pipelines.find(item => item.id === id);
  check(pipeline, 'O pipeline selecionado não existe.');
  return pipeline;
}

function getDeal(db, id) {
  const deal = db.deals.find(item => item.id === id);
  check(deal, 'A oportunidade não foi encontrada.');
  return deal;
}

function getStage(pipeline, id) {
  const stage = pipeline.stages.find(item => item.id === id);
  check(stage, 'A etapa precisa pertencer ao pipeline selecionado.');
  return stage;
}

function event(db, deal, kind, detail = {}, at = timestamp()) {
  db.events.push({ id: uid(), dealId: deal.id, kind, at,
    pipelineId: deal.pipelineId, stageId: deal.stageId, ...detail });
}

export function createPipeline(db, name, stageNames = ['Leads', 'Contato', 'Proposta', 'Negociação']) {
  name = String(name ?? '').trim();
  check(name, 'Informe o nome do pipeline.');
  check(!db.pipelines.some(item => item.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR')), 'Já existe um pipeline com esse nome.');
  check(stageNames.length > 0, 'O pipeline precisa ter pelo menos uma etapa.');
  const pipeline = { id: uid(), name, stages: stageNames.map((label, order) => ({ id: uid(), name: label, order })) };
  db.pipelines.push(pipeline);
  return pipeline;
}

export function addStage(db, pipelineId, name) {
  const pipeline = getPipeline(db, pipelineId);
  name = String(name ?? '').trim();
  check(name, 'Informe o nome da etapa.');
  const stage = { id: uid(), name, order: pipeline.stages.length };
  pipeline.stages.push(stage);
  return stage;
}

export function renameStage(db, pipelineId, stageId, name) {
  const stage = getStage(getPipeline(db, pipelineId), stageId);
  check(String(name ?? '').trim(), 'Informe o nome da etapa.');
  stage.name = String(name).trim();
}

export function reorderStages(db, pipelineId, ids) {
  const pipeline = getPipeline(db, pipelineId);
  check(ids.length === pipeline.stages.length && new Set(ids).size === ids.length && ids.every(id => pipeline.stages.some(s => s.id === id)), 'A nova ordem deve conter todas as etapas uma única vez.');
  pipeline.stages = ids.map((id, order) => ({ ...getStage(pipeline, id), order }));
}

export function removeStage(db, pipelineId, stageId) {
  const pipeline = getPipeline(db, pipelineId);
  getStage(pipeline, stageId);
  check(pipeline.stages.length > 1, 'Mantenha pelo menos uma etapa no pipeline.');
  check(!db.deals.some(d => d.pipelineId === pipelineId && d.stageId === stageId), 'Esta etapa possui oportunidades. Transfira-as antes de excluir.');
  pipeline.stages = pipeline.stages.filter(s => s.id !== stageId).map((s, order) => ({ ...s, order }));
}

export function removePipeline(db, pipelineId) {
  getPipeline(db, pipelineId);
  check(!db.deals.some(d => d.pipelineId === pipelineId) && !db.activities.some(a => a.pipelineId === pipelineId) && !db.events.some(e => e.pipelineId === pipelineId || e.fromPipelineId === pipelineId || e.toPipelineId === pipelineId) && !db.goals.some(g => g.pipelineId === pipelineId), 'Este pipeline possui registros ou histórico. Preserve-o ou arquive-o.');
  db.pipelines = db.pipelines.filter(p => p.id !== pipelineId);
}

export function createDeal(db, input, at = timestamp()) {
  const pipeline = getPipeline(db, input.pipelineId);
  getStage(pipeline, input.stageId);
  const title = String(input.title ?? '').trim();
  check(title, 'Informe o título da oportunidade.');
  const value = Number(input.value ?? 0);
  check(Number.isFinite(value) && value >= 0, 'Informe um valor válido, maior ou igual a zero.');
  if (input.contactId) check(db.contacts.some(c => c.id === input.contactId), 'O contato não foi encontrado.');
  const deal = {
    id: uid(), title, value, pipelineId: pipeline.id, stageId: input.stageId,
    contactId: input.contactId || null, owner: String(input.owner ?? ''),
    channel: String(input.channel ?? ''), expectedAt: input.expectedAt || null,
    status: 'open', createdAt: at, updatedAt: at, closedAt: null,
    lossReason: '', notes: String(input.notes ?? ''),
  };
  db.deals.push(deal);
  event(db, deal, 'created', {}, at);
  return deal;
}

export function moveDeal(db, dealId, pipelineId, stageId, at = timestamp()) {
  const deal = getDeal(db, dealId);
  getStage(getPipeline(db, pipelineId), stageId);
  check(deal.status === 'open', 'Reabra a oportunidade antes de movimentá-la.');
  if (deal.pipelineId === pipelineId && deal.stageId === stageId) return;
  const previous = { fromPipelineId: deal.pipelineId, fromStageId: deal.stageId, toPipelineId: pipelineId, toStageId: stageId };
  deal.pipelineId = pipelineId;
  deal.stageId = stageId;
  deal.updatedAt = at;
  event(db, deal, previous.fromPipelineId === pipelineId ? 'stage_changed' : 'pipeline_transferred', previous, at);
}

export function setDealStatus(db, dealId, status, reason = '', at = timestamp()) {
  const deal = getDeal(db, dealId);
  check(['open', 'won', 'lost'].includes(status), 'O status informado não é válido.');
  check(status !== 'lost' || String(reason).trim(), 'Informe o motivo da perda.');
  if (status === deal.status) return;
  const fromStatus = deal.status;
  deal.status = status;
  deal.closedAt = status === 'open' ? null : at;
  deal.updatedAt = at;
  deal.lossReason = status === 'lost' ? String(reason).trim() : '';
  event(db, deal, status === 'open' ? 'reopened' : status, { fromStatus, value: deal.value, reason: deal.lossReason }, at);
}

export function createContact(db, input) {
  const name = String(input.name ?? '').trim();
  check(name, 'Informe o nome do contato.');
  const email = String(input.email ?? '').trim().toLowerCase();
  check(!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'O email não é válido.');
  const contact = { id: uid(), name, email, phone: String(input.phone ?? ''), organization: String(input.organization ?? ''), role: String(input.role ?? ''), channel: String(input.channel ?? ''), createdAt: timestamp() };
  db.contacts.push(contact);
  return contact;
}

export function createActivity(db, input, at = timestamp()) {
  getPipeline(db, input.pipelineId);
  const title = String(input.title ?? '').trim();
  check(title, 'Descreva a atividade.');
  check(Number.isFinite(Date.parse(input.scheduledAt)), 'Informe uma data e horário válidos.');
  if (input.dealId) check(getDeal(db, input.dealId).pipelineId === input.pipelineId, 'A oportunidade deve pertencer ao pipeline da atividade.');
  const activity = { id: uid(), title, pipelineId: input.pipelineId, dealId: input.dealId || null, type: input.type || 'Ligação', owner: String(input.owner ?? ''), scheduledAt: input.scheduledAt, createdAt: at, completedAt: null, cancelledAt: null, notes: String(input.notes ?? '') };
  db.activities.push(activity);
  return activity;
}

export function completeActivity(db, activityId, at = timestamp()) {
  const activity = db.activities.find(a => a.id === activityId);
  check(activity, 'A atividade não foi encontrada.');
  check(!activity.cancelledAt, 'A atividade está cancelada.');
  activity.completedAt ||= at;
}

// Local demo transactions are atomic: callers persist only a successful clone.
export function transact(db, action) {
  const next = clone(db);
  const result = action(next);
  return { db: next, result };
}

export function pipelineReport(db, pipelineId, { from = '0001-01-01T00:00:00.000Z', to = '9999-12-31T23:59:59.999Z', now = timestamp() } = {}) {
  const pipeline = getPipeline(db, pipelineId);
  const within = date => Boolean(date) && date >= from && date <= to;
  const deals = db.deals.filter(d => d.pipelineId === pipelineId);
  const open = deals.filter(d => d.status === 'open');
  const events = db.events.filter(e => e.pipelineId === pipelineId && within(e.at));
  const won = events.filter(e => e.kind === 'won');
  const lost = events.filter(e => e.kind === 'lost');
  const activities = db.activities.filter(a => a.pipelineId === pipelineId && !a.cancelledAt);
  const activityCounts = rows => ({
    created: rows.filter(a => within(a.createdAt)).length,
    scheduled: rows.filter(a => !a.completedAt && a.scheduledAt >= now && within(a.scheduledAt)).length,
    overdue: rows.filter(a => !a.completedAt && a.scheduledAt < now && within(a.scheduledAt)).length,
    completed: rows.filter(a => within(a.completedAt)).length,
  });
  return {
    pipelineId, pipelineName: pipeline.name,
    openCount: open.length, forecast: open.reduce((sum, d) => sum + d.value, 0),
    sales: won.reduce((sum, e) => sum + e.value, 0), wonCount: won.length,
    lostCount: lost.length, lostValue: lost.reduce((sum, e) => sum + e.value, 0),
    created: events.filter(e => e.kind === 'created').length,
    transferredIn: db.events.filter(e => e.kind === 'pipeline_transferred' && e.toPipelineId === pipelineId && within(e.at)).length,
    transferredOut: db.events.filter(e => e.kind === 'pipeline_transferred' && e.fromPipelineId === pipelineId && within(e.at)).length,
    conversion: won.length + lost.length ? won.length / (won.length + lost.length) : null,
    ticket: won.length ? won.reduce((sum, e) => sum + e.value, 0) / won.length : null,
    stages: pipeline.stages.map(stage => ({ ...stage, count: open.filter(d => d.stageId === stage.id).length, value: open.filter(d => d.stageId === stage.id).reduce((sum, d) => sum + d.value, 0) })),
    activities: activityCounts(activities),
    activityTypes: [...new Set(activities.map(a => a.type))].map(type => ({ type, ...activityCounts(activities.filter(a => a.type === type)) })),
  };
}
