import { escapeHtml as esc } from '../format.js';
import { badge } from './badge.js';

const STATE = {
  ok: { text: 'Within budget', tone: 'green', action: '' },
  caution: { text: 'Caution', tone: 'amber', action: 'Slow risky releases' },
  over: { text: 'Over budget', tone: 'red', action: 'Freeze non-essential releases until the budget is restored' }
};
const SCALE = 250; // the bar runs to 250% so an overspent budget is visible, with a marker at 100%

/* rows: [{ name, availabilityText, used, state }]. The budget is the downtime a service may have under its target.
   Every row states its status in words and the action that the release policy suggests. */
export function errorBudget({ rows, note }) {
  const body = rows.map(r => {
    const s = STATE[r.state] || STATE.ok;
    const width = Math.max(2, Math.min(100, r.used / SCALE * 100));
    return `<div class="ebrow"><div class="ebn">${esc(r.name)}<span class="eba">${esc(r.availabilityText)}</span></div>` +
      `<div class="ebt" role="img" aria-label="${esc(r.name)}: ${Math.round(r.used)}% of the error budget used"><div class="ebf ${r.state}" style="width:${width}%"></div><div class="ebm" style="left:${100 / SCALE * 100}%"></div></div>` +
      `<div class="ebv"><b>${Math.round(r.used)}%</b> used ${badge({ tone: s.tone, text: s.text })}</div>` +
      (s.action ? `<div class="ebact">${esc(s.action)}</div>` : '') + `</div>`;
  }).join('');
  return `<div class="eb">${body}</div>` + (note ? `<p class="src tfoot">${esc(note)}</p>` : '');
}
