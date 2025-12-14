from django.db import models
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from django.db.models import Count, Case, When, Value, BooleanField , F , Avg , FloatField, ExpressionWrapper , Q , Max , Sum, OuterRef, Subquery , CharField , Exists
from django.db.models.functions import Round , JSONObject , Concat
from django.contrib.postgres.aggregates import ArrayAgg
class CourseQuerySet(models.QuerySet):
    def with_select_related(self):
        return (
            self.select_related("sub_category", "sub_category__category", "instructor")
           
        )
    def with_prefetch_related(self):
        from .models import Section
        return  self.prefetch_related(
                "objectives",
                "requirements" )
    def all_related(self): 
        return self.with_select_related().with_prefetch_related()
    def full_text_search(self, value):
        # Define the weighted search vector

        vector = (
            SearchVector("title", weight="A") +
            SearchVector("subtitle", weight="B") +
            SearchVector("description", weight="C")
        )
        query = SearchQuery(value)
         # Annotate with rank and filter results

        return (
            self.annotate(rank=SearchRank(vector, query))
            .filter(rank__gte=0.1) 
            .order_by("-rank")
        )
    def get_info_with_students(self):
        qs = self.annotate(
            total_students=Count("enrollments", distinct=True),
            average_rating=Round(Avg("reviews__rating" , distinct=True), 2),
            total_reviews=Count("reviews", distinct=True),
            total_enrollments=Count("enrollments", distinct=True),
            total_hours=Sum("sections__lessons__duration_hours", distinct=True),
        ).annotate(
            is_best_seller=Case(
                When(total_enrollments__gt=100, then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        )
        return qs
    def with_best_seller_data(self) :
        return (
            self.annotate(
                total_enrollments=models.Count("enrollments"),
                total_students=models.Count("enrollments__student", distinct=True),
                total_hours=models.Sum("sections__lessons__duration_hours"),
                average_rating = Round(Avg("reviews__rating"), 2)
            )
            .order_by("-total_enrollments")
        )
    def get_instructor_courses(self, instructor  , course_pk=None):
        return self.filter(instructor=instructor, id=course_pk).annotate(
        total_students=Count("enrollments"),
        total_courses=Count("id" , distinct=True),
        total_reviews=Count("reviews", distinct=True),
        average_rating=Round(Avg("reviews__rating"), 2)

        )
    def with_instructor_info(self):
        return self.select_related("instructor").annotate(
            instructor_info=JSONObject(
                total_reviews=Count("instructor__course_reviews", distinct=True),
                total_courses=Count("instructor__instructor_courses", distinct=True),
                total_students=Count("instructor__instructor_courses__enrollments" , distinct=True),
                average_rating=Round(Avg("instructor__course_reviews__rating", distinct=True), 2),
                full_name=Concat(F("instructor__first_name"), Value(" "), F("instructor__last_name"), output_field=CharField()), 
                profile_image = F("instructor__profile_image"),
                bio = F("instructor__bio"), 
                id = F("instructor__id")

            )
        )
    def get_instructor_course_stats(self, instructor):
        return self.filter(instructor=instructor).annotate(
            total_students=Count("enrollments"),
            total_reviews=Count("reviews" , distinct=True),
            average_rating=Round(Avg("reviews__rating"), 2),
            revenue=Sum("enrollments__course__price") 
        )
    def with_progress(self, student):
        return self.annotate(
            total_lessons=Count("sections__lessons", distinct=True),
            completed_lessons=Count(
                "sections__lessons__progress_lessons",
                filter=Q(sections__lessons__progress_lessons__student=student) &
                    Q(sections__lessons__progress_lessons__watched=True),
                distinct=True
            ),
            lessons_progress=Concat(
                F('completed_lessons'),
                Value('/'),
                F('total_lessons'),
                Value(' lessons') , 
                output_field=CharField()

            ),
            progress = Round(
                ExpressionWrapper(
                    100 * F("completed_lessons") / (F("total_lessons")),
                    output_field=FloatField()
                )
            ),
            last_accessed=Max(
                'sections__lessons__progress_lessons__watched_at',
                filter=Q(sections__lessons__progress_lessons__student=student)
            ),
            total_hours=Sum("sections__lessons__duration_hours"),
            average_rating=Round(Avg("reviews__rating"), 2),
        )
    def with_sequential_access(self, student):
        return self.annotate(
            # Order of the last completed lesson
            last_completed_lesson_order=Max(
                'sections__lessons__progress_lessons__lesson__order',
                filter=Q(
                    sections__lessons__progress_lessons__student=student,
                    sections__lessons__progress_lessons__watched=True
                )
            )
        )
    def get_enrollment_students(self, search=None, status_filter=None):
            from .models import  Lesson  
            from enrollment.models import LessonProgress
            from django.conf import settings
            from project.cdn.conf import AWS_S3_ENDPOINT_URL

            base_url = AWS_S3_ENDPOINT_URL

            total_lessons = Lesson.objects.filter(section__course=OuterRef("pk")).values("section__course").annotate(
                count=Count("id")
            ).values("count")[:1]

            completed_lessons = LessonProgress.objects.filter(
                student=OuterRef("enrollments__student__id"),
                lesson__section__course=OuterRef("pk"),
                watched=True
            ).values("student").annotate(
                count=Count("id")
            ).values("count")[:1]

            last_active_subquery =  LessonProgress.objects.filter(
                    student=OuterRef("enrollments__student__id"),
                    lesson__section__course=OuterRef("pk"),
                ).order_by("-watched_at").values("watched_at")[:1]


       
            progress_calc =Round(
            ExpressionWrapper(
                100 * Subquery(completed_lessons) / (Subquery(total_lessons)),
                output_field=FloatField()
            ),
            
            2   
            )
            filter_search = Q()
            if search:
                filter_search = (Q(enrollments__student__email__icontains=search) | Q(enrollments__student__first_name__icontains=search) | Q(enrollments__student__last_name__icontains=search))
            
            # Add status filter logic
            # status_filter_q = Q()
            # if status_filter:
            #     if status_filter == 'active':
            #         # Students who have recent activity (last 30 days)
            #         from datetime import datetime, timedelta
            #         thirty_days_ago = datetime.now() - timedelta(days=30)
            #         status_filter_q = Q(enrollments__student__lessonprogress__watched_at__gte=thirty_days_ago)
            #     elif status_filter == 'inactive':
            #         # Students who haven't been active in the last 30 days
            #         from datetime import datetime, timedelta
            #         thirty_days_ago = datetime.now() - timedelta(days=30)
            #         status_filter_q = Q(enrollments__student__lessonprogress__watched_at__lt=thirty_days_ago)
            #     elif status_filter == 'completed':
            #         # Students who completed the course (100% progress)
            #         status_filter_q = Q(enrollments__student__lessonprogress__watched=True)
            
            # Combine search and status filters
            combined_filter = filter_search & Q(enrollments__student__id__isnull=False)

            return self.annotate(
                students=ArrayAgg(
                    JSONObject(
                        id=F("enrollments__student__id"),
                        full_name=Concat(
                            F("enrollments__student__first_name"),
                            Value(" "),
                            F("enrollments__student__last_name"),
                            output_field=models.CharField()
                        ),
                        email=F("enrollments__student__email"),
                      profile_image=Case(
                            When(
                                Q(enrollments__student__profile_image__isnull=False) & ~Q(enrollments__student__profile_image=""),
                                then=Concat(
                                    Value(base_url),                
                                    Value("/shabab"),            
                                    Value(settings.MEDIA_URL),    
                                    F("enrollments__student__profile_image"),
                                    output_field=models.CharField()
                                )
                            ),
                            default=Value(
                                "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                            ),
                            output_field=models.CharField()
                        ),
                        progress=progress_calc ,
                        enrolled_at=F("enrollments__date_enrolled")  ,  
                        last_active=Subquery(last_active_subquery),
                    ),
                    filter=combined_filter,
                    distinct=True
                )
            )
        
class SubCategoryQuerySet(models.QuerySet):
    def with_course_count(self):
        return self.annotate(course_count=Count("courses", filter=Q(courses__is_published=True)))
    
class CategoryQuerySet(models.QuerySet):
    def with_course_count(self):
        return self.annotate(total_courses=Count("subcategories__courses", filter=Q(subcategories__courses__is_published=True)))
    
class LessonQuerySet(models.QuerySet):
    def with_progress(self, student=None):
        from enrollment.models import LessonProgress
        if student is None:
            return 
        
        progress_qs = LessonProgress.objects.filter(
            lesson=OuterRef('pk'),
            student=student
        )
        return self.annotate(
            watched=Exists(progress_qs)
        )
    
    def with_sequential_access(self, student, course_id=None):
        from enrollment.models import LessonProgress
        from .models import Course
        
        # If no student or course_id, all lessons are unlocked
        print("student", student)
        print("course_id", course_id)
        if student is None or course_id is None:
            return self.annotate(is_locked=Value(False, output_field=BooleanField()))
        
        # Get the course object
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return self.annotate(is_locked=Value(False, output_field=BooleanField()))
        
        # If course is not sequential, all lessons are unlocked
        if not course.is_sequential:
            return self.annotate(is_locked=Value(False, output_field=BooleanField()))
            
        # Order of the last completed lesson
        last_completed_order = LessonProgress.objects.filter(
            student=student,
            lesson__section__course=course,
            watched=True
        ).aggregate(
            max_order=Max('lesson__order')
        )['max_order']
        
        # If no lessons completed, only first lesson should be unlocked
        if last_completed_order is None:
            return self.annotate(
                is_locked=Case(
                    When(order__gt=1, then=Value(True)),
                    default=Value(False),
                    output_field=BooleanField()
                )
            )
        
        return self.annotate(
            is_locked=Case(
                When(
                    order__gt=last_completed_order + 1,
                    then=Value(True)
                ),
                default=Value(False),
                output_field=BooleanField()
            )
        )


class SectionQuerySet(models.QuerySet):
    def with_lesson_count(self):
        return self.annotate(lesson_count=Count("lessons" , distinct=True) , total_hours=Sum("lessons__duration_hours" , distinct=True))
    
    def with_sequential_access(self, student, course_id=None):
        from enrollment.models import LessonProgress
        from .models import Course
        
        # If no student or course_id, all sections are unlocked
        if student is None or course_id is None:
            return self.annotate(is_locked=Value(False, output_field=BooleanField()))
        
        # Get the course object
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return self.annotate(is_locked=Value(False, output_field=BooleanField()))
        
        # If course is not sequential, all sections are unlocked
        if not course.is_sequential:
            return self.annotate(is_locked=Value(False, output_field=BooleanField()))
        
        # Get sections with their completion status
        sections_completion = self.annotate(
            total_lessons=Count('lessons', distinct=True),
            completed_lessons=Count(
                'lessons__progress_lessons',
                filter=Q(lessons__progress_lessons__student=student) & 
                       Q(lessons__progress_lessons__watched=True),
                distinct=True
            )
        ).values('id', 'order', 'total_lessons', 'completed_lessons')
        
        # Find the last fully completed section
        last_completed_section_order = None
        for section in sections_completion:
            if section['total_lessons'] > 0 and section['completed_lessons'] == section['total_lessons']:
                last_completed_section_order = section['order']
        
        # If no sections fully completed, only first section should be unlocked
        if last_completed_section_order is None:
            return self.annotate(
                is_locked=Case(
                    When(order__gt=1, then=Value(True)),
                    default=Value(False),
                    output_field=BooleanField()
                )
            )
        
        return self.annotate(
            is_locked=Case(
                When(
                    order__gt=last_completed_section_order + 1,
                    then=Value(True)
                ),
                default=Value(False),
                output_field=BooleanField()
            )
        )
    
    def with_section_progress(self, student):
        """Add progress information for sections"""
        from enrollment.models import LessonProgress
        
        if student is None:
            return self.annotate(
                total_lessons=Value(0),
                completed_lessons=Value(0),
                progress_percentage=Value(0.0, output_field=FloatField())
            )
        
        return self.annotate(
            total_lessons=Count('lessons', distinct=True),
            completed_lessons=Count(
                'lessons__progress_lessons',
                filter=Q(lessons__progress_lessons__student=student) & 
                       Q(lessons__progress_lessons__watched=True),
                distinct=True
            ),
            progress_percentage=Case(
                When(total_lessons=0, then=Value(0.0)),
                default=Round(
                    ExpressionWrapper(
                        100 * F('completed_lessons') / F('total_lessons'),
                        output_field=FloatField()
                    ),
                    2
                ),
                output_field=FloatField()
            )
        )

    