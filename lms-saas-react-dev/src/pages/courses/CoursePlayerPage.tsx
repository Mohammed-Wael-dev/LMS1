import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Users,
  X,
  ListVideo,
  Clock,
  ChevronRight,
} from "lucide-react";
import CourseContent, {
  findNextLessonId,
} from "../../components/course/CourseContent";
import { useCustomQuery } from "../../hooks/useQuery";
import { ACCESS_TOKEN_KEY, API_ENDPOINTS } from "../../utils/constants";
import { useLocation, useNavigate, useParams } from "react-router";
import NotesSection from "../../components/course/course-player-sections/NotesSection";
import QASection from "../../components/course/course-player-sections/QASection";
import LessonContentPlayer from "../../components/course/course-player-sections/LessonContentPlayer";
import { formatDuration } from "../../utils/formatDuration";
import GroupsSection from "../../components/course/course-player-sections/GroupsSection";
import ChatModal from "../../components/course/course-player-sections/ChatModal";
import { useCustomPost } from "../../hooks/useMutation";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { readUserFromStorage } from "../../services/auth";
import { getCookie } from "../../services/cookies";
import { useTranslation } from "react-i18next";
import FeatureGate from "../../components/settings/FeatureGate";
// import { useStudentPresence } from "../../hooks/useStudentPresence";

export default function CoursePlayerPage() {
  const { courseId } = useParams();
  // useStudentPresence(courseId);
  const currentUser: User = readUserFromStorage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const search = location.search;
  const { t, i18n } = useTranslation("coursePlayer");

  const lessonFromQS = useMemo(
    () => new URLSearchParams(search).get("lesson") ?? "",
    [search]
  );

  const [currentLessonId, setCurrentLessonId] = useState<string>(lessonFromQS);
  const [currentLesson, setCurrentLesson] = useState<Lesson | undefined>(
    undefined
  );

  // side panels
  const [showNotes, setShowNotes] = useState(true);
  const [showQA, setShowQA] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [notes, setNotes] = useState("");
  const [groupsCount, setGroupsCount] = useState<number>();
  const [noteTitle, setNoteTitle] = useState("");
  const [notesCount, setNotesCount] = useState<number>(0);

  // mobile drawer
  const [contentOpen, setContentOpen] = useState(false);

  // course + modules
  const { data: courseRes } = useCustomQuery(
    `${API_ENDPOINTS.courses}${courseId}/`,
    ["course", courseId],
    undefined,
    !!courseId
  );

  const isStudent = !!(currentUser && currentUser.is_student);
  const token = getCookie(ACCESS_TOKEN_KEY);

  const { data: modulesData } = useCustomQuery(
    `${API_ENDPOINTS.modules}?course=${courseId}&include_lessons=true`,
    ["modules", courseId],
    {
      headers: {
        ...(isStudent && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
    !!courseId
  );

  const { data: enrollmentData } = useCustomQuery(
    `${API_ENDPOINTS.studentEnrollements}${courseId}/`,
    ["student-enrollements", courseId],
    undefined,
    !!courseId
  );

  // Questions for Q&A tab
  const { data: questionsData, isLoading: isQuestionsLoading } = useCustomQuery(
    `${API_ENDPOINTS.questions}?lesson=${currentLessonId}`,
    ["questions", currentLessonId],
    undefined,
    !!currentLessonId
  );

  const questions: Question[] = questionsData?.data ?? [];
  const courseData: Course = courseRes?.data;

  const modules: Module[] = useMemo(
    () => modulesData?.data ?? [],
    [modulesData]
  );

  const enrollStats: EnrolledCourseStats[] = useMemo(
    () => enrollmentData?.data ?? [],
    [enrollmentData]
  );

  const currentEnrollStat: EnrolledCourseStats | null = useMemo(() => {
    return enrollStats?.find((s) => String(s.id) === String(courseId)) ?? null;
  }, [courseId, enrollStats]);

  // Initial lesson selection: prefer QS, else first
  useEffect(() => {
    if (!modules?.length) return;

    const allLessons = modules.flatMap((m) => m?.lessons ?? []);

    if (lessonFromQS) {
      const found = allLessons.find(
        (l) => String(l?.id) === String(lessonFromQS)
      );
      if (found) {
        setCurrentLessonId(String(found.id));
        setCurrentLesson(found);
        return;
      }
    }

    const first = allLessons[0];
    if (!first) return;
    setCurrentLessonId((prev) => (prev ? prev : String(first.id)));
    setCurrentLesson((prev) => prev ?? first);
  }, [modules, lessonFromQS]);

  // keep currentLesson synced
  useEffect(() => {
    if (!currentLessonId || !modules?.length) return;
    const allLessons = modules.flatMap((m) => m?.lessons ?? []);
    const selected = allLessons.find(
      (l) => String(l?.id) === String(currentLessonId)
    );
    if (selected) setCurrentLesson(selected);
  }, [currentLessonId, modules]);

  const handleLessonSelect = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    setContentOpen(false);

    const params = new URLSearchParams(search);
    params.set("lesson", String(lessonId));
    navigate(
      {
        pathname: `/catalog/${courseId}/player`,
        search: `?${params.toString()}`,
      },
      { replace: true }
    );

    const allLessons = modules?.flatMap((m) => m?.lessons ?? []);
    const selectedLesson = allLessons?.find(
      (l) => String(l?.id) === String(lessonId)
    );
    setCurrentLesson(selectedLesson as Lesson);
  };

  const { mutateAsync: createProgress } = useCustomPost(
    API_ENDPOINTS.lessonProgress,
    ["course", courseData?.id]
  );

  const handleAssessmentSubmit = async () => {
    // advance to next lesson
    const nextId = findNextLessonId(modules, currentLessonId);
    const newLessonId = nextId ?? currentLessonId;

    await handleComplete();

    setCurrentLessonId(String(newLessonId));

    const params = new URLSearchParams(search);
    params.set("lesson", String(newLessonId));
    navigate(
      {
        pathname: `/catalog/${courseId}/player`,
        search: `?${params.toString()}`,
      },
      { replace: true }
    );
  };

  const handleComplete = async () => {
    try {
      if (currentUser?.is_student) {
        if (!currentLesson?.completed) {
          const res = await createProgress({
            lesson: currentLessonId,
            watched: true,
          });

          queryClient.invalidateQueries({
            queryKey: ["student-enrollements", courseId],
          });

          queryClient.invalidateQueries({
            queryKey: ["modules", courseId],
          });
          queryClient.invalidateQueries({ queryKey: ["course", courseId] });

          if (res?.status) toast.success(t("handleComplete.success"));
        } else {
          console.log("Lesson already completed!");
        }
      } else {
        console.log("User is instructor!");
      }
    } catch (error: any) {
      toast.error(error?.message ?? t("handleComplete.error"));
    }
  };

  // Groups/chat UI stubs
  const [showChatModal, setShowChatModal] = useState(false);
  const [groupMessage, setGroupMessage] = useState("");
  const [activeChatGroup, setActiveChatGroup] = useState<any>(null);
  const handleShowChat = (group: any) => {
    setActiveChatGroup(group);
    setShowChatModal(true);
  };
  const handleCloseChatModal = () => {
    setShowChatModal(false);
    setActiveChatGroup(null);
    setGroupMessage("");
  };
  const handleSendGroupMessage = (groupId: string) => {
    if (!groupMessage.trim()) return;
    setGroupMessage("");
    console.log(groupId);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between flex-row">
          <div className="flex mb-2 md:mb-0 items-center gap-4 md:justify-start justify-between md:w-fit w-full">
            <button
              onClick={() => navigate(`/catalog/${courseId}`)}
              className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
            >
              {i18n.language === "ar" ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
              <span className="ltr:ml-2 rtl:mr-2 font-medium lg:inline-block hidden">
                {t("backBtn")}
              </span>
            </button>
            <div className="flex-1">
              <h1 className="font-semibold whitespace-normal text-lg truncate max-w-md">
                {courseRes?.data?.title}
              </h1>
              <div className="flex items-center text-sm text-gray-400">
                <span>
                  {t("progress")}:{" "}
                  {currentEnrollStat?.progress?.toFixed(0) ?? 0}%
                </span>
                <div className="w-20 h-2 bg-gray-700 rounded-full ltr:ml-2 rtl:mr-2">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${currentEnrollStat?.progress?.toFixed(0) ?? 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end w-fit">
            <button
              onClick={() => setContentOpen(true)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors md:hidden"
              aria-label="Open course content"
              title={t("courseContent")}
            >
              <ListVideo className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="md:flex min-h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <LessonContentPlayer
            modules={modules}
            currentLessonId={currentLessonId}
            handleComplete={handleComplete}
            onLessonSelect={handleLessonSelect}
            onAssessmentSubmit={handleAssessmentSubmit}
          />

          {/* Lesson Info */}
          {currentLesson && (
            <div className="bg-gray-800 p-6 border-b border-gray-700">
              <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-start md:justify-between gap-2 md:gap-4 mb-4">
                  <h2 className="text-2xl font-bold">{currentLesson?.title}</h2>
                  <span className="text-gray-400 flex items-center justify-start">
                    {currentLesson?.duration_hours &&
                      currentLesson?.duration_hours > 0 && (
                        <Clock className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                      )}
                    {formatDuration(
                      (currentLesson as any)?.duration_hours,
                      i18n.language
                    )}
                  </span>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  {currentLesson?.description}
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-5xl mx-auto px-6">
              <div className="grid grid-cols-3 items-center justify-items-center whitespace-nowrap">
                <FeatureGate
                  flag="is_lesson_notes_enabled"
                  fallback={null}
                  loadingFallback={null}
                >
                  <button
                    onClick={() => {
                      setShowNotes(true);
                      setShowQA(false);
                      setShowGroups(false);
                    }}
                    className={`flex sm:items-start sm:justify-start gap-1 sm:flex-row items-center flex-col py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                      showNotes
                        ? "border-purple-500 text-purple-400"
                        : "border-transparent text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <span>📝</span>
                    <span>
                      {t("lessonNotes")} ({notesCount})
                    </span>
                  </button>
                </FeatureGate>
                <FeatureGate
                  flag="is_Q_and_A_enabled"
                  fallback={null}
                  loadingFallback={null}
                >
                  <button
                    onClick={() => {
                      setShowQA(true);
                      setShowNotes(false);
                      setShowGroups(false);
                    }}
                    className={`flex sm:items-start sm:justify-start gap-1 sm:flex-row items-center flex-col py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                      showQA
                        ? "border-purple-500 text-purple-400"
                        : "border-transparent text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <span>💬</span>
                    <span>
                      {t("QA")} ({(questions ?? []).length})
                    </span>
                  </button>
                </FeatureGate>
                <FeatureGate
                  flag="is_chat_group_enabled"
                  fallback={null}
                  loadingFallback={null}
                >
                  <button
                    onClick={() => {
                      setShowGroups(true);
                      setShowNotes(false);
                      setShowQA(false);
                    }}
                    className={`flex items-center justify-start sm:flex-row flex-col gap-1 py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                      showGroups
                        ? "border-purple-500 text-purple-400"
                        : "border-transparent text-gray-400 hover:text-gray-300"
                    }`}
                  >
                    <Users size={16} />
                    <span>{t("groups")} ({groupsCount ?? 0})</span>
                  </button>
                </FeatureGate>
              </div>
            </div>
          </div>

          {/* Notes */}
          {showNotes && (
            <FeatureGate
              flag="is_lesson_notes_enabled"
              fallback={null}
              loadingFallback={null}
            >
              <NotesSection
                currentLessonId={currentLessonId}
                notes={notes}
                setNotes={setNotes}
                title={noteTitle}
                setTitle={setNoteTitle}
                setNotesCount={setNotesCount}
              />
            </FeatureGate>
          )}

          {/* Q&A */}
          {showQA && (
            <FeatureGate
              flag="is_Q_and_A_enabled"
              fallback={null}
              loadingFallback={null}
            >
              <QASection
                lesson={currentLessonId}
                questions={questions}
                isLoading={isQuestionsLoading}
              />
            </FeatureGate>
          )}

          {/* Groups */}
          {showGroups && (
            <FeatureGate
              flag="is_chat_group_enabled"
              fallback={null}
              loadingFallback={null}
            >
              <GroupsSection
                setGroupsCount={setGroupsCount}
                handleShowChat={handleShowChat}
              />
            </FeatureGate>
          )}
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden md:block md:w-80 md:shrink-0">
          <div className="sticky top-0 h-screen w-80 bg-white text-gray-900 border-l border-gray-200">
            <div className="h-full overflow-y-auto">
              <CourseContent
                modules={modules}
                currentLessonId={currentLessonId}
                onLessonSelect={handleLessonSelect}
                is_sequential={courseData?.is_sequential}
                isEnrolled={true}
              />
            </div>
          </div>
        </aside>

        {/* Mobile Drawer */}
        <div
          className={`md:hidden fixed inset-0 z-40 ${
            contentOpen ? "" : "pointer-events-none"
          }`}
          aria-hidden={!contentOpen}
        >
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity ${
              contentOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setContentOpen(false)}
          />
          <div
            className={`absolute right-0 top-0 h-full w-64 bg-white text-gray-900 border-l border-gray-200
              transform transition-transform ${
                contentOpen ? "translate-x-0" : "translate-x-full"
              } flex flex-col min-h-0`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-900">
                {t("courseContent")}
              </span>
              <button
                onClick={() => setContentOpen(false)}
                className="p-2 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="h-[calc(100%-48px)] overflow-y-auto">
              <CourseContent
                modules={modules}
                currentLessonId={currentLessonId}
                onLessonSelect={handleLessonSelect}
                is_sequential={courseData?.is_sequential}
                isEnrolled={true}
              />
            </div>
          </div>
        </div>
      </div>

      {showChatModal && activeChatGroup && (
        <FeatureGate
          flag="is_chat_group_enabled"
          fallback={null}
          loadingFallback={null}
        >
          <ChatModal
            activeChatGroup={activeChatGroup}
            groupMessage={groupMessage}
            handleCloseChatModal={handleCloseChatModal}
            handleSendGroupMessage={handleSendGroupMessage}
            setGroupMessage={setGroupMessage}
          />
        </FeatureGate>
      )}
    </div>
  );
}
