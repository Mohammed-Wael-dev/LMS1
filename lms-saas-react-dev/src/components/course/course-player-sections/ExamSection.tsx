import { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "../../../utils/constants";
import { useCustomPost } from "../../../hooks/useMutation";
import { useCustomQuery } from "../../../hooks/useQuery";
import toast from "react-hot-toast";
import handleErrorAlerts from "../../../utils/showErrorMessages";
import { useTranslation } from "react-i18next";
import { formatDateTimeSimple } from "../../../utils/formatDateTime";
import { Award, RotateCcw, X } from "lucide-react";
// import blankCertificateImage from "../../../assets/blank_certificat.png";

interface ExamSectionProps {
  exam: Exam;
  onClose: () => void;
}

interface StudentAnswers {
  id: string;
  student: string;
  quiz: string;
  attempt: number;
  score: number;
  passed: boolean;
  total_questions: number;
  submitted_at: string;
  count_correct: number;
  count_incorrect: number;
}

export default function ExamSection({ exam, onClose }: ExamSectionProps) {
  const { t, i18n } = useTranslation("coursePlayer");
  const isAssessment = exam.type === "assessment";
  const MAX_ATTEMPTS =
    typeof (exam as any)?.max_attempts === "number"
      ? (exam as any).max_attempts
      : 9999999;

  const {
    data: ansResp,
    isFetching: isFetchingSummary,
    refetch: refetchSummary,
  } = useCustomQuery(
    `${API_ENDPOINTS.getStudentAnswers}?quiz=${encodeURIComponent(exam.id)}`,
    ["studentAnswers", exam.id]
  );

  const attempts: StudentAnswers[] = ansResp?.data ?? [];
  const latest =
    attempts.length > 0
      ? [...attempts].sort((a, b) => a.attempt - b.attempt)[attempts.length - 1]
      : undefined;

  const attemptsCount = attempts.length;
  const nextAttempt = Math.min(attemptsCount + 1, MAX_ATTEMPTS);
  // const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attemptsCount);

  const questions = useMemo(
    () => (Array.isArray(exam?.questions) ? exam.questions : []),
    [exam.questions]
  );
  const passing =
    typeof exam?.passing_score === "number" ? exam.passing_score : 0;

  const [answers, setAnswers] = useState<Record<string, Set<string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isRetaking, setIsRetaking] = useState<boolean>(() => !latest?.id);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    setIsRetaking(!latest?.id);
  }, [latest?.id]);

  const totalQuestions = latest?.total_questions ?? questions.length;
  const correct = latest?.count_correct ?? 0;
  const incorrect = latest?.count_incorrect ?? 0;
  const percent = latest
    ? Math.round((correct / Math.max(1, totalQuestions)) * 100)
    : 0;
  const passed = latest?.passed ?? false;
  const examTypeLabel =
    exam.type === "quiz" ? t("examSection.quiz") : t("examSection.exam");

  // const reachedMaxAttempts = attemptsCount >= MAX_ATTEMPTS;
  // const canRetake = !reachedMaxAttempts;
  const canRetake = true;

  const toggleAnswer = (qId: string, choiceId: string, isMulti: boolean) => {
    if (!isRetaking || submitted) return;
    setAnswers((prev) => {
      const curr = new Set(prev[qId] ?? []);
      if (isMulti) {
        if (curr.has(choiceId)) curr.delete(choiceId);
        else curr.add(choiceId);
        return { ...prev, [qId]: curr };
      }
      return { ...prev, [qId]: new Set([choiceId]) };
    });
  };

  const allAnswered = useMemo(
    () => questions.every((q) => (answers[q.id]?.size ?? 0) > 0),
    [answers, questions]
  );

  const buildSubmission = () => {
    const rows: Array<{ question: string; choice: string; attempt: number }> =
      [];
    for (const q of questions) {
      const picked = answers[q.id];
      if (!picked?.size) continue;
      for (const choiceId of picked)
        rows.push({ question: q.id, choice: choiceId, attempt: nextAttempt });
    }
    return rows;
  };

  const { mutateAsync, isPending } = useCustomPost(API_ENDPOINTS.submitExam, [
    "exam",
  ]);

  const submitExam = async () => {
    if (!allAnswered || isPending) return;

    try {
      if (isAssessment) {
        // Submit behavior locally without any API request
        setSubmitted(true);
        setIsRetaking(false);
        setShowResultModal(false);
        toast.success(t("examSection.submitAssessment"));
        return;
      }

      const payload = buildSubmission();
      await mutateAsync(payload);
      setSubmitted(true);
      setIsRetaking(false);
      await refetchSummary();
      setShowResultModal(true);
      toast.success(t("examSection.submitExam.success", { nextAttempt }));
    } catch (err: any) {
      handleErrorAlerts(err?.response?.data?.error);
    }
  };

  const retake = () => {
    if (!canRetake) return;
    setAnswers({});
    setSubmitted(false);
    setIsRetaking(true);
    setShowResultModal(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCloseResultModal = () => setShowResultModal(false);

  // const handleViewCertificate = () => {
  //   if (!passed) return;
  //   setShowResultModal(false);
  //   window.open(blankCertificateImage, "_blank", "noopener,noreferrer");
  // };

  const submitDisabled = !allAnswered || isPending || !isRetaking;

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      {/* Header */}
      <div className="flex md:items-center md:flex-row flex-col items-start gap-4 md:justify-between mb-6">
        <div>
          <h3 className="md:text-2xl text-lg font-bold text-gray-900">
            {exam.title}{" "}
            {exam.type === "quiz"
              ? "(Quiz)"
              : exam.type === "exam"
              ? "(Exam)"
              : "(Assessment)"}
          </h3>
          {exam.description && (
            <p className="text-gray-600 md:text-base text-sm">
              {exam.description}
            </p>
          )}
        </div>
        {!isAssessment && (
          <div className="md:text-right">
            <div className="text-gray-900 font-semibold">
              {t("examSection.timeLimit")}: {exam.time_limit ?? 0}{" "}
              {t("examSection.min")}
            </div>
            <div className="text-gray-500 text-sm">
              {t("examSection.passingScore")}: {passing}%
            </div>
            <div className="text-gray-500 text-sm">
              {t("examSection.attempt")} {Math.min(nextAttempt, MAX_ATTEMPTS)}{" "}
              {/* {t("examSection.of")} {MAX_ATTEMPTS} */}
            </div>
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const choices = Array.isArray(q.choices) ? q.choices : [];
          const correctCount = choices.filter((c) => c.is_correct).length;
          const multi = correctCount > 1;
          const selected = answers[q.id] ?? new Set<string>();

          return (
            <div
              key={q.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-gray-900 font-semibold">
                  {idx + 1}. {q.text}
                </h4>
              </div>
              <div className="space-y-2">
                {choices.map((c, ci) => {
                  const checked = selected.has(c.id);
                  // disable inputs when not actively taking (either after submit or when viewing server latest)
                  const disabledInput = !isRetaking || submitted;
                  return (
                    <label
                      key={c.id}
                      className="flex items-center p-3 rounded border border-gray-200 bg-white cursor-pointer"
                    >
                      <input
                        type={multi ? "checkbox" : "radio"}
                        name={`q-${q.id}`}
                        value={c.id}
                        checked={checked}
                        disabled={disabledInput}
                        onChange={() => toggleAnswer(q.id, c.id, multi)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 ltr:mr-3 rtl:ml-3"
                      />
                      <span className="text-gray-800">
                        <span className="text-sm font-medium text-gray-500 ltr:mr-2 rtl:ml-2">
                          {String.fromCharCode(65 + ci)}.
                        </span>
                        {c.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between">
        {/* IMPORTANT: show submit controls when the user is actively taking (isRetaking === true).
            otherwise show summary (viewing last attempt). */}
        {isRetaking ? (
          <>
            <div className="text-gray-500 text-sm">
              {/* {attemptsCount < MAX_ATTEMPTS
                ? `${t("examSection.ansAll")}: ${attemptsLeft}`
                : t("examSection.noAttempts")} */}
              {t("examSection.ansAll")}
              {!isAssessment && t("examSection.attemptsLeft")}
            </div>
            <button
              onClick={submitExam}
              disabled={submitDisabled}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {isPending
                ? t("examSection.submitting")
                : `${t("examSection.submit")}  `}
            </button>
          </>
        ) : (
          <div className="flex flex-col items-start justify-start gap-4 w-full">
            <div className="text-sm text-gray-500">
              {isFetchingSummary
                ? t("examSection.loadRes")
                : `${t("examSection.submittedAt")}: ${formatDateTimeSimple(
                    latest?.submitted_at ?? "",
                    { locale: i18n.language, t: t }
                  )}`}
            </div>

            {!isAssessment && (
              <>
                <button
                  onClick={() => setShowResultModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 transition-colors"
                >
                  <Award className="w-4 h-4" />
                  {t("examSection.viewResult")}
                </button>

                <div className="text-sm text-gray-500">
                  {t("examSection.correct")}: {correct} ·{" "}
                  {t("examSection.incorrect")}: {incorrect} ·{" "}
                  {t("examSection.attempt")} #{latest?.attempt ?? nextAttempt}
                </div>
              </>
            )}

            <div className="flex sm:gap-4 gap-2 items-center flex-col sm:flex-row w-full sm:w-fit">
              <button
                onClick={retake}
                disabled={!canRetake}
                className="px-4 py-2 rounded-lg border sm:w-52 w-full border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {t("examSection.retake")}
                {/* {reachedMaxAttempts
                  ? t("examSection.noAttemptsLeft")
                  : t("examSection.retake")} */}
              </button>
              <button
                onClick={onClose}
                className="bg-gray-800 text-white px-6 py-2 sm:w-52 w-full rounded-lg hover:bg-gray-900 transition-colors"
              >
                {t("examSection.continue")}
              </button>
            </div>
          </div>
        )}
      </div>

      {showResultModal && latest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
            <button
              onClick={handleCloseResultModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t("examSection.resultModal.close")}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400 text-white px-8 pt-10 pb-12 text-center">
              <p className="uppercase tracking-wide text-xs font-semibold opacity-80">
                {t("examSection.resultModal.attemptLabel", {
                  attempt: latest?.attempt ?? nextAttempt,
                })}
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {t("examSection.resultModal.title", { type: examTypeLabel })}
              </h2>
              <p className="mt-3 text-sm text-purple-100">
                {t("examSection.resultModal.subtitle", {
                  correct,
                  total: totalQuestions,
                })}
              </p>

              <div className="mt-8 mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/40 bg-white/10 backdrop-blur-sm">
                <div className="text-center">
                  <span className="block text-3xl font-extrabold">
                    {percent}%
                  </span>
                  <span className="text-xs uppercase tracking-wide">
                    {t("examSection.resultModal.scoreLabel")}
                  </span>
                </div>
              </div>

              <div className="mt-6 text-sm font-medium">
                {passed
                  ? t("examSection.resultModal.passed", { type: examTypeLabel })
                  : t("examSection.resultModal.failed", {
                      type: examTypeLabel,
                    })}
              </div>
            </div>

            <div className="px-8 py-6 space-y-4">
              <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                    passed
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {passed
                    ? t("examSection.resultModal.passedTag")
                    : t("examSection.resultModal.failedTag")}
                </span>
                <span>
                  {t("examSection.score")}: {correct}/{totalQuestions} ·{" "}
                  {percent}%
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* <button
                  onClick={handleViewCertificate}
                  disabled={!passed}
                  className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                    passed
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Award className="w-4 h-4" />
                  {t("examSection.resultModal.viewCertificate")}
                </button> */}
                <button
                  onClick={() => {
                    handleCloseResultModal();
                    retake();
                  }}
                  disabled={!canRetake}
                  className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors border ${
                    canRetake
                      ? "border-purple-200 text-purple-700 hover:bg-purple-50"
                      : "border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  {t("examSection.resultModal.retake")}
                </button>
                <button
                  onClick={() => {
                    handleCloseResultModal();
                    onClose();
                  }}
                  className="w-full rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t("examSection.continue")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
