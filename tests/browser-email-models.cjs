async(page)=>{
 const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000}}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));let models=[],sends=0,rules=[],connected=false,submitted;
 const pipeline={id:'p1',name:'Pipeline simulado',stages:[{id:'s1',name:'Proposta'},{id:'s2',name:'Negociação'}]};
 await p.route('**/api/email/**',async route=>{const path=new URL(route.request().url()).pathname.replace('/api/email','');const body=route.request().method()==='POST'?route.request().postDataJSON():{};let data;
  if(path==='/state')data={configured:true,connected:true,email:'test@example.invalid',message:'Conta simulada.',csrf:'synthetic'};
  else if(path==='/messages')data={messages:[]};
  else if(path==='/templates'){if(route.request().method()==='POST'){const model={...body,id:body.id||'model-1'};models=models.filter(m=>m.id!==model.id).concat(model);data=model;}else data={templates:models};}
  else if(path==='/automation')data={connected,running:false,pipelines:[pipeline],rules,jobs:[]};
  else if(path==='/automation/login'){connected=true;data={connected};}
  else if(path==='/automation/save'){rules=[{...body,id:'rule-1',pipeline_id:body.pipelineId,stage_id:body.stageId,template:{id:body.templateId}}];data='rule-1';}
  else if(path==='/send'){sends++;submitted=body;data={status:'sent'};}
  else throw Error('Unexpected route '+path);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await p.goto('http://127.0.0.1:4186/#emails');await p.getByRole('button',{name:'Novo modelo',exact:true}).click();
 await p.locator('#modal [name=name]').fill('Proposta inicial');await p.locator('#modal [name=subject]').fill('Olá {{nome}}');await p.locator('#modal [name=text]').fill('Uma proposta para {{empresa}}.');
 await p.locator('#mail-images').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS2sAAAAASUVORK5CYII=','base64')});
 await p.locator('[data-image-alt="0"]').fill('Imagem de exemplo');await p.locator('#modal button[type=submit]').click();await p.getByText('Modelo salvo neste computador.',{exact:true}).waitFor();await p.locator('[name=mail-model] option[value=model-1]').waitFor({state:'attached'});await p.locator('[name=mail-model]').selectOption('model-1');
 await p.locator('[name=email-to]').fill('recipient@example.invalid');await p.locator('[name=mail-name]').fill('Maria');await p.locator('[name=mail-company]').fill('Exemplo');await p.locator('#email-review').click();await p.getByText('Uma proposta para Exemplo.',{exact:true}).waitFor();if(sends)throw Error('Sent before confirmation');await p.locator('#modal button[type=submit]').click();await p.getByText('Email enviado pelo Gmail.',{exact:true}).waitFor();if(sends!==1||submitted.images.length!==1||submitted.subject!=='Olá Maria')throw Error('Invalid simulated send');
 await p.getByRole('button',{name:'Conectar ao CRM novo',exact:true}).click();await p.locator('#modal [name=password]').fill('synthetic-only');await p.locator('#modal button[type=submit]').click();await p.getByRole('button',{name:'Nova regra',exact:true}).click();if(await p.locator('#modal [name=enabled]').isChecked())throw Error('Rule enabled by default');await p.locator('#modal [name=name]').fill('Proposta por etapa');await p.locator('#modal [name=stageId]').selectOption('s1');await p.locator('#modal [name=templateId]').selectOption('model-1');await p.locator('#modal button[type=submit]').click();await p.getByText('Regra salva.',{exact:true}).waitFor();if(rules[0].enabled!==false)throw Error('Unexpected activation');
 await p.screenshot({path:'work/poliniza-crm-next/.impeccable/email-models-desktop.png',fullPage:true});await p.setViewportSize({width:390,height:844});await p.screenshot({path:'work/poliniza-crm-next/.impeccable/email-models-mobile.png',fullPage:true});const width=await p.evaluate(()=>document.documentElement.scrollWidth);if(width>390)throw Error('Mobile overflow '+width);await ctx.close();return{models:models.length,simulatedSends:sends,ruleDefault:'paused',mobileWidth:width,realSends:0,errors};
}
