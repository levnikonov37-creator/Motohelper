/* MotoHelper — плавное появление блоков. Подключается после js/app.js.
   - блок появился на уже открытой странице (подвкладка, раскрытый раздел) — мягко выезжает;
   - блок ниже экрана — проявляется, когда до него докрутили (один раз).
   Анимируются только transform и opacity (их считает видеокарта, страница не перерисовывается).
   При системной настройке «уменьшить движение» ничего не делает. */
(function () {
  if (!window.IntersectionObserver || !window.MutationObserver || !window.requestAnimationFrame) return;
  var root = document.getElementById("root");
  if (!root) return;
  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  // Блоки верхнего уровня страницы; полоса подвкладок остаётся на месте
  var BLOCKS = "section.page > :not(.tabs):not(.garage-bar), .home-grid > *, .actions4 > *";
  var seen = typeof WeakSet === "function" ? new WeakSet() : null;
  var lastPage = null, queued = false;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("mh-in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -6% 0px" });

  function clearEnter(el) {
    el.addEventListener("animationend", function done() {
      el.classList.remove("mh-enter");
      el.style.animationDelay = "";
      el.removeEventListener("animationend", done);
    });
  }

  function scan() {
    queued = false;
    if (!seen || reduce.matches) return;
    var page = document.querySelector(".page-anim");
    var newPage = page !== lastPage; // вся страница сменилась — её анимирует .page-anim
    lastPage = page;
    var vh = window.innerHeight, n = 0;
    var list = document.querySelectorAll(BLOCKS);
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (seen.has(el)) continue;
      seen.add(el);
      var top = el.getBoundingClientRect().top;
      if (top > vh) {
        el.classList.add("mh-rv");
        io.observe(el);
      } else if (!newPage) {
        el.style.animationDelay = Math.min(n++, 5) * 45 + "ms";
        el.classList.add("mh-enter");
        clearEnter(el);
      }
    }
  }

  new MutationObserver(function () {
    if (!queued) {
      queued = true;
      requestAnimationFrame(scan);
    }
  }).observe(root, { childList: true, subtree: true });
})();
