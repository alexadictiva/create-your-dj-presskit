/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  UPLOADS: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/presskits") {
      await env.DB.batch([
        env.DB.prepare(`CREATE TABLE IF NOT EXISTS djs (
          id TEXT PRIMARY KEY,
          artist_name TEXT NOT NULL,
          real_name TEXT NOT NULL,
          city TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          biography TEXT NOT NULL,
          experiences TEXT NOT NULL,
          genres TEXT NOT NULL,
          equipment TEXT NOT NULL,
          instagram TEXT NOT NULL,
          soundcloud TEXT NOT NULL,
          website TEXT NOT NULL,
          template TEXT NOT NULL,
          photos TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`),
        env.DB.prepare("CREATE INDEX IF NOT EXISTS djs_created_at_idx ON djs (created_at)"),
      ]);

      if (request.method === "GET") {
        const result = await env.DB.prepare("SELECT * FROM djs ORDER BY created_at DESC LIMIT 500").all();
        const rows = result.results.map((row) => ({
          id: row.id,
          artistName: row.artist_name,
          realName: row.real_name,
          city: row.city,
          email: row.email,
          phone: row.phone,
          biography: row.biography,
          experiences: row.experiences,
          genres: JSON.parse(String(row.genres)),
          equipment: JSON.parse(String(row.equipment)),
          instagram: row.instagram,
          soundcloud: row.soundcloud,
          website: row.website,
          template: row.template,
          photos: JSON.parse(String(row.photos)),
          createdAt: row.created_at,
        }));
        return Response.json(rows);
      }

      if (request.method === "POST") {
        const formData = await request.formData();
        const payload = JSON.parse(String(formData.get("payload") ?? "{}")) as Record<string, unknown>;
        const id = crypto.randomUUID();
        const uploaded: string[] = [];
        for (const entry of formData.getAll("photos")) {
          if (!(entry instanceof File)) continue;
          const safeName = entry.name.replace(/[^a-zA-Z0-9.-]/g, "-");
          const key = `${id}/${crypto.randomUUID()}-${safeName}`;
          await env.UPLOADS.put(key, entry.stream(), { httpMetadata: { contentType: entry.type } });
          uploaded.push(key);
        }
        await env.DB.prepare(`INSERT INTO djs (
          id, artist_name, real_name, city, email, phone, biography, experiences,
          genres, equipment, instagram, soundcloud, website, template, photos, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(
            id,
            payload.artistName,
            payload.realName,
            payload.city,
            payload.email,
            payload.phone,
            payload.biography,
            payload.experiences,
            JSON.stringify(payload.genres ?? []),
            JSON.stringify(payload.equipment ?? []),
            payload.instagram,
            payload.soundcloud,
            payload.website,
            payload.template,
            JSON.stringify(uploaded),
            payload.createdAt ?? new Date().toISOString(),
          )
          .run();
        return Response.json({ id, ok: true }, { status: 201 });
      }

      return new Response("Method not allowed", { status: 405 });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
