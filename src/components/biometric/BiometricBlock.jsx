import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { photoUrl } from '../../services/api';
import defaultAvatar from '../../avatars/default.jpg';
import './BiometricBlock.css';

export default function BiometricBlock() {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const verified = Boolean(user?.biometricVerified);
  const photoSrc = user?.photoUrl ? photoUrl(user.photoUrl) : defaultAvatar;

  async function handleEnroll() {
    if (!user?.id) return;
    setBusy(true);
    setMessage('');
    try {
      if (window.electronAPI?.biometricEnroll) {
        const { result } = await window.electronAPI.biometricEnroll(user);
        if (!result?.ok) throw new Error(result?.error || 'Ошибка регистрации');
        await refreshUser(user.id);
        setMessage('Биометрия привязана к аккаунту');
      } else {
        setMessage('Запустите приложение через Electron для захвата лица');
      }
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleIdentify() {
    setBusy(true);
    setMessage('');
    try {
      if (window.electronAPI?.biometricIdentify) {
        const { result } = await window.electronAPI.biometricIdentify();
        if (!result?.ok) throw new Error(result?.error || 'Не распознано');
        setMessage(`Идентифицирован: ${result.name || 'пользователь'}`);
        if (user?.id) await refreshUser(user.id);
      } else {
        setMessage('Идентификация доступна в Electron (дочерний процесс main_logic)');
      }
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="biometric-block">
      <h3>Биометрическая идентификация</h3>

      {verified ? (
        <div className="biometric-verified">
          <img src={photoSrc} alt="Фото профиля" className="biometric-photo" />
          <p>Лицо привязано к аккаунту. Посещаемость учитывается при идентификации.</p>
        </div>
      ) : (
        <p className="biometric-prompt">
          Пройдите биометрию, чтобы привязать лицо к аккаунту и ускорить отметку посещаемости.
        </p>
      )}

      <div className="biometric-actions">
        {!verified && (
          <button type="button" className="biometric-btn enroll" onClick={handleEnroll} disabled={busy}>
            Пройти биометрию
          </button>
        )}
        <button type="button" className="biometric-btn identify" onClick={handleIdentify} disabled={busy}>
          Идентификация
        </button>
      </div>

      {message && <p className="biometric-message">{message}</p>}
    </section>
  );
}
