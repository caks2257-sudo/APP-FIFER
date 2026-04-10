import type { IFiferBoxManifest } from "@/types/fifer-box";

/** Jerarquía de roles — permisos del panel (alineado a leyes FIFER: acceso mínimo necesario). */
const RANK: Record<"user" | "affiliate" | "admin", number> = {
  user: 1,
  affiliate: 2,
  admin: 3,
};

export function roleMeetsRequired(
  userRole: "admin" | "affiliate" | "user" | null | undefined,
  required: IFiferBoxManifest["permissions"]["requiredRole"]
): boolean {
  if (userRole == null) return false;
  return RANK[userRole] >= RANK[required];
}

export function subscriptionOk(
  requiresActiveSubscription: boolean,
  hasActiveSubscription: boolean | undefined
): boolean {
  if (!requiresActiveSubscription) return true;
  return hasActiveSubscription === true;
}
