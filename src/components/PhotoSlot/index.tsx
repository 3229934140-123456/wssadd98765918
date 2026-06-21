import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import classnames from 'classnames';
import { PhotoSlotData } from '@/types/cold-chain';

interface PhotoSlotProps {
  data: PhotoSlotData;
  onImageChange?: (key: string, url: string) => void;
}

const PhotoSlot: React.FC<PhotoSlotProps> = ({ data, onImageChange }) => {
  const handleChooseImage = async () => {
    try {
      console.log('[PhotoSlot] 选择照片:', data.key);
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album']
      });
      const url = res.tempFilePaths[0];
      console.log('[PhotoSlot] 照片选择成功:', url);
      onImageChange?.(data.key, url);
    } catch (e) {
      console.error('[PhotoSlot] 照片选择失败:', e);
    }
  };

  const handlePreview = () => {
    if (!data.imageUrl) return;
    Taro.previewImage({
      current: data.imageUrl,
      urls: [data.imageUrl]
    });
  };

  return (
    <View className={styles.slotWrapper}>
      <View className={styles.slotHeader}>
        <Text className={styles.slotLabel}>
          {data.label}
          {data.required && <Text className={styles.required}>*</Text>}
        </Text>
      </View>

      {data.imageUrl ? (
        <View className={styles.previewBox} onClick={handlePreview}>
          <Image
            className={styles.previewImg}
            src={data.imageUrl}
            mode="aspectFill"
            onError={(e) => console.error('[PhotoSlot] 图片加载失败:', e)}
          />
          <View className={styles.previewMask}>
            <Text className={styles.previewHint}>点击预览</Text>
          </View>
          <View className={styles.retakeBtn} onClick={(e) => {
            e.stopPropagation();
            handleChooseImage();
          }}>
            <Text className={styles.retakeText}>重拍</Text>
          </View>
          <View className={styles.uploadedBadge}>
            <Text className={styles.badgeText}>✓ 已上传</Text>
          </View>
        </View>
      ) : (
        <View
          className={classnames(styles.uploadBox, data.required && styles.requiredBox)}
          onClick={handleChooseImage}
        >
          <View className={styles.cameraIcon}>
            <Text className={styles.cameraEmoji}>📷</Text>
          </View>
          <Text className={styles.uploadHint}>{data.tip}</Text>
          <Text className={styles.uploadBtn}>
            点击拍照
          </Text>
        </View>
      )}
    </View>
  );
};

export default PhotoSlot;
