import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const InitialRedirector = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Only redirect if no user and not already on "/" (Landing), "/login", or "/signup"
    const isAuthPage = ['/login', '/signup', '/'].includes(location.pathname);
    if (!user.role && !isAuthPage) {
      navigate('/', { replace: true });
    }
  }, []);

  return null;
};

export default InitialRedirector;
