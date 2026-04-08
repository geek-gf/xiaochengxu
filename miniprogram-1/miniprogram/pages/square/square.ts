const db = wx.cloud.database()
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
        showNoMore: false,         
        pageSize: 10,     // 每页数量
        loading: false,   // 是否加载中
        noMore: false,
        testContent: ''
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
    this.getPosts(false)
    this.testDB() 
    const windowInfo = wx.getWindowInfo()
    this.setData({
        statusBarHeight: windowInfo.statusBarHeight
      })
  },

  onShow() {
        this.getPosts(false)  // 自动重置
  },
  onReachBottom() {
    this.getPosts(true)
  },
  async onPullDownRefresh() {
    await this.getPosts(false)
    wx.stopPullDownRefresh()
  },
  async testDB() {
    try {
      const res = await db.collection('post')
        .limit(1)
        .get()
  
      console.log('测试数据：', res)
  
      if (res.data.length > 0) {
        this.setData({
          testContent: res.data[0].content || '有数据但没content字段'
        })
      } else {
        this.setData({
          testContent: '数据库是空的'
        })
      }
  
    } catch (err) {
      console.error(err)
      this.setData({
        testContent: '读取失败'
      })
    }
  },

  async getPosts(isLoadMore = false) {

    if (this.data.loading || this.data.noMore) return
  
    this.setData({ loading: true })
  
    let { page, pageSize, postList } = this.data
  
    // 👉 如果不是加载更多，就从0开始
    if (!isLoadMore) {
      page = 0
      postList = []
      this.setData({ noMore: false }) // 🔥 建议顺便重置
    }
  
    try {
      const res = await db.collection('post')
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
  
      // 👉 头像处理
      const fileList = newList.map(item => item.avatarUrl)
  
      if (fileList.length > 0) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList })
  
        newList = newList.map((item, index) => {
          const file = tempRes.fileList[index]
          const tempUrl = file && file.tempFileURL
  
          return {
            ...item,
            avatarUrl: tempUrl && tempUrl.startsWith('https')
              ? tempUrl
              : '/images/1.png'
          }
        })
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

