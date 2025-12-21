"use strict";
// server/prisma/seed.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Starting seed...");
    const password = await bcryptjs_1.default.hash("12doctor12", 10);
    // We do NOT pass tenantId or clinicId because they are optional
    // and the SuperAdmin is global (not bound to a specific clinic).
    const superAdmin = await prisma.user.upsert({
        where: { email: "mantonggopep@gmail.com" },
        update: {},
        create: {
            name: "Mantong Gopep",
            email: "mantonggopep@gmail.com",
            password,
            roles: [client_1.UserRole.SuperAdmin],
        },
    });
    console.log("✅ Super admin created:", superAdmin.email);
}
main()
    .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
