# enterprise ai query layer for compliance & audit

## problem statement
most compliance teams rely on engineers to query databases, delaying crucial reports and audits. this bottleneck slows down regulatory responses and internal review processes.

## solution
this project provides a natural-language ai assistant that sits on top of structured databases, enabling auditors and compliance officers to query data without writing sql. it bridges the gap between complex database schemas and non-technical domain experts.

## key features
- **natural language to sql**: query your databases using plain english. the ai handles the complex joins and aggregations behind the scenes.
- **row-level access control (rls)**: built-in rbac and rls ensure that users only see the data they are authorized to view, maintaining strict security and compliance standards.
- **result auditing**: every query execution is logged and monitored, providing full traceability for security audits.
- **feedback tuning**: the system learns from user feedback (approvals/corrections) to continuously improve the accuracy of the generated sql queries over time.
- **multi-database support**: seamless integration for both postgresql and mysql databases.

## technology stack
- **frontend**: next.js 16, react 19, tailwind css, radix ui (shadcn/ui)
- **backend & auth**: next.js api routes, nextauth.js
- **database clients**: `pg` (postgresql), `mysql2` (mysql)
- **language**: typescript

## target market & use cases
- **fintech firms**: expediting financial reconciliation and transaction auditing.
- **enterprise audit teams**: empowering internal auditors to independently generate reports.
- **regtech startups**: embedding natural language querying into compliance products.

## getting started

### prerequisites
- node.js (v18+)
- a mysql or postgresql database instance

### installation
1. install dependencies:
   ```bash
   npm install
   ```

2. set up your `.env` file with the required database credentials and authentication keys (e.g., nextauth secret).

3. run the development server:
   ```bash
   npm run dev
   ```

4. open [http://localhost:3000](http://localhost:3000) in your browser.

## security first
designed specifically for highly regulated industries, this query layer ensures that database credentials are never exposed to the client, and all generated schemas/queries pass through rigorous validation layers before execution.
