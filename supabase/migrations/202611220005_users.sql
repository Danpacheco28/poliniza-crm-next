begin;
alter table public.crm_members add column must_change_password boolean not null default false;
create or replace function public.crm_is_member() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.crm_members where user_id=auth.uid() and active and not must_change_password);$$;
create or replace function public.crm_is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.crm_members where user_id=auth.uid() and active and not must_change_password and role='admin');$$;
create table public.crm_access_audit(id bigint generated always as identity primary key,actor uuid not null references auth.users(id),target uuid not null references auth.users(id),action text not null,at timestamptz not null default now());
alter table public.crm_access_audit enable row level security;
revoke all on public.crm_access_audit from anon,authenticated;
grant select on public.crm_access_audit to authenticated;
create policy admin_read on public.crm_access_audit for select to authenticated using(public.crm_is_admin());
create function public.crm_access_context() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select jsonb_build_object('userId',user_id,'name',display_name,'role',role,'active',active,'mustChangePassword',must_change_password) from public.crm_members where user_id=auth.uid();$$;
create function public.crm_list_users() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.crm_is_admin() then raise exception 'Somente administradores gerenciam usuários.' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',m.display_name,'email',u.email,'role',m.role,'active',m.active,'mustChangePassword',m.must_change_password) order by m.display_name) from public.crm_members m join auth.users u on u.id=m.user_id),'[]'::jsonb);
end $$;
create function public.crm_update_user(p_id uuid,p_name text,p_role text,p_active boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_member public.crm_members;
begin
 if not public.crm_is_admin() then raise exception 'Somente administradores gerenciam usuários.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(220005);
 select * into old_member from public.crm_members where user_id=p_id for update;
 if not found or length(trim(coalesce(p_name,''))) not between 1 and 120 or p_role is null or p_role not in ('admin','member') or p_active is null then raise exception 'Dados do usuário inválidos.'; end if;
 if p_id=auth.uid() and (not p_active or p_role<>old_member.role) then raise exception 'Peça a outro administrador para alterar seu próprio acesso.'; end if;
 if old_member.active and old_member.role='admin' and (not p_active or p_role<>'admin') and not exists(select 1 from public.crm_members where user_id<>p_id and active and role='admin' and not must_change_password) then raise exception 'Mantenha pelo menos um administrador ativo.'; end if;
 update public.crm_members set display_name=trim(p_name),role=p_role,active=p_active where user_id=p_id;
 if not p_active or p_role<>'admin' then
  update public.crm_email_rules set enabled=false where owner_id=p_id;
  update public.crm_email_jobs j set status='cancelled',finished_at=now(),detail='Acesso do dono da regra alterado.' where status='pending' and exists(select 1 from public.crm_email_rules r where r.id=j.rule_id and r.owner_id=p_id);
 end if;
 insert into public.crm_access_audit(actor,target,action) values(auth.uid(),p_id,case when not p_active then 'deactivate' when not old_member.active then 'reactivate' else 'update_profile' end);
end $$;
create function public.crm_register_user(p_actor uuid,p_user uuid,p_name text,p_email text,p_role text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare rev bigint;
begin
 perform pg_advisory_xact_lock(220005);
 if not exists(select 1 from public.crm_members where user_id=p_actor and active and role='admin' and not must_change_password) then raise exception 'Administrador indisponível.' using errcode='42501'; end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 120 or p_role is null or p_role not in ('admin','member') or not exists(select 1 from auth.users where id=p_user and lower(email)=lower(p_email)) then raise exception 'Dados inválidos.'; end if;
 if (select count(*) from public.crm_members)>=100 then raise exception 'Limite do piloto: 100 usuários.'; end if;
 if exists(select 1 from public.crm_records where kind='team' and lower(data->>'name')=lower(trim(p_name))) then raise exception 'Já existe um responsável com esse nome. Use o nome completo para distinguir.'; end if;
 insert into public.crm_members(user_id,display_name,role,active,must_change_password) values(p_user,trim(p_name),p_role,true,true);
 select revision+1 into rev from public.crm_meta where id=1 for update;
 insert into public.crm_records(kind,id,data,revision,updated_by) values('team',p_user,jsonb_build_object('id',p_user,'name',trim(p_name),'email',lower(p_email),'userId',p_user),rev,p_actor);
 update public.crm_meta set revision=rev where id=1;
 insert into public.crm_access_audit(actor,target,action) values(p_actor,p_user,'create');
end $$;
revoke all on function public.crm_access_context(),public.crm_list_users(),public.crm_update_user(uuid,text,text,boolean),public.crm_register_user(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.crm_access_context(),public.crm_list_users(),public.crm_update_user(uuid,text,text,boolean) to authenticated;
grant execute on function public.crm_register_user(uuid,uuid,text,text,text) to service_role;
commit;
