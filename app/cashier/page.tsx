

"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCashierContext } from "./cashier-context";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
};

type CartItem = Product & { qty: number };

export default function CashierPage() {
  const router = useRouter();
  const { email, fullName, branch } = useCashierContext();
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<'all' | 'sales' | 'orders' | 'stock'>("all");
  const [newOrderVisible, setNewOrderVisible] = useState(true);

  // Supabase items state
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedProductsCategory, setSelectedProductsCategory] = useState<string>("All Items");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isOrderCompletionOpen, setIsOrderCompletionOpen] = useState(false);
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [isItemDetailOpen, setIsItemDetailOpen] = useState(false);
  const [completionForm, setCompletionForm] = useState({
    customerName: '',
    paymentMethod: 'Cash',
    comment: ''
  });

  // Function to fetch items from Supabase
  const fetchItems = async () => {
    setIsLoadingProducts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.error('No access token available');
        setProducts([]);
        setIsLoadingProducts(false);
        return;
      }

      const response = await fetch('/api/cashier/items', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Error fetching items:', response.statusText);
        setProducts([]);
      } else {
        const formattedProducts = await response.json();
        setProducts(formattedProducts);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch items from Supabase on mount
  useEffect(() => {
    fetchItems();
  }, []);

  // Generate categories dynamically from products
  const uniqueCategories = Array.from(new Set(products.map((p) => p.category)));
  const categories = ['All Items', ...uniqueCategories];

  // Update selected category to "All Items" if it becomes invalid
  useEffect(() => {
    if (!categories.includes(selectedProductsCategory)) {
      setSelectedProductsCategory('All Items');
    }
  }, [categories, selectedProductsCategory]);

  const filteredProducts = products.filter((product) =>
    (selectedProductsCategory === 'All Items' || product.category === selectedProductsCategory) &&
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product | CartItem) => {
    const stock = product.stock ?? 0;
    if (stock <= 0) {
      alert('This item is out of stock.');
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= stock) {
          alert(`Cannot add more than ${stock} of ${product.name}.`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, qty: Math.max(1, item.qty - 1) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartQuantity = cartItems.reduce((sum, item) => sum + item.qty, 0);

  const clearCart = () => {
    setCartItems([]);
  };

  const handleNewOrder = () => {
    console.log("🛒 Cashier Action: New Order initiated", {
      cashierEmail: email,
      cashierName: fullName,
      cashierBranch: branch,
    });
    setNewOrderVisible(true);
    router.push("/cashier");
  };

  const handleViewReports = () => {
    console.log('📊 Cashier Action: View Reports accessed', {
      cashierEmail: email,
      cashierName: fullName,
      cashierBranch: branch,
    });
    // TODO: Implement view reports functionality
  };

  const handleStockCheck = () => {
    console.log('🔄 Cashier Action: Stock Check initiated', {
      cashierEmail: email,
      cashierName: fullName,
      cashierBranch: branch,
    });
    // TODO: Implement stock check functionality
  };

  const handlePayment = () => {
    if (cartItems.length === 0) {
      alert('Cart is empty. Add items before completing the order.');
      return;
    }

    setIsOrderCompletionOpen(true);
  };

  const handleCompleteOrder = async () => {
    if (isOrderSubmitting) return;
    setIsOrderSubmitting(true);

    try {
      // Get current date and time
      const now = new Date();
      const orderDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const orderTime = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      });

      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        alert('Session expired. Please log in again.');
        return;
      }

      // Call API endpoint to create order
      const response = await fetch('/api/cashier/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          branchName: branch,
          orderDate,
          orderTime,
          items: cartItems,
          totalAmount: cartTotal,
          customerName: completionForm.customerName.trim(),
          paymentMethod: completionForm.paymentMethod,
          comment: completionForm.comment.trim(),
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Unknown error occurred';
        try {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          errorMessage = errorData.details 
            ? `${errorData.error}: ${errorData.details}` 
            : (errorData.error || 'Unknown error');
        } catch (parseErr) {
          console.error('Failed to parse error response:', parseErr);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        alert('Error creating order: ' + errorMessage);
        return;
      }

      const result = await response.json();

      console.log('✅ Order completed successfully:', {
        orderId: result.orderId,
        cashierEmail: email,
        cashierName: fullName,
        branch,
        total: cartTotal,
        itemsCount: cartItems.length,
      });

      // Clear cart and close modal
      setCartItems([]);
      setIsOrderCompletionOpen(false);
      setCompletionForm({
        customerName: '',
        paymentMethod: 'Cash',
        comment: ''
      });
      // Refresh stock values after successful order
      await fetchItems();
      alert(`Order ${result.orderId} completed successfully!`);
    } catch (err) {
      console.error('Payment error:', err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsOrderSubmitting(false);
    }
  };

  const sidebarItems = [
    {
      label: 'New Order',
      description: 'Create transaction',
      icon: '🛒',
      category: 'orders',
      onClick: handleNewOrder,
    },
    {
      label: 'Items',
      description: 'Stock list',
      icon: '📦',
      category: 'stock',
      onClick: () => router.push('/cashier/items'),
    },
    {
      label: 'Order History',
      description: 'View previous orders',
      icon: '🧾',
      category: 'orders',
      onClick: () => router.push('/cashier/orders'),
    },
  ];

  const statsCards = [
    { id: 'sales', label: "Today's Sales", value: 'GHC 0.00', category: 'sales' },
    { id: 'orders', label: 'Orders Today', value: '0', category: 'orders' },
    { id: 'stock', label: 'Items in Stock', value: '0', category: 'stock' },
  ];

  const filteredSidebarItems = sidebarItems.filter((item) => {
    const matchSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const filteredStats = statsCards.filter((card) => {
    const matchSearch = card.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === 'all' || card.category === filterCategory;
    return matchSearch && matchCategory;
  });


  return (
    <>
      <main className="min-h-screen bg-slate-100 px-0 py-0">

        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white text-lg shadow-lg hover:bg-slate-100 lg:hidden"
          aria-label="Open cart"
        >
          🛒
          {cartQuantity > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
              {cartQuantity}
            </span>
          )}
        </button>

        {isMobileCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 lg:hidden">
            <aside className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Cart Summary</h2>
                <button
                  onClick={() => setIsMobileCartOpen(false)}
                  className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  aria-label="Close cart"
                >
                  ✕
                </button>
              </div>
              <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold text-slate-700">{cartQuantity} item{cartQuantity !== 1 ? 's' : ''}</span>
                <span className="text-sm font-bold text-slate-900">GHC{cartTotal.toFixed(2)}</span>
              </div>

              {cartItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-slate-500">No items added yet.</div>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                  {cartItems.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800 truncate">{item.name}</span>
                        <button
                          onClick={() => setCartItems((prev) => prev.filter((i) => i.id !== item.id))}
                          className="h-7 w-7 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100"
                          aria-label="Delete item"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="h-7 w-7 rounded-md bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                          >
                            -
                          </button>
                          <input
                            type="text"
                            value={item.qty}
                            readOnly
                            className="w-10 rounded border border-slate-300 px-1 text-center text-xs text-slate-900"
                          />
                          <button
                            onClick={() => addToCart(item)}
                            className="h-7 w-7 rounded-md bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">GHC{(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>GHC{cartTotal.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm text-slate-600">
                  <span>Service Fee</span>
                  <span>GHC0.00</span>
                </div>
                <div className="mt-1 flex justify-between text-base font-bold text-slate-900">
                  <span>Total</span>
                  <span>GHC{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  handlePayment();
                  setIsMobileCartOpen(false);
                }}
                disabled={cartItems.length === 0}
                className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Complete Order
              </button>
              <button
                onClick={() => {
                  clearCart();
                }}
                disabled={cartItems.length === 0}
              className="mt-2 w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear Cart
              </button>
            </aside>
          </div>
        )}

        {isOrderCompletionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Complete Order</h2>
                <button
                  onClick={() => setIsOrderCompletionOpen(false)}
                  className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="modalCustomerName" className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    id="modalCustomerName"
                    type="text"
                    value={completionForm.customerName}
                    onChange={(e) => setCompletionForm(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none"
                    placeholder="Enter customer name (optional)"
                  />
                </div>

                <div>
                  <label htmlFor="modalPaymentMethod" className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    id="modalPaymentMethod"
                    value={completionForm.paymentMethod}
                    onChange={(e) => setCompletionForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="modalComment" className="block text-sm font-medium text-slate-700 mb-2">
                    Comment (Optional)
                  </label>
                  <textarea
                    id="modalComment"
                    value={completionForm.comment}
                    onChange={(e) => setCompletionForm(prev => ({ ...prev, comment: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none"
                    placeholder="Add any additional notes..."
                    rows={3}
                  />
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Total Amount</span>
                    <span className="font-semibold text-slate-900">GHC{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsOrderCompletionOpen(false)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompleteOrder}
                    disabled={isOrderSubmitting}
                    className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isOrderSubmitting ? 'Completing...' : 'Complete Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedProductsCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    selectedProductsCategory === cat ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none"
                placeholder="Search items"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <article key={product.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex h-full flex-col cursor-pointer hover:shadow-md hover:border-amber-300 transition">
                    <div onClick={() => {
                      setSelectedItem(product);
                      setIsItemDetailOpen(true);
                    }}>
                      <p className="text-[11px] text-slate-400">{product.category}</p>
                      <h3 className="text-sm font-semibold text-slate-900 break-words">{product.name}</h3>
                    </div>
                    <div className="my-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-amber-600">GHC{product.price.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0 || (cartItems.find((item) => item.id === product.id)?.qty ?? 0) >= product.stock}
                      className={`mt-auto w-full rounded-lg px-3 py-2 text-xs font-semibold text-white ${product.stock <= 0 || (cartItems.find((item) => item.id === product.id)?.qty ?? 0) >= product.stock ? 'bg-slate-300 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'}`}
                    >
                      {product.stock <= 0 ? 'Out of Stock' : (cartItems.find((item) => item.id === product.id)?.qty ?? 0) >= product.stock ? 'Max Reached' : 'Add to Order'}
                    </button>
                  </article>
                ))
              ) : (
                <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">No items match your search.</div>
              )}
            </div>
          </div>

            <aside className={`hidden lg:block rounded-xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-4 ${cartItems.length === 0 ? 'lg:h-auto' : 'lg:max-h-[calc(100vh-2rem)]'} lg:overflow-y-auto`}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Order Summary</h2>
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {cartQuantity} item{cartQuantity !== 1 ? 's' : ''}
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-slate-500">No items added yet.</div>
            ) : (
              <ul className="space-y-2 max-h-[calc(100vh-24rem)] overflow-y-auto">
                {cartItems.map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800 truncate">{item.name}</span>
                      <button
                        onClick={() => setCartItems((prev) => prev.filter((i) => i.id !== item.id))}
                        className="h-7 w-7 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100"
                        aria-label="Delete item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="h-7 w-7 rounded-md bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                        >
                          -
                        </button>
                        <input
                          type="text"
                          value={item.qty}
                          readOnly
                          className="w-10 rounded border border-slate-300 px-1 text-center text-xs text-slate-900"
                        />
                        <button
                          onClick={() => addToCart(item)}
                          className="h-7 w-7 rounded-md bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">GHC{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>GHC{cartTotal.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm text-slate-600">
                <span>Service Fee</span>
                <span>GHC0.00</span>
              </div>
              <div className="mt-2 flex justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span>GHC{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={cartItems.length === 0}
              className="mt-2 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Complete Order
            </button>
            <button
              onClick={clearCart}
              disabled={cartItems.length === 0}
              className="mt-1 w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear Cart
            </button>
          </aside>
        </div>
      </main>
    </>
  );
}

