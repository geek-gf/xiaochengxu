export {}
const postDetailDb = wx.cloud.database()

type Post = {
  _id: string
  content: string
  avatarUrl: string
  nickName: string
  createTime: Date
  timeAgo?: string
  likeCount?: number
  likedBy?: string[]
  commentCount?: number
  isLiked?: boolean
}

type Comment = {
  _id: string
  postId: string
  content: string
  nickName: string
  avatarUrl: string
  createTime: Date
  timeAgo?: string
}

Page({
  data: {
    post: null as Post | null,
    commentList: [] as Comment[],
    commentContent: '',
    loading: false,
    submitting: false,
    postId: '',
    statusBarHeight: 0,
    contentPaddingTop: 0,
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

  goBack() {
    wx.navigateBack()
  },

  goSquare() {
    wx.switchTab({ url: '/pages/square/square' })
  },

  onLoad(options: any) {
    const windowInfo = wx.getWindowInfo()
    const statusBarHeight = windowInfo.statusBarHeight || 0
    const rpxToPx = windowInfo.screenWidth / 750
    const contentPaddingTop = statusBarHeight + Math.round(140 * rpxToPx) + Math.round(20 * rpxToPx)
    const userInfo = wx.getStorageSync('userInfo')
    const currentOpenid = (userInfo && userInfo.openid) ? userInfo.openid : ''
    this.setData({ statusBarHeight, contentPaddingTop, currentOpenid })
    const postId = options.postId
    this.setData({ postId })
    this.loadPost(postId)
    this.loadComments(postId)
  },

  async loadPost(postId: string) {
    try {
      const res = await postDetailDb.collection('post').doc(postId).get()
      let post = res.data as Post
      if (post.avatarUrl && post.avatarUrl.startsWith('cloud://')) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: [post.avatarUrl] })
        const tempFile = tempRes.fileList[0]
        const tempUrl = tempFile && tempFile.tempFileURL
        post.avatarUrl = tempUrl && tempUrl.startsWith('https') ? tempUrl : '/pages/images/1.png'
      }
      post.timeAgo = this.formatTimeAgo(post.createTime)
      post.likeCount = post.likeCount || 0
      post.likedBy = post.likedBy || []
      post.commentCount = post.commentCount || 0
      post.isLiked = post.likedBy.includes(this.data.currentOpenid)
      this.setData({ post })
    } catch (err: any) {
      console.error('loadPost error:', err)
      const msg = (err && err.errMsg) ? err.errMsg : '帖子加载失败'
      wx.showToast({ title: msg, icon: 'none', duration: 2500 })
    }
  },

  async loadComments(postId: string) {
    this.setData({ loading: true })
    try {
      const res = await postDetailDb.collection('comment')
        .where({ postId })
        .orderBy('createTime', 'asc')
        .get()

      let comments = res.data as Comment[]

      const cloudUrls = comments.map(c => c.avatarUrl).filter(url => url && url.startsWith('cloud://'))
      if (cloudUrls.length > 0) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: cloudUrls })
        const urlMap: Record<string, string> = {}
        tempRes.fileList.forEach((f: any) => {
          urlMap[f.fileID] = f.tempFileURL
        })
        comments = comments.map(c => ({
          ...c,
          avatarUrl: urlMap[c.avatarUrl] && urlMap[c.avatarUrl].startsWith('https')
            ? urlMap[c.avatarUrl]
            : '/pages/images/1.png'
        }))
      }

      comments = comments.map(c => ({
        ...c,
        timeAgo: this.formatTimeAgo(c.createTime)
      }))

      this.setData({ commentList: comments })
    } catch (err: any) {
      const msg = (err && err.errMsg) ? err.errMsg : '评论加载失败'
      wx.showToast({ title: msg, icon: 'none', duration: 2500 })
    }
    this.setData({ loading: false })
  },

  onCommentInput(e: any) {
    this.setData({ commentContent: e.detail.value })
  },

  async submitComment() {
    const content = this.data.commentContent.trim()
    if (!content) {
      wx.showToast({ title: '评论不能为空', icon: 'none' })
      return
    }

    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '发送中...' })

    try {
      await postDetailDb.collection('comment').add({
        data: {
          postId: this.data.postId,
          content,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          createTime: new Date()
        }
      })

      // 更新帖子评论计数
      try {
        await postDetailDb.collection('post').doc(this.data.postId).update({
          data: { commentCount: postDetailDb.command.inc(1) }
        })
        if (this.data.post) {
          this.setData({ 'post.commentCount': (this.data.post.commentCount || 0) + 1 })
        }
      } catch (countErr) {
        console.error('更新评论数失败', countErr)
      }

      this.setData({ commentContent: '' })
      wx.showToast({ title: '评论成功' })
      await this.loadComments(this.data.postId)
    } catch (err: any) {
      const msg = (err && err.errMsg) ? err.errMsg : '评论失败，请稍后重试'
      wx.showToast({ title: msg, icon: 'none', duration: 2500 })
    }

    wx.hideLoading()
    this.setData({ submitting: false })
  },

  async toggleLike() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo || !userInfo.openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const openid = userInfo.openid
    const post = this.data.post
    if (!post) return

    const liked = (post.likedBy || []).includes(openid)
    const newLikedBy = liked
      ? (post.likedBy || []).filter((id: string) => id !== openid)
      : [...(post.likedBy || []), openid]
    const newLikeCount = liked ? Math.max((post.likeCount || 0) - 1, 0) : (post.likeCount || 0) + 1

    // 乐观更新
    this.setData({
      'post.likedBy': newLikedBy,
      'post.likeCount': newLikeCount,
      'post.isLiked': !liked
    })

    try {
      const db = postDetailDb
      if (liked) {
        await db.collection('post').doc(post._id).update({
          data: {
            likedBy: db.command.pull(openid),
            likeCount: db.command.inc(-1)
          }
        })
      } else {
        await db.collection('post').doc(post._id).update({
          data: {
            likedBy: db.command.push([openid]),
            likeCount: db.command.inc(1)
          }
        })
      }
    } catch (err: any) {
      // 回滚
      this.setData({
        'post.likedBy': post.likedBy,
        'post.likeCount': post.likeCount,
        'post.isLiked': liked
      })
      const msg = (err && err.errMsg) ? err.errMsg : '操作失败'
      wx.showToast({ title: msg, icon: 'none' })
    }
  }
})
