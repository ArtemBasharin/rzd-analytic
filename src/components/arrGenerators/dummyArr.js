const unitsList = ["ТЧЭ-10", 
"ТЧЭ-7",
"ВЧДЭ-11 АЛТАЙСКАЯ",
"ДЦУП",
"ПЧ-25",
"ВЧДЭ-12 ВХОДНАЯ",
"ПЧ-16",
"ПЧ-19",
"ДЦС-4",
"ПЧ-17",
"ДС АЛАМБАЙ",
"ТЧЭ-4",
"ТЧЭ-14",
"ИЧ КУЛУНДА П",
"ШЧ-10",
"ДС АЛТАЙСКАЯ",
"ДС КАМЕНЬ-НА-ОБИ",
"ВЧДЭ-25 НОВОКУЗНЕЦК",
"ЛВЧ-13",
"ЭЧ-13 З-СИБ",
"ВЧДЭ-7 КРАСНОЯРСК-ВОСТ",
"ЭЧ-9 З-СИБ",
"ДС БОРОВИХА",
"ДС ЗОНАЛЬНЫЙ",
"ДС УРЫВАЕВО",
"ИЧ КУЛУНДА Ш",
"ДС ТЯГУН",
"ШЧ-15",
"ДС САРАЙСКИЙ",
"ДС КУЛУНДА",
"ДС ЗАРИНСКАЯ",
"ЛВЧ-20",
"ПМС-177 ДРП",
"ЭЧ-10 З-СИБ",
"ЛВЧД КРАСНОЯРСК",
"ЛВЧД НОВОСИБИРСК",
"ЛВЧ-7",
"ПМС-239 ДРП",
"ЛВЧД-1",
"ШЧ-8",
"ТЧ-34",
"ДС СРЕДНЕСИБИРСКАЯ",
"ВЧДЭ-23 БЕЛОВО",
"ДС СУЗУН",
"ВЧДЭ-6 ИНСКАЯ",
"ДС СМАЗНЕВО",
"ТЧЭ-16",
"ШЧ-11",
"ВЧДЭ-1 БОГОТОЛ",
"ДС ЦАПЛИНО",
"ТЧЭ-2"] 
const reasonsList = ["Неудовлетворительная организация процесса обслуживания (при наличии штата, зап.частей, инструмента, материалов, оборудования)",
"Неправильный учет динамических качеств поезда",
"Укрупненный объем работ по устранению неисправностей в составе",
"Дополнительный простой обгоняемого поезда, вызванный невозможностью организации его пропуска на впереди лежащие станции из-за коротких приемо-отправочных путей",
"Выход животных на железнодорожный путь",
"Пропуск приоритетного поезда на однопутном перегоне с соблюдением требуемых интервалов попутного прибытия и отправления поездов при нарушении графика движения поездов",
"Наводнение",
"Превышение нормативов времени на приемку из-за отсутствия или неверной информации о нахождении инвентаря локомотива, находящегося на станционном пути",
"Нарушение пострадавшими лицами правил поведения на железнодорожных путях",
"Дополнительный простой обгоняемого поезда, из-за нераспорядительности дежурно-диспетчерского персонала",
"Дополнительные работы по показаниям диагностических средств (КТСМ, КТИ, ПАК и др.)",
"Нарушение нормативного графика движения поездов по вине дежурно-диспетчерского аппарата дирекции управления движения",
"Не укомплектован штат работников локомотивных бригад на плановый объем перевозок в теплотяге",
"Неправильное пользование устройствами СЦБ, приведшее к задержке поезда по приему или отправлению из-за необходимости отмены и приготовления нового маршрута",
"Нарушение водителем автомобиля правил проезда через железнодорожный переезд (проезда при запрещающем показании светофора)",
"Позднее устранение неподхода центров автосцепок из-за несвоевременной передачи информации о фактической высоте автосцепки первого вагона грузового поезда",
"Пропуск пассажирского поезда с соблюдением требуемых интервалов попутного следования",
"Пропуск опаздывающего пригородного поезда с соблюдением требуемых интервалов попутного следования",
"Подвод к станции длинносоставного (соединенного, повышенной длины) грузового поезда с отклонением от «нитки» нормативного графика при отсутствии свободных путей достаточной вместимости, приведший к задержке по неприему",
"Неудовлетворительный подвоз локомотивных бригад",
"Неудовлетворительная организация процесса ремонта (при наличии штата, зап.частей, инструмента, материалов, оборудования)",
"Выезд автотранспортных средств на железнодорожные пути вне переезда",
"Ожидание прицепной группы",
"Пропуск пригородного поезда с соблюдением требуемых интервалов попутного следования",
"Пропуск грузового поезда повышенной длины с соблюдением требуемых интервалов попутного следования",
"Незаконное вмешательство в деятельность ж.д. транспорта на перегоне",
"Неудовлетворительные знания локомотивной бригадой порядка и последовательности выполнения операций по приемке локомотива на станционных путях",
"Несоблюдение регламента взаимодействия со смежными службами при производстве ремонтно-путевых работ",
"Невыполнение требований нормативно-технической документации бригадой ССПС по его управлению",
"Ожидание отцепки группы",
"Остановка на перегоне для высадки работников ОАО «РЖД», обеспечивающих выполнение перевозочного процесса и текущее содержание объектов инфраструктуры и подвижного состава на станции",
"Отсутствие работника по болезни",
"Посадка и высадка медицинского работника для оказания медицинской помощи лицам, не являющимся работниками подразделений холдинга «РЖД»",
"Неправильная проверка действия автотормозов",
"Аварийное «окно» для восстановления контактной сети после повреждения",
"Нарушение раскладки материалов",
"Наличие недостатков, допущенных при монтаже устройств",
"Занятость пути",
"Незаконное вмешательство в деятельность ж.д. транспорта на станциях",
"Пропуск грузового поезда по неспециализированному пути в соответствии с утвержденным вариантным графиком на время производства ремонтных работ",
"Пропуск грузового поезда с особыми условиями пропуска (негабаритный груз, ВМ и др.) с соблюдением требуемых интервалов попутного следования",
"Остановка на станции для высадки работников ОАО «РЖД», обеспечивающих выполнение перевозочного процесса и текущее содержание объектов инфраструктуры и подвижного состава на перегоне",
"Отсутствие информации в документации об особенностях использования технических средств при выполнении операций по приему, отправлению поездов и производству маневровой работы",
"Реализация работниками службы движения мер по форсированию пропускной способности, вызывающих пропуск поездов с отклонением от нормативного графика движения",
"Скрещение поезда встречного направления с соблюдением требуемых интервалов неодновременного прибытия и скрещения при нарушении нормативного графика движения поездов",
"Нарушение габарита приближения строений размещением материалов",
"Несоответствие требований документации фактическому порядку работы",
"Незнание алгоритмов работы приборов управления ССПС",
"Посадка и высадка работников ОАО 'РЖД', обеспечивающих выполнение перевозочного процесса и текущее содержание объектов инфраструктуры и подвижного состава на станции",
"Отсутствие неисправности вагона",
"Отсутствие запасных частей, оборудования, материалов",
"Штормовое предупреждение, требующее ограничение скорости",
"Нарушение порядка пропуска поездов по участку",
"Не укомплектован штат работников локомотивных бригад на плановый объем перевозок в электротяге",
"Отсутствия песка (в т.ч. песок несоответствует установленным требованиям )",
"Нарушение порядка последовательности операций",
"Закорачивание рельсовой цепи при производстве работ",
"Незнание величины постоянно действующего ограничения скорости",
"Несогласованные действия руководителя работ и ДСП",
"Ограничение скорости обусловлено конструктивными особенностями подвижного состава, включенного в поезд",
"Нарушения, допущенные при планировании поездообразования и привязке локомотива к «нитке» отправления вариантного графика",
"Превышение норм времени на экипировку локомотива водой",
"Пропуск приоритетного поезда особого назначения с соблюдением требуемых интервалов попутного следования",
"Выявление более 3-х вагонов, требующих устранения коммерческих неисправностей без отцепки от состава",
"Пропуск специального поезда с соблюдением требуемых интервалов попутного следования",
"Несвоевременное приведение путевых машин в транспортное положение при пропуске поездов по соседнему пути",
"Рабочий нагрев буксового узла",
"Превышение норм выгрузки материалов или инструмента с рабочего поезда",
"Нарушение технологии работ при производстве других работ при ремонте, монтаже устройств пути, стрелочного перевода путевыми машинами",
"Выезд автотранспортных средств на железнодорожный путь вне переездов",
"Отключение выключателя 6,10 кВ тяговой подстанции без повреждения устройств электроснабжения",
"Превышение установленного диспетчерским расписанием времени следования по перегону, средствами диагностики, следующими организованными поездными формированиями",
"Отсутствие работника(-ов) в смене",
"Отсутствие достаточных навыков ведения поезда и управления тормозами",
"Неправильная оценка продолжительности выполнения операций",
"Невыполнение требований технологической документации при эксплуатации автоматизированных систем",
"Нарушения, допущенные при организации движения на участках производства ремонтных работ",
"Неправильное восприятие принимающей локомотивной бригадой информации о фактическом местонахождении локомотива",
"Несоблюдение технологии формирования составов с нескольких путей предусмотренных технологическим процессом",
"Несоответствие информации о составе поезда в целом (вес, наличие негабаритности, скорость следования и т.д.)",
"Нарушение порядка использования систем УКБМ в системе АЛСН",
"Несвоевременная подача отремонтированных вагонов в состав",
"Несвоевременное привлечение рабочей силы для очистки путей и стрелок от грязи и снега",
"Нарушение технологии работ по рихтовке пути",
"Невыполнение требований нормативных документов и действующих инструкций со стороны руководителя работ",
"Неудовлетворительные знания требований нормативно-технической документации локомотивной бригадой по управлению локомотивом",
"Отвлечение осмотрщиков-ремонтников, выполняющих техническое обслуживание, на встречу другого поезда",
"Остановка поезда при разрешающих показаниях локомотивного светофора без уважительной причины",
"Неправильное планирование очередности расформирования составов, приведшее к переполнению отдельных сортировочных путей вагонами других назначений и остановке роспуска",
"Внеочередная проверка состояния устройств инфраструктуры на перегоне проводимая на основе сообщений работников «РЖД»",
"Несвоевременная уборка путевого инструмента",
"Ожидание заезда толкача при нарушении нормативного графика",
"Проведение контрольной пробы тормозов поезда",
"Несвоевременное снятие сигналов уменьшения скорости",
"Задержка поезда, связанная с деятельностью сотрудников пpавоохpанительных органов на станции",
"Нарушение технологии работ при замене, вводе в работу или демонтаже несущего троса",
"Несогласованность действий между диспетчером поездным и дежурным по станции",
"Отключение выключателя 27,5 кВ тяговой подстанции без повреждения устройств электроснабжения",
"Позднее прибытие путевой бригады к месту работ",
"Нарушение технологии работ при работе на стрелочном переводе",
"Поступление пассажирского поезда с опозданием по межгосударственному стыковому пункту",
"Задержки, связанные с наличием подвижного состава требующего ограничения скорости",
"Отвлечение осмотрщиков-ремонтников, выполняющих техническое обслуживание, на сокращенное опробование тормозов другого поезда",
"Несвоевременная подача заявки на производство работ по вине заказчика «окна»",
"Повышенное артериальное давление",
"Отсутствие информации или передача неверной информации, касающейся порядка следования поезда дежурным по станции участка",
"Остановка негабаритного транспортного средства на железнодорожном переезде",
"Воздействие низких температур, требующих ограничения скорости",
"Неправильный выбор места начала торможения",
"Выкидка вагонов, ошибочно включенных в сформированный состав (чужаков)",
"Хулиганские действия пассажиров",
"Нарушение водителем автомобиля правил проезда через переезд (проезд под шлагбаум)",
"Посадка и высадка работников ОАО «РЖД», обеспечивающих выполнение перевозочного процесса и текущее содержание объектов инфраструктуры и подвижного состава",
"Ожидание отцепки толкача при нарушении нормативного графика",
"Отсутствие проверки действия тормозов в пути следования",
"Рассеянность/невнимательность энергодиспетчерского персонала",
"Несвоевременное снятие сигналов остановки",
"Несвоевременная постановка грузового поезда под обгон, приведшая к следованию пассажирского поезда с нарушением перегонного времени хода",
"Выявление признаков нетрудоспособности (острых и/или обострение хронических заболеваний)",
"Задержка пассажирского поезда для пересадки пассажиров от опаздывающего поезда",
"Остановка на станции для посадки работников ОАО «РЖД», обеспечивающих выполнение перевозочного процесса и текущее содержание объектов инфраструктуры и подвижного состава на станции",
"Включение в состав поезда вагонов несвойственного назначения",
"Нарушение инструкций по обслуживанию и вождению поездов на участке обслуживания",
"Нарушение технологии работ при подготовке рабочего места",
]
const failKindsList = ['Технологическое нарушение', 'Нарушение технического вида', 'Особая технологическая необходимость', 'Прочие причины']

 const getRandomizedValue =(min, max)=> {
   
    return Math.round (Math.random()*((max - min) )+min)}


const generateElement = () => testArr.push
({
    "Начало отказа": `${getRandomizedValue(2021, 2023)}-0${getRandomizedValue(1, 9)}-0${getRandomizedValue(1, 9)}T15:11:43.000Z`,
    "Категория отказа": `${getRandomizedValue(1, 2)} категория`,
    "Виновное предприятие": unitsList[getRandomizedValue(0, 50)],
    "Количество грузовых поездов(по месту)": getRandomizedValue(1, 5),
    "Время грузовых поездов(по месту)": getRandomizedValue(1, 20),
    "Количество пассажирских поездов(по месту)": getRandomizedValue(1, 2),
    "Время пассажирских поездов(по месту)": getRandomizedValue(1, 3),
    "Количество пригородных поездов(по месту)": getRandomizedValue(1, 2),
    "Время пригородных поездов(по месту)": getRandomizedValue(1, 3),
    "Количество прочих поездов(по месту)": getRandomizedValue(1, 2),
    "Время прочих поездов(по месту)": getRandomizedValue(1, 10),
    "Причина 2 ур":
    reasonsList[getRandomizedValue(0, 123)],
    "Вид технологического нарушения": failKindsList[getRandomizedValue(0, 3)],
  })

  let testArr = []
for (let i=0; i<300; ++i){
        generateElement()
}

export default testArr;