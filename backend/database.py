from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

from .config import DATABASE_URL


@contextmanager
def get_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured.")
    connection = psycopg2.connect(DATABASE_URL, sslmode="require")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def fetch_one(query, parameters=()):
    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, parameters)
            return cursor.fetchone()


def fetch_all(query, parameters=()):
    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(query, parameters)
            return cursor.fetchall()


def execute_returning(query, parameters=()):
    return fetch_one(query, parameters)