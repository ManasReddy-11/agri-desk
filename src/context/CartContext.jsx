import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const CART_ITEM_VERSION = 2;

  const getCartStorageKey = () => {
    try {
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return 'agriDeskCart:guest';

      const user = JSON.parse(rawUser);
      const role = user?.role || user?.type || 'consumer';
      const userId = user?.id || user?._id || user?.email || 'guest';

      return `agriDeskCart:${role}:${userId}`;
    } catch (error) {
      return 'agriDeskCart:guest';
    }
  };

  const loadStoredCart = () => {
    try {
      const stored = localStorage.getItem(getCartStorageKey());
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];

      // Migrate legacy entries where quantity was copied from product stock.
      return parsed.map((item) => {
        const normalizedQty =
          item?._cartVersion === CART_ITEM_VERSION
            ? Math.max(1, Number(item?.quantity) || 1)
            : 1;

        return {
          ...item,
          quantity: normalizedQty,
          _cartVersion: CART_ITEM_VERSION,
        };
      });
    } catch (error) {
      return [];
    }
  };

  const [cartItems, setCartItems] = useState([]);

  const getItemId = (item) => item?.id || item?._id;

  const getFallbackImage = (product) => {
    const productName = (product?.name || '').toLowerCase();

    const productKeywordEmoji = [
      { keywords: ['honey'], emoji: '🍯' },
      { keywords: ['carrot'], emoji: '🥕' },
      { keywords: ['mango'], emoji: '🥭' },
      { keywords: ['milk'], emoji: '🥛' },
      { keywords: ['tomato'], emoji: '🍅' },
      { keywords: ['onion'], emoji: '🧅' },
      { keywords: ['spinach'], emoji: '🥬' },
      { keywords: ['egg'], emoji: '🥚' },
      { keywords: ['pepper'], emoji: '🫑' },
      { keywords: ['potato'], emoji: '🥔' },
      { keywords: ['apple'], emoji: '🍎' },
      { keywords: ['banana'], emoji: '🍌' },
      { keywords: ['grape'], emoji: '🍇' },
    ];

    const keywordMatch = productKeywordEmoji.find(({ keywords }) =>
      keywords.some((keyword) => productName.includes(keyword))
    );

    if (keywordMatch) return keywordMatch.emoji;

    const categoryEmoji = {
      vegetables: '🥬',
      fruits: '🍎',
      dairy: '🥛',
      grains: '🌾',
      honey: '🍯',
      spices: '🌶️',
      meat: '🍖',
    };

    return categoryEmoji[product?.category] || '🧺';
  };

  const normalizeCartItem = (product) => {
    const id = getItemId(product);

    return {
      ...product,
      id,
      image:
        product?.image ||
        product?.images?.[0]?.url ||
        product?.thumbnail ||
        getFallbackImage(product),
      farmerName:
        product?.farmerName ||
        product?.farmer?.name ||
        (typeof product?.farmer === 'string' ? product.farmer : 'Local Farmer'),
      quantity: 1,
      _cartVersion: CART_ITEM_VERSION,
    };
  };

  const addItem = (product) => {
    setCartItems((items) => {
      const normalized = normalizeCartItem(product);
      const existing = items.find((i) => i.id === normalized.id);

      if (existing) {
        return items.map((i) =>
          i.id === normalized.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      return [...items, normalized];
    });
  };

  const updateQuantity = (id, delta) => {
    setCartItems((items) =>
      items
        .map((i) =>
          i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id) => {
    setCartItems((items) => items.filter((i) => i.id !== id));
  };

  const clearCart = () => setCartItems([]);

  const totalPrice = cartItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  useEffect(() => {
    setCartItems(loadStoredCart());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(getCartStorageKey(), JSON.stringify(cartItems));
    } catch (error) {
      // Ignore storage write failures to keep cart functional in-memory.
    }
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{ cartItems, addItem, updateQuantity, removeItem, clearCart, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
