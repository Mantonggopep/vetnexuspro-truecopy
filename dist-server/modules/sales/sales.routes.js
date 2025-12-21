"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesRoutes = salesRoutes;
const sales_controller_1 = require("./sales.controller");
const authGuard_1 = require("../../middlewares/authGuard");
async function salesRoutes(app) {
    const controller = new sales_controller_1.SalesController();
    app.post("/", { preHandler: [authGuard_1.authGuard] }, controller.createSale.bind(controller));
}
