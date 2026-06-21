import { create } from 'zustand';
import {
  DriverInfo,
  TodayTask,
  TempReading,
  TempAlert,
  ArrivalRecord,
  TripEvidence,
  TempStatus
} from '@/types/cold-chain';
import {
  mockDriverInfo,
  mockTodayTask,
  mockTempReadings,
  mockTempAlerts,
  mockTripEvidence
} from '@/data/mock-data';

interface TripState {
  driver: DriverInfo;
  currentTask: TodayTask;
  tempReadings: TempReading[];
  tempAlerts: TempAlert[];
  arrivalRecords: ArrivalRecord[];
  currentStopIndex: number;
  tripStarted: boolean;
  tripEvidence: TripEvidence | null;

  startTrip: () => void;
  getCurrentTemp: () => number;
  getTempStatus: () => TempStatus;
  getTargetTempRange: () => { min: number; max: number };
  acknowledgeAlert: (alertId: string) => void;
  addTempReading: (reading: TempReading) => void;
  addArrivalRecord: (record: ArrivalRecord) => void;
  setCurrentStop: (index: number) => void;
  completeStop: () => void;
  generateEvidence: () => TripEvidence;
  getUnacknowledgedAlertsCount: () => number;
}

export const useTripStore = create<TripState>((set, get) => ({
  driver: mockDriverInfo,
  currentTask: mockTodayTask,
  tempReadings: mockTempReadings,
  tempAlerts: mockTempAlerts,
  arrivalRecords: [],
  currentStopIndex: 2,
  tripStarted: true,
  tripEvidence: null,

  startTrip: () => {
    console.log('[TripStore] 开始行程');
    set({ tripStarted: true });
  },

  getCurrentTemp: () => {
    const { tempReadings } = get();
    if (tempReadings.length === 0) return 0;
    return tempReadings[tempReadings.length - 1].temperature;
  },

  getTempStatus: (): TempStatus => {
    const { getCurrentTemp, getTargetTempRange } = get();
    const temp = getCurrentTemp();
    const { max } = getTargetTempRange();
    const diff = temp - max;
    if (diff > 1) return 'danger';
    if (diff > 0) return 'warning';
    return 'safe';
  },

  getTargetTempRange: () => {
    const { currentTask } = get();
    const cargos = currentTask.cargoList;
    if (cargos.length === 0) return { min: -25, max: -18 };
    const min = Math.min(...cargos.map(c => c.targetTempMin));
    const max = Math.max(...cargos.map(c => c.targetTempMax));
    return { min, max };
  },

  acknowledgeAlert: (alertId: string) => {
    console.log('[TripStore] 确认告警:', alertId);
    set(state => ({
      tempAlerts: state.tempAlerts.map(a =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      )
    }));
  },

  addTempReading: (reading: TempReading) => {
    console.log('[TripStore] 新增温度读数:', reading.temperature);
    set(state => ({
      tempReadings: [...state.tempReadings, reading]
    }));
  },

  addArrivalRecord: (record: ArrivalRecord) => {
    console.log('[TripStore] 新增到站记录:', record.stopId);
    set(state => ({
      arrivalRecords: [...state.arrivalRecords, record]
    }));
  },

  setCurrentStop: (index: number) => {
    console.log('[TripStore] 设置当前站点索引:', index);
    set({ currentStopIndex: index });
  },

  completeStop: () => {
    const { currentStopIndex, currentTask } = get();
    console.log('[TripStore] 完成站点:', currentStopIndex);
    const newStops = currentTask.stopList.map((s, i) => {
      if (i < currentStopIndex) return { ...s, status: 'completed' as const };
      if (i === currentStopIndex) return { ...s, status: 'completed' as const };
      return s;
    });
    set(state => ({
      currentTask: { ...state.currentTask, stopList: newStops },
      currentStopIndex: Math.min(state.currentStopIndex + 1, state.currentTask.stopList.length - 1)
    }));
  },

  generateEvidence: (): TripEvidence => {
    const { currentTask, driver, tempReadings, tempAlerts, arrivalRecords } = get();
    const evidence: TripEvidence = {
      taskId: currentTask.id,
      startTime: new Date(currentTask.startTime).getTime(),
      endTime: Date.now(),
      driverName: driver.name,
      plateNumber: driver.plateNumber,
      routeName: currentTask.routeName,
      cargoList: currentTask.cargoList,
      tempReadings,
      alerts: tempAlerts,
      arrivals: arrivalRecords,
      generatedAt: Date.now()
    };
    console.log('[TripStore] 生成行程证据:', evidence.taskId);
    set({ tripEvidence: evidence });
    return evidence;
  },

  getUnacknowledgedAlertsCount: () => {
    const { tempAlerts } = get();
    return tempAlerts.filter(a => !a.acknowledged).length;
  }
}));
