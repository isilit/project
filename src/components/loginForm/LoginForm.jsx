import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../App.css';
import './LoginForm.css';
import { loginUser } from '../../services/api';
import { encodePasswordBase64 } from '../../utils/password';
import { useAuth } from '../../context/AuthContext';

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function minValue() {
    if (username.length < 8) {
      alert('Юзернейм не может быть короче 8 символов!');
      return false;
    }
    if (password.length < 6) {
      alert('Пароль не может быть короче 6 символов!');
      return false;
    }
    return true;
  }

  function maxValue() {
    if (username.length > 20 || password.length > 20) {
      alert('Слишком длинные поля');
      return false;
    }
    return true;
  }

  async function auth() {
    if (!minValue() || !maxValue()) return;

    setSubmitting(true);
    try {
      const encoded = encodePasswordBase64(password);
      const data = await loginUser(username, encoded);
      await login(username, encoded, data.user);
      navigate('/main');
    } catch (e) {
      alert(e.message || 'Неверный логин или пароль');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <div className="text">Вход</div>
      <div className="countainer">
        <p>Имя пользователя</p>
        <input
          type="text"
          placeholder="Имя пользователя"
          className="startInput username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="countainer">
        <p>Пароль</p>
        <input
          type="password"
          placeholder="Пароль"
          className="startInput"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="button" className="startButton" onClick={auth} disabled={submitting}>
        {submitting ? 'Вход...' : 'Вход'}
      </button>
      <div className="source">
        <Link to="/register" className="textSource" style={{ cursor: 'pointer' }}>
          Нет аккаунта? Регистрация
        </Link>
      </div>
    </form>
  );
}
