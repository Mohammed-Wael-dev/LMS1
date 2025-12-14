import { useQuery } from "@tanstack/react-query";
import { qk } from "../utils/builderQueries";
import { listLessonsBySectionApi } from "../utils/lessonApi";

export function useLessonsBySection(sectionId?: string) {
  const enabled = !!sectionId;
  return useQuery({
    queryKey: qk.lessonsBySection(sectionId || ""),
    queryFn: async () => {
      const res = await listLessonsBySectionApi(sectionId!);
      const data = res?.data?.data ?? res?.data ?? [];
      return Array.isArray(data) ? data : [];
    },
    enabled,
  });
}
