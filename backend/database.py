"""Единая схема БД: аккаунты, группы, биометрия."""
import hashlib
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


def _migrate(conn):
    cur = conn.cursor()
    columns = {row[1] for row in cur.execute('PRAGMA table_info(Accounts)').fetchall()}
    if 'isAdmin' not in columns:
        cur.execute('ALTER TABLE Accounts ADD COLUMN isAdmin INTEGER DEFAULT 0')


def seed_defaults(conn):
    cur = conn.cursor()
    default_groups = [
        ('ИС-21', 'Группа информационных систем 21'),
        ('ИС-22', 'Группа информационных систем 22'),
        ('Преподаватели', 'Преподавательский состав'),
        ('Администрация', 'Администраторы системы'),
    ]
    for name, desc in default_groups:
        cur.execute(
            'INSERT OR IGNORE INTO Groups (name, description) VALUES (?, ?)',
            (name, desc),
        )

    count = cur.execute('SELECT COUNT(*) AS c FROM Accounts').fetchone()['c']
    if count == 0:
        admin_hash = hashlib.sha256('adminAcademy'.encode('utf-8')).hexdigest()
        cur.execute('''
            INSERT INTO Accounts(
                username, firstName, lastName, patronymic, age, city, password,
                "group", isAdmin, attendance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'adminAcademy', 'Админ', 'Админов', 'Админович', 30, 'Брянск',
            admin_hash, 'Администрация', 1, 100,
        ))
    else:
        admin_hash = hashlib.sha256('adminAcademy'.encode('utf-8')).hexdigest()
        cur.execute('''
            UPDATE Accounts SET password = ?, isAdmin = 1, "group" = 'Администрация'
            WHERE username = 'adminAcademy'
        ''', (admin_hash,))


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS Groups(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT DEFAULT ''
        )
    ''')

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
            biometricVerified INTEGER DEFAULT 0,
            isAdmin INTEGER DEFAULT 0
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

    _migrate(conn)
    seed_defaults(conn)
    conn.commit()
    conn.close()


def _row_to_dict(row):
    return dict(row) if row else None


def is_admin(account):
    if not account:
        return False
    return bool(account.get('isAdmin')) or account.get('group') == 'Администрация'


def create_account(data):
    conn = get_connection()
    try:
        cur = conn.execute('''
            INSERT INTO Accounts(
                username, firstName, lastName, patronymic, age, city, password, "group", isAdmin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('username'),
            data['firstName'],
            data['lastName'],
            data.get('patronymic'),
            data.get('age', 18),
            data.get('city', ''),
            data['password'],
            data.get('group'),
            1 if data.get('isAdmin') else 0,
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
                   attendance, delay, withDelays, pass, photoUrl, biometricVerified, isAdmin
            FROM Accounts
        ''').fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_users_by_group(group_name):
    conn = get_connection()
    try:
        rows = conn.execute('''
            SELECT id, username, firstName, lastName, patronymic, age, city, "group",
                   attendance, delay, withDelays, pass, photoUrl, biometricVerified, isAdmin
            FROM Accounts WHERE "group" = ?
        ''', (group_name,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def update_account(account_id, fields, allow_group=False):
    allowed = {
        'firstName', 'lastName', 'patronymic', 'age', 'city', 'password',
        'photoUrl', 'biometricVerified', 'personId', 'isAdmin',
        'delay', 'withDelays', 'pass', 'attendance',
    }
    if allow_group:
        allowed.add('group')
        allowed.add('username')

    set_parts = []
    values = []
    for key, val in fields.items():
        if key == 'group':
            set_parts.append('"group" = ?')
            values.append(val)
        elif key in allowed:
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


def delete_account(account_id):
    conn = get_connection()
    try:
        conn.execute('DELETE FROM Accounts WHERE id = ?', (account_id,))
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


def get_all_groups():
    conn = get_connection()
    try:
        rows = conn.execute('''
            SELECT g.id, g.name, g.description,
                   (SELECT COUNT(*) FROM Accounts a WHERE a."group" = g.name) AS memberCount
            FROM Groups g
            ORDER BY g.name
        ''').fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_group(name, description=''):
    conn = get_connection()
    try:
        cur = conn.execute(
            'INSERT INTO Groups (name, description) VALUES (?, ?)',
            (name, description),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def update_group(group_id, name, description=''):
    conn = get_connection()
    try:
        old = conn.execute('SELECT name FROM Groups WHERE id = ?', (group_id,)).fetchone()
        if not old:
            return False
        old_name = old['name']
        conn.execute(
            'UPDATE Groups SET name = ?, description = ? WHERE id = ?',
            (name, description, group_id),
        )
        conn.execute(
            'UPDATE Accounts SET "group" = ? WHERE "group" = ?',
            (name, old_name),
        )
        conn.commit()
        return True
    finally:
        conn.close()


def delete_group(group_id):
    conn = get_connection()
    try:
        row = conn.execute('SELECT name FROM Groups WHERE id = ?', (group_id,)).fetchone()
        if not row:
            return False
        conn.execute('UPDATE Accounts SET "group" = NULL WHERE "group" = ?', (row['name'],))
        conn.execute('DELETE FROM Groups WHERE id = ?', (group_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def get_admin_snapshot():
    conn = get_connection()
    try:
        accounts = [dict(r) for r in conn.execute('SELECT * FROM Accounts').fetchall()]
        for acc in accounts:
            acc.pop('password', None)

        persons = [dict(r) for r in conn.execute('SELECT * FROM persons').fetchall()]
        faces = []
        for r in conn.execute('SELECT id, persID, img, timestamp, conf, verified FROM faces').fetchall():
            faces.append(dict(r))

        groups = get_all_groups()
        return {'accounts': accounts, 'persons': persons, 'faces': faces, 'groups': groups}
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
