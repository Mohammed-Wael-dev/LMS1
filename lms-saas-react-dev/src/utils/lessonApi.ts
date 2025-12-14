import { get, post, patch, remove } from "../api";
import { API_ENDPOINTS } from "./constants";

export const listLessonsBySectionApi = (sectionId: string) =>
  get(`${API_ENDPOINTS.lessons}${sectionId}/`);

export const createLessonApi = (payload: any) =>
  post(API_ENDPOINTS.lessons, payload);

export const patchLessonApi = (lessonId: string, payload: any) =>
  patch(`${API_ENDPOINTS.lesson}${lessonId}/`, payload);

export const deleteLessonApi = (lessonId: string) =>
  remove(`${API_ENDPOINTS.lesson}${lessonId}/`);
