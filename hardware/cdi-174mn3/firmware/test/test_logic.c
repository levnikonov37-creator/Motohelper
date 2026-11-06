/*
 * Проверка логики зажигания на компьютере: «виртуальный мотор» крутит коленвал,
 * пикап даёт передний и задний край зуба, а тест смотрит, на каком угле до ВМТ
 * на самом деле проскочила искра и что преобразователь в этот момент был выключен.
 *
 *   make -C hardware/cdi-174mn3/firmware test
 */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>

#include "../sport_cdi/cdi_core.h"

/* ---------- модель железа ---------- */
static uint32_t sim_t;              /* текущее время, такты по 4 мкс */
static int      chg_on;             /* преобразователь включён */
static int      pend_spark;         /* назначена искра */
static uint32_t pend_spark_t;
static int      pend_done;
static uint32_t pend_done_t;

#define MAX_SPARKS 20000
static uint32_t spark_t[MAX_SPARKS];
static int      spark_n;
static int      spark_with_charger;  /* искра при включённом преобразователе — недопустимо */

static uint16_t hw_timer16(void) { return (uint16_t)sim_t; }
static void hw_charger(uint8_t on) { chg_on = on; }
static void hw_arm_at(uint16_t when) {
  pend_spark = 1;
  pend_spark_t = sim_t + (uint16_t)(when - (uint16_t)sim_t);
}
static void do_spark(uint32_t t) {
  if (chg_on) spark_with_charger++;
  if (spark_n < MAX_SPARKS) spark_t[spark_n++] = t;
  core_on_spark();
  pend_done = 1;
  pend_done_t = t + S.chgOffTicks;
}
static void hw_fire_now(void) { do_spark(sim_t); }
static void hw_plan_begin(void) {}
static void hw_plan_end(void) {}

/* обработать внутренние события до момента t */
static void run_until(uint32_t t) {
  for (;;) {
    uint32_t next = 0; int which = 0;
    if (pend_spark && (int32_t)(pend_spark_t - t) <= 0) { next = pend_spark_t; which = 1; }
    if (pend_done && (int32_t)(pend_done_t - t) <= 0 && (!which || (int32_t)(pend_done_t - next) < 0)) { next = pend_done_t; which = 2; }
    if (!which) break;
    sim_t = next;
    if (which == 1) { pend_spark = 0; do_spark(next); }
    else { pend_done = 0; core_on_spark_done(); }
  }
  sim_t = t;
}

/* ---------- модель мотора ---------- */
static double true_lead = 34.0;   /* передний край зуба, градусы до ВМТ */
static double true_trail = 10.0;  /* задний край */
static int    lead_is_A = 1;      /* полярность пикапа: передний край даёт импульс в канале A */
static double tdc_t;              /* время последней ВМТ, такты (дробное) */

#define MAX_REV 20000
static double rev_tdc[MAX_REV], rev_period[MAX_REV];
static int    rev_n;

static double noise_frac = -1;    /* >0 — лишний импульс в канале переднего края на этой доле оборота */
static double tnoise_frac = -1;   /* >0 — лишний импульс в канале заднего края на этой доле оборота */

static void reset_all(void) {
  sim_t = 1000; chg_on = 0; pend_spark = pend_done = 0;
  spark_n = 0; spark_with_charger = 0; rev_n = 0;
  tdc_t = 100000.0;
  noise_frac = -1; tnoise_frac = -1;
  true_lead = 34.0; true_trail = 10.0; lead_is_A = 1;
  cfg_defaults(&cfg);
  cfg.latUs = 0;
  core_init();
}

static void edge(int lead_edge, double t) {
  uint32_t ti = (uint32_t)llround(t);
  run_until(ti);
  int ch = lead_edge ? (lead_is_A ? 0 : 1) : (lead_is_A ? 1 : 0);
  core_on_edge((uint8_t)ch, ti);
  core_poll(ti);
}

/* один оборот на заданных оборотах; target — ожидаемый угол (для отчёта) */
static void rev(double rpm) {
  double P = (double)TICKS_PER_MIN / rpm;
  double tdc = tdc_t + P;
  double lead_t = tdc - true_lead / 360.0 * P;
  double trail_t = tdc - true_trail / 360.0 * P;
  /* события оборота строго по времени */
  struct { double t; int lead; } ev[4];
  int n = 0;
  ev[n].t = lead_t; ev[n++].lead = 1;
  ev[n].t = trail_t; ev[n++].lead = 0;
  if (noise_frac > 0) { ev[n].t = lead_t + noise_frac * P; ev[n++].lead = 1; }
  if (tnoise_frac > 0) { ev[n].t = lead_t + tnoise_frac * P; ev[n++].lead = 0; }
  for (int i = 1; i < n; i++)
    for (int j = i; j > 0 && ev[j].t < ev[j - 1].t; j--) { double tt = ev[j].t; int ll = ev[j].lead; ev[j] = ev[j - 1]; ev[j - 1].t = tt; ev[j - 1].lead = ll; }
  for (int i = 0; i < n; i++) edge(ev[i].lead, ev[i].t);
  if (rev_n < MAX_REV) { rev_tdc[rev_n] = tdc; rev_period[rev_n] = P; rev_n++; }
  tdc_t = tdc;
}

static void finish(void) { run_until((uint32_t)llround(tdc_t) + 2000); }

/* угол искры до ВМТ своего оборота (ВМТ — ближайшая следующая) */
static double spark_angle(int i, int *rev_idx) {
  double t = spark_t[i];
  for (int k = 0; k < rev_n; k++) {
    if (rev_tdc[k] >= t - 0.5) {
      if (rev_idx) *rev_idx = k;
      return (rev_tdc[k] - t) / rev_period[k] * 360.0;
    }
  }
  if (rev_idx) *rev_idx = -1;
  return -999;
}

static int fails, checks;
#define CHECK(cond, ...) do { checks++; if (!(cond)) { fails++; printf("  ОШИБКА: " __VA_ARGS__); printf("\n"); } } while (0)

/* прогнать N оборотов на постоянных оборотах, вернуть средний угол последних искр */
static double steady(double rpm, int n, int *count) {
  for (int i = 0; i < 6; i++) rev(rpm);     /* разгон, план на оборот вперёд */
  int s0 = spark_n;
  for (int i = 0; i < n; i++) rev(rpm);
  finish();
  double sum = 0; int c = 0;
  for (int i = s0; i < spark_n; i++) { double a = spark_angle(i, NULL); sum += a; c++; }
  if (count) *count = c;
  return c ? sum / c : -999;
}

static void test_units(void) {
  printf("Арифметика\n");
  int32_t v;
  CHECK(parse_dec10("33.5", &v) && v == 335, "33.5");
  CHECK(parse_dec10("33,5", &v) && v == 335, "33,5");
  CHECK(parse_dec10("8", &v) && v == 80, "8");
  CHECK(parse_dec10("-2", &v) && v == -20, "-2");
  CHECK(parse_dec10("10000", &v) && v == 100000, "10000");
  CHECK(!parse_dec10("abc", &v), "abc");
  CHECK(!parse_dec10("", &v), "пусто");
  CHECK(!parse_dec10("1.2.3", &v), "1.2.3");
  CHECK(rpm_from_period(TICKS_PER_MIN / 3000) == 3000, "rpm 3000");
  CHECK(mul_q16(65536UL * 3 + 100, 32768) == (65536UL * 3 + 100) / 2, "mul_q16");
  CHECK(abs((int)mul_q16(20000, q16_from_deci(900)) - 5000) <= 1, "четверть оборота");
  int16_t tab[N_PTS];
  for (int i = 0; i < N_PTS; i++) tab[i] = (int16_t)(i * 10);
  CHECK(adv_lookup(tab, 500) == 0, "ниже таблицы");
  CHECK(adv_lookup(tab, 1250) == 5, "интерполяция 1250");
  CHECK(adv_lookup(tab, 5500) == 85, "интерполяция 5500");
  CHECK(adv_lookup(tab, 20000) == 140, "выше таблицы");
  Limiter L = {0, 0};
  CHECK(limiter_fire(&L, 9000, 10000, 0) == 1, "ниже отсечки");
  CHECK(limiter_fire(&L, 10000, 10000, 0) == 0, "на отсечке");
  CHECK(limiter_fire(&L, 9970, 10000, 0) == 0, "гистерезис");
  CHECK(limiter_fire(&L, 9930, 10000, 0) == 1, "возврат");
  CdiConfig c; cfg_defaults(&c);
  c.revLimit = 60000; c.lead10 = 2000;
  CHECK(cfg_sanitize(&c) && c.revLimit == 12000 && c.lead10 == 600, "ограничение настроек");
}

static void test_uncalibrated(void) {
  printf("Без калибровки — искра по заднему краю\n");
  reset_all();
  int n;
  double a = steady(3000, 40, &n);
  printf("  3000 об/мин: угол %.2f°, искр %d из 40\n", a, n);
  CHECK(fabs(a - true_trail) < 0.3, "угол %.2f, ждали %.1f", a, true_trail);
  CHECK(n >= 39, "искр %d", n);
  a = steady(8000, 40, &n);
  printf("  8000 об/мин: угол %.2f°\n", a);
  CHECK(fabs(a - true_trail) < 0.3, "угол %.2f", a);
}

static void test_curve(double cfg_lead, const char *title) {
  printf("%s\n", title);
  reset_all();
  cfg.calibrated = 1; cfg.lead10 = (int16_t)llround(cfg_lead * 10); cfg.revLimit = 11500;
  core_apply_config();
  double rpms[] = { 1200, 2000, 3000, 4000, 5500, 7000, 8500, 10000, 11000 };
  for (unsigned i = 0; i < sizeof(rpms) / sizeof(rpms[0]); i++) {
    int n;
    double a = steady(rpms[i], 30, &n);
    double want = adv_lookup(cfg.map[0], (uint16_t)rpms[i]) / 10.0;
    if (want > cfg_lead) want = cfg_lead;
    double expect = want + (true_lead - cfg_lead);   /* ошибка калибровки сдвигает угол целиком */
    printf("  %5.0f об/мин: угол %5.2f°, по карте %5.2f°, ждём %5.2f°\n", rpms[i], a, want, expect);
    CHECK(fabs(a - expect) < 0.3, "%.0f об/мин: %.2f вместо %.2f", rpms[i], a, expect);
    CHECK(n >= 29, "%.0f об/мин: искр %d", rpms[i], n);
  }
}

static void test_crank(void) {
  printf("Пуск стартером 300 об/мин\n");
  reset_all();
  cfg.calibrated = 1; core_apply_config();
  for (int i = 0; i < 12; i++) rev(300);
  finish();
  CHECK(spark_n >= 10, "искр %d из 12 оборотов", spark_n);
  int first_rev = -1;
  for (int i = 0; i < spark_n; i++) {
    int k; double a = spark_angle(i, &k);
    if (first_rev < 0) first_rev = k;
    if (i >= 1) CHECK(fabs(a - true_trail) < 0.3, "пуск: искра на %.2f°", a);
  }
  printf("  первая искра на обороте %d, искр %d\n", first_rev + 1, spark_n);
  CHECK(first_rev >= 0 && first_rev <= 1, "первая искра поздно: оборот %d", first_rev + 1);
  CHECK(S.state == ST_CRANK, "режим %d", S.state);
}

static void test_limiter(void) {
  printf("Отсечка\n");
  reset_all();
  cfg.calibrated = 1; cfg.revLimit = 6000; core_apply_config();
  int n;
  steady(6500, 40, &n);
  printf("  жёсткая, 6500 об/мин при отсечке 6000: искр %d из 40\n", n);
  CHECK(n == 0, "искр %d", n);
  steady(5500, 40, &n);
  CHECK(n >= 39, "после отсечки искра вернулась: %d", n);
  cfg.softCut = 1; core_apply_config();
  steady(6100, 40, &n);
  printf("  мягкая, 6100: искр %d из 40\n", n);
  CHECK(n >= 15 && n <= 25, "мягкая: %d", n);
  steady(6300, 40, &n);
  CHECK(n == 0, "мягкая выше +200: %d", n);
}

static void test_stall(void) {
  printf("Остановка мотора\n");
  reset_all();
  cfg.calibrated = 1; core_apply_config();
  steady(1500, 10, NULL);
  CHECK(S.state != ST_STOP, "мотор работает");
  CHECK(chg_on, "преобразователь включён на работе");
  run_until(sim_t + 150000);
  core_poll(sim_t);
  CHECK(S.state == ST_STOP, "остановка не замечена");
  CHECK(!chg_on && (S.inhibit & INH_STOP), "преобразователь не выключен на стоящем моторе");
}

static void test_noise(void) {
  printf("Помеха в канале пикапа\n");
  reset_all();
  cfg.calibrated = 1; cfg.revLimit = 11500; core_apply_config();
  noise_frac = 0.3;
  int n;
  double a = steady(4000, 40, &n);
  double want = adv_lookup(cfg.map[0], 4000) / 10.0;
  printf("  4000 об/мин + помеха: угол %.2f°, искр %d из 40, отброшено помех %lu\n", a, n, (unsigned long)S.noise);
  CHECK(fabs(a - want) < 0.3, "угол %.2f вместо %.2f", a, want);
  CHECK(n >= 39 && n <= 41, "искр %d", n);
  CHECK(S.noise >= 40, "помехи не отброшены");
}

static void test_noise_crank(void) {
  printf("Помеха на пуске раньше заднего края\n");
  reset_all();
  cfg.calibrated = 1; core_apply_config();
  for (int i = 0; i < 4; i++) rev(300);         /* сначала чисто — задний край известен */
  int s0 = spark_n;
  tnoise_frac = 0.01;                           /* через 3.6° после переднего края */
  for (int i = 0; i < 10; i++) rev(300);
  finish();
  int early = 0;
  for (int i = s0; i < spark_n; i++) { double a = spark_angle(i, NULL); if (a > true_trail + 1.0) early++; }
  printf("  искр %d, слишком ранних %d\n", spark_n - s0, early);
  CHECK(early == 0, "ранние искры на пуске: %d", early);
  CHECK(spark_n - s0 >= 9, "искр %d", spark_n - s0);
}

static void test_polarity(void) {
  printf("Пикап подключён наоборот (автоопределение)\n");
  reset_all();
  cfg.calibrated = 1; core_apply_config();
  lead_is_A = 0;
  int n;
  double a = steady(3000, 40, &n);
  double want = adv_lookup(cfg.map[0], 3000) / 10.0;
  printf("  3000 об/мин: угол %.2f°, по карте %.2f°, ведущий канал %c\n", a, want, S.leadCh ? 'B' : 'A');
  CHECK(S.leadCh == 1, "канал не определён");
  CHECK(fabs(a - want) < 0.3, "угол %.2f", a);
  printf("  то же с помехой в канале переднего края\n");
  reset_all();
  cfg.calibrated = 1; core_apply_config();
  lead_is_A = 0; noise_frac = 0.3;
  a = steady(3000, 40, NULL);
  CHECK(S.leadCh == 1, "помеха перевернула каналы");
  CHECK(fabs(a - want) < 0.3, "угол %.2f", a);
  lead_is_A = 1; reset_all();
  cfg.calibrated = 1; core_apply_config();
  noise_frac = 0.3;
  a = steady(3000, 40, NULL);
  CHECK(S.leadCh == 0, "помеха перевернула каналы (A)");
  CHECK(fabs(a - want) < 0.3, "угол %.2f", a);
}

static void test_kill(void) {
  printf("Глушение\n");
  reset_all();
  cfg.calibrated = 1; core_apply_config();
  inh_set(INH_KILL);
  int n;
  steady(3000, 20, &n);
  CHECK(n == 0, "искр при глушении: %d", n);
  CHECK(!chg_on, "преобразователь при глушении");
}

static void test_modes(void) {
  printf("Режимы калибровки\n");
  reset_all();
  core_apply_config();
  S.tmode = TM_CAL;            /* калибровка работает и без измеренного угла */
  double a = steady(3000, 20, NULL);
  double corr = core_lead_correction10() / 10.0;
  printf("  cal на 3000: стробоскоп %.2f°, поправка %.2f°, передний край %.2f° (на самом деле %.1f°)\n", a, corr, a + corr, true_lead);
  CHECK(fabs(a + corr - true_lead) < 0.3, "cal: %.2f + %.2f", a, corr);
  /* как это делает команда lead: показание + поправка */
  cfg.lead10 = (int16_t)llround(a * 10) + core_lead_correction10();
  cfg.calibrated = 1; S.tmode = TM_NORMAL; core_apply_config();
  a = steady(9000, 20, NULL);
  printf("  после такой калибровки 9000 об/мин: угол %.2f°, по карте %.2f°\n", a, adv_lookup(cfg.map[0], 9000) / 10.0);
  CHECK(fabs(a - adv_lookup(cfg.map[0], 9000) / 10.0) < 0.3, "калибровка через cal: %.2f", a);
  cfg.calibrated = 1; S.tmode = TM_FIX; S.fixAdv10 = 150;
  a = steady(6000, 20, NULL);
  printf("  fix 15: угол %.2f°\n", a);
  CHECK(fabs(a - 15.0) < 0.3, "fix: %.2f", a);
  S.tmode = TM_NORMAL;
  for (int i = 0; i < N_PTS; i++) cfg.map[0][i] = 450;   /* 45° — больше переднего края */
  a = steady(6000, 20, NULL);
  printf("  карта 45° при зубе 34°: угол %.2f° (раньше зуба нельзя)\n", a);
  CHECK(fabs(a - true_lead) < 0.3, "ограничение по зубу: %.2f", a);
}

static void test_ramp(void) {
  printf("Разгон 300 → 9500 и сброс газа\n");
  reset_all();
  cfg.calibrated = 1; cfg.revLimit = 11500; core_apply_config();
  double rpm = 300; int revs = 0;
  double worst_adv = 0;
  while (rpm < 9500) { rev(rpm); rpm *= 1.03; revs++; }
  while (rpm > 1200) { rev(rpm); rpm /= 1.03; revs++; }
  finish();
  for (int i = 0; i < spark_n; i++) {
    int k; double a = spark_angle(i, &k);
    if (k < 0) continue;
    double r = TICKS_PER_MIN / rev_period[k];
    double want = r < cfg.crankRpm + CRANK_HYST ? true_trail : adv_lookup(cfg.map[0], (uint16_t)r) / 10.0;
    double over = a - want;
    if (over > worst_adv) worst_adv = over;
  }
  printf("  оборотов %d, искр %d, худшее опережение сверх карты %.2f°\n", revs, spark_n, worst_adv);
  CHECK(spark_n >= revs - 4, "пропуски: %d искр на %d оборотов", spark_n, revs);
  CHECK(worst_adv < 2.0, "перебор угла %.2f°", worst_adv);
}

int main(void) {
  test_units();
  test_uncalibrated();
  test_curve(34.0, "Калибровка верная (зуб 34°) — угол по карте 1");
  test_curve(37.0, "Калибровка завышена на 3° — угол позже карты (безопасно)");
  test_crank();
  test_limiter();
  test_stall();
  test_noise();
  test_noise_crank();
  test_polarity();
  test_kill();
  test_modes();
  test_ramp();
  printf("\nПроверок: %d, ошибок: %d\n", checks, fails);
  if (spark_with_charger) printf("ОШИБКА: искра при включённом преобразователе (%d)\n", spark_with_charger);
  return (fails || spark_with_charger) ? 1 : 0;
}
