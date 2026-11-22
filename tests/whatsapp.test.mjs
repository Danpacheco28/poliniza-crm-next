import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {PrivateStore} from '../server/private-store.mjs';
import {localAccess} from '../server/local-access.mjs';
import {WhatsAppChannel,EXPECTED_PHONE,normalizePhone,sameBrazilianPhone} from '../server/whatsapp.mjs';

async function directory(t){const dir=await mkdtemp(join(tmpdir(),'poliniza-wa-test-'));t.after(async()=>{const target=resolve(dir);assert.ok(target.startsWith(resolve(tmpdir())+sep+'poliniza-wa-test-'));await rm(target,{recursive:true,force:true});});return dir;}
async function channel(t){const value=new WhatsAppChannel({directory:await directory(t)});await value.ready;t.after(()=>value.shutdown());return value;}
test('private files are encrypted and roundtrip without plaintext',async t=>{
  const dir=await directory(t),vault=new PrivateStore(dir);await vault.write('sample','only-synthetic-test-data');
  const file=await readFile(join(dir,'sample.enc'));assert.equal(file.includes(Buffer.from('only-synthetic-test-data')),false);assert.equal(await vault.read('sample'),'only-synthetic-test-data');
});
test('local access requires correct host, cookie, origin and CSRF header',()=>{
  const guard=localAccess(4186),headers={host:'127.0.0.1:4186',cookie:guard.cookie().split(';')[0],origin:'http://127.0.0.1:4186','content-type':'application/json','x-poliniza-csrf':guard.csrf};
  assert.equal(guard.writable({headers}),true);
  assert.equal(guard.writable({headers:{...headers,origin:'https://example.com'}}),false);
  assert.equal(guard.writable({headers:{...headers,'x-poliniza-csrf':'wrong'}}),false);
  assert.equal(guard.allowed({headers:{...headers,host:'example.com'}}),false);
  assert.equal(guard.allowed({headers:{...headers,'sec-fetch-site':'cross-site'}}),false);
});
test('external link can open only the CRM document without relaxing API access',()=>{
  const guard=localAccess(4186),request={method:'GET',headers:{host:'127.0.0.1:4186','sec-fetch-site':'cross-site','sec-fetch-mode':'navigate','sec-fetch-dest':'document'}};
  assert.equal(guard.navigationAllowed(request),true);
  assert.equal(guard.allowed(request),false);
  assert.equal(guard.writable(request),false);
  assert.equal(guard.navigationAllowed({...request,method:'POST'}),false);
  assert.equal(guard.navigationAllowed({...request,headers:{...request.headers,'sec-fetch-dest':'iframe'}}),false);
  assert.equal(guard.navigationAllowed({...request,headers:{...request.headers,host:'untrusted.example'}}),false);
});
test('phone normalization retains target and accepts WhatsApp ninth-digit normalization',()=>{
  assert.equal(normalizePhone('(61) 99444-9108'),EXPECTED_PHONE);
  assert.equal(sameBrazilianPhone(EXPECTED_PHONE,'556194449108'),true);
  assert.equal(sameBrazilianPhone(EXPECTED_PHONE,'5511900000000'),false);
  assert.throws(()=>normalizePhone('123'));
});
test('incoming duplicates and group messages are excluded',async t=>{
  const service=await channel(t),message={key:{id:'fake1',remoteJid:'5511900000000@s.whatsapp.net'},message:{conversation:'Mensagem sintética'},pushName:'Teste',messageTimestamp:1700000000};
  service.receive(message);service.receive(message);service.receive({...message,key:{id:'group',remoteJid:'123@g.us'}});
  await service.vault.pending;assert.equal(service.chats.length,1);assert.equal(service.chats[0].messages.length,1);
});
test('send requires confirmed target connection and never sends automatically when opening chat',async t=>{
  const service=await channel(t);let sends=0;service.socket={sendMessage:async()=>{sends++;return{key:{id:'fake-sent'}}},end:()=>{}};
  await assert.rejects(()=>service.send({text:'Teste',requestId:randomUUID()}),/conectado/);
  service.status='connected';service.connectedPhone=EXPECTED_PHONE;
  await service.newChat('5511900000000','Contato sintético');assert.equal(sends,0);
});
test('same request cannot send twice',async t=>{
  const service=await channel(t);let sends=0;service.socket={sendMessage:async()=>{sends++;return{key:{id:'fake-sent'}}},end:()=>{}};service.status='connected';service.connectedPhone=EXPECTED_PHONE;
  const chat=await service.newChat('5511900000000','Teste'),request={chatId:chat.id,text:'Texto sintético',requestId:randomUUID()};
  await service.send(request);await service.send(request);assert.equal(sends,1);assert.equal(service.chat(chat.id).messages.length,1);
});
test('uncertain delivery is retained and never automatically retried',async t=>{
  const service=await channel(t);let sends=0;service.socket={sendMessage:async()=>{sends++;throw Error('synthetic transport failure');},end:()=>{}};service.status='connected';service.connectedPhone=EXPECTED_PHONE;
  const chat=await service.newChat('5511900000000','Teste'),request={chatId:chat.id,text:'Texto sintético',requestId:randomUUID()};
  assert.equal((await service.send(request)).status,'uncertain');assert.equal((await service.send(request)).status,'uncertain');assert.equal(sends,1);
});
test('wrong paired number is blocked before allowing communication',async t=>{
  const ev=new EventEmitter();let ended=0;const socket={ev,user:{id:'5511900000000:1@s.whatsapp.net'},end:()=>{ended++;}};
  const service=new WhatsAppChannel({directory:await directory(t),loader:async()=>({lib:{default:()=>socket,initAuthCreds:()=>({}),BufferJSON:{},Browsers:{ubuntu:()=>[]},DisconnectReason:{loggedOut:401}},qr:{},logger:{}})});
  await service.connect();ev.emit('connection.update',{connection:'open'});assert.equal(service.status,'wrong_number');assert.equal(ended,1);await service.shutdown();
});
