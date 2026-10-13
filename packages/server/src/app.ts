import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { config } from "./core/config";
import { errorHandler, notFoundHandler } from "./core/errors";
import { authRouter } from "./modules/auth/auth.router";
import { equipesRouter } from "./modules/equipes/equipes.router";
import { joueursRouter } from "./modules/joueurs/joueurs.router";

export const app = express();

app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const api = express.Router();

// Limite globale de l'API, en plus de la limite dédiée au login.
api.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: { code: "RATE_LIMITED", message: "Trop de requêtes, réessayez plus tard" },
    },
  }),
);

api.get("/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

api.use("/auth", authRouter);
api.use("/joueurs", joueursRouter);
api.use("/equipes", equipesRouter);

app.use("/api/v1", api);
app.use(notFoundHandler);
app.use(errorHandler);
