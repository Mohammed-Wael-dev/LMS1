import { Star, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import { readUserFromStorage } from "../../services/auth";
import { formatDateTimeSimple } from "../../utils/formatDateTime";

export default function ReviewsSection() {
  const { t, i18n } = useTranslation("instructorDashboard");

  const currentUser: User = readUserFromStorage();
  const data = useCustomQuery(
    API_ENDPOINTS.instructorCourseReviews,
    ["instructor-reviews", currentUser.id],
    undefined,
    !!currentUser.id
  );

  const instructorReviewsResponse: {
    data: InstructorReviews[];
    error: any;
    status: boolean;
    pagination: { next: number | null; previous: number | null; count: number };
  } = data?.data;

  const recentReviews = instructorReviewsResponse?.data ?? [];

  // updated_at, rating, course_title, comment, student
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        {t("recentReviews.title")}
      </h3>
      <div className="space-y-4">
        {recentReviews.map((review) => (
          <div
            key={review.id}
            className="border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900">
                  {!review.anonymous
                    ? t("recentReviews.anonymous")
                    : `${review.student_.first_name} ${review.student_.last_name}`}
                </h4>
                <p className="text-sm text-gray-600">{review.course_title}</p>
              </div>
              <div className="flex flex-col items-start justify-start gap-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <ThumbsUp
                  className={`self-end ${
                    review.recommend
                      ? "text-green-600"
                      : "text-red-600 rotate-180"
                  }`}
                />
              </div>
            </div>
            <p className="text-gray-700 mb-2">{review.comment}</p>

            {review?.like_course_details.length > 0 && (
              <div className="flex items-center justify-start flex-wrap w-full gap-3 mb-3">
                {review?.like_course_details?.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={`w-fit h-fit px-3 py-1 border-2 border-solid rounded-md text-sm text-black ${
                        item.type === "positive"
                          ? "border-green-400"
                          : "border-red-400"
                      }`}
                    >
                      {item.name}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-sm text-gray-500">
              {formatDateTimeSimple(review.updated_at, {
                locale: i18n.language,
                t: t,
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
