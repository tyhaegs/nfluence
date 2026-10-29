import test from 'node:test';
import assert from 'node:assert/strict';
import {socialProfileLink,creatorProfileFromRow,loadCreatorProfile} from '../campaigns/src/data.js';
test('creator social links accept handles and full URLs without duplicating the hostname',()=>{
 assert.equal(socialProfileLink('Instagram','https://www.instagram.com/alex').href,'https://www.instagram.com/alex');
 assert.equal(socialProfileLink('TikTok','@alex').href,'https://tiktok.com/@alex');
 assert.equal(socialProfileLink('YouTube','youtube.com/@alex').href,'https://youtube.com/@alex');
 assert.equal(socialProfileLink('Facebook','alex.creator').href,'https://facebook.com/alex.creator');
 for(const bad of ['javascript:alert(1)','https://evil.example/alex','https://instagram.com.evil.example/a','https://user:password@instagram.com/a'])assert.equal(socialProfileLink('Instagram',bad),null);
});
test('creator profiles retain identity, Facebook, images, follower counts, and saved skills',()=>{
 const p=creatorProfileFromRow({id:'creator',facebook:'alex',facebook_followers:'10000',avatar_url:'photo.png',skills:['photographer']},{name:'Alex'});
 assert.equal(p.userId,'creator');assert.equal(p.name,'Alex');assert.equal(p.facebookFollowers,'10000');assert.equal(p.avatarUrl,'photo.png');assert.deepEqual(p.skills,['photographer']);
});
test('opening a creator loads the profile and reports missing or denied profiles',async()=>{
 const sb=responses=>({from(table){return {select(){return this},eq(){return this},maybeSingle:async()=>responses[table]}}});
 const p=await loadCreatorProfile('c',sb({creator_profiles:{data:{id:'c',bio:'Saved biography',instagram:'alex'}},profiles_public:{data:{id:'c',name:'Alex'}}}));
 assert.equal(p.bio,'Saved biography');assert.equal(p.instagram,'alex');
 await assert.rejects(loadCreatorProfile('c',sb({creator_profiles:{data:null},profiles_public:{data:{id:'c'}}})),/unavailable/);
 await assert.rejects(loadCreatorProfile('c',sb({creator_profiles:{error:{message:'Denied'}},profiles_public:{data:{id:'c'}}})),/Denied/);
});
