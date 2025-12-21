"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authGuard = authGuard;
async function authGuard(request, reply) {
    await request.server.authenticate(request, reply);
}
