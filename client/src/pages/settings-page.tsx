
import { useState } from 'react';
import Sidebar from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

export default function SettingsPage() {
  const [categories, setCategories] = useState(['volunteer', 'donor', 'partner', 'attendee']);
  const [priorities, setPriorities] = useState(['high', 'medium', 'low']);
  const [statuses, setStatuses] = useState(['active', 'inactive', 'follow-up']);
  
  const [newCategory, setNewCategory] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const handleAdd = (type: 'category' | 'priority' | 'status', value: string) => {
    if (!value.trim()) return;
    
    switch (type) {
      case 'category':
        setCategories([...categories, value.trim()]);
        setNewCategory('');
        break;
      case 'priority':
        setPriorities([...priorities, value.trim()]);
        setNewPriority('');
        break;
      case 'status':
        setStatuses([...statuses, value.trim()]);
        setNewStatus('');
        break;
    }
  };

  const handleRemove = (type: 'category' | 'priority' | 'status', value: string) => {
    switch (type) {
      case 'category':
        setCategories(categories.filter(c => c !== value));
        break;
      case 'priority':
        setPriorities(priorities.filter(p => p !== value));
        break;
      case 'status':
        setStatuses(statuses.filter(s => s !== value));
        break;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input 
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Add new category"
                />
                <Button onClick={() => handleAdd('category', newCategory)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <div key={category} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
                    <span>{category}</span>
                    <button onClick={() => handleRemove('category', category)} className="text-gray-500 hover:text-gray-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Priorities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input 
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  placeholder="Add new priority"
                />
                <Button onClick={() => handleAdd('priority', newPriority)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {priorities.map(priority => (
                  <div key={priority} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
                    <span>{priority}</span>
                    <button onClick={() => handleRemove('priority', priority)} className="text-gray-500 hover:text-gray-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statuses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder="Add new status"
                />
                <Button onClick={() => handleAdd('status', newStatus)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {statuses.map(status => (
                  <div key={status} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
                    <span>{status}</span>
                    <button onClick={() => handleRemove('status', status)} className="text-gray-500 hover:text-gray-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
