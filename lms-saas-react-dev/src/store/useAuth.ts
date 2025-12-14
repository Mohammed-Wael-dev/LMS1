import { create } from "zustand";
import { isAuthenticated as checkAuth } from "../services/auth";

type Store = {
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;
};

const useAuth = create<Store>()((set) => ({
  isAuthenticated: checkAuth(),
  setIsAuthenticated: (v: boolean) => set({ isAuthenticated: v }),
}));

export default useAuth;
