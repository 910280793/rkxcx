const app = app || getApp();
const zutils = require('../../utils/zutils.js');

Page({
  data: {
    hasError: '等待初始化',
    dialogHide: true,
  },
  roomId: null,
  onShowTimes: 0,
  onShareTrigger: false,

  onLoad: function (e) {
    if (!!app.GLOBAL_DATA.RED_DOT[2]) {
      app.hideReddot(2, app.GLOBAL_DATA.RED_DOT[2]);
    }

    if (!!e.pkroom) {
      this.onShowTimes = 1;
    }

    let that = this;
    app.getUserInfo(function (u) {
      that.setData({
        headimgUrl: a,
        nick: u.nick
      });

      if (e.pkroom) {
        that.__checkRoom(e.pkroom);
      } else {
        setTimeout(function () {
          if (!that.roomId) {
            that.onShow('onLoad');
          }
        }, 100);
      }
    });
  },

  onShow: function (s) {
    if (!app.GLOBAL_DATA.USER_INFO) return;
    this.onShowTimes++;

    let tt = this.onShowTimes;
    let that = this;
    
   
    

      that.__loadMeta();
      if (s == 'onPullDownRefresh') wx.stopPullDownRefresh();

      // 判断是否进入房间
      if (that.onShareTrigger === true && app.reenterSource && app.reenterSource.path == 'pages/pk/start') {
        that.onShareTrigger = false
        wx.navigateTo({
          url: 'room-wait?id=' + that.roomId
        });
      }
    

    let u = app.GLOBAL_DATA.USER_INFO;
   
      this.setData({
        headimgUrl: u.avatarUrl,
        nick: u.nickName
      });
    
  },

  __checkRoom: function (pkroom) {
    zutils.get(app, '/pk/room-check?roomId=' + pkroom, function (res) {
      let status = res.data.status;
      if (status!=0) {
        app.alert('房间不可加入');
      } else {
        
          wx.navigateTo({
            url: 'room-wait?pkroom=' + pkroom
          });
      
        
      }
    });
  },

  __loadMeta: function () {
    let that = this;
    zutils.get(app, 'api/pkrank/my-pkinfo', function (res) {
      that.setData(res.data);
    });
    zutils.get(app, 'api/pkrank/rank-list?top=10', function (res) {
      that.setData({ rankList: res.data });
    });
  },

  onPullDownRefresh: function () {
    this.onShow('onPullDownRefresh');
  },

  onShareAppMessage: function (e) {
    var d = app.warpShareData('/pages/pk/start');
    d.title = '快来参加软考PK赛';
    if (e.from == 'button') {
      let that = this;
      d = {
        title: app.GLOBAL_DATA.USER_INFO.nickName + '向你发起挑战',
        path: '/pages/pk/room-wait?pkroom=' + that.roomId,
        // 新版微信已取消
        // success: function (res) {
        //   if (that.roomId) {
        //     wx.navigateTo({
        //       url: 'room-wait?id=' + that.roomId
        //     });
        //   }
        // }
      }
      this.onShareTrigger = true
      zutils.get(app, '/pk/room-init', function (res) {
        that.roomId=res.data.roomid

      });
    }
    return d;
  },

  onHide: function(e) {
    console.log('离开 PK 首页 ...')
  },

  checkReady: function () {
   

    let that = this;
    wx.showModal({
      title: '提示',
      content: this.data.hasError,
      showCancel: false,
      success: function () {
        if (that.data.hasError.indexOf('考试类型') > -1 && that.onShowTimes > 1) {
          wx.navigateTo({
            url: '../question/subject-choice?back=1'
          });
        }
      }
    });
  },

  dialogOpen: function () {
    this.setData({
      dialogHide: false,
      inputFocus: true
    });
  },

  dialogClose: function () {
    this.setData({
      dialogHide: true
    });
  },

  inputData: {},
  inputTake: function (e) {
    this.inputData[e.currentTarget.dataset.id] = e.detail.value;
  },

  enterRoom: function () {
    let no = this.inputData['roomNo'];
   

    let that = this;
  
        that.__checkRoom(no);
    
    
  }
});