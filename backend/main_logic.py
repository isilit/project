# pip install -r requirements.txt
"""Биометрия: работа с БД только через API. Режим subprocess для Electron."""
import argparse
import base64
import json
import os
import pickle
import sys
import time
from datetime import datetime

import cv2
import face_recognition
import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFont

DEFAULT_API = os.environ.get('BIOMETRIC_API', 'http://127.0.0.1:5000')


def api_get_faces(api_base):
    r = requests.get(f'{api_base}/api/biometric/faces', timeout=10)
    r.raise_for_status()
    faces = r.json()
    encodings = []
    names = []
    people_info = {}
    for item in faces:
        enc = pickle.loads(base64.b64decode(item['encoding']))
        encodings.append(enc)
        names.append(item['engName'])
        people_info[item['engName']] = item
    return encodings, names, people_info


def api_enroll(api_base, payload):
    r = requests.post(f'{api_base}/api/biometric/enroll', json=payload, timeout=15)
    r.raise_for_status()
    return r.json()


def api_delete_person(api_base, eng_name):
    r = requests.delete(f'{api_base}/api/biometric/persons/{eng_name}', timeout=10)
    r.raise_for_status()


def api_record_attendance(api_base, account_id, status='onTime'):
    r = requests.post(
        f'{api_base}/api/biometric/identify-result',
        json={'accountId': account_id, 'status': status},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()


def put_rus_text(img, text, position, font_size=20, color=(255, 255, 255)):
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img_rgb)
    draw = ImageDraw.Draw(pil_img)
    try:
        font = ImageFont.truetype('arial.ttf', font_size)
    except OSError:
        try:
            font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', font_size)
        except OSError:
            font = ImageFont.load_default()
    draw.text(position, text, font=font, fill=color)
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def save_photo(frame, photo_dir, prefix='face'):
    os.makedirs(photo_dir, exist_ok=True)
    filename = f"{prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
    path = os.path.join(photo_dir, filename)
    cv2.imwrite(path, frame)
    return filename, path


def subprocess_enroll(api_base, photo_dir, account_id, first_name, last_name):
    video = cv2.VideoCapture(0)
    if not video.isOpened():
        print(json.dumps({'ok': False, 'error': 'Камера недоступна'}))
        return 1

    saved = None
    encoding = None
    deadline = time.time() + 30

    while time.time() < deadline:
        ret, frame = video.read()
        if not ret:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        locs = face_recognition.face_locations(rgb)
        if locs:
            encs = face_recognition.face_encodings(rgb, locs)
            if encs:
                encoding = encs[0]
                filename, _ = save_photo(frame, photo_dir, f'user_{account_id}')
                saved = filename
                break
        cv2.imshow('Biometric Enroll', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video.release()
    cv2.destroyAllWindows()

    if not encoding or not saved:
        print(json.dumps({'ok': False, 'error': 'Лицо не обнаружено'}))
        return 1

    payload = {
        'name': first_name,
        'surname': last_name,
        'encoding': base64.b64encode(pickle.dumps(encoding)).decode('ascii'),
        'image_path': saved,
        'account_id': account_id,
        'job': 'Студент',
    }
    result = api_enroll(api_base, payload)
    print(json.dumps({
        'ok': True,
        'photoUrl': saved,
        'personId': result.get('personId'),
    }))
    return 0


def subprocess_identify(api_base, photo_dir):
    try:
        known_encodings, known_names, people_info = api_get_faces(api_base)
    except requests.RequestException as exc:
        print(json.dumps({'ok': False, 'error': f'API: {exc}'}))
        return 1

    if not known_encodings:
        print(json.dumps({'ok': False, 'error': 'База лиц пуста'}))
        return 1

    video = cv2.VideoCapture(0)
    if not video.isOpened():
        print(json.dumps({'ok': False, 'error': 'Камера недоступна'}))
        return 1

    matched_name = None
    matched_info = None
    snapshot_file = None
    deadline = time.time() + 25

    while time.time() < deadline:
        ret, frame = video.read()
        if not ret:
            break

        small = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        locs = face_recognition.face_locations(rgb_small)
        encs = face_recognition.face_encodings(rgb_small, locs)

        for enc, loc in zip(encs, locs):
            dists = face_recognition.face_distance(known_encodings, enc)
            idx = int(np.argmin(dists))
            if dists[idx] < 0.55:
                matched_name = known_names[idx]
                matched_info = people_info[matched_name]
                snapshot_file, _ = save_photo(frame, photo_dir, 'identify')
                top, right, bottom, left = [x * 4 for x in loc]
                cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                break

        cv2.imshow('Biometric Identify', frame)
        if matched_name:
            cv2.waitKey(800)
            break
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video.release()
    cv2.destroyAllWindows()

    if not matched_name:
        print(json.dumps({'ok': False, 'error': 'Лицо не распознано'}))
        return 1

    account_id = matched_info.get('accountId')
    if account_id:
        try:
            api_record_attendance(api_base, account_id, 'onTime')
        except requests.RequestException:
            pass

    print(json.dumps({
        'ok': True,
        'name': matched_info.get('name'),
        'engName': matched_name,
        'accountId': account_id,
        'photoUrl': matched_info.get('img') or snapshot_file,
        'snapshot': snapshot_file,
    }))
    return 0


def interactive_main(api_base, photo_dir):
    try:
        known_encodings, known_names, people_info = api_get_faces(api_base)
    except requests.RequestException:
        known_encodings, known_names, people_info = [], [], {}

    video_capture = cv2.VideoCapture(0)
    cv2.namedWindow('Face Recognition')

    while True:
        ret, frame = video_capture.read()
        if not ret:
            break

        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        for face_encoding, face_location in zip(face_encodings, face_locations):
            name = 'Unknown'
            if known_encodings:
                face_distances = face_recognition.face_distance(known_encodings, face_encoding)
                best_match_index = int(np.argmin(face_distances))
                if face_distances[best_match_index] < 0.55:
                    name = known_names[best_match_index]

            top, right, bottom, left = [x * 4 for x in face_location]
            color = (0, 255, 0) if name != 'Unknown' else (0, 0, 255)
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)

        cv2.imshow('Face Recognition', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video_capture.release()
    cv2.destroyAllWindows()


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--api', default=DEFAULT_API)
    p.add_argument('--photo-dir', default=os.path.join(os.path.dirname(__file__), '..', 'photo'))
    p.add_argument('--mode', choices=['interactive', 'enroll', 'identify'], default='interactive')
    p.add_argument('--account-id', type=int)
    p.add_argument('--first-name', default='')
    p.add_argument('--last-name', default='')
    return p.parse_args()


if __name__ == '__main__':
    args = parse_args()
    photo_dir = os.path.abspath(args.photo_dir)
    os.makedirs(photo_dir, exist_ok=True)

    if args.mode == 'enroll':
        if not args.account_id:
            print(json.dumps({'ok': False, 'error': 'account-id required'}))
            sys.exit(1)
        sys.exit(subprocess_enroll(
            args.api, photo_dir, args.account_id, args.first_name, args.last_name,
        ))
    if args.mode == 'identify':
        sys.exit(subprocess_identify(args.api, photo_dir))
    interactive_main(args.api, photo_dir)
