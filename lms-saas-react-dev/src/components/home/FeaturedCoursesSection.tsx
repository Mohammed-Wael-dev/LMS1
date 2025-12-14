import { Clock, Star, Users } from "lucide-react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS } from "../../utils/constants";
import { useCustomQuery } from "../../hooks/useQuery";
import { formatDuration } from "../../utils/formatDuration";
import CourseCardsSkeleton from "../resource-stats/CourseLoading";
import FeatureGate from "../settings/FeatureGate";

export default function FeaturedCoursesSection() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("home");

  const {
    data: featuredCoursesData,
    isLoading,
    isFetching,
    isPending,
  } = useCustomQuery(`${API_ENDPOINTS.courses}?featured_courses=true`, [
    "featured-courses",
  ]);
  const courses: Course[] = featuredCoursesData?.data;

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t("featuredCourses")}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t("featuredCoursesDescription")}
          </p>
        </div>

        {isFetching || isPending || isLoading ? (
          <CourseCardsSkeleton count={2} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses?.map((course) => (
              <div
                key={course?.id}
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                onClick={() => navigate(`/catalog/${course?.id}`)}
              >
                <div className="relative">
                  <img
                    src={
                      course.picture ??
                      "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg"
                    }
                    alt={course?.title ?? "--"}
                    className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {course?.is_best_seller && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-yellow-400 text-yellow-900 px-3 py-1 text-sm font-bold rounded-full">
                        {t("bestseller")}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/catalog/${course?.id}`);
                        }}
                        className="w-full bg-white text-gray-900 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                      >
                        {t("previewCourse")}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    {course?.title ?? "--"}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {course?.instructor?.first_name ?? "--"}{" "}
                    {course?.instructor?.last_name ?? "--"}
                  </p>

                  <FeatureGate
                    flag="is_review_enabled"
                    loadingFallback={null}
                    fallback={null}
                  >
                    <div className="flex items-center mb-4">
                      <div className="flex items-center">
                        <span className="text-yellow-500 font-bold ltr:mr-1 rtl:ml-1">
                          {parseInt(course?.average_rating) ?? 0}
                        </span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i <
                                Math.floor(
                                  parseInt(course?.average_rating) ?? 0
                                )
                                  ? "text-yellow-400 fill-current"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-gray-500 text-sm ltr:ml-2 rtl:mr-2">
                          ({course?.total_reviews ?? 0} {t("reviews")})
                        </span>
                      </div>
                    </div>
                  </FeatureGate>

                  <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                      <span>
                        {formatDuration(course?.total_hours, i18n.language)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                      <span>
                        {course?.total_students?.toLocaleString() ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <FeatureGate
                      flag="is_price_enabled"
                      fallback={null}
                      loadingFallback={null}
                    >
                      <div className="flex items-center">
                        <span className="text-2xl font-bold text-gray-900">
                          ${course?.price ?? "0"}
                        </span>
                        {course?.old_price && (
                          <span className="text-gray-500 line-through ltr:ml-2 rtl:mr-2">
                            ${course?.old_price ?? "0"}
                          </span>
                        )}
                      </div>
                    </FeatureGate>
                    <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {course?.level ?? "--"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
