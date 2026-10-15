import { escapeHtml as esc } from '../format.js';
import { color } from '../colors.js';

/* A variance waterfall that explains the change between two totals (IBCS: use a waterfall for root causes).
   rows: [{ label, kind: "total" | "delta", value }]. costUp is true when an increase is bad news, as for cost. */
export function waterfall({ rows, fmt, aria, min = 0, max, step, costUp = true }) {
  const w = 520, h = 290, l = 46, r = 10, t = 28, b = 62;
  const iw = w - l - r, ih = h - t - b;
  const slot = iw / rows.length, bw = slot * 0.56;
  // running level after each row
  let level = 0;
  const levels = rows.map(row => {
    const from = row.kind === 'total' ? 0 : level;
    level = row.kind === 'total' ? row.value : level + row.value;
    return { from, to: level };
  });
  const top = max ?? Math.ceil(Math.max(...levels.map(x => Math.max(x.from, x.to))) / (step || 50)) * (step || 50);
  const y = v => t + ih * (1 - (v - min) / (top - min));
  const good = color('green'), bad = color('red'), tot = color('blue');
  let s = '';
  for (let v = min; v <= top + 1e-9; v += step || 50) {
    s += `<line x1="${l}" x2="${w - r}" y1="${y(v)}" y2="${y(v)}" stroke="#16273f"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${esc(fmt(v))}</text>`;
  }
  rows.forEach((row, i) => {
    const cx = l + slot * i + slot / 2;
    const { from, to } = levels[i];
    const hi = Math.max(from, to), lo = Math.min(from, to);
    const up = row.value > 0;
    const fill = row.kind === 'total' ? tot : ((up === costUp) ? bad : good);
    s += `<rect x="${cx - bw / 2}" y="${y(hi)}" width="${bw}" height="${Math.max(1, y(lo) - y(hi))}" fill="${fill}" rx="2"><title>${esc(row.label)}: ${esc(fmt(row.value))}</title></rect>`;
    const label = row.kind === 'total' ? fmt(row.value) : (up ? '+' : '-') + fmt(Math.abs(row.value));
    s += `<text x="${cx}" y="${y(hi) - 6}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${esc(label)}</text>`;
    if (i < rows.length - 1) s += `<line x1="${cx + bw / 2}" x2="${cx + slot - bw / 2}" y1="${y(to)}" y2="${y(to)}" stroke="#8fa2c3" stroke-dasharray="3 3"/>`;
    // category label, wrapped greedily to lines of about 13 characters
    const lines = [];
    row.label.split(' ').forEach(word => {
      const cur = lines[lines.length - 1];
      if (cur !== undefined && (cur + ' ' + word).length <= 13) lines[lines.length - 1] = cur + ' ' + word; else lines.push(word);
    });
    lines.forEach((ln, k) => { s += `<text x="${cx}" y="${h - 44 + k * 13}" text-anchor="middle" style="font-size:11.5px">${esc(ln)}</text>`; });  });
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(aria)}">${s}</svg></div>` +
    `<div class="legend"><span><i style="background:${tot}"></i>Total</span><span><i style="background:${bad}"></i>${costUp ? 'Increase (worse)' : 'Increase'}</span><span><i style="background:${good}"></i>${costUp ? 'Decrease (better)' : 'Decrease'}</span></div>`;
}
