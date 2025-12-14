import { Outlet, useLocation, useNavigate } from "react-router";
import { Home, Users, Library, GraduationCap, LucideIcon, ClipboardCheck } from "lucide-react";
import Header from "../../components/navigations/Header";
import useAuth from "../../store/useAuth";
import { removeTokens } from "../../services/auth";
import { useTranslation } from "react-i18next";
import { useFeatureFlag } from "../../hooks/useSettings";

export interface NavItems {
  id: string;
  label: string;
  icon: LucideIcon;
}

const Layout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const { t } = useTranslation();

  // إضافة الـ feature flag
  const {
    enabled: indexEnabled,
    isError: indexError,
    isFetching: indexFetching,
    isLoading: indexLoading,
  } = useFeatureFlag("index_page", true);

  // تحديد ما إذا كان يجب إظهار الـ Home
  const shouldShowHome =
    !indexLoading &&
    !indexFetching &&
    (indexError ? false : indexEnabled === "home");

  const mainNavigationItems: NavItems[] = [
    ...(shouldShowHome
      ? [{ id: "", label: t("header.home"), icon: Home }]
      : []),

    { id: "catalog", label: t("header.courses"), icon: GraduationCap },
    {
      id: !isAuthenticated ? "login" : "dashboard",
      label: t("header.myLearning"),
      icon: Users,
    },
    {
      id: !isAuthenticated ? "login" : "instructor",
      label: t("header.teach"),
      icon: Library,
    },
  ];

  const userNavigationItems: NavItems[] = [
    { id: "profile", label: t("header.profileSettings"), icon: Home },
    { id: "dashboard", label: t("header.myLearning"), icon: Users },
    { id: "assessment-result", label: "اختبار تحديد المستوى", icon: ClipboardCheck },
    { id: "instructor", label: t("header.instructorDashboard"), icon: Library },
    { id: "logout", label: t("header.signout"), icon: GraduationCap },
  ];

  const authNavigationItems: NavItems[] = [
    { id: "login", label: t("header.signin"), icon: Home },
    { id: "sign-up", label: t("header.signup"), icon: Users },
  ];

  const handleLogout = () => {
    removeTokens(navigate, setIsAuthenticated);
  };

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    if (query.trim()) {
      navigate("catalog");
    }
  };

  return (
    <div id="app-scroll" className="min-h-screen bg-gray-50">
      {!pathname.includes("player") &&
        !pathname.includes("verify-email") &&
        !pathname.includes("verify-account") &&
        !pathname.includes("reset-password") &&
        !pathname.includes("login") &&
        !pathname.includes("sign-up") && (
          <Header
            onSearch={handleSearch}
            onLogout={handleLogout}
            authNavigationItems={authNavigationItems}
            mainNavigationItems={mainNavigationItems}
            userNavigationItems={userNavigationItems}
          />
        )}
      <div>{<Outlet />}</div>
    </div>
  );
};

export default Layout;
