import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Profile.css';
import defaultAvatar from '../../avatars/default.jpg';
import { useAuth } from '../../context/AuthContext';
import { photoUrl } from '../../services/api';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const avatarSrc = user?.photoUrl && user?.biometricVerified
    ? photoUrl(user.photoUrl)
    : defaultAvatar;

  return (
    <div className="profileCountainer">
      <div className="profileHeader">
        <h3>Мой профиль</h3>
        <button className="editBtn" type="button" onClick={() => navigate('/edit')}>
          Редактировать
        </button>
      </div>

      <div className="profileContent">
        <img src={avatarSrc} alt="Мой аватар" className="profileAvatar" />

        <div className="profileInfo">
          <div className="profileRow">
            <span className="label">ФИО:</span>
            <span className="value">
              {user?.lastName} {user?.firstName} {user?.patronymic || ''}
            </span>
          </div>

          <div className="profileRow">
            <span className="label">Возраст:</span>
            <span className="value">{user?.age}</span>
          </div>

          <div className="profileRow">
            <span className="label">Город:</span>
            <span className="value">{user?.city}</span>
          </div>

          <div className="profileRow">
            <span className="label">Группа:</span>
            <span className="value">{user?.group || '—'}</span>
          </div>

          <div className="profileRow">
            <span className="label">Посещаемость:</span>
            <span className="value">{user?.attendance ?? 0}%</span>
          </div>

          <div className="profileRow">
            <span className="label">Биометрия:</span>
            <span className="value">
              {user?.biometricVerified ? 'Привязана' : 'Не пройдена'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
