import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './config/logger';
import { globalRateLimit } from './middleware/rateLimit';
import { errorHandler, notFound } from './middleware/errorHandler';

// Routes
import dashboardRoutes from './routes/dashboard';
import maquinasRoutes from './routes/maquinas';
import clientesRoutes from './routes/clientes';
import contratosRoutes from './routes/contratos';
import lancamentosRoutes from './routes/lancamentos';
import manutencoesRoutes from './routes/manutencoes';
import vendasRoutes from './routes/vendas';
import relatoriosRoutes from './routes/relatorios';
import categoriasRoutes from './routes/categorias';
import vendedoresRoutes from './routes/vendedores';
import nfeRoutes from './routes/nfe';
import documentosRoutes from './routes/documentos';
import materiaisRoutes from './routes/materiais';
import servicosRoutes from './routes/servicos';
import tiposEquipamentoRoutes from './routes/tipos_equipamento';
import ordensServicoRoutes from './routes/ordens_servico';
import comprasRoutes from './routes/compras';
import fornecedoresRoutes from './routes/fornecedores';
import contasBancariasRoutes from './routes/contas_bancarias';
import loggerRoute from './routes/logger';
import authRoutes from './routes/auth';

const app = express();

// ── SEGURANÇA ──────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return callback(null, true);

    // Allow explicit frontend URL from env
    if (origin === env.FRONTEND_URL) return callback(null, true);

    // Allow common local development hosts and any port
    const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/;
    if (localhostRegex.test(origin)) return callback(null, true);

    // Deny others
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
}));

// ── PARSING & COMPRESSÃO ───────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── LOGS ───────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.path === '/health',
}));

// ── RATE LIMIT GLOBAL ──────────────────────────────────────
app.use(globalRateLimit);

// ── HEALTH CHECK ───────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── ROTAS DA API ───────────────────────────────────────────
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/maquinas', maquinasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/contratos', contratosRoutes);
app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/manutencoes', manutencoesRoutes);
app.use('/api/vendas', vendasRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/vendedores', vendedoresRoutes);
app.use('/api/nfe', nfeRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/materiais', materiaisRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/tipos-equipamento', tiposEquipamentoRoutes);
app.use('/api/ordens-servico', ordensServicoRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/contas-bancarias', contasBancariasRoutes);
app.use('/api/log-error', loggerRoute);
app.use('/api/auth', authRoutes);

// ── 404 & ERROR HANDLER ────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── START ──────────────────────────────────────────────────
app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`🚀 API rodando em http://0.0.0.0:${env.PORT} [${env.NODE_ENV}]`);
});

export default app;
