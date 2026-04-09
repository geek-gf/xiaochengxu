export {}
const squareDb = wx.cloud.database()
type Post = {
  content: string
  avatarUrl: string
  nickName: string
  createTime: Date
}
Page({
    data: {
        postList: [] as Post[],
        page: 0,
        pageSize: 10,
        loading: false,
        noMore: false,
        statusBarHeight: 0,
        contentPaddingTop: 0,
        scrollHeight: 0,
        refresherTriggered: false,
      },
      formatTimeAgo(date: any) {
        const now = Date.now()
        const time = new Date(date).getTime()
      
        const diff = (now - time) / 1000
      
        if (diff < 60) return '刚刚'
        if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
        if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
        if (diff < 172800) return '昨天'
        if (diff < 2592000) return Math.floor(diff / 86400) + '天前'
      
        const d = new Date(date)
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      },
  onLoad() {
    const windowInfo = wx.getWindowInfo()
    const statusBarHeight = windowInfo.statusBarHeight || 0
    // header is 140rpx tall; 140rpx = 140/750 * screenWidth px
    const headerRpxHeight = 140
    const rpxToPx = windowInfo.screenWidth / 750
    const contentPaddingTop = statusBarHeight + Math.round(headerRpxHeight * rpxToPx)
    // scroll-view occupies all visible area below the fixed header
    const scrollHeight = windowInfo.windowHeight - contentPaddingTop
    this.setData({ statusBarHeight, contentPaddingTop, scrollHeight })
    this.getPosts(false)
  },

  onShow() {
    this.getPosts(false)
  },

  /** 触底加载更多 */
  onScrollToLower() {
    this.getPosts(true)
  },

  /** scroll-view 下拉刷新 */
  async onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
    await this.getPosts(false)
    this.setData({ refresherTriggered: false })
  },

  goPostDetail(e: any) {
    const postId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/postDetail/postDetail?postId=${postId}`
    })
  },

  async getPosts(isLoadMore = false) {

    if (this.data.loading) return
    if (isLoadMore && this.data.noMore) return
  
    this.setData({ loading: true })
  
    let { page, pageSize, postList } = this.data
  
    // 👉 如果不是加载更多，就从0开始
    if (!isLoadMore) {
      page = 0
      postList = []
      this.setData({ noMore: false }) // 🔥 建议顺便重置
    }
  
    try {
      const res = await squareDb.collection('post')
        .orderBy('createTime', 'desc')
        .skip(page * pageSize)
        .limit(pageSize)
        .get()
  
      let newList = res.data as Post[]
  
      // 👉 判断是否还有数据
      if (newList.length < pageSize) {
        this.setData({ noMore: true })
      }
  
      // =========================
      // 🔥 在这里加（时间格式化）
      // =========================
      newList = newList.map(item => ({
        ...item,
        timeAgo: this.formatTimeAgo(item.createTime)
      }))
  
      // 👉 头像处理（只转换 cloud:// 格式的 fileID）
      const cloudUrls = newList.map(item => item.avatarUrl).filter(url => url && url.startsWith('cloud://'))
      if (cloudUrls.length > 0) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: cloudUrls })
        const urlMap: Record<string, string> = {}
        tempRes.fileList.forEach((f: any) => { urlMap[f.fileID] = f.tempFileURL })
        newList = newList.map(item => ({
          ...item,
          avatarUrl: urlMap[item.avatarUrl] || (item.avatarUrl && item.avatarUrl.startsWith('https') ? item.avatarUrl : '/images/1.png')
        }))
      }
  
      // 👉 最后更新数据
      this.setData({
        postList: isLoadMore
          ? [...this.data.postList, ...newList]
          : newList,
        page: page + 1
      })
  
    } catch (err) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  
    this.setData({ loading: false })
  },

  goPublish() {
    wx.navigateTo({
      url: '/pages/publish/publish'
    })
  },
})


