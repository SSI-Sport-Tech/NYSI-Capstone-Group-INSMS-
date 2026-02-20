# OCR API Route Handlers

## Problem Solved

This implementation fixes the ECONNRESET issue where OCR processing took longer than the Next.js rewrite proxy timeout, causing connections to drop even when the Express backend completed successfully.

## Solution

Created dedicated Next.js API Route Handlers for OCR endpoints (`/api/ocr/*`) that:

1. **Take priority over rewrites** - API routes are resolved before rewrite rules
2. **Provide proper timeout control** - Configurable timeouts up to 5+ minutes
3. **Handle long-running operations** - Built specifically for OCR processing times
4. **Maintain error handling** - Proper error responses and logging

## File Structure

```
frontend/app/api/ocr/
├── utils.ts           # Shared utility functions
├── analyze/
│   └── route.ts      # /api/ocr/analyze endpoint
├── extract/
│   └── route.ts      # /api/ocr/extract endpoint
└── upload/
    └── route.ts      # /api/ocr/upload endpoint
```

## Configuration

Environment variables in `.env.local`:

```env
# Backend service URL
BACKEND_URL=http://localhost:8000

# OCR processing timeout in milliseconds (5 minutes)
OCR_TIMEOUT=300000

# For slower systems, increase to 10 minutes:
# OCR_TIMEOUT=600000
```

## How It Works

1. **Request Flow**: Frontend → Next.js API Route → Express Backend → Python OCR Service
2. **Timeout Control**: Each route uses `AbortController` with configurable timeout
3. **Priority**: API routes take precedence over the general `/api/:path*` rewrite
4. **Error Handling**: Specific error responses for timeouts, connection issues, and backend errors

## Benefits

- ✅ **Eliminates ECONNRESET errors** during long OCR processing
- ✅ **Configurable timeouts** for different system capabilities
- ✅ **Better error messages** with specific timeout and connection error handling
- ✅ **Maintains existing functionality** - all other `/api/*` routes still work via rewrite
- ✅ **Easy to extend** - shared utility function for adding more OCR endpoints

## Testing

### 1. Start all services:

```bash
# Terminal 1: Express Backend
cd Backend
npm run dev

# Terminal 2: Python Services
cd Python_Services
source venv/bin/activate
python -m app.main

# Terminal 3: Next.js Frontend
cd frontend
npm run dev
```

### 2. Test the endpoints:

```bash
# Test analyze endpoint (most complex - includes similarity matching)
curl -X POST http://localhost:3000/api/ocr/analyze \
  -F "file=@demo.jpg" \
  -s | jq '.success'

# Test upload endpoint (basic OCR)
curl -X POST http://localhost:3000/api/ocr/upload \
  -F "file=@demo.jpg" \
  -s | jq '.text'

# Test extract endpoint (dual image processing)
curl -X POST http://localhost:3000/api/ocr/extract \
  -F "brand_image=@demo.jpg" \
  -F "batch_image=@demo.jpg" \
  -s | jq '.success'
```

### 3. Test timeout handling:

The routes will now handle long processing times gracefully without ECONNRESET errors. If processing exceeds the configured timeout, you'll get a proper 504 timeout response instead of a connection reset.

## Frontend Usage

No changes needed in existing frontend code! The API endpoints remain the same:

- `/api/ocr/analyze` - Used by SSS components
- `/api/ocr/extract` - Used by SSS components
- `/api/ocr/upload` - Used by main OCR page

The improved timeout handling happens transparently.

## Debugging

Check the Next.js server logs for detailed error messages:

```bash
# In the frontend terminal, you'll see:
Proxying OCR request to: http://localhost:8000/api/ocr/analyze?page=1&per_page=10
```

Any errors will be logged with specific context about which OCR endpoint failed and why.
