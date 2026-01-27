'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-blue-600 to-cyan-600">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className={`absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 ${mounted ? 'animate-blob' : ''}`}></div>
        <div className={`absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 ${mounted ? 'animate-blob animation-delay-2000' : ''}`}></div>
        <div className={`absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 ${mounted ? 'animate-blob animation-delay-4000' : ''}`}></div>
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-6xl space-y-8">
          {/* Hero Section */}
          <div className={`text-center space-y-6 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-sm font-medium mb-4">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Доступно 12 серверов в 8 странах
            </div>

            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-600 blur-3xl opacity-30 animate-pulse"></div>
              <div className="relative flex items-center justify-center w-24 h-24 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <h1 className="text-6xl md:text-7xl font-black text-white tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-white">
                VPN Premium
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto font-medium">
              Безопасный доступ к интернету через Telegram Mini App
            </p>
          </div>

          {/* Main CTA */}
          <div className={`${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/auth"
                className="group relative px-8 py-4 bg-white text-violet-600 font-bold text-lg rounded-2xl shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <span className="relative flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Подключить VPN
                </span>
              </Link>
              <Link
                href="/admin"
                className="px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white font-bold text-lg rounded-2xl hover:bg-white/20 transition-all duration-300 hover:scale-105"
              >
                Админ панель
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${mounted ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'}`}>
            <div className="group relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-black text-white mb-2">12</div>
                <div className="text-white/70 font-medium">Серверов онлайн</div>
              </div>
            </div>

            <div className="group relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-black text-white mb-2">1,234</div>
                <div className="text-white/70 font-medium">Активных пользователей</div>
              </div>
            </div>

            <div className="group relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-4xl font-black text-white mb-2">99.9%</div>
                <div className="text-white/70 font-medium">Uptime гарантия</div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${mounted ? 'animate-fade-in-up animation-delay-600' : 'opacity-0'}`}>
            <div className="group relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Молниеносно</h3>
                <p className="text-white/80 text-lg">Высокая скорость подключения на всех серверах без лимитов</p>
              </div>
            </div>

            <div className="group relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 via-transparent to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Надежно</h3>
                <p className="text-white/80 text-lg">WireGuard шифрование военного уровня для вашей безопасности</p>
              </div>
            </div>

            <div className="group relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-500 hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-400/10 via-transparent to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Выгодно</h3>
                <p className="text-white/80 text-lg">Гибкие тарифы и реферальная программа с кешбэком</p>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className={`text-center space-y-4 ${mounted ? 'animate-fade-in-up animation-delay-800' : 'opacity-0'}`}>
            <div className="flex flex-wrap justify-center gap-8 text-white/60">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Без логов</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">24/7 Поддержка</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Безлимитный трафик</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
