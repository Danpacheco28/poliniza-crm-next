import { emptyDatabase, createPipeline, createContact, createDeal, moveDeal, setDealStatus, createActivity, completeActivity, uid } from './domain.mjs';
export function demoDatabase() {
  const db = emptyDatabase();
  db.demo = true;
  db.team = [{ id: uid(), name: 'Marina Rocha', email: 'marina@example.com' }, { id: uid(), name: 'Felipe Silva', email: 'felipe@example.com' }, { id: uid(), name: 'Julia Lima', email: 'julia@example.com' }];
  db.journeys = []; db.automationRuns = [];
  const sales = createPipeline(db, 'Vendas consultivas');
  const renewal = createPipeline(db, 'Relacionamento', ['Boas-vindas', 'Acompanhamento', 'Renovação']);
  const now = new Date();
  const when = (days, hours = 10) => { const d = new Date(now); d.setDate(d.getDate() + days); d.setHours(hours, 0, 0, 0); return d.toISOString(); };
  const people = ['Ana Costa', 'Bruno Alves', 'Carla Dias', 'Diego Melo', 'Elisa Prado', 'Fabio Reis', 'Gabi Santos', 'Hugo Lima', 'Iara Matos', 'João Leal'];
  const companies = ['Alfa Educação', 'Beta Saúde', 'Gama Indústria', 'Delta Logística', 'Ômega Energia', 'Sigma Varejo', 'NovaTec Serviços', 'Plena Consultoria', 'Horizonte Digital', 'Atlas Soluções'];
  const values = [4200, 2000, 8000, 4000, 9000, 5500, 9700, 6000, 3200, 1800];
  const sources = ['Indicação', 'Site', 'Campanha', 'Evento'];
  people.forEach((name, i) => {
    const contact = createContact(db, { name, email: `contato${i + 1}@example.com`, phone: '(11) 99999-0000', organization: companies[i], role: 'Responsável comercial', channel: sources[i % 4] });
    const deal = createDeal(db, { title: ['Implantação comercial', 'Diagnóstico e planejamento', 'Projeto de expansão', 'Consultoria mensal'][i % 4], pipelineId: sales.id, stageId: sales.stages[0].id, contactId: contact.id, value: values[i], owner: db.team[i % 3].name, channel: sources[i % 4], expectedAt: when(5 + i).slice(0, 10), notes: 'Registro fictício para validar a experiência do novo aplicativo.' }, when(-12 + i));
    if (i < 8 && i >= 2) moveDeal(db, deal.id, sales.id, sales.stages[Math.floor(i / 2)].id, when(-4 + Math.floor(i / 2)));
    if (i === 8) setDealStatus(db, deal.id, 'won', '', when(-1));
    if (i === 9) setDealStatus(db, deal.id, 'lost', 'Orçamento indisponível', when(-2));
    if (i < 8) {
      const task = createActivity(db, { title: ['Apresentar proposta', 'Fazer contato inicial', 'Agendar demonstração', 'Confirmar próximos passos'][i % 4], pipelineId: sales.id, dealId: deal.id, type: ['Reunião', 'Ligação', 'Email', 'WhatsApp'][i % 4], owner: deal.owner, scheduledAt: when(i - 2, 9 + i) }, when(-5));
      if (i === 2 || i === 5) completeActivity(db, task.id, when(-1));
    }
  });
  const renewalDeal = createDeal(db, { title: 'Revisão trimestral', pipelineId: renewal.id, stageId: renewal.stages[1].id, contactId: db.contacts[0].id, value: 1200, owner: db.team[0].name, channel: 'Base ativa' }, when(-6));
  createActivity(db, { title: 'Reunião de acompanhamento', pipelineId: renewal.id, dealId: renewalDeal.id, owner: db.team[0].name, type: 'Reunião', scheduledAt: when(2, 14) }, when(-2));
  db.products = [{ id: uid(), name: 'Diagnóstico comercial', price: 2000 }, { id: uid(), name: 'Implantação de CRM', price: 4200 }, { id: uid(), name: 'Consultoria mensal', price: 1800 }];
  db.goals = [{ id: uid(), pipelineId: sales.id, month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, target: 20000, type: 'value' }];
  return db;
}
