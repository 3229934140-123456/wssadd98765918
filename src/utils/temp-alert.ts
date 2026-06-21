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
  } catch (_) {}

  try {
    Taro.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    });
  } catch (_) {}

  try {
    if (process.env.TARO_ENV === 'weapp') {
      try {
        const wxObj = wx as any;
        const plugin = wxObj.requirePlugin
          ? wxObj.requirePlugin('WechatSI')
          : null;
        if (plugin && typeof plugin.textToSpeech === 'function') {
          console.log('[TempAlert] 使用微信同声传译插件播放');
          plugin.textToSpeech({
            lang: 'zh_CN',
            tts: true,
            content: message,
            success: (res: any) => {
              if (res.filename) {
                const audio = Taro.createInnerAudioContext();
                audio.src = res.filename;
                audio.play();
                audio.onError(() => { audio.destroy(); });
                audio.onEnded(() => { audio.destroy(); });
              }
            },
            fail: () => {
              playBeepFallback();
            }
          });
          return;
        }
      } catch (_) {
        console.log('[TempAlert] 微信插件不可用，使用备用方案');
      }
    }

    if (typeof globalThis !== 'undefined' && (globalThis as any).speechSynthesis) {
      console.log('[TempAlert] 使用Web Speech API');
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      (globalThis as any).speechSynthesis.cancel();
      (globalThis as any).speechSynthesis.speak(utterance);
      return;
    }

    playBeepFallback();
  } catch (e) {
    console.error('[TempAlert] 语音提醒失败:', e);
    playBeepFallback();
  }
}

function playBeepFallback() {
  console.log('[TempAlert] 使用蜂鸣提示');
  try {
    if (process.env.TARO_ENV === 'weapp') {
      const audio = Taro.createInnerAudioContext();
      audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      audio.volume = 0.8;
      audio.play();
      audio.onEnded(() => { audio.destroy(); });
      audio.onError(() => { audio.destroy(); });
      return;
    }

    const AudioCtx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
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
  } catch (_) {}
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
