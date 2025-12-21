import { PrismaClient } from "@prisma/client";
import { FastifyRequest, FastifyReply } from "fastify";
import "@fastify/jwt";
import "@fastify/cookie";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      role: string;
      tenantId: string;
      branchId?: string;
      name: string;
      clientId?: string;
    };
    cookies: { [cookieName: string]: string | undefined };
    jwtVerify<Decoded extends { [key: string]: any } = { [key: string]: any }>(options?: any): Promise<Decoded>;
  }

  interface FastifyReply {
    jwtSign(payload: any, options?: any): Promise<string>;
    setCookie(name: string, value: string, options?: any): this;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: string;
      email: string;
      role: string;
      tenantId: string;
      branchId?: string;
      name: string;
      clientId?: string;
    };
    user: {
      id: string;
      email: string;
      role: string;
      tenantId: string;
      branchId?: string;
      name: string;
      clientId?: string;
    };
  }
}
