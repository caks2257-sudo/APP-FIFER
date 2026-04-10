import type { ModuleConfig } from "@/types/architecture";
import { AffiliatesModuleConfig } from "./affiliates/module.config";
import { DashboardModuleConfig } from "./dashboard/module.config";
import { FinanceModuleConfig } from "./finance/module.config";
import { ContentModuleConfig } from "./content/module.config";
import { LogisticsModuleConfig } from "./logistics/module.config";
import { ScrapingModuleConfig } from "./scraping/module.config";

export const moduleConfigs: ModuleConfig[] = [
  DashboardModuleConfig,
  FinanceModuleConfig,
  ContentModuleConfig,
  AffiliatesModuleConfig,
  LogisticsModuleConfig,
  ScrapingModuleConfig,
];