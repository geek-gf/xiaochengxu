// index.ts
Page({
  data: {
    loading: false
  },
  onLoad() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.openid) {
      wx.switchTab({ url: '/pages/square/square' })
    }
  },
  handleWechatLogin() {
    this.setData({ loading: true })
    wx.openAppAuthorizeSetting({
      complete: () => {
        wx.showLoading({ title: '登录中...' })
        wx.cloud.callFunction({
          name: 'login',
          success: async (res) => {
            try {
              const result = res.result as { openid: string }
              const openid = result.openid
              const db = wx.cloud.database()
              const dbRes = await db.collection('users').where({ openid }).get()
              let userInfo: any = {
                avatarUrl: '/pages/images/1.png',
                nickName: '微信用户',
                openid,
                isVerified: false,
                isExpert: false
              }
              if (dbRes.data.length > 0) {
                const user = dbRes.data[0] as any
                userInfo = {
                  ...userInfo,
                  avatarUrl: user.avatarUrl || '/pages/images/1.png',
                  nickName: user.nickName || '微信用户',
                  isVerified: user.isVerified || false,
                  isExpert: user.isExpert || false,
                  trueName: user.trueName || '',
                  college: user.college || '',
                  grade: user.grade || '',
                  classNum: user.classNum || '',
                  studentId: user.studentId || ''
                }
              } else {
                await db.collection('users').add({
                  data: {
                    openid,
                    nickName: '微信用户',
                    avatarUrl: '/pages/images/1.png',
                    createTime: new Date()
                  }
                })
              }
              wx.setStorageSync('userInfo', userInfo)
              wx.hideLoading()
              wx.switchTab({ url: '/pages/square/square' })
            } catch (err) {
              console.error('登录失败', err)
              wx.hideLoading()
              wx.showToast({ title: '登录失败，请重试', icon: 'none' })
            }
            this.setData({ loading: false })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '登录失败，请重试', icon: 'none' })
            this.setData({ loading: false })
          }
        })
      }
    })
  }
})