import { useMemo } from "react";
import { useParams, Link } from "react-router";
import { useCustomQuery } from "../../../hooks/useQuery";
import { API_ENDPOINTS } from "../../../utils/constants";
import {
  BarChart3,
  HelpCircle,
  ListChecks,
  Users,
  ChevronLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface AssessmentStatistics {
  id: string;
  title: string;
  description: string;
  total_questions: number;
  total_students_attempted: number;
  questions: {
    id: string;
    text: string;
    total_answers: number;
    choices: {
      id: string;
      text: string;
      answer_count: number;
      percentage: number;
    }[];
  }[];
}

export default function Assessment() {
  const { t } = useTranslation("courseDetails");
  const { assessmentId } = useParams();
  const { data, isLoading } = useCustomQuery(
    `${API_ENDPOINTS.assessments}${assessmentId}/statistics/?latest_attempts=true`,
    ["assessments-statistics", assessmentId],
    undefined,
    !!assessmentId
  );

  const statistics: AssessmentStatistics | undefined = data?.data;

  // derived numbers (safe)
  const totals = useMemo(() => {
    if (!statistics)
      return { q: 0, students: 0, answers: 0, avgAnswersPerQ: 0 };
    const q = statistics.total_questions ?? statistics.questions?.length ?? 0;
    const students = statistics.total_students_attempted ?? 0;
    const answers = (statistics.questions ?? []).reduce(
      (acc, q) => acc + (q.total_answers ?? 0),
      0
    );
    const avgAnswersPerQ = q ? answers / q : 0;
    return { q, students, answers, avgAnswersPerQ };
  }, [statistics]);

  // UI bits
  if (!assessmentId) {
    return (
      <div className="p-6">
        <EmptyState
          title={t("assessmentsPage.emptyState.title")}
          desc={t("assessmentsPage.emptyState.desc")}
          action={
            <Link
              to=".."
              className="inline-flex items-center gap-1 text-purple-700 hover:underline"
            >
              <ChevronLeft className="w-4 h-4" />
              {t("assessmentsPage.emptyState.back")}
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!statistics || !statistics.questions?.length) {
    return (
      <div className="p-6">
        <Header
          title={statistics?.title || t("assessmentsPage.statsCards.header")}
          description={statistics?.description}
          id={statistics?.id || assessmentId}
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard
            icon={<ListChecks className="w-5 h-5 text-purple-600" />}
            label={t("assessmentsPage.statsCards.questionLabel")}
            value={String(totals.q)}
          />
          <StatCard
            icon={<Users className="w-5 h-5 text-indigo-600" />}
            label={t("assessmentsPage.statsCards.attemptedLabel")}
            value={String(totals.students)}
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
            label={t("assessmentsPage.statsCards.totalLabel")}
            value={String(totals.answers)}
          />
        </div>
        <div className="mt-8">
          <EmptyState
            title={t("assessmentsPage.statsCards.title")}
            desc={t("assessmentsPage.statsCards.desc")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header
        title={statistics.title}
        description={statistics.description}
        id={statistics.id}
      />

      {/* Top stats */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<ListChecks className="w-5 h-5 text-purple-600" />}
          label={t("assessmentsPage.statsCards.questionLabel")}
          value={String(totals.q)}
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          label={t("assessmentsPage.statsCards.attemptedLabel")}
          value={String(totals.students)}
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
          label={t("assessmentsPage.statsCards.totalLabel")}
          value={String(totals.answers)}
        />
        <StatCard
          icon={<HelpCircle className="w-5 h-5 text-emerald-600" />}
          label={t("assessmentsPage.statsCards.answersLabel")}
          value={totals.avgAnswersPerQ.toFixed(1)}
        />
      </div>

      {/* Questions */}
      <div className="mt-8 space-y-4">
        {statistics.questions.map((q, qi) => {
          const total = Math.max(0, q.total_answers || 0);
          const topChoice = [...(q.choices || [])].sort(
            (a, b) => (b.percentage || 0) - (a.percentage || 0)
          )[0];

          return (
            <div
              key={q.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-start sm:flex-row flex-col justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                    {t("assessmentsPage.question", { qi: qi + 1 })}
                  </div>
                  <h3 className="mt-1 font-medium text-gray-900">{q.text}</h3>
                </div>
                <div className="flex sm:items-center items-start gap-2 flex-col sm:flex-row">
                  <span className="inline-flex items-center text-xs font-semibold text-gray-700 bg-gray-100 rounded-full px-2 py-1">
                    {t("assessmentsPage.answers", { total })}
                  </span>
                  {topChoice && (topChoice.percentage ?? 0) > 0 && (
                    <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-1">
                      {t("assessmentsPage.top")} {topChoice.text} •{" "}
                      {Math.round(topChoice.percentage)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {q.choices.map((c) => {
                  const pct = clampPct(c.percentage);
                  return (
                    <div key={c.id} className="w-full">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-800">{c.text}</div>
                        <div className="text-gray-500 tabular-nums">
                          {c.answer_count} • {pct}%
                        </div>
                      </div>
                      <div className="mt-1 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600"
                          style={{ width: `${pct}%` }}
                          aria-label={`${c.text} ${pct}%`}
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pct}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- helpers & tiny components ---------- */

function clampPct(v?: number) {
  const n = Number.isFinite(v as number) ? Number(v) : 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function Header(props: { title?: string; description?: string; id?: string }) {
  const { t } = useTranslation("courseDetails");
  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-5 shadow">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {props.title || t("assessmentsPage.statsCards.header")}
          </h1>
          {props.description && (
            <p className="mt-1 text-purple-100">{props.description}</p>
          )}
        </div>
        {/* <div className="hidden sm:flex">
          <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg text-sm">
            <HelpCircle className="w-4 h-4" />
            ID: {props.id}
          </span>
        </div> */}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 border border-gray-200">
          {icon}
        </div>
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-lg font-semibold text-gray-900 tabular-nums">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-50 border border-purple-100">
        <BarChart3 className="w-6 h-6 text-purple-700" />
      </div>
      <h3 className="mt-3 text-lg font-semibold text-gray-900">{title}</h3>
      {desc && <p className="mt-1 text-gray-600">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="h-24 rounded-xl bg-gradient-to-r from-purple-200 to-indigo-200" />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="mt-3 h-6 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="mt-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="h-5 w-64 bg-gray-200 rounded" />
            <div className="mt-4 space-y-2">
              {[...Array(4)].map((__, j) => (
                <div key={j} className="w-full">
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-3 w-1/2 bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* <div className="fixed bottom-5 right-5 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm text-gray-600 inline-flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading…
      </div> */}
    </div>
  );
}
