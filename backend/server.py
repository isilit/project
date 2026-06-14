"""Flask API — журнал посещаемости, биометрия, админка."""
import base64
import os
import pickle

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

import database as db

app = Flask(__name__)
CORS(app)

_BASE = os.path.dirname(os.path.abspath(__file__))
PHOTO_DIR = os.environ.get('PHOTO_DIR', os.path.join(_BASE, '..', 'photo'))
os.makedirs(PHOTO_DIR, exist_ok=True)

db.init_db()


def _admin_user_id():
    raw = request.headers.get('X-User-Id')
    if not raw:
        return None
    try:
        user_id = int(raw)
    except ValueError:
        return None
    user = db.get_account(user_id)
    if not db.is_admin(user):
        return None
    return user_id


def _require_admin():
    if not _admin_user_id():
        return jsonify({'error': 'Admin access required'}), 403
    return None


@app.route('/photos/<path:filename>')
def serve_photo(filename):
    return send_from_directory(PHOTO_DIR, filename)


@app.route('/register', methods=['POST'])
def registration():
    data = request.json or {}
    required = ['firstName', 'lastName', 'password']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing field: {field}'}), 400

    try:
        user_id = db.create_account(data)
        return jsonify({'message': 'Новый пользователь добавлен', 'id': user_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    login_val = data.get('login') or data.get('username')
    password = data.get('password')
    if not login_val or not password:
        return jsonify({'error': 'Login and password required'}), 400

    user = db.find_account_by_login(login_val)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user['password'] != password:
        return jsonify({'error': 'Invalid password'}), 401

    user_dict = dict(user)
    del user_dict['password']
    user_dict['isAdminUser'] = db.is_admin(user)
    return jsonify({'message': 'Login successful', 'user': user_dict}), 200


@app.route('/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = db.get_account(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user_dict = dict(user)
    del user_dict['password']
    user_dict['isAdminUser'] = db.is_admin(user)
    return jsonify(user_dict), 200


@app.route('/user/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json or {}
    if 'group' in data:
        return jsonify({'error': 'Field "group" cannot be changed'}), 403

    allowed = ['firstName', 'lastName', 'patronymic', 'age', 'city', 'password', 'photoUrl']
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        return jsonify({'error': 'No fields to update'}), 400

    if not db.update_account(user_id, fields):
        return jsonify({'error': 'Update failed'}), 400
    return jsonify({'message': 'User updated successfully'}), 200


@app.route('/user/<int:user_id>/increment/<string:field>', methods=['POST'])
def increment_field(user_id, field):
    if field not in ('delay', 'withDelays', 'pass'):
        return jsonify({'error': 'Invalid field'}), 400

    user = db.get_account(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    attendance = db.increment_account_field(user_id, field)
    return jsonify({'message': f'{field} incremented', 'attendance': attendance}), 200


@app.route('/user/<int:user_id>/stats', methods=['GET'])
def get_stats(user_id):
    stats = db.get_account_stats(user_id)
    if not stats:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(stats), 200


@app.route('/users', methods=['GET'])
def get_all_users():
    group = request.args.get('group')
    if group:
        return jsonify(db.get_users_by_group(group)), 200
    return jsonify(db.get_all_accounts_public()), 200


@app.route('/groups', methods=['GET'])
def list_groups():
    return jsonify(db.get_all_groups()), 200


# ==================== ADMIN ====================

@app.route('/admin/data', methods=['GET'])
def admin_data():
    denied = _require_admin()
    if denied:
        return denied
    return jsonify(db.get_admin_snapshot()), 200


@app.route('/admin/accounts/<int:account_id>', methods=['PUT'])
def admin_update_account(account_id):
    denied = _require_admin()
    if denied:
        return denied

    data = request.json or {}
    if not db.update_account(account_id, data, allow_group=True):
        return jsonify({'error': 'Update failed'}), 400
    return jsonify({'message': 'Account updated'}), 200


@app.route('/admin/accounts/<int:account_id>', methods=['DELETE'])
def admin_delete_account(account_id):
    denied = _require_admin()
    if denied:
        return denied

    db.delete_account(account_id)
    return jsonify({'message': 'Account deleted'}), 200


@app.route('/admin/groups', methods=['POST'])
def admin_create_group():
    denied = _require_admin()
    if denied:
        return denied

    data = request.json or {}
    if not data.get('name'):
        return jsonify({'error': 'name required'}), 400

    try:
        gid = db.create_group(data['name'], data.get('description', ''))
        return jsonify({'id': gid}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/admin/groups/<int:group_id>', methods=['PUT'])
def admin_update_group(group_id):
    denied = _require_admin()
    if denied:
        return denied

    data = request.json or {}
    if not db.update_group(group_id, data.get('name', ''), data.get('description', '')):
        return jsonify({'error': 'Group not found'}), 404
    return jsonify({'message': 'Group updated'}), 200


@app.route('/admin/groups/<int:group_id>', methods=['DELETE'])
def admin_delete_group(group_id):
    denied = _require_admin()
    if denied:
        return denied

    db.delete_group(group_id)
    return jsonify({'message': 'Group deleted'}), 200


# ==================== BIOMETRIC ====================

@app.route('/api/biometric/faces', methods=['GET'])
def api_get_faces():
    return jsonify(db.faces_for_api()), 200


@app.route('/api/biometric/enroll', methods=['POST'])
def api_enroll():
    data = request.json or {}
    encoding_b64 = data.get('encoding')
    if not encoding_b64:
        return jsonify({'error': 'encoding required'}), 400

    face_encoding = pickle.loads(base64.b64decode(encoding_b64))
    pers_id = db.add_person_to_db(
        data['name'],
        data['surname'],
        face_encoding,
        data.get('image_path', ''),
        data.get('job', 'Студент'),
        data.get('phone', ''),
        data.get('account_id'),
    )
    if data.get('account_id') and data.get('image_path'):
        db.link_biometric_to_account(data['account_id'], data['image_path'], pers_id)

    return jsonify({'personId': pers_id, 'message': 'Face enrolled'}), 201


@app.route('/api/biometric/persons/<eng_name>', methods=['DELETE'])
def api_delete_person(eng_name):
    db.delete_person(eng_name)
    return jsonify({'message': 'Person deactivated'}), 200


@app.route('/api/biometric/identify-result', methods=['POST'])
def api_identify_result():
    data = request.json or {}
    account_id = data.get('accountId')
    status = data.get('status', 'onTime')
    if not account_id:
        return jsonify({'error': 'accountId required'}), 400

    field_map = {'onTime': 'withDelays', 'late': 'delay', 'absent': 'pass'}
    field = field_map.get(status, 'withDelays')
    attendance = db.increment_account_field(account_id, field)
    return jsonify({'attendance': attendance}), 200

# Health check для Electron/wait-on
@app.route('/health', methods=['GET', 'HEAD'])
def health_check():
    """Health check endpoint"""
    return '', 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f'API: http://127.0.0.1:{port}')
    app.run(host='0.0.0.0', port=port, debug=False)
