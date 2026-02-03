import React, { createContext, useContext, useState, useEffect } from 'react';
import { signIn, signUp, signOut, fetchAuthSession, fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in with Cognito
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        const session = await fetchAuthSession();
        const attributes = await fetchUserAttributes();
        
        if (session.tokens) {
          const token = session.tokens.idToken.toString();
          const groups = session.tokens.idToken.payload['cognito:groups'] || [];
          const role = groups[0] || 'buyer'; // Default to buyer if no group
          
          const userData = {
            id: currentUser.userId,
            email: attributes.email,
            role: role
          };
          
          // Store token and user data
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          setUser(userData);
        }
      } catch (error) {
        // User not logged in
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
      setLoading(false);
    };
    
    checkUser();
  }, []);

  const login = async (email, password) => {
    try {
      // First try to sign out if there's an existing session
      try {
        await signOut();
      } catch (e) {
        // Ignore signout errors
      }
      
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password: password
      });
      
      if (isSignedIn) {
        // Get user session and attributes
        const session = await fetchAuthSession();
        const attributes = await fetchUserAttributes();
        const currentUser = await getCurrentUser();
        
        const token = session.tokens.idToken.toString();
        const groups = session.tokens.idToken.payload['cognito:groups'] || [];
        const role = groups[0] || 'buyer';
        
        const userData = {
          id: currentUser.userId,
          email: attributes.email,
          role: role
        };
        
        // Store token and user data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(userData);
        toast.success('Login successful!');
        return userData;
      }
    } catch (error) {
      const message = error.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: userData.email,
        password: userData.password,
        options: {
          userAttributes: {
            email: userData.email
          }
        }
      });
      
      toast.success('Registration successful! Please check your email for verification code.');
      return { isSignUpComplete, userId, nextStep };
    } catch (error) {
      const message = error.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSeller: user?.role === 'seller',
    isBuyer: user?.role === 'buyer'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
