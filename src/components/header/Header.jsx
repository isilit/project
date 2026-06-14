import React from 'react';
import './Header.css';
import defaultAvatar from '../../avatars/default.jpg';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { photoUrl } from '../../services/api';

function isAdminUser(user) {
  return user?.isAdminUser || user?.isAdmin || user?.group === 'Администрация';
}

export default function Header() {
  const { user } = useAuth();
  const avatarSrc = user?.photoUrl && user?.biometricVerified
    ? photoUrl(user.photoUrl)
    : defaultAvatar;

  return (
    <header className="header">
      <div className="logo">
        <Link to="/main" style={{ color: 'inherit', textDecoration: 'none' }}>
          <h2>Колледж IT TOP — журнал посещаемости</h2>
        </Link>
      </div>
      <div className="userInfo">
        {isAdminUser(user) && (
          <Link to="/admin" className="admin-link">Админка</Link>
        )}
        <img src={avatarSrc} alt="Аватар" className="avatar" />
        <div>
          <p className="name">
            <Link to="/profile" style={{ cursor: 'pointer', color: 'white', textDecoration: 'none' }}>
              {user?.lastName} {user?.firstName}
            </Link>
          </p>
          <p className="headerGroup">
            <Link to="/profile" style={{ cursor: 'pointer', color: 'white', textDecoration: 'none' }}>
              Группа: {user?.group || '—'}
            </Link>
          </p>
        </div>
      </div>
    </header>
  );
}
