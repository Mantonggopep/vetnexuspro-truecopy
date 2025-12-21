"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingRoutes = billingRoutes;
const billing_controller_1 = require("./billing.controller");
const authGuard_1 = require("../../middlewares/authGuard");
async function billingRoutes(app) {
    const controller = new billing_controller_1.BillingController();
    app.post("/verify", { preHandler: [authGuard_1.authGuard] }, controller.verifyPayment.bind(controller));
}
