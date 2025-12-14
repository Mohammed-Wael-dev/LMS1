// src/pages/CourseDetailPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Star,
  Clock,
  Users,
  Award,
  CheckCircle,
  Globe,
  Smartphone,
  Trophy,
  Play,
} from "lucide-react";
import CourseContent from "../../components/course/CourseContent";
import { useCustomQuery } from "../../hooks/useQuery";
import { useNavigate, useParams } from "react-router";
import { ACCESS_TOKEN_KEY, API_ENDPOINTS } from "../../utils/constants";
import { formatDateTimeSimple } from "../../utils/formatDateTime";
import { useCustomPost } from "../../hooks/useMutation";
import toast from "react-hot-toast";
import handleErrorAlerts from "../../utils/showErrorMessages";
import { formatDuration } from "../../utils/formatDuration";
import { readUserFromStorage } from "../../services/auth";
import LoginPopup from "../../components/auth-modals/LoginPopup";
import SignupPopup from "../../components/auth-modals/SignupPopup";
import useAuth from "../../store/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import CourseRatingModal from "../../components/course/course-details/CourseRatingModal";
import CourseReviews from "../../components/course/course-details/CourseReviews";
import { useTranslation } from "react-i18next";
import FeatureGate from "../../components/settings/FeatureGate";
import { useFeatureFlag } from "../../hooks/useSettings";
import { getCookie } from "../../services/cookies";

interface Assessment {
  id: string;
  title: string;
  description: string;
  content_type: "assessment";
}

const CourseDetailPage: React.FC = () => {
  const { t: y } = useTranslation("courseCatalog");
  const { t, i18n } = useTranslation("courseDetails");
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(
    readUserFromStorage()?.id ?? null
  );
  const currentUser: User = readUserFromStorage();

  // Settings flags
  const {
    enabled: reviewsEnabled,
    isError: reviewsError,
    isFetching: reviewsFetching,
    isLoading: reviewsLoading,
  } = useFeatureFlag("is_review_enabled", true);
  const { enabled: authEnabled } = useFeatureFlag(
    "is_registration_enabled",
    true
  );

  useEffect(() => {
    if (isAuthenticated) {
      const id = readUserFromStorage()?.id ?? null;
      setUserId(id);
      queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] });
    }
  }, [isAuthenticated, queryClient]);

  const courseData = useCustomQuery(
    `${API_ENDPOINTS.courses}${courseId}/`,
    ["course", courseId],
    undefined,
    !!courseId
  );
  const course: Course = courseData?.data?.data;
  const { data: modulesResp } = useCustomQuery(
    `${API_ENDPOINTS.modules}?course=${courseId}&include_lessons=true`,
    ["modules", courseId],
    undefined,
    !!courseId
  );

  const modulesData: Module[] = useMemo(
    () => modulesResp?.data ?? [],
    [modulesResp]
  );
  const { data: catesData } = useCustomQuery(`${API_ENDPOINTS.categories}`, [
    "categories",
  ]);
  const cates: Category[] = catesData?.data?.data ?? [];

  const { data: subCategoriesData } = useCustomQuery(
    `${API_ENDPOINTS.subCategories}`,
    ["sub-categories"]
  );
  const subCategories: SubCategory[] = useMemo(
    () => subCategoriesData?.data || [],
    [subCategoriesData]
  );

  const currentSubCate = subCategories?.find(
    (s) => s.id === course?.sub_category
  );
  const currentCategory = cates?.find((c) => c.id === currentSubCate?.category);

  const { data: assessmentsData } = useCustomQuery(
    `${API_ENDPOINTS.assessments}?course_id=${course?.id}`,
    ["assessments", course?.id],
    undefined,
    !!course?.id && currentUser?.is_instructor
  );

  const assessments: Assessment[] = assessmentsData?.data ?? [];

  const { data: instructorData } = useCustomQuery(
    `${API_ENDPOINTS.instructor}${course?.instructor?.id}/course/${course?.id}/`,
    ["instructor", course?.id],
    undefined,
    !!course?.id && !!course?.instructor?.id
  );
  const instructor: CourseInstructor = instructorData?.data?.[0];

  const isStudent = !!(currentUser && currentUser.is_student);
  const token = getCookie(ACCESS_TOKEN_KEY);
  const enrolledCoursesData = useCustomQuery(
    API_ENDPOINTS.enrolledCourses,
    ["enrolledCourses", isAuthenticated, userId],
    {
      headers: {
        ...(isStudent && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
    !!isAuthenticated
  );
  const enrolledCourses: EnrolledCourse[] =
    enrolledCoursesData?.data?.data ?? [];

  const computedEnrolled = enrolledCourses.some(
    (c) => String(c?.course?.id) === String(course?.id ?? courseId)
  );
  const [enrolledOptimistic, setEnrolledOptimistic] = useState(false);

  const isInstructorCourse =
    currentUser?.is_instructor && course?.instructor?.id === currentUser?.id;
  const isEnrolled = isInstructorCourse
    ? true
    : enrolledOptimistic || computedEnrolled;

  useEffect(() => {
    if (computedEnrolled && enrolledOptimistic) setEnrolledOptimistic(false);
  }, [computedEnrolled, enrolledOptimistic]);

  const createEnroll = useCustomPost(API_ENDPOINTS.createEnrollment, [
    "enrolledCourses",
    "course",
    courseId as string,
  ]);

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showSignupModal, setShowSignupModal] = useState<boolean>(false);

  const handleEnroll = async () => {
    if (!isAuthenticated && authEnabled) {
      toast.error(y("card.handleEnroll.authError"));
      setShowLoginModal(true);
      return;
    }
    if (isEnrolled || createEnroll.isPending) return;

    try {
      if (currentUser?.is_instructor) {
        toast.error(y("card.handleEnroll.roleError"));
        return;
      }
      setEnrolledOptimistic(true);
      const res = await createEnroll.mutateAsync({ course: course?.id });
      if (res?.status) {
        toast.success(y("card.handleEnroll.success"));
        queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] });
      } else {
        setEnrolledOptimistic(false);
        toast.error(
          (res?.error?.non_field_errors?.[0] as string) ??
            y("card.handleEnroll.failFallback")
        );
      }
    } catch (error: any) {
      setEnrolledOptimistic(false);
      handleErrorAlerts(
        error?.response?.data?.message ?? y("card.handleEnroll.errorFallback")
      );
    }
  };

  /** First lesson the user can open (free preview if not enrolled). */
  const firstPlayableLessonId = useMemo(() => {
    for (const m of modulesData ?? []) {
      const lessons = m?.lessons ?? [];
      const playable =
        lessons.find((l) => isEnrolled || l?.free_preview) || lessons[0];
      if (playable?.id) return String(playable.id);
    }
    return null;
  }, [modulesData, isEnrolled]);

  /** Navigate to player with lesson + optional assessment. */
  const goToPlayer = (opts?: {
    lessonId?: string | number;
    assessment?: Exam;
  }) => {
    const params = new URLSearchParams();
    if (opts?.lessonId) params.set("lesson", String(opts.lessonId));
    if (opts?.assessment) {
      params.set("assessment", String(opts.assessment.id));
      if (opts.assessment.type)
        params.set("atype", String(opts.assessment.type));
    }
    const qs = params.toString();
    navigate(`/catalog/${course?.id}/player${qs ? `?${qs}` : ""}`);
  };

  /** CourseContent lesson click -> open player at that lesson */
  const handleLessonSelect = (lessonId: string) => {
    goToPlayer({ lessonId });
  };

  /** CourseContent assessment click -> open player with assessment context */
  const handleOpenAssessment = (lessonId: string, a: Exam) => {
    goToPlayer({ lessonId, assessment: a });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Course Header */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <nav className="text-sm mb-4">
                {currentCategory?.name && (
                  <>
                    <span className="text-purple-400">
                      {currentCategory?.name}
                    </span>
                    <span className="mx-2">›</span>
                  </>
                )}
                {currentSubCate?.name && (
                  <>
                    <span className="text-purple-400">
                      {currentSubCate?.name ?? ""}
                    </span>
                    <span className="mx-2">›</span>
                  </>
                )}
                <span>{course?.title}</span>
              </nav>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {course?.title}
              </h1>
              <p className="text-xl text-gray-300 mb-6">{course?.subtitle}</p>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                {course?.is_best_seller && (
                  <span className="bg-yellow-400 text-yellow-900 px-3 py-1 text-sm font-bold rounded">
                    {y("card.bestseller")}
                  </span>
                )}
                <FeatureGate
                  flag="is_review_enabled"
                  loadingFallback={null}
                  fallback={null}
                >
                  <div className="flex items-center">
                    <span className="text-yellow-400 font-bold ltr:mr-2 rtl:ml-2">
                      {course?.average_rating ?? 0}
                    </span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i + 1000}
                          className={`w-4 h-4 ${
                            i < parseInt(course?.average_rating)
                              ? "text-yellow-400 fill-current"
                              : "text-gray-400"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-300 ltr:ml-2 rtl:mr-2">
                      {t("ratings", {
                        reviews: course?.total_reviews?.toLocaleString() ?? 0,
                      })}
                    </span>
                  </div>
                </FeatureGate>
                <span className="text-gray-300">
                  {t("students", {
                    students: course?.total_students?.toLocaleString() ?? 0,
                  })}
                </span>
              </div>

              <div className="flex items-center text-gray-300 mb-6">
                <span>
                  {t("createdBy", {
                    instructor: `${course?.instructor?.first_name} ${course?.instructor?.last_name}`,
                  })}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-300">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  <span>
                    {t("lastUpdated", {
                      lastUpdated: formatDateTimeSimple(course?.updated_at, {
                        locale: i18n.language,
                        t,
                      }),
                    })}
                  </span>
                </div>
                {course?.language && (
                  <div className="flex items-center">
                    <Globe className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                    <span>{course?.language}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right card with hero thumbnail and "Play" */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-4">
                <div className="relative">
                  <img
                    src={
                      course?.picture ??
                      "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg"
                    }
                    alt={course?.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <button
                      onClick={() => {
                        // Start at first playable (allows free preview if not enrolled)
                        if (firstPlayableLessonId) {
                          goToPlayer({ lessonId: firstPlayableLessonId });
                        } else if (!isEnrolled) {
                          toast.error(t("enrollError"));
                        } else {
                          goToPlayer();
                        }
                      }}
                      className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center"
                      title={t("enrollBtnTitle")}
                      aria-label="Start / Preview"
                    >
                      <Play className="w-6 h-6 text-white ltr:ml-1 rtl:mr-1" />
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <FeatureGate
                    flag="is_price_enabled"
                    loadingFallback={null}
                    fallback={null}
                  >
                    <div className="flex items-center justify-between mb-4">
                      {course?.is_paid ? (
                        <div className="flex items-center">
                          <span className="text-3xl font-bold text-gray-900">
                            ${course?.price ?? 0}
                          </span>
                          {course?.old_price && (
                            <span className="text-gray-500 line-through ltr:ml-3 rtl:mr-3">
                              ${course?.old_price ?? 0}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-4 py-1 rounded-lg font-semibold bg-green-100 text-green-800">
                          {y("card.free")}
                        </span>
                      )}
                    </div>
                  </FeatureGate>

                  {!isEnrolled || createEnroll?.isPending ? (
                    <button
                      onClick={handleEnroll}
                      disabled={
                        enrolledCoursesData?.isFetching ||
                        createEnroll?.isPending
                      }
                      className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors mb-4"
                    >
                      {createEnroll?.isPending
                        ? y("card.enrolling")
                        : y("card.enrollNow")}
                    </button>
                  ) : (
                    <div className="text-center mb-4">
                      {!isInstructorCourse && (
                        <div className="flex items-center justify-center text-green-600 mb-2">
                          <CheckCircle className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                          <span className="font-medium">{t("enrolled")}</span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (firstPlayableLessonId) {
                            goToPlayer({ lessonId: firstPlayableLessonId });
                          } else {
                            goToPlayer();
                          }
                        }}
                        className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold mb-2 hover:bg-purple-700 transition-colors"
                      >
                        {isInstructorCourse
                          ? y("card.viewCourse")
                          : y("card.startLearning")}
                      </button>
                      {!course?.has_reviewed && (
                        <FeatureGate
                          flag="is_review_enabled"
                          fallback={null}
                          loadingFallback={null}
                        >
                          <button
                            onClick={() => setShowRatingModal(true)}
                            className="w-full bg-yellow-500 text-white py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors text-sm"
                          >
                            {t("rate")}
                          </button>
                        </FeatureGate>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 text-sm">
                    <h4 className="font-semibold text-gray-900">
                      {t("details.includes")}
                    </h4>
                    <div className="flex items-center text-gray-700">
                      <Clock className="w-4 h-4 ltr:mr-3 rtl:ml-3" />
                      <span>
                        {t("details.time", {
                          hours: formatDuration(
                            course?.total_hours,
                            i18n.language
                          ),
                        })}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <Smartphone className="w-4 h-4 ltr:mr-3 rtl:ml-3" />
                      <span>{t("details.access")}</span>
                    </div>
                    {course?.has_certificate && (
                      <div className="flex items-center text-gray-700">
                        <Trophy className="w-4 h-4 ltr:mr-3 rtl:ml-3" />
                        <span>{t("details.certificate")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* /Right card */}
          </div>
        </div>
      </div>

      {/* Course Content + Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px grid grid-cols-2 sm:grid-cols-5 items-center gap-4">
                  {[
                    { id: "overview", label: t("tabs.overview") },
                    { id: "curriculum", label: t("tabs.curriculum") },
                    { id: "instructor", label: t("tabs.instructor") },
                    { id: "reviews", label: t("tabs.reviews") },
                    { id: "assessments", label: t("tabs.assessments") },
                  ].map((tab) => {
                    if (
                      (!reviewsEnabled ||
                        reviewsError ||
                        reviewsFetching ||
                        reviewsLoading) &&
                      tab.id === "reviews"
                    )
                      return null;

                    if (tab.id === "assessments" && currentUser?.is_student)
                      return null;
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
            <div className="bg-white rounded-lg shadow-md sm:p-6 p-2">
              {activeTab === "overview" && (
                <div>
                  {course?.objectives && course?.objectives?.length > 0 && (
                    <>
                      <h3 className="text-2xl font-bold text-gray-900 mb-6">
                        {y("card.whatYouLearn")}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {course?.objectives.map((item) => (
                          <div key={item?.id} className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 ltr:mr-3 rtl:ml-3 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{item?.text}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {course?.requirements && course?.requirements?.length > 0 && (
                    <>
                      <h3 className="text-2xl font-bold text-gray-900 mb-6">
                        {t("requirements")}
                      </h3>
                      <ul className="space-y-2 mb-8">
                        {course?.requirements.map((req) => (
                          <li key={req?.id} className="flex items-start">
                            <span className="w-2 h-2 bg-gray-400 rounded-full ltr:mr-3 rtl:ml-3 mt-2.5 flex-shrink-0"></span>
                            <span className="text-gray-700">{req?.text}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    {t("description")}
                  </h3>
                  <div className="prose max-w-none text-gray-700">
                    {course?.description
                      ?.split("\n\n")
                      .map((paragraph, index) => (
                        <p key={index + 2000} className="mb-4">
                          {paragraph}
                        </p>
                      ))}
                  </div>
                </div>
              )}

              {activeTab === "curriculum" && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    {t("content")}
                  </h3>
                  <CourseContent
                    modules={modulesData}
                    onLessonSelect={handleLessonSelect}
                    is_sequential={course?.is_sequential}
                    isEnrolled={isEnrolled}
                    onOpenAssessment={handleOpenAssessment}
                  />
                </div>
              )}

              {activeTab === "instructor" && (
                <div className="w-full flex-col items-start flex">
                  <h3 className="sm:text-2xl text-lg font-bold text-gray-900 mb-6">
                    {t("tabs.instructor")}
                  </h3>
                  <div className="sm:flex-row flex-col w-full flex items-start mb-6">
                    {instructor?.instructor?.profile_image ? (
                      <img
                        src={instructor?.instructor?.profile_image}
                        alt={instructor?.instructor?.first_name}
                        className="w-16 self-center sm:self-start h-16 rounded-full ltr:mr-3 rtl:ml-3"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-purple-600 ltr:mr-4 rtl:ml-4 self-center sm:self-start rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {course?.instructor?.first_name
                            ?.charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start w-full flex-col">
                      <h4 className="text-xl font-bold text-gray-900 sm:self-start self-center">
                        {instructor?.instructor?.first_name}{" "}
                        {instructor?.instructor?.last_name}
                      </h4>
                      <p className="text-gray-600 mb-2 whitespace-normal">
                        {instructor?.instructor?.bio}
                      </p>
                      <div className="flex sm:flex-row w-full flex-col sm:items-center items-start gap-4 text-sm text-gray-500">
                        <FeatureGate
                          flag="is_review_enabled"
                          fallback={null}
                          loadingFallback={null}
                        >
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) =>
                              i < +instructor?.average_rating?.toFixed(0) ? (
                                <Star
                                  key={i + 3000}
                                  className="w-4 h-4 ltr:mr-1 rtl:ml-1 text-yellow-400 fill-current"
                                />
                              ) : (
                                <Star
                                  key={i + 4000}
                                  className="text-gray-300 w-4 h-4 ltr:mr-1 rtl:ml-1"
                                />
                              )
                            )}
                            ({instructor?.total_reviews ?? 0})
                          </div>
                        </FeatureGate>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                          <span>
                            {t("students", {
                              students:
                                instructor?.total_students?.toLocaleString(),
                            })}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Award className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                          <span>
                            {t("courses", {
                              courses: instructor?.total_courses,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "reviews" && (
                <FeatureGate
                  flag="is_review_enabled"
                  fallback={null}
                  loadingFallback={null}
                >
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      {t("studentReviews")}
                    </h3>
                    <CourseReviews courseId={course?.id} />
                  </div>
                </FeatureGate>
              )}

              {activeTab === "assessments" && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    {t("tabs.assessments")}
                  </h3>
                  <div className="flex w-full flex-col items-start justify-start gap-4">
                    {assessments.map((assessment) => {
                      return (
                        <button
                          key={assessment.id}
                          type="button"
                          onClick={() => {
                            navigate(
                              `/catalog/${course.id}/assessments/${assessment.id}`
                            );
                          }}
                          className="flex items-start flex-col gap-4 bg-slate-50 hover:bg-slate-100 duration-300 shadow-md rounded-lg w-full p-4 ltr:text-left rtl:text-right"
                        >
                          <p>{assessment.title}</p>
                          {assessment.description && (
                            <p className="text-sm text-gray-500">
                              {assessment.description}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Course Content mirrors curriculum behavior */}
          <div className="hidden lg:block lg:col-span-1">
            <CourseContent
              modules={modulesData}
              onLessonSelect={handleLessonSelect}
              isEnrolled={isEnrolled}
              is_sequential={course?.is_sequential}
              onOpenAssessment={handleOpenAssessment}
            />
          </div>
        </div>
      </div>

      {showRatingModal && (
        <CourseRatingModal
          courseTitle={course?.title}
          onClose={() => setShowRatingModal(false)}
        />
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
        <FeatureGate
          flag="is_registration_enabled"
          fallback={null}
          loadingFallback={null}
        >
          <SignupPopup
            onClose={() => {
              setShowSignupModal(false);
            }}
            setShowLoginModal={setShowLoginModal}
          />
        </FeatureGate>
      )}
    </div>
  );
};

export default CourseDetailPage;
