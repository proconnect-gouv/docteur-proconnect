import { z } from "zod/v4";

const config_schema = z.object({
  ACR_VALUE_FOR_CERTIFICATION_DIRIGEANT_2FA: z.string(),
  ACR_VALUE_FOR_CERTIFICATION_DIRIGEANT: z.string(),
  ACR_VALUE_FOR_CONSISTENCY_CHECKED_2FA: z.string(),
  ACR_VALUE_FOR_EIDAS2: z.string(),
  ACR_VALUE_FOR_EIDAS3: z.string(),
  ACR_VALUE_FOR_SELF_ASSERTED_2FA: z.string(),
  ACR_VALUE_FOR_EIDAS0_MFA: z.string(),
  ACR_VALUE_FOR_EIDAS1_MFA: z.string(),
  CALLBACK_URL: z.string(),
  HOST: z.string(),
  IS_HTTP_PROTOCOL_FORBIDDEN: z.enum(["True", "False"]).default("True"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PC_CLIENT_ID: z.string().min(1),
  PC_CLIENT_SECRET: z.string().min(1),
  PC_ID_TOKEN_SIGNED_RESPONSE_ALG: z.string().optional(),
  PC_PROVIDER: z.url(),
  PC_SCOPES: z.string(),
  PC_USERINFO_SIGNED_RESPONSE_ALG: z.string().optional(),
  PORT: z.coerce.number().int().min(80).max(65535).default(3000),
  SESSION_SECRET: z.string().min(1).max(100),
});

export type AppConfig = z.infer<typeof config_schema>;

export function parse_config(): AppConfig {
  return config_schema.parse(process.env);
}
