import http from "http";
import { app } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { initSocket } from "./socket";

async function bootstrap() {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  const port = env.PORT;
  httpServer.listen(port, () => {
    console.log("Server running on", port);
  });
}

bootstrap().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
