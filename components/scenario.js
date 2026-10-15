import { escapeHtml as esc } from '../format.js';
import { color } from '../colors.js';

/* A plan-versus-actual chart in IBCS notation: AC actual (solid), FC forecast (hatched), PL plan (outline),
   with a row of variance pins below (difference to plan, red when worse, green when better).
   Columns start at zero so the bars are not exaggerated (IBCS: ensure visual integrity). */
export function scenario({ labels, plan, actual, forecast, fmt, aria, max, step, costUp = true }) {
  const w = 900, h = 300, l = 56, r = 14, t = 20, b = 28, pinH = 56;
  const n = labels.length;
  const ih = h - t - b - pinH - 18, iw = w - l - r;
  const slot = iw / n, bw = slot * 0.7, fw = slot * 0.46;
  const y = v => t + ih * (1 - v / max);
  const ac = color('blue'), good = color('green'), bad = color('red');
  const measured = [...actual, ...forecast];
  const variances = measured.map((v, i) => v - plan[i]);
  const vmax = Math.max(...variances.map(Math.abs), 0.001);
  const baseY = t + ih + 30 + pinH / 2; // zero line of the pins
  let s = `<defs><pattern id="hatch-fc" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.5" height="6" fill="${ac}"/></pattern></defs>`;
  for (let v = 0; v <= max + 1e-9; v += step) {
    s += `<line x1="${l}" x2="${w - r}" y1="${y(v)}" y2="${y(v)}" stroke="#16273f"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${esc(fmt(v))}</text>`;
  }
  labels.forEach((lb, i) => {
    const cx = l + slot * i + slot / 2;
    s += `<rect x="${cx - bw / 2}" y="${y(plan[i])}" width="${bw}" height="${y(0) - y(plan[i])}" fill="none" stroke="#c9d6ea" stroke-width="1.2"><title>Plan ${esc(lb)}: ${esc(fmt(plan[i]))}</title></rect>`;
    if (i < actual.length) {
      s += `<rect x="${cx - fw / 2}" y="${y(actual[i])}" width="${fw}" height="${y(0) - y(actual[i])}" fill="${ac}"><title>Actual ${esc(lb)}: ${esc(fmt(actual[i]))}</title></rect>`;
    } else {
      const f = forecast[i - actual.length];
      s += `<rect x="${cx - fw / 2}" y="${y(f)}" width="${fw}" height="${y(0) - y(f)}" fill="url(#hatch-fc)" stroke="${ac}" stroke-width="1"><title>Forecast ${esc(lb)}: ${esc(fmt(f))}</title></rect>`;
    }
    s += `<text x="${cx}" y="${t + ih + 14}" text-anchor="middle">${esc(lb)}</text>`;
    const v = variances[i];
    const worse = (v > 0) === costUp;
    const len = Math.abs(v) / vmax * (pinH / 2 - 6);
    const py = v >= 0 ? baseY - len : baseY;
    s += `<rect x="${cx - 1.5}" y="${py}" width="3" height="${Math.max(1, len)}" fill="${worse ? bad : good}"><title>Difference to plan ${esc(lb)}: ${v >= 0 ? '+' : '-'}${esc(fmt(Math.abs(v)))}</title></rect>`;
    s += `<text x="${cx}" y="${v >= 0 ? py - 3 : py + len + 11}" text-anchor="middle" style="font-size:9.5px">${v >= 0 ? '+' : '-'}${esc(fmt(Math.abs(v)))}</text>`;
  });
  s += `<line x1="${l}" x2="${w - r}" y1="${baseY}" y2="${baseY}" stroke="#8fa2c3"/>`;
  return `<div class="chart wide"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(aria)}">${s}</svg></div>` +
    `<div class="legend"><span><i style="background:${ac}"></i>AC actual</span><span><i style="background:repeating-linear-gradient(45deg,${ac} 0 2px,transparent 2px 4px);border:1px solid ${ac}"></i>FC forecast (trend)</span><span><i style="border:1px solid #c9d6ea;background:none"></i>PL plan</span><span><i style="background:${bad}"></i>Over plan</span><span><i style="background:${good}"></i>Under plan</span></div>`;
}
