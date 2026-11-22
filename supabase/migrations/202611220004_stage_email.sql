-- Dedicated new CRM only. No messages are sent by this migration.
begin;
create table public.crm_email_rules(
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null check(length(name) between 1 and 100), pipeline_id text not null, stage_id text not null,
 template jsonb not null check(jsonb_typeof(template)='object' and octet_length(template::text)<2300000),
 enabled boolean not null default false, include_created boolean not null default false,
 updated_at timestamptz not null default now());
create table public.crm_email_jobs(
 id uuid primary key default gen_random_uuid(), rule_id uuid not null references public.crm_email_rules(id),
 deal_id uuid not null, deal_revision bigint not null, payload jsonb not null,
 status text not null check(status in ('pending','processing','sent','uncertain','failed','skipped','cancelled')),
 created_at timestamptz not null default now(), claimed_at timestamptz, finished_at timestamptz,
 worker_id uuid, detail text, unique(rule_id,deal_id,deal_revision));
alter table public.crm_email_rules enable row level security;
alter table public.crm_email_jobs enable row level security;
revoke all on public.crm_email_rules,public.crm_email_jobs from anon,authenticated;
grant select on public.crm_email_rules,public.crm_email_jobs to authenticated;
create policy admin_read on public.crm_email_rules for select to authenticated using(public.crm_is_admin() and owner_id=auth.uid());
create policy admin_read on public.crm_email_jobs for select to authenticated using(public.crm_is_admin() and exists(select 1 from public.crm_email_rules r where r.id=rule_id and r.owner_id=auth.uid()));
create function public.crm_save_email_rule(p_rule jsonb) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_rule_id uuid:=coalesce(nullif(p_rule->>'id','')::uuid,gen_random_uuid());
begin
 if not public.crm_is_admin() then raise exception 'Somente administradores configuram envios.' using errcode='42501'; end if;
 if not exists(select 1 from public.crm_records p, lateral jsonb_array_elements(p.data->'stages') s where p.kind='pipelines' and p.id::text=p_rule->>'pipeline_id' and s->>'id'=p_rule->>'stage_id') then raise exception 'Pipeline ou etapa inválida.'; end if;
 if length(trim(coalesce(p_rule->'template'->>'subject','')))=0 or length(trim(coalesce(p_rule->'template'->>'text','')))=0 then raise exception 'Selecione um modelo completo.'; end if;
 if exists(select 1 from public.crm_email_rules where id=v_rule_id and owner_id<>auth.uid()) then raise exception 'Regra de outro administrador.'; end if;
 insert into public.crm_email_rules(id,owner_id,name,pipeline_id,stage_id,template,enabled,include_created)
 values(v_rule_id,auth.uid(),p_rule->>'name',p_rule->>'pipeline_id',p_rule->>'stage_id',p_rule->'template',coalesce((p_rule->>'enabled')::boolean,false),coalesce((p_rule->>'include_created')::boolean,false))
 on conflict(id) do update set name=excluded.name,pipeline_id=excluded.pipeline_id,stage_id=excluded.stage_id,template=excluded.template,enabled=excluded.enabled,include_created=excluded.include_created,updated_at=now();
 -- Old queued content is cancelled on every rule edit. Future entries use the new version.
 update public.crm_email_jobs set status='cancelled',finished_at=now(),detail='Regra alterada; aguardando nova entrada na etapa.' where rule_id=v_rule_id and status='pending';
 return v_rule_id;
end $$;
create function public.crm_queue_stage_email() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare r record; contact jsonb; recipient text; company text;
begin
 if new.kind<>'deals' or new.data->>'status'<>'open' then return new; end if;
 if tg_op='UPDATE' and new.data->>'pipelineId' is not distinct from old.data->>'pipelineId' and new.data->>'stageId' is not distinct from old.data->>'stageId' then return new; end if;
 select data into contact from public.crm_records where kind='contacts' and id::text=new.data->>'contactId';
 recipient:=lower(trim(coalesce(contact->>'email',''))); company:=coalesce(nullif(new.data->>'organization',''),contact->>'organization','');
 for r in select * from public.crm_email_rules where enabled and pipeline_id=new.data->>'pipelineId' and stage_id=new.data->>'stageId' and (tg_op='UPDATE' or include_created) loop
  insert into public.crm_email_jobs(rule_id,deal_id,deal_revision,payload,status,detail)
  values(r.id,new.id,new.revision,jsonb_build_object('to',recipient,'nome',coalesce(contact->>'name',''),'empresa',company,'template',r.template,'pipelineId',r.pipeline_id,'stageId',r.stage_id),case when recipient='' then 'skipped' else 'pending' end,case when recipient='' then 'Contato sem email.' else null end) on conflict do nothing;
 end loop;
 return new;
end $$;
create trigger queue_stage_email after insert or update on public.crm_records for each row execute function public.crm_queue_stage_email();
create function public.crm_claim_email(p_worker uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare job public.crm_email_jobs;
begin
 if not public.crm_is_admin() then raise exception 'Acesso restrito.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(220004);
 -- A single account processes at most 100 jobs/day, with a minute between claims.
 if exists(select 1 from public.crm_email_jobs where claimed_at>now()-interval '1 minute') or (select count(*) from public.crm_email_jobs where claimed_at>now()-interval '24 hours')>=100 then return null; end if;
 update public.crm_email_jobs j set status='cancelled',finished_at=now(),detail='Regra pausada ou oportunidade fora da etapa.'
 where status='pending' and exists(select 1 from public.crm_email_rules r where r.id=j.rule_id and r.owner_id=auth.uid()) and not exists(
 select 1 from public.crm_email_rules r join public.crm_records d on d.kind='deals' and d.id=j.deal_id join public.crm_records c on c.kind='contacts' and c.id::text=d.data->>'contactId' where lower(trim(c.data->>'email'))=j.payload->>'to' and r.id=j.rule_id and r.enabled and d.data->>'status'='open' and d.data->>'pipelineId'=j.payload->>'pipelineId' and d.data->>'stageId'=j.payload->>'stageId');
 select j.* into job from public.crm_email_jobs j join public.crm_email_rules r on r.id=j.rule_id where j.status='pending' and r.owner_id=auth.uid() and r.enabled order by j.created_at,j.id limit 1 for update of j skip locked;
 if job.id is null then return null; end if;
 update public.crm_email_jobs set status='processing',worker_id=p_worker,claimed_at=now() where id=job.id;
 return jsonb_build_object('id',job.id,'payload',job.payload);
end $$;
create function public.crm_finish_email(p_job uuid,p_worker uuid,p_status text,p_detail text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.crm_is_admin() or p_status not in ('sent','uncertain','failed','skipped') then raise exception 'Operação inválida.' using errcode='42501'; end if;
 update public.crm_email_jobs j set status=p_status,finished_at=now(),detail=left(p_detail,200)
 where j.id=p_job and j.status='processing' and j.worker_id=p_worker and exists(select 1 from public.crm_email_rules r where r.id=j.rule_id and r.owner_id=auth.uid());
 if not found then raise exception 'Envio não pertence a este serviço.'; end if;
end $$;
revoke all on function public.crm_save_email_rule(jsonb),public.crm_queue_stage_email(),public.crm_claim_email(uuid),public.crm_finish_email(uuid,uuid,text,text) from public,anon;
grant execute on function public.crm_save_email_rule(jsonb),public.crm_claim_email(uuid),public.crm_finish_email(uuid,uuid,text,text) to authenticated;
commit;
