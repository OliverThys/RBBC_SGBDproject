import type { CodePermission } from "@prisma/client";
import { prisma } from "../prisma";

export type SourcePermission =
  | { type: "groupe"; groupe: string }
  | { type: "direct"; expireLe: Date | null };

export interface PermissionEffective {
  code: CodePermission;
  sources: SourcePermission[];
}

/**
 * Permissions effectives d'un utilisateur : union des permissions de ses
 * groupes et de ses permissions directes. Les permissions directes expirées
 * sont écartées à l'appel (pas de cron) ; chaque permission garde la liste de
 * ses sources pour la vue « Permissions effectives ».
 */
export async function getPermissionsEffectives(
  utilisateurId: string,
  maintenant: Date = new Date(),
): Promise<PermissionEffective[]> {
  const [liensGroupes, directes] = await Promise.all([
    prisma.utilisateurGroupe.findMany({
      where: { utilisateurId },
      select: {
        groupe: {
          select: { nom: true, permissions: { select: { permission: { select: { code: true } } } } },
        },
      },
    }),
    prisma.utilisateurPermission.findMany({
      where: {
        utilisateurId,
        OR: [{ expireLe: null }, { expireLe: { gt: maintenant } }],
      },
      select: { expireLe: true, permission: { select: { code: true } } },
    }),
  ]);

  const parCode = new Map<CodePermission, SourcePermission[]>();
  const ajouter = (code: CodePermission, source: SourcePermission) => {
    parCode.set(code, [...(parCode.get(code) ?? []), source]);
  };

  for (const { groupe } of liensGroupes) {
    for (const { permission } of groupe.permissions) {
      ajouter(permission.code, { type: "groupe", groupe: groupe.nom });
    }
  }
  for (const d of directes) {
    ajouter(d.permission.code, { type: "direct", expireLe: d.expireLe });
  }

  return [...parCode.entries()]
    .map(([code, sources]) => ({ code, sources }))
    .sort((a, b) => a.code.localeCompare(b.code));
}
