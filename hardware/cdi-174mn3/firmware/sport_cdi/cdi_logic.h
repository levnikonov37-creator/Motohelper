/*
 * cdi_logic.h — арифметика зажигания: обороты, таблица угла, задержка, отсечка.
 * Без привязки к железу: этот же файл собирается на компьютере в тестах (firmware/test).
 *
 * Единицы:
 *   время  — такты таймера, 1 такт = 4 мкс (Timer1, делитель 64 при 16 МГц);
 *   угол   — десятые доли градуса до ВМТ (335 = 33.5°);
 *   период — время одного оборота коленвала (пикап даёт один зуб на оборот).
 */
#ifndef CDI_LOGIC_H
#define CDI_LOGIC_H

#include <stdint.h>

#define TICK_US          4UL
#define TICKS_PER_MIN    (60UL * 1000000UL / TICK_US)   /* 15 000 000 */

/* Точки таблицы угла, об/мин. Между точками — линейно, за краями — крайнее значение. */
#define N_PTS 15
static const uint16_t RPM_PTS[N_PTS] = {
  1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000, 11000
};

static inline uint16_t rpm_from_period(uint32_t period) {
  if (period == 0) return 0;
  uint32_t r = TICKS_PER_MIN / period;
  return r > 65535UL ? 65535U : (uint16_t)r;
}

static inline uint32_t period_from_rpm(uint16_t rpm) {
  return rpm ? TICKS_PER_MIN / rpm : 0;
}

/* Угол по таблице (десятые градуса). */
static inline int16_t adv_lookup(const int16_t *tab, uint16_t rpm) {
  if (rpm <= RPM_PTS[0]) return tab[0];
  for (uint8_t i = 1; i < N_PTS; i++) {
    if (rpm <= RPM_PTS[i]) {
      int32_t r0 = RPM_PTS[i - 1], r1 = RPM_PTS[i];
      int32_t a0 = tab[i - 1], a1 = tab[i];
      return (int16_t)(a0 + (a1 - a0) * ((int32_t)rpm - r0) / (r1 - r0));
    }
  }
  return tab[N_PTS - 1];
}

/* Доля оборота в формате Q16 (65536 = полный оборот) для угла в десятых градуса.
 * 65536 / 3600 = 18.2044 ≈ 37283 / 2048 — без деления, это считается в прерывании. */
static inline uint16_t q16_from_deci(int16_t deci) {
  if (deci <= 0) return 0;
  if (deci > 1800) deci = 1800;
  return (uint16_t)(((uint32_t)deci * 37283UL) >> 11);
}

/* period * q / 65536 без 64-битной арифметики (на AVR она медленная). */
static inline uint32_t mul_q16(uint32_t period, uint16_t q) {
  uint16_t hi = (uint16_t)(period >> 16), lo = (uint16_t)period;
  return (uint32_t)hi * q + (((uint32_t)lo * q) >> 16);
}

/* Отсечка. Жёсткая: выше порога — ни одной искры. Мягкая: от порога до порога+200
 * пропускает каждую вторую искру, выше — все. Возврат на 60 об/мин ниже порога. */
typedef struct { uint8_t active; uint8_t cnt; } Limiter;

static inline uint8_t limiter_fire(Limiter *L, uint16_t rpm, uint16_t limit, uint8_t soft) {
  if (!L->active) { if (rpm >= limit) L->active = 1; }
  else if ((uint32_t)rpm + 60U < limit) { L->active = 0; L->cnt = 0; }
  if (!L->active) return 1;
  if (!soft || (uint32_t)rpm >= (uint32_t)limit + 200U) return 0;
  L->cnt++;
  return (uint8_t)(L->cnt & 1U);
}

/* Разбор числа с одной цифрой после запятой: "33.5", "33,5", "-2", "8" → десятые.
 * Возвращает 1, если число разобрано. */
static inline uint8_t parse_dec10(const char *s, int32_t *out) {
  int32_t v = 0; uint8_t neg = 0, digits = 0, frac = 0, seenDot = 0;
  if (!s) return 0;
  if (*s == '-') { neg = 1; s++; } else if (*s == '+') s++;
  for (; *s; s++) {
    if (*s >= '0' && *s <= '9') {
      if (seenDot) { if (frac < 1) { v = v * 10 + (*s - '0'); frac++; } }
      else { v = v * 10 + (*s - '0'); if (v > 10000000L) return 0; }
      digits++;
    } else if ((*s == '.' || *s == ',') && !seenDot) seenDot = 1;
    else return 0;
  }
  if (!digits) return 0;
  if (frac == 0) v *= 10;
  *out = neg ? -v : v;
  return 1;
}

/* Простая контрольная сумма настроек в EEPROM. */
static inline uint8_t sum8(const uint8_t *p, uint16_t n) {
  uint8_t s = 0x5A;
  while (n--) s = (uint8_t)((s << 1) | (s >> 7)) ^ *p++;
  return s;
}

#endif
