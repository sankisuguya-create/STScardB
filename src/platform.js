// 保存先の切り替え。GAS 上では UserProperties、それ以外では localStorage。
(function (root) {
  'use strict';
  var KEY = 'sst_run_v1';
  var onGas = typeof google !== 'undefined' && google.script && google.script.run;

  function localSave(json) { try { localStorage.setItem(KEY, json); } catch (e) { /* 保存できなくても遊べる */ } }
  function localLoad() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function localClear() { try { localStorage.removeItem(KEY); } catch (e) { } }

  var Platform = {
    kind: onGas ? 'gas' : 'local',
    save: function (state) {
      var json = JSON.stringify(state);
      localSave(json);
      if (onGas) google.script.run.withFailureHandler(function () { }).saveRun(json);
    },
    load: function (cb) {
      if (!onGas) { var j = localLoad(); cb(j ? safeParse(j) : null); return; }
      google.script.run
        .withSuccessHandler(function (j) { cb(j ? safeParse(j) : safeParse(localLoad())); })
        .withFailureHandler(function () { cb(safeParse(localLoad())); })
        .loadRun();
    },
    clear: function () {
      localClear();
      if (onGas) google.script.run.withFailureHandler(function () { }).clearRun();
    },
    param: function (name) {
      try { return new URLSearchParams(root.location.search).get(name); } catch (e) { return null; }
    }
  };
  function safeParse(j) { try { return j ? JSON.parse(j) : null; } catch (e) { return null; } }

  root.SST_PLATFORM = Platform;
})(this);
