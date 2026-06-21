import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useTripStore } from '@/store/trip-store';
import TempGauge from '@/components/TempGauge';
import {
  getTempStatusColor,
  getTempStatusText,
  formatDateTime,
  playVoiceAlert,
  shouldTriggerAlert
} from '@/utils/temp-alert';

const TemperaturePage: React.FC = () => {
  const {
    getCurrentTemp,
    getTempStatus,
    getTargetTempRange,
    tempReadings,
    tempAlerts,
    acknowledgeAlert,
    getUnacknowledgedAlertsCount
  } = useTripStore();

  const [currentTemp, setCurrentTemp] = useState(getCurrentTemp());
  const [status, setStatus] = useState(getTempStatus());
  const [readings, setReadings] = useState(tempReadings.slice(-12));

  useEffect(() => {
    const interval = setInterval(() => {
      const newTemp = getCurrentTemp() + (Math.random() - 0.45) * 0.8;
      const rounded = Math.round(newTemp * 10) / 10;
      setCurrentTemp(rounded);

      const { max } = getTargetTempRange();
      const { shouldAlert, level } = shouldTriggerAlert(rounded, max);
      if (shouldAlert) {
        setStatus(level === 'danger' ? 'danger' : 'warning');
        if (level === 'danger') {
          playVoiceAlert('温度超标！请立即检查制冷机或减少开门');
        } else {
          playVoiceAlert('请检查制冷机或减少开门');
        }
      } else {
        setStatus('safe');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [getCurrentTemp, getTargetTempRange]);

  const targetRange = getTargetTempRange();
  const unackCount = getUnacknowledgedAlertsCount();
  const hasCriticalAlert = tempAlerts.some(a => a.level === 'danger' && !a.acknowledged);
  const hasWarningAlert = tempAlerts.some(a => a.level === 'warning' && !a.acknowledged);

  const tempStats = useMemo(() => {
    if (readings.length === 0) return { min: 0, max: 0, avg: 0 };
    const temps = readings.map(r => r.temperature);
    return {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length * 10) / 10
    };
  }, [readings]);

  const chartBars = useMemo(() => {
    const displayReadings = readings.slice(-10);
    if (displayReadings.length === 0) return [];
    const temps = displayReadings.map(r => r.temperature);
    const globalMin = targetRange.min - 3;
    const globalMax = targetRange.max + 3;
    const range = globalMax - globalMin;
    return displayReadings.map(r => {
      const height = Math.max(10, ((r.temperature - globalMin) / range) * 100);
      const diff = r.temperature - targetRange.max;
      let level = '';
      if (diff > 1) level = 'barDanger';
      else if (diff > 0) level = 'barWarning';
      return {
        height: `${height}%`,
        level,
        temp: r.temperature,
        time: formatDateTime(r.timestamp).split(' ')[1]
      };
    });
  }, [readings, targetRange]);

  const handleAcknowledge = (alertId: string) => {
    console.log('[TemperaturePage] 确认告警:', alertId);
    acknowledgeAlert(alertId);
    Taro.showToast({
      title: '已确认，请注意安全行驶',
      icon: 'success'
    });
  };

  const handlePlayVoice = async () => {
    const pending = tempAlerts.filter(a => !a.acknowledged);
    if (pending.length > 0) {
      const latest = pending[pending.length - 1];
      await playVoiceAlert(latest.message);
    }
  };

  return (
    <ScrollView scrollY className={styles.page}>
      {/* 告警横幅 */}
      {unackCount > 0 && (
        <View
          className={classnames(
            styles.alertBanner,
            hasCriticalAlert ? styles.bannerDanger : styles.bannerWarning
          )}
        >
          <View className={styles.bannerHeader}>
            <View className={styles.bannerTitle}>
              <Text className={styles.bannerIcon}>
                {hasCriticalAlert ? '🚨' : '⚠️'}
              </Text>
              <Text className={styles.bannerText}>
                {hasCriticalAlert ? '温度超标警报' : '温度偏高提醒'}
              </Text>
            </View>
            <View className={styles.bannerCount}>{unackCount}条未处理</View>
          </View>
          <View className={styles.bannerMsg}>
            {hasCriticalAlert
              ? '温度超过安全上限，请立即停车检查！'
              : '温度接近上限，请留意制冷机状态。'}
          </View>
          <View className={styles.bannerVoiceBtn} onClick={handlePlayVoice}>
            🔊 播放语音提醒
          </View>
        </View>
      )}

      {/* 温度仪表盘 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>实时温度</Text>
        <Text className={styles.titleBadge}>
          {getTempStatusText(status)}
        </Text>
      </View>
      <TempGauge
        temperature={currentTemp}
        minTemp={targetRange.min}
        maxTemp={targetRange.max}
        status={status}
      />

      {/* 温度趋势 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>温度趋势（近2小时）</Text>
        <Text className={styles.titleBadge}>
          {readings.length}个读数
        </Text>
      </View>
      <View className={styles.trendCard}>
        <View className={styles.trendHeader}>
          <Text className={styles.trendTitle}>温度变化图</Text>
          <Text className={styles.trendUpdate}>
            平均 {tempStats.avg}°C
          </Text>
        </View>
        <View className={styles.trendChart}>
          <View className={styles.gridLine} style={{ top: '25%' }} />
          <View className={styles.gridLine} style={{ top: '50%' }} />
          <View className={styles.gridLine} style={{ top: '75%' }} />
          <View
            className={classnames(styles.tempLine, styles.lineMax)}
            style={{ top: `${((targetRange.max + 3 - targetRange.max) / 6) * 100}%` }}
          />
          <View
            className={classnames(styles.tempLine, styles.lineMin)}
            style={{ top: `${((targetRange.max + 3 - targetRange.min) / 6) * 100}%` }}
          />
          <View className={styles.tempPoints}>
            {chartBars.map((bar, i) => (
              <View
                key={i}
                className={classnames(styles.tempBar, styles[bar.level])}
                style={{ height: bar.height }}
              />
            ))}
          </View>
        </View>
        <View className={styles.tempLabels}>
          {chartBars.filter((_, i) => i % 2 === 0).map((bar, i) => (
            <Text key={i} className={styles.tempLabel}>{bar.time}</Text>
          ))}
        </View>
        <View className={styles.chartLegend}>
          <View className={styles.legendItem}>
            <View className={styles.legendDot} style={{ background: $color-success }} />
            <Text>正常区间</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={styles.legendDot} style={{ background: $color-warning }} />
            <Text>偏高温</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={styles.legendDot} style={{ background: $color-error }} />
            <Text>超标</Text>
          </View>
        </View>
      </View>

      {/* 告警记录 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>告警记录</Text>
        <Text className={styles.titleBadge}>{tempAlerts.length}条</Text>
      </View>
      {tempAlerts.length > 0 ? (
        <View className={styles.alertList}>
          {[...tempAlerts].reverse().map(alert => (
            <View
              key={alert.id}
              className={classnames(
                styles.alertCard,
                styles[`alertCard-${alert.level}`]
              )}
            >
              <View className={styles.alertHeader}>
                <View className={styles.alertLevel}>
                  <View className={classnames(
                    styles.alertLevelBadge,
                    styles[`badge-${alert.level}`]
                  )}>
                    {alert.level === 'danger' ? '🚨 严重' : '⚠️ 警告'}
                  </View>
                </View>
                <Text className={styles.alertTime}>
                  {formatDateTime(alert.timestamp)}
                </Text>
              </View>

              <View className={styles.alertReadings}>
                <View className={styles.readingItem}>
                  <Text className={styles.readingLabel}>记录温度</Text>
                  <Text className={classnames(
                    styles.readingValue,
                    styles.danger
                  )}>
                    {alert.temperature}°C
                  </Text>
                </View>
                <View className={styles.readingItem}>
                  <Text className={styles.readingLabel}>目标上限</Text>
                  <Text className={styles.readingValue}>
                    {alert.targetMax}°C
                  </Text>
                </View>
                <View className={styles.readingItem}>
                  <Text className={styles.readingLabel}>偏差</Text>
                  <Text className={classnames(
                    styles.readingValue,
                    styles.danger
                  )}>
                    +{(alert.temperature - alert.targetMax).toFixed(1)}°C
                  </Text>
                </View>
              </View>

              <Text className={styles.alertMessage}>{alert.message}</Text>
              <View className={styles.alertSuggestion}>
                💡 {alert.suggestion}
              </View>

              <View className={styles.alertActions}>
                <View
                  className={classnames(
                    styles.ackBtn,
                    alert.acknowledged && styles.disabled
                  )}
                  onClick={() => !alert.acknowledged && handleAcknowledge(alert.id)}
                >
                  {alert.acknowledged ? '✓ 已确认' : '确认并处理'}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>✅</Text>
          <Text className={styles.emptyText}>暂无告警记录，温度运行正常</Text>
        </View>
      )}

      {/* 建议动作 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>日常检查建议</Text>
      </View>
      <View className={styles.tipCard}>
        <View className={styles.tipTitle}>
          <Text className={styles.tipIcon}>💡</Text>
          <Text>保持冷链安全操作规范</Text>
        </View>
        <View className={styles.tipList}>
          <View className={styles.tipItem}>
            <View className={styles.tipNum}>1</View>
            <Text>出车前提前30-45分钟启动预冷，确保车厢温度达到货物要求</Text>
          </View>
          <View className={styles.tipItem}>
            <View className={styles.tipNum}>2</View>
            <Text>装卸货时尽量减少开门时间，每站控制在20分钟以内</Text>
          </View>
          <View className={styles.tipItem}>
            <View className={styles.tipNum}>3</View>
            <Text>行驶途中每2小时检查一次温度仪表和制冷机状态</Text>
          </View>
          <View className={styles.tipItem}>
            <View className={styles.tipNum}>4</View>
            <Text>遇到温度异常先检查门封条和制冷机组，必要时联系调度</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default TemperaturePage;
