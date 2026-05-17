import { Hono } from "hono";
import { renderToString } from "react-dom/server";

const port = Number(Deno.env.get("PORT") ?? "8000");

type CreatePointInput = {
  name: string;
  note?: string;
};

type CreatePointResponse =
  | {
    ok: true;
    point: {
      id: string;
      name: string;
      note?: string;
      createdAt: string;
    };
  }
  | {
    ok: false;
    error: string;
    fieldErrors?: Partial<Record<keyof CreatePointInput, string>>;
  };

type ParseResult<T> =
  | { ok: true; data: T }
  | {
    ok: false;
    error: string;
    fieldErrors?: Partial<Record<keyof CreatePointInput, string>>;
  };

const app = new Hono();

const routes = app
  .get("/", (context) => context.html(renderPage()))
  .get("/index.html", (context) => context.html(renderPage()))
  .get("/api/health", (context) => {
    return context.json({ ok: true, service: "survivalmap" });
  })
  .post("/api/points", async (context) => {
    const parsed = await parseCreatePointRequest(context.req.raw);

    if (!parsed.ok) {
      return context.json<CreatePointResponse>({
        ok: false,
        error: parsed.error,
        fieldErrors: parsed.fieldErrors,
      }, 400);
    }

    return context.json<CreatePointResponse>({
      ok: true,
      point: {
        id: crypto.randomUUID(),
        ...parsed.data,
        createdAt: new Date().toISOString(),
      },
    }, 201);
  });

app.notFound((context) => {
  return context.json({ ok: false, error: "Not found" }, 404);
});

export type AppType = typeof routes;

Deno.serve({ port }, app.fetch);

async function parseCreatePointRequest(request: Request): Promise<ParseResult<CreatePointInput>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return parseCreatePointInput(await request.json());
    } catch {
      return { ok: false, error: "Request body must be valid JSON." };
    }
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    return parseCreatePointInput(Object.fromEntries(await request.formData()));
  }

  return {
    ok: false,
    error: "Use application/json or form data for this endpoint.",
  };
}

function parseCreatePointInput(value: unknown): ParseResult<CreatePointInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be an object." };
  }

  const fieldErrors: Partial<Record<keyof CreatePointInput, string>> = {};
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const note = typeof value.note === "string" ? value.note.trim() : "";

  if (name.length === 0) {
    fieldErrors.name = "Name is required.";
  } else if (name.length > 80) {
    fieldErrors.name = "Name must be 80 characters or fewer.";
  }

  if (note.length > 500) {
    fieldErrors.note = "Note must be 500 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Point input is invalid.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      name,
      note: note || undefined,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function renderPage(): string {
  return `<!doctype html>${renderToString(<IndexPage />)}`;
}

function IndexPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Survival Map</title>
        <style>{styles}</style>
      </head>
      <body>
        <main>
          <section className="hero">
            <p className="eyebrow">Server-rendered Deno app</p>
            <h1>Survival Map</h1>
            <p>
              This page is rendered from backend React components. The same Deno process also
              exposes a typed POST endpoint at <code>/api/points</code>{" "}
              for testing full-stack requests.
            </p>
          </section>

          <section className="tester">
            <p className="eyebrow">POST endpoint</p>
            <h2>Create a test point</h2>
            <form action="/api/points" method="post">
              <label>
                Name
                <input name="name" maxLength={80} required placeholder="Starter base" />
              </label>
              <label>
                Note
                <textarea name="note" maxLength={500} placeholder="Optional note" />
              </label>
              <button type="submit">Send POST request</button>
            </form>
            <p>JSON test:</p>
            <pre>
              <code>{`curl -X POST http://localhost:8000/api/points \\
  -H "content-type: application/json" \\
  -d '{"name":"Starter base","note":"Testing the typed endpoint"}'`}</code>
            </pre>
          </section>
        </main>
      </body>
    </html>
  );
}

const styles = `
:root {
  color: #e9fbff;
  background: #071312;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at 20% 10%, rgba(77, 180, 176, 0.22), transparent 28rem),
    radial-gradient(circle at 90% 0%, rgba(124, 247, 212, 0.16), transparent 22rem),
    linear-gradient(145deg, #050b0d 0%, #071312 52%, #102323 100%);
}

main {
  display: grid;
  width: min(900px, 100%);
  min-height: 100vh;
  gap: 24px;
  align-content: center;
  margin: 0 auto;
  padding: 32px;
}

section {
  border: 1px solid rgba(130, 239, 221, 0.22);
  border-radius: 28px;
  background: rgba(9, 29, 29, 0.88);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
}

.hero,
.tester {
  padding: 28px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #7cf7d4;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  max-width: 720px;
  margin: 0;
  font-size: clamp(3rem, 9vw, 6rem);
  letter-spacing: -0.08em;
  line-height: 0.95;
}

h2 {
  margin: 0;
}

p {
  color: #9bbdbb;
  line-height: 1.6;
}

form {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

label {
  display: grid;
  gap: 7px;
  color: #9bbdbb;
  font-size: 0.9rem;
  font-weight: 700;
}

input,
textarea,
button {
  font: inherit;
}

input,
textarea {
  width: 100%;
  border: 1px solid rgba(124, 247, 212, 0.22);
  border-radius: 14px;
  color: #e9fbff;
  background: rgba(3, 14, 16, 0.86);
  outline: none;
}

input {
  height: 44px;
  padding: 0 12px;
}

textarea {
  min-height: 100px;
  padding: 12px;
  resize: vertical;
}

button {
  height: 48px;
  border: 0;
  border-radius: 16px;
  color: #031110;
  background: linear-gradient(135deg, #7cf7d4, #39d8b9);
  cursor: pointer;
  font-weight: 900;
}

code,
pre {
  color: #d8fff6;
  background: rgba(3, 14, 16, 0.86);
}

pre {
  overflow: auto;
  padding: 16px;
  border: 1px solid rgba(124, 247, 212, 0.18);
  border-radius: 16px;
}

@media (max-width: 620px) {
  main {
    padding: 16px;
  }

  .hero,
  .tester {
    padding: 20px;
  }
}
`;
