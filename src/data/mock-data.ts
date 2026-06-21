import {
  DriverInfo,
  TodayTask,
  TempReading,
  TempAlert,
  ArrivalRecord,
  TripEvidence,
  CargoInfo
} from '@/types/cold-chain';

export const mockDriverInfo: DriverInfo = {
  name: '张建国',
  phone: '138****8821',
  plateNumber: '沪A·F7289冷',
  driverId: 'DRV202400156',
  carModel: '解放J7 9.6米冷藏'
};

export const mockCargoList: CargoInfo[] = [
  {
    id: 'CG001',
    type: 'frozen_beef',
    name: '冷冻牛腱子肉',
    weight: 12500,
    targetTempMin: -25,
    targetTempMax: -18,
    preCoolTemp: -20,
    preCoolMinutes: 45,
    latestLoadTime: '2026-06-21 06:30'
  },
  {
    id: 'CG002',
    type: 'chilled_pork',
    name: '冷鲜猪白条',
    weight: 8200,
    targetTempMin: 0,
    targetTempMax: 4,
    preCoolTemp: 2,
    preCoolMinutes: 30,
    latestLoadTime: '2026-06-21 06:45'
  },
  {
    id: 'CG003',
    type: 'poultry',
    name: '分割鸡胸肉',
    weight: 3600,
    targetTempMin: -2,
    targetTempMax: 2,
    preCoolTemp: 0,
    preCoolMinutes: 25,
    latestLoadTime: '2026-06-21 07:00'
  }
];

export const mockTodayTask: TodayTask = {
  id: 'TASK20260621001',
  date: '2026-06-21',
  routeName: '上海闵行屠宰场 → 杭州分拨仓 → 宁波门店',
  origin: '上海闵行区屠宰场',
  destination: '宁波鄞州生鲜中心',
  startTime: '2026-06-21 05:30',
  estimatedArrival: '2026-06-21 11:30',
  status: 'transporting',
  cargoList: mockCargoList,
  stopList: [
    {
      id: 'STOP001',
      name: '上海闵行屠宰场',
      type: 'slaughterhouse',
      address: '上海市闵行区江川路2588号',
      sequence: 1,
      plannedArrivalTime: '2026-06-21 05:30',
      status: 'completed'
    },
    {
      id: 'STOP002',
      name: '杭州余杭分拨仓',
      type: 'warehouse',
      address: '杭州市余杭区良渚街道储运路168号',
      sequence: 2,
      plannedArrivalTime: '2026-06-21 08:30',
      status: 'completed'
    },
    {
      id: 'STOP003',
      name: '宁波鄞州生鲜中心',
      type: 'store',
      address: '宁波市鄞州区中兴路369号',
      sequence: 3,
      plannedArrivalTime: '2026-06-21 11:30',
      status: 'pending'
    }
  ]
};

const baseTime = new Date('2026-06-21T06:00:00').getTime();

export const mockTempReadings: TempReading[] = Array.from({ length: 30 }, (_, i) => {
  const baseTemp = -20;
  const variance = Math.sin(i / 3) * 1.5 + (i > 20 ? Math.random() * 3 : 0);
  return {
    timestamp: baseTime + i * 10 * 60 * 1000,
    temperature: Math.round((baseTemp + variance) * 10) / 10,
    sensorId: 'SENSOR-A01',
    location: '车厢前区'
  };
});

export const mockTempAlerts: TempAlert[] = [
  {
    id: 'ALT001',
    timestamp: baseTime + 2 * 60 * 60 * 1000,
    temperature: -18.5,
    targetMax: -18,
    level: 'warning',
    message: '温度接近上限，请检查制冷机',
    suggestion: '建议降低制冷机设定温度1-2度，检查车厢门是否密闭',
    acknowledged: true
  },
  {
    id: 'ALT002',
    timestamp: baseTime + 3.5 * 60 * 60 * 1000,
    temperature: -17.2,
    targetMax: -18,
    level: 'danger',
    message: '温度超标！请立即检查',
    suggestion: '请立即停车检查：1. 确认制冷机运行状态 2. 检查车厢门密封条 3. 减少开门次数',
    acknowledged: false
  }
];

export const mockArrivalRecord: ArrivalRecord = {
  stopId: 'STOP002',
  arrivalTime: baseTime + 3 * 60 * 60 * 1000,
  tempPhotoUrl: 'https://picsum.photos/id/60/600/800',
  sealPhotoUrl: 'https://picsum.photos/id/61/600/800',
  unloadPhotoUrl: 'https://picsum.photos/id/62/600/800',
  doorOpenDuration: 18,
  doorOpenTime: baseTime + 3 * 60 * 60 * 1000 + 15 * 60 * 1000,
  doorCloseTime: baseTime + 3 * 60 * 60 * 1000 + 33 * 60 * 1000,
  temperatureAtArrival: -19.3
};

export const mockTripEvidence: TripEvidence = {
  taskId: 'TASK20260621001',
  startTime: baseTime,
  endTime: baseTime + 6 * 60 * 60 * 1000,
  driverName: '张建国',
  plateNumber: '沪A·F7289冷',
  routeName: '上海闵行屠宰场 → 杭州分拨仓 → 宁波门店',
  cargoList: mockCargoList,
  tempReadings: mockTempReadings,
  alerts: mockTempAlerts,
  arrivals: [mockArrivalRecord],
  generatedAt: Date.now()
};

export const cargoTypeLabels: Record<string, string> = {
  frozen_beef: '冷冻牛肉',
  chilled_pork: '冷鲜猪肉',
  poultry: '分割禽肉'
};

export const stopTypeLabels: Record<string, string> = {
  slaughterhouse: '屠宰场',
  warehouse: '分拨仓',
  store: '门店'
};
