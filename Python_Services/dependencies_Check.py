# test_core.py
print("Testing core packages...")

# 1. NumPy
import numpy as np
print(f"✅ NumPy {np.__version__}")

# 2. PyTorch
import torch
print(f"✅ PyTorch {torch.__version__}")
print(f"   CUDA available: {torch.cuda.is_available()}")

# 3. PaddlePaddle
import paddle
print(f"✅ PaddlePaddle {paddle.__version__}")

# 4. PaddleOCR (this will download models on first run - ~400MB)
from paddleocr import PaddleOCR
print("✅ PaddleOCR imported successfully")
print("   (Models will download on first use)")

# 5. OpenCV
import cv2
print(f"✅ OpenCV {cv2.__version__}")

# 6. PIL
from PIL import Image
print(f"✅ Pillow (PIL) {Image.__version__}")

# test_fastapi.py
from fastapi import FastAPI
from pydantic import BaseModel
print("✅ FastAPI stack installed!")

import psycopg
print("✅ psycopg3 installed!")



print("\n🎉 Core stack verified!")


# test_llm.py
print("Testing LLM stack...")

# 1. Transformers
import transformers
print(f"✅ Transformers {transformers.__version__}")

# 2. Sentence Transformers
from sentence_transformers import SentenceTransformer
print("✅ Sentence Transformers imported")

# 3. LlamaIndex (Ollama binding — matches what llm_structurer.py actually uses)
from llama_index.core.workflow import Workflow, StartEvent, StopEvent, step, Context, Event
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
print(f"✅ LlamaIndex components imported (Ollama binding)")

# 4. Test embedding model
print("\n📥 Testing embedding model (will download ~150MB on first run)...")
embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
test_vector = embed_model.get_text_embedding("test")
print(f"✅ Embedding model working! Vector dimension: {len(test_vector)}")

# 5. Test Ollama is actually reachable and the model is pulled
print("\n🦙 Testing Ollama connectivity...")
import requests

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen3:8b"

try:
    resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
    resp.raise_for_status()
    available_models = [m["name"] for m in resp.json().get("models", [])]

    if any(OLLAMA_MODEL in m for m in available_models):
        print(f"✅ Ollama reachable at {OLLAMA_BASE_URL}, {OLLAMA_MODEL} is pulled")
    else:
        print(f"⚠️  Ollama reachable, but {OLLAMA_MODEL} not found in: {available_models}")
        print(f"   Run: ollama pull {OLLAMA_MODEL}")
except requests.exceptions.ConnectionError:
    print(f"❌ Cannot reach Ollama at {OLLAMA_BASE_URL} — is `ollama serve` running?")
except Exception as e:
    print(f"❌ Ollama check failed: {e}")

# 6. Test an actual generation call through the same path llm_structurer.py uses
print("\n🧠 Testing live Ollama completion via LlamaIndex...")
try:
    llm = Ollama(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0)
    response = llm.complete("Reply with exactly: OK")
    print(f"✅ Ollama completion works: {response.text.strip()[:50]}")
except Exception as e:
    print(f"❌ Ollama completion failed: {e}")

# 7. Test your actual services will work
print("\n🔍 Testing service compatibility...")
try:
    from app.services.vectorizer import SupplementVectorizer
    print("✅ SupplementVectorizer can be imported")
except ImportError as e:
    print(f"⚠️  SupplementVectorizer import issue: {e}")

try:
    from app.services.nutrition_workflow import NutritionWorkflow
    print("✅ NutritionWorkflow can be imported")
except ImportError as e:
    print(f"⚠️  NutritionWorkflow import issue: {e}")

try:
    from app.services.llm_structurer import get_llm_instance
    get_llm_instance()
    print("✅ llm_structurer.get_llm_instance() initializes successfully")
except Exception as e:
    print(f"⚠️  llm_structurer import/init issue: {e}")

print("\n🎉 LLM stack fully verified!")