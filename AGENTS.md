<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Architecture Decisions

- **Protected workspace under `_authenticated`.** All signed-in Nexo modules (`/anotacoes`, `/lembretes`, `/diario`, `/treinos`, `/calorias`, `/corpo`) live under `src/routes/_authenticated/` (`ssr: false` with `beforeLoad` session check) while `/`, `/auth`, and `/reset-password` remain public SSR routes so hard refreshes never redirect-loop on browser-stored auth sessions.
- **Direct per-user RLS queries via `src/lib/nexo-queries.ts`.** Each workspace domain table (`notes`, `reminders`, `journal_entries`, `workouts`, `calorie_profiles`, `meal_entries`, `weight_logs`) enforces `auth.uid() = user_id` RLS policies with explicit `authenticated` grants, keeping client reads/writes isolated per account without duplicating CRUD logic in routes.
- **Pure fitness formulas in `src/lib/fitness-math.ts`.** Calorie (Mifflin-St Jeor), IMC/lean-mass, and workout volume calculations live in a pure module so UI calculators and Vitest unit tests share the exact same validated math.
