export type Database = {
  public: {
    Tables: {
      [key: string]: any  // This allows any table structure for now
    }
    Views: {
      [key: string]: any
    }
    Functions: {
      [key: string]: any
    }
    Enums: {
      [key: string]: any
    }
  }
}
