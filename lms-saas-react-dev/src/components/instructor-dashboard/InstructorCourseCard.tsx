import { Edit, Eye, Star, Trash2, Users } from "lucide-react";
import { NavigateFunction } from "react-router";
import { API_ENDPOINTS } from "../../utils/constants";
import { useCustomRemove } from "../../hooks/useMutation";
import handleErrorAlerts from "../../utils/showErrorMessages";
import toast from "react-hot-toast";
import { useState } from "react";
import DeleteConfirmation from "../reusable-components/DeleteConfirmation";
import { useTranslation } from "react-i18next";
import FeatureGate from "../settings/FeatureGate";

interface Props {
  navigate: NavigateFunction;
  course: InstructorCourses;
}

export default function InstructorCourseCard({ course, navigate }: Props) {
  const { t } = useTranslation("instructorDashboard");

  const { mutateAsync: deleteCourse } = useCustomRemove(
    `${API_ENDPOINTS.deleteCourse}${course?.id}`,
    ["instructor-courses"]
  );

  const handleDeleteCourse = async () => {
    try {
      const res = await deleteCourse();

      if (res?.status) {
        toast?.success("Course deleted successfully!");
      }
    } catch (error: any) {
      const payload = error?.resposne?.data?.error;

      handleErrorAlerts(payload);
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  return (
    <>
      {/* Above md screen course card */}
      <div
        key={course?.title}
        className="border border-gray-200 rounded-lg p-4 md:block hidden"
      >
        <div className="flex items-start">
          <img
            src={
              course?.picture ??
              "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg"
            }
            alt={course?.title}
            className="w-20 h-20 rounded-lg object-cover"
          />
          <div className="ltr:ml-4 rtl:mr-4 flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  {course?.title}
                </h4>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Users className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                  <span className="ltr:mr-4 rtl:ml-4">
                    {course?.total_students ?? 0} {t("courses.students")}
                  </span>
                  <FeatureGate
                    flag="is_review_enabled"
                    loadingFallback={null}
                    fallback={null}
                  >
                    <Star className="w-4 h-4 ltr:mr-1 rtl:ml-1 text-yellow-400" />
                    <span className="ltr:mr-1 rtl:ml-1">
                      {course?.average_rating ?? 0}
                    </span>
                    <span>
                      ({course?.total_reviews ?? 0} {t("courses.reviews")})
                    </span>
                  </FeatureGate>
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <span className="ltr:mr-4 rtl:ml-4">
                    {t("courses.revenue")}: {course?.revenue ?? 0}
                  </span>
                  <span className="ltr:mr-4 rtl:ml-4">
                    {t("courses.completion")}: {course?.completion ?? 0}%
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      course?.is_published
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {course?.is_published
                      ? t("courses.publish")
                      : t("courses.draft")}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${course?.completion ?? 0}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/catalog/${course?.id}`)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title={t("courses.viewCourse")}
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate(`/course-builder/${course?.id}`)}
                  className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                  title={t("courses.editCourse")}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title={t("courses.deleteCourse")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Below md screen course card */}
      <div className="block md:hidden bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="relative">
          <img
            src={
              course?.picture ??
              "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg"
            }
            alt={course?.title}
            className="object-cover w-full md:h-60 h-52"
          />
        </div>

        <div className="md:p-6 p-2">
          <div>
            <div className="flex flex-col items-start justify-start w-full md:gap-4 gap-2">
              <h3 className="md:text-lg font-bold text-gray-900 line-clamp-2">
                {course?.title}
              </h3>

              <div className="flex md:items-center items-start justify-start gap-4 w-full md:flex-row flex-col">
                <FeatureGate
                  flag="is_review_enabled"
                  loadingFallback={null}
                  fallback={null}
                >
                  <div className="flex items-center">
                    <span className="text-yellow-500 font-bold ltr:mr-1 rtl:ml-1">
                      {course?.average_rating ?? 0}
                    </span>
                    <Star className="w-4 h-4 ltr:mr-1 rtl:ml-1 text-yellow-400" />
                    <span className="text-gray-500 text-sm ltr:ml-2 rtl:mr-2">
                      ({course?.total_reviews ?? 0} {t("courses.reviews")})
                    </span>
                  </div>
                </FeatureGate>

                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                  <span>
                    {course?.total_students ?? 0} {t("courses.students")}
                  </span>
                </div>
              </div>

              <div className="flex md:items-center items-start md:flex-row flex-col gap-4 text-sm text-gray-600 w-full">
                <span className="ltr:mr-4 rtl:ml-4">
                  {t("courses.revenue")}: {course?.revenue ?? 0}
                </span>
                <span className="ltr:mr-4 rtl:ml-4">
                  {t("courses.completion")}: {course?.completion ?? 0}%
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    course?.is_published
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {course?.is_published
                    ? t("courses.publish")
                    : t("courses.draft")}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${course?.completion ?? 0}%` }}
                />
              </div>
              <div className="flex items-center gap-4 w-full justify-center">
                <button
                  onClick={() => navigate(`/catalog/${course?.id}`)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title={t("courses.viewCourse")}
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    navigate(`/course-builder/${course?.id}`);
                  }}
                  className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                  title={t("courses.editCourse")}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title={t("courses.deleteCourse")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DeleteConfirmation
        handleDelete={handleDeleteCourse}
        isOpen={isDeleteModalOpen}
        onClose={setIsDeleteModalOpen}
        text={t("courses.delConfirmText")}
        // title={`Delete ${course?.title} course`}
        title={t("courses.delConfirmTitle", { title: course?.title ?? "" })}
      />
    </>
  );
}
