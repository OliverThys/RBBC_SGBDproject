import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const unauthorized = (message = "Authentification requise") =>
  new AppError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Permission refusée") =>
  new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "Ressource introuvable") =>
  new AppError(404, "NOT_FOUND", message);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);

/** Enveloppe les handlers async pour que les rejets arrivent à l'error handler. */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound("Route introuvable"));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Données invalides",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }

  // JSON malformé (body-parser)
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "JSON malformé" } });
    return;
  }

  // Jamais de détail interne dans la réponse ; seul le nom du type d'erreur est loggé.
  console.error(`Erreur non gérée : ${err instanceof Error ? err.name : "inconnue"}`);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Erreur interne du serveur" },
  });
};
