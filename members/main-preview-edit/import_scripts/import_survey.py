#!/usr/bin/env python3
"""
Simple CSV -> SQLite importer for survey results. Useful for MVP ingestion.
Usage: python import_scripts/import_survey.py responses.csv --db data/survey.db
"""
import argparse
import csv
import sqlite3
import os

SCHEMA = '''
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  role TEXT,
  timezone TEXT,
  availability TEXT,
  skills TEXT,
  tools TEXT,
  credentials TEXT,
  security TEXT,
  communication TEXT,
  rate REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
'''


def import_csv(path, db_path):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.executescript(SCHEMA)
    with open(path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            # create a simple id if missing
            wid = row.get('id') or (row.get('display_name') or 'worker') + '_' + (row.get('role') or 'r')
            cur.execute('''INSERT OR REPLACE INTO workers (id, display_name, role, timezone, availability, skills, tools, credentials, security, communication, rate)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                        (wid, row.get('display_name'), row.get('role'), row.get('timezone'), row.get('availability'), row.get('skills'), row.get('tools'), row.get('credentials'), row.get('security'), row.get('communication'), row.get('rate')))
    conn.commit()
    conn.close()
    print('Imported', path, 'into', db_path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('csv', help='CSV file path')
    parser.add_argument('--db', default='data/survey.db')
    args = parser.parse_args()
    import_csv(args.csv, args.db)
