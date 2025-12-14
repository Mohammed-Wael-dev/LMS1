import { get } from "../api";
import { API_ENDPOINTS } from "../utils/constants";

// Default settings when tenant system is disabled
const DEFAULT_SETTINGS: AppSettings = {
  is_review_enabled: true,
  is_price_enabled: true,
  is_registration_enabled: true,
  is_courses_filter_enabled: true,
  is_Q_and_A_enabled: true,
  is_chat_group_enabled: true,
  is_lesson_notes_enabled: true,
  index_page: "home",
  logo_type: "text",
  logo_text: "LMS",
  logo_file: "",
  login_type: "email",
  languages: [{ code: "ar", name: "العربية" }, { code: "en", name: "English" }],
  default_language: { code: "ar", name: "العربية" },
  student_timer: 20,
};

export async function fetchSettings(): Promise<AppSettings> {
  try {
    const res = await get(API_ENDPOINTS.settings);
    const data = res?.data?.data ?? res?.data ?? res;
    // Merge with defaults to ensure all fields exist
    return { ...DEFAULT_SETTINGS, ...data } as AppSettings;
  } catch (error) {
    console.warn("Failed to fetch settings, using defaults:", error);
    // Return default settings when tenant endpoint is not available
    return DEFAULT_SETTINGS;
  }
}
