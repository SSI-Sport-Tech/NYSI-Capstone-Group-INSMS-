# Python Services - Troubleshooting Guide

This document covers all the errors encountered during setup and their solutions.

---

## Table of Contents

1. [Virtual Environment Issues](#1-virtual-environment-issues)
2. [Missing Module Errors](#2-missing-module-errors)
3. [PaddleOCR & LangChain Compatibility](#3-paddleocr--langchain-compatibility)
4. [NumPy Version Conflict](#4-numpy-version-conflict)
5. [VS Code / Pylance Warnings](#5-vs-code--pylance-warnings)


---

## 1. Virtual Environment Issues

### Problem: Wrong Python Interpreter Being Used

**Error Message:**
```
File "/Library/Frameworks/Python.framework/Versions/3.10/lib/python3.10/..."
ModuleNotFoundError: No module named 'llama_index'
```

**Cause:**
Even though the virtual environment (venv) was activated, the system Python was being used instead of the venv's Python. This happened because `uvicorn` was installed globally in the system Python.

**Solution:**
Use `python -m uvicorn` instead of just `uvicorn` to ensure the venv's Python interpreter is used:

```bash
# Instead of this:
uvicorn app.main:app --reload --port 8001

# Use this:
python -m uvicorn app.main:app --reload --port 8001
```

**Permanent Fix:**
Reinstall uvicorn in the venv:

```bash
pip install --force-reinstall uvicorn
```

**How to Verify You're Using the Right Python:**
```bash
which python
# Should show: /path/to/Python_Services/venv/bin/python

which pip
# Should show: /path/to/Python_Services/venv/bin/pip
```

---

## 2. Missing Module Errors

### 2.1 ModuleNotFoundError: No module named 'llama_index'

**Solution:**
```bash
pip install llama-index-core llama-index-llms-openai llama-index-embeddings-huggingface
```

### 2.2 ModuleNotFoundError: No module named 'selenium'

**Solution:**
```bash
pip install selenium webdriver-manager
```

### 2.3 ModuleNotFoundError: No module named 'scrapegraphai'

**Solution:**
```bash
pip install scrapegraphai
```

### 2.4 ModuleNotFoundError: No module named 'psycopg'

**Solution:**
```bash
pip install "psycopg[binary]"
```

### 2.5 ModuleNotFoundError: No module named 'langchain.docstore'

**Cause:**
The newer version of `langchain` moved the `Document` class to a different location. The `paddlex` package (dependency of `paddleocr` 3.x) uses an old import path.

**Solution:**
Downgrade to PaddleOCR 2.7.x which doesn't have this dependency:

```bash
pip uninstall paddleocr paddlex -y
pip install paddleocr==2.7.3
```

---

## 3. PaddleOCR & LangChain Compatibility

### Problem: PaddleOCR 3.x Requires LangChain with Old Import Paths

**Error Message:**
```
File ".../paddlex/inference/pipelines/components/retriever/base.py", line 25, in <module>
    from langchain.docstore.document import Document
ModuleNotFoundError: No module named 'langchain.docstore'
```

**Cause:**
PaddleOCR 3.x includes `paddlex` which depends on an older version of LangChain. The new LangChain (v1.x+) moved the `Document` class to `langchain_core.documents`.

**Solution:**
Downgrade to PaddleOCR 2.7.x:

```bash
pip uninstall paddleocr paddlex -y
pip install paddleocr==2.7.3
```

**Why This Works:**
PaddleOCR 2.7.x doesn't include the `paddlex` dependency and works independently without LangChain.

---

## 4. NumPy Version Conflict

### Problem: NumPy 2.x Incompatible with OpenCV 4.6

**Error Message:**
```
A module that was compiled using NumPy 1.x cannot be run in
NumPy 2.2.6 as it may crash. To support both 1.x and 2.x
versions of NumPy, modules must be compiled with NumPy 2.0.

AttributeError: _ARRAY_API not found
ImportError: numpy.core.multiarray failed to import
```

**Cause:**
PaddleOCR 2.7.3 requires OpenCV <= 4.6.0.66, which was compiled against NumPy 1.x. NumPy 2.x changed the internal array API, breaking compatibility.

**Solution:**
Downgrade NumPy to version 1.x:

```bash
pip install "numpy<2"
```

**Note:**
You may see a warning about `opencv-python-headless` requiring NumPy 2.x - this can be ignored as long as the application works.

---

## 5. VS Code / Pylance Warnings

### Problem: Pylance Shows "Import could not be resolved" Warnings

**Error Messages in VS Code:**
```
Import "llama_index.core.workflow" could not be resolved Pylance(reportMissingImports)
Import "psycopg.types.json" could not be resolved Pylance(reportMissingImports)
Import "scrapegraphai" could not be resolved Pylance(reportMissingImports)
```

**Cause:**
VS Code is using a different Python interpreter than your venv. The packages are installed in the venv, but VS Code/Pylance is looking at the system Python.

**Solution:**

#### Option 1: Select the Correct Interpreter in VS Code
1. Press `Cmd + Shift + P` (Mac) or `Ctrl + Shift + P` (Windows)
2. Type: `Python: Select Interpreter`
3. Choose: `Python 3.10.x ('venv': venv) ./venv/bin/python`

#### Option 2: Create VS Code Settings File

Create `.vscode/settings.json` in your project root:

```json
{
    "python.defaultInterpreterPath": "${workspaceFolder}/Python_Services/venv/bin/python",
    "python.analysis.extraPaths": [
        "${workspaceFolder}/Python_Services"
    ]
}
```

**Important:**
These are IDE warnings only - they don't prevent the code from running. The application will work fine if packages are installed in the venv.


---

## Working Package Versions

Here are the package versions that work together:

| Package | Version | Notes |
|---------|---------|-------|
| paddleocr | 2.7.3 | Avoid 3.x due to langchain issues |
| paddlepaddle | 2.6.x | Compatible with paddleocr 2.7.3 |
| numpy | <2.0 (1.26.4) | Required for OpenCV 4.6.x |
| opencv-python | <=4.6.0.66 | Required by paddleocr 2.7.3 |
| opencv-contrib-python | <=4.6.0.66 | Required by paddleocr 2.7.3 |
| llama-index-core | 0.11.x+ | Any recent version |
| llama-index-embeddings-huggingface | 0.3.x+ | Any recent version |
| llama-index-llms-openai | 0.2.x+ | Any recent version |
| langchain | 1.x+ | Any recent version |
| psycopg | 3.x | With [binary] extra |
| fastapi | 0.115.x+ | Any recent version |
| uvicorn | 0.32.x+ | Any recent version |
| pydantic | 2.x | Any 2.x version |

---

## Quick Setup Commands

If starting fresh, here's the complete setup:

```bash
# Navigate to Python_Services
cd Python_Services

# Create virtual environment
python3.10 -m venv venv

# Activate it
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install core packages
pip install fastapi uvicorn pydantic pydantic-settings python-dotenv python-multipart

# Install LlamaIndex packages
pip install llama-index-core llama-index-llms-openai llama-index-embeddings-huggingface

# Install PaddleOCR (use 2.7.3 to avoid issues)
pip install paddleocr==2.7.3 paddlepaddle

# Downgrade NumPy for OpenCV compatibility
pip install "numpy<2"

# Install other dependencies
pip install sentence-transformers torch openai httpx requests
pip install selenium webdriver-manager scrapegraphai
pip install "psycopg[binary]"
pip install beautifulsoup4 lxml

# Run the server
python -m uvicorn app.main:app --reload --port 8001
```

---

## Common Commands Reference

```bash
# Activate virtual environment
source venv/bin/activate

# Run server (always use python -m)
python -m uvicorn app.main:app --reload --port 8001

# Check installed packages
pip list | grep -E "paddle|llama|numpy|opencv"

# Check which Python is being used
which python

# Freeze requirements
pip freeze > requirements.txt
```

---

## Still Having Issues?

1. **Check Python version:** `python --version` (should be 3.10.x)
2. **Check venv is active:** `which python` (should point to venv)
3. **Reinstall problematic package:** `pip install --force-reinstall <package>`
4. **Clear pip cache:** `pip cache purge`
5. **Recreate venv:** Delete `venv/` folder and start fresh

---

*Last updated: January 27, 2026*