# React + Vite

## Ebook administration

Open `/#ebooks` or select **Ebooks** in the sidebar. This section uses the existing
backend `/auth/login` and `/auth/me` endpoints and requires an admin account.
The JWT is kept in session storage for this tab; signing out removes it.

Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the backend's API origin.
Configure the Blob store and PDF size limit on the backend only. Never put a Blob
read/write token in a `VITE_` environment variable or any frontend file.

Create an ebook with a title and PDF. The form saves a draft, requests a unique
upload authorization from the backend, and sends the File directly to Vercel Blob
with the official SDK's multipart upload. PDF bytes never pass through this app's
API requests. The server-provided limit defaults to 500 MiB (displayed as 500 MB).
Cover images accept JPEG, PNG, and WebP, using the backend's separate size limit.

Progress shows the actual bytes sent. Cancel stops the transfer; retry obtains a
fresh upload authorization. If only server verification fails, **Retry verification**
reuses the uploaded object. Existing PDFs/covers remain in place during replacement.
Pending uploads from a prior session can be verified or cancelled from the editor.
Publishing stays disabled until the backend has verified a PDF. The download setting
controls the library's download action, not the browser's ability to save a readable PDF.

The backend returns expiring links for private Blob objects. The library and editor
refresh these links before expiry; **Refresh file links** also updates them manually.

Run `npm run lint`, `npm run type-check`, `npm test`, and `npm run build` to verify.
`npm run test:unit` covers file signatures, configured size boundaries, and the upload
state machine. `npm run test:integration` covers login, navigation, management, and
the upload UI. Blob calls are mocked; boundary tests do not allocate/upload 500 MB.
TypeScript checks cover the new ebook feature; existing blog/case-study files stay JavaScript.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
