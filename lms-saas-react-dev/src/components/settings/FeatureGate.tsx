import { ReactNode } from "react";
import { useFeatureFlag } from "../../hooks/useSettings";

type Props = {
  flag: BooleanFlagKey;
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
};

export default function FeatureGate({
  flag,
  children,
  fallback = null,
  loadingFallback = null,
}: Props) {
  const { enabled, isLoading } = useFeatureFlag(flag);
  if (isLoading) return <>{loadingFallback}</>;
  return enabled ? <>{children}</> : <>{fallback}</>;
}
