/**
 * User space — prefijo de seguridad para boxId (espacio aislado por usuario).
 * El esquema Zod de manifiestos solo admite kebab-case; el prefijo documental "u_" del Masterplan
 * se materializa como `u-` + segmentos kebab (equivalente semántico: namespace usuario).
 */
export const USER_SPACE_BOX_ID_PREFIX = "u-" as const;

function toKebabSegment(s: string): string {
  return s
    .trim()
    .replace(/_/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Genera un `boxId` único en el espacio de usuario: `u-<userKebab>-<localSlugKebab>`.
 */
export function buildUserSpaceBoxId(userId: string, localSlug: string): string {
  const u = toKebabSegment(userId);
  const slug = toKebabSegment(localSlug);
  return `${USER_SPACE_BOX_ID_PREFIX}${u}-${slug}`;
}

export function isUserSpaceBoxId(boxId: string): boolean {
  return boxId.startsWith(USER_SPACE_BOX_ID_PREFIX);
}
