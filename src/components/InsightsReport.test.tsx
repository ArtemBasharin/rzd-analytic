import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import InsightsReport from './InsightsReport';

const row = (id: number, date: string, unit: string, place: string, hours: number) => ({
  'ID отказа': id,
  'Начало отказа': date,
  'Виновное предприятие': unit,
  'Место': place,
  'Причина 2 ур': 'Отказ',
  'Количество грузовых поездов(по месту)': 1,
  'Время грузовых поездов(по месту)': hours,
});

const createMockStore = (sourceState: any[]) =>
  configureStore({
    reducer: {
      filters: () => ({
        sourceState,
        railwayFilter: '',
        regionFilter: '',
        dateStart: new Date('2025-01-01T00:00:00').getTime(),
        dateEnd: new Date('2025-06-30T23:59:59').getTime(),
      }),
    },
  });

const renderWith = (rows: any[]) =>
  render(
    <Provider store={createMockStore(rows)}>
      <InsightsReport />
    </Provider>,
  );

describe('InsightsReport', () => {
  test('does not crash before data is loaded', () => {
    renderWith([]);
    expect(screen.queryByText('Главное')).not.toBeInTheDocument();
  });

  test('says so when the period has no violations', () => {
    renderWith([row(1, '2020-01-10T10:00:00', 'ПЧ-1', 'ИНСКАЯ', 3)]);
    expect(screen.getByText(/Нет данных для отчёта/)).toBeInTheDocument();
  });

  test('renders sections without NaN', () => {
    const { container } = renderWith([
      row(1, '2024-02-10T10:00:00', 'ПЧ-1', 'ИНСКАЯ', 10),
      row(2, '2024-03-10T10:00:00', 'ПЧ-2', 'БИЙСК', 5),
      row(3, '2025-02-10T10:00:00', 'ПЧ-1', 'ИНСКАЯ', 20),
      row(4, '2025-03-01T10:00:00', 'ПЧ-1', 'ИНСКАЯ', 8),
      row(5, '2025-04-10T10:00:00', 'ПЧ-3', 'БАРНАУЛ', 6),
    ]);
    expect(screen.getByText('Главное')).toBeInTheDocument();
    expect(screen.getByText('Зоны внимания')).toBeInTheDocument();
    expect(screen.getByText(/Поездо-часы задержек: 34 ч против 15 ч/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });
});
