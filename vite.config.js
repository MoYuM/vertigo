export default {
  // 部署在 support.hedianer.cn/vertigo/ 子路径下，资源必须带上这个前缀。
  base: '/vertigo/',
  build: {
    // 小工具容器的最低内核是 Android 8.1 出场的 WebView 61，
    // web 版跟着一起编，免得两套产物里只有一套被验证过。
    target: ['es2017', 'chrome61'],
    cssTarget: 'chrome61',
  },
};
