import { useEffect, useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  X,
  Phone,
} from "lucide-react";
import { API_ENDPOINTS, USER_KEY } from "../../utils/constants";
// import { useNavigate } from "react-router";
import { useForm, useWatch } from "react-hook-form";
import handleErrorAlerts from "../../utils/showErrorMessages";
import toast from "react-hot-toast";
import { useCustomPost } from "../../hooks/useMutation";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";

type Role = "instructor" | "student";

interface FormValues {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  c_password: string;
  role: Role;
  terms: boolean;
}

export default function SignupPopup({
  onClose,
  setShowLoginModal,
}: {
  onClose: () => void;
  setShowLoginModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
    trigger,
    control,
    reset,
  } = useForm<FormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      c_password: "",
      terms: false,
      role: "instructor",
    },
  });

  // const navigate = useNavigate();
  const { t } = useTranslation("auth");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // const [isLoading, setIsLoading] = useState(false);

  const agreeToTerms = useWatch({
    control,
    name: "terms",
    defaultValue: false,
  });
  const password = useWatch({ control, name: "password" });

  const signUp = useCustomPost(API_ENDPOINTS.signup, ["sign-up"]);

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
    if (data.password !== data.c_password) {
      return trigger("c_password"); // will show "Passwords do not match"
    }
    if (!data.terms) {
      // force show terms error if not checked
      return trigger("terms");
    }

    try {
      const formData = new FormData();
      formData.append("first_name", data.first_name);
      formData.append("last_name", data.last_name);
      formData.append("email", data.email);
      formData.append("password", data.password);

      // Send only ONE boolean based on selection
      if (data.role === "instructor") {
        formData.append("is_instructor", "true");
        // do NOT send is_student (backend defaults it to false)
      } else {
        formData.append("is_student", "true");
        // do NOT send is_instructor (backend defaults it to false)
      }

      const res = await signUp.mutateAsync(formData);

      if (res?.status) {
        toast.success(t("Signup.success"));
        const user = res.data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(user));

        reset();
        onClose();
      } else {
        handleErrorAlerts(res?.data?.detail);
      }
    } catch (error: any) {
      const payload = error?.response?.data.error;
      handleErrorAlerts(payload || "There is an unexpected error occured");
    }
  };

  // Simulate Google signup
  // const handleGoogleSignup = () => {
  //   setIsLoading(true);
  //   setTimeout(() => {
  //     const user = {
  //       name: "John Doe",
  //       email: "john.doe@gmail.com",
  //       avatar:
  //         "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100",
  //       joinDate: "August 2025",
  //       location: "",
  //       phone: "",
  //       bio: "",
  //     };
  //     localStorage.setItem(USER_KEY, JSON.stringify(user));
  //     navigate("/");
  //     setIsLoading(false);
  //   }, 2000);
  // };

  useEffect(() => {
    if (getValues("c_password")) trigger("c_password");
  }, [password, trigger, getValues]);

  if (isLoading) {
    return "loading...";
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
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
              <p className="text-gray-600">{t("Signup.welcome")}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Signup.fn.label")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    {...register("first_name", {
                      required: t("Signup.fn.error"),
                    })}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                      errors.first_name ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder={t("Signup.fn.placeholder")}
                  />
                </div>
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.first_name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Signup.ln.label")}
                </label>
                <input
                  type="text"
                  {...register("last_name", { required: t("Signup.ln.error") })}
                  className={`block w-full px-3 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                    errors.last_name ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder={t("Signup.ln.placeholder")}
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.last_name.message}
                  </p>
                )}
              </div>
            </div>

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
                  )}{" "}
                </div>
                <input
                  type={isPhoneLogin ? "tel" : "email"}
                  inputMode={isPhoneLogin ? "tel" : undefined}
                  {...register("email", loginFieldValidation)}
                  placeholder={t(
                    `Login.${isPhoneLogin ? "phone" : "email"}.placeholder`
                  )}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                    errors.email ? "border-red-300" : "border-gray-300"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Role Field (required, default Instructor) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Signup.role.label")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  {...register("role", { required: t("Signup.role.error") })}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                    errors.role ? "border-red-300" : "border-gray-300"
                  }`}
                >
                  <option value="instructor">
                    {t("Signup.role.values.instructor")}
                  </option>
                  <option value="student">
                    {t("Signup.role.values.student")}
                  </option>
                </select>
              </div>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.role.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Signup.password.label")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password", {
                    required: t("Signup.password.error"),
                  })}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                    errors.password ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder={t("Signup.password.label")}
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Signup.cPassword.label")}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("c_password", {
                    required: t("Signup.cPassword.error.required"),
                    validate: (val) =>
                      val === getValues("password") ||
                      t("Signup.cPassword.error.match"),
                  })}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                    errors.c_password ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder={t("Signup.cPassword.placeholder")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.c_password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.c_password.message}
                </p>
              )}
            </div>

            {/* Terms Agreement */}
            <div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="agree-terms"
                    type="checkbox"
                    {...register("terms", {
                      validate: (v) =>
                        v === true || t("Signup.agreeTerms.error"),
                    })}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ltr:ml-3 rtl:mr-3 text-sm">
                  <label htmlFor="agree-terms" className="text-gray-700">
                    {t("Signup.agreeTerms.label")}{" "}
                    <button
                      type="button"
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      {t("Signup.agreeTerms.terms")}
                    </button>{" "}
                    {t("Signup.agreeTerms.and")}{" "}
                    <button
                      type="button"
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      {t("Signup.agreeTerms.privacy")}
                    </button>
                  </label>
                </div>
              </div>
              {errors.terms && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.terms.message}
                </p>
              )}
            </div>

            {/* Signup Button */}
            <button
              type="submit"
              disabled={isSubmitting || !agreeToTerms}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {t("Signup.create")}
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
                  Or continue with
                </span>
              </div>
            </div>
          </div> */}

          {/* Google Signup */}
          {/* <button
            onClick={handleGoogleSignup}
            disabled={isLoading}
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

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {t("Signup.alreadyHaveAcc")}{" "}
              <button
                onClick={() => {
                  onClose();
                  setShowLoginModal(true);
                }}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                {t("Signup.signin")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
