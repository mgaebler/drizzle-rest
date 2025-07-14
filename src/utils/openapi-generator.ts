import { ColumnMetadata, TableMetadata } from './schema-inspector';

export interface OpenAPIInfo {
    title?: string;
    version?: string;
    description?: string;
}

export interface OpenAPIObject {
    openapi: string;
    info: {
        title: string;
        version: string;
        description?: string;
    };
    servers?: {
        url: string;
        description?: string;
    }[];
    paths: PathsObject;
    components: {
        schemas: SchemasObject;
    };
}

export interface PathsObject {
    [path: string]: PathItemObject;
}

export interface PathItemObject {
    get?: OperationObject;
    post?: OperationObject;
    patch?: OperationObject;
    put?: OperationObject;
    delete?: OperationObject;
}

export interface OperationObject {
    summary: string;
    description?: string;
    parameters?: ParameterObject[];
    requestBody?: RequestBodyObject;
    responses: ResponsesObject;
    tags?: string[];
}

export interface ParameterObject {
    name: string;
    in: 'query' | 'path' | 'header';
    description?: string;
    required?: boolean;
    schema: SchemaObject;
    example?: any;
}

export interface RequestBodyObject {
    description?: string;
    content: {
        'application/json': {
            schema: SchemaObject;
        };
    };
    required?: boolean;
}

export interface ResponsesObject {
    [statusCode: string]: ResponseObject;
}

export interface ResponseObject {
    description: string;
    content?: {
        'application/json': {
            schema: SchemaObject;
        };
    };
}

export interface SchemasObject {
    [name: string]: SchemaObject;
}

export interface SchemaObject {
    type?: string;
    format?: string;
    properties?: { [name: string]: SchemaObject };
    items?: SchemaObject;
    required?: string[];
    nullable?: boolean;
    description?: string;
    example?: any;
    $ref?: string;
    minimum?: number;
    maximum?: number;
}

export class OpenAPIGenerator {
    constructor(
        private tablesMetadata: Map<string, TableMetadata>,
        private disabledEndpoints: Map<string, string[]> = new Map()
    ) { }

    generateSpec(info?: OpenAPIInfo, serverUrl?: string): OpenAPIObject {
        const tables = Array.from(this.tablesMetadata.values());

        const spec: OpenAPIObject = {
            openapi: '3.0.0',
            info: {
                title: info?.title || 'REST API',
                version: info?.version || '1.0.0',
                description: info?.description || 'Auto-generated REST API from Drizzle schema'
            },
            paths: this.generatePaths(tables),
            components: {
                schemas: this.generateSchemas(tables)
            }
        };

        if (serverUrl) {
            spec.servers = [{
                url: serverUrl,
                description: 'API Server'
            }];
        }

        return spec;
    }

    private generatePaths(tables: TableMetadata[]): PathsObject {
        const paths: PathsObject = {};

        for (const table of tables) {
            const tableName = table.name;
            const resourcePath = `/${tableName}`;
            const itemPath = `/${tableName}/{id}`;
            const disabledForTable = this.disabledEndpoints.get(tableName) || [];

            // Collection endpoints: GET /table, POST /table
            if (!disabledForTable.includes('GET_MANY')) {
                paths[resourcePath] = {
                    ...paths[resourcePath],
                    get: this.generateGetManyOperation(table)
                };
            }

            if (!disabledForTable.includes('CREATE')) {
                paths[resourcePath] = {
                    ...paths[resourcePath],
                    post: this.generateCreateOperation(table)
                };
            }

            // Item endpoints: GET /table/{id}, PATCH /table/{id}, PUT /table/{id}, DELETE /table/{id}
            if (!disabledForTable.includes('GET_ONE')) {
                paths[itemPath] = {
                    ...paths[itemPath],
                    get: this.generateGetOneOperation(table)
                };
            }

            if (!disabledForTable.includes('UPDATE')) {
                paths[itemPath] = {
                    ...paths[itemPath],
                    patch: this.generateUpdateOperation(table)
                };
            }

            if (!disabledForTable.includes('REPLACE')) {
                paths[itemPath] = {
                    ...paths[itemPath],
                    put: this.generateReplaceOperation(table)
                };
            }

            if (!disabledForTable.includes('DELETE')) {
                paths[itemPath] = {
                    ...paths[itemPath],
                    delete: this.generateDeleteOperation(table)
                };
            }
        }

        return paths;
    }

    private generateGetManyOperation(table: TableMetadata): OperationObject {
        const parameters: ParameterObject[] = [
            // Pagination parameters
            {
                name: '_page',
                in: 'query',
                description: 'Page number for pagination',
                schema: { type: 'integer', minimum: 1 },
                example: 1
            },
            {
                name: '_per_page',
                in: 'query',
                description: 'Number of items per page',
                schema: { type: 'integer', minimum: 1, maximum: 100 },
                example: 10
            },
            {
                name: '_start',
                in: 'query',
                description: 'Start index for range-based pagination',
                schema: { type: 'integer', minimum: 0 }
            },
            {
                name: '_end',
                in: 'query',
                description: 'End index for range-based pagination',
                schema: { type: 'integer', minimum: 0 }
            },
            {
                name: '_limit',
                in: 'query',
                description: 'Limit for range-based pagination',
                schema: { type: 'integer', minimum: 1 }
            },
            // Sorting parameter
            {
                name: '_sort',
                in: 'query',
                description: 'Sort fields (comma-separated, prefix with - for desc)',
                schema: { type: 'string' },
                example: `${table.columns[0]?.name || 'id'},-createdAt`
            }
        ];

        // Add embed parameter if there are relations
        if (table.relations.length > 0) {
            const embedOptions = table.relations.map(rel =>
                rel.type === 'belongs_to'
                    ? rel.foreignKey.replace(/Id$/, '').toLowerCase()
                    : rel.relatedTable
            );

            parameters.push({
                name: '_embed',
                in: 'query',
                description: 'Embed related resources',
                schema: {
                    type: 'string',
                    description: `Available options: ${embedOptions.join(', ')}`
                },
                example: embedOptions[0]
            });
        }

        // Add filter parameters for each column
        for (const column of table.columns) {
            if (column.isPrimaryKey) continue; // Skip primary key filters for getMany

            // Direct equality filter
            parameters.push({
                name: column.name,
                in: 'query',
                description: `Filter by ${column.name}`,
                schema: this.getSchemaForColumn(column)
            });

            // String-specific filters
            if (this.isStringColumn(column)) {
                parameters.push({
                    name: `${column.name}_like`,
                    in: 'query',
                    description: `Substring search in ${column.name}`,
                    schema: { type: 'string' }
                });
            }

            // Numeric/Date filters
            if (this.isNumericOrDateColumn(column)) {
                parameters.push({
                    name: `${column.name}_gte`,
                    in: 'query',
                    description: `${column.name} greater than or equal to`,
                    schema: this.getSchemaForColumn(column)
                });

                parameters.push({
                    name: `${column.name}_lte`,
                    in: 'query',
                    description: `${column.name} less than or equal to`,
                    schema: this.getSchemaForColumn(column)
                });
            }

            // Negation filter
            parameters.push({
                name: `${column.name}_ne`,
                in: 'query',
                description: `${column.name} not equal to`,
                schema: this.getSchemaForColumn(column)
            });
        }

        return {
            summary: `List ${table.name}`,
            description: `Retrieve a list of ${table.name} with optional filtering, sorting, and pagination`,
            parameters,
            responses: {
                '200': {
                    description: `List of ${table.name}`,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'array',
                                items: { $ref: `#/components/schemas/${this.capitalizeFirst(table.name)}` }
                            }
                        }
                    }
                },
                '400': this.generateErrorResponse('Bad Request - Invalid query parameters'),
                '500': this.generateErrorResponse('Internal Server Error')
            },
            tags: [table.name]
        };
    }

    private generateCreateOperation(table: TableMetadata): OperationObject {
        return {
            summary: `Create ${table.name.slice(0, -1)}`, // Remove 's' for singular
            description: `Create a new ${table.name.slice(0, -1)}`,
            requestBody: {
                description: `${this.capitalizeFirst(table.name.slice(0, -1))} data`,
                content: {
                    'application/json': {
                        schema: { $ref: `#/components/schemas/${this.capitalizeFirst(table.name)}Create` }
                    }
                },
                required: true
            },
            responses: {
                '201': {
                    description: `Created ${table.name.slice(0, -1)}`,
                    content: {
                        'application/json': {
                            schema: { $ref: `#/components/schemas/${this.capitalizeFirst(table.name)}` }
                        }
                    }
                },
                '400': this.generateErrorResponse('Bad Request - Validation failed'),
                '500': this.generateErrorResponse('Internal Server Error')
            },
            tags: [table.name]
        };
    }

    private generateGetOneOperation(table: TableMetadata): OperationObject {
        const primaryKey = table.primaryKey[0] || 'id';

        return {
            summary: `Get ${table.name.slice(0, -1)} by ID`,
            description: `Retrieve a specific ${table.name.slice(0, -1)} by its ID`,
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    description: `${this.capitalizeFirst(table.name.slice(0, -1))} ID`,
                    required: true,
                    schema: this.getSchemaForColumn(
                        table.columns.find(col => col.name === primaryKey) || { type: 'integer' } as ColumnMetadata
                    )
                }
            ],
            responses: {
                '200': {
                    description: `${this.capitalizeFirst(table.name.slice(0, -1))} details`,
                    content: {
                        'application/json': {
                            schema: { $ref: `#/components/schemas/${this.capitalizeFirst(table.name)}` }
                        }
                    }
                },
                '404': this.generateErrorResponse('Not Found'),
                '500': this.generateErrorResponse('Internal Server Error')
            },
            tags: [table.name]
        };
    }

    private generateUpdateOperation(table: TableMetadata): OperationObject {
        const primaryKey = table.primaryKey[0] || 'id';

        return {
            summary: `Update ${table.name.slice(0, -1)}`,
            description: `Partially update a ${table.name.slice(0, -1)}`,
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    description: `${this.capitalizeFirst(table.name.slice(0, -1))} ID`,
                    required: true,
                    schema: this.getSchemaForColumn(
                        table.columns.find(col => col.name === primaryKey) || { type: 'integer' } as ColumnMetadata
                    )
                }
            ],
            requestBody: {
                description: `Partial ${table.name.slice(0, -1)} data`,
                content: {
                    'application/json': {
                        schema: { $ref: `#/components/schemas/${this.capitalizeFirst(table.name)}Update` }
                    }
                },
                required: true
            },
            responses: {
                '200': {
                    description: `Updated ${table.name.slice(0, -1)}`,
                    content: {
                        'application/json': {
                            schema: { $ref: `#/components/schemas/${this.capitalizeFirst(table.name)}` }
                        }
                    }
                },
                '400': this.generateErrorResponse('Bad Request - Validation failed'),
                '404': this.generateErrorResponse('Not Found'),
                '500': this.generateErrorResponse('Internal Server Error')
            },
            tags: [table.name]
        };
    }

    private generateReplaceOperation(table: TableMetadata): OperationObject {
        const primaryKey = table.primaryKey[0] || 'id';

        return {
            summary: `Replace ${table.name.slice(0, -1)}`,
            description: `Completely replace a ${table.name.slice(0, -1)}`,
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    description: `${this.capitalizeFirst(table.name.slice(0, -1))} ID`,
                    required: true,
                    schema: this.getSchemaForColumn(
                        table.columns.find(col => col.name === primaryKey) || { type: 'integer' } as ColumnMetadata
                    )
                }
            ],
            requestBody: {
                description: `Complete ${table.name.slice(0, -1)} data`,
                content: {
                    'application/json': {
                        schema: { $ref: `#/components/schemas/${this.capitalizeFirst(table.name)}Create` }
                    }
                },
                required: true
            },
            responses: {
                '200': {
                    description: `Replaced ${table.name.slice(0, -1)}`,
                    content: {
                        'application/json': {
                            schema: { $ref: `#/components/schemas/${this.capitalizeFirst(table.name)}` }
                        }
                    }
                },
                '400': this.generateErrorResponse('Bad Request - Validation failed'),
                '404': this.generateErrorResponse('Not Found'),
                '500': this.generateErrorResponse('Internal Server Error')
            },
            tags: [table.name]
        };
    }

    private generateDeleteOperation(table: TableMetadata): OperationObject {
        const primaryKey = table.primaryKey[0] || 'id';

        return {
            summary: `Delete ${table.name.slice(0, -1)}`,
            description: `Delete a ${table.name.slice(0, -1)}`,
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    description: `${this.capitalizeFirst(table.name.slice(0, -1))} ID`,
                    required: true,
                    schema: this.getSchemaForColumn(
                        table.columns.find(col => col.name === primaryKey) || { type: 'integer' } as ColumnMetadata
                    )
                }
            ],
            responses: {
                '204': {
                    description: `${this.capitalizeFirst(table.name.slice(0, -1))} deleted successfully`
                },
                '404': this.generateErrorResponse('Not Found'),
                '500': this.generateErrorResponse('Internal Server Error')
            },
            tags: [table.name]
        };
    }

    private generateSchemas(tables: TableMetadata[]): SchemasObject {
        const schemas: SchemasObject = {};

        for (const table of tables) {
            const schemaName = this.capitalizeFirst(table.name);

            // Main entity schema (for responses)
            schemas[schemaName] = this.generateTableSchema(table, false);

            // Create schema (without auto-generated fields like id, createdAt)
            schemas[`${schemaName}Create`] = this.generateTableSchema(table, true);

            // Update schema (all fields optional)
            schemas[`${schemaName}Update`] = {
                ...this.generateTableSchema(table, true),
                required: [] // All fields optional for updates
            };
        }

        // Add error schema
        schemas.Error = {
            type: 'object',
            properties: {
                error: { type: 'string', description: 'Error message' },
                message: { type: 'string', description: 'Detailed error message' },
                details: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            field: { type: 'string' },
                            message: { type: 'string' }
                        }
                    },
                    description: 'Validation error details'
                }
            },
            required: ['error']
        };

        return schemas;
    }

    private generateTableSchema(table: TableMetadata, isCreateSchema: boolean): SchemaObject {
        const properties: { [name: string]: SchemaObject } = {};
        const required: string[] = [];

        for (const column of table.columns) {
            // Skip auto-generated fields in create schemas
            if (isCreateSchema && this.isAutoGeneratedField(column)) {
                continue;
            }

            properties[column.name] = this.getSchemaForColumn(column);

            // Add to required if not nullable and not auto-generated
            if (!column.nullable && !this.isAutoGeneratedField(column)) {
                required.push(column.name);
            }
        }

        return {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined,
            description: `${this.capitalizeFirst(table.name.slice(0, -1))} object`
        };
    }

    private getSchemaForColumn(column: ColumnMetadata): SchemaObject {
        const schema: SchemaObject = {};

        // Map SQL types to OpenAPI types
        const sqlType = column.type.toLowerCase();

        if (sqlType.includes('int') || sqlType.includes('serial')) {
            schema.type = 'integer';
            if (sqlType.includes('bigint')) {
                schema.format = 'int64';
            } else {
                schema.format = 'int32';
            }
        } else if (sqlType.includes('float') || sqlType.includes('double') || sqlType.includes('decimal') || sqlType.includes('numeric')) {
            schema.type = 'number';
            if (sqlType.includes('float')) {
                schema.format = 'float';
            } else {
                schema.format = 'double';
            }
        } else if (sqlType.includes('bool')) {
            schema.type = 'boolean';
        } else if (sqlType.includes('timestamp') || sqlType.includes('datetime')) {
            schema.type = 'string';
            schema.format = 'date-time';
        } else if (sqlType.includes('date')) {
            schema.type = 'string';
            schema.format = 'date';
        } else if (sqlType.includes('time')) {
            schema.type = 'string';
            schema.format = 'time';
        } else if (sqlType.includes('json')) {
            schema.type = 'object';
        } else {
            // Default to string for text, varchar, char, etc.
            schema.type = 'string';
        }

        // Handle nullable
        if (column.nullable) {
            schema.nullable = true;
        }

        // Add description for foreign keys
        if (column.references) {
            schema.description = `Foreign key reference to ${column.references.table}.${column.references.column}`;
        }

        return schema;
    }

    private isAutoGeneratedField(column: ColumnMetadata): boolean {
        const name = column.name.toLowerCase();
        const type = column.type.toLowerCase();

        // Serial/auto-increment primary keys
        if (column.isPrimaryKey && type.includes('serial')) {
            return true;
        }

        // Common auto-generated timestamp fields
        if (name.includes('createdat') || name.includes('updatedat') || name.includes('created_at') || name.includes('updated_at')) {
            return true;
        }

        return false;
    }

    private isStringColumn(column: ColumnMetadata): boolean {
        const type = column.type.toLowerCase();
        return type.includes('text') || type.includes('varchar') || type.includes('char');
    }

    private isNumericOrDateColumn(column: ColumnMetadata): boolean {
        const type = column.type.toLowerCase();
        return type.includes('int') || type.includes('float') || type.includes('double') ||
            type.includes('decimal') || type.includes('numeric') || type.includes('date') ||
            type.includes('timestamp');
    }

    private generateErrorResponse(description: string): ResponseObject {
        return {
            description,
            content: {
                'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                }
            }
        };
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
