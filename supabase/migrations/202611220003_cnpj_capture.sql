-- Only the NEW project; no changes to previous CRM.
begin;
create function public.crm_valid_cnpj(value text) returns boolean language plpgsql immutable set search_path=public,pg_temp as $$
declare c text:=regexp_replace(upper(coalesce(value,'')),'[./[:space:]-]','','g');base text;total integer;weight integer;remainder integer;dv text:='';i integer;j integer;
begin
 if c !~ '^[A-Z0-9]{12}[0-9]{2}$' or c ~ '^(.)\1{13}$' then return false;end if;
 base:=left(c,12);
 for j in 1..2 loop total:=0;weight:=2;
  for i in reverse length(base)..1 loop total:=total+(ascii(substr(base,i,1))-48)*weight;weight:=case when weight=9 then 2 else weight+1 end;end loop;
  remainder:=total%11;dv:=case when remainder<2 then '0' else (11-remainder)::text end;base:=base||dv;
 end loop;
 return base=c;
end $$;
revoke all on function public.crm_valid_cnpj(text) from public,anon,authenticated;
create or replace function public.crm_submit_lead(p_form_id uuid,p_request_id uuid,p_input jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.crm_lead_forms;rev bigint;cid uuid;did uuid;eid uuid:=gen_random_uuid();payload jsonb;contact_data jsonb;
 nm text:=trim(coalesce(p_input->>'name',''));em text:=lower(trim(coalesce(p_input->>'email','')));ph text:=regexp_replace(coalesce(p_input->>'phone',''),'[^0-9]','','g');
 org text:=trim(coalesce(p_input->>'company',''));msg text:=trim(coalesce(p_input->>'message',''));interest text:=trim(coalesce(p_input->>'interest',''));timeframe text:=trim(coalesce(p_input->>'timeframe',''));at_time timestamptz:=now();fingerprint text;receipt public.crm_lead_receipts;
 business jsonb:='{}';business_key text;business_value text;business_cnpj text:=regexp_replace(upper(coalesce(p_input->>'cnpj','')),'[./[:space:]-]','','g');
 tracking jsonb:='{}';key text;val text;source text;notes text;new_contact boolean:=false;new_deal boolean:=false;audit jsonb:='[]';
begin
 if p_request_id is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>12000 then raise exception 'Dados inválidos. Revise o formulário.'; end if;
 if length(coalesce(p_input->>'website',''))>0 then return jsonb_build_object('accepted',true); end if;
 if length(nm) not between 2 and 120 or length(ph) not between 10 and 15 or length(org) not between 2 and 160 or length(msg)>2000 or length(interest) not between 2 and 500 or length(timeframe)>100 or length(em)>254 or em !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Revise nome, organização, WhatsApp, email e o que procura antes de enviar.'; end if;
 if business_cnpj<>'' and not public.crm_valid_cnpj(business_cnpj) then raise exception 'CNPJ inválido. Confira ou deixe o campo vazio.'; end if;
 foreach business_key in array array['legalName','tradeName','addressStreet','addressNumber','addressExtra','district','city','state','zip','cnae','registrationStatus','companyPhone','companyEmail'] loop
  business_value:=left(trim(coalesce(p_input->>business_key,'')),case business_key when 'state' then 2 when 'zip' then 10 when 'addressNumber' then 30 when 'companyPhone' then 30 when 'district' then 100 when 'city' then 100 when 'registrationStatus' then 80 when 'cnae' then 250 when 'companyEmail' then 254 else 180 end);
  business:=business||jsonb_build_object(business_key,business_value);
 end loop;
 if p_input->>'contactPermission' is distinct from 'true' then raise exception 'Confirme a autorização para contato sobre esta solicitação.'; end if;
 -- Same lock/order as crm_commit: public submissions cannot overwrite an agent's changes.
 select revision into rev from public.crm_meta where id=1 for update;
 select * into f from public.crm_lead_forms where id=p_form_id and active;
 if not found or not exists(select 1 from public.crm_members where user_id=f.owner_id and active and role='admin') then raise exception 'Este formulário não está recebendo solicitações.'; end if;
 if not exists(select 1 from public.crm_records p cross join lateral jsonb_array_elements(p.data->'stages') s where p.kind='pipelines' and p.id=f.pipeline_id and s->>'id'=f.stage_id::text) then raise exception 'Este formulário está temporariamente indisponível.'; end if;
 fingerprint:=md5(jsonb_build_object('name',nm,'email',em,'phone',ph,'company',org,'message',msg,'interest',interest,'timeframe',timeframe,'cnpj',business_cnpj,'business',business)::text);
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
 notes:=concat_ws(E'\n','Procura: '||interest,case when msg<>'' then 'Principal dificuldade: '||msg end,case when timeframe<>'' then 'Quando pretende começar: '||timeframe end,'Formulário: '||f.name,'Empresa: '||org,case when business_cnpj<>'' then 'CNPJ: '||business_cnpj end,case when business->>'legalName'<>'' then 'Razão social: '||(business->>'legalName') end,case when tracking<>'{}'::jsonb then 'Campanha: '||tracking::text end);
 -- Reuse a contact; never overwrite an existing person's details from an anonymous request.
 select id into cid from public.crm_records where kind='contacts' and ((em<>'' and lower(data->>'email')=em) or regexp_replace(coalesce(data->>'phone',''),'[^0-9]','','g')=ph)
 order by case when em<>'' and lower(data->>'email')=em then 0 else 1 end,created_at,id limit 1;
 rev:=rev+1;
 if cid is null then
  cid:=gen_random_uuid();new_contact:=true;
  contact_data:=jsonb_build_object('id',cid,'name',nm,'email',em,'phone',ph,'organization',org,'role','','channel',source,'createdAt',at_time,'tracking',tracking,'contactPermissionAt',at_time,'cnpj',business_cnpj,'business',business);
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
 payload:=jsonb_build_object('id',eid,'dealId',did,'kind',case when new_deal then 'created' else 'form_submitted' end,'at',at_time,'pipelineId',f.pipeline_id,'stageId',case when new_deal then f.stage_id::text else (select data->>'stageId' from public.crm_records where kind='deals' and id=did) end,'notes',notes,'formId',f.id,'contactPermissionAt',at_time,'tracking',tracking,'cnpj',business_cnpj,'business',business);
 insert into public.crm_records(kind,id,data,revision,updated_by) values('events',eid,payload,rev,f.owner_id);
 insert into public.crm_lead_receipts(form_id,request_id,fingerprint,contact_id,deal_id) values(f.id,p_request_id,fingerprint,cid,did);
 update public.crm_meta set revision=rev where id=1;
 insert into public.crm_audit(actor,revision,changes) values(f.owner_id,rev,audit||jsonb_build_object('kind','events','id',eid,'op','upsert','source','public_form'));
 return jsonb_build_object('accepted',true);
end $$;

commit;
