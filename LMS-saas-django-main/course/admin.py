from django.contrib import admin
from .models import *


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


class LearningObjectiveInline(admin.TabularInline):
    model = LearningObjective
    extra = 1


class RequirementInline(admin.TabularInline):
    model = Requirement
    extra = 1


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "instructor", "price", "is_published", "level", "duration")
    search_fields = ("title", "description")
    list_filter = ("level", "is_published")
    inlines = [LearningObjectiveInline, RequirementInline]


class LessonInline(admin.StackedInline):
    model = Lesson
    extra = 0
    fields = (
        "title",
        "order",
        "content_type",
        "free_preview",
        "duration_hours",
        "url",
        "file",
        "description",
        "description_html",
    )
    show_change_link = True
    ordering = ("order",)


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "section",
        "course",
        "content_type",
        "order",
        "free_preview",
        "duration_hours",
    )
    list_filter = (
        "content_type",
        "free_preview",
        "section__course",
    )
    search_fields = (
        "title",
        "section__title",
        "section__course__title",
    )
    ordering = (
        "section__course__title",
        "section__order",
        "order",
    )
    autocomplete_fields = ("section",)
    list_select_related = ("section", "section__course")
    fieldsets = (
        (None, {
            "fields": (
                "section",
                "title",
                "order",
                "content_type",
                "free_preview",
            )
        }),
        ("Content", {
            "fields": (
                "description",
                "description_html",
                "duration_hours",
                "url",
                "file",
            )
        }),
    )

    def course(self, obj):
        return obj.section.course

    course.short_description = "Course"
    course.admin_order_field = "section__course__title"


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "order")
    search_fields = ("title", "description")
    list_filter = ("course",)
    ordering = ("order",)
    inlines = [LessonInline]
