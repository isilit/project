import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import '../../App.css';
import './RegisterForm.css';
import { registerUser } from '../../services/api';
import { hashPasswordSha256 } from '../../utils/password';

export default function RegisterForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [age, setAge] = useState('18');
  const [city, setCity] = useState('Брянск');
  const [password, setPassword] = useState('');
  const [doublePassword, setDoublePassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function checkPassword() {
    if (!password) {
      alert('Вы не ввели пароль!');
      return false;
    }
    if (!doublePassword) {
      alert('Вы не повторили пароль!');
      return false;
    }
    if (password !== doublePassword) {
      alert('Пароли не совпадают');
      return false;
    }
    return true;
  }

  function minValue() {
    if (username.length < 8) {
      alert('Юзернейм не может быть короче 8 символов!');
      return false;
    }
    if (password.length < 6) {
      alert('Пароль не может быть короче 6 символов!');
      return false;
    }
    if (firstName.length < 2 || lastName.length < 2) {
      alert('Имя и фамилия обязательны');
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

  async function handleRegister() {
    if (!checkPassword() || !minValue() || !maxValue()) return;

    setSubmitting(true);
    try {
      const passwordHash = await hashPasswordSha256(password);
      await registerUser({
        username,
        firstName,
        lastName,
        patronymic: patronymic || null,
        age: parseInt(age, 10) || 18,
        city,
        password: passwordHash,
        group: 'ИС-21',
      });
      alert('Регистрация успешна. Войдите в аккаунт.');
      navigate('/login');
    } catch (e) {
      alert(e.message || 'Ошибка регистрации');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={(e) => e.preventDefault()}>
      <div className="text">Регистрация</div>

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
        <p>Имя</p>
        <input
          type="text"
          placeholder="Иван"
          className="startInput firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>

      <div className="countainer">
        <p>Фамилия</p>
        <input
          type="text"
          placeholder="Иванов"
          className="startInput lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>

      <div className="countainer">
        <p>Отчество</p>
        <input
          type="text"
          placeholder="Иванович"
          className="startInput"
          value={patronymic}
          onChange={(e) => setPatronymic(e.target.value)}
        />
      </div>

      <div className="countainer">
        <p>Возраст</p>
        <input
          type="number"
          className="startInput"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
      </div>

      <div className="countainer">
        <p>Город</p>
        <input
          type="text"
          className="startInput"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      <div className="countainer">
        <p>Пароль</p>
        <input
          type="password"
          placeholder="Пароль"
          className="startInput password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="countainer">
        <p>Повторите пароль</p>
        <input
          type="password"
          placeholder="Повторите пароль"
          className="startInput doublePassword"
          value={doublePassword}
          onChange={(e) => setDoublePassword(e.target.value)}
        />
      </div>

      <button
        className="startButton"
        onClick={handleRegister}
        type="button"
        disabled={submitting}
      >
        {submitting ? 'Отправка...' : 'Регистрация'}
      </button>
      <div className="source">
        <Link to="/login" className="textSource" style={{ cursor: 'pointer' }}>
          Есть аккаунт? Вход
        </Link>
      </div>
    </form>
  );
}
