declare module "better-sqlite3" {
  const Database: any;
  export default Database;
}

declare module "pg" {
  export const Client: any;
  export const Pool: any;
}
