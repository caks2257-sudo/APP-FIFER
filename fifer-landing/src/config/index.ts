/**
 * Config estática tipada — barrel público.
 * `BOX_REGISTRY` y tipos asociados: `@/config/box.config` (módulo cliente — React.lazy).
 */
export {
  DASHBOARD_BOX_IDS,
  MAIN_DASHBOARD_MODULE_ID,
} from "./modules.config";
export {
  type SidebarNavItem,
  type SidebarNavSection,
  sidebarNavigation,
} from "./navigation.config";
