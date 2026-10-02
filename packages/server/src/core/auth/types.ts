import type { CodePermission } from "@prisma/client";

export interface UtilisateurCourant {
  id: string;
  login: string;
  nom: string;
  prenom: string;
  email: string;
  permissions: ReadonlySet<CodePermission>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UtilisateurCourant;
    }
  }
}
