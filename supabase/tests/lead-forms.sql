-- Synthetic transaction: no emails, no persistent CRM records.
begin;
do $$ begin
 if not public.crm_valid_cnpj('19.131.243/0001-97') or not public.crm_valid_cnpj('12.ABC.345/01DE-35') or public.crm_valid_cnpj('00000000000000') or public.crm_valid_cnpj('12ABC34501DE36') then raise exception 'CNPJ validator failed';end if;
end $$;
insert into auth.users(id,email) values('10101010-1010-4010-8010-101010101010','capture-test@example.invalid');
insert into public.crm_members(user_id,display_name,role) values('10101010-1010-4010-8010-101010101010','Synthetic capture admin','admin');
insert into public.crm_records(kind,id,data,revision,updated_by) values('pipelines','20202020-2020-4020-8020-202020202020','{"id":"20202020-2020-4020-8020-202020202020","name":"Synthetic capture","stages":[{"id":"30303030-3030-4030-8030-303030303030","name":"Leads","order":0}]}',0,'10101010-1010-4010-8010-101010101010');
insert into public.crm_lead_forms(id,name,heading,description,pipeline_id,stage_id,owner_id,active) values('40404040-4040-4040-8040-404040404040','Synthetic form','Synthetic heading','','20202020-2020-4020-8020-202020202020','30303030-3030-4030-8030-303030303030','10101010-1010-4010-8010-101010101010',true);
set local role anon;
do $$
declare data jsonb:='{"name":"Synthetic Person","company":"Synthetic Company","phone":"61911112222","email":"capture@example.invalid","interest":"Synthetic service","timeframe":"30 days","message":"Synthetic challenge","cnpj":"12.ABC.345/01DE-35","legalName":"Edited legal name","city":"Edited city","companyEmail":"company@example.invalid","contactPermission":true,"tracking":{"utm_campaign":"synthetic-campaign"}}';denied boolean:=false;result jsonb;
begin
 result:=public.crm_public_form('40404040-4040-4040-8040-404040404040');
 if result->>'heading'<>'Synthetic heading' or result ? 'pipeline_id' or result ? 'owner_id' then raise exception 'Public config leaked or failed'; end if;
 result:=public.crm_submit_lead('40404040-4040-4040-8040-404040404040','50505050-5050-4050-8050-505050505050',data);
 if result<>'{"accepted":true}'::jsonb then raise exception 'Unexpected public response'; end if;
 perform public.crm_submit_lead('40404040-4040-4040-8040-404040404040','50505050-5050-4050-8050-505050505050',data);
 perform public.crm_submit_lead('40404040-4040-4040-8040-404040404040','60606060-6060-4060-8060-606060606060',data);
 begin perform public.crm_submit_lead('40404040-4040-4040-8040-404040404040','70707070-7070-4070-8070-707070707070',data||'{"contactPermission":false}');exception when others then denied:=true;end;
 if not denied then raise exception 'Missing permission accepted'; end if;
 denied:=false;
 begin perform public.crm_submit_lead('40404040-4040-4040-8040-404040404040',gen_random_uuid(),data||'{"cnpj":"123"}');exception when others then denied:=true;end;
 if not denied then raise exception 'Invalid CNPJ accepted';end if;
 denied:=false;begin perform public.crm_save_lead_form('{}');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Anonymous changed routing'; end if;
 if has_table_privilege('anon','public.crm_lead_forms','select') or has_table_privilege('anon','public.crm_lead_receipts','select') or has_table_privilege('anon','public.crm_records','select') then raise exception 'Anonymous table access';end if;
end $$;
reset role;
do $$ declare cid uuid;did uuid;deal_payload jsonb; begin
 if (select count(*) from public.crm_records where kind='contacts' and data->>'email'='capture@example.invalid')<>1 then raise exception 'Duplicate contact';end if;
 select id into cid from public.crm_records where kind='contacts' and data->>'email'='capture@example.invalid';
 if not exists(select 1 from public.crm_records where kind='contacts' and id=cid and data->>'cnpj'='12ABC34501DE35' and data->'business'->>'legalName'='Edited legal name' and data->'business'->>'city'='Edited city' and data->>'email'='capture@example.invalid' and data->'business'->>'companyEmail'='company@example.invalid') then raise exception 'Edited business fields or person contact lost';end if;
 if (select count(*) from public.crm_records where kind='deals' and data->>'contactId'=cid::text)<>1 then raise exception 'Duplicate deal';end if;
 select id,data into did,deal_payload from public.crm_records where kind='deals' and data->>'contactId'=cid::text;
 if deal_payload->>'pipelineId'<>'20202020-2020-4020-8020-202020202020' or deal_payload->>'stageId'<>'30303030-3030-4030-8030-303030303030' or deal_payload->'tracking'->>'utm_campaign'<>'synthetic-campaign' then raise exception 'Routing or attribution failed';end if;
 if (select count(*) from public.crm_records where kind='events' and data->>'dealId'=did::text)<>2 then raise exception 'Idempotency or history failed';end if;
 if (select count(*) from public.crm_lead_receipts where form_id='40404040-4040-4040-8040-404040404040')<>2 then raise exception 'Receipt dedup failed';end if;
end $$;
-- Honeypot, paused forms and per-minute ceiling must not create records.
set local role anon;
select public.crm_submit_lead('40404040-4040-4040-8040-404040404040','80808080-8080-4080-8080-808080808080','{"website":"robot"}');
reset role;
do $$ begin if exists(select 1 from public.crm_lead_receipts where request_id='80808080-8080-4080-8080-808080808080') then raise exception 'Honeypot wrote data';end if;end $$;
update public.crm_lead_forms set active=false where id='40404040-4040-4040-8040-404040404040';
set local role anon;
do $$ declare denied boolean:=false;begin
 if public.crm_public_form('40404040-4040-4040-8040-404040404040') is not null then raise exception 'Paused form visible';end if;
 begin perform public.crm_submit_lead('40404040-4040-4040-8040-404040404040',gen_random_uuid(),'{"name":"Synthetic Person","company":"Test Company","phone":"61911112222","email":"capture@example.invalid","interest":"Test","contactPermission":true}');exception when others then denied:=true;end;
 if not denied then raise exception 'Paused form accepted data';end if;
end $$;
reset role;
update public.crm_lead_forms set active=true where id='40404040-4040-4040-8040-404040404040';
insert into public.crm_lead_receipts(form_id,request_id,fingerprint,contact_id,deal_id) select form_id,gen_random_uuid(),'quota-test',contact_id,deal_id from public.crm_lead_receipts cross join generate_series(1,4) where form_id='40404040-4040-4040-8040-404040404040';
set local role anon;
do $$ declare denied boolean:=false;begin
 begin perform public.crm_submit_lead('40404040-4040-4040-8040-404040404040',gen_random_uuid(),'{"name":"Synthetic Person","company":"Test Company","phone":"61911112222","email":"capture@example.invalid","interest":"Test","contactPermission":true}');exception when others then denied:=true;end;
 if not denied then raise exception 'Per-minute limit bypassed';end if;
end $$;
reset role;
rollback;
select 'Public capture, routing, attribution, deduplication and permissions passed; synthetic data rolled back' as result;
