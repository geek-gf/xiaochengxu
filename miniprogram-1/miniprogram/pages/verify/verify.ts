const verifyDb = wx.cloud.database()

Page({
  data: {
    statusBarHeight: 0,
    contentPaddingTop: 0,
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
    const statusBarHeight = windowInfo.statusBarHeight || 0
    const rpxToPx = windowInfo.screenWidth / 750
    const contentPaddingTop = statusBarHeight + Math.round(140 * rpxToPx)
    this.setData({ statusBarHeight, contentPaddingTop })

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

  goSquare() {
    wx.switchTab({ url: '/pages/square/square' })
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
        // 认证成功，检查是否为专家
        let isExpert = false
        let consultantId = ''
        try {
          const expertRes = await verifyDb.collection('consultant')
            .where({ name: trueName.trim() })
            .limit(1)
            .get()
          if (expertRes.data && expertRes.data.length > 0) {
            isExpert = true
            consultantId = (expertRes.data[0] as any)._id
            // 将当前用户 openid 绑定到专家记录
            await verifyDb.collection('consultant').doc(consultantId).update({
              data: { openid: userInfo.openid }
            })
          }
        } catch (expertErr) {
          console.error('专家识别失败', expertErr)
        }

        const updatedUserInfo = {
          ...userInfo,
          isVerified: true,
          isExpert,
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
                isExpert,
                trueName: trueName.trim(),
                college: college.trim(),
                grade: grade.trim(),
                classNum: classNum.trim(),
                studentId: studentId.trim()
              }
            })
        } catch (dbErr) {
          console.error('更新用户认证状态失败', dbErr)
          wx.showToast({ title: '认证成功，但云端同步失败', icon: 'none', duration: 2500 })
        }

        this.setData({ isVerified: true })
        wx.hideLoading()
        const successMsg = isExpert ? '认证成功，已识别为专家！' : '认证成功！'
        wx.showToast({ title: successMsg, icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/profile/profile' })
        }, 1200)
      } else {
        wx.hideLoading()
        wx.showModal({
          title: '认证失败',
          content: '填写的信息与学校数据库不匹配，请核对后重试',
          showCancel: false,
          confirmText: '我知道了'
        })
      }
    } catch (err: any) {
      wx.hideLoading()
      const msg = (err && err.errMsg) ? err.errMsg : '认证失败，请稍后重试'
      wx.showToast({ title: msg, icon: 'none', duration: 2500 })
    }

    this.setData({ submitting: false })
  }
})
