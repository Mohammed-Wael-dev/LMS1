import React, { useEffect, useState } from "react";
import useAuth from "../store/useAuth";
import LoginPopup from "../components/auth-modals/LoginPopup";
import SignupPopup from "../components/auth-modals/SignupPopup";

export const RequireAuth: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) setShowLogin(true);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <>
        {showLogin && (
          <LoginPopup
            onClose={() => {
              setShowLogin(false);
            }}
            setShowSignupModal={setShowSignup}
          />
        )}
        {showSignup && (
          <SignupPopup
            onClose={() => {
              setShowSignup(false);
            }}
            setShowLoginModal={setShowLogin}
          />
        )}
      </>
    );
  }

  return children;
};
