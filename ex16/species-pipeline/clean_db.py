import sqlite3

def clean_db():
    conn = sqlite3.connect('local_species_final.db')
    cursor = conn.cursor()
    
    # Nullify any lifespan_years, weight_kg, length_cm that are URLs
    queries = [
        "UPDATE species SET lifespan_years = NULL WHERE lifespan_years LIKE '%http%' OR lifespan_years LIKE '%www.%'",
        "UPDATE species SET weight_kg = NULL WHERE weight_kg LIKE '%http%' OR weight_kg LIKE '%www.%'",
        "UPDATE species SET length_cm = NULL WHERE length_cm LIKE '%http%' OR length_cm LIKE '%www.%'"
    ]
    
    for q in queries:
        cursor.execute(q)
        
    conn.commit()
    conn.close()
    print("Database cleaned of URLs in numeric range fields.")

if __name__ == "__main__":
    clean_db()
