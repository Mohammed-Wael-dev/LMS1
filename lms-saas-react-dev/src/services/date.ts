export function formatDate(dateString: string | null | Date): string {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch {
    return "-";
  }
}

export function getNumberBeforeDot(number: number) {
  const numberStr = number.toString();

  const dotIndex = numberStr.indexOf(".");

  if (dotIndex !== -1) {
    return numberStr.substring(0, dotIndex);
  } else {
    return numberStr;
  }
}
