const db = wx.cloud.database()

type HelpRequest = {
  _id: string
  title: string
  description: string
  publisherId: string
  publisherName: string
  publisherAvatar: string
  status: 'pending' | 'ongoing' | 'done'
  acceptorId: string
  createTime: Date
  timeAgo?: string
}

Page({
  data: {
    list: [] as HelpRequest[],
    loading: false,
    currentOpenid: ''
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
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ currentOpenid: userInfo.openid || '' })
    }
    this.loadList()
  },

  onShow() {
    this.loadList()
  },

  async onPullDownRefresh() {
    await this.loadList()
    wx.stopPullDownRefresh()
  },

  async loadList() {
    this.setData({ loading: true })
    try {
      const res = await db.collection('helpRequest')
        .where(db.command.neq('status', 'done'))
        .orderBy('createTime', 'desc')
        .limit(50)
        .get()

      let list = res.data as HelpRequest[]

      const cloudUrls = list.map(i => i.publisherAvatar).filter(url => url && url.startsWith('cloud://'))
      if (cloudUrls.length > 0) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: cloudUrls })
        const urlMap: Record<string, string> = {}
        tempRes.fileList.forEach((f: any) => { urlMap[f.fileID] = f.tempFileURL })
        list = list.map(item => ({
          ...item,
          publisherAvatar: urlMap[item.publisherAvatar] && urlMap[item.publisherAvatar].startsWith('https')
            ? urlMap[item.publisherAvatar]
            : '/pages/images/1.png'
        }))
      }

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

  async acceptHelp(e: any) {
    const id = e.currentTarget.dataset.id
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    wx.showLoading({ title: '接受中...' })
    try {
      await db.collection('helpRequest').doc(id).update({
        data: {
          status: 'ongoing',
          acceptorId: userInfo.openid || userInfo.nickName
        }
      })
      wx.showToast({ title: '已接下求助' })
      await this.loadList()
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
    wx.hideLoading()
  },

  async completeHelp(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认完成',
      content: '确认将此求助标记为已完成？',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...' })
        try {
          await db.collection('helpRequest').doc(id).update({
            data: { status: 'done' }
          })
          wx.showToast({ title: '已完成' })
          await this.loadList()
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
        wx.hideLoading()
      }
    })
  },

  goPublishHelp() {
    wx.navigateTo({ url: '/pages/publishHelp/publishHelp' })
  }
})
