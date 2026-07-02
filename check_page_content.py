import time
import re
from app.services.certification_searcher import _driver_pool, hasta_wait, nsf_sport_wait
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys

# ── HASTA ──────────────────────────────────────────────────────────────────
print("=" * 60)
print("TESTING HASTA")
print("=" * 60)

driver = _driver_pool.acquire()
try:
    driver.get('https://hasta.org.au/certified')
    time.sleep(3)
    wait = WebDriverWait(driver, 10)
    search_input = hasta_wait(driver, wait)
    search_input.clear()
    search_input.send_keys('Optimum Nutrition')
    search_input.send_keys(Keys.ENTER)
    time.sleep(4)

    source = driver.page_source

    # Product links
    product_links = re.findall(r'href="(https://hasta\.org\.au/certified/[^"]+)"', source)
    unique_links = list(dict.fromkeys(product_links))
    print(f"Product links found: {len(unique_links)}")
    for link in unique_links[:10]:
        print(f"  {link}")

    # Product titles
    titles = re.findall(r'class="[^"]*woocommerce-loop-product__title[^"]*">([^<]+)<', source)
    print(f"Product titles: {titles[:10]}")

    # Check for no results
    print(f"Has 'no products': {'no products' in source.lower()}")
    print(f"Has 'no results': {'no results' in source.lower()}")
    print(f"Contains Optimum Nutrition: {'Optimum Nutrition' in source}")

finally:
    _driver_pool.release(driver)


# ── NSF SPORT ──────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("TESTING NSF SPORT")
print("=" * 60)

driver = _driver_pool.acquire()
try:
    driver.get('https://www.nsfsport.com/certified-products/')
    time.sleep(3)
    wait = WebDriverWait(driver, 10)
    search_input = nsf_sport_wait(driver, wait)
    search_input.clear()
    search_input.send_keys('Optimum Nutrition')
    search_input.send_keys(Keys.ENTER)
    time.sleep(3)

    source = driver.page_source

    # Product links
    product_links = re.findall(r'href="(/certified-products/[^"]+)"', source)
    unique_links = list(dict.fromkeys(product_links))
    print(f"Product links: {len(unique_links)}")
    for link in unique_links[:10]:
        print(f"  {link}")

    # Gold Standard specifically
    print(f"Contains Gold Standard: {'Gold Standard' in source}")
    idx = source.find('Gold Standard')
    if idx > 0:
        print(f"Context: {source[max(0,idx-100):idx+200]}")

    # Result count
    count_match = re.search(r'(\d+)\s*(results|products)', source, re.IGNORECASE)
    if count_match:
        print(f"Result count mention: {count_match.group(0)}")

    # No results check
    print(f"Has 'no results': {'no results' in source.lower()}")

finally:
    _driver_pool.release(driver)

print()
print("Done.")