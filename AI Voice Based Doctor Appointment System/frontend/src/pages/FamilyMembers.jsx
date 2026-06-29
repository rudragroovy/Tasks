import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { TopHeader } from '../components/ui/top-header';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const emptyForm = {
  profilePictureUrl: '',
  givenName: '',
  secondaryName: '',
  familyName: '',
  noFamilyName: false,
  relation: '',
  gender: '',
  dateOfBirth: '',
  phoneCode: '+61',
  phone: '',
  email: '',
  address: '',
  ctgIslandOrigin: '',
  allergies: '',
  medicareCardNumber: '',
  medicareIrn: '',
  dvaCardNumber: '',
  dvaCardColor: '',
  currentGpName: '',
  currentGpEmail: '',
  partnerCode: '',
  noCurrentGpDetails: false,
  healthIdentifierType: 'Medicare Number',
  saveHealthIdentifier: false,
  onBehalfOfFamilyMember: true,
  patientConsentGiven: false,
};

function asString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function formatDate(dateValue) {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return asString(dateValue, '-');
  return date.toLocaleDateString();
}

export default function FamilyMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    }),
    []
  );

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/family-members`, { headers });
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch family members', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateField('profilePictureUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await axios.post(`${API_URL}/api/family-members`, form, { headers });
      setMessage('Family member saved successfully.');
      setShowForm(false);
      resetForm();
      await fetchMembers();
    } catch (error) {
      console.error('Failed to save family member', error);
      setMessage(error?.response?.data?.error || 'Could not save family member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this family member?')) return;
    try {
      await axios.delete(`${API_URL}/api/family-members/${id}`, { headers });
      await fetchMembers();
    } catch (error) {
      console.error('Failed to delete family member', error);
      window.alert(error?.response?.data?.error || 'Could not delete family member.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-slate-900">
      <TopHeader />

      <main className="mx-auto max-w-[1400px] px-5 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-[26px] font-black text-slate-900">Family Information</h1>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-extrabold text-white transition hover:brightness-110"
              onClick={() => {
                setShowForm((prev) => !prev);
                setMessage('');
              }}
            >
              <Plus size={16} />
              {showForm ? 'Close Form' : 'Add Family Member'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 font-black text-slate-700">Name</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-black text-slate-700">Email</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-black text-slate-700">Date of Birth</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-black text-slate-700">Phone Number</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-black text-slate-700">Relation</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-black text-slate-700">Status</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-black text-slate-700">Medicare ID</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-black text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-center font-bold text-slate-500" colSpan={8}>
                      Loading...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center font-bold text-slate-500" colSpan={8}>
                      No Data
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/70">
                      <td className="border-b border-slate-100 px-4 py-3 font-semibold">{member.name || '-'}</td>
                      <td className="border-b border-slate-100 px-4 py-3">{member.email || '-'}</td>
                      <td className="border-b border-slate-100 px-4 py-3">{formatDate(member.dateOfBirth)}</td>
                      <td className="border-b border-slate-100 px-4 py-3">{member.phone || '-'}</td>
                      <td className="border-b border-slate-100 px-4 py-3">{member.relation || '-'}</td>
                      <td className="border-b border-slate-100 px-4 py-3">{member.status || 'Active'}</td>
                      <td className="border-b border-slate-100 px-4 py-3">{member.medicareId || '-'}</td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50"
                          onClick={() => handleDelete(member.id)}
                          aria-label={`Delete ${member.name || 'family member'}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {showForm ? (
          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <h2 className="mb-4 text-xl font-black text-slate-900">Add Family Member</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Profile Pictures (Optional)</p>
                <div className="flex items-center gap-4">
                  <label className="relative block h-20 w-20 cursor-pointer overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
                    {form.profilePictureUrl ? (
                      <img src={form.profilePictureUrl} alt="preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Calendar size={18} />
                      </div>
                    )}
                    <input type="file" accept="image/*" hidden onChange={handlePhotoSelect} />
                  </label>
                  <p className="text-sm font-semibold text-slate-500">Upload a clear profile photo.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Given Name *</span>
                  <input
                    required
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.givenName}
                    onChange={(event) => updateField('givenName', event.target.value)}
                    placeholder="Please Enter Given Name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Secondary Name</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.secondaryName}
                    onChange={(event) => updateField('secondaryName', event.target.value)}
                    placeholder="Please Enter Secondary Name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Family Name *</span>
                  <input
                    required={!form.noFamilyName}
                    disabled={form.noFamilyName}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none disabled:bg-slate-100 focus:border-primary-500"
                    value={form.familyName}
                    onChange={(event) => updateField('familyName', event.target.value)}
                    placeholder="Please Enter Family Name"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.noFamilyName}
                  onChange={(event) => updateField('noFamilyName', event.target.checked)}
                />
                I don&apos;t have a family name
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Relation *</span>
                  <select
                    required
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.relation}
                    onChange={(event) => updateField('relation', event.target.value)}
                  >
                    <option value="">Please select Relation</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Gender</span>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.gender}
                    onChange={(event) => updateField('gender', event.target.value)}
                  >
                    <option value="">Please select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Date of Birth</span>
                  <input
                    type="date"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.dateOfBirth}
                    onChange={(event) => updateField('dateOfBirth', event.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Phone Number</span>
                  <div className="flex gap-2">
                    <input
                      className="h-10 w-20 rounded-lg border border-slate-300 px-2 text-sm font-semibold outline-none focus:border-primary-500"
                      value={form.phoneCode}
                      onChange={(event) => updateField('phoneCode', event.target.value)}
                    />
                    <input
                      className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      placeholder="Please Enter Phone Number"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Email *</span>
                  <input
                    required
                    type="email"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    placeholder="Please Enter Email"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Address</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    placeholder="Address"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Eligible for CTG</span>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.ctgIslandOrigin}
                    onChange={(event) => updateField('ctgIslandOrigin', event.target.value)}
                  >
                    <option value="">Please select island origin</option>
                    <option value="Aboriginal">Aboriginal</option>
                    <option value="Torres Strait Islander">Torres Strait Islander</option>
                    <option value="Both">Both</option>
                    <option value="Not Eligible">Not Eligible</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Allergies</span>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.allergies}
                    onChange={(event) => updateField('allergies', event.target.value)}
                    placeholder="Please add allergies"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Medicare Card Number</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.medicareCardNumber}
                    onChange={(event) => updateField('medicareCardNumber', event.target.value)}
                    placeholder="Please Enter Medicare Number"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Medicare IRN</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.medicareIrn}
                    onChange={(event) => updateField('medicareIrn', event.target.value)}
                    placeholder="Please Enter Medicare IRN"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">DVA Card Number</span>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.dvaCardNumber}
                    onChange={(event) => updateField('dvaCardNumber', event.target.value)}
                    placeholder="Please Enter DVA Card Number"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">DVA Card Color</span>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.dvaCardColor}
                    onChange={(event) => updateField('dvaCardColor', event.target.value)}
                  >
                    <option value="">Please select card color</option>
                    <option value="Gold">Gold</option>
                    <option value="White">White</option>
                    <option value="Orange">Orange</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Current GP Name</span>
                  <input
                    disabled={form.noCurrentGpDetails}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none disabled:bg-slate-100 focus:border-primary-500"
                    value={form.currentGpName}
                    onChange={(event) => updateField('currentGpName', event.target.value)}
                    placeholder="Please Enter GP Name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Current GP Email</span>
                  <input
                    disabled={form.noCurrentGpDetails}
                    type="email"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none disabled:bg-slate-100 focus:border-primary-500"
                    value={form.currentGpEmail}
                    onChange={(event) => updateField('currentGpEmail', event.target.value)}
                    placeholder="Please Enter GP Email"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Partner Code</span>
                  <input
                    disabled={form.noCurrentGpDetails}
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none disabled:bg-slate-100 focus:border-primary-500"
                    value={form.partnerCode}
                    onChange={(event) => updateField('partnerCode', event.target.value)}
                    placeholder="Enter Partner Code"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Health Identifier</span>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-primary-500"
                    value={form.healthIdentifierType}
                    onChange={(event) => updateField('healthIdentifierType', event.target.value)}
                  >
                    <option value="Medicare Number">Medicare Number</option>
                    <option value="DVA Number">DVA Number</option>
                    <option value="IHI Number">IHI Number</option>
                  </select>
                </label>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.noCurrentGpDetails}
                      onChange={(event) => updateField('noCurrentGpDetails', event.target.checked)}
                    />
                    I don&apos;t have Current GP details
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.saveHealthIdentifier}
                    onChange={(event) => updateField('saveHealthIdentifier', event.target.checked)}
                  />
                  Save my HI (Health Identifier) number for prescription
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.onBehalfOfFamilyMember}
                    onChange={(event) => updateField('onBehalfOfFamilyMember', event.target.checked)}
                  />
                  On behalf of family member, I am approving the appointment and creating the account.
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.patientConsentGiven}
                    onChange={(event) => updateField('patientConsentGiven', event.target.checked)}
                  />
                  The patient has given consent for the carer to act on their behalf.
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-extrabold text-slate-700"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 rounded-lg bg-primary-700 px-6 text-sm font-extrabold text-white transition hover:brightness-110 disabled:opacity-70"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Submit Form'}
                </button>
              </div>
            </form>

            {message ? (
              <p className="mt-3 text-sm font-bold text-slate-600">{message}</p>
            ) : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}
