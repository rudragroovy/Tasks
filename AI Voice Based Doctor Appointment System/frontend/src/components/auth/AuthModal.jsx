import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Login from '../../pages/Login';
import Register from '../../pages/Register';

function resolvePostAuthPath(user, redirectTo) {
  const isInvalidRedirect =
    !redirectTo ||
    redirectTo === '/login' ||
    redirectTo === '/register';

  if (!isInvalidRedirect) return redirectTo;
  return user?.role === 'ADMIN' ? '/admin' : '/dashboard';
}

export default function AuthModal() {
  const navigate = useNavigate();
  const { user, authModal, closeAuthModal, setAuthModal } = useAuth();
  const [mode, setMode] = useState(authModal.mode === 'register' ? 'register' : 'login');
  const isOpen = authModal.open && !user;

  useEffect(() => {
    if (!authModal.open) return;
    setMode(authModal.mode === 'register' ? 'register' : 'login');
  }, [authModal.mode, authModal.open]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeAuthModal, isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const finishAuth = (resolvedUser) => {
    const nextPath = resolvePostAuthPath(resolvedUser, authModal.redirectTo);
    setAuthModal({
      open: false,
      mode: 'login',
      redirectTo: null,
    });
    navigate(nextPath, { replace: true });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        aria-label="Close authentication modal"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] cursor-pointer"
        onClick={closeAuthModal}
      />

      <div className="relative z-[1201] h-[min(780px,92vh)] w-full max-w-[1040px] overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
        <button
          type="button"
          aria-label="Close authentication modal"
          className="absolute right-3 top-3 z-[1202] inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black/35 text-white hover:bg-black/45 cursor-pointer"
          onClick={closeAuthModal}
        >
          <X size={17} />
        </button>

        {mode === 'register' ? (
          <Register
            embedded
            onOpenLogin={() => setMode('login')}
            onAuthSuccess={finishAuth}
          />
        ) : (
          <Login
            embedded
            onOpenRegister={() => setMode('register')}
            onAuthSuccess={finishAuth}
          />
        )}
      </div>
    </div>
  );
}
