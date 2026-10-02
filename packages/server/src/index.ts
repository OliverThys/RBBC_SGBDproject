import { app } from "./app";
import { config } from "./core/config";

app.listen(config.PORT, () => {
  console.log(`API à l'écoute sur le port ${config.PORT}`);
});
