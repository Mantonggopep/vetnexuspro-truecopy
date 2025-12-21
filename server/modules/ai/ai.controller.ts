import { FastifyRequest, FastifyReply } from "fastify";
import { AIService } from "./ai.service";

export class AIController {
  private service: AIService;

  constructor() {
    this.service = new AIService();
  }

  async summarizeHandler(request: FastifyRequest<{ Body: { text: string } }>, reply: FastifyReply) {
    const summary = await this.service.generateSummary(request.body.text);
    return reply.send({ summary });
  }

  async diagnosisHandler(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    const result = await this.service.generateDiagnosis(request.body);
    return reply.send({ result }); // Returns JSON string
  }

  async identifyHandler(request: FastifyRequest<{ Body: { image: string } }>, reply: FastifyReply) {
    const result = await this.service.identifyProduct(request.body.image);
    return reply.send(result);
  }
}