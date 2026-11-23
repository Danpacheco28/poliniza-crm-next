begin;
insert into auth.users(id,email) values('81818181-8181-4181-8181-818181818181','reset-admin@example.invalid'),('82828282-8282-4282-8282-828282828282','reset-member@example.invalid');
insert into public.crm_members(user_id,display_name,role) values('81818181-8181-4181-8181-818181818181','Reset Admin','admin'),('82828282-8282-4282-8282-828282828282','Reset Member','member');
set local role service_role;
select public.crm_require_password_change('81818181-8181-4181-8181-818181818181','82828282-8282-4282-8282-828282828282');
do $$declare denied boolean:=false;begin
 begin perform public.crm_require_password_change('82828282-8282-4282-8282-828282828282','81818181-8181-4181-8181-818181818181');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Member authorized administrator reset';end if;
 denied:=false;begin perform public.crm_require_password_change('81818181-8181-4181-8181-818181818181','81818181-8181-4181-8181-818181818181');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Admin reset own access through recovery action';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','82828282-8282-4282-8282-828282828282',true);
set local role authenticated;
do $$begin
 if public.crm_is_member() then raise exception 'Reset user loaded records before choosing password';end if;
 if has_function_privilege('authenticated','public.crm_require_password_change(uuid,uuid)','execute') then raise exception 'Browser can forge reset actor';end if;
 if (public.crm_access_context()->>'mustChangePassword')::boolean is not true then raise exception 'Password change not required';end if;
end$$;
reset role;
do $$begin
 if not exists(select 1 from public.crm_members where user_id='82828282-8282-4282-8282-828282828282' and active and role='member') then raise exception 'Reset changed membership';end if;
 if not exists(select 1 from public.crm_access_audit where target='82828282-8282-4282-8282-828282828282' and action='reset_password') then raise exception 'Reset audit missing';end if;
end$$;
rollback;
select 'Password reset tests passed; all synthetic changes rolled back.' as result;
