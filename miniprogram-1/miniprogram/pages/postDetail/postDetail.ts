const db = wx.cloud.database()

type Post = {
  _id: string
  content: string
  avatarUrl: string
  nickName: string
  createTime: Date
  timeAgo?: string
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
    postId: ''
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
    const postId = options.postId
    this.setData({ postId })
    this.loadPost(postId)
    this.loadComments(postId)
  },

  async loadPost(postId: string) {
    try {
      const res = await db.collection('post').doc(postId).get()
      let post = res.data as Post
      if (post.avatarUrl && post.avatarUrl.startsWith('cloud://')) {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: [post.avatarUrl] })
        const tempUrl = tempRes.fileList[0]?.tempFileURL
        post.avatarUrl = tempUrl && tempUrl.startsWith('https') ? tempUrl : '/pages/images/1.png'
      }
      post.timeAgo = this.formatTimeAgo(post.createTime)
      this.setData({ post })
    } catch (err) {
      wx.showToast({ title: '帖子加载失败', icon: 'none' })
    }
  },

  async loadComments(postId: string) {
    this.setData({ loading: true })
    try {
      const res = await db.collection('comment')
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
    } catch (err) {
      wx.showToast({ title: '评论加载失败', icon: 'none' })
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
      await db.collection('comment').add({
        data: {
          postId: this.data.postId,
          content,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          createTime: new Date()
        }
      })

      this.setData({ commentContent: '' })
      wx.showToast({ title: '评论成功' })
      await this.loadComments(this.data.postId)
    } catch (err) {
      wx.showToast({ title: '评论失败', icon: 'none' })
    }

    wx.hideLoading()
    this.setData({ submitting: false })
  }
})
