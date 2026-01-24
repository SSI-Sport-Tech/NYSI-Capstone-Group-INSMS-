from dotenv import load_dotenv
from scrapegraphai import graphs
from scrapegraphai.docloaders import ChromiumLoader
from pydantic import BaseModel
from typing import Union, List, Dict
import os

load_dotenv()

class ProductSearchSchema(BaseModel):
   Batch_tested: str
   Organisation: str

def batchTestSearch(BrandSupplement, openai_key, tries):
   gpt4omini = {
   "llm": {
      "api_key": openai_key,
      "model": "openai/gpt-4o-mini",
   },
    }
    
   prompt = f"""Is the supplement "{BrandSupplement}" batch tested?
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

   searchGraph4o = graphs.SearchGraph(prompt = prompt,config=gpt4omini,schema=ProductSearchSchema)
   try: 
      result_gpt4o = searchGraph4o.run()
   except Exception as e:
      print(e)
      result_gpt4o = {
            "Batch_tested": "Unknown",
            "Organisation": "Unknown",
            "sources": []
        }
   if result_gpt4o["Batch_tested"] == "Yes" or tries == 1:
      return result_gpt4o
   else:
      return batchTestSearch(BrandSupplement, openai_key, tries-1)


# load_dotenv("env.txt")
# openai_key = os.getenv("OPENAI_API_KEY")
# Informed Sport
# result = batchTestSearch("Healthspan Kick−Start Caffeine Gum", openai_key,2)
# HASTA
# result = batchTestSearch("Vital Strength 100% WPI+", openai_key,2) 
# NSFSport
# result = batchTestSearch("Nutrabolt C4 Performance Energy® Twisted Limeade", openai_key,2)
# Cologne list
# result = batchTestSearch("226ERS HIGH ENERGY GEL ORANGE BCAA", openai_key,2)
# Informed Choice
# result = batchTestSearch("Rival Nutrition Clean Powder Burn", openai_key,2)

# print(result)