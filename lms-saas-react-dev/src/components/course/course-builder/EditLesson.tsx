// src/components/course/builder/EditLesson.tsx
import { useEffect, useMemo, useState } from "react";
import { Youtube } from "lucide-react";
import {
  isYouTubeUrl,
  extractYouTubeVideoId,
  getYouTubeThumbnail,
  getYouTubeDurationSeconds,
  secondsToHours,
  getHtmlVideoDurationSeconds,
} from "../../../utils/courseBuilder";
import { useTranslation } from "react-i18next";
import { useCustomQuery } from "../../../hooks/useQuery";
import { useCustomPatch } from "../../../hooks/useMutation";
import { API_ENDPOINTS } from "../../../utils/constants";
import toast from "react-hot-toast";
import { qk } from "../../../utils/builderQueries";

interface Props {
  // modules: Module[]; // kept for compatibility (unused for data source)
  updateLesson: (
    moduleId: string,
    lessonId: string,
    updates: Partial<Lesson>
  ) => void;
  editingLesson: { moduleId: string; lessonId: string };
  setEditingLesson: React.Dispatch<
    React.SetStateAction<{ moduleId: string; lessonId: string } | null>
  >;
  onCancel?: () => void;
  onSave?: () => void;
}

export default function EditLesson({
  // modules, // not used anymore as source of lesson data
  editingLesson,
  setEditingLesson,
  updateLesson,
  onCancel,
  onSave,
}: Props) {
  const { t } = useTranslation("courseBuilder");
  const lessonId = editingLesson.lessonId;
  const moduleId = editingLesson.moduleId;

  // Fetch the single lesson by id
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

  // Local form state (initialized from server)
  const [title, setTitle] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [durationHours, setDurationHours] = useState<number | null>(null);

  useEffect(() => {
    if (!serverLesson) return;
    setTitle(serverLesson.title ?? "");
    setUrl(serverLesson.url ?? "");
    setDurationHours(
      typeof serverLesson.duration_hours === "number"
        ? serverLesson.duration_hours
        : null
    );
  }, [serverLesson]);

  const isValid = useMemo(() => {
    if (!url?.trim()) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, [url]);

  const isYT = isYouTubeUrl(url || "");
  const videoId = isYT ? extractYouTubeVideoId(url || "") : null;
  const thumb = videoId ? getYouTubeThumbnail(videoId) : "";

  // optimistic reflect in parent, but primary source is local state + PATCH
  const handleTitleChange = (val: string) => {
    setTitle(val);
    updateLesson(moduleId, lessonId, { title: val } as any);
  };

  const handleUrlChange = async (value: string) => {
    setUrl(value);
    updateLesson(moduleId, lessonId, { url: value });

    // Auto-extract duration -> duration_hours
    try {
      let seconds = 0;
      if (isYouTubeUrl(value)) {
        const id = extractYouTubeVideoId(value);
        if (id) seconds = await getYouTubeDurationSeconds(id);
      } else {
        seconds = await getHtmlVideoDurationSeconds(value);
      }
      const hours = secondsToHours(seconds);
      if (hours > 0) {
        setDurationHours(hours);
        updateLesson(moduleId, lessonId, { duration_hours: hours });
      }
    } catch {
      // ignore
    }
  };

  const { mutateAsync: patchLesson } = useCustomPatch(
    `${API_ENDPOINTS.lesson}${lessonId}/`,
    [...qk.lessonsBySection(moduleId)]
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-900">
            {t("editLesson.title")}
          </h3>
          <p className="text-gray-600 mt-1">
            {t("editLesson.subTitle")} <code>url</code>)
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("editLesson.label")}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder={t("editLesson.placeholder")}
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* YouTube URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("editLesson.youtube")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Youtube className="h-5 w-5 text-red-500" />
                </div>
                <input
                  type="url"
                  value={url || ""}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  name="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {t("editLesson.youtubePlaceholder")}
              </p>
            </div>

            {/* Preview */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">
                {t("editLesson.videoPreview")}
              </h4>
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                {videoId ? (
                  <img
                    src={thumb}
                    alt="YouTube video thumbnail"
                    className="w-full h-full object-cover block"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-sm">
                      {url
                        ? t("editLesson.noPreviewUrl")
                        : t("editLesson.noPreview")}
                    </span>
                  </div>
                )}
              </div>
              {videoId && (
                <p className="text-sm text-gray-600 mt-2 break-all">
                  Video ID: <span className="font-mono">{videoId}</span>
                </p>
              )}
            </div>

            {/* Duration (hours) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("editLesson.time")}
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={durationHours ?? ""}
                onChange={(e) =>
                  setDurationHours(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                placeholder="e.g., 1.25"
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-4 sticky bottom-0 bg-white">
          <button
            onClick={() => (onCancel ? onCancel() : setEditingLesson(null))}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t("editLesson.cancel")}
          </button>
          <button
            onClick={async () => {
              if (!isValid) return;
              try {
                await patchLesson({
                  title: title ?? "",
                  url: (url || "").trim(),
                  content_type: "video",
                  duration_hours: durationHours ?? null,
                });
                toast.success(t("createSections.videoSaved"));
                if (onSave) onSave();
                else setEditingLesson(null);
              } catch {
                // toasts/errors handled by wrappers if any
              }
            }}
            disabled={!isValid}
            className={`bg-purple-600 text-white px-6 py-2 rounded-lg ${
              !isValid ? "opacity-60 cursor-not-allowed" : "hover:bg-purple-700"
            } transition-colors`}
          >
            {t("editLesson.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
