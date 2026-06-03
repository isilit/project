import React from 'react';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';
import defaultAvatar from '../../avatars/default.jpg';
import { photoUrl } from '../../services/api';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

export default function UserProfile({ student }) {
  const navigate = useNavigate();

  return (
    <div className="userProfileContainer">
      <div className="userProfileHeader">
        <h3>Профиль студента</h3>
        <button type="button" className="backBtn" onClick={() => navigate('/main')}>
          Назад к группе
        </button>
      </div>

      <div className="userProfileContent">
        <img
          src={
            student.photoUrl && student.biometricVerified
              ? photoUrl(student.photoUrl)
              : defaultAvatar
          }
          alt="Аватар"
          className="userProfileAvatar"
        />

        <div className="userProfileInfo">
          <div className="userProfileRow">
            <span className="label">ФИО:</span>
            <span className="value">
              {student.lastName} {student.firstName} {student.middleName}
            </span>
          </div>
          <div className="userProfileRow">
            <span className="label">Возраст:</span>
            <span className="value">{student.age}</span>
          </div>
          <div className="userProfileRow">
            <span className="label">Город:</span>
            <span className="value">{student.city}</span>
          </div>
          <div className="userProfileRow">
            <span className="label">Группа:</span>
            <span className="value">{student.group}</span>
          </div>
          <div className="userProfileRow">
            <span className="label">Посещаемость:</span>
            <span className="value">{student.attendance}%</span>
          </div>
        </div>
      </div>

      <div className="userStatsGrid">
        <div className="userStatCard userStatCard--onTime">
          <span className="userStatValue">{student.stats.onTime}</span>
          <span className="userStatLabel">Без опозданий</span>
        </div>
        <div className="userStatCard userStatCard--late">
          <span className="userStatValue">{student.stats.late}</span>
          <span className="userStatLabel">С опозданием</span>
        </div>
        <div className="userStatCard userStatCard--absent">
          <span className="userStatValue">{student.stats.absent}</span>
          <span className="userStatLabel">Пропуски</span>
        </div>
      </div>

      <div className="userWeeklyChart">
        <h4>Посещаемость за неделю</h4>
        <div className="userChart">
          {student.weeklyAttendance.map((value, index) => (
            <div key={index} className="userChartItem">
              <div className="userChartBarContainer">
                <div className="userChartBar" style={{ height: `${value}%` }} />
              </div>
              <p className="userChartDay">{DAYS[index]}</p>
              <span className="userChartValue">{value}</span>
            </div>
          ))}
        </div>
        <div className="userChartLegend">
          <span className="userChartLegend--onTime">100 — без опозданий</span>
          <span className="userChartLegend--late">50 — с опозданием</span>
          <span className="userChartLegend--absent">0 — пропуск</span>
        </div>
      </div>
    </div>
  );
}
