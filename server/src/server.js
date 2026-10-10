import "dotenv/config";
import { validateEnv } from "./config/env.js";
import app from "./app.js";

validateEnv();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
