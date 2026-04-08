const db = wx.cloud.database()

type HelpRequest = {
  _id: string
  title: string
  description: string
  publisherId: string
  publisherName: string
  status: 'pending' | 'ongoing' | 'done'
  acceptorId: string
  createTime: Date
  timeAgo?: string
}

Page({
  data: {
    list: [] as HelpRequest[],
    loading: false
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
    this.loadMyHelp()
  },

  onShow() {
    this.loadMyHelp()
  },

  async onPullDownRefresh() {
    await this.loadMyHelp()
    wx.stopPullDownRefresh()
  },

  async loadMyHelp() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      const publisherId = userInfo.openid || userInfo.nickName
      const res = await db.collection('helpRequest')
        .where({ publisherId })
        .orderBy('createTime', 'desc')
        .limit(50)
        .get()

      let list = res.data as HelpRequest[]
      list = list.map(item => ({
        ...item,
        timeAgo: this.formatTimeAgo(item.createTime)
      }))

      this.setData({ list })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }

    this.setData({ loading: false })
  }
})
