import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import StatisticsCards from "../../components/instructor-dashboard/StatisticsCards";
import CoursesSection from "../../components/instructor-dashboard/CoursesSection";
import AnalyticsSection from "../../components/instructor-dashboard/AnalyticsSection";
import ReviewsSection from "../../components/instructor-dashboard/ReviewsSection";
// import InstructorDashboardSidebar from "../../components/instructor-dashboard/Sidebar";
import Modal from "../../components/reusable-components/Modal";
import { useCustomPost } from "../../hooks/useMutation";
import { API_ENDPOINTS } from "../../utils/constants";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import handleErrorAlerts from "../../utils/showErrorMessages";
import { useTranslation } from "react-i18next";
import { useFeatureFlag } from "../../hooks/useSettings";

type FormValues = {
  title: string;
};

const InstructorPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("courses");
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const { t } = useTranslation("instructorDashboard");
  const {
    enabled: reviewsEnabled,
    isError: reviewsError,
    isFetching: reviewsFetching,
    isLoading: reviewsLoading,
  } = useFeatureFlag("is_review_enabled", true);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    // mode: "onChange",
    // reValidateMode: "onChange",
    defaultValues: { title: "" },
  });

  const { mutateAsync: createCourse } = useCustomPost(
    API_ENDPOINTS.createCourse,
    ["courses"]
  );

  const handleCreateCourseSubmit = async (data: FormValues) => {
    try {
      const formData = new FormData();
      formData.append("title", data.title);

      const res = await createCourse(formData);

      if (res.status) {
        toast.success("Course created successfully!");
        navigate(`/course-builder/${res?.data?.id}`);
      }
    } catch (error: any) {
      const payload = error?.response?.data?.error;
      handleErrorAlerts(payload || "There is an unexpected error occured.");
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex sm:items-center items-start sm:flex-row flex-col sm:justify-between justify-start gap-4 sm:gap-0 mb-8">
          <div>
            <h1 className="sm:text-3xl text-xl font-bold text-gray-900 mb-2">
              {t("mainTitle")}
            </h1>
            <p className="text-gray-600">{t("subTitle")}</p>
          </div>
          <button
            onClick={() => {
              setIsCreateCourseModalOpen(true);
            }}
            className="bg-purple-600 text-white sm:px-6 px-3 py-2 sm:py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
            {t("createCourse")}
          </button>
        </div>

        {/* Stats Cards */}
        <StatisticsCards />

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-8">
              {[
                { id: "courses", label: `${t("tabs.myCourses")}` },
                { id: "analytics", label: `${t("tabs.analytics")}` },
                { id: "reviews", label: `${t("tabs.reviews")}` },
              ].map((tab) => {
                if (
                  (!reviewsEnabled ||
                    reviewsError ||
                    reviewsFetching ||
                    reviewsLoading) &&
                  tab.id === "reviews"
                ) {
                  return;
                }
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? "border-purple-500 text-purple-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 gap-8">
          <div className="">
            {activeTab === "courses" && <CoursesSection />}

            {activeTab === "analytics" && <AnalyticsSection />}

            {activeTab === "reviews" && <ReviewsSection />}
          </div>

          {/* Sidebar */}
          {/* <InstructorDashboardSidebar /> */}
        </div>
      </div>
      <Modal
        isOpen={isCreateCourseModalOpen}
        onClose={() => {
          setIsCreateCourseModalOpen(false);
          reset();
        }}
        title={t("createCourseModal.title")}
      >
        <form
          onSubmit={handleSubmit(handleCreateCourseSubmit)}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("createCourseModal.label")}
            </label>
            <input
              type="text"
              {...register("title", {
                required: `${t("createCourseModal.error")}`,
              })}
              placeholder={t("createCourseModal.placeholder")}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base ${
                errors.title ? "border-red-300" : "border-gray-300"
              }`}
              autoFocus
            />
            {errors.title ? (
              <p className="text-sm text-red-500 mt-2">
                {errors.title.message}
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-2">
                {t("createCourseModal.errorFallback")}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              {t("createCourseModal.description.title")}
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>{t("createCourseModal.description.item0")}</li>
              <li>{t("createCourseModal.description.item1")}</li>
              <li>{t("createCourseModal.description.item2")}</li>
              <li>{t("createCourseModal.description.item3")}</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setIsCreateCourseModalOpen(false);
                reset();
              }}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isSubmitting}
            >
              {t("createCourseModal.cancel")}
            </button>
            <button
              type="submit"
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ltr:mr-2 rtl:ml-2"></div>
                  {t("createCourseModal.creating")}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {t("createCourse")}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InstructorPage;
