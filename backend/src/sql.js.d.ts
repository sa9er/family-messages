declare module 'sql.js' {
  interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  interface QueryResults {
    columns: string[];
    values: any[][];
  }

  class Database {
    constructor(data?: Buffer | null);
    run(sql: string, params?: any[]): void;
    exec(sql: string): QueryResults[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  class Statement {
    bind(values: any[]): boolean;
    step(): boolean;
    getAsObject(params?: any[]): any;
    free(): boolean;
  }

  interface SQL {
    Database: typeof Database;
  }

  function initSqlJs(config?: SqlJsConfig): Promise<SQL>;
  export default initSqlJs;
}
