import { redirect } from "next/navigation";

/** Entrada del grupo `(dashboard)` — tablero canónico en `/dashboard`. */
export default function DashboardGroupRootPage() {
  redirect("/dashboard");
}
