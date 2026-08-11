import prisma from "../config/database.js";

export async function findAuthAccount(provider, providerUserId) {
    return prisma.authAccount.findUnique({
        where: {
            provider_providerUserId: {
                provider,
                providerUserId,
            },
        },
        include: { user: true },
    });
}

export async function createUserWithAuthAccount(provider, providerUserId, profile) {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name: profile.name,
                email: profile.email,
                profilePicture: profile.profilePicture ?? null,
            },
        });

        await tx.authAccount.create({
            data: {
                userId: user.id,
                provider,
                providerUserId,
            },
        });

        return user;
    });
}

export async function findUserById(id) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}
