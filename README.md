# Salesforce CRUD Console

A full-stack web app that logs into a Salesforce Developer Org via OAuth 2.0 and lets you
Create, Read, Update, and Delete records on **Account, Opportunity, Lead, Contact, and Case**
through a custom UI — with dynamic field discovery and infinite-scroll pagination (20 records
per page).

Built for the CloudVandana Associate Software Engineer assignment.

## How it works

- **Backend** (`/backend`, Node.js + Express): handles the OAuth 2.0 "Web Server Flow" with
  Salesforce, stores the access/refresh token in a server-side session, and exposes a small
  REST API that the frontend calls. It talks to Salesforce's own REST API
  (`/services/data/vXX.0/...`) — `describe` to get field metadata, SOQL `query` to list/paginate
  records, and `sobjects` POST/PATCH/DELETE for create/update/delete.
- **Frontend** (`/frontend`, React + Vite): a login screen, an object dropdown, a data table
  with infinite scroll, and a modal form for create/edit, built from whatever fields the
  backend says are available for the selected object (so it's not hardcoded per object).

The Salesforce **client secret never reaches the browser** — all token exchange happens on the
backend, which is the correct way to do OAuth 2.0 Web Server Flow.

---

## 1. One-time Salesforce setup (you need to do this yourself)

1. **Sign up for a Developer Org**: go to https://developer.salesforce.com/signup and create a
   free org. Verify the account via the email link, then log in.
2. **Create a Connected App / External Client App**:
   - Setup (gear icon, top right) → search "App Manager" → **New Connected App** (or, on newer
     orgs, **New External Client App** — steps are equivalent for this assignment).
   - Fill in Connected App Name and your email.
   - Check **Enable OAuth Settings**.
   - **Callback URL**: for local dev, `http://localhost:5000/auth/callback`. Add your deployed
     backend's callback URL too once you deploy (Salesforce allows multiple, one per line), e.g.
     `https://your-backend.onrender.com/auth/callback`.
   - **Selected OAuth Scopes**: add `Manage user data via APIs (api)` and
     `Perform requests at any time (refresh_token, offline_access)`.
   - Save. It can take ~10 minutes to activate.
   - Open the app again → **Manage Consumer Details** (may require verification code) to reveal
     the **Consumer Key** (`SF_CLIENT_ID`) and **Consumer Secret** (`SF_CLIENT_SECRET`).
3. Keep this tab open — you'll paste these values into `backend/.env` next.

## 2. Run it locally

```bash
# Backend
cd backend
cp .env.example .env
# edit .env: paste SF_CLIENT_ID, SF_CLIENT_SECRET, generate a random SESSION_SECRET
npm install
npm run dev        # http://localhost:5000

# Frontend, in a second terminal
cd frontend
cp .env.example .env   # defaults to http://localhost:5000, fine for local dev
npm install
npm run dev         # http://localhost:5173
```

Open http://localhost:5173, click **Log in to Salesforce**, authorize the app, and you'll land
back in the console. Pick an object from the dropdown to see its fields and records.

## 3. Deploy it (required by the assignment)

Any free host works; Render (backend) + Vercel or Netlify (frontend) is a common free combo.

### Backend → Render
1. Push this repo to GitHub (see step 4).
2. On Render: **New → Web Service**, connect the repo, set **Root Directory** to `backend`,
   Build Command `npm install`, Start Command `npm start`.
3. Add environment variables from `backend/.env.example` (with your real values). Set
   `SF_REDIRECT_URI` to `https://<your-render-service>.onrender.com/auth/callback` and
   `FRONTEND_URL` to your frontend's deployed URL (from the next step — you can update this
   after deploying the frontend).
4. Deploy. Note the resulting backend URL.
5. Back in Salesforce's Connected App, add that exact `/auth/callback` URL to **Callback URL**.

### Frontend → Vercel
1. On Vercel: **New Project**, import the repo, set **Root Directory** to `frontend`.
2. Framework preset: Vite. Build command `npm run build`, output directory `dist`.
3. Add env var `VITE_BACKEND_URL` = your Render backend URL.
4. Deploy. Note the resulting frontend URL, then go back to Render and set the backend's
   `FRONTEND_URL` env var to it (redeploy the backend so CORS/session redirect matches).

### Cookie note
The backend uses a session cookie to hold the Salesforce token. Since frontend and backend are
on different domains, the cookie is set with `sameSite: 'lax'` and `secure` in production —
both Render and Vercel serve over HTTPS, so this works as-is once both env vars point at the
right HTTPS URLs.

## 4. Push to GitHub

```bash
cd cloudvandana-sf-crud
git init
git add .
git commit -m "Salesforce CRUD console for CloudVandana assignment"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

## 5. Submit

Email `careers@cloudvandana.com` with:
- The deployed frontend URL (the link a reviewer opens)
- The GitHub repo URL
- Your updated resume

---

## Project structure

```
cloudvandana-sf-crud/
├── backend/
│   ├── server.js            # Express app entry
│   ├── routes/auth.js       # OAuth 2.0 login/callback/status/logout
│   ├── routes/salesforce.js # describe + CRUD + paginated query endpoints
│   ├── lib/sfClient.js      # axios wrapper with token-refresh retry
│   └── .env.example
└── frontend/
    ├── src/App.jsx                  # top-level state + auth gate
    ├── src/components/ObjectSelector.jsx
    ├── src/components/RecordTable.jsx   # infinite-scroll table
    ├── src/components/RecordForm.jsx    # create/edit modal, field-type aware
    ├── src/api.js
    └── .env.example
```

## Notes on design choices

- **Field selection is dynamic**, not hardcoded: the backend calls Salesforce's `describe` API
  for whichever object is selected, filters to field types that render sensibly in a simple
  form (skipping compound types like `address`/`location`), and returns 5–10 of them —
  prioritizing the object's Name field and any required fields first.
- **Pagination** uses SOQL `LIMIT`/`OFFSET` (20 at a time); the frontend uses an
  `IntersectionObserver` on a sentinel element at the bottom of the table to detect scroll-end
  and request the next page.
- **Token refresh**: if a Salesforce API call comes back with an expired-session error, the
  backend automatically refreshes the access token using the stored refresh token and retries
  once, so a long-lived session doesn't force a re-login mid-use.
