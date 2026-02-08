# Quick Start Guide – FHIR API

## What works (with a compatible FHIR backend)

### Authentication
- `POST /auth/tenant/Practitioner/login/start`
- `POST /auth/tenant/Practitioner/login/token`

### FHIR resources (search, create, read as supported by the API)
- Patient, Practitioner, Observation, Encounter, Appointment
- Questionnaire, QuestionnaireResponse, CarePlan, Condition
- ServiceRequest, DiagnosticReport, and more

---

## Build your first feature

### 1. Set API base URL

In `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=https://your-fhir-api.example.com
```

### 2. Authenticate (example with PKCE)

Use your API’s auth endpoints (paths may vary). This app uses PKCE with the practitioner login flow; see `lib/auth.ts`.

### 3. Use the token

The app’s API client (`lib/api-client.ts`) sends the Bearer token automatically. All requests use `Accept: application/fhir+json` and `Content-Type: application/fhir+json` where appropriate.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with credentials valid for your FHIR API.

---

## Project structure

- `lib/auth.ts` – PKCE authentication
- `lib/api-client.ts` – Axios client with token
- `lib/services/` – FHIR resource services (patients, observations, questionnaires, etc.)
- `app/` – Pages and components

---

## Tests

Run the API test suite (requires a valid token and base URL configured for your API):

```bash
export API_ACCESS_TOKEN=your_token_here
export API_BASE_URL=https://your-fhir-api.example.com
node tests/api-test-suite.js
```

See `TESTING_INSTRUCTIONS.md` for details.
