import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {recordChanges,cloudMeta} from '../src/cloud-records.mjs';
test('editing one contact sends only that record and does not overwrite another entity',()=>{const first={id:randomUUID(),name:'Synthetic contact'},second={id:randomUUID(),title:'Synthetic deal'},before={contacts:[first],deals:[second]},after=structuredClone(before);after.contacts[0].name='Changed';assert.deepEqual(recordChanges(before,after),[{op:'upsert',kind:'contacts',id:first.id,data:after.contacts[0]}]);});
test('record changes preserve creation and deletion and exclude connection credentials',()=>{const removed={id:randomUUID(),name:'Removed'},added={id:randomUUID(),name:'Added'};const changes=recordChanges({contacts:[removed]},{contacts:[added],tokens:{synthetic:'not-a-record'}});assert.equal(changes.length,2);assert.equal(changes[0].op,'upsert');assert.equal(changes[1].op,'delete');assert.equal(JSON.stringify(changes).includes('tokens'),false);assert.deepEqual(cloudMeta({version:1,activityTypes:['Email'],demo:true,token:'synthetic'}),{version:1,demo:false,activityTypes:['Email']});});
