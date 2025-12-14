from rest_framework import serializers

from .models import City, IraqFormSubmission, IraqObserverApplication, VotingCenter


def _normalize_phone_number(value: str) -> str:
    digits = ''.join(ch for ch in value if ch.isdigit())
    if len(digits) != 11:
        raise serializers.ValidationError('Phone number must be 11 digits long.')
    if not digits.startswith('07'):
        raise serializers.ValidationError('Phone number must start with 07.')
    return digits


class FlexibleBooleanField(serializers.BooleanField):
    TRUE_VALUES = set(serializers.BooleanField.TRUE_VALUES) | {'yes', 'y', 'نعم'}
    FALSE_VALUES = set(serializers.BooleanField.FALSE_VALUES) | {'no', 'n', 'لا'}


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ('id', 'name')


class VotingCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = VotingCenter
        fields = ('id', 'name')


class IraqFormSubmissionSerializer(serializers.ModelSerializer):
    voting_center = serializers.PrimaryKeyRelatedField(
        queryset=VotingCenter.objects.filter(is_active=True)
    )
    voting_center_detail = VotingCenterSerializer(
        source='voting_center', read_only=True
    )

    class Meta:
        model = IraqFormSubmission
        fields = (
            'id',
            'first_name',
            'second_name',
            'third_name',
            'gender',
            'age',
            'phone_number',
            'source',
            'polling_center_number',
            'voting_center',
            'voting_center_detail',
            'created_at',
        )
        read_only_fields = ('id', 'created_at', 'voting_center_detail')

    def validate_age(self, value):
        if not 18 <= value <= 120:
            raise serializers.ValidationError('Age must be between 18 and 120.')
        return value

    def validate_phone_number(self, value):
        return _normalize_phone_number(value)

    def validate(self, attrs):
        cleaned_attrs = dict(attrs)
        for field in ('first_name', 'second_name', 'third_name'):
            value = cleaned_attrs.get(field)
            if value is None:
                continue
            stripped = value.strip()
            if not stripped:
                raise serializers.ValidationError({field: 'This field cannot be blank.'})
            cleaned_attrs[field] = stripped
        return cleaned_attrs


class IraqObserverApplicationSerializer(serializers.ModelSerializer):

    class Meta:
        model = IraqObserverApplication
        fields = (
            'id',
            'full_name',
            'city',
            'district',
            'residential_area',
            'nearest_voting_center',
            'phone_number',
            'voter_card_number',
            'has_previous_shams_participation',
            'previous_training_topics',
            'experience_level',
            'political_neutrality_confirmation',
            'attendance_commitment_confirmation',
            'created_at',
        )
        read_only_fields = ('id', 'created_at', 'governorate_detail')
