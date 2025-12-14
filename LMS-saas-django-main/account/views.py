from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from .serializers import *
from .models import* 
from shared.utilts import MyResponse
# from django_tenants.utils import get_tenant_model  # Removed - tenant system disabled
from shared.utilts import get_first_error
from shared.app_utils import AppUtils
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from django.shortcuts import render
from django.http import HttpResponse
from course.models import Course
from collections import Counter
from .gemini_service import generate_questions, evaluate_answers, get_recommendations
import uuid

# Function-based login
@api_view(['POST'])
def login_view(request):
    serializer = LoginSerializer(data=request.data, context={"request": request})
    if serializer.is_valid():
        return AppUtils.response(data=serializer.validated_data)
    else:
        return AppUtils.response(error=get_first_error(serializer.errors))
    
# Phone-based login view
@api_view(['POST'])
def phone_login_view(request):
    """
    Phone-based login that checks tenant settings.
    If is_password_login_enabled is False, uses phone number authentication.
    Note: Tenant system disabled - this function now allows phone login by default
    """
    try:
        # Tenant system disabled - allow phone login by default
        # Get current tenant
        # tenant_model = get_tenant_model()
        # current_tenant = tenant_model.objects.get(schema_name=request.tenant.schema_name)
        
        # Check if password login is enabled
        # if current_tenant.is_password_login_enabled:
        #     return MyResponse({
        #         "error": "Password login is enabled. Please use the regular login endpoint."
        #     })
        
        # Use phone-based authentication
        serializer = PhoneLoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return MyResponse({"data": serializer.validated_data})
        
    except Exception as e:
        return MyResponse({"error": "رقم الهاتف غير موجود في النظام أو في النماذج"})

# Function-based register
@api_view(['POST'])
def register_view(request):
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user =  serializer.save()
       
        token_verification = TokensVerfication(user=user, token=uuid.uuid4(), token_type='signup')
        token_verification.save()
        return AppUtils.response(data="An email has been sent to verify your account")
    else:
        return AppUtils.response(error=get_first_error(serializer.errors))

@api_view(['POST'])
def verfiy_account(request):
    token_param = request.data.get('token')
    if not token_param:
        return AppUtils.response(error="Token is required.")
    
    
    token_verification = AppUtils.get_object_or_404(TokensVerfication, token=token_param)

    if token_verification.expire_date < timezone.now():
        return AppUtils.response(error="The token has expired.")
    
    user = token_verification.user
    user.is_verified = True
    user.save()

    refresh = RefreshToken.for_user(user)
    
    data = {
        "tokens": {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        },
        "user": BaseUserSerializer(user, context={"request": request}).data,
    }

    token_verification.delete()
    return AppUtils.response(data=data)
    
# Function-based refresh token
@api_view(['POST'])
def refresh_token_view(request):
    serializer = RefreshTokenSerializer(data=request.data)
    serializer.is_valid()
    if serializer.is_valid():
        return AppUtils.response(data=serializer.validated_data)
    else:
        return AppUtils.response(error=get_first_error(serializer.errors))

# Function-based update profile
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    user = request.user
    serializer = UpdateProfileSerializer(user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return MyResponse({"data": serializer.data})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_info_achivements_student(request):
    user = Student.objects.get_info_courses().filter(id=request.user.id).first()
    serializer = StudentProgressSerializer(user)
    return AppUtils.response(data=serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_instructor_achivements_view(request):
    if not request.user.is_instructor:
        return MyResponse({"error": "user not instructor" })
    user = Instructor.objects.get_info_courses().filter(id=request.user.id).first()
    serializer = InstructorStatsSerializer(user)
    return MyResponse({"data": serializer.data})

@api_view(['POST'])
def check_email(request):
    email = request.data.get('email')

    user = AppUtils.get_object_or_404(User, email=email)

    token_verification = TokensVerfication(user=user, token=uuid.uuid4(), token_type='password_reset')
    token_verification.save()

    return AppUtils.response(data= "An email has been sent")

@api_view(['POST'])
def send_verification_email(request):
    email = request.data.get('email')
    token_type = request.data.get('token_type')

    user = AppUtils.get_object_or_404(User, email=email)

    token_verification = TokensVerfication(user=user, token=uuid.uuid4(), token_type=token_type)
    token_verification.save()

    return AppUtils.response(data= "An email has been sent")

@api_view(['POST'])
def reset_password(request):
    token = request.data.get('token')
    new_password = request.data.get('password')

    if not token or not new_password:
        return AppUtils.response(error= "Token and password are required.", status=400)

    try:
        token_entry = TokensVerfication.objects.get(token=token)
    except TokensVerfication.DoesNotExist:
        return AppUtils.response(error="Invalid token.", status=400)

    if token_entry.expire_date < timezone.now():
        return AppUtils.response(error="The token has expired.")

    user = token_entry.user
    user.password = make_password(new_password) 
    user.save()

    token_entry.delete()

    return AppUtils.response(data="Password reset successfully.")


@api_view(['GET'])
@permission_classes([AllowAny])  # Changed to AllowAny for testing - can change back to IsAuthenticated later
def get_assessment_questions(request):
    """
    Get assessment questions.
    Always generate fresh questions from Gemini for each assessment attempt.
    """
    try:
        # توليد أسئلة جديدة من Gemini في كل مرة
        print("[INFO] Generating fresh questions from Gemini...")

        try:
            gemini_questions = generate_questions()
        except Exception as gemini_error:
            print(f"[ERROR] Gemini API error: {gemini_error}")
            import traceback
            traceback.print_exc()
            # Use fallback questions instead of returning error
            print("[INFO] Using fallback questions due to Gemini error")
            gemini_questions = None

        # If Gemini failed or returned invalid questions, use fallback
        if not gemini_questions or len(gemini_questions) < 10:
            print(f"[WARNING] Gemini returned {len(gemini_questions) if gemini_questions else 0} questions, using fallback")
            # Generate fallback questions
            gemini_questions = [
                {
                    "id": 1,
                    "text": "What is the past tense of 'go'?",
                    "options": [
                        {"key": "A", "value": "went"},
                        {"key": "B", "value": "goed"},
                        {"key": "C", "value": "gone"},
                        {"key": "D", "value": "going"}
                    ],
                    "correct_answer_key": "A"
                },
                {
                    "id": 2,
                    "text": "Choose the correct sentence:",
                    "options": [
                        {"key": "A", "value": "I am go to school"},
                        {"key": "B", "value": "I go to school"},
                        {"key": "C", "value": "I going to school"},
                        {"key": "D", "value": "I goes to school"}
                    ],
                    "correct_answer_key": "B"
                },
                {
                    "id": 3,
                    "text": "What does 'beautiful' mean?",
                    "options": [
                        {"key": "A", "value": "ugly"},
                        {"key": "B", "value": "pretty"},
                        {"key": "C", "value": "big"},
                        {"key": "D", "value": "small"}
                    ],
                    "correct_answer_key": "B"
                },
                {
                    "id": 4,
                    "text": "Which word is a noun?",
                    "options": [
                        {"key": "A", "value": "run"},
                        {"key": "B", "value": "quickly"},
                        {"key": "C", "value": "table"},
                        {"key": "D", "value": "beautiful"}
                    ],
                    "correct_answer_key": "C"
                },
                {
                    "id": 5,
                    "text": "Complete: I ___ a book yesterday.",
                    "options": [
                        {"key": "A", "value": "read"},
                        {"key": "B", "value": "reads"},
                        {"key": "C", "value": "reading"},
                        {"key": "D", "value": "will read"}
                    ],
                    "correct_answer_key": "A"
                },
                {
                    "id": 6,
                    "text": "What is the plural of 'child'?",
                    "options": [
                        {"key": "A", "value": "childs"},
                        {"key": "B", "value": "children"},
                        {"key": "C", "value": "childes"},
                        {"key": "D", "value": "child"}
                    ],
                    "correct_answer_key": "B"
                },
                {
                    "id": 7,
                    "text": "Choose the correct form: She ___ English very well.",
                    "options": [
                        {"key": "A", "value": "speak"},
                        {"key": "B", "value": "speaks"},
                        {"key": "C", "value": "speaking"},
                        {"key": "D", "value": "spoke"}
                    ],
                    "correct_answer_key": "B"
                },
                {
                    "id": 8,
                    "text": "What is the opposite of 'hot'?",
                    "options": [
                        {"key": "A", "value": "warm"},
                        {"key": "B", "value": "cold"},
                        {"key": "C", "value": "cool"},
                        {"key": "D", "value": "freezing"}
                    ],
                    "correct_answer_key": "B"
                },
                {
                    "id": 9,
                    "text": "Which sentence is correct?",
                    "options": [
                        {"key": "A", "value": "I have 20 years old"},
                        {"key": "B", "value": "I am 20 years old"},
                        {"key": "C", "value": "I has 20 years old"},
                        {"key": "D", "value": "I is 20 years old"}
                    ],
                    "correct_answer_key": "B"
                },
                {
                    "id": 10,
                    "text": "What time is it? (asking about time)",
                    "options": [
                        {"key": "A", "value": "What time is it?"},
                        {"key": "B", "value": "What time it is?"},
                        {"key": "C", "value": "What time are it?"},
                        {"key": "D", "value": "What time do it?"}
                    ],
                    "correct_answer_key": "A"
                }
            ]

        # حذف الأسئلة القديمة غير المستخدمة (تنظيف)
        try:
            # حذف الأسئلة التي لا ترتبط بإجابات مستخدمين
            from account.models import UserAssessment
            used_question_ids = UserAssessment.objects.values_list('question_id', flat=True).distinct()
            AssessmentQuestion.objects.exclude(id__in=used_question_ids).delete()
        except Exception as cleanup_error:
            print(f"[WARNING] Could not clean up old questions: {cleanup_error}")
        
        # تحويل أسئلة Gemini إلى تنسيق Frontend
        formatted_questions = []
        print(f"[INFO] Processing {len(gemini_questions)} questions from Gemini")
        print(f"[DEBUG] First question full structure: {gemini_questions[0] if gemini_questions else 'N/A'}")
        
        for idx, q in enumerate(gemini_questions):
            print(f"\n[INFO] ===== Processing question {idx + 1} =====")
            print(f"[INFO] Question text: {q.get('text', 'NO TEXT')[:100]}")
            
            options = q.get("options", [])
            print(f"[INFO] Question {idx + 1} has {len(options)} options")
            print(f"[DEBUG] Options structure: {options}")
            
            # التحقق من صحة البيانات
            if not q.get("text"):
                print(f"[WARNING] Skipping question {idx + 1}: No text")
                continue
                
            if not isinstance(options, list) or len(options) < 4:
                print(f"[WARNING] Skipping question {idx + 1}: Invalid options (type: {type(options)}, count: {len(options) if isinstance(options, list) else 'N/A'})")
                print(f"[DEBUG] Options data: {options}")
                continue
            
            try:
                # استخراج قيم الخيارات
                option_a = ""
                option_b = ""
                option_c = ""
                option_d = ""
                
                # معالجة الخيارات - دعم أشكال مختلفة
                if isinstance(options, list) and len(options) >= 4:
                    # محاولة استخراج الخيارات بالترتيب أولاً
                    for i, opt in enumerate(options[:4]):
                        if isinstance(opt, dict):
                            # إذا كان dict، استخدم value
                            value = opt.get("value", opt.get("text", ""))
                            key = opt.get("key", "").upper()
                            # استخدام key إذا كان موجوداً، وإلا استخدم الترتيب
                            if key == "A" or (i == 0 and not option_a):
                                option_a = value
                            elif key == "B" or (i == 1 and not option_b):
                                option_b = value
                            elif key == "C" or (i == 2 and not option_c):
                                option_c = value
                            elif key == "D" or (i == 3 and not option_d):
                                option_d = value
                        elif isinstance(opt, str):
                            # إذا كان string مباشرة
                            if i == 0:
                                option_a = opt
                            elif i == 1:
                                option_b = opt
                            elif i == 2:
                                option_c = opt
                            elif i == 3:
                                option_d = opt
                    
                    # إذا لم نجد الخيارات بعد، استخدم الترتيب مباشرة
                    if not option_a and len(options) >= 1:
                        opt = options[0]
                        option_a = opt.get("value", opt.get("text", "")) if isinstance(opt, dict) else str(opt)
                    if not option_b and len(options) >= 2:
                        opt = options[1]
                        option_b = opt.get("value", opt.get("text", "")) if isinstance(opt, dict) else str(opt)
                    if not option_c and len(options) >= 3:
                        opt = options[2]
                        option_c = opt.get("value", opt.get("text", "")) if isinstance(opt, dict) else str(opt)
                    if not option_d and len(options) >= 4:
                        opt = options[3]
                        option_d = opt.get("value", opt.get("text", "")) if isinstance(opt, dict) else str(opt)
                
                # التحقق من أن جميع الخيارات موجودة
                print(f"[DEBUG] Extracted options - A:'{option_a}', B:'{option_b}', C:'{option_c}', D:'{option_d}'")
                
                if not all([option_a, option_b, option_c, option_d]):
                    print(f"[WARNING] Skipping question {idx + 1}: Missing options (A:'{option_a}', B:'{option_b}', C:'{option_c}', D:'{option_d}')")
                    print(f"[DEBUG] Options structure: {options}")
                    print(f"[DEBUG] Options type: {type(options)}, Length: {len(options) if isinstance(options, list) else 'N/A'}")
                    continue
                
                print(f"[OK] All options extracted successfully for question {idx + 1}")
                
                # حفظ السؤال في قاعدة البيانات للاستخدام لاحقاً عند الإرسال
                question_obj = AssessmentQuestion.objects.create(
                    text=q.get("text", ""),
                    option_a=option_a,
                    option_b=option_b,
                    option_c=option_c,
                    option_d=option_d,
                    correct_answer_key=q.get("correct_answer_key", "A").upper(),
                    level_weight=(
                        "beginner" if idx < 3 else
                        "intermediate" if idx < 7 else
                        "advanced"
                    ),
                    order=idx + 1,
                    is_active=True
                )
                
                # استخدام serializer لتحويل البيانات
                serializer = AssessmentQuestionSerializer(question_obj)
                question_data = serializer.data
                
                # التأكد من أن البيانات صحيحة
                print(f"[DEBUG] Serialized question data: text={bool(question_data.get('text'))}, options_count={len(question_data.get('options', []))}")
                print(f"[DEBUG] Serialized options: {question_data.get('options', [])}")
                
                if question_data.get('text') and question_data.get('options') and len(question_data.get('options', [])) >= 4:
                    formatted_questions.append(question_data)
                    print(f"[OK] Question {idx + 1} added successfully to formatted_questions")
                else:
                    print(f"[WARNING] Invalid serialized question data at index {idx}: text={bool(question_data.get('text'))}, options_count={len(question_data.get('options', []))}")
                    print(f"[DEBUG] Full serialized data: {question_data}")
            except Exception as create_error:
                print(f"[ERROR] Error creating question {idx + 1}: {create_error}")
                import traceback
                traceback.print_exc()
                continue

        print(f"[INFO] Total formatted questions: {len(formatted_questions)}")
        
        if len(formatted_questions) < 10:
            print(f"[ERROR] Only {len(formatted_questions)} valid questions after serialization (expected 10)")
            print(f"[DEBUG] Gemini returned {len(gemini_questions)} questions")
            if gemini_questions and len(gemini_questions) > 0:
                print(f"[DEBUG] First question structure: {gemini_questions[0]}")
                print(f"[DEBUG] First question options: {gemini_questions[0].get('options', 'N/A')}")
            
            # If we have at least 5 questions, return them
            if len(formatted_questions) >= 5:
                print(f"[WARNING] Returning {len(formatted_questions)} questions instead of 10")
                return AppUtils.response(data=formatted_questions)
            
            # If we have at least 1 question, return them (better than nothing)
            if len(formatted_questions) >= 1:
                print(f"[WARNING] Returning {len(formatted_questions)} questions (minimum)")
                return AppUtils.response(data=formatted_questions)
            
            # If we still have no questions, create them directly without DB
            if len(formatted_questions) == 0:
                print("[WARNING] No formatted questions, creating direct questions without DB")
                direct_questions = []
                for idx, q in enumerate(gemini_questions[:10]):
                    options_list = []
                    if isinstance(q.get("options"), list):
                        for opt in q.get("options", [])[:4]:
                            if isinstance(opt, dict):
                                options_list.append({
                                    "key": opt.get("key", ["A", "B", "C", "D"][len(options_list)]),
                                    "value": opt.get("value", opt.get("text", ""))
                                })
                            elif isinstance(opt, str):
                                options_list.append({
                                    "key": ["A", "B", "C", "D"][len(options_list)],
                                    "value": opt
                                })
                    
                    if q.get("text") and len(options_list) >= 4:
                        direct_questions.append({
                            "id": str(uuid.uuid4()),
                            "text": q.get("text", ""),
                            "options": options_list,
                            "order": idx + 1
                        })
                
                if len(direct_questions) >= 5:
                    print(f"[OK] Created {len(direct_questions)} direct questions")
                    return AppUtils.response(data=direct_questions)
            
            # Otherwise return error with more details
            error_msg = f"تم توليد {len(formatted_questions)} سؤال فقط من أصل {len(gemini_questions) if gemini_questions else 0}. يرجى المحاولة مرة أخرى."
            print(f"[ERROR] {error_msg}")
            return AppUtils.response(
                error=error_msg,
                status=500
            )

        print(f"[INFO] Successfully generated {len(formatted_questions)} questions")
        
        # التحقق النهائي من البيانات قبل الإرجاع
        if not formatted_questions or len(formatted_questions) == 0:
            print("[ERROR] formatted_questions is empty!")
            return AppUtils.response(
                error="فشل توليد الأسئلة. يرجى المحاولة مرة أخرى.",
                status=500
            )
        
        # التحقق من أن كل سؤال يحتوي على البيانات المطلوبة
        for idx, q in enumerate(formatted_questions):
            if not q.get('id') or not q.get('text') or not q.get('options'):
                print(f"[ERROR] Invalid question structure at index {idx}: {q}")
        
        return AppUtils.response(data=formatted_questions)
    
    except Exception as e:
        print(f"[ERROR] Error in get_assessment_questions: {e}")
        import traceback
        traceback.print_exc()
        return AppUtils.response(
            error="حدث خطأ أثناء تحميل الأسئلة. يرجى المحاولة مرة أخرى.",
            status=500
        )



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_assessment(request):
    """Submit assessment answers and calculate user level using Gemini AI"""
    serializer = SubmitAssessmentSerializer(data=request.data)
    if not serializer.is_valid():
        return AppUtils.response(error=get_first_error(serializer.errors), status=400)
    
    user = request.user
    answers = serializer.validated_data['answers']
    
    # Get questions data for Gemini evaluation
    questions_data = []
    user_answers_for_gemini = []
    
    # Calculate score and level (traditional method as fallback)
    correct_count = 0
    level_counts = Counter()
    
    for answer_data in answers:
        question_id = answer_data['question_id']
        selected_answer = answer_data['selected_answer']
        
        try:
            question = AssessmentQuestion.objects.get(id=question_id, is_active=True)
            is_correct = selected_answer.upper() == question.correct_answer_key
            
            # Prepare data for Gemini with full question details
            questions_data.append({
                'id': str(question.id),
                'text': question.text,
                'correct_answer_key': question.correct_answer_key,
                'options': [
                    {'key': 'A', 'value': question.option_a},
                    {'key': 'B', 'value': question.option_b},
                    {'key': 'C', 'value': question.option_c},
                    {'key': 'D', 'value': question.option_d}
                ]
            })
            
            user_answers_for_gemini.append({
                'id': str(question.id),
                'selected_key': selected_answer.upper()
            })
            
            # Save user answer
            UserAssessment.objects.update_or_create(
                user=user,
                question=question,
                defaults={
                    'selected_answer': selected_answer.upper(),
                    'is_correct': is_correct
                }
            )
            
            if is_correct:
                correct_count += 1
                level_counts[question.level_weight] += 1
        except AssessmentQuestion.DoesNotExist:
            continue
    
    # Use Gemini to evaluate and determine level with detailed feedback
    gemini_result = None
    detailed_feedback = []
    advanced_tips = []
    
    try:
        print("[INFO] Evaluating answers with Gemini...")
        gemini_result = evaluate_answers(questions_data, user_answers_for_gemini)
        
        if gemini_result:
            print("[INFO] Gemini evaluation successful")
            detailed_feedback = gemini_result.get('detailed_feedback', [])
            advanced_tips = gemini_result.get('advanced_tips', [])
            print(f"[DEBUG] advanced_tips type: {type(advanced_tips)}, value: {advanced_tips}")
            
            # Update UserAssessment with detailed feedback from Gemini
            for feedback_item in detailed_feedback:
                question_id = feedback_item.get('question_id')
                if question_id:
                    try:
                        # Find the corresponding UserAssessment
                        question_obj = AssessmentQuestion.objects.get(id=question_id)
                        user_assessment = UserAssessment.objects.get(
                            user=user,
                            question=question_obj
                        )
                        # Update with Gemini's evaluation and explanation
                        user_assessment.is_correct = feedback_item.get('is_correct', user_assessment.is_correct)
                        user_assessment.explanation_ar = feedback_item.get('explanation_ar', '')
                        user_assessment.save()
                        print(f"[INFO] Updated UserAssessment for question {question_id} with explanation")
                    except (AssessmentQuestion.DoesNotExist, UserAssessment.DoesNotExist) as e:
                        print(f"[WARNING] Could not update UserAssessment for question {question_id}: {e}")
                        continue
        else:
            print("[WARNING] Gemini evaluation returned None, using traditional method")
    except Exception as e:
        print(f"[ERROR] Error evaluating with Gemini: {e}")
        import traceback
        traceback.print_exc()
    
    # Determine user level - use Gemini result if available, otherwise use traditional method
    total_questions = len(answers)
    score_percentage = (correct_count / total_questions) * 100 if total_questions > 0 else 0
    
    if gemini_result:
        # Map Gemini level_code to our level_weight
        level_code = gemini_result.get('level_code', 'B1-B2')
        if 'A1' in level_code or 'A2' in level_code:
            user_level = 'beginner'
        elif 'B1' in level_code or 'B2' in level_code:
            user_level = 'intermediate'
        else:  # C1-C2
            user_level = 'advanced'
        
        level_name_ar = gemini_result.get('level_name_ar', 'متوسط')
        level_name_en = gemini_result.get('level_name_en', 'Intermediate')
        total_score = gemini_result.get('total_score', gemini_result.get('correct_count', correct_count))
        incorrect_count = gemini_result.get('incorrect_count', total_questions - total_score)
    else:
        # Fallback to traditional method
        if score_percentage >= 71:
            user_level = 'advanced'
            level_name_ar = 'متقدم'
            level_name_en = 'Advanced'
        elif score_percentage >= 41:
            user_level = 'intermediate'
            level_name_ar = 'متوسط'
            level_name_en = 'Intermediate'
        else:
            user_level = 'beginner'
            level_name_ar = 'أساسي'
            level_name_en = 'Beginner'
        total_score = correct_count
        incorrect_count = total_questions - correct_count
    
    # Update user with assessment results and advanced tips
    user.has_completed_assessment = True
    user.assessment_level = user_level
    
    # Ensure advanced_tips is a valid Python list for JSONField
    import json
    try:
        if advanced_tips:
            # Ensure advanced_tips is a valid Python list (not a string)
            if isinstance(advanced_tips, str):
                try:
                    advanced_tips = json.loads(advanced_tips)
                except json.JSONDecodeError:
                    print(f"[WARNING] Failed to parse advanced_tips as JSON, using empty list")
                    advanced_tips = []
            # Ensure it's a list
            if not isinstance(advanced_tips, list):
                print(f"[WARNING] advanced_tips is not a list (type: {type(advanced_tips)}), converting to list")
                advanced_tips = []
            print(f"[INFO] Saving {len(advanced_tips)} advanced tips (type: {type(advanced_tips)})")
            # Ensure it's a proper Python list that Django JSONField can serialize
            user.assessment_advanced_tips = list(advanced_tips) if advanced_tips else []
        else:
            # Set to None if empty (JSONField with null=True)
            print("[INFO] No advanced tips, setting to None")
            user.assessment_advanced_tips = None
        
        # Save user - Django JSONField will automatically serialize the list to JSON
        user.save()
        print(f"[INFO] User saved successfully with assessment_advanced_tips")
    except Exception as e:
        print(f"[ERROR] Failed to save user: {e}")
        import traceback
        traceback.print_exc()
        # Try to save without advanced_tips as fallback
        try:
            user.assessment_advanced_tips = None
            user.save()
            print("[WARNING] Saved user without advanced_tips as fallback")
        except Exception as e2:
            print(f"[ERROR] Failed to save user even without advanced_tips: {e2}")
            raise
    print(f"[INFO] Updated user assessment: level={user_level}, score={total_score}/{total_questions}")
    
    # حذف الأسئلة المؤقتة القديمة (تنظيف)
    # نحتفظ فقط بالأسئلة المرتبطة بإجابات المستخدم الحالية
    try:
        used_question_ids = [answer_data['question_id'] for answer_data in answers]
        # حذف الأسئلة التي لم تُستخدم في هذا الاختبار
        AssessmentQuestion.objects.exclude(id__in=used_question_ids).filter(is_active=True).delete()
    except Exception as e:
        print(f"Warning: Could not clean up old questions: {e}")
    
    # Get recommended courses based on level - only 3 courses
    # Use try-except to handle missing table gracefully
    try:
        recommended_courses = Course.objects.filter(
            level=user_level,
            is_published=True
        ).order_by('-created_at')[:3]
    except Exception as course_error:
        print(f"[WARNING] Could not fetch courses: {course_error}")
        recommended_courses = Course.objects.none()  # Empty queryset
    
    from course.serializers import CourseSerializerV2
    courses_serializer = CourseSerializerV2(recommended_courses, many=True, context={'request': request})
    
    # Get recommendations from Gemini if not already included
    if not advanced_tips:
        try:
            level_mapping = {
                'beginner': 'A1-A2',
                'intermediate': 'B1-B2',
                'advanced': 'C1-C2'
            }
            level_code = level_mapping.get(user_level, 'B1-B2')
            advanced_tips = get_recommendations(level_code)
        except Exception as e:
            print(f"[WARNING] Could not get recommendations from Gemini: {e}")
            advanced_tips = []
    
    return AppUtils.response(data={
        'level': user_level,
        'level_name_ar': level_name_ar,
        'level_name_en': level_name_en,
        'score': total_score,
        'total_questions': total_questions,
        'correct_count': total_score,
        'incorrect_count': incorrect_count,
        'score_percentage': round(score_percentage, 1),
        'detailed_feedback': detailed_feedback,  # Feedback from Gemini for each question
        'advanced_tips': advanced_tips,  # Advanced tips and recommendations
        'recommended_courses': courses_serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_assessment_status(request):
    """Check if user has completed assessment"""
    user = request.user
    return AppUtils.response(data={
        'has_completed_assessment': user.has_completed_assessment,
        'assessment_level': user.assessment_level
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_assessment_recommendations(request):
    """Get recommendations based on user's assessment level"""
    user = request.user
    
    if not user.has_completed_assessment or not user.assessment_level:
        return AppUtils.response(error="User has not completed assessment", status=404)
    
    # Map our level to Gemini level_code
    level_mapping = {
        'beginner': 'A1-A2',
        'intermediate': 'B1-B2',
        'advanced': 'C1-C2'
    }
    
    level_code = level_mapping.get(user.assessment_level, 'B1-B2')
    
    try:
        recommendations = get_recommendations(level_code)
        return AppUtils.response(data={
            'recommendations': recommendations,
            'level_code': level_code,
            'level': user.assessment_level
        })
    except Exception as e:
        print(f"Error getting recommendations: {e}")
        return AppUtils.response(error="Failed to get recommendations", status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_assessment_result(request):
    """Get user's assessment result with detailed statistics"""
    user = request.user
    
    if not user.has_completed_assessment:
        return AppUtils.response(error="User has not completed assessment", status=404)
    
    # Get all user assessments
    user_assessments = UserAssessment.objects.filter(user=user).select_related('question')
    
    # Calculate statistics
    total_questions = user_assessments.count()
    correct_answers = user_assessments.filter(is_correct=True).count()
    incorrect_answers = total_questions - correct_answers
    score_percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0
    
    # Get answers by level
    level_stats = {}
    for assessment in user_assessments:
        level = assessment.question.level_weight
        if level not in level_stats:
            level_stats[level] = {'total': 0, 'correct': 0}
        level_stats[level]['total'] += 1
        if assessment.is_correct:
            level_stats[level]['correct'] += 1
    
    # Get recommended courses - only 3 courses
    # Use try-except to handle missing table gracefully
    try:
        recommended_courses = Course.objects.filter(
            level=user.assessment_level,
            is_published=True
        ).order_by('-created_at')[:3]
    except Exception as course_error:
        print(f"[WARNING] Could not fetch courses: {course_error}")
        recommended_courses = Course.objects.none()  # Empty queryset
    
    from course.serializers import CourseSerializerV2
    courses_serializer = CourseSerializerV2(recommended_courses, many=True, context={'request': request})
    
    # Get detailed answers with explanations
    detailed_answers = []
    for assessment in user_assessments:
        detailed_answers.append({
            'question_id': str(assessment.question.id),
            'question_text': assessment.question.text,
            'selected_answer': assessment.selected_answer,
            'correct_answer': assessment.question.correct_answer_key,
            'is_correct': assessment.is_correct,
            'level': assessment.question.level_weight,
            'explanation_ar': assessment.explanation_ar or ''  # إضافة الشرح المفصل
        })
    
    # Get advanced tips from user profile (saved from Gemini)
    advanced_tips = user.assessment_advanced_tips or []
    
    # If no tips saved, try to get them from Gemini
    if not advanced_tips:
        try:
            level_mapping = {
                'beginner': 'A1-A2',
                'intermediate': 'B1-B2',
                'advanced': 'C1-C2'
            }
            level_code = level_mapping.get(user.assessment_level, 'B1-B2')
            recommendations = get_recommendations(level_code)
            advanced_tips = recommendations if isinstance(recommendations, list) else []
        except Exception as e:
            print(f"[WARNING] Could not get recommendations: {e}")
            advanced_tips = []
    
    return AppUtils.response(data={
        'level': user.assessment_level,
        'score': correct_answers,
        'total_questions': total_questions,
        'incorrect_answers': incorrect_answers,
        'score_percentage': round(score_percentage, 1),
        'level_stats': level_stats,
        'recommended_courses': courses_serializer.data,
        'detailed_answers': detailed_answers,  # يحتوي على explanation_ar لكل سؤال
        'advanced_tips': advanced_tips,  # نصائح متقدمة من Gemini
        'completed_at': user_assessments.first().created_at if user_assessments.exists() else None
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_assessment(request):
    """Reset user assessment to allow retaking"""
    user = request.user
    
    if not user.is_student:
        return AppUtils.response(error="Only students can reset assessment", status=403)
    
    # Delete all user assessments
    UserAssessment.objects.filter(user=user).delete()
    
    # Reset user assessment status
    user.has_completed_assessment = False
    user.assessment_level = None
    # Reset advanced tips to None (JSONField with null=True)
    user.assessment_advanced_tips = None
    
    try:
        user.save()
        print(f"[INFO] Assessment reset successfully for user {user.email}")
    except Exception as e:
        print(f"[ERROR] Failed to reset assessment: {e}")
        import traceback
        traceback.print_exc()
        return AppUtils.response(error=f"Failed to reset assessment: {str(e)}", status=500)
    
    return AppUtils.response(data={
        'message': 'Assessment reset successfully. You can now retake the assessment.',
        'has_completed_assessment': False,
        'assessment_level': None
    })

