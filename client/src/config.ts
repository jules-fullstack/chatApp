import { z } from "zod";

// Define the schema for your environment variables
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url("Must be a valid API URL"),
  VITE_WEBSOCKET_URL: z.string().url("Must be a valid WebSocket URL"),
  VITE_APP_NAME: z.string().optional().default("Chat App"),
  VITE_NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
});

// Validate environment variables at startup
const parseEnv = () => {
  try {
    return envSchema.parse({
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      VITE_WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_URL,
      VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
      VITE_NODE_ENV: import.meta.env.VITE_NODE_ENV,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid environment configuration:");
      error.issues.forEach((err) => {
        console.error(`  ${err.path.join(".")}: ${err.message}`);
      });
      console.error(
        "\nPlease check your .env file and ensure all required variables are set."
      );
      throw new Error("Environment validation failed");
    }
    throw error;
  }
};

// Export validated config
export const config = parseEnv();

// Export individual values for backward compatibility
export const API_BASE_URL = config.VITE_API_BASE_URL;
export const WEBSOCKET_URL = config.VITE_WEBSOCKET_URL;
export const APP_NAME = config.VITE_APP_NAME;
export const NODE_ENV = config.VITE_NODE_ENV;
