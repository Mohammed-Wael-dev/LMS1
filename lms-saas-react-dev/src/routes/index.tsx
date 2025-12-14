import React from "react";
import useAuth from "../store/useAuth";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

// react date picker
import "react-date-picker/dist/DatePicker.css";
import "react-calendar/dist/Calendar.css";
import LoginPage from "../pages/auth/LoginPage";
import SignupPage from "../pages/auth/SignupPage";
import CourseCatalogPage from "../pages/courses/CourseCatalogPage";
import CourseDetailPage from "../pages/courses/CourseDetailPage";
import CoursePlayerPage from "../pages/courses/CoursePlayerPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import InstructorPage from "../pages/instructor/InstructorPage";
import CourseBuilderPage from "../pages/courses/CourseBuilderPage";
import ProfilePage from "../pages/userProfile/ProfilePage";
import Layout from "../layout/dashboard/Layout";
import HomePage from "../pages/home/HomePage";
import { RequireAuth } from "./requireAuth";
import { RequireRole } from "./guards";
import { useFeatureFlag } from "../hooks/useSettings";
import WebView from "../pages/userProfile/WebView";
import ForgetPassword from "../pages/auth/ForgetPassword";
import VerifyEmail from "../pages/auth/VerifyEmail";
import VerifyAccount from "../pages/auth/VerifyAccount";
import Assessment from "../components/course/course-player-sections/Assessment";
import AssessmentPage from "../pages/assessment/AssessmentPage";
import AssessmentResultPage from "../pages/assessment/AssessmentResultPage";
import { AssessmentGuard } from "./AssessmentGuard";
// import { readUserFromStorage, roleOf } from "@/services/auth";

// function DashboardIndexGate() {
//   const user = readUserFromStorage();
//   const role = roleOf(user) ?? "";
//   return role === "library" ? (
//     <Navigate to="card-pricing" replace />
//   ) : (
//     <Dashboard />
//   );
// }

export default function AppRoutes() {
  const { isAuthenticated } = useAuth();

  const {
    enabled: registrationEnabled,
    isError: registrationError,
    isFetching: registrationFetching,
    isLoading: registrationLoading,
  } = useFeatureFlag("is_registration_enabled", true);

  const {
    enabled: indexEnabled,
    isError: indexError,
    isFetching: indexFetching,
    isLoading: indexLoading,
  } = useFeatureFlag("index_page", true);

  const shouldShowHomePage = indexError ? false : indexEnabled === "home";

  // Only show loading if we're actively fetching and haven't encountered an error
  // Add a timeout to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 5000); // 5 second timeout
    
    return () => clearTimeout(timer);
  }, []);

  const isActuallyLoading = 
    !loadingTimeout &&
    (registrationLoading || registrationFetching || indexLoading || indexFetching) &&
    !registrationError &&
    !indexError;

  if (isActuallyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AssessmentGuard>
        <Routes>
          {/* Auth */}
          <Route path="" element={<Layout />}>
          <Route path="/reset-password" element={<ForgetPassword />} />
          <Route path="/reset-password/:token" element={<ForgetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-account" element={<VerifyAccount />} />
          <Route path="/verify-account/:token" element={<VerifyAccount />} />
          {shouldShowHomePage ? (
            <Route path="/" element={<HomePage />} />
          ) : (
            <>
              {isAuthenticated ? (
                <>
                  <Route
                    path="/login"
                    element={<Navigate to="/catalog" replace />}
                  />

                  <Route path="/" element={<Navigate to="/login" replace />} />
                </>
              ) : (
                <>
                  <Route
                    path="catalog"
                    element={<Navigate to="/login" replace />}
                  />

                  <Route path="/" element={<Navigate to="/login" replace />} />
                </>
              )}
            </>
          )}

          {(registrationError || registrationFetching || registrationLoading) &&
          !registrationEnabled ? (
            <Route path="/login" element={<LoginPage />} />
          ) : (
            <Route path="/sign-up" element={<SignupPage />} />
          )}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/webview/:id" element={<WebView />} />
          <Route
            path="/assessment"
            element={
              <RequireAuth>
                <AssessmentPage />
              </RequireAuth>
            }
          />
          <Route
            path="/assessment-result"
            element={
              <RequireAuth>
                <AssessmentResultPage />
              </RequireAuth>
            }
          />

          {/* Auth */}

          {/* Main */}
          <Route path="/catalog" element={<CourseCatalogPage />} />
          <Route path="/catalog/:courseId" element={<CourseDetailPage />} />
          <Route
            path="/catalog/:courseId/assessments/:assessmentId"
            element={<Assessment />}
          />
          <Route
            path="/catalog/:courseId/player"
            element={
              <RequireAuth>
                <CoursePlayerPage />
              </RequireAuth>
            }
          />
          <Route
            path="/course-builder/:courseId"
            element={<CourseBuilderPage />}
          />
          {/* Main */}

          {/* Courses */}
          <Route element={<RequireRole exclude={["instructor"]} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route element={<RequireRole exclude={["student"]} />}>
            <Route path="/instructor" element={<InstructorPage />} />
          </Route>
          {/* Courses */}

          {/* User */}
          <Route path="/profile" element={<ProfilePage />} />
          {/* User */}
        </Route>

        {/* {isAuthenticated && (
          Write routes here which need Authentication
        )} */}

        {/* {!isAuthenticated && <Route path="login" element={<LoginPage />} />} */}

        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
      </AssessmentGuard>
    </BrowserRouter>
  );
}
