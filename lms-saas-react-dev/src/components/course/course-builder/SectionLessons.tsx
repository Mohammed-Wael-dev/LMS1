// src/components/course/builder/SectionLessons.tsx
import {
  Award,
  BookCheck,
  Edit,
  FileText,
  GripVertical,
  HelpCircle,
  LinkIcon,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import toast from "react-hot-toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import LessonItem from "./LessonItem";
import { isContent, reindexOrders1Based } from "../../../utils/courseBuilder";
import { API_ENDPOINTS } from "../../../utils/constants";
import handleErrorAlerts from "../../../utils/showErrorMessages";
import { useCustomQuery } from "../../../hooks/useQuery";
import { useCustomUpdate } from "../../../hooks/useMutation";
import {
  deleteLessonApi,
  patchLessonApi,
  createLessonApi,
} from "../../../utils/lessonApi";
import { makeKeyedDebouncer } from "../../../utils/netCoalesce";
import LessonsSkeleton from "../../resource-stats/LessonsSkeleton";

/** Local debouncer for commit-on-drag-end */
const debounceCommit = makeKeyedDebouncer(450);

type ReadyApi = {
  createContentLesson: (
    type: "video" | "article" | "material"
  ) => Promise<void>;
  createAssessment: (type: "quiz" | "exam" | "assessment") => Promise<void>;
};

export default function SectionLessons({
  moduleId,
  setEditingLesson,
  setEditingArticle,
  setUploadingMaterial,
  setEditingAssessment,
  updateLessonLocal,
  onReady,
}: {
  moduleId: string;
  setEditingLesson: React.Dispatch<
    React.SetStateAction<{ moduleId: string; lessonId: string } | null>
  >;
  setEditingArticle: React.Dispatch<
    React.SetStateAction<{ moduleId: string; lessonId: string } | null>
  >;
  setUploadingMaterial: React.Dispatch<
    React.SetStateAction<{
      moduleId: string;
      lessonId: string;
    } | null>
  >;
  setEditingAssessment: React.Dispatch<
    React.SetStateAction<{
      id: string;
      moduleId: string;
      type: "quiz" | "exam" | "assessment";
    } | null>
  >;
  updateLessonLocal: (
    moduleId: string,
    lessonId: string,
    updates: Partial<Lesson>
  ) => void;
  onReady?: (api: ReadyApi) => void;
}) {
  const { t } = useTranslation("courseBuilder");
  const queryClient = useQueryClient();

  /** Fetch lessons for this section; cache key is ["lessons", moduleId] */
  const { data, isLoading } = useCustomQuery(
    `${API_ENDPOINTS.lessons}${moduleId}/`,
    ["lessons", moduleId],
    undefined,
    !!moduleId
  );

  // Trust DB order; do not client-sort
  const lessonsFromServer: Lesson[] = useMemo(() => {
    return data?.data ?? [];
  }, [data]);

  /** Local working copy to support DnD & inline edits before committing */
  const [localLessons, setLocalLessons] = useState<Lesson[]>(lessonsFromServer);

  /** DnD snapshot baseline per section, and last committed orders */
  const dragBaselineRef = useRef<Record<string, string[]>>({});
  const lastCommittedLessonOrderRef = useRef<Record<string, string[]>>({});

  /** last committed fields per lesson (for no-op guards on blur) */
  const lastCommittedLessonFieldsRef = useRef<
    Record<string, { title?: string; description?: string | null }>
  >({});

  useEffect(() => {
    setLocalLessons(lessonsFromServer);

    // remember current order
    lastCommittedLessonOrderRef.current[moduleId] = (
      lessonsFromServer || []
    ).map((l) => l.id);

    // seed last-committed fields snapshot (title/description for no-op checks)
    const fields: Record<
      string,
      { title?: string; description?: string | null }
    > = {};
    for (const l of lessonsFromServer || []) {
      fields[l.id] = {
        title: l.title,
        description: l.description ?? null,
      };
    }
    lastCommittedLessonFieldsRef.current = fields;
  }, [moduleId, lessonsFromServer]);

  const arraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((x, i) => x === b[i]);

  /** --- Reorder lessons: use your top-level POST hook --- */
  const { mutateAsync: reorderLessons } = useCustomUpdate(
    API_ENDPOINTS.reorderLessons
  );

  /** Move DnD item inside local list only */
  const moveLesson = (_moduleId: string, dragId: string, hoverId: string) => {
    setLocalLessons((prev) => {
      if (!prev?.length) return prev;

      // Record baseline once per drag gesture for this module
      if (!dragBaselineRef.current[_moduleId]) {
        dragBaselineRef.current[_moduleId] = prev.map((l) => l.id);
      }

      const next = [...prev];
      const d = next.findIndex((l) => l.id === dragId);
      const h = next.findIndex((l) => l.id === hoverId);
      if (d < 0 || h < 0 || d === h) return prev;

      const [dragged] = next.splice(d, 1);
      next.splice(h, 0, dragged);

      // Reindex for UI only (safe)
      return reindexOrders1Based(next);
    });
  };

  /** Commit only changed lesson orders (compare to baseline ids) */
  const commitLessonOrder = async (sectionId: string) => {
    return debounceCommit(sectionId, async () => {
      const baselineIds =
        dragBaselineRef.current[sectionId] ??
        lastCommittedLessonOrderRef.current[sectionId];

      const currentLessons = localLessons || [];
      const currentIds = currentLessons.map((l) => l.id);

      // Clear the live baseline after drag ends
      delete dragBaselineRef.current[sectionId];

      // If we have a baseline and order of IDs is identical, skip
      if (baselineIds && arraysEqual(baselineIds, currentIds)) return;

      // Build a map of baseline positions: lessonId -> oldOrder
      const baselinePos = new Map<string, number>();
      if (baselineIds) {
        baselineIds.forEach((id, idx) => baselinePos.set(id, idx + 1));
      }

      // Build payload based on difference between baseline position and new position
      const changes: Array<{ lesson_id: string; order: number }> =
        currentLessons
          .map((l, idx) => {
            const newOrder = idx + 1;
            const oldOrder = baselinePos.size
              ? baselinePos.get(l.id)
              : undefined;
            return {
              lesson_id: l.id,
              order: newOrder,
              _changed: oldOrder !== newOrder,
            };
          })
          .filter((x) => !baselinePos.size || x._changed)
          .map(({ lesson_id, order }) => ({ lesson_id, order }));

      if (!changes.length) return;

      try {
        await reorderLessons({ lessons: changes });
        lastCommittedLessonOrderRef.current[sectionId] = currentIds;
        toast.success(t("createSections.commitModulesOrderSuccess"));
      } catch (e: any) {
        toast.error(t("createSections.commitModulesOrderError"));
        handleErrorAlerts(e?.response?.data?.error);
      } finally {
        queryClient.invalidateQueries({ queryKey: ["lessons", sectionId] });
      }
    });
  };

  /** Inline title edit */
  const onTitleChange = (lessonId: string, newTitle: string) => {
    setLocalLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, title: newTitle } : l))
    );
    updateLessonLocal(moduleId, lessonId, { title: newTitle } as any);
  };

  const onTitleBlur = async (lessonId: string, newTitle: string) => {
    const prevTitle =
      lastCommittedLessonFieldsRef.current[lessonId]?.title ??
      lessonsFromServer.find((l) => l.id === lessonId)?.title ??
      "";

    if (String(prevTitle) === String(newTitle)) {
      // unchanged -> no-op
      return;
    }

    try {
      await patchLessonApi(lessonId, { title: newTitle });

      // update our last-committed snapshot so subsequent blurs are no-ops
      lastCommittedLessonFieldsRef.current[lessonId] = {
        ...(lastCommittedLessonFieldsRef.current[lessonId] || {}),
        title: newTitle,
        description:
          lastCommittedLessonFieldsRef.current[lessonId]?.description ?? null,
      };

      toast.success(t("createSections.saved"));
      queryClient.invalidateQueries({ queryKey: ["lessons", moduleId] });
    } catch {
      /* errors handled by wrapper; keep local text as-is */
    }
  };

  /** 🔥 NEW: Inline description edit */
  const onDescriptionChange = (lessonId: string, newDesc: string) => {
    setLocalLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, description: newDesc } : l))
    );
    updateLessonLocal(moduleId, lessonId, { description: newDesc } as any);
  };

  const onDescriptionBlur = async (lessonId: string, newDesc: string) => {
    const prevDesc =
      lastCommittedLessonFieldsRef.current[lessonId]?.description ??
      lessonsFromServer.find((l) => l.id === lessonId)?.description ??
      null;

    if (String(prevDesc ?? "") === String(newDesc ?? "")) {
      // unchanged -> no-op
      return;
    }

    try {
      await patchLessonApi(lessonId, { description: newDesc });

      // update our last-committed snapshot so subsequent blurs are no-ops
      lastCommittedLessonFieldsRef.current[lessonId] = {
        ...(lastCommittedLessonFieldsRef.current[lessonId] || {}),
        title:
          lastCommittedLessonFieldsRef.current[lessonId]?.title ??
          lessonsFromServer.find((l) => l.id === lessonId)?.title ??
          "",
        description: newDesc,
      };

      toast.success(t("createSections.saved"));
      queryClient.invalidateQueries({ queryKey: ["lessons", moduleId] });
    } catch {
      /* errors handled by wrapper; keep local desc as-is */
    }
  };

  /** Delete a lesson (trust DB for order compaction) */
  const deleteLesson = async (lessonId: string) => {
    // pure optimistic removal; do not reindex locally
    setLocalLessons((prev) => prev.filter((l) => l.id !== lessonId));
    try {
      await deleteLessonApi(lessonId);
      toast.success(t("createSections.lessonRemoved"));
    } catch (e) {
      toast.error(t("createSections.failedRemoveLesson"));
      handleErrorAlerts((e as any)?.response?.data?.error);
    } finally {
      await queryClient.invalidateQueries({ queryKey: ["lessons", moduleId] });
    }
  };

  const deleteExamOrQuiz = async (lessonId: string) => {
    try {
      await deleteLesson(lessonId);
      toast.success(t("createSections.assessmentDeleted"));
    } catch (e: any) {
      handleErrorAlerts(e?.response?.data?.error);
      queryClient.invalidateQueries({ queryKey: ["lessons", moduleId] });
    }
  };

  /** Creation helpers (exposed to parent via onReady) */
  const createContentLesson = async (
    type: "video" | "article" | "material"
  ) => {
    const optimistic: Lesson = {
      id: `tmp-${Date.now()}`,
      title:
        type === "video"
          ? t("createSections.newVideoTitle")
          : type === "article"
          ? t("createSections.newArticleTitle")
          : t("createSections.newMaterialTitle"),
      description: "",
      description_html: type === "article" ? "<p></p>" : null,
      content_type: type,
      free_preview: false,
      order: (localLessons?.length ?? 0) + 1,
      url: "",
      duration_hours: null,
      file: null as any,
      completed: false,
      section: moduleId,
    };

    setLocalLessons((prev) => [...prev, optimistic]);

    try {
      const createdRes = await createLessonApi({
        section_id: moduleId,
        title: optimistic.title,
        description: "",
        description_html: optimistic.description_html,
        content_type: optimistic.content_type!,
        order: optimistic.order,
        url: optimistic.url,
        duration_hours: optimistic.duration_hours,
        free_preview: optimistic.free_preview,
      });
      const created: Lesson =
        createdRes?.data?.data ?? createdRes?.data ?? createdRes;
      setLocalLessons((prev) =>
        prev.map((l) => (l.id === optimistic.id ? (created as Lesson) : l))
      );

      // seed committed fields for the new lesson
      lastCommittedLessonFieldsRef.current[created.id] = {
        title: created.title,
        description: created.description ?? null,
      };

      await queryClient.invalidateQueries({ queryKey: ["lessons", moduleId] });

      if (type === "video")
        setEditingLesson({ moduleId, lessonId: created.id });
      if (type === "article")
        setEditingArticle({ moduleId, lessonId: created.id });
      if (type === "material")
        setUploadingMaterial({ moduleId, lessonId: created.id });
    } catch (e: any) {
      setLocalLessons((prev) => prev.filter((l) => l.id !== optimistic.id));
      handleErrorAlerts(e?.response?.data?.error);
    }
  };

  const createAssessment = async (type: "quiz" | "exam" | "assessment") => {
    const optimistic: Lesson = {
      id: `tmp-${Date.now()}`,
      title: type === "quiz" ? "Quiz" : type === "exam" ? "Exam" : "Assessment",
      description: "",
      description_html: null,
      content_type: type,
      free_preview: false,
      order: (localLessons?.length ?? 0) + 1,
      url: "",
      duration_hours: null,
      file: null as any,
      completed: false,
      section: moduleId,
    };

    setLocalLessons((prev) =>
      reindexOrders1Based([...(prev || []), optimistic])
    );

    try {
      const createdRes = await createLessonApi({
        section_id: moduleId,
        title: optimistic.title,
        description: "",
        description_html: null,
        content_type: optimistic.content_type!,
        order: optimistic.order,
        url: null,
        duration_hours: null,
        free_preview: false,
      });
      const created: Lesson =
        createdRes?.data?.data ?? createdRes?.data ?? createdRes;

      setLocalLessons((prev) =>
        prev.map((l) => (l.id === optimistic.id ? (created as Lesson) : l))
      );

      // seed committed fields for the new assessment
      lastCommittedLessonFieldsRef.current[created.id] = {
        title: created.title,
        description: created.description ?? null,
      };

      await queryClient.invalidateQueries({ queryKey: ["lessons", moduleId] });

      toast.success(
        `${
          type === "quiz"
            ? t("createSections.quiz")
            : type === "exam"
            ? t("createSections.exam")
            : t("createSections.assessment")
        } ${t("createSections.created")}`
      );
      setEditingAssessment({ id: created.id, moduleId, type });
    } catch (e: any) {
      toast.error(t("createSections.failedUpdateSomeAttachments"));
      setLocalLessons((prev) => prev.filter((l) => l.id !== optimistic.id));
      handleErrorAlerts(e?.response?.data?.error);
    }
  };

  /** Expose creation API to parent (for the module “+” menu) */
  useEffect(() => {
    onReady?.({
      createContentLesson,
      createAssessment,
    });
    // re-expose if moduleId changes
  }, [onReady, moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LessonsSkeleton />;
  if (lessonsFromServer.length === 0) return null;

  return (
    <div className="p-4 space-y-2">
      {localLessons.map((lesson, lIndex) => {
        const isContentLesson = isContent((lesson as any).content_type);
        const videoUrlPreview = (lesson as any)?.url || "";

        return (
          <LessonItem
            key={lesson.id}
            moduleId={moduleId}
            lesson={lesson}
            index={lIndex}
            moveLesson={moveLesson}
            onDragEnd={() => commitLessonOrder(moduleId)}
            canDrag={true}
          >
            <div className="flex sm:items-center items-start sm:flex-row flex-col sm:gap-0 gap-4 justify-between sm:p-3 p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3 w-full">
                <div>
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                </div>
                <div>
                  {isContentLesson ? (
                    (lesson as any).content_type === "video" ? (
                      <Video className="w-4 h-4" />
                    ) : (lesson as any).content_type === "article" ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )
                  ) : (lesson as any).content_type === "quiz" ? (
                    <HelpCircle className="w-4 h-4" />
                  ) : (lesson as any).content_type === "exam" ? (
                    <Award className="w-4 h-4" />
                  ) : (
                    <BookCheck className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1">
                  {/* Title */}
                  <input
                    type="text"
                    value={(lesson as any).title}
                    onChange={(e) => onTitleChange(lesson.id, e.target.value)}
                    onBlur={(e) => onTitleBlur(lesson.id, e.target.value)}
                    className="font-medium w-11/12 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                  />

                  {/* Meta row: URL (for video) */}
                  <div className="text-xs text-gray-500 flex sm:items-center items-start sm:flex-row flex-col gap-2 mt-1">
                    <span className="inline-flex items-center flex-wrap">
                      {isContentLesson &&
                      (lesson as any).content_type === "video" ? (
                        <>
                          <LinkIcon className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                          {videoUrlPreview
                            ? String(videoUrlPreview)
                            : t("createSections.noURL")}
                        </>
                      ) : null}
                    </span>
                  </div>

                  {/* 🔥 NEW: Description (inline, like module) */}
                  <input
                    type="text"
                    value={(lesson as any).description ?? ""}
                    onChange={(e) =>
                      onDescriptionChange(lesson.id, e.target.value)
                    }
                    onBlur={(e) => onDescriptionBlur(lesson.id, e.target.value)}
                    placeholder={t("createSections.lessonDescPlaceholder")}
                    className="text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-11/12 mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 sm:self-center self-end">
                {isContentLesson ? (
                  <>
                    <button
                      type="button"
                      onClick={() => deleteLesson(lesson.id)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                      title={t("createSections.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {(lesson as any).content_type === "video" && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingLesson({ moduleId, lessonId: lesson.id })
                        }
                        className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                        title={t("createSections.editVideo")}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {(lesson as any).content_type === "article" && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingArticle({ moduleId, lessonId: lesson.id })
                        }
                        className="p-1 text-green-400 hover:text-green-600 transition-colors"
                        title={t("createSections.editArticle")}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {(lesson as any).content_type === "material" && (
                      <button
                        type="button"
                        onClick={() =>
                          setUploadingMaterial({
                            moduleId,
                            lessonId: lesson.id,
                          })
                        }
                        className="p-1 text-orange-400 hover:text-orange-600 transition-colors"
                        title={t("createSections.edit")}
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingAssessment({
                          id: lesson.id,
                          moduleId,
                          type: (lesson as any).content_type as
                            | "quiz"
                            | "exam"
                            | "assessment",
                        })
                      }
                      className="p-1 text-purple-400 hover:text-purple-600 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteExamOrQuiz(lesson.id)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </LessonItem>
        );
      })}
    </div>
  );
}
