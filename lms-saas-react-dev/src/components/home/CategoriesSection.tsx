import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";

export default function CategoriesSection() {
  const navigate = useNavigate();
  const { t } = useTranslation("home");
  const { data: categoriesData } = useCustomQuery(API_ENDPOINTS.categories, [
    "categories",
  ]);
  const categories: Category[] = categoriesData?.data;
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t("exploreTopCategories")}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t("discoverCoursesDescription")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories?.map((category: Category) => (
            <div
              key={category?.id}
              onClick={() => navigate(`/catalog?category_id=${category?.id}`)}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer overflow-hidden"
            >
              <div
                style={{ backgroundColor: category?.color + "50" }}
                className={`absolute top-0 right-0 rtl:-left-14 rtl:right-auto w-24 h-24 rounded-full transform translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500`}
              ></div>

              <div className="relative z-10">
                {/* <img
                  src={
                    category?.icon ??
                    "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg"
                  }
                  alt={category?.id}
                  className="w-16 h-16 mb-4"
                /> */}
                <span className="text-4xl mb-2 block">{category?.icon}</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {category?.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t("coursesCount", { count: category?.total_courses })}
                </p>
                <div className="flex items-center text-purple-600 font-semibold group-hover:text-purple-700">
                  <span>{t("exploreCourses")}</span>
                  <ArrowRight className="w-4 h-4 ltr:ml-2 rtl:mr-2 transform group-hover:translate-x-1 transition-transform rtl:rotate-180" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
