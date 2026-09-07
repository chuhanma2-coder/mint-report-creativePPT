const decode = v => String(v).replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"');
const inside = (xml,tag) => xml.match(new RegExp(`<c:${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</c:${tag}>`))?.[1] || '';
const points = xml => [...xml.matchAll(/<c:pt\b[^>]*idx="(\d+)"[^>]*>[\s\S]*?<c:v>([\s\S]*?)<\/c:v>[\s\S]*?<\/c:pt>/g)].sort((a,b)=>+a[1]-+b[1]).map(m=>decode(m[2]));
export function auditFinalTable(data, table) {
  const headers = data.headers || data.columns || [], rows = data.rows || data.values || [];
  const expected = headers.length ? [headers, ...rows] : rows;
  const cells = table?.cells || [], normalize = value => String(value ?? '').replace(/\s+/g, '');
  if (cells.length !== expected.reduce((sum, row) => sum + row.length, 0)) return ['FINAL_TABLE_CELL_COUNT'];
  const issues = [];
  expected.forEach((row, i) => row.forEach((value, j) => {
    const actual = cells.find(cell => cell.row === i + 1 && cell.column === j + 1);
    if (!actual || normalize(actual.text) !== normalize(value)) issues.push(`FINAL_TABLE_BINDING_CHANGED: row ${i + 1} column ${j + 1}`);
  }));
  return issues;
}
export function auditNativeChart(xml, data, variant) {
  if(!['line','bar','column','doughnut','scatter','percent-stacked'].includes(variant)) return {passed:false,issues:['NATIVE_CHART_VARIANT_NOT_VERIFIED'],seriesCount:0,visibleLabels:[]};
  const issues=[], series=[...xml.matchAll(/<c:ser(?:\s[^>]*)?>([\s\S]*?)<\/c:ser>/g)].map(m=>m[1]);
  const scatter=variant==='scatter', expected=scatter?[data.series[1]]:data.series;
  const type=variant==='line'?'lineChart':variant==='doughnut'?'doughnutChart':scatter?'scatterChart':'barChart';
  if (!xml.includes(`<c:${type}`)) issues.push('CHART_TYPE_CHANGED');
  if(['bar','column'].includes(variant)&&!xml.includes(`barDir val="${variant==='column'?'col':'bar'}"`)) issues.push('CHART_DIRECTION_CHANGED');
  if (series.length!==expected.length) issues.push('CHART_SERIES_COUNT');
  for (const [i,s] of series.entries()) {
    if (!decode(inside(s,'tx')).includes(expected[i]?.name||'')) issues.push(`CHART_SERIES_NAME_CHANGED: series ${i}`);
    if (JSON.stringify(points(inside(s,scatter?'yVal':'val')).map(Number))!==JSON.stringify(expected[i]?.values.map(Number))) issues.push(`CHART_VALUES_CHANGED: series ${i}`);
    const cats=points(inside(s,scatter?'xVal':'cat'));
    if (JSON.stringify(scatter?cats.map(Number):cats)!==JSON.stringify(scatter?data.series[0].values.map(Number):data.categories.map(String))) issues.push(`CHART_CATEGORY_BINDING_CHANGED: series ${i}`);
  }
  const outsideSeries=xml.replace(/<c:ser(?:\s[^>]*)?>[\s\S]*?<\/c:ser>/g,'');
  const hasLabelFlag=(part,flag)=>new RegExp(`<c:dLbls\\b[\\s\\S]*?<c:${flag}\\b[^>]*val="1"[\\s\\S]*?<\\/c:dLbls>`).test(part);
  const valuesVisible=hasLabelFlag(outsideSeries,'showVal')||(series.length>0&&series.every(s=>hasLabelFlag(s,'showVal')));
  if(!valuesVisible) issues.push('CHART_EXACT_LABELS_HIDDEN');
  if (variant==='percent-stacked'&&!/<c:grouping\b[^>]*val="percentStacked"/.test(xml)) issues.push('CHART_STACKING_CHANGED');
  for (const unit of new Set(data.series.map(s=>s.displayUnit).filter(Boolean))) if (!decode(xml).includes(unit)) issues.push(`CHART_UNIT_MISSING: ${unit}`);
  const visibleLabels=[];
  if(valuesVisible) visibleLabels.push(...expected.flatMap(s=>s?.values||[]).map(String));
  if(!scatter&&(/<c:catAx\b/.test(xml)||hasLabelFlag(outsideSeries,'showCatName')||series.every(s=>hasLabelFlag(s,'showCatName')))) visibleLabels.push(...(data.categories||[]).map(String));
  if(/<c:legend\b/.test(xml)&&!/<c:legend\b[\s\S]*?<c:delete\b[^>]*val="1"/.test(xml)||hasLabelFlag(outsideSeries,'showSerName')) visibleLabels.push(...expected.map(s=>s?.name).filter(Boolean));
  for(const unit of new Set(data.series.map(s=>s.displayUnit).filter(Boolean))) if(decode(xml).includes(unit)) visibleLabels.push(unit);
  return {passed:!issues.length,issues,seriesCount:series.length,visibleLabels:[...new Set(visibleLabels)]};
}
