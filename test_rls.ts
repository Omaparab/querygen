import { injectRowFilters } from "./app/api/backend/rls-utils";

const policies = new Map();
policies.set("users", { col: "department", val: "finance" });

const queries = [
  "SELECT * FROM users",
  "SELECT * FROM `users`",
  'SELECT * FROM "users"',
  "SELECT * FROM users u",
  "SELECT * FROM `users` `u`",
  'SELECT * FROM "users" "u"',
  "SELECT * FROM users AS u",
  "SELECT * FROM `users` AS `u`",
  "SELECT * FROM users JOIN roles ON users.role_id = roles.id",
];

queries.forEach(q => {
  console.log("Original: " + q);
  console.log("Injected: " + injectRowFilters(q, policies).sql);
  console.log("---");
});
