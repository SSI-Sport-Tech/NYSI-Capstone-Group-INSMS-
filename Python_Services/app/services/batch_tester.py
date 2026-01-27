"""
Batch testing certification search service.
Searches web for batch testing certifications (Informed Sport, NSF, etc.)
"""

from typing import Dict, List
from pydantic import BaseModel
from scrapegraphai import graphs


class ProductSearchSchema(BaseModel):
    """Schema for batch testing search results."""
    Batch_tested: str
    Organisation: str


async def search_batch_testing(
    brand_supplement: str,
    openai_api_key: str,
    max_tries: int = 2
) -> Dict:
    """
    Search for batch testing certification for a supplement.
    
    Args:
        brand_supplement: Combined brand + supplement name
        openai_api_key: OpenAI API key
        max_tries: Maximum search attempts
        
    Returns:
        dict: {
            "Batch_tested": "Yes"|"No"|"Unknown",
            "Organisation": "Informed Sport"|"NSF"|etc,
            "sources": [list of URLs]
        }
    """
    config = {
        "llm": {
            "api_key": openai_api_key,
            "model": "openai/gpt-4o-mini",
        },
    }
    
    prompt = f"""Is the supplement "{brand_supplement}" batch tested?

IMPORTANT:
- Only output batch testing organisation(s) that actually appear on the page
- If multiple organisations listed, output the correct one(s)
- Use exact names from: [Informed Sport, HASTA, NSF Sport, Cologne List, Informed Choice]
- Do NOT default to Informed Sport

OUTPUT EXAMPLES:

Tested by Informed Sport:
{{
  "Batch_tested": "Yes",
  "Organisation": "Informed Sport",
  "Source": "https://sport.wetestyoutrust.com/supplement/..."
}}

Not batch tested:
{{
  "Batch_tested": "No",
  "Organisation": "NA",
  "Source": "NA"
}}
"""
    
    search_graph = graphs.SearchGraph(
        prompt=prompt,
        config=config,
        schema=ProductSearchSchema
    )
    
    try:
        result = search_graph.run()
        
        # If found or last try, return result
        if result["Batch_tested"] == "Yes" or max_tries == 1:
            return result
        
        # Retry if not found and tries remaining
        return await search_batch_testing(
            brand_supplement, 
            openai_api_key, 
            max_tries - 1
        )
        
    except Exception as e:
        print(f"❌ Batch test search failed: {e}")
        return {
            "Batch_tested": "Unknown",
            "Organisation": "Unknown",
            "sources": []
        }