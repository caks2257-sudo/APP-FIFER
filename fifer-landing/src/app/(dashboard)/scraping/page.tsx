import { notFound } from "next/navigation";
import { PageOrchestrator } from "@/components/core/PageOrchestrator";
import { moduleConfigs } from "@/modules";

export default function ScrapingDashboardPage() {
  const scrapingModule = moduleConfigs.find((mod) => mod.id === "scraping");
  if (!scrapingModule) return notFound();

  const homeRoute = scrapingModule.routes.find((route) => route.path === "/");
  if (!homeRoute) return notFound();

  return <PageOrchestrator moduleId="scraping" routePath="/" slots={homeRoute.slots} />;
}
