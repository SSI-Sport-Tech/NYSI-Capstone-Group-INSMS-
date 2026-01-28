"""
Batch testing certification search service.
Searches web for batch testing certifications (Informed Sport, NSF, etc.)
"""

# import nest_asyncio  
# nest_asyncio.apply()  

from typing import Dict, List
from pydantic import BaseModel
from scrapegraphai import graphs
import asyncio
# import sys
# if 'win32' in sys.platform:
#     # Windows specific event-loop policy & cmd
#     asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


class ProductSearchSchema(BaseModel):
    """Schema for batch testing search results."""
    Batch_tested: str
    Organisation: str


async def search_batch_testing(
    brand_supplement: str,
    openai_api_key: str,
    max_tries: int = 2
) -> Dict:


    config = {
        "llm": {
            "api_key": openai_api_key,
            "model": "openai/gpt-4o-mini",
        },
    }


    prompt = f"""Is the supplement "{brand_supplement}" batch tested?
   Important: 
   - Only output the batch testing organisation(s) that actually appear on the page.
   - If multiple organisations are listed, output the correct one(s).
   - For any organisation that matches the below examples, use the exact name as given below: [Informed Sport, HASTA, NSFSport, Cologne List, Informed Choice]
   - Do not default to Informed Sport.

   Output example for supplement tested by Informed Sport: 
   {{"Batch_tested": "Yes",
   "Organisation": "Informed Sport",
   "Source": "https://sport.wetestyoutrust.com/supplement-search/1above-jet-lag-relief"}}

   Output example 2 not batch tested by any organisation:
   {{"Batch_tested": "No",
   "Organisation": "NA",
   "Source":"NA"}}
"""


    search_graph = graphs.SearchGraph(
        prompt=prompt,
        config=config,
        schema=ProductSearchSchema
    )


    try:
        result = search_graph.run()

        if result.get("Batch_tested") == "Yes" or max_tries == 1:
            return result

    except Exception as e:
        print(f"❌ Batch test search failed (tries left {max_tries}): {e}")

        if max_tries == 1:
            return {
                "Batch_tested": "Unknown",
                "Organisation": "Unknown",
                "sources": []
            }

    return await search_batch_testing(
        brand_supplement,
        openai_api_key,
        max_tries - 1
    )
    

# import os
# from dotenv import load_dotenv
# load_dotenv()
# openai_key = os.getenv("OPENAI_API_KEY")
# import asyncio
# if __name__ == "__main__":
#     result = asyncio.run(
#         search_batch_testing(
#             brand_supplement="Applied Nutrition Creatine Monohydrate",
#             openai_api_key=openai_key
#         )
#     )
#     print(result)