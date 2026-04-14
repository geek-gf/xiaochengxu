export {}
const expertAnswerDb = wx.cloud.database()

type Consultant = {
  _id: string
  name: string
  avatar: string
  title: string
  intro: string
  openid: string
}

type Question = {
  _id: string
  consultantId: string
  content: string
  askerName: string
  askerAvatar: string
  answer: string
  createTime: Date
  timeAgo?: string
  showAnswerInput?: boolean
  answerDraft?: string
}

Page({
  data: {
    consultant: null as Consultant | null,
    questions: [] as Question[],
    consultantId: '',
    loading: false,
    statusBarHeight: 0,
    contentPaddingTop: 0
  },

  goBack() {
    wx.navigateBack()
  },

  goSquare() {
    wx.switchTab({ url: '/pages/square/square' })
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
    const windowInfo = wx.getWindowInfo()
    const statusBarHeight = windowInfo.statusBarHeight || 0
    const rpxToPx = windowInfo.screenWidth / 750
    const contentPaddingTop = statusBarHeight + Math.round(140 * rpxToPx)
    this.setData({ statusBarHeight, contentPaddingTop })
    const consultantId = options.consultantId
    this.setData({ consultantId })
    this.loadConsultant(consultantId)
    this.loadQuestions(consultantId)
  },

  onShow() {
    if (this.data.consultantId) {
      this.loadQuestions(this.data.consultantId)
    }
  },

  async loadConsultant(consultantId: string) {
    try {
      const res = await expertAnswerDb.collection('consultant').doc(consultantId).get()
      let consultant = res.data as Consultant

      if (consultant.avatar && consultant.avatar.startsWith('cloud://')) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: [consultant.avatar] })
        const tempFile = tempRes.fileList[0]
        const tempUrl = tempFile && tempFile.tempFileURL
        consultant.avatar = tempUrl && tempUrl.startsWith('https') ? tempUrl : '/images/1.png'
      }

      this.setData({ consultant })
    } catch (err) {
      wx.showToast({ title: '加载专家信息失败', icon: 'none' })
    }
  },

  async loadQuestions(consultantId: string) {
    this.setData({ loading: true })
    try {
      const res = await expertAnswerDb.collection('question')
        .where({ consultantId })
        .orderBy('createTime', 'desc')
        .limit(50)
        .get()

      let questions = res.data as Question[]

      const cloudUrls = questions.map(q => q.askerAvatar).filter(url => url && url.startsWith('cloud://'))
      if (cloudUrls.length > 0) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: cloudUrls })
        const urlMap: Record<string, string> = {}
        tempRes.fileList.forEach((f: any) => { urlMap[f.fileID] = f.tempFileURL })
        questions = questions.map(q => ({
          ...q,
          askerAvatar: urlMap[q.askerAvatar] && urlMap[q.askerAvatar].startsWith('https')
            ? urlMap[q.askerAvatar]
            : '/images/1.png'
        }))
      }

      questions = questions.map(q => ({
        ...q,
        timeAgo: this.formatTimeAgo(q.createTime),
        showAnswerInput: false,
        answerDraft: q.answer || ''
      }))

      this.setData({ questions })
    } catch (err) {
      wx.showToast({ title: '加载问题失败', icon: 'none' })
    }
    this.setData({ loading: false })
  },

  toggleAnswerInput(e: any) {
    const index = e.currentTarget.dataset.index
    const questions = this.data.questions
    const key = `questions[${index}].showAnswerInput`
    this.setData({ [key]: !questions[index].showAnswerInput })
  },

  onAnswerInput(e: any) {
    const index = e.currentTarget.dataset.index
    this.setData({ [`questions[${index}].answerDraft`]: e.detail.value })
  },

  async submitAnswer(e: any) {
    const index = e.currentTarget.dataset.index
    const question = this.data.questions[index]
    const answer = (question.answerDraft && question.answerDraft.trim()) || ''

    if (!answer) {
      wx.showToast({ title: '回答不能为空', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中...' })
    try {
      await expertAnswerDb.collection('question').doc(question._id).update({
        data: { answer }
      })
      wx.showToast({ title: '回答成功' })
      await this.loadQuestions(this.data.consultantId)
    } catch (err) {
      wx.showToast({ title: '提交失败', icon: 'none' })
    }
    wx.hideLoading()
  }
})
