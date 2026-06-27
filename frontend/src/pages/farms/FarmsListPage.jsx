import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { farmAPI } from '../../lib/api';
import { Plus, Search, ChevronRight, MapPin, Trash2 } from 'lucide-react';

const statusColors = {
  enrolled: 'bg-blue-500/10 text-blue-400',
  active: 'bg-emerald-500/10 text-emerald-400',
  suspended: 'bg-red-500/10 text-red-400',
};

export default function FarmsListPage() {
  const [farms, setFarms] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, farmId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this farm? This cannot be undone.')) return;
    setDeletingId(farmId);
    try {
      await farmAPI.delete(farmId);
      setFarms(prev => prev.filter(f => f.id !== farmId));
      setTotal(prev => prev - 1);
    } catch (err) {
      alert('Failed to delete farm');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await farmAPI.list({});
        setFarms(data.farms || []);
        setTotal(data.total || 0);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = farms.filter(f =>
    !search ||
    f.farmer_full_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.farm_id?.toLowerCase().includes(search.toLowerCase()) ||
    f.village?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white">Farms</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{total} enrolled</p>
        </div>
        <button
          onClick={() => navigate('/farms/new')}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-xl transition-all"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Enrol Farm</span>
          <span className="sm:hidden">Enrol</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search farmer, farm ID, village..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Farm cards — mobile card layout */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-20" />
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
            <MapPin size={28} className="text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">{search ? 'No farms match your search' : 'No farms enrolled yet'}</p>
            <button onClick={() => navigate('/farms/new')} className="mt-3 text-emerald-400 text-sm hover:text-emerald-300">
              Enrol first farm →
            </button>
          </div>
        ) : (
          filtered.map((farm) => (
            <div
              key={farm.id}
              onClick={() => navigate(`/farms/${farm.id}`)}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 active:scale-[0.99] rounded-xl p-4 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">{farm.farmer_full_name}</span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex-shrink-0">
                      {farm.farm_id}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{farm.village}, {farm.district}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">{farm.net_eligible_area_ha?.toFixed(2) || '—'} ha</span>
                    <span className="text-xs text-gray-400">{farm.primary_crop}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[farm.status] || 'bg-gray-700 text-gray-400'}`}>
                      {farm.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleDelete(e, farm.id)}
                      disabled={deletingId === farm.id}
                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 size={13}/>
                    </button>
                    <ChevronRight size={16} className="text-gray-600" />
                  </div>
                  <div className="text-[10px] text-gray-500">{farm.data_completeness_pct || 0}%</div>
                  <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${(farm.data_completeness_pct || 0) >= 90 ? 'bg-emerald-500' : (farm.data_completeness_pct || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${farm.data_completeness_pct || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}