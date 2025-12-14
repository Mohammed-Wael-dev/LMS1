import ErrorIllustration from "@/assets/illustration/Error_illustration.svg";
import { ArrowRight } from "lucide-react";

import { useNavigate } from "react-router";
import { useCustomQuery } from "../../hooks/useQuery";
const termsOfService = () => {
  const navigate = useNavigate();
  const { data: terms } = useCustomQuery(
    "/core/webview/?key=privacy_policy/",
    ["termsAndConditions"]
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
              <ArrowRight size={20} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">
              شروط الخدمة
            </h2>
          </div>
          <main
            className="px-10"
            dir="ltr"
            dangerouslySetInnerHTML={{ __html: terms.data.value }}
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
export default termsOfService;
