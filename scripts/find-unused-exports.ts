#!/usr/bin/env tsx

import * as fs from 'node:fs';
import * as path from 'node:path';

interface UnusedExport {
    file: string;
    export: string;
    line?: number;
}

class UnusedExportsFinder {
    private srcDir = path.join(process.cwd(), 'src');
    private excludeDirs = ['node_modules', 'dist', 'build', '.git'];
    private excludeFiles = ['.test.', '.spec.', '.d.ts', 'index.ts'];

    async findUnusedExports(): Promise<UnusedExport[]> {
        console.log('🔍 Searching for unused exports...\n');

        // Get all TypeScript files
        const allFiles = this.getAllTsFiles(this.srcDir);

        // Extract all exports from each file
        const exports = this.extractExports(allFiles);

        // Find which exports are not imported anywhere
        const unusedExports = this.findUnused(exports, allFiles);

        return unusedExports;
    }

    private getAllTsFiles(dir: string): string[] {
        const files: string[] = [];

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory() && !this.excludeDirs.includes(entry.name)) {
                files.push(...this.getAllTsFiles(fullPath));
            } else if (
                entry.isFile() &&
                (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
                !this.excludeFiles.some((exclude) => entry.name.includes(exclude))
            ) {
                files.push(fullPath);
            }
        }

        return files;
    }

    private extractExports(files: string[]): Map<string, { file: string; line: number }[]> {
        const exports = new Map<string, { file: string; line: number }[]>();

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                // Match various export patterns
                const exportPatterns = [
                    /^export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/,
                    /^export\s+\{\s*([^}]+)\s*\}/,
                    /^export\s+default\s+(?:class|function|interface)?\s*(\w+)?/,
                    /^export\s*\*\s+as\s+(\w+)/,
                ];

                for (const pattern of exportPatterns) {
                    const match = line.trim().match(pattern);
                    if (match) {
                        if (match[1]) {
                            // Handle destructured exports like { foo, bar }
                            if (match[1].includes(',')) {
                                const names = match[1].split(',').map((n) => n.trim());
                                names.forEach((name) => {
                                    const cleanName = name.replace(/\s+as\s+\w+/, '').trim();
                                    if (cleanName && cleanName !== 'default') {
                                        if (!exports.has(cleanName)) {
                                            exports.set(cleanName, []);
                                        }
                                        exports.get(cleanName)?.push({ file, line: index + 1 });
                                    }
                                });
                            } else {
                                const cleanName = match[1].trim();
                                if (cleanName && cleanName !== 'default') {
                                    if (!exports.has(cleanName)) {
                                        exports.set(cleanName, []);
                                    }
                                    exports.get(cleanName)?.push({ file, line: index + 1 });
                                }
                            }
                        }
                    }
                }
            });
        }

        return exports;
    }

    private findUnused(exports: Map<string, { file: string; line: number }[]>, allFiles: string[]): UnusedExport[] {
        const unusedExports: UnusedExport[] = [];

        for (const [exportName, locations] of exports.entries()) {
            let isUsed = false;

            // Check if this export is imported in any file
            for (const file of allFiles) {
                const content = fs.readFileSync(file, 'utf-8');

                // Skip the file where it's exported
                const exportFiles = locations.map((loc) => loc.file);
                if (exportFiles.includes(file)) {
                    continue;
                }

                // Check various import patterns
                const importPatterns = [
                    new RegExp(`import\\s+.*\\b${exportName}\\b.*from`),
                    new RegExp(`import\\s*\\{[^}]*\\b${exportName}\\b[^}]*\\}`),
                    new RegExp(`\\b${exportName}\\b`), // Any usage of the export name
                ];

                for (const pattern of importPatterns) {
                    if (pattern.test(content)) {
                        isUsed = true;
                        break;
                    }
                }

                if (isUsed) break;
            }

            if (!isUsed) {
                for (const location of locations) {
                    unusedExports.push({
                        file: path.relative(process.cwd(), location.file),
                        export: exportName,
                        line: location.line,
                    });
                }
            }
        }

        return unusedExports;
    }
}

async function main() {
    try {
        const finder = new UnusedExportsFinder();
        const unusedExports = await finder.findUnusedExports();

        if (unusedExports.length === 0) {
            console.log('✅ No unused exports found!');
        } else {
            console.log(`❌ Found ${unusedExports.length} unused exports:\n`);

            // Group by file
            const byFile = new Map<string, UnusedExport[]>();
            for (const unusedExport of unusedExports) {
                if (!byFile.has(unusedExport.file)) {
                    byFile.set(unusedExport.file, []);
                }
                byFile.get(unusedExport.file)?.push(unusedExport);
            }

            for (const [file, exports] of byFile.entries()) {
                console.log(`📁 ${file}:`);
                for (const exp of exports) {
                    console.log(`  • ${exp.export} (line ${exp.line})`);
                }
                console.log('');
            }
        }
    } catch (error) {
        console.error('Error finding unused exports:', error);
        process.exit(1);
    }
}

// Run the script
main();
