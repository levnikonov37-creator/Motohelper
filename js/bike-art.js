/* MotoHelper — рисунок мотоцикла, как студийное фото из каталога.
   Мотоцикл стоит правым боком, перед справа (как на фото у производителей): видно выхлоп, задний тормоз и крышку сцепления.
   Координаты в миллиметрах: x — вперёд от оси заднего колеса, y — вверх от земли (в SVG y = −y).
   Пластик рисуется без обводки: ровный цвет, наклейки (их обрезает край детали), свет сверху и тень снизу — как глянец на фото.
   Трубы, перья вилки и выхлоп — объёмным штрихом: тёмный край, светлее середина, блик сверху.
   bikeArt(o) → { svg: "<defs>…</defs><g>…</g>", vb: [x, y, w, h], pins: { engine: [X, Y], … }, smoke: [X, Y] }
   o: { uid, cls, eng: { stroke, cc, horiz, liquid, efi, layout, dark }, col: { body, accent, … }, brand, model, num, mods: [], o: { … } } */
(function () {
  "use strict";
  var DEG = Math.PI / 180;
  function r1(v) { return Math.round(v * 10) / 10; }
  function pt(p) { return r1(p[0]) + "," + r1(-p[1]); }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s]; }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function dir(deg) { return [Math.cos(deg * DEG), Math.sin(deg * DEG)]; }
  function polar(c, r, deg) { var d = dir(deg); return [c[0] + r * d[0], c[1] + r * d[1]]; }
  function len(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1]); }
  function norm(a) { var l = len(a) || 1; return [a[0] / l, a[1] / l]; }
  function perp(a) { return [-a[1], a[0]]; }
  function ang(a, b) { return Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG; }
  function cn(p) { return [p[0], p[1], 1]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  /* ломаная */
  function L(ps, close) { return "M" + ps.map(pt).join(" L") + (close ? " Z" : ""); }
  /* контур по точкам: [x, y] — плавно, [x, y, 1] — острый угол (у пластика бывают и плавные изгибы, и острые углы) */
  function P(ps, close, k) {
    k = k == null ? 1 : k;
    var n = ps.length, s = "M" + pt(ps[0]);
    function get(i) { return close ? ps[((i % n) + n) % n] : ps[Math.max(0, Math.min(n - 1, i))]; }
    function corner(i) { return !!get(i)[2] || (!close && (i <= 0 || i >= n - 1)); }
    function tOut(i) { return corner(i) ? sub(get(i + 1), get(i)) : mul(sub(get(i + 1), get(i - 1)), 0.5 * k); }
    function tIn(i) { return corner(i) ? sub(get(i), get(i - 1)) : mul(sub(get(i + 1), get(i - 1)), 0.5 * k); }
    var last = close ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var a = get(i), b = get(i + 1);
      s += " C" + pt(add(a, mul(tOut(i), 1 / 3))) + " " + pt(sub(b, mul(tIn(i + 1), 1 / 3))) + " " + pt(b);
    }
    return s + (close ? " Z" : "");
  }
  /* полоса переменной ширины вдоль линии (выхлоп 2T, крылья): w — число или массив по точкам */
  function band(ps, w) {
    var n = ps.length, left = [], right = [];
    for (var i = 0; i < n; i++) {
      var a = ps[Math.max(0, i - 1)], b = ps[Math.min(n - 1, i + 1)];
      var nn = perp(norm(sub(b, a))), hw = (Array.isArray(w) ? w[i] : w) / 2;
      left.push(add(ps[i], mul(nn, hw)));
      right.unshift(add(ps[i], mul(nn, -hw)));
    }
    left[0] = cn(left[0]); left[n - 1] = cn(left[n - 1]); right[0] = cn(right[0]); right[n - 1] = cn(right[n - 1]);
    return P(left.concat(right), true);
  }
  function circ(c, r, a) { return '<circle cx="' + r1(c[0]) + '" cy="' + r1(-c[1]) + '" r="' + r1(r) + '"' + (a ? " " + a : "") + "/>"; }
  function ell(c, rx, ry, rot, a) { return '<ellipse cx="' + r1(c[0]) + '" cy="' + r1(-c[1]) + '" rx="' + r1(rx) + '" ry="' + r1(ry) + '"' + (rot ? ' transform="rotate(' + r1(-rot) + " " + r1(c[0]) + " " + r1(-c[1]) + ')"' : "") + (a ? " " + a : "") + "/>"; }
  function path(d, a) { return '<path d="' + d + '"' + (a ? " " + a : "") + "/>"; }
  function ring(c, r0, r1_) {
    var x = r1(c[0]), y = r1(-c[1]);
    r0 = r1(r0); r1_ = r1(r1_);
    return "M" + (x - r1_) + "," + y + " a" + r1_ + "," + r1_ + " 0 1,0 " + 2 * r1_ + ",0 a" + r1_ + "," + r1_ + " 0 1,0 " + -2 * r1_ + ",0 Z " +
      "M" + (x - r0) + "," + y + " a" + r0 + "," + r0 + " 0 1,1 " + 2 * r0 + ",0 a" + r0 + "," + r0 + " 0 1,1 " + -2 * r0 + ",0 Z";
  }
  function arc(c, r, a0, a1) { var p0 = polar(c, r, a0), p1 = polar(c, r, a1); return "M" + pt(p0) + " A" + r1(r) + "," + r1(r) + " 0 " + (Math.abs(a1 - a0) > 180 ? 1 : 0) + "," + (a1 > a0 ? 0 : 1) + " " + pt(p1); }
  function hexRGB(h) { var n = parseInt(String(h || "#888888").slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  function shade(hex, k) {
    var c = hexRGB(hex);
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); };
    return "#" + c.map(function (v) { return f(v).toString(16).padStart(2, "0"); }).join("");
  }
  function lum(hex) { var c = hexRGB(hex); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  function stops(st) { return st.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : "") + "/>"; }).join(""); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- геометрия классов (мм) ----------
     wb — база; rf/rr — радиус колеса с шиной; rimF/rimR — радиус обода; rake — наклон вилки;
     fl — от оси до верхней траверсы; lc — от оси до нижней; pv — ось маятника;
     seat — [x зад, x перед, высота]; tail — кончик заднего крыла; k — масштаб пластика (питбайк меньше) */
  var GEO = {
    enduro: { wb: 1480, rf: 345, rr: 336, rimF: 267, rimR: 229, rake: 27, fl: 895, lc: 700, pv: [570, 452], seat: [150, 815, 952], tail: [-255, 975], tire: "knobby", body: "dirt", k: 1 },
    cross:  { wb: 1485, rf: 345, rr: 340, rimF: 267, rimR: 241, rake: 27, fl: 900, lc: 705, pv: [575, 458], seat: [170, 830, 965], tail: [-205, 990], tire: "knobby", body: "dirt", k: 1 },
    light:  { wb: 1420, rf: 335, rr: 322, rimF: 267, rimR: 229, rake: 27.5, fl: 840, lc: 655, pv: [545, 425], seat: [110, 790, 885], tail: [-270, 925], tire: "dual", body: "dirt", k: 0.95 },
    motard: { wb: 1465, rf: 300, rr: 306, rimF: 216, rimR: 216, rake: 26.5, fl: 880, lc: 690, pv: [565, 445], seat: [150, 815, 925], tail: [-240, 950], tire: "road", body: "dirt", k: 1 },
    pit:    { wb: 1180, rf: 288, rr: 270, rimF: 216, rimR: 178, rake: 26, fl: 705, lc: 545, pv: [445, 368], seat: [110, 640, 835], tail: [-160, 850], tire: "knobby", body: "dirt", k: 0.8 },
    kids:   { wb: 985, rf: 238, rr: 226, rimF: 178, rimR: 152, rake: 26, fl: 585, lc: 450, pv: [370, 302], seat: [100, 530, 695], tail: [-160, 705], tire: "knobby", body: "dirt", k: 0.66 },
    trial:  { wb: 1320, rf: 343, rr: 330, rimF: 267, rimR: 229, rake: 24, fl: 860, lc: 680, pv: [520, 430], seat: [360, 610, 690], tail: [-120, 760], tire: "trial", body: "trial", k: 1 },
    tour:   { wb: 1520, rf: 345, rr: 336, rimF: 267, rimR: 229, rake: 27, fl: 900, lc: 700, pv: [600, 455], seat: [80, 790, 870], tail: [-250, 930], tire: "dual", body: "adv", k: 1 },
    naked:  { wb: 1400, rf: 300, rr: 315, rimF: 216, rimR: 216, rake: 24.5, fl: 760, lc: 610, pv: [560, 440], seat: [110, 745, 810], tail: [-175, 905], tire: "road", body: "naked", k: 1 },
    sport:  { wb: 1380, rf: 300, rr: 315, rimF: 216, rimR: 216, rake: 24, fl: 740, lc: 600, pv: [560, 450], seat: [110, 725, 820], tail: [-185, 945], tire: "road", body: "sport", k: 1 },
    cruiser:{ wb: 1520, rf: 330, rr: 322, rimF: 241, rimR: 203, rake: 30, fl: 820, lc: 640, pv: [600, 360], seat: [300, 800, 700], tail: [-225, 640], tire: "road", body: "cruiser", k: 1 },
    classic:{ wb: 1390, rf: 322, rr: 326, rimF: 241, rimR: 229, rake: 27, fl: 760, lc: 610, pv: [520, 400], seat: [130, 760, 805], tail: [-210, 720], tire: "road", body: "classic", k: 1 },
    moped:  { wb: 1220, rf: 280, rr: 280, rimF: 216, rimR: 216, rake: 26, fl: 640, lc: 510, pv: [470, 330], seat: [60, 700, 770], tail: [-225, 720], tire: "road", body: "moped", k: 0.78 }
  };

  function bikeArt(o) {
    var U = o.uid || "ba";
    var res = draw(o);
    if (U !== "ba") res.svg = res.svg.replace(/ba-/g, U + "-");
    return res;
  }

  function draw(o) {
    var cls = GEO[o.cls] ? o.cls : "enduro";
    var g = Object.assign({}, GEO[cls], o.geo || {});
    var E = o.eng || {}, C = o.col || {}, X = o.o || {}, mods = o.mods || [];
    var two = E.stroke === "2T", liq = !!E.liquid, layout = E.layout || "single";
    var dirt = g.body === "dirt", k = g.k || 1;
    var horiz = !!E.horiz && ["pit", "kids", "moped", "light"].indexOf(cls) >= 0;
    var h = hash(String(o.brand || "") + " " + String(o.model || ""));
    /* ---------- цвета ---------- */
    var body = C.body || "#D7262E", acc = C.accent || "#F4F5F2";
    var acc2 = C.accent2 || (lum(acc) > 0.6 ? (lum(body) > 0.6 ? "#1B1F22" : shade(body, -0.45)) : "#F4F5F2");
    var fenderC = X.fenderCol || C.fender || body, sideC = C.side || fenderC, tankC = C.tank || "#D9D5CA";
    var fr = C.frame || "#23272C", subC = C.sub || (dirt ? "#8E959D" : fr), seatC = C.seat || "#17191C", seatBand = C.seatBand || shade(seatC, 0.18);
    var rimC = C.rim || (dirt || g.body === "trial" ? "#1E2227" : "#2A2E33"), hubC = C.hub || "#9AA2AA";
    var forkC = C.fork || (dirt ? "#C8962E" : "#C9CED4"), forkLow = C.forkLow || "#D3D8DD", clampC = C.clamp || "#2A2E33";
    var guardC = X.guard || C.guard || "#1E2125", handC = C.hand || (lum(body) > 0.6 ? body : "#F2F3F0"), springC = X.spring || C.spring || "#E8C21E";
    var engDark = !!E.dark;
    var light = lum(body) > 0.72;
    var defs = [], nid = 0, out = [];
    function push(s) { out.push(s); }
    function id(p) { return "ba-" + p + (nid++); }
    function lin(st, x1, y1, x2, y2, user) {
      var i = id("g");
      defs.push('<linearGradient id="' + i + '"' + (user ? ' gradientUnits="userSpaceOnUse"' : "") + ' x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + stops(st) + "</linearGradient>");
      return "url(#" + i + ")";
    }
    function rad(st, c, r) {
      var i = id("r");
      defs.push('<radialGradient id="' + i + '" gradientUnits="userSpaceOnUse" cx="' + r1(c[0]) + '" cy="' + r1(-c[1]) + '" r="' + r1(r) + '">' + stops(st) + "</radialGradient>");
      return "url(#" + i + ")";
    }
    /* свет студии: сверху блик-«горизонт», к низу тень — общий для всего пластика */
    defs.push('<linearGradient id="ba-lit" x1="0" y1="0" x2=".22" y2="1">' + stops([[0, "#fff", 0.24], [0.1, "#fff", 0.4], [0.2, "#fff", 0.08], [0.42, "#fff", 0], [0.6, "#000", 0], [0.84, "#000", 0.17], [1, "#000", 0.36]]) + "</linearGradient>");
    defs.push('<linearGradient id="ba-litm" x1="0" y1="0" x2=".1" y2="1">' + stops([[0, "#fff", 0.12], [0.3, "#fff", 0], [0.7, "#000", 0], [1, "#000", 0.35]]) + "</linearGradient>");
    /* мягкая тень детали на то, что под ней */
    defs.push('<filter id="ba-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>');
    function soft(d, op, eo) { return path(d, 'fill="#000" opacity="' + op + '" filter="url(#ba-soft)" transform="translate(5,9)"' + (eo || "")); }
    defs.push('<radialGradient id="ba-gsh">' + stops([[0, "#000", 0.6], [0.55, "#000", 0.28], [1, "#000", 0]]) + "</radialGradient>");
    var glass = lin([[0, "#E8F1F8"], [0.35, "#9FB7CA"], [0.7, "#5B7286"], [1, "#2E3B47"]], 0, 0, 0.3, 1);
    var lampG = lin([[0, "#FFFFFF"], [0.4, "#E4ECF2"], [1, "#8C9AA6"]], 0, 0, 0.6, 1);

    /* деталь из пластика: цвет, наклейки внутри, свет, кромки; shadow — мягкая тень на то, что под ней */
    function panel(d, fill, deco, opt) {
      opt = opt || {};
      if (typeof d !== "string") d = P(d, true, opt.k);
      var ci = id("c"), eo = opt.evenodd ? ' fill-rule="evenodd"' : "";
      defs.push('<clipPath id="' + ci + '"><path d="' + d + '"' + (opt.evenodd ? ' clip-rule="evenodd"' : "") + "/></clipPath>");
      var s = "";
      if (opt.shadow !== false) s += soft(d, opt.shadowOp || 0.42, eo);
      s += path(d, 'fill="' + fill + '"' + eo);
      s += '<g clip-path="url(#' + ci + ')">' + (deco || "") + path(d, 'fill="url(#ba-lit' + (opt.matte ? "m" : "") + ')"' + eo) +
        path(d, 'fill="none" stroke="#fff" stroke-opacity="' + (opt.rim == null ? 0.45 : opt.rim) + '" stroke-width="7" transform="translate(0,5)"') +
        path(d, 'fill="none" stroke="#000" stroke-opacity=".32" stroke-width="12" transform="translate(0,-8)"') +
        path(d, 'fill="none" stroke="#000" stroke-opacity=".2" stroke-width="6"') + "</g>";
      return s;
    }
    /* труба объёмным штрихом по средней линии: свет сверху-слева */
    function tube(ps, w, col, opt) {
      opt = opt || {};
      var d = typeof ps === "string" ? ps : P(ps, false, opt.k);
      var cap = opt.cap || "round";
      var s = path(d, 'fill="none" stroke="' + shade(col, -0.6) + '" stroke-width="' + r1(w) + '" stroke-linecap="' + cap + '" stroke-linejoin="round"');
      s += path(d, 'fill="none" stroke="' + col + '" stroke-width="' + r1(w * 0.7) + '" stroke-linecap="' + cap + '" stroke-linejoin="round" transform="translate(' + r1(-w * 0.04) + "," + r1(-w * 0.09) + ')"');
      s += path(d, 'fill="none" stroke="' + shade(col, opt.hi == null ? 0.6 : opt.hi) + '" stroke-opacity=".85" stroke-width="' + r1(w * 0.2) + '" stroke-linecap="' + cap + '" stroke-linejoin="round" transform="translate(' + r1(-w * 0.1) + "," + r1(-w * 0.21) + ')"');
      return s;
    }
    /* прямой цилиндр (перо вилки, амортизатор): точный свет поперёк оси */
    function rod(p0, p1, w, col, opt) {
      opt = opt || {};
      var ax = norm(sub(p1, p0)), nn = perp(ax), m = lerp(p0, p1, 0.5);
      if (nn[0] > 0) nn = mul(nn, -1);
      var a = add(m, mul(nn, w / 2)), b = add(m, mul(nn, -w / 2));
      var hi = opt.hi == null ? 0.7 : opt.hi;
      var fill = lin([[0, shade(col, -0.35)], [0.16, shade(col, hi)], [0.3, shade(col, 0.15)], [0.62, col], [0.88, shade(col, -0.45)], [1, shade(col, -0.6)]], r1(a[0]), r1(-a[1]), r1(b[0]), r1(-b[1]), true);
      var q0 = add(p0, mul(nn, w / 2)), q1 = add(p1, mul(nn, w / 2)), q2 = add(p1, mul(nn, -w / 2)), q3 = add(p0, mul(nn, -w / 2));
      return path(L([q0, q1, q2, q3], true), 'fill="' + fill + '"');
    }
    /* литой или фрезерованный металл: градиент по диагонали */
    function metal(col, dk) {
      return lin([[0, shade(col, 0.45)], [0.35, col], [0.7, shade(col, -(dk || 0.35))], [1, shade(col, -0.15)]], 0, 0, 0.7, 1);
    }
    function bolt(c, r) { return circ(c, r, 'fill="#6F777F"') + circ(add(c, [-r * 0.18, r * 0.18]), r * 0.55, 'fill="#AEB5BC"'); }
    function logo(text, c, size, rot, fill, strokeCol, opt) {
      if (!text) return "";
      opt = opt || {};
      return '<text x="' + r1(c[0]) + '" y="' + r1(-c[1]) + '"' + (rot ? ' transform="rotate(' + r1(-rot) + " " + r1(c[0]) + " " + r1(-c[1]) + ')"' : "") +
        ' text-anchor="middle" dominant-baseline="central" font-family="' + (opt.font || "Russo One, Arial Black, sans-serif") + '" font-size="' + r1(size) + '"' + (opt.italic === false ? "" : ' font-style="italic"') +
        (opt.ls ? ' letter-spacing="' + opt.ls + '"' : "") + ' fill="' + fill + '"' + (strokeCol ? ' stroke="' + strokeCol + '" stroke-width="' + r1(size * 0.07) + '" paint-order="stroke" stroke-linejoin="round"' : "") + ">" + esc(text) + "</text>";
    }
    function fitSize(text, width, maxH) { return Math.min(maxH, width / Math.max(2.4, String(text).length * 0.66)); }

    /* ---------- опорные точки ---------- */
    var R = [0, g.rr], F = [g.wb, g.rf];
    var d = dir(90 + g.rake);                      /* вдоль вилки вверх */
    var q = [d[1], -d[0]];                          /* поперёк вилки, вперёд */
    function at(t, s) { return add(add(F, mul(d, t)), mul(q, s || 0)); }
    var UC = at(g.fl), LC = at(g.lc);
    var HT = at(g.fl - 12, -32), HB = at(g.lc + 6, -32);      /* рулевая колонка */
    var PV = g.pv, seat = g.seat, T = g.tail;
    var SR = [seat[0], seat[2]], SF = [seat[1], seat[2]];

    /* ---------- двигатель: размеры ---------- */
    var cc = E.cc || 250, big = clamp(Math.pow(cc / 250, 0.22), 0.8, 1.45);
    var sc = cls === "pit" ? 0.84 : cls === "kids" ? 0.66 : cls === "moped" ? 0.74 : 1;
    var EK = sc * big;
    var eb = Math.max(g.rr * 0.95, PV[1] - 98 * sc);
    var ex0 = PV[0] + 28 * sc, ex1 = Math.min(g.wb - g.rf - 20, ex0 + (two ? 370 : 410) * EK);
    var eTop = eb + (two ? 225 : 245) * EK;
    var EW = ex1 - ex0, EH = eTop - eb;
    var engine = { port: null, center: [(ex0 + ex1) / 2, (eb + eTop) / 2], head: null, tip: null };
    var engC = engDark ? "#33373D" : "#BFC5CB", coverC = engDark ? "#24282D" : "#D5DADF", finC = engDark ? "#4A5057" : "#D9DEE3";

    /* ---------- колёса ---------- */
    function wheel(c, Rt, rim, front) {
      var s = "", tire = g.tire, spoked = !X.cast, kz = Rt / 345;
      var knob = tire === "knobby" || tire === "trial", carc = Rt - (knob ? 17 * kz : tire === "dual" ? 9 * kz : 2);
      /* шина: боковина с мягким бликом */
      s += path(ring(c, rim + 2, carc), 'fill="' + rad([[0, "#0B0C0D"], [rim / Rt, "#121314"], [(rim / Rt + carc / Rt) / 2, "#24262A"], [carc / Rt, "#151618"], [1, "#0F1011"]], c, Rt) + '" fill-rule="evenodd"');
      s += path(arc(c, (rim + carc) / 2, 100, 170), 'fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="' + r1((carc - rim) * 0.5) + '" stroke-linecap="round"');
      s += path(arc(c, (rim + carc) / 2, 270, 330), 'fill="none" stroke="#000" stroke-opacity=".35" stroke-width="' + r1((carc - rim) * 0.6) + '" stroke-linecap="round"');
      if (knob || tire === "dual") {
        var N = Math.round(2 * Math.PI * Rt / (tire === "dual" ? 34 : 44) / (tire === "trial" ? 0.8 : 1)), pitch = 360 / N;
        var outer = "", hiK = "", sh = "";
        for (var i = 0; i < N; i++) {
          var a = i * pitch + (front ? 3 : 0);
          var h0 = tire === "dual" ? 9 * kz : 17 * kz, wo = pitch * (tire === "dual" ? 0.5 : 0.55), wi = pitch * 0.66;
          var p = [polar(c, carc - 1, a - wi / 2), polar(c, Rt, a - wo / 2), polar(c, Rt, a + wo / 2), polar(c, carc - 1, a + wi / 2)];
          outer += L(p, true) + " ";
          if (a % 360 > 70 && a % 360 < 200) hiK += "M" + pt(polar(c, Rt - 1.5, a - wo / 2)) + " L" + pt(polar(c, Rt - 1.5, a + wo / 2)) + " ";
          if (knob) {
            var b0 = a + pitch / 2, ws = pitch * 0.4;
            sh += L([polar(c, carc - 15 * kz, b0 - ws / 2), polar(c, carc - 2, b0 - ws / 2 - 0.4), polar(c, carc - 2, b0 + ws / 2 + 0.4), polar(c, carc - 15 * kz, b0 + ws / 2)], true) + " ";
          }
        }
        s += path(ring(c, carc - 3, carc + 2), 'fill="#101112" fill-rule="evenodd"');
        s += path(outer, 'fill="#1C1D20"');
        if (sh) s += path(sh, 'fill="#1F2124"');
        s += path(hiK, 'stroke="#55595F" stroke-width="3" stroke-opacity=".8"');
      } else {
        s += path(ring(c, Rt - 9, Rt), 'fill="#141517" fill-rule="evenodd"');
        s += path(arc(c, Rt - 4, 95, 165), 'fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="5" stroke-linecap="round"');
      }
      /* надпись на боковине */
      var tp = id("t"), tr = (rim + carc) / 2 - 6 * kz;
      defs.push('<path id="' + tp + '" d="' + arc(c, tr, 160, 20) + '"/>');
      s += '<text font-family="Fira Sans Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="' + r1(19 * kz) + '" letter-spacing="' + r1(5 * kz) + '" fill="#3A3D42"><textPath href="#' + tp + '" startOffset="50%" text-anchor="middle">' + (front ? (tire === "road" ? "120/70 ZR17 · RADIAL" : "80/100-21 · ENDURO") : (tire === "road" ? "160/60 ZR17 · RADIAL" : "140/80-18 · ENDURO")) + "</textPath></text>";
      /* дальние спицы и дальний тормозной диск видны сквозь колесо */
      var hubR = (front ? 46 : 56) * kz, nS = 36;
      function spokes(far) {
        var s2 = "", tw = 27;
        for (var j = 0; j < nS / 2; j++) {
          var a2 = j * 720 / nS + (far ? 360 / nS : 0), sg = j % 2 ? 1 : -1;
          s2 += "M" + pt(polar(c, hubR * 0.86, a2 + sg * tw)) + " L" + pt(polar(c, rim - 18 * kz, a2)) + " ";
        }
        return s2;
      }
      if (spoked) s += path(spokes(true), 'stroke="#596068" stroke-width="' + r1(2.8 * kz + 0.4) + '"');
      if (front && (dirt || g.body === "trial" || g.body === "adv") && !X.frontDisc) {
        var fd = Math.min(rim - 40 * kz, 132 * kz);
        s += path(ring(c, fd - 24 * kz, fd), 'fill="#59606A" fill-opacity=".9" fill-rule="evenodd"');
      }
      if (!spoked) {
        /* литой диск: пять сдвоенных спиц */
        var cs = "";
        for (var w2 = 0; w2 < 5; w2++) {
          var a3 = 90 + w2 * 72;
          [-1, 1].forEach(function (sg) {
            cs += P([cn(polar(c, 64 * kz, a3 + sg * 5)), polar(c, (rim * 0.55), a3 + sg * 9), cn(polar(c, rim - 14, a3 + sg * 13)), cn(polar(c, rim - 14, a3 + sg * 24)), polar(c, rim * 0.5, a3 + sg * 15), cn(polar(c, 64 * kz, a3 + sg * 15))], true, 0.8) + " ";
          });
        }
        s += path(cs, 'fill="' + metal(rimC, 0.45) + '"');
        s += path(cs, 'fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="3" transform="translate(-2,-2)"');
      }
      /* обод: анодированный алюминий */
      var rimW = (dirt || g.body === "trial" || g.body === "adv" ? 26 : 20) * kz;
      s += path(ring(c, rim - rimW, rim + 2), 'fill="' + lin([[0, shade(rimC, 0.55)], [0.3, rimC], [0.55, shade(rimC, -0.35)], [0.8, rimC], [1, shade(rimC, 0.3)]], r1(c[0] - rim), r1(-c[1] - rim), r1(c[0] + rim), r1(-c[1] + rim), true) + '" fill-rule="evenodd"');
      s += path(ring(c, rim - rimW, rim - rimW + 5 * kz), 'fill="#000" fill-opacity=".35" fill-rule="evenodd"');
      s += path(arc(c, rim - rimW * 0.45, 110, 160), 'fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="' + r1(4 * kz + 1) + '" stroke-linecap="round"');
      if (spoked) {
        var near = spokes(false);
        s += path(near, 'stroke="#2C3036" stroke-width="' + r1(4.6 * kz + 0.6) + '"');
        s += path(near, 'stroke="#CDD2D8" stroke-width="' + r1(3.2 * kz + 0.4) + '"');
        var nip = "";
        for (var j2 = 0; j2 < nS / 2; j2++) nip += circ(polar(c, rim - 19 * kz, j2 * 720 / nS), 3.6 * kz + 0.6, "");
        s += '<g fill="#E1E5E9">' + nip + "</g>";
      }
      /* ступица */
      s += circ(c, hubR, 'fill="' + metal(hubC, 0.4) + '"');
      s += circ(c, hubR * 0.7, 'fill="' + shade(hubC, -0.2) + '"');
      s += circ(c, hubR * 0.64, 'fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3"');
      /* задний тормозной диск — с правой стороны, его видно целиком */
      if (!front) {
        var dr = Math.min(rim - 32 * kz, (g.body === "dirt" || g.body === "trial" ? 112 : 125) * kz), N2 = 15, pet = "";
        for (var w3 = 0; w3 < N2; w3++) {
          var a4 = w3 * 360 / N2;
          pet += (w3 ? " L" : "M") + pt(polar(c, dr, a4)) + " Q" + pt(polar(c, dr - 2, a4 + 360 / N2 * 0.5)) + " " + pt(polar(c, dr - 9 * kz, a4 + 360 / N2 * 0.7));
        }
        s += path(pet + " Z", 'fill="' + metal("#AEB5BC", 0.4) + '"');
        var holes = "";
        for (var w4 = 0; w4 < 24; w4++) holes += circ(polar(c, dr - (w4 % 2 ? 12 : 21) * kz, w4 * 15 + 4), 3.6 * kz, "");
        s += '<g fill="#2A2E33">' + holes + "</g>";
        s += circ(c, dr - 30 * kz, 'fill="' + metal(shade(hubC, -0.15), 0.45) + '"');
        for (var w5 = 0; w5 < 6; w5++) s += bolt(polar(c, dr - 42 * kz, w5 * 60 + 20), 5.5 * kz);
        /* суппорт снизу спереди, шланг вдоль маятника */
        var ca = -70, cp = polar(c, dr - 6 * kz, ca);
        s += tube([polar(c, 20, ca + 40), lerp(polar(c, 20, ca + 40), cp, 0.5), cp], 26 * kz, "#2B2F35", { hi: 0.25 });
        s += path(P([cn(polar(cp, 42 * kz, ca - 75)), polar(cp, 40 * kz, ca), cn(polar(cp, 40 * kz, ca + 80)), cn(polar(cp, 30 * kz, ca + 140)), cn(polar(cp, 32 * kz, ca - 140))], true), 'fill="' + metal(X.caliper || C.caliper || "#5B626A", 0.5) + '"');
        s += bolt(polar(cp, 14 * kz, ca + 20), 5 * kz);
        engine.caliper = cp;
      } else if (X.frontDisc) {
        var fd2 = rim - 40 * kz;
        s += path(ring(c, fd2 - 30 * kz, fd2), 'fill="' + metal("#B4BBC2", 0.4) + '" fill-rule="evenodd"');
        var h2 = "";
        for (var w6 = 0; w6 < 30; w6++) h2 += circ(polar(c, fd2 - (w6 % 2 ? 9 : 20) * kz, w6 * 12), 3.4 * kz, "");
        s += '<g fill="#2A2E33">' + h2 + "</g>";
        for (var w7 = 0; w7 < 8; w7++) s += bolt(polar(c, fd2 - 40 * kz, w7 * 45), 5 * kz);
        var fc = polar(c, fd2 - 14 * kz, 128);
        s += path(P([cn(polar(fc, 52, 30)), polar(fc, 50, 110), cn(polar(fc, 48, 200)), cn(polar(fc, 44, 290))], true), 'fill="' + metal(X.caliper || "#C8962E", 0.5) + '"');
      }
      s += circ(c, 19 * kz, 'fill="#1E2125"') + circ(c, 12 * kz, 'fill="' + metal("#AEB5BC") + '"');
      return s;
    }

    /* ---------- задняя подвеска и маятник ---------- */
    var twin = g.body === "classic" || g.body === "moped" || g.body === "cruiser" || X.twinShock;
    function coil(p0, p1, rr, n, col, t0, t1) {
      var ax = norm(sub(p1, p0)), nn = perp(ax), s = "", back = "";
      for (var i = 0; i < n; i++) {
        var c0 = lerp(p0, p1, t0 + (t1 - t0) * i / n), c2 = lerp(p0, p1, t0 + (t1 - t0) * (i + 1) / n), cm = lerp(c0, c2, 0.5);
        back += "M" + pt(add(c0, mul(nn, rr))) + " L" + pt(add(cm, mul(nn, -rr))) + " ";
        s += "M" + pt(add(cm, mul(nn, -rr))) + " Q" + pt(add(lerp(cm, c2, 0.5), mul(ax, 3))) + " " + pt(add(c2, mul(nn, rr))) + " ";
      }
      return path(back, 'stroke="' + shade(col, -0.55) + '" stroke-width="' + r1(rr * 0.36) + '" stroke-linecap="round"') +
        path(s, 'fill="none" stroke="' + shade(col, -0.35) + '" stroke-width="' + r1(rr * 0.46) + '" stroke-linecap="round"') +
        path(s, 'fill="none" stroke="' + col + '" stroke-width="' + r1(rr * 0.32) + '" stroke-linecap="round" transform="translate(-1,-2)"') +
        path(s, 'fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="' + r1(rr * 0.1) + '" stroke-linecap="round" transform="translate(-2,-4)"');
    }
    function monoShock() {
      var bot = [PV[0] - 52 * k, PV[1] - 30 * k], top = [PV[0] + 22 * k, SR[1] - 122 * k];
      if (!dirt) { bot = add(PV, [-150 * sc, 24 * sc]); top = add(PV, [60 * sc, seat[2] - PV[1] - 160 * sc]); }
      var s = "";
      s += rod(lerp(bot, top, 0.62), top, 54 * k, "#2E3238", { hi: 0.4 });
      s += rod(bot, lerp(bot, top, 0.3), 26 * k, "#DCE0E4");
      s += rod(lerp(bot, top, 0.08), lerp(bot, top, 0.16), 44 * k, "#2E3238");
      s += coil(bot, top, 30 * k, 9, springC, 0.16, 0.66);
      s += rod(lerp(bot, top, 0.64), lerp(bot, top, 0.72), 60 * k, shade(springC, -0.1), { hi: 0.5 });
      /* бачок амортизатора */
      if (dirt && cls !== "kids") s += rod(add(lerp(bot, top, 0.7), [-36 * k, -8 * k]), add(top, [-46 * k, -30 * k]), 40 * k, "#3A3F45", { hi: 0.45 });
      s += circ(top, 13 * k, 'fill="#1E2125"') + circ(bot, 13 * k, 'fill="#1E2125"') + bolt(bot, 6 * k);
      return { s: s, mid: lerp(bot, top, 0.4) };
    }
    function twinShock() {
      var bot = add(R, [36, 40]), top = [R[0] + 70, seat[2] - 80];
      var s = rod(bot, top, 22, "#2B2F34");
      s += coil(bot, top, 25, 8, X.spring || "#C9CFD5", 0.2, 0.78);
      s += rod(lerp(bot, top, 0.78), top, 40, X.spring ? "#2B2F34" : "#C9CFD5");
      s += circ(top, 12, 'fill="#1E2125"') + circ(bot, 12, 'fill="#1E2125"');
      return { s: s, mid: lerp(bot, top, 0.5) };
    }
    function swingarm() {
      var s = "", alu = X.swingAlu !== false && !twin;
      var col = alu ? (C.swing || "#B9C0C7") : "#2A2E33";
      var pts = dirt ? [cn([PV[0] + 30 * k, PV[1] + 50 * k]), [PV[0] - 120 * k, PV[1] + 42 * k], [R[0] + 130 * k, R[1] + 36 * k], cn([R[0] - 32 * k, R[1] + 34 * k]), cn([R[0] - 46 * k, R[1] + 4 * k]), cn([R[0] - 32 * k, R[1] - 28 * k]), [R[0] + 150 * k, R[1] - 30 * k], [PV[0] - 175 * k, PV[1] - 40 * k], cn([PV[0] + 22 * k, PV[1] - 54 * k])]
        : [cn([PV[0] + 26, PV[1] + 38]), [PV[0] - 140, PV[1] + 30], cn([R[0] - 30, R[1] + 28]), cn([R[0] - 44, R[1] + 2]), cn([R[0] - 30, R[1] - 24]), [PV[0] - 160, PV[1] - 32], cn([PV[0] + 20, PV[1] - 40])];
      var dsw = P(pts, true, 0.9);
      s += soft(dsw, 0.35);
      s += path(dsw, 'fill="' + lin([[0, shade(col, 0.55)], [0.2, shade(col, 0.25)], [0.5, col], [0.8, shade(col, -0.4)], [1, shade(col, -0.6)]], 0, 0, 0.05, 1) + '"');
      /* углубление-«окно» в литом маятнике и блик по верхней кромке */
      if (alu && dirt) s += path(P([lerp(pts[1], pts[7], 0.3), lerp(pts[2], pts[6], 0.3), lerp(pts[2], pts[6], 0.62), lerp(pts[1], pts[7], 0.66)], true, 0.6), 'fill="#000" opacity=".16"');
      s += path(P([lerp(pts[0], pts[1], 0.1), pts[1], lerp(pts[1], pts[2], 0.6)], false), 'fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round" transform="translate(0,4)"');
      /* натяжитель цепи и ось */
      s += path(L([add(R, [-22 * k, -16 * k]), add(R, [58 * k, -16 * k]), add(R, [58 * k, 16 * k]), add(R, [-22 * k, 16 * k])], true), 'fill="' + metal("#3A3F45") + '"');
      s += bolt(add(R, [42 * k, 0]), 6 * k);
      s += circ(PV, 22 * k, 'fill="#1E2125"') + circ(PV, 14 * k, 'fill="' + metal("#AEB5BC") + '"');
      /* прогрессия под маятником */
      if (dirt && cls !== "kids") s += path(P([cn(add(PV, [-150 * k, -48 * k])), add(PV, [-90 * k, -92 * k]), cn(add(PV, [-30 * k, -78 * k])), cn(add(PV, [-20 * k, -52 * k]))], true), 'fill="' + metal("#3B4046") + '"');
      return s;
    }

    /* ---------- двигатель ---------- */
    function fins(c, ax, w, hgt, n) {
      var s = "", nn = perp(ax);
      for (var i = 0; i < n; i++) {
        var p = add(c, mul(ax, -hgt / 2 + hgt * (i + 0.5) / n));
        var a = add(p, mul(nn, -w / 2)), b = add(p, mul(nn, w / 2));
        s += path(L([a, b]), 'stroke="' + shade(finC, -0.5) + '" stroke-width="' + r1(hgt / n * 0.62) + '" stroke-linecap="round"');
        s += path(L([a, b]), 'stroke="' + finC + '" stroke-width="' + r1(hgt / n * 0.3) + '" stroke-linecap="round" transform="translate(0,' + r1(-hgt / n * 0.14) + ')"');
      }
      return s;
    }
    function cylinder(base, a, w, hh, opt) {
      var ax = dir(a), nn = [ax[1], -ax[0]], s = "";
      if (nn[0] < 0) nn = mul(nn, -1);
      var b0 = add(base, mul(nn, -w / 2)), b1 = add(base, mul(nn, w / 2)), t1 = add(b1, mul(ax, hh)), t0 = add(b0, mul(ax, hh));
      s += path(L([b0, b1, t1, t0], true), 'fill="' + lin([[0, shade(engC, 0.35)], [0.5, engC], [1, shade(engC, -0.45)]], 0, 0, 1, 0.2) + '"');
      if (!opt.liq) s += fins(lerp(base, add(base, mul(ax, hh)), 0.5), ax, w + 44 * EK, hh * 0.9, Math.max(4, Math.round(hh / 20)));
      else {
        s += path(L([lerp(b0, t0, 0.2), lerp(b1, t1, 0.2)]), 'stroke="#fff" stroke-opacity=".2" stroke-width="4"');
        s += path(L([lerp(b0, t0, 0.55), lerp(b1, t1, 0.55)]), 'stroke="#000" stroke-opacity=".25" stroke-width="5"');
      }
      /* головка и крышка клапанов */
      var hb = add(base, mul(ax, hh)), hw = w + (two ? 16 : 30) * EK, hH = hh * (two ? 0.3 : 0.5);
      var h0 = add(hb, mul(nn, -hw / 2)), h1 = add(hb, mul(nn, hw / 2)), h2 = add(h1, mul(ax, hH)), h3 = add(h0, mul(ax, hH));
      s += path(P([cn(h0), cn(h1), add(h1, mul(ax, hH * 0.6)), add(lerp(h2, h3, 0.18), mul(ax, 4)), add(lerp(h2, h3, 0.82), mul(ax, 4)), add(h0, mul(ax, hH * 0.6))], true, 0.6), 'fill="' + lin([[0, shade(engC, 0.4)], [0.5, engC], [1, shade(engC, -0.4)]], 0, 0, 1, 0.3) + '"');
      if (!opt.liq) s += fins(add(hb, mul(ax, hH * 0.38)), ax, hw + 18 * EK, hH * 0.6, 3);
      var vc = add(hb, mul(ax, hH * 0.86));
      if (!two) {
        s += path(P([cn(add(vc, mul(nn, -hw * 0.46))), add(add(vc, mul(nn, -hw * 0.34)), mul(ax, 30 * EK)), add(add(vc, mul(nn, hw * 0.3)), mul(ax, 32 * EK)), cn(add(vc, mul(nn, hw * 0.44)))], true, 0.9), 'fill="' + metal(opt.vc || (engDark ? "#1C1F23" : "#2B2F34"), 0.5) + '"');
        s += path(L([add(add(vc, mul(nn, -hw * 0.3)), mul(ax, 26 * EK)), add(add(vc, mul(nn, hw * 0.26)), mul(ax, 28 * EK))]), 'stroke="#fff" stroke-opacity=".35" stroke-width="3"');
        for (var b = 0; b < 3; b++) s += bolt(add(add(vc, mul(nn, -hw * 0.3 + hw * 0.28 * b)), mul(ax, 6)), 4.5 * EK);
      } else {
        /* 2T: свеча по центру головки и крышка клапана выпуска сбоку цилиндра */
        s += circ(add(hb, mul(ax, hH + 10 * EK)), 11 * EK, 'fill="#111"');
        s += path(L([add(add(base, mul(ax, hh * 0.32)), mul(nn, w * 0.05)), add(add(base, mul(ax, hh * 0.32)), mul(nn, w * 0.42)), add(add(base, mul(ax, hh * 0.62)), mul(nn, w * 0.42)), add(add(base, mul(ax, hh * 0.62)), mul(nn, w * 0.05))], true), 'fill="' + metal(engDark ? "#2A2E33" : "#9AA2AA") + '"');
        s += bolt(add(add(base, mul(ax, hh * 0.47)), mul(nn, w * 0.24)), 5 * EK);
      }
      var port = two ? add(add(base, mul(ax, hh * 0.3)), mul(nn, w / 2)) : add(add(hb, mul(ax, hH * 0.32)), mul(nn, hw / 2));
      var intake = two ? add(add(base, mul(ax, hh * 0.2)), mul(nn, -w / 2)) : add(add(hb, mul(ax, hH * 0.42)), mul(nn, -hw / 2));
      return { s: s, top: add(hb, mul(ax, hH)), port: port, intake: intake, ax: ax, nn: nn, hb: hb };
    }
    function drawEngine() {
      var s = "", w = EW, hgt = EH;
      /* картер с правой крышкой */
      var ck = P([cn([ex0 + 0.08 * w, eb]), cn([ex1 - 0.13 * w, eb + 0.01 * hgt]), [ex1 - 0.01 * w, eb + 0.22 * hgt], [ex1 - 0.02 * w, eb + 0.6 * hgt], [ex1 - 0.15 * w, eb + 0.94 * hgt], cn([ex0 + 0.6 * w, eTop]), cn([ex0 + 0.26 * w, eTop - 0.03 * hgt]), [ex0 + 0.05 * w, eb + 0.8 * hgt], [ex0 - 0.01 * w, eb + 0.44 * hgt]], true);
      s += path(ck, 'fill="' + lin([[0, shade(engC, 0.3)], [0.5, engC], [1, shade(engC, -0.5)]], 0, 0, 0.2, 1) + '"');
      s += path(ck, 'fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="5" transform="translate(0,4)"');
      /* крышка сцепления */
      var cc0 = [ex0 + 0.42 * w, eb + 0.5 * hgt], cr = Math.min(0.3 * w, 0.42 * hgt);
      var cl = P([polar(cc0, cr * 1.08, 0), polar(cc0, cr, 60), polar(cc0, cr * 0.96, 120), polar(cc0, cr * 1.04, 180), polar(cc0, cr * 0.92, 240), polar(cc0, cr * 0.98, 300)], true);
      s += soft(cl, 0.3);
      s += path(cl, 'fill="' + metal(coverC, 0.4) + '"');
      s += circ(add(cc0, [cr * 0.08, cr * 0.05]), cr * 0.55, 'fill="' + metal(shade(coverC, engDark ? 0.12 : -0.08), 0.5) + '"');
      s += circ(add(cc0, [cr * 0.08, cr * 0.05]), cr * 0.55, 'fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" transform="translate(-1,-2)"');
      for (var i = 0; i < 9; i++) s += bolt(polar(cc0, cr * 0.84, i * 40 + 12), 4.6 * EK + 1);
      if (!two) s += circ([ex1 - 0.27 * w, eb + 0.24 * hgt], 0.075 * w, 'fill="' + metal(coverC, 0.5) + '"') + bolt([ex1 - 0.27 * w, eb + 0.24 * hgt], 4 * EK + 1);
      if (liq) {
        var wp = [ex1 - 0.13 * w, eb + 0.45 * hgt];
        s += circ(wp, 0.085 * w, 'fill="' + metal(coverC, 0.5) + '"');
        s += circ(wp, 0.05 * w, 'fill="none" stroke="#000" stroke-opacity=".3" stroke-width="3"');
        engine.pump = wp;
      }
      s += circ([ex0 + 0.62 * w, eb + 0.05 * hgt], 7 * EK, 'fill="#C8962E"');
      /* цилиндр */
      var cy;
      if (horiz) cy = cylinder([ex1 - 0.12 * w, eTop - 0.32 * hgt], 8, 112 * EK, 150 * EK, { liq: liq });
      else if (layout === "vtwin") {
        var c1 = cylinder([ex0 + w * 0.62, eTop - 40], 90 - 26, 112 * EK, 145 * EK, { liq: liq });
        var c2 = cylinder([ex0 + w * 0.38, eTop - 40], 90 + 24, 112 * EK, 145 * EK, { liq: liq });
        s += c2.s; cy = c1;
      } else if (layout === "boxer") cy = cylinder([ex1 - 40 * EK, eb + 150 * EK], 10, 120 * EK, 120 * EK, { liq: false });
      else {
        var tilt = layout === "i4" ? 90 - 32 : layout === "twin" || layout === "i3" ? 90 - 22 : two ? 90 - 12 : 90 - 12;
        var cw = (layout === "i4" ? 170 : layout === "twin" || layout === "i3" ? 150 : two ? 120 : 125) * EK;
        cy = cylinder([ex0 + w * (two ? 0.62 : 0.66), eTop - 0.08 * hgt], tilt, cw, (two ? 150 : liq ? 150 : 165) * EK, { liq: liq });
      }
      s += cy.s;
      engine.port = cy.port; engine.head = cy.top; engine.intake = cy.intake; engine.cy = cy;
      /* карбюратор/дроссель и патрубок к воздушному фильтру */
      var cb = add(cy.intake, mul(cy.nn, -58 * EK));
      s += tube([cy.intake, cb], 40 * EK, "#2A2E33", { hi: 0.3 });
      s += path(P([cn(add(cb, [-36 * EK, -32 * EK])), cn(add(cb, [26 * EK, -32 * EK])), cn(add(cb, [30 * EK, 36 * EK])), cn(add(cb, [-32 * EK, 36 * EK]))], true), 'fill="' + metal(E.efi ? "#3A3F45" : "#B9C0C7", 0.45) + '"');
      if (!E.efi) s += circ(add(cb, [0, 46 * EK]), 14 * EK, 'fill="' + metal("#3A3F45") + '"');
      if (dirt) s += tube([add(cb, [-30 * EK, 0]), add(cb, [-90 * EK, 14 * EK]), [SF[0] - 150 * k, SR[1] - 150 * k]], 52 * EK, "#1E2125", { hi: 0.18 });
      /* кикстартер: рычаг сложен назад-вверх */
      if (X.kick) {
        var ks = [ex0 + 0.18 * w, eb + 0.42 * hgt], ke = add(ks, [-70 * EK, 150 * EK]);
        s += tube([ks, ke], 20 * EK, "#3A3F45", { hi: 0.5 });
        s += tube([ke, add(ke, [70 * EK, 18 * EK])], 22 * EK, "#2A2E33", { hi: 0.3 });
        s += circ(ks, 16 * EK, 'fill="#1E2125"') + bolt(ks, 6 * EK);
      }
      return s;
    }
    function radiator() {
      if (!liq || g.body === "cruiser" || g.body === "classic") return "";
      var c = dirt ? [cn([HB[0] - 50 * k, HB[1] - 62 * k]), cn([ex1 + 24 * k, eTop + 40 * k]), cn([ex1 - 112 * k, eTop + 46 * k]), cn([HB[0] - 205 * k, HB[1] - 60 * k])]
        : [cn(at(g.lc - 60, -165)), cn(at(g.lc - 330, -165)), cn(at(g.lc - 330, -265)), cn(at(g.lc - 60, -265))];
      var s = path(P(c, true), 'fill="#121416"');
      var gr = "";
      for (var i = 1; i < 16; i++) { var t = i / 16; gr += "M" + pt(lerp(c[0], c[1], t)) + " L" + pt(lerp(c[3], c[2], t)) + " "; }
      s += path(gr, 'stroke="#2E3338" stroke-width="5"');
      s += path(L([lerp(c[0], c[3], 0.04), lerp(c[1], c[2], 0.04)]), 'stroke="#3A3F45" stroke-width="16"');
      s += path(L([lerp(c[0], c[3], 0.96), lerp(c[1], c[2], 0.96)]), 'stroke="#3A3F45" stroke-width="16"');
      /* патрубки к головке и к помпе */
      if (engine.head) s += tube([lerp(c[0], c[3], 0.6), add(lerp(c[0], c[3], 0.6), [-40 * k, -30 * k]), add(engine.head, [30 * k, -20 * k])], 26 * k, "#17191C", { hi: 0.15 });
      if (engine.pump) s += tube([lerp(c[1], c[2], 0.2), add(engine.pump, [30 * k, 40 * k]), engine.pump], 24 * k, "#17191C", { hi: 0.15 });
      return s;
    }

    /* ---------- выхлоп ---------- */
    var S0 = [PV[0] + 25 * k, PV[1] + 205 * k], S1 = [SR[0] + 25 * k, SR[1] - 175 * k];
    if (two) { S0 = [PV[0] - 20 * k, PV[1] + 225 * k]; S1 = [SR[0] + 70 * k, SR[1] - 168 * k]; }
    if (cls === "pit" || cls === "kids") S1 = lerp(S0, S1, 0.82);
    function silencer(a, b, dia, kind) {
      var ax = norm(sub(b, a)), nn = perp(ax), s = "";
      if (nn[1] < 0) nn = mul(nn, -1);
      var col = kind === "carbon" ? "#2B2E33" : kind === "chrome" ? "#DDE2E7" : X.muffCol === "black" ? "#2E3238" : "#C3C9CF";
      var c0 = add(add(a, mul(ax, 40)), mul(nn, dia / 2)), c1 = add(b, mul(nn, dia / 2)), c2 = add(b, mul(nn, -dia / 2)), c3 = add(add(a, mul(ax, 40)), mul(nn, -dia / 2));
      var dd = P([cn(add(a, mul(nn, dia * 0.22))), c0, cn(c1), cn(c2), c3, cn(add(a, mul(nn, -dia * 0.22)))], true, 0.9);
      s += soft(dd, 0.35);
      var m = lerp(a, b, 0.5), ga = add(m, mul(nn, dia / 2)), gb = add(m, mul(nn, -dia / 2));
      s += path(dd, 'fill="' + lin([[0, shade(col, -0.3)], [0.12, shade(col, 0.6)], [0.3, shade(col, 0.15)], [0.6, col], [0.9, shade(col, -0.45)], [1, shade(col, -0.6)]], r1(ga[0]), r1(-ga[1]), r1(gb[0]), r1(-gb[1]), true) + '"');
      if (kind === "carbon") {
        var cs = "";
        for (var i = 1; i < 12; i++) cs += "M" + pt(add(lerp(c3, c2, i / 12), mul(nn, 2))) + " L" + pt(add(lerp(c0, c1, i / 12), mul(nn, -2))) + " ";
        s += path(cs, 'stroke="#fff" stroke-opacity=".06" stroke-width="10"');
      }
      /* заклёпки и торцевая крышка */
      var rv = "";
      for (var j = 0; j < 7; j++) rv += circ(add(lerp(c0, c1, 0.12 + j * 0.13), mul(nn, -7)), 2.6, "");
      s += '<g fill="#5D646C">' + rv + "</g>";
      var tip = add(b, mul(ax, 36 * k));
      s += path(P([cn(add(b, mul(nn, dia / 2))), cn(add(add(b, mul(ax, 18 * k)), mul(nn, dia * 0.4))), cn(add(tip, mul(nn, dia * 0.2))), cn(add(tip, mul(nn, -dia * 0.2))), cn(add(add(b, mul(ax, 18 * k)), mul(nn, -dia * 0.4))), cn(add(b, mul(nn, -dia / 2)))], true), 'fill="' + metal(kind === "chrome" ? "#DDE2E7" : "#3A3F45", 0.5) + '"');
      s += ell(tip, dia * 0.1, dia * 0.16, ang(a, b), 'fill="#0B0C0D"');
      engine.tip = tip;
      return s;
    }
    function exhaust() {
      var s = "", sil = "", Pp = engine.port || [ex1, eTop];
      var muff = mods.indexOf("slip") >= 0 || mods.indexOf("full") >= 0 || mods.indexOf("silencer2t") >= 0 ? "carbon" : "std";
      var hdr = mods.indexOf("full") >= 0 ? "#B9A57A" : "#9AA1A8";
      /* цвета побежалости у выпускного окна */
      var heat = lin([[0, "#9C7440"], [0.2, "#7D5F8E"], [0.42, "#5C6E96"], [0.7, hdr], [1, hdr]], r1(Pp[0]), r1(-Pp[1]), r1(Pp[0] - 260 * k), r1(-Pp[1] + 220 * k), true);
      if (two && (dirt || g.body === "trial")) {
        /* резонатор 2T: от окна вниз-вперёд, «пузо» перед мотором и вдоль низа, конус вверх к глушителю */
        var ps = [Pp, add(Pp, [50 * k, -26 * k]), [ex1 + 62 * k, eb + 150 * k], [ex1 + 18 * k, eb + 66 * k], [ex1 - 150 * k, eb + 58 * k], [ex0 + 0.3 * EW, eb + 92 * k], [ex0 + 0.02 * EW, eb + 150 * k], [PV[0] - 10 * k, PV[1] + 165 * k], add(S0, [10 * k, -12 * k])];
        var ws = [42, 62, 104, 112, 108, 92, 66, 38, 28].map(function (v) { return v * k; });
        var dp = band(ps, ws);
        s += soft(dp, 0.35);
        s += path(dp, 'fill="' + lin([[0, "#E3E7EA"], [0.3, "#AEB5BC"], [0.6, "#6B737B"], [1, "#2E3338"]], 0, 0, 0.15, 1) + '"');
        s += path(dp, 'fill="' + lin([[0, "#7D5B9C", 0.55], [0.3, "#3B5FA0", 0.35], [0.55, "#000", 0]], 1, 0, 0.3, 0.6) + '"');
        s += path(P([lerp(ps[1], ps[2], 0.4), ps[2], lerp(ps[2], ps[3], 0.6)], false), 'fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="' + r1(14 * k) + '" stroke-linecap="round" transform="translate(-6,-10)"');
        sil = silencer(S0, S1, 84 * k, muff);
      } else if (dirt) {
        var hp;
        if (horiz) hp = [Pp, add(Pp, [30 * k, -50 * k]), [ex1 - 0.12 * EW, eb + 0.4 * EH], [ex0 + 0.4 * EW, eb + 0.52 * EH], [ex0 + 0.06 * EW, eTop + 20 * k], add(S0, [36 * k, -8 * k])];
        else hp = [Pp, add(Pp, [44 * k, -38 * k]), [ex1 + 32 * k, eTop + 62 * k], [ex1 + 26 * k, eTop - 34 * k], [ex1 - 70 * k, eTop - 70 * k], [ex0 + 0.45 * EW, eTop - 38 * k], [ex0 + 0.12 * EW, eTop + 30 * k], add(S0, [36 * k, -8 * k])];
        s += path(P(hp, false), 'fill="none" stroke="#000" stroke-opacity=".2" stroke-width="' + r1(48 * k) + '" stroke-linecap="round" transform="translate(4,9)"');
        s += path(P(hp, false), 'fill="none" stroke="' + shade(hdr, -0.6) + '" stroke-width="' + r1(42 * k) + '" stroke-linecap="round" stroke-linejoin="round"');
        s += path(P(hp, false), 'fill="none" stroke="' + heat + '" stroke-width="' + r1(30 * k) + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(-2,-4)"');
        s += path(P(hp, false), 'fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="' + r1(7 * k) + '" stroke-linecap="round" stroke-linejoin="round" transform="translate(-5,-10)"');
        sil = silencer(S0, S1, (cls === "pit" || cls === "kids" ? 88 : 104) * k, muff);
      } else if (g.body === "adv" || g.body === "naked" || g.body === "sport") {
        var k0 = Pp, k1 = add(Pp, [50, -110]), k2 = [ex1 - 10, eb + 50], k3 = [ex1 - 130, eb - 4];
        if (layout === "i4") for (var j = 1; j < 4; j++) s += tube([add(k0, [-j * 22, -j * 10]), add(k1, [-j * 20, -j * 10]), add(k2, [-j * 10, j * 6])], 30, "#B9A57A");
        if (g.body === "naked") {
          s += tube([k0, k1, k2, k3], 44, hdr);
          s += path(P([[ex0 + 40, eb - 46], [ex1 - 110, eb - 40], [ex1 - 90, eb + 40], [ex0 + 60, eb + 50]], true, 0.4), 'fill="' + metal("#3A3F45", 0.5) + '"');
          engine.tip = [ex0 + 30, eb];
        } else {
          var m0 = g.body === "sport" ? [PV[0] - 40, PV[1] + 40] : [PV[0] - 10, PV[1] + 120], m1 = g.body === "sport" ? [R[0] + 160, PV[1] + 190] : [R[0] + 60, PV[1] + 300];
          s += tube([k0, k1, k2, k3, [ex0 + 40, eb + 20], add(m0, [60, -20])], 44, hdr);
          s += silencer(m0, m1, g.body === "sport" ? 116 : 124, muff);
        }
      } else if (g.body === "cruiser") {
        var cp1 = add(Pp, [50, -110]), cpE = [R[0] - 120, R[1] + 70];
        s += tube([Pp, cp1, [ex1 - 60, eb + 10], [ex0, eb + 4], cpE], 48, "#DDE2E7");
        s += tube([add(Pp, [-120, 40]), add(cp1, [-110, 30]), [ex0 + 60, eb + 60], [R[0] - 40, R[1] + 140]], 44, "#DDE2E7");
        engine.tip = cpE;
      } else {
        var l1 = add(Pp, [40, -80]), l2 = [ex1 - 30, eb - 10], l3 = [ex0, eb - 4];
        s += tube([Pp, l1, l2, l3], 40 * sc, "#DDE2E7");
        s += silencer([ex0 + 20, eb - 2], [R[0] - 80 * sc, R[1] + 40 * sc], 96 * sc, "chrome");
      }
      return { h: s, sil: sil };
    }

    /* ---------- рама ---------- */
    function frame() {
      var s = "", W = (cls === "kids" ? 22 : cls === "pit" ? 28 : 34);
      if (g.body === "moped") return tube([HB, [ex1 + 30, eb + 160], [PV[0] + 60, PV[1] + 60]], 46, fr);
      if (!dirt && g.body !== "trial") {
        var tb = [PV[0] + 120, seat[2] - 120], pvTop = add(PV, [30, 60]);
        s += tube([lerp(HT, HB, 0.5), lerp(HT, tb, 0.5), tb, pvTop], W, fr);
        if (X.trellis) for (var i = 0; i < 4; i++) s += tube([lerp(HB, pvTop, i / 4), lerp(HT, tb, (i + 1) / 4)], 16, fr);
        s += tube([HB, [ex1 + 30, eb + 150], [ex1 - 20, eb - 6]], W - 6, fr);
        s += tube([tb, [seat[0] + 60, seat[2] - 60]], W - 10, fr);
        return s;
      }
      /* эндуро и питбайк: передняя труба за радиатором, люлька под мотором, задняя петля у маятника */
      var dt = [HB, [HB[0] - 62 * k, HB[1] - 165 * k], [ex1 + 8 * k, eb + 150 * k], [ex1 - 20 * k, eb + 14 * k], [ex1 - 140 * k, eb - 20 * k], [ex0 + 80 * k, eb - 20 * k], [ex0 + 8 * k, eb + 40 * k], [PV[0] + 30 * k, PV[1] - 20 * k]];
      if (horiz) {
        s += tube([HT, [HT[0] - 170 * k, HT[1] - 150 * k], [ex0 + 0.45 * EW, eTop + 95 * k], [PV[0] + 40 * k, PV[1] + 120 * k]], W + 6, fr);
        dt = [HB, [HB[0] - 40 * k, HB[1] - 150 * k], [ex1 - 0.04 * EW, eTop + 0.05 * EH]];
      }
      s += tube(dt, W - 4, fr);
      return s;
    }
    function frameRear() {
      if (!dirt && g.body !== "trial") return "";
      var s = "", W = (cls === "kids" ? 22 : cls === "pit" ? 28 : 34);
      /* подрамник под сиденьем */
      s += tube([[PV[0] + 60 * k, SR[1] - 150 * k], [SR[0] + 70 * k, SR[1] - 72 * k]], W - 12, subC);
      s += tube([[PV[0] + 26 * k, PV[1] + 100 * k], [SR[0] + 150 * k, SR[1] - 112 * k]], W - 14, subC);
      /* задняя петля рамы у маятника — снаружи мотора (у питбайка вместо неё хребет над мотором) */
      if (!horiz) s += tube([[PV[0] + 30 * k, PV[1] - 30 * k], [PV[0] + 42 * k, PV[1] + 130 * k], [PV[0] + 72 * k, SR[1] - 160 * k], [SF[0] - 50 * k, SR[1] - 104 * k]], W, fr);
      /* литая площадка оси маятника и подножек */
      s += path(P([cn(add(PV, [-28 * k, -62 * k])), cn(add(PV, [62 * k, -66 * k])), add(PV, [74 * k, 10 * k]), cn(add(PV, [58 * k, 96 * k])), cn(add(PV, [-22 * k, 84 * k]))], true, 0.8), 'fill="' + metal(fr, 0.45) + '"');
      return s;
    }
    /* воздушный фильтр и тёмные внутренности под сиденьем — видны в просвете между боковиной и обтекателем */
    function airbox() {
      if (!dirt) return "";
      return path(P([cn([PV[0] + 40 * k, SR[1] - 40 * k]), cn([SF[0] + 30 * k, SR[1] - 30 * k]), cn([SF[0] + 10 * k, SR[1] - 165 * k]), [PV[0] + 140 * k, PV[1] + 190 * k], cn([PV[0] + 40 * k, PV[1] + 230 * k])], true, 0.7), 'fill="' + lin([[0, "#3A3E44"], [0.6, "#24272B"], [1, "#15171A"]], 0, 0, 0.3, 1) + '"');
    }

    /* ---------- вилка ---------- */
    function fork() {
      var s = "", usd = X.usd !== false && (dirt || g.body === "naked" || g.body === "sport" || g.body === "adv" || g.body === "trial");
      if (X.usd === false) usd = false;
      var fk = cls === "kids" ? 0.66 : cls === "pit" ? 0.8 : 1;
      var wO = (usd ? 58 : 50) * fk, wI = (usd ? 46 : 40) * fk;
      var split = usd ? g.fl * 0.4 : g.fl * 0.44, top = g.fl + 24 * fk;
      if (usd) {
        s += rod(at(-8), at(split + 16), wI, forkLow, { hi: 0.8 });
        s += rod(at(split), at(top), wO, forkC, { hi: 0.55 });
        /* кольцо пыльника и зажим оси */
        s += rod(at(split - 6), at(split + 10), wO + 4, shade(forkC, -0.35));
        s += path(P([cn(at(-48, -30 * fk)), cn(at(-48, 34 * fk)), at(30, 40 * fk), cn(at(96, 26 * fk)), cn(at(96, -26 * fk)), at(30, -34 * fk)], true, 0.7), 'fill="' + metal(C.foot || "#2A2E33", 0.5) + '"');
        s += bolt(at(54, 12 * fk), 5 * fk) + bolt(at(20, 14 * fk), 5 * fk);
        if (dirt && cls !== "motard") {
          /* защита перьев */
          var fg = [cn(at(36, 14 * fk)), at(36, 44 * fk), at(120, 56 * fk), at(split - 40, 62 * fk), cn(at(split - 12, 54 * fk)), cn(at(split - 12, 14 * fk))];
          s += panel(fg, guardC, logo(o.brand ? o.brand.toUpperCase() : "", at(split * 0.55, 40 * fk), 22 * fk, 90 + g.rake, lum(guardC) > 0.6 ? "#1B1F22" : "#F2F3F0", null, { ls: 2 }), { shadowOp: 0.3, rim: 0.3 });
        }
      } else {
        s += rod(at(split - 30), at(top), wI, "#DDE2E7", { hi: 0.8 });
        if (g.body === "classic" || g.body === "cruiser") s += rod(at(split - 30), at(split + 150), wO + 12, "#1B1D20");
        else s += rod(at(split - 28), at(split + 4), wO + 2, "#1E2125");
        s += rod(at(-34), at(split), wO, g.body === "cruiser" || g.body === "classic" ? "#DDE2E7" : forkC === "#C8962E" ? "#B9C0C7" : forkC, { hi: 0.6 });
      }
      /* траверсы */
      [[g.lc, 50], [g.fl, 40]].forEach(function (tc, i) {
        var t = tc[0], th = tc[1] * fk;
        s += path(P([cn(at(t - th / 2, wO / 2 + 8)), cn(at(t + th / 2, wO / 2 + 8)), at(t + th / 2 - 4, -20), cn(at(t + th / 2 - 8, -62 * fk)), cn(at(t - th / 2, -62 * fk))], true, 0.8), 'fill="' + metal(clampC, 0.5) + '"');
        s += bolt(at(t, wO / 2 - 4), 5 * fk) + bolt(at(t, -40 * fk), 5 * fk);
      });
      s += rod(at(top - 6), at(top + 10), wO * 0.82, "#1B1D20");
      return s;
    }

    /* ---------- руль: в боковом виде грипса видна с торца ---------- */
    function cockpit() {
      var s = "", fs = cls === "kids" ? 0.68 : cls === "pit" ? 0.82 : 1;
      var bc = at(g.fl + 16 * fs, -36 * fs), grip, clip = g.body === "sport";
      if (clip) {
        var cl = at(g.fl - 20, -10);
        grip = add(cl, [-110, 10]);
        s += tube([cl, grip], 28, "#2A2E33");
      } else {
        var rise = (cls === "cruiser" ? 200 : g.body === "classic" || cls === "moped" ? 100 : 78) * fs;
        var back = (cls === "cruiser" ? 220 : g.body === "classic" ? 110 : 60) * fs;
        grip = add(bc, [-back, rise]);
        /* стойки руля на верхней траверсе */
        s += path(P([cn(add(bc, [-24 * fs, -18 * fs])), cn(add(bc, [24 * fs, -18 * fs])), cn(add(bc, [20 * fs, 26 * fs])), cn(add(bc, [-20 * fs, 26 * fs]))], true), 'fill="' + metal("#2A2E33", 0.5) + '"');
        s += tube([add(bc, [0, 14 * fs]), add(bc, [-back * 0.2, rise * 0.62]), add(grip, [back * 0.15, -6 * fs]), grip], (dirt ? 30 : 24) * fs, dirt || g.body === "trial" ? (C.bar || "#B9C0C7") : "#D5DADF");
      }
      /* грипса с торца, корпус ручки газа, бачок тормоза, рычаг */
      s += path(P([cn(add(grip, [-6 * fs, -26 * fs])), cn(add(grip, [40 * fs, -30 * fs])), cn(add(grip, [44 * fs, 22 * fs])), cn(add(grip, [-4 * fs, 24 * fs]))], true), 'fill="' + metal("#2A2E33", 0.4) + '"');
      s += ell(grip, 22 * fs, 27 * fs, 0, 'fill="#121315"') + ell(add(grip, [-3, 2]), 13 * fs, 17 * fs, 0, 'fill="#2E3136"');
      var mc = add(grip, [48 * fs, 14 * fs]);
      s += path(P([cn(add(mc, [-18 * fs, -16 * fs])), cn(add(mc, [40 * fs, -12 * fs])), cn(add(mc, [44 * fs, 26 * fs])), cn(add(mc, [-14 * fs, 30 * fs]))], true), 'fill="' + metal("#2E3238", 0.5) + '"');
      s += path(L([add(mc, [-10 * fs, 30 * fs]), add(mc, [36 * fs, 27 * fs])]), 'stroke="#D5DADF" stroke-width="' + r1(6 * fs) + '" stroke-linecap="round"');
      s += tube([add(mc, [30 * fs, -4 * fs]), add(mc, [60 * fs, -18 * fs]), add(mc, [76 * fs, -30 * fs])], 12 * fs, "#AEB5BC");
      /* тросы и шланг тормоза уходят вниз за маску */
      var cab = path(P([add(mc, [10 * fs, -14 * fs]), add(mc, [30 * fs, -90 * fs]), at(g.fl - 70 * fs, 30 * fs)], false), 'fill="none" stroke="#141517" stroke-width="' + r1(9 * fs) + '" stroke-linecap="round"') +
        path(P([add(grip, [20 * fs, -24 * fs]), add(grip, [16 * fs, -90 * fs]), at(g.fl - 90 * fs, -70 * fs)], false), 'fill="none" stroke="#141517" stroke-width="' + r1(7 * fs) + '" stroke-linecap="round"');
      if (X.handguards) {
        var hg = P([cn(add(grip, [-6 * fs, 32 * fs])), add(grip, [70 * fs, 40 * fs]), add(grip, [146 * fs, 12 * fs]), add(grip, [178 * fs, -36 * fs]), cn(add(grip, [168 * fs, -72 * fs])), cn(add(grip, [146 * fs, -64 * fs])), add(grip, [136 * fs, -24 * fs]), add(grip, [70 * fs, 8 * fs]), cn(add(grip, [-6 * fs, 6 * fs]))], true, 0.9);
        s += panel(hg, X.hgCol || handC, logo(o.brand && o.brand.length <= 8 ? o.brand.toUpperCase() : "", add(grip, [70 * fs, 30 * fs]), 17 * fs, -6, lum(X.hgCol || handC) > 0.6 ? "#1B1F22" : "#F2F3F0"), { shadowOp: 0.3 });
      }
      if (X.mirrors) {
        var m0 = add(grip, [34 * fs, 18 * fs]), m1 = add(grip, [-14 * fs, (dirt ? 190 : 150) * fs]);
        s += tube([m0, lerp(m0, m1, 0.5), m1], 9, "#2A2E33");
        s += ell(m1, 44, 22, 8, 'fill="' + metal("#2A2E33", 0.5) + '"') + ell(add(m1, [6, 4]), 30, 12, 8, 'fill="' + glass + '"');
      }
      /* приборная панель у эндуро */
      if (dirt && cls !== "cross" && cls !== "pit" && cls !== "kids") s += path(P([cn(at(g.fl + 26, 6)), cn(at(g.fl + 22, 62)), cn(at(g.fl - 18, 66)), cn(at(g.fl - 14, 4))], true), 'fill="' + metal("#1E2125", 0.4) + '"');
      return { s: s, cab: cab, grip: grip, bc: bc };
    }

    /* ---------- кузов эндуро, кросса, питбайка, мотарда ---------- */
    var pat = h % 3;                                 /* узор наклеек — свой у каждой модели */
    var onBody = light ? "#1B1F22" : "#F7F8F9", onBodyS = light ? "#F7F8F9" : "#1B1F22";
    var model = String(o.model || "").replace(/\s*\(.*?\)\s*/g, " ").trim();
    var modelTag = model.length > 14 ? model.split(/\s+/).slice(0, 2).join(" ") : model;
    function dirtBody() {
      var s = "", sy = SR[1];
      /* заднее крыло */
      var rf = [[SR[0] + 90 * k, sy - 22 * k], [SR[0] - 120 * k, sy - 4 * k], [T[0] + 100 * k, T[1] - 2 * k], cn(T), cn([T[0] - 6 * k, T[1] - 22 * k]), [T[0] + 60 * k, T[1] - 38 * k], [SR[0] - 145 * k, sy - 70 * k], [SR[0] - 40 * k, sy - 100 * k], cn([SR[0] + 90 * k, sy - 132 * k])];
      var rfDeco = path(P([cn([T[0] - 40, T[1] + 40]), cn([T[0] + 150 * k, T[1] + 40]), cn([T[0] + 120 * k, T[1] - 80]), cn([T[0] - 40, T[1] - 80])], true), 'fill="' + acc + '"') +
        path(P([cn([T[0] + 150 * k, T[1] + 40]), cn([T[0] + 172 * k, T[1] + 40]), cn([T[0] + 142 * k, T[1] - 80]), cn([T[0] + 120 * k, T[1] - 80])], true), 'fill="' + acc2 + '"');
      var lights = X.lights !== "none" && cls !== "cross" && cls !== "pit" && cls !== "kids";
      if (lights) {
        /* держатель номера с фонарём и поворотником: номер виден с торца, тонкой полосой */
        var hp = [cn(add(T, [196 * k, -36 * k])), cn(add(T, [118 * k, -30 * k])), add(T, [80 * k, -110 * k]), cn(add(T, [52 * k, -236 * k])), cn(add(T, [98 * k, -240 * k])), add(T, [130 * k, -122 * k])];
        s += path(L([add(T, [52 * k, -150 * k]), add(T, [28 * k, -312 * k])]), 'stroke="#C9CED4" stroke-width="' + r1(10 * k) + '" stroke-linecap="round"');
        s += panel(hp, "#1A1C1F", "", { shadowOp: 0.35, rim: 0.25 });
        s += path(P([cn(add(T, [120 * k, -32 * k])), cn(add(T, [176 * k, -40 * k])), cn(add(T, [170 * k, -66 * k])), cn(add(T, [118 * k, -58 * k]))], true), 'fill="' + lin([[0, "#FF5A6A"], [0.5, "#C8102E"], [1, "#6E0A18"]], 0, 0, 0, 1) + '"');
        if (X.signals) {
          var sg = add(T, [104 * k, -88 * k]);
          s += path(P([cn(add(sg, [-18 * k, -14 * k])), cn(add(sg, [26 * k, -14 * k])), cn(add(sg, [26 * k, 16 * k])), cn(add(sg, [-18 * k, 16 * k]))], true), 'fill="' + lin([[0, "#FFD27A"], [1, "#C2690A"]], 0, 0, 0, 1) + '"');
        }
      }
      s += panel(rf, fenderC, pat === 1 ? rfDeco : path(L([[T[0] - 20, T[1] - 8 * k], [SR[0] - 40 * k, sy - 30 * k]]), 'stroke="' + acc + '" stroke-width="' + r1(14 * k) + '"'));
      /* боковина под сиденьем */
      var sp = [cn([PV[0] + 150 * k, sy - 28 * k]), [PV[0] + 118 * k, sy - 130 * k], cn([PV[0] + 60 * k, sy - 205 * k]), [PV[0] - 150 * k, sy - 190 * k], [SR[0] + 130 * k, sy - 140 * k], [SR[0] + 15 * k, sy - 92 * k], cn([SR[0] - 38 * k, sy - 40 * k]), [SR[0] + 60 * k, sy - 16 * k]];
      var npC = [lerp(sp[0], sp[6], 0.5)[0] + 20 * k, sy - 122 * k];
      var spDeco = "";
      if (X.number || cls === "cross" || cls === "pit" || cls === "kids") {
        /* номерное поле с номером */
        var nw = 165 * k, nh = 54 * k, nb = light ? "#1B1F22" : "#F4F5F2", nt = light ? "#F4F5F2" : "#1B1F22";
        spDeco += path(P([cn(add(npC, [-nw, nh])), cn(add(npC, [nw * 1.02, nh * 1.1])), cn(add(npC, [nw * 0.92, -nh * 1.05])), cn(add(npC, [-nw * 0.96, -nh * 0.95]))], true, 0.4), 'fill="' + nb + '"');
        spDeco += logo(o.num || "", npC, nh * 1.75, 3, nt, null, { ls: -2 });
        spDeco += path(P([cn([SR[0] - 80, sy - 190 * k]), cn([PV[0] + 160 * k, sy - 240 * k]), cn([PV[0] + 160 * k, sy - 190 * k]), cn([SR[0] - 80, sy - 160 * k])], true), 'fill="' + acc + '"');
      } else {
        /* большой логотип и полоса графики */
        var blk = pat === 2 ? [cn([SR[0] - 80, sy - 92 * k]), cn([PV[0] - 40 * k, sy - 196 * k]), cn([PV[0] + 160 * k, sy - 260 * k]), cn([SR[0] - 80, sy - 260 * k])]
          : [cn([SR[0] - 80, sy - 150 * k]), cn([PV[0] + 160 * k, sy - 184 * k]), cn([PV[0] + 160 * k, sy - 260 * k]), cn([SR[0] - 80, sy - 260 * k])];
        spDeco += path(P(blk, true), 'fill="' + acc + '"');
        spDeco += path(P([blk[0], blk[1], cn(add(blk[1], [0, 14 * k])), cn(add(blk[0], [0, 14 * k]))], true), 'fill="' + acc2 + '"');
        var lw = (sp[0][0] - sp[6][0]) * 0.78, lsz = fitSize(o.brand || "", lw, 70 * k);
        spDeco += logo(o.brand ? o.brand.toUpperCase() : "", [npC[0] - 10 * k, sy - 102 * k], lsz, 4, lum(sideC) > 0.6 ? acc === "#F4F5F2" || lum(acc) > 0.6 ? "#1B1F22" : acc : "#F7F8F9", lum(sideC) > 0.6 ? null : "#1B1F22");
        if (modelTag) spDeco += logo(modelTag.toUpperCase(), [npC[0] + 30 * k, sy - 146 * k], fitSize(modelTag, lw * 0.6, 26 * k), 4, lum(sideC) > 0.6 ? "#3A3F45" : "#E5E7EB", null, { italic: false });
      }
      s += panel(sp, sideC, spDeco);
      /* глушитель поверх нижней кромки боковины */
      s += "%%SILENCER%%";
      /* бак: виден сверху между сиденьем и рулевой колонкой */
      var tk = [[SF[0] + 120 * k, sy + 38 * k], [SF[0] + 190 * k, sy + 84 * k], [SF[0] + 245 * k, sy + 92 * k], cn([HB[0] - 30 * k, HB[1] + 72 * k]), cn([HB[0] - 45 * k, HB[1] - 30 * k]), cn([SF[0] + 120 * k, sy - 30 * k])];
      s += panel(tk, tankC, ellOn([SF[0] + 196 * k, sy + 88 * k], 30 * k, 9 * k, "#1B1D20"), { matte: true, shadow: false });
      /* обтекатель радиатора — главная деталь: форма и графика как у настоящего кроссовика */
      var A = cn([SF[0] + 18 * k, sy + 4 * k]), B = [SF[0] + 150 * k, sy + 58 * k], Cc = cn([SF[0] + 238 * k, sy + 72 * k]), D = [HB[0] - 22 * k, HB[1] + 22 * k],
        Ee = [ex1 + 52 * k, eTop + 155 * k], Ff = cn([ex1 + 36 * k, eTop + 80 * k]), G = [ex1 - 70 * k, eTop + 148 * k], H = cn([SF[0] + 28 * k, sy - 108 * k]);
      if (horiz) { Ee = [HB[0] - 50 * k, HB[1] - 150 * k]; Ff = cn([HB[0] - 72 * k, HB[1] - 205 * k]); G = [HB[0] - 190 * k, HB[1] - 175 * k]; }
      var shp = [A, B, Cc, D, Ee, Ff, G, H];
      var sd = P(shp, true);
      /* решётка радиатора: прорези в нижней части */
      if (liq) {
        var vv = norm(sub(G, Ff)), ww = perp(vv);
        if (ww[1] < 0) ww = mul(ww, -1);
        for (var i = 0; i < 4; i++) {
          var u0 = add(add(Ff, mul(vv, 46 * k)), mul(ww, 36 * k + i * 30 * k)), u1 = add(u0, mul(vv, 92 * k)), up = mul(ww, 12 * k);
          sd += " " + P([cn(u0), cn(u1), cn(add(u1, up)), cn(add(u0, up))], true);
        }
      }
      var shDeco = "";
      var e0 = lerp(H, A, pat === 1 ? 0.12 : 0.3), e1 = lerp(D, Ee, pat === 1 ? 0.78 : 0.62);
      var blk2 = [cn(add(e0, [-200, 0])), cn(e1), cn(add(e1, [200, -400])), cn(add(e0, [-200, -400]))];
      if (pat === 2) blk2 = [cn(add(e0, [-200, -30])), cn(lerp(e0, e1, 0.55)), cn(add(e1, [100, 40])), cn(add(e1, [200, -400])), cn(add(e0, [-200, -400]))];
      shDeco += path(P(blk2, true), 'fill="' + acc + '"');
      var st0 = blk2[0], st1 = blk2[1];
      shDeco += path(P([st0, st1, cn(add(st1, [0, 16 * k])), cn(add(st0, [0, 16 * k]))], true), 'fill="' + acc2 + '"');
      if (pat === 0) shDeco += path(P([cn(lerp(Cc, D, 0.4)), cn(lerp(Cc, D, 0.7)), cn(lerp(lerp(Cc, D, 0.7), Ff, 0.5)), cn(lerp(lerp(Cc, D, 0.4), Ff, 0.42))], true), 'fill="' + acc2 + '" opacity=".9"');
      /* логотип: по высоте — между верхней кромкой и графикой, по ширине — между задней и передней кромками на этой высоте */
      var topC = lerp(B, Cc, 0.5), bndC = lerp(st0, st1, 0.62), la = ang(A, Cc) * 0.6;
      var ly = (topC[1] + bndC[1]) / 2 - 6 * k;
      function xAt(p0, p1, y) { var t = clamp((y - p0[1]) / ((p1[1] - p0[1]) || 1), 0, 1); return p0[0] + (p1[0] - p0[0]) * t; }
      var xr = Math.max(xAt(H, A, ly), SF[0] + 60 * k), xf = xAt(Ee, D, ly);
      var lc0 = [(xr + xf) / 2, ly], bw = (xf - xr) * 0.86;
      shDeco += logo(o.brand ? o.brand.toUpperCase() : "", lc0, fitSize(o.brand || "", bw, Math.min(84 * k, Math.abs(topC[1] - bndC[1]) * 0.6)), la, onBody, onBodyS);
      s += panel(sd, body, shDeco, { evenodd: true });
      /* сиденье: чехол с рисунком-«грипом», цветная полоса по низу */
      var se = [[SR[0] - 32 * k, sy - 14 * k], [SR[0] + 110 * k, sy + 1 * k], [SF[0] - 90 * k, sy + 3 * k], [SF[0] + 25 * k, sy + 14 * k], [SF[0] + 115 * k, sy + 46 * k], cn([SF[0] + 172 * k, sy + 64 * k]), cn([SF[0] + 178 * k, sy + 44 * k]), [SF[0] + 95 * k, sy - 2 * k], [SF[0] - 60 * k, sy - 62 * k], [SR[0] + 120 * k, sy - 66 * k], cn([SR[0] - 18 * k, sy - 44 * k])];
      var grip = "";
      for (var j = 0; j < 4; j++) grip += path(P([[SR[0] - 10 * k, sy - 10 * k - j * 9 * k], [SF[0] - 90 * k, sy - 4 * k - j * 9 * k], [SF[0] + 110 * k, sy + 36 * k - j * 9 * k]], false), 'fill="none" stroke="#fff" stroke-opacity=".06" stroke-width="3"');
      var bandD = path(P([cn([SR[0] - 60, sy - 46 * k]), cn([SF[0] + 120 * k, sy - 30 * k]), cn([SF[0] + 120 * k, sy - 120 * k]), cn([SR[0] - 60, sy - 120 * k])], true), 'fill="' + seatBand + '"');
      s += panel(se, seatC, grip + bandD + logo(o.brand ? o.brand.toUpperCase() : "", [SR[0] + 120 * k, sy - 30 * k], 22 * k, 1, "#9AA0A7", null, { ls: 3 }), { matte: true, rim: 0.18 });
      return { s: s, shroud: lerp(lerp(A, Cc, 0.5), lerp(H, Ee, 0.5), 0.5), side: npC };
    }
    function ellOn(c, rx, ry, col) { return ell(c, rx, ry, 0, 'fill="' + col + '"') + ell(add(c, [-rx * 0.2, ry * 0.3]), rx * 0.5, ry * 0.4, 0, 'fill="#5A6068"'); }
    function frontFenderDirt() {
      var M = at(g.lc - 45 * k, 0);
      var ff = [cn(add(M, [-72 * k, -32 * k])), add(M, [-12 * k, 2 * k]), add(M, [120 * k, 4 * k]), add(M, [270 * k, -14 * k]), add(M, [400 * k, -50 * k]), cn(add(M, [522 * k, -92 * k])), cn(add(M, [514 * k, -114 * k])), add(M, [390 * k, -82 * k]), add(M, [240 * k, -52 * k]), add(M, [100 * k, -40 * k]), add(M, [-10 * k, -44 * k]), cn(add(M, [-74 * k, -60 * k]))];
      if (cls === "motard") ff = ff.map(function (p) { return p.length > 2 ? cn(add(p, [0, -10])) : add(p, [0, -10]); });
      var deco = pat === 0 ? path(P([cn(add(M, [300 * k, 60])), cn(add(M, [360 * k, 60])), cn(add(M, [330 * k, -200])), cn(add(M, [270 * k, -200]))], true), 'fill="' + acc + '"') : "";
      return panel(ff, fenderC, deco + logo(o.brand && o.brand.length <= 9 ? o.brand.toUpperCase() : "", add(M, [150 * k, -18 * k]), 24 * k, -3, lum(fenderC) > 0.6 ? "#1B1F22" : "#F2F3F0"), { shadowOp: 0.35 });
    }
    function maskDirt(kind) {
      var s = "", fk = cls === "kids" ? 0.66 : cls === "pit" ? 0.8 : 1;
      if (kind === "plate") {
        var np = [cn(at(g.fl + 8 * fk, 30 * fk)), at(g.fl - 4 * fk, 62 * fk), at(g.fl - 90 * fk, 86 * fk), at(g.lc - 10 * fk, 88 * fk), cn(at(g.lc - 82 * fk, 74 * fk)), cn(at(g.lc - 86 * fk, 42 * fk)), cn(at(g.lc - 70 * fk, 30 * fk))];
        return panel(np, X.plateCol || body, path(P([cn(at(g.lc - 100, 120)), cn(at(g.lc + 20, 120)), cn(at(g.lc + 40, 20)), cn(at(g.lc - 100, 20))], true), 'fill="' + acc + '"'), { shadowOp: 0.3 });
      }
      var mk = [cn(at(g.fl - 4 * fk, 30 * fk)), at(g.fl - 8 * fk, 62 * fk), at(g.fl - 52 * fk, 122 * fk), at(g.lc + 60 * fk, 152 * fk), at(g.lc - 20 * fk, 140 * fk), cn(at(g.lc - 72 * fk, 106 * fk)), cn(at(g.lc - 78 * fk, 56 * fk)), cn(at(g.lc - 62 * fk, 30 * fk))];
      s += panel(mk, X.maskCol || body, path(P([cn(at(g.lc - 140, 200)), cn(at(g.lc - 30, 200)), cn(at(g.lc - 50, 20)), cn(at(g.lc - 140, 20))], true), 'fill="' + acc + '"'), { shadowOp: 0.35 });
      /* фара: стекло видно узкой полосой спереди */
      var lens = [cn(at(g.lc + 128 * fk, 150 * fk)), at(g.lc + 50 * fk, 160 * fk), cn(at(g.lc - 26 * fk, 146 * fk)), cn(at(g.lc - 30 * fk, 122 * fk)), at(g.lc + 40 * fk, 130 * fk), cn(at(g.lc + 124 * fk, 126 * fk))];
      s += path(P(lens, true), 'fill="' + glass + '"') + path(P(lens.slice(0, 3), false), 'fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="4"');
      if (X.signals) {
        var sg = at(g.fl - 70 * fk, 110 * fk);
        s += path(P([cn(add(sg, [-18, -14])), cn(add(sg, [26, -14])), cn(add(sg, [26, 16])), cn(add(sg, [-18, 16]))], true), 'fill="' + lin([[0, "#FFD27A"], [1, "#C2690A"]], 0, 0, 0, 1) + '"');
      }
      engine.lamp = at(g.lc + 50 * fk, 140 * fk);
      return s;
    }
    function skid() {
      if (!(dirt && cls !== "kids" && cls !== "motard")) return "";
      var sk = [cn([ex0 + 20 * k, eb - 6]), [ex0 + 220 * k, eb - 18 * k], cn([ex1 - 10 * k, eb - 12 * k]), [ex1 + 40 * k, eb + 30 * k], cn([ex1 + 56 * k, eb + 92 * k]), cn([ex1 + 28 * k, eb + 96 * k]), [ex1 - 10 * k, eb + 30 * k], cn([ex0 + 30 * k, eb + 14 * k])];
      var col = X.skid || (mods.indexOf("skid") >= 0 ? "#B9C0C7" : "#24272B");
      return panel(sk, col, "", { matte: col !== "#B9C0C7", shadowOp: 0.3, rim: 0.3 });
    }
    function pegs() {
      var p = dirt ? [PV[0] + 58 * k, PV[1] - 50 * k] : [PV[0] + 30 * sc, PV[1] - 40 * sc], s = "", pk = dirt ? k : sc;
      /* рычаг заднего тормоза вдоль рамы, тормозной цилиндр за подножкой */
      s += tube([add(p, [6 * pk, 16 * pk]), add(p, [90 * pk, 6 * pk]), add(p, [160 * pk, 30 * pk])], 16 * pk, "#B9C0C7");
      s += path(P([cn(add(p, [140 * pk, 18 * pk])), cn(add(p, [186 * pk, 26 * pk])), cn(add(p, [180 * pk, 46 * pk])), cn(add(p, [136 * pk, 40 * pk]))], true), 'fill="' + metal("#3A3F45") + '"');
      if (dirt) s += rod(add(p, [-30 * pk, 22 * pk]), add(p, [-40 * pk, 110 * pk]), 22 * pk, "#2E3238");
      /* подножка с зубцами */
      s += path(P([cn(add(p, [-52 * pk, -12 * pk])), cn(add(p, [46 * pk, -12 * pk])), cn(add(p, [46 * pk, 14 * pk])), cn(add(p, [-52 * pk, 14 * pk]))], true), 'fill="' + metal("#9AA2AA", 0.5) + '"');
      var teeth = "";
      for (var i = 0; i < 6; i++) teeth += L([add(p, [-46 * pk + i * 17 * pk, 14 * pk]), add(p, [-40 * pk + i * 17 * pk, 24 * pk]), add(p, [-34 * pk + i * 17 * pk, 14 * pk])], true) + " ";
      s += path(teeth, 'fill="#6B737B"');
      s += circ(add(p, [-60 * pk, 0]), 11 * pk, 'fill="#1E2125"');
      return s;
    }

    /* ---------- кузов дорожных классов ---------- */
    function plastic(pts, kk, fill, deco) { return panel(P(pts, true, kk == null ? 0.7 : kk), fill || body, deco || ""); }
    function brandText(x, y, size, rot, color) { return logo(o.brand ? o.brand.toUpperCase() : "", [x, y], Math.min(size, fitSize(o.brand || "", 210, size)), -(rot || 0), color || onBody, light ? null : "#1B1F22"); }
    function tailLight(p, w) { return path(P([cn(p), cn(add(p, [w, -4])), cn(add(p, [w - 4, -26])), cn(add(p, [4, -22]))], true), 'fill="' + lin([[0, "#FF5A6A"], [0.5, "#C8102E"], [1, "#6E0A18"]], 0, 0, 0, 1) + '"'); }
    function plateHanger(from, to) {
      var s2 = tube([from, to], 22, "#1E2125");
      s2 += path(L([add(to, [-14, 70]), add(to, [-30, -100])]), 'stroke="#DDE2E7" stroke-width="9" stroke-linecap="round"');
      if (X.signals) [add(from, [-30, -10])].forEach(function (b0) { s2 += tube([b0, add(b0, [-50, -20])], 9, "#1E2125") + path(P([cn(add(b0, [-80, -6])), cn(add(b0, [-40, -4])), cn(add(b0, [-40, -40])), cn(add(b0, [-80, -40]))], true), 'fill="' + lin([[0, "#FFD27A"], [1, "#C2690A"]], 0, 0, 0, 1) + '"'); });
      return s2;
    }
    function seatPad(pts) { return panel(P(pts, true, 0.6), seatC, "", { matte: true, rim: 0.18 }); }
    function nakedBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1];
      s += plateHanger([T[0] + 150, T[1] - 70], [T[0] + 30, T[1] - 330]);
      s += plastic([[sx0 + 330, sy - 20], [sx0 + 60, sy + 40], [T[0] + 50, T[1] - 4], T, [T[0] + 20, T[1] - 36], [sx0 + 20, sy - 50], [sx0 + 330, sy - 80]], 0.6);
      s += tailLight(add(T, [8, -10]), 64);
      s += seatPad([[sx0 + 360, sy + 34], [sx0 + 330, sy + 64], [sx0 + 50, sy + 72], [sx0 + 30, sy + 50], [sx0 + 60, sy + 28], [sx0 + 340, sy + 8]]);
      s += seatPad([[sx1 + 30, sy + 64], [sx1 - 40, sy + 26], [sx0 + 400, sy + 6], [sx0 + 370, sy + 30], [sx0 + 340, sy - 6], [sx0 + 380, sy - 50], [sx1 - 20, sy - 40]]);
      var t0 = [sx1 - 20, sy + 50], t1 = [sx1 + 60, sy + 170], t2 = [(sx1 + HT[0]) / 2 + 30, sy + 230], t3 = add(HT, [-10, 50]), t4 = add(HT, [20, -40]), t5 = [HT[0] - 40, sy - 10], t6 = [sx1 + 30, sy - 40];
      s += plastic([t0, t1, t2, t3, t4, t5, t6], 0.75, body, brandText((t1[0] + t3[0]) / 2, (t1[1] + t5[1]) / 2 + 10, 58, -8));
      var k0 = add(HT, [10, -20]), k1 = add(HT, [40, -130]), k2 = [ex1 - 10, eTop + 40], k3 = [ex1 - 120, eTop + 90], k4 = [HT[0] - 70, sy + 30];
      s += plastic([k0, k1, k2, k3, k4], 0.7, acc);
      return s;
    }
    function sportBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1];
      s += plateHanger([T[0] + 160, T[1] - 80], [T[0] + 40, T[1] - 330]);
      s += plastic([[sx0 + 330, sy - 20], [sx0 + 40, sy + 40], [T[0] + 60, T[1] - 6], T, [T[0] + 20, T[1] - 30], [sx0 - 30, sy - 40], [sx0 + 330, sy - 80]], 0.6);
      s += tailLight(add(T, [10, -8]), 60);
      s += seatPad([[sx0 + 300, sy + 46], [sx0 + 60, sy + 70], [sx0 + 40, sy + 50], [sx0 + 300, sy + 20]]);
      s += seatPad([[sx1 + 20, sy + 60], [sx1 - 40, sy + 20], [sx0 + 330, sy + 8], [sx0 + 330, sy - 30], [sx1 - 20, sy - 30]]);
      var t0 = [sx1 - 10, sy + 40], t1 = [sx1 + 80, sy + 170], t2 = [(sx1 + HT[0]) / 2 + 40, sy + 230], t3 = add(HT, [0, 70]), t4 = [HT[0] - 40, sy + 40];
      s += plastic([t0, t1, t2, t3, t4], 0.75);
      return s;
    }
    function sportFairing() {
      /* обтекатель спортбайка: острый нос, вырез над мотором сзади, отдельный «плавник» снизу */
      var s = "", sy = seat[2], sx1 = seat[1];
      var nose = at(g.fl - 20, 262), top = at(g.fl + 80, 178), back = add(HT, [-10, 30]), r0 = [sx1 + 30, sy - 60];
      var cut = [ex0 + 0.78 * EW, eTop + 40], r2 = [ex0 + 0.66 * EW, eb + 60], belly = [ex0 + 0.6 * EW, eb - 20], bf = [ex1 + 50, eb - 6], low = at(g.lc - 300, 240), nl = at(g.lc - 110, 286);
      var f = [cn(nose), top, cn(back), r0, cn(cut), r2, cn(belly), bf, low, cn(nl)];
      var mid = lerp(lerp(back, cut, 0.5), lerp(nl, bf, 0.5), 0.5);
      var deco = path(P([cn(add(lerp(r0, cut, 0.4), [0, 20])), cn(add(nose, [60, -60])), cn(add(nose, [60, -150])), cn(add(lerp(cut, r2, 0.6), [0, 0]))], true), 'fill="' + acc + '"') +
        path(P([cn(lerp(low, bf, 0.1)), cn(lerp(low, bf, 0.9)), cn(add(lerp(low, bf, 0.9), [0, -90])), cn(add(lerp(low, bf, 0.1), [0, -90]))], true), 'fill="#1E2125"') +
        brandText(mid[0] - 40, mid[1] + 10, 62, -8);
      s += panel(P(f, true, 0.8), body, deco);
      /* фары в носу и ветровое стекло */
      s += path(P([cn(at(g.fl - 34, 262)), at(g.fl + 6, 236), cn(at(g.fl + 10, 206)), cn(at(g.fl - 60, 236))], true, 0.6), 'fill="' + lampG + '"');
      s += path(P([cn(at(g.fl + 70, 182)), at(g.fl + 230, 120), cn(at(g.fl + 250, 96)), at(g.fl + 150, 120), cn(at(g.fl + 50, 158))], true, 0.6), 'fill="' + glass + '" opacity=".85"');
      engine.lamp = at(g.fl - 30, 240);
      return s;
    }
    function advBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1];
      s += plateHanger([T[0] + 160, T[1] - 80], [T[0] + 50, T[1] - 320]);
      s += plastic([[sx0 + 320, sy + 10], [sx0 + 40, sy + 40], [T[0] + 50, T[1] - 4], T, [T[0] + 20, T[1] - 40], [sx0 - 10, sy - 50], [sx0 + 320, sy - 70]], 0.6);
      s += tailLight(add(T, [10, -10]), 60);
      if (X.rack !== false) { s += tube([add(T, [30, 30]), [sx0 + 200, sy + 60]], 18, "#2A2E33"); s += tube([add(T, [60, 30]), add(T, [120, -60])], 14, "#2A2E33"); }
      if (X.pannier) s += panel(P([[T[0] + 90, T[1] - 70], [sx0 + 230, sy - 70], [sx0 + 210, sy - 430], [T[0] + 110, T[1] - 430]], true, 0.2), "#2B2F35", path(L([[T[0] + 100, T[1] - 150], [sx0 + 220, sy - 150]]), 'stroke="#8A929A" stroke-width="6"'), { matte: true });
      s += seatPad([[sx0 + 340, sy + 30], [sx0 + 320, sy + 60], [sx0 + 30, sy + 64], [sx0, sy + 40], [sx0 + 30, sy + 14], [sx0 + 340, sy + 4]]);
      s += seatPad([[sx1 + 40, sy + 70], [sx1 - 40, sy + 24], [sx0 + 380, sy + 10], [sx0 + 350, sy + 40], [sx0 + 330, sy - 20], [sx0 + 380, sy - 50], [sx1, sy - 40]]);
      var t0 = [sx1 - 10, sy + 60], t1 = [sx1 + 90, sy + 190], t2 = [(sx1 + HT[0]) / 2 + 30, sy + 250], t3 = add(HT, [-10, 10]), t4 = add(HT, [30, -110]), t5 = [ex1 + 20, eTop + 40], t6 = [ex1 - 140, eTop + 20], t7 = [sx1 + 60, sy - 110];
      var deco = path(P([lerp(t4, t5, 0.2), t5, t6, lerp(t6, t7, 0.5), lerp(lerp(t6, t7, 0.5), lerp(t3, t4, 0.5), 0.35)], true, 0.7), 'fill="' + acc + '" opacity=".95"') + brandText((t1[0] + t4[0]) / 2, (t1[1] + t6[1]) / 2 + 20, 62, -10);
      s += plastic([t0, t1, t2, t3, t4, t5, t6, t7], 0.75, body, deco);
      s += panel(P([[ex0 - 10, eb - 14], [ex1 + 20, eb - 6], [ex1 + 70, eb + 110], [ex1 + 30, eb + 80], [ex1 - 20, eb + 30], [ex0, eb + 20]], true, 0.4), "#B9C0C7", "", { shadowOp: 0.3 });
      return s;
    }
    function advFairing() {
      var s = "";
      var f0 = at(g.lc - 70, 40), f1 = at(g.lc + 30, 150), f2 = at(g.fl + 40, 150), f3 = at(g.fl + 80, 90), f4 = at(g.fl + 10, 20), f5 = at(g.lc - 30, 10);
      s += plastic([f0, f1, f2, f3, f4, f5], 0.6);
      s += path(P([at(g.lc + 40, 150), at(g.fl - 10, 156), at(g.fl - 20, 120), at(g.lc + 50, 118)], true, 0.6), 'fill="' + lampG + '"');
      s += path(P([at(g.fl + 50, 136), at(g.fl + 360, 66), at(g.fl + 330, 8), at(g.fl + 40, 60)], true, 0.35), 'fill="' + glass + '" opacity=".85"');
      engine.lamp = at(g.lc + 60, 130);
      return s;
    }
    function classicBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1];
      var outer = [], inner = [];
      for (var a = 30; a <= 182; a += 8) { outer.push(polar(R, g.rr + 70, a)); inner.unshift(polar(R, g.rr + 36, a)); }
      s += panel(P(outer.concat(inner), true, 0.5), body, "");
      s += tube([polar(R, g.rr + 40, 120), add(R, [30, 40])], 12, "#DDE2E7");
      s += tailLight(polar(R, g.rr + 72, 160), 56);
      s += plastic([[PV[0] + 70, sy - 60], [PV[0] + 50, PV[1] + 170], [sx0 + 300, PV[1] + 180], [sx0 + 290, sy - 70]], 0.3);
      s += circ([(PV[0] + sx0 + 340) / 2, (sy + PV[1] + 110) / 2], 34, 'fill="' + metal("#DDE2E7") + '"');
      s += seatPad([[sx0 - 10, sy - 20], [sx0 + 10, sy + 40], [sx1 - 40, sy + 50], [sx1 + 40, sy + 20], [sx1 + 20, sy - 30], [sx0 + 40, sy - 44]]);
      var t0 = [sx1, sy + 30], t1 = [sx1 + 60, sy + 180], t2 = [(sx1 + HT[0]) / 2, sy + 240], t3 = [HT[0] - 30, sy + 200], t4 = add(HT, [-20, -30]), t5 = [HT[0] - 90, sy + 10], t6 = [sx1 + 80, sy - 20];
      var em = lerp(lerp(t1, t5, 0.5), lerp(t2, t6, 0.5), 0.5);
      var deco = ell(em, 80, 38, 0, 'fill="' + acc + '" stroke="#DDE2E7" stroke-width="5"') + (o.brand ? '<text x="' + r1(em[0]) + '" y="' + r1(-em[1]) + '" text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif" font-size="' + r1(Math.min(34, 260 / o.brand.length)) + '" font-weight="700" fill="' + (lum(acc) > 0.6 ? "#1B1F22" : "#F7F8F9") + '">' + esc(o.brand.toUpperCase()) + "</text>" : "") +
        path(P([lerp(t5, t6, 0.2), lerp(t5, t6, 0.8), add(lerp(t5, t6, 0.8), [0, 60]), add(lerp(t5, t6, 0.2), [0, 60])], true, 0.4), 'fill="#141619" opacity=".85"');
      s += plastic([t0, t1, t2, t3, t4, t5, t6], 0.8, body, deco);
      return s;
    }
    function cruiserBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1];
      var outer = [], inner = [];
      for (var a = 40; a <= 168; a += 8) { outer.push(polar(R, g.rr + 66, a)); inner.unshift(polar(R, g.rr + 30, a)); }
      s += panel(P(outer.concat(inner), true, 0.5), body, "");
      s += tailLight(polar(R, g.rr + 70, 150), 50);
      s += seatPad([[sx0 - 40, sy - 10], [sx0 + 30, sy + 80], [sx1 - 160, sy + 6], [sx1 + 30, sy + 40], [sx1, sy - 30], [sx0 + 50, sy - 40]]);
      var t0 = [sx1 + 10, sy + 90], t1 = [sx1 + 90, sy + 230], t2 = [HT[0] - 150, sy + 300], t3 = [HT[0] - 40, sy + 250], t4 = add(HT, [-20, -60]), t5 = [sx1 + 120, sy + 70];
      s += plastic([t0, t1, t2, t3, t4, t5], 0.85, body, brandText((t1[0] + t3[0]) / 2, (t1[1] + t5[1]) / 2 + 20, 50, -4));
      return s;
    }
    function mopedBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1];
      var outer = [], inner = [];
      for (var a = 92; a <= 170; a += 8) { outer.push(polar(R, g.rr + 50, a)); inner.unshift(polar(R, g.rr + 22, a)); }
      s += panel(P(outer.concat(inner), true, 0.5), "#24272B", "", { matte: true });
      s += plastic([[sx0 - 20, sy - 30], [sx1 - 120, sy - 40], [PV[0] + 70, PV[1] + 150], [R[0] + 190, R[1] + 200], [R[0] - 60, R[1] + 330], [T[0] + 30, T[1] - 40]], 0.6);
      s += tailLight([T[0] - 4, T[1] - 30], 66);
      s += tube([[T[0] + 20, sy + 46], [sx0 + 230, sy + 46]], 16, "#2A2E33");
      s += tube([[T[0] + 40, sy + 46], [T[0] + 80, sy - 60]], 12, "#2A2E33");
      s += seatPad([[sx0 - 40, sy - 6], [sx0 + 10, sy + 44], [sx1 - 40, sy + 48], [sx1 + 30, sy + 16], [sx1 + 10, sy - 30], [sx0, sy - 40]]);
      var c0 = add(HT, [-50, -10]), c1 = add(HB, [50, -40]), c2 = [ex1 + 70, eb + 150], c3 = [ex1 - 40, eb + 110], c4 = [sx1 + 40, sy - 210], c5 = [sx1 - 30, sy - 40], c6 = [sx1 + 60, sy - 30], c7 = [HT[0] - 120, sy - 160];
      s += plastic([c0, c1, c2, c3, c4, c5, c6, c7], 0.75, body, path(P([lerp(c1, c2, 0.15), lerp(c1, c2, 0.85), lerp(c3, c4, 0.4), lerp(c7, c0, 0.5)], true, 0.7), 'fill="' + acc + '" opacity=".9"'));
      return s;
    }
    function mopedHead() {
      var hc = at(g.fl + 70, 30), s = "";
      s += plastic([add(hc, [-120, -40]), add(hc, [70, -50]), add(hc, [120, 20]), add(hc, [40, 70]), add(hc, [-100, 50])], 0.7);
      s += ell(add(hc, [96, 6]), 22, 40, 0, 'fill="' + lampG + '"');
      engine.lamp = add(hc, [80, 0]);
      return s;
    }
    function trialBody() {
      var s = "", sy = seat[2];
      s += plastic([[seat[0] - 30, sy - 40], [T[0] + 20, T[1] - 30], T, [T[0] + 30, T[1] + 14], [seat[0] + 60, sy + 20]], 0.6);
      s += seatPad([[seat[0] - 10, sy - 10], [seat[0] + 10, sy + 34], [seat[1], sy + 36], [seat[1] + 30, sy - 4]]);
      var t0 = [seat[1] + 10, sy + 20], t1 = add(HT, [-90, -40]), t2 = add(HT, [-30, -110]), t3 = [seat[1] + 120, sy - 70];
      s += plastic([t0, t1, t2, t3], 0.6, body, brandText((t0[0] + t2[0]) / 2, (t0[1] + t2[1]) / 2, 44, -14));
      return s;
    }
    function lowFender() {
      var c = F, r = g.rf + 22, outer = [], inner = [];
      for (var a = 30; a <= 140; a += 10) { outer.push(polar(c, r + 18, a)); inner.unshift(polar(c, r, a)); }
      return panel(P(outer.concat(inner), true, 0.5), g.body === "classic" || g.body === "cruiser" ? "#DDE2E7" : body, "", { shadowOp: 0.3 });
    }
    function roundLamp() {
      var lp = g.body === "naked" ? at(g.fl - 90, 80) : at(g.fl - 110, 100), s = "";
      s += tube([at(g.fl - 100, 10), lp], 18, "#1E2125");
      s += ell(add(lp, [16, 0]), 46, 90, 0, 'fill="' + metal(g.body === "classic" || g.body === "cruiser" ? "#DDE2E7" : "#2A2E33", 0.5) + '"');
      s += ell(add(lp, [46, 0]), 22, 76, 0, 'fill="' + lampG + '"');
      engine.lamp = add(lp, [30, 0]);
      return s;
    }

    /* ---------- сборка: сзади наперёд ---------- */
    push(ell([g.wb / 2, -4], g.wb / 2 + g.rr + 80, 46, 0, 'fill="url(#ba-gsh)"'));
    push(ell([0, 4], g.rr * 0.7, 16, 0, 'fill="#000" opacity=".55"') + ell([g.wb, 4], g.rf * 0.6, 14, 0, 'fill="#000" opacity=".55"'));
    push(wheel(R, g.rr, g.rimR, false));
    push(wheel(F, g.rf, g.rimF, true));
    push(airbox());
    var shock = twin ? twinShock() : monoShock();
    if (!twin) push(shock.s);
    push(frame());
    var engS = drawEngine();
    push(radiator());
    push(engS);
    push(frameRear());
    push(swingarm());
    push(skid());
    var ex = exhaust();
    var bodyRes = null;
    if (dirt) {
      push(ex.h);
      push(pegs());
      bodyRes = dirtBody();
      push(bodyRes.s.replace("%%SILENCER%%", ex.sil));
      push(frontFenderDirt());
    } else {
      push(ex.h + ex.sil);
      push(pegs());
      if (g.body === "adv") { push(frontFenderDirt()); push(advBody()); }
      else if (g.body === "naked") { push(lowFender()); push(nakedBody()); }
      else if (g.body === "sport") { push(lowFender()); push(sportBody()); }
      else if (g.body === "classic") { push(lowFender()); push(classicBody()); }
      else if (g.body === "cruiser") { push(lowFender()); push(cruiserBody()); }
      else if (g.body === "moped") { push(lowFender()); push(mopedBody()); }
      else if (g.body === "trial") { push(frontFenderDirt()); push(trialBody()); }
    }
    if (twin) push(shock.s);
    var ck = cockpit();
    push(ck.cab);
    push(fork());
    var lights = X.lights || (cls === "cross" || cls === "pit" || cls === "kids" ? "plate" : dirt ? "mask" : g.body === "adv" ? "adv" : g.body === "sport" ? "sport" : g.body === "moped" ? "moped" : g.body === "trial" ? "none" : "round");
    if (lights === "adv") push(advFairing());
    else if (lights === "sport") push(sportFairing());
    else if (lights === "moped") push(mopedHead());
    else if (lights === "round") push(roundLamp());
    else if (lights !== "none") push(maskDirt(lights));
    push(ck.s);
    /* рамка рисунка */
    var minX = -Math.max(g.rr + 50, -g.tail[0] + 70), maxX = g.wb + g.rf + 70;
    var top = Math.max(at(g.fl + 60, 0)[1] + 40, seat[2] + 150, ck.grip[1] + (X.mirrors ? 240 : 80), lights === "adv" ? at(g.fl + 360, 66)[1] + 20 : lights === "sport" ? at(g.fl + 250, 100)[1] + 20 : 0);
    var vb = [r1(minX), r1(-top - 30), r1(maxX - minX), r1(top + 90)];
    var P2 = function (p) { return [r1(p[0]), r1(-p[1])]; };
    var pins = {
      engine: P2(engine.center),
      fork: P2(at(g.fl * 0.2, 0)),
      shock: P2(shock.mid),
      brakes: P2(engine.caliper ? lerp(R, engine.caliper, 0.75) : polar(R, 80, 300)),
      wheels: P2(polar(F, g.rimF * 0.62, 210)),
      chain: P2(lerp(PV, R, 0.55)),
      cockpit: P2(ck.grip),
      electric: P2(engine.lamp || (bodyRes ? bodyRes.side : [seat[0] + 200, seat[2] - 120])),
      frame: P2(bodyRes ? bodyRes.shroud : [ex1 + 30, eTop + 60])
    };
    return { svg: "<defs>" + defs.join("") + "</defs>" + out.join(""), vb: vb, pins: pins, smoke: engine.tip ? P2(engine.tip) : null };
  }

  /* ---------- расцветки марок ----------
     body — обтекатели и маска, fender — крылья, side — боковины, accent/accent2 — графика, frame — рама, sub — подрамник,
     seat/seatBand — сиденье и полоса на нём, rim/hub — обода и ступицы, fork/forkLow — верх и низ перьев, clamp — траверсы,
     guard — защита перьев, spring — пружина амортизатора, tank — бак */
  var LIVERY = {
    KTM: { body: "#F26722", fender: "#F26722", side: "#F2F3F0", accent: "#1E2125", accent2: "#F2F3F0", frame: "#F26722", sub: "#2B2F35", seat: "#1C1E21", seatBand: "#5B6066", rim: "#1A1C1F", hub: "#F26722", fork: "#25282C", forkLow: "#D3D8DD", clamp: "#F26722", guard: "#1E2125", spring: "#F26722", tank: "#E7E3D8" },
    Husqvarna: { body: "#F2F3F0", fender: "#F2F3F0", side: "#F2F3F0", accent: "#123A86", accent2: "#FFD100", frame: "#123A86", sub: "#2A2F35", seat: "#1D2B4D", seatBand: "#123A86", rim: "#1A1C1F", hub: "#123A86", fork: "#25282C", forkLow: "#D3D8DD", clamp: "#25282C", guard: "#F2F3F0", spring: "#FFD100", hand: "#F2F3F0" },
    GasGas: { body: "#D31F2B", fender: "#D31F2B", side: "#D31F2B", accent: "#F2F3F0", accent2: "#1E2125", frame: "#D31F2B", sub: "#2A2F35", seat: "#1A1C1F", seatBand: "#D31F2B", rim: "#1A1C1F", hub: "#1E2125", fork: "#25282C", clamp: "#25282C", spring: "#D31F2B" },
    Honda: { body: "#D0121B", fender: "#D0121B", side: "#D0121B", accent: "#F2F3F0", accent2: "#1E3A8A", frame: "#B8BEC5", sub: "#B8BEC5", seat: "#1C1E21", seatBand: "#D0121B", rim: "#1A1C1F", hub: "#2A2E33", fork: "#2B2F35", forkLow: "#C9A24A", clamp: "#B8BEC5", guard: "#1E2125", spring: "#D0121B", hand: "#F2F3F0" },
    Yamaha: { body: "#1F4CA8", fender: "#F2F3F0", side: "#1F4CA8", accent: "#F2F3F0", accent2: "#00A0E9", frame: "#B8BEC5", sub: "#B8BEC5", seat: "#1C2537", seatBand: "#1F4CA8", rim: "#1A1C1F", hub: "#1F4CA8", fork: "#2B2F35", forkLow: "#C9A24A", clamp: "#B8BEC5", guard: "#F2F3F0", spring: "#1F4CA8" },
    Kawasaki: { body: "#5DBB3E", fender: "#5DBB3E", side: "#5DBB3E", accent: "#1E2125", accent2: "#F2F3F0", frame: "#B8BEC5", sub: "#B8BEC5", seat: "#1A1C1F", seatBand: "#5DBB3E", rim: "#1A1C1F", hub: "#2A2E33", fork: "#2B2F35", forkLow: "#C9A24A", clamp: "#2B2F35", guard: "#1E2125", spring: "#5DBB3E" },
    Suzuki: { body: "#F6D21B", fender: "#F6D21B", side: "#F6D21B", accent: "#12318D", accent2: "#1E2125", frame: "#B8BEC5", sub: "#B8BEC5", seat: "#12318D", seatBand: "#F6D21B", rim: "#1A1C1F", hub: "#2A2E33", fork: "#2B2F35", forkLow: "#C9A24A", clamp: "#2B2F35", guard: "#1E2125", spring: "#F6D21B" },
    Beta: { body: "#E1251B", fender: "#F2F3F0", side: "#F2F3F0", accent: "#1B3E8A", accent2: "#E1251B", frame: "#E1251B", sub: "#2A2F35", seat: "#1A1C1F", seatBand: "#E1251B", rim: "#1A1C1F", hub: "#2A2E33", fork: "#25282C", clamp: "#25282C", spring: "#E1251B" },
    Sherco: { body: "#1D4F9C", fender: "#F2F3F0", side: "#1D4F9C", accent: "#E1251B", accent2: "#FFD100", frame: "#1D4F9C", sub: "#2A2F35", seat: "#1D4F9C", seatBand: "#E1251B", rim: "#1A1C1F", fork: "#25282C", spring: "#FFD100" },
    "TM Racing": { body: "#F2F3F0", fender: "#F2F3F0", side: "#1D4F9C", accent: "#1D4F9C", accent2: "#E1251B", frame: "#B8BEC5", seat: "#1D4F9C", rim: "#1A1C1F", fork: "#25282C", spring: "#E1251B" },
    Fantic: { body: "#F2F3F0", fender: "#F2F3F0", side: "#F2F3F0", accent: "#D31F2B", accent2: "#1E2125", frame: "#D31F2B", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#25282C" },
    Rieju: { body: "#D31F2B", fender: "#F2F3F0", side: "#D31F2B", accent: "#F2F3F0", accent2: "#1E2125", frame: "#1E2125", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#25282C" },
    Kayo: { body: "#F2F3F0", fender: "#F2F3F0", side: "#F2F3F0", accent: "#F26722", accent2: "#1E2125", frame: "#1E2125", seat: "#1A1C1F", seatBand: "#F26722", rim: "#1A1C1F", fork: "#C8962E", spring: "#F26722" },
    BMW: { body: "#F2F3F0", accent: "#1C69D4", accent2: "#D31F2B", frame: "#3A3F45", seat: "#1A1C1F", rim: "#2A2E33", fork: "#C8962E" },
    Triumph: { body: "#2E3338", accent: "#C8102E", frame: "#1E2125", seat: "#1A1C1F", rim: "#2A2E33", fork: "#C8962E" },
    Ducati: { body: "#C8102E", accent: "#F2F3F0", frame: "#C8102E", seat: "#1A1C1F", rim: "#2A2E33", fork: "#C8962E" },
    Aprilia: { body: "#1E2125", accent: "#C8102E", frame: "#1E2125", seat: "#1A1C1F", rim: "#C8102E", fork: "#C8962E" },
    Kove: { body: "#F2F3F0", accent: "#1D4F9C", accent2: "#E1251B", frame: "#1E2125", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#C8962E" },
    CFMOTO: { body: "#2E5FA8", accent: "#F2F3F0", frame: "#1E2125", seat: "#1A1C1F", rim: "#2A2E33", fork: "#C8962E" },
    "Royal Enfield": { body: "#3D4A3A", accent: "#C9A227", frame: "#1E2125", seat: "#3A2A1E", rim: "#9AA2AA", fork: "#C9CED4" },
    "Harley-Davidson": { body: "#2B2F34", accent: "#E8740C", frame: "#17191C", seat: "#1A1C1F", rim: "#9AA2AA", fork: "#C9CED4" },
    Minsk: { body: "#B5121B", accent: "#F2F3F0", frame: "#1E2125", seat: "#1A1C1F", rim: "#9AA2AA", fork: "#C9CED4" }
  };
  /* китайские марки: типичные заводские сочетания цветов, у каждой модели — своё (по названию) */
  var CN_SCHEMES = [
    { body: "#F2F3F0", fender: "#F2F3F0", side: "#F2F3F0", accent: "#D31F2B", accent2: "#1E2125", frame: "#1E2125", seatBand: "#D31F2B", spring: "#D31F2B" },
    { body: "#F26722", fender: "#F26722", side: "#F2F3F0", accent: "#1E2125", accent2: "#F2F3F0", frame: "#1E2125", seatBand: "#F26722", spring: "#F26722" },
    { body: "#D31F2B", fender: "#F2F3F0", side: "#F2F3F0", accent: "#1E2125", accent2: "#F2F3F0", frame: "#1E2125", seatBand: "#D31F2B", spring: "#D31F2B" },
    { body: "#1D4F9C", fender: "#F2F3F0", side: "#1D4F9C", accent: "#F2F3F0", accent2: "#00A0E9", frame: "#1E2125", seatBand: "#1D4F9C", spring: "#1D4F9C" },
    { body: "#F2F3F0", fender: "#F2F3F0", side: "#F2F3F0", accent: "#123A86", accent2: "#FFD100", frame: "#123A86", seatBand: "#123A86", spring: "#FFD100" },
    { body: "#5DBB3E", fender: "#5DBB3E", side: "#1E2125", accent: "#1E2125", accent2: "#F2F3F0", frame: "#1E2125", seatBand: "#5DBB3E", spring: "#5DBB3E" },
    { body: "#1E2125", fender: "#1E2125", side: "#1E2125", accent: "#F26722", accent2: "#F2F3F0", frame: "#1E2125", seatBand: "#F26722", spring: "#F26722" },
    { body: "#F6D21B", fender: "#F6D21B", side: "#F6D21B", accent: "#1E2125", accent2: "#12318D", frame: "#1E2125", seatBand: "#F6D21B", spring: "#F6D21B" },
    { body: "#F2F3F0", fender: "#F2F3F0", side: "#F2F3F0", accent: "#F26722", accent2: "#1E2125", frame: "#1E2125", seatBand: "#F26722", spring: "#F26722" },
    { body: "#D31F2B", fender: "#D31F2B", side: "#1E2125", accent: "#F2F3F0", accent2: "#1E2125", frame: "#1E2125", seatBand: "#D31F2B", spring: "#D31F2B" }
  ];
  function hash(s) { var hh = 0; for (var i = 0; i < s.length; i++) hh = (hh * 31 + s.charCodeAt(i)) >>> 0; return hh; }
  function livery(brand, name, custom, customAcc) {
    var base = LIVERY[brand] || CN_SCHEMES[hash(String(brand) + " " + String(name)) % CN_SCHEMES.length];
    var c = Object.assign({ seat: "#1A1C1F", rim: "#1A1C1F", fork: "#C8962E" }, base);
    if (custom) {
      /* свой цвет пластика: обтекатели, маска и крылья; боковины — тем же цветом, если они были в цвет обтекателей */
      var wasSame = !base.side || base.side === base.body;
      c.body = custom; c.fender = custom; if (wasSame) c.side = custom;
      var lt = lum(custom) > 0.72;
      if (lum(c.accent) > 0.72 === lt && !customAcc) c.accent = lt ? "#1E2125" : "#F2F3F0";
      c.seatBand = custom; c.spring = c.spring && lum(custom) < 0.72 ? custom : c.spring;
    }
    if (customAcc) { c.accent = customAcc; c.accent2 = lum(customAcc) > 0.6 ? "#1E2125" : "#F2F3F0"; }
    return c;
  }
  window.bikeArt = bikeArt;
  window.bikeLivery = livery;
})();
