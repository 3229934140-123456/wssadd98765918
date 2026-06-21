import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { useTripStore } from '@/store/trip-store';
import StepIndicator, { StepItem } from '@/components/StepIndicator';
import PhotoSlot from '@/components/PhotoSlot';
import { PhotoSlotData, ArrivalRecord } from '@/types/cold-chain';
import { stopTypeLabels } from '@/data/mock-data';
import { formatTime, formatDateTime } from '@/utils/temp-alert';

const ArrivalPage: React.FC = () => {
  const {
    currentTask,
    currentStopIndex,
    getCurrentTemp,
    completeStop,
    addArrivalRecord,
    generateEvidence,
    arrivalRecords,
    getEvidenceByStopId
  } = useTripStore();

  const currentStop = currentTask.stopList[currentStopIndex];

  const [currentStep, setCurrentStep] = useState(1);
  const [doorOpenTime, setDoorOpenTime] = useState<number | null>(null);
  const [doorCloseTime, setDoorCloseTime] = useState<number | null>(null);
  const [doorDuration, setDoorDuration] = useState<number>(0);
  const [arrivalTemp, setArrivalTemp] = useState(getCurrentTemp());
  const [evidenceGenerated, setEvidenceGenerated] = useState(false);
  const [recordSubmitted, setRecordSubmitted] = useState(false);

  useEffect(() => {
    if (!currentStop) return;
    const existingRecord = arrivalRecords.find(r => r.stopId === currentStop.id);
    const existingEvidence = getEvidenceByStopId(currentStop.id);
    console.log('[ArrivalPage] 检查当前站数据:', currentStop.id, 
      '有记录:', !!existingRecord, 
      '有证据:', !!existingEvidence);
    if (existingRecord) {
      setDoorOpenTime(existingRecord.doorOpenTime);
      setDoorCloseTime(existingRecord.doorCloseTime);
      setDoorDuration(existingRecord.doorOpenDuration);
      setArrivalTemp(existingRecord.temperatureAtArrival);
      setPhotos(prev => prev.map(p => {
        if (p.key === 'temp') return { ...p, imageUrl: existingRecord.tempPhotoUrl };
        if (p.key === 'seal') return { ...p, imageUrl: existingRecord.sealPhotoUrl };
        if (p.key === 'unload') return { ...p, imageUrl: existingRecord.unloadPhotoUrl };
        return p;
      }));
      setCurrentStep(4);
      setEvidenceGenerated(true);
    }
  }, [currentStop?.id]);

  const [photos, setPhotos] = useState<PhotoSlotData[]>([
    {
      key: 'temp',
      label: '第一步：拍摄车厢温度表',
      tip: '请清晰拍摄温控器显示屏读数，确保温度数值可辨认',
      required: true
    },
    {
      key: 'seal',
      label: '第二步：拍摄货物封签',
      tip: '对准车门封签或铅封特写，确保封签编号清晰可见',
      required: true
    },
    {
      key: 'unload',
      label: '第三步：拍摄卸货现场',
      tip: '拍摄完整卸货场景，包含货物、人员和时间标识',
      required: true
    }
  ]);

  // 开门计时器
  useEffect(() => {
    if (doorOpenTime && !doorCloseTime) {
      const timer = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - doorOpenTime) / 1000 / 60);
        setDoorDuration(elapsed);
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [doorOpenTime, doorCloseTime]);

  // 刷新到达温度
  useEffect(() => {
    const interval = setInterval(() => {
      setArrivalTemp(getCurrentTemp());
    }, 5000);
    return () => clearInterval(interval);
  }, [getCurrentTemp]);

  const steps: StepItem[] = useMemo(() => [
    {
      key: 'arrive',
      label: '到站确认',
      status: 'completed'
    },
    {
      key: 'time',
      label: '开门时间',
      status: currentStep >= 2 ? (currentStep > 2 ? 'completed' : 'active') : 'pending'
    },
    {
      key: 'photo',
      label: '拍照留证',
      status: currentStep >= 3 ? (currentStep > 3 ? 'completed' : 'active') : 'pending'
    },
    {
      key: 'evidence',
      label: '生成证据',
      status: currentStep >= 4 ? 'completed' : 'pending'
    }
  ], [currentStep]);

  const uploadedCount = photos.filter(p => p.imageUrl).length;
  const allPhotosUploaded = photos.every(p => p.imageUrl || !p.required);

  const handleToggleDoorTimer = () => {
    if (!doorOpenTime) {
      const now = Date.now();
      console.log('[ArrivalPage] 开始计时，开门时间:', now);
      setDoorOpenTime(now);
      Taro.showToast({
        title: '已记录开门时间',
        icon: 'success'
      });
    } else if (!doorCloseTime) {
      const now = Date.now();
      const duration = Math.floor((now - doorOpenTime) / 1000 / 60);
      console.log('[ArrivalPage] 停止计时，关门时间:', now, '时长:', duration, '分钟');
      setDoorCloseTime(now);
      setDoorDuration(duration);
      Taro.showToast({
        title: `开门时长 ${duration} 分钟`,
        icon: 'success'
      });
      setTimeout(() => setCurrentStep(3), 800);
    }
  };

  const handleImageChange = (key: string, url: string) => {
    console.log('[ArrivalPage] 照片更新:', key, url);
    setPhotos(prev => prev.map(p => p.key === key ? { ...p, imageUrl: url } : p));
    setArrivalTemp(getCurrentTemp());
  };

  const canGenerateEvidence = doorOpenTime !== null && allPhotosUploaded;

  const handleGenerateEvidence = () => {
    if (!canGenerateEvidence) {
      Taro.showToast({
        title: '请完成时间记录和照片上传',
        icon: 'none'
      });
      return;
    }

    const tempPhoto = photos.find(p => p.key === 'temp')?.imageUrl || '';
    const sealPhoto = photos.find(p => p.key === 'seal')?.imageUrl || '';
    const unloadPhoto = photos.find(p => p.key === 'unload')?.imageUrl || '';

    const finalDoorCloseTime = doorCloseTime || Date.now();
    const finalDuration = doorCloseTime 
      ? doorDuration 
      : Math.floor((finalDoorCloseTime - doorOpenTime!) / 1000 / 60);

    const record: ArrivalRecord = {
      stopId: currentStop.id,
      arrivalTime: Date.now(),
      tempPhotoUrl: tempPhoto,
      sealPhotoUrl: sealPhoto,
      unloadPhotoUrl: unloadPhoto,
      doorOpenDuration: finalDuration,
      doorOpenTime: doorOpenTime!,
      doorCloseTime: finalDoorCloseTime,
      temperatureAtArrival: arrivalTemp
    };

    console.log('[ArrivalPage] 生成到站记录:', record);
    addArrivalRecord(record);

    const evidence = generateEvidence(currentStop.id);
    console.log('[ArrivalPage] 证据已生成:', evidence.taskId);
    setEvidenceGenerated(true);
    setCurrentStep(4);

    Taro.showModal({
      title: '证据链已生成',
      content: `行程证据链已自动汇总，包含温度日志、照片记录和时间戳。可用于证明超温原因。`,
      showCancel: false,
      confirmText: '查看证据'
    }).then(() => {
      Taro.navigateTo({
        url: `/pages/evidence-detail/index?stopId=${currentStop.id}`
      });
    });
  };

  const handleSubmitAndNext = () => {
    if (!evidenceGenerated) {
      handleGenerateEvidence();
      return;
    }

    console.log('[ArrivalPage] 提交并前往下一站，使用已有证据，不覆盖');
    const existingEvidence = useTripStore.getState().getEvidenceByStopId(currentStop.id);
    if (existingEvidence) {
      console.log('[ArrivalPage] 证据已存在:', existingEvidence.taskId);
    }

    completeStop();
    setRecordSubmitted(true);

    Taro.showToast({
      title: '本站确认完成',
      icon: 'success',
      duration: 2000
    });

    setTimeout(() => {
      setCurrentStep(1);
      setDoorOpenTime(null);
      setDoorCloseTime(null);
      setDoorDuration(0);
      setEvidenceGenerated(false);
      setRecordSubmitted(false);
      setPhotos(prev => prev.map(p => ({ ...p, imageUrl: undefined })));
    }, 2000);
  };

  const formatTimer = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  if (!currentStop) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View style={{ padding: '100rpx 0', textAlign: 'center' }}>
          <Text style={{ fontSize: '80rpx' }}>🎉</Text>
          <View style={{ marginTop: '32rpx', fontSize: '32rpx', color: '#546E7A' }}>
            今日所有站点已完成，辛苦了！
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView scrollY className={styles.page}>
      {/* 当前站点信息 */}
      <View className={styles.stopInfoCard}>
        <View className={styles.stopHeader}>
          <View className={styles.stopTitle}>
            <View className={classnames(styles.typeTag, styles[`tag-${currentStop.type}`])}>
              {stopTypeLabels[currentStop.type]}
            </View>
            <Text>第{currentStop.sequence}站 · {currentStop.name}</Text>
          </View>
          <View className={styles.stopStatus}>进行中</View>
        </View>
        <View className={styles.stopAddress}>📍 {currentStop.address}</View>
        <View className={styles.stopMeta}>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>计划到达</Text>
            <Text className={styles.metaValue}>{formatTime(currentStop.plannedArrivalTime)}</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>剩余站点</Text>
            <Text className={styles.metaValue}>{currentTask.stopList.length - currentStopIndex - 1}站</Text>
          </View>
          <View className={styles.metaItem}>
            <Text className={styles.metaLabel}>到站温度</Text>
            <Text className={styles.metaValue} style={{ color: '#00ACC1' }}>
              {arrivalTemp.toFixed(1)}°C
            </Text>
          </View>
        </View>
      </View>

      {/* 步骤指示 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>到站确认流程</Text>
        <Text className={styles.titleBadge}>第{currentStep}/4步</Text>
      </View>
      <View className={styles.stepCard}>
        <StepIndicator steps={steps} direction="horizontal" />
      </View>

      {/* 开门时间记录 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>开门时间记录</Text>
        <Text className={styles.titleBadge}>
          {doorOpenTime ? (doorCloseTime ? '已完成' : '计时中') : '待开始'}
        </Text>
      </View>
      <View className={styles.timeCard}>
        <View className={styles.timeHeader}>
          <Text className={styles.timeTitle}>
            🚪 {doorCloseTime ? '开门结束' : doorOpenTime ? '开门进行中' : '准备开门卸货'}
          </Text>
        </View>

        <View className={styles.timeDisplay}>
          <Text className={styles.timeLabel}>开门已持续</Text>
          <Text className={styles.timeValue}>{formatTimer(doorDuration)}</Text>
        </View>

        <View
          className={classnames(
            styles.timerBtn,
            doorOpenTime && !doorCloseTime && styles.stop
          )}
          onClick={handleToggleDoorTimer}
        >
          {!doorOpenTime
            ? '🔴 开始计时（开门时按下）'
            : !doorCloseTime
              ? '🟢 停止计时（关门时按下）'
              : `✓ 已记录 ${doorDuration} 分钟`}
        </View>

        {doorOpenTime && (
          <View style={{ marginTop: '24rpx' }} className={styles.durationRow}>
            <View className={styles.durationItem}>
              <Text className={styles.durationLabel}>开门时间</Text>
              <Text className={styles.durationValue}>
                {formatDateTime(doorOpenTime).split(' ')[1]}
              </Text>
            </View>
            {doorCloseTime && (
              <View className={styles.durationItem}>
                <Text className={styles.durationLabel}>关门时间</Text>
                <Text className={styles.durationValue}>
                  {formatDateTime(doorCloseTime).split(' ')[1]}
                </Text>
              </View>
            )}
            <View className={styles.durationItem}>
              <Text className={styles.durationLabel}>总时长</Text>
              <Text
                className={styles.durationValue}
                style={{ color: doorDuration > 20 ? '#F44336' : '#4CAF50' }}
              >
                {doorDuration}分钟
              </Text>
            </View>
          </View>
        )}

        <View className={styles.tempAtArrival}>
          <View className={styles.tempLabel}>
            🌡️ 到站时车厢温度
          </View>
          <View className={styles.tempValue}>
            {arrivalTemp.toFixed(1)}°C
          </View>
        </View>
      </View>

      {/* 拍照留证 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>拍照留证</Text>
        <Text className={styles.photoCount}>
          {uploadedCount}/{photos.length} 已上传
        </Text>
      </View>
      <View className={styles.photoCard}>
        <View className={styles.photoGrid}>
          {photos.map(photo => (
            <PhotoSlot
              key={photo.key}
              data={photo}
              onImageChange={handleImageChange}
            />
          ))}
        </View>
      </View>

      {/* 证据链预览 */}
      <View className={styles.sectionTitle}>
        <Text className={styles.titleText}>行程证据链</Text>
        <Text className={styles.titleBadge}>
          {evidenceGenerated ? '已生成' : '待生成'}
        </Text>
      </View>
      <View className={styles.evidenceCard}>
        <View className={styles.evidenceHeader}>
          <View className={styles.evidenceTitle}>
            <Text className={styles.evidenceIcon}>📋</Text>
            <Text>行程证据链</Text>
          </View>
          <View
            className={styles.evidenceBadge}
            style={evidenceGenerated ? undefined : {
              background: 'rgba(255,152,0,0.2)',
              color: '#FFB74D',
              borderColor: 'rgba(255,152,0,0.4)'
            }}
          >
            {evidenceGenerated ? '✓ 可信证据' : '待完成'}
          </View>
        </View>

        <View className={styles.evidenceBody}>
          <View className={styles.evidenceRow}>
            <Text className={styles.evidenceRowLabel}>任务单号</Text>
            <Text className={styles.evidenceRowValue}>{currentTask.id}</Text>
          </View>
          <View className={styles.evidenceRow}>
            <Text className={styles.evidenceRowLabel}>站点名称</Text>
            <Text className={styles.evidenceRowValue}>{currentStop.name}</Text>
          </View>
          <View className={styles.evidenceRow}>
            <Text className={styles.evidenceRowLabel}>开门时长</Text>
            <Text className={styles.evidenceRowValue}>
              {doorOpenTime ? `${doorDuration} 分钟` : '未记录'}
            </Text>
          </View>
          <View className={styles.evidenceRow}>
            <Text className={styles.evidenceRowLabel}>温度记录</Text>
            <Text className={styles.evidenceRowValue}>{arrivalTemp.toFixed(1)}°C</Text>
          </View>
          <View className={styles.evidenceRow}>
            <Text className={styles.evidenceRowLabel}>照片证据</Text>
            <Text className={styles.evidenceRowValue}>
              {uploadedCount} / {photos.length} 张
            </Text>
          </View>
          <View className={styles.evidenceRow}>
            <Text className={styles.evidenceRowLabel}>生成时间</Text>
            <Text className={styles.evidenceRowValue}>
              {evidenceGenerated ? formatDateTime(Date.now()) : '待生成'}
            </Text>
          </View>
        </View>

        <View
          className={styles.viewEvidenceBtn}
          onClick={() => {
            if (evidenceGenerated) {
              Taro.navigateTo({
                url: `/pages/evidence-detail/index?stopId=${currentStop.id}`
              });
            } else {
              Taro.showToast({ title: '请先生成证据链', icon: 'none' });
            }
          }}
        >
          🔍 查看完整证据链
        </View>
      </View>

      {/* 操作区 */}
      <View className={styles.actionBar}>
        {!evidenceGenerated ? (
          <View
            className={classnames(
              styles.submitBtn,
              styles.generate,
              !canGenerateEvidence && styles.disabled
            )}
            onClick={handleGenerateEvidence}
          >
            {canGenerateEvidence
              ? '📄 生成行程证据链'
              : `请完成 ${!doorOpenTime ? '开门时间' : ''}${!doorOpenTime && !allPhotosUploaded ? '和' : ''}${!allPhotosUploaded ? '照片上传' : ''}`}
          </View>
        ) : (
          <View
            className={classnames(styles.submitBtn, recordSubmitted && styles.disabled)}
            onClick={handleSubmitAndNext}
          >
            {recordSubmitted ? '✓ 已提交，前往下一站...' : '✅ 提交确认 · 前往下一站'}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default ArrivalPage;
