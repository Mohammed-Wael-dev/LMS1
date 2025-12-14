// src/pages/CourseBuilder.tsx

import React, { useEffect, useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { useParams } from "react-router";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import CourseInformationForm from "../../components/course/course-builder/CourseInformationForm";
import CreateSectionsForm from "../../components/course/course-builder/CreateSectionsForm";
import SettingsForm from "../../components/course/course-builder/SettingsForm";
import GroupManagement from "../../components/course/course-builder/GroupManagement";
import UserManagement from "../../components/course/course-builder/UserManagement";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { patch } from "../../api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import IssuesModal from "./IssuesModal";
import { useTranslation } from "react-i18next";
import { useFeatureFlag } from "../../hooks/useSettings";

const CourseBuilderPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("course-info");
  const { courseId } = useParams();
  const queryClient = useQueryClient();
  const { t } = useTranslation("courseBuilder");

  const { data: courseData } = useCustomQuery(
    `${API_ENDPOINTS.courseInstructor}${courseId}`,
    ["course", courseId],
    undefined,
    !!courseId
  );

  const course: Course = courseData?.data;

  // publish flag
  const [published, setPublished] = useState<boolean>(!!course?.is_published);
  useEffect(() => {
    setPublished(!!course?.is_published);
  }, [course?.is_published]);

  // sequential flag
  const [sequential, setSequential] = useState<boolean>(
    !!course?.is_sequential
  );
  useEffect(() => {
    setSequential(!!course?.is_sequential);
  }, [course?.is_sequential]);

  // validation modal
  const [issues] = useState<string[]>([]);
  const [showIssues, setShowIssues] = useState(false);

  // helpers
  // async function fetchModulesForCourse(cid: string): Promise<Module[]> {
  //   const resp = await get(
  //     `${API_ENDPOINTS.modules}?course=${cid}&include_lessons=true`
  //   );
  //   return resp?.data?.data ?? resp?.data ?? resp ?? [];
  // }

  // === NEW: fetch single exam/quiz by lesson id ===
  // async function fetchAssessmentForLesson(
  //   lessonId: string
  // ): Promise<any | null> {
  //   try {
  //     const resp = await get(`${API_ENDPOINTS.exams}/${lessonId}`);
  //     return resp ?? null;
  //   } catch {
  //     return null;
  //   }
  // }

  // validation: course + modules + (standalone) assessment lessons
  // async function validateCourseReady(cid: string): Promise<string[]> {
  //   const problems: string[] = [];

  //   // 1) Course fields
  //   const c = course;
  //   const titleOK = !!c?.title?.trim();
  //   const descOK = !!c?.description?.trim();
  //   const levelOK = !!c?.level?.trim();
  //   const isPaid =
  //     typeof c?.is_paid === "boolean" ? c.is_paid : (c?.price ?? 0) > 0;
  //   const subcatOK =
  //     !!(c as any)?.sub_category || !!(c as any)?.sub_category_id;

  //   if (!titleOK) problems.push(t("validateCourseReady.titleOK"));
  //   if (!descOK) problems.push(t("validateCourseReady.descOK"));
  //   if (!levelOK) problems.push(t("validateCourseReady.levelOK"));
  //   if (!subcatOK) problems.push(t("validateCourseReady.subcatOK"));
  //   if (typeof isPaid !== "boolean") {
  //     problems.push(t("validateCourseReady.isPaidOK"));
  //   }

  //   // 2) Modules
  //   const modules = await fetchModulesForCourse(cid);
  //   if (!Array.isArray(modules) || modules.length === 0) {
  //     problems.push(t("validateCourseReady.modulesOK"));
  //   } else {
  //     modules.forEach((m, idx) => {
  //       if (!m?.title?.trim())
  //         problems.push(
  //           t("validateCourseReady.moduleTitleOK", { idx: idx + 1 })
  //         );
  //       if (
  //         (m as any)?.description != null &&
  //         !String((m as any).description).trim()
  //       ) {
  //         problems.push(
  //           t("validateCourseReady.moduleDescrOK", { idx: idx + 1 })
  //         );
  //       }
  //       const lessons = (m?.lessons ?? []) as any[];
  //       if (!lessons.length)
  //         problems.push(
  //           t("validateCourseReady.moduleLessonsOK", { idx: idx + 1 })
  //         );
  //     });
  //   }

  //   // 3) Assessments: each quiz/exam is its own lesson now
  //   const assessmentLessonIds: string[] = [];
  //   modules.forEach((m: any) =>
  //     (m.lessons || []).forEach((l: any) => {
  //       if (l?.content_type === "quiz" || l?.content_type === "exam") {
  //         assessmentLessonIds.push(l.id);
  //       }
  //     })
  //   );

  //   const settled = await Promise.allSettled(
  //     Array.from(new Set(assessmentLessonIds)).map((id) =>
  //       fetchAssessmentForLesson(id)
  //     )
  //   );

  //   const assessments: any[] = [];
  //   settled.forEach((res) => {
  //     if (res.status === "fulfilled" && res.value) assessments.push(res.value);
  //   });

  //   assessments.forEach((ex, idx) => {
  //     const label =
  //       ex?.type === "exam"
  //         ? t("labels.exam")
  //         : ex?.type === "quiz"
  //         ? t("labels.quiz")
  //         : t("labels.assessment");
  //     const prefix = `${label} "${ex?.title || `#${idx + 1}`}"`;
  //     const titleOK = !!ex?.title?.trim();
  //     const descOK = !!ex?.description?.trim();
  //     const tlimOK = Number.isFinite(Number(ex?.time_limit));
  //     const passOK =
  //       Number.isFinite(Number(ex?.passing_score)) &&
  //       Number(ex?.passing_score) >= 0 &&
  //       Number(ex?.passing_score) <= 100;
  //     const questions = Array.isArray(ex?.questions) ? ex.questions : [];

  //     if (!titleOK) problems.push(t("missingValues.title", { prefix }));
  //     if (!descOK) problems.push(t("missingValues.descr", { prefix }));
  //     if (!tlimOK) problems.push(t("missingValues.limit", { prefix }));
  //     if (!passOK) problems.push(t("missingValues.passingScore", { prefix }));
  //     if (!questions.length) {
  //       problems.push(t("missingValues.questions", { prefix }));
  //     } else {
  //       questions.forEach((q: any, qidx: number) => {
  //         if (!q?.text?.trim()) {
  //           problems.push(
  //             `${prefix}: ${t("missingValues.questionTxt", { qidx: qidx + 1 })}`
  //           );
  //         }
  //         const choices = Array.isArray(q?.choices) ? q.choices : [];
  //         if (!choices.length) {
  //           problems.push(
  //             `${prefix}: ${t("missingValues.choices", { qidx: qidx + 1 })}`
  //           );
  //         } else {
  //           let hasCorrect = false;
  //           choices.forEach((ch: any, cidx: number) => {
  //             if (!ch?.text?.trim()) {
  //               problems.push(
  //                 `${prefix}: ${t("question")} #${qidx + 1} ${t(
  //                   "missingValues.choiceTxt",
  //                   { cidx: cidx + 1 }
  //                 )}`
  //               );
  //             }
  //             if (ch?.is_correct) hasCorrect = true;
  //           });
  //           if (!hasCorrect) {
  //             problems.push(
  //               `${prefix}: ${t("missingValues.hasCorrect", {
  //                 qidx: qidx + 1,
  //               })}`
  //             );
  //           }
  //         }
  //       });
  //     }
  //   });

  //   return problems;
  // }

  // publish/unpublish course
  const togglePublish = async (shouldPublish: boolean) => {
    if (!courseId) return;

    try {
      const fd = new FormData();
      fd.append("is_published", shouldPublish ? "true" : "false");
      const res = await patch(`${API_ENDPOINTS.updateCourse}${courseId}/`, fd);

      if (res.status === true) {
        queryClient.invalidateQueries({ queryKey: ["course", courseId] });
        queryClient.invalidateQueries({ queryKey: ["courses"] });
        setPublished(shouldPublish);
        toast.success(
          shouldPublish ? t("tryPublish.success") : t("tryUnpublish.success")
        );
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || t("tryPublish.error"));
    }
  };

  // sequential/unsequential course
  const toggleSequential = async (shouldSequential: boolean) => {
    if (!courseId) return;

    try {
      const fd = new FormData();
      fd.append("is_sequential", shouldSequential ? "true" : "false");
      await patch(`${API_ENDPOINTS.updateCourse}${courseId}/`, fd);
      await queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      setPublished(shouldSequential);
      toast.success(
        shouldSequential ? t("courseInfo.success") : t("courseInfo.error")
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.error || t("courseInfo.error"));
    }
  };

  // toggle publish/unpublish
  const tryPublish = async () => {
    console.log("🔍 Course ID:", courseId);
    console.log("🔍 Current published state:", published);
    console.log("🔍 Will toggle to:", !published);
    console.log("🔍 Endpoint:", `${API_ENDPOINTS.updateCourse}${courseId}/`);
    // Toggle: if published -> unpublish, if not published -> publish
    await togglePublish(!published);
  };

  const handleIsPublishedChange = async (next: boolean) => {
    await togglePublish(next);
  };

  const handleIsSequentialChange = async (next: boolean) => {
    await toggleSequential(next);
  };

  const { enabled: chatGroupEnabled, isLoading: chatGroupLoading } =
    useFeatureFlag("is_chat_group_enabled", true);

  const TABS = [
    { id: "course-info", label: t("tabs.info") },
    { id: "curriculum", label: t("tabs.curriculum") },
    {
      id: "users",
      label: t("tabs.users"),
    },
    ...(chatGroupEnabled
      ? [
          {
            id: "groups",
            label: t("tabs.groups"),
          },
        ]
      : []),
    { id: "settings", label: t("tabs.settings") },
  ];

  if (chatGroupLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <IssuesModal
        open={showIssues}
        onClose={() => setShowIssues(false)}
        issues={issues}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            className="flex items-center text-gray-600 hover:text-gray-900 gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5 mr-2 rtl:rotate-180" />
            {t("back")}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={tryPublish}
              className={`inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors ${
                published
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
            >
              <Eye className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {published ? t("unpublish") : t("publish")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full ltr:text-left rtl:text-right px-4 py-3 rounded-lg hover:bg-gray-50 ${
                    activeTab === tab.id
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-700"
                  }`}
                >
                  <span className="flex items-center">
                    {/* {tab.icon ?? null} */}
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Main */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            {activeTab === "course-info" && (
              <CourseInformationForm course={course} />
            )}

            {activeTab === "curriculum" && (
              <DndProvider backend={HTML5Backend}>
                <CreateSectionsForm courseId={course?.id} />
              </DndProvider>
            )}

            {activeTab === "users" && (
              <div className="bg-white rounded-xl shadow-sm p-8">
                <UserManagement courseId={course?.id} />
              </div>
            )}

            {activeTab === "groups" && (
              <div className="bg-white rounded-xl shadow-sm p-8">
                <GroupManagement />
              </div>
            )}

            {activeTab === "settings" && (
              <SettingsForm
                isPublished={published}
                onIsPublishedChange={handleIsPublishedChange}
                isSequential={sequential}
                onIsSequentialChange={handleIsSequentialChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseBuilderPage;
