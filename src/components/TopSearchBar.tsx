import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Briefcase,
  CheckCheck,
  Code2,
  Gamepad2,
  LogIn,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { searchPlatformOptions, type SearchEntry } from '../utils/searchIndex';
import { countUnreadNotifications, formatRelativeTime } from '../utils/notifications';
import type { AppNotification, NavSection, NotificationCategory } from '../types';

interface TopSearchBarProps {
  activeSection: NavSection;
  readinessPct: number;
  isSignedIn: boolean;
  notifications: AppNotification[];
  onSelectEntry: (entry: SearchEntry) => void;
  onSelectNotification: (notification: AppNotification) => void;
  onMarkAllNotificationsRead: () => void;
  onClearNotifications: () => void;
  onOpenSettings: () => void;
  onOpenAuthModal: () => void;
  onOpenMobileMenu: () => void;
}

function getNotificationIcon(category: NotificationCategory) {
  switch (category) {
    case 'ai':
      return Sparkles;
    case 'skill':
      return ShieldCheck;
    case 'code':
      return Code2;
    case 'job':
      return Briefcase;
    case 'game':
      return Gamepad2;
    case 'profile':
      return UserCheck;
    default:
      return Settings;
  }
}

export function TopSearchBar({
  activeSection,
  readinessPct,
  isSignedIn,
  notifications,
  onSelectEntry,
  onSelectNotification,
  onMarkAllNotificationsRead,
  onClearNotifications,
  onOpenSettings,
  onOpenAuthModal,
  onOpenMobileMenu,
}: TopSearchBarProps) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => searchPlatformOptions(query, 9), [query]);
  const unreadCount = useMemo(() => countUnreadNotifications(notifications), [notifications]);

  // Close search & notifications popovers on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const chooseEntry = (entry: SearchEntry) => {
    onSelectEntry(entry);
    setQuery('');
    setDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setDropdownOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) => (matches.length ? (prev + 1) % matches.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        matches.length ? (prev - 1 + matches.length) % matches.length : 0,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = matches[highlightedIdx] ?? matches[0];
      if (target) chooseEntry(target);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  return (
    <div className="no-print sticky top-0 z-20 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#07090F]/95 backdrop-blur-xs">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 lg:px-10 py-3 flex items-center justify-between gap-3">
        {/* Mobile Sidebar Drawer Button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Instant Search Input + Autocomplete Results */}
        <div ref={containerRef} className="relative flex-1 max-w-2xl">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              role="searchbox"
              value={query}
              onFocus={() => {
                setDropdownOpen(true);
                setNotifOpen(false);
              }}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightedIdx(0);
                setDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search skills, games, companies, AI mentors, or settings..."
              aria-label="Global platform search"
              aria-expanded={dropdownOpen}
              aria-controls="global-search-results"
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0E131F] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-600 dark:focus:ring-blue-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setHighlightedIdx(0);
                }}
                aria-label="Clear search"
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {dropdownOpen && (
            <div
              id="global-search-results"
              role="listbox"
              aria-label="Matching platform options"
              className="absolute left-0 right-0 mt-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0E131F] shadow-xl overflow-hidden max-h-[380px] overflow-y-auto z-50"
            >
              <div className="px-3.5 py-2 border-b border-slate-100 dark:border-white/10 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>
                  {query.trim()
                    ? `${matches.length} matching option${matches.length === 1 ? '' : 's'} for "${query.trim()}"`
                    : 'Suggested Quick Jumps'}
                </span>
                <span>Click or press Enter</span>
              </div>

              {matches.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 dark:text-slate-400">
                  No matching options found for "{query}". Try searching "React", "Sudoku", "Google", "AI Mentor", or "Settings".
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {matches.map((entry, idx) => {
                    const isHighlighted = idx === highlightedIdx;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setHighlightedIdx(idx)}
                        onClick={() => chooseEntry(entry)}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                          isHighlighted
                            ? 'bg-red-50/80 dark:bg-blue-500/15'
                            : 'hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-950 dark:text-white truncate">
                              {entry.label}
                            </span>
                            <span className="text-[11px] font-medium text-red-700 dark:text-amber-400 shrink-0">
                              {entry.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {entry.description}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Readiness + Notifications Bell + Direct Settings Trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="hidden md:inline font-mono text-xs font-semibold tabular-nums text-emerald-700 dark:text-amber-400">
            {readinessPct}% Ready
          </span>

          {/* Notifications Bell Icon + Live Updates Popover */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setDropdownOpen(false);
              }}
              aria-label={
                unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'
              }
              aria-expanded={notifOpen}
              aria-haspopup="true"
              className={`relative p-2 rounded-xl border transition-colors ${
                notifOpen
                  ? 'bg-red-600 text-white border-red-600 dark:bg-blue-600 dark:border-blue-500'
                  : 'border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0E131F] text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  data-testid="unread-notifications-badge"
                  className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 dark:bg-pink-500 text-white text-[10px] font-mono font-bold tabular-nums flex items-center justify-center border border-white dark:border-[#07090F]"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="region"
                aria-label="Platform notifications"
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0E131F] shadow-2xl overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-sm font-bold text-slate-950 dark:text-white">
                      Live Platform Updates
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {unreadCount > 0
                        ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`
                        : 'All updates reviewed'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-emerald-700 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark all read</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearNotifications}
                        aria-label="Clear notifications"
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-pink-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="p-6 text-center space-y-1.5">
                    <Bell className="w-6 h-6 mx-auto text-slate-400" />
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      No updates yet
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      AI agent syncs, quiz results, coding streaks, and job applications appear here as they happen.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[360px] overflow-y-auto">
                    {notifications.map((item) => {
                      const CatIcon = getNotificationIcon(item.category);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectNotification(item);
                            setNotifOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                            item.read
                              ? 'hover:bg-slate-50 dark:hover:bg-white/5 opacity-80'
                              : 'bg-red-50/40 dark:bg-blue-500/10 hover:bg-red-50/70 dark:hover:bg-blue-500/15'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#141B2D] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 mt-0.5 text-red-600 dark:text-amber-400">
                            <CatIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-950 dark:text-white truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {formatRelativeTime(item.timestamp)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                              {item.detail}
                            </p>
                          </div>
                          {!item.read && (
                            <span
                              aria-label="Unread update"
                              className="w-2 h-2 rounded-full bg-red-600 dark:bg-pink-400 shrink-0 mt-2"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isSignedIn && (
            <button
              type="button"
              onClick={() => {
                setNotifOpen(false);
                onOpenAuthModal();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setNotifOpen(false);
              onOpenSettings();
            }}
            aria-label="Open Settings"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
              activeSection === 'settings'
                ? 'bg-red-600 text-white border-red-600 dark:bg-blue-600 dark:border-blue-500'
                : 'border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0E131F] text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
