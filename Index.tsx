import { Navigate } from 'react-router-dom';
import { isLoggedIn, isManager } from '@/lib/auth';

const Index = () => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (isManager()) return <Navigate to="/manager" replace />;
  return <Navigate to="/tasks" replace />;
};

export default Index;
