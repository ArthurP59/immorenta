'use client';

import { useState } from 'react';
import type { User } from 'firebase/auth';
import { loginWithEmail, logout, registerWithEmail } from '@/lib/auth';

export default function AuthPanel({ user }: { user: User | null }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    try {
      setLoading(true);

      if (!email.trim()) {
        alert('Renseigne un email.');
        return;
      }

      if (!password.trim()) {
        alert('Renseigne un mot de passe.');
        return;
      }

      if (password.length < 6) {
        alert('Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }

      if (mode === 'register') {
        await registerWithEmail(email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }

      setEmail('');
      setPassword('');
    } catch (error: any) {
      console.error(error);
      alert(error?.message ?? "Impossible de s'authentifier.");
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Connecté avec</div>
          <div style={{ fontWeight: 700 }}>{user.email}</div>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          style={{
            padding: '10px 14px',
            border: 'none',
            borderRadius: 10,
            background: '#111827',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setMode('login')}
          style={{
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: 10,
            background: mode === 'login' ? '#111827' : '#fff',
            color: mode === 'login' ? '#fff' : '#111827',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Connexion
        </button>

        <button
          type="button"
          onClick={() => setMode('register')}
          style={{
            padding: '10px 14px',
            border: '1px solid #d1d5db',
            borderRadius: 10,
            background: mode === 'register' ? '#111827' : '#fff',
            color: mode === 'register' ? '#fff' : '#111827',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Créer un compte
        </button>
      </div>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid #d1d5db',
          fontSize: 14,
          background: '#fff',
        }}
      />

      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid #d1d5db',
          fontSize: 14,
          background: '#fff',
        }}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        style={{
          padding: '10px 14px',
          border: 'none',
          borderRadius: 10,
          background: '#111827',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading
          ? 'Chargement...'
          : mode === 'register'
          ? 'Créer mon compte'
          : 'Me connecter'}
      </button>
    </div>
  );
}