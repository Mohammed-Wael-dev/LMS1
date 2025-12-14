from rest_framework import serializers

from .models import Client, Language


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ("code", "name")


class TenantSettingsSerializer(serializers.ModelSerializer):
    languages = LanguageSerializer(read_only=True, many = True)
    default_language = LanguageSerializer(read_only=True, allow_null=True)

    class Meta:
        model = Client
        fields = ("is_review_enabled", "is_price_enabled", "languages", "default_language", "is_registration_enabled", 
                  "is_courses_filter_enabled","is_Q_and_A_enabled","is_chat_group_enabled","is_lesson_notes_enabled",
                  "index_page","logo_file","logo_text","logo_type","login_type")

    def get_languages(self, obj):
        queryset = obj.languages.order_by("name")
        return LanguageSerializer(queryset, many=True).data
