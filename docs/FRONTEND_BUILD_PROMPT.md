# DocMind Frontend Prompts

Two prompts, numbered 1 and 2 below — paste each into your coding agent as
one instruction, in order (run 2 only after 1 is done and working).

## 1. Complete Frontend Build (Zustand for state management)

> Paste everything below into your coding agent as one instruction.

You are extending an existing Vite + React 19 + TypeScript + Tailwind v4
frontend (`frontend/docmind-frontend/`) for **DocMind**, a RAG document
Q&A app. The backend is Spring Boot with stateless JWT auth. Read the
existing files under `src/` before writing new ones; preserve the current
visual language (dark slate + indigo, Tailwind utility classes,
`lucide-react` icons, `clsx`, `react-hot-toast`, `framer-motion` for motion
where it adds value — it's already a dependency but currently unused).

Use **Zustand** for all global client state instead of React Context —
add it as a dependency (`zustand`) and migrate the existing
`context/AppContext.tsx` (documents, selected document, active tab,
sidebar open) into a Zustand store too, so the app ends up with one
consistent state pattern rather than a mix of Context and Zustand. Keep
`react-router-dom` (already installed, currently unused) for actual
routing, and use axios (`services/api.ts`) for all requests except the
streaming chat call, which needs raw `fetch` to read a chunked body.

Backend API contract — use these exact paths/fields, don't invent or
rename anything. Base path `/api/v1`, dev proxy already forwards `/api/**`
to `http://localhost:8081`. Every authenticated endpoint expects
`Authorization: Bearer <accessToken>`. Every JSON response except the two
auth endpoints and the raw stream is wrapped as
`{ success, message, data, timestamp }` — unwrap `.data`.

- `POST /api/v1/auth/register` — body `{ username, email, password }` →
  returns a raw `UserDto` (`{ id, username, email, role }`), HTTP 201, **not**
  wrapped in the envelope.
- `POST /api/v1/auth/login` — body `{ username, password }` (login is by
  **username**, not email) → returns a raw `LoginResponse`
  (`{ accessToken, user: UserDto }`), HTTP 200, **not** wrapped. Note the
  field is `accessToken`, not `token`.
- `POST /documents/upload` (multipart field `file`) → `DocumentResponseDto`.
- `POST /documents/upload-multiple` (multipart field `files`, repeated) →
  `DocumentResponseDto[]`.
- `GET /documents/user` → `DocumentMetadataDto[]`, the **current user's own
  documents only** — use this one for the normal document list, not
  `GET /documents` (that one is `ADMIN`-only and will 403 for a normal
  user).
- `GET /documents/{id}` / `DELETE /documents/{id}` → single doc / delete.
  These two have no ownership check server-side, so never construct or
  accept a document id from anywhere except the user's own
  `/documents/user` list — don't build any UI affordance that could pass an
  arbitrary id.
- `POST /chat/query` — body
  `{ question, documentId?, topK?, minSimilarity?, conversationId? }` →
  `{ answer, conversationId, citations: CitationDto[], responseTimeMs }`.
- `POST /chat/stream` — same body → raw chunked text (`Flux<String>`, plain
  concatenated tokens, not SSE-framed, not JSON).
- `POST /chat/search/similarity` — body
  `{ query, documentId?, topK?, similaritySearch? }` →
  `{ query, totalMatches, matches: CitationDto[] }`.
- `CitationDto` shape: `{ documentId, fileName, chunkIndex, pageNumber,
  snippet, similarityScore, metadata }`.

Conversation id rules: mint the id **client-side** with
`crypto.randomUUID()` before the very first message of a new chat, and send
it on every message in that chat (both streaming and normal mode need to
agree on the same id from message one — the backend only auto-generates an
id for `/chat/query`, not reliably for `/chat/stream`).

There is currently **no backend endpoint to list a user's past chats,
reload a chat's message history, or delete a chat** — build the frontend
against the target shape anyway so swapping in real endpoints later is a
one-file change: create a `services/conversationApi.ts` with `list()`,
`getMessages(id)`, `remove(id)`, typed against
`{ id, title, createdAt, updatedAt }` conversations and
`{ id, messageType: 'USER'|'ASSISTANT'|'SYSTEM', content, createdAt }`
messages — but implement those three functions for now against a
`localStorage` cache **namespaced by the logged-in user's id**
(e.g. `docmind:{userId}:conversations`, `docmind:{userId}:messages:{conversationId}`),
updated by the Zustand chat store whenever a `conversationId` comes back
from `/chat/query` or `/chat/stream`. Mark the module with a
`// TODO(backend): replace with real endpoint` comment.

Build:

1. **`store/authStore.ts`** (Zustand, persisted via the `persist` middleware
   into `localStorage` under one key, e.g. `docmind-auth`): state
   `user: UserDto | null`, `token: string | null`, `isLoading`; actions
   `login(username, password)`, `register(username, email, password)`,
   `logout()`. `logout()` must also clear every user-namespaced
   `localStorage` key used by the conversation/document stores, not just
   its own state.
2. Update `services/api.ts`: a request interceptor pulling the token out of
   the Zustand auth store (use `authStore.getState().token`, not React
   hooks, since this is outside component tree) and attaching
   `Authorization: Bearer <token>`; a response interceptor that on `401`
   calls `authStore.getState().logout()` and hard-navigates to `/login`.
   Add `authApi.login` / `authApi.register` for the two raw endpoints
   above.
3. Routes via `react-router-dom`: `/login`, `/register` (public, redirect
   to `/` if a session already exists), everything else behind a
   `<ProtectedRoute>` reading from `authStore` that redirects to `/login`
   when there's no session. Login form: username + password. Register
   form: username, email, password, plus a client-only confirm-password
   field. Toast errors via `react-hot-toast`.
4. Add a user menu to `Navbar` (avatar/initials, username, role badge,
   **Logout**) wired to `authStore.logout()`, redirecting to `/login`.
5. **`store/conversationStore.ts`** (Zustand): state for the current user's
   chat list, the active conversation id, and each conversation's message
   transcript; actions `loadChats()`, `newChat()`, `selectChat(id)`,
   `deleteChat(id)`, `appendMessage(...)`, backed by
   `services/conversationApi.ts` from above. Persist per-user, and clear on
   `authStore.logout()`.
6. Add a **Chats** panel (new sidebar section or tab next to the existing
   Documents sidebar): chat list (title, relative last-updated time),
   prominent "New chat" action, per-chat delete using the same
   confirm-then-commit pattern already in `Sidebar.tsx`'s document delete,
   and highlight the active chat.
7. Refactor `ChatView` to read/write the active conversation's transcript
   from `conversationStore` instead of local `useState`, so switching chats
   swaps the visible messages and a reload doesn't lose history. Keep
   sending only `question` + `conversationId` (+ optional
   `documentId`/`topK`) per request — never resend prior turns, the
   backend's memory advisor handles that.
8. Fix the streaming call in `ChatView`: it currently hardcodes
   `/api/v1/chat/stream` via bare `fetch` with no auth header. Route it
   through a small shared helper that reads the token from `authStore` and
   sets the `Authorization` header manually (raw `fetch` is still needed
   only because it has to read a chunked response body). Keep the existing
   stream/normal toggle UX (`Wifi`/`WifiOff` pill) exactly as built, and
   persist the user's last-picked mode per-user via `conversationStore` or
   a small dedicated preference store.
9. Migrate document state: `AppContext` → `store/documentStore.ts`
   (Zustand), and switch its fetch from `documentApi.getAll()` to a new
   `documentApi.getMine()` calling `GET /documents/user`. Keep `getAll()`
   available only for a future admin-gated view (`user.role === 'ADMIN'`),
   not the default list. Clear this store on logout too.
10. Verify `SearchView` and `ChunksView` keep working unchanged — they go
    through the shared axios instance, so the auth interceptor covers them
    automatically; just confirm neither bypasses it.

Deliverables likely include: `store/authStore.ts`,
`store/conversationStore.ts`, `store/documentStore.ts`,
`pages/Login.tsx`, `pages/Register.tsx`, `components/ProtectedRoute.tsx`,
`components/ChatsPanel.tsx` (or similar), `services/authApi.ts`,
`services/conversationApi.ts`, updated `App.tsx` for routing, updated
`types/` for `UserDto`/`LoginResponse`/conversation & message DTOs. Remove
`context/AppContext.tsx` once its state lives in `documentStore`. Don't
restyle or remove anything not called out above.

Before calling it done, verify: a fresh incognito session is forced to
`/login`; register → login lands in the app; creating two chats and
reloading keeps both with the right one active; logging out and back in as
a second user shows zero trace of the first user's chats or documents; the
stream/normal toggle still works after auth is wired in; an
expired/invalid token anywhere bounces to `/login` instead of hanging or
looping error toasts.

---

## 2. UI Improvement Pass

> Paste this in a separate follow-up turn once prompt 1 is done and working
> end-to-end — it assumes that feature set already exists and refines it,
> it doesn't build it.

The functional rebuild is done and working. Now do a UI/UX polish pass over
`frontend/docmind-frontend/`. Keep the existing dark slate/indigo visual
identity — this is refinement, not a re-theme. Use judgment on which of
these give the most value for this app rather than doing all of them
mechanically:

1. **Motion**: `framer-motion` is a dependency but unused anywhere. Add
   tasteful transitions: chat list item enter/exit, sidebar panel
   open/close, message bubble entrance, route transitions between
   `/login` ↔ `/register` ↔ app. Keep durations short (150–250ms) and
   respect `prefers-reduced-motion`.
2. **Loading & empty states**: skeleton placeholders (not just spinners)
   for the chat list and document list while loading; a proper empty state
   for "no chats yet" mirroring the existing "no documents yet" one in
   `Sidebar.tsx`.
3. **Auth screens**: make `/login` and `/register` feel like part of the
   same product (reuse the gradient/indigo-purple brand mark from
   `ChatView`'s welcome screen), inline field-level validation errors,
   password visibility toggle, disabled+spinner submit state, a link
   between the two pages.
4. **Responsive/mobile**: the current layout assumes desktop width; add a
   collapsible/off-canvas sidebar behavior below the `md` breakpoint for
   both the Documents and Chats panels, and make sure the chat input area
   and message bubbles don't overflow on narrow viewports.
5. **Accessibility**: keyboard focus states on all interactive elements
   (chat list items, delete-confirm buttons, mode toggle), `aria-label`s on
   icon-only buttons (several in `Sidebar.tsx`/`ChatView.tsx` have none),
   proper heading hierarchy, and confirm muted text
   (`text-slate-500/600`) against `#0f172a` meets WCAG AA contrast.
6. **Chat list quality-of-life**: inline rename (double-click or an edit
   icon) for chat titles instead of only the auto-generated first-question
   title; a search/filter box once the list grows past a handful of items;
   group by "Today / Yesterday / Earlier" like typical chat products.
7. **Message list performance**: for very long conversations, consider
   virtualizing the message list so scroll stays smooth — check whether
   this is actually needed before adding the complexity.
8. **Feedback consistency**: audit all `toast.success`/`toast.error` calls
   for consistent tone/wording; add an `ErrorBoundary` around the app shell
   so a render error shows a recoverable screen instead of a blank page.
9. **Branding polish**: replace the default Vite favicon/title
   (`index.html`) with DocMind branding consistent with the in-app logo
   mark; add a `<meta name="theme-color">` matching `#0f172a`.
10. **Light theme (optional, ask before doing)**: if a light mode is
    wanted, confirm with the user first — the current design is dark-first
    throughout, so this is a bigger lift than the rest of this list.

Report back a short list of what you changed and, separately, anything
from this list you deliberately skipped and why (e.g. "skipped
virtualization — conversations are short in practice").
