-- Server-only password reset: keep membership and commercial history intact.
begin;
create function public.crm_require_password_change(p_actor uuid,p_user uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(220005);
 if p_actor=p_user or not exists(select 1 from public.crm_members where user_id=p_actor and active and role='admin' and not must_change_password) then raise exception 'Somente outro administrador ativo pode redefinir este acesso.' using errcode='42501';end if;
 if not exists(select 1 from public.crm_members where user_id=p_user and active) then raise exception 'O usuário precisa estar ativo.';end if;
 update public.crm_members set must_change_password=true where user_id=p_user;
 insert into public.crm_access_audit(actor,target,action) values(p_actor,p_user,'reset_password');
end $$;
revoke all on function public.crm_require_password_change(uuid,uuid) from public,anon,authenticated;
grant execute on function public.crm_require_password_change(uuid,uuid) to service_role;
commit;
