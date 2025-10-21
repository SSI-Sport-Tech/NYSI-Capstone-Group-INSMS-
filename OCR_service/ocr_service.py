# ocr_service.py
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import tempfile
from pathlib import Path

app = FastAPI(title="PaddleOCR Service")

# Allow your frontend/backend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change to your frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize OCR model (done once)
ocr = PaddleOCR(use_angle_cls=True, lang="en")

@app.post("/ocr")
async def ocr_upload(file: UploadFile = File(...)):
    suffix = Path(file.filename).suffix or ".jpg"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    result = ocr.ocr(tmp_path, cls=True)
    texts = [line[1][0] for line in result[0]]

    return JSONResponse({"filename": file.filename, "texts": texts})
