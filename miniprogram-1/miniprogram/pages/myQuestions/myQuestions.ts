export {}
const myQuestionsDb = wx.cloud.database()

type Question = {
  _id: string
  consultantId: string
  content: string
  askerName: string
  askerAvatar: string
  askerOpenid: string
  answer: string
  createTime: Date
  timeAgo?: string
  consultantName?: string
  consultantTitle?: string
}

Page({
  data: {
    list: [] as Question[],
    loading: false,
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

  goConsultant(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/consultDetail/consultDetail?consultantId=${id}` })
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo()
    const statusBarHeight = windowInfo.statusBarHeight || 0
    const headerRpxHeight = 140
    const rpxToPx = windowInfo.screenWidth / 750
    const contentPaddingTop = statusBarHeight + Math.round(headerRpxHeight * rpxToPx)
    const scrollHeight = windowInfo.windowHeight - contentPaddingTop
    this.setData({ statusBarHeight, contentPaddingTop, scrollHeight })
    this.loadMyQuestions()
  },

  onShow() {
    this.loadMyQuestions()
  },

  async onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
    await this.loadMyQuestions()
    this.setData({ refresherTriggered: false })
  },

  async loadMyQuestions() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ loading: true })

    try {
      const openid = userInfo.openid || ''
      let questions: Question[] = []

      if (openid) {
        const res = await myQuestionsDb.collection('question')
          .where({ askerOpenid: openid })
          .orderBy('createTime', 'desc')
          .limit(50)
          .get()
        questions = res.data as Question[]
      }

      // Fallback: also query by askerName for older records without askerOpenid
      if (questions.length === 0 && userInfo.nickName) {
        const res = await myQuestionsDb.collection('question')
          .where({ askerName: userInfo.nickName })
          .orderBy('createTime', 'desc')
          .limit(50)
          .get()
        questions = res.data as Question[]
      }

      // Get unique consultant IDs and fetch their info
      const consultantIds = [...new Set(questions.map(q => q.consultantId).filter(Boolean))]
      const consultantMap: Record<string, { name: string; title: string }> = {}

      if (consultantIds.length > 0) {
        await Promise.all(consultantIds.map(async (cid) => {
          try {
            const cRes = await myQuestionsDb.collection('consultant').doc(cid).get()
            const c = cRes.data as any
            consultantMap[cid] = { name: c.name || '', title: c.title || '' }
          } catch (err) {
            consultantMap[cid] = { name: '未知专家', title: '' }
          }
        }))
      }

      questions = questions.map(q => ({
        ...q,
        timeAgo: this.formatTimeAgo(q.createTime),
        consultantName: (consultantMap[q.consultantId] && consultantMap[q.consultantId].name) || '未知专家',
        consultantTitle: (consultantMap[q.consultantId] && consultantMap[q.consultantId].title) || ''
      }))

      this.setData({ list: questions })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }

    this.setData({ loading: false })
  }
})
