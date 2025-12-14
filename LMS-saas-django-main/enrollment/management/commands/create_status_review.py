# course/management/commands/create_status_review.py
from django.core.management.base import BaseCommand
from enrollment.models import CourseLikeAspect

class Command(BaseCommand):
    help = "Seed default course like aspects into a specific schema."

    def add_arguments(self, parser):
        parser.add_argument(
            "schema_name",
            type=str,
            help="Schema name where the status reviews should be created"
        )

    def handle(self, *args, **options):
        schema_name = options["schema_name"]

        reasons = [
            {"name": "Clear explanations",       "type": "positive"},
            {"name": "Practical examples",       "type": "positive"},
            {"name": "Good pacing",              "type": "positive"},
            {"name": "Engaging content",         "type": "positive"},
            {"name": "Helpful exercises",        "type": "positive"},
            {"name": "Great instructor",         "type": "positive"},
            {"name": "Well organized",           "type": "positive"},
            {"name": "Up-to-date content",       "type": "positive"},
            {"name": "Good production quality",  "type": "positive"},
            {"name": "Valuable resources",       "type": "positive"},
            {"name": "Interactive elements",     "type": "positive"},
            {"name": "Real-world applications",  "type": "positive"},

            {"name": "Confusing explanations",   "type": "negative"},
            {"name": "Too fast paced",           "type": "negative"},
            {"name": "Too slow paced",           "type": "negative"},
            {"name": "Outdated content",         "type": "negative"},
            {"name": "Poor audio/video quality", "type": "negative"},
            {"name": "Lack of examples",         "type": "negative"},
            {"name": "Disorganized structure",   "type": "negative"},
            {"name": "Not enough practice",      "type": "negative"},
            {"name": "Boring presentation",      "type": "negative"},
            {"name": "Missing key topics",       "type": "negative"},
        ]

        # لو بتستخدم django-tenants أو django-tenant-schemas
        from django.db import connection
        connection.set_schema(schema_name)

        CourseLikeAspect.objects.all().delete()
        aspects = [CourseLikeAspect(**reason) for reason in reasons]
        CourseLikeAspect.objects.bulk_create(aspects)

        self.stdout.write(
            self.style.SUCCESS(f"✅ Seed completed in schema '{schema_name}'. Inserted {len(aspects)} aspects.")
        )


# python manage.py create_status_review lms
