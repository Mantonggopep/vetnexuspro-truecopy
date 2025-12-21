"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = aiRoutes;
const ai_controller_1 = require("./ai.controller");
const authGuard_1 = require("../../middlewares/authGuard"); // Adjust path if using absolute imports
async function aiRoutes(app) {
    const controller = new ai_controller_1.AIController();
    app.post("/summary", { preHandler: [authGuard_1.authGuard] }, controller.summarizeHandler.bind(controller));
    app.post("/diagnosis", { preHandler: [authGuard_1.authGuard] }, controller.diagnosisHandler.bind(controller));
    app.post("/identify", { preHandler: [authGuard_1.authGuard] }, controller.identifyHandler.bind(controller));
}
