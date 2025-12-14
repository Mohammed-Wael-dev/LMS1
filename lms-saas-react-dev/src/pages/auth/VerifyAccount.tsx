import React, { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { API_ENDPOINTS } from "../../utils/constants";
import { useNavigate, useParams } from "react-router";
import useAuth from "../../store/useAuth";
import { useCustomPost } from "../../hooks/useMutation";
import { storeTokens } from "../../services/auth";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import toast from "react-hot-toast";
import handleErrorAlerts from "../../utils/showErrorMessages";

type VerifyState = "idle" | "verifying" | "error";

const VerifyAccount: React.FC = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { setIsAuthenticated } = useAuth();

  const { data: settings } = useSettings();

  const verifyAccountReq = useCustomPost(API_ENDPOINTS.verifyAccount, [
    "verify-account",
  ]);

  const [state, setState] = useState<VerifyState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const didRunRef = useRef(false);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    (async () => {
      if (!token) {
        setState("error");
        setErrorMsg(
          t("VerifyAccount.tokenMissing", "Verification token is missing.")
        );
        return;
      }
      try {
        setState("verifying");

        const formData = new FormData();
        formData.append("token", token);

        const res = await verifyAccountReq.mutateAsync(formData);

        if (res?.status) {
          // Mimic login flow exactly
          const tokens = res?.data?.tokens;
          const user = res?.data?.user;

          toast.success(t("VerifyAccount.successToast", "Account verified!"));

          await storeTokens({
            access: tokens?.access,
            refresh: tokens?.refresh,
            user,
            navigate,
            setIsAuthenticated,
          });

          // Redirect to assessment if student hasn't completed it
          if (user?.is_student && !user?.has_completed_assessment) {
            navigate("/assessment", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        } else {
          throw new Error(
            t(
              "VerifyAccount.unexpected",
              "Unexpected response while verifying your account."
            )
          );
        }
      } catch (error: any) {
        const msg =
          error?.response?.data?.error ||
          error?.message ||
          t(
            "VerifyAccount.failed",
            "Verification failed. The link may be invalid or expired."
          );
        setErrorMsg(msg);
        handleErrorAlerts(msg);
        setState("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo (settings used ONLY here) */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-purple-600 mb-2 text-center">
            {settings?.logo_type === "text" ? (
              settings?.logo_text
            ) : (
              <img
                src={settings?.logo_file}
                alt="logo"
                className="w-40 block m-auto rounded-full"
              />
            )}
          </div>
          <p className="text-gray-600 mt-2">
            {t("VerifyAccount.title", "Verifying your account")}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {state === "verifying" || state === "idle" ? (
            <div className="flex flex-col items-center text-center space-y-3">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
              <h2 className="text-lg font-semibold">
                {t("VerifyAccount.inProgress", "Hang tight, verifying...")}
              </h2>
              <p className="text-gray-600 text-sm">
                {t(
                  "VerifyAccount.inProgressHint",
                  "We’re confirming your email and signing you in."
                )}
              </p>
            </div>
          ) : null}

          {state === "error" ? (
            <div className="flex flex-col items-center text-center space-y-3">
              <ShieldAlert className="h-10 w-10 text-red-600" />
              <h2 className="text-lg font-semibold">
                {t("VerifyAccount.errorTitle", "Verification Failed")}
              </h2>
              <p className="text-gray-600 text-sm">
                {errorMsg ||
                  t(
                    "VerifyAccount.failed",
                    "Verification failed. The link may be invalid or expired."
                  )}
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition"
                >
                  {t("VerifyAccount.backToLogin", "Back to Login")}
                </button>
                <button
                  onClick={() => navigate("/verify-email?type=signup")}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 transition"
                >
                  {t("VerifyAccount.resend", "Resend Verification Email")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default VerifyAccount;
