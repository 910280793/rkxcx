const app = app || getApp();
const zutils = require('../../utils/zutils.js');
const wss = require('../../utils/wss.js');

Page({
  data: {
    showConfirm: false,
    dsUserInfo:null,
    dsOpenid:null
  },
  roomId: null,
  
  onLoad: function (e) {
    
    this.roomId = e.id || e.pkroom;
    console.log(this.roomId)
    if (!this.roomId || !app.GLOBAL_DATA.USER_INFO) {
      app.gotoPage('/pages/pk/start');
      return;
    }

    let that = this;
    app.getUserInfo(function (u) {
      that.setData({
        fooHeadimg: app.GLOBAL_DATA.USER_INFO.avatarUrl,
        fooNick: app.GLOBAL_DATA.USER_INFO.nickName
      });

      if (e.id) {
        console.log("执行创建")
        that.fooReady();
      } else if (e.pkroom) {
        console.log("执行加入")
        that.barEnter();
      }
    });
  },

  fooReady: function () {
    let that = this;
  
     
      
        that.initSocket();
        setTimeout(function () {
          that.setData({
            showOp: true,
            stateText: '等待对手加入'
          })
        }, 999);
        that.setData({
          roomNo: this.roomId
        })
      
    
  },

  barEnter: function () {
    let that = this;
    var url = "/pk/room-info?roomId=" + that.roomId + "&userId=" + app.GLOBAL_DATA.USER_INFO2.userId
    console.log("roominfo"+url)
    zutils.post(app, url, function (res) {
      console.log(res)
      
       that.setData({
         dsUserid:res.data.userId
       })
      that.setData({
        barHeadimg: res.data.dsAvatarUrl,
        barNick: res.data.dsName
      });
    });

  

      
    
     that.initSocket();
    setTimeout(function () {
      that.setData({
        showOp: true,
        stateText: '等待发起者开始'
      })
      var data={
        action:1010,
        roomId: that.roomId,
        userId:app.GLOBAL_DATA.USER_INFO2.userId
      }
      wss.send(data)
    }, 2000);
   
     
      
    
  },

  confirmPk: function (e) {
    let that = this;
    var data = {
      action: 1011,
      roomId: that.roomId,
      userId: app.GLOBAL_DATA.USER_INFO2.userId
    }
    wss.send(data)
        wss.close('PKNEXT');
        wx.redirectTo({
          url: 'room-pk?id=' + that.roomId
        });
      
    
  },

  initSocket: function () {
    var App=getApp()
    var userId = App.GLOBAL_DATA.USER_INFO2.userId
    var avatarUrl = App.GLOBAL_DATA.USER_INFO.avatarUrl
    var nickName = App.GLOBAL_DATA.USER_INFO.nickName
  var param=userId+'.'+this.roomId
  console.log(param)
    let url = 'webSocket/'+param+'?';
    wss.init(url, this.handleMessage);
  },

  handleMessage: function (data) {
    let that = this;
    switch (data.action) {
      case 1010:  // BAR 进入
        var url = "/pk/room-info?roomId=" + that.roomId + "&userId=" + app.GLOBAL_DATA.USER_INFO2.userId
        console.log("进入roominfo" + url)
        zutils.post(app, url, function (res) {
          console.log(res)

          that.setData({
            dsUserid: res.data.userId
          })
          that.setData({
            barHeadimg: res.data.dsAvatarUrl,
            barNick: res.data.dsName
          });
        });
        data.showConfirm = true;
        data.stateText = '请确认开始对战';
        this.__barEnterActionTimer = setTimeout(function () {
          that.setData(data);
        }, 1500);
        break;
      case 1011:  // FOO 开始
        wss.close('PKNEXT');
        wx.redirectTo({
          url: 'room-pk?id=' + this.roomId
        });
        break;
      case 1012:  // BAR 放弃
        if (this.__barEnterActionTimer) {
          clearTimeout(this.__barEnterActionTimer);
          this.__barEnterActionTimer = null;
        }
        this.setData({
          showConfirm: false,
          barHeadimg: null,
          barNick: null,
          stateText: '等待对手加入'
        });
        break;
      case 1013:  // FOO 放弃
        this.__error('发起者已放弃');
        break;
      default:
        console.log('未知 Action ' + data.action);
    }
  },

  cancelPk: function () {
    wx.showModal({
      title: '提示',
      content: '确认放弃本轮对战吗？',
      success: function (res) {
        if (res.confirm) {
          wss.close('PKWAIT');
          wx.navigateBack();
        }
      }
    })
  },

  // 显示错误并退出
  __error: function (error_msg) {
    wx.showModal({
      title: '提示',
      content: error_msg || '系统错误',
      showCancel: false,
      success: function () {
        wx.navigateBack();
      }
    })
  },

  onUnload: function () {
    wss.close('PKWAIT');
  },

  onShareAppMessage: function () {
    let that = this;
    let d = {
      title: app.GLOBAL_DATA.USER_INFO.nick + '向你发起挑战',
      path: '/pages/pk/start?pkroom=' + this.roomId,
      success: function (res) {
      }
    }
    return d;
  },

  copyRoomNo: function () {
    wx.setClipboardData({
      data: this.data.roomNo + '',
      success: function () {
        wx.showToast({
          icon: 'none',
          title: '房间号已复制'
        });
      }
    });
  }
})