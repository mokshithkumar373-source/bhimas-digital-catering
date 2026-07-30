// This file is mock-implemented to use localStorage instead of Supabase.
import type { Database } from "./types";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getInitialData(tableName: string) {
  if (tableName === "business_settings") {
    return [
      {
        id: 1,
        business_name: "Bhimas Catering",
        tagline: "తణుకు",
        phone: "90000 74444",
        address: "",
        gst_number: "",
        footer: "మేము ఇచ్చేవి :- పేపర్ ప్లేట్లు మరియు పేపర్ రోలు మాత్రమే",
        terms: "",
        updated_at: new Date().toISOString()
      }
    ];
  }
  if (tableName === "menu_items") {
    const rawItems = [
      ['Idly','Breakfast',1],['Vada','Breakfast',2],['Puri','Breakfast',3],['Dosa','Breakfast',4],['Upma','Breakfast',5],['Pongal','Breakfast',6],['Poori Curry','Breakfast',7],
      ['White Rice','Rice',1],['Veg Biryani','Rice',2],['Pulihora','Rice',3],['Jeera Rice','Rice',4],['Fried Rice','Rice',5],['Bagara Rice','Rice',6],
      ['Paneer Butter Masala','Curries',1],['Paneer Curry','Curries',2],['Brinjal Curry','Curries',3],['Aloo Curry','Curries',4],['Mixed Veg Curry','Curries',5],['Capsicum Curry','Curries',6],['Mushroom Curry','Curries',7],['Dal Fry','Curries',8],['Sambar','Curries',9],['Rasam','Curries',10],
      ['Rasgulla','Sweets',1],['Gulab Jamun','Sweets',2],['Kaju Sweet','Sweets',3],['Pootharekulu','Sweets',4],['Boondi Laddu','Sweets',5],['Double Ka Meetha','Sweets',6],['Kesari','Sweets',7],['Badusha','Sweets',8],['Mysore Pak','Sweets',9],
      ['Mirchi Bajji','Snacks',1],['Veg Cutlet','Snacks',2],['Pakodi','Snacks',3],['Samosa','Snacks',4],['Punugulu','Snacks',5],
      ['Vanilla Ice Cream','Ice Cream',1],['Chocolate Ice Cream','Ice Cream',2],['Strawberry Ice Cream','Ice Cream',3],['Butterscotch Ice Cream','Ice Cream',4],['Kulfi','Ice Cream',5],
      ['Water Bottle','Drinks',1],['Cool Drinks','Drinks',2],['Badam Milk','Drinks',3],['Tea','Drinks',4],['Coffee','Drinks',5],['Fruit Juice','Drinks',6]
    ];
    return rawItems.map(([name, category, sort_order], i) => ({
      id: `menu-item-${i}`,
      name,
      category,
      sort_order,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }
  return [];
}

type Listener = {
  table: string;
  callback: () => void;
};

const listeners: Listener[] = [];

function triggerRealtime(table: string) {
  listeners.forEach((l) => {
    if (l.table === table) {
      l.callback();
    }
  });
}

class MockChannel {
  private channelName: string;
  private channelListeners: Listener[] = [];

  constructor(name: string) {
    this.channelName = name;
  }

  on(event: string, filter: { event: string; schema: string; table: string }, callback: () => void) {
    this.channelListeners.push({ table: filter.table, callback });
    return this;
  }

  subscribe() {
    this.channelListeners.forEach((l) => listeners.push(l));
    return this;
  }

  unsubscribe() {
    this.channelListeners.forEach((l) => {
      const idx = listeners.indexOf(l);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    });
  }
}

class MockBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderFields: Array<{ column: string; ascending: boolean }> = [];
  private operation: "select" | "insert" | "update" | "delete" = "select";
  private payload: any = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private selectFields = "*";

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields = "*") {
    this.operation = "select";
    this.selectFields = fields;
    return this;
  }

  insert(data: any) {
    this.operation = "insert";
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.operation = "update";
    this.payload = data;
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.orderFields.push({ column, ascending });
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute();
      if (onfulfilled) {
        return onfulfilled(result);
      }
      return result;
    } catch (err) {
      if (onrejected) {
        return onrejected(err);
      }
      throw err;
    }
  }

  private getItems(): any[] {
    if (typeof window === "undefined") return [];
    const key = `bhimas_db_${this.tableName}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = getInitialData(this.tableName);
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  }

  private saveItems(items: any[]) {
    if (typeof window === "undefined") return;
    const key = `bhimas_db_${this.tableName}`;
    localStorage.setItem(key, JSON.stringify(items));
    triggerRealtime(this.tableName);
  }

  private async execute() {
    let items = this.getItems();

    if (this.operation === "select") {
      for (const filter of this.filters) {
        items = items.filter(filter);
      }

      if (this.orderFields.length > 0) {
        items.sort((a, b) => {
          for (const order of this.orderFields) {
            const valA = a[order.column];
            const valB = b[order.column];
            if (valA === valB) continue;
            const factor = order.ascending ? 1 : -1;
            if (valA === null || valA === undefined) return 1 * factor;
            if (valB === null || valB === undefined) return -1 * factor;
            return valA < valB ? -1 * factor : 1 * factor;
          }
          return 0;
        });
      }

      if (this.selectFields !== "*") {
        const fields = this.selectFields.split(",").map((f) => f.trim());
        items = items.map((item) => {
          const res: any = {};
          fields.forEach((f) => {
            res[f] = item[f];
          });
          return res;
        });
      }

      if (this.isSingle) {
        if (items.length === 0) {
          return { data: null, error: { message: "Row not found" } };
        }
        return { data: items[0], error: null };
      }
      if (this.isMaybeSingle) {
        return { data: items.length > 0 ? items[0] : null, error: null };
      }
      return { data: items, error: null };
    }

    if (this.operation === "insert") {
      const dataToInsert = Array.isArray(this.payload) ? this.payload : [this.payload];
      const insertedRows: any[] = [];

      for (const rawRow of dataToInsert) {
        const row = { ...rawRow };
        if (!row.id) {
          row.id = generateUUID();
        }
        row.created_at = new Date().toISOString();
        row.updated_at = new Date().toISOString();

        if (this.tableName === "orders") {
          if (!row.order_number) {
            const maxNum = items.reduce((max: number, o: any) => Math.max(max, o.order_number || 0), 0);
            row.order_number = maxNum + 1;
          }
        }

        items.push(row);
        insertedRows.push(row);
      }

      this.saveItems(items);

      let returned = insertedRows;
      if (this.selectFields !== "*") {
        const fields = this.selectFields.split(",").map((f) => f.trim());
        returned = returned.map((item) => {
          const res: any = {};
          fields.forEach((f) => {
            res[f] = item[f];
          });
          return res;
        });
      }

      const resultData = Array.isArray(this.payload) ? returned : returned[0];
      if (this.isSingle) {
        return { data: returned[0], error: null };
      }
      return { data: resultData, error: null };
    }

    if (this.operation === "update") {
      let singleUpdated: any = null;
      const updatedRows: any[] = [];
      items = items.map((item) => {
        let match = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            match = false;
            break;
          }
        }
        if (match) {
          const updated = { ...item, ...this.payload, updated_at: new Date().toISOString() };
          singleUpdated = updated;
          updatedRows.push(updated);
          return updated;
        }
        return item;
      });

      this.saveItems(items);

      let returned = updatedRows;
      if (this.selectFields !== "*") {
        const fields = this.selectFields.split(",").map((f) => f.trim());
        returned = returned.map((item) => {
          const res: any = {};
          fields.forEach((f) => {
            res[f] = item[f];
          });
          return res;
        });
      }

      if (this.isSingle) {
        return { data: returned[0] || null, error: returned[0] ? null : { message: "Not found" } };
      }
      return { data: Array.isArray(this.payload) ? returned : (returned[0] || null), error: null };
    }

    if (this.operation === "delete") {
      items = items.filter((item) => {
        let match = true;
        for (const filter of this.filters) {
          if (!filter(item)) {
            match = false;
            break;
          }
        }
        return !match;
      });

      this.saveItems(items);
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }
}

const supabaseMock = {
  from(tableName: string) {
    return new MockBuilder(tableName);
  },
  channel(name: string) {
    return new MockChannel(name);
  },
  removeChannel(channel: any) {
    if (channel && typeof channel.unsubscribe === "function") {
      channel.unsubscribe();
    }
  },
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: (callback: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  }
};

export const supabase = supabaseMock as any;
