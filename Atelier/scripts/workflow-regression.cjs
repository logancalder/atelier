/* eslint-disable @typescript-eslint/no-require-imports */
// Run against a temporary data directory; never reads or changes user records.
const assert=require('node:assert/strict'), fs=require('node:fs'), os=require('node:os'), path=require('node:path'), Module=require('node:module');
const ts=require('typescript');
const originalResolve=Module._resolveFilename;
Module._resolveFilename=function(request,parent,...rest) {
  if(request.startsWith('.') && parent?.filename && !path.extname(request)) {
    const candidate=path.resolve(path.dirname(parent.filename),request+'.ts');
    if(fs.existsSync(candidate)) request=candidate;
  }
  return originalResolve.call(this,request,parent,...rest);
};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
delete process.env.FIREBASE_PROJECT_ID; delete process.env.VERCEL;
const originalCwd=process.cwd(), sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'atelier-workflows-'));
process.chdir(sandbox);
const {mergeProblemLibrary,problemHref,problemAliases,safeProblemUrl}=require('../lib/problem-library.ts');
const {eligiblePayment,reconcileCancelledPayments}=require('../lib/payment-eligibility.ts');
const {verifiedLinkTarget,verifiedCollisionEmail}=require('../lib/identity-linking.ts');
const {upsertCodingProblems,readCodingNotebook}=require('../lib/coding-db.ts');
const {readProva,syncCodingProblemsToProva}=require('../lib/prova.ts');
const {readStudio,replaceStudio,updateStudio}=require('../lib/db.ts');
const record=(patch={})=>({key:'neetcode:two-sum',title:'Two Sum',url:'https://neetcode.io/problems/two-sum?practice=1',notes:'Use a map',seconds:600,submissions:[{accepted:true,at:'2026-09-09T10:00:00Z'}],holeInOne:true,neededHints:false,dontUnderstand:false,sortAt:'2026-09-09T10:00:00Z',updatedAt:'2026-09-09T10:00:00Z',...patch});
const seed={id:1,problemNo:'1',title:'Two Sum',url:'https://leetcode.com/problems/two-sum/',category:'Arrays',difficulty:'Easy',dateSolved:'',solvedFirstTime:'',holeInOne:'',solvedSub20:'',isCompetent:'',notes:'',solved:false,solveTime:'',site:'LC'};
const session=(id,status,day)=>({id,studentId:'student',seriesId:null,startsAt:'2026-09-'+day+'T12:00',durationMin:60,rateCents:5000,status,place:'online',locationNote:'',lessonFocus:'',createdAt:'2026-09-01T00:00:00Z'});
const payment=(id,sessionId,status,day,extra={})=>({id,studentId:'student',sessionId,kind:'session',amountCents:5000,dueDate:'2026-09-'+day,status,receivedAt:status==='received'?'2026-09-01T12:00:00Z':null,memo:'Session',createdAt:'2026-09-01T00:00:00Z',...extra});
const studio=()=>({settings:{tutorName:'',zelleHandle:'',zelleName:''},students:[],series:[],sessions:[session('cancelled','cancelled','02'),session('late','late_cancel','03'),session('past','completed','04'),session('future','scheduled','12')],payments:[payment('receipt','cancelled','received','02',{plaidTransactionId:'bank-1'}),payment('late-fee','late','upcoming','03'),payment('past-due','past','missing','04'),payment('future-due','future','upcoming','12')],notes:[],deletedSessionKeys:[]});
(async()=>{
  let library=mergeProblemLibrary([seed],[record({leetcodeSlug:'two-sum',leetcodeFrontendId:'1'})]);
  assert.equal(library.length,1); assert.equal(library[0].solved,true); assert.equal(library[0].solveTime,'10');
  assert.ok(problemAliases(library[0]).includes('neetcode:two-sum')); assert.ok(problemHref(library[0]).startsWith('/problems/'));
  assert.deepEqual(mergeProblemLibrary(library,[record({leetcodeSlug:'two-sum',leetcodeFrontendId:'1'})]),library);
  library=mergeProblemLibrary(library,[record({key:'neetcode:different',url:'https://neetcode.io/problems/different',title:'Two Sum'})]);
  assert.equal(library.length,2,'same display title must not merge unrelated problems');
  assert.equal(mergeProblemLibrary([], [record(),record()]).length,1,'repeated newly discovered save');
  const bridged=mergeProblemLibrary([seed,{...seed,id:2,site:'NC',problemNo:'',url:record().url,notes:'Keep the NC insight'}],[record({leetcodeSlug:'two-sum'})]);
  assert.equal(bridged.length,1,'explicit cross-site mapping coalesces prior identities');
  assert.ok(problemAliases(bridged[0]).includes('prova:2')); assert.ok(bridged[0].mergedLibraryNotes.includes('Keep the NC insight'));
  assert.equal(safeProblemUrl('javascript:alert(1)'),null); assert.equal(safeProblemUrl(record().url),record().url);
  const changed=record({notes:'Updated note',updatedAt:'2026-09-09T11:00:00Z'});
  await upsertCodingProblems([record()],'local'); await upsertCodingProblems([changed],'local'); await upsertCodingProblems([record()],'local');
  let notebook=readCodingNotebook('local'); assert.equal(notebook.problems[0].notes,'Updated note'); assert.equal(notebook.problems[0].noteHistory.length,1);
  await syncCodingProblemsToProva('local',notebook.problems); assert.equal((await readProva(null)).length,1);
  await upsertCodingProblems([record({notes:'',updatedAt:'2026-09-09T12:00:00Z'})],'local');
  assert.equal((await readProva(null))[0].notes,'','cleared notes propagate');
  assert.equal((await readProva(null)).length,1,'read repairs missing mirror');
  const data=studio(); assert.equal(eligiblePayment(data,data.payments[0]),false); assert.equal(eligiblePayment(data,data.payments[1]),false); assert.equal(eligiblePayment(data,data.payments[2]),true); assert.equal(eligiblePayment(data,data.payments[3]),true);
  reconcileCancelledPayments(data); const receipt=data.payments.find(p=>p.id==='receipt');
  assert.equal(receipt.sessionId,'past'); assert.equal(receipt.originalSessionId,'cancelled'); assert.equal(receipt.plaidTransactionId,'bank-1'); assert.equal(receipt.amountCents,5000); assert.equal(receipt.receivedAt,'2026-09-01T12:00:00Z');
  assert.equal(data.payments.find(p=>p.id==='late-fee').status,'cancelled'); assert.ok(!data.payments.some(p=>p.id==='past-due'));
  const snapshot=JSON.stringify(data); reconcileCancelledPayments(data); assert.equal(JSON.stringify(data),snapshot,'idempotent reconciliation');
  const unmatched=studio(); unmatched.payments=unmatched.payments.filter(p=>p.id==='receipt'); reconcileCancelledPayments(unmatched); assert.equal(unmatched.payments[0].sessionId,null,'preserve unmatched received credit');
  replaceStudio(studio(),'local'); const first=readStudio('local'), second=readStudio('local'); assert.equal(first.payments.filter(p=>p.status==='received').length,1); assert.equal(second.payments.find(p=>p.id==='receipt').sessionId,'past');
  await updateStudio(s=>{s.sessions.find(x=>x.id==='past').status='cancelled';},'local');
  assert.equal(readStudio('local').payments.find(p=>p.id==='receipt').sessionId,'future','second cancellation moves receipt forward');
  assert.equal(verifiedLinkTarget('owner','other',true),false); assert.equal(verifiedLinkTarget('owner','owner',false),false); assert.equal(verifiedLinkTarget('owner','owner',true),true);
  assert.equal(verifiedCollisionEmail('a@example.com','a@example.com',false),false); assert.equal(verifiedCollisionEmail('a@example.com','b@example.com',true),false); assert.equal(verifiedCollisionEmail('A@example.com','a@example.com',true),true);
  console.log('PASS: library identity, idempotence, note history, stale saves, mirror recovery, cancelled/late-cancelled eligibility, receipt preservation/reallocation, repeat cancellation, and verified identity guards.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{process.chdir(originalCwd); if(path.dirname(sandbox)===os.tmpdir() && path.basename(sandbox).startsWith('atelier-workflows-')) fs.rmSync(sandbox,{recursive:true,force:true});});
