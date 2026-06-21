import Taro from '@tarojs/taro';
import { TempAlert } from '@/types/cold-chain';

export function getTempStatusColor(status: 'safe' | 'warning' | 'danger'): string {
  const map = {
    safe: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336'
  };
  return map[status];
}

export function getTempStatusText(status: 'safe' | 'warning' | 'danger'): string {
  const map = {
    safe: '温度正常',
    warning: '温度偏高',
    danger: '温度超标'
  };
  return map[status];
}

export function generateSuggestion(
  temp: number,
  targetMax: number,
  level: 'warning' | 'danger'
): string {
  if (level === 'danger') {
    return '请立即停车检查：1.确认制冷机运行状态 2.检查车厢门密封条 3.减少开门次数';
  }
  const diff = Math.abs(temp - targetMax);
  if (diff < 0.5) {
    return '建议降低制冷机设定温度1-2度，检查车厢门是否密闭';
  }
  return '请检查制冷机工作状态，尽量减少车厢开门时间';
}

export async function playVoiceAlert(message: string): Promise<void> {
  console.log('[TempAlert] 播放语音提醒:', message);

  try {
    Taro.vibrateLong();
  } catch (e) {
    console.warn('[TempAlert] 震动不支持');
  }

  try {
    Taro.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    });
  } catch (e) {
    console.warn('[TempAlert] Toast失败');
  }

  try {
    if (process.env.TARO_ENV === 'weapp') {
      const plugin = requirePlugin && requirePlugin('WechatSI');
      if (plugin && plugin.textToSpeech) {
        console.log('[TempAlert] 使用微信同声传译插件播放');
        plugin.textToSpeech({
          lang: 'zh_CN',
          tts: true,
          content: message,
          success: (res: any) => {
            console.log('[TempAlert] 语音合成成功:', res.filename);
            if (res.filename) {
              const audio = Taro.createInnerAudioContext();
              audio.src = res.filename;
              audio.play();
              audio.onError((err) => {
                console.error('[TempAlert] 音频播放错误:', err);
                audio.destroy();
              });
              audio.onEnded(() => {
                audio.destroy();
              });
            }
          },
          fail: (err: any) => {
            console.error('[TempAlert] 语音合成失败:', err);
            playBeepFallback();
          }
        });
        return;
      } else {
        console.log('[TempAlert] 微信同声传译插件未配置，使用Web Speech API');
      }
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      console.log('[TempAlert] 使用Web Speech API');
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      return;
    }

    playBeepFallback();
  } catch (e) {
    console.error('[TempAlert] 语音提醒完全失败:', e);
    playBeepFallback();
  }
}

function playBeepFallback() {
  console.log('[TempAlert] 使用蜂鸣提示');
  try {
    const audioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (audioContext) {
      const ctx = new audioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, 500);
    }
  } catch (e) {
    console.warn('[TempAlert] 蜂鸣也不支持');
  }
}

export function shouldTriggerAlert(
  temp: number,
  targetMax: number
): { shouldAlert: boolean; level: 'warning' | 'danger' | null } {
  const diff = temp - targetMax;
  if (diff > 1) return { shouldAlert: true, level: 'danger' };
  if (diff > 0) return { shouldAlert: true, level: 'warning' };
  return { shouldAlert: false, level: null };
}

export function createTempAlert(
  temp: number,
  targetMax: number,
  level: 'warning' | 'danger'
): TempAlert {
  return {
    id: `ALT_${Date.now()}`,
    timestamp: Date.now(),
    temperature: temp,
    targetMax,
    level,
    message: level === 'danger' ? '温度超标！请立即检查' : '温度接近上限，请检查制冷机',
    suggestion: generateSuggestion(temp, targetMax, level),
    acknowledged: false
  };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
}

export function formatTime(timestamp: number | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${m}-${d} ${h}:${min}`;
}
