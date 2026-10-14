module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({error: 'Method not allowed'});
  }
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production')
    return res.status(200).json({day:0, week:0, month:0, year:0, total:0, preview:true});
  if (req.method === 'POST' &&
      (req.headers.origin !== 'https://the-time-of-khufu.vercel.app' ||
       !(req.headers['content-type'] || '').startsWith('application/json') ||
       (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin')))
    return res.status(403).json({error: 'Forbidden'});
  const url = process.env.KHUFU_SUPABASE_URL;
  const key = process.env.KHUFU_SUPABASE_SECRET_KEY;
  if (!url || !key) return res.status(503).json({error: 'Counter unavailable'});
  try {
    const rpc = req.method === 'POST' ? 'khufu_record_home_visit' : 'khufu_home_visit_totals';
    const headers = {'Content-Type':'application/json', apikey:key};
    // Legacy service_role JWTs require Authorization; new secret keys use apikey.
    if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key;
    const response = await fetch(url.replace(/\/$/, '') + '/rest/v1/rpc/' + rpc, {
      method:'POST', headers, body:'{}', cache:'no-store',
      signal:AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('Counter backend unavailable');
    const totals = await response.json();
    if (['day','week','month','year','total'].some(k => !Number.isSafeInteger(totals[k]) || totals[k] < 0))
      throw new Error('Invalid totals');
    return res.status(200).json(totals);
  } catch {
    // Never log request headers, bodies, addresses or secret-bearing backend responses.
    return res.status(503).json({error: 'Counter temporarily unavailable'});
  }
};
