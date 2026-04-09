export {}
const helpDetailDb = wx.cloud.database()

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
    item: null as HelpRequest | null,
    loading: false,
    currentOpenid: '',
    isPublisher: false,
    submitting: false
  },

  goBack() {
    wx.navigateBack()
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

  onLoad(options: any) {
    const id = options.id
    const userInfo = wx.getStorageSync('userInfo')
    const currentOpenid = (userInfo && userInfo.openid) || ''
    this.setData({ currentOpenid })
    this.loadDetail(id)
  },

  async loadDetail(id: string) {
    this.setData({ loading: true })
    try {
      const res = await helpDetailDb.collection('helpRequest').doc(id).get()
      if (!res.data) {
        wx.showToast({ title: '求助不存在', icon: 'none' })
        return
      }
      let item = res.data as HelpRequest

      if (item.publisherAvatar && item.publisherAvatar.startsWith('cloud://')) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: [item.publisherAvatar] })
        const tempFile = tempRes.fileList[0]
        const tempUrl = tempFile && tempFile.tempFileURL
        item.publisherAvatar = tempUrl && tempUrl.startsWith('https') ? tempUrl : '/images/1.png'
      }

      item.timeAgo = this.formatTimeAgo(item.createTime)
      const isPublisher = !!(this.data.currentOpenid && this.data.currentOpenid === item.publisherId)
      this.setData({ item, isPublisher })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    this.setData({ loading: false })
  },

  async acceptHelp() {
    const item = this.data.item
    if (!item) return
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    wx.showLoading({ title: '接受中...' })
    try {
      await helpDetailDb.collection('helpRequest').doc(item._id).update({
        data: {
          status: 'ongoing',
          acceptorId: userInfo.openid
        }
      })
      wx.showToast({ title: '已接下求助' })
      await this.loadDetail(item._id)
    } catch (err) {
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
    wx.hideLoading()
    this.setData({ submitting: false })
  },

  async completeHelp() {
    const item = this.data.item
    if (!item) return
    wx.showModal({
      title: '确认完成',
      content: '确认将此求助标记为已完成？',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...' })
        try {
          await helpDetailDb.collection('helpRequest').doc(item._id).update({
            data: { status: 'done' }
          })
          wx.showToast({ title: '已完成' })
          await this.loadDetail(item._id)
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
        wx.hideLoading()
      }
    })
  },

  async cancelHelp() {
    const item = this.data.item
    if (!item) return
    wx.showModal({
      title: '撤销求助',
      content: '确认撤销这条求助？',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '处理中...' })
        try {
          await helpDetailDb.collection('helpRequest').doc(item._id).remove()
          wx.showToast({ title: '已撤销' })
          setTimeout(() => {
            wx.navigateBack()
          }, 800)
        } catch (err) {
          wx.showToast({ title: '操作失败', icon: 'none' })
        }
        wx.hideLoading()
      }
    })
  }
})
