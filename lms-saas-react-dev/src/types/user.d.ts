interface Acheivement {
  id: string;
  title: string;
  icon: string;
  date: string;
  description: string;
}

interface Certificate {
  id: string;
  course: string;
  student: string;
  file: string;
  title_course: string;
  date_issued: string;
  instractor: string;
  image_course: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_student: boolean;
  is_instructor: boolean;
  profile_image: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  data_joined: string;
}

interface StudentStats {
  id: string;
  first_name: string;
  last_name: string;
  enrolled_courses: number;
  courses_completed: number;
  new_courses_this_month: number;
  hours_learned: number | string | null;
  certificates_earned: number;
  current_streak: number;
  overall_progress: number;
  new_courses_this_month: number;
  hours_learned_this_month: number | string | null;
  certificates_this_month: number;
  streak_days_this_month: number;
}
