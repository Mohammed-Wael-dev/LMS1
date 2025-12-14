import { DollarSign, Eye, LucideIcon, Star, Users } from "lucide-react";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import { useTranslation } from "react-i18next";
import { useFeatureFlag } from "../../hooks/useSettings";

type StatKey = "students" | "revenue" | "avgRating" | "reviews";

type DisplayedStats = {
  key: StatKey;
  label: string;
  value: number;
  Icon: LucideIcon;
  color: string;
  bg: string;
  change?: number;
};

export default function StatisticsCards() {
  const { t } = useTranslation("instructorDashboard");
  const {
    enabled: reviewsEnabled,
    isError: reviewsError,
    isFetching: reviewsFetching,
    isLoading: reviewsLoading,
  } = useFeatureFlag("is_review_enabled", true);
  const {
    enabled: pricingEnabled,
    isError: pricingError,
    isFetching: pricingFetching,
    isLoading: pricingLoading,
  } = useFeatureFlag("is_price_enabled", true);

  const { data } = useCustomQuery(API_ENDPOINTS.instructorStats, [
    "instructor-stats",
  ]);
  const stats: InstructorStats | undefined = data?.data;

  const baseItems: DisplayedStats[] = [
    {
      key: "students",
      label: t("statisticsCards.totalStudents"),
      value: stats?.total_students ?? 0,
      Icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
      change: stats?.new_students ?? 0,
    },
    {
      key: "revenue",
      label: t("statisticsCards.totalRevenue"),
      value: stats?.revenue ?? 0,
      Icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      key: "avgRating",
      label: t("statisticsCards.averageRating"),
      value: stats?.average_rating ?? 0,
      Icon: Star,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
    {
      key: "reviews",
      label: t("statisticsCards.totalReviews"),
      value: stats?.total_reviews ?? 0,
      Icon: Eye,
      color: "text-purple-600",
      bg: "bg-purple-100",
      change: stats?.new_reviews ?? 0,
    },
  ];

  const visible = baseItems
    .filter((item) =>
      !reviewsEnabled || reviewsError || reviewsLoading || reviewsFetching
        ? !["avgRating", "reviews"].includes(item.key)
        : true
    )
    .filter((i) =>
      !pricingEnabled || pricingError || pricingLoading || pricingFetching
        ? !["revenue"].includes(i.key)
        : true
    );

  const count = visible.length;
  const gridClass =
    count <= 1
      ? "grid-cols-3"
      : count === 2
      ? "grid-cols-1 md:grid-cols-2"
      : count === 3
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid ${gridClass} gap-6 mb-8`}>
      {visible.map((stat) => (
        <div
          key={stat.key}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div className="ltr:ml-4 rtl:mr-4">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
            {stat?.change && stat?.change > 0 ? (
              <div className="text-right">
                <span className="text-sm font-medium text-green-600">
                  +{stat.change}
                </span>
                <p className="text-xs text-gray-500">
                  {t("statisticsCards.vsLastMonth")}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
