import { afterEach, describe, expect, it, vi } from "vitest";
import { requireAuth } from "../src/middleware/auth";
import { env } from "../src/config/env";

function makeReqRes(authHeader?: string) {
  const req: any = { headers: authHeader ? { authorization: authHeader } : {} };
  const res: any = {
    statusCode: 200,
    body: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  const next = vi.fn();
  return { req, res, next };
}

describe("requireAuth", () => {
  afterEach(() => {
    env.appPassword = null;
  });

  it("deixa passar sem checar nada quando APP_PASSWORD nao esta configurada", () => {
    env.appPassword = null;
    const { req, res, next } = makeReqRes();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("bloqueia com 401 quando a senha esta configurada mas nenhum header foi enviado", () => {
    env.appPassword = "segredo123";
    const { req, res, next } = makeReqRes();
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("bloqueia com 401 quando o token enviado esta errado", () => {
    env.appPassword = "segredo123";
    const { req, res, next } = makeReqRes("Bearer senha-errada");
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("deixa passar quando o token bate com APP_PASSWORD", () => {
    env.appPassword = "segredo123";
    const { req, res, next } = makeReqRes("Bearer segredo123");
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });
});
