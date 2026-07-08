const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// ── CONFIGURAÇÃO ──────────────────────────────────────────────
const BACKEND_PORT = 3001;
const FRONTEND_PORT = 3000;
const isDev = !app.isPackaged;

let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;

// ── INICIAR BACKEND (Express) ─────────────────────────────────
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = isDev
      ? path.join(__dirname, '../backend/dist/index.js')
      : path.join(process.resourcesPath, 'backend-dist/index.js');

    const envPath = isDev
      ? path.join(__dirname, '../backend/.env')
      : path.join(__dirname, '.env'); // Lê o .env embutido no asar

    // Carregar .env
    require('dotenv').config({ path: envPath });

    backendProcess = spawn(process.execPath, [backendPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(BACKEND_PORT),
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: 'pipe',
    });

    backendProcess.stdout?.on('data', d => console.log('[Backend]', d.toString().trim()));
    backendProcess.stderr?.on('data', d => console.error('[Backend Error]', d.toString().trim()));

    // Aguardar o backend subir (poll HTTP)
    const start = Date.now();
    const poll = setInterval(() => {
      http.get(`http://localhost:${BACKEND_PORT}/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(poll);
          console.log(`[Backend] API rodando na porta ${BACKEND_PORT}`);
          resolve(true);
        }
      }).on('error', () => {
        if (Date.now() - start > 20000) {
          clearInterval(poll);
          reject(new Error('Backend não subiu em 20s'));
        }
      });
    }, 500);
  });
}

// ── INICIAR FRONTEND (Next.js) ────────────────────────────────
function startFrontend() {
  return new Promise((resolve, reject) => {
    const frontendPath = isDev
      ? path.join(__dirname, '../frontend')
      : path.join(process.resourcesPath, 'frontend-standalone');

    if (isDev) {
      // Em desenvolvimento: usa next dev já rodando
      resolve(true);
      return;
    }

    // Em produção: serve o Next.js standalone (server.js gerado pelo output: standalone)
    const nextServer = path.join(frontendPath, 'server.js');

    frontendProcess = spawn(process.execPath, [nextServer], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(FRONTEND_PORT),
        NEXT_PUBLIC_API_URL: `http://localhost:${BACKEND_PORT}`,
        HOSTNAME: '127.0.0.1',
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: 'pipe',
      cwd: frontendPath,
    });

    frontendProcess.stdout?.on('data', d => console.log('[Frontend]', d.toString().trim()));
    frontendProcess.stderr?.on('data', d => console.error('[Frontend Error]', d.toString().trim()));

    const start = Date.now();
    const poll = setInterval(() => {
      http.get(`http://localhost:${FRONTEND_PORT}`, (res) => {
        if (res.statusCode < 500) {
          clearInterval(poll);
          console.log(`[Frontend] Next.js rodando na porta ${FRONTEND_PORT}`);
          resolve(true);
        }
      }).on('error', () => {
        if (Date.now() - start > 30000) {
          clearInterval(poll);
          reject(new Error('Frontend não subiu em 30s'));
        }
      });
    }, 700);
  });
}

// ── CRIAR JANELA ──────────────────────────────────────────────
function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'NLA Equipamentos',
    show: false,
    backgroundColor: '#f8fafc',
  });

  mainWindow.loadURL(url);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  // Abrir links externos no browser padrão
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── LOADING SPLASH ────────────────────────────────────────────
function createSplash() {
  const splash = new BrowserWindow({
    width: 400,
    height: 250,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: { nodeIntegration: false },
  });

  splash.loadURL(`data:text/html,
    <html>
    <body style="margin:0;background:#1e293b;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:sans-serif">
      <div style="font-size:32px;font-weight:800;color:#f59e0b">NLA</div>
      <div style="font-size:14px;color:#94a3b8;margin-top:4px">Carregando sistema...</div>
      <div style="margin-top:20px;width:200px;height:4px;background:#334155;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:60%;background:linear-gradient(90deg,#f59e0b,#f97316);border-radius:4px;animation:slide 1.5s ease infinite" id="bar"></div>
      </div>
      <style>@keyframes slide{0%{width:0%}50%{width:80%}100%{width:0%;margin-left:100%}}</style>
    </body>
    </html>
  `);

  return splash;
}

// ── LIFECYCLE ──────────────────────────────────────────────────
app.whenReady().then(async () => {
  const splash = createSplash();

  try {
    await startBackend();

    const frontendUrl = isDev
      ? 'http://localhost:3000'
      : `http://localhost:${FRONTEND_PORT}`;

    if (!isDev) {
      await startFrontend();
    }

    createWindow(frontendUrl);
    splash.close();
  } catch (err) {
    console.error('Erro ao iniciar:', err);
    splash.close();

    const { dialog } = require('electron');
    dialog.showErrorBox('Erro ao iniciar NLA Equipamentos', String(err));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  backendProcess?.kill();
  frontendProcess?.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  backendProcess?.kill();
  frontendProcess?.kill();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow(`http://localhost:${FRONTEND_PORT}`);
  }
});
