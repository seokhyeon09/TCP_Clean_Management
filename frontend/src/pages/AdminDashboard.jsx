import React, { useState, useEffect } from 'react';
import { deviceApi, permissionApi, authApi, alertApi, dashboardApi, zoneApi } from '../api';
import { formatToKst } from '../utils/format';
import {
  Cpu,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  MapPin,
  Clock,
  Check,
  X,
  Layers,
} from 'lucide-react';

export default function AdminDashboard({ onSelectZone }) {
  const [activeTab, setActiveTab] = useState('devices');
  const [devices, setDevices] = useState([]);
  const [zones, setZones] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [zoneSummaries, setZoneSummaries] = useState({});
  const [loading, setLoading] = useState(false);

  // Device modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formSetCode, setFormSetCode] = useState('');
  const [formMac, setFormMac] = useState('');
  const [formZoneId, setFormZoneId] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formError, setFormError] = useState('');

  // Zone modal
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [formZoneName, setFormZoneName] = useState('');
  const [formZoneAddress, setFormZoneAddress] = useState('');
  const [formZoneDescription, setFormZoneDescription] = useState('');
  const [formZoneError, setFormZoneError] = useState('');

  // Permission modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [selectedUserForPerm, setSelectedUserForPerm] = useState(null);
  const [tempSelectedZoneIds, setTempSelectedZoneIds] = useState([]);
  const [permSaving, setPermSaving] = useState(false);

  useEffect(() => {
    loadAll();
    const timer = setInterval(() => {
      loadDevices();
      loadAlerts();
    }, 6000); // 6초마다 기기 온라인 상태 및 알림 갱신
    return () => clearInterval(timer);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDevices(),
        loadZonesAndUsers(),
        loadPermissions(),
        loadAlerts(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const res = await deviceApi.list();
      setDevices(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadZonesAndUsers = async () => {
    try {
      const [zRes, uRes] = await Promise.all([authApi.getMyZones(), authApi.getUsers()]);
      setZones(zRes.data);
      setUsers(uRes.data);
      if (zRes.data.length > 0 && !formZoneId) {
        setFormZoneId(zRes.data[0].id);
      }
      // Load summaries for zones
      loadZoneSummaries(zRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadZoneSummaries = async (zoneList) => {
    try {
      const results = await Promise.all(
        zoneList.map(async (z) => {
          try {
            const res = await dashboardApi.getZoneDashboard(z.id);
            return { id: z.id, data: res.data };
          } catch (e) {
            return null;
          }
        })
      );
      const map = {};
      results.forEach((r) => {
        if (r) map[r.id] = r.data;
      });
      setZoneSummaries(map);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await permissionApi.list();
      setPermissions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await alertApi.list();
      setAlerts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const openRegisterZoneModal = () => {
    setFormZoneName(`화장실 ${zones.length + 1}`);
    setFormZoneAddress('본관 3층');
    setFormZoneDescription('스마트 위생 관리 구역');
    setFormZoneError('');
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    setFormZoneError('');
    if (!formZoneName.trim()) {
      setFormZoneError('화장실 이름을 입력해주세요.');
      return;
    }
    try {
      await zoneApi.create({
        name: formZoneName.trim(),
        address: formZoneAddress.trim(),
        description: formZoneDescription.trim(),
      });
      setIsZoneModalOpen(false);
      await loadZonesAndUsers();
    } catch (err) {
      setFormZoneError(err.response?.data?.message || '화장실 등록에 실패했습니다.');
    }
  };

  const openRegisterModal = () => {
    setEditingDevice(null);
    setFormSetCode(`DEV-ESP32-${devices.length + 1}`);
    setFormMac('');
    setFormLabel('세면대 옆 벽면 설치');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (dev) => {
    setEditingDevice(dev);
    setFormSetCode(dev.setCode);
    setFormMac(dev.macAddress);
    setFormZoneId(dev.zoneId);
    setFormLabel(dev.installationLabel);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveDevice = async (e) => {
    e.preventDefault();
    setFormError('');

    const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    if (!macRegex.test(formMac.trim())) {
      setFormError('올바른 MAC 주소 형식(예: 98:F4:AB:6C:5A:98)을 입력해주세요.');
      return;
    }

    try {
      if (editingDevice) {
        await deviceApi.update(editingDevice.deviceSetId, {
          zoneId: Number(formZoneId),
          macAddress: formMac.trim(),
          installationLabel: formLabel.trim(),
        });
      } else {
        await deviceApi.register({
          setCode: formSetCode.trim(),
          macAddress: formMac.trim(),
          zoneId: Number(formZoneId),
          installationLabel: formLabel.trim(),
        });
      }
      setIsModalOpen(false);
      loadDevices();
    } catch (err) {
      setFormError(err.response?.data?.message || '기기 저장에 실패했습니다.');
    }
  };

  const handleDeactivate = async (deviceSetId) => {
    if (!window.confirm('정말 이 ESP32 기기를 비활성화(삭제)하시겠습니까?\n과거 센서 데이터와 이력은 안전하게 보존됩니다.')) {
      return;
    }
    try {
      await deviceApi.deactivate(deviceSetId);
      loadDevices();
    } catch (err) {
      alert(err.response?.data?.message || '기기 비활성화 실패');
    }
  };

  const openPermissionModal = (user) => {
    setSelectedUserForPerm(user);
    const grantedZoneIds = permissions
      .filter((p) => p.userId === user.id)
      .map((p) => p.zoneId);
    setTempSelectedZoneIds(grantedZoneIds);
    setIsPermModalOpen(true);
  };

  const handleToggleZoneInModal = (zoneId) => {
    setTempSelectedZoneIds((prev) =>
      prev.includes(zoneId) ? prev.filter((id) => id !== zoneId) : [...prev, zoneId]
    );
  };

  const handleSelectAllZones = () => {
    setTempSelectedZoneIds(zones.map((z) => z.id));
  };

  const handleDeselectAllZones = () => {
    setTempSelectedZoneIds([]);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPerm) return;
    setPermSaving(true);
    try {
      const currentGranted = permissions
        .filter((p) => p.userId === selectedUserForPerm.id)
        .map((p) => p.zoneId);

      const toGrant = tempSelectedZoneIds.filter((zid) => !currentGranted.includes(zid));
      const toRevoke = currentGranted.filter((zid) => !tempSelectedZoneIds.includes(zid));

      await Promise.all([
        ...toGrant.map((zid) => permissionApi.grant(selectedUserForPerm.id, zid)),
        ...toRevoke.map((zid) => permissionApi.revokeByUserAndZone(selectedUserForPerm.id, zid)),
      ]);

      await loadPermissions();
      setIsPermModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || '권한 저장 중 오류가 발생했습니다.');
    } finally {
      setPermSaving(false);
    }
  };

  const handleTogglePermission = async (userId, zoneId, isCurrentlyGranted, permissionId) => {
    try {
      if (isCurrentlyGranted) {
        if (permissionId) {
          await permissionApi.revoke(permissionId);
        } else {
          await permissionApi.revokeByUserAndZone(userId, zoneId);
        }
      } else {
        await permissionApi.grant(userId, zoneId);
      }
      loadPermissions();
    } catch (err) {
      alert(err.response?.data?.message || '권한 변경 실패');
    }
  };

  const onlineCount = devices.filter((d) => d.active && d.online).length;
  const activeCount = devices.filter((d) => d.active).length;
  const managerUsers = users.filter((u) => u.role === 'ZONE_MANAGER');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>웹 관리자 통합 관제 센터</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              Admin Console
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ESP32 디바이스 등록/제어 및 화장실 관리자 접근 권한(RBAC)을 총괄 관리합니다.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadAll}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openRegisterZoneModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>신규 화장실(구역) 등록</span>
          </button>
          <button
            onClick={openRegisterModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Cpu className="w-4 h-4" />
            <span>신규 ESP32 기기 등록</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">등록된 ESP32 세트</div>
          <div className="mt-1 text-2xl font-black text-slate-800">{activeCount} 대</div>
          <div className="text-[11px] text-slate-400 mt-0.5">총 {devices.length}건 등록됨</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">실시간 온라인 디바이스</div>
          <div className="mt-1 text-2xl font-black text-emerald-600 flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{onlineCount} 대</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">최근 30초 이내 통신</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">관제 대상 화장실 (Zone)</div>
          <div className="mt-1 text-2xl font-black text-sky-700">{zones.length} 구역</div>
          <div className="text-[11px] text-slate-400 mt-0.5">실시간 센서 연동 구역</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">화장실 담당 관리자</div>
          <div className="mt-1 text-2xl font-black text-indigo-700">{managerUsers.length} 명</div>
          <div className="text-[11px] text-slate-400 mt-0.5">현장 배정 관리자 계정</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('devices')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'devices'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>ESP32 기기 관리 ({activeCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'permissions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>관리자 권한 매핑 ({permissions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'zones'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>전체 구역 모니터링</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Device Management */}
      {activeTab === 'devices' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-800">등록된 ESP32 하드웨어 목록</h2>
              <p className="text-xs text-slate-500">MAC 주소 기반 자동 바인딩 및 화장실 배치 현황</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">상태</th>
                  <th className="px-6 py-3">세트 식별 코드</th>
                  <th className="px-6 py-3">MAC 주소</th>
                  <th className="px-6 py-3">배정 화장실 (Zone)</th>
                  <th className="px-6 py-3">설치 라벨</th>
                  <th className="px-6 py-3">연결 센서</th>
                  <th className="px-6 py-3">최근 수신 시각 (KST)</th>
                  <th className="px-6 py-3 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-400">
                      등록된 ESP32 디바이스가 없습니다. 상단 '신규 ESP32 기기 등록'을 눌러 추가하세요.
                    </td>
                  </tr>
                ) : (
                  devices.map((d) => (
                    <tr key={d.deviceSetId} className={!d.active ? 'bg-slate-50/80 opacity-60' : 'hover:bg-slate-50/50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!d.active ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>비활성</span>
                          </span>
                        ) : d.online ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>온라인</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>오프라인</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{d.setCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] text-sky-700">{d.macAddress}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-lg bg-sky-50 text-sky-800 font-semibold">
                          {d.zoneName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">{d.installationLabel}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-1">
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-semibold">DHT22</span>
                          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold">MQ-135</span>
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold">MQ-7</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {formatToKst(d.lastSeenAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        {d.active && (
                          <>
                            <button
                              onClick={() => openEditModal(d)}
                              className="text-slate-400 hover:text-sky-600 p-1"
                              title="설정 수정"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeactivate(d.deviceSetId)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="기기 비활성화(삭제)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Permission Mapping (RBAC) */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-800">화장실 담당 관리자 권한 배정 (RBAC)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                관리자별로 열람할 화장실을 배정합니다. 화장실(Zone) 수가 확장되어도 모달창을 통해 손쉽게 다중 선택할 수 있습니다.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              전체 화장실: <strong className="text-slate-700">{zones.length}곳</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="px-6 py-3">관리자 계정</th>
                  <th className="px-6 py-3">담당자명</th>
                  <th className="px-6 py-3">현재 열람 가능한 화장실 구역</th>
                  <th className="px-6 py-3 text-right">권한 설정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {managerUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-400">
                      등록된 화장실 관리자 계정이 없습니다.
                    </td>
                  </tr>
                ) : (
                  managerUsers.map((u) => {
                    const userZoneIds = permissions
                      .filter((p) => p.userId === u.id)
                      .map((p) => p.zoneId);
                    const userGrantedZones = zones.filter((z) => userZoneIds.includes(z.id));

                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-800 flex items-center space-x-2">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <span>{u.username}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-semibold">{u.displayName}</td>
                        <td className="px-6 py-4">
                          {userGrantedZones.length === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              ⚠️ 배정된 화장실 없음 (접근 차단)
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {userGrantedZones.map((z) => (
                                <span
                                  key={z.id}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200"
                                >
                                  <span>🚻 {z.name}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => openPermissionModal(u)}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition border border-indigo-200 shadow-sm"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>권한 설정 ({userGrantedZones.length}/{zones.length})</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Zone Summaries */}
      {activeTab === 'zones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-700">화장실(구역) 목록 및 실시간 상태</div>
              <div className="text-[11px] text-slate-500">신규 화장실을 등록하면 권한 매핑 표와 기기 배치 목록에 즉시 추가됩니다.</div>
            </div>
            <button
              onClick={openRegisterZoneModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>화장실 추가</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {zones.map((z) => {
              const summary = zoneSummaries[z.id];
              const score = summary?.comfortScore;
              const mq135Val = summary?.latestMetrics?.MQ135?.currentValue ?? summary?.latestMetrics?.GAS?.currentValue;

              return (
                <div key={z.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{z.name}</h3>
                      <p className="text-xs text-slate-500">{z.address} {z.description ? `· ${z.description}` : ''}</p>
                    </div>
                    <button
                      onClick={() => onSelectZone && onSelectZone(z.id)}
                      className="px-3 py-1.5 text-xs font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition"
                    >
                      상세 관제 바로가기 →
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">종합 쾌적 지수</div>
                      <div className="text-3xl font-black text-slate-800 mt-0.5">
                        {score !== null && score !== undefined ? `${score} 점` : '-'}
                      </div>
                    </div>
                    <div>
                      {score !== null && score !== undefined ? (
                        <span className={`inline-flex px-3 py-1 rounded-xl text-xs font-bold ${
                          score >= 80 ? 'bg-emerald-100 text-emerald-800' : score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {score >= 80 ? '🟢 쾌적' : score >= 50 ? '🟡 환기 권장' : '🔴 주의'}
                        </span>
                      ) : (
                        <span className="inline-flex px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-500">
                          ⚪ 센서 수집 대기
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                    <div className="p-2 rounded-xl bg-slate-50">
                      <div className="text-[10px] text-slate-400 font-semibold">현재 온도</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {summary?.latestMetrics?.TEMPERATURE?.currentValue != null
                          ? `${summary.latestMetrics.TEMPERATURE.currentValue} °C`
                          : '-'}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50">
                      <div className="text-[10px] text-slate-400 font-semibold">현재 습도</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {summary?.latestMetrics?.HUMIDITY?.currentValue != null
                          ? `${summary.latestMetrics.HUMIDITY.currentValue} %`
                          : '-'}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50">
                      <div className="text-[10px] text-slate-400 font-semibold">공기질(MQ-135)</div>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {mq135Val != null ? `${mq135Val} ADC` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Register/Edit Device Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
              {editingDevice ? 'ESP32 디바이스 설정 수정' : '신규 ESP32 하드웨어 등록'}
            </h3>

            {formError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveDevice} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">디바이스 식별 코드</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingDevice)}
                  value={formSetCode}
                  onChange={(e) => setFormSetCode(e.target.value)}
                  placeholder="예: DEV-ESP32-1"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ESP32 Wi-Fi MAC 주소</label>
                <input
                  type="text"
                  required
                  value={formMac}
                  onChange={(e) => setFormMac(e.target.value)}
                  placeholder="예: 98:F4:AB:6C:5A:98"
                  className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">ESP32 부팅 시 시리얼 모니터에 출력되는 MAC 주소입니다.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">설치 구역 (화장실 선택)</label>
                <select
                  value={formZoneId}
                  onChange={(e) => setFormZoneId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">설치 위치 라벨</label>
                <input
                  type="text"
                  required
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="예: 1번 사로 천장, 세면대 옆"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
                >
                  {editingDevice ? '수정 완료' : '등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Zone Modal */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>신규 화장실(구역) 등록</span>
            </h3>

            {formZoneError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {formZoneError}
              </div>
            )}

            <form onSubmit={handleSaveZone} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">화장실 구역 명칭</label>
                <input
                  type="text"
                  required
                  value={formZoneName}
                  onChange={(e) => setFormZoneName(e.target.value)}
                  placeholder="예: 화장실 3 (본관 3층)"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">등록 즉시 권한 매핑 표의 열(Column)로 추가됩니다.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">상세 위치 / 건물</label>
                <input
                  type="text"
                  required
                  value={formZoneAddress}
                  onChange={(e) => setFormZoneAddress(e.target.value)}
                  placeholder="예: 공학관 3층 서편 복도"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">구역 설명 (선택)</label>
                <input
                  type="text"
                  value={formZoneDescription}
                  onChange={(e) => setFormZoneDescription(e.target.value)}
                  placeholder="예: 스마트 악취/연기 감시 구역"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  화장실 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Assignment Modal (RBAC Selection) */}
      {isPermModalOpen && selectedUserForPerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    [{selectedUserForPerm.displayName}] 접근 권한 설정
                  </h3>
                  <p className="text-xs text-slate-500">
                    계정 ID: <strong className="text-slate-700">{selectedUserForPerm.username}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPermModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500 leading-relaxed">
                해당 담당 관리자가 열람 및 모니터링할 화장실 구역을 선택하세요.
                체크된 화장실의 실시간 센서 데이터와 대시보드만 열람할 수 있습니다.
              </p>
            </div>

            {/* Quick action bar */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl text-xs">
              <span className="text-slate-600 font-semibold">
                선택된 화장실: <strong className="text-indigo-600">{tempSelectedZoneIds.length}</strong> / {zones.length}곳
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllZones}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-semibold shadow-xs"
                >
                  전체 선택
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllZones}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-semibold shadow-xs"
                >
                  전체 해제
                </button>
              </div>
            </div>

            {/* Zone checklist */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {zones.map((z) => {
                const isChecked = tempSelectedZoneIds.includes(z.id);

                return (
                  <div
                    key={z.id}
                    onClick={() => handleToggleZoneInModal(z.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      isChecked
                        ? 'border-indigo-500 bg-indigo-50/40 text-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by outer div onClick
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-xs">{z.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{z.address}</div>
                      </div>
                    </div>
                    {isChecked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        접근 허용
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal footer */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPermModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                취소
              </button>
              <button
                type="button"
                disabled={permSaving}
                onClick={handleSavePermissions}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {permSaving ? '저장 중...' : `권한 저장 (${tempSelectedZoneIds.length}곳)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
