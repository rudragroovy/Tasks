import { motion } from 'framer-motion';
import { Bell, LogOut } from 'lucide-react';

export default function SharedNavbar({
  user,
  onLogoClick,
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
  const displayDoctorName = doctorName || user?.name || '';
  const avatarLetter = displayDoctorName.replace('Dr. ', '').charAt(0) || (isDoctor ? 'D' : 'U');
  const roleText = isDoctor ? 'Doctor' : 'Patient';
  // Handle status styling
  const statusConfig = statusOverride || {
    text: isOnline ? 'Accepting' : 'Offline',
    bg: isOnline ? '#f0fdf4' : '#f8fafc',
    borderColor: isOnline ? '#bbf7d0' : '#e2e8f0',
    color: isOnline ? '#059669' : '#64748b',
    ping: isOnline,
    dotColor: isOnline ? '#059669' : '#94a3b8'
  };

  return (
    <header className={className}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={onLogoClick}>
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-health-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm">
            MD
          </div>
          <span className="font-heading font-black text-slate-900 text-lg tracking-tight hidden sm:block">CareBridge</span>
        </div>

        {/* Center nav links */}
        <div className="hidden md:flex flex-1 items-center justify-center gap-3 lg:gap-6 min-w-0">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => onTabClick && onTabClick(item.key)}
                className={`font-bold text-sm flex items-center gap-1.5 transition-colors cursor-pointer relative ${
                  activeTab === item.key ? 'text-primary-700' : 'text-slate-500 hover:text-primary-600'
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
                {activeTab === item.key && (
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
          <button className="text-slate-400 hover:text-slate-600 relative cursor-pointer">
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

          <button onClick={onLogout} className="ml-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer" title="Sign Out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile tab bar */}
      {showMobileTabs && navItems.length > 0 && (
        <div className="md:hidden flex border-t border-slate-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => onTabClick && onTabClick(item.key)}
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
