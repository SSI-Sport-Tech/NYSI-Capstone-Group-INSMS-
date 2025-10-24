import os
from dotenv import load_dotenv
from scrapegraphai.graphs import SmartScraperGraph
from scrapegraphai.utils import prettify_exec_info

load_dotenv()

openai_key = "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"

graph_config = {
   "llm": {
      "api_key": openai_key,
      "model": "openai/gpt-4o",
   },
}

# ************************************************
# Create the SmartScraperGraph instance and run it
# ************************************************

smart_scraper_graph = SmartScraperGraph(
   prompt="List me all the projects with their description.",
   # also accepts a string with the already downloaded HTML code
   source="https://perinim.github.io/projects/",
   config=graph_config
)

result = smart_scraper_graph.run()
print(result)