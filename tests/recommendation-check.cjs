const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const data=fs.readFileSync('docs/data.js','utf8'),app=fs.readFileSync('docs/app.js','utf8');
const logic=app.slice(app.indexOf('function analyze('),app.indexOf('function registerRecent('));
const ctx=vm.createContext({console});vm.runInContext(data+'\nlet recent=[],skippedBooks=new Set();\n'+logic+'\nthis.engine={analyze,candidates,chooseBook}; this.B=BOOKS;this.S=SCENARIOS;',ctx);
const cases=[['我怕 AI 取代我的工作',2,'ai'],['我不敢拒絕朋友，總是在討好別人',0,'boundary'],['伴侶沒有回訊息就很沒有安全感',1,'attachment'],['分手後一直放不下前任',1,'breakup'],['每天加班做不完很耗竭',2,'burnout'],['看到同齡朋友的成就，我總是比較',3,'comparison'],['總想做到完美而害怕犯錯',3,'perfection'],['想轉職，想找工作方向',2,'career'],['一件事老是拖延，沒有自律',3,'habit'],['重要的人過世，感到悲傷',4,'grief'],['心情低落卻說不清原因',4,'emotion'],['和朋友吵架，不知道怎麼溝通',0,'communication']];
for(const [text,cat,expected]of cases){const a=ctx.engine.analyze(text,cat);assert.equal(a?.scenario,expected,text);assert(ctx.engine.chooseBook(a),text+' must have book');}
assert.equal(ctx.engine.analyze('幫我解一道微積分題目',2),null);
const a=ctx.engine.analyze('我擔心 AI 取代我的工作',0);assert.equal(a.scenario,'ai','content overrides card');const b=ctx.engine.chooseBook(a);vm.runInContext('recent='+JSON.stringify([b.id]),ctx);assert.notEqual(ctx.engine.chooseBook(a)?.id,b.id,'exclude recent');vm.runInContext('recent=BOOKS.map(b=>b.id)',ctx);assert.equal(ctx.engine.chooseBook(a),null);assert(ctx.engine.chooseBook(a,true),'explicit repeat allowed');
assert.equal(new Set(ctx.B.map(b=>b.id)).size,ctx.B.length);for(const s of ctx.S){assert(ctx.engine.candidates({scenario:s.id,topics:s.topics}).length>0,s.id+' missing candidate');assert(s.title&&s.action&&s.comfort&&s.story)}
for(const b of ctx.B){if(b.isbn){const nums=[...b.isbn].map(Number);assert.equal(nums.length,13);assert.equal(nums.reduce((a,n,i)=>a+n*(i%2?3:1),0)%10,0,b.title+' ISBN checksum')}assert(b.source.startsWith('https://'))}
console.log(`Passed ${cases.length} question cases, cross-category matching, unknown input, repeat prevention, all ${ctx.S.length} scenarios and ${ctx.B.length} book records.`);
