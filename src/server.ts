import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
// Bind to loopback by default. FocusFlow has no authentication yet (auth is
// out of scope per product.md), so it should not be exposed on a public
// interface without adding an auth layer first.
const host = process.env.HOST ?? "127.0.0.1";

const app = buildApp({ logger: true });

app
  .listen({ port, host })
  .then((address) => {
    app.log.info(`FocusFlow API ready at ${address}`);
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
