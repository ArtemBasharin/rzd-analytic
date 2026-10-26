import React, { useMemo } from "react";
import { useSelector as useReduxSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../redux/store";
import { cutDecimals, displayUnitName } from "../utils/functions";
import { displayPlaceName, filterViolationsByPlace } from "../utils/placeParts";
import {
  getInsightsReport,
  DriverRow,
  Drivers,
  Pareto,
  Statement,
  PARETO_SHARE,
  REPEAT_WINDOW_DAYS,
  SIGNIFICANCE_ALPHA,
  ANOMALY_IQR_FACTOR,
} from "../data-preprocessors/getInsightsReport";
import { Loader } from "./Loader";

const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

const LIST_LIMIT = 10;

const round = (n: number) => cutDecimals(n);
const pct = (share: number) => `${round(share * 100)}%`;
const signed = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "-" : ""}${round(Math.abs(n))}`;
const dateRu = (t: number) => new Date(t).toLocaleDateString("ru-RU");
const toneClass = (delta: number) =>
  delta > 0 ? "text_increase" : delta < 0 ? "text_decrease" : "";

/** +/- % к прошлому году; в отличие от cellComparingPercents всегда возвращает ячейку. */
function ChangeCell({ past, current }: { past: number; current: number }) {
  let text = "0%";
  if (past && current) text = `${signed((current / past - 1) * 100)}%`;
  else if (!past && current) text = `+${round(current)}`;
  else if (past && !current) text = "-100%";
  return (
    <td className={`table_bold_right ${toneClass(current - past)}`}>{text}</td>
  );
}

function Statements({ items }: { items: Statement[] }) {
  return (
    <>
      {items.map((s, k) => (
        <p
          key={k}
          className={`text_paragraph ${
            s.tone === "up" ? "text_increase" : s.tone === "down" ? "text_decrease" : ""
          }`}
        >
          {s.text}
        </p>
      ))}
    </>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="text_paragraph insights_heading">{children}</p>;
}

function DriversTable({
  title,
  drivers,
  pastYear,
  currentYear,
}: {
  title: string;
  drivers: Drivers;
  pastYear: number;
  currentYear: number;
}) {
  const rows: DriverRow[] = [...drivers.worsened, ...drivers.improved];
  if (!rows.length) return null;
  return (
    <table className="table_bold insights_table">
      <tbody>
        <tr className="table_bold text_header">
          <td className="table_bold_right">{title}</td>
          <td>ТН {pastYear}</td>
          <td>ТН {currentYear}</td>
          <td>ч {pastYear}</td>
          <td>ч {currentYear}</td>
          <td>Δ, ч</td>
          <td>Доля в изменении</td>
        </tr>
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="table_bold_right insights_name">
              {r.label}
              {r.test.significant ? " *" : ""}
            </td>
            <td>{r.pastCount}</td>
            <td>{r.currentCount}</td>
            <td>{round(r.pastDuration)}</td>
            <td>{round(r.currentDuration)}</td>
            <td className={toneClass(r.delta)}>{signed(r.delta)}</td>
            <td>{pct(r.share)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function paretoText(name: string, p: Pareto) {
  if (!p.groups) return null;
  return (
    <p className="text_paragraph">
      {name}: {pct(PARETO_SHARE)} потерь дают {p.vitalFew} из {p.groups} (
      {pct(p.vitalFewShare)}) – {p.leaders.slice(0, 5).map((l) => `${l.label} (${pct(l.share)})`).join(", ")}
      {p.leaders.length > 5 ? " и др." : ""}.
    </p>
  );
}

const GRANULARITY_TEXT = {
  day: "по дням",
  week: "по неделям",
  month: "по месяцам",
};

const TREND_TEXT = {
  up: "рост",
  down: "снижение",
  flat: "стабильная интенсивность",
  unknown: "недостаточно интервалов для оценки",
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const InsightsReport = () => {
  const sourceRows = useSelector((state) => state.filters.sourceState);
  const railwayFilter = useSelector((state) => state.filters.railwayFilter ?? "");
  const regionFilter = useSelector((state) => state.filters.regionFilter ?? "");
  const dateStart = useSelector((state) => state.filters.dateStart);
  const dateEnd = useSelector((state) => state.filters.dateEnd);

  const report = useMemo(() => {
    const rows = filterViolationsByPlace(sourceRows, railwayFilter, regionFilter);
    return getInsightsReport(rows, dateStart, dateEnd, {
      unit: (u) => displayUnitName(u).replace(/\n/g, " "),
      place: (p) => displayPlaceName(p, railwayFilter, regionFilter),
    });
  }, [sourceRows, railwayFilter, regionFilter, dateStart, dateEnd]);

  if (!sourceRows?.length) return <Loader />;

  const { past, current } = report.totals;
  if (!past.count && !current.count) {
    return (
      <div className="text_container">
        <p className="text_paragraph">Нет данных для отчёта за выбранный период.</p>
      </div>
    );
  }

  const pastYear = new Date(report.past.end).getFullYear();
  const currentYear = new Date(report.current.end).getFullYear();
  const d = report.decomposition;
  const { timeline, seasonality, recurrence, anomalies, reasonTrends } = report;

  const intensityRows: [string, number, number][] = [
    ["Количество ТН", past.count, current.count],
    ["Задержано поездов", past.delayed, current.delayed],
    ["Поездо-часы задержек", past.duration, current.duration],
    ["Потери на 1 ТН, ч (среднее)", past.hoursPerFail, current.hoursPerFail],
    ["Потери на 1 ТН, ч (медиана)", past.medianDuration, current.medianDuration],
    ["Потери на 1 ТН, ч (90-й перцентиль)", past.p90Duration, current.p90Duration],
    ["Задержано поездов на 1 ТН", past.trainsPerFail, current.trainsPerFail],
    ["Часов на 1 задержанный поезд", past.hoursPerTrain, current.hoursPerTrain],
  ];

  return (
    <div className="text_container insights_report">
      <Heading>Главное</Heading>
      <Statements items={report.headlines} />

      <Heading>Удельные показатели</Heading>
      <table className="table_bold insights_table">
        <tbody>
          <tr className="table_bold text_header">
            <td className="table_bold_right">Показатель</td>
            <td>{pastYear}</td>
            <td>{currentYear}</td>
            <td>+/- % к прошлому году</td>
          </tr>
          {intensityRows.map(([name, p, c]) => (
            <tr key={name}>
              <td className="table_bold_right insights_name">{name}</td>
              <td>{round(p)}</td>
              <td className="table_bold_right">{round(c)}</td>
              <ChangeCell past={p} current={c} />
            </tr>
          ))}
        </tbody>
      </table>

      <Heading>Факторный анализ изменения потерь</Heading>
      {d.dominant === "none" ? (
        <p className="text_paragraph">
          {past.count
            ? "Поездо-часы задержек не изменились."
            : "За аналогичный период прошлого года ТН не было – база для разложения отсутствует."}
        </p>
      ) : (
        <p className="text_paragraph">
          Поездо-часы изменились на{" "}
          <span className={toneClass(d.delta)}>{signed(d.delta)} ч</span>, из них
          за счёт количества ТН –{" "}
          <span className={toneClass(d.frequencyEffect)}>{signed(d.frequencyEffect)} ч</span>, за
          счёт средней тяжести одного ТН –{" "}
          <span className={toneClass(d.severityEffect)}>{signed(d.severityEffect)} ч</span>.
          Определяющий фактор: {d.dominant === "frequency" ? "частота ТН" : "тяжесть ТН"}.
        </p>
      )}

      <Heading>Вклад в изменение потерь</Heading>
      <p className="text_paragraph">
        Положительный вклад – рост поездо-часов, отрицательный – снижение. Знаком «*» отмечено
        статистически значимое изменение количества ТН (p &lt; {SIGNIFICANCE_ALPHA}).
      </p>
      <DriversTable title="Подразделение" drivers={report.drivers.units} pastYear={pastYear} currentYear={currentYear} />
      <DriversTable title="Станция / перегон" drivers={report.drivers.places} pastYear={pastYear} currentYear={currentYear} />
      <DriversTable title="Причина" drivers={report.drivers.reasons} pastYear={pastYear} currentYear={currentYear} />

      <Heading>Концентрация потерь (принцип Парето)</Heading>
      {paretoText("Подразделения", report.pareto.units)}
      {paretoText("Станции и перегоны", report.pareto.places)}
      {paretoText("Причины", report.pareto.reasons)}
      <p className="text_paragraph">
        Пять наиболее крупных ТН дали {pct(report.pareto.topIncidentsShare)} всех потерь
        {report.pareto.topIncidentsShare >= 0.5
          ? " – потери определяются единичными крупными случаями."
          : " – потери распределены по массе случаев."}
      </p>

      <Heading>Динамика и сезонность</Heading>
      <p className="text_paragraph">
        Динамика {GRANULARITY_TEXT[timeline.granularity]}: {TREND_TEXT[timeline.trend]}
        {timeline.trend === "up" || timeline.trend === "down"
          ? ` (интенсивность потерь к концу периода ${signed(timeline.trendRelative * 100)}% от среднего уровня по линии тренда)`
          : ""}
        .
        {timeline.outliers.length
          ? ` Всплески выше среднего более чем на 2σ: ${timeline.outliers.join(", ")}.`
          : ""}
      </p>
      <table className="table_bold insights_table">
        <tbody>
          <tr className="table_bold text_header">
            <td className="table_bold_right">Интервал</td>
            <td>ТН {pastYear}</td>
            <td>ТН {currentYear}</td>
            <td>ч {pastYear}</td>
            <td>ч {currentYear}</td>
            <td>+/- %</td>
          </tr>
          {timeline.buckets.map((b) => (
            <tr key={b.label}>
              <td className="table_bold_right">{b.label}</td>
              <td>{b.pastCount}</td>
              <td>{b.currentCount}</td>
              <td>{round(b.pastDuration)}</td>
              <td className="table_bold_right">{round(b.currentDuration)}</td>
              <ChangeCell past={b.pastDuration} current={b.currentDuration} />
            </tr>
          ))}
        </tbody>
      </table>
      {seasonality.peakWeekday && seasonality.peakHours && (
        <p className="text_paragraph">
          Чаще всего ТН допускались в день недели «{seasonality.peakWeekday.label}» (
          {pct(seasonality.peakWeekday.share)} при равномерном распределении 14%) и в интервале{" "}
          {pad2(seasonality.peakHours.from)}:00–{pad2(seasonality.peakHours.to)}:00 (
          {pct(seasonality.peakHours.share)} при равномерном 12,5%).
        </p>
      )}

      <Heading>Повторяемость</Heading>
      <p className="text_paragraph">
        Мест с ТН в обоих периодах (хронические): {recurrence.chronic.length}; новых мест:{" "}
        {recurrence.fresh.length}; мест, где ТН в этом году не допущено: {recurrence.gone.length}.
      </p>
      {recurrence.chronic.length > 0 && (
        <table className="table_bold insights_table">
          <tbody>
            <tr className="table_bold text_header">
              <td className="table_bold_right">Хроническое место</td>
              <td>ТН {pastYear}</td>
              <td>ТН {currentYear}</td>
              <td>ч {pastYear}</td>
              <td>ч {currentYear}</td>
              <td>+/- %</td>
            </tr>
            {recurrence.chronic.slice(0, LIST_LIMIT).map((p) => (
              <tr key={p.place}>
                <td className="table_bold_right insights_name">{p.label}</td>
                <td>{p.pastCount}</td>
                <td>{p.currentCount}</td>
                <td>{round(p.pastDuration)}</td>
                <td className="table_bold_right">{round(p.currentDuration)}</td>
                <ChangeCell past={p.pastDuration} current={p.currentDuration} />
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {recurrence.fresh.length > 0 && (
        <p className="text_paragraph">
          Новые места с наибольшими потерями:{" "}
          {recurrence.fresh
            .slice(0, 5)
            .map((p) => `${p.label} – ${round(p.currentDuration)} ч (${p.currentCount} ТН)`)
            .join("; ")}
          .
        </p>
      )}
      {recurrence.repeats.length > 0 ? (
        <>
          <p className="text_paragraph">
            Повторы одной причины на одном месте с интервалом не более {REPEAT_WINDOW_DAYS} дн.:
          </p>
          {recurrence.repeats.slice(0, LIST_LIMIT).map((r, k) => (
            <p key={k} className="text_paragraph">
              {k + 1}) {r.placeLabel}: «{r.reason}» – {r.count} раз за {r.spanDays} дн. (
              {dateRu(r.first)}–{dateRu(r.last)}), {round(r.duration)} ч;
            </p>
          ))}
        </>
      ) : (
        <p className="text_paragraph">Повторов одной причины на одном месте не выявлено.</p>
      )}

      <Heading>Аномально крупные ТН</Heading>
      {anomalies.threshold == null ? (
        <p className="text_paragraph">Выборка слишком мала для поиска аномалий.</p>
      ) : anomalies.items.length ? (
        <>
          <p className="text_paragraph">
            Порог аномальности – {round(anomalies.threshold)} ч на ТН (Q3 + {ANOMALY_IQR_FACTOR}·IQR).
            Выявлено {anomalies.items.length} ТН, на них приходится {pct(anomalies.share)} потерь:
          </p>
          {anomalies.items.slice(0, LIST_LIMIT).map((i, k) => (
            <p key={k} className="text_paragraph">
              {k + 1}) ТН №{String(i.id ?? "–")}, {dateRu(i.time)}, {displayPlaceName(i.place, railwayFilter, regionFilter)},{" "}
              {round(i.duration)} ч, {i.reason ? `${i.reason.toLowerCase()}, ` : ""}
              {displayUnitName(i.unit)};
            </p>
          ))}
        </>
      ) : (
        <p className="text_paragraph">Аномально крупных ТН не выявлено.</p>
      )}

      <Heading>Тенденции причин</Heading>
      {reasonTrends.growing.length > 0 && (
        <p className="text_paragraph">
          Растущие причины:{" "}
          {reasonTrends.growing
            .map((r) => `«${r.label}» ${r.pastCount} → ${r.currentCount}${r.test.significant ? " *" : ""}`)
            .join("; ")}
          .
        </p>
      )}
      {reasonTrends.declining.length > 0 && (
        <p className="text_paragraph">
          Снижающиеся причины:{" "}
          {reasonTrends.declining
            .map((r) => `«${r.label}» ${r.pastCount} → ${r.currentCount}${r.test.significant ? " *" : ""}`)
            .join("; ")}
          .
        </p>
      )}
      {reasonTrends.fresh.length > 0 && (
        <p className="text_paragraph">
          Новые причины (не встречались годом ранее):{" "}
          {reasonTrends.fresh
            .map((r) => `«${r.label}» – ${r.currentCount} ТН, ${round(r.currentDuration)} ч`)
            .join("; ")}
          .
        </p>
      )}

      <Heading>Структура потерь по видам поездов</Heading>
      <table className="table_bold insights_table">
        <tbody>
          <tr className="table_bold text_header">
            <td className="table_bold_right">Вид поездов</td>
            <td>Доля {pastYear}</td>
            <td>Доля {currentYear}</td>
            <td>Сдвиг, п.п.</td>
          </tr>
          {report.trainMix.map((r) => (
            <tr key={r.type}>
              <td className="table_bold_right insights_name">{r.label}</td>
              <td>{pct(r.pastShare)}</td>
              <td className="table_bold_right">{pct(r.currentShare)}</td>
              <td className={toneClass(r.shiftPp)}>{signed(r.shiftPp)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Heading>Сочетания «подразделение × место» с наибольшими потерями</Heading>
      <DriversTable
        title="Подразделение × место"
        drivers={{
          rows: [],
          worsened: report.crossHotspots.largest,
          improved: [],
        }}
        pastYear={pastYear}
        currentYear={currentYear}
      />

      <Heading>Зоны внимания</Heading>
      {report.attention.length ? (
        <Statements items={report.attention} />
      ) : (
        <p className="text_paragraph">Устойчивых негативных тенденций не выявлено.</p>
      )}

      <p className="text_paragraph insights_note">
        Методика: сравнение с аналогичным периодом прошлого года; значимость изменения количества
        ТН – точный биномиальный тест для пуассоновских частот (α = {SIGNIFICANCE_ALPHA}); тренд –
        линейная регрессия интенсивности потерь (ч/сут) по интервалам; аномалии – правило Q3 +{" "}
        {ANOMALY_IQR_FACTOR}·IQR.
      </p>
    </div>
  );
};

export default InsightsReport;
