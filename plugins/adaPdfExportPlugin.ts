import type { Plugin } from 'vite';
import {
  createPdfExportMiddleware,
  createDocxPdfExportMiddleware,
} from '../server/adaPdfExport';

export function adaPdfExportPlugin(): Plugin {
  const pdfHandler = createPdfExportMiddleware();
  const docxPdfHandler = createDocxPdfExportMiddleware();
  return {
    name: 'ada-pdf-export',
    configureServer(server) {
      server.middlewares.use('/api/export/pdf', (req, res, next) => {
        void pdfHandler(req, res, next);
      });
      server.middlewares.use('/api/export/pdf-from-docx', (req, res, next) => {
        void docxPdfHandler(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/export/pdf', (req, res, next) => {
        void pdfHandler(req, res, next);
      });
      server.middlewares.use('/api/export/pdf-from-docx', (req, res, next) => {
        void docxPdfHandler(req, res, next);
      });
    },
  };
}
