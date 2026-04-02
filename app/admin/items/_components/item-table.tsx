'use client';

import { useRouter } from 'next/navigation';
import type { ItemRow } from '../item-data';

interface ItemTableProps {
  items: ItemRow[];
}

export function ItemTable({ items }: ItemTableProps) {
  const router = useRouter();

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">No items match the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-50">
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Date Added
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Item Added By
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Branch
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Category
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Size
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Stock
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Price
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className="transition-colors hover:bg-slate-50/60 border-slate-100"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-slate-900">
                      {item.timeAdded.date}
                    </span>
                    <span className="text-xs text-slate-500">{item.timeAdded.time}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-700">
                    {item.addedBy}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-slate-900">
                    {item.branch}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-slate-900">
                    {item.name}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-700">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-700">
                    {item.size}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {item.stock}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-slate-900">
                    {item.price}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/items/${item.id}/edit`)}
                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg transition-all hover:bg-blue-100 hover:border-blue-300 active:scale-95"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
