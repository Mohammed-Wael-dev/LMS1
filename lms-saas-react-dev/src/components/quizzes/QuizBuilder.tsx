import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Check,
  Save,
  Eye,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type Choice = { text: string; is_correct: boolean };
type QuestionDraft = {
  text: string;
  question_type: "mcq";
  explanation?: string;
  points: number;
  choices: Choice[];
};
export type AssessmentDraft = {
  title?: string;
  description?: string;
  time_limit: number;
  passing_score: number;
  type?: "quiz" | "exam" | "assessment";
  questions: QuestionDraft[];
};

interface QuizBuilderProps {
  onSave: (draft: AssessmentDraft) => void;
  onPreview: (draft: AssessmentDraft) => void;
  onClose: (s: boolean) => void;
  initialQuiz?: any;

  lessonTitle?: string;
  lessonDescription?: string;
  onLessonTitleChange?: (title: string) => void;
  onLessonDescriptionChange?: (desc: string) => void;
  onLessonTitleBlur?: (title: string) => void | Promise<void>;
  onLessonDescriptionBlur?: (desc: string) => void | Promise<void>;
}

type UiOption = { id: string; text: string; is_correct: boolean };
type UiQuestion = {
  id: string;
  text: string;
  explanation?: string;
  points: number;
  timeLimitSeconds?: number;
  options: UiOption[];
};

type UiQuiz = {
  time_limit: number;
  passing_score: number;
  type?: "quiz" | "exam" | "assessment";
  questions: UiQuestion[];
};

const uid = () => Math.random().toString(36).slice(2);

function normalizeInitial(initial?: any): UiQuiz {
  // 1) Coerce type robustly
  const coerceType = (t: any): "quiz" | "exam" | "assessment" => {
    const s = String(t ?? "")
      .trim()
      .toLowerCase();
    if (s === "exam") return "exam";
    if (s === "quiz") return "quiz";
    return "assessment";
  };

  const type = coerceType(initial?.type);

  // 2) Safe helpers
  const safeInt = (v: any, def: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.floor(n) : def;
  };

  const getOptions = (q: any) => {
    const raw = Array.isArray(q?.choices)
      ? q.choices
      : Array.isArray(q?.options)
      ? q.options
      : [];
    if (!raw.length) {
      return [
        { id: uid(), text: "", is_correct: false },
        { id: uid(), text: "", is_correct: false },
      ];
    }
    return raw.map((c: any) => ({
      id: uid(),
      text: String(c?.text ?? c?.label ?? ""),
      is_correct: !!(c?.is_correct ?? c?.isCorrect),
    }));
  };

  // 3) Defaults depend on type (assessments are non-graded)
  const defaultPoints = type === "assessment" ? 0 : 1;
  const baseTimeLimit = type === "assessment" ? 0 : 10; // you can keep 0 for assessments
  const basePassing = type === "assessment" ? 0 : 70;

  const base: UiQuiz = {
    time_limit: baseTimeLimit,
    passing_score: basePassing,
    type,
    questions: [
      {
        id: uid(),
        text: "",
        explanation: "",
        points: defaultPoints,
        timeLimitSeconds: undefined,
        options: [
          { id: uid(), text: "", is_correct: false },
          { id: uid(), text: "", is_correct: false },
        ],
      },
    ],
  };

  // 4) If no initial, return base
  if (!initial) return base;

  // 5) Build from initial if it looks like quiz/exam/assessment data
  const hasQuestionsArray = Array.isArray(initial?.questions);
  const hasTimeLimit =
    typeof initial?.time_limit === "number" || initial?.time_limit == null;

  if (hasQuestionsArray && hasTimeLimit) {
    const normalizedQuestions =
      initial.questions.length > 0
        ? initial.questions.map((q: any) => {
            const txt = String(q?.text ?? q?.question ?? q?.title ?? "");
            const pts =
              type === "assessment"
                ? 0
                : Number.isFinite(q?.points)
                ? Math.max(1, Number(q.points))
                : 1;
            return {
              id: uid(),
              text: txt,
              explanation: q?.explanation ?? "",
              points: pts,
              timeLimitSeconds: undefined, // keep undefined here; per-question timers are optional
              options: getOptions(q),
            };
          })
        : base.questions;

    return {
      time_limit:
        type === "assessment"
          ? 0
          : safeInt(initial.time_limit, baseTimeLimit) < 1
          ? baseTimeLimit
          : safeInt(initial.time_limit, baseTimeLimit),
      passing_score:
        type === "assessment"
          ? 0
          : Math.max(
              0,
              Math.min(100, safeInt(initial.passing_score, basePassing))
            ),
      type,
      questions: normalizedQuestions,
    };
  }

  // 6) Fallback to base if shape is not as expected
  return base;
}

function toAssessmentDraft(ui: UiQuiz): AssessmentDraft {
  const base: AssessmentDraft = {
    // for assessment we’ll drop these later
    time_limit: Math.max(1, Math.floor(Number(ui.time_limit || 1))),
    passing_score: Math.max(
      0,
      Math.min(100, Math.floor(Number(ui.passing_score || 0)))
    ),
    type: ui.type ?? "quiz",
    questions: ui.questions.map((q) => ({
      text: q.text.trim(),
      question_type: "mcq",
      explanation: q.explanation?.trim() || "",
      // Points & correctness only matter for non-assessments; keep minimal safe defaults here
      points: Math.max(1, Number(q.points || 1)),
      choices: q.options.map((o) => ({
        text: o.text.trim(),
        // assessments don’t use correctness; keep false so backend won’t reject missing field
        is_correct: ui.type === "assessment" ? false : !!o.is_correct,
      })),
    })),
  };

  // For assessment: remove scoring/timing fields from the outgoing payload
  if (ui.type === "assessment") {
    delete (base as any).time_limit;
    delete (base as any).passing_score;

    // Also normalize questions’ points to 0 if your backend tolerates it (optional):
    base.questions = base.questions.map((q) => ({ ...q, points: 0 }));
  }

  return base;
}

const QuizBuilder: React.FC<QuizBuilderProps> = ({
  onSave,
  onPreview,
  initialQuiz,
  onClose,

  lessonTitle = "",
  lessonDescription = "",
  onLessonTitleChange,
  onLessonDescriptionChange,
  onLessonTitleBlur,
  onLessonDescriptionBlur,
}) => {
  const { t } = useTranslation("courseBuilder");
  const [quiz, setQuiz] = useState<UiQuiz>(() => normalizeInitial(initialQuiz));

  const isAssessment =
    String(quiz?.type ?? "")
      .trim()
      .toLowerCase() === "assessment";

  const [metaTitle, setMetaTitle] = useState<string>(lessonTitle);
  const [metaDescription, setMetaDescription] =
    useState<string>(lessonDescription);

  useEffect(() => setMetaTitle(lessonTitle), [lessonTitle]);
  useEffect(() => setMetaDescription(lessonDescription), [lessonDescription]);

  // ---- Debounced autosave & change detection ----
  const saveTimerRef = useRef<any>(null);
  const quizRef = useRef<UiQuiz>(quiz);
  const lastEmittedRef = useRef<string>(""); // snapshot of last sent payload

  useEffect(() => {
    quizRef.current = quiz;
  }, [quiz]);

  // Preserve expanded state by index across prop reloads
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    () => new Set(quiz.questions.length ? [quiz.questions[0].id] : [])
  );

  // When server data changes, reset local quiz BUT keep expanded by index
  useEffect(() => {
    const prev = quizRef.current;
    const prevIds = prev.questions.map((q) => q.id);
    const prevExpandedIdx = prevIds
      .map((id, idx) => (expandedQuestions.has(id) ? idx : -1))
      .filter((i) => i >= 0);

    const normalized = normalizeInitial(initialQuiz);
    setQuiz(normalized);
    lastEmittedRef.current = JSON.stringify(toAssessmentDraft(normalized));

    // map expanded indices to new question ids (same positions)
    const newIds = normalized.questions.map((q) => q.id);
    const nextExpanded = new Set<string>();
    if (newIds.length > 0) {
      if (prevExpandedIdx.length === 0) {
        // first load → expand first only
        nextExpanded.add(newIds[0]);
      } else {
        prevExpandedIdx.forEach((i) => {
          if (i >= 0 && i < newIds.length) nextExpanded.add(newIds[i]);
        });
      }
    }
    setExpandedQuestions(nextExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuiz]);

  const triggerAutoSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const draft = toAssessmentDraft(quizRef.current);
      const snapshot = JSON.stringify(draft);
      if (snapshot === lastEmittedRef.current) return; // no-op
      onSave(draft);
      lastEmittedRef.current = snapshot;
    }, 450);
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalPoints = useMemo(
    () => quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0),
    [quiz.questions]
  );

  /** ---- question ops ---- */
  const addQuestion = () => {
    const q: UiQuestion = {
      id: uid(),
      text: "",
      explanation: "",
      points: 1,
      timeLimitSeconds: undefined,
      options: [
        { id: uid(), text: "", is_correct: false },
        { id: uid(), text: "", is_correct: false },
      ],
    };
    setQuiz((prev) => ({ ...prev, questions: [...prev.questions, q] }));
    setExpandedQuestions((s) => new Set([...s, q.id]));
    triggerAutoSave();
  };

  const removeQuestion = (qid: string) => {
    if (quiz.questions.length <= 1) {
      alert(t("quizBuilder.alerts.minOneQuestion"));
      return;
    }
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== qid),
    }));
    setExpandedQuestions((s) => {
      const n = new Set(s);
      n.delete(qid);
      return n;
    });
    triggerAutoSave();
  };

  const updateQuestion = (
    qid: string,
    patch: Partial<UiQuestion>,
    opts?: { autosave?: boolean }
  ) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === qid ? { ...q, ...patch } : q
      ),
    }));
    if (opts?.autosave) triggerAutoSave();
  };

  /** ---- option ops ---- */
  const addOption = (qid: string) => {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q) return;
    const opt: UiOption = { id: uid(), text: "", is_correct: false };
    updateQuestion(qid, { options: [...q.options, opt] });
    triggerAutoSave();
  };

  const removeOption = (qid: string, oid: string) => {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q) return;
    if (q.options.length <= 2) {
      alert(t("quizBuilder.alerts.minTwoOptions"));
      return;
    }
    updateQuestion(qid, { options: q.options.filter((o) => o.id !== oid) });
    triggerAutoSave();
  };

  const updateOption = (
    qid: string,
    oid: string,
    text: string,
    opts?: { autosave?: boolean }
  ) => {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q) return;
    updateQuestion(qid, {
      options: q.options.map((o) => (o.id === oid ? { ...o, text } : o)),
    });
    if (opts?.autosave) triggerAutoSave();
  };

  const toggleCorrect = (qid: string, oid: string) => {
    const q = quiz.questions.find((x) => x.id === qid);
    if (!q) return;
    updateQuestion(qid, {
      options: q.options.map((o) =>
        o.id === oid ? { ...o, is_correct: !o.is_correct } : o
      ),
    });
    triggerAutoSave();
  };

  /** ---- ui helpers ---- */
  const toggleExpanded = (qid: string) => {
    setExpandedQuestions((s) => {
      const n = new Set(s);
      if (n.has(qid)) n.delete(qid);
      else n.add(qid);
      return n;
    });
  };

  /** ---- validation ---- */
  const validate = (): boolean => {
    const next: Record<string, string> = {};

    quiz.questions.forEach((q, idx) => {
      if (!q.text.trim())
        next[`q_${q.id}`] = t("quizBuilder.errors.questionRequired", {
          index: idx + 1,
        });

      // Require non-empty options
      if (q.options.some((o) => !o.text.trim()))
        next[`opts_${q.id}`] = t("quizBuilder.errors.optionsTextRequired", {
          index: idx + 1,
        });

      // Only for non-assessment: need at least one correct answer and points >= 1
      if (!isAssessment) {
        if (!q.options.some((o) => o.is_correct))
          next[`corr_${q.id}`] = t("quizBuilder.errors.correctRequired", {
            index: idx + 1,
          });

        if (!Number.isFinite(q.points) || q.points < 1)
          next[`pts_${q.id}`] = t("quizBuilder.errors.pointsMin", {
            index: idx + 1,
          });
      }
    });

    if (!isAssessment) {
      if (!Number.isFinite(quiz.time_limit) || quiz.time_limit < 1)
        next["time"] = t("quizBuilder.errors.timeMin");
      if (
        !Number.isFinite(quiz.passing_score) ||
        quiz.passing_score < 0 ||
        quiz.passing_score > 100
      )
        next["pass"] = t("quizBuilder.errors.passRange");
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /** ---- actions ---- */
  const handleSave = async () => {
    if (!validate()) return;

    // Ensure lesson meta gets persisted even if user didn't blur
    try {
      if (onLessonTitleBlur && metaTitle !== (lessonTitle ?? "")) {
        await onLessonTitleBlur(metaTitle);
      }
      if (
        onLessonDescriptionBlur &&
        metaDescription !== (lessonDescription ?? "")
      ) {
        await onLessonDescriptionBlur(metaDescription);
      }
    } catch {
      // ignore — lesson meta save is best-effort before quiz save
    }

    const draft = toAssessmentDraft(quizRef.current);
    const snapshot = JSON.stringify(draft);
    if (snapshot !== lastEmittedRef.current) {
      onSave(draft);
      lastEmittedRef.current = snapshot;
    }
    onClose(false);
  };

  const handlePreview = () => {
    if (!validate()) return;
    onPreview(toAssessmentDraft(quizRef.current));
  };

  // Keep at least one expanded, but don't collapse user's choice
  useEffect(() => {
    if (!quiz.questions.length) return;
    setExpandedQuestions((prev) => {
      const ids = new Set(quiz.questions.map((q) => q.id));
      const stillValid = [...prev].filter((id) => ids.has(id));
      if (stillValid.length > 0) return new Set(stillValid);
      // First-time case only: expand first
      return new Set([quiz.questions[0].id]);
    });
  }, [quiz.questions]);

  return (
    <div className="bg-white rounded-xl md:p-8 p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {metaTitle ||
            (quiz.type === "exam"
              ? t("quizBuilder.title.exam")
              : quiz.type === "quiz"
              ? t("quizBuilder.title.quiz")
              : t("quizBuilder.title.assessment"))}
        </h2>
        {!!metaDescription && (
          <p className="text-gray-600">{metaDescription}</p>
        )}
      </div>

      <div className="space-y-8">
        {/* Lesson meta + Quiz info */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {quiz.type === "exam"
              ? t("quizBuilder.infoTitle.exam")
              : quiz.type === "quiz"
              ? t("quizBuilder.infoTitle.quiz")
              : t("quizBuilder.infoTitle.assessment")}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* LESSON title */}
            <div
              className={`${!isAssessment ? "md:col-span-2" : "md:col-span-3"}`}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("quizBuilder.labels.lessonTitle")}
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => {
                  const v = e.target.value;
                  setMetaTitle(v);
                  onLessonTitleChange?.(v);
                }}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (lessonTitle ?? "")) {
                    onLessonTitleBlur?.(v);
                  }
                }}
                placeholder={t(
                  `quizBuilder.placeholders.lessonTitle.${
                    quiz.type === "exam"
                      ? "exam"
                      : quiz.type === "quiz"
                      ? "quiz"
                      : "assessment"
                  }`
                )}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent border-gray-300"
              />
            </div>

            {!isAssessment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("quizBuilder.labels.passingScore")}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={quiz.passing_score}
                  onChange={(e) =>
                    setQuiz((p) => {
                      return {
                        ...p,
                        passing_score: Math.max(
                          0,
                          Math.min(100, Number(e.target.value || 0))
                        ),
                      };
                    })
                  }
                  onBlur={triggerAutoSave}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.pass ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.pass && (
                  <p className="mt-1 text-sm text-red-600">{errors.pass}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {!isAssessment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("quizBuilder.labels.totalTimeLimit")}
                </label>
                <input
                  type="number"
                  min={1}
                  value={quiz.time_limit}
                  onChange={(e) =>
                    setQuiz((p) => ({
                      ...p,
                      time_limit: Math.max(
                        1,
                        Math.floor(Number(e.target.value || 1))
                      ),
                    }))
                  }
                  onBlur={triggerAutoSave}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.time ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.time && (
                  <p className="mt-1 text-sm text-red-600">{errors.time}</p>
                )}
              </div>
            )}

            {/* LESSON description */}
            <div
              className={`${!isAssessment ? "md:col-span-2" : "md:col-span-3"}`}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("quizBuilder.labels.lessonDescription")}
              </label>
              <textarea
                rows={3}
                value={metaDescription}
                onChange={(e) => {
                  const v = e.target.value;
                  setMetaDescription(v);
                  onLessonDescriptionChange?.(v);
                }}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (lessonDescription ?? "")) {
                    onLessonDescriptionBlur?.(v);
                  }
                }}
                placeholder={t(
                  `quizBuilder.placeholders.lessonDescription.${
                    quiz.type === "exam"
                      ? "exam"
                      : quiz.type === "quiz"
                      ? "quiz"
                      : "assessment"
                  }`
                )}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div>
          <div className="flex items-center justify-between sm:flex-row flex-col-reverse gap-2 sm:gap-0 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 sm:self-center self-start">
              {t("quizBuilder.questions.heading", {
                count: quiz.questions.length,
              })}
            </h3>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={addQuestion}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center text-sm"
            >
              <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {t("quizBuilder.buttons.addQuestion")}
            </button>
          </div>

          <div className="space-y-4">
            {quiz.questions.map((q, idx) => {
              const expanded = expandedQuestions.has(q.id);
              const letter = (i: number) =>
                String.fromCharCode(65 + i) as string;

              return (
                <div
                  key={q.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* header */}
                  <div className="bg-gray-50 p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => toggleExpanded(q.id)}
                        className="flex items-center gap-3 flex-1 ltr:text-left rtl:text-right"
                      >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        {expanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {t("quizBuilder.questions.questionLabel", {
                              index: idx + 1,
                            })}
                            {q.text &&
                              `: ${q.text.substring(0, 50)}${
                                q.text.length > 50 ? "…" : ""
                              }`}
                          </h4>
                          {!isAssessment && (
                            <p className="text-sm text-gray-600">
                              {t("quizBuilder.questions.optionsAndPoints", {
                                options: q.options.length,
                                points: q.points,
                                plural: q.points !== 1 ? "s" : "",
                              })}
                            </p>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => removeQuestion(q.id)}
                        disabled={quiz.questions.length <= 1}
                        className={`p-2 rounded-lg transition-colors ${
                          quiz.questions.length <= 1
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-red-500 hover:bg-red-50"
                        }`}
                        title={
                          quiz.questions.length <= 1
                            ? t("quizBuilder.tooltips.minOneQuestion")
                            : t("quizBuilder.tooltips.removeQuestion")
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* body */}
                  {expanded && (
                    <div className="sm:p-6 p-2 space-y-6">
                      {/* text */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("quizBuilder.labels.questionText")}
                        </label>
                        <textarea
                          value={q.text}
                          onChange={(e) =>
                            updateQuestion(q.id, { text: e.target.value })
                          }
                          onBlur={triggerAutoSave}
                          placeholder={t(
                            "quizBuilder.placeholders.questionText"
                          )}
                          rows={3}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${
                            errors[`q_${q.id}`]
                              ? "border-red-300"
                              : "border-gray-300"
                          }`}
                        />
                        {errors[`q_${q.id}`] && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors[`q_${q.id}`]}
                          </p>
                        )}
                      </div>

                      {/* options */}
                      <div>
                        <div className="flex sm:items-center items-start sm:flex-row flex-col-reverse gap-2 sm:gap-0 justify-between mb-4">
                          <label className="block text-sm font-medium text-gray-700">
                            {t("quizBuilder.labels.answerOptions")}
                          </label>
                          <button
                            type="button"
                            onClick={() => addOption(q.id)}
                            onMouseDown={(e) => e.preventDefault()}
                            className="self-center bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center"
                          >
                            <Plus className="w-3 h-3 ltr:mr-1 rtl:ml-1" />
                            {t("quizBuilder.buttons.addOption")}
                          </button>
                        </div>

                        <div className="space-y-3">
                          {q.options.map((o, oi) => (
                            <div
                              key={o.id}
                              className="flex items-start gap-3 sm:flex-row flex-col p-3 border border-gray-200 rounded-lg"
                            >
                              <div className="flex items-center mt-1">
                                <span className="text-sm font-medium text-gray-500 ltr:mr-3 rtl:ml-3">
                                  {letter(oi)}.
                                </span>
                                {!isAssessment && (
                                  <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => toggleCorrect(q.id, o.id)}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                      o.is_correct
                                        ? "bg-green-500 border-green-500 text-white"
                                        : "border-gray-300 hover:border-green-400"
                                    }`}
                                    title={
                                      o.is_correct
                                        ? t(
                                            "quizBuilder.tooltips.correctAnswer"
                                          )
                                        : t(
                                            "quizBuilder.tooltips.markAsCorrect"
                                          )
                                    }
                                  >
                                    {o.is_correct && (
                                      <Check className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>

                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={o.text}
                                  onChange={(e) =>
                                    updateOption(q.id, o.id, e.target.value)
                                  }
                                  onBlur={triggerAutoSave}
                                  placeholder={t(
                                    "quizBuilder.placeholders.option",
                                    { letter: letter(oi) }
                                  )}
                                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                              </div>

                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => removeOption(q.id, o.id)}
                                disabled={q.options.length <= 2}
                                className={`p-1 rounded transition-colors ${
                                  q.options.length <= 2
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-red-500 hover:bg-red-50"
                                }`}
                                title={
                                  q.options.length <= 2
                                    ? t("quizBuilder.tooltips.minTwoOptions")
                                    : t("quizBuilder.tooltips.removeOption")
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {errors[`opts_${q.id}`] && (
                          <p className="mt-2 text-sm text-red-600">
                            {errors[`opts_${q.id}`]}
                          </p>
                        )}
                        {errors[`corr_${q.id}`] && (
                          <p className="mt-2 text-sm text-red-600">
                            {errors[`corr_${q.id}`]}
                          </p>
                        )}
                      </div>

                      {/* settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!isAssessment && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t("quizBuilder.labels.points")}
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={q?.points}
                              onChange={(e) =>
                                updateQuestion(q.id, {
                                  points: Math.max(
                                    1,
                                    Number(e.target.value || 1)
                                  ),
                                })
                              }
                              onBlur={triggerAutoSave}
                              className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                errors[`pts_${q.id}`]
                                  ? "border-red-300"
                                  : "border-gray-300"
                              }`}
                            />
                            {errors[`pts_${q.id}`] && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors[`pts_${q.id}`]}
                              </p>
                            )}
                          </div>
                        )}

                        {!isAssessment && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t("quizBuilder.labels.perQuestionTime")}
                            </label>
                            <input
                              type="number"
                              min={10}
                              max={1800}
                              value={q.timeLimitSeconds ?? ""}
                              onChange={(e) =>
                                updateQuestion(q.id, {
                                  timeLimitSeconds: e.target.value
                                    ? Math.max(10, Number(e.target.value))
                                    : undefined,
                                })
                              }
                              onBlur={triggerAutoSave}
                              placeholder={t(
                                "quizBuilder.placeholders.perQuestionTime"
                              )}
                              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                        )}
                      </div>

                      {/* explanation */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t("quizBuilder.labels.explanation")}
                        </label>
                        <textarea
                          value={q.explanation || ""}
                          onChange={(e) =>
                            updateQuestion(q.id, {
                              explanation: e.target.value,
                            })
                          }
                          onBlur={triggerAutoSave}
                          placeholder={t(
                            "quizBuilder.placeholders.explanation"
                          )}
                          rows={2}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        {!isAssessment && (
          <div className="bg-blue-50 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-3">
              {quiz.type === "exam"
                ? t("quizBuilder.summary.title.exam")
                : t("quizBuilder.summary.title.quiz")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">
                  {t("quizBuilder.summary.questions")}
                </span>
                <span className="font-semibold text-blue-900 ltr:ml-2 rtl:mr-2">
                  {quiz.questions.length}
                </span>
              </div>
              <div>
                <span className="text-blue-700">
                  {t("quizBuilder.summary.totalPoints")}
                </span>
                <span className="font-semibold text-blue-900 ltr:ml-2 rtl:mr-2">
                  {totalPoints}
                </span>
              </div>
              <div>
                <span className="text-blue-700">
                  {t("quizBuilder.summary.totalOptions")}
                </span>
                <span className="font-semibold text-blue-900 ltr:ml-2 rtl:mr-2">
                  {quiz.questions.reduce((sum, q) => sum + q.options.length, 0)}
                </span>
              </div>
              <div>
                <span className="text-blue-700">
                  {t("quizBuilder.summary.timeLimit")}
                </span>
                <span className="font-semibold text-blue-900 ltr:ml-2 rtl:mr-2">
                  {quiz.time_limit}
                  {t("quizBuilder.summary.minutesSuffix")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center sm:flex-row flex-col gap-4 justify-between pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {t("quizBuilder.footer.stats", {
              count: quiz.questions.length,
              qPlural: quiz.questions.length !== 1 ? "s" : "",
            })}
            {!isAssessment &&
              `${t("quizBuilder.footer.pointStats", {
                points: totalPoints,
                pPlural: totalPoints !== 1 ? "s" : "",
              })}`}
          </div>

          <div className="sm:w-fit w-full flex gap-4 items-center sm:flex-row flex-col">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handlePreview}
              className="bg-gray-600 text-white px-6 py-3 w-full rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
            >
              <Eye className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {t("quizBuilder.buttons.preview")}
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSave}
              className="bg-purple-600 text-white px-6 py-3 w-full rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
            >
              <Save className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
              {t("quizBuilder.buttons.save")}
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onClose(false);
              }}
              className="bg-transparent text-gray-600 px-6 py-3 w-full rounded-lg border border-gray-200 transition-colors flex items-center justify-center"
            >
              {t("quizBuilder.buttons.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizBuilder;
