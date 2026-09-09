import { RequestHandler } from "express";
import { env } from "../config/env";

/**
 * Gate de senha compartilhada simples — NAO e um sistema de contas (nao ha
 * usuarios, so um segredo unico). Serve pra impedir que qualquer um na rede
 * crie/exclua dados ou queime a cota da chave do Google, caso este servidor
 * saia do localhost.
 *
 * Quando `APP_PASSWORD` nao esta configurada no .env, este middleware e um
 * no-op (deixa passar tudo) — uso local continua sem nenhuma fricção.
 *
 * Espera `Authorization: Bearer <senha>`. A "senha" e o proprio token: nao ha
 * sessao/expiração, o frontend so guarda a senha digitada e reenvia em toda
 * chamada.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!env.appPassword) {
    next();
    return;
  }

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (token !== env.appPassword) {
    res.status(401).json({ error: "Senha invalida ou ausente" });
    return;
  }

  next();
};
