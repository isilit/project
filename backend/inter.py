import sqlite3

conn = sqlite3.connect('database.db')
conn.execute('''
    INSERT OR IGNORE INTO Accounts (firstName, lastName, username, password, "group", isAdmin)
    VALUES ('Admin', 'Academy', 'adminAcademy', 'adminAcademy', 'Администрация', 1)
''')
conn.commit()
print('✅ Админ создан')
conn.close()