import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TextReportTemplatePeriod from './TextReport';

const mockState = {
  filters: {
    sourceState: [],
    reportSrcState: [
      {
        year: 2024,
        report: [
          { guiltyUnit: 'ПЧ-1', totalDuration: 100, failReason: 'Причина 1' },
          { guiltyUnit: 'ПЧ-2', totalDuration: 50, failReason: 'Причина 2' }
        ],
        sum: {
          pastYearTotalFails: 10,
          pastYearTotalDelays: 20,
          pastYearTotalDurations: 150,
          pastYearTotalTechnical: 5,
          pastYearTotalTechnological: 3,
          pastYearTotalSpecial: 1,
          pastYearTotalExternal: 1
        }
      },
      {
        year: 2025,
        report: [
          { guiltyUnit: 'ПЧ-1', totalDuration: 120, failReason: 'Причина 1' },
          { guiltyUnit: 'ПЧ-2', totalDuration: 60, failReason: 'Причина 2' }
        ],
        sum: {
          currentYearTotalFails: 12,
          currentYearTotalDelays: 25,
          currentYearTotalDurations: 180,
          currentYearTotalTechnical: 6,
          currentYearTotalTechnological: 4,
          currentYearTotalSpecial: 1,
          currentYearTotalExternal: 1
        }
      }
    ],
    reportStations: [
      { year: 2024, report: [{ place: 'Станция 1', totalDuration: 100 }] },
      { year: 2025, report: [{ place: 'Станция 1', totalDuration: 120 }] }
    ],
    sankeyCheckList: [],
    reportSankeyBlocksVisible: false,
    dateStart: new Date('2025-01-01').getTime(),
    dateEnd: new Date('2025-12-31').getTime()
  }
};

const createMockStore = (state: any) => configureStore({
  reducer: {
    filters: () => state.filters
  }
});

describe('TextReportTemplatePeriod', () => {
  test('does not crash before report data is loaded', () => {
    const store = createMockStore({
      filters: {
        sourceState: [],
        reportSrcState: [],
        reportStations: [],
        sankeyCheckList: [],
        dateStart: new Date('2025-01-01').getTime(),
        dateEnd: new Date('2025-12-31').getTime(),
      },
    });
    render(
      <Provider store={store}>
        <TextReportTemplatePeriod />
      </Provider>
    );
    expect(screen.queryByText(/За рассматриваемый период допущено/i)).not.toBeInTheDocument();
  });

  test('renders report with data', () => {
    const store = createMockStore(mockState);
    render(
      <Provider store={store}>
        <TextReportTemplatePeriod />
      </Provider>
    );
    expect(screen.getByText(/За рассматриваемый период допущено/i)).toBeInTheDocument();
  });

  test('sorts table by current year on header click', () => {
    const store = createMockStore(mockState);
    render(
      <Provider store={store}>
        <TextReportTemplatePeriod />
      </Provider>
    );
    
    const currentYearHeader = screen.getAllByText('2025')[0];
    fireEvent.click(currentYearHeader);
    
    expect(screen.getAllByText('ПЧ-1')[0]).toBeInTheDocument();
  });

  test('toggles sort direction on repeated click', () => {
    const store = createMockStore(mockState);
    render(
      <Provider store={store}>
        <TextReportTemplatePeriod />
      </Provider>
    );
    
    const header = screen.getAllByText('2025')[0];
    fireEvent.click(header);
    expect(screen.getByText(/↓/)).toBeInTheDocument();
    
    fireEvent.click(header);
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });

  test('sums delayed trains and hours when total columns are absent', () => {
    const store = createMockStore({
      filters: {
        ...mockState.filters,
        sourceState: [
          {
            'ID отказа': 11,
            'Начало отказа': '2025-06-01T10:00:00.000Z',
            'Место': 'БИЙСК',
            'Причина 2 ур': 'Невыдача локомотива',
            'Виновное предприятие': 'СЛД-64 БАРНАУЛ',
            'Количество грузовых поездов(по месту)': 1,
            'Время грузовых поездов(по месту)': 4.18,
          },
          {
            'ID отказа': 22,
            'Начало отказа': '2025-06-02T10:00:00.000Z',
            'Место': 'КУЛУНДА',
            'Причина 2 ур': 'Отказ',
            'Виновное предприятие': 'ТЧЭ-10',
            'Количество пассажирских поездов(по месту)': 2,
            'Время пассажирских поездов(по месту)': 1.2,
            'Количество пригородных поездов(по месту)': 3,
            'Время пригородных поездов(по месту)': 0.5,
          },
          {
            'ID отказа': 33,
            'Начало отказа': '2025-06-03T10:00:00.000Z',
            'Место': 'ИНСКАЯ',
            'Причина 2 ур': 'Сбой',
            'Виновное предприятие': 'ДЦУП',
            'Количество всех поездов(по месту)': 8,
            'Время всех поездов(по месту)': 6.5,
          },
        ],
      },
    });
    render(
      <Provider store={store}>
        <TextReportTemplatePeriod />
      </Provider>
    );

    expect(screen.getByText(/ТН №11/)).toHaveTextContent(
      'задержано поездов: 1 на 4.18 ч',
    );
    expect(screen.getByText(/ТН №22/)).toHaveTextContent(
      'задержано поездов: 5 на 1.7 ч',
    );
    expect(screen.getByText(/ТН №33/)).toHaveTextContent(
      'задержано поездов: 8 на 6.5 ч',
    );
    expect(
      screen.getByText(/наибольшее количество потерь/i).textContent,
    ).not.toMatch(/NaN/);
  });

  test('toggles right table visibility', () => {
    const store = createMockStore(mockState);
    render(
      <Provider store={store}>
        <TextReportTemplatePeriod />
      </Provider>
    );
    
    const toggleButton = screen.getByRole('button', { name: /консолидированное представление/i });
    fireEvent.click(toggleButton);
    
    expect(screen.getByText(/c распределением по подразделениям/i)).toBeInTheDocument();
  });
});
