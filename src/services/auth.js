/**
 * MallMatrix Authentication Service (Mock / API client)
 * Handles session storage, demo credentials validation, and authentication state.
 * Structured for drop-in replacement with real REST / GraphQL backend APIs.
 */

import { getProfile, getSavedAvatar } from './profile.js';

const STORAGE_KEY = 'mallmatrix_auth_session';

export const DEMO_CREDENTIALS = {
  email: 'admin@mallmatrix.com',
  password: 'Admin@123',
  user: {
    name: 'Alex Rivera',
    role: 'Mall Operations Lead',
    email: 'admin@mallmatrix.com',
    avatar: '/mallmatrix_logo.jpg'
  }
};

/**
 * Authenticate user with email and password
 * @param {string} email 
 * @param {string} password 
 * @param {boolean} rememberMe 
 * @returns {Promise<{ success: boolean, user?: object, token?: string, error?: string }>}
 */
export async function login(email, password, rememberMe = false) {
  // Simulate network latency (400ms)
  await new Promise(resolve => setTimeout(resolve, 400));

  const trimmedEmail = (email || '').trim().toLowerCase();
  const trimmedPassword = (password || '').trim();

  if (
    trimmedEmail === DEMO_CREDENTIALS.email.toLowerCase() &&
    trimmedPassword === DEMO_CREDENTIALS.password
  ) {
    const session = {
      token: 'mock_jwt_token_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
      user: { ...DEMO_CREDENTIALS.user },
      loginTime: new Date().toISOString(),
      rememberMe: Boolean(rememberMe)
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Unable to persist session to localStorage', e);
    }

    return {
      success: true,
      user: session.user,
      token: session.token
    };
  }

  return {
    success: false,
    error: 'Incorrect email or password'
  };
}

/**
 * Log out and clear current user session
 */
export function logout() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Unable to clear session from localStorage', e);
  }
}

/**
 * Check whether a user is currently authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  const session = getSession();
  return Boolean(session && session.token);
}

/**
 * Retrieve current active session
 * @returns {object|null}
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.token) return session;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Retrieve current authenticated user profile
 * Merges session with latest profile updates and saved avatar
 * @returns {object|null}
 */
export function getCurrentUser() {
  const session = getSession();
  const profile = getProfile();
  const avatar = getSavedAvatar();

  if (session && session.user) {
    return {
      ...session.user,
      name: profile.displayName || `${profile.firstName} ${profile.lastName}`.trim() || session.user.name,
      role: profile.role || session.user.role,
      email: profile.email || session.user.email,
      avatar: avatar || profile.avatar || session.user.avatar || '/mallmatrix_logo.jpg'
    };
  }

  // Fallback to default profile if unauthenticated query is needed
  return {
    name: profile.displayName || 'Alex Rivera',
    role: profile.role || 'Mall Operations Lead',
    email: profile.email || 'admin@mallmatrix.com',
    avatar: avatar || '/mallmatrix_logo.jpg'
  };
}
