export function metricText(metric) {
  if(typeof metric==='string'||typeof metric==='number') return String(metric);
  if(!metric||metric.value==null) throw new Error('PROFILE_METRIC_VALUE_REQUIRED');
  return [metric.scope,metric.label,metric.value,metric.unit].filter(v=>v!==undefined&&v!=='').join(' ');
}
export function entityProfileFields(node) {
  for(const field of ['secondaryMetrics','characteristics','keywords']) if(node[field]!=null&&!Array.isArray(node[field])) throw new Error(`PROFILE_FIELD_ARRAY_REQUIRED: ${field}`);
  return {identity:[node.identity,node.headlineTag].filter(Boolean),primary:node.primaryMetric!=null?[metricText(node.primaryMetric)]:[],
    secondary:(node.secondaryMetrics||[]).map(metricText),details:[...(node.characteristics||[]),...(node.keywords||[]),node.scope,node.caveat].filter(Boolean)};
}
