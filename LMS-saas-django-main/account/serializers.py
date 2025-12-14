from typing import Any
import re
import uuid
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User , Instructor, TokensVerfication, AssessmentQuestion, UserAssessment

class BaseUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "first_name", 
            "last_name",
            "email", 
            'is_student', 
            'is_instructor',    
            'profile_image',
            'bio',
            'phone',
            'location',
            'date_joined', 
            'is_verified',
            'has_completed_assessment',
            'assessment_level',
        ]

class UserSerializer(serializers.ModelSerializer):
    refresh_token = serializers.CharField(read_only=True)
    access_token = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            "email",
            "password",
            "is_instructor",
            "is_student",
            'profile_image',
            "refresh_token",
            "access_token",
        ]
        extra_kwargs = {
            "email": {"write_only": True},
            "first_name": {"write_only": True},
            "last_name": {"write_only": True},
            "is_instructor": {"write_only": True},
            "is_student": {"write_only": True},
            "profile_image": {"write_only": True},
            "password": {"write_only": True},
        }

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User.objects.create_user(password=password, **validated_data)
        user.is_active = True
        user.set_password(password)
        user.save()
        refresh = RefreshToken.for_user(user)
        self._refresh_token = str(refresh)
        self._access_token = str(refresh.access_token)
        return user
        
    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["token"] = {
            "refresh_token": getattr(self, "_refresh_token", ""),
            "access_token": getattr(self, "_access_token", "")
        }
        rep["user"] = BaseUserSerializer(instance).data
        return rep


class TokenSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)

class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    tokens = TokenSerializer(read_only=True)
    user = BaseUserSerializer(read_only=True)

    default_error_messages = {
        "invalid_credentials": "Invalid email or password",
        "account_not_verified": "Account not verified, an email has been sent to verify your account",
    }

    def validate(self, data):
        identifier = data.get("identifier")
        password = data.get("password")

        if not identifier or not password:
            self.fail("invalid_credentials")

        user_candidate = self._resolve_user(identifier)
        if user_candidate:
            auth_email = user_candidate.email
        else:
            auth_email = self._normalize_email(identifier)
            if not auth_email:
                self.fail("invalid_credentials")

        user = authenticate(
            request=self.context.get("request"),
            email=auth_email,
            password=password,
        )
        if not user and user_candidate and user_candidate.check_password(password):
            user = user_candidate

        if user and not user.is_verified:
            token_verification = TokensVerfication(user=user, token=uuid.uuid4(), token_type='signup')
            token_verification.save()
            self.fail("account_not_verified")

        if user and user.is_active:
            refresh = RefreshToken.for_user(user)
            return {
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                "user": BaseUserSerializer(user, context=self.context).data,
            }

        self.fail("invalid_credentials")

    def _normalize_email(self, value):
        value = (value or "").strip()
        if "@" not in value:
            return None
        return value.lower()

    def _resolve_user(self, identifier):
        identifier = (identifier or "").strip()
        if not identifier:
            return None
        if "@" in identifier:
            return User.objects.filter(email__iexact=identifier).first()
        return self._resolve_user_by_phone(identifier)

    def _resolve_user_by_phone(self, phone):
        digits = re.sub(r"\\D", "", phone or "")
        if len(digits) < 8:
            return None
        suffix = digits[-8:]
        matches = []
        for candidate in User.objects.filter(phone__isnull=False):
            cleaned = re.sub(r"\\D", "", candidate.phone or "")
            if cleaned.endswith(suffix):
                matches.append(candidate)
        # Compare digits-only suffix to handle varied formatting (e.g., country codes or separators).
        if len(matches) == 1:
            return matches[0]

        return None

class RefreshTokenSerializer(serializers.Serializer):
    refresh_token = serializers.CharField()
    access_token = serializers.CharField(read_only=True)
    extra_kwargs = {
        "refresh_token": {"write_only": True},
    }
    def validate(self, data):
        refresh_token = data.get("refresh_token")
        try:
            refresh = RefreshToken(refresh_token)
            return {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }
        except Exception as e:
            raise serializers.ValidationError("Invalid refresh token") from e


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "profile_image",
            "bio",
            "phone",
            "location"

        ]
        extra_kwargs = {
            "email": {"required": False},
            "first_name": {"required": False},
            "last_name": {"required": False},
            "profile_image": {"required": False},
            "bio": {"required": False},
            "phone": {"required": False},
            "location": {"required": False},
        }


class StudentProgressSerializer(serializers.ModelSerializer):
    courses_completed = serializers.IntegerField(read_only=True, default=0)
    certificates_earned = serializers.IntegerField(read_only=True, default=0)
    new_courses_this_month = serializers.IntegerField(read_only=True, default=0)
    overall_progress = serializers.FloatField(read_only=True, default=10.0)
    enrolled_courses = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "courses_completed",
            "certificates_earned",
            "enrolled_courses",
            "new_courses_this_month",
            'overall_progress',
        ]



class PhoneLoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField(write_only=True)
    tokens = TokenSerializer(read_only=True)
    user = BaseUserSerializer(read_only=True)

    def validate(self, data):
        phone_number = data.get("phone_number")
        
        if not phone_number:
            self.fail("invalid_phone")
        
        if len(phone_number) < 8:
            self.fail("invalid_phone")
        
        # Search for user by phone number
        user = self._find_user_by_phone(phone_number)
        
        if not user:
            # Search in IraqFormSubmission
            user = self._create_user_from_form(phone_number)
        
        if not user:
            self.fail("phone_not_found")
        
        if user and user.is_active:
            refresh = RefreshToken.for_user(user)
            return {
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                "user": BaseUserSerializer(user, context=self.context).data,
            }
        
        self.fail("phone_not_found")

    def _find_user_by_phone(self, phone_number):
        """Find user by phone number with flexible matching"""
        # Search for exact match first
        user = User.objects.filter(phone=phone_number).first()
        if user:
            return user
        
        # If no exact match, try with last 8 digits
        if len(phone_number) >= 8:
            suffix = phone_number[-8:]
            matches = []
            
            for candidate in User.objects.filter(phone__isnull=False):
                if candidate.phone and candidate.phone.endswith(suffix):
                    matches.append(candidate)
            
            if len(matches) == 1:
                return matches[0]
        
        return None

    def _create_user_from_form(self, phone_number):
        """Create user from IraqFormSubmission if phone number found"""
        try:
            from iraq_form.models import IraqFormSubmission
            
            # Search for exact phone number match first
            form_submission = IraqFormSubmission.objects.filter(
                phone_number=phone_number
            ).first()
            
            # If no exact match, try with last 8 digits
            if not form_submission and len(phone_number) >= 8:
                suffix = phone_number[-8:]
                form_submission = IraqFormSubmission.objects.filter(
                    phone_number__endswith=suffix
                ).first()
            
            if form_submission:
                # Create new user with student type
                user = User.objects.create_user(
                    email=f"{form_submission.phone_number}@student.local",  # Temporary email
                    first_name=form_submission.first_name,
                    last_name=f"{form_submission.second_name} {form_submission.third_name}",
                    phone=form_submission.phone_number,
                    is_student=True,
                    is_active=True
                )
                return user
        except Exception:
            pass
        
        return None


class InstructorStatsSerializer(serializers.ModelSerializer):
    total_courses = serializers.IntegerField(read_only=True)
    total_students = serializers.IntegerField(read_only=True)
    average_rating = serializers.FloatField(read_only=True)  
    total_reviews = serializers.IntegerField(read_only=True)
    new_reviews = serializers.IntegerField(read_only=True)
    new_students = serializers.IntegerField(read_only=True)
    revenue_this_month = serializers.FloatField(read_only=True)
    revenue = serializers.FloatField(read_only=True)

    class Meta:
        model = Instructor 
        fields = [
            "total_courses",
            "total_students",
            "average_rating",
            "total_reviews",
            "new_reviews",
            "new_students",
            "revenue_this_month",
            "revenue",
        ]


class AssessmentQuestionSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    text = serializers.CharField(source='text', read_only=True)

    class Meta:
        model = AssessmentQuestion
        fields = [
            'id',
            'text',
            'options',
            'order',
        ]

    def get_options(self, obj):
        options_list = []
        if obj.option_a:
            options_list.append({"key": "A", "value": obj.option_a})
        if obj.option_b:
            options_list.append({"key": "B", "value": obj.option_b})
        if obj.option_c:
            options_list.append({"key": "C", "value": obj.option_c})
        if obj.option_d:
            options_list.append({"key": "D", "value": obj.option_d})
        return options_list



class AssessmentAnswerSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    selected_answer = serializers.CharField(max_length=1)


class SubmitAssessmentSerializer(serializers.Serializer):
    answers = AssessmentAnswerSerializer(many=True)
    
    def validate_answers(self, value):
        if len(value) != 10:
            raise serializers.ValidationError("You must answer exactly 10 questions.")
        return value



