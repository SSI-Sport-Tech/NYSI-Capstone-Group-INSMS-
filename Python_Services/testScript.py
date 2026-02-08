# test_batch_tester.py
import asyncio
import os
from dotenv import load_dotenv
from app.services.batch_tester import search_batch_testing

load_dotenv()

async def test():
    print("Testing batch_tester with ScrapegraphAI 1.62.0...")
    
    try:
        result = await search_batch_testing(
            brand_supplement="Applied Nutrition Creatine Monohydrate",
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            max_tries=1
        )
        
        print(f"✅ Batch tester working!")
        print(f"   Result: {result}")
        
    except Exception as e:
        print(f"❌ Batch tester failed: {e}")
        print(f"   Error type: {type(e).__name__}")

asyncio.run(test())