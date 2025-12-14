import { useCustomQuery } from "../../hooks/useQuery";
import { API_ENDPOINTS } from "../../utils/constants";
import { readUserFromStorage, roleOf } from "../../services/auth";
import toast from "react-hot-toast";

interface Certificate {
  id: number;
  student: string;
  course: string;
  file: string;
  date_issued: string;
}

export default function Certificates() {
  const currentUser = readUserFromStorage();
  const isStudent = roleOf(currentUser) === "student";
  const { data: certificatesData } = useCustomQuery(
    API_ENDPOINTS.studentCertificates,
    ["certificates", currentUser?.id],
    undefined,
    !!isStudent
  );

  const certificates: Certificate[] = certificatesData?.data ?? [];

  const handleDownloadCertificate = (certificate: any) => {
    console.log("Downloading certificate for:", certificate.title);
    // Create a mock download
    const link = document.createElement("a");
    link.href = "#";
    link.download = `${certificate.title}-certificate.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Certificate download started!");
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Certificates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((certificate) => (
          <div
            key={certificate.id}
            className="border border-gray-200 rounded-lg overflow-hidden hover:border-purple-300 transition-colors"
          >
            <img
              src={
                certificate.file ??
                "https://ralfvanveen.com/wp-content/uploads/2021/06/Placeholder-_-Glossary.svg"
              }
              alt={`${certificate.id}`}
              className="w-full h-32 object-cover"
            />
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-2">
                {certificate.id}
              </h4>
              <p className="text-sm text-gray-600 mb-1">
                {/* Instructor: {certificate.instructor} */}
              </p>
              <p className="text-sm text-gray-500 mb-3">
                {/* Issued: {certificate.date_issued} */}
              </p>
              <button
                onClick={() => handleDownloadCertificate(certificate)}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Download Certificate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
