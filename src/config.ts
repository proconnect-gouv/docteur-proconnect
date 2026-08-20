import { z } from "zod";

const config_schema = z.object({
  HOST: z.string(),
  IS_HTTP_PROTOCOL_FORBIDDEN: z.enum(["True", "False"]).default("True"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PC_CLIENT_ID: z.string().min(1),
  PC_CLIENT_SECRET: z.string().min(1),
  PC_ID_TOKEN_SIGNED_RESPONSE_ALG: z.string().optional(),
  PC_USERINFO_SIGNED_RESPONSE_ALG: z.string().optional(),
  PC_PROVIDER: z.url(),
  PORT: z.coerce.number().int().min(80).max(65535).default(3000),
  SESSION_SECRET: z.string().min(1).max(100),
});

export type AppConfig = z.infer<typeof config_schema>;

export function parse_config(): AppConfig {
  return config_schema.parse(process.env);
}
