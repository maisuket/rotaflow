import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3001,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  /** Senha compartilhada simples. Null = autenticacao desativada (uso local sem fricção). */
  appPassword: process.env.APP_PASSWORD || null,
};

if (!env.googleMapsApiKey) {
  console.warn(
    "[env] GOOGLE_MAPS_API_KEY nao configurada — CRUD de locations/routes funciona normalmente, " +
      "mas POST /api/optimize retornara 503 ate a chave ser definida em server/.env"
  );
}

if (!env.appPassword) {
  console.warn(
    "[env] APP_PASSWORD nao configurada — a API esta ABERTA, sem autenticacao. " +
      "Defina APP_PASSWORD em server/.env antes de expor este servidor alem do seu localhost."
  );
}
