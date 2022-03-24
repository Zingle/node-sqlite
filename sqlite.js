import {EventEmitter} from "events";
import Sqlite3 from "sqlite3";
import synch from "@zingle/synch";

export class Database extends EventEmitter {
  constructor(db) {
    super();

    this.connection = Promise.resolve(true);

    if (typeof db === "string") {
      this.connection = new Promise((resolve, reject) => {
        db = new Sqlite3.Database(db, err => {
          if (err) reject(err); else resolve(true);
        });
      });
    }

    this.db = db;
  }

  static memory() {
    return new Database(":memory:");
  }

  static disk() {
    return new Database("");
  }

  static get Statement() {
    return Statement;
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.db.close(err => {
        if (err) reject(err); else resolve();
      });
    });
  }

  async connected() {
    return this.connection;
  }

  async *each(sql) {
    const buffer = [];
    let done = false;
    let sync = synch();

    this.db.each(String(sql), record, complete);

    while (!done) {
      await sync;
      if (done instanceof Error) throw done;
      while (buffer.length) yield buffer.shift();
      sync.reset();
    };

    function record(err, row) {
      if (err) done = err; else buffer.push(row);
      sync();
    }

    function complete() {
      done = true;
      sync();
    }
  }

  async exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(String(sql), err => {
        if (err) reject(err); else resolve();
      });
    });
  }

  async get(sql, ...params) {
    return new Promise((resolve, reject) => {
      this.db.get(String(sql), ...params, (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });
  }

  prepare(sql) {
    return new Statement(this.db.prepare(String(sql)));
  }

  async run(sql) {
    return new Promise((resolve, reject) => {
      this.db.run(String(sql), function(err) {
        if (err) reject(err); else resolve(this);
      });
    });
  }
}

export class Statement {
  constructor(stmt) {
    this.stmt = stmt;
  }

  async *each(...params) {
    const buffer = [];
    let done = false;
    let sync = synch();

    this.stmt.each(...params, record, complete);

    while (!done) {
      await sync;
      if (done instanceof Error) throw done;
      while (buffer.length) yield buffer.shift();
      sync.reset();
    }

    function record(err, row) {
      if (err) done = err; else buffer.push(row);
      sync();
    }

    function complete() {
      done = true;
      sync();
    }
  }

  async finalize() {
    return new Promise((resolve, reject) => {
      this.stmt.finalize(() => resolve());
    });
  }

  async get(...params) {
    return new Promise((resolve, reject) => {
      this.stmt.get(...params, (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });
  }

  async reset() {
    return new Promise((resolve, reject) => {
      this.stmt.reset(err => {
        if (err) reject(err); else resolve();
      });
    });
  }

  async run(...params) {
    return new Promise((resolve, reject) => {
      this.stmt.run(...params, function(err) {
        if (err) reject(err); else resolve(this);
      });
    });
  }
}
