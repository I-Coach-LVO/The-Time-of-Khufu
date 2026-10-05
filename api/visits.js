const {dayKey,signature,validCookie,record} = require('../lib/visit-counter');
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method)) {
    res.setHeader('Allow','GET, POST'); return res.status(405).json({error:'Method not allowed'});
  }
  // Preview deployments must not pollute real totals.
  if(process.env.VERCEL_ENV && process.env.VERCEL_ENV!=='production')
    return res.status(200).json({day:0,week:0,month:0,year:0});
  const token = process.env.KHUFU_GITHUB_TOKEN;
  if(!token) return res.status(503).json({error:'Counter unavailable'});
  if(req.method==='POST' && (req.headers.origin!=='https://the-time-of-khufu.vercel.app' ||
    !(req.headers['content-type']||'').startsWith('application/json')))
    return res.status(403).json({error:'Forbidden'});
  const increment = req.method==='POST' && !validCookie(req.headers.cookie,token);
  try {
    const today=dayKey();
    const counts=await record({token,increment,today});
    if(increment) res.setHeader('Set-Cookie',
      'khufu_visit='+today+'.'+signature(today,token)+'; Path=/api/visits; HttpOnly; Secure; SameSite=Strict');
    return res.status(200).json(counts);
  } catch(error) {
    console.error('Visit counter:',error.message);
    return res.status(503).json({error:'Counter temporarily unavailable'});
  }
};

