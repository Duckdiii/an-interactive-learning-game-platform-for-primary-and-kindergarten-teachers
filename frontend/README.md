# AI Game Platform Frontend

React + TypeScript + Vite frontend shell for the AI Game Platform.

## Scripts

- `npm run dev` - start local development server.
- `npm run build` - type-check and build production assets.
- `npm run lint` - run Oxlint.
- `npm run test:drag-drop` - run drag/drop geometry and validation tests (Node 22.18+).

## Drag & Drop Demo

Run the dev server, select **Đăng nhập demo**, then open **Editor**. The editor contains a Konva drag/drop question with local preview and trial-play results. See [drag/drop integration notes](docs/drag-drop-integration.md) for the completion payload, backend integration boundary, and browser verification commands.

## Structure

- `src/App.tsx` - route tree only.
- `src/providers/` - app-wide providers such as auth, router, and query client.
- `src/layouts/` - shared page shells for auth screens and app screens.
- `src/pages/` - route-level pages such as Login, Dashboard, and Workspace Editor.
- `src/components/` - reusable UI components such as Button and LoadingSpinner.
- `src/components/ui/` - page-level presentational helpers.
- `src/context/` - Context API providers and context objects.
- `src/hooks/` - reusable hooks. Use `useAuth()` for session access.
- `src/types/` - shared TypeScript types.
- `src/utils/` - shared helpers.
- `src/api/axiosInstance.ts` - shared API client for backend calls.

Keep business logic out of route files until the backend/API contracts are ready.
