interface Question {
  id: number;
  lesson: string;
  student_: Person;
  text: string;
  created_at: string;
  answer: Answer[];
  count_likes: number;
  count_loves: number;
  count_claps: number;
}

interface Answer {
  id: number;
  question: number;
  user_: Person;
  text: string;
  created_at: string;
  count_likes: number;
  count_loves: number;
  count_claps: number;
}

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_student: boolean;
  is_instructor: boolean;
  profile_image: string;
  bio: string;
  phone: string;
  location: string;
  data_joined: string;
}
