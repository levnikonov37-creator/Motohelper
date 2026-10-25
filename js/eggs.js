/* MotoHelper — пасхалки. Подключается после js/app.js, в работу сайта не вмешивается:
   только слушает нажатия и ввод, на время эффекта добавляет свои элементы и классы.
   Найденные пасхалки запоминаются в localStorage (mh2-eggs) — «найдено N из M».
   Звук — короткий и тихий, только в ответ на нажатие или ввод. При «уменьшить движение» — без анимаций. */
(function () {
  var EGGS = {
    wheelie: ["🏍", "Вилли!", "Пять раз по логотипу — и мотоцикл на заднем колесе"],
    vroom: ["💨", "Врум-врум!", "Мотоцикл умчался и вернулся"],
    redline: ["🔴", "Отсечка!", "Тахометр не железный — хватит крутить"],
    night: ["🌙", "Ночной райдер", "Фары включены. Едь аккуратно — ночью тебя не видно"],
    answer: ["42", "Ответ на главный вопрос", "Но масло всё равно меняй вовремя"],
    mechanic: ["🏆", "Лучший механик — ты", "А ИИ-механик просто рядом"],
    konami: ["🏁", "Режим гонщика", "↑↑↓↓←→←→BA — старт по зелёному!"],
    snow: ["❄", "С Новым годом!", "Мотоцикл в гараже, а у нас снег"],
    spin: ["🤖", "ИИ задумался…", "Подержал кнопку ИИ — и он закружился"],
    shake: ["📳", "Не тряси!", "Масло вспенится. Положи телефон и дай мотору остыть"]
  };
  var TOTAL = Object.keys(EGGS).length;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function found() {
    try { return JSON.parse(localStorage.getItem("mh2-eggs") || "{}") || {}; } catch (e) { return {}; }
  }
  function mark(id) {
    var f = found();
    var isNew = !f[id];
    f[id] = 1;
    try { localStorage.setItem("mh2-eggs", JSON.stringify(f)); } catch (e) {}
    toast(id, f, isNew);
  }

  /* ---------- плашка: значок, текст, точки «сколько найдено» ---------- */
  var toastEl = null, toastT = 0;
  function toast(id, f, isNew) {
    var E = EGGS[id];
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "egg-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    var n = Object.keys(f).filter(function (k) { return EGGS[k]; }).length;
    toastEl.innerHTML = "";
    var box = el("div", "et-txt");
    box.appendChild(el("b", "", E[1]));
    box.appendChild(el("span", "", E[2]));
    var dots = el("div", "et-dots");
    Object.keys(EGGS).forEach(function (k) { dots.appendChild(el("i", f[k] ? (k === id ? "on cur" : "on") : "")); });
    box.appendChild(dots);
    box.appendChild(el("small", "", "Пасхалка " + n + " из " + TOTAL + (isNew ? " · новая!" : "") + (n === TOTAL ? " · все найдены 🎉" : "")));
    toastEl.appendChild(el("span", "et-ico", E[0]));
    toastEl.appendChild(box);
    toastEl.classList.remove("on"); void toastEl.offsetWidth; toastEl.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("on"); }, 4200);
    if (isNew && n === TOTAL) setTimeout(confetti, 300);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  // класс на время анимации; повторный запуск перезапускает её
  function play(node, cls, ms) {
    if (!node) return;
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    setTimeout(function () { node.classList.remove(cls); }, ms);
  }
  // временный слой поверх страницы
  function layer(cls, ms) {
    var d = el("div", "egg-layer " + cls);
    d.setAttribute("aria-hidden", "true");
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, ms);
    return d;
  }
  function bikeEl() { return document.querySelector(".hero-bike svg, .bike-svg, .model-photo"); }

  /* ---------- звук мотора: два «пилообразных» генератора через фильтр, очень тихо ---------- */
  var AC = null;
  function audio() {
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); return AC; } catch (e) { return null; }
  }
  function rev(dur, f0, f1, vol) {
    var a = audio(); if (!a) return;
    var t = a.currentTime, g = a.createGain(), lp = a.createBiquadFilter(), v = vol || 0.06;
    lp.type = "lowpass"; lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(1600, t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.06); g.gain.setValueAtTime(v, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [0, 7].forEach(function (det) {
      var o = a.createOscillator(); o.type = "sawtooth"; o.detune.value = det * 10;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6); o.frequency.exponentialRampToValueAtTime(f0 * 1.2, t + dur);
      o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    });
    lp.connect(g); g.connect(a.destination);
  }
  function limiter() { // «бах-бах» отсечки
    var a = audio(); if (!a) return;
    for (var i = 0; i < 6; i++) {
      var t = a.currentTime + i * 0.11, o = a.createOscillator(), g = a.createGain();
      o.type = "square"; o.frequency.setValueAtTime(190, t);
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.09);
    }
  }
  function beep(f, at, len) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + len + 0.02);
  }

  /* ---------- эффекты ---------- */
  function puffs(node) { // клубы дыма у заднего колеса
    if (!node || reduce) return;
    var r = node.getBoundingClientRect();
    var L = layer("egg-puffs", 1900);
    for (var i = 0; i < 9; i++) {
      var p = el("i");
      p.style.left = (r.left + r.width * 0.18 + Math.random() * 24) + "px";
      p.style.top = (r.top + r.height * 0.72 + Math.random() * 12) + "px";
      p.style.animationDelay = (i * 0.08) + "s";
      p.style.setProperty("--dx", (-40 - Math.random() * 70) + "px");
      L.appendChild(p);
    }
  }
  function race() { // неоновые полосы через весь экран
    if (reduce) return;
    var r = layer("egg-race", 1600);
    for (var i = 0; i < 7; i++) { var l = el("i"); l.style.top = (8 + i * 13) + "%"; l.style.animationDelay = (i * 0.06) + "s"; r.appendChild(l); }
  }
  function bigText(text, cls, ms) { // крупная надпись по центру
    var L = layer("egg-big " + (cls || ""), ms || 1400);
    L.appendChild(el("b", "", text));
  }
  function confetti() {
    if (reduce) return;
    var L = layer("egg-confetti", 2800), cols = ["#FFFFFF", "#BDBDBD", "#7A7A7A", "#FFFFFF", "#3A3A3A"];
    for (var i = 0; i < 70; i++) {
      var c = el("i");
      c.style.left = Math.random() * 100 + "%";
      c.style.background = cols[i % cols.length];
      c.style.animationDelay = (Math.random() * 0.6) + "s";
      c.style.setProperty("--rx", (Math.random() * 720 - 360) + "deg");
      c.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
      L.appendChild(c);
    }
  }
  function lights() { // старт: три красных — зелёный
    var L = layer("egg-lights", 2300), box = el("div", "el-box");
    for (var i = 0; i < 4; i++) { var s = el("i", i === 3 ? "go" : ""); s.style.animationDelay = (i * 0.4) + "s"; box.appendChild(s); }
    L.appendChild(box);
    [0, 0.4, 0.8].forEach(function (t) { beep(520, t, 0.18); });
    beep(1040, 1.2, 0.4);
    setTimeout(function () { race(); rev(1.1, 70, 260, 0.05); }, 1250);
  }
  function diploma() {
    var L = layer("egg-diploma", 3400), card = el("div", "ed-card");
    var chip = document.querySelector(".topbar .bike-chip");
    var name = chip ? Array.prototype.map.call(chip.children.length ? chip.children : [chip], function (c) { return c.textContent.trim(); }).filter(Boolean).reverse().join(" · ") : "";
    card.appendChild(el("span", "ed-k", "Грамота"));
    card.appendChild(el("b", "", "Лучший механик"));
    card.appendChild(el("p", "", "вручается тебе за то, что чинишь сам" + (name ? " · " + name : "")));
    card.appendChild(el("span", "ed-seal", "🔧"));
    L.appendChild(card);
  }

  /* ---------- 1. пять нажатий на «МН» — вилли с дымом и рёвом ---------- */
  var taps = [];
  function wheelie() {
    var b = bikeEl();
    play(b, "egg-wheelie", 1800);
    puffs(b);
    rev(1.4, 80, 330, 0.06);
    mark("wheelie");
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest(".brand-mark")) {
      var now = Date.now();
      taps = taps.filter(function (x) { return now - x < 2500; });
      taps.push(now);
      if (taps.length >= 5) {
        taps = [];
        if (bikeEl()) wheelie();
        else { var h = document.querySelector(".tabbar .tab"); if (h) h.click(); setTimeout(wheelie, 500); }
      }
    }
    /* 3. семь нажатий на тахометр — отсечка */
    var tc = t.closest(".tacho");
    if (tc) {
      tc._n = (tc._n || 0) + 1;
      clearTimeout(tc._t);
      tc._t = setTimeout(function () { tc._n = 0; }, 2000);
      if (tc._n >= 7) {
        tc._n = 0;
        play(document.body, "egg-shake", 800);
        play(tc, "egg-redline", 1300);
        layer("egg-vignette", 1300);
        bigText("ОТСЕЧКА", "red", 1300);
        limiter();
        mark("redline");
      }
    }
  }, true);

  /* ---------- 2, 5, 6. слова в любом поле ввода ---------- */
  var said = {};
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t || t.tagName !== "INPUT" && t.tagName !== "TEXTAREA") return;
    var v = String(t.value || "").toLowerCase().replace(/ё/g, "е").trim();
    var hit = /^(вр+у+м+|бр+р+|вжу+х+|др+р+)(\s|!|$)/.test(v) ? "vroom" : v === "42" ? "answer" : /кто (тут )?(самый )?лучший механик/.test(v) ? "mechanic" : null;
    if (!hit || Date.now() - (said[hit] || 0) < 3000) return;
    said[hit] = Date.now();
    if (hit === "vroom") { play(bikeEl(), "egg-ride", 1900); race(); rev(1.6, 70, 300, 0.06); }
    if (hit === "answer") bigText("42", "spin", 1600);
    if (hit === "mechanic") { diploma(); confetti(); }
    mark(hit);
  }, true);

  /* ---------- 7. код Konami — светофор и старт ---------- */
  var KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"], kp = 0;
  document.addEventListener("keydown", function (e) {
    var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === "и") k = "b"; else if (k === "ф") k = "a"; // русская раскладка
    kp = k === KONAMI[kp] ? kp + 1 : k === KONAMI[0] ? 1 : 0;
    if (kp === KONAMI.length) { kp = 0; lights(); mark("konami"); }
  });

  /* ---------- 9. подержать кнопку ИИ 1,5 секунды — она закружится ---------- */
  var holdT = 0, holdBtn = null;
  document.addEventListener("pointerdown", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".tab-ai");
    if (!b) return;
    clearTimeout(holdT);
    holdBtn = b;
    holdT = setTimeout(function () {
      play(b.querySelector(".tab-ico"), "egg-spin", 1600);
      b._egg = Date.now();
      mark("spin");
    }, 1500);
  }, true);
  ["pointerup", "pointercancel"].forEach(function (n) { document.addEventListener(n, function () { clearTimeout(holdT); }, true); });
  // долгое нажатие не должно ещё и открывать раздел ИИ
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".tab-ai");
    if (b && b._egg && Date.now() - b._egg < 2500) { e.stopPropagation(); e.preventDefault(); b._egg = 0; }
  }, true);
  document.addEventListener("contextmenu", function (e) { if (e.target && e.target.closest && e.target.closest(".tab-ai")) e.preventDefault(); }, true);

  /* ---------- 10. потрясти телефон ---------- */
  if (window.DeviceMotionEvent) {
    var lastM = 0, shakes = 0, shakeT = 0;
    window.addEventListener("devicemotion", function (e) {
      var a = e.accelerationIncludingGravity; if (!a) return;
      var mm = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      if (lastM && Math.abs(mm - lastM) > 28) {
        shakes++; clearTimeout(shakeT); shakeT = setTimeout(function () { shakes = 0; }, 900);
        if (shakes >= 4) { shakes = 0; play(document.body, "egg-shake", 800); bigText("НЕ ТРЯСИ!", "", 1200); mark("shake"); }
      }
      lastM = mm;
    });
  }

  /* ---------- 4. ночью (0–4 часа) — «ночной райдер»: луч фары и звёзды ---------- */
  var d = new Date();
  if (d.getHours() < 4) {
    document.documentElement.classList.add("egg-night");
    var key = d.toDateString(), lastN = "";
    try { lastN = localStorage.getItem("mh2-egg-night") || ""; } catch (e) {}
    if (lastN !== key) {
      try { localStorage.setItem("mh2-egg-night", key); } catch (e) {}
      setTimeout(function () { mark("night"); }, 2500);
    }
  }

  /* ---------- 8. с 20 декабря по 10 января — снег и гирлянда ---------- */
  var mo = d.getMonth(), day = d.getDate();
  if ((mo === 11 && day >= 20 || mo === 0 && day <= 10) && !reduce) {
    document.documentElement.classList.add("egg-ny");
    var sn = el("div", "egg-snow");
    sn.setAttribute("aria-hidden", "true");
    for (var j = 0; j < 30; j++) {
      var f = el("i");
      f.style.left = (Math.random() * 100).toFixed(1) + "%";
      f.style.animationDuration = (7 + Math.random() * 8).toFixed(1) + "s";
      f.style.animationDelay = (-Math.random() * 12).toFixed(1) + "s";
      f.style.opacity = (0.35 + Math.random() * 0.5).toFixed(2);
      f.style.setProperty("--s", (0.5 + Math.random()).toFixed(2));
      sn.appendChild(f);
    }
    document.body.appendChild(sn);
    var yr = String(d.getFullYear() + (mo === 0 ? -1 : 0)), seen = "";
    try { seen = localStorage.getItem("mh2-egg-snow") || ""; } catch (e) {}
    if (seen !== yr) {
      try { localStorage.setItem("mh2-egg-snow", yr); } catch (e) {}
      setTimeout(function () { mark("snow"); }, 3000);
    }
  }

  /* для подсказки «?»: сколько найдено */
  window.mhEggs = function () { var f = found(); return { found: Object.keys(f).filter(function (k) { return EGGS[k]; }).length, total: TOTAL }; };
})();
