import { Award, BookOpen, Clock, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HeaderStatisticsProps {
  stats: StudentStats;
}

export default function HeaderStatistics({ stats }: HeaderStatisticsProps) {
  const { t } = useTranslation("studentDashboard");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-blue-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-center">
          <div className="p-4 rounded-xl bg-blue-50">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ltr:ml-4 rtl:mr-4">
            <p className="text-3xl font-bold text-gray-900">
              {stats?.enrolled_courses ?? 0}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {t("headerStats.coursesEnrolled")}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-green-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-center">
          <div className="p-4 rounded-xl bg-green-50">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
          <div className="ltr:ml-4 rtl:mr-4">
            <p className="text-3xl font-bold text-gray-900">
              {stats?.courses_completed ?? 0}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {t("headerStats.completedCourses")}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-purple-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-center">
          <div className="p-4 rounded-xl bg-purple-50">
            <Award className="w-6 h-6 text-purple-600" />
          </div>
          <div className="ltr:ml-4 rtl:mr-4">
            <p className="text-3xl font-bold text-gray-900">
              {stats?.certificates_earned ?? 0}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {t("headerStats.certificates")}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-orange-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-center">
          <div className="p-4 rounded-xl bg-orange-50">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
          <div className="ltr:ml-4 rtl:mr-4">
            <p className="text-3xl font-bold text-gray-900">
              {stats?.new_courses_this_month ?? 0}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {t("headerStats.newCourses")}
            </p>
            <p className="text-xs text-gray-500 font-medium">
              {t("headerStats.thisMonth")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
