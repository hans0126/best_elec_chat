const { app, BrowserWindow, autoUpdater, Menu, Tray, ipcMain,dialog} = require('electron')
if (require('electron-squirrel-startup')) app.quit();

const request = require('request')
const path = require('path')
const url = require('url')
const os = require('os')
const { _extend } = require('util')

//const {version} = require('package.json')

const feedURL = "http://127.0.0.1:3030/update/win" + (os.arch() === 'x64' ? '64' : '32') + "/" + app.getVersion() + "/RELEASES";

let windows = []

function createWindow(_o) {

    const _default = {
        width: 800,
        height: 600,
        devTools: false,
        close: () => {},
        minimize: () => {},
        templateUrl: null,
        frame: true,
        transparent:false
    }

    let _option = _extend(_default, _o)
    let _w

    // Create the browser window.
    _w = new BrowserWindow({
        width: _option.width,
        height: _option.height,
        frame: _option.frame,
        transparent:_option.transparent
    })

    // and load the index.html of the app.
    _w.loadURL(url.format({
        pathname: path.join(__dirname, _option.templateUrl),
        protocol: 'file:',
        slashes: true
    }))


    // Open the DevTools.
    if (_option.devTools) {
        _w.webContents.openDevTools()
    }

    // Emitted when the window is closed.
    _w.on('close', _option.close)
    _w.on('minimize', _option.minimize)

    return _w
}

app.on('ready', () => {

    if (process.argv[1] == '--squirrel-firstrun') {
        mainProcess();
        return;
    }

    autoUpdater.setFeedURL(feedURL);

    autoUpdater.on('update-downloaded', () => {
        // 下载完成，更新前端显示
        autoUpdater.quitAndInstall();
    });

    autoUpdater.on('error', () => {
        return
    })

    //console.log(path.resolve(path.dirname(process.execPath), '..'));

    try {
        // 不是安装应用的情况下启动下回出错，此时直接正常启动应用
        request(feedURL, (error, response, body) => {
            if (response) {
                autoUpdater.checkForUpdates();
            } else {
                mainProcess();
            }
        })
    } catch (ex) {
        mainProcess();
        return;
    }

})




function mainProcess() {
    windows['main'] = createWindow({
        width: 860,
        height: 480,
        templateUrl: "index.html",       
        close: (event) => {
            if (!app.isQuiting) {
                event.preventDefault()
                windows['main'].hide();
            }
            // return false;

        },
        minimize: (event) => {
            event.preventDefault()
                // windows['main'].hide();
        }
    })

    windows['capturer'] = createWindow({
        width: 800,
        height: 800,
        templateUrl: "./template/capturer.html",
        frame:true,
        transparent:false
    })


    var contextMenu = Menu.buildFromTemplate([

        {
            label: 'Show App',
            click: function() {
                windows['main'].show();
            }
        }, {
            label: 'Quit',
            click: function() {
                app.isQuiting = true;
                app.quit();

            }
        }
    ]);

    var appIcon = new Tray('./1480604916_Battery_Full.png');    
    appIcon.setContextMenu(contextMenu);


    ipcMain.on('notify_click', (event, arg) => {
        windows['main'].webContents.send('notify_click', arg)

        if (windows['main'].isMinimized() || !windows['main'].isVisible()) {
            windows['main'].show();
        }
    })

}
/*
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
*/
app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (windows['main'] === null) {
        mainProcess()
    }

})
