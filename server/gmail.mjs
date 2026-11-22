import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {PrivateStore} from './private-store.mjs';
import {validateImages} from './email-templates.mjs';
import {emailHtml} from '../src/email-content.mjs';

const SCOPES=['openid','email','https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/gmail.readonly'];
const EXPECTED='polinizadigital@gmail.com';
const same=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);};
export function emailAddress(value){const text=String(value||'').trim().toLowerCase();if(text.length>254||! /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(text))throw Error('Informe um endereço de email válido, sem nome ou lista de destinatários.');return text;}
export function mimeMessage({from,to,subject,text,id,images=[]}){
  from=emailAddress(from);to=emailAddress(to);subject=String(subject||'').trim();text=String(text||'').trim();
  if(!subject||subject.length>180||/[\r\n\x00-\x1f]/.test(subject))throw Error('Informe um assunto de até 180 caracteres, sem quebras de linha.');
  if(!text||text.length>10000||text.includes('\0'))throw Error('Escreva uma mensagem de até 10.000 caracteres.');
  const encoded=Buffer.from(text).toString('base64').match(/.{1,76}/g).join('\r\n');
  const chunks=[];let chunk='';for(const point of subject){if(Buffer.byteLength(chunk+point)>42){chunks.push(chunk);chunk='';}chunk+=point;}if(chunk)chunks.push(chunk);
  const encodedSubject=chunks.map(value=>`=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`).join('\r\n ');
  const header=`From: ${from}\r\nTo: ${to}\r\nSubject: ${encodedSubject}\r\nMessage-ID: <${id}@poliniza.local>\r\nMIME-Version: 1.0\r\n`;
  images=validateImages(images);
  if(!images.length)return Buffer.from(header+`Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${encoded}\r\n`).toString('base64url');
  const related='related_'+randomBytes(18).toString('hex'),alt='alt_'+randomBytes(18).toString('hex');
  const fold=value=>value.match(/.{1,76}/g).join('\r\n');
  const part=(type,value)=>`Content-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${fold(Buffer.from(value).toString('base64'))}\r\n`;
  let content=header+`Content-Type: multipart/related; boundary="${related}"\r\n\r\n--${related}\r\nContent-Type: multipart/alternative; boundary="${alt}"\r\n\r\n--${alt}\r\n`+part('text/plain',text)+`--${alt}\r\n`+part('text/html',emailHtml(text,images))+`--${alt}--\r\n`;
  images.forEach((img,i)=>{content+=`--${related}\r\nContent-Type: ${img.type}\r\nContent-Transfer-Encoding: base64\r\nContent-ID: <poliniza-image-${i}>\r\nContent-Disposition: inline; filename="imagem-${i+1}"\r\n\r\n${fold(img.data)}\r\n`;});
  return Buffer.from(content+`--${related}--\r\n`).toString('base64url');
}
function plainText(payload){
  if(payload?.mimeType==='text/plain'&&payload.body?.data)return Buffer.from(payload.body.data,'base64url').toString('utf8').slice(0,20000);
  for(const part of payload?.parts||[]){const result=plainText(part);if(result)return result;}
  return '';
}
export class GmailChannel{
  constructor({directory,port=4186,fetcher=fetch}){this.store=new PrivateStore(directory);this.port=port;this.fetcher=fetcher;this.config=null;this.tokens=null;this.records=[];this.pending=null;this.busy=false;this.connectionError='';this.ready=this.load();}
  async load(){const parse=async name=>{const text=await this.store.read(name);return text?JSON.parse(text):null;};this.config=await parse('config');this.tokens=await parse('tokens');this.records=await parse('messages')||[];}
  state(){return{configured:Boolean(this.config),connected:Boolean(this.tokens&&!this.connectionError),email:this.tokens?.email||null,expectedEmail:EXPECTED,message:this.connectionError||(this.tokens?'Gmail autorizado. Envios manuais exigem confirmação; regras por etapa precisam ser ativadas separadamente.':this.config?'Configuração salva. Autorize a conta Google.':'Importe a configuração OAuth do Google para começar.'),pending:Boolean(this.pending),readReplies:Boolean(this.tokens?.scope?.includes('gmail.readonly'))};}
  list(){const account=this.tokens?.email||EXPECTED;return this.records.filter(r=>r.from===account).map(({requestId,googleId,threadId,...item})=>item).slice().reverse();}
  async configure(input){await this.ready;if(this.busy)throw Error('Aguarde a operação em andamento.');const c=input?.installed;
    if(!c||typeof c.client_id!=='string'||!c.client_id.endsWith('.apps.googleusercontent.com')||c.client_id.length>250||typeof c.client_secret!=='string'||c.client_secret.length>300||!c.client_secret)throw Error('Selecione o JSON OAuth de um aplicativo para computador criado no Google Cloud.');
    if(this.tokens)throw Error('Desconecte a conta antes de substituir a configuração.');
    this.config={client_id:c.client_id,client_secret:c.client_secret};await this.store.write('config',JSON.stringify(this.config));this.pending=null;return this.state();
  }
  async begin(){await this.ready;if(this.busy)throw Error('Aguarde a operação em andamento.');if(!this.config)throw Error('Configure o aplicativo OAuth primeiro.');
    const verifier=randomBytes(48).toString('base64url'),state=randomBytes(32).toString('base64url'),binding=randomBytes(32).toString('base64url');
    this.pending={state,binding,verifier,expires:Date.now()+600000,redirect:`http://127.0.0.1:${this.port}/api/email/oauth/callback`};
    const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:this.config.client_id,redirect_uri:this.pending.redirect,response_type:'code',scope:SCOPES.join(' '),access_type:'offline',prompt:'consent select_account',login_hint:EXPECTED,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();return{url:url.toString(),binding};
  }
  async google(url,options={}){try{return await this.fetcher(url,{...options,signal:AbortSignal.timeout(25000)});}catch{throw Error('Não foi possível contatar o Google. Verifique a internet e tente novamente.');}}
  async tokenRequest(values){const r=await this.google('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...values,...this.config})});const data=await r.json();if(!r.ok||!data.access_token){if(data.error==='invalid_grant')this.connectionError='A autorização expirou ou foi revogada. Reconecte a conta Google.';throw Error('Não foi possível autorizar o Gmail. Confira a configuração e reconecte a conta.');}return data;}
  async callback(params,binding){await this.ready;const pending=this.pending;if(!pending||pending.expires<Date.now()||!same(params.get('state'),pending.state)||!same(binding,pending.binding))throw Error('A autorização expirou ou não pertence a esta janela. Volte ao CRM e conecte novamente.');this.pending=null;
    if(params.get('error')||!params.get('code'))throw Error('A autorização foi cancelada. Nenhuma mensagem foi enviada.');
    if(this.busy)throw Error('Aguarde a operação em andamento.');this.busy=true;try{
    const tokens=await this.tokenRequest({grant_type:'authorization_code',code:params.get('code'),redirect_uri:pending.redirect,code_verifier:pending.verifier});
    const profile=await this.google('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${tokens.access_token}`}});if(!profile.ok)throw Error('Não foi possível confirmar a conta Google.');const user=await profile.json();
    if(!user.email_verified||user.email?.toLowerCase()!==EXPECTED){await this.google('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:tokens.refresh_token||tokens.access_token})}).catch(()=>{});throw Error('Selecione a conta Gmail da Poliniza indicada no CRM.');}
    if(!SCOPES.slice(2).every(scope=>String(tokens.scope||'').split(' ').includes(scope)))throw Error('Autorize envio e consulta de emails para concluir a conexão.');
    const next={access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires:Date.now()+(tokens.expires_in||3600)*1000,email:user.email.toLowerCase(),scope:tokens.scope};if(!next.refresh_token)throw Error('Reconecte a conta e permita acesso para uso posterior.');
    await this.store.write('tokens',JSON.stringify(next));this.tokens=next;this.connectionError='';return this.state();
    }finally{this.busy=false;}
  }
  async accessToken(){await this.ready;if(!this.tokens)throw Error('Conecte o Gmail antes de continuar.');if(this.tokens.expires>Date.now()+60000)return this.tokens.access_token;
    if(!this.refreshing)this.refreshing=(async()=>{const next=await this.tokenRequest({grant_type:'refresh_token',refresh_token:this.tokens.refresh_token});this.tokens={...this.tokens,access_token:next.access_token,expires:Date.now()+(next.expires_in||3600)*1000};await this.store.write('tokens',JSON.stringify(this.tokens));this.connectionError='';return this.tokens.access_token;})().finally(()=>{this.refreshing=null;});return this.refreshing;
  }
  async gmail(path,options={}){const token=await this.accessToken(),r=await this.google('https://gmail.googleapis.com/gmail/v1/users/me'+path,{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}});if(!r.ok){if(r.status===401)this.connectionError='A autorização precisa ser renovada. Reconecte o Gmail.';throw Error(r.status===429?'O Gmail limitou o envio. Aguarde e confira sua conta.':'Não foi possível concluir a operação no Gmail. Confira a autorização e a conta.');}return r.json();}
  async save(){await this.store.write('messages',JSON.stringify(this.records));}
  async send(input){await this.ready;if(this.busy)throw Error('Aguarde a operação em andamento.');if(!/^[a-f0-9-]{36}$/i.test(input?.requestId||''))throw Error('Identificador de envio inválido.');if(!this.tokens||this.connectionError)throw Error('Conecte o Gmail antes de enviar.');
    const from=this.tokens.email,to=emailAddress(input.to),subject=String(input.subject||'').trim(),text=String(input.text||'').trim(),existing=this.records.find(r=>r.requestId===input.requestId);
    const images=validateImages(input.images),contentHash=createHash('sha256').update(JSON.stringify({to,subject,text,images})).digest('hex');
    if(existing){if(existing.to!==to||existing.subject!==subject||existing.text!==text||(existing.contentHash?existing.contentHash!==contentHash:images.length))throw Error('Identificador já usado para outra mensagem.');return{id:existing.id,status:existing.status};}
    const id=randomUUID(),raw=mimeMessage({from,to,subject,text,id,images});this.busy=true;
    try{await this.accessToken();const record={id,requestId:input.requestId,from,to,subject,text,contentHash,imageCount:images.length,status:'pending',at:new Date().toISOString(),replies:[]};this.records.push(record);try{await this.save();}catch{this.records.pop();throw Error('Não foi possível guardar o envio. Nenhuma mensagem foi enviada.');}
      try{const result=await this.gmail('/messages/send',{method:'POST',body:JSON.stringify({raw})});if(!result.id||!result.threadId)throw Error('Resposta sem confirmação.');record.status='sent';record.googleId=result.id;record.threadId=result.threadId;}catch{record.status='uncertain';}
      try{await this.save();}catch{record.status='uncertain';throw Error('O envio não pôde ser registrado. Confira a pasta Enviados antes de tentar novamente.');}return{id,status:record.status};
    }finally{this.busy=false;}
  }
  async sync(){await this.ready;if(this.busy)throw Error('Aguarde a operação em andamento.');if(!this.tokens)throw Error('Conecte o Gmail antes de consultar respostas.');this.busy=true;let count=0;
    try{const records=this.records.filter(r=>r.from===this.tokens.email&&r.threadId).slice(-20),threads=[...new Set(records.map(r=>r.threadId))];for(const threadId of threads){const thread=await this.gmail('/threads/'+encodeURIComponent(threadId)+'?format=full');const related=records.filter(r=>r.threadId===threadId);for(const record of related){const out=thread.messages?.find(m=>m.id===record.googleId);if(!out)continue;for(const m of thread.messages||[]){if(m.labelIds?.includes('DRAFT')||m.labelIds?.includes('SENT')||m.id===record.googleId||Number(m.internalDate)<Number(out.internalDate)||record.replies.some(r=>r.id===m.id))continue;const headers=m.payload?.headers||[],from=headers.find(h=>h.name.toLowerCase()==='from')?.value||'Remetente não informado';if(from.toLowerCase().includes(this.tokens.email))continue;record.replies.push({id:m.id,from:from.slice(0,300),text:plainText(m.payload)||m.snippet||'(Mensagem sem texto simples)',at:new Date(Number(m.internalDate)||Date.now()).toISOString()});count++;}record.checkedAt=new Date().toISOString();}}
      await this.save();return{count,checkedThreads:threads.length};
    }finally{this.busy=false;}
  }
  async disconnect(){await this.ready;if(this.busy||this.refreshing)throw Error('Aguarde a operação em andamento.');if(this.tokens){let response;try{response=await this.google('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:this.tokens.refresh_token||this.tokens.access_token})});}catch{throw Error('Não foi possível revogar o acesso no Google. Tente novamente com internet.');}if(!response.ok&&response.status!==400)throw Error('Não foi possível revogar o acesso no Google.');}await this.store.remove('tokens');this.tokens=null;this.pending=null;this.connectionError='';return this.state();}
}
