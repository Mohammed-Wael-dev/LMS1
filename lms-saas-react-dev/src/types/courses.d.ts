interface EnrolledCourse {
  id: number;
  date_enrolled: string;
  course: {
    id: string;
    picture: string | null;
    title: string;
    slug: string;
    subtitle: string;
    description: string;
    rating: number;
    price: string;
    old_price: string;
    is_paid: boolean;
    level: string;
    is_published: boolean;
    created_at: string;
    updated_at: string;
    search_vector: string;
    duration: string;
    sub_category: string;
    instructor: string;
  };
}

interface EnrolledCourseStats {
  id: string;
  title: string;
  description: string;
  completed_lessons: number;
  progress: number;
  lessons_progress: string; // "0/31 lessons"
  last_accessed: string | null;
  sub_category: {
    id: string;
    name: string;
    description: string;
  };
  total_hours: number;
  average_rating: number;
}

interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
  profile_image: string;
  title: string;
  total_students: number;
  total_courses: number;
  instructor_full_name: string;
  instructor_image: string;
  bio: string;
  average_rating: number;
}

interface CourseInstructor {
  title: string;
  total_students: number;
  total_courses: number;
  instructor: {
    first_name: string;
    last_name: string;
    profile_image: string;
    id: string;
    bio: string;
  };
  total_reviews: number;
  average_rating: number;
}

type TextLists = {
  id: string;
  text: string;
};

interface Course {
  id: string;
  title: string;
  slug: string;
  picture: string;
  subtitle: string;
  description: string;
  sub_category: string;
  instructor: Instructor;
  instructor_: Instructor;
  old_price: number;
  price: number;
  is_paid: boolean;
  level: string;
  is_published: boolean;
  has_reviewed: boolean;
  is_sequential: boolean;
  has_certificate: boolean;
  created_at: string;
  updated_at: string;
  total_students: number;
  average_rating: string;
  total_reviews: number;
  total_enrollments: number;
  total_hours: number | null;
  is_best_seller: boolean;
  objectives: TextLists[];
  requirements: TextLists[];
  language: string;
}

type ContentType =
  | "video"
  | "article"
  | "material"
  | "quiz"
  | "exam"
  | "assessment";

interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  duration_hours?: number | null;
  free_preview?: boolean;
  order: number;
  file?: any;
  completed?: boolean;
  description_html?: any;
  content_type: ContentType;
  completed?: boolean;
  string_file?: string | null;
  file_url?: string | null;
  file_base64?: string | null;
  file_name?: string;

  section: string;
  is_locked?: boolean;
}

interface Module {
  id: string;
  title: string;
  course: string;
  description: string;
  order: number;
  lesson_count: number;
  total_hours: number;
  lessons: Lesson[];
  is_locked?: boolean;
  total_lessons?: number;
  completed_lessons?: number;
  progress_percentage?: number;
}

interface CourseReview {
  student_: Person;
  id: string;
  course: string;
  course_title: string;
  rating: number;
  // tell_about_your_experience: string;
  like_course_details: {
    id: number;
    name: string;
    type: "positive" | "negative";
  }[];
  recommend: boolean;
  anonymous: boolean;
  comment: string;
  created_at: string;
  updated_at: string;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  type: "quiz" | "exam" | "assessment";
  lesson: string;
  time_limit?: number;
  passing_score?: number;
  questions: {
    id: string;
    text: string;
    question_type: string;
    explanation: string;
    points?: number;
    choices: {
      id: string;
      text: string;
      is_correct?: boolean;
    }[];
  }[];
}
