import { createActivity, uid } from './domain.mjs';

export const triggers = {
  created: 'Oportunidade criada', stage_changed: 'Mudança de etapa',
  pipeline_transferred: 'Transferência recebida', won: 'Oportunidade ganha',
};

export function flowSteps(flow) {
  if (Array.isArray(flow.nodes)) return flow.nodes;
  return flow.title ? [{ id: `legacy-${flow.id}`, kind: 'activity', title: flow.title, type: flow.type || 'Ligação', days: flow.days || 0 }] : [];
}

export function flowIssues(flow) {
  const nodes = flowSteps(flow);
  const issues = [];
  if (!triggers[flow.trigger]) issues.push('Configure um evento de entrada válido.');
  if (!nodes.some(n => n.kind === 'activity')) issues.push('Adicione pelo menos um bloco de atividade.');
  if (nodes.some(n => !['activity', 'timer'].includes(n.kind))) issues.push('Este fluxo contém ações que ainda não têm execução conectada. Você pode salvá-lo como rascunho.');
  if (nodes.some(n => !Number.isInteger(Number(n.days || 0)) || Number(n.days || 0) < 0 || Number(n.days || 0) > 365)) issues.push('Os intervalos devem ter de 0 a 365 dias inteiros.');
  if (nodes.some(n => n.kind === 'activity' && !String(n.title || '').trim())) issues.push('Informe o título de todas as atividades.');
  return issues;
}

export function runAutomations(db, events) {
  db.automationRuns ||= [];
  for (const event of events) {
    for (const flow of (db.journeys || []).filter(f => f.enabled && f.pipelineId === event.pipelineId && f.trigger === event.kind)) {
      if (flowIssues(flow).length) continue;
      if (db.automationRuns.some(r => r.journeyId === flow.id && r.eventId === event.id && !r.nodeId)) continue;
      const deal = db.deals.find(d => d.id === event.dealId);
      if (!deal || deal.pipelineId !== event.pipelineId) continue;
      let offset = 0;
      for (const node of flowSteps(flow)) {
        offset += Number(node.days || 0);
        if (node.kind === 'timer') continue;
        if (db.automationRuns.some(r => r.journeyId === flow.id && r.eventId === event.id && r.nodeId === node.id)) continue;
        const when = new Date(event.at); when.setDate(when.getDate() + offset);
        const task = createActivity(db, { title: node.title, pipelineId: event.pipelineId, dealId: deal.id,
          type: node.type || 'Ligação', owner: node.owner || deal.owner, scheduledAt: when.toISOString(), notes: node.notes || '' });
        db.automationRuns.push({ id: uid(), journeyId: flow.id, eventId: event.id, nodeId: node.id, activityId: task.id, at: new Date().toISOString() });
      }
    }
  }
}
