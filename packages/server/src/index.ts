import cors from "cors";
import express from "express";

const port = Number(process.env.PORT ?? 3001);
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";

const app = express();

app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

app.listen(port, () => {
  console.log(`API à l'écoute sur le port ${port}`);
});
