type BuilderLesson = {
  id: string;
  title: string;
  type: "video" | "article" | "quiz" | "exam" | "material";
  videoUrl?: string;
  youtubeUrl?: string;
  duration?: string;
  free_preview?: boolean;
  fileUrl?: string;
  order: number;
  description?: string;
  description_html?: any;
  quiz?: any;
};

type BuilderModule = {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: BuilderLesson[];
};

type BuilderCourse = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  level: string;
  modules: BuilderModule[];
};
