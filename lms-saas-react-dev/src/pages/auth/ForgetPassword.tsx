import { useState } from "react";
import { Lock, CheckCircle2 } from "lucide-react";
import { API_ENDPOINTS } from "../../utils/constants";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import handleErrorAlerts from "../../utils/showErrorMessages";
import { useCustomPost } from "../../hooks/useMutation";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import toast from "react-hot-toast";

interface FormValues {
  password: string;
  confirmPassword: string;
}

export default function ForgetPassword() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<FormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const { data, isLoading } = useSettings();
  const resetPasswordReq = useCustomPost(API_ENDPOINTS.resetPassword, [
    "reset-password",
  ]);

  // Optional feature switch: if true, show inline success card for ~1.2s before redirect.
  const useSuccessScreen =
    (data as any)?.features?.resetPasswordSuccessScreen ?? false;

  const [showSuccess, setShowSuccess] = useState(false);

  // Basic password rules (tweak as you like)
  const passwordRules = {
    required: t("ResetPassword.password.required", "Password is required"),
    // minLength: {
    //   value: 8,
    //   message: t("ResetPassword.password.min", "Minimum 8 characters"),
    // },
  };

  const confirmRules = {
    required: t(
      "ResetPassword.confirm.required",
      "Please confirm your password"
    ),
    validate: (val: string) =>
      val === watch("password") ||
      (t("ResetPassword.confirm.match", "Passwords do not match") as string),
  };

  const onSubmit = async (payload: FormValues) => {
    try {
      if (!token) {
        handleErrorAlerts(
          t("ResetPassword.tokenMissing", "Reset token is missing.")
        );
        return;
      }

      const formData = new FormData();
      formData.append("password", payload.password);
      formData.append("token", token);

      const res = await resetPasswordReq.mutateAsync(formData);

      toast.success(
        res?.data ||
          t("ResetPassword.successToast", "Password updated successfully")
      );

      if (res?.status) {
        reset();

        if (useSuccessScreen) {
          setShowSuccess(true);
          setTimeout(() => navigate("/login"), 1200);
        } else {
          navigate("/login");
        }
      }
    } catch (error: any) {
      handleErrorAlerts(
        error?.response?.data?.error ||
          t(
            "verifyEmail.unexpectedError",
            "There is an unexpected error occurred."
          )
      );
    }
  };

  if (isLoading) return "loading...";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-purple-600 mb-2 text-center">
            {data?.logo_type === "text" ? (
              data?.logo_text
            ) : (
              <img
                src={data?.logo_file}
                alt="logo"
                className="w-40 block m-auto rounded-full"
              />
            )}
          </div>
          <p className="text-gray-600 mt-2">
            {t("ResetPassword.title", "Set a New Password")}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {showSuccess ? (
            // SUCCESS VIEW (optional)
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">
                {t("ResetPassword.successTitle", "Password Updated")}
              </h2>
              <p className="text-gray-600">
                {t(
                  "ResetPassword.successSubtitle",
                  "Redirecting you to the login page..."
                )}
              </p>
            </div>
          ) : (
            // FORM VIEW
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("ResetPassword.password.label", "New Password")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    {...register("password", passwordRules)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                      errors.password ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder={t(
                      "ResetPassword.password.placeholder",
                      "Enter a strong password"
                    )}
                    autoComplete="new-password"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message as string}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("ResetPassword.confirm.label", "Confirm Password")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    {...register("confirmPassword", confirmRules)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                      errors.confirmPassword
                        ? "border-red-300"
                        : "border-gray-300"
                    }`}
                    placeholder={t(
                      "ResetPassword.confirm.placeholder",
                      "Re-enter your password"
                    )}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword.message as string}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>{t("ResetPassword.submit", "Reset Password")}</>
                )}
              </button>
            </form>
          )}

          {/* Back to login / sign-up */}
          {!showSuccess && (
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {t("verifyEmail.back", "Back to")}{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-purple-600 hover:text-purple-700 font-semibold"
                >
                  {t("Login.signin", "Login")}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
