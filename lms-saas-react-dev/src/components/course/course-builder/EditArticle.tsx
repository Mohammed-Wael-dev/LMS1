// src/components/course/course-builder/EditArticle.tsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import SimpleEditor from "./Editor";
import { useCustomQuery } from "../../../hooks/useQuery";
import { useCustomPatch } from "../../../hooks/useMutation";
import { API_ENDPOINTS } from "../../../utils/constants";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { qk } from "../../../utils/builderQueries";

type LessonLocal = Lesson & { parentId?: string };

interface Props {
  // modules: Module[]; // kept for compatibility (unused for data source)
  updateLesson: (
    moduleId: string,
    lessonId: string,
    updates: Partial<LessonLocal>
  ) => void;
  editingArticle: {
    moduleId: string;
    lessonId: string;
  };
  setEditingArticle: React.Dispatch<
    React.SetStateAction<{
      moduleId: string;
      lessonId: string;
    } | null>
  >;
  onCancel?: () => void;
  onSave?: () => void;
}

export default function EditArticle({
  // modules, // not used as source anymore
  editingArticle,
  setEditingArticle,
  updateLesson,
  onCancel,
  onSave,
}: Props) {
  const { t } = useTranslation("courseBuilder");
  const queryClient = useQueryClient();
  const lessonId = editingArticle.lessonId;
  const moduleId = editingArticle.moduleId;

  // Fetch the lesson directly
  const { data } = useCustomQuery(
    `${API_ENDPOINTS.lesson}${lessonId}/`,
    ["lesson", lessonId],
    undefined,
    !!lessonId
  );
  const serverLesson: Lesson | undefined = useMemo(
    () => (data?.data ? (data.data as Lesson) : data),
    [data]
  );

  // Local state from server
  const [title, setTitle] = useState<string>("");
  const [descriptionHtml, setDescriptionHtml] = useState<string>("<p></p>");
  const [durationHours, setDurationHours] = useState<number | null>(null);

  useEffect(() => {
    if (!serverLesson) return;
    setTitle(serverLesson.title ?? "");
    setDescriptionHtml(serverLesson.description_html ?? "<p></p>");
    setDurationHours(
      typeof serverLesson.duration_hours === "number"
        ? serverLesson.duration_hours
        : null
    );
  }, [serverLesson]);

  const canSave =
    Boolean((title || "").trim()) &&
    Boolean((descriptionHtml || "").toString().trim());

  // Optimistic reflect upward (optional)
  const onTitleChange = (val: string) => {
    setTitle(val);
    updateLesson(moduleId, lessonId, { title: val });
  };

  const onHtmlChange = (html: string) => {
    setDescriptionHtml(html);
    updateLesson(moduleId, lessonId, { description_html: html } as any);
  };

  const onDurationChange = (val: number | null) => {
    setDurationHours(val);
    updateLesson(moduleId, lessonId, { duration_hours: val } as any);
  };

  const { mutateAsync: patchLesson } = useCustomPatch(
    `${API_ENDPOINTS.lesson}${lessonId}/`,
    [...qk.lessonsBySection(moduleId)]
  );

  useEffect(() => {
    if (lessonId) {
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    }
  }, [lessonId, queryClient]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {t("editArticle.title")}
          </h3>
          <p className="text-gray-600 mt-1">{t("editArticle.subTitle")}</p>
        </div>
        <div className="p-6">
          <div className="space-y-6 mx-auto max-w-[980px]">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("editArticle.label")}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder={t("editArticle.placeholder")}
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("editArticle.content")}
              </label>
              <SimpleEditor
                className="w-full"
                value={descriptionHtml ?? "<p></p>"}
                onChange={(html) => onHtmlChange(html)}
                placeholder={t("editArticle.contentPlaceholder")}
                minHeight={320}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t("editArticle.contentP1")} <code>description_html</code>{" "}
                {t("editArticle.contentP2")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("editArticle.time")}
              </label>
              <input
                type="number"
                min={0}
                value={durationHours ?? ""}
                onChange={(e) =>
                  onDurationChange(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="e.g., 1.25"
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
          <button
            onClick={() => (onCancel ? onCancel() : setEditingArticle(null))}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t("editArticle.cancel")}
          </button>
          <button
            onClick={async () => {
              if (!canSave) return;
              try {
                await patchLesson({
                  title: title ?? "",
                  description_html: descriptionHtml ?? "<p></p>",
                  duration_hours: durationHours ?? null,
                  content_type: "article",
                });
                toast.success(t("createSections.articleSaved"));
                await queryClient.invalidateQueries({
                  queryKey: ["lessons", moduleId],
                });
                if (onSave) onSave();
                else setEditingArticle(null);
              } catch {
                // handled by wrappers
              }
            }}
            disabled={!canSave}
            className={`bg-purple-600 text-white px-6 py-2 rounded-lg ${
              !canSave ? "opacity-60 cursor-not-allowed" : "hover:bg-purple-700"
            } transition-colors`}
          >
            {t("editArticle.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
