-- Run only on the NEW empty project. All synthetic records are rolled back.
begin;
do $$ begin if exists(select 1 from public.crm_records) then raise exception 'Use only the empty pilot database for this test.'; end if; end $$;
insert into auth.users(id,email) values('11111111-1111-4111-8111-111111111111','transaction-test@example.invalid');
insert into public.crm_members(user_id,display_name,role) values('11111111-1111-4111-8111-111111111111','Synthetic transaction test','admin');
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
set local role authenticated;
do $$
declare base bigint; result bigint; denied boolean:=false; meta jsonb;
begin
 if not public.crm_is_member() or not public.crm_is_admin() then raise exception 'Admin membership failed'; end if;
 select revision,data into base,meta from public.crm_meta where id=1;
 result:=public.crm_commit(base,'[{"op":"upsert","kind":"pipelines","id":"22222222-2222-4222-8222-222222222222","data":{"id":"22222222-2222-4222-8222-222222222222","name":"Synthetic pipeline","stages":[{"id":"33333333-3333-4333-8333-333333333333","name":"Lead","order":0}]}},{"op":"upsert","kind":"contacts","id":"44444444-4444-4444-8444-444444444444","data":{"id":"44444444-4444-4444-8444-444444444444","name":"Synthetic contact"}}]'::jsonb,meta);
 if result<>base+1 or (select count(*) from public.crm_records)<>2 then raise exception 'Per-record transaction failed'; end if;
 begin perform public.crm_commit(base,'[]',meta); exception when serialization_failure then denied:=true; end;
 if not denied then raise exception 'Stale revision was accepted'; end if;
 denied:=false;
 begin update public.crm_records set data=data; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Direct writes bypassed RPC'; end if;
end $$;
reset role;
update public.crm_members set role='member' where user_id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
do $$ declare denied boolean:=false; begin
 begin perform public.crm_commit((select revision from public.crm_meta where id=1),'[{"op":"upsert","kind":"pipelines","id":"22222222-2222-4222-8222-222222222222","data":{"id":"22222222-2222-4222-8222-222222222222","name":"Forbidden edit","stages":[{"id":"33333333-3333-4333-8333-333333333333","name":"Lead"}]}}]',(select data from public.crm_meta where id=1)); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Member could edit admin pipeline'; end if;
end $$;
reset role;
set local request.jwt.claims='{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}';
set local role authenticated;
do $$ declare denied boolean:=false; begin
 if (select count(*) from public.crm_records)<>0 then raise exception 'Unlisted user could read records'; end if;
 begin perform public.crm_snapshot(); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Unlisted user could read snapshot'; end if;
end $$;
reset role;
do $$ begin
 if has_table_privilege('anon','public.crm_records','select') then raise exception 'Anonymous table privilege'; end if;
 if has_function_privilege('anon','public.crm_commit(bigint,jsonb,jsonb)','execute') then raise exception 'Anonymous commit privilege'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on c.relnamespace=n.oid where n.nspname='public' and c.relname in ('crm_records','crm_meta','crm_members','crm_audit') and not c.relrowsecurity) then raise exception 'Missing RLS'; end if;
end $$;
rollback;
select 'RLS, record commits and conflicts passed; synthetic data rolled back' as result;
