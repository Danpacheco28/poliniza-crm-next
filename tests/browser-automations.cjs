async(page)=>{
await page.goto('http://127.0.0.1:4186/#jornadas');await page.reload();
const ctx=await page.context().browser().newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:4186/#jornadas');
await p.getByRole('button',{name:'Nova automação',exact:true}).click();await p.locator('#modal [name=name]').fill('Fluxo de teste — dados fictícios');await p.locator('#modal button[type=submit]').click();
await p.locator('.flow-tile[data-kind=timer]').click();await p.locator('#modal [name=days]').fill('2');await p.locator('#modal button[type=submit]').click();
await p.locator('.flow-tile[data-kind=activity]').click();await p.locator('#modal [name=title]').fill('Retornar proposta do fluxo');await p.locator('#modal [name=type]').selectOption('Reunião');await p.locator('#modal button[type=submit]').click();
if(await p.locator('.flow-node-wrap').count()!==3)throw Error('Entrada e dois blocos não foram exibidos');
await p.getByRole('button',{name:'Ativar localmente',exact:true}).click();if(await p.getByRole('button',{name:'Pausar',exact:true}).count()!==1)throw Error('Ativação local falhou');
await p.locator('.flow-tile[data-kind=email]').click();await p.locator('#modal [name=title]').fill('Mensagem planejada');await p.locator('#modal [name=message]').fill('Aguardando integração.');await p.locator('#modal button[type=submit]').click();
await p.getByRole('button',{name:'Ativar localmente',exact:true}).click();if(!(await p.locator('#modal').innerText()).includes('permanece em rascunho'))throw Error('Bloco não conectado não bloqueou ativação');await p.getByRole('button',{name:'Fechar',exact:true}).click();
await p.locator('[data-action=flow-remove-node]').last().click();await p.locator('#modal button[type=submit]').click();
await p.getByRole('button',{name:'Ativar localmente',exact:true}).click();await p.reload();await p.locator('[data-action=flow-open]').first().click();if(await p.getByRole('button',{name:'Pausar',exact:true}).count()!==1)throw Error('Fluxo não persistiu');
await p.screenshot({path:'work/poliniza-crm-next/.impeccable/automation-desktop.png',fullPage:true});await p.setViewportSize({width:390,height:844});await p.screenshot({path:'work/poliniza-crm-next/.impeccable/automation-mobile.png',fullPage:true});const selectors=await p.locator('.automation-toolbar select').evaluateAll(els=>els.map(e=>({label:e.selectedOptions[0].text,width:Math.round(e.getBoundingClientRect().width)})));if(selectors.some(s=>s.width<250))throw Error('Seletor móvel estreito');const width=await p.evaluate(()=>document.documentElement.scrollWidth);if(width>390)throw Error('Editor extrapolou a largura móvel: '+width);
await p.setViewportSize({width:1440,height:1000});await p.goto('http://127.0.0.1:4186/#funil');await p.getByRole('button',{name:'Nova oportunidade',exact:true}).click();await p.locator('#modal [name=title]').fill('Teste do fluxo visual');await p.locator('#modal [name=value]').fill('500');await p.locator('#modal button[type=submit]').click();
await p.goto('http://127.0.0.1:4186/#atividades');if(await p.getByText('Retornar proposta do fluxo',{exact:true}).count()!==1)throw Error('O fluxo visual não criou a atividade');
await ctx.close();return {blocks:'Entrada → Temporizador → Atividade',activation:'persistida',unconnectedAction:'bloqueada para ativação',task:'criada no negócio',mobileWidth:width,selectors,errors};
}


