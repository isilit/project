import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header/Header';
import './EditProfilePage.css';
import defaultAvatar from '../../avatars/default.jpg';
import { useAuth } from '../../context/AuthContext';
import { updateUser, photoUrl } from '../../services/api';

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [middleName, setMiddleName] = useState(user?.patronymic || '');
  const [age, setAge] = useState(String(user?.age || ''));
  const [city, setCity] = useState(user?.city || '');
  const [saving, setSaving] = useState(false);

  const avatarSrc = user?.photoUrl && user?.biometricVerified
    ? photoUrl(user.photoUrl)
    : defaultAvatar;

  async function handleSave() {
    if (!user?.id) return;
    setSaving(true);
    try {
      await updateUser(user.id, {
        firstName,
        lastName,
        patronymic: middleName,
        age: parseInt(age, 10) || user.age,
        city,
      });
      await refreshUser(user.id);
      navigate('/profile');
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app">
      <Header />
      <div className="profileCountainer">
        <div className="profileHeader">
          <h3>Редактирование профиля</h3>
          <button type="button" className="editBtn" onClick={() => navigate('/profile')}>
            Назад
          </button>
        </div>

        <div className="profileContent">
          <img src={avatarSrc} alt="Аватар" className="profileAvatar" />
          <div className="profileInfo">
            <div className="profileRow">
              <span className="label">Фамилия:</span>
              <input
                type="text"
                className="editProfileInput"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div className="profileRow">
              <span className="label">Имя:</span>
              <input
                type="text"
                className="editProfileInput"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="profileRow">
              <span className="label">Отчество:</span>
              <input
                type="text"
                className="editProfileInput"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </div>
            <div className="profileRow">
              <span className="label">Возраст:</span>
              <input
                type="text"
                className="editProfileInput"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div className="profileRow">
              <span className="label">Город:</span>
              <input
                type="text"
                className="editProfileInput"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="profileRow">
              <span className="label">Группа:</span>
              <span className="value">{user?.group || '—'} (не редактируется)</span>
            </div>
            <button type="button" className="editBtn" onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
