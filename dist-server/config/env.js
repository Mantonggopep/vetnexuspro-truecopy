"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const zod_1 = __importDefault(require("zod"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const schema = zod_1.default.object({
    PORT: zod_1.default.coerce.number().default(3001),
    HOST: zod_1.default.string().default('0.0.0.0'),
    NODE_ENV: zod_1.default.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: zod_1.default.string(),
    DIRECT_URL: zod_1.default.string().optional(), // Required for Supabase migrations
    JWT_SECRET: zod_1.default.string().min(32),
    COOKIE_SECRET: zod_1.default.string().min(32),
    API_KEY: zod_1.default.string().optional(), // Google Gemini API Key
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 4));
    process.exit(1);
}
exports.env = parsed.data;
