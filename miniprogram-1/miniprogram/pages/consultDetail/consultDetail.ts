export {}
const consultDetailDb = wx.cloud.database()

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
    questionContent: '',
    consultantId: '',
    currentOpenid: '',
    isConsultant: false,
    loading: false,
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
    const consultantId = options.consultantId
    const userInfo = wx.getStorageSync('userInfo')
    const currentOpenid = (userInfo && userInfo.openid) || ''
    this.setData({ consultantId, currentOpenid })
    this.loadConsultant(consultantId, currentOpenid)
    this.loadQuestions(consultantId)
  },

  async loadConsultant(consultantId: string, currentOpenid: string) {
    try {
      const res = await consultDetailDb.collection('consultant').doc(consultantId).get()
      let consultant = res.data as Consultant

      if (consultant.avatar && consultant.avatar.startsWith('cloud://')) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: [consultant.avatar] })
        const tempFile = tempRes.fileList[0]
        const tempUrl = tempFile && tempFile.tempFileURL
        consultant.avatar = tempUrl && tempUrl.startsWith('https') ? tempUrl : '/pages/images/1.png'
      }

      const isConsultant = !!(currentOpenid && currentOpenid === consultant.openid)
      this.setData({ consultant, isConsultant })
    } catch (err) {
      console.error('loadConsultant error:', err)
      wx.showToast({ title: '加载专家信息失败', icon: 'none' })
    }
  },

  async loadQuestions(consultantId: string) {
    this.setData({ loading: true })
    try {
      const res = await consultDetailDb.collection('question')
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
            : '/pages/images/1.png'
        }))
      }

      questions = questions.map(q => ({
        ...q,
        timeAgo: this.formatTimeAgo(q.createTime),
        showAnswerInput: false,
        answerDraft: ''
      }))

      this.setData({ questions })
    } catch (err) {
      wx.showToast({ title: '加载问题失败', icon: 'none' })
    }
    this.setData({ loading: false })
  },

  onQuestionInput(e: any) {
    this.setData({ questionContent: e.detail.value })
  },

  async submitQuestion() {
    const content = this.data.questionContent.trim()
    if (!content) {
      wx.showToast({ title: '问题不能为空', icon: 'none' })
      return
    }

    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '提交中...' })

    try {
      await consultDetailDb.collection('question').add({
        data: {
          consultantId: this.data.consultantId,
          content,
          askerName: userInfo.nickName,
          askerAvatar: userInfo.avatarUrl,
          answer: '',
          createTime: new Date()
        }
      })

      this.setData({ questionContent: '' })
      wx.showToast({ title: '提问成功' })
      await this.loadQuestions(this.data.consultantId)
    } catch (err) {
      wx.showToast({ title: '提问失败', icon: 'none' })
    }

    wx.hideLoading()
    this.setData({ submitting: false })
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
      await consultDetailDb.collection('question').doc(question._id).update({
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
