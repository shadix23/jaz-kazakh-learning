(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.JazCurriculum = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const REQUIRED_COLUMNS = Object.freeze(['student_id', 'class', 'teacher', 'subject', 'textbook', 'topic', 'question_id', 'correct', 'pretest', 'date']);
  const OPTIONAL_COLUMNS = Object.freeze(['question_text', 'answer', 'correct_answer']);
  const THRESHOLDS = Object.freeze([
    Object.freeze({ min: 80, key: 'good', label: '≥80% — освоено' }),
    Object.freeze({ min: 60, key: 'mid', label: '60–<80% — повторить' }),
    Object.freeze({ min: 0, key: 'low', label: '<60% — затруднение' })
  ]);

  function fail(line, message) { throw new Error('Строка ' + line + ': ' + message); }
  function band(score) {
    if (score == null || !Number.isFinite(Number(score))) return 'missing';
    const threshold = THRESHOLDS.find(item => Number(score) >= item.min);
    return threshold ? threshold.key : 'low';
  }

  // The first unquoted delimiter in the header determines the CSV dialect.
  function delimiter(text) {
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (!quoted && (char === ',' || char === ';')) return char;
      else if (!quoted && (char === '\n' || char === '\r')) break;
    }
    return ',';
  }

  function records(text, separator) {
    const result = [];
    let fields = [], value = '', state = 'start', line = 1, startLine = 1;
    function field() { fields.push(value); value = ''; state = 'start'; }
    function record() {
      field();
      if (fields.some(item => item.trim() !== '')) result.push({ fields, line: startLine });
      fields = [];
    }
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const newline = char === '\n' || char === '\r';
      if (state === 'quoted') {
        if (char === '"') {
          if (text[i + 1] === '"') { value += '"'; i++; }
          else state = 'closed';
        } else if (newline) {
          value += '\n';
          if (char === '\r' && text[i + 1] === '\n') i++;
          line++;
        } else value += char;
      } else if (char === separator) field();
      else if (newline) {
        record();
        if (char === '\r' && text[i + 1] === '\n') i++;
        line++;
        startLine = line;
      } else if (state === 'closed') {
        if (!/\s/u.test(char)) fail(line, 'после закрывающей кавычки ожидается разделитель.');
      } else if (char === '"') {
        if (state !== 'start' || value !== '') fail(line, 'кавычка внутри незаключённого в кавычки поля.');
        state = 'quoted';
      } else { value += char; state = 'plain'; }
    }
    if (state === 'quoted') fail(startLine, 'не закрыта кавычка.');
    if (fields.length || value !== '' || state === 'closed') record();
    return result;
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function parseCSV(input) {
    if (typeof input !== 'string') fail(1, 'ожидается текст CSV.');
    if (input.length > 10000000) fail(1, 'файл слишком большой (максимум 10 МБ текста).');
    const text = input.replace(/^\uFEFF/u, '');
    const data = records(text, delimiter(text));
    if (!data.length) fail(1, 'файл пуст; нужна строка заголовков.');
    const headers = data[0].fields.map(value => value.trim());
    if (new Set(headers).size !== headers.length) fail(data[0].line, 'повторяются названия колонок.');
    const missing = REQUIRED_COLUMNS.filter(key => !headers.includes(key));
    if (missing.length) fail(data[0].line, 'отсутствуют колонки: ' + missing.join(', ') + '.');
    const students = new Map(), teachers = new Map(), pretests = new Map(), textbooks = new Map();
    return data.slice(1).map(record => {
      if (record.fields.length !== headers.length) fail(record.line, 'число полей не совпадает с заголовком.');
      const raw = Object.fromEntries(headers.map((key, index) => [key, record.fields[index].trim()]));
      const row = {};
      for (const key of REQUIRED_COLUMNS.concat(OPTIONAL_COLUMNS)) {
        if (raw[key] !== undefined) row[key] = raw[key];
      }
      for (const key of REQUIRED_COLUMNS) if (row[key] === '') fail(record.line, 'не заполнено поле «' + key + '».');
      for (const key of ['student_id', 'class', 'teacher', 'subject', 'textbook', 'topic', 'question_id']) {
        if (row[key].length > 200 || /[\u0000-\u001f\u007f]/u.test(row[key])) fail(record.line, 'недопустимый код или название в поле «' + key + '».');
      }
      if (!/^[01]$/u.test(row.correct)) fail(record.line, 'correct должен быть 0 или 1.');
      if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/u.test(row.pretest) || Number(row.pretest) > 100) fail(record.line, 'pretest должен быть числом от 0 до 100.');
      if (!validDate(row.date)) fail(record.line, 'date должна быть реальной датой YYYY-MM-DD.');
      row.correct = Number(row.correct);
      row.pretest = Number(row.pretest);
      const studentClass = students.get(row.student_id);
      if (studentClass !== undefined && studentClass !== row.class) fail(record.line, 'код ученика относится к разным классам.');
      students.set(row.student_id, row.class);
      const teacherKey = JSON.stringify([row.class, row.subject]);
      if (teachers.has(teacherKey) && teachers.get(teacherKey) !== row.teacher) fail(record.line, 'у класса по одному предмету указаны разные учителя.');
      teachers.set(teacherKey, row.teacher);
      const pretestKey = JSON.stringify([row.student_id, row.subject, row.topic]);
      if (pretests.has(pretestKey) && pretests.get(pretestKey) !== row.pretest) fail(record.line, 'входной балл ученика по теме различается между ответами.');
      pretests.set(pretestKey, row.pretest);
      if (textbooks.has(pretestKey) && textbooks.get(pretestKey) !== row.textbook) fail(record.line, 'для ученика по одной теме указаны разные учебники; независимое сравнение невозможно.');
      textbooks.set(pretestKey, row.textbook);
      return row;
    });
  }

  function exportCSV(rows) {
    const columns = REQUIRED_COLUMNS.concat(OPTIONAL_COLUMNS);
    const quote = value => {
      const text = value == null ? '' : String(value);
      return /[",;\r\n]/u.test(text) ? '"' + text.replace(/"/gu, '""') + '"' : text;
    };
    return [columns.join(',')].concat(rows.map(row => columns.map(key => quote(row[key])).join(','))).join('\r\n');
  }
  function templateCSV(rows) { return exportCSV(rows || []); }
  function unique(rows, key) { return [...new Set(rows.map(row => row[key]).filter(value => value != null && value !== ''))].sort((a, b) => String(a).localeCompare(String(b), 'ru')); }
  function subjects(rows) { return unique(rows, 'subject'); }
  function classes(rows, subject) { return unique(subject ? rows.filter(row => row.subject === subject) : rows, 'class'); }
  function topics(rows, subject) { return unique(subject ? rows.filter(row => row.subject === subject) : rows, 'topic'); }
  function filterRows(rows, options) {
    const opts = options || {};
    let selected = opts.subject ? rows.filter(row => row.subject === opts.subject) : rows.slice();
    const period = Number(opts.period || 0);
    if (![0, 7, 14].includes(period)) throw new Error('Период должен быть 0, 7 или 14 дней.');
    if (period && selected.length) {
      const latest = selected.reduce((last, row) => row.date > last ? row.date : last, '');
      const earliest = new Date(Date.parse(latest + 'T00:00:00Z') - (period - 1) * 86400000).toISOString().slice(0, 10);
      selected = selected.filter(row => row.date >= earliest && row.date <= latest);
    }
    return opts.className ? selected.filter(row => row.class === opts.className) : selected;
  }

  function cell(rows, topic, className) {
    const selected = rows.filter(row => (!topic || row.topic === topic) && (!className || row.class === className));
    const n = new Set(selected.map(row => row.student_id)).size;
    const answers = selected.length;
    const groups = new Map();
    for (const row of selected) {
      if (!groups.has(row.question_id)) groups.set(row.question_id, { id: row.question_id, text: row.question_text || row.question_id, wrongCount: 0, total: 0, wrongAnswers: new Map() });
      const group = groups.get(row.question_id);
      group.total++;
      if (Number(row.correct) === 0) {
        group.wrongCount++;
        if (row.answer != null && String(row.answer).trim() !== '') group.wrongAnswers.set(String(row.answer), (group.wrongAnswers.get(String(row.answer)) || 0) + 1);
      }
    }
    const questions = [...groups.values()].map(group => {
      const wrong = [...group.wrongAnswers.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
      return { id: group.id, text: group.text, errorRate: group.wrongCount / group.total * 100, wrongCount: group.wrongCount, total: group.total, frequentWrong: wrong.length ? wrong[0][0] : null };
    }).sort((a, b) => b.errorRate - a.errorRate || a.id.localeCompare(b.id, 'ru'));
    return { score: answers ? selected.reduce((sum, row) => sum + Number(row.correct), 0) / answers * 100 : null, n, answers, lowData: n < 10 || answers < 30, questions };
  }


  // Algorithms below are transplanted from the supplied jaz-metodist.html.
  // Each invocation owns its reference state; the public adapter uses CSV rows.
  function referenceEngine() {
var THRESH={ok:THRESHOLDS[0].min,warn:THRESHOLDS[1].min};
var MASTERY=0.6;                      // ученик освоил тему, если доля верных >= 60%
var MIN_STUD=10, MIN_ANS=30;          // порог надёжности
var TODAY=43;                         // день 43 = 11 ноября 2026 (день 0 = 29 сентября)
var CUT={all:0,'2w':TODAY-14,'1w':TODAY-7};
var PL={all:'вся четверть','2w':'последние 2 недели','1w':'последняя неделя'};
var MATN={A:'Учебник А',B:'Учебник Б'};
var REL={ok:'достаточно данных',few:'мало данных',none:'нет данных'};

var TOPICS=[
  {id:'t1',kk:'Әр әріп маңызды',ru:'Буквы Ә, І, Қ, Ғ',base:1.2,w:1},
  {id:'t2',kk:'Н мен Ң',ru:'Н и Ң',base:-0.2,w:3},
  {id:'t3',kk:'Сұрақ қою',ru:'Вопросительные слова',base:0.6,w:2},
  {id:'t4',kk:'Қайда барамыз?',ru:'Окончания направления',base:0.35,w:2}
];
var TOPIC={};TOPICS.forEach(function(t,i){TOPIC[t.id]=t;t.i=i});
/* x: задание, o: варианты, k: индекс верного, d: сложность (логиты) */
var QUESTIONS=[
  {t:'t1',x:'_лем',o:['А','Ә','Е'],k:1,d:0.4},
  {t:'t1',x:'ба_ыт',o:['К','Қ','Х'],k:1,d:-0.2},
  {t:'t1',x:'са_ат',o:['Қ','Г','Ғ'],k:2,d:-0.5},
  {t:'t1',x:'б_лім',o:['И','І','Ы'],k:1,d:0.1},
  {t:'t1',x:'_ылым',o:['Г','Қ','Ғ'],k:2,d:-0.6},
  {t:'t1',x:'_ке',o:['А','Ә','Е'],k:1,d:0.5},
  {t:'t2',x:'жа_а',o:['Н','М','Ң'],k:2,d:-0.3},
  {t:'t2',x:'мы_',o:['Н','Ң','Г'],k:1,d:-0.5},
  {t:'t2',x:'а_а',o:['Ң','Н','М'],k:1,d:0.6},
  {t:'t2',x:'та_',o:['Н','Ң','М'],k:1,d:-0.2},
  {t:'t2',x:'қа_ат',o:['Ң','Н','М'],k:1,d:0.2},
  {t:'t2',x:'а_',o:['Н','Ң','М'],k:1,d:-0.1},
  {t:'t3',x:'___ келдің? — Мектептен.',o:['Қайда','Қайдан','Қашан'],k:1,d:0.2},
  {t:'t3',x:'___ тұрасың? — Алматыда.',o:['Кім','Қайдан','Қайда'],k:2,d:0.4},
  {t:'t3',x:'Бұл ___? — Бұл кітап.',o:['Кім','Не','Қайда'],k:1,d:0.7},
  {t:'t3',x:'Ол ___? — Ол менің досым.',o:['Не','Қашан','Кім'],k:2,d:0.3},
  {t:'t3',x:'___ барасың? — Ертең.',o:['Қайда','Неге','Қашан'],k:2,d:-0.1},
  {t:'t3',x:'Сенің жағдайың ___? — Жақсы.',o:['Не','Қалай','Кім'],k:1,d:0.0},
  {t:'t4',x:'Мектеп_ барамын',o:['-ге','-ке','-ға'],k:1,d:-0.3},
  {t:'t4',x:'Үй_ барамын',o:['-ке','-ге','-ға'],k:1,d:0.5},
  {t:'t4',x:'Қала_ барамыз',o:['-қа','-ға','-ге'],k:1,d:0.2},
  {t:'t4',x:'Кино_ барамыз',o:['-ге','-ға','-қа'],k:1,d:0.3},
  {t:'t4',x:'Дүкен_ барамыз',o:['-ға','-ге','-ке'],k:1,d:0.1},
  {t:'t4',x:'Сабақ_ барамыз',o:['-ға','-қа','-ке'],k:1,d:-0.4}
];

/* ---------- helpers ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){var u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function sig(x){return 1/(1+Math.exp(-x))}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function mean(a){var s=0;for(var i=0;i<a.length;i++)s+=a[i];return a.length?s/a.length:0}
function hashStr(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function f1(x){return x.toFixed(1).replace('.',',')}
function f2(x){return x.toFixed(2).replace('.',',')}
function sgn(x){return (x>=0?'+':'−')+f1(Math.abs(x))}
function pc(x){return Math.round(x)+'%'}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function band(p){return p>=THRESH.ok?'ok':p>=THRESH.warn?'warn':'bad'}
function fmtQ(x){return esc(x).replace(/_+/g,'<span class="blank"></span>')}

/* ---------- demo data generator (two configurations of the same school) ---------- */
function build(kind){
  var r=mulberry32(4711);
  var teachers=[{id:'u1',name:'Учитель 1'},{id:'u2',name:'Учитель 2'}];
  var classes=kind==='clean'
    ?[{id:'1А',teacher:'u1',mat:'A',size:26},{id:'1Б',teacher:'u1',mat:'B',size:24},{id:'1В',teacher:'u2',mat:'A',size:25},{id:'1Г',teacher:'u2',mat:'B',size:23}]
    :[{id:'1А',teacher:'u1',mat:'A',size:26},{id:'1Б',teacher:'u1',mat:'A',size:24},{id:'1В',teacher:'u2',mat:'B',size:25},{id:'1Г',teacher:'u2',mat:'B',size:23}];
  var effT={u1:0,u2:0.25};
  var effM={t1:{A:0,B:0},t2:{A:0,B:0.5},t3:{A:0,B:0},t4:{A:0,B:-0.35}};
  var GROWTH=0.3;
  var cm={};classes.forEach(function(c){cm[c.id]={};TOPICS.forEach(function(t){cm[c.id][t.id]=c.mat})});
  var students=[],pre=[],answers=[];
  classes.forEach(function(c,ci){
    var ce=0.2*gauss(r);
    for(var k=0;k<c.size;k++){
      var si=students.length,ab=0.9*gauss(r);
      students.push({id:'S-'+String(si+1).padStart(3,'0'),c:ci});
      var p={};
      TOPICS.forEach(function(t){p[t.id]=clamp(Math.round(100*sig(t.base+ab+0.3*gauss(r))),0,100)});
      pre.push(p);
      QUESTIONS.forEach(function(q,qi){
        var t=TOPIC[q.t];
        var z=t.base+q.d+ab+ce+effT[c.teacher]+effM[t.id][cm[c.id][t.id]]+GROWTH;
        var u=r(),u2=r(),dd=Math.floor(r()*43);
        var ok=u<sig(z);
        var pick=q.k;
        if(!ok){var w=[];for(var j=0;j<q.o.length;j++)if(j!==q.k)w.push(j);pick=u2<0.65?w[0]:w[1]}
        answers.push({s:si,q:qi,ok:ok?1:0,p:pick,d:dd,c:ci});
      });
    }
  });
  return {kind:kind,teachers:teachers,classes:classes,cm:cm,students:students,pre:pre,answers:answers,live:0};
}

/* ---------- analytics ---------- */
function inPeriod(a,period){return a.d>=CUT[period]}
function clsOk(ds,a,cls){return cls==='all'||ds.classes[a.c].id===cls}
function cell(ds,tid,cls,period){
  var n=0,ok=0,st={};
  for(var i=0;i<ds.answers.length;i++){var a=ds.answers[i];
    if(QUESTIONS[a.q].t!==tid||!clsOk(ds,a,cls)||!inPeriod(a,period))continue;
    n++;ok+=a.ok;st[a.s]=1}
  return {nAns:n,nStud:Object.keys(st).length,pct:n?100*ok/n:null};
}
function rel(x){return x.nAns===0?'none':(x.nStud<MIN_STUD||x.nAns<MIN_ANS)?'few':'ok'}
function qStats(ds,tid,cls,period){
  var out=[];
  QUESTIONS.forEach(function(q,qi){
    if(q.t!==tid)return;
    var n=0,ok=0,picks=q.o.map(function(){return 0});
    ds.answers.forEach(function(a){if(a.q===qi&&clsOk(ds,a,cls)&&inPeriod(a,period)){n++;ok+=a.ok;picks[a.p]++}});
    var wi=-1;q.o.forEach(function(_,j){if(j!==q.k&&(wi<0||picks[j]>picks[wi]))wi=j});
    out.push({q:q,qi:qi,n:n,pct:n?100*ok/n:null,wrong:wi,wrongShare:n&&wi>=0?100*picks[wi]/n:0});
  });
  return out;
}
function studentScores(ds,tid,cls,period){
  var m={};
  ds.answers.forEach(function(a){
    if(QUESTIONS[a.q].t!==tid||!clsOk(ds,a,cls)||!inPeriod(a,period))return;
    var x=m[a.s]||(m[a.s]={n:0,ok:0});x.n++;x.ok+=a.ok});
  return Object.keys(m).map(function(s){return m[s].ok/m[s].n});
}
function planRows(ds){
  var rows=TOPICS.map(function(t){
    var sc=studentScores(ds,t.id,S.cls,S.period),n=sc.length;
    var notM=sc.filter(function(x){return x<MASTERY}).length;
    var share=n?notM/n:0,w=S.w[t.id];
    return {t:t,n:n,notM:notM,share:share,w:w,pr:share*w,h:0,fr:0};
  });
  var sum=rows.reduce(function(a,r){return a+r.pr},0);
  rows.forEach(function(r){r.raw=sum?S.reserve*r.pr/sum:0;r.h=Math.floor(r.raw);r.fr=r.raw-r.h});
  var left=S.reserve-rows.reduce(function(a,r){return a+r.h},0);
  if(sum){rows.slice().sort(function(a,b){return b.fr-a.fr}).slice(0,left).forEach(function(r){r.h++})}
  rows.sort(function(a,b){return b.pr-a.pr});
  return {rows:rows,sum:sum};
}

/* confounding detector: can the textbook effect be separated from the teacher? */
function detect(ds,tid){
  var used={A:Object.create(null),B:Object.create(null)};
  ds.classes.forEach(function(c){used[ds.cm[c.id][tid]][c.teacher]=1});
  var tn=function(id){return ds.teachers.filter(function(t){return t.id===id})[0].name};
  var shared=ds.teachers.map(function(t){return t.id}).filter(function(id){return used.A[id]&&used.B[id]});
  var lone=['A','B'].filter(function(m){return Object.keys(used[m]).length<2});
  var ok=lone.length===0&&shared.length>=1;
  var why='',fix=[];
  if(!ok){
    var one=lone.filter(function(m){return Object.keys(used[m]).length===1});
    var zero=lone.filter(function(m){return Object.keys(used[m]).length===0});
    var parts=[];
    if(one.length===2&&Object.keys(used.A)[0]!==Object.keys(used.B)[0])
      parts.push(MATN.A+' используется только у «'+tn(Object.keys(used.A)[0])+'», '+MATN.B+' — только у «'+tn(Object.keys(used.B)[0])+'».');
    else one.forEach(function(m){parts.push(MATN[m]+' используется только у «'+tn(Object.keys(used[m])[0])+'».')});
    zero.forEach(function(m){parts.push(MATN[m]+' не используется ни в одном классе.')});
    why=parts.join(' ')+' Различие результатов нельзя отделить от влияния учителя.';
    one.forEach(function(m){
      var other=ds.teachers.filter(function(t){return !used[m][t.id]}).map(function(t){return t.name})[0];
      if(other)fix.push('Хотя бы один класс «'+other+'» переходит на учебник '+m.replace('A','А').replace('B','Б')+'.');
    });
    if(!fix.length)fix.push('Нужен хотя бы ещё один учитель, который использует каждый из материалов.');
  }
  return {ok:ok,why:why,fix:fix,shared:shared,used:used,tn:tn};
}
function estimate(cs,shared){
  var num=0,den=0;
  shared.forEach(function(t){var a=cs[t].A,b=cs[t].B,w=a.length*b.length/(a.length+b.length);num+=w*(mean(b)-mean(a));den+=w});
  return num/den;
}
function compare(ds,tid){
  ds.cc=ds.cc||{};var key=ds.answers.length+':'+tid;if(ds.cc[key])return ds.cc[key];
  var sums={};
  ds.answers.forEach(function(a){if(QUESTIONS[a.q].t!==tid)return;var m=sums[a.s]||(sums[a.s]={n:0,ok:0});m.n++;m.ok+=a.ok});
  var cells=Object.create(null);ds.teachers.forEach(function(t){cells[t.id]={A:[],B:[]}});
  var pcl=ds.classes.map(function(c){return {c:c,sc:[],g:[]}});
  Object.keys(sums).forEach(function(si){
    var st=ds.students[si],cl=ds.classes[st.c],mat=ds.cm[cl.id][tid];
    var score=100*sums[si].ok/sums[si].n,gain=score-ds.pre[si][tid];
    cells[cl.teacher][mat].push(gain);pcl[st.c].sc.push(score);pcl[st.c].g.push(gain);
  });
  var det=detect(ds,tid);
  var res={det:det,cells:cells,perClass:pcl.map(function(p){return {id:p.c.id,teacher:p.c.teacher,mat:ds.cm[p.c.id][tid],n:p.sc.length,score:mean(p.sc),gain:mean(p.g)}})};
  if(!det.ok){res.state='blocked'}
  else{
    res.strata=det.shared.map(function(t){return {t:t,nA:cells[t].A.length,nB:cells[t].B.length,gA:mean(cells[t].A),gB:mean(cells[t].B)}});
    var small=res.strata.some(function(s){return s.nA<MIN_STUD||s.nB<MIN_STUD});
    if(small){res.state='few'}
    else{
      res.state='ok';res.diff=estimate(cells,det.shared);
      var rng=mulberry32(hashStr(ds.seedKey||(ds.kind+tid))),B=1000,vals=[];
      for(var b=0;b<B;b++){
        var cs=Object.create(null);
        det.shared.forEach(function(t){cs[t]={};['A','B'].forEach(function(m){var arr=cells[t][m],o=new Array(arr.length);for(var i=0;i<arr.length;i++)o[i]=arr[Math.floor(rng()*arr.length)];cs[t][m]=o})});
        vals.push(estimate(cs,det.shared));
      }
      vals.sort(function(a,b){return a-b});
      res.lo=vals[Math.floor(.025*B)];res.hi=vals[Math.floor(.975*B)];
    }
  }
  ds.cc[key]=res;return res;
}
function verdict(res){
  if(res.state==='blocked')return {tone:'bad',level:'вывод заблокирован',text:'Вывод об эффекте учебника не делается: учитель и учебник не разделены.'};
  if(res.state==='few')return {tone:'warn',level:'мало данных',text:'В одной из групп меньше '+MIN_STUD+' учеников. Вывод не делается.'};
  var who=res.diff>=0?MATN.B:MATN.A;
  if(res.lo>0||res.hi<0)return {tone:'ok',level:'достаточно данных',text:who+' связан с большим приростом: '+sgn(Math.abs(res.diff))+' п.п. (95% ДИ: '+sgn(res.diff>=0?res.lo:-res.hi)+' … '+sgn(res.diff>=0?res.hi:-res.lo)+'). Это наблюдаемая связь, причинность не доказана.',sig:true};
  return {tone:'info',level:'достаточно данных',text:'Различие не подтверждено данными: оценка '+sgn(res.diff)+' п.п. (Б − А), 95% ДИ '+sgn(res.lo)+' … '+sgn(res.hi)+' включает 0.',sig:false};
}


    var S = { cls: 'all', period: 'all', reserve: 6, w: Object.create(null) };
    return { build: build, compare: compare, detect: detect, estimate: estimate, planRows: planRows, cell: cell, topics: TOPICS, questions: QUESTIONS, state: S, setCatalog: function (topics, questions) { TOPICS = topics; QUESTIONS = questions; } };
  }

  function build(kind, subject) {
    const reference = referenceEngine();
    const scenario = ['confounded', 'conf', 'mixed'].includes(kind) ? 'conf' : 'clean';
    const dataset = reference.build(scenario);
    const name = subject || 'Математика';
    const mathTopics = ['Дроби', 'Уравнения', 'Геометрия', 'Вероятность'];
    const mathQuestions = [
      ['1/2 + 1/4 = ?', '3/4'], ['2/3 − 1/3 = ?', '1/3'], ['1/2 × 2/3 = ?', '1/3'], ['3/4 ÷ 3 = ?', '1/4'], ['Сократите 4/8', '1/2'], ['Что больше: 2/3 или 1/3?', '2/3'],
      ['x + 3 = 7', '4'], ['2x = 10', '5'], ['x − 4 = 2', '6'], ['3x + 1 = 10', '3'], ['x/2 = 4', '8'], ['5 − x = 2', '3'],
      ['Сумма углов треугольника?', '180°'], ['Площадь квадрата со стороной 3?', '9'], ['Периметр квадрата со стороной 2?', '8'], ['Прямой угол равен?', '90°'], ['Сколько сторон у треугольника?', '3'], ['Диаметр при радиусе 2?', '4'],
      ['Вероятность орла у честной монеты?', '1/2'], ['Вероятность шестёрки на кубике?', '1/6'], ['Вероятность чётного числа на кубике?', '1/2'], ['Вероятность невозможного события?', '0'], ['Вероятность достоверного события?', '1'], ['Из 4 шаров 1 красный. Вероятность красного?', '1/4']
    ];
    const kazakh = name === 'Казахский язык';
    const mathWrong = [
      ['2/6', '1/4'], ['1', '1/6'], ['2/5', '1'], ['9/4', '3/7'], ['4/4', '2/8'], ['1/3', 'Они равны'],
      ['10', '3'], ['10', '20'], ['2', '−2'], ['9', '11/3'], ['2', '6'], ['7', '−3'],
      ['360°', '90°'], ['6', '12'], ['4', '16'], ['180°', '45°'], ['4', '2'], ['2', '8'],
      ['1', '1/4'], ['1/3', '1/2'], ['1/3', '2/3'], ['1', '1/2'], ['0', '1/2'], ['1/3', '3/4']
    ];
    const firstDate = Date.UTC(2026, 8, 29);
    return dataset.answers.map(answer => {
      const student = dataset.students[answer.s], cls = dataset.classes[answer.c], question = reference.questions[answer.q];
      const topicIndex = reference.topics.findIndex(topic => topic.id === question.t);
      const math = mathQuestions[answer.q];
      const wrongIndex = [0, 1, 2].filter(index => index !== question.k).indexOf(answer.p);
      return { student_id: student.id, class: cls.id, teacher: cls.teacher, subject: name, textbook: dataset.cm[cls.id][question.t], topic: kazakh ? reference.topics[topicIndex].ru : mathTopics[topicIndex], question_id: 'q-' + (answer.q + 1), correct: answer.ok, pretest: dataset.pre[answer.s][question.t], date: new Date(firstDate + answer.d * 86400000).toISOString().slice(0, 10), question_text: kazakh ? question.x : math[0], answer: kazakh ? question.o[answer.p] : answer.ok ? math[1] : mathWrong[answer.q][wrongIndex], correct_answer: kazakh ? question.o[question.k] : math[1] };
    });
  }

  function adaptRows(rows, topic, books) {
    const chosen = books || unique(rows, 'textbook').slice(0, 2);
    const selected = rows.filter(row => chosen.includes(row.textbook));
    const reference = referenceEngine();
    const topicNames = unique(selected, 'topic');
    if (topic != null && !topicNames.includes(topic)) topicNames.push(topic);
    const catalog = topicNames.map((name, i) => ({ id: name, ru: name, kk: name, w: 1, i }));
    const questionMap = new Map(), questions = [], students = [], studentMap = new Map(), classesList = [], classMap = new Map(), pre = [], answers = [], cm = Object.create(null), teacherNames = unique(selected, 'teacher');
    selected.forEach(row => {
      const classKey = JSON.stringify([row.class, row.teacher, row.textbook]);
      if (!classMap.has(classKey)) {
        const id = row.class + (classesList.some(cls => cls.id === row.class) ? ' · ' + row.textbook : '');
        classMap.set(classKey, classesList.length); classesList.push({ id, teacher: row.teacher }); cm[id] = Object.create(null);
      }
      const ci = classMap.get(classKey), cls = classesList[ci];
      cm[cls.id][row.topic] = row.textbook === chosen[0] ? 'A' : 'B';
      const skey = JSON.stringify([row.student_id, ci]);
      if (!studentMap.has(skey)) { studentMap.set(skey, students.length); students.push({ id: row.student_id, c: ci }); pre.push(Object.create(null)); }
      const si = studentMap.get(skey); pre[si][row.topic] = Number(row.pretest);
      const qkey = JSON.stringify([row.topic, row.question_id]);
      if (!questionMap.has(qkey)) { questionMap.set(qkey, questions.length); questions.push({ t: row.topic, x: row.question_text || row.question_id, o: [], k: 0 }); }
      answers.push({ s: si, q: questionMap.get(qkey), ok: Number(row.correct), c: ci, d: 0 });
    });
    // A topic absent from a class must not imply that a book was used there.
    const relevantClasses = classesList.filter(cls => topic == null || cm[cls.id][topic] !== undefined);
    reference.setCatalog(catalog, questions);
    const scenario = teacherNames.every(teacher => new Set(selected.filter(row => row.teacher === teacher).map(row => row.textbook)).size === 1) ? 'conf' : 'clean';
    const referenceTopic = ['Буквы Ә, І, Қ, Ғ', 'Н и Ң', 'Вопросительные слова', 'Окончания направления'].indexOf(topic);
    const mathTopic = ['Дроби', 'Уравнения', 'Геометрия', 'Вероятность'].indexOf(topic);
    const seedTopic = referenceTopic >= 0 ? 't' + (referenceTopic + 1) : mathTopic >= 0 ? 't' + (mathTopic + 1) : topic;
    const ds = { kind: scenario, seedKey: scenario + seedTopic, teachers: teacherNames.map(id => ({ id, name: id })), classes: classesList, students, pre, answers, cm };
    return { reference, ds, chosen, relevantClasses, catalog };
  }

  function detect(rows, topic, books) {
    const adapted = adaptRows(rows, topic, books);
    const ds = { ...adapted.ds, classes: adapted.relevantClasses };
    return adapted.reference.detect(ds, topic);
  }
  function estimate(cells, shared) { return referenceEngine().estimate(cells, shared); }
  function compare(rows, topic, books) {
    const adapted = adaptRows(rows, topic, books);
    // Reference indexes students by their original class. Keep those indexes for
    // aggregation, but ignore absent-topic classes in its detector.
    const absent = adapted.ds.classes.some(cls => adapted.ds.cm[cls.id][topic] === undefined);
    if (absent) {
      return compare(rows.filter(row => row.topic === topic), topic, books);
    }
    const result = adapted.reference.compare(adapted.ds, topic);
    result.books = adapted.chosen;
    result.bootstrapRepeats = result.state === 'ok' ? 1000 : 0;
    return result;
  }
  function planRows(rows, options) {
    const opts = options || {};
    const reserve = Number(opts.reserve == null ? 6 : opts.reserve);
    if (!Number.isSafeInteger(reserve) || reserve < 0 || reserve > 100000) throw new Error('Резерв должен быть целым числом от 0 до 100000.');
    const selected = filterRows(rows, { subject: opts.subject, className: opts.className, period: opts.period });
    // Planning considers every book, unlike the two-book comparison adapter.
    const adapted = adaptRows(selected, null, unique(selected, 'textbook'));
    const weights = opts.weights || opts.w || {};
    adapted.reference.state.reserve = reserve;
    adapted.catalog.forEach(topic => {
      const weight = !Object.prototype.hasOwnProperty.call(weights, topic.id) || weights[topic.id] == null ? 1 : Number(weights[topic.id]);
      if (![1, 2, 3].includes(weight)) throw new Error('Вес темы должен быть 1, 2 или 3.');
      adapted.reference.state.w[topic.id] = weight;
    });
    const result = adapted.reference.planRows(adapted.ds);
    // The supplied reference leaves all reserve unassigned when priorities are
    // zero. The requested conservation rule uses an explicit equal fallback.
    if (!result.sum && result.rows.length) {
      const base = Math.floor(reserve / result.rows.length), remainder = reserve % result.rows.length;
      result.rows.forEach((row, index) => { row.h = base + (index < remainder ? 1 : 0); row.raw = reserve / result.rows.length; });
      result.fallback = 'equal-zero-priority';
      result.note = 'Все приоритеты равны нулю: резерв распределён поровну; это не рекомендация по затруднениям.';
    }
    result.unallocated = reserve - result.rows.reduce((sum, row) => sum + row.h, 0);
    return result;
  }

  return { REQUIRED_COLUMNS, OPTIONAL_COLUMNS, THRESHOLDS, band, parseCSV, exportCSV, templateCSV, unique, subjects, classes, topics, filterRows, cell, build, detect, estimate, compare, planRows };
});
