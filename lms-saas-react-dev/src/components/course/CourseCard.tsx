import React, { useEffect, useState } from "react";
import { Star, Clock, Users, Play } from "lucide-react";
import { useNavigate } from "react-router";
import { formatDuration } from "../../utils/formatDuration";
import useAuth from "../../store/useAuth";
import LoginPopup from "../auth-modals/LoginPopup";
import SignupPopup from "../auth-modals/SignupPopup";
import handleErrorAlerts from "../../utils/showErrorMessages";
import toast from "react-hot-toast";
// import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import { readUserFromStorage } from "../../services/auth";
import { useCustomPost } from "../../hooks/useMutation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import FeatureGate from "../settings/FeatureGate";

interface CourseCardProps {
  course: Course;
  coursePic: string | null;
  isListView?: boolean;
  enrolledCourses: EnrolledCourse[];
  isFetching: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  coursePic,
  isListView,
  enrolledCourses,
  isFetching,
}) => {
  const { t, i18n } = useTranslation("courseCatalog");
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const currentUser: User = readUserFromStorage();

  const computedEnrolled = enrolledCourses.some(
    (c) => String(c?.course?.id) === String(course?.id ?? course?.id)
  );

  const [enrolledOptimistic, setEnrolledOptimistic] = useState(false);

  const isInstructorCourse =
    currentUser?.is_instructor && course?.instructor?.id === currentUser?.id;

  const isEnrolled = isInstructorCourse
    ? true
    : enrolledOptimistic || computedEnrolled;

  const createEnroll = useCustomPost(API_ENDPOINTS.createEnrollment, [
    "enrolledCourses",
    "course",
    course?.id as string,
  ]);

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showSignupModal, setShowSignupModal] = useState<boolean>(false);

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      toast.error(t("card.handleEnroll.authError"));
      setShowLoginModal(true);
      return;
    }
    if (isEnrolled || createEnroll.isPending) return;

    try {
      if (currentUser?.is_instructor) {
        toast.error(t("card.handleEnroll.roleError"));
        return;
      }
      setEnrolledOptimistic(true);
      const res = await createEnroll.mutateAsync({ course: course?.id });
      if (res?.status) {
        toast.success(t("card.handleEnroll.success"));
        queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] });
      } else {
        setEnrolledOptimistic(false);
        toast.error(
          res?.error?.non_field_errors?.[0] ??
            t("card.handleEnroll.failFallback")
        );
      }
    } catch (error: any) {
      setEnrolledOptimistic(false);
      handleErrorAlerts(
        error?.response?.data?.message ?? t("card.handleEnroll.errorFallback")
      );
    }
  };

  useEffect(() => {
    if (computedEnrolled && enrolledOptimistic) setEnrolledOptimistic(false);
  }, [computedEnrolled, enrolledOptimistic]);

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer ${
        isListView ? "flex items-start" : ""
      }`}
      onClick={() => {
        if (isListView) {
          return;
        } else {
          navigate(`/catalog/${course?.id}`);
        }
      }}
    >
      <div className={`relative ${isListView ? "w-80 flex-shrink-0" : ""}`}>
        <img
          src={
            coursePic ??
            "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg"
          }
          alt={course?.title}
          className={`object-cover group-hover:scale-105 transition-transform duration-300 ${
            isListView ? "w-full h-48" : "w-full h-48"
          }`}
        />
        {course?.is_best_seller && (
          <div className="absolute top-4 left-4">
            <span className="bg-yellow-400 text-yellow-900 px-3 py-1 text-sm font-bold rounded-full">
              {t("card.bestseller")}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/catalog/${course.id}`);
            }}
            className="bg-white text-gray-900 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors flex items-center"
          >
            <Play className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
            {t("card.preview")}
          </button>
        </div>
      </div>

      <div className={`p-6 ${isListView ? "flex-1" : ""}`}>
        <div className={`${isListView ? "flex justify-between" : ""}`}>
          <div className={`${isListView ? "flex-1 pr-6" : ""}`}>
            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 hover:text-purple-600 cursor-pointer transition-colors">
              {course?.title}
            </h3>

            <div className="flex items-center mb-3">
              {course?.instructor?.profile_image ? (
                <img
                  src={course?.instructor?.profile_image}
                  alt={course?.instructor?.first_name}
                  className="w-6 h-6 rounded-full ltr:mr-2 rtl:ml-2"
                />
              ) : (
                <div className="w-6 h-6 bg-purple-600 ltr:mr-2 rtl:ml-2 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {course?.instructor?.first_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <p className="text-gray-600 text-sm">
                {course?.instructor?.first_name ?? "--"}{" "}
                {course?.instructor?.last_name}
              </p>
            </div>

            {isListView && (
              <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                {course?.description}
              </p>
            )}

            <div className="flex items-center mb-4">
              <FeatureGate
                flag="is_review_enabled"
                loadingFallback={null}
                fallback={null}
              >
                <div className="flex items-center">
                  <span className="text-yellow-500 font-bold ltr:mr-1 rtl:ml-1">
                    {Math.floor(+course?.average_rating) ?? 0}
                  </span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i <
                          Math.floor(Math.floor(+course?.average_rating) ?? 0)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-500 text-sm ltr:ml-2 rtl:mr-2">
                    ({course?.total_reviews?.toLocaleString() ?? 0})
                  </span>
                </div>
              </FeatureGate>
            </div>

            <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Clock className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                <span>
                  {formatDuration(course?.total_hours, i18n.language)}
                </span>
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                <span>{course?.total_students?.toLocaleString() ?? 0}</span>
              </div>
              <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                {course?.level}
              </span>
            </div>

            {isListView && course?.objectives?.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">
                  {t("card.whatYouLearn")}
                </h4>
                <ul className="space-y-1">
                  {course?.objectives?.map((item: TextLists) => (
                    <li
                      key={item?.id}
                      className="flex items-start text-sm text-gray-700"
                    >
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full ltr:mr-2 rtl:ml-2 mt-2 flex-shrink-0"></div>
                      {item?.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div
            className={`${
              isListView
                ? "flex items-end flex-col justify-between gap-4"
                : "flex items-center justify-between"
            }`}
          >
            <FeatureGate
              flag="is_price_enabled"
              loadingFallback={null}
              fallback={null}
            >
              {course?.is_paid ? (
                <div className={`${isListView ? "mb-4" : "flex items-center"}`}>
                  <span className="text-2xl font-bold text-gray-900">
                    ${course?.price}
                  </span>
                  {course?.old_price && (
                    <span className="text-gray-500 line-through ltr:ml-2 rtl:mr-2">
                      ${course?.old_price}
                    </span>
                  )}
                </div>
              ) : (
                <span
                  className={`px-4 py-1 rounded-lg font-semibold ${"bg-green-100 text-green-800"}`}
                >
                  {t("card.free")}
                </span>
              )}
            </FeatureGate>

            {isListView && (
              <>
                {!isEnrolled ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnroll();
                    }}
                    disabled={isFetching || createEnroll?.isPending}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                  >
                    {createEnroll?.isPending
                      ? t("card.enrolling")
                      : t("card.enrollNow")}
                  </button>
                ) : (
                  <div className="text-center mb-4">
                    <button
                      // onClick={() => {
                      //   if (firstPlayableLessonId) {
                      //     goToPlayer({ lessonId: firstPlayableLessonId });
                      //   } else {
                      //     console.log("Cannot find lesson");
                      //   }
                      // }}
                      onClick={() => {
                        navigate(`/catalog/${course?.id}`);
                      }}
                      className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                    >
                      {isInstructorCourse
                        ? t("card.viewCourse")
                        : t("card.startLearning")}
                    </button>
                  </div>
                )}
              </>
            )}

            {showLoginModal && (
              <LoginPopup
                onClose={() => {
                  setShowLoginModal(false);
                }}
                setShowSignupModal={setShowSignupModal}
              />
            )}
            {showSignupModal && (
              <SignupPopup
                onClose={() => {
                  setShowSignupModal(false);
                }}
                setShowLoginModal={setShowLoginModal}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
