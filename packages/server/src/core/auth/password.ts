import bcrypt from "bcrypt";

const ROUNDS = 12;

export const hasherMotDePasse = (motDePasse: string) => bcrypt.hash(motDePasse, ROUNDS);

export const verifierMotDePasse = (motDePasse: string, hash: string) =>
  bcrypt.compare(motDePasse, hash);

// Hash factice comparé quand le login est inconnu : le temps de réponse reste
// le même qu'avec un vrai compte (anti-énumération par timing).
const HASH_FACTICE = bcrypt.hashSync("hash-factice-anti-timing", ROUNDS);

export const verifierContreFactice = (motDePasse: string) =>
  bcrypt.compare(motDePasse, HASH_FACTICE);
