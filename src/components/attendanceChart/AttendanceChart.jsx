import React, { useEffect, useState } from 'react';
import './AttendanceChart.css';
import { useAuth } from '../../context/AuthContext';
import { fetchUserStats } from '../../services/api';

export default function AttendanceChart() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([100, 50, 0, 100, 0]);
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

  useEffect(() => {
    if (!user?.id) return;
    fetchUserStats(user.id)
      .then((stats) => {
        const onTime = stats.withDelays || 0;
        const late = stats.delay || 0;
        const absent = stats.pass || 0;
        const total = Math.max(onTime + late + absent, 1);
        const pctOnTime = Math.round((onTime / total) * 100);
        const pctLate = Math.round((late / total) * 100);
        const pctAbsent = Math.round((absent / total) * 100);
        setAttendance([
          pctOnTime,
          pctLate,
          pctAbsent,
          Math.min(100, (stats.attendance || 0)),
          pctOnTime,
        ]);
      })
      .catch(() => {});
  }, [user?.id, user?.attendance]);

  return (
    <div className="attendanceCountainer">
      <h3>График посещаемости</h3>
      <p className="attendance-summary">
        Общий балл: {user?.attendance ?? 0}%
      </p>

      <div className="chart">
        {attendance.map((value, index) => (
          <div key={days[index]} className="item">
            <div className="container">
              <div className="bar" style={{ height: `${value}%` }} />
            </div>
            <p className="day">{days[index]}</p>
            <span className="numberValue">{value}%</span>
          </div>
        ))}
      </div>
      <div className="explan">
        <div className="explanText1">100 — посещение без опозданий</div>
        <div className="explanText2">50 — посещение с опозданием</div>
        <div className="explanText3">0 — пропуск</div>
      </div>
    </div>
  );
}
