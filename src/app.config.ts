export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/temperature/index',
    'pages/arrival/index',
    'pages/evidence-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1E88E5',
    navigationBarTitleText: '冷链管家',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#90A4AE',
    selectedColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '今日任务'
      },
      {
        pagePath: 'pages/temperature/index',
        text: '温区提醒'
      },
      {
        pagePath: 'pages/arrival/index',
        text: '到站确认'
      }
    ]
  }
})
