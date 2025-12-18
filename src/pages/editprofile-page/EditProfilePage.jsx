import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './EditProfilePage.css';
import defaultAvatar from '../../avatars/default.jpg'
import { person1 } from '../../users';

export default function EditProfilePage() {
    const navigate = useNavigate();
    function onEditClick(){
        navigate('/profile')
    }
  return (
    <div className="profileCountainer">
      <div className="profileHeader">
        <h3>Режим редактирования</h3>
        <button 
          className="editBtn"
          onClick={onEditClick}
        >
          Редактировать
        </button>
      </div>
      
      <div className="profileContent">
        <img 
          src={defaultAvatar} 
          alt="Мой аватар" 
          className="profileAvatar"
        />
        
        <div className="profileInfo">
          <div className="profileRow">
            <span className="label">ФИО:</span>
            <span className="value">
              <input 
                type="text" 
                value={'Фамилия Имя Отчество'}
              />
            </span>
          </div>
          
          <div className="profileRow">
            <span className="label">Возраст:</span>
            <span className="value">
              <input 
                type="text" 
                value={person1.age}
              />
            </span>
          </div>
          
          <div className="profileRow">
            <span className="label">Город:</span>
            <span className="value">{person1.city}</span>
          </div>
          
          <div className="profileRow">
            <span className="label">Группа:</span>
            <span className="value">{person1.group}</span>
          </div>
          
          <div className="profileRow">
            <span className="label">Посещаемость:</span>
            <span className="value">{person1.attendance}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
