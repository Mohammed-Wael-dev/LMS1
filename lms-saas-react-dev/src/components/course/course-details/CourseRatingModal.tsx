import { useEffect, useMemo, useState } from "react";
import { Star, ThumbsUp, ThumbsDown, Send, X } from "lucide-react";
import { useParams } from "react-router";
import { useCustomQuery } from "../../../hooks/useQuery";
import { API_ENDPOINTS } from "../../../utils/constants";
import { useCustomPatch, useCustomPost } from "../../../hooks/useMutation";
import toast from "react-hot-toast";
import handleErrorAlerts from "../../../utils/showErrorMessages";
import { readUserFromStorage } from "../../../services/auth";
import ReviewReasonsSkeleton from "../../resource-stats/ReviewReasonsLoading";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface CourseRatingProps {
  courseTitle: string;
  onClose: () => void;
}

interface DataToSend {
  course: string;
  rating: number;
  comment: string;
  like_course: number[];
  recommend: boolean;
  anonymous: boolean;
  // comment: string;
}

interface Reason {
  id: number;
  name: string;
  type: "positive" | "negative";
}

type DataToSendWithId = DataToSend & { id?: number | string };

export default function CourseRatingModal({
  courseTitle,
  onClose,
}: CourseRatingProps) {
  const { t, i18n } = useTranslation("courseDetails");
  const queryClient = useQueryClient();
  const { courseId } = useParams();
  const currentUser = readUserFromStorage();
  // fetch existing review(s)
  const { data: reviewData } = useCustomQuery(
    `${API_ENDPOINTS.courseStudentReview}?course=${courseId}`,
    ["student-review", courseId, currentUser?.id],
    undefined,
    !!courseId
  );

  // fetch reviews reasons
  const { data: reasonsData, isLoading } = useCustomQuery(
    API_ENDPOINTS.reviewReasons,
    ["review-reasons"],
    undefined,
    !!courseId
  );

  // create review
  const { mutateAsync: createReview, isPending } = useCustomPost(
    API_ENDPOINTS.createReview,
    ["student-review", courseId as string]
  );

  const { mutateAsync: editReview, isPending: editPending } = useCustomPatch(
    API_ENDPOINTS.updateReview,
    ["student-review", courseId as string]
  );

  // normalize API shape: support {data: Review[]} or {data: Review}
  const existingReviews: CourseReview[] = useMemo(() => {
    const raw = reviewData?.data;
    if (!raw) return [];
    return Array.isArray(raw) ? (raw as CourseReview[]) : [raw as CourseReview];
  }, [reviewData?.data]);

  const lastReview: CourseReview | null = existingReviews.length
    ? existingReviews[existingReviews.length - 1]
    : null;

  const isEdit = !!lastReview;

  // local state (seed from lastReview if present)
  const [rating, setRating] = useState<number>(lastReview?.rating ?? 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState<string>(lastReview?.comment ?? "");
  const [selectedReasons, setSelectedReasons] = useState<number[]>(
    lastReview?.like_course_details.map((r) => r.id) ?? []
  );
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(
    lastReview?.recommend ?? true
  );
  const [anonymous, setAnonymous] = useState<boolean>(
    lastReview?.anonymous ?? false
  );

  const headerTitle = isEdit
    ? t("rateModal.updateReview")
    : t("rateModal.rate");
  const primaryBtnLabel = isEdit
    ? t("rateModal.update")
    : t("rateModal.submit");
  const loadingLabel = isEdit
    ? t("rateModal.updating")
    : t("rateModal.submitting");

  const ratingLabels = [
    "",
    t("rateModal.labels.terrible"),
    t("rateModal.labels.poor"),
    t("rateModal.labels.average"),
    t("rateModal.labels.good"),
    t("rateModal.labels.excellent"),
  ];

  const reasons: Reason[] = useMemo(
    () => reasonsData?.data ?? [],
    [reasonsData?.data]
  );

  const reasonOptions = useMemo(() => {
    const pr = reasons?.filter((r) => r.type === "positive");
    return pr;
  }, [reasons]);

  const negativeReasons = useMemo(() => {
    const nr = reasons.filter((r) => r.type === "negative");
    return nr;
  }, [reasons]);

  const currentReasons = rating >= 4 ? reasonOptions : negativeReasons;

  const toggleReason = (reason: number) => {
    const key = reason;
    setSelectedReasons((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!courseId) {
      handleErrorAlerts("Missing course id.");
      return;
    }
    if (rating === 0) {
      toast.error("Please select rating");
      return;
    }

    // Build payload. Using the same text for comment for now.
    const basePayload: DataToSendWithId = {
      course: String(courseId),
      rating,
      comment: review.trim(),
      like_course: selectedReasons,
      recommend: wouldRecommend,
      anonymous,
    };

    try {
      if (isEdit && lastReview?.id != null) {
        // include id for PATCH body as you requested
        const res = await editReview({ ...basePayload, id: lastReview.id });
        queryClient.invalidateQueries({
          queryKey: ["course", courseId],
        });
        if (res?.status) {
          toast.success(t("rateModal.handleSubmit.success"));
        } else {
          toast.success(t("rateModal.handleSubmit.updated"));
        }
        onClose();
      } else {
        const res = await createReview(basePayload);
        if (res?.status) {
          toast.success(t("rateModal.handleSubmit.sent"));
          queryClient.invalidateQueries({
            queryKey: ["course", courseId],
          });
        } else {
          toast.success(t("rateModal.handleSubmit.submit"));
        }
        onClose();
      }
    } catch (error: any) {
      const payloadErr = error?.response?.data ||
        error?.data ||
        error?.message || { message: t("rateModal.handleSubmit.error") };
      handleErrorAlerts(
        payloadErr.message ?? t("rateModal.handleSubmit.error")
      );
    }
  };

  // keep state in sync if/when the fetch finishes
  useEffect(() => {
    if (!lastReview) return;
    setRating(lastReview.rating ?? 0);
    setReview(lastReview.comment ?? "");
    setSelectedReasons(lastReview.like_course_details?.map((r) => r.id) ?? []);
    setAnonymous(lastReview.anonymous ?? false);
    setWouldRecommend(lastReview.recommend ?? true);
  }, [lastReview]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center sm:p-4 p-2 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sm:p-6 p-2 border-b border-gray-200">
          <div className="flex sm:flex-row flex-col-reverse sm:items-center items-start justify-between">
            <div>
              <h2 className="sm:text-2xl text-lg font-bold text-gray-900">
                {headerTitle}
              </h2>
              <p className="text-gray-600 mt-1">{courseTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 sm:self-center self-end text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Star Rating */}
          <div className="text-center">
            <h3 className="sm:text-lg font-semibold text-gray-900 mb-4">
              {t("rateModal.title")}
            </h3>
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`sm:w-10 sm:h-10 ${
                      star <= (hoveredRating || rating)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="sm:text-lg font-medium text-gray-700">
                {i18n.language === "ar"
                  ? `${ratingLabels[rating]} (${rating} ${
                      rating !== 1 ? "نجوم" : "نجمة"
                    })`
                  : `${ratingLabels[rating]} (${rating} star${
                      rating !== 1 ? "s" : ""
                    })`}
              </p>
            )}
          </div>

          {/* Reasons */}
          {rating > 0 && (
            <div>
              <h4 className="sm:text-lg font-semibold text-gray-900 mb-4">
                {t("rateModal.reasons.title")}{" "}
                {rating >= 4
                  ? t("rateModal.reasons.like")
                  : t("rateModal.reasons.dislike")}{" "}
                {t("rateModal.reasons.subTitle")}
              </h4>
              {isLoading ? (
                <ReviewReasonsSkeleton count={currentReasons?.length ?? 8} />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {currentReasons.map((reason) => {
                    const key = reason?.id;
                    const active = selectedReasons.includes(key);
                    return (
                      <button
                        key={reason?.name}
                        onClick={() => toggleReason(reason?.id)}
                        className={`sm:p-3 p-1 rounded-lg sm:border-2 border sm:text-sm text-xs sm:font-medium transition-all ${
                          active
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gray-200 hover:border-purple-300 text-gray-700"
                        }`}
                      >
                        {reason?.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Written Review */}
          {rating > 0 && (
            <div>
              <h4 className="sm:text-lg font-semibold text-gray-900 mb-4">
                {t("rateModal.review.title")}
              </h4>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder={t("rateModal.review.placeholder")}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none placeholder:text-xs sm:placeholder:text-base"
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-500">
                  {t("rateModal.review.length", { length: review.length })}
                </span>
              </div>
            </div>
          )}

          {/* Recommendation */}
          {rating > 0 && (
            <div>
              <h4 className="sm:text-lg font-semibold text-gray-900 mb-4">
                {t("rateModal.recommend.wouldRecommend")}
              </h4>
              <div className="flex gap-4 sm:flex-row flex-col">
                <button
                  onClick={() => setWouldRecommend(true)}
                  className={`flex items-center px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                    wouldRecommend
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-green-300 text-gray-700"
                  }`}
                >
                  <ThumbsUp className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                  {t("rateModal.recommend.yes")}
                </button>
                <button
                  onClick={() => setWouldRecommend(false)}
                  className={`flex items-center px-6 py-3 rounded-lg border-2 font-medium transition-all ${
                    !wouldRecommend
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 hover:border-red-300 text-gray-700"
                  }`}
                >
                  <ThumbsDown className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                  {t("rateModal.recommend.no")}
                </button>
              </div>
            </div>
          )}

          {/* Privacy Options */}
          {rating > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <span className="ltr:ml-3 rtl:mr-3 text-sm text-gray-700">
                  {t("rateModal.privacy.submit")}
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                {t("rateModal.privacy.explain")}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex sm:flex-row flex-col-reverse gap-4 sm:gap-0 items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              {t("rateModal.cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || isPending || editPending}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isPending || editPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ltr:mr-2 rtl:ml-2"></div>
              ) : (
                <Send className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
              )}
              {isPending || editPending ? loadingLabel : primaryBtnLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
