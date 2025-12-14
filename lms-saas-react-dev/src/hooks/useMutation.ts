import { remove, edit, patch, post } from "../api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const invalidate = (qc: any, keys?: string[]) => {
  keys?.forEach((key) => {
    qc.invalidateQueries({ queryKey: [key] });
  });
};

export const useCustomPost = (endpoint: string, queryKey?: string[]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => post(endpoint, body),
    onSuccess: () => invalidate(queryClient, queryKey),
  });
};

export const useCustomUpdate = (endpoint: string, queryKey?: string[]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => edit(endpoint, body),
    onSuccess: () => invalidate(queryClient, queryKey),
  });
};

export const useCustomPatch = (endpoint: string, queryKey: string[]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => patch(endpoint, body),
    onSuccess: () => invalidate(queryClient, queryKey),
  });
};

export const useCustomRemove = (endpoint: string, queryKey: string[]) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => remove(endpoint),
    onSuccess: () => invalidate(queryClient, queryKey),
  });
};
