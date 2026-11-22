-- NEW CRM only. Public access is limited to the two bounded intake functions.
begin;
create table public.crm_lead_forms (
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 100),
 heading text not null check(length(heading) between 1 and 140),description text not null check(length(description)<=600),
 pipeline_id uuid not null,stage_id uuid not null,owner_id uuid not null references auth.users(id),
 active boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.crm_lead_receipts (
 form_id uuid not null references public.crm_lead_forms(id),request_id uuid not null,fingerprint text not null,
 contact_id uuid not null,deal_id uuid not null,created_at timestamptz not null default now(),primary key(form_id,request_id)
);
create index crm_lead_receipts_time on public.crm_lead_receipts(form_id,created_at);
alter table public.crm_lead_forms enable row level security;
alter table public.crm_lead_receipts enable row level security;
revoke all on public.crm_lead_forms,public.crm_lead_receipts from public,anon,authenticated;
grant select on public.crm_lead_forms to authenticated;
create policy member_read on public.crm_lead_forms for select to authenticated using(public.crm_is_member());

create function public.crm_save_lead_form(p_form jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare fid uuid:=coalesce(nullif(p_form->>'id','')::uuid,gen_random_uuid());pid uuid:=(p_form->>'pipelineId')::uuid;sid uuid:=(p_form->>'stageId')::uuid;
begin
 if not public.crm_is_admin() then raise exception 'Somente administradores configuram formulários.' using errcode='42501'; end if;
 if not exists(select 1 from public.crm_records p cross join lateral jsonb_array_elements(p.data->'stages') s where p.kind='pipelines' and p.id=pid and s->>'id'=sid::text) then raise exception 'Selecione um pipeline e uma etapa válidos.'; end if;
 insert into public.crm_lead_forms(id,name,heading,description,pipeline_id,stage_id,owner_id,active)
 values(fid,trim(p_form->>'name'),trim(p_form->>'heading'),trim(coalesce(p_form->>'description','')),pid,sid,auth.uid(),coalesce((p_form->>'active')::boolean,false))
 on conflict(id) do update set name=excluded.name,heading=excluded.heading,description=excluded.description,pipeline_id=excluded.pipeline_id,stage_id=excluded.stage_id,active=excluded.active,owner_id=excluded.owner_id,updated_at=now();
 return fid;
end $$;

create function public.crm_list_lead_forms() returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if not public.crm_is_member() then raise exception 'Acesso restrito à equipe.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.crm_lead_forms f),'[]'::jsonb);
end $$;
create function public.crm_public_form(p_form_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.crm_lead_forms;
begin
 select * into f from public.crm_lead_forms where id=p_form_id and active;
 if not found or not exists(select 1 from public.crm_members where user_id=f.owner_id and active and role='admin') then return null; end if;
 return jsonb_build_object('name',f.name,'heading',f.heading,'description',f.description);
end $$;

create function public.crm_submit_lead(p_form_id uuid,p_request_id uuid,p_input jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.crm_lead_forms;rev bigint;cid uuid;did uuid;eid uuid:=gen_random_uuid();payload jsonb;contact_data jsonb;
 nm text:=trim(coalesce(p_input->>'name',''));em text:=lower(trim(coalesce(p_input->>'email','')));ph text:=regexp_replace(coalesce(p_input->>'phone',''),'[^0-9]','','g');
 org text:=trim(coalesce(p_input->>'company',''));msg text:=trim(coalesce(p_input->>'message',''));interest text:=trim(coalesce(p_input->>'interest',''));timeframe text:=trim(coalesce(p_input->>'timeframe',''));at_time timestamptz:=now();fingerprint text;receipt public.crm_lead_receipts;
 tracking jsonb:='{}';key text;val text;source text;notes text;new_contact boolean:=false;new_deal boolean:=false;audit jsonb:='[]';
begin
 if p_request_id is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>12000 then raise exception 'Dados inválidos. Revise o formulário.'; end if;
 if length(coalesce(p_input->>'website',''))>0 then return jsonb_build_object('accepted',true); end if;
 if length(nm) not between 2 and 120 or length(ph) not between 10 and 15 or length(org) not between 2 and 160 or length(msg)>2000 or length(interest) not between 2 and 500 or length(timeframe)>100 or length(em)>254 or em !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Revise nome, organização, WhatsApp, email e o que procura antes de enviar.'; end if;
 if p_input->>'contactPermission' is distinct from 'true' then raise exception 'Confirme a autorização para contato sobre esta solicitação.'; end if;
 -- Same lock/order as crm_commit: public submissions cannot overwrite an agent's changes.
 select revision into rev from public.crm_meta where id=1 for update;
 select * into f from public.crm_lead_forms where id=p_form_id and active;
 if not found or not exists(select 1 from public.crm_members where user_id=f.owner_id and active and role='admin') then raise exception 'Este formulário não está recebendo solicitações.'; end if;
 if not exists(select 1 from public.crm_records p cross join lateral jsonb_array_elements(p.data->'stages') s where p.kind='pipelines' and p.id=f.pipeline_id and s->>'id'=f.stage_id::text) then raise exception 'Este formulário está temporariamente indisponível.'; end if;
 fingerprint:=md5(jsonb_build_object('name',nm,'email',em,'phone',ph,'company',org,'message',msg,'interest',interest,'timeframe',timeframe)::text);
 select * into receipt from public.crm_lead_receipts where form_id=p_form_id and request_id=p_request_id;
 if found then
  if receipt.fingerprint<>fingerprint then raise exception 'Solicitação alterada. Recarregue o formulário para enviar novamente.'; end if;
  return jsonb_build_object('accepted',true);
 end if;
 if (select count(*) from public.crm_lead_receipts where form_id=p_form_id and created_at>at_time-interval '1 minute')>=10 or (select count(*) from public.crm_lead_receipts where form_id=p_form_id and created_at>at_time-interval '24 hours')>=200 then raise exception 'Não foi possível receber agora. Tente novamente mais tarde.'; end if;
 foreach key in array array['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid','landing_url','referrer'] loop
  val:=left(coalesce(p_input->'tracking'->>key,''),case when key in ('landing_url','referrer') then 1200 else 250 end);
  if val<>'' then tracking:=tracking||jsonb_build_object(key,val); end if;
 end loop;
 source:='Formulário · '||f.name;
 notes:=concat_ws(E'\n','Procura: '||interest,case when msg<>'' then 'Principal dificuldade: '||msg end,case when timeframe<>'' then 'Quando pretende começar: '||timeframe end,'Formulário: '||f.name,'Empresa: '||org,case when tracking<>'{}'::jsonb then 'Campanha: '||tracking::text end);
 -- Reuse a contact; never overwrite an existing person's details from an anonymous request.
 select id into cid from public.crm_records where kind='contacts' and ((em<>'' and lower(data->>'email')=em) or regexp_replace(coalesce(data->>'phone',''),'[^0-9]','','g')=ph)
 order by case when em<>'' and lower(data->>'email')=em then 0 else 1 end,created_at,id limit 1;
 rev:=rev+1;
 if cid is null then
  cid:=gen_random_uuid();new_contact:=true;
  contact_data:=jsonb_build_object('id',cid,'name',nm,'email',em,'phone',ph,'organization',org,'role','','channel',source,'createdAt',at_time,'tracking',tracking,'contactPermissionAt',at_time);
  insert into public.crm_records(kind,id,data,revision,updated_by) values('contacts',cid,contact_data,rev,f.owner_id);
  audit:=audit||jsonb_build_object('kind','contacts','id',cid,'op','upsert');
 end if;
 select id into did from public.crm_records where kind='deals' and data->>'contactId'=cid::text and data->>'pipelineId'=f.pipeline_id::text and data->>'captureFormId'=f.id::text and data->>'status'='open' order by created_at limit 1;
 if did is null then
  did:=gen_random_uuid();new_deal:=true;
  payload:=jsonb_build_object('id',did,'title',nm||' · '||f.name,'value',0,'pipelineId',f.pipeline_id,'stageId',f.stage_id,'contactId',cid,'owner','','channel',source,'expectedAt',null,'status','open','createdAt',at_time,'updatedAt',at_time,'closedAt',null,'lossReason','','notes',notes,'tracking',tracking,'captureFormId',f.id);
  insert into public.crm_records(kind,id,data,revision,updated_by) values('deals',did,payload,rev,f.owner_id);
  audit:=audit||jsonb_build_object('kind','deals','id',did,'op','upsert');
 end if;
 payload:=jsonb_build_object('id',eid,'dealId',did,'kind',case when new_deal then 'created' else 'form_submitted' end,'at',at_time,'pipelineId',f.pipeline_id,'stageId',case when new_deal then f.stage_id::text else (select data->>'stageId' from public.crm_records where kind='deals' and id=did) end,'notes',notes,'formId',f.id,'contactPermissionAt',at_time,'tracking',tracking);
 insert into public.crm_records(kind,id,data,revision,updated_by) values('events',eid,payload,rev,f.owner_id);
 insert into public.crm_lead_receipts(form_id,request_id,fingerprint,contact_id,deal_id) values(f.id,p_request_id,fingerprint,cid,did);
 update public.crm_meta set revision=rev where id=1;
 insert into public.crm_audit(actor,revision,changes) values(f.owner_id,rev,audit||jsonb_build_object('kind','events','id',eid,'op','upsert','source','public_form'));
 return jsonb_build_object('accepted',true);
end $$;
revoke all on function public.crm_save_lead_form(jsonb),public.crm_list_lead_forms(),public.crm_public_form(uuid),public.crm_submit_lead(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.crm_save_lead_form(jsonb),public.crm_list_lead_forms() to authenticated;
grant execute on function public.crm_public_form(uuid),public.crm_submit_lead(uuid,uuid,jsonb) to anon,authenticated;
commit;
