const {createHmac, timingSafeEqual} = require('node:crypto');
const REPO = 'I-Coach-LVO/The-Time-of-Khufu';
const BRANCH = 'counter-data';
const PATH = 'visits.json';
const URL = 'https://api.github.com/repos/'+REPO+'/contents/'+PATH;
function dayKey(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone:'Europe/Amsterdam', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(now).map(p => [p.type,p.value]));
  return p.year+'-'+p.month+'-'+p.day;
}
function totals(days, today) {
  const d = new Date(today+'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay()+6)%7);
  const monday = d.toISOString().slice(0,10);
  const result = {day:0,week:0,month:0,year:0};
  for (const [date,count] of Object.entries(days)) {
    if (date > today) continue;
    if (date === today) result.day += count;
    if (date >= monday) result.week += count;
    if (date.slice(0,7) === today.slice(0,7)) result.month += count;
    if (date.slice(0,4) === today.slice(0,4)) result.year += count;
  }
  return result;
}
function signature(day, secret) {
  return createHmac('sha256', secret).update('khufu-visit:'+day).digest('hex');
}
function validCookie(cookie, secret) {
  const value = (cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('khufu_visit='))?.slice(12);
  if (!value || !/^\d{4}-\d{2}-\d{2}\.[a-f0-9]{64}$/.test(value)) return false;
  const [day, sig] = value.split('.');
  return timingSafeEqual(Buffer.from(sig), Buffer.from(signature(day,secret)));
}
async function record({token, increment, today=dayKey(), fetchImpl=fetch, pause=ms=>new Promise(r=>setTimeout(r,ms))}) {
  const headers = {Authorization:'Bearer '+token, Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Khufu-home-counter'};
  for(let attempt=0;attempt<8;attempt++) {
    const read = await fetchImpl(URL+'?ref='+BRANCH, {headers,cache:'no-store',signal:AbortSignal.timeout(6000)});
    // The initialized file must exist: a missing/inaccessible file must never reset totals.
    if(!read.ok) throw new Error('GitHub read failed: '+read.status);
    const file = await read.json();
    const data = JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));
    if(data.version!==1 || !data.days || typeof data.days!=='object' || Array.isArray(data.days) ||
      Object.entries(data.days).some(([d,n])=>!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isSafeInteger(n)||n<0))
      throw new Error('Invalid counter data');
    if(!increment) return totals(data.days,today);
    data.days[today] = (data.days[today]||0)+1;
    const write = await fetchImpl(URL,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},
      signal:AbortSignal.timeout(6000),body:JSON.stringify({
        branch:BRANCH,sha:file.sha,message:'Update homepage visit totals [skip ci]',
        content:Buffer.from(JSON.stringify(data,null,2)+'\n').toString('base64')
      })});
    if(write.ok) return totals(data.days,today);
    if(write.status!==409) throw new Error('GitHub write failed: '+write.status);
    await pause(100*Math.pow(1.6,attempt)+Math.random()*200);
  }
  throw new Error('Counter busy');
}
module.exports = {dayKey,totals,signature,validCookie,record};

