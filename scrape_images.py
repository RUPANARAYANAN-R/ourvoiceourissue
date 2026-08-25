import urllib.request
import urllib.parse
import json
import os
import time

queries = [
    "pothole road",
    "stagnant water road",
    "sewage water leak",
    "broken electrical wire",
    "garbage dump street"
]

out_dir = "test_images"
os.makedirs(out_dir, exist_ok=True)

for query in queries:
    print(f"Searching for: {query}")
    url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch={urllib.parse.quote(query)}&gsrlimit=1&prop=imageinfo&iiprop=url"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            pages = data.get("query", {}).get("pages", {})
            if pages:
                page = list(pages.values())[0]
                image_url = page.get("imageinfo", [{}])[0].get("url")
                if image_url:
                    filename = os.path.join(out_dir, query.replace(" ", "_") + ".jpg")
                    print(f"Downloading {image_url} to {filename}")
                    req_img = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(req_img) as img_res, open(filename, 'wb') as f:
                        f.write(img_res.read())
            else:
                print(f"No results for {query}")
        time.sleep(2)
    except Exception as e:
        print(f"Error for {query}: {e}")
