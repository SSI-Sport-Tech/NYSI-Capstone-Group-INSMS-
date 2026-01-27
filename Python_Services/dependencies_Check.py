import sys

print("="*60)
print("NYSI Python Services - Dependency Verification")
print("="*60)

passed = []
failed = []

# 1. NumPy version
print("\n[1/12] NumPy version...")
try:
    import numpy as np
    if np.__version__.startswith('1.'):
        print(f"    ✅ NumPy {np.__version__} (correct: <2.0)")
        passed.append("NumPy")
    else:
        print(f"    ❌ NumPy {np.__version__} (wrong: need <2.0)")
        failed.append("NumPy")
except Exception as e:
    print(f"    ❌ {e}")
    failed.append("NumPy")

# 2. Selenium
print("\n[2/12] Selenium...")
try:
    import selenium
    print(f"    ✅ Selenium {selenium.__version__}")
    passed.append("Selenium")
except Exception as e:
    print(f"    ❌ {e}")
    failed.append("Selenium")

# 3. ScrapeGraphAI
print("\n[3/12] ScrapeGraphAI...")
try:
    import scrapegraphai
    from scrapegraphai.graphs import SmartScraperGraph
    print(f"    ✅ ScrapeGraphAI {scrapegraphai.__version__}")
    passed.append("ScrapeGraphAI")
except Exception as e:
    print(f"    ❌ {e}")
    failed.append("ScrapeGraphAI")

# 4. psycopg (CRITICAL)
print("\n[4/12] psycopg (Database)...")
try:
    import psycopg
    print(f"    ✅ psycopg {psycopg.__version__}")
    passed.append("psycopg")
except Exception as e:
    print(f"    ❌ MISSING! Install with: pip install psycopg[binary]==3.3.2")
    failed.append("psycopg")

# 5. PaddleOCR
print("\n[5/12] PaddleOCR...")
try:
    import paddleocr
    print(f"    ✅ PaddleOCR OK")
    passed.append("PaddleOCR")
except Exception as e:
    print(f"    ❌ {e}")
    failed.append("PaddleOCR")

# 6. llama-index
print("\n[6/12] llama-index...")
try:
    from llama_index.core import VectorStoreIndex
    from llama_index.embeddings.huggingface import HuggingFaceEmbedding
    print(f"    ✅ llama-index OK")
    passed.append("llama-index")
except Exception as e:
    print(f"    ❌ {e}")
    failed.append("llama-index")

# 7. OpenAI
print("\n[7/12] OpenAI...")
try:
    import openai
    print(f"    ✅ OpenAI {openai.__version__}")
    passed.append("OpenAI")
except Exception as e:
    print(f"    ❌ {e}")
    failed.append("OpenAI")

# 8. sentence-transformers
print("\n[8/12] sentence-transformers...")
try:
    import sentence_transformers
    print(f"    ✅ sentence-transformers {sentence_transformers.__version__}")
    passed.append("sentence-transformers")
except Exception as e:
    print(f"    ❌ {e}")
    failed.append("sentence-transformers")

# 9. FastAPI
print("\n[9/12] FastAPI...")
try:
    import fastapi
    print(f"    ✅ FastAPI {fastapi.__version__}")
    passed.append("FastAPI")
except Exception as e:
    print(f"    ❌ {e}")
    failed.append("FastAPI")

# 10. Pydantic
print("\n[10/12] Pydantic...")
try:
    import pydantic
    print(f"    ✅ Pydantic {pydantic.__version__}")
    passed.append("Pydantic")
except Exception as e:
    print(f"    ❌ {e}")
    failed.append("Pydantic")

# 11. Settings
print("\n[11/12] App Settings...")
try:
    from app.config.settings import settings
    print(f"    ✅ Settings loaded")
    print(f"       - Port: {settings.service_port}")
    print(f"       - OpenAI Key: {'✅ SET' if settings.openai_api_key else '❌ MISSING'}")
    passed.append("Settings")
except Exception as e:
    print(f"    ❌ {e}")
    failed.append("Settings")

# 12. Check for langchain-aws (should NOT exist)
print("\n[12/12] Check langchain-aws (should be absent)...")
try:
    import langchain_aws
    print(f"    ⚠️ langchain-aws found (should be removed)")
    print(f"       Run: pip uninstall langchain-aws -y")
    failed.append("langchain-aws check")
except ImportError:
    print(f"    ✅ langchain-aws not installed (correct)")
    passed.append("langchain-aws check")

# Summary
print("\n" + "="*60)
print(f"RESULTS: {len(passed)} passed, {len(failed)} failed")
print("="*60)

if failed:
    print("\n❌ FAILED CHECKS:")
    for item in failed:
        print(f"   - {item}")
    print("\nFIX REQUIRED before starting service!")
    sys.exit(1)
else:
    print("\n✅ ALL CHECKS PASSED!")
    print("Ready to start service: uvicorn app.main:app --reload --port 8001")
    sys.exit(0)