import requests
from etl.utils.db import save_geo_to_cache

def get_coords_from_address(address, cache):
    if address in cache: return cache[address]
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": f"{address}, Porto Alegre, RS, Brazil", "format": "json", "limit": 1}
    headers = {"User-Agent": "POA-Transparente-V2/1.1"}
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data:
                lat, lng = float(data[0]["lat"]), float(data[0]["lon"])
                save_geo_to_cache(address, lat, lng)
                return lat, lng
    except: pass
    return None
