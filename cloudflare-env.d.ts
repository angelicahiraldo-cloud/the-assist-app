declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ANTHROPIC_API_KEY?: string;
    AI_MODEL?: string;
    AI_ENABLED?: string;
  }
}
