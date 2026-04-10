export {}
const myHelpDb = wx.cloud.database()

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
    loading: false,
    currentOpenid: '',
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

  goBack() {
    wx.navigateBack()
  },

  goDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/helpDetail/helpDetail?id=${id}` })
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo()
    const statusBarHeight = windowInfo.statusBarHeight || 0
    const headerRpxHeight = 140
    const rpxToPx = windowInfo.screenWidth / 750
    const contentPaddingTop = statusBarHeight + Math.round(headerRpxHeight * rpxToPx)
    const scrollHeight = windowInfo.windowHeight - contentPaddingTop
    this.setData({ statusBarHeight, contentPaddingTop, scrollHeight })
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ currentOpenid: userInfo.openid || userInfo.nickName || '' })
    }
    this.loadMyHelp()
  },

  onShow() {
    this.loadMyHelp()
  },

  async onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
    await this.loadMyHelp()
    this.setData({ refresherTriggered: false })
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
      const res = await myHelpDb.collection('helpRequest')
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
  },

  async endHelp(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '结束求助',
      content: '确认要结束这个求助吗？结束后将标记为已完成。',
      confirmText: '确认结束',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...' })
        try {
          await myHelpDb.collection('helpRequest').doc(id).update({
            data: { status: 'done' }
          })
          wx.showToast({ title: '已结束求助' })
          await this.loadMyHelp()
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
        wx.hideLoading()
      }
    })
  }
})
