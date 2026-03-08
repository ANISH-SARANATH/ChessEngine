import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GameSetup() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/game', { replace: true });
  }, [navigate]);

  return null;
}
