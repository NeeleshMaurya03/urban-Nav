"use client"

import { useState, useEffect } from "react";
import Link from "next/link";

type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

interface Complaint {
  id: number;
  name: string;
  type: string;
  location: string;
  status: string;
  date: string;
  urgency: UrgencyLevel;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newComplaint, setNewComplaint] = useState<Omit<Complaint, 'id'>>({
    name: '',
    type: '',
    location: '',
    urgency: 'medium',
    status: 'pending',
    date: new Date().toISOString().split('T')[0]
  });
  const itemsPerPage = 10;

  const urgencyIcons: Record<UrgencyLevel, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢'
  };

  const priority: Record<UrgencyLevel, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  // Authentication
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "urbannav@2025") {
      setIsAuthenticated(true);
    }
  };

  // Load complaints
  useEffect(() => {
    const saved = localStorage.getItem('complaints');
    if (saved) setComplaints(JSON.parse(saved));
  }, []);

  // Save complaints
  useEffect(() => {
    if (complaints.length > 0) {
      localStorage.setItem('complaints', JSON.stringify(complaints));
    }
  }, [complaints]);

  // Enhanced complaint handling
  const handleUpdate = (id: number, field: string, value: string) => {
    setComplaints(complaints.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
    setEditingId(null);
  };

  const handleResolve = (id: number) => {
    const updated = complaints.map(c => 
      c.id === id ? {...c, status: "resolved"} : c
    );
    setComplaints(updated);
  };

  const handleDelete = (id: number) => {
    const filtered = complaints.filter(c => c.id !== id);
    setComplaints(filtered);
  };

  const handleSubmitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    const complaintWithId = {
      ...newComplaint,
      id: Date.now()
    };
    setComplaints([...complaints, complaintWithId]);
    setNewComplaint({
      name: '',
      type: '',
      location: '',
      urgency: 'medium',
      status: 'pending',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Toggle sort function
  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key 
        ? prev.direction === 'asc' ? 'desc' : 'asc' 
        : 'desc'
    }));
  };

  // Sorting
  const sortedItems = [...complaints].sort((a, b) => {
    if (!sortConfig) return 0;
    
    if (sortConfig.key === 'urgency') {
      const aPriority = priority[a.urgency as UrgencyLevel];
      const bPriority = priority[b.urgency as UrgencyLevel];
      
      return sortConfig.direction === 'asc' 
        ? aPriority - bPriority 
        : bPriority - aPriority;
    }

    if (sortConfig.key === 'date') {
      const dateA = new Date(a[sortConfig.key]).getTime();
      const dateB = new Date(b[sortConfig.key]).getTime();
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }

    const aValue = a[sortConfig.key as keyof Complaint];
    const bValue = b[sortConfig.key as keyof Complaint];

    // const bValue = b[sortConfig.key];
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Search filter
  const filteredItems = sortedItems.filter(item => {
    const searchString = `${item.name} ${item.type} ${item.location} ${item.status} ${item.date} ${item.urgency}`.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0E0024] flex items-center justify-center">
        <div className="bg-white/10 p-8 rounded-xl border border-white/20 backdrop-blur-lg">
          <h2 className="text-2xl font-bold mb-4">Admin Authentication</h2>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white"
              placeholder="Enter Admin Password"
            />
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0024] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#3C1B6B] to-[#0E0024] text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-lg sticky top-0 z-10 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <div className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center bg-[#2A0B45]">
              <span className="font-bold text-purple-400">UN</span>
            </div>
          </Link>

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-all"
            >
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">
                {"AS"}
              </div>
              <span className="font-medium">Amit Sharma</span>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-black/50 backdrop-blur-lg rounded-lg shadow-xl border border-white/10">
                <div className="p-4 border-b border-white/10">
                  <p className="font-medium">Amit Sharma</p>
                  <p className="text-sm text-purple-300">Traffic Commissioner</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/admin"
                    className="block px-4 py-2 hover:bg-white/5 rounded-md transition-colors"
                  >
                    Admin Panel
                  </Link>
                  <button className="w-full text-left px-4 py-2 hover:bg-white/5 rounded-md transition-colors">
                    Profile Settings
                  </button>
                  <button className="w-full text-left px-4 py-2 hover:bg-white/5 rounded-md transition-colors">
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Admin Dashboard Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <h3 className="text-purple-400">Total Complaints</h3>
            <p className="text-3xl font-bold">{complaints.length}</p>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <h3 className="text-green-400">Resolved</h3>
            <p className="text-3xl font-bold">
              {complaints.filter(c => c.status === 'resolved').length}
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <h3 className="text-yellow-400">In Progress</h3>
            <p className="text-3xl font-bold">
              {complaints.filter(c => c.status === 'in_progress').length}
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <h3 className="text-red-400">Pending</h3>
            <p className="text-3xl font-bold">
              {complaints.filter(c => c.status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Complaint Form */}
        <div className="mb-8 bg-white/5 rounded-xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold mb-4">Submit New Complaint</h2>
          <form onSubmit={handleSubmitComplaint} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Citizen Name"
              value={newComplaint.name}
              onChange={(e) => setNewComplaint({...newComplaint, name: e.target.value})}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
              required
            />
            <select
              value={newComplaint.type}
              onChange={(e) => setNewComplaint({...newComplaint, type: e.target.value})}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
              required
            >
              <option value="">Select Type</option>
              <option>Traffic Congestion</option>
              <option>Signal Malfunction</option>
              <option>Road Damage</option>
              <option>Illegal Parking</option>
              <option>Accident Report</option>
              <option>Other</option>
            </select>
            <input
              type="text"
              placeholder="Location"
              value={newComplaint.location}
              onChange={(e) => setNewComplaint({...newComplaint, location: e.target.value})}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
              required
            />
            <select
              value={newComplaint.urgency}
              onChange={(e) => setNewComplaint({...newComplaint, urgency: e.target.value as UrgencyLevel})}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
              required
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              type="submit"
              className="md:col-span-4 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Submit Complaint
            </button>
          </form>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search complaints..."
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => toggleSort('date')}
              className={`px-4 py-2 rounded-lg transition ${
                sortConfig?.key === 'date' 
                  ? 'bg-purple-600/30 hover:bg-purple-600/40' 
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              Date {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('status')}
              className={`px-4 py-2 rounded-lg transition ${
                sortConfig?.key === 'status' 
                  ? 'bg-purple-600/30 hover:bg-purple-600/40' 
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('urgency')}
              className={`px-4 py-2 rounded-lg transition ${
                sortConfig?.key === 'urgency' 
                  ? 'bg-purple-600/30 hover:bg-purple-600/40' 
                  : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              Urgency {sortConfig?.key === 'urgency' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Enhanced Complaint Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-lg">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-semibold">Public Complaints</h2>
            <p className="text-purple-200 mt-1">
              Recent traffic-related complaints from citizens
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-sm font-medium">Citizen</th>
                  <th className="text-left px-6 py-4 text-sm font-medium">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium">Location</th>
                  <th className="text-left px-6 py-4 text-sm font-medium">Urgency</th>
                  <th className="text-left px-6 py-4 text-sm font-medium">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((complaint) => (
                  <tr key={complaint.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      {editingId === complaint.id && editingField === 'name' ? (
                        <input
                          value={complaint.name}
                          onChange={(e) => handleUpdate(complaint.id, 'name', e.target.value)}
                          onBlur={() => setEditingId(null)}
                          className="bg-white/10 text-white px-2 py-1 rounded"
                          autoFocus
                        />
                      ) : (
                        <span onClick={() => { setEditingId(complaint.id); setEditingField('name') }}>
                          {complaint.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === complaint.id && editingField === 'type' ? (
                        <select
                          value={complaint.type}
                          onChange={(e) => handleUpdate(complaint.id, 'type', e.target.value)}
                          className="bg-white/10 text-white px-2 py-1 rounded"
                          autoFocus
                        >
                          <option>Traffic Congestion</option>
                          <option>Signal Malfunction</option>
                          <option>Road Damage</option>
                          <option>Illegal Parking</option>
                          <option>Accident Report</option>
                          <option>Other</option>
                        </select>
                      ) : (
                        <span onClick={() => { setEditingId(complaint.id); setEditingField('type') }}>
                          {complaint.type}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === complaint.id && editingField === 'location' ? (
                        <input
                          value={complaint.location}
                          onChange={(e) => handleUpdate(complaint.id, 'location', e.target.value)}
                          onBlur={() => setEditingId(null)}
                          className="bg-white/10 text-white px-2 py-1 rounded"
                          autoFocus
                        />
                      ) : (
                        <span onClick={() => { setEditingId(complaint.id); setEditingField('location') }}>
                          {complaint.location}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === complaint.id && editingField === 'urgency' ? (
                        <select
                          value={complaint.urgency}
                          onChange={(e) => handleUpdate(complaint.id, 'urgency', e.target.value)}
                          className="bg-white/10 text-white px-2 py-1 rounded"
                          autoFocus
                        >
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-2" onClick={() => { setEditingId(complaint.id); setEditingField('urgency') }}>
                          <span className="text-lg">{urgencyIcons[complaint.urgency as UrgencyLevel]}</span>
                          <span className="capitalize">{complaint.urgency}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        complaint.status === "resolved" 
                          ? "bg-green-400/20 text-green-400" 
                          : complaint.status === "in_progress" 
                            ? "bg-yellow-400/20 text-yellow-400" 
                            : "bg-purple-400/20 text-purple-400"
                      }`}>
                        {complaint.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">{complaint.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolve(complaint.id)}
                          disabled={complaint.status === "resolved"}
                          className={`px-3 py-1 rounded-md text-sm ${
                            complaint.status === "resolved" 
                              ? "bg-gray-400/20 text-gray-400 cursor-not-allowed" 
                              : "bg-purple-400/20 text-purple-400 hover:bg-purple-400/30"
                          }`}
                        >
                          ✓ Resolve
                        </button>
                        <button
                          onClick={() => handleDelete(complaint.id)}
                          className="px-3 py-1 rounded-md text-sm bg-red-400/20 text-red-400 hover:bg-red-400/30"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: Math.ceil(filteredItems.length / itemsPerPage) }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-purple-600' : 'bg-white/10'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}