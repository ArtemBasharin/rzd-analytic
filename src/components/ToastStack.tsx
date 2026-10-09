import { useSyncExternalStore } from "react";
import { dismissToast, getToasts, subscribeToasts } from "../utils/toast";

const ToastStack = () => {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast_${toast.status}${
            toast.leaving ? " toast_leaving" : ""
          }${toast.progress != null ? " toast_progress" : ""}`}
          role="status"
        >
          <div className="toast__body">
            <span className="toast__label">
              {toast.status === "success"
                ? "Готово"
                : toast.status === "info"
                  ? "Загрузка"
                  : "Ошибка"}
            </span>
            <p className="toast__message">{toast.message}</p>
            {toast.progress != null && (
              <div
                className="toast__bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={toast.progress}
                aria-label="Ход загрузки"
              >
                <div
                  className="toast__bar-fill"
                  style={{ width: `${toast.progress}%` }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            className="toast__close"
            aria-label="Закрыть уведомление"
            onClick={() => dismissToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastStack;
