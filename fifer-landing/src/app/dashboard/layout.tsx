import type { Metadata } from "next";
import "./globals-dashboard.css";

export const metadata: Metadata = {
  title: "FIFER Dashboard - Cascarón Inteligente",
  description: "Panel de gestión inmobiliaria y permisos de construcción",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
