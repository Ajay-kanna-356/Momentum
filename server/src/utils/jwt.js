import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function signToken(userId) {
    return jwt.sign({ sub: String(userId) }, JWT_SECRET, {
        expiresIn: "7d",
    });
}

export function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}
