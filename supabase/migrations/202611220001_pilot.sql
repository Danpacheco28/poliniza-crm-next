-- Apply ONLY to the new dedicated project. Never the previous CRM database.
begin;
do $$ begin
 if to_regclass('public.crm_records') is not null or to_regclass('public.crm_meta') is not null then raise exception 'CRM tables exist; review target project.'; end if;
end $$;
create table public.crm_members(user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null check(length(display_name) between 1 and 120),role text not null check(role in ('admin','member')),active boolean not null default true);
alter table public.crm_members enable row level security;
create function public.crm_is_member() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.crm_members where user_id=auth.uid() and active);$$;
create function public.crm_is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.crm_members where user_id=auth.uid() and active and role='admin');$$;
revoke all on function public.crm_is_member(),public.crm_is_admin() from public,anon;
grant execute on function public.crm_is_member(),public.crm_is_admin() to authenticated;
create policy member_read on public.crm_members for select to authenticated using(public.crm_is_member());
revoke all on public.crm_members from anon,authenticated; grant select on public.crm_members to authenticated;
create table public.crm_meta(id smallint primary key default 1 check(id=1),revision bigint not null default 0,data jsonb not null default '{"version":1,"demo":false,"activityTypes":["Ligação","Email","WhatsApp","Reunião","Proposta"]}'::jsonb);
insert into public.crm_meta(id) values(1);
alter table public.crm_meta enable row level security;
create policy member_read on public.crm_meta for select to authenticated using(public.crm_is_member());
revoke all on public.crm_meta from anon,authenticated; grant select on public.crm_meta to authenticated;
create table public.crm_records(kind text not null check(kind in ('pipelines','contacts','organizations','products','deals','activities','events','goals','journeys','automationRuns','team')),id uuid not null,data jsonb not null check(jsonb_typeof(data)='object' and data->>'id'=id::text and octet_length(data::text)<=100000),revision bigint not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid not null references auth.users(id),primary key(kind,id));
create index crm_records_pipeline on public.crm_records(kind,(data->>'pipelineId'));
alter table public.crm_records enable row level security;
create policy member_read on public.crm_records for select to authenticated using(public.crm_is_member());
revoke all on public.crm_records from anon,authenticated; grant select on public.crm_records to authenticated;
create table public.crm_audit(id bigint generated always as identity primary key,actor uuid not null references auth.users(id),revision bigint not null,at timestamptz not null default now(),changes jsonb not null);
alter table public.crm_audit enable row level security;
create policy admin_read on public.crm_audit for select to authenticated using(public.crm_is_admin());
revoke all on public.crm_audit from anon,authenticated; grant select on public.crm_audit to authenticated;

create function public.crm_snapshot() returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare result jsonb; rev bigint; k text;
begin
 if not public.crm_is_member() then raise exception 'Acesso restrito à equipe autorizada.' using errcode='42501'; end if;
 select data,revision into result,rev from public.crm_meta where id=1;
 foreach k in array array['pipelines','contacts','organizations','products','deals','activities','events','goals','journeys','automationRuns','team'] loop
  result:=jsonb_set(result,array[k],coalesce((select jsonb_agg(data order by created_at,id) from public.crm_records where kind=k),'[]'::jsonb));
 end loop;
 return jsonb_build_object('data',result,'revision',rev);
end $$;
create function public.crm_commit(p_expected_revision bigint,p_changes jsonb,p_meta jsonb) returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare rev bigint; change jsonb; k text; record_id uuid; payload jsonb; audit_changes jsonb:='[]'; old_meta jsonb;
begin
 if not public.crm_is_member() then raise exception 'Acesso restrito à equipe autorizada.' using errcode='42501'; end if;
 if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes)>1000 then raise exception 'Envie até 1000 alterações por vez.'; end if;
 if jsonb_typeof(p_meta) is distinct from 'object' or p_meta->>'version' is distinct from '1' or jsonb_typeof(p_meta->'activityTypes') is distinct from 'array' or octet_length(p_meta::text)>12000 then raise exception 'Configuração inválida.'; end if;
 select revision,data into rev,old_meta from public.crm_meta where id=1 for update;
 if rev<>p_expected_revision then raise exception 'Outra pessoa alterou a base. Atualize o CRM antes de salvar novamente.' using errcode='40001'; end if;
 if p_meta is distinct from old_meta and not public.crm_is_admin() then raise exception 'Somente administradores alteram a configuração.' using errcode='42501'; end if;
 rev:=rev+1;
 for change in select value from jsonb_array_elements(p_changes) loop
  k:=change->>'kind';record_id:=(change->>'id')::uuid;payload:=change->'data';
  if k is null or k not in ('pipelines','contacts','organizations','products','deals','activities','events','goals','journeys','automationRuns','team') then raise exception 'Tipo inválido.'; end if;
  if k in ('pipelines','team') and not public.crm_is_admin() then raise exception 'Somente administradores alteram pipelines ou responsáveis.' using errcode='42501'; end if;
  if k in ('events','automationRuns') and exists(select 1 from public.crm_records where kind=k and id=record_id) then raise exception 'O histórico existente não pode ser sobrescrito.'; end if;
  if change->>'op'='delete' then
   if k in ('events','automationRuns') then raise exception 'O histórico não pode ser excluído.'; end if;
   delete from public.crm_records where kind=k and id=record_id;
  elsif change->>'op'='upsert' then
   if payload->>'id' is distinct from record_id::text then raise exception 'Identificador inválido.'; end if;
   if k in ('pipelines','contacts','products','team','journeys') and length(trim(coalesce(payload->>'name','')))=0 then raise exception 'Nome obrigatório.'; end if;
   if k='pipelines' and (jsonb_typeof(payload->'stages') is distinct from 'array' or jsonb_array_length(payload->'stages')=0) then raise exception 'Pipeline precisa ter etapas.'; end if;
   if k in ('deals','activities') and length(trim(coalesce(payload->>'title','')))=0 then raise exception 'Título obrigatório.'; end if;
   if k='deals' and (coalesce(payload->>'status','') not in ('open','won','lost') or jsonb_typeof(payload->'value') is distinct from 'number' or (payload->>'value')::numeric<0) then raise exception 'Negócio inválido.'; end if;
   if k='deals' and payload->>'status'='lost' and length(trim(coalesce(payload->>'lossReason','')))=0 then raise exception 'Informe o motivo da perda.'; end if;
   if k='products' and (jsonb_typeof(payload->'price') is distinct from 'number' or (payload->>'price')::numeric<0) then raise exception 'Preço inválido.'; end if;
   if k='activities' and coalesce(payload->>'scheduledAt','')='' then raise exception 'Informe a data da atividade.'; end if;
   insert into public.crm_records(kind,id,data,revision,updated_by) values(k,record_id,payload,rev,auth.uid()) on conflict(kind,id) do update set data=excluded.data,revision=excluded.revision,updated_at=now(),updated_by=auth.uid();
  else raise exception 'Operação inválida.';
  end if;
  audit_changes:=audit_changes||jsonb_build_object('kind',k,'id',record_id,'op',change->>'op');
 end loop;
 if exists(select 1 from public.crm_records r where r.kind in ('deals','activities','events','goals','journeys') and not exists(select 1 from public.crm_records p where p.kind='pipelines' and p.id::text=r.data->>'pipelineId')) then raise exception 'Pipeline vinculado não encontrado.'; end if;
 if exists(select 1 from public.crm_records r where r.kind='deals' and not exists(select 1 from public.crm_records p cross join lateral jsonb_array_elements(p.data->'stages') s where p.kind='pipelines' and p.id::text=r.data->>'pipelineId' and s->>'id'=r.data->>'stageId')) then raise exception 'A etapa não pertence ao pipeline.'; end if;
 if exists(select 1 from public.crm_records r where r.kind='deals' and nullif(r.data->>'contactId','') is not null and not exists(select 1 from public.crm_records c where c.kind='contacts' and c.id::text=r.data->>'contactId')) then raise exception 'Contato vinculado não encontrado.'; end if;
 if exists(select 1 from public.crm_records r where r.kind='activities' and nullif(r.data->>'dealId','') is not null and not exists(select 1 from public.crm_records d where d.kind='deals' and d.id::text=r.data->>'dealId')) then raise exception 'Oportunidade vinculada não encontrada.'; end if;
 update public.crm_meta set revision=rev,data=p_meta where id=1;
 insert into public.crm_audit(actor,revision,changes) values(auth.uid(),rev,audit_changes);
 return rev;
end $$;
revoke all on function public.crm_snapshot(),public.crm_commit(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.crm_snapshot(),public.crm_commit(bigint,jsonb,jsonb) to authenticated;
commit;
