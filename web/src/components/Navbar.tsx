import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/bonds', label: 'My Bonds' },
  { to: '/results', label: 'Results' },
  { to: '/matches', label: 'My Wins' },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { pathname } = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 max-w-4xl flex items-center justify-between h-14">
        <Link to="/" className="font-bold text-brand-600 text-lg">
          BondCheck BD
        </Link>
        <div className="flex items-center gap-1">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                pathname === to
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {label}
            </Link>
          ))}
          <span className="ml-2 text-sm text-gray-500">{user?.name}</span>
          <button
            onClick={logout}
            className="ml-2 text-sm text-gray-500 hover:text-red-600 px-2 py-1 rounded"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
