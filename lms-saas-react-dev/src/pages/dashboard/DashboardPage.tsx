import React from "react";
import { useNavigate } from "react-router";
import { useCustomQuery } from "../../hooks/useQuery";
import { ACCESS_TOKEN_KEY, API_ENDPOINTS } from "../../utils/constants";
import EnrolledCourses from "../../components/dashboard/EnrolledCourses";
import { readUserFromStorage, roleOf } from "../../services/auth";
import HeaderStatistics from "../../components/dashboard/HeaderStatistics";
import { useTranslation } from "react-i18next";
import { getCookie } from "../../services/cookies";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("studentDashboard");

  const currentUser: User = readUserFromStorage();
  const isStudent = roleOf(currentUser) === "student";
  const token = getCookie(ACCESS_TOKEN_KEY);
  const enrolledCoursesData = useCustomQuery(
    `${API_ENDPOINTS.enrolledCourses}`,
    ["enrolledCourses"],
    {
      headers: {
        ...(isStudent && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
    !!isStudent
  );

  const { data: studentStatsData } = useCustomQuery(
    API_ENDPOINTS.studentStats,
    ["student-stats", currentUser?.id],
    undefined,
    !!isStudent
  );

  const studentStats: StudentStats = studentStatsData?.data;
  const enrolledCourses: EnrolledCourse[] =
    enrolledCoursesData?.data?.data ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {t("header.welcome", { name: currentUser?.first_name ?? "" })}
                </h1>
                <p className="text-purple-100 text-lg">
                  {t("header.subtitle")}
                </p>
              </div>
              <div className="hidden md:block">
                <div className="bg-white bg-opacity-20 backdrop-blur-lg rounded-xl p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold mb-1">
                      {studentStats?.overall_progress ?? 0}%
                    </div>
                    <div className="text-purple-100 text-sm">
                      {t("header.overallProgress")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <HeaderStatistics stats={studentStats} />

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">
                  {t("coursesSection.title")}
                </h3>
                <button
                  onClick={() => navigate("/catalog")}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg"
                >
                  {t("coursesSection.exploreMore")}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {enrolledCourses.map((item) => (
                  <EnrolledCourses
                    item={item}
                    key={item.id}
                    isStudent={isStudent}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6 h-full">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                {t("quickActions.title")}
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/catalog")}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 font-medium shadow-lg"
                >
                  {t("quickActions.browseNew")}
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 font-medium"
                >
                  {t("quickActions.viewCerts")}
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 font-medium"
                >
                  {t("quickActions.updateProfile")}
                </button>
              </div>
            </div>

            {/* Recent Achievements (if you add later) */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
