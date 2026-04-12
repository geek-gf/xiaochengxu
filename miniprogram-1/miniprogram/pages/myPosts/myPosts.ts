export {}
const myPostsDb = wx.cloud.database()

type Post = {
  _id: string
  content: string
  avatarUrl: string
  nickName: string
  openid: string
  createTime: Date
  timeAgo?: string
}

Page({
  data: {
    postList: [] as Post[],
    loading: false,
    noMore: false,
    page: 0,
    pageSize: 10,
    statusBarHeight: 0,
    contentPaddingTop: 0,
    scrollHeight: 0,
    refresherTriggered: false
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
    const headerRpxHeight = 140
    const rpxToPx = windowInfo.screenWidth / 750
    const contentPaddingTop = statusBarHeight + Math.round(headerRpxHeight * rpxToPx)
    const scrollHeight = windowInfo.windowHeight - contentPaddingTop
    this.setData({ statusBarHeight, contentPaddingTop, scrollHeight })
    this.loadPosts(false)
  },

  onShow() {
    this.loadPosts(false)
  },

  async onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
    await this.loadPosts(false)
    this.setData({ refresherTriggered: false })
  },

  onReachBottom() {
    this.loadPosts(true)
  },

  async loadPosts(isLoadMore = false) {
    if (this.data.loading || (isLoadMore && this.data.noMore)) return

    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    let { page, pageSize } = this.data
    if (!isLoadMore) {
      page = 0
      this.setData({ noMore: false, postList: [] })
    }

    try {
      // Filter by openid if available, otherwise by nickName
      const query = userInfo.openid
        ? myPostsDb.collection('post').where({ openid: userInfo.openid })
        : myPostsDb.collection('post').where({ nickName: userInfo.nickName })

      const res = await query
        .orderBy('createTime', 'desc')
        .skip(page * pageSize)
        .limit(pageSize)
        .get()

      let newList = res.data as Post[]

      if (newList.length < pageSize) {
        this.setData({ noMore: true })
      }

      newList = newList.map(item => ({
        ...item,
        timeAgo: this.formatTimeAgo(item.createTime)
      }))

      const fileList = newList.map(item => item.avatarUrl).filter(url => url && url.startsWith('cloud://'))
      if (fileList.length > 0) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList })
        const urlMap: Record<string, string> = {}
        tempRes.fileList.forEach((f: any) => {
          urlMap[f.fileID] = f.tempFileURL
        })
        newList = newList.map(item => ({
          ...item,
          avatarUrl: urlMap[item.avatarUrl] && urlMap[item.avatarUrl].startsWith('https')
            ? urlMap[item.avatarUrl]
            : '/pages/images/1.png'
        }))
      }

      this.setData({
        postList: isLoadMore ? [...this.data.postList, ...newList] : newList,
        page: page + 1
      })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }

    this.setData({ loading: false })
  },

  goBack() {
    wx.navigateBack()
  },

  goPostDetail(e: any) {
    const postId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/postDetail/postDetail?postId=${postId}`
    })
  }
})
