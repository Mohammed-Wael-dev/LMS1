import { useNavigate } from "react-router";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import InstructorCourseCard from "./InstructorCourseCard";
import CourseCardsSkeleton from "../resource-stats/CourseLoading";
import useMediaQuery from "../../hooks/useMediaQuery";
import { useTranslation } from "react-i18next";

export default function CoursesSection() {
  const navigate = useNavigate();
  const { t } = useTranslation("instructorDashboard");

  const { data, isLoading } = useCustomQuery(
    API_ENDPOINTS.instructorCourseStats,
    ["instructor-courses"]
  );

  const instructorCourses: InstructorCourses[] = data?.data ?? [];

  const isMdUp = useMediaQuery("(min-width:768px)");
  if (isLoading) {
    return <CourseCardsSkeleton isListView={isMdUp} count={isMdUp ? 6 : 4} />;
  }
  return (
    <div className="bg-white rounded-xl shadow-sm sm:p-6 p-2">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        {t("tabs.myCourses")}
      </h3>
      <div className="sm:grid-cols-2 grid md:grid-cols-1 gap-4">
        {instructorCourses.map((course) => (
          <InstructorCourseCard
            course={course}
            key={course?.id}
            navigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}
