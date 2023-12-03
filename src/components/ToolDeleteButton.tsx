import { deleteCollection } from "../config/requests";

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
