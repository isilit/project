import Header from '../../components/header/Header';
import AttendanceChart from '../../components/attendanceChart/AttendanceChart';
import Group from '../../components/group/Group';
import BiometricBlock from '../../components/biometric/BiometricBlock';

export default function MainPage() {
  return (
    <div className="app">
      <Header />
      <BiometricBlock />
      <AttendanceChart />
      <Group />
    </div>
  );
}