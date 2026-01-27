'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTelegramAuth = () => {
    setIsLoading(true);
    // TODO: Integrate with Telegram Mini App auth
    setTimeout(() => {
      setIsLoading(false);
      alert('Telegram авторизация будет доступна после настройки бота');
    }, 1000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className={`absolute top-0 left-1/4 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 ${mounted ? 'animate-blob' : ''}`}></div>
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 ${mounted ? 'animate-blob animation-delay-2000' : ''}`}></div>
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className={`w-full max-w-md ${mounted ? 'animate-scale-in' : 'opacity-0'}`}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-violet-600 blur-2xl opacity-40 animate-pulse"></div>
              <div className="relative w-20 h-20 mx-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center justify-center shadow-2xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-black text-white mb-2">
              Добро пожаловать!
            </h1>
            <p className="text-white/80 text-lg">
              Войдите через Telegram для доступа к VPN
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-6">
            {/* Telegram Button */}
            <button
              onClick={handleTelegramAuth}
              disabled={isLoading}
              className="w-full group relative overflow-hidden bg-gradient-to-r from-[#2481cc] to-[#1e6ba8] hover:from-[#1e6ba8] hover:to-[#2481cc] disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-5 px-6 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="text-lg">Подключаемся...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                    </svg>
                    <span className="text-lg">Войти через Telegram</span>
                  </>
                )}
              </div>
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white/5 text-white/70 rounded-full">или</span>
              </div>
            </div>

            {/* Back Button */}
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Вернуться на главную</span>
            </Link>
          </div>

          {/* Info Card */}
          <div className="mt-6 bg-blue-500/20 backdrop-blur-xl border border-blue-400/30 rounded-2xl p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-white">
                <p className="font-bold mb-2">Быстрая авторизация</p>
                <p className="text-white/80 text-sm leading-relaxed">
                  Используя Telegram, вы автоматически получаете доступ к своему аккаунту без необходимости запоминать пароли
                </p>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex justify-center gap-6 text-white/50 text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Безопасно</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Мгновенно</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
