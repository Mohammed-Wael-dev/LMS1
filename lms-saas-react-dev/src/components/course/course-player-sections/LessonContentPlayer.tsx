import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import VideoPlayer from "../../reusable-components/VideoPlayer";
import ExamSection from "./ExamSection";
import { useTranslation } from "react-i18next";
import { useCustomQuery } from "../../../hooks/useQuery";
import { API_ENDPOINTS } from "../../../utils/constants";
import Material from "./Material";
import { readUserFromStorage } from "../../../services/auth";

interface LessonContentProps {
  modules: Module[];
  currentLessonId: string;
  handleComplete: () => void;
  onLessonSelect: (lessonId: string) => void;
  onAssessmentSubmit?: () => void; // called when learner finishes a quiz/exam
}

const isMockUrl = (u?: string) => !!u && /(^|\/\/)example\.com/i.test(u);

const isPlayableUrl = (u?: string) =>
  !!u &&
  !isMockUrl(u) &&
  (/(?:youtu\.be|youtube\.com\/(?:watch|embed|shorts))/i.test(u) ||
    /\.(mp4|webm|ogg|ogv|m3u8)(?:\?|$)/i.test(u));

const DEFAULT_POSTER =
  "https://images.pexels.com/photos/3184416/pexels-photo-3184416.jpeg?auto=compress&cs=tinysrgb&w=800";

export default function LessonContentPlayer({
  modules,
  currentLessonId,
  handleComplete,
  onLessonSelect,
  onAssessmentSubmit,
}: LessonContentProps) {
  const currentUser: User = readUserFromStorage();
  const allLessons = useMemo(
    () => modules?.flatMap((m) => m?.lessons ?? []) ?? [],
    [modules]
  );
  const currentLessonData = useMemo(
    () => allLessons.find((l) => String(l?.id) === String(currentLessonId)),
    [allLessons, currentLessonId]
  );

  const [showAutoNext, setShowAutoNext] = useState(false);
  const [animateRing, setAnimateRing] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const { t } = useTranslation("coursePlayer");

  const nextLessonId = useMemo(() => {
    if (!currentLessonId || !allLessons?.length) return null;
    const idx = allLessons.findIndex(
      (l) => String(l?.id) === String(currentLessonId)
    );
    if (idx === -1 || idx + 1 >= allLessons.length) return null;
    return String(allLessons[idx + 1]?.id ?? "");
  }, [allLessons, currentLessonId]);

  const cancelAutoNext = () => {
    setShowAutoNext(false);
    setAnimateRing(false);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    cancelAutoNext();
  }, [currentLessonId]);

  useEffect(() => cancelAutoNext, []); // cleanup on unmount

  const proceedNext = () => {
    cancelAutoNext();
    if (nextLessonId) {
      setTimeout(() => onLessonSelect(nextLessonId), 0);
    }
  };

  const beginAutoNext = () => {
    if (currentLessonData?.content_type?.toLowerCase() !== "video") return;
    setShowAutoNext(true);
    requestAnimationFrame(() => setAnimateRing(true));
    timeoutRef.current = window.setTimeout(proceedNext, 5000);
  };

  const onVideoComplete = () => {
    try {
      handleComplete?.();
    } catch {
      //
    }
    beginAutoNext();
  };

  const onArticleComplete = async (goNext: boolean) => {
    try {
      handleComplete?.();
    } finally {
      if (goNext) proceedNext();
    }
  };

  // fetch quiz/exam by *lesson id* when lesson is assessment
  const isAssessment =
    (currentLessonData?.content_type || "").toLowerCase() === "quiz" ||
    (currentLessonData?.content_type || "").toLowerCase() === "assessment" ||
    (currentLessonData?.content_type || "").toLowerCase() === "exam";

  const { data: examResp, isFetching: loadingExam } = useCustomQuery(
    isAssessment ? `${API_ENDPOINTS.exams}${currentLessonId}/` : "",
    ["exams", String(currentLessonId)],
    undefined,
    isAssessment && !!currentLessonId
  );

  const exam: Exam | null = useMemo(() => {
    const raw = examResp?.data ?? null;
    if (raw && typeof raw === "object") {
      return {
        id: raw.id,
        type: raw.type,
        title: raw.title ?? currentLessonData?.title ?? "",
        description: raw.description ?? currentLessonData?.description ?? "",
        lesson: currentLessonId,
        time_limit: raw.time_limit ?? 0,
        passing_score: raw.passing_score ?? 0,
        questions: Array.isArray(raw.questions) ? raw.questions : [],
      } as any;
    }
    return null;
  }, [examResp, currentLessonData, currentLessonId]);

  const renderAssessment = () => {
    if (!isAssessment) return null;

    if (loadingExam || !exam) {
      return (
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <div className="text-gray-600">{t("content.loadingQuiz")}</div>
        </div>
      );
    }

    return (
      <ExamSection
        exam={exam}
        onClose={() => {
          onAssessmentSubmit?.();
        }}
      />
    );
  };

  return (
    <div className="p-4">
      <div className="max-w-5xl mx-auto">
        <div className="relative">
          {(() => {
            if (isAssessment) return renderAssessment();

            if (currentLessonData?.content_type?.toLowerCase() === "article") {
              return (
                <div
                  className={`rounded-lg flex flex-col items-start p-8 max-h-[70vh] overflow-y-auto transition-colors duration-200 bg-white text-gray-900`}
                >
                  <div className="flex justify-between items-center mb-6">
                    <h1 className={`text-3xl font-bold text-gray-900`}>
                      {currentLessonData?.title}
                    </h1>
                  </div>

                  <div className="prose max-w-none">
                    <div
                      className="space-y-6"
                      dangerouslySetInnerHTML={{
                        __html: (currentLessonData as any)?.description_html,
                      }}
                    />

                    {currentLessonData?.description && (
                      <div
                        className={`mt-8 p-4 border-l-4 rounded bg-blue-50 border-blue-400 text-blue-800`}
                      >
                        <p>{currentLessonData?.description}</p>
                      </div>
                    )}
                  </div>
                  {currentUser.is_student && !currentLessonData?.completed && (
                    <button
                      onClick={() => onArticleComplete(true)}
                      className="inline-flex items-center px-4 mt-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 self-end"
                    >
                      {t("content.markComplete")}
                    </button>
                  )}
                </div>
              );
            }
            if (currentLessonData?.content_type?.toLowerCase() === "material") {
              return (
                <Material
                  currentLessonData={currentLessonData}
                  onMaterialComplete={onArticleComplete}
                />
              );
            }

            // video / default
            const rawUrl = (currentLessonData as any)?.url as
              | string
              | undefined;
            const safeUrl = isPlayableUrl(rawUrl) ? rawUrl! : "";
            const poster =
              (currentLessonData as any)?.poster ||
              (currentLessonData as any)?.thumbnail ||
              DEFAULT_POSTER;

            return (
              <>
                <VideoPlayer
                  key={currentLessonId}
                  watched={currentLessonData?.completed}
                  privacyEnhanced
                  src={safeUrl}
                  poster={poster}
                  title={currentLessonData?.title}
                  onComplete={onVideoComplete}
                />
                {!safeUrl && (
                  <div className="mt-2 text-xs text-amber-500">
                    {t("content.noVideo")}
                  </div>
                )}
              </>
            );
          })()}

          {showAutoNext &&
            currentLessonData?.content_type?.toLowerCase() === "video" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60">
                <button
                  onClick={proceedNext}
                  aria-label="Next lesson"
                  className="relative w-24 h-24"
                >
                  <svg
                    className="absolute inset-0 w-24 h-24"
                    viewBox="0 0 36 36"
                    fill="none"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      stroke="#9333ea"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray="100"
                      strokeDashoffset={animateRing ? 0 : 100}
                      style={{ transition: "stroke-dashoffset 5s linear" }}
                      transform="rotate(-90 18 18)"
                    />
                  </svg>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <ChevronRight className="w-9 h-9 text-white" />
                  </div>
                </button>
                <div className="mt-3 text-white font-semibold">
                  {t("content.next")}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
