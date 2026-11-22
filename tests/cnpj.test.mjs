import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeCnpj,validCnpj,companySuggestion} from '../src/cnpj.mjs';
import {createContact,emptyDatabase,createPipeline,createDeal,setCompanyDetails} from '../src/domain.mjs';
test('CNPJ accepts numeric and official alphanumeric check digits without losing letters',()=>{assert.equal(normalizeCnpj('12.abc.345/01de-35'),'12ABC34501DE35');assert.equal(validCnpj('12.ABC.345/01DE-35'),true);assert.equal(validCnpj('19.131.243/0001-97'),true);for(const value of ['00000000000000','19131243000198','12ABC34501DE36','19131243000197<script>'])assert.equal(validCnpj(value),false);});
test('company suggestions keep contact details separate and omit partners and unnecessary payload',()=>{const result=companySuggestion({razao_social:'Test Company',nome_fantasia:'Test',email:'company@example.invalid',ddd_telefone_1:'61911112222',cnae_fiscal:123,uf:'DF',qsa:[{nome_socio:'must not store'}]});assert.equal(result.legalName,'Test Company');assert.equal(result.companyEmail,'company@example.invalid');assert.equal(result.companyPhone,'61911112222');assert.equal('qsa'in result,false);assert.equal('email'in result,false);});
test('contact stores editable business fields and retains person phone and email',()=>{const db=emptyDatabase();const c=createContact(db,{name:'Person',email:'person@example.invalid',phone:'61922223333',cnpj:'12.ABC.345/01DE-35',organization:'Edited company',legalName:'Edited legal name',companyEmail:'company@example.invalid',city:'Brasília'});assert.equal(c.cnpj,'12ABC34501DE35');assert.equal(c.organization,'Edited company');assert.equal(c.business.legalName,'Edited legal name');assert.equal(c.email,'person@example.invalid');assert.equal(c.phone,'61922223333');assert.throws(()=>createContact(db,{name:'Invalid',cnpj:'123'}));});
test('lookup rejects malformed or unavailable responses without calling the provider for invalid IDs',async()=>{
 for(const [tag,fetcher,expected]of [
  ['notfound',async()=>({ok:false,status:404}),/não encontrado/],
  ['unavailable',async()=>{throw Error('Network unavailable');},/manualmente/],
  ['badjson',async()=>({ok:true,json:async()=>{throw Error('Invalid JSON');}}),/manualmente/],
  ['wrongcompany',async()=>({ok:true,json:async()=>({cnpj:'00000000000000',razao_social:'Wrong'})}),/não corresponde/]
 ]){const{lookupCnpj}=await import('../public/cnpj-lookup.mjs?test='+tag);await assert.rejects(lookupCnpj('19131243000197',fetcher),expected);}
 const {lookupCnpj}=await import('../public/cnpj-lookup.mjs?test=cache');let calls=0;const fetcher=async()=>{calls++;return{ok:true,json:async()=>({cnpj:'19131243000197',razao_social:'Synthetic'})};};await assert.rejects(lookupCnpj('123',fetcher));assert.equal(calls,0);await lookupCnpj('19131243000197',fetcher);await lookupCnpj('19.131.243/0001-97',fetcher);assert.equal(calls,1);
});
