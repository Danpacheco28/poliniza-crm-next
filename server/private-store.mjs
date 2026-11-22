import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';

// Runtime-only encrypted persistence. This directory is never statically served.
export class PrivateStore {
  constructor(directory) {this.directory=directory;this.pending=Promise.resolve();this.ready=this.init();}
  async init() {
    await mkdir(this.directory,{recursive:true,mode:0o700});
    const path=join(this.directory,'local.key');
    try {this.key=await readFile(path);}
    catch(error){if(error.code!=='ENOENT')throw error;try{await writeFile(path,randomBytes(32),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}this.key=await readFile(path);}
    if(this.key.length!==32)throw Error('A chave da sessão local é inválida.');
  }
  path(name){if(!/^[a-z-]+$/.test(name))throw Error('Registro privado inválido.');return join(this.directory,name+'.enc');}
  async read(name){
    await this.ready;
    try{const bytes=await readFile(this.path(name));const decipher=createDecipheriv('aes-256-gcm',this.key,bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8');}
    catch(error){if(error.code==='ENOENT')return null;throw Error('Não foi possível abrir o registro privado local.');}
  }
  write(name,text){
    const action=async()=>{await this.ready;const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv);const encrypted=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]);const target=this.path(name),temporary=target+'.tmp';await writeFile(temporary,Buffer.concat([iv,cipher.getAuthTag(),encrypted]),{mode:0o600});await rename(temporary,target);};
    const result=this.pending.then(action);this.pending=result.catch(()=>{});return result;
  }
  async remove(name){await this.ready;await this.pending;await unlink(this.path(name)).catch(error=>{if(error.code!=='ENOENT')throw error;});}
}
