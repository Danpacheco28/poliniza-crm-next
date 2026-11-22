import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {WhatsAppChannel} from './server/whatsapp.mjs';
import {localAccess} from './server/local-access.mjs';
import {GmailChannel} from './server/gmail.mjs';
import {EmailTemplates} from './server/email-templates.mjs';
import {StageEmailWorker} from './server/stage-email.mjs';
const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.POLINIZA_NEXT_PORT || 4186);
const access=localAccess(port);
const whatsapp=new WhatsAppChannel({directory:resolve(root,'.runtime','whatsapp-private')});
const gmail=new GmailChannel({directory:resolve(root,'.runtime','gmail-private'),port});
const templates=new EmailTemplates(resolve(root,'.runtime','gmail-private'));
const stageEmail=new StageEmailWorker({configPath:resolve(root,'deploy','public-cloud.json'),gmail,templates});
setInterval(()=>stageEmail.tick(),30000).unref();
const json=(response,status,value)=>{response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(value));};
async function body(request,limit=16000){let text='';for await(const chunk of request){text+=chunk;if(Buffer.byteLength(text)>limit)throw Error('O conteúdo enviado ultrapassa o limite local.');}try{return JSON.parse(text||'{}');}catch{throw Error('O conteúdo enviado não é válido.');}}
async function api(request,response,path){
  if(!access.allowed(request))return json(response,403,{error:'Recarregue o CRM neste computador para abrir uma sessão local.'});
  if(request.method==='GET'){
    await gmail.ready;
    if(path==='/api/email/state')return json(response,200,{...gmail.state(),csrf:access.csrf});
    if(path==='/api/email/messages')return json(response,200,{messages:gmail.list()});
    if(path==='/api/email/templates'){await templates.ready;return json(response,200,{templates:templates.list()});}
    if(path==='/api/email/automation')return json(response,200,await stageEmail.overview());
    await whatsapp.ready;
    if(path==='/api/whatsapp/state')return json(response,200,{...whatsapp.state(),csrf:access.csrf});
    if(path==='/api/whatsapp/chats')return json(response,200,{chats:whatsapp.list()});
    if(/^\/api\/whatsapp\/chats\/[a-zA-Z0-9-]+$/.test(path))return json(response,200,whatsapp.publicChat(path.split('/').at(-1)));
  }
  if(request.method==='POST'){
    if(!access.writable(request))return json(response,403,{error:'A sessão local expirou. Recarregue a página antes de continuar.'});
    const input=await body(request,['/api/email/send','/api/email/templates'].includes(path)?2300000:16000);
    await gmail.ready;
    if(path==='/api/email/templates')return json(response,200,await templates.upsert(input));
    if(path==='/api/email/templates/remove')return json(response,200,await templates.remove(input.id));
    if(path==='/api/email/automation/login')return json(response,200,await stageEmail.login(input));
    if(path==='/api/email/automation/logout')return json(response,200,await stageEmail.logout());
    if(path==='/api/email/automation/save')return json(response,200,await stageEmail.save(input));
    if(path==='/api/email/automation/start')return json(response,200,await stageEmail.start());
    if(path==='/api/email/automation/pause')return json(response,200,stageEmail.pause());
    if(path==='/api/email/config')return json(response,200,await gmail.configure(input));
    if(path==='/api/email/connect'){const result=await gmail.begin();response.setHeader('Set-Cookie',`poliniza_oauth=${result.binding}; HttpOnly; SameSite=Lax; Path=/api/email/oauth/callback; Max-Age=600`);return json(response,200,{url:result.url});}
    if(path==='/api/email/disconnect')return json(response,200,await gmail.disconnect());
    if(path==='/api/email/send')return json(response,200,await gmail.send(input));
    if(path==='/api/email/sync')return json(response,200,await gmail.sync());
    if(path==='/api/whatsapp/connect'){await whatsapp.connect();return json(response,200,{status:whatsapp.status});}
    if(path==='/api/whatsapp/disconnect'){await whatsapp.disconnect();return json(response,200,{status:whatsapp.status});}
    if(path==='/api/whatsapp/chats')return json(response,200,await whatsapp.newChat(input.phone,input.name));
    if(path==='/api/whatsapp/send')return json(response,200,await whatsapp.send(input));
  }
  return json(response,404,{error:'A rota local não foi encontrada.'});
}
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if(pathname==='/api/email/oauth/callback'){
      if(request.method!=='GET'||request.headers.host!==`127.0.0.1:${port}`){response.writeHead(403).end();return;}
      const binding=String(request.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('poliniza_oauth='))?.slice(15);
      let success=false;try{await gmail.callback(new URL(request.url,'http://127.0.0.1').searchParams,binding);success=true;}catch{gmail.connectionError='A conexão não foi concluída. Confira a conta, as permissões e tente conectar novamente.';}
      response.writeHead(303,{'Location':'/#emails','Set-Cookie':'poliniza_oauth=; HttpOnly; SameSite=Lax; Path=/api/email/oauth/callback; Max-Age=0','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});response.end();return;
    }
    if(!access.trusted(request)&&!(pathname==='/'&&access.navigationAllowed(request))){response.writeHead(403).end();return;}
    if(pathname.startsWith('/api/'))return await api(request,response,pathname);
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const base = resolve(root, pathname.startsWith('/src/') ? 'src' : 'public');
    const relative = pathname.startsWith('/src/') ? pathname.slice(5) : pathname === '/' ? 'index.html' : pathname.slice(1);
    const target = resolve(base, relative);
    if (!target.startsWith(base + sep) || !(await stat(target)).isFile()) { response.writeHead(404).end('Arquivo não encontrado'); return; }
    const data = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Set-Cookie':access.cookie(), 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://brasilapi.com.br; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch(error) { if(request.url.startsWith('/api/'))return json(response,400,{error:/^(Informe|Conecte|Aguarde|Identificador|O número|Selecione|Escreva|O envio|A conversa|Não foi|O conteúdo)/.test(error.message)?error.message:'Não foi possível concluir a operação local.'});response.writeHead(404).end('Arquivo não encontrado'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Poliniza CRM novo: http://127.0.0.1:${port}`));
async function stop(){await whatsapp.shutdown();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),3000).unref();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
