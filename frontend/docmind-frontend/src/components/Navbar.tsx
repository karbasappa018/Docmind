import React, { useState, useRef, useEffect } from 'react';
import {
  Brain, MessageSquare, Search, Layers, Upload, PanelLeft, FileText, ChevronRight,
  LogOut, Shield, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDocumentStore } from '../store/documentStore';
import { useAuthStore } from '../store/authStore';
import { clsx } from 'clsx';

interface NavbarProps {
  onUploadClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onUploadClick }) => {
  const { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen, documents, selectedDocumentId } = useDocumentStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const tabs: { id: 'chat' | 'search' | 'chunks'; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'chunks', label: 'Chunks', icon: Layers },
  ];

  const selectedDoc = documents.find((d) => d.id === selectedDocumentId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="flex items-center h-14 px-4 bg-[#111827] border-b border-[#1e293b] flex-shrink-0 z-20">
      {/* Left: sidebar toggle + logo */}
      <div className="flex items-center gap-3 w-64 flex-shrink-0">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 hover:bg-[#1e293b] rounded-lg transition-colors group cursor-pointer"
          title="Toggle sidebar"
        >
          <PanelLeft className={clsx('w-4 h-4 transition-colors', isSidebarOpen ? 'text-slate-400' : 'text-indigo-400')} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-500/40">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white tracking-tight">DocMind</span>
          <span className="hidden sm:block text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full">
            AI
          </span>
        </div>
      </div>

      {/* Center: tab navigation */}
      <nav className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-1 bg-[#1e293b] border border-[#334155] rounded-xl p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
                activeTab === id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Right: document context + upload + user menu */}
      <div className="flex items-center gap-2.5 justify-end w-auto min-w-[260px]">
        {selectedDoc && (
          <div className="hidden lg:flex items-center gap-1.5 bg-[#1e293b] border border-[#334155] px-2.5 py-1.5 rounded-lg max-w-[150px]">
            <FileText className="w-3 h-3 text-indigo-400 flex-shrink-0" />
            <span className="text-xs text-slate-300 truncate">{selectedDoc.filename}</span>
            <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
          </div>
        )}

        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-xl transition-all shadow-sm shadow-indigo-500/30 hover:shadow-indigo-500/40 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Upload</span>
        </button>

        {/* User Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] rounded-xl transition-all cursor-pointer group"
          >
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              {getInitials(user?.username)}
            </div>
            <span className="text-xs text-slate-200 font-medium max-w-[90px] truncate hidden md:block">
              {user?.username || 'User'}
            </span>
            <ChevronDown className={clsx('w-3 h-3 text-slate-400 transition-transform duration-150', isMenuOpen && 'rotate-180')} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#1e293b] border border-[#334155] rounded-2xl shadow-xl shadow-black/40 py-2 z-50 animate-fade-in">
              <div className="px-4 py-2.5 border-b border-[#334155]/60">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-white truncate">{user?.username}</p>
                  {user?.role && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5" />
                      {user.role}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <div className="px-2 pt-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
