Page({
    data: {
      userInfo: {
        avatarUrl: '',
        nickName: '',
        isVerified: false,
        isExpert: false
      },
      statusBarHeight: 0
    },
    goEditName() {
        wx.navigateTo({
          url: '/pages/editName/editName'
        })
      },
    onLoad() {
      const windowInfo = wx.getWindowInfo()
      this.setData({ statusBarHeight: windowInfo.statusBarHeight || 0 })
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo) {
        this.setData({ userInfo })
      }
    },
    changeAvatar() {
        wx.showActionSheet({
          itemList: ['拍照', '从相册选择'],
          success: (res) => {
      
            const sourceType: ('camera' | 'album')[] =
              res.tapIndex === 0 ? ['camera'] : ['album']
      
            wx.chooseMedia({
              count: 1,
              mediaType: ['image'],
              sourceType,
      
              success: async (chooseRes) => {
      
                const filePath = chooseRes.tempFiles[0].tempFilePath
      
                const cloudPath = 'avatar/' + Date.now() + '.png'
      
                try {
                  wx.showLoading({ title: '上传中...' })
      
                  // ✅ 先上传
                  const uploadRes = await wx.cloud.uploadFile({
                    cloudPath,
                    filePath
                  })
      
                  const fileID = uploadRes.fileID
      
                  // ✅ 再更新UI（关键！！）
                  this.setData({
                    "userInfo.avatarUrl": fileID
                  })
                  wx.setStorageSync('userInfo', this.data.userInfo)
      
                  wx.showToast({ title: '更换成功' })
      
                } catch (err) {
                  wx.showToast({
                    title: '上传失败',
                    icon: 'none'
                  })
                }
      
                wx.hideLoading()
              }
            })
          }
        })
      },
  
    goAuth() {
      wx.navigateTo({
        url: '/pages/verify/verify'
      })
    },
  
    goMyPosts() {
      wx.navigateTo({
        url: '/pages/myPosts/myPosts'
      })
    },
    onShow() {
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo) {
          this.setData({ userInfo })
        } else {
          this.setData({ userInfo: { avatarUrl: '', nickName: '', isVerified: false, isExpert: false } })
        }
      },
    goHelp() {
      wx.navigateTo({
        url: '/pages/myHelp/myHelp'
      })
    },
    goMyQuestions() {
      wx.navigateTo({
        url: '/pages/myQuestions/myQuestions'
      })
    },
    async goExpertQA() {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.openid) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      wx.showLoading({ title: '验证中...' })
      try {
        const db = wx.cloud.database()
        const res = await db.collection('consultant')
          .where({ openid: userInfo.openid })
          .limit(1)
          .get()
        wx.hideLoading()
        if (res.data && res.data.length > 0) {
          const consultant = res.data[0] as any
          wx.navigateTo({
            url: `/pages/expertAnswer/expertAnswer?consultantId=${consultant._id}`
          })
        } else {
          wx.showToast({ title: '你不是专家，无法使用此功能', icon: 'none', duration: 2500 })
        }
      } catch (err) {
        wx.hideLoading()
        wx.showToast({ title: '验证失败，请稍后重试', icon: 'none' })
      }
    }
  })