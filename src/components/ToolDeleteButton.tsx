import { useState } from "react";
import { useDispatch } from "react-redux";
import DeletePeriodDialog from "./DeletePeriodDialog";
import {
  fetchViolationPeriods,
  removeViolationPeriods,
  requestErrorText,
  type ViolationPeriod,
} from "../utils/requests";
import { loadViolationsIntoStore } from "../utils/loadViolations";
import { pushToast, recordsLabel, updateToast } from "../utils/toast";
import type { AppDispatch } from "../redux/store";

const ToolDeleteButton = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [periods, setPeriods] = useState<ViolationPeriod[]>([]);

  const openDialog = async () => {
    if (pending) return;
    setOpen(true);
    setLoading(true);
    setError("");
    setPeriods([]);
    try {
      const rows = await fetchViolationPeriods();
      setPeriods(rows);
    } catch (loadError) {
      setError(requestErrorText(loadError, "Не удалось получить периоды"));
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async (
    chosen: { year: number; month: number }[],
  ) => {
    if (pending || chosen.length === 0) return;
    setPending(true);
    const noticeId = pushToast("Удаление выбранных месяцев…", "info", true);
    try {
      const result = await removeViolationPeriods(chosen);
      const deleted = Number(result?.deletedCount ?? 0);
      setOpen(false);
      try {
        await loadViolationsIntoStore(dispatch, { fallbackToDummy: false });
      } catch (loadError) {
        console.log("reload after period delete failed:", loadError);
        updateToast(
          noticeId,
          "Месяцы удалены, но графики не обновились. Обновите страницу.",
          "fail",
        );
        return;
      }
      updateToast(
        noticeId,
        deleted > 0
          ? `Удалено ${deleted} ${recordsLabel(deleted)}`
          : "В выбранных месяцах записей не было",
        "success",
      );
    } catch (deleteError) {
      updateToast(
        noticeId,
        requestErrorText(deleteError, "Не удалось удалить выбранные месяцы"),
        "fail",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="list_container">
      <button
        onClick={() => {
          void openDialog();
        }}
        className="tools tools_text-button"
        disabled={pending}
      >
        {pending ? "Удаление…" : "Удалить БД"}
      </button>
      {open && (
        <DeletePeriodDialog
          periods={periods}
          loading={loading}
          error={error}
          pending={pending}
          onConfirm={(chosen) => {
            void confirmDelete(chosen);
          }}
          onDismiss={() => {
            if (!pending) setOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default ToolDeleteButton;
