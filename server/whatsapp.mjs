import {randomUUID} from 'node:crypto';
import {PrivateStore} from './private-store.mjs';

export const EXPECTED_PHONE='5561994449108';
export function normalizePhone(input){
  let digits=String(input||'').replace(/\D/g,'');
  if(digits.length===10||digits.length===11)digits='55'+digits;
  if(!/^[1-9]\d{9,14}$/.test(digits))throw Error('Informe um telefone com DDI, DDD e número.');
  return digits;
}
export function phoneFromJid(jid){return String(jid||'').endsWith('@s.whatsapp.net')?String(jid).split('@')[0].split(':')[0].replace(/\D/g,''):'';}
export function sameBrazilianPhone(a,b){
  if(a===b)return true;
  // WhatsApp may normalize Brazilian mobile IDs without the ninth digit.
  const normalize=p=>p.startsWith('55')&&p.length===13&&p[4]==='9'?p.slice(0,4)+p.slice(5):p;
  return normalize(a)===normalize(b);
}
async function encryptedAuth(lib,vault){
  await vault.pending;const saved=await vault.read('auth');
  const model=saved?JSON.parse(saved,lib.BufferJSON.reviver):{creds:lib.initAuthCreds(),keys:{}};
  const save=()=>vault.write('auth',JSON.stringify(model,lib.BufferJSON.replacer));
  return {
    state:{creds:model.creds,keys:{
      get:async(type,ids)=>Object.fromEntries(ids.map(id=>{let value=model.keys[type]?.[id];if(type==='app-state-sync-key'&&value)value=lib.proto.Message.AppStateSyncKeyData.fromObject(value);return[id,value];})),
      set:async(data)=>{for(const[type,records]of Object.entries(data)){model.keys[type]||={};for(const[id,value]of Object.entries(records)){if(value==null)delete model.keys[type][id];else model.keys[type][id]=value;}}await save();},
    }},
    save:async(update={})=>{Object.assign(model.creds,update);await save();},
  };
}
const defaultLoader=async()=>{
  const [lib,qr,pino]=await Promise.all([import('@whiskeysockets/baileys'),import('qrcode'),import('pino')]);
  return{lib,qr:qr.default||qr,logger:(pino.default||pino)({level:'silent'})};
};

export class WhatsAppChannel {
  constructor({directory,loader=defaultLoader}={}){
    this.vault=new PrivateStore(directory);this.loader=loader;this.socket=null;this.status='disconnected';this.message='Conecte o número pelo QR Code para começar.';this.qr=null;this.qrExpiresAt=null;this.connectedPhone=null;this.chats=[];this.receipts=new Map();this.generation=0;this.attempts=0;this.timer=null;this.lastSend=0;this.inflight=new Map();this.persistFailed=false;this.ready=this.loadChats();
  }
  async loadChats(){const saved=await this.vault.read('chats');if(saved){const data=JSON.parse(saved);this.chats=data.chats||[];for(const item of data.receipts||[])this.receipts.set(item.id,item);}}
  async persist(){await this.vault.write('chats',JSON.stringify({chats:this.chats,receipts:[...this.receipts.values()].slice(-500)}));}
  failStorage(){this.persistFailed=true;this.message='Não foi possível salvar a sessão. Pause o teste e confira o armazenamento local.';}
  state(){return{status:this.status,message:this.message,expectedPhone:EXPECTED_PHONE,connectedPhone:this.connectedPhone,qr:this.qr,qrExpiresAt:this.qrExpiresAt,persistFailed:this.persistFailed};}
  list(){return this.chats.map(c=>({id:c.id,phone:c.phone,name:c.name,lastMessage:c.messages.at(-1)?.text||'',updatedAt:c.updatedAt,count:c.messages.length})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
  chat(id){return this.chats.find(c=>c.id===id);}
  publicChat(id){const c=this.chat(id);if(!c)throw Error('A conversa não foi encontrada.');return{id:c.id,name:c.name,phone:c.phone,messages:c.messages.map(m=>({id:m.id,text:m.text,direction:m.direction,at:m.at,status:m.status}))};}
  async newChat(phone,name=''){
    await this.ready;if(this.status!=='connected')throw Error('Conecte o WhatsApp antes de abrir uma conversa.');
    phone=normalizePhone(phone);if(sameBrazilianPhone(phone,EXPECTED_PHONE))throw Error('Informe um contato de teste diferente do número conectado.');
    let chat=this.chats.find(c=>c.phone===phone);
    if(!chat){chat={id:randomUUID(),jid:phone+'@s.whatsapp.net',phone,name:String(name).trim().slice(0,100)||phone,updatedAt:new Date().toISOString(),messages:[]};this.chats.push(chat);await this.persist();}
    return this.publicChat(chat.id);
  }
  async connect(){
    await this.ready;
    if(['connecting','awaiting_qr','connected','reconnecting'].includes(this.status))return;
    this.attempts=0;const generation=++this.generation;await this.open(generation);
  }
  async open(generation){
    this.status=this.attempts?'reconnecting':'connecting';this.message='Preparando a conexão com o WhatsApp…';this.qr=null;
    try{
      this.deps ||= await this.loader();const{lib,qr,logger}=this.deps;
      const auth=await encryptedAuth(lib,this.vault);
      if(generation!==this.generation)return;
      const socket=lib.default({auth:auth.state,logger,browser:lib.Browsers.ubuntu('Chrome'),markOnlineOnConnect:false,syncFullHistory:false,shouldSyncHistoryMessage:()=>false,qrTimeout:60000,connectTimeoutMs:25000,defaultQueryTimeoutMs:25000,generateHighQualityLinkPreview:false});
      this.socket=socket;
      socket.ev.on('creds.update',update=>{if(generation===this.generation&&this.socket===socket)auth.save(update).catch(()=>this.failStorage());});
      socket.ev.on('connection.update',update=>{
        if(generation!==this.generation||this.socket!==socket)return;
        if(update.qr){this.status='awaiting_qr';this.message='Escaneie o QR no WhatsApp do número informado.';this.qrExpiresAt=new Date(Date.now()+55000).toISOString();qr.toDataURL(update.qr,{width:280,margin:2,errorCorrectionLevel:'M'}).then(value=>{if(generation===this.generation&&this.status==='awaiting_qr')this.qr=value;}).catch(()=>{this.status='error';this.message='Não foi possível gerar a imagem do QR. Tente novamente.';});}
        if(update.connection==='open'){
          this.qr=null;this.qrExpiresAt=null;const phone=phoneFromJid(socket.user?.id||auth.state.creds.me?.id);this.connectedPhone=phone||null;
          if(!phone||!sameBrazilianPhone(phone,EXPECTED_PHONE)){this.status='wrong_number';this.message='O número conectado não corresponde ao número da Poliniza. Remova este dispositivo pelo celular e limpe a conexão local.';++this.generation;socket.end(new Error('Número diferente do autorizado'));return;}
          this.status='connected';this.message='WhatsApp conectado. Envios só acontecem pelo botão Enviar.';this.attempts=0;
        }
        if(update.connection==='close'){
          this.qr=null;this.qrExpiresAt=null;
          const code=update.lastDisconnect?.error?.output?.statusCode;
          if(code===lib.DisconnectReason.loggedOut){this.status='logged_out';this.message='O WhatsApp encerrou a sessão. Limpe a conexão local e gere outro QR.';return;}
          if(++this.attempts>5){this.status='error';this.message='Não foi possível manter a conexão. Confira a rede e tente conectar novamente.';return;}
          this.status='reconnecting';this.message='Reconectando a sessão local…';clearTimeout(this.timer);this.timer=setTimeout(()=>{if(generation===this.generation)this.open(generation);},Math.min(15000,this.attempts*1500));
        }
      });
      socket.ev.on('messages.upsert',({messages,type})=>{
        if(generation!==this.generation||this.socket!==socket||this.status!=='connected'||type!=='notify')return;
        for(const msg of messages)this.receive(msg);
      });
      socket.ev.on('messages.update',updates=>{
        if(this.status!=='connected'||generation!==this.generation||this.socket!==socket)return;
        let changed=false;
        for(const {key,update}of updates){if(!update.status)continue;for(const chat of this.chats){const msg=chat.messages.find(m=>m.waId===key.id&&m.direction==='out');if(msg){msg.status=update.status>=4?'read':update.status>=3?'delivered':update.status>=2?'sent':msg.status;changed=true;}}}
        if(changed)this.persist().catch(()=>this.failStorage());
      });
    }catch{
      this.status='error';this.message='Não foi possível iniciar o conector. Confira as dependências e a conexão de internet.';this.qr=null;
    }
  }
  receive(msg){
    const original=msg.key?.remoteJid;if(!original||!(/@(s\.whatsapp\.net|lid)$/.test(original))||!msg.key.id)return;
    const pn=msg.key.remoteJidAlt&&phoneFromJid(msg.key.remoteJidAlt)?msg.key.remoteJidAlt:original;
    const phone=phoneFromJid(pn);
    const message=msg.message?.ephemeralMessage?.message||msg.message?.viewOnceMessage?.message||msg.message;
    const text=message?.conversation||message?.extendedTextMessage?.text||message?.imageMessage?.caption||message?.videoMessage?.caption;
    if(!text)return;
    let chat=this.chats.find(c=>c.jid===original||phone&&c.phone===phone);
    if(!chat){chat={id:randomUUID(),jid:original,phone,name:String(msg.pushName||phone||'Contato').slice(0,100),updatedAt:new Date().toISOString(),messages:[]};this.chats.push(chat);}
    if(chat.messages.some(m=>m.waId===msg.key.id))return;
    const at=new Date(Number(msg.messageTimestamp||Date.now()/1000)*1000).toISOString();
    chat.messages.push({id:randomUUID(),waId:msg.key.id,text:String(text).slice(0,8000),direction:msg.key.fromMe?'out':'in',at,status:msg.key.fromMe?'sent':'received'});chat.messages=chat.messages.slice(-500);chat.updatedAt=at;
    this.persist().catch(()=>this.failStorage());
  }
  async send({chatId,text,requestId}){
    await this.ready;
    if(this.status!=='connected'||!this.socket||!sameBrazilianPhone(this.connectedPhone||'',EXPECTED_PHONE))throw Error('O número autorizado não está conectado.');
    if(this.persistFailed)throw Error('O armazenamento local precisa ser corrigido antes de enviar.');
    text=String(text||'').trim();if(!text||text.length>4000)throw Error('Escreva uma mensagem de até 4.000 caracteres.');
    if(!/^[a-zA-Z0-9-]{16,80}$/.test(requestId||''))throw Error('Identificador de envio inválido.');
    const chat=this.chat(chatId);if(!chat)throw Error('Selecione uma conversa.');
    const previous=this.receipts.get(requestId);
    if(previous){if(previous.chatId!==chatId||previous.text!==text)throw Error('Identificador já usado em outra mensagem.');return{status:previous.status};}
    if(this.inflight.has(requestId))return this.inflight.get(requestId);
    if(Date.now()-this.lastSend<1500)throw Error('Aguarde um instante antes do próximo envio.');
    this.lastSend=Date.now();
    const action=this.deliver(chat,text,requestId);this.inflight.set(requestId,action);try{return await action;}finally{this.inflight.delete(requestId);}
  }
  async deliver(chat,text,requestId){
    const receipt={id:requestId,chatId:chat.id,text,status:'pending'};this.receipts.set(requestId,receipt);
    const message={id:randomUUID(),text,direction:'out',at:new Date().toISOString(),status:'pending'};chat.messages.push(message);chat.updatedAt=message.at;
    try{await this.persist();}catch{this.failStorage();throw Error('O envio foi interrompido porque não foi possível salvar o registro local.');}
    try{const sent=await this.socket.sendMessage(chat.jid,{text});message.waId=sent?.key?.id;message.status='sent';receipt.status='sent';await this.persist();return{status:'sent'};}
    catch{message.status='uncertain';receipt.status='uncertain';await this.persist().catch(()=>this.failStorage());return{status:'uncertain'};}
  }
  async disconnect(){
    ++this.generation;clearTimeout(this.timer);const socket=this.socket;this.socket=null;this.qr=null;this.qrExpiresAt=null;
    if(socket){try{if(this.status==='connected')await socket.logout();}catch{}try{socket.end(new Error('Conexão local encerrada'));}catch{}}
    await this.vault.pending;await this.vault.remove('auth');this.connectedPhone=null;this.status='disconnected';this.message='Conexão local removida. As conversas recebidas neste teste foram preservadas.';
  }
  async shutdown(){++this.generation;clearTimeout(this.timer);this.qr=null;try{this.socket?.end(new Error('Servidor local encerrado'));}catch{}await this.vault.pending;}
}
