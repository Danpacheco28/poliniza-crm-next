import { uid } from '/src/domain.mjs';
import { flowSteps, flowIssues, triggers } from '/src/automations.mjs';

const kinds = {
  activity: { name:'Atividade', tone:'mint', icon:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 2v6m8-6v6M4 10h16m-8 3v5m-3-2.5h6"/>', hint:'Agendar uma próxima ação' },
  timer: { name:'Temporizador', tone:'gold', icon:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>', hint:'Somar dias ao agendamento' },
  email: { name:'Email', tone:'blue', icon:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>', hint:'Preparar assunto e mensagem' },
  whatsapp: { name:'WhatsApp', tone:'green', icon:'<path d="M20 11a8 8 0 0 1-12 7l-5 2 2-5a8 8 0 1 1 15-4Z"/><path d="m9 7-1 2 2 4 4 2 2-1-2-2-1 1-3-3 1-1-2-2Z"/>', hint:'Preparar mensagem de contato' },
  split: { name:'Dividir', tone:'violet', icon:'<path d="M12 3v6M5 21v-5a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v5M2 18l3 3 3-3m8 0 3 3 3-3"/>', hint:'Desenhar uma condição' },
  duplicate: { name:'Duplicar', tone:'cyan', icon:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 5V3H3v13h2"/>', hint:'Planejar uma cópia do negócio' },
  share: { name:'Compartilhar', tone:'rose', icon:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m2-17a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v3"/>', hint:'Planejar responsáveis' },
  hook: { name:'Webhook', tone:'slate', icon:'<path d="m10 13 4-4m-6 7-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>', hint:'Preparar uma integração' },
  transfer: { name:'Transferir', tone:'plum', icon:'<path d="M3 7h17m-5-5 5 5-5 5M21 17H4m5-5-5 5 5 5"/>', hint:'Planejar pipeline de destino' },
  product: { name:'Produto', tone:'sage', icon:'<path d="m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5m-9 5v10"/>', hint:'Preparar vínculo com produto' },
};
const glyph = kind => `<svg viewBox="0 0 24 24" class="flow-icon" aria-hidden="true">${kinds[kind]?.icon || kinds.activity.icon}</svg>`;

export function createAutomationEditor(api) {
  const {esc,btn,field,selectField,showDialog,mutate,toast,header,toolbar,tag,confirm}=api;
  let selectedId=null, zoom=1, editing=false, statusFilter='all', search='';
  const db=()=>api.getDB();
  const current=()=>{
    const flows=(db().journeys||[]).filter(f=>f.pipelineId===api.pipelineId());
    if(!flows.some(f=>f.id===selectedId))selectedId=flows[0]?.id||null;
    return flows.find(f=>f.id===selectedId);
  };
  function editFlow(id, action, message) {
    return mutate(next=>{
      const flow=next.journeys.find(f=>f.id===id); if(!flow)throw Error('A automação não foi encontrada.');
      flow.nodes=structuredClone(flowSteps(flow)); action(flow); flow.enabled=false;flow.updatedAt=new Date().toISOString();
    },message||'Fluxo salvo como rascunho. Ative após revisar.');
  }
  function openFlow(flow=current(),pendingKind='') {
    showDialog(flow?'Configurar entrada':'Nova automação',`<div class="form-grid">${field('name','Nome da automação',flow?.name,'text',true,'required maxlength="100"')}${selectField('trigger','Iniciar quando',Object.entries(triggers).map(([id,name])=>({id,name})),flow?.trigger||'created','',true)}</div><p class="help-text">Pipeline: ${esc(db().pipelines.find(p=>p.id===api.pipelineId())?.name)}. Alterações no fluxo deixam a automação em rascunho para revisão.</p>`,async values=>{
      if(!values.name.trim())throw Error('Informe o nome da automação.');
      if(flow)await editFlow(flow.id,f=>{f.name=values.name.trim();f.trigger=values.trigger;});
      else await mutate(next=>{const id=uid();next.journeys ||= [];next.journeys.push({id,name:values.name.trim(),trigger:values.trigger,pipelineId:api.pipelineId(),enabled:false,nodes:[],createdAt:new Date().toISOString()});selectedId=id;editing=true;},'Automação criada em rascunho.');
      if(pendingKind)return()=>openNode(pendingKind);
    },flow?'Salvar entrada':'Criar automação');
  }
  function openNode(kind,nodeId='') {
    const flow=current();if(!flow)return openFlow(null,kind);
    const item=kinds[kind];if(!item)return;
    const node=flowSteps(flow).find(n=>n.id===nodeId);
    let inputs='';
    if(kind==='activity')inputs=field('title','Título da atividade',node?.title,'text',true,'required maxlength="140"')+selectField('type','Tipo de atividade',db().activityTypes.map(t=>({id:t,name:t})),node?.type||'Ligação')+field('days','Somar dias à data desta atividade',node?.days||0,'number',false,'required min="0" max="365" step="1"');
    else if(kind==='timer')inputs=field('days','Somar quantos dias às próximas atividades?',node?.days??1,'number',true,'required min="0" max="365" step="1"');
    else if(kind==='email'||kind==='whatsapp')inputs=field('title',kind==='email'?'Assunto do email':'Nome da mensagem',node?.title,'text',true,'required maxlength="140"')+`<label class="field wide"><span>Mensagem</span><textarea name="message" maxlength="5000">${esc(node?.message)}</textarea></label>`;
    else if(kind==='transfer')inputs=selectField('targetPipelineId','Pipeline de destino',db().pipelines,node?.targetPipelineId||db().pipelines[0]?.id,'',true);
    else if(kind==='product')inputs=selectField('productId','Produto',db().products,node?.productId,'Selecione um produto',true);
    else if(kind==='share')inputs=selectField('owner','Responsável', (db().team||[]).map(m=>({id:m.name,name:m.name})),node?.owner,'Selecione',true);
    else if(kind==='hook')inputs=field('url','URL do webhook',node?.url,'url',true,'required placeholder="https://…"');
    else if(kind==='split')inputs=field('title','Condição planejada',node?.title,'text',true,'required placeholder="Ex.: valor maior que R$ 5.000"');
    else inputs=field('title','Título da cópia',node?.title,'text',true,'required maxlength="140"');
    const note=kind==='timer'?'O temporizador soma dias às datas das atividades seguintes. As tarefas são criadas no evento de entrada; não há espera ou execução em servidor.':kind==='activity'?'Esta ação cria uma atividade vinculada ao negócio, sem enviar mensagens.':'Bloco de planejamento: a configuração é salva, mas esta ação ainda não é executada. Fluxos com este bloco ficam em rascunho.';
    showDialog(`${node?'Editar':'Adicionar'} ${item.name.toLowerCase()}`,`<div class="flow-dialog-kind flow-${item.tone}">${glyph(kind)}<strong>${item.name}</strong><span>${kind==='activity'||kind==='timer'?'Disponível na demonstração':'Planejamento'}</span></div><div class="form-grid">${inputs}</div><p class="help-text">${note}</p>`,values=>{
      const record={...values,id:node?.id||uid(),kind};
      if(kind==='timer'||kind==='activity'){record.days=Number(values.days);if(!Number.isInteger(record.days)||record.days<0||record.days>365)throw Error('Informe de 0 a 365 dias inteiros.');}
      if(kind==='timer')record.title=`Intervalo de ${record.days} dia(s)`;
      if(kind==='transfer')record.title=db().pipelines.find(p=>p.id===values.targetPipelineId)?.name||'Selecionar destino';
      if(kind==='product'){if(!values.productId)throw Error('Selecione um produto.');record.title=db().products.find(p=>p.id===values.productId)?.name;}
      if(kind==='share'){if(!values.owner)throw Error('Selecione um responsável.');record.title=values.owner;}
      if(kind==='hook')record.title=values.url;
      return editFlow(flow.id,f=>{if(node)f.nodes=f.nodes.map(n=>n.id===node.id?record:n);else f.nodes.push(record);});
    },node?'Salvar bloco':'Adicionar ao fluxo');
  }
  function nodeSubtitle(node) {
    if(node.kind==='activity')return `${node.type||'Ligação'} · +${node.days||0} dia(s)`;
    if(node.kind==='timer')return 'Ajusta as datas das próximas atividades';
    if(node.kind==='split')return 'Condição planejada · ramificação não executada';
    return 'Planejamento · execução não conectada';
  }
  const connector=()=>`<div class="flow-connector" aria-hidden="true"><svg viewBox="0 0 30 50"><path d="M15 0v40"/><path d="m10 36 5 7 5-7"/></svg></div>`;
  function renderList(){
    const flows=(db().journeys||[]).filter(f=>f.pipelineId===api.pipelineId());
    const visible=flows.filter(f=>(statusFilter==='all'||(statusFilter==='enabled'?f.enabled:!f.enabled))&&f.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
    const rows=visible.map(f=>{const steps=flowSteps(f),date=f.updatedAt||f.createdAt;return `<tr><td data-label="Automação"><strong>${esc(f.name)}</strong><small>${steps.length} bloco(s) · ${(db().automationRuns||[]).filter(r=>r.journeyId===f.id).length} atividades criadas</small></td><td data-label="Gatilho">${esc(triggers[f.trigger]||'Configurar entrada')}</td><td data-label="Pipeline">${esc(db().pipelines.find(p=>p.id===f.pipelineId)?.name||'?')}</td><td data-label="Atualização">${date?esc(new Intl.DateTimeFormat('pt-BR').format(new Date(date))):'Não registrada'}</td><td data-label="Status">${tag(f.enabled?'Ativa localmente':'Rascunho',f.enabled?'green':'amber')}</td><td data-label="Ações"><div class="flow-list-actions">${btn('flow-open','Editar','',`data-id="${esc(f.id)}" aria-label="Editar ${esc(f.name)}"`)}${btn('toggle-journey',f.enabled?'Pausar':'Ativar','plain',`data-id="${esc(f.id)}" aria-label="${f.enabled?'Pausar':'Ativar'} ${esc(f.name)}"`)}${btn('remove-journey','Excluir','plain',`data-id="${esc(f.id)}" aria-label="Excluir ${esc(f.name)}"`)}</div></td></tr>`;}).join('');
    return '<!-- THESIS: Localizar e gerenciar automações antes de editar. OWN-WORLD: Identidade púrpura e clara da Poliniza preservada. STORY: Filtrar por pipeline, localizar fluxo e clicar Editar. FIRST VIEWPORT: Lista de gatilhos, status legível e ações explícitas. FORM: Lista inspirada na referência do usuário, sem substituir o editor colorido existente. -->'+header('Automações','Organize seus fluxos e abra o editor quando precisar ajustar.',btn('new-journey','Nova automação','primary','','plus'))+toolbar(`<label>Status<select data-flow-status><option value="all" ${statusFilter==='all'?'selected':''}>Todos os status</option><option value="enabled" ${statusFilter==='enabled'?'selected':''}>Ativas localmente</option><option value="draft" ${statusFilter==='draft'?'selected':''}>Rascunhos</option></select></label><label class="flow-list-search">Buscar automação<input type="search" data-flow-search value="${esc(search)}" placeholder="Nome da automação"></label>`,false,'automation-list-toolbar')+`<section class="panel flow-list-panel"><div class="panel-head"><h2>Automações deste pipeline</h2><small>${visible.length} de ${flows.length}</small></div>${visible.length?`<table class="flow-list-table"><thead><tr><th>Automação</th><th>Gatilho de entrada</th><th>Pipeline</th><th>Atualização</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table>`:`<div class="empty"><strong>${flows.length?'Nenhuma automação encontrada':'Este pipeline ainda não tem automações'}</strong><p>${flows.length?'Ajuste a busca ou o filtro de status.':'Crie um fluxo para organizar as próximas atividades.'}</p>${flows.length?'':btn('new-journey','Criar automação','primary')}</div>`}</section><p class="flow-execution-note">Ativas localmente executam apenas as ações disponíveis enquanto este aplicativo está em uso. Email e WhatsApp nos fluxos continuam como planejamento.</p>`;
  }
  function render() {
    if(!editing)return renderList();
    const flow=current(),steps=flow?flowSteps(flow):[];
    const list=(db().journeys||[]).filter(j=>j.pipelineId===api.pipelineId());
    const issues=flow?flowIssues(flow):[];
    const flowSelect=list.length?`<label>Automação<select data-flow-select aria-label="Selecionar automação">${list.map(j=>`<option value="${esc(j.id)}"${j.id===flow.id?' selected':''}>${esc(j.name)}</option>`).join('')}</select></label>`:'';
    const head=header('Editar automação','Desenhe o próximo passo do seu processo comercial.',btn('flow-list','← Voltar à lista')+btn('new-journey','Nova automação','primary','','plus'));
    const tools=toolbar(flowSelect+`<div class="grow"></div>${flow?btn('flow-entry','Configurar entrada')+btn('toggle-journey',flow.enabled?'Pausar':'Ativar localmente',flow.enabled?'':'primary',`data-id="${flow.id}"`):''}`,false,'automation-toolbar');
    const entry=`<div class="flow-node-wrap"><button class="flow-node flow-entry flow-mint" data-action="flow-entry"><span class="flow-node-band"><span class="flow-node-icon">↳</span>Entrada</span><strong>${flow?esc(triggers[flow.trigger]||'Configurar entrada'):'Como a automação começa?'}</strong><small>${flow?'Clique para editar o evento de entrada':'Crie uma automação para configurar'}</small></button></div>`;
    const nodes=steps.map((node,i)=>{
      const type=kinds[node.kind]||kinds.activity;
      return connector()+`<div class="flow-node-wrap" draggable="true" data-flow-drag="${node.id}"><button class="flow-node flow-${type.tone}" data-action="flow-edit-node" data-node="${node.id}" data-kind="${node.kind}"><span class="flow-node-band">${glyph(node.kind)}${type.name}${!['activity','timer'].includes(node.kind)?'<span class="flow-draft-mark">Rascunho</span>':''}</span><strong>${esc(node.title||type.name)}</strong><small>${esc(nodeSubtitle(node))}</small></button><div class="flow-node-tools">${btn('flow-up','↑','',`data-node="${node.id}" aria-label="Mover bloco acima" ${i===0?'disabled':''}`)}${btn('flow-down','↓','',`data-node="${node.id}" aria-label="Mover bloco abaixo" ${i===steps.length-1?'disabled':''}`)}${btn('flow-remove-node','×','',`data-node="${node.id}" aria-label="Remover ${esc(type.name)}"`)}</div></div>`;
    }).join('');
    return '<!-- THESIS: Tornar a sequência da automação visível e editável. OWN-WORLD: Poliniza púrpura, superfície clara e cores semânticas por ação. STORY: Configurar entrada, adicionar blocos, revisar e ativar somente ações disponíveis. FIRST VIEWPORT: Biblioteca à esquerda e fluxo vertical conectado ao centro. FORM: Editor de fluxo conforme referência explícita do usuário; composição vinculada ao briefing, sem sorteio de novo conceito. -->'+head+tools+`<div class="automation-layout"><aside class="flow-library"><div class="flow-library-heading"><h2>Blocos de ação</h2><p>Clique ou arraste para o fluxo.</p></div><div class="flow-palette">${Object.entries(kinds).map(([kind,item])=>`<button class="flow-tile flow-${item.tone}" data-action="flow-add-node" data-kind="${kind}" draggable="true" data-palette-kind="${kind}" title="${item.hint}${['activity','timer'].includes(kind)?'':' · Planejamento'}">${glyph(kind)}<span>${item.name}</span><small>${['activity','timer'].includes(kind)?'Execução local':'Planejamento'}</small></button>`).join('')}</div><p class="flow-library-note">Atividade e temporizador funcionam na demonstração. Os demais blocos preparam ações para conectar depois.</p></aside><section class="flow-workspace" aria-label="Editor visual de automação"><div class="flow-canvas-heading"><div><h2>${esc(flow?.name||'Seu próximo fluxo começa aqui')}</h2><p>${flow?`${steps.length} bloco(s) · ${flow.enabled?'Ativa apenas neste aplicativo':'Fluxo salvo'}`:'Entrada, ações e um caminho claro entre elas.'}</p></div><div class="inline">${flow?tag(flow.enabled?'Ativa localmente':'Rascunho',flow.enabled?'green':'amber'):tag('Novo fluxo')}${flow?btn('remove-journey','Excluir','plain',`data-id="${flow.id}"`):''}</div></div><div class="flow-canvas" data-flow-canvas><div class="flow-stack" style="zoom:${zoom}">${entry}${nodes}${connector()}<button class="flow-add-button" data-action="flow-add-node" data-kind="activity">+ Adicionar atividade</button><span class="flow-end">Fim do fluxo</span></div></div><footer class="flow-canvas-footer"><span>${flow?`${(db().automationRuns||[]).filter(r=>r.journeyId===flow.id).length} atividades criadas por esta automação`:'Comece configurando a entrada'}</span><div class="flow-zoom">${btn('flow-zoom-out','−','','aria-label="Diminuir zoom"')}<span>${Math.round(zoom*100)}%</span>${btn('flow-zoom-in','+','','aria-label="Aumentar zoom"')}${btn('flow-zoom-reset','Ajustar')}</div></footer></section></div><p class="flow-execution-note">${flow&&issues.length?esc(issues[0])+' ':''}O fluxo é sequencial. Email, WhatsApp, condições, webhook e outras integrações ainda não executam. Editar um fluxo pausa sua execução local até uma nova ativação.</p>`;
  }
  function reorder(nodeId,offset){const f=current();const index=flowSteps(f).findIndex(n=>n.id===nodeId);if(index<0||index+offset<0||index+offset>=flowSteps(f).length)return;return editFlow(f.id,flow=>{[flow.nodes[index],flow.nodes[index+offset]]=[flow.nodes[index+offset],flow.nodes[index]];});}
  const actions={
    'flow-open':el=>{selectedId=el.dataset.id;editing=true;zoom=1;api.render();}, 'flow-list':()=>{editing=false;api.render();},
    'new-journey':()=>openFlow(null), 'flow-entry':()=>openFlow(current()),
    'flow-add-node':el=>openNode(el.dataset.kind), 'flow-edit-node':el=>openNode(el.dataset.kind,el.dataset.node),
    'flow-remove-node':el=>confirm('Remover bloco?','As atividades já criadas serão preservadas. O fluxo ficará em rascunho.',()=>editFlow(current().id,f=>{f.nodes=f.nodes.filter(n=>n.id!==el.dataset.node);})),
    'flow-up':el=>reorder(el.dataset.node,-1),'flow-down':el=>reorder(el.dataset.node,1),
    'toggle-journey':el=>{if(el?.dataset.id)selectedId=el.dataset.id;const flow=current();if(!flow)return;const problems=flowIssues(flow);if(!flow.enabled&&problems.length)return showDialog('Revise antes de ativar',`<div class="hint"><strong>A automação permanece em rascunho</strong>${problems.map(p=>`<p>${esc(p)}</p>`).join('')}</div><p class="help-text">Você pode continuar desenhando e salvar todos os blocos. Para ativar localmente, use apenas atividade e temporizador.</p>`);return mutate(next=>{const f=next.journeys.find(f=>f.id===flow.id);f.enabled=!f.enabled;},flow.enabled?'Automação pausada.':'Automação ativada neste aplicativo.');},
    'remove-journey':el=>{if(el?.dataset.id)selectedId=el.dataset.id;const flow=current();if(flow)confirm('Excluir automação?','As atividades existentes serão preservadas.',()=>mutate(next=>{next.journeys=next.journeys.filter(f=>f.id!==flow.id);selectedId=null;editing=false;},'Automação excluída.'));},
    'flow-zoom-in':()=>{zoom=Math.min(1.3,Math.round((zoom+.1)*10)/10);api.render();},'flow-zoom-out':()=>{zoom=Math.max(.7,Math.round((zoom-.1)*10)/10);api.render();},'flow-zoom-reset':()=>{zoom=1;api.render();},
  };
  window.addEventListener('hashchange',()=>{editing=false;});
  document.addEventListener('change',event=>{if(event.target.matches('[data-flow-status]')){statusFilter=event.target.value;api.render();}if(event.target.matches('[data-flow-search]')){search=event.target.value;api.render();}if(event.target.matches('[data-flow-select]')){selectedId=event.target.value;api.render();}});
  document.addEventListener('dragstart',event=>{const tile=event.target.closest('[data-palette-kind]'),node=event.target.closest('[data-flow-drag]');if(tile)event.dataTransfer.setData('application/x-poliniza-action',tile.dataset.paletteKind);else if(node)event.dataTransfer.setData('application/x-poliniza-node',node.dataset.flowDrag);});
  document.addEventListener('dragover',event=>{if(event.target.closest('[data-flow-canvas]'))event.preventDefault();});
  document.addEventListener('drop',event=>{
    if(!event.target.closest('[data-flow-canvas]'))return;event.preventDefault();
    const kind=event.dataTransfer.getData('application/x-poliniza-action');if(kind)return openNode(kind);
    const source=event.dataTransfer.getData('application/x-poliniza-node'),target=event.target.closest('[data-flow-drag]')?.dataset.flowDrag;
    if(source&&target&&source!==target&&current())editFlow(current().id,f=>{const node=f.nodes.find(n=>n.id===source);if(!node)return;f.nodes=f.nodes.filter(n=>n.id!==source);f.nodes.splice(f.nodes.findIndex(n=>n.id===target),0,node);}).catch(error=>toast(error.message));
  });
  return {render,actions};
}
