"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const static_1 = __importDefault(require("@fastify/static"));
const compress_1 = __importDefault(require("@fastify/compress"));
const path_1 = __importDefault(require("path"));
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const prisma_1 = __importDefault(require("./plugins/prisma"));
const auth_1 = __importDefault(require("./plugins/auth"));
const errors_1 = require("./utils/errors");
const auth_routes_1 = require("./modules/auth/auth.routes");
const user_routes_1 = require("./modules/users/user.routes");
const ai_routes_1 = require("./modules/ai/ai.routes");
const sync_routes_1 = require("./modules/sync/sync.routes");
const sales_routes_1 = require("./modules/sales/sales.routes");
const billing_routes_1 = require("./modules/billing/billing.routes");
const analytics_routes_1 = require("./modules/analytics/analytics.routes"); // New
const resource_controller_1 = require("./modules/general/resource.controller");
const authGuard_1 = require("./middlewares/authGuard");
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
function buildApp() {
    const app = (0, fastify_1.default)({
        logger: true,
    });
    app.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
    app.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
    app.setErrorHandler(errors_1.errorHandler);
    app.register(compress_1.default);
    app.register(cors_1.default, { origin: true });
    app.register(prisma_1.default);
    app.register(auth_1.default);
    app.register(static_1.default, {
        root: path_1.default.join(process.cwd(), 'public'),
        wildcard: false
    });
    app.register(swagger_1.default, {
        swagger: {
            info: { title: 'VetNexus API', version: '2.0.0' },
            securityDefinitions: { BearerAuth: { type: 'apiKey', name: 'Authorization', in: 'header' } }
        }
    });
    app.register(swagger_ui_1.default, { routePrefix: '/docs' });
    app.register(async (api) => {
        api.register(auth_routes_1.authRoutes, { prefix: "/auth" });
        api.register(user_routes_1.userRoutes, { prefix: "/users" });
        api.register(ai_routes_1.aiRoutes, { prefix: "/ai" });
        api.register(sync_routes_1.syncRoutes, { prefix: "/sync" });
        api.register(sales_routes_1.salesRoutes, { prefix: "/sales" });
        api.register(billing_routes_1.billingRoutes, { prefix: "/billing" });
        api.register(analytics_routes_1.analyticsRoutes, { prefix: "/analytics" }); // Register Analytics
        const resourceController = new resource_controller_1.ResourceController(api.prisma);
        api.get("/:collection", { preHandler: [authGuard_1.authGuard] }, resourceController.getAll.bind(resourceController));
        api.get("/:collection/:id", { preHandler: [authGuard_1.authGuard] }, resourceController.getOne.bind(resourceController));
        api.post("/:collection", { preHandler: [authGuard_1.authGuard] }, resourceController.create.bind(resourceController));
        api.put("/:collection/:id", { preHandler: [authGuard_1.authGuard] }, resourceController.update.bind(resourceController));
        api.delete("/:collection/:id", { preHandler: [authGuard_1.authGuard] }, resourceController.delete.bind(resourceController));
    }, { prefix: "/api" });
    app.setNotFoundHandler((req, reply) => {
        if (req.raw.url && req.raw.url.startsWith('/api')) {
            reply.code(404).send({ message: 'API Route not found' });
            return;
        }
        return reply.sendFile('index.html');
    });
    return app;
}
