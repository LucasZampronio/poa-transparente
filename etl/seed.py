import os
import random
import time
from datetime import date, timedelta

import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://poa:poa@localhost:5432/poa_transparente")

AGENCIES = [
    "SMED",
    "SMS",
    "SMOI",
    "DMAE",
    "EPTC",
]

CATEGORIES = [
    "Saúde",
    "Educação",
    "Infraestrutura",
    "Mobilidade",
    "Assistência Social",
]

COMPANIES = [
    "Construtora Sul",
    "Porto Verde Serviços",
    "Mapa Urbano Tech",
    "Hospitalar RS",
    "Leste Logística",
    "Dados Abertos Brasil",
]

POINTS = [
    ("Centro Histórico", -30.0277, -51.2287),
    ("Restinga", -30.1401, -51.1353),
    ("Mário Quintana", -30.0337, -51.0802),
    ("Partenon", -30.0550, -51.1801),
    ("Sarandi", -29.9970, -51.1182),
    ("Cristal", -30.0822, -51.2354),
]


def wait_for_db() -> None:
    for _ in range(30):
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                conn.cursor().execute("SELECT 1")
            return
        except psycopg2.OperationalError:
            time.sleep(2)
    raise RuntimeError("Database not available")


def build_rows() -> list[tuple]:
    rows = []
    today = date.today().replace(day=1)

    for month_offset in range(12):
        ref = today - timedelta(days=30 * month_offset)
        for _ in range(35):
            district, lat, lng = random.choice(POINTS)
            rows.append(
                (
                    ref,
                    random.choice(AGENCIES),
                    random.choice(COMPANIES),
                    random.choice(CATEGORIES),
                    district,
                    round(lat + random.uniform(-0.01, 0.01), 6),
                    round(lng + random.uniform(-0.01, 0.01), 6),
                    round(random.uniform(20000, 950000), 2),
                    random.randint(1, 8),
                )
            )
    return rows


def seed() -> None:
    wait_for_db()

    with psycopg2.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE public_expenses RESTART IDENTITY")
            cur.executemany(
                """
                INSERT INTO public_expenses (
                    reference_date,
                    agency,
                    company_name,
                    category,
                    district,
                    latitude,
                    longitude,
                    contract_value,
                    bidding_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                build_rows(),
            )
        conn.commit()

    print("Seed finalizado com sucesso")


if __name__ == "__main__":
    seed()
