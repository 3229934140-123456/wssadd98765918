import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';
import classnames from 'classnames';

export interface StepItem {
  key: string;
  label: string;
  description?: string;
  status: 'completed' | 'active' | 'pending';
}

interface StepIndicatorProps {
  steps: StepItem[];
  direction?: 'horizontal' | 'vertical';
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  direction = 'horizontal'
}) => {
  return (
    <View
      className={classnames(
        styles.container,
        direction === 'vertical' && styles.vertical
      )}
    >
      {steps.map((step, index) => (
        <View
          key={step.key}
          className={classnames(
            styles.stepItem,
            direction === 'vertical' && styles.verticalItem
          )}
        >
          <View className={styles.stepCircleWrapper}>
            <View
              className={classnames(
                styles.stepCircle,
                styles[`step-${step.status}`]
              )}
            >
              {step.status === 'completed' && (
                <Text className={styles.checkMark}>✓</Text>
              )}
              {step.status === 'active' && (
                <Text className={styles.stepNumber}>{index + 1}</Text>
              )}
              {step.status === 'pending' && (
                <Text className={styles.stepNumber}>{index + 1}</Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View
                className={classnames(
                  styles.stepLine,
                  direction === 'vertical' && styles.verticalLine,
                  step.status === 'completed' && styles.lineCompleted
                )}
              />
            )}
          </View>

          <View className={styles.stepContent}>
            <Text
              className={classnames(
                styles.stepLabel,
                step.status !== 'pending' && styles.labelActive
              )}
            >
              {step.label}
            </Text>
            {step.description && (
              <Text className={styles.stepDesc}>{step.description}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

export default StepIndicator;
