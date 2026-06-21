import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';

interface TempGaugeProps {
  temperature: number;
  minTemp: number;
  maxTemp: number;
  status: 'safe' | 'warning' | 'danger';
  sensorId?: string;
  location?: string;
}

const TempGauge: React.FC<TempGaugeProps> = ({
  temperature,
  minTemp,
  maxTemp,
  status,
  sensorId = 'SENSOR-A01',
  location = '车厢前区'
}) => {
  const percent = useMemo(() => {
    const range = maxTemp - minTemp + 6;
    const p = ((temperature - (minTemp - 3)) / range) * 100;
    return Math.max(0, Math.min(100, p));
  }, [temperature, minTemp, maxTemp]);

  const safeZonePercent = useMemo(() => {
    const range = maxTemp - minTemp + 6;
    return ((maxTemp - minTemp) / range) * 100;
  }, [minTemp, maxTemp]);

  const safeZoneLeft = useMemo(() => {
    const range = maxTemp - minTemp + 6;
    return ((minTemp - (minTemp - 3)) / range) * 100;
  }, [minTemp, maxTemp]);

  const statusColor = {
    safe: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336'
  }[status];

  const statusLabel = {
    safe: '温度正常',
    warning: '温度偏高',
    danger: '温度超标'
  }[status];

  return (
    <View className={styles.gaugeCard}>
      <View className={styles.header}>
        <Text className={styles.statusDot} style={{ background: statusColor }} />
        <Text className={styles.statusLabel} style={{ color: statusColor }}>{statusLabel}</Text>
        <Text className={styles.sensorInfo}>{sensorId} · {location}</Text>
      </View>

      <View className={styles.tempDisplay}>
        <Text className={styles.tempValue} style={{ color: statusColor }}>
          {temperature > 0 ? '+' : ''}{temperature.toFixed(1)}
        </Text>
        <Text className={styles.tempUnit}>°C</Text>
      </View>

      <View className={styles.targetRange}>
        <Text className={styles.rangeLabel}>目标温区</Text>
        <Text className={styles.rangeValue}>{minTemp}°C ~ {maxTemp}°C</Text>
      </View>

      <View className={styles.gaugeBar}>
        <View
          className={styles.safeZone}
          style={{
            left: `${safeZoneLeft}%`,
            width: `${safeZonePercent}%`
          }}
        />
        <View
          className={classnames(styles.indicator, styles[`indicator-${status}`])}
          style={{ left: `calc(${percent}% - 16rpx)` }}
        >
          <View className={styles.indicatorDot} />
          <View className={styles.indicatorLine} />
        </View>
        <View className={styles.tickLeft}>{minTemp - 3}°</View>
        <View className={styles.tickMin}>{minTemp}°</View>
        <View className={styles.tickMax}>{maxTemp}°</View>
      </View>

      <View className={styles.footer}>
        <View className={styles.footerItem}>
          <Text className={styles.footerLabel}>距离下限</Text>
          <Text className={styles.footerValue}>{(temperature - minTemp).toFixed(1)}°C</Text>
        </View>
        <View className={styles.footerDivider} />
        <View className={styles.footerItem}>
          <Text className={styles.footerLabel}>距离上限</Text>
          <Text
            className={classnames(styles.footerValue, (temperature - maxTemp) > 0 && styles.dangerValue)}
          >
            {(maxTemp - temperature).toFixed(1)}°C
          </Text>
        </View>
      </View>
    </View>
  );
};

export default TempGauge;
