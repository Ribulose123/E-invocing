// utils/userStorage.ts
import { User } from '../type';

export const getUserData = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  const userData = localStorage.getItem('userData');
  if (!userData) return null;
  
  try {
    return JSON.parse(userData) as User;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const getUserId = (): string | null => {
  const userData = getUserData();
  return userData?.id || null;
};

export const getUserToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken');
};

export const clearUserData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
};

export const isAuthenticated = (): boolean => {
  return !!getUserToken() && !!getUserData();
};