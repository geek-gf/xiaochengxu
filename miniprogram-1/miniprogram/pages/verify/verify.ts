const verifyDb = wx.cloud.database()

Page({
  data: {
    statusBarHeight: 0,
    trueName: '',
    college: '',
    grade: '',
    classNum: '',
    studentId: '',
    isVerified: false,
    submitting: false
  },

  onLoad() {
    const windowInfo = wx.getWindowInfo()
    this.setData({ statusBarHeight: windowInfo.statusBarHeight || 0 })

    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.isVerified) {
      this.setData({
        isVerified: true,
        trueName: userInfo.trueName || '',
        college: userInfo.college || '',
        grade: userInfo.grade || '',
        classNum: userInfo.classNum || '',
        studentId: userInfo.studentId || ''
      })
    }
  },

  goBack() {
    wx.navigateBack()
  },

  onInput(e: any) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value })
  },

  async submitVerify() {
    const { trueName, college, grade, classNum, studentId } = this.data

    if (!trueName.trim()) {
      wx.showToast({ title: '请填写真实姓名', icon: 'none' })
      return
    }
    if (!college.trim()) {
      wx.showToast({ title: '请填写学院', icon: 'none' })
      return
    }
    if (!grade.trim()) {
      wx.showToast({ title: '请填写年级', icon: 'none' })
      return
    }
    if (!classNum.trim()) {
      wx.showToast({ title: '请填写班级', icon: 'none' })
      return
    }
    if (!studentId.trim()) {
      wx.showToast({ title: '请填写学号', icon: 'none' })
      return
    }

    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '认证中...' })

    try {
      const res = await verifyDb.collection('studentList')
        .where({
          trueName: trueName.trim(),
          college: college.trim(),
          grade: grade.trim(),
          classNum: classNum.trim(),
          studentId: studentId.trim()
        })
        .get()

      if (res.data.length > 0) {
        // 认证成功
        const updatedUserInfo = {
          ...userInfo,
          isVerified: true,
          trueName: trueName.trim(),
          college: college.trim(),
          grade: grade.trim(),
          classNum: classNum.trim(),
          studentId: studentId.trim()
        }
        wx.setStorageSync('userInfo', updatedUserInfo)

        // 同步更新云数据库中的用户信息
        try {
          await verifyDb.collection('users')
            .where({ openid: userInfo.openid })
            .update({
              data: {
                isVerified: true,
                trueName: trueName.trim(),
                college: college.trim(),
                grade: grade.trim(),
                classNum: classNum.trim(),
                studentId: studentId.trim()
              }
            })
        } catch (dbErr) {
          console.error('更新用户认证状态失败', dbErr)
          wx.showToast({ title: '认证成功，但云端同步失败，请重进页面', icon: 'none', duration: 3000 })
        }

        this.setData({ isVerified: true })
        wx.hideLoading()
        wx.showToast({ title: '认证成功！' })
      } else {
        wx.hideLoading()
        wx.showModal({
          title: '认证失败',
          content: '填写的信息与学校数据库不匹配，请核对后重试',
          showCancel: false,
          confirmText: '我知道了'
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '认证失败，请稍后重试', icon: 'none' })
    }

    this.setData({ submitting: false })
  }
})
