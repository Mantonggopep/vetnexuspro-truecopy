"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const scheduler_1 = require("./plugins/scheduler");
const app = (0, app_1.buildApp)();
async function main() {
    try {
        // Register background jobs
        (0, scheduler_1.schedulerPlugin)(app);
        await app.listen({ port: env_1.env.PORT, host: env_1.env.HOST });
        console.log(`🚀 VetNexus Pro Backend running on http://${env_1.env.HOST}:${env_1.env.PORT}`);
        console.log(`📄 Docs available at http://${env_1.env.HOST}:${env_1.env.PORT}/docs`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
main();
