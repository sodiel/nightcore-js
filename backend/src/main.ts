import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const { createApp } = await import("./app.ts");
const { config } = await import("./config.ts");
const { initializeLibrary } = await import("./library.ts");
const { cookieWarning } = await import("./local-auth.ts");
const { checkTools } = await import("./tools.ts");

if (config.youtubeAuth.enabled) console.warn(cookieWarning);
await checkTools();
await initializeLibrary();
createApp().listen(config.port, config.host, () => {
  console.log(`nightcore-js listening on http://${config.host}:${config.port}`);
});
