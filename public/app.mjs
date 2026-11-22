import {cnpjFields,installCnpjLookup} from '/cnpj-lookup.mjs';
import { createCloud } from '/cloud.mjs';
import { createLeadForms } from '/lead-forms-admin.mjs';
import { createConversations } from '/conversations.mjs';
import { createEmails } from '/emails.mjs';
import { createAutomationEditor } from '/automation-editor.mjs';
import { runAutomations } from '/src/automations.mjs';
import * as D from '/src/domain.mjs';
import { demoDatabase } from '/src/demo.mjs';
import { templates, previewImport, commitImport, csvExport, parseMoney } from '/src/imports.mjs';

installCnpjLookup();
const STORAGE = 'poliniza-crm-next.demo.v1';
let cloud=null,cloudSaving=false;
const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value || 0);
const number = value => new Intl.NumberFormat('pt-BR').format(value || 0);
const percent = value => value == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(value);
const date = value => value ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(value.length === 10 ? value + 'T12:00:00' : value)) : 'Sem previsão';
const time = value => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const localDate = value => { const d = value ? new Date(value) : new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const localTime = value => { const d = value ? new Date(value) : new Date(); return `${localDate(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
const initials = name => String(name || 'Poliniza').split(' ').slice(0,2).map(word => word[0]).join('');
const icons = {
  board:'<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/>',
  contacts:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v2"/>',
  check:'<path d="m5 12 4 4L20 5"/>',
  activity:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4m8-4v4M8 11h8m-8 4h5"/>',
  calendar:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M7 2v4m10-4v4m-10 7h2m3 0h2m3 0h1m-11 4h2m3 0h2"/>',
  reports:'<path d="M4 20V10h4v10m3 0V4h4v16m3 0v-7h3v7M2 21h21"/>',
  product:'<path d="m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
  settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="8" cy="18" r="2" fill="currentColor"/>',
  journey:'<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M5 7v7a5 5 0 0 0 5 5h7M5 10h9a5 5 0 0 0 5-5V3m-3 3 3-3 3 3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>', arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>', phone:'<path d="M8 3H4v4a14 14 0 0 0 13 13h4v-5l-5-1-2 2a12 12 0 0 1-6-6l2-2-2-5Z"/>',
  email:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>', chevron:'<path d="m8 5 7 7-7 7"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.activity}</svg>`;

let db;
let loadError = '';
try {
  const raw = localStorage.getItem(STORAGE);
  db = raw ? JSON.parse(raw) : demoDatabase();
  if (db.version !== 1 || !Array.isArray(db.pipelines) || !Array.isArray(db.deals)) throw new Error('A base local não é compatível com esta versão.');
  if (!raw) localStorage.setItem(STORAGE, JSON.stringify(db));
} catch (error) { db = D.emptyDatabase(); loadError = 'Não foi possível abrir os dados locais. Nenhum dado anterior foi sobrescrito. ' + error.message; }

const state = { pipelineId: db.pipelines[0]?.id, route: 'funil', query: '', status: 'open', mode: 'board', period: 'all', dashboard: 'operacao', activityFilter: 'all', month: new Date(new Date().getFullYear(),new Date().getMonth(),1), importPreview: null };
const routes = [['funil','Funil','board'], ['conversas','Conversas','phone'], ['emails','Email','email'], ['contatos','Contatos','contacts'], ['atividades','Atividades','activity'], ['calendario','Calendário','calendar'], ['relatorios','Relatórios','reports'], ['produtos','Produtos','product'], ['jornadas','Automações','journey'], ['formularios','Formulários','contacts'], ['configuracoes','Configurações','settings']];
const main = $('#main');
const demoNoteOriginal=$('.demo-note').innerHTML;
const modal = $('#modal');
let onSubmit = null, toastTimer;

function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>$('#toast').classList.remove('visible'),3500); }
function store(next) { if(!cloud?.enabled)localStorage.setItem(STORAGE, JSON.stringify(next)); db = next; }
async function mutate(action, message = cloud?.enabled ? 'Alterações salvas na base compartilhada.' : 'Alterações salvas neste navegador.') {
  if(cloudSaving)throw new Error('Aguarde a gravação atual antes de continuar.');
  if (loadError) throw new Error(loadError);
  const next = structuredClone(db);
  const count = next.events.length;
  const result = action(next);
  applyJourneys(next, next.events.slice(count));
  if(cloud?.enabled){cloudSaving=true;try{await cloud.commit(db,next);}finally{cloudSaving=false;}}
  store(next); render(); if (message) toast(message); return result;
}
function pipeline() { return db.pipelines.find(p=>p.id===state.pipelineId); }
function contact(id) { return db.contacts.find(c=>c.id===id); }
function deal(id) { return db.deals.find(d=>d.id===id); }
function personName(id) { return contact(id)?.name || 'Sem contato'; }
function company(id) { return contact(id)?.organization || personName(id); }
function owners() { return (db.team || []).map(member=>({id:member.name,name:member.name})); }
function periods() {
  const now = new Date(); let from;
  if (state.period==='month') from = new Date(now.getFullYear(),now.getMonth(),1).toISOString();
  if (state.period==='30') from = new Date(now.getTime()-30*86400000).toISOString();
  return from ? { from, to: now.toISOString(), now: now.toISOString() } : { now: now.toISOString() };
}
function report() { return pipeline() ? D.pipelineReport(db, state.pipelineId, periods()) : null; }
function option(items, selected, blank = '') { return (blank ? `<option value="">${esc(blank)}</option>`:'') + items.map(item=>`<option value="${esc(item.id)}"${item.id===selected?' selected':''}>${esc(item.name)}</option>`).join(''); }
function btn(action, label, cls = '', args = '', glyph = '') { return `<button type="button" data-action="${action}" ${args} class="${cls}">${glyph?icon(glyph):''}${label}</button>`; }
function field(name,label,value='',type='text',wide=false,extra='') { return `<label class="field ${wide?'wide':''}"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`; }
function selectField(name,label,items,selected,blank='',wide=false) { return `<label class="field ${wide?'wide':''}"><span>${label}</span><select name="${name}">${option(items,selected,blank)}</select></label>`; }
function empty(title, text, action = '') { return `<div class="empty"><strong>${esc(title)}</strong><p>${esc(text)}</p>${action}</div>`; }
function header(title,description,actions='') { return `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div><div class="actions">${actions}</div></div>`; }
function pipelineSelect() { return `<label>Pipeline<select data-filter="pipeline" aria-label="Selecionar pipeline">${option(db.pipelines,state.pipelineId)}</select></label>`; }
function toolbar(extra='', search=false, css='') {
  return `<div class="toolbar ${css}">${pipelineSelect()}${extra}${search?`<input class="search" data-filter="search" value="${esc(state.query)}" type="search" placeholder="Buscar oportunidade ou contato" aria-label="Buscar oportunidade ou contato">`:''}</div>`;
}
function activityStatus(activity) {
  if (activity.completedAt) return {name:'Realizada',color:'green'};
  if (activity.scheduledAt<new Date().toISOString()) return {name:'Atrasada',color:'red'};
  return {name:'Agendada',color:'blue'};
}
function tag(text,color='') { return `<span class="tag ${color}">${esc(text)}</span>`; }
function activitiesForPipeline() { return db.activities.filter(a=>a.pipelineId===state.pipelineId&&!a.cancelledAt); }
function stat(label,value,detail,color='',glyph='') { return `<div class="stat ${color}"><div class="stat-label">${label}${glyph?icon(glyph):''}</div><div class="stat-value">${value}</div><small>${detail}</small></div>`; }
function bars(rows, monetary=false, color='') {
  const max = Math.max(...rows.map(r=>r.value),1);
  if (!rows.length) return empty('Nenhum dado neste período','Os valores aparecerão após os primeiros registros.');
  return rows.map(r=>`<div class="bar-row"><span class="bar-label" title="${esc(r.label)}">${esc(r.label)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,r.value)/max*100}%;${color?`background:${color}`:''}"></div></div><span class="bar-value">${monetary?money(r.value):number(r.value)}</span></div>`).join('');
}

function showDialog(title, content, submit=null, action='Salvar', css='') {
  onSubmit=submit; modal.className=css;
  modal.innerHTML=`<form id="dialog-form"><div class="dialog-header"><h2 id="dialog-title">${title}</h2><button type="button" data-action="close-modal" class="icon-button" aria-label="Fechar">${icon('close')}</button></div><div class="dialog-content">${content}<div class="form-error" role="alert"></div></div>${submit?`<div class="dialog-footer">${btn('close-modal','Cancelar')}<button class="primary" type="submit">${action}</button></div>`:''}</form>`;
  if(!modal.open) modal.showModal();
  requestAnimationFrame(()=>$('input:not([type=hidden]),select,textarea,button',modal)?.focus());
}
modal.addEventListener('submit',async event=>{
  event.preventDefault(); if(!onSubmit)return;
  const values=Object.fromEntries(new FormData(event.target));
  try { const after=await onSubmit(values); modal.close(); onSubmit=null; if(typeof after==='function')after(); }
  catch(error){$('.form-error',modal).textContent=error.message;}
});
modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
function confirm(title,body,action,button='Confirmar') { showDialog(title,`<p>${esc(body)}</p>`,()=>action(),button); }

function render() {
  const gate=cloud?.gate();
  if(gate){conversations.stop();$('#navigation').innerHTML='';$('.demo-note').hidden=true;main.innerHTML=gate;document.title='Acesso interno · Poliniza CRM';return;}
  $('.demo-note').hidden=false;
  if(!db.pipelines.some(p=>p.id===state.pipelineId))state.pipelineId=db.pipelines[0]?.id;
  state.route=location.hash.slice(1)||'funil'; if(!routes.some(r=>r[0]===state.route))state.route='funil';
  $('#navigation').innerHTML=routes.map(([path,label,glyph])=>`<a href="#${path}" class="${state.route===path?'active':''}" ${state.route===path?'aria-current="page"':''}>${icon(glyph)}${label}</a>`).join('');
  document.title=`${routes.find(r=>r[0]===state.route)[1]} · Poliniza CRM novo`;
  if(loadError){main.innerHTML=header('Os dados locais precisam de atenção','A base foi preservada.')+`<div class="hint">${esc(loadError)}</div>`;return;}
  if(state.route!=='conversas')conversations.stop();
  $('.demo-note').innerHTML=state.route==='conversas'?'<span class="status-dot"></span><strong>WhatsApp real · teste local</strong><span>Mensagens separadas da demonstração. Envio somente manual.</span>':demoNoteOriginal;
  if(state.route==='emails')$('.demo-note').innerHTML='<span class="status-dot"></span><strong>Email real · teste local</strong><span>Envio individual, após revisão e confirmação.</span>';
  const views={formularios:()=>leadForms.render(),emails:()=>emails.render(),conversas:()=>conversations.render(),funil:renderBoard,contatos:renderContacts,atividades:renderActivities,calendario:renderCalendar,relatorios:renderReports,produtos:renderProducts,jornadas:renderJourneys,configuracoes:renderSettings};
  if(cloud?.enabled){
    $('.demo-note').innerHTML=`<strong>Base compartilhada</strong><span>${esc(cloud.email)}</span>${btn('cloud-reload','Atualizar base','plain')}${btn('cloud-logout','Sair','plain')}`;
    $('.brand small').textContent='Piloto online';
    if(['conversas','emails'].includes(state.route)){main.innerHTML=cloud.companion(state.route==='emails'?'email':'whatsapp');return;}
  }
  let content=views[state.route]();
  if(cloud?.enabled){content=content.replaceAll('Equipe demonstrativa','Responsáveis comerciais').replaceAll('Estes são responsáveis locais para testes. Não são contas de acesso. Login, convites e permissões reais serão conectados a um projeto exclusivo de autenticação.','Responsáveis comerciais não criam contas de acesso. Neste piloto, o administrador cadastra e autoriza usuários pelo Supabase.').replaceAll('Dados: somente neste navegador','Dados: base compartilhada Supabase').replaceAll('dados locais em JSON','dados autorizados em JSON').replaceAll('Backup da demonstração','Backup da base compartilhada');}
  main.innerHTML=content;
  if(cloud?.enabled)main.querySelectorAll('[data-action=reset-demo],[data-action=empty-data]').forEach(el=>el.remove());
}

function renderBoard() {
  const p=pipeline();
  if(!p)return header('Funil comercial','Crie seu primeiro pipeline.',btn('new-pipeline','Novo pipeline','primary','','plus'));
  const rows=db.deals.filter(d=>d.pipelineId===p.id&&d.status===state.status&&`${d.title} ${company(d.contactId)} ${personName(d.contactId)}`.toLocaleLowerCase('pt-BR').includes(state.query.toLocaleLowerCase('pt-BR')));
  const sum=rows.reduce((n,d)=>n+d.value,0);
  const controls=`<div class="toolbar-summary"><b>${money(sum)}</b><span>${rows.length} oportunidades</span></div><label>Status<select data-filter="deal-status">${option([{id:'open',name:'Em aberto'},{id:'won',name:'Ganhas'},{id:'lost',name:'Perdidas'}],state.status)}</select></label><div class="segmented">${btn('board-mode','Quadro',state.mode==='board'?'selected':'','data-mode="board"')}${btn('board-mode','Lista',state.mode==='list'?'selected':'','data-mode="list"')}</div>`;
  const cards=d=>{
    const activity=db.activities.filter(a=>a.dealId===d.id&&!a.completedAt&&!a.cancelledAt).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt))[0];
    const stage=p.stages.find(s=>s.id===d.stageId);
    const stageIndex=p.stages.findIndex(s=>s.id===d.stageId);
    const stageName=(stage?.name||'').toLocaleLowerCase('pt-BR');
    const defaultLabel=/lead|prospec/.test(stageName)?'Novo':/contato/.test(stageName)?'Em contato':/proposta|cota/.test(stageName)?'Em proposta':stage?.name||'Em andamento';
    const progressLabel=d.progressStageId===d.stageId&&d.progressLabel?d.progressLabel:defaultLabel;
    const tone=['violet','blue','plum','gold'][Math.max(0,stageIndex)%4];
    const status={open:{label:'Em aberto',color:'open'},won:{label:'Ganha',color:'won'},lost:{label:'Perdida',color:'lost'}}[d.status];
    return `<article class="deal-card compact-card tone-${tone}" draggable="${d.status==='open'}" data-deal="${d.id}"><button class="deal-open" data-action="detail" data-id="${d.id}" aria-label="Abrir ${esc(d.title)} de ${esc(company(d.contactId))}"><span class="card-status ${status.color}"><span class="opportunity-dot" aria-hidden="true"></span>${status.label}</span><h3>${esc(company(d.contactId))}</h3><p class="organization">${esc(d.title)}</p><p class="value">${money(d.value)}</p><span class="progress-badge ${tone}">${esc(progressLabel)}</span><span class="card-bottom"><span class="card-date ${activity&&activityStatus(activity).color==='red'?'late':''}">${activity?icon('calendar')+' '+esc(date(activity.scheduledAt)):esc(date(d.expectedAt))}</span><span class="card-owner" title="${esc(d.owner)}">${esc(initials(d.owner))}</span></span></button><details class="card-quick"><summary aria-label="Adicionar à oportunidade ${esc(d.title)}" title="Adicionar à oportunidade">${icon('plus')}</summary><div class="quick-options"><strong>Adicionar à oportunidade</strong>${btn('new-activity','Atividade','',`data-deal="${d.id}"`,'activity')}${btn('quick-email','Email · agendar envio','',`data-id="${d.id}"`,'email')}${btn('quick-whatsapp','WhatsApp · agendar contato','',`data-id="${d.id}"`,'phone')}${btn('quick-note','Anotação','',`data-id="${d.id}"`,'plus')}</div></details></article>`;

  };
  let content;
  if(state.mode==='list')content=`<div class="table-wrap"><table><thead><tr><th>Oportunidade</th><th>Contato</th><th>Etapa</th><th>Responsável</th><th class="number">Valor</th><th></th></tr></thead><tbody>${rows.map(d=>`<tr><td><strong>${esc(d.title)}</strong><small>${esc(company(d.contactId))}</small></td><td>${esc(personName(d.contactId))}</td><td>${tag(p.stages.find(s=>s.id===d.stageId)?.name||'Etapa removida')}</td><td>${esc(d.owner||'Não atribuído')}</td><td class="number">${money(d.value)}</td><td>${btn('detail','Abrir','plain',`data-id="${d.id}"`)}</td></tr>`).join('')||'<tr><td colspan="6">Nenhuma oportunidade encontrada.</td></tr>'}</tbody></table></div>`;
  else content=`<div class="board">${p.stages.map(stage=>{
    const deals=rows.filter(d=>d.stageId===stage.id);
    return `<section class="stage" data-stage="${stage.id}" aria-label="Etapa ${esc(stage.name)}"><div class="stage-head"><div><h2>${esc(stage.name)} <span>${deals.length}</span></h2><p>${money(deals.reduce((n,d)=>n+d.value,0))}</p></div>${btn('stage-menu','•••','',`data-id="${stage.id}" aria-label="Configurar etapa ${esc(stage.name)}"`)}</div>${deals.map(cards).join('')||empty('Etapa livre','Adicione ou mova uma oportunidade.')}${btn('new-deal','Adicionar','plain',`data-stage="${stage.id}"`,'plus')}</section>`;
  }).join('')}</div>`;
  return header('Funil comercial','Cada oportunidade, um próximo passo.',btn('new-pipeline','Novo pipeline','plain','','plus')+btn('new-deal','Nova oportunidade','primary','','plus'))+toolbar(controls,true)+compactAgenda()+`<div class="board-layout"><div>${content}</div>${agenda()}</div>`;
}
function compactAgenda() {
  const rows=activitiesForPipeline().filter(a=>!a.completedAt).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt));
  return `<a class="compact-agenda" href="#atividades">${icon('calendar')}<span><strong>Próximas atividades · ${rows.length} pendentes</strong><small>${rows[0]?esc(rows[0].title)+' · '+date(rows[0].scheduledAt)+' '+time(rows[0].scheduledAt):'Agenda em dia neste pipeline'}</small></span>${icon('chevron')}</a>`;
}
function agenda() {
  const rows=activitiesForPipeline().filter(a=>!a.completedAt).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)).slice(0,5);
  const won=db.deals.filter(d=>d.pipelineId===state.pipelineId&&d.status==='won').length;
  return `<aside class="panel agenda"><h2>Próximas atividades</h2><p class="subtitle">${esc(pipeline()?.name)} · pendências e agenda</p>${rows.map(a=>`<div class="agenda-item">${icon(a.type==='Email'?'email':a.type==='Ligação'?'phone':'calendar')}<div><strong>${esc(a.title)}</strong><small>${esc(deal(a.dealId)?company(deal(a.dealId).contactId):'Sem oportunidade')}</small><small>${date(a.scheduledAt)} · ${time(a.scheduledAt)}</small>${activityStatus(a).color==='red'?tag('Em atraso','red'):''}</div><button data-action="complete-activity" data-id="${a.id}" title="Concluir ${esc(a.title)}" aria-label="Concluir ${esc(a.title)}">${icon('check')}</button></div>`).join('')||empty('Agenda em dia','Nenhuma atividade pendente neste pipeline.')}<a class="plain" href="#atividades"><p class="help-text">Ver todas as atividades →</p></a><div class="agenda-bottom"><span>Oportunidades ganhas</span><b>${won}</b></div></aside>`;
}

function openDealForm(id='',stageId='') {
  const existing=deal(id),p=pipeline(); if(!p)return toast('Crie um pipeline primeiro.');
  showDialog(existing?'Editar oportunidade':'Nova oportunidade',`<div class="form-grid">${field('title','Título da oportunidade',existing?.title,'text',true,'required maxlength="140"')}${selectField('contactId','Contato',db.contacts,existing?.contactId,'Sem contato',true)}${field('value','Valor estimado (R$)',existing?.value??'','text',false,'required inputmode="decimal" placeholder="4.200,00"')}${field('expectedAt','Previsão de fechamento',existing?.expectedAt,'date')}${selectField('stageId','Etapa',p.stages,existing?.stageId||stageId||p.stages[0].id)}${selectField('owner','Responsável',owners(),existing?.owner,'Não atribuído')}${field('channel','Origem',existing?.channel||'','text',true,'placeholder="Indicação, site, evento…"')}${selectField('progressLabel','Etiqueta de andamento',['Novo','Qualificar','Em contato','Reunião agendada','Em proposta','Proposta enviada','Em avaliação','Negociação','Ajuste de proposta'].map(label=>({id:label,name:label})),existing?.progressStageId===existing?.stageId?existing?.progressLabel:'','Acompanhar a etapa',true)}<label class="field wide"><span>Anotações</span><textarea name="notes">${esc(existing?.notes)}</textarea></label></div><p class="help-text">Pipeline: ${esc(p.name)}. O contato pode ser cadastrado na área Contatos.</p>`,values=>{
    const input={...values,pipelineId:p.id,value:parseMoney(values.value)};
    return mutate(next=>{
      if(existing){
        const target=next.deals.find(d=>d.id===id);
        if(!values.title.trim())throw new Error('Informe o título da oportunidade.');
        if(target.stageId!==values.stageId)D.moveDeal(next,id,p.id,values.stageId);
        Object.assign(target,{title:values.title.trim(),contactId:values.contactId||null,value:input.value,owner:values.owner,channel:values.channel,expectedAt:values.expectedAt||null,notes:values.notes,progressLabel:values.progressLabel||'',progressStageId:values.stageId,updatedAt:new Date().toISOString()});
      }else {const created=D.createDeal(next,input);created.progressLabel=values.progressLabel||'';created.progressStageId=created.stageId;}
    },existing?'Oportunidade atualizada.':'Oportunidade criada.');
  },existing?'Salvar alterações':'Criar oportunidade');
}

function detail(id) {
  const d=deal(id);if(!d)return;
  const p=db.pipelines.find(p=>p.id===d.pipelineId),c=contact(d.contactId),stage=p?.stages.find(s=>s.id===d.stageId);
  const at=p?.stages.findIndex(s=>s.id===d.stageId)??0;
  const eventLabels={form_submitted:'Novo preenchimento do formulário',created:'Oportunidade criada',stage_changed:'Etapa alterada',pipeline_transferred:'Pipeline alterado',won:'Oportunidade ganha',lost:'Oportunidade perdida',reopened:'Oportunidade reaberta'};
  const history=db.events.filter(e=>e.dealId===id).sort((a,b)=>b.at.localeCompare(a.at));
  const tasks=db.activities.filter(a=>a.dealId===id&&!a.cancelledAt);
  showDialog(esc(company(d.contactId)),`<p class="muted">${esc(d.title)}</p><div class="detail-money">${money(d.value)}</div>${tag(d.status==='won'?'Ganha':d.status==='lost'?'Perdida':stage?.name,d.status==='won'?'green':d.status==='lost'?'red':'')}<div class="stage-progress" aria-label="Etapa ${at+1} de ${p.stages.length}: ${esc(stage?.name)}">${p.stages.map((s,i)=>`<span class="${i<=at?'passed':''}" title="${esc(s.name)}"></span>`).join('')}</div><div class="detail-actions">${d.status==='open'?btn('won','Marcar como ganha','',`data-id="${id}"`,'check')+btn('lost','Marcar como perdida','danger',`data-id="${id}"`):btn('reopen','Reabrir oportunidade','',`data-id="${id}"`)}${btn('move','Mover / transferir','',`data-id="${id}"`)}${btn('edit-deal','Editar','',`data-id="${id}"`)}</div><dl class="detail-grid"><div><dt>Pipeline</dt><dd>${esc(p.name)}</dd></div><div><dt>Responsável</dt><dd>${esc(d.owner||'Não atribuído')}</dd></div><div><dt>Contato</dt><dd>${esc(c?.name||'Sem contato')}</dd></div><div><dt>Origem</dt><dd>${esc(d.channel||'Não informada')}</dd></div><div><dt>Email</dt><dd>${esc(c?.email||'Não informado')}</dd></div><div><dt>Previsão</dt><dd>${date(d.expectedAt)}</dd></div></dl>${d.lossReason?`<div class="hint"><strong>Motivo da perda</strong>${esc(d.lossReason)}</div>`:''}<div class="detail-section"><div class="panel-head"><h3>Próximas atividades</h3>${btn('new-activity','Adicionar','plain',`data-deal="${id}"`,'plus')}</div>${tasks.map(a=>`<div class="setting-row"><div><strong>${esc(a.title)}</strong><p>${date(a.scheduledAt)} · ${time(a.scheduledAt)} · ${esc(a.type)}</p></div>${a.completedAt?tag('Realizada','green'):btn('complete-detail-activity','Concluir','',`data-id="${a.id}" data-deal="${id}"`)}</div>`).join('')||'<p class="help-text">Nenhuma atividade vinculada.</p>'}</div>${d.notes?`<div class="detail-section"><h3>Anotações</h3><p class="help-text">${esc(d.notes)}</p></div>`:''}<div class="detail-section"><h3>Histórico da oportunidade</h3>${history.map(e=>`<div class="timeline-item">${esc(eventLabels[e.kind]||e.kind)}${e.kind==='pipeline_transferred'?`<small>${esc(db.pipelines.find(p=>p.id===e.fromPipelineId)?.name)} → ${esc(db.pipelines.find(p=>p.id===e.toPipelineId)?.name)}</small>`:''}${e.reason?`<small>${esc(e.reason)}</small>`:''}${e.formId&&e.notes?`<p class="capture-history-notes">${esc(e.notes)}</p>`:''}<small>${date(e.at)} · ${time(e.at)}</small></div>`).join('')}</div>`,null,'','detail-dialog');
}

function renderContacts() {
  return header('Contatos','Pessoas e empresas, com informações no lugar certo.',btn('import','Importar','', 'data-kind="contacts"','download')+btn('new-contact','Novo contato','primary','','plus'))+`<div class="table-wrap"><table><thead><tr><th>Nome</th><th>Empresa</th><th>Email</th><th>Telefone</th><th>Origem</th><th></th></tr></thead><tbody>${db.contacts.map(c=>`<tr><td><strong>${esc(c.name)}</strong><small>${esc(c.role)}</small></td><td>${esc(c.organization||'—')}${c.cnpj?`<small>CNPJ ${esc(c.cnpj)}</small>`:''}</td><td>${esc(c.email||'—')}</td><td>${esc(c.phone||'—')}</td><td>${esc(c.channel||'—')}</td><td>${btn('edit-contact','Editar','plain',`data-id="${c.id}"`)}${btn('remove-contact','Excluir','plain',`data-id="${c.id}"`)}</td></tr>`).join('')||'<tr><td colspan="6">Nenhum contato. Cadastre ou importe a sua planilha.</td></tr>'}</tbody></table></div><p class="help-text">Contatos são compartilhados entre os pipelines desta demonstração. Oportunidades e atividades mantêm o próprio pipeline.</p>`;
}
function contactForm(id='') {
  const c=contact(id);
  showDialog(c?'Editar contato':'Novo contato',`<div class="form-grid">${cnpjFields(esc,c)}${field('name','Nome completo',c?.name,'text',true,'required maxlength="120"')}${field('email','Email',c?.email,'email')}${field('phone','Telefone',c?.phone,'tel')}${field('organization','Empresa',c?.organization)}${field('role','Cargo',c?.role)}${field('channel','Origem',c?.channel,'text',true)}</div>`,values=>mutate(next=>{
    if(c){const temp=D.createContact({...next,contacts:[]},values);Object.assign(next.contacts.find(x=>x.id===id),{...temp,id,createdAt:c.createdAt});}
    else D.createContact(next,values);
  },c?'Contato atualizado.':'Contato criado.'));
}
function renderProducts() {
  return header('Produtos e serviços','Um catálogo simples para suas ofertas comerciais.',btn('import','Importar','', 'data-kind="products"','download')+btn('new-product','Novo produto','primary','','plus'))+`<div class="table-wrap"><table><thead><tr><th>Produto / serviço</th><th class="number">Preço de referência</th><th></th></tr></thead><tbody>${db.products.map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td class="number">${money(p.price)}</td><td class="number">${btn('edit-product','Editar','plain',`data-id="${p.id}"`)}${btn('remove-product','Excluir','plain',`data-id="${p.id}"`)}</td></tr>`).join('')||'<tr><td colspan="3">Nenhum produto cadastrado.</td></tr>'}</tbody></table></div><p class="help-text">Nesta versão, o valor da oportunidade é informado diretamente; os produtos ainda não compõem itens de orçamento.</p>`;
}
function productForm(id='') {
  const p=db.products.find(p=>p.id===id);
  showDialog(p?'Editar produto':'Novo produto',`<div class="form-grid">${field('name','Nome do produto ou serviço',p?.name,'text',true,'required maxlength="140"')}${field('price','Preço (R$)',p?.price,'text',true,'required inputmode="decimal" placeholder="1.500,00"')}</div>`,values=>mutate(next=>{
    const price=parseMoney(values.price);if(!values.name.trim())throw new Error('Informe o nome do produto.');
    if(p)Object.assign(next.products.find(x=>x.id===id),{name:values.name.trim(),price});
    else next.products.push({id:D.uid(),name:values.name.trim(),price});
  },p?'Produto atualizado.':'Produto criado.'));
}

function renderActivities() {
  let rows=activitiesForPipeline().sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt));
  if(state.activityFilter==='pending')rows=rows.filter(a=>!a.completedAt);
  if(state.activityFilter==='overdue')rows=rows.filter(a=>activityStatus(a).color==='red');
  if(state.activityFilter==='completed')rows=rows.filter(a=>a.completedAt);
  const filter=`<label>Exibir<select data-filter="activity-status">${option([{id:'all',name:'Todas'},{id:'pending',name:'Pendentes'},{id:'overdue',name:'Em atraso'},{id:'completed',name:'Realizadas'}],state.activityFilter)}</select></label>`;
  return header('Atividades','A próxima ação mantém o relacionamento em movimento.',btn('new-activity','Nova atividade','primary','','plus'))+toolbar(filter)+`<div class="table-wrap"><table><thead><tr><th>Atividade</th><th>Oportunidade</th><th>Quando</th><th>Responsável</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(a=>`<tr><td><strong>${esc(a.title)}</strong><small>${esc(a.type)}</small></td><td>${esc(deal(a.dealId)?.title||'Sem oportunidade')}</td><td>${date(a.scheduledAt)}<small>${time(a.scheduledAt)}</small></td><td>${esc(a.owner||'Não atribuído')}</td><td>${tag(activityStatus(a).name,activityStatus(a).color)}</td><td>${a.completedAt?'':btn('complete-activity','Concluir','',`data-id="${a.id}"`)}${btn('edit-activity','Editar','plain',`data-id="${a.id}"`)}${btn('cancel-activity','Cancelar','plain',`data-id="${a.id}"`)}</td></tr>`).join('')||'<tr><td colspan="6">Nenhuma atividade neste filtro.</td></tr>'}</tbody></table></div>`;
}
function activityForm({id='',dealId='',day='',type='',title=''}={}) {
  const a=db.activities.find(a=>a.id===id),d=deal(dealId||a?.dealId),pipelineId=d?.pipelineId||a?.pipelineId||state.pipelineId;
  if(!pipelineId)return toast('Crie um pipeline primeiro.');
  const schedule=a?.scheduledAt?localTime(a.scheduledAt):day?`${day}T09:00`:localTime();
  showDialog(a?'Editar atividade':'Nova atividade',`<div class="form-grid">${field('title','O que precisa ser feito?',a?.title||title,'text',true,'required maxlength="140"')}${selectField('type','Tipo',db.activityTypes.map(t=>({id:t,name:t})),a?.type||type||'Ligação')}${selectField('owner','Responsável',owners(),a?.owner||d?.owner,'Não atribuído')}${field('scheduledAt','Data e horário',schedule,'datetime-local',true,'required')}${selectField('dealId','Oportunidade',db.deals.filter(d=>d.pipelineId===pipelineId).map(d=>({id:d.id,name:d.title+' · '+company(d.contactId)})),dealId||a?.dealId,'Sem oportunidade',true)}<label class="field wide"><span>Anotações</span><textarea name="notes">${esc(a?.notes)}</textarea></label></div><p class="help-text">Pipeline: ${esc(db.pipelines.find(p=>p.id===pipelineId)?.name)}. Concluir uma atividade não envia mensagens.</p>`,values=>mutate(next=>{
    const input={...values,pipelineId,scheduledAt:new Date(values.scheduledAt).toISOString()};
    if(a){const temp=D.createActivity({...next,activities:[]},input);Object.assign(next.activities.find(x=>x.id===id),{...temp,id,createdAt:a.createdAt,completedAt:a.completedAt});}
    else D.createActivity(next,input);
  },a?'Atividade atualizada.':'Atividade agendada.'));
}
function renderCalendar() {
  const month=state.month;
  const start=new Date(month.getFullYear(),month.getMonth(),1);start.setDate(start.getDate()-start.getDay());
  const tasks=activitiesForPipeline();
  const title=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(month);
  return header('Calendário','Agenda do pipeline selecionado.',btn('new-activity','Nova atividade','primary','','plus'))+toolbar(`<div class="grow"></div><div class="actions">${btn('calendar-prev','←','','aria-label="Mês anterior"')}<strong>${esc(title)}</strong>${btn('calendar-next','→','','aria-label="Próximo mês"')}${btn('calendar-today','Hoje')}</div>`)+`<div class="calendar"><div class="calendar-head">${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(day=>`<span>${day}</span>`).join('')}</div><div class="calendar-grid">${Array.from({length:42},(_,i)=>{
    const day=new Date(start);day.setDate(day.getDate()+i);const key=localDate(day),matches=tasks.filter(a=>localDate(a.scheduledAt)===key);
    return `<div class="calendar-day ${day.getMonth()!==month.getMonth()?'outside':''} ${key===localDate()?'today':''}" data-action="calendar-day" data-day="${key}" tabindex="0" role="button" aria-label="Adicionar atividade em ${esc(date(key))}"><span class="day-number">${day.getDate()}</span>${matches.slice(0,3).map(a=>`<div class="calendar-event ${a.completedAt?'done':''}" title="${esc(a.title)}">${time(a.scheduledAt)} ${esc(a.title)}</div>`).join('')}${matches.length>3?`<small>+${matches.length-3} atividades</small>`:''}</div>`;
  }).join('')}</div></div><p class="help-text">Clique em um dia para agendar. Edite ou conclua atividades na área Atividades.</p>`;
}

function renderReports() {
  const r=report();if(!r)return header('Relatórios','Crie um pipeline para começar.');
  const filters=`<label>Período<select data-filter="period">${option([{id:'all',name:'Todo o histórico'},{id:'month',name:'Este mês'},{id:'30',name:'Últimos 30 dias'}],state.period)}</select></label><div class="grow"></div>${btn('export-report','Exportar resumo','','','download')}`;
  const tabs=`<div class="report-tabs" aria-label="Tipo de relatório">${[['operacao','Operação'],['comercial','Comercial'],['gestao','Gestão']].map(([key,title])=>`<button aria-pressed="${state.dashboard===key}" data-action="dashboard" data-dashboard="${key}" class="${state.dashboard===key?'selected':''}">${title}</button>`).join('')}</div>`;
  let body='';
  if(state.dashboard==='operacao'){
    const a=r.activities;
    const activityRows=db.activityTypes.map(type=>r.activityTypes.find(t=>t.type===type)||{type,created:0,scheduled:0,overdue:0,completed:0});
    body=`<div class="stats-row">${stat('Atividades criadas',number(a.created),'Pela data de criação','blue','plus')}${stat('Agendadas',number(a.scheduled),'Pendentes, com data futura','amber','calendar')}${stat('Em atraso',number(a.overdue),'Pendentes, com prazo vencido','red','activity')}${stat('Realizadas',number(a.completed),'Pela data de conclusão','green','check')}</div><div class="two-column"><section class="panel"><div class="panel-head"><h2>Atividades por tipo</h2><small>Criadas no período</small></div>${bars(activityRows.map(a=>({label:a.type,value:a.created})))}</section><section class="panel"><div class="panel-head"><h2>Execução da equipe</h2><small>Concluídas no período</small></div>${bars((db.team||[]).map(member=>({label:member.name,value:activitiesForPipeline().filter(a=>a.owner===member.name&&a.completedAt&&(!periods().from||a.completedAt>=periods().from)&&(!periods().to||a.completedAt<=periods().to)).length})),false,'var(--green)')}</section></div><div class="table-wrap"><table class="activity-table"><thead><tr><th>Tipo de atividade</th><th>Criadas</th><th>Agendadas</th><th>Atrasadas</th><th>Realizadas</th></tr></thead><tbody>${activityRows.map(a=>`<tr><td>${esc(a.type)}</td><td><span class="data-dot">${a.created}</span></td><td><span class="data-dot amber">${a.scheduled}</span></td><td><span class="data-dot red">${a.overdue}</span></td><td><span class="data-dot green">${a.completed}</span></td></tr>`).join('')}</tbody></table></div><p class="help-text">Criadas e realizadas são eventos e podem se referir à mesma atividade em momentos distintos. Agendadas e atrasadas são pendências com vencimento no período. Atividades preservam o pipeline em que foram registradas.</p>`;
  }else if(state.dashboard==='comercial'){
    body=`<div class="stats-row">${stat('Vendas no período',money(r.sales),`${r.wonCount} encerramentos como ganho`,'green','check')}${stat('Em aberto agora',money(r.forecast),`${r.openCount} oportunidades · estoque atual`,'','board')}${stat('Novas oportunidades',number(r.created),'Criações neste pipeline','blue','plus')}${stat('Conversão de encerramentos',percent(r.conversion),'Ganhos ÷ (ganhos + perdas)','','reports')}</div><div class="two-column"><section class="panel"><div class="panel-head"><h2>Oportunidades por etapa</h2><small>Em aberto agora</small></div>${bars(r.stages.map(s=>({label:s.name,value:s.count})))}</section><section class="panel"><div class="panel-head"><h2>Entradas, saídas e perdas</h2><small>No período selecionado</small></div>${bars([{label:'Criadas',value:r.created},{label:'Recebidas de outro funil',value:r.transferredIn},{label:'Enviadas a outro funil',value:r.transferredOut},{label:'Ganhas',value:r.wonCount},{label:'Perdidas',value:r.lostCount}])}</section></div><div class="table-wrap"><table><thead><tr><th>Etapa</th><th class="number">Oportunidades abertas</th><th class="number">Valor em aberto</th></tr></thead><tbody>${r.stages.map(s=>`<tr><td>${esc(s.name)}</td><td class="number">${s.count}</td><td class="number">${money(s.value)}</td></tr>`).join('')}</tbody></table></div>`;
  }else{
    const wonEvents=db.events.filter(e=>e.pipelineId===state.pipelineId&&e.kind==='won'&&(!periods().from||e.at>=periods().from)&&(!periods().to||e.at<=periods().to));
    const channels=[...new Set(db.deals.filter(d=>d.pipelineId===state.pipelineId).map(d=>d.channel||'Não informada'))].map(channel=>({label:channel,value:db.deals.filter(d=>d.pipelineId===state.pipelineId&&(d.channel||'Não informada')===channel).length})).sort((a,b)=>b.value-a.value);
    const reasons=[...new Set(db.events.filter(e=>e.pipelineId===state.pipelineId&&e.kind==='lost'&&(!periods().from||e.at>=periods().from)&&(!periods().to||e.at<=periods().to)).map(e=>e.reason))].map(reason=>({label:reason,value:db.events.filter(e=>e.pipelineId===state.pipelineId&&e.kind==='lost'&&e.reason===reason&&(!periods().from||e.at>=periods().from)&&(!periods().to||e.at<=periods().to)).length}));
    body=`<div class="stats-row">${stat('Vendas',money(r.sales),'Encerramentos no período','green','reports')}${stat('Ticket médio',r.ticket==null?'—':money(r.ticket),'Valor dos ganhos ÷ encerramentos','','product')}${stat('Oportunidades perdidas',number(r.lostCount),money(r.lostValue)+' em valor perdido','red','activity')}${stat('Transferências recebidas',number(r.transferredIn),'Histórico deste pipeline','blue','journey')}</div><div class="two-column"><section class="panel"><div class="panel-head"><h2>Metas deste pipeline</h2>${btn('new-goal','Nova meta','plain','','plus')}</div>${goalCards()}</section><section class="panel"><div class="panel-head"><h2>Vendas nos últimos 7 dias</h2><small>Por encerramento</small></div>${salesChart(wonEvents)}</section></div><div class="two-column"><section class="panel"><div class="panel-head"><h2>Origem das oportunidades</h2><small>Carteira atual, todos os status</small></div>${bars(channels)}</section><section class="panel"><div class="panel-head"><h2>Motivos de perda</h2><small>No período</small></div>${bars(reasons,false,'var(--red)')}</section></div>`;
  }
  return header('Relatórios','Três visões prontas. Um pipeline por vez.')+toolbar(filters,false,'reports-toolbar')+tabs+body+`<p class="report-note">Atualizado pelas alterações desta demonstração. Estoque atual e eventos do período são medidas diferentes. Ganhos e perdas contam encerramentos; reaberturas preservam o histórico e podem gerar novos encerramentos. A previsão é a soma simples dos valores em aberto, sem ponderação de probabilidade.</p>`;
}
function salesChart(events) {
  const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return {key:localDate(d),label:date(localDate(d)),value:0};});
  for(const day of days)day.value=events.filter(e=>localDate(e.at)===day.key).reduce((n,e)=>n+e.value,0);
  const max=Math.max(...days.map(d=>d.value),1);
  const points=days.map((d,i)=>`${15+i*70},${135-d.value/max*110}`).join(' ');
  return `<svg class="chart-svg" viewBox="0 0 450 160" role="img" aria-label="Vendas dos últimos sete dias: ${esc(days.map(d=>d.label+' '+money(d.value)).join('; '))}"><path d="M15 135H435M15 80H435M15 25H435" stroke="#ebe6f0" fill="none"/><polyline points="${points}" stroke="#62317b" fill="none" stroke-width="3"/>${days.map((d,i)=>`<circle cx="${15+i*70}" cy="${135-d.value/max*110}" r="4" fill="#62317b"><title>${esc(d.label)}: ${money(d.value)}</title></circle>`).join('')}</svg><div class="chart-caption"><span>${days[0].label}</span><span>Total: ${money(days.reduce((n,d)=>n+d.value,0))}</span><span>${days[6].label}</span></div>`;
}
function goalCards() {
  const goals=db.goals.filter(g=>g.pipelineId===state.pipelineId);
  return goals.map(g=>{
    const end=new Date(Number(g.month.slice(0,4)),Number(g.month.slice(5,7)),1).toISOString();
    const start=new Date(g.month+'-01T00:00:00').toISOString();
    const r=D.pipelineReport(db,state.pipelineId,{from:start,to:new Date(new Date(end).getTime()-1).toISOString()});
    const value=g.type==='count'?r.wonCount:r.sales,pct=value/g.target;
    return `<div class="pipeline-setting"><div class="panel-head"><h3>${esc(g.month.split('-').reverse().join('/'))} · ${g.type==='count'?'Quantidade de ganhos':'Valor vendido'}</h3>${btn('remove-goal','Excluir','plain',`data-id="${g.id}"`)}</div><div class="goal-value">${g.type==='count'?number(value):money(value)} <small>/ ${g.type==='count'?number(g.target):money(g.target)}</small></div><div class="progress" role="progressbar" aria-label="Progresso da meta" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100,Math.round(pct*100))}"><span style="width:${Math.min(100,pct*100)}%"></span></div><p class="goal-detail">${percent(pct)} da meta · ${esc(pipeline()?.name)}</p></div>`;
  }).join('')||empty('Sua primeira meta','Defina o valor ou a quantidade de ganhos para um mês.');
}

function renderJourneys() { return automation.render(); }
function applyJourneys(next,events) { runAutomations(next,events); }

function renderSettings() {
  return header('Configurações','Organize o processo comercial do novo aplicativo.')+`<div class="settings-grid"><section class="panel"><div class="panel-head"><h2>Pipelines e etapas</h2>${btn('new-pipeline','Novo pipeline','plain','','plus')}</div>${db.pipelines.map(p=>`<div class="pipeline-setting"><h3>${esc(p.name)}${btn('rename-pipeline','Renomear','plain',`data-id="${p.id}"`)}${btn('remove-pipeline','Excluir','plain',`data-id="${p.id}"`)}</h3><div>${p.stages.map(s=>`<span class="stage-chip">${esc(s.name)}<button data-action="stage-menu" data-id="${s.id}" data-pipeline="${p.id}" aria-label="Configurar ${esc(s.name)}">•••</button></span>`).join('')}${btn('new-stage','Adicionar etapa','plain',`data-pipeline="${p.id}"`,'plus')}</div></div>`).join('')}</section><section class="panel"><div class="panel-head"><h2>Tipos de atividade</h2>${btn('new-activity-type','Adicionar','plain','','plus')}</div>${db.activityTypes.map(t=>`<div class="setting-row"><strong>${esc(t)}</strong>${tag('Disponível')}</div>`).join('')}<p class="help-text">Os tipos são usados na agenda, nas jornadas e nos relatórios.</p></section><section class="panel"><div class="panel-head"><h2>Equipe demonstrativa</h2>${btn('new-member','Adicionar','plain','','plus')}</div>${(db.team||[]).map(m=>`<div class="setting-row"><div><strong>${esc(m.name)}</strong><p>${esc(m.email)}</p></div>${btn('remove-member','Remover','plain',`data-id="${m.id}"`)}</div>`).join('')}<p class="help-text">Estes são responsáveis locais para testes. Não são contas de acesso. Login, convites e permissões reais serão conectados a um projeto exclusivo de autenticação.</p></section><section class="panel"><div class="panel-head"><h2>Dados e metas</h2></div><div class="setting-row"><div><strong>Importação padronizada</strong><p>Contatos e produtos, com prévia e validação.</p></div>${btn('import','Abrir','', 'data-kind="contacts"')}</div><div class="setting-row"><div><strong>Metas do pipeline</strong><p>Valor ou quantidade de ganhos por mês.</p></div>${btn('new-goal','Criar meta')}</div><div class="setting-row"><div><strong>Backup da demonstração</strong><p>Exporta os dados locais em JSON.</p></div>${btn('backup','Exportar')}</div><div class="setting-row"><div><strong>Começar com base vazia</strong><p>Apaga apenas esta demonstração local.</p></div>${btn('empty-data','Esvaziar','danger')}</div></section><section class="panel"><div class="panel-head"><h2>Integrações e acesso</h2></div>${[['email','Email','Gmail: configure e autorize a conta na nova área Email para envio individual e consulta de respostas.'],['phone','WhatsApp','Teste por QR Code e atendimento manual disponíveis na área Conversas deste computador.'],['contacts','Autenticação compartilhada','É necessário um banco e um serviço de autenticação exclusivos.']].map(([glyph,label,text])=>`<div class="integration">${icon(glyph)}<div><h3>${label} ${tag(['WhatsApp','Email'].includes(label)?'Teste local':'Não conectado',['WhatsApp','Email'].includes(label)?'':'amber')}</h3><p>${text}</p></div></div>`).join('')}</section><section class="panel"><div class="panel-head"><h2>Independência do projeto</h2></div><p class="help-text">Este aplicativo usa uma chave própria de armazenamento e não se conecta ao banco, ao repositório ou à publicação do CRM anterior.</p><p class="help-text">Projeto: <strong>poliniza-crm-next</strong><br>Versão: 0.1 · validação local<br>Dados: somente neste navegador</p>${btn('reset-demo','Restaurar exemplos','')}</section></div>`;
}

function stageMenu(stageId,pipelineId=state.pipelineId) {
  const p=db.pipelines.find(p=>p.id===pipelineId),s=p?.stages.find(s=>s.id===stageId);if(!s)return;
  showDialog('Configurar etapa',`<p class="help-text">${esc(p.name)}</p><div class="form-grid">${field('name','Nome da etapa',s.name,'text',true,'required maxlength="80"')}</div><div class="actions" style="margin-top:20px">${btn('stage-left','← Mover à esquerda','',`data-id="${s.id}" data-pipeline="${p.id}" ${p.stages[0].id===s.id?'disabled':''}`)}${btn('stage-right','Mover à direita →','',`data-id="${s.id}" data-pipeline="${p.id}" ${p.stages.at(-1).id===s.id?'disabled':''}`)}${btn('remove-stage','Excluir etapa','danger',`data-id="${s.id}" data-pipeline="${p.id}"`)}</div><p class="help-text">Etapas com oportunidades não podem ser excluídas. Ganhos e perdas são status, não etapas.</p>`,values=>mutate(next=>D.renameStage(next,p.id,s.id,values.name),'Etapa renomeada.'));
}
function pipelineForm(id='') {
  const p=db.pipelines.find(p=>p.id===id);
  showDialog(p?'Renomear pipeline':'Novo pipeline',`<div class="form-grid">${field('name','Nome do pipeline',p?.name,'text',true,'required maxlength="80"')}</div>${p?'':'<p class="help-text">Começa com Leads, Contato, Proposta e Negociação. Você poderá personalizar as etapas.</p>'}`,values=>mutate(next=>{
    if(p){if(!values.name.trim())throw new Error('Informe o nome.');if(next.pipelines.some(x=>x.id!==id&&x.name.toLowerCase()===values.name.trim().toLowerCase()))throw new Error('Já existe um pipeline com esse nome.');next.pipelines.find(x=>x.id===id).name=values.name.trim();}
    else state.pipelineId=D.createPipeline(next,values.name).id;
  },p?'Pipeline renomeado.':'Pipeline criado.'));
}

function moveForm(id) {
  const d=deal(id);if(d?.status!=='open')return toast('Reabra a oportunidade antes de movimentar.');
  showDialog('Mover oportunidade',`<div class="form-grid">${selectField('pipelineId','Pipeline de destino',db.pipelines,d.pipelineId,'',true)}${selectField('stageId','Etapa de destino',db.pipelines.find(p=>p.id===d.pipelineId).stages,d.stageId,'',true)}</div><p class="help-text">O histórico de origem é preservado. As atividades existentes continuam no pipeline em que foram registradas.</p>`,values=>mutate(next=>D.moveDeal(next,id,values.pipelineId,values.stageId),'Oportunidade movimentada.'));
  $('[name=pipelineId]',modal).addEventListener('change',event=>{$('[name=stageId]',modal).innerHTML=option(db.pipelines.find(p=>p.id===event.target.value).stages,'');});
}
function goalForm() {
  if(!pipeline())return toast('Crie um pipeline primeiro.');
  showDialog('Nova meta',`<div class="form-grid">${field('month','Mês',localDate().slice(0,7),'month',true,'required')}${selectField('type','Medida',[{id:'value',name:'Valor vendido (R$)'},{id:'count',name:'Quantidade de ganhos'}],'value')}${field('target','Objetivo','','text',false,'required inputmode="decimal"')}</div><p class="help-text">Pipeline: ${esc(pipeline().name)}. O progresso usa encerramentos no mês da meta.</p>`,values=>mutate(next=>{
    const target=parseMoney(values.target);if(target<=0)throw new Error('A meta deve ser maior que zero.');
    if(values.type==='count'&&!Number.isInteger(target))throw new Error('A quantidade deve ser um número inteiro.');
    if(next.goals.some(g=>g.pipelineId===state.pipelineId&&g.month===values.month&&g.type===values.type))throw new Error('Já existe uma meta desta medida para este mês e pipeline.');
    next.goals.push({id:D.uid(),pipelineId:state.pipelineId,month:values.month,type:values.type,target});
  },'Meta criada.'));
}

function download(filename,content,type='text/csv;charset=utf-8') {
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importForm(kind='contacts') {
  state.importPreview=null;
  showDialog('Importar planilha',`<div class="form-grid">${selectField('kind','O que importar',[{id:'contacts',name:'Contatos'},{id:'products',name:'Produtos e serviços'}],kind,'',true)}<div class="field wide"><span>1. Use o modelo padronizado</span>${btn('download-template','Baixar modelo CSV','','','download')}<small>O CSV abre no Excel. Preencha e salve como CSV UTF-8, mantendo os cabeçalhos.</small></div><label class="field wide"><span>2. Escolha o arquivo CSV</span><input type="file" id="import-file" accept=".csv,text/csv"><small>Até 2 MB. Arquivos .xlsx precisam ser salvos como CSV nesta versão.</small></label><div id="import-preview" class="wide"></div></div>`,()=>{
    if(!state.importPreview)throw new Error('Escolha uma planilha para validar antes de importar.');
    const result=commitImport(db,state.importPreview);return mutate(next=>Object.assign(next,result.db),`${result.result} registro(s) importado(s). Duplicados e linhas inválidas foram ignorados.`);
  },'Importar linhas válidas');
  $('[name=kind]',modal).addEventListener('change',()=>{state.importPreview=null;$('#import-file').value='';$('#import-preview').innerHTML='';});
  $('#import-file').addEventListener('change',async event=>{
    try {
      const file=event.target.files[0];if(!file)return;
      if(!file.name.toLowerCase().endsWith('.csv'))throw new Error('Salve a planilha no formato CSV UTF-8.');
      const kind=$('[name=kind]',modal).value;
      state.importPreview=previewImport(db,kind,await file.text());const p=state.importPreview;
      $('#import-preview').innerHTML=`<div class="import-summary">${tag(`${p.ready} válidas`,'green')}${tag(`${p.duplicates} duplicadas`,'amber')}${tag(`${p.errors} com erro`,'red')}</div><div class="table-wrap"><table><thead><tr><th>Linha</th><th>Nome</th><th>Validação</th></tr></thead><tbody>${p.rows.slice(0,50).map(row=>`<tr><td>${row.line}</td><td>${esc(row.data?.name||'—')}</td><td>${row.status==='ready'?tag('Pronta','green'):esc(row.message)}</td></tr>`).join('')}</tbody></table></div><p class="help-text">Prévia de até 50 linhas. Apenas as linhas válidas serão inseridas. ${p.rows.length} linhas de dados no arquivo.</p>`;$('.form-error',modal).textContent='';
    }catch(error){state.importPreview=null;$('#import-preview').innerHTML='';$('.form-error',modal).textContent=error.message;}
  });
}

const automation=createAutomationEditor({getDB:()=>db,pipelineId:()=>state.pipelineId,esc,btn,field,selectField,showDialog,mutate,toast,header,toolbar,tag,confirm,render});

const conversations=createConversations({esc,btn,icon,header,field,showDialog,toast,confirm,render});
const emails=createEmails({esc,btn,header,field,showDialog,toast,confirm,render});
const leadForms=createLeadForms({cloud:()=>cloud,db:()=>db,esc,render,toast});
cloud=createCloud({esc,toast,onChange:render,onData:incoming=>{db=incoming||D.emptyDatabase();loadError='';state.pipelineId=db.pipelines.find(p=>p.id===state.pipelineId)?.id||db.pipelines[0]?.id;}});

const actions={
  'quick-email':el=>activityForm({dealId:el.dataset.id,type:'Email',title:'Enviar email'}),
  'quick-whatsapp':el=>activityForm({dealId:el.dataset.id,type:'WhatsApp',title:'Entrar em contato pelo WhatsApp'}),
  'quick-note':el=>showDialog('Adicionar anotação',`<label class="field"><span>Anotação da oportunidade</span><textarea name="note" required maxlength="5000"></textarea></label>`,values=>mutate(next=>{const target=next.deals.find(d=>d.id===el.dataset.id);const note=values.note.trim();if(!note)throw new Error('Escreva uma anotação.');target.notes=[target.notes,localDate()+' · '+note].filter(Boolean).join('\n\n');},'Anotação adicionada.')),
  'about':()=>showDialog('Sobre esta versão',`<div class="notice-grid"><div><h3>Projeto independente</h3><p>Novo Poliniza CRM, criado com base no levantamento do Funil de Vendas. O CRM anterior permanece separado.</p></div><div><h3>Validação local</h3><p>O CRM usa dados fictícios neste navegador e não tem login de produção. Conversas é um teste separado de WhatsApp real, com envio manual.</p></div><div><h3>Já pode testar</h3><p>Funis, etapas, oportunidades, contatos, atividades, calendário, produtos, importação CSV, relatórios, metas e jornadas locais.</p></div><div><h3>Próxima conexão</h3><p>Projeto exclusivo de banco e autenticação, integrações e hospedagem própria. Não cadastre dados sensíveis nesta demonstração.</p></div></div>`),
  'close-modal':()=>modal.close(), 'new-deal':el=>openDealForm('',el.dataset.stage), 'edit-deal':el=>openDealForm(el.dataset.id), 'detail':el=>detail(el.dataset.id),
  'new-pipeline':()=>pipelineForm(), 'rename-pipeline':el=>pipelineForm(el.dataset.id),
  'remove-pipeline':el=>confirm('Excluir pipeline?','A exclusão só será permitida se não houver registros nem histórico vinculados.',()=>mutate(next=>D.removePipeline(next,el.dataset.id),'Pipeline excluído.')),
  'board-mode':el=>{state.mode=el.dataset.mode;render();},
  'stage-menu':el=>stageMenu(el.dataset.id,el.dataset.pipeline||state.pipelineId),
  'new-stage':el=>showDialog('Adicionar etapa',`<div class="form-grid">${field('name','Nome da etapa','','text',true,'required maxlength="80"')}</div>`,values=>mutate(next=>D.addStage(next,el.dataset.pipeline||state.pipelineId,values.name),'Etapa criada.')),
  'remove-stage':async el=>{try{await mutate(next=>D.removeStage(next,el.dataset.pipeline||state.pipelineId,el.dataset.id),'Etapa excluída.');modal.close();}catch(error){$('.form-error',modal).textContent=error.message;}},
  'stage-left':el=>reorder(el,-1), 'stage-right':el=>reorder(el,1),
  'won':async el=>{await mutate(next=>D.setDealStatus(next,el.dataset.id,'won'),'Oportunidade marcada como ganha.');detail(el.dataset.id);},
  'lost':el=>showDialog('Registrar perda',`<div class="form-grid">${field('reason','Qual foi o motivo da perda?','','text',true,'required maxlength="180"')}</div>`,values=>{mutate(next=>D.setDealStatus(next,el.dataset.id,'lost',values.reason),'Perda registrada.');return()=>detail(el.dataset.id);},'Registrar perda'),
  'reopen':async el=>{await mutate(next=>D.setDealStatus(next,el.dataset.id,'open'),'Oportunidade reaberta.');detail(el.dataset.id);}, 'move':el=>moveForm(el.dataset.id),
  'new-contact':()=>contactForm(),'edit-contact':el=>contactForm(el.dataset.id),
  'remove-contact':el=>confirm('Excluir contato?','Esta ação remove apenas o contato local. Contatos vinculados a oportunidades são preservados.',()=>mutate(next=>{if(next.deals.some(d=>d.contactId===el.dataset.id))throw new Error('O contato está vinculado a oportunidades. Edite os vínculos antes de excluir.');next.contacts=next.contacts.filter(c=>c.id!==el.dataset.id);},'Contato excluído.')),
  'new-product':()=>productForm(),'edit-product':el=>productForm(el.dataset.id),
  'remove-product':el=>confirm('Excluir produto?','O item será removido do catálogo desta demonstração.',()=>mutate(next=>{next.products=next.products.filter(p=>p.id!==el.dataset.id);},'Produto excluído.')),
  'new-activity':el=>activityForm({dealId:el.dataset.deal}),'edit-activity':el=>activityForm({id:el.dataset.id}),
  'complete-activity':el=>mutate(next=>D.completeActivity(next,el.dataset.id),'Atividade concluída.'),
  'complete-detail-activity':async el=>{await mutate(next=>D.completeActivity(next,el.dataset.id),'Atividade concluída.');detail(el.dataset.deal);},
  'cancel-activity':el=>confirm('Cancelar atividade?','Ela sairá das pendências e dos indicadores desta demonstração.',()=>mutate(next=>{next.activities.find(a=>a.id===el.dataset.id).cancelledAt=new Date().toISOString();},'Atividade cancelada.')),
  'calendar-prev':()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);render();},'calendar-next':()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);render();},'calendar-today':()=>{state.month=new Date(new Date().getFullYear(),new Date().getMonth(),1);render();},'calendar-day':el=>activityForm({day:el.dataset.day}),
  'dashboard':el=>{state.dashboard=el.dataset.dashboard;render();},'new-goal':()=>goalForm(),
  'remove-goal':el=>confirm('Excluir meta?','O histórico das oportunidades será preservado.',()=>mutate(next=>{next.goals=next.goals.filter(g=>g.id!==el.dataset.id);},'Meta excluída.')),
  'new-member':()=>showDialog('Adicionar responsável local',`<div class="form-grid">${field('name','Nome','','text',true,'required maxlength="100"')}${field('email','Email de referência','','email',true,'required')}</div><p class="help-text">Não cria login e não envia convite. Este cadastro serve apenas para atribuir responsáveis na demonstração.</p>`,values=>mutate(next=>{if(!values.name.trim())throw new Error('Informe o nome.');if((next.team||[]).some(m=>m.name===values.name.trim()))throw new Error('Este responsável já está cadastrado.');next.team ||= [];next.team.push({id:D.uid(),name:values.name.trim(),email:values.email});},'Responsável local adicionado.')),
  'remove-member':el=>confirm('Remover responsável?','A remoção é bloqueada se houver oportunidades ou atividades atribuídas.',()=>mutate(next=>{const m=next.team.find(m=>m.id===el.dataset.id);if(next.deals.some(d=>d.owner===m.name)||next.activities.some(a=>a.owner===m.name))throw new Error('Reatribua os registros deste responsável antes de removê-lo.');next.team=next.team.filter(m=>m.id!==el.dataset.id);},'Responsável removido.')),
  'new-activity-type':()=>showDialog('Novo tipo de atividade',`<div class="form-grid">${field('name','Nome do tipo','','text',true,'required maxlength="60"')}</div>`,values=>mutate(next=>{const name=values.name.trim();if(!name)throw new Error('Informe o nome.');if(next.activityTypes.some(t=>t.toLowerCase()===name.toLowerCase()))throw new Error('Este tipo já existe.');next.activityTypes.push(name);},'Tipo adicionado.')),
  'new-journey':()=>automation.actions['new-journey'](), 'toggle-journey':el=>mutate(next=>{const j=next.journeys.find(j=>j.id===el.dataset.id);j.enabled=!j.enabled;},'Jornada atualizada.'),
  'remove-journey':el=>confirm('Excluir jornada?','As atividades já criadas por ela serão preservadas.',()=>mutate(next=>{next.journeys=next.journeys.filter(j=>j.id!==el.dataset.id);},'Jornada excluída.')),
  'import':el=>importForm(el.dataset.kind), 'download-template':()=>{const kind=$('[name=kind]',modal).value,t=templates[kind];download(`modelo-${kind==='contacts'?'contatos':'produtos'}-poliniza.csv`,csvExport(t.headers,[t.example]));},
  'backup':()=>download('poliniza-novo-backup.json',JSON.stringify(db,null,2),'application/json'),
  'export-report':()=>{const r=report();download('poliniza-relatorio-pipeline.csv',csvExport(['pipeline','periodo','vendas_eventos','ganhos_eventos','perdas_eventos','abertas_atual','valor_aberto_atual','criadas','transferidas_recebidas','transferidas_enviadas','atividades_criadas','atividades_agendadas','atividades_atrasadas','atividades_realizadas'],[[r.pipelineName,state.period,r.sales,r.wonCount,r.lostCount,r.openCount,r.forecast,r.created,r.transferredIn,r.transferredOut,r.activities.created,r.activities.scheduled,r.activities.overdue,r.activities.completed]]));},
  'reset-demo':()=>{if(cloud?.enabled)throw Error('A base online não pode ser substituída por exemplos.');return confirm('Restaurar dados de exemplo?','Substitui os dados deste novo aplicativo apenas neste navegador. Exporte um backup antes se quiser preservar seus testes.',()=>{store(demoDatabase());state.pipelineId=db.pipelines[0].id;render();toast('Exemplos restaurados.');},'Restaurar exemplos');},
  'empty-data':()=>{if(cloud?.enabled)throw Error('A base online não pode ser esvaziada por esta ação.');return confirm('Esvaziar esta demonstração?','Remove todos os dados locais deste novo aplicativo. O CRM anterior não será alterado. Exporte um backup antes de continuar.',()=>{const next=D.emptyDatabase();next.demo=true;next.team=[];next.journeys=[];next.automationRuns=[];D.createPipeline(next,'Meu pipeline');store(next);state.pipelineId=next.pipelines[0].id;render();toast('Base local vazia criada.');},'Esvaziar dados locais');},
  ...automation.actions,
  ...conversations.actions,
  ...emails.actions,
  ...cloud.actions,
  ...leadForms.actions,
};
async function reorder(el,offset) { const p=db.pipelines.find(p=>p.id===(el.dataset.pipeline||state.pipelineId));const ids=p.stages.map(s=>s.id),index=ids.indexOf(el.dataset.id),target=index+offset;if(target<0||target>=ids.length)return;[ids[index],ids[target]]=[ids[target],ids[index]];await mutate(next=>D.reorderStages(next,p.id,ids),'Ordem das etapas atualizada.');stageMenu(el.dataset.id,p.id); }

document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
  const action=actions[el.dataset.action];if(!action)return;
  document.querySelectorAll('.card-quick[open]').forEach(menu=>menu.removeAttribute('open'));
  try{await action(el);}catch(error){if(modal.open&&$('.form-error',modal))$('.form-error',modal).textContent=error.message;else toast(error.message);}
});
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.card-quick[open]').forEach(menu=>menu.removeAttribute('open'));const el=event.target.closest('[role=button][data-action]');if(el&&['Enter',' '].includes(event.key)){event.preventDefault();el.click();}});
document.addEventListener('change',event=>{
  const type=event.target.dataset.filter;
  if(type==='pipeline'){state.pipelineId=event.target.value;state.query='';render();}
  if(type==='deal-status'){state.status=event.target.value;render();}
  if(type==='activity-status'){state.activityFilter=event.target.value;render();}
  if(type==='period'){state.period=event.target.value;render();}
});
document.addEventListener('input',event=>{if(event.target.dataset.filter==='search'){const cursor=event.target.selectionStart;state.query=event.target.value;render();const input=$('[data-filter=search]');input?.focus();input?.setSelectionRange(cursor,cursor);}});
document.addEventListener('dragstart',event=>{const el=event.target.closest('[data-deal]');if(el){event.dataTransfer.setData('text/plain',el.dataset.deal);event.dataTransfer.effectAllowed='move';}});
document.addEventListener('dragover',event=>{const el=event.target.closest('[data-stage]');if(el&&el.classList.contains('stage')){event.preventDefault();el.classList.add('drag-over');}});
document.addEventListener('dragleave',event=>event.target.closest('.stage')?.classList.remove('drag-over'));
document.addEventListener('drop',async event=>{const stage=event.target.closest('.stage[data-stage]');if(stage){event.preventDefault();stage.classList.remove('drag-over');const id=event.dataTransfer.getData('text/plain');try{await mutate(next=>D.moveDeal(next,id,state.pipelineId,stage.dataset.stage),'Etapa atualizada.');}catch(error){toast(error.message);}}});
window.addEventListener('hashchange',()=>{state.query='';render();});
window.addEventListener('storage',event=>{if(!cloud?.enabled&&event.key===STORAGE){try{const incoming=JSON.parse(event.newValue);if(incoming?.version===1){db=incoming;render();toast('Dados atualizados por outra aba.');}}catch{toast('Outra aba alterou os dados. Recarregue para revisar.');}}});
render();

document.addEventListener('click',event=>{if(!event.target.closest('.card-quick'))document.querySelectorAll('.card-quick[open]').forEach(menu=>menu.removeAttribute('open'));});
document.addEventListener('toggle',event=>{if(event.target.matches?.('.card-quick')&&event.target.open)document.querySelectorAll('.card-quick[open]').forEach(menu=>{if(menu!==event.target)menu.removeAttribute('open');});},true);
