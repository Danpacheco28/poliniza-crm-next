begin;
insert into auth.users(id,email) values('91919191-9191-4191-8191-919191919191','users-admin@example.invalid'),('92929292-9292-4292-8292-929292929292','users-member@example.invalid');
insert into public.crm_members(user_id,display_name,role) values('91919191-9191-4191-8191-919191919191','Synthetic Users Admin','admin');
select public.crm_register_user('91919191-9191-4191-8191-919191919191','92929292-9292-4292-8292-929292929292','Synthetic Users Member','users-member@example.invalid','member');
select set_config('request.jwt.claim.sub','92929292-9292-4292-8292-929292929292',true);
set local role authenticated;
do $$declare denied boolean:=false;begin
 if (public.crm_access_context()->>'mustChangePassword')::boolean is not true or public.crm_is_member() then raise exception 'First password change not required';end if;
 begin perform public.crm_snapshot();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'First access read commercial records';end if;
end$$;
reset role;
update public.crm_members set must_change_password=false where user_id='92929292-9292-4292-8292-929292929292';
set local role authenticated;
do $$declare denied boolean:=false;begin
 if not public.crm_is_member() or public.crm_is_admin() then raise exception 'Member access failed';end if;
 begin perform public.crm_list_users();exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Member listed private user details';end if;
 denied:=false;begin perform public.crm_update_user('92929292-9292-4292-8292-929292929292','Escalation','admin',true);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Member elevated own role';end if;
 if has_function_privilege('authenticated','public.crm_register_user(uuid,uuid,text,text,text)','execute') then raise exception 'Client can provision memberships';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','91919191-9191-4191-8191-919191919191',true);
set local role authenticated;
do $$declare denied boolean:=false;begin
 if public.crm_list_users()::text like '%encrypted_password%' then raise exception 'Private Auth data leaked';end if;
 begin perform public.crm_update_user('91919191-9191-4191-8191-919191919191','Synthetic Admin','member',false);exception when others then denied:=true;end;
 if not denied then raise exception 'Administrator disabled own access';end if;
 perform public.crm_update_user('92929292-9292-4292-8292-929292929292','Synthetic Users Member','member',false);
end$$;
reset role;
select set_config('request.jwt.claim.sub','92929292-9292-4292-8292-929292929292',true);
set local role authenticated;
do $$begin if public.crm_is_member() then raise exception 'Deactivation did not block existing JWT';end if;end$$;
reset role;
do $$begin
 if not exists(select 1 from public.crm_records where kind='team' and id='92929292-9292-4292-8292-929292929292') then raise exception 'History/owner deleted';end if;
 if not exists(select 1 from public.crm_access_audit where target='92929292-9292-4292-8292-929292929292' and action='create') then raise exception 'Missing access audit';end if;
end$$;
set local role anon;
do $$begin if has_function_privilege('anon','public.crm_list_users()','execute') or has_table_privilege('anon','public.crm_members','select') then raise exception 'Anonymous access';end if;end$$;
reset role;
rollback;
select 'User access tests passed; all synthetic changes rolled back.' as result;
