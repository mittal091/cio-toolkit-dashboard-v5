import { escapeHtml as esc } from '../format.js';
import { badge } from './badge.js';
import { statusBadge, deltaChip } from './tile.js';

const row = (k, v) => (v ? `<b>${esc(k)}:</b> ${esc(v)}<br>` : '');

/* The AI position of a KPI in plain words. It comes from the KPI catalogue (the "AI value" column). */
const AI_TEXT = {
  High: 'High. AI does real work here, such as detecting, ranking or summarising. A person still decides.',
  Medium: 'Medium. AI helps, and a person checks the result.',
  Low: 'Low. AI plays only a small part.',
  None: 'None. A direct measurement, with no AI involved.'
};

/* e: result of getEvidence(). The essentials first; the reference detail sits behind "More detail". */
export function evidenceDialog(e) {
  const head = [e.valueText, e.targetText].filter(Boolean).join(' · ');
  const delta = e.delta
    ? `<p class="muted">${deltaChip(e.delta)} since the previous period${e.priorText ? ` (was ${esc(e.priorText)})` : ''}</p>`
    : '';
  const more =
    row('KPI', e.kpi + (e.proposed ? ' (proposed addition, not yet in the KPI catalogue)' : '')) +
    row('Definition', e.definition) + row('Refresh', e.refresh) +
    row('AI value', AI_TEXT[e.aiValue]) + row('AI role', e.aiRole) + row('How AI helps', e.aiHelp) +
    row('Visible to', e.visibleTo && e.visibleTo.join(', '));
  return `<div class="eyebrow">Evidence</div><h2 id="detail-title">${esc(e.label)}</h2>` +
    `<div>${statusBadge(e.status)}</div>` +
    `<h3>${esc(head)}</h3>${delta}` +
    (e.note ? `<p>${esc(e.note)}</p>` : '') +
    `<div class="source">${row('Owner', e.owner)}${row('Source', e.source)}${row('Data as of', e.asOf)}</div>` +
    `<details class="more"><summary>More detail</summary><div class="source">${more}</div></details>`;
}

/* a: one row of the attention dataset */
export function decisionDialog(a) {
  return `<div class="eyebrow">Decision</div><h2 id="detail-title">${esc(a.step)}</h2>` +
    `<div>${badge({ tone: a.item.tone, text: a.item.badge })}</div>` +
    `<p>${esc(a.item.text)}</p>` +
    `<div class="source">${row('Owner', a.owner)}${row('Due', a.due)}${row('Intended outcome', a.outcome)}${row('Status', a.status)}</div>`;
}
