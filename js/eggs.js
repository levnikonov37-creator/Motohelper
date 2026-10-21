/* MotoHelper — пасхалки. Подключается после js/app.js, в работу сайта не вмешивается:
   только слушает нажатия и ввод и ненадолго добавляет классы для анимаций.
   Найденные пасхалки запоминаются в localStorage (mh2-eggs), чтобы показать «найдено N из M». */
(function () {
  var EGGS = {
    wheelie: "Вилли! Пять раз нажал на логотип — мотоцикл встал на заднее колесо",
    vroom: "Врум-врум! Мотоцикл умчался и вернулся",
    redline: "Отсечка! Тахометр не железный — хватит крутить",
    night: "Ночной райдер. Фары включены, едь аккуратно",
    answer: "42 — ответ на главный вопрос. Но масло всё равно меняй вовремя",
    mechanic: "Лучший механик — ты. А ИИ-механик просто рядом",
    konami: "Режим гонщика! ↑↑↓↓←→←→BA",
    snow: "С Новым годом! Мотоцикл в гараже, а у нас снег"
  };
  var TOTAL = Object.keys(EGGS).length;

  function found() {
    try { return JSON.parse(localStorage.getItem("mh2-eggs") || "{}") || {}; } catch (e) { return {}; }
  }
  function mark(id) {
    var f = found();
    var isNew = !f[id];
    f[id] = 1;
    try { localStorage.setItem("mh2-eggs", JSON.stringify(f)); } catch (e) {}
    var n = Object.keys(f).filter(function (k) { return EGGS[k]; }).length;
    toast(EGGS[id], "Пасхалка " + n + " из " + TOTAL + (isNew ? " · новая!" : ""));
  }

  var toastEl = null, toastT = 0;
  function toast(text, sub) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "egg-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = "";
    var b = document.createElement("b"); b.textContent = text;
    var s = document.createElement("span"); s.textContent = sub;
    toastEl.appendChild(b); toastEl.appendChild(s);
    toastEl.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove("on"); }, 3600);
  }
  // класс на время анимации; повторный запуск перезапускает её
  function play(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }
  function bikeEl() { return document.querySelector(".hero-bike svg, .bike-svg, .model-photo"); }

  /* 1. Пять быстрых нажатий на логотип «МН» — вилли */
  var taps = [];
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest(".brand-mark")) {
      var now = Date.now();
      taps = taps.filter(function (x) { return now - x < 2500; });
      taps.push(now);
      if (taps.length >= 5) {
        taps = [];
        var b = bikeEl();
        if (!b) { var h = document.querySelector(".tabbar .tab"); if (h) h.click(); }
        setTimeout(function () { play(bikeEl(), "egg-wheelie", 1700); }, b ? 0 : 450);
        mark("wheelie");
      }
    }
    /* 3. Семь нажатий на тахометр — отсечка */
    if (t.closest(".tacho")) {
      var tc = t.closest(".tacho");
      tc._n = (tc._n || 0) + 1;
      clearTimeout(tc._t);
      tc._t = setTimeout(function () { tc._n = 0; }, 2000);
      if (tc._n >= 7) {
        tc._n = 0;
        play(document.body, "egg-shake", 700);
        play(tc, "egg-redline", 1200);
        mark("redline");
      }
    }
  }, true);

  /* 2, 5, 6. Слова в любом поле поиска */
  var said = {};
  document.addEventListener("input", function (e) {
    var el = e.target;
    if (!el || el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") return;
    var v = String(el.value || "").toLowerCase().replace(/ё/g, "е").trim();
    var hit = /^(врум+|бр+р+|вжух+|дррр+)\b/.test(v) ? "vroom" : v === "42" ? "answer" : /кто (тут )?лучший механик/.test(v) ? "mechanic" : null;
    if (!hit || said[hit] === v) return;
    said[hit] = v;
    if (hit === "vroom") play(bikeEl(), "egg-ride", 1900);
    mark(hit);
  }, true);

  /* 7. Код Konami на клавиатуре */
  var KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"], kp = 0;
  document.addEventListener("keydown", function (e) {
    var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === "и") k = "b"; else if (k === "ф") k = "a"; // русская раскладка
    kp = k === KONAMI[kp] ? kp + 1 : k === KONAMI[0] ? 1 : 0;
    if (kp === KONAMI.length) {
      kp = 0;
      var r = document.createElement("div");
      r.className = "egg-race";
      for (var i = 0; i < 6; i++) { var l = document.createElement("i"); l.style.top = (12 + i * 14) + "%"; l.style.animationDelay = (i * 0.07) + "s"; r.appendChild(l); }
      document.body.appendChild(r);
      setTimeout(function () { r.remove(); }, 1600);
      mark("konami");
    }
  });

  /* 4. Ночью (с 0 до 4 часов) — «ночной райдер», раз за ночь */
  var d = new Date();
  if (d.getHours() < 4) {
    var key = d.toDateString();
    var last = ""; try { last = localStorage.getItem("mh2-egg-night") || ""; } catch (e) {}
    if (last !== key) {
      try { localStorage.setItem("mh2-egg-night", key); } catch (e) {}
      setTimeout(function () { document.documentElement.classList.add("egg-night"); mark("night"); }, 2500);
    } else document.documentElement.classList.add("egg-night");
  }

  /* 8. С 20 декабря по 10 января — снег на главной */
  var m = d.getMonth(), day = d.getDate();
  if (m === 11 && day >= 20 || m === 0 && day <= 10) {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      var sn = document.createElement("div");
      sn.className = "egg-snow";
      sn.setAttribute("aria-hidden", "true");
      for (var j = 0; j < 28; j++) {
        var f = document.createElement("i");
        f.style.left = (Math.random() * 100).toFixed(1) + "%";
        f.style.animationDuration = (7 + Math.random() * 8).toFixed(1) + "s";
        f.style.animationDelay = (-Math.random() * 12).toFixed(1) + "s";
        f.style.opacity = (0.35 + Math.random() * 0.5).toFixed(2);
        f.style.transform = "scale(" + (0.5 + Math.random()).toFixed(2) + ")";
        sn.appendChild(f);
      }
      document.body.appendChild(sn);
      var seen = ""; try { seen = localStorage.getItem("mh2-egg-snow") || ""; } catch (e) {}
      if (seen !== String(d.getFullYear() + (m === 0 ? -1 : 0))) {
        try { localStorage.setItem("mh2-egg-snow", String(d.getFullYear() + (m === 0 ? -1 : 0))); } catch (e) {}
        setTimeout(function () { mark("snow"); }, 3000);
      }
    }
  }

  /* для страницы помощи: сколько найдено */
  window.mhEggs = function () { var f = found(); return { found: Object.keys(f).filter(function (k) { return EGGS[k]; }).length, total: TOTAL }; };
})();
