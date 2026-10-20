/* ============================================================================
   MotoHelper — база данных.  Подключается в index.html перед js/app.js.

   Главное:
     ENGINES  — двигатели (ключ — ID мотора)
     BIKES    — мотоциклы; заполняются через B() и addBike()
     PARTS    — запчасти; комплекты под каждый мотор создаёт genKit()
     GUIDES   — инструкции по ремонту, TUNING — доработки, DIAG/CAUSES — диагностика

   Как добавить мотор:
     CL("НОВЫЙ_ID", "ID_ПОХОЖЕГО", { code, name, cc, hp, ... })  — копия похожего с правками
     RE("ID", { region, code, name, cc, hp, groups, ... })        — дорожный/импортный мотор с нуля
   Как добавить модель:
     addBike("Марка", "Модель", "Эндуро", "ID_МОТОРА", { hp: 25 }) — повтор марки+модели пропускается
     { approx: true } — мотор подобран по похожему, в интерфейсе покажется «≈»
   Список сортируется один раз — в конце файла (sortBikes).
   После правок: npm test
   ============================================================================ */
/* ===== ДВИГАТЕЛИ =====
   groups: horiz, cg, cb, zs4v, dohc, air, liquid, carb, efi, 2t, 4t, small, big, balancer */
var ENGINES = {
  "139FMB": { code: "139FMB", name: "139FMB · мопедный 50", maker: "Lifan / Zongshen / Loncin", groups: ["horiz","air","carb","4t","small"],
    stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 49.5, hp: 3.5, torque: "3 Н·м", compression: "9–11 бар",
    fuel: "АИ-92", ignition: "CDI", timing: "Цепь ГРМ", start: "Кик + электро", gearbox: "4 ст., полуавтомат",
    carb: "PZ19", jetMain: "72–75", jetPilot: "35", needle: "2–3 канавка", idle: "1500–1700",
    valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "A7TC (C7HSA)", gap: "0.6–0.7 мм", sparkTorque: "12–15 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "0.8 л", oilInt: 1000, valveInt: 2000,
    issues: [
      { t: "Слабый генератор", sev: "low", fix: "При LED-фаре и подогревах — смотри реле-регулятор, не перегружай сеть." },
      { t: "Залипает пусковой обогатитель", sev: "med", fix: "Почистить шток, проверить трос/термоэлемент." },
      { t: "Изношенный натяжитель цепи ГРМ шуршит", sev: "med", fix: "Заменить натяжитель и успокоитель." }
    ] },
  "152FMH": { code: "152FMH", name: "152FMH · горизонтальный 110", maker: "Lifan / Zongshen", groups: ["horiz","air","carb","4t","small"],
    stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 107, hp: 7, torque: "7.5 Н·м", compression: "9–11 бар",
    fuel: "АИ-92", ignition: "CDI", timing: "Цепь ГРМ", start: "Кик + электро", gearbox: "4 ст., полуавтомат",
    carb: "PZ19", jetMain: "78–85", jetPilot: "35–38", needle: "3 канавка", idle: "1400–1600",
    valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "A7TC (C7HSA)", gap: "0.6–0.8 мм", sparkTorque: "12–15 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "0.9 л", oilInt: 1000, valveInt: 2000,
    issues: [
      { t: "Клапаны зажимаются к 2–3 тыс. км", sev: "med", fix: "Регулировка на холодную каждые 2000 км." },
      { t: "Цепь ГРМ вытягивается к 8–10 тыс. км", sev: "med", fix: "Цепь + натяжитель + успокоитель комплектом." },
      { t: "Подсос через впускной патрубок", sev: "med", fix: "Заменить патрубок и прокладки, проверить затяжку." }
    ] },
  "154FMI": { code: "1P54FMI", name: "1P54FMI · питбайк 125", maker: "Lifan / YX / Zongshen", groups: ["horiz","air","carb","4t","small"],
    stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 124, hp: 9, torque: "8.5 Н·м", compression: "10–12 бар",
    fuel: "АИ-92", ignition: "CDI", timing: "Цепь ГРМ", start: "Кик (у части — электро)", gearbox: "4 ст., ручное сцепление",
    carb: "PZ19 / PE22", jetMain: "90–100", jetPilot: "35–38", needle: "3 канавка", idle: "1500–1700",
    valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "A7TC (C7HSA)", gap: "0.6–0.8 мм", sparkTorque: "12–15 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "0.9 л", oilInt: 800, valveInt: 1500,
    issues: [
      { t: "Шумит цепь ГРМ после агрессивной езды", sev: "med", fix: "Проверять натяжитель, менять цепь при лязге." },
      { t: "Беднит на верхах с фильтром нулевого", sev: "low", fix: "Главный жиклёр +5…+10." },
      { t: "Выкручивается сливная пробка/болты крышек", sev: "low", fix: "Фиксатор резьбы средней прочности, контроль затяжки." }
    ] },
  "YX140": { code: "YX140", name: "YX 140 (1P56FMJ) · питбайк", maker: "Yinxiang", groups: ["horiz","air","carb","4t","small"],
    stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушное (масляный радиатор у части)", cc: 140, hp: 12, torque: "10 Н·м", compression: "10–12 бар",
    fuel: "АИ-95", ignition: "CDI", timing: "Цепь ГРМ", start: "Кик", gearbox: "4 ст., ручное сцепление",
    carb: "PE24 / PZ26", jetMain: "105–112", jetPilot: "38–40", needle: "3 канавка", idle: "1600–1800",
    valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "D8TC / A7TC", gap: "0.6–0.8 мм", sparkTorque: "12–15 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.0 л", oilInt: 800, valveInt: 1500,
    issues: [
      { t: "Греется при долгой езде на высоких", sev: "med", fix: "Маслорадиатор, не беднить смесь." },
      { t: "Сцепление «ведёт» при перегреве", sev: "low", fix: "Свежее масло без friction-модификаторов, регулировка троса." }
    ] },
  "1P60FMK": { code: "1P60FMK", name: "YX 150/160 (1P60FMK) · питбайк", maker: "Yinxiang", groups: ["horiz","air","carb","4t","small"],
    stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушное + маслорадиатор", cc: 156, hp: 14, torque: "12 Н·м", compression: "10–12 бар",
    fuel: "АИ-95", ignition: "CDI", timing: "Цепь ГРМ", start: "Кик / электро", gearbox: "4–5 ст., ручное сцепление",
    carb: "PZ26 / PWK28", jetMain: "110–120", jetPilot: "38–42", needle: "3 канавка", idle: "1600–1800",
    valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "D8TC / CR7HSA", gap: "0.6–0.8 мм", sparkTorque: "12–15 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.0 л", oilInt: 800, valveInt: 1500,
    issues: [
      { t: "Перегрев без маслорадиатора", sev: "med", fix: "Ставить маслорадиатор, следить за уровнем масла." },
      { t: "Износ кулачков распредвала при плохом масле", sev: "med", fix: "Менять масло чаще, не экономить на нём." }
    ] },
  "CG150": { code: "162FMJ", name: "CG150 (162FMJ)", maker: "Lifan / Loncin / Zongshen", groups: ["cg","air","carb","4t","small"],
    stroke: "4T", cam: "OHV (штанги), 2 клапана", cooling: "Воздушное", cc: 149, hp: 12, torque: "11 Н·м", compression: "9–11 бар",
    fuel: "АИ-92", ignition: "CDI", timing: "Шестерни + штанги толкателей", start: "Кик + электро", gearbox: "5 ст.",
    carb: "PZ26 / PE26", jetMain: "100–108", jetPilot: "35–38", needle: "3 канавка", idle: "1300–1500",
    valveIn: "0.05–0.08 мм", valveEx: "0.05–0.08 мм", spark: "D8TC / A7TC", gap: "0.6–0.8 мм", sparkTorque: "15–18 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.0 л", oilInt: 1500, valveInt: 3000,
    issues: [
      { t: "Цокот клапанов — штанги разбивают регулировку", sev: "low", fix: "Регулировка каждые 3000 км, контргайки с моментом." },
      { t: "Слабый масляный насос при перекрутке", sev: "med", fix: "Не держать долго у отсечки, масло по уровню." },
      { t: "Основные проблемы — в карбюраторе и электрике", sev: "low", fix: "Мотор живучий: ремкомплект карба, проверка массы." }
    ] },
  "CG200": { code: "163FML", name: "CG200 (163FML)", maker: "Lifan / Zongshen", groups: ["cg","air","carb","4t"],
    stroke: "4T", cam: "OHV (штанги), 2 клапана", cooling: "Воздушное", cc: 197, hp: 14.5, torque: "14 Н·м", compression: "9–11 бар",
    fuel: "АИ-92", ignition: "CDI", timing: "Шестерни + штанги толкателей", start: "Кик + электро", gearbox: "5 ст.",
    carb: "PZ27 / PE27", jetMain: "108–115", jetPilot: "38", needle: "3 канавка", idle: "1300–1500",
    valveIn: "0.05–0.08 мм", valveEx: "0.05–0.08 мм", spark: "D8TC (D8RTC)", gap: "0.6–0.8 мм", sparkTorque: "15–18 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.1 л", oilInt: 1500, valveInt: 3000,
    issues: [
      { t: "Вибрации без балансира на высоких", sev: "low", fix: "Проверять затяжку крепежа рамы и мотора." },
      { t: "Течь по прокладке крышки клапанов", sev: "low", fix: "Новая прокладка, ровная затяжка." }
    ] },
  "167FMM": { code: "167FMM", name: "CG250 (167FMM)", maker: "Zongshen / Lifan / Loncin", groups: ["cg","air","carb","4t","big"],
    stroke: "4T", cam: "OHV (штанги), 2 клапана", cooling: "Воздушное (у части — масляный радиатор)", cc: 229, hp: 16, torque: "17 Н·м", compression: "9.5–11.5 бар",
    fuel: "АИ-92", ignition: "CDI", timing: "Шестерни + штанги толкателей", start: "Кик + электро", gearbox: "5 ст.",
    carb: "PZ27 / PE30", jetMain: "110–118", jetPilot: "38–40", needle: "3 канавка", idle: "1300–1500",
    valveIn: "0.05–0.08 мм", valveEx: "0.08–0.10 мм", spark: "D8TC (D8RTC)", gap: "0.6–0.8 мм", sparkTorque: "15–18 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.2 л", oilInt: 1500, valveInt: 3000,
    issues: [
      { t: "Часто путают с 172FMM — детали ЦПГ не взаимозаменяемы", sev: "high", fix: "Покупать запчасти по коду на картере." },
      { t: "Перегрев в грязи на низкой скорости", sev: "med", fix: "Масляный радиатор, правильная смесь." },
      { t: "Разбивает толкатели при грязном масле", sev: "med", fix: "Интервал масла не больше 1500 км." }
    ] },
  "165FMM": { code: "165FMM", name: "CB250D-G (165FMM) · 223 см³", maker: "Lifan / Zongshen", groups: ["cb","air","carb","4t","big"],
    stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 223, hp: 17, torque: "17 Н·м", compression: "10–12 бар",
    fuel: "АИ-92", ignition: "CDI", timing: "Цепь ГРМ", start: "Электро (+кик у части)", gearbox: "5 ст.",
    carb: "PZ27 / PZ30", jetMain: "105–112", jetPilot: "38–40", needle: "3 канавка", idle: "1400–1600",
    valveIn: "0.05–0.08 мм", valveEx: "0.08–0.10 мм", spark: "D8EA (DR8EA)", gap: "0.6–0.7 мм", sparkTorque: "15–18 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.1 л", oilInt: 1500, valveInt: 3000,
    issues: [
      { t: "Стук поршня после 15–20 тыс. км", sev: "med", fix: "Замер зазора поршень–цилиндр, расточка или новая ЦПГ." },
      { t: "Прогар прокладки ГБЦ после перегрева", sev: "high", fix: "Проверить плоскость ГБЦ, оригинальная прокладка." },
      { t: "Слабый стартерный бендикс", sev: "low", fix: "Не крутить стартер дольше 5 секунд подряд." }
    ] },
  "172FMM": { code: "ZS172FMM", name: "ZS172FMM · CB250 2V", maker: "Zongshen", groups: ["cb","air","carb","4t","big"],
    stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушно-масляное", cc: 249, hp: 21, torque: "19 Н·м", compression: "10–12 бар",
    fuel: "АИ-92 / АИ-95", ignition: "CDI", timing: "Цепь ГРМ, автонатяжитель", start: "Электро + кик", gearbox: "5 ст.",
    carb: "PE30 / PZ30", jetMain: "110–118", jetPilot: "38–40", needle: "3 канавка", idle: "1400–1600",
    valveIn: "0.05–0.08 мм", valveEx: "0.08–0.10 мм", spark: "D8EA (DR8EA)", gap: "0.6–0.7 мм", sparkTorque: "15–18 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.2 л", oilInt: 1500, valveInt: 3000,
    issues: [
      { t: "Перегрев на бедной смеси", sev: "high", fix: "Свечу по цвету, главный жиклёр по сезону, маслорадиатор." },
      { t: "Клапаны зажимаются к 3–5 тыс. км", sev: "med", fix: "Регулировать на холодную каждые 3000 км." },
      { t: "Вибрации около 5500–6000 об/мин", sev: "low", fix: "Проверять крепёж мотора, подножек и бака." },
      { t: "PZ19/PZ22 сюда не подходят", sev: "med", fix: "Только 30-мм карбюратор (PE30/PZ30/PWK30-34)." }
    ] },
  "172FMM-3A": { code: "ZS172FMM-3A", name: "ZS172FMM-3A · CB250 4V", maker: "Zongshen", groups: ["cb","zs4v","air","carb","4t","big"],
    stroke: "4T", cam: "SOHC, 4 клапана", cooling: "Воздушно-масляное", cc: 249, hp: 23, torque: "20 Н·м", compression: "11–13 бар",
    fuel: "АИ-95", ignition: "CDI", timing: "Цепь ГРМ, автонатяжитель", start: "Электро + кик", gearbox: "5 ст.",
    carb: "NIBBI PE28 / PE30", jetMain: "112–120", jetPilot: "40–42", needle: "3–4 канавка", idle: "1500–1700",
    valveIn: "0.05–0.08 мм", valveEx: "0.08–0.10 мм", spark: "D8EA (DR8EA)", gap: "0.6–0.7 мм", sparkTorque: "15–18 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.2 л", oilInt: 1500, valveInt: 3000,
    issues: [
      { t: "АИ-92 даёт детонацию под нагрузкой", sev: "high", fix: "Только АИ-95, раннее зажигание не ставить." },
      { t: "Ресурс ниже, чем у 2V версии", sev: "med", fix: "Масло каждые 1000–1500 км, не держать на отсечке." },
      { t: "Коромысла и ось — износ при грязном масле", sev: "med", fix: "Регулярная замена масла и чистка сетки." }
    ] },
  "172FMM-5": { code: "ZS172FMM-5", name: "ZS172FMM-5 · PR250", maker: "Zongshen", groups: ["cb","zs4v","air","carb","4t","big","balancer"],
    stroke: "4T", cam: "SOHC, 4 клапана + балансир", cooling: "Воздушно-масляное", cc: 249, hp: 22, torque: "20 Н·м", compression: "11–13 бар",
    fuel: "АИ-95", ignition: "CDI", timing: "Цепь ГРМ, автонатяжитель", start: "Электро", gearbox: "5–6 ст.",
    carb: "PZ30 / PE30", jetMain: "110–118", jetPilot: "38–40", needle: "3 канавка", idle: "1400–1600",
    valveIn: "0.05–0.08 мм", valveEx: "0.08–0.10 мм", spark: "DR8EA", gap: "0.6–0.7 мм", sparkTorque: "15–18 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.3 л", oilInt: 1500, valveInt: 3000,
    issues: [
      { t: "Балансир чувствителен к старому маслу", sev: "med", fix: "Интервал масла не больше 1500 км." },
      { t: "После расточки на 300 см³ нужен маслорадиатор", sev: "med", fix: "Ставить радиатор и перенастраивать карб." },
      { t: "Метки балансира при сборке", sev: "high", fix: "Выставлять метки по мануалу, иначе сильные вибрации." }
    ] },
  "PR300": { code: "ZS PR300", name: "Zongshen PR300 · 4V балансир", maker: "Zongshen", groups: ["cb","zs4v","air","carb","4t","big","balancer"],
    stroke: "4T", cam: "SOHC, 4 клапана + балансир", cooling: "Воздушно-масляное", cc: 276, hp: 26, torque: "23 Н·м", compression: "11–13 бар",
    fuel: "АИ-95", ignition: "CDI", timing: "Цепь ГРМ, автонатяжитель", start: "Электро", gearbox: "5–6 ст.",
    carb: "PE30 / PWK32–34", jetMain: "118–128", jetPilot: "40–42", needle: "3 канавка", idle: "1400–1600",
    valveIn: "0.05–0.08 мм", valveEx: "0.08–0.10 мм", spark: "DR8EA / CR8E", gap: "0.6–0.7 мм", sparkTorque: "15–18 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.3–1.4 л", oilInt: 1500, valveInt: 3000,
    issues: [
      { t: "Перегрев в медленной грязи", sev: "high", fix: "Маслорадиатор с вентилятором, смесь не беднить." },
      { t: "Ранний износ сцепления у тяжёлых райдеров", sev: "med", fix: "Усиленные пружины, свежее масло JASO MA." },
      { t: "Рывки на малом газе на PWK", sev: "low", fix: "Подбор иглы и холостого жиклёра, проверить ТНВД — винт качества." }
    ] },
  "CBS300": { code: "ZS174MN-3", name: "Zongshen CBS300 (ZS174MN-3) · жидкостное", maker: "Zongshen", groups: ["cb","liquid","carb","4t","big","balancer"],
    stroke: "4T", cam: "SOHC, 4 клапана + балансир", cooling: "Жидкостное", cc: 276, hp: 28, torque: "25 Н·м", compression: "11–13 бар",
    fuel: "АИ-95", ignition: "CDI", timing: "Цепь ГРМ, автонатяжитель", start: "Электро", gearbox: "6 ст.",
    carb: "NIBBI PE30 / PWK34", jetMain: "120–130", jetPilot: "40–42", needle: "3 канавка", idle: "1500–1700",
    valveIn: "0.08–0.12 мм", valveEx: "0.12–0.16 мм", spark: "CR8E", gap: "0.7–0.8 мм", sparkTorque: "12 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "1.4 л", oilInt: 1500, valveInt: 4000, coolant: "1.0–1.2 л",
    issues: [
      { t: "Течёт сальник помпы", sev: "med", fix: "Следи за дренажным отверстием, менять сальники вовремя." },
      { t: "Воздушная пробка после замены антифриза", sev: "med", fix: "Прокачать, долить после первого прогрева." },
      { t: "Слабое крепление радиаторов при падениях", sev: "low", fix: "Защита радиаторов." }
    ] },
  "NC250": { code: "ZS177MM", name: "Zongshen NC250 (ZS177MM) DOHC", maker: "Zongshen", groups: ["dohc","liquid","carb","4t","big"],
    stroke: "4T", cam: "DOHC, 4 клапана", cooling: "Жидкостное", cc: 249, hp: 28, torque: "23 Н·м", compression: "12–14 бар",
    fuel: "АИ-95", ignition: "CDI / DC-CDI", timing: "Цепь ГРМ, гидронатяжитель", start: "Электро", gearbox: "6 ст.",
    carb: "PWK34 / Keihin-клон", jetMain: "135–145", jetPilot: "42–45", needle: "3–4 канавка", idle: "1600–1800",
    valveIn: "0.08–0.12 мм", valveEx: "0.14–0.18 мм", spark: "CR8E", gap: "0.7–0.8 мм", sparkTorque: "12 Н·м",
    oil: "10W-40 / 10W-50 (JASO MA2)", oilVol: "1.4 л", oilInt: 1500, valveInt: 5000, coolant: "1.0 л",
    issues: [
      { t: "Помпа — слабое место (сальник, крыльчатка)", sev: "high", fix: "Контроль антифриза и дренажа помпы." },
      { t: "Регулировка клапанов шайбами", sev: "med", fix: "Нужны щупы и набор шайб, без них не лезть." },
      { t: "Перегрев на месте — вентилятор не включается", sev: "high", fix: "Проверить датчик, реле и сам вентилятор." },
      { t: "Ранние партии — износ распредвалов", sev: "med", fix: "Качественное масло, интервал 1000–1500 км." }
    ] },
  "NB300": { code: "ZS182MN", name: "Zongshen NB300 (ZS182MN) DOHC", maker: "Zongshen", groups: ["dohc","liquid","carb","4t","big","balancer"],
    stroke: "4T", cam: "DOHC, 4 клапана + балансир", cooling: "Жидкостное", cc: 280, hp: 31, torque: "26 Н·м", compression: "12–14 бар",
    fuel: "АИ-95", ignition: "CDI / DC-CDI", timing: "Цепь ГРМ", start: "Электро", gearbox: "6 ст.",
    carb: "NIBBI PE34 / PWK34", jetMain: "140–152", jetPilot: "42–45", needle: "3–4 канавка", idle: "1600–1800",
    valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "CR8E", gap: "0.7–0.8 мм", sparkTorque: "12 Н·м",
    oil: "10W-40 / 10W-50 (JASO MA2)", oilVol: "1.5 л", oilInt: 1500, valveInt: 5000, coolant: "1.1–1.3 л",
    issues: [
      { t: "Помпа и термостат", sev: "high", fix: "Антифриз раз в сезон, контроль утечек." },
      { t: "Прокладка ГБЦ — только оригинал", sev: "high", fix: "Неоригинал прогорает при перегреве." },
      { t: "Клапаны шайбами, нужны щупы", sev: "med", fix: "Замер каждые 5000 км или 50 моточасов." },
      { t: "Вентилятор на некоторых без отдельного предохранителя", sev: "low", fix: "Проверить проводку, добавить предохранитель." }
    ] },
  "NC450": { code: "ZS194MQ", name: "Zongshen NC450 (ZS194MQ) EFI", maker: "Zongshen", groups: ["dohc","liquid","efi","4t","big"],
    stroke: "4T", cam: "DOHC, 4 клапана", cooling: "Жидкостное", cc: 449, hp: 40, torque: "38 Н·м", compression: "12–14 бар",
    fuel: "АИ-95", ignition: "ЭБУ (EFI)", timing: "Цепь ГРМ", start: "Электро", gearbox: "6 ст.",
    carb: "Инжектор (ранние партии — карбюратор)", jetMain: "—", jetPilot: "—", needle: "—", idle: "1500–1700",
    valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "CR8E", gap: "0.7–0.8 мм", sparkTorque: "12 Н·м",
    oil: "10W-50 (JASO MA2)", oilVol: "1.6–1.8 л", oilInt: 1500, valveInt: 5000, coolant: "1.3 л",
    issues: [
      { t: "Ошибки датчиков после мойки", sev: "med", fix: "Сушка разъёмов, диэлектрическая смазка." },
      { t: "Топливный насос не любит грязный бак", sev: "med", fix: "Фильтр насоса, чистый бензин." },
      { t: "Дроссель и РХХ — плавающий холостой", sev: "low", fix: "Чистка дроссельного узла, адаптация ЭБУ." },
      { t: "Тяжело заводится с пол-оборота на слабом АКБ", sev: "med", fix: "Литиевый или свежий AGM-аккумулятор." }
    ] },
  "2T250": { code: "2T 250", name: "2-тактный 250 (KTM-тип)", maker: "Разные OEM", groups: ["2t","liquid","carb","big"],
    stroke: "2T", cam: "Лепестковый клапан, клапан выпуска", cooling: "Жидкостное", cc: 249, hp: 40, torque: "34 Н·м", compression: "9–11 бар",
    fuel: "АИ-95/98 + 2T масло 1:40", ignition: "CDI", timing: "—", start: "Кик (у части — электро)", gearbox: "6 ст.",
    carb: "PWK36 / Keihin-клон", jetMain: "165–175", jetPilot: "40–42", needle: "3 канавка", idle: "1500–1700",
    valveIn: "—", valveEx: "—", spark: "BR8ES / BR9ECMVX", gap: "0.6–0.7 мм", sparkTorque: "20 Н·м",
    oil: "Premix 1:40 (синтетика 2T)", oilVol: "КПП 0.7–0.8 л (80W-90/SAE 10W-40)", oilInt: 0, valveInt: 0, coolant: "1.0 л", hours: true,
    issues: [
      { t: "Ресурс поршня 30–50 моточасов", sev: "high", fix: "Учёт моточасов, замер зазора поршня." },
      { t: "Лепестки трескаются", sev: "med", fix: "Проверять лепестковый клапан каждые 30 м/ч." },
      { t: "Клапан выпуска закоксовывается", sev: "med", fix: "Чистка клапана, качественное 2T масло." },
      { t: "Перегрев на бедной смеси — заклинивание", sev: "high", fix: "Не беднить, свеча — шоколадная." }
    ] },
  "2T300": { code: "2T 300", name: "2-тактный 300 (KTM-тип)", maker: "Разные OEM", groups: ["2t","liquid","carb","big"],
    stroke: "2T", cam: "Лепестковый клапан, клапан выпуска", cooling: "Жидкостное", cc: 293, hp: 46, torque: "40 Н·м", compression: "9–11 бар",
    fuel: "АИ-95/98 + 2T масло 1:40", ignition: "CDI", timing: "—", start: "Электро + кик", gearbox: "6 ст.",
    carb: "PWK38 / STAREZZI PWN38", jetMain: "165–178", jetPilot: "40–45", needle: "3–4 канавка", idle: "1500–1700",
    valveIn: "—", valveEx: "—", spark: "BR8ES / BR9ECMVX", gap: "0.6–0.7 мм", sparkTorque: "20 Н·м",
    oil: "Premix 1:40 (синтетика 2T)", oilVol: "КПП 0.8 л", oilInt: 0, valveInt: 0, coolant: "1.1 л", hours: true,
    issues: [
      { t: "Ресурс поршня 40–60 моточасов", sev: "high", fix: "Журнал моточасов, поршень по регламенту." },
      { t: "Лепестковый клапан и прокладки впуска", sev: "med", fix: "Контроль подсоса — обороты плавают." },
      { t: "Жор сцепления при неправильном масле КПП", sev: "med", fix: "Масло под мокрое сцепление." },
      { t: "Перегрев и заклинивание", sev: "high", fix: "Смесь 1:40 строго, жиклёры по сезону." }
    ] }
};


/* --- дополнительные двигатели --- */
ENGINES["1P56FMJ"] = { code: "1P56FMJ", name: "Lifan 150 (1P56FMJ) · питбайк", maker: "Lifan", groups: ["horiz","air","carb","4t","small"],
  stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 150, hp: 13, torque: "11 Н·м", compression: "10–12 бар",
  fuel: "АИ-92 / АИ-95", ignition: "CDI", timing: "Цепь ГРМ", start: "Кик", gearbox: "4 ст., ручное сцепление",
  carb: "PZ26 / PE26", jetMain: "105–115", jetPilot: "38", needle: "3 канавка", idle: "1500–1700",
  valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "D8TC / A7TC", gap: "0.6–0.8 мм", sparkTorque: "12–15 Н·м",
  oil: "10W-40 (JASO MA)", oilVol: "1.0 л", oilInt: 800, valveInt: 1500,
  issues: [
    { t: "Слабый масляный насос при долгой перекрутке", sev: "med", fix: "Не держать долго у отсечки, менять масло чаще." },
    { t: "Течь масла по прокладке цилиндра", sev: "low", fix: "Новая прокладка, ровная затяжка гаек крест-накрест." },
    { t: "Кикстартер проскальзывает", sev: "med", fix: "Износ храповика — ремкомплект кикстартера." }
  ] };
ENGINES["Z190"] = { code: "ZS1P62YML-2", name: "Zongshen Z190 · питбайк", maker: "Zongshen", groups: ["horiz","air","carb","4t","small"],
  stroke: "4T", cam: "SOHC, 2 клапана (есть 4V версия)", cooling: "Воздушно-масляное, маслорадиатор", cc: 190, hp: 17, torque: "15 Н·м", compression: "11–13 бар",
  fuel: "АИ-95", ignition: "CDI", timing: "Цепь ГРМ", start: "Кик / электро", gearbox: "5 ст., ручное сцепление",
  carb: "PZ30 / PWK30", jetMain: "118–128", jetPilot: "40", needle: "3 канавка", idle: "1600–1800",
  valveIn: "0.05–0.08 мм", valveEx: "0.08–0.10 мм", spark: "D8TC / CR7HSA", gap: "0.6–0.8 мм", sparkTorque: "12–15 Н·м",
  oil: "10W-40 (JASO MA)", oilVol: "1.1 л", oilInt: 800, valveInt: 1500,
  issues: [
    { t: "Перегрев без исправного маслорадиатора", sev: "high", fix: "Проверить радиатор и шланги, масло по уровню." },
    { t: "Срываются шпильки выпуска", sev: "med", fix: "Медная смазка на резьбу, момент без перетяга." },
    { t: "Разбивает натяжитель цепи ГРМ", sev: "med", fix: "Менять натяжитель при первом лязге." },
    { t: "Сцепление греется при езде «на полусцеплении»", sev: "low", fix: "Свежее масло JASO MA, усиленные пружины." }
  ] };
ENGINES["NC250E"] = Object.assign({}, ENGINES["NC250"], { code: "ZS177MM EFI", name: "Zongshen NC250 EFI (инжектор)", groups: ["dohc","liquid","efi","4t","big"],
  ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—",
  issues: ENGINES["NC250"].issues.slice(0, 3).concat([{ t: "Ошибки датчиков после мойки", sev: "med", fix: "Сушка разъёмов, диэлектрическая смазка." }, { t: "Плавающий холостой", sev: "low", fix: "Чистка дросселя, адаптация ЭБУ." }]) });
ENGINES["NB300E"] = Object.assign({}, ENGINES["NB300"], { code: "ZS182MN EFI", name: "Zongshen NC300 EFI (ZS182MN, инжектор)", cc: 300, hp: 34, groups: ["dohc","liquid","efi","4t","big","balancer"],
  ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—",
  issues: ENGINES["NB300"].issues.slice(0, 3).concat([{ t: "Топливный насос и фильтр насоса", sev: "med", fix: "Чистый бензин, фильтр раз в сезон." }, { t: "Ошибка датчика температуры", sev: "low", fix: "Разъём и проводка датчика у головки." }]) });
ENGINES["NC450C"] = Object.assign({}, ENGINES["NC450"], { code: "ZS194MQ", name: "Zongshen NC450 карбюраторный", groups: ["dohc","liquid","carb","4t","big"],
  ignition: "CDI", carb: "Keihin FCR-клон 39 / PWK38", jetMain: "160–175", jetPilot: "42–45", needle: "3 канавка",
  issues: [
    { t: "Ускорительный насос карбюратора — провал при резком газе", sev: "med", fix: "Регулировка хода насоса, чистка клапана." },
    { t: "Тяжёлый запуск на горячую", sev: "low", fix: "Горячий старт кнопкой, проверить уровень поплавка." },
    { t: "Помпа и прокладка ГБЦ при перегреве", sev: "high", fix: "Следи за антифризом и вентилятором." }
  ] });
ENGINES["CB150"] = { code: "162FMJ-2", name: "CB150 (162FMJ-2) вертикальный SOHC", maker: "Zongshen / Lifan", groups: ["cb","air","carb","4t","small"],
  stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 149, hp: 13, torque: "12 Н·м", compression: "10–12 бар",
  fuel: "АИ-92", ignition: "CDI", timing: "Цепь ГРМ", start: "Электро + кик", gearbox: "5 ст.",
  carb: "PZ26 / PE26", jetMain: "105–112", jetPilot: "38", needle: "3 канавка", idle: "1400–1600",
  valveIn: "0.05 мм", valveEx: "0.06–0.08 мм", spark: "D8TC / D8EA", gap: "0.6–0.7 мм", sparkTorque: "12–15 Н·м",
  oil: "10W-40 (JASO MA)", oilVol: "1.0 л", oilInt: 1500, valveInt: 3000,
  issues: [
    { t: "Шум цепи ГРМ после 10 тыс. км", sev: "med", fix: "Цепь, натяжитель и успокоитель комплектом." },
    { t: "Подсос через патрубок карбюратора", sev: "med", fix: "Заменить патрубок, проверить хомуты." }
  ] };

/* ===== МОТОЦИКЛЫ =====
   B(марка, модель, тип, версии) — версия: "ID" или ["ID", "подпись", {carb, hp}] */
var BIKES = [];
var BIKE_KEYS = {};
function B(brand, name, type, vers) {
  BIKES.push({ brand: brand, name: name, type: type, versions: vers.map(function (v) {
    if (typeof v === "string") v = [v];
    var e = ENGINES[v[0]];
    if (!e) throw new Error(brand + " " + name + ": нет двигателя «" + v[0] + "» в ENGINES");
    return Object.assign({ engine: v[0], label: v[1] || e.code + ", " + e.cc + " см³" }, v[2] || {});
  }) });
  BIKE_KEYS[brand + "|" + name] = true;
}
/* Модель с одним мотором; если такая марка+модель уже есть — пропускается */
function addBike(brand, name, type, eng, extra) {
  if (BIKE_KEYS[brand + "|" + name]) return;
  B(brand, name, type, [[eng, null, extra || {}]]);
}
/* Сменить мотор у существующей версии модели (подпись пересчитывается, годы сохраняются) */
function setEngine(brand, name, vi, eng, extra) {
  var b = BIKES.find(function (x) { return x.brand === brand && x.name === name; }), e = ENGINES[eng];
  if (!b || !b.versions[vi]) throw new Error("setEngine: нет модели " + brand + " " + name + " / версии " + vi);
  if (!e) throw new Error("setEngine: нет двигателя " + eng);
  var old = b.versions[vi], v = { engine: eng, label: (old.years ? old.years + " · " : "") + e.code + ", " + e.cc + " см³" };
  if (old.years) v.years = old.years;
  b.versions[vi] = Object.assign(v, extra || {});
}
/* Добавить поколение (версию) к существующей модели */
function addVersion(brand, name, eng, years, extra) {
  var b = BIKES.find(function (x) { return x.brand === brand && x.name === name; }), e = ENGINES[eng];
  if (!b) throw new Error("addVersion: нет модели " + brand + " " + name);
  if (!e) throw new Error("addVersion: нет двигателя " + eng);
  b.versions.push(Object.assign({ engine: eng, years: years, label: years + " · " + e.code + ", " + e.cc + " см³" }, extra || {}));
}
/* Порядок списка: марки по алфавиту, внутри марки — порядок добавления, «Любая модель» в конце */
function sortBikes() {
  var any = BIKES.filter(function (b) { return b.brand === "Любая модель"; }), rest = BIKES.filter(function (b) { return b.brand !== "Любая модель"; });
  rest.sort(function (a, b) { return a.brand === b.brand ? 0 : a.brand.localeCompare(b.brand, "ru"); });
  BIKES.length = 0; rest.concat(any).forEach(function (b) { BIKES.push(b); });
}
(function () {
var E = "Эндуро", P = "Питбайк", M = "Мотард", K = "Кросс-эндуро", T = "Тур-эндуро", L = "Лёгкий эндуро";
/* Motoland */
B("Motoland", "Alpha RX11", "Мопед", [["139FMB","50 см³"], ["152FMH","110 см³"], ["154FMI","125 см³"]]);
B("Motoland", "TT250", E, ["172FMM"]);
B("Motoland", "TT125", P, ["154FMI"]);
B("Motoland", "XR250", E, ["172FMM", ["172FMM-5","PR250"]]);
B("Motoland", "XR250 Lite", E, ["165FMM"]);
B("Motoland", "XR250 Enduro", E, ["172FMM"]);
B("Motoland", "Enduro LT 250", E, ["167FMM"]);
B("Motoland", "Enduro ST 250", E, ["172FMM-3A"]);
B("Motoland", "XT250 ST", E, ["172FMM-3A"]);
B("Motoland", "XT250 HS", E, ["172FMM-3A"]);
B("Motoland", "XT300 HS", E, ["NB300"]);
B("Motoland", "XR300", E, [["PR300", null, { carb: "PWK32" }]]);
B("Motoland", "WRX250 Lite", E, ["172FMM"]);
B("Motoland", "WRX300", E, [["PR300", null, { carb: "PWK34" }]]);
B("Motoland", "MX300", M, [["PR300", null, { carb: "PWK34", hp: 27 }]]);
B("Motoland", "MX140", P, ["YX140"]);
B("Motoland", "Apex 125", P, ["154FMI"]);
/* Progasi */
B("Progasi", "Super Max 250 RR", E, [["172FMM", null, { carb: "NIBBI PE30", hp: 23 }]]);
B("Progasi", "Super Max 250 SM", M, [["172FMM", null, { carb: "NIBBI PE30", hp: 23 }]]);
B("Progasi", "Super Max 250 NG", E, [["172FMM", null, { carb: "NIBBI PE30", hp: 23 }]]);
B("Progasi", "Super Max 300", E, [["PR300", null, { carb: "NIBBI PE30" }]]);
B("Progasi", "Super Max 300 PRO", E, [["PR300", null, { carb: "NIBBI PE30", hp: 27 }]]);
B("Progasi", "Super Max 300 PRO NG", E, [["PR300", null, { carb: "NIBBI PE30", hp: 27 }]]);
B("Progasi", "Race 250", E, ["172FMM"]);
B("Progasi", "Race 300", E, [["NB300", null, { carb: "NIBBI Racing 34" }]]);
B("Progasi", "Race 300 Air", E, [["PR300", null, { carb: "NIBBI Racing 34", hp: 27 }]]);
B("Progasi", "Race 300 2T", K, [["2T300", null, { carb: "STAREZZI PWN38" }]]);
B("Progasi", "Race 450", E, ["NC450"]);
B("Progasi", "Endurance 300", E, ["NB300"]);
B("Progasi", "Endurance 300 EFI", E, ["NB300E"]);
B("Progasi", "Endurance 450", E, ["NC450", ["NC450C","карбюратор"]]);
B("Progasi", "Hardcore 300", E, ["NB300"]);
B("Progasi", "Hardcore 450", E, ["NC450"]);
B("Progasi", "Palma 300", E, [["PR300", null, { carb: "PZ30" }]]);
B("Progasi", "Palma 300 NG", E, [["PR300", null, { carb: "PZ30" }]]);
B("Progasi", "Palma 250 SE", E, ["165FMM"]);
B("Progasi", "Palma 250 NG", E, [["172FMM-3A", null, { carb: "PZ30" }]]);
B("Progasi", "Max 150", L, ["CG150"]);
B("Progasi", "Smart 150", L, ["CB150"]);
B("Progasi", "Sunseeker 250", T, [["172FMM", null, { carb: "NIBBI PE30" }]]);
B("Progasi", "Gaudi 300", E, ["CBS300"]);
/* Kayo */
B("Kayo", "T2 250", E, ["172FMM", ["172FMM-5","PR250"]]);
B("Kayo", "T4 250", E, [["172FMM", null, { carb: "PZ30" }]]);
B("Kayo", "T4 300", E, [["PR300", null, { carb: "PWK34" }]]);
B("Kayo", "K1 250", E, ["172FMM-3A"]);
B("Kayo", "K1 300", E, ["PR300"]);
B("Kayo", "K2 250", E, [["172FMM", null, { carb: "NIBBI PE30" }]]);
B("Kayo", "K6 250", E, ["NC250"]);
B("Kayo", "K6-R 250", E, [["NC250", null, { hp: 29 }], ["NC250E","EFI"]]);
B("Kayo", "K6-R 300", E, ["NB300"]);
B("Kayo", "T6 300", E, ["NB300"]);
B("Kayo", "T6 450", E, ["NC450"]);
B("Kayo", "TT125", P, [["154FMI", null, { carb: "PE22" }]]);
B("Kayo", "TT140", P, ["YX140"]);
B("Kayo", "TT160", P, ["1P60FMK"]);
B("Kayo", "Basic 125", P, ["154FMI"]);
B("Kayo", "Basic 140", P, ["YX140"]);
B("Kayo", "Classic 150", P, ["1P60FMK"]);
B("Kayo", "Classic 190", P, ["Z190"]);
B("Kayo", "KT140", P, ["YX140"]);
B("Kayo", "KT160", P, ["1P60FMK"]);
/* BSE */
B("BSE", "Z1 250", E, ["172FMM"]);
B("BSE", "Z3 300", E, ["PR300"]);
B("BSE", "Z5 250", E, ["172FMM-5"]);
B("BSE", "M2 250", E, ["NC250"]);
B("BSE", "RTC 300", E, ["NB300"]);
B("BSE", "PH10 125", P, ["154FMI"]);
B("BSE", "MX140", P, ["YX140"]);
/* Avantis */
B("Avantis", "Enduro 250", E, ["172FMM"]);
B("Avantis", "Enduro 250 PRO", E, ["172FMM-3A"]);
B("Avantis", "Enduro 250 CARB ARS", E, ["172FMM-5"]);
B("Avantis", "Enduro 250 EFI", E, ["NC250E"]);
B("Avantis", "Enduro 300 PRO", E, ["PR300"]);
B("Avantis", "Enduro 300 PRO CARB", E, ["NB300"]);
B("Avantis", "Enduro 300 PRO EFI", E, ["NB300E"]);
B("Avantis", "A2 Lux 250", E, ["165FMM"]);
B("Avantis", "A6 Lux 250", E, ["172FMM-5"]);
B("Avantis", "A7 Lux 250", E, ["172FMM-3A"]);
B("Avantis", "FX 250", E, ["172FMM"]);
B("Avantis", "Pit 125", P, ["154FMI"]);
B("Avantis", "Pit 140", P, ["YX140"]);
/* Regulmoto */
B("Regulmoto", "Sport 003", E, [["165FMM", null, { carb: "PE30" }]]);
B("Regulmoto", "Sport 004", E, [["PR300", null, { carb: "PWK32" }]]);
B("Regulmoto", "Athlete 250", E, ["172FMM"]);
B("Regulmoto", "Athlete 300", E, ["PR300"]);
B("Regulmoto", "Crosstrec 300", E, ["NB300"]);
B("Regulmoto", "TE 250", E, ["165FMM"]);
/* Irbis */
B("Irbis", "TTR125R", P, ["154FMI"]);
B("Irbis", "TTR150", P, ["1P60FMK"]);
B("Irbis", "XR250R", E, ["167FMM"]);
B("Irbis", "TTR250R", E, [["172FMM-5", null, { carb: "PZ30" }]]);
B("Irbis", "TTR300R", E, [["PR300", null, { carb: "PWK32" }]]);
/* Racer */
B("Racer", "Ranger RC250", E, ["172FMM"]);
B("Racer", "Enduro RC250GY-C2", E, ["167FMM"]);
B("Racer", "Panther RC250XZR", E, ["172FMM-5"]);
B("Racer", "Panther RC300", E, [["PR300", null, { carb: "PWK32" }]]);
B("Racer", "Pitbike RC160", P, ["1P60FMK"]);
B("Racer", "Pitbike RC125PM", P, ["154FMI"]);
/* Wels */
B("Wels", "MZK 250 Enduro", E, ["172FMM"]);
B("Wels", "MZK 300", E, [["PR300", null, { carb: "PWK32" }]]);
B("Wels", "Enduro 150", L, ["CG150"]);
B("Wels", "Pit 125", P, ["154FMI"]);
/* GR */
B("GR8", "F250L Enduro Pro", E, [["NC250", null, { carb: "NIBBI PE30" }]]);
B("GR8", "F300A Enduro Pro", E, [["NB300", null, { carb: "NIBBI PWK32" }]]);
B("GR7", "F250A Enduro", E, ["172FMM"]);
B("GR7", "T250L Enduro", E, ["172FMM"]);
B("GR2", "125 Pit", P, ["154FMI"]);
/* Ataki */
B("Ataki", "EF250", E, ["172FMM"]);
B("Ataki", "EF300", E, [["PR300", null, { carb: "PWK32" }]]);
B("Ataki", "S007 250", E, ["172FMM"]);
B("Ataki", "JR 125", P, ["154FMI"]);
B("Ataki", "SR160", P, ["1P60FMK"]);
/* Kews */
B("Kews", "K16 250", E, ["172FMM"]);
B("Kews", "K16 300", E, ["PR300"]);
B("Kews", "K18 250", E, ["172FMM-5"]);
B("Kews", "K18 300", E, ["PR300"]);
B("Kews", "K21 300", E, ["NB300"]);
/* Tekken */
B("Tekken", "250", E, ["172FMM"]);
B("Tekken", "300 Lite", E, ["PR300"]);
B("Tekken", "300 Pro", E, ["NB300"]);
B("Tekken", "450", E, ["NC450"]);
/* Kovi */
B("Kovi", "Lite 250", E, ["172FMM-3A"]);
B("Kovi", "Pro 250", E, ["NC250"]);
B("Kovi", "Pro 300", E, ["NB300"]);
/* Geon */
B("Geon", "X-Road 250", E, ["172FMM"]);
B("Geon", "Terrax 250", E, ["172FMM-3A"]);
B("Geon", "Dakar 250", E, ["NC250"]);
/* Прочие марки */
B("Минск", "X250", E, ["167FMM"]);
B("Минск", "X200", L, ["CG200"]);
B("Lifan", "LF200GY-5", L, ["CG200"]);
B("Lifan", "LF150-13", L, ["CG150"]);
B("Zongshen", "ZS250GY-3", E, ["172FMM"]);
B("Loncin", "LX250GY-3", E, ["165FMM"]);
B("Shineray", "XY250GY-6B", E, ["172FMM"]);
B("Baltmotors", "Enduro 250", E, ["172FMM"]);
B("Baltmotors", "Motard 250", M, ["172FMM"]);
B("Baltmotors", "Pit 125", P, ["154FMI"]);
B("Rockot", "ZX300 Red Fury", E, [["NB300", null, { carb: "PWK32" }]]);
B("Xmotos", "XB33 125", P, ["154FMI"]);
B("Xmotos", "XB27 140", P, ["YX140"]);
B("Xmotos", "XB88 190", P, ["Z190"]);
B("Apollo", "RXF Freeride 125", P, ["154FMI"]);
B("Apollo", "RXF 140", P, ["YX140"]);
B("Apollo", "RXF 150", P, ["1P60FMK"]);
B("JMC", "125 Pit", P, ["154FMI"]);
B("JMC", "140 Pit", P, ["YX140"]);
B("JMC", "160 Pit", P, ["1P60FMK"]);
B("YCF", "Pilot 125", P, ["154FMI"]);
B("YCF", "Bigy 150", P, ["1P60FMK"]);
B("YCF", "Factory 190", P, ["Z190"]);
B("Lifan", "Pit 150 (1P56FMJ)", P, ["1P56FMJ"]);
/* «Любой мотоцикл» — по коду на картере */
Object.keys(ENGINES).forEach(function (id) {
  var e = ENGINES[id];
  B("Любая модель", "с мотором " + e.code, e.groups.indexOf("horiz") >= 0 ? P : e.stroke === "2T" ? K : e.cc < 170 ? L : E, [[id, e.code]]);
});
})();
Object.keys(ENGINES).forEach(function (k) { ENGINES[k].id = k; });

/* ===== ЗАПЧАСТИ ===== kind — тип детали (для подбора), fit — группы/ID двигателей */
function P(id, name, price, cat, kind, fit, note) { return { id: id, name: name, price: price, cat: cat, kind: kind, fit: fit || null, note: note || "" }; }

/* Механика двигателя генерируется под каждый мотор: одинаковые моторы делят детали */
var SHARE = { "NC250E": "NC250", "NB300E": "NB300", "NC450C": "NC450" };
function engClass(e) {
  if (e.stroke === "2T") return 1.35;
  if (e.cc >= 400) return 2.1;
  if (e.groups.indexOf("dohc") >= 0) return 1.55;
  if (e.groups.indexOf("liquid") >= 0) return 1.35;
  if (e.groups.indexOf("zs4v") >= 0) return 1.15;
  if (e.groups.indexOf("cb") >= 0 && e.cc > 200) return 1.0;
  if (e.groups.indexOf("cg") >= 0) return e.cc > 200 ? 0.85 : 0.7;
  return e.cc > 150 ? 0.75 : 0.6;
}
function r50(v) { return Math.round(v / 50) * 50; }
var GEN_PARTS = [];
Object.keys(ENGINES).forEach(function (id) {
  if (SHARE[id]) return;
  var e = ENGINES[id], k = engClass(e), c = e.code, fit = [id];
  Object.keys(SHARE).forEach(function (s) { if (SHARE[s] === id) fit.push(s); });
  var is4t = e.stroke === "4T", liq = e.groups.indexOf("liquid") >= 0, el = /Электро|электро/.test(e.start);
  function add(slug, name, base, cat, kind) { GEN_PARTS.push(P(id + "-" + slug, name + " " + c, r50(base * k), cat, kind, fit)); }
  add("pis", e.stroke === "2T" ? "Поршень в сборе (кольца, палец)" : "Поршневая группа", 4200, "Двигатель", "piston");
  add("rings", "Кольца поршневые", 1200, "Двигатель", "rings");
  add("cyl", "Цилиндр в сборе", 5500, "Двигатель", "cylinder");
  add("gskt", "Комплект прокладок двигателя", 1400, "Двигатель", "gasketset");
  add("bg", "Прокладки цилиндра", 450, "Двигатель", "basegasket");
  add("seals", "Сальники двигателя (комплект)", 700, "Двигатель", "engseals");
  add("crank", e.stroke === "2T" ? "Коленвал / шатун 2T" : "Коленвал в сборе", 8500, "Двигатель", "crank");
  add("clutch", "Диски сцепления", 2600, "Трансмиссия", "clutchdiscs");
  add("stator", "Статор генератора", 2800, "Электрика", "stator");
  if (el) add("starter", "Стартер", 3500, "Электрика", "starter");
  if (is4t) {
    add("hg", liq ? "Прокладка ГБЦ (металл, оригинал)" : "Прокладка ГБЦ", liq ? 1100 : 350, "Двигатель", "headgasket");
    add("chain", "Цепь ГРМ", 1500, "Двигатель", "camchain");
    add("tens", "Натяжитель цепи ГРМ", 900, "Двигатель", "tensioner");
    add("guide", "Успокоители цепи ГРМ", 800, "Двигатель", "guide");
    add("vin", "Клапан впускной", 900, "Двигатель", "valvein");
    add("vex", "Клапан выпускной", 1100, "Двигатель", "valveex");
    add("cam", e.groups.indexOf("dohc") >= 0 ? "Распредвалы (пара)" : "Распредвал", e.groups.indexOf("dohc") >= 0 ? 5200 : 3200, "Двигатель", "camshaft");
    add("head", "Головка цилиндра в сборе", 9500, "Двигатель", "head");
    add("pump", "Масляный насос", 1600, "Двигатель", "oilpump");
  } else {
    add("hg", "Прокладка/кольцо головки 2T", 700, "Двигатель", "headgasket");
    add("reed", "Лепестковый клапан в сборе", 3200, "Топливо", "reed");
  }
  if (liq) add("wp", "Помпа в сборе", 3800, "Двигатель", "waterpump");
});

var BASE_PARTS = [
  /* Расходники */
  P("sp-a7tc", "Свеча A7TC / C7HSA", 250, "Расходники", "spark", ["horiz"]),
  P("sp-d8tc", "Свеча D8TC / D8RTC", 280, "Расходники", "spark", ["cg","CB150","Z190","1P60FMK","YX140","1P56FMJ"]),
  P("sp-d8ea", "Свеча D8EA / DR8EA", 350, "Расходники", "spark", ["165FMM","172FMM","172FMM-3A","172FMM-5","PR300"]),
  P("sp-cr8e", "Свеча NGK CR8E", 650, "Расходники", "spark", ["CBS300","dohc"]),
  P("sp-irid", "Свеча иридиевая (под ваш тип)", 1100, "Расходники", "spark2"),
  P("sp-br8", "Свеча BR8ES / BR9ES", 450, "Расходники", "spark", ["2t"]),
  P("oil-1040", "Масло 10W-40 JASO MA (1 л)", 850, "Расходники", "oil", ["4t"]),
  P("oil-1040s", "Масло 10W-40 JASO MA2 синтетика (1 л)", 1300, "Расходники", "oil2", ["4t"]),
  P("oil-1050", "Масло 10W-50 JASO MA2 (1 л)", 1250, "Расходники", "oil", ["dohc","CBS300"]),
  P("oil-2t", "Масло 2T синтетика (1 л)", 1100, "Расходники", "oil", ["2t"]),
  P("oil-gear", "Масло КПП для мокрого сцепления (1 л)", 900, "Расходники", "gearoil", ["2t"]),
  P("of-mesh", "Масляная сетка + уплотнение", 250, "Расходники", "oilfilter", ["horiz","cg","165FMM","172FMM","CB150"]),
  P("of-pr", "Масляный фильтр бумажный (PR/4V)", 350, "Расходники", "oilfilter", ["zs4v","CBS300"]),
  P("of-dohc", "Масляный фильтр NC/NB", 450, "Расходники", "oilfilter", ["dohc"]),
  P("af-small", "Фильтр воздушный поролон (малый)", 350, "Расходники", "airfilter", ["small","CG200"]),
  P("af-big", "Фильтр воздушный поролон (250–450)", 650, "Расходники", "airfilter", ["big"]),
  P("af-twin", "Фильтр двухслойный (Twin Air тип)", 1600, "Расходники", "airfilter2", ["big"]),
  P("af-oil", "Пропитка для поролоновых фильтров", 700, "Расходники", "filteroil"),
  P("af-clean", "Средство для промывки фильтров", 700, "Расходники", "filterclean"),
  P("ff", "Топливный фильтр в шланг", 150, "Расходники", "fuelfilter", ["carb"]),
  P("ff-efi", "Фильтр топливного насоса EFI", 900, "Расходники", "fuelfilter", ["efi"]),
  P("bf", "Тормозная жидкость DOT-4 (0.5 л)", 450, "Расходники", "brakefluid"),
  P("bf5", "Тормозная жидкость DOT-5.1 (0.5 л)", 650, "Расходники", "brakefluid2"),
  P("cool", "Антифриз для мото (1 л)", 650, "Расходники", "coolant", ["liquid"]),
  P("chain-lube", "Смазка цепи", 650, "Расходники", "chainlube"),
  P("chain-clean", "Очиститель цепи", 700, "Расходники", "chainclean"),
  P("carb-clean", "Очиститель карбюратора", 450, "Расходники", "carbcleaner", ["carb"]),
  P("brake-clean", "Очиститель тормозов", 350, "Расходники", "brakecleaner"),
  /* Топливо */
  P("pz19", "Карбюратор PZ19", 1500, "Топливо", "carb", ["139FMB","152FMH","154FMI"], "Не ставить на 250+!"),
  P("pe22", "Карбюратор PE22", 1900, "Топливо", "carb", ["154FMI","YX140"]),
  P("pe24", "Карбюратор PE24", 2100, "Топливо", "carb", ["YX140","1P56FMJ","1P60FMK"]),
  P("pz26", "Карбюратор PZ26 / PE26", 2300, "Топливо", "carb", ["horiz","CG150","CG200","CB150"]),
  P("pz27", "Карбюратор PZ27", 2500, "Топливо", "carb", ["cg","165FMM"]),
  P("pwk28", "Карбюратор PWK28", 3200, "Топливо", "carb", ["1P60FMK","YX140","Z190","CB150"]),
  P("pz30", "Карбюратор PZ30", 2900, "Топливо", "carb", ["cb","167FMM","Z190"]),
  P("pe30", "Карбюратор PE30", 3500, "Топливо", "carb", ["cb","167FMM","Z190"]),
  P("nibbi-pe30", "Карбюратор NIBBI PE30 Racing", 5200, "Топливо", "carb", ["cb","167FMM","dohc"]),
  P("pwk32", "Карбюратор PWK32", 4500, "Топливо", "carb", ["cb","dohc"]),
  P("pwk34", "Карбюратор PWK34", 5200, "Топливо", "carb", ["zs4v","CBS300","dohc"]),
  P("nibbi34", "NIBBI Racing 34", 6800, "Топливо", "carb", ["zs4v","CBS300","dohc"]),
  P("pwk38", "Карбюратор PWK38", 6500, "Топливо", "carb", ["2t","NC450C"]),
  P("rk-pz", "Ремкомплект PZ/PE малый", 450, "Топливо", "carbkit", ["horiz","cg","CB150"]),
  P("rk-pe30", "Ремкомплект PE30/PZ30", 650, "Топливо", "carbkit", ["cb","167FMM"]),
  P("rk-pwk", "Ремкомплект PWK / FCR", 750, "Топливо", "carbkit", ["dohc","2t","zs4v","CBS300"]),
  P("jets", "Набор главных жиклёров", 1200, "Топливо", "jets", ["carb"]),
  P("jets-pilot", "Набор холостых жиклёров", 900, "Топливо", "jets2", ["carb"]),
  P("needle", "Игла карбюратора с распылителем", 900, "Топливо", "needle", ["carb"]),
  P("float-v", "Игольчатый клапан поплавка", 450, "Топливо", "floatvalve", ["carb"]),
  P("intake", "Впускной патрубок карбюратора", 700, "Топливо", "intake", ["carb"]),
  P("air-boot", "Патрубок воздушного фильтра", 800, "Топливо", "airboot"),
  P("petcock", "Бензокран", 550, "Топливо", "petcock", ["carb"]),
  P("fuel-hose", "Топливный шланг (1 м)", 200, "Топливо", "fuelhose"),
  P("tank-cap", "Крышка бака с сапуном", 900, "Топливо", "tankcap"),
  P("choke", "Трос/рычаг подсоса", 450, "Топливо", "choke", ["carb"]),
  P("fuelpump", "Топливный насос в сборе (EFI)", 6500, "Топливо", "fuelpump", ["efi"]),
  P("injector", "Форсунка", 3800, "Топливо", "injector", ["efi"]),
  P("tps", "Датчик положения дросселя", 2200, "Топливо", "tps", ["efi"]),
  P("map", "Датчик давления/температуры воздуха", 2400, "Топливо", "mapsensor", ["efi"]),
  P("o2", "Лямбда-зонд", 3200, "Топливо", "o2", ["efi"]),
  P("reed-c", "Лепестки карбоновые (сменные)", 2600, "Топливо", "reedpetals", ["2t"]),
  /* Двигатель (общее) */
  P("vc-gasket", "Прокладка крышки клапанов", 300, "Двигатель", "vcgasket", ["4t"]),
  P("valveseals", "Маслосъёмные колпачки (комплект)", 500, "Двигатель", "valveseals", ["4t"]),
  P("shims", "Набор регулировочных шайб клапанов", 2800, "Двигатель", "shims", ["dohc","CBS300"]),
  P("adj-screws", "Регулировочные винты коромысел + гайки", 450, "Двигатель", "adjscrews", ["horiz","cg","cb"]),
  P("pushrod", "Штанги толкателей + толкатели", 1300, "Двигатель", "pushrod", ["cg"]),
  P("cam-sport", "Распредвал спортивный", 4500, "Двигатель", "camsport", ["cb","horiz"]),
  P("oil-rad", "Масляный радиатор с проставкой", 3500, "Двигатель", "oilcooler", ["air"]),
  P("oil-temp", "Щуп-термометр масла", 1500, "Двигатель", "oiltemp", ["air"]),
  P("drain", "Сливная пробка с магнитом + шайба", 350, "Двигатель", "drainplug", ["4t"]),
  P("breather", "Шланг и фильтр сапуна", 350, "Двигатель", "breather"),
  P("thermo", "Термостат", 1300, "Двигатель", "thermostat", ["CBS300","dohc"]),
  P("rad-cap", "Крышка радиатора 1.1 бар", 700, "Двигатель", "radcap", ["liquid"]),
  P("rad", "Радиатор (одна сторона)", 4800, "Двигатель", "radiator", ["liquid"]),
  P("hoses", "Патрубки охлаждения (комплект)", 1600, "Двигатель", "coolhoses", ["liquid"]),
  P("fan", "Вентилятор радиатора", 3200, "Двигатель", "fan", ["liquid"]),
  P("fan-sw", "Датчик включения вентилятора", 900, "Двигатель", "fansensor", ["liquid"]),
  P("pv", "Клапан выпуска 2T (ремкомплект)", 2500, "Двигатель", "pv", ["2t"]),
  P("kick", "Рычаг кикстартера", 1500, "Двигатель", "kick"),
  P("kick-rk", "Ремкомплект кикстартера (храповик)", 900, "Двигатель", "kickkit"),
  /* Выпуск */
  P("ex-gasket", "Прокладка выпуска (кольцо)", 150, "Выпуск", "exgasket", ["4t"]),
  P("ex-studs", "Шпильки выпуска + гайки", 300, "Выпуск", "exstuds", ["4t"]),
  P("ex-spring", "Пружины глушителя (пара)", 300, "Выпуск", "exspring"),
  P("ex-pack", "Набивка глушителя", 900, "Выпуск", "expack"),
  P("ex-header", "Коллектор выпускной", 3500, "Выпуск", "header", ["4t"]),
  P("ex-muff", "Глушитель (банка)", 6000, "Выпуск", "muffler"),
  P("ex-pipe2t", "Расширительная труба 2T", 14000, "Выпуск", "pipe2t", ["2t"]),
  /* Трансмиссия */
  P("ch-420", "Цепь 420 (100–110 звеньев)", 900, "Трансмиссия", "chain", ["139FMB","152FMH"]),
  P("ch-428", "Цепь 428 (118–130 звеньев)", 1300, "Трансмиссия", "chain", ["154FMI","YX140","1P60FMK","1P56FMJ","Z190","CG150","CG200","CB150"]),
  P("ch-520", "Цепь 520 (114–120 звеньев)", 2200, "Трансмиссия", "chain", ["big"]),
  P("ch-520x", "Цепь 520 X-ring", 5200, "Трансмиссия", "chain2", ["big"]),
  P("ch-lock", "Замок цепи", 200, "Трансмиссия", "chainlock"),
  P("spf", "Звезда передняя (13–15T)", 800, "Трансмиссия", "sprocketF"),
  P("spr", "Звезда задняя (45–52T)", 1500, "Трансмиссия", "sprocketR"),
  P("spr-st", "Звезда задняя стальная", 2400, "Трансмиссия", "sprocketR2"),
  P("clutch-s", "Пружины сцепления усиленные", 900, "Трансмиссия", "clutchsprings"),
  P("clutch-c", "Трос сцепления", 500, "Трансмиссия", "clutchcable"),
  P("thr-c", "Трос газа", 600, "Трансмиссия", "throttle"),
  P("shift", "Сальник вала переключения", 250, "Трансмиссия", "shift"),
  P("shift-lever", "Лапка КПП", 700, "Трансмиссия", "shiftlever"),
  P("chain-roll", "Ролик натяжителя цепи", 600, "Трансмиссия", "chainroller", ["big"]),
  P("chain-guide", "Направляющая цепи", 900, "Трансмиссия", "chainguide", ["big"]),
  P("swing-slider", "Слайдер маятника", 900, "Трансмиссия", "swingslider"),
  /* Тормоза */
  P("pad-f", "Колодки передние (органика)", 900, "Тормоза", "padsF"),
  P("pad-r", "Колодки задние", 800, "Тормоза", "padsR"),
  P("pad-sf", "Колодки передние синтерированные", 1600, "Тормоза", "padsF2"),
  P("pad-sr", "Колодки задние синтерированные", 1400, "Тормоза", "padsR2"),
  P("disc-f", "Тормозной диск передний", 2600, "Тормоза", "brakedisc"),
  P("disc-r", "Тормозной диск задний", 2200, "Тормоза", "brakediscR"),
  P("caliper-kit", "Ремкомплект суппорта", 1100, "Тормоза", "caliperkit"),
  P("mc", "Главный тормозной цилиндр", 3500, "Тормоза", "mastercyl"),
  P("mc-kit", "Ремкомплект главного цилиндра", 900, "Тормоза", "mckit"),
  P("hose", "Шланг армированный", 1800, "Тормоза", "brakehose"),
  P("brake-lever", "Рычаг тормоза", 600, "Тормоза", "brakelever"),
  P("brake-pedal", "Педаль тормоза", 1200, "Тормоза", "brakepedal"),
  /* Подвеска и колёса */
  P("fs", "Сальники вилки (пара)", 1200, "Подвеска", "forkseals"),
  P("fd", "Пыльники вилки (пара)", 800, "Подвеска", "forkdust"),
  P("fbush", "Втулки вилки (комплект)", 1500, "Подвеска", "forkbush"),
  P("fo5", "Масло вилочное 5W (1 л)", 900, "Подвеска", "forkoil"),
  P("fo10", "Масло вилочное 10W (1 л)", 900, "Подвеска", "forkoil2"),
  P("fo15", "Масло вилочное 15W (1 л)", 900, "Подвеска", "forkoil3"),
  P("fsprings", "Пружины вилки усиленные", 4500, "Подвеска", "forksprings", ["big"]),
  P("ftube", "Труба вилки (перо)", 6500, "Подвеска", "forktube"),
  P("steer", "Подшипники рулевой", 1500, "Подвеска", "steering"),
  P("shock", "Амортизатор задний (сток)", 6500, "Подвеска", "shock"),
  P("shock-s", "Сальник амортизатора + пыльник", 900, "Подвеска", "shockseal"),
  P("shock-spring", "Пружина амортизатора", 4500, "Подвеска", "shockspring", ["big"]),
  P("link", "Подшипники прогрессии и маятника", 2400, "Подвеска", "linkage", ["big"]),
  P("swing-bush", "Втулки маятника", 900, "Подвеска", "swingbush"),
  P("swing-axle", "Ось маятника", 1600, "Подвеска", "swingaxle"),
  P("hub", "Подшипники колеса (пара)", 700, "Колёса", "wheelbearing"),
  P("b6301", "Подшипник 6301-2RS", 250, "Колёса", "bearing"),
  P("b6302", "Подшипник 6302-2RS", 280, "Колёса", "bearing"),
  P("b6203", "Подшипник 6203-2RS", 300, "Колёса", "bearing"),
  P("b6004", "Подшипник 6004-2RS", 300, "Колёса", "bearing"),
  P("wheel-seal", "Сальник колеса", 200, "Колёса", "wheelseal"),
  P("tube21", "Камера 21\" усиленная", 1100, "Колёса", "tube", ["big"]),
  P("tube18", "Камера 18\" усиленная", 1100, "Колёса", "tube", ["big"]),
  P("tube-pit", "Камера 14–17\" (питбайк)", 700, "Колёса", "tube", ["small"]),
  P("tire21", "Покрышка 80/100-21 эндуро", 4500, "Колёса", "tireF", ["big"]),
  P("tire18", "Покрышка 110/100-18 эндуро", 5500, "Колёса", "tireR", ["big"]),
  P("tire18x", "Покрышка 120/90-18 экстрим", 6200, "Колёса", "tireR", ["big"]),
  P("tire17p", "Покрышка 70/100-17 (питбайк)", 3000, "Колёса", "tireF", ["small"]),
  P("tire14p", "Покрышка 90/100-14 (питбайк)", 3200, "Колёса", "tireR", ["small"]),
  P("mousse21", "Мусс 21\"", 6500, "Колёса", "mousse", ["big"]),
  P("mousse18", "Мусс 18\"", 7000, "Колёса", "mousse", ["big"]),
  P("rimlock", "Бортзамок", 900, "Колёса", "rimlock"),
  P("rimtape", "Ободная лента", 300, "Колёса", "rimtape"),
  P("spokes", "Спицы с ниппелями (комплект)", 2500, "Колёса", "spokes"),
  P("rim21", "Обод 21×1.60", 6500, "Колёса", "rim", ["big"]),
  P("rim18", "Обод 18×2.15", 7000, "Колёса", "rim", ["big"]),
  /* Электрика */
  P("bat7", "Аккумулятор 12V 7Ah", 2500, "Электрика", "battery", ["big"]),
  P("bat4", "Аккумулятор 12V 4–5Ah", 1800, "Электрика", "battery", ["small","CG200"]),
  P("bat-li", "Литиевый аккумулятор LiFePO4", 6500, "Электрика", "battery2", ["big"]),
  P("cdi5", "Коммутатор CDI (5 пин)", 1100, "Электрика", "cdi", ["horiz","cg","CB150"]),
  P("cdi6", "Коммутатор DC-CDI (6 пин)", 1500, "Электрика", "cdi", ["cb","dohc"]),
  P("cdi-2t", "CDI 2T", 2800, "Электрика", "cdi", ["2t"]),
  P("cdi-prog", "Программируемый CDI", 4500, "Электрика", "cdi2", ["carb"]),
  P("ecu", "Блок управления ЭБУ", 14000, "Электрика", "ecu", ["efi"]),
  P("coil", "Катушка зажигания", 800, "Электрика", "coil"),
  P("cap", "Свечной колпачок", 350, "Электрика", "sparkcap"),
  P("ht-lead", "Высоковольтный провод", 300, "Электрика", "htlead"),
  P("st-relay", "Реле стартера", 600, "Электрика", "starterrelay"),
  P("reg", "Реле-регулятор", 1200, "Электрика", "regulator"),
  P("pickup", "Датчик Холла / пикап", 700, "Электрика", "pickup"),
  P("ign-sw", "Замок зажигания", 1300, "Электрика", "ignswitch"),
  P("sw-left", "Блок кнопок левый", 1200, "Электрика", "switches"),
  P("kill", "Кнопка глушения", 450, "Электрика", "killswitch"),
  P("side-sw", "Датчик боковой подножки", 500, "Электрика", "sidestand", ["big"]),
  P("neutral", "Датчик нейтрали", 500, "Электрика", "neutral"),
  P("clutch-sw", "Датчик выжима сцепления", 350, "Электрика", "clutchswitch"),
  P("fuses", "Предохранители (набор)", 250, "Электрика", "fuse"),
  P("ground", "Провод массы", 300, "Электрика", "ground"),
  P("led", "Фара LED", 2500, "Электрика", "headlight"),
  P("tail", "Задний фонарь LED", 900, "Электрика", "taillight"),
  P("turns", "Поворотники (комплект)", 1200, "Электрика", "turns"),
  P("flasher", "Реле поворотов (под LED)", 350, "Электрика", "flasher"),
  P("speedo", "Спидометр электронный", 3500, "Электрика", "speedo"),
  P("speed-s", "Датчик скорости", 700, "Электрика", "speedsensor"),
  P("usb", "USB-зарядка на руль", 900, "Электрика", "usb"),
  P("ecu-scan", "Диагностический адаптер EFI", 2500, "Электрика", "scanner", ["efi"]),
  /* Рама и управление */
  P("lever-set", "Рычаги складные (пара)", 2200, "Рама", "levers"),
  P("clutch-lever", "Рычаг сцепления", 600, "Рама", "clutchlever"),
  P("grips", "Ручки руля", 500, "Рама", "grips"),
  P("throttle-h", "Ручка газа в сборе", 1300, "Рама", "throttlehousing"),
  P("bar", "Руль 28.6 + адаптеры", 3500, "Рама", "handlebar", ["big"]),
  P("mirrors", "Зеркала (пара)", 900, "Рама", "mirrors"),
  P("plastic", "Пластик (комплект)", 9000, "Рама", "plastic"),
  P("fender-f", "Крыло переднее", 1800, "Рама", "fender"),
  P("fender-r", "Крыло заднее", 1800, "Рама", "fender"),
  P("seat", "Сиденье", 4500, "Рама", "seat"),
  P("pegs", "Подножки водителя (пара)", 1600, "Рама", "pegs"),
  P("stand", "Подножка боковая", 1500, "Рама", "sidestand2"),
  P("stand-spr", "Пружина подножки", 200, "Рама", "standspring"),
  P("bolts", "Набор болтов пластика и крыльев", 600, "Рама", "bolts"),
  /* Смазки */
  P("grease", "Смазка литиевая", 400, "Смазки", "grease"),
  P("grease-w", "Смазка водостойкая для подшипников", 700, "Смазки", "grease2"),
  P("copper", "Медная смазка для резьб выпуска", 450, "Смазки", "copper"),
  P("wd", "Проникающая смазка", 350, "Смазки", "wd"),
  P("sealant", "Герметик прокладок", 350, "Смазки", "sealant"),
  P("sealant-hot", "Термостойкий герметик", 400, "Смазки", "sealanthot"),
  P("loctite", "Фиксатор резьбы", 450, "Смазки", "loctite"),
  P("dielec", "Диэлектрическая смазка разъёмов", 450, "Смазки", "dielectric"),
  /* Инструмент */
  P("puller", "Съёмник маховика", 900, "Инструмент", "puller"),
  P("clutch-holder", "Держатель корзины сцепления", 1200, "Инструмент", "clutchholder"),
  P("feeler", "Набор щупов", 450, "Инструмент", "feeler"),
  P("torque", "Динамометрический ключ", 3500, "Инструмент", "torque"),
  P("sockets", "Набор головок и бит", 2500, "Инструмент", "sockets"),
  P("plug-key", "Свечной ключ 16/18/21", 300, "Инструмент", "plugkey"),
  P("comp", "Компрессометр", 1800, "Инструмент", "compression"),
  P("multi", "Мультиметр", 1200, "Инструмент", "multimeter"),
  P("spark-t", "Тестер искры", 400, "Инструмент", "sparktester"),
  P("carb-drv", "Отвёртки для карбюратора", 400, "Инструмент", "carbdriver", ["carb"]),
  P("chain-tool", "Выжимка/расклёпка цепи", 1800, "Инструмент", "chaintool"),
  P("tire-levers", "Монтажки (пара)", 900, "Инструмент", "tirelevers"),
  P("pump", "Насос с манометром", 2500, "Инструмент", "airpump"),
  P("gauge", "Манометр шинный", 500, "Инструмент", "tiregauge"),
  P("stand-lift", "Подставка-подкат", 3500, "Инструмент", "lift"),
  P("bleeder", "Шприц для прокачки тормозов", 600, "Инструмент", "bleeder"),
  P("hourmeter", "Тахометр-моточасы", 1300, "Инструмент", "hourmeter"),
  /* Защита */
  P("skid", "Защита картера", 3500, "Защита", "skid", ["big"]),
  P("hand", "Защита рук", 2800, "Защита", "handguards"),
  P("radg", "Защита радиаторов", 3200, "Защита", "radguard", ["liquid"]),
  P("bars", "Дуги безопасности", 5500, "Защита", "bars", ["big"]),
  P("swing-g", "Защита маятника", 1800, "Защита", "swingguard", ["big"]),
  P("disc-g", "Защита заднего тормозного диска", 1800, "Защита", "discguard", ["big"]),
  P("frame-g", "Защита рамы", 2200, "Защита", "frameguard", ["big"]),
  P("fork-g", "Гофры на вилку", 900, "Защита", "forkgaiters"),
  P("sprocket-g", "Защита передней звезды", 900, "Защита", "sprocketguard")
];
var PARTS = GEN_PARTS.concat(BASE_PARTS);

var WORKS = [
  { name: "Замена масла и фильтра", price: 600, cat: "ТО" },
  { name: "Чистка и пропитка воздушного фильтра", price: 400, cat: "ТО" },
  { name: "Замена свечи", price: 300, cat: "ТО" },
  { name: "Чистка карбюратора", price: 1500, cat: "Питание" },
  { name: "Настройка карбюратора (жиклёры, игла)", price: 1500, cat: "Питание" },
  { name: "Установка карбюратора другого типа", price: 2500, cat: "Питание" },
  { name: "Чистка дроссельного узла EFI", price: 1500, cat: "Питание" },
  { name: "Замена топливного насоса", price: 1800, cat: "Питание" },
  { name: "Регулировка клапанов (винты)", price: 2000, cat: "Двигатель" },
  { name: "Регулировка клапанов (шайбы, DOHC)", price: 4500, cat: "Двигатель" },
  { name: "Замер компрессии", price: 500, cat: "Двигатель" },
  { name: "Замена поршневой", price: 5000, cat: "Двигатель" },
  { name: "Замена поршня 2T", price: 3500, cat: "Двигатель" },
  { name: "Замена прокладки ГБЦ", price: 4000, cat: "Двигатель" },
  { name: "Притирка клапанов", price: 3500, cat: "Двигатель" },
  { name: "Замена маслосъёмных колпачков", price: 3500, cat: "Двигатель" },
  { name: "Замена цепи ГРМ и натяжителя", price: 3500, cat: "Двигатель" },
  { name: "Замена распредвала", price: 4000, cat: "Двигатель" },
  { name: "Капитальный ремонт двигателя", price: 15000, cat: "Двигатель" },
  { name: "Замена коленвала", price: 9000, cat: "Двигатель" },
  { name: "Замена сальников двигателя", price: 3000, cat: "Двигатель" },
  { name: "Ремонт кикстартера", price: 2500, cat: "Двигатель" },
  { name: "Установка маслорадиатора", price: 2500, cat: "Двигатель" },
  { name: "Свап двигателя", price: 12000, cat: "Двигатель" },
  { name: "Обслуживание лепесткового клапана", price: 1500, cat: "Двигатель" },
  { name: "Чистка клапана выпуска 2T", price: 2000, cat: "Двигатель" },
  { name: "Ремонт помпы", price: 3000, cat: "Охлаждение" },
  { name: "Замена антифриза с прокачкой", price: 1200, cat: "Охлаждение" },
  { name: "Замена термостата", price: 1500, cat: "Охлаждение" },
  { name: "Установка вентилятора", price: 2000, cat: "Охлаждение" },
  { name: "Замена сцепления", price: 3000, cat: "Трансмиссия" },
  { name: "Замена цепи и звёзд", price: 1500, cat: "Трансмиссия" },
  { name: "Регулировка троса сцепления и газа", price: 500, cat: "Трансмиссия" },
  { name: "Ремонт КПП", price: 9000, cat: "Трансмиссия" },
  { name: "Замена колодок", price: 800, cat: "Тормоза" },
  { name: "Прокачка тормозов", price: 1200, cat: "Тормоза" },
  { name: "Переборка суппорта", price: 1800, cat: "Тормоза" },
  { name: "Замена тормозного диска", price: 1000, cat: "Тормоза" },
  { name: "Замена сальников вилки", price: 3000, cat: "Подвеска" },
  { name: "Замена масла в вилке", price: 1500, cat: "Подвеска" },
  { name: "Перешивка вилки под вес", price: 6000, cat: "Подвеска" },
  { name: "Обслуживание прогрессии и маятника", price: 2500, cat: "Подвеска" },
  { name: "Замена подшипников рулевой", price: 2500, cat: "Подвеска" },
  { name: "Обслуживание амортизатора", price: 4500, cat: "Подвеска" },
  { name: "Диагностика электрики", price: 1500, cat: "Электрика" },
  { name: "Компьютерная диагностика EFI", price: 1500, cat: "Электрика" },
  { name: "Ремонт стартера", price: 2500, cat: "Электрика" },
  { name: "Замена статора", price: 3500, cat: "Электрика" },
  { name: "Ремонт проводки", price: 2000, cat: "Электрика" },
  { name: "Установка LED-света", price: 1200, cat: "Электрика" },
  { name: "Замена покрышки", price: 1000, cat: "Колёса" },
  { name: "Установка мусса", price: 1500, cat: "Колёса" },
  { name: "Замена подшипников колеса", price: 1000, cat: "Колёса" },
  { name: "Балансировка / правка спиц", price: 1500, cat: "Колёса" },
  { name: "Перешнуровка колеса", price: 3500, cat: "Колёса" },
  { name: "Мойка и подготовка к сезону", price: 2500, cat: "Прочее" },
  { name: "Консервация на зиму", price: 2000, cat: "Прочее" }
];

function fits(item, eng) {
  if (!item.fit || !eng) return true;
  return item.fit.some(function (f) { return f === eng.id || eng.groups.indexOf(f) >= 0; });
}
/* деталь нужного вида под мотор: сначала именно под этот ID, потом под группу */
function partByKind(kind, eng) {
  var c = PARTS.filter(function (p) { return p.kind === kind && fits(p, eng); });
  return c.find(function (p) { return p.fit && p.fit.indexOf(eng.id) >= 0; }) || c[0] || null;
}
function partByName(name) { return PARTS.find(function (p) { return p.name === name; }) || null; }
function partById(id) { return PARTS.find(function (p) { return p.id === id; }) || null; }

/* ===== ТЮНИНГ =====
   fit — где применимо; deny — где нельзя (с причиной); notes — комментарии под конкретный мотор;
   stage — этап (1 — без вскрытия, 2 — впуск/выпуск/карб, 3 — мотор). power — % прироста. */
var TUNING = [
  { id: "filter", cat: "Впуск", title: "Фильтр нулевого / двухслойный поролон", stage: 1, power: 2, price: 1200, diff: "просто", rating: 4.4, fit: ["carb","efi"],
    body: "Больше воздуха на верхах. Без перенастройки смеси мотор начнёт беднить.",
    notes: { "172FMM": "Главный жиклёр +5 от штатного.", "PR300": "Главный +5…+8, иначе перегрев.", "efi": "ЭБУ частично компенсирует, лучше с прошивкой.", "2t": "Только качественный поролон — пыль убивает поршень за часы." } },
  { id: "jets", cat: "Впуск", title: "Подбор жиклёров и иглы", stage: 1, power: 2, price: 1800, diff: "средне", rating: 4.8, fit: ["carb"],
    body: "Основа любой доработки. Смесь по свече и по сезону — мотор живёт дольше и едет ровнее.",
    notes: { "small": "Шаг жиклёра — 2–5 единиц.", "dohc": "Начинать с холостого жиклёра и винта качества." } },
  { id: "pe30", cat: "Впуск", title: "Карбюратор PE30 / NIBBI PE30", stage: 2, power: 3, price: 4500, diff: "средне", rating: 4.7, fit: ["167FMM","165FMM","172FMM","172FMM-3A","172FMM-5"],
    body: "Лучшая смесь на низах и средних. Снимает рывки штатного PZ.",
    notes: { "165FMM": "Нужна проставка-переходник впуска.", "167FMM": "Проверь посадочный диаметр патрубка." } },
  { id: "pwk", cat: "Впуск", title: "Карбюратор PWK32/34", stage: 2, power: 6, price: 5200, diff: "сложно", rating: 4.3, fit: ["zs4v","CBS300","dohc"],
    body: "Ускорительный насос и плоский золотник — резче отклик и верхи.",
    deny: { "172FMM": "Для 2-клапанного 250 избыточен — проваливается низ.", "small": "Слишком большой диффузор." },
    notes: { "PR300": "Самая заметная доработка для PR300 вместе с выпуском.", "NC250": "Обычно уже стоит — проверь штатный." } },
  { id: "pwk28", cat: "Впуск", title: "Карбюратор PWK28 / PE26", stage: 2, power: 8, price: 3200, diff: "средне", rating: 4.5, fit: ["154FMI","YX140","1P60FMK"],
    body: "Для питбайков — главный апгрейд после фильтра." },
  { id: "slip", cat: "Выпуск", title: "Глушитель slip-on (банка)", stage: 2, power: 3, price: 8000, diff: "средне", rating: 4.1, fit: ["4t"],
    body: "Легче на 1–2 кг, свободнее выпуск. Громче — следи за законом.",
    notes: { "carb": "После установки — главный жиклёр +5…+10." } },
  { id: "full", cat: "Выпуск", title: "Полная выпускная система", stage: 2, power: 8, price: 18000, diff: "сложно", rating: 4.6, fit: ["big"],
    deny: { "2t": "Для 2T — см. расширительную трубу." },
    body: "Коллектор + резонатор + банка. Даёт максимум вместе с карбом.",
    notes: { "172FMM": "Обязательно в связке с PE30 и маслорадиатором.", "efi": "Нужна прошивка ЭБУ, иначе беднит." } },
  { id: "pipe", cat: "Выпуск", title: "Расширительная труба 2T", stage: 2, power: 7, price: 16000, diff: "средне", rating: 4.6, fit: ["2t"],
    body: "Смещает полку мощности. Тросовая или «торк»-версия под эндуро." },
  { id: "reed", cat: "Впуск", title: "Карбоновые лепестки", stage: 1, power: 2, price: 3200, diff: "средне", rating: 4.4, fit: ["2t"],
    body: "Ровнее отклик снизу, ресурс выше стальных." },
  { id: "bore300", cat: "Двигатель", title: "Поршневой кит 300 см³", stage: 3, power: 18, price: 6500, diff: "сложно", rating: 4.8, fit: ["172FMM-5"],
    body: "PR250 → ~276 см³. Самый заметный прирост тяги.",
    notes: { "172FMM-5": "После расточки — маслорадиатор и карб 32–34 обязательно." } },
  { id: "bore-yx", cat: "Двигатель", title: "Цилиндр YX 150 → 160", stage: 3, power: 10, price: 5500, diff: "сложно", rating: 4.5, fit: ["1P60FMK"],
    body: "Простой прирост объёма для питбайка." },
  { id: "bore-cg", cat: "Двигатель", title: "Расточка CG до большего объёма", stage: 3, power: 12, price: 5000, diff: "сложно", rating: 3.9, fit: ["CG150","CG200"],
    body: "Ресурс падает, нагрев растёт. Имеет смысл только с маслорадиатором." },
  { id: "cam", cat: "Двигатель", title: "Спортивный распредвал", stage: 3, power: 6, price: 4500, diff: "сложно", rating: 4.2, fit: ["horiz","165FMM","172FMM"],
    deny: { "dohc": "Готовых валов почти нет, риск встречи клапанов." },
    body: "Больше подъём и фазы — верхи сильнее, низ слабее." },
  { id: "ecu", cat: "Электроника", title: "Прошивка ЭБУ", stage: 2, power: 6, price: 9000, diff: "сложно", rating: 4.4, fit: ["efi"],
    body: "Коррекция топливных карт под выпуск и фильтр, отключение отсечки по скорости." },
  { id: "cdi", cat: "Электроника", title: "Спортивный CDI без ограничителя", stage: 1, power: 3, price: 1800, diff: "просто", rating: 4.0, fit: ["carb"],
    deny: { "zs4v": "Ранний угол на 4V без АИ-98 — детонация." },
    body: "Сдвинутый угол и выше отсечка. Только на хорошем бензине." },
  { id: "oilcool", cat: "Охлаждение", title: "Маслорадиатор с вентилятором", stage: 1, power: 0, price: 3800, diff: "средне", rating: 4.7, fit: ["air"], must: true,
    body: "Снижает температуру масла на 15–20 °C. Обязателен при любом тюнинге воздушника." },
  { id: "fan", cat: "Охлаждение", title: "Вентилятор радиатора + кнопка", stage: 1, power: 0, price: 3500, diff: "средне", rating: 4.8, fit: ["liquid"], must: true,
    body: "Спасает при медленной езде в грязи. Принудительное включение кнопкой." },
  { id: "clutch", cat: "Трансмиссия", title: "Усиленные пружины сцепления", stage: 1, power: 0, price: 900, diff: "средне", rating: 4.5, fit: ["big"],
    body: "Нужно после прироста мощности — иначе сцепление будет буксовать." },
  { id: "sp-tq", cat: "Трансмиссия", title: "Передняя звезда −1 зуб (тяга)", stage: 1, power: 0, price: 800, diff: "просто", rating: 4.6,
    body: "Короче передачи — лучше в лесу и на подъёмах. Максималка ниже." },
  { id: "sp-sp", cat: "Трансмиссия", title: "Передняя звезда +1 зуб (скорость)", stage: 1, power: 0, price: 800, diff: "просто", rating: 4.0,
    deny: { "small": "Мощности не хватит — разгон станет вялым." },
    body: "Длиннее передачи — для трассы и полей." },
  { id: "x-ring", cat: "Трансмиссия", title: "Цепь X-ring + стальные звёзды", stage: 1, power: 0, price: 7500, diff: "просто", rating: 4.7, fit: ["big"],
    body: "Ресурс в 2–3 раза выше штатной." },
  { id: "fork", cat: "Подвеска", title: "Прогрессивные пружины вилки", stage: 1, power: 0, price: 4500, diff: "средне", rating: 4.6, fit: ["big"],
    body: "Меньше пробоев и клевков, подбор по весу райдера." },
  { id: "forkoil", cat: "Подвеска", title: "Масло вилки 10W + уровень", stage: 1, power: 0, price: 1000, diff: "средне", rating: 4.4,
    body: "Дешёвое улучшение демпфирования." },
  { id: "pads", cat: "Тормоза", title: "Синтерированные колодки", stage: 1, power: 0, price: 1600, diff: "просто", rating: 4.6,
    body: "Стабильнее в воде и грязи." },
  { id: "hose", cat: "Тормоза", title: "Армированный шланг", stage: 1, power: 0, price: 1800, diff: "средне", rating: 4.7,
    body: "Чёткая ручка, нет «ваты»." },
  { id: "skid", cat: "Защита", title: "Защита картера (алюминий)", stage: 1, power: 0, price: 3500, diff: "просто", rating: 4.9, fit: ["big"],
    body: "Первое, что стоит поставить на эндуро." },
  { id: "hand", cat: "Защита", title: "Защита рук с металлом", stage: 1, power: 0, price: 2800, diff: "просто", rating: 4.8,
    body: "Спасает рычаги и пальцы." },
  { id: "radguard", cat: "Защита", title: "Защита радиаторов", stage: 1, power: 0, price: 3200, diff: "просто", rating: 4.7, fit: ["liquid"],
    body: "Одно падение без неё — и вы без антифриза в лесу." },
  { id: "led", cat: "Электрика", title: "LED-фара", stage: 1, power: 0, price: 2500, diff: "просто", rating: 4.6,
    notes: { "small": "Проверь мощность генератора — у мопедов он слабый." },
    body: "Ярче и меньше нагрузка на генератор." },
  { id: "lithium", cat: "Электрика", title: "Литиевый аккумулятор", stage: 1, power: 0, price: 6500, diff: "просто", rating: 4.5, fit: ["big"],
    body: "Минус 1.5–2 кг, уверенный запуск в холод." }
];

function tuningFor(t, eng) {
  var deny = null;
  if (t.deny) Object.keys(t.deny).forEach(function (k) { if (k === eng.id || eng.groups.indexOf(k) >= 0) deny = t.deny[k]; });
  var ok = fits(t, eng) && !deny;
  var note = null;
  if (t.notes) Object.keys(t.notes).forEach(function (k) { if (k === eng.id || eng.groups.indexOf(k) >= 0) note = t.notes[k]; });
  if (!fits(t, eng) && !deny) deny = "Не подходит для этого мотора.";
  return { ok: ok, deny: deny, note: note };
}

/* ===== ДИАГНОСТИКА =====  parts — kind'ы; only/skip — группы */
var DIAG = [
  { id: "start", title: "Не заводится", icon: "🔑", steps: [
    { q: "Отсоедини топливный шланг от карбюратора. Бензин идёт?", efiQ: "Включи зажигание. Слышно, как жужжит топливный насос 2–3 секунды?", yes: "Да", no: "Нет", onYes: "next",
      onNo: { result: "Нет подачи топлива", action: "Проверь бензокран, сапун крышки бака, фильтр в шланге. На EFI — предохранитель и реле насоса.", parts: ["fuelfilter","petcock","fuelpump"] } },
    { q: "Выкрути свечу {spark}, прижми к массе и крутани. Есть синяя искра?", hint: "Зазор свечи {gap}.", yes: "Есть", no: "Нет", onYes: "next",
      onNo: { result: "Нет искры", action: "Новая свеча {spark} ({gap}). Затем колпачок, катушка, пикап, коммутатор. Проверь массу и кнопку стоп.", parts: ["spark","sparkcap","coil","cdi"] } },
    { q: "Свеча после попыток мокрая и пахнет бензином?", yes: "Да", no: "Сухая", onYes: { result: "Залило свечу", action: "Выкрути свечу, прокрути мотор с полным газом без свечи, просуши. Проверь игольчатый клапан поплавковой камеры.", parts: ["spark","carbkit"] }, onNo: "next" },
    { q: "Компрессия в норме ({compression})?", hint: "Замер на прогретом моторе с полностью открытым газом.", yes: "В норме", no: "Ниже", onYes: { result: "Подсос или фазы", action: "Проверь впускной патрубок, метки ГРМ, засор холостого жиклёра ({jetPilot}).", parts: ["intake","jets","carbkit"] },
      onNo: { result: "Низкая компрессия", action: "Сначала клапаны: впуск {valveIn}, выпуск {valveEx}. Если зазоры в норме — износ ЦПГ.", parts: ["piston","basegasket","valvein"], skip2t: true } }
  ]},
  { id: "cold", title: "Глохнет на холодную", icon: "❄️", only: ["carb"], steps: [
    { q: "После прогрева проблема пропадает?", yes: "Да", no: "Нет", onYes: "next", onNo: { result: "Проблема не в прогреве", action: "Смотри жиклёры: главный {jetMain}, холостой {jetPilot}. Чистка карбюратора.", parts: ["carbkit","jets"] } },
    { q: "Пусковой обогатитель (подсос) работает?", yes: "Да", no: "Залип", onYes: "next", onNo: { result: "Не работает обогатитель", action: "Почисти шток, проверь трос и ход рычага.", parts: ["carbkit"] } },
    { q: "Обороты холостого плавают вверх-вниз?", yes: "Да", no: "Нет", onYes: { result: "Подсос воздуха", action: "Проверь впускной патрубок и хомуты: брызни WD на стыки на холостых — изменились обороты, значит там.", parts: ["intake","wd"] }, onNo: "next" },
    { q: "Клапаны регулировал по регламенту ({valveIn} / {valveEx})?", yes: "Да", no: "Давно", onYes: { result: "Засор холостого канала", action: "Продуть холостой жиклёр {jetPilot}, отрегулировать ХХ {idle}.", parts: ["jets"] }, onNo: { result: "Зажаты клапаны", action: "Регулировка на холодную: впуск {valveIn}, выпуск {valveEx}.", parts: ["vcgasket","feeler"] } }
  ]},
  { id: "hot", title: "Глохнет на горячую", icon: "🔥", steps: [
    { q: "Глохнет через 10–20 минут езды и потом не заводится, пока не остынет?", yes: "Да", no: "Нет", onYes: "next", onNo: "next" },
    { q: "Мотор сильно перегрет? ({cooling})", yes: "Да", no: "Нет", onYes: { result: "Перегрев", action: "Уровень масла ({oilVol}), бедная смесь, засорённый фильтр. Жидкостное — вентилятор и антифриз.", parts: ["oil","airfilter","coolant"] }, onNo: "next" },
    { q: "Бензобак: если открыть крышку — мотор оживает?", yes: "Да", no: "Нет", onYes: { result: "Забит сапун бака", action: "Прочисти сапун крышки или трубку сапуна.", parts: [] }, onNo: { result: "Тепловой отказ зажигания", action: "Коммутатор или катушка отказывают на горячую. Проверить подменой.", parts: ["cdi","coil","pickup"] } }
  ]},
  { id: "idle", title: "Не держит холостые", icon: "〰️", only: ["carb"], steps: [
    { q: "Двигатель прогрет и ХХ выставлен на {idle}?", yes: "Да", no: "Нет", onYes: "next", onNo: { result: "Нужна регулировка", action: "Прогрей, выставь упорный винт на {idle}, затем винт качества смеси до максимума оборотов.", parts: [] } },
    { q: "Обороты растут, если прикрыть рукой воздухозаборник?", yes: "Да", no: "Нет", onYes: { result: "Бедно на ХХ", action: "Холостой жиклёр на размер больше от {jetPilot}, проверь подсос.", parts: ["jets","intake"] }, onNo: { result: "Богато или засор", action: "Чистка карбюратора, проверка уровня в поплавковой камере.", parts: ["carbkit"] } }
  ]},
  { id: "backfire", title: "Стреляет в глушитель", icon: "💥", only: ["4t"], steps: [
    { q: "Хлопки при сбросе газа?", yes: "Да", no: "При разгоне", onYes: "next", onNo: { result: "Хлопки в карбюратор/бедно", action: "Бедная смесь или зажатые клапаны ({valveIn}/{valveEx}).", parts: ["jets","feeler"] } },
    { q: "Ставил прямоток или снимал заглушки?", yes: "Да", no: "Нет", onYes: { result: "Бедно на переходах", action: "Холостой жиклёр +2…+5 от {jetPilot}, винт качества на ½ оборота больше.", parts: ["jets"] }, onNo: { result: "Подсос в выпуске", action: "Проверь прокладку коллектора и стык банки.", parts: ["sealant"] } }
  ]},
  { id: "smoke", title: "Дымит", icon: "💨", steps: [
    { q: "Какой цвет дыма?", options: [
      { text: "Белый, густой, сладкий запах", result: { result: "Антифриз в цилиндре", action: "На жидкостном — прокладка ГБЦ или сальник помпы. На воздушнике — пар на холодную, это норма.", parts: ["headgasket","waterpump"] } },
      { text: "Чёрный, пахнет бензином", result: { result: "Богатая смесь", action: "Игла на канавку ниже, главный жиклёр меньше {jetMain}, чистый фильтр.", parts: ["jets","airfilter"] } },
      { text: "Сизый, на сбросе газа", result: { result: "Жор масла", action: "Колпачки или кольца. Масло {oil}. Замер компрессии.", parts: ["valveseals","piston"] } },
      { text: "Синий у 2T — сильно", result: { result: "Слишком жирная смесь 2T", action: "Пропорция 1:40, не больше. Проверь клапан выпуска.", parts: ["pv"] } }
    ]}
  ]},
  { id: "knock", title: "Стук и шум", icon: "⚠️", steps: [
    { q: "Где и как стучит?", options: [
      { text: "Глухой снизу, усиливается с оборотами", result: { result: "Коленвал / шатун", action: "Не заводи. Разборка и дефектовка.", parts: ["crank"] } },
      { text: "Цоканье сверху на ХХ", result: { result: "Клапанный зазор", action: "Регулировка: {valveIn} / {valveEx}.", parts: ["vcgasket","feeler"], skip2t: true } },
      { text: "Лязг на сбросе газа", result: { result: "Цепь ГРМ", action: "Цепь, натяжитель и успокоители комплектом.", parts: ["camchain","tensioner","guide"] } },
      { text: "Звон под нагрузкой в гору", result: { result: "Детонация", action: "Бензин {fuel}, свеча {spark}, проверь бедность смеси.", parts: ["spark","jets"] } },
      { text: "Перестук поршня на холодную", result: { result: "Износ поршня", action: "Замер зазора поршень–цилиндр.", parts: ["piston"] } }
    ]}
  ]},
  { id: "power", title: "Не тянет", icon: "📉", steps: [
    { q: "Когда пропадает тяга? Пик мотора — {hp} л.с.", options: [
      { text: "На низах, захлёбывается", result: { result: "Бедно на малом газе", action: "Игла выше, холостой жиклёр {jetPilot}, ХХ {idle}.", parts: ["jets"] } },
      { text: "На верхах, не крутится", result: { result: "Бедно на верхах", action: "Главный жиклёр больше {jetMain}. Проверь воздушный фильтр.", parts: ["jets","airfilter"] } },
      { text: "Везде, вяло", result: { result: "Общее падение", action: "Компрессия {compression}, клапаны, засор выпуска, тормоза не подклинивают?", parts: ["compression"] } },
      { text: "Обороты растут, скорость нет", result: { result: "Буксует сцепление", action: "Свободный ход рычага 10–15 мм, масло JASO MA.", parts: ["clutchdiscs","clutchcable"] } }
    ]}
  ]},
  { id: "overheat", title: "Перегрев", icon: "🌡", steps: [
    { q: "Уровень масла в норме? Объём {oilVol}", yes: "Да", no: "Мало", onYes: "next", onNo: { result: "Мало масла", action: "Долей до метки. Ищи утечки и сизый дым.", parts: ["oil"] } },
    { q: "Свеча светлая, белёсая?", yes: "Да", no: "Нет", onYes: { result: "Бедная смесь", action: "Игла выше, главный жиклёр больше {jetMain}.", parts: ["jets"] }, onNo: { result: "Охлаждение", action: "{cooling}: воздушник — маслорадиатор; жидкостное — вентилятор, термостат, помпа.", parts: ["oilcooler","fan","thermostat","waterpump"] } }
  ]},
  { id: "coolant", title: "Уходит антифриз", icon: "💧", only: ["liquid"], steps: [
    { q: "Есть капли под мотором у крышки помпы?", yes: "Да", no: "Нет", onYes: { result: "Сальник помпы", action: "Ремкомплект помпы. Если в масле эмульсия — менять срочно.", parts: ["waterpump","coolant"] }, onNo: "next" },
    { q: "Масло на щупе как кофе с молоком?", yes: "Да", no: "Нет", onYes: { result: "Антифриз в масле", action: "Прокладка ГБЦ или внутренний сальник помпы. Не ездить.", parts: ["headgasket","waterpump","oil"] }, onNo: { result: "Выброс через крышку", action: "Крышка радиатора, воздушная пробка.", parts: ["radcap","coolant"] } }
  ]},
  { id: "efi", title: "Горит Check (инжектор)", icon: "🖥", only: ["efi"], steps: [
    { q: "После мойки или дождя?", yes: "Да", no: "Нет", onYes: { result: "Влага в разъёмах", action: "Продуть, просушить, обработать разъёмы.", parts: ["dielectric"] }, onNo: "next" },
    { q: "Плавает холостой и провалы?", yes: "Да", no: "Нет", onYes: { result: "Дроссель / TPS", action: "Чистка дроссельного узла, проверка датчика положения, адаптация.", parts: ["tps","scanner"] }, onNo: { result: "Нужен сканер", action: "Считай коды ошибок адаптером.", parts: ["scanner"] } }
  ]},
  { id: "clutch", title: "Сцепление", icon: "✋", steps: [
    { q: "Что происходит?", options: [
      { text: "Буксует под нагрузкой", result: { result: "Износ дисков или пружин", action: "Проверь ход троса 10–15 мм. Масло без модификаторов трения.", parts: ["clutchdiscs","clutchsprings"] } },
      { text: "Ведёт — мот ползёт на нейтрали", result: { result: "Не выжимается", action: "Регулировка троса, коробление дисков.", parts: ["clutchcable","clutchdiscs"] } },
      { text: "Тугой рычаг", result: { result: "Трос", action: "Смазать или заменить трос.", parts: ["clutchcable","grease"] } }
    ]}
  ]},
  { id: "gears", title: "Передачи", icon: "⚙️", steps: [
    { q: "Как ведёт себя КПП?", options: [
      { text: "Выбивает передачу", result: { result: "Износ кулачков шестерён", action: "Разборка КПП. Не газуй без выжатого сцепления.", parts: [] } },
      { text: "Плохо ищется нейтраль", result: { result: "Сцепление ведёт", action: "Регулировка троса, свежее масло.", parts: ["clutchcable","oil"] } },
      { text: "Течёт масло у лапки", result: { result: "Сальник вала переключения", action: "Замена сальника.", parts: ["shift"] } }
    ]}
  ]},
  { id: "starter", title: "Не крутит стартер", icon: "🔋", steps: [
    { q: "Слышен щелчок реле при нажатии?", yes: "Да", no: "Нет", onYes: "next", onNo: { result: "Цепь управления", action: "Кнопка, реле, датчик сцепления/нейтрали, предохранитель.", parts: ["starterrelay"] } },
    { q: "Напряжение АКБ больше 12.4 В?", yes: "Да", no: "Нет", onYes: { result: "Стартер или бендикс", action: "Щётки, бендикс, клеммы.", parts: ["starter"] }, onNo: { result: "Разряжен АКБ", action: "Зарядить. Проверить зарядку на 5000 об/мин: 13.5–14.5 В.", parts: ["battery","regulator"] } }
  ]},
  { id: "electric", title: "Электрика", icon: "💡", steps: [
    { q: "Что не работает? Зажигание — {ignition}", options: [
      { text: "Фара тусклая или не горит", result: { result: "Свет", action: "Масса, лампа, реле-регулятор.", parts: ["headlight","regulator"] } },
      { text: "Поворотники", result: { result: "Поворотники", action: "Реле поворотов (под LED — электронное), контакты.", parts: ["flasher","turns"] } },
      { text: "АКБ садится за ночь", result: { result: "Утечка или зарядка", action: "Ток утечки < 1 мА, зарядка 13.5–14.5 В.", parts: ["regulator","stator","multimeter"] } }
    ]}
  ]},
  { id: "brakes", title: "Тормоза", icon: "🛑", steps: [
    { q: "Что с тормозом?", options: [
      { text: "Ручка проваливается", result: { result: "Воздух в системе", action: "Прокачать, замена жидкости раз в год.", parts: ["brakefluid","brakehose"] } },
      { text: "Слабо тормозит", result: { result: "Колодки", action: "Остаток накладки — минимум 1.5 мм.", parts: ["padsF","padsR"] } },
      { text: "Подклинивает", result: { result: "Поршни суппорта", action: "Переборка суппорта, чистка направляющих.", parts: ["caliperkit"] } }
    ]}
  ]},
  { id: "chain", title: "Цепь и звёзды", icon: "⛓️", steps: [
    { q: "Что видишь?", options: [
      { text: "Провис больше 35–40 мм", result: { result: "Ослабла", action: "Натянуть до 30–40 мм (эндуро — больше, чем дорожник).", parts: [] } },
      { text: "Сухая и ржавая", result: { result: "Нет смазки", action: "Чистка и смазка каждые 300–500 км и после воды.", parts: ["chainclean","chainlube"] } },
      { text: "Зубья звезды «акулий плавник»", result: { result: "Износ комплекта", action: "Цепь и звёзды меняются вместе.", parts: ["chain","sprocketF","sprocketR"] } }
    ]}
  ]},
  { id: "suspension", title: "Подвеска", icon: "🔩", steps: [
    { q: "Что беспокоит?", options: [
      { text: "Течёт масло по перу", result: { result: "Сальники", action: "Сальники + пыльники + масло.", parts: ["forkseals","forkdust","forkoil"] } },
      { text: "Пробивает до упора", result: { result: "Мягкие пружины", action: "Уровень масла, затем пружины под вес.", parts: ["forkoil","forksprings"] } },
      { text: "Стук в заднем маятнике", result: { result: "Подшипники прогрессии", action: "Обслуживание и смазка.", parts: ["linkage","grease"] } },
      { text: "Руль «щёлкает» в центре", result: { result: "Рулевые подшипники", action: "Замена подшипников.", parts: ["steering"] } }
    ]}
  ]},
  { id: "twostroke", title: "2T: потеря компрессии", icon: "🔁", only: ["2t"], steps: [
    { q: "Сколько моточасов на поршне?", options: [
      { text: "Больше 40", result: { result: "Плановая замена поршня", action: "Поршень, кольца, палец, прокладки.", parts: ["piston","basegasket"] } },
      { text: "Меньше 20", result: { result: "Лепестки или подсос", action: "Проверь лепестковый клапан и прокладки картера.", parts: ["reed","basegasket"] } }
    ]}
  ]}
];

/* --- дополнительный тюнинг --- */
TUNING.push(
  { id: "swap-z190", cat: "Двигатель", title: "Свап на Zongshen Z190", stage: 3, power: 25, price: 45000, diff: "сложно", rating: 4.6, fit: ["154FMI","YX140","1P60FMK","1P56FMJ"],
    body: "Популярный путь для питбайка: тот же формат крепления у большинства рам, заметно больше тяги.", notes: { "154FMI": "Проверь крепления мотора и длину цепи." } },
  { id: "swap-pr300", cat: "Двигатель", title: "Свап на PR300 / 4V", stage: 3, power: 25, price: 75000, diff: "сложно", rating: 4.3, fit: ["165FMM","167FMM","172FMM"],
    body: "Мотор заметно сильнее, но нужен подбор кронштейнов, проводки CDI и выпуска." },
  { id: "flywheel-l", cat: "Двигатель", title: "Облегчённый маховик", stage: 2, power: 2, price: 6500, diff: "сложно", rating: 3.9, fit: ["horiz","2t"],
    body: "Мотор резче набирает обороты, но легче глохнет в технической езде." },
  { id: "flywheel-w", cat: "Двигатель", title: "Утяжелитель маховика", stage: 2, power: 0, price: 5500, diff: "средне", rating: 4.4, fit: ["2t","NC450","NC450C"],
    body: "Мягче тяга снизу, мотор меньше глохнет на камнях и в хард-эндуро." },
  { id: "pv-spring", cat: "Двигатель", title: "Пружины клапана выпуска", stage: 1, power: 2, price: 1500, diff: "средне", rating: 4.2, fit: ["2t"],
    body: "Сдвигает момент открытия клапана: мягче низ или злее верх." },
  { id: "silencer2t", cat: "Выпуск", title: "Глушитель 2T (сайленсер)", stage: 1, power: 1, price: 7000, diff: "просто", rating: 4.2, fit: ["2t"],
    body: "Легче штатного, тише по ощущению, проще менять набивку." },
  { id: "iridium", cat: "Электроника", title: "Иридиевая свеча", stage: 1, power: 0, price: 1100, diff: "просто", rating: 4.3,
    body: "Стабильнее искра на холоде и на бедной смеси, ресурс выше." },
  { id: "coil-hp", cat: "Электроника", title: "Усиленная катушка + провод", stage: 1, power: 0, price: 2400, diff: "просто", rating: 4.0, fit: ["carb"],
    body: "Лечит пропуски искры на старых катушках. Мощности не прибавляет." },
  { id: "cdi-prog", cat: "Электроника", title: "Программируемый CDI", stage: 2, power: 4, price: 4500, diff: "сложно", rating: 4.1, fit: ["carb"],
    deny: { "2t": "Для 2T нужен свой блок с картой клапана выпуска." },
    body: "Свой угол опережения по оборотам. Только с пониманием, иначе детонация." },
  { id: "oil-temp", cat: "Охлаждение", title: "Щуп-термометр масла", stage: 1, power: 0, price: 1500, diff: "просто", rating: 4.5, fit: ["air"],
    body: "Видно, когда мотор перегревается — спасает от прогара прокладки." },
  { id: "breather", cat: "Защита", title: "Вынос сапунов наверх (броды)", stage: 1, power: 0, price: 600, diff: "просто", rating: 4.7,
    body: "Карбюратор, бак и картер не хлебнут воды на броду." },
  { id: "snorkel", cat: "Впуск", title: "Защита фильтра от воды и грязи", stage: 1, power: 0, price: 1200, diff: "просто", rating: 4.4,
    body: "Чехол-предфильтр и герметизация крышки airbox." },
  { id: "heatshield", cat: "Выпуск", title: "Термозащита глушителя", stage: 1, power: 0, price: 1500, diff: "просто", rating: 4.3,
    body: "Не плавится пластик и штаны." },
  { id: "hourmeter", cat: "Электрика", title: "Счётчик моточасов", stage: 1, power: 0, price: 1300, diff: "просто", rating: 4.6,
    notes: { "2t": "Для 2T обязателен: всё ТО идёт по моточасам." },
    body: "ТО по моточасам вместо километров — точнее для эндуро." },
  { id: "usb", cat: "Электрика", title: "USB-зарядка на руль", stage: 1, power: 0, price: 900, diff: "просто", rating: 4.4,
    notes: { "small": "Проверь мощность генератора." }, body: "Телефон с навигатором не сядет в лесу." },
  { id: "mousse", cat: "Колёса", title: "Мусс вместо камеры", stage: 1, power: 0, price: 13500, diff: "средне", rating: 4.6, fit: ["big"],
    body: "Не бывает проколов, можно ехать на низком «давлении». Тяжелее и дороже." },
  { id: "rimlock", cat: "Колёса", title: "Бортзамки", stage: 1, power: 0, price: 1800, diff: "средне", rating: 4.6, fit: ["big"],
    body: "Покрышка не проворачивается на низком давлении, не отрывает ниппель." },
  { id: "tires", cat: "Колёса", title: "Эндуро-покрышки (шипы, мягкая смесь)", stage: 1, power: 0, price: 10000, diff: "средне", rating: 4.8,
    body: "Самая заметная разница в грязи после мастерства райдера." },
  { id: "rear-sp", cat: "Трансмиссия", title: "Задняя звезда +2 зуба", stage: 1, power: 0, price: 1500, diff: "просто", rating: 4.5,
    body: "Тяга в лесу без замены передней звезды." },
  { id: "levers", cat: "Управление", title: "Складные рычаги", stage: 1, power: 0, price: 2200, diff: "просто", rating: 4.6,
    body: "Не ломаются при падении — домой доедешь." },
  { id: "fatbar", cat: "Управление", title: "Руль 28.6 мм + адаптеры", stage: 1, power: 0, price: 3500, diff: "средне", rating: 4.5, fit: ["big"],
    body: "Крепче и удобнее штатного 22 мм, выбор изгибов." },
  { id: "pegs", cat: "Управление", title: "Широкие подножки", stage: 1, power: 0, price: 2800, diff: "просто", rating: 4.6,
    body: "Нога не соскальзывает стоя." },
  { id: "damper", cat: "Управление", title: "Рулевой демпфер", stage: 2, power: 0, price: 15000, diff: "средне", rating: 4.5, fit: ["big"],
    body: "Убирает вырывание руля на камнях и скорости." },
  { id: "fork-cart", cat: "Подвеска", title: "Картриджи вилки с регулировками", stage: 2, power: 0, price: 25000, diff: "сложно", rating: 4.5, fit: ["big"],
    body: "Отдельная настройка сжатия и отбоя." },
  { id: "shock-adj", cat: "Подвеска", title: "Амортизатор с регулировками", stage: 2, power: 0, price: 18000, diff: "средне", rating: 4.5, fit: ["big"],
    body: "Подбор под вес и стиль, лучше держит колею." },
  { id: "revalve", cat: "Подвеска", title: "Перешивка подвески под вес", stage: 2, power: 0, price: 6000, diff: "сложно", rating: 4.7, fit: ["big"],
    body: "Подбор пружин и клапанов мастером — самый правильный путь." },
  { id: "bigdisc", cat: "Тормоза", title: "Увеличенный передний диск 270 мм", stage: 2, power: 0, price: 5500, diff: "средне", rating: 4.4, fit: ["big"],
    body: "Тормозит сильнее одним пальцем. Нужен переходник суппорта." },
  { id: "aux-light", cat: "Электрика", title: "Дополнительная LED-фара", stage: 1, power: 0, price: 2500, diff: "просто", rating: 4.3, fit: ["big"],
    body: "Для вечерних выездов по лесу." },
  { id: "frameguard", cat: "Защита", title: "Защита рамы и маятника", stage: 1, power: 0, price: 4000, diff: "просто", rating: 4.5, fit: ["big"],
    body: "Ботинки не протирают раму и маятник." }
);

/* --- дополнительная диагностика --- */
DIAG.push(
  { id: "plug", title: "Цвет свечи", icon: "🔍", steps: [
    { q: "Выкрути свечу {spark} после поездки (не на холостых). Какой нагар?", options: [
      { text: "Светло-коричневый, сухой", result: { result: "Смесь в норме", action: "Мотор настроен правильно. Зазор {gap}, затяжка {sparkTorque}.", parts: [] } },
      { text: "Чёрный, бархатный", result: { result: "Богатая смесь", action: "Игла ниже на канавку, главный жиклёр меньше {jetMain}, проверь воздушный фильтр и подсос.", parts: ["jets","airfilter"] } },
      { text: "Белый или серо-белый", result: { result: "Бедная смесь — опасно", action: "Мотор перегревается. Главный жиклёр больше {jetMain}, игла выше, ищи подсос воздуха.", parts: ["jets","intake"] } },
      { text: "Чёрный, мокрый маслом", result: { result: "Масло в цилиндре", action: "Колпачки, кольца или 2T — слишком жирная смесь. Замер компрессии.", parts: ["valveseals","rings","compression"] } },
      { text: "Оплавлен электрод", result: { result: "Калильное зажигание", action: "Перегрев, бедная смесь или неверное калильное число. Не ездить до выяснения.", parts: ["spark","jets"] } }
    ]}
  ]},
  { id: "stall-gear", title: "Глохнет при включении передачи", icon: "🦶", steps: [
    { q: "Боковая подножка опущена?", yes: "Да", no: "Нет", onYes: { result: "Сработал датчик подножки", action: "Подними подножку. Если глохнет и с поднятой — датчик или проводка.", parts: ["sidestand"] }, onNo: "next" },
    { q: "Глохнет, даже если выжать сцепление?", yes: "Да", no: "Нет", onYes: { result: "Ведёт сцепление", action: "Трос сцепления, свободный ход 10–15 мм, коробление дисков.", parts: ["clutchcable","clutchdiscs"] }, onNo: { result: "Низкие холостые обороты", action: "Выставь холостой ход {idle} на прогретом моторе.", parts: [] } }
  ]},
  { id: "hesitate", title: "Провал при резком газе", icon: "⤵️", only: ["carb"], steps: [
    { q: "Провал сразу после резкого открытия, потом едет?", yes: "Да", no: "Нет", onYes: "next", onNo: { result: "Не переходный режим", action: "Смотри «Не тянет» — проблема в главной системе.", parts: [] } },
    { q: "У карбюратора есть ускорительный насос (PWK/PE с насосом)?", yes: "Есть", no: "Нет", onYes: { result: "Ускорительный насос", action: "Проверь впрыск насоса при резком газе (видно струйку), почисти клапан, подрегулируй ход.", parts: ["carbkit"] }, onNo: { result: "Бедно на переходе", action: "Игла на канавку выше, холостой жиклёр {jetPilot} на размер больше.", parts: ["jets","needle"] } }
  ]},
  { id: "flooding", title: "Карбюратор переливает", icon: "⛽", only: ["carb"], steps: [
    { q: "Бензин капает из дренажа или пахнет в гараже?", yes: "Да", no: "Нет", onYes: "next", onNo: { result: "Не перелив", action: "Ищи другую причину запаха: шланги, бензокран.", parts: ["fuelhose"] } },
    { q: "Перелив и при закрытом кране?", yes: "Да", no: "Нет", onYes: { result: "Течь шланга или крана", action: "Замени шланг или бензокран.", parts: ["fuelhose","petcock"] }, onNo: { result: "Игольчатый клапан или поплавок", action: "Почисти седло, замени игольчатый клапан, выставь уровень поплавка.", parts: ["floatvalve","carbkit"] } }
  ]},
  { id: "fuel-use", title: "Большой расход топлива", icon: "📈", steps: [
    { q: "Свеча чёрная, бархатная?", yes: "Да", no: "Нет", onYes: { result: "Богатая смесь", action: "Воздушный фильтр, подсос не закрывается, игла, уровень поплавка.", parts: ["airfilter","floatvalve"] }, onNo: "next" },
    { q: "Тормоза или цепь подклинивают — колесо крутится туго?", yes: "Да", no: "Нет", onYes: { result: "Механическое сопротивление", action: "Суппорт, натяжение цепи, подшипники колёс.", parts: ["caliperkit","wheelbearing"] }, onNo: { result: "Стиль езды и давление в шинах", action: "Езда на высоких оборотах и низкое давление в шинах на асфальте — тоже причина.", parts: ["tiregauge"] } }
  ]},
  { id: "leak", title: "Течёт масло", icon: "🛢", steps: [
    { q: "Где течёт?", options: [
      { text: "Под головкой/крышкой клапанов", result: { result: "Прокладка крышки или ГБЦ", action: "Начни с прокладки крышки клапанов; если течёт ниже — ГБЦ.", parts: ["vcgasket","headgasket"] } },
      { text: "У передней звезды", result: { result: "Сальник вторичного вала", action: "Замена сальника, проверь люфт вала.", parts: ["engseals"] } },
      { text: "У лапки КПП", result: { result: "Сальник вала переключения", action: "Дешёвый сальник, меняется без разборки мотора.", parts: ["shift"] } },
      { text: "Сливная пробка", result: { result: "Шайба пробки", action: "Новая медная шайба, не перетягивай.", parts: ["drainplug"] } },
      { text: "Из сапуна", result: { result: "Перелив масла или прорыв газов", action: "Уровень масла; если в норме — износ колец.", parts: ["breather","rings"] } }
    ]}
  ]},
  { id: "vibration", title: "Сильная вибрация", icon: "📳", steps: [
    { q: "Вибрация появилась после ремонта мотора?", yes: "Да", no: "Нет", onYes: { result: "Метки балансира или крепёж", action: "Проверь установку меток балансира и затяжку болтов мотора.", parts: [] }, onNo: "next" },
    { q: "Ощущается на определённой скорости, а не оборотах?", yes: "Да", no: "Нет", onYes: { result: "Колесо или цепь", action: "Подшипники колёс, восьмёрка, натяжение и износ цепи.", parts: ["wheelbearing","chain"] }, onNo: { result: "Крепление мотора/подножек", action: "Протяни крепёж мотора, подножек, руля. Проверь подушки бака.", parts: ["loctite"] } }
  ]},
  { id: "fan", title: "Не включается вентилятор", icon: "🌀", only: ["liquid"], steps: [
    { q: "Вентилятор крутится, если подать 12 В напрямую?", yes: "Да", no: "Нет", onYes: "next", onNo: { result: "Сам вентилятор", action: "Замени вентилятор.", parts: ["fan"] } },
    { q: "Предохранитель цел?", yes: "Да", no: "Нет", onYes: { result: "Датчик или реле", action: "Датчик включения вентилятора на радиаторе/головке или реле.", parts: ["fansensor"] }, onNo: { result: "Предохранитель", action: "Замени и ищи замыкание в проводке вентилятора.", parts: ["fuse"] } }
  ]},
  { id: "kick", title: "Проскальзывает кикстартер", icon: "🦵", steps: [
    { q: "Кик проваливается без сопротивления?", yes: "Да", no: "Нет", onYes: { result: "Храповик кикстартера", action: "Ремкомплект храповика и пружины. Разбирается правая крышка.", parts: ["kickkit"] }, onNo: { result: "Кик не возвращается", action: "Возвратная пружина кика.", parts: ["kickkit"] } }
  ]},
  { id: "noneutral", title: "Не горит нейтраль", icon: "🅽", steps: [
    { q: "Мотор заводится на нейтрали, но лампа не горит?", yes: "Да", no: "Нет", onYes: { result: "Датчик нейтрали или лампа", action: "Проверь провод на датчике (под звездой), сам датчик и лампу.", parts: ["neutral"] }, onNo: { result: "Не находится нейтраль", action: "Регулировка сцепления, фиксатор КПП.", parts: ["clutchcable"] } }
  ]},
  { id: "gearnoise", title: "Шум в КПП", icon: "🔊", steps: [
    { q: "Шум пропадает, если выжать сцепление?", yes: "Да", no: "Нет", onYes: { result: "КПП или подшипники валов", action: "Свежее масло, затем разборка картера. Не затягивай.", parts: ["oil"] }, onNo: { result: "Сцепление/первичная передача", action: "Люфт корзины сцепления, демпферные пружины.", parts: ["clutchdiscs"] } }
  ]},
  { id: "water", title: "Мотор хлебнул воды", icon: "🌊", steps: [
    { q: "Мотор заглох на броду?", yes: "Да", no: "Нет", onYes: { result: "Не заводи сразу!", action: "Выкрути свечу, слей воду из фильтра и airbox, прокрути мотор без свечи. Проверь масло — если мутное, сразу замена.", parts: ["spark","oil","airfilter"] }, onNo: { result: "Вода в масле", action: "Мутное масло — замена 2 раза подряд, проверь сапуны.", parts: ["oil","breather"] } }
  ]}
);
/* ===== КАРБЮРАТОРЫ — типовые стартовые жиклёры (подбор по свече!) ===== */
var CARBS = [
  { id: "pz19", name: "PZ19", mm: 19, main: "75–90", pilot: "35", needle: "3 канавка" },
  { id: "pz22", name: "PZ22", mm: 22, main: "90–100", pilot: "35–38", needle: "3 канавка" },
  { id: "pe22", name: "PE22", mm: 22, main: "92–102", pilot: "35–38", needle: "3 канавка" },
  { id: "pe24", name: "PE24", mm: 24, main: "100–110", pilot: "38", needle: "3 канавка" },
  { id: "pz26", name: "PZ26", mm: 26, main: "105–115", pilot: "38", needle: "3 канавка" },
  { id: "pe26", name: "PE26 / NIBBI PE26", mm: 26, main: "105–115", pilot: "38", needle: "3 канавка" },
  { id: "pz27", name: "PZ27", mm: 27, main: "110–118", pilot: "38–40", needle: "3 канавка" },
  { id: "pe28", name: "PE28 / NIBBI PE28", mm: 28, main: "112–120", pilot: "40", needle: "3 канавка" },
  { id: "pwk28", name: "PWK28", mm: 28, main: "112–120", pilot: "38–40", needle: "3 канавка" },
  { id: "pz30", name: "PZ30", mm: 30, main: "112–120", pilot: "38–40", needle: "3 канавка" },
  { id: "pe30", name: "PE30", mm: 30, main: "115–125", pilot: "40", needle: "3 канавка" },
  { id: "nibbi-pe30", name: "NIBBI PE30 Racing", mm: 30, main: "115–125", pilot: "40–42", needle: "3 канавка" },
  { id: "pwk30", name: "PWK30", mm: 30, main: "118–125", pilot: "40", needle: "3 канавка" },
  { id: "pwk32", name: "PWK32", mm: 32, main: "125–135", pilot: "40–42", needle: "3 канавка" },
  { id: "pe34", name: "NIBBI PE34", mm: 34, main: "135–145", pilot: "42", needle: "3 канавка" },
  { id: "pwk34", name: "PWK34", mm: 34, main: "135–145", pilot: "42–45", needle: "3–4 канавка" },
  { id: "nibbi34", name: "NIBBI Racing 34", mm: 34, main: "135–148", pilot: "42–45", needle: "3–4 канавка" },
  { id: "pwk36", name: "PWK36", mm: 36, main: "150–165", pilot: "40–42", needle: "3 канавка" },
  { id: "pwk38", name: "PWK38 / PWN38", mm: 38, main: "160–175", pilot: "40–45", needle: "3–4 канавка" },
  { id: "fcr", name: "Keihin FCR-клон 37", mm: 37, main: "155–170", pilot: "40–42", needle: "3 канавка" },
  { id: "custom", name: "Другой — вписать вручную", mm: 0, main: "", pilot: "", needle: "" }
];

/* Разумный диаметр диффузора для мотора, мм */
function carbRange(e) {
  if (e.groups.indexOf("efi") >= 0) return null;
  if (e.groups.indexOf("2t") >= 0) return [34, 38];
  if (e.cc <= 60) return [16, 19];
  if (e.cc <= 130) return [19, 24];
  if (e.cc <= 170) return [24, 28];
  if (e.cc <= 235) return [26, 30];
  if (e.cc >= 400) return [36, 40];
  if (e.groups.indexOf("dohc") >= 0) return [32, 36];
  if (e.cc > 260 || e.groups.indexOf("zs4v") >= 0) return [30, 34];
  return [27, 32];
}

/* Пункты ТО с учётом пробега */
function maintItems(e) {
  if (e.hours) return [
    { id: "air", t: "Воздушный фильтр", every: 2 },
    { id: "gear", t: "Масло КПП", every: 15 },
    { id: "spark", t: "Свеча", every: 15 },
    { id: "reed", t: "Лепестковый клапан", every: 30 },
    { id: "pv", t: "Клапан выпуска", every: 40 },
    { id: "piston", t: "Поршень и кольца", every: e.cc > 270 ? 50 : 40 }
  ];
  var r = [
    { id: "oil", t: "Масло и фильтр", every: e.oilInt || 1500 },
    { id: "air", t: "Воздушный фильтр", every: 500 },
    { id: "chain", t: "Смазка цепи", every: 500 },
    { id: "valves", t: "Клапаны", every: e.valveInt || 3000 },
    { id: "spark", t: "Свеча", every: 6000 },
    { id: "fork", t: "Масло в вилке", every: 5000 },
    { id: "camchain", t: "Цепь ГРМ — осмотр", every: 9000 }
  ];
  /* у 2T нет клапанов и ГРМ; valveInt: 0 — гидрокомпенсаторы, регулировать не нужно; ГРМ шестернями или ремнём — без цепи */
  r = r.filter(function (x) {
    if (x.id === "valves") return e.stroke !== "2T" && e.valveInt !== 0;
    if (x.id === "camchain") return e.stroke !== "2T" && !/Шестерн|шестерн|Ремень|ремень|Вал|вал/.test(e.timing || "");
    return true;
  });
  if (e.groups.indexOf("liquid") >= 0) r.push({ id: "coolant", t: "Антифриз", every: 10000 });
  return r;
}

/* ===== УЗЛЫ ДВИГАТЕЛЯ (для интерактивной схемы) ===== */
var AREAS = {
  head:    { t: "Головка и клапаны", kinds: ["valvein","valveex","vcgasket","valveseals","shims","adjscrews","camshaft","head"], diag: ["knock","backfire","start"], guides: ["valves","valves-dohc"],
             spec: [["Схема","cam"],["Клапан впуск","valveIn"],["Клапан выпуск","valveEx"]], re: /клапан|ГБЦ|распред|коромысл|головк/i },
  spark:   { t: "Зажигание", kinds: ["spark","sparkcap","htlead","coil","cdi","pickup"], diag: ["start","plug","hot"], guides: ["spark"],
             spec: [["Свеча","spark"],["Зазор","gap"],["Затяжка свечи","sparkTorque"],["Зажигание","ignition"]], re: /свеч|CDI|зажиган|искр|катушк|детонац/i },
  carb:    { t: "Питание", kinds: ["carb","carbkit","jets","needle","floatvalve","intake","fuelpump","injector","tps"], diag: ["cold","idle","power","hesitate","flooding","efi"], guides: ["carb-tune","carb-clean","efi-clean"],
             spec: [["Карбюратор","carb"],["Главный жиклёр","jetMain"],["Холостой жиклёр","jetPilot"],["Игла","needle"],["Холостой ход","idle"]], re: /карб|смес|бедн|богат|жикл|форсун|насос|дросс|PWK|PZ|PE|холост/i },
  cyl:     { t: "Цилиндр и поршень", kinds: ["piston","rings","cylinder","basegasket","headgasket"], diag: ["smoke","knock","twostroke","start"], guides: ["compression","piston2t"],
             spec: [["Объём","cc"],["Компрессия","compression"],["Топливо","fuel"]], re: /поршн|ЦПГ|кольц|цилиндр|компресс|прокладк[аи] ГБЦ/i },
  timing:  { t: "Цепь ГРМ", kinds: ["camchain","tensioner","guide","pushrod"], diag: ["knock"], guides: ["camchain"],
             spec: [["Привод","timing"]], re: /цепь ГРМ|натяжит|толкат|штанг|успокоит/i },
  clutch:  { t: "Сцепление и кик", kinds: ["clutchdiscs","clutchsprings","clutchcable","kickkit","clutchholder"], diag: ["clutch","stall-gear","kick","gearnoise"], guides: ["clutch-cable","clutch-replace"],
             spec: [["КПП","gearbox"],["Запуск","start"]], re: /сцеплен|кик/i },
  gen:     { t: "Генератор и стартер", kinds: ["stator","regulator","starter","starterrelay","battery","puller"], diag: ["starter","electric"], guides: ["charging"],
             spec: [["Запуск","start"],["Зажигание","ignition"]], re: /генерат|стартер|бендикс|АКБ|аккумул|зарядк/i },
  oil:     { t: "Масло и смазка", kinds: ["oil","oilfilter","drainplug","oilcooler","gearoil","oilpump"], diag: ["overheat","leak"], guides: ["oil"],
             spec: [["Масло","oil"],["Объём","oilVol"]], re: /масл/i },
  gearbox: { t: "КПП и звезда", kinds: ["sprocketF","sprocketR","chain","shift","neutral","engseals"], diag: ["gears","chain","noneutral","gearnoise"], guides: ["chain","chain-replace"],
             spec: [["КПП","gearbox"]], re: /КПП|передач|звезд|нейтрал/i },
  exhaust: { t: "Выпуск", kinds: ["exgasket","exstuds","header","muffler","expack","pv","pipe2t"], diag: ["backfire","smoke"], guides: ["exhaust"],
             spec: [["Схема","stroke"]], re: /выпуск|глушит|коллектор|шпильк|клапан выпуска/i },
  cooling: { t: "Охлаждение", kinds: ["coolant","waterpump","thermostat","radcap","fan","coolhoses","oilcooler","oiltemp"], diag: ["overheat","coolant","fan"], guides: ["coolant"],
             spec: [["Охлаждение","cooling"],["Антифриз","coolant"]], re: /перегрев|помп|антифриз|вентилят|термостат|радиатор/i }
};

/* ===== ИНСТРУКЦИИ ПО РЕМОНТУ ===== */
var GUIDES = [
  { id: "oil", title: "Замена масла и фильтра", area: "oil", time: "30 мин", diff: "просто", only: ["4t"],
    tools: ["Ключ на сливную пробку", "Ёмкость 2 л", "Воронка", "Новая шайба пробки"], parts: ["oil","oilfilter","drainplug"],
    steps: ["Прогрей мотор 3–5 минут — тёплое масло сливается полностью.", "Поставь мотоцикл ровно, открути крышку заливной горловины.", "Открути сливную пробку, слей масло. Осмотри магнит пробки: мелкая пыль — норма, крупная стружка — повод для диагностики.", "Сними и промой сетку/замени бумажный фильтр.", "Поставь пробку с новой шайбой. Затяжка умеренная (около 20–25 Н·м) — резьба в алюминии.", "Залей {oil} — {oilVol}. Заведи на минуту, заглуши, проверь уровень через 2–3 минуты.", "Отметь замену в разделе «ТО и пробег»."] },
  { id: "valves", title: "Регулировка клапанов (винты)", area: "head", time: "1–1.5 ч", diff: "средне", only: ["horiz","cg","cb"],
    tools: ["Набор щупов", "Ключ на гайки регулировки", "Отвёртка/ключ регулировки", "Свечной ключ"], parts: ["vcgasket","feeler"],
    steps: ["Только на холодном моторе — не раньше чем через 3–4 часа после поездки.", "Сними крышки клапанов, выкрути свечу {spark} — проворачивать будет легче.", "Сними заглушку на крышке генератора, поворачивай коленвал по ходу, пока метка «T» не совпадёт с риской.", "Убедись, что поршень в ВМТ такта сжатия: оба коромысла имеют люфт. Если нет — ещё один оборот.", "Впуск: щуп {valveIn} должен проходить с лёгким закусыванием. Выпуск: {valveEx}.", "Ослабь контргайку, выставь зазор винтом, держа винт, затяни гайку и перепроверь щупом.", "Поставь крышки на новые уплотнения, заверни свечу ({sparkTorque})."] },
  { id: "valves-dohc", title: "Проверка клапанов (DOHC, шайбы)", area: "head", time: "2–4 ч", diff: "сложно", only: ["dohc","CBS300"],
    tools: ["Набор щупов", "Микрометр", "Набор шайб", "Магнит", "Динамометрический ключ"], parts: ["shims","vcgasket"],
    steps: ["Мотор полностью холодный. Сними бак, сиденье, крышку головки.", "Выставь ВМТ такта сжатия по меткам на маховике и шестернях распредвалов.", "Замерь все зазоры: впуск {valveIn}, выпуск {valveEx}. Запиши каждое значение.", "Если всё в допуске — собирай. Если нет — нужно снимать распредвалы.", "Сними натяжитель цепи, распредвалы (равномерно, по пол-оборота крышки постелей).", "Вынь шайбу магнитом, замерь микрометром, рассчитай новую: новая = старая + (замер − норма).", "Собери строго по меткам, затяни крышки постелей по мануалу, проверни мотор рукой 2 оборота и перепроверь метки и зазоры.", "Если нет щупов и микрометра — лучше в сервис: ошибка здесь стоит головки."] },
  { id: "carb-tune", title: "Настройка карбюратора по свече", area: "carb", time: "1–2 ч", diff: "средне", only: ["carb"],
    tools: ["Набор жиклёров", "Отвёртки для карбюратора", "Свечной ключ", "Новая свеча"], parts: ["jets","needle","spark"],
    steps: ["Начни с исправного: чистый фильтр, нет подсоса, клапаны в норме ({valveIn}/{valveEx}).", "Холостой ход: прогретый мотор, винт качества закрути до упора и открой на 1.5–2 оборота. Ищи максимум оборотов, затем упорным винтом выстави {idle}.", "Середина (¼–¾ газа) — игла. Сейчас: {needle}. Провалы и белая свеча — игла выше (клипса ниже); чёрная свеча и «вата» — игла ниже.", "Верха (полный газ) — главный жиклёр. Сейчас: {jetMain}. Разгон на полном газу 10–15 с, глуши сразу кнопкой, смотри свечу.", "Цвет свечи: светло-коричневый — норма, белый — бедно (жиклёр больше), чёрный бархат — богато (меньше).", "Меняй один параметр за раз и записывай. Новые значения внеси в «Мой мот → Изменить»."] },
  { id: "carb-clean", title: "Чистка карбюратора", area: "carb", time: "1–2 ч", diff: "средне", only: ["carb"],
    tools: ["Очиститель карбюратора", "Компрессор или баллон воздуха", "Отвёртки", "Ремкомплект"], parts: ["carbcleaner","carbkit"],
    steps: ["Перекрой кран, слей бензин из поплавковой камеры дренажным винтом.", "Сними карбюратор: хомуты патрубков, трос газа (запомни положение), трос подсоса.", "Сними поплавковую камеру, выкрути жиклёры, иглу и распылитель. Запомни число оборотов винта качества.", "Промой все каналы очистителем и продуй воздухом. Проволокой жиклёры не чистить — разобьёшь калибровку.", "Проверь игольчатый клапан и седло, уровень поплавка.", "Собери на новых уплотнениях, выставь винт качества как было, проверь ход газа."] },
  { id: "efi-clean", title: "Чистка дросселя и адаптация (EFI)", area: "carb", time: "1 ч", diff: "средне", only: ["efi"],
    tools: ["Очиститель дросселя", "Адаптер диагностики"], parts: ["scanner"],
    steps: ["Сними патрубок от фильтра к дроссельному узлу при выключенном зажигании.", "Открой заслонку рукой и протри нагар очистителем. На датчики не лей.", "Собери, включи зажигание на 10 с без запуска, выключи — так проходит базовая адаптация.", "Заведи и дай поработать на холостых 3–5 минут без газа.", "Если горит Check — считай коды адаптером (раздел «Коды EFI»)."] },
  { id: "spark", title: "Проверка и замена свечи", area: "spark", time: "15 мин", diff: "просто",
    tools: ["Свечной ключ", "Щуп для зазора"], parts: ["spark","sparkcap"],
    steps: ["Мотор холодный. Продуй колодец свечи от песка, сними колпачок.", "Выкрути свечу, оцени нагар (диагностика «Цвет свечи»).", "Новая свеча: {spark}, зазор {gap} — проверь щупом.", "Заверни рукой до упора, дотяни ключом ({sparkTorque}).", "Надень колпачок до щелчка."] },
  { id: "compression", title: "Замер компрессии", area: "cyl", time: "20 мин", diff: "просто",
    tools: ["Компрессометр с резьбой под свечу", "Свечной ключ"], parts: ["compression"],
    steps: ["Прогрей мотор, заглуши, выкрути свечу.", "Вкрути компрессометр, газ полностью открыт.", "Крути стартером/киком 5–8 раз до стабилизации стрелки.", "Норма для этого мотора: {compression}.", "Ниже нормы: капни 5 мл масла в цилиндр и замерь снова. Выросла — кольца, не изменилась — клапаны или прокладка ГБЦ."] },
  { id: "piston2t", title: "Замена поршня 2T", area: "cyl", time: "2–3 ч", diff: "сложно", only: ["2t"],
    tools: ["Динамометрический ключ", "Съёмник пальца", "Щупы", "Шабер пластиковый"], parts: ["piston","basegasket","headgasket"],
    steps: ["Слей антифриз, сними выпускную трубу и карбюратор.", "Сними головку и цилиндр, закрой картер чистой тряпкой.", "Сними стопорные кольца и палец, старый поршень.", "Проверь цилиндр: задиры, износ покрытия. Замерь зазор колец в цилиндре.", "Поставь новый поршень стрелкой к выпуску, новые стопоры, смажь маслом 2T.", "Собери на новых прокладках, затяни гайки цилиндра и головки крест-накрест.", "Обкатка 1 моточас: плавно, без полного газа."] },
  { id: "camchain", title: "Проверка цепи ГРМ и натяжителя", area: "timing", time: "1–2 ч", diff: "средне", only: ["4t"],
    tools: ["Ключи", "Отвёртка"], parts: ["camchain","tensioner","guide"],
    steps: ["Признак износа — лязг на холостых и при сбросе газа.", "Выкрути болт-заглушку натяжителя и посмотри ход штока: если он почти на максимуме — цепь вытянута.", "Проверь успокоители на трещины через смотровое окно головки.", "Цепь, натяжитель и успокоители меняются комплектом. Метки ГРМ выставляются по мануалу — при ошибке встреча клапанов с поршнем."] },
  { id: "clutch-cable", title: "Регулировка троса сцепления", area: "clutch", time: "10 мин", diff: "просто",
    tools: ["Ключ на гайки троса"], parts: ["clutchcable","grease"],
    steps: ["Свободный ход на конце рычага — 10–15 мм.", "Мелко регулируй барабаном у рычага, крупно — гайками у мотора.", "После регулировки — нейтраль ищется на месте, а сцепление не буксует под нагрузкой.", "Тугой рычаг — смажь трос или замени."] },
  { id: "clutch-replace", title: "Замена дисков сцепления", area: "clutch", time: "2 ч", diff: "средне",
    tools: ["Ключи", "Держатель корзины", "Новая прокладка крышки"], parts: ["clutchdiscs","clutchsprings"],
    steps: ["Слей масло, сними тормозную педаль/кик, если мешают.", "Сними правую крышку, ослабь болты пружин крест-накрест.", "Вынь диски, замерь толщину фрикционов и кривизну стальных.", "Новые фрикционы замочи в масле на 10 минут.", "Собери в том же порядке, затяни болты пружин крест-накрест, поставь крышку на новую прокладку.", "Залей {oil}, отрегулируй трос."] },
  { id: "charging", title: "Проверка зарядки", area: "gen", time: "30 мин", diff: "средне",
    tools: ["Мультиметр"], parts: ["regulator","stator","battery"],
    steps: ["Заряженный АКБ без нагрузки: 12.6–12.9 В.", "Заведи мотор, обороты около 5000: на АКБ должно быть 13.5–14.5 В.", "Меньше 13 В — проверь разъём реле-регулятора (часто окислен или оплавлен).", "Больше 15 В — реле-регулятор неисправен, АКБ «закипит».", "Статор: сопротивление между жёлтыми проводами около 0.5–1 Ом, и ни один не замкнут на массу."] },
  { id: "chain", title: "Натяжка и смазка цепи", area: "gearbox", time: "20 мин", diff: "просто",
    tools: ["Ключ на гайку оси", "Ключи натяжителей", "Щётка"], parts: ["chainlube","chainclean"],
    steps: ["Мотоцикл на подставке, передача нейтраль.", "Провис в самом тугом месте: эндуро 30–40 мм, питбайк 25–35 мм.", "Ослабь гайку оси, натяжителями выставь одинаково по меткам слева и справа.", "Затяни гайку оси, перепроверь провис.", "Очисти цепь щёткой, смажь по внутренней стороне роликов и дай впитаться 10 минут."] },
  { id: "chain-replace", title: "Замена цепи и звёзд", area: "gearbox", time: "1–1.5 ч", diff: "средне",
    tools: ["Выжимка цепи", "Ключи", "Фиксатор резьбы"], parts: ["chain","sprocketF","sprocketR","chainlock"],
    steps: ["Меняй комплектом: цепь и обе звезды. Новая цепь на старых звёздах быстро вытянется.", "Сними старую цепь через замок или выжимкой.", "Переднюю звезду держи включённой передачей и тормозом.", "Болты задней звезды — на фиксатор, затяжка крест-накрест.", "Укороти цепь по старой, замок разрезной открытой стороной против хода.", "Натяни цепь и смажь."] },
  { id: "brakes-bleed", title: "Прокачка тормозов", area: null, time: "30 мин", diff: "средне",
    tools: ["Ключ на штуцер", "Прозрачный шланг", "Шприц"], parts: ["brakefluid","bleeder"],
    steps: ["Открой бачок, долей свежую DOT-4. Не допускай попадания на пластик и краску.", "Надень шланг на штуцер суппорта, конец в банку с жидкостью.", "Нажми рычаг, держи, ослабь штуцер на четверть оборота, закрой, отпусти рычаг.", "Повторяй, пока из шланга не пойдёт жидкость без пузырей. Следи за уровнем в бачке.", "Ручка должна быть упругой. Перед поездкой проверь тормоз на месте."] },
  { id: "pads", title: "Замена тормозных колодок", area: null, time: "20 мин", diff: "просто",
    tools: ["Ключи", "Очиститель тормозов"], parts: ["padsF","padsR","brakecleaner"],
    steps: ["Остаток накладки меньше 1.5 мм — меняй.", "Выкрути палец колодок, вынь старые.", "Утопи поршни суппорта, следи, чтобы бачок не переполнился.", "Поставь новые колодки и пластину, палец на фиксатор.", "Несколько раз нажми рычаг до упругости, обкатай колодки плавными торможениями."] },
  { id: "forkseals", title: "Замена сальников вилки", area: null, time: "2–3 ч", diff: "средне",
    tools: ["Оправка для сальников", "Ключи", "Мерный стакан"], parts: ["forkseals","forkdust","forkoil"],
    steps: ["Сними колесо, ослабь верхние траверсы и пробки перьев.", "Сними перо, слей масло, разбери пыльник, стопор и сальник.", "Почисти трубу: забоины и ржавчина — причина повторной течи.", "Новый сальник смажь маслом, запрессуй оправкой до канавки стопора.", "Залей масло вилки по уровню из мануала, обе стороны одинаково."] },
  { id: "coolant", title: "Замена антифриза", area: "cooling", time: "40 мин", diff: "средне", only: ["liquid"],
    tools: ["Ключ на сливной болт помпы", "Воронка"], parts: ["coolant","radcap"],
    steps: ["Только на холодном моторе — горячая система под давлением.", "Открой крышку радиатора, открути сливной болт на крышке помпы.", "Промой систему водой при необходимости.", "Залей антифриз ({coolant}) медленно, покачивая мотоцикл.", "Заведи без крышки, дай поработать до открытия термостата, долей, закрой крышку.", "После поездки на холодную проверь уровень в бачке."] },
  { id: "exhaust", title: "Замена прокладки выпуска", area: "exhaust", time: "30 мин", diff: "просто", only: ["4t"],
    tools: ["Ключи", "Медная смазка"], parts: ["exgasket","exstuds","copper"],
    steps: ["Признак — стрекот и копоть у головки, хлопки при сбросе газа.", "Сними гайки коллектора на холодном моторе, обработай резьбу проникающей смазкой.", "Вынь старое кольцо, поставь новое.", "Резьбу шпилек смажь медной смазкой, затягивай гайки поочерёдно без перетяга."] },
  { id: "airfilter", title: "Обслуживание воздушного фильтра", area: "carb", time: "30 мин", diff: "просто",
    tools: ["Средство для промывки", "Пропитка", "Перчатки"], parts: ["airfilter","filteroil","filterclean"],
    steps: ["Сними фильтр, закрой воздуховод чистой тряпкой.", "Промой поролон средством или мыльной водой, не выкручивай — отжимай.", "Высуши полностью.", "Пропитай маслом для фильтров равномерно, отожми излишки.", "Смажь кромку литолом для герметичности и поставь на место."] },
  { id: "winter", title: "Консервация на зиму", area: null, time: "1 ч", diff: "просто",
    tools: ["Зарядное устройство"], parts: ["oil","grease"],
    steps: ["Помой, просуши, смажь цепь и тросы.", "Замени масло — старое с кислотами вредит за зиму.", "Карбюратор: слей бензин из поплавковой камеры. 2T — тоже.", "Сними АКБ, храни в тепле, подзаряжай раз в 1–2 месяца.", "Подкачай колёса или поставь на подставку."] },
  { id: "breakin", title: "Обкатка нового или отремонтированного мотора", area: "cyl", time: "300–500 км", diff: "просто",
    tools: [], parts: ["oil"],
    steps: ["Первые 50 км — спокойно, без полного газа и долгих постоянных оборотов.", "До 300 км — не выше ⅔ оборотов, меняй обороты постоянно.", "Первая замена масла — 300–500 км.", "Проверь клапаны ({valveIn}/{valveEx}) и протяни крепёж после обкатки.", "2T: обкатка около 1 моточаса, затем проверь затяжку головки."] }
];

/* ===== СПРАВОЧНИК НЕИСПРАВНОСТЕЙ ===== */
var FAULTS = [
  { s: "Не заводится, искра есть", c: ["Нет топлива в карбюраторе (кран, сапун бака)", "Залило свечу", "Засор холостого жиклёра", "Зажаты клапаны — нет компрессии"], area: "carb" },
  { s: "Не заводится, искры нет", c: ["Свеча или колпачок", "Кнопка глушения / датчики подножки и сцепления", "Катушка, пикап, CDI", "Масса и разъёмы"], area: "spark" },
  { s: "Заводится и сразу глохнет", c: ["Подсос закрыт рано", "Засор холостой системы", "Подсос воздуха через патрубок", "Низкие холостые обороты"], area: "carb" },
  { s: "Плавают холостые обороты", c: ["Подсос воздуха", "Неверный винт качества", "Зажаты клапаны", "EFI: грязный дроссель"], area: "carb" },
  { s: "Провал при открытии газа", c: ["Бедно на переходе — игла", "Ускорительный насос", "Засор холостого жиклёра", "Воздушный фильтр"], area: "carb" },
  { s: "Не крутится на верхах", c: ["Маленький главный жиклёр", "Забит фильтр", "Забит глушитель", "Буксует сцепление"], area: "carb" },
  { s: "Чёрный дым, чёрная свеча", c: ["Богатая смесь", "Подсос не закрывается", "Высокий уровень поплавка", "Забит фильтр"], area: "carb" },
  { s: "Сизый дым", c: ["Маслосъёмные колпачки", "Кольца", "Перелив масла", "2T: жирная смесь"], area: "cyl" },
  { s: "Белый дым после прогрева", c: ["Антифриз в цилиндре: прокладка ГБЦ", "Сальник помпы", "Трещина головки"], area: "cooling" },
  { s: "Стук снизу", c: ["Шатун/коленвал", "Подшипники коленвала", "Сцепление (корзина)"], area: "cyl" },
  { s: "Цоканье сверху", c: ["Увеличенный зазор клапанов", "Износ распредвала/коромысел", "Цепь ГРМ"], area: "head" },
  { s: "Звон под нагрузкой", c: ["Детонация: плохой бензин", "Бедная смесь", "Ранний угол зажигания", "Нагар в камере"], area: "spark" },
  { s: "Перегрев", c: ["Бедная смесь", "Мало масла", "Вентилятор/термостат/помпа", "Подклинивают тормоза"], area: "cooling" },
  { s: "Уходит антифриз", c: ["Сальник помпы", "Крышка радиатора", "Патрубки и хомуты", "Прокладка ГБЦ"], area: "cooling" },
  { s: "Масло в антифризе / эмульсия", c: ["Прокладка ГБЦ", "Внутренний сальник помпы", "Трещина"], area: "cooling" },
  { s: "Буксует сцепление", c: ["Нет свободного хода троса", "Износ дисков", "Масло с модификаторами", "Слабые пружины"], area: "clutch" },
  { s: "Ведёт сцепление", c: ["Большой свободный ход", "Коробление дисков", "Густое холодное масло"], area: "clutch" },
  { s: "Выбивает передачу", c: ["Износ кулачков шестерён", "Погнута вилка переключения", "Фиксатор барабана"], area: "gearbox" },
  { s: "Не горит нейтраль", c: ["Провод датчика нейтрали", "Датчик", "Лампа/LED приборки"], area: "gearbox" },
  { s: "Стартер не крутит", c: ["Разряжен АКБ", "Реле стартера", "Датчики сцепления/нейтрали", "Щётки стартера"], area: "gen" },
  { s: "Стартер крутит, мотор нет", c: ["Обгонная муфта стартера", "Бендикс"], area: "gen" },
  { s: "Садится АКБ на ходу", c: ["Реле-регулятор", "Статор", "Окисленный разъём", "Мощные потребители"], area: "gen" },
  { s: "Перегорают лампы", c: ["Реле-регулятор (перезаряд)", "Плохая масса", "Нет АКБ в цепи"], area: "gen" },
  { s: "Течь масла у звезды", c: ["Сальник вторичного вала", "Люфт вала"], area: "gearbox" },
  { s: "Течь масла у лапки", c: ["Сальник вала переключения"], area: "gearbox" },
  { s: "Стрекот у головки", c: ["Прокладка выпуска", "Ослабли гайки коллектора", "Сорванные шпильки"], area: "exhaust" },
  { s: "Хлопки в глушитель", c: ["Бедно на ХХ", "Подсос в выпуске", "Зажаты клапаны"], area: "exhaust" },
  { s: "Бензин в масле", c: ["Игольчатый клапан переливает", "Открытый кран на стоянке"], area: "carb" },
  { s: "Вибрация на скорости", c: ["Восьмёрка колеса", "Подшипники колёс", "Цепь и звёзды"], area: null },
  { s: "Ручка тормоза проваливается", c: ["Воздух в системе", "Старая жидкость", "Главный цилиндр"], area: null },
  { s: "Тормоз подклинивает", c: ["Закисшие поршни суппорта", "Направляющие суппорта", "Перелит бачок"], area: null },
  { s: "Течёт вилка", c: ["Сальники", "Забоины на трубе", "Грязь под пыльником"], area: null },
  { s: "Руль щёлкает в центре", c: ["Рулевые подшипники"], area: null },
  { s: "2T: падает мощность", c: ["Износ поршня/колец", "Лепестки", "Клапан выпуска", "Нагар в трубе"], area: "cyl" }
];

/* ===== КОДЫ ОШИБОК EFI (стандартные OBD-II, встречаются на китайских ЭБУ) ===== */
var OBD = [
  ["P0105", "Датчик давления во впуске (MAP)", "Разъём, вакуумная трубка, датчик", "map"],
  ["P0110", "Датчик температуры воздуха (IAT)", "Разъём, проводка, датчик", "map"],
  ["P0115", "Датчик температуры двигателя", "Разъём у головки, датчик, проводка", "fansensor"],
  ["P0120", "Датчик положения дросселя (TPS)", "Разъём, чистка дросселя, адаптация", "tps"],
  ["P0130", "Лямбда-зонд — цепь", "Разъём, проводка у глушителя, зонд", "o2"],
  ["P0135", "Подогрев лямбда-зонда", "Предохранитель, зонд", "o2"],
  ["P0171", "Слишком бедная смесь", "Подсос воздуха, слабый насос, грязная форсунка", "fuelpump"],
  ["P0172", "Слишком богатая смесь", "Форсунка подтекает, грязный фильтр", "injector"],
  ["P0201", "Цепь форсунки", "Разъём форсунки, проводка", "injector"],
  ["P0230", "Цепь топливного насоса", "Реле и предохранитель насоса", "fuelpump"],
  ["P0300", "Пропуски воспламенения", "Свеча, катушка, колпачок", "spark"],
  ["P0335", "Датчик положения коленвала", "Разъём под крышкой генератора, датчик", "pickup"],
  ["P0351", "Цепь катушки зажигания", "Разъём катушки, катушка", "coil"],
  ["P0505", "Регулятор холостого хода", "Чистка дросселя и канала ХХ", "tps"],
  ["P0560", "Напряжение бортсети", "АКБ, реле-регулятор, масса", "regulator"],
  ["P0562", "Низкое напряжение бортсети", "Зарядка, АКБ", "battery"],
  ["P0563", "Высокое напряжение бортсети", "Реле-регулятор", "regulator"],
  ["P0601", "Ошибка памяти ЭБУ", "Перепрошивка или замена ЭБУ", "ecu"],
  ["P0650", "Цепь лампы Check", "Лампа/LED приборки, проводка", "switches"],
  ["P1693", "Нет связи с панелью", "Разъём приборной панели", "speedo"]
];

/* ===== СПРАВОЧНЫЕ ТАБЛИЦЫ ===== */
var REF = {
  torque: [
    ["Свеча 10 мм (CR7/CR8)", "10–12 Н·м"], ["Свеча 12/14 мм", "15–20 Н·м"], ["Сливная пробка (алюминий)", "18–25 Н·м"],
    ["Болты крышек М6", "8–10 Н·м"], ["Гайки ГБЦ М8 (воздушники 250)", "20–25 Н·м"], ["Гайки выпуска М6", "10–12 Н·м"],
    ["Ось переднего колеса", "45–60 Н·м"], ["Ось заднего колеса", "80–100 Н·м"], ["Болты задней звезды М8", "30–35 Н·м + фиксатор"],
    ["Болт передней звезды М6", "10–12 Н·м"], ["Суппорт к вилке М8", "25–30 Н·м"], ["Тормозной диск М6", "10–12 Н·м + фиксатор"],
    ["Траверсы М8", "18–23 Н·м"], ["Ось маятника", "60–80 Н·м"], ["Болты амортизатора М10", "40–45 Н·м"], ["Спицы", "3–5 Н·м"]
  ],
  tires: [
    ["Эндуро, лес и грязь", "0.8–1.0 бар"], ["Эндуро, камни", "1.0–1.2 бар"], ["Эндуро, асфальт", "1.5–1.8 бар"],
    ["Питбайк", "1.0–1.3 бар"], ["Мотард, асфальт", "1.8–2.1 бар"], ["Мопед", "1.8–2.0 бар"]
  ],
  plug: [
    ["Светло-коричневый", "Норма"], ["Чёрный сухой бархат", "Богато: игла ниже, жиклёр меньше"],
    ["Белый, серый", "Бедно: опасно, жиклёр больше"], ["Чёрный маслянистый", "Масло в цилиндре: колпачки, кольца"],
    ["Мокрый бензином", "Залило: подсос, поплавок, нет искры"], ["Оплавлен", "Калильное: перегрев, неверная свеча"]
  ],
  fluids: [
    ["Тормозная жидкость", "DOT-4, замена раз в год"], ["Антифриз", "Для алюминиевых двигателей, раз в 1–2 сезона"],
    ["Масло вилки", "5W–10W, раз в сезон"], ["Масло 2T", "Синтетика, 1:40 (25 мл на литр)"], ["Смазка цепи", "Каждые 300–500 км и после воды"]
  ]
};
/* ===================== v4: расширение базы ===================== */

/* --- ещё один популярный питбайк-мотор --- */
ENGINES["Z155"] = { id: "Z155", code: "ZS1P60YMJ", name: "Zongshen Z155 · питбайк", maker: "Zongshen", groups: ["horiz","air","carb","4t","small"],
  stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушно-масляное", cc: 155, hp: 14, torque: "12.5 Н·м", compression: "10–12 бар",
  fuel: "АИ-95", ignition: "CDI", timing: "Цепь ГРМ", start: "Кик / электро", gearbox: "4–5 ст., ручное сцепление",
  carb: "PZ26 / PE26 / PWK28", jetMain: "108–118", jetPilot: "38–40", needle: "3 канавка", idle: "1600–1800",
  valveIn: "0.05–0.08 мм", valveEx: "0.08–0.10 мм", spark: "D8TC / CR7HSA", gap: "0.6–0.8 мм", sparkTorque: "12–15 Н·м",
  oil: "10W-40 (JASO MA)", oilVol: "1.0 л", oilInt: 800, valveInt: 1500,
  issues: [
    { t: "Перегрев при долгой езде на высоких", sev: "med", fix: "Маслорадиатор, не беднить смесь." },
    { t: "Шуршит цепь ГРМ после 3–5 тыс. км", sev: "med", fix: "Проверить натяжитель, при лязге менять комплектом." },
    { t: "Выкручиваются болты крышек от вибрации", sev: "low", fix: "Фиксатор резьбы средней прочности." }
  ] };

/* типичные обороты пика мощности и отсечки — для графика и тахометра */
function enginePeak(e) {
  /* своя красная зона у мотора (круизеры, Harley, большие синглы) — шкала тахометра по ней */
  if (e.redline) return { peak: Math.round(e.redline * 0.82 / 100) * 100, red: e.redline, max: Math.round(e.redline * 1.15 / 500) * 500 };
  var L = e.layout || "single";
  if (L === "i4") return e.cc <= 450 ? { peak: 14500, red: 15500, max: 17000 } : e.cc <= 650 ? { peak: 13500, red: 15000, max: 16000 } : { peak: 13000, red: 14000, max: 15000 };
  if (L === "i3") return { peak: 10000, red: 11500, max: 13000 };
  if (L === "vtwin" && e.groups.indexOf("cg") >= 0) return { peak: 5000, red: 6000, max: 7000 };
  if (L === "vtwin") return { peak: 8000, red: 9500, max: 11000 };
  if (e.stroke === "2T") return { peak: 8500, red: 10000, max: 12000 };
  if (e.cc >= 400) return { peak: 8500, red: 10000, max: 12000 };
  if (e.groups.indexOf("dohc") >= 0) return { peak: 9500, red: 11000, max: 13000 };
  if (e.groups.indexOf("cg") >= 0) return { peak: 7500, red: 8500, max: 10000 };
  if (e.groups.indexOf("zs4v") >= 0 || e.groups.indexOf("liquid") >= 0) return { peak: 8500, red: 9500, max: 11000 };
  if (e.groups.indexOf("horiz") >= 0) return { peak: 8000, red: 9500, max: 11000 };
  return { peak: 8000, red: 9000, max: 10000 };
}

/* --- ещё модели --- */
(function () {
  var E = "Эндуро", P = "Питбайк", M = "Мотард";
  B("Kayo", "T2 250 21/18", E, ["172FMM"]);
  B("Kayo", "K1 250 MX", E, ["172FMM-3A"]);
  B("Kayo", "K2 300", E, ["PR300"]);
  B("Kayo", "TS155", P, ["Z155"]);
  B("BSE", "Z2 250", E, ["172FMM-3A"]);
  B("BSE", "Z4 250", E, ["172FMM-5"]);
  B("BSE", "Z7 300", E, ["NB300"]);
  B("BSE", "PH155", P, ["Z155"]);
  B("Progasi", "Smart 250", E, ["172FMM"]);
  B("Progasi", "Race 155 Pit", P, ["Z155"]);
  B("Motoland", "XR250 Lite 21/18", E, ["165FMM"]);
  B("Motoland", "TT155", P, ["Z155"]);
  B("Regulmoto", "Holeshot 250", E, ["172FMM-3A"]);
  B("Regulmoto", "Sport 155 Pit", P, ["Z155"]);
  B("Avantis", "Enduro 300 PRO 21/18", E, ["PR300"]);
  B("Avantis", "Pit 155", P, ["Z155"]);
  B("Racer", "Pitbike RC155", P, ["Z155"]);
  B("JMC", "155 Pit", P, ["Z155"]);
  B("YCF", "Start 155", P, ["Z155"]);
  B("Apollo", "RXF 155", P, ["Z155"]);
  B("Xmotos", "XB155", P, ["Z155"]);
  B("Mikilon", "125 Pit", P, ["154FMI"]);
  B("Mikilon", "140 Pit", P, ["YX140"]);
  B("Mikilon", "160 Pit", P, ["1P60FMK"]);
  B("Zuumav", "K5 250", E, ["172FMM"]);
  B("Zuumav", "K6 300", E, ["NB300"]);
  B("Sharmax", "Enduro 250", E, ["172FMM"]);
  B("Sharmax", "Enduro 300", E, ["PR300"]);
  B("Kews", "K16 250 Motard", M, ["172FMM"]);
  B("Tekken", "250 Motard", M, ["172FMM"]);
  B("Любая модель", "с мотором ZS1P60YMJ", P, [["Z155", "ZS1P60YMJ"]]);
})();

/* --- ещё детали двигателя под каждый мотор --- */
(function () {
  Object.keys(ENGINES).forEach(function (id) {
    if (SHARE[id]) return;
    var e = ENGINES[id]; e.id = id;
    var k = engClass(e), c = e.code, fit = [id];
    Object.keys(SHARE).forEach(function (s) { if (SHARE[s] === id) fit.push(s); });
    var is4t = e.stroke === "4T", el = /Электро|электро/.test(e.start), carb = e.groups.indexOf("carb") >= 0;
    function add(slug, name, base, cat, kind) { PARTS.push(P(id + "-" + slug, name + " " + c, r50(base * k), cat, kind, fit)); }
    if (id === "Z155") {
      add("pis", "Поршневая группа", 4200, "Двигатель", "piston"); add("rings", "Кольца поршневые", 1200, "Двигатель", "rings");
      add("cyl", "Цилиндр в сборе", 5500, "Двигатель", "cylinder"); add("gskt", "Комплект прокладок двигателя", 1400, "Двигатель", "gasketset");
      add("bg", "Прокладки цилиндра", 450, "Двигатель", "basegasket"); add("seals", "Сальники двигателя (комплект)", 700, "Двигатель", "engseals");
      add("crank", "Коленвал в сборе", 8500, "Двигатель", "crank"); add("clutch", "Диски сцепления", 2600, "Трансмиссия", "clutchdiscs");
      add("stator", "Статор генератора", 2800, "Электрика", "stator"); add("starter", "Стартер", 3500, "Электрика", "starter");
      add("hg", "Прокладка ГБЦ", 350, "Двигатель", "headgasket"); add("chain", "Цепь ГРМ", 1500, "Двигатель", "camchain");
      add("tens", "Натяжитель цепи ГРМ", 900, "Двигатель", "tensioner"); add("guide", "Успокоители цепи ГРМ", 800, "Двигатель", "guide");
      add("vin", "Клапан впускной", 900, "Двигатель", "valvein"); add("vex", "Клапан выпускной", 1100, "Двигатель", "valveex");
      add("cam", "Распредвал", 3200, "Двигатель", "camshaft"); add("head", "Головка цилиндра в сборе", 9500, "Двигатель", "head");
      add("pump", "Масляный насос", 1600, "Двигатель", "oilpump");
    }
    add("cgsk", "Прокладка крышки сцепления", 300, "Двигатель", "clutchgasket");
    add("ggsk", "Прокладка крышки генератора", 300, "Двигатель", "gengasket");
    add("rotor", "Ротор генератора (маховик)", 3800, "Электрика", "rotor");
    add("basket", "Корзина сцепления в сборе", 5500, "Трансмиссия", "clutchbasket");
    add("cbear", "Подшипники коленвала (пара)", 1600, "Двигатель", "crankbearings");
    add("gears", "Шестерни КПП (комплект)", 9000, "Трансмиссия", "gears");
    add("forks", "Вилки и барабан переключения", 3500, "Трансмиссия", "shiftforks");
    add("csseal", "Сальник вторичного вала (у звезды)", 250, "Трансмиссия", "csseal");
    add("studs", "Шпильки цилиндра (комплект)", 900, "Двигатель", "studs");
    if (el) add("sprag", "Обгонная муфта стартера", 2400, "Электрика", "sprag");
    if (is4t && e.groups.indexOf("dohc") < 0) add("rock", "Коромысла с осями", 1800, "Двигатель", "rockers");
    if (is4t) add("tkit", "Ремкомплект натяжителя ГРМ", 600, "Двигатель", "tenskit");
    if (carb) add("igsk", "Прокладка/проставка впуска", 350, "Топливо", "intakegasket");
  });
})();

/* --- экипировка и поход --- */
[
  ["eq-helmet", "Шлем кроссовый", 9000], ["eq-goggles", "Очки кроссовые", 2500], ["eq-lens", "Линза для очков сменная", 600],
  ["eq-gloves", "Перчатки эндуро", 1800], ["eq-boots", "Ботинки эндуро", 16000], ["eq-armor", "Защита тела (черепаха)", 7500],
  ["eq-knee", "Наколенники", 3500], ["eq-elbow", "Налокотники", 2500], ["eq-shorts", "Шорты защитные", 4500],
  ["eq-jersey", "Джерси", 2500], ["eq-pants", "Штаны эндуро", 6000], ["eq-jacket", "Куртка эндуро", 9000],
  ["eq-rain", "Дождевик", 2500], ["eq-hydro", "Гидропак 2 л", 2500], ["eq-neck", "Шейная защита", 8000], ["eq-balaclava", "Балаклава", 600]
].forEach(function (x) { PARTS.push(P(x[0], x[1], x[2], "Экипировка", "gear")); });
[
  ["tr-bag", "Сумка на заднее крыло", 2500], ["tr-barbag", "Сумка на руль", 1800], ["tr-can", "Канистра 2 л", 1200],
  ["tr-patch", "Ремкомплект камеры (латки, клей)", 600], ["tr-co2", "Баллончик CO2 с адаптером", 1500], ["tr-pump", "Компактный насос", 1500],
  ["tr-tow", "Буксировочный ремень", 900], ["tr-ties", "Стяжки и изолента (набор)", 300], ["tr-multi", "Мультитул", 2500],
  ["tr-lamp", "Фонарь налобный", 1200], ["tr-aid", "Аптечка", 900], ["tr-strap", "Стропа-ручка для вытаскивания", 700],
  ["tr-tools", "Набор ключей в поход (8–17 мм)", 2200], ["tr-spark", "Запасная свеча и ключ", 500]
].forEach(function (x) { PARTS.push(P(x[0], x[1], x[2], "Поход", "trip")); });

/* --- цели для конструктора тюнинга --- */
var GOALS = [
  { id: "power", t: "Больше мощности" },
  { id: "reliable", t: "Надёжность" },
  { id: "forest", t: "Лес и грязь" },
  { id: "speed", t: "Скорость и трасса" },
  { id: "comfort", t: "Удобство" }
];
TUNING.push(
  { id: "sparkarrest", cat: "Выпуск", title: "Глушитель с искрогасителем", stage: 1, power: 0, price: 7500, diff: "просто", rating: 4.4, fit: ["4t"], body: "Не поджигает сухую траву в лесу, тише штатного прямотока." },
  { id: "hotstart", cat: "Впуск", title: "Кнопка горячего старта", stage: 1, power: 0, price: 2500, diff: "средне", rating: 4.3, fit: ["NC450C","dohc"], deny: { efi: "На инжекторе не нужна — ЭБУ сам." }, body: "Лёгкий запуск горячего мотора после падения." },
  { id: "shiftlever", cat: "Управление", title: "Лапка КПП и педаль тормоза складные", stage: 1, power: 0, price: 2600, diff: "просто", rating: 4.5, body: "Не гнутся и не ломаются при падении." },
  { id: "seatlow", cat: "Управление", title: "Заниженное сиденье", stage: 1, power: 0, price: 6500, diff: "просто", rating: 4.2, fit: ["big"], body: "Ноги до земли — проще в технических участках." },
  { id: "risers", cat: "Управление", title: "Вынос и проставки руля", stage: 1, power: 0, price: 2800, diff: "просто", rating: 4.4, fit: ["big"], body: "Удобная посадка стоя для высоких райдеров." },
  { id: "lowlink", cat: "Подвеска", title: "Тяга прогрессии для занижения", stage: 2, power: 0, price: 4500, diff: "средне", rating: 4.1, fit: ["big"], body: "Ниже на 2–4 см. Меняет работу задней подвески." },
  { id: "quickthr", cat: "Управление", title: "Короткоходная ручка газа", stage: 1, power: 0, price: 2400, diff: "просто", rating: 3.9, body: "Меньше поворот кисти до полного газа. Для опытных." },
  { id: "battswitch", cat: "Электрика", title: "Выключатель массы", stage: 1, power: 0, price: 900, diff: "просто", rating: 4.3, body: "АКБ не садится при стоянке и защищает от замыканий." },
  { id: "chainguide", cat: "Защита", title: "Направляющая и слайдер цепи усиленные", stage: 1, power: 0, price: 2400, diff: "просто", rating: 4.5, fit: ["big"], body: "Цепь не слетает на камнях и колеях." },
  { id: "radbrace", cat: "Охлаждение", title: "Радиатор увеличенный + защита", stage: 2, power: 0, price: 9000, diff: "средне", rating: 4.4, fit: ["liquid"], body: "Запас охлаждения для медленной хард-эндуро езды." }
);
var GOAL_W = {
  power: function (t) { return t.power * 1.2; },
  reliable: function (t) {
    var m = { oilcool: 10, fan: 10, "oil-temp": 7, clutch: 6, "x-ring": 6, breather: 6, snorkel: 6, iridium: 3, hourmeter: 5, battswitch: 4, radbrace: 8, radguard: 6, skid: 6, chainguide: 5, jets: 7, lithium: 3, "coil-hp": 3, heatshield: 2 };
    return (m[t.id] || 0) - t.power * 0.25;
  },
  forest: function (t) {
    var m = { "sp-tq": 9, "rear-sp": 9, tires: 10, mousse: 8, rimlock: 7, levers: 7, hand: 8, skid: 8, fork: 6, revalve: 7, damper: 4, pegs: 6, "flywheel-w": 7, fatbar: 4, radguard: 6, frameguard: 4, breather: 6, snorkel: 5, sparkarrest: 5, shiftlever: 6, chainguide: 6, hotstart: 5, seatlow: 4, radbrace: 6, fan: 5, oilcool: 4, "aux-light": 3 };
    return m[t.id] || 0;
  },
  speed: function (t) {
    var m = { "sp-sp": 9, full: 6, slip: 4, pwk: 5, pe30: 4, pwk28: 4, filter: 3, damper: 6, bigdisc: 6, pads: 5, hose: 4, led: 3, "aux-light": 3, ecu: 4, "fork-cart": 4, "shock-adj": 4 };
    return (m[t.id] || 0) + t.power * 0.3;
  },
  comfort: function (t) {
    var m = { risers: 7, seatlow: 6, quickthr: 3, fatbar: 6, pegs: 5, levers: 4, usb: 5, led: 5, lithium: 4, "shock-adj": 5, revalve: 6, fork: 4, lowlink: 4, damper: 3 };
    return m[t.id] || 0;
  }
};
var TUNE_EXCL = [["cdi", "cdi-prog"], ["sp-tq", "sp-sp"], ["pe30", "pwk", "pwk28"], ["slip", "full"], ["swap-z190", "bore-yx"], ["swap-pr300", "cam", "bore300"], ["mousse", "tube"], ["flywheel-l", "flywheel-w"]];

/* --- умная диагностика: симптомы, условия, причины --- */
var SYMPTOMS = [
  { cat: "Запуск", items: [["nostart", "Не заводится"], ["hardcold", "Тяжело заводится на холодную"], ["hardhot", "Тяжело заводится на горячую"], ["stallidle", "Глохнет на холостых"], ["stallgear", "Глохнет при включении передачи"]] },
  { cat: "Как едет", items: [["idle", "Плавают обороты"], ["hesitate", "Провал при открытии газа"], ["nopower", "Не тянет, вялый"], ["notop", "Не крутится на верхах"], ["misfire", "Троит, чихает, дёргается"], ["cut", "Глохнет на ходу"]] },
  { cat: "Звуки", items: [["tick", "Цоканье сверху"], ["rattle", "Лязг или шуршание цепи ГРМ"], ["knockbottom", "Глухой стук снизу"], ["ping", "Звон под нагрузкой"], ["backfire", "Хлопки в глушитель"], ["popintake", "Чихает в карбюратор"]] },
  { cat: "Дым и свеча", items: [["smokeblack", "Чёрный дым"], ["smokeblue", "Сизый дым"], ["smokewhite", "Белый дым после прогрева"], ["plugblack", "Свеча чёрная"], ["plugwhite", "Свеча белая"], ["plugwet", "Свеча мокрая"]] },
  { cat: "Температура и жидкости", items: [["overheat", "Перегревается"], ["coolantloss", "Уходит антифриз", "liquid"], ["fuelsmell", "Пахнет бензином, переливает"], ["oilleak", "Течёт масло"], ["oilconsume", "Уходит масло"], ["milkyoil", "Масло мутное, эмульсия"]] },
  { cat: "Сцепление и КПП", items: [["clutchslip", "Буксует сцепление"], ["clutchdrag", "Ведёт сцепление, не найти нейтраль"], ["jumpgear", "Выбивает передачу"]] },
  { cat: "Электрика", items: [["nocrank", "Стартер не крутит"], ["batdrain", "Садится аккумулятор"], ["lights", "Тусклый или моргает свет"], ["check", "Горит Check", "efi"]] },
  { cat: "Ходовая", items: [["vibe", "Сильная вибрация"], ["brakesoft", "Ватный тормоз"], ["forkleak", "Течёт вилка"]] }
];
var CONDITIONS = [["cold", "На холодную"], ["hot", "На горячую"], ["rain", "После мойки, дождя или брода"], ["afterwork", "После ремонта или тюнинга"], ["highmiles", "Большой пробег"], ["newfuel", "После заправки"]];
function C(id, t, area, w, o) { return Object.assign({ id: id, t: t, area: area, w: w }, o || {}); }
var CAUSES = [
  C("lean", "Бедная смесь — не хватает бензина", "carb", { plugwhite: 5, overheat: 3, hesitate: 3, backfire: 3, popintake: 4, hardcold: 2, notop: 2, ping: 2 }, { cond: { afterwork: 2, cold: 1 }, only: ["carb"], k: /бедн/i, sev: "high",
    check: ["Посмотри свечу после поездки: белая — бедно.", "Брызни WD на стыки патрубка на холостых: обороты меняются — там подсос.", "Сравни главный жиклёр ({jetMain}) с тем, что стоит."], fix: "Главный жиклёр на 1–2 размера больше, игла на канавку выше, устранить подсос.", parts: ["jets", "needle", "intake"], work: "Настройка карбюратора (жиклёры, игла)", guide: "carb-tune", tree: "plug" }),
  C("rich", "Богатая смесь — лишний бензин", "carb", { smokeblack: 5, plugblack: 5, nopower: 2, hardhot: 3, fuelsmell: 1 }, { only: ["carb"], k: /богат/i,
    check: ["Свеча бархатно-чёрная, сухая.", "Подсос полностью закрывается?", "Воздушный фильтр чистый?"], fix: "Игла на канавку ниже, главный жиклёр меньше, почистить фильтр.", parts: ["jets", "airfilter"], work: "Настройка карбюратора (жиклёры, игла)", guide: "carb-tune", tree: "plug" }),
  C("airfilter", "Забит воздушный фильтр", "carb", { plugblack: 3, smokeblack: 3, notop: 3, nopower: 3 }, { cond: { highmiles: 1 },
    check: ["Сними фильтр: грязный, сухой или залит маслом?"], fix: "Промыть и пропитать или заменить фильтр.", parts: ["airfilter", "filteroil"], work: "Чистка и пропитка воздушного фильтра", guide: "airfilter" }),
  C("pilotjet", "Засор холостой системы карбюратора", "carb", { hardcold: 3, stallidle: 5, idle: 3, hesitate: 2, nostart: 2 }, { cond: { highmiles: 1, newfuel: 1 }, only: ["carb"],
    check: ["Заводится только с подсосом или подгазовкой?", "Холостой жиклёр ({jetPilot}) просвечивается?"], fix: "Чистка карбюратора, продувка каналов, новый ремкомплект.", parts: ["carbkit", "carbcleaner"], work: "Чистка карбюратора", guide: "carb-clean", tree: "idle" }),
  C("airleak", "Подсос воздуха через патрубок или хомуты", "carb", { idle: 5, stallidle: 3, hesitate: 2, plugwhite: 2, overheat: 1, popintake: 2 }, { cond: { afterwork: 2 }, k: /подсос|патрубок/i,
    check: ["Трещины на впускном патрубке между карбом и головкой.", "WD на стыки на холостых — обороты меняются?"], fix: "Новый патрубок и прокладки, затянуть хомуты.", parts: ["intake", "intakegasket"], work: "Чистка карбюратора", tree: "cold" }),
  C("choke", "Не работает подсос (обогатитель)", "carb", { hardcold: 5, stallidle: 2 }, { cond: { cold: 3 }, only: ["carb"], k: /обогатит|подсос/i,
    check: ["Шток подсоса ходит до конца? Трос не закис?"], fix: "Почистить и смазать шток, отрегулировать трос.", parts: ["choke", "carbkit"], work: "Чистка карбюратора", tree: "cold" }),
  C("float", "Переливает карбюратор (игольчатый клапан, поплавок)", "carb", { fuelsmell: 5, smokeblack: 2, plugwet: 3, hardhot: 2, plugblack: 2 }, { only: ["carb"],
    check: ["Капает из дренажа карбюратора?", "Бензин в масле — уровень масла вырос?"], fix: "Почистить седло, заменить игольчатый клапан, выставить поплавок.", parts: ["floatvalve", "carbkit"], work: "Чистка карбюратора", tree: "flooding" }),
  C("flooded", "Залило свечу", "spark", { plugwet: 5, nostart: 3, hardhot: 1 }, {
    check: ["Свеча мокрая и пахнет бензином."], fix: "Выкрутить и просушить свечу, прокрутить мотор с полным газом без свечи.", parts: ["spark"], tree: "start" }),
  C("nofuel", "Нет подачи топлива (кран, сапун бака, фильтр)", "carb", { nostart: 4, cut: 4, notop: 1 }, { cond: { newfuel: 1 }, skip: ["efi"],
    check: ["Сними шланг с карбюратора — бензин течёт?", "Глохнет и оживает, если открыть крышку бака — забит сапун."], fix: "Прочистить кран и сапун, заменить фильтр.", parts: ["fuelfilter", "petcock", "tankcap"], tree: "start" }),
  C("badfuel", "Плохой бензин или вода в баке", "carb", { ping: 3, misfire: 3, nostart: 1, cut: 2, nopower: 1 }, { cond: { newfuel: 5, rain: 1 },
    check: ["Началось сразу после заправки?", "Слей немного бензина из поплавковой камеры в банку — есть капли воды?"], fix: "Слить бензин, промыть бак и карбюратор, залить {fuel} с проверенной заправки.", parts: ["fuelfilter"] }),
  C("plug", "Изношенная или неподходящая свеча", "spark", { misfire: 4, hardcold: 2, nostart: 2, plugblack: 1 }, {
    check: ["Свеча старше 6000 км? Электрод обгорел? Тип — {spark}?"], fix: "Новая свеча {spark}, зазор {gap}.", parts: ["spark"], work: "Замена свечи", guide: "spark" }),
  C("cap", "Свечной колпачок или провод", "spark", { misfire: 3, nostart: 2, cut: 2 }, { cond: { rain: 3 },
    check: ["Трещины на колпачке, следы пробоя, влага внутри."], fix: "Заменить колпачок, провод подрезать или заменить.", parts: ["sparkcap", "htlead"] }),
  C("coil", "Катушка зажигания", "spark", { nostart: 3, misfire: 3, cut: 2 }, { cond: { hot: 2 }, k: /катушк/i,
    check: ["Искра слабая жёлтая или пропадает на горячую?", "Проверка катушки мультиметром (первичка 0.2–1 Ом)."], fix: "Заменить катушку.", parts: ["coil"], guide: "coil-test" }),
  C("cdi", "Коммутатор CDI или датчик пикапа", "spark", { nostart: 3, cut: 3, notop: 2 }, { cond: { hot: 3 }, skip: ["efi"], k: /CDI|коммутатор/i,
    check: ["Глохнет на горячую и заводится, когда остынет?", "Есть подменный CDI у друга — проверь подменой."], fix: "Заменить CDI или пикап.", parts: ["cdi", "pickup"], tree: "hot" }),
  C("killsw", "Кнопка глушения или датчики подножки/сцепления", "spark", { nostart: 3, stallgear: 5, cut: 2 }, { cond: { rain: 2 },
    check: ["Подножка поднята? Кнопка глушения в положении RUN?", "Глохнет только при включении передачи с опущенной подножкой."], fix: "Почистить контакты, заменить датчик подножки.", parts: ["killswitch", "sidestand", "clutchswitch"], tree: "stall-gear" }),
  C("valvetight", "Зажаты клапаны (малый зазор)", "head", { hardhot: 4, hardcold: 2, backfire: 2, popintake: 2, nopower: 2, stallidle: 2 }, { cond: { highmiles: 3 }, only: ["4t"], k: /клапан.*зажим|зажима/i, sev: "high",
    check: ["Когда последний раз регулировали клапаны?", "Норма на холодную: впуск {valveIn}, выпуск {valveEx}."], fix: "Регулировка клапанов. Если долго ездили с нулевым зазором — проверить на прогар.", parts: ["vcgasket", "feeler"], work: "Регулировка клапанов (винты)", guide: "valves" }),
  C("valveloose", "Увеличенный зазор клапанов", "head", { tick: 5, nopower: 1 }, { only: ["4t"],
    check: ["Цоканье сверху, громче на холостых."], fix: "Регулировка клапанов: впуск {valveIn}, выпуск {valveEx}.", parts: ["vcgasket", "adjscrews"], work: "Регулировка клапанов (винты)", guide: "valves" }),
  C("camchain", "Вытянута цепь ГРМ или умер натяжитель", "timing", { rattle: 5, tick: 2 }, { cond: { highmiles: 3 }, only: ["4t"], k: /цепь ГРМ|натяжит/i,
    check: ["Лязг на холостых и при сбросе газа.", "Шток натяжителя почти на максимуме хода."], fix: "Цепь, натяжитель и успокоители комплектом.", parts: ["camchain", "tensioner", "guide"], work: "Замена цепи ГРМ и натяжителя", guide: "camchain" }),
  C("rings", "Износ колец и поршня", "cyl", { smokeblue: 4, oilconsume: 4, nopower: 3, hardcold: 2, plugblack: 1 }, { cond: { highmiles: 3 }, k: /поршн|кольц/i,
    check: ["Замер компрессии: норма {compression}.", "Капни масла в цилиндр — компрессия выросла? Значит кольца."], fix: "Замена поршневой, при износе цилиндра — расточка.", parts: ["rings", "piston", "gasketset"], work: "Замена поршневой", guide: "compression" }),
  C("stemseals", "Маслосъёмные колпачки", "head", { smokeblue: 4, oilconsume: 3, plugblack: 1 }, { only: ["4t"],
    check: ["Сизый дым именно на сбросе газа и после холостых."], fix: "Замена колпачков (снимается головка).", parts: ["valveseals"], work: "Замена маслосъёмных колпачков" }),
  C("hgliq", "Прокладка ГБЦ (антифриз в цилиндр)", "cyl", { smokewhite: 5, coolantloss: 4, milkyoil: 4, overheat: 3 }, { only: ["liquid"], k: /ГБЦ/i, sev: "high",
    check: ["Белый сладкий дым после прогрева.", "Пузыри в радиаторе на работающем моторе."], fix: "Замена прокладки ГБЦ, проверка плоскости головки.", parts: ["headgasket", "coolant"], work: "Замена прокладки ГБЦ" }),
  C("hgair", "Прогорела прокладка ГБЦ", "cyl", { oilleak: 2, nopower: 2, overheat: 2 }, { only: ["air"], k: /ГБЦ/i,
    check: ["Подтёки и копоть между головкой и цилиндром."], fix: "Замена прокладки, устранить причину перегрева.", parts: ["headgasket"], work: "Замена прокладки ГБЦ", guide: "headgasket" }),
  C("waterpump", "Сальник или крыльчатка помпы", "cooling", { coolantloss: 5, milkyoil: 3, overheat: 3 }, { only: ["liquid"], k: /помп/i,
    check: ["Капает из дренажного отверстия под помпой?"], fix: "Ремкомплект помпы, свежий антифриз.", parts: ["waterpump", "coolant"], work: "Ремонт помпы", tree: "coolant" }),
  C("fan", "Не включается вентилятор", "cooling", { overheat: 5, coolantloss: 1 }, { cond: { hot: 2 }, only: ["liquid"], k: /вентилят/i,
    check: ["На месте в пробке вентилятор не крутится?", "Подай 12 В напрямую — крутится?"], fix: "Датчик, реле, предохранитель или сам вентилятор.", parts: ["fan", "fansensor", "fuse"], work: "Установка вентилятора", tree: "fan" }),
  C("thermostat", "Заклинил термостат", "cooling", { overheat: 3 }, { only: ["CBS300", "dohc"],
    check: ["Верхний патрубок радиатора холодный при горячем моторе."], fix: "Заменить термостат.", parts: ["thermostat"], work: "Замена термостата" }),
  C("lowoil", "Мало масла или оно старое", "oil", { overheat: 3, tick: 2, rattle: 1, clutchslip: 1 }, { only: ["4t"],
    check: ["Уровень по щупу ({oilVol}).", "Когда меняли масло?"], fix: "Замена масла {oil}.", parts: ["oil", "oilfilter"], work: "Замена масла и фильтра", guide: "oil" }),
  C("needcool", "Мотору не хватает охлаждения", "cooling", { overheat: 3, ping: 1 }, { only: ["air"], k: /перегрев/i,
    check: ["Перегрев в медленной грязи или после тюнинга?"], fix: "Маслорадиатор с вентилятором, смесь не беднить.", parts: ["oilcooler", "oiltemp"], work: "Установка маслорадиатора", guide: "oilcooler" }),
  C("crank", "Износ шатуна или коленвала", "cyl", { knockbottom: 5, vibe: 2 }, { cond: { highmiles: 2 }, sev: "high",
    check: ["Глухой стук снизу, растёт с оборотами.", "Люфт шатуна вверх-вниз при снятом цилиндре."], fix: "Не заводить! Разборка, замена коленвала.", parts: ["crank", "crankbearings"], work: "Замена коленвала" }),
  C("clutchworn", "Износ дисков сцепления", "clutch", { clutchslip: 5, nopower: 1 }, { cond: { highmiles: 2 }, k: /сцеплен/i,
    check: ["Обороты растут, скорость нет — особенно на высоких передачах."], fix: "Замена дисков, при необходимости пружин.", parts: ["clutchdiscs", "clutchsprings"], work: "Замена сцепления", guide: "clutch-replace" }),
  C("clutchadj", "Неверная регулировка троса сцепления", "clutch", { clutchslip: 3, clutchdrag: 4, stallgear: 2 }, {
    check: ["Свободный ход рычага 10–15 мм?"], fix: "Отрегулировать трос, смазать.", parts: ["clutchcable"], work: "Регулировка троса сцепления и газа", guide: "clutch-cable" }),
  C("wrongoil", "Масло с модификаторами трения", "oil", { clutchslip: 3 }, { only: ["4t"],
    check: ["Залито автомобильное масло, а не JASO MA?"], fix: "Мото-масло {oil} с допуском JASO MA.", parts: ["oil"] }),
  C("gearbox", "Износ кулачков шестерён или вилок КПП", "gearbox", { jumpgear: 5 }, { sev: "high",
    check: ["Передачу выбивает под нагрузкой, чаще одну и ту же."], fix: "Разборка картера, замена шестерён и вилок.", parts: ["gears", "shiftforks"], work: "Ремонт КПП" }),
  C("exleak", "Подсос в выпуске, прокладка коллектора", "exhaust", { backfire: 4, tick: 1 }, { only: ["4t"], k: /выпуск|шпильк/i,
    check: ["Копоть и стрекот у головки, хлопки при сбросе газа."], fix: "Новая прокладка выпуска, проверить шпильки.", parts: ["exgasket", "exstuds"], guide: "exhaust" }),
  C("exclog", "Забит глушитель или набивка", "exhaust", { notop: 3, nopower: 2 }, {
    check: ["Глушитель старый, после грязи, мотор «душится» на верхах."], fix: "Перебить набивку, прочистить искрогаситель.", parts: ["expack"] }),
  C("batt", "Разряжен или старый аккумулятор", "gen", { nocrank: 5, batdrain: 3, lights: 1 }, { cond: { cold: 2 },
    check: ["Напряжение без нагрузки ниже 12.4 В?"], fix: "Зарядить, при потере ёмкости заменить.", parts: ["battery"], tree: "starter" }),
  C("regulator", "Реле-регулятор", "gen", { batdrain: 4, lights: 4 }, { k: /регулятор|генерат/i,
    check: ["На 5000 об/мин на АКБ должно быть 13.5–14.5 В."], fix: "Заменить реле-регулятор, почистить разъём.", parts: ["regulator"], guide: "charging" }),
  C("stator", "Статор генератора", "gen", { batdrain: 3, lights: 3, nostart: 1 }, {
    check: ["Сопротивление обмоток и пробой на массу."], fix: "Замена статора.", parts: ["stator"], work: "Замена статора", guide: "charging" }),
  C("strelay", "Реле стартера или цепь управления", "gen", { nocrank: 4 }, {
    check: ["Щелчок реле есть? Предохранитель цел? Сцепление выжато?"], fix: "Реле, предохранитель, датчики сцепления и нейтрали.", parts: ["starterrelay", "fuse", "clutchswitch"], tree: "starter" }),
  C("starter", "Стартер или его обгонная муфта", "gen", { nocrank: 3 }, {
    check: ["Реле щёлкает, АКБ заряжен, а стартер не крутит или крутит вхолостую."], fix: "Щётки стартера, обгонная муфта.", parts: ["starter", "sprag"], work: "Ремонт стартера" }),
  C("ground", "Плохая масса или окисленные разъёмы", "gen", { lights: 3, cut: 2, check: 2, nocrank: 1 }, { cond: { rain: 4 },
    check: ["Проблема появилась после мойки или дождя?"], fix: "Почистить и обработать разъёмы, протянуть массу.", parts: ["ground", "dielectric"] }),
  C("efisensor", "Датчик инжектора (TPS, MAP, температура)", "carb", { check: 5, idle: 3, hesitate: 2, hardcold: 2 }, { cond: { rain: 2 }, only: ["efi"], k: /датчик/i,
    check: ["Считай коды ошибок адаптером (раздел «Справочник → Коды»)."], fix: "Разъём, проводка, затем замена датчика.", parts: ["tps", "mapsensor", "scanner"], tree: "efi" }),
  C("fuelpump", "Топливный насос или его фильтр", "carb", { nostart: 3, cut: 3, notop: 3 }, { only: ["efi"], k: /насос/i,
    check: ["При включении зажигания жужжит насос 2–3 секунды?"], fix: "Фильтр насоса, реле, сам насос.", parts: ["fuelpump", "fuelfilter"], work: "Замена топливного насоса" }),
  C("throttlebody", "Грязный дроссельный узел", "carb", { idle: 4, stallidle: 3 }, { only: ["efi"], k: /дроссел/i,
    check: ["Нагар на заслонке дросселя."], fix: "Чистка дросселя и адаптация.", parts: ["scanner"], work: "Чистка дроссельного узла EFI", guide: "efi-clean" }),
  C("reed", "Лепестковый клапан", "carb", { hesitate: 3, nopower: 3, idle: 2, hardcold: 2 }, { only: ["2t"], k: /лепестк/i,
    check: ["Трещины или неплотное прилегание лепестков."], fix: "Заменить лепестки или клапан.", parts: ["reed", "reedpetals"], work: "Обслуживание лепесткового клапана", guide: "reed" }),
  C("piston2t", "Износ поршня 2T", "cyl", { nopower: 4, hardcold: 3, knockbottom: 1 }, { cond: { highmiles: 4 }, only: ["2t"], k: /поршн/i, sev: "high",
    check: ["Сколько моточасов на поршне?", "Компрессия ниже {compression}."], fix: "Плановая замена поршня.", parts: ["piston", "basegasket"], work: "Замена поршня 2T", guide: "piston2t" }),
  C("pv", "Закоксован клапан выпуска 2T", "exhaust", { notop: 4, nopower: 2, smokeblue: 2 }, { only: ["2t"], k: /клапан выпуска/i,
    check: ["Мотор не выходит на верха, как будто «душится»."], fix: "Чистка клапана выпуска.", parts: ["pv"], work: "Чистка клапана выпуска 2T", guide: "pv-clean" }),
  C("mix2t", "Неверная пропорция смеси 2T", "carb", { smokeblue: 4, plugwet: 2, plugblack: 2, overheat: 2 }, { only: ["2t"],
    check: ["Пропорция 1:40 (25 мл масла на литр)?"], fix: "Правильная смесь, синтетическое 2T масло.", parts: ["oil"] }),
  C("brakeair", "Воздух в тормозах или старая жидкость", null, { brakesoft: 5 }, { sev: "high",
    check: ["Ручка проваливается, после нескольких нажатий твердеет."], fix: "Прокачка, свежая DOT-4.", parts: ["brakefluid", "bleeder"], work: "Прокачка тормозов", guide: "brakes-bleed" }),
  C("pads", "Изношенные колодки", null, { brakesoft: 2 }, { check: ["Остаток накладки меньше 1.5 мм?"], fix: "Замена колодок.", parts: ["padsF", "padsR"], work: "Замена колодок", guide: "pads" }),
  C("forkseal", "Сальники вилки", null, { forkleak: 5 }, { check: ["Масляное кольцо на трубе после хода вилки."], fix: "Замена сальников и пыльников, свежее масло.", parts: ["forkseals", "forkdust", "forkoil"], work: "Замена сальников вилки", guide: "forkseals" }),
  C("wheel", "Подшипники колёс, восьмёрка или цепь", null, { vibe: 4 }, { check: ["Вибрация зависит от скорости, а не от оборотов?"], fix: "Подшипники, спицы, цепь и звёзды.", parts: ["wheelbearing", "chain"], work: "Замена подшипников колеса", guide: "wheelbearings" }),
  C("mounts", "Ослаб крепёж мотора и подножек", null, { vibe: 3 }, { cond: { afterwork: 2 }, check: ["Протяни болты мотора, подножек, руля."], fix: "Затяжка с фиксатором резьбы.", parts: ["loctite"] }),
  C("balancer", "Сбиты метки балансира после сборки", "cyl", { vibe: 4 }, { cond: { afterwork: 4 }, only: ["balancer"], sev: "high", check: ["Вибрация появилась сразу после ремонта мотора."], fix: "Разобрать и выставить метки балансира по мануалу." }),
  C("oilseal", "Сальник вала или прокладка крышки", "oil", { oilleak: 5 }, { check: ["Откуда течёт: звезда, лапка КПП, крышка клапанов?"], fix: "Заменить сальник или прокладку.", parts: ["csseal", "shift", "vcgasket"], tree: "leak" }),
  C("breather", "Забит сапун или перелито масло", "oil", { oilleak: 2, oilconsume: 2 }, { check: ["Масло выше метки? Сапун не пережат?"], fix: "Уровень по щупу, прочистить сапун.", parts: ["breather"] }),
  C("water", "В мотор или фильтр попала вода", "cyl", { milkyoil: 4, nostart: 2, misfire: 2 }, { cond: { rain: 5 }, sev: "high", check: ["Было падение в воду или брод?"], fix: "Не заводить сразу! Слить воду из фильтра, прокрутить без свечи, заменить масло.", parts: ["oil", "airfilter", "spark"], tree: "water", guide: "ford" }),
  C("timing", "Сбиты метки ГРМ после ремонта", "timing", { nostart: 3, nopower: 3, backfire: 2 }, { cond: { afterwork: 5 }, only: ["4t"], sev: "high", check: ["Проблема сразу после работ с головкой или цепью ГРМ?"], fix: "Проверить метки ГРМ по мануалу, иначе встреча клапанов с поршнем." }),
  C("advance", "Ранний угол зажигания на плохом бензине", "spark", { ping: 4 }, { cond: { afterwork: 2, newfuel: 2 }, check: ["Стоит спортивный CDI? Залит АИ-92 вместо {fuel}?"], fix: "Правильный бензин, штатный CDI.", parts: ["cdi"] })
];

/* --- проверка перед выездом --- */
var PRERIDE = [
  ["tires", "Шины: давление и порезы"], ["spokes", "Спицы: ни одна не болтается"], ["brakes", "Тормоза: оба держат, жидкость в норме"],
  ["chain", "Цепь: провис 30–40 мм, смазана"], ["cables", "Газ возвращается сам, сцепление с ходом"], ["oil", "Уровень масла"],
  ["coolant", "Антифриз в бачке", "liquid"], ["lights", "Свет и сигнал"], ["bolts", "Оси колёс и руль затянуты"],
  ["fuel", "Бензин (2T — смесь!)"], ["kit", "Инструмент, камера, насос, телефон заряжен"]
];

/* --- ещё инструкции --- */
GUIDES.push(
  { id: "sag", title: "Настройка провиса подвески (SAG)", area: null, time: "30 мин", diff: "средне", only: ["big"], tools: ["Рулетка", "Помощник", "Ключ преднатяга"], parts: ["shockspring"],
    steps: ["Подними мотоцикл за раму, чтобы колесо висело. Замерь расстояние от оси колеса до точки на крыле — это A.", "Опусти мотоцикл без райдера, замерь ещё раз — B. Свободный провис A−B: норма 25–40 мм.", "Сядь в экипировке в стойку на подножки, помощник замеряет — C. Рабочий провис A−C: 95–105 мм для 250–300 эндуро.", "Больше нормы — затяни преднатяг пружины, меньше — ослабь.", "Если чтобы попасть в норму, преднатяг нужно затянуть очень сильно или почти распустить — пружина не под твой вес."] },
  { id: "steering", title: "Регулировка люфта рулевой", area: null, time: "30 мин", diff: "средне", tools: ["Ключ на гайку рулевой", "Ключи траверс"], parts: ["steering", "grease2"],
    steps: ["Поставь мотоцикл на подставку, переднее колесо в воздухе.", "Проверь люфт: возьмись за перья внизу и качни вперёд-назад. Щелчок — люфт.", "Ослабь верхнюю гайку штока и болты верхней траверсы.", "Подтяни регулировочную гайку, пока люфт не исчезнет, но руль должен падать в стороны сам под своим весом.", "Затяни всё обратно и перепроверь. Руль «щёлкает» в центре — подшипники пора менять."] },
  { id: "wheelbearings", title: "Замена подшипников колеса", area: null, time: "1 ч", diff: "средне", tools: ["Выколотка", "Молоток", "Оправка по наружному кольцу"], parts: ["wheelbearing", "wheelseal"],
    steps: ["Сними колесо, вынь сальники и втулки.", "Выбей первый подшипник через ступицу, отодвинув распорную втулку в сторону.", "Выбей распорку и второй подшипник.", "Новые подшипники запрессовывай строго по наружному кольцу, сначала один, потом распорку и второй.", "Новые сальники, смазка, установка колеса, затяжка оси по моменту."] },
  { id: "tube", title: "Замена камеры в поле", area: null, time: "40 мин", diff: "средне", tools: ["Монтажки 2–3 шт.", "Насос или CO2", "Ключ на ось"], parts: ["tube", "tirelevers"],
    steps: ["Сними колесо, выкрути золотник ниппеля, отпусти бортзамок.", "Наступи на покрышку, чтобы борт ушёл в центр обода, — так монтажкам легче.", "Сними одну сторону покрышки монтажками маленькими шагами, вынь камеру.", "Проверь покрышку изнутри на шип или гвоздь.", "Чуть подкачанную камеру заправь внутрь, вставь ниппель, борт ставь от ниппеля, не зажимая камеру монтажками.", "Накачай, проверь посадку борта, затяни бортзамок и гайку ниппеля."] },
  { id: "coil-test", title: "Проверка зажигания мультиметром", area: "spark", time: "30 мин", diff: "средне", tools: ["Мультиметр", "Тестер искры"], parts: ["coil", "cdi", "multimeter"],
    steps: ["Проверь искру тестером или запасной свечой: синяя — норма, жёлтая слабая — проблема.", "Катушка, первичная обмотка: обычно 0.2–1 Ом.", "Вторичная (от колпачка до массы): несколько кОм, обрыв — катушка или колпачок неисправны.", "Пикап: несколько сотен Ом, без замыкания на массу.", "CDI мультиметром не проверить — только подменой исправным."] },
  { id: "headgasket", title: "Замена прокладки ГБЦ (воздушник)", area: "cyl", time: "3–4 ч", diff: "сложно", only: ["air"], tools: ["Динамометрический ключ", "Ключи", "Шабер пластиковый"], parts: ["headgasket", "basegasket", "vcgasket"],
    steps: ["Выставь ВМТ такта сжатия по меткам, сними натяжитель цепи ГРМ.", "Сними звезду распредвала, подвязав цепь проволокой, чтобы не упала в картер.", "Ослабь гайки головки крест-накрест в 2–3 приёма, сними головку.", "Очисти плоскости без царапин. Проверь головку на ровность линейкой.", "Новая прокладка, гайки затягивай крест-накрест в 2–3 приёма до момента из мануала.", "Собери ГРМ строго по меткам, проверни мотор рукой два оборота, отрегулируй клапаны ({valveIn}/{valveEx})."] },
  { id: "reed", title: "Проверка лепесткового клапана 2T", area: "carb", time: "1 ч", diff: "средне", only: ["2t"], tools: ["Ключи", "Фонарик"], parts: ["reed", "reedpetals"],
    steps: ["Сними карбюратор и впускной патрубок.", "Вынь лепестковый клапан, посмотри на просвет.", "Лепестки должны прилегать плотно, без трещин и сколов краёв.", "Трещина или щель больше 0.2 мм — меняй лепестки.", "Собери на новой прокладке."] },
  { id: "pv-clean", title: "Чистка клапана выпуска 2T", area: "exhaust", time: "1.5 ч", diff: "средне", only: ["2t"], tools: ["Ключи", "Очиститель нагара", "Щётка"], parts: ["pv"],
    steps: ["Сними крышку механизма клапана выпуска сбоку цилиндра.", "Вынь заслонки, запомни их положение.", "Очисти нагар, не царапая рабочие поверхности.", "Проверь, что механизм ходит свободно.", "Собери, смажь и проверь ход рукой."] },
  { id: "ford", title: "Брод: подготовка и если мотор хлебнул воды", area: "cyl", time: "—", diff: "средне", tools: ["Свечной ключ", "Запасная свеча"], parts: ["spark", "oil", "breather"],
    steps: ["Перед бродом: выведи сапуны карбюратора, бака и картера повыше.", "Проходи на средних оборотах без остановки, не сбрасывая газ в воде.", "Если заглох в воде — не пытайся завести! Выкати на берег.", "Слей воду из воздушного фильтра и airbox, выкрути свечу.", "Положи мотоцикл на бок задним колесом вверх и прокрути мотор без свечи, пока не перестанет выплёскивать воду.", "Заведи. Дома проверь масло: если мутное — менять, лучше два раза подряд."] },
  { id: "fieldkit", title: "Что брать с собой в лес", area: null, time: "—", diff: "просто", tools: [], parts: ["tube", "tirelevers", "trip", "spark"],
    steps: ["Ключи 8, 10, 12, 13, 17, шестигранники 4–6, свечной ключ.", "Запасная камера (21\" подходит и на заднее колесо на время), монтажки, насос или CO2.", "Запасная свеча {spark}, трос сцепления, рычаги.", "Стяжки, изолента, проволока, кусок троса.", "Буксировочный ремень, аптечка, вода, заряженный телефон.", "Сообщи кому-нибудь маршрут."] },
  { id: "throttle-cable", title: "Замена и регулировка троса газа", area: "carb", time: "40 мин", diff: "средне", tools: ["Ключи", "Отвёртка"], parts: ["throttle"],
    steps: ["Сними крышку ручки газа и крышку карбюратора/дросселя.", "Отсоедини старый трос, запомни прокладку по раме.", "Проложи новый так же — без перегибов, с запасом на поворот руля.", "Свободный ход ручки 2–3 мм.", "Проверь: поверни руль влево-вправо — обороты холостых не должны меняться, газ возвращается сам."] },
  { id: "oilcooler", title: "Установка маслорадиатора", area: "cooling", time: "1.5 ч", diff: "средне", only: ["air"], tools: ["Ключи", "Хомуты", "Новые медные шайбы"], parts: ["oilcooler", "oil"],
    steps: ["Купи комплект именно под {name}: есть варианты через пробку на головке или через крышку фильтра.", "Закрепи радиатор на раме перед двигателем, чтобы он обдувался.", "Проложи шланги без перегибов, подальше от выхлопной трубы.", "Подключи по инструкции комплекта, все соединения — на новых шайбах.", "Долей масло: объём вырастет на 0.1–0.3 л. Заведи, проверь утечки и уровень."] }
);

/* --- ещё неисправности для справочника --- */
FAULTS.push(
  { s: "Тяжело заводится на горячую", c: ["Зажаты клапаны", "Богатая смесь", "CDI или катушка на горячую"], area: "head" },
  { s: "Глохнет на ходу и потом заводится", c: ["Сапун бака", "CDI на горячую", "Кнопка глушения / датчики"], area: "spark" },
  { s: "Чихает в карбюратор", c: ["Бедная смесь", "Зажат впускной клапан", "Подсос воздуха"], area: "carb" },
  { s: "Сцепление «рвёт» при трогании", c: ["Коробление дисков", "Износ корзины (выработка пазов)", "Старое масло"], area: "clutch" },
  { s: "Не держит давление шина", c: ["Прокол", "Ниппель или золотник", "Бортзамок порвал камеру"], area: null },
  { s: "Не работает спидометр", c: ["Датчик или трос спидометра", "Разъём у колеса", "Предохранитель"], area: "gen" },
  { s: "Горит лампа масла (если есть)", c: ["Мало масла", "Датчик давления", "Износ насоса"], area: "oil" },
  { s: "Вода в фаре или приборке", c: ["Нет герметика", "Трещина корпуса"], area: "gen" }
);

/* уточнение совместимости после добавления Z155 */
(function () {
  function setFit(id, fit) { var p = PARTS.find(function (x) { return x.id === id; }); if (p) p.fit = fit; }
  setFit("sp-a7tc", ["139FMB", "152FMH", "154FMI"]);
  setFit("sp-d8tc", ["cg", "CB150", "Z190", "Z155", "1P60FMK", "YX140", "1P56FMJ"]);
  setFit("ch-428", ["154FMI", "YX140", "1P60FMK", "1P56FMJ", "Z190", "Z155", "CG150", "CG200", "CB150"]);
  setFit("pwk28", ["1P60FMK", "YX140", "Z190", "Z155", "CB150"]);
  setFit("pe24", ["YX140", "1P56FMJ", "1P60FMK", "Z155"]);
})();
/* ===================== v5: ходовая, аналоги, ТО-наборы ===================== */

/* --- детали ходовой и рамы --- */
[
  ["ax-f", "Ось переднего колеса", 1400, "Подвеска", "axleF"], ["ax-r", "Ось заднего колеса", 1600, "Подвеска", "axleR"],
  ["ch-adj", "Натяжители цепи (пара)", 900, "Трансмиссия", "chainadj"], ["link-rod", "Тяга прогрессии", 2200, "Подвеска", "linkrod"],
  ["link-rock", "Качалка прогрессии", 3200, "Подвеска", "linkrocker"], ["clamp-lo", "Траверса нижняя со штоком", 6500, "Подвеска", "clamp"],
  ["clamp-up", "Траверса верхняя", 4800, "Подвеска", "clamp"], ["fork-leg", "Перо вилки в сборе", 12000, "Подвеска", "forkleg"],
  ["shock-boot", "Пыльник амортизатора", 600, "Подвеска", "shockboot"], ["mask", "Маска с фарой", 3200, "Рама", "mask"],
  ["side-pl", "Боковины номера (пара)", 2400, "Рама", "sideplates"], ["shrouds", "Обтекатели бака (пара)", 2800, "Рама", "shrouds"],
  ["tank", "Бак топливный", 6500, "Рама", "tank"], ["mudguard", "Брызговик заднего колеса", 900, "Рама", "mudguard"],
  ["grab", "Ручка-рукоятка задняя", 1200, "Рама", "grab"], ["frame-rub", "Резинки и втулки рамы (комплект)", 500, "Рама", "framerubber"],
  ["cal-br", "Кронштейн переднего суппорта", 1500, "Тормоза", "caliperbracket"], ["mc-r", "Задний главный тормозной цилиндр", 2600, "Тормоза", "mastercylR"],
  ["peg-spr", "Пружины и пальцы подножек", 400, "Рама", "pegspring"], ["horn", "Сигнал (клаксон)", 600, "Электрика", "horn"],
  ["dash", "Приборная панель", 4500, "Электрика", "dash"], ["sp-cable", "Трос спидометра", 450, "Электрика", "speedocable"],
  ["kill-cdi", "Разъёмы и клеммы (набор)", 500, "Электрика", "connectors"], ["wire", "Провод и термоусадка (набор)", 600, "Электрика", "wireset"],
  ["fork-guard", "Защита перьев вилки", 1600, "Защита", "forkguards"], ["lever-guard", "Защита рычагов с алюминиевой основой", 4200, "Защита", "handguards2"],
  ["peg-wide", "Подножки широкие стальные", 2800, "Рама", "pegs2"], ["seat-cover", "Чехол сиденья (гриппер)", 2200, "Рама", "seatcover"],
  ["tank-cap2", "Крышка бака с клапаном", 1100, "Рама", "tankcap2"], ["rim-tape", "Ободная лента (пара)", 500, "Колёса", "rimtape"]
].forEach(function (x) { PARTS.push(P(x[0], x[1], x[2], x[3], x[4])); });

/* --- аналоги и размеры --- */
var PART_INFO = {
  "sp-a7tc": "Аналоги: Torch A7TC, NGK C7HSA, Denso U22FS-U", "sp-d8tc": "Аналоги: Torch D8TC, NGK D8RTC",
  "sp-d8ea": "Аналоги: Denso X24ES-U, Champion RA8HC, Torch D8TC", "sp-cr8e": "Аналоги: Denso U24ESR-N, Champion RG4HC",
  "sp-br8": "Аналоги: Denso W24ESR-U, Champion RN3C", "b6301": "Размер 12×37×12 мм", "b6302": "Размер 15×42×13 мм",
  "b6203": "Размер 17×40×12 мм", "b6004": "Размер 20×42×12 мм", "ch-420": "Шаг 12.7 мм, ширина ролика 6.35 мм",
  "ch-428": "Шаг 12.7 мм, ширина ролика 7.94 мм", "ch-520": "Шаг 15.875 мм, ширина ролика 6.35 мм", "ch-520x": "Шаг 15.875 мм, X-ring уплотнения",
  "tire21": "Камера 80/100-21 или 90/90-21", "tire18": "Камера 110/100-18 или 4.00-18", "tire17p": "Камера 2.50/2.75-17", "tire14p": "Камера 3.00-14",
  "oil-1040": "Допуск JASO MA или MA2, API SL и выше", "oil-1050": "Допуск JASO MA2", "bf": "Не смешивать с DOT-5 (силикон)",
  "pz30": "Посадка 30 мм, для 200–250 2V", "pe30": "Посадка 30 мм, ускорительного насоса нет", "pwk34": "С ускорительным насосом, посадка 34–36 мм"
};
PARTS.forEach(function (p) { if (PART_INFO[p.id]) p.info = PART_INFO[p.id]; });

/* --- ещё симптомы и причины --- */
(function () {
  function addSym(cat, items) { var g = SYMPTOMS.find(function (x) { return x.cat === cat; }); items.forEach(function (i) { g.items.push(i); }); }
  addSym("Как едет", [["revhang", "Обороты долго не падают"], ["coldnorev", "На холодную не набирает обороты"]]);
  addSym("Звуки", [["squeal", "Визг или скрип при торможении"], ["clunk", "Стук в подвеске"]]);
  addSym("Температура и жидкости", [["burnsmell", "Запах гари"]]);
  addSym("Электрика", [["nolights", "Не работают поворотники или сигнал"], ["fusesblow", "Горят предохранители"]]);
  addSym("Ходовая", [["pull", "Уводит в сторону, тяжёлый руль"], ["brakerear", "Плохо тормозит задний"], ["wobble", "Виляет на скорости"]]);
  function addW(id, w) { var c = CAUSES.find(function (x) { return x.id === id; }); Object.keys(w).forEach(function (k) { c.w[k] = w[k]; }); }
  addW("airleak", { revhang: 3 }); addW("lean", { revhang: 2, coldnorev: 3 }); addW("pilotjet", { coldnorev: 2 });
  addW("efisensor", { coldnorev: 2, revhang: 2 }); addW("pads", { squeal: 4, brakerear: 3 }); addW("brakeair", { brakerear: 2 });
  addW("clutchworn", { burnsmell: 4 }); addW("forkseal", { clunk: 1 }); addW("wheel", { wobble: 3 }); addW("ground", { nolights: 2 });
  CAUSES.push(
    C("throttlecable", "Трос газа тугой, натянут или закис", "carb", { revhang: 5, idle: 2 }, { check: ["Ручка газа возвращается сама и быстро?", "Поверни руль влево-вправо: обороты растут — трос натянут."], fix: "Смазать или заменить трос, выставить свободный ход 2–3 мм.", parts: ["throttle"], guide: "throttle-cable" }),
    C("brakedirty", "Грязный или подклинивающий суппорт", null, { squeal: 4, brakerear: 3, burnsmell: 2, brakesoft: 1 }, { check: ["Колесо крутится туго, диск горячий после поездки?"], fix: "Чистка суппорта, смазка направляющих, при необходимости ремкомплект.", parts: ["caliperkit", "brakecleaner"], work: "Переборка суппорта", guide: "brake-clean" }),
    C("linkage", "Износ подшипников прогрессии и маятника", null, { clunk: 5, pull: 1 }, { check: ["Подними заднее колесо и покачай его вверх-вниз и вбок — есть люфт?"], fix: "Обслуживание или замена подшипников прогрессии и маятника.", parts: ["linkage", "grease2"], work: "Обслуживание прогрессии и маятника", guide: "linkage" }),
    C("steeringbear", "Рулевые подшипники", null, { clunk: 3, wobble: 3, pull: 3 }, { check: ["Руль «щёлкает» в центре или туго поворачивается?", "Стук при торможении передним?"], fix: "Регулировка или замена подшипников рулевой.", parts: ["steering"], work: "Замена подшипников рулевой", guide: "steering" }),
    C("forkoilold", "Старое или ушедшее масло в вилке", null, { clunk: 2, forkleak: 2, pull: 1 }, { check: ["Вилка пробивается и «стучит» на кочках?"], fix: "Замена масла в вилке, проверка уровня.", parts: ["forkoil"], work: "Замена масла в вилке", guide: "fork-oil" }),
    C("flasher", "Реле поворотов, лампы или кнопки", "gen", { nolights: 5 }, { check: ["Не работает одна сторона — лампа или контакт. Обе — реле или предохранитель."], fix: "Заменить реле (под LED нужно электронное), проверить кнопки.", parts: ["flasher", "turns", "switches"] }),
    C("short", "Замыкание проводки (перетёрся провод)", "gen", { fusesblow: 5, batdrain: 2, lights: 1 }, { cond: { rain: 2, afterwork: 2 }, sev: "high", check: ["Сгорает предохранитель сразу или при повороте руля?", "Осмотри жгут у рулевой колонки и под баком."], fix: "Найти перетёртый провод, заизолировать, закрепить жгут.", parts: ["wireset", "fuse"] }),
    C("tirepressure", "Давление в шинах или износ резины", null, { pull: 4, wobble: 3, vibe: 1 }, { check: ["Давление по манометру: эндуро по лесу 0.8–1.0 бар, по асфальту 1.5–1.8."], fix: "Выставить давление, при сильном износе — заменить покрышку.", parts: ["tiregauge", "tireR"] }),
    C("wheelalign", "Заднее колесо стоит криво", null, { pull: 3, wobble: 2 }, { cond: { afterwork: 3 }, check: ["Метки натяжителей цепи слева и справа совпадают?"], fix: "Выставить колесо по меткам и по ровной рейке.", parts: ["chainadj"], guide: "chain" }),
    C("spokesloose", "Ослабли спицы", null, { wobble: 4, vibe: 2, clunk: 2 }, { check: ["Простучи спицы ключом: глухой звук — ослабла."], fix: "Протянуть спицы, проверить восьмёрку.", parts: ["spokes"], guide: "spokes" }),
    C("exhaustplastic", "Что-то плавится на выпуске", "exhaust", { burnsmell: 3 }, { check: ["Пластик, трава, тряпка или ботинок касаются коллектора или глушителя?"], fix: "Убрать, поставить термозащиту." })
  );
})();

/* --- ещё инструкции --- */
GUIDES.push(
  { id: "fork-oil", title: "Замена масла в вилке", area: null, time: "1.5 ч", diff: "средне", tools: ["Ключи", "Мерный стакан", "Линейка"], parts: ["forkoil"],
    steps: ["Подними перед, ослабь пробки перьев в верхней траверсе, пока перья зажаты.", "Сними перо, открути пробку, вынь пружину — запомни, какой стороной она стояла.", "Слей старое масло, качая трубу 10–15 раз, чтобы вышло всё.", "Залей свежее масло 5W–10W, прокачай перо, пока не перестанут выходить пузыри.", "Выставь уровень по мануалу (обычно 100–150 мм от края трубы без пружины), одинаково на обеих сторонах.", "Поставь пружину и пробку, установи перо на прежнюю высоту в траверсах."] },
  { id: "linkage", title: "Обслуживание прогрессии и маятника", area: null, time: "2–3 ч", diff: "средне", only: ["big"], tools: ["Ключи", "Выколотка", "Водостойкая смазка"], parts: ["linkage", "grease2"],
    steps: ["Поставь мотоцикл на подставку, сними заднее колесо.", "Открути болты тяг и качалки прогрессии, затем ось маятника.", "Выбей втулки, промой подшипники, осмотри иглы — ржавчина или выработка значит замену.", "Набей водостойкую смазку, поставь пыльники.", "Собери, затяни оси по моменту, проверь, что маятник ходит без закусываний."] },
  { id: "brake-clean", title: "Чистка тормозного суппорта", area: null, time: "1 ч", diff: "средне", tools: ["Ключи", "Очиститель тормозов", "Щётка"], parts: ["brakecleaner", "caliperkit"],
    steps: ["Сними колодки, промой суппорт очистителем тормозов.", "Аккуратно выдави поршни рычагом на 3–5 мм, очисти их видимую часть от грязи.", "Утопи поршни обратно, проверь, что ходят равномерно.", "Смажь направляющие суппорта высокотемпературной смазкой (на колодки и диск — нельзя!).", "Поставь колодки и прокачай рычаг до упругости."] },
  { id: "spokes", title: "Протяжка спиц", area: null, time: "1 ч", diff: "средне", tools: ["Ключ для спиц", "Подставка"], parts: ["spokes"],
    steps: ["Подними колесо, простучи каждую спицу ключом: звонкий звук — норма, глухой — ослабла.", "Подтягивай понемногу — на пол-оборота, через одну спицу по кругу.", "Следи за восьмёркой: прижми отвёртку к перу или маятнику рядом с ободом и смотри зазор.", "Не перетягивай ниппель у бортзамка — там чаще всего рвётся камера.", "После первой поездки проверь ещё раз."] },
  { id: "idle-set", title: "Регулировка холостого хода карбюратора", area: "carb", time: "15 мин", diff: "просто", only: ["carb"], tools: ["Отвёртка", "Тахометр (если есть)"], parts: [],
    steps: ["Прогрей мотор 5–10 минут.", "Упорным винтом выставь обороты чуть выше нормы.", "Винтом качества найди положение с максимальными и самыми ровными оборотами.", "Упорным винтом опусти обороты до {idle}.", "Резко газани пару раз: обороты должны возвращаться быстро, без провала и зависания."] },
  { id: "csseal", title: "Замена сальника у передней звезды", area: "gearbox", time: "1 ч", diff: "средне", tools: ["Ключи", "Крючок для сальников"], parts: ["csseal", "sprocketF"],
    steps: ["Сними крышку передней звезды, ослабь цепь и сними звезду.", "Сними распорную втулку, осмотри её: выработка — тоже менять.", "Подцепи старый сальник крючком, не царапая вал и корпус.", "Смажь новый сальник маслом и запрессуй ровно до упора.", "Собери в обратном порядке, долей масло до уровня."] },
  { id: "stator-replace", title: "Замена статора генератора", area: "gen", time: "1.5 ч", diff: "средне", tools: ["Ключи", "Новая прокладка крышки"], parts: ["stator", "gengasket"],
    steps: ["Слей часть масла или наклони мотоцикл на правый бок.", "Отсоедини разъём статора, сними крышку генератора — статор прикручен к ней изнутри.", "Открути статор и датчик пикапа, сними старый.", "Поставь новый на фиксатор резьбы, проложи провода как было.", "Крышку — на новую прокладку, проверь зарядку: 13.5–14.5 В на 5000 об/мин."] },
  { id: "carb-sync", title: "Подбор главного жиклёра по свече", area: "carb", time: "2 ч", diff: "средне", only: ["carb"], tools: ["Набор жиклёров", "Свечной ключ", "Новая свеча"], parts: ["jets", "spark"],
    steps: ["Начни с жиклёра на 5 больше, чем стоит сейчас ({jetMain}) — бедно опаснее, чем богато.", "Новая чистая свеча. Прогрей мотор, затем на ровном участке 10–15 секунд полный газ на 3–4 передаче.", "Не сбрасывая газ, выжми сцепление и заглуши кнопкой. Докатись.", "Выкрути свечу: светло-коричневая изоляция — норма, белая — жиклёр больше, чёрная — меньше.", "Меняй на один шаг и повторяй. Найденный размер запиши в «Мой мотоцикл → Настроить»."] }
);

/* --- узлы ходовой для вида «Мотоцикл» --- */
var CH_AREAS = {
  engine:   { t: "Двигатель", hint: "Открой вид «Двигатель», чтобы посмотреть узлы мотора." },
  fork:     { t: "Вилка", kinds: ["forkseals", "forkdust", "forkoil", "forkbush", "forksprings", "forkleg", "forkguards"], guides: ["fork-oil", "forkseals", "sag"], causes: ["forkseal", "forkoilold"],
              tips: ["Масло меняй раз в сезон — старое пенится и вилка «пробивается».", "После мойки протирай трубы: грязь под пыльником убивает сальники.", "Подъём перьев в траверсах на 5 мм делает руль резче, опускание — стабильнее."] },
  shock:    { t: "Амортизатор и прогрессия", kinds: ["shock", "shockseal", "shockspring", "linkage", "swingbush", "swingaxle", "shockboot"], guides: ["sag", "linkage"], causes: ["linkage"],
              tips: ["Рабочий провис для эндуро 250–300 — около 95–105 мм.", "Прогрессию смазывай перед сезоном — подшипники ржавеют от воды.", "Течёт масло по штоку — нужен сервис амортизатора."] },
  brakes:   { t: "Тормоза", kinds: ["padsF", "padsR", "brakefluid", "brakehose", "caliperkit", "mastercyl", "brakedisc", "brakediscR", "mastercylR"], guides: ["pads", "brakes-bleed", "brake-clean"], causes: ["brakeair", "pads", "brakedirty"],
              tips: ["Колодки меняй при остатке накладки меньше 1.5 мм.", "Тормозная жидкость впитывает воду — меняй раз в год.", "Для грязи лучше синтерированные колодки."] },
  wheels:   { t: "Колёса и шины", kinds: ["tireF", "tireR", "tube", "rimlock", "mousse", "spokes", "wheelbearing", "rimtape"], guides: ["tube", "wheelbearings", "spokes"], causes: ["tirepressure", "spokesloose", "wheel"],
              tips: ["Давление: лес и грязь 0.8–1.0 бар, камни 1.0–1.2, асфальт 1.5–1.8.", "Бортзамок ставь при низком давлении — иначе вырвет ниппель.", "Спицы проверяй после каждого жёсткого выезда."] },
  chain:    { t: "Цепь и звёзды", kinds: ["chain", "sprocketF", "sprocketR", "chainlube", "chainclean", "chainroller", "chainguide", "swingslider", "chainadj"], guides: ["chain", "chain-replace"], causes: ["wheelalign"],
              tips: ["Провис 30–40 мм в самом тугом месте.", "Смазка каждые 300–500 км и после каждой грязи и воды.", "Цепь и звёзды меняются только комплектом."] },
  cockpit:  { t: "Руль и управление", kinds: ["levers", "clutchcable", "throttle", "grips", "handlebar", "handguards", "throttlehousing"], guides: ["clutch-cable", "throttle-cable", "steering"], causes: ["throttlecable", "steeringbear", "clutchadj"],
              tips: ["Свободный ход рычага сцепления 10–15 мм, газа 2–3 мм.", "Рычаги поверни чуть вниз и затяни так, чтобы при падении проворачивались.", "Руль «щёлкает» в центре — рулевые подшипники."] },
  electric: { t: "Свет и электрика", kinds: ["headlight", "taillight", "turns", "flasher", "battery", "fuse", "switches", "horn", "ignswitch"], guides: ["charging", "coil-test"], causes: ["flasher", "short", "regulator", "batt"],
              tips: ["Разъёмы после мойки обрабатывай диэлектрической смазкой.", "Под LED-поворотники нужно электронное реле.", "Зарядка исправна, если на 5000 об/мин на АКБ 13.5–14.5 В."] },
  frame:    { t: "Рама, пластик и защита", kinds: ["skid", "frameguard", "swingguard", "discguard", "plastic", "seat", "pegs", "shrouds", "sideplates", "framerubber"], guides: ["winter"], causes: ["mounts"],
              tips: ["Защита картера — первое, что стоит поставить на эндуро.", "Протягивай болты подножек и крепления мотора раз в сезон.", "Трещину рамы видно по полоске ржавчины — сварку доверь сервису."] }
};

/* --- наборы для ТО: пункт → детали и работа --- */
var TO_KITS = {
  oil: { kinds: ["oil", "oilfilter", "drainplug"], work: "Замена масла и фильтра", qtyOil: true },
  air: { kinds: ["filteroil"], work: "Чистка и пропитка воздушного фильтра" },
  chain: { kinds: ["chainlube", "chainclean"] },
  valves: { kinds: ["vcgasket"], work: "Регулировка клапанов (винты)", workDohc: "Регулировка клапанов (шайбы, DOHC)" },
  spark: { kinds: ["spark"], work: "Замена свечи" },
  fork: { kinds: ["forkoil"], work: "Замена масла в вилке" },
  camchain: { kinds: [], work: null },
  coolant: { kinds: ["coolant"], work: "Замена антифриза с прокачкой" },
  gear: { kinds: ["gearoil"], work: "Замена масла и фильтра" },
  reed: { kinds: ["reedpetals"], work: "Обслуживание лепесткового клапана" },
  pv: { kinds: ["pv"], work: "Чистка клапана выпуска 2T" },
  piston: { kinds: ["piston", "basegasket"], work: "Замена поршня 2T" }
};

/* --- цвета пластика --- */
var PLASTIC = [["#D7262E", "Красный"], ["#F28C1A", "Оранжевый"], ["#F2C200", "Жёлтый"], ["#1F6FD1", "Синий"], ["#2E9E5B", "Зелёный"], ["#ECEFF1", "Белый"], ["#2A2F35", "Чёрный"], ["#7B3FB8", "Фиолетовый"]];
function plasticFor(bike, cu) {
  if (cu && cu.color) return cu.color;
  var h = 0, s = bike.brand; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return PLASTIC[h % PLASTIC.length][0];
}

/* --- ещё доработки --- */
TUNING.push(
  { id: "fork-guards", cat: "Защита", title: "Защита перьев вилки", stage: 1, power: 0, price: 1600, diff: "просто", rating: 4.5, fit: ["big"], body: "Камни не бьют трубы — сальники живут дольше." },
  { id: "seat-gripper", cat: "Управление", title: "Чехол сиденья с грипп-покрытием", stage: 1, power: 0, price: 2200, diff: "просто", rating: 4.4, body: "Не скользишь назад при разгоне и в подъём." },
  { id: "dash-gps", cat: "Электрика", title: "Держатель телефона и навигация", stage: 1, power: 0, price: 1800, diff: "просто", rating: 4.3, body: "Маршрут и трек всегда перед глазами." },
  { id: "chain-tensioner", cat: "Трансмиссия", title: "Ролик-успокоитель цепи с подшипником", stage: 1, power: 0, price: 1200, diff: "просто", rating: 4.2, fit: ["big"], body: "Меньше шума и износа цепи на кочках." }
);
(function () { var m = { "fork-guards": 4, "seat-gripper": 2 }; var f = GOAL_W.forest; GOAL_W.forest = function (t) { return f(t) + (m[t.id] || 0); }; var c = GOAL_W.comfort; var cm = { "seat-gripper": 4, "dash-gps": 5, "chain-tensioner": 1 }; GOAL_W.comfort = function (t) { return c(t) + (cm[t.id] || 0); }; var r = GOAL_W.reliable; var rm = { "fork-guards": 3, "chain-tensioner": 3 }; GOAL_W.reliable = function (t) { return r(t) + (rm[t.id] || 0); }; })();

/* --- ещё неисправности для справочника --- */
FAULTS.push(
  { s: "Визг тормоза", c: ["Остекленевшие колодки", "Грязь в суппорте", "Колодки без противоскрипной пластины"], area: null },
  { s: "Стук в подвеске", c: ["Подшипники прогрессии", "Рулевые подшипники", "Ослабли болты траверс"], area: null },
  { s: "Виляет на скорости", c: ["Давление в шинах", "Ослабли спицы", "Колесо стоит криво", "Рулевые подшипники"], area: null },
  { s: "Горят предохранители", c: ["Перетёрся провод у руля", "Замыкание в фаре или поворотнике", "Неисправный регулятор"], area: "gen" },
  { s: "Обороты не падают", c: ["Трос газа натянут", "Подсос воздуха", "Не закрыт подсос"], area: "carb" }
);
/* ===================== v6: модельные ряды, CB300F, советы, достижения ===================== */
ENGINES["175FMM"] = { id: "175FMM", code: "ZS175FMM", name: "Zongshen CB300F (ZS175FMM)", maker: "Zongshen", groups: ["cb", "air", "carb", "4t", "big"],
  stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушно-масляное", cc: 276, hp: 25, torque: "22 Н·м", compression: "10–12 бар",
  fuel: "АИ-92 / АИ-95", ignition: "CDI", timing: "Цепь ГРМ, автонатяжитель", start: "Электро + кик", gearbox: "5 ст.",
  carb: "PZ30 / NIBBI PE30", jetMain: "115–125", jetPilot: "38–40", needle: "3 канавка", idle: "1400–1600",
  valveIn: "0.05–0.08 мм", valveEx: "0.08–0.10 мм", spark: "D8EA (DR8EA)", gap: "0.6–0.7 мм", sparkTorque: "15–18 Н·м",
  oil: "10W-40 (JASO MA)", oilVol: "1.2–1.3 л", oilInt: 1500, valveInt: 3000,
  issues: [
    { t: "Перегрев при медленной езде в грязи", sev: "high", fix: "Маслорадиатор, не беднить смесь." },
    { t: "Клапаны зажимаются к 3–5 тыс. км", sev: "med", fix: "Регулировка каждые 3000 км на холодную." },
    { t: "Вибрации на высоких оборотах", sev: "low", fix: "Проверять крепёж мотора, подножек и бака." }
  ] };
(function () {
  var e = ENGINES["175FMM"], k = engClass(e), fit = ["175FMM"];
  function add(slug, name, base, cat, kind) { PARTS.push(P("175FMM-" + slug, name + " ZS175FMM", r50(base * k), cat, kind, fit)); }
  [["pis", "Поршневая группа", 4200, "Двигатель", "piston"], ["rings", "Кольца поршневые", 1200, "Двигатель", "rings"], ["cyl", "Цилиндр в сборе", 5500, "Двигатель", "cylinder"],
   ["gskt", "Комплект прокладок двигателя", 1400, "Двигатель", "gasketset"], ["bg", "Прокладки цилиндра", 450, "Двигатель", "basegasket"], ["seals", "Сальники двигателя (комплект)", 700, "Двигатель", "engseals"],
   ["crank", "Коленвал в сборе", 8500, "Двигатель", "crank"], ["clutch", "Диски сцепления", 2600, "Трансмиссия", "clutchdiscs"], ["stator", "Статор генератора", 2800, "Электрика", "stator"],
   ["starter", "Стартер", 3500, "Электрика", "starter"], ["hg", "Прокладка ГБЦ", 350, "Двигатель", "headgasket"], ["chain", "Цепь ГРМ", 1500, "Двигатель", "camchain"],
   ["tens", "Натяжитель цепи ГРМ", 900, "Двигатель", "tensioner"], ["guide", "Успокоители цепи ГРМ", 800, "Двигатель", "guide"], ["vin", "Клапан впускной", 900, "Двигатель", "valvein"],
   ["vex", "Клапан выпускной", 1100, "Двигатель", "valveex"], ["cam", "Распредвал", 3200, "Двигатель", "camshaft"], ["head", "Головка цилиндра в сборе", 9500, "Двигатель", "head"],
   ["pump", "Масляный насос", 1600, "Двигатель", "oilpump"], ["cgsk", "Прокладка крышки сцепления", 300, "Двигатель", "clutchgasket"], ["ggsk", "Прокладка крышки генератора", 300, "Двигатель", "gengasket"],
   ["rotor", "Ротор генератора (маховик)", 3800, "Электрика", "rotor"], ["basket", "Корзина сцепления в сборе", 5500, "Трансмиссия", "clutchbasket"], ["cbear", "Подшипники коленвала (пара)", 1600, "Двигатель", "crankbearings"],
   ["gears", "Шестерни КПП (комплект)", 9000, "Трансмиссия", "gears"], ["forks", "Вилки и барабан переключения", 3500, "Трансмиссия", "shiftforks"], ["csseal", "Сальник вторичного вала (у звезды)", 250, "Трансмиссия", "csseal"],
   ["studs", "Шпильки цилиндра (комплект)", 900, "Двигатель", "studs"], ["sprag", "Обгонная муфта стартера", 2400, "Электрика", "sprag"], ["rock", "Коромысла с осями", 1800, "Двигатель", "rockers"],
   ["tkit", "Ремкомплект натяжителя ГРМ", 600, "Двигатель", "tenskit"], ["igsk", "Прокладка/проставка впуска", 350, "Топливо", "intakegasket"]].forEach(function (x) { add.apply(null, x); });
  PARTS.filter(function (p) { return ["sp-d8ea", "of-mesh", "rk-pe30", "pz30", "pe30", "nibbi-pe30", "pwk32", "cdi6"].indexOf(p.id) >= 0 && p.fit; }).forEach(function (p) { if (p.fit.indexOf("175FMM") < 0 && p.fit.indexOf("cb") < 0) p.fit.push("175FMM"); });
})();

/* --- правки по уточнённым данным --- */
(function () {
  function fix(brand, name, f) { var b = BIKES.find(function (x) { return x.brand === brand && x.name === name; }); if (b) f(b); }
  function setEng(v, id, extra) { v.engine = id; v.label = ENGINES[id].code + ", " + ENGINES[id].cc + " см³"; Object.assign(v, extra || {}); }
  fix("Motoland", "XR250 Enduro", function (b) { setEng(b.versions[0], "165FMM"); });
  fix("Progasi", "Palma 300", function (b) { setEng(b.versions[0], "175FMM", { carb: "PZ30" }); });
  fix("Progasi", "Palma 300 NG", function (b) { setEng(b.versions[0], "175FMM", { carb: "PZ30" }); });
  fix("Progasi", "Super Max 300", function (b) { setEng(b.versions[0], "175FMM", { carb: "NIBBI PE30" }); });
  fix("Progasi", "Smart 150", function (b) { b.type = "Питбайк"; setEng(b.versions[0], "1P60FMK", { approx: true }); });
  fix("Avantis", "FX 250", function (b) { setEng(b.versions[0], "172FMM-3A", { carb: "NIBBI PE30" }); });
  ["Sharmax|Enduro 250", "Sharmax|Enduro 300"].forEach(function (k) { var p = k.split("|"); var i = BIKES.findIndex(function (x) { return x.brand === p[0] && x.name === p[1]; }); if (i >= 0) BIKES.splice(i, 1); });
  ["Zuumav", "Kews", "Tekken", "Kovi", "Geon", "Минск", "Mikilon", "JMC", "YCF", "Apollo", "Xmotos", "Baltmotors", "Shineray", "Loncin", "Zongshen", "GR7", "GR2", "Ataki", "Wels"].forEach(function (br) {
    BIKES.forEach(function (b) { if (b.brand === br) b.versions.forEach(function (v) { v.approx = true; }); });
  });
})();

/* --- новые модели: [марка, модель, тип, мотор, {доп}] ; approx — мотор не подтверждён --- */
(function () {
  var E = "Эндуро", P = "Питбайк", M = "Мотард", T = "Тур-эндуро", L = "Лёгкий эндуро", A = { approx: true };
  var add = addBike;
  /* Sharmax */
  add("Sharmax", "Sport 190", P, "Z190", A); add("Sharmax", "Sport 230", E, "167FMM", A); add("Sharmax", "Sport 250", E, "172FMM-3A");
  add("Sharmax", "Sport 280", E, "NB300", A); add("Sharmax", "Sport 300 Air", E, "PR300", A); add("Sharmax", "Sport 320", E, "NB300", A);
  add("Sharmax", "PowerMax 250", E, "172FMM-3A"); add("Sharmax", "PowerMax 300", E, "NB300", A); add("Sharmax", "PowerMax 300 Air", E, "PR300", A);
  add("Sharmax", "PowerMax 330", E, "NB300", A); add("Sharmax", "Tour Enduro 300", T, "PR300", A);
  /* Motoland */
  add("Motoland", "CRF250 Enduro", E, "172FMM", A); add("Motoland", "CRF ST Enduro", E, "172FMM", { carb: "PZ32" }); add("Motoland", "Enduro 250", E, "172FMM", A);
  add("Motoland", "Enduro 300", E, "PR300", A); add("Motoland", "XT300", E, "NB300", A); add("Motoland", "Blazer 250", E, "165FMM", A); add("Motoland", "WRX250", E, "172FMM", A);
  add("Motoland", "XT250", E, "172FMM-3A", A); add("Motoland", "Bandit 250", T, "165FMM", A); add("Motoland", "Bandit 300", T, "175FMM", A);
  add("Motoland", "Dakar ST", E, "172FMM-3A", A); add("Motoland", "Dakar LT", E, "165FMM", A); add("Motoland", "X3 250", E, "172FMM", A); add("Motoland", "X3 300", E, "PR300", A);
  add("Motoland", "TT300", E, "PR300", A); add("Motoland", "RMZ250", E, "NC250", A); add("Motoland", "FC250", E, "172FMM", A); add("Motoland", "V-Raptor 250", E, "172FMM", A);
  add("Motoland", "Wolf 250", E, "165FMM", A); add("Motoland", "MT250", M, "172FMM", A); add("Motoland", "RZ200", L, "CG200", A); add("Motoland", "JKS125 E", P, "154FMI", A);
  /* Progasi */
  add("Progasi", "Smart 125", P, "154FMI", A); add("Progasi", "Smart Mini 125", P, "154FMI", A); add("Progasi", "Smart 160", P, "1P60FMK");
  add("Progasi", "Smart 190", P, "Z190", { approx: true, hp: 19 }); add("Progasi", "Smart Max 150", P, "1P60FMK", A); add("Progasi", "Kids Power 110", P, "152FMH", A);
  add("Progasi", "Ibiza 250", E, "172FMM-3A", A); add("Progasi", "Ibiza 300", E, "175FMM", A); add("Progasi", "Race 300 Wave", E, "NB300", A);
  /* Kayo */
  add("Kayo", "K1-J", E, "172FMM-3A", A); add("Kayo", "K1-L 150 Road", L, "CB150", A); add("Kayo", "K1-L 250 MX", E, "172FMM-3A", A); add("Kayo", "K1-L 300 MX", E, "PR300", A);
  add("Kayo", "K1-L 300 Road", E, "PR300", A); add("Kayo", "K6 300", E, "NB300", A); add("Kayo", "K6-R 250 KYB Pro", E, "NC250", A); add("Kayo", "T2 250 MX", E, "172FMM", A);
  add("Kayo", "T2 300 Enduro", E, "PR300", A); add("Kayo", "T2 300 Enduro PR", E, "PR300"); add("Kayo", "T2-G", E, "172FMM", A); add("Kayo", "T4 300 Enduro PR", E, "PR300");
  add("Kayo", "K2 Pro", E, "172FMM-3A", A); add("Kayo", "K4 MX", E, "172FMM-3A", A); add("Kayo", "K5 300 Enduro", E, "NB300", A); add("Kayo", "T1", E, "165FMM", A);
  add("Kayo", "Basic TT125EM", P, "154FMI", A); add("Kayo", "Basic TT140EM", P, "YX140", A); add("Kayo", "Basic YX125", P, "154FMI", A); add("Kayo", "Basic K125", P, "154FMI", A);
  add("Kayo", "Evolution YX125EM", P, "154FMI", A); add("Kayo", "Evolution YX140EM", P, "YX140", A); add("Kayo", "Evolution YX150", P, "1P60FMK", A); add("Kayo", "Evolution K125EM", P, "154FMI", A);
  add("Kayo", "Mini KMB YX125EM", P, "154FMI", A); add("Kayo", "TSD110", P, "152FMH", A);
  /* BSE */
  add("BSE", "J1", E, "NC250", A); add("BSE", "J3D 250", E, "165FMM", A); add("BSE", "J3D 300", E, "PR300"); add("BSE", "Z6", E, "172FMM-3A", A); add("BSE", "Z8", E, "PR300", A);
  add("BSE", "Z9 300", E, "PR300", A); add("BSE", "Z10", E, "NB300", A); add("BSE", "Z11", E, "NB300", A); add("BSE", "T5", E, "172FMM", A); add("BSE", "T7", E, "NC250", A);
  add("BSE", "T8", E, "NB300", A); add("BSE", "M8", E, "NB300", A); add("BSE", "EX125", P, "154FMI", A); add("BSE", "PH125", P, "154FMI", A); add("BSE", "PH150", P, "1P60FMK", A);
  add("BSE", "PH160", P, "1P60FMK", A); add("BSE", "PH190", P, "Z190", A); add("BSE", "MX125", P, "154FMI", A); add("BSE", "MXR125", P, "154FMI", A); add("BSE", "Evo 110", P, "152FMH", A);
  /* Avantis */
  add("Avantis", "A1", E, "172FMM", A); add("Avantis", "A3", E, "CBS300", A); add("Avantis", "A5", E, "172FMM-3A", A); add("Avantis", "A8", E, "NB300", A);
  add("Avantis", "A7 Premium", E, "NB300"); add("Avantis", "Dakar 250 TwinCam", E, "NC250", A); add("Avantis", "Tourist 250", T, "172FMM", A);
  add("Avantis", "Enduro 450 Pro EFI", E, "NC450", A); add("Avantis", "Basic", P, "154FMI", A); add("Avantis", "Pitbike 15", P, "1P60FMK", A); add("Avantis", "MT300", M, "PR300", A);
  /* Regulmoto */
  add("Regulmoto", "Sport-003 PR", E, "172FMM-5", A); add("Regulmoto", "Sport-003 PRO", E, "PR300", A); add("Regulmoto", "Sport-003 Z", E, "165FMM", A);
  add("Regulmoto", "ZR 250 PR 4 valves", E, "172FMM-5", A); add("Regulmoto", "ZR PR 300 4 valves", E, "PR300", A); add("Regulmoto", "Athlete Pro 4V", E, "165FMM", A);
  add("Regulmoto", "Norden", E, "165FMM", A); add("Regulmoto", "Holeshot Red Edition", E, "PR300", A); add("Regulmoto", "CR-Z 300", E, "CBS300", A);
  add("Regulmoto", "Aqua Enduro", E, "172FMM", A); add("Regulmoto", "Senke SK200GY-5", L, "CG200", A); add("Regulmoto", "RM 125", P, "154FMI", A);
  add("Regulmoto", "Seven 125E", P, "154FMI", A); add("Regulmoto", "Seven Medalist", P, "YX140", A); add("Regulmoto", "LFA", E, "165FMM", A);
  /* Rockot */
  add("Rockot", "RS250 Firestorm", E, "172FMM-3A", { carb: "NIBBI PE30" }); add("Rockot", "R5X Rampage", E, "175FMM"); add("Rockot", "R5L Foxfire", E, "165FMM", A);
  add("Rockot", "R5S Pride", L, "CB150", A); add("Rockot", "GS7L Strive", E, "172FMM", A); add("Rockot", "R5H Cyclone", E, "172FMM-3A");
  /* Racer, GR и другие */
  add("Racer", "Enduro RC200GY-C2", L, "CG200", A); add("Racer", "Enduro 300 RC300-GY8A", E, "PR300", A); add("GR", "GR2 300 Pro", E, "NB300", A);
  add("Roliz", "Sport-005", E, "172FMM", A); add("Roliz", "Sport-007", E, "PR300", A); add("MMZ", "06", E, "165FMM", A); add("TZR", "Enduro 250", E, "172FMM", A);
  add("Gladiator", "K6 PR300", E, "PR300", { carb: "NIBBI PWK34" }); add("BKGTR", "KT2 CB300", E, "175FMM");
  add("Любая модель", "с мотором ZS175FMM", E, "175FMM");
})();

/* --- совет дня --- */
var TIPS = [
  "Масло на китайском воздушнике лучше менять чаще регламента — каждые 1000–1500 км. Это самая дешёвая страховка мотора.",
  "Клапаны регулируй только на холодном моторе — минимум через 3–4 часа после поездки.",
  "Белая свеча — опасно бедная смесь. Не катайся так долго: мотор перегреется и прогорит клапан.",
  "После мойки обработай разъёмы диэлектрической смазкой — половина «загадочных» отказов электрики уйдёт.",
  "Цепь смазывай после каждой поездки по воде и грязи, а не «когда-нибудь». Цепь и звёзды стоят дороже смазки.",
  "Никогда не заводи мотор, если он заглох в воде. Сначала выкрути свечу и выгони воду.",
  "Поставил фильтр нулевого или прямоток — сразу подними главный жиклёр, иначе мотор будет беднить.",
  "Тормозная жидкость впитывает воду. Меняй её раз в год, даже если тормоза «вроде нормальные».",
  "На 4V моторах (PR250, PR300, 172FMM-3A) заливай АИ-95 — на 92-м бывает детонация.",
  "Провис цепи на эндуро должен быть больше, чем на дорожнике: 30–40 мм. Перетянутая цепь убивает подшипники.",
  "Новый мотор обкатывай 300–500 км без полного газа и с постоянной сменой оборотов.",
  "Перед бродом выведи сапуны бака, карбюратора и картера повыше — это 10 минут работы.",
  "В лес бери запасную свечу, камеру, монтажки и трос сцепления — это 90% поломок в поле.",
  "Давление в шинах в лесу — 0.8–1.0 бар. На асфальте его нужно поднять до 1.5–1.8.",
  "Жёлтая слабая искра — повод проверить колпачок и катушку, а не крутить стартер до разряда АКБ.",
  "Масло с модификаторами трения (автомобильное) — частая причина буксующего сцепления. Нужен допуск JASO MA.",
  "Защита картера стоит дешевле одной крышки двигателя. Ставь её первой.",
  "Металлическая стружка на магнитной сливной пробке — повод задуматься. Мелкая пыль — норма.",
  "Холостой жиклёр засоряется за зиму, если в карбюраторе остался бензин. Сливай его перед хранением.",
  "Рычаги поверни чуть вниз и затяни так, чтобы при падении они проворачивались, а не ломались.",
  "Спицы проверяй простукиванием: звонкая — норма, глухая — ослабла.",
  "Стук снизу, растущий с оборотами, — не заводи мотор дальше. Шатун не прощает.",
  "У 2T считай моточасы. Поршень на 300 кубах живёт 40–60 часов — не жди, пока он развалится.",
  "Смесь для 2T — 1:40: 25 мл синтетического масла на литр бензина.",
  "На горячем моторе не открывай крышку радиатора — система под давлением.",
  "Если мотор вибрирует сразу после ремонта — проверь метки балансира.",
  "Под LED-поворотники нужно электронное реле, иначе они будут моргать слишком быстро.",
  "Сальники вилки живут дольше, если после каждой поездки протирать трубы.",
  "Подшипники прогрессии смазывай перед сезоном — они ржавеют быстрее всего.",
  "Заглох на горячую и не заводится, пока не остынет, — проверь CDI и сапун бака."
];

/* --- достижения --- */
var BADGES = [
  { id: "start", t: "Первый запуск", d: "Завести мотор на главной", icon: "🔑", need: function (s) { return (s.start || 0) >= 1; } },
  { id: "xray", t: "Рентген", d: "Посмотреть, как мотор работает внутри", icon: "🩻", need: function (s) { return (s.xray || 0) >= 1; } },
  { id: "style", t: "Свой стиль", d: "Настроить мотоцикл под себя", icon: "🎨", need: function (s, x) { return x.mods > 0 || x.color; } },
  { id: "photo", t: "Фотограф", d: "Загрузить фото своего мотоцикла", icon: "📸", need: function (s) { return (s.photo || 0) >= 1; } },
  { id: "detective", t: "Детектив", d: "Разобрать 3 причины неисправностей", icon: "🔍", need: function (s) { return (s.diag || 0) >= 3; } },
  { id: "hands", t: "Мастер на все руки", d: "Пройти инструкцию до конца", icon: "🔧", need: function (s) { return (s.guides || 0) >= 1; } },
  { id: "tuner", t: "Тюнер", d: "Добавить 3 доработки в проект", icon: "⚡", need: function (s) { return (s.tune || 0) >= 3; } },
  { id: "safety", t: "Безопасность прежде всего", d: "3 раза пройти проверку перед выездом", icon: "🦺", need: function (s) { return (s.preride || 0) >= 3; } },
  { id: "ai", t: "На связи с ИИ", d: "Задать ИИ-механику 5 вопросов", icon: "🤖", need: function (s) { return (s.ai || 0) >= 5; } },
];
(function () { var g = BIKES.filter(function (b) { return b.brand === "Любая модель" && b.versions[0].engine === "NC450C"; }); g.forEach(function (b) { b.name = "с мотором ZS194MQ (карбюратор)"; }); })();
/* ===================== v7: японские мотоциклы, новые китайские ===================== */
function genKit(id, priceK) {
  var e = ENGINES[id]; e.id = id;
  var k = engClass(e) * (priceK || 1), c = e.code, fit = [id];
  var is4t = e.stroke === "4T", liq = e.groups.indexOf("liquid") >= 0, el = /Электро|электро/.test(e.start), carb = e.groups.indexOf("carb") >= 0, dohc = e.groups.indexOf("dohc") >= 0;
  function add(slug, name, base, cat, kind) { PARTS.push(P(id + "-" + slug, name + " " + c, r50(base * k), cat, kind, fit)); }
  add("pis", "Поршневая группа", 4200, "Двигатель", "piston"); add("rings", "Кольца поршневые", 1200, "Двигатель", "rings");
  add("gskt", "Комплект прокладок двигателя", 1400, "Двигатель", "gasketset"); add("bg", "Прокладки цилиндра", 450, "Двигатель", "basegasket");
  add("seals", "Сальники двигателя (комплект)", 700, "Двигатель", "engseals"); add("crank", "Коленвал в сборе", 8500, "Двигатель", "crank");
  add("clutch", "Диски сцепления", 2600, "Трансмиссия", "clutchdiscs"); add("cspr", "Пружины сцепления", 900, "Трансмиссия", "clutchsprings");
  add("stator", "Статор генератора", 2800, "Электрика", "stator"); add("reg", "Реле-регулятор", 1400, "Электрика", "regulator");
  add("hg", liq ? "Прокладка ГБЦ (металл)" : "Прокладка ГБЦ", liq ? 1100 : 350, "Двигатель", "headgasket");
  add("chain", "Цепь ГРМ", 1500, "Двигатель", "camchain"); add("tens", "Натяжитель цепи ГРМ", 900, "Двигатель", "tensioner");
  add("vin", "Клапан впускной", 900, "Двигатель", "valvein"); add("vex", "Клапан выпускной", 1100, "Двигатель", "valveex");
  add("cam", dohc ? "Распредвалы (пара)" : "Распредвал", dohc ? 5200 : 3200, "Двигатель", "camshaft");
  add("of", "Масляный фильтр", 450, "Расходники", "oilfilter"); add("af", "Воздушный фильтр", 1100, "Расходники", "airfilter");
  add("vcg", "Прокладка крышки клапанов", 400, "Двигатель", "vcgasket"); add("cgsk", "Прокладка крышки сцепления", 300, "Двигатель", "clutchgasket");
  add("csseal", "Сальник вторичного вала (у звезды)", 250, "Трансмиссия", "csseal");
  if (el) { add("starter", "Стартер", 3500, "Электрика", "starter"); add("sprag", "Обгонная муфта стартера", 2400, "Электрика", "sprag"); }
  if (liq) { add("wp", "Ремкомплект помпы", 1600, "Двигатель", "waterpump"); add("thermo", "Термостат", 1300, "Двигатель", "thermostat"); }
  if (carb) add("rk", "Ремкомплект карбюратора", 900, "Топливо", "carbkit");
  if (e.groups.indexOf("efi") >= 0) { add("fp", "Топливный насос", 6500, "Топливо", "fuelpump"); add("inj", "Форсунка", 3800, "Топливо", "injector"); }
  if (dohc && is4t) add("shims", "Набор регулировочных шайб", 2800, "Двигатель", "shims");
}
function J(id, o) { ENGINES[id] = Object.assign({ id: id, stroke: "4T", fuel: "АИ-92 / АИ-95", timing: "Цепь ГРМ", oil: "10W-40 (JASO MA)", oilInt: 3000, valveInt: 12000, sparkTorque: "12–18 Н·м", gap: "0.8–0.9 мм", jetMain: "—", jetPilot: "—", needle: "—", jp: true }, o); }

/* --- японские двигатели (цифры типовые, сверяй с сервис-мануалом своего года) --- */
J("CRF250L", { code: "MD38E", name: "Honda CRF250L / Rally (MD38E)", maker: "Honda", groups: ["dohc","liquid","efi","4t","big","jp"], cam: "DOHC, 4 клапана", cooling: "Жидкостное", cc: 249, hp: 24, torque: "22 Н·м", compression: "≈ 11 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1300–1500", valveIn: "0.13–0.19 мм", valveEx: "0.24–0.30 мм", spark: "NGK SIMR8A9", oilVol: "1.8–1.9 л", oil: "10W-30 / 10W-40 (JASO MA)", coolant: "≈ 1 л",
  issues: [{ t: "Слабая штатная подвеска для серьёзного бездорожья", sev: "low", fix: "Перешивка вилки и амортизатора под вес." }, { t: "Тяжёлый для эндуро", sev: "low", fix: "Защита и аккуратность в техничных участках." }, { t: "Датчики EFI не любят мойку под давлением", sev: "med", fix: "Не лить напором на разъёмы и дроссель." }] });
J("CRF300L", { code: "NC56E", name: "Honda CRF300L / Rally", maker: "Honda", groups: ["dohc","liquid","efi","4t","big","jp"], cam: "DOHC, 4 клапана", cooling: "Жидкостное", cc: 286, hp: 27, torque: "26.6 Н·м", compression: "≈ 11 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст., слипер-сцепление", carb: "Инжектор", idle: "1300–1500", valveIn: "0.13–0.19 мм", valveEx: "0.24–0.30 мм", spark: "NGK SIMR8A9", oilVol: "1.8–1.9 л", oil: "10W-30 / 10W-40 (JASO MA)", coolant: "≈ 1 л",
  issues: [{ t: "Мягкая подвеска под тяжёлого райдера", sev: "low", fix: "Пружины под вес." }, { t: "Штатная защита картера пластиковая", sev: "low", fix: "Алюминиевая защита для леса." }] });
J("XR250", { code: "MD30E", name: "Honda XR250R / Baja (RFVC)", maker: "Honda", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 4 клапана RFVC", cooling: "Воздушное", cc: 249, hp: 26, torque: "23 Н·м", compression: "≈ 12 бар", ignition: "CDI", start: "Электро / кик", gearbox: "6 ст.", carb: "Keihin PD", jetMain: "128–135", jetPilot: "40–42", needle: "3 канавка", idle: "1300–1500", valveIn: "0.10 мм", valveEx: "0.12 мм", spark: "NGK DPR8Z / DPR8EA-9", gap: "0.6–0.7 мм", oilVol: "1.6 л", valveInt: 6000,
  issues: [{ t: "Возрастной мотоцикл: износ ЦПГ и сальников", sev: "med", fix: "Замер компрессии и осмотр при покупке." }, { t: "Натяжитель цепи ГРМ", sev: "med", fix: "Шуршит — менять с цепью." }] });
J("XR150L", { code: "KE00E", name: "Honda XR150L", maker: "Honda", groups: ["air","carb","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 149, hp: 12.5, torque: "12.5 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро + кик", gearbox: "5 ст.", carb: "Keihin", jetMain: "105–112", jetPilot: "38", needle: "3 канавка", idle: "1400–1600", valveIn: "0.08–0.10 мм", valveEx: "0.10–0.12 мм", spark: "NGK CR7HSA", gap: "0.6–0.7 мм", oilVol: "1.2 л", valveInt: 6000,
  issues: [{ t: "Простой и живучий мотор — главное масло вовремя", sev: "low", fix: "Масло каждые 2–3 тыс. км." }] });
J("CRF150F", { code: "KE01E", name: "Honda CRF150F", maker: "Honda", groups: ["air","carb","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 149, hp: 12, torque: "12 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро / кик", gearbox: "5 ст.", carb: "Keihin PB", jetMain: "100–110", jetPilot: "38", needle: "3 канавка", idle: "1400–1600", valveIn: "0.10 мм", valveEx: "0.12 мм", spark: "NGK CR7HSA", gap: "0.6–0.7 мм", oilVol: "1.0 л", valveInt: 6000,
  issues: [{ t: "Засор карбюратора после хранения", sev: "low", fix: "Сливать бензин из поплавковой камеры на зиму." }] });
J("CRF230F", { code: "ME09E", name: "Honda CRF230F", maker: "Honda", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 223, hp: 18, torque: "17 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро", gearbox: "6 ст.", carb: "Keihin", jetMain: "110–118", jetPilot: "38", needle: "3 канавка", idle: "1400–1600", valveIn: "0.10 мм", valveEx: "0.12 мм", spark: "NGK DPR8EA-9", gap: "0.8–0.9 мм", oilVol: "1.3 л", valveInt: 6000,
  issues: [{ t: "Беднит на высоте и после фильтра нулевого", sev: "low", fix: "Подбор жиклёров." }] });
J("XR650L", { code: "RE01E", name: "Honda XR650L", maker: "Honda", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 4 клапана RFVC", cooling: "Воздушно-масляное (сухой картер)", cc: 644, hp: 43, torque: "52 Н·м", compression: "≈ 12 бар", ignition: "CDI", start: "Электро", gearbox: "5 ст.", carb: "Keihin CV 40", jetMain: "150–158", jetPilot: "48–52", needle: "3 канавка", idle: "1200–1400", valveIn: "0.10 мм", valveEx: "0.12 мм", spark: "NGK DPR8EA-9", gap: "0.8–0.9 мм", oilVol: "2.6 л", valveInt: 8000,
  issues: [{ t: "Перегрев в медленной езде", sev: "med", fix: "Масло по уровню, смесь не беднить." }, { t: "Тяжёлый — сложно в техничных участках", sev: "low", fix: "Защита и аккуратность." }] });
J("CRF110F", { code: "JE02E", name: "Honda CRF110F", maker: "Honda", groups: ["horiz","air","efi","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 109, hp: 7.5, torque: "8 Н·м", compression: "≈ 10 бар", ignition: "ЭБУ (EFI)", start: "Электро + кик", gearbox: "4 ст., полуавтомат", carb: "Инжектор", idle: "1500–1700", valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "NGK CPR6EA-9", gap: "0.8–0.9 мм", oilVol: "0.9 л", valveInt: 3000,
  issues: [{ t: "Детский мотоцикл — главное следить за цепью и маслом", sev: "low", fix: "Смазка цепи и масло по регламенту." }] });
J("WR250R", { code: "WR250R", name: "Yamaha WR250R", maker: "Yamaha", groups: ["dohc","liquid","efi","4t","big","jp"], cam: "DOHC, 4 клапана", cooling: "Жидкостное", cc: 250, hp: 30, torque: "24 Н·м", compression: "≈ 12 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1500–1700", valveIn: "0.10–0.15 мм", valveEx: "0.17–0.22 мм", spark: "NGK CR8E", gap: "0.7–0.8 мм", oilVol: "1.4–1.5 л", fuel: "АИ-95", coolant: "≈ 1 л",
  issues: [{ t: "Высокооборотистый — внизу тяги мало", sev: "low", fix: "Передняя звезда −1 зуб." }, { t: "Перегрев на месте в пробках", sev: "med", fix: "Проверь вентилятор." }] });
J("XT250", { code: "G3J", name: "Yamaha XT250 / Serow 250", maker: "Yamaha", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 249, hp: 20, torque: "21 Н·м", compression: "≈ 10 бар", ignition: "CDI / TCI", start: "Электро", gearbox: "5 ст.", carb: "Mikuni BSR33 (поздние — инжектор)", jetMain: "125–132", jetPilot: "42", needle: "3 канавка", idle: "1300–1500", valveIn: "0.08–0.12 мм", valveEx: "0.13–0.17 мм", spark: "NGK DR7EA", gap: "0.6–0.7 мм", oilVol: "1.55 л", valveInt: 6000,
  issues: [{ t: "Очень надёжный — главное не перегревать", sev: "low", fix: "Масло и фильтр вовремя." }, { t: "Мягкая подвеска", sev: "low", fix: "Пружины под вес." }] });
J("XT225", { code: "4JG", name: "Yamaha XT225 Serow", maker: "Yamaha", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 223, hp: 20, torque: "19 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро", gearbox: "6 ст.", carb: "Mikuni", jetMain: "120–125", jetPilot: "40", needle: "3 канавка", idle: "1300–1500", valveIn: "0.05–0.09 мм", valveEx: "0.10–0.14 мм", spark: "NGK DR8EA", gap: "0.6–0.7 мм", oilVol: "1.4 л", valveInt: 6000,
  issues: [{ t: "Возрастные мотоциклы: проводка и карбюратор", sev: "med", fix: "Чистка карбюратора, ревизия разъёмов." }] });
J("TTR125", { code: "TT-R125", name: "Yamaha TT-R125", maker: "Yamaha", groups: ["air","carb","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 124, hp: 10, torque: "10 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро + кик", gearbox: "5 ст.", carb: "Mikuni VM20", jetMain: "95–105", jetPilot: "20–22", needle: "3 канавка", idle: "1500–1700", valveIn: "0.08–0.12 мм", valveEx: "0.10–0.14 мм", spark: "NGK CR7HSA", gap: "0.6–0.7 мм", oilVol: "1.0 л", valveInt: 5000,
  issues: [{ t: "Засор карбюратора после хранения", sev: "low", fix: "Сливать бензин на зиму." }] });
J("TTR230", { code: "TT-R230", name: "Yamaha TT-R230", maker: "Yamaha", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 223, hp: 18, torque: "17 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро", gearbox: "6 ст.", carb: "Mikuni", jetMain: "118–125", jetPilot: "40", needle: "3 канавка", idle: "1300–1500", valveIn: "0.05–0.09 мм", valveEx: "0.10–0.14 мм", spark: "NGK DR8EA", gap: "0.6–0.7 мм", oilVol: "1.4 л", valveInt: 6000,
  issues: [{ t: "Беднит после фильтра нулевого", sev: "low", fix: "Жиклёр больше." }] });
J("DRZ400", { code: "DR-Z400", name: "Suzuki DR-Z400S / SM / E", maker: "Suzuki", groups: ["dohc","liquid","carb","4t","big","jp"], cam: "DOHC, 4 клапана", cooling: "Жидкостное", cc: 398, hp: 39, torque: "39 Н·м", compression: "≈ 12 бар", ignition: "CDI", start: "Электро", gearbox: "5 ст.", carb: "Mikuni BSR36 (S/SM), Keihin FCR (E)", jetMain: "140–150", jetPilot: "40–45", needle: "3 канавка", idle: "1600–1800", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR8E", gap: "0.7–0.8 мм", oilVol: "1.9–2.0 л", coolant: "≈ 1.2 л",
  issues: [{ t: "Сток зажат по смеси (шумы и экология)", sev: "low", fix: "Популярная доработка: игла, жиклёры, снятие ограничителей." }, { t: "Сетка масляного насоса и масло — проверять по щупу на горячую", sev: "med", fix: "Уровень мерить по мануалу." }] });
J("DRZ125", { code: "DR-Z125", name: "Suzuki DR-Z125", maker: "Suzuki", groups: ["air","carb","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 124, hp: 10, torque: "10 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Кик", gearbox: "5 ст.", carb: "Mikuni VM20", jetMain: "95–100", jetPilot: "20–22", needle: "3 канавка", idle: "1500–1700", valveIn: "0.05–0.10 мм", valveEx: "0.08–0.13 мм", spark: "NGK CR7HSA", gap: "0.6–0.7 мм", oilVol: "1.0 л", valveInt: 5000,
  issues: [{ t: "Кикстартер и сцепление при агрессивной езде", sev: "low", fix: "Свежее масло, регулировка троса." }] });
J("DR200", { code: "DR200SE", name: "Suzuki DR200SE / Djebel 200", maker: "Suzuki", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушно-масляное", cc: 199, hp: 18, torque: "17 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро", gearbox: "5 ст.", carb: "Mikuni BST31", jetMain: "117–122", jetPilot: "40", needle: "3 канавка", idle: "1400–1600", valveIn: "0.05–0.10 мм", valveEx: "0.08–0.13 мм", spark: "NGK DR8EA", gap: "0.6–0.7 мм", oilVol: "1.3 л", valveInt: 6000,
  issues: [{ t: "Очень живучий — следи за цепью и клапанами", sev: "low", fix: "Регулировка клапанов по регламенту." }] });
J("DR650", { code: "DR650SE", name: "Suzuki DR650SE", maker: "Suzuki", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 4 клапана", cooling: "Воздушно-масляное", cc: 644, hp: 43, torque: "53 Н·м", compression: "≈ 11 бар", ignition: "CDI", start: "Электро", gearbox: "5 ст.", carb: "Mikuni BST40", jetMain: "145–152", jetPilot: "42–45", needle: "3 канавка", idle: "1200–1400", valveIn: "0.08–0.13 мм", valveEx: "0.17–0.22 мм", spark: "NGK DPR8EA-9", gap: "0.8–0.9 мм", oilVol: "2.3 л", valveInt: 12000,
  issues: [{ t: "Сток сильно обеднён", sev: "low", fix: "Популярная доработка смеси." }, { t: "Маленький бак для туризма", sev: "low", fix: "Увеличенный бак." }] });
J("KLX250", { code: "KLX250", name: "Kawasaki KLX250 / KLX300", maker: "Kawasaki", groups: ["dohc","liquid","carb","4t","big","jp"], cam: "DOHC, 4 клапана", cooling: "Жидкостное", cc: 249, hp: 21, torque: "21 Н·м", compression: "≈ 11 бар", ignition: "CDI (новые — EFI)", start: "Электро", gearbox: "6 ст.", carb: "Keihin CVK34 (новые — инжектор)", jetMain: "125–132", jetPilot: "35–38", needle: "3 канавка", idle: "1300–1500", valveIn: "0.10–0.19 мм", valveEx: "0.22–0.31 мм", spark: "NGK CR8E", gap: "0.7–0.8 мм", oilVol: "1.5 л", coolant: "≈ 1.2 л",
  issues: [{ t: "Сток зажат по смеси", sev: "low", fix: "Доработка карбюратора и выпуска." }, { t: "Вентилятор и датчик перегрева", sev: "med", fix: "Проверять перед жарким сезоном." }] });
J("KLX230", { code: "KLX230", name: "Kawasaki KLX230", maker: "Kawasaki", groups: ["air","efi","4t","big","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 233, hp: 19, torque: "19.8 Н·м", compression: "≈ 10 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1300–1500", valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK CPR8EA-9", gap: "0.8–0.9 мм", oilVol: "1.3 л", valveInt: 12000,
  issues: [{ t: "Мягкая подвеска", sev: "low", fix: "Пружины под вес." }] });
J("KLX140", { code: "KLX140", name: "Kawasaki KLX140", maker: "Kawasaki", groups: ["air","carb","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 144, hp: 11, torque: "11 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро", gearbox: "5 ст.", carb: "Keihin", jetMain: "100–108", jetPilot: "38", needle: "3 канавка", idle: "1400–1600", valveIn: "0.05–0.10 мм", valveEx: "0.10–0.15 мм", spark: "NGK CR7HSA", gap: "0.6–0.7 мм", oilVol: "1.0 л", valveInt: 5000,
  issues: [{ t: "Засор карбюратора после хранения", sev: "low", fix: "Сливать бензин на зиму." }] });
J("KLX110", { code: "KLX110", name: "Kawasaki KLX110", maker: "Kawasaki", groups: ["horiz","air","carb","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 112, hp: 7, torque: "8 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро + кик", gearbox: "4 ст.", carb: "Keihin", jetMain: "78–85", jetPilot: "35", needle: "3 канавка", idle: "1500–1700", valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "NGK CR6HSA", gap: "0.6–0.7 мм", oilVol: "0.8 л", valveInt: 3000,
  issues: [{ t: "Популярная база для тюнинга питбайка", sev: "low", fix: "Большой цилиндр — только с охлаждением и смесью." }] });
J("KL250", { code: "KL250G", name: "Kawasaki KL250 Super Sherpa", maker: "Kawasaki", groups: ["dohc","air","carb","4t","big","jp"], cam: "DOHC, 4 клапана", cooling: "Воздушное", cc: 249, hp: 21, torque: "21 Н·м", compression: "≈ 11 бар", ignition: "CDI", start: "Электро", gearbox: "6 ст.", carb: "Keihin CVK34", jetMain: "120–128", jetPilot: "35–38", needle: "3 канавка", idle: "1300–1500", valveIn: "0.10–0.19 мм", valveEx: "0.15–0.24 мм", spark: "NGK DR8EA", gap: "0.6–0.7 мм", oilVol: "1.4 л",
  issues: [{ t: "Возрастные: проводка, карбюратор, цепь ГРМ", sev: "med", fix: "Ревизия при покупке." }] });
J("KLR650", { code: "KLR650", name: "Kawasaki KLR650", maker: "Kawasaki", groups: ["dohc","liquid","carb","4t","big","jp","balancer"], cam: "DOHC, 4 клапана", cooling: "Жидкостное", cc: 651, hp: 40, torque: "52 Н·м", compression: "≈ 10 бар", ignition: "CDI (2022+ EFI)", start: "Электро", gearbox: "5 ст.", carb: "Keihin CVK40", jetMain: "145–150", jetPilot: "38–40", needle: "3 канавка", idle: "1200–1400", valveIn: "0.10–0.20 мм", valveEx: "0.15–0.25 мм", spark: "NGK DPR8EA-9", gap: "0.8–0.9 мм", oilVol: "2.5 л", coolant: "≈ 1.5 л", valveInt: 12000,
  issues: [{ t: "«Doohickey» — натяжитель балансира у старых", sev: "high", fix: "Замена на усиленный рычаг натяжителя балансира." }, { t: "Расход масла у старых моторов", sev: "med", fix: "Контроль уровня перед поездкой." }] });
/* --- новые китайские двигатели --- */
J("KOVE450", { code: "Kove 450", name: "Kove 450 Rally (DOHC EFI)", maker: "Kove (Colove)", groups: ["dohc","liquid","efi","4t","big"], jp: false, cam: "DOHC, 4 клапана", cooling: "Жидкостное", cc: 449, hp: 49, torque: "40 Н·м", compression: "≈ 12 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1500–1700", valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK CR8EIX", gap: "0.7–0.8 мм", oilVol: "1.8 л", oil: "10W-50 (JASO MA2)", fuel: "АИ-95", coolant: "≈ 1.3 л", oilInt: 2000, valveInt: 6000,
  issues: [{ t: "Требует частого ТО, как спортивный мотор", sev: "med", fix: "Масло каждые 1500–2000 км, клапаны по регламенту." }, { t: "Чувствителен к качеству топлива", sev: "med", fix: "Только АИ-95+." }] });
J("VOGE300", { code: "LX300", name: "Loncin / Voge 300 Rally (DOHC EFI)", maker: "Loncin", groups: ["dohc","liquid","efi","4t","big"], jp: false, cam: "DOHC, 4 клапана", cooling: "Жидкостное", cc: 292, hp: 29, torque: "25 Н·м", compression: "≈ 11 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1500–1700", valveIn: "0.10–0.15 мм", valveEx: "0.17–0.22 мм", spark: "NGK CR8E", gap: "0.7–0.8 мм", oilVol: "1.7 л", fuel: "АИ-95", coolant: "≈ 1.2 л", oilInt: 3000, valveInt: 12000,
  issues: [{ t: "Тяжёлый — больше турист, чем эндуро", sev: "low", fix: "Защиты и дуги." }, { t: "Датчики EFI после мойки", sev: "low", fix: "Диэлектрическая смазка на разъёмы." }] });
["CRF250L","CRF300L","XR250","XR150L","CRF150F","CRF230F","XR650L","CRF110F","WR250R","XT250","XT225","TTR125","TTR230","DRZ400","DRZ125","DR200","DR650","KLX250","KLX230","KLX140","KLX110","KL250","KLR650"].forEach(function (id) { genKit(id, 1.7); });
genKit("KOVE450", 1.2); genKit("VOGE300", 1.1);
/* свечи для японцев */
[["sp-simr", "Свеча NGK SIMR8A9 (иридий)", 1500, ["CRF250L","CRF300L"], "Аналог: Denso VUH24D"], ["sp-dr7", "Свеча NGK DR7EA", 450, ["XT250"], "Аналог: Denso X22ES-U"], ["sp-dr8", "Свеча NGK DR8EA", 450, ["XT225","TTR230","DR200","KL250"], "Аналог: Denso X24ES-U"],
 ["sp-cr7h", "Свеча NGK CR7HSA", 350, ["XR150L","CRF150F","TTR125","DRZ125","KLX140"], "Аналог: Denso U22FS-U"], ["sp-cr6h", "Свеча NGK CR6HSA", 350, ["KLX110"], "Аналог: Denso U20FS-U"], ["sp-cpr6", "Свеча NGK CPR6EA-9", 450, ["CRF110F"], "Аналог: Denso U20EPR9"],
 ["sp-cpr8", "Свеча NGK CPR8EA-9", 450, ["KLX230"], "Аналог: Denso U24EPR9"], ["sp-dpr8", "Свеча NGK DPR8EA-9", 500, ["XR250","CRF230F","XR650L","DR650","KLR650"], "Аналог: Denso X24EPR-U9"], ["sp-cr8j", "Свеча NGK CR8E", 650, ["WR250R","DRZ400","KLX250","VOGE300"], "Аналог: Denso U24ESR-N"],
 ["sp-cr8x", "Свеча NGK CR8EIX (иридий)", 1300, ["KOVE450"], "Аналог: Denso IU24"]].forEach(function (x) { var p = P(x[0], x[1], x[2], "Расходники", "spark", x[3]); p.info = x[4]; PARTS.unshift(p); });

/* --- мотоциклы: японские и новые китайские --- */
(function () {
  var E = "Эндуро", P2 = "Питбайк", M = "Мотард", T = "Тур-эндуро", L = "Лёгкий эндуро", A = { approx: true };
  var add = addBike;
  /* Honda */
  add("Honda", "CRF250L", E, "CRF250L"); add("Honda", "CRF250 Rally", T, "CRF250L"); add("Honda", "CRF300L", E, "CRF300L"); add("Honda", "CRF300 Rally", T, "CRF300L");
  add("Honda", "XR250R", E, "XR250"); add("Honda", "XR250 Baja", T, "XR250"); add("Honda", "XR150L", L, "XR150L"); add("Honda", "CRF150F", P2, "CRF150F");
  add("Honda", "CRF230F", E, "CRF230F"); add("Honda", "XR650L", T, "XR650L"); add("Honda", "CRF110F", P2, "CRF110F");
  /* Yamaha */
  add("Yamaha", "WR250R", E, "WR250R"); add("Yamaha", "WR250X", M, "WR250R"); add("Yamaha", "Serow 250 (XT250)", L, "XT250"); add("Yamaha", "XT225 Serow", L, "XT225");
  add("Yamaha", "TT-R125LE", P2, "TTR125"); add("Yamaha", "TT-R230", E, "TTR230"); add("Yamaha", "TT250R Raid", T, "XT250", A);
  /* Suzuki */
  add("Suzuki", "DR-Z400S", E, "DRZ400"); add("Suzuki", "DR-Z400SM", M, "DRZ400"); add("Suzuki", "DR-Z400E", E, "DRZ400"); add("Suzuki", "DR-Z125", P2, "DRZ125");
  add("Suzuki", "DR200SE", L, "DR200"); add("Suzuki", "Djebel 200", L, "DR200"); add("Suzuki", "DR650SE", T, "DR650");
  /* Kawasaki */
  add("Kawasaki", "KLX250", E, "KLX250"); add("Kawasaki", "KLX250 SF (мотард)", M, "KLX250"); add("Kawasaki", "KLX300", E, "KLX250", { hp: 24, approx: true }); add("Kawasaki", "KLX230", L, "KLX230");
  add("Kawasaki", "KLX140", P2, "KLX140"); add("Kawasaki", "KLX110", P2, "KLX110"); add("Kawasaki", "KL250 Super Sherpa", L, "KL250"); add("Kawasaki", "D-Tracker 250", M, "KLX250");
  add("Kawasaki", "KLR650", T, "KLR650");
  /* Китай: Kove, Voge, Hawk, SSR, Pitster и др. */
  add("Kove", "450 Rally", T, "KOVE450"); add("Kove", "450 Rally Pro", E, "KOVE450", A); add("Voge", "300 Rally", T, "VOGE300");
  add("Hawk", "250 Enduro", E, "167FMM"); add("SSR", "SR125", P2, "154FMI", A); add("SSR", "SR150", P2, "1P60FMK", A); add("SSR", "SR189", P2, "Z190", A); add("SSR", "SR300S", E, "175FMM", A);
  add("Pitster Pro", "LXR 150", P2, "1P60FMK", A); add("Pitster Pro", "X5 190", P2, "Z190", A); add("Zongshen", "ZS200GY-2", L, "CG200", A); add("Loncin", "LX200GY-3", L, "CG200", A);
  add("Lifan", "LF250GY-7", E, "167FMM", A); add("Irbis", "TTR125", P2, "154FMI", A); add("Irbis", "TTR250", E, "167FMM", A); add("Irbis", "XR250R Enduro", E, "172FMM", A);
  add("Racer", "Enduro RC150GY", L, "CG150", A); add("Racer", "Panther RC250GY-C2", E, "172FMM", A); add("Racer", "Ranger RC250-GY8A", E, "172FMM", A);
  add("Motax", "Pit 140", P2, "YX140", A); add("Motax", "Pit 160", P2, "1P60FMK", A); add("Fusion", "250 Enduro", E, "172FMM", A); add("Patron", "Enduro 250", E, "172FMM", A);
  add("Stels", "Enduro 250", E, "172FMM", A); add("Stels", "Flame 200", L, "CG200", A); add("Stels", "Pit 125", P2, "154FMI", A);
  add("Hengjian", "Pit 125", P2, "154FMI", A); add("Jianshe", "JS200GY", L, "CG200", A); add("Bosuer", "M2 250", E, "NC250", A); add("Bosuer", "J5 300", E, "NB300", A);
  add("Любая модель", "с мотором Kove 450", T, "KOVE450"); add("Любая модель", "с мотором LX300", T, "VOGE300");
})();
/* детали «именно под этот мотор» — в приоритете */
/* оформление по классу: номер на табличке, вторые цвета */
function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
/* ===================== v8: ещё японцы и китайцы ===================== */
J("TW200", { code: "TW200", name: "Yamaha TW200", maker: "Yamaha", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 196, hp: 16, torque: "16 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро", gearbox: "5 ст.", carb: "Mikuni BSR", jetMain: "115–122", jetPilot: "40", needle: "3 канавка", idle: "1300–1500", valveIn: "0.05–0.09 мм", valveEx: "0.10–0.14 мм", spark: "NGK DR7EA", gap: "0.6–0.7 мм", oilVol: "1.4 л", valveInt: 6000,
  issues: [{ t: "Толстые шины — тяжело на асфальте на скорости", sev: "low", fix: "Давление по назначению." }, { t: "Очень живучий мотор", sev: "low", fix: "Масло вовремя." }] });
J("XT660", { code: "XT660", name: "Yamaha XT660R / X / Z Ténéré", maker: "Yamaha", groups: ["liquid","efi","4t","big","jp"], cam: "SOHC, 4 клапана", cooling: "Жидкостное", cc: 660, hp: 48, torque: "58 Н·м", compression: "≈ 11 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "5 ст.", carb: "Инжектор", idle: "1250–1400", valveIn: "0.09–0.13 мм", valveEx: "0.18–0.22 мм", spark: "NGK CR7E", gap: "0.7–0.8 мм", oilVol: "2.9 л (сухой картер)", coolant: "≈ 1.4 л", valveInt: 12000,
  issues: [{ t: "Рывки на малом газе на стоке", sev: "low", fix: "Тюнинг-модуль или прошивка." }, { t: "Тяжёлый для бездорожья", sev: "low", fix: "Дуги и защита." }] });
J("XR400R", { code: "NE01E", name: "Honda XR400R (RFVC)", maker: "Honda", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 4 клапана RFVC", cooling: "Воздушно-масляное (сухой картер)", cc: 397, hp: 34, torque: "34 Н·м", compression: "≈ 11 бар", ignition: "CDI", start: "Кик", gearbox: "5 ст.", carb: "Keihin PD", jetMain: "150–160", jetPilot: "42–45", needle: "3 канавка", idle: "1200–1400", valveIn: "0.10 мм", valveEx: "0.12 мм", spark: "NGK DPR8Z", gap: "0.6–0.7 мм", oilVol: "2.0 л", valveInt: 6000,
  issues: [{ t: "Тяжело заводится киком при зажатых клапанах", sev: "med", fix: "Клапаны по регламенту, декомпрессор." }] });
J("XR125L", { code: "XR125L", name: "Honda XR125L / XLR125R", maker: "Honda", groups: ["air","carb","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 124, hp: 10, torque: "10 Н·м", compression: "≈ 10 бар", ignition: "CDI", start: "Электро + кик", gearbox: "5 ст.", carb: "Keihin", jetMain: "95–102", jetPilot: "35–38", needle: "3 канавка", idle: "1400–1600", valveIn: "0.08 мм", valveEx: "0.10 мм", spark: "NGK CR7HSA", gap: "0.6–0.7 мм", oilVol: "1.0 л", valveInt: 6000,
  issues: [{ t: "Простой мотор — главное масло и цепь", sev: "low", fix: "ТО по регламенту." }] });
J("CRF50F", { code: "CRF50F", name: "Honda CRF50F / Yamaha TT-R50", maker: "Honda / Yamaha", groups: ["horiz","air","carb","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 49, hp: 3, torque: "3 Н·м", compression: "≈ 9 бар", ignition: "CDI", start: "Кик / электро", gearbox: "3 ст., полуавтомат", carb: "Keihin / Mikuni", jetMain: "65–75", jetPilot: "35", needle: "2–3 канавка", idle: "1600–1800", valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "NGK CR6HSA", gap: "0.6–0.7 мм", oilVol: "0.7 л", valveInt: 2000,
  issues: [{ t: "Детский мотоцикл: ограничитель газа — винт на ручке", sev: "low", fix: "Открывай газ постепенно по мере опыта ребёнка." }] });
J("DR350", { code: "DR350", name: "Suzuki DR350 / DR350SE", maker: "Suzuki", groups: ["air","carb","4t","big","jp"], cam: "SOHC, 4 клапана", cooling: "Воздушно-масляное", cc: 349, hp: 30, torque: "28 Н·м", compression: "≈ 11 бар", ignition: "CDI", start: "Кик / электро (SE)", gearbox: "6 ст.", carb: "Mikuni", jetMain: "135–145", jetPilot: "40–42", needle: "3 канавка", idle: "1300–1500", valveIn: "0.05–0.10 мм", valveEx: "0.08–0.13 мм", spark: "NGK DR8EA", gap: "0.6–0.7 мм", oilVol: "2.2 л", valveInt: 6000,
  issues: [{ t: "Возрастные — смотри цепь ГРМ и сальники вилки", sev: "med", fix: "Ревизия при покупке." }] });
J("DJEBEL250", { code: "DR250", name: "Suzuki DR250 / Djebel 250 (DOHC)", maker: "Suzuki", groups: ["dohc","air","carb","4t","big","jp"], cam: "DOHC, 4 клапана", cooling: "Воздушно-масляное", cc: 249, hp: 28, torque: "24 Н·м", compression: "≈ 11 бар", ignition: "CDI", start: "Электро", gearbox: "6 ст.", carb: "Mikuni BST", jetMain: "125–132", jetPilot: "40", needle: "3 канавка", idle: "1300–1500", valveIn: "0.05–0.10 мм", valveEx: "0.08–0.13 мм", spark: "NGK DR8EA", gap: "0.6–0.7 мм", oilVol: "1.6 л",
  issues: [{ t: "Возрастные — проводка и карбюратор", sev: "med", fix: "Ревизия при покупке." }] });
J("KDX220", { code: "KDX220", name: "Kawasaki KDX200 / KDX220R (2T)", maker: "Kawasaki", stroke: "2T", groups: ["2t","liquid","carb","big","jp"], cam: "Лепестковый клапан, клапан выпуска KIPS", cooling: "Жидкостное", cc: 216, hp: 35, torque: "30 Н·м", compression: "≈ 9 бар", fuel: "АИ-95 + 2T масло 1:40", ignition: "CDI", start: "Кик", gearbox: "6 ст.", carb: "Keihin PWK35", jetMain: "150–158", jetPilot: "38–40", needle: "3 канавка", idle: "1500–1700", valveIn: "—", valveEx: "—", spark: "NGK BR8ES", gap: "0.6–0.7 мм", oilVol: "КПП 0.8 л", oil: "Premix 1:40", oilInt: 0, valveInt: 0, hours: true, coolant: "≈ 1 л",
  issues: [{ t: "Клапан выпуска KIPS закоксовывается", sev: "med", fix: "Чистка каждые 30–40 м/ч." }, { t: "Поршень по моточасам", sev: "high", fix: "Замер зазора, замена по износу." }] });
J("YZ250", { code: "YZ250", name: "Yamaha YZ250 (2T)", maker: "Yamaha", stroke: "2T", groups: ["2t","liquid","carb","big","jp"], cam: "Лепестковый клапан, YPVS", cooling: "Жидкостное", cc: 249, hp: 48, torque: "38 Н·м", compression: "≈ 9 бар", fuel: "АИ-98 + 2T масло 1:40", ignition: "CDI", start: "Кик", gearbox: "5 ст.", carb: "Keihin PWK38", jetMain: "170–178", jetPilot: "40–42", needle: "3 канавка", idle: "1500–1700", valveIn: "—", valveEx: "—", spark: "NGK BR8EG", gap: "0.6–0.7 мм", oilVol: "КПП 0.7 л", oil: "Premix 1:40", oilInt: 0, valveInt: 0, hours: true, coolant: "≈ 1 л",
  issues: [{ t: "Кроссовый мотор — ресурс поршня 30–40 м/ч", sev: "high", fix: "Журнал моточасов." }] });
J("YZ125", { code: "YZ125", name: "Yamaha YZ125 (2T)", maker: "Yamaha", stroke: "2T", groups: ["2t","liquid","carb","small","jp"], cam: "Лепестковый клапан, YPVS", cooling: "Жидкостное", cc: 124, hp: 38, torque: "26 Н·м", compression: "≈ 9 бар", fuel: "АИ-98 + 2T масло 1:40", ignition: "CDI", start: "Кик", gearbox: "6 ст.", carb: "Keihin PWK38S", jetMain: "430–450 (PWK S)", jetPilot: "45–48", needle: "3 канавка", idle: "1600–1800", valveIn: "—", valveEx: "—", spark: "NGK BR9EG", gap: "0.6–0.7 мм", oilVol: "КПП 0.7 л", oil: "Premix 1:40", oilInt: 0, valveInt: 0, hours: true, coolant: "≈ 0.8 л",
  issues: [{ t: "Высокооборотистый — нужно крутить", sev: "low", fix: "Сцепление беречь, масло КПП чаще." }] });
J("PW50", { code: "PW50", name: "Yamaha PW50 (2T, автомат)", maker: "Yamaha", stroke: "2T", groups: ["2t","horiz","air","carb","small","jp"], cam: "Лепестковый клапан", cooling: "Воздушное", cc: 49, hp: 2.5, torque: "3 Н·м", compression: "≈ 8 бар", fuel: "АИ-92, масло — в отдельный бачок (Autolube)", ignition: "CDI", start: "Кик", gearbox: "Автомат", carb: "Mikuni VM12", jetMain: "72–78", jetPilot: "20", needle: "2 канавка", idle: "1800–2000", valveIn: "—", valveEx: "—", spark: "NGK BPR4HS", gap: "0.6–0.7 мм", oilVol: "Бачок 0.4 л", oil: "2T масло (раздельная смазка)", oilInt: 0, valveInt: 0, hours: true,
  issues: [{ t: "Следить за уровнем в масляном бачке!", sev: "high", fix: "Без масла мотор заклинит." }, { t: "Карданная передача — масло в редукторе", sev: "low", fix: "Менять раз в сезон." }] });
["TW200","XT660","XR400R","XR125L","CRF50F","DR350","DJEBEL250","KDX220","YZ250","YZ125","PW50"].forEach(function (id) { genKit(id, 1.7); });
[["sp-cr7e", "Свеча NGK CR7E", 650, ["XT660"], "Аналог: Denso U22ESR-N"], ["sp-dpr8z", "Свеча NGK DPR8Z", 550, ["XR400R"], "Аналог: Denso X24EPR-U"], ["sp-br8eg", "Свеча NGK BR8EG / BR9EG (гоночная)", 750, ["YZ250","YZ125"], "Для 2T кросса"],
 ["sp-bpr4", "Свеча NGK BPR4HS", 300, ["PW50"], "Аналог: Denso W14FPR-U"]].forEach(function (x) { var p = P(x[0], x[1], x[2], "Расходники", "spark", x[3]); p.info = x[4]; PARTS.unshift(p); });
(function () { var dr7 = PARTS.find(function (p) { return p.id === "sp-dr7"; }); if (dr7) dr7.fit.push("TW200"); var dr8 = PARTS.find(function (p) { return p.id === "sp-dr8"; }); if (dr8) dr8.fit.push("DR350", "DJEBEL250"); var cr7 = PARTS.find(function (p) { return p.id === "sp-cr7h"; }); if (cr7) cr7.fit.push("XR125L"); var cr6 = PARTS.find(function (p) { return p.id === "sp-cr6h"; }); if (cr6) cr6.fit.push("CRF50F"); var br8 = PARTS.find(function (p) { return p.id === "sp-br8"; }); if (br8 && br8.fit) br8.fit.push("KDX220"); })();

/* японская тюнинг-специфика */
TUNING.push(
  { id: "jp-jetkit", cat: "Впуск", title: "Джет-кит для японского карбюратора", stage: 2, power: 7, price: 7500, diff: "средне", rating: 4.7, fit: ["DRZ400","DR650","KLX250","KLR650","XR650L","XT250","TTR230","CRF230F","KL250","DR200","DJEBEL250","DR350","TW200"],
    body: "Японцы с завода сильно обеднены под экологию. Игла, жиклёры и винт качества возвращают тягу и снижают нагрев.", notes: { "DRZ400": "Вместе с «3×3 модом» крышки airbox — классика для DR-Z400S." } },
  { id: "jp-3x3", cat: "Впуск", title: "Вскрытие airbox («3×3 мод»)", stage: 1, power: 4, price: 500, diff: "просто", rating: 4.6, fit: ["DRZ400"], body: "Окно 3×3 дюйма в крышке воздушного фильтра. Нужно перенастроить смесь." },
  { id: "jp-doohickey", cat: "Двигатель", title: "Усиленный натяжитель балансира", stage: 1, power: 0, price: 6500, diff: "сложно", rating: 4.9, fit: ["KLR650"], must: true, body: "Главная доработка надёжности KLR650 старых годов — штатный рычаг ломается." },
  { id: "jp-bigtank", cat: "Рама", title: "Увеличенный бак", stage: 1, power: 0, price: 32000, diff: "средне", rating: 4.6, fit: ["DR650","KLR650","XR650L","CRF250L","CRF300L","WR250R","DRZ400","XT250"], body: "Запас хода для туризма и дальних выездов." },
  { id: "jp-ecu", cat: "Электроника", title: "Тюнинг-модуль / прошивка ЭБУ", stage: 2, power: 6, price: 18000, diff: "средне", rating: 4.5, fit: ["CRF250L","CRF300L","WR250R","KLX230","XT660"], body: "Убирает «провалы» и бедную смесь стока, особенно после выпуска." }
);
(function () { var f = GOAL_W.power, r = GOAL_W.reliable, c = GOAL_W.comfort; GOAL_W.reliable = function (t) { return r(t) + ({ "jp-doohickey": 12 }[t.id] || 0); }; GOAL_W.comfort = function (t) { return c(t) + ({ "jp-bigtank": 6 }[t.id] || 0); }; })();

/* --- мотоциклы --- */
(function () {
  var E = "Эндуро", P2 = "Питбайк", M = "Мотард", T = "Тур-эндуро", L = "Лёгкий эндуро", K = "Кросс-эндуро", A = { approx: true };
  var add = addBike;
  /* Япония */
  add("Yamaha", "TW200", L, "TW200"); add("Yamaha", "XT660R", E, "XT660"); add("Yamaha", "XT660X", M, "XT660"); add("Yamaha", "XT660Z Ténéré", T, "XT660"); add("Yamaha", "XT600E", T, "XT660", A);
  add("Yamaha", "YZ250", K, "YZ250"); add("Yamaha", "YZ125", K, "YZ125"); add("Yamaha", "PW50", P2, "PW50"); add("Yamaha", "TT-R50E", P2, "CRF50F", A); add("Yamaha", "DT230 Lanza", E, "KDX220", A);
  add("Honda", "XR400R", E, "XR400R"); add("Honda", "XR125L", L, "XR125L"); add("Honda", "XLR125R", L, "XR125L", A); add("Honda", "CRF50F", P2, "CRF50F"); add("Honda", "XR250 Motard", M, "XR250");
  add("Honda", "XR230", L, "CRF230F", A); add("Honda", "XLR250R", E, "XR250", A); add("Honda", "AX-1", L, "CRF250L", A); add("Honda", "XR230 Motard", M, "CRF230F", A);
  add("Suzuki", "DR350SE", E, "DR350"); add("Suzuki", "Djebel 250", T, "DJEBEL250"); add("Suzuki", "DR250R", E, "DJEBEL250", A); add("Suzuki", "Van Van 200", L, "DR200", A); add("Suzuki", "Djebel 250 XC", T, "DJEBEL250");
  add("Kawasaki", "KDX200", K, "KDX220"); add("Kawasaki", "KDX220R", K, "KDX220"); add("Kawasaki", "KLX150BF", P2, "KLX140", A); add("Kawasaki", "KLX250SR", E, "KLX250", A); add("Kawasaki", "KLX250ES", E, "KLX250", A);
  /* Китай ещё */
  add("Kove", "450 Rally EX", E, "KOVE450", A); add("Voge", "300 Rally Pro", T, "VOGE300", A);
  add("Motoland", "XT250 HS 21/18", E, "172FMM-3A", A); add("Motoland", "TT250 21/18", E, "172FMM", A); add("Motoland", "Enduro EX 250", E, "172FMM-3A", A);
  add("Progasi", "Super Max 250 Pro", E, "172FMM-3A", A); add("Progasi", "Hardcore 300", E, "NB300", A); add("Progasi", "Endurance 450 EFI", E, "NC450");
  add("Kayo", "T2 250 Enduro", E, "172FMM", A); add("Kayo", "T4 250 Enduro", E, "172FMM", A); add("Kayo", "K1 250 Enduro", E, "172FMM-3A", A); add("Kayo", "K6-R 300", E, "NB300", A);
  add("BSE", "Z1 250 Enduro", E, "172FMM", A); add("BSE", "Z3 250", E, "172FMM-3A", A); add("BSE", "M2 Pro 250", E, "NC250", A);
  add("Avantis", "A2 Lux 250 21/18", E, "172FMM-5", A); add("Avantis", "A7 Lux", E, "172FMM-3A", A); add("Avantis", "Enduro 250 EFI Exclusive", E, "NC250E", A);
  add("Regulmoto", "Sport-003 PR 21/18", E, "172FMM-5", A); add("Regulmoto", "ZR 300", E, "PR300", A);
  add("Racer", "Panther RC300-GY8X", E, "PR300", A); add("Racer", "Nitro 250", L, "167FMM", A); add("Irbis", "TTR 250 Sport", E, "172FMM", A);
  add("GR", "GR2 250 Enduro", E, "172FMM", A); add("Wels", "MZK 250 Lite", E, "165FMM", A); add("Ataki", "EF125", P2, "154FMI", A);
  add("Rockot", "ZX250", E, "172FMM-3A", A); add("Hawk", "250 DLX", E, "167FMM", A); add("SSR", "SR250S", E, "172FMM", A);
  add("Apollo", "AGB-37 125", P2, "154FMI", A); add("Apollo", "DB-X18 150", P2, "1P60FMK", A); add("YCF", "Bigy 125 MX", P2, "154FMI", A); add("YCF", "Pilot F150", P2, "1P60FMK", A);
})();

/* --- ещё инструкции --- */
GUIDES.push(
  { id: "oil2t-mix", title: "Приготовление смеси 2T", area: "oil", time: "5 мин", diff: "просто", only: ["2t"], tools: ["Мерный стакан", "Канистра"], parts: ["oil"],
    steps: ["Пропорция 1:40 — это 25 мл масла на 1 литр бензина (если в мануале не указано другое).", "Сначала налей в канистру масло, потом примерно половину бензина.", "Взболтай, долей остальной бензин и ещё раз взболтай.", "Смесь храни не дольше месяца — масло отслаивается, бензин выдыхается.", "У моделей с раздельной смазкой (PW50 и т.п.) масло льётся в отдельный бачок, смесь не нужна."] },
  { id: "jp-valves-shim", title: "Клапаны на японском DOHC: шайба под толкателем", area: "head", time: "3–5 ч", diff: "сложно", only: ["jp"], tools: ["Щупы", "Микрометр", "Набор шайб", "Динамометрический ключ"], parts: ["shims", "vcgasket"],
    steps: ["Японские моторы держат зазоры долго — проверяй по регламенту ({valveInt} км), а не «на всякий случай».", "Норма на холодную: впуск {valveIn}, выпуск {valveEx}.", "Зазор уменьшился — клапан «садится»: шайба нужна тоньше.", "Под толкателем шайба маленькая — снимается только с распредвалами, держи её магнитом.", "Собирай строго по меткам ГРМ, затяжка крышек постелей по мануалу."] },
  { id: "used-check", title: "Осмотр б/у мотоцикла перед покупкой", area: null, time: "1 ч", diff: "просто", tools: ["Фонарик", "Магнит", "Компрессометр (по возможности)"], parts: ["compression"],
    steps: ["Приезжай к холодному мотору: как заводится на холодную — честный показатель.", "Сверь номер рамы и двигателя с документами. Код двигателя покажет, какой мотор стоит на самом деле.", "Послушай верх мотора: цокот — клапаны, лязг на сбросе — цепь ГРМ.", "Сизый дым на перегазовке — кольца или колпачки, белый на жидкостном — прокладка ГБЦ.", "Осмотри раму у рулевой и маятника на трещины, вилку на течь, подшипники колёс на люфт.", "Проверь сцепление: на 3–4 передаче резко добавь газ — обороты не должны убегать.", "По возможности замерь компрессию — для этого мотора норма {compression}."] }
);
/* ===================== v9: популярные мотоциклы со всего мира ===================== */
function ensureSpark(id, k) {
  var e = ENGINES[id]; if (PARTS.some(function (p) { return p.kind === "spark" && p.fit && p.fit.indexOf(id) >= 0; })) return;
  var p = P(id + "-spark", "Свеча " + e.spark.split(" /")[0], r50(600 * (k || 1)), "Расходники", "spark", [id]); p.info = "Под " + e.code; PARTS.unshift(p);
}
function W(id, o, k) { J(id, o); ENGINES[id].groups.push(o.region || "eu"); genKit(id, k || 2.4); ensureSpark(id, k || 2.4); }
var TPI = { stroke: "2T", cooling: "Жидкостное", fuel: "АИ-95/98, масло 2T — в отдельный бачок", ignition: "ЭБУ", start: "Электро", gearbox: "6 ст.", carb: "Впрыск TPI", jetMain: "—", jetPilot: "—", needle: "—", idle: "1500–1700", valveIn: "—", valveEx: "—", gap: "0.6–0.7 мм", oilVol: "КПП 0.8 л", oil: "2T масло (раздельная смазка)", oilInt: 0, valveInt: 0, hours: true, coolant: "≈ 1 л", cam: "Лепестковый клапан, клапан выпуска" };
var P2T = { stroke: "2T", cooling: "Жидкостное", fuel: "АИ-95/98 + 2T масло 1:60…1:40", ignition: "CDI", start: "Электро + кик", gearbox: "6 ст.", idle: "1500–1700", valveIn: "—", valveEx: "—", gap: "0.6–0.7 мм", oilVol: "КПП 0.8 л", oil: "Premix", oilInt: 0, valveInt: 0, hours: true, coolant: "≈ 1 л", cam: "Лепестковый клапан, клапан выпуска" };
function o(base, x) { return Object.assign({}, base, x); }
/* --- Европа: 2T --- */
W("KTM250TPI", o(TPI, { code: "KTM 250 TPI", name: "KTM / Husqvarna / GasGas 250 2T TPI", maker: "KTM Group", groups: ["2t","liquid","efi","big"], cc: 249, hp: 47, torque: "40 Н·м", compression: "≈ 9 бар", spark: "NGK BR7ES", issues: [{ t: "Датчики TPI и чистота топлива", sev: "med", fix: "Свежий бензин, фильтр насоса." }, { t: "Поршень по моточасам", sev: "high", fix: "Журнал моточасов." }] }));
W("KTM300TPI", o(TPI, { code: "KTM 300 TPI", name: "KTM / Husqvarna / GasGas 300 2T TPI", maker: "KTM Group", groups: ["2t","liquid","efi","big"], cc: 293, hp: 54, torque: "47 Н·м", compression: "≈ 9 бар", spark: "NGK BR7ES", issues: [{ t: "Масляный насос TPI — следи за уровнем в бачке", sev: "high", fix: "Без масла мотор заклинит." }, { t: "Поршень 40–60 м/ч", sev: "high", fix: "Журнал моточасов." }] }));
W("KTM300C", o(P2T, { code: "KTM 300 2T", name: "KTM 300 EXC (карбюратор, до 2018)", maker: "KTM", groups: ["2t","liquid","carb","big"], cc: 293, hp: 52, torque: "45 Н·м", compression: "≈ 9 бар", carb: "Keihin PWK36", jetMain: "165–172", jetPilot: "38–40", needle: "N3EW 3 канавка", spark: "NGK BR7ES", issues: [{ t: "Клапан выпуска закоксовывается", sev: "med", fix: "Чистка каждые 30–40 м/ч." }] }));
W("BETA300", o(P2T, { code: "Beta 300 2T", name: "Beta RR 250/300 · Xtrainer 300 (2T)", maker: "Beta", groups: ["2t","liquid","carb","big"], cc: 293, hp: 48, torque: "44 Н·м", compression: "≈ 9 бар", carb: "Keihin PWK36 (новые — впрыск TTI)", jetMain: "160–170", jetPilot: "38–40", needle: "3 канавка", spark: "NGK BR7ES", oil: "Premix (у части — раздельная смазка)", issues: [{ t: "Мягкий для хард-эндуро — главное следить за сцеплением", sev: "low", fix: "Масло КПП чаще." }] }));
W("SHERCO300", o(P2T, { code: "Sherco 300 2T", name: "Sherco SE 250/300 (2T)", maker: "Sherco", groups: ["2t","liquid","carb","big"], cc: 293, hp: 50, torque: "45 Н·м", compression: "≈ 9 бар", carb: "Keihin PWK36 (новые — TPI)", jetMain: "165–172", jetPilot: "38–40", needle: "3 канавка", spark: "NGK BR7ES", issues: [{ t: "Клапан выпуска", sev: "med", fix: "Чистка по моточасам." }] }));
W("TM300", o(P2T, { code: "TM 300 Fi", name: "TM EN 250/300 Fi (2T)", maker: "TM Racing", groups: ["2t","liquid","efi","big"], cc: 293, hp: 52, torque: "46 Н·м", compression: "≈ 9 бар", carb: "Впрыск Fi", jetMain: "—", jetPilot: "—", needle: "—", spark: "NGK BR8ES", issues: [{ t: "Редкие запчасти — заказ заранее", sev: "med", fix: "Держи расходники в запасе." }] }));
/* --- Европа: 4T --- */
var F4 = { cooling: "Жидкостное", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1800–2000", gap: "0.7–0.8 мм", fuel: "АИ-95/98", oil: "10W-50 (JASO MA2)", oilInt: 1500, valveInt: 7500, coolant: "≈ 1 л" };
W("KTM250F", o(F4, { code: "KTM 250 F", name: "KTM 250 EXC-F / Husqvarna FE 250 / GasGas EC 250F", maker: "KTM Group", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана", cc: 249, hp: 40, torque: "25 Н·м", compression: "≈ 13 бар", valveIn: "0.10–0.15 мм", valveEx: "0.12–0.17 мм", spark: "NGK LMAR8AI-10", oilVol: "≈ 1.1 л", issues: [{ t: "Спортивный мотор: короткие интервалы ТО", sev: "med", fix: "Масло 1000–1500 км, клапаны по регламенту." }] }));
W("KTM350F", o(F4, { code: "KTM 350 F", name: "KTM 350 EXC-F / Husqvarna FE 350 / GasGas EC 350F", maker: "KTM Group", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана", cc: 349, hp: 50, torque: "33 Н·м", compression: "≈ 13 бар", valveIn: "0.10–0.15 мм", valveEx: "0.12–0.17 мм", spark: "NGK LMAR8AI-10", oilVol: "≈ 1.1 л", issues: [{ t: "Перегрев на месте в хард-эндуро", sev: "med", fix: "Вентилятор радиатора." }] }));
W("KTM450F", o(F4, { code: "KTM 450 F", name: "KTM 450/500 EXC-F / Husqvarna FE 450/501", maker: "KTM Group", groups: ["liquid","efi","4t","big"], cam: "SOHC, 4 клапана", cc: 449, hp: 58, torque: "48 Н·м", compression: "≈ 12 бар", valveIn: "0.10–0.15 мм", valveEx: "0.12–0.17 мм", spark: "NGK LKAR8BI-9", oilVol: "≈ 1.5 л", issues: [{ t: "Много мощности для леса — легко устать", sev: "low", fix: "Утяжелитель маховика, мягкая карта." }] }));
W("LC4", o(F4, { code: "LC4 690", name: "KTM 690 Enduro R / Husqvarna 701 (LC4)", maker: "KTM Group", groups: ["liquid","efi","4t","big","balancer"], cam: "SOHC, 4 клапана, 2 свечи", cc: 693, hp: 74, torque: "73 Н·м", compression: "≈ 12 бар", valveIn: "0.07–0.13 мм", valveEx: "0.12–0.18 мм", spark: "NGK LKAR8AI-9 (×2)", oilVol: "≈ 1.7 л", oilInt: 5000, valveInt: 15000, idle: "1400–1600", issues: [{ t: "Топливный насос в баке", sev: "med", fix: "Фильтр насоса, не ездить на пустом баке." }] }));
W("KTM390", o(F4, { code: "KTM 390", name: "KTM 390 Adventure / Husqvarna 401", maker: "KTM Group", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана", cc: 373, hp: 43, torque: "37 Н·м", compression: "≈ 12 бар", valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK LMAR8AI-10", oilVol: "≈ 1.7 л", oilInt: 7500, valveInt: 15000, fuel: "АИ-95", idle: "1400–1600", issues: [{ t: "Перегрев в пробках", sev: "low", fix: "Вентилятор, антифриз по регламенту." }] }));
W("LC8C", o(F4, { code: "LC8c 890", name: "KTM 790/890 Adventure / Husqvarna Norden 901 (рядная двойка)", maker: "KTM Group", layout: "twin", crankPhase: 285, groups: ["dohc","liquid","efi","4t","big","balancer"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 889, hp: 105, torque: "100 Н·м", compression: "≈ 13 бар", valveIn: "0.10–0.15 мм", valveEx: "0.30–0.35 мм", spark: "NGK LMAR8DI-10 (×2)", oilVol: "≈ 3.4 л", oilInt: 7500, valveInt: 30000, fuel: "АИ-95", idle: "1350–1500", issues: [{ t: "Тяжёлый для бездорожья — нужны дуги и защита", sev: "low", fix: "Дуги, защита картера." }] }));
W("LC8", o(F4, { code: "LC8 1290", name: "KTM 1290 Super Adventure (V-twin)", maker: "KTM", layout: "vtwin", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, V-twin 75°", cc: 1301, hp: 160, torque: "138 Н·м", compression: "≈ 13 бар", valveIn: "0.10–0.15 мм", valveEx: "0.30–0.35 мм", spark: "NGK LMAR8DI-10 (×2)", oilVol: "≈ 4 л", oilInt: 7500, valveInt: 30000, fuel: "АИ-95", idle: "1350–1500", issues: [{ t: "Сложная электроника — диагностика у дилера", sev: "med", fix: "Адаптер и ПО для KTM." }] }));
W("BETA4T", o(F4, { code: "Beta 4T", name: "Beta RR 350/390/430/480 (4T)", maker: "Beta", groups: ["liquid","efi","4t","big"], cam: "4 клапана", cc: 431, hp: 52, torque: "45 Н·м", compression: "≈ 12 бар", valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK LKAR8AI-9", oilVol: "≈ 1.5 л", issues: [{ t: "Два масла: двигатель и КПП у старых — сверь мануал", sev: "med", fix: "Менять оба." }] }));
W("SHERCO4T", o(F4, { code: "Sherco 4T", name: "Sherco SEF 250/300/450 (4T)", maker: "Sherco", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана", cc: 303, hp: 45, torque: "30 Н·м", compression: "≈ 13 бар", valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK LMAR8AI-10", oilVol: "≈ 1.2 л", issues: [{ t: "Редкие запчасти", sev: "med", fix: "Держи расходники в запасе." }] }));
/* --- BMW --- */
W("G310", o(F4, { code: "BMW G310", name: "BMW G 310 GS (наклон цилиндра назад)", maker: "BMW / TVS", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана", cc: 313, hp: 34, torque: "28 Н·м", compression: "≈ 12 бар", valveIn: "0.10–0.17 мм", valveEx: "0.21–0.28 мм", spark: "NGK LMAR8AI-10", oilVol: "≈ 1.7 л", oilInt: 10000, valveInt: 20000, fuel: "АИ-95", idle: "1400–1600", issues: [{ t: "Мягкая подвеска для бездорожья", sev: "low", fix: "Пружины под вес." }] }), 2.6);
W("F850", o(F4, { code: "BMW F850", name: "BMW F 850/900 GS (рядная двойка 270°)", maker: "BMW", layout: "twin", crankPhase: 270, groups: ["dohc","liquid","efi","4t","big","balancer"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 853, hp: 95, torque: "92 Н·м", compression: "≈ 12.7 бар", valveIn: "0.10–0.17 мм", valveEx: "0.27–0.34 мм", spark: "NGK LMAR8AI-8 (×2)", oilVol: "≈ 4 л", oilInt: 10000, valveInt: 20000, fuel: "АИ-95", idle: "1300–1500", issues: [{ t: "Электроника и датчики — диагностика сканером", sev: "med", fix: "BMW-совместимый адаптер." }] }), 2.6);
W("R1250", o(F4, { code: "BMW Boxer", name: "BMW R 1250 / R 1300 GS (оппозит)", maker: "BMW", layout: "boxer", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, ShiftCam", cooling: "Воздушно-жидкостное", cc: 1254, hp: 136, torque: "143 Н·м", compression: "≈ 12.5 бар", valveIn: "0.15–0.20 мм", valveEx: "0.25–0.30 мм", spark: "NGK LMAR9EI-8 (×2)", oilVol: "≈ 4 л", oilInt: 10000, valveInt: 20000, fuel: "АИ-95", gearbox: "6 ст., кардан", idle: "1100–1300", issues: [{ t: "Кардан: масло в главной передаче", sev: "med", fix: "Менять по регламенту." }, { t: "Тяжёлый — техника езды и защита", sev: "low", fix: "Дуги, защита цилиндров." }] }), 2.8);
/* --- Индия --- */
W("HIM411", o(F4, { region: "in", code: "LS411", name: "Royal Enfield Himalayan 411 / Scram 411", maker: "Royal Enfield", groups: ["air","efi","4t","big"], cam: "SOHC, 2 клапана", cooling: "Воздушно-масляное", cc: 411, hp: 24.3, torque: "32 Н·м", compression: "≈ 9.5 бар", valveIn: "0.08–0.10 мм", valveEx: "0.18–0.20 мм", spark: "NGK BKR6E", oil: "15W-50 (JASO MA2)", oilVol: "≈ 2 л", gearbox: "5 ст.", oilInt: 5000, valveInt: 10000, fuel: "АИ-92/95", idle: "1300–1500", issues: [{ t: "Неспешный, но выносливый мотор", sev: "low", fix: "Масло по регламенту." }] }), 1.3);
W("HIM450", o(F4, { region: "in", code: "Sherpa 450", name: "Royal Enfield Himalayan 450 (Sherpa)", maker: "Royal Enfield", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана", cc: 452, hp: 40, torque: "40 Н·м", compression: "≈ 12 бар", valveIn: "0.10–0.15 мм", valveEx: "0.20–0.25 мм", spark: "NGK LKAR8AI-9", oilVol: "≈ 2.3 л", oilInt: 10000, valveInt: 20000, fuel: "АИ-95", idle: "1300–1500", issues: [{ t: "Ранние партии — обновления ПО", sev: "low", fix: "Прошивка у дилера." }] }), 1.4);
W("XP200", o(F4, { region: "in", code: "Hero 200", name: "Hero XPulse 200 4V", maker: "Hero", groups: ["air","efi","4t","big"], cam: "SOHC, 4 клапана", cooling: "Воздушно-масляное", cc: 200, hp: 19, torque: "17 Н·м", compression: "≈ 10 бар", valveIn: "0.08–0.12 мм", valveEx: "0.10–0.14 мм", spark: "NGK CPR8EA-9", oil: "10W-30 (JASO MA2)", oilVol: "≈ 1.4 л", gearbox: "5 ст.", oilInt: 3000, valveInt: 10000, fuel: "АИ-92/95", idle: "1400–1600", issues: [{ t: "Лёгкий и простой — следи за цепью", sev: "low", fix: "Смазка цепи." }] }), 1.1);
/* --- большие японцы и кросс --- */
W("AT1100", o(F4, { region: "jp", code: "SD10E", name: "Honda Africa Twin CRF1100L (рядная двойка 270°)", maker: "Honda", layout: "twin", crankPhase: 270, groups: ["liquid","efi","4t","big","balancer"], cam: "Unicam SOHC, 8 клапанов", cc: 1084, hp: 102, torque: "105 Н·м", compression: "≈ 12 бар", valveIn: "0.15–0.21 мм", valveEx: "0.24–0.30 мм", spark: "NGK IFR8H11 / SILMAR8A9S", oil: "10W-30 (JASO MA)", oilVol: "≈ 4.8 л", oilInt: 8000, valveInt: 24000, fuel: "АИ-92/95", idle: "1100–1300", issues: [{ t: "DCT-версия: масло и фильтр DCT", sev: "med", fix: "Регламент DCT." }] }), 2.2);
W("XL750", o(F4, { region: "jp", code: "RH16E", name: "Honda Transalp XL750 (рядная двойка 270°)", maker: "Honda", layout: "twin", crankPhase: 270, groups: ["liquid","efi","4t","big"], cam: "Unicam SOHC, 8 клапанов", cc: 755, hp: 91, torque: "75 Н·м", compression: "≈ 11.5 бар", valveIn: "0.15–0.21 мм", valveEx: "0.24–0.30 мм", spark: "NGK LMAR8AI-8", oil: "10W-30 (JASO MA)", oilVol: "≈ 3.3 л", oilInt: 8000, valveInt: 24000, fuel: "АИ-92/95", idle: "1100–1300", issues: [{ t: "Сток-подвеска мягкая для бездорожья", sev: "low", fix: "Пружины под вес." }] }), 2.0);
W("CRF450", o(F4, { region: "jp", code: "PE07E", name: "Honda CRF450R / RX / L / RL", maker: "Honda", groups: ["liquid","efi","4t","big"], cam: "Unicam SOHC, 4 клапана", cc: 449, hp: 55, torque: "51 Н·м", compression: "≈ 13 бар", valveIn: "0.13–0.19 мм", valveEx: "0.25–0.31 мм", spark: "NGK SIMR8A9", oilVol: "≈ 1.2 л", oilInt: 1500, valveInt: 7500, issues: [{ t: "Кроссовый мотор — ТО по моточасам", sev: "med", fix: "Масло каждые 5–10 м/ч в гонках." }] }), 2.0);
W("CRF250R", o(F4, { region: "jp", code: "ME17E", name: "Honda CRF250R / RX", maker: "Honda", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана", cc: 249, hp: 42, torque: "28 Н·м", compression: "≈ 13.5 бар", valveIn: "0.09–0.15 мм", valveEx: "0.20–0.26 мм", spark: "NGK SILMAR9A9S", oilVol: "≈ 1.1 л", oilInt: 1500, valveInt: 7500, issues: [{ t: "Высокие обороты — клапаны садятся", sev: "med", fix: "Проверка по моточасам." }] }), 2.0);
W("T700", o(F4, { region: "jp", code: "CP2", name: "Yamaha Ténéré 700 (CP2, рядная двойка 270°)", maker: "Yamaha", layout: "twin", crankPhase: 270, groups: ["dohc","liquid","efi","4t","big","balancer"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 689, hp: 73, torque: "68 Н·м", compression: "≈ 11.5 бар", valveIn: "0.11–0.20 мм", valveEx: "0.24–0.30 мм", spark: "NGK LMAR8A-9", oil: "10W-40 (JASO MA)", oilVol: "≈ 3 л", oilInt: 10000, valveInt: 40000, fuel: "АИ-92/95", idle: "1250–1350", issues: [{ t: "Очень надёжный мотор", sev: "low", fix: "ТО по регламенту." }] }), 2.0);
W("YZ450F", o(F4, { region: "jp", code: "YZ450F", name: "Yamaha YZ450F / WR450F", maker: "Yamaha", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана, обратный цилиндр", cc: 450, hp: 57, torque: "50 Н·м", compression: "≈ 12.8 бар", valveIn: "0.10–0.15 мм", valveEx: "0.20–0.25 мм", spark: "NGK CR8EIA-10", oilVol: "≈ 1 л", oilInt: 1500, valveInt: 7500, issues: [{ t: "Перевёрнутая головка — воздух спереди, выпуск сзади", sev: "low", fix: "Учитывай при ремонте." }] }), 2.0);
W("YZ250F", o(F4, { region: "jp", code: "YZ250F", name: "Yamaha YZ250F / WR250F", maker: "Yamaha", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана", cc: 250, hp: 42, torque: "28 Н·м", compression: "≈ 13.5 бар", valveIn: "0.10–0.15 мм", valveEx: "0.17–0.22 мм", spark: "NGK CR9EIA-9", oilVol: "≈ 1 л", oilInt: 1500, valveInt: 7500, issues: [{ t: "Высокие обороты — клапаны садятся", sev: "med", fix: "Проверка по моточасам." }] }), 2.0);
W("KX450", o(F4, { region: "jp", code: "KX450", name: "Kawasaki KX450 / KX450X", maker: "Kawasaki", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана", cc: 449, hp: 56, torque: "50 Н·м", compression: "≈ 12.8 бар", valveIn: "0.10–0.20 мм", valveEx: "0.17–0.22 мм", spark: "NGK CPR8EB-9", oilVol: "≈ 1.2 л", oilInt: 1500, valveInt: 7500, issues: [{ t: "ТО по моточасам", sev: "med", fix: "Журнал." }] }), 2.0);
W("RMZ450", o(F4, { region: "jp", code: "RM-Z450", name: "Suzuki RM-Z450 / RM-Z250", maker: "Suzuki", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 4 клапана", cc: 449, hp: 54, torque: "49 Н·м", compression: "≈ 12.5 бар", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR8EB", oilVol: "≈ 1.2 л", oilInt: 1500, valveInt: 7500, issues: [{ t: "ТО по моточасам", sev: "med", fix: "Журнал." }] }), 2.0);
W("VS650", o(F4, { region: "jp", code: "P509", name: "Suzuki V-Strom 650 (V-twin 90°)", maker: "Suzuki", layout: "vtwin", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, V-twin", cc: 645, hp: 70, torque: "62 Н·м", compression: "≈ 11.5 бар", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK MR8E-9 (×2)", oil: "10W-40 (JASO MA)", oilVol: "≈ 3 л", oilInt: 6000, valveInt: 24000, fuel: "АИ-92/95", idle: "1200–1400", issues: [{ t: "Реле-регулятор у старых", sev: "med", fix: "Проверка зарядки." }] }), 1.9);
W("VERSYS300", o(F4, { region: "jp", code: "EX300", name: "Kawasaki Versys-X 300 (рядная двойка 180°)", maker: "Kawasaki", layout: "twin", crankPhase: 180, groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 296, hp: 40, torque: "26 Н·м", compression: "≈ 13 бар", valveIn: "0.15–0.22 мм", valveEx: "0.22–0.31 мм", spark: "NGK CR9EIA-9", oil: "10W-40 (JASO MA)", oilVol: "≈ 2.4 л", oilInt: 6000, valveInt: 24000, fuel: "АИ-92/95", idle: "1200–1400", issues: [{ t: "Высокооборотистый — крутить надо", sev: "low", fix: "Звезда −1 зуб для бездорожья." }] }), 1.8);
W("YZ85", o(P2T, { region: "jp", code: "YZ85", name: "Yamaha YZ85 / Kawasaki KX85 (2T)", maker: "Yamaha / Kawasaki", groups: ["2t","liquid","carb","small"], cc: 85, hp: 22, torque: "13 Н·м", compression: "≈ 9 бар", start: "Кик", carb: "Keihin PWK28", jetMain: "128–135", jetPilot: "40", needle: "3 канавка", spark: "NGK BR9EG", issues: [{ t: "Подростковый кроссовик — поршень по моточасам", sev: "high", fix: "Журнал." }] }), 1.8);
/* --- СССР / Россия --- */
var RU = { region: "ru", fuel: "АИ-92 + масло 1:25…1:40", ignition: "Батарейная / БСЗ", start: "Кик", gearbox: "4 ст.", jetPilot: "—", needle: "2–3 канавка", idle: "≈ 1000", valveIn: "—", valveEx: "—", gap: "0.5–0.6 мм", oilVol: "КПП 1–1.5 л (трансмиссионное)", oil: "Premix", oilInt: 0, valveInt: 0, stroke: "2T", cam: "Двухтактный, без клапанов", cooling: "Воздушное" };
W("IZHP5", o(RU, { code: "ИЖ П-5", name: "ИЖ Планета-5 (2T)", maker: "Ижмаш", groups: ["2t","air","carb","big"], cc: 346, hp: 22, torque: "29 Н·м", compression: "≈ 8 бар", carb: "К-62М", jetMain: "≈ 180–190", spark: "А17Н / Brisk N15C", issues: [{ t: "Электрика и прерыватель", sev: "med", fix: "Электронное зажигание — популярная доработка." }, { t: "Сальники коленвала — подсос", sev: "med", fix: "Замена сальников." }] }), 0.45);
W("IZHJ5", o(RU, { code: "ИЖ Ю-5", name: "ИЖ Юпитер-5 (2T, двухцилиндровый)", maker: "Ижмаш", layout: "twin", crankPhase: 180, groups: ["2t","air","carb","big"], cc: 347, hp: 24, torque: "28 Н·м", compression: "≈ 8 бар", carb: "К-62 ×2 (или один К-65)", jetMain: "≈ 160–170", spark: "А17Н / Brisk N15C ×2", issues: [{ t: "Синхронизация двух карбюраторов", sev: "med", fix: "Настраивать оба одинаково." }, { t: "Средний сальник коленвала", sev: "high", fix: "Подсос — один цилиндр «не работает»." }] }), 0.45);
W("MINSK125", o(RU, { code: "М-125", name: "Минск ММВЗ 3.112 / М1НСК 125 (2T)", maker: "ММВЗ", groups: ["2t","air","carb","small"], cc: 124, hp: 11.5, torque: "12 Н·м", compression: "≈ 8 бар", carb: "К-65Т / Pegas", jetMain: "≈ 100–110", spark: "А17Н / Brisk N15C", issues: [{ t: "Неприхотливый — главное смесь и сальники", sev: "low", fix: "Смесь 1:40 на хорошем масле." }] }), 0.4);
W("VOSHOD", o(RU, { code: "Восход-3М", name: "Восход-3М (2T)", maker: "ЗиД", groups: ["2t","air","carb","small"], cc: 174, hp: 14, torque: "15 Н·м", compression: "≈ 8 бар", carb: "К-62С", jetMain: "≈ 130–140", spark: "А17Н / Brisk N15C", issues: [{ t: "Перегрев на бедной смеси", sev: "med", fix: "Жиклёр и смесь." }] }), 0.4);
W("URAL", o({ region: "ru", fuel: "АИ-92", ignition: "Электронное (у старых — контактное)", start: "Электро + кик", gearbox: "4 ст. + задний ход, кардан", needle: "3 канавка", gap: "0.6–0.7 мм", oil: "10W-40 / 20W-50", oilInt: 3000, valveInt: 3000, stroke: "4T", cooling: "Воздушное" }, { code: "Урал 750", name: "Урал / ИМЗ (оппозит OHV)", maker: "ИМЗ", layout: "boxer", groups: ["air","carb","4t","big","cg"], cam: "OHV, 4 клапана, оппозит", cc: 745, hp: 40, torque: "57 Н·м", compression: "≈ 9 бар", carb: "К-68 ×2 / Keihin ×2", jetMain: "≈ 130–140", jetPilot: "≈ 40", idle: "800–1000", valveIn: "0.10 мм", valveEx: "0.10 мм", spark: "NGK BPR6ES ×2", oilVol: "≈ 2.5 л", issues: [{ t: "Синхронизация двух карбюраторов", sev: "med", fix: "Синхронизатор или «на слух»." }, { t: "Течи масла — классика", sev: "low", fix: "Прокладки и сальники." }] }), 0.7);
/* --- мотоциклы --- */
(function () {
  var E = "Эндуро", K = "Кросс-эндуро", T = "Тур-эндуро", L = "Лёгкий эндуро", C = "Классика", P2 = "Питбайк", A = { approx: true };
  var add = addBike;
  add("KTM", "250 EXC TPI", K, "KTM250TPI"); add("KTM", "300 EXC TPI", K, "KTM300TPI"); add("KTM", "300 EXC (карбюратор)", K, "KTM300C"); add("KTM", "250 EXC-F", E, "KTM250F"); add("KTM", "350 EXC-F", E, "KTM350F");
  add("KTM", "450 EXC-F", E, "KTM450F"); add("KTM", "500 EXC-F", E, "KTM450F", { hp: 62 }); add("KTM", "690 Enduro R", E, "LC4"); add("KTM", "390 Adventure", T, "KTM390"); add("KTM", "890 Adventure R", T, "LC8C");
  add("KTM", "790 Adventure", T, "LC8C", { hp: 95 }); add("KTM", "1290 Super Adventure", T, "LC8"); add("KTM", "250 SX-F", K, "KTM250F", A); add("KTM", "450 SX-F", K, "KTM450F", A);
  add("Husqvarna", "TE 250", K, "KTM250TPI"); add("Husqvarna", "TE 300", K, "KTM300TPI"); add("Husqvarna", "FE 250", E, "KTM250F"); add("Husqvarna", "FE 350", E, "KTM350F"); add("Husqvarna", "FE 450", E, "KTM450F");
  add("Husqvarna", "FE 501", E, "KTM450F", { hp: 62 }); add("Husqvarna", "701 Enduro", E, "LC4"); add("Husqvarna", "Norden 901", T, "LC8C");
  add("GasGas", "EC 250", K, "KTM250TPI"); add("GasGas", "EC 300", K, "KTM300TPI"); add("GasGas", "EC 250F", E, "KTM250F"); add("GasGas", "EC 350F", E, "KTM350F"); add("GasGas", "ES 700", E, "LC4", A);
  add("Beta", "RR 250 2T", K, "BETA300", { hp: 43 }); add("Beta", "RR 300 2T", K, "BETA300"); add("Beta", "Xtrainer 300", K, "BETA300", { hp: 40 }); add("Beta", "RR 350 4T", E, "BETA4T", { hp: 45 }); add("Beta", "RR 390 4T", E, "BETA4T", { hp: 48 });
  add("Beta", "RR 430 4T", E, "BETA4T"); add("Beta", "RR 480 4T", E, "BETA4T", { hp: 56 });
  add("Sherco", "SE 250", K, "SHERCO300", { hp: 45 }); add("Sherco", "SE 300", K, "SHERCO300"); add("Sherco", "SEF 300", E, "SHERCO4T"); add("Sherco", "SEF 450", E, "SHERCO4T", { hp: 55 });
  add("TM Racing", "EN 300 Fi", K, "TM300"); add("TM Racing", "EN 250 Fi", K, "TM300", { hp: 46 }); add("Rieju", "MR 300", K, "BETA300", A); add("Fantic", "XEF 250", E, "YZ250F", A); add("Fantic", "XEF 450", E, "YZ450F", A);
  add("BMW", "G 310 GS", T, "G310"); add("BMW", "F 850 GS", T, "F850"); add("BMW", "F 900 GS", T, "F850", { hp: 105 }); add("BMW", "R 1250 GS", T, "R1250"); add("BMW", "R 1300 GS", T, "R1250", { hp: 145 });
  add("Royal Enfield", "Himalayan 411", T, "HIM411"); add("Royal Enfield", "Scram 411", L, "HIM411"); add("Royal Enfield", "Himalayan 450", T, "HIM450"); add("Hero", "XPulse 200 4V", L, "XP200");
  add("Honda", "Africa Twin CRF1100L", T, "AT1100"); add("Honda", "Transalp XL750", T, "XL750"); add("Honda", "CRF450L", E, "CRF450", { hp: 24 }); add("Honda", "CRF450RL", E, "CRF450", { hp: 24 });
  add("Honda", "CRF450R", K, "CRF450"); add("Honda", "CRF450RX", E, "CRF450"); add("Honda", "CRF250R", K, "CRF250R"); add("Honda", "CRF250RX", E, "CRF250R");
  add("Yamaha", "Ténéré 700", T, "T700"); add("Yamaha", "WR450F", E, "YZ450F"); add("Yamaha", "YZ450F", K, "YZ450F"); add("Yamaha", "WR250F", E, "YZ250F"); add("Yamaha", "YZ250F", K, "YZ250F"); add("Yamaha", "YZ85", K, "YZ85");
  add("Kawasaki", "KX450", K, "KX450"); add("Kawasaki", "KX450X", E, "KX450"); add("Kawasaki", "KX250", K, "KX450", { hp: 41, approx: true }); add("Kawasaki", "KX85", K, "YZ85"); add("Kawasaki", "KLX450R", E, "KX450", A); add("Kawasaki", "Versys-X 300", T, "VERSYS300");
  add("Suzuki", "RM-Z450", K, "RMZ450"); add("Suzuki", "RM-Z250", K, "RMZ450", { hp: 40, approx: true }); add("Suzuki", "V-Strom 650XT", T, "VS650");
  add("ИЖ", "Планета-5", C, "IZHP5"); add("ИЖ", "Юпитер-5", C, "IZHJ5"); add("Минск", "ММВЗ 3.112", C, "MINSK125"); add("Минск", "М1НСК 125", C, "MINSK125"); add("Восход", "3М", C, "VOSHOD");
  add("Урал", "М-67 / ИМЗ-8.103", C, "URAL"); add("Урал", "Gear Up", T, "URAL");
})();
/* ===================== v10: мопеды, мини, ещё модели ===================== */
ENGINES["147FMD"] = { id: "147FMD", code: "1P47FMD", name: "1P47FMD · горизонтальный 70–72 см³", maker: "Lifan / Zongshen / Loncin", groups: ["horiz","air","carb","4t","small"],
  stroke: "4T", cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 72, hp: 5, torque: "5 Н·м", compression: "9–11 бар",
  fuel: "АИ-92", ignition: "CDI", timing: "Цепь ГРМ", start: "Кик + электро", gearbox: "4 ст., полуавтомат",
  carb: "PZ19", jetMain: "72–78", jetPilot: "35", needle: "3 канавка", idle: "1500–1700",
  valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "A7TC (C7HSA)", gap: "0.6–0.7 мм", sparkTorque: "12–15 Н·м",
  oil: "10W-40 (JASO MA)", oilVol: "0.8 л", oilInt: 1000, valveInt: 2000,
  issues: [{ t: "Слабый генератор при LED-свете и подогревах", sev: "low", fix: "Не перегружать сеть, проверить реле-регулятор." }, { t: "Зажимаются клапаны", sev: "med", fix: "Регулировка каждые 2000 км." }] };
genKit("147FMD", 1);
J("CUB125", { code: "Honda 125 H", name: "Honda 125 горизонтальный (Grom / Monkey / CT125 / Super Cub C125)", maker: "Honda", groups: ["horiz","air","efi","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 124, hp: 9.8, torque: "11 Н·м", compression: "≈ 10 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "4–5 ст.", carb: "Инжектор", idle: "1500–1700", valveIn: "0.08 мм", valveEx: "0.08 мм", spark: "NGK CPR7EA-9", gap: "0.8–0.9 мм", oilVol: "1.0–1.1 л", oil: "10W-30 (JASO MA)", valveInt: 6000,
  issues: [{ t: "Очень надёжный мотор — главное масло и цепь", sev: "low", fix: "ТО по регламенту." }] });
J("CUB110", { code: "Honda 110 H", name: "Honda Super Cub 110 (полуавтомат)", maker: "Honda", groups: ["horiz","air","efi","4t","small","jp"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 109, hp: 8, torque: "8.5 Н·м", compression: "≈ 10 бар", ignition: "ЭБУ (EFI)", start: "Электро + кик", gearbox: "4 ст., полуавтомат", carb: "Инжектор", idle: "1400–1600", valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "NGK CPR6EA-9", gap: "0.8–0.9 мм", oilVol: "0.8 л", oil: "10W-30 (JASO MA)", valveInt: 6000,
  issues: [{ t: "Центробежное сцепление требует регулировки", sev: "low", fix: "Регулировочный винт сцепления на правой крышке." }] });
genKit("CUB125", 1.6); genKit("CUB110", 1.6); ensureSpark("CUB125", 1.4); ensureSpark("CUB110", 1.4);
(function () { var a = PARTS.find(function (p) { return p.id === "sp-a7tc"; }); if (a) a.fit.push("147FMD"); var c = PARTS.find(function (p) { return p.id === "ch-420"; }); if (c) c.fit.push("147FMD"); var z = PARTS.find(function (p) { return p.id === "pz19"; }); if (z) z.fit.push("147FMD"); })();

/* --- запчасти для мопедов --- */
var MOPED = ["139FMB", "147FMD", "152FMH", "154FMI", "CUB110", "CUB125"];
[["mp-tire250", "Покрышка 2.50-17 дорожная", 1800, "Колёса", "tireF"], ["mp-tire275", "Покрышка 2.75-17 дорожная", 1900, "Колёса", "tireR"], ["mp-tube17", "Камера 17\" мопедная", 450, "Колёса", "tube"],
 ["mp-shoeF", "Колодки барабанные передние", 450, "Тормоза", "brakeshoes"], ["mp-shoeR", "Колодки барабанные задние", 450, "Тормоза", "brakeshoes"], ["mp-bcable", "Трос переднего тормоза", 350, "Тормоза", "brakecable"],
 ["mp-shift", "Рычаг переключения «пятка-носок»", 900, "Трансмиссия", "shiftlever"], ["mp-pegs", "Подножки водителя (труба в сборе)", 1100, "Рама", "pegs"], ["mp-clutch", "Центробежное сцепление в сборе", 2400, "Трансмиссия", "clutchbasket"],
 ["mp-clutchadj", "Ремкомплект регулятора сцепления (полуавтомат)", 350, "Трансмиссия", "clutchsprings"], ["mp-head", "Фара круглая мопедная", 1200, "Электрика", "headlight"], ["mp-stop", "Стоп-сигнал в сборе", 650, "Электрика", "taillight"],
 ["mp-muff", "Глушитель мопеда", 2800, "Выпуск", "muffler"], ["mp-shocks", "Амортизаторы задние (пара)", 2600, "Подвеска", "shock"], ["mp-fork", "Вилка мопеда в сборе", 6500, "Подвеска", "forkleg"],
 ["mp-starter", "Кикстартер мопеда (рычаг)", 700, "Двигатель", "kick"], ["mp-cdi", "Коммутатор CDI мопеда", 650, "Электрика", "cdi"], ["mp-coil", "Катушка зажигания мопеда", 450, "Электрика", "coil"],
 ["mp-reg", "Реле-регулятор мопеда", 550, "Электрика", "regulator"], ["mp-stator", "Статор генератора мопеда", 1500, "Электрика", "stator"]
].forEach(function (x) { var p = P(x[0], x[1], x[2], x[3], x[4], MOPED); PARTS.push(p); });

/* --- модели --- */
(function () {
  var Mo = "Мопед", P2 = "Питбайк", L = "Лёгкий эндуро", E = "Эндуро", T = "Тур-эндуро", A = { approx: true };
  var add = addBike;
  add("Motoland", "Alpha 50", Mo, "139FMB", A); add("Motoland", "Alpha 72", Mo, "147FMD", A); add("Motoland", "Alpha 110", Mo, "152FMH", A); add("Motoland", "Alpha Lux 110", Mo, "152FMH", A);
  add("Motoland", "Alpha RX 125", Mo, "154FMI", A); add("Motoland", "Orion 110", Mo, "152FMH", A); add("Motoland", "Delta 110", Mo, "152FMH", A);
  add("Racer", "Alpha RC110N", Mo, "152FMH", A); add("Racer", "Alpha RC125N", Mo, "154FMI", A); add("Racer", "Alpha RC50", Mo, "139FMB", A); add("Racer", "Trophy 110", Mo, "152FMH", A);
  add("Irbis", "Virago 110", Mo, "152FMH", A); add("Irbis", "Virago Black Edition", Mo, "152FMH", A); add("Irbis", "Virago II 125", Mo, "154FMI", A); add("Irbis", "Z50R", P2, "139FMB", A);
  add("Stels", "Delta 125", Mo, "154FMI", A); add("Stels", "Delta 50", Mo, "139FMB", A); add("Stels", "Orion 110", Mo, "152FMH", A);
  add("Regulmoto", "Alpha 110", Mo, "152FMH", A); add("Regulmoto", "Raptor 125", Mo, "154FMI", A); add("Patron", "Альфа 110", Mo, "152FMH", A);
  add("Kayo", "Basic 70", P2, "147FMD", A); add("Kayo", "TS90", P2, "152FMH", A); add("Apollo", "Kids 70", P2, "147FMD", A); add("BSE", "Kids-70", P2, "147FMD", A);
  add("Progasi", "Kids 70", P2, "147FMD", A); add("Avantis", "Pitbike 70", P2, "147FMD", A); add("JMC", "70 Kids", P2, "147FMD", A);
  add("Honda", "Super Cub 110", Mo, "CUB110"); add("Honda", "Super Cub C125", Mo, "CUB125"); add("Honda", "CT125 Trail", L, "CUB125"); add("Honda", "Monkey 125", Mo, "CUB125"); add("Honda", "Grom (MSX125)", Mo, "CUB125");
  add("Любая модель", "с мотором 1P47FMD", P2, "147FMD");
})();

/* --- инструкции для мопедов --- */
GUIDES.push(
  { id: "moped-clutch", title: "Регулировка сцепления полуавтомата (мопед)", area: "clutch", time: "15 мин", diff: "просто", only: ["horiz"], tools: ["Ключ 14", "Отвёртка"], parts: ["clutchsprings"],
    steps: ["Мотор заглушен, нейтраль.", "На правой крышке картера найди болт с контргайкой под пластиковой заглушкой.", "Ослабь контргайку, закрути регулировочный винт до лёгкого сопротивления.", "Отверни винт на 1/8–1/4 оборота назад и затяни контргайку.", "Проверь: передачи включаются без удара, мотоцикл не ползёт на холостых."] },
  { id: "drum-brake", title: "Замена колодок барабанного тормоза", area: null, time: "40 мин", diff: "просто", only: ["horiz"], tools: ["Ключи", "Наждачка"], parts: ["brakeshoes"],
    steps: ["Сними колесо (для заднего — ослабь цепь).", "Вынь щит тормоза, сними колодки вместе с пружинами, запомни расположение.", "Зачисти барабан от нагара мелкой наждачкой.", "Поставь новые колодки с пружинами, смажь ось кулачка тонким слоем смазки.", "Собери, отрегулируй ход рычага/педали гайкой на тяге или тросе."] }
);
/* ===================== v11: скорость, детали, установка, инструкции ===================== */

/* ---------- модель максимальной скорости ---------- */
var SPEED_CLS = {
  enduro: { cda: 0.70, m: 200, crr: 0.022, rim: 18, h: 110 }, cross: { cda: 0.65, m: 180, crr: 0.022, rim: 19, h: 100 },
  tour: { cda: 0.74, m: 235, crr: 0.018, rim: 18, h: 100 }, motard: { cda: 0.62, m: 190, crr: 0.015, rim: 17, h: 98 },
  light: { cda: 0.66, m: 200, crr: 0.018, rim: 18, h: 100 }, pit: { cda: 0.62, m: 140, crr: 0.022, rim: 14, h: 90 },
  kids: { cda: 0.45, m: 95, crr: 0.022, rim: 12, h: 80 }, moped: { cda: 0.60, m: 170, crr: 0.015, rim: 17, h: 70 }
};
function speedClass(bike, eng) { return typeof bikeClass === "function" ? bikeClass(bike, eng) : "enduro"; }
function defaultSprockets(bike, eng) {
  var c = speedClass(bike, eng), two = eng.stroke === "2T", L = eng.layout || "single";
  if (c === "sport" || c === "naked") return eng.cc >= 900 ? [17, 43] : eng.cc >= 500 ? [16, 45] : [14, 42];
  if (c === "cruiser") return [15, 38]; if (c === "trial") return [9, 41];
  if (c === "moped") return [14, 35]; if (c === "kids") return [13, 37]; if (c === "pit") return [14, 37];
  if (c === "light") return [15, 45]; if (c === "motard") return [15, 42];
  if (c === "cross") return two ? (eng.cc <= 150 ? [13, 48] : [13, 50]) : [13, 49];
  if (c === "tour") return L !== "single" ? [16, 42] : [15, 45];
  if (two) return [13, 50]; if (eng.jp && eng.groups.indexOf("efi") >= 0 && eng.cc < 400) return [14, 40];
  return eng.cc >= 400 ? [15, 48] : [14, 48];
}
function topRatio(eng) {
  if (eng.topRatio) return eng.topRatio;
  var L = eng.layout || "single", has = function (k) { return eng.groups.indexOf(k) >= 0; };
  if (L !== "single") return 1.75;
  if (eng.stroke === "2T") return eng.cc <= 90 ? 3.3 : eng.cc <= 150 ? 2.8 : 2.25;
  if (has("horiz")) return /полуавтомат/.test(eng.gearbox) ? 3.85 : 3.1;
  if (eng.cc >= 600) return 1.95; if (eng.cc >= 400) return 2.2;
  if (has("liquid") && has("dohc")) return 2.45; if (has("cg")) return 2.95;
  return 2.62;
}
function tireCirc(rim, h) { return Math.PI * (rim * 25.4 + 2 * h) / 1000; }
function solveVPower(watts, P) {
  var lo = 1, hi = 120;
  for (var i = 0; i < 60; i++) { var v = (lo + hi) / 2, need = 0.5 * 1.2 * P.cda * v * v * v + P.crr * P.m * 9.81 * v; if (need > watts) hi = v; else lo = v; }
  return lo;
}
/* items — доработки, которые считаем установленными (TUNING-объекты) */
function speedFor(eng, bike, cu, items, opt) {
  opt = opt || {}; cu = cu || {}; items = items || [];
  var c = speedClass(bike, eng), P = Object.assign({}, SPEED_CLS[c] || SPEED_CLS.enduro);
  if ((eng.layout || "single") !== "single") { P.m += 70; P.cda += 0.05; }
  var def = defaultSprockets(bike, eng);
  var f = Number(opt.front || cu.sprF) || def[0], r = Number(opt.rear || cu.sprR) || def[1];
  var userSpr = !!(cu.sprF || cu.sprR) && !opt.front;
  items.forEach(function (t) {
    if (opt.front || (userSpr && (eng.installed || []).indexOf(t.id) >= 0)) return;
    if (t.id === "sp-tq") f -= 1; if (t.id === "sp-sp") f += 1; if (t.id === "rear-sp") r += 2;
  });
  var rim = Number(cu.rim) || P.rim, circ = tireCirc(rim, rim === P.rim ? P.h : (rim <= 14 ? 85 : rim <= 17 ? 90 : 105));
  var gain = typeof tuneGain === "function" ? tuneGain(items) : 0;
  var hp = cu.hp && !opt.ignoreUserHp ? Number(cu.hp) : (eng.stockHp || eng.hp) * (1 + gain / 100);
  var red = (typeof enginePeak === "function" ? enginePeak(eng).red : 9000);
  var vGear = red / (topRatio(eng) * (r / f)) * circ * 60 / 1000;
  var vPow = solveVPower(hp * 745.7 * 0.87, P) * 3.6;
  var v = Math.min(vGear, vPow);
  return { v: Math.round(v), vGear: Math.round(vGear), vPow: Math.round(vPow), limit: vGear < vPow * 0.97 ? "rpm" : "power", front: f, rear: r, rim: rim, red: red, hp: Math.round(hp * 10) / 10, def: def };
}

/* ---------- детали двигателя для 3D: что это и что купить ---------- */
var DETAILS = {
  crankcase: { t: "Картер", area: "oil", d: "Корпус двигателя: внутри коленвал, КПП и масло. Две половины, сальники валов, подшипники.", wear: "Течи по разъёму и сальникам, трещины после ударов.", kinds: ["engseals", "crankbearings", "gasketset"], diff: "очень сложно", time: "8–12 ч" },
  piston: { t: "Поршень с кольцами", area: "cyl", d: "Принимает давление газов и передаёт его через шатун на коленвал. Кольца держат компрессию и снимают масло со стенок.", wear: "Сизый дым, расход масла, низкая компрессия, тяжёлый запуск.", kinds: ["piston", "rings", "basegasket"], guide: "compression", diff: "сложно", time: "3–5 ч" },
  rod: { t: "Шатун", area: "cyl", d: "Связывает поршень с коленвалом. Нижняя головка на роликовом подшипнике.", wear: "Глухой стук снизу, люфт шатуна вверх-вниз.", kinds: ["crank"], diff: "очень сложно", time: "8–12 ч" },
  crank: { t: "Коленвал", area: "cyl", d: "Превращает ход поршня во вращение. Щёки-противовесы гасят вибрацию.", wear: "Стук снизу, вибрация, гул подшипников.", kinds: ["crank", "crankbearings"], diff: "очень сложно", time: "8–12 ч" },
  valves: { t: "Клапаны и пружины", area: "head", d: "Впускной пускает смесь, выпускной выпускает газы. Открываются кулачками распредвала, закрываются пружинами.", wear: "Цоканье (большой зазор), тяжёлый запуск на горячую (зажаты), прогар.", kinds: ["valvein", "valveex", "valveseals", "adjscrews"], guide: "valves", diff: "средне", time: "1 ч на регулировку" },
  cam: { t: "Распредвал", area: "head", d: "Кулачки открывают клапаны. Крутится в 2 раза медленнее коленвала.", wear: "Выработка кулачков, шум сверху, потеря мощности.", kinds: ["camshaft", "camsport"], guide: "timing-marks", diff: "сложно", time: "2–3 ч" },
  camchain: { t: "Цепь ГРМ и звёзды", area: "timing", d: "Синхронизирует распредвал с коленвалом. Натяжитель держит цепь натянутой.", wear: "Лязг на холостых и сбросе газа, шток натяжителя на максимуме.", kinds: ["camchain", "tensioner", "guide", "tenskit"], guide: "camchain", diff: "сложно", time: "4–6 ч" },
  tensioner: { t: "Натяжитель цепи ГРМ", area: "timing", d: "Подпирает успокоитель цепи ГРМ, выбирает её вытяжку.", wear: "Лязг цепи, заклинивший шток.", kinds: ["tensioner", "tenskit"], guide: "camchain", diff: "средне", time: "40 мин" },
  primary: { t: "Первичная передача", area: "clutch", d: "Шестерня на коленвале крутит корзину сцепления.", wear: "Вой шестерён, выкрошенные зубья.", kinds: ["clutchbasket"], diff: "сложно", time: "2–3 ч" },
  clutch: { t: "Сцепление (корзина и диски)", area: "clutch", d: "Фрикционные и стальные диски передают момент на КПП. Выжал рычаг — диски разошлись.", wear: "Буксует на высоких передачах, ведёт, запах гари.", kinds: ["clutchdiscs", "clutchsprings", "clutchbasket"], guide: "clutch-replace", diff: "средне", time: "1–2 ч" },
  gearbox: { t: "Шестерни КПП", area: "gearbox", d: "Пары шестерён на двух валах. Каждая передача — своя пара, включается вилками.", wear: "Выбивает передачу, хруст, тяжело включается.", kinds: ["gears", "shiftforks"], diff: "очень сложно", time: "8–12 ч" },
  rotor: { t: "Ротор генератора (маховик)", area: "gen", d: "Магниты на коленвале вращаются вокруг статора и вырабатывают ток.", wear: "Сорванная шпонка — сбилось зажигание; трещины магнитов.", kinds: ["rotor", "puller"], guide: "stator-replace", diff: "средне", time: "1–1.5 ч" },
  stator: { t: "Статор генератора", area: "gen", d: "Медные обмотки. Дают ток на зарядку АКБ, свет и зажигание.", wear: "Садится АКБ, тусклый свет, искра пропадает на горячую.", kinds: ["stator", "gengasket"], guide: "stator-replace", diff: "средне", time: "1.5 ч" },
  balancer: { t: "Балансирный вал", area: "cyl", d: "Крутится навстречу коленвалу и гасит вибрацию.", wear: "Сильная вибрация после сборки — сбиты метки балансира.", kinds: ["crankbearings"], diff: "очень сложно", time: "8–12 ч" },
  sprocket: { t: "Передняя звезда", area: "gearbox", d: "Сидит на вторичном валу КПП и тянет цепь. Число зубьев меняет тягу и максималку.", wear: "Зубья «акулий плавник», заострённые вершины.", kinds: ["sprocketF", "csseal", "sprocketR"], guide: "sprocket-change", diff: "просто", time: "30–60 мин" },
  chain: { t: "Цепь привода", area: "gearbox", d: "Передаёт момент на заднее колесо.", wear: "Вытянута (не держит натяжку), заржавевшие звенья, хлопает.", kinds: ["chain", "chainlube", "chainlock"], guide: "chain", diff: "просто", time: "20 мин (натяжка), 1 ч (замена)" },
  spark: { t: "Свеча и колпачок", area: "spark", d: "Поджигает смесь. Цвет изолятора подсказывает состав смеси.", wear: "Пропуски, тяжёлый запуск, нагар.", kinds: ["spark", "sparkcap", "htlead"], guide: "spark", diff: "просто", time: "10 мин" },
  carb: { t: "Карбюратор", area: "carb", d: "Готовит смесь воздуха и бензина. Жиклёры и игла определяют состав смеси.", wear: "Плавают обороты, провалы, перелив, тяжёлый запуск.", kinds: ["carbkit", "jets", "needle", "floatvalve", "carbcleaner"], guide: "carb-assemble", diff: "средне", time: "1–1.5 ч" },
  throttlebody: { t: "Дроссельный узел и форсунка", area: "carb", d: "У инжектора: заслонка дозирует воздух, форсунка — бензин по команде ЭБУ.", wear: "Плавают обороты, Check, провалы.", kinds: ["injector", "tps", "scanner"], guide: "efi-clean", diff: "средне", time: "1 ч" },
  airbox: { t: "Воздушный фильтр", area: "carb", d: "Не пускает пыль в мотор. Поролоновый надо промывать и пропитывать.", wear: "Грязный — богатая смесь и нет тяги; порванный — износ ЦПГ.", kinds: ["airfilter", "filteroil", "filterclean"], guide: "airfilter", diff: "просто", time: "20–30 мин" },
  intake: { t: "Впускной патрубок", area: "carb", d: "Резиновый патрубок между карбюратором и головкой.", wear: "Трещины — подсос воздуха, плавают обороты, белая свеча.", kinds: ["intake", "intakegasket"], guide: "carb-assemble", diff: "просто", time: "30 мин" },
  exhaust: { t: "Выпуск (коллектор и глушитель)", area: "exhaust", d: "Отводит газы. От конструкции выпуска зависит тяга.", wear: "Стрекот у головки — прогорела прокладка, хлопки, забитая набивка.", kinds: ["exgasket", "exstuds", "muffler", "expack"], guide: "exhaust", diff: "просто", time: "30–60 мин" },
  cylinder: { t: "Цилиндр", area: "cyl", d: "Гильза, в которой ходит поршень. Рёбра или рубашка отводят тепло.", wear: "Задиры, износ — сизый дым и низкая компрессия.", kinds: ["cylinder", "basegasket", "studs"], guide: "compression", diff: "сложно", time: "3–5 ч" },
  head: { t: "Головка цилиндра", area: "head", d: "Камера сгорания, клапаны, распредвал. Сверху свеча.", wear: "Течь прокладки ГБЦ, прогар клапанов, трещины от перегрева.", kinds: ["head", "headgasket", "vcgasket"], guide: "headgasket", diff: "сложно", time: "3–4 ч" },
  valvecover: { t: "Крышки клапанов", area: "head", d: "Под ними регулировочные винты или шайбы клапанов.", wear: "Течь масла из-под колец крышек.", kinds: ["vcgasket", "adjscrews", "feeler"], guide: "valves", diff: "просто", time: "10 мин открыть" },
  clutchcover: { t: "Правая крышка (сцепление)", area: "clutch", d: "Закрывает сцепление и масляный насос. Здесь окошко уровня масла.", wear: "Течь по прокладке, трещины после падений.", kinds: ["clutchgasket", "oil"], guide: "clutch-replace", diff: "средне", time: "40 мин снять" },
  gencover: { t: "Левая крышка (генератор)", area: "gen", d: "Закрывает ротор и статор. Пробки для выставления ВМТ.", wear: "Течь масла, трещины.", kinds: ["gengasket", "stator"], guide: "timing-marks", diff: "средне", time: "40 мин снять" },
  starter: { t: "Электростартер", area: "gen", d: "Крутит мотор через обгонную муфту.", wear: "Щелчок без прокрутки, стартер крутится вхолостую.", kinds: ["starter", "starterrelay", "sprag"], guide: "charging", diff: "средне", time: "1 ч" },
  drain: { t: "Сливная пробка", area: "oil", d: "Через неё сливают масло. Часто с магнитом.", wear: "Сорванная резьба от перетяжки.", kinds: ["drainplug", "oil"], guide: "oil", diff: "просто", time: "30 мин (замена масла)" },
  filler: { t: "Заливная пробка и уровень", area: "oil", d: "Сюда льют масло, рядом щуп или окошко уровня.", wear: "Масло выше нормы — перелив, ниже — износ.", kinds: ["oil", "oilfilter"], guide: "oil", diff: "просто", time: "5 мин" },
  oilfilter: { t: "Масляный фильтр", area: "oil", d: "Бумажный фильтр под крышкой на правой стороне.", wear: "Забит — масло идёт мимо фильтра.", kinds: ["oilfilter", "oil"], guide: "oil", diff: "просто", time: "30 мин" },
  radiator: { t: "Радиатор и патрубки", area: "cooling", d: "Охлаждает антифриз. Вентилятор помогает на малой скорости.", wear: "Перегрев, течь, забитые соты.", kinds: ["coolant", "radguard", "fan", "coolhoses"], guide: "coolant", diff: "средне", time: "1 ч" },
  pump: { t: "Помпа", area: "cooling", d: "Гоняет антифриз. Сальник отделяет его от масла.", wear: "Капает из дренажа, эмульсия в масле.", kinds: ["waterpump", "coolant"], guide: "coolant", diff: "средне", time: "1.5 ч" },
  shift: { t: "Лапка КПП", area: "gearbox", d: "Рычаг переключения передач.", wear: "Погнута после падения, люфт на шлицах.", kinds: ["shift", "shiftlever"], diff: "просто", time: "10 мин" },
  kick: { t: "Кикстартер", area: "clutch", d: "Рычаг запуска ногой.", wear: "Проскальзывает — износ храповика.", kinds: ["kick", "kickkit"], diff: "средне", time: "1–2 ч (храповик)" },
  pegs: { t: "Подножки", area: "oil", d: "У мопедов — труба подножек через картер.", wear: "Погнута труба, стёрты резинки.", kinds: ["pegs"], diff: "просто", time: "20 мин" }
};

/* ---------- сложность установки по типу детали ---------- */
var KIND_INSTALL = {
  spark: ["просто", "10 мин", "spark"], sparkcap: ["просто", "5 мин", "spark"], airfilter: ["просто", "20 мин", "airfilter"], filteroil: ["просто", "20 мин", "airfilter"],
  oil: ["просто", "30 мин", "oil"], oilfilter: ["просто", "30 мин", "oil"], drainplug: ["просто", "30 мин", "oil"], chainlube: ["просто", "10 мин", "chain"],
  chain: ["средне", "1 ч", "chain-replace"], sprocketF: ["просто", "30 мин", "sprocket-change"], sprocketR: ["средне", "1 ч", "sprocket-change"],
  padsF: ["просто", "30 мин", "pads"], padsR: ["просто", "30 мин", "pads"], brakefluid: ["средне", "40 мин", "brakes-bleed"], brakeshoes: ["просто", "40 мин", "drum-brake"],
  piston: ["сложно", "3–5 ч", "compression"], rings: ["сложно", "3–5 ч", "compression"], cylinder: ["сложно", "3–5 ч", "compression"], headgasket: ["сложно", "3–4 ч", "headgasket"],
  camchain: ["сложно", "4–6 ч", "camchain"], tensioner: ["средне", "40 мин", "camchain"], valvein: ["сложно", "4–6 ч", "headgasket"], valveex: ["сложно", "4–6 ч", "headgasket"],
  camshaft: ["сложно", "2–3 ч", "timing-marks"], clutchdiscs: ["средне", "1–2 ч", "clutch-replace"], clutchsprings: ["средне", "1 ч", "clutch-replace"],
  carbkit: ["средне", "1–1.5 ч", "carb-assemble"], jets: ["средне", "1 ч", "carb-sync"], needle: ["средне", "40 мин", "carb-needle"], floatvalve: ["средне", "1 ч", "carb-float"],
  carb: ["средне", "1 ч", "carb-pwk-install"], intake: ["просто", "30 мин", "carb-assemble"], cdi: ["просто", "15 мин", "cdi-install"], coil: ["просто", "20 мин", "coil-test"],
  stator: ["средне", "1.5 ч", "stator-replace"], regulator: ["просто", "20 мин", "charging"], battery: ["просто", "10 мин", null], starter: ["средне", "1 ч", "charging"],
  forkseals: ["сложно", "2–3 ч", "forkseals"], forkoil: ["средне", "1.5 ч", "fork-oil"], tube: ["средне", "40 мин", "tube"], tireF: ["средне", "1 ч", "tube"], tireR: ["средне", "1 ч", "tube"],
  wheelbearing: ["средне", "1 ч", "wheelbearings"], steering: ["сложно", "2–3 ч", "steering"], linkage: ["средне", "2–3 ч", "linkage"], shock: ["средне", "1 ч", "sag"],
  crank: ["очень сложно", "8–12 ч", null], gears: ["очень сложно", "8–12 ч", null], crankbearings: ["очень сложно", "8–12 ч", null], exgasket: ["просто", "30 мин", "exhaust"],
  muffler: ["просто", "30 мин", "exhaust-install"], expack: ["средне", "1 ч", "exhaust"], skid: ["просто", "30 мин", "skid-install"], handguards: ["просто", "40 мин", "handguards-install"],
  headlight: ["просто", "40 мин", "led-install"], hourmeter: ["просто", "30 мин", "hourmeter-install"], fan: ["средне", "1.5 ч", "fan-install"], oilcooler: ["средне", "1.5 ч", "oilcooler"],
  clutchcable: ["просто", "30 мин", "clutch-cable"], throttle: ["средне", "40 мин", "throttle-cable"], reedpetals: ["средне", "1 ч", "reed"], pv: ["средне", "1.5 ч", "pv-clean"],
  coolant: ["средне", "1 ч", "coolant"], waterpump: ["средне", "1.5 ч", "coolant"], vcgasket: ["просто", "30 мин", "valves"], gengasket: ["средне", "1 ч", "stator-replace"], clutchgasket: ["средне", "1 ч", "clutch-replace"]
};
function installInfo(kind) { var x = KIND_INSTALL[kind]; return x ? { diff: x[0], time: x[1], guide: x[2] } : null; }

/* ---------- инструкции к доработкам ---------- */
var TUNE_GUIDE = { filter: "filter-install", jets: "carb-sync", pe30: "carb-pwk-install", pwk: "carb-pwk-install", pwk28: "carb-pwk-install", slip: "exhaust-install", full: "exhaust-install",
  cdi: "cdi-install", "cdi-prog": "cdi-install", oilcool: "oilcooler", fan: "fan-install", "sp-tq": "sprocket-change", "sp-sp": "sprocket-change", "rear-sp": "sprocket-change", "x-ring": "chain-replace",
  skid: "skid-install", hand: "handguards-install", led: "led-install", hourmeter: "hourmeter-install", cam: "timing-marks", bore300: "compression", "bore-yx": "compression", "bore-cg": "compression" };

/* ---------- новые инструкции ---------- */
GUIDES.push(
  { id: "carb-assemble", title: "Карбюратор: разборка, чистка и сборка", area: "carb", time: "1–1.5 ч", diff: "средне", only: ["carb"], fig: "carb", tools: ["Отвёртки (крестовая и плоская)", "Очиститель карбюратора", "Компрессор или баллон воздуха", "Тонкая медная проволока"], parts: ["carbkit", "carbcleaner", "intake"],
    steps: ["Перекрой бензокран, слей бензин из поплавковой камеры через дренажный винт.", "Ослабь хомуты, сними карбюратор. Открути крышку сверху и вытащи золотник с иглой — трос газа можно не отсоединять.", "Переверни карбюратор, открути 4 винта поплавковой камеры (13 на схеме) и сними её.", "Вынь ось поплавка, сними поплавок (12) вместе с игольчатым клапаном (11). Осмотри кончик клапана: ступенька или риска — менять.", "Выкрути главный жиклёр (8), под ним распылитель (7), затем холостой жиклёр (9). Запиши номера жиклёров ({jetMain} / {jetPilot}).", "Посчитай обороты винта качества (10) до лёгкого упора и запиши. Выкрути его с пружинкой.", "Залей очиститель во все каналы, подержи 5–10 минут, продуй воздухом. Жиклёры смотри на просвет — отверстие должно быть круглым и чистым.", "Не расковыривай жиклёры сталью — только медной проволокой или леской, иначе изменится калибр.", "Собирай в обратном порядке на новых уплотнениях из ремкомплекта. Винт качества заверни до упора и отпусти на записанное число оборотов.", "Проверь уровень поплавка (см. отдельную инструкцию) и поставь камеру.", "Установи карбюратор строго ровно, затяни хомуты и проверь, что газ возвращается сам при любом положении руля.", "Заведи, прогрей и выставь холостые {idle} об/мин."] },
  { id: "carb-float", title: "Карбюратор: уровень поплавка", area: "carb", time: "40 мин", diff: "средне", only: ["carb"], fig: "float", tools: ["Штангенциркуль или линейка", "Отвёртка"], parts: ["floatvalve", "carbkit"],
    steps: ["Сними поплавковую камеру (см. инструкцию по разборке).", "Наклони карбюратор так, чтобы язычок поплавка только касался иглы клапана, но не поджимал её пружинку.", "Измерь расстояние от плоскости корпуса (без прокладки) до верхней точки поплавка — это уровень поплавка.", "Типовые значения: PZ19–PZ27 — 12–14 мм, PE/PZ30 — 13–15 мм, PWK — 7–9 мм. Точное значение смотри для своего карбюратора.", "Регулируй, аккуратно подгибая латунный язычок: подогнул вверх (к клапану) — уровень ниже и смесь беднее, вниз — выше и богаче.", "Обе половинки поплавка должны стоять на одной высоте.", "Собери и проверь, что из дренажной трубки не капает при открытом кране."] },
  { id: "carb-needle", title: "Карбюратор: игла и положение клипсы", area: "carb", time: "30 мин", diff: "средне", only: ["carb"], fig: "needle", tools: ["Отвёртка", "Пинцет или плоскогубцы"], parts: ["needle"],
    steps: ["Игла отвечает за смесь в среднем диапазоне: с 1/4 до 3/4 газа.", "Открути крышку карбюратора и вытащи золотник вместе с пружиной.", "Выдави иглу из золотника, найди клипсу. Канавки считаются сверху: 1-я — верхняя.", "Клипсу выше (в 1–2 канавку) — игла опускается, смесь беднее. Ниже (в 4–5) — игла поднимается, смесь богаче.", "Сейчас у тебя: {needle}. Меняй на одну канавку за раз.", "После фильтра нулевого или прямотока обычно опускают клипсу на 1 канавку ниже (богаче).", "Собери и проверь на ходу: провал на среднем газе и хлопки — бедно, вялость и чёрный дым — богато."] },
  { id: "carb-pwk-install", title: "Установка карбюратора PWK/PE вместо штатного", area: "carb", time: "1.5–2 ч", diff: "средне", only: ["carb"], fig: "carb", tools: ["Ключи", "Отвёртки", "Хомуты"], parts: ["carb", "intake", "jets", "airboot"],
    steps: ["Подбери переходник впуска под посадку нового карбюратора и штатный впускной патрубок.", "Сними старый карбюратор, отсоедини трос газа и подсоса, бензошланг.", "Перекинь трос газа: у PWK нужен трос с правильным наконечником. Иногда нужен трос подлиннее.", "Поставь карбюратор на патрубок строго вертикально, без перекоса — иначе подсос воздуха.", "Подключи бензошланг через фильтр, проложи дренажные трубки вниз, подальше от выхлопа.", "Стартовые жиклёры обычно стоят «на богатую сторону». Выстави винт качества на 1.5 оборота от упора.", "Прогрей мотор, выставь холостые {idle} об/мин, затем подбери главный жиклёр по цвету свечи (инструкция «Подбор главного жиклёра по свече»).", "Проверь, что газ возвращается при повороте руля и не меняет обороты холостых."] },
  { id: "filter-install", title: "Установка фильтра нулевого сопротивления", area: "carb", time: "40 мин", diff: "просто", fig: "airfilter", tools: ["Отвёртка", "Хомут"], parts: ["airfilter", "filteroil"],
    steps: ["Сними штатный airbox или его крышку — зависит от комплекта.", "Надень фильтр на горловину карбюратора и затяни хомут. Фильтр не должен касаться рамы, амортизатора и выпуска.", "Пропитай поролоновый фильтр специальным маслом, лишнее отожми.", "Смесь станет беднее: опусти клипсу иглы на 1 канавку и поставь главный жиклёр на 2–5 номеров больше (сейчас {jetMain}).", "Проверь цвет свечи после поездки.", "В грязь и брод нулевик хуже штатного airbox: закрывай его чехлом и чаще обслуживай."] },
  { id: "exhaust-install", title: "Установка прямотока или полной системы выпуска", area: "exhaust", time: "1 ч", diff: "средне", tools: ["Ключи", "Термогерметик", "Пружины выпуска"], parts: ["exgasket", "muffler"],
    steps: ["Дай мотору полностью остыть.", "Сними штатный глушитель, затем коллектор: гайки на головке и крепления к раме.", "Поставь новую медную или графитовую прокладку на выпускной порт.", "Наживи коллектор, затем глушитель и все крепления. Окончательно затягивай только когда всё стоит без натяга.", "Стык коллектора с глушителем — на пружинах или хомуте, при необходимости с термогерметиком.", "После прямотока мотор беднит: поставь главный жиклёр больше (сейчас {jetMain}) и опусти клипсу иглы.", "Проверь, что выхлоп не касается пластика и проводки. Через 50 км подтяни гайки коллектора."] },
  { id: "skid-install", title: "Установка защиты картера", area: null, time: "30–40 мин", diff: "просто", tools: ["Ключи 10–13", "Фиксатор резьбы"], parts: ["skid"],
    steps: ["Поставь мотоцикл на подставку.", "Примерь защиту: она крепится к нижним точкам рамы штатными или комплектными кронштейнами.", "Проверь, что защита не касается сливной пробки, выхлопа и рычага кикстартера.", "Затяни болты с фиксатором резьбы средней прочности.", "Через первую поездку подтяни крепёж — защита садится на место."] },
  { id: "handguards-install", title: "Установка защиты рук", area: null, time: "40 мин", diff: "просто", tools: ["Шестигранники", "Ключи"], parts: ["handguards"],
    steps: ["Сними грипсы-заглушки руля, при необходимости — грузики на концах.", "Установи хомуты защиты на руль рядом с рычагами, не затягивая.", "Вставь распорки в концы руля и закрепи внешнюю часть защиты.", "Выставь защиту так, чтобы рычаги свободно выжимались до конца, и поверни руль до упора в обе стороны — ничего не должно цепляться.", "Затяни все болты."] },
  { id: "led-install", title: "Установка LED-фары", area: "gen", time: "40 мин", diff: "просто", tools: ["Отвёртка", "Изолента / термоусадка", "Мультиметр"], parts: ["headlight", "connectors"],
    steps: ["Сними маску или корпус фары.", "Отключи старую лампу и разъём. Запомни провода: ближний, дальний, масса.", "На многих китайских мотоциклах свет питается переменкой от генератора — для LED нужен выпрямитель или питание после регулятора (=12 В).", "Подключи LED по схеме из комплекта, изолируй соединения термоусадкой.", "Проверь мультиметром, что на фаре постоянные 12–14 В на оборотах.", "Выставь луч чуть ниже горизонта, чтобы не слепить встречных."] },
  { id: "hourmeter-install", title: "Установка счётчика моточасов", area: "spark", time: "30 мин", diff: "просто", tools: ["Стяжки", "Двусторонний скотч"], parts: ["hourmeter"],
    steps: ["Выбери место, где счётчик видно и он не намокнет: руль, маска, рама.", "Индукционный провод обмотай 3–5 витками вокруг высоковольтного провода свечи.", "Закрепи провод стяжками подальше от выхлопа.", "Заведи мотор — счётчик начнёт считать и показывать обороты.", "Записывай моточасы в журнал ТО — для 2T это главный показатель износа поршня."] },
  { id: "cdi-install", title: "Замена коммутатора CDI", area: "spark", time: "15 мин", diff: "просто", tools: ["Отвёртка"], parts: ["cdi"],
    steps: ["Выключи зажигание.", "Найди CDI: прямоугольный блок с одним разъёмом, обычно под баком или сиденьем.", "Отключи разъём, сними старый блок с резинового крепления.", "Сравни распиновку нового CDI со старым: число и расположение контактов должны совпадать (AC или DC, 5 или 6 контактов).", "Подключи, закрепи на резинке — CDI не любит вибрации.", "Спортивный CDI без ограничителя поднимает отсечку — следи за оборотами, особенно на обкатке."] },
  { id: "fan-install", title: "Установка вентилятора радиатора", area: "cooling", time: "1.5 ч", diff: "средне", only: ["liquid"], tools: ["Ключи", "Стяжки", "Провод, предохранитель, кнопка или термодатчик"], parts: ["fan", "fansensor", "fuse"],
    steps: ["Сними обтекатель радиатора.", "Закрепи вентилятор комплектными кронштейнами или стяжками через соты так, чтобы он дул сквозь радиатор, не касаясь сот.", "Питание бери после замка зажигания через предохранитель 10 А.", "Включение: кнопка на руле или термодатчик в патрубке, срабатывающий на 85–95 °C.", "Проверь на месте: прогрей мотор — вентилятор должен включиться до закипания.", "Проложи проводку подальше от горячего и подвижного."] },
  { id: "sprocket-change", title: "Замена звёзд и подбор передаточного", area: "gearbox", time: "1 ч", diff: "просто", fig: "chain", tools: ["Ключи", "Выжимка цепи (если нужно укоротить)", "Фиксатор резьбы"], parts: ["sprocketF", "sprocketR", "chain"],
    steps: ["Посчитай нужные звёзды в калькуляторе тюнинга — там видно, как изменятся тяга и максималка твоего мотоцикла.", "Правило: −1 зуб спереди ≈ +3 зуба сзади. Меньше спереди — больше тяги, ниже максималка.", "Включи 1-ю передачу и нажми тормоз, открути гайку или болты передней звезды.", "Ослабь ось заднего колеса и натяжители, сними цепь со звезды.", "Поставь новую звезду, затяни крепёж с фиксатором резьбы.", "Для задней звезды снимается колесо: болты звезды затягивай крест-накрест.", "Если меняешь звезды сильно (больше 2–3 зубьев сзади), цепь нужно удлинить или укоротить.", "Выставь провис цепи 30–40 мм и колесо по меткам."] },
  { id: "timing-marks", title: "Выставление меток ГРМ (ВМТ)", area: "timing", time: "30 мин", diff: "средне", only: ["4t"], fig: "tdc", tools: ["Ключ на гайку маховика", "Отвёртка", "Фонарик"], parts: ["vcgasket"],
    steps: ["Открути две пробки на левой крышке генератора: большую (доступ к гайке маховика) и малую (смотровое окно).", "Сними крышки клапанов.", "Медленно крути коленвал против часовой стрелки, глядя в смотровое окно, пока метка «T» на роторе не совпадёт с риской на крышке.", "Проверь, что это такт сжатия: оба коромысла должны иметь небольшой люфт (клапаны закрыты). Если коромысла зажаты — сделай ещё один оборот.", "Метки на звезде распредвала должны совпадать с плоскостью головки.", "Если метки сбиты — при снятом натяжителе переставь звезду на цепи на нужный зуб. Проверни мотор рукой два оборота и проверь снова."] }
);
/* иллюстрации к имеющимся инструкциям */
(function () {
  var m = { spark: "spark", "carb-sync": "spark", valves: "valve", "valves-dohc": "valve", chain: "chain", "chain-replace": "chain", oil: "oil", airfilter: "airfilter", "brakes-bleed": "bleed",
    tube: "tube", sag: "sag", "coil-test": "multimeter", charging: "multimeter", "idle-set": "idle", "carb-clean": "carb", "carb-tune": "needle", camchain: "tdc", headgasket: "tdc", pads: "bleed" };
  GUIDES.forEach(function (g) { if (!g.fig && m[g.id]) g.fig = m[g.id]; });
})();

/* ---------- новые двигатели ---------- */
W("CF450", { region: "cn", code: "CF 450 MT", name: "CFMOTO 450MT (рядная двойка 270°)", maker: "CFMOTO", layout: "twin", crankPhase: 270, groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cooling: "Жидкостное", cc: 449, hp: 44, torque: "44 Н·м", compression: "≈ 11.5 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1400–1600", valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK CR8EIA-9", gap: "0.7–0.8 мм", fuel: "АИ-95", oil: "10W-40 (JASO MA2)", oilVol: "≈ 2.7 л", oilInt: 5000, valveInt: 15000, coolant: "≈ 1.5 л",
  issues: [{ t: "Ранние партии — обновления ПО", sev: "low", fix: "Прошивка у дилера." }] }, 1.3);
W("KOVE800", { region: "cn", code: "Kove 800", name: "Kove 800X Rally (рядная двойка)", maker: "Kove", layout: "twin", crankPhase: 270, groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cooling: "Жидкостное", cc: 799, hp: 95, torque: "80 Н·м", compression: "≈ 12 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1300–1500", valveIn: "0.10–0.15 мм", valveEx: "0.20–0.25 мм", spark: "NGK LMAR8A-9", gap: "0.7–0.8 мм", fuel: "АИ-95", oil: "10W-50 (JASO MA2)", oilVol: "≈ 3 л", oilInt: 5000, valveInt: 15000, coolant: "≈ 1.8 л",
  issues: [{ t: "Новая модель — следи за отзывами и обновлениями", sev: "low", fix: "ТО у дилера." }] }, 1.4);
W("VOGE525", { region: "cn", code: "LX525", name: "Voge 525DSX / CFMOTO 450-type двойка", maker: "Loncin", layout: "twin", crankPhase: 180, groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cooling: "Жидкостное", cc: 494, hp: 47, torque: "45 Н·м", compression: "≈ 11 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1400–1600", valveIn: "0.10–0.15 мм", valveEx: "0.17–0.22 мм", spark: "NGK CR8EIX", gap: "0.7–0.8 мм", fuel: "АИ-95", oil: "10W-40 (JASO MA)", oilVol: "≈ 3 л", oilInt: 5000, valveInt: 12000, coolant: "≈ 1.5 л",
  issues: [{ t: "Тяжёлый для бездорожья", sev: "low", fix: "Дуги и защита." }] }, 1.2);
W("TRK502", { region: "cn", code: "TRK 502", name: "Benelli TRK 502 / 502X (рядная двойка)", maker: "Benelli (QJ)", layout: "twin", crankPhase: 360, groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cooling: "Жидкостное", cc: 500, hp: 47.6, torque: "46 Н·м", compression: "≈ 11.5 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1300–1500", valveIn: "0.15–0.20 мм", valveEx: "0.20–0.25 мм", spark: "NGK CR8E", gap: "0.7–0.8 мм", fuel: "АИ-95", oil: "10W-40 (JASO MA)", oilVol: "≈ 3.2 л", oilInt: 6000, valveInt: 12000, coolant: "≈ 1.6 л",
  issues: [{ t: "Очень тяжёлый (≈ 230 кг)", sev: "low", fix: "Аккуратнее на грунте." }] }, 1.2);
W("TUAREG660", { code: "Aprilia 660", name: "Aprilia Tuareg 660 (рядная двойка 270°)", maker: "Aprilia", layout: "twin", crankPhase: 270, groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cooling: "Жидкостное", cc: 659, hp: 80, torque: "70 Н·м", compression: "≈ 13.5 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1300–1500", valveIn: "0.10–0.15 мм", valveEx: "0.20–0.25 мм", spark: "NGK LMAR9AI-8", gap: "0.7–0.8 мм", fuel: "АИ-95", oil: "10W-50", oilVol: "≈ 3.4 л", oilInt: 10000, valveInt: 20000,
  issues: [{ t: "Электроника и ПО — у дилера", sev: "low", fix: "Обновления по сервисной кампании." }] }, 2.6);
W("DESERTX", { code: "Ducati 937", name: "Ducati DesertX (L-twin 937)", maker: "Ducati", layout: "vtwin", groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, Desmodromic", cooling: "Жидкостное", cc: 937, hp: 110, torque: "92 Н·м", compression: "≈ 13 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1200–1400", valveIn: "Desmo — по мануалу", valveEx: "Desmo — по мануалу", spark: "NGK MAR9A-J", gap: "0.7–0.8 мм", fuel: "АИ-95/98", oil: "15W-50", oilVol: "≈ 3.8 л", oilInt: 15000, valveInt: 30000,
  issues: [{ t: "Desmo-клапаны и ремни ГРМ — только сервис", sev: "med", fix: "Регламент Ducati." }] }, 3.0);
W("NX500", { region: "jp", code: "PC80E", name: "Honda NX500 / CB500X (рядная двойка 180°)", maker: "Honda", layout: "twin", crankPhase: 180, groups: ["dohc","liquid","efi","4t","big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cooling: "Жидкостное", cc: 471, hp: 47, torque: "43 Н·м", compression: "≈ 10.7 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1100–1300", valveIn: "0.13–0.19 мм", valveEx: "0.24–0.30 мм", spark: "NGK CPR8EA-9", gap: "0.8–0.9 мм", fuel: "АИ-92/95", oil: "10W-30 (JASO MA)", oilVol: "≈ 3.2 л", oilInt: 8000, valveInt: 32000,
  issues: [{ t: "Очень надёжный мотор", sev: "low", fix: "ТО по регламенту." }] }, 1.8);
W("XR190", { region: "jp", code: "XR190", name: "Honda XR190L / XR150 (воздушник)", maker: "Honda", groups: ["air","efi","4t","big"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 184, hp: 16, torque: "16 Н·м", compression: "≈ 9.5 бар", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "5 ст.", carb: "Инжектор", idle: "1300–1500", valveIn: "0.08–0.12 мм", valveEx: "0.10–0.14 мм", spark: "NGK CPR8EA-9", gap: "0.8–0.9 мм", fuel: "АИ-92", oil: "10W-30 (JASO MA)", oilVol: "≈ 1.1 л", oilInt: 3000, valveInt: 8000,
  issues: [{ t: "Простой и живучий", sev: "low", fix: "Масло вовремя." }] }, 1.4);
W("DRZ70", { region: "jp", code: "DR-Z70", name: "Suzuki DR-Z50 / DR-Z70 (детский горизонтальный)", maker: "Suzuki", groups: ["horiz","air","carb","4t","small"], cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 67, hp: 4, torque: "5 Н·м", compression: "≈ 9 бар", ignition: "CDI", start: "Кик / электро", gearbox: "3 ст., полуавтомат", carb: "Mikuni VM", jetMain: "70–78", jetPilot: "15–17", needle: "2–3 канавка", idle: "1600–1800", valveIn: "0.05 мм", valveEx: "0.05 мм", spark: "NGK CR6HSA", gap: "0.6–0.7 мм", oil: "10W-40 (JASO MA)", oilVol: "0.8 л", oilInt: 1500, valveInt: 2000,
  issues: [{ t: "Детский: ограничитель газа", sev: "low", fix: "Винт-ограничитель на ручке." }] }, 1.4);
W("KTM85", { stroke: "2T", code: "KTM 85 SX", name: "KTM 85 SX / Husqvarna TC 85 / GasGas MC 85 (2T)", maker: "KTM Group", groups: ["2t","liquid","carb","small"], cam: "Лепестковый клапан, клапан выпуска", cooling: "Жидкостное", cc: 85, hp: 22, torque: "14 Н·м", compression: "≈ 9 бар", fuel: "АИ-98 + 2T масло 1:60", ignition: "CDI", start: "Кик", gearbox: "6 ст.", carb: "Keihin PWK28", jetMain: "125–135", jetPilot: "40", needle: "3 канавка", idle: "1600–1800", valveIn: "—", valveEx: "—", spark: "NGK BR9ECMVX", gap: "0.6–0.7 мм", oilVol: "КПП 0.5 л", oil: "Premix", oilInt: 0, valveInt: 0, hours: true, coolant: "≈ 0.6 л",
  issues: [{ t: "Подростковый кроссовик: поршень 15–25 м/ч", sev: "high", fix: "Журнал моточасов." }] }, 2.0);
W("KTM65", { stroke: "2T", code: "KTM 65 SX", name: "KTM 65 SX / Husqvarna TC 65 (2T)", maker: "KTM Group", groups: ["2t","liquid","carb","small"], cam: "Лепестковый клапан", cooling: "Жидкостное", cc: 64, hp: 16, torque: "10 Н·м", compression: "≈ 9 бар", fuel: "АИ-98 + 2T масло 1:60", ignition: "CDI", start: "Кик", gearbox: "6 ст.", carb: "Mikuni TM24", jetMain: "250–280", jetPilot: "30", needle: "3 канавка", idle: "1700–1900", valveIn: "—", valveEx: "—", spark: "NGK BR9ECMVX", gap: "0.6–0.7 мм", oilVol: "КПП 0.4 л", oil: "Premix", oilInt: 0, valveInt: 0, hours: true, coolant: "≈ 0.5 л",
  issues: [{ t: "Детский кроссовик — поршень по моточасам", sev: "high", fix: "Журнал моточасов." }] }, 2.0);

/* ---------- новые мотоциклы ---------- */
(function () {
  var E = "Эндуро", K = "Кросс-эндуро", T = "Тур-эндуро", L = "Лёгкий эндуро", P2 = "Питбайк", M = "Мотард", A = { approx: true };
  var add = addBike;
  add("CFMOTO", "450MT", T, "CF450"); add("Kove", "800X Rally", T, "KOVE800"); add("Kove", "800X Pro", T, "KOVE800", A); add("Voge", "525DSX", T, "VOGE525"); add("Voge", "300 Rally", T, "VOGE300");
  add("Benelli", "TRK 502X", T, "TRK502"); add("Benelli", "TRK 502", T, "TRK502"); add("Aprilia", "Tuareg 660", T, "TUAREG660"); add("Ducati", "DesertX", T, "DESERTX");
  add("Honda", "NX500", T, "NX500"); add("Honda", "CB500X", T, "NX500"); add("Honda", "XR190L", L, "XR190"); add("Honda", "XR150L (2023+)", L, "XR190", { hp: 12.5, approx: true });
  add("Suzuki", "DR-Z70", P2, "DRZ70"); add("Suzuki", "DR-Z50", P2, "DRZ70", { hp: 3, approx: true });
  add("KTM", "85 SX", K, "KTM85"); add("KTM", "65 SX", K, "KTM65"); add("Husqvarna", "TC 85", K, "KTM85"); add("Husqvarna", "TC 65", K, "KTM65"); add("GasGas", "MC 85", K, "KTM85"); add("GasGas", "MC 65", K, "KTM65");
  add("Kawasaki", "KLX300SM", M, "KLX250", { hp: 24, approx: true }); add("Kawasaki", "KLX140R L", P2, "KLX140"); add("Kawasaki", "KLX140R F", P2, "KLX140", A); add("Yamaha", "TT-R110E", P2, "CRF110F", A);
  add("Yamaha", "WR250R 2012", E, "WR250R"); add("Beta", "RR 125 2T", K, "BETA300", { hp: 30, approx: true }); add("Beta", "Xtrainer 250", K, "BETA300", { hp: 38, approx: true });
  add("Kayo", "K1 300 MX", E, "PR300", A); add("Kayo", "T2 300 MX", E, "PR300", A); add("Kayo", "K6-R 300 PR", E, "NB300", A); add("BSE", "Z5 300", E, "PR300", A);
  add("Motoland", "XT300 HS 21/18", E, "NB300", A); add("Motoland", "Blazer 300", E, "175FMM", A); add("Progasi", "Super Max 300 Pro", E, "175FMM", A); add("Avantis", "A2 Lux 300", E, "PR300", A);
  add("Regulmoto", "Crosstrec 300", E, "PR300", A); add("Racer", "Panther RC250GY-C2X", E, "172FMM", A); add("Sharmax", "PowerMax 250 PRO", E, "172FMM-3A", A);
})();
/* ===================== v12: STN, YBS300, исправление NB300 ===================== */
(function () {
  var e = ENGINES.NB300;
  Object.assign(e, { code: "ZS174MN-5", name: "Zongshen NB300 (ZS174MN-5)", cc: 300, hp: 28, cam: "4 клапана, балансирный вал", carb: "NIBBI PWK34",
    groups: ["liquid", "carb", "4t", "big", "balancer"] });
  e.issues = (e.issues || []).concat([{ t: "Развитие CBS300 с 74-м поршнем: доработанная головка", sev: "low", fix: "Масло и клапаны по регламенту, антифриз раз в сезон." }]);
})();
ENGINES["YBS300"] = { id: "YBS300", code: "LX176MN", name: "Loncin YBS300 (LX176MN)", maker: "Loncin", groups: ["liquid", "carb", "4t", "big", "balancer"],
  stroke: "4T", cam: "4 клапана, балансирный вал", cooling: "Жидкостное", cc: 295, hp: 32, torque: "≈ 27 Н·м", compression: "≈ 12 бар",
  fuel: "АИ-95", ignition: "CDI", timing: "Цепь ГРМ", start: "Электро + кик", gearbox: "6 ст.",
  carb: "PWK34 (по комплектации)", jetMain: "140–150", jetPilot: "40–42", needle: "3 канавка", idle: "1500–1700",
  valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK CR8E", gap: "0.7–0.8 мм", sparkTorque: "12–15 Н·м",
  oil: "10W-40 (JASO MA)", oilVol: "≈ 1.5 л", oilInt: 1500, valveInt: 3000, coolant: "≈ 1 л", jp: true,
  issues: [{ t: "Новый мотор — мало статистики по ресурсу", sev: "low", fix: "Аккуратная обкатка, масло каждые 1000–1500 км." }, { t: "Перегрев в медленной езде без вентилятора", sev: "med", fix: "Вентилятор радиатора." }] };
genKit("YBS300", 1.05); ensureSpark("YBS300", 1);
(function () {
  var E = "Эндуро", A = { approx: true };
  var add = addBike;
  add("STN", "G8 NB300", E, "NB300"); add("STN", "G8 PRO NB300", E, "NB300"); add("STN", "V8 NB300", E, "NB300"); add("STN", "V8 PRO NB300", E, "NB300");
  add("STN", "H8 NB300", E, "NB300"); add("STN", "H8 PRO NB300", E, "NB300");
  add("STN", "G9 YBS300", E, "YBS300"); add("STN", "G9 PRO YBS300", E, "YBS300"); add("STN", "V9 YBS300", E, "YBS300"); add("STN", "V9 PRO YBS300", E, "YBS300");
  add("STN", "H9 PRO YBS300", E, "YBS300"); add("STN", "X6 PR300", E, "PR300"); add("STN", "C9 PRO", E, "YBS300", A);
  add("XGZ", "K26 NB300", E, "NB300"); add("JHL", "Z5 NB300", E, "NB300"); add("Zuumav", "CBS 300 Pro", E, "CBS300"); add("Zuumav", "K8 NB300", E, "NB300", A);
  add("BRZ", "X6 NB300", E, "NB300"); add("BRZ", "MX8 NB300", E, "NB300"); add("Fxmoto", "X8 NB300", E, "NB300"); add("Kews", "K16 NB300", E, "NB300"); add("Kews", "K23 NB300", E, "NB300", A);
  add("Любая модель", "с мотором LX176MN (YBS300)", E, "YBS300");
})();
/* ярлыки версий у старых моделей на NB300 */
BIKES.forEach(function (b) { b.versions.forEach(function (v) { if (v.engine === "NB300") v.label = "ZS174MN-5, 300 см³"; }); });
/* ===================== v13: точные моторы STN, YBS300 Gen 2, NC300 ===================== */
Object.assign(ENGINES.YBS300, { name: "Loncin YBS300 (LX176MN)", hp: 30, cam: "DOHC, 4 клапана, перевёрнутая головка, балансир", groups: ["dohc", "liquid", "carb", "4t", "big", "balancer"], carb: "NIBBI PWK34" });
ENGINES.YBS300.issues = [{ t: "Перевёрнутая головка: впуск спереди, выпуск назад — непривычная разборка", sev: "low", fix: "Смотри схему по своей модели перед снятием головки." }, { t: "Перегрев в медленной езде без вентилятора", sev: "med", fix: "Вентилятор радиатора." }];
ENGINES["YBS300G2"] = Object.assign({}, ENGINES.YBS300, { id: "YBS300G2", code: "LX176MN Gen 2", name: "Loncin YBS300 Gen 2 (LX176MN, PRO)", hp: 32,
  cam: "DOHC, 4 клапана, перевёрнутая головка, балансир, портинг ГБЦ", gearbox: "6 ст., усиленное 8-дисковое сцепление",
  issues: [{ t: "Gen 2: усиленное сцепление и доработанные каналы ГБЦ с завода", sev: "low", fix: "Масло JASO MA2, сцепление не греть буксованием." }, { t: "Перегрев в медленной езде без вентилятора", sev: "med", fix: "Вентилятор радиатора." }] });
genKit("YBS300G2", 1.08); ensureSpark("YBS300G2", 1);
ENGINES["NC300"] = { id: "NC300", code: "ZS182MN", name: "Zongshen NC300 (ZS182MN) DOHC", maker: "Zongshen", groups: ["dohc", "liquid", "carb", "4t", "big", "balancer"],
  stroke: "4T", cam: "DOHC, 4 клапана, балансир", cooling: "Жидкостное", cc: 300, hp: 33, torque: "≈ 27 Н·м", compression: "≈ 12 бар", fuel: "АИ-95",
  ignition: "CDI", timing: "Цепь ГРМ", start: "Электро", gearbox: "6 ст.", carb: "NIBBI PWK34 / PE34", jetMain: "142–152", jetPilot: "40–42", needle: "3 канавка", idle: "1500–1700",
  valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK CR8E", gap: "0.7–0.8 мм", sparkTorque: "12–15 Н·м", oil: "10W-40 (JASO MA2)", oilVol: "≈ 1.5 л", oilInt: 1500, valveInt: 3000, coolant: "≈ 1 л", jp: true,
  issues: [{ t: "Старший брат NC250 — та же схема ГРМ, регулировка шайбами", sev: "med", fix: "Клапаны каждые 3000 км." }, { t: "Перегрев без вентилятора в медленной езде", sev: "med", fix: "Вентилятор радиатора." }] };
genKit("NC300", 1.15); ensureSpark("NC300", 1);
(function () {
  function setEng(brand, name, id, extra) { var b = BIKES.find(function (x) { return x.brand === brand && x.name === name; }); if (!b) return; var e = ENGINES[id]; b.versions = [Object.assign({ engine: id, label: e.code + ", " + e.cc + " см³" }, extra || {})]; }
  setEng("STN", "G9 YBS300", "YBS300"); setEng("STN", "V9 YBS300", "YBS300");
  setEng("STN", "G9 PRO YBS300", "YBS300G2"); setEng("STN", "V9 PRO YBS300", "YBS300G2"); setEng("STN", "H9 PRO YBS300", "YBS300G2"); setEng("STN", "C9 PRO", "YBS300G2", { approx: true });
  setEng("Avantis", "A7 Premium", "NC300");
  var E = "Эндуро";
  var add = addBike;
  add("KNIK", "G9 PRO YBS300", E, "YBS300G2"); add("Kews", "K28 PRO YBS300", E, "YBS300G2"); add("Kews", "K28 YBS300", E, "YBS300", { approx: true });
  add("Любая модель", "с мотором ZS182MN (NC300)", E, "NC300"); add("Любая модель", "с мотором YBS300 Gen 2", E, "YBS300G2");
})();
/* ===================== v14: спорт, чопперы, триал, нейкеды, новые бренды ===================== */
var ROAD = { cooling: "Жидкостное", ignition: "ЭБУ (EFI)", start: "Электро", gearbox: "6 ст.", carb: "Инжектор", idle: "1100–1300", gap: "0.7–0.8 мм", fuel: "АИ-95", oil: "10W-40 (JASO MA)",
  oilInt: 6000, valveInt: 24000, valveIn: "по мануалу", valveEx: "по мануалу", spark: "по мануалу (тип зависит от года)", oilVol: "≈ 3 л", coolant: "≈ 2 л", jp: true,
  issues: [{ t: "Цифры по модели — типовые, точные смотри в мануале своего года", sev: "low", fix: "Сервис-мануал производителя." }] };
function RE(id, x, k) { W(id, Object.assign({}, ROAD, x), k || 2); }
/* рядные четвёрки и тройки */
RE("I4_600J", { region: "jp", code: "I4 600", name: "Японская рядная четвёрка 600 (CBR600RR / R6 / ZX-6R / GSX-R600)", maker: "Honda / Yamaha / Kawasaki / Suzuki", layout: "i4", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 600, hp: 118, torque: "≈ 65 Н·м", compression: "≈ 13 бар", oilVol: "≈ 3.5 л", fuel: "АИ-98" }, 2.4);
RE("I4_1000J", { region: "jp", code: "I4 1000", name: "Японская рядная четвёрка 1000 (CBR1000RR / R1 / ZX-10R / GSX-R1000)", maker: "Honda / Yamaha / Kawasaki / Suzuki", layout: "i4", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 999, hp: 195, torque: "≈ 113 Н·м", compression: "≈ 13 бар", oilVol: "≈ 3.6 л", fuel: "АИ-98" }, 2.6);
RE("I4_750S", { region: "jp", code: "GSX-R750", name: "Suzuki GSX-R750 (рядная четвёрка)", maker: "Suzuki", layout: "i4", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 750, hp: 148, torque: "≈ 86 Н·м", compression: "≈ 12.5 бар", oilVol: "≈ 3.6 л", fuel: "АИ-98" }, 2.4);
RE("I4_650H", { region: "jp", code: "Honda 650 I4", name: "Honda CBR650R / CB650R (рядная четвёрка)", maker: "Honda", layout: "i4", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 649, hp: 95, torque: "≈ 63 Н·м", compression: "≈ 11.6 бар", oilVol: "≈ 3.6 л" }, 2.2);
RE("I4_400K", { region: "jp", code: "ZX-4R", name: "Kawasaki ZX-4R / ZX-25R (рядная четвёрка)", maker: "Kawasaki", layout: "i4", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 399, hp: 77, torque: "≈ 39 Н·м", compression: "≈ 12.3 бар", oilVol: "≈ 3.4 л" }, 2.2);
RE("I4_1000E", { code: "S 1000 RR", name: "BMW S 1000 RR / M 1000 RR (рядная четвёрка)", maker: "BMW", layout: "i4", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, ShiftCam", cc: 999, hp: 210, torque: "≈ 113 Н·м", compression: "≈ 13.3 бар", oilVol: "≈ 4 л", fuel: "АИ-98" }, 2.8);
RE("I4_600C", { region: "cn", code: "QJ 600 I4", name: "QJMotor / Benelli 600 (рядная четвёрка)", maker: "QJMotor", layout: "i4", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 600, hp: 82, torque: "≈ 55 Н·м", compression: "≈ 11.8 бар", oilVol: "≈ 3.6 л" }, 1.4);
RE("I4_450KV", { region: "cn", code: "Kove 450 I4", name: "Kove 450RR (рядная четвёрка)", maker: "Kove", layout: "i4", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 443, hp: 70, torque: "≈ 39 Н·м", compression: "≈ 12.5 бар", oilVol: "≈ 3 л" }, 1.3);
RE("I3_890Y", { region: "jp", code: "CP3 890", name: "Yamaha CP3 890 (рядная тройка: MT-09 / Tracer 9 / XSR900)", maker: "Yamaha", layout: "i3", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 12 клапанов, 3 цилиндра", cc: 890, hp: 117, torque: "≈ 93 Н·м", compression: "≈ 11.5 бар", oilVol: "≈ 3.5 л" }, 2.3);
RE("I3_660T", { code: "Triumph 660 I3", name: "Triumph 660 (рядная тройка: Trident / Daytona / Tiger Sport 660)", maker: "Triumph", layout: "i3", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 12 клапанов, 3 цилиндра", cc: 660, hp: 81, torque: "≈ 64 Н·м", compression: "≈ 11.9 бар", oilVol: "≈ 3.2 л" }, 2.5);
RE("I3_765T", { code: "Triumph 765 I3", name: "Triumph Street Triple 765 (рядная тройка)", maker: "Triumph", layout: "i3", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 12 клапанов, 3 цилиндра", cc: 765, hp: 120, torque: "≈ 80 Н·м", compression: "≈ 12.9 бар", oilVol: "≈ 3.4 л", fuel: "АИ-98" }, 2.6);
RE("I3_900T", { code: "Triumph 900 I3", name: "Triumph 888/900 (рядная тройка: Tiger 900)", maker: "Triumph", layout: "i3", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 12 клапанов, 3 цилиндра", cc: 888, hp: 108, torque: "≈ 90 Н·м", compression: "≈ 11.3 бар", oilVol: "≈ 3.6 л" }, 2.6);
RE("I3_675C", { region: "cn", code: "CF 675 I3", name: "CFMOTO 675 (рядная тройка: 675SR / 675NK)", maker: "CFMOTO", layout: "i3", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 12 клапанов, 3 цилиндра", cc: 675, hp: 95, torque: "≈ 68 Н·м", compression: "≈ 12 бар", oilVol: "≈ 3 л" }, 1.4);
/* двойки и синглы дорожные */
RE("T250H", { region: "jp", code: "CBR250RR", name: "Honda CBR250RR (рядная двойка 180°)", maker: "Honda", layout: "twin", crankPhase: 180, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 250, hp: 41, torque: "≈ 25 Н·м", compression: "≈ 12.5 бар", oilVol: "≈ 2.4 л" }, 1.9);
RE("T321Y", { region: "jp", code: "R3 321", name: "Yamaha 321 (рядная двойка 180°: R3 / MT-03)", maker: "Yamaha", layout: "twin", crankPhase: 180, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 321, hp: 42, torque: "≈ 30 Н·м", compression: "≈ 11.2 бар", oilVol: "≈ 2.4 л" }, 1.8);
RE("T400K", { region: "jp", code: "Ninja 400", name: "Kawasaki 399/451 (рядная двойка 180°: Ninja 400/500, Z400/500)", maker: "Kawasaki", layout: "twin", crankPhase: 180, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 399, hp: 45, torque: "≈ 38 Н·м", compression: "≈ 11.5 бар", oilVol: "≈ 2.4 л" }, 1.8);
RE("T650K", { region: "jp", code: "Kawasaki 649", name: "Kawasaki 649 (рядная двойка 180°: Ninja 650, Z650, Vulcan S, Versys 650)", maker: "Kawasaki", layout: "twin", crankPhase: 180, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 649, hp: 68, torque: "≈ 64 Н·м", compression: "≈ 10.8 бар", oilVol: "≈ 2.3 л" }, 1.9);
RE("T250S", { region: "jp", code: "GSX250R", name: "Suzuki 248 (рядная двойка 180°: GSX250R / Inazuma)", maker: "Suzuki", layout: "twin", crankPhase: 180, groups: ["liquid", "efi", "4t", "big"], cam: "SOHC, 4 клапана, 2 цилиндра", cc: 248, hp: 25, torque: "≈ 23 Н·м", compression: "≈ 11.5 бар", oilVol: "≈ 2.3 л" }, 1.7);
RE("T800S", { region: "jp", code: "Suzuki 776", name: "Suzuki 776 (рядная двойка 270°: GSX-8S / GSX-8R / V-Strom 800DE)", maker: "Suzuki", layout: "twin", crankPhase: 270, groups: ["dohc", "liquid", "efi", "4t", "big", "balancer"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 776, hp: 83, torque: "≈ 78 Н·м", compression: "≈ 12.8 бар", oilVol: "≈ 3.4 л" }, 2.0);
RE("S125J", { region: "jp", code: "125 4T", name: "Японский 125 жидкостный (R125 / MT-125 / Ninja 125 / GSX-R125)", maker: "Yamaha / Kawasaki / Suzuki", groups: ["liquid", "efi", "4t", "small"], cam: "SOHC/DOHC, 4 клапана", cc: 125, hp: 15, torque: "≈ 11.5 Н·м", compression: "≈ 11.5 бар", oilVol: "≈ 1.1 л", oilInt: 5000, valveInt: 10000 }, 1.6);
RE("S125K", { code: "KTM 125", name: "KTM 125 (125 Duke / RC 125 / Husqvarna 125)", maker: "KTM", groups: ["dohc", "liquid", "efi", "4t", "small"], cam: "DOHC, 4 клапана", cc: 125, hp: 15, torque: "≈ 12 Н·м", compression: "≈ 12.8 бар", oilVol: "≈ 1.5 л", oilInt: 7500, valveInt: 15000 }, 2.0);
RE("S400T", { code: "Triumph 400", name: "Triumph TR-series 398 (Speed 400 / Scrambler 400 X)", maker: "Triumph / Bajaj", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 4 клапана", cc: 398, hp: 40, torque: "≈ 37.5 Н·м", compression: "≈ 12 бар", oilVol: "≈ 1.7 л", oilInt: 10000, valveInt: 20000 }, 1.6);
RE("S300C", { region: "cn", code: "CF 292", name: "CFMOTO 292 (300SR / 300NK / 300CL-X)", maker: "CFMOTO", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 4 клапана", cc: 292, hp: 29, torque: "≈ 25 Н·м", compression: "≈ 11.3 бар", oilVol: "≈ 1.8 л" }, 1.2);
RE("S350Z", { region: "cn", code: "Zontes 348", name: "Zontes 348 (ZT350 R / T / X / GK)", maker: "Zontes", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 4 клапана", cc: 348, hp: 38, torque: "≈ 32 Н·м", compression: "≈ 12 бар", oilVol: "≈ 1.8 л" }, 1.2);
RE("S125Z", { region: "cn", code: "Zontes 125", name: "Zontes 125 (ZT125 U / G1)", maker: "Zontes", groups: ["liquid", "efi", "4t", "small"], cam: "SOHC, 4 клапана", cc: 125, hp: 14, torque: "≈ 10.5 Н·м", compression: "≈ 11.5 бар", oilVol: "≈ 1.1 л" }, 1.0);
RE("T321KV", { region: "cn", code: "Kove 321", name: "Kove 321 (рядная двойка: 321RR / 321R)", maker: "Kove", layout: "twin", crankPhase: 180, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 321, hp: 50, torque: "≈ 29 Н·м", compression: "≈ 12 бар", oilVol: "≈ 2.4 л" }, 1.2);
RE("T300B", { region: "cn", code: "Benelli 300", name: "Benelli / Keeway 300 (рядная двойка: 302R / TNT 25/302 / RKV)", maker: "Benelli (QJ)", layout: "twin", crankPhase: 360, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 300, hp: 35, torque: "≈ 27 Н·м", compression: "≈ 12 бар", oilVol: "≈ 2.6 л" }, 1.1);
RE("T700C", { region: "cn", code: "CF 693", name: "CFMOTO 693 (рядная двойка: 700CL-X / 700MT)", maker: "CFMOTO", layout: "twin", crankPhase: 270, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 693, hp: 70, torque: "≈ 67 Н·м", compression: "≈ 11.6 бар", oilVol: "≈ 3 л" }, 1.4);
RE("T800C", { region: "cn", code: "CF 799", name: "CFMOTO 799 (рядная двойка 285°: 800MT / 800NK)", maker: "CFMOTO", layout: "twin", crankPhase: 285, groups: ["dohc", "liquid", "efi", "4t", "big", "balancer"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 799, hp: 95, torque: "≈ 81 Н·м", compression: "≈ 12.7 бар", oilVol: "≈ 3.4 л" }, 1.5);
RE("T457A", { code: "Aprilia 457", name: "Aprilia RS 457 / Tuono 457 (рядная двойка 270°)", maker: "Aprilia", layout: "twin", crankPhase: 270, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 457, hp: 47, torque: "≈ 43.5 Н·м", compression: "≈ 12 бар", oilVol: "≈ 2.6 л" }, 2.0);
RE("T650RE", { region: "in", code: "RE 648", name: "Royal Enfield 648 (рядная двойка 270°: Interceptor / Continental GT / Super Meteor)", maker: "Royal Enfield", layout: "twin", crankPhase: 270, groups: ["air", "efi", "4t", "big"], cooling: "Воздушно-масляное", cam: "SOHC, 8 клапанов, 2 цилиндра", cc: 648, hp: 47, torque: "≈ 52 Н·м", compression: "≈ 9.5 бар", oilVol: "≈ 3.1 л", oilInt: 10000, valveInt: 10000 }, 1.3);
RE("S350RE", { region: "in", code: "J-series 349", name: "Royal Enfield J 349 (Classic 350 / Meteor 350 / Hunter 350 / Bullet 350)", maker: "Royal Enfield", groups: ["air", "efi", "4t", "big"], cooling: "Воздушно-масляное", cam: "SOHC, 2 клапана", cc: 349, hp: 20, torque: "≈ 27 Н·м", compression: "≈ 9.5 бар", gearbox: "5 ст.", oilVol: "≈ 2 л", oilInt: 10000, valveInt: 10000 }, 1.1);
RE("T1200TR", { code: "Triumph 1200 HT", name: "Triumph 1200 High Torque (рядная двойка 270°: Bonneville T120 / Speed Twin)", maker: "Triumph", layout: "twin", crankPhase: 270, groups: ["liquid", "efi", "4t", "big"], cam: "SOHC, 8 клапанов, 2 цилиндра", cc: 1200, hp: 79, torque: "≈ 105 Н·м", compression: "≈ 10 бар", oilVol: "≈ 4.2 л" }, 2.6);
/* V-twin и круизеры */
RE("V955D", { code: "Superquadro 955", name: "Ducati Superquadro 955 (L-twin 90°: Panigale V2)", maker: "Ducati", layout: "vtwin", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, Desmodromic, V-twin 90°", cc: 955, hp: 155, torque: "≈ 104 Н·м", compression: "≈ 12.5 бар", oilVol: "≈ 3.7 л", fuel: "АИ-98" }, 3.0);
RE("V803D", { code: "Ducati 803", name: "Ducati 803 воздушный (L-twin 90°: Scrambler 800)", maker: "Ducati", layout: "vtwin", groups: ["air", "efi", "4t", "big"], cooling: "Воздушно-масляное", cam: "SOHC, 4 клапана, Desmodromic, V-twin 90°", cc: 803, hp: 73, torque: "≈ 65 Н·м", compression: "≈ 11 бар", oilVol: "≈ 3.2 л" }, 2.8);
RE("V883HD", { code: "Evolution 45°", name: "Harley-Davidson Sportster Evolution 883/1200 (V-twin 45°, воздушный)", maker: "Harley-Davidson", layout: "vtwin", vAngle: 45, groups: ["air", "efi", "4t", "big", "cg"], cooling: "Воздушное", cam: "OHV, 4 клапана, V-twin 45°", cc: 883, hp: 53, torque: "≈ 70 Н·м", compression: "≈ 9 бар", gearbox: "5 ст., ремень", oilVol: "≈ 2.8 л", oilInt: 8000, valveInt: 0, fuel: "АИ-92/95" }, 2.4);
RE("V1750HD", { code: "Milwaukee-Eight", name: "Harley-Davidson Milwaukee-Eight 107/114 (V-twin 45°)", maker: "Harley-Davidson", layout: "vtwin", vAngle: 45, groups: ["air", "efi", "4t", "big", "cg"], cooling: "Воздушно-масляное", cam: "OHV, 8 клапанов, V-twin 45°", cc: 1746, hp: 86, torque: "≈ 145 Н·м", compression: "≈ 10 бар", gearbox: "6 ст., ремень", oilVol: "≈ 4.7 л", oilInt: 8000, valveInt: 0 }, 2.6);
RE("V750HD", { code: "Revolution X 750", name: "Harley-Davidson Street 750 (V-twin 60°, жидкостный)", maker: "Harley-Davidson", layout: "vtwin", vAngle: 60, groups: ["liquid", "efi", "4t", "big"], cam: "SOHC, 8 клапанов, V-twin 60°", cc: 749, hp: 53, torque: "≈ 59 Н·м", compression: "≈ 11 бар", oilVol: "≈ 3.3 л" }, 2.2);
RE("V745H", { region: "jp", code: "RC44E", name: "Honda Shadow 750 (V-twin 52°)", maker: "Honda", layout: "vtwin", vAngle: 52, groups: ["liquid", "carb", "4t", "big"], cam: "SOHC, 6 клапанов, V-twin 52°", cc: 745, hp: 45, torque: "≈ 64 Н·м", compression: "≈ 9.6 бар", gearbox: "5 ст., кардан", carb: "Keihin (до 2009) / инжектор", oilVol: "≈ 3 л" }, 1.8);
RE("V650Y", { region: "jp", code: "Drag Star 650", name: "Yamaha XVS650 Drag Star / XV535 Virago (V-twin 70°)", maker: "Yamaha", layout: "vtwin", vAngle: 70, groups: ["air", "carb", "4t", "big"], cooling: "Воздушное", cam: "SOHC, 4 клапана, V-twin 70°", cc: 649, hp: 40, torque: "≈ 50 Н·м", compression: "≈ 9 бар", gearbox: "5 ст., кардан", carb: "Mikuni BSR ×2", oilVol: "≈ 3 л", oilInt: 5000, valveInt: 10000 }, 1.7);
RE("V400Y", { region: "jp", code: "Drag Star 400", name: "Yamaha XVS400 Drag Star (V-twin 70°)", maker: "Yamaha", layout: "vtwin", vAngle: 70, groups: ["air", "carb", "4t", "big"], cooling: "Воздушное", cam: "SOHC, 4 клапана, V-twin 70°", cc: 399, hp: 32, torque: "≈ 33 Н·м", compression: "≈ 10 бар", gearbox: "5 ст., кардан", carb: "Mikuni ×2", oilVol: "≈ 3 л", oilInt: 5000, valveInt: 10000 }, 1.7);
RE("V950Y", { region: "jp", code: "Bolt 942", name: "Yamaha XV950 Bolt (V-twin 60°)", maker: "Yamaha", layout: "vtwin", vAngle: 60, groups: ["air", "efi", "4t", "big"], cooling: "Воздушное", cam: "SOHC, 8 клапанов, V-twin 60°", cc: 942, hp: 54, torque: "≈ 80 Н·м", compression: "≈ 9 бар", gearbox: "5 ст., ремень", oilVol: "≈ 3.9 л" }, 1.9);
RE("V805S", { region: "jp", code: "VL800", name: "Suzuki Intruder VL800 / Boulevard C50 (V-twin 45°)", maker: "Suzuki", layout: "vtwin", vAngle: 45, groups: ["liquid", "efi", "4t", "big"], cam: "SOHC, 8 клапанов, V-twin 45°", cc: 805, hp: 51, torque: "≈ 68 Н·м", compression: "≈ 9.4 бар", gearbox: "5 ст., кардан", oilVol: "≈ 3.4 л" }, 1.8);
RE("V900K", { region: "jp", code: "Vulcan 900", name: "Kawasaki Vulcan 900 (V-twin 55°)", maker: "Kawasaki", layout: "vtwin", vAngle: 55, groups: ["liquid", "efi", "4t", "big"], cam: "SOHC, 8 клапанов, V-twin 55°", cc: 903, hp: 50, torque: "≈ 79 Н·м", compression: "≈ 9.5 бар", gearbox: "5 ст., ремень", oilVol: "≈ 3.6 л" }, 1.9);
RE("V300BD", { region: "cn", code: "Benda 300 V", name: "Benda V-twin 300 (Chinchilla 300 / Rockie 300)", maker: "Benda", layout: "vtwin", vAngle: 60, groups: ["liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, V-twin", cc: 298, hp: 30, torque: "≈ 26 Н·м", compression: "≈ 11 бар", oilVol: "≈ 2 л" }, 1.1);
RE("V250LF", { region: "cn", code: "Lifan V 250", name: "Китайский V-twin 250 воздушный (Lifan / Stels Flex / Keeway V)", maker: "Lifan / Zongshen", layout: "vtwin", vAngle: 60, groups: ["air", "carb", "4t", "big"], cooling: "Воздушное", cam: "SOHC, 4 клапана, V-twin", cc: 249, hp: 20, torque: "≈ 19 Н·м", compression: "≈ 9.5 бар", gearbox: "5 ст.", carb: "Keihin ×1 (по комплектации)", oilVol: "≈ 1.6 л", oilInt: 3000, valveInt: 6000 }, 0.8);
/* триал */
RE("TR2T", { code: "Trial 2T", name: "Триальный 2T 250–300 (Beta Evo / GasGas TXT / Sherco ST / TRRS / Scorpa)", maker: "Beta / GasGas / Sherco / TRRS", stroke: "2T", groups: ["2t", "liquid", "carb", "big"], cam: "Лепестковый клапан", cc: 280, hp: 22, torque: "≈ 30 Н·м", compression: "≈ 8.5 бар", fuel: "АИ-95 + 2T масло 1:80…1:60", ignition: "CDI", start: "Кик (у части — электро)", carb: "Keihin PWK28 / Dell'Orto PHBL26", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1400–1600", oilVol: "КПП 0.4–0.5 л", oil: "Premix", oilInt: 0, valveInt: 0, hours: true, valveIn: "—", valveEx: "—", gearbox: "6 ст., низкие ряды" }, 2.2);
RE("TR125", { code: "Trial 125", name: "Триальный 2T 125 (Beta Evo 125 / TXT 125 / ST 125)", maker: "Beta / GasGas / Sherco", stroke: "2T", groups: ["2t", "liquid", "carb", "small"], cam: "Лепестковый клапан", cc: 125, hp: 14, torque: "≈ 13 Н·м", compression: "≈ 8.5 бар", fuel: "АИ-95 + 2T масло 1:80…1:60", ignition: "CDI", start: "Кик", carb: "Dell'Orto PHBL / Keihin", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1500–1700", oilVol: "КПП 0.4 л", oil: "Premix", oilInt: 0, valveInt: 0, hours: true, valveIn: "—", valveEx: "—" }, 2.0);
RE("TR4RT", { code: "Montesa 4RT", name: "Montesa Cota 4RT 260/300RR (4T триал)", maker: "Honda / Montesa", groups: ["liquid", "efi", "4t", "big"], cam: "SOHC, 4 клапана", cc: 259, hp: 19, torque: "≈ 22 Н·м", compression: "≈ 10 бар", start: "Кик", gearbox: "5 ст., низкие ряды", oilVol: "≈ 1 л", oilInt: 2000, valveInt: 6000 }, 2.4);
/* мини-мотард и 50 */
RE("AM6", { code: "Minarelli AM6", name: "Minarelli AM6 50 2T (Beta RR 50 / Rieju MRT 50 / Yamaha DT50)", maker: "Minarelli", stroke: "2T", groups: ["2t", "liquid", "carb", "small"], cam: "Лепестковый клапан", cc: 49, hp: 4, torque: "≈ 4 Н·м", compression: "≈ 8 бар", fuel: "АИ-95 + 2T масло (раздельная смазка)", ignition: "CDI", start: "Кик", carb: "Dell'Orto PHBN 12–17", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1600–1800", gearbox: "6 ст.", oilVol: "КПП 0.65 л", oil: "2T масло в бачок", oilInt: 0, valveInt: 0, hours: true, valveIn: "—", valveEx: "—",
  issues: [{ t: "В стоке задушен до ~45 км/ч (ограничители выпуска и CDI)", sev: "low", fix: "Снятие ограничителей — только с учётом прав категории." }] }, 1.3);
RE("M125", { code: "Minarelli 125 4T", name: "Minarelli / Yamaha 125 4T VVA (WR125, MT-125 ранние, Beta RR 125 4T, Fantic 125)", maker: "Minarelli / Yamaha", groups: ["liquid", "efi", "4t", "small"], cam: "SOHC, 4 клапана", cc: 125, hp: 15, torque: "≈ 12 Н·м", compression: "≈ 11 бар", oilVol: "≈ 1.1 л", oilInt: 5000, valveInt: 10000 }, 1.6);
/* китайские дорожные синглы */
RE("S160HJ", { region: "cn", code: "Haojue 162", name: "Haojue 162 воздушный (DR160 / DK150 / NK150)", maker: "Haojue (Suzuki China)", groups: ["air", "efi", "4t", "small"], cooling: "Воздушно-масляное", cam: "SOHC, 2 клапана", cc: 162, hp: 15, torque: "≈ 14 Н·м", compression: "≈ 9.5 бар", gearbox: "5 ст.", oilVol: "≈ 1.1 л", oilInt: 3000, valveInt: 6000 }, 0.9);
RE("S200LF", { region: "cn", code: "Lifan 200 LC", name: "Lifan 200 жидкостный (KPR 200 / KP Mini 200)", maker: "Lifan", groups: ["liquid", "carb", "4t", "big"], cam: "SOHC, 4 клапана", cc: 198, hp: 18, torque: "≈ 16 Н·м", compression: "≈ 11 бар", carb: "Keihin / инжектор (по году)", oilVol: "≈ 1.2 л", oilInt: 3000, valveInt: 6000 }, 0.8);
(function () {
  var Sp = "Спорт", Ch = "Чоппер", Tr = "Триал", Nk = "Нейкед", Mo = "Мотард", T = "Тур-эндуро", A = { approx: true };
  var add = addBike;
  /* Honda */
  add("Honda", "CBR125R", Sp, "S125J", { hp: 13 }); add("Honda", "CBR250R", Sp, "CRF250L", { hp: 26 }); add("Honda", "CBR250RR", Sp, "T250H"); add("Honda", "CBR300R", Sp, "CRF300L");
  add("Honda", "CB300R", Nk, "CRF300L", { hp: 31 }); add("Honda", "CBR500R", Sp, "NX500"); add("Honda", "CB500F", Nk, "NX500"); add("Honda", "CB500 Hornet", Nk, "NX500", A);
  add("Honda", "CBR600RR", Sp, "I4_600J", { hp: 120 }); add("Honda", "CBR650R", Sp, "I4_650H"); add("Honda", "CB650R", Nk, "I4_650H"); add("Honda", "CBR1000RR Fireblade", Sp, "I4_1000J", { hp: 189 });
  add("Honda", "CBR1000RR-R Fireblade SP", Sp, "I4_1000J", { hp: 217 }); add("Honda", "Rebel 300", Ch, "CRF300L", { hp: 27 }); add("Honda", "Rebel 500", Ch, "NX500"); add("Honda", "Rebel 1100", Ch, "AT1100", { hp: 87 });
  add("Honda", "Shadow 750", Ch, "V745H"); add("Honda", "NC750X", T, "XL750", { approx: true, hp: 58 }); add("Honda", "Hornet 750", Nk, "XL750");
  /* Yamaha */
  add("Yamaha", "YZF-R125", Sp, "S125J"); add("Yamaha", "MT-125", Nk, "S125J"); add("Yamaha", "YZF-R3", Sp, "T321Y"); add("Yamaha", "MT-03", Nk, "T321Y"); add("Yamaha", "YZF-R7", Sp, "T700");
  add("Yamaha", "MT-07", Nk, "T700"); add("Yamaha", "XSR700", Nk, "T700"); add("Yamaha", "YZF-R6", Sp, "I4_600J"); add("Yamaha", "YZF-R1", Sp, "I4_1000J", { hp: 200 }); add("Yamaha", "MT-09", Nk, "I3_890Y");
  add("Yamaha", "XSR900", Nk, "I3_890Y"); add("Yamaha", "Tracer 9", T, "I3_890Y"); add("Yamaha", "XVS650 Drag Star", Ch, "V650Y"); add("Yamaha", "XV535 Virago", Ch, "V650Y", { hp: 45, approx: true }); add("Yamaha", "XVS400 Drag Star", Ch, "V400Y");
  add("Yamaha", "XV950 Bolt", Ch, "V950Y"); add("Yamaha", "WR125R", "Эндуро", "M125"); add("Yamaha", "WR125X", Mo, "M125");
  /* Kawasaki */
  add("Kawasaki", "Ninja 125", Sp, "S125J"); add("Kawasaki", "Z125", Nk, "S125J", A); add("Kawasaki", "Ninja 400", Sp, "T400K"); add("Kawasaki", "Z400", Nk, "T400K"); add("Kawasaki", "Ninja 500", Sp, "T400K", { hp: 45 });
  add("Kawasaki", "Ninja 650", Sp, "T650K"); add("Kawasaki", "Z650", Nk, "T650K"); add("Kawasaki", "Vulcan S", Ch, "T650K", { hp: 61 }); add("Kawasaki", "Versys 650", T, "T650K"); add("Kawasaki", "Z650RS", Nk, "T650K");
  add("Kawasaki", "Ninja ZX-4R", Sp, "I4_400K"); add("Kawasaki", "Ninja ZX-6R", Sp, "I4_600J", { hp: 124 }); add("Kawasaki", "Ninja ZX-10R", Sp, "I4_1000J", { hp: 203 }); add("Kawasaki", "Vulcan 900", Ch, "V900K");
  /* Suzuki */
  add("Suzuki", "GSX-R125", Sp, "S125J"); add("Suzuki", "GSX-S125", Nk, "S125J"); add("Suzuki", "GSX250R", Sp, "T250S"); add("Suzuki", "GSX-R600", Sp, "I4_600J", { hp: 124 }); add("Suzuki", "GSX-R750", Sp, "I4_750S");
  add("Suzuki", "GSX-R1000", Sp, "I4_1000J", { hp: 199 }); add("Suzuki", "GSX-8S", Nk, "T800S"); add("Suzuki", "GSX-8R", Sp, "T800S"); add("Suzuki", "V-Strom 800DE", T, "T800S"); add("Suzuki", "Intruder VL800", Ch, "V805S");
  add("Suzuki", "Boulevard C50", Ch, "V805S");
  /* Европа */
  add("KTM", "125 Duke", Nk, "S125K"); add("KTM", "RC 125", Sp, "S125K"); add("KTM", "390 Duke", Nk, "KTM390"); add("KTM", "RC 390", Sp, "KTM390"); add("KTM", "690 SMC R", Mo, "LC4"); add("KTM", "690 Duke", Nk, "LC4", A);
  add("KTM", "790 Duke", Nk, "LC8C", { hp: 105 }); add("KTM", "890 Duke", Nk, "LC8C", { hp: 115 }); add("KTM", "450 SMR", Mo, "KTM450F", A);
  add("Husqvarna", "701 Supermoto", Mo, "LC4"); add("Husqvarna", "Svartpilen 401", Nk, "KTM390"); add("Husqvarna", "Vitpilen 401", Nk, "KTM390"); add("Husqvarna", "FS 450", Mo, "KTM450F");
  add("Husqvarna", "Svartpilen 125", Nk, "S125K"); add("Husqvarna", "TC 125", "Кросс-эндуро", "TR125", { approx: true, hp: 36 });
  add("BMW", "G 310 R", Nk, "G310"); add("BMW", "G 310 RR", Sp, "G310"); add("BMW", "S 1000 RR", Sp, "I4_1000E"); add("BMW", "S 1000 R", Nk, "I4_1000E", { hp: 165 }); add("BMW", "M 1000 RR", Sp, "I4_1000E", { hp: 212 });
  add("BMW", "F 900 R", Nk, "F850", { hp: 105 }); add("BMW", "R nineT", Nk, "R1250", { hp: 109, approx: true });
  add("Ducati", "Panigale V2", Sp, "V955D"); add("Ducati", "Monster", Nk, "DESERTX"); add("Ducati", "Multistrada V2", T, "DESERTX", A); add("Ducati", "Scrambler Icon", Nk, "V803D"); add("Ducati", "Scrambler Full Throttle", Nk, "V803D");
  add("Aprilia", "RS 457", Sp, "T457A"); add("Aprilia", "Tuono 457", Nk, "T457A"); add("Aprilia", "RS 660", Sp, "TUAREG660", { hp: 100 }); add("Aprilia", "Tuono 660", Nk, "TUAREG660", { hp: 95 });
  add("Triumph", "Trident 660", Nk, "I3_660T"); add("Triumph", "Daytona 660", Sp, "I3_660T", { hp: 95 }); add("Triumph", "Tiger Sport 660", T, "I3_660T"); add("Triumph", "Street Triple 765 RS", Nk, "I3_765T", { hp: 130 });
  add("Triumph", "Tiger 900 Rally Pro", T, "I3_900T"); add("Triumph", "Speed 400", Nk, "S400T"); add("Triumph", "Scrambler 400 X", Nk, "S400T"); add("Triumph", "Bonneville T120", Nk, "T1200TR"); add("Triumph", "Speed Twin 1200", Nk, "T1200TR", { hp: 104 });
  add("Harley-Davidson", "Sportster Iron 883", Ch, "V883HD"); add("Harley-Davidson", "Sportster 1200 Custom", Ch, "V883HD", { hp: 67 }); add("Harley-Davidson", "Street 750", Ch, "V750HD");
  add("Harley-Davidson", "Softail Street Bob 114", Ch, "V1750HD", { hp: 93 }); add("Harley-Davidson", "Fat Boy 114", Ch, "V1750HD", { hp: 93 }); add("Harley-Davidson", "Road King", Ch, "V1750HD");
  add("Royal Enfield", "Classic 350", Ch, "S350RE"); add("Royal Enfield", "Meteor 350", Ch, "S350RE"); add("Royal Enfield", "Hunter 350", Nk, "S350RE"); add("Royal Enfield", "Bullet 350", Nk, "S350RE");
  add("Royal Enfield", "Interceptor 650", Nk, "T650RE"); add("Royal Enfield", "Continental GT 650", Sp, "T650RE"); add("Royal Enfield", "Super Meteor 650", Ch, "T650RE"); add("Royal Enfield", "Shotgun 650", Ch, "T650RE");
  /* триал */
  ["125", "200", "250", "300"].forEach(function (c) { add("Beta", "EVO " + c + " 2T", Tr, c === "125" ? "TR125" : "TR2T", c === "200" ? { hp: 17, approx: true } : c === "250" ? { hp: 20 } : {}); });
  add("Beta", "EVO 300 4T", Tr, "TR4RT", { approx: true, hp: 20 });
  ["125", "250", "280", "300"].forEach(function (c) { add("GasGas", "TXT Racing " + c, Tr, c === "125" ? "TR125" : "TR2T"); });
  ["125", "250", "300"].forEach(function (c) { add("Sherco", "ST " + c + " Factory", Tr, c === "125" ? "TR125" : "TR2T"); }); add("Sherco", "ST 300 4T", Tr, "TR4RT", { approx: true });
  ["125", "250", "300"].forEach(function (c) { add("TRRS", "One " + c, Tr, c === "125" ? "TR125" : "TR2T"); add("Scorpa", "SC " + c, Tr, c === "125" ? "TR125" : "TR2T", { approx: true }); });
  add("Montesa", "Cota 4RT 260", Tr, "TR4RT"); add("Montesa", "Cota 301RR", Tr, "TR4RT", { hp: 21 }); add("Vertigo", "Nomad 300", Tr, "TR2T", A); add("Vertigo", "Combat Camp 250", Tr, "TR2T", A);
  /* мини-мотард и 50/125 */
  add("Beta", "RR 50 Enduro", "Эндуро", "AM6"); add("Beta", "RR 50 Motard", Mo, "AM6"); add("Beta", "RR 125 4T", "Эндуро", "M125", A); add("Beta", "RR 125 4T Motard", Mo, "M125", A);
  add("Rieju", "MRT 50", "Эндуро", "AM6"); add("Rieju", "MRT 50 SM", Mo, "AM6"); add("Rieju", "MRT 125", "Эндуро", "M125", A); add("Fantic", "XEF 125", "Эндуро", "M125"); add("Fantic", "XMF 125", Mo, "M125");
  add("Yamaha", "DT50R", "Эндуро", "AM6"); add("Yamaha", "DT50X", Mo, "AM6");
  /* Китай: новые бренды и модели */
  add("CFMOTO", "300SR", Sp, "S300C"); add("CFMOTO", "300NK", Nk, "S300C"); add("CFMOTO", "300CL-X", Nk, "S300C"); add("CFMOTO", "450SR", Sp, "CF450", { hp: 50 }); add("CFMOTO", "450NK", Nk, "CF450", { hp: 50 });
  add("CFMOTO", "450CL-C", Ch, "CF450", A); add("CFMOTO", "675SR", Sp, "I3_675C"); add("CFMOTO", "675NK", Nk, "I3_675C"); add("CFMOTO", "700CL-X", Nk, "T700C"); add("CFMOTO", "700MT", T, "T700C");
  add("CFMOTO", "800MT", T, "T800C"); add("CFMOTO", "800NK", Nk, "T800C", { hp: 99 });
  add("Kove", "450RR", Sp, "I4_450KV"); add("Kove", "321RR", Sp, "T321KV"); add("Kove", "321R", Nk, "T321KV", A);
  add("Zontes", "ZT350-R", Nk, "S350Z"); add("Zontes", "ZT350-T", T, "S350Z"); add("Zontes", "ZT350-X", Nk, "S350Z"); add("Zontes", "ZT350-GK", Nk, "S350Z"); add("Zontes", "ZT350-E", Ch, "S350Z", A);
  add("Zontes", "ZT125-U", Nk, "S125Z"); add("Zontes", "ZT125-G1", Nk, "S125Z");
  add("QJMotor", "SRK 600", Nk, "I4_600C"); add("QJMotor", "SRK 600 RS", Sp, "I4_600C", A); add("QJMotor", "SRT 550", T, "TRK502", A); add("QJMotor", "SRV 550", Ch, "TRK502", A);
  add("Benelli", "TNT 600", Nk, "I4_600C"); add("Benelli", "302R", Sp, "T300B"); add("Benelli", "TNT 302S", Nk, "T300B"); add("Benelli", "Leoncino 500", Nk, "TRK502"); add("Benelli", "502C", Ch, "TRK502");
  add("Keeway", "RKV 125", Nk, "S125Z", A); add("Keeway", "RKF 125", Nk, "S125Z", A); add("Keeway", "Superlight 125", Ch, "154FMI", A); add("Keeway", "K-Light 202", Ch, "V250LF", A); add("Keeway", "V302C", Ch, "T300B", A);
  add("Benda", "Chinchilla 300", Ch, "V300BD"); add("Benda", "Rockie 300", Ch, "V300BD"); add("Benda", "Rock 300", Ch, "V300BD", A);
  add("Haojue", "DR160", "Лёгкий эндуро", "S160HJ"); add("Haojue", "DK150", Nk, "S160HJ", { hp: 13, approx: true }); add("Haojue", "NK150", Nk, "S160HJ", { hp: 13, approx: true });
  add("Lifan", "KPR 200", Sp, "S200LF"); add("Lifan", "KP Mini 200", Nk, "S200LF", A); add("Lifan", "V16 250", Ch, "V250LF", A); add("Stels", "Flex 250", Ch, "V250LF");
  add("Voge", "300AC", Nk, "S300C", A); add("Voge", "500R", Nk, "VOGE525", A); add("Voge", "525ACX", Nk, "VOGE525", A);
})();
GUIDES.push(
  { id: "multi-sync", title: "Синхронизация дроссельных заслонок (2–4 цилиндра)", area: "carb", time: "1–1.5 ч", diff: "сложно", only: ["efi"], tools: ["Вакуумметр-синхронизатор", "Отвёртка", "Сканер (у части моделей)"], parts: ["vacgauge"],
    steps: ["Прогрей мотор до рабочей температуры.", "Подключи трубки синхронизатора к штуцерам разрежения каждого цилиндра.", "На холостых сравни показания: разница не больше 1–2 см рт. ст.", "Выравнивай винтами байпаса (у инжектора) или синхронизирующими винтами между заслонками (у карбюраторов).", "Проверь на 3000 об/мин и снова на холостых. Неровная синхронизация — вибрация и рывки на малом газе."] },
  { id: "belt-drive", title: "Ремённый привод: натяжка и осмотр", area: "gearbox", time: "30 мин", diff: "просто", tools: ["Динамометр ремня или линейка", "Ключи"], parts: [],
    steps: ["Ремень проверяй на холодном мотоцикле, колесо в нижней точке натяжения.", "Нажми на ремень посередине с усилием по мануалу и измерь прогиб.", "Ищи трещины, сколы зубьев и камни в шкиве.", "Регулируй эксцентриками оси одинаково с двух сторон.", "Ремень не смазывают и не моют агрессивной химией."] },
  { id: "shaft-oil", title: "Кардан: замена масла в главной передаче", area: "gearbox", time: "30 мин", diff: "просто", tools: ["Ключи", "Шприц или бутылка с носиком"], parts: ["gearoil"],
    steps: ["Прокатись 5–10 минут, чтобы масло стало жидким.", "Открути заливную, затем сливную пробку редуктора, слей масло.", "Осмотри магнит сливной пробки: крупная стружка — повод проверить шестерни.", "Залей гипоидное масло нужной вязкости до нижнего края заливного отверстия.", "Пробки — на новых шайбах, по моменту из мануала."] },
  { id: "trial-setup", title: "Триал: посадка и настройка рычагов", area: null, time: "30 мин", diff: "просто", tools: ["Шестигранники", "Ключи"], parts: ["levers"],
    steps: ["В триале едут стоя: руль выставляют так, чтобы при согнутых в локтях руках спина была ровной.", "Рычаги — почти горизонтально, чтобы работать одним-двумя пальцами стоя.", "Свободный ход сцепления минимальный, но без «подведения» дисков.", "Давление в задней шине очень низкое: 0.3–0.4 бар, в передней 0.4–0.5.", "Проверь, что педаль тормоза достаётся носком ботинка в стойке."] },
  { id: "i4-valves", title: "Клапаны на рядной четвёрке: что нужно знать", area: "head", time: "4–8 ч", diff: "сложно", only: ["dohc"], tools: ["Щупы", "Микрометр", "Набор шайб", "Динамометрический ключ"], parts: ["shims", "vcgasket"],
    steps: ["16 клапанов и шайбы под толкателями: работа долгая, проверяй строго по регламенту ({valveInt} км).", "Снимаются бак, airbox, катушки, крышка ГБЦ — фотографируй разъёмы и укладку проводки.", "Замеряй зазоры по порядку цилиндров в ВМТ сжатия каждого, записывай таблицу.", "Шайбы подбирай по формуле: старая шайба + (замер − норма).", "Распредвалы ставь строго по меткам, крышки постелей тяни по схеме и моменту."] },
  { id: "cruiser-care", title: "Круизер: что смотреть перед сезоном", area: null, time: "1 ч", diff: "просто", tools: ["Манометр", "Ключи"], parts: ["oil", "brakefluid"],
    steps: ["Давление в шинах — круизеры тяжёлые, недокачка быстро съедает резину.", "Ремень или кардан: прогиб ремня, течи из редуктора.", "Масло и фильтр, у V-twin — уровень масла по щупу в правильном положении мотоцикла.", "Тормозная жидкость, колодки, тросы.", "Крепёж глушителей и подножек — от вибраций V-twin ослабевает."] }
);
/* классы и параметры для новых типов */
SPEED_CLS.sport = { cda: 0.42, m: 240, crr: 0.013, rim: 17, h: 95 };
SPEED_CLS.naked = { cda: 0.58, m: 230, crr: 0.013, rim: 17, h: 95 };
SPEED_CLS.cruiser = { cda: 0.78, m: 300, crr: 0.015, rim: 16, h: 105 };
SPEED_CLS.trial = { cda: 0.7, m: 150, crr: 0.03, rim: 18, h: 100 };
ENGINES.TR2T.topRatio = 3.2; ENGINES.TR125.topRatio = 3.4; ENGINES.TR4RT.topRatio = 3.2;
/* ===================== v15: японские поколения, 2T-кросс, ЦПГ и инструкции ===================== */
function CL(id, base, o, k) { ENGINES[id] = Object.assign({}, ENGINES[base], { id: id }, o); genKit(id, k || 1.8); ensureSpark(id, k || 1.8); }
CL("CRF450C", "CRF450", { code: "PE05E", name: "Honda CRF450R 2002–2008 (Unicam, карбюратор)", groups: ["liquid", "carb", "4t", "big", "jp"], carb: "Keihin FCR-MX40", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", hp: 53 });
CL("CRF250C", "CRF250R", { code: "ME10E", name: "Honda CRF250R 2004–2009 (Unicam, карбюратор)", groups: ["liquid", "carb", "4t", "big", "jp"], cam: "Unicam SOHC, 4 клапана", carb: "Keihin FCR-MX37", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", hp: 37 });
CL("CRF250X", "CRF250C", { code: "ME10E (X)", name: "Honda CRF250X (эндуро, карбюратор)", start: "Электро + кик", gearbox: "5 ст., широкий ряд", hp: 30 });
CL("CRF450X", "CRF450C", { code: "PE05E (X)", name: "Honda CRF450X (эндуро, карбюратор)", start: "Электро", gearbox: "5 ст., широкий ряд", hp: 45 });
CL("XR650R", "XR650L", { code: "RE02E", name: "Honda XR650R (жидкостный RFVC)", cooling: "Жидкостное", groups: ["liquid", "carb", "4t", "big", "jp"], hp: 61, carb: "Keihin FCR40", start: "Кик", issues: [{ t: "Тяжёлый запуск киком без декомпрессора", sev: "low", fix: "Ставить в ВМТ сжатия и запускать уверенно." }] });
CL("XR600R", "XR650L", { code: "PE04E", name: "Honda XR600R (воздушный RFVC)", cc: 591, hp: 45, start: "Кик", carb: "Keihin PD ×2 (двухкамерный)", issues: [{ t: "Возрастной мотоцикл — ЦПГ и сальники", sev: "med", fix: "Компрессия и осмотр при покупке." }] });
CL("YZ250FC", "YZ250F", { code: "YZ250F (5V)", name: "Yamaha YZ250F / WR250F 2001–2013 (5 клапанов, карбюратор)", cam: "DOHC, 5 клапанов", groups: ["dohc", "liquid", "carb", "4t", "big", "jp"], carb: "Keihin FCR-MX37", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", hp: 38 });
CL("YZ450FC", "YZ450F", { code: "YZ450F (5V)", name: "Yamaha YZ450F / WR450F 2003–2009 (5 клапанов, карбюратор)", cam: "DOHC, 5 клапанов", groups: ["dohc", "liquid", "carb", "4t", "big", "jp"], carb: "Keihin FCR-MX39/41", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", hp: 51 });
CL("KX250FC", "KX450", { code: "KX250F (карб.)", name: "Kawasaki KX250F 2004–2010 (карбюратор)", cc: 249, hp: 38, groups: ["dohc", "liquid", "carb", "4t", "big", "jp"], carb: "Keihin FCR-MX37", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу" });
CL("KX450FC", "KX450", { code: "KX450F (карб.)", name: "Kawasaki KX450F 2006–2008 (карбюратор)", hp: 52, groups: ["dohc", "liquid", "carb", "4t", "big", "jp"], carb: "Keihin FCR-MX40", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу" });
CL("RMZ250C", "RMZ450", { code: "RM-Z250 (карб.)", name: "Suzuki RM-Z250 2004–2009 (карбюратор)", cc: 249, hp: 38, groups: ["dohc", "liquid", "carb", "4t", "big", "jp"], carb: "Keihin FCR-MX37", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу" });
CL("RMZ450C", "RMZ450", { code: "RM-Z450 (карб.)", name: "Suzuki RM-Z450 2005–2007 (карбюратор)", hp: 52, groups: ["dohc", "liquid", "carb", "4t", "big", "jp"], carb: "Keihin FCR-MX40", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу" });
CL("DRZ250", "DR200", { code: "DR-Z250", name: "Suzuki DR-Z250 (воздушно-масляный)", cc: 249, hp: 26, cam: "SOHC, 4 клапана", gearbox: "6 ст.", carb: "Mikuni BSR33 / Keihin PWK (Y)" });
CL("XT600", "XR650L", { code: "3TB / 4PT", name: "Yamaha XT600E (воздушный, 4 клапана)", maker: "Yamaha", cc: 595, hp: 45, carb: "Teikei Y26PV двухкамерный", issues: [{ t: "Возраст: ЦПГ, проводка, карбюратор", sev: "med", fix: "Ревизия при покупке." }] });
CL("JP2T250", "YZ250", { code: "JP 250 2T", name: "Японский кроссовый 2T 250 (CR250R / KX250 / RM250)", maker: "Honda / Kawasaki / Suzuki", carb: "Keihin PWK38 / Mikuni TMX38 (по модели)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", hp: 45 });
CL("JP2T125", "YZ125", { code: "JP 125 2T", name: "Японский кроссовый 2T 125 (CR125R / KX125 / RM125)", maker: "Honda / Kawasaki / Suzuki", carb: "Keihin PWK36 / Mikuni TMX (по модели)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", hp: 36 });
(function () {
  var E = "Эндуро", K = "Кросс-эндуро", T = "Тур-эндуро", A = { approx: true };
  var add = addBike;
  /* Honda */
  add("Honda", "CRF450R 2002–2008", K, "CRF450C"); add("Honda", "CRF450R 2009–2016", K, "CRF450", { hp: 54 }); add("Honda", "CRF450R 2017–2020", K, "CRF450"); add("Honda", "CRF450R 2021–2026", K, "CRF450", { hp: 56 });
  add("Honda", "CRF250R 2004–2009", K, "CRF250C"); add("Honda", "CRF250R 2010–2017", K, "CRF250C", { hp: 39, approx: true }); add("Honda", "CRF250R 2018–2026", K, "CRF250R");
  add("Honda", "CRF250X 2004–2017", E, "CRF250X"); add("Honda", "CRF450X 2005–2017", E, "CRF450X"); add("Honda", "XR650R", E, "XR650R"); add("Honda", "XR600R", E, "XR600R");
  add("Honda", "CR125R", K, "JP2T125"); add("Honda", "CR250R", K, "JP2T250"); add("Honda", "XR250R 1996–2004", E, "XR250"); add("Honda", "XR400R 1996–2004", E, "XR400R");
  /* Yamaha */
  add("Yamaha", "YZ250F 2001–2013", K, "YZ250FC"); add("Yamaha", "YZ250F 2014–2026", K, "YZ250F"); add("Yamaha", "WR250F 2001–2014", E, "YZ250FC", { hp: 33 }); add("Yamaha", "WR250F 2015–2026", E, "YZ250F", { hp: 37 });
  add("Yamaha", "YZ450F 2003–2009", K, "YZ450FC"); add("Yamaha", "YZ450F 2010–2026", K, "YZ450F"); add("Yamaha", "WR450F 2003–2015", E, "YZ450FC", { hp: 47 }); add("Yamaha", "WR450F 2016–2026", E, "YZ450F", { hp: 52 });
  add("Yamaha", "YZ250X", E, "YZ250", { hp: 44 }); add("Yamaha", "YZ125X", E, "YZ125", { hp: 35 }); add("Yamaha", "XT600E", T, "XT600"); add("Yamaha", "TT-R250", E, "XT250", A);
  /* Kawasaki */
  add("Kawasaki", "KX250F 2004–2010", K, "KX250FC"); add("Kawasaki", "KX250F 2011–2020", K, "KX450", { hp: 41, approx: true }); add("Kawasaki", "KX450F 2006–2008", K, "KX450FC"); add("Kawasaki", "KX450F 2009–2018", K, "KX450", { hp: 54 });
  add("Kawasaki", "KX125", K, "JP2T125"); add("Kawasaki", "KX250 (2T)", K, "JP2T250"); add("Kawasaki", "KLX450R 2008–2026", E, "KX450", { hp: 48, approx: true });
  /* Suzuki */
  add("Suzuki", "RM-Z250 2004–2009", K, "RMZ250C"); add("Suzuki", "RM-Z250 2010–2026", K, "RMZ450", { hp: 40, approx: true }); add("Suzuki", "RM-Z450 2005–2007", K, "RMZ450C"); add("Suzuki", "RM-Z450 2008–2026", K, "RMZ450");
  add("Suzuki", "RMX450Z", E, "RMZ450", { hp: 48 }); add("Suzuki", "RM125", K, "JP2T125"); add("Suzuki", "RM250", K, "JP2T250"); add("Suzuki", "DR-Z250", E, "DRZ250"); add("Suzuki", "DR-Z400E 2000–2007", E, "DRZ400");
})();
GUIDES.push(
  { id: "cpg-4t", title: "Замена ЦПГ (поршень, кольца, цилиндр) на 4T", area: "cyl", time: "4–6 ч", diff: "сложно", only: ["4t"], fig: "piston", tools: ["Ключи и головки", "Динамометрический ключ", "Щупы", "Пластиковый шабер", "Оправка для колец (желательно)", "Тряпки, чтобы закрыть картер"], parts: ["piston", "rings", "gasketset", "basegasket", "headgasket"],
    steps: ["Слей масло и антифриз (если есть), сними бак, сиденье, выхлоп и карбюратор.", "Выставь ВМТ такта сжатия по меткам (инструкция «Выставление меток ГРМ»), сними натяжитель цепи ГРМ и звезду распредвала. Цепь подвяжи проволокой, чтобы не упала в картер.", "Ослабь гайки головки крест-накрест в 2–3 приёма, сними головку и старую прокладку.", "Подними цилиндр ровно вверх. Как только откроется поршень — заткни горловину картера чистой тряпкой.", "Выщелкни стопорные кольца пальца, выдави палец и сними поршень. Отметь, какой стороной он стоял (стрелка «IN» или «EX» на днище).", "Осмотри цилиндр: задиры, ступенька вверху, овальность. С задирами или износом — расточка под ремонтный поршень или новый цилиндр.", "Проверь зазор в замке новых колец: вставь кольцо в цилиндр на 10–15 мм от верха и замерь щупом (см. инструкцию «Кольца: зазор и установка»).", "Надень кольца на поршень маркировкой вверх: сначала маслосъёмное (расширитель и две тонкие пластины), затем второе компрессионное, затем верхнее. Замки разведи на 120°.", "Поставь поршень стрелкой к выпуску, новый палец смажь маслом, обязательно поставь оба стопорных кольца замком не в прорезь.", "Новая прокладка цилиндра, обильно смажь зеркало и кольца маслом, сожми кольца пальцами или оправкой и надвинь цилиндр.", "Новая прокладка ГБЦ, головка, гайки — крест-накрест до момента по мануалу в 2–3 приёма.", "Собери ГРМ строго по меткам, проверни коленвал рукой два оборота, отрегулируй клапаны ({valveIn} / {valveEx}).", "Залей масло {oil}, заведи и прогрей без газовки. Проверь на подтёки.", "Обкатка 300–500 км без полного газа, первое масло смени через 200–300 км."] },
  { id: "rings-gap", title: "Кольца: зазор в замке и правильная установка", area: "cyl", time: "30 мин", diff: "средне", fig: "rings", tools: ["Щупы", "Поршень вместо оправки"], parts: ["rings"],
    steps: ["Вставь кольцо в цилиндр и выровняй его днищем поршня на глубине 10–15 мм.", "Замерь щупом зазор в замке. Типично 0.15–0.35 мм для компрессионных колец: смотри мануал своего мотора.", "Меньше нормы — кольцо может сомкнуться при нагреве. Аккуратно подпили торцы надфилем. Больше нормы — изношен цилиндр.", "Маркировка (буква или точка) на кольце — всегда вверх, к головке.", "Замки трёх колец разведи примерно на 120° друг от друга, не над пальцем и не над выпускным окном.", "У двухтактников кольца стоят на штифтах в канавках: замок должен сесть на штифт, иначе кольцо сломается."] },
  { id: "compression-test", title: "Замер компрессии", area: "cyl", time: "20 мин", diff: "просто", fig: "compression", tools: ["Компрессометр с резьбой под свечу", "Свечной ключ"], parts: ["spark"],
    steps: ["Прогрей мотор до рабочей температуры и заглуши.", "Выкрути свечу, вкрути компрессометр (переходник по резьбе свечи).", "Полностью открой газ и прокрути мотор стартером или киком 5–8 раз, пока стрелка не перестанет расти.", "Норма для твоего мотора: {compression}. У 4T с автодекомпрессором показания ниже — смотри мануал.", "Мало — капни 1–2 мл масла в цилиндр и замерь снова. Выросла — износ колец и цилиндра, не выросла — клапаны или прокладка ГБЦ."] },
  { id: "valve-lap", title: "Притирка клапанов", area: "head", time: "2–3 ч (на снятой головке)", diff: "сложно", only: ["4t"], fig: "valvelap", tools: ["Рассухариватель клапанов", "Притирочная паста", "Присоска-притир", "Керосин"], parts: ["valvein", "valveex", "valveseals"],
    steps: ["Сними головку, рассухарь клапаны: сожми пружину, вынь сухари, сними тарелку и пружину. Раскладывай детали по порядку.", "Очисти тарелки клапанов и сёдла от нагара.", "Нанеси тонкий слой пасты на фаску клапана, вставь клапан и присоску.", "Вращай клапан туда-обратно, периодически приподнимая, 1–2 минуты. Сначала крупная паста, затем мелкая.", "Ровный матовый поясок 1–1.5 мм по всей окружности — готово.", "Смой пасту керосином дочиста: остатки абразива убивают мотор. Проверка: налей керосин в канал — не должно подтекать.", "Новые маслосъёмные колпачки, сборка, регулировка зазоров."] },
  { id: "starter-brushes", title: "Ремонт стартера: щётки и коллектор", area: "gen", time: "1 ч", diff: "средне", fig: "starter", tools: ["Ключи", "Мелкая наждачка", "Мультиметр"], parts: ["starter"],
    steps: ["Отключи минус АКБ, отсоедини провод стартера, сними стартер с мотора.", "Открути длинные стяжные болты, сними крышку со стороны щёток — запомни положение меток.", "Щётки короче 5–6 мм меняй комплектом.", "Коллектор зачисти мелкой наждачкой по кругу, канавки между ламелями прочисти от графитовой пыли.", "Проверь мультиметром: между ламелями — почти 0 Ом, между коллектором и корпусом — обрыв.", "Собери по меткам, смажь втулки каплей масла, проверь кольцо уплотнения."] },
  { id: "pads-replace", title: "Замена тормозных колодок (дисковый тормоз)", area: null, time: "30 мин", diff: "просто", fig: "pads", tools: ["Ключи", "Шестигранник", "Очиститель тормозов"], parts: ["padsF", "padsR", "brakecleaner"],
    steps: ["Сними защитную крышку, выкрути палец колодок (часто под заглушкой).", "Вынь старые колодки. Остаток накладки меньше 1–1.5 мм — замена обязательна.", "Утопи поршни суппорта: следи, чтобы жидкость в бачке не перелилась через край.", "Почисти суппорт, поставь новые колодки и пружинную пластину правильной стороной.", "Вставь палец, затяни, поставь шплинт или заглушку.", "Покачай рычаг до упругости, приработай колодки: 10–15 плавных торможений."] },
  { id: "fork-seals-steps", title: "Сальники вилки: замена по шагам", area: null, time: "2–3 ч", diff: "сложно", fig: "fork", tools: ["Оправка для сальников (или кусок трубы)", "Отвёртка", "Ключи", "Мерный стакан"], parts: ["forkseals", "forkdust", "forkoil"],
    steps: ["Сними перо, слей масло (инструкция «Замена масла в вилке»).", "Поддень и сними пыльник, вынь стопорное кольцо сальника.", "Резкими движениями «молотком» разведи трубы — сальник выйдет вместе с втулкой.", "Новый сальник надевай через плёнку или пакет, чтобы не порезать кромку о трубу.", "Запрессуй сальник оправкой до канавки, поставь стопорное кольцо и пыльник.", "Залей масло, выставь уровень, собери. Проверь, что трубы чистые и без забоин."] }
);
(function () {
  var m = { "cpg-4t": "piston", "rings-gap": "rings", "compression-test": "compression", compression: "compression", "valve-lap": "valvelap", "starter-brushes": "starter", "pads-replace": "pads", pads: "pads",
    "fork-seals-steps": "fork", forkseals: "fork", "fork-oil": "fork", "clutch-replace": "clutch", "clutch-cable": "lever", "throttle-cable": "lever", coolant: "coolant", "fan-install": "coolant", reed: "reed", piston2t: "piston",
    headgasket: "piston", "stator-replace": "multimeter", "cdi-install": "multimeter", "led-install": "multimeter", "skid-install": "chain", "sprocket-change": "chain", "drum-brake": "pads", "brake-clean": "pads",
    "moped-clutch": "clutch", "oil2t-mix": "oil", "used-check": "compression", "efi-clean": "idle", "carb-pwk-install": "carb", "filter-install": "airfilter", "exhaust": "piston", "exhaust-install": "piston" };
  GUIDES.forEach(function (g) { if (m[g.id] && (!g.fig || ["piston", "multimeter"].indexOf(m[g.id]) < 0 || !g.fig)) g.fig = g.fig || m[g.id]; });
  GUIDES.forEach(function (g) { if (m[g.id] && ["compression", "pads", "fork", "clutch", "lever", "coolant", "reed"].indexOf(m[g.id]) >= 0) g.fig = m[g.id]; });
})();
/* ===================== v16: японские «четырёхсотки», Bajaj, TVS ===================== */
RE("I4_400H", { region: "jp", code: "NC39/NC42", name: "Honda CB400 Super Four (рядная четвёрка 400, HYPER VTEC)", maker: "Honda", layout: "i4", groups: ["dohc", "liquid", "carb", "4t", "big"], cam: "DOHC, 16 клапанов, HYPER VTEC", cc: 399, hp: 53, torque: "≈ 38 Н·м", compression: "≈ 11.3 бар", carb: "Keihin ×4 (до 2007) / инжектор (NC42)", oilVol: "≈ 3.6 л", fuel: "АИ-95" }, 1.6);
RE("I4_400S", { region: "jp", code: "GK75A", name: "Suzuki Bandit 400 / GSF400 (рядная четвёрка 400)", maker: "Suzuki", layout: "i4", groups: ["dohc", "liquid", "carb", "4t", "big"], cam: "DOHC, 16 клапанов", cc: 398, hp: 59, torque: "≈ 37 Н·м", compression: "≈ 12 бар", carb: "Mikuni ×4", oilVol: "≈ 3.4 л" }, 1.5);
RE("I4_400Y", { region: "jp", code: "4HM", name: "Yamaha XJR400 (рядная четвёрка 400, воздушно-масляная)", maker: "Yamaha", layout: "i4", groups: ["dohc", "air", "carb", "4t", "big"], cooling: "Воздушно-масляное", cam: "DOHC, 16 клапанов", cc: 399, hp: 53, torque: "≈ 36 Н·м", compression: "≈ 11 бар", carb: "Mikuni ×4", oilVol: "≈ 3.2 л", oilInt: 5000 }, 1.5);
RE("I4_400K2", { region: "jp", code: "ZR400", name: "Kawasaki ZRX400 / Zephyr 400 (рядная четвёрка 400)", maker: "Kawasaki", layout: "i4", groups: ["dohc", "carb", "4t", "big"], cam: "DOHC, 8–16 клапанов (по модели)", cc: 399, hp: 53, torque: "≈ 36 Н·м", compression: "≈ 11 бар", carb: "Keihin ×4", oilVol: "≈ 3.2 л", oilInt: 5000 }, 1.5);
RE("V400H", { region: "jp", code: "NC26/PC21", name: "Honda Steed 400/600 / Shadow 400 (V-twin 52°)", maker: "Honda", layout: "vtwin", vAngle: 52, groups: ["liquid", "carb", "4t", "big"], cam: "SOHC, 6 клапанов, V-twin 52°", cc: 398, hp: 30, torque: "≈ 33 Н·м", compression: "≈ 10 бар", gearbox: "5 ст.", carb: "Keihin ×2", oilVol: "≈ 2.6 л", oilInt: 5000 }, 1.5);
RE("V250H4", { region: "jp", code: "MC29E", name: "Honda Magna 250 / VTR250 (V-образный 250)", maker: "Honda", layout: "vtwin", vAngle: 90, groups: ["dohc", "liquid", "carb", "4t", "big"], cam: "DOHC, V-twin 90° (VTR) / V4 (Magna)", cc: 249, hp: 35, torque: "≈ 23 Н·м", compression: "≈ 11 бар", carb: "Keihin", oilVol: "≈ 2.2 л", oilInt: 5000 }, 1.4);
RE("S400BJ", { region: "in", code: "Bajaj 373", name: "Bajaj Dominar 400 (сингл 373, на базе KTM)", maker: "Bajaj", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 4 клапана", cc: 373, hp: 40, torque: "≈ 35 Н·м", compression: "≈ 12.5 бар", oilVol: "≈ 1.75 л", oilInt: 10000, valveInt: 15000 }, 1.0);
RE("S200BJ", { region: "in", code: "Bajaj 200 LC", name: "Bajaj Pulsar NS200 / RS200 (жидкостный 200)", maker: "Bajaj", groups: ["liquid", "carb", "4t", "small"], cam: "SOHC, 4 клапана, 3 свечи", cc: 199, hp: 24, torque: "≈ 18.5 Н·м", compression: "≈ 11 бар", carb: "Карбюратор / инжектор (по году)", oilVol: "≈ 1.15 л", oilInt: 5000, valveInt: 10000 }, 0.9);
RE("S180BJ", { region: "in", code: "Bajaj DTS-i 180", name: "Bajaj Pulsar 150/180 (воздушный DTS-i)", maker: "Bajaj", groups: ["air", "carb", "4t", "small"], cooling: "Воздушное", cam: "SOHC, 2 клапана, 2 свечи", cc: 178, hp: 17, torque: "≈ 14.5 Н·м", compression: "≈ 9.5 бар", gearbox: "5 ст.", oilVol: "≈ 1.2 л", oilInt: 5000, valveInt: 10000 }, 0.8);
RE("S200TV", { region: "in", code: "TVS 200 4V", name: "TVS Apache RTR 160 4V / 200 4V (маслоохлаждаемый)", maker: "TVS", groups: ["air", "efi", "4t", "small"], cooling: "Воздушно-масляное", cam: "SOHC, 4 клапана", cc: 198, hp: 20.5, torque: "≈ 17 Н·м", compression: "≈ 10 бар", gearbox: "5 ст.", oilVol: "≈ 1.1 л", oilInt: 5000, valveInt: 10000 }, 0.8);
(function () {
  var Nk = "Нейкед", Ch = "Чоппер", Sp = "Спорт", A = { approx: true };
  var add = addBike;
  add("Honda", "CB400 Super Four (NC39)", Nk, "I4_400H"); add("Honda", "CB400 Super Four VTEC Revo (NC42)", Nk, "I4_400H", { hp: 56 }); add("Honda", "CB400 Super Bol d'Or", Sp, "I4_400H", { hp: 56 });
  add("Honda", "Steed 400", Ch, "V400H"); add("Honda", "Steed 600", Ch, "V400H", { hp: 40, approx: true }); add("Honda", "Shadow 400", Ch, "V400H"); add("Honda", "Magna 250 (V4)", Ch, "V250H4", A); add("Honda", "VTR250", Nk, "V250H4", { hp: 32 });
  add("Honda", "CB1300 Super Four", Nk, "I4_1000J", { hp: 113, approx: true }); add("Honda", "CB750 (RC42)", Nk, "I4_650H", { hp: 73, approx: true });
  add("Suzuki", "Bandit 400 (GSF400)", Nk, "I4_400S"); add("Suzuki", "GSX400 Impulse", Nk, "I4_400S", A); add("Suzuki", "Bandit 600 (GSF600)", Nk, "I4_600J", { hp: 78, approx: true }); add("Suzuki", "Bandit 1250", Nk, "I4_1000J", { hp: 98, approx: true });
  add("Yamaha", "XJR400", Nk, "I4_400Y"); add("Yamaha", "XJR1300", Nk, "I4_1000J", { hp: 98, approx: true }); add("Yamaha", "FZ6 Fazer", Nk, "I4_600J", { hp: 98, approx: true }); add("Yamaha", "FZ1", Nk, "I4_1000J", { hp: 150, approx: true });
  add("Kawasaki", "ZRX400", Nk, "I4_400K2"); add("Kawasaki", "Zephyr 400", Nk, "I4_400K2", { hp: 46 }); add("Kawasaki", "ZRX1200", Nk, "I4_1000J", { hp: 120, approx: true }); add("Kawasaki", "Z900", Nk, "I4_1000J", { hp: 125, approx: true });
  add("Bajaj", "Dominar 400", "Тур-эндуро", "S400BJ"); add("Bajaj", "Pulsar NS200", Nk, "S200BJ"); add("Bajaj", "Pulsar RS200", Sp, "S200BJ"); add("Bajaj", "Pulsar 180", Nk, "S180BJ"); add("Bajaj", "Pulsar 150", Nk, "S180BJ", { hp: 14 });
  add("Bajaj", "Avenger 220 Cruise", Ch, "S180BJ", { hp: 19, approx: true });
  add("TVS", "Apache RTR 200 4V", Nk, "S200TV"); add("TVS", "Apache RTR 160 4V", Nk, "S200TV", { hp: 17.5 }); add("TVS", "Apache RR 310", Sp, "G310");
})();
/* ===================== v17: классические туреры и эндуро — до 1000+ моделей ===================== */
RE("ROTAX652", { code: "Rotax 652", name: "Rotax 652 (BMW F650 / G650, Aprilia Pegaso 650)", maker: "Rotax / BMW / Aprilia", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 4 клапана, 2 свечи (у части)", cc: 652, hp: 50, torque: "≈ 60 Н·м", compression: "≈ 11.5 бар", gearbox: "5 ст.", carb: "Инжектор (у ранних — карбюраторы)", oilVol: "≈ 2.3 л (сухой картер)", oilInt: 10000, valveInt: 20000 }, 2.2);
RE("V600H", { region: "jp", code: "RD/PD", name: "Honda Transalp 600/650/700 (V-twin 52°)", maker: "Honda", layout: "vtwin", vAngle: 52, groups: ["liquid", "carb", "4t", "big"], cam: "SOHC, 6 клапанов, V-twin 52°", cc: 583, hp: 50, torque: "≈ 53 Н·м", compression: "≈ 9.2 бар", gearbox: "5 ст.", carb: "Keihin ×2 (700 — инжектор)", oilVol: "≈ 3 л", oilInt: 6000, valveInt: 12000 }, 1.8);
RE("V750H", { region: "jp", code: "RD07E", name: "Honda XRV750 Africa Twin (V-twin 52°)", maker: "Honda", layout: "vtwin", vAngle: 52, groups: ["liquid", "carb", "4t", "big"], cam: "SOHC, 6 клапанов, V-twin 52°", cc: 742, hp: 59, torque: "≈ 63 Н·м", compression: "≈ 9 бар", gearbox: "5 ст.", carb: "Keihin ×2", oilVol: "≈ 3.6 л", oilInt: 6000, valveInt: 12000 }, 1.9);
RE("V1000H", { region: "jp", code: "SD02E", name: "Honda XL1000V Varadero (V-twin 90°)", maker: "Honda", layout: "vtwin", vAngle: 90, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, V-twin 90°", cc: 996, hp: 94, torque: "≈ 98 Н·м", compression: "≈ 9.8 бар", oilVol: "≈ 4 л" }, 2.0);
RE("T1200Y", { region: "jp", code: "XT1200Z", name: "Yamaha XT1200Z Super Ténéré (рядная двойка 270°)", maker: "Yamaha", layout: "twin", crankPhase: 270, groups: ["dohc", "liquid", "efi", "4t", "big", "balancer"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 1199, hp: 110, torque: "≈ 114 Н·м", compression: "≈ 11 бар", gearbox: "6 ст., кардан", oilVol: "≈ 4.2 л" }, 2.2);
RE("T900Y", { region: "jp", code: "TDM900", name: "Yamaha TDM 850/900 (рядная двойка 270°)", maker: "Yamaha", layout: "twin", crankPhase: 270, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 10 клапанов, 2 цилиндра", cc: 897, hp: 86, torque: "≈ 89 Н·м", compression: "≈ 10.4 бар", carb: "Инжектор (850 — карбюраторы)", oilVol: "≈ 4 л" }, 2.0);
RE("S800S", { region: "jp", code: "DR800", name: "Suzuki DR800S Big (одноцилиндровый 779)", maker: "Suzuki", groups: ["air", "carb", "4t", "big", "balancer"], cooling: "Воздушно-масляное", cam: "SOHC, 4 клапана, 2 свечи", cc: 779, hp: 50, torque: "≈ 64 Н·м", compression: "≈ 9.5 бар", gearbox: "5 ст.", carb: "Mikuni ×2", oilVol: "≈ 3.5 л", oilInt: 6000, valveInt: 6000 }, 1.8);
RE("V1000S", { region: "jp", code: "V-Strom 1000", name: "Suzuki 1037 V-twin 90° (V-Strom 1000/1050, TL1000, Cagiva Navigator)", maker: "Suzuki", layout: "vtwin", vAngle: 90, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, V-twin 90°", cc: 1037, hp: 100, torque: "≈ 100 Н·м", compression: "≈ 11.5 бар", oilVol: "≈ 3.9 л" }, 2.0);
RE("T500K", { region: "jp", code: "EX500", name: "Kawasaki KLE500 / GPZ500 (рядная двойка 180°)", maker: "Kawasaki", layout: "twin", crankPhase: 180, groups: ["dohc", "liquid", "carb", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 498, hp: 45, torque: "≈ 44 Н·м", compression: "≈ 10.8 бар", carb: "Keihin ×2", oilVol: "≈ 3 л", oilInt: 6000, valveInt: 12000 }, 1.7);
RE("I4_1000K", { region: "jp", code: "Kawasaki 1043", name: "Kawasaki 1043 (рядная четвёрка: Versys 1000, Z1000)", maker: "Kawasaki", layout: "i4", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 1043, hp: 120, torque: "≈ 102 Н·м", compression: "≈ 10.3 бар", oilVol: "≈ 4 л" }, 2.2);
RE("I3_800T", { code: "Triumph 800 I3", name: "Triumph 800 (рядная тройка: Tiger 800)", maker: "Triumph", layout: "i3", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 12 клапанов, 3 цилиндра", cc: 799, hp: 95, torque: "≈ 79 Н·м", compression: "≈ 11.3 бар", oilVol: "≈ 3.7 л" }, 2.5);
RE("I3_1200T", { code: "Triumph 1215 I3", name: "Triumph 1215 (рядная тройка: Tiger Explorer / Tiger 1200)", maker: "Triumph", layout: "i3", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 12 клапанов, 3 цилиндра", cc: 1215, hp: 137, torque: "≈ 121 Н·м", compression: "≈ 11 бар", gearbox: "6 ст., кардан", oilVol: "≈ 4 л" }, 2.6);
RE("V450A", { code: "Aprilia V450", name: "Aprilia RXV/SXV 450/550 (V-twin 77°)", maker: "Aprilia", layout: "vtwin", vAngle: 77, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, V-twin 77°", cc: 449, hp: 60, torque: "≈ 45 Н·м", compression: "≈ 12.5 бар", oilVol: "≈ 1.5 л", oilInt: 1500, valveInt: 3000,
  issues: [{ t: "Спортивный V-twin: короткий ресурс, дорогие запчасти", sev: "high", fix: "Строгий регламент по моточасам." }] }, 2.6);
RE("V853G", { code: "Guzzi 853", name: "Moto Guzzi 853/1151 (поперечный V-twin 90°: V85 TT / Stelvio)", maker: "Moto Guzzi", layout: "vtwin", vAngle: 90, groups: ["air", "efi", "4t", "big", "cg"], cooling: "Воздушно-масляное", cam: "OHV, 4 клапана, поперечный V-twin 90°", cc: 853, hp: 76, torque: "≈ 82 Н·м", compression: "≈ 10.5 бар", gearbox: "6 ст., кардан", oilVol: "≈ 3.5 л" }, 2.6);
RE("V1200D", { code: "Testastretta 1198", name: "Ducati Testastretta 1198 (L-twin 90°: Multistrada 1200)", maker: "Ducati", layout: "vtwin", vAngle: 90, groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, Desmodromic, V-twin 90°", cc: 1198, hp: 150, torque: "≈ 124 Н·м", compression: "≈ 12.5 бар", oilVol: "≈ 4 л", fuel: "АИ-98" }, 3.0);
(function () {
  var T = "Тур-эндуро", E = "Эндуро", Mo = "Мотард", Nk = "Нейкед", Sp = "Спорт", A = { approx: true };
  var add = addBike;
  /* Honda */
  add("Honda", "NX650 Dominator", T, "XR650L", { hp: 44, approx: true }); add("Honda", "XL600V Transalp", T, "V600H"); add("Honda", "XL650V Transalp", T, "V600H", { hp: 53 }); add("Honda", "XL700V Transalp", T, "V600H", { hp: 60 });
  add("Honda", "XRV750 Africa Twin", T, "V750H"); add("Honda", "XRV650 Africa Twin", T, "V750H", { hp: 50, approx: true }); add("Honda", "XL1000V Varadero", T, "V1000H"); add("Honda", "SLR650", T, "XR650L", { hp: 38, approx: true });
  add("Honda", "FMX650", Mo, "XR650L", { hp: 38, approx: true }); add("Honda", "XR250 Baja", E, "XR250"); add("Honda", "XLR250 Baja", E, "XR250", A); add("Honda", "CRF250 Rally", T, "CRF250L");
  add("Honda", "CB600F Hornet", Nk, "I4_600J", { hp: 95, approx: true }); add("Honda", "CBF600", Nk, "I4_600J", { hp: 78, approx: true }); add("Honda", "CBF500", Nk, "T500K", { hp: 57, approx: true });
  /* Yamaha */
  add("Yamaha", "XT1200Z Super Ténéré", T, "T1200Y"); add("Yamaha", "XTZ750 Super Ténéré", T, "T900Y", { hp: 69, approx: true }); add("Yamaha", "TDM850", T, "T900Y", { hp: 77 }); add("Yamaha", "TDM900", T, "T900Y");
  add("Yamaha", "MT-10", Nk, "I4_1000J", { hp: 166 }); add("Yamaha", "Tracer 7", T, "T700"); add("Yamaha", "Ténéré 700 World Raid", T, "T700"); add("Yamaha", "WR250X", Mo, "WR250R"); add("Yamaha", "XT250X", Mo, "XT250", A);
  /* Suzuki */
  add("Suzuki", "DR800S Big", T, "S800S"); add("Suzuki", "DR750S Big", T, "S800S", { hp: 52, approx: true }); add("Suzuki", "V-Strom 1000 (DL1000)", T, "V1000S"); add("Suzuki", "V-Strom 1050", T, "V1000S", { hp: 107 });
  add("Suzuki", "SV650", Nk, "VS650", { hp: 75 }); add("Suzuki", "XF650 Freewind", T, "DR650", { approx: true }); add("Suzuki", "DR-Z400S", E, "DRZ400");
  /* Kawasaki */
  add("Kawasaki", "KLE500", T, "T500K"); add("Kawasaki", "Versys 1000", T, "I4_1000K"); add("Kawasaki", "Z1000", Nk, "I4_1000K", { hp: 142 }); add("Kawasaki", "KLV1000", T, "V1000S");
  add("Kawasaki", "ER-6n", Nk, "T650K", { hp: 72 }); add("Kawasaki", "ER-6f", Sp, "T650K", { hp: 72 }); add("Kawasaki", "KLX650", E, "KLR650", A);
  /* BMW */
  add("BMW", "F 650 GS (одноцилиндровый)", T, "ROTAX652"); add("BMW", "F 650 GS Dakar", T, "ROTAX652"); add("BMW", "G 650 GS", T, "ROTAX652", { hp: 48 }); add("BMW", "G 650 GS Sertão", T, "ROTAX652", { hp: 48 });
  add("BMW", "G 650 Xchallenge", E, "ROTAX652", { hp: 53 }); add("BMW", "G 650 Xcountry", T, "ROTAX652", { hp: 53 }); add("BMW", "F 650 GS (двухцилиндровый)", T, "F850", { hp: 71, approx: true }); add("BMW", "F 800 GS", T, "F850", { hp: 85, approx: true });
  add("BMW", "F 800 GS Adventure", T, "F850", { hp: 85, approx: true }); add("BMW", "R 1200 GS", T, "R1250", { hp: 125, approx: true }); add("BMW", "R 1200 GS Adventure", T, "R1250", { hp: 125, approx: true }); add("BMW", "R 1150 GS", T, "R1250", { hp: 85, approx: true });
  add("BMW", "R 1100 GS", T, "R1250", { hp: 80, approx: true });
  /* KTM */
  add("KTM", "640 Adventure", T, "LC4", { hp: 55, approx: true }); add("KTM", "625 SXC", E, "LC4", { hp: 50, approx: true }); add("KTM", "690 SMC", Mo, "LC4"); add("KTM", "950 Adventure", T, "LC8", { hp: 98, approx: true });
  add("KTM", "990 Adventure", T, "LC8", { hp: 106, approx: true }); add("KTM", "1190 Adventure", T, "LC8", { hp: 150 }); add("KTM", "1090 Adventure R", T, "LC8", { hp: 125, approx: true }); add("KTM", "525 EXC (2003–2007)", E, "KTM450F", { hp: 55, approx: true });
  add("KTM", "450 EXC (2003–2011)", E, "KTM450F", { hp: 50, approx: true }); add("KTM", "400 EXC (2000–2011)", E, "KTM450F", { hp: 45, approx: true }); add("KTM", "200 EXC", "Кросс-эндуро", "KTM250TPI", { hp: 36, approx: true });
  /* Husqvarna (итальянский период), Husaberg */
  add("Husqvarna", "TE 250 (2008–2013)", E, "KTM250F", A); add("Husqvarna", "TE 310", E, "KTM250F", { hp: 45, approx: true }); add("Husqvarna", "TE 450 (2008–2013)", E, "KTM450F", A); add("Husqvarna", "TE 510", E, "KTM450F", { hp: 55, approx: true });
  add("Husqvarna", "SM 610", Mo, "LC4", { hp: 52, approx: true }); add("Husqvarna", "TE 630", E, "LC4", { hp: 54, approx: true }); add("Husqvarna", "Nuda 900", Nk, "F850", { hp: 105, approx: true });
  add("Husaberg", "FE 390", E, "KTM450F", { hp: 45, approx: true }); add("Husaberg", "FE 450", E, "KTM450F", A); add("Husaberg", "FE 570", E, "KTM450F", { hp: 62, approx: true }); add("Husaberg", "TE 250", "Кросс-эндуро", "KTM300C", { hp: 45, approx: true }); add("Husaberg", "TE 300", "Кросс-эндуро", "KTM300C", A);
  /* Aprilia, Cagiva */
  add("Aprilia", "Pegaso 650", T, "ROTAX652"); add("Aprilia", "Pegaso 650 Strada", T, "ROTAX652"); add("Aprilia", "ETV 1000 Caponord", T, "V1000S", { hp: 98, approx: true }); add("Aprilia", "RXV 450", E, "V450A"); add("Aprilia", "SXV 550", Mo, "V450A", { hp: 70 });
  add("Cagiva", "Elefant 900", T, "V803D", { hp: 68, approx: true }); add("Cagiva", "Navigator 1000", T, "V1000S", { hp: 98 }); add("Cagiva", "W16 600", E, "XR650L", A);
  /* Triumph, Moto Guzzi, Ducati */
  add("Triumph", "Tiger 800 XC", T, "I3_800T"); add("Triumph", "Tiger 800 XR", T, "I3_800T"); add("Triumph", "Tiger Explorer 1200", T, "I3_1200T"); add("Triumph", "Tiger 1200 Rally Pro", T, "I3_1200T", { hp: 148 }); add("Triumph", "Scrambler 1200 XE", Nk, "T1200TR", { hp: 89 });
  add("Moto Guzzi", "V85 TT", T, "V853G"); add("Moto Guzzi", "Stelvio 1200 NTX", T, "V853G", { hp: 105, approx: true });
  add("Ducati", "Multistrada 1200", T, "V1200D"); add("Ducati", "Hypermotard 950", Mo, "DESERTX", { hp: 114 });
})();
GUIDES.push(
  { id: "winter-storage", title: "Зимнее хранение: консервация мотоцикла", area: null, time: "1–2 ч", diff: "просто", tools: ["Зарядное устройство с режимом хранения", "Чехол", "Подставки"], parts: ["oil", "battery"],
    steps: ["Помой и высуши мотоцикл, смажь цепь — зимой она ржавеет быстрее всего.", "Замени масло до хранения: старое масло с продуктами сгорания разъедает детали за зиму.", "Карбюратор: перекрой кран и выработай бензин или слей поплавковую камеру. Бак — полный, чтобы не ржавел, с присадкой-стабилизатором.", "Сними аккумулятор, храни в тепле и раз в месяц подзаряжай (или держи на зарядке с режимом хранения).", "Подними мотоцикл на подставки или подкачай шины до верхнего предела.", "Закрой выхлоп и воздухозаборник от мышей, накрой дышащим чехлом."] },
  { id: "spring-prep", title: "Подготовка к сезону после зимы", area: null, time: "1 ч", diff: "просто", tools: ["Манометр", "Ключи", "Зарядное устройство"], parts: ["chainlube", "brakefluid", "spark"],
    steps: ["Заряди и поставь аккумулятор, проверь клеммы.", "Давление в шинах, трещины на резине (старая резина дубеет).", "Цепь: смазка, натяжение, звёзды.", "Тормоза: уровень и цвет жидкости (тёмная — менять), толщина колодок.", "Уровень масла и антифриза, течи под мотоциклом.", "Свет, сигналы, ручка газа возвращается сама. Первый выезд — спокойно, прогрей тормоза и резину."] },
  { id: "suspension-clickers", title: "Настройка подвески: преднатяг, сжатие, отбой", area: null, time: "30–60 мин", diff: "средне", fig: "sag", tools: ["Рулетка", "Помощник", "Отвёртка", "Ключ преднатяга"], parts: ["shock"],
    steps: ["Сначала выставь провис (SAG) преднатягом пружины — это база (инструкция «Провис подвески»).", "Отбой (rebound) — скорость, с которой подвеска распрямляется. Мотоцикл «скачет» после кочки — закрути отбой на 2 щелчка.", "Сжатие (compression) — жёсткость на ударах. Пробивает на прыжках — добавь 2 щелчка, бьёт на мелких кочках — убери.", "Меняй один параметр за раз по 1–2 щелчка и проверяй на одном и том же участке.", "Запиши свои настройки: щелчки считаются от полностью закрученного положения.", "Если клики не помогают — пружины не под твой вес, нужна замена."] },
  { id: "battery-care", title: "Аккумулятор: проверка, зарядка, замена", area: "gen", time: "30 мин", diff: "просто", fig: "multimeter", tools: ["Мультиметр", "Зарядное устройство для мото-АКБ"], parts: ["battery", "regulator"],
    steps: ["Заглушенный мотоцикл: напряжение АКБ 12.6–12.9 В — заряжен, 12.2 В — наполовину, ниже 12 В — заряди.", "Заведи и подними обороты до 5000: должно быть 13.5–14.5 В. Меньше — проблема зарядки (статор или реле-регулятор), больше — регулятор.", "Заряжай током 1/10 ёмкости (для 7 А·ч — 0.7 А) специальным мото-зарядным.", "Ток утечки на выключенном мотоцикле больше 1 мА — ищи потребителя (сигнализация, неправильно подключённые аксессуары).", "При замене сначала снимай минус, ставь — сначала плюс. Подбирай АКБ по ёмкости, размерам и полярности."] }
);
(function () {
  var T = "Тур-эндуро", E = "Эндуро", K = "Кросс-эндуро", Nk = "Нейкед", Sp = "Спорт", A = { approx: true };
  var add = addBike;
  add("Honda", "CBR650F", Sp, "I4_650H", { hp: 87 }); add("Honda", "CB650F", Nk, "I4_650H", { hp: 87 }); add("Honda", "CB500X (2013–2018)", T, "NX500"); add("Honda", "CRF1000L Africa Twin", T, "AT1100", { hp: 95, approx: true });
  add("Honda", "NC700X", T, "XL750", { hp: 52, approx: true }); add("Honda", "NC750S", Nk, "XL750", { hp: 55, approx: true });
  add("Yamaha", "XJ6", Nk, "I4_600J", { hp: 78, approx: true }); add("Yamaha", "FZ8", Nk, "I4_1000J", { hp: 106, approx: true }); add("Yamaha", "MT-25", Nk, "T321Y", { hp: 36, approx: true }); add("Yamaha", "YZF-R25", Sp, "T321Y", { hp: 36, approx: true });
  add("Yamaha", "XSR125", Nk, "S125J"); add("Yamaha", "YZ450FX", E, "YZ450F"); add("Yamaha", "YZ250FX", E, "YZ250F");
  add("Kawasaki", "Ninja 300", Sp, "VERSYS300"); add("Kawasaki", "Z300", Nk, "VERSYS300"); add("Kawasaki", "Ninja 250R", Sp, "T400K", { hp: 32, approx: true }); add("Kawasaki", "Z800", Nk, "I4_1000K", { hp: 113, approx: true });
  add("Kawasaki", "Z900RS", Nk, "I4_1000K", { hp: 111, approx: true }); add("Kawasaki", "KLX300", E, "KLX250", { hp: 24, approx: true });
  add("Suzuki", "GSR600", Nk, "I4_600J", { hp: 98, approx: true }); add("Suzuki", "GSX-S750", Nk, "I4_750S", { hp: 114 }); add("Suzuki", "GSX-S1000", Nk, "I4_1000J", { hp: 150, approx: true }); add("Suzuki", "V-Strom 250", T, "T250S");
  add("Suzuki", "Gladius 650", Nk, "VS650", { hp: 72 });
  add("KTM", "350 SX-F", K, "KTM350F"); add("KTM", "300 XC-W", K, "KTM300TPI"); add("KTM", "250 XC-F", K, "KTM250F"); add("KTM", "500 EXC-F Six Days", E, "KTM450F", { hp: 62 }); add("KTM", "300 EXC Six Days", K, "KTM300TPI");
  add("Husqvarna", "TX 300", K, "KTM300TPI"); add("Husqvarna", "FX 350", K, "KTM350F"); add("Husqvarna", "FC 450", K, "KTM450F", { hp: 63 }); add("Husqvarna", "FE 350s", E, "KTM350F");
  add("GasGas", "MC 250F", K, "KTM250F", { hp: 47 }); add("GasGas", "MC 450F", K, "KTM450F", { hp: 63 }); add("GasGas", "EX 300", K, "KTM300TPI");
  add("Beta", "RR 300 Race Edition", K, "BETA300"); add("Beta", "RR 480 Race", E, "BETA4T", { hp: 56 });
  add("Sherco", "SE 300 Factory", K, "SHERCO300"); add("Sherco", "SEF 450 Factory", E, "SHERCO4T", { hp: 55 });
})();
/* ===================== v18: детские и 2T-кроссы, новинки 2024–2025, Benelli/QJ 750, CFMOTO 250 ===================== */
/* Honda: детские и лёгкие */
CL("CRF70", "CRF50F", { code: "XR70 / CRF70", name: "Honda XR70R / CRF70F (горизонтальный 72)", cc: 72, hp: 5, gearbox: "4 ст., сцепление автомат", carb: "Keihin PB (по мануалу)" }, 1.1);
CL("XR100", "XR125L", { code: "XR80 / XR100", name: "Honda XR80R / XR100R / CRF80F / CRF100F (вертикальный 80–100)", cc: 99, hp: 8, start: "Кик", gearbox: "5 ст.", carb: "Keihin PB (по мануалу)" }, 1.1);
CL("CRF125F", "CRF110F", { code: "JE01E", name: "Honda CRF125F / CRF125F Big Wheel (горизонтальный 125)", cc: 124, hp: 9.5, gearbox: "4 ст., ручное сцепление", groups: ["horiz", "air", "carb", "4t", "small", "jp"], carb: "Keihin (до 2018) / инжектор (2019+)" }, 1.2);
CL("XR200R", "CRF230F", { code: "ME04E", name: "Honda XR200R / XR200 (воздушный 195, RFVC)", cc: 195, hp: 17, start: "Кик", carb: "Keihin PD (по мануалу)" }, 1.2);
CL("CRF250F", "CRF230F", { code: "MD48E", name: "Honda CRF250F (воздушный 249, инжектор)", cc: 249, hp: 23, groups: ["air", "efi", "4t", "big", "jp"], carb: "Инжектор PGM-FI", start: "Электро" }, 1.4);
CL("NX400", "NX500", { code: "NC65E", name: "Honda 399 (рядная двойка 180°: NX400 / CBR400R / CB400F)", cc: 399, hp: 46 }, 1.8);
/* Yamaha */
CL("XT350", "DR350", { code: "55V", name: "Yamaha XT350 (воздушный DOHC, 4 клапана)", maker: "Yamaha", cc: 346, hp: 30, cam: "DOHC, 4 клапана", groups: ["dohc", "air", "carb", "4t", "big", "jp"], carb: "Mikuni ×2 (двухкамерный)" }, 1.4);
CL("XT500", "XT600", { code: "1E6 / 583", name: "Yamaha XT500 / TT500 (воздушный, 2 клапана)", cc: 499, hp: 30, cam: "SOHC, 2 клапана", start: "Кик (с декомпрессором)", gearbox: "5 ст.", carb: "Mikuni VM34", oilVol: "≈ 2.5 л (сухой картер, масло в раме)" }, 1.4);
CL("DT125", "JP2T125", { code: "DT125R / TS125R", name: "Японский эндуро 2T 125 (Yamaha DT125R/RE/X, Suzuki TS125R, Kawasaki KDX125)", maker: "Yamaha / Suzuki / Kawasaki", hp: 22, start: "Кик", fuel: "АИ-95 + 2T масло (раздельная смазка у DT)", carb: "Mikuni TM28 / VM26 (по модели)" }, 1.2);
CL("DT200", "JP2T250", { code: "DT200R / WR200", name: "Yamaha DT200R / WR200R (2T 195, YPVS)", maker: "Yamaha", cc: 195, hp: 32, start: "Кик", carb: "Mikuni TM28SS" }, 1.3);
CL("JP2T65", "YZ85", { code: "JP 65 2T", name: "Японский детский кроссовый 2T 65 (KX65 / YZ65 / RM65)", maker: "Kawasaki / Yamaha / Suzuki", cc: 64, hp: 15 }, 1.0);
CL("JP125A", "XR125L", { code: "JP 125 air", name: "Японский 125 воздушный (XTZ125 / DR125SM / KLX125 / CB125F)", maker: "Yamaha / Suzuki / Kawasaki / Honda", hp: 11 }, 1.0);
/* Kawasaki, Suzuki */
CL("KLX300E", "KLX250", { code: "LX300A", name: "Kawasaki KLX300 / KLX300R / KLX300SM (292, DOHC)", cc: 292, hp: 29, groups: ["dohc", "liquid", "efi", "4t", "big", "jp"], carb: "Инжектор (KLX300R — Keihin FCR)" }, 1.3);
CL("DRZ4", "DRZ400", { code: "DR-Z4", name: "Suzuki DR-Z4S / DR-Z4SM (2025+, инжектор, ride-by-wire)", hp: 38, groups: ["dohc", "liquid", "efi", "4t", "big", "jp"], carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—", start: "Электро" }, 1.5);
/* Европа: 2T-кросс и детские */
CL("KTM50", "KTM65", { code: "50 SX", name: "KTM 50 SX / Husqvarna TC 50 / GasGas MC 50 (2T, автомат-сцепление)", cc: 49, hp: 9, gearbox: "1 ст., автоматическое сцепление" }, 0.9);
CL("KTM125", "KTM85", { code: "125 SX", name: "KTM 125 SX/EXC / Husqvarna TC/TE 125 / GasGas MC 125 (2T)", cc: 125, hp: 37, groups: ["2t", "liquid", "carb", "small", "eu"], carb: "Keihin PWK38 / Mikuni TMX (2023+ — впрыск TBI)" }, 1.4);
CL("KTM250SX", "KTM300C", { code: "250 SX", name: "KTM 250 SX / Husqvarna TC 250 / GasGas MC 250 (2T, кросс)", cc: 249, hp: 48, gearbox: "5 ст., кроссовый ряд", carb: "Keihin PWK36 / Mikuni TMX38 (2023+ — впрыск TBI)" }, 1.8);
CL("G450X", "KTM450F", { code: "BMW G450X", name: "BMW G 450 X / Husqvarna TE 449 / TE 511 (BMW-эпоха)", maker: "BMW (сборка Kymco)", cc: 449, hp: 52, groups: ["dohc", "liquid", "efi", "4t", "big", "eu"], cam: "DOHC, 4 клапана",
  issues: [{ t: "Редкий мотор: запчасти ЦПГ и ГРМ — под заказ", sev: "med", fix: "Регламент по моточасам, заранее найди поставщика." }] }, 2.2);
CL("KTM399", "KTM390", { code: "LC4c 399", name: "KTM / Husqvarna 399 (390 Duke / 390 Adventure / 390 Enduro R / 390 SMC R, 2024+)", cc: 399, hp: 45 }, 1.3);
CL("S250KT", "KTM390", { code: "LC4c 250", name: "KTM / Bajaj 248 (250 Duke / 250 Adventure / Dominar 250)", cc: 249, hp: 30 }, 1.1);
/* Индия */
CL("HIM440", "HIM411", { code: "Scram 440", name: "Royal Enfield 443 (Scram 440)", cc: 443, hp: 25.4 }, 1.2);
CL("S250BJ", "S180BJ", { code: "Bajaj 250 FI", name: "Bajaj Pulsar N250 / F250 (маслоохлаждаемый 249)", cc: 249, hp: 24.5, cam: "SOHC, 2 клапана", groups: ["air", "efi", "4t", "big", "in"], cooling: "Воздушно-масляное", carb: "Инжектор" }, 0.9);
/* Китай */
RE("S250C", { region: "cn", code: "CF 249", name: "CFMOTO 249 (250NK / 250SR), аналог у Benelli TRK 251", maker: "CFMOTO", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 4 клапана", cc: 249, hp: 27, torque: "≈ 22 Н·м", compression: "≈ 11.3 бар", oilVol: "≈ 1.6 л" }, 1.0);
RE("T750BN", { region: "cn", code: "QJ 754", name: "Benelli / QJMotor 754 (рядная двойка 270°: TRK 800 / Leoncino 800 / 752S / SRT 800)", maker: "QJMotor / Benelli", layout: "twin", crankPhase: 270, groups: ["dohc", "liquid", "efi", "4t", "big", "balancer"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 754, hp: 76, torque: "≈ 67 Н·м", compression: "≈ 11.5 бар", oilVol: "≈ 3.5 л" }, 1.6);
RE("S374BN", { region: "cn", code: "Benelli 374", name: "Benelli Imperiale 400 (воздушный 374)", maker: "Benelli", groups: ["air", "efi", "4t", "big"], cooling: "Воздушное", cam: "SOHC, 2 клапана", cc: 374, hp: 21, torque: "≈ 29 Н·м", compression: "≈ 9.5 бар", gearbox: "5 ст.", oilVol: "≈ 2 л", oilInt: 5000, valveInt: 10000 }, 1.0);
CL("Z312", "S350Z", { code: "Zontes 312", name: "Zontes 312 (ZT310 R / T / X / V)", cc: 312, hp: 35 }, 1.1);
(function () {
  var E = "Эндуро", K = "Кросс-эндуро", T = "Тур-эндуро", L = "Лёгкий эндуро", Mo = "Мотард", Nk = "Нейкед", Sp = "Спорт", Ch = "Чоппер", P2 = "Питбайк", A = { approx: true };
  var add = addBike;
  /* уточнение моторов у уже добавленных моделей */
  function remap(brand, name, eng, extra) {
    BIKES.forEach(function (b) { if (b.brand !== brand || b.name !== name) return; var e = ENGINES[eng];
      b.versions = [Object.assign({ engine: eng, label: e.code + ", " + e.cc + " см³" }, extra || {})]; });
  }
  remap("Husqvarna", "TC 125", "KTM125"); remap("Kawasaki", "KLX300", "KLX300E"); remap("Kawasaki", "KLX300SM", "KLX300E");
  /* Honda */
  add("Honda", "XR70R", P2, "CRF70"); add("Honda", "CRF70F", P2, "CRF70"); add("Honda", "XR50R", P2, "CRF50F"); add("Honda", "XR80R", P2, "XR100", { hp: 6, approx: true }); add("Honda", "CRF80F", P2, "XR100", { hp: 6, approx: true });
  add("Honda", "XR100R", P2, "XR100"); add("Honda", "CRF100F", P2, "XR100"); add("Honda", "CRF125F", P2, "CRF125F"); add("Honda", "CRF125F Big Wheel", P2, "CRF125F");
  add("Honda", "XR200R", E, "XR200R"); add("Honda", "CRF250F", E, "CRF250F"); add("Honda", "XR250 Tornado", L, "XR250", { hp: 23, approx: true }); add("Honda", "XL250 Degree", L, "XR250", { hp: 28, approx: true });
  add("Honda", "NX400", T, "NX400"); add("Honda", "CBR400R", Sp, "NX400"); add("Honda", "CB400F", Nk, "NX400"); add("Honda", "CL500", Nk, "NX500", { hp: 46 });
  add("Honda", "CB125F", Nk, "JP125A", { hp: 11 }); add("Honda", "CB125R", Nk, "S125J");
  /* Yamaha */
  add("Yamaha", "TT-R225", E, "TTR230", { hp: 19 }); add("Yamaha", "TT600", E, "XT600", { hp: 40, approx: true }); add("Yamaha", "XT350", E, "XT350"); add("Yamaha", "XT500", T, "XT500"); add("Yamaha", "TT500", E, "XT500", { hp: 32 });
  add("Yamaha", "XTZ125", L, "JP125A", { hp: 10 }); add("Yamaha", "XTZ250 Lander", L, "XT250", { hp: 21 }); add("Yamaha", "XG250 Tricker", L, "XT250", { hp: 19, approx: true });
  add("Yamaha", "DT125R", K, "DT125"); add("Yamaha", "DT125RE", K, "DT125", { hp: 15 }); add("Yamaha", "DT125X", Mo, "DT125", { hp: 15 }); add("Yamaha", "DT200R", K, "DT200"); add("Yamaha", "WR200R", K, "DT200", { hp: 33 });
  add("Yamaha", "YZ65", K, "JP2T65"); add("Yamaha", "YZ80", K, "YZ85", { hp: 20, approx: true }); add("Yamaha", "Ténéré 700 Extreme", T, "T700"); add("Yamaha", "Ténéré 700 Rally Edition", T, "T700");
  /* Kawasaki */
  add("Kawasaki", "KLX230S", L, "KLX230"); add("Kawasaki", "KLX230SM", Mo, "KLX230"); add("Kawasaki", "KLX230R", E, "KLX230", { hp: 18, approx: true }); add("Kawasaki", "KLX300R", E, "KLX300E", { hp: 31 });
  add("Kawasaki", "KLX400SR", E, "DRZ400"); add("Kawasaki", "KLX150L", P2, "KLX140", { hp: 12 }); add("Kawasaki", "KLX150S", L, "KLX140", { hp: 12 }); add("Kawasaki", "KLX125", L, "JP125A", { hp: 10 });
  add("Kawasaki", "D-Tracker 125", Mo, "JP125A", { hp: 10 }); add("Kawasaki", "KLR250", E, "KLX250", { hp: 25, approx: true }); add("Kawasaki", "KDX125", K, "DT125", { hp: 23, approx: true });
  add("Kawasaki", "KX65", K, "JP2T65"); add("Kawasaki", "Eliminator 500", Ch, "T400K", { hp: 45, approx: true }); add("Kawasaki", "Z500", Nk, "T400K", { hp: 45, approx: true });
  /* Suzuki */
  add("Suzuki", "DR-Z4S", E, "DRZ4"); add("Suzuki", "DR-Z4SM", Mo, "DRZ4"); add("Suzuki", "DR-Z110", P2, "KLX110"); add("Suzuki", "DR125SM", Mo, "JP125A", { hp: 11 });
  add("Suzuki", "TS125R", K, "DT125", { hp: 22, approx: true }); add("Suzuki", "RMX250", K, "JP2T250", { hp: 40, approx: true }); add("Suzuki", "RM85", K, "YZ85"); add("Suzuki", "RM65", K, "JP2T65");
  add("Suzuki", "JR50", P2, "PW50", A); add("Suzuki", "V-Strom 800RE", T, "T800S");
  /* KTM */
  add("KTM", "50 SX", K, "KTM50"); add("KTM", "125 SX", K, "KTM125"); add("KTM", "125 EXC", K, "KTM125", { hp: 32 }); add("KTM", "250 SX", K, "KTM250SX");
  add("KTM", "Freeride 250 F", E, "KTM250F", { hp: 24, approx: true }); add("KTM", "Freeride 250 R", K, "KTM250TPI", { hp: 30, approx: true }); add("KTM", "Freeride 350", E, "KTM350F", { hp: 24, approx: true });
  add("KTM", "520 EXC", E, "KTM450F", { hp: 52, approx: true }); add("KTM", "390 Adventure (2025)", T, "KTM399"); add("KTM", "390 Adventure R", T, "KTM399"); add("KTM", "390 Enduro R", E, "KTM399");
  add("KTM", "390 SMC R", Mo, "KTM399"); add("KTM", "250 Duke", Nk, "S250KT"); add("KTM", "250 Adventure", T, "S250KT");
  /* Husqvarna, GasGas */
  add("Husqvarna", "TC 50", K, "KTM50"); add("Husqvarna", "TE 125", K, "KTM125", { hp: 32 }); add("Husqvarna", "TC 250", K, "KTM250SX"); add("Husqvarna", "FC 250", K, "KTM250F", { hp: 47 }); add("Husqvarna", "FC 350", K, "KTM350F", { hp: 57 });
  add("Husqvarna", "TE 449", E, "G450X"); add("Husqvarna", "TE 511", E, "G450X", { hp: 55, approx: true }); add("Husqvarna", "Svartpilen 401 (2024+)", Nk, "KTM399"); add("Husqvarna", "Vitpilen 401 (2024+)", Nk, "KTM399");
  add("GasGas", "MC 50", K, "KTM50"); add("GasGas", "MC 125", K, "KTM125"); add("GasGas", "MC 250", K, "KTM250SX"); add("GasGas", "MC 350F", K, "KTM350F", { hp: 57 });
  add("GasGas", "EX 250F", E, "KTM250F"); add("GasGas", "EX 350F", E, "KTM350F"); add("GasGas", "EX 450F", E, "KTM450F", { hp: 63 }); add("GasGas", "SM 700", Mo, "LC4");
  add("GasGas", "EC 250 (2000–2020, карбюратор)", K, "2T250", A); add("GasGas", "EC 300 (2000–2020, карбюратор)", K, "2T300", A);
  /* BMW, Beta, Fantic, Aprilia, Triumph */
  add("BMW", "G 450 X", E, "G450X"); add("BMW", "G 650 Xmoto", Mo, "ROTAX652", { hp: 53 }); add("BMW", "F 700 GS", T, "F850", { hp: 75, approx: true }); add("BMW", "F 750 GS", T, "F850", { hp: 77 }); add("BMW", "F 800 R", Nk, "F850", { hp: 87, approx: true });
  add("Beta", "Alp 4.0", L, "DR350", { hp: 26, approx: true }); add("Beta", "Alp 200", L, "DR200", { hp: 15, approx: true });
  add("Fantic", "Caballero 500 Scrambler", Nk, "NC450", { hp: 40 }); add("Fantic", "Caballero 500 Rally", E, "NC450", { hp: 40 }); add("Fantic", "Caballero 125", L, "M125");
  add("Aprilia", "RX 125", E, "M125", A); add("Aprilia", "SX 125", Mo, "M125", A); add("Aprilia", "RX 50", E, "AM6", A); add("Aprilia", "SX 50", Mo, "AM6", A);
  add("Triumph", "Tiger 900 GT Pro", T, "I3_900T"); add("Triumph", "Tiger 850 Sport", T, "I3_900T", { hp: 85 }); add("Triumph", "Tiger 1200 GT Pro", T, "I3_1200T", { hp: 148 });
  add("Triumph", "Scrambler 400 XC", L, "S400T"); add("Triumph", "Thruxton 400", Sp, "S400T", { hp: 42 });
  /* Индия */
  add("Royal Enfield", "Guerrilla 450", Nk, "HIM450"); add("Royal Enfield", "Scram 440", L, "HIM440"); add("Royal Enfield", "Bear 650", Nk, "T650RE"); add("Royal Enfield", "Classic 650", Ch, "T650RE");
  add("Royal Enfield", "Goan Classic 350", Ch, "S350RE");
  add("Bajaj", "Dominar 250", T, "S250KT", { hp: 27 }); add("Bajaj", "Pulsar N250", Nk, "S250BJ"); add("Bajaj", "Pulsar F250", Sp, "S250BJ");
  add("TVS", "Apache RTR 310", Nk, "G310", { hp: 35.6 }); add("Hero", "XPulse 200T", L, "XP200"); add("Hero", "XPulse 200 4V Pro", L, "XP200");
  /* Китай */
  add("CFMOTO", "250NK", Nk, "S250C"); add("CFMOTO", "250SR", Sp, "S250C");
  add("Benelli", "TRK 702", T, "T750BN", { hp: 70, approx: true }); add("Benelli", "TRK 702X", T, "T750BN", { hp: 70, approx: true }); add("Benelli", "TRK 800", T, "T750BN"); add("Benelli", "Leoncino 800", Nk, "T750BN");
  add("Benelli", "Leoncino 800 Trail", Nk, "T750BN"); add("Benelli", "752S", Nk, "T750BN"); add("Benelli", "Imperiale 400", Ch, "S374BN"); add("Benelli", "TRK 251", T, "S250C", { hp: 25, approx: true });
  add("Benelli", "Leoncino 250", Nk, "S250C", { hp: 25, approx: true }); add("Benelli", "BN 251", Nk, "S250C", { hp: 25, approx: true });
  add("QJMotor", "SRT 800", T, "T750BN"); add("QJMotor", "SRT 800X", T, "T750BN"); add("QJMotor", "SRK 800", Nk, "T750BN");
  add("Voge", "300DS", T, "VOGE300"); add("Voge", "300R", Nk, "VOGE300"); add("Voge", "500DS", T, "VOGE525", { hp: 47 }); add("Voge", "900DSX", T, "F850", { hp: 95, approx: true });
  add("Zontes", "ZT310-T", T, "Z312"); add("Zontes", "ZT310-X", Nk, "Z312"); add("Zontes", "ZT310-R", Nk, "Z312"); add("Zontes", "ZT310-V", Ch, "Z312");
  /* «Любая модель» — новые моторы */
  add("Любая модель", "с мотором KTM 125 2T", K, "KTM125"); add("Любая модель", "с мотором KTM 250 2T (кросс)", K, "KTM250SX"); add("Любая модель", "с мотором CFMOTO 249", Nk, "S250C");
  add("Любая модель", "с мотором QJ 754 (Benelli / QJMotor)", T, "T750BN");
})();
/* ===================== v19: поколения — одна модель, версии по годам ===================== */
/* Старый ключ «Марка Модель» → [новый ключ, номер версии]. По нему js/app.js один раз
   переносит сохранённый выбор, гараж, настройки и журнал ТО у тех, кто выбирал старые записи. */
var BIKE_ALIASES = {};
/* gens: [[старое название, годы], ...] по порядку лет; same: { "старое название": номер поколения } — дубли без своих данных */
function mergeGenerations(brand, name, gens, same) {
  var all = gens.map(function (g) { return g[0]; }).concat(Object.keys(same || {}));
  var at = BIKES.length, type = null, versions = [];
  all.forEach(function (n) {
    var i = BIKES.findIndex(function (b) { return b.brand === brand && b.name === n; });
    if (i < 0) throw new Error("mergeGenerations: нет модели " + brand + " " + n);
    if (BIKES[i].versions.length !== 1) throw new Error("mergeGenerations: у " + brand + " " + n + " несколько версий");
    at = Math.min(at, i);
  });
  gens.forEach(function (g, vi) {
    var b = BIKES.find(function (x) { return x.brand === brand && x.name === g[0]; }), e = ENGINES[b.versions[0].engine];
    versions.push(Object.assign({}, b.versions[0], { years: g[1], label: g[1] + " · " + e.code + ", " + e.cc + " см³" }));
    BIKE_ALIASES[brand + " " + g[0]] = [brand + " " + name, vi];
    type = b.type;
  });
  Object.keys(same || {}).forEach(function (n) { BIKE_ALIASES[brand + " " + n] = [brand + " " + name, same[n]]; });
  var merged = { brand: brand, name: name, type: type, versions: versions };
  var rest = BIKES.filter(function (b) { return b.brand !== brand || all.indexOf(b.name) < 0; });
  all.forEach(function (n) { delete BIKE_KEYS[brand + "|" + n]; });
  BIKES.length = 0;
  rest.forEach(function (b, i) { if (i === at) BIKES.push(merged); BIKES.push(b); });
  if (at >= rest.length) BIKES.push(merged);
  BIKE_KEYS[brand + "|" + name] = true;
}
mergeGenerations("Honda", "CRF450R", [["CRF450R 2002–2008", "2002–2008"], ["CRF450R 2009–2016", "2009–2016"], ["CRF450R 2017–2020", "2017–2020"], ["CRF450R 2021–2026", "2021–2026"]], { "CRF450R": 2 });
mergeGenerations("Honda", "CRF250R", [["CRF250R 2004–2009", "2004–2009"], ["CRF250R 2010–2017", "2010–2017"], ["CRF250R 2018–2026", "2018–2026"]], { "CRF250R": 2 });
mergeGenerations("Honda", "CRF250X", [["CRF250X 2004–2017", "2004–2017"]]);
mergeGenerations("Honda", "CRF450X", [["CRF450X 2005–2017", "2005–2017"]]);
mergeGenerations("Honda", "XR250R", [["XR250R 1996–2004", "1996–2004"]], { "XR250R": 0 });
mergeGenerations("Honda", "XR400R", [["XR400R 1996–2004", "1996–2004"]], { "XR400R": 0 });
mergeGenerations("Honda", "XR150L", [["XR150L", "до 2022"], ["XR150L (2023+)", "2023+"]]);
mergeGenerations("Honda", "CB500X", [["CB500X (2013–2018)", "2013–2018"], ["CB500X", "2019–2023"]]);
mergeGenerations("Husqvarna", "TE 250", [["TE 250 (2008–2013)", "2008–2013, 4T"], ["TE 250", "2014+, 2T"]]);
mergeGenerations("Husqvarna", "TE 450", [["TE 450 (2008–2013)", "2008–2013"]]);
mergeGenerations("Husqvarna", "Svartpilen 401", [["Svartpilen 401", "2018–2023"], ["Svartpilen 401 (2024+)", "2024+"]]);
mergeGenerations("Husqvarna", "Vitpilen 401", [["Vitpilen 401", "2018–2023"], ["Vitpilen 401 (2024+)", "2024+"]]);
mergeGenerations("Kawasaki", "KX250F", [["KX250F 2004–2010", "2004–2010"], ["KX250F 2011–2020", "2011–2020"]]);
mergeGenerations("Kawasaki", "KX450F", [["KX450F 2006–2008", "2006–2008"], ["KX450F 2009–2018", "2009–2018"]]);
mergeGenerations("Kawasaki", "KLX450R", [["KLX450R 2008–2026", "2008–2026"]], { "KLX450R": 0 });
mergeGenerations("KTM", "525 EXC", [["525 EXC (2003–2007)", "2003–2007"]]);
mergeGenerations("KTM", "450 EXC", [["450 EXC (2003–2011)", "2003–2011"]]);
mergeGenerations("KTM", "400 EXC", [["400 EXC (2000–2011)", "2000–2011"]]);
mergeGenerations("KTM", "390 Adventure", [["390 Adventure", "2020–2024"], ["390 Adventure (2025)", "2025+"]]);
mergeGenerations("Suzuki", "RM-Z250", [["RM-Z250 2004–2009", "2004–2009"], ["RM-Z250 2010–2026", "2010–2026"]], { "RM-Z250": 1 });
mergeGenerations("Suzuki", "RM-Z450", [["RM-Z450 2005–2007", "2005–2007"], ["RM-Z450 2008–2026", "2008–2026"]], { "RM-Z450": 1 });
mergeGenerations("Suzuki", "DR-Z400E", [["DR-Z400E 2000–2007", "2000–2007"]], { "DR-Z400E": 0 });
mergeGenerations("Yamaha", "WR250R", [["WR250R", "2008–2020"]], { "WR250R 2012": 0 });
mergeGenerations("Yamaha", "YZ250F", [["YZ250F 2001–2013", "2001–2013"], ["YZ250F 2014–2026", "2014–2026"]], { "YZ250F": 1 });
mergeGenerations("Yamaha", "WR250F", [["WR250F 2001–2014", "2001–2014"], ["WR250F 2015–2026", "2015–2026"]], { "WR250F": 1 });
mergeGenerations("Yamaha", "YZ450F", [["YZ450F 2003–2009", "2003–2009"], ["YZ450F 2010–2026", "2010–2026"]], { "YZ450F": 1 });
mergeGenerations("Yamaha", "WR450F", [["WR450F 2003–2015", "2003–2015"], ["WR450F 2016–2026", "2016–2026"]], { "WR450F": 1 });
mergeGenerations("GasGas", "EC 250", [["EC 250 (2000–2020, карбюратор)", "до 2020, карбюратор"], ["EC 250", "TPI"]]);
mergeGenerations("GasGas", "EC 300", [["EC 300 (2000–2020, карбюратор)", "до 2020, карбюратор"], ["EC 300", "TPI"]]);
/* ===================== v20: точные моторы вместо «≈» с неверным объёмом ===================== */
CL("JP250F", "YZ250F", { code: "JP 250 4T FI", name: "Японский кроссовый 250 4T, инжектор (KX250F 2011+ / KX250 / RM-Z250 2010+)", maker: "Kawasaki / Suzuki", cc: 249, hp: 41 }, 1.8);
CL("RFS450", "KTM450F", { code: "KTM RFS 450", name: "KTM RFS 400/450/525 (EXC/SX 2000–2007, карбюратор)", groups: ["liquid", "carb", "4t", "big", "eu"], carb: "Keihin FCR-MX39", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", start: "Электро + кик", hp: 50 }, 2.0);
CL("RFS400", "RFS450", { code: "KTM RFS 400", cc: 398, hp: 45 }, 2.0);
CL("RFS525", "RFS450", { code: "KTM RFS 525", cc: 510, hp: 55 }, 2.0);
CL("KTM200", "KTM300C", { code: "200 EXC", name: "KTM 200 EXC / XC-W (2T 193)", cc: 193, hp: 36, carb: "Keihin PWK36" }, 1.6);
CL("KTM150", "KTM125", { code: "150 SX", name: "KTM 150 SX/XC-W / Husqvarna TE 150 (2T 144)", cc: 144, hp: 40 }, 1.5);
CL("BETA125", "BETA300", { code: "Beta 125 2T", name: "Beta RR 125 2T (2T 124)", cc: 124, hp: 30, groups: ["2t", "liquid", "carb", "small", "eu"] }, 1.4);
CL("BETA250", "BETA300", { code: "Beta 250 2T", name: "Beta RR 250 2T / Xtrainer 250 (2T 249)", cc: 249, hp: 43 }, 1.7);
CL("TR200", "TR2T", { code: "Trial 2T 200", name: "Триальный 2T 200 (Beta Evo 200)", cc: 199, hp: 17 }, 1.4);
CL("XR80", "XR100", { code: "XR80 / CRF80", name: "Honda XR80R / CRF80F (вертикальный 80)", cc: 80, hp: 6 }, 1.0);
CL("KX112", "YZ85", { code: "KX112", name: "Kawasaki KX112 / KX100 (2T 99–112)", maker: "Kawasaki", cc: 112, hp: 26 }, 1.1);
CL("F800", "F850", { code: "BMW F800", name: "BMW F 800 (рядная двойка 798, Rotax: F 650/700/800 GS, F 800 R)", cc: 798, hp: 85, cam: "DOHC, 8 клапанов, 2 цилиндра (360°)" }, 2.2);
CL("F900", "F850", { code: "BMW F900", name: "BMW F 900 (рядная двойка 895: F 900 GS / F 900 R / Voge 900DSX)", cc: 895, hp: 105 }, 2.3);
CL("R1170", "R1250", { code: "BMW Boxer 1170", name: "BMW оппозит 1170 (R 1200 GS / R nineT)", cc: 1170, hp: 110, cooling: "Воздушно-масляное (с 2013 — воздушно-жидкостное)", cam: "DOHC, 8 клапанов" }, 2.4);
CL("LC8_990", "LC8", { code: "LC8 990", name: "KTM LC8 950/990 (V-twin 75°: 950/990 Adventure)", cc: 999, hp: 106, carb: "Keihin ×2 (950) / инжектор (990)" }, 2.6);
CL("HNC750", "XL750", { code: "RC70E/RC88E", name: "Honda NC700/NC750 (рядная двойка 270°, наклон 55°: NC750X / NC750S / Integra)", cc: 745, hp: 55, cam: "SOHC, 8 клапанов" }, 1.8);
CL("HNC700", "HNC750", { code: "RC61E", cc: 670, hp: 52 }, 1.8);
CL("I4_900K", "I4_1000K", { code: "Kawasaki 948", name: "Kawasaki 948 (рядная четвёрка: Z900 / Z900RS)", cc: 948, hp: 125 }, 2.1);
CL("T250K", "T400K", { code: "Ninja 250", name: "Kawasaki 249 (рядная двойка 180°: Ninja 250R / Z250)", cc: 249, hp: 32 }, 1.4);
CL("T250Y", "T321Y", { code: "R25 249", name: "Yamaha 249 (рядная двойка 180°: YZF-R25 / MT-25)", cc: 249, hp: 36 }, 1.4);
CL("T700BN", "T750BN", { code: "QJ 698", name: "Benelli / QJMotor 698 (рядная двойка 270°: TRK 702 / 702X)", cc: 698, hp: 70 }, 1.6);
CL("S250QJ", "S250C", { code: "QJ 249", name: "Benelli / QJMotor 249 (TRK 251 / BN 251 / Leoncino 250)", maker: "QJMotor / Benelli", cc: 249, hp: 25 }, 1.0);
CL("S160BJ", "S200BJ", { code: "Bajaj NS160", name: "Bajaj Pulsar NS160 / NS125 (маслоохлаждаемый, 4 клапана)", cooling: "Воздушно-масляное", groups: ["air", "efi", "4t", "small", "in"], carb: "Инжектор", cc: 160, hp: 17 }, 0.8);
CL("XP210", "XP200", { code: "Hero 210", name: "Hero XPulse 210 (жидкостный 210)", cooling: "Жидкостное", groups: ["dohc", "liquid", "efi", "4t", "big", "in"], cam: "DOHC, 4 клапана", cc: 210, hp: 24.6 }, 1.0);
setEngine("Kawasaki", "KX250", 0, "JP250F", { hp: 43 }); setEngine("Kawasaki", "KX250F", 1, "JP250F"); setEngine("Suzuki", "RM-Z250", 1, "JP250F", { hp: 40 });
setEngine("KTM", "450 EXC", 0, "RFS450"); setEngine("KTM", "400 EXC", 0, "RFS400"); setEngine("KTM", "525 EXC", 0, "RFS525"); setEngine("KTM", "520 EXC", 0, "RFS525", { hp: 52 });
setEngine("KTM", "200 EXC", 0, "KTM200"); setEngine("Beta", "RR 125 2T", 0, "BETA125"); setEngine("Beta", "RR 250 2T", 0, "BETA250"); setEngine("Beta", "Xtrainer 250", 0, "BETA250", { hp: 38 });
setEngine("Beta", "EVO 200 2T", 0, "TR200"); setEngine("Honda", "XR80R", 0, "XR80"); setEngine("Honda", "CRF80F", 0, "XR80");
setEngine("BMW", "F 650 GS (двухцилиндровый)", 0, "F800", { hp: 71 }); setEngine("BMW", "F 700 GS", 0, "F800", { hp: 75 }); setEngine("BMW", "F 800 GS", 0, "F800");
setEngine("BMW", "F 800 GS Adventure", 0, "F800"); setEngine("BMW", "F 800 R", 0, "F800", { hp: 87 });
setEngine("BMW", "F 900 GS", 0, "F900"); setEngine("BMW", "F 900 R", 0, "F900"); setEngine("Voge", "900DSX", 0, "F900", { hp: 95 });
setEngine("BMW", "R 1200 GS", 0, "R1170", { hp: 110, approx: true }); setEngine("BMW", "R 1200 GS Adventure", 0, "R1170", { hp: 110, approx: true }); setEngine("BMW", "R nineT", 0, "R1170");
setEngine("KTM", "990 Adventure", 0, "LC8_990"); setEngine("KTM", "950 Adventure", 0, "LC8_990", { hp: 98, approx: true });
setEngine("Honda", "NC750X", 0, "HNC750", { hp: 58 }); setEngine("Honda", "NC750S", 0, "HNC750"); setEngine("Honda", "NC700X", 0, "HNC700");
setEngine("Kawasaki", "Z900", 0, "I4_900K"); setEngine("Kawasaki", "Z900RS", 0, "I4_900K", { hp: 111 });
setEngine("Kawasaki", "Ninja 250R", 0, "T250K"); setEngine("Yamaha", "MT-25", 0, "T250Y"); setEngine("Yamaha", "YZF-R25", 0, "T250Y");
setEngine("Yamaha", "XT600E", 0, "XT600"); setEngine("Honda", "Steed 600", 0, "V600H", { hp: 40 });
setEngine("Benelli", "TRK 702", 0, "T700BN"); setEngine("Benelli", "TRK 702X", 0, "T700BN");
setEngine("Benelli", "TRK 251", 0, "S250QJ"); setEngine("Benelli", "BN 251", 0, "S250QJ"); setEngine("Benelli", "Leoncino 250", 0, "S250QJ");
addBike("KTM", "150 SX", "Кросс-эндуро", "KTM150"); addBike("KTM", "150 XC-W", "Кросс-эндуро", "KTM150", { hp: 35 }); addBike("Husqvarna", "TE 150", "Кросс-эндуро", "KTM150", { hp: 35 });
addBike("Kawasaki", "KX112", "Кросс-эндуро", "KX112"); addBike("Kawasaki", "KX100", "Кросс-эндуро", "KX112", { hp: 22, approx: true });
addBike("Bajaj", "Pulsar NS160", "Нейкед", "S160BJ"); addBike("Bajaj", "Pulsar NS125", "Нейкед", "S160BJ", { hp: 12, approx: true });
addBike("Hero", "XPulse 210", "Лёгкий эндуро", "XP210");
/* ===================== v21: китайские эндуро 2024–2025 (проверено по карточкам дилеров и объявлениям) ===================== */
(function () {
  var E = "Эндуро", A = { approx: true };
  /* YBS300 (Loncin LX176MN): moto-life.shop, x-m.su, drom.ru, motolifeshop.ru */
  addBike("Kews", "K23 YBS300", E, "YBS300", { hp: 28 }); addBike("Kews", "K23 YBS300 PRO", E, "YBS300G2"); addBike("Kews", "K16 YBS300", E, "YBS300");
  addBike("Zuumav", "K9 YBS300", E, "YBS300"); addBike("JHL", "LX6 YBS300", E, "YBS300"); addBike("Fidelis", "ESH YBS300", E, "YBS300");
  /* Kayo K6 EFI 250 (2025): arawheels.com — инжекторная версия K6 на NC250 */
  addBike("Kayo", "K6 EFI 250", E, "NC250E");
  /* Avantis A6 Lux 300: объявления drom.ru — мотор 174MN-3, жидкостное охлаждение */
  addBike("Avantis", "A6 Lux 300", E, "NB300");
  /* Motoland XR 300 Lite (2025): av.by — мотор 175FMM */
  addBike("Motoland", "XR 300 Lite", E, "175FMM");
  /* Progasi Flex 250: 21vek.by — 249.4 см³, 25 л.с., карбюратор, воздушно-масляное охлаждение */
  addBike("Progasi", "Flex 250", E, "172FMM-5", { hp: 25, approx: true });
  /* Besuda 008 NB300: объявления drom.ru */
  addBike("Besuda", "008 NB300", E, "NB300");
})();
/* ===================== v22: ещё модели — Азия 155, KTM/Husqvarna, классика СССР и Jawa, китайские на NC300 ===================== */
CL("Y155", "S125J", { code: "Y155 VVA", name: "Yamaha 155 VVA (WR155R / MT-15 / YZF-R15 / XSR155)", maker: "Yamaha", cc: 155, hp: 18.4, cam: "SOHC, 4 клапана, VVA" }, 1.0);
CL("JAWA350", "IZHJ5", { code: "Jawa 634/638", name: "Jawa 350 (2T, двухцилиндровый: 634 / 638)", maker: "Jawa", cc: 344, hp: 26, groups: ["2t", "air", "carb", "big", "eu"] }, 1.0);
CL("IZHPS", "IZHP5", { code: "ИЖ П-С", name: "ИЖ Планета Спорт (2T 340)", cc: 340, hp: 32 }, 1.0);
CL("DNEPR", "URAL", { code: "МТ-10/11", name: "Днепр МТ (оппозит 650)", maker: "КМЗ (Киев)", cc: 649, hp: 36 }, 1.0);
CL("BETA200", "BETA250", { code: "Beta 200 2T", name: "Beta RR 200 2T (2T 190)", cc: 190, hp: 30 }, 1.5);
CL("ANIMA190", "Z190", { code: "Anima 190", name: "Daytona Anima 190 (4 клапана, питбайк)", maker: "Daytona / YCF", cc: 190, hp: 19, cam: "SOHC, 4 клапана" }, 1.3);
(function () {
  var E = "Эндуро", K = "Кросс-эндуро", T = "Тур-эндуро", L = "Лёгкий эндуро", P2 = "Питбайк", Nk = "Нейкед", Sp = "Спорт", C = "Классика", A = { approx: true };
  /* Азия: 150–190 */
  addBike("Yamaha", "WR155R", L, "Y155", { hp: 16.5 }); addBike("Yamaha", "MT-15", Nk, "Y155"); addBike("Yamaha", "YZF-R15", Sp, "Y155"); addBike("Yamaha", "XSR155", Nk, "Y155");
  addBike("Honda", "CRF150L", L, "XR150L", { hp: 12.9 }); addBike("Honda", "CRF190L", L, "XR190");
  addVersion("Honda", "CRF450X", "CRF450", "2019+", { hp: 50, approx: true });
  /* Kawasaki, Suzuki */
  addBike("Kawasaki", "KX250X", K, "JP250F"); addBike("Kawasaki", "KLR650 S", T, "KLR650"); addBike("Kawasaki", "KLR650 Adventure", T, "KLR650"); addBike("Kawasaki", "KLX110R L", P2, "KLX110");
  addBike("Suzuki", "DR-Z125L", P2, "DRZ125"); addBike("Suzuki", "GN125", C, "JP125A", { hp: 11, approx: true });
  /* KTM, Husqvarna, Beta */
  addBike("KTM", "790 Adventure R", T, "LC8C", { hp: 95 }); addBike("KTM", "890 Adventure", T, "LC8C"); addBike("KTM", "1290 Super Adventure S", T, "LC8"); addBike("KTM", "1290 Super Adventure R", T, "LC8");
  addBike("KTM", "250 XC", K, "KTM250TPI"); addBike("KTM", "300 XC", K, "KTM300TPI"); addBike("KTM", "350 XC-F", K, "KTM350F");
  addBike("Husqvarna", "Norden 901 Expedition", T, "LC8C"); addBike("Husqvarna", "701 Enduro LR", E, "LC4");
  addBike("Beta", "RR 200 2T", K, "BETA200", A); addBike("Beta", "RR 125 X-Pro", K, "BETA125"); addBike("Beta", "RR 300 X-Pro", K, "BETA300");
  /* BMW, Ducati */
  addBike("BMW", "F 900 GS Adventure", T, "F900"); addBike("BMW", "R 1300 GS Adventure", T, "R1250", { hp: 145 }); addBike("Ducati", "DesertX Rally", T, "DESERTX");
  /* классика: СССР и Jawa */
  addBike("Jawa", "350 638", C, "JAWA350"); addBike("Jawa", "350 634", C, "JAWA350", { hp: 25 });
  addBike("ИЖ", "Планета Спорт", C, "IZHPS"); addBike("ИЖ", "Планета-4", C, "IZHP5", { hp: 18, approx: true }); addBike("ИЖ", "Юпитер-4", C, "IZHJ5", { hp: 25, approx: true });
  addBike("Днепр", "МТ-11", C, "DNEPR"); addBike("Днепр", "МТ-10", C, "DNEPR", { hp: 32, approx: true });
  /* Китай: NC300 (ZS182MN) и питбайки 190 — по карточкам дилеров (avantsb.ru, jazzmoto.ru, globaldrive.ru, startmoto.pro, master-tehno.ru) */
  addBike("Avantis", "A7 NEW", E, "NC300"); addBike("Avantis", "Enduro 300 PRO EFI Exclusive", E, "NC300", { hp: 34, carb: "Инжектор", approx: true });
  addBike("Regulmoto", "Nibbi 300", E, "NC300"); addBike("Kayo", "K6 300 FCR", E, "NC300");
  setEngine("Progasi", "Race 300", 0, "NC300");
  addBike("Kayo", "Evolution ZS190EM", P2, "Z190", { hp: 16 }); addBike("Kayo", "KRZ 125", P2, "154FMI");
  addBike("YCF", "Daytona 190", P2, "ANIMA190"); addBike("YCF", "Bigy 190 MX", P2, "Z190", { hp: 18, approx: true });
})();
/* ===================== v23: синонимы моторов для поиска, мотор 174 у Ataki EF300, Darex ===================== */
/* Как ещё называют мотор: цифры с картера («174», «182»), рыночные имена, русская раскладка */
var ENGINE_AKA = {
  "139FMB": "50 139 мопедный", "147FMD": "70 72 147", "152FMH": "110 152", "154FMI": "125 154 1p54fmi",
  "YX140": "yx 140 1p56fmj ях140", "1P60FMK": "yx150 yx160 150 160 ях150 ях160", "Z155": "155 1p60ymj zs155", "Z190": "190 w190 1p62yml zs190",
  "ANIMA190": "daytona анима 190 4v", "CG150": "cg 150 162fmj цг150", "CG200": "cg 200 163fml цг200", "CB150": "cb 150 162fmj2 цб150",
  "167FMM": "cg250 167 цг250", "165FMM": "cb250d cb250 165 223 цб250",
  "172FMM": "172 cb250 2v цб250 зонгшен зоншен", "172FMM-3A": "172 cb250 4v 3a цб250 зонгшен зоншен", "172FMM-5": "172 pr250 балансир пр250 зонгшен зоншен",
  "PR300": "pr300 172fmm5 175fmm5 4v балансир пр300 зонгшен зоншен", "175FMM": "175 175fmm cb300 cb300f цб300 зонгшен зоншен",
  "CBS300": "174 174mn 174mn3 cbs cbs300 цбс300 водянка зонгшен зоншен", "NB300": "174 174mn 174mn5 nb nb300 нб300 водянка зонгшен зоншен",
  "NB300E": "182 182mn nc300 нц300 efi инжектор зонгшен зоншен", "NC300": "182 182mn nc nc300 нц300 зонгшен зоншен",
  "NC250": "177 177mm nc250 нц250 зонгшен зоншен", "NC250E": "177 177mm nc250 нц250 efi инжектор зонгшен зоншен",
  "NC450": "194 194mq nc450 нц450 зонгшен зоншен", "NC450C": "194 194mq nc450 нц450 зонгшен зоншен",
  "YBS300": "ybs ybs300 176 176mn lx176mn лончин", "YBS300G2": "ybs ybs300 176 176mn lx176mn лончин gen2",
  "VOGE300": "lx300 лончин", "2T250": "2т двухтакт 250", "2T300": "2т двухтакт 300"
};
(function () {
  var E = "Эндуро", P2 = "Питбайк", Mo = "Мотард", A = { approx: true };
  /* «Любая модель с мотором ZS182MN» стояла на NB300 со старых версий: 182MN — это NC300 */
  setEngine("Любая модель", "с мотором ZS182MN", 0, "NC300");
  addBike("Любая модель", "с мотором ZS174MN-5 (NB300)", E, "NB300");
  /* Ataki EF300 — мотор 174 (ZS174MN); у него две версии: -5 (NB300) и -3 (CBS300) */
  setEngine("Ataki", "EF300", 0, "NB300");
  addVersion("Ataki", "EF300", "CBS300", "вариант мотора 174MN-3");
  /* Darex (darexmoto.ru, mvideo.ru, jazzmoto.ru, quadromoto.by) */
  addBike("Darex", "Matay 250", E, "172FMM-5", { hp: 21 }); addBike("Darex", "Timer 250", E, "172FMM"); addBike("Darex", "Timer 300", E, "175FMM");
  addBike("Darex", "Alga 300 S", E, "PR300", A); addBike("Darex", "Alga 250 S", E, "172FMM-3A", A);
  addBike("Darex", "TAU NB300", E, "NB300"); addBike("Darex", "URMAN NB300", E, "NB300");
  addBike("Darex", "Malai 125", P2, "154FMI"); addBike("Darex", "Malai 150", P2, "1P60FMK", { hp: 11, approx: true });
  /* прочие — по карточкам дилеров */
  addBike("Motoland", "GS Enduro", E, "172FMM-5"); addBike("Regulmoto", "Nibbi N300-S", E, "NB300");
  addBike("Geon", "Dakar GNS 300R SM", Mo, "NC300", { hp: 32 }); addBike("BRZ", "X5 PR300", E, "PR300"); addBike("BRZ", "MX8 PR300", E, "PR300");
  /* GR8: F300L — NB300 (ZS174MN-5, 27 л.с.); F300A — воздушного охлаждения, а не NB300; T300L RR — 2T 293 см³ (bvdshop.ru, grmoto.ru, sports.ru) */
  addBike("GR8", "F300L (4T NB300) Enduro Lite", E, "NB300", { hp: 27 }); addBike("GR8", "F300L (4T NB300) Enduro Optimum", E, "NB300", { hp: 27 });
  setEngine("GR8", "F300A Enduro Pro", 0, "PR300", { approx: true }); addBike("GR8", "T300L RR", "Кросс-эндуро", "2T300", { hp: 44 });
  /* Zuumav K5 на CB300F, Fxmoto PR300, BNK K10 NB300 (bvdshop.ru, pitbikemarket.ru) */
  addBike("Zuumav", "K5 300", E, "175FMM"); addBike("Fxmoto", "PR300", E, "PR300"); addBike("BNK", "K10 NB300", E, "NB300");
})();
/* ===================== v24: больше японских, европейских и китайских моделей ===================== */
(function () {
  var E = "Эндуро", LE = "Лёгкий эндуро", Mo = "Мотард", X = "Кросс-эндуро", T = "Тур-эндуро", P2 = "Питбайк", A = { approx: true };
  /* Honda: японские «серые» модели, которые часто встречаются б/у */
  addBike("Honda", "SL230", LE, "CRF230F"); addBike("Honda", "XL230", LE, "CRF230F"); addBike("Honda", "FTR223", "Классика", "CRF230F");
  addBike("Honda", "XR400 Motard", Mo, "XR400R"); addBike("Honda", "CRF150R", X, "CRF150F", A); addBike("Honda", "CB190X", LE, "XR190");
  addBike("Honda", "XLR200R", LE, "XR200R", A);
  /* Yamaha */
  addBike("Yamaha", "AG200", LE, "TW200"); addBike("Yamaha", "XT200", LE, "TW200"); addBike("Yamaha", "TW225", LE, "XT225");
  addBike("Yamaha", "XT600Z Ténéré", T, "XT600"); addBike("Yamaha", "XTZ660 Ténéré", T, "XT660", A);
  /* Kawasaki */
  addBike("Kawasaki", "KLX400R", E, "DRZ400"); addBike("Kawasaki", "KLX250R", E, "KLX250"); addBike("Kawasaki", "KDX250SR", E, "JP2T250");
  addBike("Kawasaki", "D-Tracker X", Mo, "KLX250"); addBike("Kawasaki", "Versys-X 250 Tourer", T, "T250K", A); addBike("Kawasaki", "KLX230 SE", LE, "KLX230");
  /* Suzuki */
  addBike("Suzuki", "DR250S", LE, "DRZ250", A); addBike("Suzuki", "DR200S", LE, "DR200");
  /* KTM, Husqvarna, GasGas */
  addBike("KTM", "450 XC-F", X, "KTM450F"); addBike("KTM", "450 XC-W", E, "KTM450F"); addBike("KTM", "500 XC-W", E, "KTM450F", A); addBike("KTM", "250 XC-W", E, "KTM250TPI", A);
  addBike("Husqvarna", "FX 450", X, "KTM450F"); addBike("Husqvarna", "FE 501s", E, "KTM450F", A); addBike("Husqvarna", "TE 250i", E, "KTM250TPI"); addBike("Husqvarna", "TE 300i", E, "KTM300TPI");
  addBike("GasGas", "EC 250 Ranger", E, "KTM250TPI", A); addBike("GasGas", "EC 300 Ranger", E, "KTM300TPI", A);
  /* Sherco, TM, Fantic, Rieju, Beta */
  addBike("Sherco", "SE 125", E, "KTM125", A); addBike("Sherco", "SEF 250", E, "SHERCO4T", A); addBike("Sherco", "SEF 500", E, "KTM450F", A);
  addBike("TM Racing", "EN 125", E, "KTM125", A); addBike("TM Racing", "EN 450 Fi", E, "KTM450F", A);
  addBike("Fantic", "XE 300", E, "BETA300", A); addBike("Rieju", "MR 250", E, "BETA250", A); addBike("Beta", "RR 350 Racing", E, "BETA4T", A);
  /* BMW, Triumph */
  addBike("BMW", "HP2 Enduro", T, "R1170"); addBike("Triumph", "Tiger 900 Rally", T, "I3_900T"); addBike("Triumph", "Tiger 900 GT", T, "I3_900T");
  /* китайские эндуро на популярных моторах */
  addBike("Shineray", "X-Trail 250", E, "172FMM", A); addBike("Shineray", "XY250GY-6C", E, "172FMM", A);
  addBike("Zongshen", "ZS250GY-5", E, "172FMM-3A", A); addBike("Loncin", "LX250GY-6", E, "165FMM", A);
  addBike("Lifan", "LF200GY-3B", LE, "CG200", A); addBike("Racer", "Enduro RC300-GY8X", E, "175FMM", A);
  addBike("Минск", "TRX 300i", E, "175FMM", A); addBike("Ataki", "S004 300", E, "PR300", A); addBike("YCF", "Bigy 125", P2, "154FMI", A);
})();
/* ===================== v25: модели с тем же мотором, что у базовой версии ===================== */
(function () {
  var E = "Эндуро", LE = "Лёгкий эндуро", Mo = "Мотард", T = "Тур-эндуро";
  function same(brand, name) {
    var b = BIKES.find(function (x) { return x.brand === brand && x.name === name; });
    if (!b) throw new Error("v25: нет модели " + brand + " " + name);
    return b.versions[0].engine;
  }
  /* Honda */
  addBike("Honda", "CRF230L", LE, "CRF230F"); addBike("Honda", "CRF230M", Mo, "CRF230F"); addBike("Honda", "XR250L", E, "XR250");
  /* Kawasaki */
  addBike("Kawasaki", "KL650 Tengai", T, "KLR650");
  /* KTM: спецверсии Six Days на тех же моторах */
  addBike("KTM", "250 EXC-F Six Days", E, "KTM250F"); addBike("KTM", "350 EXC-F Six Days", E, "KTM350F"); addBike("KTM", "450 EXC-F Six Days", E, "KTM450F");
  addBike("KTM", "500 EXC-F Six Days", E, "KTM450F", { approx: true });
  addBike("KTM", "250 EXC TPI Six Days", E, "KTM250TPI"); addBike("KTM", "300 EXC TPI Six Days", E, "KTM300TPI");
  /* Husqvarna: Heritage и Pro */
  addBike("Husqvarna", "TE 250 Pro", E, "KTM250TPI"); addBike("Husqvarna", "TE 300 Pro", E, "KTM300TPI"); addBike("Husqvarna", "TE 300 Heritage", E, "KTM300TPI");
  addBike("Husqvarna", "FE 350 Pro", E, "KTM350F"); addBike("Husqvarna", "FE 350 Heritage", E, "KTM350F");
  /* Beta, Sherco */
  addBike("Beta", "RR 250 Race Edition", E, "BETA250"); addBike("Beta", "RR 430 Race Edition", E, "BETA4T"); addBike("Sherco", "SEF 300 Racing", E, "SHERCO4T");
  /* CFMOTO — версии на том же моторе */
  addBike("CFMOTO", "800MT Explore", T, same("CFMOTO", "800MT")); addBike("CFMOTO", "800MT Sport", T, same("CFMOTO", "800MT"));
  /* Royal Enfield */
  addBike("Royal Enfield", "Himalayan 450 Summit", T, same("Royal Enfield", "Himalayan 450"));
  /* Yamaha */
  addBike("Yamaha", "WR250R Final Edition", E, same("Yamaha", "WR250R"));
})();
/* ===================== v27: модель сразу с поколениями ===================== */
/* G("Марка", "Модель", "Тип", [["ID_МОТОРА", "годы", { hp, approx }], ...]); годы можно не указывать ("") */
function G(brand, name, type, gens) {
  if (BIKE_KEYS[brand + "|" + name]) return;
  B(brand, name, type, gens.map(function (g) {
    var e = ENGINES[g[0]];
    if (!e) throw new Error(brand + " " + name + ": нет двигателя «" + g[0] + "» в ENGINES");
    return [g[0], (g[1] ? g[1] + " · " : "") + e.code + ", " + e.cc + " см³", Object.assign(g[1] ? { years: g[1] } : {}, g[2] || {})];
  }));
}
/* ===================== v27: одинаковые инструкции — одной ===================== */
/* старый id → оставшийся (сохранённые ссылки и выбор открывают объединённую инструкцию) */
var GUIDE_ALIAS = {};
(function () {
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  [["compression", "compression-test", "Замер компрессии"], ["forkseals", "fork-seals-steps", "Замена сальников вилки"],
   ["pads", "pads-replace", "Замена тормозных колодок"], ["winter", "winter-storage", "Консервация на зиму"],
   ["carb-clean", "carb-assemble", "Чистка карбюратора: разборка и сборка"]].forEach(function (x) {
    var keep = GUIDES.find(function (g) { return g.id === x[0]; }), dup = GUIDES.find(function (g) { return g.id === x[1]; });
    if (!keep || !dup) return;
    /* шаги — из подробной версии, инструменты и детали — из обеих */
    keep.title = x[2];
    keep.steps = dup.steps.length >= keep.steps.length ? dup.steps : keep.steps;
    keep.tools = uniq((keep.tools || []).concat(dup.tools || []));
    keep.parts = uniq((keep.parts || []).concat(dup.parts || []));
    if (dup.time) keep.time = dup.time;
    if (!keep.fig && dup.fig) keep.fig = dup.fig;
    GUIDES.splice(GUIDES.indexOf(dup), 1);
    GUIDE_ALIAS[x[1]] = x[0];
  });
  function fix(o) {
    if (Array.isArray(o)) { o.forEach(function (v, i) { if (typeof v === "string" && GUIDE_ALIAS[v]) o[i] = GUIDE_ALIAS[v]; else if (v && typeof v === "object") fix(v); }); return; }
    Object.keys(o).forEach(function (k) { var v = o[k]; if (typeof v === "string" && GUIDE_ALIAS[v]) o[k] = GUIDE_ALIAS[v]; else if (v && typeof v === "object") fix(v); });
  }
  [AREAS, CH_AREAS, KIND_INSTALL, TUNE_GUIDE, TUNING, CAUSES, DIAG].forEach(function (o) { if (o) fix(o); });
})();
/* ===================== v27: схема электрики, моменты затяжки, шины ===================== */
/* Цвета проводов — самые частые у китайских мотоциклов (CG/CB/ZS). У японцев и европейцев свои — сверяй с мануалом. */
var WIRE = {
  red: ["#D7262E", "Красный", "+12 В от аккумулятора (всегда под напряжением)"],
  black: ["#22262A", "Чёрный", "+12 В после замка зажигания"],
  green: ["#2E9E5B", "Зелёный", "Масса (минус)"],
  yellow: ["#F2C200", "Жёлтый", "Переменка со статора (зарядка)"],
  bw: ["#22262A", "Чёрный/белый", "Глушение: при нажатой кнопке замыкается на массу", "#F2F3F0"],
  br: ["#22262A", "Чёрный/красный", "Катушка возбуждения статора → CDI", "#D7262E"],
  bluew: ["#1F6FD1", "Синий/белый", "Датчик положения (pickup) → CDI", "#F2F3F0"],
  by: ["#22262A", "Чёрный/жёлтый", "CDI → первичная обмотка катушки", "#F2C200"],
  yr: ["#F2C200", "Жёлтый/красный", "Кнопка стартера → реле", "#D7262E"],
  hv: ["#5A6168", "Высоковольтный", "Катушка → свеча"],
  white: ["#E9EAE6", "Белый / коричневый", "Питание света и сигналов"],
  pink: ["#E06AA8", "Розовый / оранжевый", "Сигналы датчиков к ЭБУ"],
  blue: ["#1F6FD1", "Синий", "Управление бензонасосом и форсункой"]
};
var WIRING = {
  ac: {
    t: "Без аккумулятора, кикстартер (AC-CDI)",
    d: "Искру даёт сам статор: при кике катушка возбуждения заряжает CDI, датчик положения подсказывает момент. Аккумулятор и замок не нужны — мотор глушится кнопкой, которая замыкает провод на массу.",
    nodes: [
      ["exc", 0, 0, "Катушка возбуждения", "Обмотка статора, которая питает CDI. Если она сгорела — искры нет совсем.", [["Сопротивление чёрный/красный — масса", "≈ 100–400 Ом"], ["Пиковое напряжение при кике", "от 100 В (нужен адаптер пикового напряжения)"]]],
      ["cdi", 1, 0, "Коммутатор CDI", "Копит заряд и в нужный момент сбрасывает его в катушку. AC-CDI — 4–5 контактов, без +12 В.", [["Проверка", "заменой на заведомо исправный — тестером CDI не проверить"], ["Разъём", "без окислов, фишка до щелчка"]]],
      ["coil", 2, 0, "Катушка зажигания", "Повышает напряжение до 15–30 кВ.", [["Первичная обмотка", "≈ 0.2–1 Ом"], ["Вторичная (без колпачка)", "≈ 3–10 кОм"], ["Колпачок свечи", "≈ 5 кОм (или 0 без резистора)"]]],
      ["pu", 0, 1, "Датчик положения (pickup)", "Магнит на роторе пролетает мимо датчика — CDI понимает, когда дать искру.", [["Сопротивление синий/белый — масса", "≈ 80–200 Ом"], ["Зазор до ротора", "≈ 0.5–0.8 мм"]]],
      ["kill", 1, 1, "Кнопка глушения", "Замыкает провод CDI (чёрный/белый) на массу. Залипла или перетёрся провод — искры нет.", [["Отключи провод от CDI", "если искра появилась — виновата кнопка или проводка"]]],
      ["plug", 2, 1, "Свеча", "Искра должна быть синей и щёлкать.", [["Зазор", "{gap}"], ["Свеча", "{spark}"], ["Затяжка", "{sparkTorque}"]]],
      ["light", 0, 2, "Катушка освещения", "Отдельная обмотка статора для фары и стопа.", [["Сопротивление жёлтый — масса", "≈ 0.3–1 Ом"], ["Переменка на 5000 об/мин", "≈ 15–40 В"]]],
      ["reg", 1, 2, "Регулятор напряжения", "Срезает лишнее, чтобы не сгорели лампы. Нет регулятора — лампы горят на оборотах.", [["Напряжение на фаре на оборотах", "≈ 12–14 В переменки"]]],
      ["lamps", 2, 2, "Фара и стоп", "Питание переменкой: на холостых свет тусклее — это нормально.", [["Лампы", "только 12 В, мощность не выше штатной"]]],
      ["gnd", 1, 3, "Масса", "Корпус двигателя и рама. Плохая масса — самая частая причина пропадающей искры.", [["Сопротивление массы CDI — рама", "≈ 0 Ом"], ["Клеммы", "зачистить до блеска, смазать токопроводящей смазкой"]]]
    ],
    wires: [["exc", "cdi", "br"], ["pu", "cdi", "bluew"], ["cdi", "coil", "by"], ["coil", "plug", "hv"], ["kill", "cdi", "bw"], ["light", "reg", "yellow"], ["reg", "lamps", "yellow"], ["cdi", "gnd", "green"], ["kill", "gnd", "green"], ["reg", "gnd", "green"]]
  },
  dc: {
    t: "С аккумулятором и электростартером",
    d: "Статор заряжает аккумулятор через реле-регулятор, от аккумулятора через предохранитель и замок питаются CDI, свет и стартер. Не крутит стартер — смотри аккумулятор, реле и массу; нет зарядки — регулятор и статор.",
    nodes: [
      ["bat", 0, 0, "Аккумулятор", "12 В. Сначала проверяй его — половина «неисправностей электрики» отсюда.", [["Без нагрузки", "12.6–12.9 В (ниже 12.4 — зарядить)"], ["При кручении стартером", "не ниже 9.6 В"]]],
      ["fuse", 1, 0, "Предохранитель", "Обычно 15 А у реле стартера. Перегорел — всё мёртвое.", [["Проверка", "прозвонить, сопротивление ≈ 0 Ом"], ["Номинал", "только штатный, не «жучок»"]]],
      ["key", 2, 0, "Замок зажигания", "Подаёт +12 В (чёрный провод) на CDI, свет и кнопки.", [["На выходе в положении ON", "≈ 12 В"], ["Контакты", "окисляются — промыть очистителем"]]],
      ["rel", 0, 1, "Реле стартера", "Мощный ключ: от кнопки щёлкает и подаёт ток на стартер.", [["Обмотка реле", "≈ 3–5 Ом"], ["Щелчок есть, стартер молчит", "контакты реле, клеммы, сам стартер"]]],
      ["btn", 1, 1, "Кнопка стартера", "Через неё на реле идёт жёлтый/красный. У многих стартер работает только с выжатым сцеплением или на нейтрали.", [["При нажатии на проводе реле", "≈ 12 В"]]],
      ["kill", 2, 1, "Кнопка глушения", "В DC-схеме обычно разрывает питание CDI (у части моделей — замыкает на массу).", [["В положении RUN на выходе", "≈ 12 В"]]],
      ["starter", 0, 2, "Стартер", "Электромотор, крутит коленвал через обгонную муфту.", [["Ток при пуске", "≈ 30–60 А"], ["Крутит, но не цепляет", "обгонная муфта стартера"]]],
      ["cdi", 1, 2, "Коммутатор DC-CDI", "Питается +12 В от замка, по сигналу датчика положения даёт искру. Часто 6 контактов.", [["Питание на фишке", "≈ 12 В при включённом замке"], ["Проверка", "заменой на заведомо исправный"]]],
      ["coil", 2, 2, "Катушка зажигания", "Повышает напряжение до 15–30 кВ.", [["Первичная обмотка", "≈ 0.2–1 Ом"], ["Вторичная (без колпачка)", "≈ 3–10 кОм"]]],
      ["reg", 0, 3, "Реле-регулятор", "Выпрямляет переменку статора и держит 14 В. Перегрев и плохие фишки — главная беда.", [["Зарядка на 3000–5000 об/мин", "13.5–14.8 В на аккумуляторе"], ["Больше 15 В", "регулятор пробит — кипит аккумулятор"], ["Меньше 13 В", "регулятор или статор"]]],
      ["pu", 1, 3, "Датчик положения (pickup)", "Подсказывает CDI момент искры.", [["Сопротивление синий/белый — масса", "≈ 80–200 Ом"]]],
      ["plug", 2, 3, "Свеча", "Искра должна быть синей и щёлкать.", [["Зазор", "{gap}"], ["Свеча", "{spark}"], ["Затяжка", "{sparkTorque}"]]],
      ["stator", 0, 4, "Статор (генератор)", "Обмотки под левой крышкой. Даёт переменку на регулятор (жёлтые провода).", [["Между жёлтыми проводами", "≈ 0.3–1.5 Ом, одинаково между всеми"], ["Жёлтый — масса", "обрыв (бесконечность), иначе пробой"], ["Переменка на 5000 об/мин", "≈ 30–60 В между жёлтыми"]]],
      ["lamps", 1, 4, "Свет и сигналы", "Питаются от замка. LED-фара разгружает генератор.", [["Тусклый свет на холостых", "слабая зарядка или плохая масса"]]],
      ["gnd", 2, 4, "Масса", "Минус аккумулятора на раму и двигатель. Плохая масса — стартер вяло крутит, искра пропадает.", [["Падение напряжения минус АКБ — двигатель при пуске", "не больше 0.2–0.3 В"]]]
    ],
    wires: [["bat", "fuse", "red"], ["fuse", "key", "red"], ["bat", "rel", "red"], ["rel", "starter", "red"], ["key", "btn", "black"], ["btn", "rel", "yr"], ["key", "kill", "black"], ["kill", "cdi", "bw"], ["pu", "cdi", "bluew"], ["cdi", "coil", "by"], ["coil", "plug", "hv"], ["stator", "reg", "yellow"], ["reg", "bat", "red"], ["key", "lamps", "white"], ["reg", "gnd", "green"], ["cdi", "gnd", "green"], ["lamps", "gnd", "green"]]
  },
  efi: {
    t: "Инжектор (ЭБУ)",
    d: "ЭБУ по датчикам считает, сколько впрыснуть топлива и когда дать искру. Питание через главное реле. Горит «чек» — сначала считай коды ошибок, потом проверяй датчик и его проводку.",
    nodes: [
      ["bat", 0, 0, "Аккумулятор", "Инжектору критично напряжение: ниже 11 В ЭБУ и насос работают плохо.", [["Без нагрузки", "12.6–12.9 В"], ["При кручении стартером", "не ниже 9.6 В"]]],
      ["fuse", 1, 0, "Предохранители", "Отдельные на ЭБУ, насос и вентилятор.", [["Проверка", "прозвонить каждый"]]],
      ["key", 2, 0, "Замок и кнопка RUN", "При включении насос должен прожужжать 2–3 секунды.", [["Не жужжит", "предохранитель, реле, кнопка RUN, сам насос"]]],
      ["mainrel", 0, 1, "Главное реле", "По команде ЭБУ питает насос, форсунку и катушку.", [["Щелчок при включении замка", "должен быть"]]],
      ["ecu", 1, 1, "ЭБУ", "Мозг: Delphi, UAES/Bosch, Keihin и т.п. Чаще умирает проводка к нему, чем сам блок.", [["Питание на фишке", "≈ 12 В"], ["Опора датчикам", "5 В"]]],
      ["kill", 2, 1, "Датчик опрокидывания", "При падении глушит мотор. Ставь строго по стрелке.", [["Сигнал в норме", "≈ 0.4–1.5 В (зависит от модели)"]]],
      ["pump", 0, 2, "Бензонасос", "В баке, с фильтром-сеткой.", [["Давление", "≈ 2.5–3.5 бар (250–350 кПа)"], ["Сетка", "забивается — мотор глохнет на газу"]]],
      ["inj", 1, 2, "Форсунка", "Впрыскивает топливо во впуск.", [["Сопротивление", "≈ 10–14 Ом (высокоомная)"], ["Проверка на слух", "щёлкает на работающем моторе"]]],
      ["coil", 2, 2, "Катушка зажигания", "Обычно катушка-колпачок или отдельная.", [["Первичная обмотка", "≈ 0.5–2 Ом"]]],
      ["ckp", 0, 3, "Датчик коленвала", "Без его сигнала ЭБУ не даст ни искры, ни впрыска.", [["Сопротивление", "≈ 100–300 Ом"]]],
      ["sens", 1, 3, "Датчики", "ДПДЗ (положение дросселя), ДАД/ТМАП (давление во впуске), ДТОЖ (температура), лямбда-зонд.", [["ДПДЗ: закрыт → открыт", "≈ 0.5 → 4.5 В плавно"], ["ДТОЖ при 20 °C", "≈ 2–3 кОм"], ["Подогрев лямбды", "≈ 6–15 Ом"]]],
      ["plug", 2, 3, "Свеча", "Искра должна быть синей.", [["Свеча", "{spark}"], ["Зазор", "{gap}"]]],
      ["stator", 0, 4, "Статор", "Заряжает аккумулятор через регулятор.", [["Переменка на 5000 об/мин", "≈ 30–60 В между жёлтыми"]]],
      ["reg", 1, 4, "Реле-регулятор", "Держит 14 В.", [["Зарядка на 3000–5000 об/мин", "13.5–14.8 В"]]],
      ["diag", 2, 4, "Диагностика", "Разъём для сканера или вывод кодов морганием «чека».", [["Коды", "смотри «Справочник → Коды ошибок»"]]]
    ],
    wires: [["bat", "fuse", "red"], ["fuse", "key", "red"], ["fuse", "mainrel", "red"], ["key", "ecu", "black"], ["mainrel", "pump", "blue"], ["mainrel", "inj", "blue"], ["ecu", "inj", "blue"], ["ecu", "coil", "by"], ["coil", "plug", "hv"], ["ckp", "ecu", "pink"], ["sens", "ecu", "pink"], ["kill", "ecu", "pink"], ["stator", "reg", "yellow"], ["reg", "bat", "red"], ["ecu", "diag", "pink"]]
  }
};
function wiringType(e) {
  if (e.groups.indexOf("efi") >= 0) return "efi";
  return /Электро|электро/.test(e.start || "") ? "dc" : "ac";
}

/* Моменты затяжки: по месту и размеру резьбы, свеча — своя у каждого мотора */
function torqueFor(e, bike) {
  var big = e.cc >= 450, small = e.cc <= 150 || (bike && bike.type === "Питбайк");
  var r = [
    ["Свеча (" + String(e.spark || "").split(" /")[0] + ")", e.sparkTorque || "12–18 Н·м"],
    ["Сливная пробка масла", big ? "20–30 Н·м" : "18–25 Н·м"],
    ["Крышка клапанов, крышки двигателя М6", "8–10 Н·м"]
  ];
  if (e.stroke === "4T" && !e.jp) r.push(["Гайки головки цилиндра (крест-накрест, в 2–3 приёма)", e.cc <= 130 ? "M7: 15–18 Н·м" : e.cc <= 260 ? "M8: 20–25 Н·м" : "M8–M9: 25–30 Н·м"]);
  if (e.stroke === "2T") r.push(["Гайки головки 2T (крест-накрест)", e.cc <= 90 ? "10–12 Н·м" : "20–27 Н·м"]);
  r.push(["Выпускной коллектор (шпильки М6/М8)", "10–12 / 18–22 Н·м"]);
  r.push(["Ось переднего колеса", small ? "40–50 Н·м" : big ? "60–90 Н·м" : "45–65 Н·м"]);
  r.push(["Ось заднего колеса", small ? "60–80 Н·м" : big ? "100–130 Н·м" : "80–100 Н·м"]);
  r.push(["Болты звезды на ступице", small ? "M6: 10–14 Н·м + фиксатор" : "M8: 30–35 Н·м + фиксатор"]);
  r.push(["Передняя звезда (болт/гайка)", big ? "60–100 Н·м (гайка)" : "10–12 Н·м (болт М6)"]);
  r.push(["Тормозной диск", "M6: 10–12 / M8: 20–25 Н·м + фиксатор"]);
  r.push(["Суппорт к вилке", big ? "M10: 35–45 Н·м" : "M8: 25–30 Н·м"]);
  r.push(["Траверсы (зажим перьев)", big ? "M8: 18–25 Н·м" : "M8: 15–20 Н·м"]);
  r.push(["Гайка рулевой колонки", big ? "90–110 Н·м" : "60–80 Н·м"]);
  r.push(["Ось маятника", small ? "45–60 Н·м" : big ? "90–110 Н·м" : "60–80 Н·м"]);
  r.push(["Крепления двигателя к раме", big ? "M10: 45–55 Н·м" : "M8–M10: 35–45 Н·м"]);
  r.push(["Болты амортизатора", "M10: 40–45 Н·м"]);
  r.push(["Спицы", "3–5 Н·м, равномерно по кругу"]);
  return r;
}
/* Общая таблица «болт в алюминий / в сталь» — если нужного узла нет выше */
var TORQUE_BY_SIZE = [["M5", "4–6 Н·м", "5–7 Н·м"], ["M6", "8–10 Н·м", "10–12 Н·м"], ["M8", "18–22 Н·м", "22–28 Н·м"], ["M10", "35–40 Н·м", "40–50 Н·м"], ["M12", "50–60 Н·м", "60–80 Н·м"], ["M14", "—", "80–110 Н·м"]];

/* Шины: типичный размер для класса (точный — на боковине своей шины) и давление по покрытию */
function tiresFor(bike, e) {
  var t = bike.type, n = bike.name, cc = e.cc, m = n.match(/\b(21|19|17|14|12|10)\/(18|17|16|14|12|10)\b/);
  var sz = { "21/18": ["80/100-21", "110/100-18"], "19/16": ["70/100-19", "90/100-16"], "17/14": ["70/100-17", "90/100-14"], "14/12": ["60/100-14", "80/100-12"], "12/10": ["2.50-12", "3.00-10"], "19/17": ["70/100-19", "90/100-17"] };
  var front, rear, pr;
  if (m && sz[m[1] + "/" + m[2]]) { front = sz[m[1] + "/" + m[2]][0]; rear = sz[m[1] + "/" + m[2]][1]; }
  if (t === "Питбайк") {
    if (!front) { var s = cc <= 90 ? "12/10" : cc <= 125 ? "17/14" : "19/16"; front = sz[s][0]; rear = sz[s][1]; }
    pr = [["Грунт, трасса", "1.0–1.3 бар"], ["Асфальт", "1.5–1.8 бар"]];
  } else if (t === "Эндуро" || t === "Кросс-эндуро") {
    if (!front) { front = "80/100-21"; rear = t === "Кросс-эндуро" && cc < 200 ? "100/90-19" : t === "Кросс-эндуро" ? "110/90-19" : "110/100-18"; }
    pr = [["Лес, грязь", "0.8–1.0 бар"], ["Камни, корни", "1.0–1.2 бар"], ["Песок", "0.7–0.9 бар"], ["Асфальт", "1.5–1.8 бар"]];
  } else if (t === "Лёгкий эндуро") {
    front = front || "80/100-21"; rear = rear || "100/100-18";
    pr = [["Грунт", "1.2–1.5 бар"], ["Асфальт", "1.8–2.0 бар"]];
  } else if (t === "Мотард") {
    front = "120/70-17"; rear = cc >= 450 ? "150/60-17" : "140/70-17";
    pr = [["Асфальт", "1.9–2.1 / 2.0–2.3 бар"], ["Трек на сликах", "1.6–1.8 бар"]];
  } else if (t === "Тур-эндуро") {
    front = cc >= 750 ? "90/90-21 или 110/80-19" : "90/90-21"; rear = cc >= 750 ? "150/70-17" : "130/80-17";
    pr = [["Асфальт", "2.2 / 2.5 бар (с пассажиром — 2.5 / 2.9)"], ["Грунтовка", "1.6–1.8 бар"], ["Тяжёлое бездорожье", "1.2–1.4 бар"]];
  } else if (t === "Спорт" || t === "Нейкед") {
    front = cc >= 600 ? "120/70 ZR17" : cc >= 250 ? "110/70-17" : "100/80-17"; rear = cc >= 900 ? "190/55 ZR17" : cc >= 600 ? "180/55 ZR17" : cc >= 250 ? "140/70-17" : "130/70-17";
    pr = [["Дорога", "2.3–2.5 / 2.5–2.9 бар"], ["Трек (на горячую)", "≈ 2.1 / 2.0 бар"]];
  } else if (t === "Турер") {
    front = "120/70 ZR17 или 130/70 R18"; rear = "180/55 ZR17 или 200/55 R16";
    pr = [["Один", "2.5 / 2.9 бар"], ["С пассажиром и багажом", "2.5 / 2.9–3.0 бар"]];
  } else if (t === "Чоппер") {
    front = cc >= 1200 ? "130/90-16 или 130/70-18" : cc >= 600 ? "100/90-19" : "100/90-19"; rear = cc >= 1200 ? "180/65-16 или 200/55-17" : cc >= 600 ? "150/80-16" : "130/90-15";
    pr = [["Один", "2.0–2.5 / 2.5–2.9 бар"], ["С пассажиром", "+0.2–0.3 бар сзади"]];
  } else if (t === "Триал") {
    front = "2.75-21"; rear = "4.00 R18 (бескамерная триал)";
    pr = [["Триал", "0.3–0.5 бар"]];
  } else if (t === "Мопед") {
    front = "2.50-17"; rear = "2.75-17";
    pr = [["Один", "1.8 / 2.0 бар"], ["С пассажиром", "1.8 / 2.3 бар"]];
  } else {
    front = cc >= 600 ? "4.00-19" : "3.25-19"; rear = cc >= 600 ? "4.00-19" : "4.00-18";
    pr = [["Дорога", "1.8–2.0 / 2.0–2.3 бар"]];
  }
  return { front: front, rear: rear, pressure: pr, exact: !!m };
}
/* ===================== v28: Harley-Davidson и Buell — полный модельный ряд, свои моторы ===================== */
(function () {
  var CH = "Чоппер", TR = "Турер", NK = "Нейкед", AD = "Тур-эндуро", SP = "Спорт";

  /* ===================== Harley-Davidson: моторы ===================== */
  /* Общее для воздушных Harley: гидрокомпенсаторы (клапаны не регулируются), три отдельных масла у Big Twin
     (двигатель / праймари / КПП), у Sportster — двигатель + общее масло праймари и КПП.
     topRatio — передаточное число «первичка × высшая передача» под скорость на сайте (Harley высоко передаточный). */

  /* --- Sportster Evolution, карбюратор (1986–2006) --- */
  RE("HD_EVO883C", { region: "eu", code: "Evolution 883 (карб.)", name: "Harley-Davidson Sportster Evolution 883, карбюратор (V-twin 45°)",
    maker: "Harley-Davidson", layout: "vtwin", vAngle: 45, groups: ["air", "carb", "4t", "big"],
    cam: "OHV, 4 клапана, 4 нижних распредвала на шестернях, V-twin 45°", cooling: "Воздушное", coolant: "",
    cc: 883, hp: 50, torque: "≈ 68 Н·м", compression: "≈ 9–10 бар (степень 8.9:1)", redline: 6000, topRatio: 1.4,
    fuel: "АИ-92 / АИ-95", ignition: "Электронное (модуль ICM, VOES)", timing: "Шестерни + штанги толкателей", start: "Электро",
    gearbox: "5 ст. (до 1990 — 4 ст.), цепь / ремень", carb: "Keihin CV 40 мм", jetMain: "≈ 165–175 (по году и рынку)", jetPilot: "42", needle: "без регулировки (EPA), тюнинг — набор Screamin' Eagle",
    idle: "950–1050", valveIn: "гидрокомпенсаторы", valveEx: "гидрокомпенсаторы", valveInt: 0,
    spark: "H-D 5R6A / NGK DCPR6E (позже — H-D 6R12 / NGK DCPR7E)", gap: "0.97–1.09 мм", sparkTorque: "16–24 Н·м",
    oil: "Двигатель: 20W-50 (H-D 360 / SYN3), сухой картер с баком; праймари + КПП — отдельное масло (Sport-Trans / Formula+)",
    oilVol: "двигатель ≈ 2.8–3.3 л с фильтром (бак); праймари + КПП ≈ 0.95 л", oilInt: 8000,
    issues: [
      { t: "Масло в воздушном фильтре — сапуны в болтах ГБЦ (с 1991)", sev: "low", fix: "Отвод сапунов (breather kit), не переливать масло в бак." },
      { t: "Течь по кольцам трубок толкателей и прокладкам цилиндров", sev: "low", fix: "Новые кольца и прокладки, затяжка по мануалу." },
      { t: "Карбюратор настроен бедно (EPA): провалы, перегрев задней головки", sev: "med", fix: "Настройка CV40 (игла, жиклёры) или набор Screamin' Eagle." },
      { t: "Реле-регулятор и разъём статора", sev: "med", fix: "Зарядка 14.2–14.6 В; почистить или запаять разъём." }
    ] }, 2.4);
  CL("HD_EVO1200C", "HD_EVO883C", { code: "Evolution 1200 (карб.)", name: "Harley-Davidson Sportster Evolution 1200, карбюратор (V-twin 45°)",
    cc: 1202, hp: 64, torque: "≈ 98 Н·м", compression: "≈ 10–11 бар (степень 9:1, у 1200S — 10:1)", jetMain: "≈ 175–185 (по году и рынку)",
    spark: "H-D 5R6A / NGK DCPR6E (1200S с двумя свечами — H-D 6R12 / NGK DCPR7E)" }, 2.5);

  /* --- Sportster Evolution, инжектор (2007–2022, мотор на резиновых подушках) --- */
  CL("HD_EVO883I", "HD_EVO883C", { code: "Evolution 883 EFI", name: "Harley-Davidson Sportster Evolution 883, инжектор (V-twin 45°)",
    groups: ["air", "efi", "4t", "big"], hp: 50, torque: "≈ 70 Н·м", compression: "≈ 9–10 бар (степень 8.9:1)",
    ignition: "ЭБУ (EFI)", carb: "Инжектор Delphi ESPFI", jetMain: "—", jetPilot: "—", needle: "—", idle: "950–1050",
    gearbox: "5 ст., ремень", spark: "H-D 6R12 / NGK DCPR7E",
    oilVol: "двигатель ≈ 2.65 л с фильтром (бак); праймари + КПП ≈ 0.95 л",
    issues: [
      { t: "Износ резиновых подушек мотора — вибрации, мотор «гуляет»", sev: "med", fix: "Замена подушек и стабилизаторов (top mount)." },
      { t: "Бедная прошивка: перегрев задней головки, жар на ногу", sev: "med", fix: "Тюнер (Power Vision / SE), не стоять долго на холостых." },
      { t: "Реле-регулятор и разъём статора", sev: "med", fix: "Зарядка 14.2–14.6 В, разъём почистить/запаять." },
      { t: "Масло в воздушном фильтре через сапуны", sev: "low", fix: "Уровень масла по щупу на горячем, без перелива." }
    ] }, 2.4);
  CL("HD_EVO1200I", "HD_EVO883I", { code: "Evolution 1200 EFI", name: "Harley-Davidson Sportster Evolution 1200, инжектор (V-twin 45°)",
    cc: 1202, hp: 67, torque: "≈ 96–100 Н·м", compression: "≈ 10–11 бар (степень 9.7:1)" }, 2.5);
  CL("HD_XR1200", "HD_EVO1200I", { code: "XR1200", name: "Harley-Davidson XR1200 (Evolution 1200, маслоохлаждаемые головки)",
    cooling: "Воздушно-масляное", hp: 91, torque: "≈ 100 Н·м", compression: "≈ 11 бар (степень 10:1)", redline: 7000, topRatio: 1.5,
    oilVol: "двигатель ≈ 3.6 л с фильтром (бак, маслорадиатор); праймари + КПП ≈ 0.95 л",
    issues: [
      { t: "Жар от заднего цилиндра и выпуска на правую ногу", sev: "low", fix: "Тепловые экраны, не стоять в пробках." },
      { t: "Масляный радиатор и шланги — течи после падений", sev: "med", fix: "Защита радиатора, проверка шлангов." },
      { t: "Резиновые подушки мотора", sev: "med", fix: "Замена подушек при вибрациях." }
    ] }, 2.6);

  /* --- Evolution Big Twin 1340 (Softail / Dyna / FXR / Touring 1984–1999) --- */
  RE("HD_EVO1340", { region: "eu", code: "Evolution 1340", name: "Harley-Davidson Evolution Big Twin 1340 (V-twin 45°)",
    maker: "Harley-Davidson", layout: "vtwin", vAngle: 45, groups: ["air", "carb", "4t", "big"],
    cam: "OHV, 4 клапана, 1 нижний распредвал на шестернях, V-twin 45°", cooling: "Воздушное", coolant: "",
    cc: 1340, hp: 63, torque: "≈ 102 Н·м", compression: "≈ 8.5–10 бар (степень 8.5:1)", redline: 5200, topRatio: 1.25,
    fuel: "АИ-92 / АИ-95", ignition: "Электронное (модуль ICM, VOES)", timing: "Шестерни + штанги толкателей", start: "Электро",
    gearbox: "5 ст. (у части ранних — 4 ст.), ремень / цепь", carb: "Keihin CV 40 мм (до 1989 — Keihin «butterfly»; Ultra 1995+ — впрыск)",
    jetMain: "≈ 170–175 (по году и рынку)", jetPilot: "42", needle: "без регулировки (EPA)", idle: "950–1050",
    valveIn: "гидрокомпенсаторы", valveEx: "гидрокомпенсаторы", valveInt: 0,
    spark: "H-D 5R6A / NGK DCPR6E", gap: "0.97–1.09 мм", sparkTorque: "16–24 Н·м",
    oil: "Двигатель: 20W-50 (H-D 360), сухой картер с баком; праймари — Primary Chaincase; КПП — Formula+ (три отдельных масла)",
    oilVol: "двигатель ≈ 3.8 л с фильтром (бак); праймари ≈ 0.95 л; КПП ≈ 0.7 л", oilInt: 8000,
    issues: [
      { t: "Течь масла по прокладкам цилиндров у ранних моторов (до ~1992)", sev: "med", fix: "Металлические прокладки нового образца, затяжка шпилек по мануалу." },
      { t: "Стучат гидрокомпенсаторы на холодную после стоянки", sev: "low", fix: "Чистое масло нужной вязкости; при стуке на горячую — менять толкатели." },
      { t: "Натяжитель первичной цепи — регулировка", sev: "low", fix: "Прогиб первичной цепи по мануалу при каждом ТО." },
      { t: "Возраст: проводка, реле-регулятор, стартер", sev: "med", fix: "Ревизия массы и разъёмов, проверка зарядки." }
    ] }, 2.5);

  /* --- Twin Cam 88 (1999–2006) --- */
  RE("HD_TC88", { region: "eu", code: "Twin Cam 88", name: "Harley-Davidson Twin Cam 88, карбюратор (Dyna / Touring, V-twin 45°)",
    maker: "Harley-Davidson", layout: "vtwin", vAngle: 45, groups: ["air", "carb", "4t", "big"],
    cam: "OHV, 4 клапана, 2 нижних распредвала (Twin Cam), V-twin 45°", cooling: "Воздушное", coolant: "",
    cc: 1450, hp: 67, torque: "≈ 110–115 Н·м", compression: "≈ 9–10 бар (степень 8.8:1)", redline: 5500, topRatio: 1.2,
    fuel: "АИ-95", ignition: "Электронное (модуль ICM)", timing: "Цепь ГРМ (две цепи), подпружиненные натяжители с башмаками", start: "Электро",
    gearbox: "5 ст., ремень (Dyna 2006 — 6 ст.)", carb: "Keihin CV 40 мм", jetMain: "по мануалу (≈ 190–200)", jetPilot: "42–45", needle: "без регулировки (EPA)", idle: "950–1050",
    valveIn: "гидрокомпенсаторы", valveEx: "гидрокомпенсаторы", valveInt: 0,
    spark: "H-D 6R12 / NGK DCPR7E", gap: "0.97–1.09 мм", sparkTorque: "16–24 Н·м",
    oil: "Двигатель: 20W-50 (H-D 360 / SYN3), сухой картер с баком; праймари — Primary Chaincase; КПП — Formula+ (три отдельных масла)",
    oilVol: "двигатель ≈ 3.8 л с фильтром (бак); праймари ≈ 0.95 л; КПП ≈ 0.7 л", oilInt: 8000,
    issues: [
      { t: "Износ башмаков натяжителей цепей ГРМ", sev: "high", fix: "Осмотр каждые 30–40 тыс. км; переход на гидронатяжители (2007+) или шестерённый привод." },
      { t: "Внутренние игольчатые подшипники распредвалов разрушаются", sev: "med", fix: "Менять вместе с натяжителями (подшипники полного комплекта)." },
      { t: "Перегрев задней головки в пробках, бедная смесь", sev: "med", fix: "Настройка карбюратора/прошивки, не стоять на холостых." },
      { t: "Течь по кольцам трубок толкателей", sev: "low", fix: "Новые кольца при обслуживании." }
    ] }, 2.6);
  CL("HD_TC88I", "HD_TC88", { code: "Twin Cam 88 EFI", name: "Harley-Davidson Twin Cam 88, инжектор (Dyna / Touring, V-twin 45°)",
    groups: ["air", "efi", "4t", "big"], ignition: "ЭБУ (EFI)", carb: "Инжектор Delphi ESPFI", jetMain: "—", jetPilot: "—", needle: "—" }, 2.6);
  CL("HD_TC88B", "HD_TC88", { code: "Twin Cam 88B", name: "Harley-Davidson Twin Cam 88B, карбюратор (Softail, с балансирами)",
    groups: ["air", "carb", "4t", "big", "balancer"], cam: "OHV, 4 клапана, 2 нижних распредвала + 2 балансирных вала, V-twin 45°",
    issues: ENGINES.HD_TC88.issues.slice(0, 3).concat([{ t: "Цепь и натяжители балансиров — шум у пробега", sev: "med", fix: "Осмотр вместе с цепями ГРМ, менять натяжители балансиров." }]) }, 2.6);
  CL("HD_TC88BI", "HD_TC88B", { code: "Twin Cam 88B EFI", name: "Harley-Davidson Twin Cam 88B, инжектор (Softail, с балансирами)",
    groups: ["air", "efi", "4t", "big", "balancer"], ignition: "ЭБУ (EFI)", carb: "Инжектор Delphi ESPFI", jetMain: "—", jetPilot: "—", needle: "—" }, 2.6);

  /* --- Twin Cam 96 / 103 / 110 (2007–2017, инжектор, 6 ст. Cruise Drive) --- */
  CL("HD_TC96", "HD_TC88I", { code: "Twin Cam 96", name: "Harley-Davidson Twin Cam 96 (Dyna / Touring, V-twin 45°)",
    cc: 1584, hp: 70, torque: "≈ 125 Н·м", compression: "≈ 10–11 бар (степень 9.2:1)", topRatio: 1.05,
    timing: "Цепь ГРМ (две цепи), гидронатяжители", gearbox: "6 ст. Cruise Drive, ремень",
    oilVol: "двигатель ≈ 3.8 л с фильтром (бак); праймари ≈ 1.0–1.1 л; КПП ≈ 0.95 л",
    issues: [
      { t: "Башмаки гидронатяжителей цепей ГРМ всё равно изнашиваются", sev: "med", fix: "Осмотр к 60–80 тыс. км, при износе — шестерённый привод или новые натяжители." },
      { t: "Компенсатор (демпфер) на коленвале — лязг при запуске", sev: "med", fix: "Обновлённый компенсатор (SE / 2011+)." },
      { t: "Перегрев задней головки в пробках, жар на ноги", sev: "med", fix: "Режим EITMS, тюнер прошивки, не стоять на холостых." },
      { t: "Масло в воздушном фильтре через сапуны", sev: "low", fix: "Не переливать бак, проверять уровень на горячем." }
    ] }, 2.6);
  CL("HD_TC96B", "HD_TC96", { code: "Twin Cam 96B", name: "Harley-Davidson Twin Cam 96B (Softail, с балансирами)",
    groups: ["air", "efi", "4t", "big", "balancer"], cam: "OHV, 4 клапана, 2 нижних распредвала + 2 балансирных вала, V-twin 45°" }, 2.6);
  CL("HD_TC103", "HD_TC96", { code: "Twin Cam 103", name: "Harley-Davidson Twin Cam 103 (Dyna / Touring, V-twin 45°)",
    cc: 1690, hp: 79, torque: "≈ 132–140 Н·м", compression: "≈ 10–11 бар (степень 9.6:1)" }, 2.6);
  CL("HD_TC103B", "HD_TC103", { code: "Twin Cam 103B", name: "Harley-Davidson Twin Cam 103B (Softail, с балансирами)",
    groups: ["air", "efi", "4t", "big", "balancer"], cam: "OHV, 4 клапана, 2 нижних распредвала + 2 балансирных вала, V-twin 45°" }, 2.6);
  CL("HD_TC110", "HD_TC103", { code: "Twin Cam 110", name: "Harley-Davidson Twin Cam 110 / 110B (CVO, Screamin' Eagle; V-twin 45°)",
    cc: 1802, hp: 93, torque: "≈ 150–160 Н·м", compression: "≈ 10–11 бар (степень 9.2:1)" }, 2.8);

  /* --- Milwaukee-Eight (2017+, инжектор, 4 клапана на цилиндр, 2 свечи на цилиндр) --- */
  RE("HD_M8_107", { region: "eu", code: "Milwaukee-Eight 107", name: "Harley-Davidson Milwaukee-Eight 107 (V-twin 45°)",
    maker: "Harley-Davidson", layout: "vtwin", vAngle: 45, groups: ["air", "efi", "4t", "big", "balancer"],
    cam: "OHV, 8 клапанов (4 на цилиндр), 1 нижний распредвал, балансир, V-twin 45°",
    cooling: "Воздушно-масляное (Twin-Cooled у части Touring — жидкостные головки)", coolant: "",
    cc: 1746, hp: 86, torque: "≈ 145–150 Н·м", compression: "≈ 11–12 бар (степень 10:1)", redline: 5500, topRatio: 1.05,
    fuel: "АИ-95", ignition: "ЭБУ (EFI), 2 свечи на цилиндр", timing: "Цепь ГРМ, гидронатяжитель, штанги толкателей", start: "Электро",
    gearbox: "6 ст., ремень", carb: "Инжектор", idle: "950–1050",
    valveIn: "гидрокомпенсаторы", valveEx: "гидрокомпенсаторы", valveInt: 0,
    spark: "NGK CR9EB / CR9EIX (2 на цилиндр)", gap: "≈ 0.8 мм", sparkTorque: "≈ 12–15 Н·м",
    oil: "Двигатель: 20W-50 (H-D SYN3 / 360); праймари и КПП — отдельные масла (Formula+ / SYN3)",
    oilVol: "двигатель ≈ 4.7 л с фильтром; праймари ≈ 0.9–1.1 л; КПП ≈ 0.7–0.95 л", oilInt: 8000,
    issues: [
      { t: "Масло в воздушном фильтре / повышенный расход (часть моторов 2017–2018)", sev: "med", fix: "Сервисная доработка сапуна, уровень по щупу на горячем." },
      { t: "Компенсатор на коленвале — лязг при запуске у пробега", sev: "med", fix: "Обновлённый компенсатор (2019+)." },
      { t: "Жар от заднего цилиндра в пробках", sev: "low", fix: "EITMS, тепловые экраны; Twin-Cooled на Ultra/Limited." },
      { t: "Шум гидрокомпенсаторов и износ натяжителя ГРМ на тюнингованных моторах", sev: "low", fix: "Масло по регламенту; при спортивных распредвалах — усиленный натяжитель." }
    ] }, 2.7);
  CL("HD_M8_114", "HD_M8_107", { code: "Milwaukee-Eight 114", name: "Harley-Davidson Milwaukee-Eight 114 (V-twin 45°)",
    cc: 1868, hp: 94, torque: "≈ 155 Н·м", compression: "≈ 11–12 бар (степень 10.5:1)" }, 2.7);
  CL("HD_M8_117", "HD_M8_107", { code: "Milwaukee-Eight 117", name: "Harley-Davidson Milwaukee-Eight 117 (V-twin 45°)",
    cc: 1923, hp: 103, torque: "≈ 168–175 Н·м", compression: "≈ 11–12 бар (степень 10.2:1)" }, 2.8);

  /* --- Revolution (V-Rod, 2002–2017) --- */
  RE("HD_VROD1130", { region: "eu", code: "Revolution 1130", name: "Harley-Davidson Revolution 1130 (V-Rod, V-twin 60°, жидкостный)",
    maker: "Harley-Davidson / Porsche", layout: "vtwin", vAngle: 60, groups: ["dohc", "liquid", "efi", "4t", "big"],
    cam: "DOHC, 8 клапанов, V-twin 60°", cc: 1131, hp: 115, torque: "≈ 100 Н·м", compression: "≈ 13 бар (степень 11.3:1)", redline: 9000, topRatio: 1.55,
    timing: "Цепь ГРМ", gearbox: "5 ст., ремень", idle: "1150–1250",
    valveIn: "0.195–0.245 мм", valveEx: "0.295–0.345 мм", valveInt: 24000,
    spark: "NGK DCPR8E", gap: "0.7–0.8 мм", sparkTorque: "≈ 23 Н·м",
    oil: "20W-50 (H-D SYN3 / 360), общее для мотора и КПП", oilVol: "≈ 4.5 л с фильтром", oilInt: 8000, coolant: "≈ 2.3 л",
    issues: [
      { t: "Клапаны на шайбах — регулировка долгая (снять бак/airbox, сдвинуть распредвал)", sev: "med", fix: "Делать по регламенту у знающего V-Rod мастера." },
      { t: "Реле-регулятор и статор (особенно 2002–2007)", sev: "med", fix: "Регулятор MOSFET, проверка зарядки." },
      { t: "Перегрев в пробках: вентилятор, термостат, антифриз", sev: "med", fix: "Проверять вентилятор и уровень антифриза." },
      { t: "Бензонасос в баке под сиденьем — ресурс", sev: "low", fix: "Фильтр насоса, не ездить на остатке топлива." }
    ] }, 2.7);
  CL("HD_VROD1250", "HD_VROD1130", { code: "Revolution 1250", name: "Harley-Davidson Revolution 1250 (V-Rod, V-twin 60°, жидкостный)",
    cc: 1247, hp: 122, torque: "≈ 115 Н·м", compression: "≈ 13 бар (степень 11.5:1)", gearbox: "5 ст., ремень, слипер-сцепление (2008+)" }, 2.7);

  /* --- Revolution X (Street 500 / 750, 2014–2020) --- */
  RE("HD_REVX750", { region: "eu", code: "Revolution X 750", name: "Harley-Davidson Revolution X 750 (Street 750 / Street Rod, V-twin 60°)",
    maker: "Harley-Davidson", layout: "vtwin", vAngle: 60, groups: ["liquid", "efi", "4t", "big"],
    cam: "SOHC, 8 клапанов (4 на цилиндр), V-twin 60°", cc: 749, hp: 53, torque: "≈ 59 Н·м", compression: "≈ 12 бар (степень 12:1)", redline: 8500,
    gearbox: "6 ст., ремень", idle: "1150–1250",
    valveIn: "0.15–0.20 мм", valveEx: "0.20–0.25 мм", valveInt: 24000,
    spark: "NGK CR9E / CR9EIX", gap: "0.7–0.8 мм", sparkTorque: "≈ 12 Н·м",
    oil: "20W-50 (H-D 360 / SYN3), общее для мотора и КПП", oilVol: "≈ 3.1 л с фильтром", oilInt: 8000, coolant: "≈ 1.5–2 л",
    issues: [
      { t: "Реле-регулятор (ранние 2015)", sev: "med", fix: "Проверить зарядку, обновлённый регулятор." },
      { t: "Перегрев и вентилятор в пробках", sev: "med", fix: "Антифриз по уровню, проверка вентилятора." },
      { t: "Разъёмы и масса — коррозия (сборка в Индии/США)", sev: "low", fix: "Диэлектрическая смазка, ревизия разъёмов." },
      { t: "Тугое включение нейтрали", sev: "low", fix: "Регулировка троса сцепления, свежее масло." }
    ] }, 2.2);
  CL("HD_REVX500", "HD_REVX750", { code: "Revolution X 500", name: "Harley-Davidson Revolution X 500 (Street 500, V-twin 60°)",
    cc: 494, hp: 46, torque: "≈ 40 Н·м" }, 2.1);

  /* --- Revolution Max (2021+, жидкостный, VVT, гидрокомпенсаторы) --- */
  RE("HD_RMAX1250", { region: "eu", code: "Revolution Max 1250", name: "Harley-Davidson Revolution Max 1250 (Pan America, V-twin 60°)",
    maker: "Harley-Davidson", layout: "vtwin", vAngle: 60, groups: ["dohc", "liquid", "efi", "4t", "big"],
    cam: "DOHC, 8 клапанов, VVT впуска и выпуска, V-twin 60°", cc: 1252, hp: 150, torque: "≈ 128 Н·м", compression: "степень 13:1", redline: 9500,
    timing: "Цепь ГРМ", gearbox: "6 ст., цепь", idle: "1100–1300",
    valveIn: "гидрокомпенсаторы", valveEx: "гидрокомпенсаторы", valveInt: 0,
    spark: "H-D по каталогу (2 свечи на цилиндр)", gap: "по мануалу", sparkTorque: "по мануалу",
    oil: "20W-50 (H-D SYN3 / Screamin' Eagle), общее для мотора, сцепления и КПП", oilVol: "≈ 4.5 л с фильтром", oilInt: 8000, coolant: "≈ 2–2.5 л",
    issues: [
      { t: "Ранние партии 2021–2022: отзывные кампании по ПО и электрике", sev: "med", fix: "Проверить выполнение сервисных кампаний у дилера." },
      { t: "Сложная электроника — диагностика только сканером H-D", sev: "med", fix: "Digital Technician / совместимый сканер." },
      { t: "Цепь привода и звёзды", sev: "low", fix: "Чистка и смазка каждые 500–800 км." }
    ] }, 2.7);
  CL("HD_RMAX1250T", "HD_RMAX1250", { code: "Revolution Max 1250T", name: "Harley-Davidson Revolution Max 1250T (Sportster S, V-twin 60°)",
    hp: 121, torque: "≈ 127 Н·м", compression: "степень 12:1",
    issues: [
      { t: "Жар от заднего цилиндра и выпуска на седло и ноги", sev: "low", fix: "Тепловые экраны, не стоять в пробках." },
      { t: "Сложная электроника — диагностика только сканером H-D", sev: "med", fix: "Digital Technician / совместимый сканер." },
      { t: "Цепь привода и звёзды", sev: "low", fix: "Чистка и смазка каждые 500–800 км." }
    ] }, 2.7);
  CL("HD_RMAX975T", "HD_RMAX1250T", { code: "Revolution Max 975T", name: "Harley-Davidson Revolution Max 975T (Nightster, V-twin 60°)",
    cc: 975, hp: 89, torque: "≈ 95 Н·м", gearbox: "6 ст., ремень", oilVol: "≈ 4 л с фильтром",
    issues: [
      { t: "Сложная электроника — диагностика только сканером H-D", sev: "med", fix: "Digital Technician / совместимый сканер." },
      { t: "Жар от заднего цилиндра в пробках", sev: "low", fix: "Тепловые экраны." }
    ] }, 2.6);

  /* --- X350 / X500 (моторы QJMotor/Benelli, рядная двойка) --- */
  CL("HD_X350", "T300B", { code: "HD X350", name: "Harley-Davidson X350 (рядная двойка 353, QJMotor)", maker: "Harley-Davidson / QJMotor",
    cc: 353, hp: 36, torque: "≈ 31 Н·м", compression: "≈ 12 бар", redline: 10000,
    valveIn: "0.15–0.20 мм", valveEx: "0.20–0.25 мм", valveInt: 24000, spark: "NGK CR8E", gap: "0.7–0.8 мм",
    oil: "15W-50 (JASO MA2)", oilVol: "≈ 2.5 л с фильтром", oilInt: 7000, coolant: "≈ 1.5 л",
    issues: [
      { t: "Мотор QJMotor (Benelli 302) — детали по каталогу QJ/Benelli", sev: "low", fix: "Сверять номер мотора при заказе." },
      { t: "Перегрев в пробках — вентилятор и антифриз", sev: "low", fix: "Проверять вентилятор перед сезоном." },
      { t: "Клапаны на шайбах — нужен набор шайб", sev: "med", fix: "Проверка по регламенту." }
    ] }, 1.5);
  CL("HD_X500", "TRK502", { code: "HD X500", name: "Harley-Davidson X500 (рядная двойка 500, QJMotor)", maker: "Harley-Davidson / QJMotor",
    hp: 47, torque: "≈ 46 Н·м", redline: 9500, valveInt: 24000, oil: "15W-50 (JASO MA2)", oilVol: "≈ 3.0 л с фильтром", oilInt: 8000,
    issues: [
      { t: "Мотор QJMotor (Benelli 500) — детали по каталогу QJ/Benelli", sev: "low", fix: "Сверять номер мотора при заказе." },
      { t: "Перегрев в пробках — вентилятор и антифриз", sev: "low", fix: "Проверять вентилятор перед сезоном." },
      { t: "Клапаны на шайбах — нужен набор шайб", sev: "med", fix: "Проверка по регламенту." }
    ] }, 1.6);

  /* ===================== Harley-Davidson: исправления существующих моделей ===================== */
  var H = "Harley-Davidson", A = { approx: true };
  function yrs(id, y) { return { years: y, label: y + " · " + ENGINES[id].code + ", " + ENGINES[id].cc + " см³" }; }
  setEngine(H, "Sportster Iron 883", 0, "HD_EVO883I", yrs("HD_EVO883I", "2009–2022"));
  setEngine(H, "Sportster 1200 Custom", 0, "HD_EVO1200C", yrs("HD_EVO1200C", "1996–2006"));
  addVersion(H, "Sportster 1200 Custom", "HD_EVO1200I", "2007–2020");
  setEngine(H, "Street 750", 0, "HD_REVX750", yrs("HD_REVX750", "2014–2020"));
  setEngine(H, "Softail Street Bob 114", 0, "HD_M8_114", yrs("HD_M8_114", "2021+"));
  setEngine(H, "Fat Boy 114", 0, "HD_M8_114", yrs("HD_M8_114", "2018+"));
  setEngine(H, "Road King", 0, "HD_EVO1340", yrs("HD_EVO1340", "1994–1998"));
  addVersion(H, "Road King", "HD_TC88", "1999–2006, карб.");
  addVersion(H, "Road King", "HD_TC88I", "1999–2006, EFI");
  addVersion(H, "Road King", "HD_TC96", "2007–2010");
  addVersion(H, "Road King", "HD_TC103", "2011–2016");
  addVersion(H, "Road King", "HD_M8_107", "2017–2021");

  /* ===================== Sportster ===================== */
  G(H, "Sportster 883", CH, [["HD_EVO883C", "1986–2006"], ["HD_EVO883I", "2007–2009"]]);
  G(H, "Sportster 883 Hugger", CH, [["HD_EVO883C", "1988–2003"]]);
  G(H, "Sportster 883 Custom", CH, [["HD_EVO883C", "1998–2006"], ["HD_EVO883I", "2007–2010"]]);
  G(H, "Sportster 883 Low", CH, [["HD_EVO883C", "2005–2006"], ["HD_EVO883I", "2007–2010"]]);
  G(H, "Sportster 883R", CH, [["HD_EVO883C", "2002–2006"], ["HD_EVO883I", "2007–2010"]]);
  G(H, "Sportster SuperLow 883", CH, [["HD_EVO883I", "2011–2020"]]);
  G(H, "Sportster Roadster 883", CH, [["HD_EVO883I", "2015–2016"]]);
  G(H, "Sportster 1200", CH, [["HD_EVO1200C", "1988–2003"]]);
  G(H, "Sportster 1200 Sport", CH, [["HD_EVO1200C", "1996–2003", { hp: 68 }]]);
  G(H, "Sportster 1200 Roadster", CH, [["HD_EVO1200C", "2004–2006"], ["HD_EVO1200I", "2007–2008"], ["HD_EVO1200I", "2016–2020"]]);
  G(H, "Sportster 1200 Low", CH, [["HD_EVO1200C", "2006"], ["HD_EVO1200I", "2007–2011"]]);
  G(H, "Sportster Nightster 1200", CH, [["HD_EVO1200I", "2007–2012"]]);
  G(H, "Sportster Forty-Eight", CH, [["HD_EVO1200I", "2010–2022"]]);
  G(H, "Sportster Forty-Eight Special", CH, [["HD_EVO1200I", "2018–2020"]]);
  G(H, "Sportster Seventy-Two", CH, [["HD_EVO1200I", "2012–2016"]]);
  G(H, "Sportster Iron 1200", CH, [["HD_EVO1200I", "2018–2020"]]);
  G(H, "Sportster SuperLow 1200T", CH, [["HD_EVO1200I", "2014–2017"]]);
  G(H, "Sportster XR1200 / XR1200X", NK, [["HD_XR1200", "2008–2012"]]);
  G(H, "Sportster S", CH, [["HD_RMAX1250T", "2021+"]]);
  G(H, "Nightster 975 / Special", CH, [["HD_RMAX975T", "2022+"]]);

  /* ===================== Dyna (1991–2017) ===================== */
  G(H, "Dyna Super Glide", CH, [["HD_EVO1340", "1995–1998"], ["HD_TC88", "1999–2006, карб."], ["HD_TC88I", "2004–2006, EFI"], ["HD_TC96", "2007–2010"]]);
  G(H, "Dyna Super Glide Custom", CH, [["HD_TC88", "2005–2006, карб."], ["HD_TC88I", "2005–2006, EFI"], ["HD_TC96", "2007–2014", A]]);
  G(H, "Dyna Super Glide Sport", CH, [["HD_TC88", "1999–2005, карб."], ["HD_TC88I", "2004–2005, EFI"]]);
  G(H, "Dyna Wide Glide", CH, [["HD_EVO1340", "1993–1998"], ["HD_TC88", "1999–2006, карб."], ["HD_TC88I", "2004–2006, EFI"], ["HD_TC96", "2007–2011"], ["HD_TC103", "2012–2017"]]);
  G(H, "Dyna Low Rider", CH, [["HD_EVO1340", "1993–1998"], ["HD_TC88", "1999–2006, карб."], ["HD_TC88I", "2004–2006, EFI"], ["HD_TC96", "2007–2009"], ["HD_TC103", "2014–2017"]]);
  G(H, "Dyna Low Rider S", CH, [["HD_TC110", "2016–2017", { hp: 98 }]]);
  G(H, "Dyna Street Bob", CH, [["HD_TC88", "2006, карб."], ["HD_TC96", "2007–2013"], ["HD_TC103", "2014–2017"]]);
  G(H, "Dyna Fat Bob", CH, [["HD_TC96", "2008–2011"], ["HD_TC103", "2012–2017"]]);
  G(H, "Dyna Switchback", CH, [["HD_TC103", "2012–2016"]]);

  /* ===================== Softail до 2017 ===================== */
  G(H, "Fat Boy", CH, [["HD_EVO1340", "1990–1999"], ["HD_TC88B", "2000–2006, карб."], ["HD_TC88BI", "2000–2006, EFI"], ["HD_TC96B", "2007–2011"], ["HD_TC103B", "2012–2017"], ["HD_M8_107", "2018–2020"]]);
  G(H, "Fat Boy Lo", CH, [["HD_TC96B", "2010–2011"], ["HD_TC103B", "2012–2016"]]);
  G(H, "Heritage Softail Classic", CH, [["HD_EVO1340", "1986–1999"], ["HD_TC88B", "2000–2006, карб."], ["HD_TC88BI", "2000–2006, EFI"], ["HD_TC96B", "2007–2011"], ["HD_TC103B", "2012–2017"]]);
  G(H, "Softail Deluxe", CH, [["HD_TC88B", "2005–2006, карб."], ["HD_TC88BI", "2005–2006, EFI"], ["HD_TC96B", "2007–2011"], ["HD_TC103B", "2012–2017"], ["HD_M8_107", "2018–2020"]]);
  G(H, "Softail Slim", CH, [["HD_TC103B", "2012–2017"], ["HD_M8_107", "2018–2021"]]);
  G(H, "Softail Night Train", CH, [["HD_EVO1340", "1998–1999"], ["HD_TC88B", "2000–2006, карб."], ["HD_TC88BI", "2000–2006, EFI"], ["HD_TC96B", "2007–2009"]]);
  G(H, "Softail Springer", CH, [["HD_EVO1340", "1988–1999"], ["HD_TC88B", "2000–2006, карб."], ["HD_TC88BI", "2000–2006, EFI"]]);
  G(H, "Softail Standard", CH, [["HD_EVO1340", "1984–1999"], ["HD_TC88B", "2000–2006, карб."], ["HD_TC96B", "2007"], ["HD_M8_107", "2020–2024"]]);
  G(H, "Softail Deuce", CH, [["HD_TC88B", "2000–2006, карб."], ["HD_TC88BI", "2000–2006, EFI"], ["HD_TC96B", "2007"]]);
  G(H, "Softail Cross Bones", CH, [["HD_TC96B", "2008–2011"]]);
  G(H, "Softail Rocker C", CH, [["HD_TC96B", "2008–2011"]]);
  G(H, "Softail Blackline", CH, [["HD_TC96B", "2011"], ["HD_TC103B", "2012–2013"]]);
  G(H, "Breakout", CH, [["HD_TC103B", "2013–2017"], ["HD_M8_107", "2018–2020"], ["HD_M8_114", "2018–2022"], ["HD_M8_117", "2023+"]]);

  /* ===================== Softail с 2018 (Milwaukee-Eight) ===================== */
  G(H, "Heritage Classic", CH, [["HD_M8_107", "2018–2020"], ["HD_M8_114", "2018+"]]);
  G(H, "Softail Street Bob", CH, [["HD_M8_107", "2018–2020"]]);
  G(H, "Softail Low Rider", CH, [["HD_M8_107", "2018–2021"]]);
  G(H, "Low Rider S", CH, [["HD_M8_114", "2020–2021"], ["HD_M8_117", "2022+"]]);
  G(H, "Low Rider ST", CH, [["HD_M8_117", "2022+"]]);
  G(H, "Fat Bob", CH, [["HD_M8_107", "2018–2021"], ["HD_M8_114", "2018+"]]);
  G(H, "Sport Glide", CH, [["HD_M8_107", "2018–2021"]]);
  G(H, "FXDR 114", CH, [["HD_M8_114", "2019–2021"]]);

  /* ===================== Touring ===================== */
  G(H, "Electra Glide", TR, [["HD_EVO1340", "1984–1998"], ["HD_TC88", "1999–2006, карб."], ["HD_TC88I", "1999–2006, EFI"], ["HD_TC96", "2007–2010"], ["HD_TC103", "2011–2016"], ["HD_M8_107", "2017–2023", A]]);
  G(H, "Electra Glide Ultra Classic", TR, [["HD_EVO1340", "1989–1998"], ["HD_TC88", "1999–2006, карб."], ["HD_TC88I", "1999–2006, EFI"], ["HD_TC96", "2007–2010"], ["HD_TC103", "2011–2016"], ["HD_M8_107", "2017–2019"]]);
  G(H, "Electra Glide Ultra Limited", TR, [["HD_TC103", "2010–2016"], ["HD_M8_107", "2017–2019"], ["HD_M8_114", "2020–2023"]]);
  G(H, "Road King Classic", TR, [["HD_EVO1340", "1998"], ["HD_TC88", "1999–2006, карб."], ["HD_TC88I", "1999–2006, EFI"], ["HD_TC96", "2007–2010"], ["HD_TC103", "2011–2016"], ["HD_M8_107", "2017–2019"]]);
  G(H, "Road King Special", TR, [["HD_M8_107", "2017–2020"], ["HD_M8_114", "2021+"]]);
  G(H, "Street Glide", TR, [["HD_TC88I", "2006"], ["HD_TC96", "2007–2009"], ["HD_TC103", "2010–2016"], ["HD_M8_107", "2017–2020"], ["HD_M8_114", "2021–2023", A], ["HD_M8_117", "2024+"]]);
  G(H, "Street Glide Special", TR, [["HD_TC103", "2014–2016"], ["HD_M8_107", "2017–2018"], ["HD_M8_114", "2019–2023"]]);
  G(H, "Road Glide", TR, [["HD_EVO1340", "1998"], ["HD_TC88", "1999–2006, карб."], ["HD_TC88I", "1999–2006, EFI"], ["HD_TC96", "2007–2009"], ["HD_TC103", "2010–2016"], ["HD_M8_107", "2017–2020"], ["HD_M8_114", "2021–2023", A], ["HD_M8_117", "2024+"]]);
  G(H, "Road Glide Special", TR, [["HD_TC103", "2015–2016"], ["HD_M8_107", "2017–2018"], ["HD_M8_114", "2019–2023"]]);
  G(H, "Road Glide Ultra", TR, [["HD_TC103", "2011–2016"], ["HD_M8_107", "2017–2019"]]);
  G(H, "Road Glide Limited", TR, [["HD_M8_114", "2020–2023"]]);
  G(H, "CVO Street Glide", TR, [["HD_TC110", "2010–2016"], ["HD_M8_114", "2017–2018", { hp: 99 }], ["HD_M8_117", "2019–2022"]]);
  G(H, "CVO Limited", TR, [["HD_TC110", "2014–2016"], ["HD_M8_114", "2017–2018", { hp: 99 }], ["HD_M8_117", "2019"]]);

  /* ===================== V-Rod (VRSC) ===================== */
  G(H, "V-Rod", CH, [["HD_VROD1130", "2002–2006"], ["HD_VROD1250", "2007–2010"]]);
  G(H, "V-Rod Night Rod", CH, [["HD_VROD1130", "2006–2007"], ["HD_VROD1250", "2008"]]);
  G(H, "V-Rod Night Rod Special", CH, [["HD_VROD1250", "2007–2017", { hp: 125 }]]);
  G(H, "V-Rod Muscle", CH, [["HD_VROD1250", "2009–2017"]]);
  G(H, "V-Rod Street Rod VRSCR", CH, [["HD_VROD1130", "2006–2007", { hp: 120 }]]);

  /* ===================== Street, Pan America, X ===================== */
  G(H, "Street 500", CH, [["HD_REVX500", "2014–2020"]]);
  G(H, "Street Rod", NK, [["HD_REVX750", "2017–2020", { hp: 69 }]]);
  G(H, "Pan America 1250 / Special", AD, [["HD_RMAX1250", "2021+"]]);
  G(H, "Pan America 1250 ST", AD, [["HD_RMAX1250", "2025+"]]);
  G(H, "X350", NK, [["HD_X350", "2023+"]]);
  G(H, "X500", NK, [["HD_X500", "2023+"]]);

  /* ===================== Buell (моторы на базе Harley Sportster + Rotax 1125) ===================== */
  CL("BU_1203C", "HD_EVO1200C", { code: "Buell Thunderstorm 1203 (карб.)", name: "Buell Thunderstorm 1203, карбюратор (V-twin 45°, база Sportster)",
    maker: "Buell / Harley-Davidson", hp: 91, torque: "≈ 110 Н·м", compression: "≈ 11 бар (степень 10:1)", redline: 6500, topRatio: 1.5,
    carb: "Keihin CV 40 мм", spark: "H-D 6R12 / NGK DCPR7E", gearbox: "5 ст., ремень",
    issues: [
      { t: "Мотор-«Спортстер» с форсированными головками: жар задней головки", sev: "med", fix: "Масло по регламенту, не стоять в пробках." },
      { t: "Ремень привода — камни и износ", sev: "med", fix: "Осмотр ремня и шкивов каждые 8 тыс. км." },
      { t: "Реле-регулятор и статор", sev: "med", fix: "Проверка зарядки, разъём статора." },
      { t: "Редкие запчасти рамы и пластика (марка закрыта в 2009)", sev: "low", fix: "Мотор и расходники — по каталогу Harley Sportster." }
    ] }, 2.6);
  CL("BU_1203I", "BU_1203C", { code: "Buell Thunderstorm 1203 DDFI", name: "Buell Thunderstorm 1203, инжектор DDFI (V-twin 45°)",
    groups: ["air", "efi", "4t", "big"], ignition: "ЭБУ (DDFI)", carb: "Инжектор DDFI", jetMain: "—", jetPilot: "—", needle: "—", hp: 92 }, 2.6);
  CL("BU_XB12", "BU_1203I", { code: "Buell XB12 (1203)", name: "Buell XB12 Thunderstorm 1203 (V-twin 45°, масло в маятнике)",
    cooling: "Воздушно-масляное", hp: 103, torque: "≈ 114 Н·м", compression: "≈ 11 бар (степень 10:1)", redline: 6800,
    carb: "Инжектор DDFI II / DDFI III", ignition: "ЭБУ (DDFI)", spark: "NGK DCPR8E (H-D 6R12 — по году)",
    oil: "Двигатель: 20W-50 (H-D 360 / SYN3), бак в маятнике; праймари + КПП — отдельное масло (Formula+)",
    oilVol: "двигатель ≈ 2.4 л с фильтром (в маятнике); праймари + КПП ≈ 0.95 л",
    issues: [
      { t: "Ролик натяжителя ремня (idler) и узкий ремень — камни рвут ремень", sev: "high", fix: "Осмотр ремня и ролика при каждом ТО, менять ролик при люфте." },
      { t: "Уровень масла в маятнике проверяют на горячем, мотоцикл ровно", sev: "low", fix: "Не переливать — масло уходит в сапун и airbox." },
      { t: "Реле-регулятор и статор", sev: "med", fix: "Проверка зарядки, разъём статора." },
      { t: "Бензин в раме, бензонасос и прокладки горловины", sev: "low", fix: "Фильтр насоса, проверка на подтёки." }
    ] }, 2.6);
  CL("BU_XB9", "BU_XB12", { code: "Buell XB9 (984)", name: "Buell XB9 Thunderstorm 984 (короткоходный V-twin 45°)",
    cc: 984, hp: 92, torque: "≈ 92 Н·м", redline: 7500 }, 2.6);
  CL("BU_BLAST", "HD_EVO883C", { code: "Buell Blast 492", name: "Buell Blast 492 (одноцилиндровый, половина Sportster 1200)",
    maker: "Buell / Harley-Davidson", layout: "single", vAngle: undefined, groups: ["air", "carb", "4t", "big"],
    cam: "OHV, 2 клапана, штанги", cc: 492, hp: 34, torque: "≈ 41 Н·м", compression: "≈ 10 бар (степень 9.2:1)", redline: 6500, topRatio: 1.4,
    carb: "Keihin CV 40 мм", jetMain: "по мануалу", jetPilot: "по мануалу", gearbox: "5 ст., ремень",
    spark: "H-D 6R12 / NGK DCPR7E", oilVol: "двигатель ≈ 1.9 л с фильтром (бак в раме); праймари + КПП ≈ 0.7 л",
    issues: [
      { t: "Сильные вибрации одноцилиндрового мотора — откручивается крепёж", sev: "low", fix: "Фиксатор резьбы, контроль крепежа." },
      { t: "Ремень привода и шкивы", sev: "low", fix: "Осмотр при каждом ТО." },
      { t: "Карбюратор бедный (EPA) — провалы на холодную", sev: "med", fix: "Настройка CV40, прогрев." }
    ] }, 2.0);
  RE("BU_1125", { region: "eu", code: "Rotax Helicon 1125", name: "Buell 1125 Helicon (Rotax, V-twin 72°, жидкостный)",
    maker: "Buell / BRP-Rotax", layout: "vtwin", vAngle: 72, groups: ["dohc", "liquid", "efi", "4t", "big"],
    cam: "DOHC, 8 клапанов, рокеры-«пальцы» и шайбы, V-twin 72°", cc: 1125, hp: 146, torque: "≈ 111 Н·м", compression: "степень 12.3:1", redline: 10500,
    timing: "Цепь ГРМ", gearbox: "6 ст., ремень", idle: "1150–1300",
    valveIn: "≈ 0.10–0.15 мм (сверяй с мануалом)", valveEx: "≈ 0.25–0.30 мм (сверяй с мануалом)", valveInt: 24000,
    spark: "NGK CR9EKB", gap: "0.81 мм", sparkTorque: "10–12 Н·м",
    oil: "Синтетика 15W-50…20W-50 (по мануалу H-D/Buell 1125), общее для мотора и КПП", oilVol: "≈ 2.6 л с фильтром", oilInt: 8000, coolant: "≈ 2.5 л",
    issues: [
      { t: "Статор и реле-регулятор (особенно 2008)", sev: "high", fix: "Обновлённый статор/регулятор по сервисной кампании." },
      { t: "Рывки и неровная тяга на низах — прошивка ЭБУ", sev: "med", fix: "Обновление прошивки ECM (ECMSpy / дилер)." },
      { t: "Перегрев в пробках, вентиляторы в боковых радиаторах", sev: "med", fix: "Проверка вентиляторов и антифриза." },
      { t: "Запчасти — через Rotax/Buell, марка закрыта", sev: "low", fix: "Расходники заказывать заранее." }
    ] }, 2.6);

  var BU = "Buell";
  G(BU, "S1 Lightning", NK, [["BU_1203C", "1996–1998"]]);
  G(BU, "M2 Cyclone", NK, [["BU_1203C", "1997–2002", { hp: 86 }]]);
  G(BU, "X1 Lightning", NK, [["BU_1203I", "1999–2002"]]);
  G(BU, "S3 Thunderbolt", TR, [["BU_1203C", "1997–1998"], ["BU_1203I", "1999–2002"]]);
  G(BU, "XB9R Firebolt", SP, [["BU_XB9", "2003–2009"]]);
  G(BU, "XB9S Lightning", NK, [["BU_XB9", "2003–2009"]]);
  G(BU, "XB9SX Lightning CityX", NK, [["BU_XB9", "2005–2009"]]);
  G(BU, "XB12R Firebolt", SP, [["BU_XB12", "2004–2009"]]);
  G(BU, "XB12S Lightning", NK, [["BU_XB12", "2004–2009"]]);
  G(BU, "XB12Ss Lightning Long", NK, [["BU_XB12", "2005–2010"]]);
  G(BU, "XB12X Ulysses", AD, [["BU_XB12", "2006–2010"]]);
  G(BU, "XB12STT Super TT", "Мотард", [["BU_XB12", "2008–2009"]]);
  G(BU, "1125R", SP, [["BU_1125", "2008–2010"]]);
  G(BU, "1125CR", NK, [["BU_1125", "2009–2010"]]);
  G(BU, "Blast", NK, [["BU_BLAST", "2000–2009"]]);
})();

/* ===================== v28: Suzuki — свои моторы вместо сборных, новые модели ===================== */
(function () {
  var NK = "Нейкед", SP = "Спорт", CH = "Чоппер", TR = "Турер", AD = "Тур-эндуро", EN = "Эндуро", LE = "Лёгкий эндуро",
    MO = "Мотард", KR = "Кросс-эндуро", PB = "Питбайк", KL = "Классика", A = { approx: true };
  var CARB = { groups: ["dohc", "liquid", "carb", "4t", "big"], ignition: "Транзисторное (TCI)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу" };
  function x(base, o) { var r = {}, k; for (k in base) r[k] = base[k]; for (k in o) r[k] = o[k]; return r; }
  /* поколения у существующей модели: версия 0 — самое старое поколение, остальные добавляются по порядку */
  function gens(name, list) {
    list.forEach(function (g, i) {
      var e = ENGINES[g[0]];
      if (i === 0) setEngine("Suzuki", name, 0, g[0], x({ years: g[1], label: g[1] + " · " + e.code + ", " + e.cc + " см³" }, g[2] || {}));
      else addVersion("Suzuki", name, g[0], g[1], g[2]);
    });
  }

  /* ================= МОТОРЫ ================= */
  /* --- GSX-R600 --- */
  RE("SUZ_GSXR600W", x(CARB, { region: "jp", code: "GSX-R600 SRAD", name: "Suzuki GSX-R600 SRAD 1997–2000 (рядная четвёрка 599, карбюраторы)",
    maker: "Suzuki", layout: "i4", cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 599, hp: 105, torque: "≈ 63 Н·м", compression: "≈ 12 бар", redline: 13500,
    carb: "Mikuni BSR36 ×4", idle: "1150–1350", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR9E", gap: "0.7–0.8 мм", sparkTorque: "11 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "≈ 3.4 л с фильтром", oilInt: 6000, valveInt: 24000, coolant: "≈ 2.6 л",
    issues: [{ t: "Реле-регулятор и статор греются — садится АКБ", sev: "med", fix: "Проверка зарядки 13.5–14.5 В, регулятор MOSFET." },
      { t: "Синхронизация карбюраторов сбивается — рывки на малом газе", sev: "low", fix: "Синхронизация вакуумметром, чистка карбюраторов." },
      { t: "Возраст: сальники вилки, подшипники рулевой, проводка", sev: "med", fix: "Ревизия при покупке, трековое прошлое — проверь раму." }] }), 2.2);
  CL("SUZ_GSXR600K1", "SUZ_GSXR600W", { code: "GSX-R600 (K1–K5)", name: "Suzuki GSX-R600 2001–2005 (рядная четвёрка 599, инжектор)", hp: 117, torque: "≈ 67 Н·м",
    compression: "≈ 12.2 бар", redline: 15000, groups: ["dohc", "liquid", "efi", "4t", "big", "jp"], carb: "Инжектор (SDTV)", ignition: "ЭБУ (EFI)", jetMain: "—", jetPilot: "—", needle: "—",
    oilVol: "≈ 3.4 л с фильтром", issues: [{ t: "Реле-регулятор — частая причина разряда АКБ", sev: "med", fix: "Проверка зарядки, регулятор MOSFET." },
      { t: "Натяжитель цепи ГРМ (автомат) — лязг на холодную", sev: "med", fix: "Замена натяжителя, цепь — по износу." },
      { t: "Хруст КПП на 2-й передаче после трека", sev: "low", fix: "Переключать уверенно, проверять КПП при покупке." }] }, 2.2);
  CL("SUZ_GSXR600K6", "SUZ_GSXR600K1", { code: "GSX-R600 (K6–K9)", name: "Suzuki GSX-R600 2006–2010 (рядная четвёрка 599)", hp: 125, torque: "≈ 68 Н·м",
    compression: "≈ 12.8 бар", redline: 15500, spark: "NGK CR9EIA-9", oilVol: "≈ 3.4 л с фильтром" }, 2.3);
  CL("SUZ_GSXR600L1", "SUZ_GSXR600K6", { code: "GSX-R600 (L1+)", name: "Suzuki GSX-R600 2011+ (рядная четвёрка 599)", hp: 124, torque: "≈ 70 Н·м" }, 2.3);
  CL("SUZ_GSR600", "SUZ_GSXR600K1", { code: "GSR600 (K6)", name: "Suzuki GSR600 (рядная четвёрка 599 от GSX-R600 K4)", hp: 98, torque: "≈ 65 Н·м", redline: 13500,
    issues: [{ t: "Выпуск под сиденьем греет райдера и пассажира", sev: "low", fix: "Теплоизоляция, тюнинг-выпуск." },
      { t: "Реле-регулятор", sev: "med", fix: "Проверка зарядки, регулятор MOSFET." }] }, 2.1);
  /* --- GSX-R750 / GSR750 --- */
  RE("SUZ_GSXR750T", x(CARB, { region: "jp", code: "GSX-R750 SRAD (T/V)", name: "Suzuki GSX-R750 SRAD 1996–1997 (рядная четвёрка 749, карбюраторы)",
    maker: "Suzuki", layout: "i4", cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 749, hp: 128, torque: "≈ 79 Н·м", compression: "≈ 12 бар", redline: 13500,
    carb: "Mikuni BDSR39 ×4", idle: "1150–1350", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR9E", gap: "0.7–0.8 мм", sparkTorque: "11 Н·м",
    oilVol: "≈ 3.6 л с фильтром", oilInt: 6000, valveInt: 24000, coolant: "≈ 2.6 л",
    issues: [{ t: "Реле-регулятор и статор", sev: "med", fix: "Проверка зарядки, регулятор MOSFET." },
      { t: "Возраст: карбюраторы, проводка, рама после падений", sev: "med", fix: "Ревизия при покупке, синхронизация." }] }), 2.3);
  CL("SUZ_GSXR750W", "SUZ_GSXR750T", { code: "GSX-R750 SRAD (W/X)", name: "Suzuki GSX-R750 SRAD 1998–1999 (рядная четвёрка 749, инжектор)", hp: 135, torque: "≈ 81 Н·м",
    groups: ["dohc", "liquid", "efi", "4t", "big", "jp"], carb: "Инжектор", ignition: "ЭБУ (EFI)", jetMain: "—", jetPilot: "—", needle: "—" }, 2.3);
  CL("SUZ_GSXR750K0", "SUZ_GSXR750W", { code: "GSX-R750 (K0–K5)", name: "Suzuki GSX-R750 2000–2005 (рядная четвёрка 749)", hp: 141, torque: "≈ 83 Н·м",
    compression: "≈ 12.3 бар", redline: 14000, carb: "Инжектор (SDTV)" }, 2.3);
  CL("SUZ_GSXR750K6", "SUZ_GSXR750K0", { code: "GSX-R750 (K6–K9)", name: "Suzuki GSX-R750 2006–2010 (рядная четвёрка 750)", cc: 750, hp: 148, torque: "≈ 86 Н·м",
    compression: "≈ 12.5 бар", spark: "NGK CR9EIA-9" }, 2.4);
  CL("SUZ_GSR750", "SUZ_GSXR750K0", { code: "GSR750 (L1)", name: "Suzuki GSR750 / GSX-S750 (рядная четвёрка 749 от GSX-R750 K5)", hp: 106, torque: "≈ 80 Н·м",
    redline: 11500, spark: "NGK CR9EIA-9", issues: [{ t: "Резкий отклик газа на малых оборотах (ранние прошивки)", sev: "low", fix: "Обновление ПО, аккуратная работа газом." },
      { t: "Реле-регулятор", sev: "low", fix: "Контроль зарядки." }] }, 2.2);
  /* --- GSX-R1000 / GSX-S1000 --- */
  RE("SUZ_GSXR1000K1", { region: "jp", code: "GSX-R1000 (K1–K4)", name: "Suzuki GSX-R1000 2001–2004 (рядная четвёрка 988)", maker: "Suzuki", layout: "i4",
    groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 988, hp: 160, torque: "≈ 110 Н·м", compression: "≈ 12 бар", redline: 13500,
    carb: "Инжектор (SDTV)", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR9E", sparkTorque: "11 Н·м", oilVol: "≈ 3.6 л с фильтром",
    oilInt: 6000, valveInt: 24000, coolant: "≈ 2.7 л", fuel: "АИ-95/98",
    issues: [{ t: "Реле-регулятор и статор — разряд АКБ", sev: "med", fix: "Регулятор MOSFET, проверка разъёма статора." },
      { t: "Шлицы/вторичный вал и сцепление после стантов", sev: "med", fix: "Проверка сцепления и звезды при покупке." },
      { t: "Рулевая «дерётся» без демпфера", sev: "low", fix: "Рулевой демпфер." }] }, 2.5);
  CL("SUZ_GSXR1000K5", "SUZ_GSXR1000K1", { code: "GSX-R1000 (K5–K8)", name: "Suzuki GSX-R1000 2005–2008 (рядная четвёрка 999)", cc: 999, hp: 178, torque: "≈ 116 Н·м",
    compression: "≈ 12.5 бар", redline: 13750, spark: "NGK CR9EIA-9" }, 2.5);
  CL("SUZ_GSXR1000K9", "SUZ_GSXR1000K5", { code: "GSX-R1000 (K9–L6)", name: "Suzuki GSX-R1000 2009–2016 (рядная четвёрка 999)", hp: 185, torque: "≈ 117 Н·м",
    compression: "≈ 12.8 бар", redline: 14000 }, 2.5);
  CL("SUZ_GSXR1000L7", "SUZ_GSXR1000K9", { code: "GSX-R1000 (L7+)", name: "Suzuki GSX-R1000 / R 2017+ (рядная четвёрка 999, SR-VVT)", hp: 202, torque: "≈ 118 Н·м",
    compression: "≈ 13.2 бар", redline: 14500, cam: "DOHC, 16 клапанов, рычаги-толкатели, SR-VVT", spark: "NGK CR9EIA-9",
    issues: [{ t: "Сложная электроника (IMU, quickshifter) — диагностика сканером Suzuki", sev: "med", fix: "Диагностика у дилера/SDS-адаптер." },
      { t: "Клапаны на рычагах — регулировка сложнее, чем на старых K-сериях", sev: "low", fix: "Строго по мануалу, регламент 24 тыс. км." }] }, 2.7);
  CL("SUZ_GSXS1000", "SUZ_GSXR1000K5", { code: "GSX-S1000 (L5)", name: "Suzuki GSX-S1000 / Katana / GSX-S1000GT / GX (рядная четвёрка 999 от GSX-R1000 K5)",
    hp: 150, torque: "≈ 106 Н·м", redline: 11500, compression: "≈ 12.2 бар",
    issues: [{ t: "Резкий отклик газа у ранних (2015–2016) — «рывок» с закрытого газа", sev: "low", fix: "Перепрошивка/новые прошивки, с 2021 — ride-by-wire." },
      { t: "Мотор выносливый — следи за цепью и регулятором", sev: "low", fix: "ТО по регламенту." }] }, 2.4);
  /* --- Hayabusa, B-King, GSX1400 --- */
  RE("SUZ_HAYA1", { region: "jp", code: "GSX1300R (X–K7)", name: "Suzuki GSX1300R Hayabusa 1999–2007 (рядная четвёрка 1299)", maker: "Suzuki", layout: "i4",
    groups: ["dohc", "liquid", "efi", "4t", "big", "balancer"], cam: "DOHC, 16 клапанов, 4 цилиндра, балансирный вал", cc: 1299, hp: 175, torque: "≈ 138 Н·м",
    compression: "≈ 11 бар", redline: 11000, carb: "Инжектор (SDTV)", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR9E", sparkTorque: "11 Н·м",
    oilVol: "≈ 3.7 л с фильтром", oilInt: 6000, valveInt: 24000, coolant: "≈ 3 л",
    issues: [{ t: "Натяжитель цепи ГРМ (автомат) — стук на холодную", sev: "med", fix: "Ручной/новый натяжитель." },
      { t: "Статор и реле-регулятор перегреваются", sev: "med", fix: "Регулятор MOSFET, проверить разъёмы." },
      { t: "Пробуксовка сцепления у тюнингованных", sev: "low", fix: "Усиленные пружины/диски." }] }, 2.6);
  CL("SUZ_HAYA2", "SUZ_HAYA1", { code: "GSX1300R (K8–M0)", name: "Suzuki Hayabusa 2008–2020 / B-King (рядная четвёрка 1340)", cc: 1340, hp: 197, torque: "≈ 155 Н·м",
    compression: "≈ 12.5 бар", spark: "NGK CR9EIA-9", oilVol: "≈ 4 л с фильтром",
    issues: [{ t: "Натяжитель цепи ГРМ", sev: "med", fix: "Замена при лязге на холодную." },
      { t: "Статор и реле-регулятор", sev: "med", fix: "Регулятор MOSFET." },
      { t: "Задний подшипник/шины быстро изнашиваются от момента", sev: "low", fix: "Контроль резины и цепи." }] }, 2.7);
  CL("SUZ_HAYA3", "SUZ_HAYA2", { code: "GSX1300R (M1+)", name: "Suzuki Hayabusa 2021+ (рядная четвёрка 1340, ride-by-wire)", hp: 190, torque: "≈ 150 Н·м",
    issues: [{ t: "Сложная электроника — диагностика сканером Suzuki", sev: "med", fix: "Дилер / SDS-адаптер." },
      { t: "Ресурсный мотор, но дорогие расходники", sev: "low", fix: "ТО по регламенту." }] }, 2.8);
  RE("SUZ_GSX1400", { region: "jp", code: "GSX1400 (K1)", name: "Suzuki GSX1400 (рядная четвёрка 1402, воздушно-масляная)", maker: "Suzuki", layout: "i4",
    groups: ["dohc", "air", "efi", "4t", "big"], cooling: "Воздушно-масляное (SACS)", cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 1402, hp: 106, torque: "≈ 126 Н·м",
    compression: "≈ 9.5 бар", redline: 9500, carb: "Инжектор (SDTV)", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR8E", sparkTorque: "11 Н·м",
    oilVol: "≈ 5 л с фильтром", oilInt: 6000, valveInt: 24000, fuel: "АИ-92/95",
    issues: [{ t: "Сильный нагрев масла в пробках", sev: "med", fix: "Масло по уровню, не стоять долго на месте." },
      { t: "Реле-регулятор", sev: "med", fix: "Контроль зарядки." },
      { t: "Тяжёлый — износ подшипников рулевой и маятника", sev: "low", fix: "Ревизия при покупке." }] }, 2.4);
  /* --- воздушно-масляные четвёрки: GSF600 / GSX600F / GSX750F / GSF650 / GSF1200 --- */
  RE("SUZ_GSF600", x(CARB, { region: "jp", code: "GSF600 (N7)", name: "Suzuki GSF600 Bandit (рядная четвёрка 599, воздушно-масляная)", maker: "Suzuki", layout: "i4",
    groups: ["dohc", "air", "carb", "4t", "big"], cooling: "Воздушно-масляное (SACS)", cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 599, hp: 78, torque: "≈ 54 Н·м",
    compression: "≈ 11.3 бар", redline: 11500, gearbox: "6 ст.", carb: "Mikuni BSR32 ×4", idle: "1100–1300", valveIn: "0.10–0.15 мм", valveEx: "0.18–0.23 мм",
    spark: "NGK CR9E", sparkTorque: "11 Н·м", oilVol: "≈ 3.6 л с фильтром", oilInt: 6000, valveInt: 12000, fuel: "АИ-92/95",
    issues: [{ t: "Реле-регулятор — горит, садит АКБ", sev: "med", fix: "Регулятор MOSFET, чистые разъёмы." },
      { t: "Карбюраторы после зимы — плавающий холостой", sev: "low", fix: "Чистка, синхронизация." },
      { t: "Натяжитель цепи ГРМ на пробеге", sev: "low", fix: "Замена при лязге." }] }), 2.0);
  CL("SUZ_GSX600F", "SUZ_GSF600", { code: "GSX600F", name: "Suzuki GSX600F Katana (рядная четвёрка 599, воздушно-масляная)", hp: 86, torque: "≈ 56 Н·м", redline: 12000 }, 2.0);
  CL("SUZ_GSX750F", "SUZ_GSF600", { code: "GSX750F", name: "Suzuki GSX750F Katana / GSX750 Inazuma (рядная четвёрка 748, воздушно-масляная)", cc: 748, hp: 92,
    torque: "≈ 69 Н·м", redline: 11000, carb: "Mikuni BSR33/BSR36 ×4" }, 2.1);
  CL("SUZ_GSF650A", "SUZ_GSF600", { code: "GSF650 (K5)", name: "Suzuki GSF650 Bandit 2005–2006 (рядная четвёрка 656, воздушно-масляная)", cc: 656, hp: 78,
    torque: "≈ 60 Н·м", redline: 11000 }, 2.0);
  RE("SUZ_GSF1200", x(CARB, { region: "jp", code: "GSF1200 (T–K6)", name: "Suzuki GSF1200 Bandit / GSX1200 Inazuma (рядная четвёрка 1157, воздушно-масляная)",
    maker: "Suzuki", layout: "i4", groups: ["dohc", "air", "carb", "4t", "big"], cooling: "Воздушно-масляное (SACS)", cam: "DOHC, 16 клапанов, 4 цилиндра",
    cc: 1157, hp: 98, torque: "≈ 91 Н·м", compression: "≈ 9.5 бар", redline: 10500, gearbox: "5 ст.", carb: "Mikuni BSR36 ×4", idle: "1000–1200",
    valveIn: "0.03–0.08 мм", valveEx: "0.08–0.13 мм", spark: "NGK JR9B", gap: "0.6–0.7 мм", sparkTorque: "11 Н·м", oilVol: "≈ 4.0 л с фильтром",
    oilInt: 6000, valveInt: 24000, fuel: "АИ-92/95",
    issues: [{ t: "Реле-регулятор и разъём статора подгорают", sev: "med", fix: "Регулятор MOSFET, перепаять разъём." },
      { t: "Перегрев масла в пробках (воздушно-масляное)", sev: "med", fix: "Масло по уровню, маслорадиатор в порядке." },
      { t: "Износ пружин вилки и сайлентблоков — «гуляет» на скорости", sev: "low", fix: "Пружины/масло вилки, подшипники рулевой." }] }), 2.3);
  /* --- жидкостные Bandit 650/1250, GSX650F, GSX1250FA --- */
  RE("SUZ_GSF1250", { region: "jp", code: "GSF1250 (K7)", name: "Suzuki GSF1250 Bandit / GSX1250FA (рядная четвёрка 1255)", maker: "Suzuki", layout: "i4",
    groups: ["dohc", "liquid", "efi", "4t", "big", "balancer"], cam: "DOHC, 16 клапанов, 4 цилиндра, балансирный вал", cc: 1255, hp: 98, torque: "≈ 108 Н·м",
    compression: "≈ 10.5 бар", redline: 10000, carb: "Инжектор (SDTV)", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR6E", sparkTorque: "11 Н·м",
    oilVol: "≈ 4.6 л с фильтром", oilInt: 6000, valveInt: 24000, coolant: "≈ 2.8 л", fuel: "АИ-92/95",
    issues: [{ t: "Реле-регулятор (у ранних K7–K8)", sev: "med", fix: "Контроль зарядки, регулятор MOSFET." },
      { t: "Датчик положения передачи — «N» мигает, ошибки", sev: "low", fix: "Чистка разъёма под звездой, замена датчика." },
      { t: "Тяжёлый — быстро изнашивает резину и цепь", sev: "low", fix: "Контроль натяжки и резины." }] }, 2.4);
  CL("SUZ_GSF650L", "SUZ_GSF1250", { code: "GSF650 (K7)", name: "Suzuki GSF650 Bandit 2007+ / GSX650F (рядная четвёрка 656, жидкостная)", cc: 656, hp: 78,
    torque: "≈ 61 Н·м", compression: "≈ 11.5 бар", redline: 11500, spark: "NGK CR8E", oilVol: "≈ 3.4 л с фильтром", coolant: "≈ 2.4 л",
    groups: ["dohc", "liquid", "efi", "4t", "big", "jp"], cam: "DOHC, 16 клапанов, 4 цилиндра" }, 2.1);
  /* --- 400 и 250 четвёрки (японский рынок) --- */
  CL("SUZ_GSXR400", "I4_400S", { code: "GK76A", name: "Suzuki GSX-R400 / GSX400S Katana / Inazuma 400 (рядная четвёрка 398)", hp: 59, redline: 14000,
    jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR9E", sparkTorque: "11 Н·м",
    oilVol: "≈ 3.4 л с фильтром", issues: [{ t: "Возраст (90-е): карбюраторы, проводка, реле-регулятор", sev: "med", fix: "Ревизия при покупке, синхронизация карбюраторов." },
      { t: "Высокооборотистый — износ ЦПГ при перекрутке", sev: "med", fix: "Замер компрессии при покупке." }] }, 1.6);
  CL("SUZ_GSF250", "SUZ_GSXR400", { code: "GJ74A", name: "Suzuki GSF250 Bandit / GSX250 Across / GSX-R250 (рядная четвёрка 248)", cc: 248, hp: 40, torque: "≈ 23 Н·м",
    redline: 16000, oilVol: "≈ 2.8 л с фильтром", spark: "NGK CR8E" }, 1.5);
  /* --- RF600R / RF900R --- */
  RE("SUZ_RF600", x(CARB, { region: "jp", code: "RF600R (GN76B)", name: "Suzuki RF600R (рядная четвёрка 599, жидкостная)", maker: "Suzuki", layout: "i4",
    cam: "DOHC, 16 клапанов, 4 цилиндра", cc: 599, hp: 100, torque: "≈ 60 Н·м", compression: "≈ 11.8 бар", redline: 13000, carb: "Mikuni BST33 ×4", idle: "1150–1350",
    valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR9E", sparkTorque: "11 Н·м", oilVol: "≈ 3.6 л с фильтром", oilInt: 6000, valveInt: 24000, coolant: "≈ 2.5 л",
    issues: [{ t: "Реле-регулятор и статор", sev: "med", fix: "Регулятор MOSFET." },
      { t: "Возраст: карбюраторы, сальники, проводка", sev: "med", fix: "Ревизия при покупке." }] }), 2.1);
  CL("SUZ_RF900", "SUZ_RF600", { code: "RF900R (T701)", name: "Suzuki RF900R (рядная четвёрка 937, жидкостная)", cc: 937, hp: 125, torque: "≈ 92 Н·м", redline: 11500,
    carb: "Mikuni BDST36 ×4" }, 2.2);
  /* --- V-twin 90° TL / SV1000 / DL1000 --- */
  RE("SUZ_TL1000S", { region: "jp", code: "TL1000S (T906)", name: "Suzuki TL1000S/R / SV1000 / DL1000 K2 (V-twin 90° 996)", maker: "Suzuki", layout: "vtwin", vAngle: 90,
    groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, V-twin 90°", cc: 996, hp: 125, torque: "≈ 105 Н·м", compression: "≈ 11.3 бар", redline: 10500,
    carb: "Инжектор", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR8EK", sparkTorque: "11 Н·м", oilVol: "≈ 3.6 л с фильтром",
    oilInt: 6000, valveInt: 24000, coolant: "≈ 2.4 л",
    issues: [{ t: "Ротационный задний демпфер TL1000S — «вилять» на скорости", sev: "med", fix: "Рулевой демпфер, замена демпфера на амортизатор-аналог." },
      { t: "Реле-регулятор (обе модели)", sev: "med", fix: "Регулятор MOSFET." },
      { t: "Натяжители цепей ГРМ (два)", sev: "low", fix: "Замена при лязге." }] }, 2.3);
  CL("SUZ_TL1000R", "SUZ_TL1000S", { code: "TL1000R (T909)", name: "Suzuki TL1000R (V-twin 90° 996)", hp: 135, torque: "≈ 108 Н·м", redline: 11000 }, 2.4);
  CL("SUZ_SV1000", "SUZ_TL1000S", { code: "SV1000 (K3)", name: "Suzuki SV1000 / SV1000S (V-twin 90° 996)", hp: 120, torque: "≈ 102 Н·м", spark: "NGK CR8E",
    issues: [{ t: "Реле-регулятор", sev: "med", fix: "Регулятор MOSFET." }, { t: "Натяжители цепей ГРМ", sev: "low", fix: "Замена при лязге." }] }, 2.3);
  CL("SUZ_DL1000K2", "SUZ_TL1000S", { code: "DL1000 (K2)", name: "Suzuki V-Strom 1000 2002–2010 (V-twin 90° 996 от TL1000S)", hp: 98, torque: "≈ 101 Н·м", redline: 10000, spark: "NGK CR8E",
    issues: [{ t: "Реле-регулятор и разъём статора", sev: "med", fix: "Регулятор MOSFET, перепаять разъём." },
      { t: "Рывки на малом газе (сток-прошивка)", sev: "low", fix: "Чистка/синхронизация дросселей, TPS по мануалу." },
      { t: "Натяжители цепей ГРМ", sev: "low", fix: "Замена при лязге." }] }, 2.2);
  /* --- V-twin 90° 645 (SV650 / V-Strom 650 / Gladius) --- */
  RE("SUZ_SV650C", x(CARB, { region: "jp", code: "SV650 (X–K2)", name: "Suzuki SV650 1999–2002 (V-twin 90° 645, карбюраторы)", maker: "Suzuki", layout: "vtwin", vAngle: 90,
    cam: "DOHC, 8 клапанов, V-twin 90°", cc: 645, hp: 70, torque: "≈ 60 Н·м", compression: "≈ 11.5 бар", redline: 10500, carb: "Mikuni BDSR39 ×2", idle: "1200–1400",
    valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR8E", sparkTorque: "11 Н·м", oilVol: "≈ 3.0 л с фильтром", oilInt: 6000, valveInt: 24000, coolant: "≈ 1.7 л",
    fuel: "АИ-92/95", issues: [{ t: "Реле-регулятор", sev: "med", fix: "Регулятор MOSFET, проверка зарядки." },
      { t: "Натяжители цепей ГРМ (два) — лязг", sev: "low", fix: "Замена натяжителя." },
      { t: "Мягкая сток-вилка", sev: "low", fix: "Пружины, масло вилки, эмулятор." }] }), 1.9);
  CL("SUZ_SV650K3", "SUZ_SV650C", { code: "SV650 (K3)", name: "Suzuki SV650 2003–2009 / V-Strom 650 2004–2011 (V-twin 90° 645, инжектор)", hp: 72, torque: "≈ 64 Н·м",
    groups: ["dohc", "liquid", "efi", "4t", "big", "jp"], carb: "Инжектор (SDTV)", ignition: "ЭБУ (EFI)", jetMain: "—", jetPilot: "—", needle: "—" }, 1.9);
  CL("SUZ_SFV650", "SUZ_SV650K3", { code: "SFV650 (L0)", name: "Suzuki SFV650 Gladius / V-Strom 650 2012–2016 (V-twin 90° 645)", hp: 72, torque: "≈ 64 Н·м" }, 1.9);
  CL("SUZ_SV650L7", "SUZ_SV650K3", { code: "SV650 (L7)", name: "Suzuki SV650 2016+ / SV650X / V-Strom 650 2017+ (V-twin 90° 645, Euro 4)", hp: 76, torque: "≈ 64 Н·м",
    spark: "NGK MR8E-9", issues: [{ t: "Очень надёжный мотор — главное масло и регулятор", sev: "low", fix: "ТО по регламенту." },
      { t: "Натяжители цепей ГРМ на большом пробеге", sev: "low", fix: "Замена при лязге." }] }, 1.9);
  RE("SUZ_SV400", x(CARB, { region: "jp", code: "SV400 (VK53A)", name: "Suzuki SV400 / SV400S (V-twin 90° 399)", maker: "Suzuki", layout: "vtwin", vAngle: 90,
    cam: "DOHC, 8 клапанов, V-twin 90°", cc: 399, hp: 53, torque: "≈ 39 Н·м", compression: "≈ 11.5 бар", redline: 11500, carb: "Mikuni BDSR ×2 (с 2003 — инжектор)",
    idle: "1200–1400", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR8E", sparkTorque: "11 Н·м", oilVol: "≈ 2.9 л с фильтром", oilInt: 6000,
    valveInt: 24000, coolant: "≈ 1.6 л", issues: [{ t: "Реле-регулятор", sev: "med", fix: "Регулятор MOSFET." }, { t: "Натяжители цепей ГРМ", sev: "low", fix: "Замена при лязге." }] }), 1.7);
  /* --- GS500 --- */
  RE("SUZ_GS500", x(CARB, { region: "jp", code: "GS500 (M501)", name: "Suzuki GS500 / GS500E / GS500F (рядная двойка 487, воздушная)", maker: "Suzuki", layout: "twin", crankPhase: 180,
    groups: ["dohc", "air", "carb", "4t", "big"], cooling: "Воздушное", cam: "DOHC, 4 клапана, 2 цилиндра", cc: 487, hp: 47, torque: "≈ 40 Н·м", compression: "≈ 11 бар",
    redline: 10500, carb: "Mikuni BSR34 ×2", idle: "1400–1600", valveIn: "0.03–0.08 мм", valveEx: "0.08–0.13 мм", spark: "NGK DR8EA", gap: "0.6–0.7 мм", sparkTorque: "12 Н·м",
    oilVol: "≈ 3.0 л с фильтром", oilInt: 6000, valveInt: 12000, fuel: "АИ-92",
    issues: [{ t: "Карбюраторы капризны после зимы — запуск, холостой", sev: "low", fix: "Чистка, синхронизация, поплавки." },
      { t: "Ржавеет выпуск и коллектор", sev: "low", fix: "Осмотр при покупке." },
      { t: "Мотор живучий — следи за маслом и клапанами", sev: "low", fix: "Регламент 12 тыс. км." }] }), 1.7);
  /* --- малые синглы 125–250 --- */
  RE("SUZ_GN125", x(CARB, { region: "jp", code: "GN125 (F4)", name: "Suzuki GN125 / GZ125 / DR125SM / Van Van 125 (сингл 124, воздушный)", maker: "Suzuki",
    groups: ["air", "carb", "4t", "small"], cooling: "Воздушное", cam: "SOHC, 2 клапана", cc: 124, hp: 11, torque: "≈ 9.5 Н·м", compression: "≈ 9.5 бар", redline: 10000,
    ignition: "CDI", start: "Электро + кик", gearbox: "5 ст.", carb: "Mikuni BS26", idle: "1400–1600", valveIn: "0.05–0.10 мм", valveEx: "0.08–0.13 мм",
    spark: "NGK D8EA", gap: "0.6–0.7 мм", sparkTorque: "12 Н·м", oilVol: "≈ 1.0 л", oilInt: 3000, valveInt: 6000, fuel: "АИ-92",
    issues: [{ t: "Цепь ГРМ и натяжитель шуршат на пробеге", sev: "med", fix: "Цепь и натяжитель комплектом." },
      { t: "Китайские копии (GN125 Haojue/«Сузуки» без лицензии) — запчасти отличаются", sev: "med", fix: "Сверяй номер двигателя." },
      { t: "Клапаны зажимаются — тяжёлый запуск на горячую", sev: "low", fix: "Регулировка каждые 6 тыс. км." }] }), 1.1);
  CL("SUZ_GN250", "SUZ_GN125", { code: "GN250 (NJ41A)", name: "Suzuki GN250 / GZ250 Marauder (сингл 249, воздушный)", cc: 249, hp: 20, torque: "≈ 21 Н·м",
    groups: ["air", "carb", "4t", "big", "jp"], redline: 9500, carb: "Mikuni BS34", oilVol: "≈ 1.6 л", idle: "1300–1500" }, 1.3);
  RE("SUZ_TU250", { region: "jp", code: "TU250 (NJ4A)", name: "Suzuki TU250X / ST250 / Volty / Grasstracker (сингл 249, воздушный)", maker: "Suzuki",
    groups: ["air", "efi", "4t", "big"], cooling: "Воздушное", cam: "SOHC, 2 клапана", cc: 249, hp: 16, torque: "≈ 21 Н·м", compression: "≈ 9.5 бар", redline: 9000,
    gearbox: "5 ст.", carb: "Инжектор (Volty, Grasstracker, ранние ST250 — карбюратор Mikuni)", valveIn: "0.08–0.13 мм", valveEx: "0.17–0.22 мм",
    spark: "NGK CPR8EA-9", gap: "0.8–0.9 мм", sparkTorque: "11 Н·м", oilVol: "≈ 1.7 л", oilInt: 6000, valveInt: 12000, fuel: "АИ-92",
    issues: [{ t: "Простой и живучий — следи за цепью ГРМ и маслом", sev: "low", fix: "Масло каждые 3–6 тыс. км." },
      { t: "Клапаны — регулировка винтами", sev: "low", fix: "Каждые 12 тыс. км." }] }, 1.3);
  RE("SUZ_GSXR125", { region: "jp", code: "GSX-R125 (L7)", name: "Suzuki GSX-R125 / GSX-S125 (сингл 124, DOHC)", maker: "Suzuki",
    groups: ["dohc", "liquid", "efi", "4t", "small"], cam: "DOHC, 4 клапана", cc: 124, hp: 15, torque: "≈ 11.5 Н·м", compression: "≈ 11.5 бар", redline: 11000,
    valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK LMAR8AI-8", sparkTorque: "11 Н·м", oilVol: "≈ 1.3 л", oilInt: 6000, valveInt: 12000, coolant: "≈ 0.7 л",
    fuel: "АИ-92/95", issues: [{ t: "Высокооборотистый — внизу тяги мало", sev: "low", fix: "Звезда −1 зуб." }, { t: "Цепь привода быстро вытягивается при плохой смазке", sev: "low", fix: "Смазка каждые 500 км." }] }, 1.4);
  CL("SUZ_GSXR150", "SUZ_GSXR125", { code: "GSX-R150", name: "Suzuki GSX-R150 / GSX-S150 (сингл 147, DOHC)", cc: 147, hp: 19, torque: "≈ 14 Н·м", redline: 11500 }, 1.2);
  RE("SUZ_GIX155", { region: "in", code: "Gixxer 155", name: "Suzuki Gixxer 155 / Gixxer SF 155 (сингл 155, воздушный)", maker: "Suzuki (Индия)",
    groups: ["air", "efi", "4t", "small"], cooling: "Воздушное", cam: "SOHC, 2 клапана", cc: 155, hp: 13.6, torque: "≈ 13.8 Н·м", compression: "≈ 9.8 бар", redline: 10000,
    gearbox: "5 ст.", carb: "Инжектор (до 2019 — карбюратор)", valveIn: "0.08–0.13 мм", valveEx: "0.17–0.22 мм", spark: "NGK CPR8E", sparkTorque: "11 Н·м",
    oilVol: "≈ 1.2 л", oilInt: 5000, valveInt: 10000, fuel: "АИ-92",
    issues: [{ t: "Индийская сборка — мелкая электрика и крепёж", sev: "low", fix: "Протяжка крепежа после обкатки." }] }, 1.0);
  RE("SUZ_GIX250", { region: "in", code: "Gixxer 250 (SOCS)", name: "Suzuki Gixxer 250 / SF 250 / V-Strom 250SX (сингл 249, масляное охлаждение SOCS)", maker: "Suzuki (Индия)",
    groups: ["air", "efi", "4t", "big"], cooling: "Масляное (SOCS)", cam: "SOHC, 4 клапана", cc: 249, hp: 26.5, torque: "≈ 22.2 Н·м", compression: "≈ 10.7 бар", redline: 10500,
    valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK LMAR8A-9", sparkTorque: "11 Н·м", oilVol: "≈ 2.6 л", oilInt: 6000, valveInt: 12000, fuel: "АИ-92/95",
    issues: [{ t: "Масло — это и охлаждение: уровень проверять чаще", sev: "med", fix: "Уровень по окошку перед поездкой." }] }, 1.1);
  /* --- эндуро-синглы --- */
  CL("SUZ_DR600", "DR650", { code: "DR600 (SN41A)", name: "Suzuki DR600S / DR600R Djebel (сингл 589, воздушно-масляный)", cc: 589, hp: 44, torque: "≈ 48 Н·м",
    start: "Кик (DR600R — электро)", carb: "Mikuni ×2 (двухкамерный)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу",
    issues: [{ t: "Возраст (1985–1989): ЦПГ, сальники, проводка", sev: "med", fix: "Компрессия и ревизия при покупке." },
      { t: "Запуск киком на горячую — декомпрессор и зазоры", sev: "low", fix: "Регулировка декомпрессора и клапанов." }] }, 1.6);
  CL("SUZ_DR750", "S800S", { code: "DR750 (SR41A)", name: "Suzuki DR750S Big (сингл 727, воздушно-масляный)", cc: 727, hp: 52, torque: "≈ 59 Н·м", valveIn: "0.08–0.13 мм", valveEx: "0.17–0.22 мм",
    spark: "NGK DPR8EA-9 (×2)", oilVol: "≈ 3.5 л (масло в раме)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу",
    issues: [{ t: "Редкие запчасти ЦПГ (1988–1989)", sev: "med", fix: "Искать заранее, часть деталей от DR800." },
      { t: "Сильные вибрации — откручивается крепёж", sev: "low", fix: "Фиксатор резьбы, контроль затяжки." }] }, 1.8);
  CL("SUZ_DR250S", "DRZ250", { code: "DR250S (SJ44A)", name: "Suzuki DR250S / SE 1990–1995 (сингл 249, воздушный)", hp: 26, start: "Электро + кик", gearbox: "6 ст.",
    carb: "Mikuni BST33", issues: [{ t: "Возраст: проводка, карбюратор, цепь ГРМ", sev: "med", fix: "Ревизия при покупке." }] }, 1.4);
  CL("SUZ_DRZ50", "DRZ70", { code: "DR-Z50", name: "Suzuki DR-Z50 (детский горизонтальный 49)", cc: 49, hp: 3, gearbox: "3 ст., автоматическое сцепление",
    issues: [{ t: "Детский мотоцикл — цепь, масло и тормоза", sev: "low", fix: "ТО по регламенту, ограничитель газа под ребёнка." }] }, 1.0);
  CL("SUZ_JR50", "PW50", { code: "JR50", name: "Suzuki JR50 (2T 49, автомат, раздельная смазка)", maker: "Suzuki",
    issues: [{ t: "Масло 2T — в отдельный бачок, без него мотор заклинит", sev: "high", fix: "Проверять уровень масла перед каждым выездом." },
      { t: "Детский: ограничитель газа и тормоза", sev: "low", fix: "Настроить ограничитель под ребёнка." }] }, 1.0);
  /* --- 2T кросс и эндуро --- */
  CL("SUZ_RM125", "YZ125", { code: "RM125", name: "Suzuki RM125 (2T 124, кросс, клапан выпуска AETC)", maker: "Suzuki", hp: 36, carb: "Mikuni TMX36 / Keihin PWK (по году)",
    jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", spark: "NGK BR9EVX", cam: "Лепестковый клапан, клапан выпуска AETC",
    issues: [{ t: "Клапан выпуска AETC закоксовывается", sev: "med", fix: "Чистка каждые 20–30 м/ч." }, { t: "Поршень по моточасам", sev: "high", fix: "Замена поршня ~30–40 м/ч в спорте." }] }, 1.4);
  CL("SUZ_RM250", "YZ250", { code: "RM250", name: "Suzuki RM250 (2T 249, кросс, клапан выпуска AETC)", maker: "Suzuki", hp: 47, carb: "Mikuni TMX38 / Keihin PWK38 (по году)",
    jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", spark: "NGK BR8ECMVX", cam: "Лепестковый клапан, клапан выпуска AETC",
    issues: [{ t: "Клапан выпуска закоксовывается", sev: "med", fix: "Чистка каждые 20–30 м/ч." }, { t: "Поршень по моточасам", sev: "high", fix: "Журнал моточасов." }] }, 1.6);
  CL("SUZ_RMX250", "SUZ_RM250", { code: "RMX250", name: "Suzuki RMX250 / RMX250S (2T 249, эндуро)", hp: 40, gearbox: "6 ст., широкий ряд",
    issues: [{ t: "Возраст (1989–1998): поршень, сальники коленвала", sev: "med", fix: "Компрессия и опрессовка картера." }, { t: "Клапан выпуска", sev: "low", fix: "Чистка." }] }, 1.5);
  CL("SUZ_RM85", "YZ85", { code: "RM85", name: "Suzuki RM85 / RM85L (2T 84, детский кросс)", maker: "Suzuki", cc: 84, hp: 21,
    issues: [{ t: "Поршень по моточасам", sev: "high", fix: "Журнал моточасов." }] }, 1.1);
  CL("SUZ_TS125R", "DT125", { code: "TS125R (SF15A)", name: "Suzuki TS125R (2T 124, эндуро, жидкостный)", maker: "Suzuki", hp: 22, fuel: "АИ-95 + 2T масло (раздельная смазка CCI)",
    carb: "Mikuni TM28", spark: "NGK BR8ES", issues: [{ t: "Насос раздельной смазки CCI — следи за бачком и тросом", sev: "high", fix: "Уровень масла 2T, регулировка троса насоса." },
      { t: "Клапан выпуска AETC", sev: "low", fix: "Чистка." }] }, 1.2);
  CL("SUZ_TS200R", "SUZ_TS125R", { code: "TS200R (SH12A)", name: "Suzuki TS200R (2T 195, эндуро, жидкостный)", cc: 195, hp: 33, groups: ["2t", "liquid", "carb", "big", "jp"] }, 1.3);
  CL("SUZ_TS185", "SUZ_TS125R", { code: "TS185ER", name: "Suzuki TS185 / TS185ER (2T 183, воздушный)", cc: 183, hp: 17, cooling: "Воздушное", groups: ["2t", "air", "carb", "small", "jp"],
    gearbox: "5 ст.", carb: "Mikuni VM24", coolant: "—" }, 1.1);
  CL("SUZ_TS125", "SUZ_TS185", { code: "TS125", name: "Suzuki TS125 (2T 123, воздушный, 1971–1981)", cc: 123, hp: 13 }, 1.0);
  CL("SUZ_RMZ250F", "JP250F", { code: "RM-Z250 (L0)", name: "Suzuki RM-Z250 2010+ (DOHC 249, инжектор)", maker: "Suzuki", hp: 40,
    issues: [{ t: "Клапаны садятся при высоких оборотах", sev: "med", fix: "Проверка по моточасам." }, { t: "Масло — каждые 5–10 м/ч", sev: "med", fix: "Журнал моточасов." }] }, 1.8);
  /* --- круизеры --- */
  RE("SUZ_VS400", x(CARB, { region: "jp", code: "VS400 (VK51A)", name: "Suzuki Intruder 400 / VL400 / Desperado 400 (V-twin 45° 399)", maker: "Suzuki", layout: "vtwin", vAngle: 45,
    groups: ["liquid", "carb", "4t", "big"], cam: "SOHC, 8 клапанов, V-twin 45°", cc: 399, hp: 33, torque: "≈ 33 Н·м", compression: "≈ 10 бар", redline: 9500,
    gearbox: "5 ст., кардан", carb: "Mikuni BDS ×2", idle: "1050–1250", valveIn: "0.08–0.13 мм", valveEx: "0.17–0.22 мм", spark: "NGK DPR7EA-9", gap: "0.8–0.9 мм",
    sparkTorque: "11 Н·м", oilVol: "≈ 2.8 л с фильтром", oilInt: 6000, valveInt: 12000, coolant: "≈ 1.5 л", fuel: "АИ-92",
    issues: [{ t: "Реле-регулятор — частая беда Intruder", sev: "med", fix: "Регулятор MOSFET, проверка зарядки." },
      { t: "Задний цилиндр перегревается в пробках", sev: "low", fix: "Вентилятор, уровень антифриза." },
      { t: "Масло в кардане забывают менять", sev: "low", fix: "Гипоидное масло в редуктор по регламенту." }] }), 1.6);
  CL("SUZ_VS600", "SUZ_VS400", { code: "VS600 (VN51A)", name: "Suzuki Intruder VS600 (V-twin 45° 583)", cc: 583, hp: 40, torque: "≈ 48 Н·м", redline: 8500 }, 1.7);
  CL("SUZ_VS800", "SUZ_VS400", { code: "VS800 (VS52A)", name: "Suzuki Intruder VS750/VS800 / Boulevard S50 / Marauder VZ800 (V-twin 45° 805)", cc: 805, hp: 52,
    torque: "≈ 63 Н·м", compression: "≈ 10 бар", redline: 8000, carb: "Mikuni BDS36 ×2", oilVol: "≈ 3.3 л с фильтром", coolant: "≈ 1.8 л" }, 1.8);
  RE("SUZ_VS1400", x(CARB, { region: "jp", code: "VS1400 (VX51L)", name: "Suzuki Intruder VS1400 / Boulevard S83 (V-twin 45° 1360, воздушно-масляный)", maker: "Suzuki",
    layout: "vtwin", vAngle: 45, groups: ["air", "carb", "4t", "big"], cooling: "Воздушно-масляное", cam: "SOHC, 8 клапанов, V-twin 45°", cc: 1360, hp: 63,
    torque: "≈ 111 Н·м", compression: "≈ 9.3 бар", redline: 6500, gearbox: "4–5 ст. (по году), кардан", carb: "Mikuni BS36SS ×2", idle: "900–1100",
    valveIn: "0.08–0.13 мм", valveEx: "0.17–0.22 мм", spark: "NGK DPR7EA-9", gap: "0.8–0.9 мм", sparkTorque: "11 Н·м", oilVol: "≈ 4.2 л с фильтром",
    oilInt: 6000, valveInt: 12000, fuel: "АИ-92",
    issues: [{ t: "Реле-регулятор и статор", sev: "med", fix: "Регулятор MOSFET." },
      { t: "Задний цилиндр перегревается — проверяй масло", sev: "med", fix: "Уровень масла, не стоять в пробках." },
      { t: "Кардан: шлицы и масло", sev: "low", fix: "Смазка шлицев при снятии колеса." }] }), 2.0);
  RE("SUZ_VL1500", x(CARB, { region: "jp", code: "VL1500 (VY51L)", name: "Suzuki Intruder VL1500 LC / Boulevard C90 (V-twin 45° 1462)", maker: "Suzuki", layout: "vtwin", vAngle: 45,
    groups: ["liquid", "carb", "4t", "big"], cam: "SOHC, 8 клапанов, V-twin 45°", cc: 1462, hp: 67, torque: "≈ 113 Н·м", compression: "≈ 9 бар", redline: 6500,
    gearbox: "5 ст., кардан", carb: "Mikuni BDSR36 ×2", idle: "800–1000", valveIn: "0.08–0.13 мм", valveEx: "0.17–0.22 мм", spark: "NGK DPR7EA-9", gap: "0.8–0.9 мм",
    sparkTorque: "11 Н·м", oilVol: "≈ 4.0 л с фильтром", oilInt: 6000, valveInt: 12000, coolant: "≈ 2.5 л", fuel: "АИ-92",
    issues: [{ t: "Реле-регулятор", sev: "med", fix: "Регулятор MOSFET." },
      { t: "Кардан и шлицы ведомой шестерни", sev: "low", fix: "Масло в редукторе, смазка шлицев." }] }), 2.1);
  CL("SUZ_C90", "SUZ_VL1500", { code: "C90 (VY52L)", name: "Suzuki Boulevard C90 / C90T 2005+ (V-twin 45° 1462, инжектор)", hp: 78, torque: "≈ 125 Н·м",
    groups: ["liquid", "efi", "4t", "big", "jp"], carb: "Инжектор (SDTV)", ignition: "ЭБУ (EFI)", jetMain: "—", jetPilot: "—", needle: "—" }, 2.1);
  RE("SUZ_M109R", { region: "jp", code: "VZR1800 (M109R)", name: "Suzuki Boulevard M109R / C109R / Intruder M1800R (V-twin 54° 1783)", maker: "Suzuki", layout: "vtwin", vAngle: 54,
    groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, V-twin 54°", cc: 1783, hp: 127, torque: "≈ 160 Н·м", compression: "≈ 10.5 бар", redline: 7500,
    gearbox: "5 ст., кардан", carb: "Инжектор (SDTV)", idle: "750–850", valveIn: "0.10–0.20 мм", valveEx: "0.20–0.30 мм", spark: "NGK CR7E", sparkTorque: "11 Н·м",
    oilVol: "≈ 5.3 л с фильтром", oilInt: 6000, valveInt: 24000, coolant: "≈ 2.8 л", fuel: "АИ-95",
    issues: [{ t: "Реле-регулятор и статор", sev: "med", fix: "Регулятор MOSFET." },
      { t: "Широкая задняя шина 240 быстро изнашивается", sev: "low", fix: "Давление по мануалу." },
      { t: "Клапаны на шайбах — регулировка долгая", sev: "low", fix: "Регламент 24 тыс. км." }] }, 2.4);
  CL("SUZ_M90", "SUZ_M109R", { code: "VZ1500 (M90)", name: "Suzuki Boulevard M90 / Intruder M1500 (V-twin 54° 1462)", cc: 1462, hp: 78, torque: "≈ 122 Н·м" }, 2.2);
  RE("SUZ_LS650", x(CARB, { region: "jp", code: "LS650 (NP41B)", name: "Suzuki Savage LS650 / Boulevard S40 (сингл 652, воздушный)", maker: "Suzuki",
    groups: ["air", "carb", "4t", "big"], cooling: "Воздушное", cam: "SOHC, 4 клапана", cc: 652, hp: 31, torque: "≈ 50 Н·м", compression: "≈ 8.5 бар", redline: 7000,
    gearbox: "5 ст., ремень", carb: "Mikuni BS40", idle: "1000–1200", valveIn: "0.08–0.13 мм", valveEx: "0.17–0.22 мм", spark: "NGK DPR8EA-9", gap: "0.8–0.9 мм",
    sparkTorque: "11 Н·м", oilVol: "≈ 2.3 л с фильтром", oilInt: 5000, valveInt: 12000, fuel: "АИ-92",
    issues: [{ t: "Большой сингл — вибрации, откручивается крепёж", sev: "low", fix: "Фиксатор резьбы." },
      { t: "Ремень привода: натяжка и камни в шкиве", sev: "low", fix: "Осмотр ремня каждые 5 тыс. км." },
      { t: "Механизм декомпрессора — тяжёлый запуск", sev: "low", fix: "Регулировка троса/автодекомпрессора по мануалу." }] }), 1.7);
  /* ================= ИСПРАВЛЕНИЯ СУЩЕСТВУЮЩИХ МОДЕЛЕЙ ================= */
  gens("GSX-R600", [["SUZ_GSXR600W", "1997–2000"], ["SUZ_GSXR600K1", "2001–2005"], ["SUZ_GSXR600K6", "2006–2010"], ["SUZ_GSXR600L1", "2011+"]]);
  gens("GSX-R750", [["SUZ_GSXR750T", "1996–1997"], ["SUZ_GSXR750W", "1998–1999"], ["SUZ_GSXR750K0", "2000–2005"], ["SUZ_GSXR750K6", "2006–2010"], ["I4_750S", "2011+"]]);
  gens("GSX-R1000", [["SUZ_GSXR1000K1", "2001–2004"], ["SUZ_GSXR1000K5", "2005–2008"], ["SUZ_GSXR1000K9", "2009–2016"], ["SUZ_GSXR1000L7", "2017+"]]);
  gens("GSR600", [["SUZ_GSR600", "2006–2011"]]);
  gens("GSX-S750", [["SUZ_GSR750", "2015–2021", { hp: 114 }]]);
  gens("GSX-S1000", [["SUZ_GSXS1000", "2015–2020", { hp: 145 }], ["SUZ_GSXS1000", "2021+", { hp: 152 }]]);
  gens("Bandit 600 (GSF600)", [["SUZ_GSF600", "1995–1999"], ["SUZ_GSF600", "2000–2004"]]);
  gens("Bandit 1250", [["SUZ_GSF1250", "2007–2016"]]);
  gens("SV650", [["SUZ_SV650C", "1999–2002"], ["SUZ_SV650K3", "2003–2009"], ["SUZ_SV650L7", "2016+"]]);
  gens("Gladius 650", [["SUZ_SFV650", "2009–2015"]]);
  gens("V-Strom 650XT", [["SUZ_SFV650", "2015–2016", { hp: 69 }], ["SUZ_SV650L7", "2017+", { hp: 71 }]]);
  gens("V-Strom 1000 (DL1000)", [["SUZ_DL1000K2", "2002–2010"], ["V1000S", "2014–2019"]]);
  gens("GSX-R125", [["SUZ_GSXR125", "2017+"]]);
  gens("GSX-S125", [["SUZ_GSXR125", "2017+"]]);
  gens("GN125", [["SUZ_GN125", "1982+"]]);
  gens("DR125SM", [["SUZ_GN125", "2008–2013"]]);
  gens("TS125R", [["SUZ_TS125R", "1989–1996"]]);
  gens("RM125", [["SUZ_RM125", "1989–2000"], ["SUZ_RM125", "2001–2012"]]);
  gens("RM250", [["SUZ_RM250", "1996–2002"], ["SUZ_RM250", "2003–2012", { hp: 48 }]]);
  gens("RMX250", [["SUZ_RMX250", "1989–1998"]]);
  gens("RM85", [["SUZ_RM85", "2002+"]]);
  gens("JR50", [["SUZ_JR50", "1978+"]]);
  gens("DR-Z50", [["SUZ_DRZ50", "2013+"]]);
  gens("DR750S Big", [["SUZ_DR750", "1988–1989"]]);
  gens("DR250S", [["SUZ_DR250S", "1990–1995"]]);
  setEngine("Suzuki", "Van Van 200", 0, "DR200", { hp: 16 });
  setEngine("Suzuki", "DR250R", 0, "DJEBEL250", { hp: 31 });
  setEngine("Suzuki", "XF650 Freewind", 0, "DR650", { hp: 48 });
  setEngine("Suzuki", "GSX400 Impulse", 0, "I4_400S", { hp: 53 });
  setEngine("Suzuki", "RM-Z250", 1, "SUZ_RMZ250F", { years: "2010–2018", label: "2010–2018 · RM-Z250 (L0), 249 см³" });
  addVersion("Suzuki", "RM-Z250", "SUZ_RMZ250F", "2019+", { hp: 42 });

  /* ================= НОВЫЕ МОДЕЛИ ================= */
  /* спорт и нейкеды */
  G("Suzuki", "GSX1300R Hayabusa", SP, [["SUZ_HAYA1", "1999–2007"], ["SUZ_HAYA2", "2008–2020"], ["SUZ_HAYA3", "2021+"]]);
  G("Suzuki", "B-King", NK, [["SUZ_HAYA2", "2008–2012", { hp: 184 }]]);
  G("Suzuki", "GSX1400", NK, [["SUZ_GSX1400", "2001–2008"]]);
  G("Suzuki", "GSX-S1000F", SP, [["SUZ_GSXS1000", "2015–2020", { hp: 145 }]]);
  G("Suzuki", "GSX-S1000GT", TR, [["SUZ_GSXS1000", "2022+", { hp: 152 }]]);
  G("Suzuki", "GSX-S1000GX", AD, [["SUZ_GSXS1000", "2024+", { hp: 152 }]]);
  G("Suzuki", "Katana", NK, [["SUZ_GSXS1000", "2019+", { hp: 150 }]]);
  G("Suzuki", "GSX-S950", NK, [["SUZ_GSXS1000", "2021+", { hp: 95 }]]);
  G("Suzuki", "GSR750", NK, [["SUZ_GSR750", "2011–2016"]]);
  G("Suzuki", "GSX600F Katana", SP, [["SUZ_GSX600F", "1988–2006"]]);
  G("Suzuki", "GSX750F Katana", SP, [["SUZ_GSX750F", "1989–2006"]]);
  G("Suzuki", "GSX750 Inazuma", NK, [["SUZ_GSX750F", "1998–2003", { hp: 86 }]]);
  G("Suzuki", "GSX1200 Inazuma", NK, [["SUZ_GSF1200", "1998–2001", { hp: 97 }]]);
  G("Suzuki", "RF600R", SP, [["SUZ_RF600", "1993–1997"]]);
  G("Suzuki", "RF900R", SP, [["SUZ_RF900", "1994–1999"]]);
  G("Suzuki", "TL1000S", SP, [["SUZ_TL1000S", "1997–2001"]]);
  G("Suzuki", "TL1000R", SP, [["SUZ_TL1000R", "1998–2003"]]);
  G("Suzuki", "SV1000 / SV1000S", NK, [["SUZ_SV1000", "2003–2007"]]);
  G("Suzuki", "SV400 / SV400S", NK, [["SUZ_SV400", "1998–2007"]]);
  G("Suzuki", "SV650X", NK, [["SUZ_SV650L7", "2018+"]]);
  G("Suzuki", "GS500 / GS500E", NK, [["SUZ_GS500", "1989–2009"]]);
  G("Suzuki", "GS500F", SP, [["SUZ_GS500", "2004–2009"]]);
  G("Suzuki", "GSX650F", SP, [["SUZ_GSF650L", "2008–2016", { hp: 86 }]]);
  G("Suzuki", "GSX1250FA", TR, [["SUZ_GSF1250", "2010–2016"]]);
  G("Suzuki", "Bandit 650 / 650S", NK, [["SUZ_GSF650A", "2005–2006"], ["SUZ_GSF650L", "2007–2016"]]);
  G("Suzuki", "Bandit 1200 / 1200S", NK, [["SUZ_GSF1200", "1996–2000"], ["SUZ_GSF1200", "2001–2006", { hp: 100 }]]);
  G("Suzuki", "Bandit 250 (GSF250)", NK, [["SUZ_GSF250", "1989–2000"]]);
  G("Suzuki", "GSX250 Across", SP, [["SUZ_GSF250", "1990–1998", A]]);
  G("Suzuki", "GSX-R250", SP, [["SUZ_GSF250", "1987–1994", { hp: 45, approx: true }]]);
  G("Suzuki", "GSX-R400", SP, [["SUZ_GSXR400", "1990–1999"]]);
  G("Suzuki", "GSX400S Katana", NK, [["SUZ_GSXR400", "1992–1999", { hp: 53, approx: true }]]);
  G("Suzuki", "GSX400 Inazuma", NK, [["SUZ_GSXR400", "1997–2006", { hp: 53, approx: true }]]);
  G("Suzuki", "GSX-R150", SP, [["SUZ_GSXR150", "2017+"]]);
  G("Suzuki", "GSX-S150", NK, [["SUZ_GSXR150", "2017+"]]);
  G("Suzuki", "Gixxer 155", NK, [["SUZ_GIX155", "2014+"]]);
  G("Suzuki", "Gixxer SF 155", SP, [["SUZ_GIX155", "2015+"]]);
  G("Suzuki", "Gixxer 250", NK, [["SUZ_GIX250", "2020+"]]);
  G("Suzuki", "Gixxer SF 250", SP, [["SUZ_GIX250", "2019+"]]);
  G("Suzuki", "Inazuma 250 (GW250)", NK, [["T250S", "2012–2017"]]);
  G("Suzuki", "GSX-8T / GSX-8TT", NK, [["T800S", "2025+"]]);
  /* туристы-эндуро */
  G("Suzuki", "V-Strom 650 (DL650)", AD, [["SUZ_SV650K3", "2004–2011", { hp: 67 }], ["SUZ_SFV650", "2012–2016", { hp: 69 }], ["SUZ_SV650L7", "2017+", { hp: 71 }]]);
  G("Suzuki", "V-Strom 1050XT", AD, [["V1000S", "2020–2022", { hp: 107 }]]);
  G("Suzuki", "V-Strom 1050DE", AD, [["V1000S", "2023+", { hp: 107 }]]);
  G("Suzuki", "V-Strom 250SX", AD, [["SUZ_GIX250", "2023+"]]);
  /* круизеры */
  G("Suzuki", "Intruder VS400", CH, [["SUZ_VS400", "1994–2009"]]);
  G("Suzuki", "Intruder Classic 400 (VL400)", CH, [["SUZ_VS400", "2001–2009"]]);
  G("Suzuki", "Desperado 400", CH, [["SUZ_VS400", "1996–2002", A]]);
  G("Suzuki", "Intruder VS600", CH, [["SUZ_VS600", "1995–1997"]]);
  G("Suzuki", "Intruder VS750", CH, [["SUZ_VS800", "1985–1991", { hp: 56, approx: true }]]);
  G("Suzuki", "Intruder VS800 / Boulevard S50", CH, [["SUZ_VS800", "1992–2009"]]);
  G("Suzuki", "Marauder VZ800", CH, [["SUZ_VS800", "1997–2004"]]);
  G("Suzuki", "Intruder VS1400 / Boulevard S83", CH, [["SUZ_VS1400", "1987–2009"]]);
  G("Suzuki", "Intruder VL1500 LC", CH, [["SUZ_VL1500", "1998–2004"]]);
  G("Suzuki", "Boulevard C90 (Intruder C1500)", CH, [["SUZ_C90", "2005–2009"], ["SUZ_C90", "2013+"]]);
  G("Suzuki", "Boulevard M90 (Intruder M1500)", CH, [["SUZ_M90", "2009–2016"]]);
  G("Suzuki", "Boulevard M109R (Intruder M1800R)", CH, [["SUZ_M109R", "2006+"]]);
  G("Suzuki", "Boulevard C109R (Intruder C1800R)", CH, [["SUZ_M109R", "2008–2011", { hp: 115 }]]);
  G("Suzuki", "Boulevard M50 (Intruder M800)", CH, [["V805S", "2005+"]]);
  G("Suzuki", "Savage LS650 / Boulevard S40", CH, [["SUZ_LS650", "1986–2019"]]);
  G("Suzuki", "Marauder GZ125", CH, [["SUZ_GN125", "1998–2011"]]);
  G("Suzuki", "Marauder GZ250", CH, [["SUZ_GN250", "1999–2011"]]);
  /* классика и лёгкие */
  G("Suzuki", "GN250", KL, [["SUZ_GN250", "1982–2001"]]);
  G("Suzuki", "GS125", KL, [["SUZ_GN125", "1982–2001", A]]);
  G("Suzuki", "TU250X", KL, [["SUZ_TU250", "2009+"]]);
  G("Suzuki", "ST250", KL, [["SUZ_TU250", "2003+"]]);
  G("Suzuki", "Volty", KL, [["SUZ_TU250", "1994–2004", A]]);
  G("Suzuki", "Grasstracker", KL, [["SUZ_TU250", "2000–2009", A]]);
  G("Suzuki", "Van Van 125", LE, [["SUZ_GN125", "2003–2016", A]]);
  G("Suzuki", "Djebel 125", LE, [["SUZ_GN125", "1997–2003", A]]);
  G("Suzuki", "DR125S / SE", LE, [["SUZ_GN125", "1982–2001", A]]);
  /* эндуро и кросс */
  G("Suzuki", "DR600S / DR600R Djebel", AD, [["SUZ_DR600", "1985–1989"]]);
  G("Suzuki", "DR650R / RSE", AD, [["DR650", "1990–1995", { hp: 46, approx: true }]]);
  G("Suzuki", "TS185ER", KR, [["SUZ_TS185", "1971–1981"]]);
  G("Suzuki", "TS200R", KR, [["SUZ_TS200R", "1990–1995"]]);
  G("Suzuki", "RM80", KR, [["SUZ_RM85", "1990–2001", { hp: 20, approx: true }]]);
  G("Suzuki", "TS125", KR, [["SUZ_TS125", "1971–1981"]]);
  G("Suzuki", "GSX-R1000R", SP, [["SUZ_GSXR1000L7", "2017+"]]);
  G("Suzuki", "GSX250S Katana", NK, [["SUZ_GSF250", "1991–2000", A]]);
  G("Suzuki", "Gladius 400 (SFV400)", NK, [["SUZ_SV400", "2009–2015", A]]);
  G("Suzuki", "Goose 350", NK, [["DR350", "1992–1998"]]);
  G("Suzuki", "Goose 250", NK, [["SUZ_DR250S", "1992–1998", A]]);
})();

/* ===================== v28: Kawasaki — свои моторы вместо сборных, новые модели ===================== */
(function () {
  var NK = "Нейкед", SP = "Спорт", CH = "Чоппер", TR = "Турер", AD = "Тур-эндуро", CLS = "Классика", E = "Эндуро", KX = "Кросс-эндуро", LE = "Лёгкий эндуро", MO = "Мотард";
  function x(a, b) { return Object.assign({}, a, b); }

  /* ================= МОТОРЫ ================= */
  /* общие части: рядные четвёрки и двойки Kawasaki (зазоры — типовые для Kawasaki DOHC с шайбами под толкателями) */
  var KI4 = { region: "jp", maker: "Kawasaki", layout: "i4", cam: "DOHC, 16 клапанов, 4 цилиндра", cooling: "Жидкостное",
    valveIn: "0.15–0.24 мм", valveEx: "0.22–0.31 мм", spark: "NGK CR9EIA-9", gap: "0.8–0.9 мм", sparkTorque: "13 Н·м",
    oil: "10W-40 (JASO MA)", oilInt: 6000, valveInt: 24000, fuel: "АИ-95" };
  var KCARB = { ignition: "Транзисторное (TCI)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", valveInt: 12000, oilInt: 5000 };
  var I_REG = { t: "Реле-регулятор и статор греются — недозаряд, «умирает» АКБ", sev: "med", fix: "Проверить зарядку 13.5–14.5 В, регулятор на MOSFET (SH847), чистые разъёмы статора." };
  var I_CCT = { t: "Автоматический натяжитель цепи ГРМ — треск на холостых и при прогреве", sev: "med", fix: "Заменить натяжитель (часто — на ручной), при вытяжке — цепь." };
  var I_SYNC = { t: "Рассинхрон карбюраторов/дросселей — вибрации и рывки на малом газе", sev: "low", fix: "Синхронизация вакуумметром, чистка карбюраторов." };
  var I_AGE = { t: "Возрастной мотоцикл: карбюраторы, проводка, сальники вилки", sev: "med", fix: "Ревизия карбюраторов (мембраны, иглы), разъёмов и подвески при покупке." };
  var I_FAN = { t: "Перегрев в пробках: вентилятор, термовыключатель, грязный радиатор", sev: "med", fix: "Проверить включение вентилятора, промыть соты, свежий антифриз." };

  /* --- 250: EX250 (GPX250R / Ninja 250R / ZZR250 / Eliminator 250) --- */
  RE("KAW_EX250F", x(KCARB, { region: "jp", code: "EX250E/F", name: "Kawasaki EX250 (рядная двойка 248, карбюратор: GPX250R / Ninja 250R / ZZR250 / Eliminator 250)", maker: "Kawasaki",
    layout: "twin", crankPhase: 180, groups: ["dohc", "liquid", "carb", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 248, hp: 36, torque: "≈ 23 Н·м", compression: "≈ 11 бар", redline: 13500,
    carb: "Keihin CVK30 ×2", idle: "1200–1400", valveIn: "0.10–0.19 мм", valveEx: "0.17–0.26 мм", spark: "NGK DR8EA", gap: "0.6–0.7 мм", sparkTorque: "14 Н·м",
    oil: "10W-40 (JASO MA)", oilVol: "≈ 1.7 л с фильтром", coolant: "≈ 1.2 л", fuel: "АИ-92/95",
    issues: [I_SYNC, { t: "Мембраны CVK трескаются, карбы забиваются после стоянки", sev: "med", fix: "Чистка, ремкомплект, новые мембраны." }, I_REG, { t: "Крутить надо: тяга после 8–9 тыс. об/мин", sev: "low", fix: "Особенность мотора, не повод для ремонта." }] }), 1.6);
  CL("KAW_EX250J", "KAW_EX250F", { code: "EX250J", name: "Kawasaki EX250J (Ninja 250R 2008–2012, рядная двойка 249, карбюратор)", cc: 249, hp: 33, spark: "NGK CR8E", gap: "0.7–0.8 мм", carb: "Keihin CVK30 ×2", valveInt: 12000 }, 1.6);
  CL("KAW_EX250L", "KAW_EX250J", { code: "EX250L", name: "Kawasaki EX250L (рядная двойка 249, инжектор: Ninja 250 2013–2017 / Z250 / Versys-X 250)", groups: ["dohc", "liquid", "efi", "4t", "big"], hp: 32, torque: "≈ 21 Н·м",
    ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—", idle: "1250–1350", oilInt: 6000,
    issues: [{ t: "Высокооборотистый: тяга после 8 тыс. об/мин, на трассе мотор «звенит»", sev: "low", fix: "Особенность, звезда +1 зуб сзади для города." }, I_REG, { t: "Датчики и разъёмы инжектора не любят мойку под давлением", sev: "low", fix: "Не лить напором, диэлектрическая смазка." }] }, 1.6);
  /* --- новое поколение 250/400/500 (2018+) --- */
  RE("KAW_EX250P", { region: "jp", code: "EX250P", name: "Kawasaki 248 (рядная двойка 180°, 2018+: Ninja 250 / Z250)", maker: "Kawasaki", layout: "twin", crankPhase: 180,
    groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 248, hp: 39, torque: "≈ 23.5 Н·м", compression: "≈ 11.6 бар", redline: 14000,
    valveIn: "0.15–0.24 мм", valveEx: "0.22–0.31 мм", spark: "NGK LMAR9G", gap: "0.7–0.8 мм", sparkTorque: "13 Н·м", oil: "10W-40 (JASO MA)", oilVol: "≈ 2.0 л с фильтром", oilInt: 6000, valveInt: 24000, coolant: "≈ 1.2 л", gearbox: "6 ст., слипер-сцепление",
    issues: [{ t: "Ассист-слипер сцепление — менять только на масло JASO MA, без антифрикционных присадок", sev: "med", fix: "Масло JASO MA/MA2, 10W-40." }, I_REG, { t: "Цепь и звёзды изнашиваются быстро у новичков", sev: "low", fix: "Смазка цепи каждые 500 км, контроль натяжения." }] }, 1.7);
  CL("KAW_EX500", "KAW_EX250P", { code: "EX500 (451)", name: "Kawasaki 451 (рядная двойка 180°, 2024+: Ninja 500 / Z500 / Eliminator 500)", cc: 451, hp: 45, torque: "≈ 43 Н·м", compression: "≈ 11.3 бар", redline: 11000, oilVol: "≈ 2.4 л с фильтром", coolant: "≈ 1.3 л" }, 1.8);
  RE("KAW_ER4", { region: "jp", code: "ER400B", name: "Kawasaki ER-4 (рядная двойка 399 на базе 649: ER-4n / ER-4f / Ninja 400R)", maker: "Kawasaki", layout: "twin", crankPhase: 180,
    groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 8 клапанов, 2 цилиндра", cc: 399, hp: 44, torque: "≈ 37 Н·м", compression: "≈ 11.3 бар", redline: 11000,
    valveIn: "0.15–0.24 мм", valveEx: "0.22–0.31 мм", spark: "NGK CR9EIA-9", gap: "0.8–0.9 мм", sparkTorque: "13 Н·м", oil: "10W-40 (JASO MA)", oilVol: "≈ 2.0 л с фильтром", oilInt: 6000, valveInt: 24000, coolant: "≈ 1.3 л",
    issues: [I_REG, { t: "Ржавеет выпускной коллектор и лопается кронштейн глушителя", sev: "low", fix: "Осмотр крепления, термостойкая краска." }, { t: "Рывки на малом газе (бедная смесь стока)", sev: "low", fix: "Синхронизация дросселей, прошивка/модуль." }] }, 1.7);

  /* --- 400 и 250 четвёрки (японский рынок) --- */
  RE("KAW_ZX400", x(KI4, x(KCARB, { code: "ZX400L/N", name: "Kawasaki 398 (рядная четвёрка: ZXR400 / ZZR400 / ZRX400 / Xanthus)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 398, hp: 53, torque: "≈ 36 Н·м", compression: "≈ 12 бар", redline: 13500, carb: "Keihin CVK30 ×4 (ZXR400 — CVKD32 плоские)", idle: "1200–1400",
    spark: "NGK CR9E", gap: "0.7–0.8 мм", oilVol: "≈ 3.2 л с фильтром", coolant: "≈ 2 л", issues: [I_SYNC, I_REG, I_AGE, I_CCT] })), 1.6);
  RE("KAW_ZXR250", x(KI4, x(KCARB, { code: "ZX250A/C", name: "Kawasaki 249 (рядная четвёрка: ZXR250 / Balius 250)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 249, hp: 45, torque: "≈ 25 Н·м", compression: "≈ 12.5 бар", redline: 17000, carb: "Keihin CVK ×4", idle: "1400–1600",
    spark: "NGK CR9E", gap: "0.7–0.8 мм", oilVol: "≈ 2.8 л с фильтром", coolant: "≈ 1.6 л",
    issues: [{ t: "Ресурс ЦПГ при постоянной езде под отсечку — дымит и ест масло", sev: "med", fix: "Компрессия при покупке (по цилиндрам), масло каждые 3–4 тыс. км." }, I_SYNC, I_REG, I_AGE] })), 1.6);
  RE("KAW_ZX25R", x(KI4, { code: "ZX250E", name: "Kawasaki 249 (рядная четвёрка 2020+: Ninja ZX-25R)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 249, hp: 50, torque: "≈ 23 Н·м", compression: "≈ 11.5 бар", redline: 17000, oilVol: "≈ 2.4 л с фильтром", coolant: "≈ 1.4 л", gearbox: "6 ст., слипер-сцепление, квикшифтер (SE)",
    issues: [{ t: "Высокие обороты — масло менять чаще, чем у двоек", sev: "med", fix: "Синтетика 10W-40 JASO MA2 каждые 5000 км." }, I_FAN] }), 1.9);

  /* --- 600: ZZR600, GPZ600R, ZX-6R по поколениям --- */
  RE("KAW_ZX600A", x(KI4, x(KCARB, { code: "ZX600A/C", name: "Kawasaki 592 (рядная четвёрка: GPZ600R / GPX600R / Eliminator 600)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 592, hp: 75, torque: "≈ 54 Н·м", compression: "≈ 11 бар", redline: 12000, carb: "Keihin CVK32 ×4", idle: "1100–1300", spark: "NGK C9E", gap: "0.7–0.8 мм",
    oilVol: "≈ 3.0 л с фильтром", coolant: "≈ 2 л", issues: [I_AGE, I_SYNC, I_REG] })), 1.8);
  RE("KAW_ZX600E", x(KI4, x(KCARB, { code: "ZX600D/E", name: "Kawasaki 599 (рядная четвёрка: ZZR600)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 599, hp: 100, torque: "≈ 64 Н·м", compression: "≈ 12 бар", redline: 13000, carb: "Keihin CVKD36 ×4", idle: "1200–1400", spark: "NGK CR9E", gap: "0.7–0.8 мм",
    oilVol: "≈ 3.4 л с фильтром", coolant: "≈ 2.3 л", issues: [I_REG, I_CCT, I_SYNC, { t: "Стартерная обгонная муфта проскальзывает на старых", sev: "low", fix: "Ремонт муфты стартера." }] })), 2.0);
  RE("KAW_ZX600F", x(KI4, x(KCARB, { code: "ZX600F/G/J", name: "Kawasaki ZX-6R 599 карбюраторный (1995–2002)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 599, hp: 108, torque: "≈ 67 Н·м", compression: "≈ 12.8 бар", redline: 14000, carb: "Keihin CVKD36 ×4", idle: "1200–1400", spark: "NGK CR9E", gap: "0.7–0.8 мм",
    oilVol: "≈ 3.6 л с фильтром", coolant: "≈ 2.5 л", fuel: "АИ-95/98", issues: [I_REG, I_CCT, I_SYNC, I_FAN] })), 2.1);
  CL("KAW_ZX636A", "KAW_ZX600F", { code: "ZX636A", name: "Kawasaki ZX-6R 636 карбюраторный (2002)", cc: 636, hp: 113, torque: "≈ 70 Н·м" }, 2.1);
  RE("KAW_ZX636B", x(KI4, { code: "ZX636B/C", name: "Kawasaki ZX-6R 636 инжектор (2003–2006)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 636, hp: 130, torque: "≈ 70 Н·м", compression: "≈ 12.9 бар", redline: 15000, valveIn: "0.10–0.19 мм", valveEx: "0.22–0.31 мм",
    oilVol: "≈ 3.4 л с фильтром", coolant: "≈ 2.4 л", fuel: "АИ-98", issues: [I_REG, I_CCT, { t: "Слипер-сцепление (C1/C2) — износ при трековой езде", sev: "low", fix: "Диски и пружины по износу." }, I_FAN] }), 2.2);
  CL("KAW_ZX600K", "KAW_ZX636B", { code: "ZX600K/M", name: "Kawasaki ZX-6RR 599 (2003–2006, омологация)", cc: 599, hp: 118, torque: "≈ 66 Н·м", redline: 16000 }, 2.2);
  RE("KAW_ZX600P", x(KI4, { code: "ZX600P/R", name: "Kawasaki ZX-6R 599 (2007–2012)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 599, hp: 128, torque: "≈ 66 Н·м", compression: "≈ 13.3 бар", redline: 16000, valveIn: "0.10–0.19 мм", valveEx: "0.22–0.31 мм",
    oilVol: "≈ 3.4 л с фильтром", coolant: "≈ 2.4 л", fuel: "АИ-98", gearbox: "6 ст., слипер-сцепление",
    issues: [I_REG, { t: "Мало тяги внизу, нужно держать 9–10 тыс. об/мин", sev: "low", fix: "Особенность 599, звезда +2 сзади для города." }, I_CCT, I_FAN] }), 2.2);
  RE("KAW_ZX636E", x(KI4, { code: "ZX636E/G/J", name: "Kawasaki ZX-6R 636 (2013+)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 636, hp: 130, torque: "≈ 71 Н·м", compression: "≈ 12.9 бар", redline: 16000, valveIn: "0.10–0.19 мм", valveEx: "0.22–0.31 мм",
    oilVol: "≈ 3.6 л с фильтром", coolant: "≈ 2.4 л", fuel: "АИ-98", gearbox: "6 ст., слипер-сцепление (2019+ квикшифтер)",
    issues: [I_REG, { t: "Электроника (KTRC, режимы мощности) — ошибки датчиков после падения", sev: "low", fix: "Диагностика сканером Kawasaki (KDS)." }, I_FAN] }), 2.3);

  /* --- 750 --- */
  RE("KAW_ZXR750", x(KI4, x(KCARB, { code: "ZX750H/J/L", name: "Kawasaki 749 (рядная четвёрка: ZXR750 1989–1995)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 749, hp: 110, torque: "≈ 75 Н·м", compression: "≈ 11.5 бар", redline: 13000, carb: "Keihin CVKD36/38 ×4", idle: "1100–1300", spark: "NGK CR9E", gap: "0.7–0.8 мм",
    oilVol: "≈ 3.5 л с фильтром", coolant: "≈ 2.8 л", fuel: "АИ-95/98", issues: [I_AGE, I_SYNC, I_REG] })), 2.0);
  RE("KAW_ZX750P", x(KI4, x(KCARB, { code: "ZX750P/N", name: "Kawasaki 748 (рядная четвёрка: ZX-7R / ZX-7RR 1996–2003)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 748, hp: 122, torque: "≈ 79 Н·м", compression: "≈ 11.5 бар", redline: 13000, carb: "Keihin CVKD38 ×4 (7RR — FCR39)", idle: "1100–1300", spark: "NGK CR9E", gap: "0.7–0.8 мм",
    oilVol: "≈ 3.4 л с фильтром", coolant: "≈ 2.6 л", fuel: "АИ-95/98", issues: [I_REG, I_SYNC, I_CCT, { t: "Тяжёлый и греется в городе", sev: "low", fix: "Следи за вентилятором и антифризом." }] })), 2.1);
  RE("KAW_ZR750", x(KI4, { code: "ZR750J/L", name: "Kawasaki 748 (рядная четвёрка: Z750 / Z750S / Z750R 2004–2012)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 748, hp: 106, torque: "≈ 78 Н·м", compression: "≈ 11.3 бар", redline: 11500, oilVol: "≈ 3.8 л с фильтром", coolant: "≈ 2.6 л",
    issues: [I_REG, { t: "Рывок при открытии газа с нуля (резкий инжектор)", sev: "low", fix: "Синхронизация дросселей, регулировка троса газа без люфта." }, I_CCT, { t: "Коррозия коллектора и подрамника", sev: "low", fix: "Осмотр, антикор." }] }), 2.1);
  RE("KAW_ZEPH750", x(KI4, x(KCARB, { code: "ZR750C/D", name: "Kawasaki 738 воздушный (рядная четвёрка: Zephyr 750 / ZR-7)", groups: ["dohc", "air", "carb", "4t", "big"],
    cam: "DOHC, 8 клапанов, 4 цилиндра", cooling: "Воздушное", cc: 738, hp: 76, torque: "≈ 63 Н·м", compression: "≈ 9.5 бар", redline: 10000, carb: "Keihin CVK32 ×4", idle: "1000–1200",
    valveIn: "0.08–0.18 мм", valveEx: "0.13–0.23 мм", spark: "NGK D9EA", gap: "0.6–0.7 мм", sparkTorque: "14 Н·м", oilVol: "≈ 3.5 л с фильтром", fuel: "АИ-92/95",
    issues: [I_REG, I_SYNC, { t: "Масло подтекает по крышке клапанов и патрубкам", sev: "low", fix: "Прокладки, ровная затяжка." }, I_AGE] })), 1.8);
  RE("KAW_ZEPH550", x(KI4, x(KCARB, { code: "ZR550B", name: "Kawasaki 553 воздушный (рядная четвёрка: Zephyr 550)", groups: ["dohc", "air", "carb", "4t", "big"],
    cam: "DOHC, 8 клапанов, 4 цилиндра", cooling: "Воздушное", cc: 553, hp: 50, torque: "≈ 46 Н·м", compression: "≈ 9.5 бар", redline: 10500, carb: "Keihin CVK30 ×4", idle: "1000–1200",
    valveIn: "0.08–0.18 мм", valveEx: "0.13–0.23 мм", spark: "NGK D8EA", gap: "0.6–0.7 мм", sparkTorque: "14 Н·м", oilVol: "≈ 3.0 л с фильтром", fuel: "АИ-92/95",
    issues: [I_REG, I_SYNC, I_AGE] })), 1.7);
  RE("KAW_ZEPH400", x(KI4, x(KCARB, { code: "ZR400C", name: "Kawasaki 399 воздушный (рядная четвёрка: Zephyr 400)", groups: ["dohc", "air", "carb", "4t", "big"],
    cam: "DOHC, 8 клапанов, 4 цилиндра", cooling: "Воздушное", cc: 399, hp: 46, torque: "≈ 31 Н·м", compression: "≈ 10 бар", redline: 12000, carb: "Keihin CVK ×4", idle: "1100–1300",
    valveIn: "0.08–0.18 мм", valveEx: "0.13–0.23 мм", spark: "NGK D8EA", gap: "0.6–0.7 мм", sparkTorque: "14 Н·м", oilVol: "≈ 3.0 л с фильтром", fuel: "АИ-92/95",
    issues: [I_REG, I_SYNC, { t: "Масложор и сизый дым у пробежных — колпачки и кольца", sev: "med", fix: "Компрессия при покупке, замена колпачков." }, I_AGE] })), 1.5);
  CL("KAW_ZEPH400X", "KAW_ZEPH400", { code: "ZR400G", name: "Kawasaki 399 воздушный 16V (рядная четвёрка: Zephyr χ)", cam: "DOHC, 16 клапанов, 4 цилиндра", hp: 53, torque: "≈ 36 Н·м", redline: 13000 }, 1.5);
  RE("KAW_ZEPH1100", x(KI4, x(KCARB, { code: "ZRT10A", name: "Kawasaki 1062 воздушный (рядная четвёрка: Zephyr 1100, 2 свечи на цилиндр)", groups: ["dohc", "air", "carb", "4t", "big"],
    cam: "DOHC, 8 клапанов, 4 цилиндра, 8 свечей", cooling: "Воздушное", cc: 1062, hp: 93, torque: "≈ 90 Н·м", compression: "≈ 9 бар", redline: 9000, carb: "Keihin CVK36 ×4", idle: "950–1050",
    valveIn: "0.08–0.18 мм", valveEx: "0.13–0.23 мм", spark: "NGK DR8EA (×8)", gap: "0.6–0.7 мм", sparkTorque: "14 Н·м", oilVol: "≈ 3.8 л с фильтром", fuel: "АИ-92/95",
    issues: [I_REG, I_SYNC, { t: "Катушки и провода на 8 свечей — пропуски на старых", sev: "low", fix: "Проверка катушек и колпачков." }, I_AGE] })), 2.2);

  /* --- 800–1000 --- */
  RE("KAW_ZR800", x(KI4, { code: "ZR800A", name: "Kawasaki 806 (рядная четвёрка: Z800 2013–2016)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 806, hp: 113, torque: "≈ 83 Н·м", compression: "≈ 11.9 бар", redline: 11500, oilVol: "≈ 4.0 л с фильтром", coolant: "≈ 2.7 л",
    issues: [I_REG, { t: "Резкий отклик газа в 1–2 передаче", sev: "low", fix: "Синхронизация, привычка; доработка прошивки." }, { t: "Перегрев ног и вентилятор в пробках", sev: "low", fix: "Проверить вентилятор, термоэкраны." }] }), 2.2);
  RE("KAW_ZX900B", x(KI4, x(KCARB, { code: "ZX900B/C/E/F", name: "Kawasaki 899 (рядная четвёрка: ZX-9R 1994–2003)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 899, hp: 143, torque: "≈ 101 Н·м", compression: "≈ 11.5 бар", redline: 12000, carb: "Keihin CVKD40 ×4", idle: "1000–1200", spark: "NGK CR9E", gap: "0.7–0.8 мм",
    oilVol: "≈ 3.5 л с фильтром", coolant: "≈ 2.8 л", fuel: "АИ-95/98", issues: [I_REG, I_CCT, I_SYNC, { t: "Изнашиваются шестерни 2-й передачи при «вылетах» передачи", sev: "med", fix: "Не дожимать переключение, ремонт КПП при выбивании." }] })), 2.2);
  RE("KAW_ZR1000A", x(KI4, { code: "ZR1000A/B", name: "Kawasaki 953 (рядная четвёрка: Z1000 2003–2009)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 953, hp: 127, torque: "≈ 96 Н·м", compression: "≈ 11.2 бар", redline: 11000, oilVol: "≈ 3.8 л с фильтром", coolant: "≈ 2.6 л",
    issues: [I_REG, I_CCT, { t: "Рывки на малом газе (резкий инжектор)", sev: "low", fix: "Синхронизация дросселей, люфт троса газа." }, I_FAN] }), 2.3);
  RE("KAW_GPZ900", x(KI4, x(KCARB, { code: "ZX900A", name: "Kawasaki 908 (рядная четвёрка: GPZ900R / Eliminator 900)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 908, hp: 115, torque: "≈ 85 Н·м", compression: "≈ 11 бар", redline: 10500, carb: "Keihin CVK34 ×4", idle: "950–1050", spark: "NGK C9E", gap: "0.7–0.8 мм",
    oilVol: "≈ 3.5 л с фильтром", coolant: "≈ 2.6 л", fuel: "АИ-92/95",
    issues: [{ t: "Натяжитель цепи ГРМ ранней конструкции — стук, вытяжка цепи", sev: "med", fix: "Натяжитель поздней версии / ручной, цепь." }, I_REG, I_AGE] })), 2.1);
  RE("KAW_GTR1000", x(KI4, x(KCARB, { code: "ZXT00A/ZG1000", name: "Kawasaki 997 (рядная четвёрка: GTR1000 / Concours, GPZ1000RX, ZX-10 Tomcat)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 997, hp: 98, torque: "≈ 85 Н·м", compression: "≈ 10.2 бар", redline: 10000, carb: "Keihin CVK32 ×4", idle: "950–1050", spark: "NGK C9E", gap: "0.7–0.8 мм",
    gearbox: "6 ст. (GTR1000 — кардан)", oilVol: "≈ 3.9 л с фильтром", coolant: "≈ 2.8 л", fuel: "АИ-92/95",
    issues: [{ t: "Кардан: масло и шлицы главной передачи", sev: "med", fix: "Смазка шлицов при замене колеса, масло редуктора." }, I_REG, I_SYNC, I_AGE] })), 2.2);

  /* --- 1000–1400 --- */
  RE("KAW_ZX10C", x(KI4, { code: "ZXT00C/D", name: "Kawasaki ZX-10R 998 (2004–2007)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 998, hp: 175, torque: "≈ 115 Н·м", compression: "≈ 12.7 бар", redline: 13000, valveIn: "0.10–0.19 мм", valveEx: "0.22–0.31 мм",
    oilVol: "≈ 3.4 л с фильтром", coolant: "≈ 2.9 л", fuel: "АИ-98",
    issues: [{ t: "Лёгкое переднее колесо, «ведёт» руль — демпфер обязателен", sev: "med", fix: "Рулевой демпфер, исправная подвеска." }, I_REG, I_CCT] }), 2.5);
  CL("KAW_ZX10E", "KAW_ZX10C", { code: "ZXT00E/F", name: "Kawasaki ZX-10R 998 (2008–2010)", hp: 188, torque: "≈ 113 Н·м", redline: 13000,
    issues: [I_REG, { t: "Провал тяги внизу на стоке (экологическая прошивка)", sev: "low", fix: "Перепрошивка ЭБУ, снятие заслонки выпуска." }, I_CCT] }, 2.5);
  RE("KAW_ZX10J", x(KI4, { code: "ZXT00J/R/S", name: "Kawasaki ZX-10R 998 (2011+: ZX-10R / ZX-10RR)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 998, hp: 200, torque: "≈ 112 Н·м", compression: "≈ 13 бар", redline: 14000, valveIn: "0.10–0.19 мм", valveEx: "0.22–0.31 мм",
    oilVol: "≈ 4.0 л с фильтром", coolant: "≈ 3.0 л", fuel: "АИ-98", gearbox: "6 ст., слипер-сцепление, квикшифтер (2016+)",
    issues: [{ t: "Электроника S-KTRC/IMU — ошибки датчиков после падений", sev: "low", fix: "Диагностика KDS, проверка датчиков колёс." }, I_REG, { t: "2011–2012: шум/дребезг на холостых (натяжитель)", sev: "low", fix: "Обновлённый натяжитель цепи ГРМ." }] }), 2.6);
  RE("KAW_ZX1100", x(KI4, x(KCARB, { code: "ZX1100C/D", name: "Kawasaki 1052 (рядная четвёрка: ZZR1100 / ZX-11, GPZ1100, ZRX1100)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 1052, hp: 147, torque: "≈ 110 Н·м", compression: "≈ 11 бар", redline: 11000, carb: "Keihin CVKD40 ×4 (ZRX1100 — CVK36)", idle: "1000–1100", spark: "NGK CR9E", gap: "0.7–0.8 мм",
    oilVol: "≈ 4.0 л с фильтром", coolant: "≈ 3.1 л", fuel: "АИ-95",
    issues: [I_REG, I_CCT, { t: "Износ 2-й передачи (выбивает) у ZZR1100", sev: "med", fix: "Переключать до конца, ремонт КПП при выбивании." }, I_AGE] })), 2.4);
  RE("KAW_ZRT1200", x(KI4, x(KCARB, { code: "ZRT20A/ZX1200C", name: "Kawasaki 1164 (рядная четвёрка: ZRX1200R/S, ZZR1200)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cc: 1164, hp: 122, torque: "≈ 112 Н·м", compression: "≈ 10.1 бар", redline: 10500, carb: "Keihin CVR36 ×4 (ZZR1200 — CVR40)", idle: "1000–1100", spark: "NGK CR9E", gap: "0.7–0.8 мм",
    oilVol: "≈ 4.0 л с фильтром", coolant: "≈ 3.1 л", fuel: "АИ-95",
    issues: [I_REG, I_SYNC, I_CCT, { t: "Тяжёлый: износ подшипников рулевой и маятника", sev: "low", fix: "Смазка и замена подшипников по осмотру." }] })), 2.4);
  CL("KAW_ZRT1200F", "KAW_ZRT1200", { code: "ZRT20D", name: "Kawasaki 1164 инжектор (рядная четвёрка: ZRX1200 DAEG 2009–2016)", groups: ["dohc", "liquid", "efi", "4t", "big"], hp: 110,
    ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—", oilInt: 6000 }, 2.4);
  RE("KAW_ZX1200", x(KI4, { code: "ZXT20A/B", name: "Kawasaki 1199 (рядная четвёрка: Ninja ZX-12R 2000–2006)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 1199, hp: 178, torque: "≈ 134 Н·м", compression: "≈ 12.2 бар", redline: 11500, oilVol: "≈ 4.0 л с фильтром", coolant: "≈ 3.4 л", fuel: "АИ-98",
    issues: [I_REG, { t: "2000 модельный год: рывки инжектора на малом газе", sev: "low", fix: "Перепрошивка/обновлённый ЭБУ, синхронизация." }, I_CCT, I_FAN] }), 2.6);
  RE("KAW_ZX1400A", x(KI4, { code: "ZXT40A/C", name: "Kawasaki 1352 (рядная четвёрка: ZX-14 / ZZR1400 2006–2011)", groups: ["dohc", "liquid", "efi", "4t", "big", "balancer"],
    cam: "DOHC, 16 клапанов, 4 цилиндра, балансирный вал", cc: 1352, hp: 190, torque: "≈ 154 Н·м", compression: "≈ 12 бар", redline: 11000,
    oilVol: "≈ 4.0 л с фильтром", coolant: "≈ 3.1 л", fuel: "АИ-95/98",
    issues: [I_CCT, I_REG, { t: "Жар от мотора на ноги, вентилятор работает постоянно", sev: "low", fix: "Чистый радиатор, исправный термостат." }, { t: "Цепь и звёзды — огромный момент, быстрый износ", sev: "low", fix: "Смазка цепи и контроль натяжения." }] }), 2.6);
  CL("KAW_ZX1400E", "KAW_ZX1400A", { code: "ZXT40E/H", name: "Kawasaki 1441 (рядная четвёрка: ZX-14R / ZZR1400 2012–2020)", cc: 1441, hp: 200, torque: "≈ 158 Н·м", compression: "≈ 12.3 бар", gearbox: "6 ст., слипер-сцепление" }, 2.6);
  CL("KAW_ZG1400", "KAW_ZX1400A", { code: "ZGT40A", name: "Kawasaki 1352 VVT (рядная четвёрка: 1400GTR / Concours 14)", hp: 155, torque: "≈ 136 Н·м", compression: "≈ 10.7 бар", redline: 10500,
    cam: "DOHC, 16 клапанов, изменяемые фазы (впуск)", gearbox: "6 ст., кардан (Tetra-Lever)", oilVol: "≈ 4.5 л с фильтром",
    issues: [{ t: "Кардан: масло главной передачи, шлицы", sev: "med", fix: "Масло редуктора по регламенту, смазка шлицов." }, { t: "Жар на правую ногу и бак", sev: "low", fix: "Термоэкраны, дефлекторы." }, I_REG, { t: "Ключ KIPASS (бесключевой доступ) — сбои при слабом АКБ брелока", sev: "low", fix: "Батарейка брелока, свежий АКБ мотоцикла." }] }, 2.6);
  RE("KAW_ZR1100", x(KI4, { code: "ZXT10 (1099)", name: "Kawasaki 1099 (рядная четвёрка 2025+: Ninja 1100SX / Versys 1100 / Z1100)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cc: 1099, hp: 136, torque: "≈ 113 Н·м", compression: "≈ 11.8 бар", redline: 10500, oilVol: "≈ 4.0 л с фильтром", coolant: "≈ 2.9 л", gearbox: "6 ст., слипер-сцепление, квикшифтер",
    issues: [{ t: "Новый мотор — статистики поломок мало, ТО строго по регламенту", sev: "low", fix: "Масло каждые 6000 км, клапаны по регламенту." }, I_REG] }), 2.5);
  RE("KAW_H2", x(KI4, { code: "ZXT00L/P", name: "Kawasaki 998 с нагнетателем (рядная четвёрка: Ninja H2 / H2 SX / Z H2)", groups: ["dohc", "liquid", "efi", "4t", "big"],
    cam: "DOHC, 16 клапанов, центробежный нагнетатель", cc: 998, hp: 200, torque: "≈ 137 Н·м", compression: "≈ 11 бар", redline: 12000,
    valveIn: "0.10–0.19 мм", valveEx: "0.22–0.31 мм", spark: "NGK SILMAR9A9", oilVol: "≈ 5.0 л с фильтром", coolant: "≈ 3.4 л", fuel: "АИ-98", gearbox: "6 ст., слипер-сцепление, квикшифтер",
    issues: [{ t: "Нагнетатель смазывается моторным маслом — только качественная синтетика и свежий фильтр", sev: "high", fix: "Масло 10W-40/10W-50 JASO MA2 строго по регламенту." }, { t: "Сильный нагрев в городе", sev: "low", fix: "Исправный вентилятор, не стоять долго на месте." }, { t: "Дорогое ТО: клапаны, свечи, ремонт у дилера", sev: "med", fix: "Закладывай бюджет, диагностика KDS." }] }), 2.8);

  /* --- 500 двойки (T500K в базе) и классика --- */
  RE("KAW_W650", { region: "jp", code: "EJ650A", name: "Kawasaki 676 (рядная двойка 360°, вертикальный вал: W650)", maker: "Kawasaki", layout: "twin", crankPhase: 360,
    groups: ["air", "carb", "4t", "big"], cam: "SOHC с приводом вертикальным валом, 8 клапанов", cooling: "Воздушное", cc: 676, hp: 50, torque: "≈ 56 Н·м", compression: "≈ 8.6 бар", redline: 7500,
    ignition: "Транзисторное (TCI)", start: "Электро + кик", gearbox: "5 ст.", carb: "Keihin CVK34 ×2", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "900–1000",
    valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK BPR7ES", gap: "0.7–0.8 мм", sparkTorque: "14 Н·м", oil: "10W-40 (JASO MA)", oilVol: "≈ 2.6 л с фильтром", oilInt: 5000, valveInt: 12000, fuel: "АИ-92/95",
    issues: [{ t: "Клапаны с винтовой регулировкой — проверять каждые 12 тыс. км", sev: "low", fix: "Регулировка на холодную по меткам." }, I_SYNC, { t: "Обледенение карбюраторов в сырую прохладную погоду", sev: "low", fix: "Подогрев, не ездить на прикрытом газе долго." }] }, 1.8);
  CL("KAW_W400", "KAW_W650", { code: "EJ400A", name: "Kawasaki 399 (рядная двойка 360°, вертикальный вал: W400)", cc: 399, hp: 29, torque: "≈ 30 Н·м" }, 1.6);
  CL("KAW_W800", "KAW_W650", { code: "EJ800A", name: "Kawasaki 773 инжектор (рядная двойка 360°, вертикальный вал: W800)", cc: 773, hp: 48, torque: "≈ 62 Н·м", groups: ["air", "efi", "4t", "big"],
    ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—", start: "Электро", oilVol: "≈ 4.0 л с фильтром", oilInt: 6000,
    issues: [{ t: "Клапаны с винтовой регулировкой — проверять по регламенту", sev: "low", fix: "Регулировка на холодную." }, { t: "Хром и спицы ржавеют от реагентов", sev: "low", fix: "Мойка и воск, хранение в сухом." }] }, 2.0);
  RE("KAW_BJ250", { region: "jp", code: "BJ250A", name: "Kawasaki 249 воздушный (сингл: Estrella 250 / 250TR)", maker: "Kawasaki", groups: ["air", "carb", "4t", "big"],
    cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 249, hp: 20, torque: "≈ 21 Н·м", compression: "≈ 9.5 бар", redline: 8500, ignition: "CDI", start: "Электро (+кик у ранних)", gearbox: "5 ст.",
    carb: "Keihin CVK34 (с 2007 — инжектор)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1200–1400",
    valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK BPR7ES", gap: "0.7–0.8 мм", sparkTorque: "14 Н·м", oil: "10W-40 (JASO MA)", oilVol: "≈ 1.7 л с фильтром", oilInt: 4000, valveInt: 6000, fuel: "АИ-92",
    issues: [{ t: "Простой и живучий: главное масло и клапаны вовремя", sev: "low", fix: "Регулировка клапанов винтами." }, { t: "Засор карбюратора после зимы", sev: "low", fix: "Сливать поплавковую камеру на хранение." }] }, 1.4);
  RE("KAW_BN125", { region: "jp", code: "BN125A", name: "Kawasaki 124 воздушный (сингл: Eliminator 125)", maker: "Kawasaki", groups: ["air", "carb", "4t", "small"],
    cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 124, hp: 12, torque: "≈ 10 Н·м", compression: "≈ 9.5 бар", redline: 9500, ignition: "CDI", start: "Электро", gearbox: "5 ст.",
    carb: "Keihin / Mikuni (по году)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1300–1500",
    valveIn: "0.10–0.15 мм", valveEx: "0.10–0.15 мм", spark: "NGK CR7HSA", gap: "0.6–0.7 мм", sparkTorque: "12 Н·м", oil: "10W-40 (JASO MA)", oilVol: "≈ 1.2 л с фильтром", oilInt: 3000, valveInt: 6000, fuel: "АИ-92",
    issues: [{ t: "Слабая тяга на трассе — мотор 125 на тяжёлой раме", sev: "low", fix: "Звезда, не держать долго на отсечке." }, { t: "Цепь ГРМ шумит после 20 тыс. км", sev: "med", fix: "Цепь и натяжитель." }] }, 1.3);
  RE("KAW_BR125", { region: "jp", code: "BR125 (2019+)", name: "Kawasaki 125 жидкостный (сингл DOHC: Ninja 125 / Z125 2019+)", maker: "Kawasaki", groups: ["dohc", "liquid", "efi", "4t", "small"],
    cam: "DOHC, 4 клапана", cc: 125, hp: 15, torque: "≈ 11.7 Н·м", compression: "≈ 11.5 бар", redline: 10500,
    valveIn: "0.15–0.24 мм", valveEx: "0.22–0.31 мм", spark: "NGK CR8EIA-9", gap: "0.8–0.9 мм", sparkTorque: "12 Н·м", oil: "10W-40 (JASO MA)", oilVol: "≈ 1.4 л с фильтром", oilInt: 6000, valveInt: 12000, coolant: "≈ 0.8 л",
    issues: [{ t: "Сцепление и цепь страдают у учебных мотоциклов", sev: "low", fix: "Контроль троса, смазка цепи." }, { t: "Падения: рычаги, подножки, радиатор", sev: "low", fix: "Слайдеры и защита радиатора." }] }, 1.6);

  /* --- круизеры Vulcan --- */
  var VN = { region: "jp", maker: "Kawasaki", layout: "vtwin", oil: "10W-40 (JASO MA)", fuel: "АИ-92/95", ignition: "Транзисторное (TCI)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу" };
  var I_SHAFT = { t: "Кардан: масло в главной передаче и смазка шлицов", sev: "med", fix: "Замена масла редуктора, смазка шлицов при снятии колеса." };
  var I_VREG = { t: "Реле-регулятор греется (особенно с доп. светом)", sev: "med", fix: "Проверка зарядки, регулятор MOSFET." };
  RE("KAW_VN400", x(VN, { code: "VN400A/C", name: "Kawasaki 399 V-twin 55° (Vulcan 400 / Classic / Drifter 400)", vAngle: 55, groups: ["liquid", "carb", "4t", "big"],
    cam: "SOHC, V-twin 55°", cc: 399, hp: 33, torque: "≈ 33 Н·м", compression: "≈ 10 бар", redline: 9500, gearbox: "5 ст., кардан", carb: "Keihin ×2", idle: "1100–1300",
    valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK DPR7EA-9", gap: "0.8–0.9 мм", sparkTorque: "14 Н·м", oilVol: "≈ 2.6 л с фильтром", oilInt: 5000, valveInt: 12000, coolant: "≈ 1.5 л",
    issues: [I_SHAFT, I_VREG, I_SYNC] }), 1.6);
  RE("KAW_VN750", x(VN, { code: "VN750A", name: "Kawasaki 749 V-twin 55° (Vulcan 750)", vAngle: 55, groups: ["dohc", "liquid", "carb", "4t", "big"],
    cam: "DOHC, 8 клапанов, 4 свечи, гидрокомпенсаторы", cc: 749, hp: 66, torque: "≈ 65 Н·м", compression: "≈ 10.3 бар", redline: 9000, gearbox: "5 ст., кардан", carb: "Keihin CVK34 ×2", idle: "1000–1100",
    valveIn: "гидрокомпенсаторы", valveEx: "гидрокомпенсаторы", valveInt: 0, spark: "NGK DPR7EA-9 (×4)", gap: "0.8–0.9 мм", sparkTorque: "14 Н·м", oilVol: "≈ 3.2 л с фильтром", oilInt: 5000, coolant: "≈ 1.8 л",
    issues: [I_SHAFT, { t: "Гидрокомпенсаторы стучат на старом/жидком масле", sev: "med", fix: "Свежее масло нужной вязкости, прогрев." }, I_VREG] }), 1.8);
  RE("KAW_VN800", x(VN, { code: "VN800A/B/E", name: "Kawasaki 805 V-twin 55° (Vulcan 800 / Classic / Drifter 800)", vAngle: 55, groups: ["liquid", "carb", "4t", "big"],
    cam: "SOHC, 8 клапанов, V-twin 55°", cc: 805, hp: 56, torque: "≈ 64 Н·м", compression: "≈ 9.5 бар", redline: 7500, gearbox: "5 ст., цепь", carb: "Keihin CVK36", idle: "1000–1100",
    valveIn: "0.13–0.18 мм", valveEx: "0.18–0.23 мм", spark: "NGK DPR7EA-9", gap: "0.8–0.9 мм", sparkTorque: "14 Н·м", oilVol: "≈ 3.0 л с фильтром", oilInt: 5000, valveInt: 12000, coolant: "≈ 1.8 л",
    issues: [I_VREG, { t: "Один карбюратор на два цилиндра — длинный впуск, рывки на холодную", sev: "low", fix: "Прогрев, чистка карбюратора, проверить подсос." }, { t: "Цепь и звёзды (у классического круизера — цепь)", sev: "low", fix: "Смазка и натяжение." }] }), 1.8);
  RE("KAW_VN1500C", x(VN, { code: "VNT50 (карб.)", name: "Kawasaki 1470 V-twin 50° карбюратор (Vulcan 1500 / Classic / Nomad / Drifter)", vAngle: 50, groups: ["liquid", "carb", "4t", "big"],
    cam: "SOHC, V-twin 50°, гидрокомпенсаторы", cc: 1470, hp: 64, torque: "≈ 113 Н·м", compression: "≈ 9 бар", redline: 5000, gearbox: "5 ст., кардан", carb: "Keihin CVK40 ×1–2 (по модели)", idle: "800–950",
    valveIn: "гидрокомпенсаторы", valveEx: "гидрокомпенсаторы", valveInt: 0, spark: "NGK BPR6ES", gap: "0.7–0.8 мм", sparkTorque: "14 Н·м", oilVol: "≈ 4.0 л с фильтром", oilInt: 5000, coolant: "≈ 2.3 л",
    issues: [I_SHAFT, { t: "Гидрокомпенсаторы стучат после стоянки", sev: "low", fix: "Свежее масло, стук уходит после прогрева." }, I_VREG, { t: "Термостат и вентилятор в пробках", sev: "low", fix: "Проверка вентилятора перед сезоном." }] }), 2.0);
  CL("KAW_VN1500F", "KAW_VN1500C", { code: "VNT50 (Fi)", name: "Kawasaki 1470 V-twin 50° инжектор (Vulcan 1500 Classic Fi / Mean Streak / Nomad Fi)", groups: ["liquid", "efi", "4t", "big"],
    ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—", idle: "900–1000", oilInt: 6000 }, 2.0);
  CL("KAW_VN1600", "KAW_VN1500F", { code: "VNT60", name: "Kawasaki 1552 V-twin 50° (Vulcan 1600 Classic / Nomad / Mean Streak)", cc: 1552, hp: 65, torque: "≈ 127 Н·м" }, 2.1);
  RE("KAW_VN1700", x(VN, { code: "VNT70", name: "Kawasaki 1700 V-twin 52° (Vulcan 1700 Classic / Nomad / Vaquero / Voyager)", vAngle: 52, groups: ["liquid", "efi", "4t", "big"],
    cam: "SOHC, 8 клапанов, гидрокомпенсаторы", cc: 1700, hp: 73, torque: "≈ 136 Н·м", compression: "≈ 9.5 бар", redline: 5500, gearbox: "6 ст. (6-я — овердрайв), ремень", ignition: "ЭБУ (EFI)", carb: "Инжектор, электронная дроссельная заслонка", jetMain: "—", jetPilot: "—", needle: "—", idle: "850–950",
    valveIn: "гидрокомпенсаторы", valveEx: "гидрокомпенсаторы", valveInt: 0, spark: "NGK DPR7EA-9", gap: "0.8–0.9 мм", sparkTorque: "14 Н·м", oilVol: "≈ 4.5 л с фильтром", oilInt: 6000, coolant: "≈ 2.5 л",
    issues: [{ t: "Ремень привода: камни и износ зубьев", sev: "low", fix: "Осмотр ремня и шкива, натяжение по мануалу." }, I_VREG, { t: "Жар от заднего цилиндра", sev: "low", fix: "Термоэкраны, исправный вентилятор." }] }), 2.2);
  RE("KAW_VN2000", x(VN, { code: "VNT02", name: "Kawasaki 2053 V-twin 52° OHV (Vulcan 2000)", vAngle: 52, groups: ["liquid", "efi", "4t", "big"],
    cam: "OHV (штанги), 8 клапанов, гидрокомпенсаторы", cc: 2053, hp: 103, torque: "≈ 177 Н·м", compression: "≈ 9.5 бар", redline: 5000, gearbox: "5 ст., ремень", ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—", idle: "800–900",
    valveIn: "гидрокомпенсаторы", valveEx: "гидрокомпенсаторы", valveInt: 0, spark: "NGK DPR7EA-9", gap: "0.8–0.9 мм", sparkTorque: "14 Н·м", oilVol: "≈ 5.0 л с фильтром", oilInt: 6000, coolant: "≈ 3 л",
    issues: [{ t: "Огромный момент: ремень и сцепление", sev: "low", fix: "Осмотр ремня, плавный старт." }, I_VREG, { t: "Тяжёлый (≈ 340 кг): шины и тормоза изнашиваются быстро", sev: "low", fix: "Давление в шинах, свежая тормозная жидкость." }] }), 2.4);

  /* --- кросс и эндуро: 2T --- */
  var K2T = { region: "jp", maker: "Kawasaki", stroke: "2T", cooling: "Жидкостное", fuel: "АИ-95/98 + 2T масло 1:32…1:40", ignition: "CDI", start: "Кик", idle: "—",
    jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", valveIn: "—", valveEx: "—", gap: "0.6–0.7 мм", sparkTorque: "27 Н·м", oil: "Premix", oilVol: "КПП ≈ 0.7–0.8 л (SAE 10W-40)",
    oilInt: 0, valveInt: 0, hours: true, cam: "Лепестковый клапан, клапан выпуска KIPS" };
  var I_KIPS = { t: "Клапаны выпуска KIPS закоксовываются — мотор «тупит» вверху", sev: "med", fix: "Чистка KIPS каждые 30–40 моточасов, качественное 2T масло." };
  var I_PIS = { t: "Поршень и кольца по моточасам", sev: "high", fix: "Журнал моточасов, замер зазора поршень–цилиндр." };
  RE("KAW_KX125", x(K2T, { code: "KX125 (2T)", name: "Kawasaki KX125 (2T 124, KIPS)", groups: ["2t", "liquid", "carb", "small"], cc: 124, hp: 38, torque: "≈ 25 Н·м", compression: "≈ 9 бар",
    gearbox: "6 ст.", carb: "Keihin PWK35 / Mikuni TMX38 (2003+)", spark: "NGK BR9EIX", coolant: "≈ 0.9 л", issues: [I_PIS, I_KIPS, { t: "Лепестки трескаются", sev: "med", fix: "Осмотр лепесткового клапана каждые 30 м/ч." }] }), 1.8);
  RE("KAW_KX250", x(K2T, { code: "KX250 (2T)", name: "Kawasaki KX250 (2T 249, KIPS)", groups: ["2t", "liquid", "carb", "big"], cc: 249, hp: 48, torque: "≈ 40 Н·м", compression: "≈ 9 бар",
    gearbox: "5 ст.", carb: "Keihin PWK38", spark: "NGK BR8EIX", coolant: "≈ 1.1 л", issues: [I_PIS, I_KIPS, { t: "Сцепление греется в лесу (кроссовый мотор)", sev: "med", fix: "Масло КПП чаще, тяжёлый маховик для эндуро." }] }), 1.9);
  RE("KAW_KX500", x(K2T, { code: "KX500 (2T)", name: "Kawasaki KX500 (2T 499)", groups: ["2t", "liquid", "carb", "big"], cc: 499, hp: 58, torque: "≈ 60 Н·м", compression: "≈ 8.5 бар",
    cam: "Лепестковый клапан", gearbox: "5 ст.", carb: "Keihin PWK38 / PJ38", spark: "NGK BR8EIX", coolant: "≈ 1.2 л",
    issues: [I_PIS, { t: "Тяжело заводится киком, огромный момент — сцепление", sev: "med", fix: "Декомпрессор, свежие диски сцепления." }] }), 1.9);
  RE("KAW_KX85", x(K2T, { code: "KX85 (2T)", name: "Kawasaki KX85 / KX80 (2T 82–84, KIPS)", groups: ["2t", "liquid", "carb", "small"], cc: 84, hp: 22, torque: "≈ 14 Н·м", compression: "≈ 9 бар",
    gearbox: "6 ст.", carb: "Keihin PWK28", spark: "NGK BR9EIX", oilVol: "КПП ≈ 0.6 л", coolant: "≈ 0.6 л", issues: [I_PIS, I_KIPS] }), 1.5);
  CL("KAW_KX80", "KAW_KX85", { code: "KX80 (2T)", name: "Kawasaki KX80 (2T 82, KIPS)", cc: 82, hp: 20 }, 1.4);
  RE("KAW_KX60", x(K2T, { code: "KX60 (2T)", name: "Kawasaki KX60 (2T 59, детский)", groups: ["2t", "liquid", "carb", "small"], cc: 59, hp: 11, torque: "≈ 7 Н·м", compression: "≈ 8.5 бар",
    cam: "Роторный клапан", gearbox: "6 ст.", carb: "Mikuni VM24", spark: "NGK BR9ES", oilVol: "КПП ≈ 0.5 л", coolant: "≈ 0.4 л", issues: [I_PIS, { t: "Роторный клапан и сальники коленвала — подсос", sev: "med", fix: "Проверка сальников, прокладка крышки ротора." }] }), 1.3);
  CL("KAW_KX100", "KX112", { code: "KX100 (2T)", name: "Kawasaki KX100 (2T 99, KIPS)", cc: 99, hp: 22 }, 1.4);
  RE("KAW_KDX125", x(K2T, { code: "KDX125SR", name: "Kawasaki KDX125SR (2T 124, KIPS, раздельная смазка)", groups: ["2t", "liquid", "carb", "small"], cc: 124, hp: 22, torque: "≈ 18 Н·м", compression: "≈ 8.5 бар",
    fuel: "АИ-92/95, 2T масло в бачок (раздельная смазка)", oil: "2T масло (раздельная смазка)", start: "Кик", gearbox: "6 ст.", carb: "Keihin PWK28", spark: "NGK BR9ES", coolant: "≈ 0.8 л",
    issues: [{ t: "Следить за уровнем масла в бачке и тросом насоса", sev: "high", fix: "Без масла — заклинит; проверить насос и шланги." }, I_KIPS, I_PIS] }), 1.5);
  RE("KAW_KDX250", x(K2T, { code: "KDX250SR", name: "Kawasaki KDX250SR (2T 249, KIPS)", groups: ["2t", "liquid", "carb", "big"], cc: 249, hp: 40, torque: "≈ 36 Н·м", compression: "≈ 9 бар",
    start: "Кик", gearbox: "6 ст.", carb: "Keihin PWK35", spark: "NGK BR8ES", coolant: "≈ 1.1 л", issues: [I_KIPS, I_PIS, I_AGE] }), 1.7);
  CL("KAW_KDX200", "KDX220", { code: "KDX200", name: "Kawasaki KDX200 (2T 198, KIPS)", cc: 198, hp: 32 }, 1.6);

  /* --- кросс и эндуро: 4T --- */
  CL("KAW_KX250F_E", "KX450", { code: "KX250F (EFI)", name: "Kawasaki KX250F 2011–2020 (249, инжектор)", cc: 249, hp: 42, torque: "≈ 28 Н·м", compression: "≈ 13.5 бар", start: "Кик",
    valveIn: "0.10–0.20 мм", valveEx: "0.17–0.22 мм", spark: "NGK CPR8EB-9", oilVol: "≈ 1.0 л", issues: [{ t: "Высокие обороты — клапаны садятся, особенно выпуск", sev: "med", fix: "Проверка зазоров по моточасам (каждые 30 м/ч)." }, I_PIS] }, 1.9);
  CL("KAW_KX250_21", "KAW_KX250F_E", { code: "KX250 (2021+)", name: "Kawasaki KX250 / KX250X 2021+ (249, толкатели-рычаги)", hp: 43, start: "Электро",
    cam: "DOHC, 4 клапана, рычажные толкатели", compression: "≈ 14 бар" }, 2.0);
  CL("KAW_KX450F_09", "KX450", { code: "KX450F (EFI)", name: "Kawasaki KX450F 2009–2018 (449, инжектор)", hp: 54, start: "Кик", valveIn: "0.10–0.20 мм", valveEx: "0.17–0.22 мм", spark: "NGK CPR8EB-9" }, 2.0);
  CL("KAW_KLX450R", "KX450FC", { code: "KLX450A", name: "Kawasaki KLX450R (449, карбюратор, электростартер)", hp: 45, start: "Электро", gearbox: "5 ст., эндуро-ряд", carb: "Keihin FCR40",
    oilInt: 3000, valveInt: 12000, issues: [{ t: "Сток зажат (заглушки впуска/выпуска, иглы)", sev: "low", fix: "Снятие ограничителей и перенастройка FCR." }, { t: "Перегрев в медленном эндуро — вентилятора нет", sev: "med", fix: "Установка вентилятора радиатора." }] }, 2.0);
  CL("KAW_KLX250F", "KLX250", { code: "KLX250 FI", name: "Kawasaki KLX250 / D-Tracker X инжектор (249, DOHC)", hp: 24, groups: ["dohc", "liquid", "efi", "4t", "big", "jp"],
    ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—", idle: "1250–1450" }, 1.7);
  CL("KAW_KLR250", "KLX250", { code: "KL250D", name: "Kawasaki KLR250 (249, DOHC, балансир, 1984–2005)", hp: 22, groups: ["dohc", "liquid", "carb", "4t", "big", "balancer", "jp"],
    cam: "DOHC, 4 клапана, балансирный вал", start: "Кик", carb: "Keihin CVK34", valveIn: "0.10–0.19 мм", valveEx: "0.15–0.24 мм", spark: "NGK DR8ES",
    issues: [{ t: "Возраст: натяжитель балансира и цепь ГРМ", sev: "med", fix: "Регулировка натяжителя балансира по мануалу." }, I_AGE] }, 1.5);
  CL("KAW_KLR650E", "KLR650", { code: "KL650 (2022+)", name: "Kawasaki KLR650 2022+ (652, инжектор)", cc: 652, hp: 40, groups: ["dohc", "liquid", "efi", "4t", "big", "jp", "balancer"],
    ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—", idle: "1200–1400",
    issues: [{ t: "Тяжёлый (≈ 210 кг) — защиты и дуги обязательны", sev: "low", fix: "Защита картера, дуги, боковые кофры аккуратно." }, { t: "Натяжитель балансира уже усиленный, но регулировать по регламенту", sev: "low", fix: "Проверка натяжителя при ТО." }] }, 1.8);
  RE("KAW_KLX125", { region: "jp", code: "LX125C", name: "Kawasaki 125 воздушный (сингл: KLX125 / D-Tracker 125, 2010–2016)", maker: "Kawasaki", groups: ["air", "efi", "4t", "small"],
    cam: "SOHC, 2 клапана", cooling: "Воздушное", cc: 125, hp: 10, torque: "≈ 9.8 Н·м", compression: "≈ 9.5 бар", redline: 9500, gearbox: "5 ст.", carb: "Инжектор (в Азии — карбюратор)", idle: "1300–1500",
    valveIn: "0.10–0.15 мм", valveEx: "0.10–0.15 мм", spark: "NGK CPR7EA-9", gap: "0.8–0.9 мм", sparkTorque: "12 Н·м", oil: "10W-40 (JASO MA)", oilVol: "≈ 1.0 л", oilInt: 3000, valveInt: 6000, fuel: "АИ-92",
    issues: [{ t: "Мягкая подвеска для бездорожья", sev: "low", fix: "Пружины под вес." }, { t: "Датчики EFI после мойки", sev: "low", fix: "Диэлектрическая смазка на разъёмы." }] }, 1.3);

  /* ================= ИСПРАВЛЕНИЯ СУЩЕСТВУЮЩИХ МОДЕЛЕЙ ================= */
  function gen(brand, name, vi, eng, years, extra) {
    var e = ENGINES[eng];
    setEngine(brand, name, vi, eng, Object.assign({ years: years, label: years + " · " + e.code + ", " + e.cc + " см³" }, extra || {}));
  }
  var K = "Kawasaki";
  /* 125, 250, 500 */
  setEngine(K, "Ninja 125", 0, "KAW_BR125"); setEngine(K, "Z125", 0, "KAW_BR125");
  gen(K, "Ninja 250R", 0, "KAW_EX250F", "1986–2007 (GPX250R / Ninja 250R)", { hp: 36 }); addVersion(K, "Ninja 250R", "KAW_EX250J", "2008–2012", { hp: 33 });
  setEngine(K, "Versys-X 250 Tourer", 0, "KAW_EX250L");
  gen(K, "Ninja 500", 0, "KAW_EX500", "2024+"); gen(K, "Z500", 0, "KAW_EX500", "2024+"); gen(K, "Eliminator 500", 0, "KAW_EX500", "2024+");
  gen(K, "Ninja 650", 0, "T650K", "2006–2011 (Ninja 650R / ER-6f)", { hp: 72 }); addVersion(K, "Ninja 650", "T650K", "2012–2016", { hp: 72 }); addVersion(K, "Ninja 650", "T650K", "2017+", { hp: 68 });
  gen(K, "Versys 650", 0, "T650K", "2007–2014", { hp: 64 }); addVersion(K, "Versys 650", "T650K", "2015–2021", { hp: 69 }); addVersion(K, "Versys 650", "T650K", "2022+", { hp: 67 });
  /* 400 */
  gen(K, "ZRX400", 0, "KAW_ZX400", "1994–2008");
  gen(K, "Zephyr 400", 0, "KAW_ZEPH400", "1989–1995"); addVersion(K, "Zephyr 400", "KAW_ZEPH400X", "1996–2008 (Zephyr χ)");
  /* ZX-6R по поколениям */
  gen(K, "Ninja ZX-6R", 0, "KAW_ZX600F", "1995–1997 (F)", { hp: 100 });
  addVersion(K, "Ninja ZX-6R", "KAW_ZX600F", "1998–1999 (G)", { hp: 105 }); addVersion(K, "Ninja ZX-6R", "KAW_ZX600F", "2000–2002 (J)", { hp: 108 });
  addVersion(K, "Ninja ZX-6R", "KAW_ZX636A", "2002 (636 A)", { hp: 113 }); addVersion(K, "Ninja ZX-6R", "KAW_ZX636B", "2003–2004 (636 B)", { hp: 123 });
  addVersion(K, "Ninja ZX-6R", "KAW_ZX636B", "2005–2006 (636 C)", { hp: 130 }); addVersion(K, "Ninja ZX-6R", "KAW_ZX600P", "2007–2008 (599 P)", { hp: 125 });
  addVersion(K, "Ninja ZX-6R", "KAW_ZX600P", "2009–2012 (599 R)", { hp: 128 }); addVersion(K, "Ninja ZX-6R", "KAW_ZX636E", "2013–2018 (636)", { hp: 131 });
  addVersion(K, "Ninja ZX-6R", "KAW_ZX636E", "2019–2023 (636)", { hp: 130 }); addVersion(K, "Ninja ZX-6R", "KAW_ZX636E", "2024+ (636, Euro 5)", { hp: 124 });
  /* ZX-10R по поколениям */
  gen(K, "Ninja ZX-10R", 0, "KAW_ZX10C", "2004–2007", { hp: 175 }); addVersion(K, "Ninja ZX-10R", "KAW_ZX10E", "2008–2010", { hp: 188 });
  addVersion(K, "Ninja ZX-10R", "KAW_ZX10J", "2011–2015", { hp: 200 }); addVersion(K, "Ninja ZX-10R", "KAW_ZX10J", "2016–2020", { hp: 200 }); addVersion(K, "Ninja ZX-10R", "KAW_ZX10J", "2021+", { hp: 203 });
  /* нейкеды 800–1200 */
  gen(K, "Z800", 0, "KAW_ZR800", "2013–2016");
  gen(K, "Z1000", 0, "KAW_ZR1000A", "2003–2006", { hp: 127 }); addVersion(K, "Z1000", "KAW_ZR1000A", "2007–2009", { hp: 125 });
  addVersion(K, "Z1000", "I4_1000K", "2010–2013", { hp: 138 }); addVersion(K, "Z1000", "I4_1000K", "2014–2020", { hp: 142 });
  gen(K, "ZRX1200", 0, "KAW_ZRT1200", "2001–2008 (ZRX1200R / S)"); addVersion(K, "ZRX1200", "KAW_ZRT1200F", "2009–2016 (DAEG)");
  gen(K, "Versys 1000", 0, "I4_1000K", "2012–2018", { hp: 118 }); addVersion(K, "Versys 1000", "I4_1000K", "2019+", { hp: 120 });
  /* KLR / KLX */
  gen(K, "KLR650", 0, "KLR650", "1987–2007", { hp: 42 }); addVersion(K, "KLR650", "KLR650", "2008–2018", { hp: 40 }); addVersion(K, "KLR650", "KAW_KLR650E", "2022+");
  gen(K, "KLR650 S", 0, "KAW_KLR650E", "2022+"); gen(K, "KLR650 Adventure", 0, "KAW_KLR650E", "2022+");
  gen(K, "KLX650", 0, "KLR650", "1993–1996", { hp: 48 });
  gen(K, "KLR250", 0, "KAW_KLR250", "1984–2005");
  gen(K, "KLX250", 0, "KLX250", "1993–2007 (Япония) / 2006–2014 (США), карбюратор"); addVersion(K, "KLX250", "KAW_KLX250F", "2008+ (Япония) / 2018–2020 (США), инжектор");
  setEngine(K, "D-Tracker X", 0, "KAW_KLX250F");
  gen(K, "KLX250SR", 0, "KLX250", "1993–1997", { hp: 30 }); gen(K, "KLX250ES", 0, "KLX250", "1993–1997", { hp: 30 });
  setEngine(K, "KLX150BF", 0, "KLX140", { hp: 12 }); setEngine(K, "KLX140R F", 0, "KLX140");
  gen(K, "KLX125", 0, "DRZ125", "2003–2006 (как Suzuki DR-Z125)"); addVersion(K, "KLX125", "KAW_KLX125", "2010–2016");
  gen(K, "D-Tracker 125", 0, "KAW_KLX125", "2010–2016");
  setEngine(K, "KLX450R", 0, "KAW_KLX450R");
  /* KX / KDX */
  gen(K, "KX125", 0, "KAW_KX125", "1994–1997", { hp: 36 }); addVersion(K, "KX125", "KAW_KX125", "1998–2002", { hp: 38 }); addVersion(K, "KX125", "KAW_KX125", "2003–2008", { hp: 38 });
  gen(K, "KX250 (2T)", 0, "KAW_KX250", "1994–1998", { hp: 47 }); addVersion(K, "KX250 (2T)", "KAW_KX250", "1999–2004", { hp: 48 }); addVersion(K, "KX250 (2T)", "KAW_KX250", "2005–2007", { hp: 48 });
  gen(K, "KX250", 0, "KAW_KX250_21", "2021+"); gen(K, "KX250X", 0, "KAW_KX250_21", "2021+");
  setEngine(K, "KX250F", 1, "KAW_KX250F_E");
  setEngine(K, "KX450F", 1, "KAW_KX450F_09", { hp: 54 });
  gen(K, "KX100", 0, "KAW_KX100", "1989–2021");
  setEngine(K, "KX85", 0, "KAW_KX85");
  gen(K, "KDX125", 0, "KAW_KDX125", "1990–1998");
  gen(K, "KDX250SR", 0, "KAW_KDX250", "1991–1994");
  gen(K, "KDX200", 0, "KAW_KDX200", "1986–2006");

  /* ================= НОВЫЕ МОДЕЛИ ================= */
  /* спорт и спорт-туризм */
  G(K, "Ninja 250", SP, [["KAW_EX250L", "2013–2017"], ["KAW_EX250P", "2018+"]]);
  G(K, "Ninja ZX-25R", SP, [["KAW_ZX25R", "2020+"]]);
  G(K, "ER-4f / Ninja 400R", SP, [["KAW_ER4", "2009–2015"]]);
  G(K, "GPZ500S / Ninja 500R", SP, [["T500K", "1987–2009", { hp: 60 }]]);
  G(K, "GPZ600R", SP, [["KAW_ZX600A", "1985–1990", { hp: 75 }]]);
  G(K, "GPX600R / Ninja 600R", SP, [["KAW_ZX600A", "1988–1997", { hp: 85 }]]);
  G(K, "ZZR250", SP, [["KAW_EX250F", "1990–2007", { hp: 40 }]]);
  G(K, "ZZR400", SP, [["KAW_ZX400", "1990–2007", { hp: 53 }]]);
  G(K, "ZZR600", SP, [["KAW_ZX600E", "1990–2007"]]);
  G(K, "ZZR1100 / ZX-11", SP, [["KAW_ZX1100", "1990–2001"]]);
  G(K, "ZZR1200", SP, [["KAW_ZRT1200", "2002–2005", { hp: 162 }]]);
  G(K, "Ninja ZX-14R / ZZR1400", SP, [["KAW_ZX1400A", "2006–2011"], ["KAW_ZX1400E", "2012–2020"]]);
  G(K, "Ninja ZX-12R", SP, [["KAW_ZX1200", "2000–2006"]]);
  G(K, "Ninja ZX-6RR", SP, [["KAW_ZX600K", "2003–2006"]]);
  G(K, "Ninja ZX-7R / ZX-7RR", SP, [["KAW_ZX750P", "1996–2003"]]);
  G(K, "Ninja ZX-9R", SP, [["KAW_ZX900B", "1994–1997", { hp: 139 }], ["KAW_ZX900B", "1998–2003", { hp: 143 }]]);
  G(K, "Ninja ZX-10RR", SP, [["KAW_ZX10J", "2017+", { hp: 204 }]]);
  G(K, "ZXR250", SP, [["KAW_ZXR250", "1989–1999"]]);
  G(K, "ZXR400", SP, [["KAW_ZX400", "1989–2003", { hp: 65 }]]);
  G(K, "ZXR750", SP, [["KAW_ZXR750", "1989–1995"]]);
  G(K, "GPZ900R", SP, [["KAW_GPZ900", "1984–2003"]]);
  G(K, "GPZ1000RX", SP, [["KAW_GTR1000", "1986–1988", { hp: 125 }]]);
  G(K, "ZX-10 Tomcat", SP, [["KAW_GTR1000", "1988–1990", { hp: 137 }]]);
  G(K, "GPZ1100", SP, [["KAW_ZX1100", "1995–1998", { hp: 136 }]]);
  G(K, "Ninja H2", SP, [["KAW_H2", "2015+", { hp: 231 }]]);
  G(K, "Ninja H2R", SP, [["KAW_H2", "2015+ (трековый)", { hp: 310 }]]);
  G(K, "Ninja H2 SX", SP, [["KAW_H2", "2018+", { hp: 200 }]]);
  G(K, "Ninja 1000SX / Z1000SX", SP, [["I4_1000K", "2011–2019 (Z1000SX / Ninja 1000)", { hp: 138 }], ["I4_1000K", "2020–2024 (Ninja 1000SX)", { hp: 142 }], ["KAW_ZR1100", "2025+ (Ninja 1100SX)", { hp: 136 }]]);
  /* турёры */
  G(K, "GTR1000 / Concours", TR, [["KAW_GTR1000", "1986–2006"]]);
  G(K, "1400GTR / Concours 14", TR, [["KAW_ZG1400", "2008+"]]);
  /* нейкеды */
  G(K, "Z250", NK, [["KAW_EX250L", "2013–2018"], ["KAW_EX250P", "2019+"]]);
  G(K, "ER-4n", NK, [["KAW_ER4", "2011–2016"]]);
  G(K, "ER-5", NK, [["T500K", "1997–2006", { hp: 50 }]]);
  G(K, "Z750", NK, [["KAW_ZR750", "2004–2006", { hp: 110 }], ["KAW_ZR750", "2007–2012", { hp: 106 }]]);
  G(K, "Z750S", NK, [["KAW_ZR750", "2005–2006", { hp: 110 }]]);
  G(K, "Z750R", NK, [["KAW_ZR750", "2011–2012", { hp: 106 }]]);
  G(K, "Z1000R", NK, [["I4_1000K", "2017–2020", { hp: 142 }]]);
  G(K, "Z900RS Cafe", NK, [["I4_900K", "2018+", { hp: 111 }]]);
  G(K, "Z H2", NK, [["KAW_H2", "2020+", { hp: 200 }]]);
  G(K, "Z1100", NK, [["KAW_ZR1100", "2026+", { hp: 136 }]]);
  G(K, "ZR-7 / ZR-7S", NK, [["KAW_ZEPH750", "1999–2004", { hp: 76 }]]);
  G(K, "Zephyr 550", NK, [["KAW_ZEPH550", "1990–1999"]]);
  G(K, "Zephyr 750", NK, [["KAW_ZEPH750", "1991–1999", { hp: 68 }]]);
  G(K, "Zephyr 1100", NK, [["KAW_ZEPH1100", "1992–2006"]]);
  G(K, "ZRX1100", NK, [["KAW_ZX1100", "1997–2000", { hp: 106 }]]);
  G(K, "Balius 250", NK, [["KAW_ZXR250", "1991–2007", { hp: 40 }]]);
  G(K, "Xanthus", NK, [["KAW_ZX400", "1992–1995", { hp: 59 }]]);
  /* тур-эндуро */
  G(K, "Versys 1100", AD, [["KAW_ZR1100", "2025+", { hp: 135 }]]);
  /* классика */
  G(K, "W400", CLS, [["KAW_W400", "2006–2009"]]);
  G(K, "W650", CLS, [["KAW_W650", "1999–2007"]]);
  G(K, "W800", CLS, [["KAW_W800", "2011–2016", { hp: 48 }], ["KAW_W800", "2019+", { hp: 52 }]]);
  G(K, "W800 Cafe", CLS, [["KAW_W800", "2019–2020", { hp: 52 }]]);
  G(K, "Meguro K3", CLS, [["KAW_W800", "2021+", { hp: 52 }]]);
  G(K, "GPZ400R", SP, [["KAW_ZX400", "1985–1989", { hp: 59, approx: true }]]);
  G(K, "GPX400R", SP, [["KAW_ZX400", "1987–1993", { hp: 59, approx: true }]]);
  G(K, "Estrella 250", CLS, [["KAW_BJ250", "1992–2017"]]);
  G(K, "250TR", CLS, [["KAW_BJ250", "2002–2013", { hp: 19 }]]);
  /* круизеры */
  G(K, "Vulcan 400", CH, [["KAW_VN400", "1995–2008"]]);
  G(K, "Vulcan 500 LTD", CH, [["T500K", "1990–2009", { hp: 46 }]]);
  G(K, "Vulcan 750", CH, [["KAW_VN750", "1985–2006"]]);
  G(K, "Vulcan 800 / 800 Classic", CH, [["KAW_VN800", "1995–2006"]]);
  G(K, "Vulcan Drifter", CH, [["KAW_VN400", "1999–2006, Drifter 400"], ["KAW_VN800", "1999–2006, Drifter 800"], ["KAW_VN1500C", "1999–2005, Drifter 1500", { approx: true }]]);
  G(K, "Vulcan 1500", CH, [["KAW_VN1500C", "1987–1999 (VN1500A / Vulcan 88)", { hp: 70 }]]);
  G(K, "Vulcan 1500 Classic", CH, [["KAW_VN1500C", "1996–1999, карбюратор"], ["KAW_VN1500F", "2000–2008, инжектор"]]);
  G(K, "Vulcan Mean Streak", CH, [["KAW_VN1500F", "2002–2003, 1500", { hp: 72 }], ["KAW_VN1600", "2004–2008, 1600", { hp: 72 }]]);
  G(K, "Vulcan Nomad", CH, [["KAW_VN1500C", "1998–1999, 1500 карбюратор"], ["KAW_VN1500F", "2000–2004, 1500 Fi"], ["KAW_VN1600", "2005–2008, 1600"], ["KAW_VN1700", "2009+, 1700"]]);
  G(K, "Vulcan 1600 Classic", CH, [["KAW_VN1600", "2003–2008"]]);
  G(K, "Vulcan 1700 Classic", CH, [["KAW_VN1700", "2009–2014"]]);
  G(K, "Vulcan 1700 Vaquero", CH, [["KAW_VN1700", "2011+"]]);
  G(K, "Vulcan 1700 Voyager", TR, [["KAW_VN1700", "2009+"]]);
  G(K, "Vulcan 2000", CH, [["KAW_VN2000", "2004–2010"]]);
  G(K, "Eliminator 125", CH, [["KAW_BN125", "1998–2009"]]);
  G(K, "Eliminator 250", CH, [["KAW_EX250F", "1987–2003", { hp: 35 }]]);
  G(K, "Eliminator 400", CH, [["T400K", "2023+", { hp: 48 }]]);
  G(K, "Eliminator 600", CH, [["KAW_ZX600A", "1986–1997", { hp: 62 }]]);
  G(K, "Eliminator 900", CH, [["KAW_GPZ900", "1985–1986", { hp: 105 }]]);
  /* кросс */
  G(K, "KX60", KX, [["KAW_KX60", "1983–2003"]]);
  G(K, "KX80", KX, [["KAW_KX80", "1991–2000"]]);
  G(K, "KX500", KX, [["KAW_KX500", "1988–2004"]]);
})();

/* ===================== v29: Yamaha — свои моторы вместо сборных, новые модели ===================== */
(function () {
  var NK = "Нейкед", SP = "Спорт", CH = "Чоппер", TR = "Турер", AD = "Тур-эндуро", EN = "Эндуро", LE = "Лёгкий эндуро",
    MO = "Мотард", KR = "Кросс-эндуро", PB = "Питбайк", KL = "Классика", A = { approx: true };
  function x(base, o) { var r = {}, k; for (k in base) r[k] = base[k]; for (k in o) r[k] = o[k]; return r; }
  /* версия 0 существующей модели: тот же смысл, что был (мотор уточнён, годы проставлены) */
  function sv(name, id, years, extra) {
    var e = ENGINES[id];
    setEngine("Yamaha", name, 0, id, x(years ? { years: years, label: years + " · " + e.code + ", " + e.cc + " см³" } : {}, extra || {}));
  }
  function av(name, id, years, extra) { addVersion("Yamaha", name, id, years, extra); }
  function g(name, type, gens) { G("Yamaha", name, type, gens); }
  /* groups копируем: RE дописывает регион в массив, а базы общие */
  function re(id, o, k) { o.groups = o.groups.slice(); RE(id, o, k); }

  /* ================= МОТОРЫ ================= */
  var Y = { region: "jp", maker: "Yamaha" };
  /* рядные четвёрки: жидкостные, DOHC, шайбы над/под толкателем */
  var I4 = x(Y, { layout: "i4", groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 16 клапанов, 4 цилиндра", cooling: "Жидкостное",
    gap: "0.7–0.8 мм", sparkTorque: "13 Н·м", oil: "10W-40 (JASO MA)", oilInt: 10000, valveInt: 40000, fuel: "АИ-95/98", idle: "1250–1450", coolant: "≈ 2.2 л" });
  var I4C = x(I4, { groups: ["dohc", "liquid", "carb", "4t", "big"], ignition: "Транзисторное (TCI)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу",
    oilInt: 6000, valveInt: 24000, fuel: "АИ-95" });
  /* воздушные (воздушно-масляные) четвёрки XJ / FJ / XJR */
  var I4A = x(I4C, { groups: ["dohc", "air", "carb", "4t", "big"], cooling: "Воздушно-масляное", coolant: "", gearbox: "5 ст.", idle: "1000–1100",
    valveIn: "0.11–0.15 мм", valveEx: "0.16–0.20 мм", spark: "NGK DPR8EA-9", gap: "0.8–0.9 мм", sparkTorque: "17.5 Н·м", fuel: "АИ-92/95" });
  /* V-twin круизеры с воздушным охлаждением, SOHC, регулировка винтами */
  var VA = x(Y, { layout: "vtwin", groups: ["air", "carb", "4t", "big"], cooling: "Воздушное", coolant: "", ignition: "Транзисторное (TCI)",
    jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "950–1050", gearbox: "5 ст., кардан",
    valveIn: "0.07–0.12 мм", valveEx: "0.12–0.17 мм", gap: "0.7–0.8 мм", sparkTorque: "17.5 Н·м", fuel: "АИ-92/95", oilInt: 6000, valveInt: 12000 });
  /* OHV-гиганты Road Star / Warrior / Roadliner: штанги, гидрокомпенсаторы, ремень */
  var VOHV = x(VA, { vAngle: 48, cooling: "Воздушное", cam: "OHV (штанги), 4 клапана на цилиндр, V-twin 48°", valveIn: "гидрокомпенсаторы", valveEx: "гидрокомпенсаторы",
    valveInt: 0, gearbox: "5 ст., ремень", idle: "850–950", topRatio: 1.15, oil: "20W-40 / 20W-50 (JASO MA)", oilInt: 8000 });
  /* 2T дорожные / эндуро с раздельной смазкой */
  var T2 = x(Y, { stroke: "2T", groups: ["2t", "liquid", "carb", "small"], cooling: "Жидкостное", cam: "Лепестковый клапан, YPVS", ignition: "CDI",
    fuel: "АИ-95, масло 2T — в бачок (Autolube)", oil: "2T масло в бачок; КПП — 10W-30/10W-40", valveIn: "—", valveEx: "—", valveInt: 0, oilInt: 10000,
    gap: "0.6–0.7 мм", sparkTorque: "20 Н·м", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1300–1500", gearbox: "6 ст.", coolant: "≈ 1 л" });
  var REG = { t: "Реле-регулятор и статор перегреваются — разряд АКБ", sev: "med", fix: "Проверка зарядки 13.5–14.5 В, регулятор MOSFET, чистые разъёмы." };

  /* --- 250 / 400 / 600: FZR, Thundercat, Fazer 600 --- */
  re("YAM_FZR250", x(I4C, { code: "FZR250 (2KR / 3LN)", name: "Yamaha FZR250 / FZR250R / Zeal (рядная четвёрка 249)", cc: 249, hp: 45, torque: "≈ 25 Н·м",
    compression: "≈ 12.5 бар", redline: 17000, carb: "Mikuni ×4", idle: "1300–1500", valveIn: "0.11–0.20 мм", valveEx: "0.21–0.30 мм", spark: "NGK CR9E",
    oilVol: "≈ 2.6 л с фильтром", coolant: "≈ 1.5 л",
    issues: [{ t: "Возраст 30+ лет: карбюраторы, проводка, сальники вилки", sev: "med", fix: "Чистка и синхронизация карбюраторов, ревизия электрики." },
      { t: "Мотор живёт на 12–17 тыс. об/мин — износ ЦПГ и цепи ГРМ", sev: "med", fix: "Компрессия при покупке, натяжитель цепи ГРМ." }, REG] }), 1.6);
  CL("YAM_FZR400", "YAM_FZR250", { code: "FZR400 (1WG / 3EN)", name: "Yamaha FZR400 / FZR400RR (рядная четвёрка 399)", cc: 399, hp: 59, torque: "≈ 39 Н·м",
    redline: 14000, oilVol: "≈ 3 л с фильтром", coolant: "≈ 1.8 л" }, 1.7);
  re("YAM_FZR600", x(I4C, { code: "FZR600 (3HE)", name: "Yamaha FZR600 (рядная четвёрка 599, карбюраторы)", cc: 599, hp: 91, torque: "≈ 66 Н·м",
    compression: "≈ 12 бар", redline: 12500, carb: "Mikuni BDST ×4", valveIn: "0.11–0.20 мм", valveEx: "0.21–0.30 мм", spark: "NGK CR9E",
    oilVol: "≈ 3.2 л с фильтром",
    issues: [REG, { t: "Синхронизация и чистка 4 карбюраторов — рывки на малом газе", sev: "low", fix: "Вакуумметр-синхронизатор, ремкомплекты." },
      { t: "Натяжитель цепи ГРМ — лязг на холодную", sev: "med", fix: "Замена натяжителя, цепь — по вытяжке." }] }), 2.0);
  CL("YAM_YZF600R", "YAM_FZR600", { code: "YZF600R / FZR600R (4JH / 4TV)", name: "Yamaha YZF600R Thundercat / FZR600R / FZS600 Fazer (рядная четвёрка 599)",
    hp: 100, torque: "≈ 68 Н·м", redline: 13000, carb: "Mikuni BDSR36 ×4 (Thundercat), BSR33 ×4 (FZS600)", oilVol: "≈ 3.4 л с фильтром",
    issues: [REG, { t: "Износ 2-й передачи у ездивших «на заднем»", sev: "med", fix: "Проверять КПП при покупке, переключать до упора." },
      { t: "Карбюраторы после хранения — засор холостой системы", sev: "low", fix: "Чистка, сливать поплавковые камеры на зиму." }] }, 2.0);
  /* --- YZF-R6 --- */
  re("YAM_R6_5EB", x(I4C, { code: "YZF-R6 (5EB)", name: "Yamaha YZF-R6 1999–2002 (рядная четвёрка 599, карбюраторы)", cc: 599, hp: 120, torque: "≈ 68 Н·м",
    compression: "≈ 12.4 бар", redline: 15500, carb: "Mikuni BDSR37 ×4", valveIn: "0.11–0.20 мм", valveEx: "0.21–0.30 мм", spark: "NGK CR10EK", gap: "0.6–0.7 мм",
    oilVol: "≈ 2.9 л с фильтром (всего ≈ 3.4 л)", valveInt: 40000, fuel: "АИ-98",
    issues: [REG, { t: "Натяжитель цепи ГРМ и шум ГРМ после трека", sev: "med", fix: "Замена натяжителя, проверка меток и вытяжки цепи." },
      { t: "Трековое прошлое: рама, КПП, перекрученный мотор", sev: "high", fix: "Компрессия, проверка КПП и геометрии при покупке." }] }), 2.2);
  re("YAM_R6_5SL", x(I4, { code: "YZF-R6 (5SL)", name: "Yamaha YZF-R6 2003–2005 / R6S (рядная четвёрка 599, инжектор)", cc: 599, hp: 123, torque: "≈ 68 Н·м",
    compression: "≈ 12.4 бар", redline: 15500, ignition: "ЭБУ (EFI)", carb: "Инжектор", valveIn: "0.11–0.20 мм", valveEx: "0.21–0.25 мм", spark: "NGK CR10EK", gap: "0.6–0.7 мм",
    oilVol: "≈ 2.9 л с фильтром",
    issues: [REG, { t: "Натяжитель цепи ГРМ — лязг на холодную", sev: "med", fix: "Замена натяжителя." },
      { t: "Датчик положения дросселя (TPS) — провалы и рывки", sev: "low", fix: "Проверка и выставление TPS по мануалу." }] }), 2.2);
  CL("YAM_FZ6", "YAM_R6_5SL", { code: "FZ6 (5VX)", name: "Yamaha FZ6 / FZ6 Fazer (рядная четвёрка 600 от R6 5SL)", cc: 600, hp: 98, torque: "≈ 63 Н·м",
    compression: "≈ 12.2 бар", redline: 14000, spark: "NGK CR9EK", gap: "0.6–0.7 мм", fuel: "АИ-95", oilVol: "≈ 3.4 л с фильтром",
    issues: [REG, { t: "Мало тяги внизу — мотор от спортбайка", sev: "low", fix: "Ехать на оборотах выше 7000 или −1 зуб на передней звезде." },
      { t: "Выпуск под сиденьем греет райдера в пробках", sev: "low", fix: "Теплоизоляция, проверка работы вентилятора." }] }, 2.1);
  CL("YAM_XJ6", "YAM_FZ6", { code: "XJ6 (20S)", name: "Yamaha XJ6 / Diversion / Diversion F (рядная четвёрка 600)", hp: 78, torque: "≈ 60 Н·м", redline: 11500,
    spark: "NGK CR9E", gap: "0.7–0.8 мм",
    issues: [{ t: "Течь по прокладке крышки клапанов и датчику на ГБЦ", sev: "low", fix: "Новая прокладка, ровная затяжка." },
      { t: "Ранние партии: рывки на малом газе", sev: "low", fix: "Обновление прошивки ЭБУ у дилера, синхронизация дросселей." }, REG] }, 2.0);
  re("YAM_R6_2C0", x(I4, { code: "YZF-R6 (2C0 / 13S)", name: "Yamaha YZF-R6 2006–2020 (рядная четвёрка 599, YCC-T, YCC-I)", cc: 599, hp: 127, torque: "≈ 66 Н·м",
    compression: "≈ 13.1 бар", redline: 16500, ignition: "ЭБУ (EFI), YCC-T", carb: "Инжектор", valveIn: "0.12–0.19 мм", valveEx: "0.23–0.30 мм", spark: "NGK CR10EK", gap: "0.6–0.7 мм",
    oilVol: "≈ 2.8 л с фильтром", coolant: "≈ 2.4 л",
    issues: [REG, { t: "Титановые впускные клапаны: зазор «садится» после перекрутки", sev: "med", fix: "Проверка зазоров по регламенту, раньше — после трека." },
      { t: "Привод YCC-I (переменные впускные трубы) — ошибки", sev: "low", fix: "Проверка сервопривода и тросика по мануалу." },
      { t: "Трековое прошлое у большинства б/у", sev: "high", fix: "Компрессия, КПП, рама и подшипники при покупке." }] }), 2.3);
  /* --- FZR1000 / Thunderace --- */
  re("YAM_FZR1000", x(I4C, { code: "FZR1000 EXUP (3LE / 3GM)", name: "Yamaha FZR1000 EXUP / YZF1000R Thunderace (рядная четвёрка 1002, 20 клапанов)", cc: 1002,
    hp: 145, torque: "≈ 107 Н·м", compression: "≈ 12 бар", redline: 11500, cam: "DOHC, 20 клапанов (5 на цилиндр), 4 цилиндра", carb: "Mikuni BDST38 ×4",
    valveIn: "0.11–0.20 мм", valveEx: "0.21–0.30 мм", spark: "NGK CR9E", oilVol: "≈ 3.8 л с фильтром", coolant: "≈ 2.6 л",
    issues: [{ t: "Клапан выпуска EXUP закисает — провал тяги внизу", sev: "med", fix: "Снять, почистить и смазать заслонку EXUP, проверить тросы." }, REG,
      { t: "Возраст: карбюраторы, сальники вилки, проводка", sev: "med", fix: "Ревизия при покупке, синхронизация." }] }), 2.4);
  CL("YAM_FZR1000G", "YAM_FZR1000", { code: "FZR1000 Genesis (2LA)", name: "Yamaha FZR1000 Genesis 1987–1988 (рядная четвёрка 989, 20 клапанов)", cc: 989, hp: 135,
    torque: "≈ 99 Н·м", carb: "Mikuni BDST36 ×4",
    issues: [REG, { t: "Возраст 35+ лет: карбюраторы, проводка, резина", sev: "med", fix: "Ревизия при покупке." }] }, 2.3);
  /* --- YZF-R1 и производные --- */
  re("YAM_R1_4XV", x(I4C, { code: "YZF-R1 (4XV / 5JJ)", name: "Yamaha YZF-R1 1998–2001 / FZS1000 Fazer (рядная четвёрка 998, 20 клапанов, карбюраторы)", cc: 998,
    hp: 150, torque: "≈ 108 Н·м", compression: "≈ 11.8 бар", redline: 11750, cam: "DOHC, 20 клапанов (5 на цилиндр), 4 цилиндра",
    carb: "Mikuni BDSR40 ×4 (R1), BSR37 ×4 (FZS1000)", valveIn: "0.11–0.20 мм", valveEx: "0.21–0.25 мм", spark: "NGK CR9E", oilVol: "≈ 3.4 л с фильтром",
    valveInt: 40000, coolant: "≈ 2.5 л",
    issues: [{ t: "R1 1998: слабая 2-я передача — выбивает под нагрузкой", sev: "med", fix: "Проверять КПП при покупке, у FZS1000 — заметно реже." },
      { t: "Клапан EXUP закисает", sev: "low", fix: "Чистка и смазка заслонки, проверка тросов." }, REG] }), 2.4);
  CL("YAM_R1_5PW", "YAM_R1_4XV", { code: "YZF-R1 (5PW)", name: "Yamaha YZF-R1 2002–2003 (рядная четвёрка 998, 20 клапанов, инжектор)", hp: 152,
    groups: ["dohc", "liquid", "efi", "4t", "big", "jp"], ignition: "ЭБУ (EFI)", carb: "Инжектор (с вакуумными заслонками)", jetMain: "—", jetPilot: "—", needle: "—",
    redline: 12500, spark: "NGK CR9EIA-9", oilInt: 10000, fuel: "АИ-98",
    issues: [REG, { t: "Клапан EXUP закисает", sev: "low", fix: "Чистка и смазка заслонки." },
      { t: "Натяжитель цепи ГРМ", sev: "med", fix: "Замена при лязге на холодную." }] }, 2.4);
  re("YAM_R1_5VY", x(I4, { code: "YZF-R1 (5VY)", name: "Yamaha YZF-R1 2004–2006 (рядная четвёрка 998, 20 клапанов)", cc: 998, hp: 172, torque: "≈ 107 Н·м",
    compression: "≈ 12.4 бар", redline: 13750, cam: "DOHC, 20 клапанов (5 на цилиндр), 4 цилиндра", carb: "Инжектор", valveIn: "0.11–0.20 мм", valveEx: "0.21–0.25 мм",
    spark: "NGK CR9EK", oilVol: "≈ 3.4 л с фильтром", coolant: "≈ 2.6 л",
    issues: [REG, { t: "Выпуск под сиденьем — сильный нагрев", sev: "low", fix: "Теплоизоляция, не стоять долго в пробках." },
      { t: "Трековое прошлое у многих б/у", sev: "high", fix: "Компрессия, КПП, рама при покупке." }] }), 2.5);
  CL("YAM_FZ1", "YAM_R1_5VY", { code: "FZ1 (3C3)", name: "Yamaha FZ1 / FZ1 Fazer 2006–2015 (рядная четвёрка 998 от R1 5VY)", hp: 150, torque: "≈ 106 Н·м", redline: 12000,
    fuel: "АИ-95",
    issues: [{ t: "Резкий отклик газа на малых оборотах (рывки)", sev: "low", fix: "Синхронизация дросселей, прошивка / тюнинг-модуль." }, REG,
      { t: "Сильный нагрев в пробках", sev: "low", fix: "Проверка вентилятора и антифриза." }] }, 2.4);
  CL("YAM_FZ8", "YAM_FZ1", { code: "FZ8 (39P)", name: "Yamaha FZ8 / Fazer 8 (рядная четвёрка 779)", cc: 779, hp: 106, torque: "≈ 82 Н·м", redline: 11500,
    issues: [{ t: "Рывки на малом газе на стоке", sev: "low", fix: "Синхронизация дросселей, обновление прошивки." }, REG] }, 2.2);
  re("YAM_R1_4C8", x(I4, { code: "YZF-R1 (4C8)", name: "Yamaha YZF-R1 2007–2008 (рядная четвёрка 998, 16 клапанов, YCC-I)", cc: 998, hp: 180, torque: "≈ 113 Н·м",
    compression: "≈ 12.7 бар", redline: 13750, carb: "Инжектор, YCC-T / YCC-I", valveIn: "0.12–0.19 мм", valveEx: "0.21–0.26 мм", spark: "NGK CR9EIA-9",
    oilVol: "≈ 3.4 л с фильтром", coolant: "≈ 2.6 л",
    issues: [REG, { t: "Сервопривод YCC-I и датчики — ошибки после падений", sev: "low", fix: "Диагностика по коду ошибки, проверка проводки." },
      { t: "Трековое прошлое у многих б/у", sev: "high", fix: "Компрессия, КПП, рама при покупке." }] }), 2.5);
  CL("YAM_R1_14B", "YAM_R1_4C8", { code: "YZF-R1 Crossplane (14B / 1KB)", name: "Yamaha YZF-R1 2009–2014 (рядная четвёрка 998, коленвал crossplane)", hp: 182,
    torque: "≈ 115 Н·м", issues: [{ t: "Большой расход топлива и нагрев", sev: "low", fix: "Норма для мотора, следи за вентилятором и антифризом." }, REG,
      { t: "Трековое прошлое у многих б/у", sev: "high", fix: "Компрессия, КПП, рама при покупке." }] }, 2.6);
  re("YAM_R1_2CR", x(I4, { code: "YZF-R1 (2CR / B3L)", name: "Yamaha YZF-R1 2015+ / MT-10 (рядная четвёрка 998 crossplane, рокеры)", cc: 998, hp: 200, torque: "≈ 112 Н·м",
    compression: "≈ 13 бар", redline: 14000, cam: "DOHC, 16 клапанов, рокеры (finger follower), 4 цилиндра", ignition: "ЭБУ, ride-by-wire (YCC-T)", carb: "Инжектор",
    valveIn: "0.10–0.17 мм", valveEx: "0.20–0.25 мм", spark: "NGK LMAR9E-J", oilVol: "≈ 4.0 л с фильтром", coolant: "≈ 2.6 л",
    issues: [{ t: "R1 2015–2016: отзыв по шестерням 2-й/3-й передач", sev: "high", fix: "Проверить по VIN, что КПП заменена по отзыву." },
      { t: "Сложная электроника — диагностика сканером", sev: "med", fix: "Yamaha-совместимый адаптер и ПО." }, REG] }), 2.7);
  /* --- воздушные четвёрки --- */
  re("YAM_XJ600", x(I4A, { code: "XJ600 (51J / 4BR)", name: "Yamaha XJ600 / XJ600S Diversion (рядная четвёрка 598, воздушная, 8 клапанов)", cc: 598, hp: 61,
    torque: "≈ 53 Н·м", compression: "≈ 10.5 бар", redline: 10500, cam: "DOHC, 8 клапанов, 4 цилиндра", cooling: "Воздушное", carb: "Mikuni BS28 ×4", gearbox: "6 ст.",
    spark: "NGK DR8ES-L", oilVol: "≈ 3 л с фильтром",
    issues: [{ t: "Течь масла по крышке клапанов и прокладке цилиндров", sev: "low", fix: "Новые прокладки, ровная затяжка." },
      { t: "Карбюраторы и синхронизация после хранения", sev: "low", fix: "Чистка, синхронизация вакуумметром." }, REG] }), 1.8);
  CL("YAM_XJ900", "YAM_XJ600", { code: "XJ900 (31A / 4KM)", name: "Yamaha XJ900F / XJ900S Diversion (рядная четвёрка 891, воздушная, кардан)", cc: 891, hp: 89,
    torque: "≈ 82 Н·м", compression: "≈ 10 бар", redline: 9500, carb: "Mikuni BS36 ×4", gearbox: "5 ст., кардан", spark: "NGK DPR8EA-9", oilVol: "≈ 3.6 л с фильтром",
    issues: [{ t: "Кардан: масло в главной передаче, шлицы", sev: "med", fix: "Масло редуктора по регламенту, смазка шлицов." },
      { t: "Течи масла с возрастом", sev: "low", fix: "Прокладки крышек." }, REG] }, 2.0);
  re("YAM_FJ1200", x(I4A, { code: "FJ1200 (3CW / 3XW)", name: "Yamaha FJ1200 / XJR1200 (рядная четвёрка 1188, воздушно-масляная)", cc: 1188, hp: 125, torque: "≈ 106 Н·м",
    compression: "≈ 9.7 бар", redline: 9500, carb: "Mikuni BS36 ×4", oilVol: "≈ 3.8 л с фильтром",
    issues: [{ t: "Перегрев и пригорание масла в пробках", sev: "med", fix: "Масло по уровню, не стоять подолгу на месте." },
      { t: "Шум цепи ГРМ (ручной натяжитель у ранних)", sev: "med", fix: "Регулировка/замена натяжителя." }, REG] }), 2.3);
  CL("YAM_FJ1100", "YAM_FJ1200", { code: "FJ1100 (36Y)", name: "Yamaha FJ1100 (рядная четвёрка 1097, воздушно-масляная)", cc: 1097, hp: 123, torque: "≈ 96 Н·м" }, 2.2);
  re("YAM_XJR1300", x(I4A, { code: "XJR1300 (5EA / 5UX)", name: "Yamaha XJR1300 1999–2006 (рядная четвёрка 1251, карбюраторы)", cc: 1251, hp: 100, torque: "≈ 108 Н·м",
    compression: "≈ 9.7 бар", redline: 9500, carb: "Mikuni BSR36 ×4", oilVol: "≈ 3.9 л с фильтром (всего ≈ 4.2 л)",
    issues: [{ t: "Шум цепи ГРМ и натяжителя", sev: "med", fix: "Замена натяжителя, цепь при вытяжке." },
      { t: "Карбюраторы: засор и рассинхрон после зимы", sev: "low", fix: "Чистка, синхронизация, слив камер на зиму." },
      { t: "Перегрев масла в пробках летом", sev: "low", fix: "Масло по уровню, маслорадиатор чистый." }] }), 2.4);
  CL("YAM_XJR1300FI", "YAM_XJR1300", { code: "XJR1300 (инжектор)", name: "Yamaha XJR1300 2007–2016 (рядная четвёрка 1251, инжектор)", hp: 98,
    groups: ["dohc", "air", "efi", "4t", "big", "jp"], ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—", oilInt: 10000,
    issues: [{ t: "Шум цепи ГРМ и натяжителя", sev: "med", fix: "Замена натяжителя." },
      { t: "Датчик кислорода и катализатор — рывки на малом газе", sev: "low", fix: "Синхронизация дросселей, проверка датчиков." }] }, 2.4);
  /* --- FJR1300 --- */
  re("YAM_FJR1300", x(I4, { code: "FJR1300 (5JW / 3P6)", name: "Yamaha FJR1300 2001–2012 (рядная четвёрка 1298, кардан)", cc: 1298, hp: 145, torque: "≈ 134 Н·м",
    compression: "≈ 10.8 бар", redline: 9000, gearbox: "5 ст., кардан", carb: "Инжектор", valveIn: "0.11–0.20 мм", valveEx: "0.21–0.25 мм", spark: "NGK CR8E",
    oil: "10W-40 / 20W-40 (JASO MA)", oilVol: "≈ 4.2 л с фильтром", coolant: "≈ 2.9 л", fuel: "АИ-95", valveInt: 42000,
    issues: [{ t: "Нагрев ног от мотора (ранние 2001–2005)", sev: "low", fix: "Дефлекторы, с 2006 доработано." },
      { t: "Кардан: шлицы и масло редуктора", sev: "med", fix: "Смазка шлицов, масло редуктора по регламенту." },
      { t: "Версия AS (YCC-S): гидравлика автосцепления", sev: "med", fix: "Жидкость по регламенту, прокачка у знающего мастера." }] }), 2.5);
  CL("YAM_FJR1300B", "YAM_FJR1300", { code: "FJR1300 (1MC / B95)", name: "Yamaha FJR1300 2013+ (рядная четвёрка 1298, ride-by-wire)", hp: 146, torque: "≈ 138 Н·м",
    ignition: "ЭБУ, ride-by-wire (YCC-T)", spark: "NGK CPR8EA-9", gearbox: "5 ст. (2016+ — 6 ст.), кардан", oil: "10W-40 / 10W-50 (JASO MA)",
    issues: [{ t: "Кардан: шлицы и масло редуктора", sev: "med", fix: "Смазка шлицов, масло редуктора по регламенту." },
      { t: "Электронная подвеска (AE/AS) — дорогие датчики", sev: "low", fix: "Диагностика сканером." }] }, 2.5);
  /* --- двойки: TDM850 / TRX850 / XTZ750, синглы XTZ660 --- */
  re("YAM_TDM850", x(Y, { code: "TDM850 (3VD)", name: "Yamaha TDM850 1991–1995 (рядная двойка 849, 10 клапанов, 360°)", layout: "twin", crankPhase: 360,
    groups: ["dohc", "liquid", "carb", "4t", "big", "balancer"], cam: "DOHC, 10 клапанов (5 на цилиндр), 2 цилиндра", cc: 849, hp: 77, torque: "≈ 78 Н·м",
    compression: "≈ 10 бар", redline: 8500, gearbox: "5 ст.", ignition: "Транзисторное (TCI)", carb: "Mikuni BDST38 ×2", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу",
    idle: "1150–1250", valveIn: "0.11–0.20 мм", valveEx: "0.21–0.30 мм", spark: "NGK DPR8EA-9", gap: "0.8–0.9 мм", sparkTorque: "17.5 Н·м",
    oilVol: "≈ 3.4 л с фильтром (полусухой картер)", oilInt: 6000, valveInt: 24000, coolant: "≈ 2 л", fuel: "АИ-92/95",
    issues: [{ t: "Расход масла и натяжитель цепи ГРМ на больших пробегах", sev: "med", fix: "Контроль уровня по щупу, замена натяжителя." },
      { t: "Шлицы вторичного вала и звезда (TDM — известная слабость)", sev: "med", fix: "Проверять люфт звезды, менять звезду с цепью." }, REG] }), 2.0);
  CL("YAM_TDM850B", "YAM_TDM850", { code: "TDM850 (4TX) / TRX850", name: "Yamaha TDM850 1996–2001 / TRX850 (рядная двойка 849, 270°)", crankPhase: 270, hp: 80,
    torque: "≈ 84 Н·м" }, 2.0);
  CL("YAM_XTZ750", "YAM_TDM850", { code: "XTZ750 (3LD)", name: "Yamaha XTZ750 Super Ténéré (рядная двойка 749, 10 клапанов, сухой картер)", cc: 749, hp: 69,
    torque: "≈ 67 Н·м", compression: "≈ 9.5 бар", redline: 8500, oilVol: "≈ 3.5 л (сухой картер)",
    issues: [{ t: "Шлицы вторичного вала и звезда", sev: "med", fix: "Проверка люфта звезды, смазка шлицов при замене." },
      { t: "Возраст: проводка, реле-регулятор, карбюраторы", sev: "med", fix: "Ревизия при покупке." },
      { t: "Вентилятор и термовыключатель — перегрев в медленной езде", sev: "med", fix: "Проверка вентилятора перед сезоном." }] }, 2.0);
  re("YAM_XTZ660", x(Y, { code: "XTZ660 (3YF)", name: "Yamaha XTZ660 Ténéré / SZR660 (одноцилиндровый 659, 5 клапанов)", groups: ["liquid", "carb", "4t", "big"],
    cam: "SOHC, 5 клапанов", cc: 659, hp: 48, torque: "≈ 54 Н·м", compression: "≈ 9.2 бар", redline: 7500, gearbox: "5 ст.", ignition: "CDI",
    carb: "Mikuni двухкамерный", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1200–1300",
    valveIn: "0.10–0.15 мм", valveEx: "0.15–0.20 мм", spark: "NGK DPR8EA-9", gap: "0.8–0.9 мм", sparkTorque: "17.5 Н·м",
    oilVol: "≈ 2.8 л (сухой картер)", oilInt: 6000, valveInt: 12000, coolant: "≈ 1.4 л", fuel: "АИ-92/95",
    issues: [{ t: "Расход масла у мотора с большим пробегом", sev: "med", fix: "Уровень по щупу на горячую, колпачки/кольца." },
      { t: "Натяжитель цепи ГРМ", sev: "med", fix: "Замена при шуме." }, REG] }), 1.8);
  /* --- CP3 847 --- */
  re("YAM_CP3_847", x(Y, { code: "CP3 847", name: "Yamaha CP3 847 (рядная тройка: MT-09 / Tracer 900 / XSR900 / Niken 2014–2020)", layout: "i3",
    groups: ["dohc", "liquid", "efi", "4t", "big"], cam: "DOHC, 12 клапанов, 3 цилиндра", cc: 847, hp: 115, torque: "≈ 87.5 Н·м", compression: "≈ 11.5 бар",
    redline: 11250, ignition: "ЭБУ, ride-by-wire (YCC-T)", valveIn: "0.09–0.17 мм", valveEx: "0.24–0.30 мм", spark: "NGK CPR9EA-9", oilVol: "≈ 3.4 л с фильтром",
    oilInt: 10000, valveInt: 40000, coolant: "≈ 2.3 л", fuel: "АИ-95",
    issues: [{ t: "Ранние 2014–2016: резкий газ в режиме A, рывки", sev: "low", fix: "Режим STD/B, обновление прошивки." },
      { t: "Мягкая сток-подвеска", sev: "low", fix: "Пружины и картриджи под вес." }, REG] }), 2.2);
  /* --- круизеры: Virago / Drag Star / Bulldog --- */
  re("YAM_XV250", x(VA, { code: "XV250 (3DM / 3LS)", name: "Yamaha XV250 Virago / V-Star 250 / XVS250 Drag Star (V-twin 60°, 249)", vAngle: 60,
    cam: "SOHC, 4 клапана, V-twin 60°", cc: 249, hp: 21, torque: "≈ 20 Н·м", compression: "≈ 10 бар", redline: 9000, gearbox: "5 ст., цепь", carb: "Mikuni BDS26",
    spark: "NGK D8EA", gap: "0.6–0.7 мм", oilVol: "≈ 1.6 л", sparkTorque: "17.5 Н·м",
    issues: [{ t: "Перегрев заднего цилиндра в пробках", sev: "low", fix: "Масло по уровню, не стоять долго на холостых." },
      { t: "Карбюратор после хранения", sev: "low", fix: "Чистка, слив камеры на зиму." }] }), 1.5);
  re("YAM_XV535", x(VA, { code: "XV535 (2GV / 3BR)", name: "Yamaha XV535 Virago (V-twin 70°, 535)", vAngle: 70, cam: "SOHC, 4 клапана, V-twin 70°", cc: 535, hp: 45,
    torque: "≈ 46 Н·м", compression: "≈ 9 бар", redline: 8000, carb: "Mikuni BDS34 ×2", spark: "NGK DPR7EA-9", gap: "0.8–0.9 мм", oilVol: "≈ 2.6 л с фильтром",
    issues: [{ t: "Слабая обгонная муфта стартера — щелчки и проскальзывание", sev: "med", fix: "Ремонт/замена обгонной муфты, исправный АКБ." },
      { t: "Карбюраторы и мембраны после хранения", sev: "low", fix: "Чистка, проверка мембран, синхронизация." },
      { t: "Реле-регулятор и масса", sev: "low", fix: "Проверка зарядки и разъёмов." }] }), 1.6);
  re("YAM_XV750", x(VA, { code: "XV750 (4FY / 3JK)", name: "Yamaha XV750 Virago (V-twin 75°, 748)", vAngle: 75, cam: "SOHC, 4 клапана, V-twin 75°", cc: 748, hp: 55,
    torque: "≈ 64 Н·м", compression: "≈ 8.7 бар", redline: 7500, carb: "Mikuni BDS40 ×2", spark: "NGK BPR7ES", oilVol: "≈ 3.2 л с фильтром",
    issues: [{ t: "Обгонная муфта и шестерня стартера (известная слабость больших Virago)", sev: "high", fix: "Свежий АКБ, ремонт муфты стартера, не крутить стартер долго." },
      { t: "Перегрев заднего цилиндра", sev: "low", fix: "Масло по уровню, не стоять в пробках." }] }), 1.8);
  CL("YAM_XV1100", "YAM_XV750", { code: "XV1100 (2NA / 4PP)", name: "Yamaha XV1100 Virago / XVS1100 Drag Star / BT1100 Bulldog (V-twin 75°, 1063)", cc: 1063, hp: 62, topRatio: 1.5,
    torque: "≈ 87 Н·м", compression: "≈ 8.3 бар", redline: 6500, oilVol: "≈ 3.4 л с фильтром",
    issues: [{ t: "Обгонная муфта и шестерня стартера", sev: "high", fix: "Свежий АКБ, ремонт муфты, не крутить стартер долго." },
      { t: "Кардан: масло редуктора и шлицы колеса", sev: "med", fix: "Масло по регламенту, смазка шлицов при снятии колеса." },
      { t: "Перегрев заднего цилиндра в пробках", sev: "low", fix: "Масло по уровню." }] }, 2.0);
  CL("YAM_XV1000", "YAM_XV1100", { code: "XV1000 (42X)", name: "Yamaha XV1000 Virago (V-twin 75°, 981)", cc: 981, hp: 64, torque: "≈ 80 Н·м" }, 1.9);
  re("YAM_XVS1300", x(Y, { code: "XVS1300 (5C7)", name: "Yamaha XVS1300 V-Star / Midnight Star / Stryker (V-twin 60°, 1304, жидкостный)", layout: "vtwin", vAngle: 60,
    groups: ["liquid", "efi", "4t", "big"], cam: "SOHC, 8 клапанов, V-twin 60°", cc: 1304, hp: 73, torque: "≈ 106 Н·м", compression: "≈ 9.5 бар", redline: 6500, topRatio: 1.45,
    gearbox: "5 ст., ремень", valveIn: "0.09–0.13 мм", valveEx: "0.13–0.17 мм", spark: "NGK LMAR7A-9", gap: "0.8–0.9 мм", oilVol: "≈ 4.1 л с фильтром",
    oilInt: 10000, valveInt: 40000, coolant: "≈ 2.2 л", fuel: "АИ-92/95", idle: "950–1050",
    issues: [{ t: "Ремень: камни и трещины зубьев", sev: "med", fix: "Осмотр ремня и шкивов каждое ТО." },
      { t: "Нагрев правой ноги от выпуска/заднего цилиндра", sev: "low", fix: "Теплоизоляция, вентилятор." }] }), 2.0);
  /* --- OHV: Road Star / Warrior / MT-01 / Roadliner --- */
  re("YAM_XV1600", x(VOHV, { code: "XV1600 (5JA)", name: "Yamaha XV1600 Road Star / Wild Star (V-twin 48°, 1602, OHV)", cc: 1602, hp: 63, torque: "≈ 135 Н·м",
    compression: "≈ 8.3 бар", redline: 4750, carb: "Mikuni BSR40", spark: "NGK DPR7EA-9", gap: "0.8–0.9 мм", oilVol: "≈ 4.6 л (масляный бак)",
    issues: [{ t: "Течь масла по трубкам штанг и крышкам", sev: "low", fix: "Уплотнения трубок штанг, затяжка по моменту." },
      { t: "Стартерная муфта и тяжёлый холодный пуск", sev: "med", fix: "Сильный АКБ, проверка муфты стартера." },
      { t: "Обеднение после тюнинг-выпуска — перегрев", sev: "med", fix: "Перенастройка карбюратора/прошивки." }] }), 2.4);
  CL("YAM_XV1700C", "YAM_XV1600", { code: "XV1700 (карбюратор)", name: "Yamaha XV1700 Road Star 2004–2007 (V-twin 48°, 1670, OHV, карбюратор)", cc: 1670, hp: 67,
    torque: "≈ 146 Н·м", compression: "≈ 8.4 бар" }, 2.4);
  CL("YAM_XV1700", "YAM_XV1700C", { code: "XV1700 (инжектор)", name: "Yamaha XV1700 Road Star Warrior / Road Star 2008+ / MT-01 (V-twin 48°, 1670, OHV, инжектор)",
    hp: 84, torque: "≈ 146 Н·м", redline: 5500, topRatio: 1.2, groups: ["air", "efi", "4t", "big", "jp"], ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—",
    issues: [{ t: "Течь масла по трубкам штанг", sev: "low", fix: "Уплотнения трубок штанг." },
      { t: "Сильный нагрев заднего цилиндра (MT-01 — под сиденьем)", sev: "low", fix: "Теплоизоляция, не стоять в пробках." },
      { t: "Дроссель и датчики после тюнинга выпуска", sev: "low", fix: "Прошивка / тюнинг-модуль." }] }, 2.4);
  CL("YAM_XV1900", "YAM_XV1700", { code: "XV1900 (1D7 / 2D1)", name: "Yamaha XV1900 Roadliner / Stratoliner / Raider / Star Venture (V-twin 48°, 1854, OHV)", cc: 1854,
    hp: 90, torque: "≈ 167 Н·м", compression: "≈ 9.5 бар", redline: 5000, topRatio: 1.15, spark: "NGK DPR8EA-9", oilVol: "≈ 4.9 л с фильтром" }, 2.5);
  /* --- V4: Royal Star, V-Max --- */
  re("YAM_VMAX1200", x(Y, { code: "V-Max 1200 (1FK / 3UF)", name: "Yamaha V-Max 1200 (V4 70°, 1198, V-Boost)", layout: "vtwin", vAngle: 70, groups: ["dohc", "liquid", "carb", "4t", "big"],
    cam: "DOHC, 16 клапанов, V4 70°", cc: 1198, hp: 145, torque: "≈ 121 Н·м", compression: "≈ 10.5 бар", redline: 9500, gearbox: "5 ст., кардан",
    ignition: "Транзисторное (TCI)", carb: "Mikuni BDS35 ×4 (V-Boost)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "950–1050",
    valveIn: "0.11–0.15 мм", valveEx: "0.26–0.30 мм", spark: "NGK DPR8EA-9", gap: "0.8–0.9 мм", sparkTorque: "17.5 Н·м", oilVol: "≈ 3.5 л с фильтром",
    oilInt: 6000, valveInt: 24000, coolant: "≈ 3 л", fuel: "АИ-95",
    issues: [{ t: "Привод V-Boost (сервомотор и тросы) — не открываются заслонки", sev: "med", fix: "Проверка сервомотора и тросов, чистка заслонок." },
      { t: "Кардан и шлицы колеса — износ от мощности", sev: "med", fix: "Смазка шлицов, масло редуктора." }, REG] }), 2.4);
  CL("YAM_XVZ1300", "YAM_VMAX1200", { code: "XVZ1300 (4NK)", name: "Yamaha XVZ1300 Royal Star / Royal Star Venture (V4 70°, 1294)", cc: 1294, hp: 74, torque: "≈ 106 Н·м", topRatio: 1.5,
    compression: "≈ 10 бар", redline: 7000, carb: "Mikuni BSR32 ×4", spark: "NGK DPR7EA-9", oilVol: "≈ 4.2 л с фильтром",
    issues: [{ t: "Синхронизация 4 карбюраторов — неровный холостой", sev: "low", fix: "Синхронизация вакуумметром." },
      { t: "Кардан: масло редуктора", sev: "low", fix: "По регламенту." }, REG] }, 2.3);
  re("YAM_VMAX1700", x(Y, { code: "VMAX 1700 (2S3)", name: "Yamaha VMAX 1700 (V4 65°, 1679)", layout: "vtwin", vAngle: 65, groups: ["dohc", "liquid", "efi", "4t", "big"],
    cam: "DOHC, 16 клапанов, V4 65°", cc: 1679, hp: 200, torque: "≈ 167 Н·м", compression: "≈ 11.3 бар", redline: 9500, gearbox: "5 ст., кардан",
    ignition: "ЭБУ, YCC-T / YCC-I", valveIn: "0.11–0.20 мм", valveEx: "0.21–0.26 мм", spark: "NGK CPR8EB-9", oilVol: "≈ 4.9 л с фильтром", oilInt: 10000, valveInt: 42000,
    coolant: "≈ 3.6 л", fuel: "АИ-95",
    issues: [{ t: "Кардан и задняя шина — быстрый износ от момента", sev: "med", fix: "Масло редуктора, шина по износу." },
      { t: "Сильный нагрев в пробках", sev: "low", fix: "Вентиляторы и антифриз по регламенту." }] }), 2.7);
  /* --- классика --- */
  re("YAM_SR400", x(Y, { code: "SR400 (2H6 / 1JR / 3HT)", name: "Yamaha SR400 1978–2008 (одноцилиндровый 399, карбюратор, только кик)", groups: ["air", "carb", "4t", "big"],
    cooling: "Воздушное", coolant: "", cam: "SOHC, 2 клапана", cc: 399, hp: 26, torque: "≈ 29 Н·м", compression: "≈ 8.5 бар", redline: 7000, topRatio: 2.0, start: "Кик (с декомпрессором)",
    gearbox: "5 ст.", ignition: "CDI", carb: "Mikuni VM34 (до 2000) / BST34 (2001–2008)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1100–1300",
    valveIn: "0.07–0.12 мм", valveEx: "0.12–0.17 мм", spark: "NGK BPR6ES", gap: "0.7–0.8 мм", sparkTorque: "20 Н·м", oilVol: "≈ 2.4 л (масло в раме, сухой картер)",
    oilInt: 5000, valveInt: 6000, fuel: "АИ-92",
    issues: [{ t: "Запуск киком: без ВМТ по окошку декомпрессора — отдача", sev: "low", fix: "Ставить поршень по метке в окне, затем уверенно кикать." },
      { t: "Течь масла по маслопроводам рамы и крышкам", sev: "low", fix: "Уплотнения, затяжка штуцеров." },
      { t: "Слабый 6-вольтовый/старый свет у ранних", sev: "low", fix: "Ревизия проводки, LED-лампы." }] }), 1.5);
  CL("YAM_SR400FI", "YAM_SR400", { code: "SR400 (RH03J / RH16J)", name: "Yamaha SR400 2010–2021 (одноцилиндровый 399, инжектор)", hp: 24,
    groups: ["air", "efi", "4t", "big", "jp"], ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—" }, 1.5);
  CL("YAM_SRX600", "XT600", { code: "SRX600 (1JK / 3SX)", name: "Yamaha SRX600 (одноцилиндровый 595, 4 клапана, от XT600)", hp: 42, start: "Кик (с декомпрессором)",
    carb: "Двухкамерный (по году)", redline: 7500,
    issues: [{ t: "Запуск киком на горячую", sev: "low", fix: "Декомпрессор, ВМТ сжатия, исправное зажигание." },
      { t: "Возраст: проводка, карбюратор, ЦПГ", sev: "med", fix: "Ревизия при покупке." }] }, 1.6);
  re("YAM_XS650", x(Y, { code: "XS650 (S1 / 447)", name: "Yamaha XS650 (рядная двойка 653, 360°, воздушная)", layout: "twin", crankPhase: 360, groups: ["air", "carb", "4t", "big"],
    cooling: "Воздушное", coolant: "", cam: "SOHC, 4 клапана, 2 цилиндра", cc: 653, hp: 50, torque: "≈ 53 Н·м", compression: "≈ 8.7 бар", redline: 7500, gearbox: "5 ст.",
    start: "Электро + кик", ignition: "Контактное (у поздних — TCI)", carb: "Mikuni BS38 ×2", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1000–1200",
    valveIn: "0.10 мм", valveEx: "0.15 мм", spark: "NGK BP7ES", gap: "0.7–0.8 мм", sparkTorque: "20 Н·м", oilVol: "≈ 2.5 л (сетчатый фильтр)", oilInt: 3000, valveInt: 5000, fuel: "АИ-92",
    issues: [{ t: "Течи масла (крышки, сальник переключения)", sev: "low", fix: "Прокладки, сальники, затяжка." },
      { t: "Контактное зажигание и генератор у старых", sev: "med", fix: "Электронное зажигание — популярная доработка." },
      { t: "Сетчатые фильтры масла — промывать при каждой замене", sev: "med", fix: "Снять и промыть сетки, иначе износ ГРМ." }] }), 1.6);
  /* --- малокубатурные --- */
  re("YAM_YBR125", x(Y, { code: "YBR125 (5VL)", name: "Yamaha YBR125 / XTZ125 (одноцилиндровый 124, воздушный, карбюратор)", groups: ["air", "carb", "4t", "small"],
    cooling: "Воздушное", coolant: "", cam: "SOHC, 2 клапана", cc: 124, hp: 10, torque: "≈ 10 Н·м", compression: "≈ 10 бар", redline: 9000, gearbox: "5 ст.",
    start: "Электро + кик", ignition: "CDI", carb: "Mikuni (BS25 / VM22, по году)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1300–1500",
    valveIn: "0.05–0.09 мм", valveEx: "0.08–0.12 мм", spark: "NGK CR6HSA", gap: "0.6–0.7 мм", sparkTorque: "12.5 Н·м", oilVol: "≈ 1.0 л", oilInt: 3000, valveInt: 6000, fuel: "АИ-92",
    issues: [{ t: "Натяжитель цепи ГРМ шумит после 20 тыс. км", sev: "low", fix: "Замена натяжителя и цепи." },
      { t: "Сетка масляного фильтра — промывать", sev: "low", fix: "Чистить сетку при замене масла." }] }), 1.1);
  CL("YAM_YBR125FI", "YAM_YBR125", { code: "YBR125 Fi / YS125", name: "Yamaha YBR125 2010+ / YS125 (одноцилиндровый 124, инжектор)", hp: 10.6,
    groups: ["air", "efi", "4t", "small", "jp"], ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—" }, 1.1);
  re("YAM_FZ16", x(Y, { region: "in", code: "FZ16 (153)", name: "Yamaha FZ16 / FZ-S / Fazer 150 (одноцилиндровый 153, Индия)", groups: ["air", "carb", "4t", "small"],
    cooling: "Воздушное", coolant: "", cam: "SOHC, 2 клапана", cc: 153, hp: 14, torque: "≈ 13.6 Н·м", compression: "≈ 9.5 бар", redline: 9500, gearbox: "5 ст.", start: "Электро",
    ignition: "CDI", carb: "Mikuni BS26", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1300–1500",
    valveIn: "0.08–0.12 мм", valveEx: "0.10–0.14 мм", spark: "NGK CR6HSA", gap: "0.6–0.7 мм", sparkTorque: "12.5 Н·м", oilVol: "≈ 1.2 л", oilInt: 3000, valveInt: 6000, fuel: "АИ-92",
    issues: [{ t: "Запчасти в РФ — под заказ из Индии", sev: "low", fix: "Расходники держать в запасе." },
      { t: "Натяжитель цепи ГРМ", sev: "low", fix: "Замена при шуме." }] }), 1.0);
  CL("YAM_FZ15FI", "YAM_FZ16", { code: "FZ-S FI (149, Blue Core)", name: "Yamaha FZ-S FI V2/V3 / Fazer FI (одноцилиндровый 149, инжектор)", cc: 149, hp: 12.4, torque: "≈ 12.8 Н·м",
    groups: ["air", "efi", "4t", "small", "in"], ignition: "ЭБУ (EFI)", carb: "Инжектор", jetMain: "—", jetPilot: "—", needle: "—" }, 1.0);
  CL("YAM_FZ25", "YAM_FZ15FI", { code: "FZ25 (249)", name: "Yamaha FZ25 / Fazer 25 (одноцилиндровый 249, маслоохлаждаемый)", cc: 249, hp: 20.8, torque: "≈ 20 Н·м",
    groups: ["air", "efi", "4t", "big", "in"], cooling: "Воздушно-масляное", compression: "≈ 9.8 бар", redline: 9500, spark: "NGK CPR8EA-9", gap: "0.7–0.8 мм",
    oilVol: "≈ 1.55 л с фильтром", oilInt: 5000, valveInt: 10000 }, 1.1);
  re("YAM_R125", x(Y, { code: "YZF-R125 (5D7)", name: "Yamaha 125 жидкостный (YZF-R125 2008–2018 / MT-125 2014–2019 / WR125R/X)", groups: ["liquid", "efi", "4t", "small"],
    cam: "SOHC, 4 клапана", cc: 125, hp: 15, torque: "≈ 12.2 Н·м", compression: "≈ 11.2 бар", redline: 10500, ignition: "ЭБУ (EFI)",
    valveIn: "0.10–0.14 мм", valveEx: "0.20–0.24 мм", spark: "NGK CR8E", gap: "0.7–0.8 мм", oilVol: "≈ 1.15 л с фильтром", oilInt: 6000, valveInt: 12000, coolant: "≈ 1 л",
    idle: "1300–1500",
    issues: [{ t: "Вкладыш шатуна/коленвал у перекрученных (частая беда R125)", sev: "high", fix: "Масло каждые 3–5 тыс. км, не держать на отсечке на холодную." },
      { t: "Натяжитель цепи ГРМ — шум", sev: "med", fix: "Замена натяжителя." }] }), 1.6);
  CL("YAM_R125VVA", "YAM_R125", { code: "YZF-R125 VVA (BR6 / B9D)", name: "Yamaha 125 VVA (YZF-R125 2019+ / MT-125 2020+ / XSR125)", hp: 15, torque: "≈ 11.5 Н·м",
    cam: "SOHC, 4 клапана, VVA", spark: "NGK LMAR8A-9", gap: "0.8–0.9 мм",
    issues: [{ t: "Датчики и разъёмы VVA после мойки", sev: "low", fix: "Не мыть напором, диэлектрическая смазка." },
      { t: "Цепь ГРМ при редкой замене масла", sev: "med", fix: "Масло каждые 5 тыс. км." }] }, 1.6);
  CL("YAM_R15V2", "YAM_R125", { region: "in", code: "YZF-R15 V1/V2 (150)", groups: ["liquid", "efi", "4t", "small", "in"], name: "Yamaha YZF-R15 V1/V2 (одноцилиндровый 149.8, без VVA)", cc: 150, hp: 17, torque: "≈ 15 Н·м",
    compression: "≈ 10.4 бар", spark: "NGK CPR8EA-9", gap: "0.7–0.8 мм", oilVol: "≈ 1.05 л с фильтром",
    issues: [{ t: "Запчасти в РФ — под заказ", sev: "low", fix: "Расходники держать в запасе." }, { t: "Натяжитель цепи ГРМ", sev: "low", fix: "Замена при шуме." }] }, 1.0);
  /* --- детские и эндуро --- */
  re("YAM_TTR50", x(Y, { code: "TT-R50E", name: "Yamaha TT-R50E (горизонтальный 49, автосцепление)", groups: ["air", "carb", "4t", "small"], cooling: "Воздушное", coolant: "",
    cam: "SOHC, 2 клапана", cc: 49, hp: 3.5, torque: "≈ 3.5 Н·м", compression: "≈ 9 бар", gearbox: "3 ст., автоматическое сцепление", start: "Электро + кик", ignition: "CDI",
    carb: "Mikuni VM12", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1700–1900", valveIn: "0.05–0.09 мм", valveEx: "0.08–0.12 мм",
    spark: "NGK CR6HSA", gap: "0.6–0.7 мм", sparkTorque: "12.5 Н·м", oilVol: "≈ 0.8 л", oilInt: 1000, valveInt: 3000, fuel: "АИ-92",
    issues: [{ t: "Ограничитель газа — винт на ручке газа", sev: "low", fix: "Открывать постепенно по мере опыта ребёнка." },
      { t: "Засор карбюратора после хранения", sev: "low", fix: "Сливать бензин из камеры на зиму." }] }), 1.1);
  CL("YAM_TTR110", "YAM_TTR50", { code: "TT-R110E", name: "Yamaha TT-R110E (горизонтальный 110, автосцепление)", cc: 110, hp: 7, torque: "≈ 8 Н·м",
    gearbox: "4 ст., автоматическое сцепление", carb: "Mikuni VM16", spark: "NGK CR7HSA", oilVol: "≈ 1.0 л", idle: "1500–1700" }, 1.2);
  re("YAM_TTR250", x(Y, { code: "TT-R250 / TT250R (4GY)", name: "Yamaha TT-R250 / TT250R Raid (воздушный 249, DOHC 4 клапана)", groups: ["dohc", "air", "carb", "4t", "big"],
    cooling: "Воздушно-масляное", coolant: "", cam: "DOHC, 4 клапана", cc: 249, hp: 30, torque: "≈ 27 Н·м", compression: "≈ 10.5 бар", gearbox: "6 ст.", start: "Электро",
    ignition: "CDI", carb: "Mikuni (по году)", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1300–1500",
    valveIn: "0.10–0.15 мм", valveEx: "0.17–0.22 мм", spark: "NGK DR8EA", gap: "0.6–0.7 мм", sparkTorque: "17.5 Н·м", oilVol: "≈ 1.8 л", oilInt: 3000, valveInt: 6000, fuel: "АИ-92/95",
    issues: [{ t: "Возраст: проводка, карбюратор, сальники вилки", sev: "med", fix: "Ревизия при покупке." },
      { t: "Цепь ГРМ и натяжитель", sev: "med", fix: "Замена при шуме." }] }), 1.6);
  re("YAM_YZ400F", x(Y, { code: "YZ400F (5BE)", name: "Yamaha YZ400F / WR400F (DOHC 5 клапанов, 399, карбюратор)", groups: ["dohc", "liquid", "carb", "4t", "big"],
    cam: "DOHC, 5 клапанов", cc: 399, hp: 47, torque: "≈ 40 Н·м", compression: "≈ 12.5 бар", gearbox: "5 ст.", start: "Кик (с декомпрессором)", ignition: "CDI",
    carb: "Keihin FCR39", jetMain: "по мануалу", jetPilot: "по мануалу", needle: "по мануалу", idle: "1600–1800", valveIn: "0.10–0.15 мм", valveEx: "0.20–0.25 мм",
    spark: "NGK CR8E", oilVol: "≈ 1.2 л (сухой картер)", oilInt: 1500, valveInt: 6000, coolant: "≈ 1.1 л", fuel: "АИ-95",
    issues: [{ t: "Тяжёлый запуск на горячую", sev: "low", fix: "Кнопка горячего старта, декомпрессор, без газа." },
      { t: "Клапаны «садятся» — плохой запуск", sev: "med", fix: "Проверка зазоров по моточасам." },
      { t: "Масло в раме: проверять уровень после прогрева", sev: "med", fix: "Уровень по мануалу, сетка в раме." }] }), 1.9);
  CL("YAM_YZ426F", "YAM_YZ400F", { code: "YZ426F (5JG)", name: "Yamaha YZ426F / WR426F (DOHC 5 клапанов, 426, карбюратор)", cc: 426, hp: 49, torque: "≈ 44 Н·м" }, 1.9);
  re("YAM_PW80", x(T2, { code: "PW80", name: "Yamaha PW80 (2T 79, воздушный, автосцепление)", groups: ["2t", "air", "carb", "small"], cooling: "Воздушное", coolant: "", cam: "Лепестковый клапан",
    cc: 79, hp: 5, torque: "≈ 6 Н·м", compression: "≈ 8 бар", gearbox: "3 ст., автоматическое сцепление", start: "Кик", carb: "Mikuni VM16", idle: "1600–1800",
    spark: "NGK BP4HS", oilVol: "КПП ≈ 0.6 л, бачок 2T ≈ 0.8 л", oilInt: 3000,
    issues: [{ t: "Следить за маслом в бачке Autolube!", sev: "high", fix: "Без масла мотор заклинит." },
      { t: "Сцепление после долгой езды «на газу»", sev: "low", fix: "Свежее масло КПП, регулировка." }] }), 1.1);
  re("YAM_DT125R", x(T2, { code: "DT125R (3MB / 3RM / 4BL)", name: "Yamaha DT125R / RE / X (2T 124, YPVS, раздельная смазка)", cc: 124, hp: 22, torque: "≈ 17 Н·м",
    compression: "≈ 8.5 бар", start: "Кик", carb: "Mikuni TM28SS (RE/X — VM26 с катализатором)", spark: "NGK BR8ES", oilVol: "КПП ≈ 0.75 л", redline: 9500,
    issues: [{ t: "Клапан YPVS закоксовывается — нет тяги вверху", sev: "med", fix: "Чистка YPVS, качественное 2T масло." },
      { t: "Насос Autolube и трос насоса", sev: "high", fix: "Проверять подачу и регулировку троса, уровень масла в бачке." },
      { t: "RE/X: дроссельные ограничители и катализатор", sev: "low", fix: "Стоковые ограничения мощности до 15 л.с." }] }), 1.3);
  CL("YAM_DT230", "YAM_DT125R", { code: "DT230 Lanza (4TP)", name: "Yamaha DT230 Lanza (2T 224, YPVS, раздельная смазка)", cc: 224, hp: 40, torque: "≈ 30 Н·м",
    groups: ["2t", "liquid", "carb", "big", "jp"], carb: "Mikuni TM (по мануалу)", start: "Электро + кик", issues: [{ t: "Клапан YPVS — чистка", sev: "med", fix: "Снять и почистить по регламенту." },
      { t: "Насос Autolube", sev: "high", fix: "Уровень масла в бачке, подача насоса." }, { t: "Редкие запчасти ЦПГ", sev: "med", fix: "Заказывать заранее, поршни Wiseco/Vertex." }] }, 1.4);
  re("YAM_RD350", x(T2, { code: "RD350 YPVS (31K / 1WT)", name: "Yamaha RD350 YPVS (2T рядная двойка 347, жидкостная)", layout: "twin", crankPhase: 180,
    groups: ["2t", "liquid", "carb", "big"], cc: 347, hp: 59, torque: "≈ 43 Н·м", compression: "≈ 8 бар", start: "Кик", carb: "Mikuni VM26SS ×2", spark: "NGK BR8ES",
    oilVol: "КПП ≈ 1.6 л", redline: 9500,
    issues: [{ t: "Клапаны YPVS и сервопривод — нет «подхвата» на 6–7 тыс.", sev: "med", fix: "Чистка клапанов, проверка тросов и сервопривода." },
      { t: "Средние сальники коленвала — подсос", sev: "high", fix: "Сальники и проверка на подсос." }, { t: "Насос Autolube", sev: "high", fix: "Подача и уровень масла." }] }), 1.6);
  CL("YAM_TZR250", "YAM_RD350", { code: "TZR250 (1KT / 3MA)", name: "Yamaha TZR250 / R1-Z (2T рядная двойка 249)", cc: 249, hp: 45, torque: "≈ 36 Н·м", redline: 10500,
    carb: "Mikuni TM ×2", spark: "NGK BR9ES" }, 1.7);
  CL("YAM_TZR250V", "YAM_TZR250", { code: "TZR250 (3XV)", name: "Yamaha TZR250 V-twin (2T V-twin 90°, 249)", layout: "vtwin", vAngle: 90, crankPhase: undefined }, 1.8);

  /* ================= ИСПРАВЛЕНИЯ СУЩЕСТВУЮЩИХ МОДЕЛЕЙ ================= */
  sv("YZF-R6", "YAM_R6_2C0", "2017–2020", { hp: 118 });
  av("YZF-R6", "YAM_R6_5EB", "1999–2002"); av("YZF-R6", "YAM_R6_5SL", "2003–2005"); av("YZF-R6", "YAM_R6_2C0", "2006–2016");
  sv("YZF-R1", "YAM_R1_2CR", "2015+");
  av("YZF-R1", "YAM_R1_4XV", "1998–2001"); av("YZF-R1", "YAM_R1_5PW", "2002–2003"); av("YZF-R1", "YAM_R1_5VY", "2004–2006");
  av("YZF-R1", "YAM_R1_4C8", "2007–2008"); av("YZF-R1", "YAM_R1_14B", "2009–2014");
  sv("MT-10", "YAM_R1_2CR", "2016+", { hp: 166 });
  sv("FZ6 Fazer", "YAM_FZ6", "2004–2010");
  sv("FZ1", "YAM_FZ1", "2006–2015");
  sv("FZ8", "YAM_FZ8", "2010–2016");
  sv("XJ6", "YAM_XJ6", "2009–2016");
  sv("XJR1300", "YAM_XJR1300", "1999–2006"); av("XJR1300", "YAM_XJR1300FI", "2007–2016");
  sv("XV535 Virago", "YAM_XV535", "1987–2003");
  sv("XTZ750 Super Ténéré", "YAM_XTZ750", "1989–1997");
  sv("TDM850", "YAM_TDM850B", "1996–2001"); av("TDM850", "YAM_TDM850", "1991–1995");
  sv("XTZ660 Ténéré", "YAM_XTZ660", "1991–1999");
  sv("YZF-R125", "YAM_R125VVA", "2019+"); av("YZF-R125", "YAM_R125", "2008–2018");
  sv("MT-125", "YAM_R125VVA", "2020+"); av("MT-125", "YAM_R125", "2014–2019");
  sv("XSR125", "YAM_R125VVA", "2021+");
  sv("WR125R", "YAM_R125", "2009–2016"); sv("WR125X", "YAM_R125", "2009–2016");
  sv("XTZ125", "YAM_YBR125", "2003+", { hp: 10 });
  sv("DT125R", "YAM_DT125R", "1988–2004"); sv("DT125RE", "YAM_DT125R", "2004–2007", { hp: 15 }); sv("DT125X", "YAM_DT125R", "2005–2007", { hp: 15 });
  sv("DT230 Lanza", "YAM_DT230", "1997–2000");
  sv("TT-R110E", "YAM_TTR110", "2008+"); sv("TT-R50E", "YAM_TTR50", "2006+");
  sv("TT-R250", "YAM_TTR250", "1999–2006"); sv("TT250R Raid", "YAM_TTR250", "1993–2004");
  sv("TT600", "XT600", "1983–2003", { hp: 40 });
  sv("XG250 Tricker", "XT250", "2004–2017", { hp: 19 }); sv("XT250X", "XT250", "2006–2016");
  av("YZF-R15", "YAM_R15V2", "2008–2016 (V1/V2)");
  sv("MT-03", "T321Y", "2016+"); av("MT-03", "XT660", "2006–2014", { hp: 45 });
  av("MT-09", "YAM_CP3_847", "2014–2020"); av("XSR900", "YAM_CP3_847", "2016–2021"); av("Tracer 9", "YAM_CP3_847", "2015–2020 (Tracer 900 / 900 GT)");
  av("Tracer 7", "T700", "2016–2019 (Tracer 700)");

  /* ================= НОВЫЕ МОДЕЛИ ================= */
  /* спорт */
  g("FZR250 / FZR250R", SP, [["YAM_FZR250", "1986–1994"]]);
  g("FZX250 Zeal", NK, [["YAM_FZR250", "1991–1993", { hp: 40 }]]);
  g("FZR400 / FZR400RR", SP, [["YAM_FZR400", "1986–1995"]]);
  g("FZR600", SP, [["YAM_FZR600", "1989–1993"]]);
  g("FZR600R", SP, [["YAM_YZF600R", "1994–1999"]]);
  g("YZF600R Thundercat", SP, [["YAM_YZF600R", "1996–2007"]]);
  g("FZR1000", SP, [["YAM_FZR1000G", "1987–1988"], ["YAM_FZR1000", "1989–1995"]]);
  g("YZF1000R Thunderace", SP, [["YAM_FZR1000", "1996–2003"]]);
  g("YZF-R9", SP, [["I3_890Y", "2025+"]]);
  g("XSR900 GP", SP, [["I3_890Y", "2024+"]]);
  g("TZR250", SP, [["YAM_TZR250", "1986–1990"], ["YAM_TZR250V", "1991–1995"]]);
  g("R1-Z", NK, [["YAM_TZR250", "1990–1999", { hp: 40 }]]);
  g("RD350 YPVS", SP, [["YAM_RD350", "1983–1995"]]);
  /* нейкеды и туреры */
  g("FZS600 Fazer", NK, [["YAM_YZF600R", "1998–2003", { hp: 95 }]]);
  g("FZS1000 Fazer", NK, [["YAM_R1_4XV", "2001–2005", { hp: 143 }]]);
  g("XJ600 / XJ600S Diversion", NK, [["YAM_XJ600", "1984–1991", { hp: 72 }], ["YAM_XJ600", "1992–2003"]]);
  g("XJ900F", TR, [["YAM_XJ900", "1983–1994", { hp: 97 }]]);
  g("XJ900S Diversion", TR, [["YAM_XJ900", "1995–2003"]]);
  g("XJR1200", NK, [["YAM_FJ1200", "1995–1998", { hp: 97 }]]);
  g("FJ1100", TR, [["YAM_FJ1100", "1984–1985"]]);
  g("FJ1200", TR, [["YAM_FJ1200", "1986–1996"]]);
  g("FJR1300", TR, [["YAM_FJR1300", "2001–2005"], ["YAM_FJR1300", "2006–2012"], ["YAM_FJR1300B", "2013+"]]);
  g("TRX850", SP, [["YAM_TDM850B", "1995–2000"]]);
  g("SZR660", NK, [["YAM_XTZ660", "1995–1997"]]);
  g("MT-01", NK, [["YAM_XV1700", "2005–2012", { hp: 90 }]]);
  g("BT1100 Bulldog", NK, [["YAM_XV1100", "2002–2006", { hp: 65 }]]);
  g("Niken / Niken GT", NK, [["YAM_CP3_847", "2018–2020"], ["I3_890Y", "2021+"]]);
  g("SCR950", KL, [["V950Y", "2017–2020"]]);
  /* круизеры */
  g("XV250 Virago / V-Star 250", CH, [["YAM_XV250", "1988–2020"]]);
  g("XVS250 Drag Star", CH, [["YAM_XV250", "2000–2017"]]);
  g("XV400 Virago", CH, [["V400Y", "1987–1998"]]);
  g("XV750 Virago", CH, [["YAM_XV750", "1988–1998"]]);
  g("XV1000 Virago", CH, [["YAM_XV1000", "1984–1986"]]);
  g("XV1100 Virago", CH, [["YAM_XV1100", "1986–1999"]]);
  g("XVS1100 Drag Star", CH, [["YAM_XV1100", "1999–2007"]]);
  g("XVS950 Midnight Star / V-Star 950", CH, [["V950Y", "2009–2017"]]);
  g("XVS1300 V-Star / Midnight Star", CH, [["YAM_XVS1300", "2007–2017"]]);
  g("XVS1300 Stryker", CH, [["YAM_XVS1300", "2011–2017"]]);
  g("XV1600 Wild Star / Road Star", CH, [["YAM_XV1600", "1999–2003"]]);
  g("XV1700 Road Star", CH, [["YAM_XV1700C", "2004–2007"], ["YAM_XV1700", "2008–2014", { hp: 75 }]]);
  g("XV1700 Road Star Warrior", CH, [["YAM_XV1700", "2002–2010"]]);
  g("XV1900 Raider", CH, [["YAM_XV1900", "2008–2017"]]);
  g("XV1900 Roadliner / Stratoliner / Midnight Star", CH, [["YAM_XV1900", "2006–2014"]]);
  g("Star Venture", TR, [["YAM_XV1900", "2018–2021"]]);
  g("XVZ1300 Royal Star", CH, [["YAM_XVZ1300", "1996–2013"]]);
  g("Royal Star Venture", TR, [["YAM_XVZ1300", "1999–2013", { hp: 98 }]]);
  g("V-Max 1200", CH, [["YAM_VMAX1200", "1985–2007"]]);
  g("V-Max 1700", CH, [["YAM_VMAX1700", "2009–2020"]]);
  /* классика */
  g("SR400", KL, [["YAM_SR400", "1978–2008"], ["YAM_SR400FI", "2010–2021"]]);
  g("SR500", KL, [["XT500", "1978–1999", { hp: 32 }]]);
  g("SRX600", KL, [["YAM_SRX600", "1985–1997"]]);
  g("XS650", KL, [["YAM_XS650", "1970–1985"]]);
  /* малокубатурные */
  g("YBR125", NK, [["YAM_YBR125", "2005–2009"], ["YAM_YBR125FI", "2010+"]]);
  g("YS125", NK, [["YAM_YBR125FI", "2017+", { hp: 11 }]]);
  g("YBR250 / YS250 Fazer", NK, [["XT250", "2006–2012", { hp: 21 }]]);
  g("FZ16 / FZ-S / Fazer 150", NK, [["YAM_FZ16", "2008–2014"]]);
  g("FZ-S FI / Fazer FI", NK, [["YAM_FZ15FI", "2014+"]]);
  g("FZ25 / Fazer 25", NK, [["YAM_FZ25", "2017+"]]);
  g("SZ-R", NK, [["YAM_FZ16", "2010–2014", { hp: 12, approx: true }]]);
  /* эндуро и детские */
  g("YZ400F", KR, [["YAM_YZ400F", "1998–1999"]]);
  g("WR400F", EN, [["YAM_YZ400F", "1998–2000", { hp: 44 }]]);
  g("YZ426F", KR, [["YAM_YZ426F", "2000–2002"]]);
  g("WR426F", EN, [["YAM_YZ426F", "2001–2002", { hp: 46 }]]);
  g("PW80", PB, [["YAM_PW80", "1983–2006"]]);
})();

/* @@DB-FRAGMENTS@@ */
sortBikes();
/* ===================== v26: детали 174 и 182 больше не путаются ===================== */
/* Детали мотора подписаны его кодом. NB300 сначала по ошибке был заведён как ZS182MN, код исправили на ZS174MN-5
   уже после того, как детали создались, — переподписываем детали текущим кодом их мотора. */
(function () {
  var ids = Object.keys(ENGINES).sort(function (a, b) { return b.length - a.length; });
  var codes = ids.map(function (k) { return ENGINES[k].code; }).filter(Boolean).sort(function (a, b) { return b.length - a.length; });
  function ends(s, t) { return s.length > t.length && s.slice(-t.length - 1) === " " + t; }
  PARTS.forEach(function (p) {
    var own = ids.find(function (k) { return p.id.indexOf(k + "-") === 0; });
    if (!own) return;
    var e = ENGINES[own], mine = e.code;
    if (ends(p.name, mine)) return;
    var old = codes.find(function (c) { return c !== mine && ends(p.name, c); });
    if (!old) return;
    p.name = p.name.slice(0, -old.length) + mine;
    /* у ZS174MN-5 один распредвал, а не пара, как у DOHC-мотора 182 */
    if (p.kind === "camshaft" && e.groups.indexOf("dohc") < 0 && p.name.indexOf("Распредвалы (пара)") === 0) {
      p.name = p.name.replace("Распредвалы (пара)", "Распредвал");
      p.price = r50(p.price * 3200 / 5200);
    }
  });
  /* NB300E — это инжекторный ZS182MN (NC300 EFI): механика как у NC300, а не как у NB300 (ZS174MN-5) */
  SHARE.NB300E = "NC300";
  PARTS.forEach(function (p) {
    if (!p.fit) return;
    if (p.id.indexOf("NB300-") === 0) p.fit = p.fit.filter(function (f) { return f !== "NB300E"; });
    else if (p.id.indexOf("NC300-") === 0 && p.fit.indexOf("NB300E") < 0) p.fit = p.fit.concat(["NB300E"]);
  });
  /* деталей, которые раньше NB300E брал у NB300, у NC300 не было — создаём их под 182 по тому же образцу */
  var have = {};
  PARTS.forEach(function (p) { if (p.id.indexOf("NC300-") === 0) have[p.kind] = true; });
  var a = partById("NC300-pis"), b = partById("NB300-pis"), k = a && b ? a.price / b.price : 1;
  PARTS.filter(function (p) { return p.id.indexOf("NB300-") === 0 && !have[p.kind]; }).forEach(function (p) {
    var base = p.name.slice(0, -ENGINES.NB300.code.length - 1);
    PARTS.push(P("NC300-" + p.id.slice(6), base + " " + ENGINES.NC300.code, r50(p.price * k), p.cat, p.kind, ["NC300", "NB300E"]));
  });
  /* ZS174MN-5 потерял группу cb при исправлении — инструкция по клапанам пропала. У него клапаны на шайбах, как у CBS300 */
  var vg = GUIDES.find(function (g) { return g.id === "valves-dohc"; });
  if (vg && vg.only.indexOf("NB300") < 0) vg.only.push("NB300");
})();
