var app = angular.module('app', ['ngRoute']);
const socketUrl = 'ws://evpn.ittms.com.tw:5280';
const { ipcRenderer } = require('electron');
var io = require("socket.io-client");

//


	




app.controller('mController', [
    "$scope",
    "$route",
    "$routeParams",
    "$location",
    "socket",
    "$rootScope",
    function($scope, $route, $routeParams, $location, socket, $rootScope) {
        $scope.$route = $route;
        $scope.$location = $location;
        $scope.$routeParams = $routeParams;

        $rootScope.users = [];
        $rootScope.usersMap = [];
        $rootScope.roomsMap = [];
        $rootScope.rooms = [];
        $rootScope.project = [];
        //$rootScope.projectMap = [];
        $rootScope.account = {};
        // $scope.organizeres = [];
        $rootScope.searchRooms = [];

        $rootScope.activeRoom = null;

    }
])

app.controller('loginController', [
    "$scope",
    "$routeParams",
    "socket",
    "$location",
    function($scope, $routeParams, socket, $location) {
        var _self = this;
        _self.user_account = "08073";
        _self.user_password = "399394";
        _self.login = function() {
            let _oprion = {
                query: "memberid=" + _self.user_account + "&passwd=" + _self.user_password
            };

            socket.init(_oprion);

            socket.on('login', function(_msg) {
                $location.path('/chat');
                $location.replace();
            })
        }



    }
])


app.controller('chatController', [
    "$scope",
    "$routeParams",
    "socket",
    "$location",
    "_",
    "$rootScope",
    function($scope, $routeParams, socket, $location, _, $rootScope) {

        if (!socket.hasConnect) {
            $location.path('/');
            $location.replace();
            return
        }

        var _self = this;

        let switchStroage = ["organizeresShow", "projectShow", "searchShow"];
        $scope.organizeres = [];

        $scope.chatRoomDataTemplate = {
            roomid: null,
            msg: [],
            users: [],
            name: null,
            pic_link: null,
            hasLoad: false
        }

        $scope.switchBtn = function(_val) {

            _.forEach(switchStroage, function(_obj, _idx) {
                if (_obj == _val) {
                    _self[_obj] = true;
                } else {
                    _self[_obj] = false;
                }
            })
        }

        _self.organizeresShow = true;
        _self.projectShow = false;
        _self.searchShow = false;

        socket.on('receive', function(_msg) {
            var _re = JSON.parse(_msg);

        })

        socket.on('organizeres', function(_msg) {

            _re = JSON.parse(_msg);

            if (_re.status == 0) {
                $scope.organizeres = _re.data;
            }
        })

        socket.on('personres', function(_msg) {
            //console.log(msg);
            _re = JSON.parse(_msg);
            $rootScope.account = _re.data;
        });

        socket.on('messageres', function(_msg) {
            _re = JSON.parse(_msg);
            _re = _re.data;
            var _room = $rootScope.roomsMap[_re.room.roomid];
            _room.msg = _re.message;

            _.forEach(_re.member, function(_val, _idx) {
                _room.users.push(_val.employeeid);
            })

        });

        socket.on('receive', function(_msg) {
            var _re = JSON.parse(_msg);

            var _room = $rootScope.roomsMap[_re.roomid];
            _room.msg.push(_re);

            if (_re.employeeid != $rootScope.account.employeeid) {

                var options = {
                    body: _re.message
                }

                var _notifiy = new Notification(_re.employeename + ":", options);

                _notifiy.onclick = function() {
                    //  window.focus();
                    _notifiy.close();

                    ipcRenderer.send('notify_click', _re.roomid)


                }

            }

        });

        socket.on('projectres', function(_msg) {
            var _re = JSON.parse(_msg);
            _re = _re.data;

            _.forEach(_re, function(_val, _idx) {
                var _r = angular.copy($scope.chatRoomDataTemplate);
                _r.roomid = _val.roomid;
                _r.name = _val.name;

                $rootScope.rooms.push(_r);
                $rootScope.project.push(_r);
                $rootScope.roomsMap[_val.roomid] = _r;
            })

        });

        ipcRenderer.on('notify_click', (_event, _data) => {
            $rootScope.activeRoom = $rootScope.roomsMap[_data];

            if (!$rootScope.activeRoom.hasLoad) {
                socket.emit('messagereq', JSON.stringify({ roomid: _re.roomid }));
                $rootScope.activeRoom.hasLoad = true;
            }

            $scope.$apply();

        })
    }
])


app.directive('organizeresList', ["$compile", "$timeout", function($compile, $timeout) {

    return {
        restrict: 'A',
        scope: true,
        link: function(scope, element, attrs) {
            var _t = '<ul>';

            _.forEach(scope.organizeres, function(_val, _idx) {

                _t += "<li><div class='List_item List_A'>" + _val.title + "</div>";
                _t += "<ul class='ng-hide'>";

                _.forEach(_val.child, function(_val, _idx) {

                    _t += "<li><div class='List_item List_B_title'>" + _val.title + "</div>";
                    _t += "<ul class='ng-hide'>";
                    if (_val.child.length == 0) {
                        _.forEach(_val.employee, function(_val, _idx) {
                            _t += "<li>" + createRoom(_val) + "</li>";
                        });
                    } else {
                        _.forEach(_val.child, function(_val, _idx) {
                            _t += "<li><div class='List_C'>" + _val.title + "</div ><ul class='ng-hide'>";
                            _.forEach(_val.employee, function(_val, _idx) {
                                _t += "<li>" + createRoom(_val) + "</li>";
                            });
                            _t += "</ul></li>"
                        })
                    }

                    _t += "</ul></li>";

                })
                _t += "</ul></li>";

            })

            _t += "</ul>";

            function createRoom(_v) {
                scope.users.push(_v);
                scope.usersMap[_v.employee_id] = _v
                let _r = angular.copy(scope.chatRoomDataTemplate);
                _r.roomid = _v.roomid;
                _r.name = _v.name;
                _r.pic_link = _v.pic_link
                scope.rooms.push(_v);
                scope.roomsMap[_v.roomid] = _r;
                return "<div class='person' person-room='" + _v.roomid + "'></div>";
            }

            var el = angular.element(_t);
            element.append(el);
            $compile(el)(scope);


            let listType = ['.List_A', '.List_B_title', '.List_C'];

            _.forEach(listType, (_val, _idx) => {

                let classType = "";

                switch (_idx) {
                    case 0:
                        classType = 'List_select';
                        break;

                    case 1:
                        classType = 'List_B_select';
                        break;
                }

                angular.element(element[0].querySelectorAll(_val)).bind('click', (e) => {
                    var _currentBtn = angular.element(e.currentTarget),
                        _ul = angular.element(_currentBtn.parent().children()[1]);

                    if (_ul.hasClass('ng-hide')) {
                        _ul.removeClass('ng-hide');
                        _currentBtn.addClass(classType);
                    } else {
                        _ul.addClass('ng-hide');
                        _currentBtn.removeClass(classType);
                    }

                    scope.$apply();

                })


            })

        }
    }

}])

app.directive('searchInput', ['$rootScope', function($rootScope) {
    return {
        restrict: 'A',
        scope: true,
        template: " <input type='text' placeholder='搜尋聯絡人' class='search_Input' ng-model='searchValue'/><div class='Search_Btn' ng-click='search()'></div>",
        link: function(scope, element, attrs) {
            scope.searchValue = null;
            scope.search = function() {
                if (!scope.searchValue) {
                    return
                }

                var _reg = new RegExp('.?' + scope.searchValue + '.?', 'i');
                $rootScope.searchRooms = _.filter(scope.rooms, function(o) {
                    return o.name.match(_reg);
                })
                scope.searchValue = null;

                scope.switchBtn("searchShow");

            }

            var searchInputElement = angular.element(element[0].querySelectorAll('.search_Input'));

            searchInputElement.bind('keydown', function(e) {
                if (e.which === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    scope.search();
                    scope.$apply();
                }
            })
        }
    }
}])

app.directive('roomList', ["$compile", function($compile) {
    return {
        restrict: 'A',
        scope: { rooms: "=roomList" },
        template: "<div ng-repeat='val in rooms' class='person' person-room='{{val.roomid}}'></div>",
        link: function(scope, element, attrs) {

        }
    }
}])

app.directive('personRoom', ['$rootScope', 'socket', function($rootScope, socket) {

    return {
        restrict: 'A',
        scope: { roomid: "@personRoom" },
        template: "<div class='person' ><div class='person_img' style='background-image:url({{img}})'></div><div class='person_name'>{{name}}</div><div class='person_num' ng-if='0'></div><div id='CB' ></div></div>",
        link: function(scope, element, attrs) {
            //     console.log($rootScope.usersMap[scope.roomid]);
            var _p = $rootScope.roomsMap[scope.roomid];

            scope.name = _p.name;
            scope.img = _p.pic_link;

            element.bind('click', function() {

                $rootScope.activeRoom = $rootScope.roomsMap[scope.roomid];

                if (!_p.hasLoad) {
                    socket.emit('messagereq', JSON.stringify({ roomid: scope.roomid }));
                    _p.hasLoad = true;
                }
                scope.$apply();
            })


        }
    }

}])

app.directive('singleMsg', ['$rootScope',
    'socket',
    '$compile',
    '$timeout',
    function($rootScope, socket, $compile, $timeout) {

        function getDate(_d) {
            var _re = _d.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
            return _re[4] + ":" + _re[5]
        }

        return {
            restrict: 'A',
            scope: { msg: "=singleMsg" },
            template: "",
            link: function(scope, element, attrs) {
                var _t = "";

                var direct = 'To';

                if ($rootScope.account.employeeid != scope.msg.employeeid) {
                    var sendUser = $rootScope.usersMap[scope.msg.employeeid];
                    scope.img = sendUser.pic_link;

                    direct = 'From';
                    _t += "<div class='Message_img' style='background-image:url({{img}})'></div>"

                }

                scope.message = scope.msg.message;
                scope.date = getDate(scope.msg.date);

                _t += "<div class='Message_" + direct + "_icon'></div>";
                _t += "<div class='Message_" + direct + "_txt'>{{message}}</div>";
                _t += "<div class='Message_" + direct + "_time'>{{date}}</div>";
                _t += "<div id='CB'></div>";

                var el = angular.element(_t);
                element.append(el);
                $compile(el)(scope);

                // employeeid employeename  message messagetype

                $timeout(function() {
                    var _e = element.parent()[0];
                    if (_e) {
                        _e.scrollTop = _e.scrollHeight;
                    }
                })
            }
        }
    }
])

app.directive('talkArea', ['socket',
    '$rootScope',
    function(socket, $rootScope) {

        function stripTag(_t) {
            // console.log(_t);
            if (!_t) {
                return
            }
            var regex = /(<([^>]+)>)/ig;
            var _re = _t.replace(regex, "");
            return _re;
        }


        return {
            restrict: 'A',
            scope: true,
            templateUrl: "template/talk_area.html",
            link: function(scope, element, attrs) {
                scope.userInput = null;
                var writeBox = angular.element(element[0].querySelectorAll('.writeBox')),
                    rangeOffset = 0;

                scope.msgContent = angular.element(element[0].querySelectorAll('.Talk_Content'));

                writeBox.bind('click', function(e) {
                    rangeOffset = getCaretPosition();
                    scope.emotionShow = false;
                    scope.emotionIconShow = false;
                    scope.$apply();
                })



                writeBox.bind('keydown', function(e) {
                    rangeOffset = getCaretPosition() + 1;
                    scope.userInput = writeBox.text();
                    console.log("AA");
                    if (e.which === 13) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (scope.userInput) {


                            var obj = {
                                roomid: $rootScope.activeRoom.roomid,
                                message: stripTag(scope.userInput)
                            }


                            socket.emit('textsendreq', JSON.stringify(obj));

                            writeBox.text("");
                            scope.userInput = null;
                        }

                        if (e.shiftKey) {

                        } else {
                            //scope.sendEvents.sendMsg();
                        }

                    }
                })

                function getCaretPosition() {
                    return window.getSelection().getRangeAt(0).endOffset;
                }

            }
        }

    }
])


app.config(function($routeProvider, $locationProvider) {
    $routeProvider
        .when('/', {
            templateUrl: "./template/login.html",
            controller: 'loginController',
            controllerAs: "lg"
        })
        .when('/chat', {
            templateUrl: "./template/chat.html",
            controller: 'chatController',
            controllerAs: "ct"
        })
        .otherwise({ redirectTo: '/' })

})

app.factory('socket', function($rootScope) {
    var socket;
    // var socketIOFile = new SocketIOFileClient(socket);
    return {
        init: function(_oprion) {
            socket = io.connect(socketUrl, _oprion);
            this.hasConnect = true;
        },
        on: function(eventName, callback) {
            socket.on(eventName, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function(eventName, data, callback) {
            socket.emit(eventName, data, function() {
                var args = arguments;
                $rootScope.$apply(function() {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        },
        upload: function(file, options, callback) {
            socketIOFile.upload(file, options);
        },
        hasConnect: false
    };
});
//lodash


app.factory('_', ['$window',
    function($window) {
        // place lodash include before angular
        return $window._;
    }
])
