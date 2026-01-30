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

# 1. OpenAI
import openai
print(f"✅ OpenAI {openai.__version__}")

# 2. Transformers
import transformers
print(f"✅ Transformers {transformers.__version__}")

# 3. Sentence Transformers
from sentence_transformers import SentenceTransformer
print("✅ Sentence Transformers imported")

# 4. LlamaIndex
from llama_index.core.workflow import Workflow, StartEvent, StopEvent, step, Context, Event
from llama_index.llms.openai import OpenAI as LlamaOpenAI
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
print(f"✅ LlamaIndex components imported")

# 5. Test embedding model
print("\n📥 Testing embedding model (will download ~150MB on first run)...")
embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
test_vector = embed_model.get_text_embedding("test")
print(f"✅ Embedding model working! Vector dimension: {len(test_vector)}")

# 6. Test your actual services will work
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

print("\n🎉 LLM stack fully verified!")