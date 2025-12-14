import toast from "react-hot-toast";
import { API_ENDPOINTS } from "../../utils/constants";
import handleErrorAlerts from "../../utils/showErrorMessages";
import { useCustomPost } from "../../hooks/useMutation";
import { useForm } from "react-hook-form";
import useAuth from "../../store/useAuth";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Phone, X } from "lucide-react";
import { storeTokens } from "../../services/auth";
import { useTranslation } from "react-i18next";
import FeatureGate from "../settings/FeatureGate";
import { useSettings } from "../../hooks/useSettings";
import { useNavigate } from "react-router";

interface FormValues {
  email: string;
  password: string;
}

export default function LoginPopup({
  onClose,
  setShowSignupModal,
}: {
  onClose: () => void;
  setShowSignupModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const { setIsAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const login = useCustomPost(API_ENDPOINTS.login, ["login"]);

  const { data, isLoading } = useSettings();
  const loginType = data?.login_type ?? "email";
  const isPhoneLogin = loginType === "phone";

  const loginFieldValidation = isPhoneLogin
    ? {
        required: t("Login.phone.error.required"),
        pattern: {
          value: /^\+?[0-9\s-]{7,15}$/,
          message: t("Login.phone.error.valid"),
        },
      }
    : {
        required: t("Login.email.error.required"),
        pattern: {
          value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
          message: t("Login.email.error.valid"),
        },
      };

  const onSubmit = async (data: FormValues) => {
    try {
      const formData = new FormData();
      formData.append("identifier", data.email);
      formData.append("password", data.password);

      const res = await login.mutateAsync(formData);

      if (res.status) {
        toast.success(t("Login.success"));

        const tokens = res?.data?.tokens;
        const user = res?.data?.user;

        await storeTokens({
          access: tokens.access,
          refresh: tokens.refresh,
          user,
          setIsAuthenticated,
        });
        reset();
        onClose();
      }
    } catch (error: any) {
      handleErrorAlerts(
        error?.response?.data.error || "There is an unexpected error occured."
      );
    }
  };

  // const handleGoogleLogin = () => {
  //   return;
  // };
  if (isLoading) {
    return "loading...";
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-end">
            {/* <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {data?.logo_type === "text" ? (
                  data?.logo_text
                ) : (
                  <img
                    src={data?.logo_file}
                    alt="logo"
                    className="w-24 block m-auto rounded-full"
                  />
                )}
              </div>
              <p className="text-gray-600">{t("Login.welcome")}</p>
            </div> */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t(`Login.${isPhoneLogin ? "phone" : "email"}.label`)}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isPhoneLogin ? (
                    <Phone className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Mail className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  type={isPhoneLogin ? "tel" : "email"}
                  inputMode={isPhoneLogin ? "tel" : undefined}
                  {...register("email", loginFieldValidation)}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                    errors.email ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder={t(
                    `Login.${isPhoneLogin ? "phone" : "email"}.placeholder`
                  )}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Login.password.label")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password", {
                    required: t("Login.password.error.required"),
                  })}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder={t("Login.password.placeholder")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ltr:ml-2 rtl:mr-2 block text-sm text-gray-700"
                >
                  {t("Login.rememberMe")}
                </label>
              </div>
              {!isPhoneLogin && (
                <button
                  type="button"
                  onClick={() => {
                    navigate("/verify-email?type=password_reset");
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  {t("Login.forgotPass")}
                </button>
              )}
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {t("Login.signin")}
                  <ArrowRight className="w-5 h-5 ltr:ml-2 rtl:mr-2 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          {/* <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {t("Login.continue")}
                </span>
              </div>
            </div>
          </div> */}

          {/* Google Login */}
          {/* <button
            onClick={handleGoogleLogin}
            className="mt-6 w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button> */}

          {/* Sign Up Link */}
          <FeatureGate
            flag="is_registration_enabled"
            loadingFallback={null}
            fallback={null}
          >
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {t("Login.dontHaveAcc")}{" "}
                <button
                  onClick={() => {
                    onClose();
                    setShowSignupModal(true);
                  }}
                  className="text-purple-600 hover:text-purple-700 font-semibold"
                >
                  {t("Login.signup")}
                </button>
              </p>
            </div>
          </FeatureGate>
        </div>
      </div>
    </div>
  );
}
