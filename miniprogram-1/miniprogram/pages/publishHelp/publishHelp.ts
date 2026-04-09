const publishHelpDb = wx.cloud.database()

Page({
  data: {
    title: '',
    description: ''
  },

  goBack() {
    wx.navigateBack()
  },

  onTitleInput(e: any) {
    this.setData({ title: e.detail.value })
  },

  onDescInput(e: any) {
    this.setData({ description: e.detail.value })
  },

  async submitHelp() {
    const title = this.data.title.trim()
    const description = this.data.description.trim()

    if (!title) {
      wx.showToast({ title: '请填写求助标题', icon: 'none' })
      return
    }
    if (!description) {
      wx.showToast({ title: '请填写求助描述', icon: 'none' })
      return
    }

    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    wx.showLoading({ title: '发布中...' })

    try {
      await publishHelpDb.collection('helpRequest').add({
        data: {
          title,
          description,
          publisherId: userInfo.openid || userInfo.nickName,
          publisherName: userInfo.nickName,
          publisherAvatar: userInfo.avatarUrl,
          status: 'pending',
          acceptorId: '',
          createTime: new Date()
        }
      })

      wx.showToast({ title: '发布成功' })
      setTimeout(() => {
        wx.navigateBack()
      }, 800)
    } catch (err) {
      wx.showToast({ title: '发布失败', icon: 'none' })
    }

    wx.hideLoading()
  }
})
