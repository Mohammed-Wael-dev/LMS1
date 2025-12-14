// src/components/course/builder/CreateSectionsForm.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BookCheck,
  FileText,
  GripVertical,
  HelpCircle,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useCustomQuery } from "../../../hooks/useQuery";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS } from "../../../utils/constants";
import handleErrorAlerts from "../../../utils/showErrorMessages";
import toast from "react-hot-toast";

import EditLesson from "./EditLesson";
import EditArticle from "./EditArticle";
import UploadingMaterial from "./UploadingMaterial";

import QuizBuilder, { AssessmentDraft } from "../../quizzes/QuizBuilder";
import QuizPreview from "../../quizzes/QuizPreview";
import { AxiosResponse } from "axios";

import ModuleItem from "./ModuleItem";
import Modal from "../../reusable-components/Modal";
import { useExamsByLesson } from "../../../hooks/useExamsByLesson";
import { invalidateLessonExams, qk } from "../../../utils/builderQueries";
import { useTranslation } from "react-i18next";

import { patchLessonApi } from "../../../utils/lessonApi";
import { patch } from "../../../api";
import SectionLessons from "./SectionLessons";

// ---- Local shapes for caches (allow nulls where server may return null) ----
type LessonSnapshot = {
  title?: string;
  description?: string | null;
  description_html?: string | null;
  url?: string | null;
  duration_hours?: number | null;
};

export default function CreateSectionsForm({ courseId }: { courseId: string }) {
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Track last committed values to avoid no-op PATCH on blur (modules only)
  const lastSavedModuleRef = useRef<
    Record<string, { title: string; description: string }>
  >({});

  // Server-saved snapshot for lessons (used ONLY for no-op comparison)
  const lastSavedLessonRef = useRef<Record<string, LessonSnapshot>>({});

  // Local drafts (optimistic UI; never used for no-op compare)
  const lessonDraftRef = useRef<Record<string, Partial<Lesson>>>({});

  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setMenuRef =
    (id: string) =>
    (el: HTMLDivElement | null): void => {
      menuRefs.current[id] = el;
    };

  const { t } = useTranslation("courseBuilder");

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!openMenuFor) return;
      const container = menuRefs.current[openMenuFor];
      if (!container) return;
      if (!container.contains(e.target as Node)) setOpenMenuFor(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [openMenuFor]);

  // Fetch sections (WITHOUT lessons)
  const { data: modulesData, isLoading } = useCustomQuery(
    `${API_ENDPOINTS.modules}?course=${courseId}&include_lessons=false`,
    qk.modules(courseId),
    undefined,
    !!courseId
  );
  const serverModules: Module[] = useMemo(
    () => modulesData?.data ?? [],
    [modulesData]
  );

  // Local editable state for modules ONLY
  const [modules, setModules] = useState<Module[]>(serverModules);

  // Per-module API coming from SectionLessons (so the “+” menu can create lessons)
  const sectionApisRef = useRef<
    Record<string, { createContentLesson: any; createAssessment: any }>
  >({});

  // Editing states
  const [editingLesson, setEditingLesson] = useState<{
    moduleId: string;
    lessonId: string;
  } | null>(null);
  const [editingArticle, setEditingArticle] = useState<{
    moduleId: string;
    lessonId: string;
  } | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState<{
    moduleId: string;
    lessonId: string;
  } | null>(null);

  // Assessment editing / preview
  const [editingAssessment, setEditingAssessment] = useState<{
    id: string; // lessonId
    moduleId: string;
    type: "quiz" | "exam" | "assessment";
  } | null>(null);
  const [previewDraft, setPreviewDraft] = useState<AssessmentDraft | null>(
    null
  );

  // Seed local modules snapshot when server changes
  useEffect(() => {
    setModules(serverModules);

    // Seed no-op baseline for module fields
    const snapModules: Record<string, { title: string; description: string }> =
      {};
    for (const m of serverModules || []) {
      snapModules[m.id] = {
        title: m.title ?? "",
        description: m.description ?? "",
      };
    }
    lastSavedModuleRef.current = snapModules;
  }, [serverModules]);

  const { mutateAsync: patchModule } = useMutation<
    AxiosResponse<any>,
    any,
    any
  >({
    mutationFn: async ({ id, payload }: any) => {
      return patch(`${API_ENDPOINTS.updateSection}${id}/`, payload);
    },
    onError: (e) => {
      const error = e.response?.data?.error;
      handleErrorAlerts(error);
    },
  });

  const { mutateAsync: removeSection } = useMutation<
    AxiosResponse<any>,
    any,
    { id: string }
  >({
    mutationFn: async ({ id }) => {
      const { remove } = await import("../../../api");
      return remove(`${API_ENDPOINTS.deleteSection}${id}/`);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.modules(courseId) }),
    onError: (e) => handleErrorAlerts(e.response?.data?.error),
  });

  // No-op safe PATCH for module fields
  const patchModuleField = async (
    id: string,
    field: "title" | "description",
    value: string
  ) => {
    const last = lastSavedModuleRef.current[id]?.[field] ?? "";
    if (String(last) === String(value)) return; // no-op protection

    await patchModule({ id, payload: { [field]: value } });
    toast.success(t("createSections.saved"));

    lastSavedModuleRef.current[id] = {
      title:
        field === "title" ? value : lastSavedModuleRef.current[id]?.title ?? "",
      description:
        field === "description"
          ? value
          : lastSavedModuleRef.current[id]?.description ?? "",
    };

    queryClient.invalidateQueries({ queryKey: qk.modules(courseId) });
  };

  // Local draft writer (for optimistic UI only; never affects no-op checks)
  const updateLessonLocal = (
    _moduleId: string,
    lessonId: string,
    updates: Partial<Lesson>
  ) => {
    const prev = lessonDraftRef.current[lessonId] || {};
    lessonDraftRef.current[lessonId] = { ...prev, ...updates };
  };

  // Add a new section
  const { mutateAsync: createSection } = useMutation<
    AxiosResponse<any>,
    any,
    any
  >({
    mutationFn: async (body) => {
      const { post } = await import("../../../api");
      return post(API_ENDPOINTS.createSection, body);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.modules(courseId) }),
    onError: (e) => handleErrorAlerts(e.response?.data?.error),
  });

  const addModule = async () => {
    try {
      const body = {
        course: courseId,
        title: t("createSections.newModuleTitle", {
          l: (modules?.length ?? 0) + 1,
        }),
        description: "",
        order: (modules?.length ?? 0) + 1,
      };
      await createSection(body);
      toast.success(t("createSections.addModuleSuccess"));
    } catch (error: any) {
      handleErrorAlerts(error?.response?.data?.error);
    }
  };

  // Modules DnD
  const moveModule = (dragId: string, hoverId: string) => {
    setModules((prev) => {
      const d = prev.findIndex((m) => m.id === dragId);
      const h = prev.findIndex((m) => m.id === hoverId);
      if (d < 0 || h < 0 || d === h) return prev;
      const next = [...prev];
      const [dragged] = next.splice(d, 1);
      next.splice(h, 0, dragged);
      return next;
    });
  };

  // Reorder modules = normal PATCH per changed row
  const commitModulesOrder = async () => {
    const ops = modules
      .map((m, idx) => {
        if (m.order === idx + 1) return null;
        return patchModule({
          id: m.id,
          payload: {
            order: idx + 1,
          },
        });
      })
      .filter(Boolean) as Promise<any>[];
    if (!ops.length) return;
    try {
      await Promise.all(ops);
      toast.success(t("createSections.commitModulesOrderSuccess"));
    } catch {
      toast.error(t("createSections.commitModulesOrderError"));
    } finally {
      await queryClient.invalidateQueries({ queryKey: qk.modules(courseId) });
    }
  };

  const deleteModule = async (id: string) => {
    try {
      await removeSection({ id });
      toast.success(t("createSections.moduleDeleted"));
    } catch (e: any) {
      handleErrorAlerts(e?.response?.data?.error);
    }
  };

  // Exams by LESSON id for the quiz/exam builder (structure of result unchanged)
  const { data: examResp } = useExamsByLesson(
    editingAssessment?.id ?? undefined
  );
  const assessmentDetail = useMemo(() => {
    const obj = examResp?.data ?? examResp ?? null;
    return obj && typeof obj === "object" ? obj : null;
  }, [examResp]);

  // No-op protected lesson patch helper (returns whether something changed)
  const persistLessonField = async (
    lessonId: string,
    payload: Partial<Lesson>
  ): Promise<boolean> => {
    const snap = lastSavedLessonRef.current[lessonId] || {};
    let changed = false;

    for (const k of Object.keys(payload) as (keyof Lesson)[]) {
      if ((snap as any)[k] !== (payload as any)[k]) {
        changed = true;
      }
    }
    if (!changed) return false; // no-op, skip network

    await patchLessonApi(lessonId, payload);

    // Commit new "saved" baseline
    lastSavedLessonRef.current[lessonId] = {
      ...snap,
      ...(payload as any),
    };

    // Align local drafts too
    lessonDraftRef.current[lessonId] = {
      ...(lessonDraftRef.current[lessonId] || {}),
      ...(payload as any),
    };

    return true;
  };

  // ----- Assessment modal content: fetch the lesson directly (no modules coupling)
  function AssessmentModalContent({
    lessonId,
    moduleId,
    type,
    initialQuizFromServer,
  }: {
    lessonId: string;
    moduleId: string;
    type: "quiz" | "exam" | "assessment";
    initialQuizFromServer: any;
  }) {
    const { data } = useCustomQuery(
      `${API_ENDPOINTS.lesson}${lessonId}/`,
      ["lesson", lessonId],
      undefined,
      !!lessonId
    );
    const lesson: Lesson | undefined = useMemo(
      () => (data?.data ? (data.data as Lesson) : (data as any)),
      [data]
    );

    // seed both caches when the modal opens (server is source of truth)
    useEffect(() => {
      if (!lesson) return;

      const seeded: LessonSnapshot = {
        title: lesson.title ?? "",
        description: lesson.description ?? "",
        description_html: lesson.description_html ?? null,
        url: lesson.url ?? null,
        duration_hours:
          typeof lesson.duration_hours === "number"
            ? lesson.duration_hours
            : null,
      };

      // Saved snapshot for no-op checks
      lastSavedLessonRef.current[lessonId] = seeded;

      // Drafts start equal to server data
      lessonDraftRef.current[lessonId] = seeded;
    }, [lessonId, lesson]);

    return (
      <QuizBuilder
        initialQuiz={initialQuizFromServer ?? { type }}
        lessonTitle={lesson?.title ?? ""}
        lessonDescription={lesson?.description ?? ""}
        onLessonTitleChange={(v) =>
          updateLessonLocal(moduleId, lessonId, { title: v } as any)
        }
        onLessonDescriptionChange={(v) =>
          updateLessonLocal(moduleId, lessonId, { description: v } as any)
        }
        onLessonTitleBlur={async (v) => {
          const didChange = await persistLessonField(lessonId, { title: v });
          if (didChange) {
            queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
            queryClient.invalidateQueries({
              queryKey: qk.lessonsBySection(moduleId),
            });
          }
        }}
        onLessonDescriptionBlur={async (v) => {
          const didChange = await persistLessonField(lessonId, {
            description: v,
          });
          if (didChange) {
            queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
            queryClient.invalidateQueries({
              queryKey: qk.lessonsBySection(moduleId),
            });
          }
        }}
        onSave={async (draft) => {
          try {
            const payload = {
              type,
              time_limit: draft.time_limit,
              passing_score: draft.passing_score,
              questions: draft.questions,
            };
            const { patch } = await import("../../../api");
            await patch(`${API_ENDPOINTS.updateExam}${lessonId}/`, payload);

            invalidateLessonExams(queryClient, lessonId);
            toast.success(t("createSections.saved"));

            await queryClient.invalidateQueries({
              queryKey: ["lessons", moduleId],
            });
          } catch {
            toast.error(t("createSections.failedToSave"));
          }
        }}
        onPreview={(draft) => setPreviewDraft(draft)}
        onClose={() => setEditingAssessment(null)}
      />
    );
  }

  return (
    <div className="sm:space-y-6 space-y-3">
      <div className="bg-white rounded-xl shadow-sm sm:p-8 p-2">
        <div className="flex sm:items-center items-start sm:flex-row flex-col gap-4 justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {t("createSections.curriculum")}
          </h2>
          <button
            type="button"
            onClick={addModule}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
            {t("createSections.addModule")}
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            {t("createSections.loading")}
          </div>
        ) : modules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">{t("createSections.title")}</p>
            <button
              type="button"
              onClick={addModule}
              className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              {t("createSections.addYourFirstModule")}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {modules.map((module, mIndex) => (
              <ModuleItem
                key={module.id}
                module={{ ...module, order: mIndex + 1 }}
                index={mIndex}
                moveModule={moveModule}
                onDragEnd={commitModulesOrder}
              >
                <div className="border border-gray-200 rounded-lg overflow-visible">
                  <div className="sm:p-4 p-2 bg-gray-50 border-b border-gray-200 relative">
                    <div className="flex sm:items-center items-start sm:flex-row flex-col gap-4 justify-between">
                      <div className="flex items-center gap-3 w-full">
                        <div>
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                        </div>
                        <div className="flex-1 flex flex-col">
                          <input
                            type="text"
                            value={module.title ?? ""}
                            onChange={(e) =>
                              setModules((prev) =>
                                prev.map((m) =>
                                  m.id === module.id
                                    ? { ...m, title: e.target.value }
                                    : m
                                )
                              )
                            }
                            onBlur={(e) =>
                              patchModuleField(
                                module.id,
                                "title",
                                e.target.value
                              ).catch(() => {})
                            }
                            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                          />
                          <input
                            type="text"
                            value={module.description ?? ""}
                            onChange={(e) =>
                              setModules((prev) =>
                                prev.map((m) =>
                                  m.id === module.id
                                    ? { ...m, description: e.target.value }
                                    : m
                                )
                              )
                            }
                            onBlur={(e) =>
                              patchModuleField(
                                module.id,
                                "description",
                                e.target.value
                              ).catch(() => {})
                            }
                            placeholder={t(
                              "createSections.moduleDescPlaceholder"
                            )}
                            className="text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-0 p-0 sm:max-w-full max-w-60 mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex sm:self-center self-end items-center gap-2">
                        <div className="relative" ref={setMenuRef(module.id)}>
                          <button
                            type="button"
                            aria-label="Add"
                            onClick={() =>
                              setOpenMenuFor((id) =>
                                id === module.id ? null : module.id
                              )
                            }
                            className="text-purple-600 hover:text-purple-800 p-2 rounded-lg border border-purple-200 hover:border-purple-300"
                            title={t("createSections.add")}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {openMenuFor === module.id && (
                            <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                              <button
                                type="button"
                                onClick={() => {
                                  sectionApisRef.current[
                                    module.id
                                  ]?.createContentLesson("video");
                                  setOpenMenuFor(null);
                                }}
                                className="w-full ltr:text-left rtl:text-right px-4 py-2 hover:bg-gray-50 flex items-center"
                              >
                                <Video className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                {t("createSections.video")}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  sectionApisRef.current[
                                    module.id
                                  ]?.createContentLesson("article");
                                  setOpenMenuFor(null);
                                }}
                                className="w-full ltr:text-left rtl:text-right px-4 py-2 hover:bg-gray-50 flex items-center"
                              >
                                <FileText className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                {t("createSections.article")}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  sectionApisRef.current[
                                    module.id
                                  ]?.createContentLesson("material");
                                  setOpenMenuFor(null);
                                }}
                                className="w-full ltr:text-left rtl:text-right px-4 py-2 hover:bg-gray-50 flex items-center"
                              >
                                <Upload className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                {t("createSections.material")}
                              </button>
                              <div className="my-1 border-t border-gray-200" />
                              <button
                                type="button"
                                onClick={() => {
                                  sectionApisRef.current[
                                    module.id
                                  ]?.createAssessment("quiz");
                                  setOpenMenuFor(null);
                                }}
                                className="w-full ltr:text-left rtl:text-right px-4 py-2 flex items-center hover:bg-gray-50"
                                title={t("createSections.createQuizLesson")}
                              >
                                <HelpCircle className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                {t("createSections.quiz")}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  sectionApisRef.current[
                                    module.id
                                  ]?.createAssessment("exam");
                                  setOpenMenuFor(null);
                                }}
                                className="w-full ltr:text-left rtl:text-right px-4 py-2 flex items-center rounded-b-lg hover:bg-gray-50"
                                title={t("createSections.createExamLesson")}
                              >
                                <Award className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                {t("createSections.exam")}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  sectionApisRef.current[
                                    module.id
                                  ]?.createAssessment("assessment");
                                  setOpenMenuFor(null);
                                }}
                                className="w-full ltr:text-left rtl:text-right px-4 py-2 flex items-center rounded-b-lg hover:bg-gray-50"
                                title={t(
                                  "createSections.createAssessmentLesson"
                                )}
                              >
                                <BookCheck className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                {t("createSections.assessment")}
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteModule(module.id)}
                          className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                          title={t("createSections.deleteModule")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* LESSONS */}
                  <SectionLessons
                    moduleId={module.id}
                    setEditingLesson={setEditingLesson}
                    setEditingArticle={setEditingArticle}
                    setUploadingMaterial={setUploadingMaterial}
                    setEditingAssessment={setEditingAssessment}
                    updateLessonLocal={updateLessonLocal}
                    onReady={(api) => {
                      sectionApisRef.current[module.id] = api;
                    }}
                  />
                </div>
              </ModuleItem>
            ))}
          </div>
        )}
      </div>

      {/* Video */}
      {editingLesson && (
        <EditLesson
          editingLesson={editingLesson}
          setEditingLesson={setEditingLesson}
          // keep signature; local cache only
          updateLesson={(mId, lId, up) => {
            updateLessonLocal(mId, lId, up as any);
          }}
          onCancel={() => setEditingLesson(null)}
          onSave={async () => {
            try {
              // child already PATCHed; we only revalidate this section’s lessons
              await queryClient.invalidateQueries({
                queryKey: ["lessons", editingLesson.moduleId],
              });
            } finally {
              setEditingLesson(null);
            }
          }}
        />
      )}

      {/* Article */}
      {editingArticle && (
        <EditArticle
          editingArticle={editingArticle}
          setEditingArticle={setEditingArticle}
          updateLesson={(mId, lId, up) =>
            updateLessonLocal(mId, lId, up as any)
          }
          onCancel={() => setEditingArticle(null)}
          onSave={async () => {
            try {
              await queryClient.invalidateQueries({
                queryKey: ["lessons", editingArticle.moduleId],
              });
            } finally {
              setEditingArticle(null);
            }
          }}
        />
      )}

      {/* Material */}
      {uploadingMaterial && (
        <UploadingMaterial
          setUploadingMaterial={setUploadingMaterial}
          updateLesson={(mId, lId, up) =>
            updateLessonLocal(mId, lId, up as any)
          }
          uploadingMaterial={uploadingMaterial}
          onCancel={() => setUploadingMaterial(null)}
          onSave={async () => {
            try {
              await queryClient.invalidateQueries({
                queryKey: ["lessons", uploadingMaterial.moduleId],
              });
            } finally {
              setUploadingMaterial(null);
            }
          }}
        />
      )}

      {/* Quiz / Exam Builder & Preview */}
      {editingAssessment && (
        <Modal
          isOpen={!!editingAssessment}
          onClose={() => setEditingAssessment(null)}
          title={
            editingAssessment?.type === "exam"
              ? t("createSections.examBuilder")
              : editingAssessment?.type === "quiz"
              ? t("createSections.quizBuilder")
              : t("createSections.assessmentBuilder")
          }
          size="xl"
        >
          <AssessmentModalContent
            lessonId={editingAssessment.id}
            moduleId={editingAssessment.moduleId}
            type={editingAssessment.type}
            initialQuizFromServer={assessmentDetail}
          />
        </Modal>
      )}

      {previewDraft && (
        <Modal
          isOpen={!!previewDraft}
          onClose={() => setPreviewDraft(null)}
          title={t("createSections.preview")}
          size="xl"
        >
          <QuizPreview
            quiz={{
              title: previewDraft.title,
              description: previewDraft.description,
              questions: previewDraft.questions.map((q) => ({
                text: q.text,
                points: q.points,
                question_type: q.question_type,
                explanation: q.explanation,
                choices: q.choices,
              })),
              totalTimeLimit: (previewDraft.time_limit || 0) * 60,
            }}
            onEdit={() => setPreviewDraft(null)}
            onClose={() => setPreviewDraft(null)}
          />
        </Modal>
      )}
    </div>
  );
}
