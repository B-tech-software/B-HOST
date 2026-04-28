import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import { useAuth } from './useAuth.js';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'braise_cart_v1';
const CART_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const loadInitialCart = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState(loadInitialCart);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items]);

  // When a user logs in, try to load their cart from Firestore.
  // If the server cart is older than 24 hours, clear it.
  useEffect(() => {
    const syncCartFromServer = async () => {
      if (!user) return;

      try {
        const cartRef = doc(db, 'carts', user.uid);
        const snap = await getDoc(cartRef);

        if (!snap.exists()) return;

        const data = snap.data() || {};
        const serverItems = Array.isArray(data.items) ? data.items : [];
        const updatedAt = data.updatedAt;

        let isExpired = false;
        if (updatedAt && typeof updatedAt.toMillis === 'function') {
          const ageMs = Date.now() - updatedAt.toMillis();
          if (ageMs > CART_TTL_MS) {
            isExpired = true;
          }
        }

        if (isExpired) {
          await setDoc(cartRef, { items: [], updatedAt: serverTimestamp() });
          setItems([]);
          return;
        }

        setItems(serverItems);
      } catch (err) {
        console.error('Failed to load cart from server', err);
      }
    };

    syncCartFromServer();
  }, [user]);

  // Whenever the cart changes for a logged-in user, persist it to Firestore
  // with an updated timestamp so it can be shared across devices.
  useEffect(() => {
    const persistCartToServer = async () => {
      if (!user) return;

      try {
        const cartRef = doc(db, 'carts', user.uid);
        await setDoc(cartRef, { items, updatedAt: serverTimestamp() });
      } catch (err) {
        console.error('Failed to save cart to server', err);
      }
    };

    if (user) {
      persistCartToServer();
    }
  }, [items, user]);

  const addToCart = (ticket) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.id === ticket.id);
      if (existing) {
        return prev.map((it) =>
          it.id === ticket.id ? { ...it, quantity: (it.quantity || 1) + 1 } : it
        );
      }
      return [
        ...prev,
        {
          ...ticket,
          quantity: ticket.quantity || 1,
          status: ticket.status || 'Pending',
        },
      ];
    });
  };

  const removeFromCart = (id) => {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item && item.quantity > 1) {
        return prev.map((it) =>
          it.id === id ? { ...it, quantity: it.quantity - 1 } : it
        );
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  const clearCart = () => setItems([]);

  const cartCount = useMemo(
    () => items.reduce((sum, it) => sum + (it.quantity || 1), 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, addToCart, removeFromCart, clearCart, cartCount }),
    [items, cartCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
