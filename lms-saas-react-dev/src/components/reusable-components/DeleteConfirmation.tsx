import { Trash2 } from "lucide-react";
import Modal from "./Modal";
import { useTranslation } from "react-i18next";

interface Props {
  text: string;
  title: string;
  isOpen: boolean;
  onClose: (s: boolean) => void;
  handleDelete: () => void;
}

export default function DeleteConfirmation({
  text,
  title,
  isOpen,
  onClose,
  handleDelete,
}: Props) {
  const { t } = useTranslation("instructorDashboard");
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose(false);
      }}
      size="lg"
      title={t("courses.deleteCourse")}
    >
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">{title}</h4>
        <div className="flex flex-col items-start justify-start gap-4 text-sm text-yellow-800 space-y-1">
          <p>{text}</p>
          <div className="flex sm:flex-row flex-col-reverse items-center gap-4 justify-between w-full">
            <button
              onClick={() => {
                onClose(false);
              }}
              className="bg-white text-gray-600 px-6 py-3 w-full rounded-lg border border-gray-200 transition-colors flex items-center justify-center"
            >
              {t("createCourseModal.cancel")}
            </button>

            <button
              onClick={handleDelete}
              className="bg-yellow-600 text-white px-6 py-3 w-full rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("courses.delete")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
