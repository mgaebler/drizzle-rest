import { Router } from 'express';

import { Logger } from './logger';
import { OpenAPIObject } from './openapi-generator';
import { TableMetadata } from './schema-inspector';

export interface APIExplorerOptions {
    /** Enable Swagger UI for interactive documentation */
    ui?: {
        enabled?: boolean;
        path?: string;
        title?: string;
        customCss?: string;
    };
    /** Enable API discovery endpoint */
    discovery?: {
        enabled?: boolean;
        path?: string;
    };
}

export class APIExplorer {
    constructor(
        private tablesMetadata: Map<string, TableMetadata>,
        private disabledEndpoints: Map<string, string[]>,
        private logger: Logger
    ) { }

    setupRoutes(router: Router, openApiSpec: OpenAPIObject, options: APIExplorerOptions): void {
        // Set up Swagger UI if enabled
        if (options.ui?.enabled) {
            this.setupSwaggerUI(router, openApiSpec, options.ui);
        }

        // Set up API discovery endpoint if enabled
        if (options.discovery?.enabled) {
            this.setupDiscoveryEndpoint(router, openApiSpec, options.discovery);
        }
    }

    private setupSwaggerUI(router: Router, openApiSpec: OpenAPIObject, uiOptions: NonNullable<APIExplorerOptions['ui']>): void {
        const swaggerUiPath = uiOptions.path || '/api-docs';
        const swaggerUiTitle = uiOptions.title || 'API Documentation';
        const customCss = uiOptions.customCss || '';

        // Serve Swagger UI HTML
        router.get(swaggerUiPath, (req, res) => {
            this.logger.debug({ requestId: (req as any).requestId }, 'Serving Swagger UI');

            const swaggerHtml = `<!DOCTYPE html>
<html>
<head>
    <title>${swaggerUiTitle}</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        body { margin: 0; }
        .swagger-ui .topbar { display: none; }
        ${customCss}
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: '${req.baseUrl}/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "BaseLayout",
            tryItOutEnabled: true,
            supportedSubmitMethods: ['get', 'post', 'put', 'patch', 'delete'],
            validatorUrl: null,
            requestInterceptor: (request) => {
                // Add any custom headers or authentication here if needed
                return request;
            }
        });
    </script>
</body>
</html>`;

            res.set('Content-Type', 'text/html');
            res.send(swaggerHtml);
        });

        this.logger.info(`Swagger UI available at ${swaggerUiPath}`);
    }

    private setupDiscoveryEndpoint(router: Router, openApiSpec: OpenAPIObject, discoveryOptions: NonNullable<APIExplorerOptions['discovery']>): void {
        const discoveryPath = discoveryOptions.path || '/discovery';

        router.get(discoveryPath, (req, res) => {
            this.logger.debug({ requestId: (req as any).requestId }, 'Serving API discovery');

            const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
            const discovery = this.generateDiscoveryResponse(openApiSpec, baseUrl);

            res.json(discovery);
        });

        this.logger.info(`API discovery available at ${discoveryPath}`);
    }

    private generateDiscoveryResponse(openApiSpec: OpenAPIObject, baseUrl: string) {
        return {
            api: {
                title: openApiSpec.info.title,
                version: openApiSpec.info.version,
                description: openApiSpec.info.description,
                baseUrl,
                openapi: `${baseUrl}/openapi.json`,
                documentation: `${baseUrl}/api-docs`
            },
            resources: Array.from(this.tablesMetadata.keys()).reduce((acc, tableName) => {
                const table = this.tablesMetadata.get(tableName)!;
                const disabledEndpoints = this.disabledEndpoints.get(tableName) || [];

                acc[tableName] = {
                    name: tableName,
                    baseUrl: `${baseUrl}/${tableName}`,
                    endpoints: this.generateEndpointsInfo(tableName, baseUrl, disabledEndpoints),
                    schema: {
                        columns: table.columns.map(col => ({
                            name: col.name,
                            type: col.type,
                            nullable: col.nullable,
                            isPrimaryKey: col.isPrimaryKey
                        })),
                        relations: table.relations.map(rel => ({
                            type: rel.type,
                            relatedTable: rel.relatedTable,
                            foreignKey: rel.foreignKey
                        }))
                    },
                    examples: this.generateExamples(table, baseUrl, tableName)
                };
                return acc;
            }, {} as Record<string, any>),
            features: this.generateFeaturesInfo()
        };
    }

    private generateEndpointsInfo(tableName: string, baseUrl: string, disabledEndpoints: string[]) {
        const endpoints: Record<string, any> = {};

        if (!disabledEndpoints.includes('GET_MANY')) {
            endpoints.list = {
                method: 'GET',
                url: `${baseUrl}/${tableName}`,
                description: `List all ${tableName}`,
                features: ['filtering', 'sorting', 'pagination', 'embedding']
            };
        }

        if (!disabledEndpoints.includes('CREATE')) {
            endpoints.create = {
                method: 'POST',
                url: `${baseUrl}/${tableName}`,
                description: `Create a new ${tableName.slice(0, -1)}`
            };
        }

        if (!disabledEndpoints.includes('GET_ONE')) {
            endpoints.get = {
                method: 'GET',
                url: `${baseUrl}/${tableName}/{id}`,
                description: `Get a specific ${tableName.slice(0, -1)} by ID`,
                features: ['embedding']
            };
        }

        if (!disabledEndpoints.includes('UPDATE')) {
            endpoints.update = {
                method: 'PATCH',
                url: `${baseUrl}/${tableName}/{id}`,
                description: `Update a ${tableName.slice(0, -1)} partially`
            };
        }

        if (!disabledEndpoints.includes('REPLACE')) {
            endpoints.replace = {
                method: 'PUT',
                url: `${baseUrl}/${tableName}/{id}`,
                description: `Replace a ${tableName.slice(0, -1)} completely`
            };
        }

        if (!disabledEndpoints.includes('DELETE')) {
            endpoints.delete = {
                method: 'DELETE',
                url: `${baseUrl}/${tableName}/{id}`,
                description: `Delete a ${tableName.slice(0, -1)}`
            };
        }

        return endpoints;
    }

    private generateExamples(table: TableMetadata, baseUrl: string, tableName: string) {
        const examples: Record<string, string> = {
            list: `${baseUrl}/${tableName}?_page=1&_per_page=10&_sort=${table.columns[0]?.name || 'id'}`
        };

        // Add embed example if there are relations
        if (table.relations.length > 0) {
            const embedTarget = table.relations[0]?.type === 'belongs_to'
                ? table.relations[0]?.foreignKey.replace(/Id$/, '').toLowerCase()
                : table.relations[0]?.relatedTable;

            examples.listWithEmbeds = `${baseUrl}/${tableName}?_embed=${embedTarget}`;
        }

        // Add search example if there are text columns
        const textColumn = table.columns.find(col =>
            col.type.toLowerCase().includes('text') ||
            col.type.toLowerCase().includes('varchar')
        );

        if (textColumn) {
            examples.search = `${baseUrl}/${tableName}?${textColumn.name}_like=search_term`;
        }

        return examples;
    }

    private generateFeaturesInfo() {
        return {
            filtering: {
                description: 'Filter results using query parameters',
                operators: ['eq (default)', 'ne', 'like (strings)', 'gte (numbers/dates)', 'lte (numbers/dates)'],
                examples: ['?name=John', '?age_gte=18', '?title_like=API']
            },
            sorting: {
                description: 'Sort results using _sort parameter',
                examples: ['?_sort=name', '?_sort=-createdAt', '?_sort=name,-createdAt']
            },
            pagination: {
                description: 'Paginate results using page or range parameters',
                types: {
                    page: 'Use _page and _per_page parameters',
                    range: 'Use _start, _end, or _limit parameters'
                },
                examples: ['?_page=1&_per_page=10', '?_start=0&_end=20', '?_limit=10']
            },
            embedding: {
                description: 'Include related data using _embed parameter',
                examples: ['?_embed=posts', '?_embed=author,comments']
            }
        };
    }
}
