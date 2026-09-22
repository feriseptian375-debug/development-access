import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Eye, EyeOff, X, ShieldCheck } from 'lucide-react';
import { loginAdmin } from '../services/api';
import { AdminUser } from '../types';
import { CourtLogo } from './CourtLogo';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Silakan masukkan username dan password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { user } = await loginAdmin(username, password);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Username atau password tidak sesuai.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          id="admin-login-modal-box"
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 text-white text-center relative">
            <button
              id="btn-close-admin-login"
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
              <ShieldCheck className="w-8 h-8 text-amber-300" />
            </div>

            <h3 className="text-xl font-black tracking-tight">LOGIN ADMINISTRATOR</h3>
            <p className="text-xs text-blue-100/90 mt-1 font-medium">
              Sistem Survei Kepuasan Pelayanan PTUN Pangkalpinang
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
            {error && (
              <div
                id="login-error-message"
                className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold text-center"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="admin-username-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  id="admin-username-input"
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-4 focus:ring-blue-100 text-sm outline-hidden font-medium"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-300 focus:border-blue-900 focus:ring-4 focus:ring-blue-100 text-sm outline-hidden font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              id="btn-submit-admin-login"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>

            <div className="pt-2 text-center">
              <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Akun default: <b>admin</b> / <b>adminptun</b>
              </span>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
