import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import { formatDateTimeSimple } from "../../utils/formatDateTime";

export default function TestimonialsSection() {
  const { t } = useTranslation("home");
  const { data: topReviews } = useCustomQuery(API_ENDPOINTS.topReviews, [
    "top-reviews",
  ]);
  const topReviewsData = topReviews?.data;
  // const testimonials = [
  //   {
  //     name: "Sarah Johnson",
  //     role: t("roles.softwareEngineerGoogle"),
  //     image:
  //       "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100",
  //     quote: t("quotes.sarahQuote"),
  //   },
  //   {
  //     name: "Michael Chen",
  //     role: t("roles.dataScientistMicrosoft"),
  //     image:
  //       "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100",
  //     quote: t("quotes.michaelQuote"),
  //   },
  //   {
  //     name: "Emily Rodriguez",
  //     role: t("roles.uxDesignerApple"),
  //     image:
  //       "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100",
  //     quote: t("quotes.emilyQuote"),
  //   },
  // ];

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t("title")}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {topReviewsData?.map((review: any, index: number) => (
            <div
              key={index}
              className="flex flex-col justify-between bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            >
              <div>
                <div className="flex items-center mb-6">
                  <img
                    src={
                      review?.student.profile_image ??
                      "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg"
                    }
                    alt={
                      review.student.first_name + " " + review.student.last_name
                    }
                    className="w-12 h-12 rounded-full ltr:mr-4 rtl:ml-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {review.student.first_name +
                        " " +
                        review.student.last_name}
                    </h4>
                    {/* <p className="text-gray-600 text-sm">{review.role}</p> */}
                  </div>
                </div>
                <p className="text-gray-700 italic">
                  "{review.comment}"
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        review.rating > i ? "text-yellow-400" : "text-gray-300"
                      } fill-current`}
                    />
                  ))}
                </div>
                <p className="text-gray-700 text-sm italic">
                  {formatDateTimeSimple(review.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
