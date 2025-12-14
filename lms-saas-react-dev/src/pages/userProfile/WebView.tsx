import ErrorIllustration from "../../assets/illustration/Error_illustration.svg";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { useNavigate, useParams } from "react-router";
import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import { useTranslation } from "react-i18next";
const WebView = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation("auth");
  console.log(t);
  const navigate = useNavigate();
  const page =
    id === "terms-of-service" ? "terms_of_service" : "privacy_policy";
  const { data: terms } = useCustomQuery(
    API_ENDPOINTS.webView + "?key=" + page,
    ["webView"]
  );
  return (
    <>
      {terms ? (
        <>
          <div className="flex items-center mb-6 gap-x-[5px] p-8">
            <button
              onClick={() => {
                window.history.length > 1 ? navigate(-1) : navigate(-1);
              }}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {i18n.language === "ar" ? (
                <ArrowRight size={20} />
              ) : (
                <ArrowLeft size={20} />
              )}
            </button>
            <h2 className="text-2xl font-bold text-gray-800">
              {page === "terms_of_service"
                ? t("Signup.agreeTerms.terms")
                : t("Signup.agreeTerms.privacy")}
            </h2>
          </div>
          <main
            className="px-10"
            dangerouslySetInnerHTML={{ __html: terms.data }}
          />
        </>
      ) : (
        <div className="h-screen flex flex-col justify-center items-center">
          <img src={ErrorIllustration} className="h-80 w-80" alt="Error" />
          <h2 className="text-2xl">لا يوجد محتوى لعرضه</h2>
        </div>
      )}
    </>
  );
};
export default WebView;
