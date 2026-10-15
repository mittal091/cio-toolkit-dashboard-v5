/* Browser test runner (no Node needed). Serve the project folder and open tests/browser.html. */
import * as D from '../data-access.js';
import { renderView, hasTiles } from '../render.js';
import { evidenceDialog, decisionDialog } from '../components/dialog.js';
import { escapeHtml } from '../format.js';

const lines = [];
let failed = 0;
const ok = (name, cond, detail = '') => {
  if (cond) lines.push('PASS  ' + name);
  else { failed++; lines.push('FAIL  ' + name + (detail ? '\n        ' + detail : '')); }
};
const text = html => new DOMParser().parseFromString(html, 'text/html');

try {
  const read = async p => (await fetch('../' + p)).json();
  await D.init(read);
  const views = await read('config/views.json');
  const roles = (await read('config/roles.json')).roles.map(r => r.id);
  const ROLE = 'cio';
  const render = (id, role = ROLE) => renderView(D.getView(id), role);
  const M = (k, m) => D.getMetric(k, m, ROLE);

  const walk = (blocks, fn) => blocks.forEach(b => { fn(b); if (b.blocks) walk(b.blocks, fn); });
  const tileRefs = [];
  views.forEach(v => walk(v.blocks, b => { if (b.type === 'tiles') b.items.forEach(i => tileRefs.push({ ...i, view: v.id })); }));

  /* ================= structure: outcomes first (CIO.com "3D scoreboard", IBCS SAY) ================= */
  ok('there are 24 tiles across the six role views', tileRefs.length === 24, String(tileRefs.length));
  ok('cockpit tiles are outcomes (roadmap, year-end landing, AI value, IT spend), not driver counts',
    tileRefs.filter(t => t.view === 'cockpit').map(t => `${t.kpi}:${t.metric}`).join() === 'K03:onTime,K06:landing,K32:measuredValue,K05:itSpendPct');
  const cockpit = text(render('cockpit'));
  const order = [...cockpit.body.children].map(e => e.className.split(' ')[0] + ':' + ((e.querySelector('h3') || e.querySelector('h2') || {}).textContent || '')).join(' | ');
  ok('cockpit order: banner, Outcomes, tiles, decisions, Drivers, error budget, one event, Ask',
    /briefing.*sec-h:Outcomes.*tiles.*Needs your attention.*sec-h:Drivers.*error budget used.*One event.*Ask the dashboard/.test(order), order);
  ok('section labels are phrased as questions', [...cockpit.querySelectorAll('.sec-h span')].map(e => e.textContent).join('|') === 'Are we winning?|Is the machine running?');
  ok('every view opens with a message (a headline in the banner), before any number', views.filter(v => hasTiles(v)).every(v => { const c = text(render(v.id)).body.children; return [...c].findIndex(e => e.classList.contains('briefing')) <= 1; }));

  /* ================= IBCS: titles carry measure, unit and period ================= */
  const period = /(W1 to W12|week 8|April to March|12 weeks)/i;
  const chartBlocks = [];
  views.forEach(v => walk(v.blocks, b => { if (b.type === 'chart' || b.type === 'errorbudget') chartBlocks.push({ ...b, view: v.id }); }));
  const noPeriod = chartBlocks.filter(b => !period.test(((b.title || '') + ' ' + (b.subtitle || ''))));
  ok('every chart title or subtitle names its period', noPeriod.length === 0, noPeriod.map(b => b.view + ': ' + b.title).join(' | '));

  /* ================= error budget (Google SRE) ================= */
  ok('error budget used: Payments 240%, Customer portal 120%, Core ERP 60%, Email 20%', M('K16', 'paymentsBudgetUsed').valueText === '240%');
  const eb = [...text(render('ops')).querySelectorAll('.ebrow')];
  ok('ops shows four services with their budget used in words and numbers', eb.length === 4 && ['240%', '120%', '60%', '20%'].every((p, i) => eb[i].textContent.includes(p + ' used')), eb.map(e => e.textContent.slice(0, 40)).join('|'));
  ok('over-budget services say Over budget and the freeze action in text', eb.slice(0, 2).every(e => e.textContent.includes('Over budget') && e.textContent.includes('Freeze non-essential releases')) && eb.slice(2).every(e => e.textContent.includes('Within budget') && !e.textContent.includes('Freeze')));
  ok('services over budget: 2 of 4', M('K16', 'overBudget').valueText === '2 of 4');
  ok('the release policy and its owner are stated', text(render('cockpit')).body.textContent.includes('freeze non-essential releases until reliability work restores it') && text(render('cockpit')).body.textContent.includes('The service owner decides'));
  ok('attention list leads with the error budget, not a bare availability figure', D.getDataset('attention', ROLE).rows[1].item.text === 'Payments has used 240% of its error budget');

  /* ================= forecast and plan (FinOps, TBM, IBCS notation) ================= */
  ok('year-end landing $124.0M against a plan of $120.0M (+3.3%)', M('K06', 'landing').valueText === '$124.0M' && M('K06', 'fullYearPlan').valueText === '$120.0M' && M('K06', 'landingVsPlan').valueText === '+3.3%');
  ok('year to date is $61.4M against $60.0M plan (+2.3%)', M('K06', 'ytdActual').valueText === '$61.4M' && M('K06', 'ytdBudget').valueText === '$60.0M' && M('K06', 'budgetYtd').valueText === '+2.3%');
  const pc = D.getPlanChart('K06', 'monthlyActual', 'monthlyBudget', ROLE);
  ok('forecast fills the six months to come with the last three months average', pc.actual.length === 6 && pc.forecast.length === 6 && pc.plan.length === 12 && Math.abs(pc.forecast[0] - (10.3 + 10.3 + 10.7) / 3) < 1e-9);
  ok('landing is exactly actual plus forecast', Math.abs(pc.actual.reduce((a, b) => a + b, 0) + pc.forecast.reduce((a, b) => a + b, 0) - 124.0) < 1e-9);
  const fin = text(render('fin'));
  const sc = fin.querySelector('svg[aria-label^="IT spend against plan"]');
  ok('plan chart uses IBCS notation (AC, FC, PL) with a variance pin for each of the 12 months', !!sc && fin.body.textContent.includes('AC actual') && fin.body.textContent.includes('FC forecast') && fin.body.textContent.includes('PL plan') && sc.querySelectorAll('rect[fill="none"]').length === 12 && sc.querySelectorAll('rect[fill^="url(#hatch"]').length === 6, sc ? String(sc.querySelectorAll('rect').length) : 'no chart');
  ok('the forecast method and its limit are disclosed on the tile evidence', evidenceDialog(D.getEvidence('K06', 'landing', ROLE)).includes('trend-based') && evidenceDialog(D.getEvidence('K06', 'landing', ROLE)).includes('Forecast accuracy cannot be tracked'));
  ok('forecast drift is shown as the change arrow on the landing tile (up vs last month is bad)', JSON.stringify(D.getMetric('K06', 'landing', ROLE).delta) === JSON.stringify({ text: '▲ $0.6M', tone: 'bad' }), JSON.stringify(D.getMetric('K06', 'landing', ROLE).delta));

  /* ================= variance waterfall (IBCS: explain the why) ================= */
  const wf = D.getDataset('cloud-waterfall', ROLE).rows;
  const wk = D.getSeries('K07', 'weekly', ROLE).values;
  ok('waterfall starts at week 8, ends at week 12, and the steps add up', wf[0].value === wk[7] && wf[wf.length - 1].value === wk[11] && wf[0].value + wf.filter(r => r.kind === 'delta').reduce((a, r) => a + r.value, 0) === wf[wf.length - 1].value);
  ok('the week 9 drivers inside the waterfall (+$61k, +$12k) add up to the +$73k spike', wf[1].value + wf[2].value === wk[8] - wk[7]);
  const wfSvg = fin.querySelector('svg[aria-label^="Cloud spend bridge"]');
  ok('waterfall labels every step with its sign and value', !!wfSvg && ['$192k', '+$61k', '+$12k', '-$48k', '-$12k', '$205k'].every(s => [...wfSvg.querySelectorAll('text')].some(t => t.textContent === s)));
  ok('waterfall colours are unified: increases red, decreases green', (() => { const r = [...wfSvg.querySelectorAll('rect')]; return r[1].getAttribute('fill') === r[2].getAttribute('fill') && r[3].getAttribute('fill') === r[4].getAttribute('fill') && r[1].getAttribute('fill') !== r[3].getAttribute('fill'); })());
  ok('waterfall title ties to the number leaders see in the banner', fin.body.textContent.includes('Why cloud cost is 7% above week 8'));

  /* ================= DORA: speed and stability together, no vanity count, no targets ================= */
  const delRefs = tileRefs.filter(t => t.view === 'del').map(t => `${t.kpi}:${t.metric}`).join();
  ok('delivery headline tiles carry no raw deployment count (a vanity metric)', !delRefs.includes('K11:deploysLastWeek') && delRefs === 'K03:onTime,K14:flagged,X01:changeFailRate,X01:recoveryTime', delRefs);
  ok('DORA measures have no target (targets invite gaming)', ['changeFailRate', 'recoveryTime'].every(m => !D.getMetric('X01', m, ROLE).targetText));
  ok('DORA advice is in the evidence note', evidenceDialog(D.getEvidence('X01', 'changeFailRate', ROLE)).includes('DORA advises against setting it as a target'));
  const del = text(render('del'));
  ok('delivery shows speed (deployments) and stability (change fail rate) side by side', !!del.querySelector('svg[aria-label="Deployments per week"]') && !!del.querySelector('svg[aria-label="Change fail rate per week"]'));
  ok('the change fail rate peaks with release R-214 in week 9', D.getSeries('X01', 'changeFailRate', ROLE).values[8] === 17 && D.getSeries('X01', 'changeFailRate', ROLE).markers[0].index === 8);
  ok('a proposed KPI is labelled as not yet in the catalogue', evidenceDialog(D.getEvidence('X01', 'changeFailRate', ROLE)).includes('proposed addition, not yet in the KPI catalogue') && !evidenceDialog(D.getEvidence('K17', 'incidentsW12', ROLE)).includes('proposed addition'));

  /* ================= AI value: measured versus estimated (baseline rule) ================= */
  const av = D.getDataset('ai-value', ROLE).rows;
  ok('every measured benefit has a documented baseline, and no estimate claims one', av.every(r => (r.basis === 'Measured') === (r.baseline === 'Documented')));
  ok('AI benefit measured $1.3M, estimated $1.6M, annualised spend $2.50M', M('K32', 'measuredValue').valueText === '$1.3M' && M('K32', 'estimatedValue').valueText === '$1.6M' && M('K35', 'annualised').valueText === '$2.50M');
  ok('2 of 6 live use cases are measured, and the live count comes from the register (6)', M('K32', 'measuredBenefit').valueText === '2 of 6' && M('K31', 'live').valueText === '6' && M('K31', 'useCases').valueText === '41');
  const ai = text(render('ai'));
  ok('AI view pairs spend with value and labels each benefit Measured or Estimated', ai.body.textContent.includes('Only $1.3M a year of benefit is measured') && ai.body.textContent.includes('$2.50M a year of AI spend') && [...ai.querySelectorAll('.b')].filter(b => b.textContent === 'Measured').length === 2 && [...ai.querySelectorAll('.b')].filter(b => b.textContent === 'Estimated').length === 4);

  /* ================= tiles: evidence, deltas, priors ================= */
  const missing = [];
  for (const t of tileRefs) {
    const m = D.getMetric(t.kpi, t.metric, ROLE);
    const e = D.getEvidence(t.kpi, t.metric, ROLE);
    if (!m.hasPrior) missing.push(`${t.kpi}:${t.metric} has no prior value`);
    if (!e.owner) missing.push(`${t.kpi}:${t.metric} has no owner`);
    if (!e.source) missing.push(`${t.kpi}:${t.metric} has no source`);
    if (!e.note) missing.push(`${t.kpi}:${t.metric} has no note`);
  }
  ok('every tile metric has a prior value, owner, source and note', missing.length === 0, missing.join('; '));
  const d = (k, m) => D.getMetric(k, m, ROLE).delta;
  const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got));
  eq('K17 incidents ▲1 is bad (lower is better)', d('K17', 'incidentsW12'), { text: '▲ 1', tone: 'bad' });
  eq('K17 MTTR ▼0.3h is good', d('K17', 'mttrW12'), { text: '▼ 0.3h', tone: 'good' });
  eq('K20 patched ▼2 pp is bad (higher is better)', d('K20', 'patchedInSla'), { text: '▼ 2 pp', tone: 'bad' });
  eq('X01 change fail rate ▼1 pp is good', d('X01', 'changeFailRate'), { text: '▼ 1 pp', tone: 'good' });
  eq('K32 measured benefit ▲$0.2M is good (higher is better)', d('K32', 'measuredValue'), { text: '▲ $0.2M', tone: 'good' });
  eq('text metrics have no delta', d('K09', 'renewals'), null);

  /* ================= rendering and access ================= */
  let threw = 0;
  for (const r of roles) for (const v of views) {
    try { if (!renderView(v, r).length) threw++; } catch (e) { threw++; lines.push('   ' + r + '/' + v.id + ': ' + e.message); }
  }
  ok('every role x view renders without error', threw === 0, String(threw));
  ok('cio opens eight views, in two groups', D.viewsFor('cio').length === 8 && D.viewsFor('cio').filter(v => v.group === 'Act').length === 2);
  ok('other roles do not see the Act views', roles.filter(r => r !== 'cio').every(r => !D.viewsFor(r).some(v => v.group === 'Act')));
  const opsForFinance = renderView(D.getView('ops'), 'finance');
  ok('finance sees a denied error-budget block, not the data', opsForFinance.includes('Not available for your role') && !opsForFinance.includes('Over budget'));
  const secForFinance = renderView(D.getView('sec'), 'finance');
  ok('finance sees locked tiles on the security view, and they are not buttons', secForFinance.includes('tile locked') && text(secForFinance).querySelectorAll('button.tile').length === 0);
  ok('evidence is denied for a role without the domain', D.getEvidence('K20', 'criticalOpen', 'finance').denied === true);
  ok('release-freeze question is refused for a role without the service domain', D.answer({ id: 'q-freeze' }, 'finance', 'ops').status === 'denied' && D.answer({ id: 'q-freeze' }, 'ops', 'ops').status === 'answered');
  ok('the freeze answer names Payments at 240% and says the owner decides', (() => { const a = D.answer({ id: 'q-freeze' }, ROLE, 'cockpit').text; return a.includes('240%') && a.includes('service owner decides'); })());

  for (const v of views.filter(x => hasTiles(x))) {
    const doc = text(render(v.id));
    const tiles = [...doc.querySelectorAll('.tiles .tile')];
    ok(`${v.id}: four tiles, all buttons that open evidence`, tiles.length === 4 && tiles.every(t => t.tagName === 'BUTTON' && t.dataset.ev && t.getAttribute('aria-label')));
    ok(`${v.id}: every tile shows a status pill and a footer`, tiles.every(t => t.querySelector('.tf .b') && t.querySelector('.tf span').textContent.trim().length > 0));
    ok(`${v.id}: has a banner with a headline`, !!doc.querySelector('.briefing h2'));
  }
  ok('tiles carry no AI badge and no catalogue IDs in their sub-lines', views.every(v => { const d2 = text(render(v.id)); return d2.querySelectorAll('.tile .ai').length === 0 && [...d2.querySelectorAll('.tile .s')].every(e => !/\bK\d{2}\b/.test(e.textContent)); }));
  ok('no duplicate ids in any view', views.every(v => { const ids = [...text(renderView(v, ROLE)).querySelectorAll('[id]')].map(e => e.id); return new Set(ids).size === ids.length; }));
  ok('no unresolved tokens anywhere in a rendered page', views.every(v => !renderView(v, ROLE).includes('{{')));
  const withSpark = views.flatMap(v => [...text(render(v.id)).querySelectorAll('.tiles .tile')].filter(t => t.querySelector('svg.spark')).map(t => t.dataset.ev)).sort();
  ok('sparklines appear on the tiles that have a series', JSON.stringify(withSpark) === JSON.stringify(['K03:onTime', 'K03:onTime', 'K07:spend12w', 'K17:incidentsW12', 'K17:mttrW12', 'K20:criticalOpen', 'K35:llmSpendWeek', 'X01:changeFailRate', 'X01:recoveryTime'].sort()), withSpark.join());
  ok('sparklines are decorative (hidden from screen readers)', [...text(render('ops')).querySelectorAll('svg.spark')].every(s => s.getAttribute('aria-hidden') === 'true'));

  /* ================= decisions ================= */
  const ev = D.getEvidence('K17', 'incidentsW12', ROLE);
  ok('evidence dialog shows value, status, source, owner and note', ['14', 'Watch', 'Incident ledger', 'Operations', 'release R-214'].every(s => evidenceDialog(ev).includes(s)));
  ok('evidence dialog escapes markup', !evidenceDialog({ ...ev, label: '<img src=x onerror=alert(1)>', note: '<b>x</b>' }).includes('<img'));
  ok('decision dialog escapes markup', !decisionDialog({ ...D.getAction('A1', ROLE), step: '<script>alert(1)</script>' }).includes('<script>'));
  D.resetActionStatuses();
  const status = id => D.getDataset('attention', ROLE).rows.find(r => r.id === id).status;
  ok('decision log starts with the data defaults', status('A1') === 'In progress' && status('A2') === 'Open');
  D.setActionStatus('A2', 'Complete');
  ok('changing a status is reflected in the log and as a read-only badge on the cockpit', status('A2') === 'Complete' && text(render('actions')).querySelector('select[data-status="A2"]').value === 'Complete' && text(render('cockpit')).querySelectorAll('select.stsel').length === 0);
  D.resetActionStatuses();
  ok('reset restores the defaults', status('A2') === 'Open');
  let threwBad = false; try { D.setActionStatus('A2', 'Hacked'); } catch (e) { threwBad = true; }
  let threwId = false; try { D.setActionStatus('ZZ', 'Open'); } catch (e) { threwId = true; }
  ok('invalid status or id is rejected', threwBad && threwId);
  ok('decision log is closed to other roles', D.getDataset('attention', 'finance').denied === true && D.getAction('A1', 'security').denied === true);
  const stat = () => text(render('cockpit')).querySelector('.briefing .summary');
  ok('cockpit banner number is the count of open decisions', stat().querySelector('strong').textContent === '5' && stat().textContent.includes('2 critical, 3 due soon'), stat().textContent);
  D.setActionStatus('A1', 'Complete');
  ok('completing a decision updates the banner count', stat().querySelector('strong').textContent === '4' && stat().textContent.includes('1 critical, 3 due soon'));
  D.resetActionStatuses();
  ok('role-view banners are one narrative with no number that repeats a tile', ['fin', 'ops', 'del', 'sec', 'ai'].every(id => { const b = text(render(id)).querySelector('.briefing'); return b && b.classList.contains('solo') && !b.querySelector('.summary'); }));
  let badTok = false; try { D.resolveText('{{ds:nope:open}}'); } catch (e) { badTok = true; }
  ok('unknown dataset tokens are rejected', badTok);

  /* ================= board pack ================= */
  const pack = text(render('pack'));
  const body = pack.querySelector('.pack').textContent;
  ok('board pack carries the draft label, buttons and the key numbers',
    !!pack.querySelector('#print-pack') && !!pack.querySelector('#download-pack') && /Human approval required/.test(pack.body.textContent) &&
    ['240%', '4.6h', '3.1h', '38%', '$73k', '7%', '$124.0M', '$120.0M', '+3.3%', '99.88%', '2 of 4', '17 critical', '88%', '$1.3M', '$2.50M'].every(s => body.includes(s)), body.slice(0, 300));
  ok('board pack lists three decisions from the log and discloses the forecast and the proposed KPI', pack.querySelectorAll('.pack ol li').length === 3 && body.includes('Confirm patch window this week') && body.includes('trend-based forecast') && body.includes('proposed KPI'));

  /* ================= accessibility refinements ================= */
  ok('data as-of date is available', D.dataAsOf() === '12 Oct 2026');
  const evq = D.getEvidence('K20', 'criticalOpen', ROLE);
  ok('evidence lists who can see the KPI and a formatted as-of date', evq.visibleTo.join('|') === 'CIO office|CISO, Risk and Compliance' && evq.asOf === '12 Oct 2026');
  const aiCases = [['K17', 'incidentsW12', 'AI does real work here'], ['K06', 'budgetYtd', 'a person checks the result'], ['K16', 'servicesMeetingSla', 'only a small part'], ['K05', 'itSpendPct', 'no AI involved']];
  ok('evidence dialog explains the AI position in plain words (High, Medium, Low, None)', aiCases.every(([k, m, s]) => evidenceDialog(D.getEvidence(k, m, ROLE)).includes(s)));
  ok('highlighted incident bar and latest bar carry their numbers', [...text(render('ops')).querySelectorAll('.chart svg text')].some(t => t.textContent === '19') && [...text(render('ops')).querySelectorAll('.chart svg text')].some(t => t.textContent === '14'));
  ok('line chart labels the peak and latest points', ['$265k', '$205k'].every(v => [...fin.querySelectorAll('.chart svg text')].some(t => t.textContent === v)));
  ok('each error-budget bar has a text alternative', [...text(render('ops')).querySelectorAll('.ebt')].every(e => /% of the error budget used/.test(e.getAttribute('aria-label'))));

  /* ---- WCAG contrast of the colour tokens in styles.css (1.4.3 text 4.5:1, 1.4.11 controls 3:1) ---- */
  const cs = getComputedStyle(document.documentElement);
  const tok = n => cs.getPropertyValue('--' + n).trim();
  const lum = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const low = [];
  for (const n of ['ink', 'muted', 'dim', 'cyan', 'amber', 'green', 'red', 'blue', 'purple-text']) for (const bg of ['panel', 'panel2']) {
    if (!tok(n) || !tok(bg)) { low.push(`token missing: ${n}/${bg}`); continue; }
    const r = ratio(tok(n), tok(bg));
    if (r < 4.5) low.push(`${n} on ${bg} is ${r.toFixed(2)}:1`);
  }
  ok('text colours meet 4.5:1 on panel backgrounds', low.length === 0, low.join('; '));
  ok('control borders meet 3:1 against the panel background', ratio(tok('ctrl'), tok('panel2')) >= 3 && ratio(tok('ctrl'), tok('panel')) >= 3);
  ok('chart series colours meet 3:1 (blue, cyan, purple, amber, green, red on the panel)', ['blue', 'cyan', 'purple', 'amber', 'green', 'red'].every(n => ratio(tok(n), tok('panel')) >= 3));

  const dash = String.fromCharCode(0x2014);
  ok('no em dash in any rendered view', views.every(v => !renderView(v, ROLE).includes(dash)));
  ok('escapeHtml neutralises markup', !escapeHtml('<img src=x onerror=alert(1)>').includes('<'));
} catch (e) {
  failed++;
  lines.push('FAIL  runner error: ' + e.message + '\n' + e.stack);
}
lines.push(failed ? `\n${failed} FAILED` : '\nALL PASSED');
document.getElementById('out').textContent = lines.join('\n');
document.title = failed ? 'FAILED' : 'PASSED';
