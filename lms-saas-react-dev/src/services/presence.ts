import { post } from "../api";
import { API_ENDPOINTS, BASE_URL } from "../utils/constants";

export async function postPresence(courseId: string) {
  console.log(courseId);

  return post(API_ENDPOINTS.studentPresence, {
    // body
  });
}

export function sendPresenceBeacon(courseId: string) {
  console.log(courseId);

  try {
    const endpoint = API_ENDPOINTS.studentPresence;
    const absolute = new URL(endpoint.replace(/^\//, ""), BASE_URL).toString();

    const payload = JSON.stringify({
      // body
    });
    const blob = new Blob([payload], { type: "application/json" });

    navigator.sendBeacon(absolute, blob);
  } catch {
    //
  }
}
