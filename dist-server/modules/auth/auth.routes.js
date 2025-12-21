"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const auth_schema_1 = require("./auth.schema");
const authGuard_1 = require("../../middlewares/authGuard");
async function authRoutes(app) {
    const service = new auth_service_1.AuthService(app);
    const controller = new auth_controller_1.AuthController(service);
    app.post("/login", {
        schema: {
            body: auth_schema_1.loginSchema,
            tags: ['Auth'],
        }
    }, controller.loginHandler.bind(controller));
    app.post("/signup", {
        schema: {
            body: auth_schema_1.signupSchema,
            tags: ['Auth'],
        }
    }, controller.signupHandler.bind(controller));
    // Public endpoint for full tenant registration
    app.post("/register-tenant", {
        schema: {
            body: auth_schema_1.registerTenantSchema,
            tags: ['Auth'],
        }
    }, controller.registerTenantHandler.bind(controller));
    app.post("/forgot-password", {
        schema: {
            tags: ['Auth'],
            body: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } }
            }
        }
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
        }
    }, controller.resetPasswordConfirmHandler.bind(controller));
    app.get("/me", {
        preHandler: [authGuard_1.authGuard],
        schema: {
            tags: ['Auth'],
            security: [{ BearerAuth: [] }]
        }
    }, controller.meHandler.bind(controller));
}
