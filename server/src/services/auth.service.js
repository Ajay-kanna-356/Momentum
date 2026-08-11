import {
    createUserWithAuthAccount,
    findAuthAccount,
    findUserById,
} from "./user.service.js";

export async function authenticateWithOAuth(provider, providerUserId, profile) {
    const existingAccount = await findAuthAccount(provider, providerUserId);

    if (existingAccount) {
        return existingAccount.user;
    }

    if (!profile.email) {
        throw new Error(`Email is required to create a Momentum account via ${provider}`);
    }

    return createUserWithAuthAccount(provider, providerUserId, profile);
}

export async function getCurrentUser(userId) {
    return findUserById(userId);
}
