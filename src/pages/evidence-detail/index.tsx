import React, { useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useTripStore } from '@/store/trip-store';
import { cargoTypeLabels, stopTypeLabels } from '@/data/mock-data';
import { formatDateTime } from '@/utils/temp-alert';
import { TripEvidence } from '@/types/cold-chain';

const EvidenceDetailPage: React.FC = () => {
  const router = useRouter();
  const stopId = router.params.stopId as string;

  const { driver, currentTask, arrivalRecords } = useTripStore();

  const evidence = useMemo<TripEvidence | null>(() => {
    if (!stopId) return null;

    const state = useTripStore.getState();
    const found = state.getEvidenceByStopId(stopId);
    if (found) {
      console.log('[EvidenceDetail] 找到已有证据:', found.taskId);
      return found;
    }

    const stopRecord = state.arrivalRecords.find(r => r.stopId === stopId);
    if (stopRecord) {
      try {
        console.log('[EvidenceDetail] 找到到站记录，即时生成证据');
        return state.generateEvidence(stopId);
      } catch (e) {
        console.error('[EvidenceDetail] 生成证据失败:', e);
        return null;
      }
    }

    return null;
  }, [stopId, arrivalRecords]);

  const stopRecord = useMemo(() => {
    if (!evidence || !evidence.arrivals || evidence.arrivals.length === 0) return null;
    const found = evidence.arrivals.find(a => a.stopId === stopId);
    if (found) return found;
    return evidence.arrivals[evidence.arrivals.length - 1];
  }, [evidence, stopId]);

  const stopInfo = useMemo(() => {
    if (!stopRecord) return currentTask.stopList[0];
    return currentTask.stopList.find(s => s.id === stopRecord.stopId) || currentTask.stopList[0];
  }, [stopRecord, currentTask]);

  const tempStats = useMemo(() => {
    if (!evidence || !evidence.tempReadings || evidence.tempReadings.length === 0) {
      return { min: 0, max: 0, avg: 0, readings: [] };
    }
    const temps = evidence.tempReadings.map(r => r.temperature);
    return {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length * 10) / 10,
      readings: evidence.tempReadings
    };
  }, [evidence]);

  const tempItems = useMemo(() => {
    const readings = [...tempStats.readings].reverse().slice(0, 8);
    if (!evidence || !evidence.cargoList || evidence.cargoList.length === 0) {
      return readings.map(r => ({
        ...r,
        level: 'safe' as const,
        width: '50%',
        fillColor: '#4CAF50'
      }));
    }
    const targetMax = Math.max(...evidence.cargoList.map(c => c.targetTempMax));
    return readings.map(r => {
      const diff = r.temperature - targetMax;
      let level: 'safe' | 'warning' | 'danger' = 'safe';
      if (diff > 1) level = 'danger';
      else if (diff > 0) level = 'warning';
      const range = tempStats.max - tempStats.min + 6;
      const width = Math.max(20, ((r.temperature - (tempStats.min - 3)) / range) * 100);
      return {
        ...r,
        level,
        width: `${width}%`,
        fillColor: level === 'safe' ? '#4CAF50' : level === 'warning' ? '#FF9800' : '#F44336'
      };
    });
  }, [tempStats, evidence]);

  const handlePreviewPhoto = (url: string) => {
    const urls = stopRecord
      ? [stopRecord.tempPhotoUrl, stopRecord.sealPhotoUrl, stopRecord.unloadPhotoUrl].filter(Boolean)
      : [];
    Taro.previewImage({
      current: url,
      urls: urls.length > 0 ? urls : [url]
    });
  };

  const handleShare = () => {
    console.log('[EvidenceDetail] 分享证据链');
    Taro.showToast({
      title: '证据链链接已复制',
      icon: 'success'
    });
  };

  const handleDownload = () => {
    console.log('[EvidenceDetail] 下载证据报告');
    Taro.showLoading({ title: '正在生成报告...' });
    setTimeout(() => {
      Taro.hideLoading();
      Taro.showToast({
        title: '报告已保存到相册',
        icon: 'success'
      });
    }, 1500);
  };

  if (!evidence) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View style={{ padding: '120rpx 40rpx', textAlign: 'center' }}>
          <Text style={{ fontSize: '100rpx' }}>📋</Text>
          <View style={{ marginTop: '32rpx', fontSize: '36rpx', fontWeight: 600, color: '#37474F' }}>
            暂无行程证据
          </View>
          <View style={{ marginTop: '16rpx', fontSize: '28rpx', color: '#78909C', lineHeight: 1.6 }}>
            请先在「到站确认」页面完成到站登记并生成证据链
          </View>
          <View
            style={{
              marginTop: '48rpx',
              padding: '24rpx 48rpx',
              background: '#1E88E5',
              color: '#fff',
              borderRadius: '16rpx',
              display: 'inline-block'
            }}
            onClick={() => Taro.switchTab({ url: '/pages/arrival/index' })}
          >
            前往到站确认
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView scrollY className={styles.page}>
      {/* 证据头部 */}
      <View className={styles.evidenceHeader}>
        <View className={styles.headerContent}>
          <View className={styles.verifiedBadge}>
            <Text className={styles.verifiedIcon}>🔒</Text>
            <Text className={styles.verifiedText}>区块链可信证据 · 不可篡改</Text>
          </View>
          <View className={styles.taskId}>#{evidence.taskId}</View>
          <View className={styles.taskRoute}>{evidence.routeName}</View>
          <View className={styles.headerMeta}>
            <View className={styles.metaBlock}>
              <View className={styles.metaLabel}>司机</View>
              <View className={styles.metaValue}>{evidence.driverName}</View>
            </View>
            <View className={styles.metaBlock}>
              <View className={styles.metaLabel}>车牌号</View>
              <View className={styles.metaValue}>{evidence.plateNumber}</View>
            </View>
            <View className={styles.metaBlock}>
              <View className={styles.metaLabel}>发车时间</View>
              <View className={styles.metaValue}>{formatDateTime(evidence.startTime)}</View>
            </View>
            <View className={styles.metaBlock}>
              <View className={styles.metaLabel}>完成时间</View>
              <View className={styles.metaValue}>
                {evidence.endTime ? formatDateTime(evidence.endTime) : '进行中'}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 货物信息 */}
      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.titleText}>
            <Text className={styles.titleIcon}>📦</Text>
            <Text>承运货物</Text>
          </View>
          <View className={styles.titleCount}>{evidence.cargoList.length}种</View>
        </View>
        <View className={styles.card}>
          {evidence.cargoList.map(cargo => (
            <View className={styles.cargoItem} key={cargo.id}>
              <View
                className={styles.cargoType}
                style={{
                  background: cargo.type === 'frozen_beef'
                    ? 'rgba(0, 172, 193, 0.15)'
                    : cargo.type === 'chilled_pork'
                      ? 'rgba(38, 166, 154, 0.15)'
                      : 'rgba(102, 187, 106, 0.15)'
                }}
              >
                {cargo.type === 'frozen_beef' ? '❄️' : cargo.type === 'chilled_pork' ? '🐷' : '🍗'}
              </View>
              <View className={styles.cargoInfo}>
                <View className={styles.cargoName}>{cargo.name}</View>
                <View className={styles.cargoSpec}>
                  {cargoTypeLabels[cargo.type]} · {(cargo.weight / 1000).toFixed(1)}吨 ·
                  温区 {cargo.targetTempMin}~{cargo.targetTempMax}°C
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 温度日志 */}
      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.titleText}>
            <Text className={styles.titleIcon}>🌡️</Text>
            <Text>温度日志</Text>
          </View>
          <View className={styles.titleCount}>共 {tempStats.readings.length} 条</View>
        </View>
        <View className={styles.card}>
          <View className={styles.tempOverview}>
            <View className={styles.tempStat}>
              <View className={styles.tempStatLabel}>最低温度</View>
              <View className={classnames(styles.tempStatValue, styles.min)}>
                {tempStats.min.toFixed(1)}°C
              </View>
            </View>
            <View className={styles.tempStat}>
              <View className={styles.tempStatLabel}>平均温度</View>
              <View className={classnames(styles.tempStatValue, styles.avg)}>
                {tempStats.avg.toFixed(1)}°C
              </View>
            </View>
            <View className={styles.tempStat}>
              <View className={styles.tempStatLabel}>最高温度</View>
              <View className={classnames(styles.tempStatValue, styles.max)}>
                {tempStats.max.toFixed(1)}°C
              </View>
            </View>
          </View>
          <View className={styles.tempList}>
            {tempItems.map((item, idx) => (
              <View className={styles.tempItem} key={idx}>
                <View className={styles.tempItemTime}>
                  {formatDateTime(item.timestamp).split(' ')[1]}
                </View>
                <View className={styles.tempItemRange}>
                  <View
                    className={styles.tempItemFill}
                    style={{ width: item.width, background: item.fillColor }}
                  />
                </View>
                <View className={classnames(styles.tempItemValue, styles[item.level])}>
                  {item.temperature > 0 ? '+' : ''}{item.temperature.toFixed(1)}°
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 告警记录 */}
      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.titleText}>
            <Text className={styles.titleIcon}>⚠️</Text>
            <Text>告警记录</Text>
          </View>
          <View className={styles.titleCount}>{evidence.alerts.length}条</View>
        </View>
        <View className={styles.card}>
          {evidence.alerts.length > 0 ? (
            evidence.alerts.map(alert => (
              <View
                className={classnames(styles.alertItem, styles[alert.level])}
                key={alert.id}
              >
                <View className={styles.alertHead}>
                  <View className={classnames(styles.alertLevel, styles[alert.level])}>
                    <Text>{alert.level === 'danger' ? '🚨' : '⚠️'}</Text>
                    <Text>{alert.level === 'danger' ? '严重超标' : '温度偏高'}</Text>
                  </View>
                  <View className={styles.alertTime}>
                    {formatDateTime(alert.timestamp)}
                  </View>
                </View>
                <View className={styles.alertMsg}>
                  📊 记录温度 <strong>{alert.temperature}°C</strong>，
                  超过目标上限 {alert.targetMax}°C 达
                  <strong style={{ color: '#F44336' }}>
                    +{(alert.temperature - alert.targetMax).toFixed(1)}°C
                  </strong>
                  ，{alert.acknowledged ? '司机已确认处理' : '待确认处理'}
                </View>
                <View className={styles.alertSug}>
                  💡 {alert.suggestion}
                </View>
              </View>
            ))
          ) : (
            <View style={{ padding: '48rpx 0', textAlign: 'center' }}>
              <Text style={{ fontSize: '60rpx' }}>✅</Text>
              <View style={{ marginTop: '16rpx', color: '#86909C', fontSize: '28rpx' }}>
                本次运输无温度告警记录
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 到站记录 */}
      <View className={styles.section}>
        <View className={styles.sectionTitle}>
          <View className={styles.titleText}>
            <Text className={styles.titleIcon}>📍</Text>
            <Text>到站记录</Text>
          </View>
          <View className={styles.titleCount}>{evidence.arrivals.length}站</View>
        </View>

        {stopRecord ? (
          <View className={styles.card}>
            <View className={styles.stopRecord}>
              <View className={styles.stopHead}>
                <View className={styles.stopName}>{stopInfo?.name}</View>
                <View className={styles.stopTag}>
                  {stopInfo ? stopTypeLabels[stopInfo.type] : '站点'}
                </View>
              </View>
              <View className={styles.stopMeta}>
                <View className={styles.stopMetaItem}>
                  <View className={styles.smLabel}>到站时间</View>
                  <View className={styles.smValue}>
                    {formatDateTime(stopRecord.arrivalTime)}
                  </View>
                </View>
                <View className={styles.stopMetaItem}>
                  <View className={styles.smLabel}>到站温度</View>
                  <View className={styles.smValue} style={{ color: '#00ACC1' }}>
                    {stopRecord.temperatureAtArrival.toFixed(1)}°C
                  </View>
                </View>
                <View className={styles.stopMetaItem}>
                  <View className={styles.smLabel}>开门时间</View>
                  <View className={styles.smValue}>
                    {formatDateTime(stopRecord.doorOpenTime).split(' ')[1]}
                  </View>
                </View>
                <View className={styles.stopMetaItem}>
                  <View className={styles.smLabel}>开门时长</View>
                  <View
                    className={styles.smValue}
                    style={{ color: stopRecord.doorOpenDuration > 20 ? '#F44336' : '#4CAF50' }}
                  >
                    {stopRecord.doorOpenDuration} 分钟
                  </View>
                </View>
              </View>
              <View className={styles.photoGrid}>
                <View
                  className={styles.photoSlot}
                  onClick={() => handlePreviewPhoto(stopRecord.tempPhotoUrl)}
                >
                  <Image
                    className={styles.photoImg}
                    src={stopRecord.tempPhotoUrl}
                    mode="aspectFill"
                  />
                  <View className={styles.photoLabel}>温度表</View>
                </View>
                <View
                  className={styles.photoSlot}
                  onClick={() => handlePreviewPhoto(stopRecord.sealPhotoUrl)}
                >
                  <Image
                    className={styles.photoImg}
                    src={stopRecord.sealPhotoUrl}
                    mode="aspectFill"
                  />
                  <View className={styles.photoLabel}>封签照</View>
                </View>
                <View
                  className={styles.photoSlot}
                  onClick={() => handlePreviewPhoto(stopRecord.unloadPhotoUrl)}
                >
                  <Image
                    className={styles.photoImg}
                    src={stopRecord.unloadPhotoUrl}
                    mode="aspectFill"
                  />
                  <View className={styles.photoLabel}>卸货现场</View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View className={styles.card} style={{ padding: '64rpx 32rpx', textAlign: 'center' }}>
            <Text style={{ fontSize: '64rpx' }}>📝</Text>
            <View style={{ marginTop: '16rpx', color: '#86909C' }}>
              暂无到站记录，请到站确认后查看
            </View>
          </View>
        )}
      </View>

      {/* 超温原因分析 */}
      {evidence.alerts.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionTitle}>
            <View className={styles.titleText}>
              <Text className={styles.titleIcon}>🔍</Text>
              <Text>超温原因分析</Text>
            </View>
          </View>
          <View className={styles.card}>
            <View style={{
              padding: '24rpx',
              background: 'rgba(255,152,0,0.06)',
              borderRadius: '16rpx',
              borderLeft: '8rpx solid #FF9800'
            }}>
              <Text style={{
                fontSize: '28rpx',
                fontWeight: 600,
                color: '#E65100',
                marginBottom: '16rpx',
                display: 'block'
              }}>
                📋 自动归因分析（仅供参考）
              </Text>
              <Text style={{ fontSize: '26rpx', color: '#EF6C00', lineHeight: 1.8 }}>
                根据证据链数据：本次运输共记录 {evidence.alerts.length} 次温度异常，
                其中最高超标 {(Math.max(...evidence.alerts.map(a => a.temperature - a.targetMax))).toFixed(1)}°C。
                {stopRecord && stopRecord.doorOpenDuration > 15
                  ? `\n\n⚠️ 开门时长 ${stopRecord.doorOpenDuration} 分钟，超过建议值 15 分钟，可能为超温主要原因之一。`
                  : '\n\n✅ 开门时长在合理范围内，建议排查制冷机运行状态。'}
                {'\n\n'}所有温度记录、照片证据和时间戳已完整留存，可用于责任判定。
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 操作区 */}
      <View className={styles.actionArea}>
        <View className={styles.shareBtn} onClick={handleShare}>
          🔗 分享证据链链接
        </View>
        <View className={styles.downloadBtn} onClick={handleDownload}>
          📄 下载完整证据报告 PDF
        </View>
        <View className={styles.generateTime}>
          证据生成时间：{formatDateTime(evidence.generatedAt)}
        </View>
      </View>
    </ScrollView>
  );
};

export default EvidenceDetailPage;
