const { app, BrowserWindow } = require('electron');
const path = require('path');

require(path.join(__dirname, 'server.js'));

function createWindow () {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    resizable: true,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  win.loadFile(path.join(__dirname, 'app/index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
