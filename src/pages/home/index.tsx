import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useTripStore } from '@/store/trip-store';
import CargoCard from '@/components/CargoCard';
import { stopTypeLabels } from '@/data/mock-data';
import { formatTime } from '@/utils/temp-alert';

const HomePage: React.FC = () => {
  const {
    driver,
    currentTask,
    tripStarted,
    startTrip,
    currentTask: { stopList, cargoList }
  } = useTripStore();

  const tripStatusLabel = useMemo(() => {
    const map = {
      pending: '待发车',
      loading: '装车中',
      transporting: '运输中',
      arrived: '已到站',
      completed: '已完成'
    };
    return map[currentTask.status];
  }, [currentTask.status]);

  const handleStartTrip = () => {
    console.log('[HomePage] 点击确认出车');
    startTrip();
    Taro.showToast({
      title: '出车确认成功，请注意行车安全',
      icon: 'success',
      duration: 2000
    });
  };

  const handleViewCargoDetail = () => {
    Taro.showToast({
      title: '货物信息已核对',
      icon: 'none'
    });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      {/* 司机信息卡 */}
      <View className={styles.driverCard}>
        <View className={styles.driverHeader}>
          <View className={styles.avatar}>
            <Text className={styles.avatarEmoji}>👨‍✈️</Text>
          </View>
          <View className={styles.driverInfo}>
            <Text className={styles.driverName}>{driver.name}</Text>
            <Text className={styles.driverPhone}>{driver.phone}</Text>
          </View>
          <View className={styles.onlineBadge}>
            <View className={styles.onlineDot} />
            <Text className={styles.onlineText}>在岗</Text>
          </View>
        </View>
        <View className={styles.carInfo}>
          <View className={styles.carInfoItem}>
            <Text className={styles.infoLabel}>车牌号</Text>
            <Text className={styles.infoValue}>{driver.plateNumber}</Text>
          </View>
          <View className={styles.carInfoItem}>
            <Text className={styles.infoLabel}>车型</Text>
            <Text className={styles.infoValue}>{driver.carModel}</Text>
          </View>
        </View>
      </View>

      {/* 路线概览 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>今日路线</Text>
        <Text className={styles.titleBadge}>{tripStatusLabel}</Text>
      </View>
      <View className={styles.routeCard}>
        <View className={styles.routeHeader}>
          <Text className={styles.routeName}>{currentTask.routeName}</Text>
          <View className={styles.routeStatus}>
            {currentTask.stopList.filter(s => s.status === 'completed').length}
            /{currentTask.stopList.length}站
          </View>
        </View>
        <View className={styles.routeTimeline}>
          <View className={styles.routePoint}>
            <View className={styles.pointDot} />
            <View className={styles.routeLine} />
            <View className={`${styles.pointDot} ${styles.pointDotEnd}`} />
          </View>
          <View className={styles.routeStops}>
            <View className={styles.routeStopItem}>
              <View className={styles.stopTop}>
                <Text className={styles.stopName}>{currentTask.origin}</Text>
                <Text className={styles.stopTime}>{formatTime(currentTask.startTime)}</Text>
              </View>
              <Text className={styles.stopAddress}>起点 · 装车出发</Text>
            </View>
            <View className={styles.routeStopItem}>
              <View className={styles.stopTop}>
                <Text className={styles.stopName}>{currentTask.destination}</Text>
                <Text className={styles.stopTime}>{formatTime(currentTask.estimatedArrival)}</Text>
              </View>
              <Text className={styles.stopAddress}>终点 · 卸车完成</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 货物核对 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>货物核对</Text>
        <Text className={styles.titleBadge}>{cargoList.length}种货物</Text>
      </View>
      {cargoList.map((cargo, index) => (
        <CargoCard key={cargo.id} cargo={cargo} index={index} />
      ))}

      {/* 站点列表 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>停靠站点</Text>
        <Text className={styles.titleBadge}>{stopList.length}个站点</Text>
      </View>
      {stopList.map((stop, index) => (
        <View className={styles.stopCard} key={stop.id}>
          <View className={styles.stopHeader}>
            <View className={styles.stopInfo}>
              <View className={styles.stopTypeName}>
                <View className={classnames(styles.typeTag, styles[`tag-${stop.type}`])}>
                  {stopTypeLabels[stop.type]}
                </View>
                <Text className={styles.stopItemName}>
                  第{index + 1}站 · {stop.name}
                </Text>
              </View>
            </View>
            <View className={classnames(styles.stopStatusTag, styles[`status-${stop.status}`])}>
              {stop.status === 'completed' && '✓ 已完成'}
              {stop.status === 'arrived' && '进行中'}
              {stop.status === 'pending' && '待前往'}
            </View>
          </View>
          <View className={styles.stopAddressRow}>📍 {stop.address}</View>
          <View className={styles.stopSchedule}>
            <View className={styles.scheduleItem}>
              <Text className={styles.scheduleLabel}>计划到达</Text>
              <Text className={styles.scheduleValue}>{formatTime(stop.plannedArrivalTime)}</Text>
            </View>
            <View className={styles.scheduleItem}>
              <Text className={styles.scheduleLabel}>序号</Text>
              <Text className={styles.scheduleValue}>#{stop.sequence}</Text>
            </View>
          </View>
        </View>
      ))}

      {/* 操作区 */}
      <View className={styles.actionBar}>
        <View className={styles.primaryBtn} onClick={handleStartTrip}>
          {tripStarted ? '出车已确认 · 运输中' : '确认核对无误，开始出车'}
        </View>
        <View className={styles.secondaryBtn} onClick={handleViewCargoDetail}>
          查看装车清单
        </View>
      </View>
    </ScrollView>
  );
};

export default HomePage;
