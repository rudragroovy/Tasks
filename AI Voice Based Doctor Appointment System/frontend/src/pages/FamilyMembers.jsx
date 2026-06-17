import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Trash2, ShieldCheck, Activity } from 'lucide-react';
import { TopHeader } from '../components/ui/top-header';

export default function FamilyMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');

  const fetchMembers = async () => {
    try {
      const { data } = await axios.get('http://localhost:5000/api/family-members', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMembers(data);
    } catch (err) {
      console.error('Failed to fetch family members', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name || !relation || !age) return;
    
    try {
      await axios.post('http://localhost:5000/api/family-members', 
        { name, relation, age, gender },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setIsAdding(false);
      setName('');
      setRelation('');
      setAge('');
      setGender('Male');
      fetchMembers();
    } catch (err) {
      console.error('Failed to add family member', err);
      alert('Could not add family member');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this family member?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/family-members/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchMembers();
    } catch (err) {
      console.error('Failed to delete family member', err);
      alert('Could not delete family member');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <TopHeader />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-black text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary-500" />
              Family Members
            </h1>
            <p className="text-slate-500 mt-2">Manage profiles to book appointments on behalf of your family.</p>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-primary-600 hover:bg-primary-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary-600/20 flex items-center gap-2"
          >
            {isAdding ? 'Cancel' : <><UserPlus size={18} /> Add Member</>}
          </button>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-health-500" /> New Family Member
                </h3>
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-500/20" placeholder="e.g. Jane Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Relationship</label>
                    <input type="text" required value={relation} onChange={e => setRelation(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-500/20" placeholder="e.g. Mother, Son, Spouse" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Age</label>
                    <input type="number" required min="0" max="150" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-500/20" placeholder="e.g. 45" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gender</label>
                    <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 pt-2">
                    <button type="submit" className="w-full md:w-auto px-8 py-3 bg-health-600 hover:bg-health-500 text-white rounded-xl font-bold transition-all shadow-md shadow-health-600/20">
                      Save Profile
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex gap-4">
            <div className="w-64 h-32 bg-slate-200 animate-pulse rounded-2xl"></div>
            <div className="w-64 h-32 bg-slate-200 animate-pulse rounded-2xl"></div>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-700 text-lg">No family members found</h3>
            <p className="text-slate-500 mt-2 max-w-sm mx-auto">Add a family member to book appointments on their behalf using our AI Voice Triage.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {members.map(member => (
              <motion.div 
                key={member.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative group hover:border-primary-200 transition-all hover:shadow-md"
              >
                <button 
                  onClick={() => handleDelete(member.id)}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Remove Member"
                >
                  <Trash2 size={18} />
                </button>
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4 text-primary-600 font-black text-xl">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-black text-slate-900 text-lg leading-tight truncate pr-6">{member.name}</h3>
                <p className="text-primary-600 font-bold text-sm mb-3">{member.relation}</p>
                
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <div className="bg-slate-50 px-3 py-1 rounded-lg font-medium border border-slate-100">{member.age} yrs</div>
                  <div className="bg-slate-50 px-3 py-1 rounded-lg font-medium border border-slate-100">{member.gender}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
