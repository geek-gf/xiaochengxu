Page({
    data: {
        list: [] as number[]
    },
  
    onLoad() {
      const arr = []
  
      for (let i = 0; i < 40; i++) {
        arr.push(i)
      }
  
      this.setData({
        list: arr
      })
    }
  })