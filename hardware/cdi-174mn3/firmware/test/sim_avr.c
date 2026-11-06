/*
 * Прогон настоящей прошивки (build/sport_cdi.elf) на эмуляторе ATmega328P (simavr):
 * на D2/D3 подаются импульсы пикапа «виртуального мотора», с D9 (тиристор) и D7 (запрет заряда)
 * снимаются фронты. Проверяется то, чего не видит test_logic: таймер, аппаратное совпадение,
 * длительность импульса, пауза заряда, команды по USB.
 *
 *   sudo apt-get install simavr libsimavr-dev
 *   make -C hardware/cdi-174mn3/firmware sim
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <simavr/sim_avr.h>
#include <simavr/sim_elf.h>
#include <simavr/avr_ioport.h>
#include <simavr/avr_adc.h>
#include <simavr/avr_uart.h>
#include <simavr/avr_timer.h>

#define F_HZ 16000000.0
static avr_t *avr;
static avr_irq_t *pinA, *pinB, *uartIn, *adc0;

static double us(void) { return (double)avr->cycle / (F_HZ / 1e6); }

/* ---- выходы ---- */
static int chg_inhibit = 1;          /* D7: 1 — преобразователь выключен */
static double chg_low_at = -1;       /* когда D7 последний раз ушёл в 0 */
static int gate = 0;
static double gate_up;
#define MAXS 5000
static double spark_us[MAXS], pulse_us[MAXS], rel_us[MAXS];
static int ns, bad_charger;

static void on_gate(avr_irq_t *irq, uint32_t v, void *p) {
  (void)irq; (void)p;
  if (v && !gate) {
    gate_up = us();
    if (!chg_inhibit) bad_charger++;
    if (ns < MAXS) { spark_us[ns] = gate_up; pulse_us[ns] = -1; rel_us[ns] = -1; ns++; }
  } else if (!v && gate && ns) pulse_us[ns - 1] = us() - gate_up;
  gate = v ? 1 : 0;
}
static void on_chg(avr_irq_t *irq, uint32_t v, void *p) {
  (void)irq; (void)p;
  if (!v && chg_inhibit) { chg_low_at = us(); if (ns && rel_us[ns - 1] < 0) rel_us[ns - 1] = chg_low_at - spark_us[ns - 1]; }
  chg_inhibit = v ? 1 : 0;
}

static char out[8192]; static int outn;
static void on_uart(avr_irq_t *irq, uint32_t v, void *p) {
  (void)irq; (void)p;
  if (outn < (int)sizeof(out) - 1) out[outn++] = (char)v;
}

static void run_to(double t_us) {
  avr_cycle_count_t target = (avr_cycle_count_t)(t_us * (F_HZ / 1e6));
  while (avr->cycle < target) {
    int st = avr_run(avr);
    if (st == cpu_Done || st == cpu_Crashed) { printf("эмулятор остановился: %d\n", st); exit(2); }
  }
}

/* ---- мотор ---- */
static const double LEAD = 34.0, TRAIL = 10.0;
static double tdc;                    /* мкс */
#define MAXR 5000
static double r_tdc[MAXR], r_per[MAXR];
static int nr;

static void pulse(avr_irq_t *pin, double at, double width) {
  run_to(at); avr_raise_irq(pin, 1);
  run_to(at + width); avr_raise_irq(pin, 0);
}

static void rev(double rpm) {
  double P = 60e6 / rpm;
  double t = tdc + P;
  double w = P * 3.0 / 360.0; if (w < 40) w = 40;       /* импульс компаратора ~3° */
  pulse(pinA, t - LEAD / 360.0 * P, w);
  pulse(pinB, t - TRAIL / 360.0 * P, w);
  if (nr < MAXR) { r_tdc[nr] = t; r_per[nr] = P; nr++; }
  tdc = t;
}

static double cur_rpm = 3000;

/* команда по USB — мотор в это время продолжает крутиться */
static void send(const char *s) {
  for (; *s; s++) { avr_raise_irq(uartIn, (uint8_t)*s); rev(cur_rpm); }
  double until = us() + 30000;
  while (us() < until) rev(cur_rpm);
}

/* тумблер на массу (closed) или разомкнут — через «внешнее» состояние входа:
 * иначе simavr при каждой записи в PORTD возвращает входу с подтяжкой единицу */
static uint8_t ext_val = 0x30;
static void set_switch(int bit, int closed) {
  if (closed) ext_val &= (uint8_t)~(1 << bit); else ext_val |= (uint8_t)(1 << bit);
  avr_ioport_external_t e = { .name = 'D', .mask = 0x30, .value = ext_val };
  avr_ioctl(avr, AVR_IOCTL_IOPORT_SET_EXTERNAL('D'), &e);
  avr_raise_irq(avr_io_getirq(avr, AVR_IOCTL_IOPORT_GETIRQ('D'), bit), closed ? 0 : 1);
}
/* команда, когда мотор стоит */
static void send_still(const char *s, double wait_ms) {
  for (; *s; s++) { avr_raise_irq(uartIn, (uint8_t)*s); run_to(us() + 100); }
  run_to(us() + wait_ms * 1000);
}
static void turn_for(double ms) { double until = us() + ms * 1000; while (us() < until) rev(cur_rpm); }

static double angle_of(int i) {
  for (int k = 0; k < nr; k++) if (r_tdc[k] >= spark_us[i]) return (r_tdc[k] - spark_us[i]) / r_per[k] * 360.0;
  return -999;
}

static int fails;
/* want — ожидаемый угол; tol — допуск. Искра по заднему краю (пуск, без калибровки) идёт из прерывания
 * с задержкой ≈ 42 мкс — на пуске это 0.1–0.2°, на 3000 об/мин ≈ 0.8° (позже — в безопасную сторону).
 * Импульс на тиристор — от 100 мкс: если в этот момент ещё работает прерывание пикапа (считает план
 * на следующий оборот), конец импульса сдвигается до ≈ 220 мкс; тиристору это безразлично. */
static void segment_t(const char *name, double rpm, int n, double want, int expect_sparks, double tol) {
  /* обороты меняются плавно, как у настоящего мотора (≈ 3% за оборот) */
  while (fabs(cur_rpm - rpm) > 1) {
    cur_rpm = rpm > cur_rpm ? fmin(rpm, cur_rpm * 1.03) : fmax(rpm, cur_rpm / 1.03);
    rev(cur_rpm);
  }
  for (int i = 0; i < 5; i++) rev(rpm);
  int s0 = ns;
  for (int i = 0; i < n; i++) rev(rpm);
  run_to(tdc + 2000);
  double sum = 0, mn = 1e9, mx = -1e9, pw = 0, rl = 0; int c = 0;
  for (int i = s0; i < ns; i++) {
    double a = angle_of(i); sum += a; c++;
    if (a < mn) mn = a;
    if (a > mx) mx = a;
    pw += pulse_us[i]; rl += rel_us[i];
  }
  if (getenv("DBG") && strstr(name, getenv("DBG"))) for (int i = s0; i < ns && i < s0 + 12; i++) {
    int k = 0; while (k < nr && r_tdc[k] < spark_us[i]) k++;
    printf("    искра %.1f мкс: угол %.2f, импульс %.1f, заряд %.1f, до ВМТ %.1f мкс\n", spark_us[i], angle_of(i), pulse_us[i], rel_us[i], k < nr ? r_tdc[k] - spark_us[i] : -1);
  }
  printf("%-28s %6.0f об/мин: искр %3d/%d", name, rpm, c, n);
  if (c) printf(", угол %.2f° (%.2f…%.2f), импульс %.0f мкс, заряд через %.0f мкс", sum / c, mn, mx, pw / c, rl / c);
  printf("\n");
  if (expect_sparks && c < n - 1) { printf("  ОШИБКА: мало искр\n"); fails++; }
  if (!expect_sparks && c > 0) { printf("  ОШИБКА: искры на отсечке\n"); fails++; }
  if (c && want >= 0 && fabs(sum / c - want) > tol) { printf("  ОШИБКА: угол, ждали %.2f°\n", want); fails++; }
  if (c && want >= 0 && (mx - mn) > 1.0) { printf("  ОШИБКА: разброс угла\n"); fails++; }
  if (c && (pw / c < 80 || pw / c > 300)) { printf("  ОШИБКА: длительность импульса\n"); fails++; }
}
static void segment(const char *name, double rpm, int n, double want, int expect_sparks) {
  segment_t(name, rpm, n, want, expect_sparks, 0.4);
}

int main(int argc, char **argv) {
  const char *elf = argc > 1 ? argv[1] : "build/sport_cdi.elf";
  elf_firmware_t f; memset(&f, 0, sizeof f);
  if (elf_read_firmware(elf, &f)) { printf("нет %s\n", elf); return 2; }
  avr = avr_make_mcu_by_name("atmega328p");
  avr_init(avr);
  avr_load_firmware(avr, &f);
  avr->frequency = (uint32_t)F_HZ;
  avr->avcc = avr->vcc = avr->aref = 5000;
  avr->log = 0;

  pinA = avr_io_getirq(avr, AVR_IOCTL_IOPORT_GETIRQ('D'), 2);
  pinB = avr_io_getirq(avr, AVR_IOCTL_IOPORT_GETIRQ('D'), 3);
  /* Импульс на тиристор снимаем с выхода сравнения таймера 1 (OC1A), а не с порта: simavr при записи в PORTB
   * (светодиод на D13 — тот же порт) переписывает и PB1, хотя у настоящего ATmega328P при COM1A ≠ 0
   * вывод принадлежит таймеру и PORTB на него не влияет. */
  avr_irq_register_notify(avr_io_getirq(avr, AVR_IOCTL_TIMER_GETIRQ('1'), TIMER_IRQ_OUT_COMP + 0), on_gate, NULL);
  avr_irq_register_notify(avr_io_getirq(avr, AVR_IOCTL_IOPORT_GETIRQ('D'), 7), on_chg, NULL);
  uint32_t fl = 0;
  avr_ioctl(avr, AVR_IOCTL_UART_GET_FLAGS('0'), &fl);
  fl &= ~AVR_UART_FLAG_STDIO;
  avr_ioctl(avr, AVR_IOCTL_UART_SET_FLAGS('0'), &fl);
  uartIn = avr_io_getirq(avr, AVR_IOCTL_UART_GETIRQ('0'), UART_IRQ_INPUT);
  avr_irq_register_notify(avr_io_getirq(avr, AVR_IOCTL_UART_GETIRQ('0'), UART_IRQ_OUTPUT), on_uart, NULL);
  adc0 = avr_io_getirq(avr, AVR_IOCTL_ADC_GETIRQ, ADC_IRQ_ADC0);
  avr_raise_irq(adc0, 3560);                  /* ≈ 300 В на конденсаторе */
  avr_raise_irq(pinA, 0); avr_raise_irq(pinB, 0);
  set_switch(4, 0); set_switch(5, 0);         /* карта 1, глушение разомкнуто */

  run_to(300000);
  printf("После включения: преобразователь %s\n", chg_inhibit ? "выключен (так и надо)" : "ВКЛЮЧЁН");
  if (!chg_inhibit) fails++;

  tdc = us() + 1000; cur_rpm = 3000;
  segment_t("без калибровки", 3000, 30, TRAIL, 1, 1.0);
  send("lat 4\n");                            /* у эмулятора нет фильтра на входе — только вход в прерывание */
  send("lead 34\n");
  segment_t("пуск (задний край)", 350, 10, TRAIL, 1, 0.3);
  segment("карта 1", 2000, 30, 15.0, 1);
  segment("карта 1", 4000, 30, 28.0, 1);
  segment("карта 1", 7000, 30, 32.0, 1);
  segment("карта 1", 9500, 30, 30.5, 1);
  segment("выше отсечки 10000", 10500, 30, -1, 0);
  segment("после отсечки", 6000, 30, 32.0, 1);
  send("cal\n");
  segment("cal (передний край)", 3000, 30, LEAD - 104.0 * 3000 * 6e-6, 1);   /* искра через 100 мкс + lat 4 */
  {
    /* «прочитать стробоскопом» и записать, не глуша мотор */
    double sum = 0; int c = 0;
    for (int i = ns - 20; i < ns; i++) { sum += angle_of(i); c++; }
    char cmd[32]; snprintf(cmd, sizeof cmd, "lead %.1f\n", sum / c);
    send(cmd);
    printf("  записано через стробоскоп: %s", cmd);
  }
  segment("после cal → lead", 7000, 30, 32.0, 1);
  send("fix 12\n");
  segment("fix 12", 5000, 30, 12.0, 1);
  send("run\n");
  /* карта 2 — переключатель на массу */
  set_switch(4, 1); turn_for(50);
  segment("карта 2", 4000, 30, 24.0, 1);
  set_switch(4, 0); turn_for(50);
  /* глушение */
  set_switch(5, 1); turn_for(50);
  segment("глушение", 3000, 20, -1, 0);
  set_switch(5, 0); turn_for(50);
  segment("после глушения", 3000, 20, 22.0, 1);
  /* остановка */
  run_to(us() + 800000);
  printf("Мотор стоит 0.8 с: преобразователь %s\n", chg_inhibit ? "выключен (так и надо)" : "ВКЛЮЧЁН");
  if (!chg_inhibit) fails++;
  /* стендовая проверка без пикапа */
  {
    int s0 = ns;
    send_still("test 3000\n", 1000);
    int n = ns - s0;
    printf("test 3000 на стоящем моторе: за 1 с искр %d (ждём ≈ 50)\n", n);
    if (n < 45 || n > 55) { printf("  ОШИБКА: test\n"); fails++; }
    send_still("stop\n", 50);
    s0 = ns; run_to(us() + 200000);
    if (ns != s0 || !chg_inhibit) { printf("  ОШИБКА: после stop искры или заряд\n"); fails++; }
    else printf("  после stop: искр нет, преобразователь выключен\n");
  }
  /* аварийное напряжение */
  int s0 = ns;
  avr_raise_irq(adc0, 4600);                  /* ≈ 390 В */
  tdc = us() + 1000; cur_rpm = 3000;
  segment("HV 390 В (авария)", 3000, 10, -1, 0);
  avr_raise_irq(adc0, 3560);
  (void)s0;
  send_still("show\n", 400);

  printf("Искр при включённом преобразователе: %d\n", bad_charger);
  if (bad_charger) fails++;
  out[outn] = 0;
  printf("\n--- вывод прошивки по USB ---\n%s\n", out);
  printf("ошибок: %d\n", fails);
  return fails ? 1 : 0;
}
