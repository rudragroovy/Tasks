import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServiceRoute } from '../data/servicePageContent';

export default function useServiceNavigation() {
  const navigate = useNavigate();

  return useCallback(
    (serviceName) => {
      if (!serviceName) return;
      navigate(getServiceRoute(serviceName));
    },
    [navigate]
  );
}
