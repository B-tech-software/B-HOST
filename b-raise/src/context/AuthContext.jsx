import React, { createContext, useEffect, useState } from 'react';
import { db } from '../config/firebase.js';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth } from '../config/firebase.js';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureUserProfile = async (firebaseUser) => {
    if (!firebaseUser) return;
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        createdAt: new Date().toISOString(),
        provider: 'google',
      });
    }
  };

  useEffect(() => {
    // Always set up the auth state listener immediately
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Handle redirect result for Google sign-in (for registration logic only)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          await ensureUserProfile(result.user);
        }
      })
      .catch((error) => {
        console.error('Google redirect sign-in failed:', error);
      });

    return unsubscribe;
  }, []);

  const signup = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password).then(
      (cred) => cred.user
    );
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password).then(
      (cred) => cred.user
    );
  };

  const logout = () => {
    return signOut(auth);
  };

    const loginWithGoogle = async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        // Popup flow is more reliable for SPAs because it avoids full-page redirect state issues.
        const result = await signInWithPopup(auth, provider);
        await ensureUserProfile(result.user);
        return result.user;
      } catch (error) {
        // If popup is blocked/closed, gracefully fallback to redirect flow.
        if (
          error?.code === 'auth/popup-blocked' ||
          error?.code === 'auth/popup-closed-by-user' ||
          error?.code === 'auth/cancelled-popup-request'
        ) {
          return signInWithRedirect(auth, provider);
        }
        throw error;
      }
    };

    const value = { user, loading, login, signup, logout, loginWithGoogle };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};


