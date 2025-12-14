// src/utils/builderQueries.ts
import { QueryClient } from "@tanstack/react-query";

export const qk = {
  modules: (courseId: string) => ["modules", courseId] as const,
  examsByLesson: (lessonId: string) => ["exams", lessonId] as const,
  // Optional future use:
  lessonsBySection: (sectionId: string) => ["lessons", sectionId] as const,
};

export function invalidateLessonExams(
  queryClient: QueryClient,
  lessonId?: string | null
) {
  if (!lessonId) return;
  queryClient.invalidateQueries({ queryKey: qk.examsByLesson(lessonId) });
}
