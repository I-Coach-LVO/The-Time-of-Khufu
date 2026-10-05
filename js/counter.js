(() => {
  const scene = document.getElementById('scene');
  const home = () => Boolean(scene.querySelector('.intro-frame[data-intro-index="0"].is-visible'));
  // A resumed game never registers a homepage visit.
  if (!home()) return;
  const panel = document.createElement('section');
  panel.className = 'visit-counter';
  panel.setAttribute('aria-label', 'Bezoeken aan de homepagina');
  panel.innerHTML = '<h2>BEZOEKEN</h2><dl>' +
    [['day','Vandaag'],['week','Deze week'],['month','Deze maand'],['year','Dit jaar']]
      .map(([key,label]) => '<div><dt>'+label+'</dt><dd data-total="'+key+'">…</dd></div>').join('') +
    '</dl><p role="status">Teller laden…</p>';
  scene.after(panel);
  let dismissed = false;
  const hide = () => { dismissed = true; panel.hidden = true; observer.disconnect(); };
  const observer = new MutationObserver(() => { if (!home()) hide(); });
  observer.observe(scene, {subtree:true, childList:true, attributes:true, attributeFilter:['class']});
  document.getElementById('introNext').addEventListener('click', hide, {once:true});
  document.getElementById('skipIntro')?.addEventListener('click', hide, {once:true});
  const key = 'khufu-home-counted';
  let counted = false;
  try { counted = sessionStorage.getItem(key) === 'yes'; } catch {}
  fetch('/api/visits', {method:counted?'GET':'POST', credentials:'same-origin', cache:'no-store',
    ...(counted?{}:{headers:{'Content-Type':'application/json'},body:'{}'})})
    .then(async response => {
      if (!response.ok) throw new Error('Counter unavailable');
      const totals = await response.json();
      for (const key of ['day','week','month','year']) {
        if (!Number.isSafeInteger(totals[key]) || totals[key] < 0) throw new Error('Invalid totals');
      }
      try { sessionStorage.setItem(key, 'yes'); } catch {}
      panel.querySelectorAll('[data-total]').forEach(el => {
        el.textContent = totals[el.dataset.total].toLocaleString('nl-NL');
      });
      panel.querySelector('[role="status"]').textContent = '';
      if (dismissed) panel.hidden = true;
    })
    .catch(() => {
      panel.querySelectorAll('[data-total]').forEach(el => { el.textContent = '–'; });
      panel.querySelector('[role="status"]').textContent = 'Teller tijdelijk niet beschikbaar';
    });
})();

