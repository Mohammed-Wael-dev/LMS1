# -*- coding: utf-8 -*-
"""
Gemini Assessment Service
FINAL – Gemini 2.5 Flash (Stable & Safe)
"""

import json
import re
import google.generativeai as genai
from django.conf import settings


# =========================================================
# Gemini Configuration
# =========================================================
genai.configure(api_key=settings.GEMINI_API_KEY)

MODEL_NAME = "gemini-2.5-flash"


# =========================================================
# Helpers
# =========================================================
def extract_json(text: str):
    """
    Extract the first valid JSON object from Gemini output
    (handles extra text safely)
    """
    if not text:
        raise ValueError("Empty response from Gemini")

    # Try to find JSON in the text
    # First, try to find JSON wrapped in markdown code blocks
    markdown_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", text, re.IGNORECASE)
    if markdown_match:
        try:
            return json.loads(markdown_match.group(1))
        except json.JSONDecodeError:
            pass
    
    # Try to find any JSON object
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError(f"No JSON found in Gemini response:\n{text[:500]}")

    json_str = match.group()
    
    # Try to parse
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        # Try to fix common issues
        # Remove trailing commas
        json_str = re.sub(r',\s*}', '}', json_str)
        json_str = re.sub(r',\s*]', ']', json_str)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            raise ValueError(f"Invalid JSON in Gemini response: {e}\nJSON string: {json_str[:500]}")


def get_model():
    """
    Centralized model creation
    """
    return genai.GenerativeModel(
        MODEL_NAME,
        generation_config={
            "temperature": 0.3,
            "max_output_tokens": 2048,
        },
    )


# =========================================================
# PROMPTS
# =========================================================
ASSESSMENT_PROMPT = """
You are an English placement test generator.

STRICT RULES:
- Output JSON only
- No markdown
- No explanations
- No extra text

Generate exactly 10 multiple-choice questions.
Difficulty progression: A1 → A2 → B1 → B2 → C1 → C2
Language: English

JSON FORMAT:

{
  "questions": [
    {
      "id": 1,
      "type": "Grammar | Vocabulary | Reading | Tenses",
      "text": "Question text",
      "options": [
        {"key": "A", "value": "Option A"},
        {"key": "B", "value": "Option B"},
        {"key": "C", "value": "Option C"},
        {"key": "D", "value": "Option D"}
      ],
      "correct_answer_key": "A"
    }
  ]
}
"""


# =========================================================
# Generate Questions
# =========================================================
def generate_questions():
    try:
        # التحقق من وجود API key
        if not settings.GEMINI_API_KEY:
            print("[ERROR] GEMINI_API_KEY not configured")
            raise ValueError("Gemini API key is not configured")
        
        model = genai.GenerativeModel(MODEL_NAME)

        response = model.generate_content(ASSESSMENT_PROMPT)
        raw_text = response.text.strip()

        print("\n===== GEMINI QUESTIONS RAW =====")
        print(raw_text)
        print("================================\n")

        data = extract_json(raw_text)
        print(f"[INFO] Extracted JSON keys: {list(data.keys())}")

        questions = data.get("questions", [])
        if not questions:
            print(f"[ERROR] No 'questions' key in response. Available keys: {list(data.keys())}")
            raise ValueError("Gemini returned empty questions")
        
        print(f"[INFO] Found {len(questions)} questions in response")
        
        # التحقق من صحة الأسئلة
        valid_questions = []
        for idx, q in enumerate(questions):
            if not isinstance(q, dict):
                print(f"[WARNING] Question {idx} is not a dict: {type(q)}")
                continue
                
            text = q.get("text")
            options = q.get("options", [])
            
            if not text:
                print(f"[WARNING] Question {idx} has no text")
                continue
                
            if not isinstance(options, list):
                print(f"[WARNING] Question {idx} options is not a list: {type(options)}")
                continue
                
            if len(options) < 4:
                print(f"[WARNING] Question {idx} has only {len(options)} options (need 4)")
                continue
            
            valid_questions.append(q)
            print(f"[OK] Question {idx + 1} is valid")
        
        print(f"[INFO] Valid questions: {len(valid_questions)}/{len(questions)}")
        
        if len(valid_questions) < 10:
            print(f"[WARNING] Only {len(valid_questions)} valid questions found (need 10)")
            # Return what we have if at least 5 questions
            if len(valid_questions) >= 5:
                return valid_questions
            else:
                return []

        return valid_questions[:10]  # إرجاع أول 10 أسئلة صحيحة

    except Exception as e:
        print("[ERROR] Gemini generate_questions error:", e)
        import traceback
        traceback.print_exc()
        
        # Return fallback questions if Gemini fails
        print("[INFO] Returning fallback questions")
        return [
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


# =========================================================
# Evaluate Answers with Detailed Feedback
# =========================================================
def evaluate_answers(questions_data, user_answers):
    """
    Evaluate user answers using Gemini AI and return:
    - Correct score
    - CEFR level
    - Detailed feedback for each question
    - Advanced tips and recommendations
    """
    prompt = f"""
You are an expert English language assessment evaluator. Evaluate the user's answers and provide detailed feedback.

QUESTIONS WITH CORRECT ANSWERS:
{json.dumps(questions_data, ensure_ascii=False, indent=2)}

USER ANSWERS:
{json.dumps(user_answers, ensure_ascii=False, indent=2)}

TASK:
1. Evaluate each answer (correct/incorrect)
2. Calculate total score
3. Determine CEFR level (A1-A2, B1-B2, C1-C2)
4. Provide detailed feedback for each question (in Arabic)
5. Provide advanced tips and learning strategies (in Arabic)

STRICT OUTPUT JSON ONLY (no markdown, no explanations):

{{
  "total_score": 7,
  "total_questions": 10,
  "correct_count": 7,
  "incorrect_count": 3,
  "level_code": "B1-B2",
  "level_name_ar": "متوسط",
  "level_name_en": "Intermediate",
  "detailed_feedback": [
    {{
      "question_id": "uuid-here",
      "is_correct": true,
      "user_answer": "A",
      "correct_answer": "A",
      "explanation_ar": "إجابة صحيحة! هذا السؤال يتعلق بـ..."
    }},
    {{
      "question_id": "uuid-here",
      "is_correct": false,
      "user_answer": "B",
      "correct_answer": "A",
      "explanation_ar": "إجابة خاطئة. الإجابة الصحيحة هي A لأن..."
    }}
  ],
  "advanced_tips": [
    {{
      "title": "نصيحة متقدمة 1",
      "description": "وصف تفصيلي للنصيحة بالعربية",
      "type": "Tips"
    }},
    {{
      "title": "فجوة معرفية",
      "description": "وصف الفجوة المعرفية بالعربية",
      "type": "Knowledge_Gaps"
    }}
  ]
}}
"""
    try:
        model = get_model()
        response = model.generate_content(prompt)

        raw_text = response.text.strip()
        print("\n===== GEMINI EVALUATION RAW =====")
        print(raw_text)
        print("================================\n")

        result = extract_json(raw_text)
        
        # Validate result structure
        if not result.get("total_score"):
            print("[WARNING] Gemini evaluation missing total_score")
            result["total_score"] = result.get("correct_count", 0)
        
        if not result.get("level_code"):
            print("[WARNING] Gemini evaluation missing level_code")
            result["level_code"] = "B1-B2"
        
        return result

    except Exception as e:
        print("[ERROR] Gemini evaluate_answers error:", e)
        import traceback
        traceback.print_exc()
        return None


# =========================================================
# Recommendations
# =========================================================
def get_recommendations(level_code):
    prompt = f"""
You are an expert English language teacher providing personalized learning recommendations for CEFR level {level_code}.

Provide:
1. Tips and strategies to improve at this level
2. Knowledge gaps to fill (what the student needs to learn)
3. Specific areas to focus on

STRICT OUTPUT JSON ONLY (Arabic descriptions):

{{
  "recommendations": [
    {{
      "title": "نصائح للتحسين",
      "description": "نصيحة مفصلة بالعربية حول كيفية تحسين المستوى في هذا المستوى",
      "type": "Tips"
    }},
    {{
      "title": "ملء الفجوات المعرفية",
      "description": "وصف الفجوات المعرفية التي يجب ملؤها في هذا المستوى بالعربية",
      "type": "Knowledge_Gaps"
    }},
    {{
      "title": "مجالات التركيز",
      "description": "المجالات التي يجب التركيز عليها في هذا المستوى بالعربية",
      "type": "Focus_Areas"
    }},
    {{
      "title": "استراتيجيات التعلم",
      "description": "استراتيجيات تعلم فعالة لهذا المستوى بالعربية",
      "type": "Learning_Strategies"
    }}
  ]
}}
"""
    try:
        model = get_model()
        response = model.generate_content(prompt)

        raw_text = response.text.strip()
        print("\n===== GEMINI RECOMMENDATIONS RAW =====")
        print(raw_text)
        print("=====================================\n")

        data = extract_json(raw_text)
        return data.get("recommendations", [])

    except Exception as e:
        print("[ERROR] Gemini get_recommendations error:", e)
        return []
