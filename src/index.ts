import { handler } from "./handler";

const PORT = process.env.PORT ?? 3000;

Bun.serve({ port: PORT, fetch: handler });

console.log(`App listening on http://localhost:${PORT}`);
