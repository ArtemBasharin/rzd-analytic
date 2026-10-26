import {
  dismissToast,
  getToasts,
  pushToast,
  resetToastsForTests,
  updateToast,
} from "./toast";

beforeEach(() => {
  jest.useFakeTimers();
  resetToastsForTests();
});

afterEach(() => {
  resetToastsForTests();
  jest.useRealTimers();
});

test("тики прогресса обновляют одну карточку, даже если исходный id уже исчез", () => {
  const id = pushToast("Читаем…", "info", true, 0);
  dismissToast(id);
  jest.advanceTimersByTime(400);
  expect(getToasts()).toHaveLength(0);

  for (let done = 58; done <= 65; done += 1) {
    updateToast(id, `Файл 2 из 8: Запись в базу: ${done} из 97`, "info", true, done);
  }

  const toasts = getToasts();
  expect(toasts).toHaveLength(1);
  expect(toasts[0].message).toBe("Файл 2 из 8: Запись в базу: 65 из 97");
  expect(toasts[0].progress).toBe(65);

  updateToast(id, "Загружено 8 файлов", "success");
  expect(getToasts()).toHaveLength(1);
  expect(getToasts()[0].status).toBe("success");
  expect(getToasts()[0].progress).toBeNull();
});

test("повторный прогресс не добавляет вторую карточку", () => {
  const first = pushToast("Файл 1 из 8", "info", true, 0);
  const second = pushToast("Файл 2 из 8", "info", true, 20);
  expect(second).toBe(first);
  expect(getToasts()).toHaveLength(1);
  expect(getToasts()[0].message).toBe("Файл 2 из 8");
});

test("обычные уведомления по-прежнему складываются, прогресс остаётся одним", () => {
  pushToast("ход", "info", true, 10);
  for (let n = 0; n < 6; n += 1) pushToast(`ошибка ${n}`, "fail");
  const toasts = getToasts();
  expect(toasts.filter((item) => item.progress != null)).toHaveLength(1);
  expect(toasts.filter((item) => item.progress == null)).toHaveLength(4);
});
