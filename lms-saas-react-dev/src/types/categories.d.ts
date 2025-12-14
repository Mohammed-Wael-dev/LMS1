interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  total_courses: number;
  sub_categories: SubCategory[];
}

interface SubCategory {
  id: string;
  name: string;
  description: string;
  category: string;
}
