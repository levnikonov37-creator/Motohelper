/*
 * Спортивное зажигание (DC-CDI) для Zongshen ZS174MN-3 (CBS300) — прошивка для Arduino Nano.
 * Схема, сборка и настройка — hardware/cdi-174mn3/README.md.
 *
 * Выводы Nano:
 *   D2  (INT0) — компаратор A: положительный импульс пикапа
 *   D3  (INT1) — компаратор B: отрицательный импульс пикапа
 *   D4         — переключатель карт: разомкнут — карта 1, на массе — карта 2
 *   D5         — глушение: на массе — искры нет (необязательно)
 *   D7         — запрет преобразователя 300 В: HIGH (и при сбросе Nano) — выключен
 *   D9  (OC1A) — запуск тиристора (через транзистор)
 *   D13        — светодиод на плате Nano
 *   A0         — контроль высокого напряжения (делитель 3 МОм / 36 кОм)
 *
 * Связь: USB, 115200, конец строки — «новая строка». Команда help — список команд.
 * Таймер 1: делитель 64, 1 такт = 4 мкс, 16 бит + счётчик переполнений = 32-битное время.
 */
#include <EEPROM.h>
#include "cdi_core.h"

#define FW_VERSION "1.0"

#define PIN_MAP    4
#define PIN_KILL   5
#define PIN_CHG    7     /* PD7 */
#define PIN_GATE   9     /* PB1 / OC1A */
#define PIN_LED    13

#define PULSE_TICKS 25          /* 100 мкс — импульс на управляющий электрод тиристора */

/* Делитель контроля HV: 3 × 1 МОм сверху, 36 кОм снизу; опорное — 5 В (AVcc). */
#define HV_R_TOP_K  3000UL
#define HV_R_BOT_K  36UL
#define HV_OVER_V   370         /* выше — авария: преобразователь выключается */
#define HV_LOW_V    150         /* на работе ниже — предупреждение «нет заряда» */

static volatile uint16_t ovfHi;
static volatile uint8_t  sparkPhase;   /* 0 — нет, 1 — ждём совпадения, 2 — идёт импульс */

/* ---------- железо ---------- */
static uint16_t hw_timer16(void) { return TCNT1; }

static void hw_charger(uint8_t on) {
  if (on) PORTD &= (uint8_t)~_BV(PD7);   /* LOW — транзистор закрыт, UC3843 работает */
  else    PORTD |= _BV(PD7);              /* HIGH — COMP прижат к массе, преобразователь стоит */
}

static void gate_started(void) {          /* затвор только что поднят совпадением */
  /* Сначала режим «сбросить по совпадению», потом новый OCR1A: старое значение уже позади,
   * до переполнения совпадения не будет — вывод остаётся HIGH до конца импульса. */
  TCCR1A = (uint8_t)((TCCR1A & ~(_BV(COM1A1) | _BV(COM1A0))) | _BV(COM1A1));
  OCR1A = (uint16_t)(TCNT1 + PULSE_TICKS);
  TIFR1 = _BV(OCF1A);
  sparkPhase = 2;
  TIMSK1 |= _BV(OCIE1A);
  OCR1B = (uint16_t)(TCNT1 + S.chgOffTicks);
  TIFR1 = _BV(OCF1B);
  TIMSK1 |= _BV(OCIE1B);
  core_on_spark();
}

static void hw_arm_at(uint16_t when) {
  uint8_t sreg = SREG;
  cli();                                  /* план может считаться при разрешённых прерываниях */
  /* Момент уже прошёл или вот-вот (нас могло задержать другое прерывание) — искра через 2 такта.
   * Иначе совпадение случилось бы только после полного круга таймера, через 262 мс, в случайный момент. */
  if ((int16_t)(uint16_t)(when - TCNT1) < 2) when = (uint16_t)(TCNT1 + 2);
  OCR1A = when;
  TIFR1 = _BV(OCF1A);
  TCCR1A = (uint8_t)(TCCR1A | _BV(COM1A1) | _BV(COM1A0));   /* установить OC1A по совпадению */
  sparkPhase = 1;
  TIMSK1 |= _BV(OCIE1A);
  SREG = sreg;
}

/* Расчёт плана на следующий оборот (деления — до ≈ 150 мкс) идёт с разрешёнными прерываниями,
 * чтобы вовремя закончился импульс на тиристоре, включился заряд и не терялись байты по USB.
 * Входы пикапа на это время замаскированы: их флаги сохранятся, но следующий край зуба —
 * не раньше чем через ≈ 350 мкс даже на 11 000 об/мин. */
static void hw_plan_begin(void) { EIMSK = 0; sei(); }
static void hw_plan_end(void) { cli(); EIMSK = _BV(INT0) | _BV(INT1); }

static void hw_fire_now(void) {           /* через 1–2 такта (4–8 мкс) тем же аппаратным совпадением */
  hw_arm_at((uint16_t)(TCNT1 + 2));
}

static inline uint32_t now32(void) {     /* только при запрещённых прерываниях */
  uint16_t lo = TCNT1, hi = ovfHi;
  if ((TIFR1 & _BV(TOV1)) && lo < 0x8000) hi++;
  return ((uint32_t)hi << 16) | lo;
}

ISR(TIMER1_OVF_vect) { ovfHi++; }

ISR(TIMER1_COMPA_vect) {
  if (sparkPhase == 1) gate_started();
  else {                                  /* импульс закончился, вывод уже LOW */
    TCCR1A = (uint8_t)(TCCR1A & ~(_BV(COM1A1) | _BV(COM1A0)));
    TIMSK1 &= (uint8_t)~_BV(OCIE1A);
    sparkPhase = 0;
  }
}

ISR(TIMER1_COMPB_vect) {
  TIMSK1 &= (uint8_t)~_BV(OCIE1B);
  core_on_spark_done();
}

ISR(INT0_vect) { core_on_edge(0, now32()); }
ISR(INT1_vect) { core_on_edge(1, now32()); }

/* ---------- настройки в EEPROM ---------- */
static uint8_t cfg_sum(const CdiConfig *c) { return sum8((const uint8_t *)c, sizeof(CdiConfig) - 1); }

static void cfg_read(CdiConfig *c) {
  EEPROM.get(0, *c);
  if (c->magic != CFG_MAGIC || c->version != CFG_VERSION || c->sum != cfg_sum(c)) {
    cfg_defaults(c);
    Serial.println(F("Настройки по умолчанию (в памяти пусто или повреждено)"));
  }
  cfg_sanitize(c);
}

static void cfg_save(void) {
  cfg.sum = cfg_sum(&cfg);
  EEPROM.put(0, cfg);
}

/* Новые настройки — целиком и атомарно: прерывание пикапа читает cfg в любой момент,
 * и половинка 16-битного числа в таблице угла — это случайный угол на целый оборот. */
static void cfg_commit(const CdiConfig *n) {
  CdiConfig t = *n;
  cfg_sanitize(&t);
  noInterrupts();
  cfg = t;
  core_apply_config();
  interrupts();
}

/* ---------- вывод ---------- */
static void print_deg(int16_t d10) {
  if (d10 < 0) { Serial.print('-'); d10 = (int16_t)-d10; }
  Serial.print(d10 / 10); Serial.print('.'); Serial.print(d10 % 10);
}

static uint16_t hvVolts, hvPeak, hvShow;
static uint8_t  fault, faultCount, hvLowWarn;
static uint32_t faultUntil;
static uint8_t  liveOn;
static uint16_t testRpm;
static uint32_t testStart, testNext;

static const char *state_name(uint8_t st) {
  if (st == ST_RUN) return "работа";
  if (st == ST_CRANK) return "пуск";
  return "стоит";
}

static void print_live(void) {
  noInterrupts();
  uint16_t rpm = S.rpm; int16_t adv = S.advNow; uint8_t st = S.state, ch = S.leadCh, m = S.activeMap;
  uint32_t sp = S.sparks, sk = S.skips, nz = S.noise; uint8_t lim = S.lim.active;
  interrupts();
  Serial.print(rpm); Serial.print(F(" об/мин | угол ")); print_deg(adv);
  Serial.print(F("° | HV ")); Serial.print(hvShow); Serial.print(F(" В | карта ")); Serial.print(m + 1);
  Serial.print(F(" | ")); Serial.print(state_name(st));
  if (lim) Serial.print(F(" ОТСЕЧКА"));
  if (fault) Serial.print(F(" АВАРИЯ HV"));
  if (hvLowWarn) Serial.print(F(" НЕТ ЗАРЯДА"));
  Serial.print(F(" | канал ")); Serial.print(ch ? 'B' : 'A');
  Serial.print(F(" | искр ")); Serial.print(sp); Serial.print(F(" пропусков ")); Serial.print(sk);
  Serial.print(F(" помех ")); Serial.println(nz);
}

static void print_map(uint8_t m) {
  Serial.print(F("Карта ")); Serial.print(m + 1);
  Serial.println(m == 0 ? F(" (спорт):") : F(" (мягкая):"));
  for (uint8_t i = 0; i < N_PTS; i++) {
    Serial.print(F("  ")); Serial.print(RPM_PTS[i]); Serial.print(F(": ")); print_deg(cfg.map[m][i]);
    Serial.print(F("°"));
    if (cfg.calibrated && cfg.map[m][i] > cfg.lead10) {
      Serial.print(F(" (будет ")); print_deg(cfg.lead10); Serial.print(F("° — раньше зуба нельзя)"));
    }
    Serial.println();
  }
}

static void print_show(void) {
  Serial.print(F("Спортивное зажигание 174MN-3, прошивка ")); Serial.println(F(FW_VERSION));
  print_live();
  Serial.print(F("Передний край зуба: ")); print_deg(cfg.lead10); Serial.print(F("°"));
  Serial.println(cfg.calibrated ? F(" (измерен)") : F(" — НЕ ИЗМЕРЕН: искра только по заднему краю, см. cal"));
  Serial.print(F("Отсечка: ")); Serial.print(cfg.revLimit); Serial.println(cfg.softCut ? F(" об/мин, мягкая") : F(" об/мин, жёсткая"));
  Serial.print(F("Пуск: ниже ")); Serial.print(cfg.crankRpm); Serial.print(F(" об/мин, запасной угол "));
  print_deg(cfg.crankAdv10); Serial.println(F("°"));
  Serial.print(F("Пикап: ")); Serial.println(cfg.pol == 0 ? F("авто") : cfg.pol == 1 ? F("A передний") : F("B передний"));
  Serial.print(F("Задержка входа: ")); Serial.print(cfg.latUs); Serial.print(F(" мкс, пауза заряда после искры: "));
  Serial.print(cfg.chgOffUs); Serial.println(F(" мкс"));
  if (S.tmode == TM_CAL) Serial.println(F("РЕЖИМ cal: искра на переднем крае зуба (для стробоскопа)"));
  if (S.tmode == TM_FIX) { Serial.print(F("РЕЖИМ fix: постоянный угол ")); print_deg(S.fixAdv10); Serial.println(F("°")); }
  print_map(0);
  print_map(1);
}

static void print_help(void) {
  Serial.println(F(
    "Команды (угол — градусы до ВМТ, можно 33.5 или 33,5):\n"
    "  show              — все настройки и карты\n"
    "  live              — обороты/угол/напряжение 3 раза в секунду (ещё раз — выкл)\n"
    "  cal               — искра на переднем крае зуба: смотри угол стробоскопом\n"
    "  lead 33.5         — записать измеренный угол переднего края\n"
    "  fix 15            — постоянный угол для проверки стробоскопом\n"
    "  run               — обычная работа по карте\n"
    "  adv 1 3000 22.5   — угол карты 1 на 3000 об/мин\n"
    "  curve 1 10 12 ... — вся карта (15 чисел: 1000…11000 об/мин)\n"
    "  copy 1 2          — скопировать карту 1 в карту 2\n"
    "  lim 10000         — отсечка, об/мин (3000…12000)\n"
    "  cut hard | soft   — жёсткая (с отстрелами) / мягкая отсечка\n"
    "  crank 800 8       — порог пуска, об/мин, и запасной угол пуска\n"
    "  pol auto | a | b  — какой канал пикапа передний\n"
    "  lat 12            — задержка входа, мкс\n"
    "  test 3000         — на столе: искры с частотой 3000 об/мин 10 с (мотор стоит)\n"
    "  stop              — остановить test\n"
    "  save | load | defaults — сохранить / вернуть сохранённое / заводские"));
}

/* ---------- команды ---------- */
static char line[96];
static uint8_t lineLen;

static uint8_t arg_int(const char *s, int32_t lo, int32_t hi, int32_t *out) {
  int32_t v;
  if (!parse_dec10(s, &v)) return 0;
  if (v % 10) return 0;
  v /= 10;
  if (v < lo || v > hi) return 0;
  *out = v; return 1;
}

static uint8_t arg_deg(const char *s, int32_t lo10, int32_t hi10, int32_t *out) {
  int32_t v;
  if (!parse_dec10(s, &v) || v < lo10 || v > hi10) return 0;
  *out = v; return 1;
}

static void bad(void) { Serial.println(F("Не понял. help — список команд")); }
static void ok(void) { Serial.println(F("ок (save — сохранить)")); }

static int8_t rpm_index(int32_t rpm) {
  for (uint8_t i = 0; i < N_PTS; i++) if (RPM_PTS[i] == rpm) return (int8_t)i;
  return -1;
}

static void command(char *s) {
  char *tok[18]; uint8_t n = 0;
  for (char *p = strtok(s, " \t"); p && n < 18; p = strtok(NULL, " \t")) tok[n++] = p;
  if (!n) return;
  for (char *p = tok[0]; *p; p++) if (*p >= 'A' && *p <= 'Z') *p = (char)(*p - 'A' + 'a');
  const char *c = tok[0];
  int32_t a, b, v;

  if (!strcmp(c, "help") || !strcmp(c, "?")) print_help();
  else if (!strcmp(c, "show")) print_show();
  else if (!strcmp(c, "live")) liveOn = !liveOn;
  else if (!strcmp(c, "cal")) {
    noInterrupts(); S.tmode = TM_CAL; S.runPlan = PLAN_NONE; S.calRpm = 0; interrupts();
    Serial.println(F("cal: искра у переднего края зуба. Держи ровно 3000 об/мин без нагрузки, смотри угол стробоскопом и,"));
    Serial.println(F("не глуша мотор, введи lead <угол со стробоскопа> — поправку на обороты прошивка добавит сама"));
  }
  else if (!strcmp(c, "run")) {
    noInterrupts(); S.tmode = TM_NORMAL; S.runPlan = PLAN_NONE; interrupts();
    Serial.println(F("работа по карте"));
  }
  else if (!strcmp(c, "fix") && n == 2 && arg_deg(tok[1], 0, 450, &v)) {
    if (!cfg.calibrated) { Serial.println(F("Сначала измерь передний край: cal, потом lead <угол>")); return; }
    noInterrupts(); S.fixAdv10 = (int16_t)v; S.tmode = TM_FIX; S.runPlan = PLAN_NONE; interrupts();
    Serial.print(F("постоянный угол ")); print_deg((int16_t)v); Serial.println(F("° — проверь стробоскопом"));
  }
  else if (!strcmp(c, "lead") && n == 2 && arg_deg(tok[1], 0, 600, &v)) {
    noInterrupts();
    uint16_t cr = (S.tmode == TM_CAL) ? S.calRpm : 0;
    int16_t corr = cr ? core_lead_correction10() : 0;
    interrupts();
    if (cr) {
      Serial.print(F("стробоскоп ")); print_deg((int16_t)v); Serial.print(F("° + поправка ")); print_deg(corr);
      Serial.print(F("° на ")); Serial.print(cr); Serial.println(F(" об/мин"));
    }
    v += corr;
    if (v < 50) { Serial.println(F("Меньше 5° — так не бывает, проверь метки")); return; }
    CdiConfig nc = cfg; nc.lead10 = (int16_t)v; nc.calibrated = 1; cfg_commit(&nc);
    noInterrupts(); S.tmode = TM_NORMAL; S.runPlan = PLAN_NONE; interrupts();
    Serial.print(F("передний край зуба ")); print_deg(cfg.lead10); Serial.println(F("°, работа по карте"));
    ok();
  }
  else if (!strcmp(c, "adv") && n == 4 && arg_int(tok[1], 1, 2, &a) && arg_int(tok[2], 0, 20000, &b) && rpm_index(b) >= 0 && arg_deg(tok[3], 0, 500, &v)) {
    CdiConfig nc = cfg; nc.map[a - 1][rpm_index(b)] = (int16_t)v; cfg_commit(&nc); ok();
  }
  else if (!strcmp(c, "curve") && n == 2 + N_PTS && arg_int(tok[1], 1, 2, &a)) {
    CdiConfig nc = cfg;
    for (uint8_t i = 0; i < N_PTS; i++) { if (!arg_deg(tok[2 + i], 0, 500, &v)) { bad(); return; } nc.map[a - 1][i] = (int16_t)v; }
    cfg_commit(&nc); ok();
  }
  else if (!strcmp(c, "copy") && n == 3 && arg_int(tok[1], 1, 2, &a) && arg_int(tok[2], 1, 2, &b)) {
    CdiConfig nc = cfg;
    for (uint8_t i = 0; i < N_PTS; i++) nc.map[b - 1][i] = nc.map[a - 1][i];
    cfg_commit(&nc); ok();
  }
  else if (!strcmp(c, "lim") && n == 2 && arg_int(tok[1], 3000, 12000, &v)) {
    CdiConfig nc = cfg; nc.revLimit = (uint16_t)v; cfg_commit(&nc); ok();
  }
  else if (!strcmp(c, "cut") && n == 2 && (!strcmp(tok[1], "hard") || !strcmp(tok[1], "soft"))) {
    CdiConfig nc = cfg; nc.softCut = !strcmp(tok[1], "soft"); cfg_commit(&nc); ok();
  }
  else if (!strcmp(c, "crank") && (n == 2 || n == 3) && arg_int(tok[1], 400, 2000, &a) && (n == 2 || arg_deg(tok[2], 0, 200, &v))) {
    CdiConfig nc = cfg; nc.crankRpm = (uint16_t)a; if (n == 3) nc.crankAdv10 = (int16_t)v; cfg_commit(&nc); ok();
  }
  else if (!strcmp(c, "pol") && n == 2 && (!strcmp(tok[1], "auto") || !strcmp(tok[1], "a") || !strcmp(tok[1], "b"))) {
    CdiConfig nc = cfg; nc.pol = !strcmp(tok[1], "auto") ? 0 : !strcmp(tok[1], "a") ? 1 : 2; cfg_commit(&nc); ok();
  }
  else if (!strcmp(c, "lat") && n == 2 && arg_int(tok[1], 0, 200, &v)) {
    CdiConfig nc = cfg; nc.latUs = (uint8_t)v; cfg_commit(&nc); ok();
  }
  else if (!strcmp(c, "test") && n == 2 && arg_int(tok[1], 300, 12000, &v)) {
    if (S.state != ST_STOP) { Serial.println(F("test — только когда мотор стоит")); return; }
    testRpm = (uint16_t)v; testStart = millis(); testNext = micros();
    noInterrupts(); inh_clr(INH_STOP); interrupts();
    Serial.println(F("test: искры 10 с. Свеча должна лежать на массе!"));
  }
  else if (!strcmp(c, "stop")) { if (testRpm) { testRpm = 0; noInterrupts(); inh_set(INH_STOP); interrupts(); } Serial.println(F("стоп")); }
  else if (!strcmp(c, "save")) { cfg_save(); Serial.println(F("сохранено")); }   /* лучше на заглушенном моторе */
  else if (!strcmp(c, "load")) { CdiConfig nc; cfg_read(&nc); cfg_commit(&nc); Serial.println(F("загружено сохранённое")); }
  else if (!strcmp(c, "defaults")) { CdiConfig nc; cfg_defaults(&nc); cfg_commit(&nc); Serial.println(F("заводские настройки (save — сохранить)")); }
  else bad();
}

static void read_serial(void) {
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\r') continue;
    if (ch == '\n') { line[lineLen] = 0; command(line); lineLen = 0; }
    else if (lineLen < sizeof(line) - 1) line[lineLen++] = ch;
  }
}

/* ---------- основной цикл ---------- */
void setup() {
  /* сначала — безопасное состояние выходов */
  PORTD |= _BV(PD7); DDRD |= _BV(DDD7);          /* преобразователь выключен */
  PORTB &= (uint8_t)~_BV(PB1); DDRB |= _BV(DDB1); /* затвор LOW */
  pinMode(PIN_MAP, INPUT_PULLUP);
  pinMode(PIN_KILL, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  pinMode(2, INPUT); pinMode(3, INPUT);          /* подтяжки — на плате, 10 кОм */

  Serial.begin(115200);
  cfg_read(&cfg);                                /* прерывания пикапа ещё выключены */

  noInterrupts();
  TCCR1A = 0;                                    /* ядро Arduino ставит таймер 1 в ШИМ — сбрасываем */
  TCCR1B = _BV(CS11) | _BV(CS10);                /* нормальный режим, делитель 64 */
  TCCR1C = 0;
  TCNT1 = 0;
  TIFR1 = 0xFF;
  TIMSK1 = _BV(TOIE1);
  core_init();
  EICRA = _BV(ISC01) | _BV(ISC00) | _BV(ISC11) | _BV(ISC10);   /* по фронту */
  EIFR = _BV(INTF0) | _BV(INTF1);
  EIMSK = _BV(INT0) | _BV(INT1);
  interrupts();

  Serial.print(F("Спортивное зажигание 174MN-3, прошивка ")); Serial.println(F(FW_VERSION));
  if (!cfg.calibrated) Serial.println(F("Передний край зуба не измерен — искра по заднему краю. Команда cal, потом lead."));
  Serial.println(F("help — команды"));
}

static uint8_t mapStable, killStable, mapCnt, killCnt;

static void read_inputs(void) {                 /* раз в миллисекунду, 20 мс антидребезг */
  uint8_t m = digitalRead(PIN_MAP) == LOW, k = digitalRead(PIN_KILL) == LOW;
  if (m != mapStable) { if (++mapCnt >= 20) { mapStable = m; mapCnt = 0; S.activeMap = m; S.runPlan = PLAN_NONE; } } else mapCnt = 0;
  if (k != killStable) {
    if (++killCnt >= 20) {
      killStable = k; killCnt = 0;
      noInterrupts(); if (k) inh_set(INH_KILL); else inh_clr(INH_KILL); interrupts();
    }
  } else killCnt = 0;
}

static void check_hv(uint32_t ms) {
  uint16_t raw = (uint16_t)analogRead(A0);
  hvVolts = (uint16_t)((uint32_t)raw * 5UL * (HV_R_TOP_K + HV_R_BOT_K) / HV_R_BOT_K / 1023UL);
  if (hvVolts > hvPeak) hvPeak = hvVolts;
  if (hvVolts > HV_OVER_V && !fault) {
    fault = 1; faultCount++;
    faultUntil = ms + 2000;
    noInterrupts(); inh_set(INH_FAULT); interrupts();
    Serial.print(F("АВАРИЯ: ")); Serial.print(hvVolts); Serial.println(F(" В — преобразователь выключен. Проверь делитель обратной связи UC3843."));
  }
  if (fault && faultCount < 3 && (int32_t)(ms - faultUntil) >= 0) {
    fault = 0;
    noInterrupts(); inh_clr(INH_FAULT); interrupts();
  }
}

static void led(uint32_t ms, uint8_t st) {
  uint8_t on;
  if (fault) on = (ms / 50) & 1;                         /* очень часто — авария HV */
  else if (hvLowWarn) on = (ms / 250) & 1;               /* 2 раза в секунду — нет заряда */
  else if (st == ST_RUN) on = S.lim.active ? (ms % 200) >= 50 : 1;   /* отсечка — горит с провалами */
  else if (st == ST_CRANK) on = (ms / 100) & 1;
  else on = (ms % 1000) < 60;                             /* короткая вспышка раз в секунду — ждём пикап */
  digitalWrite(PIN_LED, on);
}

void loop() {
  static uint32_t lastMs, lastWin, lastLive;
  uint32_t ms = millis();

  noInterrupts();
  core_poll(now32());
  uint8_t st = S.state;
  interrupts();

  if (testRpm) {
    if (st != ST_STOP || ms - testStart > 10000UL) {
      testRpm = 0; noInterrupts(); inh_set(INH_STOP); interrupts();
      Serial.println(F("test окончен"));
    } else if ((int32_t)(micros() - testNext) >= 0) {
      testNext += 60000000UL / testRpm;
      noInterrupts();
      if (!(S.inhibit & (INH_KILL | INH_FAULT)) && !S.sparkBusy) { S.sparkBusy = 1; inh_set(INH_SPARK); hw_fire_now(); }
      interrupts();
    }
  }

  if (ms != lastMs) {
    lastMs = ms;
    read_inputs();
    check_hv(ms);
    led(ms, st);
  }
  if (ms - lastWin >= 200) {                    /* пик напряжения за 200 мс — заряд перед искрой */
    lastWin = ms;
    hvShow = hvPeak; hvPeak = 0;
    hvLowWarn = (st == ST_RUN && !fault && hvShow < HV_LOW_V);
  }
  if (liveOn && ms - lastLive >= 300) { lastLive = ms; print_live(); }
  read_serial();
}
