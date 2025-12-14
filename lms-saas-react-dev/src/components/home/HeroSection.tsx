// import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";

export default function HeroSection(dashboardStatsData: dashboardStats) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("home");
  const { data } = useCustomQuery(API_ENDPOINTS.lastCourseProgress, [
    "lastCourseProgress",
  ]);
  const lastCourseProgress = data?.data;
  function formatFractionalHours(fraction: number): {
    hours: number;
    minutes: number;
  } {
    if (isNaN(fraction) || fraction < 0) return { hours: 0, minutes: 0 };

    const hours = Math.floor(fraction);
    const minutes = Math.round((fraction - hours) * 60);

    return { hours, minutes };
  }
  return (
    <section className="relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 text-white overflow-hidden">
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1
                className={`text-5xl lg:text-7xl font-bold leading-tight ${
                  i18n.language === "ar" ? "flex gap-2" : ""
                }`}
              >
                {t("learn")}
                <span className="block text-yellow-400">{t("without")}</span>
                <span className="block">{t("limits")}</span>
              </h1>
              <p className="text-xl lg:text-2xl text-gray-200 max-w-lg">
                {t("description")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate("/catalog")}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                {t("startLearningToday")}
              </button>
              <button
                onClick={() => navigate("/catalog")}
                className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300"
              >
                {t("exploreCourses")}
              </button>
            </div>

            <div className="flex items-center gap-8 pt-8">
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {dashboardStatsData?.total_students ?? "-"}
                </div>
                <div className="text-gray-300">{t("students")}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {dashboardStatsData?.total_courses ?? "-"}
                </div>
                <div className="text-gray-300">{t("courses")}</div>
              </div>
              {/* <div className="text-center">
                <div className="text-3xl font-bold">70+</div>
                <div className="text-gray-300">{t("languages")}</div>
              </div> */}
            </div>
          </div>
          {lastCourseProgress && (
            <div className="relative">
              <div className="relative bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl p-8 border border-white border-opacity-20">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      {/* <Play className="w-6 h-6 text-white" /> */}
                      <img
                        src={lastCourseProgress?.picture}
                        alt={lastCourseProgress?.title}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                    <div>
                      {/* <h3 className="font-semibold">{t("featuredCourse")}</h3> */}
                      <h3 className="font-semibold">{lastCourseProgress?.title}</h3>
                      {/* <p className="text-gray-300">
                        {t("completeReactCourse")}
                      </p> */}
                      <p className="text-gray-300">
                        {lastCourseProgress?.category_name}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">{t("progress")}</span>
                      <span className="text-white font-semibold">
                        {(
                          (lastCourseProgress?.completed_lessons /
                            lastCourseProgress?.total_lessons) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        style={{
                          width: `${(
                            (lastCourseProgress?.completed_lessons /
                              lastCourseProgress?.total_lessons) *
                            100
                          ).toFixed(1)}%`,
                        }}
                        className={`bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full`}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-300">
                    <span>
                      {t("lessonsCompleted", {
                        completed: lastCourseProgress?.completed_lessons,
                        total: lastCourseProgress?.total_lessons,
                      })}
                    </span>
                    <span>
                      {t(
                        "timeRemaining",
                        formatFractionalHours(
                          lastCourseProgress?.remaining_hours
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
