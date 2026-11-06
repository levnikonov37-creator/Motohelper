#!/usr/bin/env python3
"""
Рисует схему спортивного DC-CDI для Zongshen 174MN-3 (CBS300) в SVG.
Запуск: pip install schemdraw==0.23 && python3 hardware/cdi-174mn3/schematic/draw.py

Листы:
  0-blocks.svg     — из чего состоит блок
  1-power.svg      — защита по питанию и +5 В
  2-hv.svg         — преобразователь 12 → 300 В (UC3843 + трансформатор)
  3-discharge.svg  — конденсатор, тиристор, катушка, контроль 300 В
  4-pickup.svg     — вход пикапа: смещение, защита, два компаратора
  5-mcu.svg        — Arduino Nano: что к какому выводу
Обозначения и номиналы — те же, что в README и в перечне деталей.
Пояснения к листам — в README (раздел «Схема»).
"""
import os
import schemdraw
import schemdraw.elements as elm
import schemdraw.flow as flow

HERE = os.path.dirname(os.path.abspath(__file__))
schemdraw.config(fontsize=11, font='DejaVu Sans, Arial, sans-serif', lw=1.3, unit=2.4, margin=1.0)
HVC = '#c0392b'              # цвет цепей 300 В


def out(name):
    return os.path.join(HERE, name)


def P(x, y):
    return (float(x), float(y))


def part(E, a, b, lbl=None, side=None, color=None, **kw):
    """Элемент между точками a и b. side: 'l'/'r' для вертикальных, 'u'/'d' для горизонтальных."""
    e = E(**kw).endpoints(a, b)
    if color:
        e.color(color)
    if lbl:
        vertical = abs(a[0] - b[0]) < 1e-9
        if vertical:
            loc = 'top' if side == 'l' else 'bottom'
        else:
            loc = 'bottom' if side == 'd' else 'top'
        e.label(lbl, loc, fontsize=10)
    return e


def R(a, b, lbl=None, side=None, **kw):
    return part(elm.ResistorIEC, a, b, lbl, side, **kw)


def C(a, b, lbl=None, side=None, **kw):
    return part(elm.Capacitor, a, b, lbl, side, **kw)


def wire(*pts, color=None):
    for p, q in zip(pts, pts[1:]):
        ln = elm.Line().endpoints(p, q)
        if color:
            ln.color(color)


def dot(p, color=None, open_=False):
    d = elm.Dot(open=open_).at(p)
    if color:
        d.color(color)
    return d


def gnd(p):
    elm.Ground().right().at(p)


def vcc(p, text='+5 В'):
    elm.Vdd().right().at(p).label(text, fontsize=10)


def net(p, text, to='right', color=None):
    """Метка цепи (уходит на другой лист)."""
    t = elm.Tag(width=max(1.2, 0.4 + 0.2 * len(text))).at(p)
    t = getattr(t, to)()
    t.label(text, fontsize=9)
    if color:
        t.color(color)
    return t


def text(p, s, size=10, halign='left', color=None):
    lb = elm.Label().at(p).label(s, fontsize=size, halign=halign)
    if color:
        lb.color(color)


def title(s, p):
    text(p, s, size=14)


# ---------------------------------------------------------------- 0. блоки
with schemdraw.Drawing(file=out('0-blocks.svg'), show=False) as d:
    W, H = 4.2, 1.6

    def box(x, y, s, color=None):
        b = flow.Box(w=W, h=H).at((x, y)).anchor('center').label(s, fontsize=10)
        if color:
            b.color(color)
        return b

    bat = box(0, 0, 'Аккумулятор 12 В\nчерез замок\nи кнопку стоп')
    pwr = box(6, 0, 'Защита, фильтр,\n+5 В\n(лист 1)')
    hv = box(12, 0, 'Преобразователь\n12 → 300 В\n(лист 2)', HVC)
    dis = box(18, 0, 'Конденсатор 1 мкФ\n+ тиристор\n(лист 3)', HVC)
    coil = box(24, 0, 'Катушка\nзажигания\n→ свеча')
    pu = box(0, -5, 'Пикап\nна генераторе\n(зуб маховика)')
    cmp_ = box(6, -5, 'Два компаратора\nLM2903\n(лист 4)')
    mcu = box(12, -5, 'Arduino Nano\nугол, отсечка\n(лист 5)')
    sw = box(6, -9.5, 'Тумблер карт:\n1 — спорт, 2 — мягкая')
    kill = box(18, -9.5, 'Провод глушения\n(необязательно)')
    usb = box(24, -5, 'Ноутбук по USB:\nнастройка,\nстробоскоп')
    for a, b in ((bat, pwr), (pwr, hv), (hv, dis), (dis, coil), (pu, cmp_), (cmp_, mcu)):
        flow.Arrow().at(a.E).to(b.W)
    flow.Arrow().at(mcu.N).to(hv.S)
    text((12.2, -2.45), 'D7: стоп заряда\nна время искры', 9)
    flow.Wire('-|', arrow='->').at((mcu.E[0], mcu.E[1] + 0.6)).to((dis.S[0] - 0.6, dis.S[1]))
    text((15.4, -2.45), 'D9: искра', 9)
    flow.Wire('|-', arrow='->').at((dis.S[0] + 0.6, dis.S[1])).to((mcu.E[0], mcu.E[1] + 0.1)).color(HVC)
    text((18.8, -2.45), 'A0: контроль 300 В', 9, color=HVC)
    flow.Wire('-|', arrow='->').at(sw.E).to((mcu.S[0] - 1.0, mcu.S[1]))
    text((10.8, -8.0), 'D4', 9, halign='right')
    flow.Wire('-|', arrow='->').at(kill.W).to((mcu.S[0] + 1.0, mcu.S[1]))
    text((13.2, -8.0), 'D5', 9)
    flow.Arrow().at(pwr.S).to(cmp_.N)
    text((6.2, -2.45), '+5 В', 9)
    flow.Wire('-', arrow='<->').at((mcu.E[0], mcu.E[1] - 0.5)).to((usb.W[0], mcu.E[1] - 0.5))
    text((19.4, -5.2), 'USB', 9)

# ---------------------------------------------------------------- 1. питание
with schemdraw.Drawing(file=out('1-power.svg'), show=False) as d:
    title('Лист 1. Защита по питанию, +5 В', P(0, 4.2))
    y = 0
    dot(P(0, y), open_=True).label('X1:1  +12 В\nот замка', 'left', fontsize=10)
    part(elm.Fuse, P(0.3, y), P(2.6, y), 'F1  3 А')
    part(elm.Schottky, P(2.6, y), P(4.8, y), 'VD1  SR540')
    dot(P(5.4, y)); wire(P(4.8, y), P(5.4, y))
    wire(P(5.4, y), P(5.4, 2.0)); vcc(P(5.4, 2.0), '+12F (листы 2, 3)')
    for x in (6.8, 9.4, 12.0):
        dot(P(x, y))
    wire(P(5.4, y), P(13.8, y))
    part(elm.DiodeTVS, P(6.8, -2.0), P(6.8, y), 'VD2\n1.5KE24A', 'r'); gnd(P(6.8, -2.0))
    C(P(9.4, y), P(9.4, -2.0), 'C1\n1000 мкФ\n25 В', 'r', polar=True); gnd(P(9.4, -2.0))
    C(P(12.0, y), P(12.0, -2.0), 'C2\n100 нФ', 'r'); gnd(P(12.0, -2.0))
    reg = elm.Ic(pins=[elm.IcPin(name='IN', side='left', pin='1'),
                       elm.IcPin(name='OUT', side='right', pin='3'),
                       elm.IcPin(name='GND', side='bottom', pin='2')],
                 size=(2.4, 1.6)).right().anchor('IN').at(P(13.8, y)).label('DA1  L7805CV', 'top', ofst=0.1, fontsize=10)
    wire(reg.GND, P(reg.GND[0], -2.0)); gnd(P(reg.GND[0], -2.0))
    xo = reg.OUT[0]
    for x in (xo + 1.4, xo + 4.0):
        dot(P(x, y))
    wire(reg.OUT, P(xo + 5.8, y))
    C(P(xo + 1.4, y), P(xo + 1.4, -2.0), 'C4\n100 мкФ\n16 В', 'r', polar=True); gnd(P(xo + 1.4, -2.0))
    C(P(xo + 4.0, y), P(xo + 4.0, -2.0), 'C5\n100 нФ', 'r'); gnd(P(xo + 4.0, -2.0))
    wire(P(xo + 5.8, y), P(xo + 5.8, 2.0)); vcc(P(xo + 5.8, 2.0), '+5 В')
    dot(P(0, -4.0), open_=True).label('X1:2  масса\n(рама)', 'left', fontsize=10)
    wire(P(0.3, -4.0), P(1.6, -4.0)); gnd(P(1.6, -4.0))

# ---------------------------------------------------------------- 2. преобразователь
with schemdraw.Drawing(file=out('2-hv.svg'), show=False) as d:
    ic = elm.Ic(pins=[elm.IcPin(name='RT/CT', pin='4', side='left', anchorname='RT'),
                      elm.IcPin(name='ISENSE', pin='3', side='left', anchorname='IS'),
                      elm.IcPin(name='VFB', pin='2', side='left', anchorname='FB'),
                      elm.IcPin(name='COMP', pin='1', side='left', anchorname='COMP'),
                      elm.IcPin(name='VREF', pin='8', side='right', anchorname='VREF'),
                      elm.IcPin(name='GND', pin='5', side='right', anchorname='GND'),
                      elm.IcPin(name='OUT', pin='6', side='right', anchorname='OUT'),
                      elm.IcPin(name='VCC', pin='7', side='right', anchorname='VCC')],
                 size=(3.6, 8.0), pinspacing=2.0, leadlen=0.6).right().at((0, 0))
    A = lambda n: P(*getattr(ic, n))
    xl, xr = A('COMP')[0], A('VCC')[0]
    yC, yF, yI, yT = A('COMP')[1], A('FB')[1], A('IS')[1], A('RT')[1]
    yV, yO, yG, yR = A('VCC')[1], A('OUT')[1], A('GND')[1], A('VREF')[1]
    text(P((xl + xr) / 2, yT - 1.55), 'DA2  UC3843', 11, halign='center')
    title('Лист 2. Преобразователь 12 → 300 В (обратноходовый, UC3843)', P(xl - 9, yV + 6.2))

    # OUT → R3 → затвор VT1 (затвор слева, сток вверх)
    R(P(xr + 0.6, yO), P(xr + 2.8, yO), 'R3  10 Ом')
    wire(A('OUT'), P(xr + 0.6, yO))
    G = P(xr + 4.2, yO)
    wire(P(xr + 2.8, yO), G); dot(G)
    q = elm.NFet(bulk=False).right().reverse().anchor('gate').at(P(G[0] + 1.0, yO))
    text(P(q.drain[0] + 0.5, yO + 0.1), 'VT1\nIRF640N', 10)
    wire(G, q.gate)
    R(G, P(G[0], yO - 2.6), 'R4\n10 кОм', 'l'); gnd(P(G[0], yO - 2.6))
    # исток: R5, R6 → CS
    S = P(q.source[0], q.source[1] - 0.6)
    wire(q.source, S); dot(S)
    R(S, P(S[0], S[1] - 2.2), 'R5  0.22 Ом\n2 Вт', 'r'); gnd(P(S[0], S[1] - 2.2))
    cs = P(S[0] + 4.0, S[1])
    R(P(S[0] + 1.2, S[1]), P(S[0] + 3.2, S[1]), 'R6  1 кОм')
    wire(S, P(S[0] + 1.2, S[1])); wire(P(S[0] + 3.2, S[1]), cs); dot(cs)
    C(cs, P(cs[0], cs[1] - 1.6), 'C10\n470 пФ', 'r'); gnd(P(cs[0], cs[1] - 1.6))
    wire(cs, P(cs[0] + 0.8, cs[1])); net(P(cs[0] + 0.8, cs[1]), 'CS', 'right')

    # трансформатор над VT1
    tx = elm.Transformer(t1=4, t2=8, core=True).right().anchor('p2').at(P(q.drain[0], q.drain[1] + 2.0))
    wire(q.drain, tx.p2)
    Dn = P(q.drain[0], q.drain[1] + 1.0); dot(Dn)
    T = P(tx.p1[0], tx.p1[1] + 1.0)
    wire(tx.p1, T); dot(T)
    wire(T, P(T[0], T[1] + 0.8)); vcc(P(T[0], T[1] + 0.8), '+12F')
    text(P(tx.p1[0] - 0.12, tx.p1[1] - 0.25), '●н', 9, halign='right')
    text(P(tx.s2[0] + 0.15, tx.s2[1] + 0.3), '●н', 9)
    text(P(tx.p1[0] - 0.3, (tx.p1[1] + tx.p2[1]) / 2 - 0.2), 'I', 10, halign='right')
    text(P(tx.s1[0] + 0.45, (tx.s1[1] + tx.s2[1]) / 2), 'II', 10)
    text(P((tx.p1[0] + tx.s1[0]) / 2, tx.s1[1] + 0.3), 'T1', 11, halign='center')
    # снаббер VD3 + (R7 || C11) между стоком и +12F
    xs = Dn[0] - 3.0
    ns = P(xs, Dn[1] + 1.8)
    wire(Dn, P(xs, Dn[1]))
    part(elm.Diode, P(xs, Dn[1]), ns, 'VD3\nUF4007', 'l')
    dot(ns)
    R(ns, P(xs, T[1]), 'R7\n10 кОм\n2 Вт', 'l')
    wire(ns, P(xs + 1.2, ns[1]))
    C(P(xs + 1.2, ns[1]), P(xs + 1.2, T[1]), None)
    text(P(xs + 1.45, (ns[1] + T[1]) / 2), 'C11\n10 нФ\n630 В', 9)
    dot(P(xs, T[1]))
    wire(P(xs, T[1]), P(xs + 1.2, T[1]), T)

    # питание UC3843: VCC ← R1 ← шина +12F; C6, C7
    V = P(xr + 0.8, T[1])
    wire(A('VCC'), P(xr + 0.8, yV), V)
    dot(V)
    R(V, P(xr + 3.0, T[1]), 'R1  10 Ом')
    wire(P(xr + 3.0, T[1]), P(xs, T[1]))
    c7, c6 = P(V[0] - 1.4, V[1]), P(V[0] - 3.0, V[1])
    wire(V, c7, c6); dot(c7)
    C(c7, P(c7[0], c7[1] - 1.5), 'C7\n100 нФ', 'r'); gnd(P(c7[0], c7[1] - 1.5))
    C(c6, P(c6[0], c6[1] - 1.5), 'C6\n47 мкФ', 'l', polar=True); gnd(P(c6[0], c6[1] - 1.5))

    # вторичка: начало (●н, снизу) — на массу, конец — VD4 → ВН
    wire(tx.s2, P(tx.s2[0], tx.s2[1] - 0.6)); gnd(P(tx.s2[0], tx.s2[1] - 0.6))
    s1t = P(tx.s1[0], tx.s1[1] + 0.6)
    wire(tx.s1, s1t, color=HVC)
    H = P(s1t[0] + 7.4, s1t[1])
    part(elm.Diode, P(s1t[0] + 0.8, s1t[1]), P(s1t[0] + 3.0, s1t[1]), 'VD4  UF4007', color=HVC)
    wire(s1t, P(s1t[0] + 0.8, s1t[1]), color=HVC)
    wire(P(s1t[0] + 3.0, s1t[1]), H, color=HVC); dot(H, HVC)
    wire(H, P(H[0] + 1.0, H[1]), color=HVC); net(P(H[0] + 1.0, H[1]), 'ВН ≈300 В', 'right', HVC)
    # делитель обратной связи
    y = H[1]
    for name in ('R8', 'R9', 'R10'):
        R(P(H[0], y), P(H[0], y - 2.0), name + '\n1 МОм', 'r', color=HVC)
        y -= 2.0
    fb = P(H[0], y); dot(fb)
    R(fb, P(H[0], y - 1.8), 'R11\n22 кОм', 'r')
    part(elm.PotentiometerIEC, P(H[0], y - 1.8), P(H[0], y - 3.8), 'R12 10 кОм\n(ставит 300 В)', 'r')
    gnd(P(H[0], y - 3.8))
    wire(fb, P(fb[0] - 1.0, fb[1])); net(P(fb[0] - 1.0, fb[1]), 'FB', 'left')

    # GND, VREF, RT/CT
    wire(A('GND'), P(xr + 0.8, yG)); gnd(P(xr + 0.8, yG))
    vr = P(xr + 0.8, yR)
    wire(A('VREF'), vr); dot(vr)
    wire(vr, P(xr + 2.4, yR)); C(P(xr + 2.4, yR), P(xr + 2.4, yR - 1.6), 'C9\n100 нФ', 'r'); gnd(P(xr + 2.4, yR - 1.6))
    yb = yR - 2.6
    rtn = P(xl - 1.8, yT)
    wire(vr, P(xr + 0.8, yb))
    R(P((xl + xr) / 2 + 1.0, yb), P((xl + xr) / 2 - 1.0, yb), 'R2  10 кОм', 'd')
    wire(P(xr + 0.8, yb), P((xl + xr) / 2 + 1.0, yb))
    wire(P((xl + xr) / 2 - 1.0, yb), P(rtn[0], yb), rtn)
    wire(rtn, A('RT')); dot(rtn)
    c8 = P(xl - 3.4, yT)
    wire(rtn, c8)
    C(c8, P(c8[0], yT - 1.6), 'C8\n2.7 нФ', 'l'); gnd(P(c8[0], yT - 1.6))

    # ISENSE ← CS
    wire(A('IS'), P(xl - 1.0, yI)); net(P(xl - 1.0, yI), 'CS', 'left')
    # VFB ← FB, коррекция R13 + C12 к COMP
    fbj = P(xl - 4.6, yF)
    wire(A('FB'), fbj, P(xl - 5.2, yF)); dot(fbj); net(P(xl - 5.2, yF), 'FB', 'left')
    cn = P(xl - 1.0, yC)
    dot(cn)
    ym = yC - 1.0
    wire(cn, P(cn[0], ym))
    R(P(cn[0], ym), P(cn[0] - 1.8, ym), 'R13 47 кОм', 'd')
    C(P(cn[0] - 1.8, ym), P(fbj[0], ym), 'C12 10 нФ', 'd')
    wire(P(fbj[0], ym), fbj)
    # COMP ← VT2 (запрет)
    xq2 = xl - 9.4
    wire(A('COMP'), cn, P(xq2, yC))
    t2 = elm.BjtNpn().right().anchor('collector').at(P(xq2, yC - 0.8)).label('VT2\nBC547', 'right', fontsize=10, ofst=(0.0, -0.3))
    wire(P(xq2, yC), t2.collector)
    wire(t2.emitter, P(t2.emitter[0], t2.emitter[1] - 0.4)); gnd(P(t2.emitter[0], t2.emitter[1] - 0.4))
    bb = P(t2.base[0] - 0.6, t2.base[1])
    wire(t2.base, bb); dot(bb)
    bn = P(bb[0] - 2.4, bb[1])
    R(bb, bn, 'R14 4.7 кОм', 'd'); dot(bn)
    wire(bn, P(bn[0] - 0.8, bn[1])); net(P(bn[0] - 0.8, bn[1]), 'D7', 'left')
    R(bn, P(bn[0], bn[1] + 1.8), 'R15\n10 кОм', 'l'); vcc(P(bn[0], bn[1] + 1.8))
    R(bb, P(bb[0], bb[1] - 1.8), 'R16\n10 кОм', 'l'); gnd(P(bb[0], bb[1] - 1.8))


# ---------------------------------------------------------------- 3. разряд
with schemdraw.Drawing(file=out('3-discharge.svg'), show=False) as d:
    title('Лист 3. Накопительный конденсатор, тиристор, катушка, контроль 300 В', P(-4, 6.4))
    H = P(8, 2)
    net(P(8, 4.4), 'ВН (лист 2)', 'down', HVC)
    wire(P(8, 4.4 - 1.6), H, color=HVC); dot(H, HVC)
    # тиристор
    scr = elm.SCR().endpoints(H, P(8, -1.2)).color(HVC).label('VS1\nBT152-800R', 'bottom', fontsize=10)
    gnd(P(8, -1.2))
    # встречный диод и дальше по ВН
    wire(H, P(10.8, 2), P(14.4, 2), color=HVC)
    dot(P(10.8, 2), HVC)
    part(elm.Diode, P(10.8, -1.2), P(10.8, 2), 'VD5\nUF4007', 'r', color=HVC); gnd(P(10.8, -1.2))
    # контроль ВН
    dot(P(13.0, 2), HVC)
    y = 2.0
    for name in ('R22', 'R23', 'R24'):
        R(P(13.0, y), P(13.0, y - 1.8), name + '\n1 МОм', 'l', color=HVC)
        y -= 1.8
    mon = P(13.0, y); dot(mon)
    R(mon, P(13.0, y - 1.8), 'R25\n36 кОм', 'l'); gnd(P(13.0, y - 1.8))
    m2, m3 = P(14.6, y), P(16.2, y)
    wire(mon, m2, m3, P(17.2, y)); dot(m2); dot(m3)
    C(m2, P(14.6, y - 1.6), 'C15\n100 нФ', 'r'); gnd(P(14.6, y - 1.6))
    part(elm.Diode, m3, P(16.2, y + 1.6), 'VD6\n1N4148', 'r'); vcc(P(16.2, y + 1.6))
    net(P(17.2, y), 'A0', 'right')
    # C13 и катушка
    C(P(14.4, 2), P(17.0, 2), 'C13  1 мкФ 630 В', color=HVC)
    wire(P(17.0, 2), P(18.0, 2))
    dot(P(18.0, 2), open_=True).label('X1:3', 'top', fontsize=10)
    coil = elm.Transformer(t1=4, t2=10, core=True).right().anchor('p1').at(P(19.4, 2))
    wire(P(18.2, 2), coil.p1)
    wire(coil.p2, P(coil.p2[0], coil.p2[1] - 0.5)); gnd(P(coil.p2[0], coil.p2[1] - 0.5))
    wire(coil.s2, P(coil.s2[0], coil.s2[1] - 0.5)); gnd(P(coil.s2[0], coil.s2[1] - 0.5))
    wire(coil.s1, P(coil.s1[0] + 1.0, coil.s1[1]))
    text(P(coil.s1[0] + 1.1, coil.s1[1]), '→ свеча', 10)
    text(P((coil.p1[0] + coil.s1[0]) / 2, max(coil.p1[1], coil.s1[1]) + 0.6), 'катушка зажигания\n(на мотоцикле)', 10, halign='center')
    # управляющий электрод
    g = scr.gate
    gy = g[1]
    g2, g1 = P(g[0] - 0.8, gy), P(g[0] - 2.2, gy)
    wire(g, g2, g1); dot(g2); dot(g1)
    R(g2, P(g2[0], gy - 1.8), 'R17\n1 кОм', 'r'); gnd(P(g2[0], gy - 1.8))
    C(g1, P(g1[0], gy - 1.8), 'C14\n10 нФ', 'l'); gnd(P(g1[0], gy - 1.8))
    e3 = P(g1[0] - 2.4, gy)
    R(e3, g1, 'R18  47 Ом', 'd')
    q = elm.BjtNpn().right().anchor('emitter').at(P(e3[0], gy + 0.6)).label('VT3\nBC337', 'right', fontsize=10, ofst=(0.0, 0.3))
    wire(q.emitter, e3)
    R(q.collector, P(q.collector[0], q.collector[1] + 1.6), 'R19\n10 Ом', 'r'); vcc(P(q.collector[0], q.collector[1] + 1.6))
    bn = P(q.base[0] - 0.8, q.base[1])
    wire(q.base, bn); dot(bn)
    R(bn, P(bn[0] - 2.2, bn[1]), 'R20  470 Ом')
    wire(P(bn[0] - 2.2, bn[1]), P(bn[0] - 2.8, bn[1])); net(P(bn[0] - 2.8, bn[1]), 'D9', 'left')
    R(bn, P(bn[0], bn[1] - 1.8), 'R21\n10 кОм', 'l'); gnd(P(bn[0], bn[1] - 1.8))

# ---------------------------------------------------------------- 4. пикап
with schemdraw.Drawing(file=out('4-pickup.svg'), show=False) as d:
    title('Лист 4. Вход пикапа: смещение 2.5 В, защита, два компаратора', P(-2, 7.4))
    dot(P(0, 0), open_=True).label('X1:4\nпикап +', 'left', fontsize=10)
    R(P(0.3, 0), P(2.4, 0), 'R26 22 кОм')
    N = P(3.0, 0)
    wire(P(2.4, 0), N); dot(N); text(P(3.1, 0.25), 'N', 10)
    R(N, P(3.0, 2.2), 'R27\n22 кОм', 'l'); vcc(P(3.0, 2.2))
    c16, vd = P(4.2, 0), P(5.4, 0)
    wire(N, c16, vd, P(8.4, 0)); dot(c16); dot(vd)
    C(c16, P(4.2, -1.4), None); gnd(P(4.2, -1.4))
    text(P(3.95, -0.75), 'C16\n1 нФ', 9, halign='right')
    part(elm.Schottky, vd, P(5.4, 1.8), 'VD7.2', 'r'); vcc(P(5.4, 1.8))
    part(elm.Schottky, P(5.4, -1.6), vd, 'VD7.1\n(BAT54S)', 'r'); gnd(P(5.4, -1.6))
    dot(P(0, -3.0), open_=True).label('X1:5\nпикап −', 'left', fontsize=10)
    wire(P(0.3, -3.0), P(1.4, -3.0)); gnd(P(1.4, -3.0))
    dot(P(8.4, 0))
    # компаратор A: + = N, − = VH
    ca = elm.Opamp(leads=True).right().anchor('in2').at(P(10.0, 2.4)).label('DA3.1\nLM2903', 'top', ofst=(0, 0.2), fontsize=10)
    wire(P(8.4, 0), P(8.4, ca.in2[1]), ca.in2)
    vh = P(7.4, ca.in1[1])
    wire(vh, ca.in1); dot(vh)
    text(P(vh[0] + 0.2, vh[1] + 0.3), 'VH', 9)
    R(vh, P(vh[0], vh[1] + 1.8), 'R28\n10 кОм', 'l'); vcc(P(vh[0], vh[1] + 1.8))
    R(vh, P(vh[0], vh[1] - 1.8), 'R29\n12 кОм', 'l'); gnd(P(vh[0], vh[1] - 1.8))
    oa = P(ca.out[0] + 1.2, ca.out[1])
    wire(ca.out, oa, P(oa[0] + 1.4, oa[1])); dot(oa)
    net(P(oa[0] + 1.4, oa[1]), 'D2', 'right')
    R(oa, P(oa[0], oa[1] + 1.8), 'R34\n10 кОм', 'r'); vcc(P(oa[0], oa[1] + 1.8))
    yh = ca.in2[1] - 1.3
    wire(oa, P(oa[0], yh))
    R(P(oa[0], yh), P(9.4, yh), 'R32  1 МОм', 'd')
    wire(P(9.4, yh), P(8.4, yh)); dot(P(8.4, yh))
    # компаратор B: + = VL, − = N
    cb = elm.Opamp(leads=True).right().anchor('in1').at(P(10.0, -2.4)).label('DA3.2', 'bottom', ofst=(0, -0.2), fontsize=10)
    wire(P(8.4, 0), P(8.4, cb.in1[1]), cb.in1)
    vl = P(7.4, cb.in2[1])
    wire(vl, cb.in2); dot(vl)
    text(P(vl[0] + 0.2, vl[1] + 0.3), 'VL', 9)
    R(vl, P(vl[0], vl[1] - 1.8), 'R31\n10 кОм', 'l'); gnd(P(vl[0], vl[1] - 1.8))
    r30 = P(vl[0] - 2.8, vl[1])
    R(vl, r30, 'R30 12 кОм', 'u')
    wire(r30, P(r30[0], r30[1] + 0.6)); vcc(P(r30[0], r30[1] + 0.6))
    ob = P(cb.out[0] + 1.2, cb.out[1])
    wire(cb.out, ob, P(ob[0] + 1.4, ob[1])); dot(ob)
    net(P(ob[0] + 1.4, ob[1]), 'D3', 'right')
    R(ob, P(ob[0], ob[1] + 1.8), 'R35\n10 кОм', 'r'); vcc(P(ob[0], ob[1] + 1.8))
    yl = cb.in2[1] - 1.6
    xj = 8.2
    wire(ob, P(ob[0], yl))
    R(P(ob[0], yl), P(9.6, yl), 'R33  1 МОм', 'd')
    wire(P(9.6, yl), P(xj, yl), P(xj, vl[1])); dot(P(xj, vl[1]))
    text(P(10.6, -6.4), 'DA3: выв. 8 — +5 В, выв. 4 — масса, C3 100 нФ у выводов', 9)

# ---------------------------------------------------------------- 5. Nano
with schemdraw.Drawing(file=out('5-mcu.svg'), show=False) as d:
    title('Лист 5. Arduino Nano (ATmega328P, 16 МГц)', P(-12, 10.0))
    nano = elm.Ic(pins=[elm.IcPin(name='D4', side='left'), elm.IcPin(name='D3', side='left'),
                        elm.IcPin(name='D2', side='left'), elm.IcPin(name='A0', side='left'),
                        elm.IcPin(name='D5', side='left'),
                        elm.IcPin(name='D13', side='right'), elm.IcPin(name='D9', side='right'),
                        elm.IcPin(name='D7', side='right'), elm.IcPin(name='GND', side='right'),
                        elm.IcPin(name='5V', side='right'), elm.IcPin(name='USB', side='top')],
                  size=(3.6, 8.0), pinspacing=1.6, leadlen=0.6).right().at((0, 0))
    A = lambda n: P(*getattr(nano, n))
    xl, xr = A('D5')[0], A('5V')[0]
    text(P((xl + xr) / 2, A('D4')[1] - 1.4), 'A1  Arduino Nano', 11, halign='center')
    for pin, s_ in (('D2', 'D2 (лист 4)'), ('D3', 'D3 (лист 4)'), ('A0', 'A0 (лист 3)')):
        wire(A(pin), P(xl - 1.0, A(pin)[1])); net(P(xl - 1.0, A(pin)[1]), s_, 'left')
    # D4 — тумблер карт
    y4 = A('D4')[1]
    wire(A('D4'), P(xl - 1.0, y4))
    part(elm.Switch, P(xl - 1.0, y4), P(xl - 3.0, y4), 'SA1 «карта 2»')
    wire(P(xl - 3.0, y4), P(xl - 3.4, y4)); gnd(P(xl - 3.4, y4))
    # D5 — глушение: R36 ограничивает ток, VD8 и R37 — у самого вывода
    y5 = A('D5')[1]
    k = P(xl - 4.6, y5)
    wire(A('D5'), k); dot(k)
    R(k, P(k[0], k[1] + 1.8), 'R37\n47 кОм', 'r'); vcc(P(k[0], k[1] + 1.8))
    part(elm.Zener, P(k[0], y5 - 1.6), k, 'VD8\n5.1 В', 'l')
    gnd(P(k[0], y5 - 1.6))
    R(k, P(xl - 6.8, y5), 'R36  4.7 кОм')
    wire(P(xl - 6.8, y5), P(xl - 7.2, y5))
    dot(P(xl - 7.4, y5), open_=True).label('X1:6\nглушение', 'left', fontsize=10)
    # справа
    wire(A('5V'), P(xr + 1.0, A('5V')[1]), P(xr + 1.0, A('5V')[1] + 1.2)); vcc(P(xr + 1.0, A('5V')[1] + 1.2), '+5 В (лист 1)')
    wire(A('GND'), P(xr + 1.0, A('GND')[1])); gnd(P(xr + 1.0, A('GND')[1]))
    wire(A('D7'), P(xr + 1.0, A('D7')[1])); net(P(xr + 1.0, A('D7')[1]), 'D7 (лист 2)', 'right')
    wire(A('D9'), P(xr + 1.0, A('D9')[1])); net(P(xr + 1.0, A('D9')[1]), 'D9 (лист 3)', 'right')
    y13 = A('D13')[1]
    R(P(xr + 0.6, y13), P(xr + 2.8, y13), 'R38  1 кОм')
    wire(A('D13'), P(xr + 0.6, y13))
    wire(P(xr + 2.8, y13), P(xr + 3.4, y13))
    part(elm.LED, P(xr + 3.4, y13), P(xr + 3.4, y13 - 1.8), 'HL1', 'r')
    gnd(P(xr + 3.4, y13 - 1.8))
    wire(A('USB'), P(A('USB')[0], A('USB')[1] + 0.8))
    text(P(A('USB')[0], A('USB')[1] + 1.2), 'USB — ноутбук, 115200', 10, halign='center')

print('ok')
