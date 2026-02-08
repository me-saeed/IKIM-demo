# IKIM Health – Healthcare Management Demo

A **full-stack healthcare management UI** built as a side project. The frontend is a Next.js (React/TypeScript) application that consumes a **FHIR-based REST API** for clinical data—patients, practitioners, appointments, care plans, questionnaires, and more.

## What This Project Is

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS. Responsive UI for managing healthcare resources (FHIR R4).
- **Backend:** Uses an external **FHIR-compliant API** (open/standards-based). The app does not implement the backend; it integrates with any compatible FHIR API via configuration.
- **Auth:** PKCE-based practitioner login, token handling, and session management against the API’s auth endpoints.

Suitable as a **portfolio piece** to show full-stack and healthcare-interoperability experience (e.g. FHIR, clinical workflows).

## Tech Stack

- **Frontend:** Next.js, React 18, TypeScript, Tailwind CSS
- **API:** REST client (Axios) with Bearer token auth; FHIR `application/fhir+json` content type
- **Concepts:** FHIR R4 resources (Patient, Practitioner, Appointment, CarePlan, Questionnaire, etc.)

## Setup

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Configure the FHIR API**
   Create `.env.local` in the project root:
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://your-fhir-api.example.com
   ```
   Replace with the base URL of your FHIR-compliant API (e.g. `https://api.example.com` with no trailing slash).

3. **Run the app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Login**  
   Use credentials valid for your configured API (practitioner/tenant as required by the backend).

## Project Structure

- `app/` – Next.js App Router pages (dashboard, patients, appointments, care plans, questionnaires, etc.)
- `lib/` – API client, auth (PKCE), and service layer for FHIR resources
- `app/components/` – Layout, API explorer, shared UI

## Scripts

- `npm run dev` – Development server
- `npm run build` – Production build
- `npm run start` – Run production build
- `npm run lint` – ESLint

## Notes

- Tokens are stored in `localStorage` (practitioner access/refresh).
- The app assumes a FHIR R4–compatible API with practitioner login and standard resource paths; adapt `.env.local` and auth details to your API provider.
