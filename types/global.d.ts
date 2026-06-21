/// <reference types="@tarojs/taro" />

declare module '*.png';
declare module '*.gif';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.css';
declare module '*.less';
declare module '*.scss';
declare module '*.sass';
declare module '*.styl';

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production',
    TARO_ENV: 'weapp' | 'swan' | 'alipay' | 'h5' | 'rn' | 'tt' | 'quickapp' | 'qq' | 'jd'
    TARO_APP_ID: string
  }
}

interface WechatSIPlugin {
  textToSpeech(options: {
    lang: string;
    tts: boolean;
    content: string;
    success: (res: { filename: string }) => void;
    fail: (err: any) => void;
  }): void;
}

declare const wx: {
  requirePlugin?(name: string): WechatSIPlugin;
  [key: string]: any;
};

declare class SpeechSynthesisUtterance {
  constructor(text: string);
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
}
