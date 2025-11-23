from dotenv import load_dotenv
from scrapegraphai import graphs
from scrapegraphai.docloaders import ChromiumLoader

openai_key = "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"
load_dotenv()


gpt4o = {
   "llm": {
      "api_key": openai_key,
      "model": "openai/gpt-4o-mini",
   },
    "wait_until": "networkidle",   # or "load"
    "delay": 2000,                 # ms to wait before reading content
}

prompt = """Is the supplement "226ERS SPORT THINGS, S.L. HIGH ENERGY GEL PEANUT AND HONEY" batch tested? Examples of batch testing organisations are: [Informed Sport, Informed Choice, HASTA, NSFSport, Cologne List]
Output example 1: 
{"Batch tested": "Yes",
"Organisation": "Informed Sport"
"Source": https://sport.wetestyoutrust.com/supplement-search/1above-jet-lag-relief}

Output example 2:
{"Batch tested": "No",
"Organisation": "NA"}

Important: 
- Only output the batch testing organisation(s) that actually appear on the page.
- If multiple organisations are listed, output the correct one(s).
- Do not default to Informed Sport.
"""

searchGraph4o = graphs.OmniSearchGraph(prompt = prompt,config=gpt4o)
result_gpt4o = searchGraph4o.run()
print("==================================================================")
print(result_gpt4o)