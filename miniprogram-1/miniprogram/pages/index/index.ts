// index.ts
// 获取应用实例
interface UserInfo {
    avatarUrl: string;
    nickName: string;
  }
Page({
    data: {
      motto: '由甘凡开发，甘凡牛逼',
      userInfo: {
        avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
        nickName: '',
      },
      hasUserInfo: false,
      canIUseGetUserProfile: wx.canIUse('getUserProfile'),
      canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    },
    onLoad() {
        const userInfo = wx.getStorageSync('userInfo');

        if (userInfo) {
          this.setData({
            userInfo
          });
        } else {
          // 没登录 → 自动拿 openid
          this.autoLogin();
        }
      },
      autoLogin() {
        wx.cloud.callFunction({
          name: 'login',
          success: async (res) => {
            if (!res.result) {
              console.error('没有获取到 result');
              return;
            }
      
            const result = res.result as { openid: string };
            const openid = result.openid;
      
            const db = wx.cloud.database();
            const dbRes = await db.collection('users')
              .where({ openid })
              .get();
      
            if (dbRes.data.length > 0) {
                const user = dbRes.data[0];

                this.setData({
                  userInfo: {
                    avatarUrl: user.avatarUrl,
                    nickName: user.nickName
                  }
                });
      
              wx.setStorageSync('userInfo', user);
            }
          },
          fail: (err) => {
            console.error('云函数调用失败', err);
          }
        });
      },
    // 点击头像
    onChooseAvatar(e: any) {
        const { avatarUrl } = e.detail
      
        const cloudPath = 'avatar/' + Date.now() + '.png'
      
        wx.cloud.uploadFile({
          cloudPath,
          filePath: avatarUrl,
          success: res => {
            const fileID = res.fileID
      
            const { nickName } = this.data.userInfo
      
            this.setData({
              "userInfo.avatarUrl": fileID,
              hasUserInfo: !!nickName && !!fileID
            })
      
            console.log('上传成功：', fileID)
          },
          fail: err => {
            console.error('上传失败：', err)
          }
        })
      },
  
    // 输入昵称
    onInputChange(e: any) {
      const nickName = e.detail.value
      const { avatarUrl } = this.data.userInfo
  
      this.setData({
        "userInfo.nickName": nickName,
        hasUserInfo: !!nickName && avatarUrl !== ''
      })
    },
  
    // 登录按钮
    handleLogin() {
        const userInfo = this.data.userInfo;
      
        if (!userInfo.nickName) {
          wx.showToast({
            title: '请输入昵称',
            icon: 'none'
          });
          return;
        }
       
        wx.cloud.callFunction({
          name: 'login',
          success: async (res) => {
            if (!res.result) {
                console.error('没有获取到 result');
                return;
              }
        
            const result = res.result as { openid: string };
            const openid = result.openid;
      
            console.log('openid:', openid);
      
            // 👉 存数据库
            await this.saveUser(openid, userInfo);
      
            // 👉 本地缓存
            wx.setStorageSync('userInfo', {
              ...userInfo,
              openid
            });
      
            wx.showToast({
              title: '登录成功',
            });
            wx.switchTab({
                url: '/pages/square/square'
              });
          }
        });
      },
      async saveUser(openid: string, userInfo: UserInfo) {
        const db = wx.cloud.database();
      
        const res = await db.collection('users')
          .where({ openid })
          .get();
      
        if (res.data.length > 0) {
          // 👉 已存在（老用户）
          console.log('老用户');
        } else {
          // 👉 新用户（注册）
          await db.collection('users').add({
            data: {
              openid,
              nickName: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl,
              createTime: new Date()
            }
          });
          console.log('新用户已创建');
        }
      }
  })