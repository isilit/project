import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Group.css';
import defaultAvatar from '../../avatars/default.jpg';
import { fetchUsers, photoUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Group() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!user?.group) return;

    fetchUsers(user.group)
      .then((users) => {
        const list = users
          .filter((u) => u.id !== user.id)
          .map((u) => ({
            id: u.id,
            lastName: u.lastName,
            firstName: u.firstName,
            attendance: u.attendance ?? 0,
            photoUrl: u.photoUrl,
            biometricVerified: u.biometricVerified,
          }));
        setStudents(list);
      })
      .catch(() => setStudents([]));
  }, [user?.group, user?.id]);

  function onStudentClick(student) {
    navigate(`/user/${student.id}`);
  }

  return (
    <div className="group">
      <h3>Моя группа {user?.group ? `— ${user.group}` : ''}</h3>

      <div className="students-list">
        {!user?.group && <p>Группа не назначена. Обратитесь к администратору.</p>}
        {user?.group && students.length === 0 && <p>В группе пока нет других студентов.</p>}
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
