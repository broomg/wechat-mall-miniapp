import cart from '../../models/cart'

Page({
  data: {
    curPage: 1,
    pageSize: 500,
    goodsList: [],
    selectCart: {},
    selectAll: false,
    amount: 0,  // 结算金额
    selectNum: 0, // 结算数量
    lock: false   // 锁，防止按钮高频点击
  },
  async onLoad() {
    wx.removeStorageSync("goods")
  },
  onShow() {
    this.loadCartList()
  },
  async loadCartList() {
    wx.showLoading({
      mask: true,
      title: '加载中'
    })
    const res = await cart.getCartList(this.data.curPage, this.data.pageSize)
    const { error_code, msg } = res
    if (error_code !== undefined) {
      console.log(msg)
      wx.hideLoading()
      return
    }
    for (let i = 0; i < res.list.length; i++) {
      const cart = res.list[i]
      if (cart.status !== 0) {
        continue
      }
      const specList = JSON.parse(cart.specs)
      let specs = ""
      for (let j = 0; j < specList.length; j++) {
        specs += specList[j].value + '; '
      }
      if (specs.length < 2) {
        continue
      }
      res.list[i].specs = specs.substring(0, specs.length - 2)
      // 选中状态
      if (this.data.selectCart[cart.id]) {
        continue
      }
      this.data.selectCart[cart.id] = false
    }
    this.setData({
      goodsList: res.list
    })
    wx.hideLoading()
  },
  // 单选
  doSelectCart(e) {
    const selectCart = this.data.selectCart
    const id = e.currentTarget.dataset.id
    selectCart[id] = !selectCart[id]
   
    let selectAll = true
    for (let i in selectCart) {
      if (!selectCart[i]) {
        selectAll = false
      }
    }
    this.setData({
      selectCart: selectCart,
      selectAll: selectAll
    })
    this.calcGoodsAmount()
  },
  // 全选
  doSelectAll() {
    const selectAll = !this.data.selectAll
    const selectCart = this.data.selectCart
    for (let i in selectCart) {
      selectCart[i] = selectAll
    }
    this.setData({
      selectAll: selectAll,
      selectCart: selectCart
    })
    this.calcGoodsAmount()
  },
  // 计算总金额
  calcGoodsAmount() {
    const goodsList = this.data.goodsList
    const selectCart = this.data.selectCart
    let amount = 0
    let selectNum = 0
    for (let i = 0; i < goodsList.length; i++) {
      const goods = goodsList[i]
      if (selectCart[goods.id]) {
        amount += goods.price * goods.num
        selectNum++
      }
    }
    this.setData({
      amount: parseFloat(amount.toFixed(2)),
      selectNum: selectNum
    })
  },
  doAdd(e) {
    const id = e.currentTarget.dataset.id
    const curNum = e.currentTarget.dataset.num
    if (curNum >= 99) {
      wx.showToast({
        icon: 'none',
        title: '不能超过99件'
      })
      return
    }
    this.updateCartStock(id, curNum, 1)
  },
  doReduce(e) {
    const id = e.currentTarget.dataset.id
    const curNum = e.currentTarget.dataset.num
    if (curNum > 1) {
      this.updateCartStock(id, curNum, -1)
    }
  },
  // 更新数量，同步服务器
  async updateCartStock(cartId, curNum, num) {
    if (this.data.lock) {
      return
    }
    this.data.lock = true
    const goodsList = this.data.goodsList
    for (let i = 0; i < goodsList.length; i++) {
      const goods = goodsList[i]
      if (goods.id === cartId) {
        cart.editCart(cartId, num).then(res => {
          this.data.lock = false
          const { error_code, msg } = res
          if (error_code !== undefined) {
            wx.showToast({
              icon: 'none',
              title: msg
            })
            return
          }
          goodsList[i].num = curNum + num
          this.setData({
            goodsList: goodsList
          })
          this.calcGoodsAmount()
        }, err => {
          this.data.lock = false
          console.log(err)
        })
        break
      }
    }
  },
  async doDeleteCart(e) {
    wx.showLoading({
      mask: true,
      title: '加载中'
    })
    const id = e.currentTarget.dataset.id
    const res = await cart.editCart(id, 0)
    const { error_code, msg } = res
    if (error_code !== undefined) {
      wx.hideLoading()
      wx.showToast({
        icon: 'none',
        title: msg
      })
      return
    }
    this.loadCartList()
    wx.hideLoading()
  },
  goCategory() {
    wx.reLaunch({
      url: "/pages/category/category"
    });
  },
  onPullDownRefresh() {
    this.loadCartList()
    wx.stopPullDownRefresh()
  },
  goSettlement() {
    if (this.data.selectNum === 0) {
      wx.showToast({
        icon: 'none',
        title: '请选择结算的商品'
      })
      return
    }
    // 提取结算的商品，通过缓存传递数据
    const goodsList = this.data.goodsList
    const selectCart = this.data.selectCart
    const selectGoods = []
    for (let i = 0; i < goodsList.length; i++) {
      const goods = goodsList[i]
      if (selectCart[goods.id]) {
        selectGoods.push(goods)
      }
    }
    // 通过缓存传递数据
    wx.setStorageSync("goods", selectGoods)
    wx.navigateTo({
      url: '/pages/settlement/index'
    })
  }
})