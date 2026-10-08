import { useState } from "react";
import { deleteCollection, requestErrorText } from "../utils/requests";
import { pushToast, recordsLabel } from "../utils/toast";

const ToolDeleteButton = () => {
  const [pending, setPending] = useState(false);

  const onDelete = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result = await deleteCollection();
      const deleted = Number(result?.deletedCount ?? 0);
      pushToast(
        deleted > 0
          ? `База удалена: ${deleted} ${recordsLabel(deleted)}`
          : "База уже была пуста",
        "success",
      );
    } catch (error) {
      pushToast(requestErrorText(error, "Не удалось удалить базу"), "fail");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="list_container">
      <button
        onClick={onDelete}
        className="tools tools_text-button"
        disabled={pending}
      >
        {pending ? "Удаление…" : "Удалить БД"}
      </button>
    </div>
  );
};
export default ToolDeleteButton;
