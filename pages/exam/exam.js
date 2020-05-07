const app = app || getApp();
const zutils = require('../../utils/zutils.js');

Page({
  data: {
    
    seqTotal: 50,
    cardHide: true,
    isFirst: true,
    isLast: false,
    questionTakes: [{seq:33,examId:'2131',testId:'ssss',doQ:true}],
    subject: null,
  },
  seqCurrent: 1,
  examId: null,
  subjectId: null,

  dtcardAnimation: null,
  favList: [],
  duration: 0,
  examAutoNext: true,

  onLoad: function (e) {
    var that=this
   for(var i=0;i<this.data.seqTotal;i++){
     var x=i+1
     let qdata = {
       seq: x,
       examId: that.examId,
       testId: that.subjectId,
       doQ: false
     }

     that.setData({
       ['questionTakes[' + i + ']']: qdata,

     })
   }
    this.examId = e.examId;
    if(this.exam!=null){
      this.setData({
        seqCurrent:e.exam
      })
    }
    this.subjectId = e.subject;
    console.log(this.examId)
    this.duration = e.duration || 0;
    if (!e.exam || !e.subject) {
      wx.redirectTo({
        url: '../index/tips?msg=非法请求参数'
      });
      return;
    }

    app.GLOBAL_DATA.RELOAD_EXAM = ['Index'];
    app.GLOBAL_DATA.RELOAD_COIN = ['Home'];

    this.dtcardAnimation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease',
      delay: 50
    });


    zutils.get(app, 'api/fav/ids?spec=' + this.subjectId, function (res) {
      that.favList = res.data.data;
    });
    this.loadQuestion();

    wx.getSystemInfo({
      success: function (res) {
        that.setData({
          seqsHeight: res.windowHeight - 113,
          qareaHeight: res.windowHeight - 105
        });
      },
    });

    this.turningAnimation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease',
      transformOrigin: '50% 50% 0'
    });
  },

  onUnload: function () {
    this.__cleanCountdown();
  },

  loadQuestion: function () {
    let that = this;
    zutils.get(app, 'question/getQuestion?subject=' + that.subjectId + '&restore=' + that.seqCurrent, function (res) {
     console.log(res)
     
     that.setData({
       subject:res.data
     })
      that.subject = res.data
      var _data=res
      // that.setData({
      //   subject: _data.subject,
      //   seqTotal: _data.total_result,
      //   seqCurrent: 1
      // });
      that.examAutoNext = _data.examAutoNext;

      
     

      var time = that.duration;
      that._countdown = setInterval(function () {
        time++;
        wx.setNavigationBarTitle({
          title: '答题中 [' + that.__formatTime(time) + ']'
        });
      }, 1000);
    });
  },





  nextQuestion: function (e) {
    let that = this;
    var xh = that.seqCurrent+1
    that.seqCurrent=xh
    zutils.get(app, 'question/getQuestion?subject=' + that.subjectId + '&restore=' + xh, function (res) {
      console.log(res)

      that.setData({
        subject: res.data
      })
      that.subject = res.data
      var _data = res
    })
  },

  gotoQuestion: function (e) {
    var seq = ~~e.currentTarget.dataset.seq;
    this.dtcardAnimation.translateY('100%').step({ duration: 0 });
    this.setData({
      dtcardAnimation: this.dtcardAnimation.export(),
      seqCurrent: seq
    });
   
  },

  answer: function (e) {
    var that = this;
    var key = e.detail.value;
  

    // console.log(JSON.stringify(_selected));
     var app=getApp()
    var userId=app.GLOBAL_DATA.USER_INFO2.id
    var canNext = that.examAutoNext;
    var subject=that.data.subject;
    var xh=subject.xh
    var index=xh-1;
   let qdata={
     seq:subject.xh,
     examId:that.examId,
     testId:that.subjectId,
     doQ:true
   }
   
    that.setData({
     ['questionTakes['+index+']']:qdata,

    })
    console.log(that.data.questionTakes)
   

    zutils.post(app, '/exam/saveExamHistory?examId=' + that.examId + '&qid=' + subject.qid + '&examAnswer=' +key+'&answer='+subject.answer+'&xh='+subject.xh+'&userId='+userId+'&testId='+that.subjectId+'&qtype='+subject.qtype, function (res) {
      // if (canNext == true) {
      //   setTimeout(function () {
      //     that.nextQuestion();
      //   }, 500);
      // }
    });
  },

  showDtcard: function (e) {
 
    this.dtcardAnimation.translateY(0).step();
    this.setData({
   
      dtcardAnimation: this.dtcardAnimation.export()
    });
  
  },
  closeDtcard: function () {
    this.dtcardAnimation.translateY('100%').step();
    this.setData({
      dtcardAnimation: this.dtcardAnimation.export()
    });
  },

  fav: function (e) {
    var that = this;
    var q = that.questionList[this.data.seqCurrent];
    let formId = e ? (e.detail.formId || '') : '';
    zutils.post(app, 'api/fav/toggle?question=' + q.questionId + '&formId=' + formId, function (res) {
      var _data = res.data.data;
      that.setData({
        isFav: _data.is_fav
      });

      if (_data.is_fav) {
        wx.showToast({ title: '已加入收藏' });
        that.favList.push(q.questionId);
      } else {
        zutils.array.erase(that.favList, q.questionId);
      }
    });
  },

  finish: function (e) {
    var undo = 0;
    
    for (var k in this.questionList) {
      var q = this.questionList[k];
      if (!q._selected || q._selected.length < ~~q.answerNum) undo++;
    }

    var that = this;
    if (undo > 0) {
      wx.showModal({
        title: '提示',
        content: '还有' + undo + '道题没答，确认交卷吗？',
        confirmText: '交卷',
        success: function (res) {
          if (res.confirm) {
            that.__finish(e);
          }
        }
      })
    } else {
      wx.showModal({
        title: '提示',
        content: '确认交卷吗？',
        confirmText: '交卷',
        success: function (res) {
          if (res.confirm) {
            that.__finish(e);
          }
        }
      })
    }
  },
  __finish: function (e) {
    wx.showLoading({
      title: '正在判题...'
    });

    let that = this;
    let formId = e ? (e.detail.formId || '') : '';
    zutils.post(app, 'api/exam/finish?noloading&exam=' + that.examId + '&formId=' + formId, function (res) {
      if (res.data.error_code == 0) {
        that.__cleanCountdown();
        wx.redirectTo({
          url: 'exam-result?s=exam&id=' + that.examId
        });
      } else {
        wx.hideLoading();
        app.alert(res.data.error_msg);
      }
    });
  },

  __formatTime: function (time) {
    var time_h = ~~(time / 60 / 60);
    if (time_h > 0) {
      time = time - (time_h * 60 * 60);
    }
    var time_m = ~~(time / 60);
    var time_s = time % 60;

    time_m = time_m < 10 ? ('0' + time_m) : time_m;
    time_s = time_s < 10 ? ('0' + time_s) : time_s;
    if (time_h > 0) {
      //time_h = time_h < 10 ? ('0' + time_h) : time_h;
      return (time_h + ':' + time_m + ':' + time_s);
    } else {
      return (time_m + ':' + time_s);
    }
  },

  __cleanCountdown: function () {
    if (this._countdown) {
      clearInterval(this._countdown);
      this._countdown = null;
      wx.setNavigationBarTitle({
        title: '软考必备'
      });
    }
  },

  // 翻页

  turningStart: function (e) {
    this.__turning_CX = e.touches[0].clientX;
    this.__turning_CY = e.touches[0].clientY;
    this.turningAnimation.opacity(0.666).step();
    this.setData({
      turningData: this.turningAnimation.export()
    });
  },

  turningMove: function (e) {
    if (!this.__turning_CX || this.__turning_CX == -9999) return;
    let isX = e.touches[0].clientX - this.__turning_CX;
    let isY = e.touches[0].clientY - this.__turning_CY;
    if (Math.abs(isX) > 30 && Math.abs(isX) > Math.abs(isY)) {
      this.__turning = true;
      this.__turningLeft = isX;
    }
  },

  turningEnd: function (e) {
    if (!this.__turning_CX) return;
    this.__turning_CX = -9999;
    if (this.__turning !== true) {
      this.turningAnimation.opacity(1).step({ duration: 100 });
      this.setData({
        turningData: this.turningAnimation.export()
      });
      return;
    }
    this.__turning = false;

    if (this.__turningLeft < 0) {
      this.turningAnimation.translateX('-100%').step().translateX(0).opacity(1).step({ duration: 100 });
      this.nextQuestion();
    } else {
      this.turningAnimation.translateX('100%').step().translateX(0).opacity(1).step({ duration: 100 });
      this.prevQuestion();
    }
    this.setData({
      turningData: this.turningAnimation.export()
    });
  },

  // turningStart: function (e) {
  //   this.turningAnimation.opacity(0.8).step();
  //   this.setData({
  //     turningData: this.turningAnimation.export()
  //   });
  //   this.__turning_CX = e.touches[0].clientX;
  // },

  // turningMove: function (e) {
  //   if (this.__turning_CX == -9999) return;

  //   let moveX = e.touches[0].clientX;
  //   let leftX = moveX - this.__turning_CX;
  //   this.turningAnimation.translateX(leftX + 'px').step({ duration: 0 });
  //   this.__turning_Left = leftX;
  //   this.setData({
  //     turningData: this.turningAnimation.export()
  //   });
  //   console.log('leftX ' + leftX);
  // },

  // turningEnd: function (e) {
  //   if (this.__turning_CX == -9999) return;
  //   this.__turning_CX = -9999;

  //   let left = this.__turning_Left;
  //   let next = true;
  //   if (left > 80) {
  //     next = this.prevQuestion();
  //   } else if (left < -80) {
  //     next = this.nextQuestion();
  //   }

  //   if ((left > 80 || left < -80) && next === true) {
  //     this.turningAnimation.translateX(left > 80 ? '100%' : '-100%').step({ duration: 200 }).translateX('0px').opacity(1).step({ duration: 0 });
  //     this.setData({
  //       turningData: this.turningAnimation.export()
  //     });
  //   } else {
  //     this.turningAnimation.translateX('0px').opacity(1).step({ duration: 200 });
  //     this.setData({
  //       turningData: this.turningAnimation.export()
  //     });
  //   }
  // },
});