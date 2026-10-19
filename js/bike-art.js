/* MotoHelper — рисунок мотоцикла по реальной геометрии.
   Мотоцикл стоит правым боком, перед справа (как на фото в каталогах: видно выхлоп и задний тормоз).
   Координаты в миллиметрах: x — вперёд от оси заднего колеса, y — вверх от земли.
   bikeArt(o) → { svg: "<defs>…</defs><g>…</g>", vb: [x, y, w, h], pins: { engine: [X, Y], … }, smoke: [X, Y] }
   o: { cls, eng: { stroke, cc, horiz, liquid, layout }, col: { body, accent, frame, seat, rim, fork },
        brand, num, mods: [], o: { … } } */
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
  /* ломаная */
  function L(ps, close) { return "M" + ps.map(pt).join(" L") + (close ? " Z" : ""); }
  /* сглаженная кривая через точки (Catmull-Rom → Безье): формы пластика */
  function S(ps, close, k) {
    k = k == null ? 1 : k;
    var n = ps.length, d = "M" + pt(ps[0]);
    var get = function (i) { return close ? ps[(i + n) % n] : ps[Math.max(0, Math.min(n - 1, i))]; };
    var last = close ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6 * k, p1[1] + (p2[1] - p0[1]) / 6 * k];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6 * k, p2[1] - (p3[1] - p1[1]) / 6 * k];
      d += " C" + pt(c1) + " " + pt(c2) + " " + pt(p2);
    }
    return d + (close ? " Z" : "");
  }
  /* полоса толщиной w вдоль ломаной (трубы, перья, выхлоп) */
  function band(ps, w0, w1) {
    w1 = w1 == null ? w0 : w1;
    var left = [], right = [], n = ps.length;
    for (var i = 0; i < n; i++) {
      var a = ps[Math.max(0, i - 1)], b = ps[Math.min(n - 1, i + 1)];
      var nn = perp(norm(sub(b, a))), w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
      left.push(add(ps[i], mul(nn, w)));
      right.unshift(add(ps[i], mul(nn, -w)));
    }
    return S(left, false) + " L" + S(right, false).slice(1) + " Z";
  }
  function circ(c, r, a) { return '<circle cx="' + r1(c[0]) + '" cy="' + r1(-c[1]) + '" r="' + r1(r) + '"' + (a ? " " + a : "") + "/>"; }
  function path(d, a) { return '<path d="' + d + '"' + (a ? " " + a : "") + "/>"; }
  function ring(c, r0, r1_) {
    var x = r1(c[0]), y = r1(-c[1]);
    return "M" + (x - r1_) + "," + y + " a" + r1_ + "," + r1_ + " 0 1,0 " + 2 * r1_ + ",0 a" + r1_ + "," + r1_ + " 0 1,0 " + -2 * r1_ + ",0 Z " +
      "M" + (x - r0) + "," + y + " a" + r0 + "," + r0 + " 0 1,1 " + 2 * r0 + ",0 a" + r0 + "," + r0 + " 0 1,1 " + -2 * r0 + ",0 Z";
  }
  function hexRGB(h) { var n = parseInt(String(h || "#888888").slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  function shade(hex, k) {
    var c = hexRGB(hex);
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); };
    return "#" + c.map(function (v) { return f(v).toString(16).padStart(2, "0"); }).join("");
  }
  function lum(hex) { var c = hexRGB(hex); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  function grad(id, stops, x2, y2) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (x2 == null ? 0 : x2) + '" y2="' + (y2 == null ? 1 : y2) + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : "") + "/>"; }).join("") + "</linearGradient>";
  }
  function rgrad(id, stops, cx, cy, r) {
    return '<radialGradient id="' + id + '" cx="' + (cx || 0.5) + '" cy="' + (cy || 0.5) + '" r="' + (r || 0.5) + '">' +
      stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : "") + "/>"; }).join("") + "</radialGradient>";
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- геометрия классов (мм) ----------
     wb — база; rf/rr — радиус колеса с шиной; rimF/rimR — радиус обода; rake — наклон вилки;
     fl — от оси до верхней траверсы; lc — от оси до нижней траверсы; pv — ось маятника;
     seat — [x зад, x перед, высота]; tail — кончик заднего крыла */
  var GEO = {
    enduro: { wb: 1480, rf: 345, rr: 336, rimF: 267, rimR: 229, rake: 27, fl: 895, lc: 700, pv: [570, 452], seat: [150, 815, 952], tail: [-255, 975], tire: "knobby", body: "dirt" },
    cross:  { wb: 1485, rf: 345, rr: 340, rimF: 267, rimR: 241, rake: 27, fl: 900, lc: 705, pv: [575, 458], seat: [170, 830, 965], tail: [-205, 985], tire: "knobby", body: "dirt" },
    light:  { wb: 1420, rf: 335, rr: 322, rimF: 267, rimR: 229, rake: 27.5, fl: 840, lc: 655, pv: [545, 425], seat: [110, 790, 885], tail: [-270, 925], tire: "dual", body: "dirt" },
    motard: { wb: 1465, rf: 300, rr: 306, rimF: 216, rimR: 216, rake: 26.5, fl: 880, lc: 690, pv: [565, 445], seat: [150, 815, 925], tail: [-240, 950], tire: "road", body: "dirt" },
    pit:    { wb: 1180, rf: 288, rr: 270, rimF: 216, rimR: 178, rake: 26, fl: 705, lc: 545, pv: [445, 368], seat: [110, 640, 835], tail: [-160, 850], tire: "knobby", body: "dirt" },
    kids:   { wb: 985, rf: 238, rr: 226, rimF: 178, rimR: 152, rake: 26, fl: 585, lc: 450, pv: [370, 302], seat: [100, 530, 695], tail: [-160, 705], tire: "knobby", body: "dirt" },
    trial:  { wb: 1320, rf: 343, rr: 330, rimF: 267, rimR: 229, rake: 24, fl: 860, lc: 680, pv: [520, 430], seat: [360, 610, 690], tail: [-120, 760], tire: "trial", body: "trial" },
    tour:   { wb: 1520, rf: 345, rr: 336, rimF: 267, rimR: 229, rake: 27, fl: 900, lc: 700, pv: [600, 455], seat: [80, 790, 870], tail: [-250, 930], tire: "dual", body: "adv" },
    naked:  { wb: 1400, rf: 300, rr: 315, rimF: 216, rimR: 216, rake: 24.5, fl: 760, lc: 610, pv: [560, 440], seat: [110, 745, 810], tail: [-175, 905], tire: "road", body: "naked" },
    sport:  { wb: 1380, rf: 300, rr: 315, rimF: 216, rimR: 216, rake: 24, fl: 740, lc: 600, pv: [560, 450], seat: [110, 725, 820], tail: [-185, 945], tire: "road", body: "sport" },
    cruiser:{ wb: 1520, rf: 330, rr: 322, rimF: 241, rimR: 203, rake: 30, fl: 820, lc: 640, pv: [600, 360], seat: [300, 800, 700], tail: [-225, 640], tire: "road", body: "cruiser" },
    classic:{ wb: 1390, rf: 322, rr: 326, rimF: 241, rimR: 229, rake: 27, fl: 760, lc: 610, pv: [520, 400], seat: [130, 760, 805], tail: [-210, 720], tire: "road", body: "classic" },
    moped:  { wb: 1220, rf: 280, rr: 280, rimF: 216, rimR: 216, rake: 26, fl: 640, lc: 510, pv: [470, 330], seat: [60, 700, 770], tail: [-225, 720], tire: "road", body: "moped" }
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
    var two = E.stroke === "2T", liq = !!E.liquid, horiz = !!E.horiz && ["pit", "kids", "moped", "light"].indexOf(cls) >= 0;
    var layout = E.layout || "single";
    var dirt = g.body === "dirt";
    /* цвета */
    var body = C.body || "#D7262E", acc = C.accent || "#F4F5F2", fr = C.frame || "#23272C", seatC = C.seat || "#17191C";
    var rimC = C.rim || (dirt || g.body === "trial" ? "#1E2227" : "#2A2E33"), forkC = C.fork || (dirt ? "#C8962E" : "#C9CED4");
    var light = lum(body) > 0.72;
    var defs = [];
    defs.push(grad("ba-pl", [[0, shade(body, 0.28)], [0.45, body], [1, shade(body, -0.32)]]));
    defs.push(grad("ba-plh", [[0, "#fff", 0.55], [1, "#fff", 0]]));
    defs.push(grad("ba-ac", [[0, shade(acc, 0.25)], [0.5, acc], [1, shade(acc, -0.28)]]));
    defs.push(grad("ba-fr", [[0, shade(fr, 0.35)], [0.5, fr], [1, shade(fr, -0.35)]]));
    defs.push(grad("ba-seat", [[0, shade(seatC, 0.22)], [0.35, seatC], [1, shade(seatC, -0.4)]]));
    defs.push(grad("ba-chrome", [[0, "#F4F6F8"], [0.35, "#A9B0B8"], [0.55, "#E7EBEF"], [0.8, "#7E868F"], [1, "#C9CFD5"]]));
    defs.push(grad("ba-steel", [[0, "#E9D8B0"], [0.3, "#C7B08A"], [0.6, "#9C95B4"], [1, "#6C7086"]]));
    defs.push(grad("ba-alu", [[0, "#E3E7EB"], [0.4, "#AEB5BD"], [1, "#7A828B"]]));
    defs.push(grad("ba-dark", [[0, "#4A4F56"], [0.45, "#2B2F34"], [1, "#16181B"]]));
    defs.push(grad("ba-eng", [[0, E.dark ? "#4B5057" : "#D6DADF"], [0.5, E.dark ? "#2E3237" : "#A3AAB2"], [1, E.dark ? "#1C1F23" : "#6F7780"]]));
    defs.push(grad("ba-fu", [[0, shade(forkC, 0.35)], [0.5, forkC], [1, shade(forkC, -0.35)]], 1, 0));
    defs.push(grad("ba-fl", [[0, "#F2F4F6"], [0.45, "#B7BEC6"], [1, "#6D757E"]], 1, 0));
    defs.push(grad("ba-pipe", [[0, "#A7AEB6"], [0.35, "#5D646C"], [0.7, "#3A4047"], [1, "#1E2125"]]));
    defs.push(grad("ba-muff", [[0, "#5A6068"], [0.3, "#2B2F35"], [0.6, "#3D434A"], [1, "#15171A"]]));
    defs.push(rgrad("ba-tire", [[0.78, "#2A2C2F"], [0.93, "#1A1B1D"], [1, "#0E0F10"]]));
    defs.push(rgrad("ba-hub", [[0, "#F0F2F4"], [0.6, "#AAB1B9"], [1, "#6A727B"]], 0.4, 0.35, 0.65));
    defs.push(rgrad("ba-gshadow", [[0, "#000", 0.55], [1, "#000", 0]]));
    defs.push(grad("ba-glass", [[0, "#D8E6F2", 0.55], [1, "#7FA2C0", 0.18]]));
    defs.push(rgrad("ba-lamp", [[0, "#FFFFFF"], [0.5, "#DDE6EE"], [1, "#7D8A96"]], 0.4, 0.4, 0.6));

    /* ---------- опорные точки ---------- */
    var R = [0, g.rr], F = [g.wb, g.rf];
    var d = dir(90 + g.rake);                     /* вдоль вилки вверх */
    var q = [-d[1], d[0]];                          /* поперёк вилки, вперёд */
    q = q[0] < 0 ? mul(q, -1) : q;
    var at = function (t, s) { return add(add(F, mul(d, t)), mul(q, s || 0)); };
    var UC = at(g.fl), LC = at(g.lc);
    var HT = at(g.fl - 10, -32), HB = at(g.lc + 5, -32);      /* рулевая колонка */
    var PV = g.pv;
    var seat = g.seat;
    var out = [];                                   /* слои рисунка */
    var push = function (s) { out.push(s); };

    /* ---------- колёса ---------- */
    function knobs(c, Rt, n, deep) {
      var s = "", pitch = 360 / n;
      for (var i = 0; i < n; i++) {
        var a = i * pitch;
        var w = deep ? 26 : 20, h = deep ? 15 : 10, rr = Rt - h / 2;
        var p = polar(c, rr, a), t = dir(a + 90), nn = dir(a);
        var k = [add(add(p, mul(t, -w / 2)), mul(nn, -h / 2)), add(add(p, mul(t, w / 2)), mul(nn, -h / 2)), add(add(p, mul(t, w / 2 - 2)), mul(nn, h / 2)), add(add(p, mul(t, -w / 2 + 2)), mul(nn, h / 2))];
        s += L(k, true) + " ";
      }
      return s;
    }
    function spokes(c, rim, hub, n, twist, sideFar) {
      var s = "";
      for (var i = 0; i < n; i++) {
        var a = i * 360 / n + (sideFar ? 180 / n : 0), sgn = i % 2 ? 1 : -1;
        var p0 = polar(c, hub, a + sgn * twist), p1 = polar(c, rim - 10, a);
        s += "M" + pt(p0) + " L" + pt(p1) + " ";
      }
      return s;
    }
    function wheel(c, Rt, rim, front) {
      var s = "", tire = g.tire;
      var carcass = tire === "knobby" || tire === "trial" ? Rt - 12 : tire === "dual" ? Rt - 6 : Rt;
      s += circ(c, carcass, 'fill="url(#ba-tire)"');
      if (tire === "knobby") s += path(knobs(c, Rt, Math.round(2 * Math.PI * Rt / 44), true), 'fill="#1B1C1E"') + path(knobs(c, carcass - 14, Math.round(2 * Math.PI * Rt / 52), false), 'fill="#232527" opacity=".85"');
      else if (tire === "trial") s += path(knobs(c, Rt, Math.round(2 * Math.PI * Rt / 30), false), 'fill="#1B1C1E"');
      else if (tire === "dual") s += path(knobs(c, Rt, Math.round(2 * Math.PI * Rt / 40), false), 'fill="#1B1C1E"');
      else s += circ(c, Rt - 7, 'fill="none" stroke="#0B0C0D" stroke-width="3" opacity=".7"') + path("M" + pt(polar(c, Rt - 3, 150)) + " A" + (Rt - 3) + "," + (Rt - 3) + " 0 0,1 " + pt(polar(c, Rt - 3, 70)), 'fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="5"');
      /* боковина: блик и надпись-полоса */
      s += path("M" + pt(polar(c, carcass - 8, 160)) + " A" + (carcass - 8) + "," + (carcass - 8) + " 0 0,1 " + pt(polar(c, carcass - 8, 95)), 'fill="none" stroke="#fff" stroke-opacity=".09" stroke-width="10"');
      var spoked = !X.cast;
      if (spoked) {
        s += path(spokes(c, rim, 46, 36, 26, true), 'stroke="#6F767E" stroke-width="2.4" opacity=".75"');
      } else {
        /* литой диск: 5 сдвоенных спиц */
        var cs = "";
        for (var i = 0; i < 5; i++) {
          var a = 90 + i * 72;
          [-1, 1].forEach(function (sg) {
            var p0 = polar(c, 62, a + sg * 6), p1 = polar(c, rim - 16, a + sg * 14), p2 = polar(c, rim - 16, a + sg * 26), p3 = polar(c, 62, a + sg * 16);
            cs += S([p0, lerp(p0, p1, 0.5), p1, p2, lerp(p3, p2, 0.5), p3], true, 0.6) + " ";
          });
        }
        s += path(cs, 'fill="' + rimC + '" stroke="' + shade(rimC, -0.4) + '" stroke-width="2"');
      }
      /* обод */
      s += path(ring(c, rim - 16, rim + 3), 'fill="' + rimC + '" fill-rule="evenodd"');
      s += path(ring(c, rim - 4, rim + 1), 'fill="#fff" fill-opacity=".14" fill-rule="evenodd"');
      if (spoked) s += path(spokes(c, rim, 46, 36, 26, false), 'stroke="#C9CED4" stroke-width="2.6"');
      /* ступица */
      s += circ(c, 58, 'fill="url(#ba-hub)" stroke="#5A6169" stroke-width="2"');
      s += circ(c, 40, 'fill="none" stroke="#7E868F" stroke-width="3"');
      /* задний тормозной диск — с правой стороны */
      if (!front) {
        var dr = Math.min(rim - 30, cls === "naked" || cls === "sport" || cls === "tour" ? 125 : 112);
        var pet = "", N = 18;
        for (var j = 0; j < N; j++) { var a0 = j * 360 / N; pet += (j ? " L" : "M") + pt(polar(c, dr, a0)) + " L" + pt(polar(c, dr - 7, a0 + 360 / N / 2)); }
        s += path(pet + " Z", 'fill="#9AA2AA" stroke="#5E666E" stroke-width="1.5"');
        s += circ(c, dr - 26, 'fill="none" stroke="#C3C9CF" stroke-width="20" stroke-dasharray="6 9" opacity=".55"');
        s += circ(c, dr - 40, 'fill="#3A3F45"');
        for (var h = 0; h < 6; h++) s += circ(polar(c, 50, h * 60 + 15), 6, 'fill="#1E2125"');
        /* суппорт и кронштейн */
        var ca = 222;
        var cp = polar(c, dr - 14, ca);
        s += path(band([polar(c, 30, ca + 20), polar(c, dr - 30, ca + 8)], 30), 'fill="url(#ba-dark)"');
        s += path(S([polar(cp, 36, ca - 70), polar(cp, 34, ca + 10), polar(cp, 30, ca + 80), polar(cp, 20, ca + 150), polar(cp, 22, ca - 140)], true), 'fill="' + (X.caliper || "#2E3238") + '" stroke="#111" stroke-width="1.5"');
        s += circ(polar(cp, 10, ca), 6, 'fill="#9AA2AA"');
      } else if (X.frontDisc) {
        var fd = rim - 40;
        s += circ(c, fd, 'fill="none" stroke="#A9B0B8" stroke-width="26"');
        s += circ(c, fd, 'fill="none" stroke="#2C3036" stroke-width="20" stroke-dasharray="4 10" opacity=".5"');
        for (var b = 0; b < 8; b++) s += circ(polar(c, fd - 22, b * 45), 5, 'fill="#D7DBE0"');
        var fc = polar(c, fd, 128);
        s += path(S([polar(fc, 44, 40), polar(fc, 42, 120), polar(fc, 40, 200), polar(fc, 40, 290)], true), 'fill="' + (X.caliper || "#C8962E") + '" stroke="#111" stroke-width="1.5"');
      }
      s += circ(c, 17, 'fill="#1E2125" stroke="#8A929A" stroke-width="3"');
      return s;
    }
    /* тень */
    push('<ellipse cx="' + r1(g.wb / 2) + '" cy="6" rx="' + r1(g.wb / 2 + g.rr + 60) + '" ry="34" fill="url(#ba-gshadow)"/>');

    /* ---------- маятник и задняя подвеска ---------- */
    var twin = g.body === "classic" || g.body === "moped" || g.body === "cruiser" || X.twinShock;
    function swingarm() {
      var s = "";
      var top0 = add(PV, [0, 36]), bot0 = add(PV, [0, -34]), top1 = add(R, [0, 30]), bot1 = add(R, [0, -22]);
      var alu = X.swingAlu !== false && !twin;
      var sw = S([add(PV, [-30, 0]), top0, lerp(top0, top1, 0.5), top1, add(R, [-46, 4]), bot1, lerp(bot0, bot1, 0.55), bot0], true, 0.6);
      s += path(sw, 'fill="' + (alu ? "url(#ba-alu)" : "url(#ba-dark)") + '" stroke="' + (alu ? "#5D646C" : "#0F1113") + '" stroke-width="2"');
      s += path(L([lerp(top0, top1, 0.12), lerp(top0, top1, 0.88)]), 'stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"');
      /* натяжитель цепи и ось */
      s += path(L([add(R, [-16, -14]), add(R, [42, -14]), add(R, [42, 14]), add(R, [-16, 14])], true), 'fill="#2B2F34" stroke="#111" stroke-width="1.5"');
      s += circ(PV, 18, 'fill="#1E2125" stroke="#8A929A" stroke-width="3"');
      return s;
    }
    function coil(bot, top, rad, n, col, t0, t1) {
      var ax = norm(sub(top, bot)), nn = perp(ax), s = "", back = "";
      for (var i = 0; i < n; i++) {
        var c = lerp(bot, top, t0 + (t1 - t0) * (i + 0.5) / n), c2 = lerp(bot, top, t0 + (t1 - t0) * (i + 1) / n);
        var a = add(c, mul(nn, -rad)), b = add(c2, mul(nn, rad));
        back += "M" + pt(add(c, mul(nn, rad))) + " L" + pt(add(lerp(c, c2, 0.5), mul(nn, -rad))) + " ";
        s += "M" + pt(a) + " Q" + pt(add(lerp(a, b, 0.5), mul(ax, 6))) + " " + pt(b) + " ";
      }
      return path(back, 'stroke="' + shade(col, -0.45) + '" stroke-width="' + r1(rad * 0.38) + '" stroke-linecap="round"') +
        path(s, 'stroke="' + col + '" stroke-width="' + r1(rad * 0.42) + '" stroke-linecap="round" fill="none"') +
        path(s, 'stroke="#fff" stroke-opacity=".38" stroke-width="' + r1(rad * 0.12) + '" stroke-linecap="round" fill="none" transform="translate(0 -3)"');
    }
    function monoShock() {
      var top = add(PV, [60 * sc, seat[2] - PV[1] - 160 * sc]), bot = add(PV, [-150 * sc, 24 * sc]);
      var s = "";
      s += path(band([bot, top], 30 * sc), 'fill="url(#ba-dark)"');
      s += path(band([lerp(bot, top, 0.08), lerp(bot, top, 0.3)], 22 * sc), 'fill="url(#ba-chrome)"');
      s += coil(bot, top, 30 * sc, 8, X.spring || "#E8C21E", 0.24, 0.82);
      s += path(band([lerp(bot, top, 0.82), top], 46 * sc), 'fill="#2B2F34"');
      s += circ(top, 14, 'fill="#1E2125" stroke="#8A929A" stroke-width="3"') + circ(bot, 13, 'fill="#1E2125" stroke="#8A929A" stroke-width="3"');
      if (dirt && cls !== "kids") s += path(band([bot, add(PV, [-40, -60]), add(PV, [10, -30])], 22 * sc), 'fill="#2C3036" stroke="#111" stroke-width="1.5"');
      return { s: s, mid: lerp(bot, top, 0.5) };
    }
    function twinShock() {
      var bot = add(R, [36, 36]), top = [R[0] + 70, seat[2] - 80];
      var s = path(band([bot, top], 26), 'fill="url(#ba-dark)"');
      s += coil(bot, top, 24, 8, "#C9CFD5", 0.18, 0.8);
      s += circ(top, 12, 'fill="#1E2125"') + circ(bot, 12, 'fill="#1E2125"');
      return { s: s, mid: lerp(bot, top, 0.5) };
    }

    /* ---------- двигатель ---------- */
    var eb = Math.max(g.rr * 0.92, PV[1] - 120);       /* низ картера */
    var sc = cls === "pit" ? 0.82 : cls === "kids" ? 0.62 : cls === "moped" ? 0.72 : 1;
    var cc = E.cc || 250, big = Math.min(1.45, Math.max(0.8, Math.pow(cc / 250, 0.22)));
    var EK = sc * big;                                  /* масштаб мотора */
    var ex0 = PV[0] + 40 * sc, ex1 = Math.min(g.wb - g.rf - 30, ex0 + 400 * EK);
    var eTop = eb + 260 * EK;
    var engine = { port: null, center: [(ex0 + ex1) / 2, (eb + eTop) / 2], head: null };
    function fins(c, ax, w, h, n, col) {
      var s = "", nn = perp(ax);
      for (var i = 0; i < n; i++) {
        var p = add(c, mul(ax, -h / 2 + h * (i + 0.5) / n));
        s += "M" + pt(add(p, mul(nn, -w / 2))) + " L" + pt(add(p, mul(nn, w / 2))) + " ";
      }
      return path(s, 'stroke="' + col + '" stroke-width="' + r1(Math.max(5, h / n * 0.55)) + '" stroke-linecap="round"');
    }
    function cylinder(base, ang, w, h, opts) {
      var ax = dir(ang), nn = perp(ax), s = "";
      var b0 = add(base, mul(nn, -w / 2)), b1 = add(base, mul(nn, w / 2)), t1 = add(b1, mul(ax, h)), t0 = add(b0, mul(ax, h));
      s += path(L([b0, b1, t1, t0], true), 'fill="url(#ba-eng)" stroke="#3F454C" stroke-width="2"');
      if (!opts.liq) s += fins(lerp(base, add(base, mul(ax, h)), 0.48), ax, w + 46, h * 0.86, Math.round(h / 22), opts.finC || "#B9C0C8");
      else s += path(L([lerp(b0, t0, 0.15), lerp(b1, t1, 0.15)]), 'stroke="#fff" stroke-opacity=".25" stroke-width="4"');
      /* головка и крышка клапанов */
      var hb = add(base, mul(ax, h)), hw = w + 30, hh = h * 0.42;
      var h0 = add(hb, mul(nn, -hw / 2)), h1 = add(hb, mul(nn, hw / 2)), h2 = add(h1, mul(ax, hh)), h3 = add(h0, mul(ax, hh));
      s += path(S([h0, h1, add(h1, mul(ax, hh * 0.55)), add(lerp(h2, h3, 0.15), mul(ax, 6)), add(lerp(h2, h3, 0.85), mul(ax, 6)), add(h0, mul(ax, hh * 0.55))], true, 0.5), 'fill="url(#ba-eng)" stroke="#3F454C" stroke-width="2"');
      if (!opts.liq) s += fins(add(hb, mul(ax, hh * 0.35)), ax, hw + 20, hh * 0.55, 3, opts.finC || "#B9C0C8");
      var vc = add(hb, mul(ax, hh * 0.92));
      s += path(S([add(vc, mul(nn, -hw * 0.42)), add(add(vc, mul(nn, -hw * 0.3)), mul(ax, 26)), add(add(vc, mul(nn, hw * 0.3)), mul(ax, 26)), add(vc, mul(nn, hw * 0.42))], false, 0.8) + " Z", 'fill="' + (opts.vc || "#2B2F34") + '" stroke="#111" stroke-width="1.5"');
      return { s: s, top: add(hb, mul(ax, hh)), port: add(add(hb, mul(ax, hh * 0.35)), mul(nn, hw / 2)), intake: add(add(hb, mul(ax, hh * 0.45)), mul(nn, -hw / 2)), ax: ax, nn: nn, hb: hb };
    }
    function drawEngine() {
      var s = "";
      var w = ex1 - ex0;
      /* картер */
      var ck = S([[ex0 + 20, eb], [ex1 - 30, eb + 6], [ex1, eb + 60 * EK], [ex1 - 6, eb + 170 * EK], [ex1 - 80 * EK, eTop - 30], [ex0 + 120 * EK, eTop - 10], [ex0, eb + 170 * EK], [ex0 - 6, eb + 70 * EK]], true, 0.7);
      s += path(ck, 'fill="url(#ba-eng)" stroke="#3B4148" stroke-width="2.5"');
      /* крышка сцепления справа и пробки */
      var cc0 = [ex0 + w * 0.62, eb + 120 * EK];
      s += circ(cc0, 92 * EK, 'fill="' + (E.dark ? "#30353B" : "#C3C9CF") + '" stroke="#4A5058" stroke-width="3"');
      s += circ(cc0, 70 * EK, 'fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3"');
      for (var i = 0; i < 8; i++) s += circ(polar(cc0, 84 * EK, i * 45 + 10), 5 * EK + 1, 'fill="#5E666E"');
      s += circ([ex0 + w * 0.3, eb + 92 * EK], 30 * EK, 'fill="' + (E.dark ? "#3A4046" : "#D2D7DC") + '" stroke="#5A6169" stroke-width="2"');
      s += circ([ex1 - 40 * EK, eb + 40 * EK], 14 * EK, 'fill="#C8962E" stroke="#6E5420" stroke-width="2"');
      /* цилиндры */
      var cy;
      if (horiz) {
        cy = cylinder([ex1 - 70 * EK, eTop - 70 * EK], -8, 120 * EK, 150 * EK, { liq: liq });
      } else if (layout === "vtwin") {
        var c1 = cylinder([ex0 + w * 0.6, eTop - 40], 90 - 26, 110 * EK, 140 * EK, { liq: liq });
        var c2 = cylinder([ex0 + w * 0.4, eTop - 40], 90 + 24, 110 * EK, 140 * EK, { liq: liq });
        s += c2.s; cy = c1;
      } else if (layout === "boxer") {
        cy = cylinder([ex1 - 40 * EK, eb + 150 * EK], 10, 120 * EK, 120 * EK, { liq: false });
      } else {
        var tilt = layout === "i4" ? 90 - 32 : layout === "twin" || layout === "i3" ? 90 - 22 : two ? 90 - 14 : 90 - 12;
        var cw = (layout === "i4" ? 170 : layout === "twin" || layout === "i3" ? 150 : 118) * EK;
        cy = cylinder([ex0 + w * (layout === "single" ? 0.66 : 0.6), eTop - 26], tilt, cw, (two ? 170 : 190) * EK, { liq: liq });
      }
      s += cy.s;
      engine.port = cy.port; engine.head = cy.top; engine.intake = cy.intake;
      /* стартер-кик справа */
      if (X.kick) {
        var ks = [ex0 + 50 * EK, eb + 150 * EK];
        s += path(band([ks, add(ks, [-150 * EK, 120 * EK])], 16), 'fill="#2E3238" stroke="#111" stroke-width="1"');
        s += circ(ks, 16, 'fill="#1E2125"');
      }
      /* карбюратор / дроссель за цилиндром */
      var cb = add(cy.intake, mul(cy.nn, -50 * EK));
      s += path(band([cy.intake, cb], 46 * EK), 'fill="#2B2F34"');
      s += path(L([add(cb, [-34 * EK, -30 * EK]), add(cb, [24 * EK, -30 * EK]), add(cb, [28 * EK, 34 * EK]), add(cb, [-30 * EK, 34 * EK])], true), 'fill="' + (E.efi ? "#2E3238" : "url(#ba-alu)") + '" stroke="#3F454C" stroke-width="2"');
      /* радиатор у жидкостных: виден под пластиком спереди */
      return s;
    }
    function radiator() {
      if (!liq || g.body === "cruiser" || g.body === "classic") return "";
      var fs = cls === "kids" ? 0.68 : cls === "pit" ? 0.82 : 1;
      var t0 = g.lc - 60 * fs, t1 = g.lc - 330 * fs, s0 = -165 * fs, s1 = -265 * fs;
      var c = [at(t0, s0), at(t1, s0), at(t1, s1), at(t0, s1)];
      var s = path(L(c, true), 'fill="#1F2327" stroke="#0B0C0D" stroke-width="3"');
      var gr = "";
      for (var i = 1; i < 12; i++) { var k = i / 12; gr += "M" + pt(lerp(c[0], c[1], k)) + " L" + pt(lerp(c[3], c[2], k)) + " "; }
      s += path(gr, 'stroke="#3B4148" stroke-width="5"');
      s += path(L([lerp(c[0], c[3], 0.5), lerp(c[1], c[2], 0.5)]), 'stroke="#4A5058" stroke-width="3"');
      /* патрубок к головке */
      s += path(band([lerp(c[2], c[3], 0.3), add(lerp(c[2], c[3], 0.3), [-90 * fs, 40 * fs])], 26 * fs), 'fill="#111315"');
      return s;
    }
    /* ---------- выхлоп ---------- */
    function exhaust() {
      var s = "", P = engine.port || [ex1, eTop];
      var muff = mods.indexOf("slip") >= 0 || mods.indexOf("full") >= 0 || mods.indexOf("silencer2t") >= 0 ? "carbon" : "std";
      var hdrFill = mods.indexOf("full") >= 0 ? "url(#ba-steel)" : "url(#ba-chrome)";
      if (two && (dirt || g.body === "trial")) {
        /* резонатор 2Т: от цилиндра вниз-назад вдоль мотора, затем глушитель под сиденьем */
        var p0 = P, p1 = add(P, [70, -60]), p2 = [ex1 + 30, eb + 70], p3 = [ex0 + (ex1 - ex0) * 0.55, eb + 20], p4 = [ex0 - 10, eb + 110], p5 = [PV[0] - 40, seat[2] - 290];
        s += path(band([p0, p1, p2, p3, p4, p5], 44 * sc, 34 * sc), 'fill="url(#ba-pipe)" stroke="#202327" stroke-width="2"');
        s += path(band([p1, p2, p3, p4], 118 * sc, 86 * sc), 'fill="url(#ba-pipe)" stroke="#202327" stroke-width="2"');
        s += path(band([lerp(p1, p2, 0.3), p2, lerp(p2, p3, 0.6)], 22 * sc), 'fill="#fff" opacity=".22"');
        var m0 = [PV[0] - 60 * sc, seat[2] - 300 * sc], m1 = [R[0] + 60 * sc, seat[2] - 210 * sc];
        s += silencer(m0, m1, 78 * sc, muff);
      } else if (dirt) {
        /* 4Т эндуро/питбайк: коллектор вперёд-вниз, назад вдоль мотора, вверх к высокому глушителю */
        var h0 = P, h1 = add(P, [46 * sc, -44 * sc]), h2 = [ex1 + 6, eTop + 40 * sc], h3 = [ex1 - 90 * sc, eTop - 36 * sc], h4 = [ex0 + 70 * sc, eTop + 6 * sc], h5 = [PV[0] - 30, seat[2] - 300 * sc];
        if (horiz) { h1 = add(P, [40 * sc, -40 * sc]); h2 = [ex1 + 20, eb + 30 * sc]; h3 = [ex0 + (ex1 - ex0) * 0.5, eb - 6]; h4 = [ex0 - 30, eb + 60 * sc]; }
        var a0 = [PV[0] - 110 * sc, seat[2] - 345 * sc], a1 = [R[0] + 30 * sc, seat[2] - 225 * sc];
        h5 = add(a0, [40 * sc, -10 * sc]);
        s += path(band([h0, h1, h2, h3, h4, h5], 42 * sc), 'fill="' + hdrFill + '" stroke="#3C4249" stroke-width="2"');
        s += path(band([lerp(h0, h1, 0.2), h1, h2], 26 * sc), 'fill="url(#ba-steel)" opacity=".75"');
        s += silencer(a0, a1, 104 * sc, muff);
      } else if (g.body === "adv" || g.body === "naked" || g.body === "sport") {
        var k0 = P, k1 = add(P, [50, -110]), k2 = [ex1 - 10, eb + 50], k3 = [ex1 - 130, eb - 4];
        if (layout === "i4") for (var j = 1; j < 4; j++) s += path(band([add(k0, [-j * 22, -j * 10]), add(k1, [-j * 20, -j * 10]), add(k2, [-j * 10, j * 6])], 30), 'fill="url(#ba-steel)" stroke="#3C4249" stroke-width="1.5"');
        if (g.body === "naked") {
          /* MT-07, Z650: глушитель под мотором */
          s += path(band([k0, k1, k2, k3], 44), 'fill="url(#ba-chrome)" stroke="#3C4249" stroke-width="2"');
          s += path(band([k0, k1], 30), 'fill="url(#ba-steel)" opacity=".8"');
          s += path(S([[ex0 + 40, eb - 46], [ex1 - 110, eb - 40], [ex1 - 90, eb + 40], [ex0 + 60, eb + 50]], true, 0.4), 'fill="url(#ba-muff)" stroke="#111" stroke-width="2"');
          engine.tip = [ex0 + 30, eb];
        } else {
          var m0 = g.body === "sport" ? [PV[0] - 40, PV[1] + 40] : [PV[0] - 10, PV[1] + 120], m1 = g.body === "sport" ? [R[0] + 160, PV[1] + 190] : [R[0] + 60, PV[1] + 300];
          s += path(band([k0, k1, k2, k3, [ex0 + 40, eb + 20], add(m0, [60, -20])], 44), 'fill="url(#ba-chrome)" stroke="#3C4249" stroke-width="2"');
          s += path(band([k0, k1], 30), 'fill="url(#ba-steel)" opacity=".8"');
          s += silencer(m0, m1, g.body === "sport" ? 116 : 124, muff);
        }
      } else if (g.body === "cruiser") {
        var cp1 = add(P, [50, -110]), cpE = [R[0] - 120, R[1] + 70];
        s += path(band([P, cp1, [ex1 - 60, eb + 10], [ex0, eb + 4], cpE], 48), 'fill="url(#ba-chrome)" stroke="#5E666E" stroke-width="2"');
        s += path(band([add(P, [-120, 40]), add(cp1, [-110, 30]), [ex0 + 60, eb + 60], [R[0] - 40, R[1] + 140]], 44), 'fill="url(#ba-chrome)" stroke="#5E666E" stroke-width="2"');
      } else {
        /* классика и мопед: низкая длинная труба */
        var l1 = add(P, [40, -80]), l2 = [ex1 - 30, eb - 10], l3 = [ex0, eb - 4];
        s += path(band([P, l1, l2, l3], 40 * sc), 'fill="url(#ba-chrome)" stroke="#5E666E" stroke-width="2"');
        s += silencer([ex0 + 20, eb - 2], [R[0] - 80 * sc, R[1] + 40 * sc], 96 * sc, "chrome");
      }
      return s;
    }
    function silencer(a, b, dia, kind) {
      var ax = norm(sub(b, a)), nn = perp(ax), s = "";
      var c0 = add(a, mul(nn, dia / 2)), c1 = add(b, mul(nn, dia / 2 - 6)), c2 = add(b, mul(nn, -dia / 2 + 6)), c3 = add(a, mul(nn, -dia / 2));
      var fill = kind === "carbon" ? "url(#ba-dark)" : kind === "chrome" ? "url(#ba-chrome)" : X.muffCol === "alu" ? "url(#ba-alu)" : "url(#ba-muff)";
      s += path(S([add(a, mul(ax, -24)), c0, lerp(c0, c1, 0.5), c1, add(b, mul(ax, 14)), c2, lerp(c3, c2, 0.5), c3], true, 0.55), 'fill="' + fill + '" stroke="#202327" stroke-width="2"');
      s += path(L([add(lerp(c0, c1, 0.08), mul(nn, -8)), add(lerp(c0, c1, 0.9), mul(nn, -8))]), 'stroke="#fff" stroke-opacity=".3" stroke-width="5" stroke-linecap="round"');
      /* хомуты и торцевая крышка */
      [0.12, 0.86].forEach(function (t) { var p = lerp(a, b, t); s += path(L([add(p, mul(nn, dia / 2)), add(p, mul(nn, -dia / 2))]), 'stroke="#9AA2AA" stroke-width="7"'); });
      var tip = add(b, mul(ax, 34));
      s += path(band([add(b, mul(ax, 6)), tip], dia * 0.36), 'fill="url(#ba-chrome)" stroke="#3C4249" stroke-width="1.5"');
      s += circ(tip, dia * 0.12, 'fill="#0E0F10"');
      engine.tip = tip;
      return s;
    }

    /* ---------- рама ---------- */
    function frame() {
      var s = "";
      var W = cls === "kids" ? 20 : cls === "pit" ? 26 : 32;
      var spar0 = lerp(HT, HB, 0.5), back = [PV[0] + 70 * sc, seat[2] - 190 * sc], pvTop = add(PV, [30, 60]);
      var down = [Math.min(ex1 + 40, HB[0] - 60), eb + 20];
      if (g.body === "moped") {
        /* мопед: рама-хребет под пластиком — видна только снизу */
        s += path(band([HB, [ex1 + 30, eb + 160], [PV[0] + 60, PV[1] + 60]], 46), 'fill="url(#ba-fr)"');
        return s;
      }
      if (g.body === "naked" || g.body === "sport" || g.body === "adv" || g.body === "cruiser" || g.body === "classic") {
        /* хребет под баком и подрамник; рама дорожных — тёмная, если у марки нет своего цвета рамы */
        var tb = [PV[0] + 120, seat[2] - 120];
        s += path(band([lerp(HT, HB, 0.5), lerp(HT, tb, 0.5), tb, pvTop], W), 'fill="url(#ba-fr)" stroke="' + shade(fr, -0.5) + '" stroke-width="2"');
        if (X.trellis) {
          var tr = "";
          for (var i = 0; i < 4; i++) { var p0 = lerp(HB, pvTop, i / 4), p1 = lerp(HT, tb, (i + 1) / 4); tr += "M" + pt(p0) + " L" + pt(p1) + " "; }
          s += path(tr, 'stroke="' + fr + '" stroke-width="16" stroke-linecap="round"');
        }
        s += path(band([HB, [ex1 + 30, eb + 150], [ex1 - 20, eb - 6]], W - 6), 'fill="url(#ba-fr)"');
        var sr2 = [seat[0] + 60, seat[2] - 60];
        s += path(band([tb, sr2], W - 10), 'fill="url(#ba-fr)"');
        return s;
      } else {
        s += path(band([spar0, lerp(spar0, back, 0.5), back, pvTop, add(PV, [10, -30])], W), 'fill="url(#ba-fr)" stroke="' + shade(fr, -0.5) + '" stroke-width="2"');
        s += path(band([HB, lerp(HB, down, 0.5), down, [ex0 + 30, eb - 8], add(PV, [-10, -40])], W - 4), 'fill="url(#ba-fr)" stroke="' + shade(fr, -0.5) + '" stroke-width="2"');
      }
      /* подрамник под сиденьем */
      var sr = [seat[0] + 40, seat[2] - 80];
      s += path(band([back, sr], W - 8), 'fill="url(#ba-fr)"');
      s += path(band([pvTop, sr], W - 12), 'fill="url(#ba-fr)"');
      return s;
    }

    /* ---------- вилка ---------- */
    function fork() {
      var s = "", usd = X.usd !== false && (dirt || g.body === "naked" || g.body === "sport" || g.body === "adv" || g.body === "trial");
      if (X.usd === false) usd = false;
      var wO = (usd ? 54 : 46) * (cls === "kids" ? 0.65 : cls === "pit" ? 0.8 : 1), wI = (usd ? 36 : 40) * (cls === "kids" ? 0.65 : cls === "pit" ? 0.8 : 1);
      var split = usd ? g.fl * 0.38 : g.fl * 0.44;
      var top = g.fl + 22;
      if (usd) {
        s += path(band([at(split), at(top)], wO), 'fill="url(#ba-fu)" stroke="#202327" stroke-width="2"');
        s += path(band([at(-10), at(split + 10)], wI), 'fill="url(#ba-fl)" stroke="#4A5058" stroke-width="1.5"');
        /* башмак с осью */
        s += path(S([at(-40, -26), at(-40, 30), at(60, 34), at(90, 18), at(90, -24), at(30, -32)], true, 0.6), 'fill="#23272C" stroke="#111" stroke-width="1.5"');
        if (dirt && cls !== "motard") s += path(S([at(40, 14), at(330, 24), at(360, 38), at(340, 52), at(60, 46)], true, 0.6), 'fill="' + (X.guard || "url(#ba-dark)") + '" stroke="#111" stroke-width="1.5"');
      } else {
        s += path(band([at(split - 20), at(top)], wI * 0.9), 'fill="url(#ba-fl)" stroke="#4A5058" stroke-width="1.5"');
        if (g.body === "classic" || g.body === "cruiser") s += path(band([at(split - 30), at(split + 150)], wO + 12), 'fill="#1B1D20" stroke="#000" stroke-width="1"');
        s += path(band([at(-30), at(split)], wO), 'fill="' + (g.body === "cruiser" || g.body === "classic" ? "url(#ba-chrome)" : "url(#ba-alu)") + '" stroke="#3F454C" stroke-width="2"');
      }
      /* траверсы */
      [g.lc, g.fl].forEach(function (t, i) {
        s += path(L([at(t - 22, wO / 2 + 6), at(t + 22, wO / 2 + 6), at(t + 18 - i * 6, -60), at(t - 18, -60)], true), 'fill="' + (i ? "#2A2E33" : "#1E2125") + '" stroke="#0B0C0D" stroke-width="2"');
      });
      s += path(band([at(top - 10), at(top + 8)], wO * 0.82), 'fill="#1B1D20" stroke="#6A727B" stroke-width="2"');
      s += circ(F, 17, 'fill="#1E2125" stroke="#8A929A" stroke-width="3"');
      return s;
    }

    /* ---------- руль ---------- */
    function cockpit() {
      var s = "", fs = cls === "kids" ? 0.68 : cls === "pit" ? 0.82 : 1;
      var bc = at(g.fl + 14, -40);
      var clip = g.body === "sport";
      var grip;
      if (clip) {
        var cl = at(g.fl - 20, -10);
        grip = add(cl, [-110, 10]);
        s += path(band([cl, grip], 28), 'fill="#1E2125"');
      } else {
        var rise = (cls === "cruiser" ? 200 : g.body === "classic" || cls === "moped" ? 100 : 62) * fs;
        var back = (cls === "cruiser" ? 220 : g.body === "classic" ? 110 : 58) * fs;
        grip = add(bc, [-back, rise]);
        /* стойки руля и руль */
        s += path(L([add(bc, [-20, -16]), add(bc, [22, -16]), add(bc, [18, 22]), add(bc, [-16, 22])], true), 'fill="#2A2E33" stroke="#0B0C0D" stroke-width="1.5"');
        s += path(band([add(bc, [4, 10]), add(bc, [-back * 0.35, rise * 0.85]), grip], 22 * fs + 4), 'fill="' + (dirt || g.body === "trial" ? "url(#ba-alu)" : "url(#ba-chrome)") + '" stroke="#3F454C" stroke-width="1.5"');
        if (dirt) s += path(band([add(bc, [-4, 30]), add(bc, [-back * 0.5, rise * 0.7])], 14 * fs + 2), 'fill="#2A2E33"');
      }
      /* грипса, бачок, рычаг тормоза вперёд-вниз */
      s += path(band([add(grip, [12, 0]), add(grip, [-40 * fs, 6])], 34 * fs + 4), 'fill="#141619"');
      s += path(L([add(grip, [18, 6]), add(grip, [58, 4]), add(grip, [56, 34]), add(grip, [20, 34])], true), 'fill="#1E2125" stroke="#000" stroke-width="1"');
      s += path(band([add(grip, [40, 2]), add(grip, [150 * fs, -26 * fs])], 10), 'fill="#9AA2AA"');
      /* защита рук */
      if (X.handguards) {
        var hg = S([add(grip, [-30 * fs, 4 * fs]), add(grip, [50 * fs, 30 * fs]), add(grip, [150 * fs, 22 * fs]), add(grip, [190 * fs, -8 * fs]), add(grip, [170 * fs, -22 * fs]), add(grip, [90 * fs, -6 * fs]), add(grip, [10 * fs, -18 * fs])], true, 0.8);
        s += path(hg, 'fill="' + (X.hgCol || "url(#ba-ac)") + '" stroke="#202327" stroke-width="2"');
        s += path(S([add(grip, [0, 0]), add(grip, [80 * fs, 18 * fs]), add(grip, [170 * fs, 6 * fs])], false), 'stroke="#fff" stroke-opacity=".35" stroke-width="4" fill="none"');
      }
      if (X.mirrors) {
        var m0 = add(grip, [40, 10]), m1 = add(grip, [-30, 170]);
        s += path(band([m0, m1], 9), 'fill="#1E2125"');
        s += path(S([add(m1, [-50, 10]), add(m1, [40, 36]), add(m1, [70, 0]), add(m1, [10, -26])], true), 'fill="#1E2125" stroke="#8A929A" stroke-width="2"');
      }
      return { s: s, grip: grip, bc: bc };
    }

    /* ---------- кузов: эндуро, кросс, питбайк, мотард, лёгкий эндуро ---------- */
    function dirtBody() {
      var s = "", fs = cls === "kids" ? 0.68 : cls === "pit" ? 0.82 : 1;
      var sy = seat[2], sx0 = seat[0], sx1 = seat[1], T = g.tail;
      var fender = X.fenderCol || "url(#ba-pl)", fenderS = shade(X.fenderCol || body, -0.55);
      /* заднее крыло: толще у боковины, тонкий кончик */
      var rf = S([[sx0 + 70, sy - 20], [sx0 - 90 * fs, sy - 12], [T[0] + 90 * fs, T[1] - 4], [T[0], T[1]], [T[0] - 4, T[1] - 26 * fs], [T[0] + 60 * fs, T[1] - 44 * fs], [sx0 - 140 * fs, sy - 86 * fs], [sx0 + 60, sy - 112 * fs]], true, 0.75);
      s += path(rf, 'fill="' + fender + '" stroke="' + fenderS + '" stroke-width="2"');
      s += path(S([[T[0] + 20, T[1] - 6], [sx0 - 80 * fs, sy - 18], [sx0 + 40, sy - 26]], false), 'stroke="#fff" stroke-opacity=".45" stroke-width="5" fill="none" stroke-linecap="round"');
      if (X.lights !== "none" && cls !== "cross" && cls !== "pit" && cls !== "kids") {
        /* фонарь под кончиком крыла, держатель номера, поворотники */
        s += path(S([add(T, [26 * fs, -30 * fs]), add(T, [110 * fs, -42 * fs]), add(T, [104 * fs, -70 * fs]), add(T, [34 * fs, -56 * fs])], true, 0.5), 'fill="#C8102E" stroke="#5A0613" stroke-width="2"');
        if (X.plate) {
          var h0 = add(T, [150 * fs, -40 * fs]), h1 = add(T, [120 * fs, -230 * fs]);
          s += path(S([add(h0, [-40, 0]), add(h0, [50, -10]), add(h1, [60, 10]), add(h1, [-60, 20])], true, 0.4), 'fill="#17191C" stroke="#000" stroke-width="2"');
          var pc = add(h1, [0, 10]);
          s += path(L([add(pc, [-95 * fs, 40 * fs]), add(pc, [95 * fs, 52 * fs]), add(pc, [100 * fs, -60 * fs]), add(pc, [-90 * fs, -72 * fs])], true), 'fill="#ECEFF1" stroke="#22262B" stroke-width="5"');
          s += path(L([add(pc, [-80 * fs, 30 * fs]), add(pc, [80 * fs, 40 * fs])]), 'stroke="#C8102E" stroke-width="6"');
        }
        if (X.signals) [[170, -60], [60, -66]].forEach(function (o2) { var b0 = add(T, [o2[0] * fs, o2[1] * fs]); s += path(band([b0, add(b0, [-10, -70])], 10), 'fill="#17191C"') + path(S([add(b0, [-34, -64]), add(b0, [14, -64]), add(b0, [16, -96]), add(b0, [-30, -96])], true), 'fill="#F59E0B" stroke="#7A4A06" stroke-width="2"'); });
      }
      /* боковина под сиденьем */
      var p0 = [sx0 - 10, sy - 60 * fs], p1 = [PV[0] + 90 * fs, sy - 64 * fs], p2 = [PV[0] + 20 * fs, PV[1] + 230 * fs], p3 = [PV[0] - 120 * fs, PV[1] + 170 * fs], p4 = [sx0 + 150 * fs, PV[1] + 235 * fs], p5 = [sx0 - 60 * fs, sy - 150 * fs];
      var side = S([p0, p1, p2, p3, p4, p5], true, 0.7);
      s += path(side, 'fill="' + (X.sideCol || "url(#ba-pl)") + '" stroke="' + shade(X.sideCol || body, -0.55) + '" stroke-width="2"');
      s += path(S([lerp(p0, p1, 0.05), lerp(p0, p1, 0.95)], false), 'stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none"');
      var npC = lerp(lerp(p0, p1, 0.5), lerp(p3, p4, 0.5), 0.5);
      if (cls === "cross" || X.number) {
        var nw = (p1[0] - p0[0]) * 0.36, nh = (p0[1] - p4[1]) * 0.36;
        s += path(S([add(npC, [-nw, nh]), add(npC, [nw, nh * 1.05]), add(npC, [nw * 1.05, -nh]), add(npC, [-nw * 0.95, -nh * 1.1])], true, 0.35), 'fill="' + (light ? "#1B1F22" : "#F4F5F2") + '" opacity=".93"');
        s += '<text x="' + r1(npC[0]) + '" y="' + r1(-npC[1] + nh * 0.55) + '" text-anchor="middle" font-family="Russo One, Arial Black, sans-serif" font-size="' + r1(nh * 1.55) + '" font-style="italic" fill="' + (light ? "#F4F5F2" : "#1B1F22") + '">' + esc(o.num || "") + "</text>";
      } else {
        s += path(S([lerp(p5, p4, 0.55), lerp(p4, p3, 0.35), lerp(p1, p2, 0.55), lerp(p1, p2, 0.2), lerp(p4, p3, 0.05)], true, 0.5), 'fill="' + acc + '" opacity=".9"');
      }
      /* бак: виден сверху между сиденьем и рулевой колонкой */
      var tk0 = [sx1 + 40 * fs, sy + 16 * fs], tk1 = [sx1 + 150 * fs, sy + 64 * fs], tk2 = add(HT, [-28 * fs, -6]), tk3 = add(HT, [8, -70 * fs]);
      s += path(S([tk0, tk1, tk2, tk3, [sx1 + 120 * fs, sy - 80 * fs], [sx1 + 20, sy - 40 * fs]], true, 0.7), 'fill="' + (X.tankCol || "url(#ba-pl)") + '" stroke="' + shade(body, -0.55) + '" stroke-width="2"');
      /* сиденье: плоское, спереди заходит на бак */
      var st = S([[sx0 - 40, sy - 26 * fs], [sx0 + 30, sy], [sx1 - 150 * fs, sy + 6], [sx1 + 20, sy + 22 * fs], [sx1 + 110 * fs, sy + 56 * fs], [sx1 + 90 * fs, sy + 26 * fs], [sx1 - 60, sy - 50 * fs], [sx0 + 60, sy - 64 * fs], [sx0 - 30, sy - 52 * fs]], true, 0.7);
      s += path(st, 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      s += path(S([[sx0, sy - 6], [sx1 - 150 * fs, sy], [sx1 + 80 * fs, sy + 42 * fs]], false), 'stroke="#fff" stroke-opacity=".16" stroke-width="5" fill="none" stroke-linecap="round"');
      if (X.seatStripe) s += path(S([[sx0 + 20, sy - 34 * fs], [sx1 - 60, sy - 24 * fs]], false), 'stroke="' + X.seatStripe + '" stroke-width="7" fill="none" opacity=".85"');
      /* обтекатель радиатора (боковина у руля) */
      var sh0 = add(HT, [-36 * fs, -26 * fs]), sh1 = at(g.lc - 30 * fs, -44 * fs), sh2 = at(g.lc - 200 * fs, -105 * fs), sh3 = [ex1 - 30 * fs, eTop + 175 * fs], sh4 = [sx1 + 30 * fs, sy - 150 * fs], sh5 = [sx1 + 120 * fs, sy + 40 * fs];
      var shroud = S([sh0, sh1, sh2, lerp(sh2, sh3, 0.55), sh3, sh4, sh5], true, 0.8);
      s += path(shroud, 'fill="url(#ba-pl)" stroke="' + shade(body, -0.55) + '" stroke-width="2"');
      /* графика на обтекателе: полоса вдоль нижнего края и тонкая линия */
      s += path(S([lerp(sh2, sh3, 0.05), lerp(sh3, sh4, 0.1), lerp(sh4, sh5, 0.35), lerp(lerp(sh4, sh5, 0.35), lerp(sh2, sh1, 0.5), 0.22), lerp(lerp(sh3, sh4, 0.1), lerp(sh1, sh0, 0.4), 0.3), lerp(sh2, sh1, 0.32)], true, 0.7), 'fill="' + acc + '" opacity=".92"');
      s += path(S([lerp(sh1, sh2, 0.15), lerp(lerp(sh2, sh3, 0.5), lerp(sh1, sh5, 0.5), 0.55), lerp(sh5, sh4, 0.2)], false), 'stroke="' + acc + '" stroke-width="9" fill="none" opacity=".8" stroke-linecap="round"');
      s += path(S([lerp(sh0, sh5, 0.15), lerp(sh1, sh4, 0.2), lerp(sh2, sh3, 0.45)], false), 'stroke="url(#ba-plh)" stroke-width="12" fill="none" opacity=".75" stroke-linecap="round"');
      if (o.brand) {
        var bp = lerp(lerp(sh1, sh4, 0.5), lerp(sh0, sh3, 0.5), 0.5);
        var span = len(sub(sh1, sh4));
        var fsz = Math.max(40, Math.min(92, span * 1.05 / Math.max(3, o.brand.length))) * (fs < 1 ? 1 : 1);
        s += '<text x="' + r1(bp[0]) + '" y="' + r1(-bp[1]) + '" transform="rotate(-24 ' + r1(bp[0]) + " " + r1(-bp[1]) + ')" text-anchor="middle" dominant-baseline="middle" font-family="Russo One, Arial Black, sans-serif" font-size="' + r1(fsz) + '" font-style="italic" fill="' + (light ? "#1B1F22" : "#F7F8F9") + '" stroke="' + (light ? "#F7F8F9" : "#1B1F22") + '" stroke-width="3" paint-order="stroke">' + esc(o.brand.toUpperCase()) + "</text>";
      }
      return { s: s, shroud: lerp(sh1, sh3, 0.5), side: npC };
    }
    function frontFender(high) {
      var fs = cls === "kids" ? 0.68 : cls === "pit" ? 0.82 : 1;
      var s = "";
      if (high) {
        var th = 46 * fs;
        var rear = add(LC, [-175 * fs, -30 * fs]), mnt = add(LC, [10, -44 * fs]), mid = polar(F, g.rf + 160 * fs, 92), tip = polar(F, g.rf + 92 * fs, 48);
        var top = [rear, mnt, mid, tip], bot = [add(tip, [-8, -th * 0.55]), add(mid, [0, -th]), add(mnt, [0, -th * 0.8]), add(rear, [10, -th * 0.6])];
        var fd = S(top.concat([add(tip, [6, -16 * fs])]).concat(bot), true, 0.75);
        s += path(fd, 'fill="' + (X.fFenderCol || "url(#ba-pl)") + '" stroke="' + shade(X.fFenderCol || body, -0.55) + '" stroke-width="2"');
        s += path(S([add(rear, [20, -6]), add(mnt, [0, -8]), add(mid, [0, -8]), add(tip, [-14, -6])], false), 'stroke="#fff" stroke-opacity=".42" stroke-width="5" fill="none" stroke-linecap="round"');
      } else {
        var c = F, r = g.rf + 22, a0 = 30, a1 = 140;
        var outer = [], inner = [];
        for (var a = a0; a <= a1; a += 10) { outer.push(polar(c, r + 18, a)); inner.unshift(polar(c, r, a)); }
        s += path(S(outer.concat(inner), true, 0.5), 'fill="' + (g.body === "classic" || g.body === "cruiser" ? "url(#ba-chrome)" : "url(#ba-pl)") + '" stroke="#202327" stroke-width="2"');
      }
      return s;
    }
    function mask(kind) {
      var fs = cls === "kids" ? 0.68 : cls === "pit" ? 0.82 : 1, s = "";
      if (kind === "none") return s;
      if (kind === "plate") {
        /* кроссовая номерная табличка перед вилкой */
        var p = S([at(g.lc - 70 * fs, 34 * fs), at(g.lc - 40 * fs, 74 * fs), at(g.lc + 120 * fs, 92 * fs), at(g.fl + 30, 74 * fs), at(g.fl + 60, 40 * fs), at(g.fl + 40, 26 * fs), at(g.lc - 20, 24 * fs)], true, 0.7);
        s += path(p, 'fill="' + (X.plateCol || "url(#ba-ac)") + '" stroke="#202327" stroke-width="2"');
        return s;
      }
      if (kind === "mask") {
        /* эндуро: маска с фарой — от верхней траверсы почти до крыла */
        var m = S([at(g.lc - 175 * fs, 30 * fs), at(g.lc - 140 * fs, 96 * fs), at(g.lc - 10 * fs, 132 * fs), at(g.fl - 40, 116 * fs), at(g.fl + 10, 76 * fs), at(g.fl + 6, 34 * fs), at(g.lc - 30, 24 * fs)], true, 0.75);
        s += path(m, 'fill="' + (X.maskCol || "url(#ba-pl)") + '" stroke="' + shade(X.maskCol || body, -0.55) + '" stroke-width="2"');
        var lc = at(g.lc - 50 * fs, 128 * fs);
        s += path(S([add(lc, mul(d, 70 * fs)), add(add(lc, mul(d, 40 * fs)), mul(q, 20 * fs)), add(add(lc, mul(d, -60 * fs)), mul(q, 18 * fs)), add(lc, mul(d, -80 * fs)), add(add(lc, mul(d, -30 * fs)), mul(q, -14 * fs))], true, 0.8), 'fill="url(#ba-lamp)" stroke="#202327" stroke-width="3"');
        return s;
      }
      if (kind === "round") {
        var lp = g.body === "naked" ? at(g.fl - 90, 80) : at(g.fl - 110, 100);
        s += path(band([at(g.fl - 100, 10), lp], 18), 'fill="#1E2125"');
        s += '<ellipse cx="' + r1(lp[0] + 16) + '" cy="' + r1(-lp[1]) + '" rx="46" ry="90" fill="' + (g.body === "classic" || g.body === "cruiser" ? "url(#ba-chrome)" : "#1E2125") + '" stroke="#0B0C0D" stroke-width="2"/>';
        s += '<ellipse cx="' + r1(lp[0] + 46) + '" cy="' + r1(-lp[1]) + '" rx="22" ry="76" fill="url(#ba-lamp)"/>';
        return s;
      }
      if (kind === "fairing") {
        var f0 = at(g.lc - 80, 60), f1 = at(g.fl + 60, 150), f2 = at(g.fl + 260, 70), f3 = at(g.fl + 120, -120), f4 = at(g.lc + 40, -180), f5 = at(g.lc - 140, -90);
        s += path(S([f0, f1, f2, f3, f4, f5], true, 0.75), 'fill="url(#ba-pl)" stroke="' + shade(body, -0.55) + '" stroke-width="2"');
        s += path(S([at(g.lc + 40, 120), at(g.fl + 40, 150), at(g.fl + 90, 120), at(g.lc + 80, 92)], true), 'fill="url(#ba-lamp)" stroke="#202327" stroke-width="3"');
        var w0 = at(g.fl + 80, 110), w1 = at(g.fl + 420, 40), w2 = at(g.fl + 380, -40), w3 = at(g.fl + 60, -20);
        s += path(S([w0, w1, w2, w3], true, 0.4), 'fill="url(#ba-glass)" stroke="#7F93A5" stroke-width="2"');
        return s;
      }
      return s;
    }

    /* ---------- кузов дорожных классов ---------- */
    var bodyStroke = 'stroke="' + shade(body, -0.55) + '" stroke-width="2"';
    function plastic(pts, k, fill) { return path(S(pts, true, k == null ? 0.7 : k), 'fill="' + (fill || "url(#ba-pl)") + '" ' + bodyStroke); }
    function gloss(pts, w) { return path(S(pts, false), 'stroke="url(#ba-plh)" stroke-width="' + (w || 14) + '" fill="none" opacity=".8" stroke-linecap="round"'); }
    function brandText(x, y, size, rot, color) {
      if (!o.brand) return "";
      return '<text x="' + r1(x) + '" y="' + r1(-y) + '"' + (rot ? ' transform="rotate(' + rot + " " + r1(x) + " " + r1(-y) + ')"' : "") + ' text-anchor="middle" dominant-baseline="middle" font-family="Russo One, Arial Black, sans-serif" font-size="' + r1(size) + '" font-style="italic" fill="' + (color || (light ? "#1B1F22" : "#F7F8F9")) + '" stroke="' + (light ? "#F7F8F9" : "#1B1F22") + '" stroke-width="2.5" paint-order="stroke">' + esc(o.brand.toUpperCase()) + "</text>";
    }
    function tailLight(p, w) { return path(L([add(p, [0, 0]), add(p, [w, -4]), add(p, [w - 4, -26]), add(p, [4, -22])], true), 'fill="#C8102E" stroke="#5A0613" stroke-width="2"'); }
    function plateHanger(from, to) {
      var s2 = path(band([from, to], 22), 'fill="#17191C"');
      s2 += path(L([add(to, [-95, 50]), add(to, [95, 60]), add(to, [100, -60]), add(to, [-90, -70])], true), 'fill="#ECEFF1" stroke="#22262B" stroke-width="5"');
      if (X.signals) [add(from, [-30, -10]), add(from, [60, 0])].forEach(function (b0) { s2 += path(band([b0, add(b0, [-50, -20])], 9), 'fill="#17191C"') + path(S([add(b0, [-80, -6]), add(b0, [-40, -4]), add(b0, [-40, -40]), add(b0, [-80, -40])], true), 'fill="#F59E0B" stroke="#7A4A06" stroke-width="2"'); });
      return s2;
    }
    /* нейкед (MT-07, Duke, Z650): короткий хвост, большой бак, открытый мотор */
    function nakedBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1], T = g.tail;
      s += plateHanger([T[0] + 150, T[1] - 70], [T[0] + 30, T[1] - 330]);
      s += plastic([[sx0 + 330, sy - 20], [sx0 + 60, sy + 40], [T[0] + 50, T[1] - 4], T, [T[0] + 20, T[1] - 36], [sx0 + 20, sy - 50], [sx0 + 330, sy - 80]], 0.6);
      s += tailLight(add(T, [8, -10]), 64);
      s += path(S([[sx0 + 360, sy + 34], [sx0 + 330, sy + 64], [sx0 + 50, sy + 72], [sx0 + 30, sy + 50], [sx0 + 60, sy + 28], [sx0 + 340, sy + 8]], true, 0.6), 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      s += path(S([[sx1 + 30, sy + 64], [sx1 - 40, sy + 26], [sx0 + 400, sy + 6], [sx0 + 370, sy + 30], [sx0 + 340, sy - 6], [sx0 + 380, sy - 50], [sx1 - 20, sy - 40]], true, 0.6), 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      var t0 = [sx1 - 20, sy + 50], t1 = [sx1 + 60, sy + 170], t2 = [(sx1 + HT[0]) / 2 + 30, sy + 230], t3 = add(HT, [-10, 50]), t4 = add(HT, [20, -40]), t5 = [HT[0] - 40, sy - 10], t6 = [sx1 + 30, sy - 40];
      s += plastic([t0, t1, t2, t3, t4, t5, t6], 0.75);
      s += gloss([lerp(t0, t1, 0.4), lerp(t1, t2, 0.6), lerp(t2, t3, 0.6)], 18);
      /* боковые накладки бака у радиатора */
      var k0 = add(HT, [10, -20]), k1 = add(HT, [40, -130]), k2 = [ex1 - 10, eTop + 40], k3 = [ex1 - 120, eTop + 90], k4 = [HT[0] - 70, sy + 30];
      s += plastic([k0, k1, k2, k3, k4], 0.7, "url(#ba-ac)");
      s += brandText((t1[0] + t3[0]) / 2, (t1[1] + t5[1]) / 2 + 10, 58, -8);
      return s;
    }
    /* спорт (Ninja, CBR, R3): полный обтекатель, высокий острый хвост */
    function sportBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1], T = g.tail;
      s += plateHanger([T[0] + 160, T[1] - 80], [T[0] + 40, T[1] - 330]);
      s += plastic([[sx0 + 330, sy - 20], [sx0 + 40, sy + 40], [T[0] + 60, T[1] - 6], T, [T[0] + 20, T[1] - 30], [sx0 - 30, sy - 40], [sx0 + 330, sy - 80]], 0.6);
      s += tailLight(add(T, [10, -8]), 60);
      s += path(S([[sx0 + 300, sy + 46], [sx0 + 60, sy + 70], [sx0 + 40, sy + 50], [sx0 + 300, sy + 20]], true, 0.6), 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      s += path(S([[sx1 + 20, sy + 60], [sx1 - 40, sy + 20], [sx0 + 330, sy + 8], [sx0 + 330, sy - 30], [sx1 - 20, sy - 30]], true, 0.6), 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      var t0 = [sx1 - 10, sy + 40], t1 = [sx1 + 80, sy + 170], t2 = [(sx1 + HT[0]) / 2 + 40, sy + 230], t3 = add(HT, [0, 70]), t4 = [HT[0] - 40, sy + 40];
      s += plastic([t0, t1, t2, t3, t4], 0.75);
      s += gloss([lerp(t0, t1, 0.4), lerp(t1, t2, 0.6), lerp(t2, t3, 0.6)], 18);
      return s;
    }
    function sportFairing() {
      var s = "", sy = seat[2], sx1 = seat[1];
      var nose = at(g.fl - 40, 245), top = at(g.fl + 60, 185), back = add(HT, [-30, 70]), r0 = [sx1 + 40, sy - 30], r1_ = [ex0 + 70, eTop - 10], r2 = [ex0 + 90, eb + 60], belly = [ex0 + 150, eb - 30], bf = [ex1 + 30, eb + 0], low = at(g.lc - 260, 210), nl = at(g.lc - 70, 265);
      var f = [nose, top, back, r0, r1_, r2, belly, bf, low, nl];
      s += plastic(f, 0.75);
      s += path(S([lerp(low, nl, 0.3), lerp(nl, nose, 0.5), lerp(back, r0, 0.3), lerp(r0, r1_, 0.4), lerp(r1_, r0, 0.05), lerp(top, back, 0.75), lerp(nose, nl, 0.5), lerp(low, bf, 0.5)], true, 0.8), 'fill="' + acc + '" opacity=".85"');
      s += gloss([lerp(nose, top, 0.3), lerp(top, back, 0.5), lerp(back, r0, 0.4)], 16);
      s += path(S([at(g.fl - 70, 250), at(g.fl + 20, 214), at(g.fl, 186), at(g.fl - 90, 222)], true, 0.6), 'fill="url(#ba-lamp)" stroke="#202327" stroke-width="3"');
      s += path(S([at(g.fl + 50, 190), at(g.fl + 230, 112), at(g.fl + 190, 66), at(g.fl + 30, 150)], true, 0.4), 'fill="url(#ba-glass)" stroke="#7F93A5" stroke-width="2"');
      s += brandText((r1_[0] + bf[0]) / 2 + 20, (eTop + eb) / 2 + 40, 64, -6);
      return s;
    }
    /* туристический эндуро (390 Adventure, Kove, Himalayan, Africa Twin): большой бак, «башня» с фарой, багажник */
    function advBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1], T = g.tail;
      s += plateHanger([T[0] + 160, T[1] - 80], [T[0] + 50, T[1] - 320]);
      s += plastic([[sx0 + 320, sy + 10], [sx0 + 40, sy + 40], [T[0] + 50, T[1] - 4], T, [T[0] + 20, T[1] - 40], [sx0 - 10, sy - 50], [sx0 + 320, sy - 70]], 0.6);
      s += tailLight(add(T, [10, -10]), 60);
      if (X.rack !== false) {
        s += path(band([add(T, [30, 30]), [sx0 + 200, sy + 60]], 18), 'fill="#1E2125" stroke="#000" stroke-width="1"');
        s += path(band([add(T, [60, 30]), add(T, [120, -60])], 14), 'fill="#1E2125"');
      }
      if (X.pannier) s += path(S([[T[0] + 90, T[1] - 70], [sx0 + 230, sy - 70], [sx0 + 210, sy - 430], [T[0] + 110, T[1] - 430]], true, 0.2), 'fill="url(#ba-dark)" stroke="#000" stroke-width="2"') + path(L([[T[0] + 110, T[1] - 150], [sx0 + 200, sy - 150]]), 'stroke="#8A929A" stroke-width="6"');
      s += path(S([[sx0 + 340, sy + 30], [sx0 + 320, sy + 60], [sx0 + 30, sy + 64], [sx0, sy + 40], [sx0 + 30, sy + 14], [sx0 + 340, sy + 4]], true, 0.6), 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      s += path(S([[sx1 + 40, sy + 70], [sx1 - 40, sy + 24], [sx0 + 380, sy + 10], [sx0 + 350, sy + 40], [sx0 + 330, sy - 20], [sx0 + 380, sy - 50], [sx1, sy - 40]], true, 0.6), 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      var t0 = [sx1 - 10, sy + 60], t1 = [sx1 + 90, sy + 190], t2 = [(sx1 + HT[0]) / 2 + 30, sy + 250], t3 = add(HT, [-10, 10]), t4 = add(HT, [30, -110]), t5 = [ex1 + 20, eTop + 40], t6 = [ex1 - 140, eTop + 20], t7 = [sx1 + 60, sy - 110];
      s += plastic([t0, t1, t2, t3, t4, t5, t6, t7], 0.75);
      s += path(S([lerp(t4, t5, 0.2), t5, t6, lerp(t6, t7, 0.5), lerp(lerp(t6, t7, 0.5), lerp(t3, t4, 0.5), 0.35)], true, 0.7), 'fill="' + acc + '" opacity=".9"');
      s += gloss([lerp(t0, t1, 0.4), lerp(t1, t2, 0.6), lerp(t2, t3, 0.6)], 20);
      s += brandText((t1[0] + t4[0]) / 2, (t1[1] + t6[1]) / 2 + 20, 62, -10);
      /* защита картера */
      s += path(S([[ex0 - 10, eb - 14], [ex1 + 20, eb - 6], [ex1 + 70, eb + 110], [ex1 + 30, eb + 80], [ex1 - 20, eb + 30], [ex0, eb + 20]], true, 0.4), 'fill="url(#ba-alu)" stroke="#4A5058" stroke-width="2"');
      return s;
    }
    function advFairing() {
      var s = "";
      var f0 = at(g.lc - 70, 40), f1 = at(g.lc + 30, 150), f2 = at(g.fl + 40, 150), f3 = at(g.fl + 80, 90), f4 = at(g.fl + 10, 20), f5 = at(g.lc - 30, 10);
      s += plastic([f0, f1, f2, f3, f4, f5], 0.6);
      s += path(S([at(g.lc + 40, 150), at(g.fl - 10, 156), at(g.fl - 20, 120), at(g.lc + 50, 118)], true, 0.6), 'fill="url(#ba-lamp)" stroke="#202327" stroke-width="3"');
      s += path(S([at(g.fl + 50, 136), at(g.fl + 360, 66), at(g.fl + 330, 8), at(g.fl + 40, 60)], true, 0.35), 'fill="url(#ba-glass)" stroke="#7F93A5" stroke-width="2"');
      return s;
    }
    /* классика (Royal Enfield, Honda CB, Минск): бак-капля, диван, длинное крыло */
    function classicBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1];
      var outer = [], inner = [];
      for (var a = 30; a <= 182; a += 8) { outer.push(polar(R, g.rr + 70, a)); inner.unshift(polar(R, g.rr + 36, a)); }
      s += path(S(outer.concat(inner), true, 0.5), 'fill="url(#ba-pl)" ' + bodyStroke);
      s += path(band([polar(R, g.rr + 40, 120), add(R, [30, 40])], 12), 'fill="url(#ba-chrome)"');
      s += tailLight(polar(R, g.rr + 72, 160), 56);
      var pl = polar(R, g.rr + 60, 168);
      s += path(L([add(pl, [-20, -30]), add(pl, [150, -30]), add(pl, [150, -150]), add(pl, [-20, -150])], true), 'fill="#ECEFF1" stroke="#22262B" stroke-width="5"');
      /* ящик-боковина */
      s += plastic([[PV[0] + 70, sy - 60], [PV[0] + 50, PV[1] + 170], [sx0 + 300, PV[1] + 180], [sx0 + 290, sy - 70]], 0.3);
      s += circ([(PV[0] + sx0 + 340) / 2, (sy + PV[1] + 110) / 2], 34, 'fill="url(#ba-chrome)"');
      /* диван */
      s += path(S([[sx0 - 10, sy - 20], [sx0 + 10, sy + 40], [sx1 - 40, sy + 50], [sx1 + 40, sy + 20], [sx1 + 20, sy - 30], [sx0 + 40, sy - 44]], true, 0.6), 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      s += path(L([[sx0 + 30, sy - 10], [sx1 - 10, sy - 6]]), 'stroke="#000" stroke-opacity=".4" stroke-width="5"');
      /* бак-капля с наколенниками и эмблемой */
      var t0 = [sx1, sy + 30], t1 = [sx1 + 60, sy + 180], t2 = [(sx1 + HT[0]) / 2, sy + 240], t3 = [HT[0] - 30, sy + 200], t4 = add(HT, [-20, -30]), t5 = [HT[0] - 90, sy + 10], t6 = [sx1 + 80, sy - 20];
      s += plastic([t0, t1, t2, t3, t4, t5, t6], 0.8);
      s += gloss([lerp(t0, t1, 0.5), lerp(t1, t2, 0.6), lerp(t2, t3, 0.7)], 22);
      var em = lerp(lerp(t1, t5, 0.5), lerp(t2, t6, 0.5), 0.5);
      s += '<ellipse cx="' + r1(em[0]) + '" cy="' + r1(-em[1]) + '" rx="80" ry="38" fill="' + acc + '" stroke="url(#ba-chrome)" stroke-width="5"/>';
      if (o.brand) s += '<text x="' + r1(em[0]) + '" y="' + r1(-em[1]) + '" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-size="' + r1(Math.min(34, 260 / o.brand.length)) + '" font-weight="700" fill="' + (lum(acc) > 0.6 ? "#1B1F22" : "#F7F8F9") + '">' + esc(o.brand.toUpperCase()) + "</text>";
      s += path(S([lerp(t5, t6, 0.2), lerp(t5, t6, 0.8), add(lerp(t5, t6, 0.8), [0, 60]), add(lerp(t5, t6, 0.2), [0, 60])], true, 0.4), 'fill="#141619" opacity=".85"');
      return s;
    }
    /* чоппер / круизёр (Iron 883, Shadow, Rebel): низкое сиденье, бак-капля, V2 */
    function cruiserBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1];
      var outer = [], inner = [];
      for (var a = 40; a <= 168; a += 8) { outer.push(polar(R, g.rr + 66, a)); inner.unshift(polar(R, g.rr + 30, a)); }
      s += path(S(outer.concat(inner), true, 0.5), 'fill="url(#ba-pl)" ' + bodyStroke);
      s += tailLight(polar(R, g.rr + 70, 150), 50);
      s += path(L([add(R, [-60, 260]), add(R, [-60, 120]), add(R, [-200, 120]), add(R, [-200, 260])], true), 'fill="#ECEFF1" stroke="#22262B" stroke-width="5"');
      s += path(S([[sx0 - 40, sy - 10], [sx0 + 30, sy + 80], [sx1 - 160, sy + 6], [sx1 + 30, sy + 40], [sx1, sy - 30], [sx0 + 50, sy - 40]], true, 0.6), 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      var t0 = [sx1 + 10, sy + 90], t1 = [sx1 + 90, sy + 230], t2 = [HT[0] - 150, sy + 300], t3 = [HT[0] - 40, sy + 250], t4 = add(HT, [-20, -60]), t5 = [sx1 + 120, sy + 70];
      s += plastic([t0, t1, t2, t3, t4, t5], 0.85);
      s += gloss([lerp(t0, t1, 0.5), lerp(t1, t2, 0.6), lerp(t2, t3, 0.6)], 20);
      s += brandText((t1[0] + t3[0]) / 2, (t1[1] + t5[1]) / 2 + 20, 50, -4);
      return s;
    }
    /* мопед-«альфа» (кабовый): передняя облицовка хребта, длинное седло, багажник */
    function mopedBody() {
      var s = "", sy = seat[2], sx0 = seat[0], sx1 = seat[1], T = g.tail;
      /* заднее крыло и боковые крышки */
      var outer = [], inner = [];
      for (var a = 92; a <= 170; a += 8) { outer.push(polar(R, g.rr + 50, a)); inner.unshift(polar(R, g.rr + 22, a)); }
      s += path(S(outer.concat(inner), true, 0.5), 'fill="#1E2125" stroke="#000" stroke-width="2"');
      s += plastic([[sx0 - 20, sy - 30], [sx1 - 120, sy - 40], [PV[0] + 70, PV[1] + 150], [R[0] + 190, R[1] + 200], [R[0] - 60, R[1] + 330], [T[0] + 30, T[1] - 40]], 0.6);
      s += tailLight([T[0] - 4, T[1] - 30], 66);
      s += path(band([[T[0] + 20, sy + 46], [sx0 + 230, sy + 46]], 16), 'fill="#1E2125" stroke="#000" stroke-width="1"');
      s += path(band([[T[0] + 40, sy + 46], [T[0] + 80, sy - 60]], 12), 'fill="#1E2125"');
      /* седло */
      s += path(S([[sx0 - 40, sy - 6], [sx0 + 10, sy + 44], [sx1 - 40, sy + 48], [sx1 + 30, sy + 16], [sx1 + 10, sy - 30], [sx0, sy - 40]], true, 0.6), 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      /* облицовка хребта: от рулевой колонки вниз к мотору, ступенька между ней и седлом */
      var c0 = add(HT, [-50, -10]), c1 = add(HB, [50, -40]), c2 = [ex1 + 70, eb + 150], c3 = [ex1 - 40, eb + 110], c4 = [sx1 + 40, sy - 210], c5 = [sx1 - 30, sy - 40], c6 = [sx1 + 60, sy - 30], c7 = [HT[0] - 120, sy - 160];
      s += plastic([c0, c1, c2, c3, c4, c5, c6, c7], 0.75);
      s += gloss([lerp(c0, c1, 0.2), lerp(c1, c2, 0.5)], 14);
      s += path(S([lerp(c1, c2, 0.15), lerp(c1, c2, 0.85), lerp(c3, c4, 0.4), lerp(c7, c0, 0.5)], true, 0.7), 'fill="' + acc + '" opacity=".85"');
      return s;
    }
    function mopedHead() {
      var hc = at(g.fl + 70, 30), s = "";
      s += plastic([add(hc, [-120, -40]), add(hc, [70, -50]), add(hc, [120, 20]), add(hc, [40, 70]), add(hc, [-100, 50])], 0.7);
      s += '<ellipse cx="' + r1(hc[0] + 96) + '" cy="' + r1(-hc[1] + 6) + '" rx="22" ry="40" fill="url(#ba-lamp)" stroke="#202327" stroke-width="2"/>';
      return s;
    }
    /* триал: крошечное седло, открытая алюминиевая рама */
    function trialBody() {
      var s = "", sy = seat[2], T = g.tail;
      s += plastic([[seat[0] - 30, sy - 40], [T[0] + 20, T[1] - 30], T, [T[0] + 30, T[1] + 14], [seat[0] + 60, sy + 20]], 0.6);
      s += path(S([[seat[0] - 10, sy - 10], [seat[0] + 10, sy + 34], [seat[1], sy + 36], [seat[1] + 30, sy - 4]], true, 0.6), 'fill="url(#ba-seat)" stroke="#000" stroke-width="2"');
      var t0 = [seat[1] + 10, sy + 20], t1 = add(HT, [-90, -40]), t2 = add(HT, [-30, -110]), t3 = [seat[1] + 120, sy - 70];
      s += plastic([t0, t1, t2, t3], 0.6);
      s += brandText((t0[0] + t2[0]) / 2, (t0[1] + t2[1]) / 2, 44, -14);
      return s;
    }
    /* подножка и рычаг тормоза */
    function pegs() {
      var p = [PV[0] + 30 * sc, PV[1] - 40 * sc], s = "";
      s += path(L([add(p, [-50 * sc, -10]), add(p, [40 * sc, -10]), add(p, [40 * sc, 14]), add(p, [-50 * sc, 14])], true), 'fill="#2B2F34" stroke="#111" stroke-width="1.5"');
      for (var i = 0; i < 4; i++) s += path(L([add(p, [-40 * sc + i * 24 * sc, 14]), add(p, [-34 * sc + i * 24 * sc, 22])]), 'stroke="#111" stroke-width="5"');
      s += path(band([add(PV, [20, -10]), add(p, [130 * sc, -10]), add(p, [190 * sc, 20])], 16 * sc + 4), 'fill="url(#ba-alu)" stroke="#3F454C" stroke-width="1.5"');
      return s;
    }
    function skid() {
      if (!(dirt && cls !== "kids" && cls !== "motard")) return "";
      return path(S([[ex0 - 20, eb - 4], [ex1 - 20, eb - 10], [ex1 + 30, eb + 20], [ex1 + 20, eb + 70], [ex1 - 30, eb + 26], [ex0 + 20, eb + 30]], true, 0.5), 'fill="' + (X.skid || "url(#ba-dark)") + '" stroke="#111" stroke-width="2"');
    }

    /* ---------- сборка: сзади наперёд ---------- */
    var shock = twin ? twinShock() : monoShock();
    push(wheel(R, g.rr, g.rimR, false));
    push(wheel(F, g.rf, g.rimF, true));
    if (!twin) push(shock.s);
    push(swingarm());
    push(frame());
    push(radiator());
    push(drawEngine());
    push(skid());
    push(pegs());
    var bodyRes = null;
    if (dirt) {
      push(frontFender(true));
      bodyRes = dirtBody();
      push(bodyRes.s);
    } else if (g.body === "adv") { push(frontFender(true)); push(advBody()); }
    else if (g.body === "naked") { push(frontFender(false)); push(nakedBody()); }
    else if (g.body === "sport") { push(frontFender(false)); push(sportBody()); }
    else if (g.body === "classic") { push(frontFender(false)); push(classicBody()); }
    else if (g.body === "cruiser") { push(frontFender(false)); push(cruiserBody()); }
    else if (g.body === "moped") { push(frontFender(false)); push(mopedBody()); }
    else if (g.body === "trial") { push(frontFender(true)); push(trialBody()); }
    if (twin) push(shock.s);
    push(exhaust());
    push(fork());
    var lights = X.lights || (cls === "cross" || cls === "pit" || cls === "kids" ? "plate" : dirt ? "mask" : g.body === "adv" ? "adv" : g.body === "sport" ? "sport" : g.body === "moped" ? "moped" : g.body === "trial" ? "none" : "round");
    if (lights === "adv") push(advFairing());
    else if (lights === "sport") push(sportFairing());
    else if (lights === "moped") push(mopedHead());
    else push(mask(lights));
    var ck = cockpit();
    push(ck.s);

    /* рамка рисунка */
    var minX = -Math.max(g.rr + 40, -g.tail[0] + 60), maxX = g.wb + g.rf + 60;
    var top = Math.max(at(g.fl + 60, 0)[1] + 40, seat[2] + 150, ck.grip[1] + (X.mirrors ? 220 : 60), lights === "adv" ? at(g.fl + 360, 66)[1] + 20 : lights === "sport" ? at(g.fl + 250, 100)[1] + 20 : 0);
    var vb = [minX, -top - 30, maxX - minX, top + 80];
    var P2 = function (p) { return [r1(p[0]), r1(-p[1])]; };
    var pins = {
      engine: P2(engine.center),
      fork: P2(at(g.lc * 0.55, 0)),
      shock: P2(shock.mid),
      brakes: P2(polar(R, 80, 300)),
      wheels: P2(polar(F, g.rimF * 0.62, 210)),
      chain: P2(lerp(PV, R, 0.55)),
      cockpit: P2(ck.grip),
      electric: P2(lights === "mask" ? at(g.lc - 50, 120) : lights === "adv" ? at(g.lc + 60, 130) : lights === "sport" ? at(g.fl - 40, 210) : lights === "round" ? at(g.fl - 50, 120) : lights === "moped" ? at(g.fl + 70, 60) : bodyRes ? bodyRes.side : [seat[0] + 200, seat[2] - 120]),
      frame: P2(bodyRes ? bodyRes.shroud : [ex1 + 30, eTop + 60])
    };
    return { svg: "<defs>" + defs.join("") + "</defs>" + out.join(""), vb: vb, pins: pins, smoke: engine.tip ? P2(engine.tip) : null };
  }

  /* ---------- расцветки марок ----------
     body — основной пластик, accent — графика, frame — рама, seat — сиденье, rim — обода, fork — перья вилки */
  var LIVERY = {
    KTM: { body: "#F36F21", accent: "#1E2125", frame: "#F36F21", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#F36F21", fender: "#F36F21", guard: "#1E2125" },
    Husqvarna: { body: "#F2F3F0", accent: "#123A86", frame: "#123A86", seat: "#123A86", rim: "#1A1C1F", fork: "#C8962E", fender: "#F2F3F0" },
    GasGas: { body: "#D31F2B", accent: "#F2F3F0", frame: "#D31F2B", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#1E2125" },
    Honda: { body: "#D0121B", accent: "#F2F3F0", frame: "#B5121B", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#C8962E", fender: "#F2F3F0" },
    Yamaha: { body: "#1B3E9A", accent: "#F2F3F0", frame: "#3A3F46", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#C8962E", fender: "#F2F3F0" },
    Kawasaki: { body: "#4DB83A", accent: "#1E2125", frame: "#1E2125", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#C8962E" },
    Suzuki: { body: "#F1C40F", accent: "#1B3E9A", frame: "#9AA2AA", seat: "#1B3E9A", rim: "#1A1C1F", fork: "#C8962E" },
    Beta: { body: "#E1251B", accent: "#F2F3F0", frame: "#E1251B", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#1E2125", fender: "#F2F3F0" },
    Sherco: { body: "#1D4F9C", accent: "#E1251B", frame: "#1D4F9C", seat: "#1D4F9C", rim: "#1A1C1F", fork: "#1E2125", fender: "#F2F3F0" },
    "TM Racing": { body: "#F2F3F0", accent: "#1D4F9C", frame: "#9AA2AA", seat: "#1D4F9C", rim: "#1A1C1F", fork: "#1E2125" },
    Fantic: { body: "#F2F3F0", accent: "#D31F2B", frame: "#D31F2B", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#1E2125" },
    Rieju: { body: "#D31F2B", accent: "#F2F3F0", frame: "#1E2125", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#1E2125" },
    BMW: { body: "#F2F3F0", accent: "#1C69D4", frame: "#3A3F45", seat: "#1A1C1F", rim: "#2A2E33", fork: "#C8962E" },
    Triumph: { body: "#2E3338", accent: "#C8102E", frame: "#1E2125", seat: "#1A1C1F", rim: "#2A2E33", fork: "#C8962E" },
    Ducati: { body: "#C8102E", accent: "#F2F3F0", frame: "#C8102E", seat: "#1A1C1F", rim: "#2A2E33", fork: "#C8962E" },
    Aprilia: { body: "#1E2125", accent: "#C8102E", frame: "#1E2125", seat: "#1A1C1F", rim: "#C8102E", fork: "#C8962E" },
    Kove: { body: "#F2F3F0", accent: "#1D4F9C", frame: "#1E2125", seat: "#1A1C1F", rim: "#1A1C1F", fork: "#C8962E" },
    CFMOTO: { body: "#2E5FA8", accent: "#F2F3F0", frame: "#1E2125", seat: "#1A1C1F", rim: "#2A2E33", fork: "#C8962E" },
    "Royal Enfield": { body: "#3D4A3A", accent: "#C9A227", frame: "#1E2125", seat: "#3A2A1E", rim: "#9AA2AA", fork: "#C9CED4" },
    "Harley-Davidson": { body: "#2B2F34", accent: "#E8740C", frame: "#17191C", seat: "#1A1C1F", rim: "#9AA2AA", fork: "#C9CED4" },
    Minsk: { body: "#B5121B", accent: "#F2F3F0", frame: "#1E2125", seat: "#1A1C1F", rim: "#9AA2AA", fork: "#C9CED4" }
  };
  var CN_SCHEMES = [
    { body: "#D31F2B", accent: "#F2F3F0", frame: "#1E2125" }, { body: "#F2F3F0", accent: "#D31F2B", frame: "#1E2125" },
    { body: "#F36F21", accent: "#1E2125", frame: "#1E2125" }, { body: "#1D4F9C", accent: "#F2F3F0", frame: "#1E2125" },
    { body: "#F2F3F0", accent: "#1D4F9C", frame: "#1E2125" }, { body: "#4DB83A", accent: "#1E2125", frame: "#1E2125" },
    { body: "#1E2125", accent: "#F36F21", frame: "#1E2125" }, { body: "#F1C40F", accent: "#1E2125", frame: "#1E2125" }
  ];
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function livery(brand, name, custom) {
    var base = LIVERY[brand] || CN_SCHEMES[hash(String(brand) + " " + String(name)) % CN_SCHEMES.length];
    var c = Object.assign({ seat: "#1A1C1F", rim: "#1A1C1F", fork: "#C8962E" }, base);
    if (custom) {
      c.body = custom;
      c.fender = custom;
      var lt = lum(custom) > 0.72;
      if (lum(c.accent) > 0.72 === lt) c.accent = lt ? "#1E2125" : "#F2F3F0";
    }
    return c;
  }
  window.bikeArt = bikeArt;
  window.bikeLivery = livery;
})();
