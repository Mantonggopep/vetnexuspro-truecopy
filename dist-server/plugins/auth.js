"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const env_1 = require("../config/env");
const authPlugin = (0, fastify_plugin_1.default)(async (app) => {
    app.register(jwt_1.default, {
        secret: env_1.env.JWT_SECRET,
    });
    app.register(cookie_1.default, {
        secret: env_1.env.COOKIE_SECRET,
        hook: "onRequest",
    });
    app.decorate("authenticate", async (request, reply) => {
        try {
            const token = request.cookies.token;
            if (!token) {
                // Fallback to Header
                await request.jwtVerify();
            }
            else {
                const decoded = app.jwt.verify(token);
                request.user = decoded;
            }
        }
        catch (err) {
            reply.status(401).send({ message: "Unauthorized" });
        }
    });
});
exports.default = authPlugin;
