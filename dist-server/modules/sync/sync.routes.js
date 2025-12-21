"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRoutes = syncRoutes;
const sync_controller_1 = require("./sync.controller");
const authGuard_1 = require("../../middlewares/authGuard");
async function syncRoutes(app) {
    const controller = new sync_controller_1.SyncController();
    app.get("/bootstrap", { preHandler: [authGuard_1.authGuard] }, controller.bootstrapHandler.bind(controller));
}
