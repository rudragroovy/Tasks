import sqlite3

conn = sqlite3.connect('local_species.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print("Tables:", tables)

if tables:
    for table in tables:
        c.execute(f"PRAGMA table_info({table[0]})")
        columns = c.fetchall()
        print(f"Columns in {table[0]}:", columns)
        
        c.execute(f"SELECT * FROM {table[0]} LIMIT 5")
        rows = c.fetchall()
        print(f"Rows in {table[0]}:", rows)

conn.close()
