import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
 
export const routing = defineRouting({
  // Lista de idiomas soportados
  locales: ['en-US', 'es-CL'],
 
  // El idioma por defecto si el usuario entra a la raíz "/"
  defaultLocale: 'es-CL'
});
 
export const {Link, redirect, usePathname, useRouter} =
  createNavigation(routing);