import { parse_config } from "./config";
import { create_server } from "./server";
import { create_session_store } from "./session";

const config = parse_config();
const session_store = create_session_store(config.SESSION_SECRET);
const server = create_server(config.PORT, session_store, config);

console.log(`App listening on http://localhost:${server.port}`);
