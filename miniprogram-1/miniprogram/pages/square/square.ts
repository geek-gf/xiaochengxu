export {}
const squareDb = wx.cloud.database()
type Post = {
  _id: string
  content: string
  avatarUrl: string
  nickName: string
  createTime: Date
  likeCount?: number
  likedBy?: string[]
  commentCount?: number
}
Page({
    data: {
        postList: [] as Post[],
        page: 0,
        pageSize: 10,
        loading: false,
        noMore: false,
        statusBarHeight: 0,
        contentPaddingTop: 0,
        scrollHeight: 0,
        refresherTriggered: false,
        currentOpenid: '',
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
    // header is 140rpx tall; 140rpx = 140/750 * screenWidth px
    const headerRpxHeight = 140
    const rpxToPx = windowInfo.screenWidth / 750
    const contentPaddingTop = statusBarHeight + Math.round(headerRpxHeight * rpxToPx)
    // scroll-view occupies all visible area below the fixed header
    const scrollHeight = windowInfo.windowHeight - contentPaddingTop
    this.setData({ statusBarHeight, contentPaddingTop, scrollHeight })
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ currentOpenid: userInfo.openid || '' })
    }
    this.getPosts(false)
  },

  onShow() {
    this.getPosts(false)
  },

  /** 触底加载更多 */
  onScrollToLower() {
    this.getPosts(true)
  },

  /** scroll-view 下拉刷新 */
  async onRefresherRefresh() {
    this.setData({ refresherTriggered: true })
    await this.getPosts(false)
    this.setData({ refresherTriggered: false })
  },

  goPostDetail(e: any) {
    const postId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/postDetail/postDetail?postId=${postId}`
    })
  },

  async getPosts(isLoadMore = false) {

    if (this.data.loading) return
    if (isLoadMore && this.data.noMore) return
  
    this.setData({ loading: true })
  
    let { page, pageSize, postList } = this.data
  
    // 👉 如果不是加载更多，就从0开始
    if (!isLoadMore) {
      page = 0
      postList = []
      this.setData({ noMore: false }) // 🔥 建议顺便重置
    }
  
    try {
      const res = await squareDb.collection('post')
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
        timeAgo: this.formatTimeAgo(item.createTime),
        likeCount: item.likeCount || 0,
        commentCount: item.commentCount || 0,
        likedBy: item.likedBy || [],
        isLiked: (item.likedBy || []).includes(this.data.currentOpenid)
      }))
  
      // 👉 头像处理（只转换 cloud:// 格式的 fileID）
      const cloudUrls = newList.map(item => item.avatarUrl).filter(url => url && url.startsWith('cloud://'))
      if (cloudUrls.length > 0) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: cloudUrls })
        const urlMap: Record<string, string> = {}
        tempRes.fileList.forEach((f: any) => { urlMap[f.fileID] = f.tempFileURL })
        newList = newList.map(item => ({
          ...item,
          avatarUrl: urlMap[item.avatarUrl] || (item.avatarUrl && item.avatarUrl.startsWith('https') ? item.avatarUrl : '/images/1.png')
        }))
      }
  
      // 👉 最后更新数据
      this.setData({
        postList: isLoadMore
          ? [...this.data.postList, ...newList]
          : newList,
        page: page + 1
      })
  
    } catch (err: any) {
      const msg = (err && err.errMsg) ? err.errMsg : '加载失败，请稍后重试'
      wx.showToast({
        title: msg,
        icon: 'none',
        duration: 2500
      })
    }
  
    this.setData({ loading: false })
  },

  async toggleLike(e: any) {
    const postId = e.currentTarget.dataset.id
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const openid = userInfo.openid
    const idx = this.data.postList.findIndex((p: any) => p._id === postId)
    if (idx === -1) return

    const post = this.data.postList[idx] as any
    const liked = (post.likedBy || []).includes(openid)

    // 乐观更新 UI
    const newLikedBy = liked
      ? (post.likedBy || []).filter((id: string) => id !== openid)
      : [...(post.likedBy || []), openid]
    const newLikeCount = liked ? Math.max((post.likeCount || 1) - 1, 0) : (post.likeCount || 0) + 1
    const postListCopy = [...this.data.postList] as any[]
    postListCopy[idx] = { ...post, likedBy: newLikedBy, likeCount: newLikeCount, isLiked: !liked }
    this.setData({ postList: postListCopy })

    try {
      const db = squareDb
      if (liked) {
        await db.collection('post').doc(postId).update({
          data: {
            likedBy: db.command.pull(openid),
            likeCount: db.command.inc(-1)
          }
        })
      } else {
        await db.collection('post').doc(postId).update({
          data: {
            likedBy: db.command.push([openid]),
            likeCount: db.command.inc(1)
          }
        })
      }
    } catch (err: any) {
      // 回滚 UI
      const postListRoll = [...this.data.postList] as any[]
      postListRoll[idx] = post
      this.setData({ postList: postListRoll })
      const msg = (err && err.errMsg) ? err.errMsg : '操作失败'
      wx.showToast({ title: msg, icon: 'none' })
    }
  },

  goPublish() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.isVerified) {
      wx.showModal({
        title: '需要认证',
        content: '发帖功能需要完成个人信息认证，请前往"我的"页面完成认证',
        confirmText: '去认证',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: '/pages/profile/profile' })
          }
        }
      })
      return
    }
    wx.navigateTo({
      url: '/pages/publish/publish'
    })
  },
})


