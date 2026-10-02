import { getPermissionsEffectives } from "../../core/auth/permissions";
import { verifierContreFactice, verifierMotDePasse } from "../../core/auth/password";
import { signerToken } from "../../core/auth/token";
import { AppError } from "../../core/errors";
import { prisma } from "../../core/prisma";

const identifiantsInvalides = () =>
  new AppError(401, "INVALID_CREDENTIALS", "Identifiants invalides");

/** Même erreur pour login inconnu, mot de passe faux et compte inactif. */
export async function authentifier(login: string, motDePasse: string) {
  const utilisateur = await prisma.utilisateur.findUnique({ where: { login } });

  if (!utilisateur) {
    await verifierContreFactice(motDePasse);
    throw identifiantsInvalides();
  }

  const valide = await verifierMotDePasse(motDePasse, utilisateur.motDePasseHash);
  if (!valide || !utilisateur.actif) throw identifiantsInvalides();

  return { utilisateurId: utilisateur.id, token: signerToken(utilisateur.id) };
}

export async function profilCourant(utilisateurId: string) {
  const [utilisateur, permissions] = await Promise.all([
    prisma.utilisateur.findUniqueOrThrow({
      where: { id: utilisateurId },
      select: { id: true, login: true, nom: true, prenom: true, email: true },
    }),
    getPermissionsEffectives(utilisateurId),
  ]);
  return { ...utilisateur, permissions: permissions.map((p) => p.code) };
}
