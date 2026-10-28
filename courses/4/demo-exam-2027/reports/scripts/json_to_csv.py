"""Convert Заказчики.json to customers.csv for phpMyAdmin.

Usage:
    python json_to_csv.py "Заказчики.json" customers.csv

The script uses only the Python standard library. It keeps the customer code as
text, so leading zeros survive, and maps the source key `addres` to the table
column `address`.
"""
import csv
import json
import sys
from pathlib import Path

source = Path(sys.argv[1] if len(sys.argv) > 1 else "Заказчики.json")
target = Path(sys.argv[2] if len(sys.argv) > 2 else "customers.csv")

rows = json.loads(source.read_text(encoding="utf-8-sig"))
if not isinstance(rows, list):
    sys.exit("Ожидался массив объектов в корне JSON")

with target.open("w", encoding="utf-8", newline="") as stream:
    writer = csv.writer(stream)
    writer.writerow(["id", "name", "inn", "address", "phone", "party_type"])
    for row in rows:
        writer.writerow([
            row.get("id", ""),
            row.get("name", ""),
            row.get("inn", ""),
            row.get("addres", row.get("address", "")),
            row.get("phone", ""),
            row.get("type", ""),
        ])

print(f"Готово: {target}, строк: {len(rows)}")
