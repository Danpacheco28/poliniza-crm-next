// Server-only account provisioning. Never put a service key in frontend code.
export async function handleUsers(request,admin){
 const origin=request.headers.get('origin');
 const allowed=origin==='https://danpacheco28.github.io';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed?origin:'https://danpacheco28.github.io','Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
 const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!allowed)return reply(403,{error:'Origem não autorizada.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply(405,{error:'Use POST.'});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return reply(401,{error:'Entre no CRM para continuar.'});
 try{
  const auth=await admin.auth.getUser(token);if(auth.error||!auth.data?.user)return reply(401,{error:'Sessão inválida. Entre novamente.'});
  const actor=auth.data.user.id;
  const membership=await admin.from('crm_members').select('role,active,must_change_password').eq('user_id',actor).maybeSingle();
  if(membership.error||!membership.data?.active)return reply(403,{error:'Seu acesso não está ativo.'});
  const raw=await request.text();if(raw.length>16000)return reply(400,{error:'Conteúdo excede o limite.'});
  let input;try{input=JSON.parse(raw);}catch{return reply(400,{error:'Dados inválidos.'});}
  const password=typeof input.password==='string'?input.password:'';
  if(password.length<12||password.length>128)return reply(400,{error:'Use uma senha de 12 a 128 caracteres.'});
  if(input.action==='change_password'){
   const changed=await admin.auth.admin.updateUserById(actor,{password});
   if(changed.error)return reply(400,{error:'Não foi possível alterar a senha. Escolha outra senha forte.'});
   const saved=await admin.from('crm_members').update({must_change_password:false}).eq('user_id',actor);
   if(saved.error)return reply(503,{error:'Senha alterada, mas o acesso não foi liberado. Entre novamente e tente concluir a troca.'});
   return reply(200,{changed:true});
  }
  if(input.action!=='create'||membership.data.role!=='admin'||membership.data.must_change_password)return reply(403,{error:'Somente administradores criam usuários.'});
  const name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase(),role=input.role;
  if(!name||name.length>120||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['admin','member'].includes(role))return reply(400,{error:'Informe nome, email válido e perfil de acesso.'});
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:name}});
  if(created.error||!created.data?.user)return reply(400,{error:'Não foi possível criar a conta. Verifique se o email já está cadastrado e confira a senha.'});
  const id=created.data.user.id;
  const saved=await admin.rpc('crm_register_user',{p_actor:actor,p_user:id,p_name:name,p_email:email,p_role:role});
  if(saved.error){await admin.auth.admin.deleteUser(id);return reply(400,{error:/responsável|Limite/.test(saved.error.message)?saved.error.message:'Não foi possível autorizar a nova conta. Atualize a lista antes de tentar novamente.'});}
  return reply(201,{id,created:true});
 }catch{return reply(500,{error:'Não foi possível concluir a operação. Atualize a lista antes de tentar novamente.'});}
}
if(typeof Deno!=='undefined'){
 const {createClient}=await import('npm:@supabase/supabase-js@2.119.2');
 const admin=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
 Deno.serve(request=>handleUsers(request,admin));
}
