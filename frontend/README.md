# NYSI Frontend

Next.js 15 frontend application for the NYSI Integrated Nutrition Supplement Management System.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend Express server running on port 8000
- OCR FastAPI service running on port 8001

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will run on [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles + Tailwind
│   ├── page.tsx            # Landing page
│   ├── search/
│   │   └── page.tsx        # Supplement search page
│   └── ocr/
│       └── page.tsx        # OCR processing page
├── public/
│   └── ocr_images/         # Sample OCR images
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

## Features

### 1. Landing Page (`/`)
- Navigation to Search and OCR features
- Clean, modern UI with Tailwind CSS

### 2. Supplement Search (`/search`)
- Search by supplement name or ingredients
- Filter by scope (all, name, ingredients)
- Real-time search results with pagination support
- Responsive card-based result display

### 3. OCR Processing (`/ocr`)
- Upload custom images or select sample images
- Real-time image preview
- AI-powered text extraction using PaddleOCR
- Display extracted text results

## API Integration

The frontend communicates with the Express backend via API calls. Next.js rewrites `/api/*` requests to `http://localhost:8000/api/*` (configured in `next.config.ts`).

### API Endpoints Used

- `GET /api/SSS/search?q=<query>&scope=<scope>` - Search supplements
- `POST /api/ocr/upload` - Upload and process OCR images

## Environment Configuration

No environment variables required for local development. The API backend URL is configured in `next.config.ts`.

For production, update the `next.config.ts` rewrites to point to your production backend URL.

## Styling

This project uses Tailwind CSS for styling. Custom theme configuration can be found in `tailwind.config.ts`.

Global styles are defined in `app/globals.css`.

## TypeScript

All components are written in TypeScript with strict mode enabled. Type definitions for API responses are included inline in component files.

## Development Notes

- All pages use the "use client" directive as they contain interactive elements with React hooks
- Forms support both button clicks and Enter key submission
- Error handling is implemented for all API calls
- Loading states are shown during async operations
