# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import math_engine

app = FastAPI(title="Kessler Shield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    conn = sqlite3.connect("kessler.db", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/catalog")
def get_catalog(limit: int = 2000):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT name, tle1, tle2 FROM satellites LIMIT ?", (limit,))
    rows = cursor.fetchall()
    return [{"name": r["name"], "tle1": r["tle1"], "tle2": r["tle2"]} for r in rows]

@app.get("/conjunction")
def assess_conjunction(x_miss: float, y_miss: float, sig_x: float, sig_y: float, cov: float, hbr: float):
    # Call native C++ module directly
    pc = math_engine.calculate_pc(x_miss, y_miss, sig_x, sig_y, cov, hbr)
    risk_level = "CRITICAL" if pc > 1e-4 else "NOMINAL"
    return {"probability_of_collision": pc, "risk_status": risk_level}