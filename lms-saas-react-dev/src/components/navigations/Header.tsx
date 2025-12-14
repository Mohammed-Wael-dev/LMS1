import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import MobileNav from "./MobileNav";
import { NavItems } from "../../layout/dashboard/Layout";
import { readUserFromStorage } from "../../services/auth";
import LocaleSwitcher from "../reusable-components/LocaleSwitcher";
import { useFeatureFlag, useSettings } from "../../hooks/useSettings";

interface HeaderProps {
  onSearch: (query: string) => void;
  onLogout?: () => void;
  mainNavigationItems: NavItems[];
  userNavigationItems: NavItems[];
  authNavigationItems: NavItems[];
}

const Header: React.FC<HeaderProps> = ({
  // onSearch,
  onLogout,
  mainNavigationItems,
  userNavigationItems,
  authNavigationItems,
}) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const {
    enabled: registrationEnabled,
    isLoading,
    isFetching,
  } = useFeatureFlag("is_registration_enabled", true);
  // const [searchQuery, setSearchQuery] = useState("");

  // const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  // const mobileInputRef = useRef<HTMLInputElement>(null);
  // const overlayRef = useRef<HTMLDivElement>(null);

  // const handleSearchSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   onSearch(searchQuery);
  // };

  const currentUser: User = readUserFromStorage();

  const { data, isLoading: settingsLoading } = useSettings();

  // useEffect(() => {
  //   if (mobileSearchOpen) {
  //     const id = setTimeout(() => mobileInputRef.current?.focus(), 10);
  //     return () => clearTimeout(id);
  //   }
  // }, [mobileSearchOpen]);

  // useEffect(() => {
  //   if (!mobileSearchOpen) return;
  //   const onKey = (e: KeyboardEvent) => {
  //     if (e.key === "Escape") setMobileSearchOpen(false);
  //   };
  //   window.addEventListener("keydown", onKey);
  //   return () => window.removeEventListener("keydown", onKey);
  // }, [mobileSearchOpen]);

  if (settingsLoading) {
    return "loading...";
  }

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-24">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <button
                onClick={() => {
                  navigate("/");
                }}
                className="cursor-pointer text-2xl font-bold text-purple-600"
              >
                {data?.logo_type === "text" ? (
                  data?.logo_text
                ) : (
                  <img src={data?.logo_file} alt="logo" className="w-24" />
                )}
              </button>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:block ltr:ml-10 rtl:mr-10">
              <div className="flex items-center gap-8">
                {mainNavigationItems.map((i, idx) => {
                  const path = i.id ? `/${i.id}` : "/";
                  if (
                    currentUser === undefined &&
                    (i.id === "dashboard" || i.id === "instructor")
                  ) {
                    return;
                  } else if (
                    currentUser?.is_instructor &&
                    i.id === "dashboard"
                  ) {
                    return;
                  } else if (currentUser?.is_student && i.id === "instructor") {
                    return;
                  } else {
                    return (
                      <NavLink
                        key={idx + 1000}
                        to={path}
                        end={path === "/"}
                        className={({ isActive }) =>
                          `transition-colors ${
                            isActive
                              ? "text-purple-600 font-semibold"
                              : "text-gray-700 hover:text-purple-600"
                          }`
                        }
                      >
                        {i.label}
                      </NavLink>
                    );
                  }
                })}
              </div>
            </nav>
          </div>

          {/* Desktop Search */}
          {/* <div className="flex-1 max-w-lg mx-8 sm:block hidden">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder={t("header.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </form>
          </div> */}

          {/* Right side */}
          <div className="flex items-center gap-4">
            <LocaleSwitcher />

            {/* <button
              type="button"
              className="sm:hidden p-2 text-gray-500 hover:text-gray-700"
              aria-label="Open search"
              onClick={() => setMobileSearchOpen(true)}
            >
              <Search className="h-5 w-5 text-gray-400" />
            </button> */}

            {/* <button className="lg:block hidden p-2 text-gray-400 hover:text-gray-500">
              <Bell className="h-6 w-6" />
            </button> */}
            {/* <button className="lg:block hidden p-2 text-gray-400 hover:text-gray-500">
              <ShoppingCart className="h-6 w-6" />
            </button> */}

            {currentUser ? (
              <div className="relative">
                <div
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  {currentUser.profile_image ? (
                    <img
                      src={
                        currentUser.profile_image ??
                        "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg"
                      }
                      alt={currentUser?.first_name}
                      className="w-8 h-8 rounded-full object-cover rtl:ml-2 ltr:mr-2"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center rtl:ml-2 ltr:mr-2">
                      <span className="text-white text-sm font-medium">
                        {currentUser?.first_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="hidden lg:block text-sm text-gray-700">
                    {currentUser.first_name} {currentUser.last_name}
                  </span>
                </div>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute ltr:right-0 rtl:left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {userNavigationItems.map((i, idx) => {
                      if (currentUser.is_instructor && i.id === "dashboard") {
                        return;
                      } else if (
                        currentUser.is_student &&
                        i.id === "instructor"
                      ) {
                        return;
                      } else if (
                        i.id === "assessment-result" &&
                        !currentUser.has_completed_assessment
                      ) {
                        // Show assessment link instead of result if not completed
                        return (
                          <div key={idx + 2000}>
                            <button
                              onClick={() => {
                                navigate("/assessment");
                                setIsUserMenuOpen(false);
                              }}
                              className="block w-full ltr:text-left rtl:text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              اختبار تحديد المستوى
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <div key={idx + 2000}>
                            {i.id === "logout" && <hr className="my-2" />}
                            <button
                              onClick={() => {
                                if (i.id === "logout") {
                                  if (onLogout) onLogout();
                                } else {
                                  navigate(i.id);
                                }
                                setIsUserMenuOpen(false);
                              }}
                              className={`block w-full ltr:text-left rtl:text-right px-4 py-2 text-sm ${
                                i.id === "logout"
                                  ? "text-red-600 hover:bg-red-50"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {i.label}
                            </button>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {authNavigationItems.map((i, idx) => {
                  if (
                    (!registrationEnabled || isLoading || isFetching) &&
                    i.id === "sign-up"
                  ) {
                    return;
                  }
                  return (
                    <button
                      key={idx + 3000}
                      onClick={() => navigate(i.id)}
                      className={`${
                        i.id === "login"
                          ? "text-gray-700 hover:text-purple-600 font-medium"
                          : "bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
                      }`}
                    >
                      {i.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-500"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <MobileNav
            authNavigationItems={authNavigationItems}
            mainNavigationItems={mainNavigationItems}
            setIsMenuOpen={setIsMenuOpen}
            onLogout={onLogout}
          />
        )}
      </div>
    </header>
  );
};

export default Header;
