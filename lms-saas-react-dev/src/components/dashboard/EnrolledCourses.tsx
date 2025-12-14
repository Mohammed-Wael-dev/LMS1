import { Clock, Play, Star } from "lucide-react";
import { useNavigate } from "react-router";
import { formatDateTimeSimple } from "../../utils/formatDateTime";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import { formatDuration } from "../../utils/formatDuration";
import { useTranslation } from "react-i18next";
import FeatureGate from "../settings/FeatureGate";

export default function EnrolledCourses({
  item,
  isStudent,
}: {
  item: EnrolledCourse;
  isStudent: boolean;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation("studentDashboard");
  const { t: y, i18n } = useTranslation();

  const { data: catesData } = useCustomQuery(`${API_ENDPOINTS.categories}`, [
    "categories",
  ]);

  const { data: instructorData } = useCustomQuery(
    `${API_ENDPOINTS.instructor}${item?.course?.instructor}/course/${item?.course?.id}/`,
    ["instructor", item?.course?.id],
    undefined,
    !!item?.course?.id && !!item?.course?.instructor
  );

  const { data: enrollStatsData } = useCustomQuery(
    `${API_ENDPOINTS.studentEnrollements}${item?.course?.id}/`,
    ["student-enrollements", item?.course?.id],
    undefined,
    !!isStudent
  );

  const enrollStats: EnrolledCourseStats[] = enrollStatsData?.data ?? [];

  const currentEnrollStat = enrollStats?.find((s) => s.id === item?.course?.id);
  console.log(currentEnrollStat);
  const cates: Category[] = catesData?.data?.data ?? [];

  const currentCategory = cates?.find(
    (c) => c.id === item?.course?.sub_category
  );

  const instructor: any = instructorData?.data?.[0];

  return (
    <div
      key={item?.course?.id}
      className="group ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-gray-50 to-white rounded-xl p-6 border border-gray-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg"
    >
      <div className="flex items-start">
        <div className="relative">
          <img
            src={
              item?.course?.picture ??
              "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg"
            }
            alt={item?.course?.title}
            className="w-24 h-24 rounded-xl object-cover"
          />
          <button
            onClick={() => {
              navigate(`/catalog/${item?.course?.id}/player`);
            }}
            className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all duration-300 flex items-center justify-center"
          >
            <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>
        <div className="ltr:ml-6 rtl:mr-6 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900 mb-2">
                {item?.course?.title}
              </h4>
              <div className="flex items-center mb-3">
                {instructor?.instructor?.profile_image ? (
                  <img
                    src={instructor?.instructor?.profile_image}
                    alt={instructor?.instructor?.first_name}
                    className="w-6 h-6 rounded-full ltr:mr-2 rtl:ml-2"
                  />
                ) : (
                  <div className="w-6 h-6 bg-purple-600 ltr:mr-2 rtl:ml-2 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {instructor?.instructor?.first_name
                        ?.charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                )}
                <p className="text-gray-600">
                  {instructor?.instructor?.first_name}{" "}
                  {instructor?.instructor?.last_name}
                </p>
              </div>
              <div className="flex items-center text-sm text-gray-500 mb-4">
                {currentCategory && (
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium ltr:mr-4 rtl:ml-4">
                    {currentCategory?.name}
                  </span>
                )}
                <Clock className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                <span className="ltr:mr-4 rtl:ml-4">
                  {formatDuration(
                    currentEnrollStat?.total_hours,
                    i18n.language
                  )}
                </span>
                <FeatureGate flag="is_review_enabled">
                  {Array.from({ length: 5 }).map((_, i) =>
                    i < (currentEnrollStat?.average_rating ?? 0) ? (
                      <Star
                        key={i + 9000}
                        className="w-4 h-4 ltr:mr-1 rtl:ml-1 text-yellow-400 fill-current"
                      />
                    ) : (
                      <Star
                        key={i + 9050}
                        className="text-gray-300 w-4 h-4 ltr:mr-1 rtl:ml-1"
                      />
                    )
                  )}
                  <span className="ltr:mr-4 rtl:ml-4">
                    ({currentEnrollStat?.average_rating ?? 0})
                  </span>
                </FeatureGate>
                <span className="text-gray-400">
                  {t("enrolledCourses.lastAccessed")}{" "}
                  {formatDateTimeSimple(
                    currentEnrollStat?.last_accessed ?? item?.date_enrolled,
                    {
                      locale: i18n.language,
                      t: y,
                    }
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 ltr:mr-6 rtl:ml-6">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span className="font-medium">
                      {currentEnrollStat?.progress} %
                    </span>
                    <span>{currentEnrollStat?.lessons_progress}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${currentEnrollStat?.progress}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() =>
                    navigate(`/catalog/${item?.course?.id}/player`)
                  }
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {t("enrolledCourses.continue")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
