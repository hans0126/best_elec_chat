const electron = require('electron')
const { app, BrowserWindow, autoUpdater, Menu, Tray, ipcMain, dialog } = require('electron')
if (require('electron-squirrel-startup')) app.quit();

const request = require('request')
const path = require('path')
const url = require('url')
const os = require('os')
const { _extend } = require('util')

//const {version} = require('package.json')

const feedURL = "http://127.0.0.1:3030/update/win" + (os.arch() === 'x64' ? '64' : '32') + "/" + app.getVersion() + "/RELEASES";

let windows = []


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

    //const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize

    let mainWin = new BrowserWindow({
        width: 860,
        height: 480
    })

    mainWin.loadURL(url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: 'file:',
        slashes: true
    }))

    mainWin.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault()
            windows['main'].hide();
        }
    })

    mainWin.on('minimize', (event) => {
        if (!app.isQuiting) {
            event.preventDefault()
        }
    })

    windows['main'] = mainWin

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

    ipcMain.on('openCapturer', (event, arg) => {
        createCapturer();
    })

    ipcMain.on('capturerImg', (event, arg) => {
        windows['main'].webContents.send('getCapturerImg', arg)
    })



}

function createCapturer() {

    let capturerWindow = new BrowserWindow({
        frame: false,
        transparent: true,
        useContentSize: true
    })

    capturerWindow.on('close', (event) => {
        console.log("close Capturer window");
        windows['capturer'] = null;
    })

    capturerWindow.loadURL(url.format({
        pathname: path.join(__dirname, "./capturer.html"),
        protocol: 'file:',
        slashes: true
    }))

    capturerWindow.setPosition(0, 0)
    capturerWindow.setFullScreen(true)
    capturerWindow.setResizable(false)

    windows['capturer'] = capturerWindow;


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
