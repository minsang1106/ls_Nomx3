import os
import random
from datetime import date, datetime, time, timedelta

import mysql.connector
from flask import Flask, jsonify, request, send_from_directory
from mysql.connector import Error


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(BACKEND_DIR)
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


def load_env_file():
    env_path = os.path.join(BASE_DIR, ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


load_env_file()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "campus_eat"),
    "charset": "utf8mb4",
    "autocommit": False,
}

app = Flask(__name__, static_folder=None)


CAFETERIA_META = {
    1: {"location": "학생회관 1F", "category": ["korean", "open"], "cover": "#FFD3BF", "emoji": "🍚", "tagline": "오늘의 백반 · 김치찌개"},
    2: {"location": "제2학생회관 B1", "category": ["korean", "open"], "cover": "#FFE2C2", "emoji": "🍜", "tagline": "잔치국수 · 비빔국수"},
    3: {"location": "도서관 1F", "category": ["snack", "open"], "cover": "#FFF1D6", "emoji": "🥪", "tagline": "샌드위치 · 베이커리"},
    4: {"location": "본관 4F", "category": ["open"], "cover": "#E6E1FF", "emoji": "🍝", "tagline": "파스타 · 리조또"},
    5: {"location": "제1생활관 1F", "category": ["korean"], "cover": "#E8E4DA", "emoji": "🍱", "tagline": "저녁식사 전용 · 현재 마감"},
}

MENU_EMOJI = {
    "제육볶음 정식": "🍱",
    "김치찌개 정식": "🍲",
    "돈까스 정식": "🍛",
    "비빔밥": "🥗",
    "공깃밥 추가": "🍚",
    "계란후라이": "🍳",
    "잔치국수": "🍜",
    "비빔국수": "🍝",
    "우동": "🍲",
    "김밥": "🍙",
    "클럽 샌드위치": "🥪",
    "BLT 샌드위치": "🥖",
    "아메리카노": "☕",
    "초코칩 쿠키": "🍪",
    "크림 파스타": "🍝",
    "토마토 파스타": "🍝",
    "버섯 리조또": "🍚",
}

SAMPLE_CAFETERIAS = [
    ("학생회관 1층 한식당", "11:00:00", "14:00:00"),
    ("제2학생식당 면류코너", "11:30:00", "14:30:00"),
    ("카페테리아 스낵바", "10:00:00", "20:00:00"),
    ("교직원식당 양식코너", "11:30:00", "13:30:00"),
    ("기숙사식당", "18:00:00", "20:00:00"),
]

SAMPLE_MENUS = {
    1: [
        ("제육볶음 정식", "매콤한 제육과 잡곡밥, 미역국", 6500, "정식", 1),
        ("김치찌개 정식", "얼큰한 김치찌개 한 그릇", 5500, "정식", 1),
        ("돈까스 정식", "바삭한 등심돈까스", 7000, "정식", 1),
        ("비빔밥", "계란 후라이 · 고추장", 5000, "단품", 1),
        ("공깃밥 추가", "잡곡밥", 1000, "사이드", 1),
        ("계란후라이", "반숙/완숙", 800, "사이드", 0),
    ],
    2: [
        ("잔치국수", "멸치육수 베이스", 4000, "국수", 1),
        ("비빔국수", "매콤달콤 비빔", 4500, "국수", 1),
        ("우동", "가츠오부시 베이스", 4500, "국수", 1),
        ("김밥", "야채김밥 · 참치김밥", 3000, "사이드", 1),
    ],
    3: [
        ("클럽 샌드위치", "햄 · 치즈 · 토마토", 4800, "샌드위치", 1),
        ("BLT 샌드위치", "베이컨 · 양상추 · 토마토", 5200, "샌드위치", 1),
        ("아메리카노", "HOT / ICE", 2500, "음료", 1),
        ("초코칩 쿠키", "갓 구운 쿠키", 2000, "베이커리", 1),
    ],
    4: [
        ("크림 파스타", "베이컨 크림", 8500, "파스타", 1),
        ("토마토 파스타", "바질토마토", 8000, "파스타", 1),
        ("버섯 리조또", "양송이 · 표고", 8800, "리조또", 1),
    ],
}


def db():
    return mysql.connector.connect(**DB_CONFIG)


def to_hhmm(value):
    if isinstance(value, time):
        return value.strftime("%H:%M")
    if isinstance(value, timedelta):
        total_minutes = int(value.total_seconds() // 60)
        return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    text = str(value)
    return text[:5]


def as_time(value):
    if isinstance(value, time):
        return value
    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
        return time(total_seconds // 3600, (total_seconds % 3600) // 60)
    hour, minute, *_ = str(value).split(":")
    return time(int(hour), int(minute))


def today_pickup_datetime(start_time):
    return datetime.combine(date.today(), as_time(start_time))


def dict_rows(cursor):
    return cursor.fetchall()


def create_slots_for_cafeteria(cursor, cafeteria_id, opening, closing):
    start = datetime.combine(date.today(), as_time(opening))
    end = datetime.combine(date.today(), as_time(closing))
    cursor_time = start
    while cursor_time < end:
        next_time = cursor_time + timedelta(minutes=20)
        cursor.execute(
            "INSERT INTO pickup_slot (cafeteria_id, start_time, end_time, max_order_count) VALUES (%s, %s, %s, %s)",
            (cafeteria_id, cursor_time.time(), min(next_time, end).time(), 25),
        )
        cursor_time = next_time


def seed_if_empty():
    conn = db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS count FROM cafeteria")
        if cursor.fetchone()["count"] > 0:
            conn.rollback()
            return

        cafeteria_ids = []
        for name, opening, closing in SAMPLE_CAFETERIAS:
            cursor.execute(
                "INSERT INTO cafeteria (name, opening_time, closing_time) VALUES (%s, %s, %s)",
                (name, opening, closing),
            )
            cafeteria_ids.append(cursor.lastrowid)

        for sample_index, cafeteria_id in enumerate(cafeteria_ids, start=1):
            for menu in SAMPLE_MENUS.get(sample_index, []):
                cursor.execute(
                    """
                    INSERT INTO menu (cafeteria_id, name, description, price, category, is_available)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (cafeteria_id, *menu),
                )

        cursor.execute("SELECT cafeteria_id, opening_time, closing_time FROM cafeteria")
        for row in cursor.fetchall():
            create_slots_for_cafeteria(cursor, row["cafeteria_id"], row["opening_time"], row["closing_time"])

        conn.commit()
    except Error:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def cafeteria_payload(row):
    meta = CAFETERIA_META.get(row["cafeteria_id"], {})
    closed = row["name"] == "기숙사식당"
    return {
        "id": row["cafeteria_id"],
        "name": row["name"],
        "location": meta.get("location", "캠퍼스"),
        "opening": to_hhmm(row["opening_time"]),
        "closing": to_hhmm(row["closing_time"]),
        "category": meta.get("category", ["open"] if not closed else []),
        "cover": meta.get("cover", "#F4E7D4"),
        "emoji": meta.get("emoji", "🍽️"),
        "tagline": meta.get("tagline", "오늘의 메뉴"),
        "closed": closed,
    }


@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.get("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/cafeterias")
def cafeterias():
    conn = db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT cafeteria_id, name, opening_time, closing_time FROM cafeteria ORDER BY cafeteria_id")
        rows = dict_rows(cursor)
        return jsonify([cafeteria_payload(row) for row in rows])
    finally:
        cursor.close()
        conn.close()


@app.get("/api/cafeterias/<int:cafeteria_id>/menus")
def menus(cafeteria_id):
    conn = db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT menu_id, name, description, price, category, is_available
            FROM menu
            WHERE cafeteria_id = %s
            ORDER BY menu_id
            """,
            (cafeteria_id,),
        )
        return jsonify([
            {
                "id": row["menu_id"],
                "name": row["name"],
                "cat": row["category"] or "기타",
                "price": row["price"],
                "desc": row["description"] or "",
                "emoji": MENU_EMOJI.get(row["name"], "🍽️"),
                "sold": not bool(row["is_available"]),
            }
            for row in cursor.fetchall()
        ])
    finally:
        cursor.close()
        conn.close()


@app.get("/api/cafeterias/<int:cafeteria_id>/slots")
def slots(cafeteria_id):
    conn = db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                ps.slot_id,
                ps.start_time,
                ps.end_time,
                ps.max_order_count,
                COUNT(fo.order_id) AS used_count
            FROM pickup_slot ps
            LEFT JOIN food_order fo
                ON fo.slot_id = ps.slot_id
                AND DATE(fo.pickup_time) = CURDATE()
                AND fo.order_status <> 'cancelled'
            WHERE ps.cafeteria_id = %s
            GROUP BY ps.slot_id, ps.start_time, ps.end_time, ps.max_order_count
            ORDER BY ps.start_time
            """,
            (cafeteria_id,),
        )
        return jsonify([
            {
                "id": row["slot_id"],
                "start": to_hhmm(row["start_time"]),
                "end": to_hhmm(row["end_time"]),
                "max": row["max_order_count"],
                "used": row["used_count"],
            }
            for row in cursor.fetchall()
        ])
    finally:
        cursor.close()
        conn.close()


@app.post("/api/orders")
def create_order():
    payload = request.get_json(silent=True) or {}
    slot_id = payload.get("slotId")
    items = payload.get("items") or []
    payment_method = payload.get("paymentMethod") or "card"

    if not slot_id or not items:
        return jsonify({"error": "slotId and items are required"}), 400

    conn = db()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        cursor.execute(
            """
            SELECT slot_id, cafeteria_id, start_time, max_order_count
            FROM pickup_slot
            WHERE slot_id = %s
            FOR UPDATE
            """,
            (slot_id,),
        )
        slot = cursor.fetchone()
        if not slot:
            conn.rollback()
            return jsonify({"error": "pickup slot not found"}), 404
        cursor.execute(
            """
            SELECT COUNT(*) AS used_count
            FROM food_order
            WHERE slot_id = %s
              AND DATE(pickup_time) = CURDATE()
              AND order_status <> 'cancelled'
            """,
            (slot_id,),
        )
        slot["used_count"] = cursor.fetchone()["used_count"]
        if slot["used_count"] >= slot["max_order_count"]:
            conn.rollback()
            return jsonify({"error": "pickup slot is full"}), 409

        menu_ids = [int(item["menuId"]) for item in items]
        placeholders = ",".join(["%s"] * len(menu_ids))
        cursor.execute(
            f"""
            SELECT menu_id, cafeteria_id, name, price, is_available
            FROM menu
            WHERE menu_id IN ({placeholders})
            """,
            menu_ids,
        )
        menus_by_id = {row["menu_id"]: row for row in cursor.fetchall()}

        total_price = 0
        order_items = []
        for item in items:
            menu_id = int(item["menuId"])
            quantity = int(item.get("qty", 0))
            menu = menus_by_id.get(menu_id)
            if quantity <= 0 or not menu or not menu["is_available"] or menu["cafeteria_id"] != slot["cafeteria_id"]:
                conn.rollback()
                return jsonify({"error": "invalid order item"}), 400
            total_price += menu["price"] * quantity
            order_items.append((menu_id, quantity, menu["price"]))

        pickup_time = today_pickup_datetime(slot["start_time"])
        order_id = None
        order_number = None
        for _ in range(10):
            order_number = f"A-{random.randint(1000, 9999)}"
            try:
                cursor.execute(
                    """
                    INSERT INTO food_order (order_number, slot_id, order_time, pickup_time, order_status, total_price)
                    VALUES (%s, %s, NOW(), %s, %s, %s)
                    """,
                    (order_number, slot_id, pickup_time, "paid", total_price),
                )
                order_id = cursor.lastrowid
                break
            except Error as exc:
                if getattr(exc, "errno", None) != 1062:
                    raise
        if order_id is None:
            conn.rollback()
            return jsonify({"error": "failed to generate order number"}), 500

        for menu_id, quantity, item_price in order_items:
            cursor.execute(
                "INSERT INTO order_item (order_id, menu_id, quantity, item_price) VALUES (%s, %s, %s, %s)",
                (order_id, menu_id, quantity, item_price),
            )

        cursor.execute(
            """
            INSERT INTO payment (order_id, payment_method, payment_status, payment_time, amount)
            VALUES (%s, %s, %s, NOW(), %s)
            """,
            (order_id, payment_method, "paid", total_price),
        )
        conn.commit()
        return jsonify({"orderId": order_id, "orderNumber": order_number, "totalPrice": total_price}), 201
    except Error as exc:
        conn.rollback()
        return jsonify({"error": str(exc)}), 500
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    seed_if_empty()
    app.run(host=os.getenv("APP_HOST", "127.0.0.1"), port=int(os.getenv("APP_PORT", "5000")), debug=True)
