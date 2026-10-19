function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;
function load(key, def) {
  try {
    const v = localStorage.getItem("mh2-" + key);
    return v ? JSON.parse(v) : def;
  } catch (e) {
    return def;
  }
}
function save(key, val) {
  try {
    localStorage.setItem("mh2-" + key, JSON.stringify(val));
  } catch (e) {}
  if (window.mhOnSave) window.mhOnSave(key);
}
/* Перенос сохранений на новые ключи моделей (BIKE_ALIASES в js/data.js).
   Выполняется один раз на устройстве; старые записи вида «Марка Модель» и «Марка Модель|0»
   становятся «Марка НоваяМодель» и «Марка НоваяМодель|номер версии». */
function migrateBikeKeys() {
  var flag = "mh2-keys-v19", A = typeof BIKE_ALIASES === "object" ? BIKE_ALIASES : {};
  try {
    if (localStorage.getItem(flag)) return;
    var str = function (s) {
      if (A[s]) return A[s][0];
      if (s.indexOf("|") < 0) return s;
      var p = s.split("|");
      for (var i = 0; i < p.length; i++) if (A[p[i]]) {
        var a = A[p[i]];
        p[i] = a[0];
        if (/^\d+$/.test(p[i + 1] || "")) p[i + 1] = String(a[1]);
      }
      return p.join("|");
    };
    var walk = function (v) {
      if (typeof v === "string") return str(v);
      if (Array.isArray(v)) return v.map(walk);
      if (!v || typeof v !== "object") return v;
      var o = {};
      Object.keys(v).forEach(function (k) { o[str(k)] = walk(v[k]); });
      if (typeof v.key === "string" && A[v.key] && "vi" in v) o.vi = A[v.key][1];
      return o;
    };
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k.indexOf("mh2-") !== 0 || k === flag) continue;
      var raw = localStorage.getItem(k), val;
      try { val = JSON.parse(raw); } catch (e) { continue; }
      var next = JSON.stringify(walk(val));
      if (next !== raw) localStorage.setItem(k, next);
    }
    localStorage.setItem(flag, "1");
  } catch (e) {}
}
migrateBikeKeys();
/* «2002–2008» → «2002 2003 … 2008», «2023+» → до текущего года: чтобы поиск находил модель по году выпуска */
function bfYears(y) {
  if (!y) return "";
  var m = String(y).match(/((?:19|20)\d\d)\s*(?:[–-]\s*((?:19|20)\d\d)|(\+))?/);
  if (!m) return String(y);
  var a = +m[1], b = m[2] ? +m[2] : m[3] ? new Date().getFullYear() : a, out = [String(y)];
  for (var i = a; i <= b && i - a < 60; i++) out.push(i);
  return out.join(" ");
}
function rub(v) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(v || 0)) + " ₽";
}
function num(v) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(v || 0));
}
function sub(text, spec) {
  if (!text) return "";
  return text.replace(/\{(\w+)\}/g, (m, k) => spec && spec[k] != null && spec[k] !== "" ? spec[k] : "по мануалу");
}
function plural(n, a, b, c) {
  const m10 = n % 10,
    m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b;
  return c;
}
function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  } catch (e) {}
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text) {
  try {
    const t = document.createElement("textarea");
    t.value = text;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(t);
    return ok;
  } catch (e) {
    return false;
  }
}
function bikeKey(b) {
  return b.brand + " " + b.name;
}
const ICONS = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  engine: "M4 9h3l2-2h6l2 2h1v3h2v-2h1v6h-1v-2h-2v3h-3l-2 2H9l-2-2H4z",
  diag: "M3 12h4l2-5 4 10 2-5h6",
  tune: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  parts: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  est: "M8 3h8v3H8zM6 4.5H5V21h14V4.5h-1M8 11h8M8 15h5",
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.8-4.8",
  close: "M6 6l12 12M18 6L6 18",
  check: "M5 12.5l4.5 4.5L19 7",
  reset: "M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"
};
function Icon({
  n,
  s
}) {
  return /*#__PURE__*/React.createElement("svg", {
    className: "ico",
    width: s || 20,
    height: s || 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: ICONS[n]
  }));
}
const SEV = {
  high: "Серьёзно",
  med: "Важно",
  low: "Мелочь"
};
const EDITABLE = ["engine", "carbId", "carbName", "jetMain", "jetPilot", "needle", "idle", "spark", "gap", "valveIn", "valveEx", "oil", "oilVol", "fuel", "hp"];

/* Собирает характеристики конкретного мотоцикла с учётом изменений владельца */
function buildSpec(bike, ver, cu) {
  const swapped = cu.engine && cu.engine !== ver.engine && ENGINES[cu.engine];
  const base = ENGINES[swapped ? cu.engine : ver.engine];
  const stock = {
    carb: swapped ? base.carb : ver.carb || base.carb,
    jetMain: base.jetMain,
    jetPilot: base.jetPilot,
    needle: base.needle,
    idle: base.idle,
    spark: base.spark,
    gap: base.gap,
    valveIn: base.valveIn,
    valveEx: base.valveEx,
    oil: base.oil,
    oilVol: base.oilVol,
    fuel: base.fuel,
    hp: swapped ? base.hp : ver.hp || base.hp,
    engine: ver.engine
  };
  const carbObj = cu.carbId ? CARBS.find(c => c.id === cu.carbId) : null;
  const carbName = carbObj ? carbObj.id === "custom" ? cu.carbName || "Свой карбюратор" : carbObj.name : stock.carb;
  const preset = carbObj && carbObj.id !== "custom" ? carbObj : null;
  const s = Object.assign({}, base);
  s.carb = carbName;
  s.carbMm = carbObj ? carbObj.mm || null : null;
  s.jetMain = cu.jetMain || (preset ? preset.main : base.jetMain);
  s.jetPilot = cu.jetPilot || (preset ? preset.pilot : base.jetPilot);
  s.needle = cu.needle || (preset ? preset.needle : base.needle);
  s.jetsFromPreset = !!preset && !cu.jetMain;
  ["idle", "spark", "gap", "valveIn", "valveEx", "oil", "oilVol", "fuel"].forEach(k => {
    if (cu[k]) s[k] = cu[k];
  });
  const installed = (cu.installed || []).filter(id => {
    const t = TUNING.find(x => x.id === id);
    return t && tuningFor(t, base).ok;
  });
  const inst = TUNING.filter(t => installed.indexOf(t.id) >= 0);
  const gain = Math.round(inst.reduce((a, t) => a + t.power, 0) * (inst.filter(t => t.power > 0).length > 1 ? 0.8 : 1));
  s.stockHp = stock.hp;
  s.hp = cu.hp ? Number(cu.hp) : Math.round(stock.hp * (1 + gain / 100) * 10) / 10;
  s.gain = gain;
  s.installed = installed;
  s.swapped = !!swapped;
  s.stock = stock;
  s.mods = EDITABLE.filter(k => cu[k]).length + installed.length;
  return s;
}

/* ---------- ТО: статус ---------- */
function maintStatus(eng, mt) {
  const unit = eng.hours ? "моточ." : "км";
  return maintItems(eng).map(it => {
    const last = mt.last && mt.last[it.id] != null ? mt.last[it.id] : null;
    const since = last == null ? null : Math.max(0, (mt.odo || 0) - last);
    const left = since == null ? null : it.every - since;
    const pct = since == null ? null : Math.min(1.2, since / it.every);
    return Object.assign({}, it, {
      last: last,
      since: since,
      left: left,
      pct: pct,
      unit: unit,
      state: pct == null ? "none" : pct >= 1 ? "due" : pct >= 0.8 ? "soon" : "ok"
    });
  });
}
function Val({
  v,
  stock
}) {
  const changed = stock != null && String(v) !== String(stock);
  return /*#__PURE__*/React.createElement("span", {
    className: changed ? "val changed" : "val",
    title: changed ? "С завода: " + stock : undefined
  }, v, changed && /*#__PURE__*/React.createElement("small", null, "с завода ", stock));
}
function Field({
  label,
  k,
  cu,
  setCu,
  stock,
  hint,
  type,
  list
}) {
  const v = cu[k] || "";
  return /*#__PURE__*/React.createElement("label", {
    className: "f" + (v ? " f-changed" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, label, v && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "f-reset",
    onClick: e => {
      e.preventDefault();
      setCu({
        [k]: ""
      });
    },
    "aria-label": "Вернуть заводское: " + label
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "reset",
    s: 14
  }), "как с завода")), /*#__PURE__*/React.createElement("input", {
    type: type || "text",
    value: v,
    placeholder: stock != null ? String(stock) : "",
    list: list,
    onChange: e => setCu({
      [k]: e.target.value
    }),
    inputMode: type === "number" ? "decimal" : undefined
  }));
}
function EditBike({
  eng,
  ver,
  cu,
  setCu,
  resetCu,
  flash,
  bike
}) {
  const S = eng.stock;
  const baseEngine = ENGINES[ver.engine];
  const efi = eng.groups.indexOf("efi") >= 0;
  const range = carbRange(eng);
  const carbSel = cu.carbId || "";
  const carbObj = CARBS.find(c => c.id === carbSel);
  const mm = carbObj && carbObj.mm ? carbObj.mm : null;
  let carbWarn = null;
  if (range && mm) {
    if (mm < range[0]) carbWarn = "Карбюратор " + mm + " мм маловат для " + eng.code + " — мотор будет душиться на верхах. Обычно ставят " + range[0] + "–" + range[1] + " мм.";else if (mm > range[1]) carbWarn = "Карбюратор " + mm + " мм великоват для " + eng.code + " — провалы на низах и сложная настройка. Обычно ставят " + range[0] + "–" + range[1] + " мм.";
  }
  const tuneOk = TUNING.filter(t => tuningFor(t, eng).ok && t.cat !== "Защита");
  const groups = {};
  Object.values(ENGINES).forEach(e => {
    const g = e.stroke === "2T" ? "2-тактные" : e.cc < 170 ? "До 170 см³" : e.groups.indexOf("liquid") >= 0 ? "250–450, жидкостные" : "200–300, воздушные";
    (groups[g] = groups[g] || []).push(e);
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "edit"
  }, /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "Меняй только то, что у тебя отличается от заводского. Пустое поле — значит как с завода (заводское значение подсказано серым). Всё сохраняется сразу и учитывается в диагностике, тюнинге и подборе запчастей."), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", null, "\u041C\u043E\u0442\u043E\u0446\u0438\u043A\u043B"), /*#__PURE__*/React.createElement("div", {
    className: "fgrid"
  }, /*#__PURE__*/React.createElement("label", {
    className: "f wide"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u0421\u0432\u043E\u0451 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435"), /*#__PURE__*/React.createElement("input", {
    value: cu.nick || "",
    placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \xAB\u0416\u0451\u043B\u0442\u044B\u0439\xBB \u0438\u043B\u0438 \xAB\u041A\u0430\u0439\u043E \u0431\u0440\u0430\u0442\u0430\xBB",
    onChange: e => setCu({
      nick: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "f wide"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u0426\u0432\u0435\u0442 \u043F\u043B\u0430\u0441\u0442\u0438\u043A\u0430", cu.color && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "f-reset",
    onClick: () => setCu({
      color: ""
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "reset",
    s: 14
  }), "\u0430\u0432\u0442\u043E")), /*#__PURE__*/React.createElement("div", {
    className: "swatches"
  }, PLASTIC.map(c => /*#__PURE__*/React.createElement("button", {
    key: c[0],
    type: "button",
    className: "sw" + (cu.color === c[0] ? " on" : ""),
    style: {
      background: c[0]
    },
    "aria-label": c[1],
    "aria-pressed": cu.color === c[0],
    onClick: () => setCu({
      color: c[0]
    })
  }))), null), /*#__PURE__*/React.createElement("div", {
    className: "f wide"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u041F\u043E\u043A\u0440\u0430\u0441\u043A\u0430 \u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043B\u044F \u0432 3D", cu.engFinish && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "f-reset",
    onClick: () => setCu({
      engFinish: ""
    })
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "reset",
    s: 14
  }), "\u043A\u0430\u043A \u043E\u0431\u044B\u0447\u043D\u043E")), /*#__PURE__*/React.createElement("div", {
    className: "seg wrap",
    role: "group",
    "aria-label": "\u041F\u043E\u043A\u0440\u0430\u0441\u043A\u0430 \u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043B\u044F"
  }, [["silver", "Серебро"], ["black", "Чёрный"], ["combo", "Чёрный цилиндр"], ["bronze", "Бронза"]].map(f => /*#__PURE__*/React.createElement("button", {
    key: f[0],
    type: "button",
    className: (cu.engFinish || e3DefaultFinish(eng)) === f[0] ? "on" : "",
    onClick: () => setCu({
      engFinish: f[0]
    })
  }, f[1])))), /*#__PURE__*/React.createElement("label", {
    className: "f"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u041D\u043E\u043C\u0435\u0440 \u043D\u0430 \u0442\u0430\u0431\u043B\u0438\u0447\u043A\u0435"), /*#__PURE__*/React.createElement("input", {
    value: cu.raceNum || "",
    maxLength: "3",
    inputMode: "numeric",
    placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, 77",
    onChange: e => setCu({
      raceNum: e.target.value.replace(/[^0-9A-Za-z]/g, "").slice(0, 3)
    })
  })), /*#__PURE__*/React.createElement("label", {
    className: "f wide" + (cu.engine ? " f-changed" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u0414\u0432\u0438\u0433\u0430\u0442\u0435\u043B\u044C", cu.engine && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "f-reset",
    onClick: e => {
      e.preventDefault();
      setCu({
        engine: ""
      });
      flash("Вернул штатный мотор");
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "reset",
    s: 14
  }), "как с завода")), /*#__PURE__*/React.createElement("select", {
    value: cu.engine || "",
    onChange: e => {
      setCu({
        engine: e.target.value === ver.engine ? "" : e.target.value,
        carbId: "",
        jetMain: "",
        jetPilot: "",
        needle: ""
      });
      flash("Мотор изменён — параметры взяты из базы");
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u0428\u0442\u0430\u0442\u043D\u044B\u0439: ", baseEngine.code, " \u2014 ", baseEngine.name), Object.keys(groups).map(g => /*#__PURE__*/React.createElement("optgroup", {
    key: g,
    label: g
  }, groups[g].filter(e => e.id !== ver.engine).map(e => /*#__PURE__*/React.createElement("option", {
    key: e.id,
    value: e.id
  }, e.code, " \u2014 ", e.name, ", ", e.cc, " \u0441\u043C\xB3"))))), null), /*#__PURE__*/React.createElement(Field, {
    label: "\u041C\u043E\u0449\u043D\u043E\u0441\u0442\u044C, \u043B.\u0441.",
    k: "hp",
    cu: cu,
    setCu: setCu,
    stock: eng.gain ? eng.stockHp + " + доработки ≈ " + Math.round(eng.stockHp * (1 + eng.gain / 100) * 10) / 10 : S.hp,
    type: "number",
    hint: "\u041E\u0441\u0442\u0430\u0432\u044C \u043F\u0443\u0441\u0442\u044B\u043C \u2014 \u043F\u043E\u0441\u0447\u0438\u0442\u0430\u0435\u043C \u043F\u043E \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u043C \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0430\u043C."
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u0422\u043E\u043F\u043B\u0438\u0432\u043E",
    k: "fuel",
    cu: cu,
    setCu: setCu,
    stock: S.fuel
  }))), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", null, "\u0417\u0432\u0451\u0437\u0434\u044B \u0438 \u043A\u043E\u043B\u0435\u0441\u043E"), /*#__PURE__*/React.createElement("div", {
    className: "fgrid"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\u041F\u0435\u0440\u0435\u0434\u043D\u044F\u044F \u0437\u0432\u0435\u0437\u0434\u0430",
    k: "sprF",
    cu: cu,
    setCu: setCu,
    stock: defaultSprockets(bike, eng)[0],
    type: "number",
    hint: "Число зубьев. Влияет на максимальную скорость и тягу."
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u0417\u0430\u0434\u043D\u044F\u044F \u0437\u0432\u0435\u0437\u0434\u0430",
    k: "sprR",
    cu: cu,
    setCu: setCu,
    stock: defaultSprockets(bike, eng)[1],
    type: "number"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u0417\u0430\u0434\u043D\u0435\u0435 \u043A\u043E\u043B\u0435\u0441\u043E, \u0434\u044E\u0439\u043C\u044B",
    k: "rim",
    cu: cu,
    setCu: setCu,
    stock: (SPEED_CLS[speedClass(bike, eng)] || SPEED_CLS.enduro).rim,
    type: "number",
    hint: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, 18 \u0434\u043B\u044F \u044D\u043D\u0434\u0443\u0440\u043E, 14 \u0434\u043B\u044F \u043F\u0438\u0442\u0431\u0430\u0439\u043A\u0430."
  }), /*#__PURE__*/React.createElement("div", {
    className: "f vmax-mini"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u043A\u0430 \u0441 \u044D\u0442\u0438\u043C\u0438 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u044F\u043C\u0438"), /*#__PURE__*/React.createElement("b", null, speedFor(eng, bike, cu, TUNING.filter(t => eng.installed.indexOf(t.id) >= 0)).v, " \u043A\u043C/\u0447"), null))), !efi && /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", null, "\u041A\u0430\u0440\u0431\u044E\u0440\u0430\u0442\u043E\u0440 \u0438 \u0441\u043C\u0435\u0441\u044C"), /*#__PURE__*/React.createElement("div", {
    className: "fgrid"
  }, /*#__PURE__*/React.createElement("label", {
    className: "f wide" + (carbSel ? " f-changed" : "")
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u041A\u0430\u0440\u0431\u044E\u0440\u0430\u0442\u043E\u0440", carbSel && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "f-reset",
    onClick: e => {
      e.preventDefault();
      setCu({
        carbId: "",
        carbName: "",
        jetMain: "",
        jetPilot: "",
        needle: ""
      });
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "reset",
    s: 14
  }), "как с завода")), /*#__PURE__*/React.createElement("select", {
    value: carbSel,
    onChange: e => {
      setCu({
        carbId: e.target.value,
        jetMain: "",
        jetPilot: "",
        needle: ""
      });
      if (e.target.value) flash("Жиклёры подставлены типовые — уточни по свече");
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u041A\u0430\u043A \u0441 \u0437\u0430\u0432\u043E\u0434\u0430: ", S.carb), CARBS.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name, c.mm ? ", " + c.mm + " мм" : "")))), carbSel === "custom" && /*#__PURE__*/React.createElement("label", {
    className: "f wide f-changed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u0430\u0440\u0431\u044E\u0440\u0430\u0442\u043E\u0440\u0430"), /*#__PURE__*/React.createElement("input", {
    value: cu.carbName || "",
    placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, Mikuni VM26",
    onChange: e => setCu({
      carbName: e.target.value
    })
  })), carbWarn && /*#__PURE__*/React.createElement("div", {
    className: "callout warn wide"
  }, carbWarn), /*#__PURE__*/React.createElement(Field, {
    label: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0436\u0438\u043A\u043B\u0451\u0440",
    k: "jetMain",
    cu: cu,
    setCu: setCu,
    stock: carbObj && carbObj.main ? carbObj.main : S.jetMain,
    hint: "\u041D\u043E\u043C\u0435\u0440, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0441\u0442\u043E\u0438\u0442 \u0441\u0435\u0439\u0447\u0430\u0441."
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u0425\u043E\u043B\u043E\u0441\u0442\u043E\u0439 \u0436\u0438\u043A\u043B\u0451\u0440",
    k: "jetPilot",
    cu: cu,
    setCu: setCu,
    stock: carbObj && carbObj.pilot ? carbObj.pilot : S.jetPilot
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u0418\u0433\u043B\u0430 (\u043A\u0430\u043D\u0430\u0432\u043A\u0430)",
    k: "needle",
    cu: cu,
    setCu: setCu,
    stock: carbObj && carbObj.needle ? carbObj.needle : S.needle
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u0425\u043E\u043B\u043E\u0441\u0442\u043E\u0439 \u0445\u043E\u0434, \u043E\u0431/\u043C\u0438\u043D",
    k: "idle",
    cu: cu,
    setCu: setCu,
    stock: S.idle
  }))), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", null, "\u0417\u0430\u0436\u0438\u0433\u0430\u043D\u0438\u0435, \u043A\u043B\u0430\u043F\u0430\u043D\u044B, \u043C\u0430\u0441\u043B\u043E"), /*#__PURE__*/React.createElement("div", {
    className: "fgrid"
  }, /*#__PURE__*/React.createElement(Field, {
    label: "\u0421\u0432\u0435\u0447\u0430",
    k: "spark",
    cu: cu,
    setCu: setCu,
    stock: S.spark,
    list: "sparks"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u0417\u0430\u0437\u043E\u0440 \u0441\u0432\u0435\u0447\u0438",
    k: "gap",
    cu: cu,
    setCu: setCu,
    stock: S.gap
  }), eng.stroke !== "2T" && /*#__PURE__*/React.createElement(Field, {
    label: "\u041A\u043B\u0430\u043F\u0430\u043D \u0432\u043F\u0443\u0441\u043A",
    k: "valveIn",
    cu: cu,
    setCu: setCu,
    stock: S.valveIn
  }), eng.stroke !== "2T" && /*#__PURE__*/React.createElement(Field, {
    label: "\u041A\u043B\u0430\u043F\u0430\u043D \u0432\u044B\u043F\u0443\u0441\u043A",
    k: "valveEx",
    cu: cu,
    setCu: setCu,
    stock: S.valveEx
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u041C\u0430\u0441\u043B\u043E",
    k: "oil",
    cu: cu,
    setCu: setCu,
    stock: S.oil,
    list: "oils"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "\u041E\u0431\u044A\u0451\u043C \u043C\u0430\u0441\u043B\u0430",
    k: "oilVol",
    cu: cu,
    setCu: setCu,
    stock: S.oilVol
  })), /*#__PURE__*/React.createElement("datalist", {
    id: "sparks"
  }, ["A7TC", "C7HSA", "D8TC", "D8EA", "DR8EA", "DPR8EA-9", "CR7HSA", "CR8E", "CR8EIX", "BR8ES", "BR9ES"].map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }))), /*#__PURE__*/React.createElement("datalist", {
    id: "oils"
  }, ["10W-40 JASO MA", "10W-50 JASO MA2", "15W-50 JASO MA2", "20W-50 JASO MA", "5W-40 JASO MA2"].map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  })))), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", null, "\u0427\u0442\u043E \u0443\u0436\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E"), null, /*#__PURE__*/React.createElement("div", {
    className: "checks"
  }, tuneOk.map(t => {
    const on = eng.installed.indexOf(t.id) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      type: "button",
      className: "checkchip" + (on ? " on" : ""),
      "aria-pressed": on,
      onClick: () => {
        const cur = cu.installed || [];
        setCu({
          installed: on ? cur.filter(x => x !== t.id) : cur.concat([t.id])
        });
      }
    }, on && /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 16
    }), t.title, t.power > 0 && /*#__PURE__*/React.createElement("small", null, "+", t.power, "%"));
  }))), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", null, "\u0417\u0430\u043C\u0435\u0442\u043A\u0438"), /*#__PURE__*/React.createElement("textarea", {
    rows: "3",
    value: cu.notes || "",
    placeholder: "VIN, \u0433\u0434\u0435 \u043F\u043E\u043A\u0443\u043F\u0430\u043B \u0437\u0430\u043F\u0447\u0430\u0441\u0442\u0438, \u0447\u0442\u043E \u0434\u0435\u043B\u0430\u043B \u0432 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0440\u0430\u0437\u2026",
    onChange: e => setCu({
      notes: e.target.value
    })
  })), eng.mods > 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn danger",
    onClick: resetCu
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "reset",
    s: 18
  }), "\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0432\u0441\u0451 \u043A\u0430\u043A \u0441 \u0437\u0430\u0432\u043E\u0434\u0430"));
}
function Maint({
  eng
}) {
  const st = maintItems(eng);
  const unit = eng.hours ? "моточ." : "км";
  /* что купить к обслуживанию: расходники под этот мотор, со ссылками на магазины */
  const buy = [];
  st.forEach(it => {
    const kit = TO_KITS[it.id];
    if (!kit) return;
    kit.kinds.forEach(k => {
      const p = partByKind(k, eng);
      if (p && buy.indexOf(p) < 0) buy.push(p);
    });
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("ul", {
    className: "plan"
  }, st.map(x => /*#__PURE__*/React.createElement("li", {
    key: x.id
  }, /*#__PURE__*/React.createElement("b", null, x.t), /*#__PURE__*/React.createElement("span", {
    className: "plan-every"
  }, "\u043A\u0430\u0436\u0434\u044B\u0435 ", num(x.every), " ", unit)))), buy.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h2", null, "\u0427\u0442\u043E \u043A\u0443\u043F\u0438\u0442\u044C \u043A \u0422\u041E"), /*#__PURE__*/React.createElement("ul", {
    className: "buy-list"
  }, buy.map(p => /*#__PURE__*/React.createElement("li", {
    key: p.id
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, p.name), /*#__PURE__*/React.createElement(BuyLinks, {
    q: buyQuery(p, eng)
  })), /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, rub(p.price)))))), /*#__PURE__*/React.createElement("h2", null, "\u0411\u0435\u0437 \u043F\u0440\u0438\u0432\u044F\u0437\u043A\u0438 \u043A \u043F\u0440\u043E\u0431\u0435\u0433\u0443"), /*#__PURE__*/React.createElement("table", {
    className: "to-table"
  }, /*#__PURE__*/React.createElement("tbody", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "\u0422\u043E\u0440\u043C\u043E\u0437\u043D\u0430\u044F \u0436\u0438\u0434\u043A\u043E\u0441\u0442\u044C"), /*#__PURE__*/React.createElement("td", null, "\u0440\u0430\u0437 \u0432 \u0433\u043E\u0434")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "\u041C\u0430\u0441\u043B\u043E \u0432 \u0432\u0438\u043B\u043A\u0435"), /*#__PURE__*/React.createElement("td", null, "\u0440\u0430\u0437 \u0432 \u0441\u0435\u0437\u043E\u043D")), eng.groups.indexOf("liquid") >= 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "\u0410\u043D\u0442\u0438\u0444\u0440\u0438\u0437"), /*#__PURE__*/React.createElement("td", null, "\u0440\u0430\u0437 \u0432 1\u20132 \u0441\u0435\u0437\u043E\u043D\u0430")), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "\u041F\u043E\u0434\u0448\u0438\u043F\u043D\u0438\u043A\u0438 \u0440\u0443\u043B\u0435\u0432\u043E\u0439 \u0438 \u043C\u0430\u044F\u0442\u043D\u0438\u043A\u0430"), /*#__PURE__*/React.createElement("td", null, "\u0441\u043C\u0430\u0437\u043A\u0430 \u043F\u0435\u0440\u0435\u0434 \u0441\u0435\u0437\u043E\u043D\u043E\u043C")))));
}
function Issues({
  eng
}) {
  return /*#__PURE__*/React.createElement("ul", {
    className: "issues"
  }, eng.issues.map((x, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: "sev-" + x.sev
  }, /*#__PURE__*/React.createElement("span", {
    className: "sev"
  }, SEV[x.sev]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, x.t), /*#__PURE__*/React.createElement("p", null, x.fix)))));
}

/* ---------- Запчасти ---------- */
/* Где купить: поиск детали на площадках, в новой вкладке. Код мотора добавляется, если деталь под конкретный мотор */
const SHOPS = [["Авито", "https://www.avito.ru/rossiya?q="], ["Ozon", "https://www.ozon.ru/search/?text="], ["WB", "https://www.wildberries.ru/catalog/0/search.aspx?search="], ["Маркет", "https://market.yandex.ru/search?text="]];
function buyQuery(p, eng) {
  const own = (p.fit || []).indexOf(eng.id) >= 0 && p.name.toLowerCase().indexOf(String(eng.code).toLowerCase()) < 0;
  return p.name.replace(/\s*\([^)]*\)/g, "") + (own ? " " + eng.code : "");
}
function BuyLinks({
  q
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "pbuy"
  }, SHOPS.map(sh => /*#__PURE__*/React.createElement("a", {
    key: sh[0],
    href: sh[1] + encodeURIComponent(q),
    target: "_blank",
    rel: "noopener"
  }, sh[0])));
}
function Parts({
  eng,
  cart,
  toggleCart,
  setCart,
  go
}) {
  const [cat, setCat] = useState("Все");
  const [q, setQ] = useState("");
  const [onlyFit, setOnlyFit] = useState(true);
  const cats = ["Все"].concat(Array.from(new Set(PARTS.map(p => p.cat))));
  const list = PARTS.filter(p => (cat === "Все" || p.cat === cat) && (!onlyFit || fits(p, eng)) && (!q.trim() || p.name.toLowerCase().indexOf(q.toLowerCase()) >= 0));
  const total = cart.reduce((s, p) => s + p.price, 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, cart.length > 0 && /*#__PURE__*/React.createElement("section", {
    className: "cart-box"
  }, /*#__PURE__*/React.createElement("h2", null, "\u041A\u043E\u0440\u0437\u0438\u043D\u0430"), /*#__PURE__*/React.createElement("ul", {
    className: "buy-list"
  }, cart.map(c => {
    const p = partById(c.id) || c;
    return /*#__PURE__*/React.createElement("li", {
      key: c.id
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, c.name), /*#__PURE__*/React.createElement(BuyLinks, {
      q: buyQuery(p, eng)
    })), /*#__PURE__*/React.createElement("span", {
      className: "pl-r"
    }, /*#__PURE__*/React.createElement("span", {
      className: "price"
    }, rub(c.price)), /*#__PURE__*/React.createElement("button", {
      className: "mini",
      "aria-label": "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u043A\u043E\u0440\u0437\u0438\u043D\u044B",
      onClick: () => toggleCart(c)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "close",
      s: 14
    }))));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "toolbar row-gap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "qsearch grow"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "search"
  }), /*#__PURE__*/React.createElement("input", {
    type: "search",
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\u0421\u0432\u0435\u0447\u0430, \u043F\u043E\u0440\u0448\u043D\u0435\u0432\u0430\u044F, \u0441\u0430\u043B\u044C\u043D\u0438\u043A\u0438\u2026",
    "aria-label": "\u041F\u043E\u0438\u0441\u043A \u0437\u0430\u043F\u0447\u0430\u0441\u0442\u0435\u0439"
  })), /*#__PURE__*/React.createElement("label", {
    className: "check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: onlyFit,
    onChange: e => setOnlyFit(e.target.checked)
  }), " \u0422\u043E\u043B\u044C\u043A\u043E \u0434\u043B\u044F ", eng.code)), /*#__PURE__*/React.createElement("div", {
    className: "tags scroll"
  }, cats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    className: "chip" + (cat === c ? " on" : ""),
    onClick: () => setCat(c)
  }, c))), /*#__PURE__*/React.createElement("ul", {
    className: "parts"
  }, list.map(p => {
    const inC = cart.find(x => x.id === p.id);
    const ok = fits(p, eng);
    const isMine = p.kind === "carb" && eng.carb.toLowerCase().indexOf(p.name.replace("Карбюратор ", "").split(" ")[0].toLowerCase()) >= 0;
    return /*#__PURE__*/React.createElement("li", {
      key: p.id,
      className: ok ? "" : "no"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "pc"
    }, p.cat), /*#__PURE__*/React.createElement("b", null, p.name), isMine && /*#__PURE__*/React.createElement("span", {
      className: "pmine"
    }, "\u043F\u043E\u0445\u043E\u0436\u0435, \u0441\u0442\u043E\u0438\u0442 \u0443 \u0442\u0435\u0431\u044F"), p.info && /*#__PURE__*/React.createElement("span", {
      className: "pinfo"
    }, p.info), p.note && /*#__PURE__*/React.createElement("span", {
      className: "pnote"
    }, p.note), !ok && /*#__PURE__*/React.createElement("span", {
      className: "pnote"
    }, "\u041D\u0435 \u0434\u043B\u044F ", eng.code), (() => {
      const ii = installInfo(p.kind);
      if (!ii) return null;
      const gd = ii.guide && guidesFor(eng).find(g => g.id === ii.guide);
      return /*#__PURE__*/React.createElement("span", {
        className: "pinst"
      }, "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430: ", /*#__PURE__*/React.createElement("b", {
        className: "diff d-" + (ii.diff === "очень сложно" ? "сложно" : ii.diff)
      }, ii.diff), " \xB7 ", ii.time, gd && go && /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 ", /*#__PURE__*/React.createElement("button", {
        className: "link inline",
        onClick: () => go("repair", gd.id)
      }, "\u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F")));
    })(), ok && /*#__PURE__*/React.createElement(BuyLinks, {
      q: buyQuery(p, eng)
    })), /*#__PURE__*/React.createElement("span", {
      className: "price"
    }, rub(p.price)), /*#__PURE__*/React.createElement("button", {
      className: "btn sm" + (inC ? "" : " primary"),
      onClick: () => toggleCart(p),
      "aria-label": inC ? "Убрать из корзины" : "В корзину"
    }, inC ? /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 16
    }) : "+"));
  }), list.length === 0 && /*#__PURE__*/React.createElement("li", {
    className: "empty"
  }, "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E. \u0421\u043D\u0438\u043C\u0438 \u0444\u0438\u043B\u044C\u0442\u0440 \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0441\u0442\u0438 \u0438\u043B\u0438 \u0438\u0437\u043C\u0435\u043D\u0438 \u0437\u0430\u043F\u0440\u043E\u0441.")), cart.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "cartbar"
  }, /*#__PURE__*/React.createElement("span", null, cart.length, " ", plural(cart.length, "позиция", "позиции", "позиций"), ", ", /*#__PURE__*/React.createElement("b", null, rub(total))), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setCart([])
  }, "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C")));
}

/* ---------- Выбор мотоцикла ---------- */
function Picker({
  sel,
  custom,
  onClose,
  onPick,
  start
}) {
  useEffect(() => {
    const h = e => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet bf-sheet",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "\u0412\u044B\u0431\u043E\u0440 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B\u0430",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u041D\u0430\u0439\u0434\u0438 \u0441\u0432\u043E\u0439 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B"), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "close",
    s: 18
  }))), /*#__PURE__*/React.createElement(BikeFinder, {
    sel: sel,
    custom: custom,
    onPick: onPick,
    start: start
  })));
}
/* ===== v6: статистика, фото, совет дня, достижения ===== */
function bumpStat(k) {
  const s = load("stats", {});
  s[k] = (s[k] || 0) + 1;
  save("stats", s);
  try {
    window.dispatchEvent(new Event("mh-stats"));
  } catch (e) {}
}
function useStats() {
  const [s, setS] = useState(() => load("stats", {}));
  useEffect(() => {
    const h = () => setS(load("stats", {}));
    window.addEventListener("mh-stats", h);
    return () => window.removeEventListener("mh-stats", h);
  }, []);
  return s;
}
function readPhoto(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file),
      img = new Image();
    img.onload = () => {
      const draw = (max, q) => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", q);
      };
      let d = draw(1400, 0.8);
      if (d.length > 900000) d = draw(1100, 0.68);
      if (d.length > 900000) d = draw(900, 0.6);
      URL.revokeObjectURL(url);
      res(d);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("bad image"));
    };
    img.src = url;
  });
}
const PHOTO_FX = [["none", "Как есть"], ["garage", "Гараж"], ["night", "Ночь"], ["dust", "Пыль"], ["mono", "Чёрно-белое"]];
function PhotoStage({
  vkey,
  running,
  flash,
  eng,
  bike,
  cu
}) {
  const key = "photo|" + vkey;
  const [src, setSrc] = useState(() => load(key, null));
  const [fx, setFx] = useState(() => load("photofx", "garage"));
  const [busy, setBusy] = useState(false);
  const ref = useRef(null),
    fileRef = useRef(null);
  useEffect(() => {
    setSrc(load(key, null));
  }, [vkey]);
  async function onFile(f) {
    if (!f) return;
    setBusy(true);
    try {
      const d = await readPhoto(f);
      try {
        localStorage.setItem("mh2-" + key, JSON.stringify(d));
        setSrc(d);
        bumpStat("photo");
        flash("Фото сохранено");
      } catch (e) {
        flash("Не хватило места в браузере — попробуй фото поменьше");
      }
    } catch (e) {
      flash("Не получилось открыть это фото");
    }
    setBusy(false);
  }
  function move(e) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--rx", ((e.clientY - r.top) / r.height - 0.5) * -6 + "deg");
    el.style.setProperty("--ry", ((e.clientX - r.left) / r.width - 0.5) * 8 + "deg");
  }
  function leave() {
    const el = ref.current;
    if (el) {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "photo-zone"
  }, /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/*",
    hidden: true,
    onChange: e => {
      onFile(e.target.files && e.target.files[0]);
      e.target.value = "";
    }
  }), src ? /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: "photo-card fx-" + fx + (running ? " running" : ""),
    onPointerMove: move,
    onPointerLeave: leave
  }, /*#__PURE__*/React.createElement("div", {
    className: "photo-img",
    style: {
      backgroundImage: "url(" + src + ")"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "photo-grade"
  }), /*#__PURE__*/React.createElement("div", {
    className: "photo-shine"
  }), /*#__PURE__*/React.createElement("div", {
    className: "photo-corners"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null)), /*#__PURE__*/React.createElement("div", {
    className: "photo-hud"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ph-tag"
  }, eng.code), /*#__PURE__*/React.createElement("b", null, cu.nick || bike.brand + " " + bike.name), /*#__PURE__*/React.createElement("span", {
    className: "ph-sub"
  }, eng.hp, " \u043B.\u0441. \xB7 ", eng.cc, " \u0441\u043C\xB3 \xB7 ", eng.groups.indexOf("efi") >= 0 ? "инжектор" : eng.carb)), running && /*#__PURE__*/React.createElement("div", {
    className: "photo-smoke"
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null))) : /*#__PURE__*/React.createElement("button", {
    className: "photo-empty",
    onClick: () => fileRef.current && fileRef.current.click(),
    disabled: busy
  }, /*#__PURE__*/React.createElement("span", {
    className: "pe-ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "photo",
    s: 34
  })), /*#__PURE__*/React.createElement("b", null, busy ? "Обрабатываю фото…" : "Добавь фото своего мотоцикла"), /*#__PURE__*/React.createElement("span", null, "\u0421\u0431\u043E\u043A\u0443, \u043D\u0430 \u043F\u0440\u0438\u0440\u043E\u0434\u0435 \u0438\u043B\u0438 \u0432 \u0433\u0430\u0440\u0430\u0436\u0435. \u0424\u043E\u0442\u043E \u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u044D\u0442\u043E\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435."), /*#__PURE__*/React.createElement("span", {
    className: "pe-hint"
  }, "\u041D\u0435\u0442 \u0441\u0432\u043E\u0435\u0433\u043E \u0444\u043E\u0442\u043E? \u041A\u043D\u043E\u043F\u043A\u0430 \u043D\u0438\u0436\u0435 \u043F\u043E\u043A\u0430\u0436\u0435\u0442, \u043A\u0430\u043A \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043C\u043E\u0434\u0435\u043B\u044C.")), src && /*#__PURE__*/React.createElement("div", {
    className: "photo-ctrl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "seg dark sm",
    role: "group",
    "aria-label": "\u042D\u0444\u0444\u0435\u043A\u0442"
  }, PHOTO_FX.map(f => /*#__PURE__*/React.createElement("button", {
    key: f[0],
    className: fx === f[0] ? "on" : "",
    onClick: () => {
      setFx(f[0]);
      save("photofx", f[0]);
    }
  }, f[1]))), /*#__PURE__*/React.createElement("button", {
    className: "ctl",
    onClick: () => fileRef.current && fileRef.current.click()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "photo",
    s: 16
  }), "\u0421\u043C\u0435\u043D\u0438\u0442\u044C"), /*#__PURE__*/React.createElement("button", {
    className: "ctl",
    onClick: () => {
      try {
        localStorage.removeItem("mh2-" + key);
      } catch (e) {}
      setSrc(null);
      flash("Фото удалено");
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "close",
    s: 16
  }), "\u0423\u0434\u0430\u043B\u0438\u0442\u044C")));
}
function TipCard() {
  const day = Math.floor(Date.now() / 86400000);
  const [i, setI] = useState(day % TIPS.length);
  return /*#__PURE__*/React.createElement("div", {
    className: "panel tip"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u0421\u043E\u0432\u0435\u0442 \u0434\u043D\u044F"), /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => setI((i + 1) % TIPS.length)
  }, "\u0415\u0449\u0451 \u0441\u043E\u0432\u0435\u0442")), /*#__PURE__*/React.createElement("p", {
    className: "tip-text",
    key: i
  }, TIPS[i]), /*#__PURE__*/React.createElement("span", {
    className: "tip-n"
  }, i + 1, " / ", TIPS.length));
}
function Badges({
  eng,
  cu,
  mt
}) {
  const s = useStats();
  const x = {
    mods: eng.mods,
    color: cu.color,
    odo: mt.odo || 0
  };
  const got = BADGES.filter(b => b.need(s, x));
  useEffect(() => {
    const seen = load("badgesSeen", null),
      ids = got.map(b => b.id);
    if (seen === null) {
      save("badgesSeen", ids);
      return;
    }
    const fresh = ids.filter(id => seen.indexOf(id) < 0);
    if (fresh.length) {
      save("badgesSeen", ids);
      const b = BADGES.find(z => z.id === fresh[0]);
      confetti(b ? b.icon + " " + b.t : "");
    }
  }, [got.length]);
  return /*#__PURE__*/React.createElement("div", {
    className: "panel badges-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u0414\u043E\u0441\u0442\u0438\u0436\u0435\u043D\u0438\u044F"), /*#__PURE__*/React.createElement("span", {
    className: "bp-count"
  }, got.length, " / ", BADGES.length)), /*#__PURE__*/React.createElement("div", {
    className: "badges"
  }, BADGES.map(b => {
    const ok = got.indexOf(b) >= 0;
    return /*#__PURE__*/React.createElement("div", {
      key: b.id,
      className: "badge-it" + (ok ? " got" : ""),
      title: b.d
    }, /*#__PURE__*/React.createElement("span", {
      className: "bi-ico",
      "aria-hidden": "true"
    }, b.icon), /*#__PURE__*/React.createElement("b", null, b.t), /*#__PURE__*/React.createElement("small", null, ok ? "получено" : b.d));
  })));
}

/* салют из конфетти */
function confetti(title) {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas");
  c.className = "confetti";
  document.body.appendChild(c);
  const w = c.width = window.innerWidth,
    h = c.height = window.innerHeight,
    x = c.getContext("2d");
  const cols = ["#E5E7EB", "#93C5FD", "#E5533D", "#3C7BD9", "#2F8A4F", "#FFFFFF"],
    P = [];
  for (let i = 0; i < 160; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6,
      v = 8 + Math.random() * 10;
    P.push({
      x: w / 2,
      y: h * 0.7,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      r: 4 + Math.random() * 5,
      c: cols[i % cols.length],
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4
    });
  }
  if (title) {
    const t = document.createElement("div");
    t.className = "badge-pop";
    t.innerHTML = "<small>Новое достижение</small><b></b>";
    t.querySelector("b").textContent = title;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  let f = 0;
  const step = () => {
    x.clearRect(0, 0, w, h);
    P.forEach(p => {
      p.vy += 0.28;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.rot);
      x.fillStyle = p.c;
      x.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      x.restore();
    });
    if (++f < 150) requestAnimationFrame(step);else c.remove();
  };
  requestAnimationFrame(step);
}
/* ===== ИИ на своём сервере (Cloudflare Worker) ===== */
async function findAiEndpoint() {
  try {
    const v = localStorage.getItem("mh2-aiEndpoint");
    if (v) return JSON.parse(v);
  } catch (e) {}
  try {
    if (location.protocol === "http:" || location.protocol === "https:") {
      const r = await fetch("ai-config.json", {
        cache: "no-store"
      });
      if (r.ok) {
        const j = await r.json();
        if (j && j.endpoint) return String(j.endpoint);
      }
    }
  } catch (e) {}
  return null;
}
/* Умеет ли сервер ИИ смотреть фото: GET на адрес сервера отдаёт {"images": true}. Старый сервер — без фото */
async function probeWorker(url) {
  try {
    const r = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });
    if (!r.ok) return {};
    const j = await r.json();
    return j && typeof j === "object" ? j : {};
  } catch (e) {
    return {};
  }
}
function makeWorkerAI(url) {
  const fn = async (turns, opts) => {
    opts = opts || {};
    const all = turns.map((t, i) => ({
      role: i === 0 ? "system" : t.role,
      content: t.content
    }));
    const msgs = all.length > 9 ? [all[0]].concat(all.slice(-8)) : all;
    let text = "";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(opts.images && opts.images.length ? {
          messages: msgs,
          images: await Promise.all(opts.images.map(f => typeof f === "string" ? f : readPhoto(f)))
        } : {
          messages: msgs
        }),
        signal: opts.signal
      });
      if (!res.ok) {
        let t = "";
        try {
          t = await res.text();
        } catch (e) {}
        throw {
          code: res.status === 429 || /limit|neuron|exceed|quota/i.test(t) ? "rate_limited" : res.status === 403 ? "not_allowed" : "upstream_error"
        };
      }
      const prov = res.headers.get("x-mh-provider");
      if (prov) {
        try {
          window.mhAiProvider = prov;
          window.dispatchEvent(new CustomEvent("mh-ai-provider", {
            detail: prov
          }));
        } catch (e) {}
      }
      const ct = res.headers.get("content-type") || "";
      if (!res.body || ct.indexOf("event-stream") < 0) {
        const j = await res.json();
        text = j.response || j.result && j.result.response || "";
        opts.onText && opts.onText({
          text: text
        });
      } else {
        const reader = res.body.getReader(),
          dec = new TextDecoder();
        let buf = "";
        while (true) {
          const r = await reader.read();
          if (r.done) break;
          buf += dec.decode(r.value, {
            stream: true
          });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (line.indexOf("data:") !== 0) continue;
            const d = line.slice(5).trim();
            if (!d || d === "[DONE]") continue;
            try {
              const j = JSON.parse(d);
              const piece = typeof j.response === "string" ? j.response : j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content || "";
              if (piece) {
                text += piece;
                opts.onText && opts.onText({
                  text: text,
                  delta: piece
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      if (e && e.name === "AbortError") throw {
        code: "cancelled",
        text: text
      };
      if (e && e.code) throw Object.assign({
        text: text
      }, e);
      throw {
        code: "upstream_error",
        text: text
      };
    }
    if (!text.trim()) throw {
      code: "empty_completion"
    };
    return {
      text: text
    };
  };
  fn.limits = async () => ({
    images: null
  });
  return fn;
}
function AiConnect({
  connectAi
}) {
  const [url, setUrl] = useState("");
  const [st, setSt] = useState("");
  async function test() {
    const u = url.trim();
    if (!/^https:\/\//.test(u)) {
      setSt("Адрес должен начинаться с https://");
      return;
    }
    setSt("Проверяю…");
    try {
      const r = await fetch(u, {
        method: "GET"
      });
      const t = await r.text();
      if (/MotoHelper AI/.test(t)) {
        setSt("");
        connectAi(u);
      } else setSt("Сервер ответил, но это не MotoHelper AI. Проверь код Worker.");
    } catch (e) {
      setSt("Не удалось достучаться до сервера. Проверь адрес или попробуй с VPN.");
    }
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "ai-connect"
  }, /*#__PURE__*/React.createElement("label", {
    className: "f"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u0410\u0434\u0440\u0435\u0441 \u0418\u0418-\u0441\u0435\u0440\u0432\u0435\u0440\u0430 (Cloudflare Worker)"), /*#__PURE__*/React.createElement("input", {
    type: "url",
    value: url,
    onChange: e => setUrl(e.target.value),
    placeholder: "https://motohelper-ai.\u0438\u043C\u044F.workers.dev"
  })), /*#__PURE__*/React.createElement("div", {
    className: "row-gap"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: test
  }, "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C"), st && /*#__PURE__*/React.createElement("span", {
    className: "muted small"
  }, st)), /*#__PURE__*/React.createElement("p", {
    className: "muted small"
  }, "\u0422\u0430\u043A \u0418\u0418 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0432 \u044D\u0442\u043E\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435. \u0427\u0442\u043E\u0431\u044B \u043E\u043D \u0440\u0430\u0431\u043E\u0442\u0430\u043B \u0443 \u0432\u0441\u0435\u0445, \u0434\u043E\u0431\u0430\u0432\u044C \u0432 \u0440\u0435\u043F\u043E\u0437\u0438\u0442\u043E\u0440\u0438\u0439 \u0444\u0430\u0439\u043B ", /*#__PURE__*/React.createElement("code", null, "ai-config.json"), " \u0441 \u0430\u0434\u0440\u0435\u0441\u043E\u043C \u0441\u0435\u0440\u0432\u0435\u0440\u0430."));
}
/* ===== Поиск мотоцикла: понятный и терпимый к опечаткам ===== */
const BF_ALIAS = {
  "самакс": "sharmax",
  "шармакс": "sharmax",
  "samax": "sharmax",
  "мотоленд": "motoland",
  "мотолэнд": "motoland",
  "прогаси": "progasi",
  "кайо": "kayo",
  "каё": "kayo",
  "авантис": "avantis",
  "регулмото": "regulmoto",
  "рейсер": "racer",
  "ирбис": "irbis",
  "рокот": "rockot",
  "бсе": "bse",
  "атаки": "ataki",
  "велс": "wels",
  "хонда": "honda",
  "ямаха": "yamaha",
  "кавасаки": "kawasaki",
  "сузуки": "suzuki",
  "ктм": "ktm",
  "бмв": "bmw",
  "хускварна": "husqvarna",
  "бета": "beta",
  "шерко": "sherco",
  "стелс": "stels",
  "лифан": "lifan",
  "кове": "kove",
  "шинерей": "shineray",
  "сфмото": "cfmoto",
  "цфмото": "cfmoto",
  "альфа": "alpha",
  "дукати": "ducati",
  "априлия": "aprilia",
  "триумф": "triumph",
  "харлей": "harley",
  "зонтес": "zontes",
  "фхмото": "fxmoto",
  "эстиэн": "stn",
  "стн": "stn"
};
const BF_POPULAR = ["Motoland", "Kayo", "Regulmoto", "BSE", "Avantis", "Progasi", "Racer", "Irbis", "Stels", "Sharmax", "STN", "CFMOTO", "Honda", "Yamaha", "Kawasaki", "Suzuki", "KTM", "Husqvarna"];
const BF_TYPES = ["Эндуро", "Питбайк", "Кросс-эндуро", "Мотард", "Тур-эндуро", "Лёгкий эндуро", "Мопед", "Спорт", "Нейкед", "Чоппер", "Триал", "Классика"];
function bfNorm(s) {
  return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/[\s\-_.\/«»"]+/g, "");
}
function bfTokens(q) {
  let s = String(q || "").toLowerCase().replace(/ё/g, "е");
  Object.keys(BF_ALIAS).forEach(k => {
    s = s.split(k).join(BF_ALIAS[k] + " ");
  });
  return s.split(/\s+/).map(bfNorm).filter(Boolean);
}
/* Опечатки раскладки («лфнщ» → kayo) и русские буквы вместо латинских («тт250» → tt250) */
const BF_RU = "йцукенгшщзхъфывапролджэячсмитьбю",
  BF_EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const BF_TR = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
};
function bfAlts(t) {
  if (!/[а-я]/.test(t)) return [t];
  const lay = bfNorm(t.split("").map(c => {
      const i = BF_RU.indexOf(c);
      return i < 0 ? c : BF_EN[i];
    }).join("")),
    tr = t.split("").map(c => BF_TR[c] != null ? BF_TR[c] : c).join("");
  return [t, lay, tr].filter((x, i, a) => x && a.indexOf(x) === i);
}
function bfHas(s, t) {
  return bfAlts(t).some(a => s.indexOf(a) >= 0);
}
/* Объём мотора: самый простой фильтр, если не помнишь точное название */
const BF_CC = [["Любой объём", 0, 1e4], ["до 125", 0, 125], ["150–200", 126, 200], ["250", 201, 260], ["300", 261, 349], ["400+", 350, 1e4]];
function bfRecent() {
  try {
    return JSON.parse(localStorage.getItem("mh2-recent") || "[]").filter(k => typeof k === "string");
  } catch (e) {
    return [];
  }
}
function bfHl(text, q) {
  const t = String(q || "").trim();
  if (!t) return text;
  const first = t.split(/\s+/).sort((a, b) => b.length - a.length)[0];
  const i = text.toLowerCase().indexOf(first.toLowerCase());
  if (i < 0 || first.length < 2) return text;
  return /*#__PURE__*/React.createElement(React.Fragment, null, text.slice(0, i), /*#__PURE__*/React.createElement("mark", null, text.slice(i, i + first.length)), text.slice(i + first.length));
}
function BikeFinder({
  sel,
  custom,
  onPick,
  compact,
  start
}) {
  const [q, setQ] = useState(""),
    [type, setType] = useState("Все"),
    [brand, setBrand] = useState(null),
    [allBrands, setAllBrands] = useState(false),
    [limit, setLimit] = useState(40),
    [mode, setMode] = useState(start && start.mode || "models"),
    [engF, setEngF] = useState(start && start.engine || null),
    [cc, setCc] = useState(0);
  const pick = (b, i) => {
    try {
      const k = bikeKey(b);
      localStorage.setItem("mh2-recent", JSON.stringify([k].concat(bfRecent().filter(x => x !== k)).slice(0, 6)));
    } catch (e) {}
    onPick(b, i);
  };
  const aka = id => typeof ENGINE_AKA === "object" && ENGINE_AKA[id] || "";
  const idx = useMemo(() => BIKES.map(b => ({
    b: b,
    s: bfNorm(b.brand + " " + b.name + " " + b.versions.map(v => bfYears(v.years) + " " + (ENGINES[v.engine] || {}).code + " " + (ENGINES[v.engine] || {}).name + " " + aka(v.engine)).join(" "))
  })), []);
  /* Моторы: сколько моделей на каждом, строка для поиска с синонимами («174», «нб300», «зонгшен») */
  const engIdx = useMemo(() => {
    const cnt = {},
      gen = {};
    BIKES.forEach(b => b.versions.forEach(v => {
      if (b.brand === "Любая модель") gen[v.engine] = b;else cnt[v.engine] = (cnt[v.engine] || 0) + 1;
    }));
    return Object.keys(ENGINES).filter(id => cnt[id] || gen[id]).map(id => {
      const e = ENGINES[id];
      return {
        id: id,
        e: e,
        n: cnt[id] || 0,
        gen: gen[id] || null,
        s: bfNorm(id + " " + e.code + " " + e.name + " " + (e.maker || "") + " " + aka(id))
      };
    }).sort((a, b) => b.n - a.n);
  }, []);
  const engMatch = q => {
    const t = bfTokens(q);
    return t.length ? engIdx.filter(x => t.every(k => bfHas(x.s, k))) : engIdx;
  };
  const toks = bfTokens(q);
  const types = ["Все"].concat(BF_TYPES.filter(t => BIKES.some(b => b.type === t)));
  const ccR = BF_CC[cc];
  const pool = idx.filter(x => (type === "Все" || x.b.type === type) && x.b.brand !== "Любая модель" && (!cc || x.b.versions.some(v => {
    const c = (ENGINES[v.engine] || {}).cc || 0;
    return c >= ccR[1] && c <= ccR[2];
  })));
  let list = pool.filter(x => (!brand || x.b.brand === brand) && (!engF || x.b.versions.some(v => v.engine === engF)) && toks.every(t => bfHas(x.s, t))).map(x => x.b);
  const engCur = engF ? engIdx.find(x => x.id === engF) : null;
  if (engCur && engCur.gen && !toks.length) list = [engCur.gen].concat(list);
  /* запрос похож на код мотора («174», «NB300», «172») — предложим показать все модели с ним */
  const engHints = toks.length && !engF && toks.join("").length >= 3 ? engMatch(q).filter(x => x.n > 0).slice(0, 3) : [];
  if (toks.length) {
    const f = toks[0];
    const sc = b => (bfNorm(b.name).indexOf(f) === 0 ? 3 : 0) + (bfNorm(b.brand).indexOf(f) === 0 ? 2 : 0) + (bfNorm(b.name).indexOf(f) >= 0 ? 1 : 0);
    list = list.slice().sort((a, b) => sc(b) - sc(a));
  }
  const counts = {};
  pool.forEach(x => {
    counts[x.b.brand] = (counts[x.b.brand] || 0) + 1;
  });
  const brands = Object.keys(counts).sort((a, b) => {
    const pa = BF_POPULAR.indexOf(a),
      pb = BF_POPULAR.indexOf(b);
    if (pa >= 0 || pb >= 0) return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb);
    return a.localeCompare(b);
  });
  const mine = BIKES.filter(b => b.versions.some((v, i) => {
    const c = (custom || {})[bikeKey(b) + "|" + i];
    return c && Object.keys(c).length;
  }));
  const recent = bfRecent().map(k => BIKES.find(b => bikeKey(b) === k)).filter(b => b && mine.indexOf(b) < 0 && b.brand !== "Любая модель");
  const generic = BIKES.filter(b => b.brand === "Любая модель");
  const showBrands = !toks.length && !brand && !engF;
  useEffect(() => {
    setLimit(40);
  }, [q, type, brand, engF, mode, cc]);
  const pickEngine = id => {
    setEngF(id);
    setMode("models");
    setQ("");
    setBrand(null);
  };
  const EngCard = ({
    x
  }) => /*#__PURE__*/React.createElement("div", {
    className: "bf-item"
  }, /*#__PURE__*/React.createElement("button", {
    className: "bf-main",
    onClick: () => pickEngine(x.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "bf-brand-s"
  }, x.e.maker || "Мотор"), /*#__PURE__*/React.createElement("b", null, bfHl(x.e.code, q)), /*#__PURE__*/React.createElement("span", {
    className: "bf-meta"
  }, x.e.name, " \xB7 ", x.e.cc, " \u0441\u043C\xB3 \xB7 ", x.e.hp, " \u043B.\u0441.")), /*#__PURE__*/React.createElement("span", {
    className: "bf-type"
  }, x.n ? x.n + " " + plural(x.n, "модель", "модели", "моделей") : "без модели"));
  const Card = ({
    b
  }) => {
    const v0 = b.versions[0],
      e = ENGINES[v0.engine] || {},
      c0 = (custom || {})[bikeKey(b) + "|0"] || {},
      on = sel && bikeKey(b) === sel.key;
    return /*#__PURE__*/React.createElement("div", {
      className: "bf-item" + (on ? " on" : "")
    }, /*#__PURE__*/React.createElement("button", {
      className: "bf-main",
      onClick: () => pick(b, 0)
    }, /*#__PURE__*/React.createElement("span", {
      className: "bf-brand-s"
    }, b.brand, on ? " · выбран" : ""), /*#__PURE__*/React.createElement("b", null, c0.nick ? "«" + c0.nick + "» " : "", bfHl(b.name, q)), /*#__PURE__*/React.createElement("span", {
      className: "bf-meta"
    }, e.code, v0.approx ? " ≈" : "", " \xB7 ", v0.hp || e.hp, " \u043B.\u0441. \xB7 ", e.cc, " \u0441\u043C\xB3")), /*#__PURE__*/React.createElement("span", {
      className: "bf-type"
    }, b.type), b.versions.length > 1 && /*#__PURE__*/React.createElement("div", {
      className: "bf-vers"
    }, b.versions.map((v, i) => {
      const ev = ENGINES[v.engine] || {};
      return /*#__PURE__*/React.createElement("button", {
        key: i,
        className: "chip",
        onClick: () => pick(b, i)
      }, v.label || ev.code);
    })));
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bf" + (compact ? " compact" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "bf-search"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "search",
    s: 20
  }), /*#__PURE__*/React.createElement("input", {
    type: "search",
    value: q,
    onChange: e => setQ(e.target.value),
    autoFocus: !compact,
    placeholder: mode === "engines" ? "Код мотора: 174, NB300, 172FMM, CB300" : "Марка, модель или мотор: TT250, Kayo, 174",
    "aria-label": "\u041F\u043E\u0438\u0441\u043A \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B\u0430",
    enterKeyHint: "search"
  }), q && /*#__PURE__*/React.createElement("button", {
    className: "bf-clear",
    "aria-label": "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C",
    onClick: () => setQ("")
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "close",
    s: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "seg bf-mode",
    role: "group",
    "aria-label": "Искать"
  }, [["models", "Модели"], ["engines", "Моторы"]].map(m => /*#__PURE__*/React.createElement("button", {
    key: m[0],
    className: mode === m[0] ? "on" : "",
    "aria-pressed": mode === m[0],
    onClick: () => {
      setMode(m[0]);
      setEngF(null);
    }
  }, m[1]))), mode === "engines" ? /*#__PURE__*/React.createElement(React.Fragment, null, null, /*#__PURE__*/React.createElement("div", {
    className: "bf-list"
  }, engMatch(q).slice(0, limit).map(x => /*#__PURE__*/React.createElement(EngCard, {
    key: x.id,
    x: x
  }))), engMatch(q).length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "bf-empty"
  }, /*#__PURE__*/React.createElement("b", null, "Такого мотора нет в базе"), /*#__PURE__*/React.createElement("p", null, "Попробуй только цифры с картера (\xAB174\xBB, \xAB172\xBB) или название (\xABNB300\xBB, \xABCB250\xBB).")), engMatch(q).length > limit && /*#__PURE__*/React.createElement("button", {
    className: "btn bf-more",
    onClick: () => setLimit(limit + 40)
  }, "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451 (", engMatch(q).length - limit, ")")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "bf-types"
  }, types.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    className: "chip" + (type === t ? " on" : ""),
    onClick: () => setType(t)
  }, t))), /*#__PURE__*/React.createElement("div", {
    className: "bf-types bf-cc"
  }, BF_CC.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: c[0],
    className: "chip" + (cc === i ? " on" : ""),
    onClick: () => setCc(i)
  }, c[0], i > 0 ? " см³" : ""))), engCur && /*#__PURE__*/React.createElement("div", {
    className: "bf-brandhead"
  }, /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => {
      setEngF(null);
      setMode("engines");
    }
  }, "\u2190 \u0412\u0441\u0435 \u043C\u043E\u0442\u043E\u0440\u044B"), /*#__PURE__*/React.createElement("h3", null, engCur.e.code, " \xB7 ", engCur.n, " ", plural(engCur.n, "модель", "модели", "моделей"))), engHints.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bf-enghints"
  }, engHints.map(x => /*#__PURE__*/React.createElement("button", {
    key: x.id,
    className: "chip",
    onClick: () => pickEngine(x.id)
  }, "\u041C\u043E\u0442\u043E\u0440 ", x.e.code, " \u2014 \u0432\u0441\u0435 ", x.n, " ", plural(x.n, "модель", "модели", "моделей")))), brand && !toks.length && /*#__PURE__*/React.createElement("div", {
    className: "bf-brandhead"
  }, /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => setBrand(null)
  }, "\u2190 \u0412\u0441\u0435 \u043C\u0430\u0440\u043A\u0438"), /*#__PURE__*/React.createElement("h3", null, brand)), showBrands ? /*#__PURE__*/React.createElement(React.Fragment, null, mine.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bf-sec"
  }, /*#__PURE__*/React.createElement("h4", null, "\u041C\u043E\u0438 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B\u044B"), /*#__PURE__*/React.createElement("div", {
    className: "bf-list"
  }, mine.slice(0, 6).map(b => /*#__PURE__*/React.createElement(Card, {
    key: bikeKey(b),
    b: b
  })))), recent.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bf-sec"
  }, /*#__PURE__*/React.createElement("h4", null, "Недавние"), /*#__PURE__*/React.createElement("div", {
    className: "bf-list"
  }, recent.slice(0, 4).map(b => /*#__PURE__*/React.createElement(Card, {
    key: bikeKey(b),
    b: b
  })))), /*#__PURE__*/React.createElement("h4", {
    className: "bf-h"
  }, "\u0412\u044B\u0431\u0435\u0440\u0438 \u043C\u0430\u0440\u043A\u0443 ", /*#__PURE__*/React.createElement("span", null, "\u0438\u043B\u0438 \u043D\u0430\u0447\u043D\u0438 \u0432\u0432\u043E\u0434\u0438\u0442\u044C \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435")), /*#__PURE__*/React.createElement("div", {
    className: "bf-brands"
  }, brands.slice(0, allBrands ? 999 : 18).map(br => /*#__PURE__*/React.createElement("button", {
    key: br,
    className: "bf-brand",
    onClick: () => setBrand(br)
  }, /*#__PURE__*/React.createElement("b", null, br), /*#__PURE__*/React.createElement("span", null, counts[br], " ", plural(counts[br], "модель", "модели", "моделей"))))), !allBrands && brands.length > 18 && /*#__PURE__*/React.createElement("button", {
    className: "btn bf-more",
    onClick: () => setAllBrands(true)
  }, "\u0412\u0441\u0435 \u043C\u0430\u0440\u043A\u0438 (", brands.length, ")")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "bf-count"
  }, list.length ? "Найдено: " + list.length : ""), list.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "bf-empty"
  }, /*#__PURE__*/React.createElement("b", null, "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0448\u043B\u043E\u0441\u044C"), /*#__PURE__*/React.createElement("p", null, "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0442\u043E\u043B\u044C\u043A\u043E \u043C\u043E\u0434\u0435\u043B\u044C (\xABTT250\xBB, \xABK6\xBB) \u0438\u043B\u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u043C\u0430\u0440\u043A\u0443. \u0415\u0441\u043B\u0438 \u0442\u0432\u043E\u0435\u0439 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0435\u0442 \u2014 \u0432\u044B\u0431\u0435\u0440\u0438 \u043F\u043E \u043A\u043E\u0434\u0443 \u043C\u043E\u0442\u043E\u0440\u0430, \u043E\u043D \u0432\u044B\u0431\u0438\u0442 \u043D\u0430 \u043A\u0430\u0440\u0442\u0435\u0440\u0435:"), /*#__PURE__*/React.createElement("div", {
    className: "bf-list"
  }, generic.filter(b => !toks.length || toks.some(t => bfNorm(b.name).indexOf(t) >= 0)).slice(0, 6).concat(toks.length ? [] : []).map(b => /*#__PURE__*/React.createElement(Card, {
    key: bikeKey(b),
    b: b
  }))), generic.filter(b => toks.some(t => bfNorm(b.name).indexOf(t) >= 0)).length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "bf-list"
  }, generic.slice(0, 6).map(b => /*#__PURE__*/React.createElement(Card, {
    key: bikeKey(b),
    b: b
  })))), /*#__PURE__*/React.createElement("div", {
    className: "bf-list"
  }, list.slice(0, limit).map(b => /*#__PURE__*/React.createElement(Card, {
    key: bikeKey(b),
    b: b
  }))), list.length > limit && /*#__PURE__*/React.createElement("button", {
    className: "btn bf-more",
    onClick: () => setLimit(limit + 40)
  }, "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451 (", list.length - limit, ")"))));
}
/* ===== Первый заход: приветствие и «С чего начать» ===== */
const ONB_TILES = [["home", "Главная", "Объёмная модель мотора твоего мотоцикла: крути, заводи, заглядывай внутрь. Совет дня и проверка перед выездом."], ["bike", "Мой мотоцикл", "Характеристики и максимальная скорость, что и через сколько км обслуживать, тюнинг под цель и бюджет."], ["ai", "ИИ-механик", "Опиши проблему своими словами — подскажет причину, что проверить и какие детали купить."], ["wrench", "Ремонт", "«Что сломалось?» по симптомам, 60+ инструкций со схемами, справочник и коды ошибок."], ["cart", "Запчасти", "Только детали под твой мотор: аналоги, сложность установки и ссылки на магазины."]];
function Onboarding({
  step0,
  sel,
  custom,
  onPickBike,
  onDone
}) {
  const [step, setStep] = useState(step0 || 0);
  return /*#__PURE__*/React.createElement("div", {
    className: "overlay onb-ov"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sheet onb",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "\u0417\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E \u0441 MotoHelper"
  }, /*#__PURE__*/React.createElement("div", {
    className: "onb-dots",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    className: step === 0 ? "on" : ""
  }), /*#__PURE__*/React.createElement("span", {
    className: step === 1 ? "on" : ""
  })), step === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "onb-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "onb-hero"
  }, /*#__PURE__*/React.createElement("span", {
    className: "brand-mark onb-mark"
  }, "MH"), /*#__PURE__*/React.createElement("h2", null, "\u0414\u043E\u0431\u0440\u043E \u043F\u043E\u0436\u0430\u043B\u043E\u0432\u0430\u0442\u044C \u0432 MotoHelper"), /*#__PURE__*/React.createElement("p", null, "Помощник по ремонту, обслуживанию и тюнингу мотоциклов. Вот что здесь есть:")), /*#__PURE__*/React.createElement("ul", {
    className: "onb-tiles"
  }, ONB_TILES.map(t => /*#__PURE__*/React.createElement("li", {
    key: t[0]
  }, /*#__PURE__*/React.createElement("span", {
    className: "onb-ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: t[0],
    s: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, t[1]), /*#__PURE__*/React.createElement("p", null, t[2]))))), /*#__PURE__*/React.createElement("p", {
    className: "muted small"
  }, "\u042D\u0442\u0438 \u0440\u0430\u0437\u0434\u0435\u043B\u044B \u2014 \u0432 \u043C\u0435\u043D\u044E \u0432\u043D\u0438\u0437\u0443 \u044D\u043A\u0440\u0430\u043D\u0430. \u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0443 \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u043D\u043E\u0432\u0430 \u043A\u043D\u043E\u043F\u043A\u043E\u0439 \xAB?\xBB \u0432\u0432\u0435\u0440\u0445\u0443."), /*#__PURE__*/React.createElement("div", {
    className: "onb-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary big",
    onClick: () => setStep(1)
  }, "\u0414\u0430\u043B\u044C\u0448\u0435: \u043D\u0430\u0439\u0442\u0438 \u0441\u0432\u043E\u0439 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onDone
  }, "\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u044C"))) : /*#__PURE__*/React.createElement("div", {
    className: "onb-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "onb-find-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u041D\u0430\u0439\u0434\u0438 \u0441\u0432\u043E\u0439 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B"), /*#__PURE__*/React.createElement("p", null, "Всё на сайте подстроится под него: мотор, обслуживание, запчасти и инструкции.")), /*#__PURE__*/React.createElement(BikeFinder, {
    compact: true,
    sel: sel,
    custom: custom,
    onPick: (b, vi) => {
      onPickBike(b, vi);
      onDone();
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "onb-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setStep(0)
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434"), /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: onDone
  }, "\u0412\u044B\u0431\u0435\u0440\u0443 \u043F\u043E\u0437\u0436\u0435")))));
}
function StartGuide({
  mt,
  go,
  setPicker
}) {
  const s = useStats();
  const [hide, setHide] = useState(() => load("startHide", false));
  const items = [[load("picked", false), "Выбери свой мотоцикл", "Выбрать", () => setPicker(true)], [(s.start || 0) > 0 || (s.xray || 0) > 0, "Заведи мотор или загляни внутрь", "К мотору", () => {
    const st = document.querySelector(".stage");
    if (st) window.scrollTo({
      top: st.getBoundingClientRect().top + window.scrollY - 70,
      behavior: "smooth"
    });
  }], [(s.diag || 0) > 0 || (s.ai || 0) > 0, "Опиши поломку в «Что сломалось?» или спроси ИИ", "Открыть", () => go("repair", "find")]];
  const done = items.filter(i => i[0]).length;
  if (hide || done === items.length) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "panel startg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u0421 \u0447\u0435\u0433\u043E \u043D\u0430\u0447\u0430\u0442\u044C"), /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => {
      save("startHide", true);
      setHide(true);
    }
  }, "\u0421\u043A\u0440\u044B\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    className: "sg-bar"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: done / items.length * 100 + "%"
    }
  })), /*#__PURE__*/React.createElement("ol", {
    className: "sg-list"
  }, items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: it[0] ? "done" : ""
  }, /*#__PURE__*/React.createElement("span", {
    className: "sg-n"
  }, it[0] ? /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 14
  }) : i + 1), /*#__PURE__*/React.createElement("span", {
    className: "sg-t"
  }, it[1]), !it[0] && /*#__PURE__*/React.createElement("button", {
    className: "btn sm",
    onClick: it[3]
  }, it[2])))));
}
/* ===== 3D-фон: извилистая дорога в закат / рассвет ===== */
function roadTexture(kind) {
  const W = 512,
    H = 1024,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  const R = Math.random,
    dots = (cols, n, s, a) => {
      for (let i = 0; i < n; i++) {
        x.fillStyle = cols[i % cols.length];
        x.globalAlpha = (a || 0.3) + R() * 0.45;
        const r = R() * s + 0.6;
        x.fillRect(R() * W, R() * H, r, r);
      }
      x.globalAlpha = 1;
    };
  if (kind === "asphalt") {
    x.fillStyle = "#2f3134";
    x.fillRect(0, 0, W, H);
    dots(["#44474b", "#232527", "#55585c", "#1b1c1e", "#3b3e42"], 42000, 2.4, 0.25);
    x.fillStyle = "rgba(15,15,16,.35)";
    [[130, 70], [330, 70]].forEach(b => x.fillRect(b[0] - b[1] / 2, 0, b[1], H));
    for (let i = 0; i < 6; i++) {
      x.fillStyle = "rgba(10,10,12," + (0.15 + R() * 0.2) + ")";
      x.beginPath();
      x.ellipse(110 + R() * 300, R() * H, 10 + R() * 25, 18 + R() * 40, R(), 0, 7);
      x.fill();
    }
    for (let i = 0; i < 3; i++) {
      x.fillStyle = "rgba(20,21,23,.55)";
      x.fillRect(60 + R() * 330, R() * H, 40 + R() * 70, 30 + R() * 60);
    }
    x.strokeStyle = "rgba(12,12,13,.8)";
    x.lineWidth = 1.4;
    for (let i = 0; i < 14; i++) {
      x.beginPath();
      let px = 40 + R() * 430,
        py = R() * H;
      x.moveTo(px, py);
      for (let k = 0; k < 6; k++) {
        px += (R() - 0.5) * 30;
        py += R() * 22;
        x.lineTo(px, py);
      }
      x.stroke();
    }
    const line = (lx, w, y0, y1, col) => {
      x.fillStyle = col;
      x.fillRect(lx, y0, w, y1 - y0);
      x.globalAlpha = 0.6;
      dots(["#2f3134"], 0, 1);
      x.globalAlpha = 1;
    };
    line(16, 12, 0, H, "#e6e2d6");
    line(W - 28, 12, 0, H, "#e6e2d6");
    line(W / 2 - 7, 14, 40, 460, "#f0c020");
    line(W / 2 - 7, 14, 552, 972, "#f0c020");
    for (let i = 0; i < 2500; i++) {
      x.fillStyle = "rgba(47,49,52," + (0.3 + R() * 0.5) + ")";
      const yy = R() * H,
        xx = R() < 0.5 ? 14 + R() * 16 : R() < 0.5 ? W - 30 + R() * 16 : W / 2 - 9 + R() * 18;
      x.fillRect(xx, yy, 1.5, 1.5);
    }
  } else {
    const g = x.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#4c5a28");
    g.addColorStop(0.1, "#6d5a3c");
    g.addColorStop(0.5, "#86704f");
    g.addColorStop(0.9, "#6d5a3c");
    g.addColorStop(1, "#4c5a28");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    dots(["#9a8262", "#5d4a33", "#a88f6c", "#4a3a28", "#7d6a4e"], 26000, 2.6, 0.25);
    [[150, 64], [362, 64]].forEach(b => {
      const rg = x.createLinearGradient(b[0] - b[1] / 2, 0, b[0] + b[1] / 2, 0);
      rg.addColorStop(0, "rgba(50,36,22,0)");
      rg.addColorStop(0.5, "rgba(50,36,22,.55)");
      rg.addColorStop(1, "rgba(50,36,22,0)");
      x.fillStyle = rg;
      x.fillRect(b[0] - b[1] / 2, 0, b[1], H);
      x.strokeStyle = "rgba(35,25,15,.5)";
      x.lineWidth = 2;
      for (let y = 0; y < H; y += 14) {
        x.beginPath();
        x.moveTo(b[0] - 14, y);
        x.lineTo(b[0], y + 6);
        x.lineTo(b[0] + 14, y);
        x.stroke();
      }
    });
    for (let i = 0; i < 1800; i++) {
      const r = 1.5 + R() * 3.5,
        px = 40 + R() * 430,
        py = R() * H;
      x.fillStyle = "rgba(30,22,14,.5)";
      x.beginPath();
      x.ellipse(px + 1, py + 1.5, r, r * 0.7, 0, 0, 7);
      x.fill();
      x.fillStyle = ["#b8a585", "#8c7a60", "#cbbd9f", "#9b8a70"][i % 4];
      x.beginPath();
      x.ellipse(px, py, r, r * 0.7, R(), 0, 7);
      x.fill();
    }
    for (let i = 0; i < 2; i++) {
      const px = 140 + R() * 230,
        py = R() * H,
        rw = 14 + R() * 18,
        rh = 22 + R() * 30;
      x.fillStyle = "rgba(40,30,20,.55)";
      x.beginPath();
      x.ellipse(px, py, rw + 4, rh + 5, 0, 0, 7);
      x.fill();
      const pg = x.createLinearGradient(px, py - rh, px, py + rh);
      pg.addColorStop(0, "#8fa3b8");
      pg.addColorStop(1, "#d79a6a");
      x.fillStyle = pg;
      x.globalAlpha = 0.75;
      x.beginPath();
      x.ellipse(px, py, rw, rh, 0, 0, 7);
      x.fill();
      x.globalAlpha = 1;
    }
    for (let i = 0; i < 900; i++) {
      const left = R() < 0.5,
        sx = left ? R() * 55 : W - R() * 55,
        sy = R() * H;
      x.strokeStyle = ["#5d7a2e", "#6f8c38", "#4a6424", "#879a45"][i % 4];
      x.lineWidth = 1.6;
      x.beginPath();
      x.moveTo(sx, sy);
      x.lineTo(sx + (R() - 0.5) * 6, sy - 6 - R() * 12);
      x.stroke();
    }
    for (let i = 0; i < 140; i++) {
      x.strokeStyle = "#5f7a30";
      x.lineWidth = 1.4;
      const sx = W / 2 - 22 + R() * 44,
        sy = R() * H;
      x.beginPath();
      x.moveTo(sx, sy);
      x.lineTo(sx + (R() - 0.5) * 4, sy - 4 - R() * 7);
      x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function treeTex(kind) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#3a2a1a";
  x.fillRect(60, 190, 8, 66);
  if (kind === 0) {
    for (let i = 0; i < 7; i++) {
      const y = 20 + i * 26,
        w = 18 + i * 10;
      const g = x.createLinearGradient(64 - w, 0, 64 + w, 0);
      g.addColorStop(0, "#1d2e18");
      g.addColorStop(0.6, "#2c4422");
      g.addColorStop(1, "#56663a");
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(64, y - 10);
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        x.lineTo(64 - w * t + (k % 2 ? 3 : -3), y + 30 * t);
      }
      x.lineTo(64 + w, y + 30);
      for (let k = 8; k >= 0; k--) {
        const t = k / 8;
        x.lineTo(64 + w * t + (k % 2 ? -3 : 3), y + 30 * t);
      }
      x.fill();
    }
  } else {
    const blob = (cx, cy, r, col) => {
      x.fillStyle = col;
      x.beginPath();
      for (let a = 0; a < 6.3; a += 0.3) {
        const rr = r * (0.85 + Math.random() * 0.2);
        x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      x.fill();
    };
    [[64, 110, 52, "#22361c"], [44, 120, 34, "#2a4222"], [86, 116, 36, "#2e4824"], [70, 84, 36, "#3a5428"], [90, 96, 22, "#5a6e36"]].forEach(b => blob(b[0], b[1], b[2], b[3]));
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}
function softTex(stops, size) {
  const c = document.createElement("canvas");
  c.width = c.height = size || 128;
  const x = c.getContext("2d"),
    s = c.width / 2;
  const g = x.createRadialGradient(s, s, 1, s, s, s);
  stops.forEach(st => g.addColorStop(st[0], st[1]));
  x.fillStyle = g;
  x.fillRect(0, 0, c.width, c.width);
  return new THREE.CanvasTexture(c);
}
function grassTex() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const x = c.getContext("2d");
  for (let i = 0; i < 14; i++) {
    const bx = 8 + Math.random() * 48,
      lean = (Math.random() - 0.5) * 26,
      hgt = 60 + Math.random() * 64;
    const g = x.createLinearGradient(0, 128, 0, 128 - hgt);
    g.addColorStop(0, "#1e2a14");
    g.addColorStop(0.55, ["#4a6224", "#5a7228", "#3e5620"][i % 3]);
    g.addColorStop(1, "#c9b45a");
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(bx - 2.2, 128);
    x.quadraticCurveTo(bx + lean * 0.3, 128 - hgt * 0.55, bx + lean, 128 - hgt);
    x.quadraticCurveTo(bx + lean * 0.3 + 1.5, 128 - hgt * 0.5, bx + 2.2, 128);
    x.fill();
  }
  return new THREE.CanvasTexture(c);
}
/* пасхалка: свой лесной бигфут (оригинальный рисунок) */
function bigfootTex(wave) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const x = c.getContext("2d");
  const fur = (pts, col) => {
    x.fillStyle = col;
    x.beginPath();
    pts.forEach((p, i) => {
      const jx = (Math.random() - 0.5) * 5,
        jy = (Math.random() - 0.5) * 5;
      i ? x.lineTo(p[0] + jx, p[1] + jy) : x.moveTo(p[0], p[1]);
    });
    x.closePath();
    x.fill();
  };
  const body = "#2a1d16",
    rim = "rgba(255,150,80,.55)";
  fur([[64, 22], [80, 28], [86, 48], [98, 62], [104, 100], [100, 140], [94, 160], [88, 210], [92, 246], [74, 248], [70, 206], [64, 172], [58, 206], [54, 248], [36, 246], [40, 210], [34, 160], [28, 140], [24, 100], [30, 62], [42, 48], [48, 28]], body);
  if (wave) fur([[98, 64], [112, 50], [118, 22], [124, 8], [114, 6], [106, 30], [96, 52]], body);else fur([[100, 66], [112, 100], [114, 140], [106, 150], [100, 112], [96, 80]], body);
  fur([[28, 66], [16, 100], [14, 140], [22, 150], [28, 112], [32, 80]], body);
  x.strokeStyle = rim;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(48, 28);
  x.lineTo(42, 48);
  x.lineTo(30, 62);
  x.lineTo(24, 100);
  x.lineTo(28, 140);
  x.lineTo(34, 160);
  x.stroke();
  x.strokeStyle = "rgba(255,180,120,.25)";
  x.lineWidth = 1;
  for (let i = 0; i < 160; i++) {
    const px = 30 + Math.random() * 70,
      py = 30 + Math.random() * 200;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + (Math.random() - 0.5) * 4, py + 6);
    x.stroke();
  }
  x.fillStyle = "#ffcc55";
  x.shadowColor = "#ffaa33";
  x.shadowBlur = 8;
  x.beginPath();
  x.arc(57, 40, 2.4, 0, 7);
  x.arc(71, 40, 2.4, 0, 7);
  x.fill();
  return new THREE.CanvasTexture(c);
}
function SpaceBG({
  kind
}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.THREE) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const T = THREE;
    let renderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "low-power"
      });
    } catch (e) {
      return;
    }
    if (!renderer.getContext()) return;
    const mobile = !(window.matchMedia && window.matchMedia("(hover: hover)").matches);
    renderer.setPixelRatio(mobile ? 0.85 : 1);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.72;
    el.appendChild(renderer.domElement);
    document.documentElement.classList.add("has-space3d");
    el.className = "space3d sunset";
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(52, 1, 0.1, 400);
    const FOG = 0x5a3442;
    scene.fog = new T.Fog(FOG, 25, 175);
    const hemi = new T.HemisphereLight(0x6e5a8a, 0x2a1e18, 0.5),
      sunL = new T.DirectionalLight(0xff9a50, 1.5);
    scene.add(hemi);
    scene.add(sunL);
    scene.add(sunL.target);
    /* небо-купол */
    const sunDir = new T.Vector3(0, 0.075, -1).normalize();
    const skyMat = new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        sunDir: {
          value: sunDir
        },
        top: {
          value: new T.Color(0x070914)
        },
        mid: {
          value: new T.Color(0x2a1d40)
        },
        hor: {
          value: new T.Color(0xd2603a)
        },
        sunC: {
          value: new T.Color(0xffc070)
        }
      },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform vec3 sunDir, top, mid, hor, sunC; varying vec3 vP; void main(){ float h = vP.y; float d = max(dot(normalize(vP), sunDir), 0.0);" + "vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.15, 0.6, h)); c = mix(c, hor * 0.35, smoothstep(0.0, -0.08, h));" + "c += sunC * (pow(d, 900.0) * 6.0 + pow(d, 60.0) * 0.6 + pow(d, 8.0) * 0.22) + hor * exp(-abs(h) * 14.0) * pow(d, 3.0) * 0.6; gl_FragColor = vec4(c, 1.0); }"
    });
    const sky = new T.Mesh(new T.SphereGeometry(300, 48, 24), skyMat);
    scene.add(sky);
    const NS = 500,
      sp = new Float32Array(NS * 3);
    for (let i = 0; i < NS; i++) {
      const th = Math.random() * Math.PI * 2,
        ph = 0.18 + Math.random() * 1.3,
        r = 280;
      sp[i * 3] = Math.cos(th) * Math.cos(ph) * r;
      sp[i * 3 + 1] = Math.sin(ph) * r;
      sp[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * r;
    }
    const sGeo = new T.BufferGeometry();
    sGeo.setAttribute("position", new T.BufferAttribute(sp, 3));
    const stars = new T.Points(sGeo, new T.PointsMaterial({
      color: 0xfff4e0,
      size: 1.4,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.75,
      fog: false,
      depthWrite: false
    }));
    scene.add(stars);
    /* хребты гор с воздушной перспективой */
    const ridges = new T.Group();
    scene.add(ridges);
    const fbm = (x, k) => {
      let v = 0,
        a = 1,
        f = 1;
      for (let o = 0; o < 5; o++) {
        v += a * Math.sin(x * f * 0.013 + k * 7.1 + o * 1.7) * Math.sin(x * f * 0.0071 + o * 2.3 + k);
        a *= 0.5;
        f *= 2.1;
      }
      return v;
    };
    [[150, 3, 7, 0x120d18, 0x3a2030], [175, 4.5, 9, 0x1e1424, 0x5a2a34], [205, 6, 11, 0x33202e, 0x8a3e3a], [240, 7.5, 12, 0x55303a, 0xb85a42]].forEach((r, k) => {
      const N = 180,
        pos = [],
        col = [],
        idx = [],
        cb = new T.Color(r[3]),
        ct = new T.Color(r[4]);
      for (let i = 0; i <= N; i++) {
        const x = -420 + i * 840 / N,
          hh = r[1] + fbm(x, k) * r[2] * 0.5 + Math.abs(fbm(x * 1.7, k + 3)) * r[2] * 0.4;
        pos.push(x, hh, -r[0], x, -6, -r[0]);
        const rim = Math.max(0, 1 - Math.abs(x) / 260);
        const tc = cb.clone().lerp(ct, 0.35 + rim * 0.65);
        col.push(tc.r, tc.g, tc.b, cb.r, cb.g, cb.b);
        if (i < N) {
          const a = i * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      const m = new T.Mesh(g, new T.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        side: T.DoubleSide
      }));
      m.renderOrder = -1 - k;
      ridges.add(m);
    });
    const curveX = s => Math.sin(s * 0.011) * 16 + Math.sin(s * 0.029 + 1.3) * 6,
      hillY = s => Math.sin(s * 0.016) * 2.2 + Math.sin(s * 0.041 + 0.7) * 0.8;
    const LEN = 200,
      SEG = 200,
      RW = kind === "asphalt" ? 4.6 : 3.8;
    /* дорога */
    const rPos = new Float32Array((SEG + 1) * 2 * 3),
      rUv = new Float32Array((SEG + 1) * 2 * 2),
      rIdx = [];
    for (let i = 0; i < SEG; i++) {
      const a = i * 2;
      rIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const rGeo = new T.BufferGeometry();
    rGeo.setAttribute("position", new T.BufferAttribute(rPos, 3));
    rGeo.setAttribute("uv", new T.BufferAttribute(rUv, 2));
    rGeo.setIndex(rIdx);
    const roadTex = roadTexture(kind);
    roadTex.encoding = T.sRGBEncoding;
    const road = new T.Mesh(rGeo, new T.MeshStandardMaterial({
      map: roadTex,
      bumpMap: roadTex,
      bumpScale: 0.03,
      roughness: kind === "asphalt" ? 0.78 : 0.95,
      metalness: 0
    }));
    scene.add(road);
    /* местность */
    const NX = 60,
      NZ = 64,
      tPos = new Float32Array((NX + 1) * (NZ + 1) * 3),
      tCol = new Float32Array((NX + 1) * (NZ + 1) * 3),
      tIdx = [];
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i,
        b = a + 1,
        c2 = a + NX + 1,
        d = c2 + 1;
      tIdx.push(a, b, c2, b, d, c2);
    }
    const tGeo = new T.BufferGeometry();
    tGeo.setAttribute("position", new T.BufferAttribute(tPos, 3));
    tGeo.setAttribute("color", new T.BufferAttribute(tCol, 3));
    tGeo.setIndex(tIdx);
    scene.add(new T.Mesh(tGeo, new T.MeshLambertMaterial({
      vertexColors: true,
      side: T.DoubleSide
    })));
    const nz = (a, b) => Math.sin(a * 1.7 + b * 0.9) * 0.5 + Math.sin(a * 0.63 - b * 1.31) * 0.35 + Math.sin(a * 2.9 + b * 2.3) * 0.15;
    const cNear = new T.Color(kind === "asphalt" ? 0x34421f : 0x3c4c1e),
      cDry = new T.Color(0x5a5230),
      cFar = new T.Color(0x2a2230),
      cVerge = new T.Color(kind === "asphalt" ? 0x4a4842 : 0x5e4c34),
      ctmp = new T.Color();
    /* деревья, трава, столбики */
    const hash = i => {
      const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    const NT = mobile ? 80 : 140,
      treeMats = [new T.SpriteMaterial({
        map: treeTex(0),
        transparent: true,
        alphaTest: 0.3,
        color: 0x6e5c56
      }), new T.SpriteMaterial({
        map: treeTex(1),
        transparent: true,
        alphaTest: 0.3,
        color: 0x6e5c56
      })];
    const trees = [];
    for (let i = 0; i < NT; i++) {
      const s2 = new T.Sprite(treeMats[i % 3 === 0 ? 1 : 0]);
      scene.add(s2);
      trees.push(s2);
    }
    const NG = mobile ? 900 : 2400,
      grass = new T.InstancedMesh(new T.PlaneGeometry(0.6, 0.5).translate(0, 0.25, 0), new T.MeshLambertMaterial({
        map: grassTex(),
        transparent: true,
        alphaTest: 0.35,
        side: T.DoubleSide,
        color: 0xb89a88
      }), NG);
    scene.add(grass);
    const NP = 40,
      posts = new T.InstancedMesh(kind === "asphalt" ? new T.BoxGeometry(0.1, 0.9, 0.1) : new T.CylinderGeometry(0.06, 0.08, 1, 6), new T.MeshLambertMaterial({
        color: kind === "asphalt" ? 0xd9d6cc : 0x5a4026
      }), NP * 2);
    scene.add(posts);
    const refl = new T.InstancedMesh(new T.BoxGeometry(0.11, 0.12, 0.11), new T.MeshBasicMaterial({
      color: 0xff8a2a
    }), NP * 2);
    if (kind === "asphalt") scene.add(refl);
    /* солнце, блики, облака, пыль */
    const sun = new T.Sprite(new T.SpriteMaterial({
      map: softTex([[0, "rgba(255,252,235,1)"], [0.1, "rgba(255,230,160,1)"], [0.3, "rgba(255,160,70,.45)"], [1, "rgba(255,110,40,0)"]], 256),
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: T.AdditiveBlending
    }));
    sun.scale.set(70, 70, 1);
    scene.add(sun);
    const flareTex = softTex([[0, "rgba(255,200,140,.5)"], [0.6, "rgba(255,160,90,.15)"], [1, "rgba(255,160,90,0)"]], 64);
    const flares = [0.35, 0.6, 0.85].map((k, i) => {
      const f = new T.Sprite(new T.SpriteMaterial({
        map: flareTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        fog: false,
        blending: T.AdditiveBlending,
        opacity: 0.5
      }));
      f.userData.k = k;
      f.userData.s = [6, 3, 9][i];
      scene.add(f);
      return f;
    });
    const cloudC = document.createElement("canvas");
    cloudC.width = 256;
    cloudC.height = 128;
    const ccx = cloudC.getContext("2d");
    for (let i = 0; i < 40; i++) {
      const g = ccx.createRadialGradient(0, 0, 0, 0, 0, 1);
      const cx = 30 + Math.random() * 196,
        cy = 50 + Math.random() * 40,
        r = 14 + Math.random() * 30;
      const gg = ccx.createRadialGradient(cx, cy, 1, cx, cy, r);
      gg.addColorStop(0, "rgba(255,255,255,.35)");
      gg.addColorStop(1, "rgba(255,255,255,0)");
      ccx.fillStyle = gg;
      ccx.fillRect(0, 0, 256, 128);
    }
    const cloudTex = new T.CanvasTexture(cloudC);
    const clouds = [];
    for (let i = 0; i < 10; i++) {
      const cs = new T.Sprite(new T.SpriteMaterial({
        map: cloudTex,
        transparent: true,
        depthWrite: false,
        fog: false,
        color: 0xff9a80,
        opacity: 0.55
      }));
      cs.scale.set(70 + hash(i) * 60, 20 + hash(i + 9) * 14, 1);
      cs.userData = {
        x: -200 + i * 45 + hash(i) * 20,
        y: 18 + hash(i + 3) * 26,
        z: -230
      };
      scene.add(cs);
      clouds.push(cs);
    }
    const ND = mobile ? 70 : 140,
      dPos = new Float32Array(ND * 3);
    for (let i = 0; i < ND; i++) {
      dPos[i * 3] = (hash(i) - 0.5) * 20;
      dPos[i * 3 + 1] = hash(i + 50) * 5;
      dPos[i * 3 + 2] = -hash(i + 99) * 40;
    }
    const dGeo = new T.BufferGeometry();
    dGeo.setAttribute("position", new T.BufferAttribute(dPos, 3));
    scene.add(new T.Points(dGeo, new T.PointsMaterial({
      map: softTex([[0, "rgba(255,255,255,1)"], [1, "rgba(255,255,255,0)"]], 32),
      color: 0xffd0a0,
      size: 0.08,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      opacity: 0.75
    })));
    const bfTex = [bigfootTex(false), bigfootTex(true)],
      bf = new T.Sprite(new T.SpriteMaterial({
        map: bfTex[0],
        transparent: true,
        alphaTest: 0.2,
        color: 0xe0c4b4
      }));
    bf.visible = false;
    scene.add(bf);
    let bfNext = 25 + Math.random() * 30,
      bfS = 0,
      bfOn = false;
    window.mhBigfoot = () => {
      bfNext = 0;
    };
    window.mhBigfootState = () => ({
      on: bfOn,
      d: Math.round(bfS - travel),
      next: Math.round(bfNext)
    });
    const dum = new T.Object3D();
    let w = 0,
      h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);
    let travel = 0,
      lastY = window.scrollY,
      mx = 0,
      my = 0,
      raf = 0,
      last = performance.now(),
      acc = 0,
      bob = 0,
      tsec = 0;
    const pm = e => {
      mx = e.clientX / w - 0.5;
      my = e.clientY / h - 0.5;
    };
    window.addEventListener("pointermove", pm, {
      passive: true
    });
    const toW = (s, lat) => [curveX(s) - curveX(travel) + lat, hillY(s) - hillY(travel), -(s - travel)];
    function groundY(s, lat) {
      const f = Math.min(70, Math.max(0, Math.abs(lat) - RW / 2 - 0.8));
      return hillY(s) - hillY(travel) + f * f * 0.0035 + nz(s * 0.035, lat * 0.06) * Math.min(f, 30) * 0.09 - Math.min(f, 1.2) * 0.1;
    }
    const v3 = new T.Vector3();
    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      acc += dt;
      if (document.hidden || acc < 1 / 30) return;
      const step = acc;
      acc = 0;
      tsec += step;
      const sy = window.scrollY,
        ds = Math.abs(sy - lastY);
      lastY = sy;
      const v = 9 + Math.min(45, ds * 1.3);
      travel += v * step;
      bob += step * (2.2 + v * 0.12);
      for (let i = 0; i <= SEG; i++) {
        const d = i / SEG * LEN,
          s = travel + d,
          cx = curveX(s) - curveX(travel),
          cy = hillY(s) - hillY(travel) + 0.02,
          dx = curveX(s + 1) - curveX(s),
          ox = RW / 2 / Math.hypot(dx, 1);
        rPos.set([cx - ox, cy, -d, cx + ox, cy, -d], i * 6);
        rUv.set([0, s / 4, 1, s / 4], i * 4);
      }
      rGeo.attributes.position.needsUpdate = true;
      rGeo.attributes.uv.needsUpdate = true;
      rGeo.computeVertexNormals();
      rGeo.computeBoundingSphere();
      for (let j = 0; j <= NZ; j++) {
        const d = Math.pow(j / NZ, 1.3) * LEN,
          s = travel + d;
        for (let i = 0; i <= NX; i++) {
          const lat = (i / NX - 0.5) * 2 * (36 + d * 0.55),
            k = (j * (NX + 1) + i) * 3,
            p = toW(s, lat);
          tPos[k] = p[0];
          tPos[k + 1] = groundY(s, lat);
          tPos[k + 2] = p[2];
          const f = Math.max(0, Math.abs(lat) - RW / 2),
            m = Math.min(1, f / 45 + d / LEN * 0.7),
            dry = 0.5 + nz(s * 0.05, lat * 0.11) * 0.5;
          ctmp.copy(f < 1.4 ? cVerge : cNear).lerp(cDry, f < 1.4 ? 0 : dry * 0.45).lerp(cFar, m);
          tCol[k] = ctmp.r;
          tCol[k + 1] = ctmp.g;
          tCol[k + 2] = ctmp.b;
        }
      }
      tGeo.attributes.position.needsUpdate = true;
      tGeo.attributes.color.needsUpdate = true;
      tGeo.computeVertexNormals();
      tGeo.computeBoundingSphere();
      const span = 200;
      for (let i = 0; i < NT; i++) {
        let d = (i * (span / NT) - travel) % span;
        if (d < 0) d += span;
        const s2 = travel + d,
          side = hash(i) < 0.5 ? -1 : 1,
          lat = side * (RW / 2 + 5 + hash(i + 7) * 30),
          sc = 3 + hash(i + 3) * 4;
        const p = toW(s2, lat),
          gy = groundY(s2, lat);
        trees[i].position.set(p[0], gy + sc * 0.95, p[2]);
        trees[i].scale.set(sc * 0.55, sc * 2, 1);
      }
      const gspan = 70;
      for (let i = 0; i < NG; i++) {
        let d = (hash(i) * gspan - travel) % gspan;
        if (d < 0) d += gspan;
        const s2 = travel + d + 1.5,
          side = hash(i + 13) < 0.5 ? -1 : 1,
          lat = side * (RW / 2 + 0.15 + Math.pow(hash(i + 29), 1.6) * 9),
          sc = 0.5 + hash(i + 41) * 0.6;
        const p = toW(s2, lat);
        dum.position.set(p[0], groundY(s2, lat) - 0.05, p[2]);
        dum.rotation.set(0, hash(i) * 3.14, Math.sin(tsec * 1.8 + i * 0.37) * 0.12);
        dum.scale.set(sc, sc * (0.8 + hash(i + 3) * 0.6), sc);
        dum.updateMatrix();
        grass.setMatrixAt(i, dum.matrix);
      }
      grass.instanceMatrix.needsUpdate = true;
      dum.rotation.set(0, 0, 0);
      dum.scale.set(1, 1, 1);
      for (let i = 0; i < NP; i++) {
        let d = (i * 5 - travel) % (NP * 5);
        if (d < 0) d += NP * 5;
        const s2 = travel + d;
        [-1, 1].forEach((sd, k) => {
          const lat = sd * (RW / 2 + 0.5),
            p = toW(s2, lat),
            gy = groundY(s2, lat);
          dum.position.set(p[0], gy + 0.45, p[2]);
          dum.updateMatrix();
          posts.setMatrixAt(i * 2 + k, dum.matrix);
          dum.position.y = gy + 0.78;
          dum.updateMatrix();
          refl.setMatrixAt(i * 2 + k, dum.matrix);
        });
      }
      posts.instanceMatrix.needsUpdate = true;
      refl.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < ND; i++) {
        dPos[i * 3 + 2] += v * step * 0.6;
        dPos[i * 3 + 1] += Math.sin(t * 0.001 + i) * 0.003;
        if (dPos[i * 3 + 2] > 4) {
          dPos[i * 3 + 2] = -40;
          dPos[i * 3] = (hash(i + t) - 0.5) * 20;
        }
      }
      dGeo.attributes.position.needsUpdate = true;
      const ahead = 42,
        ax = curveX(travel + ahead) - curveX(travel),
        ay = hillY(travel + ahead) - hillY(travel);
      const gx = parseFloat(document.documentElement.style.getPropertyValue("--gx")) || 0,
        gy = parseFloat(document.documentElement.style.getPropertyValue("--gy")) || 0;
      const tx = (mx + gx * 0.5) * 1.4,
        ty = 2.3 + Math.sin(bob) * 0.025 - (my + gy * 0.5) * 0.45;
      camera.position.x += (tx - camera.position.x) * 0.05;
      camera.position.y += (ty - camera.position.y) * 0.08;
      camera.position.z = 0;
      camera.lookAt(ax * 0.9 + camera.position.x * 0.2, ay + 1.1, -ahead);
      sky.position.copy(camera.position);
      stars.position.copy(camera.position);
      ridges.position.set(camera.position.x * 0.9, 0, 0);
      sunDir.set(ax * 0.004, 0.075, -1).normalize();
      const sunPos = v3.copy(sunDir).multiplyScalar(250).add(camera.position);
      sun.position.copy(sunPos);
      sunL.position.copy(sunPos);
      sunL.target.position.set(0, 0, -20);
      const sp2 = sunPos.clone().project(camera);
      flares.forEach(f => {
        const k = f.userData.k,
          ndc = new T.Vector3(sp2.x * (1 - 2 * k), sp2.y * (1 - 2 * k), 0.5).unproject(camera);
        f.position.copy(ndc);
        const dd = camera.position.distanceTo(ndc);
        f.scale.setScalar(dd * 0.012 * f.userData.s);
      });
      clouds.forEach((c, i) => {
        c.userData.x += step * (0.8 + hash(i));
        if (c.userData.x > 240) c.userData.x = -240;
        c.position.set(camera.position.x + c.userData.x + ax * 0.3, c.userData.y, c.userData.z);
      });
      stars.material.opacity = 0.6 + Math.sin(tsec * 1.3) * 0.1;
      /* бигфут у правой обочины */
      bfNext -= step;
      if (!bfOn && bfNext <= 0) {
        bfOn = true;
        bfS = travel + 55;
      }
      if (bfOn) {
        const d = bfS - travel;
        if (d < -3) {
          bfOn = false;
          bf.visible = false;
          bfNext = 45 + Math.random() * 40;
        } else {
          const lat = RW / 2 + 3.2,
            p = toW(bfS, lat),
            gyb = groundY(bfS, lat);
          bf.visible = true;
          bf.position.set(p[0], gyb + 1.45, p[2]);
          bf.scale.set(1.5, 3, 1);
          bf.material.map = bfTex[d < 32 && Math.floor(tsec * 2.5) % 2 ? 1 : 0];
        }
      }
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pm);
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
      renderer.dispose();
      document.documentElement.classList.remove("has-space3d");
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [kind]);
  return /*#__PURE__*/React.createElement("div", {
    className: "space3d",
    ref: ref,
    "aria-hidden": "true"
  });
}
/* ===== Иллюстрации к инструкциям ===== */
const FG = {
  ink: "#2a2e33",
  mid: "#6b737b",
  metal: "#cfd4d8",
  metal2: "#aeb5bc",
  brass: "#d4ad58",
  yel: "#E5E7EB",
  red: "#d9452f",
  blue: "#3c7bd9",
  rub: "#3a3e43",
  paper: "#f6f3ec",
  green: "#2f8a4f"
};
function Num({
  x,
  y,
  n
}) {
  return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: x,
    cy: y,
    r: "9",
    fill: FG.yel,
    stroke: FG.ink,
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("text", {
    x: x,
    y: y + 4,
    textAnchor: "middle",
    fontSize: "11",
    fontWeight: "700",
    fill: FG.ink
  }, n));
}
function Lead({
  x1,
  y1,
  x2,
  y2
}) {
  return /*#__PURE__*/React.createElement("line", {
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    stroke: FG.mid,
    strokeWidth: "1",
    strokeDasharray: "3 2"
  });
}
function Txt({
  x,
  y,
  t,
  a,
  s,
  c,
  w
}) {
  return /*#__PURE__*/React.createElement("text", {
    x: x,
    y: y,
    textAnchor: a || "start",
    fontSize: s || 11,
    fontWeight: w || 600,
    fill: c || FG.ink
  }, t);
}
function Arrow({
  x1,
  y1,
  x2,
  y2,
  c
}) {
  const a = Math.atan2(y2 - y1, x2 - x1),
    h = 7;
  return /*#__PURE__*/React.createElement("g", {
    stroke: c || FG.red,
    strokeWidth: "2",
    fill: c || FG.red
  }, /*#__PURE__*/React.createElement("line", {
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2
  }), /*#__PURE__*/React.createElement("path", {
    d: "M" + x2 + "," + y2 + " L" + (x2 - h * Math.cos(a - 0.4)) + "," + (y2 - h * Math.sin(a - 0.4)) + " L" + (x2 - h * Math.cos(a + 0.4)) + "," + (y2 - h * Math.sin(a + 0.4)) + " Z"
  }));
}
function Screw({
  x,
  y,
  l,
  dir
}) {
  const s = [];
  for (let i = 0; i < 6; i++) s.push(/*#__PURE__*/React.createElement("line", {
    key: i,
    x1: x + (dir || 1) * (8 + i * (l - 10) / 6),
    y1: y - 5,
    x2: x + (dir || 1) * (12 + i * (l - 10) / 6),
    y2: y + 5,
    stroke: FG.mid,
    strokeWidth: "1"
  }));
  return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: dir === -1 ? x - l : x,
    y: y - 5,
    width: l,
    height: "10",
    rx: "2",
    fill: FG.metal,
    stroke: FG.ink
  }), s, /*#__PURE__*/React.createElement("rect", {
    x: dir === -1 ? x - l - 8 : x + l,
    y: y - 8,
    width: "8",
    height: "16",
    rx: "2",
    fill: FG.metal2,
    stroke: FG.ink
  }));
}
const FIGS = {
  carb: {
    title: "Карбюратор в разобранном виде",
    legend: ["Крышка", "Пружина золотника", "Золотник (дроссель)", "Игла с клипсой", "Корпус", "Подсос (обогатитель)", "Распылитель", "Главный жиклёр", "Холостой жиклёр", "Винт качества смеси", "Игольчатый клапан", "Поплавок", "Поплавковая камера", "Упорный винт холостых"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "58",
      y: "14",
      width: "54",
      height: "14",
      rx: "4",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 40,
      y: 21,
      n: 1
    }), /*#__PURE__*/React.createElement("path", {
      d: "M85,32 l-8,4 l16,4 l-16,4 l16,4 l-16,4 l16,4 l-8,4",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "1.6"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 40,
      y: 50,
      n: 2
    }), /*#__PURE__*/React.createElement("rect", {
      x: "66",
      y: "68",
      width: "38",
      height: "36",
      rx: "4",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M66,96 L104,92 L104,104 L66,104 Z",
      fill: FG.metal2
    }), /*#__PURE__*/React.createElement(Num, {
      x: 40,
      y: 86,
      n: 3
    }), /*#__PURE__*/React.createElement("line", {
      x1: "85",
      y1: "104",
      x2: "85",
      y2: "152",
      stroke: FG.ink,
      strokeWidth: "2.4"
    }), [110, 114, 118, 122, 126].map(y => /*#__PURE__*/React.createElement("line", {
      key: y,
      x1: "81",
      y1: y,
      x2: "89",
      y2: y,
      stroke: FG.ink
    })), /*#__PURE__*/React.createElement("rect", {
      x: "79",
      y: "116",
      width: "12",
      height: "4",
      rx: "1",
      fill: FG.red
    }), /*#__PURE__*/React.createElement(Num, {
      x: 40,
      y: 130,
      n: 4
    }), /*#__PURE__*/React.createElement(Lead, {
      x1: 49,
      y1: 130,
      x2: 80,
      y2: 130
    }), /*#__PURE__*/React.createElement("rect", {
      x: "128",
      y: "72",
      width: "124",
      height: "58",
      rx: "8",
      fill: FG.metal,
      stroke: FG.ink,
      strokeWidth: "1.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "190",
      cy: "101",
      r: "21",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "116",
      y: "89",
      width: "14",
      height: "24",
      rx: "3",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "250",
      y: "89",
      width: "14",
      height: "24",
      rx: "3",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 190,
      y: 62,
      n: 5
    }), /*#__PURE__*/React.createElement("rect", {
      x: "140",
      y: "50",
      width: "22",
      height: "22",
      rx: "3",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M151,50 l0,-12 l18,-6",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 130,
      y: 40,
      n: 6
    }), /*#__PURE__*/React.createElement("rect", {
      x: "185",
      y: "140",
      width: "10",
      height: "20",
      rx: "2",
      fill: FG.brass,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 176,
      y: 150,
      n: 7
    }), /*#__PURE__*/React.createElement("polygon", {
      points: "184,164 196,164 199,170 196,176 184,176 181,170",
      fill: FG.brass,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 210,
      y: 170,
      n: 8
    }), /*#__PURE__*/React.createElement("rect", {
      x: "221",
      y: "138",
      width: "6",
      height: "26",
      rx: "2",
      fill: FG.brass,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 240,
      y: 146,
      n: 9
    }), /*#__PURE__*/React.createElement(Screw, {
      x: 268,
      y: 118,
      l: 34
    }), /*#__PURE__*/React.createElement("path", {
      d: "M276,112 l4,12 l4,-12 l4,12 l4,-12",
      fill: "none",
      stroke: FG.mid
    }), /*#__PURE__*/React.createElement(Num, {
      x: 320,
      y: 118,
      n: 10
    }), /*#__PURE__*/React.createElement("path", {
      d: "M156,140 L164,140 L160,158 Z",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 140,
      y: 150,
      n: 11
    }), /*#__PURE__*/React.createElement("rect", {
      x: "142",
      y: "180",
      width: "30",
      height: "16",
      rx: "7",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "206",
      y: "180",
      width: "30",
      height: "16",
      rx: "7",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("line", {
      x1: "172",
      y1: "188",
      x2: "206",
      y2: "188",
      stroke: FG.ink,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 256,
      y: 188,
      n: 12
    }), /*#__PURE__*/React.createElement("path", {
      d: "M132,202 L132,222 Q132,226 136,226 L244,226 Q248,226 248,222 L248,202",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "1.6"
    }), [136, 244].map(x => /*#__PURE__*/React.createElement("circle", {
      key: x,
      cx: x,
      cy: "204",
      r: "3",
      fill: FG.metal2,
      stroke: FG.ink
    })), /*#__PURE__*/React.createElement(Num, {
      x: 268,
      y: 214,
      n: 13
    }), /*#__PURE__*/React.createElement(Screw, {
      x: 268,
      y: 84,
      l: 30
    }), /*#__PURE__*/React.createElement("rect", {
      x: "298",
      y: "76",
      width: "14",
      height: "16",
      rx: "2",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 330,
      y: 84,
      n: 14
    }))
  },
  float: {
    title: "Замер уровня поплавка",
    legend: ["Плоскость корпуса (без прокладки)", "Поплавок", "Язычок — его подгибают", "Игольчатый клапан", "Высота H — уровень поплавка"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "60",
      y: "40",
      width: "240",
      height: "40",
      rx: "6",
      fill: FG.metal,
      stroke: FG.ink,
      strokeWidth: "1.4"
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 180,
      y: 30,
      t: "\u043A\u0430\u0440\u0431\u044E\u0440\u0430\u0442\u043E\u0440 \u043F\u0435\u0440\u0435\u0432\u0451\u0440\u043D\u0443\u0442",
      a: "middle",
      c: FG.mid,
      w: 500
    }), /*#__PURE__*/React.createElement(Num, {
      x: 44,
      y: 60,
      n: 1
    }), /*#__PURE__*/React.createElement("line", {
      x1: "60",
      y1: "80",
      x2: "300",
      y2: "80",
      stroke: FG.blue,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "110",
      y: "120",
      width: "50",
      height: "40",
      rx: "12",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "200",
      y: "120",
      width: "50",
      height: "40",
      rx: "12",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("line", {
      x1: "160",
      y1: "140",
      x2: "200",
      y2: "140",
      stroke: FG.ink,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 270,
      y: 140,
      n: 2
    }), /*#__PURE__*/React.createElement("path", {
      d: "M176,140 L176,96 L186,92",
      fill: "none",
      stroke: FG.brass,
      strokeWidth: "3"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 200,
      y: 104,
      n: 3
    }), /*#__PURE__*/React.createElement("path", {
      d: "M182,80 L192,80 L187,92 Z",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 215,
      y: 88,
      n: 4
    }), /*#__PURE__*/React.createElement(Lead, {
      x1: 206,
      y1: 88,
      x2: 193,
      y2: 86
    }), /*#__PURE__*/React.createElement("line", {
      x1: "90",
      y1: "80",
      x2: "90",
      y2: "160",
      stroke: FG.red,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "84",
      y1: "160",
      x2: "110",
      y2: "160",
      stroke: FG.red,
      strokeWidth: "1.5",
      strokeDasharray: "3 2"
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 90,
      y1: 118,
      x2: 90,
      y2: 82
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 90,
      y1: 122,
      x2: 90,
      y2: 158
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 98,
      y: 124,
      t: "H",
      c: FG.red,
      s: 14,
      w: 800
    }), /*#__PURE__*/React.createElement(Num, {
      x: 70,
      y: 190,
      n: 5
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 120,
      y: 186,
      t: "PZ19\u201327: 12\u201314 \u043C\u043C \xB7 PE/PZ30: 13\u201315 \u043C\u043C",
      c: FG.ink,
      s: 10,
      w: 600
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 120,
      y: 200,
      t: "PWK: 7\u20139 \u043C\u043C",
      c: FG.ink,
      s: 10,
      w: 600
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 120,
      y: 216,
      t: "\u042F\u0437\u044B\u0447\u043E\u043A \u0432\u0432\u0435\u0440\u0445 \u2192 \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u043D\u0438\u0436\u0435, \u0431\u0435\u0434\u043D\u0435\u0435",
      c: FG.mid,
      s: 10,
      w: 500
    }))
  },
  needle: {
    title: "Игла: положение клипсы",
    legend: ["Золотник", "Канавки иглы 1–5 (считаем сверху)", "Клипса", "Распылитель", "Клипса выше — игла ниже — беднее", "Клипса ниже — игла выше — богаче"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "140",
      y: "20",
      width: "80",
      height: "60",
      rx: "6",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 124,
      y: 36,
      n: 1
    }), /*#__PURE__*/React.createElement("line", {
      x1: "180",
      y1: "44",
      x2: "180",
      y2: "190",
      stroke: FG.ink,
      strokeWidth: "3"
    }), [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("line", {
      x1: "173",
      y1: 46 + i * 8,
      x2: "187",
      y2: 46 + i * 8,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 196,
      y: 50 + i * 8,
      t: String(i),
      s: 9,
      c: FG.mid
    }))), /*#__PURE__*/React.createElement(Num, {
      x: 232,
      y: 60,
      n: 2
    }), /*#__PURE__*/React.createElement("rect", {
      x: "170",
      y: "68",
      width: "20",
      height: "5",
      rx: "1.5",
      fill: FG.red
    }), /*#__PURE__*/React.createElement(Num, {
      x: 150,
      y: 98,
      n: 3
    }), /*#__PURE__*/React.createElement(Lead, {
      x1: 159,
      y1: 95,
      x2: 172,
      y2: 73
    }), /*#__PURE__*/React.createElement("rect", {
      x: "170",
      y: "160",
      width: "20",
      height: "40",
      rx: "3",
      fill: FG.brass,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 208,
      y: 180,
      n: 4
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 70,
      y1: 90,
      x2: 70,
      y2: 50,
      c: FG.blue
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 40,
      y: 110,
      t: "\u043A\u043B\u0438\u043F\u0441\u0430",
      s: 10
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 40,
      y: 122,
      t: "\u0432\u044B\u0448\u0435 \u2192",
      s: 10
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 40,
      y: 134,
      t: "\u0431\u0435\u0434\u043D\u0435\u0435",
      s: 10,
      c: FG.blue,
      w: 800
    }), /*#__PURE__*/React.createElement(Num, {
      x: 96,
      y: 70,
      n: 5
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 300,
      y1: 50,
      x2: 300,
      y2: 90,
      c: FG.red
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 270,
      y: 110,
      t: "\u043A\u043B\u0438\u043F\u0441\u0430",
      s: 10
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 270,
      y: 122,
      t: "\u043D\u0438\u0436\u0435 \u2192",
      s: 10
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 270,
      y: 134,
      t: "\u0431\u043E\u0433\u0430\u0447\u0435",
      s: 10,
      c: FG.red,
      w: 800
    }), /*#__PURE__*/React.createElement(Num, {
      x: 276,
      y: 70,
      n: 6
    }))
  },
  spark: {
    title: "Свеча: зазор и цвет",
    legend: ["Центральный электрод", "Боковой электрод", "Щуп — проходит с лёгким усилием", "Белая — бедная смесь, перегрев", "Светло-коричневая — норма", "Чёрная сухая — богато; мокрая — залило"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "40",
      y: "30",
      width: "60",
      height: "30",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "52",
      y: "60",
      width: "36",
      height: "40",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "66",
      y: "100",
      width: "8",
      height: "40",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 24,
      y: 120,
      n: 1
    }), /*#__PURE__*/React.createElement(Lead, {
      x1: 33,
      y1: 120,
      x2: 66,
      y2: 125
    }), /*#__PURE__*/React.createElement("path", {
      d: "M100,60 L120,60 L120,150 L80,150",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "5"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 136,
      y: 110,
      n: 2
    }), /*#__PURE__*/React.createElement("rect", {
      x: "40",
      y: "141",
      width: "70",
      height: "5",
      fill: FG.yel,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 24,
      y: 160,
      n: 3
    }), /*#__PURE__*/React.createElement(Lead, {
      x1: 33,
      y1: 158,
      x2: 44,
      y2: 145
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 45,
      y: 185,
      t: "\u0437\u0430\u0437\u043E\u0440 0.6\u20130.9 \u043C\u043C",
      s: 11
    }), [["#efe8dc", 4, "белая"], ["#b98a52", 5, "норма"], ["#2b2b2b", 6, "чёрная"]].map((c, i) => /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("circle", {
      cx: 210 + i * 50,
      cy: "90",
      r: "20",
      fill: c[0],
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("circle", {
      cx: 210 + i * 50,
      cy: "90",
      r: "6",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 210 + i * 50,
      y: 128,
      t: c[2],
      a: "middle",
      s: 10
    }), /*#__PURE__*/React.createElement(Num, {
      x: 210 + i * 50,
      y: 60,
      n: c[1]
    }))))
  },
  valve: {
    title: "Регулировка зазора клапана",
    legend: ["Кулачок распредвала (затылок к коромыслу)", "Коромысло", "Контргайка", "Регулировочный винт", "Щуп между винтом и стержнем клапана", "Клапан с пружиной"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "90",
      cy: "60",
      r: "28",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M70,40 Q90,10 110,40",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 44,
      y: 40,
      n: 1
    }), /*#__PURE__*/React.createElement("path", {
      d: "M80,92 L240,108 L242,124 L82,108 Z",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "150",
      cy: "108",
      r: "7",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 150,
      y: 140,
      n: 2
    }), /*#__PURE__*/React.createElement("rect", {
      x: "226",
      y: "78",
      width: "22",
      height: "12",
      rx: "2",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 276,
      y: 78,
      n: 3
    }), /*#__PURE__*/React.createElement(Lead, {
      x1: 267,
      y1: 80,
      x2: 248,
      y2: 84
    }), /*#__PURE__*/React.createElement("rect", {
      x: "232",
      y: "90",
      width: "10",
      height: "44",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("line", {
      x1: "237",
      y1: "70",
      x2: "237",
      y2: "78",
      stroke: FG.ink,
      strokeWidth: "3"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 276,
      y: 110,
      n: 4
    }), /*#__PURE__*/React.createElement("rect", {
      x: "215",
      y: "135",
      width: "50",
      height: "4",
      fill: FG.yel,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 290,
      y: 140,
      n: 5
    }), /*#__PURE__*/React.createElement(Lead, {
      x1: 281,
      y1: 140,
      x2: 265,
      y2: 137
    }), /*#__PURE__*/React.createElement("rect", {
      x: "233",
      y: "140",
      width: "8",
      height: "70",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M226,150 l22,6 l-22,6 l22,6 l-22,6 l22,6 l-22,6",
      fill: "none",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M215,210 L259,210 L245,200 L229,200 Z",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 276,
      y: 190,
      n: 6
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 20,
      y: 196,
      t: "\u0422\u043E\u043B\u044C\u043A\u043E \u043D\u0430 \u0445\u043E\u043B\u043E\u0434\u043D\u043E\u043C \u043C\u043E\u0442\u043E\u0440\u0435,",
      s: 10,
      w: 500
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 20,
      y: 210,
      t: "\u043F\u043E\u0440\u0448\u0435\u043D\u044C \u0432 \u0412\u041C\u0422 \u0442\u0430\u043A\u0442\u0430 \u0441\u0436\u0430\u0442\u0438\u044F",
      s: 10,
      w: 500
    }))
  },
  chain: {
    title: "Провис цепи",
    legend: ["Передняя звезда", "Задняя звезда", "Замер провиса посередине — 30–40 мм", "Натяжители: метки слева и справа одинаковые"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "70",
      cy: "110",
      r: "22",
      fill: FG.metal2,
      stroke: FG.ink,
      strokeDasharray: "4 2"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 70,
      y: 150,
      n: 1
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "290",
      cy: "110",
      r: "44",
      fill: FG.metal2,
      stroke: FG.ink,
      strokeDasharray: "5 2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "290",
      cy: "110",
      r: "8",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 290,
      y: 172,
      n: 2
    }), /*#__PURE__*/React.createElement("line", {
      x1: "70",
      y1: "88",
      x2: "290",
      y2: "66",
      stroke: FG.ink,
      strokeWidth: "5",
      strokeDasharray: "5 3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M70,132 Q180,168 290,154",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "5",
      strokeDasharray: "5 3"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "180",
      y1: "120",
      x2: "180",
      y2: "190",
      stroke: FG.red,
      strokeWidth: "1.5"
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 180,
      y1: 176,
      x2: 180,
      y2: 152
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 180,
      y1: 128,
      x2: 180,
      y2: 144
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 188,
      y: 146,
      t: "30\u201340 \u043C\u043C",
      c: FG.red,
      w: 800
    }), /*#__PURE__*/React.createElement(Num, {
      x: 160,
      y: 196,
      n: 3
    }), [0, 1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("line", {
      key: i,
      x1: 268 + i * 8,
      y1: "196",
      x2: 268 + i * 8,
      y2: i === 2 ? 186 : 190,
      stroke: FG.ink
    })), /*#__PURE__*/React.createElement("rect", {
      x: "284",
      y: "198",
      width: "12",
      height: "6",
      fill: FG.red
    }), /*#__PURE__*/React.createElement(Num, {
      x: 330,
      y: 196,
      n: 4
    }))
  },
  oil: {
    title: "Замена масла",
    legend: ["Заливная пробка / щуп", "Окошко уровня: между MIN и MAX", "Сливная пробка с новой шайбой", "Масляный фильтр (если есть)"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M60,60 Q60,40 90,40 L250,40 Q300,40 300,90 L300,150 Q300,180 260,180 L100,180 Q60,180 60,140 Z",
      fill: FG.metal,
      stroke: FG.ink,
      strokeWidth: "1.4"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "236",
      y: "24",
      width: "20",
      height: "18",
      rx: "3",
      fill: FG.rub
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 246,
      y1: 4,
      x2: 246,
      y2: 22,
      c: FG.blue
    }), /*#__PURE__*/React.createElement(Num, {
      x: 276,
      y: 20,
      n: 1
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "200",
      cy: "140",
      r: "16",
      fill: "#cfe3f0",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("line", {
      x1: "186",
      y1: "134",
      x2: "214",
      y2: "134",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("line", {
      x1: "186",
      y1: "148",
      x2: "214",
      y2: "148",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 220,
      y: 136,
      t: "MAX",
      s: 9
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 220,
      y: 152,
      t: "MIN",
      s: 9
    }), /*#__PURE__*/React.createElement(Num, {
      x: 250,
      y: 146,
      n: 2
    }), /*#__PURE__*/React.createElement("polygon", {
      points: "150,180 166,180 170,188 166,196 150,196 146,188",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 158,
      y1: 200,
      x2: 158,
      y2: 224,
      c: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 124,
      y: 196,
      n: 3
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "110",
      cy: "110",
      r: "22",
      fill: FG.metal2,
      stroke: FG.ink
    }), [0, 1, 2].map(i => {
      const a = i * 2.09;
      return /*#__PURE__*/React.createElement("circle", {
        key: i,
        cx: 110 + 16 * Math.cos(a),
        cy: 110 + 16 * Math.sin(a),
        r: "3",
        fill: FG.ink
      });
    }), /*#__PURE__*/React.createElement(Num, {
      x: 110,
      y: 78,
      n: 4
    }))
  },
  airfilter: {
    title: "Обслуживание поролонового фильтра",
    legend: ["Промыть в средстве или керосине", "Просушить (не выкручивать!)", "Пропитать специальным маслом", "Отжать лишнее в пакете", "Смазать край консистентной смазкой"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, [0, 1, 2, 3, 4].map(i => {
      const x = 18 + i * 68;
      return /*#__PURE__*/React.createElement("g", {
        key: i
      }, /*#__PURE__*/React.createElement("rect", {
        x: x,
        y: "50",
        width: "58",
        height: "110",
        rx: "10",
        fill: i === 2 || i === 3 ? "#f7d27a" : "#f4f1e6",
        stroke: FG.ink
      }), /*#__PURE__*/React.createElement(Num, {
        x: x + 29,
        y: 36,
        n: i + 1
      }), i === 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
        d: "M" + (x + 10) + ",120 q10,-10 20,0 q10,10 20,0",
        fill: "none",
        stroke: FG.blue,
        strokeWidth: "2"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M" + (x + 10) + ",134 q10,-10 20,0 q10,10 20,0",
        fill: "none",
        stroke: FG.blue,
        strokeWidth: "2"
      })), i === 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
        cx: x + 29,
        cy: "100",
        r: "14",
        fill: "none",
        stroke: FG.yel,
        strokeWidth: "3"
      }), [0, 1, 2, 3, 4, 5].map(k => /*#__PURE__*/React.createElement("line", {
        key: k,
        x1: x + 29 + 18 * Math.cos(k),
        y1: 100 + 18 * Math.sin(k),
        x2: x + 29 + 24 * Math.cos(k),
        y2: 100 + 24 * Math.sin(k),
        stroke: FG.yel,
        strokeWidth: "2"
      }))), i === 2 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
        x: x + 20,
        y: "60",
        width: "18",
        height: "30",
        rx: "4",
        fill: FG.red
      }), /*#__PURE__*/React.createElement("path", {
        d: "M" + (x + 29) + ",94 l0,14",
        stroke: FG.red,
        strokeWidth: "2"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: x + 29,
        cy: "114",
        r: "3",
        fill: FG.red
      })), i === 3 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
        d: "M" + (x + 10) + ",90 l38,0 M" + (x + 10) + ",120 l38,0",
        stroke: FG.ink,
        strokeWidth: "2"
      }), /*#__PURE__*/React.createElement(Arrow, {
        x1: x + 29,
        y1: 70,
        x2: x + 29,
        y2: 88,
        c: FG.ink
      }), /*#__PURE__*/React.createElement(Arrow, {
        x1: x + 29,
        y1: 142,
        x2: x + 29,
        y2: 122,
        c: FG.ink
      })), i === 4 && /*#__PURE__*/React.createElement("path", {
        d: "M" + (x + 6) + ",56 l46,0",
        stroke: FG.blue,
        strokeWidth: "5",
        strokeLinecap: "round"
      }));
    }))
  },
  bleed: {
    title: "Прокачка тормоза",
    legend: ["Бачок главного цилиндра — не дать опустеть", "Суппорт", "Штуцер прокачки (ключ 8)", "Прозрачная трубка в бутылку", "Порядок: зажал ручку → открыл штуцер → закрыл → отпустил"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "40",
      y: "30",
      width: "70",
      height: "40",
      rx: "6",
      fill: "#cfe3f0",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "40",
      y: "30",
      width: "70",
      height: "14",
      rx: "4",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M110,56 L170,70",
      stroke: FG.ink,
      strokeWidth: "5"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 24,
      y: 50,
      n: 1
    }), /*#__PURE__*/React.createElement("path", {
      d: "M75,70 C 75,120 140,130 170,160",
      fill: "none",
      stroke: FG.rub,
      strokeWidth: "4"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "160",
      y: "140",
      width: "70",
      height: "56",
      rx: "8",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "195",
      cy: "168",
      r: "14",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 152,
      y: 208,
      n: 2
    }), /*#__PURE__*/React.createElement("rect", {
      x: "222",
      y: "132",
      width: "10",
      height: "16",
      fill: FG.brass,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 246,
      y: 126,
      n: 3
    }), /*#__PURE__*/React.createElement("path", {
      d: "M227,132 C 240,90 280,90 300,130",
      fill: "none",
      stroke: "#9fc4dc",
      strokeWidth: "5"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "286",
      y: "130",
      width: "34",
      height: "56",
      rx: "6",
      fill: "#e9f3f9",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "288",
      y: "160",
      width: "30",
      height: "24",
      fill: "#f3d27a"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 334,
      y: 140,
      n: 4
    }), /*#__PURE__*/React.createElement(Num, {
      x: 40,
      y: 208,
      n: 5
    }))
  },
  tube: {
    title: "Замена камеры",
    legend: ["Ниппель — выкрутить золотник", "Бортзамок — ослабить", "Монтажки: маленькими шагами", "Борт в ручей обода — так легче снять"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "180",
      cy: "120",
      r: "90",
      fill: "none",
      stroke: FG.rub,
      strokeWidth: "18"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "180",
      cy: "120",
      r: "72",
      fill: "none",
      stroke: FG.metal2,
      strokeWidth: "6"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "180",
      cy: "120",
      r: "12",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "176",
      y: "40",
      width: "8",
      height: "18",
      fill: FG.brass,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 200,
      y: 36,
      n: 1
    }), /*#__PURE__*/React.createElement("rect", {
      x: "172",
      y: "184",
      width: "16",
      height: "14",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 204,
      y: 196,
      n: 2
    }), /*#__PURE__*/React.createElement("path", {
      d: "M90,90 L40,60",
      stroke: FG.blue,
      strokeWidth: "6",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M100,70 L60,30",
      stroke: FG.blue,
      strokeWidth: "6",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 36,
      y: 90,
      n: 3
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 270,
      y1: 120,
      x2: 250,
      y2: 120,
      c: FG.red
    }), /*#__PURE__*/React.createElement(Num, {
      x: 290,
      y: 120,
      n: 4
    }))
  },
  sag: {
    title: "Провис подвески (SAG)",
    legend: ["A — колесо в воздухе", "B — мотоцикл стоит сам", "C — райдер в экипировке в стойке", "Свободный A−B: 25–40 мм; рабочий A−C: 95–105 мм"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "110",
      cy: "150",
      r: "55",
      fill: "none",
      stroke: FG.rub,
      strokeWidth: "12"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "110",
      cy: "150",
      r: "5",
      fill: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M60,60 L230,50",
      stroke: FG.yel,
      strokeWidth: "10",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "70",
      cy: "60",
      r: "4",
      fill: FG.red
    }), /*#__PURE__*/React.createElement("line", {
      x1: "110",
      y1: "150",
      x2: "70",
      y2: "60",
      stroke: FG.red,
      strokeWidth: "1.5",
      strokeDasharray: "4 3"
    }), [["A", 60, 1], ["B", 90, 2], ["C", 120, 3]].map((r, i) => /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("rect", {
      x: "230",
      y: r[1],
      width: "110",
      height: "24",
      rx: "6",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 244,
      y: r[1] + 17,
      t: r[0] + (i === 0 ? " — 600 мм" : i === 1 ? " — 570 мм" : " — 500 мм"),
      s: 11
    }), /*#__PURE__*/React.createElement(Num, {
      x: 220,
      y: r[1] + 12,
      n: r[2]
    }))), /*#__PURE__*/React.createElement(Txt, {
      x: 230,
      y: 170,
      t: "A\u2212B = 30 \u043C\u043C",
      s: 10,
      c: FG.mid,
      w: 500
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 230,
      y: 184,
      t: "A\u2212C = 100 \u043C\u043C \u2014 \u043D\u043E\u0440\u043C\u0430",
      s: 10,
      c: FG.mid,
      w: 500
    }), /*#__PURE__*/React.createElement(Num, {
      x: 220,
      y: 200,
      n: 4
    }))
  },
  multimeter: {
    title: "Проверка мультиметром",
    legend: ["Катушка зажигания", "Первичная обмотка: 0.2–1 Ом", "Вторичная (к колпачку): несколько кОм", "Зарядка на 5000 об/мин: 13.5–14.5 В"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "40",
      y: "60",
      width: "90",
      height: "50",
      rx: "8",
      fill: FG.rub
    }), /*#__PURE__*/React.createElement("rect", {
      x: "36",
      y: "74",
      width: "8",
      height: "22",
      fill: FG.metal2
    }), /*#__PURE__*/React.createElement("path", {
      d: "M130,85 C 170,85 180,40 220,40",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "3"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "218",
      y: "30",
      width: "20",
      height: "24",
      rx: "6",
      fill: FG.red
    }), /*#__PURE__*/React.createElement(Num, {
      x: 84,
      y: 44,
      n: 1
    }), /*#__PURE__*/React.createElement("rect", {
      x: "160",
      y: "110",
      width: "110",
      height: "90",
      rx: "10",
      fill: FG.yel,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "172",
      y: "122",
      width: "86",
      height: "30",
      rx: "4",
      fill: "#dfe8d8",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 215,
      y: 143,
      t: "0.4 \u03A9",
      a: "middle",
      s: 16,
      w: 800
    }), /*#__PURE__*/React.createElement("path", {
      d: "M180,200 C 150,220 60,200 40,90",
      fill: "none",
      stroke: FG.red,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M250,200 C 280,220 300,100 238,48",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 110,
      y: 210,
      n: 2
    }), /*#__PURE__*/React.createElement(Num, {
      x: 300,
      y: 150,
      n: 3
    }), /*#__PURE__*/React.createElement(Num, {
      x: 300,
      y: 200,
      n: 4
    }))
  },
  idle: {
    title: "Винты холостого хода",
    legend: ["Упорный винт (обороты): по часовой — выше", "Винт качества (смесь): ищем максимум ровных оборотов", "Выставить {idle} об/мин на прогретом моторе"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "90",
      y: "60",
      width: "180",
      height: "90",
      rx: "10",
      fill: FG.metal,
      stroke: FG.ink,
      strokeWidth: "1.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "180",
      cy: "105",
      r: "28",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Screw, {
      x: 270,
      y: 80,
      l: 36
    }), /*#__PURE__*/React.createElement("rect", {
      x: "306",
      y: "70",
      width: "16",
      height: "20",
      rx: "3",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M330,64 A12,12 0 1,1 330,96",
      fill: "none",
      stroke: FG.red,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 300,
      y: 50,
      n: 1
    }), /*#__PURE__*/React.createElement(Screw, {
      x: 90,
      y: 132,
      l: 30,
      dir: -1
    }), /*#__PURE__*/React.createElement("path", {
      d: "M44,120 A10,10 0 1,0 44,144",
      fill: "none",
      stroke: FG.blue,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 60,
      y: 168,
      n: 2
    }), /*#__PURE__*/React.createElement(Num, {
      x: 180,
      y: 190,
      n: 3
    }))
  },
  tdc: {
    title: "Метки ВМТ и ГРМ",
    legend: ["Смотровое окно на крышке генератора", "Метка «T» на роторе совпала с риской", "Метки на звезде распредвала — вровень с плоскостью головки", "Коромысла с люфтом — это такт сжатия"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "100",
      cy: "130",
      r: "70",
      fill: FG.metal,
      stroke: FG.ink,
      strokeWidth: "1.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "100",
      cy: "130",
      r: "24",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 100,
      y: 76,
      t: "T",
      a: "middle",
      s: 16,
      w: 800,
      c: FG.red
    }), /*#__PURE__*/React.createElement("path", {
      d: "M92,52 L100,62 L108,52",
      fill: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 40,
      y: 70,
      n: 1
    }), /*#__PURE__*/React.createElement(Num, {
      x: 150,
      y: 70,
      n: 2
    }), /*#__PURE__*/React.createElement("line", {
      x1: "200",
      y1: "150",
      x2: "340",
      y2: "150",
      stroke: FG.blue,
      strokeWidth: "2",
      strokeDasharray: "5 3"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "270",
      cy: "100",
      r: "44",
      fill: FG.metal2,
      stroke: FG.ink,
      strokeDasharray: "5 2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "270",
      cy: "100",
      r: "8",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "226",
      cy: "100",
      r: "4",
      fill: FG.red
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "314",
      cy: "100",
      r: "4",
      fill: FG.red
    }), /*#__PURE__*/React.createElement("line", {
      x1: "210",
      y1: "100",
      x2: "330",
      y2: "100",
      stroke: FG.red,
      strokeDasharray: "3 3"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 270,
      y: 170,
      n: 3
    }), /*#__PURE__*/React.createElement(Num, {
      x: 330,
      y: 40,
      n: 4
    }))
  }
};
function GuideFig({
  id,
  eng
}) {
  const F = FIGS[id];
  if (!F) return null;
  return /*#__PURE__*/React.createElement("figure", {
    className: "gfig"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 360 230",
    role: "img",
    "aria-label": F.title
  }, /*#__PURE__*/React.createElement("rect", {
    width: "360",
    height: "230",
    rx: "10",
    fill: FG.paper
  }), F.svg()), /*#__PURE__*/React.createElement("figcaption", null, /*#__PURE__*/React.createElement("b", null, F.title), /*#__PURE__*/React.createElement("ol", null, F.legend.map((l, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, eng ? sub(l, eng) : l)))));
}
/* ===== Иллюстрации к инструкциям, часть 2 ===== */
Object.assign(FIGS, {
  piston: {
    title: "ЦПГ в разобранном виде",
    legend: ["Головка цилиндра и прокладка ГБЦ", "Цилиндр (гильза)", "Прокладка цилиндра", "Поршень: стрелка на днище — к выпуску", "Кольца: 2 компрессионных + маслосъёмное", "Поршневой палец", "Стопорные кольца пальца (всегда новые)", "Шатун (верхняя головка)", "Тряпка в горловине картера"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "40",
      y: "14",
      width: "120",
      height: "26",
      rx: "4",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "44",
      y: "40",
      width: "112",
      height: "4",
      fill: FG.red,
      opacity: ".7"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 24,
      y: 27,
      n: 1
    }), /*#__PURE__*/React.createElement("rect", {
      x: "54",
      y: "56",
      width: "92",
      height: "74",
      rx: "4",
      fill: FG.metal2,
      stroke: FG.ink
    }), [0, 1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("rect", {
      key: i,
      x: "44",
      y: 60 + i * 11,
      width: "112",
      height: "5",
      rx: "2",
      fill: FG.metal,
      stroke: FG.ink,
      strokeWidth: ".6"
    })), /*#__PURE__*/React.createElement("rect", {
      x: "74",
      y: "56",
      width: "52",
      height: "74",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 24,
      y: 92,
      n: 2
    }), /*#__PURE__*/React.createElement("rect", {
      x: "50",
      y: "134",
      width: "100",
      height: "4",
      fill: FG.red,
      opacity: ".7"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 24,
      y: 136,
      n: 3
    }), /*#__PURE__*/React.createElement("rect", {
      x: "206",
      y: "40",
      width: "70",
      height: "66",
      rx: "6",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M232,52 l9,-7 l9,7",
      fill: "none",
      stroke: FG.red,
      strokeWidth: "2.4"
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 241,
      y: 64,
      t: "EX",
      a: "middle",
      s: 9,
      c: FG.red
    }), [74, 80, 88].map((y, i) => /*#__PURE__*/React.createElement("rect", {
      key: i,
      x: "203",
      y: y,
      width: "76",
      height: i === 2 ? 5 : 3,
      fill: FG.ink
    })), /*#__PURE__*/React.createElement(Num, {
      x: 300,
      y: 56,
      n: 4
    }), /*#__PURE__*/React.createElement(Num, {
      x: 300,
      y: 82,
      n: 5
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "241",
      cy: "122",
      r: "9",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "200",
      y: "117",
      width: "82",
      height: "10",
      rx: "5",
      fill: FG.metal2,
      stroke: FG.ink,
      transform: "translate(0 0)"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 300,
      y: 122,
      n: 6
    }), /*#__PURE__*/React.createElement("path", {
      d: "M196,113 a6,6 0 1,0 0.1,0",
      fill: "none",
      stroke: FG.blue,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M286,113 a6,6 0 1,0 0.1,0",
      fill: "none",
      stroke: FG.blue,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 196,
      y: 146,
      n: 7
    }), /*#__PURE__*/React.createElement("path", {
      d: "M228,140 L254,140 L262,210 L220,210 Z",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "241",
      cy: "146",
      r: "9",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 290,
      y: 180,
      n: 8
    }), /*#__PURE__*/React.createElement("rect", {
      x: "60",
      y: "170",
      width: "80",
      height: "38",
      rx: "6",
      fill: "#e7e1d2",
      stroke: FG.ink,
      strokeDasharray: "4 3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M70,188 q15,-10 30,0 t30,0",
      fill: "none",
      stroke: FG.mid,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 44,
      y: 190,
      n: 9
    }))
  },
  rings: {
    title: "Кольца: зазор в замке и разводка",
    legend: ["Кольцо в цилиндре на 10–15 мм от верха", "Щуп в замке — зазор по мануалу", "Маркировка кольца — вверх", "Вид сверху: замки через 120°", "Не над пальцем и не над выпуском"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "30",
      y: "30",
      width: "130",
      height: "150",
      rx: "6",
      fill: "#fff",
      stroke: FG.ink,
      strokeWidth: "1.4"
    }), /*#__PURE__*/React.createElement("line", {
      x1: "30",
      y1: "62",
      x2: "160",
      y2: "62",
      stroke: FG.mid,
      strokeDasharray: "4 3"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "40",
      y: "70",
      width: "110",
      height: "6",
      rx: "3",
      fill: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 16,
      y: 74,
      n: 1
    }), /*#__PURE__*/React.createElement("rect", {
      x: "92",
      y: "62",
      width: "6",
      height: "20",
      fill: FG.yel,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 110,
      y: 100,
      n: 2
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 60,
      y: 92,
      t: "TOP \u25CF",
      s: 10,
      c: FG.red
    }), /*#__PURE__*/React.createElement(Num, {
      x: 56,
      y: 110,
      n: 3
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "268",
      cy: "104",
      r: "62",
      fill: FG.metal,
      stroke: FG.ink,
      strokeWidth: "1.4"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "268",
      cy: "104",
      r: "48",
      fill: "none",
      stroke: FG.ink,
      strokeDasharray: "2 3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M262,40 l12,0",
      stroke: FG.paper,
      strokeWidth: "6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M318,140 l8,-9",
      stroke: FG.paper,
      strokeWidth: "6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M216,140 l-8,-9",
      stroke: FG.paper,
      strokeWidth: "6"
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 268,
      y: 30,
      t: "1",
      a: "middle",
      s: 11,
      c: FG.red,
      w: 800
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 334,
      y: 150,
      t: "2",
      a: "middle",
      s: 11,
      c: FG.red,
      w: 800
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 200,
      y: 150,
      t: "3",
      a: "middle",
      s: 11,
      c: FG.red,
      w: 800
    }), /*#__PURE__*/React.createElement(Num, {
      x: 268,
      y: 190,
      n: 4
    }), /*#__PURE__*/React.createElement("line", {
      x1: "200",
      y1: "104",
      x2: "336",
      y2: "104",
      stroke: FG.blue,
      strokeWidth: "2",
      strokeDasharray: "5 3"
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 296,
      y: 118,
      t: "\u043F\u0430\u043B\u0435\u0446",
      s: 9,
      c: FG.blue
    }), /*#__PURE__*/React.createElement(Num, {
      x: 330,
      y: 190,
      n: 5
    }))
  },
  compression: {
    title: "Замер компрессии",
    legend: ["Компрессометр вкручен вместо свечи", "Газ открыт полностью", "Крути стартером 5–8 раз до остановки стрелки", "Мало — капни масла и замерь снова"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M60,200 L60,110 L130,96 L200,110 L200,200 Z",
      fill: FG.metal,
      stroke: FG.ink,
      strokeWidth: "1.4"
    }), [0, 1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("rect", {
      key: i,
      x: "50",
      y: 120 + i * 16,
      width: "160",
      height: "6",
      rx: "3",
      fill: FG.metal2,
      stroke: FG.ink,
      strokeWidth: ".6"
    })), /*#__PURE__*/React.createElement("rect", {
      x: "124",
      y: "70",
      width: "12",
      height: "30",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M130,70 C 130,40 180,30 220,46",
      fill: "none",
      stroke: FG.rub,
      strokeWidth: "5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "264",
      cy: "60",
      r: "40",
      fill: "#fff",
      stroke: FG.ink,
      strokeWidth: "2"
    }), [0, 1, 2, 3, 4, 5, 6].map(i => {
      const a = Math.PI * (0.8 + i * 0.233);
      return /*#__PURE__*/React.createElement("line", {
        key: i,
        x1: 264 + 30 * Math.cos(a),
        y1: 60 + 30 * Math.sin(a),
        x2: 264 + 36 * Math.cos(a),
        y2: 60 + 36 * Math.sin(a),
        stroke: FG.ink,
        strokeWidth: "1.5"
      });
    }), /*#__PURE__*/React.createElement("line", {
      x1: "264",
      y1: "60",
      x2: "290",
      y2: "44",
      stroke: FG.red,
      strokeWidth: "3"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "264",
      cy: "60",
      r: "4",
      fill: FG.ink
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 264,
      y: 92,
      t: "\u0431\u0430\u0440",
      a: "middle",
      s: 9
    }), /*#__PURE__*/React.createElement(Num, {
      x: 320,
      y: 30,
      n: 1
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 300,
      y1: 150,
      x2: 340,
      y2: 150,
      c: FG.blue
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 270,
      y: 140,
      t: "\u0433\u0430\u0437 100%",
      s: 10,
      c: FG.blue
    }), /*#__PURE__*/React.createElement(Num, {
      x: 300,
      y: 170,
      n: 2
    }), /*#__PURE__*/React.createElement("path", {
      d: "M30,60 A20,20 0 1,1 30,61",
      fill: "none",
      stroke: FG.yel,
      strokeWidth: "3"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 30,
      y: 100,
      n: 3
    }), /*#__PURE__*/React.createElement(Num, {
      x: 200,
      y: 210,
      n: 4
    }))
  },
  valvelap: {
    title: "Притирка клапана",
    legend: ["Присоска-притир на тарелке клапана", "Паста на фаске тонким слоем", "Вращай туда-обратно, приподнимая", "Поясок 1–1.5 мм ровно по кругу — готово"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M60,150 L300,150 L300,200 L60,200 Z",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M140,150 L160,170 L200,170 L220,150",
      fill: "#fff",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M150,150 L210,150 L200,138 L160,138 Z",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "176",
      y: "40",
      width: "8",
      height: "98",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "170",
      y: "14",
      width: "20",
      height: "30",
      rx: "4",
      fill: FG.rub
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "180",
      cy: "138",
      r: "0"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 210,
      y: 28,
      n: 1
    }), /*#__PURE__*/React.createElement("path", {
      d: "M150,150 L160,138 M210,150 L200,138",
      stroke: FG.yel,
      strokeWidth: "4"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 240,
      y: 140,
      n: 2
    }), /*#__PURE__*/React.createElement("path", {
      d: "M140,50 A40,14 0 0,0 220,50",
      fill: "none",
      stroke: FG.red,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 214,
      y1: 56,
      x2: 222,
      y2: 48
    }), /*#__PURE__*/React.createElement("path", {
      d: "M220,70 A40,14 0 0,1 140,70",
      fill: "none",
      stroke: FG.red,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 146,
      y1: 64,
      x2: 138,
      y2: 72
    }), /*#__PURE__*/React.createElement(Num, {
      x: 110,
      y: 60,
      n: 3
    }), /*#__PURE__*/React.createElement("ellipse", {
      cx: "300",
      cy: "80",
      rx: "34",
      ry: "34",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("ellipse", {
      cx: "300",
      cy: "80",
      rx: "26",
      ry: "26",
      fill: "none",
      stroke: "#9aa0a6",
      strokeWidth: "6"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 300,
      y: 130,
      n: 4
    }))
  },
  starter: {
    title: "Стартер: щётки и коллектор",
    legend: ["Коллектор (ламели) — зачистить", "Щётки: меньше 5–6 мм — заменить", "Пружины щёток", "Метки корпуса — совместить при сборке"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "70",
      y: "60",
      width: "200",
      height: "110",
      rx: "20",
      fill: FG.rub
    }), /*#__PURE__*/React.createElement("rect", {
      x: "70",
      y: "60",
      width: "200",
      height: "16",
      rx: "8",
      fill: "#555b61"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "150",
      y: "90",
      width: "90",
      height: "50",
      fill: FG.copper || "#c27b3c",
      stroke: FG.ink
    }), [0, 1, 2, 3, 4, 5, 6, 7].map(i => /*#__PURE__*/React.createElement("line", {
      key: i,
      x1: 156 + i * 11,
      y1: "90",
      x2: 156 + i * 11,
      y2: "140",
      stroke: FG.ink,
      strokeWidth: "1.2"
    })), /*#__PURE__*/React.createElement(Num, {
      x: 196,
      y: 158,
      n: 1
    }), /*#__PURE__*/React.createElement("rect", {
      x: "180",
      y: "64",
      width: "20",
      height: "26",
      fill: "#2b2b2b",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "180",
      y: "140",
      width: "20",
      height: "26",
      fill: "#2b2b2b",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 228,
      y: 52,
      n: 2
    }), /*#__PURE__*/React.createElement("path", {
      d: "M190,30 l-8,6 l16,6 l-16,6 l16,6 l-8,6",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "1.6"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 160,
      y: 36,
      n: 3
    }), /*#__PURE__*/React.createElement("rect", {
      x: "276",
      y: "104",
      width: "40",
      height: "22",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M270,96 l0,40",
      stroke: FG.red,
      strokeWidth: "3"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 300,
      y: 150,
      n: 4
    }))
  },
  pads: {
    title: "Суппорт и колодки",
    legend: ["Палец колодок (под заглушкой)", "Колодки: остаток накладки ≥ 1–1.5 мм", "Поршни суппорта — утопить перед установкой", "Бачок: следи за уровнем", "Пружинная пластина — правильной стороной"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "110",
      cy: "120",
      r: "80",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "110",
      cy: "120",
      r: "30",
      fill: "#fff",
      stroke: FG.ink
    }), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
      const a = i * 0.628;
      return /*#__PURE__*/React.createElement("circle", {
        key: i,
        cx: 110 + 55 * Math.cos(a),
        cy: 120 + 55 * Math.sin(a),
        r: "4",
        fill: FG.ink
      });
    }), /*#__PURE__*/React.createElement("path", {
      d: "M170,60 L240,40 L270,130 L200,150 Z",
      fill: FG.red,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "226",
      cy: "58",
      r: "6",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 252,
      y: 34,
      n: 1
    }), /*#__PURE__*/React.createElement("rect", {
      x: "188",
      y: "74",
      width: "12",
      height: "60",
      fill: "#2b2b2b",
      transform: "rotate(-17 194 104)"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "200",
      y: "78",
      width: "6",
      height: "56",
      fill: FG.metal2,
      transform: "rotate(-17 203 106)"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 290,
      y: 100,
      n: 2
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "238",
      cy: "108",
      r: "12",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 290,
      y: 140,
      n: 3
    }), /*#__PURE__*/React.createElement("rect", {
      x: "290",
      y: "20",
      width: "44",
      height: "34",
      rx: "5",
      fill: "#cfe3f0",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("line", {
      x1: "292",
      y1: "38",
      x2: "332",
      y2: "38",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 300,
      y: 34,
      t: "MAX",
      s: 8
    }), /*#__PURE__*/React.createElement(Num, {
      x: 346,
      y: 70,
      n: 4
    }), /*#__PURE__*/React.createElement("path", {
      d: "M200,150 l30,-8",
      stroke: FG.blue,
      strokeWidth: "3"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 240,
      y: 170,
      n: 5
    }))
  },
  fork: {
    title: "Перо вилки в разрезе",
    legend: ["Пробка пера", "Пружина", "Шток (труба) — без забоин", "Пыльник", "Стопорное кольцо", "Сальник", "Уровень масла от края трубы (без пружины)"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "140",
      y: "10",
      width: "40",
      height: "150",
      rx: "6",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "146",
      y: "10",
      width: "6",
      height: "150",
      fill: "rgba(255,255,255,.7)"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "138",
      y: "4",
      width: "44",
      height: "12",
      rx: "3",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 110,
      y: 10,
      n: 1
    }), /*#__PURE__*/React.createElement("path", {
      d: "M160,24 l-12,6 l24,6 l-24,6 l24,6 l-24,6 l24,6 l-24,6 l24,6 l-12,6",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "1.6"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 110,
      y: 60,
      n: 2
    }), /*#__PURE__*/React.createElement(Num, {
      x: 210,
      y: 100,
      n: 3
    }), /*#__PURE__*/React.createElement("rect", {
      x: "126",
      y: "160",
      width: "68",
      height: "70",
      rx: "6",
      fill: FG.rub
    }), /*#__PURE__*/React.createElement("rect", {
      x: "128",
      y: "150",
      width: "64",
      height: "12",
      rx: "4",
      fill: "#2b2b2b"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 226,
      y: 156,
      n: 4
    }), /*#__PURE__*/React.createElement("rect", {
      x: "130",
      y: "164",
      width: "60",
      height: "3",
      fill: FG.blue
    }), /*#__PURE__*/React.createElement(Num, {
      x: 226,
      y: 176,
      n: 5
    }), /*#__PURE__*/React.createElement("rect", {
      x: "130",
      y: "168",
      width: "60",
      height: "8",
      fill: FG.red,
      opacity: ".8"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 226,
      y: 196,
      n: 6
    }), /*#__PURE__*/React.createElement("line", {
      x1: "250",
      y1: "10",
      x2: "250",
      y2: "80",
      stroke: FG.red,
      strokeWidth: "1.5"
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 250,
      y1: 40,
      x2: 250,
      y2: 12
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 250,
      y1: 50,
      x2: 250,
      y2: 78
    }), /*#__PURE__*/React.createElement("line", {
      x1: "186",
      y1: "80",
      x2: "262",
      y2: "80",
      stroke: FG.blue,
      strokeDasharray: "4 3"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 286,
      y: 46,
      n: 7
    }))
  },
  clutch: {
    title: "Пакет сцепления",
    legend: ["Корзина сцепления", "Фрикционные диски (с накладками)", "Стальные диски", "Ступица", "Нажимной диск", "Пружины и болты — затягивать крест-накрест"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M40,40 L80,40 L80,190 L40,190 Z",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 60,
      y: 210,
      n: 1
    }), [0, 1, 2, 3, 4, 5, 6, 7].map(i => /*#__PURE__*/React.createElement("rect", {
      key: i,
      x: 92 + i * 18,
      y: "44",
      width: "8",
      height: "142",
      rx: "2",
      fill: i % 2 ? FG.metal : "#c27b3c",
      stroke: FG.ink,
      strokeWidth: ".8"
    })), /*#__PURE__*/React.createElement(Num, {
      x: 100,
      y: 30,
      n: 2
    }), /*#__PURE__*/React.createElement(Num, {
      x: 136,
      y: 30,
      n: 3
    }), /*#__PURE__*/React.createElement("rect", {
      x: "90",
      y: "96",
      width: "150",
      height: "38",
      fill: "rgba(0,0,0,.08)",
      stroke: FG.ink,
      strokeDasharray: "4 3"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 170,
      y: 150,
      n: 4
    }), /*#__PURE__*/React.createElement("rect", {
      x: "248",
      y: "50",
      width: "22",
      height: "130",
      rx: "4",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 259,
      y: 200,
      n: 5
    }), [70, 115, 160].map(y => /*#__PURE__*/React.createElement("path", {
      key: y,
      d: "M280," + y + " l8,-6 l8,12 l8,-12 l8,12 l8,-12 l8,6",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "1.6"
    })), /*#__PURE__*/React.createElement(Num, {
      x: 334,
      y: 115,
      n: 6
    }))
  },
  lever: {
    title: "Свободный ход рычага",
    legend: ["Рычаг сцепления: ход 10–15 мм до натяжения троса", "Регулятор на рычаге (мелкая подстройка)", "Регулятор у мотора (крупная)", "Ручка газа: люфт 2–3 мм"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "20",
      y: "90",
      width: "200",
      height: "18",
      rx: "9",
      fill: FG.rub
    }), /*#__PURE__*/React.createElement("rect", {
      x: "200",
      y: "84",
      width: "60",
      height: "30",
      rx: "8",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M220,110 L320,170",
      stroke: FG.metal,
      strokeWidth: "10",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M220,110 L330,150",
      stroke: FG.mid,
      strokeWidth: "4",
      strokeDasharray: "5 4",
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M312,160 A40,40 0 0,0 322,146",
      fill: "none",
      stroke: FG.red,
      strokeWidth: "2.5"
    }), /*#__PURE__*/React.createElement(Txt, {
      x: 262,
      y: 186,
      t: "10\u201315 \u043C\u043C",
      s: 10,
      c: FG.red,
      w: 800
    }), /*#__PURE__*/React.createElement(Num, {
      x: 300,
      y: 200,
      n: 1
    }), /*#__PURE__*/React.createElement("rect", {
      x: "256",
      y: "72",
      width: "14",
      height: "12",
      rx: "2",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("path", {
      d: "M262,72 C 262,40 200,30 120,40",
      fill: "none",
      stroke: FG.ink,
      strokeWidth: "2.5"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 286,
      y: 64,
      n: 2
    }), /*#__PURE__*/React.createElement("rect", {
      x: "40",
      y: "36",
      width: "30",
      height: "12",
      rx: "3",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 56,
      y: 22,
      n: 3
    }), /*#__PURE__*/React.createElement("rect", {
      x: "20",
      y: "140",
      width: "80",
      height: "22",
      rx: "10",
      fill: FG.rub
    }), /*#__PURE__*/React.createElement("path", {
      d: "M60,130 A30,14 0 0,1 92,138",
      fill: "none",
      stroke: FG.blue,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 60,
      y: 190,
      n: 4
    }))
  },
  coolant: {
    title: "Система охлаждения",
    legend: ["Крышка радиатора — открывать только на холодном моторе", "Радиатор", "Патрубки и хомуты", "Помпа и её дренажное отверстие", "Бачок: уровень между метками"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "30",
      y: "40",
      width: "90",
      height: "160",
      rx: "8",
      fill: "#2b3036",
      stroke: FG.ink
    }), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => /*#__PURE__*/React.createElement("line", {
      key: i,
      x1: "34",
      y1: 50 + i * 14,
      x2: "116",
      y2: 50 + i * 14,
      stroke: "#4a525b",
      strokeWidth: "3"
    })), /*#__PURE__*/React.createElement(Num, {
      x: 75,
      y: 214,
      n: 2
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "75",
      cy: "34",
      r: "10",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement(Num, {
      x: 44,
      y: 20,
      n: 1
    }), /*#__PURE__*/React.createElement("path", {
      d: "M120,70 C 180,60 200,90 240,90",
      fill: "none",
      stroke: FG.rub,
      strokeWidth: "9"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M120,180 C 180,190 200,160 240,160",
      fill: "none",
      stroke: FG.rub,
      strokeWidth: "9"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 180,
      y: 56,
      n: 3
    }), /*#__PURE__*/React.createElement("rect", {
      x: "236",
      y: "60",
      width: "90",
      height: "120",
      rx: "10",
      fill: FG.metal,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "270",
      cy: "150",
      r: "18",
      fill: FG.metal2,
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "270",
      cy: "174",
      r: "3",
      fill: FG.blue
    }), /*#__PURE__*/React.createElement(Num, {
      x: 304,
      y: 150,
      n: 4
    }), /*#__PURE__*/React.createElement("rect", {
      x: "290",
      y: "14",
      width: "40",
      height: "40",
      rx: "6",
      fill: "#e9f3f9",
      stroke: FG.ink
    }), /*#__PURE__*/React.createElement("rect", {
      x: "292",
      y: "32",
      width: "36",
      height: "20",
      fill: "#9fd39f",
      opacity: ".7"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 344,
      y: 60,
      n: 5
    }))
  },
  reed: {
    title: "Лепестковый клапан 2T",
    legend: ["Корпус клапана", "Лепестки (пластик или карбон)", "Ограничители хода", "Щель больше 0.2 мм или трещина — менять"],
    svg: () => /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M90,40 L270,40 L230,190 L130,190 Z",
      fill: FG.metal2,
      stroke: FG.ink,
      strokeWidth: "1.4"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 70,
      y: 40,
      n: 1
    }), /*#__PURE__*/React.createElement("path", {
      d: "M120,60 L240,60 L215,170 L145,170 Z",
      fill: FG.ink,
      opacity: ".75"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M128,68 L232,68 L210,162 L150,162 Z",
      fill: "#3a3f45"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 260,
      y: 120,
      n: 2
    }), /*#__PURE__*/React.createElement("path", {
      d: "M110,56 L250,56",
      stroke: FG.metal,
      strokeWidth: "6"
    }), /*#__PURE__*/React.createElement(Num, {
      x: 290,
      y: 56,
      n: 3
    }), /*#__PURE__*/React.createElement("path", {
      d: "M200,172 L206,150",
      stroke: FG.red,
      strokeWidth: "2"
    }), /*#__PURE__*/React.createElement(Arrow, {
      x1: 260,
      y1: 200,
      x2: 210,
      y2: 170
    }), /*#__PURE__*/React.createElement(Num, {
      x: 290,
      y: 204,
      n: 4
    }))
  }
});
/* ===== Интерактивный двигатель v4 ===== */
function rotP(x, y, a) {
  const r = a * Math.PI / 180,
    cx = 300,
    cy = 300;
  return [cx + (x - cx) * Math.cos(r) - (y - cy) * Math.sin(r), cy + (x - cx) * Math.sin(r) + (y - cy) * Math.cos(r)];
}
function gearPath(cx, cy, r, teeth) {
  let d = "";
  for (let i = 0; i < teeth * 2; i++) {
    const ang = i / (teeth * 2) * Math.PI * 2,
      rr = i % 2 === 0 ? r : r - 4;
    const a1 = ang - Math.PI / (teeth * 2) * 0.6,
      a2 = ang + Math.PI / (teeth * 2) * 0.6;
    d += (i === 0 ? "M" : "L") + (cx + rr * Math.cos(a1)).toFixed(1) + "," + (cy + rr * Math.sin(a1)).toFixed(1) + "L" + (cx + rr * Math.cos(a2)).toFixed(1) + "," + (cy + rr * Math.sin(a2)).toFixed(1);
  }
  return d + "Z";
}
function engAngle(eng) {
  return eng.groups.indexOf("horiz") >= 0 ? -78 : -8;
}
function enginePins(eng) {
  const g = eng.groups,
    has = k => g.indexOf(k) >= 0,
    two = eng.stroke === "2T",
    a = engAngle(eng);
  const inst = eng.installed || [],
    pins = [];
  const put = (id, x, y, r) => {
    const p = r ? rotP(x, y, a) : [x, y];
    pins.push({
      id: id,
      x: p[0],
      y: p[1]
    });
  };
  put("head", 300, two ? 122 : 98, true);
  put("spark", two ? 300 : 248, two ? 76 : 84, true);
  put("carb", two ? 386 : 402, two ? 214 : 128, true);
  put("cyl", 300, 198, true);
  if (!two) put("timing", 344, 206, true);
  put("gen", 215, 318, false);
  put("clutch", 400, 308, false);
  put("oil", 300, 386, false);
  put("gearbox", 470, 262, false);
  put("exhaust", 540, 392, false);
  if (has("liquid")) put("cooling", 79, 186, false);else if (inst.indexOf("oilcool") >= 0) put("cooling", 90, 80, false);
  return pins;
}

/* --- поршень, клапаны и такты: отдельный компонент с собственной анимацией --- */
function Internals({
  eng,
  running,
  rpm
}) {
  const two = eng.stroke === "2T",
    a = engAngle(eng),
    dohc = eng.groups.indexOf("dohc") >= 0;
  const [phi, setPhi] = useState(30);
  const reduce = useRef(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (reduce.current) return;
    let raf,
      last = performance.now();
    const revPerSec = !running ? 0.35 : rpm < 2500 ? 0.6 : rpm < 5500 ? 1.2 : 2.2;
    const tick = t => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) {
        last = t;
        return;
      }
      const raw = (t - last) / 1000;
      if (raw < 1 / 24) return;
      last = t;
      const dt = Math.min(0.08, raw);
      setPhi(p => (p + dt * revPerSec * 360) % 720);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, rpm]);
  const th = phi % 360 * Math.PI / 180,
    r = 22,
    L = 100;
  const pinY = 300 - (r * Math.cos(th) + Math.sqrt(L * L - Math.pow(r * Math.sin(th), 2)));
  const cpX = 300 + r * Math.sin(th),
    cpY = 300 - r * Math.cos(th);
  const top = pinY - 16;
  let phase, chamber, phases, active;
  let inLift = 0,
    exLift = 0,
    spark = false,
    exOpen = false,
    trOpen = false,
    reedOpen = false;
  if (!two) {
    phases = ["Впуск", "Сжатие", "Рабочий ход", "Выпуск"];
    active = Math.floor(phi / 180);
    const lobeLift = b => {
      let d = (b + phi / 2) % 360 - 180;
      d = (d + 540) % 360 - 180;
      return Math.abs(d) < 90 ? Math.pow(Math.cos(d * Math.PI / 180), 2) * 7 : 0;
    };
    inLift = lobeLift(135);
    exLift = lobeLift(225);
    spark = phi > 352 && phi < 386;
    const k = phi % 180 / 180;
    chamber = active === 0 ? "rgba(96,165,250,.45)" : active === 1 ? "rgba(96,165,250," + (0.45 + k * 0.35) + ")" : active === 2 ? "rgba(255," + Math.round(150 - k * 60) + ",40," + (0.85 - k * 0.55) + ")" : "rgba(160,160,160," + (0.55 - k * 0.3) + ")";
  } else {
    phases = ["Сжатие и впуск в картер", "Рабочий ход и продувка"];
    const d = phi % 360;
    active = d < 180 ? 1 : 0;
    exOpen = top > 188;
    trOpen = top > 196;
    reedOpen = d > 220 || d < 20;
    spark = d > 352 || d < 14;
    chamber = trOpen ? "rgba(96,165,250,.45)" : d < 120 ? "rgba(255,130,40," + (0.8 - d / 200) + ")" : "rgba(96,165,250,.6)";
  }
  const dash = -(phi * 0.6);
  const camRot = phi / 2;
  return /*#__PURE__*/React.createElement("g", {
    className: "internals",
    pointerEvents: "none"
  }, /*#__PURE__*/React.createElement("g", {
    transform: "rotate(" + a + " 300 300)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "266",
    y: "150",
    width: "68",
    height: "94",
    fill: "rgba(10,12,14,.55)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "268",
    y: "152",
    width: "64",
    height: Math.max(0, top - 152),
    fill: chamber
  }), spark && /*#__PURE__*/React.createElement("circle", {
    cx: two ? 300 : 290,
    cy: "157",
    r: "11",
    fill: "url(#eg-spark)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "267",
    y1: "150",
    x2: "267",
    y2: "244",
    stroke: "#AEB6BE",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "333",
    y1: "150",
    x2: "333",
    y2: "244",
    stroke: "#AEB6BE",
    strokeWidth: "2"
  }), two && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "262",
    y: "188",
    width: "7",
    height: "18",
    fill: exOpen ? "rgba(160,160,160,.8)" : "#15181B"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "331",
    y: "196",
    width: "7",
    height: "14",
    fill: trOpen ? "rgba(96,165,250,.8)" : "#15181B"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "262",
    y: "198",
    width: "5",
    height: "10",
    fill: trOpen ? "rgba(96,165,250,.8)" : "transparent"
  }), reedOpen && /*#__PURE__*/React.createElement("path", {
    d: "M360,230 L336,232",
    stroke: "#60A5FA",
    strokeWidth: "3",
    strokeDasharray: "4 5",
    strokeDashoffset: dash
  }), exOpen && /*#__PURE__*/React.createElement("path", {
    d: "M262,198 L230,206",
    stroke: "#B0B0B0",
    strokeWidth: "4",
    strokeDasharray: "5 5",
    strokeDashoffset: dash
  })), !two && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("g", {
    transform: "translate(0 " + inLift.toFixed(1) + ")"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "316",
    y: "112",
    width: "4",
    height: "38",
    fill: "#C9CED3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M309,150 L327,150 L323,155 L313,155 Z",
    fill: "#E1E5E8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M313,120 l10,3 l-10,3 l10,3 l-10,3 l10,3",
    fill: "none",
    stroke: "#8A9199",
    strokeWidth: "1.5",
    transform: "translate(0 " + (-inLift * 0.4).toFixed(1) + ")"
  })), /*#__PURE__*/React.createElement("g", {
    transform: "translate(0 " + exLift.toFixed(1) + ")"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "280",
    y: "112",
    width: "4",
    height: "38",
    fill: "#C9CED3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M273,150 L291,150 L287,155 L277,155 Z",
    fill: "#E1E5E8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M277,120 l10,3 l-10,3 l10,3 l-10,3 l10,3",
    fill: "none",
    stroke: "#8A9199",
    strokeWidth: "1.5",
    transform: "translate(0 " + (-exLift * 0.4).toFixed(1) + ")"
  })), inLift > 0.5 && /*#__PURE__*/React.createElement("path", {
    d: "M356,129 C340,129 330,138 320,150",
    fill: "none",
    stroke: "#60A5FA",
    strokeWidth: "4",
    strokeDasharray: "4 6",
    strokeDashoffset: dash
  }), exLift > 0.5 && /*#__PURE__*/React.createElement("path", {
    d: "M282,150 C270,138 258,131 244,130",
    fill: "none",
    stroke: "#B5B5B5",
    strokeWidth: "4",
    strokeDasharray: "4 6",
    strokeDashoffset: dash
  }), (dohc ? [[276, 84, [225]], [324, 84, [135]]] : [[300, 98, [135, 225]]]).map((c, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, c[2].map(b => /*#__PURE__*/React.createElement("path", {
    key: b,
    transform: "rotate(" + (b + camRot).toFixed(1) + " " + c[0] + " " + c[1] + ")",
    d: "M" + (c[0] - 7) + "," + c[1] + " A7,7 0 1,0 " + (c[0] + 7) + "," + c[1] + " Q" + c[0] + "," + (c[1] - 15) + " " + (c[0] - 7) + "," + c[1] + " Z",
    fill: b === 135 ? "#D6A93A" : "#E0B860",
    stroke: "#6E5420",
    opacity: c[2].length > 1 && b === 225 ? 0.85 : 1
  })), /*#__PURE__*/React.createElement("circle", {
    cx: c[0],
    cy: c[1],
    r: "2.2",
    fill: "#6E5420"
  })))), /*#__PURE__*/React.createElement("line", {
    x1: "300",
    y1: pinY,
    x2: cpX,
    y2: cpY,
    stroke: "#9AA3AB",
    strokeWidth: "11",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "300",
    y1: pinY,
    x2: cpX,
    y2: cpY,
    stroke: "#C9D0D6",
    strokeWidth: "4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "270",
    y: top,
    width: "60",
    height: "34",
    rx: "3",
    fill: "url(#eg-alu)",
    stroke: "#4E555C"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "270",
    y1: top + 5,
    x2: "330",
    y2: top + 5,
    stroke: "#4E555C",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "270",
    y1: top + 9,
    x2: "330",
    y2: top + 9,
    stroke: "#4E555C",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "300",
    cy: pinY,
    r: "4",
    fill: "#4E555C"
  }), /*#__PURE__*/React.createElement("g", {
    transform: "rotate(" + (phi % 360).toFixed(1) + " 300 300)"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "300",
    cy: "300",
    r: "30",
    fill: "rgba(40,44,49,.92)",
    stroke: "#8A9199",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M276,306 A26,26 0 0,0 324,306 Z",
    fill: "#5E666E"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "300",
    cy: "278",
    r: "6",
    fill: "#C9D0D6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "300",
    cy: "300",
    r: "5",
    fill: "#8A9199"
  }))), /*#__PURE__*/React.createElement("g", {
    className: "phase-bar",
    transform: "translate(300 58)"
  }, phases.map((p, i) => {
    const w = two ? 190 : 98,
      x = (i - (phases.length - 1) / 2) * (w + 6) - w / 2;
    return /*#__PURE__*/React.createElement("g", {
      key: p
    }, /*#__PURE__*/React.createElement("rect", {
      x: x,
      y: "-14",
      width: w,
      height: "26",
      rx: "13",
      className: i === active ? "ph on" : "ph"
    }), /*#__PURE__*/React.createElement("text", {
      x: x + w / 2,
      y: "4",
      textAnchor: "middle",
      className: i === active ? "ph-t on" : "ph-t"
    }, p));
  })));
}
function Bolt({
  x,
  y,
  r,
  rot
}) {
  const R = r || 3.4,
    pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 + (rot || 0)) * Math.PI / 180;
    pts.push((x + R * Math.cos(a)).toFixed(1) + "," + (y + R * Math.sin(a)).toFixed(1));
  }
  return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("polygon", {
    points: pts.join(" "),
    fill: "url(#eg-bolt)",
    stroke: "#3B4248",
    strokeWidth: ".8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: x,
    cy: y,
    r: R * 0.42,
    fill: "#4A5158"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: x - R * 0.3,
    cy: y - R * 0.35,
    r: R * 0.22,
    fill: "rgba(255,255,255,.7)"
  }));
}
function WormClamp({
  x,
  y,
  h,
  w
}) {
  return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: x,
    y: y,
    width: w || 5,
    height: h,
    rx: "1.5",
    fill: "url(#eg-steel)",
    stroke: "#4E555C",
    strokeWidth: ".6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: x - 2,
    y: y - 4,
    width: (w || 5) + 4,
    height: "5",
    rx: "1.5",
    fill: "url(#eg-steel)",
    stroke: "#4E555C",
    strokeWidth: ".6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: x + (w || 5) / 2,
    y1: y - 3.5,
    x2: x + (w || 5) / 2,
    y2: y,
    stroke: "#4E555C",
    strokeWidth: ".8"
  }));
}
function Fin({
  x,
  y,
  w,
  h,
  i
}) {
  return /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: x,
    y: y + 1.2,
    width: w,
    height: h,
    rx: h / 2,
    fill: "rgba(0,0,0,.45)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: x,
    y: y,
    width: w,
    height: h,
    rx: h / 2,
    fill: "url(#eg-fin)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: x + 3,
    y: y + 0.3,
    width: w - 6,
    height: "1.4",
    rx: ".7",
    fill: "rgba(255,255,255,.32)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: x + w - 10,
    y: y + 1,
    width: "7",
    height: h - 2,
    rx: "1",
    fill: "rgba(255,255,255,.08)"
  }));
}
function EngineSVG({
  eng,
  sel,
  onSel,
  running,
  xray,
  rpm
}) {
  const g = eng.groups,
    has = k => g.indexOf(k) >= 0;
  const horiz = has("horiz"),
    liq = has("liquid"),
    two = eng.stroke === "2T",
    dohc = has("dohc"),
    ohv = has("cg"),
    efi = has("efi");
  const filterCover = has("zs4v") || dohc || has("cb") || has("jp");
  const inst = eng.installed || [];
  const elec = /Электро|электро/.test(eng.start),
    kick = /Кик|кик/.test(eng.start);
  const a = engAngle(eng);
  const hl = id => "pa" + (sel === id ? " on" : "") + (xray && (id === "cyl" || id === "head") ? " ghost" : "");
  const click = id => e => {
    e.stopPropagation();
    onSel(id);
  };
  const pins = enginePins(eng);
  const stub = rotP(two ? 222 : 216, two ? 218 : 146, a);
  const exFill = inst.indexOf("full") >= 0 ? "url(#eg-ti)" : "url(#eg-chrome)";
  const muffFill = inst.indexOf("slip") >= 0 || inst.indexOf("full") >= 0 || inst.indexOf("silencer2t") >= 0 ? "url(#eg-carbon)" : "url(#eg-chrome)";
  const outlet = rotP(232, 174, a),
    headFront = rotP(250, 136, a);
  const carbTop = rotP(two ? 386 : 402, two ? 172 : 82, a),
    carbSide = rotP(two ? 410 : 424, two ? 214 : 132, a),
    carbBowl = rotP(two ? 386 : 402, two ? 266 : 176, a);
  const vcTop = rotP(330, 82, a);
  let pipe;
  if (two) pipe = "M" + stub[0] + "," + stub[1] + " C" + (stub[0] - 50) + "," + (stub[1] + 40) + " 150,330 205,392 C 250,420 330,414 400,404 L 472,396";else if (horiz) pipe = "M" + stub[0] + "," + stub[1] + " C" + (stub[0] - 14) + "," + (stub[1] + 50) + " 205,404 290,406 L 472,398";else pipe = "M" + stub[0] + "," + stub[1] + " C 168,190 158,262 182,330 C 202,388 258,404 330,405 L 472,398";
  const shakeDur = rpm < 2500 ? "0.11s" : rpm < 5500 ? "0.07s" : "0.045s";
  const puffDur = rpm < 2500 ? "1.6s" : rpm < 5500 ? "1.05s" : "0.7s";
  const caseD = "M170,250 C200,232 260,228 300,232 L420,236 C460,240 486,262 488,300 C490,340 470,372 430,380 L230,384 C190,384 158,360 152,320 C148,290 152,262 170,250 Z";
  return /*#__PURE__*/React.createElement("svg", {
    className: "engine-svg" + (running ? " running" : "") + (xray ? " xray" : ""),
    viewBox: "22 30 650 406",
    role: "img",
    "aria-label": "Схема двигателя " + eng.code,
    onClick: () => onSel(null),
    style: {
      "--shake": shakeDur,
      "--puff": puffDur
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-alu",
    x1: "0",
    y1: "0",
    x2: ".25",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#F7F8F9"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".22",
    stopColor: "#DCE0E4"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".5",
    stopColor: "#B4BBC2"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".78",
    stopColor: "#8D969E"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#6C757D"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "eg-cover",
    cx: ".34",
    cy: ".28",
    r: ".8"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#FFFFFF"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".18",
    stopColor: "#E9ECEF"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".55",
    stopColor: "#B8BFC6"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".85",
    stopColor: "#848D96"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#666F78"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "eg-bolt",
    cx: ".35",
    cy: ".3",
    r: ".8"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#FFFFFF"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".5",
    stopColor: "#B9C0C6"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#6B737B"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-steel",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#E9EDF0"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".5",
    stopColor: "#9EA6AD"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#6B737B"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-fin",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#5A6168"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".45",
    stopColor: "#353A40"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#1A1D21"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-chrome",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#FAFBFC"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".3",
    stopColor: "#D3D8DC"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".45",
    stopColor: "#8E969D"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".55",
    stopColor: "#4F565D"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".75",
    stopColor: "#B5BCC2"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#E6E9EC"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-heatpipe",
    gradientUnits: "userSpaceOnUse",
    x1: stub[0],
    y1: stub[1],
    x2: horiz ? stub[0] + 150 : stub[0] - 40,
    y2: horiz ? stub[1] + 40 : stub[1] + 140
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#C89A5A"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".25",
    stopColor: "#7C5BA6"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".5",
    stopColor: "#4C78B5"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".8",
    stopColor: "#9AA3AB",
    stopOpacity: "0"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-ti",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#D9B36C"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".35",
    stopColor: "#8F6BB0"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".7",
    stopColor: "#4D7FC4"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#A9B6C9"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-carbon",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#50565C"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".5",
    stopColor: "#1E2226"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#3A3F45"
  })), /*#__PURE__*/React.createElement("pattern", {
    id: "eg-weave",
    width: "6",
    height: "6",
    patternUnits: "userSpaceOnUse",
    patternTransform: "rotate(45)"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "3",
    height: "6",
    fill: "rgba(255,255,255,.06)"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-brass",
    x1: "0",
    y1: "0",
    x2: ".3",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#F8E6AE"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".3",
    stopColor: "#DDBB6A"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".65",
    stopColor: "#B08A3A"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#7C5F22"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-rubber",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#4A5056"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".4",
    stopColor: "#2A2E33"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#15181B"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-red",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#C2392F"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".5",
    stopColor: "#9A2A22"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#6E1B16"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-ceramic",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#FFFFFF"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#C9CED3"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-pod",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#D8452F"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#8E2318"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "eg-spark"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#FFFFFF"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".35",
    stopColor: "#FFFFFF"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "rgba(255,140,40,0)"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "eg-smoke"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "rgba(200,205,210,.55)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "rgba(200,205,210,0)"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "eg-smoke2t"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "rgba(150,180,230,.6)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "rgba(150,180,230,0)"
  })), /*#__PURE__*/React.createElement("radialGradient", {
    id: "eg-ao",
    cx: ".5",
    cy: ".5",
    r: ".5"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: ".6",
    stopColor: "rgba(0,0,0,0)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "rgba(0,0,0,.35)"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-heat",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "rgba(147,197,253,.85)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "rgba(147,197,253,0)"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: "eg-glass",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#B8D3E3"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".55",
    stopColor: "#6E95AD"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".56",
    stopColor: "#C99A3A"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#8A6420"
  })), /*#__PURE__*/React.createElement("pattern", {
    id: "eg-mesh",
    width: "6",
    height: "6",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0 0L6 6M6 0L0 6",
    stroke: "rgba(255,255,255,.18)",
    strokeWidth: ".8"
  })), /*#__PURE__*/React.createElement("pattern", {
    id: "eg-cast",
    width: "5",
    height: "5",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "1",
    cy: "1",
    r: ".55",
    fill: "rgba(0,0,0,.08)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "3.5",
    cy: "3",
    r: ".45",
    fill: "rgba(255,255,255,.13)"
  })), /*#__PURE__*/React.createElement("pattern", {
    id: "eg-brush",
    width: "200",
    height: "3",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "200",
    height: "1",
    fill: "rgba(255,255,255,.12)"
  }), /*#__PURE__*/React.createElement("rect", {
    y: "1.5",
    width: "200",
    height: ".6",
    fill: "rgba(0,0,0,.05)"
  })), /*#__PURE__*/React.createElement("pattern", {
    id: "eg-knurl",
    width: "3",
    height: "3",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0 0L3 3M3 0L0 3",
    stroke: "rgba(0,0,0,.35)",
    strokeWidth: ".6"
  })), /*#__PURE__*/React.createElement("pattern", {
    id: "eg-perf",
    width: "7",
    height: "7",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "7",
    height: "7",
    fill: "#9BA3AA"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "3.5",
    cy: "3.5",
    r: "1.6",
    fill: "#2B2F34"
  })), /*#__PURE__*/React.createElement("pattern", {
    id: "eg-radfins",
    width: "4",
    height: "5",
    patternUnits: "userSpaceOnUse"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "4",
    height: "5",
    fill: "#2B3036"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "4",
    height: "1.4",
    fill: "#4A525B"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "eg-soft",
    x: "-50%",
    y: "-50%",
    width: "200%",
    height: "200%"
  }, /*#__PURE__*/React.createElement("feGaussianBlur", {
    stdDeviation: "2.2"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "eg-ds",
    x: "-20%",
    y: "-20%",
    width: "140%",
    height: "150%"
  }, /*#__PURE__*/React.createElement("feDropShadow", {
    dx: "0",
    dy: "3",
    stdDeviation: "3",
    floodColor: "#000",
    floodOpacity: ".45"
  })), /*#__PURE__*/React.createElement("filter", {
    id: "eg-ds2",
    x: "-20%",
    y: "-20%",
    width: "140%",
    height: "150%"
  }, /*#__PURE__*/React.createElement("feDropShadow", {
    dx: "0",
    dy: "1.5",
    stdDeviation: "1.2",
    floodColor: "#000",
    floodOpacity: ".5"
  }))), /*#__PURE__*/React.createElement("g", {
    className: "frame",
    fill: "none",
    stroke: "rgba(255,255,255,.045)",
    strokeWidth: "12",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M110,20 L192,236"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M540,40 C 530,140 520,220 506,300"
  })), /*#__PURE__*/React.createElement("ellipse", {
    cx: "320",
    cy: "424",
    rx: "250",
    ry: "11",
    fill: "rgba(0,0,0,.45)"
  }), /*#__PURE__*/React.createElement("g", {
    className: "lines",
    fill: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M" + carbTop[0] + "," + carbTop[1] + " C " + (carbTop[0] + 10) + "," + (carbTop[1] - 30) + " 470,40 500,24",
    stroke: "#111316",
    strokeWidth: "3.4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M" + (carbTop[0] + 6) + "," + carbTop[1] + " C " + (carbTop[0] + 20) + "," + (carbTop[1] - 26) + " 482,46 516,30",
    stroke: "#111316",
    strokeWidth: "3.4"
  }), !efi && /*#__PURE__*/React.createElement("path", {
    d: "M" + carbSide[0] + "," + carbSide[1] + " C " + (carbSide[0] + 30) + "," + (carbSide[1] - 10) + " 440,70 404,34",
    stroke: "rgba(255,190,120,.55)",
    strokeWidth: "4.5"
  }), !efi && /*#__PURE__*/React.createElement("g", {
    transform: "rotate(-48 435 73)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "430",
    y: "60",
    width: "11",
    height: "26",
    rx: "5.5",
    fill: "rgba(255,210,150,.3)",
    stroke: "rgba(255,255,255,.45)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "432",
    y: "64",
    width: "7",
    height: "18",
    rx: "3",
    fill: "url(#eg-mesh)"
  })), efi && /*#__PURE__*/React.createElement("path", {
    d: "M" + (carbSide[0] - 20) + "," + (carbSide[1] - 24) + " C 430,70 420,50 404,34",
    stroke: "#1E2226",
    strokeWidth: "5"
  }), !two && /*#__PURE__*/React.createElement("path", {
    d: "M" + vcTop[0] + "," + vcTop[1] + " C " + (vcTop[0] + 20) + "," + (vcTop[1] - 40) + " 380,40 400,30",
    stroke: "#202428",
    strokeWidth: "5.5"
  }), !efi && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M" + carbBowl[0] + "," + carbBowl[1] + " L" + (carbBowl[0] - 2) + "," + (carbBowl[1] + 44),
    stroke: "rgba(255,255,255,.28)",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M" + (carbBowl[0] + 6) + "," + carbBowl[1] + " L" + (carbBowl[0] + 6) + "," + (carbBowl[1] + 38),
    stroke: "rgba(255,255,255,.18)",
    strokeWidth: "2"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M200,276 C 170,250 150,236 132,200",
    stroke: "#D4B13C",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M206,274 C 178,248 158,232 140,196",
    stroke: "#E8E8E8",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M212,273 C 186,246 166,228 148,192",
    stroke: "#5BAE6A",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M132,200 L120,176",
    stroke: "#1E2226",
    strokeWidth: "7"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "110",
    y: "160",
    width: "18",
    height: "14",
    rx: "2",
    fill: "#2A2E33",
    stroke: "#111"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M330,372 C 300,396 240,400 200,390",
    stroke: "#3C7BD9",
    strokeWidth: "1.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M452,250 C 486,234 506,196 548,168",
    stroke: "#111316",
    strokeWidth: "3.4"
  })), /*#__PURE__*/React.createElement("g", {
    className: "body"
  }, liq && /*#__PURE__*/React.createElement("g", {
    className: hl("cooling"),
    onClick: click("cooling"),
    filter: "url(#eg-ds)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "40",
    y: "110",
    width: "78",
    height: "152",
    rx: "8",
    fill: "url(#eg-radfins)",
    stroke: "#59616A",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "40",
    y: "110",
    width: "78",
    height: "152",
    rx: "8",
    fill: "url(#eg-ao)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "40",
    y: "110",
    width: "78",
    height: "14",
    rx: "6",
    fill: "url(#eg-alu)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "40",
    y: "248",
    width: "78",
    height: "14",
    rx: "6",
    fill: "url(#eg-alu)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "79",
    cy: "104",
    r: "8",
    fill: "url(#eg-cover)",
    stroke: "#6B737B"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "79",
    cy: "104",
    r: "8",
    fill: "url(#eg-knurl)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M" + outlet[0] + "," + outlet[1] + " C 160," + (outlet[1] - 10) + " 140,128 118,130",
    fill: "none",
    stroke: "url(#eg-rubber)",
    strokeWidth: "11",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M325,372 C 250,392 150,330 118,252",
    fill: "none",
    stroke: "#24282C",
    strokeWidth: "10",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement(WormClamp, {
    x: 112,
    y: 124,
    h: 13,
    w: 6
  }), /*#__PURE__*/React.createElement(WormClamp, {
    x: 112,
    y: 246,
    h: 13,
    w: 6
  }), inst.indexOf("fan") >= 0 && /*#__PURE__*/React.createElement("circle", {
    cx: "79",
    cy: "186",
    r: "26",
    fill: "none",
    stroke: "#E5E7EB",
    strokeWidth: "2",
    strokeDasharray: "6 5",
    opacity: ".8",
    className: running ? "spin" : ""
  })), !liq && inst.indexOf("oilcool") >= 0 && /*#__PURE__*/React.createElement("g", {
    className: hl("cooling"),
    onClick: click("cooling"),
    filter: "url(#eg-ds)"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M" + headFront[0] + "," + headFront[1] + " C 160,130 130,110 126,96",
    fill: "none",
    stroke: "#24282C",
    strokeWidth: "5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "54",
    y: "58",
    width: "74",
    height: "42",
    rx: "6",
    fill: "url(#eg-radfins)",
    stroke: "#59616A",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "54",
    y: "54",
    width: "74",
    height: "8",
    rx: "3",
    fill: "url(#eg-alu)"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 60,
    y: 58,
    r: 2.6
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 122,
    y: 58,
    r: 2.6
  })), /*#__PURE__*/React.createElement("g", {
    className: hl("gearbox"),
    onClick: click("gearbox")
  }, /*#__PURE__*/React.createElement("path", {
    d: "M470,244 L640,232",
    stroke: "#2C3036",
    strokeWidth: "7",
    strokeDasharray: "5 3",
    className: running ? "chain-run" : ""
  }), /*#__PURE__*/React.createElement("path", {
    d: "M470,280 L640,292",
    stroke: "#2C3036",
    strokeWidth: "7",
    strokeDasharray: "5 3",
    className: running ? "chain-run" : ""
  }), /*#__PURE__*/React.createElement("path", {
    d: gearPath(470, 262, 19, 14),
    fill: "#4E555C",
    stroke: "#1C2023",
    strokeWidth: "1.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "470",
    cy: "262",
    r: "12",
    fill: "#3A4046"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "470",
    cy: "262",
    r: "7",
    fill: "#2A2E33"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 470,
    y: 262,
    r: 4
  })), /*#__PURE__*/React.createElement("g", {
    className: hl("exhaust"),
    onClick: click("exhaust")
  }, two ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: pipe,
    fill: "none",
    stroke: "#24282C",
    strokeWidth: "31",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: pipe,
    fill: "none",
    stroke: exFill,
    strokeWidth: "27",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: pipe,
    fill: "none",
    stroke: "url(#eg-heatpipe)",
    strokeWidth: "27",
    strokeLinecap: "round",
    opacity: ".7"
  }), /*#__PURE__*/React.createElement("path", {
    d: pipe,
    fill: "none",
    stroke: "rgba(255,255,255,.4)",
    strokeWidth: "3",
    strokeLinecap: "round",
    transform: "translate(0,-8)"
  }), /*#__PURE__*/React.createElement("path", {
    d: pipe,
    fill: "none",
    stroke: "rgba(0,0,0,.25)",
    strokeWidth: "1",
    strokeDasharray: "1 34"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: pipe,
    fill: "none",
    stroke: "#24282C",
    strokeWidth: "17",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: pipe,
    fill: "none",
    stroke: exFill,
    strokeWidth: "13",
    strokeLinecap: "round"
  }), inst.indexOf("full") < 0 && /*#__PURE__*/React.createElement("path", {
    d: pipe,
    fill: "none",
    stroke: "url(#eg-heatpipe)",
    strokeWidth: "13",
    strokeLinecap: "round",
    opacity: ".75"
  }), /*#__PURE__*/React.createElement("path", {
    d: pipe,
    fill: "none",
    stroke: "rgba(255,255,255,.45)",
    strokeWidth: "2",
    strokeLinecap: "round",
    transform: "translate(0,-4)"
  }), !horiz && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M176,250 C 172,280 176,306 186,330",
    fill: "none",
    stroke: "url(#eg-perf)",
    strokeWidth: "19",
    strokeLinecap: "round",
    opacity: ".92"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 175,
    y: 262,
    r: 2.4
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 183,
    y: 322,
    r: 2.4
  }))), /*#__PURE__*/React.createElement("path", {
    d: pipe,
    fill: "none",
    stroke: "url(#eg-heat)",
    strokeWidth: "14",
    strokeLinecap: "round",
    className: "heat"
  }), /*#__PURE__*/React.createElement("g", {
    transform: "rotate(-7 540 394)",
    filter: "url(#eg-ds2)"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M476,404 L470,422",
    stroke: "#2A2E33",
    strokeWidth: "5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "462",
    y: "418",
    width: "18",
    height: "6",
    rx: "2",
    fill: "#2A2E33"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "468",
    y: "376",
    width: "140",
    height: "34",
    rx: "16",
    fill: muffFill,
    stroke: "#24282C",
    strokeWidth: "2"
  }), muffFill === "url(#eg-carbon)" && /*#__PURE__*/React.createElement("rect", {
    x: "468",
    y: "376",
    width: "140",
    height: "34",
    rx: "16",
    fill: "url(#eg-weave)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "482",
    y: "380",
    width: "110",
    height: "5",
    rx: "2.5",
    fill: "rgba(255,255,255,.32)"
  }), [492, 584].map(x => /*#__PURE__*/React.createElement("g", {
    key: x
  }, /*#__PURE__*/React.createElement("rect", {
    x: x,
    y: "374",
    width: "5",
    height: "38",
    rx: "2",
    fill: "#2B2F34",
    opacity: ".75"
  }), [380, 393, 406].map(y => /*#__PURE__*/React.createElement("circle", {
    key: y,
    cx: x + 2.5,
    cy: y,
    r: "1.1",
    fill: "#9BA3AA"
  })))), /*#__PURE__*/React.createElement("path", {
    d: "M600,384 L604,384 M600,402 L604,402",
    stroke: "#2B2F34",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "598",
    y: "383",
    width: "20",
    height: "20",
    rx: "5",
    fill: "url(#eg-alu)",
    stroke: "#24282C"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "618",
    cy: "393",
    r: "5.5",
    fill: "#141619"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "617",
    cy: "391.5",
    r: "2",
    fill: "rgba(255,255,255,.15)"
  })), running && /*#__PURE__*/React.createElement("circle", {
    cx: "618",
    cy: "393",
    r: "6",
    fill: "#93C5FD",
    className: "exflick"
  })), /*#__PURE__*/React.createElement("g", {
    filter: "url(#eg-ds)"
  }, /*#__PURE__*/React.createElement("path", {
    d: caseD,
    fill: "url(#eg-alu)",
    stroke: "#545C64",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: caseD,
    fill: "url(#eg-cast)"
  }), /*#__PURE__*/React.createElement("path", {
    d: caseD,
    fill: "url(#eg-ao)",
    opacity: ".7"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M176,258 C210,242 260,240 300,242 L416,246",
    fill: "none",
    stroke: "rgba(255,255,255,.65)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M158,330 C 200,346 400,348 482,322",
    fill: "none",
    stroke: "rgba(0,0,0,.14)",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M164,300 C 190,296 236,294 262,296",
    fill: "none",
    stroke: "rgba(0,0,0,.1)",
    strokeWidth: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M338,296 C 346,296 352,300 356,306",
    fill: "none",
    stroke: "rgba(255,255,255,.3)",
    strokeWidth: "2"
  }), [[176, 250], [478, 340], [300, 384]].map((p, i) => /*#__PURE__*/React.createElement("g", {
    key: i
  }, /*#__PURE__*/React.createElement("path", {
    d: "M" + (p[0] - 12) + "," + (p[1] - 7) + " l24,0 l0,14 l-24,0 Z",
    fill: "url(#eg-steel)",
    stroke: "#3B4248",
    opacity: ".9"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: p[0],
    y: p[1],
    r: 4.4
  }))), filterCover && /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "300",
    cy: "300",
    r: "17",
    fill: "url(#eg-cover)",
    stroke: "#545C64",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "300",
    cy: "300",
    r: "10",
    fill: "none",
    stroke: "rgba(0,0,0,.15)"
  }), [0, 120, 240].map(d => {
    const r = d * Math.PI / 180;
    return /*#__PURE__*/React.createElement(Bolt, {
      key: d,
      x: 300 + 13 * Math.cos(r - 1.2),
      y: 300 + 13 * Math.sin(r - 1.2),
      r: 2.6
    });
  })), /*#__PURE__*/React.createElement("text", {
    x: "432",
    y: "228",
    textAnchor: "middle",
    className: "eng-emb"
  }, "OIL"), [[180, 286, 216, 276], [182, 352, 214, 366], [452, 266, 474, 288], [450, 350, 470, 330]].map((l, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: "M" + l[0] + "," + l[1] + " Q" + ((l[0] + l[2]) / 2 + 6) + "," + ((l[1] + l[3]) / 2 - 6) + " " + l[2] + "," + l[3],
    fill: "none",
    stroke: "rgba(0,0,0,.12)",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  })), /*#__PURE__*/React.createElement("text", {
    x: liq ? 286 : 300,
    y: "362",
    textAnchor: "middle",
    className: "eng-stamp",
    style: liq ? {
      fontSize: "11px"
    } : null
  }, eng.code), /*#__PURE__*/React.createElement("text", {
    x: liq ? 286 : 300,
    y: "362",
    textAnchor: "middle",
    className: "eng-stamp-hi",
    style: liq ? {
      fontSize: "11px"
    } : null
  }, eng.code), elec && /*#__PURE__*/React.createElement("g", {
    className: hl("gen"),
    onClick: click("gen"),
    filter: "url(#eg-ds2)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "334",
    y: "216",
    width: "58",
    height: "24",
    rx: "12",
    fill: "url(#eg-fin)",
    stroke: "#1C2023"
  }), [344, 352, 360].map(x => /*#__PURE__*/React.createElement("rect", {
    key: x,
    x: x,
    y: "217",
    width: "2",
    height: "22",
    fill: "rgba(255,255,255,.12)"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "390",
    cy: "228",
    r: "12",
    fill: "url(#eg-cover)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 390,
    y: 228,
    r: 3
  }), /*#__PURE__*/React.createElement("path", {
    d: "M340,222 C 330,212 320,212 312,218",
    fill: "none",
    stroke: "#B4342B",
    strokeWidth: "3.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "338",
    cy: "223",
    r: "2.4",
    fill: "#C9A24E"
  })), /*#__PURE__*/React.createElement("g", {
    className: hl("oil"),
    onClick: click("oil")
  }, /*#__PURE__*/React.createElement("rect", {
    x: "291",
    y: "379",
    width: "18",
    height: "11",
    rx: "2",
    fill: "url(#eg-bolt)",
    stroke: "#3B4248"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "289",
    y: "377",
    width: "22",
    height: "3",
    rx: "1",
    fill: "#C38B3E"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "425",
    y: "246",
    width: "14",
    height: "10",
    rx: "3",
    fill: "#2A2E33"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "419",
    y: "238",
    width: "26",
    height: "9",
    rx: "3",
    fill: "url(#eg-alu)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "419",
    y: "238",
    width: "26",
    height: "9",
    rx: "3",
    fill: "url(#eg-knurl)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "428",
    y: "232",
    width: "8",
    height: "7",
    rx: "2",
    fill: "url(#eg-alu)",
    stroke: "#545C64"
  })), /*#__PURE__*/React.createElement("g", {
    className: hl("gen"),
    onClick: click("gen"),
    filter: "url(#eg-ds2)"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "215",
    cy: "318",
    r: "47",
    fill: "url(#eg-cover)",
    stroke: "#545C64",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "215",
    cy: "318",
    r: "47",
    fill: "url(#eg-brush)",
    opacity: ".5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "215",
    cy: "318",
    r: "33",
    fill: "none",
    stroke: "rgba(0,0,0,.2)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "215",
    cy: "318",
    r: "34.5",
    fill: "none",
    stroke: "rgba(255,255,255,.35)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M184,296 A38,38 0 0,1 236,284",
    fill: "none",
    stroke: "rgba(255,255,255,.8)",
    strokeWidth: "3",
    strokeLinecap: "round"
  }), [0, 1, 2, 3, 4, 5].map(i => {
    const an = i * Math.PI / 3 + .3;
    return /*#__PURE__*/React.createElement(Bolt, {
      key: i,
      x: 215 + 41 * Math.cos(an),
      y: 318 + 41 * Math.sin(an),
      r: 3.2,
      rot: i * 13
    });
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "215",
    cy: "318",
    r: "9",
    fill: "url(#eg-alu)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M210,318 L220,318",
    stroke: "#3B4248",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "238",
    cy: "300",
    r: "6",
    fill: "url(#eg-alu)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M235,300 L241,300",
    stroke: "#3B4248",
    strokeWidth: "1.8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "196",
    cy: "362",
    r: "7",
    fill: "url(#eg-steel)",
    stroke: "#3B4248"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M193,366 L136,384",
    stroke: "url(#eg-fin)",
    strokeWidth: "8",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "124",
    y: "378",
    width: "20",
    height: "11",
    rx: "4",
    fill: "#1E2125",
    transform: "rotate(-16 133 383)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "126",
    y: "380",
    width: "16",
    height: "7",
    rx: "3",
    fill: "url(#eg-knurl)",
    transform: "rotate(-16 133 383)"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 196,
    y: 362,
    r: 2.6
  })), /*#__PURE__*/React.createElement("g", {
    className: hl("clutch"),
    onClick: click("clutch"),
    filter: "url(#eg-ds2)"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "400",
    cy: "308",
    r: "62",
    fill: "url(#eg-cover)",
    stroke: "#545C64",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "400",
    cy: "308",
    r: "62",
    fill: "url(#eg-brush)",
    opacity: ".45"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "400",
    cy: "308",
    r: "42",
    fill: "url(#eg-cover)",
    stroke: "rgba(0,0,0,.22)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "400",
    cy: "308",
    r: "43.5",
    fill: "none",
    stroke: "rgba(255,255,255,.35)",
    strokeWidth: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M358,282 A50,50 0 0,1 430,262",
    fill: "none",
    stroke: "rgba(255,255,255,.85)",
    strokeWidth: "3",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M440,330 A50,50 0 0,1 400,358",
    fill: "none",
    stroke: "rgba(0,0,0,.15)",
    strokeWidth: "3",
    strokeLinecap: "round"
  }), [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
    const an = i * Math.PI * 2 / 9;
    return /*#__PURE__*/React.createElement(Bolt, {
      key: i,
      x: 400 + 54 * Math.cos(an),
      y: 308 + 54 * Math.sin(an),
      r: 3.2,
      rot: i * 17
    });
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "372",
    cy: "350",
    r: "8.5",
    fill: "url(#eg-alu)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "372",
    cy: "350",
    r: "6",
    fill: "url(#eg-glass)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M366,347 L378,347 M366,353 L378,353",
    stroke: "rgba(255,255,255,.7)",
    strokeWidth: ".8"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "440",
    y: "246",
    width: "18",
    height: "7",
    rx: "3",
    fill: "url(#eg-alu)",
    stroke: "#545C64",
    transform: "rotate(-30 448 250)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "450",
    y: "244",
    width: "10",
    height: "5",
    rx: "2",
    fill: "url(#eg-steel)",
    transform: "rotate(-30 455 246)"
  }), kick && /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "451",
    cy: "296",
    r: "7",
    fill: "url(#eg-steel)",
    stroke: "#3B4248"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "446",
    y: "292",
    width: "10",
    height: "72",
    rx: "5",
    fill: "url(#eg-fin)",
    transform: "rotate(-24 451 296)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "462",
    y: "350",
    width: "22",
    height: "10",
    rx: "4",
    fill: "#1E2125",
    transform: "rotate(-24 451 296)"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 451,
    y: 296,
    r: 2.6
  }))), liq && /*#__PURE__*/React.createElement("g", {
    className: hl("cooling"),
    onClick: click("cooling"),
    filter: "url(#eg-ds2)"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "338",
    cy: "370",
    r: "16",
    fill: "url(#eg-cover)",
    stroke: "#545C64",
    strokeWidth: "1.5"
  }), [0, 120, 240].map(d => {
    const r = d * Math.PI / 180;
    return /*#__PURE__*/React.createElement(Bolt, {
      key: d,
      x: 338 + 11 * Math.cos(r),
      y: 370 + 11 * Math.sin(r),
      r: 2
    });
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "338",
    cy: "370",
    r: "4",
    fill: "#545C64"
  }), /*#__PURE__*/React.createElement(WormClamp, {
    x: 316,
    y: 362,
    h: 13,
    w: 5
  })), inst.indexOf("skid") >= 0 && /*#__PURE__*/React.createElement("g", {
    opacity: ".97",
    filter: "url(#eg-ds2)"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M150,390 L474,390 L456,414 L172,414 Z",
    fill: "url(#eg-alu)",
    stroke: "#545C64",
    strokeWidth: "1.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M150,390 L474,390 L456,414 L172,414 Z",
    fill: "url(#eg-brush)"
  }), [210, 260, 310, 360, 410].map(x => /*#__PURE__*/React.createElement("ellipse", {
    key: x,
    cx: x,
    cy: "402",
    rx: "7",
    ry: "5",
    fill: "#3B4248"
  }))), /*#__PURE__*/React.createElement("g", {
    transform: "rotate(" + a + " 300 300)"
  }, /*#__PURE__*/React.createElement("g", {
    className: hl("cyl"),
    onClick: click("cyl")
  }, /*#__PURE__*/React.createElement("rect", {
    x: "264",
    y: "150",
    width: "72",
    height: "92",
    fill: "#16191C"
  }), liq ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "256",
    y: "150",
    width: "88",
    height: "90",
    rx: "10",
    fill: "url(#eg-alu)",
    stroke: "#545C64",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "256",
    y: "150",
    width: "88",
    height: "90",
    rx: "10",
    fill: "url(#eg-cast)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "256",
    y: "150",
    width: "88",
    height: "90",
    rx: "10",
    fill: "url(#eg-ao)",
    opacity: ".6"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "262",
    y: "160",
    width: "76",
    height: "3",
    rx: "1.5",
    fill: "rgba(255,255,255,.55)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "226",
    y: "166",
    width: "36",
    height: "15",
    rx: "6",
    fill: "url(#eg-rubber)"
  }), /*#__PURE__*/React.createElement(WormClamp, {
    x: 244,
    y: 164,
    h: 19,
    w: 5
  })) : [0, 1, 2, 3, 4, 5, 6, 7].map(i => /*#__PURE__*/React.createElement(Fin, {
    key: i,
    x: 240 - i % 2 + i * 0.6,
    y: 152 + i * 11,
    w: 120 + i % 2 * 2 - i * 1.2,
    h: 6.8,
    i: i
  })), /*#__PURE__*/React.createElement("rect", {
    x: "254",
    y: "238",
    width: "92",
    height: "7",
    rx: "2",
    fill: "url(#eg-alu)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M254,245 L346,245",
    stroke: "rgba(0,0,0,.4)",
    strokeWidth: "1.2"
  }), [258, 342].map(x => /*#__PURE__*/React.createElement(Bolt, {
    key: x,
    x: x,
    y: 240,
    r: 3.6
  }))), !two && !liq && !horiz && /*#__PURE__*/React.createElement("g", {
    className: hl("oil"),
    onClick: click("oil")
  }, /*#__PURE__*/React.createElement("path", {
    d: "M354,240 C 372,214 374,178 356,150",
    fill: "none",
    stroke: "#1a1d20",
    strokeWidth: "5",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M354,240 C 372,214 374,178 356,150",
    fill: "none",
    stroke: "url(#eg-chrome)",
    strokeWidth: "3.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 354,
    y: 240,
    r: 3.6
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 356,
    y: 150,
    r: 3.6
  })), !two && /*#__PURE__*/React.createElement("g", {
    className: hl("timing"),
    onClick: click("timing")
  }, /*#__PURE__*/React.createElement("rect", {
    x: liq ? 342 : 336,
    y: "195",
    width: "18",
    height: "18",
    rx: "3",
    fill: "url(#eg-cover)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: liq ? 351 : 345,
    y: 204,
    r: 4.2
  }), ohv && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "340",
    y: "104",
    width: "9",
    height: "134",
    rx: "4",
    fill: "url(#eg-alu)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "339",
    y: "104",
    width: "11",
    height: "6",
    rx: "2",
    fill: "url(#eg-steel)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "339",
    y: "230",
    width: "11",
    height: "6",
    rx: "2",
    fill: "url(#eg-steel)"
  }))), /*#__PURE__*/React.createElement("g", {
    className: hl("head"),
    onClick: click("head")
  }, two ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M248,152 L352,152 C352,124 330,104 300,104 C270,104 248,124 248,152 Z",
    fill: liq ? "url(#eg-alu)" : "url(#eg-fin)",
    stroke: "#545C64",
    strokeWidth: "2"
  }), [0, 1, 2].map(i => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: "M" + (258 + i * 4) + "," + (140 - i * 12) + " L" + (342 - i * 4) + "," + (140 - i * 12),
    stroke: "rgba(0,0,0,.28)",
    strokeWidth: "2"
  })), /*#__PURE__*/React.createElement("path", {
    d: "M262,118 C 278,108 300,106 320,110",
    fill: "none",
    stroke: "rgba(255,255,255,.35)",
    strokeWidth: "2"
  }), [256, 280, 320, 344].map(x => /*#__PURE__*/React.createElement(Bolt, {
    key: x,
    x: x,
    y: 146,
    r: 3.4
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M246,152 L354,152 L358,112 L242,112 Z",
    fill: "url(#eg-alu)",
    stroke: "#545C64",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M246,152 L354,152 L358,112 L242,112 Z",
    fill: "url(#eg-cast)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M248,114 L356,114",
    stroke: "rgba(255,255,255,.5)",
    strokeWidth: "1.5"
  }), !liq && [0, 1, 2].map(i => /*#__PURE__*/React.createElement(Fin, {
    key: i,
    x: 234,
    y: 118 + i * 11,
    w: 132,
    h: 5.4,
    i: i
  })), [250, 350].map(x => /*#__PURE__*/React.createElement("g", {
    key: x
  }, /*#__PURE__*/React.createElement("rect", {
    x: x - 6,
    y: "143",
    width: "12",
    height: "9",
    rx: "1.5",
    fill: "url(#eg-bolt)",
    stroke: "#3B4248"
  }), /*#__PURE__*/React.createElement("rect", {
    x: x - 2,
    y: "140",
    width: "4",
    height: "4",
    fill: "url(#eg-steel)"
  }))), dohc ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "250",
    y: "70",
    width: "100",
    height: "44",
    rx: "14",
    fill: "url(#eg-alu)",
    stroke: "#545C64",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "250",
    y: "70",
    width: "100",
    height: "44",
    rx: "14",
    fill: "url(#eg-brush)",
    opacity: ".6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "276",
    cy: "82",
    r: "13",
    fill: "url(#eg-cover)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "324",
    cy: "82",
    r: "13",
    fill: "url(#eg-cover)",
    stroke: "#545C64"
  }), [[256, 76], [344, 76], [256, 108], [344, 108], [300, 74], [300, 110]].map((b, i) => /*#__PURE__*/React.createElement(Bolt, {
    key: i,
    x: b[0],
    y: b[1],
    r: 2.8
  })), /*#__PURE__*/React.createElement("text", {
    x: "300",
    y: "100",
    textAnchor: "middle",
    className: "eng-tiny"
  }, "DOHC")) : ohv ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "262",
    y: "88",
    width: "76",
    height: "26",
    rx: "9",
    fill: "url(#eg-alu)",
    stroke: "#545C64",
    strokeWidth: "2"
  }), [270, 330].map(x => /*#__PURE__*/React.createElement(Bolt, {
    key: x,
    x: x,
    y: 101,
    r: 3
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "254",
    y: "82",
    width: "92",
    height: "32",
    rx: "11",
    fill: "url(#eg-alu)",
    stroke: "#545C64",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "254",
    y: "82",
    width: "92",
    height: "32",
    rx: "11",
    fill: "url(#eg-brush)",
    opacity: ".6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "280",
    cy: "98",
    r: "9.5",
    fill: "url(#eg-cover)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "320",
    cy: "98",
    r: "9.5",
    fill: "url(#eg-cover)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 280,
    y: 98,
    r: 4,
    rot: 8
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 320,
    y: 98,
    r: 4,
    rot: 22
  }), [[260, 88], [340, 88], [260, 108], [340, 108]].map((b, i) => /*#__PURE__*/React.createElement(Bolt, {
    key: i,
    x: b[0],
    y: b[1],
    r: 2.6
  }))))), /*#__PURE__*/React.createElement("g", {
    className: hl("exhaust"),
    onClick: click("exhaust")
  }, two ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "249",
    y: "189",
    width: "14",
    height: "28",
    rx: "3",
    fill: "url(#eg-cover)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 256,
    y: 194,
    r: 2.4
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 256,
    y: 212,
    r: 2.4
  }), /*#__PURE__*/React.createElement("path", {
    d: "M256,203 C236,203 226,210 222,218",
    fill: "none",
    stroke: exFill,
    strokeWidth: "18",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M248,196 L246,210",
    stroke: "rgba(255,255,255,.35)",
    strokeWidth: "1.5"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "236",
    y: "117",
    width: "14",
    height: "26",
    rx: "3",
    fill: "url(#eg-cover)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 243,
    y: 121,
    r: 2.8
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 243,
    y: 139,
    r: 2.8
  }), /*#__PURE__*/React.createElement("path", {
    d: "M244,130 C230,130 220,136 216,146",
    fill: "none",
    stroke: exFill,
    strokeWidth: "13",
    strokeLinecap: "round"
  }), inst.indexOf("full") < 0 && /*#__PURE__*/React.createElement("path", {
    d: "M244,130 C230,130 220,136 216,146",
    fill: "none",
    stroke: "#B58A4E",
    strokeWidth: "13",
    strokeLinecap: "round",
    opacity: ".45"
  }))), /*#__PURE__*/React.createElement("g", {
    className: hl("spark"),
    onClick: click("spark")
  }, /*#__PURE__*/React.createElement("g", {
    filter: "url(#eg-ds2)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "182",
    y: "128",
    width: "40",
    height: "24",
    rx: "4",
    fill: "url(#eg-fin)",
    stroke: "#1C2023"
  }), [0, 1, 2, 3].map(i => /*#__PURE__*/React.createElement("rect", {
    key: i,
    x: 186 + i * 9,
    y: "131",
    width: "4",
    height: "18",
    rx: "2",
    fill: "rgba(255,255,255,.12)"
  })), /*#__PURE__*/React.createElement("rect", {
    x: "178",
    y: "134",
    width: "5",
    height: "10",
    rx: "1",
    fill: "url(#eg-steel)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "221",
    y: "134",
    width: "5",
    height: "10",
    rx: "1",
    fill: "url(#eg-steel)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "196",
    y: "122",
    width: "12",
    height: "7",
    rx: "2",
    fill: "#2A2E33"
  })), two ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M300,74 C296,40 230,60 212,128",
    fill: "none",
    stroke: "#141619",
    strokeWidth: "4.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "292",
    y: "70",
    width: "16",
    height: "34",
    rx: "7",
    fill: "url(#eg-red)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "295",
    y: "74",
    width: "3",
    height: "24",
    rx: "1.5",
    fill: "rgba(255,255,255,.3)"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M242,80 C220,64 196,96 210,128",
    fill: "none",
    stroke: "#141619",
    strokeWidth: "4.5"
  }), /*#__PURE__*/React.createElement("g", {
    transform: "translate(262 108) rotate(-35)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "-6",
    y: "-2",
    width: "12",
    height: "7",
    fill: "url(#eg-steel)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "-4.5",
    y: "-14",
    width: "9",
    height: "13",
    rx: "2",
    fill: "url(#eg-ceramic)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "-8",
    y: "-40",
    width: "16",
    height: "30",
    rx: "7",
    fill: "url(#eg-red)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "-5",
    y: "-37",
    width: "3",
    height: "22",
    rx: "1.5",
    fill: "rgba(255,255,255,.3)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "-8",
    y: "-24",
    width: "16",
    height: "2",
    fill: "rgba(0,0,0,.25)"
  })))), /*#__PURE__*/React.createElement("g", {
    className: hl("carb"),
    onClick: click("carb"),
    filter: "url(#eg-ds2)"
  }, two ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "334",
    y: "204",
    width: "28",
    height: "28",
    rx: "5",
    fill: "url(#eg-rubber)"
  }), /*#__PURE__*/React.createElement(WormClamp, {
    x: 340,
    y: 202,
    h: 32,
    w: 5
  }), /*#__PURE__*/React.createElement("rect", {
    x: "360",
    y: "198",
    width: "52",
    height: "40",
    rx: "9",
    fill: "url(#eg-brass)",
    stroke: "#6E5420"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "374",
    y: "172",
    width: "24",
    height: "28",
    rx: "6",
    fill: "url(#eg-brass)",
    stroke: "#6E5420"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "376",
    y: "168",
    width: "20",
    height: "6",
    rx: "2",
    fill: "#8A6A2A"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M366,238 L406,238 L403,260 C400,268 372,268 369,260 Z",
    fill: "url(#eg-brass)",
    stroke: "#6E5420"
  }), [370, 400].map(x => /*#__PURE__*/React.createElement("circle", {
    key: x,
    cx: x,
    cy: "246",
    r: "1.8",
    fill: "#6E5420"
  })), /*#__PURE__*/React.createElement("rect", {
    x: "412",
    y: "200",
    width: "42",
    height: "36",
    rx: "7",
    fill: inst.indexOf("filter") >= 0 ? "url(#eg-pod)" : "url(#eg-rubber)"
  })) : efi ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "352",
    y: "118",
    width: "30",
    height: "22",
    rx: "5",
    fill: "url(#eg-rubber)"
  }), /*#__PURE__*/React.createElement(WormClamp, {
    x: 357,
    y: 116,
    h: 26,
    w: 5
  }), /*#__PURE__*/React.createElement("g", {
    transform: "rotate(14 361 106)"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "356",
    y: "92",
    width: "11",
    height: "28",
    rx: "4",
    fill: "#2C3036",
    stroke: "#111"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "358",
    y: "86",
    width: "7",
    height: "7",
    rx: "2",
    fill: "#3C7BD9"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "354",
    y: "100",
    width: "15",
    height: "4",
    fill: "#C9A24E"
  })), /*#__PURE__*/React.createElement("rect", {
    x: "380",
    y: "112",
    width: "42",
    height: "34",
    rx: "8",
    fill: "url(#eg-alu)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "400",
    cy: "129",
    r: "11",
    fill: "url(#eg-cover)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M400,129 L408,122",
    stroke: "#3B4248",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "418",
    y: "121",
    width: "13",
    height: "17",
    rx: "2",
    fill: "#1E2125"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "420",
    y: "124",
    width: "9",
    height: "4",
    rx: "1",
    fill: "#3C7BD9"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "422",
    y: "114",
    width: "44",
    height: "32",
    rx: "6",
    fill: "url(#eg-rubber)"
  }), [434, 446, 458].map(x => /*#__PURE__*/React.createElement("path", {
    key: x,
    d: "M" + x + ",114 L" + x + ",146",
    stroke: "rgba(255,255,255,.08)",
    strokeWidth: "2"
  })), /*#__PURE__*/React.createElement("rect", {
    x: "466",
    y: "106",
    width: "36",
    height: "48",
    rx: "7",
    fill: "#2A2E33",
    stroke: "#444B52"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "350",
    y: "118",
    width: "30",
    height: "22",
    rx: "5",
    fill: "url(#eg-rubber)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M358,118 L358,140 M366,118 L366,140",
    stroke: "rgba(255,255,255,.12)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "348",
    y: "114",
    width: "7",
    height: "30",
    rx: "2",
    fill: "url(#eg-alu)",
    stroke: "#545C64"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 351.5,
    y: 119,
    r: 2.2
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 351.5,
    y: 139,
    r: 2.2
  }), /*#__PURE__*/React.createElement(WormClamp, {
    x: 372,
    y: 116,
    h: 26,
    w: 5
  }), /*#__PURE__*/React.createElement("rect", {
    x: "378",
    y: "110",
    width: "48",
    height: "38",
    rx: "9",
    fill: "url(#eg-brass)",
    stroke: "#6E5420"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "384",
    y: "114",
    width: "36",
    height: "3",
    rx: "1.5",
    fill: "rgba(255,255,255,.4)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "390",
    y: "86",
    width: "24",
    height: "27",
    rx: "6",
    fill: "url(#eg-brass)",
    stroke: "#6E5420"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "392",
    y: "80",
    width: "20",
    height: "8",
    rx: "3",
    fill: "#8A6A2A"
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 396,
    y: 84,
    r: 1.8
  }), /*#__PURE__*/React.createElement(Bolt, {
    x: 408,
    y: 84,
    r: 1.8
  }), /*#__PURE__*/React.createElement("rect", {
    x: "399",
    y: "70",
    width: "6",
    height: "11",
    rx: "1.5",
    fill: "url(#eg-steel)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "397",
    y: "74",
    width: "10",
    height: "3",
    rx: "1",
    fill: "#4E555C"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M384,148 L420,148 L417,168 C414,177 390,177 387,168 Z",
    fill: "url(#eg-brass)",
    stroke: "#6E5420"
  }), [[388, 151], [416, 151], [390, 166], [414, 166]].map((b, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: b[0],
    cy: b[1],
    r: "1.8",
    fill: "#6E5420",
    stroke: "#F4DE9C",
    strokeWidth: ".4"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "402",
    cy: "175",
    r: "2.8",
    fill: "url(#eg-steel)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "380",
    cy: "132",
    r: "4.4",
    fill: "url(#eg-brass)",
    stroke: "#6E5420"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "380",
    cy: "132",
    r: "4.4",
    fill: "url(#eg-knurl)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "381",
    y: "118",
    width: "10",
    height: "5",
    rx: "2",
    fill: "#2A2E33",
    transform: "rotate(-25 386 120)"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "424",
    y: "128",
    width: "10",
    height: "5",
    rx: "2",
    fill: "#8A6A2A"
  }), inst.indexOf("filter") >= 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "426",
    y: "114",
    width: "16",
    height: "30",
    rx: "4",
    fill: "url(#eg-rubber)"
  }), /*#__PURE__*/React.createElement(WormClamp, {
    x: 430,
    y: 112,
    h: 34,
    w: 5
  }), /*#__PURE__*/React.createElement("path", {
    d: "M440,110 L494,100 C510,100 512,158 494,158 L440,148 Z",
    fill: "url(#eg-pod)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M440,110 L494,100 C510,100 512,158 494,158 L440,148 Z",
    fill: "url(#eg-mesh)"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "500",
    cy: "129",
    rx: "7",
    ry: "27",
    fill: "rgba(0,0,0,.25)"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "426",
    y: "114",
    width: "42",
    height: "32",
    rx: "6",
    fill: "url(#eg-rubber)"
  }), [436, 446, 456].map(x => /*#__PURE__*/React.createElement("path", {
    key: x,
    d: "M" + x + ",114 L" + x + ",146",
    stroke: "rgba(255,255,255,.1)",
    strokeWidth: "2"
  })), /*#__PURE__*/React.createElement(WormClamp, {
    x: 430,
    y: 112,
    h: 36,
    w: 5
  }), /*#__PURE__*/React.createElement("rect", {
    x: "468",
    y: "104",
    width: "36",
    height: "52",
    rx: "7",
    fill: "#2A2E33",
    stroke: "#444B52"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M472,110 L500,110",
    stroke: "rgba(255,255,255,.08)",
    strokeWidth: "2"
  })))))), (eng.layout || "single") !== "single" && /*#__PURE__*/React.createElement("text", {
    x: "40",
    y: "52",
    className: "eng-tiny-note"
  }, "\u0421\u0445\u0435\u043C\u0430 \u043E\u0434\u043D\u043E\u0433\u043E \u0446\u0438\u043B\u0438\u043D\u0434\u0440\u0430 \u0438\u0437 ", {
    twin: 2,
    vtwin: 2,
    boxer: 2,
    i3: 3,
    i4: 4
  }[eng.layout] || 2, ". \u041F\u043E\u043B\u043D\u044B\u0439 \u043C\u043E\u0442\u043E\u0440 \u2014 \u0432 3D"), xray && /*#__PURE__*/React.createElement(Internals, {
    eng: eng,
    running: running,
    rpm: rpm
  }), !running && !xray && pins.map(p => /*#__PURE__*/React.createElement("g", {
    key: p.id,
    className: "pin" + (sel === p.id ? " on" : ""),
    transform: "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ")",
    role: "button",
    tabIndex: "0",
    "aria-label": AREAS[p.id].t,
    onClick: click(p.id),
    onKeyDown: e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSel(p.id);
      }
    }
  }, /*#__PURE__*/React.createElement("title", null, AREAS[p.id].t), /*#__PURE__*/React.createElement("circle", {
    className: "pin-hit",
    r: "24"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "pin-pulse",
    r: "13"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "pin-dot",
    r: "11"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "pin-core",
    r: "4"
  }))));
}

/* --- дым из выхлопа: отдельный слой поверх схемы, анимируется без перерисовки самой схемы --- */
function Smoke({
  two,
  rpm,
  back,
  style
}) {
  const dur = rpm < 2500 ? 1.6 : rpm < 5500 ? 1.05 : 0.7;
  return /*#__PURE__*/React.createElement("div", {
    className: "smoke-ov" + (two ? " two" : ""),
    "aria-hidden": "true",
    style: Object.assign({
      "--puff": dur + "s"
    }, style || {})
  }, [0, 1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("i", {
    key: i,
    style: {
      width: (back ? 2.2 : 3.1) + i % 3 * 1.2 + "%",
      animationDelay: (i * dur / 6).toFixed(2) + "s",
      "--dx": (back ? -(90 + i * 37 % 120) : 50 + i * 37 % 100) + "%",
      "--dy": (back ? -60 - i * 53 % 90 : -150 - i * 53 % 150) + "%"
    }
  })));
}

/* --- тахометр --- */
function Tacho({
  eng,
  rpm,
  running,
  api
}) {
  const pk = enginePeak(eng),
    max = pk.max,
    ang = v => -120 + 240 * Math.min(1, v / max);
  const needle = useRef(null),
    val = useRef(null);
  useEffect(() => {
    if (!api) return;
    let shown = 0;
    api.current = v => {
      if (needle.current) needle.current.style.transform = "rotate(" + ang(v) + "deg)";
      /* цифры — не чаще 10 раз в секунду: смена текста заставляет браузер пересчитывать раскладку */
      const now = performance.now();
      if (val.current && now - shown > 100) {
        shown = now;
        val.current.textContent = Math.round(v / 50) * 50;
      }
    };
    return () => {
      api.current = null;
    };
  });
  const ticks = [];
  for (let v = 0; v <= max; v += 1000) ticks.push(v);
  const p = (v, r) => {
    const t = (ang(v) - 90) * Math.PI / 180;
    return [60 + r * Math.cos(t), 60 + r * Math.sin(t)];
  };
  const arc = (v1, v2, r) => {
    const s = p(v1, r),
      e = p(v2, r);
    return "M" + s[0] + "," + s[1] + " A" + r + "," + r + " 0 " + (ang(v2) - ang(v1) > 180 ? 1 : 0) + ",1 " + e[0] + "," + e[1];
  };
  /* шкала — неподвижная картинка; стрелка — отдельный слой, поворачивается без перерисовки шкалы */
  return /*#__PURE__*/React.createElement("div", {
    className: "tacho-box" + (running ? " on" : ""),
    role: "img",
    "aria-label": "Тахометр, " + (running ? rpm : 0) + " об/мин"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "tacho" + (running ? " on" : ""),
    viewBox: "0 0 120 104",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: arc(0, max, 50),
    fill: "none",
    stroke: "rgba(255,255,255,.12)",
    strokeWidth: "6"
  }), /*#__PURE__*/React.createElement("path", {
    d: arc(pk.red, max, 50),
    fill: "none",
    stroke: "#E5533D",
    strokeWidth: "6"
  }), ticks.map(v => {
    const a = p(v, 43),
      b = p(v, 50),
      c = p(v, 34);
    return /*#__PURE__*/React.createElement("g", {
      key: v
    }, /*#__PURE__*/React.createElement("line", {
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
      stroke: "rgba(255,255,255,.55)",
      strokeWidth: "1.5"
    }), v % 2000 === 0 && /*#__PURE__*/React.createElement("text", {
      x: c[0],
      y: c[1] + 3,
      textAnchor: "middle",
      className: "tacho-n"
    }, v / 1000));
  }), /*#__PURE__*/React.createElement("text", {
    ref: val,
    x: "60",
    y: "88",
    textAnchor: "middle",
    className: "tacho-v"
  }, running ? rpm : 0), /*#__PURE__*/React.createElement("text", {
    x: "60",
    y: "100",
    textAnchor: "middle",
    className: "tacho-u"
  }, "\u043E\u0431/\u043C\u0438\u043D \xD71")), /*#__PURE__*/React.createElement("i", {
    ref: needle,
    className: "tacho-needle",
    style: {
      transform: "rotate(" + ang(running ? rpm : 0) + "deg)"
    }
  }), /*#__PURE__*/React.createElement("i", {
    className: "tacho-hub"
  }));
}

/* --- звук мотора: синтез под конкретный двигатель и выхлоп --- */
function soundProfile(eng, exOverride) {
  const L = eng.layout || "single",
    two = eng.stroke === "2T",
    inst = eng.installed || [];
  let ex = "stock";
  if (inst.indexOf("full") >= 0) ex = "full";else if (inst.indexOf("slip") >= 0 || inst.indexOf("silencer2t") >= 0) ex = "slip";else if (inst.indexOf("pipe") >= 0) ex = "pipe";
  if (exOverride && exOverride !== "mine") ex = exOverride;
  let fire = [0];
  if (L === "twin") fire = two ? [0, 180] : [0, eng.crankPhase || 270];else if (L === "vtwin") fire = [0, 360 + (eng.vAngle || (/90/.test(eng.name || "") ? 90 : 75))];else if (L === "i4") fire = [0, 180, 360, 540];else if (L === "i3") fire = [0, 240, 480];else if (L === "boxer") fire = [0, 360];
  const cc = eng.cc || 250;
  return {
    two: two,
    ex: ex,
    fire: fire,
    cycle: two ? 360 : 720,
    cc: cc,
    vc: cc / fire.length,
    air: eng.groups.indexOf("liquid") < 0
  };
}
const EX_LABEL = {
  stock: "заводской",
  slip: "прямоток (slip-on)",
  full: "полная система",
  pipe: "тюнинг-труба"
};
function engineSound(eng) {
  let ctx = null,
    timer = null,
    P = null,
    rpm = 1500,
    target = 1500,
    held = false,
    red = 9000,
    popUntil = 0,
    popRate = 0,
    cutT = 0,
    noise = null,
    N = {},
    lastHigh = 0;
  function mkNoise() {
    const b = ctx.createBuffer(1, ctx.sampleRate * 0.8, ctx.sampleRate),
      d = b.getChannelData(0);
    let br = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      br = (br + 0.02 * w) / 1.02;
      d[i] = w * 0.5 + br * 3.4;
    }
    return b;
  }
  /* форма волны одного цикла двигателя: импульс выхлопа на каждую вспышку */
  function cycleWave() {
    const M = 2048,
      H = 96,
      sig = new Float32Array(M),
      sharp = P.ex === "stock" ? 1 : P.ex === "full" ? 1.6 : 1.35;
    const per = P.two ? 1 : 2,
      w = (P.two ? 0.06 : 0.045) / sharp * per / 2,
      lam = (P.two ? 0.05 : 0.07) / sharp * per / 2;
    P.fire.forEach((a, n) => {
      const f = a / P.cycle,
        amp = 1 + n % 2 * 0.12;
      for (let k = 0; k < M; k++) {
        let x = k / M - f;
        if (x < 0) x += 1;
        sig[k] += amp * Math.exp(-x / w) * (Math.sin(2 * Math.PI * x / lam) + 0.5 * Math.sin(4 * Math.PI * x / lam) * Math.exp(-x / (w * 0.6)));
      }
    });
    const re = new Float32Array(H),
      im = new Float32Array(H);
    for (let h = 1; h < H; h++) {
      let c = 0,
        s = 0;
      for (let k = 0; k < M; k++) {
        const ph = 2 * Math.PI * h * k / M;
        c += sig[k] * Math.cos(ph);
        s += sig[k] * Math.sin(ph);
      }
      re[h] = c / M;
      im[h] = s / M;
    }
    return ctx.createPeriodicWave(re, im);
  }
  function cycleHz(r) {
    return r / 60 / (P.two ? 1 : 2);
  }
  function tone() {
    const t = ctx.currentTime,
      ex = P.ex,
      vc = P.vc;
    const wave = cycleWave();
    N.osc.setPeriodicWave(wave);
    N.am.setPeriodicWave(wave);
    N.bass.gain.setTargetAtTime({
      stock: 3,
      slip: 9,
      full: 11,
      pipe: 6
    }[ex], t, 0.05);
    N.bass.frequency.setTargetAtTime(110 * Math.pow(250 / vc, 0.25), t, 0.05);
    N.body.frequency.setTargetAtTime(P.two ? 1300 * Math.pow(125 / vc, 0.25) : 520 * Math.pow(250 / vc, 0.3), t, 0.05);
    N.body.gain.setTargetAtTime(ex === "stock" ? 4 : 8, t, 0.05);
    N.lpBase = {
      stock: 650,
      slip: 1500,
      full: 2100,
      pipe: 1800
    }[ex];
    N.lpK = ex === "stock" ? 0.12 : 0.25;
    N.exGain = {
      stock: 0.55,
      slip: 0.85,
      full: 1,
      pipe: 0.85
    }[ex] * (P.two ? 2.2 : 1);
    N.popK = {
      stock: 0.35,
      slip: 1,
      full: 1.3,
      pipe: 0.9
    }[ex];
  }
  function build() {
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    comp.attack.value = 0.002;
    comp.release.value = 0.1;
    const bass = ctx.createBiquadFilter();
    bass.type = "lowshelf";
    const body = ctx.createBiquadFilter();
    body.type = "peaking";
    body.Q.value = 1.1;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.9;
    const osc = ctx.createOscillator(),
      oscG = ctx.createGain();
    oscG.gain.value = 0.9;
    osc.connect(oscG);
    oscG.connect(bass);
    bass.connect(body);
    body.connect(lp);
    lp.connect(comp);
    comp.connect(out);
    out.connect(ctx.destination);
    /* шум сгорания в такт вспышкам */
    const nz = ctx.createBufferSource();
    nz.buffer = noise;
    nz.loop = true;
    const nbp = ctx.createBiquadFilter();
    nbp.type = "bandpass";
    nbp.Q.value = 0.8;
    const nG = ctx.createGain();
    nG.gain.value = 0.02;
    const am = ctx.createOscillator(),
      amG = ctx.createGain();
    amG.gain.value = 0.05;
    am.connect(amG);
    amG.connect(nG.gain);
    nz.connect(nbp);
    nbp.connect(nG);
    nG.connect(bass);
    /* лёгкое «дыхание» — второй тон чуть расстроен */
    const osc2 = ctx.createOscillator(),
      o2G = ctx.createGain();
    o2G.gain.value = 0.18;
    osc2.connect(o2G);
    o2G.connect(bass);
    N = {
      out: out,
      comp: comp,
      bass: bass,
      body: body,
      lp: lp,
      osc: osc,
      oscG: oscG,
      osc2: osc2,
      am: am,
      nbp: nbp,
      nG: nG,
      nz: nz
    };
    tone();
    osc2.setPeriodicWave(cycleWave());
    const f = cycleHz(rpm);
    [osc, am].forEach(o => o.frequency.setValueAtTime(f, ctx.currentTime));
    osc2.frequency.setValueAtTime(f * 1.004, ctx.currentTime);
    osc.start();
    am.start();
    osc2.start();
    nz.start();
  }
  function pop(t, big) {
    const k = N.popK * (big ? 1.2 : 0.8);
    const s = ctx.createBufferSource();
    s.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1100 + Math.random() * 1600;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, 1.1 * k), t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    s.connect(bp);
    bp.connect(g);
    g.connect(N.comp);
    s.start(t, Math.random() * 0.5, 0.06);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.06);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(Math.max(0.001, 1.2 * k), t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(og);
    og.connect(N.comp);
    o.start(t);
    o.stop(t + 0.1);
  }
  function loop() {
    const now = ctx.currentTime,
      prev = rpm;
    rpm += (target - rpm) * 0.5;
    const f = cycleHz(rpm),
      jit = 1 + (Math.random() - 0.5) * (rpm < 2300 && !P.two ? 0.05 : 0.012);
    N.osc.frequency.setTargetAtTime(f * jit, now, 0.02);
    N.am.frequency.setTargetAtTime(f * jit, now, 0.02);
    N.osc2.frequency.setTargetAtTime(f * 1.004, now, 0.04);
    N.lp.frequency.setTargetAtTime(N.lpBase + rpm * N.lpK, now, 0.04);
    N.nbp.frequency.setTargetAtTime(700 + rpm / 4, now, 0.05);
    const load = held ? 1 : 0.65;
    let g = N.exGain * (0.45 + Math.min(0.55, rpm / red * 0.6)) * load;
    /* отсечка: ограничитель рвёт зажигание */
    if (held && rpm > red * 0.95) {
      cutT += 0.025;
      if (cutT * 12 % 1 < 0.35) {
        g *= 0.18;
        if (Math.random() < 0.55) pop(now + Math.random() * 0.02, true);
      }
    }
    N.out.gain.setTargetAtTime(g, now, 0.02);
    if (rpm > red * 0.55) lastHigh = now;
    /* сброс газа с высоких — отстрелы */
    if (!held && prev - rpm > 25 && now - lastHigh < 0.5) {
      popUntil = now + 1.4;
      popRate = 0.35;
    }
    if (now < popUntil && Math.random() < popRate * N.popK) {
      pop(now + Math.random() * 0.025, false);
      if (Math.random() < 0.4) pop(now + 0.03 + Math.random() * 0.03, false);
    }
    popRate *= 0.97;
  }
  return {
    start(r, exOverride) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        P = soundProfile(eng, exOverride);
        red = typeof enginePeak === "function" ? enginePeak(eng).red : 9000;
        noise = mkNoise();
        rpm = target = r;
        build();
        timer = setInterval(loop, 25);
        return true;
      } catch (e) {
        return false;
      }
    },
    setRpm(r) {
      target = r;
    },
    setThrottle(on) {
      held = !!on;
    },
    setExhaust(x) {
      if (!ctx) return;
      P = soundProfile(eng, x);
      tone();
      N.osc2.setPeriodicWave(cycleWave());
    },
    label() {
      return P ? EX_LABEL[P.ex] : "";
    },
    stop() {
      clearInterval(timer);
      timer = null;
      if (ctx) {
        const c = ctx,
          o = N.out;
        try {
          o.gain.setTargetAtTime(0.0001, c.currentTime, 0.05);
        } catch (e) {}
        setTimeout(() => {
          try {
            c.close();
          } catch (e) {}
        }, 300);
      }
      ctx = null;
    }
  };
}
/* ===== 3D-двигатель (three.js r128, процедурная модель) ===== */
function e3Layout(eng) {
  if (eng.layout) return eng.layout;
  return "single";
}
function e3RoundRect(w, h, r) {
  const s = new THREE.Shape(),
    x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function e3Extrude(shape, depth, bevel, segs) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: segs || 10
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}
function e3Gear(r, teeth, thick, hole) {
  const td = Math.min(0.055, r * 0.16),
    s = new THREE.Shape(),
    st = Math.PI * 2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * st,
      P = (ang, rr) => [Math.cos(ang) * rr, Math.sin(ang) * rr];
    const pts = [P(a, r - td), P(a + st * 0.2, r), P(a + st * 0.45, r), P(a + st * 0.65, r - td)];
    pts.forEach((p, j) => {
      if (i === 0 && j === 0) s.moveTo(p[0], p[1]);else s.lineTo(p[0], p[1]);
    });
  }
  s.closePath();
  if (hole) {
    const h = new THREE.Path();
    h.absarc(0, 0, hole, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return e3Extrude(s, thick, 0.006, 4);
}
function e3GearT(t, m, thick, hole) {
  const rp = m * t / 2,
    tip = rp + 0.9 * m,
    root = rp - 1.15 * m,
    s = new THREE.Shape(),
    st = Math.PI * 2 / t;
  for (let i = 0; i < t; i++) {
    const a = i * st,
      P = (ang, rr) => [Math.cos(ang) * rr, Math.sin(ang) * rr];
    [P(a, root), P(a + st * 0.12, root), P(a + st * 0.24, tip), P(a + st * 0.41, tip), P(a + st * 0.53, root)].forEach((p, j) => {
      if (i === 0 && j === 0) s.moveTo(p[0], p[1]);else s.lineTo(p[0], p[1]);
    });
  }
  s.closePath();
  if (hole) {
    const h = new THREE.Path();
    h.absarc(0, 0, hole, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return e3Extrude(s, thick, 0.005, 2);
}
/* начальный поворот ведомой шестерни, чтобы зуб попадал во впадину */
function e3Mesh(alpha, t1, t2) {
  const c1 = 0.325 * 2 * Math.PI / t1,
    c2 = 0.325 * 2 * Math.PI / t2,
    st2 = 2 * Math.PI / t2;
  return alpha + Math.PI - c2 - st2 / 2 + t1 / t2 * (alpha - c1);
}
function e3Wrap(a) {
  a = (a + Math.PI) % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
}
function e3Cover(R, H) {
  const pts = [new THREE.Vector2(0.001, H), new THREE.Vector2(R * 0.5, H), new THREE.Vector2(R * 0.78, H * 0.9), new THREE.Vector2(R * 0.92, H * 0.6), new THREE.Vector2(R, H * 0.25), new THREE.Vector2(R, 0)];
  const g = new THREE.LatheGeometry(pts, 48);
  g.rotateX(Math.PI / 2);
  return g;
}
function e3Bolt(r, h) {
  const g = new THREE.CylinderGeometry(r, r, h || r * 0.8, 6);
  g.rotateX(Math.PI / 2);
  return g;
}
function e3Cyl(r, h, seg, axis) {
  const g = new THREE.CylinderGeometry(r, r, h, seg || 24);
  if (axis === "x") g.rotateZ(Math.PI / 2);
  if (axis === "z") g.rotateX(Math.PI / 2);
  return g;
}
function e3CaseShape() {
  const f = (x, y) => [(x - 300) / 100, -(y - 300) / 100],
    s = new THREE.Shape();
  const m = (x, y) => {
      const p = f(x, y);
      s.moveTo(p[0], p[1]);
    },
    l = (x, y) => {
      const p = f(x, y);
      s.lineTo(p[0], p[1]);
    };
  const c = (a, b, cc, d, e, g) => {
    const p1 = f(a, b),
      p2 = f(cc, d),
      p3 = f(e, g);
    s.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
  };
  m(170, 250);
  c(200, 232, 260, 228, 300, 232);
  l(420, 236);
  c(460, 240, 486, 262, 488, 300);
  c(490, 340, 470, 372, 430, 380);
  l(230, 384);
  c(190, 384, 158, 360, 152, 320);
  c(148, 290, 152, 262, 170, 250);
  return s;
}
function e3LoopPoints(c1, r1, c2, r2, n) {
  const pts = [],
    add = (c, r, a0, a1, k) => {
      for (let i = 0; i <= k; i++) {
        const a = a0 + (a1 - a0) * i / k;
        pts.push(new THREE.Vector3(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 0));
      }
    };
  add(c1, r1, Math.PI, Math.PI * 2, n);
  add(c2, r2, 0, Math.PI, n);
  return pts;
}
function e3Arch(eng) {
  const L = e3Layout(eng);
  if (L !== "single") return L;
  const has = k => eng.groups.indexOf(k) >= 0;
  if (has("horiz")) return "cub";
  if (eng.stroke === "2T") return has("liquid") ? "2tl" : "2ta";
  if (has("liquid")) return "liq";
  if (has("cg")) return "cg";
  return "vert";
}
function e3DefaultFinish(eng) {
  const a = e3Arch(eng);
  return a === "cub" ? "black" : a === "vert" || a === "cg" ? "combo" : "silver";
}
const E3ARCH = {
  vert: {
    tilt: 0.17,
    depth: 0.9,
    clutch: [0.62, -0.15],
    out: [1.18, 0.32],
    gen: 0.5,
    caseP: [[-0.55, 0.52], [0.1, 0.6], [0.75, 0.66], [1.3, 0.5], [1.62, 0.1], [1.55, -0.42], [1.15, -0.78], [0.35, -0.86], [-0.45, -0.82], [-0.92, -0.5], [-1.0, -0.05], [-0.85, 0.32]],
    coverP: [[-0.62, 0.3], [0.1, 0.44], [0.9, 0.4], [1.28, 0.05], [1.18, -0.5], [0.62, -0.76], [-0.1, -0.74], [-0.6, -0.42]]
  },
  cg: null,
  liq: {
    tilt: 0.3,
    depth: 0.82,
    clutch: [0.6, -0.12],
    out: [1.12, 0.3],
    gen: 0.45,
    caseP: [[-0.5, 0.5], [0.2, 0.56], [0.85, 0.6], [1.3, 0.42], [1.5, 0.02], [1.4, -0.45], [1.0, -0.74], [0.3, -0.8], [-0.45, -0.76], [-0.85, -0.45], [-0.9, -0.02], [-0.75, 0.32]],
    coverP: [[-0.55, 0.28], [0.15, 0.4], [0.85, 0.36], [1.18, 0.02], [1.08, -0.46], [0.6, -0.7], [-0.05, -0.68], [-0.52, -0.38]]
  },
  "2tl": {
    tilt: 0.25,
    depth: 0.8,
    clutch: [0.58, -0.15],
    out: [1.08, 0.28],
    gen: 0.4,
    caseP: [[-0.48, 0.45], [0.2, 0.5], [0.85, 0.55], [1.25, 0.35], [1.42, -0.05], [1.3, -0.48], [0.9, -0.72], [0.25, -0.76], [-0.45, -0.7], [-0.82, -0.4], [-0.85, 0.0], [-0.7, 0.3]],
    coverP: [[-0.5, 0.25], [0.15, 0.36], [0.8, 0.32], [1.12, 0.0], [1.02, -0.44], [0.58, -0.66], [-0.05, -0.64], [-0.48, -0.36]]
  },
  cub: {
    tilt: 1.48,
    depth: 0.78,
    clutch: [0.55, -0.05],
    out: [1.05, 0.42],
    gen: 0.5,
    caseP: [[-0.6, 0.42], [-0.2, 0.62], [0.5, 0.72], [1.1, 0.62], [1.42, 0.3], [1.45, -0.2], [1.2, -0.58], [0.6, -0.72], [-0.1, -0.7], [-0.5, -0.5], [-0.62, -0.1]],
    coverP: [[-0.5, 0.35], [0.3, 0.56], [1.0, 0.5], [1.3, 0.15], [1.25, -0.36], [0.8, -0.62], [0.05, -0.62], [-0.45, -0.3]]
  }
};
E3ARCH.cg = E3ARCH.vert;
E3ARCH["2ta"] = Object.assign({}, E3ARCH["2tl"], {
  tilt: 0.2,
  depth: 0.85
});
E3ARCH.twin = Object.assign({}, E3ARCH.liq, {
  depth: 1.55,
  tilt: 0.3
});
E3ARCH.i3 = Object.assign({}, E3ARCH.liq, {
  depth: 1.95,
  tilt: 0.38
});
E3ARCH.i4 = Object.assign({}, E3ARCH.liq, {
  depth: 2.5,
  tilt: 0.45
});
E3ARCH.vtwin = Object.assign({}, E3ARCH.liq, {
  depth: 1.0
});
E3ARCH.boxer = Object.assign({}, E3ARCH.liq, {
  depth: 1.1
});
function e3Spline(pts, k) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0] * (k || 1), pts[0][1] * (k || 1));
  s.splineThru(pts.slice(1).concat([pts[0]]).map(p => new THREE.Vector2(p[0] * (k || 1), p[1] * (k || 1))));
  return s;
}
let E3_BUMP = null;
function e3Bump() {
  if (E3_BUMP) return E3_BUMP;
  const s = document.createElement("canvas");
  s.width = s.height = 48;
  const sx = s.getContext("2d");
  const im = sx.createImageData(48, 48);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 50;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
    im.data[i + 3] = 255;
  }
  sx.putImageData(im, 0, 0);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = true;
  x.drawImage(s, 0, 0, 256, 256);
  E3_BUMP = new THREE.CanvasTexture(c);
  E3_BUMP.wrapS = E3_BUMP.wrapT = THREE.RepeatWrapping;
  E3_BUMP.repeat.set(0.6, 0.6);
  return E3_BUMP;
}
function buildEngine3D(eng, finish) {
  const T = THREE,
    root = new T.Group(),
    internals = new T.Group(),
    outer = new T.Group();
  root.add(outer);
  root.add(internals);
  const has = k => eng.groups.indexOf(k) >= 0;
  const two = eng.stroke === "2T",
    liq = has("liquid"),
    dohc = has("dohc"),
    efi = has("efi"),
    horiz = has("horiz"),
    bal = has("balancer"),
    ohv = has("cg");
  const inst = eng.installed || [];
  const layout = e3Layout(eng),
    arch = e3Arch(eng),
    A = E3ARCH[arch] || E3ARCH.vert;
  const elec = /Электро|электро/.test(eng.start),
    kick = /Кик|кик/.test(eng.start),
    semi = /полуавтомат/.test(eng.gearbox);
  const fin = finish || e3DefaultFinish(eng);
  const bump = e3Bump();
  const caseCol = fin === "black" ? 0x1f2124 : fin === "bronze" ? 0x8a6c3e : 0xb3b9bf;
  const coverCol = fin === "black" ? 0x232528 : fin === "bronze" ? 0x9c7b47 : 0xd2d6da;
  const finCol = fin === "silver" ? 0xb8bec4 : fin === "bronze" ? 0x6e5432 : 0x22252a;
  const BASE = {
    cast: new T.MeshStandardMaterial({
      color: caseCol,
      metalness: fin === "black" ? 0.35 : 0.75,
      roughness: fin === "black" ? 0.55 : 0.5,
      bumpMap: bump,
      bumpScale: 0.006
    }),
    polish: new T.MeshStandardMaterial({
      color: coverCol,
      metalness: fin === "black" ? 0.4 : 0.9,
      roughness: fin === "black" ? 0.4 : 0.34
    }),
    fin: new T.MeshStandardMaterial({
      color: finCol,
      metalness: fin === "silver" ? 0.75 : 0.4,
      roughness: 0.5
    }),
    black: new T.MeshStandardMaterial({
      color: 0x1d2024,
      metalness: 0.4,
      roughness: 0.55
    }),
    chrome: new T.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1,
      roughness: 0.06
    }),
    heat: new T.MeshStandardMaterial({
      color: 0xb48ad8,
      metalness: 1,
      roughness: 0.18
    }),
    ti: new T.MeshStandardMaterial({
      color: 0x8aa6d8,
      metalness: 1,
      roughness: 0.2
    }),
    carbon: new T.MeshStandardMaterial({
      color: 0x24282c,
      metalness: 0.3,
      roughness: 0.28
    }),
    brass: new T.MeshStandardMaterial({
      color: 0xd4ad58,
      metalness: 1,
      roughness: 0.27
    }),
    zinc: new T.MeshStandardMaterial({
      color: 0xc9ccc4,
      metalness: 0.9,
      roughness: 0.35
    }),
    rubber: new T.MeshStandardMaterial({
      color: 0x1b1d20,
      metalness: 0,
      roughness: 0.88
    }),
    steel: new T.MeshStandardMaterial({
      color: 0xb4bbc2,
      metalness: 1,
      roughness: 0.28
    }),
    gear: new T.MeshStandardMaterial({
      color: 0x9aa2aa,
      metalness: 1,
      roughness: 0.32
    }),
    gold: new T.MeshStandardMaterial({
      color: 0xf0c040,
      metalness: 1,
      roughness: 0.25,
      emissive: 0x3a2800
    }),
    copper: new T.MeshStandardMaterial({
      color: 0xc27b3c,
      metalness: 1,
      roughness: 0.35
    }),
    red: new T.MeshStandardMaterial({
      color: 0xa82c22,
      metalness: 0.1,
      roughness: 0.5
    }),
    ceramic: new T.MeshStandardMaterial({
      color: 0xf4f4f2,
      metalness: 0,
      roughness: 0.25
    }),
    pod: new T.MeshStandardMaterial({
      color: 0xc8402c,
      metalness: 0,
      roughness: 0.75
    }),
    blue: new T.MeshStandardMaterial({
      color: 0x3c7bd9,
      metalness: 0.2,
      roughness: 0.4
    }),
    glass: new T.MeshStandardMaterial({
      color: 0x9fc4dc,
      metalness: 0,
      roughness: 0.05,
      transparent: true,
      opacity: 0.6
    }),
    fire: new T.MeshBasicMaterial({
      color: 0xff8a2a,
      transparent: true,
      opacity: 0
    })
  };
  const cache = {},
    meshes = [];
  function mat(area, key, shell) {
    const k = area + "|" + key + (shell ? "|s" : "");
    if (!cache[k]) {
      cache[k] = BASE[key].clone();
      cache[k].userData = {
        area: area,
        shell: !!shell,
        baseOpacity: cache[k].opacity,
        baseTransparent: cache[k].transparent
      };
    }
    return cache[k];
  }
  function M(geo, area, key, parent, shell) {
    const m = new T.Mesh(geo, mat(area, key, shell));
    m.userData.area = area;
    (parent || outer).add(m);
    meshes.push(m);
    return m;
  }
  function tag(o, det) {
    o.traverse(x => {
      if (x.isMesh) x.userData.det = det;
    });
    return o;
  }
  function bolt(area, x, y, z, r, parent, axis) {
    const g = e3Bolt(r || 0.032, (r || 0.032) * 0.9);
    if (axis === "x") g.rotateY(Math.PI / 2);
    const b = M(g, area, "steel", parent);
    b.position.set(x, y, z);
    return b;
  }

  /* ---------- картер и крышки ---------- */
  const caseDepth = A.depth,
    zR = caseDepth / 2 + 0.05,
    zL = -caseDepth / 2 - 0.05;
  M(e3Extrude(e3Spline(A.caseP), caseDepth, 0.06, 40), "oil", "cast", outer, true);
  /* линия разъёма половин картера */
  M(e3Extrude(e3Spline(A.caseP, 1.004), 0.012, 0, 40), "oil", "black", outer, true);
  const clutchC = A.clutch,
    outC = A.out;
  /* правая крышка: плоская часть + купол сцепления */
  const rc = M(e3Extrude(e3Spline(A.coverP), 0.07, 0.025, 40), "clutch", "polish", outer, true);
  rc.position.z = zR;
  const rim = new THREE.CatmullRomCurve3(A.coverP.map(p => new T.Vector3(p[0] * 0.985, p[1] * 0.985, zR + 0.07)), true);
  M(new T.TubeGeometry(rim, 80, 0.022, 8, true), "clutch", "polish", outer, true);
  const dome = M(e3Cover(0.43, 0.19), "clutch", "polish", outer, true);
  dome.position.set(clutchC[0], clutchC[1], zR + 0.05);
  const domeRing = M(new T.TorusGeometry(0.43, 0.02, 8, 48), "clutch", "black", outer);
  domeRing.position.set(clutchC[0], clutchC[1], zR + 0.06);
  for (let i = 0; i < A.coverP.length; i++) {
    const p = A.coverP[i],
      q = A.coverP[(i + 1) % A.coverP.length];
    [0, 0.5].forEach(t => bolt("clutch", (p[0] + (q[0] - p[0]) * t) * 0.93, (p[1] + (q[1] - p[1]) * t) * 0.93, zR + 0.06, 0.03));
  }
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 + 0.4;
    bolt("clutch", clutchC[0] + Math.cos(a) * 0.34, clutchC[1] + Math.sin(a) * 0.34, zR + 0.15, 0.026);
  }
  if (!two && arch !== "cub") {
    const sight = tag(M(e3Cyl(0.055, 0.03, 24, "z"), "oil", "glass"), "filler");
    sight.position.set(clutchC[0] - 0.35, clutchC[1] - 0.42, zR + 0.06);
  }
  const fillerX = arch === "cub" ? 0.95 : 1.0,
    fillerY = arch === "cub" ? 0.45 : 0.3;
  const filler = tag(M(e3Cyl(0.075, 0.12, 20), "oil", "black"), "filler");
  filler.position.set(fillerX, fillerY + 0.1, zR - 0.02);
  tag(M(e3Cyl(0.03, 0.12, 12, "x"), "oil", "black"), "filler").position.set(fillerX, fillerY + 0.17, zR - 0.02);
  if (!two && (has("cb") || has("zs4v") || dohc || has("jp") || has("eu"))) {
    const fc = tag(M(e3Cover(0.15, 0.05), "oil", "polish"), "oilfilter");
    fc.position.set(-0.25, -0.35, zR + 0.06);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + 0.5;
      tag(bolt("oil", -0.25 + Math.cos(a) * 0.11, -0.35 + Math.sin(a) * 0.11, zR + 0.11, 0.022), "oilfilter");
    }
  }
  /* левая крышка генератора */
  const gR = A.gen;
  const gc = M(e3Cover(gR, 0.15), "gen", "polish", outer, true);
  gc.position.set(0, 0, zL);
  gc.rotation.y = Math.PI;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.3;
    bolt("gen", Math.cos(a) * (gR - 0.06), Math.sin(a) * (gR - 0.06), zL - 0.05, 0.03);
  }
  const cap = M(e3Cyl(0.11, 0.06, 32, "z"), "gen", "chrome");
  cap.position.set(0, 0, zL - 0.17);
  M(e3Cyl(0.05, 0.04, 6, "z"), "gen", "steel").position.set(0.22, 0.2, zL - 0.15);
  /* левая крышка звезды */
  const spc = M(e3Extrude(e3RoundRect(0.62, 0.46, 0.14), 0.06, 0.015, 10), "gearbox", "polish");
  spc.position.set(outC[0] - 0.12, outC[1] - 0.02, zL - 0.02);
  spc.rotation.z = 0.15;
  [[-0.2, 0.15], [0.12, 0.17], [-0.25, -0.15]].forEach(p => bolt("gearbox", outC[0] - 0.12 + p[0], outC[1] + p[1], zL - 0.07, 0.025));
  /* провода генератора */
  M(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0.25, 0.4, zL - 0.08), new T.Vector3(0.45, 0.75, zL - 0.15), new T.Vector3(0.3, 1.2, zL - 0.2)]), 20, 0.035, 8), "gen", "black");
  /* сливная пробка, крепления */
  const drain = tag(M(new T.CylinderGeometry(0.06, 0.06, 0.08, 6), "oil", "steel"), "drain");
  drain.position.set(0.3, A.caseP.reduce((m, p) => Math.min(m, p[1]), 0) - 0.04, 0);
  [[A.caseP[0][0] + 0.15, A.caseP[0][1] - 0.15], [1.3, -0.35], [0.4, -0.7]].forEach(p => {
    const b = M(e3Cyl(0.055, caseDepth + 0.24, 6, "z"), "oil", "steel");
    b.position.set(p[0], p[1], 0);
  });
  /* стартер */
  if (elec) {
    const sp = arch === "cub" ? [0.25, -0.62] : [0.55, 0.66];
    tag(M(e3Cyl(0.13, 0.6, 28, "z"), "gen", "black"), "starter").position.set(sp[0], sp[1], -0.05);
    tag(M(e3Cyl(0.135, 0.07, 28, "z"), "gen", "polish"), "starter").position.set(sp[0], sp[1], -0.36);
    M(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(sp[0], sp[1] + 0.12, 0.15), new T.Vector3(sp[0] - 0.1, sp[1] + 0.35, 0.3), new T.Vector3(sp[0] - 0.4, sp[1] + 0.5, 0.35)]), 16, 0.03, 8), "gen", "red");
  }
  /* переключение передач и подножки */
  if (semi) {
    const lever = tag(M(new T.BoxGeometry(1.5, 0.06, 0.06), "gearbox", "black"), "shift");
    lever.position.set(0.2, -0.82, zL - 0.2);
    lever.rotation.z = -0.08;
    [-0.5, 0.9].forEach((x, i) => {
      const pad = tag(M(e3Cyl(0.05, 0.22, 12, "z"), "gearbox", "rubber"), "shift");
      pad.position.set(x, -0.82 + (i ? -0.11 : 0.06), zL - 0.32);
    });
    M(e3Cyl(0.035, 0.12, 12, "z"), "gearbox", "steel").position.set(0.2, -0.78, zL - 0.12);
    const bar = tag(M(e3Cyl(0.05, caseDepth + 2.0, 16, "z"), "oil", "black"), "pegs");
    bar.position.set(0.45, -0.88, 0);
    [-1, 1].forEach(s => {
      const peg = tag(M(e3Cyl(0.075, 0.42, 16, "z"), "oil", "rubber"), "pegs");
      peg.position.set(0.45, -0.88, s * (caseDepth / 2 + 0.95));
    });
  } else {
    const sh = tag(M(new T.BoxGeometry(0.62, 0.06, 0.05), "gearbox", "black"), "shift");
    sh.position.set(outC[0] - 0.85, outC[1] - 0.9, zL - 0.14);
    sh.rotation.z = 0.35;
    tag(M(e3Cyl(0.05, 0.18, 12, "z"), "gearbox", "rubber"), "shift").position.set(outC[0] - 1.13, outC[1] - 1.0, zL - 0.2);
  }
  const carm = M(new T.BoxGeometry(0.06, 0.2, 0.05), "clutch", "steel");
  carm.position.set(clutchC[0] + 0.3, clutchC[1] + 0.48, zR - 0.02);
  carm.rotation.z = -0.5;
  M(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(clutchC[0] + 0.36, clutchC[1] + 0.58, zR - 0.02), new T.Vector3(clutchC[0] + 0.3, clutchC[1] + 1.1, zR + 0.05), new T.Vector3(clutchC[0] - 0.1, clutchC[1] + 1.9, zR + 0.1)]), 20, 0.022, 8), "clutch", "black");
  if (kick) {
    const kg = new T.Group();
    kg.position.set(clutchC[0] + 0.45, clutchC[1] + 0.05, zR + 0.12);
    outer.add(kg);
    const k1 = M(new T.BoxGeometry(0.08, 0.72, 0.06), "clutch", "black", kg);
    k1.position.y = -0.33;
    kg.rotation.z = -0.5;
    M(e3Cyl(0.06, 0.12, 12, "z"), "clutch", "steel", kg);
    const kp = M(e3Cyl(0.045, 0.22, 12, "z"), "clutch", "rubber", kg);
    kp.position.set(0, -0.68, 0.08);
    tag(kg, "kick");
  }

  /* ---------- цилиндры ---------- */
  const cyls = [];
  const tilt = A.tilt;
  const D2R = Math.PI / 180;
  const cfgs = layout === "i4" ? [[-0.93, 0], [-0.31, 180], [0.31, 540], [0.93, 360]].map(c => ({
    tilt: tilt,
    z: c[0],
    ph: c[1] * D2R
  })) : layout === "i3" ? [[-0.62, 0], [0, 240], [0.62, 480]].map(c => ({
    tilt: tilt,
    z: c[0],
    ph: c[1] * D2R
  })) : layout === "twin" ? [{
    tilt: tilt,
    z: -0.42,
    ph: 0
  }, {
    tilt: tilt,
    z: 0.42,
    ph: (eng.crankPhase || 270) * Math.PI / 180
  }] : layout === "vtwin" ? [{
    tilt: 0.4,
    z: -0.08,
    ph: 0.4
  }, {
    tilt: -0.4,
    z: 0.08,
    ph: -0.4
  }] : layout === "boxer" ? [{
    boxer: 1,
    z: 0,
    ph: 0
  }, {
    boxer: -1,
    z: 0,
    ph: 0
  }] : [{
    tilt: tilt,
    z: 0,
    ph: 0
  }];
  const finW = arch === "cub" ? 1.0 : arch === "2ta" ? 1.3 : 1.22,
    finD = arch === "cub" ? 0.96 : arch === "2ta" ? 1.12 : 1.0,
    finR = arch === "cub" ? 0.12 : 0.18;
  cfgs.forEach((cf, ci) => {
    const G = new T.Group(),
      I = new T.Group();
    if (cf.boxer) {
      const Y = new T.Vector3(0, 0, cf.boxer),
        Z = new T.Vector3(1, 0, 0),
        X = new T.Vector3().crossVectors(Y, Z);
      G.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(X, Y, Z));
      G.position.set(0, 0.25, 0);
    } else {
      G.rotation.z = cf.tilt;
      G.position.z = cf.z;
    }
    outer.add(G);
    G.add(I);
    I.visible = false;
    /* цилиндр */
    if (liq) {
      M(e3Extrude(e3RoundRect(0.88, 0.8, 0.14), 0.88, 0.04).rotateX(Math.PI / 2).translate(0, 1.04, 0), "cyl", "cast", G, true);
      M(e3Cyl(0.07, 0.18, 16, "x"), "cooling", "cast", G).position.set(-0.5, 1.25, 0.15);
    } else {
      M(e3Cyl(0.36, 0.95, 32), "cyl", "fin", G, true).position.y = 1.04;
      const n = 10;
      for (let i = 0; i < n; i++) {
        const k = 1 - i * 0.012;
        const f = M(e3Extrude(e3RoundRect(finW * k, finD * k, finR), 0.034, 0.01, 6).rotateX(Math.PI / 2), "cyl", "fin", G, true);
        f.position.y = 0.66 + i * 0.086;
      }
      if (ohv) {
        M(e3Cyl(0.06, 1.05, 16), "head", "polish", G).position.set(0.12, 1.12, 0.52);
        [0.62, 1.62].forEach(y => M(e3Cyl(0.075, 0.05, 16), "head", "steel", G).position.set(0.12, y, 0.52));
      }
    }
    M(e3Extrude(e3RoundRect(0.98, 0.9, 0.1), 0.06, 0.012).rotateX(Math.PI / 2), "cyl", "cast", G, true).position.y = 0.6;
    [[-0.38, 0.38], [0.38, 0.38], [-0.38, -0.38], [0.38, -0.38]].forEach(p => {
      const nn = M(new T.CylinderGeometry(0.042, 0.042, 0.05, 6), "cyl", "steel", G);
      nn.position.set(p[0], 0.66, p[1]);
    });
    /* головка */
    if (two) {
      if (liq) {
        M(e3Extrude(e3RoundRect(0.92, 0.84, 0.16), 0.24, 0.04).rotateX(Math.PI / 2), "head", "cast", G, true).position.y = 1.58;
        M(e3Cyl(0.08, 0.16, 16), "cooling", "cast", G).position.set(0, 1.78, 0.25);
        const pv = M(new T.BoxGeometry(0.3, 0.26, 0.2), "exhaust", "cast", G, true);
        pv.position.set(-0.25, 0.95, -0.5);
        bolt("exhaust", -0.25, 0.95, -0.62, 0.03, G);
      } else {
        for (let i = 0; i < 5; i++) {
          const k = 1 - i * 0.08;
          M(e3Extrude(e3RoundRect(finW * 1.05 * k, finD * 1.05 * k, 0.2), 0.035, 0.01, 6).rotateX(Math.PI / 2), "head", "fin", G, true).position.y = 1.52 + i * 0.07;
        }
        M(new T.SphereGeometry(0.42, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1), "head", "fin", G, true).position.y = 1.5;
      }
      [-0.38, 0.38].forEach(x => [-0.34, 0.34].forEach(z => {
        const nn = M(new T.CylinderGeometry(0.04, 0.04, 0.06, 6), "head", "steel", G);
        nn.position.set(x, 1.52, z);
      }));
    } else {
      M(e3Extrude(e3RoundRect(1.1, 0.96, 0.12), 0.4, 0.035).rotateX(Math.PI / 2), "head", "cast", G, true).position.y = 1.72;
      if (!liq) for (let i = 0; i < 4; i++) M(e3Extrude(e3RoundRect(finW * 1.04, finD * 1.04, finR), 0.032, 0.008, 6).rotateX(Math.PI / 2), "head", "fin", G, true).position.y = 1.56 + i * 0.085;
      if (ohv) {
        tag(M(e3Extrude(e3RoundRect(0.86, 0.7, 0.12), 0.18, 0.035).rotateX(Math.PI / 2), "head", "polish", G, true), "valvecover").position.y = 2.02;
        [-0.24, 0.24].forEach(x => M(new T.CylinderGeometry(0.05, 0.05, 0.08, 6), "head", "steel", G).position.set(x, 2.14, 0));
      } else if (dohc) {
        tag(M(e3Extrude(e3RoundRect(0.98, 0.84, 0.2), 0.3, 0.05, 14).rotateX(Math.PI / 2), "head", "polish", G, true), "valvecover").position.y = 2.08;
        [-0.22, 0.22].forEach(x => {
          const b = M(e3Cyl(0.15, 0.86, 32, "z"), "head", "polish", G, true);
          b.position.set(x, 2.2, 0);
        });
        [[-0.42, 2.0], [0.42, 2.0], [-0.42, 2.18], [0.42, 2.18], [0, 2.3]].forEach(p => bolt("head", p[0], p[1], 0.43, 0.026, G));
      } else {
        tag(M(e3Extrude(e3RoundRect(0.94, 0.82, 0.22), 0.26, 0.05, 14).rotateX(Math.PI / 2), "head", "polish", G, true), "valvecover").position.y = 2.05;
        [[-0.5, 1], [0.5, -1]].forEach(s => {
          const capT = tag(M(e3Cyl(0.13, 0.08, 32, "x"), "head", "polish", G), "valvecover");
          capT.position.set(s[0], 1.95, 0);
          const hx = M(new T.CylinderGeometry(0.05, 0.05, 0.06, 6).rotateZ(Math.PI / 2), "head", "steel", G);
          hx.position.set(s[0] * 1.1, 1.95, 0);
        });
        [[-0.38, 0.38], [0.38, 0.38], [-0.38, -0.38], [0.38, -0.38]].forEach(p => bolt("head", p[0], 2.19, p[1], 0.026, G, null));
      }
      if (liq) {
        const outl = M(e3Cyl(0.075, 0.2, 16, "z"), "cooling", "cast", G);
        outl.position.set(-0.2, 1.72, 0.55);
      }
      const ct = M(new T.BoxGeometry(0.14, 0.16, 0.16), "timing", "cast", G);
      ct.position.set(0.44, 1.15, -0.28);
      bolt("timing", 0.53, 1.15, -0.28, 0.045, G, "x");
    }
    /* свеча (слева, у 2T — сверху) */
    const plug = new T.Group();
    G.add(plug);
    if (two) plug.position.set(0, liq ? 1.83 : 1.75, 0);else {
      plug.position.set(-0.05, 1.82, -0.48);
      plug.rotation.x = -Math.PI / 2 + 0.25;
    }
    M(new T.CylinderGeometry(0.05, 0.05, 0.06, 6), "spark", "steel", plug);
    M(new T.CylinderGeometry(0.04, 0.045, 0.14, 16), "spark", "ceramic", plug).position.y = 0.09;
    M(new T.CylinderGeometry(0.075, 0.07, 0.34, 16), "spark", "red", plug).position.y = 0.3;
    const lead = new T.CatmullRomCurve3([new T.Vector3(0, 0.46, 0), new T.Vector3(0.1, 0.8, 0.2), new T.Vector3(0.6, 1.0, 0.4)]);
    M(new T.TubeGeometry(lead, 16, 0.025, 8), "spark", "black", plug);
    /* выпускной порт */
    const exP = two ? new T.Vector3(-0.5, 1.02, 0) : new T.Vector3(-0.57, 1.72, 0);
    M(e3Cyl(0.14, 0.08, 24, "x"), "exhaust", "polish", G).position.copy(exP);
    [-0.1, 0.1].forEach(dz => bolt("exhaust", exP.x - 0.05, exP.y + (dz > 0 ? 0.11 : -0.11), dz * 0.5, 0.028, G, "x"));
    /* впуск и карбюратор */
    const inP = two ? new T.Vector3(0.48, 0.82, 0) : new T.Vector3(0.57, 1.72, 0);
    const inPort = inP.clone();
    if (arch === "cub" && !two) {
      const man = new T.CatmullRomCurve3([inP.clone(), inP.clone().add(new T.Vector3(0.2, 0, 0)), inP.clone().add(new T.Vector3(0.35, 0.15, 0)), inP.clone().add(new T.Vector3(0.4, 0.35, 0))]);
      M(new T.TubeGeometry(man, 20, 0.11, 16), "carb", "cast", G);
      inP.add(new T.Vector3(0.4, 0.42, 0));
    }
    const ax = arch === "cub" && !two ? "y" : "x",
      dir = ax === "y" ? new T.Vector3(0, 1, 0) : new T.Vector3(1, 0, 0);
    const at = d => inP.clone().add(dir.clone().multiplyScalar(d));
    const geoAx = (r, h) => ax === "y" ? e3Cyl(r, h, 24) : e3Cyl(r, h, 24, "x");
    tag(M(geoAx(0.14, 0.24), "carb", "rubber", G), "intake").position.copy(at(0.12));
    [0.03, 0.21].forEach(d => {
      const cl = M(new T.TorusGeometry(0.145, 0.012, 6, 24), "carb", "steel", G);
      if (ax === "x") cl.rotation.y = Math.PI / 2;else cl.rotation.x = Math.PI / 2;
      cl.position.copy(at(d));
    });
    if (efi && !two) {
      tag(M(geoAx(0.17, 0.36), "carb", "cast", G), "throttlebody").position.copy(at(0.42));
      const inj = M(e3Cyl(0.05, 0.24, 16), "carb", "black", G);
      inj.position.copy(at(0.2)).add(new T.Vector3(0, 0.2, 0.15));
      inj.rotation.z = -0.4;
    } else {
      const body = M(geoAx(0.19, 0.4), "carb", arch === "cub" || has("cg") ? "zinc" : "brass", G);
      body.position.copy(at(0.44));
      const tw = M(e3Cyl(0.12, 0.3, 24), "carb", arch === "cub" || has("cg") ? "zinc" : "brass", G);
      tw.position.copy(at(0.44)).add(ax === "y" ? new T.Vector3(0.28, 0, 0) : new T.Vector3(0, 0.28, 0));
      if (ax === "y") tw.rotation.z = Math.PI / 2;
      const bowl = M(new T.BoxGeometry(0.28, 0.18, 0.28), "carb", arch === "cub" || has("cg") ? "zinc" : "brass", G);
      bowl.position.copy(at(0.44)).add(ax === "y" ? new T.Vector3(-0.25, 0, 0) : new T.Vector3(0, -0.25, 0));
      M(e3Cyl(0.03, 0.08, 12, "z"), "carb", "steel", G).position.copy(at(0.36)).add(new T.Vector3(0, 0, 0.22));
    }
    tag(M(geoAx(0.2, 0.36), "carb", "rubber", G), "airbox").position.copy(at(0.84));
    if (inst.indexOf("filter") >= 0) {
      const pod = tag(M(new T.CylinderGeometry(0.19, 0.28, 0.4, 24), "carb", "pod", G), "airbox");
      if (ax === "x") pod.rotation.z = -Math.PI / 2;
      pod.position.copy(at(1.2));
    } else {
      const box = tag(M(new T.BoxGeometry(ax === "x" ? 0.4 : 0.56, ax === "x" ? 0.56 : 0.4, 0.6), "carb", "black", G), "airbox");
      box.position.copy(at(1.22));
    }

    /* тросы, бензошланг, сапун, маслотрубка */
    const towerTop = at(0.44).add(ax === "y" ? new T.Vector3(0.45, 0, 0) : new T.Vector3(0, 0.46, 0));
    if (!efi || two) M(new T.TubeGeometry(new T.CatmullRomCurve3([towerTop, towerTop.clone().add(new T.Vector3(-0.05, 0.35, 0.05)), towerTop.clone().add(new T.Vector3(-0.35, 1.0, 0.25))]), 20, 0.022, 8), "carb", "black", G);
    const nip = efi && !two ? at(0.2).add(new T.Vector3(0, 0.36, 0.15)) : at(0.36).add(new T.Vector3(0, 0, 0.26));
    const fuelCurve = new T.CatmullRomCurve3([nip.clone().add(new T.Vector3(-0.1, 0.95, 0.3)), nip.clone().add(new T.Vector3(0.06, 0.4, 0.22)), nip.clone()]);
    const fuelHose = new T.Mesh(new T.TubeGeometry(fuelCurve, 24, 0.032, 8), new T.MeshStandardMaterial({
      color: 0xe0a040,
      metalness: 0,
      roughness: 0.15,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    }));
    G.add(fuelHose);
    if (!two) M(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0.3, 2.3, 0), new T.Vector3(0.8, 2.45, 0.05), new T.Vector3(1.2, 2.0, 0.15)]), 20, 0.03, 8), "head", "rubber", G);
    if (!two && !liq && arch !== "cub" && (arch === "vert" || arch === "cg")) {
      const oc = new T.CatmullRomCurve3([new T.Vector3(0.48, 0.66, 0.4), new T.Vector3(0.62, 1.15, 0.46), new T.Vector3(0.5, 1.78, 0.44)]);
      M(new T.TubeGeometry(oc, 24, 0.022, 8), "oil", "chrome", G);
      [oc.getPoint(0), oc.getPoint(1)].forEach(pp => {
        const bj = M(e3Bolt(0.04, 0.05), "oil", "steel", G);
        bj.position.copy(pp);
      });
    }
    const flowPts = two ? [at(1.22), at(0.84), at(0.44), at(0.12), inPort.clone(), new T.Vector3(0.2, 0.5, 0)] : arch === "cub" ? [at(1.22), at(0.84), at(0.44), at(0.12), inPort.clone().add(new T.Vector3(0.38, 0.3, 0)), inPort.clone().add(new T.Vector3(0.18, 0.02, 0)), inPort.clone(), new T.Vector3(0.3, 1.66, 0), new T.Vector3(0.17, 1.56, 0)] : [at(1.22), at(0.84), at(0.44), at(0.12), inPort.clone(), new T.Vector3(0.3, 1.66, 0), new T.Vector3(0.17, 1.56, 0)];
    const dotG = new T.SphereGeometry(0.03, 8, 6);
    const mkFlow = (n, parent) => {
      const m = new T.InstancedMesh(dotG, new T.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthWrite: false
      }), n);
      m.visible = false;
      m.frustumCulled = false;
      parent.add(m);
      for (let i = 0; i < n; i++) m.setColorAt(i, new T.Color(0xffffff));
      return m;
    };

    /* внутренности: поршень, шатун, клапаны с кулачками */
    const RC = 0.29;
    const piston = new T.Group();
    I.add(piston);
    M(e3Cyl(0.33, 0.32, 32), "cyl", "cast", piston);
    [0.11, 0.07, 0.03].forEach(y => {
      const r = M(new T.TorusGeometry(0.332, 0.008, 6, 32).rotateX(Math.PI / 2), "cyl", "steel", piston);
      r.position.y = y;
    });
    M(e3Cyl(0.06, 0.5, 16, "z"), "cyl", "steel", piston);
    const rod = tag(M(new T.BoxGeometry(0.1, 1, 0.08), "cyl", "steel", I), "rod");
    const chamber = tag(M(e3Cyl(0.33, 0.1, 32), "cyl", "fire", I), "piston");
    chamber.position.y = 1.44;
    tag(piston, "piston");
    chamber.material = chamber.material.clone();
    const parts = {
      G: G,
      I: I,
      piston: piston,
      rod: rod,
      chamber: chamber,
      ph: cf.ph,
      valves: [],
      cams: [],
      inOpen: 0,
      exOpen: 0,
      inFlow: {
        curve: new T.CatmullRomCurve3(flowPts),
        mesh: mkFlow(34, G),
        s: 0
      },
      fuel: {
        curve: fuelCurve,
        mesh: mkFlow(9, G),
        s: 0
      }
    };
    if (!two) {
      const four = /4 клап|8 клап|RFVC/.test(eng.cam) || has("zs4v") || dohc;
      const zs = four ? [-0.12, 0.12] : [0];
      const LMAX = 0.11;
      const mt = 2 * 0.13 / 14;
      const makeCam = (cx, lobes) => {
        const cam = new T.Group();
        I.add(cam);
        cam.position.set(cx, 2.06, 0);
        M(e3Cyl(0.04, 0.9, 12, "z"), "head", "steel", cam);
        lobes.forEach(lb => {
          const lob = new T.Shape();
          lob.absarc(0, 0, 0.07, Math.PI * 0.1, Math.PI * 0.9, true);
          lob.quadraticCurveTo(0, 0.18, 0.07 * Math.cos(Math.PI * 0.1), 0.07 * Math.sin(Math.PI * 0.1));
          const lm = M(e3Extrude(lob, 0.05, 0.004), "head", "gold", cam);
          lm.position.z = lb.z;
          lm.rotation.z = lb.beta - Math.PI / 2;
        });
        M(e3GearT(28, mt, 0.04, 0.05), "timing", "gear", cam).position.z = -0.36;
        tag(cam, "cam");
        parts.cams.push(cam);
        return cam;
      };
      const BETA = {
        in: -Math.PI / 4,
        ex: 5 * Math.PI / 4
      };
      if (dohc) {
        makeCam(0.17, zs.map(z => ({
          z: z,
          beta: BETA.in
        })));
        makeCam(-0.17, zs.map(z => ({
          z: z,
          beta: BETA.ex
        })));
      } else {
        makeCam(0, [{
          z: 0.07,
          beta: BETA.in
        }, {
          z: -0.07,
          beta: BETA.ex
        }]);
      }
      [["in", 0.17, 1], ["ex", -0.17, -1]].forEach(v => {
        const vg = new T.Group();
        I.add(vg);
        zs.forEach(z => {
          M(e3Cyl(0.02, 0.43, 10), "head", "steel", vg).position.set(v[1], 1.72, z);
          M(new T.CylinderGeometry(four ? 0.09 : 0.11, 0.07, 0.03, 24), "head", "steel", vg).position.set(v[1], 1.51, z);
          for (let k = 0; k < 4; k++) {
            const t = M(new T.TorusGeometry(0.055, 0.01, 6, 16).rotateX(Math.PI / 2), "head", "gold", vg);
            t.position.set(v[1], 1.76 + k * 0.035, z);
          }
          if (dohc) M(e3Cyl(0.065, 0.06, 20), "head", "polish", vg).position.set(v[1], 1.955, z);else M(e3Cyl(0.035, 0.02, 12), "head", "polish", vg).position.set(v[1], 1.935, z);
        });
        tag(vg, "valves");
        let finger = null;
        if (!dohc) {
          finger = new T.Group();
          finger.position.set(v[2] * 0.34, 1.985, 0);
          I.add(finger);
          const fb = M(new T.BoxGeometry(0.33, 0.035, four ? 0.36 : 0.12), "head", "steel", finger);
          fb.position.set(-v[2] * 0.165, -0.02, 0);
          M(e3Cyl(0.035, four ? 0.4 : 0.16, 12, "z"), "head", "polish", finger);
          tag(finger, "valves");
        }
        parts.valves.push({
          g: vg,
          kind: v[0],
          beta: BETA[v[0]],
          finger: finger,
          side: v[2]
        });
      });
      parts.lmax = LMAX;
      if (ci === 0) {
        const curve = new T.CatmullRomCurve3(e3LoopPoints([0, 0], 0.13, [0, 2.06], 0.26, 14), true);
        const len = curve.getLength(),
          pitch = 2 * Math.PI * 0.13 / 14,
          N = Math.floor(len / pitch);
        const links = new T.InstancedMesh(new T.BoxGeometry(pitch * 0.85, 0.028, 0.04), mat("timing", "steel"), N);
        links.userData.area = "timing";
        links.userData.det = "camchain";
        links.position.z = -0.36;
        I.add(links);
        meshes.push(links);
        parts.chain = {
          curve: curve,
          mesh: links,
          N: N,
          len: len,
          pitch: pitch
        };
        const tg = tag(M(e3GearT(14, mt, 0.05, 0.04), "timing", "gear", I), "camchain");
        tg.position.z = -0.36;
        parts.crankSproc = tg;
      }
    }
    if (ci === 0 || layout === "twin" || layout === "i3" || layout === "i4") {
      const crank = new T.Group();
      I.add(crank);
      [-0.14, 0.14].forEach(z => {
        const w = new T.Shape();
        w.absarc(0, 0, 0.42, Math.PI * 0.2, Math.PI * 0.8, true);
        w.lineTo(-0.11, RC);
        w.quadraticCurveTo(0, RC + 0.11, 0.11, RC);
        w.closePath();
        M(e3Extrude(w, 0.07, 0.01, 16), "cyl", "steel", crank).position.z = z;
      });
      M(e3Cyl(0.075, 0.36, 16, "z"), "cyl", "polish", crank).position.y = RC;
      M(e3Cyl(0.08, ci === 0 ? 1.0 : 0.6, 16, "z"), "cyl", "steel", crank);
      tag(crank, "crank");
      parts.crank = crank;
    }
    cyls.push(parts);
  });

  /* ---------- выпуск ---------- */
  const exG = new T.Group();
  outer.add(exG);
  outer.updateMatrixWorld(true);
  const zx = caseDepth / 2 + 0.22;
  cyls.forEach((c, i) => {
    const p0 = new T.Vector3(two ? -0.5 : -0.57, two ? 1.02 : 1.72, 0);
    c.G.localToWorld(p0);
    const z1 = layout === "twin" ? zx - (i ? 0 : 0.2) : zx;
    let pts;
    if (layout === "boxer") pts = [p0, p0.clone().add(new T.Vector3(-0.3, -0.3, 0)), new T.Vector3(-0.6, -1.0, p0.z * 0.6), new T.Vector3(0.6, -1.05, z1), new T.Vector3(1.6, -0.75, z1)];else if (arch === "cub") pts = [p0, p0.clone().add(new T.Vector3(-0.05, -0.4, 0.05)), new T.Vector3(p0.x + 0.15, -0.85, z1 * 0.6), new T.Vector3(0.4, -0.95, z1), new T.Vector3(1.5, -0.62, z1)];else if (two) pts = [p0, p0.clone().add(new T.Vector3(-0.35, -0.1, 0.05)), new T.Vector3(-1.15, -0.2, z1 * 0.6), new T.Vector3(-0.9, -0.95, z1), new T.Vector3(0.4, -0.95, z1), new T.Vector3(1.4, -0.45, z1)];else pts = [p0, p0.clone().add(new T.Vector3(-0.38, -0.12, 0.05)), new T.Vector3(-1.15, 0.15, z1 * 0.55), new T.Vector3(-1.05, -0.75, z1), new T.Vector3(0.2, -0.96, z1), new T.Vector3(1.45, -0.6, z1)];
    const curve = new T.CatmullRomCurve3(pts),
      r = two ? 0.1 : 0.08;
    const v0 = new T.Vector3(two ? -0.3 : -0.17, two ? 1.02 : 1.56, 0);
    c.G.localToWorld(v0);
    const mEnd = new T.Vector3(2.25 + 0.85 * Math.cos(0.32), -0.35 + 0.85 * Math.sin(0.32), zx),
      mStart = new T.Vector3(2.25 - 0.7 * Math.cos(0.32), -0.35 - 0.7 * Math.sin(0.32), zx);
    const exFlowCurve = new T.CatmullRomCurve3([v0].concat(pts).concat([mStart, mEnd]), false, "centripetal");
    const exm = new T.InstancedMesh(new T.SphereGeometry(0.045, 8, 6), new T.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    }), 44);
    exm.visible = false;
    exm.frustumCulled = false;
    exG.add(exm);
    for (let k = 0; k < 44; k++) exm.setColorAt(k, new T.Color(0xffffff));
    c.exFlow = {
      curve: exFlowCurve,
      mesh: exm,
      s: 0
    };
    const hm = inst.indexOf("full") >= 0 ? "ti" : "chrome";
    M(new T.TubeGeometry(curve, 90, r, 16, false), "exhaust", hm, exG);
    if (!two && inst.indexOf("full") < 0) M(new T.TubeGeometry(new T.CatmullRomCurve3(pts.slice(0, 3)), 30, r + 0.003, 16, false), "exhaust", "heat", exG);
    if (two) M(new T.TubeGeometry(new T.CatmullRomCurve3([pts[1], pts[2], pts[3], pts[4]]), 40, 0.2, 18, false), "exhaust", hm, exG);
  });
  const mm = inst.indexOf("slip") >= 0 || inst.indexOf("full") >= 0 ? "carbon" : "chrome";
  const muff = new T.Group();
  muff.position.set(2.25, -0.35, zx);
  muff.rotation.z = 0.32;
  exG.add(muff);
  M(e3Cyl(0.18, 1.45, 32, "x"), "exhaust", mm, muff);
  [-0.62, 0.62].forEach(x => M(e3Cyl(0.19, 0.06, 32, "x"), "exhaust", "black", muff).position.x = x);
  M(e3Cyl(0.08, 0.12, 20, "x"), "exhaust", "steel", muff).position.x = 0.78;
  const smokeO = new T.Object3D();
  smokeO.position.set(0.9, 0, 0);
  muff.add(smokeO);

  /* ---------- охлаждение ---------- */
  if (liq) {
    const rad = M(new T.BoxGeometry(0.14, 1.6, 1.15), "cooling", "black", outer);
    rad.position.set(-2.15, 0.85, 0);
    for (let i = 0; i < 14; i++) M(new T.BoxGeometry(0.15, 0.02, 1.1), "cooling", "fin", outer).position.set(-2.15, 0.15 + i * 0.1, 0);
    M(e3Cyl(0.08, 0.08, 20), "cooling", "polish", outer).position.set(-2.15, 1.7, 0.3);
    const p0 = new T.Vector3(-0.2, 1.72, 0.65);
    cyls[0].G.localToWorld(p0);
    M(new T.TubeGeometry(new T.CatmullRomCurve3([p0, new T.Vector3(-1.2, 1.6, 0.4), new T.Vector3(-2.05, 1.45, 0.2)]), 30, 0.065, 12), "cooling", "rubber", outer);
    M(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0.0, -0.45, zR + 0.05), new T.Vector3(-1.1, -0.6, 0.4), new T.Vector3(-2.05, 0.2, 0.2)]), 30, 0.065, 12), "cooling", "rubber", outer);
    const pump = tag(M(e3Cover(0.16, 0.08), "cooling", "polish", outer), "pump");
    pump.position.set(0.0, -0.45, zR + 0.05);
  } else if (inst.indexOf("oilcool") >= 0) {
    M(new T.BoxGeometry(0.1, 0.45, 0.8), "cooling", "black", outer).position.set(-1.9, 1.8, 0);
  }

  /* ---------- звезда и цепь ---------- */
  const sprocketR = 0.18,
    TS = 14;
  const sprocket = M(e3GearT(TS, 2 * sprocketR / TS, 0.07, 0.05), "gearbox", "gear", outer);
  sprocket.position.set(outC[0], outC[1], zL - 0.12);
  bolt("gearbox", outC[0], outC[1], zL - 0.18, 0.05);
  const chainPts = [new T.Vector3(4.5, outC[1] + sprocketR, 0), new T.Vector3(outC[0] + 0.4, outC[1] + sprocketR, 0)];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI / 2 + i / 16 * Math.PI;
    chainPts.push(new T.Vector3(outC[0] + Math.cos(a) * sprocketR, outC[1] + Math.sin(a) * sprocketR, 0));
  }
  chainPts.push(new T.Vector3(outC[0] + 0.4, outC[1] - sprocketR - 0.01, 0));
  chainPts.push(new T.Vector3(4.5, outC[1] - sprocketR - 0.25, 0));
  const chainCurve = new T.CatmullRomCurve3(chainPts, false, "centripetal");
  const chainPitch = 2 * Math.PI * sprocketR / TS,
    CN = Math.floor(chainCurve.getLength() / chainPitch);
  const chain = new T.InstancedMesh(new T.BoxGeometry(chainPitch * 0.9, 0.032, 0.055), mat("gearbox", "black"), CN);
  chain.userData.area = "gearbox";
  chain.userData.det = "chain";
  chain.position.z = zL - 0.12;
  outer.add(chain);
  meshes.push(chain);

  /* ---------- внутренности картера: всё в зацеплении ---------- */
  const IC = new T.Group();
  internals.add(IC);
  IC.visible = false;
  const distP = Math.hypot(clutchC[0], clutchC[1]),
    TP = 19,
    TB = 57,
    mp = 2 * distP / (TP + TB),
    rB = mp * TB / 2;
  const primD = tag(M(e3GearT(TP, mp, 0.08, 0.06), "clutch", "gear", IC), "primary");
  primD.position.z = 0.28;
  const basket = new T.Group();
  basket.position.set(clutchC[0], clutchC[1], 0.28);
  IC.add(basket);
  M(e3GearT(TB, mp, 0.07, 0.1), "clutch", "gear", basket);
  const shellB = M(new T.CylinderGeometry(rB * 0.8, rB * 0.8, 0.22, 32, 1, true).rotateX(Math.PI / 2), "clutch", "steel", basket);
  shellB.position.z = 0.14;
  shellB.material.side = T.DoubleSide;
  for (let k = 0; k < 8; k++) {
    const sl = M(new T.BoxGeometry(0.03, 0.06, 0.2), "clutch", "steel", basket);
    const a = k / 8 * Math.PI * 2;
    sl.position.set(Math.cos(a) * rB * 0.8, Math.sin(a) * rB * 0.8, 0.14);
    sl.rotation.z = a;
  }
  for (let k = 0; k < 6; k++) M(e3Cyl(rB * 0.74, 0.016, 32, "z"), "clutch", k % 2 ? "copper" : "steel", basket).position.z = 0.05 + k * 0.032;
  tag(basket, "clutch");
  const phP = e3Mesh(Math.atan2(clutchC[1], clutchC[0]), TP, TB);
  const inC = clutchC,
    outS = outC,
    dIO = Math.hypot(outS[0] - inC[0], outS[1] - inC[1]),
    alphaIO = Math.atan2(outS[1] - inC[1], outS[0] - inC[0]);
  const SUM = 44,
    mg = 2 * dIO / SUM,
    TIN = [11, 14, 17, 19, 21, 22];
  const nGears = /6 ст/.test(eng.gearbox) ? 6 : /4 ст/.test(eng.gearbox) ? 4 : /3 ст/.test(eng.gearbox) ? 3 : 5;
  const inShaft = new T.Group(),
    outShaft = new T.Group();
  inShaft.position.set(inC[0], inC[1], 0);
  outShaft.position.set(outS[0], outS[1], 0);
  IC.add(inShaft);
  IC.add(outShaft);
  M(e3Cyl(0.045, caseDepth, 12, "z"), "gearbox", "steel", inShaft);
  M(e3Cyl(0.045, caseDepth + 0.1, 12, "z"), "gearbox", "steel", outShaft).position.z = -0.05;
  const gearPairs = [];
  for (let i = 0; i < nGears; i++) {
    const z = -caseDepth / 2 + 0.12 + i * Math.min(0.1, (caseDepth - 0.34) / nGears),
      ti = TIN[i],
      to = SUM - ti;
    const gi = M(e3GearT(ti, mg, 0.055, 0.045), "gearbox", "gear", inShaft);
    gi.position.z = z;
    const holder = new T.Group();
    holder.position.set(outS[0], outS[1], z);
    IC.add(holder);
    const go = M(e3GearT(to, mg, 0.055, 0.045), "gearbox", "gear", holder);
    gearPairs.push({
      gi: gi,
      go: go,
      holder: holder,
      ratio: ti / to,
      ph: e3Mesh(alphaIO, ti, to)
    });
  }
  inShaft.traverse(x => {
    if (x.isMesh) x.userData.det = "gearbox";
  });
  gearPairs.forEach(gp => tag(gp.holder, "gearbox"));
  tag(outShaft, "gearbox");
  const rotor = new T.Group();
  rotor.position.set(0, 0, -caseDepth / 2 + 0.05);
  IC.add(rotor);
  const rr = Math.min(0.36, A.gen - 0.08);
  M(new T.CylinderGeometry(rr, rr, 0.12, 40, 1, true).rotateX(Math.PI / 2), "gen", "steel", rotor).material.side = T.DoubleSide;
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2,
      mg2 = M(new T.BoxGeometry(0.06, 0.11, 0.1), "gen", "black", rotor);
    mg2.position.set(Math.cos(a) * (rr - 0.04), Math.sin(a) * (rr - 0.04), 0);
    mg2.rotation.z = a;
  }
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2,
      co = M(new T.BoxGeometry(0.06, 0.07, 0.09), "gen", "copper", IC);
    co.position.set(Math.cos(a) * (rr - 0.15), Math.sin(a) * (rr - 0.15), -caseDepth / 2 + 0.05);
    co.rotation.z = a;
    co.userData.det = "stator";
  }
  tag(rotor, "rotor");
  let balancer = null,
    balPh = 0;
  if (bal) {
    const TBL = 22,
      mb = 0.025,
      db = mb * TBL,
      ab = Math.atan2(-0.32, -0.48);
    balancer = new T.Group();
    balancer.position.set(Math.cos(ab) * db, Math.sin(ab) * db, 0.16);
    IC.add(balancer);
    M(e3GearT(TBL, mb, 0.06, 0.05), "cyl", "gear", balancer);
    const w = new T.Shape();
    w.absarc(0, 0, 0.22, Math.PI * 1.15, Math.PI * 1.85, false);
    w.lineTo(0, 0);
    w.closePath();
    M(e3Extrude(w, 0.1, 0.01), "cyl", "steel", balancer).position.z = -0.12;
    const bd = tag(M(e3GearT(TBL, mb, 0.06, 0.05), "cyl", "gear", IC), "balancer");
    bd.position.z = 0.16;
    balancer.userData.drive = bd;
    tag(balancer, "balancer");
    balPh = e3Mesh(ab, TBL, TBL);
  }

  /* тень */
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const cx = cv.getContext("2d");
  const gr = cx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, "rgba(0,0,0,.6)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  cx.fillStyle = gr;
  cx.fillRect(0, 0, 128, 128);
  const shadow = new T.Mesh(new T.PlaneGeometry(6.5, 3.2), new T.MeshBasicMaterial({
    map: new T.CanvasTexture(cv),
    transparent: true,
    depthWrite: false
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0.3, -1.12, 0);
  root.add(shadow);
  const DEFDET = {
    oil: "crankcase",
    clutch: "clutchcover",
    gen: "gencover",
    gearbox: "sprocket",
    exhaust: "exhaust",
    carb: "carb",
    spark: "spark",
    cyl: "cylinder",
    head: "head",
    timing: "tensioner",
    cooling: "radiator"
  };
  meshes.forEach(m => {
    if (!m.userData.det) m.userData.det = DEFDET[m.userData.area] || null;
  });
  if (eng.groups.indexOf("efi") >= 0) meshes.forEach(m => {
    if (m.userData.det === "carb") m.userData.det = "throttlebody";
  });
  const vc = eng.cc / (layout === "single" ? 1 : layout === "i4" ? 4 : layout === "i3" ? 3 : 2),
    scale = Math.max(0.62, Math.min(1.3, Math.cbrt(vc / 250)));
  const ratioP = TP / TB;
  const exMats = Object.values(cache).filter(m => m.userData.area === "exhaust" && m.emissive && (m.name === "heat" || m.color.getHex() === 0xb48ad8 || m.color.getHex() === 0x8aa6d8));
  return {
    smokeO: smokeO,
    exMats: exMats,
    scale: scale,
    phP: phP,
    balPh: balPh,
    chainPitch: chainPitch,
    root: root,
    internals: internals,
    IC: IC,
    cyls: cyls,
    meshes: meshes,
    cache: cache,
    primD: primD,
    basket: basket,
    ratioP: ratioP,
    inShaft: inShaft,
    outShaft: outShaft,
    gearPairs: gearPairs,
    rotor: rotor,
    balancer: balancer,
    sprocket: sprocket,
    chain: chain,
    chainCurve: chainCurve,
    CN: CN,
    sprocketR: sprocketR,
    nGears: nGears,
    two: two
  };
}
/* Three.js (≈600 КБ) грузится только когда открывают 3D-вид мотора */
let threeLoading = null;
function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (!threeLoading) threeLoading = new Promise((ok, fail) => {
    const sc = document.createElement("script");
    sc.src = "vendor/three.min.js";
    sc.onload = () => window.THREE ? ok(window.THREE) : fail(new Error("three"));
    sc.onerror = () => {
      threeLoading = null;
      fail(new Error("three"));
    };
    document.head.appendChild(sc);
  });
  return threeLoading;
}
function Engine3D({
  eng,
  running,
  rpm,
  rpmLive,
  cut,
  gear,
  sel,
  det,
  onPick,
  onFail,
  finish
}) {
  const mount = useRef(null),
    live = useRef({});
  const [threeOk, setThreeOk] = useState(!!window.THREE);
  useEffect(() => {
    if (threeOk) return;
    let alive = true;
    loadThree().then(() => alive && setThreeOk(true), () => alive && onFail && onFail());
    return () => {
      alive = false;
    };
  }, []);
  live.current = {
    running: running,
    rpm: rpm,
    rpmLive: rpmLive,
    cut: cut,
    gear: gear,
    sel: sel,
    det: det,
    onPick: onPick
  };
  const wakeRef = useRef(null);
  useEffect(() => {
    if (wakeRef.current) wakeRef.current();
  });
  const key = eng.id + "|" + (eng.installed || []).join(",") + "|" + eng.carb + "|" + (finish || "");
  useEffect(() => {
    const el = mount.current;
    if (!threeOk) return;
    if (!el || !window.THREE) {
      onFail && onFail();
      return;
    }
    const T = THREE;
    let renderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
    } catch (e) {
      onFail && onFail();
      return;
    }
    if (!renderer.getContext()) {
      onFail && onFail();
      return;
    }
    /* чёткость: рисуем в разрешении экрана (до 2×); если телефон не успевает — ступенчато снижаем */
    let pr = Math.min(window.devicePixelRatio || 1, 2),
      slowN = 0;
    renderer.setPixelRatio(pr);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    el.appendChild(renderer.domElement);
    const scene = new T.Scene();
    /* студийное окружение для отражений */
    const env = new T.Scene();
    env.background = new T.Color(0x16191c);
    const room = new T.Mesh(new T.BoxGeometry(30, 16, 30), new T.MeshBasicMaterial({
      color: 0x1c2024,
      side: T.BackSide
    }));
    env.add(room);
    [[0, 7, 0, 10, 5, 2.4], [-12, 3, 4, 2, 8, 2.0], [12, 2, -4, 2, 6, 1.2], [0, 2, 13, 8, 2, 0.8]].forEach(s => {
      const m = new T.Mesh(new T.PlaneGeometry(s[3], s[4]), new T.MeshBasicMaterial({
        color: new T.Color(1, 0.97, 0.92).multiplyScalar(s[5]),
        side: T.DoubleSide
      }));
      m.position.set(s[0], s[1], s[2]);
      m.lookAt(0, 0, 0);
      env.add(m);
    });
    const pmrem = new T.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(env, 0.03);
    scene.environment = envRT.texture;
    scene.add(new T.HemisphereLight(0xdfe8f0, 0x2a2c30, 0.35));
    const key2 = new T.DirectionalLight(0xffffff, 1.0);
    key2.position.set(3, 6, 5);
    scene.add(key2);
    const fireL = new T.PointLight(0xff8a2a, 0, 3);
    scene.add(fireL);
    let lastAct = performance.now(),
      dirty = 3;
    const E = buildEngine3D(eng, finish);
    E.root.scale.setScalar(E.scale);
    const holder = new T.Group();
    holder.add(E.root);
    scene.add(holder);
    const box = new T.Box3().setFromObject(E.root),
      ctr = box.getCenter(new T.Vector3());
    E.root.position.sub(new T.Vector3(ctr.x, 0, ctr.z));
    E.root.position.y -= 0.1;
    const camera = new T.PerspectiveCamera(30, 1.5, 0.1, 100);
    const view = {
      yaw: Math.PI + 0.62,
      pitch: 0.2,
      dist: 8.6,
      tY: (box.max.y + box.min.y) / 2 - 0.1,
      idle: 0
    };
    function placeCam() {
      camera.position.set(Math.sin(view.yaw) * Math.cos(view.pitch) * view.dist, view.tY + Math.sin(view.pitch) * view.dist, Math.cos(view.yaw) * Math.cos(view.pitch) * view.dist);
      camera.lookAt(0, view.tY, 0);
    }
    function resize() {
      dirty = 3;
      lastAct = performance.now();
      const w = el.clientWidth,
        h = Math.max(260, Math.min(560, Math.round(w * 0.66)));
      renderer.setSize(w, h);
      camera.aspect = w / h;
      view.dist = (w < 520 ? 9.8 : 8.6) * (0.55 + 0.45 * E.scale);
      camera.updateProjectionMatrix();
    }
    resize();
    placeCam();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    /* управление: вращение, щипок, колесо, выбор */
    const ptrs = new Map();
    let drag = 0,
      pinch0 = 0,
      dist0 = 0;
    const cvs = renderer.domElement;
    cvs.style.touchAction = "none";
    const down = e => {
      wake();
      cvs.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      drag = 0;
      view.idle = 0;
      if (ptrs.size === 2) {
        const v = Array.from(ptrs.values());
        pinch0 = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]);
        dist0 = view.dist;
      }
    };
    const move = e => {
      if (!ptrs.has(e.pointerId)) return;
      wake();
      const p = ptrs.get(e.pointerId),
        dx = e.clientX - p[0],
        dy = e.clientY - p[1];
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2) {
        const v = Array.from(ptrs.values());
        const d = Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]);
        view.dist = Math.max(6, Math.min(18, dist0 * pinch0 / d));
      } else {
        drag += Math.abs(dx) + Math.abs(dy);
        view.yaw -= dx * 0.008;
        view.pitch = Math.max(-0.35, Math.min(1.2, view.pitch + dy * 0.006));
      }
      view.idle = 0;
    };
    const ray = new T.Raycaster(),
      ndc = new T.Vector2();
    const up = e => {
      const wasTap = ptrs.size === 1 && drag < 6;
      ptrs.delete(e.pointerId);
      if (wasTap) {
        const r = cvs.getBoundingClientRect();
        ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(E.meshes.filter(m => m.visible && m.parent && isVis(m)), false);
        const h = hits.find(x => x.object.userData.area && !(live.current.cut && x.object.material.userData && x.object.material.userData.shell));
        live.current.onPick && live.current.onPick(h ? h.object.userData.area : null, h ? h.object.userData.det : null);
      }
    };
    function isVis(o) {
      while (o) {
        if (!o.visible) return false;
        o = o.parent;
      }
      return true;
    }
    const wheel = e => {
      wake();
      e.preventDefault();
      view.dist = Math.max(6, Math.min(18, view.dist * (e.deltaY > 0 ? 1.08 : 0.93)));
      view.idle = 0;
    };
    cvs.addEventListener("pointerdown", down);
    cvs.addEventListener("pointermove", move);
    cvs.addEventListener("pointerup", up);
    cvs.addEventListener("pointercancel", up);
    cvs.addEventListener("wheel", wheel, {
      passive: false
    });
    let visible = true;
    const io = new IntersectionObserver(en => {
      visible = en[0].isIntersecting;
      if (visible) wake();
    });
    io.observe(el);
    function wake() {
      lastAct = performance.now();
      dirty = Math.max(dirty, 2);
      if (!raf) {
        last = performance.now() - 30;
        raf = requestAnimationFrame(tick);
      }
    }
    wakeRef.current = wake;
    const onVis = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener("visibilitychange", onVis);
    /* анимация */
    const dummy = new T.Object3D(),
      Y = new T.Vector3(0, 1, 0);
    let phi = 0,
      outAng = 0,
      chainS = 0,
      timS = 0,
      lastSel = null,
      lastCut = null,
      lastDet = null,
      raf = 0,
      last = performance.now();
    function setDet(d) {
      setSel(null);
      E.meshes.forEach(m => {
        if (m.userData.origD) {
          m.material = m.userData.origD;
          m.userData.origD = null;
        }
        if (d && m.userData.det === d && m.material && m.material.emissive) {
          m.userData.origD = m.material;
          const c = m.material.clone();
          c.emissive = new T.Color(0x8a5c00);
          m.material = c;
        }
      });
    }
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function setCut(c) {
      Object.values(E.cache).forEach(m => {
        const sh = m.userData.shell,
          see = m.userData.area === "exhaust" || m.userData.area === "carb";
        if (sh || see) {
          m.transparent = c ? true : m.userData.baseTransparent;
          m.opacity = c ? sh ? 0.13 : 0.28 : m.userData.baseOpacity;
          m.depthWrite = !c;
          m.needsUpdate = true;
        }
      });
      E.IC.visible = c;
      E.cyls.forEach(cy => {
        cy.I.visible = c;
      });
    }
    function setSel(s) {
      Object.values(E.cache).forEach(m => {
        if (m.emissive && !m.userData.isGold) {
          m.emissive.setHex(m.userData.area === s ? 0x6a4a00 : m.userData.baseEm || 0);
        }
      });
    }
    Object.values(E.cache).forEach(m => {
      if (m.emissive) m.userData.baseEm = m.emissive.getHex();
    });
    const FLOW_AIR = new T.Color(0xdfeaf5),
      FLOW_MIX = new T.Color(0x6aaeff),
      FLOW_FUEL = new T.Color(0xffb020),
      FLOW_HOT = new T.Color(0xff6a1a),
      FLOW_SMOKE = new T.Color(0x8d9399);
    const fdum = new T.Object3D();
    function placeFlow(f, n, colorAt, scaleAt) {
      for (let i = 0; i < n; i++) {
        const t = (i / n + f.s) % 1;
        fdum.position.copy(f.curve.getPointAt(t));
        const sc = scaleAt(t);
        fdum.scale.set(sc, sc, sc);
        fdum.updateMatrix();
        f.mesh.setMatrixAt(i, fdum.matrix);
        f.mesh.setColorAt(i, colorAt(t));
      }
      f.mesh.instanceMatrix.needsUpdate = true;
      if (f.mesh.instanceColor) f.mesh.instanceColor.needsUpdate = true;
    }
    function placeChain(mesh, curve, n, offset, len, pitch) {
      const step = pitch || len / n;
      for (let i = 0; i < n; i++) {
        let t = (i * step + offset) % len / len;
        if (t < 0) t += 1;
        const p = curve.getPointAt(t),
          tg = curve.getTangentAt(t);
        dummy.position.copy(p);
        dummy.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), tg);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    const outLen = E.chainCurve.getLength();
    const scv = document.createElement("canvas");
    scv.width = scv.height = 64;
    const sx = scv.getContext("2d");
    const sg = sx.createRadialGradient(32, 32, 2, 32, 32, 32);
    sg.addColorStop(0, "rgba(255,255,255,.85)");
    sg.addColorStop(0.5, "rgba(255,255,255,.35)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    sx.fillStyle = sg;
    sx.fillRect(0, 0, 64, 64);
    const smokeTex = new T.CanvasTexture(scv),
      smoke = [],
      smokeCol = E.two ? 0xbfcdf0 : 0xd9dde0;
    for (let i = 0; i < 56; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({
        map: smokeTex,
        color: smokeCol,
        transparent: true,
        depthWrite: false,
        opacity: 0
      }));
      sp.visible = false;
      sp.userData = {
        age: 0,
        life: 1,
        v: new T.Vector3()
      };
      scene.add(sp);
      smoke.push(sp);
    }
    let spawnAcc = 0,
      heat = 0;
    const sq = new T.Quaternion(),
      sp0 = new T.Vector3(),
      ax = new T.Vector3();
    function tick(t) {
      raf = requestAnimationFrame(tick);
      const raw = (t - last) / 1000;
      if (raw < 1 / 40) return;
      last = t;
      if (raw > 0.048 && raw < 0.5) slowN++;else if (slowN > 0) slowN--;
      if (slowN > 24 && pr > 1) {
        pr = Math.max(1, pr - 0.5);
        renderer.setPixelRatio(pr);
        slowN = 0;
        dirty = 3;
      }
      const dt = Math.min(0.05, raw);
      if (!visible || document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      const L = live.current;
      if (L.cut !== lastCut) {
        setCut(!!L.cut);
        lastCut = L.cut;
        dirty = 3;
      }
      if (L.det !== lastDet) {
        setDet(L.det);
        lastDet = L.det;
        dirty = 3;
      } else if (L.sel !== lastSel && !L.det) {
        setSel(L.sel);
        lastSel = L.sel;
        dirty = 3;
      }
      if (!L.running && !L.cut && performance.now() - lastAct > 1500 && dirty <= 0) {
        cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      dirty--;
      const R = L.rpmLive && L.rpmLive.current && L.rpmLive.current.raf ? L.rpmLive.current.r : L.rpm;
      const speed = reduce ? 0 : L.running ? 0.2 + R / 5200 : L.cut ? 0.2 : 0;
      const w = speed * Math.PI * 2;
      phi += w * dt;
      placeCam();
      /* цилиндры: поршень, шатун, коленвал, кулачки → клапаны */
      E.cyls.forEach((c, ci) => {
        const th = phi + c.ph,
          r = 0.29,
          Lr = 1.0;
        const pinY = r * Math.cos(th) + Math.sqrt(Lr * Lr - Math.pow(r * Math.sin(th), 2));
        c.piston.position.set(0, pinY + 0.02, 0);
        const cp = new T.Vector3(r * Math.sin(th), r * Math.cos(th), 0),
          pp = new T.Vector3(0, pinY, 0);
        c.rod.position.copy(cp).add(pp).multiplyScalar(0.5);
        c.rod.quaternion.setFromUnitVectors(Y, pp.clone().sub(cp).normalize());
        c.rod.scale.y = cp.distanceTo(pp);
        if (c.crank) c.crank.rotation.z = -th;
        c.cams.forEach(cm => {
          cm.rotation.z = -th / 2;
        });
        c.valves.forEach(v => {
          const nose = v.beta - th / 2,
            d = e3Wrap(nose + Math.PI / 2);
          const lc = Math.abs(d) < Math.PI / 2 ? Math.pow(Math.cos(d), 2) * c.lmax : 0;
          if (v.finger) {
            v.finger.rotation.z = v.side * Math.atan2(lc, 0.31);
            v.g.position.y = -lc * 0.55;
          } else v.g.position.y = -lc * 0.6;
        });
        if (!E.two && c.valves.length) {
          let li = 0,
            le = 0;
          c.valves.forEach(v => {
            const nose = v.beta - th / 2,
              d = e3Wrap(nose + Math.PI / 2),
              lc = Math.abs(d) < Math.PI / 2 ? Math.pow(Math.cos(d), 2) : 0;
            if (v.kind === "in") li = lc;else le = lc;
          });
          c.inOpen = li;
          c.exOpen = le;
        }
        if (E.two) {
          const d2 = (th * 180 / Math.PI % 360 + 360) % 360;
          c.exOpen = d2 > 100 && d2 < 260 ? Math.sin(Math.PI * (d2 - 100) / 160) : 0;
          c.inOpen = d2 > 200 || d2 < 30 ? 0.8 : 0.1;
        }
        const flowOn = L.running || L.cut,
          sf = Math.max(0.18, speed);
        [c.inFlow, c.fuel, c.exFlow].forEach(f => {
          if (f) f.mesh.visible = flowOn;
        });
        if (flowOn) {
          c.inFlow.s += dt * sf * (0.05 + 0.5 * c.inOpen);
          c.fuel.s += dt * sf * 0.22;
          if (c.exFlow) c.exFlow.s += dt * sf * (0.04 + 0.85 * c.exOpen);
          placeFlow(c.inFlow, 34, t => t < 0.33 ? FLOW_AIR : FLOW_MIX, t => t > 0.9 ? 0.7 : 1);
          placeFlow(c.fuel, 9, () => FLOW_FUEL, () => 1);
          if (c.exFlow) placeFlow(c.exFlow, 44, t => t < 0.1 ? FLOW_HOT : FLOW_HOT.clone().lerp(FLOW_SMOKE, Math.min(1, (t - 0.1) / 0.5)), t => 0.6 + t * 0.9);
        }
        const deg = (th * 180 / Math.PI % 720 + 720) % 720;
        let fire = 0;
        if (E.two) {
          const dd = (th * 180 / Math.PI % 360 + 360) % 360;
          fire = dd < 90 ? 1 - dd / 90 : 0;
        } else fire = deg >= 360 && deg < 450 ? 1 - (deg - 360) / 90 : 0;
        if (L.cut) {
          const cm = c.chamber.material;
          if (fire > 0.05) {
            cm.color.setHex(0xff8a2a);
            cm.opacity = fire * 0.85;
          } else if (E.two) {
            cm.color.setHex(0x7fb8ff);
            cm.opacity = 0.25;
          } else if (deg < 360) {
            cm.color.setHex(0x7fb8ff);
            cm.opacity = deg < 180 ? 0.12 + 0.18 * deg / 180 : 0.3 + 0.2 * (deg - 180) / 180;
          } else if (deg < 540) {
            cm.color.setHex(0xff9a50);
            cm.opacity = 0.35 * (1 - (deg - 450) / 90);
          } else {
            cm.color.setHex(0x9aa0a6);
            cm.opacity = 0.28 * (1 - (deg - 540) / 180);
          }
        } else c.chamber.material.opacity = 0;
        c.chamber.position.y = Math.max(pinY + 0.25, 1.2) + 0.03;
        if (ci === 0) {
          fireL.intensity = L.cut && speed > 0 ? fire * 3 : 0;
          const wp = new T.Vector3(0, 1.4, 0);
          c.G.localToWorld(wp);
          fireL.position.copy(wp);
        }
        if (c.crankSproc) c.crankSproc.rotation.z = -th;
        if (c.chain && L.cut) placeChain(c.chain.mesh, c.chain.curve, c.chain.N, -th * 0.13, c.chain.len, c.chain.pitch);
      });
      /* первичка → корзина → первичный вал → шестерни КПП (каждая со своей скоростью) */
      const aCrank = -phi,
        aBasket = -E.ratioP * aCrank + E.phP;
      if (E.IC.visible) {
        E.primD.rotation.z = aCrank;
        E.basket.rotation.z = aBasket;
        E.inShaft.rotation.z = aBasket;
        E.rotor.rotation.z = aCrank;
        if (E.balancer) {
          E.balancer.userData.drive.rotation.z = aCrank;
          E.balancer.rotation.z = -aCrank + E.balPh;
        }
        E.gearPairs.forEach((gp, i) => {
          gp.holder.rotation.z = -gp.ratio * aBasket + gp.ph;
          const on = L.gear === i + 1;
          gp.gi.material = mat2(gp.gi, on);
          gp.go.material = mat2(gp.go, on);
        });
      }
      /* вторичный вал и звезда: скорость включённой передачи; цепь — тот же шаг, что у звезды */
      const g = L.gear > 0 && L.gear <= E.gearPairs.length ? E.gearPairs[L.gear - 1] : null;
      const wOut = g ? -g.ratio * -E.ratioP * -w : 0;
      outAng += wOut * dt;
      E.outShaft.rotation.z = outAng;
      E.sprocket.rotation.z = outAng;
      placeChain(E.chain, E.chainCurve, E.CN, outAng * E.sprocketR, outLen, E.chainPitch);
      /* выхлопные газы и нагрев коллектора */
      heat = L.running ? Math.min(1, heat + dt / 12) : Math.max(0, heat - dt / 25);
      E.exMats.forEach(m => m.emissive.setRGB(0.9 * heat * 0.45, 0.35 * heat * 0.45, 0.05 * heat * 0.45));
      if (L.running && !reduce) {
        spawnAcc += dt * (5 + R / 330) * (E.two ? 1.4 : 1);
        E.smokeO.getWorldPosition(sp0);
        E.smokeO.getWorldQuaternion(sq);
        ax.set(1, 0, 0).applyQuaternion(sq);
        while (spawnAcc >= 1) {
          spawnAcc -= 1;
          const p = smoke.find(s => !s.visible);
          if (!p) break;
          p.visible = true;
          p.position.copy(sp0);
          p.userData.age = 0;
          p.userData.life = 1.1 + Math.random() * 0.9;
          const sp = (0.6 + R / 4200) * E.scale;
          p.userData.v.copy(ax).multiplyScalar(sp).add(new T.Vector3((Math.random() - 0.5) * 0.35, 0.15 + Math.random() * 0.25, (Math.random() - 0.5) * 0.35));
          p.userData.s0 = (0.18 + Math.random() * 0.12) * E.scale;
          p.userData.op = (E.two ? 0.5 : 0.32) * (0.7 + Math.random() * 0.5);
        }
      }
      smoke.forEach(p => {
        if (!p.visible) return;
        const u = p.userData;
        u.age += dt;
        const k = u.age / u.life;
        if (k >= 1) {
          p.visible = false;
          p.material.opacity = 0;
          return;
        }
        u.v.multiplyScalar(1 - dt * 1.4);
        u.v.y += dt * 0.45;
        p.position.addScaledVector(u.v, dt);
        const s = u.s0 * (1 + k * 4.5);
        p.scale.set(s, s, s);
        p.material.opacity = u.op * (1 - k) * Math.min(1, k * 6);
      });
      renderer.render(scene, camera);
    }
    const goldM = new T.MeshStandardMaterial({
      color: 0xf0c040,
      metalness: 1,
      roughness: 0.25,
      emissive: 0x3a2800
    });
    goldM.userData = {
      area: "gearbox",
      isGold: true
    };
    function mat2(mesh, on) {
      if (!mesh.userData.orig) mesh.userData.orig = mesh.material;
      return on ? goldM : mesh.userData.orig;
    }
    placeChain(E.chain, E.chainCurve, E.CN, 0, outLen, E.chainPitch);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      cvs.removeEventListener("pointerdown", down);
      cvs.removeEventListener("pointermove", move);
      cvs.removeEventListener("pointerup", up);
      cvs.removeEventListener("pointercancel", up);
      cvs.removeEventListener("wheel", wheel);
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.isSprite) o.material.dispose();
      });
      smokeTex.dispose();
      Object.values(E.cache).forEach(m => m.dispose());
      goldM.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (cvs.parentNode) cvs.parentNode.removeChild(cvs);
    };
  }, [key, threeOk]);
  return /*#__PURE__*/React.createElement("div", {
    className: "e3d",
    ref: mount,
    "aria-label": "3D-модель двигателя " + eng.code + ". Крути пальцем, щипок — приближение, касание — выбрать узел."
  });
}
/* ===== Мотоцикл целиком v7: внешний вид зависит от класса и комплектации ===== */
function bikeClass(bike, eng) {
  const t = bike.type;
  if (t === "Мопед") return "moped";
  if (t === "Спорт") return "sport";
  if (t === "Чоппер") return "cruiser";
  if (t === "Нейкед") return "naked";
  if (t === "Триал") return "trial";
  if (t === "Питбайк") return eng.cc <= 115 ? "kids" : "pit";
  if (t === "Мотард") return "motard";
  if (t === "Тур-эндуро") return "tour";
  if (t === "Лёгкий эндуро" || t === "Классика") return "light";
  if (t === "Кросс-эндуро" || eng.stroke === "2T") return "cross";
  return "enduro";
}
const GEO = {
  enduro: {
    s: 1,
    dx: 0,
    dy: 0,
    rr: 92,
    rf: 100
  },
  cross: {
    s: 1,
    dx: 0,
    dy: 0,
    rr: 92,
    rf: 100
  },
  tour: {
    s: 1,
    dx: 0,
    dy: 0,
    rr: 92,
    rf: 100
  },
  motard: {
    s: 1,
    dx: 0,
    dy: 8,
    rr: 84,
    rf: 92
  },
  light: {
    s: 0.95,
    dx: 16,
    dy: 23,
    rr: 84,
    rf: 92
  },
  pit: {
    s: 0.88,
    dx: 40,
    dy: 58,
    rr: 70,
    rf: 78
  },
  sport: {
    s: 1,
    dx: 0,
    dy: 8,
    rr: 84,
    rf: 92
  },
  naked: {
    s: 1,
    dx: 0,
    dy: 8,
    rr: 84,
    rf: 92
  },
  cruiser: {
    s: 0.95,
    dx: 16,
    dy: 23,
    rr: 84,
    rf: 92
  },
  trial: {
    s: 0.95,
    dx: 16,
    dy: 18,
    rr: 88,
    rf: 96
  },
  moped: {
    s: 0.88,
    dx: 40,
    dy: 58,
    rr: 74,
    rf: 74
  },
  kids: {
    s: 0.72,
    dx: 90,
    dy: 120,
    rr: 56,
    rf: 62
  }
};
function bikeLook(bike, eng, cu) {
  const cls = bikeClass(bike, eng),
    h = hashStr(bike.brand + bike.name);
  const road = ["light", "tour", "moped", "motard"].indexOf(cls) >= 0;
  const L0 = {
    cls: cls,
    g: GEO[cls],
    h: h,
    knobby: ["motard", "moped"].indexOf(cls) < 0,
    usd: ["enduro", "cross", "motard", "tour"].indexOf(cls) >= 0 && (eng.groups.indexOf("dohc") >= 0 || eng.groups.indexOf("zs4v") >= 0 || eng.groups.indexOf("liquid") >= 0 || h % 3 !== 0),
    lights: cls === "cross" ? "none" : cls === "tour" ? "fairing" : cls === "light" || cls === "moped" ? "round" : "mask",
    mirrors: road,
    signals: road,
    rack: cls === "tour",
    pannier: cls === "tour" && h % 2 === 0,
    tank: cls === "tour" ? "big" : cls === "light" || cls === "moped" ? "classic" : "slim",
    shrouds: ["light", "moped"].indexOf(cls) < 0,
    twinShock: cls === "moped",
    exhaust: eng.stroke === "2T" ? "pipe2t" : cls === "light" || cls === "moped" ? "low" : "high",
    fenderLow: cls === "motard" || cls === "light" || cls === "moped",
    horiz: eng.groups.indexOf("horiz") >= 0,
    plates: ["enduro", "cross", "pit", "kids", "motard"].indexOf(cls) >= 0,
    shapeV: h % 3,
    sideV: (h >>> 3) % 3,
    stripe: ["#FFFFFF", "#1B1F22", "#E5E7EB", "#E5533D"][(h >>> 5) % 4],
    frameCol: ["#2C323A", "#1E2226", "#33384A"][(h >>> 7) % 3],
    swingAlu: ["enduro", "cross", "motard", "tour"].indexOf(cls) >= 0,
    num: cu && cu.raceNum || (bike.name.match(/\d+/) || [""])[0].slice(0, 3) || String(10 + h % 89)
  };
  if (cls === "sport") Object.assign(L0, {
    knobby: false,
    usd: true,
    lights: "fairing",
    mirrors: true,
    signals: true,
    tank: "big",
    shrouds: false,
    twinShock: false,
    exhaust: eng.stroke === "2T" ? "pipe2t" : "low",
    fenderLow: true,
    plates: false,
    swingAlu: true
  });
  if (cls === "naked") Object.assign(L0, {
    knobby: false,
    usd: true,
    lights: "round",
    mirrors: true,
    signals: true,
    tank: "big",
    shrouds: false,
    exhaust: "low",
    fenderLow: true,
    plates: false,
    swingAlu: true
  });
  if (cls === "cruiser") Object.assign(L0, {
    knobby: false,
    usd: false,
    lights: "round",
    mirrors: true,
    signals: true,
    tank: "classic",
    shrouds: false,
    twinShock: true,
    exhaust: "low",
    fenderLow: true,
    plates: false,
    swingAlu: false
  });
  if (cls === "trial") Object.assign(L0, {
    knobby: true,
    usd: false,
    lights: "none",
    mirrors: false,
    signals: false,
    tank: "slim",
    shrouds: true,
    exhaust: eng.stroke === "2T" ? "pipe2t" : "high",
    fenderLow: false,
    plates: false
  });
  return L0;
}
const BIKE_PINS = {
  engine: [404, 252],
  fork: [508, 200],
  shock: [316, 206],
  brakes: [531, 294],
  wheels: [150, 236],
  chain: [252, 290],
  cockpit: [446, 92],
  electric: [512, 140],
  frame: [268, 176]
};
function bikePins(bike, eng, cu) {
  const L = bikeLook(bike, eng, cu),
    g = L.g;
  return Object.keys(BIKE_PINS).map(id => {
    let p = BIKE_PINS[id];
    if (id === "shock" && L.twinShock) p = [204, 222];
    return {
      id: id,
      x: p[0] * g.s + g.dx,
      y: p[1] * g.s + g.dy
    };
  });
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16,
    g = n >> 8 & 255,
    b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return "#" + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, "0")).join("");
}
function sprocketPath(cx, cy, r, t) {
  let d = "";
  const st = Math.PI * 2 / t;
  for (let i = 0; i < t; i++) {
    const a = i * st;
    [[a, r - 3.5], [a + st * 0.2, r + 1.5], [a + st * 0.45, r + 1.5], [a + st * 0.65, r - 3.5]].forEach((p, j) => {
      d += (i === 0 && j === 0 ? "M" : "L") + (cx + p[1] * Math.cos(p[0])).toFixed(1) + "," + (cy + p[1] * Math.sin(p[0])).toFixed(1);
    });
  }
  return d + "Z";
}
/* ===== Мотоцикл: рисунок по реальной геометрии (js/bike-art.js) и настоящее фото модели ===== */
function bikeArtFor(bike, eng, cu) {
  const L = bikeLook(bike, eng, cu);
  const cls = bike.type === "Классика" ? "classic" : L.cls;
  const g = eng.groups || [],
    inst = eng.installed || [];
  const cn = !/^(Honda|Yamaha|Kawasaki|Suzuki|KTM|Husqvarna|GasGas|Beta|Sherco|TM Racing|Fantic|Rieju|BMW|Triumph|Ducati|Aprilia|Harley-Davidson|Royal Enfield)$/.test(bike.brand);
  const col = window.bikeLivery(bike.brand, bike.name, cu && cu.color);
  const road = ["naked", "sport", "cruiser", "classic", "tour", "moped", "light", "motard"].indexOf(cls) >= 0;
  return window.bikeArt({
    uid: "bk",
    cls: cls,
    brand: bike.brand.length <= 12 ? bike.brand : bike.brand.split(/[\s-]/)[0],
    num: L.num,
    eng: {
      stroke: eng.stroke,
      cc: eng.cc,
      horiz: g.indexOf("horiz") >= 0,
      liquid: g.indexOf("liquid") >= 0,
      efi: g.indexOf("efi") >= 0,
      layout: eng.layout || "single",
      dark: g.indexOf("liquid") >= 0 || !cn
    },
    col: col,
    mods: inst,
    o: {
      kick: /Кик|кик/.test(eng.start || ""),
      handguards: ["enduro", "cross", "tour"].indexOf(cls) >= 0 || inst.indexOf("hand") >= 0,
      plate: road || cls === "enduro",
      signals: road && cls !== "motard",
      mirrors: road,
      usd: L.usd,
      cast: ["naked", "sport", "cruiser"].indexOf(cls) >= 0 || cls === "tour" && eng.cc >= 700,
      frontDisc: ["naked", "sport", "tour", "cruiser", "motard"].indexOf(cls) >= 0,
      twinShock: L.twinShock,
      swingAlu: L.swingAlu,
      fenderCol: col.fender,
      guard: col.guard,
      number: cls === "cross"
    }
  });
}
function BikeSVG({
  eng,
  bike,
  cu,
  sel,
  onSel,
  running
}) {
  const art = useMemo(() => bikeArtFor(bike, eng, cu), [bike, eng, cu]);
  const vb = art.vb,
    k = vb[2] / 640;
  const click = id => e => {
    e.stopPropagation();
    onSel(id);
  };
  const smoke = art.smoke && running ? {
    "--sx": ((art.smoke[0] - vb[0]) / vb[2] * 100).toFixed(1) + "%",
    "--sy": ((art.smoke[1] - vb[1]) / vb[3] * 100).toFixed(1) + "%"
  } : null;
  return /*#__PURE__*/React.createElement("div", {
    className: "bike-box"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "bike-svg" + (running ? " running" : ""),
    viewBox: vb.join(" "),
    role: "img",
    "aria-label": "Рисунок " + bike.brand + " " + bike.name,
    onClick: () => onSel(null)
  }, /*#__PURE__*/React.createElement("g", {
    dangerouslySetInnerHTML: {
      __html: art.svg
    }
  }), !running && Object.keys(art.pins).map(id => CH_AREAS[id] && /*#__PURE__*/React.createElement("g", {
    key: id,
    className: "pin" + (sel === id ? " on" : ""),
    transform: "translate(" + art.pins[id][0] + " " + art.pins[id][1] + ") scale(" + k.toFixed(2) + ")",
    role: "button",
    tabIndex: "0",
    "aria-label": CH_AREAS[id].t,
    onClick: click(id),
    onKeyDown: e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSel(id);
      }
    }
  }, /*#__PURE__*/React.createElement("title", null, CH_AREAS[id].t), /*#__PURE__*/React.createElement("circle", {
    className: "pin-hit",
    r: "24"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "pin-pulse",
    r: "13"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "pin-dot",
    r: "11"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "pin-core",
    r: "4"
  })))), smoke && /*#__PURE__*/React.createElement(Smoke, {
    two: eng.stroke === "2T",
    rpm: 1600,
    back: true,
    style: smoke
  }));
}

/* Настоящее фото модели — Wikimedia Commons (свободные лицензии). Ищем по точному названию
   марки и модели в имени файла; результат (и «не нашли») запоминаем, чтобы не спрашивать каждый раз */
const PHOTO_DROP = ["enduro"];
function photoWords(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-.\/'’]/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
}
function photoModelWords(name) {
  const clean = String(name).replace(/\([^)]*\)/g, " ").replace(/\b\d{2}\/\d{2}\b/g, " ").replace(/[А-Яа-яЁё]+/g, " ");
  return photoWords(clean).filter(w => PHOTO_DROP.indexOf(w) < 0);
}
const PHOTO_BAD = ["engine", "motor", "dashboard", "cockpit", "speedometer", "instrument", "instruments", "logo", "emblem", "badge", "detail", "details", "closeup", "interior", "crash", "wreck", "accident", "exhaust", "muffler", "seat", "tank", "wheel", "brake", "headlight", "taillight", "fork", "frame", "toy", "lego", "drawing", "sketch", "poster", "brochure", "sticker", "rally", "adventure", "supermoto", "motard", "scrambler", "tracker", "cafe", "police", "concept", "prototype", "custom", "electric", "sidecar", "rider", "riding", "jump"];
function photoPick(pages, brandW, modelW) {
  let best = null;
  (pages || []).forEach(pg => {
    const ii = pg.imageinfo && pg.imageinfo[0];
    if (!ii || !/jpe?g|png|webp/.test(ii.mime || "") || !ii.thumburl) return;
    const t = photoWords(String(pg.title).replace(/^File:/i, "").replace(/\.[a-z0-9]+$/i, ""));
    if (!brandW.every(w => t.indexOf(w) >= 0) || !modelW.every(w => t.indexOf(w) >= 0)) return;
    if (t.some(w => PHOTO_BAD.indexOf(w) >= 0 && modelW.indexOf(w) < 0)) return;
    const a = ii.width / Math.max(1, ii.height);
    let sc = (ii.width >= 1200 ? 2 : ii.width >= 800 ? 1 : -1) + (a >= 1.25 && a <= 2.1 ? 2 : a >= 1.05 ? 1 : -3);
    if (t.some(w => ["side", "profile", "left", "right", "studio"].indexOf(w) >= 0)) sc += 1;
    if (t.length - brandW.length - modelW.length > 7) sc -= 1;
    if (!best || sc > best.sc) best = {
      sc: sc,
      u: ii.thumburl,
      w: ii.thumbwidth,
      h: ii.thumbheight,
      page: ii.descriptionurl,
      by: String(ii.extmetadata && ii.extmetadata.Artist && ii.extmetadata.Artist.value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 48),
      lic: String(ii.extmetadata && ii.extmetadata.LicenseShortName && ii.extmetadata.LicenseShortName.value || "").slice(0, 24)
    };
  });
  return best && best.sc >= 1 ? best : null;
}
async function findModelPhoto(bike) {
  const brandW = photoWords(bike.brand),
    modelW = photoModelWords(bike.name);
  if (!modelW.length) return null;
  const terms = [bike.brand].concat(String(bike.name).replace(/\([^)]*\)/g, " ").replace(/\b\d{2}\/\d{2}\b/g, " ").replace(/[А-Яа-яЁё]+/g, " ").split(/\s+/).filter(w => w && PHOTO_DROP.indexOf(w.toLowerCase()) < 0));
  const q = "filetype:bitmap " + terms.map(w => 'intitle:"' + w.replace(/"/g, "") + '"').join(" ");
  const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&generator=search&gsrnamespace=6&gsrlimit=30&gsrsearch=" + encodeURIComponent(q) + "&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&iiurlwidth=1280&iiextmetadatafilter=Artist%7CLicenseShortName";
  const r = await fetch(url);
  if (!r.ok) throw new Error("commons " + r.status);
  const j = await r.json();
  return photoPick(j && j.query && j.query.pages, brandW, modelW);
}
function photoCache(key, val) {
  try {
    const m = JSON.parse(localStorage.getItem("mh2-mphoto") || "{}");
    if (val === undefined) {
      const v = m[key];
      return v && Date.now() - v.t < (v.u ? 60 : 14) * 864e5 ? v : null;
    }
    m[key] = Object.assign({
      t: Date.now()
    }, val || {});
    const ks = Object.keys(m);
    if (ks.length > 300) ks.sort((x, y) => m[x].t - m[y].t).slice(0, ks.length - 300).forEach(x => delete m[x]);
    localStorage.setItem("mh2-mphoto", JSON.stringify(m));
  } catch (e) {}
  return null;
}
function useModelPhoto(bike) {
  const key = bikeKey(bike);
  const [st, setSt] = useState(() => photoCache(key) || {
    loading: true
  });
  useEffect(() => {
    const c = photoCache(key);
    if (c) {
      setSt(c);
      return;
    }
    let alive = true;
    setSt({
      loading: true
    });
    findModelPhoto(bike).then(p => {
      photoCache(key, p || {});
      if (alive) setSt(photoCache(key) || {});
    }, () => alive && setSt({}));
    return () => {
      alive = false;
    };
  }, [key]);
  return st;
}
function BikeView(props) {
  const {
    bike,
    running
  } = props;
  const ph = useModelPhoto(bike);
  const [mode, setMode] = useState(() => load("bikeview", "photo"));
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(false), [ph.u]);
  const showPhoto = !!ph.u && mode === "photo";
  return /*#__PURE__*/React.createElement("div", {
    className: "bike-view"
  }, showPhoto ? /*#__PURE__*/React.createElement("figure", {
    className: "model-photo" + (ok ? " ok" : "") + (running ? " running" : "")
  }, /*#__PURE__*/React.createElement("img", {
    src: ph.u,
    alt: bike.brand + " " + bike.name,
    referrerPolicy: "no-referrer",
    onLoad: () => setOk(true),
    onError: () => {
      photoCache(bikeKey(bike), {});
      setMode("art");
    }
  }), /*#__PURE__*/React.createElement("figcaption", null, /*#__PURE__*/React.createElement("a", {
    href: ph.page,
    target: "_blank",
    rel: "noopener"
  }, "Фото: ", ph.by || "Wikimedia Commons", ph.lic ? " · " + ph.lic : ""))) : /*#__PURE__*/React.createElement(BikeSVG, props), ph.u && /*#__PURE__*/React.createElement("div", {
    className: "seg dark sm bv-toggle",
    role: "group",
    "aria-label": "Что показать"
  }, [["photo", "Фото"], ["art", "Рисунок"]].map(x => /*#__PURE__*/React.createElement("button", {
    key: x[0],
    className: (showPhoto ? "photo" : "art") === x[0] ? "on" : "",
    onClick: () => {
      setMode(x[0]);
      save("bikeview", x[0]);
    }
  }, x[1]))));
}
function ChassisPanel({
  area,
  eng,
  go,
  ai,
  askAi,
  addToCart,
  cart,
  onClose,
  flash
}) {
  const A = CH_AREAS[area];
  const parts = [];
  (A.kinds || []).forEach(k => {
    const p = partByKind(k, eng);
    if (p && parts.indexOf(p) < 0) parts.push(p);
  });
  const guides = guidesFor(eng).filter(g => (A.guides || []).indexOf(g.id) >= 0);
  const causes = (A.causes || []).map(id => CAUSES.find(c => c.id === id)).filter(c => c && okFor(c, eng));
  const cartIds = cart.map(c => c.id);
  function checkCause(c) {
    const top = Object.keys(c.w).sort((a, b) => c.w[b] - c.w[a]).slice(0, 2);
    save("diag-preset", top);
    go("repair", "find");
  }
  return /*#__PURE__*/React.createElement("section", {
    className: "area",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("div", {
    className: "area-head"
  }, /*#__PURE__*/React.createElement("h2", null, A.t), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "close",
    s: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "area-grid"
  }, /*#__PURE__*/React.createElement("div", null, A.tips && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "\u0421\u043E\u0432\u0435\u0442\u044B"), /*#__PURE__*/React.createElement("ul", {
    className: "tips"
  }, A.tips.map((t, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, t)))), causes.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "\u0427\u0430\u0441\u0442\u044B\u0435 \u043D\u0435\u0438\u0441\u043F\u0440\u0430\u0432\u043D\u043E\u0441\u0442\u0438"), /*#__PURE__*/React.createElement("ul", {
    className: "issues compact"
  }, causes.map(c => /*#__PURE__*/React.createElement("li", {
    key: c.id,
    className: c.sev === "high" ? "sev-high" : "sev-med"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, c.t), /*#__PURE__*/React.createElement("p", null, sub(c.fix || "", eng)), /*#__PURE__*/React.createElement("button", {
    className: "link inline",
    onClick: () => checkCause(c)
  }, "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u0430\u043C \u2192"))))))), /*#__PURE__*/React.createElement("div", null, guides.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438"), /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, guides.map(g => /*#__PURE__*/React.createElement("button", {
    key: g.id,
    className: "chip",
    onClick: () => go("repair", g.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 15
  }), " ", g.title)))), parts.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "\u0414\u0435\u0442\u0430\u043B\u0438"), /*#__PURE__*/React.createElement("ul", {
    className: "plist"
  }, parts.slice(0, 8).map(p => /*#__PURE__*/React.createElement("li", {
    key: p.id
  }, /*#__PURE__*/React.createElement("span", null, p.name, p.info && /*#__PURE__*/React.createElement("small", {
    className: "pinfo"
  }, p.info), /*#__PURE__*/React.createElement(BuyLinks, {
      q: buyQuery(p, eng)
    })), /*#__PURE__*/React.createElement("span", {
    className: "pl-r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, rub(p.price)), /*#__PURE__*/React.createElement("button", {
    className: "mini" + (cartIds.indexOf(p.id) >= 0 ? " in" : ""),
    "aria-label": "\u0412 \u043A\u043E\u0440\u0437\u0438\u043D\u0443",
    onClick: () => {
      addToCart(p);
      flash && flash("В корзине: " + p.name);
    }
  }, cartIds.indexOf(p.id) >= 0 ? /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 14
  }) : /*#__PURE__*/React.createElement(Icon, {
    n: "plus",
    s: 14
  }))))))), ai.state === "ready" && /*#__PURE__*/React.createElement("button", {
    className: "btn ai-btn",
    onClick: () => askAi("Расскажи про узел «" + A.t + "» на моём мотоцикле: что проверять, типовые поломки и как их предупредить.", true)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "ai",
    s: 18
  }), "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A\u0430 \u043F\u0440\u043E \u044D\u0442\u043E\u0442 \u0443\u0437\u0435\u043B"))));
}

/* --- сравнение двух мотоциклов --- */
function toCost(e) {
  const liters = Math.max(1, Math.ceil(Math.max.apply(null, (String(e.oilVol).match(/\d+(\.\d+)?/g) || ["1"]).map(Number))));
  let s = 0;
  [["oil", liters], ["oilfilter", 1], ["spark", 1], ["airfilter", 1]].forEach(x => {
    const p = partByKind(x[0], e);
    if (p) s += p.price * x[1];
  });
  return s;
}
function CompareView({
  eng,
  bike,
  other,
  onClose,
  onChange
}) {
  const b2 = other.b,
    v2 = b2.versions[other.vi] || b2.versions[0];
  const e2 = buildSpec(b2, v2, {});
  const kp = (k, e) => {
    const p = k.split(" ").map(x => partByKind(x, e)).find(Boolean);
    return p ? p.price : "—";
  };
  const rows = [["Мощность", eng.hp, e2.hp, "л.с.", 1], ["Макс. скорость", speedFor(eng, bike, {}, []).v, speedFor(e2, b2, {}, []).v, "км/ч", 1], ["Объём", eng.cc, e2.cc, "см³", 1], ["Момент", eng.torque, e2.torque], ["Схема", eng.cam, e2.cam], ["Охлаждение", eng.cooling, e2.cooling], ["Питание", eng.groups.indexOf("efi") >= 0 ? "инжектор" : eng.carb, e2.groups.indexOf("efi") >= 0 ? "инжектор" : e2.carb], ["Топливо", eng.fuel, e2.fuel], ["Замена масла", eng.hours ? "по моточасам" : eng.oilInt, e2.hours ? "по моточасам" : e2.oilInt, "км", 1], ["Регулировка клапанов", eng.stroke === "2T" ? "—" : eng.valveInt, e2.stroke === "2T" ? "—" : e2.valveInt, "км", 1], ["Расходники на обслуживание", toCost(eng), toCost(e2), "₽", -1], ["Слабых мест (серьёзных)", eng.issues.length + " (" + eng.issues.filter(i => i.sev === "high").length + ")", e2.issues.length + " (" + e2.issues.filter(i => i.sev === "high").length + ")"], ["Поршень", kp("piston", eng), kp("piston", e2), "₽", -1], ["Комплект сцепления", kp("clutchdiscs", eng), kp("clutchdiscs", e2), "₽", -1], ["Свеча", kp("spark spark2", eng), kp("spark spark2", e2), "₽", -1], ["Запчастей в базе", PARTS.filter(p => fits(p, eng)).length, PARTS.filter(p => fits(p, e2)).length, "", 1], ["Доработок доступно", TUNING.filter(t => tuningFor(t, eng).ok).length, TUNING.filter(t => tuningFor(t, e2).ok).length, "", 1]];
  const fmtv = (v, u) => typeof v === "number" ? u === "₽" ? rub(v) : num(v) + (u ? " " + u : "") : v;
  return /*#__PURE__*/React.createElement("section", {
    className: "panel compare"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435"), /*#__PURE__*/React.createElement("div", {
    className: "row-gap",
    style: {
      margin: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn sm",
    onClick: onChange
  }, "\u0414\u0440\u0443\u0433\u043E\u0439"), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "close",
    s: 18
  })))), /*#__PURE__*/React.createElement("div", {
    className: "table-wrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "cmp"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null), /*#__PURE__*/React.createElement("th", null, /*#__PURE__*/React.createElement("b", null, bike.brand, " ", bike.name), /*#__PURE__*/React.createElement("small", null, eng.code)), /*#__PURE__*/React.createElement("th", null, /*#__PURE__*/React.createElement("b", null, b2.brand, " ", b2.name), /*#__PURE__*/React.createElement("small", null, e2.code)))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => {
    const n1 = typeof r[1] === "number",
      n2 = typeof r[2] === "number",
      dir = r[4];
    const w1 = n1 && n2 && dir ? dir > 0 ? r[1] > r[2] : r[1] < r[2] : false,
      w2 = n1 && n2 && dir ? dir > 0 ? r[2] > r[1] : r[2] < r[1] : false;
    const mx = n1 && n2 ? Math.max(r[1], r[2]) || 1 : 0;
    return /*#__PURE__*/React.createElement("tr", {
      key: r[0]
    }, /*#__PURE__*/React.createElement("th", null, r[0]), /*#__PURE__*/React.createElement("td", {
      className: w1 ? "win" : ""
    }, fmtv(r[1], r[3]), n1 && n2 && /*#__PURE__*/React.createElement("span", {
      className: "cbar"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: r[1] / mx * 100 + "%"
      }
    }))), /*#__PURE__*/React.createElement("td", {
      className: w2 ? "win" : ""
    }, fmtv(r[2], r[3]), n1 && n2 && /*#__PURE__*/React.createElement("span", {
      className: "cbar"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: r[2] / mx * 100 + "%"
      }
    }))));
  })))), null);
}
/* ===== Навигация v4: 5 понятных разделов ===== */
ICONS.ai = "M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4zM18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9zM5.5 15l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6L3.2 17.3l1.6-.7z";
ICONS.wrench = "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z";
ICONS.send = "M4 12l16-8-6 16-2.5-6.5z";
ICONS.stop = "M7 7h10v10H7z";
ICONS.photo = "M4 7h3l2-2h6l2 2h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z";
ICONS.plus = "M12 5v14M5 12h14";
ICONS.book = "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7";
ICONS.play = "M7 5l12 7-12 7z";
ICONS.eye = "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z";
ICONS.sound = "M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11";
ICONS.mute = "M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6";
ICONS.list = "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01";
ICONS.bike = "M5.5 17.5a3.5 3.5 0 1 0 0-.01M18.5 17.5a3.5 3.5 0 1 0 0-.01M5.5 17.5L9 10h6l3.5 7.5M9 10L7.5 6H5M15 10l1-3h3";
ICONS.theme = "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 3v18a9 9 0 0 0 0-18z";
ICONS.user = "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.5-4 4.5-6 8-6s6.5 2 8 6";
ICONS.help = "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 17.5h.01";
ICONS.cart = "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6M10 21h.01M17 21h.01";
const NAV = [{
  id: "home",
  icon: "home",
  label: "Главная",
  short: "Главная"
}, {
  id: "bike",
  icon: "bike",
  label: "Мой мотоцикл",
  short: "Мотоцикл"
}, {
  id: "ai",
  icon: "ai",
  label: "ИИ-механик",
  short: "ИИ-механик"
}, {
  id: "repair",
  icon: "wrench",
  label: "Ремонт",
  short: "Ремонт"
}, {
  id: "parts",
  icon: "cart",
  label: "Запчасти",
  short: "Запчасти"
}];
const BIKE_TABS = [["overview", "Обзор", "Обзор"], ["edit", "Настроить", "Настроить"], ["service", "Обслуживание", "Сервис"], ["tuning", "Тюнинг", "Тюнинг"]];
const REPAIR_TABS = [["find", "Что сломалось?", "Поломки"], ["guides", "Инструкции", "Инструкции"], ["ref", "Справочник", "Справочник"]];
function diagFor(eng) {
  return DIAG.filter(d => !d.only || d.only.some(g => eng.groups.indexOf(g) >= 0));
}
function guidesFor(eng) {
  return GUIDES.filter(g => !g.only || g.only.some(x => x === eng.id || eng.groups.indexOf(x) >= 0));
}
function okFor(item, eng) {
  if (item.only && !item.only.some(x => x === eng.id || eng.groups.indexOf(x) >= 0)) return false;
  if (item.skip && item.skip.some(x => x === eng.id || eng.groups.indexOf(x) >= 0)) return false;
  return true;
}

/* ===== Приложение ===== */
function App() {
  const firstVisit = useRef(!localStorage.getItem("mh2-sel"));
  if (!firstVisit.current && !load("picked", false)) {
    try {
      localStorage.setItem("mh2-picked", "true");
    } catch (e) {}
  }
  const [onb, setOnb] = useState(() => firstVisit.current && !load("onboarded", false) ? 0 : null);
  useEffect(() => {
    const h = e => {
      const b = e.target.closest && e.target.closest(".tabs button, .view-toggle button, .seg button, .tags .chip");
      if (b && b.scrollIntoView) setTimeout(() => b.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth"
      }), 30);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);
  const [intro, setIntro] = useState(() => {
    try {
      return !sessionStorage.getItem("mh-intro") && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {
      return false;
    }
  });
  const [page, setPage] = useState("home");
  const [bikeTab, setBikeTab] = useState("overview");
  const [repairTab, setRepairTab] = useState("find");
  const [guideOpen, setGuideOpen] = useState(null);
  /* направление выезда раздела: перешёл вправо по меню — выезжает справа, влево — слева */
  const pageDir = useRef({
    page: "home",
    dir: "r"
  });
  if (pageDir.current.page !== page) {
    const ids = NAV.map(n => n.id),
      from = ids.indexOf(pageDir.current.page),
      to = ids.indexOf(page);
    pageDir.current = {
      page: page,
      dir: to < from ? "l" : "r"
    };
  }
  const [treeOpen, setTreeOpen] = useState(null);
  const [sel, setSel] = useState(() => bikeFromHash() || load("sel", {
    key: "Motoland TT250",
    vi: 0
  }));
  useEffect(() => {
    const h = () => {
      const s = bikeFromHash();
      if (s) setSel(s);
    };
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const [picker, setPicker] = useState(false);
  /* открыть выбор мотоцикла откуда угодно: window.dispatchEvent(new CustomEvent("mh-open-picker", { detail: { engine: "NB300" } })) */
  useEffect(() => {
    const h = e => setPicker(e.detail && typeof e.detail === "object" ? e.detail : true);
    window.addEventListener("mh-open-picker", h);
    return () => window.removeEventListener("mh-open-picker", h);
  }, []);
  const theme = "dark";
  const [toast, setToast] = useState("");
  const [cart, setCart] = useState(() => load("cart", []));
  const [projects, setProjects] = useState(() => load("projects", {}));
  const [custom, setCustom] = useState(() => load("custom", {}));
  const [maint, setMaint] = useState(() => load("maint", {}));
  const [chats, setChats] = useState(() => load("chats", {}));
  const [aiDraft, setAiDraft] = useState(null);
  const [garage, setGarage] = useState(() => load("garage", []));
  useEffect(() => save("garage", garage), [garage]);
  const [ai, setAi] = useState({
    state: "checking",
    fn: null,
    images: false
  });
  const timer = useRef(null);
  useEffect(() => save("sel", sel), [sel]);
  useEffect(() => save("cart", cart), [cart]);
  useEffect(() => save("projects", projects), [projects]);
  useEffect(() => save("custom", custom), [custom]);
  useEffect(() => save("maint", maint), [maint]);
  useEffect(() => save("chats", chats), [chats]);
  useEffect(() => {
    save("theme", theme);
    document.documentElement.setAttribute("data-theme", "dark");
  }, [theme]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fn = window.claude && window.claude.use ? await window.claude.use("sample") : null;
        if (!alive) return;
        if (!fn) {
          const ep = await findAiEndpoint();
          if (!alive) return;
          if (ep) {
            setAi({
              state: "ready",
              fn: makeWorkerAI(ep),
              images: false,
              provider: "worker",
              endpoint: ep
            });
            probeWorker(ep).then(c => alive && c.images && setAi(a => a.endpoint === ep ? Object.assign({}, a, {
              images: true,
              imageTypes: ["image/jpeg"]
            }) : a));
          } else setAi({
            state: "off",
            fn: null,
            images: false
          });
          return;
        }
        let lim = null;
        try {
          lim = await fn.limits();
        } catch (e) {}
        if (alive) setAi({
          state: "ready",
          fn: fn,
          images: !!(lim && lim.images),
          imageTypes: lim && lim.images ? lim.images.mediaTypes : [],
          provider: "claude"
        });
      } catch (e) {
        if (alive) setAi({
          state: "off",
          fn: null,
          images: false
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const bike = BIKES.find(b => bikeKey(b) === sel.key) || BIKES[0];
  const ver = bike.versions[sel.vi] || bike.versions[0];
  const vkey = bikeKey(bike) + "|" + sel.vi;
  const cu = custom[vkey] || {};
  const eng = buildSpec(bike, ver, cu);
  const projKey = bikeKey(bike) + "|" + eng.id;
  const project = (projects[projKey] || []).filter(id => eng.installed.indexOf(id) < 0);
  const mt = maint[vkey] || {
    odo: 0,
    last: {}
  };
  const chat = chats[vkey] || [];
  function flash(m) {
    setToast(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2400);
  }
  function go(t, arg) {
    if (t === "home" || t === "ai") setPage(t);else if (t === "bike" || t === "garage") {
      setPage("bike");
      setBikeTab(arg === "to" ? "service" : arg === "issues" || !arg ? arg ? "overview" : bikeTab : arg);
    } else if (t === "tuning") {
      setPage("bike");
      setBikeTab("tuning");
    } else if (t === "diag") {
      setPage("repair");
      setRepairTab("find");
      setTreeOpen(arg || null);
      setGuideOpen(null);
    } else if (t === "repair") {
      setPage("repair");
      setTreeOpen(null);
      if (arg && GUIDES.find(g => g.id === arg)) {
        setRepairTab("guides");
        setGuideOpen(arg);
      } else if (arg === "faults" || arg === "codes" || arg === "ref") {
        setRepairTab("ref");
        setGuideOpen(null);
      } else if (arg) {
        setRepairTab(arg);
        setGuideOpen(null);
      } else setGuideOpen(null);
    } else if (t === "parts" || t === "estimate") {
      setPage("parts");
    }
    window.scrollTo({
      top: 0
    });
  }
  function setCu(patch) {
    const next = Object.assign({}, cu, patch);
    Object.keys(next).forEach(k => {
      if (next[k] === "" || next[k] == null || Array.isArray(next[k]) && !next[k].length) delete next[k];
    });
    setCustom(Object.assign({}, custom, {
      [vkey]: next
    }));
  }
  function resetCu() {
    const c = Object.assign({}, custom);
    const keep = {};
    ["nick", "notes"].forEach(k => {
      if (cu[k]) keep[k] = cu[k];
    });
    c[vkey] = keep;
    setCustom(c);
    flash("Характеристики сброшены к заводским");
  }
  function setMt(patch) {
    setMaint(Object.assign({}, maint, {
      [vkey]: Object.assign({}, mt, patch)
    }));
  }
  function setChat(fnOrVal) {
    setChats(prev => {
      const cur = prev[vkey] || [];
      const next = typeof fnOrVal === "function" ? fnOrVal(cur) : fnOrVal;
      return Object.assign({}, prev, {
        [vkey]: next.slice(-40)
      });
    });
  }
  function toggleInstalled(id) {
    const cur = cu.installed || [],
      has = cur.indexOf(id) >= 0;
    setCu({
      installed: has ? cur.filter(x => x !== id) : cur.concat([id])
    });
    flash(has ? "Убрано из установленного" : "Отмечено как установленное");
  }
  function addToCart(p) {
    setCart(prev => prev.find(x => x.id === p.id) ? prev : prev.concat([{
      id: p.id,
      name: p.name,
      price: p.price
    }]));
  }
  function toggleCart(p) {
    if (cart.find(x => x.id === p.id)) {
      setCart(cart.filter(x => x.id !== p.id));
      flash("Убрано из корзины");
    } else {
      addToCart(p);
      flash("В корзине: " + p.name);
    }
  }
  function setProject(list) {
    setProjects(Object.assign({}, projects, {
      [projKey]: list
    }));
  }
  function toggleProject(t) {
    const cur = projects[projKey] || [],
      has = cur.indexOf(t.id) >= 0;
    setProject(has ? cur.filter(x => x !== t.id) : cur.concat([t.id]));
    if (!has) bumpStat("tune");
    flash(has ? "Убрано из проекта" : "Добавлено в проект");
  }
  function connectAi(url) {
    const u = String(url || "").trim();
    try {
      if (u) localStorage.setItem("mh2-aiEndpoint", JSON.stringify(u));else localStorage.removeItem("mh2-aiEndpoint");
    } catch (e) {}
    if (u) {
      setAi({
        state: "ready",
        fn: makeWorkerAI(u),
        images: false,
        provider: "worker",
        endpoint: u
      });
      probeWorker(u).then(c => c.images && setAi(a => a.endpoint === u ? Object.assign({}, a, {
        images: true,
        imageTypes: ["image/jpeg"]
      }) : a));
      flash("ИИ-сервер подключён");
    } else setAi({
      state: "off",
      fn: null,
      images: false
    });
  }
  function askAi(text, autoSend) {
    setAiDraft({
      text: text,
      auto: !!autoSend,
      n: Date.now()
    });
    go("ai");
  }
  const inGarage = garage.some(g => g.key === sel.key && g.vi === sel.vi);
  function toggleGarage() {
    if (inGarage) {
      setGarage(garage.filter(g => !(g.key === sel.key && g.vi === sel.vi)));
      flash("Убрано из гаража");
    } else {
      setGarage(garage.concat([{
        key: sel.key,
        vi: sel.vi
      }]).slice(-12));
      flash("Добавлено в гараж");
    }
  }
  const [bmenu, setBmenu] = useState(false);
  function openBikeMenu() {
    if (!garage.length && !bfRecent().length) setPicker(true);else setBmenu(!bmenu);
  }
  function switchBike(g) {
    setSel({
      key: g.key,
      vi: g.vi
    });
  }
  const ctx = {
    eng,
    bike,
    ver,
    cu,
    setCu,
    resetCu,
    go,
    flash,
    setPicker,
    toggleInstalled,
    ai,
    askAi,
    addToCart,
    cart,
    toggleCart,
    mt,
    setMt,
    garage,
    inGarage,
    toggleGarage,
    switchBike,
    sel,
    custom
  };
  const sameEngineBikes = BIKES.filter(b => b !== bike && b.brand !== "Любая модель" && b.versions.some(v => v.engine === eng.id));
  const themeLabel = theme === "dark" ? "тёмная" : theme === "light" ? "светлая" : "как в системе";
  return /*#__PURE__*/React.createElement("div", {
    className: "shell"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "rail"
  }, /*#__PURE__*/React.createElement("a", {
    className: "brand",
    href: "#",
    onClick: e => {
      e.preventDefault();
      go("home");
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "brand-mark"
  }, "MH"), /*#__PURE__*/React.createElement("span", null, "MotoHelper")), /*#__PURE__*/React.createElement("nav", {
    className: "rail-nav"
  }, NAV.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    className: "rail-item" + (page === n.id ? " on" : "") + (n.id === "ai" ? " ai" : ""),
    onClick: () => go(n.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: n.icon
  }), n.label, n.id === "ai" && ai.state === "ready" && /*#__PURE__*/React.createElement("span", {
    className: "live",
    "aria-hidden": "true"
  }), n.id === "parts" && cart.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, cart.length)))), /*#__PURE__*/React.createElement("button", {
    className: "rail-bike",
    onClick: () => go("bike", "overview")
  }, /*#__PURE__*/React.createElement("span", {
    className: "rb-code"
  }, eng.code), /*#__PURE__*/React.createElement("span", {
    className: "rb-name"
  }, cu.nick || bike.brand + " " + bike.name), eng.mods > 0 && /*#__PURE__*/React.createElement("span", {
    className: "rb-mod"
  }, eng.swapped ? "другой мотор" : eng.mods + " " + plural(eng.mods, "изменение", "изменения", "изменений"))), /*#__PURE__*/React.createElement("div", {
    className: "rail-links"
  }, /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => setOnb(0)
  }, "\u041A\u0430\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u0441\u0430\u0439\u0442\u043E\u043C"), /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => setPicker(true)
  }, "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u0440\u0443\u0433\u043E\u0439 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B"))), /*#__PURE__*/React.createElement("header", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("a", {
    className: "brand",
    href: "#",
    onClick: e => {
      e.preventDefault();
      go("home");
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "brand-mark"
  }, "MH"), /*#__PURE__*/React.createElement("span", null, "MotoHelper")), /*#__PURE__*/React.createElement("div", {
    className: "top-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "chip bike-chip",
    "aria-haspopup": "menu",
    "aria-expanded": bmenu,
    onClick: openBikeMenu
  }, /*#__PURE__*/React.createElement("span", {
    className: "bc-code"
  }, eng.code), cu.nick || bike.name), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn dark",
    "aria-label": "\u041A\u0430\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F",
    onClick: () => setOnb(0)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "help",
    s: 18
  })))), bmenu && /*#__PURE__*/React.createElement(BikeMenu, {
    garage: garage,
    sel: sel,
    custom: custom,
    inGarage: inGarage,
    toggleGarage: toggleGarage,
    onSwitch: it => {
      setSel({
        key: it.g.key,
        vi: it.g.vi
      });
      setBmenu(false);
      flash("Выбран " + (it.c.nick || it.b.name));
    },
    onOther: () => {
      setBmenu(false);
      setPicker(true);
    },
    onClose: () => setBmenu(false)
  }), /*#__PURE__*/React.createElement("main", {
    className: "main"
  }, !intro && /*#__PURE__*/React.createElement("div", {
    key: page,
    className: "page-anim pa-" + pageDir.current.dir
  }, page === "home" && /*#__PURE__*/React.createElement(Home, _extends({}, ctx, {
    project: project
  })), page === "bike" && /*#__PURE__*/React.createElement(BikePage, _extends({}, ctx, {
    tab: bikeTab,
    setTab: setBikeTab,
    sel: sel,
    setSel: setSel,
    sameEngineBikes: sameEngineBikes,
    onPickBike: b => {
      setSel({
        key: bikeKey(b),
        vi: 0
      });
      flash("Выбран " + b.name);
    },
    project: project,
    setProject: setProject,
    toggleProject: toggleProject
  })), page === "ai" && /*#__PURE__*/React.createElement(AiChat, _extends({}, ctx, {
    connectAi: connectAi,
    chat: chat,
    setChat: setChat,
    draft: aiDraft,
    clearDraft: () => setAiDraft(null)
  })), page === "repair" && /*#__PURE__*/React.createElement(RepairPage, _extends({}, ctx, {
    tab: repairTab,
    setTab: t => {
      setRepairTab(t);
      setGuideOpen(null);
      setTreeOpen(null);
    },
    guideOpen: guideOpen,
    setGuideOpen: setGuideOpen,
    treeOpen: treeOpen,
    setTreeOpen: setTreeOpen
  })), page === "parts" && /*#__PURE__*/React.createElement(PartsPage, _extends({}, ctx, {
    setCart: setCart
  })), page === "home" && /*#__PURE__*/React.createElement("footer", {
    className: "foot"
  }, /*#__PURE__*/React.createElement(BackupBar, {
    flash: flash
  })))), /*#__PURE__*/React.createElement("nav", {
    className: "tabbar"
  }, NAV.map(n => /*#__PURE__*/React.createElement("button", {
    key: n.id,
    className: "tab" + (page === n.id ? " on" : "") + (n.id === "ai" ? " tab-ai" : ""),
    onClick: () => go(n.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "tab-ico"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: n.icon,
    s: n.id === "ai" ? 24 : 22
  }), n.id === "parts" && cart.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "badge"
  }, cart.length)), /*#__PURE__*/React.createElement("span", null, n.short)))), toast && /*#__PURE__*/React.createElement("div", {
    className: "toast",
    role: "status"
  }, toast), picker && /*#__PURE__*/React.createElement(Picker, {
    sel: sel,
    custom: custom,
    start: typeof picker === "object" ? picker : null,
    onClose: () => setPicker(false),
    onPick: (b, vi) => {
      setSel({
        key: bikeKey(b),
        vi: vi
      });
      setPicker(false);
      save("picked", true);
      flash("Выбран " + b.brand + " " + b.name);
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "space-bg",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fx-orb o1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "fx-horizon"
  }), /*#__PURE__*/React.createElement("svg", {
    className: "floor-svg",
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "58.28",
    x2: "100",
    y2: "58.28"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "59.04",
    x2: "100",
    y2: "59.04"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "60.25",
    x2: "100",
    y2: "60.25"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "61.89",
    x2: "100",
    y2: "61.89"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "63.94",
    x2: "100",
    y2: "63.94"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "66.40",
    x2: "100",
    y2: "66.40"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "69.25",
    x2: "100",
    y2: "69.25"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "72.50",
    x2: "100",
    y2: "72.50"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "76.14",
    x2: "100",
    y2: "76.14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "80.16",
    x2: "100",
    y2: "80.16"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "84.56",
    x2: "100",
    y2: "84.56"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "89.34",
    x2: "100",
    y2: "89.34"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "94.48",
    x2: "100",
    y2: "94.48"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "100.00",
    x2: "100",
    y2: "100.00"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "-118.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "-104.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "-90.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "-76.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "-62.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "-48.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "-34.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "-20.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "-6.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "8.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "22.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "36.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "50.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "64.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "78.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "92.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "106.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "120.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "134.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "148.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "162.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "176.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "190.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "204.0",
    y2: "100"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "50",
    y1: "58",
    x2: "218.0",
    y2: "100"
  })), /*#__PURE__*/React.createElement("svg", {
    className: "holo-bigfoot",
    viewBox: "0 0 64 120"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M32,6 C40,6 44,12 44,20 C50,24 54,34 55,48 C57,62 55,74 52,80 L50,96 L52,116 L42,116 L40,98 L36,84 L32,82 L28,84 L24,98 L22,116 L12,116 L14,96 L12,80 C9,74 7,62 9,48 C10,34 14,24 20,20 C20,12 24,6 32,6 Z M55,48 L62,26 L58,24 L52,42 Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "28",
    cy: "18",
    r: "1.3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "36",
    cy: "18",
    r: "1.3"
  }))), intro && /*#__PURE__*/React.createElement(Intro, {
    onDone: () => {
      try {
        sessionStorage.setItem("mh-intro", "1");
      } catch (e) {}
      setIntro(false);
    }
  }), onb !== null && !picker && !intro && /*#__PURE__*/React.createElement(Onboarding, {
    step0: onb,
    sel: sel,
    custom: custom,
    onPickBike: (b, vi) => {
      setSel({
        key: bikeKey(b),
        vi: vi
      });
      save("picked", true);
      flash("Выбран " + b.brand + " " + b.name);
    },
    onDone: () => {
      save("onboarded", true);
      setOnb(null);
    }
  }));
}

/* ===== Сцена с двигателем ===== */
function EngineExplorer({
  eng,
  bike,
  ver,
  cu,
  go,
  ai,
  askAi,
  addToCart,
  cart,
  compact,
  flash
}) {
  const vkey = bikeKey(bike) + "|" + Math.max(0, bike.versions.indexOf(ver));
  const [view, setView] = useState(() => {
    const v = load("view4", "engine");
    return v;
  });
  const [gearN, setGearN] = useState(2);
  const [det, setDet] = useState(null);
  const [no3d, setNo3d] = useState(false);
  const [sel, setSel] = useState(null);
  const [running, setRunning] = useState(false);
  const [rpm, setRpm] = useState(1600);
  const [xray, setXray] = useState(false);
  const [sound, setSound] = useState(false);
  const [exPrev, setExPrev] = useState("mine");
  const [exLabel, setExLabel] = useState("");
  const gas = useRef({
    held: false,
    base: 1600,
    r: 1600,
    raf: 0,
    last: 0,
    shown: 0
  });
  const snd = useRef(null);
  /* газ: живые обороты в gas.current.r; React перерисовывает схему и 3D только при смене диапазона оборотов */
  const tacho = useRef(null);
  const [viz, setViz] = useState(null);
  const vrpm = viz != null ? viz : rpm;
  const pins = view === "photo" ? [] : view === "3d" ? enginePins(eng).map(p => ({
    id: p.id,
    t: AREAS[p.id].t
  })) : view === "bike" ? bikePins(bike, eng, cu).map(p => ({
    id: p.id,
    t: CH_AREAS[p.id].t
  })) : enginePins(eng).map(p => ({
    id: p.id,
    t: AREAS[p.id].t
  }));
  const pk = enginePeak(eng);
  function switchView(v) {
    setView(v);
    save("view4", v);
    setSel(null);
    setDet(null);
    if (v !== "engine" && v !== "3d") setXray(false);
  }
  function pick(id) {
    if (running) return;
    if (view === "bike" && id === "engine") {
      switchView("engine");
      return;
    }
    setSel(id);
  }
  const RPMS = [["Холостые", 1600], ["Средние", Math.round(pk.peak * 0.55 / 100) * 100], ["Высокие", Math.round(pk.peak * 0.95 / 100) * 100]];
  useEffect(() => {
    setSel(null);
    setDet(null);
    stopSound();
    setRunning(false);
    setXray(false);
  }, [eng.id, bike.name]);
  useEffect(() => () => stopSound(), []);
  useEffect(() => {
    if (snd.current) snd.current.setRpm(rpm);
  }, [rpm]);
  function gasLoop(t) {
    const G = gas.current,
      dt = Math.min(0.05, (t - (G.last || t)) / 1000);
    G.last = t;
    const vc = eng.cc / ((eng.layout || "single") === "single" ? 1 : 2);
    const up = (eng.stroke === "2T" ? 9500 : 6500) * Math.pow(250 / vc, 0.3),
      down = (eng.stroke === "2T" ? 6000 : 4200) * Math.pow(250 / vc, 0.2);
    const top = pk.red * 0.97;
    if (G.held) {
      G.r = Math.min(top, G.r + up * dt * (1 - 0.45 * G.r / top));
      if (G.r >= top - 30) G.r = top - Math.random() * 260;
    } else G.r = Math.max(G.base, G.r - down * dt);
    if (tacho.current) tacho.current(G.r);
    if (snd.current) snd.current.setRpm(G.r);
    const band = G.r < 2500 ? 1600 : G.r < 5500 ? 4000 : 7000;
    if (band !== G.viz) {
      G.viz = band;
      setViz(band);
    }
    if (G.held || G.r > G.base + 1) G.raf = requestAnimationFrame(gasLoop);else {
      G.raf = 0;
      G.last = 0;
      G.viz = 0;
      setViz(null);
      if (tacho.current) tacho.current(G.base);
      if (snd.current) snd.current.setRpm(G.base);
    }
  }
  function gasDown() {
    const G = gas.current;
    if (!G.held && !G.raf) {
      G.base = rpm;
      G.r = rpm;
    }
    G.held = true;
    if (snd.current) snd.current.setThrottle(true);
    if (!G.raf) G.raf = requestAnimationFrame(gasLoop);
  }
  function gasUp() {
    const G = gas.current;
    G.held = false;
    if (snd.current) snd.current.setThrottle(false);
  }
  function stopSound() {
    if (snd.current) {
      snd.current.stop();
      snd.current = null;
    }
    setSound(false);
  }
  function toggleRun() {
    if (running) {
      setRunning(false);
      stopSound();
      const G = gas.current;
      G.held = false;
      if (G.raf) cancelAnimationFrame(G.raf);
      G.raf = 0;
      setRpm(1600);
    } else {
      setRunning(true);
      setSel(null);
      setRpm(RPMS[0][1]);
      bumpStat("start");
    }
  }
  function toggleSound() {
    if (sound) {
      stopSound();
      return;
    }
    const s = engineSound(eng);
    if (s.start(rpm, exPrev)) {
      snd.current = s;
      setSound(true);
      setExLabel(s.label());
    }
  }
  const efi = eng.groups.indexOf("efi") >= 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "explorer" + (compact ? " compact" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "stage" + (running ? " is-running" : "") + (view === "photo" ? " photo-mode" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "stage-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stage-id"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stage-code"
  }, eng.code), /*#__PURE__*/React.createElement("div", {
    className: "stage-bike"
  }, cu.nick ? cu.nick + " · " : "", bike.brand, " ", bike.name), /*#__PURE__*/React.createElement("div", {
    className: "stage-chipsline"
  }, /*#__PURE__*/React.createElement("span", null, eng.hp, " \u043B.\u0441."), /*#__PURE__*/React.createElement("span", null, eng.cc, " \u0441\u043C\xB3"), /*#__PURE__*/React.createElement("span", null, eng.stroke, ", ", eng.cam.split(",")[0]), /*#__PURE__*/React.createElement("span", null, efi ? "инжектор" : eng.carb))), /*#__PURE__*/React.createElement(Tacho, {
    eng: eng,
    rpm: rpm,
    running: running,
    api: tacho
  })), /*#__PURE__*/React.createElement("div", {
    className: "view-toggle",
    role: "group",
    "aria-label": "\u0427\u0442\u043E \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C"
  }, !no3d && /*#__PURE__*/React.createElement("button", {
    className: view === "3d" ? "on" : "",
    onClick: () => switchView("3d")
  }, "3D"), /*#__PURE__*/React.createElement("button", {
    className: view === "engine" ? "on" : "",
    onClick: () => switchView("engine")
  }, "\u0421\u0445\u0435\u043C\u0430"), /*#__PURE__*/React.createElement("button", {
    className: view === "bike" ? "on" : "",
    onClick: () => switchView("bike")
  }, "\u041C\u043E\u0442\u043E\u0446\u0438\u043A\u043B"), /*#__PURE__*/React.createElement("button", {
    className: view === "photo" ? "on" : "",
    onClick: () => switchView("photo")
  }, "\u0424\u043E\u0442\u043E")), view === "3d" && !no3d ? /*#__PURE__*/React.createElement(Engine3D, {
    eng: eng,
    finish: cu.engFinish,
    running: running,
    rpm: vrpm,
    rpmLive: gas,
    cut: xray,
    gear: gearN,
    sel: sel,
    det: det,
    onPick: (id, d) => {
      if (id) {
        setSel(id);
        setDet(d || null);
      }
    },
    onFail: () => {
      setNo3d(true);
      setView("engine");
    }
  }) : view === "engine" || view === "3d" ? /*#__PURE__*/React.createElement("div", {
    className: "eng-box"
  }, /*#__PURE__*/React.createElement(EngineSVG, {
    eng: eng,
    sel: sel,
    onSel: pick,
    running: running,
    xray: xray,
    rpm: vrpm
  }), running && /*#__PURE__*/React.createElement(Smoke, {
    two: eng.stroke === "2T",
    rpm: vrpm
  })) : view === "bike" ? /*#__PURE__*/React.createElement(BikeView, {
    eng: eng,
    bike: bike,
    cu: cu,
    sel: sel,
    onSel: pick,
    running: running
  }) : /*#__PURE__*/React.createElement(PhotoStage, {
    vkey: vkey,
    running: running,
    flash: flash,
    eng: eng,
    bike: bike,
    cu: cu
  }), /*#__PURE__*/React.createElement("div", {
    className: "stage-ctrl"
  }, /*#__PURE__*/React.createElement("button", {
    className: "start-btn" + (running ? " on" : ""),
    onClick: toggleRun
  }, /*#__PURE__*/React.createElement("span", {
    className: "sb-ring"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: running ? "stop" : "play",
    s: 18
  })), running ? "Заглушить" : "Завести"), running && /*#__PURE__*/React.createElement("div", {
    className: "seg dark",
    role: "group",
    "aria-label": "\u041E\u0431\u043E\u0440\u043E\u0442\u044B"
  }, RPMS.map(r => /*#__PURE__*/React.createElement("button", {
    key: r[0],
    className: rpm === r[1] ? "on" : "",
    onClick: () => setRpm(r[1])
  }, r[0]))), (view === "engine" || view === "3d") && /*#__PURE__*/React.createElement("button", {
    className: "ctl" + (xray ? " on" : ""),
    "aria-pressed": xray,
    onClick: () => {
      if (!xray) bumpStat("xray");
      setXray(!xray);
      setSel(null);
      setDet(null);
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "eye",
    s: 18
  }), view === "3d" ? xray ? "Собрать" : "Разрез" : xray ? "Скрыть внутренности" : "Как работает внутри"), view === "3d" && (xray || running) && /*#__PURE__*/React.createElement("div", {
    className: "seg dark gears",
    role: "group",
    "aria-label": "\u041F\u0435\u0440\u0435\u0434\u0430\u0447\u0430"
  }, ["N"].concat(Array.from({
    length: /6 ст/.test(eng.gearbox) ? 6 : /4 ст/.test(eng.gearbox) ? 4 : /3 ст/.test(eng.gearbox) ? 3 : 5
  }, (_, i) => i + 1)).map((g, i) => /*#__PURE__*/React.createElement("button", {
    key: g,
    className: gearN === i ? "on" : "",
    onClick: () => setGearN(i)
  }, g))), running && /*#__PURE__*/React.createElement("button", {
    className: "ctl" + (sound ? " on" : ""),
    "aria-pressed": sound,
    onClick: toggleSound
  }, /*#__PURE__*/React.createElement(Icon, {
    n: sound ? "sound" : "mute",
    s: 18
  }), sound ? "Звук вкл." : "Звук"), running && /*#__PURE__*/React.createElement("button", {
    className: "ctl gas",
    onPointerDown: e => {
      e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
      gasDown();
    },
    onPointerUp: gasUp,
    onPointerCancel: gasUp,
    onContextMenu: e => e.preventDefault()
  }, "Газ — нажми и держи")), (view === "bike" || view === "photo") && !running && /*#__PURE__*/React.createElement("div", {
    className: "real-look"
  }, /*#__PURE__*/React.createElement("a", {
    className: "ctl",
    href: "https://yandex.ru/images/search?text=" + encodeURIComponent(bike.brand + " " + bike.name + " мотоцикл"),
    target: "_blank",
    rel: "noopener noreferrer"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "photo",
    s: 16
  }), "\u041A\u0430\u043A \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 ", bike.brand, " ", bike.name)), running && sound && /*#__PURE__*/React.createElement("div", {
    className: "ex-pick"
  }, /*#__PURE__*/React.createElement("span", null, "\u0412\u044B\u0445\u043B\u043E\u043F \u043D\u0430 \u0441\u043B\u0443\u0445:"), /*#__PURE__*/React.createElement("div", {
    className: "seg dark sm",
    role: "group",
    "aria-label": "\u0412\u044B\u0445\u043B\u043E\u043F"
  }, (eng.stroke === "2T" ? [["mine", "Мой"], ["stock", "Заводской"], ["pipe", "Труба"], ["slip", "Прямоток"]] : [["mine", "Мой"], ["stock", "Заводской"], ["slip", "Прямоток"], ["full", "Полная"]]).map(x => /*#__PURE__*/React.createElement("button", {
    key: x[0],
    className: exPrev === x[0] ? "on" : "",
    onClick: () => {
      setExPrev(x[0]);
      if (snd.current) {
        snd.current.setExhaust(x[0]);
        setExLabel(snd.current.label());
      }
    }
  }, x[1]))), /*#__PURE__*/React.createElement("small", null, "\u0421\u0435\u0439\u0447\u0430\u0441 \u0437\u0432\u0443\u0447\u0438\u0442: ", exLabel, ". ", exPrev === "mine" ? "Берётся из установленных доработок." : "Это только пример звука — на твой мотоцикл ничего не ставится.")), view === "3d" && !xray && /*#__PURE__*/React.createElement("p", {
    className: "stage-note"
  }, "\u041A\u0440\u0443\u0442\u0438 \u043C\u043E\u0442\u043E\u0440 \u043F\u0430\u043B\u044C\u0446\u0435\u043C, \u0449\u0438\u043F\u043E\u043A \u2014 \u043F\u0440\u0438\u0431\u043B\u0438\u0436\u0435\u043D\u0438\u0435, \u043A\u0430\u0441\u0430\u043D\u0438\u0435 \u0434\u0435\u0442\u0430\u043B\u0438 \u2014 \u0447\u0442\u043E \u044D\u0442\u043E \u0438 \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0442\u043E\u0438\u0442. \xAB\u0420\u0430\u0437\u0440\u0435\u0437\xBB \u043F\u043E\u043A\u0430\u0436\u0435\u0442 \u043A\u043E\u043B\u0435\u043D\u0432\u0430\u043B, \u043F\u043E\u0440\u0448\u0435\u043D\u044C, \u043A\u043B\u0430\u043F\u0430\u043D\u044B, \u0441\u0446\u0435\u043F\u043B\u0435\u043D\u0438\u0435 \u0438 \u0448\u0435\u0441\u0442\u0435\u0440\u043D\u0438 \u041A\u041F\u041F \u0432 \u0440\u0430\u0431\u043E\u0442\u0435."), view === "3d" && xray && /*#__PURE__*/React.createElement("p", {
    className: "stage-note"
  }, "\u041A\u043E\u0440\u043F\u0443\u0441 \u043F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u044B\u0439 \u2014 \u043D\u0430\u0436\u043C\u0438 \u043D\u0430 \u043F\u043E\u0440\u0448\u0435\u043D\u044C, \u043A\u043B\u0430\u043F\u0430\u043D, \u0448\u0435\u0441\u0442\u0435\u0440\u043D\u044E \u0438\u043B\u0438 \u0434\u0438\u0441\u043A \u0441\u0446\u0435\u043F\u043B\u0435\u043D\u0438\u044F, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u044C \u0438 \u0437\u0430\u043F\u0447\u0430\u0441\u0442\u0438. \u0416\u0451\u043B\u0442\u044B\u043C \u043F\u043E\u0434\u0441\u0432\u0435\u0447\u0435\u043D\u0430 \u043F\u0430\u0440\u0430 \u0448\u0435\u0441\u0442\u0435\u0440\u0451\u043D \u0432\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u043E\u0439 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0438. \u0417\u0432\u0435\u0437\u0434\u0430 \u0438 \u0446\u0435\u043F\u044C \u043A\u0440\u0443\u0442\u044F\u0442\u0441\u044F \u043F\u0440\u0438 \u0432\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u043E\u0439 \u043F\u0435\u0440\u0435\u0434\u0430\u0447\u0435. \u0410\u043D\u0438\u043C\u0430\u0446\u0438\u044F \u0437\u0430\u043C\u0435\u0434\u043B\u0435\u043D\u0430."), xray && view === "engine" && /*#__PURE__*/React.createElement("p", {
    className: "stage-note"
  }, eng.stroke === "2T" ? "Двухтактный цикл: каждый оборот коленвала — рабочий ход. Анимация замедлена." : "Четыре такта: впуск, сжатие, рабочий ход, выпуск — за два оборота коленвала. Анимация замедлена."), !running && (view === "3d" || !xray) && /*#__PURE__*/React.createElement("div", {
    className: "stage-chips",
    role: "group",
    "aria-label": "\u0423\u0437\u043B\u044B \u0434\u0432\u0438\u0433\u0430\u0442\u0435\u043B\u044F"
  }, pins.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    className: "schip" + (sel === p.id ? " on" : ""),
    onClick: () => {
      setDet(null);
      sel === p.id ? setSel(null) : pick(p.id);
    }
  }, p.t)))), det && view === "3d" && DETAILS[det] && /*#__PURE__*/React.createElement(DetailPanel, {
    det: det,
    eng: eng,
    go: go,
    ai: ai,
    askAi: askAi,
    addToCart: addToCart,
    cart: cart,
    flash: flash,
    onClose: () => {
      setDet(null);
      setSel(null);
    },
    onArea: () => setDet(null)
  }), sel && !(det && view === "3d") && (view === "engine" || view === "3d") && AREAS[sel] && /*#__PURE__*/React.createElement(AreaPanel, {
    area: sel,
    eng: eng,
    go: go,
    ai: ai,
    askAi: askAi,
    addToCart: addToCart,
    cart: cart,
    onClose: () => setSel(null)
  }), sel && view === "bike" && CH_AREAS[sel] && /*#__PURE__*/React.createElement(ChassisPanel, {
    area: sel,
    eng: eng,
    go: go,
    ai: ai,
    askAi: askAi,
    addToCart: addToCart,
    cart: cart,
    flash: flash,
    onClose: () => setSel(null)
  }), null);
}
function DetailPanel({
  det,
  eng,
  go,
  ai,
  askAi,
  addToCart,
  cart,
  flash,
  onClose,
  onArea
}) {
  const D = DETAILS[det];
  const parts = [];
  (D.kinds || []).forEach(k => {
    const p = partByKind(k, eng);
    if (p && parts.indexOf(p) < 0) parts.push(p);
  });
  const guide = D.guide && guidesFor(eng).find(g => g.id === D.guide);
  const cartIds = cart.map(c => c.id);
  const dcl = D.diff === "очень сложно" ? "сложно" : D.diff;
  return /*#__PURE__*/React.createElement("section", {
    className: "area detail",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("div", {
    className: "area-head"
  }, /*#__PURE__*/React.createElement("h2", null, D.t), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "close",
    s: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "det-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", null, D.d), /*#__PURE__*/React.createElement("p", {
    className: "why"
  }, /*#__PURE__*/React.createElement("b", null, "\u041F\u0440\u0438\u0437\u043D\u0430\u043A\u0438 \u0438\u0437\u043D\u043E\u0441\u0430:"), " ", D.wear), /*#__PURE__*/React.createElement("div", {
    className: "det-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "diff d-" + dcl
  }, "\u0417\u0430\u043C\u0435\u043D\u0430: ", D.diff), /*#__PURE__*/React.createElement("span", null, D.time)), /*#__PURE__*/React.createElement("div", {
    className: "row-gap"
  }, guide && /*#__PURE__*/React.createElement("button", {
    className: "btn sm primary",
    onClick: () => go("repair", guide.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 15
  }), "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F"), AREAS[D.area] && /*#__PURE__*/React.createElement("button", {
    className: "btn sm",
    onClick: onArea
  }, "\u0412\u0435\u0441\u044C \u0443\u0437\u0435\u043B: ", AREAS[D.area].t), ai.state === "ready" && /*#__PURE__*/React.createElement("button", {
    className: "btn sm ai-btn",
    onClick: () => askAi("Расскажи про деталь «" + D.t + "» на моём моторе: как понять, что пора менять, и как заменить.", true)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "ai",
    s: 15
  }), "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0418\u0418"))), /*#__PURE__*/React.createElement("div", null, parts.length > 0 ? /*#__PURE__*/React.createElement("ul", {
    className: "plist"
  }, parts.map(p => {
    const ii = installInfo(p.kind);
    return /*#__PURE__*/React.createElement("li", {
      key: p.id
    }, /*#__PURE__*/React.createElement("span", null, p.name, ii && /*#__PURE__*/React.createElement("small", {
      className: "pinfo"
    }, "\u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430: ", ii.diff, ", ", ii.time), /*#__PURE__*/React.createElement(BuyLinks, {
      q: buyQuery(p, eng)
    })), /*#__PURE__*/React.createElement("span", {
      className: "pl-r"
    }, /*#__PURE__*/React.createElement("span", {
      className: "price"
    }, rub(p.price)), /*#__PURE__*/React.createElement("button", {
      className: "mini" + (cartIds.indexOf(p.id) >= 0 ? " in" : ""),
      "aria-label": "\u0412 \u043A\u043E\u0440\u0437\u0438\u043D\u0443",
      onClick: () => {
        addToCart(p);
        flash && flash("В корзине: " + p.name);
      }
    }, cartIds.indexOf(p.id) >= 0 ? /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      n: "plus",
      s: 14
    }))));
  })) : /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\u041E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0445 \u0437\u0430\u043F\u0447\u0430\u0441\u0442\u0435\u0439 \u0432 \u0431\u0430\u0437\u0435 \u043D\u0435\u0442 \u2014 \u0434\u0435\u0442\u0430\u043B\u044C \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u0432 \u0441\u0431\u043E\u0440\u0435."))));
}
/* Быстрое переключение: гараж + недавние, по нажатию на мотоцикл в шапке */
function BikeMenu({
  garage,
  sel,
  custom,
  inGarage,
  toggleGarage,
  onSwitch,
  onOther,
  onClose
}) {
  const seen = {};
  const list = garage.concat(bfRecent().map(k => ({
    key: k,
    vi: 0
  }))).filter(g => {
    if (seen[g.key]) return false;
    seen[g.key] = 1;
    return true;
  }).map(g => {
    const b = BIKES.find(x => bikeKey(x) === g.key);
    if (!b) return null;
    const v = b.versions[g.vi] || b.versions[0],
      c = (custom || {})[g.key + "|" + g.vi] || {},
      e = ENGINES[c.engine || v.engine] || {};
    return {
      g: g,
      b: b,
      c: c,
      e: e,
      star: garage.some(x => x.key === g.key && x.vi === g.vi)
    };
  }).filter(Boolean).slice(0, 8);
  useEffect(() => {
    const h = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "bmenu-ov",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "bmenu",
    role: "menu",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("h4", null, "\u041C\u043E\u0438 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B\u044B"), list.map(it => {
    const on = it.g.key === sel.key && it.g.vi === sel.vi;
    return /*#__PURE__*/React.createElement("button", {
      key: it.g.key + "|" + it.g.vi,
      role: "menuitem",
      className: "bm-item" + (on ? " on" : ""),
      onClick: () => onSwitch(it)
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, it.c.nick || it.b.name), /*#__PURE__*/React.createElement("small", null, it.b.brand, " \xB7 ", it.e.code || "")), /*#__PURE__*/React.createElement("i", null, on ? "сейчас" : it.star ? "★" : ""));
  }), /*#__PURE__*/React.createElement("div", {
    className: "bm-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: toggleGarage
  }, inGarage ? "★ В гараже" : "☆ В гараж"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: onOther
  }, "+ \u0414\u0440\u0443\u0433\u043E\u0439"))));
}
function GarageBar({
  garage,
  sel,
  switchBike,
  custom,
  inGarage,
  toggleGarage,
  compact
}) {
  const items = garage.map(g => {
    const b = BIKES.find(x => bikeKey(x) === g.key);
    if (!b) return null;
    const v = b.versions[g.vi] || b.versions[0];
    const c = (custom || {})[g.key + "|" + g.vi] || {};
    const e = ENGINES[c.engine || v.engine];
    return {
      g: g,
      b: b,
      c: c,
      e: e
    };
  }).filter(Boolean);
  if (!items.length && compact) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "garage-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "gb-title"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "bike",
    s: 16
  }), "\u041C\u043E\u0439 \u0433\u0430\u0440\u0430\u0436"), items.map(it => {
    const on = it.g.key === sel.key && it.g.vi === sel.vi;
    return /*#__PURE__*/React.createElement("button", {
      key: it.g.key + it.g.vi,
      className: "gb-item" + (on ? " on" : ""),
      onClick: () => switchBike(it.g)
    }, /*#__PURE__*/React.createElement("b", null, it.c.nick || it.b.name), /*#__PURE__*/React.createElement("small", null, it.b.brand, " \xB7 ", it.e ? it.e.code : ""));
  }), /*#__PURE__*/React.createElement("button", {
    className: "gb-add" + (inGarage ? " in" : ""),
    onClick: toggleGarage
  }, inGarage ? "★ В гараже" : "☆ Добавить текущий"));
}
const SPACE_DOTS = Array.from({
  length: 34
}, (_, i) => [i * 37.7 % 100, (i * 61.3 + 7) % 100, 1 + i % 3]);
function Counter({
  to,
  label
}) {
  const ref = useRef(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(es => {
      if (es[0].isIntersecting) {
        io.disconnect();
        const t0 = performance.now();
        const step = t => {
          const k = Math.min(1, (t - t0) / 1400);
          setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
          if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return /*#__PURE__*/React.createElement("div", {
    className: "hs",
    ref: ref
  }, /*#__PURE__*/React.createElement("b", null, v.toLocaleString("ru-RU")), /*#__PURE__*/React.createElement("span", null, label));
}
function Intro({
  onDone
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2300);
    return () => clearTimeout(t);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "intro",
    onClick: onDone,
    role: "presentation"
  }, /*#__PURE__*/React.createElement("div", {
    className: "intro-lines",
    "aria-hidden": "true"
  }, [0, 1, 2, 3, 4, 5, 6, 7].map(i => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      top: 12 + i * 11 + "%",
      animationDelay: i * 0.09 + "s"
    }
  }))), /*#__PURE__*/React.createElement("svg", {
    className: "intro-tacho",
    viewBox: "0 0 220 220",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M40,160 A85,85 0 1,1 180,160",
    fill: "none",
    stroke: "rgba(255,255,255,.12)",
    strokeWidth: "6",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    className: "intro-arc",
    d: "M40,160 A85,85 0 1,1 180,160",
    fill: "none",
    stroke: "url(#introG)",
    strokeWidth: "6",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "introG",
    x1: "0",
    x2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "#E5E7EB"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: ".75",
    stopColor: "#93C5FD"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "#E5533D"
  }))), /*#__PURE__*/React.createElement("g", {
    className: "intro-needle"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "110",
    y1: "110",
    x2: "110",
    y2: "40",
    stroke: "#E5533D",
    strokeWidth: "3.5",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "110",
    cy: "110",
    r: "6",
    fill: "#E5533D"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "intro-flash",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("svg", {
    className: "intro-gear",
    viewBox: "0 0 120 120",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: sprocketPath(60, 60, 46, 18),
    fill: "none",
    stroke: "#E5E7EB",
    strokeWidth: "2.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: "20",
    fill: "none",
    stroke: "#E5E7EB",
    strokeWidth: "2.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: "6",
    fill: "#E5E7EB"
  })), /*#__PURE__*/React.createElement("div", {
    className: "intro-logo"
  }, /*#__PURE__*/React.createElement("span", {
    className: "brand-mark"
  }, "MH"), /*#__PURE__*/React.createElement("b", null, "MotoHelper")), /*#__PURE__*/React.createElement("div", {
    className: "intro-bar"
  }, /*#__PURE__*/React.createElement("span", null)), /*#__PURE__*/React.createElement("p", {
    className: "intro-tag"
  }, "\u0433\u0430\u0440\u0430\u0436 \u0432 \u043A\u0430\u0440\u043C\u0430\u043D\u0435"));
}
function PageHero({
  icon,
  kicker,
  title,
  sub,
  stats,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "phero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-glow",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "phero-ico",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: icon,
    s: 150
  })), kicker && /*#__PURE__*/React.createElement("span", {
    className: "hero-k"
  }, /*#__PURE__*/React.createElement("span", {
    className: "hero-dot"
  }), kicker), /*#__PURE__*/React.createElement("h1", null, title), sub && /*#__PURE__*/React.createElement("p", {
    className: "hero-sub"
  }, sub), stats && /*#__PURE__*/React.createElement("div", {
    className: "phero-stats"
  }, stats.map(s => /*#__PURE__*/React.createElement("div", {
    key: s[1],
    className: "hs"
  }, /*#__PURE__*/React.createElement("b", null, s[0]), /*#__PURE__*/React.createElement("span", null, s[1])))), children && /*#__PURE__*/React.createElement("div", {
    className: "phero-act"
  }, children));
}
function cartTotal(cart) {
  return (cart || []).reduce((s, c) => {
    const p = PARTS.find(x => x.id === (c.id || c)) || c;
    return s + (p.price || c.price || 0) * (c.qty || 1);
  }, 0);
}

/* ===== Главная ===== */
function Home(props) {
  const {
    eng,
    bike,
    cu,
    go,
    mt,
    project,
    cart,
    toggleCart,
    ai,
    askAi
  } = props;
  const [q, setQ] = useState("");
  const qq = q.trim().toLowerCase();
  const symAll = [].concat.apply([], SYMPTOMS.map(c => c.items));
  const results = qq.length < 2 ? [] : [].concat(BIKES.filter(b => b.brand !== "Любая модель" && (b.brand + " " + b.name).toLowerCase().indexOf(qq) >= 0).slice(0, 5).map(b => ({
    k: "b" + bikeKey(b),
    type: "Мотоцикл",
    t: b.brand + " " + b.name,
    extra: (ENGINES[b.versions[0].engine] || {}).code,
    act: () => {
      props.switchBike({
        key: bikeKey(b),
        vi: 0
      });
      setQ("");
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  })), symAll.filter(s => s[1].toLowerCase().indexOf(qq) >= 0).map(s => ({
    k: "s" + s[0],
    type: "Симптом",
    t: s[1],
    act: () => {
      save("diag-preset", [s[0]]);
      go("repair", "find");
    }
  })), guidesFor(eng).filter(g => g.title.toLowerCase().indexOf(qq) >= 0).map(g => ({
    k: "g" + g.id,
    type: "Инструкция",
    t: g.title,
    act: () => go("repair", g.id)
  })), TUNING.filter(t => tuningFor(t, eng).ok && (t.title + " " + t.cat).toLowerCase().indexOf(qq) >= 0).map(t => ({
    k: "t" + t.id,
    type: "Тюнинг",
    t: t.title,
    act: () => go("tuning")
  })), PARTS.filter(p => fits(p, eng) && p.name.toLowerCase().indexOf(qq) >= 0).map(p => ({
    k: "p" + p.id,
    type: "Запчасть",
    t: p.name,
    extra: rub(p.price),
    act: () => toggleCart(p)
  }))).slice(0, 10);
  const popular = guidesFor(eng).filter(g => ["oil", "valves", "carb-tune", "chain", "valves-dohc", "spark", "piston2t", "efi-clean", "sag"].indexOf(g.id) >= 0).slice(0, 4);
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "home-top hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-glow",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hero-k"
  }, /*#__PURE__*/React.createElement("span", {
    className: "hero-dot"
  }), eng.code, " \xB7 ", eng.hp, " \u043B.\u0441. \xB7 ", eng.cc, " \u0441\u043C\xB3"), /*#__PURE__*/React.createElement("h1", {
    className: "home-title"
  }, "\u0427\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u0435\u043C \u0441 ", /*#__PURE__*/React.createElement("span", {
    className: "grad"
  }, cu.nick ? "«" + cu.nick + "»" : bike.name), "?"), /*#__PURE__*/React.createElement("p", {
    className: "hero-sub"
  }, "Поиск поломок, ремонт, обслуживание и тюнинг — под твой мотоцикл. Объёмная модель мотора, ИИ-механик и инструкции со схемами."), /*#__PURE__*/React.createElement("div", {
    className: "hero-cta"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary shine",
    onClick: () => {
      const st = document.querySelector(".stage");
      if (st) window.scrollTo({
        top: st.getBoundingClientRect().top + window.scrollY - 70,
        behavior: "smooth"
      });
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "play",
    s: 18
  }), "\u0417\u0430\u0432\u0435\u0441\u0442\u0438 \u043C\u043E\u0442\u043E\u0440"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => go("repair", "find")
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "diag",
    s: 18
  }), "\u0427\u0442\u043E \u0441\u043B\u043E\u043C\u0430\u043B\u043E\u0441\u044C?")), /*#__PURE__*/React.createElement("div", {
    className: "qsearch"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "search"
  }), /*#__PURE__*/React.createElement("input", {
    type: "search",
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\u041F\u043E\u0438\u0441\u043A: \xAB\u043D\u0435 \u0437\u0430\u0432\u043E\u0434\u0438\u0442\u0441\u044F\xBB, \xAB\u043A\u043B\u0430\u043F\u0430\u043D\u044B\xBB, \xAB\u0441\u0432\u0435\u0447\u0430\xBB, \xABPWK\xBB",
    "aria-label": "\u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u043F\u043E\u0438\u0441\u043A"
  })), results.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "qresults"
  }, results.map(r => /*#__PURE__*/React.createElement("li", {
    key: r.k
  }, /*#__PURE__*/React.createElement("button", {
    onClick: r.act
  }, /*#__PURE__*/React.createElement("span", {
    className: "qr-type"
  }, r.type), /*#__PURE__*/React.createElement("span", {
    className: "qr-t"
  }, r.t), r.extra && /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, r.extra))))), qq.length >= 2 && results.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "qempty"
  }, /*#__PURE__*/React.createElement("span", {
    className: "muted"
  }, "\u0412 \u0431\u0430\u0437\u0435 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0448\u043B\u043E\u0441\u044C."), ai.state === "ready" && /*#__PURE__*/React.createElement("button", {
    className: "btn ai-btn sm",
    onClick: () => askAi(q, true)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "ai",
    s: 16
  }), "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A\u0430"))), /*#__PURE__*/React.createElement(GarageBar, _extends({}, props, {
    compact: true
  })), /*#__PURE__*/React.createElement(StartGuide, {
    mt: mt,
    go: go,
    setPicker: props.setPicker
  }), /*#__PURE__*/React.createElement(EngineExplorer, props), /*#__PURE__*/React.createElement("div", {
    className: "actions4"
  }, /*#__PURE__*/React.createElement("button", {
    className: "act act-main",
    onClick: () => go("repair", "find")
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "diag",
    s: 26
  }), /*#__PURE__*/React.createElement("b", null, "\u0427\u0442\u043E \u0441\u043B\u043E\u043C\u0430\u043B\u043E\u0441\u044C?")), /*#__PURE__*/React.createElement("button", {
    className: "act act-ai",
    onClick: () => go("ai")
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "ai",
    s: 26
  }), /*#__PURE__*/React.createElement("b", null, "\u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A")), /*#__PURE__*/React.createElement("button", {
    className: "act",
    onClick: () => go("tuning")
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "tune",
    s: 26
  }), /*#__PURE__*/React.createElement("b", null, "\u0422\u044E\u043D\u0438\u043D\u0433"), project.length > 0 && /*#__PURE__*/React.createElement("span", null, "В проекте " + project.length)), /*#__PURE__*/React.createElement("button", {
    className: "act",
    onClick: () => go("parts")
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "cart",
    s: 26
  }), /*#__PURE__*/React.createElement("b", null, "\u0417\u0430\u043F\u0447\u0430\u0441\u0442\u0438"), cart.length > 0 && /*#__PURE__*/React.createElement("span", null, "В корзине " + cart.length))), /*#__PURE__*/React.createElement("div", {
    className: "home-grid"
  }, /*#__PURE__*/React.createElement(TipCard, null), /*#__PURE__*/React.createElement(PreRide, {
    eng: eng
  }), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u041E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435"), /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => go("bike", "service")
  }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C")), /*#__PURE__*/React.createElement("ul", {
    className: "plan compact"
  }, maintItems(eng).slice(0, 4).map(x => /*#__PURE__*/React.createElement("li", {
    key: x.id
  }, /*#__PURE__*/React.createElement("b", null, x.t), /*#__PURE__*/React.createElement("span", {
    className: "plan-every"
  }, "\u043A\u0430\u0436\u0434\u044B\u0435 ", num(x.every), " ", eng.hours ? "моточ." : "км"))))), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u0421\u043B\u0430\u0431\u044B\u0435 \u043C\u0435\u0441\u0442\u0430 ", eng.code)), /*#__PURE__*/React.createElement("ul", {
    className: "mini-issues"
  }, eng.issues.slice(0, 4).map((x, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: "sev-" + x.sev
  }, x.t))), /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => go("bike", "overview")
  }, "\u041A\u0430\u043A \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0434\u0438\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u0427\u0430\u0441\u0442\u044B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B"), /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => go("repair", "guides")
  }, "\u0412\u0441\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438")), /*#__PURE__*/React.createElement("ul", {
    className: "guide-mini"
  }, popular.map(g => /*#__PURE__*/React.createElement("li", {
    key: g.id
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go("repair", g.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 16
  }), /*#__PURE__*/React.createElement("span", null, g.title), /*#__PURE__*/React.createElement("small", {
    className: "diff d-" + g.diff
  }, g.diff))))))));
}
function PreRide({
  eng
}) {
  const today = new Date().toLocaleDateString("ru-RU");
  const [st, setSt] = useState(() => {
    const s = load("preride", null);
    return s && s.d === today ? s : {
      d: today,
      done: {}
    };
  });
  const items = PRERIDE.filter(p => !p[2] || eng.groups.indexOf(p[2]) >= 0);
  const n = items.filter(i => st.done[i[0]]).length;
  const pct = n / items.length;
  function tog(id) {
    const next = {
      d: today,
      done: Object.assign({}, st.done, {
        [id]: !st.done[id]
      }),
      counted: st.counted
    };
    const all = items.every(i => next.done[i[0]]);
    if (all && !st.counted) {
      next.counted = true;
      bumpStat("preride");
    }
    setSt(next);
    save("preride", next);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "panel preride"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u0435\u0440\u0435\u0434 \u0432\u044B\u0435\u0437\u0434\u043E\u043C"), /*#__PURE__*/React.createElement("svg", {
    className: "ring",
    viewBox: "0 0 36 36",
    "aria-label": n + " из " + items.length
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "15",
    className: "ring-bg"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "15",
    className: "ring-fg",
    style: {
      strokeDasharray: (pct * 94.2).toFixed(1) + " 94.2"
    }
  }), /*#__PURE__*/React.createElement("text", {
    x: "18",
    y: "22",
    textAnchor: "middle"
  }, n, "/", items.length))), /*#__PURE__*/React.createElement("ul", {
    className: "checklist"
  }, items.map(i => /*#__PURE__*/React.createElement("li", {
    key: i[0]
  }, /*#__PURE__*/React.createElement("button", {
    className: st.done[i[0]] ? "on" : "",
    "aria-pressed": !!st.done[i[0]],
    onClick: () => tog(i[0])
  }, /*#__PURE__*/React.createElement("span", {
    className: "cb"
  }, st.done[i[0]] && /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 14
  })), i[1])))), n === items.length && /*#__PURE__*/React.createElement("p", {
    className: "ok-msg"
  }, "\u0412\u0441\u0451 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E \u2014 \u0445\u043E\u0440\u043E\u0448\u0435\u0439 \u043F\u043E\u0435\u0437\u0434\u043A\u0438!"));
}

/* ===== Мой мотоцикл ===== */
function BikePage(props) {
  const {
    eng,
    bike,
    cu,
    tab,
    setTab,
    sel,
    setSel,
    setPicker
  } = props;
  const [cmp, setCmp] = useState(null);
  const [cmpPick, setCmpPick] = useState(false);
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(PageHero, {
    icon: "bike",
    kicker: bike.brand + " · " + bike.type,
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "\u041C\u043E\u0439 ", /*#__PURE__*/React.createElement("span", {
      className: "grad"
    }, cu.nick || bike.name)),
    sub: "\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438, \u043E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435, \u0442\u044E\u043D\u0438\u043D\u0433 \u0438 \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 \u2014 \u0432\u0441\u0451 \u043F\u0440\u043E \u0442\u0432\u043E\u0439 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B.",
    stats: [[eng.hp + " л.с.", "мощность"], [eng.cc + " см³", "объём"], ["≈ " + speedFor(eng, bike, cu, TUNING.filter(t => eng.installed.indexOf(t.id) >= 0)).v + " км/ч", "макс. скорость"], [eng.code, "двигатель"]]
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => setPicker(true)
  }, "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u0440\u0443\u0433\u043E\u0439"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => setCmpPick(true)
  }, "\u0421\u0440\u0430\u0432\u043D\u0438\u0442\u044C"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => shareBike(bike, sel.vi, props.flash || (() => {}))
  }, "Поделиться"), bike.versions.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "seg dark",
    role: "group",
    "aria-label": "\u0417\u0430\u0432\u043E\u0434\u0441\u043A\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F"
  }, bike.versions.map((v, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: sel.vi === i ? "on" : "",
    onClick: () => setSel({
      key: sel.key,
      vi: i
    })
  }, v.label)))), /*#__PURE__*/React.createElement(GarageBar, props), eng.jp && /*#__PURE__*/React.createElement("div", {
    className: "callout info"
  }, "\u0426\u0438\u0444\u0440\u044B \u043F\u043E \u044D\u0442\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438 (\u0437\u0430\u0437\u043E\u0440\u044B, \u0441\u0432\u0435\u0447\u0438, \u043E\u0431\u044A\u0451\u043C\u044B) \u2014 \u0442\u0438\u043F\u043E\u0432\u044B\u0435 \u0438\u0437 \u0441\u0435\u0440\u0432\u0438\u0441-\u043C\u0430\u043D\u0443\u0430\u043B\u043E\u0432. \u0414\u043B\u044F \u0441\u0432\u043E\u0435\u0433\u043E \u0433\u043E\u0434\u0430 \u0432\u044B\u043F\u0443\u0441\u043A\u0430 \u0441\u0432\u0435\u0440\u044C \u0441 \u043C\u0430\u043D\u0443\u0430\u043B\u043E\u043C."), cmp && /*#__PURE__*/React.createElement(CompareView, {
    eng: eng,
    bike: bike,
    other: cmp,
    onClose: () => setCmp(null),
    onChange: () => setCmpPick(true)
  }), cmpPick && /*#__PURE__*/React.createElement(Picker, {
    sel: sel,
    custom: {},
    onClose: () => setCmpPick(false),
    onPick: (b, vi) => {
      setCmp({
        b: b,
        vi: vi
      });
      setCmpPick(false);
      window.scrollTo({
        top: 0
      });
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "tabs",
    role: "tablist"
  }, BIKE_TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t[0],
    role: "tab",
    "aria-label": t[1],
    "aria-selected": tab === t[0],
    className: tab === t[0] ? "on" : "",
    onClick: () => setTab(t[0])
  }, /*#__PURE__*/React.createElement("span", {
    className: "t-full"
  }, t[1]), /*#__PURE__*/React.createElement("span", {
    className: "t-short"
  }, t[2]), t[0] === "edit" && eng.mods > 0 && /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }, eng.mods)))), tab === "overview" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(EngineExplorer, _extends({}, props, {
    compact: true
  })), /*#__PURE__*/React.createElement(Overview, props), /*#__PURE__*/React.createElement("h2", null, "\u0421\u043B\u0430\u0431\u044B\u0435 \u043C\u0435\u0441\u0442\u0430 \u0438 \u043A\u0430\u043A \u0438\u0445 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0434\u0438\u0442\u044C"), /*#__PURE__*/React.createElement(Issues, {
    eng: eng
  })), tab === "edit" && /*#__PURE__*/React.createElement(EditBike, props), tab === "service" && /*#__PURE__*/React.createElement(Maint, props), tab === "tuning" && /*#__PURE__*/React.createElement(Tuning, props));
}

/* ===== Ремонт ===== */
function RepairPage(props) {
  const {
    eng,
    tab,
    setTab,
    guideOpen,
    setGuideOpen,
    treeOpen,
    setTreeOpen
  } = props;
  if (treeOpen) return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => setTreeOpen(null)
  }, "\u2190 \u041D\u0430\u0437\u0430\u0434 \u043A \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u0430\u043C"), /*#__PURE__*/React.createElement(TreeRunner, _extends({}, props, {
    treeId: treeOpen,
    onClose: () => setTreeOpen(null)
  })));
  if (guideOpen) return /*#__PURE__*/React.createElement(GuideView, _extends({}, props, {
    id: guideOpen,
    onBack: () => setGuideOpen(null)
  }));
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(PageHero, {
    icon: "wrench",
    kicker: props.eng.code,
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "\u0420\u0435\u043C\u043E\u043D\u0442 ", /*#__PURE__*/React.createElement("span", {
      className: "grad"
    }, "\u0441\u0432\u043E\u0438\u043C\u0438 \u0440\u0443\u043A\u0430\u043C\u0438")),
    sub: "\u041D\u0430\u0439\u0434\u0438 \u043F\u0440\u0438\u0447\u0438\u043D\u0443 \u043F\u043E\u043B\u043E\u043C\u043A\u0438 \u043F\u043E \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u0430\u043C, \u043E\u0442\u043A\u0440\u043E\u0439 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044E \u0441\u043E \u0441\u0445\u0435\u043C\u043E\u0439 \u0438\u043B\u0438 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A."
  }), /*#__PURE__*/React.createElement("div", {
    className: "tabs",
    role: "tablist"
  }, REPAIR_TABS.map(t => /*#__PURE__*/React.createElement("button", {
    key: t[0],
    role: "tab",
    "aria-label": t[1],
    "aria-selected": tab === t[0],
    className: tab === t[0] ? "on" : "",
    onClick: () => setTab(t[0])
  }, /*#__PURE__*/React.createElement("span", {
    className: "t-full"
  }, t[1]), /*#__PURE__*/React.createElement("span", {
    className: "t-short"
  }, t[2])))), tab === "find" && /*#__PURE__*/React.createElement(SmartDiag, props), tab === "guides" && /*#__PURE__*/React.createElement(GuidesList, props), tab === "ref" && /*#__PURE__*/React.createElement(RefView, props));
}

/* --- умная диагностика --- */
function scoreCauses(eng, mt, symSel, condSel) {
  const st = maintStatus(eng, mt);
  const due = id => {
    const x = st.find(s => s.id === id);
    return x && (x.state === "due" || x.state === "soon");
  };
  const inst = eng.installed || [];
  const flowMods = ["filter", "slip", "full", "cam", "pipe", "bore300", "bore-yx", "bore-cg", "swap-z190", "swap-pr300"].filter(id => inst.indexOf(id) >= 0);
  const out = [];
  CAUSES.forEach(c => {
    if (!okFor(c, eng)) return;
    let s = 0;
    const why = [];
    symSel.forEach(id => {
      if (c.w[id]) {
        s += c.w[id];
        const it = [].concat.apply([], SYMPTOMS.map(x => x.items)).find(i => i[0] === id);
        why.push(it[1]);
      }
    });
    if (s === 0) return;
    if (c.cond) condSel.forEach(id => {
      if (c.cond[id]) {
        s += c.cond[id];
        why.push((CONDITIONS.find(x => x[0] === id) || [0, ""])[1].toLowerCase());
      }
    });
    if (c.k && eng.issues.some(i => c.k.test(i.t))) {
      s += 1.5;
      why.push("известное слабое место " + eng.code);
    }
    if (c.id === "valvetight" && due("valves")) {
      s += 3;
      why.push("по пробегу пора регулировать клапаны");
    }
    if (c.id === "lowoil" && due("oil")) {
      s += 3;
      why.push("по пробегу пора менять масло");
    }
    if (c.id === "camchain" && due("camchain")) {
      s += 2;
      why.push("по пробегу пора осмотреть цепь привода клапанов (ГРМ)");
    }
    if (c.id === "airfilter" && due("air")) {
      s += 2;
      why.push("фильтр давно не обслуживали");
    }
    if (c.id === "piston2t" && due("piston")) {
      s += 3;
      why.push("по моточасам пора менять поршень");
    }
    if (c.id === "plug" && due("spark")) {
      s += 2;
      why.push("свеча старая по пробегу");
    }
    if (c.id === "lean" && flowMods.length && inst.indexOf("jets") < 0) {
      s += 3;
      why.push("стоит " + TUNING.find(t => t.id === flowMods[0]).title.toLowerCase() + " без перенастройки смеси");
    }
    if ((c.id === "lean" || c.id === "rich") && eng.jetsFromPreset) {
      s += 1;
      why.push("карбюратор меняли, жиклёры не уточнены");
    }
    if (c.id === "needcool" && flowMods.length && inst.indexOf("oilcool") < 0) {
      s += 2;
      why.push("мотор доработан, а маслорадиатора нет");
    }
    if (c.id === "advance" && (inst.indexOf("cdi") >= 0 || inst.indexOf("cdi-prog") >= 0)) {
      s += 2;
      why.push("стоит спортивный CDI");
    }
    out.push({
      c: c,
      s: s,
      why: why
    });
  });
  out.sort((a, b) => b.s - a.s);
  const top = out.slice(0, 6),
    sum = top.reduce((a, x) => a + x.s, 0);
  top.forEach(x => {
    x.pct = Math.max(4, Math.round(x.s / sum * 100));
  });
  return top;
}
function SmartDiag({
  eng,
  bike,
  cu,
  mt,
  go,
  ai,
  askAi,
  addToCart,
  cart,
  flash
}) {
  const [symSel, setSymSel] = useState(() => {
    const p = load("diag-preset", null);
    if (p) save("diag-preset", null);
    return p || [];
  });
  const [condSel, setCondSel] = useState([]);
  const [open, setOpen] = useState(0);
  const tog = (arr, set, id) => set(arr.indexOf(id) >= 0 ? arr.filter(x => x !== id) : arr.concat([id]));
  const res = symSel.length ? scoreCauses(eng, mt, symSel, condSel) : [];
  const symName = id => ([].concat.apply([], SYMPTOMS.map(x => x.items)).find(i => i[0] === id) || [0, id])[1];
  const cartIds = cart.map(c => c.id);
  return /*#__PURE__*/React.createElement("div", {
    className: "smart"
  }, /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\u041E\u0442\u043C\u0435\u0442\u044C \u0432\u0441\u0451, \u0447\u0442\u043E \u0437\u0430\u043C\u0435\u0447\u0430\u0435\u0448\u044C. \u0427\u0435\u043C \u0431\u043E\u043B\u044C\u0448\u0435 \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u043E\u0432, \u0442\u0435\u043C \u0442\u043E\u0447\u043D\u0435\u0435. \u0423\u0447\u0438\u0442\u044B\u0432\u0430\u044E \u0442\u0432\u043E\u0439 ", eng.code, ", ", eng.groups.indexOf("efi") >= 0 ? "инжектор" : eng.carb, ", \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0438 \u043F\u0440\u043E\u0431\u0435\u0433."), /*#__PURE__*/React.createElement("div", {
    className: "sym-groups"
  }, SYMPTOMS.map(g => {
    const items = g.items.filter(i => !i[2] || eng.groups.indexOf(i[2]) >= 0);
    return /*#__PURE__*/React.createElement("div", {
      key: g.cat,
      className: "sym-group"
    }, /*#__PURE__*/React.createElement("h3", null, g.cat), /*#__PURE__*/React.createElement("div", {
      className: "tags"
    }, items.map(i => /*#__PURE__*/React.createElement("button", {
      key: i[0],
      className: "symchip" + (symSel.indexOf(i[0]) >= 0 ? " on" : ""),
      "aria-pressed": symSel.indexOf(i[0]) >= 0,
      onClick: () => {
        tog(symSel, setSymSel, i[0]);
        setOpen(0);
      }
    }, symSel.indexOf(i[0]) >= 0 && /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 14
    }), i[1]))));
  })), symSel.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "cond-box"
  }, /*#__PURE__*/React.createElement("h3", null, "\u041A\u043E\u0433\u0434\u0430 \u044D\u0442\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0434\u0438\u0442?"), /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, CONDITIONS.map(c => /*#__PURE__*/React.createElement("button", {
    key: c[0],
    className: "chip" + (condSel.indexOf(c[0]) >= 0 ? " on" : ""),
    onClick: () => tog(condSel, setCondSel, c[0])
  }, c[1])))), symSel.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "results"
  }, /*#__PURE__*/React.createElement("div", {
    className: "results-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u0412\u0435\u0440\u043E\u044F\u0442\u043D\u044B\u0435 \u043F\u0440\u0438\u0447\u0438\u043D\u044B"), /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => {
      setSymSel([]);
      setCondSel([]);
    }
  }, "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C")), res.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\u0414\u043B\u044F \u0442\u0430\u043A\u043E\u0433\u043E \u043D\u0430\u0431\u043E\u0440\u0430 \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u043E\u0432 \u0432 \u0431\u0430\u0437\u0435 \u043D\u0435\u0442 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0439. \u041E\u043F\u0438\u0448\u0438 \u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A\u0443 \u0438\u043B\u0438 \u043F\u0440\u043E\u0439\u0434\u0438 \u043F\u043E\u0448\u0430\u0433\u043E\u0432\u0443\u044E \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u043D\u0438\u0436\u0435."), res.map((r, i) => {
    const c = r.c,
      isOpen = open === i;
    const parts = [];
    (c.parts || []).forEach(k => {
      const p = partByKind(k, eng);
      if (p && parts.indexOf(p) < 0) parts.push(p);
    });
    const work = c.work ? WORKS.find(w => w.name === c.work) : null;
    const cost = parts.reduce((a, p) => a + p.price, 0) + (work ? work.price : 0);
    return /*#__PURE__*/React.createElement("article", {
      key: c.id,
      className: "cause" + (isOpen ? " open" : "")
    }, /*#__PURE__*/React.createElement("button", {
      className: "cause-head",
      onClick: () => {
        if (!isOpen) bumpStat("diag");
        setOpen(isOpen ? -1 : i);
      },
      "aria-expanded": isOpen
    }, /*#__PURE__*/React.createElement("span", {
      className: "cause-rank"
    }, i + 1), /*#__PURE__*/React.createElement("span", {
      className: "cause-title"
    }, /*#__PURE__*/React.createElement("b", null, c.t), c.sev === "high" && /*#__PURE__*/React.createElement("span", {
      className: "sev-tag"
    }, "\u043D\u0435 \u043E\u0442\u043A\u043B\u0430\u0434\u044B\u0432\u0430\u0439")), /*#__PURE__*/React.createElement("span", {
      className: "cause-pct"
    }, /*#__PURE__*/React.createElement("span", {
      className: "pbar"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: r.pct + "%"
      }
    })), r.pct, "%")), isOpen && /*#__PURE__*/React.createElement("div", {
      className: "cause-body"
    }, /*#__PURE__*/React.createElement("p", {
      className: "why"
    }, /*#__PURE__*/React.createElement("b", null, "\u041F\u043E\u0447\u0435\u043C\u0443 \u0442\u0430\u043A \u0434\u0443\u043C\u0430\u044E:"), " ", r.why.join(", "), "."), c.check && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h4", null, "\u041A\u0430\u043A \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C"), /*#__PURE__*/React.createElement("ol", null, c.check.map((x, j) => /*#__PURE__*/React.createElement("li", {
      key: j
    }, sub(x, eng))))), c.fix && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h4", null, "\u0427\u0442\u043E \u0434\u0435\u043B\u0430\u0442\u044C"), /*#__PURE__*/React.createElement("p", null, sub(c.fix, eng))), parts.length > 0 && /*#__PURE__*/React.createElement("ul", {
      className: "plist"
    }, parts.map(p => /*#__PURE__*/React.createElement("li", {
      key: p.id
    }, /*#__PURE__*/React.createElement("span", null, p.name, /*#__PURE__*/React.createElement(BuyLinks, {
      q: buyQuery(p, eng)
    })), /*#__PURE__*/React.createElement("span", {
      className: "pl-r"
    }, /*#__PURE__*/React.createElement("span", {
      className: "price"
    }, rub(p.price)), /*#__PURE__*/React.createElement("button", {
      className: "mini" + (cartIds.indexOf(p.id) >= 0 ? " in" : ""),
      "aria-label": "\u0412 \u043A\u043E\u0440\u0437\u0438\u043D\u0443",
      onClick: () => {
        addToCart(p);
        flash("В корзине: " + p.name);
      }
    }, cartIds.indexOf(p.id) >= 0 ? /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 14
    }) : /*#__PURE__*/React.createElement(Icon, {
      n: "plus",
      s: 14
    })))))), cost > 0 && /*#__PURE__*/React.createElement("p", {
      className: "cost"
    }, "\u041E\u0440\u0438\u0435\u043D\u0442\u0438\u0440 \u043F\u043E \u0434\u0435\u043D\u044C\u0433\u0430\u043C: ", /*#__PURE__*/React.createElement("b", null, rub(cost)), work ? " (детали + работа в сервисе)" : " (детали)"), /*#__PURE__*/React.createElement("div", {
      className: "row-gap"
    }, c.tree && diagFor(eng).find(d => d.id === c.tree) && /*#__PURE__*/React.createElement("button", {
      className: "btn sm primary",
      onClick: () => go("diag", c.tree)
    }, "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E \u0448\u0430\u0433\u0430\u043C"), c.guide && guidesFor(eng).find(g => g.id === c.guide) && /*#__PURE__*/React.createElement("button", {
      className: "btn sm",
      onClick: () => go("repair", c.guide)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "book",
      s: 15
    }), "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F"), ai.state === "ready" && /*#__PURE__*/React.createElement("button", {
      className: "btn sm ai-btn",
      onClick: () => askAi("Симптомы: " + symSel.map(symName).join(", ") + (condSel.length ? ". Условия: " + condSel.map(id => CONDITIONS.find(x => x[0] === id)[1]).join(", ") : "") + ". Приложение считает самой вероятной причиной: «" + c.t + "». Помоги проверить и починить.", true)
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "ai",
      s: 15
    }), "\u041E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0441 \u0418\u0418"))));
  }), null), /*#__PURE__*/React.createElement("details", {
    className: "trees"
  }, /*#__PURE__*/React.createElement("summary", null, "\u041F\u043E\u0448\u0430\u0433\u043E\u0432\u044B\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u043F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0441\u0438\u043C\u043F\u0442\u043E\u043C\u0443 (", diagFor(eng).length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "symptoms"
  }, diagFor(eng).map(d => /*#__PURE__*/React.createElement("button", {
    key: d.id,
    className: "symptom",
    onClick: () => go("diag", d.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "sy-i",
    "aria-hidden": "true"
  }, d.icon), /*#__PURE__*/React.createElement("span", null, d.title))))));
}

/* --- инструкции и справочник --- */
function GuidesList({
  eng,
  setGuideOpen
}) {
  const [area, setArea] = useState("all");
  const [q, setQ] = useState("");
  const [df, setDf] = useState("all");
  const list = guidesFor(eng);
  const areas = Array.from(new Set(list.map(g => g.area || "chassis")));
  const qq = q.trim().toLowerCase();
  const shown = list.filter(g => (area === "all" || (g.area || "chassis") === area) && (df === "all" || g.diff === df) && (!qq || (g.title + " " + g.steps.join(" ") + " " + g.tools.join(" ")).toLowerCase().indexOf(qq) >= 0)).sort((x, y) => qq ? (y.title.toLowerCase().indexOf(qq) >= 0) - (x.title.toLowerCase().indexOf(qq) >= 0) : 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\u041F\u043E\u0434\u0441\u0442\u0440\u043E\u0435\u043D\u044B \u043F\u043E\u0434 ", eng.code, ": \u0437\u0430\u0437\u043E\u0440\u044B, \u0441\u0432\u0435\u0447\u0430 \u0438 \u043E\u0431\u044A\u0451\u043C\u044B \u043C\u0430\u0441\u043B\u0430 \u043F\u043E\u0434\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u044B \u0438\u0437 \xAB\u041C\u043E\u0439 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B\xBB."), /*#__PURE__*/React.createElement("div", {
    className: "qsearch grow"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "search"
  }), /*#__PURE__*/React.createElement("input", {
    type: "search",
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "\u041D\u0430\u0439\u0442\u0438: \u043A\u0430\u0440\u0431\u044E\u0440\u0430\u0442\u043E\u0440, \u043A\u043B\u0430\u043F\u0430\u043D\u044B, \u0437\u0432\u0435\u0437\u0434\u0430, \u0444\u0430\u0440\u0430\u2026",
    "aria-label": "\u041F\u043E\u0438\u0441\u043A \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0439"
  })), /*#__PURE__*/React.createElement("div", {
    className: "seg wrap guide-diff",
    role: "group",
    "aria-label": "\u0421\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u044C"
  }, [["all", "Любая сложность"], ["просто", "Просто"], ["средне", "Средне"], ["сложно", "Сложно"]].map(x => /*#__PURE__*/React.createElement("button", {
    key: x[0],
    className: df === x[0] ? "on" : "",
    onClick: () => setDf(x[0])
  }, x[1]))), /*#__PURE__*/React.createElement("div", {
    className: "tags scroll"
  }, /*#__PURE__*/React.createElement("button", {
    className: "chip" + (area === "all" ? " on" : ""),
    onClick: () => setArea("all")
  }, "\u0412\u0441\u0435 (", list.length, ")"), areas.map(a => /*#__PURE__*/React.createElement("button", {
    key: a,
    className: "chip" + (area === a ? " on" : ""),
    onClick: () => setArea(a)
  }, a === "chassis" ? "Ходовая и прочее" : AREAS[a].t))), shown.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0448\u043B\u043E\u0441\u044C. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439 \u0434\u0440\u0443\u0433\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0438\u043B\u0438 \u0441\u043F\u0440\u043E\u0441\u0438 \u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A\u0430."), /*#__PURE__*/React.createElement("div", {
    className: "guides"
  }, shown.map(g => /*#__PURE__*/React.createElement("button", {
    key: g.id,
    className: "guide",
    onClick: () => setGuideOpen(g.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "g-area"
  }, g.area ? AREAS[g.area].t : "Ходовая и прочее"), /*#__PURE__*/React.createElement("b", null, g.title), /*#__PURE__*/React.createElement("span", {
    className: "g-meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: "diff d-" + g.diff
  }, g.diff), /*#__PURE__*/React.createElement("span", null, g.time), /*#__PURE__*/React.createElement("span", null, g.steps.length, " \u0448\u0430\u0433\u043E\u0432"), g.fig && /*#__PURE__*/React.createElement("span", {
    className: "g-fig"
  }, "\u0441\u0445\u0435\u043C\u0430"))))));
}
function GuideView({
  eng,
  id,
  onBack,
  ai,
  askAi,
  addToCart,
  cart,
  flash
}) {
  const guide = GUIDES.find(g => g.id === id);
  const [done, setDone] = useState({});
  const cartIds = cart.map(c => c.id);
  const parts = [];
  guide.parts.forEach(k => {
    const p = partByKind(k, eng);
    if (p && parts.indexOf(p) < 0) parts.push(p);
  });
  const doneN = guide.steps.filter((_, i) => done[i]).length;
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: onBack
  }, "\u2190 \u0412\u0441\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438"), /*#__PURE__*/React.createElement("h1", null, guide.title), /*#__PURE__*/React.createElement("div", {
    className: "g-meta big"
  }, /*#__PURE__*/React.createElement("span", {
    className: "diff d-" + guide.diff
  }, guide.diff), /*#__PURE__*/React.createElement("span", null, guide.time), /*#__PURE__*/React.createElement("span", null, "\u043F\u043E\u0434 ", eng.code)), /*#__PURE__*/React.createElement("div", {
    className: "g-progress"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: doneN / guide.steps.length * 100 + "%"
    }
  })), guide.fig && /*#__PURE__*/React.createElement(GuideFig, {
    id: guide.fig,
    eng: eng
  }), guide.tools.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h2", null, "\u0418\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442"), /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, guide.tools.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    className: "chip static"
  }, t)))), /*#__PURE__*/React.createElement("h2", null, "\u0428\u0430\u0433\u0438 ", /*#__PURE__*/React.createElement("small", {
    className: "muted"
  }, doneN, " \u0438\u0437 ", guide.steps.length)), /*#__PURE__*/React.createElement("ol", {
    className: "g-steps"
  }, guide.steps.map((st, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: done[i] ? "done" : ""
  }, /*#__PURE__*/React.createElement("button", {
    className: "g-check",
    "aria-pressed": !!done[i],
    "aria-label": "Шаг " + (i + 1) + " выполнен",
    onClick: () => {
      const nd = Object.assign({}, done, {
        [i]: !done[i]
      });
      if (guide.steps.every((_, j) => nd[j]) && !guide.steps.every((_, j) => done[j])) bumpStat("guides");
      setDone(nd);
    }
  }, done[i] ? /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 16
  }) : i + 1), /*#__PURE__*/React.createElement("p", null, sub(st, eng))))), doneN === guide.steps.length && /*#__PURE__*/React.createElement("p", {
    className: "ok-msg"
  }, "\u0413\u043E\u0442\u043E\u0432\u043E! \u041D\u0435 \u0437\u0430\u0431\u0443\u0434\u044C \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443 \u0432 \xAB\u041E\u0431\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u043D\u0438\u0435\xBB, \u0435\u0441\u043B\u0438 \u044D\u0442\u043E \u0422\u041E."), parts.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h2", null, "\u0414\u0435\u0442\u0430\u043B\u0438 \u0438 \u0440\u0430\u0441\u0445\u043E\u0434\u043D\u0438\u043A\u0438"), /*#__PURE__*/React.createElement("ul", {
    className: "plist"
  }, parts.map(p => /*#__PURE__*/React.createElement("li", {
    key: p.id
  }, /*#__PURE__*/React.createElement("span", null, p.name, /*#__PURE__*/React.createElement(BuyLinks, {
      q: buyQuery(p, eng)
    })), /*#__PURE__*/React.createElement("span", {
    className: "pl-r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, rub(p.price)), /*#__PURE__*/React.createElement("button", {
    className: "mini" + (cartIds.indexOf(p.id) >= 0 ? " in" : ""),
    "aria-label": "\u0412 \u043A\u043E\u0440\u0437\u0438\u043D\u0443",
    onClick: () => {
      addToCart(p);
      flash("В корзине: " + p.name);
    }
  }, cartIds.indexOf(p.id) >= 0 ? /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 14
  }) : /*#__PURE__*/React.createElement(Icon, {
    n: "plus",
    s: 14
  }))))))), ai.state === "ready" && /*#__PURE__*/React.createElement("button", {
    className: "btn ai-btn",
    onClick: () => askAi("Я делаю работу «" + guide.title + "» на своём моторе. Подскажи нюансы именно для него и на чём обычно ошибаются.", true)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "ai",
    s: 18
  }), "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A\u0430 \u043F\u043E \u044D\u0442\u043E\u0439 \u0440\u0430\u0431\u043E\u0442\u0435"));
}
function RefView({
  eng,
  go,
  ai,
  askAi
}) {
  const [sec, setSec] = useState("faults");
  const [q, setQ] = useState("");
  const qq = q.trim().toLowerCase();
  const faults = FAULTS.filter(f => !qq || (f.s + " " + f.c.join(" ")).toLowerCase().indexOf(qq) >= 0);
  const codes = OBD.filter(c => !qq || c.join(" ").toLowerCase().indexOf(qq) >= 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "seg wrap",
    role: "group",
    "aria-label": "\u0420\u0430\u0437\u0434\u0435\u043B \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0430"
  }, [["faults", "Неисправности"], ["codes", "Коды ошибок"], ["tables", "Моменты и давление"]].map(s => /*#__PURE__*/React.createElement("button", {
    key: s[0],
    className: sec === s[0] ? "on" : "",
    onClick: () => {
      setSec(s[0]);
      setQ("");
    }
  }, s[1]))), sec !== "tables" && /*#__PURE__*/React.createElement("div", {
    className: "qsearch grow"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "search"
  }), /*#__PURE__*/React.createElement("input", {
    type: "search",
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: sec === "faults" ? "Симптом или причина" : "Код или датчик",
    "aria-label": "\u041F\u043E\u0438\u0441\u043A"
  })), sec === "faults" && /*#__PURE__*/React.createElement("ul", {
    className: "faults"
  }, faults.map((f, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, /*#__PURE__*/React.createElement("b", null, f.s), /*#__PURE__*/React.createElement("ol", null, f.c.map((c, j) => /*#__PURE__*/React.createElement("li", {
    key: j
  }, c))), ai.state === "ready" && /*#__PURE__*/React.createElement("button", {
    className: "btn sm ai-btn",
    onClick: () => askAi("Симптом: " + f.s + ". Помоги найти причину на моём мотоцикле.", true)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "ai",
    s: 15
  }), "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0418\u0418"))), faults.length === 0 && /*#__PURE__*/React.createElement("li", {
    className: "empty"
  }, "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0448\u043B\u043E\u0441\u044C.")), sec === "codes" && /*#__PURE__*/React.createElement(React.Fragment, null, eng.groups.indexOf("efi") < 0 && /*#__PURE__*/React.createElement("div", {
    className: "callout info"
  }, "\u0423 \u0442\u0435\u0431\u044F \u043A\u0430\u0440\u0431\u044E\u0440\u0430\u0442\u043E\u0440 \u2014 \u043A\u043E\u0434\u044B \u043E\u0448\u0438\u0431\u043E\u043A \u043D\u0435 \u043D\u0443\u0436\u043D\u044B. \u0422\u0430\u0431\u043B\u0438\u0446\u0430 \u043F\u0440\u0438\u0433\u043E\u0434\u0438\u0442\u0441\u044F \u0434\u043B\u044F \u0438\u043D\u0436\u0435\u043A\u0442\u043E\u0440\u043D\u044B\u0445 \u043C\u043E\u0442\u043E\u0440\u043E\u0432."), /*#__PURE__*/React.createElement("div", {
    className: "table-wrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "codes"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "\u041A\u043E\u0434"), /*#__PURE__*/React.createElement("th", null, "\u0427\u0442\u043E \u0437\u043D\u0430\u0447\u0438\u0442"), /*#__PURE__*/React.createElement("th", null, "\u0427\u0442\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C"))), /*#__PURE__*/React.createElement("tbody", null, codes.map(c => /*#__PURE__*/React.createElement("tr", {
    key: c[0]
  }, /*#__PURE__*/React.createElement("td", {
    className: "code"
  }, c[0]), /*#__PURE__*/React.createElement("td", null, c[1]), /*#__PURE__*/React.createElement("td", null, c[2])))))), null), sec === "tables" && /*#__PURE__*/React.createElement("div", {
    className: "refs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "adj-block"
  }, /*#__PURE__*/React.createElement("h3", null, "\u041C\u043E\u043C\u0435\u043D\u0442\u044B \u0437\u0430\u0442\u044F\u0436\u043A\u0438 (\u0442\u0438\u043F\u043E\u0432\u044B\u0435)"), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("tbody", null, REF.torque.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r[0]
  }, /*#__PURE__*/React.createElement("th", null, r[0]), /*#__PURE__*/React.createElement("td", null, r[1])))))), /*#__PURE__*/React.createElement("div", {
    className: "adj-block"
  }, /*#__PURE__*/React.createElement("h3", null, "\u0414\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0432 \u0448\u0438\u043D\u0430\u0445"), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("tbody", null, REF.tires.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r[0]
  }, /*#__PURE__*/React.createElement("th", null, r[0]), /*#__PURE__*/React.createElement("td", null, r[1])))))), /*#__PURE__*/React.createElement("div", {
    className: "adj-block"
  }, /*#__PURE__*/React.createElement("h3", null, "\u0426\u0432\u0435\u0442 \u0441\u0432\u0435\u0447\u0438"), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("tbody", null, REF.plug.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r[0]
  }, /*#__PURE__*/React.createElement("th", null, r[0]), /*#__PURE__*/React.createElement("td", null, r[1])))))), /*#__PURE__*/React.createElement("div", {
    className: "adj-block"
  }, /*#__PURE__*/React.createElement("h3", null, "\u0416\u0438\u0434\u043A\u043E\u0441\u0442\u0438"), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("tbody", null, REF.fluids.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r[0]
  }, /*#__PURE__*/React.createElement("th", null, r[0]), /*#__PURE__*/React.createElement("td", null, r[1]))))))));
}

/* ===== Тюнинг v4: конструктор, график, звёзды ===== */
function tuneStockInstalled(id, carb) {
  return id === "pwk" && /PWK3|Racing 34|PE34|FCR/i.test(carb) || id === "pe30" && /PE30/i.test(carb) || id === "pwk28" && /PWK28|PE26|PZ26/i.test(carb);
}
function tuneGain(items) {
  const p = items.reduce((s, t) => s + t.power, 0);
  return Math.round(p * (items.filter(t => t.power > 0).length > 1 ? 0.8 : 1));
}
function tuneMeters(eng, items) {
  const gain = tuneGain(items);
  let tr = 50,
    sp = 50,
    rel = 62,
    off = 45;
  items.forEach(t => {
    tr += ({
      "sp-tq": 12,
      "rear-sp": 12,
      "sp-sp": -10,
      tires: 8,
      "flywheel-w": 6,
      mousse: 3
    }[t.id] || 0) + t.power * 0.5;
    sp += ({
      "sp-sp": 12,
      "sp-tq": -10,
      "rear-sp": -10,
      damper: 3,
      bigdisc: 2
    }[t.id] || 0) + t.power * 0.8;
    rel += GOAL_W.reliable(t) * 1.6;
    off += GOAL_W.forest(t) * 1.4;
  });
  if (gain > 0 && eng.groups.indexOf("air") >= 0 && !items.find(t => t.id === "oilcool")) rel -= 6;
  const c = v => Math.max(5, Math.min(100, Math.round(v)));
  return {
    hp: Math.round(eng.stockHp * (1 + gain / 100) * 10) / 10,
    gain: gain,
    traction: c(tr),
    speed: c(sp),
    reliable: c(rel),
    offroad: c(off)
  };
}
function buildPlan(eng, goals, budget, installedIds) {
  const first = buildPlanRaw(eng, goals, budget, installedIds);
  if (first.total <= budget) return first;
  const deps = first.pick.filter(p => p.dep).reduce((s, p) => s + p.t.price, 0);
  return buildPlanRaw(eng, goals, Math.max(0, budget - deps), installedIds);
}
function buildPlanRaw(eng, goals, budget, installedIds) {
  const carb = eng.carb,
    has = g => eng.groups.indexOf(g) >= 0;
  const cand = TUNING.filter(t => tuningFor(t, eng).ok && installedIds.indexOf(t.id) < 0 && !tuneStockInstalled(t.id, carb));
  const scored = cand.map(t => {
    let s = 0;
    const why = [];
    goals.forEach(g => {
      const v = GOAL_W[g](t);
      if (v > 0) {
        s += v;
        why.push(GOALS.find(x => x.id === g).t.toLowerCase());
      }
    });
    return {
      t: t,
      s: s,
      why: why
    };
  }).filter(x => x.s > 0).sort((a, b) => b.s / Math.sqrt(b.t.price) - a.s / Math.sqrt(a.t.price));
  const pick = [],
    used = new Set();
  let total = 0;
  const excl = id => TUNE_EXCL.find(g => g.indexOf(id) >= 0);
  scored.forEach(x => {
    if (total + x.t.price > budget) return;
    const g = excl(x.t.id);
    if (g && g.some(id => used.has(id))) return;
    pick.push({
      t: x.t,
      why: x.why
    });
    used.add(x.t.id);
    total += x.t.price;
  });
  const gain = tuneGain(pick.map(p => p.t));
  const need = [];
  const want = (id, why) => {
    const t = TUNING.find(x => x.id === id);
    if (t && !used.has(id) && installedIds.indexOf(id) < 0 && tuningFor(t, eng).ok) need.push({
      t: t,
      why: [why],
      dep: true
    });
  };
  if (gain > 0 && has("air")) want("oilcool", "нужен для надёжности после прироста");
  if (gain > 0 && has("liquid") && !has("2t")) want("fan", "запас охлаждения после прироста");
  if (has("carb") && pick.some(p => ["filter", "slip", "full", "pipe", "pe30", "pwk", "pwk28", "cam", "bore300"].indexOf(p.t.id) >= 0)) want("jets", "смесь после доработок впуска и выпуска");
  if (gain >= 12 && has("big")) want("clutch", "иначе сцепление начнёт буксовать");
  need.forEach(n => {
    pick.push(n);
    used.add(n.t.id);
    total += n.t.price;
  });
  return {
    pick: pick,
    total: total
  };
}
function Dyno({
  eng,
  items
}) {
  const pk = enginePeak(eng),
    gain = tuneGain(items);
  let shift = 0;
  items.forEach(t => {
    shift += {
      full: 300,
      slip: 100,
      cam: 450,
      pipe: 500,
      pwk: 200,
      "bore300": -150,
      "flywheel-w": -100
    }[t.id] || 0;
  });
  const W = 600,
    H = 230,
    pl = 44,
    pr = 14,
    pt = 14,
    pb = 34;
  const rMax = pk.max,
    hpMax = Math.ceil(eng.stockHp * (1 + gain / 100) * 1.15 / 5) * 5;
  const curve = (peakHp, peakR) => {
    const pts = [];
    for (let r = 1500; r <= Math.min(rMax, peakR * 1.22); r += 250) {
      const x = r / peakR;
      const f = Math.pow(x, 1.5) * Math.exp(1.5 * (1 - x));
      pts.push([r, peakHp * f]);
    }
    return pts;
  };
  const X = r => pl + r / rMax * (W - pl - pr),
    Y = h => H - pb - h / hpMax * (H - pt - pb);
  const path = pts => pts.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join("");
  const stock = curve(eng.stockHp, pk.peak),
    tuned = curve(eng.stockHp * (1 + gain / 100), pk.peak + shift);
  const gridR = [];
  for (let r = 0; r <= rMax; r += 2000) gridR.push(r);
  const gridH = [];
  for (let h = 0; h <= hpMax; h += hpMax > 30 ? 10 : 5) gridH.push(h);
  return /*#__PURE__*/React.createElement("figure", {
    className: "dyno"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 " + W + " " + H,
    role: "img",
    "aria-label": "График мощности: сток " + eng.stockHp + " л.с., после доработок около " + Math.round(eng.stockHp * (1 + gain / 100) * 10) / 10 + " л.с."
  }, gridH.map(h => /*#__PURE__*/React.createElement("g", {
    key: "h" + h
  }, /*#__PURE__*/React.createElement("line", {
    x1: pl,
    x2: W - pr,
    y1: Y(h),
    y2: Y(h),
    className: "dg"
  }), /*#__PURE__*/React.createElement("text", {
    x: pl - 8,
    y: Y(h) + 4,
    textAnchor: "end",
    className: "dt"
  }, h))), gridR.map(r => /*#__PURE__*/React.createElement("g", {
    key: "r" + r
  }, /*#__PURE__*/React.createElement("line", {
    y1: pt,
    y2: H - pb,
    x1: X(r),
    x2: X(r),
    className: "dg"
  }), /*#__PURE__*/React.createElement("text", {
    x: X(r),
    y: H - pb + 18,
    textAnchor: "middle",
    className: "dt"
  }, r / 1000))), /*#__PURE__*/React.createElement("text", {
    x: W - pr,
    y: H - 4,
    textAnchor: "end",
    className: "dt"
  }, "\u0442\u044B\u0441. \u043E\u0431/\u043C\u0438\u043D"), /*#__PURE__*/React.createElement("text", {
    x: pl,
    y: pt - 2,
    className: "dt"
  }, "\u043B.\u0441."), /*#__PURE__*/React.createElement("path", {
    d: path(stock),
    className: "dl-stock"
  }), gain > 0 && /*#__PURE__*/React.createElement("path", {
    d: path(tuned),
    className: "dl-tuned"
  })), /*#__PURE__*/React.createElement("figcaption", null, /*#__PURE__*/React.createElement("span", {
    className: "lg lg-stock"
  }), "с завода ", eng.stockHp, " \u043B.\u0441.", gain > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "lg lg-tuned"
  }), "\u043F\u043E\u0441\u043B\u0435 \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043E\u043A \u2248 ", Math.round(eng.stockHp * (1 + gain / 100) * 10) / 10, " \u043B.\u0441."), null));
}
function Meter({
  label,
  v,
  was
}) {
  const d = was != null ? v - was : 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "meter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "meter-top"
  }, /*#__PURE__*/React.createElement("span", null, label), /*#__PURE__*/React.createElement("b", null, v, d !== 0 && /*#__PURE__*/React.createElement("small", {
    className: d > 0 ? "up" : "down"
  }, d > 0 ? "+" : "", d))), /*#__PURE__*/React.createElement("div", {
    className: "meter-bar"
  }, was != null && /*#__PURE__*/React.createElement("span", {
    className: "was",
    style: {
      width: was + "%"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "now",
    style: {
      width: v + "%"
    }
  })));
}
function Sprockets({
  eng,
  bike,
  cu
}) {
  const inst = TUNING.filter(t => eng.installed.indexOf(t.id) >= 0);
  const base = speedFor(eng, bike, cu, inst);
  const [f1, setF1] = useState(base.front),
    [r1, setR1] = useState(base.rear),
    [f2, setF2] = useState(base.front + 1),
    [r2, setR2] = useState(base.rear);
  useEffect(() => {
    setF1(base.front);
    setR1(base.rear);
    setF2(base.front + 1);
    setR2(base.rear);
  }, [eng.id, bike.name, cu.sprF, cu.sprR]);
  const ok = f1 > 5 && r1 > 10 && f2 > 5 && r2 > 10;
  const k1 = r1 / f1,
    k2 = r2 / f2;
  const tr = ok ? Math.round((k2 / k1 - 1) * 1000) / 10 : 0;
  const s1 = ok ? speedFor(eng, bike, cu, inst, {
      front: f1,
      rear: r1
    }) : null,
    s2 = ok ? speedFor(eng, bike, cu, inst, {
      front: f2,
      rear: r2
    }) : null;
  const links = Math.ceil((f2 - f1 + (r2 - r1)) / 2);
  /* 0 показываем пустым полем: иначе после стирания остаётся «0» и ввод даёт «012» */
  const N = (v, set, l) => /*#__PURE__*/React.createElement("label", {
    className: "f"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, l), /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    value: v || "",
    min: "8",
    max: "60",
    onChange: e => set(Number(e.target.value) || 0)
  }));
  return /*#__PURE__*/React.createElement("div", {
    className: "panel sprockets"
  }, /*#__PURE__*/React.createElement("h2", null, "\u041A\u0430\u043B\u044C\u043A\u0443\u043B\u044F\u0442\u043E\u0440 \u0437\u0432\u0451\u0437\u0434"), null, /*#__PURE__*/React.createElement("div", {
    className: "spr-grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "\u0421\u0435\u0439\u0447\u0430\u0441"), /*#__PURE__*/React.createElement("div", {
    className: "fgrid two"
  }, N(f1, setF1, "Передняя"), N(r1, setR1, "Задняя"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "\u0425\u043E\u0447\u0443 \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C"), /*#__PURE__*/React.createElement("div", {
    className: "fgrid two"
  }, N(f2, setF2, "Передняя"), N(r2, setR2, "Задняя")))), ok && /*#__PURE__*/React.createElement("div", {
    className: "spr-res"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "\u041C\u0430\u043A\u0441. \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C"), /*#__PURE__*/React.createElement("b", null, s1.v, " \u2192 ", /*#__PURE__*/React.createElement("span", {
    className: s2.v > s1.v ? "up" : s2.v < s1.v ? "down" : ""
  }, s2.v), " \u043A\u043C/\u0447")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "\u0422\u044F\u0433\u0430"), /*#__PURE__*/React.createElement("b", {
    className: tr > 0 ? "up" : tr < 0 ? "down" : ""
  }, tr > 0 ? "+" : "", tr, "%")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "Передаточное число"), /*#__PURE__*/React.createElement("b", null, k1.toFixed(2), " \u2192 ", k2.toFixed(2))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "\u0426\u0435\u043F\u044C"), /*#__PURE__*/React.createElement("b", null, links === 0 ? "та же" : (links > 0 ? "+" : "") + links + " " + plural(Math.abs(links), "звено", "звена", "звеньев")))), ok && /*#__PURE__*/React.createElement("p", {
    className: "spr-note"
  }, s2.limit === "power" && s2.vGear > s1.vGear ? "На этих звёздах мотору не хватит мощности раскрутиться до предельных оборотов — максимальная скорость почти не вырастет, а тяга упадёт." : s2.limit === "rpm" ? "Мотоцикл упирается в предельные обороты: " + num(s2.red) + " об/мин — от звёзд напрямую зависит максимальная скорость." : "Максималку ограничивает мощность, на звёздах выигрываешь в основном тягу или экономию."), null);
}
const TANK_BY_CLASS = {
  enduro: 8,
  cross: 7,
  pit: 3.5,
  kids: 2.5,
  moped: 4,
  light: 10,
  tour: 18,
  motard: 9,
  sport: 17,
  naked: 14,
  cruiser: 15,
  trial: 2.5
};
function FuelCalc({
  eng,
  bike
}) {
  const key = "fuel|" + bikeKey(bike);
  const [st, setSt] = useState(() => load(key, {
    tank: 0,
    log: []
  }));
  const [l, setL] = useState(""),
    [km, setKm] = useState(""),
    [pr, setPr] = useState(() => load("fuelPrice", ""));
  /* объём бака храним как введённый текст, чтобы можно было набрать «6,5» */
  const [tankRaw, setTankRaw] = useState(() => st.tank ? String(st.tank).replace(".", ",") : "");
  useEffect(() => {
    const s = load(key, {
      tank: 0,
      log: []
    });
    setSt(s);
    setTankRaw(s.tank ? String(s.tank).replace(".", ",") : "");
  }, [key]);
  const upd = v => {
    setSt(v);
    save(key, v);
  };
  const tank = st.tank || TANK_BY_CLASS[bikeClass(bike, eng)] || 8;
  const L = st.log.reduce((s, r) => s + r.l, 0),
    K = st.log.reduce((s, r) => s + r.km, 0);
  const vc = eng.cc / ((eng.layout || "single") === "single" ? 1 : {
    i4: 4,
    i3: 3
  }[eng.layout] || 2);
  const est = Math.round((1.4 + Math.min(4.6, vc * 0.0095) + ((eng.layout || "single") !== "single" ? 1.2 : 0)) * (eng.stroke === "2T" ? 1.4 : 1) * 10) / 10;
  const per100 = K > 20 ? Math.round(L / K * 1000) / 10 : est,
    range = Math.round(tank / per100 * 100);
  const price = parseFloat(String(pr).replace(",", ".")) || 0,
    rubKm = price ? Math.round(per100 / 100 * price * 100) / 100 : 0;
  function addFill() {
    const lv = parseFloat(String(l).replace(",", ".")),
      kv = parseFloat(String(km).replace(",", "."));
    if (!(lv > 0) || !(kv > 0)) return;
    upd({
      tank: st.tank,
      log: [{
        d: Date.now(),
        l: lv,
        km: kv
      }].concat(st.log).slice(0, 40)
    });
    setL("");
    setKm("");
    bumpStat("fuel");
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "panel fuel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u0420\u0430\u0441\u0445\u043E\u0434 \u0438 \u0437\u0430\u043F\u0430\u0441 \u0445\u043E\u0434\u0430"), st.log.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => upd({
      tank: st.tank,
      log: []
    })
  }, "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    className: "fuel-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fuel-big"
  }, /*#__PURE__*/React.createElement("b", null, String(per100).replace(".", ",")), /*#__PURE__*/React.createElement("span", null, "\u043B/100 \u043A\u043C", K > 20 ? "" : " · оценка")), /*#__PURE__*/React.createElement("div", {
    className: "fuel-big"
  }, /*#__PURE__*/React.createElement("b", null, "\u2248 ", range), /*#__PURE__*/React.createElement("span", null, "\u043A\u043C \u043D\u0430 \u0431\u0430\u043A\u0435 ", tank, " \u043B")), /*#__PURE__*/React.createElement("div", {
    className: "fuel-big"
  }, /*#__PURE__*/React.createElement("b", null, rubKm ? rubKm.toString().replace(".", ",") + " ₽" : "—"), /*#__PURE__*/React.createElement("span", null, "\u0437\u0430 1 \u043A\u043C"))), /*#__PURE__*/React.createElement("div", {
    className: "fgrid fuel-in"
  }, /*#__PURE__*/React.createElement("label", {
    className: "f"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u0417\u0430\u043B\u0438\u043B, \u043B"), /*#__PURE__*/React.createElement("input", {
    inputMode: "decimal",
    value: l,
    onChange: e => setL(e.target.value),
    placeholder: "\u043D\u0430\u043F\u0440. 6,5"
  })), /*#__PURE__*/React.createElement("label", {
    className: "f"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u041F\u0440\u043E\u0435\u0445\u0430\u043B \u0441 \u043F\u0440\u043E\u0448\u043B\u043E\u0439 \u0437\u0430\u043F\u0440\u0430\u0432\u043A\u0438, \u043A\u043C"), /*#__PURE__*/React.createElement("input", {
    inputMode: "decimal",
    value: km,
    onChange: e => setKm(e.target.value),
    placeholder: "\u043D\u0430\u043F\u0440. 180"
  })), /*#__PURE__*/React.createElement("label", {
    className: "f"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u0426\u0435\u043D\u0430 \u0431\u0435\u043D\u0437\u0438\u043D\u0430, \u20BD/\u043B"), /*#__PURE__*/React.createElement("input", {
    inputMode: "decimal",
    value: pr,
    onChange: e => {
      setPr(e.target.value);
      save("fuelPrice", e.target.value);
    },
    placeholder: "\u043D\u0430\u043F\u0440. 62"
  })), /*#__PURE__*/React.createElement("label", {
    className: "f"
  }, /*#__PURE__*/React.createElement("span", {
    className: "f-label"
  }, "\u041E\u0431\u044A\u0451\u043C \u0431\u0430\u043A\u0430, \u043B"), /*#__PURE__*/React.createElement("input", {
    inputMode: "decimal",
    value: tankRaw,
    onChange: e => {
      setTankRaw(e.target.value);
      upd({
        tank: parseFloat(String(e.target.value).replace(",", ".")) || 0,
        log: st.log
      });
    },
    placeholder: String(tank)
  }))), /*#__PURE__*/React.createElement("div", {
    className: "row-gap"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: addFill
  }, "\u0417\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0437\u0430\u043F\u0440\u0430\u0432\u043A\u0443"), null), st.log.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "fuel-log"
  }, st.log.slice(0, 5).map(r => /*#__PURE__*/React.createElement("li", {
    key: r.d
  }, /*#__PURE__*/React.createElement("span", null, new Date(r.d).toLocaleDateString("ru-RU")), /*#__PURE__*/React.createElement("span", null, r.l, " \u043B \xB7 ", r.km, " \u043A\u043C"), /*#__PURE__*/React.createElement("b", null, (Math.round(r.l / r.km * 1000) / 10).toString().replace(".", ","), " \u043B/100")))));
}
function TopSpeed({
  eng,
  bike,
  cu,
  items,
  onEdit
}) {
  const sp = speedFor(eng, bike, cu, items);
  const up = speedFor(eng, bike, cu, items.concat([TUNING.find(t => t.id === "sp-sp")].filter(Boolean)));
  return /*#__PURE__*/React.createElement("div", {
    className: "vmax"
  }, /*#__PURE__*/React.createElement("div", {
    className: "vmax-n"
  }, /*#__PURE__*/React.createElement("b", null, sp.v), /*#__PURE__*/React.createElement("span", null, "\u043A\u043C/\u0447")), /*#__PURE__*/React.createElement("div", {
    className: "vmax-t"
  }, /*#__PURE__*/React.createElement("h3", null, "\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C (\u043E\u0446\u0435\u043D\u043A\u0430)"), /*#__PURE__*/React.createElement("p", null, sp.limit === "power" ? "Упирается в мощность мотора: звезда на скорость почти ничего не добавит" + (up.v > sp.v ? " (≈ +" + (up.v - sp.v) + " км/ч)" : "") + ", прибавку даст тюнинг мотора." : "Упирается в предельные обороты " + num(sp.red) + " об/мин: передняя звезда +1 зуб даст ≈ +" + (up.v - sp.v) + " км/ч."), /*#__PURE__*/React.createElement("p", {
    className: "muted small"
  }, "\u0417\u0432\u0451\u0437\u0434\u044B ", sp.front, "/", sp.rear, ", \u0437\u0430\u0434\u043D\u0435\u0435 \u043A\u043E\u043B\u0435\u0441\u043E ", sp.rim, "\u2033, ", sp.hp, " \u043B.\u0441. \u041F\u043E\u0433\u0440\u0435\u0448\u043D\u043E\u0441\u0442\u044C \xB110\u201315%. ", !cu.sprF && "Звёзды типовые для класса — ", !cu.sprF && /*#__PURE__*/React.createElement("button", {
    className: "link inline",
    onClick: onEdit
  }, "\u0443\u043A\u0430\u0436\u0438 \u0441\u0432\u043E\u0438"))));
}
function Tuning({
  eng,
  bike,
  cu,
  project,
  setProject,
  toggleProject,
  toggleInstalled,
  go,
  flash
}) {
  const [goals, setGoals] = useState(["power"]);
  const [budget, setBudget] = useState(30000);
  const [stage, setStage] = useState(0);
  const [onlyFit, setOnlyFit] = useState(true);
  const [sort, setSort] = useState("stage");
  const [showList, setShowList] = useState(false);
  const installedItems = TUNING.filter(t => eng.installed.indexOf(t.id) >= 0);
  const chosen = TUNING.filter(t => project.indexOf(t.id) >= 0);
  const plan = buildPlan(eng, goals, budget, eng.installed);
  const planAllIn = plan.pick.length > 0 && plan.pick.every(p => project.indexOf(p.t.id) >= 0);
  const before = tuneMeters(eng, installedItems),
    after = tuneMeters(eng, installedItems.concat(chosen));
  const baseSp = speedFor(eng, bike, cu, installedItems),
    afterSp = speedFor(eng, bike, cu, installedItems.concat(chosen));
  const speedDelta = t => t.power > 0 || ["sp-tq", "sp-sp", "rear-sp"].indexOf(t.id) >= 0 ? speedFor(eng, bike, cu, installedItems.concat([t])).v - baseSp.v : 0;
  const total = chosen.reduce((s, t) => s + t.price, 0);
  const has = id => project.indexOf(id) >= 0 || eng.installed.indexOf(id) >= 0 || tuneStockInstalled(id, eng.carb);
  const isAir = eng.groups.indexOf("air") >= 0,
    isLiq = eng.groups.indexOf("liquid") >= 0,
    isCarb = eng.groups.indexOf("carb") >= 0;
  const gainAll = tuneGain(installedItems.concat(chosen));
  const warns = [];
  if (gainAll > 0 && isAir && !has("oilcool")) warns.push("Прирост без маслорадиатора — риск перегрева воздушника.");
  if (gainAll > 0 && isLiq && !has("fan") && eng.stroke !== "2T") warns.push("Добавь вентилятор: штатного охлаждения в грязи не хватает.");
  if (isCarb && chosen.some(t => ["filter", "slip", "full", "pipe", "bore300", "bore-yx", "bore-cg", "cam", "pe30", "pwk", "pwk28"].indexOf(t.id) >= 0) && !has("jets")) warns.push("После впуска, выпуска или расточки нужна перенастройка смеси — добавь подбор жиклёров (сейчас главный " + eng.jetMain + ").");
  if (gainAll >= 12 && eng.groups.indexOf("big") >= 0 && !has("clutch")) warns.push("Суммарный прирост от 12% — сцепление начнёт буксовать, нужны усиленные пружины.");
  if (eng.groups.indexOf("efi") >= 0 && chosen.some(t => ["filter", "full", "slip"].indexOf(t.id) >= 0) && !has("ecu")) warns.push("На инжекторе изменения впуска и выпуска без прошивки ЭБУ дают бедную смесь.");
  const tg = id => setGoals(goals.indexOf(id) >= 0 ? goals.filter(x => x !== id) : goals.concat([id]));
  let list = TUNING.map(t => Object.assign({
    t: t
  }, tuningFor(t, eng))).filter(r => (!onlyFit || r.ok) && (!stage || r.t.stage === stage));
  list = list.sort((a, b) => sort === "power" ? b.t.power - a.t.power : sort === "price" ? a.t.price - b.t.price : sort === "rating" ? b.t.rating - a.t.rating : a.t.stage - b.t.stage || (b.t.must ? 1 : 0) - (a.t.must ? 1 : 0));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "tune-builder panel"
  }, /*#__PURE__*/React.createElement("h2", null, "\u041F\u043E\u0434\u043E\u0431\u0440\u0430\u0442\u044C \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u043F\u043E\u0434 \u0446\u0435\u043B\u044C"), null, /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, GOALS.map(g => /*#__PURE__*/React.createElement("button", {
    key: g.id,
    className: "symchip" + (goals.indexOf(g.id) >= 0 ? " on" : ""),
    "aria-pressed": goals.indexOf(g.id) >= 0,
    onClick: () => tg(g.id)
  }, goals.indexOf(g.id) >= 0 && /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 14
  }), g.t))), /*#__PURE__*/React.createElement("label", {
    className: "budget"
  }, /*#__PURE__*/React.createElement("span", null, "\u0411\u044E\u0434\u0436\u0435\u0442: ", /*#__PURE__*/React.createElement("b", null, rub(budget))), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: "3000",
    max: "150000",
    step: "1000",
    value: budget,
    onChange: e => setBudget(Number(e.target.value))
  })), goals.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\u0412\u044B\u0431\u0435\u0440\u0438 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0443 \u0446\u0435\u043B\u044C.") : plan.pick.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\u0412 \u044D\u0442\u043E\u0442 \u0431\u044E\u0434\u0436\u0435\u0442 \u043D\u0438\u0447\u0435\u0433\u043E \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0448\u043B\u043E\u0441\u044C \u2014 \u0443\u0432\u0435\u043B\u0438\u0447\u044C \u0431\u044E\u0434\u0436\u0435\u0442.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("ul", {
    className: "plan"
  }, plan.pick.map(p => /*#__PURE__*/React.createElement("li", {
    key: p.t.id,
    className: project.indexOf(p.t.id) >= 0 ? "in" : ""
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, project.indexOf(p.t.id) >= 0 && /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 14
  }), " ", p.t.title), /*#__PURE__*/React.createElement("span", {
    className: "muted small"
  }, p.why.join(", "), p.t.power > 0 ? " · +" + p.t.power + "%" : "")), /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, rub(p.t.price))))), /*#__PURE__*/React.createElement("div", {
    className: "total"
  }, /*#__PURE__*/React.createElement("span", null, "\u041D\u0430\u0431\u043E\u0440 \u043D\u0430 ", rub(plan.total)), /*#__PURE__*/React.createElement("button", {
    className: "btn primary sm",
    disabled: planAllIn,
    onClick: () => {
      const add = plan.pick.filter(p => project.indexOf(p.t.id) < 0).length;
      setProject(Array.from(new Set(project.concat(plan.pick.map(p => p.t.id)))));
      for (let i = 0; i < add; i++) bumpStat("tune");
      flash("Набор добавлен в проект");
    }
  }, planAllIn ? "Всё уже в проекте" : "Добавить всё в проект")))), /*#__PURE__*/React.createElement("div", {
    className: "project"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u041F\u0440\u043E\u0435\u043A\u0442: ", cu.nick || bike.name), chosen.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => setProject([])
  }, "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    className: "proj-hp"
  }, /*#__PURE__*/React.createElement("span", {
    className: chosen.length ? "was" : "now-plain"
  }, before.hp), chosen.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "arrow",
    "aria-hidden": "true"
  }, "\u203A"), /*#__PURE__*/React.createElement("span", {
    className: "now"
  }, after.hp)), /*#__PURE__*/React.createElement("span", {
    className: "u"
  }, "\u043B.\u0441."), chosen.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "muted small"
  }, "\u043E\u0446\u0435\u043D\u043A\u0430, +", after.gain - before.gain, "%")), /*#__PURE__*/React.createElement("div", {
    className: "proj-speed"
  }, /*#__PURE__*/React.createElement("span", null, "\u041C\u0430\u043A\u0441. \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u2248"), /*#__PURE__*/React.createElement("b", null, baseSp.v), chosen.length > 0 && afterSp.v !== baseSp.v && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "arrow"
  }, "\u203A"), /*#__PURE__*/React.createElement("b", {
    className: afterSp.v > baseSp.v ? "up" : "down"
  }, afterSp.v)), /*#__PURE__*/React.createElement("span", null, "\u043A\u043C/\u0447"), /*#__PURE__*/React.createElement("small", {
    className: "muted"
  }, afterSp.limit === "power" ? "не хватает мощности" : "упирается в предельные обороты")), /*#__PURE__*/React.createElement("div", {
    className: "meters"
  }, /*#__PURE__*/React.createElement(Meter, {
    label: "\u0422\u044F\u0433\u0430 \u0432\u043D\u0438\u0437\u0443",
    v: after.traction,
    was: chosen.length ? before.traction : null
  }), /*#__PURE__*/React.createElement(Meter, {
    label: "\u041C\u0430\u043A\u0441. \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C",
    v: after.speed,
    was: chosen.length ? before.speed : null
  }), /*#__PURE__*/React.createElement(Meter, {
    label: "\u041D\u0430\u0434\u0451\u0436\u043D\u043E\u0441\u0442\u044C",
    v: after.reliable,
    was: chosen.length ? before.reliable : null
  }), /*#__PURE__*/React.createElement(Meter, {
    label: "\u041F\u0440\u043E\u0445\u043E\u0434\u0438\u043C\u043E\u0441\u0442\u044C",
    v: after.offroad,
    was: chosen.length ? before.offroad : null
  })), /*#__PURE__*/React.createElement(Dyno, {
    eng: eng,
    items: installedItems.concat(chosen)
  }), chosen.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\u0414\u043E\u0431\u0430\u0432\u044C \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0438\u0437 \u043F\u043E\u0434\u0431\u043E\u0440\u0430 \u0432\u044B\u0448\u0435 \u0438\u043B\u0438 \u0438\u0437 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430 \u043D\u0438\u0436\u0435.") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("ul", {
    className: "plist"
  }, chosen.map(t => /*#__PURE__*/React.createElement("li", {
    key: t.id
  }, /*#__PURE__*/React.createElement("span", null, t.title), /*#__PURE__*/React.createElement("span", {
    className: "pl-r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, rub(t.price)), /*#__PURE__*/React.createElement("button", {
    className: "mini",
    "aria-label": "\u0423\u0431\u0440\u0430\u0442\u044C",
    onClick: () => toggleProject(t)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "close",
    s: 14
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "total"
  }, /*#__PURE__*/React.createElement("span", null, "\u0418\u0442\u043E\u0433\u043E \u043F\u043E \u0434\u0435\u0442\u0430\u043B\u044F\u043C"), /*#__PURE__*/React.createElement("b", null, rub(total))), warns.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "warns"
  }, warns.map((w, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, w))))), /*#__PURE__*/React.createElement(Sprockets, {
    eng: eng,
    bike: bike,
    cu: cu
  }), /*#__PURE__*/React.createElement("div", {
    className: "list-head"
  }, /*#__PURE__*/React.createElement("h2", null, "\u0412\u0441\u0435 \u0434\u043E\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0434\u043B\u044F ", eng.code), /*#__PURE__*/React.createElement("button", {
    className: "btn sm",
    onClick: () => setShowList(!showList)
  }, showList ? "Свернуть" : "Показать " + list.length)), showList && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "seg wrap",
    role: "group",
    "aria-label": "\u042D\u0442\u0430\u043F"
  }, [[0, "Все"], [1, "Без вскрытия"], [2, "Впуск и выпуск"], [3, "Мотор"]].map(s => /*#__PURE__*/React.createElement("button", {
    key: s[0],
    className: stage === s[0] ? "on" : "",
    onClick: () => setStage(s[0])
  }, s[1]))), /*#__PURE__*/React.createElement("div", {
    className: "row-gap toolbar"
  }, /*#__PURE__*/React.createElement("label", {
    className: "check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: onlyFit,
    onChange: e => setOnlyFit(e.target.checked)
  }), " \u0422\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0435"), /*#__PURE__*/React.createElement("label", {
    className: "sel"
  }, "\u041F\u043E\u0440\u044F\u0434\u043E\u043A", /*#__PURE__*/React.createElement("select", {
    value: sort,
    onChange: e => setSort(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "stage"
  }, "\u043F\u043E \u044D\u0442\u0430\u043F\u0430\u043C"), /*#__PURE__*/React.createElement("option", {
    value: "power"
  }, "\u043F\u043E \u043F\u0440\u0438\u0440\u043E\u0441\u0442\u0443"), /*#__PURE__*/React.createElement("option", {
    value: "price"
  }, "\u043F\u043E \u0446\u0435\u043D\u0435"), /*#__PURE__*/React.createElement("option", {
    value: "rating"
  }, "\u043F\u043E \u043E\u0442\u0437\u044B\u0432\u0430\u043C")))), /*#__PURE__*/React.createElement("div", {
    className: "tlist"
  }, list.map(({
    t,
    ok,
    deny,
    note
  }) => {
    const inP = project.indexOf(t.id) >= 0,
      mine = eng.installed.indexOf(t.id) >= 0,
      stockI = !mine && tuneStockInstalled(t.id, eng.carb);
    return /*#__PURE__*/React.createElement("article", {
      key: t.id,
      className: "tcard" + (ok ? "" : " no") + (inP ? " in" : "") + (mine || stockI ? " owned" : "") + (t.must && ok && !mine ? " must" : "")
    }, /*#__PURE__*/React.createElement("div", {
      className: "tc-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "tc-top"
    }, /*#__PURE__*/React.createElement("span", null, t.cat), /*#__PURE__*/React.createElement("span", {
      className: "tc-stage"
    }, "\u044D\u0442\u0430\u043F ", t.stage), t.must && ok && !mine && /*#__PURE__*/React.createElement("span", {
      className: "tc-must"
    }, "\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E \u043F\u0440\u0438 \u0442\u044E\u043D\u0438\u043D\u0433\u0435")), /*#__PURE__*/React.createElement("h3", null, t.title), /*#__PURE__*/React.createElement("p", null, t.body), note && ok && /*#__PURE__*/React.createElement("p", {
      className: "tc-note"
    }, /*#__PURE__*/React.createElement("b", null, "\u0414\u043B\u044F ", eng.code, ":"), " ", note), !ok && /*#__PURE__*/React.createElement("p", {
      className: "tc-deny"
    }, deny), mine && /*#__PURE__*/React.createElement("p", {
      className: "tc-own"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 16
    }), "\u0423\u0436\u0435 \u0441\u0442\u043E\u0438\u0442 \u043D\u0430 \u0442\u0432\u043E\u0451\u043C \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B\u0435"), stockI && /*#__PURE__*/React.createElement("p", {
      className: "tc-own"
    }, /*#__PURE__*/React.createElement(Icon, {
      n: "check",
      s: 16
    }), "\u0423\u0436\u0435 \u0441\u0442\u043E\u0438\u0442: ", eng.carb)), /*#__PURE__*/React.createElement("div", {
      className: "tc-side"
    }, t.power > 0 && /*#__PURE__*/React.createElement("div", {
      className: "tc-gain"
    }, "+", t.power, "%", /*#__PURE__*/React.createElement("small", null, "\u2248 +", Math.round(eng.stockHp * t.power / 10) / 10, " \u043B.\u0441.")), ok && (() => {
      const dv = speedDelta(t);
      return dv ? /*#__PURE__*/React.createElement("div", {
        className: "tc-speed " + (dv > 0 ? "up" : "down")
      }, dv > 0 ? "+" : "", dv, " \u043A\u043C/\u0447") : null;
    })(), /*#__PURE__*/React.createElement("div", {
      className: "tc-meta"
    }, /*#__PURE__*/React.createElement("span", {
      className: "diff d-" + t.diff
    }, "\u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430: ", t.diff), /*#__PURE__*/React.createElement("span", null, "\u2605 ", t.rating.toFixed(1))), ok && TUNE_GUIDE[t.id] && guidesFor(eng).find(g => g.id === TUNE_GUIDE[t.id]) && /*#__PURE__*/React.createElement("button", {
      className: "link small",
      onClick: () => go("repair", TUNE_GUIDE[t.id])
    }, "\u041A\u0430\u043A \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C"), /*#__PURE__*/React.createElement("div", {
      className: "price"
    }, rub(t.price)), ok && !mine && !stockI && /*#__PURE__*/React.createElement("button", {
      className: "btn" + (inP ? "" : " primary"),
      onClick: () => toggleProject(t)
    }, inP ? "Убрать" : "В проект"), ok && !stockI && /*#__PURE__*/React.createElement("button", {
      className: "link small",
      onClick: () => toggleInstalled(t.id)
    }, mine ? "Не стоит" : "Уже стоит у меня")));
  }))));
}

/* ===== Запчасти ===== */
function PartsPage(props) {
  const {
    cart
  } = props;
  return /*#__PURE__*/React.createElement("section", {
    className: "page"
  }, /*#__PURE__*/React.createElement(PageHero, {
    icon: "cart",
    kicker: props.eng.code,
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "\u0417\u0430\u043F\u0447\u0430\u0441\u0442\u0438 ", /*#__PURE__*/React.createElement("span", {
      className: "grad"
    }, "\u043F\u043E\u0434 \u0442\u0432\u043E\u0439 \u043C\u043E\u0442\u043E\u0440")),
    sub: "\u0422\u043E\u043B\u044C\u043A\u043E \u0434\u0435\u0442\u0430\u043B\u0438, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442 \u043A \u0442\u0432\u043E\u0435\u043C\u0443 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B\u0443, \u0441 \u0430\u043D\u0430\u043B\u043E\u0433\u0430\u043C\u0438, \u0441\u043B\u043E\u0436\u043D\u043E\u0441\u0442\u044C\u044E \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438 \u0438 \u0441\u043C\u0435\u0442\u043E\u0439.",
    stats: [[cart.length + " " + plural(cart.length, "деталь", "детали", "деталей"), "в корзине"], [rub(cartTotal(cart)), "на сумму"]]
  }), /*#__PURE__*/React.createElement(Parts, props));
}

/* ===== ИИ: контекст ===== */
function aiCardBase(eng, bike, ver, cu, mt) {
  const S = eng.stock,
    efi = eng.groups.indexOf("efi") >= 0;
  const L = [];
  L.push("Мотоцикл: " + bike.brand + " " + bike.name + (cu.nick ? " («" + cu.nick + "»)" : "") + ", тип: " + bike.type + ".");
  L.push("Двигатель: " + eng.name + ", код " + eng.code + (eng.swapped ? " — СВАП, с завода стоял " + ENGINES[ver.engine].code : "") + ".");
  L.push("Схема: " + eng.stroke + ", " + eng.cam + "; охлаждение: " + eng.cooling + "; объём " + eng.cc + " см³; мощность около " + eng.hp + " л.с. (сток " + eng.stockHp + "); компрессия " + eng.compression + "; топливо " + eng.fuel + "; зажигание " + eng.ignition + "; привод ГРМ: " + eng.timing + "; запуск: " + eng.start + "; КПП: " + eng.gearbox + ".");
  if (efi) L.push("Питание: инжектор. Холостой ход " + eng.idle + ".");else L.push("Карбюратор: " + eng.carb + (eng.carb !== S.carb ? " (с завода " + S.carb + ")" : "") + "; главный жиклёр " + eng.jetMain + "; холостой " + eng.jetPilot + "; игла " + eng.needle + "; холостой ход " + eng.idle + " об/мин" + (eng.jetsFromPreset ? " (жиклёры типовые для карбюратора, точные владелец не указал)" : "") + ".");
  if (eng.stroke === "4T") L.push("Клапаны на холодную: впуск " + eng.valveIn + ", выпуск " + eng.valveEx + ", интервал " + eng.valveInt + " км.");
  L.push("Свеча " + eng.spark + ", зазор " + eng.gap + ", затяжка " + eng.sparkTorque + ". Масло " + eng.oil + ", " + eng.oilVol + (eng.coolant ? ". Антифриз " + eng.coolant : "") + ".");
  const inst = TUNING.filter(t => eng.installed.indexOf(t.id) >= 0).map(t => t.title);
  if (inst.length) L.push("Установлено владельцем: " + inst.join(", ") + ".");
  if (cu.notes) L.push("Заметки владельца: " + cu.notes);

  L.push("Известные слабые места этого мотора: " + eng.issues.map(i => i.t + " (" + i.fix + ")").join("; "));
  return L.join("\n");
}
function aiCard(eng, bike, ver, cu, mt) {
  let s = aiCardBase(eng, bike, ver, cu, mt);
  try {
    const sp = speedFor(eng, bike, cu, TUNING.filter(t => eng.installed.indexOf(t.id) >= 0));
    s += "\nМакс. скорость (оценка приложения): " + sp.v + " км/ч, звёзды " + sp.front + "/" + sp.rear + ", ограничение: " + (sp.limit === "power" ? "мощность" : "отсечка");
  } catch (e) {}
  return s;
}
function aiCatalog(eng, max) {
  const list = PARTS.filter(p => fits(p, eng));
  const own = list.filter(p => p.fit && p.fit.indexOf(eng.id) >= 0);
  const rest = list.filter(p => own.indexOf(p) < 0);
  return own.concat(rest).slice(0, max || 220).map(p => p.id + "|" + p.name + "|" + p.price).join("\n");
}
const AI_RULES = "Ты — ИИ-механик в приложении MotoHelper. Помогаешь владельцам китайских эндуро, питбайков и мопедов с диагностикой и ремонтом. Отвечай по-русски, по делу, простым гаражным языком, без воды.\n" + "Правила:\n" + "1. Опирайся на карточку мотоцикла ниже: там характеристики именно этого экземпляра с изменениями владельца. Если нужного числа нет — так и скажи и дай типовой диапазон с пометкой «сверь с мануалом».\n" + "2. Диагностику веди от простого и дешёвого к сложному. Если данных мало — задай 1–2 уточняющих вопроса и остановись.\n" + "3. Для ремонта: пронумерованные шаги, нужный инструмент, на что обратить внимание.\n" + "4. Безопасность: если неисправность угрожает безопасности (тормоза, течь бензина, заклинивание), прямо скажи не ездить. Сложные работы (расточка, коленвал, сварка рамы) — советуй сервис.\n" + "5. Если советуешь деталь из каталога ниже, ставь метку [[p:ID]] сразу после названия, например «ремкомплект карбюратора [[p:rk-pe30]]». Используй только ID из каталога, не выдумывай.\n" + "6. Форматирование: короткие абзацы, списки через «- » или «1. », важное выделяй **жирным**. Без таблиц и без заголовков крупнее «### ».\n" + "7. Ответ обычно до 250 слов, если пользователь не просит подробнее.";

/* ===== Мини-markdown ===== */
function Inline({
  text,
  onPart,
  cartIds
}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\[\[p:[\w-]+\]\]|`[^`]+`)/g;
  let last = 0,
    m,
    k = 0;
  while (m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(/*#__PURE__*/React.createElement("b", {
      key: k++
    }, tok.slice(2, -2)));else if (tok.startsWith("`")) out.push(/*#__PURE__*/React.createElement("code", {
      key: k++
    }, tok.slice(1, -1)));else {
      const p = partById(tok.slice(4, -2));
      if (p) {
        const inC = cartIds.indexOf(p.id) >= 0;
        out.push(/*#__PURE__*/React.createElement("button", {
          key: k++,
          className: "part-tag" + (inC ? " in" : ""),
          onClick: () => onPart(p),
          title: inC ? "Уже в корзине" : "Добавить в корзину"
        }, inC ? /*#__PURE__*/React.createElement(Icon, {
          n: "check",
          s: 13
        }) : /*#__PURE__*/React.createElement(Icon, {
          n: "plus",
          s: 13
        }), rub(p.price)));
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
function Md({
  text,
  onPart,
  cartIds
}) {
  const lines = text.split("\n");
  const blocks = [];
  let para = [],
    list = null;
  const flushP = () => {
    if (para.length) {
      blocks.push({
        t: "p",
        v: para.join(" ")
      });
      para = [];
    }
  };
  const flushL = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };
  lines.forEach(raw => {
    const l = raw.trim();
    if (!l) {
      flushP();
      flushL();
      return;
    }
    let m;
    if (m = l.match(/^#{1,6}\s+(.*)/)) {
      flushP();
      flushL();
      blocks.push({
        t: "h",
        v: m[1]
      });
      return;
    }
    if (m = l.match(/^(\d+)[.)]\s+(.*)/)) {
      flushP();
      if (!list || list.t !== "ol") {
        flushL();
        list = {
          t: "ol",
          v: []
        };
      }
      list.v.push(m[2]);
      return;
    }
    if (m = l.match(/^[-*•]\s+(.*)/)) {
      flushP();
      if (!list || list.t !== "ul") {
        flushL();
        list = {
          t: "ul",
          v: []
        };
      }
      list.v.push(m[1]);
      return;
    }
    flushL();
    para.push(l);
  });
  flushP();
  flushL();
  const I = t => /*#__PURE__*/React.createElement(Inline, {
    text: t,
    onPart: onPart,
    cartIds: cartIds
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "md"
  }, blocks.map((b, i) => b.t === "h" ? /*#__PURE__*/React.createElement("h4", {
    key: i
  }, I(b.v)) : b.t === "p" ? /*#__PURE__*/React.createElement("p", {
    key: i
  }, I(b.v)) : b.t === "ol" ? /*#__PURE__*/React.createElement("ol", {
    key: i
  }, b.v.map((x, j) => /*#__PURE__*/React.createElement("li", {
    key: j
  }, I(x)))) : /*#__PURE__*/React.createElement("ul", {
    key: i
  }, b.v.map((x, j) => /*#__PURE__*/React.createElement("li", {
    key: j
  }, I(x))))));
}
function AreaPanel({
  area,
  eng,
  go,
  ai,
  askAi,
  addToCart,
  cart,
  onClose
}) {
  const A = AREAS[area];
  const specs = A.spec.map(s => [s[0], eng[s[1]]]).filter(s => s[1] != null && s[1] !== "—" && s[1] !== "");
  const issues = eng.issues.filter(i => A.re.test(i.t + " " + i.fix));
  const diags = diagFor(eng).filter(d => A.diag.indexOf(d.id) >= 0);
  const guides = guidesFor(eng).filter(g => A.guides.indexOf(g.id) >= 0 || g.area === area);
  const parts = [];
  A.kinds.forEach(k => {
    const p = partByKind(k, eng);
    if (p && parts.indexOf(p) < 0) parts.push(p);
  });
  const cartIds = cart.map(c => c.id);
  return /*#__PURE__*/React.createElement("section", {
    className: "area",
    "aria-live": "polite"
  }, /*#__PURE__*/React.createElement("div", {
    className: "area-head"
  }, /*#__PURE__*/React.createElement("h2", null, A.t), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "close",
    s: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "area-grid"
  }, /*#__PURE__*/React.createElement("div", null, specs.length > 0 && /*#__PURE__*/React.createElement("table", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("tbody", null, specs.map((s, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("th", null, s[0]), /*#__PURE__*/React.createElement("td", null, s[1]))))), issues.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "\u0421\u043B\u0430\u0431\u044B\u0435 \u043C\u0435\u0441\u0442\u0430"), /*#__PURE__*/React.createElement("ul", {
    className: "issues compact"
  }, issues.map((x, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: "sev-" + x.sev
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, x.t), /*#__PURE__*/React.createElement("p", null, x.fix))))))), /*#__PURE__*/React.createElement("div", null, diags.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E \u0448\u0430\u0433\u0430\u043C"), /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, diags.map(d => /*#__PURE__*/React.createElement("button", {
    key: d.id,
    className: "chip",
    onClick: () => go("diag", d.id)
  }, d.icon, " ", d.title)))), guides.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438"), /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, guides.map(g => /*#__PURE__*/React.createElement("button", {
    key: g.id,
    className: "chip",
    onClick: () => go("repair", g.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "book",
    s: 15
  }), " ", g.title)))), parts.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h3", null, "\u0414\u0435\u0442\u0430\u043B\u0438 \u0434\u043B\u044F ", eng.code), /*#__PURE__*/React.createElement("ul", {
    className: "plist"
  }, parts.slice(0, 7).map(p => /*#__PURE__*/React.createElement("li", {
    key: p.id
  }, /*#__PURE__*/React.createElement("span", null, p.name, /*#__PURE__*/React.createElement(BuyLinks, {
      q: buyQuery(p, eng)
    })), /*#__PURE__*/React.createElement("span", {
    className: "pl-r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, rub(p.price)), /*#__PURE__*/React.createElement("button", {
    className: "mini" + (cartIds.indexOf(p.id) >= 0 ? " in" : ""),
    "aria-label": "\u0412 \u043A\u043E\u0440\u0437\u0438\u043D\u0443",
    onClick: () => addToCart(p)
  }, cartIds.indexOf(p.id) >= 0 ? /*#__PURE__*/React.createElement(Icon, {
    n: "check",
    s: 14
  }) : /*#__PURE__*/React.createElement(Icon, {
    n: "plus",
    s: 14
  }))))))), ai.state === "ready" && /*#__PURE__*/React.createElement("button", {
    className: "btn ai-btn",
    onClick: () => askAi("Расскажи про узел «" + A.t + "» на моём моторе: что проверять, какие типовые поломки и как их предупредить.", true)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "ai",
    s: 18
  }), "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A\u0430 \u043F\u0440\u043E \u044D\u0442\u043E\u0442 \u0443\u0437\u0435\u043B"))));
}
function Overview({
  eng,
  sameEngineBikes,
  onPickBike,
  setTab,
  flash,
  bike,
  cu,
  ver
}) {
  const S = eng.stock;
  const main = [["Объём", eng.cc + " см³"], ["Мощность", /*#__PURE__*/React.createElement(Val, {
    v: eng.hp + " л.с.",
    stock: S.hp + " л.с."
  })], ["Крутящий момент", eng.torque], ["Схема", eng.stroke + ", " + eng.cam], ["Охлаждение", eng.cooling], ["Компрессия", eng.compression], ["Топливо", /*#__PURE__*/React.createElement(Val, {
    v: eng.fuel,
    stock: S.fuel
  })], ["Зажигание", eng.ignition], ["Привод ГРМ", eng.timing], ["КПП", eng.gearbox]];
  const efi = eng.groups.indexOf("efi") >= 0;
  const adj = [{
    h: "Питание",
    r: efi ? [["Система", eng.carb], ["Холостой ход", /*#__PURE__*/React.createElement(Val, {
      v: eng.idle,
      stock: S.idle
    })]] : [["Карбюратор", /*#__PURE__*/React.createElement(Val, {
      v: eng.carb,
      stock: S.carb
    })], ["Главный жиклёр", /*#__PURE__*/React.createElement(Val, {
      v: eng.jetMain,
      stock: S.jetMain
    })], ["Холостой жиклёр", /*#__PURE__*/React.createElement(Val, {
      v: eng.jetPilot,
      stock: S.jetPilot
    })], ["Игла", /*#__PURE__*/React.createElement(Val, {
      v: eng.needle,
      stock: S.needle
    })], ["Холостой ход", /*#__PURE__*/React.createElement(Val, {
      v: eng.idle,
      stock: S.idle
    })]]
  }, {
    h: "Клапаны, на холодную",
    r: eng.stroke === "2T" ? [["Клапаны", "нет (2T)"]] : [["Впуск", /*#__PURE__*/React.createElement(Val, {
      v: eng.valveIn,
      stock: S.valveIn
    })], ["Выпуск", /*#__PURE__*/React.createElement(Val, {
      v: eng.valveEx,
      stock: S.valveEx
    })], ["Интервал", eng.valveInt ? num(eng.valveInt) + " км" : "—"]]
  }, {
    h: "Зажигание и масло",
    r: [["Свеча", /*#__PURE__*/React.createElement(Val, {
      v: eng.spark,
      stock: S.spark
    })], ["Зазор", /*#__PURE__*/React.createElement(Val, {
      v: eng.gap,
      stock: S.gap
    })], ["Затяжка", eng.sparkTorque], ["Масло", /*#__PURE__*/React.createElement(Val, {
      v: eng.oil,
      stock: S.oil
    })], ["Объём", /*#__PURE__*/React.createElement(Val, {
      v: eng.oilVol,
      stock: S.oilVol
    })]].concat(eng.coolant ? [["Антифриз", eng.coolant]] : [])
  }];
  const inst = TUNING.filter(t => eng.installed.indexOf(t.id) >= 0);
  function card() {
    const L = [(cu.nick ? cu.nick + ": " : "") + bike.brand + " " + bike.name, "Двигатель: " + eng.name + (eng.swapped ? " (свап)" : ""), "Мощность: " + eng.hp + " л.с.", "Карбюратор: " + eng.carb + ", гл. " + eng.jetMain + ", хол. " + eng.jetPilot + ", игла " + eng.needle, "Клапаны: " + eng.valveIn + " / " + eng.valveEx, "Свеча: " + eng.spark + ", зазор " + eng.gap, "Масло: " + eng.oil + ", " + eng.oilVol];
    if (inst.length) L.push("Установлено: " + inst.map(t => t.title).join(", "));
    if (cu.notes) L.push("Заметки: " + cu.notes);
    copyText(L.join("\n")).then(ok => flash(ok ? "Карточка скопирована" : "Не удалось скопировать"));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, ver && ver.approx && !eng.swapped && /*#__PURE__*/React.createElement("div", {
    className: "callout warn-soft"
  }, "\u0414\u043B\u044F \u044D\u0442\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438 \u043C\u043E\u0442\u043E\u0440 \u0443\u043A\u0430\u0437\u0430\u043D \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u043E\u0432\u043E\u0447\u043D\u043E: \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C \u043C\u0435\u043D\u044F\u0435\u0442 \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0442\u0430\u0446\u0438\u0438. \u0421\u0432\u0435\u0440\u044C \u043A\u043E\u0434 \u043D\u0430 \u043A\u0430\u0440\u0442\u0435\u0440\u0435 (\u0432\u044B\u0431\u0438\u0442 \u0440\u044F\u0434\u043E\u043C \u0441 \u043A\u0440\u044B\u0448\u043A\u043E\u0439 \u0433\u0435\u043D\u0435\u0440\u0430\u0442\u043E\u0440\u0430). \u0415\u0441\u043B\u0438 \u0442\u0430\u043C \u0434\u0440\u0443\u0433\u043E\u0439 \u2014 \u0432\u044B\u0431\u0435\u0440\u0438 \u0435\u0433\u043E \u0432 \xAB\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u2192 \u0414\u0432\u0438\u0433\u0430\u0442\u0435\u043B\u044C\xBB."), eng.jetsFromPreset && /*#__PURE__*/React.createElement("div", {
    className: "callout info"
  }, "\u0416\u0438\u043A\u043B\u0451\u0440\u044B \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u044B \u0442\u0438\u043F\u043E\u0432\u044B\u0435 \u0434\u043B\u044F ", eng.carb, ". \u041F\u043E\u0434\u0431\u0435\u0440\u0438 \u0442\u043E\u0447\u043D\u044B\u0435 \u043F\u043E \u0446\u0432\u0435\u0442\u0443 \u0441\u0432\u0435\u0447\u0438 \u0438 \u0432\u043F\u0438\u0448\u0438 \u0432\u043E \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \xAB\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C\xBB."), /*#__PURE__*/React.createElement(TopSpeed, {
    eng: eng,
    bike: bike,
    cu: cu,
    items: inst,
    onEdit: () => setTab("edit")
  }), /*#__PURE__*/React.createElement(FuelCalc, {
    eng: eng,
    bike: bike
  }), /*#__PURE__*/React.createElement("h2", null, "\u0425\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438"), /*#__PURE__*/React.createElement("dl", {
    className: "specs"
  }, main.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("dt", null, m[0]), /*#__PURE__*/React.createElement("dd", null, m[1])))), /*#__PURE__*/React.createElement("h2", null, "\u0420\u0435\u0433\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0438"), /*#__PURE__*/React.createElement("div", {
    className: "adj"
  }, adj.map((b, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "adj-block"
  }, /*#__PURE__*/React.createElement("h3", null, b.h), /*#__PURE__*/React.createElement("table", null, /*#__PURE__*/React.createElement("tbody", null, b.r.map((r, j) => /*#__PURE__*/React.createElement("tr", {
    key: j
  }, /*#__PURE__*/React.createElement("th", null, r[0]), /*#__PURE__*/React.createElement("td", null, r[1])))))))), inst.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h2", null, "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u043D\u0430 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B\u0435"), /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, inst.map(t => /*#__PURE__*/React.createElement("span", {
    key: t.id,
    className: "chip static"
  }, t.title)))), cu.notes && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h2", null, "\u0417\u0430\u043C\u0435\u0442\u043A\u0438"), /*#__PURE__*/React.createElement("p", {
    className: "notes"
  }, cu.notes)), /*#__PURE__*/React.createElement("div", {
    className: "row-gap"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: () => setTab("edit")
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "edit",
    s: 18
  }), "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: card
  }, "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0443")), sameEngineBikes.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h2", null, "\u0422\u0430\u043A\u043E\u0439 \u0436\u0435 \u043C\u043E\u0442\u043E\u0440 \u0441\u0442\u043E\u0438\u0442 \u043D\u0430"), null, /*#__PURE__*/React.createElement("div", {
    className: "tags"
  }, sameEngineBikes.map(b => /*#__PURE__*/React.createElement("button", {
    key: bikeKey(b),
    className: "chip",
    onClick: () => onPickBike(b)
  }, b.brand, " ", b.name)))));
}
function TreeRunner({
  eng,
  bike,
  cu,
  addToCart,
  flash,
  go,
  ai,
  askAi,
  treeId,
  onClose
}) {
  const [s, setS] = useState({
    id: treeId,
    step: 0,
    ans: [],
    done: false
  });
  const list = diagFor(eng);
  const tree = s ? DIAG.find(d => d.id === s.id) : null;
  const step = tree && !s.done ? tree.steps[s.step] : null;
  const isEfi = eng.groups.indexOf("efi") >= 0;
  function finish(r, answers) {
    let action = r.action,
      parts = r.parts || [];
    if (r.skip2t && eng.stroke === "2T") {
      action = "Для 2T: износ поршня и колец, проверь лепестковый клапан и прокладки картера.";
      parts = ["piston", "reed", "basegasket"];
    }
    const resolved = [];
    parts.forEach(k => {
      const p = partByKind(k, eng);
      if (p && resolved.indexOf(p) < 0) resolved.push(p);
    });
    setS({
      id: s.id,
      step: s.step,
      ans: answers,
      done: true,
      res: {
        result: r.result,
        action: sub(action, eng),
        parts: resolved
      }
    });
  }
  function answer(kind, idx) {
    const qText = sub(isEfi && step.efiQ ? step.efiQ : step.q, eng);
    if (kind === "opt") {
      const o = step.options[idx];
      return finish(o.result, s.ans.concat([[qText, o.text]]));
    }
    const br = kind === "yes" ? step.onYes : step.onNo;
    const a = s.ans.concat([[qText, kind === "yes" ? step.yes : step.no]]);
    if (br === "next" || !br) {
      if (s.step + 1 >= tree.steps.length) return finish({
        result: "Причина не найдена",
        action: "Простые проверки пройдены. Обсуди с ИИ-механиком или обратись в сервис.",
        parts: []
      }, a);
      setS({
        id: s.id,
        step: s.step + 1,
        ans: a,
        done: false
      });
    } else finish(br, a);
  }
  function back() {
    if (s.done) setS({
      id: s.id,
      step: Math.max(0, s.ans.length - 1),
      ans: s.ans.slice(0, -1),
      done: false
    });else if (s.step > 0) setS({
      id: s.id,
      step: s.step - 1,
      ans: s.ans.slice(0, -1),
      done: false
    });else onClose();
  }
  function summary() {
    const L = ["Симптом: " + tree.title];
    s.ans.forEach((a, i) => L.push(i + 1 + ". " + a[0] + " — " + a[1]));
    L.push("Вывод приложения: " + s.res.result + ". " + s.res.action);
    return L.join("\n");
  }
  function report() {
    const L = ["MotoHelper — диагностика", new Date().toLocaleString("ru-RU"), "Мотоцикл: " + (cu.nick ? cu.nick + ", " : "") + bike.brand + " " + bike.name, "Двигатель: " + eng.name + ", " + eng.carb, "", summary()];
    if (s.res.parts.length) {
      L.push("", "Детали:");
      s.res.parts.forEach(p => L.push("— " + p.name + ", " + rub(p.price)));
    }
    copyText(L.join("\n")).then(ok => flash(ok ? "Отчёт скопирован" : "Не удалось скопировать"));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, s && tree && /*#__PURE__*/React.createElement("div", {
    className: "wizard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wz-head"
  }, /*#__PURE__*/React.createElement("b", null, tree.icon, " ", tree.title), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C",
    onClick: onClose
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "close",
    s: 18
  }))), !s.done && step && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("ol", {
    className: "wz-steps",
    "aria-label": "Шаг " + (s.step + 1) + " из " + tree.steps.length
  }, tree.steps.map((_, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: i < s.step ? "done" : i === s.step ? "cur" : ""
  }))), /*#__PURE__*/React.createElement("p", {
    className: "wz-q"
  }, sub(isEfi && step.efiQ ? step.efiQ : step.q, eng)), step.hint && /*#__PURE__*/React.createElement("p", {
    className: "wz-hint"
  }, sub(step.hint, eng)), step.options ? /*#__PURE__*/React.createElement("div", {
    className: "wz-opts"
  }, step.options.map((o, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    className: "wz-opt",
    onClick: () => answer("opt", i)
  }, o.text))) : /*#__PURE__*/React.createElement("div", {
    className: "wz-yn"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: () => answer("yes")
  }, step.yes), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => answer("no")
  }, step.no)), /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: back
  }, "\u041D\u0430\u0437\u0430\u0434")), s.done && s.res && /*#__PURE__*/React.createElement("div", {
    className: "wz-res"
  }, /*#__PURE__*/React.createElement("h3", null, s.res.result), /*#__PURE__*/React.createElement("p", null, s.res.action), s.res.parts.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h4", null, "\u041C\u043E\u0436\u0435\u0442 \u043F\u043E\u043D\u0430\u0434\u043E\u0431\u0438\u0442\u044C\u0441\u044F"), /*#__PURE__*/React.createElement("ul", {
    className: "plist"
  }, s.res.parts.map(p => /*#__PURE__*/React.createElement("li", {
    key: p.id
  }, /*#__PURE__*/React.createElement("span", null, p.name, /*#__PURE__*/React.createElement(BuyLinks, {
      q: buyQuery(p, eng)
    })), /*#__PURE__*/React.createElement("span", {
    className: "price"
  }, rub(p.price))))), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: () => {
      s.res.parts.forEach(addToCart);
      flash("Детали в корзине");
      go("parts");
    }
  }, "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438 \u0432 \u043A\u043E\u0440\u0437\u0438\u043D\u0443")), ai.state === "ready" && /*#__PURE__*/React.createElement("button", {
    className: "btn ai-btn",
    onClick: () => askAi("Я прошёл диагностику в приложении. Помоги разобраться дальше и составь план ремонта.\n\n" + summary(), true)
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "ai",
    s: 18
  }), "\u041E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0441 \u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A\u043E\u043C"), /*#__PURE__*/React.createElement("div", {
    className: "row-gap"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: back
  }, "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0442\u0432\u0435\u0442"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: report
  }, "\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043E\u0442\u0447\u0451\u0442"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onClose
  }, "\u0414\u0440\u0443\u0433\u043E\u0439 \u0441\u0438\u043C\u043F\u0442\u043E\u043C")))));
}

/* ===== ИИ-механик ===== */
const AI_ERR = {
  rate_limited: "Дневной лимит ИИ исчерпан или слишком много запросов. Попробуй позже или завтра.",
  not_allowed: "ИИ-сервер не принимает запросы с этого адреса. Проверь список ALLOWED в коде Worker.",
  session_expired: "Нужно заново войти в Claude.",
  refused: "ИИ не стал отвечать на этот запрос. Переформулируй вопрос.",
  image_rejected: "Фото не подошло: нужен JPEG, PNG или WebP до 20 МБ.",
  images_unavailable: "Фото в этом просмотре не поддерживаются — опиши словами.",
  prompt_too_large: "Разговор слишком длинный — начни новый.",
  empty_completion: "Ответ получился пустым — спроси по-другому.",
  upstream_error: "Связь прервалась. Нажми «Повторить»."
};
const AI_OFF_CODES = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"];
/* ===== v28: ссылка на модель — «…/#bike=Kayo T2 250&v=0» открывает этот мотоцикл ===== */
function bikeFromHash() {
  try {
    const h = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
    let key = h.get("bike");
    if (!key) return null;
    let vi = Math.max(0, parseInt(h.get("v") || "0", 10) || 0);
    const al = typeof BIKE_ALIASES === "object" && BIKE_ALIASES[key];
    if (al) {
      key = al[0];
      vi = al[1];
    }
    const b = BIKES.find(x => bikeKey(x) === key);
    if (!b) return null;
    return {
      key: key,
      vi: Math.min(vi, b.versions.length - 1)
    };
  } catch (e) {
    return null;
  }
}
function bikeLink(bike, vi) {
  const q = new URLSearchParams();
  q.set("bike", bikeKey(bike));
  if (vi) q.set("v", String(vi));
  return location.href.split("#")[0] + "#" + q.toString();
}
function shareBike(bike, vi, flash) {
  const url = bikeLink(bike, vi),
    title = bike.brand + " " + bike.name + " — MotoHelper";
  if (navigator.share) {
    navigator.share({
      title: title,
      text: title,
      url: url
    }).catch(() => {});
    return;
  }
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => flash("Ссылка скопирована — отправь её другу"), () => window.prompt("Скопируй ссылку:", url));
}
/* ===== v28: резервная копия данных в файл =====
   Всё своё (гараж, журнал ТО, сметы, заправки, настройки, чаты) лежит в localStorage с префиксом «mh2-».
   «Сохранить копию» скачивает их одним JSON-файлом, «Загрузить из файла» возвращает и перезагружает страницу. */
const BACKUP_APP = "MotoHelper";
function backupCollect() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf("mh2-") === 0) data[k] = localStorage.getItem(k);
  }
  return {
    app: BACKUP_APP,
    version: 1,
    date: new Date().toISOString(),
    data: data
  };
}
function backupRestore(obj) {
  if (!obj || obj.app !== BACKUP_APP || !obj.data || typeof obj.data !== "object") throw new Error("not a backup");
  const keys = Object.keys(obj.data).filter(k => k.indexOf("mh2-") === 0 && typeof obj.data[k] === "string");
  if (!keys.length) throw new Error("empty backup");
  const old = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf("mh2-") === 0) old.push(k);
  }
  old.forEach(k => localStorage.removeItem(k));
  keys.forEach(k => localStorage.setItem(k, obj.data[k]));
  return keys.length;
}
function BackupBar({
  flash
}) {
  const fileRef = useRef(null);
  function exportFile() {
    try {
      const b = backupCollect();
      const blob = new Blob([JSON.stringify(b, null, 1)], {
        type: "application/json"
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "motohelper-backup-" + b.date.slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1000);
      flash("Копия сохранена в файл");
    } catch (e) {
      flash("Не получилось сохранить копию");
    }
  }
  function importFile(f) {
    const r = new FileReader();
    r.onload = () => {
      let obj;
      try {
        obj = JSON.parse(String(r.result));
        if (!obj || obj.app !== BACKUP_APP) throw 0;
      } catch (e) {
        flash("Это не файл копии MotoHelper");
        return;
      }
      const when = obj.date ? new Date(obj.date).toLocaleDateString("ru-RU") : "?";
      if (!window.confirm("Заменить данные на этом устройстве копией от " + when + "? Гараж, настройки и сметы станут как в файле.")) return;
      try {
        backupRestore(obj);
        location.reload();
      } catch (e) {
        flash("Файл копии повреждён");
      }
    };
    r.readAsText(f);
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "backup-bar"
  }, null, /*#__PURE__*/React.createElement("div", {
    className: "row-gap"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn sm",
    onClick: exportFile
  }, "Сохранить копию"), /*#__PURE__*/React.createElement("button", {
    className: "btn sm ghost",
    onClick: () => fileRef.current && fileRef.current.click()
  }, "Загрузить из файла"), /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "application/json,.json",
    hidden: true,
    onChange: e => {
      const f = e.target.files && e.target.files[0];
      if (f) importFile(f);
      e.target.value = "";
    }
  })));
}
/* ===== v27: удобства ИИ-механика ===== */
/* коды моторов из базы, которые ИИ может назвать в ответе («ZS174MN-5», «172FMM») */
const AI_ENG_CODES = Object.keys(ENGINES).map(id => ({
  id: id,
  code: ENGINES[id].code
})).filter(x => /\d/.test(x.code) && x.code.length >= 5).sort((a, b) => b.code.length - a.code.length);
function aiEngineMentions(text) {
  const t = String(text || "").toUpperCase().replace(/\s+/g, ""),
    out = [];
  AI_ENG_CODES.forEach(x => {
    const c = x.code.toUpperCase().replace(/\s+/g, "");
    if (t.indexOf(c) >= 0 && !out.some(o => o.code.toUpperCase().replace(/\s+/g, "").indexOf(c) >= 0)) out.push(x);
  });
  return out.slice(0, 3);
}
function openEnginePicker(id) {
  window.dispatchEvent(new CustomEvent("mh-open-picker", {
    detail: id ? {
      engine: id
    } : {
      mode: "engines"
    }
  }));
}
const AI_FOLLOW = ["Распиши по шагам подробнее", "Какие запчасти понадобятся?", "Как проверить это самому?", "Сколько это стоит в сервисе?"];
const SpeechRec = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
function AiChat({
  eng,
  bike,
  ver,
  cu,
  mt,
  chat,
  setChat,
  draft,
  clearDraft,
  ai,
  addToCart,
  cart,
  flash,
  go,
  connectAi
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tier, setTier] = useState("default");
  const [photo, setPhoto] = useState(null);
  const [err, setErr] = useState("");
  const [denied, setDenied] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const taRef = useRef(null);
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [input]);
  useEffect(() => () => {
    if (recRef.current) try {
      recRef.current.abort();
    } catch (e) {}
  }, []);
  function toggleVoice() {
    if (listening && recRef.current) {
      recRef.current.stop();
      return;
    }
    const r = new SpeechRec();
    r.lang = "ru-RU";
    r.interimResults = true;
    r.continuous = false;
    const base = input ? input.replace(/\s+$/, "") + " " : "";
    r.onresult = e => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(base + t);
    };
    r.onend = () => setListening(false);
    r.onerror = e => {
      setListening(false);
      if (e.error === "not-allowed") flash("Разреши доступ к микрофону в настройках браузера");
    };
    recRef.current = r;
    setListening(true);
    try {
      r.start();
    } catch (e) {
      setListening(false);
    }
  }
  function copyAnswer(text) {
    const t = String(text || "").replace(/\[part:[^\]]*\]/g, "").trim();
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => flash("Ответ скопирован"), () => flash("Не удалось скопировать"));
  }
  const ctl = useRef(null);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const cartIds = cart.map(c => c.id);
  const ready = ai.state === "ready" && !denied;
  const stick = useRef(true);
  useEffect(() => {
    const check = () => {
      const el = listRef.current;
      if (!el) return;
      const last = el.lastElementChild;
      const pageNear = !last || last.getBoundingClientRect().bottom - window.innerHeight < 220;
      const innerNear = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
      stick.current = pageNear && innerNear;
    };
    window.addEventListener("scroll", check, {
      passive: true
    });
    const el = listRef.current;
    if (el) el.addEventListener("scroll", check, {
      passive: true
    });
    const vv = window.visualViewport,
      onVV = () => {
        const c = listRef.current;
        if (!c || !stick.current) return;
        c.scrollTop = c.scrollHeight;
        const last = c.lastElementChild;
        if (last) {
          const gap = last.getBoundingClientRect().bottom - ((vv ? vv.height : window.innerHeight) - 150);
          if (gap > 0) window.scrollBy({
            top: gap
          });
        }
      };
    if (vv) vv.addEventListener("resize", onVV);
    return () => {
      window.removeEventListener("scroll", check);
      if (el) el.removeEventListener("scroll", check);
      if (vv) vv.removeEventListener("resize", onVV);
    };
  }, [ready]);
  useEffect(() => {
    const el = listRef.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
    const last = el.lastElementChild;
    if (!last) return;
    const gap = last.getBoundingClientRect().bottom - (window.innerHeight - (window.innerWidth < 980 ? 190 : 130));
    if (gap > 0) window.scrollBy({
      top: gap,
      behavior: busy ? "auto" : "smooth"
    });
  }, [chat, busy]);
  useEffect(() => {
    if (!draft) return;
    if (draft.auto && ready && !busy) send(draft.text);else setInput(draft.text);
    clearDraft();
  }, [draft, ready]);
  useEffect(() => () => {
    if (ctl.current) ctl.current.abort();
  }, []);
  async function send(textArg) {
    const text = (textArg != null ? textArg : input).trim();
    if (!text || busy || !ready) return;
    stick.current = true;
    bumpStat("ai");
    const img = photo;
    setInput("");
    setPhoto(null);
    setErr("");
    const history = chat.concat([{
      role: "user",
      text: text,
      img: !!img
    }]);
    setChat(history.concat([{
      role: "assistant",
      text: "",
      pending: true
    }]));
    setBusy(true);
    const c = new AbortController();
    ctl.current = c;
    const context = AI_RULES + (ai.provider === "worker" ? "\nВсегда отвечай только на русском языке." : "") + "\n\n=== КАРТОЧКА МОТОЦИКЛА ===\n" + aiCard(eng, bike, ver, cu, mt) + "\n\n=== КАТАЛОГ ЗАПЧАСТЕЙ (ID|название|цена ₽) ===\n" + aiCatalog(eng, ai.provider === "worker" ? 40 : 220);
    const turns = [{
      role: "user",
      content: context
    }].concat(history.slice(-14).map(m => ({
      role: m.role,
      content: m.text + (m.img ? "\n[К сообщению приложено фото]" : "")
    })));
    const opts = {
      signal: c.signal,
      cache: false,
      modelTier: tier,
      onText: u => setChat(cur => {
        const n = cur.slice();
        n[n.length - 1] = {
          role: "assistant",
          text: u.text,
          pending: true
        };
        return n;
      })
    };
    if (img) opts.images = [img];
    try {
      const res = await ai.fn(turns, opts);
      setChat(cur => {
        const n = cur.slice();
        n[n.length - 1] = {
          role: "assistant",
          text: res.text + (res.truncated ? "\n\n_Ответ обрезан — попроси продолжить._" : "")
        };
        return n;
      });
    } catch (e) {
      const code = e && e.code;
      const partial = e && e.text ? e.text : "";
      setChat(cur => {
        const n = cur.slice();
        if (partial) n[n.length - 1] = {
          role: "assistant",
          text: partial + (code === "cancelled" ? "\n\n_Остановлено._" : "")
        };else n.pop();
        return n;
      });
      if (code === "cancelled") {} else if (AI_OFF_CODES.indexOf(code) >= 0) setDenied(true);else setErr(AI_ERR[code] || AI_ERR.upstream_error);
    } finally {
      setBusy(false);
      ctl.current = null;
    }
  }
  function retry() {
    const lastUser = [].concat(chat).reverse().find(m => m.role === "user");
    if (!lastUser) return;
    setChat(chat.slice(0, chat.lastIndexOf(lastUser)));
    setTimeout(() => send(lastUser.text), 0);
  }
  const efi = eng.groups.indexOf("efi") >= 0;
  const sugg = ["Глохнет на холодную — с чего начать?", eng.stroke === "4T" ? "Как отрегулировать клапаны на моём моторе?" : "Как понять, что пора менять поршень?", efi ? "Горит лампа Check Engine — что проверить в первую очередь?" : "Какой главный жиклёр поставить после прямотока и фильтра нулевого?", "Какие слабые места у " + eng.code + " и как их предупредить?", "Что проверить перед дальней поездкой по лесу?"].concat(ai.images ? ["Посмотри фото свечи и скажи, что со смесью"] : []);
  return /*#__PURE__*/React.createElement("section", {
    className: "page ai-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ai-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ai-title"
  }, /*#__PURE__*/React.createElement("span", {
    className: "ai-logo"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "ai",
    s: 26
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "\u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A"), /*#__PURE__*/React.createElement("p", null, "\u0417\u043D\u0430\u0435\u0442 \u0442\u0432\u043E\u0439 ", bike.brand, " ", bike.name, ": ", eng.code, ", ", efi ? "инжектор" : eng.carb, eng.installed.length ? ", доработки" : "", "."))), ready && /*#__PURE__*/React.createElement("div", {
    className: "ai-tools"
  }, ai.provider === "claude" && /*#__PURE__*/React.createElement("div", {
    className: "seg sm",
    role: "group",
    "aria-label": "\u0420\u0435\u0436\u0438\u043C \u043E\u0442\u0432\u0435\u0442\u0430"
  }, /*#__PURE__*/React.createElement("button", {
    className: tier === "default" ? "on" : "",
    onClick: () => setTier("default")
  }, "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u043E"), /*#__PURE__*/React.createElement("button", {
    className: tier === "quick" ? "on" : "",
    onClick: () => setTier("quick")
  }, "\u0411\u044B\u0441\u0442\u0440\u043E")), chat.length > 0 && /*#__PURE__*/React.createElement("button", {
    className: "btn sm ghost",
    onClick: () => {
      if (ctl.current) ctl.current.abort();
      setChat([]);
      setErr("");
    }
  }, "\u041D\u043E\u0432\u044B\u0439 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440"))), ai.state === "checking" && /*#__PURE__*/React.createElement("div", {
    className: "panel"
  }, /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u044E \u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A\u0430\u2026")), (ai.state === "off" || denied) && /*#__PURE__*/React.createElement("div", {
    className: "panel ai-off"
  }, /*#__PURE__*/React.createElement("h2", null, denied ? "Доступ к ИИ не разрешён" : "ИИ-механик не подключён"), /*#__PURE__*/React.createElement("p", null, denied ? "Ты отказался разрешить странице использовать Claude, или это отключено в аккаунте. Обнови страницу, чтобы спросить ещё раз." : "Чтобы ИИ работал на этом сайте, нужен бесплатный ИИ-сервер на Cloudflare. Владелец сайта создаёт его один раз и прописывает адрес в файле ai-config.json — тогда ИИ заработает у всех посетителей."), !denied && /*#__PURE__*/React.createElement(AiConnect, {
    connectAi: connectAi
  }), /*#__PURE__*/React.createElement("p", {
    className: "muted"
  }, "\u0411\u0435\u0437 \u0418\u0418 \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u043F\u043E\u0448\u0430\u0433\u043E\u0432\u0430\u044F \u0434\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430, \u0438\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438 \u0438 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A \u043D\u0435\u0438\u0441\u043F\u0440\u0430\u0432\u043D\u043E\u0441\u0442\u0435\u0439."), /*#__PURE__*/React.createElement("div", {
    className: "row-gap"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: () => go("diag")
  }, "\u0414\u0438\u0430\u0433\u043D\u043E\u0441\u0442\u0438\u043A\u0430 \u043F\u043E \u0448\u0430\u0433\u0430\u043C"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => go("repair")
  }, "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438"))), ready && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "chat",
    ref: listRef
  }, chat.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "chat-empty"
  }, /*#__PURE__*/React.createElement("p", null, "\u041E\u043F\u0438\u0448\u0438, \u0447\u0442\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0434\u0438\u0442 \u0441 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B\u043E\u043C \u2014 \u043A\u0430\u043A \u043C\u0435\u0445\u0430\u043D\u0438\u043A\u0443 \u0432 \u0433\u0430\u0440\u0430\u0436\u0435: \u043A\u043E\u0433\u0434\u0430 \u043D\u0430\u0447\u0430\u043B\u043E\u0441\u044C, \u043F\u0440\u0438 \u043A\u0430\u043A\u0438\u0445 \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u0445, \u0447\u0442\u043E \u0443\u0436\u0435 \u043C\u0435\u043D\u044F\u043B. \u042F \u0443\u0447\u0442\u0443 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u0438\u0441\u0442\u0438\u043A\u0438 \u0438\u0437 \xAB\u041C\u043E\u0439 \u043C\u043E\u0442\u043E\u0446\u0438\u043A\u043B\xBB."), /*#__PURE__*/React.createElement("div", {
    className: "sugg"
  }, sugg.map(sg => /*#__PURE__*/React.createElement("button", {
    key: sg,
    className: "chip",
    onClick: () => sg.indexOf("фото") >= 0 ? fileRef.current && fileRef.current.click() : send(sg)
  }, sg))), /*#__PURE__*/React.createElement("div", {
    className: "ai-engcard"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Не знаешь, какой у тебя мотор?"), /*#__PURE__*/React.createElement("span", null, "Код выбит на картере слева под цилиндром: ZS174MN-5, 172FMM, 1P60FMK. Введи даже только цифры — «174» — и я покажу подходящие моторы и модели.")), /*#__PURE__*/React.createElement("div", {
    className: "row-gap"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => openEnginePicker()
  }, "Найти мотор по коду"), ai.images && /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: () => {
      setInput("Прочитай маркировку мотора на фото и скажи, что это за мотор и на каких мотоциклах он стоит.");
      fileRef.current && fileRef.current.click();
    }
  }, "Сфоткать маркировку")))), chat.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "msg " + m.role
  }, m.role === "user" ? /*#__PURE__*/React.createElement("div", {
    className: "bubble"
  }, m.img && /*#__PURE__*/React.createElement("span", {
    className: "msg-photo"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "photo",
    s: 14
  }), " \u0444\u043E\u0442\u043E"), m.text) : /*#__PURE__*/React.createElement("div", {
    className: "bubble"
  }, m.pending && !m.text ? /*#__PURE__*/React.createElement("span", {
    className: "thinking",
    "aria-label": "\u0414\u0443\u043C\u0430\u044E"
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), " \u0414\u0443\u043C\u0430\u044E\u2026") : /*#__PURE__*/React.createElement(Md, {
    text: m.text,
    cartIds: cartIds,
    onPart: p => {
      addToCart(p);
      flash("В корзине: " + p.name);
    }
  })), m.role === "assistant" && !m.pending && m.text && /*#__PURE__*/React.createElement("div", {
    className: "msg-actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "chip sm",
    onClick: () => copyAnswer(m.text)
  }, "Копировать"), aiEngineMentions(m.text).map(x => /*#__PURE__*/React.createElement("button", {
    key: x.id,
    className: "chip sm eng",
    onClick: () => openEnginePicker(x.id)
  }, "Модели с мотором ", x.code))), m.role === "assistant" && !m.pending && !busy && i === chat.length - 1 && /*#__PURE__*/React.createElement("div", {
    className: "sugg follow"
  }, AI_FOLLOW.map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    className: "chip",
    onClick: () => send(f)
  }, f))))), err && /*#__PURE__*/React.createElement("div", {
    className: "chat-err"
  }, err, " ", err === AI_ERR.upstream_error && /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: retry
  }, "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C"))), /*#__PURE__*/React.createElement("div", {
    className: "composer"
  }, photo && /*#__PURE__*/React.createElement("div", {
    className: "photo-chip"
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "photo",
    s: 16
  }), photo.name || "фото", /*#__PURE__*/React.createElement("button", {
    className: "link",
    onClick: () => setPhoto(null)
  }, "\u0443\u0431\u0440\u0430\u0442\u044C")), /*#__PURE__*/React.createElement("div", {
    className: "comp-row"
  }, ai.images && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: (ai.imageTypes || []).join(",") || "image/*",
    hidden: true,
    onChange: e => {
      const f = e.target.files && e.target.files[0];
      if (f) setPhoto(f);
      e.target.value = "";
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "icon-btn",
    "aria-label": "\u041F\u0440\u0438\u043A\u0440\u0435\u043F\u0438\u0442\u044C \u0444\u043E\u0442\u043E",
    onClick: () => fileRef.current && fileRef.current.click()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "photo",
    s: 20
  }))), /*#__PURE__*/React.createElement("textarea", {
    ref: taRef,
    rows: "1",
    value: input,
    placeholder: "\u041E\u043F\u0438\u0448\u0438 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443: \u0447\u0442\u043E, \u043A\u043E\u0433\u0434\u0430, \u043F\u0440\u0438 \u043A\u0430\u043A\u0438\u0445 \u0443\u0441\u043B\u043E\u0432\u0438\u044F\u0445",
    onChange: e => setInput(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 760px)").matches) {
        e.preventDefault();
        send();
      }
    },
    "aria-label": "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0418\u0418-\u043C\u0435\u0445\u0430\u043D\u0438\u043A\u0443"
  }), SpeechRec && !busy && /*#__PURE__*/React.createElement("button", {
    className: "icon-btn mic" + (listening ? " on" : ""),
    "aria-label": listening ? "Остановить запись" : "Сказать голосом",
    "aria-pressed": listening,
    onClick: toggleVoice
  }, /*#__PURE__*/React.createElement("svg", {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("rect", {
    x: 9,
    y: 3,
    width: 6,
    height: 11,
    rx: 3
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 11a7 7 0 0 0 14 0M12 18v3"
  }))), busy ? /*#__PURE__*/React.createElement("button", {
    className: "send stop",
    "aria-label": "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C",
    onClick: () => ctl.current && ctl.current.abort()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "stop",
    s: 18
  })) : /*#__PURE__*/React.createElement("button", {
    className: "send",
    "aria-label": "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C",
    disabled: !input.trim(),
    onClick: () => send()
  }, /*#__PURE__*/React.createElement(Icon, {
    n: "send",
    s: 20
  }))))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));;document.getElementById("root").dataset.ok="1";
