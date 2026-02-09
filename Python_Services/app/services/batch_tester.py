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
   - For any organisation that matches the below examples, use the exact name as given below: [Informed Sport, HASTA, NSFSport, Cologne List, Informed Choice,BSCG]
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


async def search_batch_testing_with_consensus(
    brand_supplement: str,
    openai_api_key: str,
    num_searches: int = 3,
    consensus_threshold: int = 3
) -> Dict:
    """
    Run multiple concurrent searches and return when consensus_threshold complete.
    
    Args:
        brand_supplement: Name of the supplement to search for
        openai_api_key: OpenAI API key
        num_searches: Total number of parallel searches to run
        consensus_threshold: Return when this many searches complete (default: 2)
        
    Returns:
        Dict with batch testing results from the first searches to complete
    """
    config = {
        "llm": {
            "api_key": openai_api_key,
            "model": "openai/gpt-4o-mini",
        },
    }

    prompt = f"""Is the supplement "{brand_supplement}" batch tested?
   Important: 
   - Only output the batch testing organisation(s) that actually appear on the page.
   - If multiple organisations are listed, output the correct one.
   - For any organisation that matches the below examples, use the exact name as given below: [Informed Sport, HASTA, NSFSport, Cologne List, Informed Choice, BSCG]
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

    async def single_search(search_id: int) -> Dict:
        """Run a single search with error handling."""
        try:
            search_graph = graphs.SearchGraph(
                prompt=prompt,
                config=config,
                schema=ProductSearchSchema
            )
            result = search_graph.run()
            print(f"✅ Search {search_id} completed: {result.get('Batch_tested')} - {result.get('Organisation')}")
            return result
        except Exception as e:
            print(f"❌ Search {search_id} failed: {e}")
            return {
                "Batch_tested": "Error",
                "Organisation": "Error",
                "Source": "NA",
                "_search_id": search_id
            }

    # Create all search tasks
    tasks = [single_search(i) for i in range(num_searches)]
    
    # Wait for the first consensus_threshold to complete
    completed_results = []
    
    for coro in asyncio.as_completed(tasks):
        result = await coro
        
        # Only count non-error results
        if result.get("Batch_tested") != "Error":
            completed_results.append(result)
            print(f"📊 Progress: {len(completed_results)}/{consensus_threshold} searches completed")
        
        # Return when we reach the threshold
        if len(completed_results) >= consensus_threshold:
            print(f"🎯 Consensus reached with {len(completed_results)} results!")
            
            # Analyze results for consensus
            return analyze_consensus(completed_results, brand_supplement)
    
    # If we get here, not enough searches succeeded
    print(f"⚠️ Only {len(completed_results)} searches succeeded (needed {consensus_threshold})")
    
    if completed_results:
        return analyze_consensus(completed_results, brand_supplement)
    else:
        return {
            "Batch_tested": "Unknown",
            "Organisation": "Unknown",
            "sources": "NA",
            "confidence": "low"
        }


def analyze_consensus(results: List[Dict], supplement: str) -> Dict:
    """
    Analyze multiple search results to determine consensus.
    
    Args:
        results: List of search results
        supplement: Supplement name for reference
        
    Returns:
        Consolidated result with confidence indicator
    """
    from collections import Counter
    sources = []
    # Count votes for each answer
    batch_tested_votes = Counter(r.get("Batch_tested") for r in results)
    org_votes = Counter(r.get("Organisation") for r in results)
    
    # Get most common answers
    most_common_tested = batch_tested_votes.most_common(1)[0]
    most_common_org = org_votes.most_common(1)[0]
    
    # Collect all valid 
    for r in results:
        if r.get("sources") and r.get("sources") != "NA" and r.get("Batch_tested")==most_common_tested[0]:
            sources.extend(r.get("sources"))
    
    # Determine confidence
    total_results = len(results)
    confidence = "high" if most_common_tested[1] == total_results else "medium"
    
    result = {
        "supplement": supplement,
        "Batch_tested": most_common_tested[0],
        "Organisation": most_common_org[0],
        "Source": sources[0] if sources else "NA",
        "sources": sources,
        "confidence": confidence,
        "votes": {
            "batch_tested": dict(batch_tested_votes),
            "organisation": dict(org_votes)
        },
        "total_searches": total_results
    }
    
    print(f"\n📋 Consensus Analysis:")
    print(f"   Batch Tested: {most_common_tested[0]} ({most_common_tested[1]}/{total_results} votes)")
    print(f"   Organisation: {most_common_org[0]} ({most_common_org[1]}/{total_results} votes)")
    print(f"   Confidence: {confidence}")
    
    return result


# supplement = "1st Phorm Optigreens 50"
# import os
# from dotenv import load_dotenv
# load_dotenv()
# openai_key = os.getenv("OPENAI_API_KEY")
# import asyncio
# if __name__ == "__main__":
#     result = asyncio.run(
#         search_batch_testing_with_consensus(
#         brand_supplement=supplement,
#         openai_api_key=openai_key,
#         num_searches=3,
#         consensus_threshold=3
#     )
#     )
#     print(f"\n🏁 Final Result: {result}")


class URLSearchSchema(BaseModel):
    """Schema for batch testing search results."""
    Batch_tested: str
    URL: str

# not reliable
async def search_batch_testing_url(
    brand_supplement: str,
    organisation: str,
    openai_api_key: str,
    max_tries: int = 2
) -> Dict:


    config = {
        "llm": {
            "api_key": openai_api_key,
            "model": "openai/gpt-4o-mini",
        },
    }


    prompt = f"""Find the url (if any) of the product page for {brand_supplement} under the organisation:{organisation}
   Important: 
   - Only return the URL if it is an official page for {organisation}
   - Do not return the URL for any other products.

   Output example for supplement tested by Informed Sport: 
   {{"Batch_tested": "Yes",
   "URL": "https://sport.wetestyoutrust.com/supplement-search/1above-jet-lag-relief"}}

   Output example 2 not batch tested by {organisation}:
   {{"Batch_tested": "No",
   "URL": "NA"}}
"""
    print(prompt)

    search_graph = graphs.SearchGraph(
        prompt=prompt,
        config=config,
        schema=URLSearchSchema
    )


    try:
        result = search_graph.run()

        if result.get("Batch_tested") == "Yes" or max_tries <= 1:
            return result

    except Exception as e:
        print(f"❌ Batch test search failed (tries left {max_tries}): {e}")

        if max_tries == 1:
            return {
                "Batch_tested": "Unknown",
                "URL": "NA",
                "sources": []
            }

    return await search_batch_testing_url(
        brand_supplement,
        organisation,
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
#         search_batch_testing_url(
#             brand_supplement="Applied Nutrition Creatine Monohydrate",
#             organisation= "Informed Sport",
#             openai_api_key=openai_key,
#             max_tries=5
#         )
#     )
#     print(result)