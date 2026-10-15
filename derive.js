/* Small named functions for values that are calculated, not typed. */

export const sum = (arr, scale = 1) => arr.reduce((a, b) => a + b, 0) * scale;
export const last = arr => arr[arr.length - 1];
export const first = arr => arr[0];
export const max = arr => Math.max(...arr);
export const at = (arr, i) => arr[i];
export const pctChange = (arr, from, to) => (arr[to] / arr[from] - 1) * 100;
export const diff = (arr, from, to) => arr[to] - arr[from];

const OPS = {
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b
};

export const countWhere = (rows, key, op, value) => rows.filter(r => OPS[op](r[key], value)).length;
export const countMeeting = (rows, key, op, target) => `${countWhere(rows, key, op, target)} of ${rows.length}`;
export const ratioText = (parts, sep = ' / ') => parts.join(sep);

/* Trend-based forecast: the average of the last `window` actuals, repeated for the remaining months.
   FinOps calls this a rolling, trend-based forecast (the "Walk" stage of forecasting maturity). */
export const forecastSeries = (actuals, months, window) => {
  const recent = actuals.slice(-window);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  return Array.from({ length: months }, () => avg);
};

/* Error budget used, in percent. The budget is the unreliability a service may have under its target.
   A service at 99.88% against a 99.95% target has used (100 - 99.88) / (100 - 99.95) = 240% of its budget. */
export const budgetUsed = (availability, target) => (100 - availability) / (100 - target) * 100;

/* The release policy from the SRE book: below `caution` ship normally, up to `over` slow risky releases,
   above `over` freeze non-essential releases until reliability work restores the budget. */
export const budgetState = (used, policy) => (used > policy.over ? 'over' : used >= policy.caution ? 'caution' : 'ok');

/* Evaluate a { derive: "<name>", ... } spec found in a KPI file.
   ctx = { kpi, datasets, metricValue(name) } ; literals are returned unchanged. */
export function evaluate(spec, ctx) {
  if (spec === null || typeof spec !== 'object') return spec;
  const series = n => {
    const s = ctx.kpi.series && ctx.kpi.series[n];
    if (!s) throw new Error(`Unknown series ${n} in ${ctx.kpi.kpi}`);
    return s.values;
  };
  const values = n => {
    const v = ctx.kpi.values && ctx.kpi.values[n];
    if (!v) throw new Error(`Unknown values ${n} in ${ctx.kpi.kpi}`);
    return v;
  };
  const rows = id => {
    const d = ctx.datasets[id];
    if (!d) throw new Error(`Unknown dataset ${id}`);
    return d.rows;
  };
  const upTo = (arr, n) => (n == null ? arr : arr.slice(0, n + 1));
  const target = () => (spec.targetMetric ? ctx.metricValue(spec.targetMetric) : spec.target);
  switch (spec.derive) {
    case 'sum': return sum(upTo(series(spec.series), spec.upTo), spec.scale ?? 1);
    case 'last': return last(series(spec.series));
    case 'first': return first(series(spec.series));
    case 'max': return max(series(spec.series));
    case 'at': return at(series(spec.series), spec.index);
    case 'lastTimes': return last(series(spec.series)) * spec.factor * (spec.scale ?? 1);
    case 'pctChange': return pctChange(series(spec.series), spec.from, spec.to);
    case 'diff': return diff(series(spec.series), spec.from, spec.to);
    case 'pctVs': return (sum(upTo(series(spec.series), spec.upTo)) / sum(upTo(series(spec.base), spec.upTo)) - 1) * 100;
    case 'landing': {
      const a = series(spec.series);
      return (sum(a) + sum(forecastSeries(a, spec.months, spec.window))) * (spec.scale ?? 1);
    }
    case 'landingVsPlan': {
      const a = series(spec.series);
      return ((sum(a) + sum(forecastSeries(a, spec.months, spec.window))) / sum(series(spec.plan)) - 1) * 100;
    }
    case 'countWhere': return countWhere(rows(spec.dataset), spec.key, spec.op, spec.value);
    case 'countMeeting': return countMeeting(rows(spec.dataset), spec.key, spec.op, target());
    case 'rowCount': return rows(spec.dataset).length;
    case 'ofTextRows': return `${rows(spec.dataset).filter(r => r[spec.key] === spec.equals).length} of ${rows(spec.dataset).length}`;
    case 'sumWhere': return rows(spec.dataset).filter(r => r[spec.whereKey] === spec.equals).reduce((a, r) => a + r[spec.key], 0) * (spec.scale ?? 1);
    case 'lookup': {
      const row = rows(spec.dataset).find(r => r[spec.matchKey] === spec.match);
      if (!row) throw new Error(`No row ${spec.match} in ${spec.dataset}`);
      return row[spec.key];
    }
    case 'budgetUsed': {
      const row = rows(spec.dataset).find(r => r[spec.matchKey] === spec.match);
      if (!row) throw new Error(`No row ${spec.match} in ${spec.dataset}`);
      return budgetUsed(row[spec.key], target());
    }
    case 'overBudgetText': {
      const over = rows(spec.dataset).filter(r => budgetUsed(r[spec.key], target()) > spec.limit).length;
      return `${over} of ${rows(spec.dataset).length}`;
    }
    case 'ratioText': return ratioText(spec.order.map(k => values(spec.values)[k]));
    case 'sumCounts': return sum(Object.values(values(spec.values)));
    case 'sumCountsAndRows': return sum(Object.values(values(spec.values))) + rows(spec.dataset).length;
    case 'pick': return values(spec.values)[spec.key];
    case 'pctChangeBetween': {
      const v = values(spec.values);
      return (v[spec.to] / v[spec.from] - 1) * 100;
    }
    case 'ofText': {
      const v = values(spec.values);
      return `${v[spec.a]} of ${v[spec.b]}`;
    }
    default: throw new Error(`Unknown derive ${spec.derive}`);
  }
}
