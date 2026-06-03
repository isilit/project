import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/header/Header';
import UserProfile from '../../components/userProfile/UserProfile';
import { fetchUser } from '../../services/api';
import '../../components/userProfile/UserProfile.css';

export default function UserPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(id)
      .then((u) => setStudent({
        id: u.id,
        lastName: u.lastName,
        firstName: u.firstName,
        middleName: u.patronymic,
        age: u.age,
        city: u.city,
        group: u.group,
        attendance: u.attendance ?? 0,
        photoUrl: u.photoUrl,
        biometricVerified: u.biometricVerified,
        weeklyAttendance: [100, 50, 0, 100, 0],
        stats: {
          onTime: u.withDelays || 0,
          late: u.delay || 0,
          absent: u.pass || 0,
        },
      }))
      .catch(() => setStudent(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="app">
        <Header />
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="app">
        <Header />
        <div className="userProfileContainer userNotFound">
          <h3>Студент не найден</h3>
          <p>Пользователь с id «{id}» не существует.</p>
          <button type="button" onClick={() => navigate('/main')}>
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <UserProfile student={student} />
    </div>
  );
}
