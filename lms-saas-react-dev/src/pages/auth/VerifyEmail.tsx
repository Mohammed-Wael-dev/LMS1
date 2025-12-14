import React, { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { API_ENDPOINTS } from "../../utils/constants";
import { useLocation, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import handleErrorAlerts from "../../utils/showErrorMessages";
import { useCustomPost } from "../../hooks/useMutation";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import toast from "react-hot-toast";

interface FormValues {
  email: string;
}

const VerifyEmail: React.FC = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();

  const location = useLocation();
  const qs = new URLSearchParams(location.search);
  type TokenType = "signup" | "password_reset";
  const tokenType: TokenType =
    qs.get("type") === "password_reset" ? "password_reset" : "signup";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    getValues,
  } = useForm<FormValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { email: "" },
  });

  const verify = useCustomPost(API_ENDPOINTS.verifyEmail, ["verify-email"]);
  const { data, isLoading } = useSettings();

  const shouldSwapToSuccess =
    (data as any)?.features?.verifyEmailSuccessScreen ?? true;

  const [showSuccess, setShowSuccess] = useState(false);
  const [sentToEmail, setSentToEmail] = useState<string>("");

  const loginFieldValidation = {
    required: t("Login.email.error.required"),
    pattern: {
      value: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
      message: t("Login.email.error.valid"),
    },
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("token_type", tokenType);

      const res = await verify.mutateAsync(formData);

      toast.success(res.data || "Email has been sent");
      if (res.status) {
        if (shouldSwapToSuccess) {
          setSentToEmail(getValues("email"));
          setShowSuccess(true);
        } else {
          reset();
        }
      }
    } catch (error: any) {
      handleErrorAlerts(
        error?.response?.data?.error || "There is an unexpected error occured."
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
          <p className="text-gray-600 mt-2">{t("verifyEmail.header")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* SUCCESS VIEW (conditionally rendered) */}
          {showSuccess ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">
                {t("verifyEmail.successTitle")}
              </h2>
              <p className="text-gray-600">
                {t("verifyEmail.successSubtitle")}
              </p>
              {sentToEmail ? (
                <p className="text-gray-500 text-sm">
                  {t("verifyEmail.successSentTo")}:{" "}
                  <span className="font-medium">{sentToEmail}</span>
                </p>
              ) : null}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t(`Login.email.label`)}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    {...register("email", loginFieldValidation)}
                    className={`block w-full pl-10 pr-3 py-3 border rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 ${
                      errors.email ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder={t(`Login.email.placeholder`)}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
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
                  <>{t("verifyEmail.verify")}</>
                )}
              </button>
            </form>
          )}

          {/* Back to login / sign-up */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {t("verifyEmail.back")}{" "}
              <button
                onClick={() => navigate("/sign-up")}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                {t("Login.signin")}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
