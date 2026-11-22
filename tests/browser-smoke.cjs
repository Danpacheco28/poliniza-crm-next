async(page)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:4186/#funil');
 
 await page.setViewportSize({width:390,height:844});
 
 const mobile={viewport:390,documentWidth:await page.evaluate(()=>document.documentElement.scrollWidth)};
 await page.setViewportSize({width:1440,height:1000});
 const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000}});
 const p=await ctx.newPage();p.on('pageerror',error=>errors.push(error.message));
 await p.goto('http://127.0.0.1:4186/');
 const checks=[];
 for(const route of ['contatos','atividades','calendario','relatorios','produtos','jornadas','configuracoes','funil']){
  await p.goto('http://127.0.0.1:4186/#'+route);
  checks.push({route,heading:await p.locator('h1').innerText()});
 }
 await p.getByRole('button',{name:'Novo pipeline',exact:true}).click();
 await p.locator('#modal [name=name]').fill('Teste isolado');await p.locator('#modal button[type=submit]').click();
 await p.getByRole('button',{name:'Nova oportunidade',exact:true}).click();
 await p.locator('#modal [name=title]').fill('Negócio sintético E2E');await p.locator('#modal [name=value]').fill('1234,50');await p.locator('#modal button[type=submit]').click();
 if(await p.locator('.deal-card').count()!==1)throw new Error('Pipeline novo deveria conter apenas a oportunidade de teste.');
 await p.locator('.deal-card').click();await p.locator('#modal [data-action=move]').click();
 await p.locator('#modal [name=pipelineId]').selectOption({label:'Vendas consultivas'});await p.locator('#modal button[type=submit]').click();
 if(await p.locator('.deal-card').count()!==0)throw new Error('A oportunidade transferida permaneceu no pipeline de origem.');
 await p.goto('http://127.0.0.1:4186/#relatorios');await p.getByRole('button',{name:'Comercial',exact:true}).click();
 const originReport=await p.locator('.stat').allInnerTexts();
 await p.goto('http://127.0.0.1:4186/#funil');await p.locator('[data-filter=pipeline]').selectOption({label:'Vendas consultivas'});
 if(await p.locator('.deal-card').filter({hasText:'Negócio sintético E2E'}).count()!==1)throw new Error('A oportunidade não apareceu no destino.');
 await p.reload();if(await p.locator('.deal-card').filter({hasText:'Negócio sintético E2E'}).count()!==1)throw new Error('A persistência local não preservou a oportunidade.');
 await p.goto('http://127.0.0.1:4186/#contatos');await p.getByRole('button',{name:'Importar',exact:true}).click();
 await p.locator('#import-file').setInputFiles({name:'contatos-teste.csv',mimeType:'text/csv',buffer:Buffer.from('nome;email\nContato E2E;teste-e2e@example.com\nEmail incorreto;invalido','utf8')});
 await p.waitForTimeout(200);
 const preview=await p.locator('#import-preview').innerText();
 await p.locator('#modal button[type=submit]').click();
 if(await p.locator('main').getByText('Contato E2E',{exact:true}).count()!==1)throw new Error('Contato válido não foi importado.');
 await p.goto('http://127.0.0.1:4186/#jornadas');await p.getByRole('button',{name:'Nova automação',exact:true}).click();
 await p.locator('#modal [name=name]').fill('Próximo passo de teste');await p.locator('#modal button[type=submit]').click();await p.locator('.flow-tile[data-kind=activity]').click();await p.locator('#modal [name=title]').fill('Atividade automática de teste');await p.locator('#modal button[type=submit]').click();await p.getByRole('button',{name:'Ativar localmente',exact:true}).click();
 await p.goto('http://127.0.0.1:4186/#funil');await p.getByRole('button',{name:'Nova oportunidade',exact:true}).click();
 await p.locator('#modal [name=title]').fill('Teste da jornada');await p.locator('#modal [name=value]').fill('100');await p.locator('#modal button[type=submit]').click();
 await p.goto('http://127.0.0.1:4186/#atividades');
 if(await p.getByText('Atividade automática de teste',{exact:true}).count()!==1)throw new Error('A jornada não criou a atividade.');
 await ctx.close();
 return {checks,mobile,originReport,preview,flows:['criação de pipeline','criação de oportunidade','transferência entre pipelines','persistência após recarregar','importação com validação','jornada criando atividade'],errors};
}


