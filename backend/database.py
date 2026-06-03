"""Единая схема БД: аккаунты журнала посещаемости + лица для биометрии."""
import os
import pickle
import sqlite3
from datetime import datetime

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get('DB_PATH', os.path.join(_BASE_DIR, 'database.db'))


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS Accounts(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            firstName TEXT NOT NULL,
            lastName TEXT NOT NULL,
            patronymic TEXT,
            age INTEGER NOT NULL DEFAULT 18,
            city TEXT NOT NULL DEFAULT '',
            "group" TEXT,
            attendance INTEGER DEFAULT 0,
            password TEXT NOT NULL,
            delay INTEGER DEFAULT 0,
            withDelays INTEGER DEFAULT 0,
            pass INTEGER DEFAULT 0,
            photoUrl TEXT,
            personId INTEGER,
            biometricVerified INTEGER DEFAULT 0
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS persons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            surname TEXT NOT NULL,
            job TEXT,
            phone TEXT,
            accountId INTEGER,
            created TEXT DEFAULT CURRENT_TIMESTAMP,
            isactive INTEGER DEFAULT 1,
            FOREIGN KEY (accountId) REFERENCES Accounts(id)
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS faces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            persID INTEGER,
            faceatt BLOB,
            img TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            conf REAL DEFAULT 1.0,
            verified INTEGER DEFAULT 1,
            FOREIGN KEY (persID) REFERENCES persons(id)
        )
    ''')

    conn.commit()
    conn.close()


def _row_to_dict(row):
    return dict(row) if row else None


def create_account(data):
    conn = get_connection()
    try:
        cur = conn.execute('''
            INSERT INTO Accounts(
                username, firstName, lastName, patronymic, age, city, password, "group"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('username'),
            data['firstName'],
            data['lastName'],
            data.get('patronymic'),
            data.get('age', 18),
            data.get('city', ''),
            data['password'],
            data.get('group'),
        ))
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def find_account_by_login(login):
    conn = get_connection()
    try:
        row = conn.execute('''
            SELECT * FROM Accounts
            WHERE username = ? OR CAST(id AS TEXT) = ? OR firstName = ? OR lastName = ?
        ''', (login, login, login, login)).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def get_account(account_id):
    conn = get_connection()
    try:
        row = conn.execute('SELECT * FROM Accounts WHERE id = ?', (account_id,)).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def get_all_accounts_public():
    conn = get_connection()
    try:
        rows = conn.execute('''
            SELECT id, username, firstName, lastName, patronymic, age, city, "group",
                   attendance, delay, withDelays, pass, photoUrl, biometricVerified
            FROM Accounts
        ''').fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_account(account_id, fields):
    allowed = {
        'firstName', 'lastName', 'patronymic', 'age', 'city', 'password',
        'photoUrl', 'biometricVerified', 'personId',
    }
    set_parts = []
    values = []
    for key, val in fields.items():
        if key in allowed:
            set_parts.append(f'{key} = ?')
            values.append(val)
    if not set_parts:
        return False
    values.append(account_id)
    conn = get_connection()
    try:
        conn.execute(
            f'UPDATE Accounts SET {", ".join(set_parts)} WHERE id = ?',
            values,
        )
        conn.commit()
        return True
    finally:
        conn.close()


def increment_account_field(account_id, field):
    if field not in ('delay', 'withDelays', 'pass'):
        raise ValueError('Invalid field')
    conn = get_connection()
    try:
        conn.execute(f'UPDATE Accounts SET {field} = {field} + 1 WHERE id = ?', (account_id,))
        stats = conn.execute(
            'SELECT delay, withDelays, pass FROM Accounts WHERE id = ?',
            (account_id,),
        ).fetchone()
        attendance = (stats['withDelays'] * 100) + (stats['delay'] * 50)
        conn.execute('UPDATE Accounts SET attendance = ? WHERE id = ?', (attendance, account_id))
        conn.commit()
        return attendance
    finally:
        conn.close()


def get_account_stats(account_id):
    conn = get_connection()
    try:
        row = conn.execute(
            'SELECT delay, withDelays, pass, attendance FROM Accounts WHERE id = ?',
            (account_id,),
        ).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def load_all_faces():
    conn = get_connection()
    try:
        rows = conn.execute('''
            SELECT p.id, p.name, p.surname, p.job, p.phone, p.accountId, f.faceatt, f.img
            FROM persons p
            JOIN faces f ON p.id = f.persID
            WHERE p.isactive = 1
        ''').fetchall()

        encodings = []
        names = []
        people_info = {}

        for row in rows:
            if not row['faceatt']:
                continue
            encoding = pickle.loads(row['faceatt'])
            encodings.append(encoding)
            eng_name = f"{row['name']}_{row['surname']}"
            names.append(eng_name)
            people_info[eng_name] = {
                'personId': row['id'],
                'accountId': row['accountId'],
                'name': f"{row['name']} {row['surname']}",
                'job': row['job'] or 'Сотрудник',
                'phone': row['phone'] or '+7 XXX XXX-XX-XX',
                'img': row['img'],
            }

        return encodings, names, people_info
    finally:
        conn.close()


def faces_for_api():
    import base64

    conn = get_connection()
    try:
        rows = conn.execute('''
            SELECT p.id, p.name, p.surname, p.job, p.phone, p.accountId, f.faceatt, f.img
            FROM persons p
            JOIN faces f ON p.id = f.persID
            WHERE p.isactive = 1
        ''').fetchall()
        result = []
        for row in rows:
            if not row['faceatt']:
                continue
            result.append({
                'personId': row['id'],
                'accountId': row['accountId'],
                'engName': f"{row['name']}_{row['surname']}",
                'name': f"{row['name']} {row['surname']}",
                'job': row['job'] or 'Сотрудник',
                'phone': row['phone'] or '+7 XXX XXX-XX-XX',
                'img': row['img'],
                'encoding': base64.b64encode(row['faceatt']).decode('ascii'),
            })
        return result
    finally:
        conn.close()


def add_person_to_db(name, surname, face_encoding, image_path, job='', phone='', account_id=None):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO persons (name, surname, job, phone, accountId, created, isactive)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, surname, job, phone, account_id, datetime.now().isoformat(), 1))
        pers_id = cur.lastrowid

        face_blob = pickle.dumps(face_encoding)
        cur.execute('''
            INSERT INTO faces (persID, faceatt, img, timestamp, verified)
            VALUES (?, ?, ?, ?, ?)
        ''', (pers_id, face_blob, image_path, datetime.now().isoformat(), 1))

        if account_id:
            cur.execute(
                'UPDATE Accounts SET personId = ?, photoUrl = ?, biometricVerified = 1 WHERE id = ?',
                (pers_id, image_path, account_id),
            )

        conn.commit()
        return pers_id
    finally:
        conn.close()


def delete_person(eng_name):
    parts = eng_name.split('_', 1)
    name = parts[0]
    surname = parts[1] if len(parts) > 1 else ''

    conn = get_connection()
    try:
        conn.execute(
            'UPDATE persons SET isactive = 0 WHERE name = ? AND surname = ?',
            (name, surname),
        )
        conn.commit()
    finally:
        conn.close()


def link_biometric_to_account(account_id, photo_url, person_id):
    conn = get_connection()
    try:
        conn.execute('''
            UPDATE Accounts
            SET photoUrl = ?, personId = ?, biometricVerified = 1
            WHERE id = ?
        ''', (photo_url, person_id, account_id))
        conn.commit()
    finally:
        conn.close()
