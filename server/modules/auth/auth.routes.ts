
import { FastifyInstance } from "fastify";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { loginSchema, signupSchema, registerTenantSchema } from "./auth.schema";
import { authGuard } from "../../middlewares/authGuard";

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService(app);
  const controller = new AuthController(service);

  app.post("/login", {
    schema: {
      body: loginSchema,
      tags: ['Auth'],
    } as any
  }, controller.loginHandler.bind(controller));

  app.post("/signup", {
    schema: {
      body: signupSchema,
      tags: ['Auth'],
    } as any
  }, controller.signupHandler.bind(controller));

  // Public endpoint for full tenant registration
  app.post("/register-tenant", {
    schema: {
      body: registerTenantSchema,
      tags: ['Auth'],
    } as any
  }, controller.registerTenantHandler.bind(controller));

  app.post("/forgot-password", {
      schema: {
          tags: ['Auth'],
          body: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', format: 'email' } }
          }
      } as any
  }, controller.forgotPasswordHandler.bind(controller));

  app.post("/reset-password-confirm", {
      schema: {
          tags: ['Auth'],
          body: {
              type: 'object',
              required: ['token', 'password'],
              properties: { 
                  token: { type: 'string' },
                  password: { type: 'string', minLength: 6 }
              }
          }
      } as any
  }, controller.resetPasswordConfirmHandler.bind(controller));

  app.get("/me", {
    preHandler: [authGuard],
    schema: {
        tags: ['Auth'],
        security: [{ BearerAuth: [] }]
    } as any
  }, controller.meHandler.bind(controller));
}
