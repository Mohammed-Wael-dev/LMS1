/* eslint-disable react-hooks/exhaustive-deps */
import { BookOpen } from "lucide-react";
import { useCustomQuery } from "../../hooks/useQuery";
import CourseCard from "../../components/course/CourseCard";
import CoursesSortAndSearch from "../../components/course/course-catalog/CoursesSortAndSearch";
import CoursesFilter from "../../components/course/course-catalog/CoursesFilter";
import { ACCESS_TOKEN_KEY, API_ENDPOINTS } from "../../utils/constants";
import { useSearchParams } from "react-router";
import Pagination from "../../components/reusable-components/Pagination";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import CourseCardsSkeleton from "../../components/resource-stats/CourseLoading";
import useMediaQuery from "../../hooks/useMediaQuery";
import { readUserFromStorage } from "../../services/auth";
import { useQueryClient } from "@tanstack/react-query";
import useAuth from "../../store/useAuth";
import { useTranslation } from "react-i18next";
import FeatureGate from "../../components/settings/FeatureGate";
import { getCookie } from "../../services/cookies";

type ViewMode = "grid" | "list";
type PriceFilter = "all" | "free" | "paid";
type SortKey =
  | "most_popular"
  | "high_rating"
  | "newest"
  | "price_low_to_high"
  | "price_high_to_low";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 6;

const CourseCatalogPage: React.FC = () => {
  const { t } = useTranslation("courseCatalog");
  const [searchParams, setSearchParams] = useSearchParams();
  // Read search params from URL
  const searchQuery = searchParams.get("search") ?? "";
  const selectedCategory = searchParams.get("category_id") ?? "all";
  const selectedLevel = searchParams.get("level") ?? "all";
  const priceFilter = (searchParams.get("price") ?? "all") as PriceFilter;
  const sortBy = (searchParams.get("sort") ?? "most_popular") as SortKey;
  const viewMode = (searchParams.get("view") ?? "grid") as ViewMode;
  const page = parseInt(searchParams.get("page") ?? String(DEFAULT_PAGE), 10);
  const pageSize = parseInt(
    searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE),
    10
  );

  // Local states and refs
  const isMdUp = useMediaQuery("(min-width: 768px)");
  const effectiveView = isMdUp ? viewMode : "grid";
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  // Helper for update params when changes
  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value.length > 0) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  // Sets params as changed in UI

  // Set page size if needed to set the limit of page
  // const setPageSize = (ps: number) => {
  //   const next = new URLSearchParams(searchParams);
  //   next.set("page_size", String(ps));
  //   next.delete("page"); // reset to 1 when size changes
  //   setSearchParams(next, { replace: true });
  // };
  const setSelectedCategory = (v: string) =>
    updateParam("category_id", v === "all" ? undefined : v);
  const setSelectedLevel = (v: string) =>
    updateParam("level", v === "all" ? undefined : v);
  const setPriceFilter = (v: PriceFilter) =>
    updateParam("price", v === "all" ? undefined : v);
  const setSortBy = (v: SortKey) =>
    updateParam("sort", v === "most_popular" ? undefined : v);
  const setViewMode = (v: ViewMode) => {
    if (!isMdUp) return;
    const next = new URLSearchParams(searchParams);
    if (v === "grid") next.delete("view");
    else next.set("view", "list");
    setSearchParams(next, { replace: true });
  };

  // Build API query params to send in request
  const backendQueryParams = new URLSearchParams();
  if (searchQuery) backendQueryParams.set("search", searchQuery);
  if (selectedCategory !== "all")
    backendQueryParams.set("category_id", selectedCategory);
  if (selectedLevel !== "all") backendQueryParams.set("level", selectedLevel);
  if (priceFilter === "free") backendQueryParams.set("is_paid", "false");
  if (priceFilter === "paid") backendQueryParams.set("is_paid", "true");

  backendQueryParams.set("most_popular", String(sortBy === "most_popular"));
  backendQueryParams.set("high_rating", String(sortBy === "high_rating"));
  backendQueryParams.set(
    "price_low_to_high",
    String(sortBy === "price_low_to_high")
  );
  backendQueryParams.set(
    "price_high_to_low",
    String(sortBy === "price_high_to_low")
  );
  backendQueryParams.set("newest", String(sortBy === "newest"));
  backendQueryParams.set("page", String(page));
  backendQueryParams.set("page_size", String(pageSize));

  // Fetch data according to query params
  const { data, isLoading } = useCustomQuery(
    `${API_ENDPOINTS.courses}?${backendQueryParams.toString()}`,
    ["courses", backendQueryParams.toString()]
  );

  const { data: catesData } = useCustomQuery(API_ENDPOINTS.categories, [
    "categories",
  ]);
  const categories: Category[] = catesData?.data?.data;

  const courses: Course[] = data?.data ?? [];
  const totalCount: number = data?.count ?? 0;

  // Select menu if need to set the page_size
  // const PageSizeSelect = (
  //   <select
  //     value={pageSize}
  //     onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
  //     className="ml-3 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
  //   >
  //     {[6, 12, 18, 24].map((n) => (
  //       <option key={n} value={n}>
  //         {n} / page
  //       </option>
  //     ))}
  //   </select>
  // );

  // Handle pagination
  const handlePageChange = (nextPage: number) => {
    const totalPages = Math.max(
      1,
      Math.ceil(totalCount / Math.max(1, pageSize))
    );
    const target = Math.min(Math.max(1, nextPage), totalPages);

    const next = new URLSearchParams(searchParams);
    if (target > 1) next.set("page", String(target));
    else next.delete("page");
    setSearchParams(next, { replace: true });
  };

  // Clear all filters
  const clearAllFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("category_id");
    next.delete("level");
    next.delete("price");
    next.delete("search");
    next.delete("sort");
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  // Set debounced search to avoid multiple reqs
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("search", debouncedSearch);
    else next.delete("search");
    next.delete("page");
    setSearchParams(next, { replace: true });
  }, [debouncedSearch]);

  // Prevent List view in screens below md
  useEffect(() => {
    if (!isMdUp && searchParams.get("view")) {
      const next = new URLSearchParams(searchParams);
      next.delete("view");
      setSearchParams(next, { replace: true });
    }
  }, [isMdUp]);

  // Set "all" choice in filters as default
  useEffect(() => {
    if (
      categories &&
      categories.length > 0 &&
      selectedCategory !== "all" &&
      !categories.some((c) => c.id === selectedCategory)
    ) {
      const next = new URLSearchParams(searchParams);
      next.delete("category_id");
      setSearchParams(next, { replace: true });
    }
  }, [selectedCategory, categories]);

  const [userId, setUserId] = useState<string | null>(
    readUserFromStorage()?.id ?? null
  );
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated) {
      const id = readUserFromStorage()?.id ?? null;
      setUserId(id);
      queryClient.invalidateQueries({ queryKey: ["enrolledCourses"] });
    }
  }, [isAuthenticated, queryClient]);

  const currentUser: User = readUserFromStorage();
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
              <p className="text-gray-600 mt-1">
                {t("subTitle", { totalCount: totalCount ?? 0 })}
              </p>
            </div>

            <CoursesSortAndSearch
              searchQuery={searchInput}
              setSearchQuery={setSearchInput}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={effectiveView}
              setViewMode={setViewMode}
              onOpenFilters={() => setFiltersOpenMobile(true)}
              filterButtonRef={filterBtnRef}
            />
            {/* {PageSizeSelect} */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <FeatureGate
            flag="is_courses_filter_enabled"
            loadingFallback={null}
            fallback={null}
          >
            <CoursesFilter
              selectedCategory={selectedCategory}
              selectedLevel={selectedLevel}
              priceFilter={priceFilter}
              setSelectedCategory={setSelectedCategory}
              setSelectedLevel={setSelectedLevel}
              setPriceFilter={setPriceFilter}
              onClearFilters={clearAllFilters}
              mobileOpen={filtersOpenMobile}
              onCloseMobile={() => setFiltersOpenMobile(false)}
              returnFocusRef={filterBtnRef}
            />
          </FeatureGate>

          {/* Course Grid */}
          <div className="flex-1">
            {isLoading ? (
              <CourseCardsSkeleton count={6} isListView={viewMode === "list"} />
            ) : !courses || courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t("emptyState.title")}
                </h3>
                <p className="text-gray-600">{t("emptyState.subTitle")}</p>
              </div>
            ) : (
              <div
                className={`grid gap-6 ${
                  effectiveView === "grid"
                    ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    enrolledCourses={enrolledCourses}
                    // courseId={course.id}
                    course={course}
                    coursePic={course?.picture}
                    isListView={effectiveView === "list"}
                    isFetching={enrolledCoursesData.isFetching}
                  />
                ))}
              </div>
            )}

            <div>
              {!isLoading && totalCount > 0 && (
                <Pagination
                  total={totalCount}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCatalogPage;
