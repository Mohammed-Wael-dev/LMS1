import { useEffect } from "react";
import { useNavigate } from "react-router";
import { USER_KEY } from "../utils/constants";

/**
 * Guard component to redirect students to assessment if they haven't completed it
 * This runs on app load and navigation
 */
export const AssessmentGuard: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user needs to complete assessment
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const currentPath = window.location.pathname;

        // Only redirect if:
        // 1. User is a student
        // 2. Hasn't completed assessment
        // 3. Not already on assessment page
        // 4. Not on auth pages (login, signup, verify)
        // 5. Not on assessment result page
        if (
          user?.is_student &&
          !user?.has_completed_assessment &&
          !currentPath.includes("/assessment") &&
          !currentPath.includes("/assessment-result") &&
          !currentPath.includes("/login") &&
          !currentPath.includes("/sign-up") &&
          !currentPath.includes("/verify-account") &&
          !currentPath.includes("/verify-email") &&
          !currentPath.includes("/reset-password")
        ) {
          navigate("/assessment", { replace: true });
        }
      } catch (error) {
        // Ignore JSON parse errors
        console.error("Error parsing user data:", error);
      }
    }
  }, [navigate]);

  return children;
};

