Page({
    data: {
      nickName: ''
    },
  
    onLoad() {
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