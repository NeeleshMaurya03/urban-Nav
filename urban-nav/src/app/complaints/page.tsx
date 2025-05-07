"use client"
import React from "react";
import { useState } from "react";
import Link from "next/link";


export default function ComplaintForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "Traffic Congestion",
    location: "",
    description: "",
    urgency: "medium",
    files: null as FileList | null
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get existing complaints from localStorage
    const existingComplaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    
    // Create new complaint object
    const newComplaint = {
      id: Date.now(),
      ...formData,
      status: "pending",
      date: new Date().toISOString(),
      files: formData.files ? Array.from(formData.files).map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      })) : []
    };

    // Save to localStorage
    const updatedComplaints = [...existingComplaints, newComplaint];
    localStorage.setItem('complaints', JSON.stringify(updatedComplaints));

    // Reset form
    setFormData({
      name: "",
      email: "",
      type: "Traffic Congestion",
      location: "",
      description: "",
      urgency: "medium",
      files: null
    });

    alert("Complaint submitted successfully!");
  };

  return (
    <div className="min-h-screen bg-[#0E0024] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#3C1B6B] to-[#0E0024] text-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white/5 rounded-xl p-8 border border-white/10 backdrop-blur-lg">
          <div className="mb-8">
            <Link href="/" className="text-purple-400 hover:text-purple-300 flex items-center">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold mt-4">Submit Traffic Complaint</h1>
            <p className="text-purple-200 mt-2">
              Help us improve urban mobility by reporting traffic issues
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Issue Type *</label>
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
 <option className="bg-[#1c1033] text-purple-200">Traffic Congestion</option>
  <option className="bg-[#1c1033] text-purple-200">Signal Malfunction</option>
  <option className="bg-[#1c1033] text-purple-200">Road Damage</option>
  <option className="bg-[#1c1033] text-purple-200">Illegal Parking</option>
  <option className="bg-[#1c1033] text-purple-200">Accident Report</option>
  <option className="bg-[#1c1033] text-purple-200">Urban Navigation</option>
  <option className="bg-[#1c1033] text-purple-200">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Urgency Level *</label>
                <select
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={formData.urgency}
                  onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                >
  <option value="low" className="bg-[#1c1033] text-purple-200">Low</option>
  <option value="medium" className="bg-[#1c1033] text-purple-200">Medium</option>
  <option value="high" className="bg-[#1c1033] text-purple-200">High</option>
  <option value="critical" className="bg-[#1c1033] text-purple-200">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location *</label>
              <input
                type="text"
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Intersection or nearest landmark"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent h-32"
                placeholder="Provide detailed information about the issue..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Attachments (optional)</label>
              <input
                type="file"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                multiple
                onChange={(e) => setFormData({...formData, files: e.target.files})}
              />
              <p className="text-sm text-purple-300 mt-2">Max 3 files, 5MB each (images, documents)</p>
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Submit Complaint
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}