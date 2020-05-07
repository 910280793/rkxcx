 const app = app || getApp();
const zutils = require('../../utils/zutils.js');
const wss = require('../../utils/wss.js');

Page({
  data: {
    showResult: false,
    fooScope: 0,
    barScope: 0,
    selectKey:null
  },
  roomId: null,
  questions: null,
  questionIdx: 0,
  sysInfo: null,

  onLoad: function (e) {
    this.roomId = e.id;
    if (!this.roomId || !app.GLOBAL_DATA.USER_INFO) {
      app.gotoPage('/pages/pk/start');
      return;
    }

    let that = this;
    zutils.get(app, 'pk/room-info?roomId=' + this.roomId + "&userId=" + app.GLOBAL_DATA.USER_INFO2.userId, function (res) {


      let u = app.GLOBAL_DATA.USER_INFO;
      that.setData({
        fooHeadimg: u.avatarUrl,
        fooNick: u.nickName,
        barHeadimg: res.data.dsAvatarUrl,
        barNick: res.data.dsName,
      });
     

      setTimeout(function () {
        that.renderQuestion();
      }, 999);
    });
    //获取题目
    zutils.get(app, 'pk/roomQuestion?roomId=' + this.roomId + "&userId=" + app.GLOBAL_DATA.USER_INFO2.userId, function (res) {
      that.questions = res.data.list;
      that.__pkSubject = app.GLOBAL_DATA.USER_INFO2.testName;
    });

    that.initSocket()
    wx.getSystemInfo({
      success: function (res) {
        let miniScreen = res.windowHeight < 550;
        that.setData({
          pageHeight: res.windowHeight - 0,
          questionHeight: res.windowHeight - (miniScreen ? 420 : 480),
          miniScreen: miniScreen ? 'mini-screen' : ''
        });
        that.sysInfo = res;
        console.log(res.windowHeight);
      },
    });

    this.__audio = {};
    this.__initAudio('pk_begindown.wav', false);
    this.__initAudio('select_right.wav', false);
    this.__initAudio('select_wrong.wav', false);
    this.__initAudio('win.mp3', false);
    this.__initAudio('lost.wav', false);

    // test result
    // this.setData({ fooScope: 220, barScope: 140 });
    // this.__complete();
  },

  renderQuestion: function () {
    let qno = '第' + ['一', '二', '三', '四', '五'][this.questionIdx] + '题';
    if (this.questionIdx == 4) qno = '最后一题<div style="margin-top:-4px;color:#ff0">分数加倍</div>';
    this.setData({
      question: '<div style="font-size:20px">' + qno + '</div>',
      questionClazz: 'animated fadeInDown',
      showClazz: '',
      answer: null,
      sourceSubject: null
    });

    let that = this;
    setTimeout(function () {
      that.__playAudio('pk_begindown.wav');
      that.__renderQuestion();
    }, 1600);
  },

  __renderQuestion: function () {
    console.log("q")
    console.log(this.questions)

    let q = this.questions[this.questionIdx];
    let countdown = 20;
    this.setData({
      question: q.content,
      answer: q.answerList,
      sourceSubject: q.year,
      countdown: countdown,
      selectKey: null,
      barSelectKey: null,
      rightKey: null,
      questionClazz: null,
      showClazz: 'animated fadeIn'
    });

    if (this.__countdownTimer) clearInterval(this.__countdownTimer);
    let that = this;
    this.__countdownTimer = setInterval(function () {
      countdown--;
      that.setData({
        countdown: countdown
      });
      if (countdown == 0) {
        clearInterval(that.__countdownTimer);
        that.selectAnswer();
      }
    }, 1000);
  },

  checkToNext: function () {
    let q = this.questions[this.questionIdx];
    // 都回答了
    if (!!q.fooKey && !!q.barKey) {
      this.setData({
        rightKey: q.rightKey,
        countdown: null
      });
      if (this.__countdownTimer) clearInterval(this.__countdownTimer);

      let that = this;
      setTimeout(function () {
        if (that.questionIdx == 4) {
          that.__complete();
        } else {
          that.questionIdx++;
          that.renderQuestion();
        }
      }, 1500);
    }
  },

  selectAnswer: function (e) {
    let q = this.questions[this.questionIdx];
    if (!!q.fooKey) return;
    q.fooKey = !!e ? e.currentTarget.dataset.key : 'N';
    let scope = this.data.fooScope || 0;
    let scopeNew = scope;
   

    this.setData({
      selectKey: q.fooKey,
      rightKey: q.answer,
      fooScope: scopeNew,
      fooScopeClazz: scope == scopeNew ? '' : 'animated rubberBand',
    });
    let that = this;
    setTimeout(function () {
      that.setData({
        fooScopeClazz: '_'
      });
    }, 1000);
    this.checkToNext();

    if (q.fooKey === q.answer) {
      this.__playAudio('select_right.wav');
    } else {
      this.__playAudio('select_wrong.wav');
    }
    console.log("xz:" + q.fooKey)
    console.log("da:" + q.answer)
    console.log("bj", q.answer == q.fooKey)
    if (q.answer === q.fooKey) {
      console.log("加分")
      scopeNew += (this.questionIdx == 4 ? 40 : 20);
    }

    console.log("sopeNew:" + scopeNew)
    //let send = { qindex: this.questionIdx, scope: scopeNew, select: q.fooKey };
    var data = {
      action: 1021,
      roomId: that.roomId,
      userId: app.GLOBAL_DATA.USER_INFO2.userId,
      qindex: this.questionIdx, 
      scope: scopeNew, 
      select: q.fooKey
    }
    wss.send(data);
  },

  __complete: function () {
    let total = this.data.fooScope + this.data.barScope;
    let fooScopeWidth = this.data.fooScope / total;
    let barScopeWidth = 100 - fooScopeWidth;
    let windowWidth = this.sysInfo.windowWidth;
    fooScopeWidth = windowWidth * fooScopeWidth;
    barScopeWidth = this.sysInfo.windowWidth - fooScopeWidth;
    let minWidth = 90;
    if (this.data.fooScope == 0 && this.data.barScope == 0) {
      fooScopeWidth = minWidth;
      barScopeWidth = minWidth;
    } else if (this.data.fooScope == 0) {
      fooScopeWidth = minWidth;
      barScopeWidth = windowWidth - fooScopeWidth;
    } else if (this.data.barScope == 0) {
      barScopeWidth = minWidth;
      fooScopeWidth = windowWidth - barScopeWidth;
    }
    if (fooScopeWidth < minWidth) {
      fooScopeWidth = minWidth;
      barScopeWidth = windowWidth - fooScopeWidth;
    } else if (barScopeWidth < minWidth) {
      barScopeWidth = minWidth;
      fooScopeWidth = windowWidth - barScopeWidth;
    }

    let isWin = this.data.fooScope > this.data.barScope;
    this.setData({
      showResult: true,
      fooScopeWidth: fooScopeWidth - 30,
      barScopeWidth: barScopeWidth - 30,
      isWin: isWin
    });
    wx.setNavigationBarTitle({
      title: isWin ? '对战成功' : '对战失败'
    })
    this.__playAudio(isWin ? 'win.mp3' : 'lost.wav');
    wss.close('PKEND');
  },

  initSocket: function () {
    var App = getApp()
    var userId = App.GLOBAL_DATA.USER_INFO2.userId
    var avatarUrl = App.GLOBAL_DATA.USER_INFO.avatarUrl
    var nickName = App.GLOBAL_DATA.USER_INFO.nickName
    var param = userId + '.' + this.roomId+'.1'
    console.log(param)
    let url = 'webSocket/' + param + '?';
    wss.init(url, this.handleMessage);
  },

  handleMessage: function (data) {
    let that = this;
    if (data.action == 1022 || data.action == 1023) {
      wx.showModal({
        title: '提示',
        content: '对手已放弃',
        showCancel: false,
        success: function () {
          that.__complete();
        }
      });
      return;
    }

    switch (data.action) {
      case 1021:  // BAR已回答
        this.setData({
          barScope: data.scope,
          barScopeClazz: data.scope == this.data.scope ? '' : 'animated rubberBand',
          barSelectKey: data.select
        });
        let that = this;
        setTimeout(function () {
          that.setData({
            barScopeClazz: '_'
          });
        }, 1000);

        let q = this.questions[this.questionIdx];
        q.barKey = data.select;
        this.checkToNext();
        break;
      default:
        console.log('未知 Action ' + data.action);
    }
  },

  beginPk: function () {
    app.gotoPage('/pages/pk/start');
  },
  explainGo: function () {
    wx.redirectTo({
      url: '../exam/explain?from=pk&id=' + this.__pkSubject,
    })
  },

  // 初始化音频
  __initAudio: function (file, loop) {
    this.__audio[file] = wx.createInnerAudioContext();
    this.__audio[file].src = 'https://cdn.chinaruankao.com/a/wxx/pk/' + file;
    this.__audio[file].loop = loop === true ? true : false;
    this.__audio[file].autoplay = false;
  },
  // 播放音频
  __playAudio: function (file) {
    if (!this.__audio[file]) return;
    this.__audio[file].stop();
    this.__audio[file].play();
  },

  onShareAppMessage: function () {
    var d = app.warpShareData('/pages/pk/start');
    d.title = '快来参加软考PK赛';
    console.log(d);
    return d;
  },

  onUnload: function () {
    if (this.__countdownTimer) clearInterval(this.__countdownTimer);
    console.log("触发onUN") 
    wss.close('PKING');
  }
})