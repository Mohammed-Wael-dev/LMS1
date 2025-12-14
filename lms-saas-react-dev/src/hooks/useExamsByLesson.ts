// src/hooks/useExamsByLesson.ts
import { useCustomQuery } from "./useQuery";
import { API_ENDPOINTS } from "../utils/constants";
import { qk } from "../utils/builderQueries";

export function useExamsByLesson(lessonId?: string) {
  return useCustomQuery(
    lessonId ? `${API_ENDPOINTS.exams}${lessonId}` : "",
    lessonId ? qk.examsByLesson(lessonId) : ["exams", "no-lesson"],
    undefined,
    !!lessonId
  );
}
