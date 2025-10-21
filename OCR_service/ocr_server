from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from pathlib import Path
import subprocess, tempfile, json
import sys

app = FastAPI()

@app.post("/ocr")
async def run_ocr(file: UploadFile = File(...)):
    tmp_dir = Path(tempfile.mkdtemp())
    img_path = tmp_dir / file.filename

    with open(img_path, "wb") as f:
        f.write(await file.read())

    # Run PaddleOCR CLI
    out_dir = tmp_dir / "out"
    out_dir.mkdir(exist_ok=True)
    cmd = [
        sys.executable, "-m", "paddleocr", "ocr",
        "-i", str(img_path),
        "--lang", "en",
        "--ocr_version", "PP-OCRv5",
        "--save_path", str(out_dir)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Read results
    json_file = next(out_dir.rglob("*.json"), None)
    if not json_file:
        return JSONResponse({"error": "No OCR output found"}, status_code=500)

    data = json.loads(json_file.read_text(encoding="utf-8"))
    texts = data.get("rec_texts", [])
    return {"text": texts}
