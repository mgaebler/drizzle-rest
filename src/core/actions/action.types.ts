
export enum ActionTypeEnum {
    GET_MANY = 'GET_MANY',
    GET_ONE = 'GET_ONE',
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    REPLACE = 'REPLACE',
    DELETE = 'DELETE'
}

export interface ActionOptions {
    actionType: ActionTypeEnum;
    includeId?: boolean;
    statusCode?: number;
}

