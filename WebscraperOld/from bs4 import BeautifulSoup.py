import requests
from bs4 import BeautifulSoup
import csv
import time

with open("example.html", "r", encoding="utf-8") as f:
    html_text = f.read()

soup = BeautifulSoup(html_text, 'html.parser')
print(soup.title)