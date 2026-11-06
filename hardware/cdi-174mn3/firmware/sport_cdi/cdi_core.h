/*
 * cdi_core.h — логика зажигания: когда давать искру, когда держать преобразователь выключенным.
 *
 * Работает от двух событий пикапа на каждом обороте:
 *   передний край зуба (lead)  — точка отсчёта, угол lead10 до ВМТ (меряется стробоскопом);
 *   задний край зуба (trail)   — поздняя точка, по ней искра на пуске (как у штатного коммутатора).
 * Какой из двух каналов компаратора передний, прошивка определяет сама (короткий промежуток
 * «передний → задний», длинный — «задний → следующий передний»).
 *
 * Железо подключается через четыре функции, которые определяет скетч (или тест):
 *   hw_arm_at(when)  — поднять затвор тиристора аппаратно в момент таймера `when` (16 бит);
 *   hw_fire_now()    — поднять затвор прямо сейчас;
 *   hw_charger(on)   — включить / выключить преобразователь 12 → 300 В;
 *   hw_timer16()     — текущее значение таймера (16 бит).
 * Обратно железо сообщает: core_on_spark() — затвор поднят, core_on_spark_done() — можно заряжать.
 * hw_plan_begin()/hw_plan_end() обрамляют расчёт плана на следующий оборот: искра уже назначена,
 * и на это время скетч пускает остальные прерывания (конец импульса, заряд, USB), не пуская пикап.
 */
#ifndef CDI_CORE_H
#define CDI_CORE_H

#include <stdint.h>
#include "cdi_logic.h"

#define CFG_MAGIC        0xCD17
#define CFG_VERSION      1

#define STALL_TICKS      125000UL  /* 0.5 с без пикапа — мотор стоит */
#define MIN_PERIOD_TICKS 937UL     /* быстрее 16 000 об/мин — это помеха */
#define CRANK_HYST       150U      /* гистерезис пуск/работа, об/мин */
#define MIN_AHEAD_TICKS  4         /* ближе 16 мкс — искра сразу, без таймера */
#define MAX_DELAY_TICKS  30000UL
#define MIN_TRAIL_TICKS  5UL       /* звон сразу после переднего края — не задний край */
#define CAL_TICKS        25UL      /* cal: искра ровно через 100 мкс после переднего края */

enum { ST_STOP = 0, ST_CRANK = 1, ST_RUN = 2 };
enum { INH_SPARK = 1, INH_STOP = 2, INH_KILL = 4, INH_FAULT = 8 };
enum { TM_NORMAL = 0, TM_CAL = 1, TM_FIX = 2 };
enum { PLAN_NONE = 0, PLAN_SKIP = 1, PLAN_FIRE = 2 };

typedef struct {
  uint16_t magic;
  uint8_t  version;
  uint8_t  calibrated;   /* 0 — угол переднего края не измерен: искра только по заднему краю */
  int16_t  lead10;       /* угол переднего края зуба до ВМТ, десятые градуса */
  uint16_t revLimit;     /* отсечка, об/мин */
  uint8_t  softCut;      /* 0 — жёсткая отсечка, 1 — мягкая */
  uint8_t  pol;          /* 0 — авто, 1 — канал A передний, 2 — канал B передний */
  uint16_t crankRpm;     /* ниже — режим пуска */
  int16_t  crankAdv10;   /* угол пуска, если задний край не виден */
  uint8_t  latUs;        /* задержка «вход → искра», мкс, вычитается из расчёта */
  uint8_t  reserved;
  uint16_t chgOffUs;     /* сколько держать преобразователь выключенным после искры */
  int16_t  map[2][N_PTS];
  uint8_t  sum;
} CdiConfig;

/* Карта 1 — спорт (АИ-95/98), карта 2 — мягкая (АИ-92/95, жара, слабый бензин). Градусы до ВМТ. */
static const int16_t DEFAULT_MAP[2][N_PTS] = {
  /* 1000 1500 2000 2500 3000 3500 4000 4500 5000 6000 7000 8000 9000 10000 11000 */
  {  100, 120, 150, 180, 220, 250, 280, 300, 310, 320, 320, 320, 310,  300,  300 },
  {  100, 100, 120, 150, 180, 210, 240, 260, 270, 280, 280, 280, 280,  270,  270 }
};

static void cfg_defaults(CdiConfig *c) {
  c->magic = CFG_MAGIC; c->version = CFG_VERSION;
  c->calibrated = 0;
  c->lead10 = 340;
  c->revLimit = 10000;
  c->softCut = 0;
  c->pol = 0;
  c->crankRpm = 800;
  c->crankAdv10 = 80;
  c->latUs = 12;
  c->reserved = 0;
  c->chgOffUs = 300;
  for (uint8_t m = 0; m < 2; m++)
    for (uint8_t i = 0; i < N_PTS; i++) c->map[m][i] = DEFAULT_MAP[m][i];
  c->sum = 0;
}

/* Держит настройки в безопасных рамках. Возвращает 1, если что-то пришлось поправить. */
static uint8_t cfg_sanitize(CdiConfig *c) {
  uint8_t fixed = 0;
#define CLAMP(v, lo, hi) do { if ((v) < (lo)) { (v) = (lo); fixed = 1; } else if ((v) > (hi)) { (v) = (hi); fixed = 1; } } while (0)
  CLAMP(c->lead10, 50, 600);
  CLAMP(c->revLimit, 3000, 12000);
  CLAMP(c->crankRpm, 400, 2000);
  CLAMP(c->crankAdv10, 0, 200);
  CLAMP(c->latUs, 0, 200);
  CLAMP(c->chgOffUs, 150, 2000);
  if (c->softCut > 1) { c->softCut = 0; fixed = 1; }
  if (c->pol > 2) { c->pol = 0; fixed = 1; }
  if (c->calibrated > 1) { c->calibrated = 0; fixed = 1; }
  for (uint8_t m = 0; m < 2; m++)
    for (uint8_t i = 0; i < N_PTS; i++) CLAMP(c->map[m][i], 0, 500);
#undef CLAMP
  return fixed;
}

typedef struct {
  volatile uint8_t  state;
  volatile uint8_t  leadCh;      /* 0 — A, 1 — B */
  volatile uint8_t  crankArmed;  /* искра на ближайшем заднем крае */
  volatile uint8_t  runPlan;     /* план на следующий оборот (PLAN_*), посчитан на текущем */
  volatile uint8_t  sparkBusy;   /* искра назначена или идёт, ещё не отпущен заряд */
  volatile uint8_t  inhibit;     /* причины держать преобразователь выключенным (INH_*) */
  volatile uint8_t  activeMap;   /* 0 / 1 */
  volatile uint8_t  tmode;       /* TM_* */
  volatile uint8_t  seen;        /* бит 0 — был импульс A, бит 1 — был B */
  volatile int8_t   polVote;
  volatile int16_t  fixAdv10;
  volatile int16_t  advNow;      /* угол последней назначенной искры */
  volatile uint16_t rpm;
  volatile uint16_t planQ16;     /* доля оборота от переднего края до искры, план на следующий оборот */
  volatile uint16_t latTicks;
  volatile uint16_t chgOffTicks;
  volatile uint16_t trailFrac;   /* задний край: доля оборота от переднего, Q16 */
  volatile uint16_t calRpm;      /* обороты в режиме cal — для поправки при записи угла */
  volatile uint8_t  trailRej;
  volatile uint32_t tLead, tTrail, period, trailGap;
  volatile uint32_t tA, tB, pA, pB, gapAB, gapBA;
  volatile uint32_t sparks, skips, noise;
  Limiter lim;
} CdiState;

static CdiConfig cfg;
static CdiState  S;

static void hw_arm_at(uint16_t when);
static void hw_fire_now(void);
static void hw_charger(uint8_t on);
static uint16_t hw_timer16(void);
static void hw_plan_begin(void);
static void hw_plan_end(void);

static void inh_set(uint8_t m) { S.inhibit |= m; hw_charger(S.inhibit == 0); }
static void inh_clr(uint8_t m) { S.inhibit &= (uint8_t)~m; hw_charger(S.inhibit == 0); }

static void core_apply_config(void) {
  S.latTicks = (uint16_t)(cfg.latUs / TICK_US);
  S.chgOffTicks = (uint16_t)((cfg.chgOffUs + TICK_US - 1) / TICK_US);
  if (cfg.pol) S.leadCh = (uint8_t)(cfg.pol - 1);
  S.runPlan = PLAN_NONE;  /* пересчитается на следующем обороте */
}

static void core_init(void) {
  uint8_t *p = (uint8_t *)&S;
  for (uint16_t i = 0; i < sizeof(S); i++) p[i] = 0;
  S.state = ST_STOP;
  S.inhibit = INH_STOP;
  hw_charger(0);
  core_apply_config();
}

static int16_t core_target_adv(uint16_t rpm) {
  int16_t a;
  if (S.tmode == TM_CAL) a = cfg.lead10;
  else if (S.tmode == TM_FIX) a = S.fixAdv10;
  else a = adv_lookup(cfg.map[S.activeMap], rpm);
  if (a > cfg.lead10) a = cfg.lead10;   /* раньше переднего края зуба искру не дать */
  if (a < 0) a = 0;
  return a;
}

/* Назначить искру через d тактов после события в момент t. */
static void core_schedule(uint32_t t, uint32_t d) {
  if (S.sparkBusy) return;
  S.sparkBusy = 1;
  inh_set(INH_SPARK);                  /* преобразователь — стоп до конца искры */
  d = d > S.latTicks ? d - S.latTicks : 0;
  if (d > MAX_DELAY_TICKS) d = MAX_DELAY_TICKS;
  uint16_t when = (uint16_t)((uint16_t)t + (uint16_t)d);
  int16_t ahead = (int16_t)(uint16_t)(when - hw_timer16());
  if (ahead > MIN_AHEAD_TICKS) hw_arm_at(when);
  else hw_fire_now();
}

static void core_on_spark(void) { S.sparks++; }

static void core_on_spark_done(void) {
  S.sparkBusy = 0;
  inh_clr(INH_SPARK);
}

static uint8_t core_trail_recent(uint32_t t) {
  return S.trailGap && (t - S.tTrail) < S.period + (S.period >> 1);
}

static int16_t core_trail_angle(void) {
  if (!S.period) return 0;
  return (int16_t)(cfg.lead10 - (int16_t)((S.trailGap * 3600UL) / S.period));
}

/* Задержка от переднего края до искры по плану. В cal — ровно CAL_TICKS (+lat, который вычтется). */
static uint32_t core_plan_delay(uint32_t p) {
  if (S.tmode == TM_CAL) return CAL_TICKS + S.latTicks;
  return mul_q16(p, S.planQ16);
}

static void core_on_lead(uint32_t t) {
  uint32_t p = t - S.tLead;
  if (S.state == ST_STOP || p > STALL_TICKS) {   /* первый импульс после остановки */
    S.tLead = t; S.period = 0; S.trailGap = 0; S.trailFrac = 0; S.trailRej = 0;
    S.crankArmed = 0; S.runPlan = PLAN_NONE; S.rpm = 0;
    S.state = ST_CRANK;
    inh_clr(INH_STOP);                            /* начинаем заряжать конденсатор */
    return;
  }
  if (p < MIN_PERIOD_TICKS || (S.period && p < (S.period >> 1))) { S.noise++; return; }
  S.tLead = t; S.period = p; S.crankArmed = 0;

  uint8_t blocked = S.inhibit & (INH_KILL | INH_FAULT);
  uint8_t plan = S.runPlan;
  uint8_t fired = 0;
  /* Быстрый путь: угол и решение отсечки посчитаны на прошлом обороте, здесь только умножение. */
  if (plan == PLAN_FIRE && !blocked) { core_schedule(t, core_plan_delay(p)); fired = 1; }

  hw_plan_begin();                                /* дальше — не к спеху: план на следующий оборот */
  uint16_t rpm = rpm_from_period(p);
  S.rpm = rpm;
  if (S.state == ST_CRANK) { if (rpm >= cfg.crankRpm + CRANK_HYST) S.state = ST_RUN; }
  else if (rpm < cfg.crankRpm) S.state = ST_CRANK;

  uint8_t allow = limiter_fire(&S.lim, rpm, cfg.revLimit, cfg.softCut);
  uint8_t trailMode = (S.state == ST_CRANK) || (!cfg.calibrated && S.tmode != TM_CAL);
  S.runPlan = PLAN_NONE;
  if (!trailMode) {
    int16_t a = core_target_adv(rpm);
    S.advNow = a;
    S.planQ16 = q16_from_deci((int16_t)(cfg.lead10 - a));
    S.runPlan = allow ? PLAN_FIRE : PLAN_SKIP;
    /* плана не было (только что вышли из пуска) — решаем на этом же обороте */
    if (S.tmode == TM_CAL) S.calRpm = rpm;
    if (plan == PLAN_NONE && allow && !blocked) { core_schedule(t, core_plan_delay(p)); fired = 1; }
  } else if (plan == PLAN_NONE && allow && !blocked) {
    if (core_trail_recent(t)) {
      S.crankArmed = 1;                           /* искра — на заднем крае этого оборота */
      S.advNow = core_trail_angle();
      fired = 1;
    } else {
      int16_t a = cfg.crankAdv10 > cfg.lead10 ? cfg.lead10 : cfg.crankAdv10;
      S.advNow = a;
      core_schedule(t, mul_q16(p, q16_from_deci((int16_t)(cfg.lead10 - a))));
      fired = 1;
    }
  }
  if (!fired) S.skips++;
  hw_plan_end();
}

static void core_on_trail(uint32_t t) {
  if (S.state == ST_STOP || !S.period) return;
  uint32_t g = t - S.tLead;
  if (g >= (S.period >> 1) || g < MIN_TRAIL_TICKS) return;
  /* Заметно раньше (по доле оборота), чем на прошлых оборотах, — помеха: на пуске это была бы
   * искра слишком рано. Четыре таких подряд — значит, раньше запомнили помеху, принимаем новый край.
   * Сравнение — умножением: деление здесь задержало бы искру. */
  if (S.trailFrac && g < mul_q16(S.period, (uint16_t)(S.trailFrac >> 1)) && S.trailRej < 4) {
    S.trailRej++; S.noise++; return;
  }
  if (S.crankArmed) { S.crankArmed = 0; core_schedule(t, 0); }
  S.trailRej = 0;
  S.trailFrac = (uint16_t)(((uint32_t)g << 16) / S.period);   /* g < period/2 < 65536 */
  S.trailGap = g; S.tTrail = t;
}

/* Событие компаратора: ch 0 — канал A (положительный импульс), 1 — канал B (отрицательный). */
static void core_on_edge(uint8_t ch, uint32_t t) {
  /* Сначала то, от чего зависит момент искры, потом учёт полярности. */
  if (ch == S.leadCh) core_on_lead(t); else core_on_trail(t);
  /* Для определения полярности берём только «регулярные» импульсы канала:
   * не ближе половины его периода к предыдущему — так одиночная помеха не переворачивает каналы. */
  uint8_t bit = ch ? 2 : 1;
  uint8_t seen = S.seen;
  uint32_t dt = t - (ch ? S.tB : S.tA);
  uint32_t px = ch ? S.pB : S.pA;
  if (!(seen & bit) || dt >= STALL_TICKS || dt >= (px >> 1)) {
    uint32_t np = ((seen & bit) && dt < STALL_TICKS) ? dt : 0;
    if (ch == 0) { if (seen & 2) S.gapBA = t - S.tB; S.tA = t; S.pA = np; }
    else         { if (seen & 1) S.gapAB = t - S.tA; S.tB = t; S.pB = np; }
    S.seen = seen | bit;
    uint32_t ab = S.gapAB, ba = S.gapBA;
    if (cfg.pol == 0 && ab && ba && ab < STALL_TICKS && ba < STALL_TICKS) {
      uint8_t want = (ab <= ba) ? 0 : 1;
      if (want != S.leadCh) {
        if (++S.polVote >= 3) { S.leadCh = want; S.polVote = 0; S.runPlan = PLAN_NONE; S.trailGap = 0; S.trailFrac = 0; }
      } else S.polVote = 0;
    }
  }
}

/* Угол переднего края по показанию стробоскопа в режиме cal: искра там была на CAL_TICKS + задержка
 * входа позже края, на оборотах calRpm это столько-то градусов — прибавляем. Возвращает поправку. */
static int16_t core_lead_correction10(void) {
  uint32_t us10 = (CAL_TICKS * TICK_US + cfg.latUs) * 10UL;       /* десятые мкс */
  /* градусы = мкс * об/мин * 360 / 60e6 = мкс * об/мин * 6e-6 ; в десятых: мкс*10 * об/мин * 6 / 1e6 */
  return (int16_t)((us10 * S.calRpm * 6UL + 500000UL) / 1000000UL);
}

/* Вызывать часто из основного цикла (с запрещёнными прерываниями): остановка мотора. */
static void core_poll(uint32_t now) {
  if (S.state != ST_STOP && (now - S.tLead) > STALL_TICKS) {
    S.state = ST_STOP;
    S.rpm = 0; S.period = 0; S.trailGap = 0; S.trailFrac = 0; S.advNow = 0;
    S.crankArmed = 0; S.runPlan = PLAN_NONE;
    S.lim.active = 0; S.lim.cnt = 0;
    inh_set(INH_STOP);      /* мотор стоит — 300 В на конденсаторе не держим */
  }
}

#endif
