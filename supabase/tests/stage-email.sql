-- Every change is synthetic and rolled back. No provider calls.
begin;
insert into auth.users(id,email) values('11111111-2222-4333-8444-555555555555','stage-test@example.invalid');
insert into public.crm_members(user_id,display_name,role) values('11111111-2222-4333-8444-555555555555','Synthetic email admin','admin');
insert into public.crm_records(kind,id,data,revision,updated_by) values
('pipelines','22222222-2222-4222-8222-222222222222','{"id":"22222222-2222-4222-8222-222222222222","name":"Synthetic email","stages":[{"id":"s1","name":"Lead"},{"id":"s2","name":"Proposal"}]}',0,'11111111-2222-4333-8444-555555555555'),
('contacts','33333333-3333-4333-8333-333333333333','{"id":"33333333-3333-4333-8333-333333333333","name":"Synthetic","email":"synthetic@example.invalid","organization":"Example"}',0,'11111111-2222-4333-8444-555555555555');
select set_config('request.jwt.claim.sub','11111111-2222-4333-8444-555555555555',true);
set local role authenticated;
select public.crm_save_email_rule('{"id":"44444444-4444-4444-8444-444444444444","name":"Synthetic rule","pipeline_id":"22222222-2222-4222-8222-222222222222","stage_id":"s2","template":{"name":"Template","subject":"Hello {{nome}}","text":"Hello {{empresa}}","images":[]},"enabled":true}');
reset role;
insert into public.crm_records(kind,id,data,revision,updated_by) values('deals','55555555-5555-4555-8555-555555555555','{"id":"55555555-5555-4555-8555-555555555555","pipelineId":"22222222-2222-4222-8222-222222222222","stageId":"s2","contactId":"33333333-3333-4333-8333-333333333333","title":"Synthetic","status":"open","value":1}',0,'11111111-2222-4333-8444-555555555555');
do $$begin if exists(select 1 from public.crm_email_jobs where deal_id='55555555-5555-4555-8555-555555555555') then raise exception 'Creation fired without opt-in';end if;end$$;
update public.crm_records set data=jsonb_set(data,'{stageId}','"s1"'),revision=1 where kind='deals' and id='55555555-5555-4555-8555-555555555555';
update public.crm_records set data=jsonb_set(data,'{stageId}','"s2"'),revision=2 where kind='deals' and id='55555555-5555-4555-8555-555555555555';
update public.crm_records set data=jsonb_set(data,'{title}','"Edited"'),revision=3 where kind='deals' and id='55555555-5555-4555-8555-555555555555';
do $$begin if (select count(*) from public.crm_email_jobs where deal_id='55555555-5555-4555-8555-555555555555')<>1 then raise exception 'Missing or duplicate stage job';end if;end$$;
-- Isolate the claim from any existing queue, without persisting this update.
update public.crm_email_jobs set status='cancelled' where rule_id<>'44444444-4444-4444-8444-444444444444' and status='pending';
update public.crm_email_jobs set claimed_at=null where claimed_at is not null;
set local role authenticated;
do $$declare job jsonb;begin
 job:=public.crm_claim_email('66666666-6666-4666-8666-666666666666');
 if job->'payload'->>'to'<>'synthetic@example.invalid' then raise exception 'Wrong recipient';end if;
 perform public.crm_finish_email((job->>'id')::uuid,'66666666-6666-4666-8666-666666666666','uncertain','Synthetic only');
 if public.crm_claim_email('66666666-6666-4666-8666-666666666666') is not null then raise exception 'Uncertain send retried';end if;
end$$;
reset role;
-- A queued email must be cancelled if the recipient changes before processing.
update public.crm_records set data=jsonb_set(data,'{stageId}','"s1"'),revision=4 where kind='deals' and id='55555555-5555-4555-8555-555555555555';
update public.crm_records set data=jsonb_set(data,'{stageId}','"s2"'),revision=5 where kind='deals' and id='55555555-5555-4555-8555-555555555555';
update public.crm_records set data=jsonb_set(data,'{email}','"changed@example.invalid"') where kind='contacts' and id='33333333-3333-4333-8333-333333333333';
update public.crm_email_jobs set claimed_at=null where claimed_at is not null;
set local role authenticated;
do $$begin if public.crm_claim_email('66666666-6666-4666-8666-666666666666') is not null then raise exception 'Old recipient was claimed';end if;end$$;
reset role;
do $$begin if not exists(select 1 from public.crm_email_jobs where deal_id='55555555-5555-4555-8555-555555555555' and deal_revision=5 and status='cancelled') then raise exception 'Recipient change not cancelled';end if;end$$;
-- Missing email produces visible skipped history, without a pending send.
update public.crm_records set data=data-'email' where kind='contacts' and id='33333333-3333-4333-8333-333333333333';
update public.crm_records set data=jsonb_set(data,'{stageId}','"s1"'),revision=6 where kind='deals' and id='55555555-5555-4555-8555-555555555555';
update public.crm_records set data=jsonb_set(data,'{stageId}','"s2"'),revision=7 where kind='deals' and id='55555555-5555-4555-8555-555555555555';
do $$begin if not exists(select 1 from public.crm_email_jobs where deal_id='55555555-5555-4555-8555-555555555555' and deal_revision=7 and status='skipped') then raise exception 'Missing email not skipped';end if;end$$;
set local role anon;
do $$declare denied boolean:=false;begin
 begin perform public.crm_claim_email(gen_random_uuid());exception when insufficient_privilege then denied:=true;end;
 if not denied or has_table_privilege('anon','public.crm_email_jobs','select') then raise exception 'Anonymous access';end if;
end$$;
reset role;
rollback;
select 'Stage email tests passed; all synthetic changes rolled back.' as result;
