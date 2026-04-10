Page({
    data: {
      userInfo: {
        avatarUrl: '',
        nickName: '',
        isVerified: false
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
          this.setData({ userInfo: { avatarUrl: '', nickName: '', isVerified: false } })
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
    }
  })