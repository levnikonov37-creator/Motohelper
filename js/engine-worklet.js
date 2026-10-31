/* MotoHelper — звук двигателя. Синтез «по физике»: каждая вспышка в цилиндре даёт импульс давления
   в выпуске (форма зависит от угла коленвала, поэтому на высоких оборотах импульсы короче и звук ярче),
   импульс идёт в трубу (волновод с отражением от открытого конца → резонанс трубы), потом в глушитель.
   Плюс впуск, щелчки клапанов, треск сгорания, стартер, отсечка и отстрелы при сбросе газа.
   Сообщения из страницы: { rpm, thr (0..1), ign (вкл. зажигание), starter, ex, vol }.
   Обратно (~25 раз в секунду): { l — громкость 0..1, r — обороты, f — номер последней вспышки }. */
/* прошёл ли коленвал угол x между двумя соседними отсчётами (с учётом перехода через конец цикла) */
function hit(pa, a, x) {
  return pa <= a ? pa < x && a >= x : x > pa || x <= a;
}
class MhEngine extends AudioWorkletProcessor {
  constructor(o) {
    super();
    const c = (o && o.processorOptions) || {};
    this.sr = sampleRate;
    this.two = !!c.two;
    this.cyc = c.cycle || (this.two ? 360 : 720);
    this.fire = c.fire && c.fire.length ? c.fire : [0];
    this.vc = c.vc || 250;
    this.air = !!c.air;
    this.red = c.red || 9000;
    this.rpm = c.rpm || 0;
    this.tgt = this.rpm;
    this.thr = 0;
    this.thrS = 0;
    this.ign = c.ign !== false;
    this.starter = 0;
    this.stS = 0;
    this.vol = 0;
    this.volT = 1;
    this.th = 0;
    /* фазы выпуска/впуска относительно ВМТ рабочего хода, градусы коленвала */
    this.EVO = this.two ? 95 : 140;
    this.EDUR = this.two ? 175 : 245;
    this.IVO = this.two ? 250 : 350;
    this.IDUR = this.two ? 170 : 235;
    this.cyl = this.fire.map((f, i) => ({
      f: f,
      prev: 0,
      a: 0,
      amp: 0,
      on: false,
      trim: 1 + (i % 2 ? -0.07 : 0.05) + i * 0.015
    }));
    this.D = 8192;
    this.dl = new Float32Array(this.D);
    this.di = 0;
    this.lpLoop = 0;
    this.m1 = 0;
    this.m2 = 0;
    this.m3 = 0;
    this.bz = 0;
    this.iz1 = 0;
    this.iz2 = 0;
    this.hx = 0;
    this.hy = 0;
    this.crack = 0;
    this.tick = 0;
    this.tz = 0;
    this.pop = 0;
    this.pops = 0;
    this.thump = 0;
    this.thPh = 0;
    this.whPh = 0;
    this.seed = 22695477;
    this.env = 0.001;
    this.ag = 1;
    this.decel = 0;
    this.limit = 0;
    this.acc = 0;
    this.accN = 0;
    this.fires = 0;
    this.setEx(c.ex || "stock");
    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.rpm != null) this.tgt = Math.max(0, d.rpm);
      if (d.thr != null) this.thr = d.thr;
      if (d.ign != null) this.ign = !!d.ign;
      if (d.starter != null) this.starter = d.starter ? 1 : 0;
      if (d.ex) this.setEx(d.ex);
      if (d.vol != null) this.volT = d.vol;
    };
  }
  setEx(ex) {
    const T = {
      stock: { L: 1.7, R: -0.42, f1: 420, f2: 1100, dir: 0.06, g: 1.0, pop: 0.35 },
      slip: { L: 1.45, R: -0.55, f1: 780, f2: 2300, dir: 0.18, g: 1.25, pop: 1.0 },
      full: { L: 1.25, R: -0.62, f1: 1000, f2: 3200, dir: 0.28, g: 1.4, pop: 1.3 },
      pipe: { L: 1.05, R: -0.7, f1: 800, f2: 2200, dir: 0.16, g: 1.3, pop: 0.9 }
    }[ex] || null;
    const t = T || { L: 1.7, R: -0.42, f1: 420, f2: 1100, dir: 0.06, g: 1.0, pop: 0.35 };
    const big = Math.pow(250 / Math.max(50, this.vc), 0.22);
    const tw = this.two ? 1.15 : 1;
    this.pipeD = Math.min(this.D - 2, Math.round(this.sr * 2 * t.L / 480));
    this.R = t.R;
    const k = (fc) => 1 - Math.exp(-2 * Math.PI * Math.min(fc, this.sr * 0.45) / this.sr);
    this.kf = k;
    this.f1 = t.f1 * big * tw;
    this.f2 = t.f2 * big * tw;
    this.kLoop = k(2600 * big);
    this.kBass = k(150 * big);
    this.kTick = k(5200);
    this.kIn1 = k(900);
    this.kIn2 = k(3200);
    this.dir = t.dir * (this.two ? 1.3 : 1);
    this.gain = t.g;
    this.popK = t.pop;
    this.mp = this.mp || 0;
    this.dK = this.sr / (2 * Math.PI * 180);
    this.bass = 0.35 * Math.min(1.6, Math.pow(this.vc / 300, 0.5));
  }
  rnd() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  /* форма импульса давления в выпуске, x = 0..1 по ходу открытия выпуска */
  shape(x) {
    if (x < 0.06) return x / 0.06;
    const y = x - 0.06;
    return Math.exp(-y * (this.two ? 6.5 : 4.2)) * (1 - x) * (1 + 0.35 * Math.sin(y * 31));
  }
  process(inputs, outputs) {
    const out = outputs[0] && outputs[0][0];
    if (!out) return true;
    const n = out.length,
      sr = this.sr,
      cyc = this.cyc,
      cyl = this.cyl;
    const kr = 1 - Math.exp(-1 / (sr * 0.025)),
      kt = 1 - Math.exp(-1 / (sr * 0.06)),
      kv = 1 - Math.exp(-1 / (sr * 0.04)),
      kst = 1 - Math.exp(-1 / (sr * 0.08));
    this.kEnv = 1 - Math.exp(-1 / (sr * 0.25));
    this.kAg = 1 - Math.exp(-1 / (sr * 0.15));
    this.crackD = Math.exp(-1 / (sr * 0.0022));
    const idle = this.rpm < 2200,
      bigSingle = cyl.length < 3 && this.vc > 300;
    /* глушитель «открывается» с оборотами и газом: больше потока — ярче звук */
    const open = 1 + 0.7 * Math.min(1, this.rpm / this.red) + 0.3 * this.thrS;
    this.k1 = this.kf(this.f1 * open);
    this.k2 = this.kf(this.f2 * open);
    /* громкость не растёт пропорционально числу вспышек в секунду */
    const fps = this.rpm / 60 * cyl.length / (this.two ? 1 : 2),
      norm = Math.pow(14 / Math.max(14, fps), 0.8);
    for (let i = 0; i < n; i++) {
      const prevRpm = this.rpm;
      this.rpm += (this.tgt - this.rpm) * kr;
      this.thrS += (this.thr - this.thrS) * kt;
      this.vol += (this.volT - this.vol) * kv;
      this.stS += (this.starter - this.stS) * kst;
      /* сброс газа с высоких оборотов — режим торможения двигателем */
      if (this.thr < 0.05 && this.rpm > this.red * 0.42 && prevRpm - this.rpm > 0) this.decel = Math.min(1, this.decel + 0.0004);
      else this.decel *= 0.99995;
      this.limit = this.thr > 0.5 && this.rpm > this.red * 0.965 ? 1 : 0;
      /* стартер: на такте сжатия коленвал притормаживает — «рр-рр-рр» */
      let dth = this.rpm * 6 / sr;
      if (this.stS > 0.05 && !this.ign) {
        const a0 = ((this.th - cyl[0].f) % cyc + cyc) % cyc;
        const near = Math.min(Math.abs(a0 - cyc), a0);
        dth *= near < 70 ? 0.45 + 0.55 * near / 70 : 1;
      }
      this.th += dth;
      if (this.th >= cyc) this.th -= cyc;
      let src = 0,
        intake = 0;
      for (let k = 0; k < cyl.length; k++) {
        const c = cyl[k];
        const a = ((this.th - c.f) % cyc + cyc) % cyc;
        const pa = c.prev;
        c.prev = a;
        /* открылся выпуск */
        if (hit(pa, a, this.EVO)) {
          let amp;
          const lift = Math.min(1, this.rpm / this.red);
          if (!this.ign || this.rpm < 120) {
            amp = 0.07 * Math.min(1, this.rpm / 250);
          } else if (this.limit && this.rnd() < 0.62) {
            amp = 0.05;
            if (this.rnd() < 0.35 * this.popK) { this.pop = Math.max(this.pop, 0.9 + this.rnd() * 0.5); this.pops++; }
          } else if (this.decel > 0.3 && this.thr < 0.05) {
            amp = 0.13 + 0.08 * this.rnd();
            if (this.rnd() < 0.09 * this.popK * this.decel) { this.pop = Math.max(this.pop, 0.6 + this.rnd() * 0.8); this.pops++; }
          } else {
            const load = 0.5 + 0.5 * this.thrS;
            amp = load * (0.62 + 0.38 * lift);
            const v = idle ? (bigSingle ? 0.2 : 0.11) : 0.045;
            amp *= 1 + (this.rnd() - 0.5) * 2 * v;
            if (idle && bigSingle && this.thrS < 0.1 && this.rnd() < 0.04) amp *= 0.45;
          }
          c.amp = amp * c.trim;
          c.on = true;
          this.crack = Math.max(this.crack, c.amp * (this.two ? 0.8 : 1));
          if (this.ign && amp > 0.1) this.fires++;
        }
        if (c.on) {
          const x = (a - this.EVO + cyc) % cyc / this.EDUR;
          if (x >= 1) c.on = false;
          else src += c.amp * this.shape(x);
        }
        /* закрылся клапан — щелчок механики (у 2Т — стук поршня в ВМТ) */
        const ev = this.two ? 0 : (this.EVO + this.EDUR) % cyc;
        if (hit(pa, a, ev) || (!this.two && hit(pa, a, (this.IVO + this.IDUR) % cyc))) this.tick = Math.max(this.tick, 0.5);
        /* впуск */
        const ia = (a - this.IVO + cyc) % cyc;
        if (ia < this.IDUR) intake += Math.sin(Math.PI * ia / this.IDUR);
      }
      const w = this.rnd() * 2 - 1;
      /* треск сгорания: короткий шум в момент открытия выпуска */
      src += this.crack * w * 0.3;
      this.crack *= this.crackD;
      /* отстрел: резкий хлопок + низкий удар */
      if (this.pop > 0.01) {
        src += this.pop * (w * 1.6 + Math.sin(this.thPh) * 1.2);
        this.thPh += 2 * Math.PI * 90 / sr;
        this.pop *= 0.9984;
      }
      /* труба: волновод с отражением от открытого конца */
      const di = this.di,
        back = this.dl[(di - this.pipeD + this.D) % this.D];
      this.lpLoop += (back - this.lpLoop) * this.kLoop;
      const y = src + this.R * this.lpLoop;
      this.dl[di] = y;
      this.di = (di + 1) % this.D;
      /* глушитель: два фильтра + немного прямого звука, отдельно бас */
      this.m1 += (y - this.m1) * this.k1;
      this.m2 += (this.m1 - this.m2) * this.k2;
      this.bz += (y - this.bz) * this.kBass;
      /* до уха доходит не давление в трубе, а его изменение: дифференцируем (подъём середины и верха) */
      const rad = (this.m2 - this.mp) * this.dK * 1.15 + this.m1 * this.dir;
      this.mp = this.m2;
      let s = (rad + this.bz * this.bass) * norm;
      /* впуск: шум, открывается с клапаном и газом */
      this.iz1 += (w - this.iz1) * this.kIn2;
      this.iz2 += (this.iz1 - this.iz2) * this.kIn1;
      s += (this.iz1 - this.iz2) * intake * (0.04 + 0.16 * this.thrS) * Math.min(1, this.rpm / 1500);
      /* механика: щелчки клапанов, у воздушников громче */
      this.tz += (w - this.tz) * this.kTick;
      s += (w - this.tz) * this.tick * (this.air ? 0.07 : 0.04) * (0.4 + Math.min(1, this.rpm / this.red));
      this.tick *= 0.985;
      /* стартер: вой мотора стартера и шестерён */
      if (this.stS > 0.01) {
        this.whPh += 2 * Math.PI * (55 + this.rpm * 0.9) / sr;
        const saw = (this.whPh / (2 * Math.PI)) % 1;
        s += this.stS * (0.035 * (saw * 2 - 1) + 0.02 * Math.sin(this.whPh * 3.01) + 0.012 * w);
      }
      /* убрать постоянку и мягко ограничить */
      const hy = s - this.hx + 0.996 * this.hy;
      this.hx = s;
      this.hy = hy;
      /* мягкая автогромкость: тихие холостые подтягиваем, высокие не даём перегрузить */
      this.env += (hy * hy - this.env) * this.kEnv;
      const ag = Math.min(5, Math.max(0.7, Math.pow(0.1 / (Math.sqrt(this.env) + 0.004), 0.65)));
      this.ag += (ag - this.ag) * this.kAg;
      const o = Math.tanh(hy * this.ag * this.gain) * 0.62 * this.vol;
      out[i] = o;
      this.acc += o * o;
      this.accN++;
    }
    if (this.accN >= 1800) {
      this.port.postMessage({ l: Math.min(1, Math.sqrt(this.acc / this.accN) * 4), r: Math.round(this.rpm), f: this.fires, p: this.pops });
      this.acc = 0;
      this.accN = 0;
    }
    for (let ch = 1; ch < outputs[0].length; ch++) outputs[0][ch].set(out);
    return true;
  }
}
registerProcessor("mh-engine", MhEngine);
