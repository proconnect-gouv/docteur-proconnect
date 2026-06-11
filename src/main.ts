import { create_auth_handlers } from "./auth";
import { parse_config } from "./config";
import { create_server } from "./server";
import { create_session_store } from "./session";

const config = parse_config();
const session_store = create_session_store(config.SESSION_SECRET);
const auth = create_auth_handlers(config, session_store);

const server = create_server(config.PORT, session_store, auth);

console.log(`App listening on http://localhost:${server.port}`);
