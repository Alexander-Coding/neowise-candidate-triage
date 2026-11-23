import { createTriageServer } from "./app.mjs";

createTriageServer().listen(Number(process.env.PORT || 3000), "127.0.0.1");
