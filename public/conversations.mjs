export function createConversations(api){
  const{esc,btn,icon,header,field,showDialog,toast,confirm}=api;
  let state={status:'loading',message:'Consultando o serviço local…',expectedPhone:'5561994449108'},chats=[],selected=null,chat=null,selectionVersion=0,csrf='',timer=null,busy=false,loading=false,error='',lastList='',lastMessages='';
  const drafts=new Map(),requests=new Map();
  const active=()=>location.hash==='#conversas';
  const statusNames={loading:'Consultando',disconnected:'Desconectado',connecting:'Conectando',awaiting_qr:'Aguardando QR',connected:'Conectado',reconnecting:'Reconectando',wrong_number:'Número diferente',logged_out:'Sessão encerrada',error:'Verifique a conexão'};
  const formatPhone=value=>value==='5561994449108'?'+55 (61) 99444-9108':value||'Número não identificado';
  const when=value=>new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}).format(new Date(value));
  async function request(path,method='GET',body){
    const response=await fetch('/api/whatsapp'+path,{method,cache:'no-store',credentials:'same-origin',headers:method==='POST'?{'Content-Type':'application/json','X-Poliniza-CSRF':csrf}:{},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json();if(!response.ok)throw Error(data.error||'O serviço local não respondeu.');return data;
  }
  function connectionBadge(){return `<span class="wa-state ${state.status==='connected'?'is-connected':''}"><span aria-hidden="true"></span>${statusNames[state.status]||'Desconectado'}</span>`;}
  function list(){return chats.length?chats.map(c=>`<button class="wa-chat-item ${selected===c.id?'selected':''}" data-action="wa-select" data-id="${c.id}"><span class="wa-avatar">${esc((c.name||'?').slice(0,2).toUpperCase())}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.lastMessage||'Conversa aberta. Nenhuma mensagem enviada.')}</small></span><time>${when(c.updatedAt)}</time></button>`).join(''):`<div class="empty"><strong>Nenhuma conversa neste teste</strong><p>Conecte o número e receba uma mensagem ou abra uma conversa com um contato de teste real.</p></div>`;}
  function messages(){
    if(!chat)return '';
    const statuses={pending:'Enviando…',sent:'Enviada',delivered:'Entregue',read:'Lida',uncertain:'Envio não confirmado — confira no celular',received:'Recebida'};
    return chat.messages.length?chat.messages.map(m=>`<div class="wa-bubble ${m.direction==='out'?'outgoing':'incoming'}"><p>${esc(m.text)}</p><small>${when(m.at)} · ${statuses[m.status]||'Registrada'}</small></div>`).join(''):`<div class="empty wa-empty-chat"><strong>Pronto para uma mensagem de teste</strong><p>Nenhuma mensagem é enviada ao abrir esta conversa.</p></div>`;
  }
  function chatPanel(){
    if(!chat)return `<div class="wa-welcome"><div class="wa-welcome-symbol">${icon('phone')}</div><h2>Seu atendimento, dentro do CRM</h2><p>Conecte o WhatsApp da Poliniza para testar conversas individuais neste computador.</p><div class="wa-welcome-points"><span>${icon('check')}Sem envio automático</span><span>${icon('contacts')}Um contato por conversa</span><span>${icon('activity')}Mensagens guardadas no serviço local</span></div>${btn('wa-connect','Conectar WhatsApp','primary','','phone')}<small>O histórico antigo não é importado. Arquivos, áudios e grupos ainda não aparecem nesta versão.</small></div>`;
    return `<div class="wa-chat-heading"><div><h2>${esc(chat.name)}</h2><p>${esc(formatPhone(chat.phone))}</p></div>${btn('wa-back','← Conversas','plain')}</div><div class="wa-message-list" id="wa-messages" aria-label="Mensagens da conversa">${messages()}</div><form id="wa-send-form" class="wa-composer"><label for="wa-text">Mensagem para ${esc(chat.name)}</label><div><textarea id="wa-text" rows="2" maxlength="4000" placeholder="Escreva sua mensagem de teste…">${esc(drafts.get(selected)||'')}</textarea><button type="submit" class="primary" id="wa-send" ${state.status!=='connected'||busy||selected!==chat?.id?'disabled':''}>${icon('arrow')}Enviar</button></div><p id="wa-compose-note">${state.status==='connected'?'Envio real pelo WhatsApp conectado. Só será enviado quando você clicar em Enviar.':'Reconecte o WhatsApp para enviar. Você pode preparar o texto enquanto isso.'}</p></form>`;
  }
  function update(){
    const status=document.querySelector('#wa-connection-status');if(status)status.innerHTML=connectionBadge();
    const message=document.querySelector('#wa-connection-message');if(message)message.textContent=error||state.message||'';
    const listRegion=document.querySelector('#wa-chat-list'),listKey=JSON.stringify([chats,selected]);
    if(listRegion&&lastList!==listKey){listRegion.innerHTML=list();lastList=listKey;}
    const messagesRegion=document.querySelector('#wa-messages'),messageKey=JSON.stringify(chat?.messages||[]);
    if(messagesRegion&&lastMessages!==messageKey){const bottom=messagesRegion.scrollHeight-messagesRegion.scrollTop-messagesRegion.clientHeight<70;messagesRegion.innerHTML=messages();if(bottom)messagesRegion.scrollTop=messagesRegion.scrollHeight;lastMessages=messageKey;}
    const send=document.querySelector('#wa-send');if(send)send.disabled=state.status!=='connected'||busy||selected!==chat?.id;
    const note=document.querySelector('#wa-compose-note');if(note)note.textContent=state.status==='connected'?'Envio real pelo WhatsApp conectado. Só será enviado quando você clicar em Enviar.':'Reconecte o WhatsApp para enviar. Você pode preparar o texto enquanto isso.';
    const qrRegion=document.querySelector('#wa-qr-state');if(qrRegion?.closest('dialog')?.open)updateQR(qrRegion);
  }
  function updateQR(region){
    if(state.status==='connected'){region.innerHTML=`<div class="wa-qr-success">${icon('check')}<strong>Número confirmado</strong><p>${esc(formatPhone(state.connectedPhone))}</p><small>Pode fechar esta janela e abrir uma conversa de teste.</small></div>`;return;}
    if(state.qr?.startsWith('data:image/png;base64,')&&state.status==='awaiting_qr'){
      let img=region.querySelector('img');if(!img){region.innerHTML='<img alt="QR Code de pareamento do WhatsApp. Escaneie pelo celular." width="280" height="280"><small>O código é temporário e se renova automaticamente.</small>';img=region.querySelector('img');}if(img.src!==state.qr)img.src=state.qr;return;
    }
    region.innerHTML=`<div class="wa-qr-placeholder">${icon('phone')}<strong>${esc(statusNames[state.status]||'Desconectado')}</strong><p>${esc(error||state.message||'Gere o QR para começar.')}</p></div>`;
  }
  async function refresh(){
    if(loading)return;loading=true;
    try{const result=await request('/state');csrf=result.csrf;delete result.csrf;state=result;error='';const listing=await request('/chats');chats=listing.chats;if(selected){const id=selected,version=selectionVersion;try{const result=await request('/chats/'+id);if(selected===id&&selectionVersion===version)chat=result;}catch{if(selected===id&&selectionVersion===version){selected=null;chat=null;}}}update();}
    catch(e){state={...state,status:'error',qr:null};error=e.message;update();}
    finally{loading=false;}
  }
  function arm(){clearTimeout(timer);timer=setTimeout(async()=>{if(!active())return;await refresh();arm();},2500);}
  function render(){
    lastList='';lastMessages='';queueMicrotask(()=>{update();refresh();arm();});
    return header('Conversas','WhatsApp da Poliniza · teste real neste computador.',btn('wa-new-chat','Nova conversa','', '', 'plus')+btn('wa-connect','Conexão','primary','','phone'))+`<section class="wa-connection-bar"><div><strong>${icon('phone')} ${formatPhone(state.expectedPhone)}</strong><span id="wa-connection-status">${connectionBadge()}</span></div><p id="wa-connection-message">${esc(error||state.message)}</p>${btn('wa-refresh','Atualizar','plain')}</section><div class="wa-local-notice">Mensagens reais ficam separadas dos dados fictícios do CRM. Esta etapa é para conexão e atendimento manual; não executa campanhas nem cria leads automaticamente.</div><section class="wa-inbox"><aside class="wa-chat-sidebar"><div class="wa-sidebar-title"><h2>Conversas individuais</h2><small>Desde a conexão</small></div><div id="wa-chat-list">${list()}</div></aside><section class="wa-chat-panel ${chat?'has-chat':''}" id="wa-chat-panel">${chatPanel()}</section></section>`;
  }
  async function connectDialog(){
    await refresh();
    showDialog('Conectar WhatsApp da Poliniza',`<div class="wa-pairing"><div><span class="tag green">Teste local por QR Code</span><h3>${formatPhone(state.expectedPhone)}</h3><ol><li>Abra o WhatsApp desse número no celular.</li><li>Entre em <strong>Dispositivos conectados</strong>.</li><li>Toque em <strong>Conectar dispositivo</strong> e escaneie o QR.</li></ol><p class="help-text">A sessão só é aceita após confirmar o número. Nenhuma mensagem é enviada ao conectar.</p><div class="actions">${btn('wa-start','Gerar QR / reconectar','primary')}${btn('wa-disconnect','Limpar conexão','danger')}</div><p class="help-text">Não compartilhe o QR. Você pode remover este dispositivo pelo próprio celular.</p></div><div class="wa-qr" id="wa-qr-state"></div></div>`);
    document.querySelector('#modal').classList.add('wa-pairing-dialog');update();
  }
  async function select(id){const version=++selectionVersion;selected=id;chat=null;api.render();const result=await request('/chats/'+id);if(selected!==id||selectionVersion!==version)return;chat=result;lastMessages='';api.render();requestAnimationFrame(()=>{const region=document.querySelector('#wa-messages');if(region)region.scrollTop=region.scrollHeight;});}
  const actions={
    'wa-connect':()=>{connectDialog().catch(e=>toast(e.message));},
    'wa-start':()=>{(async()=>{try{if(!csrf)await refresh();await request('/connect','POST',{});await refresh();}catch(e){error=e.message;update();}})();},
    'wa-disconnect':()=>confirm('Remover conexão local?','O dispositivo será desconectado quando possível. As conversas já recebidas neste teste serão preservadas.',()=>{(async()=>{try{await request('/disconnect','POST',{});await refresh();toast('Conexão local removida.');}catch(e){toast(e.message);}})();}),
    'wa-refresh':()=>refresh(), 'wa-select':el=>select(el.dataset.id).catch(e=>toast(e.message)),
    'wa-back':()=>{selectionVersion++;selected=null;chat=null;api.render();},
    'wa-new-chat':()=>{if(state.status!=='connected')return connectDialog();showDialog('Abrir conversa de teste',`<div class="form-grid">${field('phone','Contato real de teste (DDI + DDD + número)','','tel',true,'required placeholder="55 + DDD + número"')}${field('name','Nome do contato (opcional)','','text',true,'maxlength="100"')}</div><p class="help-text">Abrir a conversa não envia mensagem. Use um contato real que esteja participando deste teste.</p>`,values=>()=>{request('/chats','POST',values).then(c=>select(c.id)).catch(e=>toast(e.message));},'Abrir conversa');},
  };
  document.addEventListener('input',event=>{if(event.target.id==='wa-text')drafts.set(selected,event.target.value);});
  document.addEventListener('submit',event=>{
    if(event.target.id!=='wa-send-form')return;event.preventDefault();if(busy)return;
    const text=document.querySelector('#wa-text').value.trim();if(!text)return toast('Escreva uma mensagem antes de enviar.');
    if(selected!==chat?.id)return toast('Aguarde carregar a conversa.');
    if(state.status!=='connected')return toast('Reconecte o WhatsApp antes de enviar.');
    const id=selected;let pending=requests.get(id);if(!pending||pending.text!==text){pending={requestId:crypto.randomUUID(),text};requests.set(id,pending);}
    busy=true;update();
    request('/send','POST',{chatId:id,...pending}).then(async result=>{
      if((drafts.get(id)||'').trim()===text){drafts.delete(id);if(selected===id&&document.querySelector('#wa-text'))document.querySelector('#wa-text').value='';}requests.delete(id);
      await refresh();if(result.status==='uncertain')toast('Não foi possível confirmar o envio. Confira o celular antes de reenviar.');
    }).catch(e=>toast(e.message+' O envio não foi confirmado; confira o celular.')).finally(()=>{busy=false;update();});
  });
  function stop(){clearTimeout(timer);}
  return{render,actions,stop};
}
