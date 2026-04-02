"use client";


import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import type { Branch } from "../../../lib/database.types";

// ...existing code...

export default function BranchesPage() {
  const [search, setSearch] = useState("");
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "", location: "" });
  const [branches, setBranches] = useState<Branch[]>([]);
  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  // Extract fetchBranches as a reusable function
  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/admin/branches', { headers: await getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch branches');
      const data = await response.json();
      setBranches(data || []);
      return data || [];
    } catch (error) {
      console.error('fetchBranches error:', error);
      alert('Error fetching branches');
      setBranches([]);
      return [];
    }
  };

  // Fetch branches from Supabase on mount
  useEffect(() => {
    fetchBranches();
  }, []);

  const startEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      location: branch.location || "",
    });
  };

  const cancelEditBranch = () => {
    setEditingBranch(null);
    setBranchForm({ name: "", location: "" });
  };

  const submitEditBranch = async () => {
    if (!editingBranch) return;

    try {
      const response = await fetch('/api/admin/branches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({
          id: editingBranch.id,
          name: branchForm.name,
          location: branchForm.location,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update branch');
      }

      await fetchBranches();
      setEditingBranch(null);
      setBranchForm({ name: "", location: "" });
      alert('Branch updated successfully!');
    } catch (error) {
      alert("Error updating branch: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  return (
    <main className="p-2 sm:p-4 md:p-6 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2 sm:gap-4 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Branches</h1>
        <div className="flex flex-row gap-2 w-full sm:w-auto flex-wrap">
          <button
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium text-sm px-5 py-2.5 rounded-xl shadow-md transition-colors duration-150"
            onClick={() => setShowAddBranch(true)}
          >
            + Add Branch
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-md p-2 sm:p-4 mb-8 w-full">
        <input
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
          placeholder="Search branches by name, location, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Branches Table */}
      <div className="bg-white rounded-2xl shadow-md p-2 sm:p-4 mb-8 w-full">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Branches List</h2>
        <div className="w-full overflow-x-auto">
          <table className="w-full table-auto text-sm min-w-[400px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-700">Branch ID</th>
                <th className="px-6 py-3 text-left font-medium text-slate-700">Name</th>
                <th className="px-6 py-3 text-left font-medium text-slate-700">Location</th>
                <th className="px-6 py-3 text-left font-medium text-slate-700">Date Added</th>
                <th className="px-6 py-3 text-left font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                    No branches found.
                  </td>
                </tr>
              ) : (
                branches.map((branch, idx) => (
                  <tr key={branch.id}>
                    <td className="px-6 py-3 text-slate-900">{branch.id}</td>
                    <td className="px-6 py-3 text-slate-900">{branch.name}</td>
                    <td className="px-6 py-3 text-slate-900">{branch.location}</td>
                    <td className="px-6 py-3 text-slate-900">{branch.created_at ? new Date(branch.created_at).toLocaleDateString() : ''}</td>
                    <td className="px-6 py-3 text-slate-900 flex gap-2">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                        onClick={() => startEditBranch(branch)}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this branch? This will also delete all items associated with this branch.')) {
                            try {
                              const response = await fetch(`/api/admin/branches?id=${branch.id}`, {
                                method: 'DELETE',
                                headers: await getAuthHeaders(),
                              });

                              if (!response.ok) {
                                const error = await response.json();
                                throw new Error(error.error || 'Failed to delete branch');
                              }

                              await fetchBranches();
                              alert('Branch deleted successfully!');
                            } catch (error) {
                              alert('Error deleting branch: ' + (error instanceof Error ? error.message : 'Unknown error'));
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add Branch Modal */}
      {showAddBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative animate-fadeIn" style={{ background: '#fff' }}>
            <button
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-2xl font-bold"
              onClick={() => setShowAddBranch(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Add New Branch</h2>
            <form
              onSubmit={async e => {
                e.preventDefault();
                try {
                  const response = await fetch('/api/admin/branches', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
                    body: JSON.stringify({
                      name: branchForm.name,
                      location: branchForm.location,
                    }),
                  });

                  if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to add branch');
                  }

                  await fetchBranches();
                  setShowAddBranch(false);
                  setBranchForm({ name: "", location: "" });
                  alert('Branch added successfully!');
                } catch (error) {
                  alert('Error adding branch: ' + (error instanceof Error ? error.message : 'Unknown error'));
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block font-semibold mb-1">Branch Name</label>
                <input
                  className="w-full rounded-md border px-4 py-2"
                  value={branchForm.name}
                  onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Location</label>
                <input
                  className="w-full rounded-md border px-4 py-2"
                  value={branchForm.location}
                  onChange={e => setBranchForm(f => ({ ...f, location: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-900 font-semibold hover:bg-gray-300"
                  onClick={() => setShowAddBranch(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-yellow-400 text-gray-900 font-semibold hover:bg-yellow-500"
                >
                  Add Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative animate-fadeIn" style={{ background: '#fff' }}>
            <button
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-2xl font-bold"
              onClick={cancelEditBranch}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4">Edit Branch</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await submitEditBranch();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block font-semibold mb-1">Branch ID</label>
                <input className="w-full rounded-md border px-4 py-2 bg-slate-100" value={editingBranch.id} readOnly />
              </div>
              <div>
                <label className="block font-semibold mb-1">Branch Name</label>
                <input
                  className="w-full rounded-md border px-4 py-2"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Location</label>
                <input
                  className="w-full rounded-md border px-4 py-2"
                  value={branchForm.location}
                  onChange={(e) => setBranchForm((f) => ({ ...f, location: e.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-900 font-semibold hover:bg-gray-300"
                  onClick={cancelEditBranch}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600"
                >
                  Update Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
