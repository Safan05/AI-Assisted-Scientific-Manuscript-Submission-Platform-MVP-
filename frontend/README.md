# Swiss2 Scientific Manuscript Platform — Frontend Client

Modern, typography-first web application built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **TanStack React Query**.

---

## 🎨 Design System & Aesthetic

Inspired by Anthropic interface aesthetics and Swiss typographic precision:
- **Palette**: Warm ivory background (`#faf9f5`), rich deep ink (`#141413`), muted borders (`#e6e4dc`), subtle secondary fills (`#f5f3ec`).
- **Typography**: Inter for clear UI readability, paired with JetBrains Mono for word counts, citation indices, and scientific identifiers.
- **Accents**: Subtle dot-matrix grids, crosshair section markers (`scientific-box`), and compact collapsible drawer navigation.

---

## 🧭 Manuscript Submission Workflow

The frontend guides the researcher through a strict 5-stage submission pipeline:

1. **Dashboard & Projects (`/dashboard`, `/projects`)**: Create research projects and upload original `.docx` manuscripts.
2. **Parsing & Metadata Editor (`/manuscripts/[mid]/editor`)**: Interactive tree view for reviewing/editing sections, authors, affiliations, abstracts, references, and mandatory statements.
3. **Journal Selection (`/manuscripts/[mid]/journal`)**: Select from seeded journal templates (Nature, PLOS ONE, IEEE, MIA, Radiology, MIDL) with live requirement previews.
4. **Pre-flight Compliance (`/manuscripts/[mid]/preflight`)**: Automated checklist checking word limits, required disclosures, and formatting constraints. Supports warning overrides and human confirmation.
5. **Document Generation & Export (`/manuscripts/[mid]/export`)**: Trigger backend `.docx` generation, track compile status, and download the journal-ready Word package.

---

## ⚙️ Environment Configuration

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Directory Structure

```text
frontend/src/
├── app/
│   ├── (auth)/               # Login & Register views
│   ├── (dashboard)/          # Authenticated application shell
│   │   ├── dashboard/        # Overview dashboard
│   │   ├── projects/         # Project & Manuscript pages
│   │   │   └── [id]/manuscripts/[mid]/
│   │   │       ├── editor/   # Metadata & Section tree editor
│   │   │       ├── journal/  # Journal selection catalog
│   │   │       ├── preflight/# Compliance checklist & sign-off
│   │   │       └── export/   # Document generation & download
│   │   └── layout.tsx        # Navigation sidebar & header layout
│   ├── layout.tsx
│   └── page.tsx
├── components/               # Reusable UI cards, banners & dialogs
├── hooks/                    # TanStack Query custom hooks
│   ├── use-auth.tsx
│   ├── use-manuscripts.ts
│   ├── use-journals.ts
│   ├── use-preflight.ts
│   └── use-export.ts
└── lib/                      # Axios API client, types & utilities
```
