import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authGuard } from "../../core/auth/middleware";
import { asyncHandler } from "../../core/errors";
import { login, logout, me } from "./auth.controller";

// Anti brute-force : 10 tentatives / 15 min / IP, en plus du message générique.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: { code: "RATE_LIMITED", message: "Trop de tentatives, réessayez plus tard" },
  },
});

export const authRouter = Router();

authRouter.post("/login", loginLimiter, asyncHandler(login));
authRouter.post("/logout", authGuard, logout);
authRouter.get("/me", authGuard, asyncHandler(me));
