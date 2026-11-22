import {randomBytes,timingSafeEqual} from 'node:crypto';
const equal=(a,b)=>{const first=Buffer.from(a||''),second=Buffer.from(b||'');return first.length===second.length&&timingSafeEqual(first,second);};
export function localAccess(port){
  const session=randomBytes(32).toString('base64url'),csrf=randomBytes(32).toString('base64url');
  const origins=new Set([`http://127.0.0.1:${port}`,`http://localhost:${port}`]);
  return{
    csrf,
    trusted(request){return origins.has('http://'+request.headers.host)&&!['cross-site','same-site'].includes(request.headers['sec-fetch-site'])&&(!request.headers.origin||origins.has(request.headers.origin));},
    navigationAllowed(request){return origins.has('http://'+request.headers.host)&&request.method==='GET'&&request.headers['sec-fetch-mode']==='navigate'&&request.headers['sec-fetch-dest']==='document'&&!request.headers.origin;},
    cookie(){return`poliniza_local=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`;},
    allowed(request){const cookie=String(request.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('poliniza_local='))?.slice(15);return this.trusted(request)&&equal(cookie,session);},
    writable(request){return this.allowed(request)&&origins.has(request.headers.origin)&&equal(request.headers['x-poliniza-csrf'],csrf)&&String(request.headers['content-type']||'').startsWith('application/json');},
  };
}
