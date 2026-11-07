"""Shared persistent storage directory for GRIDMIND runtime data."""
import os
from pathlib import Path

DATA_DIR = Path(os.getenv("GRIDMIND_DATA_DIR", Path(__file__).resolve().parent))
DATA_DIR.mkdir(parents=True, exist_ok=True)
