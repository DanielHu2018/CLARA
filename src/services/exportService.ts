/**
 * CLARA — Export Service
 * Generates real downloadable exports: JSON, CSV, and a printable HTML report.
 */
import { shockMatrix, portfolioImpact, hedgeRecommendations, systemMetrics, liveEvents } from '@/data/mockData';

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// ── JSON Export ────────────────────────────────────────────────────────────────
export function exportJSON() {
  const payload = {
    meta: {
      system:    'CLARA v2.4.1',
      generated: new Date().toISOString(),
      cycleId:   `CYC-${Math.floor(Math.random() * 50) + 100}`,
      regime:    'Crisis Contagion',
      compliance: 'SR 11-7',
    },
    systemMetrics,
    activeEvents: liveEvents.slice(0, 5).map(e => ({
      id:       e.id,
      title:    e.title,
      source:   e.source,
      relevance: e.relevanceScore,
      sentiment: e.sentiment,
      novelty:   e.novelty,
      sectors:   e.sectors,
    })),
    shockMatrix: shockMatrix.map(s => ({
      factor:     s.factor,
      base:       s.baseCase,
      adverse:    s.adverseCase,
      severe:     s.severeCase,
      confidence: s.confidence,
      analog:     s.analogRef,
    })),
    portfolioImpact: portfolioImpact.map(p => ({
      metric:    p.metric,
      current:   p.current,
      stressed:  p.stressed,
      limit:     p.limit,
      breached:  p.breached,
      changePct: p.change,
    })),
    hedgeRecommendations: hedgeRecommendations.map(h => ({
      instrument:    h.instrument,
      type:          h.type,
      notional:      h.notional,
      cost:          h.cost,
      effectiveness: h.effectiveness,
      residualTail:  h.residualTail,
    })),
    riskMetrics: {
      var95_1d:   28.7,
      var99_1d:   42.1,
      var99_10d:  72.1,
      es:         45.3,
      tailLossP:  0.084,
      regime:     'Crisis Contagion',
      multiplier: 1.85,
    },
  };

  downloadBlob(
    JSON.stringify(payload, null, 2),
    `CLARA_export_${timestamp()}.json`,
    'application/json',
  );
}

// ── CSV Export ─────────────────────────────────────────────────────────────────
export function exportCSV() {
  const rows: string[] = [];

  rows.push('CLARA RISK EXPORT');
  rows.push(`Generated,${new Date().toISOString()}`);
  rows.push('Regime,Crisis Contagion');
  rows.push('');

  rows.push('SHOCK MATRIX');
  rows.push('Factor,Base (%),Adverse (%),Severe (%),Confidence (%),Analog');
  shockMatrix.forEach(s => {
    rows.push(`${s.factor},${s.baseCase},${s.adverseCase},${s.severeCase},${s.confidence},"${s.analogRef}"`);
  });
  rows.push('');

  rows.push('PORTFOLIO IMPACT');
  rows.push('Metric,Current ($M),Stressed ($M),Limit ($M),Change (%),Breached');
  portfolioImpact.forEach(p => {
    rows.push(`${p.metric},${p.current},${p.stressed},${p.limit},${p.change.toFixed(1)},${p.breached}`);
  });
  rows.push('');

  rows.push('HEDGE RECOMMENDATIONS');
  rows.push('Instrument,Type,Notional,Cost,Effectiveness (%),Residual Tail (%)');
  hedgeRecommendations.forEach(h => {
    rows.push(`${h.instrument},${h.type},"${h.notional}","${h.cost}",${h.effectiveness},${h.residualTail}`);
  });

  downloadBlob(rows.join('\n'), `CLARA_export_${timestamp()}.csv`, 'text/csv');
}

// ── HTML Report ────────────────────────────────────────────────────────────────
export function exportHTMLReport() {
  const now = new Date().toLocaleString();

  const shockRows = shockMatrix.map(s => `
    <tr>
      <td>${s.factor}</td>
      <td class="${s.baseCase < 0 ? 'red' : 'green'}">${s.baseCase > 0 ? '+' : ''}${s.baseCase}%</td>
      <td class="red">${s.adverseCase > 0 ? '+' : ''}${s.adverseCase}%</td>
      <td class="deep-red">${s.severeCase > 0 ? '+' : ''}${s.severeCase}%</td>
      <td>${s.confidence}%</td>
      <td class="muted">${s.analogRef}</td>
    </tr>`).join('');

  const impactRows = portfolioImpact.map(p => `
    <tr>
      <td>${p.metric}</td>
      <td>$${p.current}M</td>
      <td class="${p.breached ? 'deep-red bold' : 'red'}">$${p.stressed}M</td>
      <td>$${p.limit}M</td>
      <td class="red">+${p.change.toFixed(1)}%</td>
      <td>${p.breached ? '<span class="badge-red">BREACH</span>' : '<span class="badge-ok">OK</span>'}</td>
    </tr>`).join('');

  const hedgeRows = hedgeRecommendations.map(h => `
    <tr>
      <td>${h.instrument}</td>
      <td>${h.type}</td>
      <td>${h.notional}</td>
      <td>${h.cost}</td>
      <td class="green">${h.effectiveness}%</td>
      <td>${h.residualTail}%</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>CLARA Risk Report — ${now}</title>
<style>
  body{font-family:'Helvetica Neue',sans-serif;background:#fff;color:#111;padding:40px;max-width:960px;margin:0 auto}
  h1{font-size:22px;color:#0f172a;border-bottom:3px solid #0891b2;padding-bottom:12px}
  h2{font-size:15px;color:#1e293b;margin-top:32px;border-left:4px solid #0891b2;padding-left:10px}
  .meta{display:flex;flex-wrap:wrap;gap:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;font-size:13px}
  .meta div{display:flex;flex-direction:column;gap:4px}
  .meta span{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
  .meta strong{color:#0f172a}
  .regime-badge{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
  th{background:#1e293b;color:#e2e8f0;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  td{padding:9px 12px;border-bottom:1px solid #f1f5f9}
  tr:hover td{background:#f8fafc}
  .red{color:#dc2626}.deep-red{color:#991b1b;font-weight:bold}.green{color:#16a34a}.muted{color:#64748b;font-size:12px}.bold{font-weight:bold}
  .badge-red{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold}
  .badge-ok{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:16px 0}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px}
  .kpi-label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
  .kpi-value{font-size:22px;font-weight:bold;font-family:monospace}
  .kpi-value.alert{color:#dc2626}
  .footer{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
</style>
</head>
<body>
<h1>&#9650; CLARA Institutional Risk Report</h1>
<div class="meta">
  <div><span>Generated</span><strong>${now}</strong></div>
  <div><span>System</span><strong>CLARA v2.4.1</strong></div>
  <div><span>Regime</span><span class="regime-badge">Crisis Contagion</span></div>
  <div><span>Multiplier</span><strong>1.85&times;</strong></div>
  <div><span>Compliance</span><strong>SR 11-7</strong></div>
</div>
<h2>Key Risk Metrics</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">1-Day VaR 95%</div><div class="kpi-value alert">$28.7M</div></div>
  <div class="kpi"><div class="kpi-label">Expected Shortfall</div><div class="kpi-value alert">$45.3M</div></div>
  <div class="kpi"><div class="kpi-label">Active Breaches</div><div class="kpi-value alert">4</div></div>
  <div class="kpi"><div class="kpi-label">10-Day VaR 99%</div><div class="kpi-value alert">$72.1M</div></div>
  <div class="kpi"><div class="kpi-label">Tail Loss P(&gt;3&sigma;)</div><div class="kpi-value alert">8.4%</div></div>
  <div class="kpi"><div class="kpi-label">Hedge Coverage</div><div class="kpi-value">68%</div></div>
</div>
<h2>Factor Shock Matrix</h2>
<table><thead><tr><th>Factor</th><th>Base</th><th>Adverse (95th)</th><th>Severe (99th)</th><th>Confidence</th><th>Analog Reference</th></tr></thead>
<tbody>${shockRows}</tbody></table>
<h2>Portfolio Impact Analysis</h2>
<table><thead><tr><th>Metric</th><th>Current</th><th>Stressed</th><th>Limit</th><th>Change</th><th>Status</th></tr></thead>
<tbody>${impactRows}</tbody></table>
<h2>Hedge Recommendations</h2>
<table><thead><tr><th>Instrument</th><th>Type</th><th>Notional</th><th>Cost</th><th>Effectiveness</th><th>Residual Tail</th></tr></thead>
<tbody>${hedgeRows}</tbody></table>
<div class="footer">
  <span>CLARA v2.4.1 &middot; IBM watsonx Granite &middot; SR 11-7 Compliant</span>
  <span>Classification: CONFIDENTIAL</span>
</div>
</body></html>`;

  downloadBlob(html, `CLARA_report_${timestamp()}.html`, 'text/html');
}

export function exportData(format: 'json' | 'csv' | 'html' = 'json') {
  switch (format) {
    case 'json': return exportJSON();
    case 'csv':  return exportCSV();
    case 'html': return exportHTMLReport();
  }
}
