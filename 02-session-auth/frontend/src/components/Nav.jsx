import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Nav({ user }) {
  const navigate = useNavigate();

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    navigate('/login', { state: { reason: { code: 'LOGOUT', error: 'You signed out.' } } });
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/" className="wordmark">Harbor</NavLink>
        {user && (
          <nav className="nav-links">
            {user.role === 'admin' ? (
              <NavLink to="/admin">Security console</NavLink>
            ) : (
              <NavLink to="/account">Accounts</NavLink>
            )}
          </nav>
        )}
        <div className="nav-end">
          {user && (
            <>
              <span className="nav-user">
                {user.name}
                <span className={`role role-${user.role}`}>
                  {user.role === 'admin' ? 'Admin' : 'Customer'}
                </span>
              </span>
              <button className="link-button" onClick={logout}>Sign out</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
