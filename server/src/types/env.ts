const REQUIRED_ENV_VARS = ["APP_LINK_CONNECTION_NAME", "AGENTFORCE_AGENT_ID", "API_SECRET"] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

export type AppEnv = Record<RequiredEnvVar, string>;

export const validateEnv = (): AppEnv => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return Object.fromEntries(REQUIRED_ENV_VARS.map((key) => [key, process.env[key]!])) as AppEnv;
};
