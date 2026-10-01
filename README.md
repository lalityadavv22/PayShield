# PayShield

**Trust the payment, not the screenshot.** Upload a UPI payment screenshot and PayShield looks for signs of editing, then tells you what to check next.

A screenshot can never prove that money was credited. PayShield only reports how consistent a receipt looks — always confirm the payment in your bank app or statement.

## Stack

- React + TypeScript + Vite (single-page frontend)
- Express API routes in `server.ts`
- Vercel serverless functions in `api/` (they import the same Express app from `../server.ts`)
- Google Gemini (`@google/genai`) for screenshot vision, with a conservative local heuristics fallback

## Local development

```bash
npm install
npm run dev      # tsx server.ts -> Express + Vite middleware on http://localhost:3000
```

Optional: copy `.env.example` to `.env` and set `GEMINI_API_KEY` to enable AI vision locally. Without a key the app still runs, but every scan uses the heuristics fallback engine.

Other scripts: `npm run build` (Vite production bundle), `npm start` (run the full server), `npm run lint` (`tsc --noEmit`).

## Deploying on Vercel

No special Vercel settings are required for this repo. The important part is that the API functions can *see* the Gemini key at runtime.

1. **Import the repository** on Vercel. The project uses `vercel.json`, so it is detected as a Vite app with `npm run build` and output directory `dist`. Leave the framework preset, build command, install command, root directory and output directory at their defaults.
2. **Add the environment variable** in **Project Settings → Environment Variables**:
   - Name: `GEMINI_API_KEY` (exactly this name — no `VITE_` prefix; a `VITE_` variable is compiled into the public browser bundle and the server would never see it)
   - Value: your Google AI Studio API key
   - Environments: tick **Production**, **Preview** and **Development**
   - Optional: `GEMINI_MODEL` (defaults to `gemini-2.5-flash`)
3. **Redeploy.** Environment variables are only injected into *new* deployments — an existing deployment keeps running with the old (empty) environment. Use **Deployments → ⋯ → Redeploy**, or push a new commit.

### Check that the key is wired up

After deploying, open:

```
https://<your-project>.vercel.app/api/health
```

Expected when everything is fine:

```json
{
  "ok": true,
  "runtime": "vercel",
  "geminiConfigured": true,
  "geminiKeySeen": true,
  "vision": "gemini"
}
```

If `geminiConfigured` is `false`, the function process does not see `GEMINI_API_KEY` — check the variable name, the environment checkboxes, and that you redeployed after adding it. The endpoint never returns the key value itself.

When the key is missing, the UI still returns a result but flags that only the built-in checks were used (`metadataInfo.visionEngine === "heuristics"`).

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `500 FUNCTION_INVOCATION_FAILED` on every `/api/*` call | In an ESM project (`"type": "module"`), the serverless handler crashed while loading. The original code imported the shared app as `../server` (no extension); Node's ESM resolver does not guess extensions, so the function died with `ERR_MODULE_NOT_FOUND` before running any code. | Import with the `.ts` extension inside `api/*.ts` (`import app from '../server.ts'`). Vercel's builder rewrites that specifier to `../server.js` in the deployed ESM output. |
| Analysis returns “Detailed image analysis was unavailable…” / hedged verdict | Function ran on the heuristics fallback because `GEMINI_API_KEY` was missing or the model call failed | Set `GEMINI_API_KEY` in Vercel and redeploy (see above); check `/api/health` |
| `/api/*` returns the HTML page (404 on the API route) | The deployment was a static-only build and no function was created | Confirm `api/` files are committed and `vercel.json` is present, then redeploy |
| Env var updated but behaviour unchanged | Env vars apply only to new deployments | Redeploy the project |

## Security notes

- The Gemini key must live **only** in server environment variables. Never expose it with a `VITE_` prefix or hard-code it in `src/`.
- `server.ts` is imported by both the long-running dev server and the serverless functions. The `app.listen(...)` bootstrap is skipped automatically on Vercel/Lambda runtimes, so importing the module is side-effect free there.
