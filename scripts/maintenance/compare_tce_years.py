from etl.ingestion.tce import get_works

def compare_years():
    w26 = get_works(2026)
    w25 = get_works(2025)
    
    ids26 = set(w['idObra'] for w in w26)
    ids25 = set(w['idObra'] for w in w25)
    
    intersection = ids26.intersection(ids25)
    print(f"Works in 2026: {len(ids26)}")
    print(f"Works in 2025: {len(ids25)}")
    print(f"Intersection: {len(intersection)}")
    
    if len(ids26) > 0:
        print(f"Sample ID 2026: {list(ids26)[0]}")
    if len(ids25) > 0:
        print(f"Sample ID 2025: {list(ids25)[0]}")

if __name__ == '__main__':
    compare_years()
