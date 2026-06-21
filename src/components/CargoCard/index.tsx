import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';
import { CargoInfo } from '@/types/cold-chain';
import { cargoTypeLabels } from '@/data/mock-data';
import { formatTime } from '@/utils/temp-alert';

interface CargoCardProps {
  cargo: CargoInfo;
  index?: number;
}

const typeConfig = {
  frozen_beef: {
    color: '#00ACC1',
    bg: 'rgba(0, 172, 193, 0.1)',
    icon: '❄️'
  },
  chilled_pork: {
    color: '#26A69A',
    bg: 'rgba(38, 166, 154, 0.1)',
    icon: '🐷'
  },
  poultry: {
    color: '#66BB6A',
    bg: 'rgba(102, 187, 106, 0.1)',
    icon: '🍗'
  }
};

const CargoCard: React.FC<CargoCardProps> = ({ cargo, index }) => {
  const config = typeConfig[cargo.type];

  return (
    <View className={styles.cargoCard}>
      <View className={styles.cardHeader}>
        <View className={styles.typeBadge} style={{ background: config.bg, color: config.color }}>
          <Text className={styles.badgeIcon}>{config.icon}</Text>
          <Text className={styles.badgeText}>{cargoTypeLabels[cargo.type]}</Text>
        </View>
        {typeof index === 'number' && (
          <View className={styles.indexTag}>货物 {index + 1}</View>
        )}
      </View>

      <View className={styles.cargoName}>
        <Text className={styles.nameText}>{cargo.name}</Text>
      </View>

      <View className={styles.weightRow}>
        <View className={styles.weightItem}>
          <Text className={styles.weightLabel}>装载重量</Text>
          <Text className={styles.weightValue}>{(cargo.weight / 1000).toFixed(1)} 吨</Text>
        </View>
      </View>

      <View className={styles.infoGrid}>
        <View className={styles.infoCell}>
          <View className={styles.infoLabelRow}>
            <View className={styles.infoDot} style={{ background: config.color }} />
            <Text className={styles.infoLabel}>目标温区</Text>
          </View>
          <Text className={styles.infoValue} style={{ color: config.color }}>
            {cargo.targetTempMin}°C ~ {cargo.targetTempMax}°C
          </Text>
        </View>

        <View className={styles.infoCell}>
          <View className={styles.infoLabelRow}>
            <View className={styles.infoDot} style={{ background: '#FF9800' }} />
            <Text className={styles.infoLabel}>预冷要求</Text>
          </View>
          <Text className={styles.infoValue}>
            {cargo.preCoolTemp}°C / {cargo.preCoolMinutes}分钟
          </Text>
        </View>

        <View className={classnames(styles.infoCell, styles.infoCellFull)}>
          <View className={styles.infoLabelRow}>
            <View className={styles.infoDot} style={{ background: '#F44336' }} />
            <Text className={styles.infoLabel}>最晚装车时间</Text>
          </View>
          <Text className={classnames(styles.infoValue, styles.lateTime)}>
            {formatTime(cargo.latestLoadTime)} 前
          </Text>
        </View>
      </View>
    </View>
  );
};

export default CargoCard;
