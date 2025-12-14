import { Navigate, Outlet } from "react-router";
import { readUserFromStorage, roleOf } from "../services/auth";

type Role = string;

export function RequireRole({
  allow,
  exclude,
}: {
  allow?: Role[];
  exclude?: Role[];
}) {
  const user = readUserFromStorage();
  const role = roleOf(user) ?? "";

  if (exclude?.includes(role)) return <Navigate to="/" replace />;
  if (allow && !allow.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
