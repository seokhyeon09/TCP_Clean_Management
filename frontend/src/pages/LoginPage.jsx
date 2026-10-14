import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Lock, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { login, quickLogin, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.message || '아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleQuick = async (type) => {
    setError('');
    try {
      await quickLogin(type);
    } catch (err) {
      setError('빠른 로그인에 실패했습니다. 백엔드 서버 상태를 확인해주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 selection:bg-sky-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 items-center justify-center text-3xl shadow-xl shadow-sky-500/20 mb-4 ring-4 ring-white/10">
          🚽
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Clean Management
        </h2>
        <p className="mt-2 text-sm text-sky-200">
          ESP32 IoT 기반 스마트 화장실 환경 관제 플랫폼
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl border border-white/20 sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
              <span>{error}</span>
            </div>
          )}

          {/* Quick Login Presets for testing */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center space-x-1.5 mb-2.5 text-xs font-bold text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>테스트용 간편 로그인</span>
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuick('admin')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 transition shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>👑 웹 관리자 (전체 권한 및 기기 등록)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
              </button>
              <button
                type="button"
                onClick={() => handleQuick('toilet1')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 transition shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>🚻 화장실 1 관리자 (toilet1)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              <button
                type="button"
                onClick={() => handleQuick('toilet2')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100 transition shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  <span>🚻 화장실 2 관리자 (toilet2)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
              </button>
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-medium">또는 직접 로그인</span>
            </div>
          </div>

          {/* Regular Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">아이디</label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">비밀번호</label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition"
            >
              {loading ? '로그인 중...' : '시스템 로그인'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-sky-200/70">
          <p>© 2026 TCP IoT Clean Management System</p>
        </div>
      </div>
    </div>
  );
}
