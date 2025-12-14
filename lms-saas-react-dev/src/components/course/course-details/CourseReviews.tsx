import { Star } from "lucide-react";
import { useCustomQuery } from "../../../hooks/useQuery";
import { API_ENDPOINTS } from "../../../utils/constants";
import { formatDateTimeSimple } from "../../../utils/formatDateTime";
import { useTranslation } from "react-i18next";

export default function CourseReviews({ courseId }: { courseId: string }) {
  const { t, i18n } = useTranslation("courseDetails");
  const { data, isLoading } = useCustomQuery(
    `${API_ENDPOINTS.courseReviews}?course=${courseId}`,
    ["course-reviews", courseId],
    undefined,
    !!courseId
  );

  const reviews: CourseReview[] = data?.data ?? [];

  if (isLoading) {
    <div>Load</div>;
  }
  return (
    <div className="flex flex-col items-center justify-start w-full gap-4">
      {reviews?.map((review) => {
        return (
          <div
            key={review?.id}
            className="border w-full border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900">
                  {review?.student_?.first_name} {review?.student_?.last_name}
                </h4>
                {/* <p className="text-sm text-gray-600">{review?.course}</p> */}
              </div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review?.rating
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-gray-700 mb-2">{review.comment}</p>
            <p className="text-sm text-gray-500">
              {formatDateTimeSimple(review.created_at, {
                locale: i18n.language,
                t,
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
