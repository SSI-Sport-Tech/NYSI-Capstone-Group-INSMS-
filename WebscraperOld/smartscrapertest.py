import requests
from bs4 import BeautifulSoup
import csv
import time
import pandas as pd
import requests
import numpy as np
import sys, os
from openai import OpenAI
from dotenv import load_dotenv
from scrapegraphai import graphs
import json
import nest_asyncio
import asyncio
# nest_asyncio.apply()
# if sys.platform.startswith("win"):
#     asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


product_list_prompt = """
List me all the product information links on this page to pass to python requests.
Include products that are revealed by scrolling down 
Each link must be a full absolute URL (including the https:// prefix and domain name), not a relative path.
Do not include any links that are not for specific products.
Do not include links for non-nutritional products like clothing or accessories
Format as a list of links, not a string
Also indicate whether there is a next page after the current page with more products
Example output if there is a next page:
[
  {
    "URLs": [
      "https://example.com/products/product-a",
      "https://example.com/products/product-b",
      "https://example.com/products/product-c",
      "https://example.com/products/product-d",
      "https://example.com/products/product-e",
      "https://example.com/products/product-f"
    ],
    "Has next page": "Yes"
  }
]

Example output if it is not paginated or this is the final page
[
  {
    "URLs": [
      "https://example.com/products/product-a",
      "https://example.com/products/product-b",
      "https://example.com/products/product-c",
      "https://example.com/products/product-d",
      "https://example.com/products/product-e",
      "https://example.com/products/product-f"
    ],
    "Has next page": "No"
  }
]
"""
openai_key = "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"
load_dotenv()


gpt4oselenium = {
  "llm": {
      "api_key": openai_key,
      "model": "openai/gpt-4o",
   },
  "pipeline": {
    "nodes": [
      {
        "type": "fetch",
        "method": "selenium",
        "url": "https://example.com/dynamic-page"
      },
      {
        "type": "extract",
        "pattern": "//span[@class='dynamic-content']/text()"
      }
    ]
  }
}

gpt4o = {
   "llm": {
      "api_key": openai_key,
      "model": "openai/gpt-4o",
   },
}

smart_scraper_graph_gpt4o = graphs.SmartScraperGraph(
   prompt=product_list_prompt,
   # also accepts a string with the already downloaded HTML code
   source="https://www.etixxsports.com/nl-be/collections/all",
   config=gpt4o
)

result_gpt4o = smart_scraper_graph_gpt4o.run()