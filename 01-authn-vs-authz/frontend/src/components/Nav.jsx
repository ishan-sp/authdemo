import { NavLink, useNavigate } from 'react-router-dom';
import { api, ROLE_LABEL } from '../api.js';

export default function Nav({ user }) {
  const navigate = useNavigate();

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    navigate('/login');
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/dashboard" className="wordmark">Pulse</NavLink>
        <nav className="nav-links">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/db">Database</NavLink>
        </nav>
        <div className="nav-end">
          {user ? (
            <>
              <span className="nav-user">
                {user.name}
                <span className={`role role-${user.role}`}>{ROLE_LABEL[user.role]}</span>
              </span>
              <button className="link-button" onClick={logout}>Sign out</button>
            </>
          ) : (
            <NavLink to="/login">Sign in</NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
