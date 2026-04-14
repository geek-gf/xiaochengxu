Page({
    data: {
      nickName: '',
      statusBarHeight: 0,
      contentPaddingTop: 0
    },

    goBack() {
      wx.navigateBack()
    },

    goSquare() {
      wx.switchTab({ url: '/pages/square/square' })
    },
  
    onLoad() {
      const windowInfo = wx.getWindowInfo()
      const statusBarHeight = windowInfo.statusBarHeight || 0
      const rpxToPx = windowInfo.screenWidth / 750
      const contentPaddingTop = statusBarHeight + Math.round(140 * rpxToPx)
      this.setData({ statusBarHeight, contentPaddingTop })
      const userInfo = wx.getStorageSync('userInfo')
      this.setData({
        nickName: userInfo.nickName || ''
      })
    },
  
    onInput(e: any) {
      this.setData({
        nickName: e.detail.value
      })
    },
  
    save() {
      const nickName = this.data.nickName.trim()
  
      if (!nickName) {
        wx.showToast({
          title: '昵称不能为空',
          icon: 'none'
        })
        return
      }
  
      if (nickName.length > 10) {
        wx.showToast({
          title: '最多10个字',
          icon: 'none'
        })
        return
      }
  
      // 更新缓存
      const userInfo = wx.getStorageSync('userInfo')
      userInfo.nickName = nickName
  
      wx.setStorageSync('userInfo', userInfo)
  
      wx.showToast({
        title: '修改成功'
      })
  
      setTimeout(() => {
        wx.navigateBack()
      }, 800)
    }
  })