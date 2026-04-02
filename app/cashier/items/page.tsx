'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCashierContext } from '../cashier-context';
import { supabase } from '@/lib/supabase';

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
};

export default function ItemsPage() {
  const router = useRouter();
  const { fullName, branch } = useCashierContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Fetch items from Supabase on mount
  useEffect(() => {
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
          let errorBody = null;
          try {
            errorBody = await response.json();
          } catch (parseError) {
            // ignore parse error
          }
          console.error('Error fetching items:', response.status, response.statusText, errorBody);
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

    fetchItems();
  }, []);

  // Get unique categories
  const uniqueCategories = Array.from(new Set(products.map((p) => p.category)));
  const categories = ['All', ...uniqueCategories];

  // Filter products
  const filteredProducts = products.filter((product) =>
    (selectedCategory === 'All' || product.category === selectedCategory) &&
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <>
      <div className="flex h-[calc(100vh-80px)]">
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Items Catalog</h1>
              <p className="text-sm text-slate-500">Browse items in stock and use New Order to add to cart.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none"
              placeholder="Search items..."
            />
          </div>

          {/* Category Filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === cat ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Category</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Stock</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Price</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingProducts ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-slate-500">
                      Loading items...
                    </td>
                  </tr>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{product.category}</td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-slate-800">
                        {product.stock > 0 ? product.stock : '0 (Out of stock)'}
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-semibold text-amber-600">
                        GHC{product.price.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-center text-slate-500">
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </main>
      </div>
    </>
  );
}
