import { create_server } from "./server";

const PORT = process.env.PORT ?? 3000;
const server = create_server(PORT);

console.log(`App listening on http://localhost:${server.port}`);
