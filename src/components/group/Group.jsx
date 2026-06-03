import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Group.css';
import defaultAvatar from '../../avatars/default.jpg';
import { fetchUsers, photoUrl } from '../../services/api';

export default function Group() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchUsers()
      .then((users) => {
        const list = users
          .filter((u) => u.group)
          .map((u) => ({
            id: u.id,
            lastName: u.lastName,
            firstName: u.firstName,
            attendance: u.attendance ?? 0,
            photoUrl: u.photoUrl,
            biometricVerified: u.biometricVerified,
          }));
        setStudents(list.length ? list : users.map((u) => ({
          id: u.id,
          lastName: u.lastName,
          firstName: u.firstName,
          attendance: u.attendance ?? 0,
          photoUrl: u.photoUrl,
          biometricVerified: u.biometricVerified,
        })));
      })
      .catch(() => setStudents([]));
  }, []);

  function onStudentClick(student) {
    navigate(`/user/${student.id}`);
  }

  return (
    <div className="group">
      <h3>Моя группа</h3>

      <div className="students-list">
        {students.length === 0 && <p>Нет данных. Зарегистрируйте пользователей.</p>}
        {students.map((student) => (
          <div
            key={student.id}
            className="studentCountainer"
            onClick={() => onStudentClick(student)}
            onKeyDown={(e) => e.key === 'Enter' && onStudentClick(student)}
            role="button"
            tabIndex={0}
          >
            <span className="place">#{student.id}</span>
            <img
              src={
                student.photoUrl && student.biometricVerified
                  ? photoUrl(student.photoUrl)
                  : defaultAvatar
              }
              alt="Аватар"
              className="avatar"
            />
            <div className="studentStats">
              <p className="studentName">
                {student.lastName} {student.firstName}
              </p>
              <p className="attendance">Посещаемость: {student.attendance}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
