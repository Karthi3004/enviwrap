import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { farmAPI } from '../../lib/api';
import { Plus, Search, Filter, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';

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
  const [district, setDistrict] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await farmAPI.list({ district: district || undefined });
        setFarms(data.farms || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [district]);

  const filtered = farms.filter(f =>
    !search ||
    f.farmer_full_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.farm_id?.toLowerCase().includes(search.toLowerCase()) ||
    f.village?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Farms</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} farms enrolled</p>
        </div>
        <button
          onClick={() => navigate('/farms/new')}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Enrol Farm
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search farmer, farm ID, village..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={district}
          onChange={e => setDistrict(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Districts</option>
          <option>Coimbatore</option>
          <option>Erode</option>
          <option>Tiruppur</option>
          <option>Salem</option>
          <option>Namakkal</option>
          <option>Dharmapuri</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Farm ID</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Farmer</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Village / District</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Area (ha)</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Completeness</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-800 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-600">
                  {search ? 'No farms match your search' : 'No farms enrolled yet'}
                </td>
              </tr>
            ) : (
              filtered.map((farm) => (
                <tr
                  key={farm.id}
                  onClick={() => navigate(`/farms/${farm.id}`)}
                  className="border-b border-gray-800/50 hover:bg-gray-800/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-emerald-400">{farm.farm_id}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-200 font-medium">{farm.farmer_full_name}</div>
                    <div className="text-gray-600 text-xs">{farm.farmer_phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-300">{farm.village}</div>
                    <div className="text-gray-600 text-xs">{farm.district}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {farm.net_eligible_area_ha?.toFixed(2) || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-16">
                        <div
                          className={`h-full rounded-full ${
                            (farm.data_completeness_pct || 0) >= 90 ? 'bg-emerald-500' :
                            (farm.data_completeness_pct || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${farm.data_completeness_pct || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{farm.data_completeness_pct || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[farm.status] || 'bg-gray-700 text-gray-400'}`}>
                      {farm.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <ChevronRight size={14} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
