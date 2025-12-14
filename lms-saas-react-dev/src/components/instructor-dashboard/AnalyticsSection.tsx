import { Star, Users } from "lucide-react";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import { useTranslation } from "react-i18next";
import FeatureGate from "../settings/FeatureGate";

type Analytics = {
  monthlyRevenue: number[];
  studentGrowth: number[];
  coursePerformance: {
    name: string;
    students: number;
    revenue: number;
    rating: number;
  }[];
  topCountries: {
    country: string;
    students: number;
    percentage: number;
  }[];
};

export default function AnalyticsSection() {
  const { t } = useTranslation("instructorDashboard");
  const { data } = useCustomQuery(API_ENDPOINTS.instructorCourseStats, [
    "instructor-courses",
  ]);

  const instructorCourses: InstructorCourses[] = data?.data ?? [];

  const analyticsData = {
    monthlyRevenue: [3200, 3800, 4200, 4800, 5200, 5800, 6200],
    studentGrowth: [1200, 1450, 1680, 1920, 2150, 2380, 2650],
    coursePerformance: instructorCourses?.map((c) => {
      return {
        name: c?.title ?? "",
        students: c?.total_students ?? 0,
        revenue: c?.revenue ?? 0,
        rating: c?.average_rating ?? 0,
      };
    }),
    topCountries: [
      { country: "United States", students: 3200, percentage: 35 },
      { country: "India", students: 2100, percentage: 23 },
      { country: "United Kingdom", students: 1800, percentage: 20 },
      { country: "Canada", students: 1200, percentage: 13 },
      { country: "Australia", students: 850, percentage: 9 },
    ],
  };

  const analytics: Analytics = analyticsData ?? {};

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {t("analytics.coursePerformance")}
        </h3>
        <div className="space-y-4">
          {analytics.coursePerformance.map((course, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div>
                <h4 className="font-medium text-gray-900">{course.name}</h4>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <Users className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                  <span className="ltr:mr-4 rtl:ml-4">
                    {course.students.toLocaleString()} {t("courses.students")}
                  </span>
                  <FeatureGate
                    flag="is_review_enabled"
                    loadingFallback={null}
                    fallback={null}
                  >
                    <Star className="w-4 h-4 ltr:mr-1 rtl:ml-1 text-yellow-400" />
                    <span>{course.rating}</span>
                  </FeatureGate>
                </div>
              </div>
              <FeatureGate flag="is_price_enabled">
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    ${course.revenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t("courses.revenue")}
                  </p>
                </div>
              </FeatureGate>
            </div>
          ))}
        </div>
      </div>

      {/* <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Student Growth
        </h3>
        <div className="h-64 bg-gray-100 rounded-lg flex items-end justify-center p-4">
          <div className="flex items-end gap-2 h-full">
            {analytics.studentGrowth.map((value, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className="bg-blue-600 rounded-t w-8 transition-all duration-300 hover:bg-blue-700"
                  style={{
                    height: `${
                      (value / Math.max(...analytics.studentGrowth)) * 100
                    }%`,
                  }}
                />
                <span className="text-xs text-gray-500 mt-2">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"][index]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Top Countries
        </h3>
        <div className="space-y-4">
          {analytics.topCountries.map((country, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center ltr:mr-3 rtl:ml-3">
                  <span className="text-xs font-medium">{index + 1}</span>
                </div>
                <span className="font-medium text-gray-900">
                  {country.country}
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 ltr:mr-3 rtl:ml-3">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${country.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-16 text-right">
                  {country.students.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
}
