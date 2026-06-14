import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/header/Header';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAdminData,
  adminUpdateAccount,
  adminDeleteAccount,
  adminCreateGroup,
  adminUpdateGroup,
  adminDeleteGroup,
  fetchGroups,
} from '../../services/api';
import './AdminPage.css';

const ACCOUNT_FIELDS = [
  'username', 'firstName', 'lastName', 'patronymic', 'age', 'city', 'group',
  'attendance', 'delay', 'withDelays', 'pass', 'biometricVerified', 'isAdmin',
];

function isAdminUser(user) {
  return user?.isAdminUser || user?.isAdmin || user?.group === 'Администрация';
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('accounts');
  const [data, setData] = useState({ accounts: [], persons: [], faces: [], groups: [] });
  const [groups, setGroups] = useState([]);
  const [editing, setEditing] = useState(null);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const snapshot = await fetchAdminData(user.id);
    setData(snapshot);
    const g = await fetchGroups();
    setGroups(g);
  }, [user.id]);

  useEffect(() => {
    if (!user || !isAdminUser(user)) {
      navigate('/main');
      return;
    }
    load().catch((e) => setMessage(e.message));
  }, [user, navigate, load]);

  async function saveAccount(acc) {
    try {
      await adminUpdateAccount(user.id, acc.id, acc);
      setEditing(null);
      setMessage('Аккаунт сохранён');
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function removeAccount(id) {
    if (!window.confirm('Удалить аккаунт?')) return;
    try {
      await adminDeleteAccount(user.id, id);
      setMessage('Аккаунт удалён');
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function addGroup() {
    if (!newGroup.name.trim()) return;
    try {
      await adminCreateGroup(user.id, newGroup);
      setNewGroup({ name: '', description: '' });
      setMessage('Группа создана');
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function saveGroup(group) {
    try {
      await adminUpdateGroup(user.id, group.id, {
        name: group.name,
        description: group.description,
      });
      setMessage('Группа обновлена');
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function removeGroup(id) {
    if (!window.confirm('Удалить группу? У студентов группа будет сброшена.')) return;
    try {
      await adminDeleteGroup(user.id, id);
      setMessage('Группа удалена');
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }

  if (!user || !isAdminUser(user)) return null;

  return (
    <div className="app">
      <Header />
      <div className="admin-page">
        <h2>Админ-панель</h2>
        <p className="admin-hint">Редактирование базы данных и управление группами</p>

        <div className="admin-tabs">
          <button type="button" className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>
            Accounts ({data.accounts.length})
          </button>
          <button type="button" className={tab === 'groups' ? 'active' : ''} onClick={() => setTab('groups')}>
            Groups ({groups.length})
          </button>
          <button type="button" className={tab === 'persons' ? 'active' : ''} onClick={() => setTab('persons')}>
            persons ({data.persons.length})
          </button>
          <button type="button" className={tab === 'faces' ? 'active' : ''} onClick={() => setTab('faces')}>
            faces ({data.faces.length})
          </button>
        </div>

        {message && <p className="admin-message">{message}</p>}

        {tab === 'accounts' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {ACCOUNT_FIELDS.map((f) => <th key={f}>{f}</th>)}
                  <th>actions</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((acc) => (
                  <tr key={acc.id}>
                    {ACCOUNT_FIELDS.map((field) => (
                      <td key={field}>
                        {editing === acc.id ? (
                          <input
                            value={acc[field] ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setData((prev) => ({
                                ...prev,
                                accounts: prev.accounts.map((a) =>
                                  a.id === acc.id
                                    ? { ...a, [field]: ['age', 'attendance', 'delay', 'withDelays', 'pass', 'biometricVerified', 'isAdmin'].includes(field) ? Number(val) || 0 : val }
                                    : a,
                                ),
                              }));
                            }}
                          />
                        ) : (
                          String(acc[field] ?? '')
                        )}
                      </td>
                    ))}
                    <td className="admin-actions">
                      {editing === acc.id ? (
                        <>
                          <button type="button" onClick={() => saveAccount(acc)}>Сохранить</button>
                          <button type="button" onClick={() => { setEditing(null); load(); }}>Отмена</button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => setEditing(acc.id)}>Изменить</button>
                          <button type="button" onClick={() => removeAccount(acc.id)}>Удалить</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'groups' && (
          <div className="admin-groups">
            <div className="admin-new-group">
              <input
                placeholder="Название группы"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              />
              <input
                placeholder="Описание"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              />
              <button type="button" onClick={addGroup}>Создать группу</button>
            </div>
            <div className="admin-group-cards">
              {groups.map((g) => (
                <div key={g.id} className="admin-group-card">
                  <input
                    value={g.name}
                    onChange={(e) => setGroups((prev) => prev.map((x) => x.id === g.id ? { ...x, name: e.target.value } : x))}
                  />
                  <input
                    value={g.description || ''}
                    onChange={(e) => setGroups((prev) => prev.map((x) => x.id === g.id ? { ...x, description: e.target.value } : x))}
                  />
                  <p>Студентов: {g.memberCount}</p>
                  <div className="admin-group-members">
                    {data.accounts
                      .filter((a) => a.group === g.name)
                      .map((a) => (
                        <span key={a.id} className="admin-member-chip">
                          {a.lastName} {a.firstName}
                        </span>
                      ))}
                  </div>
                  <div className="admin-actions">
                    <button type="button" onClick={() => saveGroup(g)}>Сохранить</button>
                    <button type="button" onClick={() => removeGroup(g.id)}>Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'persons' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>id</th><th>name</th><th>surname</th><th>job</th><th>phone</th><th>accountId</th><th>isactive</th>
                </tr>
              </thead>
              <tbody>
                {data.persons.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td><td>{p.name}</td><td>{p.surname}</td><td>{p.job}</td>
                    <td>{p.phone}</td><td>{p.accountId}</td><td>{p.isactive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'faces' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>id</th><th>persID</th><th>img</th><th>timestamp</th><th>conf</th><th>verified</th></tr>
              </thead>
              <tbody>
                {data.faces.map((f) => (
                  <tr key={f.id}>
                    <td>{f.id}</td><td>{f.persID}</td><td>{f.img}</td>
                    <td>{f.timestamp}</td><td>{f.conf}</td><td>{f.verified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
