Page({
    data: {
      userInfo: {
        avatarUrl: '',
        nickName: '',
        isVerified: false,
        isExpert: false,
        openid: ''
      },
      statusBarHeight: 0,
      loginAvatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
      loginNickName: '',
      loginLoading: false
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
    onChooseAvatar(e: any) {
      const { avatarUrl } = e.detail
      const cloudPath = 'avatar/' + Date.now() + '.png'
      wx.cloud.uploadFile({
        cloudPath,
        filePath: avatarUrl,
        success: (res) => {
          this.setData({ loginAvatarUrl: res.fileID })
        },
        fail: () => {
          this.setData({ loginAvatarUrl: avatarUrl })
        }
      })
    },
    onNickNameInput(e: any) {
      this.setData({ loginNickName: e.detail.value })
    },
    async handleLogin() {
      const { loginNickName, loginAvatarUrl } = this.data
      if (!loginNickName.trim()) {
        wx.showToast({ title: '请输入昵称', icon: 'none' })
        return
      }
      this.setData({ loginLoading: true })
      wx.showLoading({ title: '登录中...' })
      wx.cloud.callFunction({
        name: 'login',
        success: async (res) => {
          try {
            const result = res.result as { openid: string }
            const openid = result.openid
            const db = wx.cloud.database()
            const dbRes = await db.collection('users').where({ openid }).get()
            const userInfo: any = {
              avatarUrl: loginAvatarUrl,
              nickName: loginNickName.trim(),
              openid,
              isVerified: false,
              isExpert: false
            }
            if (dbRes.data.length > 0) {
              const user = dbRes.data[0] as any
              userInfo.isVerified = user.isVerified || false
              userInfo.isExpert = user.isExpert || false
              userInfo.trueName = user.trueName || ''
              userInfo.college = user.college || ''
              userInfo.grade = user.grade || ''
              userInfo.classNum = user.classNum || ''
              userInfo.studentId = user.studentId || ''
              await db.collection('users').doc(user._id).update({
                data: { avatarUrl: loginAvatarUrl, nickName: loginNickName.trim() }
              })
            } else {
              await db.collection('users').add({
                data: {
                  openid,
                  nickName: loginNickName.trim(),
                  avatarUrl: loginAvatarUrl,
                  createTime: new Date()
                }
              })
            }
            wx.setStorageSync('userInfo', userInfo)
            this.setData({ userInfo })
            wx.hideLoading()
            wx.showToast({ title: '登录成功', icon: 'success' })
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          }
          this.setData({ loginLoading: false })
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({ title: '登录失败，请重试', icon: 'none' })
          this.setData({ loginLoading: false })
        }
      })
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
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.openid) {
        wx.showToast({ title: '请先登录', icon: 'none' })
        return
      }
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
          this.setData({ userInfo: { avatarUrl: '', nickName: '', isVerified: false, isExpert: false, openid: '' } })
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