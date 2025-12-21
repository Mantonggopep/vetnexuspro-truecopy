"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const user_controller_1 = require("./user.controller");
const user_service_1 = require("./user.service");
const authGuard_1 = require("../../middlewares/authGuard");
async function userRoutes(app) {
    const service = new user_service_1.UserService(app);
    const controller = new user_controller_1.UserController(service);
    app.post("/", { preHandler: [authGuard_1.authGuard] }, controller.createHandler.bind(controller));
    app.get("/", { preHandler: [authGuard_1.authGuard] }, controller.getAllHandler.bind(controller));
}
