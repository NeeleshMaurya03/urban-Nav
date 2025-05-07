"use client"

import { useEffect, useState } from "react";

interface Complaint {
  id: string;
  citizen: string;
  type: string;
  subject: string;
}

export function ComplaintsSection() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [form, setForm] = useState<{ citizen: string; type: string; subject: string }>({ citizen: '', type: '', subject: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchComplaints = () => {
    fetch('/api/complaints')
      .then(res => res.json())
      .then(data => setComplaints(data));
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      // Update existing complaint
      fetch(`/api/complaints/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      }).then(() => {
        setEditingId(null);
        setForm({ citizen: '', type: '', subject: '' });
        fetchComplaints();
      });
    } else {
      // Create new complaint
      fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      }).then(() => {
        setForm({ citizen: '', type: '', subject: '' });
        fetchComplaints();
      });
    }
  };

  const startEdit = (c: Complaint) => {
    setEditingId(c.id);
    setForm({ citizen: c.citizen, type: c.type, subject: c.subject });
  };

  return (
    <section id="complaints" className="py-12 bg-background">
      <div className="container mx-auto">
        <h2 className="text-3xl font-semibold mb-6">Public Complaints</h2>

        {/* Form for new or editing */}
        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
          <div className="flex gap-4">
            <input
              name="citizen"
              placeholder="Citizen Name"
              value={form.citizen}
              onChange={handleChange}
              required
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <input
              name="type"
              placeholder="Type"
              value={form.type}
              onChange={handleChange}
              required
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <input
              name="subject"
              placeholder="Subject"
              value={form.subject}
              onChange={handleChange}
              required
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">
              {editingId ? 'Update' : 'Submit'}
            </button>
          </div>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2">Citizen</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id} className="border-b hover:bg-muted/10">
                  <td className="px-4 py-2">{c.citizen}</td>
                  <td className="px-4 py-2">{c.type}</td>
                  <td className="px-4 py-2">{c.subject}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-blue-500 hover:underline"
                    >
                      Edit
                    </button>
                    <a
                      href={`/admin/complaints/${c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium hover:underline"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
