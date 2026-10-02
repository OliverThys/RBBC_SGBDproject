import type { CookieOptions, Request, Response } from "express";
import { z } from "zod";
import { COOKIE_NAME } from "../../core/auth/token";
import { unauthorized } from "../../core/errors";
import { authentifier, profilCourant } from "./auth.service";

const loginSchema = z.object({
  login: z.string().trim().min(1),
  motDePasse: z.string().min(1),
});

const SEPT_JOURS_MS = 7 * 24 * 60 * 60 * 1000;

const optionsCookie: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
};

export async function login(req: Request, res: Response) {
  const { login, motDePasse } = loginSchema.parse(req.body);
  const { token, utilisateurId } = await authentifier(login, motDePasse);

  res.cookie(COOKIE_NAME, token, { ...optionsCookie, maxAge: SEPT_JOURS_MS });
  res.json({ data: await profilCourant(utilisateurId) });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, optionsCookie);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw unauthorized();
  res.json({ data: await profilCourant(req.user.id) });
}
