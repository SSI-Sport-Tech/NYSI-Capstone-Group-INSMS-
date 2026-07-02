import asyncio
import logging
logging.basicConfig(level=logging.INFO)

from app.services.certification_searcher import search_all_certifications

result = asyncio.run(search_all_certifications(
    brand="Optimum Nutrition",
    product_name="Gold Standard Whey"
))
print(result)