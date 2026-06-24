import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlarmClock,
  Bell,
  ClipboardList,
  FileBadge2,
  FileText,
  LogOut,
  ReceiptText,
  Star,
  Video,
  Wallet,
} from 'lucide-react';
import AppIcon from './branding/AppIcon';

export default function SharedNavbar({
  user,
  onLogoClick,
  brandLabel = 'CareBridge',
  navItems = [],
  activeTab,
  onTabClick,
  isOnline,
  onToggleOnline,
  pendingCount = 0,
  doctorName,
  isDoctor = true,
  onLogout,
  statusOverride,
  showMobileTabs = false,
  className = "bg-white/85 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-40"
}) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const navbarRef = useRef(null);
  const displayDoctorName = doctorName || user?.name || '';
  const avatarLetter = displayDoctorName.replace('Dr. ', '').charAt(0) || (isDoctor ? 'D' : 'U');
  const roleText = isDoctor ? 'Doctor' : 'Patient';
  const hasMoreOption = useMemo(() => navItems.some((item) => item.key === 'more'), [navItems]);

  const moreMenuColumns = useMemo(
    () => [
      [
        {
          key: 'patient-reports',
          title: 'Patients Reports',
          description: 'Access and review detailed reports of your patients to stay informed and make accurate decisions.',
          icon: ClipboardList,
          iconWrap: 'bg-fuchsia-100 text-fuchsia-600',
        },
        {
          key: 'pay-out',
          title: 'Pay-out',
          description: 'View and track your earnings from consultations and services provided.',
          icon: Wallet,
          iconWrap: 'bg-pink-100 text-pink-600',
        },
        {
          key: 'reminders',
          title: 'Reminders',
          description: 'Create and manage reminders to stay on top of your schedule and important tasks.',
          icon: AlarmClock,
          iconWrap: 'bg-sky-100 text-sky-600',
        },
      ],
      [
        {
          key: 'medical-documents',
          title: 'Medical Documents',
          description: 'Easily create and send digital prescriptions to patients from anywhere.',
          icon: FileBadge2,
          iconWrap: 'bg-amber-100 text-amber-700',
        },
        {
          key: 'invoices',
          title: 'Invoices',
          description: 'Manage and review all your billing invoices in an organized manner.',
          icon: ReceiptText,
          iconWrap: 'bg-orange-100 text-orange-700',
        },
      ],
      [
        {
          key: 'call-recordings',
          title: 'Call Recordings',
          description: 'Easily create and send digital prescriptions to patients from anywhere.',
          icon: Video,
          iconWrap: 'bg-amber-100 text-amber-700',
          cardWrap: 'bg-slate-50',
        },
        {
          key: 'reviews-list',
          title: 'Reviews List',
          description: 'Read feedback and ratings provided by your patients to understand their experience.',
          icon: Star,
          iconWrap: 'bg-sky-100 text-sky-700',
        },
      ],
    ],
    []
  );

  useEffect(() => {
    if (!isMoreMenuOpen) return undefined;

    const onPointerDown = (event) => {
      if (!navbarRef.current?.contains(event.target)) {
        setIsMoreMenuOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [activeTab]);
  // Handle status styling
  const statusConfig = statusOverride || {
    text: isOnline ? 'Accepting' : 'Offline',
    bg: isOnline ? '#f0fdf4' : '#f8fafc',
    borderColor: isOnline ? '#bbf7d0' : '#e2e8f0',
    color: isOnline ? '#059669' : '#64748b',
    ping: isOnline,
    dotColor: isOnline ? '#059669' : '#94a3b8'
  };

  const handleNavItemClick = (itemKey) => {
    if (itemKey === 'more' && hasMoreOption) {
      setIsMoreMenuOpen((prev) => !prev);
      return;
    }
    setIsMoreMenuOpen(false);
    if (onTabClick) onTabClick(itemKey);
  };

  const handleMoreMenuItemClick = (itemKey) => {
    setIsMoreMenuOpen(false);
    if (onTabClick) onTabClick(itemKey);
  };

  return (
    <header ref={navbarRef} className={className}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        
        {/* Logo */}
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 cursor-pointer"
          onClick={onLogoClick}
          aria-label="Go to dashboard"
        >
          <AppIcon size={32} />
          <span className="font-heading font-black text-slate-900 text-lg tracking-tight hidden sm:block">{brandLabel}</span>
        </button>

        {/* Center nav links */}
        <div className="hidden md:flex min-w-0 items-center justify-start gap-3 lg:gap-6 overflow-hidden pl-2">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button type="button"
                key={item.key}
                onClick={() => handleNavItemClick(item.key)}
                className={`font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer relative ${
                  activeTab === item.key || (item.key === 'more' && isMoreMenuOpen)
                    ? 'text-primary-700'
                    : 'text-slate-500 hover:text-primary-600'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
                {item.badge > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    activeTab === item.key ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {(activeTab === item.key || (item.key === 'more' && isMoreMenuOpen)) && (
                  <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Online toggle */}
          <motion.button
            whileTap={!statusOverride ? { scale: 0.95 } : undefined}
            onClick={!statusOverride ? onToggleOnline : undefined}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs cursor-pointer transition-all border"
            aria-label={`Doctor status: ${statusConfig.text}`}
            aria-pressed={Boolean(isOnline)}
            style={{
              background: statusConfig.bg,
              borderColor: statusConfig.borderColor,
              color: statusConfig.color
            }}
          >
            <div className="relative w-2 h-2 shrink-0">
              {statusConfig.ping && <span className="absolute inset-0 rounded-full animate-ping bg-green-500 opacity-50" />}
              <span className="relative rounded-full w-2 h-2 block" style={{ background: statusConfig.dotColor || statusConfig.color }} />
            </div>
            <span className="hidden lg:inline uppercase tracking-wider text-[11px]">
              {statusConfig.text}
            </span>
          </motion.button>

          {/* Bell */}
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 relative cursor-pointer min-h-11 min-w-11"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-health-500 rounded-full border-2 border-white" />
            )}
          </button>

          <div className="w-px h-6 bg-slate-200 hidden sm:block" />

          {/* Doctor avatar */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm border border-primary-200">
              {avatarLetter}
            </div>
            <div className="hidden lg:block text-sm min-w-0">
              <p className="font-bold text-slate-900 leading-none truncate max-w-[120px]">{displayDoctorName}</p>
              <p className="text-slate-500 text-xs">{roleText}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="ml-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer min-h-11 min-w-11"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isMoreMenuOpen && hasMoreOption && (
        <div className="hidden md:block absolute left-0 right-0 top-full px-4 sm:px-6 pt-2">
          <div className="max-w-[1440px] mx-auto rounded-[0_0_28px_28px] border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(2,6,23,0.08)]">
            <div className="grid grid-cols-3 gap-x-10 gap-y-6">
              {moreMenuColumns.map((column, columnIndex) => (
                <div key={`more-col-${columnIndex}`} className="space-y-4">
                  {column.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => handleMoreMenuItemClick(item.key)}
                        className={`group w-full cursor-pointer rounded-2xl border border-transparent p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50/60 hover:shadow-sm ${item.cardWrap || ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105 ${item.iconWrap}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-base font-bold leading-tight text-slate-900 transition-colors duration-200 group-hover:text-primary-800">
                              {item.title}
                            </p>
                            <p className="mt-1 text-sm font-medium leading-snug text-slate-600 transition-colors duration-200 group-hover:text-slate-700">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile tab bar */}
      {showMobileTabs && navItems.length > 0 && (
        <div className="md:hidden flex border-t border-slate-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button type="button"
                key={item.key}
                onClick={() => handleNavItemClick(item.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  activeTab === item.key ? 'text-primary-700 border-b-2 border-primary-600' : 'text-slate-400 border-b-2 border-transparent'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {item.label}
                {item.badge > 0 && (
                  <span className="text-[9px] font-black px-1 py-0.5 rounded-full bg-slate-100 text-slate-500">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
