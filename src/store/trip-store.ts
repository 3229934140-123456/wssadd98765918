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
  evidenceByStopId: Record<string, TripEvidence>;

  startTrip: () => void;
  getCurrentTemp: () => number;
  getTempStatus: () => TempStatus;
  getTargetTempRange: () => { min: number; max: number };
  acknowledgeAlert: (alertId: string) => void;
  addTempReading: (reading: TempReading) => void;
  addArrivalRecord: (record: ArrivalRecord) => void;
  setCurrentStop: (index: number) => void;
  completeStop: () => void;
  generateEvidence: (stopId: string) => TripEvidence;
  getEvidenceByStopId: (stopId: string) => TripEvidence | null;
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
  evidenceByStopId: {},

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

  generateEvidence: (stopId: string): TripEvidence => {
    const { evidenceByStopId, currentTask, driver, tempReadings, tempAlerts, arrivalRecords } = get();

    if (evidenceByStopId[stopId]) {
      console.log('[TripStore] 证据已存在，直接返回:', stopId);
      return evidenceByStopId[stopId];
    }

    const stopArrival = arrivalRecords.find(r => r.stopId === stopId);
    if (!stopArrival) {
      throw new Error('未找到到站记录，请先完成到站登记');
    }

    const stopInfo = currentTask.stopList.find(s => s.id === stopId);
    const stopIndex = currentTask.stopList.findIndex(s => s.id === stopId);
    const prevStopIndex = stopIndex > 0 ? stopIndex - 1 : 0;
    const prevStopId = stopIndex > 0 ? currentTask.stopList[prevStopIndex].id : null;

    const relevantReadings = tempReadings.filter(t => {
      if (prevStopId) {
        const prevArrival = arrivalRecords.find(r => r.stopId === prevStopId);
        if (prevArrival && t.timestamp < prevArrival.doorCloseTime) return false;
      }
      return t.timestamp <= stopArrival.doorCloseTime;
    });

    const relevantAlerts = tempAlerts.filter(a => {
      const reading = relevantReadings.find(r => r.id === a.readingId);
      return !!reading;
    });

    const evidence: TripEvidence = {
      taskId: `${currentTask.id}-${stopId}`,
      startTime: prevStopId 
        ? (arrivalRecords.find(r => r.stopId === prevStopId)?.doorCloseTime || new Date(currentTask.startTime).getTime())
        : new Date(currentTask.startTime).getTime(),
      endTime: stopArrival.doorCloseTime,
      driverName: driver.name,
      plateNumber: driver.plateNumber,
      routeName: currentTask.routeName,
      stopName: stopInfo?.name,
      cargoList: currentTask.cargoList,
      tempReadings: relevantReadings,
      alerts: relevantAlerts,
      arrivals: [stopArrival],
      generatedAt: Date.now()
    };

    console.log('[TripStore] 生成站点证据:', stopId, evidence.taskId);
    set(state => ({
      evidenceByStopId: {
        ...state.evidenceByStopId,
        [stopId]: evidence
      },
      tripEvidence: evidence
    }));
    return evidence;
  },

  getEvidenceByStopId: (stopId: string): TripEvidence | null => {
    const { evidenceByStopId, tripEvidence } = get();
    if (evidenceByStopId[stopId]) {
      return evidenceByStopId[stopId];
    }
    if (tripEvidence && tripEvidence.arrivals.some(a => a.stopId === stopId)) {
      return tripEvidence;
    }
    return null;
  },

  getUnacknowledgedAlertsCount: () => {
    const { tempAlerts } = get();
    return tempAlerts.filter(a => !a.acknowledged).length;
  }
}));
