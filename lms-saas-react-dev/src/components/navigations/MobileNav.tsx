import { NavLink, useNavigate } from "react-router";
import { NavItems } from "../../layout/dashboard/Layout";
import { Home } from "lucide-react";
import { readUserFromStorage } from "../../services/auth";
import { useTranslation } from "react-i18next";

interface Props {
  authNavigationItems: NavItems[];
  mainNavigationItems: NavItems[];
  setIsMenuOpen: (s: boolean) => void;
  onLogout?: () => void;
}

export default function MobileNav({
  authNavigationItems,
  mainNavigationItems,
  setIsMenuOpen,
  onLogout,
}: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const currentUser = readUserFromStorage();
  return (
    <div className="lg:hidden">
      <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
        {mainNavigationItems
          .concat([
            { id: "profile", label: t("header.profileSettings"), icon: Home },
          ])
          .map((i, idx) => {
            const path = i.id ? `/${i.id}` : "/";
            if (
              currentUser === undefined &&
              (i.id === "dashboard" || i.id === "instructor")
            ) {
              return;
            } else if (currentUser.is_instructor && i.id === "dashboard") {
              return;
            } else if (currentUser.is_student && i.id === "instructor") {
              return;
            } else {
              return (
                <NavLink
                  key={idx + 4000}
                  to={path}
                  end={path === "/"}
                  className={({ isActive }) =>
                    `block w-full text-left px-3 py-2 transition-colors ${
                      isActive
                        ? "text-purple-600 font-semibold"
                        : "text-gray-700 hover:text-purple-600"
                    }`
                  }
                  onClick={() => setIsMenuOpen(false)}
                >
                  {i.label}
                </NavLink>
              );
            }
          })}

        {!currentUser && (
          <>
            {authNavigationItems.map((i, idx) => {
              return (
                <button
                  key={idx + 5000}
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate(i.id);
                  }}
                  className="block w-full text-left px-3 py-2 text-gray-700 hover:text-purple-600"
                >
                  {i.label}
                </button>
              );
            })}
          </>
        )}
        {/* <button className="block w-full text-left px-3 py-2 text-gray-700 hover:text-purple-600">
          {t("header.notifications")}
        </button>
        <button className="block w-full text-left px-3 py-2 text-gray-700 hover:text-purple-600">
          {t("header.cart")}
        </button> */}
        {currentUser && onLogout && (
          <button
            onClick={() => {
              setIsMenuOpen(false);
              onLogout();
            }}
            className="block w-full text-left px-3 py-2 text-red-600 hover:text-red-700"
          >
            {t("header.signout")}
          </button>
        )}
      </div>
    </div>
  );
}
