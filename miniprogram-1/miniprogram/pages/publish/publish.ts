Page({
    data: {
      content: ''
    },

    goBack() {
      wx.navigateBack()
    },
  
    onInput(e: any) {
      this.setData({
        content: e.detail.value
      })
    },
  
    async submitPost() {
      if (!this.data.content) {
        wx.showToast({
          title: '内容不能为空',
          icon: 'none'
        })
        return
      }
  
      const userInfo = wx.getStorageSync('userInfo')
  
      if (!userInfo) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
  
      wx.showLoading({ title: '发布中...' })
  
      try {
        await wx.cloud.database().collection('post').add({
          data: {
            content: this.data.content,
            avatarUrl: userInfo.avatarUrl,
            nickName: userInfo.nickName,
            openid: userInfo.openid || '',
            createTime: new Date()
          }
        })
  
        wx.showToast({ title: '发布成功' })
  
        setTimeout(() => {
          wx.navigateBack()
        }, 800)
  
      } catch (err) {
        wx.showToast({
          title: '发布失败',
          icon: 'none'
        })
      }
    }
  })