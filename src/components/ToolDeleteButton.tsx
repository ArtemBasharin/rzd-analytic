import { deleteCollection } from "../utils/requests";

const ToolDeleteButton = () => {
  return (
    <div className="list_container">
      <button onClick={deleteCollection} className="tools tools_text-button">
        Удалить БД
      </button>
    </div>
  );
};
export default ToolDeleteButton;
