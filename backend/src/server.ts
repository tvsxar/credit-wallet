import app from "./app.js";
import pool from "./db/pool.js";

const PORT = process.env.PORT || 2111;

async function startServer() {
  try {
    await pool.query("SELECT 1");

    app.listen(PORT, () => {
      console.log(`Server started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(`Failed to start server on port ${PORT}:`, error);
    process.exit(1);
  }
}

startServer();
