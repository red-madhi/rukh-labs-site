import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const config = { key:'dropsite',displayName:'Drop Site',sourceDid:'did:source',sourceHandle:'source.test',tableName:'bluesky_dropsite_daily_reposts',envPrefix:'DROP_SITE',defaultHour:8,defaultMinute:30 };
function load(file, sql, fetch, automation = {}, clock = { value: Date.parse('2026-09-10T15:00:00Z') }) {
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [clock.value])); } static now() { return clock.value; } }
  const testModule = { exports:{} };
  const result = ts.transpileModule(fs.readFileSync(path.join(ROOT,'src/lib',file),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
  assert.equal(result.diagnostics.length,0);
  const context = { module:testModule,exports:testModule.exports,require:(id)=> {
    if (id === '@neondatabase/serverless') return { neon:()=>sql };
    if (id === '@/lib/bluesky-repost-automation') return automation;
    throw new Error(`Unexpected import ${id}`);
  },process:{env:{DATABASE_URL:'test-only'}},Date:Clock,Intl,URLSearchParams,AbortSignal,fetch,console:{warn(){},error(){},log(){}},setTimeout,clearTimeout };
  vm.runInNewContext(result.outputText,context,{filename:file});
  return testModule.exports;
}
function response(payload) { return {ok:true,json:async()=>payload}; }
function post(did,uri='at://fresh',text='I shipped my app. New feature: export.',date='2026-09-10T12:00:00Z') {
  return { post:{uri,cid:`cid-${uri}`,author:{did,handle:did},record:{text,createdAt:date}} };
}
function refreshFixture({existing=null,prior=null,latest=post(config.sourceDid),hour=15,failFeed=false}={}) {
  const state={existing:existing && {...existing},writes:[],feeds:0};
  const sql=async(strings,...v)=>{
    const q=strings.join('?').replace(/\s+/g,' ').trim();
    if (/^(create|alter)/i.test(q)) return [];
    if (q.startsWith('select status')) return state.existing ? [{...state.existing}] : [];
    if (q.startsWith('select local_date')) return prior ? [prior] : [];
    state.writes.push({q,v});
    if(q.startsWith('insert')) { state.existing={status:v[7],post_uri:v[4],post_cid:v[5]};return []; }
    if(q.includes("set status='no-new-post'")){state.existing.status='no-new-post';return [{local_date:'2026-09-10'}];}
    if(q.startsWith('update')) {state.existing={status:v[6],post_uri:v[3],post_cid:v[4]};return [];}
    throw new Error(`Unexpected SQL: ${q}`);
  };
  sql.unsafe=(name)=>name;
  const fetch=async()=>{state.feeds++;if(failFeed) return {ok:false,status:503};return response({feed:latest ? [latest] : []});};
  const clock={value:Date.parse(`2026-09-10T${String(hour).padStart(2,'0')}:00:00Z`)};
  return {state,run:load('bluesky-daily-source-refresh.ts',sql,fetch,{},clock).refreshDailySourceCandidate};
}
test('source: a prior-day repost remains no-new-post, not a new completion',async()=>{
  const f=refreshFixture({prior:{local_date:'2026-09-09',repost_uri:'at://yesterday',repost_cid:'old'}});await f.run(config);
  assert.equal(f.state.existing.status,'no-new-post');
});
test('source: an unused source post is prepared for delivery',async()=>{
  const f=refreshFixture();await f.run(config);assert.equal(f.state.existing.status,'failed');
});
test('source: a no-new-post day advances when a newer source post arrives',async()=>{
  const f=refreshFixture({existing:{status:'no-new-post',post_uri:'at://old',post_cid:'old'}});await f.run(config);
  assert.equal(f.state.existing.status,'failed');assert.equal(f.state.existing.post_uri,'at://fresh');
});
test('source: a real completed day is not replaced or reposted',async()=>{
  const f=refreshFixture({existing:{status:'posted',post_uri:'at://real',post_cid:'real',repost_uri:'at://today'}});await f.run(config);
  assert.equal(f.state.feeds,0);assert.equal(f.state.writes.length,0);
});
test('source: current-day false completion using the identical prior record is repaired',async()=>{
  const p=post(config.sourceDid);const f=refreshFixture({existing:{status:'posted',post_uri:p.post.uri,post_cid:p.post.cid,repost_uri:'at://yesterday'},prior:{local_date:'2026-09-09',repost_uri:'at://yesterday'}});
  await f.run(config);assert.equal(f.state.existing.status,'no-new-post');assert.equal(f.state.feeds,1);
});
test('source: the morning time gate prevents early delivery',async()=>{
  const f=refreshFixture({hour:13});await f.run(config);assert.equal(f.state.feeds,0);assert.equal(f.state.writes.length,0);
});
test('source: a feed outage is an error, not a completed day',async()=>{
  const f=refreshFixture({failFeed:true});await assert.rejects(f.run(config),/503/);assert.equal(f.state.writes.length,0);
});
function devFixture(options={}) {
  const clock={value:Date.parse(options.now ?? '2026-09-10T20:00:00Z')};
  const state={rows:structuredClone(options.rows ?? []),calls:[],feeds:[],diagnostics:[],failOnce:Boolean(options.failOnce)};
  const developers=[{did:'did:mutual-a',handle:'mutual-a.test',uses:0},{did:'did:mutual-b',handle:'mutual-b.test',uses:0},{did:'did:fallback',handle:'fallback.test',uses:0}];
  const sql=async(strings,...v)=>{
    const q=strings.join('?').replace(/\s+/g,' ').trim();
    if(q.startsWith('create')) return [];
    if(q.startsWith('select *')) return state.rows.map(r=>({...r}));
    if(q.startsWith('select post_uri')) return state.rows.map(r=>({post_uri:r.post_uri}));
    if(q.startsWith('with usage')) return developers;
    if(q.startsWith('insert')) {
      if(options.denyClaim) return [];
      state.rows.push({local_date:v[0],slot:v[1],source_did:v[2],source_handle:v[3],display_name:v[4],post_uri:v[5],post_cid:v[6],post_text:v[7],post_created_at:v[8],project_score:v[9],status:'posting',updated_at:new Date(clock.value).toISOString()});
      return [{slot:v[1]}];
    }
    if(q.includes("set status='posting'")) {
      const row=state.rows.find(r=>r.slot===v[1]);if(!row || options.denyClaim) return [];
      if(!['failed','posted_pending_index'].includes(row.status) && !(row.status==='posting' && clock.value-Date.parse(row.updated_at)>600000)) return [];
      row.status='posting';row.updated_at=new Date(clock.value).toISOString();return [{slot:row.slot}];
    }
    if(q.includes("set status='posted'")) {const row=state.rows.find(r=>r.slot===v[1]);row.status='posted';row.updated_at=new Date(clock.value).toISOString();return [];}
    if(q.includes("set status='failed'")) {const row=state.rows.find(r=>r.slot===v[2]);row.status='failed';row.last_error=v[0];row.updated_at=new Date(clock.value).toISOString();return [];}
    if(q.startsWith('update')) {const row=state.rows.find(r=>r.slot===v[5]);row.status=v[0];row.repost_uri=v[1];row.last_error=v[3];row.updated_at=new Date(clock.value).toISOString();return [];}
    throw new Error(`Unexpected SQL: ${q}`);
  };
  const fetch=async(url)=>{
    const u=new URL(url);
    if(u.pathname.endsWith('getProfile')) return response({did:'did:owner',handle:'owner.test'});
    if(u.pathname.endsWith('getRelationships')) return response({relationships:[{did:developers[0].did,following:'x'},{did:developers[1].did,followedBy:'y'}]});
    const did=u.searchParams.get('actor');state.feeds.push({did,limit:u.searchParams.get('limit')});
    if(options.feedFailure) return {ok:false,status:503};
    if(options.allProjects || did==='did:fallback') return response({feed:[post(did,`at://${did}/project`,undefined,options.postDate ?? '2026-09-10T12:00:00Z')]});
    return response({feed:[post(did,`at://${did}/chat`,'Good morning.')]});
  };
  const automation={
    getAutomationBlueskyActor:async()=>({configured:true,handle:'owner.test',did:'did:owner'}),
    inspectAutomationRepost:async()=>({found:true,repositoryVerified:true,publicVisible:options.inspectionVisible !== false}),
    createAutomationRepost:async(subject)=>{
      state.calls.push(subject);
      if(state.failOnce){state.failOnce=false;throw new Error('temporary outage');}
      return {uri:`at://owner/repost/${state.calls.length}`,cid:'repost-cid',repositoryVerified:true,publicVisible:options.publicVisible !== false,created:true};
    },
  };
  return {state,clock,run:load('bluesky-dev-project-daily.ts',sql,fetch,automation,clock).runDailyDevProjectReposts};
}
test('developer: eligible fallback survives two preferred authors with no project posts',async()=>{
  const f=devFixture();const result=await f.run({scheduled:true});assert.equal(result.ok,true);assert.equal(f.state.calls.length,1);assert.match(f.state.calls[0].uri,/fallback/);
  assert.ok(f.state.feeds.every(f=>f.limit==='100'));
});
test('developer: eligible network authors are still preferred',async()=>{
  const f=devFixture({allProjects:true});await f.run({scheduled:true});assert.match(f.state.calls[0].uri,/mutual/);
});
test('developer: before 13:00 Denver no posting or feed scan occurs',async()=>{
  const f=devFixture({now:'2026-09-10T18:59:00Z'});const result=await f.run({scheduled:true});assert.equal(result.skipped,true);assert.equal(f.state.calls.length,0);assert.equal(f.state.feeds.length,0);
});
test('developer: explicit target=2 cannot advance the 18:00 slot',async()=>{
  const f=devFixture({allProjects:true});await f.run({scheduled:true,targetCount:2});f.clock.value+=61*60000;await f.run({scheduled:true,targetCount:2});assert.equal(f.state.calls.length,1);
});
test('developer: late catch-up runs maintain at least one hour of separation',async()=>{
  const f=devFixture({allProjects:true,now:'2026-09-11T01:00:00Z'});await f.run({scheduled:true});
  f.clock.value+=10*60000;const skipped=await f.run({scheduled:true});assert.equal(f.state.calls.length,1);assert.match(skipped.message,/stagger/);
  f.clock.value+=51*60000;await f.run({scheduled:true});assert.equal(f.state.calls.length,2);
});
test('developer: a lost concurrent claim cannot publish',async()=>{
  const f=devFixture({denyClaim:true});const r=await f.run({scheduled:true});assert.equal(r.ok,false);assert.equal(f.state.calls.length,0);
});
test('developer: failed publication retries the identical selected post',async()=>{
  const f=devFixture({failOnce:true});assert.equal((await f.run({scheduled:true})).ok,false);
  assert.equal((await f.run({scheduled:true})).ok,true);assert.equal(f.state.calls[0].uri,f.state.calls[1].uri);
});
test('developer: pending public indexing is not marked posted',async()=>{
  const f=devFixture({publicVisible:false});const r=await f.run({scheduled:true});assert.equal(r.ok,false);assert.equal(f.state.rows[0].status,'posted_pending_index');
  const checked=await f.run({scheduled:true});assert.equal(checked.ok,true);assert.equal(f.state.calls.length,1);assert.equal(f.state.rows[0].status,'posted');
});
test('developer: total feed failure is reported and never publishes',async()=>{
  const f=devFixture({feedFailure:true});const r=await f.run({scheduled:true});assert.equal(r.ok,false);assert.equal(r.feedErrors.length,3);assert.equal(f.state.calls.length,0);
});
test('developer: stale posts are still excluded',async()=>{
  const f=devFixture({postDate:'2026-08-01T12:00:00Z'});const r=await f.run({scheduled:true});assert.equal(r.ok,false);assert.equal(f.state.calls.length,0);
});
