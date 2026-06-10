import sqlite3
import json
from typing import List, Dict

class SQLiteMemory:
    def __init__(self, db_path: str = "agent_memory.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memory (
                session_id TEXT,
                role TEXT,
                content TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()

    def add_message(self, session_id: str, role: str, content: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO memory (session_id, role, content) VALUES (?, ?, ?)",
            (session_id, role, content)
        )
        conn.commit()
        conn.close()

    def get_messages(self, session_id: str) -> List[Dict]:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT role, content FROM memory WHERE session_id = ? ORDER BY timestamp ASC",
            (session_id,)
        )
        rows = cursor.fetchall()
        conn.close()
        return [{"role": row[0], "content": row[1]} for row in rows]

    def clear_memory(self, session_id: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM memory WHERE session_id = ?", (session_id,))
        conn.commit()
        conn.close()
