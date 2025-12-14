import {
  Award,
  BookOpen,
  Clock,
  DollarSign,
  Eye,
  LucideIcon,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { readUserFromStorage, roleOf } from "../../services/auth";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import { useTranslation } from "react-i18next";
import { useFeatureFlag } from "../../hooks/useSettings";

interface LearningStatsProps {
  stats: StudentStats;
}

type InstructorItemKey = "students" | "revenue" | "avgRating" | "reviews";

type InstructorItem = {
  key: InstructorItemKey;
  label: string;
  value: number;
  Icon: LucideIcon;
  color: string;
  bg: string;
};

export default function LearningStats({ stats }: LearningStatsProps) {
  const profileData: User = readUserFromStorage();
  const isStudent = roleOf(profileData) === "student";

  const { t: y } = useTranslation("studentDashboard");
  const { t } = useTranslation("instructorDashboard");

  const { data } = useCustomQuery(API_ENDPOINTS.instructorStats, [
    "instructor-stats",
  ]);
  const insStats: InstructorStats | undefined = data?.data;

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

  const baseInstructorItems: InstructorItem[] = [
    {
      key: "students",
      label: t("statisticsCards.totalStudents"),
      value: insStats?.total_students ?? 0,
      Icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      key: "revenue",
      label: t("statisticsCards.totalRevenue"),
      value: insStats?.revenue ?? 0,
      Icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      key: "avgRating",
      label: t("statisticsCards.averageRating"),
      value: insStats?.average_rating ?? 0,
      Icon: Star,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
    {
      key: "reviews",
      label: t("statisticsCards.totalReviews"),
      value: insStats?.total_reviews ?? 0,
      Icon: Eye,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  const visibleInstructorItems = baseInstructorItems
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

  // const visibleInstructorItems =
  //   !reviewsEnabled || reviewsError || reviewsLoading || reviewsFetching
  //     ? baseInstructorItems.filter(
  //         (i) => !["avgRating", "reviews"].includes(i.key)
  //       )
  //     : baseInstructorItems;

  const count = visibleInstructorItems.length;
  const gridClass =
    count <= 1
      ? "grid-cols-1"
      : count === 2
      ? "grid-cols-1 md:grid-cols-2"
      : count === 3
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  if (isStudent) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center mb-3">
              <BookOpen className={`w-8 h-8 text-blue-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {stats?.courses_completed ?? 0}
            </p>
            <p className="text-sm text-gray-600">
              {y("headerStats.coursesEnrolled")}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center mb-3">
              <Clock className={`w-8 h-8 text-green-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {stats?.hours_learned ?? 0}
            </p>
            <p className="text-sm text-gray-600">
              {y("headerStats.hoursLearned")}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center mb-3">
              <Award className={`w-8 h-8 text-purple-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {stats?.certificates_earned ?? 0}
            </p>
            <p className="text-sm text-gray-600">
              {" "}
              {y("headerStats.certificates")}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center mb-3">
              <TrendingUp className={`w-8 h-8 text-orange-600`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {stats?.current_streak ?? 0}
            </p>
            <p className="text-sm text-gray-600">
              {y("headerStats.streakDays")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid ${gridClass} gap-6 mb-8`}>
      {visibleInstructorItems.map((stat) => (
        <div
          key={stat.key}
          className="bg-white rounded-xl shadow-sm p-6 text-center"
        >
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center mb-3">
              <stat.Icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {stat.value}
            </p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
