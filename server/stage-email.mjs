import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {validateTemplate} from './email-templates.mjs';
import {renderMailText} from '../src/email-content.mjs';

export class StageEmailWorker{
 constructor({configPath,gmail,templates,clientFactory=createClient}){this.configPath=configPath;this.gmail=gmail;this.templates=templates;this.factory=clientFactory;this.client=null;this.running=false;this.busy=false;this.error='';this.worker=randomUUID();}
 state(){return{connected:Boolean(this.client),running:this.running,message:this.error||'O serviço precisa ficar aberto neste computador. Limite do piloto: 100 envios/24h, com intervalo mínimo de um minuto.'};}
 async login(input){if(this.busy)throw Error('Aguarde o envio em andamento.');this.running=false;
  const config=JSON.parse((await readFile(this.configPath,'utf8')).replace(/^\uFEFF/,''));const client=this.factory(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}});
  const {data,error}=await client.auth.signInWithPassword({email:String(input.email||'').trim(),password:String(input.password||'')});
  if(error||!data.session)throw Error('Não foi possível entrar. Confira seu email e sua senha do CRM novo.');
  const check=await client.rpc('crm_is_admin');if(check.error||!check.data){await client.auth.signOut();throw Error('Informe uma conta administradora do CRM novo.');}
  if(this.client)await this.client.auth.signOut().catch(()=>{});this.client=client;this.error='';return this.state();
 }
 async logout(){if(this.busy)throw Error('Aguarde o envio em andamento.');this.running=false;if(this.client)await this.client.auth.signOut().catch(()=>{});this.client=null;return this.state();}
 async rpc(name,args){if(!this.client)throw Error('Entre com seu administrador do CRM novo.');const {data,error}=await this.client.rpc(name,args);if(error)throw Error('Não foi possível acessar a automação. Confira a conexão e a instalação do banco.');return data;}
 async overview(){if(!this.client)return{...this.state(),pipelines:[],rules:[],jobs:[]};
  const snapshot=await this.rpc('crm_snapshot');const [rules,jobs]=await Promise.all([this.client.from('crm_email_rules').select('id,name,pipeline_id,stage_id,enabled,include_created,template,updated_at').order('updated_at',{ascending:false}),this.client.from('crm_email_jobs').select('id,rule_id,status,created_at,detail').order('created_at',{ascending:false}).limit(30)]);
  if(rules.error||jobs.error)throw Error('Não foi possível carregar as regras de email.');return{...this.state(),pipelines:snapshot.data.pipelines.map(p=>({id:p.id,name:p.name,stages:p.stages})),rules:rules.data,jobs:jobs.data};
 }
 async save(input){await this.templates.ready;const model=this.templates.list().find(t=>t.id===input.templateId);if(!model)throw Error('Selecione um modelo salvo neste computador.');const template=validateTemplate(model);
  return this.rpc('crm_save_email_rule',{p_rule:{id:input.id||null,name:String(input.name||'').trim().slice(0,100),pipeline_id:String(input.pipelineId),stage_id:String(input.stageId),enabled:input.enabled===true,include_created:input.includeCreated===true,template:{...template,id:model.id}}});
 }
 async start(){if(!this.client)throw Error('Entre com seu administrador do CRM novo.');if(!this.gmail.state().connected)throw Error('Conecte o Gmail antes de ativar o serviço.');if(!await this.rpc('crm_is_admin'))throw Error('Informe uma conta administradora ativa.');this.running=true;this.error='';return this.state();}
 pause(){this.running=false;return this.state();}
 async tick(){if(!this.running||this.busy||!this.client||this.gmail.busy||!this.gmail.state().connected)return;this.busy=true;
  try{const job=await this.rpc('crm_claim_email',{p_worker:this.worker});if(!job)return;let status='failed',detail='Dados do modelo inválidos; nenhum envio realizado.';
   try{const t=validateTemplate(job.payload.template),fields={nome:job.payload.nome,empresa:job.payload.empresa};const content={to:job.payload.to,subject:renderMailText(t.subject,fields),text:renderMailText(t.text,fields),images:t.images,requestId:job.id};
    // Once handed to Gmail, any unexpected error is uncertain and must not retry.
    status='uncertain';detail='Confira a pasta Enviados antes de qualquer novo envio.';const result=await this.gmail.send(content);status=result.status==='sent'?'sent':'uncertain';detail=status==='sent'?'Aceito pelo Gmail. Não confirma entrega ou abertura.':detail;
   }catch{ /* Fixed messages avoid exposing mailbox content or provider credentials. */ }
   await this.rpc('crm_finish_email',{p_job:job.id,p_worker:this.worker,p_status:status,p_detail:detail});this.error='';
  }catch{this.running=false;this.error='O serviço foi pausado por uma falha. Confira o histórico antes de reiniciar. Envios em processamento não são repetidos automaticamente.';}finally{this.busy=false;}
 }
}
