import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const OrdersContext = createContext(null);

const ORDERS_STORAGE_KEY = 'braise_orders_v1';

const loadInitialOrders = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatPurchasedAt = () => {
  try {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const timePart = now.toTimeString().slice(0, 5); // HH:MM
    return `${datePart} ${timePart}`;
  } catch {
    return '';
  }
};

export const OrdersProvider = ({ children }) => {
  const [orders, setOrders] = useState(loadInitialOrders);

  useEffect(() => {
    try {
      window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // ignore storage errors
    }
  }, [orders]);

  const addOrder = (order) => {
    setOrders((prev) => [
      {
        ...order,
        status: order.status || 'Paid',
        purchasedAt: order.purchasedAt || formatPurchasedAt(),
      },
      ...prev,
    ]);
  };

  const clearOrders = () => setOrders([]);

  const orderCount = useMemo(
    () => orders.reduce((sum, it) => sum + (it.quantity || 1), 0),
    [orders]
  );

  const value = useMemo(
    () => ({ orders, addOrder, clearOrders, orderCount }),
    [orders, orderCount]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
};

export const useOrders = () => {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider');
  return ctx;
};
