import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck, UserCheck, Activity, Cpu, Building2 } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, onOpenSimulator }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => setCurrentView(isAdmin ? 'admin' : 'overview')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <span className="text-xl">🚽</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">Clean Management</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                IoT Edition
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">ESP32 기반 스마트 화장실 원격 관제 솔루션</p>
          </div>
        </div>

        {/* Center Nav tabs for Admin & Toilet Manager */}
        <nav className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {isAdmin && (
            <button
              onClick={() => setCurrentView('admin')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                currentView === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <span className="hidden sm:inline">관리자 콘솔</span>
                <span className="sm:hidden">콘솔</span>
              </span>
            </button>
          )}

          <button
            onClick={() => setCurrentView('overview')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              currentView === 'overview'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">{isAdmin ? '화장실 종합 현황' : '담당 구역 종합'}</span>
              <span className="sm:hidden">종합</span>
            </span>
          </button>

          <button
            onClick={() => setCurrentView('dashboard')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
              currentView === 'dashboard'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">실시간 상세 관제</span>
              <span className="sm:hidden">상세</span>
            </span>
          </button>
        </nav>

        {/* Right side Profile & Actions */}
        <div className="flex items-center space-x-3">
          {/* Simulator button */}
          <button
            onClick={onOpenSimulator}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition shadow-sm"
            title="가상 센서 패킷 테스트 도구"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">센서 시뮬레이터</span>
            <span className="sm:hidden">시뮬</span>
          </button>

          {/* User badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{user?.displayName || user?.username}</div>
              <div className="text-[10px] text-slate-500">
                {isAdmin ? (
                  <span className="text-indigo-600 font-semibold">최고 관리자 (Admin)</span>
                ) : (
                  <span className="text-emerald-600 font-semibold">화장실 담당 관리자</span>
                )}
              </div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
              isAdmin ? 'bg-indigo-600' : 'bg-emerald-600'
            }`}>
              {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
