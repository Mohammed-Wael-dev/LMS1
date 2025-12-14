import { useTranslation } from "react-i18next";

export default function IssuesModal({
  open,
  onClose,
  issues,
}: {
  open: boolean;
  onClose: () => void;
  issues: string[];
}) {
  const { t } = useTranslation("courseBuilder");

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {t("issuesModal.title")}
        </h3>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-yellow-900 mb-2">
            {t("issuesModal.missing")}
          </h4>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc ltr:ml-4 rtl:mr-4">
            {issues.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            {t("issuesModal.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
