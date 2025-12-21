"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRoutes = analyticsRoutes;
const analytics_controller_1 = require("./analytics.controller");
const authGuard_1 = require("../../middlewares/authGuard");
async function analyticsRoutes(app) {
    const controller = new analytics_controller_1.AnalyticsController();
    app.get("/metrics", { preHandler: [authGuard_1.authGuard] }, controller.getDashboardMetrics.bind(controller));
}
