"""
Run OCR in a subprocess so PaddleOCR memory is fully released after each image.
"""
import subprocess
import json
import sys
import os
import tempfile

OCR_WORKER_SCRIPT = """
import sys, json, asyncio
sys.path.insert(0, '/app')

async def run():
    from app.services.nutrition_workflow import NutritionWorkflow
    image_path = sys.argv[1]
    workflow = NutritionWorkflow(timeout=200, verbose=False)
    result = await workflow.run(image_path=image_path)
    while isinstance(result, list):
        result = result[0] if result else {}
    print(json.dumps(result or {}))

asyncio.run(run())
"""

def run_ocr_in_subprocess(image_path: str) -> dict:
    """Run OCR in a subprocess — memory is fully freed when subprocess exits."""
    # Write worker script to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(OCR_WORKER_SCRIPT)
        script_path = f.name

    try:
        result = subprocess.run(
            [sys.executable, script_path, image_path],
            capture_output=True,
            text=True,
            timeout=300,
            env=os.environ.copy()
        )
        if result.returncode != 0:
            print(f"OCR subprocess error: {result.stderr[-500:]}")
            return {}
        # Parse last line of stdout (in case of warnings before it)
        output = result.stdout.strip()
        last_line = output.split('\n')[-1] if output else '{}'
        return json.loads(last_line)
    except subprocess.TimeoutExpired:
        print("OCR subprocess timed out")
        return {}
    except Exception as e:
        print(f"OCR subprocess failed: {e}")
        return {}
    finally:
        os.unlink(script_path)