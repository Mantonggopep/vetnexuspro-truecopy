"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const ai_service_1 = require("./ai.service");
class AIController {
    constructor() {
        this.service = new ai_service_1.AIService();
    }
    async summarizeHandler(request, reply) {
        const summary = await this.service.generateSummary(request.body.text);
        return reply.send({ summary });
    }
    async diagnosisHandler(request, reply) {
        const result = await this.service.generateDiagnosis(request.body);
        return reply.send({ result }); // Returns JSON string
    }
    async identifyHandler(request, reply) {
        const result = await this.service.identifyProduct(request.body.image);
        return reply.send(result);
    }
}
exports.AIController = AIController;
