declare namespace Cloudflare {
  interface Env {
    ADMIN_PASSWORD_HASH?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
