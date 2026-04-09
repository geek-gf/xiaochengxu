// pages/consult/consult.ts
const db = wx.cloud.database()

type Consultant = {
  _id: string
  name: string
  avatar: string
  title: string
  intro: string
  openid: string
}

Page({
  data: {
    consultants: [] as Consultant[],
    loading: false
  },

  onLoad() {
    this.loadConsultants()
  },

  onShow() {
    this.loadConsultants()
  },

  async onPullDownRefresh() {
    await this.loadConsultants()
    wx.stopPullDownRefresh()
  },

  async loadConsultants() {
    this.setData({ loading: true })
    try {
      const res = await db.collection('consultant').limit(50).get()
      let list = res.data as Consultant[]

      const cloudUrls = list.map(c => c.avatar).filter(url => url && url.startsWith('cloud://'))
      if (cloudUrls.length > 0) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: cloudUrls })
        const urlMap: Record<string, string> = {}
        tempRes.fileList.forEach((f: any) => { urlMap[f.fileID] = f.tempFileURL })
        list = list.map(c => ({
          ...c,
          avatar: urlMap[c.avatar] && urlMap[c.avatar].startsWith('https')
            ? urlMap[c.avatar]
            : '/pages/images/1.png'
        }))
      }

      this.setData({ consultants: list })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    this.setData({ loading: false })
  },

  goDetail(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/consultDetail/consultDetail?consultantId=${id}` })
  }
})