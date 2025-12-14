interface InstructorCourses {
  id: string;
  title: string;
  picture: string;
  total_students: number;
  average_rating: number;
  total_reviews: number;
  revenue: number | null;
  is_published: string;
  updated_at: string;
  completion: number;

  instructor: {
    first_name: string;
    last_name: string;
    profile_image: string;
    id: string;
    bio: string;
  };
}

interface InstructorStats {
  total_courses: number;
  total_students: number;
  average_rating: number | null;
  total_reviews: number;
  new_reviews: number;
  new_students: number;
  revenue_this_month: number | null;
  revenue: number | null;
}

interface InstructorReviews {
  student_: {
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
  };
  id: number;
  course: string;
  course_title: string;
  like_course_details: [
    {
      id: number;
      name: string;
      type: string;
    }
  ];
  rating: number;
  recommend: boolean;
  anonymous: boolean;
  comment: string;
  created_at: string;
  updated_at: string;
}
