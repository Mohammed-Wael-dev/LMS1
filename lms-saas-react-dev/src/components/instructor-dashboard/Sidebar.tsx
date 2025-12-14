import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import { useTranslation } from "react-i18next";
import FeatureGate from "../settings/FeatureGate";

export default function InstructorDashboardSidebar() {
  const { t } = useTranslation("instructorDashboard"); // namespace
  const { data } = useCustomQuery(API_ENDPOINTS.instructorStats, [
    "instructor-stats",
  ]);

  const stats: InstructorStats = data?.data;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t("sidebar.quickActions")}
        </h3>
        <div className="space-y-3">
          <FeatureGate
            flag="is_review_enabled"
            loadingFallback={null}
            fallback={null}
          >
            <button className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              {t("sidebar.viewAllReviews")}
            </button>
          </FeatureGate>
          <button className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            {t("sidebar.downloadReports")}
          </button>
          <button className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            {t("sidebar.managePayouts")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t("sidebar.thisMonth")}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">{t("sidebar.newStudents")}</span>
            <span className="font-semibold text-gray-900">
              +{stats?.new_students ?? 0}
            </span>
          </div>
          <FeatureGate flag="is_price_enabled">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t("sidebar.revenue")}</span>
              <span className="font-semibold text-green-600">
                +${stats?.revenue_this_month ?? 0}
              </span>
            </div>
          </FeatureGate>
          {/* <div className="flex items-center justify-between">
            <span className="text-gray-600">{t("sidebar.courseViews")}</span>
            <span className="font-semibold text-gray-900">+{stats?.}</span>
          </div> */}
          <FeatureGate
            flag="is_review_enabled"
            loadingFallback={null}
            fallback={null}
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-600">{t("sidebar.newReviews")}</span>
              <span className="font-semibold text-gray-900">
                +{stats?.new_reviews ?? 0}
              </span>
            </div>
          </FeatureGate>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t("sidebar.tipsTitle")}
        </h3>
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="font-medium text-blue-900">
              {t("sidebar.tipEngageTitle")}
            </p>
            <p className="text-blue-700">{t("sidebar.tipEngageDesc")}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="font-medium text-green-900">
              {t("sidebar.tipUpdateTitle")}
            </p>
            <p className="text-green-700">{t("sidebar.tipUpdateDesc")}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="font-medium text-purple-900">
              {t("sidebar.tipPromoteTitle")}
            </p>
            <p className="text-purple-700">{t("sidebar.tipPromoteDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
