export type CargoType = 'frozen_beef' | 'chilled_pork' | 'poultry';
export type TempStatus = 'safe' | 'warning' | 'danger';
export type StopType = 'slaughterhouse' | 'warehouse' | 'store';
export type TripStatus = 'pending' | 'loading' | 'transporting' | 'arrived' | 'completed';

export interface DriverInfo {
  name: string;
  phone: string;
  plateNumber: string;
  driverId: string;
  carModel: string;
}

export interface CargoInfo {
  id: string;
  type: CargoType;
  name: string;
  weight: number;
  targetTempMin: number;
  targetTempMax: number;
  preCoolTemp: number;
  preCoolMinutes: number;
  latestLoadTime: string;
}

export interface TodayTask {
  id: string;
  date: string;
  routeName: string;
  origin: string;
  destination: string;
  startTime: string;
  estimatedArrival: string;
  status: TripStatus;
  cargoList: CargoInfo[];
  stopList: StopInfo[];
}

export interface StopInfo {
  id: string;
  name: string;
  type: StopType;
  address: string;
  sequence: number;
  plannedArrivalTime: string;
  status: 'pending' | 'arrived' | 'completed';
}

export interface TempReading {
  timestamp: number;
  temperature: number;
  sensorId: string;
  location: string;
}

export interface TempAlert {
  id: string;
  timestamp: number;
  temperature: number;
  targetMax: number;
  level: 'warning' | 'danger';
  message: string;
  suggestion: string;
  acknowledged: boolean;
}

export interface ArrivalRecord {
  stopId: string;
  arrivalTime: number;
  tempPhotoUrl: string;
  sealPhotoUrl: string;
  unloadPhotoUrl: string;
  doorOpenDuration: number;
  doorOpenTime: number;
  temperatureAtArrival: number;
  note?: string;
}

export interface TripEvidence {
  taskId: string;
  startTime: number;
  endTime?: number;
  driverName: string;
  plateNumber: string;
  routeName: string;
  cargoList: CargoInfo[];
  tempReadings: TempReading[];
  alerts: TempAlert[];
  arrivals: ArrivalRecord[];
  generatedAt: number;
}

export interface PhotoSlotData {
  key: string;
  label: string;
  tip: string;
  imageUrl?: string;
  required: boolean;
}
