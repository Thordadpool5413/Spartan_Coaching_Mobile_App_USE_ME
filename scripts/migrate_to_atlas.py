"""
One-time migration helper: copy data from the local development MongoDB
to a production MongoDB Atlas cluster.

Usage:
  python scripts/migrate_to_atlas.py \
      --source "mongodb://localhost:27017" \
      --target "mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
      --db spartan_coaching

Notes:
  * Runs collection-by-collection, skipping nothing.
  * Safe to run multiple times: documents are upserted by `_id` so re-running
    won't create duplicates.
  * Reads in batches of 200 documents to avoid memory spikes on free tiers.

Required:
  pip install pymongo
"""
import argparse
import sys
from pymongo import MongoClient, UpdateOne


COLLECTIONS = [
    "contacts",
    "drill_completions",
    "chat_logs",
    "eligibility_checks",
]


def migrate(source_uri: str, target_uri: str, db_name: str, batch_size: int = 200) -> int:
    src = MongoClient(source_uri)
    dst = MongoClient(target_uri)
    src_db = src[db_name]
    dst_db = dst[db_name]

    total = 0
    for coll in COLLECTIONS:
        src_coll = src_db[coll]
        dst_coll = dst_db[coll]
        n = src_coll.estimated_document_count()
        if n == 0:
            print(f"  - {coll}: empty (skipped)")
            continue
        print(f"  - {coll}: {n} documents -> migrating in batches of {batch_size}")
        moved = 0
        batch: list[UpdateOne] = []
        for doc in src_coll.find({}):
            batch.append(UpdateOne({"_id": doc["_id"]}, {"$set": doc}, upsert=True))
            if len(batch) >= batch_size:
                dst_coll.bulk_write(batch, ordered=False)
                moved += len(batch)
                batch.clear()
                print(f"      {moved}/{n}")
        if batch:
            dst_coll.bulk_write(batch, ordered=False)
            moved += len(batch)
        print(f"      {moved}/{n} ✓")
        total += moved
    return total


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate Spartan Coaching MongoDB to Atlas")
    parser.add_argument("--source", default="mongodb://localhost:27017", help="Source MongoDB URI")
    parser.add_argument("--target", required=True, help="Target MongoDB Atlas URI")
    parser.add_argument("--db", default="spartan_coaching", help="Database name")
    parser.add_argument("--batch", type=int, default=200, help="Batch size for bulk writes")
    args = parser.parse_args()

    print(f"Migrating db '{args.db}'")
    print(f"  Source: {args.source}")
    print(f"  Target: {args.target.split('@')[-1] if '@' in args.target else args.target}")
    print("")
    total = migrate(args.source, args.target, args.db, args.batch)
    print("")
    print(f"Done. {total} documents migrated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
