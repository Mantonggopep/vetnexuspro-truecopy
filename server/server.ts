
import { buildApp } from "./app";
import { env } from "./config/env";
import { schedulerPlugin } from "./plugins/scheduler";

const app = buildApp();

async function main() {
  try {
    // Register background jobs
    schedulerPlugin(app);

    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 VetNexus Pro Backend running on http://${env.HOST}:${env.PORT}`);
    console.log(`📄 Docs available at http://${env.HOST}:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    (process as any).exit(1);
  }
}

main();