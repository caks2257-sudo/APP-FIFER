import 'server-only';

import fs from 'fs';
import path from 'path';

const IGNORED_NAMES = new Set(['node_modules', '.git', '.next', 'dist', '.env']);
const SOURCE_ROOT = path.join(process.cwd(), 'src');
const PROJECT_ROOT = process.cwd();
const XRAY_PREFIX = '_xray_';

/** Prefijo para fragmentos que incluyen bloques <file_content> (código / fuentes). */
const LLM_INSTRUCTION_HEADER =
  '> INSTRUCCIÓN PARA LA IA: Este documento contiene el código fuente REAL. El código está delimitado ESTRICTAMENTE por las etiquetas <file_content> y </file_content>. Debes leer el interior de estas etiquetas para realizar tu auditoría.\n\n';

function formatFileForLLM(filePath: string, content: string): string {
  const safeContent = content.trim() ? content : '// ARCHIVO VACÍO O NO ACCESIBLE';
  return `
================================================================================
[FILE_PATH: ${filePath}]
================================================================================
<file_content>
${safeContent}
</file_content>
`;
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function shouldIgnorePath(filePath: string): boolean {
  const normalized = normalizePath(filePath).toLowerCase();
  return Array.from(IGNORED_NAMES).some((name) => normalized.includes(`/${name.toLowerCase()}`));
}

async function walkDirectoryRecursive(dirPath: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (IGNORED_NAMES.has(entry.name) || shouldIgnorePath(fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      const nested = await walkDirectoryRecursive(fullPath);
      files.push(...nested);
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function isXrayFile(filePath: string): boolean {
  return path.basename(filePath).toLowerCase().startsWith(XRAY_PREFIX);
}

/**
 * Genera archivos modulares de snapshot para ingesta (hiper-fragmentación Ley §37).
 */
export async function generateCodeSnapshot(options: {
  code: boolean;
  xrays: boolean;
  audit: boolean;
}): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  if (options.code) {
    const discoveredFiles = await walkDirectoryRecursive(SOURCE_ROOT);
    const groupedChunks = new Map<string, string[]>();

    for (const absoluteFilePath of discoveredFiles.sort((a, b) => a.localeCompare(b))) {
      const relativePath = normalizePath(path.relative(PROJECT_ROOT, absoluteFilePath));
      if (shouldIgnorePath(relativePath) || isXrayFile(relativePath) || relativePath.includes('/_blueprints/')) {
        continue;
      }

      const parts = relativePath.split('/');
      let groupName = 'root';
      if (parts[0] === 'src' && parts.length > 2) {
        groupName = parts[1];
        if (groupName === 'app' && parts[2] === 'api') {
          groupName = 'api_routes';
        }
      }

      const fileContent = await fs.promises.readFile(absoluteFilePath, 'utf8');
      const fileBlock = formatFileForLLM(relativePath, fileContent);

      if (!groupedChunks.has(groupName)) groupedChunks.set(groupName, []);
      groupedChunks.get(groupName)!.push(fileBlock);
    }

    for (const [groupName, blocks] of groupedChunks.entries()) {
      const chunkTitle = `# CÓDIGO FUENTE: src/${groupName.toUpperCase()}\n\n`;
      const fileKey = `03_CODE_${groupName.toUpperCase()}.md`;
      results[fileKey] = LLM_INSTRUCTION_HEADER + chunkTitle + blocks.join('\n\n');
    }
  }

  if (options.xrays) {
    const discoveredFiles = await walkDirectoryRecursive(PROJECT_ROOT);
    const xrayFiles = discoveredFiles
      .filter((filePath) => isXrayFile(filePath))
      .sort((a, b) => a.localeCompare(b));

    const blocks: string[] = [];
    for (const absoluteFilePath of xrayFiles) {
      const relativePath = normalizePath(path.relative(PROJECT_ROOT, absoluteFilePath));
      const fileContent = await fs.promises.readFile(absoluteFilePath, 'utf8');
      blocks.push(formatFileForLLM(relativePath, fileContent));
    }

    const body =
      blocks.length > 0
        ? blocks.join('\n\n')
        : formatFileForLLM('(sin archivos _xray_)', '// Sin archivos _xray_ en el repositorio');
    results['02_ARCHITECTURE_XRAYS.md'] = LLM_INSTRUCTION_HEADER + `# ARQUITECTURA X-RAYS\n\n${body}`;
  }

  if (options.audit) {
    let auditReport = '# REPORTE DE EXTRACCIÓN DE AUDITORÍA\n\n';
    auditReport += `**Directorio Raíz Detectado:** \`${PROJECT_ROOT}\`\n\n`;

    const auditFiles = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'next.config.mjs',
      'tailwind.config.ts',
      '.env.example',
      'prisma/schema.prisma',
      'database_security.sql',
      '.cursorrules',
      'docs/registry/LOCATION_MAP.json',
      'docs/blueprints/AUTO_HEALING_COMPLIANCE.md',
      'FIFER — AI ORCHESTRATION SUB-APP MASTER DOCUMENT.txt',
    ];

    auditReport += '## Archivos Raíz\n';
    const auditRootBlocks: string[] = [];

    for (const fileRelPath of auditFiles) {
      try {
        const absolutePath = path.join(PROJECT_ROOT, fileRelPath);
        if (fs.existsSync(absolutePath)) {
          auditRootBlocks.push(formatFileForLLM(fileRelPath, fs.readFileSync(absolutePath, 'utf8')));
          auditReport += `- ✅ **ENCONTRADO:** \`${fileRelPath}\`\n`;
        } else {
          auditReport += `- ❌ **FALTANTE:** \`${fileRelPath}\` (Buscado en: \`${absolutePath}\`)\n`;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        auditReport += `- ⚠️ **ERROR:** \`${fileRelPath}\` (${message})\n`;
        console.error(`[Ingest Audit] Error leyendo ${fileRelPath}:`, error);
      }
    }

    auditReport += '\n## Infraestructura (CI/CD)\n';
    const infraFolders = ['.github/workflows'];
    for (const folder of infraFolders) {
      const folderPath = path.join(PROJECT_ROOT, folder);
      try {
        if (fs.existsSync(folderPath)) {
          auditReport += `- ✅ **CARPETA ENCONTRADA:** \`${folder}\`\n`;
          const wfFiles = fs.readdirSync(folderPath);
          for (const file of wfFiles) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
              const relName = `${folder}/${file}`;
              auditRootBlocks.push(formatFileForLLM(relName, fs.readFileSync(filePath, 'utf8')));
              auditReport += `  - ✅ **ARCHIVO:** \`${relName}\`\n`;
            }
          }
          if (wfFiles.length === 0) {
            auditReport += `  - *(carpeta vacía)*\n`;
          }
        } else {
          auditReport += `- ❌ **CARPETA FALTANTE:** \`${folder}\`\n`;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        auditReport += `- ⚠️ **ERROR escaneando \`${folder}\`:** ${message}\n`;
        console.error(`[Ingest Audit] Error escaneando ${folder}:`, error);
      }
    }

    /* Informe de diagnóstico: solo Markdown, sin <file_content> (Ley §37). */
    results['00_DIAGNOSTICO.md'] = auditReport.trim() ? auditReport : '# Reporte vacío\n';

    const auditBody =
      auditRootBlocks.length > 0
        ? auditRootBlocks.join('\n\n')
        : formatFileForLLM('(sin archivos de auditoría leídos)', '// Ningún archivo de auditoría pudo leerse');
    results['01_AUDIT_ROOT.md'] = LLM_INSTRUCTION_HEADER + `# AUDITORÍA RAÍZ (configuración y gobernanza)\n\n${auditBody}`;
  }

  return results;
}
