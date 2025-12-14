import toast from "react-hot-toast";

const handleErrorAlerts = (
  errorObj: { [key: string]: string[] | string } | string
) => {
  if (typeof errorObj === "string") {
    toast.error(errorObj);
    return;
  }

  Object.entries(errorObj).forEach(([field, errors]) => {
    const messages = Array.isArray(errors) ? errors : [errors];
    messages.forEach((message) => {
      const formattedField = field
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      toast.error(`${formattedField}: ${message}`);
    });
  });
};

export default handleErrorAlerts;
