// GAS 側。ページを返し、途中経過を本人の UserProperties に保存する。
// UserProperties は1つの値が 9KB まで。日本語は1字3バイトになりうるので 2500 字ずつに分けて置く。
var RUN_KEY = 'sst_run_v1';
var CHUNK = 2500;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('こころの冒険')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function saveRun(json) {
  if (typeof json !== 'string' || json.length > 200000) return false;
  var props = PropertiesService.getUserProperties();
  var lock = LockService.getUserLock();
  lock.waitLock(5000);
  try {
    clearRun_(props);
    var n = Math.ceil(json.length / CHUNK);
    var obj = {};
    for (var i = 0; i < n; i++) obj[RUN_KEY + '_' + i] = json.slice(i * CHUNK, (i + 1) * CHUNK);
    obj[RUN_KEY + '_n'] = String(n);
    props.setProperties(obj);
  } finally { lock.releaseLock(); }
  return true;
}

function loadRun() {
  var all = PropertiesService.getUserProperties().getProperties();
  var n = Number(all[RUN_KEY + '_n'] || 0);
  var out = '';
  for (var i = 0; i < n; i++) {
    var part = all[RUN_KEY + '_' + i];
    if (part == null) return null;
    out += part;
  }
  return out || null;
}

function clearRun() { clearRun_(PropertiesService.getUserProperties()); }

function clearRun_(props) {
  var all = props.getProperties();
  Object.keys(all).forEach(function (k) { if (k.indexOf(RUN_KEY + '_') === 0) props.deleteProperty(k); });
}
