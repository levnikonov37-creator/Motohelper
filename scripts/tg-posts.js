// Telegram-канал: расписание постов (вызывается из scripts/build-pages.js → tg/posts.json и tg/cards.json).
//   18:00 МСК каждый день — «Мотоцикл дня»: модель, интересный факт, масло, свеча, клапаны, слабое место;
//   12:00 МСК через день — полезный совет из инструкций сайта (по сезону: зимой хранение и ремонт, весной — подготовка);
//   праздники — свои посты (Новый год, 23 февраля, 8 Марта, 1 апреля, открытие сезона, 1 и 9 Мая, 12 июня);
//   иногда в конце поста — шутка.
// Картинка поста — img/tg/<id>.jpg (рисует scripts/tg-cards.js по tg/cards.json: фото как в каталоге или карточка).
// Нет картинки — пост выйдет текстом. Свои посты — в tg/manual.json (date, time «ЧЧ:ММ» по Москве, text); они занимают
// своё время, и совет или мотоцикл дня в этот слот в тот день не выходят.
// Факты — только из базы сайта или общеизвестные (история марок); технических цифр от себя не придумываем.
const fs = require("fs"), path = require("path");

const START = "2026-11-21", END = "2027-06-30";

/* «мотоцикл дня» без своего фото: известные модели разных марок и классов вперемешку («Марка::regex по названию») */
const PICKS = [
  "Motoland::^Alpha$", "Honda::^CRF250L$", "Урал::^Турист$", "Yamaha::^Serow 250", "ИЖ::^Планета-5$", "Kawasaki::^KLX250$",
  "Минск::^М1А$", "Suzuki::^DR-Z400S$", "Harley-Davidson::^Sportster Iron 883$", "BMW::^R 1250 GS$", "Honda::^Super Cub C125$",
  "Jawa::^350 638$", "KTM::^300 EXC TPI$", "Восход::^3М$", "Royal Enfield::^Classic 350$", "Racer::^Ranger RC250$",
  "Kawasaki::^Ninja 400$", "Днепр::^МТ-11$", "Honda::^Africa Twin", "Stels::^Delta$", "Suzuki::^DR650SE$", "Yamaha::^WR250R$",
  "Минск::^X250$", "Ducati::^Monster$", "Урал::^Gear Up$", "Honda::^XR250R$", "Triumph::^Bonneville T120$",
  "Yamaha::^XVS400 Drag Star$", "Irbis::^Virago$", "Kawasaki::^KLR650$", "Yamaha::^YZF-R1$", "Kayo::^K1 250 MX$",
  "Husqvarna::^TE 300$", "Suzuki::^GSX-R600$", "Урал::^М-72$", "Honda::^XR650L$", "Vespa::^Primavera 125$", "BMW::^F 800 GS$",
  "Yamaha::^XT660Z", "Regulmoto::^Sport 003$", "Kawasaki::^KX250F$", "Honda::^Grom", "ИЖ::^Юпитер-5$", "Bajaj::^Dominar 400$",
  "KTM::^690 Enduro R$", "Suzuki::^Djebel 250$", "Moto Guzzi::^V85 TT$", "CFMOTO::^800MT$", "Yamaha::^MT-07$",
  "Harley-Davidson::^Fat Boy 114$", "Beta::^RR 300 2T$", "Honda::^CRF450R$", "Motoland::^XR250 Lite$", "Kawasaki::^Z900$",
  "Simson::^S51$", "Honda::^Transalp XL750$", "Suzuki::^V-Strom 650XT$", "Voge::^300 Rally$", "Indian::^Scout$",
  "Yamaha::^YZ250$", "Kove::^450 Rally$", "BMW::^R 80 GS$", "Royal Enfield::^Himalayan 411$", "Kawasaki::^Vulcan S$",
  "Ковровец::^К-175", "Suzuki::^GSX1300R Hayabusa$", "GasGas::^EC 300$", "Yamaha::^TT-R125LE$", "Honda::^CB500X$",
  "Aprilia::^Tuareg 660$", "Benelli::^TRK 502X$", "MZ::^ETZ 250$", "Lifan::^LF200GY-5$", "Ducati::^Scrambler Icon$",
  "Kawasaki::^KLX110$", "Triumph::^Tiger 900 Rally", "Sherco::^SE 300$", "Yamaha::^XSR700$", "Piaggio::^Liberty 125$",
  "Урал::^Wolf$", "BMW::^G 310 GS$", "KTM::^390 Duke$", "Honda::^CRF110F$", "Suzuki::^SV650$", "Zontes::^ZT350-T$",
  "Husqvarna::^701 Enduro$", "Yamaha::^PW50$", "Hyosung::^GT650", "Sharmax::^Sport 250$", "Kawasaki::^Z650RS$",
  "Honda::^CT125 Trail$", "Днепр::^К-750$", "Yamaha::^Ténéré 700$", "Aprilia::^RS 660$", "Kymco::^Agility 125$",
  "Harley-Davidson::^Road King$", "KTM::^250 EXC-F$", "Suzuki::^DR-Z125$", "Moto Guzzi::^V7 Classic", "Beta::^Xtrainer 300$",
  "Honda::^XR150L$", "ЗиД::Сова", "BMW::^R nineT$", "Kawasaki::^Versys-X 300$", "Royal Enfield::^Interceptor 650$",
  "Yamaha::^TW200$", "Triumph::^Street Triple 765 RS$", "Bajaj::^Pulsar NS200$", "KTM::^1290 Super Adventure$",
  "Honda::^Monkey 125$", "Suzuki::^Van Van 200$", "Husqvarna::^Svartpilen 401$", "Ducati::^DesertX$", "Indian::^Chief$",
  "CFMOTO::^450MT$", "Kawasaki::^Ninja ZX-10R$", "Минск::^D4 125$", "Yamaha::^XV535 Virago$", "GasGas::^TXT Racing 280$",
];

/* запасные марки для «мотоцикла дня», когда список PICKS кончится */
const AUTO_BRANDS = ["Honda", "Yamaha", "Kawasaki", "Motoland", "Suzuki", "KTM", "Kayo", "BMW", "Racer", "Regulmoto", "Harley-Davidson", "Минск",
  "Ducati", "Triumph", "Avantis", "Husqvarna", "ИЖ", "Progasi", "CFMOTO", "Voge", "Royal Enfield", "BSE", "Aprilia", "Beta", "Урал", "Benelli",
  "Stels", "Irbis", "Bajaj", "Zontes", "Kove", "GasGas", "Sherco", "Lifan", "Sharmax", "Moto Guzzi", "Indian", "Jawa", "Днепр", "Восход"];

/* советы по сезону: зимой — хранение, ремонт и тюнинг в гараже, весной — подготовка, летом — дорога и жара */
const TIP_ORDER = [
  "winter", "battery-care", "oil", "carb-clean", "scooter-winter", "tank-flush", "spark", "valves", "compression", "chain-replace",
  "timing-marks", "forkseals", "brakes-bleed", "camchain", "parasitic-drain", "pads", "coolant", "used-check", "wheelbearings",
  "oil-level", "gripheat-install", "steering-bearings", "charging", "carb-float", "fork-oil", "coil-test", "led-install",
  "sprocket-change", "clutch-cable", "piston2t", "filter-install", "valves-dohc", "ground-check", "carb-needle", "regulator-replace",
  "hourmeter-install", "rings-gap", "skid-install", "throttle-cable", "oil-centrifuge", "exhaust-install", "clutch-inspect",
  "wiring-repair", "swingarm-bushings", "muffler-repack", "starter-brushes", "intake-boot", "lithium-battery", "breather-clean",
  "cockpit-setup", "caliper-rebuild", "spring-prep", "first-service", "breakin", "tire-mount", "chain", "airfilter", "carb-tune",
  "spokes", "idle-set", "brake-bedding", "sag", "interlock-check", "tubeless-plug", "oil2t-mix", "cvt", "moped-clutch",
  "headlight-bulb", "suspension-clickers", "wash-bike", "fieldkit", "tube", "cush-drive", "neutral-switch", "drum-adjust",
  "chain-slider", "long-trip", "ford", "post-crash", "fan-check", "carb-altitude", "oilcooler", "fork-align", "shiftlever-fix",
  "radiator-leak", "waterpump-seal", "engine-mounts", "chain-rivet", "oil-leak-find", "brake-clean", "csseal", "mousse-install",
  "thermostat-replace", "speedo-fix", "fuse-hunt", "usb-install", "handguards-install", "wheel-balance", "exhaust", "kick-repair",
  "starter-clutch", "choke-service", "vacuum-petcock", "pipe-decoke-2t", "reed", "gearoil-2t", "scooter-gearoil",
  "brake-light-switch", "turn-signals", "steering", "valve-lap", "headgasket", "radiator-flush",
];

/* история марок — общеизвестные факты; в пост идёт один раз, у первой модели марки */
const BRAND_FACT = {
  Honda: "Honda — крупнейший производитель мотоциклов в мире. Компанию основал Соитиро Хонда в 1948 году.",
  Yamaha: "Три камертона на логотипе Yamaha — не просто так: компания начинала с музыкальных инструментов, а мотоциклы делает с 1955 года.",
  Suzuki: "Suzuki начинала в 1909 году с ткацких станков, а первые мотоциклы выпустила в 1950-х.",
  Kawasaki: "Kawasaki Heavy Industries строит не только мотоциклы, но и корабли, поезда и детали для самолётов.",
  BMW: "Первый мотоцикл BMW — R 32 1923 года — уже был с оппозитным мотором. Эту схему BMW делает до сих пор.",
  KTM: "KTM — из австрийского городка Маттигхофен, а оранжевый цвет давно стал её фирменным.",
  "Harley-Davidson": "Harley-Davidson основали в 1903 году в Милуоки Уильям Харли и братья Дэвидсон.",
  Урал: "Завод в Ирбите появился в 1941 году, когда туда эвакуировали производство мотоцикла М-72. С тех пор там и делают «Уралы» — один из немногих мотоциклов с приводом на колесо коляски.",
  ИЖ: "Ижевские «Планеты» и «Юпитеры» — одни из самых массовых мотоциклов СССР: их знает каждый, кто вырос в деревне.",
  Jawa: "Название JAWA сложено из фамилии основателя Франтишека Янечека (JAneček) и марки Wanderer, у которой он купил лицензию на первый мотоцикл.",
  Днепр: "«Днепры» выпускал Киевский мотоциклетный завод, и их предок тот же, что у «Урала», — армейский М-72.",
  Ducati: "Фирменная черта Ducati — десмодромный привод клапанов: клапаны закрывает кулачок, а не только пружина.",
  Triumph: "Triumph — британская марка с более чем вековой историей; современные мотоциклы собирают на заводе в Хинкли.",
  "Royal Enfield": "Royal Enfield считается старейшей маркой мотоциклов, которая выпускает их без перерыва — с 1901 года.",
  Husqvarna: "Husqvarna начиналась в 1689 году как оружейный завод в Швеции — о тех временах напоминает и логотип.",
  Vespa: "Vespa по-итальянски — «оса»: так назвали скутер за форму кузова и звук мотора.",
  Piaggio: "Piaggio — та самая итальянская компания, что делает скутеры Vespa.",
  Aprilia: "Aprilia — итальянская марка из группы Piaggio, известная гоночными победами в мотогонках.",
  "Moto Guzzi": "Moto Guzzi делает мотоциклы в Мандельо-дель-Ларио с 1921 года; поперечный V-twin и кардан — её фирменная схема.",
  Indian: "Indian — старейшая американская марка мотоциклов: её основали в 1901 году, на два года раньше Harley-Davidson.",
  CFMOTO: "CFMOTO из китайского Ханчжоу давно работает вместе с KTM: многие её большие моторы — родня австрийских.",
  Bajaj: "Индийская Bajaj — одна из крупнейших мотоциклетных компаний мира и крупный акционер KTM.",
  Benelli: "Benelli — итальянская марка 1911 года; с 2005-го ею владеет китайская Qianjiang (QJ).",
  MZ: "MZ из восточногерманского Цшопау в 1950–60-х выигрывала гонки: её инженеры первыми по-настоящему научились настраивать резонансный выпуск двухтактника.",
  Simson: "Simson — из города Зуль (ГДР); их мопеды до сих пор массово ездят по Германии.",
  Lifan: "Lifan — из Чунцина, «мотоциклетной столицы Китая»: там же работают Zongshen и Loncin, чьи моторы стоят на многих питбайках и эндуро.",
  Kymco: "Kymco — тайваньская марка, один из крупнейших производителей скутеров.",
  Hyosung: "Hyosung — корейская марка, известная V-образными двухцилиндровыми моторами в небольших объёмах.",
  GasGas: "GasGas начиналась в Испании с триала и эндуро — и триальные мотоциклы до сих пор её визитная карточка.",
  Beta: "Beta — итальянская семейная компания из-под Флоренции, сильная в триале и эндуро.",
  Sherco: "Sherco — франко-испанская марка, известная триалом и эндуро.",
};
/* факты о конкретных моделях — общеизвестные */
const MODEL_FACT = {
  "Motoland Alpha": "«Альфа» — потомок Honda Super Cub: та же схема с горизонтальным мотором и полуавтоматом. А Super Cub — самая массовая техника с мотором в истории, больше 100 миллионов штук.",
  "Honda Super Cub C125": "Super Cub — самая массовая техника с мотором в истории: с 1958 года выпущено больше 100 миллионов штук.",
  "Урал М-72": "М-72 создали по образцу немецкого BMW R71 и начали выпускать в 1941 году. От него пошли все «Уралы» и «Днепры» с оппозитным мотором.",
  "Yamaha Serow 250 (XT250)": "Serow назван в честь горного козла серау — за то, как легко лезет в гору.",
  "Honda Africa Twin CRF1100L": "Имя Africa Twin — память о победах Honda в ралли «Париж — Дакар» в конце 1980-х.",
  "Yamaha XT660Z Ténéré": "Ténéré — пустыня в Сахаре, через которую проходил маршрут ралли «Париж — Дакар».",
  "Harley-Davidson Sportster Iron 883": "Семейство Sportster выпускали с 1957 года — одна из самых долгоживущих моделей в мире.",
  "BMW R 1250 GS": "GS — это Gelände/Straße, «бездорожье/дорога». Первым был R 80 G/S 1980 года.",
  "BMW R 80 GS": "R 80 G/S 1980 года — первый GS: с него началась мода на большие туристические эндуро.",
  "Ducati Monster": "Monster 1993 года сделал «голые» мотоциклы модными — с него во многом началась мода на нейкеды.",
  "Jawa 350 638": "«Ява-638» — культовый мотоцикл в СССР. Фишка Явы — сцепление само выжимается, когда нажимаешь рычаг КПП.",
  "Днепр МТ-11": "У МТ-11 есть передача заднего хода — с коляской это очень выручает.",
  "Урал Gear Up": "У Gear Up привод на колесо коляски включается рычагом — так он проходит там, где застрянет обычный мотоцикл.",
  "Royal Enfield Classic 350": "Bullet и Classic — британские по происхождению, а с середины 1950-х Bullet собирали в Индии; сейчас вся Royal Enfield — индийская.",
  "Yamaha YZF-R1": "С 2009 года у R1 коленвал crossplane — неравномерные вспышки, как у гоночного Yamaha M1, дают узнаваемый звук.",
  "Suzuki GSX1300R Hayabusa": "Hayabusa по-японски — сапсан, самая быстрая птица на планете. Имя подходящее.",
  "KTM 300 EXC TPI": "TPI — впрыск топлива в перепускные каналы: двухтактник без карбюратора и без ручного смешивания масла с бензином.",
  "Минск М1А": "Первый «Минск» сделан по образцу немецкого DKW RT 125. По этой же схеме созданы Ковровец К-125, Yamaha YA-1 и BSA Bantam — RT 125 называют самым копируемым мотоциклом.",
  "Восход 3М": "«Восходы» делали в Коврове на заводе имени Дегтярёва; их родословная — от Ковровца К-125.",
  "Kawasaki Ninja ZX-10R": "На гоночной версии ZX-10R Джонатан Рей шесть раз подряд стал чемпионом мира World Superbike — с 2015 по 2020 год.",
};

/* шутки — свои; добавляются в конец части постов */
const JOKES = [
  "Мотоцикл не заводится? Проверь бензин, искру и компрессию. Всё есть — проверь, не на передаче ли он. И это не помогло — проверь, свой ли это мотоцикл.",
  "Зима — это когда мотоцикл стоит в гараже, а деньги на тюнинг уходят сами.",
  "Клапаны — как соседи: пока не стучат, о них никто не вспоминает.",
  "Лишний болт после сборки — не ошибка, а запчасть на будущее.",
  "Питбайк — единственный транспорт, на котором «ещё один кружок» длится до темноты.",
  "Если мотоцикл завёлся с первого раза при свидетелях — запиши дату, это праздник.",
  "Главный инструмент механика — не ключ на 10, а умение его найти.",
  "Весна начинается не по календарю, а с первого соседа, который разбудил весь двор прогревом.",
  "Свеча чёрная — богато. Белая — бедно. Кошелёк после тюнинга — всегда бедно.",
  "Сколько стоит тюнинг? Ровно на одну деталь больше, чем ты планировал.",
  "«Я только масло поменяю» — так начинается любой капремонт.",
  "Аккумулятор садится в двух случаях: зимой и когда очень надо ехать.",
  "Мотоциклист в гараже: «Я на минутку, только гляну». Через четыре часа мотор на верстаке.",
  "Брод — это когда ты уверен, что там неглубоко. Ровно до середины.",
  "Лучшая сигнализация для эндуро — слой грязи: никто не захочет садиться.",
  "Сначала покупаешь мотоцикл. Потом инструмент. Потом гараж — чтобы было где хранить инструмент.",
  "Обкатка — это 500 км, когда очень хочется открутить газ и очень нельзя.",
  "Цепь смазывают двумя способами: регулярно — или когда она начала петь.",
  "Опытный мотоциклист не спорит, какое масло лучше. Он открывает форум и спорит сам с собой.",
  "Самая тихая деталь мотоцикла — та, что уже открутилась.",
  "Перед дальней поездкой проверяешь шины, цепь и прогноз погоды. Прогноз всё равно врёт.",
  "Карбюратор настраивают по свече. Настроение — по погоде.",
  "Эндурист моет мотоцикл два раза: при покупке и перед продажей.",
  "Мотоцикл не ест много бензина. Он просто часто ездит.",
  "Шлем дороже мотоцикла? Значит, голову оценил правильно.",
  "Новичок спрашивает, как проехать лужу. Опытный — где потом мыть мотоцикл.",
  "Сосед спросил, зачем мне второй мотоцикл. Пришлось объяснять, что первый — для ремонта.",
  "Регулировка клапанов успокаивает: полчаса тишины, щупы и никакого интернета.",
  "Мотоциклисты делятся на тех, кто уже ронял мотоцикл, и тех, кто об этом не рассказывает.",
  "Тёплый гараж зимой — лучший мотоклуб: все свои, и никто не торопится.",
];

const RU_MONTH = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

module.exports = function tgPosts(h) {
  const { ROOT, SITE, ENGINES, BIKES, GUIDES, bikesOf, engSlug, bikeSlug, brandSlug, brief, briefOil, briefValves, PHOTOS, photoSlug, SPARK_X, FLAGSHIP, MODEL_TUNE_KEYS, manual } = h;
  /* значение есть: не «—» и не заглушка «по мануалу» (пометки об источнике в скобках — не в счёт) */
  const ok = (v) => { const x = v == null ? "" : brief(v); return x !== "" && x !== "—" && !/^(см\.?\s*)?(по\s+)?мануал/i.test(x) && /[\dA-Za-zА-Яа-я]/.test(x); };
  const key = (b) => b.brand + " " + b.name;
  const engOf = (b) => ENGINES[b.versions[0].engine];
  const url = (b) => SITE + "m/" + bikeSlug.get(b) + "/";
  const cut = (s, n) => { s = String(s).replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, n).replace(/[\s,;:—-]+\S*$/, "") + "…"; };
  const firstSentence = (s) => { const m = String(s).match(/^.+?[.!?](\s|$)/); return (m ? m[0] : String(s)).trim(); };
  const dotEnd = (s) => (/[.!?…»)]$/.test(s) ? s : s + ".");
  const fine = (b) => { const e = engOf(b); return e && e.cc && ok(e.oil) && ok(e.spark) && (e.stroke === "2T" || (ok(e.valveIn) && ok(e.valveEx))); };

  /* ---------- модели: с фото (как в каталоге) и без ---------- */
  const seenPh = new Set();
  const photoAll = BIKES.filter((b) => PHOTOS.has(key(b)) && fine(b));
  const rank = (b) => { const i = FLAGSHIP.indexOf(key(b)), j = MODEL_TUNE_KEYS.indexOf(key(b)); return i >= 0 ? i : j >= 0 ? 100 + j : 1000; };
  /* по марке по кругу, чтобы подряд не шли одинаковые */
  const byBrand = {};
  photoAll.slice().sort((a, b) => rank(a) - rank(b) || (key(a) < key(b) ? -1 : 1)).forEach((b) => {
    const s = photoSlug(key(b)); if (seenPh.has(s)) return; seenPh.add(s); (byBrand[b.brand] = byBrand[b.brand] || []).push(b); });
  const photoQ = [], brandOrder = Object.keys(byBrand).sort((a, b) => rank(byBrand[a][0]) - rank(byBrand[b][0]));
  for (let more = true; more; ) { more = false; brandOrder.forEach((br) => { const b = byBrand[br].shift(); if (b) { photoQ.push(b); more = true; } }); }
  const used = new Set(photoQ.map(key));
  const plainQ = [];
  PICKS.forEach((p) => { const [br, re] = p.split("::"), rx = new RegExp(re, "i");
    const b = BIKES.find((x) => x.brand === br && rx.test(x.name) && !used.has(key(x)) && !PHOTOS.has(key(x)) && fine(x));
    if (b) { used.add(key(b)); plainQ.push(b); } });
  /* запас: остальные модели известных марок по кругу — по одной на мотор, базовые (короткие названия) первыми */
  const usedEng = new Set(photoQ.concat(plainQ).map((b) => b.versions[0].engine));
  const pool = {};
  BIKES.filter((b) => AUTO_BRANDS.indexOf(b.brand) >= 0 && !used.has(key(b)) && !PHOTOS.has(key(b)) && fine(b) && !/[()\/]/.test(b.name))
    .sort((a, b) => a.name.length - b.name.length || (a.name < b.name ? -1 : 1))
    .forEach((b) => (pool[b.brand] = pool[b.brand] || []).push(b));
  for (let more = true; more; ) { more = false; AUTO_BRANDS.forEach((br) => { const L = pool[br] || [];
    while (L.length && usedEng.has(L[0].versions[0].engine)) L.shift();
    const b = L.shift(); if (b) { usedEng.add(b.versions[0].engine); used.add(key(b)); plainQ.push(b); more = true; } }); }

  /* ---------- факты ---------- */
  const brandSeen = new Set();
  function factFor(b, i) {
    const k = key(b), e = engOf(b), id = b.versions[0].engine;
    if (MODEL_FACT[k]) { brandSeen.add(b.brand); return MODEL_FACT[k]; }
    if (BRAND_FACT[b.brand] && !brandSeen.has(b.brand)) { brandSeen.add(b.brand); return BRAND_FACT[b.brand]; }
    const out = [];
    const same = (bikesOf[id] || []).filter((x) => x !== b), cnt = {};
    same.forEach((x) => { if (x.brand !== b.brand) cnt[x.brand] = (cnt[x.brand] || 0) + 1; });
    const brands = Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x] || (x < y ? -1 : 1));
    if (same.length >= 5) out.push("Мотор " + e.code + " стоит ещё на " + same.length + " " + h.plural(same.length, "модели", "моделях", "моделях") + " в нашей базе" + (brands.length ? " — " + brands.slice(0, 4).join(", ") + (brands.length > 4 ? " и других" : "") : "") + ". Запчасти и советы у них общие.");
    const twins = same.filter((x) => x.type === b.type && x.brand !== b.brand);
    if (twins.length >= 2) out.push("По мотору и классу у него есть близнецы: " + twins.slice(0, 3).map(key).join(", ") + ". Сравнить можно на сайте.");
    const codes = [...new Set(b.versions.map((v) => ENGINES[v.engine] && ENGINES[v.engine].code).filter(Boolean))];
    if (codes.length >= 2) out.push("Модель выпускали с " + codes.length + " разными моторами: " + codes.slice(0, 4).join(", ") + ". Перед покупкой запчастей сверь номер мотора.");
    if (e.layout === "boxer") out.push("Мотор — оппозит: цилиндры торчат в стороны, хорошо обдуваются, а центр тяжести низкий.");
    if (e.layout === "vtwin" && e.vAngle) out.push("V-образный двухцилиндровый мотор с развалом " + e.vAngle + "° — отсюда характерный звук.");
    if (e.layout === "i4" && e.redline >= 11000) out.push("Рядная четвёрка, красная зона — " + e.redline.toLocaleString("ru-RU").replace(/ /g, " ") + " об/мин.");
    if (e.stroke === "2T") out.push("Это двухтактник: вспышка в цилиндре на каждый оборот коленвала, поэтому при малом объёме он такой резвый.");
    if (e.oilInt && e.valveInt) out.push("По регламенту масло здесь меняют каждые " + e.oilInt.toLocaleString("ru-RU").replace(/ /g, " ") + " км, а клапаны проверяют каждые " + e.valveInt.toLocaleString("ru-RU").replace(/ /g, " ") + " км.");
    const sp = Object.keys(SPARK_X).find((x) => new RegExp("(^|[^A-Z0-9])" + x.replace(/-/g, "\\-") + "([^A-Z0-9-]|$)").test(String(e.spark).toUpperCase()));
    if (sp && SPARK_X[sp][0]) out.push("Свечу NGK " + sp + " можно заменить на Denso " + SPARK_X[sp][0] + (SPARK_X[sp][1] ? " или Torch " + SPARK_X[sp][1] : "") + " — это прямые аналоги.");
    return out.length ? out[i % out.length] : "";
  }

  /* ---------- тексты ---------- */
  let jokeN = 0;
  const joke = () => JOKES[jokeN++ % JOKES.length];
  function fit(lines, max) { // убираем необязательные строки (помечены «?»), пока пост длиннее max
    let L = lines.filter((x) => x != null);
    const txt = () => L.map((x) => x.replace(/^\?/, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
    while (txt().length > max) { const i = L.map((x) => x.startsWith("?")).lastIndexOf(true); if (i < 0) break; L.splice(i, 1); }
    return txt();
  }
  function bikePost(b, i, withJoke) {
    const e = engOf(b), id = b.versions[0].engine, hp = b.versions[0].hp || e.hp;
    const iss = (e.issues || []).find((x) => x.sev === "high") || (e.issues || [])[0];
    const fact = factFor(b, i);
    const oil = e.stroke === "2T" ? (/premix|смес/i.test(e.oil) ? "смесь с бензином" : briefOil(e.oil)) : briefOil(e.oil) + (ok(e.oilVol) ? ", " + cut(brief(e.oilVol), 40) : "");
    const text = fit([
      "🏍 Мотоцикл дня: " + key(b),
      [b.type, e.code + (e.cc ? ", " + Math.round(e.cc) + " см³" : "") + (hp ? ", " + hp + " л.с." : "")].filter(Boolean).join(" · "),
      "",
      fact ? "💡 " + fact : null,
      fact ? "" : null,
      "🛢 Масло: " + cut(oil, 70),
      "🕯 Свеча: " + cut(brief(e.spark), 40) + (ok(e.gap) ? ", зазор " + cut(brief(e.gap), 20) : ""),
      e.stroke !== "2T" && briefValves(e.valveIn, e.valveEx) ? "?🔧 Клапаны на холодную: " + briefValves(e.valveIn, e.valveEx) + " (впуск / выпуск)" : null,
      iss ? "?⚠️ Слабое место: " + cut(iss.t, 90) : null,
      "",
      "Всё про модель: " + url(b),
      withJoke ? "?" : null,
      withJoke ? "?😄 " + joke() : null,
    ], 1000);
    const card = PHOTOS.has(key(b))
      ? { kind: "bike", brand: b.brand, name: b.name, photo: "img/bikes/" + photoSlug(key(b)) + ".webp", chips: [b.type, e.code, e.cc ? Math.round(e.cc) + " см³" : "", hp ? hp + " л.с." : ""].filter(Boolean) }
      : { kind: "spec", brand: b.brand, name: b.name, code: e.code, rows: [["Класс", b.type || "—"], ["Мотор", e.code, [e.cc ? Math.round(e.cc) + " см³" : "", hp ? hp + " л.с." : ""].filter(Boolean).join(" · ")], ["Тип", e.stroke === "2T" ? "2-тактный" : "4-тактный", brief(e.cooling || "")], ["Запуск", brief(e.start || "—")]] };
    return { text, card };
  }
  const ONLY = { "2t": "для двухтактников", "4t": "", carb: "для карбюраторных моторов", efi: "для инжектора", liquid: "для моторов с жидкостным охлаждением", cvt: "для скутеров", horiz: "для мопедов и питбайков", air: "для моторов с воздушным охлаждением", big: "", estart: "", kick: "" };
  const unPh = (s) => s.replace(/\s*\(\{\w+\}\)/g, "").replace(/\s*—\s*\{oilVol\}/g, "").replace(/ \{(spark|name)\}/g, "")
    .replace(/\{oil\}/g, "масло по мануалу").replace(/\{coolant\}/g, "антифриз по мануалу").replace(/\{\w+\}/g, "по мануалу");
  function tipPost(g, i, withJoke) {
    const only = (g.only || []).length === 1 ? ONLY[g.only[0]] || "" : "";
    const steps = g.steps.map((s) => cut(firstSentence(unPh(s)), 170)).filter((s) => s.length > 12).slice(0, 5);
    const text = fit([
      "💡 Совет: " + g.title.replace(/^./, (c) => c.toUpperCase()) + (only ? " (" + only + ")" : ""),
      [g.time ? "⏱ " + g.time : "", g.diff || ""].filter(Boolean).join(" · "),
      "",
      ...steps.map((s, k) => (k >= 3 ? "?" : "") + (k + 1) + ". " + dotEnd(s)),
      "",
      "Подробно, с цифрами под твой мотор: " + SITE + "m/remont/" + g.id + "/",
      withJoke ? "?" : null,
      withJoke ? "?😄 " + joke() : null,
    ], 1000);
    return { text, card: { kind: "tip", title: g.title, meta: [g.time, g.diff].filter(Boolean), only, area: g.area || g.fig || g.id } };
  }

  /* ---------- праздники ---------- */
  const brandUrl = (br) => (brandSlug[br] ? SITE + "m/" + brandSlug[br] + "/" : SITE + "m/");
  const bikeUrl = (k) => { const b = BIKES.find((x) => key(x) === k); return b ? url(b) : SITE + "m/"; };
  const engs = Object.keys(bikesOf).filter((id) => ENGINES[id]);
  const topEng = engs.slice().sort((a, b) => bikesOf[b].length - bikesOf[a].length)[0];
  const realBikes = BIKES.filter((b) => b.brand !== "Любая модель");
  const withEng = (f) => realBikes.map((b) => [b, engOf(b)]).filter((x) => x[1] && f(x[1]));
  const hpMax = withEng((e) => +e.hp > 0).sort((a, b) => +b[1].hp - +a[1].hp)[0];
  const ccMin = withEng((e) => +e.cc > 0).sort((a, b) => +a[1].cc - +b[1].cc)[0];
  const redMax = withEng((e) => +e.redline > 0).sort((a, b) => +b[1].redline - +a[1].redline)[0];
  const n = (x) => Number(x).toLocaleString("ru-RU").replace(/ /g, " ");
  const RU_BR = [["Урал", "Ирбит"], ["ИЖ", "Ижевск"], ["Восход", "Ковров"], ["Ковровец", "Ковров"], ["ЗиД", "Ковров"], ["Тула", "Тула"]];
  const HOLIDAYS = [
    { date: "2026-11-21", time: "12:00", id: "news-format", card: { kind: "holiday", theme: "news", kick: "Канал MotoHelper", title: "Новый формат", sub: "Мотоцикл дня в 18:00 и полезные советы в 12:00" },
      text: ["📣 Новый формат канала!", "", "🏍 Каждый день в 18:00 — мотоцикл дня: интересный факт, масло, свеча, клапаны и слабые места.",
        "💡 Через день в 12:00 — полезный совет: обслуживание, ремонт, подготовка к сезону.", "🎉 В праздники — поздравления и интересное из мира мотоциклов. Иногда — шутки 😄", "",
        "Первый мотоцикл дня — сегодня вечером. Свой мотоцикл и всё про него: " + SITE].join("\n") },
    { date: "2026-12-31", time: "12:00", id: "ny-eve-2026", card: { kind: "holiday", theme: "ny", kick: "31 декабря", title: "С наступающим!", sub: "Пусть весной всё заведётся с первого раза", big: "2027" },
      text: ["🎄 С наступающим Новым годом!", "", "Пока мотоцикл зимует — короткий чек-лист, чтобы весной он завёлся с первого раза:", "",
        "• масло поменяно до хранения — старое за зиму разъедает детали;", "• бензин из карбюратора слит, бак полный;", "• аккумулятор в тепле и раз в месяц на зарядке;",
        "• цепь смазана, шины подкачаны, выхлоп закрыт от мышей.", "", "Спасибо, что читаете канал! Пусть в новом году всё заводится, ничего не течёт, а дороги будут сухими 🏍", "",
        "Как подготовить мотоцикл к зиме: " + SITE + "m/remont/winter/"].join("\n") },
    { date: "2027-01-01", time: "12:00", id: "ny-2027", card: { kind: "holiday", theme: "ny", kick: "1 января", title: "С Новым годом!", sub: "Ровных дорог и тёплого сезона", big: "2027" },
      text: ["🎉 С Новым 2027 годом!", "", "Немного цифр из нашей базы — для разговора за праздничным столом:", "",
        "🏍 " + n(realBikes.length) + " моделей от " + n(new Set(realBikes.map((b) => b.brand)).size) + " марок и " + n(engs.length) + " моторов",
        topEng ? "⚙️ Самый массовый мотор — " + ENGINES[topEng].code + ": стоит на " + bikesOf[topEng].length + " моделях" : "",
        hpMax ? "🚀 Самый мощный — " + key(hpMax[0]) + ": " + hpMax[1].hp + " л.с." : "",
        ccMin ? "🐣 Самый маленький мотор — у " + key(ccMin[0]) + ": " + ccMin[1].cc + " см³" : "",
        redMax ? "🔊 Выше всех крутится " + key(redMax[0]) + ": красная зона " + n(redMax[1].redline) + " об/мин" : "", "",
        "Желаем ровных дорог, тёплого сезона и чтобы запчасти находились с первого раза!", "", "Найти свой мотоцикл: " + SITE + "m/"].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n") },
    { date: "2027-02-14", time: "12:00", id: "feb14-2027", card: { kind: "holiday", theme: "feb14", kick: "14 февраля", title: "Любовь с первого запуска", sub: "С Днём всех влюблённых!" },
      text: ["❤️ С Днём всех влюблённых!", "", "Признаки того, что у тебя с мотоциклом всё серьёзно:", "",
        "• ты помнишь, когда менял ему масло, но не помнишь, когда ел сам;", "• в телефоне фотографий мотоцикла больше, чем всех остальных;", "• зимой ты ходишь в гараж «просто посмотреть»;",
        "• на вопрос «куда поедем?» у тебя всегда есть ответ.", "", "Любите тех, кто рядом, — и мотоциклы тоже 🏍", "", "Подобрать подарок любимому мотоциклу: " + SITE + "m/tuning/"].join("\n") },
    { date: "2027-02-23", time: "12:00", id: "feb23-2027", card: { kind: "holiday", theme: "feb23", kick: "23 февраля", title: "С Днём защитника Отечества!", sub: "Что подарить мотоциклисту" },
      text: ["🎖 С Днём защитника Отечества!", "", "Что подарить мотоциклисту — полезное, а не очередную кружку:", "",
        "• зарядное устройство для АКБ с режимом хранения;", "• набор щупов для регулировки клапанов;", "• мультиметр — с ним ищется половина поломок электрики;",
        "• компрессиометр — честно покажет состояние мотора;", "• очиститель и смазку для цепи;", "• счётчик моточасов — для эндуро и питбайка.", "",
        "Крепкого здоровья, исправной техники и сухих дорог!", "", "Как всем этим пользоваться — в инструкциях: " + SITE + "m/remont/"].join("\n") },
    { date: "2027-03-08", time: "12:00", id: "mar8-2027", card: { kind: "holiday", theme: "mar8", kick: "8 марта", title: "С 8 Марта!", sub: "Девушкам, которые любят мотоциклы" },
      text: ["🌷 С 8 Марта!", "", "Поздравляем всех девушек, которые ездят сами, ездят пассажиром или только мечтают о своём мотоцикле!", "",
        "Если выбираешь первый мотоцикл:", "• посадка — на светофоре обе ноги должны доставать до земли хотя бы носками;", "• вес — поднимать его придётся самой, так что чем легче, тем спокойнее;",
        "• мощность — для начала хватит небольшого объёма, опыт важнее лошадиных сил;", "• экипировка — до покупки, а не после.", "",
        "Весны, тепла и красивых дорог! 💐", "", "Модели по классам: " + SITE + "m/podborka/"].join("\n") },
    { date: "2027-04-01", time: "12:00", id: "apr1-2027", card: { kind: "holiday", theme: "apr1", kick: "1 апреля", title: "Срочная новость!", sub: "Карбюраторы научились настраиваться сами" },
      text: ["📰 Срочная новость!", "", "С сегодняшнего дня все карбюраторы настраиваются сами — достаточно вежливо сказать им «пожалуйста». Цепи договорились больше не растягиваться, а ключ на 10 перестанет теряться в гараже.",
        "", "Учёные также выяснили, что мотоцикл заводится с первого раза, если рядом никого нет. При зрителях — с седьмого.", "", "С 1 апреля! 😄", "",
        "А если серьёзно — карбюратор настраивается по свече за полчаса: " + SITE + "m/remont/carb-tune/"].join("\n") },
    { date: "2027-04-24", time: "12:00", id: "season-2027", card: { kind: "holiday", theme: "season", kick: "Открытие сезона", title: "Мотосезон открыт!", sub: "Чек-лист перед первым выездом" },
      text: ["🏁 Открываем мотосезон!", "", "Перед первым выездом — 15 минут на проверку:", "", "• аккумулятор заряжен, клеммы затянуты;", "• давление в шинах, резина без трещин;",
        "• цепь смазана и натянута;", "• тормоза: уровень и цвет жидкости, толщина колодок;", "• масло и антифриз — уровень, нет ли течей;", "• свет и сигналы работают, газ возвращается сам.", "",
        "Первые выезды — спокойно: резина и тормоза холодные, а на дорогах ещё песок после зимы.", "", "Подробно: " + SITE + "m/remont/spring-prep/"].join("\n") },
    { date: "2027-05-01", time: "12:00", id: "may1-2027", card: { kind: "holiday", theme: "may1", kick: "1 мая", title: "Мир! Труд! Май!", sub: "Майские — время дальних поездок" },
      text: ["🌿 С праздником Весны и Труда!", "", "Майские — время первых дальних поездок. Перед дорогой:", "", "• ТО по пробегу: масло, свеча, клапаны;", "• цепь и звёзды — без крючков на зубьях;",
        "• в рюкзаке — ремкомплект шин, насос, ключи и стяжки;", "• маршрут с заправками: на эндуро бак кончается быстро.", "", "Хороших дорог и солнечной погоды! ☀️", "",
        "Как подготовиться к дальней поездке: " + SITE + "m/remont/long-trip/"].join("\n") },
    { date: "2027-05-09", time: "12:00", id: "may9-2027", card: { kind: "holiday", theme: "may9", kick: "9 мая", title: "С Днём Победы!", sub: "Помним. Гордимся." },
      text: ["🎖 С Днём Победы!", "", "9 Мая — день памяти и благодарности.", "",
        "Одна из машин той войны — мотоцикл М-72. Его создали по образцу немецкого BMW R71 и начали выпускать в 1941 году. Осенью того же года производство эвакуировали в Ирбит — так появился завод, который и сейчас делает «Уралы». Потомки М-72 — «Уралы» и «Днепры» с оппозитным мотором.",
        "", "Спасибо тем, кто победил. С праздником!", "", "М-72 в нашей базе: " + bikeUrl("Урал М-72")].join("\n") },
    { date: "2027-06-12", time: "12:00", id: "jun12-2027", card: { kind: "holiday", theme: "jun12", kick: "12 июня", title: "С Днём России!", sub: "Отечественные мотоциклы в нашей базе" },
      text: ["🇷🇺 С Днём России!", "", "Отечественные мотоциклы в нашей базе — с маслом, свечами и зазорами:", "",
        ...RU_BR.map(([br, city]) => { const c = realBikes.filter((b) => b.brand === br).length; return c ? "• " + br + " (" + city + ") — " + c + " " + h.plural(c, "модель", "модели", "моделей") + ": " + brandUrl(br) : ""; }).filter(Boolean),
        "", "С праздником! Пусть отечественная техника заводится с полпинка 🏍"].join("\n") },
  ];

  /* ---------- расписание ---------- */
  const posts = [], cards = [];
  const man = (manual.posts || []).map((p) => Object.assign({ time: "18:00" }, p));
  man.forEach((p) => { const c = Object.assign({}, p); delete c.card; posts.push(c); if (p.card) cards.push(Object.assign({ id: p.id }, p.card)); });
  const taken = new Set(man.map((p) => p.date + " " + p.time));
  HOLIDAYS.filter((x) => !taken.has(x.date + " " + x.time)).forEach((x) => { taken.add(x.date + " " + x.time); posts.push({ date: x.date, time: x.time, id: x.id, text: x.text }); cards.push(Object.assign({ id: x.id }, x.card)); });
  const days = [];
  for (let d = new Date(START + "T00:00:00Z"); d <= new Date(END + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  /* мотоцикл дня: фото-модели равномерно среди остальных, первая — с фото */
  const slots = days.filter((d) => !taken.has(d + " 18:00"));
  const bikes = []; let acc = 1;
  const P = photoQ.slice(), Q = plainQ.slice(), share = P.length / Math.max(1, slots.length);
  slots.forEach(() => { let pick = acc >= 1 && P.length ? P : Q.length ? Q : P; if (pick === P) acc -= 1; acc += share;
    const prev = bikes[bikes.length - 1]; let j = pick.findIndex((b) => !prev || b.brand !== prev.brand); if (j < 0) j = 0; if (pick[j]) bikes.push(pick.splice(j, 1)[0]); });
  const tips = TIP_ORDER.map((id) => GUIDES.find((g) => g.id === id)).filter(Boolean);
  let bi = 0, ti = 0;
  days.forEach((d, k) => {
    if (k % 2 === 0 && !taken.has(d + " 12:00") && ti < tips.length) {
      const g = tips[ti], p = tipPost(g, ti, ti % 3 === 1); ti++;
      const id = "tip-" + g.id; posts.push({ date: d, time: "12:00", id, text: p.text }); cards.push(Object.assign({ id }, p.card));
    }
    if (!taken.has(d + " 18:00") && bi < bikes.length) {
      const b = bikes[bi], p = bikePost(b, bi, bi % 5 === 3); bi++;
      const id = "bike-" + bikeSlug.get(b); posts.push({ date: d, time: "18:00", id, text: p.text }); cards.push(Object.assign({ id }, p.card));
    }
  });
  /* картинка — если уже нарисована (scripts/tg-cards.js); иначе пост выйдет текстом */
  posts.forEach((p) => { if (!p.photo && fs.existsSync(path.join(ROOT, "img/tg", p.id + ".jpg"))) p.photo = SITE + "img/tg/" + p.id + ".jpg"; });
  posts.sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : a.date + a.time > b.date + b.time ? 1 : 0));
  return { posts, cards, stats: { bikes: bi, photoBikes: photoQ.length, plainBikes: plainQ.length, tips: ti, tipsTotal: tips.length, holidays: HOLIDAYS.length } };
};
module.exports.START = START;
module.exports.END = END;
module.exports.RU_MONTH = RU_MONTH;
