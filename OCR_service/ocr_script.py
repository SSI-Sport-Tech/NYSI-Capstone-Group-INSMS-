import subprocess, sys, json, csv, shutil
from pathlib import Path

IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}

def run_cli_on_image(img_path: Path, out_root: Path) -> Path:
    # Put each image's outputs in its own folder: vis_out/<stem>/
    out_dir = out_root / img_path.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "paddleocr", "ocr",
        "-i", str(img_path),
        "--lang", "en",
        "--ocr_version", "PP-OCRv5",
        "--save_path", str(out_dir)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return out_dir

def extract_texts_from_any_json(folder: Path):
    texts = []
    for jf in sorted(folder.rglob("*.json")):  # Iterate through all JSON files
        try:
            obj = json.loads(jf.read_text(encoding="utf-8"))  # Load JSON content
        except Exception as e:
            print(f"ERROR: Failed to read JSON file {jf} - {e}")  # Debug for JSON errors
            continue

        # Check if the JSON contains the `rec_texts` field and extract it
        if isinstance(obj, dict) and "rec_texts" in obj:
            texts.extend([t for t in obj.get("rec_texts", []) if isinstance(t, str) and t.strip()])

    # De-duplicate while preserving order
    seen, uniq = set(), []
    for t in texts:
        if t not in seen:
            uniq.append(t)
            seen.add(t)

    print(f"DEBUG: Extracted texts for folder {folder} -> {uniq}")  # Debug extracted texts
    return uniq

def main():
    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("OCR_Images")
    out_csv = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("OCR_Output/ocr_results.csv")
    vis_root = Path(sys.argv[3]) if len(sys.argv) > 3 else Path("vis_out")

    if shutil.which("paddleocr") is None:
        print("ERROR: 'paddleocr' CLI not found on PATH. Try `paddleocr -h` in this terminal.")
        sys.exit(1)

    # Collect images (file or folder)
    if in_path.is_file() and in_path.suffix.lower() in IMG_EXTS:
        images = [in_path]
    else:
        images = sorted(p for p in in_path.rglob("*") if p.suffix.lower() in IMG_EXTS)

    if not images:
        print(f"No images found in: {in_path.resolve()}")
        sys.exit(0)

    out_csv.parent.mkdir(parents=True, exist_ok=True)

    with out_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["image_path", "raw_text"])  # Write header

        for img in images:
            try:
                out_dir = run_cli_on_image(img, vis_root)  # Process image
                lines = extract_texts_from_any_json(out_dir)  # Extract texts from JSON files
                print(f"DEBUG: Writing to CSV -> {img}, {lines}")  # Debug CSV writing
                w.writerow([str(img), "\n".join(lines)])  # Write image path and extracted text
            except subprocess.CalledProcessError as e:
                print(f"[ERR-CLI] {img}\n{e.stderr.decode('utf-8', errors='ignore')[:400]}")
                w.writerow([str(img), ""])  # Write empty row for errors
            except Exception as e:
                print(f"[ERR] {img}: {e}")
                w.writerow([str(img), ""])  # Write empty row for errors

    print(f"\nWrote CSV -> {out_csv.resolve()}\n(visuals & JSON per image in) {vis_root.resolve()}")

if __name__ == "__main__":
    main()