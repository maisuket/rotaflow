import rateLimit from "express-rate-limit";

/** Limite geral, aplicado a toda a API — so pra evitar abuso grosseiro. */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisicoes — tente de novo em alguns minutos." },
});

/**
 * Limite mais estrito pras rotas que chamam APIs do Google (custam dinheiro
 * de verdade por chamada): /optimize, /auto-optimize, /geocode.
 */
export const expensiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas otimizacoes/buscas de endereco seguidas — tente de novo em alguns minutos." },
});
